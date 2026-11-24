// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Credenciales del servidor: tokens de Entra ID con caché, sin dependencias.
// Orden: identidad administrada de App Service → client secret → Azure CLI (solo desarrollo local).
import { execFile } from 'node:child_process';

export const WEBIQ_RESOURCE = 'https://api.microsoft.ai';
export const COGNITIVE_RESOURCE = 'https://cognitiveservices.azure.com';

/** Renueva el token 5 minutos antes de que caduque. */
const REFRESH_MARGIN_MS = 5 * 60_000;

function cliToken(resource, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(
      'az',
      ['account', 'get-access-token', '--resource', resource, '-o', 'json'],
      { timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(new Error(`Azure CLI: ${err.killed ? 'timeout' : err.message.split('\n')[0]}`));
        try {
          const j = JSON.parse(stdout);
          const exp = Number(j.expires_on) * 1000 || Date.parse(j.expiresOn) || Date.now() + 30 * 60_000;
          resolve({ token: j.accessToken, expiresAt: exp });
        } catch {
          reject(new Error('Azure CLI: unexpected output.'));
        }
      },
    );
  });
}

/**
 * Devuelve `() => Promise<string>` con un token Bearer para `resource`.
 * opts: env, fetch, clientCredentials {tenantId, clientId, clientSecret}, cli (bool), now (tests), cliToken (tests).
 */
export function tokenProvider(resource, opts = {}) {
  const env = opts.env ?? process.env;
  const doFetch = opts.fetch ?? globalThis.fetch;
  const now = opts.now ?? Date.now;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const cc = opts.clientCredentials;
  const cli = opts.cliToken ?? cliToken;
  let cached = null;
  let pending = null;

  async function acquire() {
    if (env.IDENTITY_ENDPOINT && env.IDENTITY_HEADER) {
      const u = new URL(env.IDENTITY_ENDPOINT);
      u.searchParams.set('resource', resource);
      u.searchParams.set('api-version', '2019-08-01');
      if (env.AZURE_CLIENT_ID) u.searchParams.set('client_id', env.AZURE_CLIENT_ID);
      const r = await doFetch(u, { headers: { 'X-IDENTITY-HEADER': env.IDENTITY_HEADER }, signal: AbortSignal.timeout(timeoutMs) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.access_token) throw new Error(`Managed identity: HTTP ${r.status}${j.error_description ? ` · ${j.error_description}` : ''}`);
      return { token: j.access_token, expiresAt: Number(j.expires_on) * 1000 || now() + 30 * 60_000 };
    }
    if (cc?.tenantId && cc?.clientId && cc?.clientSecret) {
      const r = await doFetch(`https://login.microsoftonline.com/${encodeURIComponent(cc.tenantId)}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: cc.clientId,
          client_secret: cc.clientSecret,
          scope: `${resource}/.default`,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.access_token) throw new Error(`Client credentials: HTTP ${r.status}${j.error ? ` · ${j.error}` : ''}`);
      return { token: j.access_token, expiresAt: now() + (Number(j.expires_in) || 3600) * 1000 };
    }
    if (opts.cli !== false) return cli(resource, timeoutMs);
    throw new Error('No Entra ID credential available.');
  }

  return async function getToken() {
    if (cached && cached.expiresAt - REFRESH_MARGIN_MS > now()) return cached.token;
    pending ??= acquire()
      .then((t) => {
        cached = t;
        return t.token;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };
}

/** Cabeceras de autenticación para Web IQ a partir del entorno, o null si no hay credencial. */
export function webiqAuthFromEnv(env = process.env, deps = {}) {
  const key = (env.WEBIQ_API_KEY ?? '').trim();
  if (key) return { mode: 'key', headers: async () => ({ 'x-apikey': key }), appId: null };
  const cc = { tenantId: env.WEBIQ_TENANT_ID, clientId: env.WEBIQ_CLIENT_ID, clientSecret: env.WEBIQ_CLIENT_SECRET };
  const hasCc = !!(cc.tenantId && cc.clientId && cc.clientSecret);
  if (!hasCc && (env.WEBIQ_AUTH ?? '').toLowerCase() !== 'entra') return null;
  const getToken = tokenProvider(env.WEBIQ_TOKEN_RESOURCE || WEBIQ_RESOURCE, {
    ...deps,
    env,
    clientCredentials: hasCc ? cc : undefined,
  });
  return {
    mode: 'entra',
    headers: async () => ({ authorization: `Bearer ${await getToken()}` }),
    // Solo con Entra ID: si el perfil tiene varias aplicaciones, Web IQ pide ?APPID=.
    appId: (env.WEBIQ_APPID ?? '').trim() || null,
  };
}

/** Modelo para planificar y redactar la respuesta del Caso 0, o null si no está configurado. */
export function llmFromEnv(env = process.env, deps = {}) {
  const endpoint = (env.LLM_ENDPOINT ?? '').trim().replace(/\/+$/, '');
  if (!endpoint) return null;
  const model = (env.LLM_MODEL ?? '').trim() || 'gpt-5.4-mini';
  const key = (env.LLM_API_KEY ?? '').trim();
  if (key) return { endpoint, model, headers: async () => ({ 'api-key': key }) };
  const getToken = tokenProvider(COGNITIVE_RESOURCE, { ...deps, env });
  return { endpoint, model, headers: async () => ({ authorization: `Bearer ${await getToken()}` }) };
}
