// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { Endpoint, L, Scenario, Source, Step, Variant, WebIQCall } from '../data/types';
import { BING_PRICE_PER_1K, callPrice, parseRetryAfter } from './cost';

export interface TimedStep {
  step: Step;
  start: number;
  end: number;
}

export interface TimedCall {
  call: WebIQCall;
  stepId: string;
  start: number;
  end: number;
}

export interface Timeline {
  steps: TimedStep[];
  calls: TimedCall[];
  total: number;
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
/** La duración no depende del idioma: así los enlaces con ?t= son estables. */
const textLen = (t: L) => Math.max(t.es.length, t.en.length);

export const LEAD_IN = 300;
const GAP = 250;
const RETRY_WAIT = 1200;

/** Tiempo de pantalla de una llamada: la latencia real se amplifica para que se vea. */
export const callDisplayMs = (c: WebIQCall): number => Math.min(3600, 700 + c.latencyMs * 1.2);
export const typingMs = (t: L, perChar: number, min: number, max: number): number => clamp(textLen(t) * perChar, min, max);
export const answerTypingMs = (t: L): number => typingMs(t, 12, 1500, 4500);

export function stepDuration(step: Step): number {
  switch (step.kind) {
    case 'user':
      return 1200;
    case 'plan':
    case 'reason':
      return typingMs(step.text, 22, 900, 2600);
    case 'bing':
      return 3200;
    case 'kb':
      return 2200;
    case 'gap':
      return 1100;
    case 'answer':
      return answerTypingMs(step.text) + (step.artifact ? 900 : 0);
    case 'calls':
      return 0;
  }
}

export function buildTimeline(s: Scenario, v: Variant): Timeline {
  let t = LEAD_IN;
  const steps: TimedStep[] = [];
  const calls: TimedCall[] = [];
  for (const step of s.variants[v].steps) {
    if (step.kind === 'calls') {
      const ends = new Map<string, number>();
      let end = t;
      for (const c of step.calls) {
        const start = c.retryOf ? (ends.get(c.retryOf) ?? t) + RETRY_WAIT : t;
        const e = start + callDisplayMs(c);
        ends.set(c.id, e);
        calls.push({ call: c, stepId: step.id, start, end: e });
        end = Math.max(end, e);
      }
      steps.push({ step, start: t, end: end + 200 });
      t = end + 200 + GAP;
    } else {
      const d = stepDuration(step);
      steps.push({ step, start: t, end: t + d });
      t += d + GAP;
    }
  }
  return { steps, calls, total: t };
}

export const progress = (start: number, end: number, t: number): number => (end <= start ? (t >= end ? 1 : 0) : clamp((t - start) / (end - start), 0, 1));

export interface Metrics {
  calls: number;
  inflight: number;
  sources: number;
  dated: number;
  passages: number;
  apiMs: number;
  cost: number;
  byEndpoint: Partial<Record<Endpoint, number>>;
  /** Variante Bing */
  bingTx: number;
  citations: number;
}

/** Latencia de la API en paralelo: por cada lote, la cadena más lenta (incluida la espera de un 202). */
function chainMs(c: WebIQCall, all: WebIQCall[]): number {
  if (!c.retryOf) return c.latencyMs;
  const prev = all.find((x) => x.id === c.retryOf);
  return (prev ? chainMs(prev, all) + parseRetryAfter(prev.retryAfter) : 0) + c.latencyMs;
}

export function metricsAt(tl: Timeline, sources: Source[], t: number): Metrics {
  const done = tl.calls.filter((c) => c.end <= t);
  const inflight = tl.calls.filter((c) => c.start <= t && c.end > t).length;
  const ids = new Set(done.flatMap((c) => c.call.results));
  const found = sources.filter((s) => ids.has(s.id));
  const byEndpoint: Partial<Record<Endpoint, number>> = {};
  for (const c of done) byEndpoint[c.call.endpoint] = (byEndpoint[c.call.endpoint] ?? 0) + 1;
  let apiMs = 0;
  for (const st of tl.steps) {
    if (st.step.kind !== 'calls') continue;
    const all = st.step.calls;
    const finished = done.filter((c) => c.stepId === st.step.id).map((c) => chainMs(c.call, all));
    if (finished.length) apiMs += Math.max(...finished);
  }
  const bingSteps = tl.steps.filter((st) => st.step.kind === 'bing' && st.end <= t);
  const citations = new Set(bingSteps.flatMap((st) => (st.step.kind === 'bing' ? st.step.citations : [])));
  return {
    calls: done.length,
    inflight,
    sources: found.length,
    dated: found.filter((s) => !!s.date).length,
    passages: found.filter((s) => s.kind !== 'image').length,
    apiMs,
    cost: done.reduce((a, c) => a + callPrice(c.call.endpoint), 0) + (bingSteps.length * BING_PRICE_PER_1K) / 1000,
    byEndpoint,
    bingTx: bingSteps.length,
    citations: citations.size,
  };
}

/** Citas [n] visibles en un instante: las de los pasos de respuesta ya empezados (el número no depende del idioma). */
export function citedAt(tl: Timeline, t: number): Set<number> {
  const out = new Set<number>();
  for (const st of tl.steps) {
    if (st.step.kind !== 'answer' || t < st.start) continue;
    for (const m of st.step.text.es.matchAll(/\[(\d+)\]/g)) out.add(Number(m[1]));
  }
  return out;
}
