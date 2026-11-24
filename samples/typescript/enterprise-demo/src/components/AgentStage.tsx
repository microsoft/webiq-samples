// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { BookOpen, Bot, Check, Clock, Database, ExternalLink, LoaderCircle, RotateCw, Search, TriangleAlert, Wrench, Zap } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { ENDPOINTS, type Scenario, type Source, type Step, type Variant } from '../data/types';
import { useI18n } from '../i18n';
import { fmtMs, fmtUSD } from '../lib/cost';
import { fmtDate, fmtTime } from '../lib/format';
import type { Settings } from '../lib/settings';
import { answerTypingMs, metricsAt, progress, type Timeline, type TimedCall, type TimedStep } from '../lib/timeline';
import { Artifact } from './Artifact';
import { WebIQMark } from './Brand';
import { EndpointBadge, SourceKindIcon } from './Icon';
import { Rich, typedPrefix, type CiteHandler } from './Rich';

interface Props {
  scenario: Scenario;
  variant: Variant;
  tl: Timeline;
  elapsed: number;
  playing: boolean;
  settings: Settings;
  onCite: CiteHandler;
  onSource: (id: string) => void;
}

const sourceMap = (s: Scenario) => new Map(s.sources.map((x) => [x.id, x]));

export function AgentStage({ scenario: s, variant: v, tl, elapsed, playing, settings, onCite, onSource }: Props) {
  const { t, tl: tr, lang } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const visible = tl.steps.filter((ts) => elapsed >= ts.start);
  const idle = !playing && elapsed === 0;
  const m = metricsAt(tl, s.sources, elapsed);
  const sources = sourceMap(s);

  // La conversación sigue al agente salvo que se haya subido para revisar algo.
  useEffect(() => {
    stick.current = true;
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [s.id, v]);
  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [elapsed]);

  return (
    <section className={`stage v-${v}`} aria-label={t('agentRun')}>
      <header className="panel-head">
        <div className="ph-title">
          {v === 'webiq' ? <WebIQMark size={18} /> : <Bot size={17} aria-hidden="true" />}
          <h2>{t('agentRun')}</h2>
          <span className="ph-task">{tr(s.variants[v].label)}</span>
        </div>
        <div className="ph-meta">
          {s.foundry && <span className="chip mono">Foundry IQ</span>}
          {v === 'webiq' ? s.endpoints.map((e) => <EndpointBadge key={e} endpoint={e} small />) : <span className="chip mono">bing_grounding</span>}
        </div>
      </header>
      <div className="stage-body">
        <div
          className="conversation"
          ref={listRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
          }}
        >
          {idle ? (
            <IdleState scenario={s} variant={v} />
          ) : (
            visible.map((ts) => (
              <StepView key={ts.step.id} ts={ts} tl={tl} scenario={s} variant={v} sources={sources} elapsed={elapsed} onCite={onCite} onSource={onSource} />
            ))
          )}
        </div>
        <aside className="stage-aside" aria-label={t('metrics')}>
          <h3>{t('metrics')}</h3>
          {v === 'webiq' ? (
            <dl className="live-metrics">
              <div>
                <dt>{t('mCalls')}</dt>
                <dd>
                  {m.calls}
                  {m.inflight > 0 && (
                    <small>
                      {' '}
                      +{m.inflight} {t('mInflight')}
                    </small>
                  )}
                </dd>
              </div>
              <div>
                <dt>{t('mSources')}</dt>
                <dd>{m.sources}</dd>
              </div>
              <div>
                <dt>{t('mDated')}</dt>
                <dd className={m.sources > 0 ? 'good' : undefined}>
                  {m.dated}
                  <small>/{m.sources}</small>
                </dd>
              </div>
              <div>
                <dt>{t('mPassages')}</dt>
                <dd className={m.sources > 0 ? 'good' : undefined}>
                  {m.passages}
                  <small>/{m.sources}</small>
                </dd>
              </div>
              <div>
                <dt>{t('mApiMs')}</dt>
                <dd>{fmtMs(m.apiMs, lang)}</dd>
              </div>
              {settings.showCosts && (
                <div>
                  <dt>{t('mCost')}</dt>
                  <dd>{fmtUSD(m.cost, lang)}</dd>
                </div>
              )}
            </dl>
          ) : (
            <dl className="live-metrics">
              <div>
                <dt>{t('mBingTx')}</dt>
                <dd>{m.bingTx}</dd>
              </div>
              <div>
                <dt>{t('mCitations')}</dt>
                <dd>{m.citations}</dd>
              </div>
              <div>
                <dt>{t('mDated')}</dt>
                <dd className={m.citations > 0 ? 'bad' : undefined}>
                  0<small>/{m.citations}</small>
                </dd>
              </div>
              <div>
                <dt>{t('mPassages')}</dt>
                <dd className={m.citations > 0 ? 'bad' : undefined}>
                  0<small>/{m.citations}</small>
                </dd>
              </div>
              {settings.showCosts && (
                <div>
                  <dt>{t('mCost')}</dt>
                  <dd>{fmtUSD(m.cost, lang)}</dd>
                </div>
              )}
            </dl>
          )}
          {v === 'webiq' && m.calls > 0 && (
            <div className="ep-tally">
              <h4>{t('mEndpoints')}</h4>
              <ul>
                {ENDPOINTS.filter((e) => m.byEndpoint[e]).map((e) => (
                  <li key={e}>
                    <EndpointBadge endpoint={e} small />
                    <span className="ep-n">×{m.byEndpoint[e]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className={`receives ${v}`}>
            <h4>{t('appReceives')}</h4>
            <p>{t(v === 'webiq' ? 'receivesWebIQ' : 'receivesBing')}</p>
          </div>
          {settings.showDisclaimer && (
            <p className="fictitious" title={t(s.dataNote ? 'mixedDataNote' : 'fictitiousNote')}>
              {s.dataNote ? tr(s.dataNote) : t('fictitious')}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function IdleState({ scenario: s, variant: v }: { scenario: Scenario; variant: Variant }) {
  const { t, tl } = useI18n();
  const first = s.variants[v].steps.find((st): st is Extract<Step, { kind: 'user' }> => st.kind === 'user');
  return (
    <div className="idle">
      <p className="idle-hint">{t('idleHint')}</p>
      <dl className="idle-dl">
        <div>
          <dt>{t('theNeed')}</dt>
          <dd className="idle-need">{tl(s.need)}</dd>
        </div>
        {first && (
          <div>
            <dt>{t('theQuestion')}</dt>
            <dd>
              <div className="bubble user idle-preview">
                <Rich text={tl(first.text)} />
              </div>
            </dd>
          </div>
        )}
        <div>
          <dt>{t('keyPoints')}</dt>
          <dd>
            <ul className="idle-points">
              {s.takeaways.map((x, i) => (
                <li key={i}>{tl(x)}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </div>
  );
}

interface StepProps {
  ts: TimedStep;
  tl: Timeline;
  scenario: Scenario;
  variant: Variant;
  sources: Map<string, Source>;
  elapsed: number;
  onCite: CiteHandler;
  onSource: (id: string) => void;
}

function AgentAvatar({ variant }: { variant: Variant }) {
  return <span className={`avatar ${variant}`}>{variant === 'webiq' ? <WebIQMark size={30} /> : <Bot size={15} aria-hidden="true" />}</span>;
}

function StepView({ ts, tl: timeline, scenario: s, variant: v, sources, elapsed, onCite, onSource }: StepProps) {
  const { t, tl } = useI18n();
  const st = ts.step;
  const p = progress(ts.start, ts.end, elapsed);
  const done = elapsed >= ts.end;
  const common = { 'data-step': st.id, className: `step step-${st.kind}${elapsed - ts.start < 260 ? ' entering' : ''}` };
  const agentName = t(v === 'bing' ? 'agentBing' : s.foundry ? 'agentFoundry' : 'agentWebIQ');

  switch (st.kind) {
    case 'user': {
      const text = tl(st.text);
      return (
        <div {...common}>
          <div className="bubble user">
            <Rich text={typedPrefix(text, text.length * Math.min(1, p * 1.6))} />
          </div>
        </div>
      );
    }

    case 'plan':
    case 'reason': {
      const text = tl(st.text);
      return (
        <div {...common}>
          <div className="msg">
            <AgentAvatar variant={v} />
            <div className="msg-body">
              <span className="msg-name">
                {agentName}
                <span className="msg-kind">{t(st.kind === 'plan' ? 'plan' : 'reasoning')}</span>
              </span>
              <div className="bubble agent">
                <Rich text={typedPrefix(text, text.length * p)} caret={!done} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'calls': {
      const mine = timeline.calls.filter((c) => c.stepId === st.id);
      const primary = mine.filter((c) => !c.call.retryOf).length;
      return (
        <div {...common}>
          <p className="calls-head">
            <Zap size={14} aria-hidden="true" />
            {primary > 1 ? `${primary} ${t('parallelCalls')}` : `1 ${t('oneCall')}`}
          </p>
          <div className="calls-grid">
            {mine.map((tc) => (
              <CallCard key={tc.call.id} tc={tc} sources={sources} elapsed={elapsed} onSource={onSource} />
            ))}
          </div>
        </div>
      );
    }

    case 'bing': {
      const typed = Math.min(1, p / 0.3);
      const searching = p >= 0.3 && p < 0.8;
      const showCites = p >= 0.8;
      const cites = st.citations.map((id) => sources.get(id)).filter((x): x is Source => !!x);
      const numbering = s.variants[v].citations;
      return (
        <div {...common}>
          <div className="tool-card bing-card">
            <div className="tool-head">
              <span className="tool-icon">
                <Search size={14} aria-hidden="true" />
              </span>
              <code className="tool-name">bing_grounding</code>
              <span className="tool-by">{t('bingTool')}</span>
              <span className="tool-status">{showCites ? <Check size={14} aria-label="OK" /> : <LoaderCircle size={13} className="spin" aria-hidden="true" />}</span>
            </div>
            <div className="bing-config">
              {st.config.split(' · ').map((c) => (
                <span key={c} className="chip mono">
                  {c}
                </span>
              ))}
            </div>
            <div className="tool-args">
              <span className="kv-label">{t('bingQuery')}</span>
              <code>
                {st.query.slice(0, Math.ceil(st.query.length * typed))}
                {typed < 1 && <span className="caret" aria-hidden="true" />}
              </code>
            </div>
            {searching && (
              <p className="bing-searching">
                <LoaderCircle size={13} className="spin" aria-hidden="true" /> {t('bingSearching')}
              </p>
            )}
            {showCites && (
              <div className="tool-result bing-cites">
                <span className="kv-label">{t('bingCitations')}</span>
                <ol>
                  {cites.map((x, i) => {
                    const n = numbering.indexOf(x.id) + 1 || i + 1;
                    return (
                      <li key={x.id}>
                        <button type="button" className="bing-cite" onClick={() => onSource(x.id)}>
                          <span className="cite-badge">[{n}]</span>
                          <span className="bc-text">
                            <span className="bc-title">{x.title}</span>
                            <span className="bc-url">{x.url}</span>
                          </span>
                          <span className="bc-missing">
                            <span className="chip warn">{t('noPassage')}</span>
                            <span className="chip warn">{t('noDate')}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <a className="bing-link" href={`https://www.bing.com/search?q=${encodeURIComponent(st.query)}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={12} aria-hidden="true" />
                  https://www.bing.com/search?q={st.query}
                </a>
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'kb': {
      const asked = Math.min(st.queries.length, Math.ceil((p / 0.55) * st.queries.length));
      const showDocs = p >= 0.6;
      const docs = st.results.map((id) => sources.get(id)).filter((x): x is Source => !!x);
      const numbering = s.variants[v].citations;
      return (
        <div {...common}>
          <div className="tool-card kb-card">
            <div className="tool-head">
              <span className="tool-icon">
                <Database size={14} aria-hidden="true" />
              </span>
              <code className="tool-name">knowledge_base_retrieve</code>
              <span className="tool-by">{t('kbTool')}</span>
              <span className="tool-status">{showDocs ? <Check size={14} aria-label="OK" /> : <LoaderCircle size={13} className="spin" aria-hidden="true" />}</span>
            </div>
            <div className="bing-config">
              <span className="chip mono">{st.knowledgeBase}</span>
              <span className="chip">{tl(st.label)}</span>
              {showDocs && <span className="chip mono">{st.latencyMs} ms</span>}
            </div>
            <div className="tool-args">
              <span className="kv-label">{t('kbQueries')}</span>
              <ul className="kb-queries">
                {st.queries.slice(0, asked).map((q) => (
                  <li key={q}>
                    <code>{q}</code>
                  </li>
                ))}
              </ul>
            </div>
            {showDocs && (
              <div className="tool-result kb-docs">
                <span className="kv-label">
                  {docs.length} {t('kbResults')}
                </span>
                <ol>
                  {docs.map((x) => {
                    const n = numbering.indexOf(x.id) + 1;
                    return (
                      <li key={x.id}>
                        <button type="button" className="bing-cite" onClick={() => onSource(x.id)}>
                          {n > 0 ? <span className="cite-badge">[{n}]</span> : <BookOpen size={14} className="kb-doc-icon" aria-hidden="true" />}
                          <span className="bc-text">
                            <span className="bc-title">{x.title}</span>
                            <span className="bc-url">{x.url.split('/').pop()}</span>
                          </span>
                          <span className="bc-missing">
                            <span className="chip">{t('syntheticDoc')}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'gap':
      return (
        <div {...common}>
          <div className="gap-card" role="note" aria-label={t('gap')}>
            <span className="gap-icon">
              <TriangleAlert size={16} aria-hidden="true" />
            </span>
            <div className="gap-body">
              <strong className="gap-title">{tl(st.title)}</strong>
              <p>{tl(st.text)}</p>
              <p className="gap-work">
                <Wrench size={13} aria-hidden="true" />
                <span>
                  <b>{t('workaround')}:</b> {tl(st.workaround)}
                </span>
              </p>
            </div>
          </div>
        </div>
      );

    case 'answer': {
      const text = tl(st.text);
      const typing = answerTypingMs(st.text);
      const tp = progress(ts.start, ts.start + typing, elapsed);
      const typed = tp >= 1;
      return (
        <div {...common}>
          <div className="msg answer">
            <AgentAvatar variant={v} />
            <div className="msg-body">
              <span className="msg-name">
                {agentName}
                <span className="msg-kind">{t('answer')}</span>
              </span>
              <div className="bubble agent answer-bubble">
                <Rich text={typedPrefix(text, text.length * tp)} onCite={onCite} caret={!typed} />
              </div>
              {typed && st.flags && st.flags.length > 0 && (
                <ul className="answer-flags">
                  {st.flags.map((f, i) => (
                    <li key={i} className="aflag">
                      <Check size={12} aria-hidden="true" />
                      {tl(f)}
                    </li>
                  ))}
                </ul>
              )}
              {typed && st.artifact && <Artifact artifact={st.artifact} sources={s.sources} onCite={onCite} />}
            </div>
          </div>
        </div>
      );
    }
  }
}

/** Parámetros de la petición como chips «clave: valor», con los nombres reales de la API. */
function paramChips(request: Record<string, unknown>): [string, string][] {
  return Object.entries(request)
    .filter(([k]) => k !== 'query' && k !== 'url')
    .map(([k, val]) => [k, Array.isArray(val) ? val.join(', ') : String(val)]);
}

function CallCard({ tc, sources, elapsed, onSource }: { tc: TimedCall; sources: Map<string, Source>; elapsed: number; onSource: (id: string) => void }) {
  const { t, tl, lang } = useI18n();
  const c = tc.call;
  const started = elapsed >= tc.start;
  const finished = elapsed >= tc.end;
  const results = c.results.map((id) => sources.get(id)).filter((x): x is Source => !!x);
  const target = typeof c.request.query === 'string' ? c.request.query : typeof c.request.url === 'string' ? c.request.url : '';
  const is202 = c.status === 202;

  return (
    <div className={`call-card${finished ? ' done' : ''}${started ? '' : ' queued'}${is202 && finished ? ' pending' : ''}`}>
      <div className="call-head">
        <EndpointBadge endpoint={c.endpoint} />
        <span className="call-label">{tl(c.label)}</span>
        {c.retryOf && <span className="chip">{t('retry')}</span>}
        <span className="call-status">
          {!started ? (
            <>
              <Clock size={12} aria-hidden="true" /> {t('queued')}
            </>
          ) : !finished ? (
            <>
              <LoaderCircle size={12} className="spin" aria-hidden="true" /> {t('calling')}
            </>
          ) : is202 ? (
            <span className="http s202">202 · retryAfter {c.retryAfter}</span>
          ) : (
            <span className="http s200">200 · {fmtMs(c.latencyMs, lang)}</span>
          )}
        </span>
      </div>
      {target && (
        <code className="call-target" title={target}>
          {target}
        </code>
      )}
      <div className="call-params">
        {paramChips(c.request).map(([k, val]) => (
          <span key={k} className="param">
            {k}: <b>{val}</b>
          </span>
        ))}
      </div>
      {finished && is202 && (
        <p className="call-note">
          <RotateCw size={12} aria-hidden="true" /> {t('notReady')} {c.retryAfter}
        </p>
      )}
      {finished && !is202 && results.length > 0 && (
        <ul className="call-results">
          {results.map((x) => (
            <li key={x.id}>
              <button type="button" className="call-result" onClick={() => onSource(x.id)}>
                <SourceKindIcon kind={x.kind} size={13} />
                <span className="cr-text">
                  <span className="cr-title" lang={x.language}>
                    {x.title}
                  </span>
                  <span className="cr-meta">
                    {x.publisher} · {fmtDate(x.date, lang)}
                    {x.crawledAt && (
                      <>
                        {' · '}
                        <span className="cr-live">
                          {t('readLive')} {fmtTime(x.crawledAt)}
                        </span>
                      </>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {finished && !is202 && c.returned !== undefined && c.returned > results.length && (
        <p className="call-more">
          {c.returned} {t('resultsN')} · {t('showingN')} {results.length}
        </p>
      )}
    </div>
  );
}
