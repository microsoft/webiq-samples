// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ArrowUpRight, ChevronsLeft, ChevronsRight, Info, Radio, Sparkles, SquareTerminal } from 'lucide-react';
import type { Scenario } from '../data/types';
import { useI18n } from '../i18n';
import { PRICES_CHECKED } from '../lib/cost';
import type { View } from '../lib/deeplink';
import { fmtDate } from '../lib/format';
import type { Settings } from '../lib/settings';
import { ClientLogo } from './Brand';
import { EndpointBadge, GitHubMark, ScenarioIcon } from './Icon';

const REPO = 'microsoft/webiq-samples';
const REPO_URL = `https://github.com/${REPO}/tree/main/samples/typescript/enterprise-demo`;

interface Props {
  scenarios: Scenario[];
  view: View;
  settings: Settings;
  onSelect: (v: View) => void;
  onToggleCollapse: () => void;
}

export function Sidebar({ scenarios, view, settings, onSelect, onToggleCollapse }: Props) {
  const { t, tl, lang } = useI18n();
  const collapsed = settings.sidebarCollapsed;
  const active = settings.activeClient;
  const showClientLogos = !settings.confidential && active === 'none';

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`} aria-label={t('useCases')}>
      <div className="sidebar-head">
        {!collapsed && <h2>{t('useCases')}</h2>}
        <button
          type="button"
          className="icon-btn on-sidebar"
          onClick={onToggleCollapse}
          aria-label={collapsed ? t('expand') : t('collapse')}
          title={collapsed ? t('expand') : t('collapse')}
        >
          {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
        </button>
      </div>
      <ol className="scenario-list">
        <li>
          <button
            type="button"
            className={`scenario-item live-item-nav${view.kind === 'live' ? ' selected' : ''}`}
            onClick={() => onSelect({ kind: 'live' })}
            aria-current={view.kind === 'live' ? 'page' : undefined}
            title={collapsed ? t('case0Nav') : undefined}
          >
            <span className="si-icon">
              <Radio size={18} strokeWidth={1.9} aria-hidden="true" />
              <span className="si-num">0</span>
            </span>
            {!collapsed && (
              <span className="si-body">
                <span className="si-title">
                  {t('case0Nav')}
                  <span className="si-live">
                    <i aria-hidden="true" />
                    {t('liveBadge')}
                  </span>
                </span>
                <span className="si-tagline">{t('case0Tagline')}</span>
                <span className="si-meta">
                  {(['web', 'news', 'images', 'videos'] as const).map((e) => (
                    <EndpointBadge key={e} endpoint={e} small />
                  ))}
                </span>
              </span>
            )}
          </button>
        </li>
        {scenarios.map((s) => {
          const selected = view.kind === 'scenario' && view.id === s.id;
          const recommended = settings.recommendForClient && active !== 'none' && active !== 'custom' && s.primaryClient === active;
          return (
            <li key={s.id}>
              <button
                type="button"
                className={`scenario-item${selected ? ' selected' : ''}`}
                onClick={() => onSelect({ kind: 'scenario', id: s.id })}
                aria-current={selected ? 'page' : undefined}
                title={collapsed ? tl(s.title) : undefined}
              >
                <span className="si-icon">
                  <ScenarioIcon name={s.icon} />
                  <span className="si-num">{s.num}</span>
                </span>
                {!collapsed && (
                  <span className="si-body">
                    <span className="si-title">{tl(s.title)}</span>
                    <span className="si-tagline">{tl(s.tagline)}</span>
                    <span className="si-meta">
                      {s.endpoints.map((e) => (
                        <EndpointBadge key={e} endpoint={e} small />
                      ))}
                      {recommended && <span className="si-reco">{t('recommended')}</span>}
                    </span>
                    {showClientLogos && (
                      <span className="si-clients" aria-label={t('appliesTo')}>
                        <ClientLogo id={s.primaryClient} settings={settings} height={16} />
                      </span>
                    )}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="sidebar-extra">
        <button
          type="button"
          className={`nav-item${view.kind === 'why' ? ' selected' : ''}`}
          onClick={() => onSelect({ kind: 'why' })}
          title={collapsed ? t('whyWebIQ') : undefined}
        >
          <Sparkles size={17} />
          {!collapsed && <span>{t('whyWebIQ')}</span>}
        </button>
        <button
          type="button"
          className={`nav-item${view.kind === 'guide' ? ' selected' : ''}`}
          onClick={() => onSelect({ kind: 'guide' })}
          title={collapsed ? t('runGuide') : undefined}
        >
          <SquareTerminal size={17} />
          {!collapsed && <span>{t('runGuide')}</span>}
        </button>
      </div>
      {!collapsed && (
        <div className="sidebar-foot">
          <Info size={14} />
          <span>{t('sidebarFooter')}</span>
          <span className="sidebar-version">
            {t('pricesChecked')} {fmtDate(PRICES_CHECKED, lang, false)}
          </span>
        </div>
      )}
      <div className="sidebar-repo">
        <a
          className="repo-link"
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t('viewOnGitHub')}: ${REPO}`}
          title={t('viewOnGitHub')}
        >
          <GitHubMark size={18} />
          {!collapsed && (
            <>
              <span className="repo-link-name">{REPO}</span>
              <ArrowUpRight className="repo-link-ext" size={14} aria-hidden="true" />
            </>
          )}
        </a>
      </div>
    </nav>
  );
}
