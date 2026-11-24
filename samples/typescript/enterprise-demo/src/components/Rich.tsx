// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Fragment, type ReactNode } from 'react';

export type CiteHandler = (n: number) => void;

/** Superíndice [n]: botón si se puede abrir la fuente. */
export function CiteSup({ n, onCite }: { n: number; onCite?: CiteHandler }) {
  return (
    <sup className="cite-sup">
      {onCite ? (
        <button type="button" className="cite" onClick={() => onCite(n)} aria-label={`[${n}]`}>
          {n}
        </button>
      ) : (
        <span className="cite">{n}</span>
      )}
    </sup>
  );
}

const TOKENS = /(\*\*[^*]+\*\*|\[\d+\]|https?:\/\/[^\s)]+)/g;

function inline(text: string, key: string, onCite?: CiteHandler): ReactNode[] {
  return text.split(TOKENS).map((p, i) => {
    const k = `${key}-${i}`;
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={k}>{inline(p.slice(2, -2), k, onCite)}</strong>;
    const cite = /^\[(\d+)\]$/.exec(p);
    if (cite) return <CiteSup key={k} n={Number(cite[1])} onCite={onCite} />;
    if (/^https?:\/\//.test(p)) return <span key={k} className="link-like">{p}</span>;
    return <Fragment key={k}>{p}</Fragment>;
  });
}

/** Cierra las marcas a medias de un texto incompleto (`**` abierto o `[n` sin cerrar). */
export function balanceMarks(text: string): string {
  let s = text.replace(/\s*\[\d*$/, '');
  if (s.endsWith('*') && !s.endsWith('**')) s = s.slice(0, -1);
  if ((s.match(/\*\*/g) ?? []).length % 2 === 1) s = s.endsWith('**') ? s.slice(0, -2) : `${s}**`;
  return s;
}

/** Prefijo «tecleado» de un texto sin dejar marcas a medias. */
export function typedPrefix(text: string, n: number): string {
  if (n >= text.length) return text;
  return balanceMarks(text.slice(0, Math.max(0, Math.floor(n))));
}

/** Texto con **negrita**, citas [n] pulsables y párrafos. */
export function Rich({ text, onCite, caret = false }: { text: string; onCite?: CiteHandler; caret?: boolean }) {
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  if (lines.length === 0) lines.push('');
  return (
    <div className="rich">
      {lines.map((line, i) => (
        <p key={i} className={line.startsWith('·') ? 'rich-bullet' : undefined}>
          {inline(line, String(i), onCite)}
          {caret && i === lines.length - 1 && <span className="caret" aria-hidden="true" />}
        </p>
      ))}
    </div>
  );
}
