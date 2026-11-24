// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  ArrowUp,
  ChefHat,
  Clapperboard,
  Cpu,
  ExternalLink,
  Gauge,
  KeyRound,
  LoaderCircle,
  Medal,
  Microscope,
  PenLine,
  Plane,
  Play,
  Radio,
  RefreshCw,
  Rocket,
  Smartphone,
  Sparkles,
  Square,
  Star,
  TriangleAlert,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { L } from '../data/types';
import { useI18n, type UIKey } from '../i18n';
import { callPrice, fmtInt, fmtMs, fmtUSD } from '../lib/cost';
import { fmtClock, fmtCompact, fmtDate, hostOf, langName, shortTrace } from '../lib/format';
import {
  applyLiveEvent,
  askLive,
  citedInText,
  getAccessCode,
  getStatus,
  LIVE_MAX_PROMPT,
  LIVE_SOURCES,
  LiveHttpError,
  liveRefs,
  newRun,
  safeUrl,
  setAccessCode,
  verifyAccessCode,
  type LiveCall,
  type LiveEndpoint,
  type LiveImageItem,
  type LiveRun,
  type LiveSource,
  type LiveStatus,
  type LiveTextItem,
  type LiveVideoItem,
} from '../lib/live';
import type { Settings } from '../lib/settings';
import { WebIQMark } from './Brand';
import { EndpointBadge, EndpointIcon } from './Icon';
import { balanceMarks, Rich } from './Rich';

type Group = 'sports' | 'tech' | 'misc';

interface Preset {
  id: string;
  group: Group;
  icon: LucideIcon;
  label: L;
  prompt: L;
}

const p = (id: string, group: Group, icon: LucideIcon, label: L, prompt: L): Preset => ({ id, group, icon, label, prompt });

/** Preguntas de ejemplo: piden a propósito noticias recientes, vídeos e imágenes para que se vea la variedad de fuentes. */
export const LIVE_PRESETS: Preset[] = [
  p(
    'clasico',
    'sports',
    Trophy,
    { es: 'Último Clásico', en: 'Latest Clásico' },
    {
      es: '¿Cómo quedó el último Real Madrid–Barcelona? Resume los goles y enséñame vídeos con los mejores momentos.',
      en: 'How did the latest Real Madrid vs Barcelona match end? Summarise the goals and show me highlight videos.',
    },
  ),
  p(
    'f1',
    'sports',
    Gauge,
    { es: 'Fórmula 1', en: 'Formula 1' },
    {
      es: '¿Quién ganó el último Gran Premio de Fórmula 1 y cómo va el Mundial de pilotos?',
      en: 'Who won the latest Formula 1 Grand Prix and how does the drivers’ championship stand?',
    },
  ),
  p(
    'nba',
    'sports',
    Medal,
    { es: 'Jugadas NBA', en: 'NBA plays' },
    { es: 'Las mejores jugadas de la NBA de esta semana, con vídeos.', en: 'This week’s best NBA plays, with videos.' },
  ),
  p(
    'microsoft',
    'tech',
    Cpu,
    { es: 'Novedades de Microsoft IA', en: 'Microsoft AI news' },
    {
      es: '¿Qué ha anunciado Microsoft este mes sobre Copilot y Azure AI Foundry?',
      en: 'What has Microsoft announced this month about Copilot and Azure AI Foundry?',
    },
  ),
  p(
    'phones',
    'tech',
    Smartphone,
    { es: 'iPhone vs Galaxy', en: 'iPhone vs Galaxy' },
    {
      es: 'Compara el último iPhone con el último Samsung Galaxy en cámara y batería, con análisis en vídeo.',
      en: 'Compare the latest iPhone with the latest Samsung Galaxy on camera and battery, with video reviews.',
    },
  ),
  p(
    'starship',
    'tech',
    Rocket,
    { es: 'Starship de SpaceX', en: 'SpaceX Starship' },
    {
      es: '¿Cuándo es el próximo lanzamiento de Starship de SpaceX? Muéstrame fotos y el vídeo del último.',
      en: 'When is SpaceX’s next Starship launch? Show me photos and the video of the last one.',
    },
  ),
  p(
    'cinema',
    'misc',
    Clapperboard,
    { es: 'Estrenos y tráilers', en: 'Releases and trailers' },
    { es: 'Estrenos de cine de este mes con sus tráilers.', en: 'This month’s movie releases with their trailers.' },
  ),
  p(
    'paella',
    'misc',
    ChefHat,
    { es: 'Paella valenciana', en: 'Valencian paella' },
    {
      es: 'Receta auténtica de paella valenciana paso a paso, con vídeo.',
      en: 'Authentic Valencian paella recipe step by step, with video.',
    },
  ),
  p(
    'lisbon',
    'misc',
    Plane,
    { es: 'Lisboa en 2 días', en: 'Lisbon in 2 days' },
    {
      es: 'Qué ver en Lisboa en dos días, con fotos y vídeos de los sitios imprescindibles.',
      en: 'What to see in Lisbon in two days, with photos and videos of the must-see spots.',
    },
  ),
  p(
    'alzheimer',
    'misc',
    Microscope,
    { es: 'Avances en alzhéimer', en: 'Alzheimer’s research' },
    {
      es: '¿Cuáles son los últimos avances en la investigación del alzhéimer?',
      en: 'What are the latest advances in Alzheimer’s research?',
    },
  ),
];

const GROUPS: { id: Group; label: UIKey }[] = [
  { id: 'sports', label: 'lvGroupSports' },
  { id: 'tech', label: 'lvGroupTech' },
  { id: 'misc', label: 'lvGroupMisc' },
];

const SKIP_TEXT: Record<string, UIKey> = { NoSources: 'lvSkipNoSources', AllCallsFailed: 'lvSkipFailed', NoLlm: 'lvSkipNoLlm' };
const FRESH_TEXT: Record<string, UIKey> = { day: 'lvFreshDay', week: 'lvFreshWeek', month: 'lvFreshMonth', year: 'lvFreshYear' };

/** Viñetas «- » del modelo → «· », que Rich pinta como viñeta. */
const toRich = (text: string, streaming: boolean) => (streaming ? balanceMarks(text) : text).replace(/^\s*[-*•](?:\s+|$)/gm, '· ');

interface Notice {
  key: UIKey;
  extra?: string;
  tone: 'bad' | 'warn' | 'muted';
}

interface Timing {
  start: number;
  first?: number;
  end?: number;
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!active) return;
    setNow(performance.now());
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

/** Milisegundos desde que se lanzó la pregunta (se congela al terminar). */
function useElapsed(run: LiveRun | null, timing: Timing | null): number {
  const now = useNow(run?.status === 'running');
  if (!run || !timing) return 0;
  if (run.done) return run.done.totalMs;
  return (timing.end ?? now) - timing.start;
}

function noticeFor(e: unknown): Notice {
  if (e instanceof LiveHttpError) {
    if (e.status === 401) return { key: 'lvCodeBad', tone: 'bad' };
    if (e.code === 'RateLimited') return { key: 'lvErrRate', extra: `${e.retryAfter ?? 60} s`, tone: 'warn' };
    if (e.code === 'DailyLimit') return { key: 'lvErrDaily', tone: 'warn' };
    if (e.code === 'Busy') return { key: 'lvErrBusy', tone: 'warn' };
    if (e.code === 'TooManyAttempts') return { key: 'lvCodeLocked', tone: 'warn' };
    if (e.code === 'MissingApiKey') return { key: 'lvNoKey', tone: 'bad' };
    return { key: 'lvAnswerError', extra: `${e.code}: ${e.message}`, tone: 'bad' };
  }
  return { key: 'lvErrNet', tone: 'bad' };
}

export function LiveView({ settings }: { settings: Settings }) {
  const { t, tl, lang } = useI18n();
  const [status, setStatus] = useState<LiveStatus | null | undefined>(undefined);
  const [check, setCheck] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [sources, setSources] = useState<LiveSource[]>(LIVE_SOURCES);
  const [run, setRun] = useState<LiveRun | null>(null);
  const [timing, setTiming] = useState<Timing | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [codeOk, setCodeOk] = useState(false);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState<UIKey | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [flash, setFlash] = useState<{ n: number; nonce: number } | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    let alive = true;
    setStatus(undefined);
    getStatus().then((st) => {
      if (alive) setStatus(st);
    });
    return () => {
      alive = false;
    };
  }, [check]);

  // Si la demo publicada pide código y ya hay uno guardado, se comprueba sin gastar consultas.
  const needsCode = !!status?.needsCode;
  useEffect(() => {
    if (!needsCode) return;
    const saved = getAccessCode();
    if (!saved) return;
    let alive = true;
    verifyAccessCode(saved)
      .then((r) => {
        if (!alive) return;
        if (r instanceof LiveHttpError) {
          if (r.status === 401) setAccessCode('');
          return;
        }
        setCodeOk(true);
        setRemaining(r.remainingToday);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [needsCode]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Al cambiar de idioma, un ejemplo sin tocar se traduce.
  useEffect(() => {
    setPrompt((cur) => {
      const preset = LIVE_PRESETS.find((x) => x.prompt.es === cur || x.prompt.en === cur);
      return preset ? preset.prompt[lang] : cur;
    });
  }, [lang]);

  const ready = !!status?.ok && status.hasKey;
  const unlocked = !needsCode || codeOk;
  const running = run?.status === 'running';
  const trimmed = prompt.trim();
  const canSend = ready && unlocked && !running && trimmed.length > 0 && sources.length > 0;
  const hasUrl = /https?:\/\/\S+/i.test(prompt);
  const estimate = sources.reduce((acc, s) => acc + callPrice(s), 0) + (hasUrl ? callPrice('browse') : 0);
  const calls = sources.length + (hasUrl ? 1 : 0);

  const pick = (preset: Preset) => {
    setPrompt(preset.prompt[lang]);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });
  };

  const toggleSource = (s: LiveSource) =>
    setSources((cur) => (cur.includes(s) ? (cur.length > 1 ? cur.filter((x) => x !== s) : cur) : LIVE_SOURCES.filter((x) => x === s || cur.includes(x))));

  const ask = useCallback(async () => {
    if (!canSend) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const id = ++runId.current;
    const start = performance.now();
    let first = true;
    let ended = false;
    setNotice(null);
    setFlash(null);
    setTiming({ start });
    setRun(newRun(trimmed, lang, sources));
    resultsRef.current?.scrollTo({ top: 0 });
    const finish = (patch: (r: LiveRun) => LiveRun) => {
      if (runId.current !== id) return;
      setTiming((tm) => (tm && tm.end === undefined ? { ...tm, end: performance.now() } : tm));
      setRun((r) => (r ? patch(r) : r));
    };
    try {
      await askLive(
        { prompt: trimmed, lang, sources },
        (ev) => {
          if (runId.current !== id) return;
          if (ev.type === 'token' && first) {
            first = false;
            setTiming((tm) => (tm ? { ...tm, first: performance.now() - tm.start } : tm));
          }
          if (ev.type === 'done' || (ev.type === 'error' && ev.stage !== 'answer')) ended = true;
          if (ev.type === 'done' && typeof ev.remainingToday === 'number') setRemaining(ev.remainingToday);
          setRun((r) => (r ? applyLiveEvent(r, ev) : r));
        },
        ctrl.signal,
      );
      if (ended) {
        finish((r) => r);
      } else {
        finish((r) => (r.status === 'running' ? { ...r, status: 'error' } : r));
        if (runId.current === id) setNotice({ key: 'lvStreamCut', tone: 'warn' });
      }
    } catch (e) {
      if (ctrl.signal.aborted) {
        finish((r) => (r.status === 'running' ? { ...r, status: 'aborted' } : r));
        if (runId.current === id) setNotice({ key: 'lvStopped', tone: 'muted' });
        return;
      }
      if (e instanceof LiveHttpError && e.status === 401) {
        setAccessCode('');
        setCodeOk(false);
        setCodeErr('lvCodeBad');
      }
      if (e instanceof LiveHttpError && e.code === 'MissingApiKey') setCheck((c) => c + 1);
      finish((r) => ({ ...r, status: 'error' }));
      if (runId.current === id) setNotice(noticeFor(e));
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  }, [canSend, trimmed, lang, sources]);

  const stop = () => abortRef.current?.abort();

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void ask();
    }
  };

  const unlock = async () => {
    const c = code.trim();
    if (!c || verifying) return;
    setVerifying(true);
    setCodeErr(null);
    try {
      const r = await verifyAccessCode(c);
      if (r instanceof LiveHttpError) {
        setCodeErr(r.status === 429 ? 'lvCodeLocked' : r.status === 401 ? 'lvCodeBad' : 'lvErrNet');
        return;
      }
      setAccessCode(c);
      setCodeOk(true);
      setCode('');
      setRemaining(r.remainingToday);
      setNotice((n) => (n?.key === 'lvCodeBad' ? null : n));
      taRef.current?.focus();
    } catch {
      setCodeErr('lvErrNet');
    } finally {
      setVerifying(false);
    }
  };

  const forget = () => {
    setAccessCode('');
    setCodeOk(false);
  };

  const onCite = useCallback((n: number) => {
    setFlash((f) => ({ n, nonce: (f?.nonce ?? 0) + 1 }));
    document.getElementById(`lv-ref-${n}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  return (
    <>
      <section className="scenario-header lv-header">
        <div className="sh-main">
          <div className="sh-title-row">
            <span className="sh-icon">
              <Radio size={20} aria-hidden="true" />
            </span>
            <h1>{t('lvTitle')}</h1>
            <span className="chip subtle">{t('lvSector')}</span>
            <span className="lv-live-chip">
              <i aria-hidden="true" />
              {t('liveBadge')}
            </span>
          </div>
          <p className="sh-summary" title={t('lvSummary')}>
            {t('lvSummary')}
          </p>
        </div>
        <div className="sh-controls lv-status">
          <StatusChips status={status} onRecheck={() => setCheck((c) => c + 1)} />
        </div>
      </section>

      <section className="stage live-stage" aria-label={t('lvTitle')}>
        <div className="stage-body">
          <div className="lv-main">
            <form
              className="lv-composer"
              onSubmit={(e) => {
                e.preventDefault();
                void ask();
              }}
            >
              <div className="lv-presets" role="group" aria-label={t('lvTry')}>
                <span className="lv-try">{t('lvTry')}</span>
                {GROUPS.map((g) => (
                  <div key={g.id} className={`lv-group g-${g.id}`}>
                    <span className="lv-group-label">{t(g.label)}</span>
                    {LIVE_PRESETS.filter((x) => x.group === g.id).map((x) => {
                      const Icon = x.icon;
                      const on = prompt === x.prompt[lang];
                      return (
                        <button
                          key={x.id}
                          type="button"
                          className={`lv-preset${on ? ' on' : ''}`}
                          title={x.prompt[lang]}
                          aria-pressed={on}
                          onClick={() => pick(x)}
                        >
                          <Icon size={14} aria-hidden="true" />
                          {tl(x.label)}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className={`lv-input${running ? ' busy' : ''}`}>
                <label className="visually-hidden" htmlFor="lv-prompt">
                  {t('lvPromptLabel')}
                </label>
                <textarea
                  id="lv-prompt"
                  ref={taRef}
                  value={prompt}
                  maxLength={LIVE_MAX_PROMPT}
                  rows={2}
                  placeholder={t('lvPlaceholder')}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={onKeyDown}
                />
                <div className="lv-input-bar">
                  <div className="lv-sources" role="group" aria-label={t('lvSources')}>
                    {LIVE_SOURCES.map((s) => {
                      const on = sources.includes(s);
                      return (
                        <button key={s} type="button" className={`lv-src ep-${s}${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleSource(s)}>
                          <EndpointIcon endpoint={s} size={13} />
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <span className="lv-hint">{t('lvKeys')}</span>
                  <span className={`lv-counter${prompt.length > LIVE_MAX_PROMPT * 0.9 ? ' near' : ''}`}>
                    {prompt.length}/{LIVE_MAX_PROMPT}
                  </span>
                  {settings.showCosts && (
                    <span className="lv-cost" title={`${calls} ${t('lvCallsN')}`}>
                      ≈ {fmtUSD(estimate, lang)} {t('lvPerQuestion')}
                    </span>
                  )}
                  {running ? (
                    <button type="button" className="btn lv-send" onClick={stop}>
                      <Square size={14} />
                      <span>{t('lvStop')}</span>
                    </button>
                  ) : (
                    <button type="submit" className="btn primary lv-send" disabled={!canSend}>
                      <ArrowUp size={16} />
                      <span>{t('lvAsk')}</span>
                    </button>
                  )}
                </div>
              </div>

              {ready && needsCode && !codeOk && (
                <div className="lv-code">
                  <KeyRound size={16} aria-hidden="true" />
                  <label className="lv-code-field">
                    <span>{t('lvCodeLabel')}</span>
                    <input
                      type="password"
                      autoComplete="off"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void unlock();
                        }
                      }}
                    />
                  </label>
                  <button type="button" className="btn small" onClick={() => void unlock()} disabled={!code.trim() || verifying}>
                    {verifying ? <LoaderCircle size={14} className="spin" /> : null}
                    {t('lvUnlock')}
                  </button>
                  <small>{codeErr ? <span className="lv-code-err">{t(codeErr)}</span> : t('lvCodeHelp')}</small>
                </div>
              )}
              {ready && needsCode && codeOk && (
                <p className="lv-code-ok">
                  <KeyRound size={13} aria-hidden="true" />
                  {t('lvCodeSaved')}
                  {remaining !== null && (
                    <span>
                      · {t('lvLeft')}: {fmtInt(remaining, lang)}
                    </span>
                  )}
                  <button type="button" className="lv-link" onClick={forget}>
                    {t('lvForget')}
                  </button>
                </p>
              )}
              {status?.ok && !status.llm && <p className="lv-warn">{t('lvNoLlm')}</p>}
            </form>

            <div className="lv-results" ref={resultsRef}>
              {run ? (
                <RunView key={timing?.start} run={run} timing={timing} notice={notice} flash={flash} onCite={onCite} />
              ) : (
                <IdleView status={status} />
              )}
            </div>
          </div>

          <aside className="stage-aside lv-aside" aria-label={t('lvCalls')}>
            {run ? <Timeline run={run} timing={timing} remaining={remaining} showCosts={settings.showCosts} /> : <HowItWorks />}
          </aside>
        </div>
      </section>
    </>
  );
}

function StatusChips({ status, onRecheck }: { status: LiveStatus | null | undefined; onRecheck: () => void }) {
  const { t } = useI18n();
  if (status === undefined)
    return (
      <span className="chip">
        <LoaderCircle size={12} className="spin" />
        {t('lvChecking')}
      </span>
    );
  if (status === null || !status.hasKey)
    return (
      <div className="lv-status-row">
        <span className="chip warn">
          <TriangleAlert size={12} />
          {status === null ? t('lvChipOff') : t('lvChipNoKey')}
        </span>
        <button type="button" className="icon-btn small" onClick={onRecheck} aria-label={t('lvRecheck')} title={t('lvRecheck')}>
          <RefreshCw size={14} />
        </button>
      </div>
    );
  return (
    <div className="lv-status-row">
      <span className="chip ok">
        <i className="lv-dot" aria-hidden="true" />
        {t('lvReady')}
      </span>
      <span className="chip mono">Web IQ · {status.auth === 'entra' ? 'Entra ID' : 'API key'}</span>
      {status.model && <span className="chip mono">{status.model}</span>}
    </div>
  );
}

function IdleView({ status }: { status: LiveStatus | null | undefined }) {
  const { t } = useI18n();
  return (
    <div className="lv-idle">
      <WebIQMark size={44} />
      <p>{t('lvIdle')}</p>
      {status === null && <p className="lv-warn">{t('lvOff')}</p>}
      {status && !status.hasKey && <p className="lv-warn">{t('lvNoKey')}</p>}
      <p className="lv-fine">{t('lvRealData')}</p>
    </div>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  const steps: { icon: ReactNode; key: UIKey }[] = [
    { icon: <Sparkles size={15} />, key: 'lvStep1' },
    { icon: <span className="lv-step-eps">{LIVE_SOURCES.map((s) => <EndpointIcon key={s} endpoint={s} size={12} />)}</span>, key: 'lvStep2' },
    { icon: <PenLine size={15} />, key: 'lvStep3' },
  ];
  return (
    <>
      <h3>{t('lvHowTitle')}</h3>
      <ol className="lv-how">
        {steps.map((s, i) => (
          <li key={s.key}>
            <span className="lv-how-n">{i + 1}</span>
            <span className="lv-how-icon">{s.icon}</span>
            <p>{t(s.key)}</p>
          </li>
        ))}
      </ol>
      <p className="lv-fine">{t('lvRealData')}</p>
    </>
  );
}

function RunView({
  run,
  timing,
  notice,
  flash,
  onCite,
}: {
  run: LiveRun;
  timing: Timing | null;
  notice: Notice | null;
  flash: { n: number; nonce: number } | null;
  onCite: (n: number) => void;
}) {
  const { t } = useI18n();
  const { calls, order } = run;
  const refs = useMemo(() => liveRefs({ calls, order }), [calls, order]);
  const cited = citedInText(run.answer).filter((n) => refs.has(n));
  const streaming = run.answerState === 'streaming';
  const anyResult = run.order.some((e) => run.calls[e]?.result);

  let kind: string;
  if (run.status === 'aborted') kind = t('lvStopped');
  else if (run.answerState === 'streaming') kind = t('lvWriting');
  else if (run.answerState === 'done') kind = run.model ?? '';
  else if (run.status !== 'running') kind = '';
  else kind = run.model ?? '';
  const pending = !run.plan ? t('lvPlanning') : anyResult ? t('lvWaitingSources') : t('lvSearching');

  return (
    <div className="lv-run">
      <div className="step step-user">
        <div className="bubble user">{run.prompt}</div>
      </div>
      <div className="msg answer lv-answer">
        <span className="avatar webiq">
          <WebIQMark size={30} />
        </span>
        <div className="msg-body">
          <div className="msg-name">
            Web IQ
            <span className="msg-kind">{kind}</span>
            <Clock run={run} timing={timing} />
          </div>
          <div className="bubble agent">
            {run.answer ? (
              <Rich text={toRich(run.answer, streaming)} onCite={onCite} caret={streaming} />
            ) : run.answerState === 'skipped' ? (
              <p className="lv-muted">{t(SKIP_TEXT[run.skipReason ?? ''] ?? 'lvSkipNoSources')}</p>
            ) : run.status === 'running' ? (
              <p className="lv-pending">
                <LoaderCircle size={15} className="spin" />
                {pending}
              </p>
            ) : null}
            {run.answerState === 'error' && run.error && (
              <p className="lv-notice bad">
                <TriangleAlert size={14} />
                {t('lvAnswerError')} · {run.error.code}
              </p>
            )}
            {run.error && run.error.stage !== 'answer' && (
              <p className="lv-notice bad">
                <TriangleAlert size={14} />
                {run.error.code}
                {run.error.message ? `: ${run.error.message}` : ''}
              </p>
            )}
            {notice && (
              <p className={`lv-notice ${notice.tone}`}>
                {notice.tone !== 'muted' && <TriangleAlert size={14} />}
                {t(notice.key)}
                {notice.extra ? ` ${notice.extra}` : ''}
              </p>
            )}
          </div>
          {cited.length > 0 && (
            <div className="lv-cited">
              <h3>{t('lvCited')}</h3>
              <ol>
                {cited.map((n) => {
                  const r = refs.get(n)!;
                  return (
                    <li key={`${n}-${flash?.n === n ? flash.nonce : 0}`} id={`lv-ref-${n}`} className={flash?.n === n ? 'flash' : undefined}>
                      <span className="cite-badge">{n}</span>
                      <TextItem item={r.item} endpoint={r.endpoint} compact />
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
      <Results calls={run.calls} sources={run.sources} browse={run.plan?.browse} running={run.status === 'running'} />
    </div>
  );
}

function Clock({ run, timing }: { run: LiveRun; timing: Timing | null }) {
  const { lang } = useI18n();
  const ms = useElapsed(run, timing);
  return <span className="lv-clock">{fmtMs(ms, lang)}</span>;
}

/** Galerías con todo lo que devolvió Web IQ. No depende de los tokens, así que no se repinta mientras se escribe. */
const Results = memo(function Results({
  calls,
  sources,
  browse,
  running,
}: {
  calls: LiveRun['calls'];
  sources: LiveSource[];
  browse?: string;
  running: boolean;
}) {
  const { t } = useI18n();
  const order: LiveEndpoint[] = ['videos', 'images', 'news', 'web', 'browse'];
  const shown = order.filter((e) => (e === 'browse' ? !!browse || !!calls.browse : sources.includes(e)));
  if (shown.length === 0) return null;
  return (
    <div className="lv-results-all">
      <h3 className="lv-all-title">{t('lvAllResults')}</h3>
      {shown.map((e) => (
        <ResultSection key={e} endpoint={e} call={calls[e]} running={running} />
      ))}
    </div>
  );
});

const SECTION_LABEL: Record<LiveEndpoint, UIKey> = { videos: 'lvVideos', images: 'lvImages', news: 'lvNews', web: 'lvWeb', browse: 'lvPage' };

function ResultSection({ endpoint, call, running }: { endpoint: LiveEndpoint; call?: LiveCall; running: boolean }) {
  const { t, lang } = useI18n();
  const res = call?.result;
  const items = res?.items ?? [];
  return (
    <section className={`lv-section ep-${endpoint}`}>
      <header className="lv-sec-head">
        <EndpointBadge endpoint={endpoint} small />
        <h4>{t(SECTION_LABEL[endpoint])}</h4>
        {res && <span className="lv-count">{fmtInt(items.length, lang)}</span>}
        {res && <span className="lv-sec-ms">{fmtMs(res.latencyMs, lang)}</span>}
      </header>
      {!res ? (
        running ? (
          <Skeleton endpoint={endpoint} />
        ) : null
      ) : res.error ? (
        <p className="lv-notice bad">
          <TriangleAlert size={14} />
          HTTP {res.status || '—'} · {res.error.code}
          {res.error.message ? `: ${res.error.message}` : ''}
        </p>
      ) : items.length === 0 ? (
        <p className="lv-muted">0 {t('resultsN')}</p>
      ) : endpoint === 'videos' ? (
        <ul className="lv-videos">
          {(items as LiveVideoItem[]).map((v, i) => (
            <li key={`${v.url}-${i}`}>
              <VideoCard v={v} />
            </li>
          ))}
        </ul>
      ) : endpoint === 'images' ? (
        <ul className="lv-images">
          {(items as LiveImageItem[]).map((im, i) => (
            <ImageTile key={`${im.url}-${i}`} im={im} />
          ))}
        </ul>
      ) : endpoint === 'news' ? (
        <ul className="lv-news">
          {(items as LiveTextItem[]).map((it, i) => (
            <li key={`${it.url}-${i}`}>
              <TextItem item={it} endpoint="news" withThumb />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="lv-web">
          {(items as LiveTextItem[]).map((it, i) => (
            <li key={`${it.url}-${i}`}>
              <TextItem item={it} endpoint={endpoint} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Skeleton({ endpoint }: { endpoint: LiveEndpoint }) {
  const n = endpoint === 'images' ? 6 : endpoint === 'videos' ? 3 : 2;
  return (
    <div className={`lv-skel lv-skel-${endpoint}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

function TextItem({ item, endpoint, compact = false, withThumb = false }: { item: LiveTextItem; endpoint: LiveEndpoint; compact?: boolean; withThumb?: boolean }) {
  const { lang } = useI18n();
  const url = safeUrl(item.url);
  const thumb = withThumb ? safeUrl(item.thumbnailUrl) : undefined;
  const [thumbOk, setThumbOk] = useState(true);
  return (
    <article className={`lv-item${compact ? ' compact' : ''}${thumb && thumbOk ? ' has-thumb' : ''}`}>
      {thumb && thumbOk && <img className="lv-thumb" src={thumb} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setThumbOk(false)} />}
      <div className="lv-item-body">
        <div className="lv-item-meta">
          {compact && <EndpointBadge endpoint={endpoint} small />}
          {!compact && typeof item.ref === 'number' && <span className="cite-badge">{item.ref}</span>}
          <span className="lv-host">{item.source || hostOf(item.url)}</span>
          {item.date && <span>· {fmtDate(item.date, lang, false)}</span>}
        </div>
        {url ? (
          <a className="lv-title" href={url} target="_blank" rel="noreferrer noopener">
            {item.title || hostOf(item.url)}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        ) : (
          <span className="lv-title">{item.title}</span>
        )}
        {item.snippet && <p className="lv-snippet">{item.snippet}</p>}
      </div>
    </article>
  );
}

function withAutoplay(u: string): string {
  try {
    const url = new URL(u);
    url.searchParams.set('autoplay', '1');
    return url.toString();
  } catch {
    return u;
  }
}

function VideoCard({ v }: { v: LiveVideoItem }) {
  const { t, lang } = useI18n();
  const [playing, setPlaying] = useState(false);
  const [thumbOk, setThumbOk] = useState(true);
  const url = safeUrl(v.url);
  const thumb = safeUrl(v.thumbnailUrl);
  const embed = v.embeddingUrl && /^https:\/\//i.test(v.embeddingUrl) ? v.embeddingUrl : undefined;
  const moments = (v.moments ?? []).filter((m) => m.title).slice(0, 4);
  const meta = [v.publishedBy, typeof v.viewCount === 'number' ? `${fmtCompact(v.viewCount, lang)} ${t('lvViews')}` : null, v.date ? fmtDate(v.date, lang, false) : null].filter(Boolean);

  const cover = (
    <>
      {thumb && thumbOk ? (
        <img src={thumb} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setThumbOk(false)} />
      ) : (
        <span className="lv-video-ph">
          <EndpointIcon endpoint="videos" size={22} />
        </span>
      )}
      <span className="lv-play" aria-hidden="true">
        <Play size={18} fill="currentColor" />
      </span>
      {v.length && <span className="lv-duration">{fmtClock(v.length)}</span>}
    </>
  );

  return (
    <article className="lv-video">
      <div className="lv-video-media">
        {playing && embed ? (
          <iframe
            src={withAutoplay(embed)}
            title={v.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : embed ? (
          <button type="button" className="lv-cover" onClick={() => setPlaying(true)} aria-label={`${t('lvPlay')}: ${v.title}`} title={t('lvPlay')}>
            {cover}
          </button>
        ) : (
          <a className="lv-cover" href={url} target="_blank" rel="noreferrer noopener" aria-label={v.title}>
            {cover}
          </a>
        )}
      </div>
      <div className="lv-video-body">
        <div className="lv-item-meta">
          {typeof v.ref === 'number' && <span className="cite-badge">{v.ref}</span>}
          <span className="lv-host">{url ? hostOf(url) : ''}</span>
        </div>
        {url ? (
          <a className="lv-title" href={url} target="_blank" rel="noreferrer noopener" title={v.title}>
            {v.title}
          </a>
        ) : (
          <span className="lv-title">{v.title}</span>
        )}
        {meta.length > 0 && <p className="lv-video-meta">{meta.join(' · ')}</p>}
        {moments.length > 0 && (
          <ul className="lv-moments" aria-label={t('lvMoments')}>
            {moments.map((m, i) => {
              const best = i === v.bestMomentIndex;
              const href = safeUrl(m.momentUrl) ?? url;
              const label = (
                <>
                  {best && <Star size={11} fill="currentColor" aria-label={t('lvBest')} />}
                  {m.startTime && <b>{fmtClock(m.startTime)}</b>}
                  <span>{m.title}</span>
                </>
              );
              return (
                <li key={i}>
                  {href ? (
                    <a className={`lv-moment${best ? ' best' : ''}`} href={href} target="_blank" rel="noreferrer noopener" title={m.title}>
                      {label}
                    </a>
                  ) : (
                    <span className={`lv-moment${best ? ' best' : ''}`}>{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}

function ImageTile({ im }: { im: LiveImageItem }) {
  const [ok, setOk] = useState(true);
  const src = safeUrl(im.thumbnailUrl) ?? safeUrl(im.url);
  const href = safeUrl(im.hostPageUrl) ?? safeUrl(im.url);
  if (!src || !ok) return null;
  const title = im.title || (href ? hostOf(href) : '');
  return (
    <li>
      <a href={href} target="_blank" rel="noreferrer noopener" title={title}>
        <img src={src} alt={title} loading="lazy" referrerPolicy="no-referrer" onError={() => setOk(false)} />
        {href && <span className="lv-img-host">{hostOf(href)}</span>}
      </a>
    </li>
  );
}

function Bar({ from, to, scale, tone }: { from: number; to: number; scale: number; tone: string }) {
  const left = Math.max(0, Math.min(100, (from / scale) * 100));
  const width = Math.max(1.5, Math.min(100 - left, ((to - from) / scale) * 100));
  return (
    <span className="lv-bar" aria-hidden="true">
      <i className={tone} style={{ left: `${left}%`, width: `${width}%` }} />
    </span>
  );
}

function Timeline({ run, timing, remaining, showCosts }: { run: LiveRun; timing: Timing | null; remaining: number | null; showCosts: boolean }) {
  const { t, lang } = useI18n();
  const elapsed = useElapsed(run, timing);
  const scale = Math.max(elapsed, 1);
  const plan = run.plan;
  const answerEnd = run.answerAt !== undefined ? (run.answerMs !== undefined ? run.answerAt + run.answerMs : elapsed) : undefined;
  const okCalls = run.order.filter((e) => run.calls[e]?.result?.status === 200).length;
  const spent = run.done?.costUsd ?? run.order.reduce((acc, e) => acc + callPrice(e), 0);
  const cited = run.done?.cited.length ?? citedInText(run.answer).length;

  return (
    <>
      <h3>{t('lvCalls')}</h3>
      <ol className="lv-tl">
        <li className="lv-tl-row">
          <div className="lv-tl-head">
            <span className="lv-tl-label">
              <Sparkles size={13} />
              {t('lvPlan')}
            </span>
            {plan ? <span className="lv-ms">{fmtMs(plan.at, lang)}</span> : <LoaderCircle size={13} className="spin" />}
          </div>
          <Bar from={0} to={plan?.at ?? elapsed} scale={scale} tone="plan" />
          {plan && (
            <div className="lv-plan">
              <p className="lv-plan-meta">
                {plan.planner === 'llm' && run.model ? <span className="chip mono">{run.model}</span> : <span className="chip warn">fallback</span>}
                <span>
                  {t('lvMarket')}: {langName(plan.language, lang)} · {plan.region}
                </span>
              </p>
              {plan.freshness && FRESH_TEXT[plan.freshness] && <p className="lv-plan-fresh">{t(FRESH_TEXT[plan.freshness])}</p>}
              {plan.planner === 'fallback' && <p className="lv-fine">{t('lvPlannerFallback')}</p>}
              <ul className="lv-queries">
                {LIVE_SOURCES.filter((s) => plan.queries[s]).map((s) => (
                  <li key={s}>
                    <EndpointBadge endpoint={s} small />
                    <q>{plan.queries[s]}</q>
                  </li>
                ))}
                {plan.browse && (
                  <li>
                    <EndpointBadge endpoint="browse" small />
                    <q>{hostOf(plan.browse)}</q>
                  </li>
                )}
              </ul>
            </div>
          )}
        </li>
        {run.order.map((e) => {
          const c = run.calls[e]!;
          const r = c.result;
          return (
            <li key={e} className="lv-tl-row">
              <div className="lv-tl-head">
                <EndpointBadge endpoint={e} small />
                {r ? <span className={`http${r.status === 200 ? ' s200' : ''}`}>{r.status || 'ERR'}</span> : <LoaderCircle size={13} className="spin" />}
                {r && (
                  <span className="lv-n">
                    {fmtInt(r.count, lang)} {t('resultsN')}
                  </span>
                )}
                {r && <span className="lv-ms">{fmtMs(r.latencyMs, lang)}</span>}
              </div>
              <Bar from={c.at} to={r?.at ?? elapsed} scale={scale} tone={`ep-${e}`} />
              {r?.error && <p className="lv-call-err">{r.error.code}</p>}
              <details className="lv-req">
                <summary>
                  {t('lvRequest')}
                  {r?.traceId && (
                    <code title={r.traceId} className="lv-trace">
                      {shortTrace(r.traceId)}
                    </code>
                  )}
                </summary>
                <pre>{JSON.stringify(c.request, null, 2)}</pre>
              </details>
            </li>
          );
        })}
        {run.answerAt !== undefined && answerEnd !== undefined && (
          <li className="lv-tl-row">
            <div className="lv-tl-head">
              <span className="lv-tl-label">
                <PenLine size={13} />
                {t('lvAnswerRow')}
              </span>
              {run.answerState === 'streaming' ? <LoaderCircle size={13} className="spin" /> : <span className="lv-ms">{fmtMs(answerEnd - run.answerAt, lang)}</span>}
            </div>
            <Bar from={run.answerAt} to={answerEnd} scale={scale} tone="answer" />
          </li>
        )}
      </ol>

      <h3>{t('metrics')}</h3>
      <dl className="live-metrics">
        <div>
          <dt>{t('lvTotal')}</dt>
          <dd>{fmtMs(elapsed, lang)}</dd>
        </div>
        <div>
          <dt>{t('lvFirstText')}</dt>
          <dd>{timing?.first !== undefined ? fmtMs(timing.first, lang) : '—'}</dd>
        </div>
        <div>
          <dt>{t('mCalls')}</dt>
          <dd className={run.order.length > 0 && okCalls === run.order.length ? 'good' : undefined}>
            {okCalls}
            <small>/{run.order.length}</small>
          </dd>
        </div>
        <div>
          <dt>{t('lvCitedN')}</dt>
          <dd>{cited}</dd>
        </div>
        {showCosts && (
          <div>
            <dt>{t('lvWebiqCost')}</dt>
            <dd>{fmtUSD(spent, lang)}</dd>
          </div>
        )}
        {run.usage && (
          <div>
            <dt>{t('lvTokens')}</dt>
            <dd>
              {fmtInt(run.usage.prompt ?? 0, lang)}
              <small>/{fmtInt(run.usage.completion ?? 0, lang)}</small>
            </dd>
          </div>
        )}
        {remaining !== null && (
          <div>
            <dt>{t('lvLeft')}</dt>
            <dd>{fmtInt(remaining, lang)}</dd>
          </div>
        )}
      </dl>
    </>
  );
}
