// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Bot, Check, Database, ExternalLink, FileText, Globe, KeyRound, LoaderCircle, Newspaper, Play, RotateCcw, RotateCw, Square, TriangleAlert, Wrench } from 'lucide-react';
import { Fragment, memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Scenario, Source } from '../../data/types';
import { useI18n, type UIKey } from '../../i18n';
import { fmtInt, fmtMs } from '../../lib/cost';
import { hostOf } from '../../lib/format';
import {
  applyFoundryEvent,
  askFoundry,
  MAX_AGENT_PROMPT,
  newFoundryRun,
  parseBlocks,
  parseInline,
  trimPartial,
  type DocRef,
  type FoundryRun,
  type FoundryTool,
  type Inline,
  type MdBlock,
} from '../../lib/foundry';
import { getAccessCode, getStatus, LiveHttpError, setAccessCode, verifyAccessCode, type LiveStatus } from '../../lib/live';
import { CopyButton } from '../Copy';

type Notice = { key: UIKey; extra?: string };

const docStem = (url: string) => (url.split('/').pop() ?? url).replace(/\.md$/i, '');

function toolLabel(x: FoundryTool, t: (k: UIKey) => string): { icon: ReactNode; label: string } {
  if (x.server === 'foundry_iq_contratos' || x.name === 'knowledge_base_retrieve') return { icon: <Database size={15} />, label: t('kbTool') };
  if (x.name === 'news') return { icon: <Newspaper size={15} />, label: 'Web IQ · news' };
  if (x.name === 'web') return { icon: <Globe size={15} />, label: 'Web IQ · web' };
  return { icon: <Wrench size={15} />, label: [x.server, x.name].filter(Boolean).join(' · ') || 'MCP' };
}

interface Chip {
  key: string;
  kind: 'doc' | 'web';
  text: string;
  title: string;
  href?: string;
}

/** Fuentes de una llamada sin repetir: los fragmentos de un mismo documento se agrupan por documento. */
function toolChips(x: FoundryTool, docs: DocRef[]): Chip[] {
  const out = new Map<string, Chip>();
  for (const src of x.sources) {
    const doc = docs.find((d) => src.url?.includes(d.stem) || src.title === d.title);
    const kind = doc || x.server === 'foundry_iq_contratos' ? 'doc' : 'web';
    const href = doc?.href ?? (src.url && /^https:\/\//i.test(src.url) ? src.url : undefined);
    const text = doc ? `${docStem(doc.href).slice(0, 2)} · ${doc.title.split(' · ')[0]}` : src.publisher || (src.url ? hostOf(src.url) : src.title);
    const key = `${kind}|${href ?? ''}|${text}`;
    const title = [src.title, src.section, src.date].filter(Boolean).join(' · ');
    const prev = out.get(key);
    if (prev) {
      if (src.section && !prev.title.includes(src.section)) prev.title += `\n${src.section}`;
    } else out.set(key, { key, kind, text, title, href });
  }
  return [...out.values()];
}

function Inl({ xs }: { xs: Inline[] }) {
  return (
    <>
      {xs.map((x, i) => {
        if (x.t === 'text') return <Fragment key={i}>{x.v}</Fragment>;
        if (x.t === 'b')
          return (
            <strong key={i}>
              <Inl xs={x.v} />
            </strong>
          );
        if (x.t === 'link')
          return (
            <a key={i} href={x.href} target="_blank" rel="noopener noreferrer">
              {x.label}
            </a>
          );
        const icon = x.kind === 'doc' ? <FileText size={11} aria-hidden="true" /> : x.kind === 'kb' ? <Database size={11} aria-hidden="true" /> : <Globe size={11} aria-hidden="true" />;
        return x.href ? (
          <a key={i} className={`fd-cite ${x.kind}`} href={x.href} target="_blank" rel="noopener noreferrer" title={x.title}>
            {icon}
            <span className="fd-cite-t">{x.label}</span>
          </a>
        ) : (
          <span key={i} className={`fd-cite ${x.kind}`} title={x.title}>
            {icon}
            <span className="fd-cite-t">{x.label}</span>
          </span>
        );
      })}
    </>
  );
}

function Block({ b, docs }: { b: MdBlock; docs: DocRef[] }) {
  const inl = (s: string) => <Inl xs={parseInline(s, docs)} />;
  switch (b.t) {
    case 'h':
      return (
        <h4>
          {b.num && <span className="fd-h-num">{b.num}</span>}
          {inl(b.text)}
        </h4>
      );
    case 'p':
      return <p>{inl(b.text)}</p>;
    case 'li':
      return (
        <p className="fd-li" style={{ paddingLeft: `${1.2 + b.level * 1.2}em` }}>
          <span className="fd-li-mark" aria-hidden="true">
            {b.marker}
          </span>
          {inl(b.text)}
        </p>
      );
    case 'quote':
      return <blockquote>{inl(b.text)}</blockquote>;
    case 'hr':
      return <hr />;
    case 'table':
      return (
        <div className="fd-table">
          <table>
            <thead>
              <tr>
                {b.head.map((c, i) => (
                  <th key={i} className={`al-${b.align[i] ?? 'l'}`}>
                    {inl(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, k) => (
                <tr key={k}>
                  {r.map((c, i) => (
                    <td key={i} className={`al-${b.align[i] ?? 'l'}`}>
                      {inl(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

const Answer = memo(function Answer({ text, streaming, docs }: { text: string; streaming: boolean; docs: DocRef[] }) {
  const blocks = useMemo(() => parseBlocks(streaming ? trimPartial(text) : text), [text, streaming]);
  return (
    <div className="fd-md">
      {blocks.map((b, i) => (
        <Block key={i} b={b} docs={docs} />
      ))}
      {streaming && <span className="caret" aria-hidden="true" />}
    </div>
  );
});

function ToolRow({ x, docs, now }: { x: FoundryTool; docs: DocRef[]; now: number }) {
  const { t, lang } = useI18n();
  const { icon, label } = toolLabel(x, t);
  const ms = (x.endAt ?? now) - x.startAt;
  const chips = useMemo(() => toolChips(x, docs), [x, docs]);
  return (
    <li className={`fd-tool ${x.status}`}>
      <span className="fd-tool-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="fd-tool-body">
        <div className="fd-tool-head">
          <strong>{label}</strong>
          {x.status === 'calling' ? (
            <LoaderCircle size={13} className="spin" aria-label={t('fdRunning')} />
          ) : x.status === 'completed' ? (
            <Check size={13} className="fd-ok" aria-hidden="true" />
          ) : (
            <TriangleAlert size={13} className="fd-bad" aria-hidden="true" />
          )}
          {ms > 0 && <span className="muted small">{fmtMs(ms, lang)}</span>}
          {x.count !== null && x.status === 'completed' && (
            <span className="muted small">
              · {fmtInt(x.count, lang)} {t('fdResults')}
            </span>
          )}
        </div>
        {x.queries.length > 0 && (
          <div className="fd-queries">
            {x.queries.map((q, i) => (
              <code key={i}>{q}</code>
            ))}
          </div>
        )}
        {x.status === 'failed' && <p className="fd-tool-err">{t('fdToolErr')}</p>}
        {chips.length > 0 && (
          <div className="fd-tool-src">
            {chips.slice(0, 6).map((c) =>
              c.href ? (
                <a key={c.key} className={`fd-cite ${c.kind}`} href={c.href} target="_blank" rel="noopener noreferrer" title={c.title}>
                  {c.kind === 'doc' ? <FileText size={11} aria-hidden="true" /> : <Globe size={11} aria-hidden="true" />}
                  <span className="fd-cite-t">{c.text}</span>
                </a>
              ) : (
                <span key={c.key} className={`fd-cite ${c.kind}`} title={c.title}>
                  <span className="fd-cite-t">{c.text}</span>
                </span>
              ),
            )}
            {chips.length > 6 && <span className="muted small">+{chips.length - 6}</span>}
          </div>
        )}
      </div>
    </li>
  );
}

export function FoundryTab({ scenario: s }: { scenario: Scenario }) {
  const { t, tl, lang } = useI18n();
  const agent = s.foundry!;
  const docSources = useMemo(() => agent.docs.map((id) => s.sources.find((x) => x.id === id)).filter((x): x is Source => !!x), [agent, s.sources]);
  const docs = useMemo<DocRef[]>(() => docSources.map((d) => ({ stem: docStem(d.url), title: d.title, href: d.url })), [docSources]);
  const [status, setStatus] = useState<LiveStatus | null | undefined>(undefined);
  const [check, setCheck] = useState(0);
  const [prompt, setPrompt] = useState(() => agent.prompt[lang]);
  const [run, setRun] = useState<FoundryRun | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [codeOk, setCodeOk] = useState(false);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState<UIKey | null>(null);
  const [verifying, setVerifying] = useState(false);
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
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [needsCode]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Al cambiar de idioma, el prompt sin tocar se traduce.
  useEffect(() => {
    setPrompt((cur) => (cur === agent.prompt.es || cur === agent.prompt.en ? agent.prompt[lang] : cur));
  }, [lang, agent]);

  const running = run?.status === 'running';
  useEffect(() => {
    if (!running) return;
    setNow(performance.now());
    const id = window.setInterval(() => setNow(performance.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  const ready = !!status?.ok && status.foundry;
  const unlocked = !needsCode || codeOk;
  const trimmed = prompt.trim();
  const canRun = ready && unlocked && !running && trimmed.length > 0;

  const go = async () => {
    if (!canRun) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const id = ++runId.current;
    setNotice(null);
    setStartedAt(performance.now());
    setRun(newFoundryRun(trimmed));
    try {
      await askFoundry(
        trimmed,
        lang,
        (ev) => {
          if (runId.current !== id) return;
          setRun((r) => (r ? applyFoundryEvent(r, ev) : r));
          if (ev.type === 'done' && typeof ev.remainingToday === 'number') setRemaining(ev.remainingToday);
        },
        ctrl.signal,
      );
      if (runId.current === id) setRun((r) => (r?.status === 'running' ? { ...r, status: 'error', error: { code: 'StreamCut', message: t('lvStreamCut') } } : r));
    } catch (e) {
      if (runId.current !== id) return;
      if (ctrl.signal.aborted) {
        setRun((r) => (r ? { ...r, status: 'aborted' } : r));
        return;
      }
      setRun(null);
      if (!(e instanceof LiveHttpError)) {
        setNotice({ key: 'lvErrNet' });
        return;
      }
      if (e.status === 401) {
        setAccessCode('');
        setCodeOk(false);
        setNotice({ key: 'lvCodeBad' });
      } else if (e.code === 'RateLimited') setNotice({ key: 'lvErrRate', extra: `${e.retryAfter ?? 30} s.` });
      else if (e.code === 'DailyLimit') setNotice({ key: 'fdErrDaily' });
      else if (e.code === 'Busy') setNotice({ key: 'fdErrBusy' });
      else if (e.code === 'FoundryNotConfigured') setNotice({ key: 'fdOff' });
      else setNotice({ key: 'fdErr', extra: e.message });
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

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
      setNotice((n) => (n?.key === 'lvCodeBad' ? null : n));
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

  const elapsed = run?.done ? run.done.at : running ? Math.max(0, now - startedAt) : null;
  const streaming = running && run.text.length > 0;
  const toolNow = run ? run.at + (running ? Math.max(0, now - startedAt - run.at) : 0) : 0;

  return (
    <div className="fd-tab">
      <p className="tab-intro">{t('fdIntro')}</p>
      <div className="fd-grid">
        <aside className="fd-side">
          <dl className="fd-meta">
            <div>
              <dt>{t('fdAgent')}</dt>
              <dd>
                <Bot size={13} aria-hidden="true" /> <code>{agent.name}</code> <span className="muted small">v{agent.version}</span>
              </dd>
            </div>
            <div>
              <dt>{t('fdProject')}</dt>
              <dd>
                <code>{agent.project}</code>
              </dd>
            </div>
            <div>
              <dt>{t('fdModel')}</dt>
              <dd>
                <code>{run?.model ?? agent.model}</code>
              </dd>
            </div>
            <div>
              <dt>{t('fdKb')}</dt>
              <dd>
                <code>{agent.knowledgeBase}</code>
              </dd>
            </div>
            <div>
              <dt>{t('fdTools')}</dt>
              <dd className="fd-meta-tools">
                {agent.tools.map((x) => (
                  <code key={x}>{x}</code>
                ))}
              </dd>
            </div>
          </dl>
          <a className="btn small" href={agent.portal} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} aria-hidden="true" />
            {t('fdPlayground')}
          </a>
          <h4 className="fd-side-title">{t('fdDocs')}</h4>
          <ol className="fd-docs">
            {docSources.map((d) => (
              <li key={d.id}>
                <FileText size={13} aria-hidden="true" />
                <a href={d.url} target="_blank" rel="noopener noreferrer" title={tl({ es: d.excerpt, en: d.tr?.en ?? d.excerpt })}>
                  {d.title}
                </a>
              </li>
            ))}
          </ol>
        </aside>

        <div className="fd-main">
          {status === undefined ? (
            <p className="live-status">
              <LoaderCircle size={14} className="spin" aria-hidden="true" />
              {t('lvChecking')}
            </p>
          ) : !ready ? (
            <div className="live-status off">
              <p>{status ? t('fdOff') : t('lvOff')}</p>
              <button type="button" className="btn small ghost" onClick={() => setCheck((c) => c + 1)}>
                <RotateCw size={14} aria-hidden="true" />
                {t('lvRecheck')}
              </button>
            </div>
          ) : (
            <p className="live-status ok">
              <Bot size={14} aria-hidden="true" />
              {t('fdReady')} · <code>{status.foundryAgent ?? agent.name}</code>
            </p>
          )}

          <form
            className="fd-form"
            onSubmit={(e) => {
              e.preventDefault();
              void go();
            }}
          >
            <label className="fd-prompt">
              <span>{t('fdPrompt')}</span>
              <textarea
                className="code-input"
                value={prompt}
                maxLength={MAX_AGENT_PROMPT}
                rows={7}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void go();
                  }
                }}
              />
            </label>
            <div className="live-actions">
              {running ? (
                <button type="button" className="btn primary" onClick={stop}>
                  <Square size={14} aria-hidden="true" />
                  {t('lvStop')}
                </button>
              ) : (
                <button type="submit" className="btn primary" disabled={!canRun}>
                  <Play size={14} aria-hidden="true" />
                  {t('fdRun')}
                </button>
              )}
              <button type="button" className="btn small ghost" onClick={() => setPrompt(agent.prompt[lang])} disabled={running || prompt === agent.prompt[lang]}>
                <RotateCcw size={14} aria-hidden="true" />
                {t('fdReset')}
              </button>
              <CopyButton text={prompt} label={t('fdCopyPrompt')} />
              <span className="muted small">
                {fmtInt(prompt.length, lang)}/{fmtInt(MAX_AGENT_PROMPT, lang)}
              </span>
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
                <small>{codeErr ? <span className="lv-code-err">{t(codeErr)}</span> : t('fdCodeHint')}</small>
              </div>
            )}
            {ready && needsCode && codeOk && (
              <p className="lv-code-ok">
                <KeyRound size={13} aria-hidden="true" />
                {t('lvCodeSaved')}
                {remaining !== null && (
                  <span>
                    · {t('fdLeft')}: {fmtInt(remaining, lang)}
                  </span>
                )}
                <button type="button" className="lv-link" onClick={forget}>
                  {t('lvForget')}
                </button>
              </p>
            )}
          </form>

          {notice && (
            <div className="form-error" role="alert">
              <strong>{t(notice.key)}</strong>
              {notice.extra && <p>{notice.extra}</p>}
            </div>
          )}

          {run && (
            <section className="fd-run" aria-live="polite" aria-busy={running}>
              <div className="fd-run-head">
                <h4>{t('fdToolCalls')}</h4>
                {elapsed !== null && <span className="muted small">{fmtMs(elapsed, lang)}</span>}
                {running && <span className="muted small">· {t('fdTime')}</span>}
              </div>
              {run.retries > 0 && (
                <p className="lv-warn">
                  <RotateCw size={13} aria-hidden="true" /> {t('fdRetry')}
                </p>
              )}
              {run.tools.length > 0 ? (
                <ol className="fd-tools">
                  {run.tools.map((x) => (
                    <ToolRow key={x.id} x={x} docs={docs} now={toolNow} />
                  ))}
                </ol>
              ) : (
                running && (
                  <p className="muted small fd-wait">
                    <LoaderCircle size={13} className="spin" aria-hidden="true" /> {t('fdRunning')}
                  </p>
                )
              )}

              {(run.text || run.status === 'done') && (
                <>
                  <div className="fd-run-head">
                    <h4>{t('fdAnswer')}</h4>
                    {run.status === 'done' && run.text && <CopyButton text={run.text} label={t('fdCopyAnswer')} />}
                  </div>
                  <Answer text={run.text} streaming={streaming} docs={docs} />
                </>
              )}

              {run.status === 'done' && run.done && (
                <>
                  <p className="fd-done">
                    <Check size={14} aria-hidden="true" />
                    {t('fdDone')} {fmtMs(run.done.at, lang)} · {fmtInt(run.done.tools, lang)} {t('fdToolsN')}
                    {run.done.failedTools > 0 && ` (${fmtInt(run.done.failedTools, lang)} ${t('fdFailedN')})`}
                    {run.done.outputTokens !== null && ` · ${fmtInt((run.done.inputTokens ?? 0) + run.done.outputTokens, lang)} tokens`}
                  </p>
                  {run.done.incomplete && <p className="lv-warn">{t('fdIncomplete')}</p>}
                  <p className="lv-warn">{t('fdWarn')}</p>
                </>
              )}
              {run.status === 'aborted' && <p className="muted small">{t('lvStopped')}</p>}
              {run.status === 'error' && run.error && (
                <div className="form-error" role="alert">
                  <strong>
                    {t('fdErr')} ({run.error.code})
                  </strong>
                  <p>{run.error.message}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
