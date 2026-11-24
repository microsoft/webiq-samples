// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { Lang, Scenario, Source, SourceKind, WebIQCall } from '../data/types';
import { hostOf } from './format';

type Json = Record<string, unknown>;

/** traceId estable (32 hex) a partir del id de la llamada: la vista previa no cambia entre renders. */
export function traceIdFor(seed: string): string {
  let out = '';
  let h = 0x811c9dc5;
  for (let round = 0; out.length < 32; round++) {
    for (const ch of `${seed}#${round}`) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += h.toString(16).padStart(8, '0');
  }
  return out.slice(0, 32);
}

const byId = (s: Scenario, ids: string[]): Source[] => ids.map((id) => s.sources.find((x) => x.id === id)).filter((x): x is Source => !!x);

// Sin `domain`: la API solo lo devuelve a usuarios de China con redirección de URL.
const base = (x: Source): Json => ({ title: x.title, url: x.url });

const dates = (x: Source): Json => ({
  lastUpdatedAt: x.date,
  ...(x.crawledAt ? { crawledAt: x.crawledAt } : {}),
});

function webResult(x: Source): Json {
  return { ...base(x), content: x.excerpt, ...dates(x), language: x.language, isAdult: false };
}

function newsResult(x: Source): Json {
  return { ...base(x), content: x.excerpt, source: x.publisher, ...dates(x), language: x.language, isAdult: false };
}

function videoResult(x: Source, lang: Lang): Json {
  const v = x.video;
  return {
    ...base(x),
    description: x.excerpt,
    publishedBy: v?.publishedBy ?? x.publisher,
    viewCount: v?.views ?? 0,
    length: v?.length ?? '',
    lastUpdatedAt: x.date,
    bestMomentIndex: 0,
    moments: v ? [{ title: v.moment.title[lang], startTime: v.moment.start, endTime: v.moment.end }] : [],
    isAdult: false,
  };
}

function imageResult(x: Source, lang: Lang): Json {
  return {
    ...base(x),
    hostPageUrl: `https://${hostOf(x.url)}/`,
    caption: x.image?.caption[lang] ?? x.excerpt,
    width: x.image?.width ?? 0,
    height: x.image?.height ?? 0,
    lastUpdatedAt: x.date,
    isAdult: false,
  };
}

const AUTO_TYPE: Record<SourceKind, string> = {
  web: 'text',
  news: 'text',
  page: 'text',
  image: 'media/image',
  video: 'media/video',
  weather: 'structured/weather',
  timezone: 'structured/timeZone',
  doc: 'text',
};

const CONTENT_SOURCE: Record<SourceKind, string> = {
  web: 'web',
  news: 'news',
  page: 'web',
  image: 'images',
  video: 'videos',
  weather: 'weather',
  timezone: 'timezone',
  doc: 'web',
};

function autoEvidence(x: Source, lang: Lang, structuredNote: string): Json {
  let content: unknown = x.excerpt;
  if (x.kind === 'image') content = imageResult(x, lang);
  else if (x.kind === 'video') content = videoResult(x, lang);
  else if (x.kind === 'weather' || x.kind === 'timezone') content = { '…': structuredNote };
  return {
    evidence: { type: AUTO_TYPE[x.kind], content },
    citations: [{ contentSource: CONTENT_SOURCE[x.kind], title: x.title, url: x.url, ...dates(x), language: x.language, isAdult: false }],
  };
}

/**
 * Respuesta con la forma real de cada endpoint, rellenada con los datos ficticios del caso.
 * Se omiten campos opcionales que la demo no usa (querySignals, thumbnails…).
 */
export function responsePreview(s: Scenario, c: WebIQCall, lang: Lang, structuredNote: string): Json {
  const traceId = traceIdFor(`${s.id}:${c.id}`);
  if (c.status === 202) return { retryAfter: c.retryAfter ?? '2s', traceId };
  const items = byId(s, c.results);
  switch (c.endpoint) {
    case 'web':
      return { webResults: items.map(webResult), riskLevel: 'low', traceId };
    case 'news':
      return { newsResults: items.map(newsResult), traceId };
    case 'videos':
      return { videoResults: items.map((x) => videoResult(x, lang)), traceId };
    case 'images':
      return { imageResults: items.map((x) => imageResult(x, lang)), traceId };
    case 'browse': {
      const x = items[0];
      return x ? { url: x.url, title: x.title, content: x.excerpt, isAdult: false, ...dates(x), traceId } : { traceId };
    }
    case 'auto':
      return { results: items.map((x) => autoEvidence(x, lang, structuredNote)), traceId };
  }
}

/**
 * Mensaje final de la Responses API de Foundry con la herramienta bing_grounding:
 * el texto del modelo y anotaciones url_citation (forma documentada en «Expected output»).
 */
export function bingResponsePreview(text: string, citations: Source[]): Json {
  const annotations = citations.map((x, i) => {
    const marker = `[${i + 1}]`;
    const at = text.indexOf(marker);
    const start = at >= 0 ? at : text.length;
    return { type: 'url_citation', url: x.url, title: x.title, start_index: start, end_index: start + (at >= 0 ? marker.length : 0) };
  });
  return {
    id: `resp_${traceIdFor(text).slice(0, 12)}`,
    status: 'completed',
    output: [
      {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text, annotations }],
      },
    ],
  };
}
