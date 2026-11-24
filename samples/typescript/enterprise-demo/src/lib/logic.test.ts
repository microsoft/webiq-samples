// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLIENTS } from '../data/clients';
import { SCENARIOS } from '../data/scenarios';
import { contrastRatio, contrastText, ensureContrast, ensureContrastOn, hexToRgb, mix, surfaceTokens } from './color';
import { fmtDate, fmtTime, hostOf, shortTrace, clockSeconds, fmtClock, fmtCompact } from './format';
import { fmtInt, monthlyCost, parseRetryAfter, runCost, variantCalls } from './cost';
import { buildTimeline, citedAt, metricsAt, progress } from './timeline';
import { parseDeepLink, startView, withDeepLink } from './deeplink';
import { readStored, writeStored } from './storage';
import { DEFAULT_SETTINGS, THEME_PRESETS, applyTheme, brandColors, clientAccent, clientName, fontFamily, monoFamily, sanitizeSettings } from './settings';
import { bingResponsePreview, responsePreview, traceIdFor } from './response';
import {
  LiveHttpError,
  applyLiveEvent,
  askLive,
  callLive,
  citedInText,
  fillPreset,
  getStatus,
  lineSplitter,
  liveRefs,
  newRun,
  normalizeResults,
  safeUrl,
  verifyAccessCode,
  type LiveEvent,
} from './live';
import { balanceMarks } from '../components/Rich';
import { API_BASE, MCP_URL, bingCurlSnippet, bingTool, curlSnippet, mcpConfig, parseBingConfig, pythonSnippet, snippet, tsSnippet } from './snippets';
import { highlight } from './highlight';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('colores y contraste', () => {
  it('convierte, mezcla y limita colores HEX', () => {
    expect(hexToRgb('#abc')).toEqual([170, 187, 204]);
    expect(hexToRgb('not-a-color')).toEqual([128, 128, 128]);
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(contrastText('#000000')).toBe('#FFFFFF');
    expect(contrastText('#ffffff')).toBe('#111827');
  });

  it('mantiene contraste legible en fondos representativos y superficies elevadas', () => {
    for (const bg of ['#FFFFFF', '#111C30', '#FF8C00', '#00B4FF', '#777777', '#FFD400']) {
      const s = surfaceTokens(bg);
      for (const text of [s.text, s.muted, s.faint]) {
        expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(text, s.raised)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(text, s.hovered)).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrastRatio(ensureContrast('#777777', '#ffffff'), '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ensureContrastOn('#777777', ['#ffffff'], '#000000'), '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('formato y coste', () => {
  it('formatea fechas, idiomas, hosts y duraciones', () => {
    expect(fmtDate('2026-10-28T19:24:00+01:00', 'es')).toBe('28 oct 2026 · 19:24');
    expect(fmtDate('2026-10-28T00:00:00Z', 'en')).toBe('28 Oct 2026');
    expect(fmtDate('invalid', 'es')).toBe('invalid');
    expect(fmtTime('2026-10-28T09:05:00Z')).toBe('09:05');
    expect(fmtTime('invalid')).toBe('');
    expect(hostOf('https://www.example.com/a')).toBe('example.com');
    expect(hostOf('not a url')).toBe('not a url');
    expect(shortTrace('123456789012345')).toBe('12345678…');
    expect(clockSeconds('1.02:03:04')).toBe(93_784);
    expect(fmtClock('0.00:00:48')).toBe('0:48');
    expect(fmtClock('invalid')).toBe('invalid');
    expect(fmtInt(1234.6, 'en')).toBe('1,235');
  });

  it('calcula precios, cobertura y reintentos para los seis casos', () => {
    expect(SCENARIOS).toHaveLength(6);
    for (const scenario of SCENARIOS) {
      const cost = runCost(scenario);
      expect(cost.calls).toBe(variantCalls(scenario).length);
      expect(cost.webiq).toBeGreaterThan(0);
      expect(cost.bingTx + cost.uncovered).toBe(cost.calls);
      expect(monthlyCost(scenario, 100, 500).runs).toBe(100);
    }
    expect(parseRetryAfter('2s')).toBe(2000);
    expect(parseRetryAfter('1.5 s')).toBe(1500);
    expect(parseRetryAfter('soon')).toBe(0);
  });
});

describe('reproducción y enlaces profundos', () => {
  it('genera cronologías y métricas coherentes', () => {
    for (const scenario of SCENARIOS) {
      const tl = buildTimeline(scenario, 'webiq');
      expect(tl.total).toBeGreaterThan(0);
      expect(tl.steps.length).toBeGreaterThan(0);
      expect(tl.calls.length).toBe(runCost(scenario).calls);
      const end = metricsAt(tl, scenario.sources, tl.total);
      expect(end.calls).toBe(tl.calls.length);
      expect(end.apiMs).toBeGreaterThan(0);
      expect(progress(100, 200, 150)).toBe(0.5);
      expect(progress(100, 100, 100)).toBe(1);
    }
    const first = buildTimeline(SCENARIOS[0], 'webiq');
    expect(citedAt(first, first.total).size).toBeGreaterThan(0);
  });

  it('valida parámetros de URL y conserva la prioridad de escenario', () => {
    const link = parseDeepLink('?scenario=2&variant=bing&lang=en&client=hospitality&theme=dark&view=why&settings=open&t=end');
    expect(link.scenario).toBe(SCENARIOS[1].id);
    expect(link.variant).toBe('bing');
    expect(link.seek).toBe('end');
    expect(link.settingsOpen).toBe(true);
    expect(startView(link, null)).toEqual({ kind: 'scenario', id: SCENARIOS[1].id });
    expect(startView(parseDeepLink('?view=guide'), null)).toEqual({ kind: 'guide' });
    expect(startView(parseDeepLink('?scenario=0'), null)).toEqual({ kind: 'live' });
    expect(startView(parseDeepLink('?scenario=live&lang=en'), null)).toEqual({ kind: 'live' });
    expect(startView(parseDeepLink('?view=live'), null)).toEqual({ kind: 'live' });
    expect(startView(parseDeepLink(''), JSON.stringify({ kind: 'live' }))).toEqual({ kind: 'live' });
    expect(startView(parseDeepLink(''), JSON.stringify({ kind: 'nope' }))).toEqual({ kind: 'scenario', id: SCENARIOS[0].id });
    expect(startView(parseDeepLink(''), '{bad')).toEqual({ kind: 'scenario', id: SCENARIOS[0].id });
    expect(parseDeepLink('?scenario=99&variant=no&lang=xx').scenario).toBeNull();
  });

  it('aplica cliente e idioma sin mutar ajustes y permite sobreescribir marca con tema', () => {
    const original = { ...DEFAULT_SETTINGS, colors: { ...DEFAULT_SETTINGS.colors } };
    const linked = withDeepLink(original, parseDeepLink('?client=hospitality&lang=en&theme=dark'));
    expect(original.lang).toBe('es');
    expect(linked.lang).toBe('en');
    expect(linked.colors).toEqual(THEME_PRESETS.find((p) => p.id === 'dark')?.colors);
    expect(withDeepLink(original, parseDeepLink(''))).toBe(original);
    expect(brandColors(original, 'hospitality').accent).toBe(CLIENTS.find((c) => c.id === 'hospitality')?.brand.accent);
  });
});

describe('ajustes, persistencia y tema', () => {
  it('sanea valores importados y resuelve nombre, acento y tipografías', () => {
    const s = sanitizeSettings({
      lang: 'en', activeClient: 'hospitality', speed: 9, fontSize: 99, radius: -1,
      colors: { app: '#123456', panel: 'red' },
      logos: { hospitality: 'data:image/png;base64,abc', unknown: 'data:image/png;base64,def' },
      clientNames: { hospitality: '  Custom name  ' }, clientAccents: { hospitality: '#abcdef', custom: 'rgb(0,0,0)' },
    });
    expect(s.lang).toBe('en');
    expect(s.speed).toBe(DEFAULT_SETTINGS.speed);
    expect(s.fontSize).toBe(18);
    expect(s.radius).toBe(0);
    expect(s.colors.app).toBe('#123456');
    expect(s.colors.panel).toBe(DEFAULT_SETTINGS.colors.panel);
    expect(s.logos.hospitality).toContain('data:image/');
    expect(s.logos).not.toHaveProperty('unknown');
    expect(clientName(s, 'hospitality')).toBe('Custom name');
    expect(clientAccent(s, 'hospitality')).toBe('#abcdef');
    expect(fontFamily({ ...s, fontUi: 'custom', fontUiCustom: " Serif' " })).toBe("'Serif', system-ui, sans-serif");
    expect(monoFamily(s)).toContain('JetBrains Mono');
  });

  it('uses localized sector names unless the user supplies a custom name', () => {
    const s = sanitizeSettings({ lang: 'en', clientNames: { hospitality: '  ' } });
    expect(clientName(s, 'hospitality')).toBe('Hospitality');
    expect(clientName({ ...s, lang: 'es' }, 'hospitality')).toBe('Hostelería');
    expect(clientName(s, 'public-sector')).toBe('Public sector');
    expect(clientName(s, 'custom')).toBe('Custom');
  });

  it('does not restore names or logos from retired organization profiles', () => {
    const retired = 'retired-organization';
    const s = sanitizeSettings({
      activeClient: retired,
      logos: { [retired]: 'data:image/png;base64,abc' },
      clientNames: { [retired]: 'Private organization' },
      clientAccents: { [retired]: '#123456' },
    });
    expect(s.activeClient).toBe('none');
    expect(s.logos).toEqual({});
    expect(s.clientNames).toEqual({});
    expect(s.clientAccents).toEqual({});
    expect(parseDeepLink(`?client=${retired}`).client).toBeNull();
  });

  it('persiste ajustes y aplica variables CSS y el idioma al documento', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    expect(writeStored('x', 'y')).toBe(true);
    expect(readStored('x')).toBe('y');
    const setProperty = vi.fn();
    const root = { style: { setProperty }, dataset: {} as Record<string, string>, lang: '' };
    vi.stubGlobal('document', { documentElement: root });
    applyTheme({ ...DEFAULT_SETTINGS, lang: 'en' });
    expect(setProperty).toHaveBeenCalledWith('--bg-panel', DEFAULT_SETTINGS.colors.panel);
    expect(root.lang).toBe('en');
    expect(root.dataset.scheme).toBe('light');
  });

  it('degrada con seguridad si localStorage no existe o lanza errores', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readStored('x')).toBeNull();
    expect(writeStored('x', 'y')).toBe(false);
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    expect(readStored('x')).toBeNull();
    expect(writeStored('x', 'y')).toBe(false);
  });
});

describe('respuestas y modo en vivo', () => {
  it('crea vistas previas deterministas y citas de Bing', () => {
    const scenario = SCENARIOS[0];
    const call = variantCalls(scenario)[0];
    const preview = responsePreview(scenario, call, 'es', 'Dato estructurado');
    expect(traceIdFor('seed')).toMatch(/^[a-f0-9]{32}$/);
    expect(traceIdFor('seed')).toBe(traceIdFor('seed'));
    expect(preview).not.toHaveProperty('domain');
    if (call.endpoint === 'web') expect(preview).toHaveProperty('webResults');
    const bing = bingResponsePreview('Resultado [1]', scenario.sources.slice(0, 1));
    const content = (bing.output as { content: { text: string; annotations: { start_index: number }[] }[] }[])[0].content[0];
    expect(content.annotations[0].start_index).toBe(10);
    expect(content.text).toBe('Resultado [1]');
  });

  it('normaliza evidencias y rellena presets sin alterar la entrada', () => {
    expect(fillPreset({ q: '{client}', nested: ['{client}'] }, 'Contoso')).toEqual({ q: 'Contoso', nested: ['Contoso'] });
    expect(normalizeResults('images', { imageResults: [{ url: 'https://cdn.example/img', hostPageUrl: 'https://www.example.com/story', title: 'Imagen' }] })[0])
      .toMatchObject({ kind: 'image', url: 'https://www.example.com/story', publisher: 'example.com' });
    expect(normalizeResults('auto', { results: [{ evidence: { type: 'structured/weather', content: { temp: 20 } }, citations: [{ url: 'https://x.test' }] }] })[0].kind).toBe('weather');
    expect(normalizeResults('browse', { content: 'page text' })).toHaveLength(1);
    expect(normalizeResults('web', null)).toEqual([]);
  });

  it('maneja estado y respuestas del proxy local', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, hasKey: true, endpoints: ['web', 'invalid'] }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ status: 201, latencyMs: '12', data: { ok: true } }) }));
    expect(await getStatus()).toEqual({ ok: true, hasKey: true, auth: null, llm: false, model: null, needsCode: false, endpoints: ['web'], foundry: false, foundryAgent: null });
    expect(await callLive('web', { query: 'hello' })).toEqual({ status: 201, latencyMs: 12, data: { ok: true } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await getStatus()).toBeNull();
  });
});

describe('fragmentos y resaltado de código', () => {
  it('genera solicitudes curl, Python, TypeScript, MCP y Grounding with Bing', () => {
    const body = { query: 'clima', maxResults: 3 };
    expect(curlSnippet('web', body)).toContain(`${API_BASE}/search/web`);
    expect(pythonSnippet('web', body)).toContain('client.web.search(');
    expect(tsSnippet('web', body)).toContain('client.web.search(');
    expect(snippet('curl', 'web', body)).toBe(curlSnippet('web', body));
    expect(MCP_URL).toBe(`${API_BASE}/mcp`);
    expect(JSON.parse(mcpConfig()).mcpServers['WebIQ-MCP'].url).toBe(MCP_URL);
    expect(parseBingConfig('count: 5 · market: es-ES · invalid · blank:')).toEqual({ count: 5, market: 'es-ES' });
    expect(bingTool('count: 5').type).toBe('bing_grounding');
    expect(bingCurlSnippet('$HOME $(whoami)', 'count: 5')).toContain('$HOME $(whoami)');
    expect(bingCurlSnippet('$HOME $(whoami)', 'count: 5')).toContain("'$FOUNDRY_MODEL_DEPLOYMENT_NAME'");
  });

  it('resalta JSON y comandos sin producir tokens vacíos', () => {
    const input = '{"a": 1, "b": "x", "c": true}';
    const tokens = highlight(input, 'json').flat();
    expect(tokens.filter((t) => t[0] === '').length).toBe(0);
    expect(tokens).toContainEqual(['"a"', 'k']);
    expect(tokens).toContainEqual(['1', 'n']);
    expect(tokens).toContainEqual(['true', 'b']);
    const bash = highlight("curl --request POST '$HOME'", 'bash').flat();
    expect(bash).toContainEqual(['curl', 'k']);
    expect(bash).toContainEqual(['--request', 'p']);
    expect(bash).toContainEqual(['$HOME', 's']);
  });
});

describe('caso 0 · en vivo', () => {
  afterEach(() => vi.unstubAllGlobals());

  const events: LiveEvent[] = [
    { type: 'start', sources: ['web', 'videos'], llm: true, model: 'gpt-5.4-mini', auth: 'key' },
    { type: 'plan', at: 900, planner: 'llm', language: 'es', region: 'ES', queries: { web: 'clásico', videos: 'clásico resumen' }, freshness: 'week' },
    { type: 'call', at: 910, endpoint: 'videos', request: { query: 'clásico resumen' } },
    { type: 'call', at: 912, endpoint: 'web', request: { query: 'clásico' } },
    { type: 'result', at: 1400, endpoint: 'web', status: 200, latencyMs: 488, count: 1, items: [{ title: 'Crónica', url: 'https://as.com/x', ref: 1 }] },
    { type: 'result', at: 1500, endpoint: 'videos', status: 200, latencyMs: 590, count: 1, items: [{ title: 'Resumen', url: 'https://youtube.com/v', ref: 2 }] },
    { type: 'answer-start', at: 1510, sources: 2 },
    { type: 'token', text: 'Ganó el Madrid [1]' },
    { type: 'token', text: ' y hay vídeo [2].' },
    { type: 'answer-end', at: 3000, latencyMs: 1490, usage: { prompt: 900, completion: 40 } },
    { type: 'done', at: 3010, totalMs: 3010, calls: 2, okCalls: 2, costUsd: 0.014, cited: [1, 2], answerMs: 1490, remainingToday: 199 },
  ];

  it('acumula eventos sin mutar el estado y numera las fuentes citables', () => {
    const start = newRun('¿Quién ganó?', 'es', ['web', 'news', 'images', 'videos']);
    const run = events.reduce(applyLiveEvent, start);
    expect(start.answer).toBe('');
    expect(start.calls).toEqual({});
    expect(run.sources).toEqual(['web', 'videos']);
    expect(run.model).toBe('gpt-5.4-mini');
    expect(run.plan?.freshness).toBe('week');
    expect(run.order).toEqual(['videos', 'web']);
    expect(run.calls.web?.request).toEqual({ query: 'clásico' });
    expect(run.answer).toBe('Ganó el Madrid [1] y hay vídeo [2].');
    expect(run.answerState).toBe('done');
    expect(run.status).toBe('done');
    expect(run.done?.remainingToday).toBe(199);
    const refs = liveRefs(run);
    expect([...refs.keys()].sort()).toEqual([1, 2]);
    expect(refs.get(2)?.endpoint).toBe('videos');
    expect(citedInText(run.answer)).toEqual([1, 2]);
    expect(citedInText('[3] y [1], otra vez [3]')).toEqual([3, 1]);
  });

  it('distingue errores de la respuesta de errores de la ejecución', () => {
    const base = newRun('x', 'en', ['web']);
    const answerErr = applyLiveEvent({ ...base, answerState: 'streaming' }, { type: 'error', stage: 'answer', code: 'LlmError' });
    expect(answerErr.status).toBe('running');
    expect(answerErr.answerState).toBe('error');
    const serverErr = applyLiveEvent({ ...base, answerState: 'done' }, { type: 'error', stage: 'server', code: 'InternalError' });
    expect(serverErr.status).toBe('error');
    expect(serverErr.answerState).toBe('done');
    const skipped = applyLiveEvent(base, { type: 'answer-skipped', at: 10, reason: 'NoSources' });
    expect(skipped.answerState).toBe('skipped');
    expect(applyLiveEvent(serverErr, { type: 'done', at: 1, totalMs: 1, calls: 0, okCalls: 0, costUsd: 0, cited: [], remainingToday: null }).status).toBe('error');
    const resultFirst = applyLiveEvent(base, { type: 'result', at: 5, endpoint: 'news', status: 500, latencyMs: 5, count: 0, items: null as never });
    expect(resultFirst.order).toEqual(['news']);
    expect(resultFirst.calls.news?.result?.items).toEqual([]);
  });

  it('trocea NDJSON en fragmentos arbitrarios y cierra marcas a medias', () => {
    const split = lineSplitter();
    expect(split.push('{"a":1}\n{"b"')).toEqual(['{"a":1}']);
    expect(split.push(':2}\n\n  \n{"c":')).toEqual(['{"b":2}']);
    expect(split.flush()).toEqual(['{"c":']);
    expect(split.flush()).toEqual([]);
    expect(balanceMarks('Hola **mundo')).toBe('Hola **mundo**');
    expect(balanceMarks('Dato [1')).toBe('Dato');
    expect(balanceMarks('Dato [')).toBe('Dato');
    expect(balanceMarks('**ok** [2]')).toBe('**ok** [2]');
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeUrl('https://x.test/a')).toBe('https://x.test/a');
    expect(fmtCompact(1234567, 'en')).toBe('1.2M');
  });

  it('lee el flujo, ignora líneas rotas y propaga errores HTTP', async () => {
    const enc = new TextEncoder();
    const chunks = ['{"type":"token","text":"Hola"}\n{"type":"tok', 'en","text":" mundo"}\nno-json\n', '{"type":"done","at":5,"totalMs":5,"calls":0,"okCalls":0,"costUsd":0,"cited":[],"remainingToday":3}'];
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        chunks.forEach((x) => c.enqueue(enc.encode(x)));
        c.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(body, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const got: LiveEvent[] = [];
    await askLive({ prompt: 'hola', lang: 'es', sources: ['web'] }, (e) => got.push(e));
    expect(got.map((e) => e.type)).toEqual(['token', 'token', 'done']);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ prompt: 'hola', lang: 'es', sources: ['web'] });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ errorCode: 'RateLimited', userMessage: 'slow' }), { status: 429, headers: { 'retry-after': '12' } })));
    const err = await askLive({ prompt: 'x', lang: 'en', sources: ['web'] }, () => {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LiveHttpError);
    expect(err).toMatchObject({ status: 429, code: 'RateLimited', retryAfter: 12 });
    const bad = await verifyAccessCode('nope');
    expect(bad).toBeInstanceOf(LiveHttpError);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, remainingToday: 42 }), { status: 200 })));
    expect(await verifyAccessCode(' code ')).toEqual({ ok: true, remainingToday: 42 });
  });
});
