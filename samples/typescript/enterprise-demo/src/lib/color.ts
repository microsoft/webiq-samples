// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [128, 128, 128];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (x: number) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Oscuro = se lee mejor con texto blanco que con texto negro. El cruce está en luminancia ≈ 0,179;
 * con un umbral mayor, fondos medios (naranja, cian, verde de marca…) recibirían texto claro ilegible.
 */
export const isDark = (hex: string): boolean => contrastRatio(hex, '#FFFFFF') > contrastRatio(hex, '#000000');

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Texto sobre un color: blanco si cumple 4,5:1; si no, casi negro (oscurecido si hace falta). */
export const contrastText = (bg: string): string => (contrastRatio(bg, '#FFFFFF') >= 4.5 ? '#FFFFFF' : ensureContrast('#111827', bg));

/**
 * Aclara u oscurece fg hasta alcanzar el contraste mínimo sobre bg. Puede llegar al blanco o al negro puros,
 * así que con min ≤ 4,5 siempre lo consigue (el peor fondo da 4,58:1 con el extremo adecuado).
 */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  return ensureContrastOn(fg, [bg], isDark(bg) ? '#FFFFFF' : '#000000', min);
}

/**
 * Como ensureContrast, pero sobre varios fondos a la vez (base, elevado, hover…) y en una dirección fija.
 * Si ni el extremo alcanza el mínimo en todos, devuelve el extremo.
 */
export function ensureContrastOn(fg: string, bgs: string[], toward: string, min = 4.5): string {
  const worst = (c: string) => Math.min(...bgs.map((b) => contrastRatio(c, b)));
  let out = fg;
  for (let i = 1; i <= 15 && worst(out) < min; i++) out = mix(fg, toward, Math.min(1, i * 0.07));
  return out;
}

/**
 * Paleta de texto y bordes legible sobre un fondo dado. Los textos se ajustan hasta 4,5:1 sobre el fondo,
 * su versión elevada y el estado hover, así que cualquier color que elija el usuario sigue siendo legible
 * (en los temas incluidos solo se oscurece un poco el texto tenue).
 */
export function surfaceTokens(bg: string) {
  const dark = isDark(bg);
  const toward = dark ? '#FFFFFF' : '#000000';
  const layers = (tint: string) => {
    const [ra, ha] = dark ? [0.05, 0.06] : [0.025, 0.045];
    return { raised: mix(bg, tint, ra), hovered: mix(bg, tint, ha), hover: alpha(tint, ha) };
  };
  // Elevado y hover se separan del fondo hacia el color del texto. En tonos medios eso impediría llegar a 4,5:1
  // incluso con blanco o negro puros, y entonces se separan hacia el lado contrario.
  let L = layers(dark ? '#FFFFFF' : '#0F172A');
  if (Math.min(contrastRatio(toward, L.raised), contrastRatio(toward, L.hovered)) < 4.5) L = layers(dark ? '#000000' : '#FFFFFF');
  const fit = (fg: string) => ensureContrastOn(fg, [bg, L.raised, L.hovered], toward);
  return {
    text: fit(dark ? '#E8EBF2' : '#172033'),
    muted: fit(dark ? '#A3ACBE' : '#566074'),
    faint: fit(dark ? '#8C95A8' : '#6B7486'),
    border: dark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)',
    borderStrong: dark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)',
    /** Capa semitransparente de hover y el color que resulta sobre el fondo. */
    hover: L.hover,
    hovered: L.hovered,
    raised: L.raised,
    dark,
  };
}
