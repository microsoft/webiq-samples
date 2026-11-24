// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Settings2 } from 'lucide-react';
import { useId } from 'react';
import type { Lang } from '../data/types';
import { useI18n } from '../i18n';
import type { Settings } from '../lib/settings';
import { ClientLogo, WebIQMark } from './Brand';

interface Props {
  settings: Settings;
  onLang: (l: Lang) => void;
  onOpenSettings: () => void;
}

function FlagES() {
  return (
    <svg className="flag" viewBox="0 0 3 2" width="18" height="12" aria-hidden="true">
      <rect width="3" height="2" fill="#c60b1e" />
      <rect y="0.5" width="3" height="1" fill="#ffc400" />
    </svg>
  );
}

function FlagUK() {
  const clip = `uk${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg className="flag" viewBox="0 0 60 30" width="18" height="12" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <clipPath id={clip}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${clip})`} stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

export function Header({ settings, onLang, onOpenSettings }: Props) {
  const { t, lang } = useI18n();
  const client = settings.activeClient;
  return (
    <header className="topbar">
      <div className="brand">
        <WebIQMark size={30} />
        <div className="brand-text">
          <span className="brand-name">Microsoft Web IQ</span>
          <span className="brand-sub">{t('appSubtitle')}</span>
        </div>
      </div>
      <div className="topbar-right">
        {client !== 'none' && (
          <div className="prepared-for" aria-label={t('preparedFor')}>
            <span className="prepared-label">{t('preparedFor')}</span>
            <ClientLogo id={client} settings={settings} height={26} withName />
          </div>
        )}
        <div className="segmented lang-switch" role="group" aria-label={t('language')}>
          {(['es', 'en'] as Lang[]).map((l) => (
            <button key={l} type="button" className={lang === l ? 'on' : ''} aria-pressed={lang === l} onClick={() => onLang(l)}>
              {l === 'es' ? <FlagES /> : <FlagUK />}
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button type="button" className="btn ghost" onClick={onOpenSettings} aria-label={t('settings')}>
          <Settings2 size={17} />
          <span>{t('settings')}</span>
        </button>
      </div>
    </header>
  );
}
