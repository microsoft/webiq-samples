// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { Endpoint, Lang, SourceKind } from '../data/types';
import { ENDPOINTS } from '../data/types';
import { hostOf } from './format';
import { readStored, writeStored } from './storage';

export interface LiveStatus {
  ok: boolean;
  hasKey: boolean;
  /** Cómo se autentica el servidor ante Web IQ: clave o token de Entra. */
  auth: 'key' | 'entra' | null;
  /** Hay modelo para planificar y redactar la respuesta del caso 0. */
  llm: boolean;
  model: string | null;
  /** El servidor pide código de acceso (demo publicada). */
  needsCode: boolean;
  endpoints: Endpoint[];
  /** Caso 6: el servidor puede ejecutar el agente de Foundry. */
  foundry: boolean;
  foundryAgent: string | null;
}

export interface LiveResponse {
  status: number;
  latencyMs: number;
  data: unknown;
}

/** null si el servidor local no responde (demo servida sin `npm run live`). */
export async function getStatus(timeoutMs = 2500): Promise<LiveStatus | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('/api/status', { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const j = (await res.json()) as Partial<LiveStatus>;
    if (j.ok !== true) return null;
    return {
      ok: true,
      hasKey: !!j.hasKey,
      auth: j.auth === 'key' || j.auth === 'entra' ? j.auth : null,
      llm: !!j.llm,
      model: typeof j.model === 'string' && j.model ? j.model : null,
      needsCode: !!j.needsCode,
      endpoints: (j.endpoints ?? []).filter((e): e is Endpoint => ENDPOINTS.includes(e as Endpoint)),
      foundry: !!j.foundry,
      foundryAgent: typeof j.foundryAgent === 'string' && j.foundryAgent ? j.foundryAgent : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function callLive(endpoint: Endpoint, body: unknown): Promise<LiveResponse> {
  const res = await fetch(`/api/webiq/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...codeHeader() },
    body: JSON.stringify(body),
  });
  let j: unknown = null;
  try {
    j = await res.json();
  } catch {
    /* respuesta sin JSON */
  }
  const o = (j ?? {}) as Partial<LiveResponse> & { error?: string };
  if (typeof o.status === 'number' && 'data' in o) return { status: o.status, latencyMs: Number(o.latencyMs) || 0, data: o.data };
  return { status: res.status, latencyMs: 0, data: j ?? { error: res.statusText } };
}

/** Sustituye «{client}» en todos los textos del cuerpo de un ejemplo. */
export function fillPreset<T>(body: T, client: string): T {
  if (typeof body === 'string') return body.split('{client}').join(client) as T;
  if (Array.isArray(body)) return body.map((x) => fillPreset(x, client)) as T;
  if (body && typeof body === 'object') return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, fillPreset(v, client)])) as T;
  return body;
}

export interface LiveItem {
  kind: SourceKind;
  title: string;
  url: string;
  publisher: string;
  date?: string;
  crawledAt?: string;
  language?: string;
  content?: string;
  /** Detalle propio del tipo: duración de un vídeo, tamaño de una imagen, tipo de evidencia… */
  extra?: string;
}

type R = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
const arr = (v: unknown): R[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as R[]) : []);

function item(kind: SourceKind, r: R, over: Partial<LiveItem> = {}): LiveItem {
  const url = str(r.url) ?? '';
  return {
    kind,
    title: str(r.title) ?? url,
    url,
    publisher: str(r.domain) ?? (url ? hostOf(url) : ''),
    date: str(r.lastUpdatedAt),
    crawledAt: str(r.crawledAt),
    language: str(r.language),
    content: str(r.content),
    ...over,
  };
}

const EVIDENCE_KIND: Record<string, SourceKind> = {
  'media/image': 'image',
  'media/video': 'video',
  'structured/weather': 'weather',
  'structured/timeZone': 'timezone',
};

/** Convierte la respuesta de cualquier endpoint en una lista homogénea para pintarla. */
export function normalizeResults(endpoint: Endpoint, data: unknown): LiveItem[] {
  const d = (data && typeof data === 'object' ? data : {}) as R;
  switch (endpoint) {
    case 'web':
      return arr(d.webResults).map((r) => item('web', r));
    case 'news':
      return arr(d.newsResults).map((r) => item('news', r, { publisher: str(r.source) ?? str(r.domain) ?? hostOf(str(r.url) ?? '') }));
    case 'videos':
      return arr(d.videoResults).map((r) =>
        item('video', r, {
          content: str(r.description) ?? str(r.summary),
          publisher: str(r.publishedBy) ?? str(r.domain) ?? '',
          extra: [str(r.length), typeof r.viewCount === 'number' ? `${r.viewCount} views` : undefined].filter(Boolean).join(' · ') || undefined,
        }),
      );
    case 'images':
      return arr(d.imageResults).map((r) =>
        item('image', r, {
          url: str(r.hostPageUrl) ?? str(r.url) ?? '',
          // `url` es el fichero de la imagen (a menudo un CDN): el medio es la página que la publica.
          publisher: str(r.domain) ?? hostOf(str(r.hostPageUrl) ?? str(r.url) ?? ''),
          content: str(r.caption),
          extra: typeof r.width === 'number' && typeof r.height === 'number' ? `${r.width}×${r.height}` : undefined,
        }),
      );
    case 'browse':
      return str(d.url) || str(d.content) ? [item('page', d)] : [];
    case 'auto':
      return arr(d.results).map((r) => {
        const ev = (r.evidence ?? {}) as R;
        const cite = arr(r.citations)[0] ?? {};
        const type = str(ev.type) ?? 'text';
        const source = str(cite.contentSource);
        const kind: SourceKind = EVIDENCE_KIND[type] ?? (source === 'news' ? 'news' : 'web');
        const content = typeof ev.content === 'string' ? ev.content : ev.content ? JSON.stringify(ev.content) : undefined;
        return item(kind, cite, { content, extra: type });
      });
  }
}

/* ============================================================
   Caso 0 · consulta libre en vivo (POST /api/live/ask, NDJSON)
   ============================================================ */

export type LiveSource = 'web' | 'news' | 'images' | 'videos';
export type LiveEndpoint = LiveSource | 'browse';
export const LIVE_SOURCES: LiveSource[] = ['web', 'news', 'images', 'videos'];
export const LIVE_MAX_PROMPT = 500;

const CODE_KEY = 'webiq-demo-live-code';
export const getAccessCode = (): string => readStored(CODE_KEY) ?? '';
export const setAccessCode = (code: string): boolean => writeStored(CODE_KEY, code.trim());
export function codeHeader(): Record<string, string> {
  const c = getAccessCode();
  return c ? { 'x-demo-code': c } : {};
}

/** Los resultados vienen de la web: solo se enlazan o se pintan URL http(s). */
export const safeUrl = (u: string | undefined): string | undefined => (u && /^https?:\/\//i.test(u) ? u : undefined);

export interface LiveTextItem {
  title: string;
  url: string;
  snippet?: string;
  date?: string;
  /** Número [n] con el que la respuesta puede citarla. */
  ref?: number;
  /** news: medio. */
  source?: string;
  thumbnailUrl?: string;
}

export interface LiveImageItem {
  title: string;
  url: string;
  hostPageUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

export interface LiveMoment {
  title: string;
  startTime?: string;
  momentUrl?: string;
}

export interface LiveVideoItem extends LiveTextItem {
  publishedBy?: string;
  viewCount?: number;
  length?: string;
  embeddingUrl?: string;
  moments?: LiveMoment[];
  bestMomentIndex?: number;
}

export type LiveAnyItem = LiveTextItem | LiveImageItem | LiveVideoItem;

export interface LivePlan {
  at: number;
  planner: 'llm' | 'fallback';
  language: string;
  region: string;
  queries: Partial<Record<LiveSource, string>>;
  freshness?: string;
  browse?: string;
  error?: string;
}

export interface LiveCall {
  endpoint: LiveEndpoint;
  at: number;
  request: Record<string, unknown>;
  result?: {
    at: number;
    status: number;
    latencyMs: number;
    traceId?: string;
    count: number;
    items: LiveAnyItem[];
    error?: { code: string; message?: string };
  };
}

export interface LiveDone {
  totalMs: number;
  calls: number;
  okCalls: number;
  costUsd: number;
  cited: number[];
  answerMs?: number;
  remainingToday: number | null;
}

export type LiveEvent =
  | { type: 'start'; sources: LiveSource[]; llm: boolean; model: string | null; auth: string | null }
  | ({ type: 'plan' } & LivePlan)
  | { type: 'call'; at: number; endpoint: LiveEndpoint; request: Record<string, unknown> }
  | ({ type: 'result'; endpoint: LiveEndpoint } & NonNullable<LiveCall['result']>)
  | { type: 'answer-start'; at: number; sources: number }
  | { type: 'token'; text: string }
  | { type: 'answer-end'; at: number; latencyMs: number; usage?: { prompt?: number; completion?: number } }
  | { type: 'answer-skipped'; at: number; reason: 'NoSources' | 'AllCallsFailed' | 'NoLlm' }
  | { type: 'error'; at?: number; stage: string; code: string; message?: string }
  | ({ type: 'done'; at: number } & LiveDone);

export type AnswerState = 'waiting' | 'streaming' | 'done' | 'skipped' | 'error';

export interface LiveRun {
  prompt: string;
  lang: Lang;
  sources: LiveSource[];
  status: 'running' | 'done' | 'error' | 'aborted';
  model: string | null;
  plan?: LivePlan;
  calls: Partial<Record<LiveEndpoint, LiveCall>>;
  /** Orden de llegada de las llamadas (para pintar la línea de tiempo). */
  order: LiveEndpoint[];
  answer: string;
  answerState: AnswerState;
  answerAt?: number;
  answerMs?: number;
  usage?: { prompt?: number; completion?: number };
  skipReason?: string;
  error?: { stage: string; code: string; message?: string };
  done?: LiveDone;
}

export const newRun = (prompt: string, lang: Lang, sources: LiveSource[]): LiveRun => ({
  prompt,
  lang,
  sources,
  status: 'running',
  model: null,
  calls: {},
  order: [],
  answer: '',
  answerState: 'waiting',
});

/** Aplica un evento NDJSON al estado de la ejecución (puro: devuelve un objeto nuevo). */
export function applyLiveEvent(run: LiveRun, ev: LiveEvent): LiveRun {
  switch (ev.type) {
    case 'start':
      return { ...run, model: ev.model, sources: ev.sources };
    case 'plan': {
      const { type: _t, ...plan } = ev;
      return { ...run, plan };
    }
    case 'call':
      return {
        ...run,
        calls: { ...run.calls, [ev.endpoint]: { endpoint: ev.endpoint, at: ev.at, request: ev.request } },
        order: run.order.includes(ev.endpoint) ? run.order : [...run.order, ev.endpoint],
      };
    case 'result': {
      const { type: _t, endpoint, ...result } = ev;
      const prev = run.calls[endpoint] ?? { endpoint, at: result.at, request: {} };
      return {
        ...run,
        calls: { ...run.calls, [endpoint]: { ...prev, result: { ...result, items: Array.isArray(result.items) ? result.items : [] } } },
        order: run.order.includes(endpoint) ? run.order : [...run.order, endpoint],
      };
    }
    case 'answer-start':
      return { ...run, answerState: 'streaming', answerAt: ev.at };
    case 'token':
      return { ...run, answerState: 'streaming', answer: run.answer + (ev.text ?? '') };
    case 'answer-end':
      return { ...run, answerState: 'done', answerMs: ev.latencyMs, usage: ev.usage };
    case 'answer-skipped':
      return { ...run, answerState: 'skipped', skipReason: ev.reason };
    case 'error':
      return {
        ...run,
        error: { stage: ev.stage, code: ev.code, message: ev.message },
        answerState: ev.stage === 'answer' || run.answerState === 'waiting' ? 'error' : run.answerState,
        status: ev.stage === 'answer' ? run.status : 'error',
      };
    case 'done': {
      const { type: _t, at: _a, ...done } = ev;
      return { ...run, status: run.status === 'running' ? 'done' : run.status, done };
    }
    default:
      return run;
  }
}

/** Fuentes citables [n] → elemento y endpoint de origen. */
export function liveRefs(run: Pick<LiveRun, 'calls' | 'order'>): Map<number, { endpoint: LiveEndpoint; item: LiveTextItem }> {
  const out = new Map<number, { endpoint: LiveEndpoint; item: LiveTextItem }>();
  for (const e of run.order) {
    for (const it of run.calls[e]?.result?.items ?? []) {
      const ref = (it as LiveTextItem).ref;
      if (typeof ref === 'number') out.set(ref, { endpoint: e, item: it as LiveTextItem });
    }
  }
  return out;
}

/** Números [n] que aparecen en la respuesta, en orden de primera aparición. */
export function citedInText(text: string): number[] {
  const seen: number[] = [];
  for (const m of text.matchAll(/\[(\d+)\]/g)) {
    const n = Number(m[1]);
    if (!seen.includes(n)) seen.push(n);
  }
  return seen;
}

/** Trocea un flujo NDJSON que llega en pedazos arbitrarios. */
export function lineSplitter() {
  let buf = '';
  return {
    push(chunk: string): string[] {
      buf += chunk;
      const parts = buf.split('\n');
      buf = parts.pop() ?? '';
      return parts.map((l) => l.trim()).filter(Boolean);
    },
    flush(): string[] {
      const rest = buf.trim();
      buf = '';
      return rest ? [rest] : [];
    },
  };
}

export class LiveHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'LiveHttpError';
  }
}

export async function httpError(res: Response): Promise<LiveHttpError> {
  let j: { errorCode?: string; userMessage?: string } = {};
  try {
    j = (await res.json()) as typeof j;
  } catch {
    /* sin JSON */
  }
  const ra = Number(res.headers.get('retry-after'));
  return new LiveHttpError(res.status, j.errorCode ?? `HTTP ${res.status}`, j.userMessage ?? res.statusText, Number.isFinite(ra) && ra > 0 ? ra : undefined);
}

/** Comprueba un código de acceso sin gastar consultas. */
export async function verifyAccessCode(code: string): Promise<{ ok: true; remainingToday: number | null } | LiveHttpError> {
  const res = await fetch('/api/live/verify', { headers: { accept: 'application/json', 'x-demo-code': code.trim() } });
  if (!res.ok) return httpError(res);
  const j = (await res.json()) as { remainingToday?: number | null };
  return { ok: true, remainingToday: typeof j.remainingToday === 'number' ? j.remainingToday : null };
}

/** Lanza la consulta y entrega cada evento según llega. Lanza LiveHttpError si el servidor la rechaza. */
export async function askLive(
  input: { prompt: string; lang: Lang; sources: LiveSource[] },
  onEvent: (ev: LiveEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/live/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/x-ndjson', ...codeHeader() },
    body: JSON.stringify(input),
    signal,
  });
  if (!res.ok) throw await httpError(res);
  if (!res.body) throw new LiveHttpError(502, 'NoStream', 'The server returned no stream.');
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  const split = lineSplitter();
  const emit = (line: string) => {
    let ev: LiveEvent;
    try {
      ev = JSON.parse(line) as LiveEvent;
    } catch {
      return; // línea ilegible: se ignora
    }
    onEvent(ev);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    split.push(value).forEach(emit);
  }
  split.flush().forEach(emit);
}
