// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { KeyboardEvent, ReactNode } from 'react';
import type { Scenario, Variant } from '../data/types';
import { useI18n, type UIKey } from '../i18n';
import type { Settings } from '../lib/settings';
import type { Timeline } from '../lib/timeline';
import { ApiTab } from './tabs/ApiTab';
import { CompareTab } from './tabs/CompareTab';
import { CostTab } from './tabs/CostTab';
import { EvidenceTab } from './tabs/EvidenceTab';
import { FoundryTab } from './tabs/FoundryTab';
import { LiveTab } from './tabs/LiveTab';

export type TabId = 'evidence' | 'foundry' | 'compare' | 'cost' | 'api' | 'live';
export const TAB_IDS: TabId[] = ['evidence', 'foundry', 'compare', 'cost', 'api', 'live'];
const TAB_KEY: Record<TabId, UIKey> = { evidence: 'tabEvidence', foundry: 'tabFoundry', compare: 'tabCompare', cost: 'tabCost', api: 'tabApi', live: 'tabLive' };

/** Fuente a resaltar en «Evidencias»; nonce permite repetir el resaltado de la misma fuente. */
export interface SourceFocus {
  id: string;
  nonce: number;
}

export const visibleTabs = (settings: Settings, scenario?: Scenario): TabId[] =>
  TAB_IDS.filter((id) => (id !== 'cost' || settings.showCosts) && (id !== 'foundry' || !!scenario?.foundry));

interface Props {
  scenario: Scenario;
  variant: Variant;
  tl: Timeline;
  elapsed: number;
  settings: Settings;
  tab: TabId;
  onTab: (t: TabId) => void;
  focus: SourceFocus | null;
}

export function BottomPanel({ scenario: s, variant: v, tl, elapsed, settings, tab: wanted, onTab, focus }: Props) {
  const { t } = useI18n();
  const tabs = visibleTabs(settings, s);
  const tab = tabs.includes(wanted) ? wanted : 'evidence';

  // Navegación de pestañas con flechas, Inicio y Fin (patrón WAI-ARIA).
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.indexOf(tab);
    const next =
      e.key === 'ArrowRight' ? tabs[(i + 1) % tabs.length] : e.key === 'ArrowLeft' ? tabs[(i - 1 + tabs.length) % tabs.length] : e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs[tabs.length - 1] : null;
    if (!next) return;
    e.preventDefault();
    onTab(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`#tab-${next}`)?.focus();
  };

  let body: ReactNode;
  switch (tab) {
    case 'evidence':
      body = <EvidenceTab scenario={s} variant={v} tl={tl} elapsed={elapsed} focus={focus} />;
      break;
    case 'foundry':
      body = <FoundryTab key={s.id} scenario={s} />;
      break;
    case 'compare':
      body = <CompareTab scenario={s} />;
      break;
    case 'cost':
      body = <CostTab key={s.id} scenario={s} />;
      break;
    case 'api':
      body = <ApiTab key={`${s.id}:${v}`} scenario={s} variant={v} />;
      break;
    case 'live':
      body = <LiveTab key={s.id} scenario={s} settings={settings} />;
      break;
  }

  return (
    <section className="detail-panel" aria-label={t('detailPanel')}>
      <div className="tabs" role="tablist" aria-label={t('detailPanel')} onKeyDown={onKey}>
        {tabs.map((id) => (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls="tab-panel"
            tabIndex={tab === id ? 0 : -1}
            className={tab === id ? 'on' : ''}
            onClick={() => onTab(id)}
          >
            {t(TAB_KEY[id])}
          </button>
        ))}
      </div>
      <div className="tab-body" id="tab-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {body}
      </div>
    </section>
  );
}
