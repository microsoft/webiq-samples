// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { Lang } from '../data/types';

const locale = (lang: Lang) => (lang === 'es' ? 'es-ES' : 'en-GB');
const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/;

/**
 * «2026-10-28T19:24:00+01:00» → «28 oct 2026 · 19:24».
 * Muestra la hora tal como la publica la fuente (sin convertir zonas) y la omite si es medianoche.
 */
export function fmtDate(iso: string, lang: Lang, withTime = true): string {
  const m = ISO.exec(iso);
  if (!m) return iso;
  const [, y, mo, d, hh, mm] = m;
  const day = new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))),
  );
  if (!withTime || !hh || (hh === '00' && mm === '00')) return day;
  return `${day} · ${hh}:${mm}`;
}

/** Hora «HH:MM» de una fecha ISO, tal como viene. */
export function fmtTime(iso: string): string {
  const m = ISO.exec(iso);
  return m?.[4] ? `${m[4]}:${m[5]}` : '';
}

/** «de» → «Alemán» / «German». */
export function langName(code: string, lang: Lang): string {
  try {
    const name = new Intl.DisplayNames([locale(lang)], { type: 'language' }).of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(locale(lang)) + name.slice(1);
  } catch {
    return code;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** 1234567 → «1,2 M» / «1.2M». */
export const fmtCompact = (n: number, lang: Lang): string =>
  new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const shortTrace = (id: string): string => (id.length > 12 ? `${id.slice(0, 8)}…` : id);

/** «0.00:00:48» (d.hh:mm:ss) o «00:07:58» → segundos. NaN si no se reconoce. */
export function clockSeconds(v: string): number {
  const m = /^\s*(?:(\d+)\.)?(\d+(?::\d+){1,2})\s*$/.exec(v);
  if (!m) return Number.NaN;
  return Number(m[1] ?? 0) * 86400 + m[2].split(':').reduce((acc, n) => acc * 60 + Number(n), 0);
}

/** «0.00:00:48» → «0:48»; «00:07:58» → «7:58»; «01:02:03» → «1:02:03». */
export function fmtClock(v: string): string {
  const total = clockSeconds(v);
  if (!Number.isFinite(total)) return v;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const ss = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
