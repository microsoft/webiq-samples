// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Caso 6: cliente del agente real de Foundry (/api/foundry/ask) y lectura segura de su respuesta en markdown.
import { hostOf } from './format';
import { codeHeader, httpError, LiveHttpError, lineSplitter } from './live';

export const MAX_AGENT_PROMPT = 2000;

export interface FoundrySource {
  title: string;
  url?: string;
  section?: string;
  publisher?: string;
  date?: string;
}

export interface FoundryTool {
  id: string;
  server?: string;
  name?: string;
  queries: string[];
  status: 'calling' | 'completed' | 'failed';
  error?: string;
  count: number | null;
  sources: FoundrySource[];
  startAt: number;
  endAt?: number;
}

export interface FoundryDone {
  at: number;
  firstTextMs: number | null;
  tools: number;
  failedTools: number;
  inputTokens: number | null;
  outputTokens: number | null;
  incomplete?: string | boolean;
  remainingToday?: number | null;
}

export type FoundryEvent =
  | { type: 'start'; at: number; agent: string }
  | { type: 'meta'; at: number; model: string | null }
  | {
      type: 'tool';
      id: string;
      at: number;
      server?: string;
      name?: string;
      queries?: string[];
      status?: 'calling' | 'completed' | 'failed';
      error?: string;
      count?: number | null;
      sources?: FoundrySource[];
    }
  | { type: 'retry'; at: number; attempt: number; code: string; message: string }
  | { type: 'token'; text: string }
  | ({ type: 'done' } & FoundryDone)
  | { type: 'error'; code: string; message: string; at?: number };

export interface FoundryRun {
  prompt: string;
  status: 'running' | 'done' | 'error' | 'aborted';
  agent: string | null;
  model: string | null;
  tools: FoundryTool[];
  text: string;
  /** Reintentos automáticos del servidor (un fallo de herramienta antes del primer token). */
  retries: number;
  done?: FoundryDone;
  error?: { code: string; message: string };
  at: number;
}

export const newFoundryRun = (prompt: string): FoundryRun => ({ prompt, status: 'running', agent: null, model: null, tools: [], text: '', retries: 0, at: 0 });

export function applyFoundryEvent(run: FoundryRun, ev: FoundryEvent): FoundryRun {
  const at = 'at' in ev && typeof ev.at === 'number' ? Math.max(run.at, ev.at) : run.at;
  switch (ev.type) {
    case 'start':
      return { ...run, agent: ev.agent ?? run.agent, at };
    case 'meta':
      return { ...run, model: ev.model ?? run.model, at };
    case 'tool': {
      const i = run.tools.findIndex((x) => x.id === ev.id);
      const cur: FoundryTool = i >= 0 ? run.tools[i] : { id: ev.id, queries: [], status: 'calling', count: null, sources: [], startAt: ev.at };
      const ended = ev.status === 'completed' || ev.status === 'failed';
      const next: FoundryTool = {
        ...cur,
        server: ev.server ?? cur.server,
        name: ev.name ?? cur.name,
        queries: ev.queries?.length ? ev.queries : cur.queries,
        status: ev.status ?? cur.status,
        ...(ended ? { error: ev.error, count: ev.count ?? null, sources: ev.sources ?? [], endAt: ev.at } : {}),
      };
      const tools = i >= 0 ? run.tools.map((x, k) => (k === i ? next : x)) : [...run.tools, next];
      return { ...run, tools, at };
    }
    case 'retry':
      return { ...run, tools: [], text: '', retries: Math.max(run.retries, ev.attempt - 1), at };
    case 'token':
      return { ...run, text: run.text + ev.text };
    case 'done': {
      const { type: _t, ...done } = ev;
      return { ...run, status: 'done', done, at };
    }
    case 'error':
      return { ...run, status: 'error', error: { code: ev.code, message: ev.message }, at };
    default:
      return run;
  }
}

/** Ejecuta el agente y entrega cada evento según llega. Lanza LiveHttpError si el servidor rechaza la petición. */
export async function askFoundry(prompt: string, lang: 'es' | 'en', onEvent: (ev: FoundryEvent) => void, signal?: AbortSignal): Promise<void> {
  const res = await fetch('/api/foundry/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/x-ndjson', ...codeHeader() },
    body: JSON.stringify({ prompt, lang }),
    signal,
  });
  if (!res.ok) throw await httpError(res);
  if (!res.body) throw new LiveHttpError(502, 'NoStream', 'The server returned no stream.');
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  const split = lineSplitter();
  const emit = (line: string) => {
    try {
      onEvent(JSON.parse(line) as FoundryEvent);
    } catch {
      /* línea ilegible */
    }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    split.push(value).forEach(emit);
  }
  split.flush().forEach(emit);
}

// ---------- Markdown del agente: bloques e «inline» sin HTML ----------

export type Align = 'l' | 'c' | 'r';

export type MdBlock =
  | { t: 'h'; text: string; num?: string }
  | { t: 'p'; text: string }
  | { t: 'li'; text: string; level: number; marker: string }
  | { t: 'quote'; text: string }
  | { t: 'table'; head: string[]; align: Align[]; rows: string[][] }
  | { t: 'hr' };

export interface DocRef {
  /** Nombre del fichero sin extensión, p. ej. «02-propuesta-vodafone-business». */
  stem: string;
  title: string;
  href: string;
}

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'b'; v: Inline[] }
  | { t: 'link'; href: string; label: string }
  | { t: 'cite'; kind: 'web' | 'doc' | 'kb'; label: string; title: string; href?: string };

/** Mientras llega el texto, oculta una cita o un enlace a medio escribir al final. */
export function trimPartial(text: string): string {
  let out = text;
  const open = out.lastIndexOf('【');
  if (open >= 0 && out.indexOf('】', open) < 0) out = out.slice(0, open);
  const m = /\[(?:Web|Doc|Fuente|Source|https?:)[^\]\n]*$/i.exec(out);
  if (m) out = out.slice(0, m.index);
  const link = /\[[^\]\n]*\]\([^)\n]*$/.exec(out);
  if (link) out = out.slice(0, link.index);
  return out.replace(/\*+$/, '');
}

const cells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
const isSep = (line: string) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line.trim());
const alignOf = (c: string): Align => (/^:-+:$/.test(c) ? 'c' : /-:$/.test(c) ? 'r' : 'l');

export function parseBlocks(text: string): MdBlock[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: MdBlock[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim());
      i -= 1;
      const sep = rows.length > 1 && isSep(rows[1]);
      const head = cells(rows[0]);
      const align = sep ? cells(rows[1]).map(alignOf) : head.map((): Align => 'l');
      const body = rows.slice(sep ? 2 : 1).filter((r) => !isSep(r)).map(cells);
      out.push({ t: 'table', head, align, rows: body });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      out.push({ t: 'hr' });
      continue;
    }
    const h = /^#{1,6}\s+(.*)$/.exec(line);
    if (h) {
      const text = h[1].replace(/^\*\*(.*)\*\*$/, '$1');
      const n = /^(\d+)[.)]\s+(.+)$/.exec(text);
      out.push(n ? { t: 'h', num: n[1], text: n[2].replace(/^\*\*(.*)\*\*$/, '$1') } : { t: 'h', text });
      continue;
    }
    const indent = raw.length - raw.trimStart().length;
    const sec = /^(\d+)[.)]\s+\*\*([^*]+?)\*\*:?$/.exec(line);
    if (sec && indent === 0) {
      out.push({ t: 'h', num: sec[1], text: sec[2] });
      continue;
    }
    if (line.startsWith('>')) {
      out.push({ t: 'quote', text: line.replace(/^>\s?/, '') });
      continue;
    }
    const li = /^([-*•+]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      const ordered = /\d/.test(li[1]);
      out.push({ t: 'li', level: Math.min(3, Math.floor(indent / 2)), marker: ordered ? li[1] : '•', text: li[2] });
      continue;
    }
    out.push({ t: 'p', text: line });
  }
  return out;
}

const URL_RE = /https?:\/\/[^\s,;】\]<>"')]+/;
const DATE_RE = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$|^\d{4}-\d{2}-\d{2}$|^\d{4}$|^[a-zé]{3,}\.?\s+\d{4}$/i;
const shortHost = (u: string) => hostOf(u).replace(/^www\./, '');
/** Una URL recortada por el modelo («...» o «…») no se enlaza. */
const goodUrl = (u: string | undefined): string | undefined => (u && /^https:\/\//i.test(u) && !/(\.{3}|…)$/.test(u) ? u : undefined);

function docCite(rest: string, docs: DocRef[]): Inline {
  const [idPart, ...secParts] = rest.split(/\s+·\s+|\s*,\s+/);
  const id = (idPart ?? '').trim().replace(/\.md$/, '');
  const section = secParts.join(' · ').trim();
  const doc = docs.find((d) => id === d.stem || id.startsWith(`${d.stem}-`)) ?? docs.find((d) => id.slice(0, 3) === d.stem.slice(0, 3) && /^\d\d-/.test(id));
  const num = /^(\d\d)-/.exec(id)?.[1];
  const label = [num, section || doc?.title || id].filter(Boolean).join(' · ');
  return { t: 'cite', kind: 'doc', label, title: [doc?.title ?? id, section].filter(Boolean).join(' · '), href: doc?.href };
}

function oneCite(part: string, docs: DocRef[]): Inline {
  const p = part.trim();
  if (/^\d+:\d+†/.test(p) || /^†?source$/i.test(p)) return { t: 'cite', kind: 'kb', label: 'Foundry IQ', title: p };
  const tag = /^(Web|Doc|Fuente|Source)\s*:\s*(.*)$/i.exec(p);
  if (tag && /^doc$/i.test(tag[1])) return docCite(tag[2], docs);
  const body = tag ? tag[2] : p;
  if (!tag && /^\d\d-[a-z0-9-]+/.test(body)) return docCite(body, docs);
  const url = URL_RE.exec(body)?.[0];
  const rest = body
    .replace(url ?? '', '')
    .split(/\s*,\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
  const outlet = rest.find((x) => !DATE_RE.test(x));
  const date = rest.find((x) => DATE_RE.test(x));
  const href = goodUrl(url);
  const label = outlet ?? (url ? shortHost(url.replace(/(\.{3}|…)$/, '')) : body);
  return { t: 'cite', kind: 'web', label, title: [outlet, date, url].filter(Boolean).join(' · ') || p, href };
}

function cites(raw: string, docs: DocRef[]): Inline[] {
  // Variantes vistas: «【[Web: …]】», «【[Web: …]; [Doc: …]】» o «【[Web: …] [Doc: …]】».
  const inner = raw
    .trim()
    .replace(/\]\s*[;,]?\s*\[/g, '; ')
    .replace(/^\[|\]$/g, '');
  return inner
    .split(/\s*;\s*(?=(?:Web|Doc|Fuente|Source)\s*:|https?:\/\/)/i)
    .filter((x) => x.trim())
    .flatMap((p) => {
      const urls = p.match(new RegExp(URL_RE.source, 'g')) ?? [];
      // Varias URL sueltas en una misma cita: una ficha por URL.
      if (urls.length > 1 && !/^\s*(Web|Doc|Fuente|Source)\s*:/i.test(p)) return urls.map((u) => oneCite(u, docs));
      return [oneCite(p, docs)];
    });
}

const INLINE_RE =
  /【([^】]*)】|\[((?:Web|Doc|Fuente|Source)\s*:[^\]]*|https?:\/\/[^\]\s]+)\]|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)|\*\*(.+?)\*\*|(https?:\/\/[^\s<>"')\]】]+)/gi;

export function parseInline(text: string, docs: DocRef[] = []): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  const push = (v: string) => {
    if (!v) return;
    const prev = out[out.length - 1];
    if (prev?.t === 'text') prev.v += v;
    else out.push({ t: 'text', v });
  };
  for (const m of text.matchAll(INLINE_RE)) {
    push(text.slice(last, m.index));
    last = (m.index ?? 0) + m[0].length;
    if (m[1] !== undefined || m[2] !== undefined) out.push(...cites(m[1] ?? m[2], docs));
    else if (m[3] !== undefined) {
      const href = goodUrl(m[4]);
      if (href) out.push({ t: 'link', href, label: m[3] });
      else push(m[3]);
    } else if (m[5] !== undefined) out.push({ t: 'b', v: parseInline(m[5], docs) });
    else if (m[6] !== undefined) {
      const u = m[6].replace(/[.,:;]+$/, '');
      const href = goodUrl(u);
      if (href) out.push({ t: 'cite', kind: 'web', label: shortHost(u), title: u, href });
      else push(m[6]);
      last -= m[6].length - u.length;
    }
  }
  push(text.slice(last));
  // El agente a veces repite la misma cita seguida («【4:0†source】【4:1†source】»): se muestra una vez.
  return out.filter((x, i) => {
    const p = out[i - 1];
    return !(x.t === 'cite' && p?.t === 'cite' && p.kind === x.kind && p.label === x.label && p.href === x.href);
  });
}
