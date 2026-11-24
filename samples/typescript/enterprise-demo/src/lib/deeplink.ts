// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CLIENTS } from '../data/clients';
import { SCENARIOS } from '../data/scenarios';
import type { BrandId, Lang, Variant } from '../data/types';
import { brandColors, THEME_PRESETS, type Settings } from './settings';

/** Vista principal: un caso, el caso 0 en vivo, «Por qué Web IQ» o la guía de la demo. */
export type View = { kind: 'scenario'; id: string } | { kind: 'live' } | { kind: 'why' } | { kind: 'guide' };
type PageKind = 'live' | 'why' | 'guide';
const PAGES: PageKind[] = ['live', 'why', 'guide'];
const isPage = (v: unknown): v is PageKind => PAGES.includes(v as PageKind);

/**
 * Enlace profundo ya validado. Ejemplo:
 * ?scenario=2&variant=bing&tab=cost&t=end&lang=en&client=hospitality&theme=dark&view=why&settings=open
 * El caso 0 (consulta en vivo) se abre con ?scenario=0 o ?view=live.
 * Lo que no se reconoce se ignora (null) y la demo arranca con lo guardado.
 */
export interface DeepLink {
  scenario: string | null;
  variant: Variant | null;
  /** Se valida contra las pestañas visibles al pintar. */
  tab: string | null;
  /** ms de guion o el final. */
  seek: number | 'end' | undefined;
  lang: Lang | null;
  client: BrandId | 'none' | null;
  theme: string | null;
  view: PageKind | null;
  settingsOpen: boolean;
}

/** Número del caso (1-6) o su id. */
function scenarioFrom(v: string | null): string | null {
  if (!v) return null;
  if (/^\d+$/.test(v)) return SCENARIOS[Number(v) - 1]?.id ?? null;
  return SCENARIOS.some((s) => s.id === v) ? v : null;
}

export function parseDeepLink(search: string): DeepLink {
  const p = new URLSearchParams(search);
  const t = p.get('t');
  const variant = p.get('variant');
  const lang = p.get('lang');
  const client = p.get('client');
  const scenario = p.get('scenario');
  const view = scenario === '0' || scenario === 'live' ? 'live' : p.get('view');
  const theme = p.get('theme');
  return {
    scenario: scenarioFrom(scenario),
    variant: variant === 'webiq' || variant === 'bing' ? variant : null,
    tab: p.get('tab'),
    seek: t === 'end' ? 'end' : t && Number.isFinite(Number(t)) ? Number(t) : undefined,
    lang: lang === 'es' || lang === 'en' ? lang : null,
    client: client === 'none' || CLIENTS.some((c) => c.id === client) ? (client as BrandId | 'none') : null,
    theme: THEME_PRESETS.some((x) => x.id === theme) ? theme : null,
    view: isPage(view) ? view : null,
    settingsOpen: p.get('settings') === 'open',
  };
}

/** Idioma, cliente y tema del enlace sobre los ajustes guardados (el tema gana a los colores del cliente). */
export function withDeepLink(s: Settings, link: DeepLink): Settings {
  let out = s;
  if (link.lang) out = { ...out, lang: link.lang };
  if (link.client === 'none') out = { ...out, activeClient: 'none' };
  else if (link.client) out = { ...out, activeClient: link.client, colors: out.applyBrandOnSelect ? brandColors(out, link.client) : out.colors };
  const preset = THEME_PRESETS.find((x) => x.id === link.theme);
  if (preset) out = { ...out, colors: preset.colors };
  return out;
}

/** Vista inicial: la del enlace; si no, la última abierta; si no, el primer caso. */
export function startView(link: DeepLink, saved: string | null): View {
  if (link.scenario) return { kind: 'scenario', id: link.scenario };
  if (link.view) return { kind: link.view };
  try {
    const v = JSON.parse(saved ?? 'null') as View | null;
    const kind = v?.kind;
    if (isPage(kind)) return { kind };
    if (v?.kind === 'scenario' && SCENARIOS.some((s) => s.id === v.id)) return { kind: 'scenario', id: v.id };
  } catch {
    /* vista guardada ilegible */
  }
  return { kind: 'scenario', id: SCENARIOS[0].id };
}
