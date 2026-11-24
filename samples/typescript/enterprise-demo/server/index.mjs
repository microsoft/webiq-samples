// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Servidor de la demo: sirve dist/, hace de proxy hacia la API de Web IQ, ejecuta el Caso 0 en vivo y el agente de Foundry del Caso 6.
// Las credenciales (WEBIQ_API_KEY o Entra ID) se leen del entorno o de .env y nunca llegan al navegador. Sin dependencias.
import { readFileSync, realpathSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { isIP } from 'node:net';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { llmFromEnv, webiqAuthFromEnv } from './auth.mjs';
import { createFoundry, foundryFromEnv } from './foundry.mjs';
import { clientIp, createLimiter, createLive } from './live.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const DEFAULT_BASE_URL = 'https://api.microsoft.ai/v3';

export const ENDPOINT_PATHS = {
  web: '/search/web',
  news: '/search/news',
  images: '/search/images',
  videos: '/search/videos',
  browse: '/browse',
  auto: '/auto',
};

export function productionConfigError(env, webiq) {
  return env.NODE_ENV === 'production' && webiq && !env.LIVE_ACCESS_CODE?.trim()
    ? 'LIVE_ACCESS_CODE is required in production when Web IQ credentials are configured.'
    : null;
}

/** Requisitos de uso y visualización de Web IQ (Exhibit A): máx. 200 caracteres de Grounding Content por fuente. */
export const CHAR_LIMIT = 200;
const TEXT_KEYS = new Set(['content', 'description', 'summary', 'caption', 'snippet']);
const RESULT_KEYS = new Set(['webResults', 'newsResults', 'videoResults', 'imageResults', 'playlists', 'results']);

const MAX_BODY = 64 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

/** Carga .env sin pisar variables que ya existan en el entorno. */
export function loadEnvFile(file, env = process.env) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return false;
  }
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v.at(-1) === v[0]) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    if (env[m[1]] === undefined) env[m[1]] = v;
  }
  return true;
}

/**
 * Recorta el texto de cada fuente a CHAR_LIMIT caracteres en total (presupuesto compartido
 * por content/description/summary/caption de un mismo resultado) y anota la longitud original.
 */
export function trimContent(node, budget = { left: CHAR_LIMIT }) {
  if (Array.isArray(node)) return node.map((x) => trimContent(x, budget));
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (RESULT_KEYS.has(k) && Array.isArray(v)) {
      out[k] = v.map((x) => trimContent(x, { left: CHAR_LIMIT }));
    } else if (TEXT_KEYS.has(k) && typeof v === 'string') {
      const keep = Math.max(0, budget.left);
      if (v.length <= keep) {
        out[k] = v;
        budget.left -= v.length;
      } else {
        out[k] = `${v.slice(0, keep).trimEnd()}…`;
        out[`${k}Length`] = v.length;
        budget.left = 0;
      }
    } else {
      out[k] = trimContent(v, budget);
    }
  }
  return out;
}

/** Nombres de host aceptados: localhost, IP literales (no sirven para DNS rebinding) y los configurados. */
function hostAllowed(value, extra) {
  if (!value) return false;
  let host = value.trim().toLowerCase();
  if (host.startsWith('[')) host = host.slice(1, host.indexOf(']'));
  else if (host.split(':').length === 2) host = host.split(':')[0];
  return host === 'localhost' || host.endsWith('.localhost') || isIP(host) !== 0 || extra.includes(host);
}

function originAllowed(origin, extra) {
  if (!origin) return true;
  try {
    return hostAllowed(new URL(origin).host, extra);
  } catch {
    return false;
  }
}

function sendJson(res, status, body, extraHeaders = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-length': Buffer.byteLength(text),
    ...extraHeaders,
  });
  res.end(text);
}

const fail = (res, status, errorCode, userMessage, headers) => sendJson(res, status, { errorCode, userMessage }, headers);

/** null si el cuerpo supera el límite; el resto se descarta sin guardarlo para poder responder 413. */
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const onData = (chunk) => {
      size += chunk.length;
      if (size <= limit) return void chunks.push(chunk);
      req.off('data', onData);
      req.resume();
      resolve(null);
    };
    req.on('data', onData);
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function validate(endpoint, body) {
  if (endpoint === 'browse') {
    return typeof body.url === 'string' && /^https?:\/\/\S+$/i.test(body.url) ? null : '"url" must be an http(s) URL.';
  }
  return typeof body.query === 'string' && body.query.trim() ? null : '"query" must be a non-empty string.';
}

/** Lee y valida un cuerpo JSON (objeto). Si no es válido responde y devuelve null. */
async function readJson(req, res) {
  if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) {
    fail(res, 415, 'UnsupportedMediaType', 'Send the body as application/json.');
    return null;
  }
  const raw = await readBody(req, MAX_BODY);
  if (raw === null) {
    fail(res, 413, 'PayloadTooLarge', `The body exceeds ${MAX_BODY / 1024} KB.`, { connection: 'close' });
    return null;
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    fail(res, 400, 'InvalidJson', 'The body is not valid JSON.');
    return null;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    fail(res, 400, 'InvalidJson', 'The body must be a JSON object.');
    return null;
  }
  return body;
}

async function proxy(req, res, endpoint, opts) {
  if (req.method !== 'POST') return fail(res, 405, 'MethodNotAllowed', 'Use POST.', { allow: 'POST' });
  if (!opts.webiq) {
    return fail(res, 503, 'MissingApiKey', 'WEBIQ_API_KEY is not set on the demo server. Copy .env.example to .env and restart it.');
  }
  const body = await readJson(req, res);
  if (!body) return;
  const invalid = validate(endpoint, body);
  if (invalid) return fail(res, 400, 'InvalidRequest', invalid);

  const slot = opts.proxyLimiter.take(clientIp(req, opts.trustProxy));
  if (!slot.ok) {
    const msg = {
      DailyLimit: 'The Web IQ API proxy reached its daily request limit.',
      Busy: 'The Web IQ API proxy is busy. Try again in a few seconds.',
      RateLimited: 'Too many Web IQ API requests. Wait a moment and try again.',
    }[slot.code];
    return fail(res, 429, slot.code, msg, { 'retry-after': String(slot.retryAfter) });
  }
  try {
    const started = performance.now();
    let upstream;
    try {
      const auth = await opts.webiq.headers();
      const qs = opts.webiq.appId ? `?APPID=${encodeURIComponent(opts.webiq.appId)}` : '';
      upstream = await opts.fetch(`${opts.baseUrl}${ENDPOINT_PATHS[endpoint]}${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', ...auth },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(opts.timeoutMs),
      });
    } catch (e) {
      if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
        return fail(res, 504, 'UpstreamTimeout', `Web IQ did not answer within ${Math.round(opts.timeoutMs / 1000)} s.`);
      }
      return fail(res, 502, 'UpstreamUnreachable', `Could not reach Web IQ (${e?.cause?.code ?? e?.message ?? 'network error'}).`);
    }
    const text = await upstream.text();
    const latencyMs = Math.round(performance.now() - started);
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { rawContent: text.slice(0, 500) };
      }
    }
    // Sin caché ni almacenamiento: la respuesta solo vive mientras dura la petición.
    return sendJson(res, 200, { status: upstream.status, latencyMs, data: trimContent(data) });
  } finally {
    slot.release();
  }
}

async function serveStatic(req, res, distDir) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'MethodNotAllowed', 'Use GET.', { allow: 'GET, HEAD' });
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    return fail(res, 400, 'BadPath', 'Malformed path.');
  }
  const root = resolve(distDir);
  let file = resolve(join(root, pathname));
  if (file !== root && !file.startsWith(root + sep)) return fail(res, 403, 'Forbidden', 'Path outside dist/.');
  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) {
    file = join(file, 'index.html');
    info = await stat(file).catch(() => null);
  }
  if (!info?.isFile()) {
    // Fallback de SPA: cualquier ruta sin extensión carga la app.
    if (extname(pathname)) return fail(res, 404, 'NotFound', 'File not found.');
    file = join(root, 'index.html');
    info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('dist/ no existe: ejecuta «npm run build» (o usa «npm run dev» con este servidor en marcha).\n');
    }
  }
  const data = await readFile(file);
  res.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': data.length,
    'cache-control': file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
    'x-content-type-options': 'nosniff',
  });
  res.end(req.method === 'HEAD' ? undefined : data);
}

/**
 * Crea el servidor (sin escuchar). Opciones:
 * - apiKey o webiq ({mode, headers(), appId}): credencial de Web IQ.
 * - llm ({endpoint, model, headers()}): modelo del Caso 0 (opcional).
 * - live: {accessCode, trustProxy, perMinute, dailyLimit, maxConcurrent, callTimeoutMs, planTimeoutMs, llmTimeoutMs}.
 * - foundry ({endpoint, agent, headers()}): agente del Caso 6 (opcional); foundryLimits: {perMinute, dailyLimit, maxConcurrent, timeoutMs}.
 * - proxyLimits: límites por IP/minuto, global/UTC-day y de concurrencia del proxy de llamadas individuales.
 * - baseUrl, distDir, timeoutMs, allowedHosts (nombres extra además de localhost e IP), fetch y now (tests).
 */
export function createApp(options = {}) {
  const apiKey = (options.apiKey ?? '').trim();
  const opts = {
    webiq: options.webiq ?? (apiKey ? { mode: 'key', headers: async () => ({ 'x-apikey': apiKey }), appId: null } : null),
    baseUrl: (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    distDir: options.distDir ?? join(ROOT, 'dist'),
    timeoutMs: options.timeoutMs ?? 30_000,
    allowedHosts: (options.allowedHosts ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean),
    trustProxy: !!options.live?.trustProxy,
    fetch: options.fetch ?? globalThis.fetch,
  };
  opts.proxyLimiter = createLimiter({
    perMinute: options.proxyLimits?.perMinute ?? 8,
    dailyLimit: options.proxyLimits?.dailyLimit ?? 200,
    maxConcurrent: options.proxyLimits?.maxConcurrent ?? 8,
    now: options.now,
  });
  const live = createLive({
    ...options.live,
    webiq: opts.webiq,
    llm: options.llm ?? null,
    baseUrl: opts.baseUrl,
    paths: ENDPOINT_PATHS,
    fetch: opts.fetch,
    now: options.now,
    log: options.log,
  });
  const foundry = createFoundry({
    ...options.foundryLimits,
    foundry: options.foundry ?? null,
    trustProxy: options.live?.trustProxy,
    fetch: opts.fetch,
    now: options.now,
    log: options.log,
  });
  return createServer(async (req, res) => {
    try {
      if (!hostAllowed(req.headers.host, opts.allowedHosts)) return fail(res, 403, 'ForbiddenHost', 'Unexpected Host header.');
      const { pathname } = new URL(req.url ?? '/', 'http://x');
      if (pathname === '/api/status') {
        if (req.method !== 'GET') return fail(res, 405, 'MethodNotAllowed', 'Use GET.', { allow: 'GET' });
        return sendJson(res, 200, {
          ok: true,
          hasKey: !!opts.webiq,
          auth: opts.webiq?.mode ?? null,
          llm: !!options.llm,
          model: options.llm?.model ?? null,
          needsCode: live.needsCode,
          endpoints: Object.keys(ENDPOINT_PATHS),
          foundry: foundry.available,
          foundryAgent: foundry.agent,
        });
      }
      const isApi = pathname.startsWith('/api/');
      if (isApi && !originAllowed(req.headers.origin, opts.allowedHosts)) {
        return fail(res, 403, 'ForbiddenOrigin', 'Cross-origin requests are not allowed.');
      }
      if (pathname === '/api/live/verify') {
        if (req.method !== 'GET') return fail(res, 405, 'MethodNotAllowed', 'Use GET.', { allow: 'GET' });
        if (!live.authorize(req, res, fail)) return;
        return sendJson(res, 200, { ok: true, remainingToday: live.remainingToday() });
      }
      if (pathname === '/api/live/ask') {
        if (req.method !== 'POST') return fail(res, 405, 'MethodNotAllowed', 'Use POST.', { allow: 'POST' });
        if (!live.authorize(req, res, fail)) return;
        const body = await readJson(req, res);
        if (!body) return;
        return await live.ask(req, res, body, fail);
      }
      if (pathname === '/api/foundry/ask') {
        if (req.method !== 'POST') return fail(res, 405, 'MethodNotAllowed', 'Use POST.', { allow: 'POST' });
        if (!live.authorize(req, res, fail)) return;
        const body = await readJson(req, res);
        if (!body) return;
        return await foundry.ask(req, res, body, fail);
      }
      const m = pathname.match(/^\/api\/webiq\/([a-z]+)\/?$/);
      if (m) {
        if (!Object.hasOwn(ENDPOINT_PATHS, m[1])) return fail(res, 404, 'UnknownEndpoint', `Unknown endpoint "${m[1]}".`);
        if (!live.authorize(req, res, fail)) return;
        return await proxy(req, res, m[1], opts);
      }
      if (isApi) return fail(res, 404, 'NotFound', 'Unknown API route.');
      return await serveStatic(req, res, opts.distDir);
    } catch (e) {
      if (!res.headersSent) fail(res, 500, 'InternalError', e instanceof Error ? e.message : 'Unexpected error.');
      else res.destroy();
    }
  });
}

function isMain() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (isMain()) {
  loadEnvFile(join(ROOT, '.env'));
  const port = Number(process.env.PORT) || 8787;
  const host = process.env.HOST || '127.0.0.1';
  const env = process.env;
  const webiq = webiqAuthFromEnv(env);
  const configError = productionConfigError(env, webiq);
  if (configError) {
    console.error(`Configuración insegura: ${configError}`);
    process.exit(1);
  }
  const llm = llmFromEnv(env);
  const foundry = foundryFromEnv(env);
  const int = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
  const app = createApp({
    webiq,
    llm,
    baseUrl: env.WEBIQ_BASE_URL,
    allowedHosts: (env.WEBIQ_ALLOWED_HOSTS ?? '').split(','),
    live: {
      accessCode: env.LIVE_ACCESS_CODE,
      trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
      perMinute: int(env.LIVE_PER_MINUTE, 6),
      dailyLimit: int(env.LIVE_DAILY_LIMIT, 200),
      maxConcurrent: int(env.LIVE_MAX_CONCURRENT, 4),
    },
    proxyLimits: {
      perMinute: int(env.WEBIQ_PROXY_PER_MINUTE, 8),
      dailyLimit: int(env.WEBIQ_PROXY_DAILY_LIMIT, 200),
      maxConcurrent: int(env.WEBIQ_PROXY_MAX_CONCURRENT, 8),
    },
    foundry,
    foundryLimits: {
      perMinute: int(env.FOUNDRY_PER_MINUTE, 2),
      dailyLimit: int(env.FOUNDRY_DAILY_LIMIT, 60),
      maxConcurrent: int(env.FOUNDRY_MAX_CONCURRENT, 2),
    },
    log: (line) => console.log(line),
  });
  app.on('error', (e) => {
    console.error(`No se pudo arrancar en ${host}:${port}: ${e.message}`);
    process.exit(1);
  });
  app.listen(port, host, () => {
    console.log(`Microsoft Web IQ · demo en http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
    console.log(
      webiq
        ? `  Web IQ: ${webiq.mode === 'key' ? 'clave (WEBIQ_API_KEY)' : 'Entra ID'} · pestaña «En vivo» y Caso 0 activos.`
        : '  Falta WEBIQ_API_KEY: copia .env.example a .env para la pestaña «En vivo» y el Caso 0.',
    );
    console.log(llm ? `  Caso 0: modelo ${llm.model} en ${new URL(llm.endpoint).host}.` : '  Sin LLM_ENDPOINT: el Caso 0 muestra resultados sin respuesta redactada.');
    console.log(foundry ? `  Caso 6: agente ${foundry.agent} en ${new URL(foundry.endpoint).host}.` : '  Sin FOUNDRY_PROJECT_ENDPOINT/FOUNDRY_AGENT: el Caso 6 no ejecuta el agente en vivo.');
    if (env.LIVE_ACCESS_CODE) console.log('  Código de acceso activo (LIVE_ACCESS_CODE).');
    console.log('  Desarrollo: deja este servidor en marcha y usa «npm run dev» (proxy /api).');
  });
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      app.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 1000).unref();
    });
  }
}
