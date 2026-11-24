// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ExternalLink, LoaderCircle, Play, Radio, RefreshCw, TriangleAlert } from 'lucide-react';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { ENDPOINTS, ENDPOINT_PATH, type Endpoint, type Scenario } from '../../data/types';
import { useI18n } from '../../i18n';
import { fmtMs } from '../../lib/cost';
import { fmtDate, langName } from '../../lib/format';
import { callLive, fillPreset, getStatus, normalizeResults, type LiveResponse, type LiveStatus } from '../../lib/live';
import { clientName, type Settings } from '../../lib/settings';
import { CodeBlock } from '../Copy';
import { EndpointBadge, SourceKindIcon } from '../Icon';

/** Los resultados en vivo vienen de la web: solo se enlazan URL http(s). */
const safeUrl = (u: string): string | undefined => (/^https?:\/\//i.test(u) ? u : undefined);

type R = Record<string, unknown>;
const field = (d: unknown, k: string): string | undefined => {
  const v = d && typeof d === 'object' ? (d as R)[k] : undefined;
  return typeof v === 'string' && v ? v : undefined;
};

/** Nombre que sustituye a «{client}»: el cliente activo o, en modo neutral, el principal del caso. */
function presetClient(settings: Settings, s: Scenario): string {
  const a = settings.activeClient;
  if (a === 'none' || (a === 'custom' && !settings.clientNames.custom?.trim())) return clientName(settings, s.primaryClient);
  return clientName(settings, a);
}

export function LiveTab({ scenario: s, settings }: { scenario: Scenario; settings: Settings }) {
  const { t, tl } = useI18n();
  const client = presetClient(settings, s);
  const first = s.live[0];
  const [status, setStatus] = useState<LiveStatus | null | undefined>(undefined);
  const [check, setCheck] = useState(0);
  const [endpoint, setEndpoint] = useState<Endpoint>(first?.endpoint ?? 'web');
  const [text, setText] = useState(() => JSON.stringify(first ? fillPreset(first.body, client) : { query: client }, null, 2));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{ endpoint: Endpoint; r: LiveResponse } | null>(null);
  const [view, setView] = useState<'rendered' | 'raw'>('rendered');

  useEffect(() => {
    let alive = true;
    getStatus().then((st) => {
      if (alive) setStatus(st);
    });
    return () => {
      alive = false;
    };
  }, [check]);

  const ready = !!status?.ok && status.hasKey;

  const send = async () => {
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      setErr(t('invalidJson'));
      return;
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      setErr(t('invalidJson'));
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      setRes({ endpoint, r: await callLive(endpoint, body) });
      setView('rendered');
    } catch (e) {
      setErr(`${t('liveError')}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ready && !busy) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="live-tab">
      <p className="tab-intro">{t('liveIntro')}</p>

      <div className={`live-status ${status === undefined ? 'checking' : ready ? 'ok' : 'off'}`} role="status">
        {status === undefined ? (
          <>
            <LoaderCircle size={14} className="spin" aria-hidden="true" /> {t('liveChecking')}
          </>
        ) : ready ? (
          <>
            <Radio size={14} aria-hidden="true" /> {t('liveOk')}
          </>
        ) : (
          <div className="live-off">
            <p>
              <TriangleAlert size={14} aria-hidden="true" /> {status ? t('liveNoKey') : t('liveOff')}
            </p>
            {!status && <CodeBlock code={'cp .env.example .env   # WEBIQ_API_KEY=…\nnpm run live'} lang="bash" />}
            <button type="button" className="btn small" onClick={() => {
              setStatus(undefined);
              setCheck((n) => n + 1);
            }}>
              <RefreshCw size={13} aria-hidden="true" /> {t('liveRetry')}
            </button>
          </div>
        )}
      </div>

      <div className="live-grid">
        <div className="live-form">
          <div className="presets" role="group" aria-label={t('presets')}>
            <span className="kv-label">{t('presets')}</span>
            {s.live.map((p, i) => (
              <button
                key={i}
                type="button"
                className="preset"
                onClick={() => {
                  setEndpoint(p.endpoint);
                  setText(JSON.stringify(fillPreset(p.body, client), null, 2));
                  setRes(null);
                  setErr(null);
                }}
              >
                <EndpointBadge endpoint={p.endpoint} small />
                {tl(p.label)}
              </button>
            ))}
          </div>
          <label className="text-field">
            <span>{t('endpoint')}</span>
            <select value={endpoint} onChange={(e) => setEndpoint(e.target.value as Endpoint)}>
              {ENDPOINTS.map((e) => (
                <option key={e} value={e}>
                  POST /v3/{ENDPOINT_PATH[e]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-field">
            <span>{t('body')}</span>
            <textarea className="code-input" rows={9} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} />
          </label>
          {err && (
            <p className="form-error" role="alert">
              {err}
            </p>
          )}
          <div className="live-actions">
            <button type="button" className="btn primary" disabled={!ready || busy} onClick={() => void send()}>
              {busy ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              {busy ? t('sending') : t('send')}
            </button>
            <span className="muted small">{t('liveBilled')}</span>
          </div>
        </div>

        <div className="live-result" aria-live="polite">
          {res && <LiveResult endpoint={res.endpoint} r={res.r} view={view} onView={setView} />}
          {res && <p className="muted small">{t('liveTrimmed')}</p>}
          {!res && <p className="empty-state">{t('liveHint')}</p>}
        </div>
      </div>
    </div>
  );
}

function LiveResult({ endpoint, r, view, onView }: { endpoint: Endpoint; r: LiveResponse; view: 'rendered' | 'raw'; onView: (v: 'rendered' | 'raw') => void }) {
  const { t, lang } = useI18n();
  const ok = r.status >= 200 && r.status < 300 && r.status !== 202;
  const items = ok ? normalizeResults(endpoint, r.data) : [];
  const message = field(r.data, 'userMessage') ?? field(r.data, 'error') ?? field(r.data, 'technicalDetails');

  return (
    <>
      <div className="live-head">
        <EndpointBadge endpoint={endpoint} small />
        <span className={`http s${r.status}`}>
          HTTP {r.status}
          {r.latencyMs > 0 && ` · ${fmtMs(r.latencyMs, lang)}`}
        </span>
        {ok && (
          <div className="segmented small" role="group" aria-label={t('rendered')}>
            <button type="button" className={view === 'rendered' ? 'on' : ''} aria-pressed={view === 'rendered'} onClick={() => onView('rendered')}>
              {t('rendered')}
            </button>
            <button type="button" className={view === 'raw' ? 'on' : ''} aria-pressed={view === 'raw'} onClick={() => onView('raw')}>
              {t('rawJson')}
            </button>
          </div>
        )}
      </div>
      {r.status === 202 ? (
        <p className="call-note">
          {t('liveRetryAfter')} {field(r.data, 'retryAfter') ?? '…'}
        </p>
      ) : !ok ? (
        <div className="form-error" role="alert">
          <strong>
            {t('liveError')} {r.status}
            {field(r.data, 'errorCode') ? ` · ${field(r.data, 'errorCode')}` : ''}
          </strong>
          {message && <p>{message}</p>}
        </div>
      ) : view === 'raw' ? (
        <CodeBlock code={JSON.stringify(r.data, null, 2)} lang="json" title={t('rawJson')} />
      ) : items.length === 0 ? (
        <p className="empty-state">{t('noResults')}</p>
      ) : (
        <ol className="live-items">
          {items.map((x, i) => {
            const href = safeUrl(x.url);
            return (
              <li key={i} className="live-item">
                <span className={`src-kind k-${x.kind}`}>
                  <SourceKindIcon kind={x.kind} size={13} />
                </span>
                <div className="li-body">
                  {href ? (
                    <a className="li-title" href={href} target="_blank" rel="noopener noreferrer" lang={x.language}>
                      {x.title}
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="li-title">{x.title}</span>
                  )}
                  <span className="li-meta">
                    {[x.publisher, x.date && `${t('updated')} ${fmtDate(x.date, lang)}`, x.crawledAt && `${t('crawled')} ${fmtDate(x.crawledAt, lang)}`, x.language && langName(x.language, lang), x.extra]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {x.content && (
                    <p className="li-content" lang={x.language}>
                      {x.content}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
