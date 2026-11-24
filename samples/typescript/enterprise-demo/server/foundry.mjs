// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Caso 6: ejecuta el agente real de Foundry (Foundry IQ + Web IQ) y retransmite sus pasos al navegador como NDJSON.
// El token de Entra ID (identidad administrada en App Service, «az login» en local) nunca sale del servidor.
import { tokenProvider } from './auth.mjs';
import { clientIp, createLimiter } from './live.mjs';

export const FOUNDRY_RESOURCE = 'https://ai.azure.com';
export const MAX_AGENT_PROMPT = 2000;
const MAX_SOURCES = 8;

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const clip = (s, n) => {
  const t = str(s);
  return t && t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
};
const https = (v) => (str(v) && /^https:\/\//i.test(v.trim()) ? v.trim() : undefined);

/** Agente del Caso 6 a partir del entorno, o null si no está configurado. */
export function foundryFromEnv(env = process.env, deps = {}) {
  const endpoint = (env.FOUNDRY_PROJECT_ENDPOINT ?? '').trim().replace(/\/+$/, '');
  const agent = (env.FOUNDRY_AGENT ?? '').trim();
  if (!endpoint || !agent || !/^https:\/\/[^/\s]+\/api\/projects\/[^/\s]+$/i.test(endpoint)) return null;
  const getToken = tokenProvider(FOUNDRY_RESOURCE, { ...deps, env });
  return { endpoint, agent, headers: async () => ({ authorization: `Bearer ${await getToken()}` }) };
}

/** Eventos SSE de la Responses API: bloques separados por línea en blanco con líneas «data:». */
export async function* sseEvents(body) {
  const dec = new TextDecoder();
  let buf = '';
  const parse = (block) => {
    const data = block
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trimStart())
      .join('\n');
    if (!data || data === '[DONE]') return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };
  for await (const chunk of body) {
    buf = (buf + dec.decode(chunk, { stream: true })).replace(/\r\n/g, '\n');
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const ev = parse(buf.slice(0, i));
      buf = buf.slice(i + 2);
      if (ev) yield ev;
    }
  }
  const ev = parse(buf + dec.decode());
  if (ev) yield ev;
}

/** Consultas que lanzó el agente: query_variants (Foundry IQ), query (Web IQ) o url. */
export function toolQueries(args) {
  let a;
  try {
    a = typeof args === 'string' ? JSON.parse(args) : args;
  } catch {
    return [];
  }
  if (!a || typeof a !== 'object') return [];
  const q = Array.isArray(a.query_variants) ? a.query_variants : Array.isArray(a.queries) ? a.queries : [a.query ?? a.url];
  return q.map((x) => clip(x, 160)).filter(Boolean).slice(0, 4);
}

/** Resume la salida de una herramienta: nº de resultados y, como mucho, 8 fuentes (título, URL, editor, fecha). */
export function toolOutput(output) {
  let j = output;
  if (typeof output === 'string') {
    try {
      j = JSON.parse(output);
    } catch {
      return { count: null, sources: [] };
    }
  }
  const items = [];
  const isItem = (x) => x && typeof x === 'object' && !Array.isArray(x) && (str(x.url) || str(x.title) || str(x.sourceUrl) || x.ref_id !== undefined);
  // Web IQ: {"newsResults":[{title,url,…}]}. Foundry IQ: {"documents":[{id, content:"<JSON con title,url,section>"}]}.
  const visit = (v, depth) => {
    if (!v || depth > 5 || items.length > 200) return;
    if (typeof v === 'string') {
      if (depth > 0 && /^\s*[[{]/.test(v)) {
        try {
          visit(JSON.parse(v), depth + 1);
        } catch {
          /* texto */
        }
      }
      return;
    }
    if (depth > 0 && isItem(v)) {
      items.push(v);
      return;
    }
    if (Array.isArray(v)) for (const x of v) visit(x, depth + 1);
    else if (typeof v === 'object') for (const k of Object.keys(v)) visit(v[k], depth + 1);
  };
  visit(j, 0);
  const sources = [];
  for (const x of items) {
    const title = clip(x.title ?? x.name ?? x.docKey ?? x.sourceUrl, 140);
    const url = https(x.url) ?? https(x.sourceUrl);
    const section = clip(x.section, 80);
    if (!title && !url) continue;
    if (sources.some((s) => (url ? s.url === url : s.title === title) && s.section === section)) continue;
    sources.push({
      title: title ?? url,
      url,
      section,
      publisher: clip(x.source ?? x.siteName ?? x.publisher ?? x.operator, 60),
      date: str(x.lastUpdatedAt) ?? str(x.datePublished),
    });
    if (sources.length >= MAX_SOURCES) break;
  }
  return { count: items.length || null, sources };
}

const errorText = (e) => clip(typeof e === 'string' ? e : (e?.message ?? e?.code ?? (e ? JSON.stringify(e) : undefined)), 240);

/**
 * opts: foundry ({endpoint, agent, headers()} | null), fetch, trustProxy, perMinute, dailyLimit, maxConcurrent, timeoutMs, retries, now, log.
 */
export function createFoundry(options = {}) {
  const o = {
    foundry: options.foundry ?? null,
    fetch: options.fetch ?? globalThis.fetch,
    trustProxy: !!options.trustProxy,
    timeoutMs: options.timeoutMs ?? 180_000,
    retries: options.retries ?? 1,
    now: options.now ?? Date.now,
    log: options.log ?? (() => {}),
  };
  const limiter = createLimiter({
    perMinute: options.perMinute ?? 2,
    dailyLimit: options.dailyLimit ?? 60,
    maxConcurrent: options.maxConcurrent ?? 2,
    now: o.now,
  });

  // Las instrucciones y el expediente están en español: sin esta indicación el agente contesta en español aunque se le pregunte en inglés.
  const LANG_HINT = {
    en: '\n\n(Write the whole answer in English, including headings, tables and notes. Keep source names, document ids and quotes as they are.)',
  };

  // Un fallo de herramienta (p. ej. 403 de un servidor MCP) antes del primer token se reintenta de forma transparente.
  const RETRYABLE = /^(tool_user_error|server_error|rate_limit_exceeded|HTTP 5\d\d|HTTP 429|StreamCut)$/;

  async function attempt(prompt, send, signal, at) {
    let up;
    try {
      up = await o.fetch(`${o.foundry.endpoint}/openai/v1/responses`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream', ...(await o.foundry.headers()) },
        body: JSON.stringify({ agent_reference: { name: o.foundry.agent, type: 'agent_reference' }, input: prompt, stream: true }),
        signal,
      });
    } catch (e) {
      if (signal.aborted) return { error: { code: 'Timeout', message: 'The agent took too long to answer.' } };
      return { error: { code: 'Upstream', message: e instanceof Error ? clip(e.message, 240) : 'Could not reach Foundry.' } };
    }
    if (!up.ok || !up.body) {
      let detail = '';
      try {
        const j = await up.json();
        detail = errorText(j?.error ?? j);
      } catch {
        /* sin JSON */
      }
      o.log(`[foundry] HTTP ${up.status} ${detail ?? ''}`);
      return { error: { code: `HTTP ${up.status}`, message: detail || 'Foundry rejected the request.' } };
    }

    const calls = new Map();
    const r = { tools: 0, failedTools: 0, text: false };
    for await (const ev of sseEvents(up.body)) {
      if (signal.aborted) break;
      switch (ev.type) {
        case 'response.created':
          send({ type: 'meta', model: str(ev.response?.model) ?? null, at: at() });
          break;
        case 'response.output_item.added':
          if (ev.item?.type === 'mcp_call') {
            calls.set(ev.item.id, { server: str(ev.item.server_label), name: str(ev.item.name) });
            r.tools = calls.size;
            send({ type: 'tool', id: ev.item.id, server: str(ev.item.server_label), name: str(ev.item.name), status: 'calling', at: at() });
          }
          break;
        case 'response.mcp_call_arguments.done':
          if (calls.has(ev.item_id)) send({ type: 'tool', id: ev.item_id, queries: toolQueries(ev.arguments), at: at() });
          break;
        case 'response.output_item.done':
          if (ev.item?.type === 'mcp_call') {
            const it = ev.item;
            const err = it.error ? errorText(it.error) : undefined;
            if (err) r.failedTools += 1;
            const out = err ? { count: null, sources: [] } : toolOutput(it.output);
            send({
              type: 'tool',
              id: it.id,
              server: str(it.server_label),
              name: str(it.name),
              queries: toolQueries(it.arguments),
              status: err ? 'failed' : 'completed',
              error: err,
              count: out.count,
              sources: out.sources,
              at: at(),
            });
          }
          break;
        case 'response.output_text.delta':
          if (typeof ev.delta === 'string' && ev.delta) {
            r.firstText ??= at();
            r.text = true;
            send({ type: 'token', text: ev.delta });
          }
          break;
        case 'response.completed':
        case 'response.incomplete': {
          const u = ev.response?.usage ?? {};
          r.done = {
            inputTokens: Number(u.input_tokens) || null,
            outputTokens: Number(u.output_tokens) || null,
            incomplete: ev.type === 'response.incomplete' ? (str(ev.response?.incomplete_details?.reason) ?? true) : undefined,
          };
          return r;
        }
        case 'response.failed':
          r.error = { code: str(ev.response?.error?.code) ?? 'AgentFailed', message: errorText(ev.response?.error) ?? 'The agent run failed.' };
          return r;
        case 'error':
          r.error = { code: str(ev.code) ?? str(ev.error?.code) ?? 'AgentError', message: errorText(ev.message ?? ev.error) ?? 'The agent returned an error.' };
          return r;
        default:
          break;
      }
    }
    r.error = signal.aborted
      ? { code: 'Timeout', message: 'The agent took too long to answer.' }
      : { code: 'StreamCut', message: 'Foundry closed the stream before finishing.' };
    return r;
  }

  async function run(prompt, res, signal) {
    const t0 = o.now();
    const at = () => Math.round(o.now() - t0);
    const send = (ev) => {
      if (!res.destroyed) res.write(`${JSON.stringify(ev)}\n`);
    };
    send({ type: 'start', at: 0, agent: o.foundry.agent });
    let r;
    for (let n = 1; ; n += 1) {
      r = await attempt(prompt, send, signal, at);
      if (res.destroyed) return;
      const e = r.error;
      if (!e || r.text || signal.aborted || n > o.retries || !RETRYABLE.test(e.code)) break;
      o.log(`[foundry] reintento ${n} tras ${e.code}: ${e.message}`);
      send({ type: 'retry', attempt: n + 1, code: e.code, message: e.message, at: at() });
    }
    if (r.error) send({ type: 'error', ...r.error, at: at() });
    else
      send({
        type: 'done',
        at: at(),
        firstTextMs: r.firstText ?? null,
        tools: r.tools,
        failedTools: r.failedTools,
        ...r.done,
        remainingToday: limiter.remaining(),
      });
    o.log(`[foundry] tools=${r.tools ?? 0} failed=${r.failedTools ?? 0} ms=${at()} ok=${!r.error}`);
  }

  return {
    available: !!o.foundry,
    agent: o.foundry?.agent ?? null,
    remainingToday: () => limiter.remaining(),
    /** body ya validado como objeto JSON; el código de acceso ya está comprobado. */
    async ask(req, res, body, fail) {
      if (!o.foundry) return fail(res, 503, 'FoundryNotConfigured', 'The Foundry agent is not configured on the demo server.');
      const prompt = str(body.prompt);
      if (!prompt) return fail(res, 400, 'InvalidRequest', '"prompt" must be a non-empty string.');
      if (prompt.length > MAX_AGENT_PROMPT) return fail(res, 400, 'InvalidRequest', `"prompt" must be at most ${MAX_AGENT_PROMPT} characters.`);
      if (body.lang !== undefined && body.lang !== 'es' && body.lang !== 'en') return fail(res, 400, 'InvalidRequest', '"lang" must be "es" or "en".');
      const input = prompt + (LANG_HINT[body.lang] ?? '');
      const slot = limiter.take(clientIp(req, o.trustProxy));
      if (!slot.ok) {
        const msg = {
          DailyLimit: 'The Foundry agent reached its daily limit of runs.',
          Busy: 'The Foundry agent is busy. Try again in a few seconds.',
          RateLimited: 'Too many agent runs. Wait a moment and try again.',
        }[slot.code];
        return fail(res, 429, slot.code, msg, { 'retry-after': String(slot.retryAfter) });
      }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), o.timeoutMs);
      const onClose = () => {
        if (!res.writableFinished) ctrl.abort();
      };
      res.on('close', onClose);
      res.writeHead(200, {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-store, no-transform',
        'x-accel-buffering': 'no',
        'x-content-type-options': 'nosniff',
      });
      res.flushHeaders?.();
      try {
        await run(input, res, ctrl.signal);
      } catch (e) {
        if (!res.destroyed) {
          const timeout = ctrl.signal.aborted;
          res.write(
            `${JSON.stringify({ type: 'error', code: timeout ? 'Timeout' : 'InternalError', message: timeout ? 'The agent took too long to answer.' : e instanceof Error ? clip(e.message, 240) : 'Unexpected error.' })}\n`,
          );
        }
      } finally {
        clearTimeout(timer);
        res.off('close', onClose);
        slot.release();
        if (!res.writableEnded) res.end();
      }
    },
  };
}
