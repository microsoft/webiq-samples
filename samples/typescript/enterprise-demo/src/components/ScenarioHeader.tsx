// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { FastForward, Pause, Play, RotateCcw, Search, Sparkles } from 'lucide-react';
import { VARIANTS, type Scenario, type Variant } from '../data/types';
import { useI18n } from '../i18n';
import { clientName, SPEEDS, type Settings } from '../lib/settings';
import { ClientLogo } from './Brand';
import { ScenarioIcon } from './Icon';

interface Props {
  scenario: Scenario;
  variant: Variant;
  settings: Settings;
  playing: boolean;
  done: boolean;
  started: boolean;
  speed: number;
  onVariant: (v: Variant) => void;
  onToggle: () => void;
  onRestart: () => void;
  onSkip: () => void;
  onSpeed: (s: number) => void;
}

export function ScenarioHeader(p: Props) {
  const { t, tl } = useI18n();
  const s = p.scenario;
  const client = p.settings.activeClient;
  const fit = client === 'none' ? null : client;
  const playLabel = p.playing ? t('pause') : p.started && !p.done ? t('resume') : t('run');

  return (
    <section className="scenario-header">
      <div className="sh-main">
        <div className="sh-title-row">
          <span className="sh-icon">
            <ScenarioIcon name={s.icon} size={20} />
          </span>
          <h1>{tl(s.title)}</h1>
          <span className="chip subtle">{tl(s.sector)}</span>
        </div>
        <p className="sh-summary" title={tl(s.summary)}>
          {tl(s.summary)}
        </p>
        {fit && (
          <div className="client-fit">
            <ClientLogo id={fit} settings={p.settings} height={18} />
            <p>
              <strong>
                {t('howItApplies')} {clientName(p.settings, fit)}:
              </strong>{' '}
              {fit === 'custom' ? tl(s.tagline) : tl(s.clientFit[fit])}
            </p>
          </div>
        )}
      </div>
      <div className="sh-controls">
        <div className="segmented variant-switch" role="group" aria-label={t('variant')}>
          {VARIANTS.map((v) => (
            <button key={v} type="button" className={`${p.variant === v ? 'on' : ''} ${v}`} aria-pressed={p.variant === v} onClick={() => p.onVariant(v)}>
              {v === 'webiq' ? <Sparkles size={15} /> : <Search size={15} />}
              {tl(s.variants[v].label)}
            </button>
          ))}
        </div>
        <p className={`variant-desc ${p.variant}`}>{tl(s.variants[p.variant].desc)}</p>
        <div className="playback">
          <button type="button" className="btn primary" onClick={p.onToggle}>
            {p.playing ? <Pause size={16} /> : <Play size={16} />}
            <span>{playLabel}</span>
          </button>
          <button type="button" className="icon-btn" onClick={p.onRestart} aria-label={t('restart')} title={t('restart')}>
            <RotateCcw size={16} />
          </button>
          <button type="button" className="icon-btn" onClick={p.onSkip} aria-label={t('skip')} title={t('skip')}>
            <FastForward size={16} />
          </button>
          <label className="speed">
            <span className="visually-hidden">{t('speed')}</span>
            <select value={p.speed} onChange={(e) => p.onSpeed(Number(e.target.value))} aria-label={t('speed')}>
              {SPEEDS.map((x) => (
                <option key={x} value={x}>
                  {x}×
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
