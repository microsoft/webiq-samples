// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export type Lang = 'es' | 'en';
export type L = { es: string; en: string };
export const l = (es: string, en: string): L => ({ es, en });

export type ClientId = 'energy' | 'hospitality' | 'travel' | 'insurance' | 'public-sector';
export type BrandId = ClientId | 'custom';

/** Cada caso se reproduce con Web IQ o con Grounding with Bing Search (agente de Foundry). */
export type Variant = 'webiq' | 'bing';
export const VARIANTS: Variant[] = ['webiq', 'bing'];

export type Endpoint = 'web' | 'news' | 'images' | 'videos' | 'browse' | 'auto';
export const ENDPOINTS: Endpoint[] = ['web', 'news', 'images', 'videos', 'browse', 'auto'];

/** Ruta REST bajo https://api.microsoft.ai/v3/ */
export const ENDPOINT_PATH: Record<Endpoint, string> = {
  web: 'search/web',
  news: 'search/news',
  images: 'search/images',
  videos: 'search/videos',
  browse: 'browse',
  auto: 'auto',
};

/** «doc»: documento interno recuperado con Foundry IQ (knowledge base), no con Web IQ. */
export type SourceKind = 'web' | 'news' | 'image' | 'video' | 'page' | 'weather' | 'timezone' | 'doc';

export interface Source {
  id: string;
  kind: SourceKind;
  /** Fuente pública real (URL y fragmento verificados), no ficticia. */
  real?: boolean;
  /** Título en el idioma original de la fuente. */
  title: string;
  url: string;
  publisher: string;
  /** Idioma original (es, en, de, it, pt…). */
  language: string;
  /** lastUpdatedAt (ISO 8601). */
  date: string;
  /** crawledAt (ISO 8601) cuando la fuente se ha leído con browse. */
  crawledAt?: string;
  /** Fragmento en el idioma original: ≤200 caracteres, como exigen los términos de visualización. */
  excerpt: string;
  /** Traducción del fragmento para la audiencia, si el idioma de la fuente no coincide con el de la demo. */
  tr?: Partial<L>;
  video?: { length: string; views: number; publishedBy: string; moment: { title: L; start: string; end: string } };
  image?: { width: number; height: number; caption: L };
}

export interface WebIQCall {
  id: string;
  endpoint: Endpoint;
  label: L;
  /** Cuerpo JSON de la petición REST. */
  request: Record<string, unknown>;
  /** Latencia de la API en ms (dato ilustrativo del guion). */
  latencyMs: number;
  /** Ids de las fuentes que se muestran como resultado (en orden). */
  results: string[];
  /** Resultados devueltos en total (si se muestran solo algunos). */
  returned?: number;
  status?: 200 | 202;
  retryAfter?: string;
  /** Id de la llamada 202 que esta reintenta. */
  retryOf?: string;
}

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';

export interface Cell {
  text: L;
  /** Número de cita [n] dentro de la variante. */
  cite?: number;
  tone?: Tone;
}

export interface TimelineItem {
  time: string;
  market: L;
  text: L;
  cite?: number;
  tone?: Tone;
}

export interface HeatCell {
  market: string;
  label: L;
  level: 0 | 1 | 2 | 3;
  note: L;
}

export interface ScoreDim {
  name: L;
  level: 'low' | 'medium' | 'high';
  note: L;
  cite?: number;
}

export interface TrailEntry {
  endpoint: Endpoint;
  target: string;
  traceId: string;
  at: string;
}

export interface InfoCard {
  icon: string;
  title: L;
  text: L;
  cite?: number;
  tone?: Tone;
  media?: string;
}

export type Artifact =
  | { kind: 'table'; title: L; columns: L[]; rows: Cell[][]; note?: L }
  | { kind: 'timeline'; title: L; items: TimelineItem[]; heat: HeatCell[]; actions: L[] }
  | { kind: 'scorecard'; title: L; verdict: { tone: Tone; text: L }; dims: ScoreDim[]; trail: TrailEntry[]; note: L }
  | { kind: 'cards'; title: L; cards: InfoCard[] };

export type Step =
  | { kind: 'user'; id: string; text: L }
  | { kind: 'plan'; id: string; text: L }
  | { kind: 'calls'; id: string; calls: WebIQCall[] }
  /** Recuperación en Foundry IQ (knowledge_base_retrieve): resultados = ids de fuentes «doc». */
  | { kind: 'kb'; id: string; label: L; knowledgeBase: string; queries: string[]; results: string[]; latencyMs: number }
  | { kind: 'reason'; id: string; text: L }
  | { kind: 'bing'; id: string; query: string; citations: string[]; config: string }
  | { kind: 'gap'; id: string; title: L; text: L; workaround: L }
  | { kind: 'answer'; id: string; text: L; artifact?: Artifact; flags?: L[] };

export interface ScenarioVariant {
  label: L;
  desc: L;
  steps: Step[];
  /** [n] en los textos → citations[n-1] (ids de Source). */
  citations: string[];
}

export type Mark = 'yes' | 'partial' | 'no';

export interface CompareRow {
  need: L;
  webiq: [Mark, L];
  bing: [Mark, L];
  diy: [Mark, L];
}

export interface CostModel {
  /** Qué es una ejecución a escala. */
  unit: L;
  runsPerMonth: number;
  runsHint: L;
  /** Alternativa sin Web IQ: supuesto ilustrativo y editable. */
  diy: { label: L; monthly: number; basis: L };
}

export interface LivePreset {
  label: L;
  endpoint: Endpoint;
  /** Cuerpo de la petición. «{client}» se sustituye por el cliente activo. */
  body: Record<string, unknown>;
}

export interface Scenario {
  id: string;
  num: number;
  icon: string;
  primaryClient: ClientId;
  sector: L;
  title: L;
  tagline: L;
  summary: L;
  /** La necesidad «obvia» de negocio, en una frase. */
  need: L;
  clientFit: Record<ClientId, L>;
  endpoints: Endpoint[];
  sources: Source[];
  variants: Record<Variant, ScenarioVariant>;
  diyLabel: L;
  compare: CompareRow[];
  cost: CostModel;
  live: LivePreset[];
  takeaways: L[];
  /** Aviso sobre los datos si no son todos ficticios (por defecto, «Datos ficticios»). */
  dataNote?: L;
  /** Agente real de Foundry que se puede ejecutar en vivo desde la pestaña «Agente en vivo». */
  foundry?: FoundryAgent;
}

export interface FoundryAgent {
  name: string;
  project: string;
  model: string;
  knowledgeBase: string;
  /** Herramientas MCP del agente (server_label). */
  tools: string[];
  prompt: L;
  /** Ids de las fuentes «doc» indexadas en la knowledge base. */
  docs: string[];
  /** Versión publicada del agente y enlace a su página en el portal de Foundry. */
  version: string;
  portal: string;
}
