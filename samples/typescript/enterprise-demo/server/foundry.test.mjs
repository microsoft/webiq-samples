// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { request as httpRequest } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { createFoundry, foundryFromEnv, sseEvents, toolOutput, toolQueries } from './foundry.mjs';
import { createApp } from './index.mjs';

const CODE = 'demo-2026';
const ENDPOINT = 'https://aif-test.services.ai.azure.com/api/projects/proj';

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
          /* NDJSON */
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
        resolve({ status: res.statusCode, headers: res.headers, json, events });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

const sse = (events, { split = 7 } = {}) => {
  const text = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('').replace(/\n/g, '\r\n');
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(c) {
      for (let i = 0; i < bytes.length; i += split) c.enqueue(bytes.slice(i, i + split));
      c.close();
    },
  });
};

const kbOutput = JSON.stringify([
  { ref_id: 0, title: '04-comparativa-actual-05.md', content: 'Puntuaciones…' },
  { ref_id: 1, title: '02-oferta-vodafone-business.md', content: 'Cláusula 9.1…' },
]);
const newsOutput = JSON.stringify({
  newsResults: [
    { title: 'Vodafone sube un 3,9%', url: 'https://www.example-news.es/a', source: 'Zonamovilidad', lastUpdatedAt: '2025-12-01T00:00:00Z', content: 'x' },
    { title: 'Movistar sube', url: 'https://www.example-news.es/b', content: 'y' },
    { title: 'No https', url: 'http://insecure.example/c', content: 'z' },
  ],
});

const RUN = [
  { type: 'response.created', response: { id: 'resp_1', model: 'gpt-5.4-mini', status: 'in_progress' } },
  { type: 'response.mcp_list_tools.completed', item_id: 'l1' },
  { type: 'response.output_item.added', item: { type: 'mcp_call', id: 'mcp_kb', server_label: 'foundry_iq_contratos', name: 'knowledge_base_retrieve', arguments: '', status: 'calling' } },
  { type: 'response.mcp_call_arguments.done', item_id: 'mcp_kb', arguments: JSON.stringify({ query_variants: ['comparativa actual', 'cláusula IPC'] }) },
  {
    type: 'response.output_item.done',
    item: { type: 'mcp_call', id: 'mcp_kb', server_label: 'foundry_iq_contratos', name: 'knowledge_base_retrieve', arguments: JSON.stringify({ query_variants: ['comparativa actual', 'cláusula IPC'] }), output: kbOutput },
  },
  { type: 'response.output_item.added', item: { type: 'mcp_call', id: 'mcp_n', server_label: 'web_iq', name: 'news', arguments: '' } },
  { type: 'response.output_item.added', item: { type: 'mcp_call', id: 'mcp_w', server_label: 'web_iq', name: 'web', arguments: '' } },
  { type: 'response.output_item.done', item: { type: 'mcp_call', id: 'mcp_n', server_label: 'web_iq', name: 'news', arguments: JSON.stringify({ query: 'subidas tarifas 2026', language: 'es' }), output: newsOutput } },
  { type: 'response.output_item.done', item: { type: 'mcp_call', id: 'mcp_w', server_label: 'web_iq', name: 'web', arguments: JSON.stringify({ query: 'OAUT' }), error: { message: 'Forbidden (403)' } } },
  { type: 'response.output_item.added', item: { type: 'message', id: 'msg_1' } },
  { type: 'response.output_text.delta', item_id: 'msg_1', delta: 'Vodafone sigue **primera**' },
  { type: 'response.output_text.delta', item_id: 'msg_1', delta: ' 【Web: Xataka, 13/01/2026】.' },
  { type: 'response.completed', response: { id: 'resp_1', status: 'completed', usage: { input_tokens: 1200, output_tokens: 340 } } },
];

describe('Caso 6 · utilidades del agente de Foundry', () => {
  it('lee eventos SSE troceados, con CRLF y con [DONE]', async () => {
    const body = sse([{ type: 'a', n: 1 }, { type: 'b', text: 'ñ €' }], { split: 3 });
    const extra = new TextEncoder().encode('data: [DONE]\r\n\r\n');
    const merged = new ReadableStream({
      async start(c) {
        for await (const ch of body) c.enqueue(ch);
        c.enqueue(extra);
        c.close();
      },
    });
    const out = [];
    for await (const ev of sseEvents(merged)) out.push(ev);
    expect(out).toEqual([{ type: 'a', n: 1 }, { type: 'b', text: 'ñ €' }]);
  });

  it('resume las consultas de cada herramienta', () => {
    expect(toolQueries('{"query_variants":["a","b"]}')).toEqual(['a', 'b']);
    expect(toolQueries({ query: 'OAUT 2025' })).toEqual(['OAUT 2025']);
    expect(toolQueries('{"url":"https://x.es"}')).toEqual(['https://x.es']);
    expect(toolQueries('no json')).toEqual([]);
    expect(toolQueries(JSON.stringify({ query: 'x'.repeat(400) }))[0].length).toBeLessThanOrEqual(161);
  });

  it('resume la salida: cuenta resultados y solo enlaza URL https', () => {
    const news = toolOutput(newsOutput);
    expect(news.count).toBe(3);
    expect(news.sources[0]).toEqual({ title: 'Vodafone sube un 3,9%', url: 'https://www.example-news.es/a', publisher: 'Zonamovilidad', date: '2025-12-01T00:00:00Z' });
    expect(news.sources[2].url).toBeUndefined();
    const kb = toolOutput(kbOutput);
    expect(kb.count).toBe(2);
    expect(kb.sources.map((s) => s.title)).toEqual(['04-comparativa-actual-05.md', '02-oferta-vodafone-business.md']);
    expect(toolOutput(JSON.stringify({ content: [{ type: 'text', text: kbOutput }] })).count).toBe(2);
    expect(toolOutput('texto plano')).toEqual({ count: null, sources: [] });
  });

  it('lee el formato real de Foundry IQ: documentos con JSON en «content»', () => {
    const doc = (id, section) =>
      JSON.stringify({ id, title: 'Comparativa actual de ofertas', operator: 'Logística Meridiana (interno)', section, url: 'https://demo.example/foundry/contratos-telco/04-comparativa-actual.md', content: '…' });
    const out = toolOutput(
      JSON.stringify({
        documents: [
          { id: 'a', content: doc('04-comparativa-actual-01', '1. Resumen económico') },
          { id: 'b', content: doc('04-comparativa-actual-03', '3. Matriz de decisión provisional') },
          { id: 'c', content: doc('04-comparativa-actual-03', '3. Matriz de decisión provisional') },
        ],
      }),
    );
    expect(out.count).toBe(3);
    expect(out.sources).toHaveLength(2);
    expect(out.sources[0]).toMatchObject({ section: '1. Resumen económico', publisher: 'Logística Meridiana (interno)', url: 'https://demo.example/foundry/contratos-telco/04-comparativa-actual.md' });
  });

  it('solo se configura con endpoint de proyecto https y nombre de agente', () => {
    expect(foundryFromEnv({})).toBeNull();
    expect(foundryFromEnv({ FOUNDRY_PROJECT_ENDPOINT: ENDPOINT })).toBeNull();
    expect(foundryFromEnv({ FOUNDRY_PROJECT_ENDPOINT: 'http://x/api/projects/p', FOUNDRY_AGENT: 'a' })).toBeNull();
    const f = foundryFromEnv({ FOUNDRY_PROJECT_ENDPOINT: `${ENDPOINT}/`, FOUNDRY_AGENT: 'revisor' });
    expect(f).toMatchObject({ endpoint: ENDPOINT, agent: 'revisor' });
  });

  it('sin agente configurado responde 503', async () => {
    const f = createFoundry({});
    expect(f.available).toBe(false);
    let got;
    await f.ask({ headers: {} }, {}, { prompt: 'x' }, (_res, status, code) => (got = { status, code }));
    expect(got).toEqual({ status: 503, code: 'FoundryNotConfigured' });
  });
});

describe('Caso 6 · ruta /api/foundry/ask', () => {
  let server;
  afterEach(
    () =>
      new Promise((r) => {
        if (!server) return r();
        server.closeAllConnections();
        server.close(() => r());
      }),
  );

  async function start({ upstream, foundry = true, limits } = {}) {
    const seen = [];
    const fetch = async (url, init) => {
      seen.push({ url: String(url), init, body: init?.body ? JSON.parse(init.body) : null });
      return upstream(url, init);
    };
    server = createApp({
      apiKey: 'k',
      fetch,
      live: { accessCode: CODE },
      foundry: foundry ? { endpoint: ENDPOINT, agent: 'revisor-contratos-telco', headers: async () => ({ authorization: 'Bearer test-token' }) } : null,
      foundryLimits: limits,
    });
    const port = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
    const ask = (body, headers = { 'x-demo-code': CODE }) =>
      call(port, { method: 'POST', path: '/api/foundry/ask', headers: { 'content-type': 'application/json', ...headers }, body });
    return { port, seen, ask };
  }

  const ok = () => new Response(sse(RUN), { status: 200, headers: { 'content-type': 'text/event-stream' } });

  it('/api/status indica si hay agente', async () => {
    const { port } = await start({ upstream: ok });
    const r = await call(port, { path: '/api/status' });
    expect(r.json).toMatchObject({ foundry: true, foundryAgent: 'revisor-contratos-telco' });
  });

  it('pide el código de acceso, POST y un prompt válido', async () => {
    const { port, ask, seen } = await start({ upstream: ok });
    expect((await ask({ prompt: 'x' }, {})).status).toBe(401);
    expect((await ask({ prompt: 'x' }, { 'x-demo-code': 'mal' })).status).toBe(401);
    expect((await call(port, { path: '/api/foundry/ask' })).status).toBe(405);
    expect((await ask({ prompt: '  ' })).status).toBe(400);
    expect((await ask({ prompt: 'x'.repeat(2001) })).status).toBe(400);
    expect((await ask({ prompt: 'x', lang: 'fr' })).status).toBe(400);
    expect(seen).toHaveLength(0);
  });

  it('llama al agente por referencia y retransmite herramientas, texto y cierre', async () => {
    const { ask, seen } = await start({ upstream: ok });
    const r = await ask({ prompt: 'Revisa el expediente' });
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/application\/x-ndjson/);
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe(`${ENDPOINT}/openai/v1/responses`);
    expect(seen[0].init.headers.authorization).toBe('Bearer test-token');
    expect(seen[0].body).toEqual({ agent_reference: { name: 'revisor-contratos-telco', type: 'agent_reference' }, input: 'Revisa el expediente', stream: true });

    const ev = r.events;
    expect(ev[0]).toMatchObject({ type: 'start', agent: 'revisor-contratos-telco' });
    expect(ev.find((e) => e.type === 'meta')).toMatchObject({ model: 'gpt-5.4-mini' });
    const tools = ev.filter((e) => e.type === 'tool');
    expect(tools.find((e) => e.id === 'mcp_kb' && e.status === 'calling')).toMatchObject({ server: 'foundry_iq_contratos', name: 'knowledge_base_retrieve' });
    expect(tools.find((e) => e.id === 'mcp_kb' && !e.status)).toMatchObject({ queries: ['comparativa actual', 'cláusula IPC'] });
    expect(tools.find((e) => e.id === 'mcp_kb' && e.status === 'completed')).toMatchObject({ count: 2 });
    expect(tools.find((e) => e.id === 'mcp_n' && e.status === 'completed')).toMatchObject({ count: 3, queries: ['subidas tarifas 2026'] });
    expect(tools.find((e) => e.id === 'mcp_w' && e.status === 'failed')).toMatchObject({ error: 'Forbidden (403)', count: null, sources: [] });
    const text = ev.filter((e) => e.type === 'token').map((e) => e.text).join('');
    expect(text).toBe('Vodafone sigue **primera** 【Web: Xataka, 13/01/2026】.');
    expect(ev.at(-1)).toMatchObject({ type: 'done', tools: 3, failedTools: 1, inputTokens: 1200, outputTokens: 340 });
    expect(r.json).toBeNull();
    expect(JSON.stringify(ev)).not.toContain('test-token');
  });

  it('en inglés pide al agente que conteste en inglés; en español no añade nada', async () => {
    const { ask, seen } = await start({ upstream: ok });
    await ask({ prompt: 'Review the file', lang: 'en' });
    await ask({ prompt: 'Revisa el expediente', lang: 'es' });
    expect(seen[0].body.input).toMatch(/^Review the file\n\n\(Write the whole answer in English/);
    expect(seen[1].body.input).toBe('Revisa el expediente');
  });

  it('convierte un rechazo de Foundry en un evento de error', async () => {
    const { ask } = await start({
      upstream: async () => new Response(JSON.stringify({ error: { code: 'PermissionDenied', message: 'The principal lacks Azure AI User.' } }), { status: 403 }),
    });
    const r = await ask({ prompt: 'x' });
    expect(r.status).toBe(200);
    expect(r.events.at(-1)).toMatchObject({ type: 'error', code: 'HTTP 403', message: 'The principal lacks Azure AI User.' });
    expect(r.events.some((e) => e.type === 'retry')).toBe(false);
  });

  it('avisa si el agente falla o el flujo se corta', async () => {
    const failed = await start({
      upstream: async () => new Response(sse([RUN[0], { type: 'response.failed', response: { error: { code: 'server_error', message: 'boom' } } }])),
    });
    const fr = await failed.ask({ prompt: 'x' });
    expect(fr.events.at(-1)).toMatchObject({ type: 'error', code: 'server_error', message: 'boom' });
    expect(fr.events.filter((e) => e.type === 'retry')).toHaveLength(1);
    expect(failed.seen).toHaveLength(2);
    await new Promise((r) => {
      server.closeAllConnections();
      server.close(() => r());
    });
    const cut = await start({ upstream: async () => new Response(sse(RUN.slice(0, 5))) });
    expect((await cut.ask({ prompt: 'x' })).events.at(-1)).toMatchObject({ type: 'error', code: 'StreamCut' });
  });

  it('reintenta una vez si una herramienta falla antes del primer token', async () => {
    let n = 0;
    const denied = { type: 'error', error: { type: 'invalid_request_error', code: 'tool_user_error', message: 'Access denied … (HTTP 403 Forbidden)' } };
    const { ask, seen } = await start({ upstream: async () => (++n === 1 ? new Response(sse([RUN[0], RUN[2], denied])) : ok()) });
    const r = await ask({ prompt: 'x' });
    expect(seen).toHaveLength(2);
    const retry = r.events.find((e) => e.type === 'retry');
    expect(retry).toMatchObject({ attempt: 2, code: 'tool_user_error' });
    expect(r.events.filter((e) => e.type === 'error')).toHaveLength(0);
    expect(r.events.at(-1)).toMatchObject({ type: 'done', tools: 3 });
  });

  it('no reintenta si el agente ya había empezado a escribir', async () => {
    const { ask, seen } = await start({
      upstream: async () => new Response(sse([RUN[0], RUN[10], { type: 'error', error: { code: 'tool_user_error', message: 'x' } }])),
    });
    const r = await ask({ prompt: 'x' });
    expect(seen).toHaveLength(1);
    expect(r.events.at(-1)).toMatchObject({ type: 'error', code: 'tool_user_error' });
  });

  it('limita las ejecuciones por minuto', async () => {
    const { ask } = await start({ upstream: ok, limits: { perMinute: 1 } });
    expect((await ask({ prompt: 'x' })).status).toBe(200);
    const r = await ask({ prompt: 'x' });
    expect(r.status).toBe(429);
    expect(r.json.errorCode).toBe('RateLimited');
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('sin agente configurado, la ruta responde 503', async () => {
    const { ask, port } = await start({ upstream: ok, foundry: false });
    expect((await call(port, { path: '/api/status' })).json).toMatchObject({ foundry: false, foundryAgent: null });
    const r = await ask({ prompt: 'x' });
    expect(r.status).toBe(503);
    expect(r.json.errorCode).toBe('FoundryNotConfigured');
  });
});
