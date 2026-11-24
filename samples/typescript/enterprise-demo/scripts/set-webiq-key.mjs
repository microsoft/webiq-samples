// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Configura la clave de Web IQ sin que aparezca en pantalla ni en el historial:
// la pide oculta (o la lee de stdin), la valida con una búsqueda real, la guarda en .env
// y la carga en la Web App de Azure. Uso: npm run set-key [-- --local] [-- --no-check]
import { execFile } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function azureTargetFromEnv(env = process.env) {
  return {
    subscription: env.AZURE_SUBSCRIPTION_ID,
    resourceGroup: env.AZ_RESOURCE_GROUP,
    webApp: env.AZ_WEBAPP,
    url: env.AZ_WEBAPP_URL || (env.AZ_WEBAPP ? `https://${env.AZ_WEBAPP}.azurewebsites.net` : undefined),
  };
}

export function missingAzureTarget(target = azureTargetFromEnv()) {
  return [
    !target.subscription && 'AZURE_SUBSCRIPTION_ID',
    !target.resourceGroup && 'AZ_RESOURCE_GROUP',
    !target.webApp && 'AZ_WEBAPP',
  ].filter(Boolean);
}

/** Sustituye (o añade) `name=value` en el texto de un .env, sin tocar el resto de líneas. */
export function upsertEnv(text, name, value) {
  const lines = text.length ? text.replace(/\r?\n$/, '').split(/\r?\n/) : [];
  const re = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`);
  const idx = lines.findIndex((l) => re.test(l));
  if (idx >= 0) lines[idx] = `${name}=${value}`;
  else lines.push(`${name}=${value}`);
  return `${lines.join('\n')}\n`;
}

/** Limpia lo pegado: secuencias de pegado entre corchetes, espacios y comillas. */
export function cleanKey(raw) {
  let k = String(raw ?? '')
    .replace(/\x1b\[20[01]~/g, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean) ?? '';
  k = k.replace(/^(?:export\s+)?WEBIQ_API_KEY\s*=\s*/, '');
  if (k.length >= 2 && (k[0] === '"' || k[0] === "'") && k.at(-1) === k[0]) k = k.slice(1, -1);
  return k.trim();
}

function promptHidden(question) {
  const { stdin, stdout } = process;
  return new Promise((resolvePrompt, reject) => {
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    let value = '';
    const done = (fn) => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      fn();
    };
    const onData = (chunk) => {
      for (const ch of chunk.replace(/\x1b\[20[01]~/g, '')) {
        if (ch === '\r' || ch === '\n') return done(() => resolvePrompt(value));
        if (ch === '\u0003' || ch === '\u0004') return done(() => reject(new Error('Cancelado.')));
        if (ch === '\u007f' || ch === '\b') {
          if (value) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
          continue;
        }
        if (ch < ' ') continue;
        value += ch;
        stdout.write('•');
      }
    };
    stdin.on('data', onData);
  });
}

async function readStdin() {
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

/** Una búsqueda mínima (≈0,007 $) para comprobar que la clave funciona antes de guardarla. */
export async function checkKey(key, { baseUrl = 'https://api.microsoft.ai/v3', fetch = globalThis.fetch } = {}) {
  const t0 = Date.now();
  let r;
  try {
    r = await fetch(`${baseUrl.replace(/\/+$/, '')}/search/web`, {
      method: 'POST',
      headers: { 'x-apikey': key, 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'Microsoft Web IQ', maxResults: 1 }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    return { ok: false, status: 0, detail: e instanceof Error ? e.message : String(e) };
  }
  const body = await r.json().catch(() => ({}));
  const detail = body?.error?.code || body?.error?.message || body?.message || body?.code || '';
  return { ok: r.ok, status: r.status, ms: Date.now() - t0, detail: String(detail).slice(0, 160) };
}

function az(args, timeoutMs = 180_000) {
  return new Promise((res, rej) => {
    execFile('az', args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return rej(new Error((stderr || err.message).split('\n').find(Boolean) ?? 'az failed'));
      res(stdout);
    });
  });
}

/** Carga la clave en App Service mediante un fichero temporal 0600 (no aparece en la línea de comandos). */
async function pushToAzure(key) {
  const azure = azureTargetFromEnv();
  const dir = mkdtempSync(join(tmpdir(), 'webiq-key-'));
  const file = join(dir, 'settings.json');
  try {
    writeFileSync(file, JSON.stringify({ WEBIQ_API_KEY: key }), { mode: 0o600 });
    await az([
      'webapp', 'config', 'appsettings', 'set',
      '--subscription', AZURE.subscription,
      '-g', AZURE.resourceGroup,
      '-n', AZURE.webApp,
      '--settings', `@${file}`,
      '-o', 'none',
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function waitForPublished(url, timeoutMs = 240_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const r = await fetch(`${url}/api/status`, { signal: AbortSignal.timeout(30_000), cache: 'no-store' });
      const j = await r.json();
      if (j?.hasKey) return true;
    } catch {
      // La web se reinicia al cambiar la configuración: reintenta.
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  return false;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const localOnly = args.has('--local');
  const skipCheck = args.has('--no-check');
  if (!localOnly) {
    const missing = missingAzureTarget();
    if (missing.length) throw new Error(`Define el destino de Azure en el entorno o en .env: ${missing.join(', ')} (o usa --local).`);
  }
  const azure = azureTargetFromEnv();

  console.log('Microsoft Web IQ · configurar la clave del Caso 0');
  console.log('  Crea o copia la clave en https://webiq.microsoft.ai/profiles (Profile Management → API keys).');
  const raw = process.stdin.isTTY ? await promptHidden('  Pega la clave y pulsa Intro (no se mostrará): ') : await readStdin();
  const key = cleanKey(raw);
  if (!key) throw new Error('No se recibió ninguna clave.');
  if (/\s/.test(key)) throw new Error('La clave contiene espacios: cópiala de nuevo.');

  if (!skipCheck) {
    process.stdout.write('  Comprobando la clave con una búsqueda real… ');
    const c = await checkKey(key, { baseUrl: process.env.WEBIQ_BASE_URL });
    if (!c.ok) {
      console.log(`falló (HTTP ${c.status || 'sin respuesta'}${c.detail ? ` · ${c.detail}` : ''}).`);
      throw new Error(c.status === 401 || c.status === 403 ? 'Web IQ rechazó la clave: revisa que esté activa.' : 'No se pudo validar la clave.');
    }
    console.log(`correcta (${c.ms} ms).`);
  }

  const envFile = join(ROOT, '.env');
  const base = existsSync(envFile)
    ? readFileSync(envFile, 'utf8')
    : existsSync(join(ROOT, '.env.example'))
      ? readFileSync(join(ROOT, '.env.example'), 'utf8')
      : '';
  writeFileSync(envFile, upsertEnv(base, 'WEBIQ_API_KEY', key), { mode: 0o600 });
  chmodSync(envFile, 0o600);
  console.log('  Guardada en .env (solo local, fuera de git). Reinicia «npm run live» para usarla.');

  if (localOnly) return;
  process.stdout.write(`  Cargándola en la Web App ${azure.webApp}… `);
  await pushToAzure(key);
  console.log('hecho.');
  const url = azure.url;
  process.stdout.write('  Esperando a que la web publicada la detecte… ');
  console.log((await waitForPublished(url)) ? `lista: ${url}/?scenario=0` : 'aún reiniciando; comprueba /api/status en unos minutos.');
}

function isMain() {
  try {
    return !!process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (isMain()) {
  if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));
  main().catch((e) => {
    console.error(`\n  ✗ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
}
