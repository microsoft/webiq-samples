// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { Endpoint } from '../data/types';
import { ENDPOINT_PATH } from '../data/types';

export const API_BASE = 'https://api.microsoft.ai/v3';
export const MCP_URL = `${API_BASE}/mcp`;
export type SnippetKind = 'curl' | 'python' | 'ts' | 'mcp';
export const SNIPPET_KINDS: SnippetKind[] = ['curl', 'python', 'ts', 'mcp'];

type Body = Record<string, unknown>;

const SDK_RESOURCE: Record<Exclude<Endpoint, 'auto'>, string> = {
  web: 'web.search',
  news: 'news.search',
  videos: 'videos.search',
  images: 'images.search',
  browse: 'browse.fetch',
};

/** Primer argumento posicional del SDK: la consulta o la URL. */
const mainArg = (e: Endpoint) => (e === 'browse' ? 'url' : 'query');

// ---------- REST (curl) ----------
export function curlSnippet(endpoint: Endpoint, body: Body): string {
  const json = JSON.stringify(body, null, 2).replace(/'/g, `'\\''`);
  return [
    `curl -sS -X POST "${API_BASE}/${ENDPOINT_PATH[endpoint]}" \\`,
    `  -H "x-apikey: $WEBIQ_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${json}'`,
  ].join('\n');
}

// ---------- Python ----------
const snake = (k: string) => k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

function py(v: unknown, indent = ''): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map((x) => py(x, indent)).join(', ')}]`;
  const inner = indent + '    ';
  const entries = Object.entries(v as Body).map(([k, x]) => `${inner}${JSON.stringify(k)}: ${py(x, inner)},`);
  return `{\n${entries.join('\n')}\n${indent}}`;
}

const PY_ENUMS: Record<string, (v: string, e: Endpoint) => string | null> = {
  contentFormat: (v, e) => (e === 'browse' ? `BrowseContentFormat.${v}` : `ContentFormat.${v}`),
  aspectRatio: (v) => `ImageAspectRatio.${v}`,
  imageSize: (v) => `ImageSize.${v}`,
  safeSearch: (v) => `SafeSearch.${v}`,
};

const PY_PRINT: Record<Exclude<Endpoint, 'auto'>, string[]> = {
  web: ['for r in res.webResults or []:', '    print(r.title, r.url)'],
  news: ['for item in res.newsResults or []:', '    print(item.title, "-", item.source)'],
  videos: ['for v in res.videoResults or []:', '    print(v.title, v.length)'],
  images: ['for img in res.imageResults or []:', '    print(img.title, img.url)'],
  browse: ['print(res.content[:200])'],
};

export function pythonSnippet(endpoint: Endpoint, body: Body): string {
  if (endpoint === 'auto') {
    return [
      'import os',
      'import requests',
      '',
      '# /auto (beta) no tiene método en el SDK: llamada REST directa',
      'res = requests.post(',
      `    "${API_BASE}/auto",`,
      '    headers={"x-apikey": os.environ["WEBIQ_API_KEY"]},',
      `    json=${py(body, '    ')},`,
      '    timeout=30,',
      ')',
      'res.raise_for_status()',
      'for r in res.json().get("results", []):',
      '    print(r["evidence"]["type"], r["evidence"]["content"][:200])',
    ].join('\n');
  }
  const enums = new Set<string>();
  const args: string[] = [`    ${py(body[mainArg(endpoint)])},`];
  for (const [k, v] of Object.entries(body)) {
    if (k === mainArg(endpoint)) continue;
    const en = typeof v === 'string' ? PY_ENUMS[k]?.(v, endpoint) : null;
    if (en) enums.add(en.split('.')[0]);
    args.push(`    ${snake(k)}=${en ?? py(v, '    ')},`);
  }
  return [
    'import os',
    'from webiq import WebIQClient',
    ...(enums.size ? [`from webiq.types import ${[...enums].sort().join(', ')}`] : []),
    '',
    'with WebIQClient(api_key=os.environ["WEBIQ_API_KEY"]) as client:',
    `    res = client.${SDK_RESOURCE[endpoint]}(`,
    ...args.map((a) => '    ' + a),
    '    )',
    ...PY_PRINT[endpoint].map((x) => '    ' + x),
  ].join('\n');
}

// ---------- TypeScript ----------
/** Literal TS entre comillas simples: JSON.stringify ya escapa barras, saltos de línea y caracteres de control. */
const tsStr = (s: string) => `'${JSON.stringify(s).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'")}'`;
const ident = /^[A-Za-z_$][\w$]*$/;

function ts(v: unknown, indent = ''): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return tsStr(v);
  if (typeof v !== 'object') return String(v);
  if (Array.isArray(v)) return `[${v.map((x) => ts(x, indent)).join(', ')}]`;
  const inner = indent + '  ';
  const entries = Object.entries(v as Body).map(([k, x]) => `${inner}${ident.test(k) ? k : tsStr(k)}: ${ts(x, inner)},`);
  return `{\n${entries.join('\n')}\n${indent}}`;
}

const UPPER = (v: string) => v.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
const TS_ENUMS: Record<string, (v: string, e: Endpoint) => string> = {
  contentFormat: (v, e) => (e === 'browse' ? `BrowseContentFormat.${UPPER(v)}` : `ContentFormat.${UPPER(v)}`),
  liveCrawl: (v) => `LiveCrawlMode.${UPPER(v)}`,
  safeSearch: (v) => `SafeSearch.${UPPER(v)}`,
  aspectRatio: (v) => `ImageAspectRatio.${UPPER(v)}`,
  imageSize: (v) => `ImageSize.${UPPER(v)}`,
  color: (v) => `ImageColor.${UPPER(v)}`,
  duration: (v) => `VideoDuration.${UPPER(v)}`,
  resolution: (v) => `VideoResolution._${v.toUpperCase()}`,
};

const TS_PRINT: Record<Exclude<Endpoint, 'auto'>, string> = {
  web: 'for (const r of res.webResults ?? []) console.log(r.title, r.url, r.lastUpdatedAt);',
  news: 'for (const n of res.newsResults ?? []) console.log(n.title, n.source, n.lastUpdatedAt);',
  videos: 'for (const v of res.videoResults ?? []) console.log(v.title, v.length, v.moments?.[v.bestMomentIndex ?? 0]?.startTime);',
  images: 'for (const img of res.imageResults ?? []) console.log(img.title, img.url, img.hostPageUrl);',
  browse: 'console.log(res.title, res.crawledAt, res.content?.slice(0, 200));',
};

export function tsSnippet(endpoint: Endpoint, body: Body): string {
  if (endpoint === 'auto') {
    return [
      '// /auto (beta) no tiene método en el SDK: llamada REST directa',
      `const res = await fetch('${API_BASE}/auto', {`,
      "  method: 'POST',",
      "  headers: { 'x-apikey': process.env.WEBIQ_API_KEY!, 'Content-Type': 'application/json' },",
      `  body: JSON.stringify(${ts(body, '  ')}),`,
      '});',
      'const data = await res.json();',
      'for (const r of data.results ?? []) console.log(r.evidence.type, r.evidence.content.slice(0, 200));',
    ].join('\n');
  }
  const enums = new Set<string>(['WebIQClient']);
  const opts: string[] = [];
  for (const [k, v] of Object.entries(body)) {
    if (k === mainArg(endpoint)) continue;
    const en = typeof v === 'string' && TS_ENUMS[k] ? TS_ENUMS[k](v, endpoint) : null;
    if (en) enums.add(en.split('.')[0]);
    opts.push(`  ${k}: ${en ?? ts(v, '  ')},`);
  }
  const first = ts(body[mainArg(endpoint)]);
  return [
    `import { ${[...enums].sort((a, b) => (a === 'WebIQClient' ? -1 : b === 'WebIQClient' ? 1 : a.localeCompare(b))).join(', ')} } from '@microsoft/webiq';`,
    '',
    'const client = new WebIQClient({ apiKey: process.env.WEBIQ_API_KEY });',
    opts.length ? `const res = await client.${SDK_RESOURCE[endpoint]}(${first}, {\n${opts.join('\n')}\n});` : `const res = await client.${SDK_RESOURCE[endpoint]}(${first});`,
    TS_PRINT[endpoint],
    'await client.close();',
  ].join('\n');
}

// ---------- MCP ----------
export function mcpConfig(): string {
  return JSON.stringify(
    { mcpServers: { 'WebIQ-MCP': { url: MCP_URL, type: 'http', headers: { 'x-apikey': '<your-api-key>' } } } },
    null,
    2,
  );
}

// ---------- Grounding with Bing (Responses API de Foundry) ----------
/** 'count: 5 · market: es-ES' → { count: 5, market: 'es-ES' } */
export function parseBingConfig(config: string): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const part of config.split('·')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k && v) out[k] = /^\d+$/.test(v) ? Number(v) : v;
  }
  return out;
}

export function bingTool(config: string): Body {
  return {
    type: 'bing_grounding',
    bing_grounding: {
      search_configurations: [{ project_connection_id: '$BING_PROJECT_CONNECTION_ID', ...parseBingConfig(config) }],
    },
  };
}

/** Misma forma que el ejemplo REST de la documentación de Foundry. */
export function bingCurlSnippet(input: string, config: string): string {
  const body = { model: '$FOUNDRY_MODEL_DEPLOYMENT_NAME', input, tool_choice: 'required', tools: [bingTool(config)] };
  // Solo los valores de esas dos claves salen de las comillas simples para que el shell los expanda:
  // el texto del usuario queda siempre literal, aunque contenga «"$FOUNDRY_MODEL_DEPLOYMENT_NAME».
  const json = JSON.stringify(body, null, 2)
    .replace(/'/g, `'\\''`)
    .replace(/("(?:model|project_connection_id)": )"\$(FOUNDRY_MODEL_DEPLOYMENT_NAME|BING_PROJECT_CONNECTION_ID)"/g, `$1"'$$$2'"`);
  return [
    'export AGENT_TOKEN=$(az account get-access-token --scope "https://ai.azure.com/.default" --query accessToken -o tsv)',
    '',
    'curl --request POST \\',
    '  --url "$FOUNDRY_PROJECT_ENDPOINT/openai/v1/responses" \\',
    '  -H "Authorization: Bearer $AGENT_TOKEN" \\',
    '  -H "Content-Type: application/json" \\',
    `  -d '${json}'`,
  ].join('\n');
}

export function snippet(kind: Exclude<SnippetKind, 'mcp'>, endpoint: Endpoint, body: Body): string {
  if (kind === 'curl') return curlSnippet(endpoint, body);
  if (kind === 'python') return pythonSnippet(endpoint, body);
  return tsSnippet(endpoint, body);
}
