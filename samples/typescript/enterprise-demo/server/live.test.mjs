// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request as httpRequest, createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { llmFromEnv, tokenProvider, webiqAuthFromEnv } from './auth.mjs';
import { createApp } from './index.mjs';
import { clientIp, createCodeGuard, createLimiter, normalizeLive } from './live.mjs';

const KEY = 'live-key-xyz';
const CODE = 'demo-2026';

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
          /* NDJSON o texto */
        }
        const events = text
          .split('\n')
          .filter(Boolean)
          .map((l) => {
            try {
              return JSON.parse(l);
            } catch {
              return null;
            }
          });
        resolve({ status: res.statusCode, headers: res.headers, text, json, events });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

const ask = (port, body, headers = { 'x-demo-code': CODE }) =>
  call(port, { method: 'POST', path: '/api/live/ask', headers: { 'content-type': 'application/json', ...headers }, body });

const listen = (server) => new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const close = (server) =>
  new Promise((r) => {
    server.closeAllConnections();
    server.close(() => r());
  });

describe('Caso 0 · en vivo', () => {
  const seen = [];
  const mode = { planner: 'ok', answer: 'ok' };
  let upstream;
  let upPort;
  let dist;
  const apps = [];

  const make = async (extra = {}) => {
    const app = createApp({
      apiKey: KEY,
      baseUrl: `http://127.0.0.1:${upPort}`,
      distDir: dist,
      llm: { endpoint: `http://127.0.0.1:${upPort}/llm/v1`, model: 'gpt-test', headers: async () => ({ 'api-key': 'llm-key' }) },
      ...extra,
      live: { accessCode: CODE, ...extra.live },
    });
    apps.push(app);
    return listen(app);
  };

  beforeAll(async () => {
    upstream = createServer((req, res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        const body = raw ? JSON.parse(raw) : null;
        seen.push({ path: req.url, headers: req.headers, body });
        const json = (status, data) => {
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(JSON.stringify(data));
        };
        if (req.url === '/llm/v1/chat/completions') {
          if (!body.stream) {
            if (mode.planner === 'fail') return json(500, { error: { message: 'boom' } });
            const plan = { web: 'q web', news: 'q news', images: 'q images', videos: 'q videos', language: 'es', region: 'ES', videoFreshness: 'week' };
            return json(200, { choices: [{ message: { content: JSON.stringify(plan) } }] });
          }
          if (mode.answer === 'fail') return json(429, { error: { message: 'quota' } });
          res.writeHead(200, { 'content-type': 'text/event-stream' });
          for (const part of ['El **Clásico** acabó 2-1 [1]', ' y hay vídeo [4].', ' Dato inventado [99].']) {
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: part } }] })}\n\n`);
          }
          res.write(`data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 120, completion_tokens: 30 } })}\n\n`);
          res.write('data: [DONE]\n\n');
          return res.end();
        }
        switch (req.url) {
          case '/search/web':
            return json(200, {
              traceId: 't-web',
              webResults: [
                { title: 'W1', url: 'https://w1.example', content: 'x'.repeat(900), lastUpdatedAt: '2026-10-27T10:00:00Z' },
                { title: 'W2', url: 'https://w2.example', content: 'corto' },
              ],
            });
          case '/search/news':
            return json(200, { newsResults: [{ title: 'N1', url: 'https://n1.example', content: 'n'.repeat(400), source: 'Marca', thumbnail: { url: 'https://img.example/n1.jpg' } }] });
          case '/search/images':
            return json(200, {
              imageResults: [
                { title: 'I1', url: 'https://img.example/1.jpg', hostPageUrl: 'https://p.example/1', thumbnailUrl: 'https://th.example/1.jpg', width: 800, height: 600 },
                { title: 'bad', url: 'https://img.example/bad.jpg', isAdult: true },
              ],
            });
          case '/search/videos':
            return json(200, {
              videoResults: [
                {
                  title: 'V1',
                  url: 'https://yt.example/v1',
                  description: 'd'.repeat(300),
                  publishedBy: 'LaLiga',
                  viewCount: 1000,
                  length: '00:05:12',
                  embeddingUrl: 'https://yt.example/embed/v1',
                  thumbnailUrl: 'https://th.example/v1.jpg',
                  moments: [{ title: 'Gol', startTime: '0.00:01:10', momentUrl: 'https://yt.example/v1?t=70' }],
                  bestMomentIndex: 0,
                },
              ],
            });
          case '/browse':
            return json(200, { url: body.url, title: 'Página', content: 'p'.repeat(2000) });
          default:
            return json(404, { errorCode: 'NotFound' });
        }
      });
    });
    upPort = await listen(upstream);
    dist = mkdtempSync(join(tmpdir(), 'webiq-live-'));
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>demo</title>');
  });

  afterAll(async () => {
    await Promise.all([...apps.map(close), close(upstream)]);
    rmSync(dist, { recursive: true, force: true });
  });

  it('anuncia el modelo y que hace falta código, sin exponer secretos', async () => {
    const port = await make();
    const r = await call(port, { path: '/api/status' });
    expect(r.json).toMatchObject({ ok: true, hasKey: true, auth: 'key', llm: true, model: 'gpt-test', needsCode: true });
    expect(r.text).not.toContain(KEY);
    expect(r.text).not.toContain(CODE);
  });

  it('exige el código de acceso y bloquea tras varios fallos', async () => {
    const port = await make();
    const before = seen.length;
    expect((await ask(port, { prompt: 'hola' }, {})).json.errorCode).toBe('AccessCodeRequired');
    expect((await call(port, { path: '/api/live/verify', headers: { 'x-demo-code': 'nope' } })).json.errorCode).toBe('InvalidAccessCode');
    expect((await call(port, { method: 'POST', path: '/api/webiq/web', headers: { 'content-type': 'application/json' }, body: { query: 'x' } })).status).toBe(401);
    const ok = await call(port, { path: '/api/live/verify', headers: { 'x-demo-code': CODE } });
    expect(ok.status).toBe(200);
    expect(ok.json).toMatchObject({ ok: true, remainingToday: 200 });
    for (let i = 0; i < 10; i++) await call(port, { path: '/api/live/verify', headers: { 'x-demo-code': `bad-${i}` } });
    const locked = await call(port, { path: '/api/live/verify', headers: { 'x-demo-code': CODE } });
    expect(locked.status).toBe(429);
    expect(locked.json.errorCode).toBe('TooManyAttempts');
    expect(seen.length).toBe(before);
  });

  it('planifica, consulta las cuatro fuentes en paralelo y transmite la respuesta con citas', async () => {
    const port = await make();
    mode.planner = 'ok';
    mode.answer = 'ok';
    const from = seen.length;
    const r = await ask(port, { prompt: 'Último Clásico Real Madrid Barça', lang: 'es' });
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toContain('application/x-ndjson');
    expect(r.headers['cache-control']).toContain('no-store');
    const types = r.events.map((e) => e.type);
    expect(types[0]).toBe('start');
    expect(types[1]).toBe('plan');
    expect(types.filter((t) => t === 'call')).toHaveLength(4);
    expect(types.filter((t) => t === 'result')).toHaveLength(4);
    expect(types.indexOf('answer-start')).toBeGreaterThan(types.lastIndexOf('result'));
    expect(types.at(-1)).toBe('done');

    const plan = r.events[1];
    expect(plan).toMatchObject({ planner: 'llm', language: 'es', region: 'ES', freshness: 'week', queries: { web: 'q web', videos: 'q videos' } });

    const calls = seen.slice(from).filter((s) => s.path.startsWith('/search/'));
    const byPath = Object.fromEntries(calls.map((c) => [c.path, c]));
    expect(byPath['/search/web'].body).toMatchObject({ query: 'q web', contentFormat: 'passage', maxLength: 1500, language: 'es', region: 'ES' });
    expect(byPath['/search/videos'].body).toMatchObject({ query: 'q videos', freshness: 'week', safeSearch: 'strict' });
    expect(byPath['/search/news'].body).not.toHaveProperty('freshness');
    expect(byPath['/search/web'].headers['x-apikey']).toBe(KEY);

    const results = Object.fromEntries(r.events.filter((e) => e.type === 'result').map((e) => [e.endpoint, e]));
    expect(results.web.traceId).toBe('t-web');
    expect(results.web.items[0].snippet).toHaveLength(201);
    expect(results.web.items[0]).not.toHaveProperty('ground');
    expect(results.images.items).toHaveLength(1);
    expect(results.images.items[0]).not.toHaveProperty('ref');
    expect(results.videos.items[0]).toMatchObject({ embeddingUrl: 'https://yt.example/embed/v1', length: '00:05:12', moments: [{ title: 'Gol' }] });
    expect(results.videos.items[0].snippet).toHaveLength(201);
    const refs = r.events.filter((e) => e.type === 'result').flatMap((e) => e.items.map((i) => i.ref).filter(Boolean));
    expect(refs.sort()).toEqual([1, 2, 3, 4]);

    const answer = r.events.filter((e) => e.type === 'token').map((e) => e.text).join('');
    expect(answer).toContain('**Clásico**');
    const llmCall = seen.slice(from).find((s) => s.path === '/llm/v1/chat/completions' && s.body.stream);
    expect(llmCall.headers['api-key']).toBe('llm-key');
    expect(llmCall.body).toMatchObject({ model: 'gpt-test', reasoning_effort: 'none', stream: true });
    expect(llmCall.body.messages[1].content).toContain('x'.repeat(900));
    expect(llmCall.body.messages[0].content).toContain('Spanish');

    const done = r.events.at(-1);
    expect(done).toMatchObject({ calls: 4, okCalls: 4, cited: [1, 4] });
    expect(done.costUsd).toBeCloseTo(0.028, 6);
    expect(r.events.find((e) => e.type === 'answer-end').usage).toEqual({ prompt: 120, completion: 30 });
    expect(r.text).not.toContain(KEY);
  });

  it('si falla el planificador busca con el texto tal cual y lee la URL con browse', async () => {
    const port = await make();
    mode.planner = 'fail';
    const from = seen.length;
    const r = await ask(port, { prompt: 'Resume https://example.com/articulo, por favor', lang: 'en', sources: ['web'] });
    mode.planner = 'ok';
    const plan = r.events.find((e) => e.type === 'plan');
    expect(plan).toMatchObject({ planner: 'fallback', language: 'en', region: 'US', browse: 'https://example.com/articulo' });
    expect(plan.queries).toEqual({ web: 'Resume por favor' });
    const paths = seen.slice(from).map((s) => s.path);
    expect(paths).toContain('/browse');
    expect(paths).not.toContain('/search/news');
    expect(r.events.at(-1).calls).toBe(2);
    expect(r.events.at(-1).costUsd).toBeCloseTo(0.008, 6);
  });

  it('informa del fallo del modelo sin perder los resultados', async () => {
    const port = await make();
    mode.answer = 'fail';
    const r = await ask(port, { prompt: 'algo', sources: ['news'] });
    mode.answer = 'ok';
    expect(r.events.find((e) => e.type === 'result').count).toBe(1);
    expect(r.events.find((e) => e.type === 'error')).toMatchObject({ stage: 'answer', code: 'LlmError' });
    expect(r.events.at(-1)).toMatchObject({ type: 'done', cited: [] });
  });

  it('sin modelo configurado devuelve solo resultados', async () => {
    const port = await make({ llm: null });
    const r = await ask(port, { prompt: 'algo', sources: ['web'] });
    expect(r.events.find((e) => e.type === 'plan').planner).toBe('fallback');
    expect(r.events.find((e) => e.type === 'answer-skipped').reason).toBe('NoLlm');
  });

  it('valida la petición antes de gastar cuota', async () => {
    const port = await make();
    const before = seen.length;
    expect((await ask(port, { prompt: '  ' })).json.errorCode).toBe('InvalidRequest');
    expect((await ask(port, { prompt: 'x'.repeat(501) })).json.errorCode).toBe('InvalidRequest');
    expect((await ask(port, { prompt: 'x', sources: ['auto'] })).json.errorCode).toBe('InvalidRequest');
    expect((await ask(port, { prompt: 'x', sources: [] })).json.errorCode).toBe('InvalidRequest');
    expect((await ask(port, { prompt: 'x' }, { 'x-demo-code': CODE, origin: 'https://evil.example' })).status).toBe(403);
    expect((await call(port, { path: '/api/live/ask', headers: { 'x-demo-code': CODE } })).status).toBe(405);
    expect(seen.length).toBe(before);
    const noKey = await make({ apiKey: '' });
    expect((await ask(noKey, { prompt: 'x' })).json.errorCode).toBe('MissingApiKey');
  });

  it('limita las consultas por minuto y por día', async () => {
    const port = await make({ live: { perMinute: 2 } });
    await ask(port, { prompt: 'a', sources: ['web'] });
    await ask(port, { prompt: 'b', sources: ['web'] });
    const third = await ask(port, { prompt: 'c', sources: ['web'] });
    expect(third.status).toBe(429);
    expect(third.json.errorCode).toBe('RateLimited');
    expect(Number(third.headers['retry-after'])).toBeGreaterThan(0);

    const daily = await make({ live: { dailyLimit: 1 } });
    expect((await ask(daily, { prompt: 'a', sources: ['web'] })).status).toBe(200);
    expect((await ask(daily, { prompt: 'b', sources: ['web'] })).json.errorCode).toBe('DailyLimit');
  });
});

describe('utilidades del Caso 0', () => {
  it('clientIp solo confía en X-Forwarded-For detrás del proxy', () => {
    const req = (xff) => ({ headers: xff ? { 'x-forwarded-for': xff } : {}, socket: { remoteAddress: '10.0.0.1' } });
    expect(clientIp(req('203.0.113.9:51234, 10.1.1.1'), true)).toBe('203.0.113.9');
    expect(clientIp(req('[2001:db8::1]:443'), true)).toBe('2001:db8::1');
    expect(clientIp(req('2001:db8::2'), true)).toBe('2001:db8::2');
    expect(clientIp(req('203.0.113.9'), false)).toBe('10.0.0.1');
    expect(clientIp(req(), true)).toBe('10.0.0.1');
  });

  it('el limitador libera huecos simultáneos y reinicia el cupo diario', () => {
    let t = Date.UTC(2026, 9, 28, 23, 59, 0);
    const lim = createLimiter({ perMinute: 10, dailyLimit: 2, maxConcurrent: 1, now: () => t });
    const a = lim.take('1');
    expect(a.ok).toBe(true);
    expect(lim.take('2')).toMatchObject({ ok: false, code: 'Busy' });
    a.release();
    a.release();
    expect(lim.take('2').ok).toBe(true);
    expect(lim.take('3')).toMatchObject({ ok: false });
    t += 2 * 60_000;
    expect(lim.remaining()).toBe(2);
  });

  it('el guardián del código compara sin filtrar longitudes', () => {
    const g = createCodeGuard({ code: 'abc', maxFails: 2 });
    expect(g.check('ip', 'abc')).toBe('ok');
    expect(g.check('ip', 'abcd')).toBe('bad');
    expect(g.check('ip', '')).toBe('missing');
    expect(g.check('ip', 'x')).toBe('bad');
    expect(g.check('ip', 'abc')).toBe('locked');
    expect(createCodeGuard({}).check('ip', undefined)).toBe('ok');
  });

  it('normalizeLive recorta a 200 caracteres y conserva el texto completo para el modelo', () => {
    const [w] = normalizeLive('web', { webResults: [{ title: 't', url: 'https://u', content: 'a'.repeat(500) }] });
    expect(w.snippet).toHaveLength(201);
    expect(w.ground).toHaveLength(500);
    expect(normalizeLive('browse', {})).toEqual([]);
    expect(normalizeLive('images', { imageResults: [{ title: 'sin url' }] })).toEqual([]);
    const [noEmbed, httpEmbed, adult] = normalizeLive('videos', {
      videoResults: [
        { title: 'a', url: 'https://v/a', embeddingUrl: 'https://yt/embed/a', allowHttpsEmbedding: false },
        { title: 'b', url: 'https://v/b', embeddingUrl: 'http://yt/embed/b' },
        { title: 'c', url: 'https://v/c', isAdult: true },
      ],
    });
    expect(noEmbed.embeddingUrl).toBeUndefined();
    expect(httpEmbed.embeddingUrl).toBeUndefined();
    expect(adult).toBeUndefined();
  });
});

describe('credenciales', () => {
  it('usa la identidad administrada de App Service y cachea el token', async () => {
    const calls = [];
    let t = 1_000_000;
    const fetch = async (url, init) => {
      calls.push({ url: String(url), headers: init.headers });
      return new Response(JSON.stringify({ access_token: `tok-${calls.length}`, expires_on: String(t / 1000 + 3600) }), { status: 200 });
    };
    const env = { IDENTITY_ENDPOINT: 'http://169.254.129.4:8081/msi/token', IDENTITY_HEADER: 'secret-h' };
    const get = tokenProvider('https://api.microsoft.ai', { env, fetch, now: () => t, cli: false });
    expect(await Promise.all([get(), get()])).toEqual(['tok-1', 'tok-1']);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('resource=https%3A%2F%2Fapi.microsoft.ai');
    expect(calls[0].url).toContain('api-version=2019-08-01');
    expect(calls[0].headers['X-IDENTITY-HEADER']).toBe('secret-h');
    t += 56 * 60_000;
    expect(await get()).toBe('tok-2');
  });

  it('client credentials y, en local, Azure CLI', async () => {
    let body;
    const fetch = async (url, init) => {
      body = String(init.body);
      return new Response(JSON.stringify({ access_token: 'cc-tok', expires_in: 3599 }), { status: 200 });
    };
    const cc = tokenProvider('https://api.microsoft.ai', {
      env: {},
      fetch,
      clientCredentials: { tenantId: 't', clientId: 'c', clientSecret: 's' },
    });
    expect(await cc()).toBe('cc-tok');
    expect(body).toContain('scope=https%3A%2F%2Fapi.microsoft.ai%2F.default');
    const viaCli = tokenProvider('https://cognitiveservices.azure.com', { env: {}, cliToken: async (r) => ({ token: `cli:${r}`, expiresAt: Date.now() + 3600_000 }) });
    expect(await viaCli()).toBe('cli:https://cognitiveservices.azure.com');
    await expect(tokenProvider('x', { env: {}, cli: false })()).rejects.toThrow('No Entra ID credential');
  });

  it('elige la autenticación de Web IQ y del modelo a partir del entorno', async () => {
    expect(webiqAuthFromEnv({})).toBeNull();
    const key = webiqAuthFromEnv({ WEBIQ_API_KEY: ' k ', WEBIQ_APPID: 'ignored' });
    expect(key.mode).toBe('key');
    expect(key.appId).toBeNull();
    expect(await key.headers()).toEqual({ 'x-apikey': 'k' });
    const entra = webiqAuthFromEnv({ WEBIQ_AUTH: 'entra', WEBIQ_APPID: 'app-1' }, { cliToken: async () => ({ token: 'e', expiresAt: Date.now() + 3600_000 }) });
    expect(entra.mode).toBe('entra');
    expect(entra.appId).toBe('app-1');
    expect(await entra.headers()).toEqual({ authorization: 'Bearer e' });

    expect(llmFromEnv({})).toBeNull();
    const llmKey = llmFromEnv({ LLM_ENDPOINT: 'https://x.cognitiveservices.azure.com/openai/v1/', LLM_API_KEY: 'lk' });
    expect(llmKey).toMatchObject({ endpoint: 'https://x.cognitiveservices.azure.com/openai/v1', model: 'gpt-5.4-mini' });
    expect(await llmKey.headers()).toEqual({ 'api-key': 'lk' });
  });
});
