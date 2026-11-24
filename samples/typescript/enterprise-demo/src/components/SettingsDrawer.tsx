// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Download, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CLIENTS } from '../data/clients';
import type { BrandId } from '../data/types';
import { VARIANTS } from '../data/types';
import { useI18n, type UIKey } from '../i18n';
import { readLogoFile, useLogoSrc } from '../lib/logos';
import {
  ALL_BRANDS,
  brandColors,
  clientAccent,
  clientName,
  DEFAULT_SETTINGS,
  MONO_FONTS,
  sanitizeSettings,
  SPEEDS,
  THEME_PRESETS,
  UI_FONTS,
  type Settings,
  type ThemeColors,
} from '../lib/settings';
import { ClientLogo } from './Brand';

type Tab = 'client' | 'appearance' | 'logos' | 'demo';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
  saveError: boolean;
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
      <span>{children}</span>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <label className="color-field">
      <span>{label}</span>
      <span className="color-inputs">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={label} />
        <input
          type="text"
          value={text}
          spellCheck={false}
          onChange={(e) => {
            setText(e.target.value);
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value.toUpperCase());
          }}
          aria-label={`${label} (hex)`}
        />
      </span>
    </label>
  );
}

function LogoRow({ id, settings, onChange }: { id: BrandId; settings: Settings; onChange: (s: Settings) => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const { source } = useLogoSrc(id, settings.logos[id]);
  const srcKey: UIKey = source === 'upload' ? 'srcUpload' : source === 'file' ? 'srcFile' : 'srcNone';
  return (
    <li className="logo-row">
      <span className="logo-preview">
        <ClientLogo id={id} settings={settings} height={30} />
      </span>
      <span className="logo-info">
        <strong>{clientName(settings, id)}</strong>
        <span className="muted small">{t(srcKey)}</span>
      </span>
      <span className="logo-actions">
        <input
          ref={input}
          type="file"
          accept="image/svg+xml,image/png,image/webp,image/jpeg"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const data = await readLogoFile(f);
            onChange({ ...settings, logos: { ...settings.logos, [id]: data } });
            e.target.value = '';
          }}
        />
        <button type="button" className="btn small" onClick={() => input.current?.click()}>
          <Upload size={14} /> {t('upload')}
        </button>
        {settings.logos[id] && (
          <button
            type="button"
            className="icon-btn small"
            aria-label={t('remove')}
            title={t('remove')}
            onClick={() => {
              const logos = { ...settings.logos };
              delete logos[id];
              onChange({ ...settings, logos });
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </span>
    </li>
  );
}

export function SettingsDrawer({ settings: s, onChange, onClose, saveError }: Props) {
  const { t, tl } = useI18n();
  const [tab, setTab] = useState<Tab>('client');
  const panel = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setColors = (c: Partial<ThemeColors>) => onChange({ ...s, colors: { ...s.colors, ...c } });
  const selectClient = (id: BrandId | 'none') => {
    const next: Settings = { ...s, activeClient: id };
    if (id !== 'none' && s.applyBrandOnSelect) next.colors = brandColors(s, id);
    if (id === 'none' && s.applyBrandOnSelect) next.colors = THEME_PRESETS[0].colors;
    onChange(next);
  };
  const active = s.activeClient;

  const tabs: { id: Tab; key: UIKey }[] = [
    { id: 'client', key: 'sClient' },
    { id: 'appearance', key: 'sAppearance' },
    { id: 'logos', key: 'sLogos' },
    { id: 'demo', key: 'sDemo' },
  ];

  return (
    <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" role="dialog" aria-modal="true" aria-label={t('settings')} tabIndex={-1} ref={panel}>
        <header className="drawer-head">
          <h2>{t('settings')}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('close')}>
            <X size={18} />
          </button>
        </header>
        <div className="tabs drawer-tabs" role="tablist">
          {tabs.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? 'on' : ''} onClick={() => setTab(x.id)}>
              {t(x.key)}
            </button>
          ))}
        </div>
        <div className="drawer-body">
          {saveError && <p className="error-note">{t('storageFull')}</p>}

          {tab === 'client' && (
            <>
              <fieldset className="field">
                <legend>{t('presentingTo')}</legend>
                <div className="client-grid">
                  <button type="button" className={`client-opt${active === 'none' ? ' on' : ''}`} onClick={() => selectClient('none')} aria-pressed={active === 'none'}>
                    <span className="neutral-swatch" />
                    <span>{t('neutral')}</span>
                  </button>
                  {ALL_BRANDS.map((id) => (
                    <button key={id} type="button" className={`client-opt${active === id ? ' on' : ''}`} onClick={() => selectClient(id)} aria-pressed={active === id}>
                      <ClientLogo id={id} settings={s} height={22} />
                      <span>{clientName(s, id)}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="field stack">
                <Toggle checked={s.applyBrandOnSelect} onChange={(v) => onChange({ ...s, applyBrandOnSelect: v })}>
                  {t('applyBrand')}
                </Toggle>
                <Toggle checked={s.confidential} onChange={(v) => onChange({ ...s, confidential: v })}>
                  {t('confidential')}
                </Toggle>
                <Toggle checked={s.recommendForClient} onChange={(v) => onChange({ ...s, recommendForClient: v })}>
                  {t('recommendFor')}
                </Toggle>
              </div>
              {active !== 'none' && (
                <div className="field">
                  <label className="text-field">
                    <span>{t('displayName')}</span>
                    <input
                      type="text"
                      value={s.clientNames[active] ?? clientName(s, active)}
                      onChange={(e) => onChange({ ...s, clientNames: { ...s.clientNames, [active]: e.target.value } })}
                    />
                  </label>
                  <ColorField
                    label={t('brandColor')}
                    value={clientAccent(s, active)}
                    onChange={(v) => onChange({ ...s, clientAccents: { ...s.clientAccents, [active]: v }, colors: { ...s.colors, accent: v } })}
                  />
                  <button type="button" className="btn small" onClick={() => onChange({ ...s, colors: brandColors(s, active) })}>
                    {t('applyAsTheme')}
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'appearance' && (
            <>
              <fieldset className="field">
                <legend>{t('themes')}</legend>
                <div className="preset-row">
                  {THEME_PRESETS.map((p) => (
                    <button key={p.id} type="button" className="preset" onClick={() => setColors(p.colors)}>
                      <span className="preset-swatch" style={{ background: p.colors.app }}>
                        <i style={{ background: p.colors.sidebar }} />
                        <i style={{ background: p.colors.panel }} />
                        <i style={{ background: p.colors.accent }} />
                      </span>
                      {tl(p.label)}
                    </button>
                  ))}
                  {active !== 'none' && (
                    <button type="button" className="preset" onClick={() => setColors(brandColors(s, active))}>
                      <span className="preset-swatch" style={{ background: brandColors(s, active).app }}>
                        <i style={{ background: brandColors(s, active).sidebar }} />
                        <i style={{ background: brandColors(s, active).panel }} />
                        <i style={{ background: brandColors(s, active).accent }} />
                      </span>
                      {clientName(s, active)}
                    </button>
                  )}
                </div>
              </fieldset>
              <fieldset className="field">
                <legend>{t('bgColors')}</legend>
                <ColorField label={t('bgApp')} value={s.colors.app} onChange={(v) => setColors({ app: v })} />
                <ColorField label={t('bgSidebar')} value={s.colors.sidebar} onChange={(v) => setColors({ sidebar: v })} />
                <ColorField label={t('bgPanel')} value={s.colors.panel} onChange={(v) => setColors({ panel: v })} />
                <ColorField label={t('bgHeader')} value={s.colors.header} onChange={(v) => setColors({ header: v })} />
                <ColorField label={t('accent')} value={s.colors.accent} onChange={(v) => setColors({ accent: v })} />
              </fieldset>
              <fieldset className="field">
                <legend>{t('typography')}</legend>
                <label className="text-field">
                  <span>{t('uiFont')}</span>
                  <select value={s.fontUi} onChange={(e) => onChange({ ...s, fontUi: e.target.value })}>
                    {UI_FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.id === 'custom' ? t('customFont') : f.label}
                      </option>
                    ))}
                  </select>
                </label>
                {s.fontUi === 'custom' && (
                  <label className="text-field">
                    <span className="visually-hidden">{t('customFont')}</span>
                    <input type="text" placeholder={t('customFontPh')} value={s.fontUiCustom} onChange={(e) => onChange({ ...s, fontUiCustom: e.target.value })} />
                  </label>
                )}
                <label className="text-field">
                  <span>{t('monoFont')}</span>
                  <select value={s.fontMono} onChange={(e) => onChange({ ...s, fontMono: e.target.value })}>
                    {MONO_FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="range-field">
                  <span>
                    {t('fontSize')} <output>{s.fontSize}px</output>
                  </span>
                  <input type="range" min={12} max={18} step={1} value={s.fontSize} onChange={(e) => onChange({ ...s, fontSize: Number(e.target.value) })} />
                </label>
                <label className="range-field">
                  <span>
                    {t('radius')} <output>{s.radius}px</output>
                  </span>
                  <input type="range" min={0} max={18} step={1} value={s.radius} onChange={(e) => onChange({ ...s, radius: Number(e.target.value) })} />
                </label>
              </fieldset>
            </>
          )}

          {tab === 'logos' && (
            <>
              <p className="muted">{t('logosHelp')}</p>
              <ul className="logo-list">
                {CLIENTS.map((c) => (
                  <LogoRow key={c.id} id={c.id} settings={s} onChange={onChange} />
                ))}
              </ul>
            </>
          )}

          {tab === 'demo' && (
            <>
              <div className="field">
                <label className="text-field">
                  <span>{t('defaultSpeed')}</span>
                  <select value={s.speed} onChange={(e) => onChange({ ...s, speed: Number(e.target.value) })}>
                    {SPEEDS.map((x) => (
                      <option key={x} value={x}>
                        {x}×
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="field stack">
                <Toggle checked={s.autoplay} onChange={(v) => onChange({ ...s, autoplay: v })}>
                  {t('autoplay')}
                </Toggle>
                <Toggle checked={s.showDisclaimer} onChange={(v) => onChange({ ...s, showDisclaimer: v })}>
                  {t('disclaimer')}
                </Toggle>
                <Toggle checked={s.showCosts} onChange={(v) => onChange({ ...s, showCosts: v })}>
                  {t('showCosts')}
                </Toggle>
              </div>
              <div className="field">
                <span className="field-label">{t('defaultVariant')}</span>
                <div className="segmented" role="group" aria-label={t('defaultVariant')}>
                  {VARIANTS.map((v) => (
                    <button key={v} type="button" className={s.defaultVariant === v ? 'on' : ''} aria-pressed={s.defaultVariant === v} onClick={() => onChange({ ...s, defaultVariant: v })}>
                      {v === 'webiq' ? 'Web IQ' : 'Grounding with Bing'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field row-actions">
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `webiq-demo-${active === 'none' ? 'neutral' : active}.json`;
                    a.click();
                    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  <Download size={14} /> {t('exportCfg')}
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      onChange(sanitizeSettings(JSON.parse(await f.text())));
                    } catch {
                      /* fichero no válido: se ignora */
                    }
                    e.target.value = '';
                  }}
                />
                <button type="button" className="btn small" onClick={() => importRef.current?.click()}>
                  <Upload size={14} /> {t('importCfg')}
                </button>
                <button type="button" className="btn small danger" onClick={() => onChange({ ...DEFAULT_SETTINGS, lang: s.lang })}>
                  <RotateCcw size={14} /> {t('reset')}
                </button>
              </div>
              <p className="muted small">{t('shortcuts')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
