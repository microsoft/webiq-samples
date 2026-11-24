// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CLIENTS, clientById } from '../data/clients';
import type { BrandId, Lang, Variant } from '../data/types';
import { alpha, contrastRatio, contrastText, ensureContrastOn, mix, surfaceTokens } from './color';
import { readStored, writeStored } from './storage';

export interface ThemeColors {
  app: string;
  sidebar: string;
  panel: string;
  header: string;
  accent: string;
}

export interface Settings {
  version: 1;
  lang: Lang;
  activeClient: BrandId | 'none';
  applyBrandOnSelect: boolean;
  confidential: boolean;
  recommendForClient: boolean;
  colors: ThemeColors;
  fontUi: string;
  fontUiCustom: string;
  fontMono: string;
  fontSize: number;
  radius: number;
  logos: Partial<Record<BrandId, string>>;
  clientNames: Partial<Record<BrandId, string>>;
  clientAccents: Partial<Record<BrandId, string>>;
  speed: number;
  autoplay: boolean;
  showDisclaimer: boolean;
  defaultVariant: Variant;
  showCosts: boolean;
  sidebarCollapsed: boolean;
}

export interface FontOption {
  id: string;
  label: string;
  family: string;
}

export const UI_FONTS: FontOption[] = [
  { id: 'inter', label: 'Inter', family: "'Inter Variable', 'Inter', system-ui, sans-serif" },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat Variable', 'Montserrat', sans-serif" },
  { id: 'roboto', label: 'Roboto', family: "'Roboto Variable', 'Roboto', sans-serif" },
  { id: 'open-sans', label: 'Open Sans', family: "'Open Sans Variable', 'Open Sans', sans-serif" },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif" },
  { id: 'ibm-plex-sans', label: 'IBM Plex Sans', family: "'IBM Plex Sans', sans-serif" },
  { id: 'source-serif', label: 'Source Serif 4', family: "'Source Serif 4 Variable', Georgia, serif" },
  { id: 'system', label: 'Sistema · System (Segoe UI / SF)', family: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { id: 'custom', label: '…', family: '' },
];

export const MONO_FONTS: FontOption[] = [
  { id: 'jetbrains', label: 'JetBrains Mono', family: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace" },
  { id: 'fira', label: 'Fira Code', family: "'Fira Code Variable', 'Fira Code', ui-monospace, monospace" },
  { id: 'plex-mono', label: 'IBM Plex Mono', family: "'IBM Plex Mono', ui-monospace, monospace" },
  { id: 'system-mono', label: 'Sistema · System (SF Mono / Consolas)', family: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
];

export const THEME_PRESETS: { id: string; label: { es: string; en: string }; colors: ThemeColors }[] = [
  { id: 'light', label: { es: 'Claro', en: 'Light' }, colors: { app: '#EEF2F7', sidebar: '#0F1B2D', panel: '#FFFFFF', header: '#FFFFFF', accent: '#0F6CBD' } },
  { id: 'soft', label: { es: 'Claro suave', en: 'Soft light' }, colors: { app: '#F4F2EE', sidebar: '#F9F8F5', panel: '#FFFFFF', header: '#F9F8F5', accent: '#2B6CB0' } },
  { id: 'dark', label: { es: 'Oscuro', en: 'Dark' }, colors: { app: '#0A1220', sidebar: '#0C1628', panel: '#111C30', header: '#0C1628', accent: '#4FA3FF' } },
  { id: 'contrast', label: { es: 'Alto contraste', en: 'High contrast' }, colors: { app: '#000000', sidebar: '#000000', panel: '#0A0A0A', header: '#000000', accent: '#FFD400' } },
];

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  lang: 'es',
  activeClient: 'none',
  applyBrandOnSelect: true,
  confidential: true,
  recommendForClient: true,
  colors: THEME_PRESETS[0].colors,
  fontUi: 'inter',
  fontUiCustom: '',
  fontMono: 'jetbrains',
  fontSize: 14,
  radius: 10,
  logos: {},
  clientNames: {},
  clientAccents: {},
  speed: 1,
  autoplay: true,
  showDisclaimer: true,
  defaultVariant: 'webiq',
  showCosts: true,
  sidebarCollapsed: false,
};

const KEY = 'webiq-demo-settings-v1';

/** Velocidades de reproducción que ofrece la interfaz. */
export const SPEEDS = [0.5, 1, 2, 4];
const HEX = /^#[0-9a-fA-F]{6}$/;
const BRAND_IDS = new Set<string>(CLIENTS.map((c) => c.id));

const clampInt = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;

/** Solo marcas conocidas y valores que cumplen `ok`: un fichero importado no puede romper la interfaz. */
function brandMap(v: unknown, ok: (x: string) => boolean): Partial<Record<BrandId, string>> {
  if (!v || typeof v !== 'object') return {};
  return Object.fromEntries(Object.entries(v).filter(([k, x]) => BRAND_IDS.has(k) && typeof x === 'string' && ok(x)));
}

function browserLang(): Lang {
  try {
    return navigator.language?.startsWith('en') ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

/** Sin ajustes guardados (o ilegibles, o sin localStorage) se arranca con los de serie en el idioma del navegador. */
export function loadSettings(): Settings {
  const raw = readStored(KEY);
  if (raw) {
    try {
      return sanitizeSettings(JSON.parse(raw));
    } catch {
      /* JSON corrupto */
    }
  }
  return { ...DEFAULT_SETTINGS, lang: browserLang() };
}

export function sanitizeSettings(input: unknown): Settings {
  const s = (typeof input === 'object' && input ? input : {}) as Partial<Settings>;
  const known = Object.fromEntries(
    Object.entries(s).filter(([k, v]) => Object.hasOwn(DEFAULT_SETTINGS, k) && typeof v === typeof DEFAULT_SETTINGS[k as keyof Settings]),
  ) as Partial<Settings>;
  const colors = { ...DEFAULT_SETTINGS.colors };
  for (const k of Object.keys(colors) as (keyof ThemeColors)[]) {
    const v = s.colors?.[k];
    if (typeof v === 'string' && HEX.test(v)) colors[k] = v;
  }
  return {
    ...DEFAULT_SETTINGS,
    ...known,
    version: 1,
    lang: s.lang === 'en' ? 'en' : 'es',
    activeClient: typeof s.activeClient === 'string' && BRAND_IDS.has(s.activeClient) ? s.activeClient : 'none',
    defaultVariant: s.defaultVariant === 'bing' ? 'bing' : 'webiq',
    speed: SPEEDS.includes(s.speed as number) ? (s.speed as number) : DEFAULT_SETTINGS.speed,
    fontSize: clampInt(s.fontSize, 12, 18, DEFAULT_SETTINGS.fontSize),
    radius: clampInt(s.radius, 0, 18, DEFAULT_SETTINGS.radius),
    colors,
    logos: brandMap(s.logos, (x) => x.startsWith('data:image/')),
    clientNames: brandMap(s.clientNames, () => true),
    clientAccents: brandMap(s.clientAccents, (x) => HEX.test(x)),
  };
}

export const saveSettings = (s: Settings): { ok: boolean } => ({ ok: writeStored(KEY, JSON.stringify(s)) });

export const clientName = (s: Settings, id: BrandId): string => s.clientNames[id]?.trim() || clientById(id).name[s.lang];
export const clientAccent = (s: Settings, id: BrandId): string => s.clientAccents[id] || clientById(id).brand.accent;

export function brandColors(s: Settings, id: BrandId): ThemeColors {
  const c = clientById(id).brand;
  const accent = clientAccent(s, id);
  return { app: c.app, sidebar: c.sidebar, panel: c.panel, header: c.header, accent };
}

export function fontFamily(s: Settings): string {
  if (s.fontUi === 'custom' && s.fontUiCustom.trim()) return `'${s.fontUiCustom.trim().replace(/'/g, '')}', system-ui, sans-serif`;
  return (UI_FONTS.find((f) => f.id === s.fontUi) ?? UI_FONTS[0]).family || UI_FONTS[0].family;
}

export const monoFamily = (s: Settings): string => (MONO_FONTS.find((f) => f.id === s.fontMono) ?? MONO_FONTS[0]).family;

/** Aplica el tema como variables CSS en :root. */
export function applyTheme(s: Settings): void {
  const root = document.documentElement;
  const { app, sidebar, panel, header, accent } = s.colors;
  const P = surfaceTokens(panel);
  const S = surfaceTokens(sidebar);
  const H = surfaceTokens(header);
  const A = surfaceTokens(app);
  const away = (dark: boolean) => (dark ? '#FFFFFF' : '#000000');
  // El texto de acento también aparece sobre --accent-soft (chips, pasos) y sobre filas elevadas o en hover.
  // Con paneles de tono medio el tinte se atenúa lo justo para que ese texto pueda seguir llegando a 4,5:1.
  let softAlpha = P.dark ? 0.22 : 0.12;
  while (softAlpha > 0 && contrastRatio(away(P.dark), mix(panel, accent, softAlpha)) < 4.5) softAlpha = Math.max(0, Math.round((softAlpha - 0.02) * 100) / 100);
  const accentSoft = mix(panel, accent, softAlpha);
  const vars: Record<string, string> = {
    '--bg-app': app,
    '--bg-sidebar': sidebar,
    '--bg-panel': panel,
    '--bg-header': header,
    '--bg-raised': P.raised,
    '--text': P.text,
    '--text-muted': P.muted,
    '--text-faint': P.faint,
    '--border': P.border,
    '--border-strong': P.borderStrong,
    '--hover': P.hover,
    '--app-text': A.text,
    '--app-muted': A.muted,
    '--sidebar-text': S.text,
    '--sidebar-muted': S.muted,
    '--sidebar-border': S.border,
    '--sidebar-hover': S.hover,
    '--sidebar-raised': S.raised,
    '--header-text': H.text,
    '--header-muted': H.muted,
    '--header-border': H.border,
    '--header-hover': H.hover,
    '--accent': accent,
    '--accent-contrast': contrastText(accent),
    '--accent-soft': alpha(accent, softAlpha),
    '--accent-line': alpha(accent, 0.45),
    '--accent-ink': ensureContrastOn(accent, [panel, P.raised, P.hovered, accentSoft], away(P.dark)),
    '--sidebar-accent-ink': ensureContrastOn(accent, [sidebar, S.raised, S.hovered], away(S.dark)),
    '--font-ui': fontFamily(s),
    '--font-mono': monoFamily(s),
    '--fs': `${s.fontSize}px`,
    '--radius': `${s.radius}px`,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.scheme = P.dark ? 'dark' : 'light';
  root.lang = s.lang;
}

export const ALL_BRANDS: BrandId[] = CLIENTS.map((c) => c.id);
