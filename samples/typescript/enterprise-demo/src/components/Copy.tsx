// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { highlight, type CodeLang } from '../lib/highlight';

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const { t } = useI18n();
  const [ok, setOk] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className={`icon-btn small${ok ? ' ok' : ''}`}
      title={ok ? t('copied') : t('copy')}
      aria-label={label ?? t('copy')}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setOk(true);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setOk(false), 1500);
          },
          () => undefined,
        );
      }}
    >
      {ok ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

interface CodeProps {
  code: string;
  lang: CodeLang;
  title?: ReactNode;
  className?: string;
}

/** Bloque de código con resaltado ligero y botón de copiar. */
export function CodeBlock({ code, lang, title, className = '' }: CodeProps) {
  const lines = highlight(code, lang);
  return (
    <div className={`snippet ${className}`}>
      <div className="snippet-head">
        <span className="snippet-title">{title}</span>
        <CopyButton text={code} />
      </div>
      <pre className="code">
        <code>
          {lines.map((toks, i) => (
            <span key={i} className="code-line">
              {toks.map(([v, c], j) =>
                c ? (
                  <span key={j} className={`tk-${c}`}>
                    {v}
                  </span>
                ) : (
                  v
                ),
              )}
              {i < lines.length - 1 ? '\n' : null}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
