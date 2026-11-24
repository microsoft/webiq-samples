// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ICON_NAMES } from '../components/Icon';
import { UI } from '../i18n';
import { contrastRatio, contrastText, ensureContrast, surfaceTokens } from '../lib/color';
import { monthlyCost, parseRetryAfter, runCost, variantCalls } from '../lib/cost';
import { clockSeconds } from '../lib/format';
import { fillPreset } from '../lib/live';
import { traceIdFor } from '../lib/response';
import { THEME_PRESETS, type ThemeColors } from '../lib/settings';
import { parseBingConfig } from '../lib/snippets';
import { buildTimeline } from '../lib/timeline';
import { CLIENT_IDS, CLIENTS } from './clients';
import { SCENARIOS, scenarioById } from './scenarios';
import { ENDPOINTS, VARIANTS, type Endpoint, type L, type Mark, type Scenario, type SourceKind, type Step, type Variant } from './types';
import * as WHY from './why';

/* ───────────── utilidades ───────────── */

const isL = (x: unknown): x is L => !!x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).sort().join(',') === 'en,es';

/** Todos los textos bilingües ({es, en}) de una estructura, con su ruta. */
function texts(x: unknown, path = '', out: [string, L][] = []): [string, L][] {
  if (isL(x)) out.push([path, x]);
  else if (Array.isArray(x)) x.forEach((v, i) => texts(v, `${path}[${i}]`, out));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) texts(v, path ? `${path}.${k}` : k, out);
  return out;
}

const markers = (t: string): number[] => [...t.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
const ascending = (a: number[]): number[] => [...a].sort((x, y) => x - y);
const occurrences = (t: string, s: string): number => t.split(s).length - 1;

/** Problemas de un texto bilingüe: vacíos, espacios, citas o negritas desparejadas y tipografía cruzada. */
function textProblems([path, x]: [string, L]): string[] {
  const p: string[] = [];
  for (const lang of ['es', 'en'] as const) {
    const t = x[lang];
    if (typeof t !== 'string' || !t.trim()) p.push(`${path}.${lang}: vacío`);
    else if (t !== t.trim() || / {2}/.test(t)) p.push(`${path}.${lang}: espacios sobrantes`);
  }
  if (p.length) return p;
  if (ascending(markers(x.es)).join() !== ascending(markers(x.en)).join()) p.push(`${path}: citas [n] distintas en es y en`);
  const bold = [occurrences(x.es, '**'), occurrences(x.en, '**')];
  if (bold[0] !== bold[1] || bold[0] % 2) p.push(`${path}: negritas (**) desparejadas`);
  if (/[«»¿¡]/.test(x.en)) p.push(`${path}.en: tipografía española en el texto en inglés`);
  if (/[“”]/.test(x.es)) p.push(`${path}.es: comillas inglesas en el texto en español`);
  if (x.es.includes('?') && !x.es.includes('¿')) p.push(`${path}.es: falta «¿»`);
  return p;
}

/** Números de cita de una estructura: [n] en sus textos y `cite` en los artefactos. */
function citeRefs(x: unknown, out: number[] = []): number[] {
  if (isL(x)) out.push(...markers(x.es));
  else if (Array.isArray(x)) x.forEach((v) => citeRefs(v, out));
  else if (x && typeof x === 'object') {
    for (const [k, v] of Object.entries(x)) {
      if (k === 'cite' && typeof v === 'number') out.push(v);
      else citeRefs(v, out);
    }
  }
  return out;
}

type AnswerStep = Extract<Step, { kind: 'answer' }>;
type BingStep = Extract<Step, { kind: 'bing' }>;
type KbStep = Extract<Step, { kind: 'kb' }>;
const answerOf = (s: Scenario, v: Variant): AnswerStep => s.variants[v].steps.find((st): st is AnswerStep => st.kind === 'answer')!;
const bingSteps = (s: Scenario): BingStep[] => s.variants.bing.steps.filter((st): st is BingStep => st.kind === 'bing');
const kbResults = (s: Scenario, v: Variant): string[] =>
  s.variants[v].steps.filter((st): st is KbStep => st.kind === 'kb').flatMap((st) => st.results);

/* ───────── validación de peticiones según la referencia REST de Web IQ ───────── */

const FIELDS: Record<Endpoint, string[]> = {
  web: ['query', 'maxResults', 'language', 'region', 'location', 'contentFormat', 'maxLength', 'safeSearch'],
  news: ['query', 'maxResults', 'language', 'region', 'location', 'contentFormat', 'maxLength'],
  videos: ['query', 'maxResults', 'language', 'region', 'enablePlaylist', 'freshness', 'embeddable', 'resolution', 'safeSearch', 'duration'],
  images: [
    'query', 'maxResults', 'language', 'region', 'aspectRatio', 'color', 'safeSearch', 'imageSize', 'watermarkFree',
    'maxHeight', 'minHeight', 'maxWidth', 'minWidth',
  ],
  browse: ['url', 'maxLength', 'liveCrawl', 'includeWebLinks', 'renderDynamicPages', 'includeImageLinks', 'language', 'region', 'contentFormat'],
  auto: ['query', 'language', 'region', 'mode', 'maxResponseLength', 'location', 'responseFilter'],
};
const MAX_RESULTS = { web: 50, news: 20, videos: 30, images: 30 };
const ENUMS: Record<string, string[]> = {
  safeSearch: ['off', 'strict'],
  liveCrawl: ['none', 'fallback', 'force'],
  aspectRatio: ['square', 'wide', 'tall'],
  color: ['colorOnly', 'monochrome'],
  imageSize: ['small', 'medium', 'large', 'extraLarge'],
  duration: ['short', 'medium', 'long'],
  resolution: ['360p', '480p', '720p', '1080p'],
  mode: ['fast', 'advanced'],
};
const BOOLEANS = ['includeWebLinks', 'renderDynamicPages', 'includeImageLinks', 'enablePlaylist', 'watermarkFree'];
const PIXELS = ['maxHeight', 'minHeight', 'maxWidth', 'minWidth'];
const AUTO_FILTERS = ['web', 'news', 'timezone', 'weather', 'images', 'videos'];
const WHEN = String.raw`(?:\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?|\.\.)`;
const FRESHNESS = new RegExp(String.raw`^(?:day|week|month|year|${WHEN}/${WHEN})$`);

const isInt = (v: unknown, min: number, max: number): boolean => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function requestProblems(endpoint: Endpoint, r: Record<string, unknown>): string[] {
  const p: string[] = [];
  for (const k of Object.keys(r)) if (!FIELDS[endpoint].includes(k)) p.push(`campo desconocido: ${k}`);
  if (endpoint === 'browse') {
    if (typeof r.url !== 'string' || !/^https:\/\/\S+$/.test(r.url)) p.push('url: https obligatoria');
  } else if (typeof r.query !== 'string' || !r.query.trim() || r.query.length > 1000) p.push('query: 1–1000 caracteres');
  if (endpoint !== 'browse' && endpoint !== 'auto' && 'maxResults' in r && !isInt(r.maxResults, 1, MAX_RESULTS[endpoint])) p.push('maxResults');
  if ('language' in r && !/^[a-z]{2}$/.test(String(r.language))) p.push('language');
  if ('region' in r && !/^[A-Z]{2}$/.test(String(r.region))) p.push('region');
  if ('location' in r && !/^lat:-?\d+(?:\.\d+)?;long:-?\d+(?:\.\d+)?$/.test(String(r.location))) p.push('location');
  if ('maxLength' in r && !isInt(r.maxLength, 1, 500_000)) p.push('maxLength');
  for (const [k, values] of Object.entries(ENUMS)) if (k in r && !values.includes(r[k] as string)) p.push(k);
  for (const k of BOOLEANS) if (k in r && typeof r[k] !== 'boolean') p.push(`${k}: booleano`);
  for (const k of PIXELS) if (k in r && !isInt(r[k], 1, 10_000)) p.push(k);
  if (endpoint === 'web' || endpoint === 'news') {
    // Sin acceso a documento completo solo hay pasajes (≤3.000 caracteres); la documentación pide fijar ambos campos.
    if (r.contentFormat !== 'passage') p.push('contentFormat: passage');
    if (!isInt(r.maxLength, 1, 3000)) p.push('maxLength: 1–3000 con passage');
  }
  if (endpoint === 'browse') {
    if ('contentFormat' in r && !['text', 'html', 'markdown'].includes(r.contentFormat as string)) p.push('contentFormat');
    if (r.renderDynamicPages && r.liveCrawl !== 'fallback') p.push('renderDynamicPages exige liveCrawl: fallback');
  }
  if ('freshness' in r && !FRESHNESS.test(String(r.freshness))) p.push('freshness');
  if ('embeddable' in r && JSON.stringify(r.embeddable) !== '["player"]') p.push('embeddable');
  if (endpoint === 'auto') {
    if ('maxResponseLength' in r && !isInt(r.maxResponseLength, 1500, 500_000)) p.push('maxResponseLength');
    const f = r.responseFilter;
    if (f !== undefined && (!Array.isArray(f) || !f.length || new Set(f).size !== f.length || f.some((x) => !AUTO_FILTERS.includes(x)))) {
      p.push('responseFilter');
    }
  }
  return p;
}

/** Parámetros de search_configurations de la herramienta bing_grounding. */
function bingConfigProblems(config: string): string[] {
  const c = parseBingConfig(config);
  const p: string[] = [];
  if (config.split('·').length !== Object.keys(c).length) p.push('formato «clave: valor · …»');
  for (const k of Object.keys(c)) if (!['count', 'market', 'set_lang', 'freshness'].includes(k)) p.push(`parámetro desconocido: ${k}`);
  if ('count' in c && !isInt(c.count, 1, 50)) p.push('count');
  if ('market' in c && !/^[a-z]{2}-[A-Z]{2}$/.test(String(c.market))) p.push('market');
  if ('set_lang' in c && !/^[a-z]{2}$/.test(String(c.set_lang))) p.push('set_lang');
  if ('freshness' in c && !/^(?:Day|Week|Month|\d{4}-\d{2}-\d{2}(?:\.\.\d{4}-\d{2}-\d{2})?)$/.test(String(c.freshness))) p.push('freshness');
  return p;
}

/** Tipos de fuente que puede devolver cada endpoint. */
const RESULT_KINDS: Record<Endpoint, SourceKind[]> = {
  web: ['web'],
  news: ['news'],
  images: ['image'],
  videos: ['video'],
  browse: ['page'],
  auto: ['weather', 'timezone', 'web', 'news'],
};
const MARKS: Mark[] = ['yes', 'partial', 'no'];
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
/** Las fuentes ficticias no pueden ser posteriores al día de la demo. */
const DEMO_END = Date.parse('2026-10-29T00:00:00+01:00');
const FICTITIOUS = /\((?:ficticio|fictitious|fittizio|fiktiv|fictício)\)$/;
/** Documentos sintéticos indexados en Foundry IQ (public/foundry/…). */
const DOC_URL = /^\/foundry\/[a-z0-9-]+\/\d{2}-[a-z0-9-]+\.md$/;
const SYNTHETIC = /\(sintético\)$/;

/* ───────────── tests ───────────── */

describe('textos', () => {
  it('cada texto de la interfaz existe en español e inglés', () => {
    expect(Object.values(UI).every(isL)).toBe(true);
    expect(texts(UI).flatMap(textProblems)).toEqual([]);
  });

  it('clientes, temas y «Por qué Web IQ» están completos en los dos idiomas', () => {
    expect(texts({ CLIENTS, THEME_PRESETS, WHY: { ...WHY } }).flatMap(textProblems)).toEqual([]);
  });
});

describe('catálogo', () => {
  it('6 casos numerados del 1 al 6, con ids únicos aptos para enlaces', () => {
    expect(SCENARIOS.map((s) => s.num)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
    for (const s of SCENARIOS) {
      expect(s.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(scenarioById(s.id)).toBe(s);
    }
    expect(scenarioById('no-existe')).toBeUndefined();
    expect(scenarioById(null)).toBeUndefined();
  });

  it('cada cliente principal protagoniza al menos un caso', () => {
    expect([...new Set(SCENARIOS.map((s) => s.primaryClient))].sort()).toEqual([...CLIENT_IDS].sort());
  });

  it('entre los casos se usan los 6 endpoints y los 4 tipos de artefacto', () => {
    expect(new Set(SCENARIOS.flatMap((s) => s.endpoints))).toEqual(new Set(ENDPOINTS));
    expect(new Set(SCENARIOS.map((s) => answerOf(s, 'webiq').artifact?.kind))).toEqual(new Set(['table', 'timeline', 'scorecard', 'cards']));
  });

  it('los ids de las fuentes son únicos en toda la demo', () => {
    const ids = SCENARIOS.flatMap((s) => s.sources.map((x) => x.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(SCENARIOS.map((s) => [s.id, s] as const))('caso %s', (_id, s) => {
  const sources = new Map(s.sources.map((x) => [x.id, x]));
  const calls = variantCalls(s, 'webiq');

  it('ficha completa: icono, cliente, encaje para cada cliente y textos bilingües', () => {
    expect(ICON_NAMES).toContain(s.icon);
    expect(CLIENT_IDS).toContain(s.primaryClient);
    expect(Object.keys(s.clientFit).sort()).toEqual([...CLIENT_IDS].sort());
    expect(s.takeaways.length).toBeGreaterThanOrEqual(2);
    expect(texts(s).flatMap(textProblems)).toEqual([]);
  });

  describe('fuentes', () => {
    it('ficticias con dominio .example, reales verificadas y documentos sintéticos publicados', () => {
      for (const src of s.sources) {
        expect(src.language, src.id).toMatch(/^[a-z]{2}$/);
        expect(src.title.trim(), src.id).not.toBe('');
        if (src.kind === 'doc') {
          // Documento interno de Foundry IQ: se sirve desde public/ y se marca como sintético.
          expect(src.url, src.id).toMatch(DOC_URL);
          expect(existsSync(`public${src.url}`), src.id).toBe(true);
          expect(src.publisher, src.id).toMatch(SYNTHETIC);
          expect(src.real, src.id).toBeUndefined();
          continue;
        }
        const url = new URL(src.url);
        expect(url.protocol, src.id).toBe('https:');
        if (src.real) {
          // Fuente pública real: dominio real, editor real y aviso en el caso.
          expect(url.hostname, src.id).not.toMatch(/\.example$/);
          expect(src.publisher, src.id).not.toMatch(FICTITIOUS);
          expect(s.dataNote, src.id).toBeDefined();
        } else {
          expect(url.hostname, src.id).toMatch(/\.example$/);
          expect(src.publisher, src.id).toMatch(FICTITIOUS);
        }
      }
    });

    it('como exigen los términos, ningún fragmento ni traducción pasa de 200 caracteres', () => {
      for (const src of s.sources) {
        expect(src.excerpt.trim(), src.id).not.toBe('');
        expect(src.excerpt.length, src.id).toBeLessThanOrEqual(200);
        for (const t of Object.values(src.tr ?? {})) expect(t.length, src.id).toBeLessThanOrEqual(200);
      }
    });

    it('cada fuente se traduce a los idiomas de la demo que no son el suyo', () => {
      for (const src of s.sources) {
        for (const lang of ['es', 'en'] as const) {
          if (src.language === lang) expect(src.tr?.[lang], `${src.id}: tr.${lang} sobra`).toBeUndefined();
          else expect(src.tr?.[lang]?.trim(), `${src.id}: falta tr.${lang}`).toBeTruthy();
        }
      }
    });

    it('fechas ISO con zona horaria y no posteriores a la demo; las páginas leídas tienen crawledAt', () => {
      for (const src of s.sources) {
        expect(src.date, src.id).toMatch(ISO);
        expect(Date.parse(src.date), src.id).toBeLessThan(DEMO_END);
        if (src.kind === 'page') expect(src.crawledAt, src.id).toBeDefined();
        if (src.crawledAt) {
          expect(src.crawledAt, src.id).toMatch(ISO);
          expect(Date.parse(src.crawledAt), src.id).toBeGreaterThanOrEqual(Date.parse(src.date));
          expect(Date.parse(src.crawledAt), src.id).toBeLessThan(DEMO_END);
        }
      }
    });

    it('vídeos e imágenes llevan sus metadatos y el momento clave cae dentro del vídeo', () => {
      for (const src of s.sources) {
        expect(!!src.video, src.id).toBe(src.kind === 'video');
        expect(!!src.image, src.id).toBe(src.kind === 'image');
        if (src.video) {
          const { start, end } = src.video.moment;
          expect(clockSeconds(start), src.id).toBeLessThan(clockSeconds(end));
          expect(clockSeconds(end), src.id).toBeLessThanOrEqual(clockSeconds(src.video.length));
          expect(src.video.views, src.id).toBeGreaterThan(0);
        }
        if (src.image) {
          expect(src.image.width, src.id).toBeGreaterThan(0);
          expect(src.image.height, src.id).toBeGreaterThan(0);
        }
      }
    });

    it('no hay fuentes huérfanas: todas las devuelve alguna llamada o la herramienta de Bing', () => {
      const used = new Set([
        ...calls.flatMap((c) => c.results),
        ...bingSteps(s).flatMap((b) => b.citations),
        ...VARIANTS.flatMap((v) => kbResults(s, v)),
      ]);
      for (const id of sources.keys()) expect(used.has(id), id).toBe(true);
    });
  });

  describe('variantes', () => {
    it('las dos parten de la misma pregunta y cada una tiene su forma', () => {
      const kinds = (v: Variant) => s.variants[v].steps.map((st) => st.kind);
      expect(s.variants.webiq.label).toEqual({ es: 'Con Web IQ', en: 'With Web IQ' });
      expect(s.variants.bing.label).toEqual({ es: 'Con Grounding with Bing', en: 'With Grounding with Bing' });
      expect(s.variants.webiq.steps[0].kind).toBe('user');
      expect(s.variants.bing.steps[0]).toEqual(s.variants.webiq.steps[0]);
      expect(kinds('webiq')).toContain('calls');
      expect(kinds('webiq')).not.toContain('bing');
      expect(kinds('webiq')).not.toContain('gap');
      expect(kinds('bing')).toContain('bing');
      expect(kinds('bing')).not.toContain('calls');
      expect(kinds('bing').filter((k) => k === 'gap').length).toBeGreaterThanOrEqual(2);
      for (const v of VARIANTS) {
        const ids = s.variants[v].steps.map((st) => st.id);
        expect(new Set(ids).size, v).toBe(ids.length);
        expect(kinds(v).filter((k) => k === 'answer'), v).toHaveLength(1);
      }
    });

    it.each(VARIANTS)('%s: cada cita [n] apunta a una fuente del caso y todas se usan en la respuesta', (v) => {
      const { citations, steps } = s.variants[v];
      expect(new Set(citations).size).toBe(citations.length);
      for (const id of citations) expect(sources.has(id), id).toBe(true);
      const all = citations.map((_, i) => i + 1);
      expect(ascending([...new Set(citeRefs(steps))])).toEqual(all);
      // El panel de evidencias marca como citadas las que aparecen en el texto de la respuesta.
      expect(ascending([...new Set(markers(answerOf(s, v).text.es))])).toEqual(all);
      for (const lang of ['es', 'en'] as const) {
        const first = [...new Set(markers(answerOf(s, v).text[lang]))];
        expect(first, `orden de las citas (${lang})`).toEqual(ascending(first));
      }
    });

    it('Web IQ solo cita fuentes que devolvió alguna de sus llamadas (o Foundry IQ)', () => {
      const returned = new Set([...calls.flatMap((c) => c.results), ...kbResults(s, 'webiq')]);
      for (const id of s.variants.webiq.citations) expect(returned.has(id), id).toBe(true);
    });

    it('Bing solo cita páginas web o noticias que devolvió su herramienta (o Foundry IQ)', () => {
      const fromBing = new Set(bingSteps(s).flatMap((b) => b.citations));
      for (const id of fromBing) expect(['web', 'news'], id).toContain(sources.get(id)?.kind);
      const returned = new Set([...fromBing, ...kbResults(s, 'bing')]);
      for (const id of s.variants.bing.citations) expect(returned.has(id), id).toBe(true);
    });
  });

  describe('llamadas a Web IQ', () => {
    it('ids únicos, endpoints declarados y resultados del tipo que devuelve cada endpoint', () => {
      const ids = calls.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(s.endpoints).size).toBe(s.endpoints.length);
      expect(new Set(calls.map((c) => c.endpoint))).toEqual(new Set(s.endpoints));
      for (const c of calls) {
        expect(c.latencyMs, c.id).toBeGreaterThan(0);
        expect(c.latencyMs, c.id).toBeLessThan(5000);
        for (const id of c.results) expect(RESULT_KINDS[c.endpoint], `${c.id} → ${id}`).toContain(sources.get(id)?.kind);
        if (c.returned !== undefined) expect(c.returned, c.id).toBeGreaterThanOrEqual(c.results.length);
        if (c.status !== 202) expect(c.results.length, c.id).toBeGreaterThan(0);
        if (c.endpoint === 'browse' && c.status !== 202) expect(c.results.map((id) => sources.get(id)?.url), c.id).toEqual([c.request.url]);
      }
    });

    it('cada petición es válida según la referencia REST', () => {
      for (const c of calls) expect(requestProblems(c.endpoint, c.request), c.id).toEqual([]);
    });

    it('un 202 de browse se reintenta, en la misma ronda, con la misma petición', () => {
      for (const st of s.variants.webiq.steps) {
        if (st.kind !== 'calls') continue;
        for (const c of st.calls) {
          if (c.status === 202) {
            expect(c.endpoint, c.id).toBe('browse');
            expect(c.results, c.id).toEqual([]);
            expect(parseRetryAfter(c.retryAfter), c.id).toBeGreaterThan(0);
            const retry = st.calls.find((x) => x.retryOf === c.id);
            expect(retry?.request, c.id).toEqual(c.request);
          }
          if (c.retryOf) expect(st.calls.find((x) => x.id === c.retryOf)?.status, c.id).toBe(202);
        }
      }
    });
  });

  it('la configuración de Grounding with Bing usa parámetros reales y coincide con la descripción', () => {
    const steps = bingSteps(s);
    expect(steps.length).toBeGreaterThan(0);
    for (const b of steps) {
      expect(bingConfigProblems(b.config), b.id).toEqual([]);
      expect(b.query.trim(), b.id).not.toBe('');
      const market = /market ([a-z]{2}-[A-Z]{2})/.exec(s.variants.bing.desc.en)?.[1];
      if (market) expect(parseBingConfig(b.config).market, b.id).toBe(market);
    }
  });

  it('el artefacto de la respuesta de Web IQ es coherente', () => {
    const a = answerOf(s, 'webiq').artifact;
    expect(a).toBeDefined();
    if (!a) return;
    switch (a.kind) {
      case 'table':
        for (const row of a.rows) expect(row).toHaveLength(a.columns.length);
        expect(a.rows.length).toBeGreaterThan(0);
        break;
      case 'timeline':
        expect(a.items.length).toBeGreaterThan(0);
        expect(a.actions.length).toBeGreaterThan(0);
        for (const h of a.heat) expect([0, 1, 2, 3]).toContain(h.level);
        for (const it of a.items) expect(it.time).toMatch(/^\d{2}:\d{2}$/);
        break;
      case 'scorecard':
        // El rastro auditable muestra el traceId de cada llamada, el mismo que su respuesta JSON.
        expect(a.trail.map((t) => t.endpoint)).toEqual(calls.map((c) => c.endpoint));
        expect(a.trail.map((t) => t.traceId)).toEqual(calls.map((c) => traceIdFor(`${s.id}:${c.id}`)));
        for (const t of a.trail) expect(t.at).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        break;
      case 'cards':
        for (const c of a.cards) {
          expect(ICON_NAMES).toContain(c.icon);
          if (c.media) {
            expect(['image', 'video'], c.media).toContain(sources.get(c.media)?.kind);
            expect(s.variants.webiq.citations, c.media).toContain(c.media);
          }
        }
        break;
    }
  });

  it('coste: la unidad refleja las llamadas reales y Web IQ cuesta menos que Bing más la alternativa', () => {
    const rc = runCost(s);
    expect(rc.calls).toBe(calls.length);
    const counts = (['es', 'en'] as const).map((lang) => /(\d+) (?:llamadas|calls)/.exec(s.cost.unit[lang])?.[1]);
    expect(counts[0]).toBe(counts[1]);
    if (counts[0]) expect(Number(counts[0])).toBe(rc.calls);
    expect(s.cost.runsPerMonth).toBeGreaterThan(0);
    expect(s.cost.diy.monthly).toBeGreaterThan(0);
    const m = monthlyCost(s, s.cost.runsPerMonth, s.cost.diy.monthly);
    expect(m.webiq).toBeLessThan(m.bingPlusDiy);
  });

  it('comparativa: Web IQ cubre cada necesidad y Bing se queda corto en al menos dos', () => {
    expect(s.compare.length).toBeGreaterThanOrEqual(4);
    for (const r of s.compare) for (const [m] of [r.webiq, r.bing, r.diy]) expect(MARKS).toContain(m);
    expect(s.compare.every((r) => r.webiq[0] === 'yes')).toBe(true);
    expect(s.compare.filter((r) => r.bing[0] === 'no').length).toBeGreaterThanOrEqual(2);
  });

  it('ejemplos en vivo: peticiones válidas, endpoints del caso y URLs reales', () => {
    expect(s.live.length).toBeGreaterThan(0);
    for (const p of s.live) {
      const body = fillPreset(p.body, 'Contoso');
      expect(requestProblems(p.endpoint, body), p.label.es).toEqual([]);
      expect(s.endpoints, p.label.es).toContain(p.endpoint);
      expect(JSON.stringify(body), p.label.es).not.toMatch(/\.example\b/);
    }
  });

  it.each(VARIANTS)('la reproducción %s es secuencial y dura menos de un minuto', (v) => {
    const tl = buildTimeline(s, v);
    expect(tl.steps.map((x) => x.step)).toEqual(s.variants[v].steps);
    for (let i = 1; i < tl.steps.length; i++) expect(tl.steps[i].start).toBeGreaterThanOrEqual(tl.steps[i - 1].end);
    expect(tl.calls).toHaveLength(variantCalls(s, v).length);
    for (const c of tl.calls) {
      const st = tl.steps.find((x) => x.step.id === c.stepId);
      expect(c.start).toBeGreaterThanOrEqual(st!.start);
      expect(c.end).toBeLessThanOrEqual(st!.end);
    }
    expect(tl.total).toBeLessThan(60_000);
  });

  it.runIf(!!s.foundry)('agente de Foundry: mismo prompt que el agente real y sus documentos en Foundry IQ', () => {
    const f = s.foundry!;
    const user = s.variants.webiq.steps[0];
    expect(user.kind === 'user' && user.text).toEqual(f.prompt);
    // El guion y el agente desplegado usan exactamente el mismo prompt de referencia.
    expect(readFileSync('foundry/run-agent.mjs', 'utf8')).toContain(`'${f.prompt.es}'`);
    expect(f.docs.length).toBeGreaterThan(0);
    for (const id of f.docs) expect(sources.get(id)?.kind, id).toBe('doc');
    for (const v of VARIANTS) {
      const kb = s.variants[v].steps.filter((st): st is KbStep => st.kind === 'kb');
      expect(kb, v).toHaveLength(1);
      expect(kb[0].knowledgeBase, v).toBe(f.knowledgeBase);
      expect(new Set(kb[0].results), v).toEqual(new Set(f.docs));
    }
    expect(s.sources.filter((x) => x.kind === 'doc').map((x) => x.id).sort()).toEqual([...f.docs].sort());
  });

  it('sin agente de Foundry no hay documentos internos ni pasos de Foundry IQ', () => {
    if (s.foundry) return;
    expect(s.sources.filter((x) => x.kind === 'doc')).toEqual([]);
    for (const v of VARIANTS) expect(kbResults(s, v), v).toEqual([]);
  });
});

describe('marca y accesibilidad', () => {
  const HEX = /^#[0-9A-Fa-f]{6}$/;
  const themes: [string, ThemeColors][] = [
    ...CLIENTS.map((c): [string, ThemeColors] => [`cliente ${c.id}`, c.brand]),
    ...THEME_PRESETS.map((p): [string, ThemeColors] => [`tema ${p.id}`, p.colors]),
  ];

  it('cada perfil sectorial tiene nombre bilingüe, monograma y colores válidos', () => {
    expect(CLIENTS.map((c) => c.id)).toEqual([...CLIENT_IDS, 'custom']);
    for (const c of CLIENTS) {
      expect(isL(c.name)).toBe(true);
      for (const name of Object.values(c.name)) expect(name.trim()).not.toBe('');
      expect(c.monogram.length).toBeLessThanOrEqual(3);
      for (const v of Object.values(c.brand)) expect(v, c.id).toMatch(HEX);
    }
  });

  it.each(themes)('%s: texto y acento legibles (WCAG AA ≥ 4.5:1)', (_name, c) => {
    for (const bg of [c.panel, c.sidebar, c.header, c.app]) {
      const tk = surfaceTokens(bg);
      for (const fg of [tk.text, tk.muted, tk.faint]) expect(contrastRatio(fg, bg), `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(contrastText(c.accent), c.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ensureContrast(c.accent, c.panel), c.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ensureContrast(c.accent, c.sidebar), c.sidebar)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('«Por qué Web IQ»', () => {
  it('la matriz de capacidades tiene una marca por enfoque y Web IQ es el último', () => {
    expect(WHY.APPROACHES).toHaveLength(3);
    expect(WHY.APPROACHES[2].en).toBe('Microsoft Web IQ');
    for (const c of WHY.CAPABILITIES) for (const m of c.marks) expect(MARKS).toContain(m);
  });

  it('los enlaces son https y de dominios oficiales de Microsoft', () => {
    for (const d of WHY.DOCS) {
      const u = new URL(d.url);
      expect(u.protocol, d.url).toBe('https:');
      expect(['learn.microsoft.com', 'www.microsoft.com', 'webiq.microsoft.ai'], d.url).toContain(u.hostname);
    }
  });
});
