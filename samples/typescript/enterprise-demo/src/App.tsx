// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgentStage } from './components/AgentStage';
import { BottomPanel, TAB_IDS, type SourceFocus, type TabId } from './components/BottomPanel';
import { GuideView } from './components/GuideView';
import { Header } from './components/Header';
import { LiveView } from './components/LiveView';
import { ScenarioHeader } from './components/ScenarioHeader';
import { SettingsDrawer } from './components/SettingsDrawer';
import { Sidebar } from './components/Sidebar';
import { SplitPane } from './components/SplitPane';
import { WhyView } from './components/WhyView';
import { SCENARIOS } from './data/scenarios';
import type { Lang, Variant } from './data/types';
import { I18nContext, makeI18n } from './i18n';
import { parseDeepLink, startView, withDeepLink, type View } from './lib/deeplink';
import { applyTheme, loadSettings, saveSettings, type Settings } from './lib/settings';
import { readStored, writeStored } from './lib/storage';
import { buildTimeline } from './lib/timeline';
import { usePlayback } from './lib/usePlayback';

const VIEW_KEY = 'webiq-demo-view';
const LINK = parseDeepLink(window.location.search);

const initialSettings = (): Settings => withDeepLink(loadSettings(), LINK);
const initialView = (): View => startView(LINK, readStored(VIEW_KEY));

function initialVariants(): Record<string, Variant> {
  const start = initialView();
  return LINK.variant && start.kind === 'scenario' ? { [start.id]: LINK.variant } : {};
}

export default function App() {
  const [settings, setSettingsState] = useState<Settings>(initialSettings);
  const [saveError, setSaveError] = useState(false);
  const [view, setView] = useState<View>(initialView);
  const [variants, setVariants] = useState<Record<string, Variant>>(initialVariants);
  const [tab, setTab] = useState<TabId>(() => (TAB_IDS.includes(LINK.tab as TabId) ? (LINK.tab as TabId) : 'evidence'));
  const [speed, setSpeed] = useState(settings.speed);
  const [settingsOpen, setSettingsOpen] = useState(LINK.settingsOpen);
  const [focus, setFocus] = useState<SourceFocus | null>(null);

  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    setSaveError(!saveSettings(s).ok);
  }, []);

  useEffect(() => applyTheme(settings), [settings]);
  useEffect(() => setSpeed(settings.speed), [settings.speed]);
  useEffect(() => void writeStored(VIEW_KEY, JSON.stringify(view)), [view]);

  const scenario = SCENARIOS.find((s) => view.kind === 'scenario' && s.id === view.id) ?? SCENARIOS[0];
  const variant: Variant = variants[scenario.id] ?? settings.defaultVariant;
  const tl = useMemo(() => buildTimeline(scenario, variant), [scenario, variant]);
  const resetKey = `${scenario.id}:${variant}:${view.kind}`;
  const pb = usePlayback(tl.total, speed, resetKey, settings.autoplay && view.kind === 'scenario', LINK.seek);

  useEffect(() => setFocus(null), [scenario.id, variant]);

  const i18n = useMemo(() => makeI18n(settings.lang), [settings.lang]);
  const setLang = (lang: Lang) => setSettings({ ...settings, lang });
  const setVariant = (v: Variant) => setVariants((m) => ({ ...m, [scenario.id]: v }));

  // Una cita [n] o un resultado abren «Evidencias» y resaltan la fuente.
  const showSource = (id: string) => {
    setTab('evidence');
    setFocus((f) => ({ id, nonce: (f?.nonce ?? 0) + 1 }));
  };
  const onCite = (n: number) => {
    const id = scenario.variants[variant].citations[n - 1];
    if (id) showSource(id);
  };

  // Atajos de teclado para presentar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (settingsOpen || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
      const k = e.key.toLowerCase();
      const inScenario = view.kind === 'scenario';
      if (e.key === ' ' && inScenario && !['BUTTON', 'A', 'SUMMARY'].includes(target.tagName)) {
        e.preventDefault();
        pb.toggle();
      } else if (k === 'r' && inScenario) pb.restart();
      else if (e.key === 'ArrowRight' && inScenario) pb.skip();
      else if (k === 'v' && inScenario) setVariant(variant === 'webiq' ? 'bing' : 'webiq');
      else if (e.key === '0') setView({ kind: 'live' });
      else if (/^[1-6]$/.test(e.key) && SCENARIOS[Number(e.key) - 1]) setView({ kind: 'scenario', id: SCENARIOS[Number(e.key) - 1].id });
      else if (k === 'l') setLang(settings.lang === 'es' ? 'en' : 'es');
      else if (k === 's') setSettingsOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <I18nContext.Provider value={i18n}>
      <div className={`app${settings.sidebarCollapsed ? ' sb-collapsed' : ''}`}>
        <Header settings={settings} onLang={setLang} onOpenSettings={() => setSettingsOpen(true)} />
        <div className="app-body">
          <Sidebar
            scenarios={SCENARIOS}
            view={view}
            settings={settings}
            onSelect={setView}
            onToggleCollapse={() => setSettings({ ...settings, sidebarCollapsed: !settings.sidebarCollapsed })}
          />
          <main className="main">
            {view.kind === 'why' && <WhyView scenarios={SCENARIOS} settings={settings} onOpen={(id) => setView({ kind: 'scenario', id })} />}
            {view.kind === 'guide' && <GuideView />}
            {view.kind === 'live' && <LiveView settings={settings} />}
            {view.kind === 'scenario' && (
              <>
                <ScenarioHeader
                  scenario={scenario}
                  variant={variant}
                  settings={settings}
                  playing={pb.playing}
                  done={pb.done}
                  started={pb.elapsed > 0}
                  speed={speed}
                  onVariant={setVariant}
                  onToggle={pb.toggle}
                  onRestart={pb.restart}
                  onSkip={pb.skip}
                  onSpeed={setSpeed}
                />
                <SplitPane
                  top={
                    <AgentStage
                      scenario={scenario}
                      variant={variant}
                      tl={tl}
                      elapsed={pb.elapsed}
                      playing={pb.playing}
                      settings={settings}
                      onCite={onCite}
                      onSource={showSource}
                    />
                  }
                  bottom={
                    <BottomPanel
                      scenario={scenario}
                      variant={variant}
                      tl={tl}
                      elapsed={pb.elapsed}
                      settings={settings}
                      tab={tab}
                      onTab={setTab}
                      focus={focus}
                    />
                  }
                />
              </>
            )}
          </main>
        </div>
        {settingsOpen && <SettingsDrawer settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} saveError={saveError} />}
      </div>
    </I18nContext.Provider>
  );
}
