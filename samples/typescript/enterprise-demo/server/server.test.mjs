// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { request as httpRequest, createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CHAR_LIMIT, createApp, loadEnvFile, productionConfigError, trimContent } from './index.mjs';

const KEY = 'test-key-123';
const long = (n, ch = 'a') => ch.repeat(n);

/** Petición HTTP con control total de cabeceras (fetch no deja fijar Host). */
function call(port, { method = 'GET', path = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, method, path, headers: { host: `127.0.0.1:${port}`, ...headers } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          /* no JSON */
        }
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

const post = (port, endpoint, body, headers = {}) =>
  call(port, { method: 'POST', path: `/api/webiq/${endpoint}`, headers: { 'content-type': 'application/json', ...headers }, body });

const listen = (server) => new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const close = (server) =>
  new Promise((r) => {
    server.closeAllConnections();
    server.close(() => r());
  });

describe('servidor local', () => {
  it('exige código de acceso en producción cuando el proxy tiene credenciales', () => {
    expect(productionConfigError({ NODE_ENV: 'production' }, { mode: 'key' })).toMatch(/LIVE_ACCESS_CODE/);
    expect(productionConfigError({ NODE_ENV: 'production', LIVE_ACCESS_CODE: 'a-secret-code' }, { mode: 'key' })).toBeNull();
    expect(productionConfigError({ NODE_ENV: 'production' }, null)).toBeNull();
    expect(productionConfigError({ NODE_ENV: 'development' }, { mode: 'key' })).toBeNull();
  });

  const seen = [];
  let upstream;
  let upPort;
  let app;
  let port;
  let noKey;
  let noKeyPort;
  let dist;

  beforeAll(async () => {
    upstream = createServer((req, res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        seen.push({ path: req.url, headers: req.headers, body: body ? JSON.parse(body) : null });
        const json = (status, data) => {
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(JSON.stringify(data));
        };
        const q = body ? JSON.parse(body) : {};
        if (q.query === 'slow') return; // nunca responde
        if (q.query === 'unauthorized') return json(401, { errorCode: 'Unauthorized', userMessage: 'Invalid key.' });
        switch (req.url) {
          case '/search/web':
            return json(200, { webResults: [{ title: 'A', url: 'https://a.example', content: long(500) }, { title: 'B', url: 'https://b.example', content: 'short' }] });
          case '/search/videos':
            return json(200, { videoResults: [{ title: 'V', url: 'https://v.example', description: long(150, 'd'), summary: long(300, 's') }] });
          case '/browse':
            return q.liveCrawl === 'force' ? json(202, { retryAfter: '5' }) : json(200, { url: q.url, content: long(1000, 'p') });
          default:
            return json(200, { results: [] });
        }
      });
    });
    upPort = await listen(upstream);

    dist = mkdtempSync(join(tmpdir(), 'webiq-dist-'));
    mkdirSync(join(dist, 'assets'));
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>demo</title>');
    writeFileSync(join(dist, 'assets', 'app-123.js'), 'console.log(1)');

    app = createApp({ apiKey: KEY, baseUrl: `http://127.0.0.1:${upPort}/`, distDir: dist, timeoutMs: 300 });
    port = await listen(app);
    noKey = createApp({ apiKey: '  ', baseUrl: `http://127.0.0.1:${upPort}`, distDir: dist });
    noKeyPort = await listen(noKey);
  });

  afterAll(async () => {
    await Promise.all([close(app), close(noKey), close(upstream)]);
    rmSync(dist, { recursive: true, force: true });
  });

  it('informa del estado sin exponer la clave', async () => {
    const on = await call(port, { path: '/api/status' });
    expect(on.status).toBe(200);
    expect(on.json).toEqual({
      ok: true,
      hasKey: true,
      auth: 'key',
      llm: false,
      model: null,
      needsCode: false,
      endpoints: ['web', 'news', 'images', 'videos', 'browse', 'auto'],
      foundry: false,
      foundryAgent: null,
    });
    expect(on.text).not.toContain(KEY);
    const off = await call(noKeyPort, { path: '/api/status' });
    expect(off.json.hasKey).toBe(false);
  });

  it('reenvía a la ruta correcta con x-apikey y recorta el contenido', async () => {
    const r = await post(port, 'web', { query: 'tarifas luz', maxResults: 2 });
    expect(r.status).toBe(200);
    expect(r.json.status).toBe(200);
    expect(r.json.latencyMs).toBeGreaterThanOrEqual(0);
    const last = seen.at(-1);
    expect(last.path).toBe('/search/web');
    expect(last.headers['x-apikey']).toBe(KEY);
    expect(last.headers['content-type']).toBe('application/json');
    expect(last.body).toEqual({ query: 'tarifas luz', maxResults: 2 });
    const [a, b] = r.json.data.webResults;
    expect(a.content.length).toBe(CHAR_LIMIT + 1);
    expect(a.content.endsWith('…')).toBe(true);
    expect(a.contentLength).toBe(500);
    expect(b).toEqual({ title: 'B', url: 'https://b.example', content: 'short' });
    expect(r.text).not.toContain(KEY);
    expect(r.headers['cache-control']).toBe('no-store');
  });

  it('reparte los 200 caracteres entre todos los textos de una misma fuente', async () => {
    const r = await post(port, 'videos', { query: 'resort' });
    const [v] = r.json.data.videoResults;
    expect(v.description).toHaveLength(150);
    expect(v.summary).toBe(`${long(50, 's')}…`);
    expect(v.summaryLength).toBe(300);
  });

  it('recorta la lectura de browse y deja pasar el 202 con retryAfter', async () => {
    const ok = await post(port, 'browse', { url: 'https://example.com/page' });
    expect(seen.at(-1).path).toBe('/browse');
    expect(ok.json.data.content).toHaveLength(CHAR_LIMIT + 1);
    expect(ok.json.data.contentLength).toBe(1000);
    const pending = await post(port, 'browse', { url: 'https://example.com/page', liveCrawl: 'force' });
    expect(pending.json).toMatchObject({ status: 202, data: { retryAfter: '5' } });
  });

  it('devuelve los errores de Web IQ dentro del sobre', async () => {
    const r = await post(port, 'news', { query: 'unauthorized' });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ status: 401, data: { errorCode: 'Unauthorized' } });
  });

  it('valida la petición antes de gastar cuota', async () => {
    const before = seen.length;
    expect((await post(port, 'nope', { query: 'x' })).status).toBe(404);
    expect((await post(port, 'web', '{bad', {})).json.errorCode).toBe('InvalidJson');
    expect((await post(port, 'web', [1, 2])).json.errorCode).toBe('InvalidJson');
    expect((await post(port, 'web', { query: '  ' })).json.errorCode).toBe('InvalidRequest');
    expect((await post(port, 'browse', { url: 'file:///etc/passwd' })).json.errorCode).toBe('InvalidRequest');
    expect((await post(port, 'web', { query: 'x' }, { 'content-type': 'text/plain' })).status).toBe(415);
    expect((await post(port, 'web', { query: long(70 * 1024) })).status).toBe(413);
    expect((await call(port, { path: '/api/webiq/web' })).status).toBe(405);
    expect((await post(noKeyPort, 'web', { query: 'x' })).json.errorCode).toBe('MissingApiKey');
    expect(seen.length).toBe(before);
  });

  it('limita el proxy Web IQ por concurrencia y presupuesto diario compartidos entre endpoints', async () => {
    let now = Date.UTC(2026, 10, 22);
    let finishUpstream;
    const pending = new Promise((resolve) => {
      finishUpstream = resolve;
    });
    let upstreamCalls = 0;
    const limited = createApp({
      webiq: { mode: 'key', headers: async () => ({}) },
      live: { accessCode: 'test-demo-code' },
      proxyLimits: { perMinute: 1, dailyLimit: 2, maxConcurrent: 1 },
      now: () => now,
      fetch: async () => {
        upstreamCalls += 1;
        await pending;
        return new Response(JSON.stringify({ webResults: [] }), { status: 200 });
      },
    });
    const limitedPort = await listen(limited);
    const request = (endpoint) =>
      post(limitedPort, endpoint, { query: 'budget test' }, { 'x-demo-code': 'test-demo-code' });
    try {
      const firstRequest = request('web');
      while (upstreamCalls === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      const concurrent = await request('news');
      expect(concurrent.status).toBe(429);
      expect(concurrent.json.errorCode).toBe('Busy');
      finishUpstream();
      expect((await firstRequest).status).toBe(200);
      const rateLimited = await request('images');
      expect(rateLimited.status).toBe(429);
      expect(rateLimited.json.errorCode).toBe('RateLimited');
      expect(rateLimited.headers['retry-after']).toBeDefined();

      now += 61_000;
      expect((await request('news')).status).toBe(200);
      const overBudget = await request('images');
      expect(overBudget.status).toBe(429);
      expect(overBudget.json.errorCode).toBe('DailyLimit');
      expect(overBudget.headers['retry-after']).toBeDefined();
      expect(upstreamCalls).toBe(2);
    } finally {
      await close(limited);
    }
  });

  it('bloquea otros orígenes y hosts (CSRF y DNS rebinding)', async () => {
    const before = seen.length;
    expect((await post(port, 'web', { query: 'x' }, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await post(port, 'web', { query: 'x' }, { host: 'evil.example' })).status).toBe(403);
    expect(seen.length).toBe(before);
    expect((await post(port, 'web', { query: 'x' }, { origin: 'http://localhost:5173', host: 'localhost:5173' })).json.status).toBe(200);
  });

  it('corta si Web IQ no responde a tiempo', async () => {
    const r = await post(port, 'web', { query: 'slow' });
    expect(r.status).toBe(504);
    expect(r.json.errorCode).toBe('UpstreamTimeout');
  });

  it('sirve dist/ con fallback de SPA y sin salir de la carpeta', async () => {
    const home = await call(port, { path: '/' });
    expect(home.status).toBe(200);
    expect(home.headers['content-type']).toContain('text/html');
    expect((await call(port, { path: '/assets/app-123.js' })).headers['cache-control']).toContain('immutable');
    expect((await call(port, { path: '/casos/regulatory-watch' })).text).toContain('<title>demo</title>');
    expect((await call(port, { path: '/missing.png' })).status).toBe(404);
    expect((await call(port, { path: '/..%2f..%2f..%2fetc%2fpasswd' })).status).toBe(403);
    expect((await call(port, { path: '/%2e%2e/%2e%2e/etc/passwd' })).text).not.toContain('root:');
    expect((await call(port, { path: '/api/unknown' })).status).toBe(404);
  });

  it('trimContent no toca campos cortos ni estructuras sin texto', () => {
    const data = { results: [{ evidence: { type: 'structured/weather', content: { tempC: 21 } }, citations: [{ url: 'https://w.example' }] }] };
    expect(trimContent(data)).toEqual(data);
    expect(trimContent(null)).toBeNull();
  });

  it('loadEnvFile no pisa variables existentes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'webiq-env-'));
    const file = join(dir, '.env');
    writeFileSync(file, '# comentario\nWEBIQ_API_KEY="abc"\nexport PORT=9000 # puerto\nHOST=keep\n');
    const env = { HOST: 'already' };
    expect(loadEnvFile(file, env)).toBe(true);
    expect(env).toEqual({ HOST: 'already', WEBIQ_API_KEY: 'abc', PORT: '9000' });
    expect(loadEnvFile(join(dir, 'none'), env)).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });
});
