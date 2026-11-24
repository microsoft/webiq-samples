// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { Endpoint, Lang, Scenario, Variant, WebIQCall } from '../data/types';
import { ENDPOINTS } from '../data/types';

/** Precios públicos en USD por 1.000 llamadas (consultados el 28-oct-2026). */
export const WEBIQ_PRICE_PER_1K: Record<Endpoint, number> = { web: 7, news: 7, images: 7, videos: 7, browse: 1, auto: 0 };
/** Grounding with Bing Search: USD por 1.000 transacciones (una por llamada a la herramienta). */
export const BING_PRICE_PER_1K = 14;
export const PRICES_CHECKED = '2026-10-28';

/** Lo que Grounding with Bing puede sustituir (búsqueda); el resto no tiene equivalente. */
export const BING_COVERS: Record<Endpoint, boolean> = { web: true, news: true, auto: true, images: false, videos: false, browse: false };

export const callPrice = (e: Endpoint): number => WEBIQ_PRICE_PER_1K[e] / 1000;

export function variantCalls(s: Scenario, v: Variant = 'webiq'): WebIQCall[] {
  return s.variants[v].steps.flatMap((st) => (st.kind === 'calls' ? st.calls : []));
}

export interface RunCost {
  calls: number;
  byEndpoint: Record<Endpoint, number>;
  webiq: number;
  bingTx: number;
  bing: number;
  /** Llamadas sin equivalente en Grounding with Bing. */
  uncovered: number;
  uncoveredEndpoints: Endpoint[];
}

export function runCost(s: Scenario): RunCost {
  const calls = variantCalls(s);
  const byEndpoint = Object.fromEntries(ENDPOINTS.map((e) => [e, 0])) as Record<Endpoint, number>;
  for (const c of calls) byEndpoint[c.endpoint] += 1;
  const webiq = calls.reduce((a, c) => a + callPrice(c.endpoint), 0);
  const bingTx = calls.filter((c) => BING_COVERS[c.endpoint]).length;
  const uncoveredCalls = calls.filter((c) => !BING_COVERS[c.endpoint]);
  return {
    calls: calls.length,
    byEndpoint,
    webiq,
    bingTx,
    bing: (bingTx * BING_PRICE_PER_1K) / 1000,
    uncovered: uncoveredCalls.length,
    uncoveredEndpoints: [...new Set(uncoveredCalls.map((c) => c.endpoint))],
  };
}

export interface MonthlyCost {
  runs: number;
  webiq: number;
  bing: number;
  diy: number;
  /** Bing para la parte de búsqueda + la alternativa para lo que Bing no cubre. */
  bingPlusDiy: number;
}

export function monthlyCost(s: Scenario, runs: number, diyMonthly: number): MonthlyCost {
  const rc = runCost(s);
  const bing = rc.bing * runs;
  return { runs, webiq: rc.webiq * runs, bing, diy: diyMonthly, bingPlusDiy: bing + (rc.uncovered > 0 ? diyMonthly : 0) };
}

const locale = (lang: Lang) => (lang === 'es' ? 'es-ES' : 'en-US');

export function fmtUSD(x: number, lang: Lang): string {
  const digits = x === 0 ? 0 : x < 0.01 ? 4 : x < 1 ? 3 : x < 100 ? 2 : 0;
  return new Intl.NumberFormat(locale(lang), {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(x);
}

export const fmtInt = (n: number, lang: Lang): string => new Intl.NumberFormat(locale(lang)).format(Math.round(n));

export function fmtMs(ms: number, lang: Lang): string {
  if (Math.round(ms) < 1000) return `${Math.round(ms)} ms`;
  return `${new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 1 }).format(ms / 1000)} s`;
}

/** «2s» → 2000 */
export function parseRetryAfter(v: string | undefined): number {
  const m = /^(\d+(?:\.\d+)?)\s*s$/.exec(v ?? '');
  return m ? Number(m[1]) * 1000 : 0;
}
