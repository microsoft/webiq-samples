// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Caso 0 · En vivo: un LLM planifica las búsquedas, Web IQ consulta web, noticias, imágenes y vídeos
// en paralelo y el LLM redacta una respuesta con citas [n]. El progreso se transmite como NDJSON.
// Sin caché ni almacenamiento: los resultados solo viven mientras dura la petición.
import { createHash, timingSafeEqual } from 'node:crypto';

export const LIVE_SOURCES = ['web', 'news', 'images', 'videos'];
export const MAX_PROMPT = 500;
/** USD por 1.000 llamadas (precios públicos de Web IQ). */
const PRICE_PER_1K = { web: 7, news: 7, images: 7, videos: 7, browse: 1 };
/** Máximo de texto visible por fuente (requisitos de visualización de Web IQ). */
const SNIPPET = 200;
/** Cuántos resultados de cada tipo alimentan al modelo como fuentes numeradas. */
const GROUND_TOP = { web: 6, news: 5, videos: 5, browse: 1 };
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/i;
const FRESHNESS = new Set(['day', 'week', 'month', 'year']);

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const arr = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);
/** Solo URL https: el navegador las pinta como <img>, <a> o <iframe>. */
const https = (v) => (str(v) && /^https:\/\//i.test(v.trim()) ? v.trim() : undefined);
const clip = (s, n = SNIPPET) => {
  const t = str(s);
  return t && t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
};
const round = (ms) => Math.round(ms);

/** IP del cliente. Detrás de App Service, X-Forwarded-For llega como «ip:puerto». */
export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const first = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
    if (first) {
      if (first.startsWith('[')) return first.slice(1, first.indexOf(']'));
      const parts = first.split(':');
      return parts.length === 2 ? parts[0] : first;
    }
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

/** Límite por IP y minuto, tope diario global y peticiones simultáneas. */
export function createLimiter({ perMinute = 6, dailyLimit = 200, maxConcurrent = 4, now = Date.now } = {}) {
  const hits = new Map();
  let day = '';
  let used = 0;
  let active = 0;
  const rollDay = (t) => {
    const today = new Date(t).toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      used = 0;
    }
  };
  return {
    take(ip) {
      const t = now();
      rollDay(t);
      if (dailyLimit > 0 && used >= dailyLimit) {
        const midnight = Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth(), new Date(t).getUTCDate() + 1);
        return { ok: false, code: 'DailyLimit', retryAfter: Math.ceil((midnight - t) / 1000) };
      }
      if (active >= maxConcurrent) return { ok: false, code: 'Busy', retryAfter: 5 };
      const recent = (hits.get(ip) ?? []).filter((x) => t - x < 60_000);
      if (perMinute > 0 && recent.length >= perMinute) {
        hits.set(ip, recent);
        return { ok: false, code: 'RateLimited', retryAfter: Math.max(1, Math.ceil((60_000 - (t - recent[0])) / 1000)) };
      }
      recent.push(t);
      hits.set(ip, recent);
      if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < 60_000)) hits.delete(k);
      used += 1;
      active += 1;
      let released = false;
      return {
        ok: true,
        release() {
          if (!released) active -= 1;
          released = true;
        },
      };
    },
    remaining() {
      rollDay(now());
      return dailyLimit > 0 ? Math.max(0, dailyLimit - used) : null;
    },
  };
}

/** Código de acceso de la demo: comparación en tiempo constante y bloqueo tras varios fallos. */
export function createCodeGuard({ code, now = Date.now, maxFails = 10, windowMs = 10 * 60_000 } = {}) {
  const secret = str(code);
  const digest = (s) => createHash('sha256').update(String(s)).digest();
  const expected = secret ? digest(secret) : null;
  const fails = new Map();
  return {
    required: !!secret,
    /** 'ok' | 'missing' | 'bad' | 'locked' */
    check(ip, given) {
      if (!expected) return 'ok';
      const t = now();
      const recent = (fails.get(ip) ?? []).filter((x) => t - x < windowMs);
      if (recent.length >= maxFails) return 'locked';
      const value = str(given);
      if (!value) return 'missing';
      if (timingSafeEqual(digest(value), expected)) {
        fails.delete(ip);
        return 'ok';
      }
      recent.push(t);
      fails.set(ip, recent);
      if (fails.size > 5000) for (const [k, v] of fails) if (!v.some((x) => t - x < windowMs)) fails.delete(k);
      return 'bad';
    },
  };
}

/** Resultados de Web IQ → elementos para pintar (texto ≤200 caracteres) + texto completo para el modelo. */
export function normalizeLive(endpoint, data) {
  const d = data && typeof data === 'object' ? data : {};
  switch (endpoint) {
    case 'web':
      return arr(d.webResults).map((r) => ({
        title: str(r.title) ?? str(r.url) ?? '',
        url: str(r.url) ?? '',
        snippet: clip(r.content),
        date: str(r.lastUpdatedAt) ?? str(r.crawledAt),
        ground: str(r.content),
      }));
    case 'news':
      return arr(d.newsResults).map((r) => ({
        title: str(r.title) ?? str(r.url) ?? '',
        url: str(r.url) ?? '',
        snippet: clip(r.content),
        source: str(r.source),
        date: str(r.lastUpdatedAt) ?? str(r.crawledAt),
        thumbnailUrl: str(r.thumbnail?.url),
        ground: str(r.content),
      }));
    case 'images':
      return arr(d.imageResults)
        .filter((r) => r.isAdult !== true && (str(r.thumbnailUrl) || str(r.url)))
        .map((r) => ({
          title: str(r.title) ?? '',
          url: str(r.url) ?? '',
          hostPageUrl: str(r.hostPageUrl),
          thumbnailUrl: str(r.thumbnailUrl) ?? str(r.url),
          width: num(r.width),
          height: num(r.height),
        }));
    case 'videos':
      return arr(d.videoResults)
        .filter((r) => r.isAdult !== true)
        .map((r) => {
          const moments = arr(r.moments)
            .slice(0, 6)
            .map((m) => ({ title: clip(m.title, 80) ?? '', startTime: str(m.startTime), momentUrl: str(m.momentUrl) }));
          const groundParts = [
            str(r.publishedBy) && `Publisher: ${r.publishedBy}`,
            str(r.length) && `Length: ${r.length}`,
            num(r.viewCount) !== undefined && `Views: ${r.viewCount}`,
            str(r.lastUpdatedAt) && `Date: ${r.lastUpdatedAt}`,
            str(r.description) && `Description: ${r.description}`,
            str(r.summary) && `Summary: ${r.summary}`,
            moments.length ? `Key moments: ${moments.map((m) => `${m.title} (${m.startTime ?? '?'})`).join('; ')}` : undefined,
          ].filter(Boolean);
          return {
            title: str(r.title) ?? str(r.url) ?? '',
            url: str(r.url) ?? '',
            snippet: clip(str(r.description) ?? str(r.summary)),
            publishedBy: str(r.publishedBy),
            viewCount: num(r.viewCount),
            length: str(r.length),
            date: str(r.lastUpdatedAt),
            thumbnailUrl: str(r.thumbnailUrl),
            embeddingUrl: r.allowHttpsEmbedding === false ? undefined : https(r.embeddingUrl),
            moments,
            bestMomentIndex: num(r.bestMomentIndex),
            ground: groundParts.join('\n'),
          };
        });
    case 'browse':
      return str(d.url) || str(d.content)
        ? [{ title: str(d.title) ?? str(d.url) ?? '', url: str(d.url) ?? '', snippet: clip(d.content), ground: str(d.content) }]
        : [];
    default:
      return [];
  }
}

function defaultMarket(lang) {
  return lang === 'es' ? { language: 'es', region: 'ES' } : { language: 'en', region: 'US' };
}

function today(now) {
  const d = new Date(now());
  return `${d.toISOString().slice(0, 10)} (${d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })})`;
}

const PLAN_SYSTEM = (date, lang) => `You plan searches for Microsoft Web IQ, a web grounding API with separate web, news, images and videos verticals. Today is ${date}.
Reply with ONLY a JSON object:
{"web": string, "news": string, "images": string, "videos": string, "language": string, "region": string, "videoFreshness": "day"|"week"|"month"|"year"|null}
Rules:
- Each value is one concise search query (max 10 words) tuned for that vertical. Resolve relative dates ("latest", "this week", "next") into explicit terms when useful, e.g. add the year.
- "images": what the user would want to see (people, places, products, moments). "videos": highlights, trailers, reviews, recipes or tutorials.
- "language": ISO 639-1 lowercase, "region": ISO 3166-1 alpha-2 uppercase. Choose the market most relevant to the topic; default ${lang === 'es' ? '"es" / "ES"' : '"en" / "US"'}.
- "videoFreshness": only if the user asks for something recent (today → "day", this week → "week", this month → "month"); otherwise null.`;

const ANSWER_SYSTEM = (date, lang, extra) => `You are the live answer engine of a Microsoft Web IQ demo. Today is ${date}.
Answer the user in ${lang === 'es' ? 'Spanish (Spain)' : 'English'} using ONLY the numbered sources provided.
- Put a citation like [2] right after every factual sentence (you may combine up to 3, e.g. [1][4]; never list every source). Only use numbers that exist. Never cite images.
- Be concise and scannable: one short opening sentence with the direct answer, then 2–5 bullet points starting with "- ". Max ~170 words. Use **bold** for the key facts (names, results, dates, figures).
- When a video source is relevant, point to it (e.g. "highlights video [5]").
- If the sources are insufficient, outdated or contradictory, say so in one sentence. Never invent facts, links or dates.
- This is a single answer, not a chat: do not ask questions or offer further help at the end.${extra}`;

async function* lines(body) {
  const dec = new TextDecoder();
  let buf = '';
  for await (const chunk of body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) yield line;
    }
  }
  if (buf.trim()) yield buf.trim();
}

/**
 * opts: webiq ({mode, headers(), appId} | null), llm ({endpoint, model, headers()} | null), baseUrl, paths,
 * fetch, accessCode, trustProxy, perMinute, dailyLimit, maxConcurrent, callTimeoutMs, planTimeoutMs, llmTimeoutMs, now.
 */
export function createLive(options) {
  const o = {
    webiq: options.webiq ?? null,
    llm: options.llm ?? null,
    baseUrl: options.baseUrl,
    paths: options.paths,
    fetch: options.fetch ?? globalThis.fetch,
    trustProxy: !!options.trustProxy,
    callTimeoutMs: options.callTimeoutMs ?? 20_000,
    planTimeoutMs: options.planTimeoutMs ?? 10_000,
    llmTimeoutMs: options.llmTimeoutMs ?? 45_000,
    now: options.now ?? Date.now,
    log: options.log ?? (() => {}),
  };
  const limiter = createLimiter({
    perMinute: options.perMinute ?? 6,
    dailyLimit: options.dailyLimit ?? 200,
    maxConcurrent: options.maxConcurrent ?? 4,
    now: o.now,
  });
  const guard = createCodeGuard({ code: options.accessCode, now: o.now });

  async function chat(body, signal) {
    const headers = await o.llm.headers();
    return o.fetch(`${o.llm.endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: body.stream ? 'text/event-stream' : 'application/json', ...headers },
      body: JSON.stringify({ model: o.llm.model, reasoning_effort: 'none', ...body }),
      signal,
    });
  }

  async function plan(prompt, lang, signal) {
    const market = defaultMarket(lang);
    const url = prompt.match(URL_RE)?.[0]?.replace(/[).,;:!?]+$/, '');
    const base = prompt.replace(URL_RE, ' ').replace(/\s+/g, ' ').trim() || prompt;
    const fallback = { planner: 'fallback', ...market, queries: Object.fromEntries(LIVE_SOURCES.map((s) => [s, base])), browse: url };
    if (!o.llm) return fallback;
    try {
      const r = await chat(
        {
          messages: [
            { role: 'system', content: PLAN_SYSTEM(today(o.now), lang) },
            { role: 'user', content: prompt },
          ],
          max_completion_tokens: 300,
          response_format: { type: 'json_object' },
        },
        AbortSignal.any([signal, AbortSignal.timeout(o.planTimeoutMs)]),
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const p = JSON.parse(j.choices?.[0]?.message?.content ?? '{}');
      const q = (v) => (str(v) && v.length <= 200 ? v.trim() : base);
      return {
        planner: 'llm',
        language: /^[a-z]{2}$/.test(p.language ?? '') ? p.language : market.language,
        region: /^[A-Z]{2}$/.test(p.region ?? '') ? p.region : market.region,
        queries: { web: q(p.web), news: q(p.news), images: q(p.images), videos: q(p.videos) },
        freshness: FRESHNESS.has(p.videoFreshness) ? p.videoFreshness : undefined,
        browse: url,
      };
    } catch (e) {
      if (signal.aborted) throw e;
      return { ...fallback, plannerError: e instanceof Error ? e.message : String(e) };
    }
  }

  function requestFor(endpoint, p) {
    const m = { language: p.language, region: p.region };
    switch (endpoint) {
      case 'web':
        return { query: p.queries.web, maxResults: 8, ...m, contentFormat: 'passage', maxLength: 1500, safeSearch: 'strict' };
      case 'news':
        return { query: p.queries.news, maxResults: 6, ...m, contentFormat: 'passage', maxLength: 1200 };
      case 'images':
        return { query: p.queries.images, maxResults: 12, ...m, safeSearch: 'strict' };
      case 'videos':
        return { query: p.queries.videos, maxResults: 8, ...m, safeSearch: 'strict', ...(p.freshness ? { freshness: p.freshness } : {}) };
      case 'browse':
        return { url: p.browse, maxLength: 3000 };
    }
  }

  async function callWebiq(endpoint, body, signal) {
    const started = performance.now();
    let upstream;
    try {
      const headers = await o.webiq.headers();
      const qs = o.webiq.appId ? `?APPID=${encodeURIComponent(o.webiq.appId)}` : '';
      upstream = await o.fetch(`${o.baseUrl}${o.paths[endpoint]}${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.any([signal, AbortSignal.timeout(o.callTimeoutMs)]),
      });
    } catch (e) {
      if (signal.aborted) throw e;
      const timeout = e?.name === 'TimeoutError';
      return {
        status: timeout ? 504 : 502,
        latencyMs: round(performance.now() - started),
        error: { code: timeout ? 'UpstreamTimeout' : 'UpstreamError', message: e?.cause?.code ?? e?.message ?? 'network error' },
      };
    }
    const text = await upstream.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    const latencyMs = round(performance.now() - started);
    if (!upstream.ok) {
      return {
        status: upstream.status,
        latencyMs,
        traceId: str(data?.traceId),
        error: { code: str(data?.errorCode) ?? `HTTP ${upstream.status}`, message: clip(data?.userMessage ?? data?.message ?? text, 300) },
      };
    }
    return { status: upstream.status, latencyMs, traceId: str(data?.traceId), data };
  }

  async function run(prompt, lang, sources, res) {
    const ac = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) ac.abort();
    });
    const send = (ev) => {
      if (!res.writableEnded && !res.destroyed) res.write(`${JSON.stringify(ev)}\n`);
    };
    const t0 = performance.now();
    const at = () => round(performance.now() - t0);
    send({ type: 'start', sources, llm: !!o.llm, model: o.llm?.model ?? null, auth: o.webiq.mode });

    const p = await plan(prompt, lang, ac.signal);
    send({
      type: 'plan',
      at: at(),
      planner: p.planner,
      language: p.language,
      region: p.region,
      queries: Object.fromEntries(sources.map((s) => [s, p.queries[s]])),
      freshness: p.freshness,
      browse: p.browse,
      error: p.plannerError,
    });

    const endpoints = p.browse ? [...sources, 'browse'] : sources;
    const grounding = [];
    const calls = endpoints.map(async (endpoint) => {
      const request = requestFor(endpoint, p);
      send({ type: 'call', at: at(), endpoint, request });
      const r = await callWebiq(endpoint, request, ac.signal);
      const items = r.data ? normalizeLive(endpoint, r.data) : [];
      const top = GROUND_TOP[endpoint] ?? 0;
      const shown = items.map((it, i) => {
        const { ground, ...rest } = it;
        if (i < top && ground) {
          grounding.push({ n: grounding.length + 1, endpoint, title: it.title, url: it.url, date: it.date, publisher: it.source ?? it.publishedBy, text: ground });
          return { ...rest, ref: grounding.length };
        }
        return rest;
      });
      send({ type: 'result', at: at(), endpoint, status: r.status, latencyMs: r.latencyMs, traceId: r.traceId, count: shown.length, items: shown, error: r.error });
      return r;
    });
    const results = await Promise.all(calls);
    const okCalls = results.filter((r) => !r.error).length;
    const costUsd = endpoints.reduce((acc, e) => acc + PRICE_PER_1K[e] / 1000, 0);

    let answer = '';
    let usage;
    let answerMs;
    if (!grounding.length) {
      send({ type: 'answer-skipped', at: at(), reason: okCalls ? 'NoSources' : 'AllCallsFailed' });
    } else if (!o.llm) {
      send({ type: 'answer-skipped', at: at(), reason: 'NoLlm' });
    } else {
      const images = results[endpoints.indexOf('images')]?.data?.imageResults?.length ?? 0;
      const extra = images ? `\n- The page also shows ${images} images next to your answer; you may mention that, without citing them.` : '';
      const context = grounding
        .map((g) => `[${g.n}] (${g.endpoint}) ${g.title}\nURL: ${g.url}${g.publisher ? `\nPublisher: ${g.publisher}` : ''}${g.date && g.endpoint !== 'videos' ? `\nDate: ${g.date}` : ''}\n${g.text}`)
        .join('\n\n');
      const a0 = performance.now();
      send({ type: 'answer-start', at: at(), sources: grounding.length });
      try {
        const r = await chat(
          {
            messages: [
              { role: 'system', content: ANSWER_SYSTEM(today(o.now), lang, extra) },
              { role: 'user', content: `Question: ${prompt}\n\nSources:\n${context}` },
            ],
            max_completion_tokens: 900,
            stream: true,
            stream_options: { include_usage: true },
          },
          AbortSignal.any([ac.signal, AbortSignal.timeout(o.llmTimeoutMs)]),
        );
        if (!r.ok || !r.body) {
          const text = await r.text().catch(() => '');
          throw new Error(`HTTP ${r.status} ${clip(text, 160) ?? ''}`.trim());
        }
        for await (const line of lines(r.body)) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') break;
          let j;
          try {
            j = JSON.parse(payload);
          } catch {
            continue;
          }
          const delta = j.choices?.[0]?.delta?.content;
          if (delta) {
            answer += delta;
            send({ type: 'token', text: delta });
          }
          if (j.usage) usage = { prompt: j.usage.prompt_tokens, completion: j.usage.completion_tokens };
        }
        answerMs = round(performance.now() - a0);
        send({ type: 'answer-end', at: at(), latencyMs: answerMs, usage });
      } catch (e) {
        if (ac.signal.aborted) throw e;
        send({ type: 'error', at: at(), stage: 'answer', code: e?.name === 'TimeoutError' ? 'LlmTimeout' : 'LlmError', message: e instanceof Error ? e.message : String(e) });
      }
    }

    const valid = new Set(grounding.map((g) => g.n));
    const cited = [...new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))].filter((n) => valid.has(n));
    const totalMs = at();
    send({ type: 'done', at: totalMs, totalMs, calls: endpoints.length, okCalls, costUsd, cited, answerMs, remainingToday: limiter.remaining() });
    o.log(`[live] calls=${endpoints.length} ok=${okCalls} sources=${grounding.length} cited=${cited.length} ms=${totalMs}`);
  }

  return {
    needsCode: guard.required,
    remainingToday: () => limiter.remaining(),
    /** Comprueba el código de acceso; si falla responde y devuelve false. */
    authorize(req, res, fail) {
      const verdict = guard.check(clientIp(req, o.trustProxy), req.headers['x-demo-code']);
      if (verdict === 'ok') return true;
      if (verdict === 'locked') fail(res, 429, 'TooManyAttempts', 'Too many wrong access codes. Try again in a few minutes.', { 'retry-after': '600' });
      else fail(res, 401, verdict === 'missing' ? 'AccessCodeRequired' : 'InvalidAccessCode', 'A valid demo access code is required.');
      return false;
    },
    /** body ya validado como objeto JSON. */
    async ask(req, res, body, fail) {
      if (!o.webiq) return fail(res, 503, 'MissingApiKey', 'Web IQ credentials are not configured on the demo server.');
      const prompt = str(body.prompt);
      if (!prompt) return fail(res, 400, 'InvalidRequest', '"prompt" must be a non-empty string.');
      if (prompt.length > MAX_PROMPT) return fail(res, 400, 'InvalidRequest', `"prompt" must be at most ${MAX_PROMPT} characters.`);
      const lang = body.lang === 'en' ? 'en' : 'es';
      let sources = LIVE_SOURCES;
      if (body.sources !== undefined) {
        if (!Array.isArray(body.sources) || body.sources.some((s) => !LIVE_SOURCES.includes(s))) {
          return fail(res, 400, 'InvalidRequest', `"sources" must be a subset of ${LIVE_SOURCES.join(', ')}.`);
        }
        sources = LIVE_SOURCES.filter((s) => body.sources.includes(s));
        if (!sources.length && !URL_RE.test(prompt)) return fail(res, 400, 'InvalidRequest', 'Select at least one source.');
      }
      const slot = limiter.take(clientIp(req, o.trustProxy));
      if (!slot.ok) {
        const msg = {
          DailyLimit: 'The live demo reached its daily limit of queries.',
          Busy: 'The live demo is busy. Try again in a few seconds.',
          RateLimited: 'Too many live queries. Wait a moment and try again.',
        }[slot.code];
        return fail(res, 429, slot.code, msg, { 'retry-after': String(slot.retryAfter) });
      }
      res.writeHead(200, {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-store, no-transform',
        'x-accel-buffering': 'no',
        'x-content-type-options': 'nosniff',
      });
      res.flushHeaders?.();
      try {
        await run(prompt, lang, sources, res);
      } catch (e) {
        if (!(e?.name === 'AbortError' || res.destroyed)) {
          res.write(`${JSON.stringify({ type: 'error', stage: 'server', code: 'InternalError', message: e instanceof Error ? e.message : 'Unexpected error.' })}\n`);
        }
      } finally {
        slot.release();
        if (!res.writableEnded) res.end();
      }
    },
  };
}
