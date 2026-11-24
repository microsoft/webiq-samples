// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { useEffect, useRef } from 'react';
import type { Scenario, Source, Variant } from '../../data/types';
import { useI18n } from '../../i18n';
import { citedAt, type Timeline } from '../../lib/timeline';
import type { SourceFocus } from '../BottomPanel';
import { SourceCard } from '../SourceCard';

interface Props {
  scenario: Scenario;
  variant: Variant;
  tl: Timeline;
  elapsed: number;
  focus: SourceFocus | null;
}

/** Fuentes que ya han llegado a la aplicación, en el orden en que llegaron. */
export function foundSources(s: Scenario, v: Variant, tl: Timeline, elapsed: number): Source[] {
  const byId = new Map(s.sources.map((x) => [x.id, x]));
  const ids: string[] = [];
  const add = (id: string) => {
    if (!ids.includes(id)) ids.push(id);
  };
  // Foundry IQ (documentos internos) responde antes que la búsqueda web en las dos variantes.
  for (const st of tl.steps) if (st.step.kind === 'kb' && st.end <= elapsed) st.step.results.forEach(add);
  if (v === 'webiq') {
    for (const c of tl.calls) if (c.end <= elapsed) c.call.results.forEach(add);
  } else {
    for (const st of tl.steps) if (st.step.kind === 'bing' && st.end <= elapsed) st.step.citations.forEach(add);
  }
  return ids.map((id) => byId.get(id)).filter((x): x is Source => !!x);
}

export function EvidenceTab({ scenario: s, variant: v, tl, elapsed, focus }: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const list = foundSources(s, v, tl, elapsed);
  const numbering = s.variants[v].citations;
  const cited = citedAt(tl, elapsed);
  const final = elapsed >= tl.total;

  useEffect(() => {
    if (!focus) return;
    const el = ref.current?.querySelector<HTMLElement>(`[data-src="${CSS.escape(focus.id)}"]`);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [focus]);

  const numberOf = (id: string): number | undefined => {
    const n = numbering.indexOf(id) + 1;
    if (n === 0) return undefined;
    return v === 'bing' || cited.has(n) ? n : undefined;
  };

  return (
    <div className="evidence-tab" ref={ref}>
      <p className="tab-intro">{t(v === 'webiq' ? 'evidenceIntro' : 'evidenceIntroBing')}</p>
      {list.length === 0 ? (
        <p className="empty-state">{t('evidenceEmpty')}</p>
      ) : (
        <div className={`evidence-grid ${v}`}>
          {list.map((x) => {
            const nonce = focus && focus.id === x.id ? focus.nonce : null;
            return <SourceCard key={nonce === null ? x.id : `${x.id}:${nonce}`} source={x} variant={v} n={numberOf(x.id)} final={final} flash={nonce !== null} />;
          })}
        </div>
      )}
    </div>
  );
}
