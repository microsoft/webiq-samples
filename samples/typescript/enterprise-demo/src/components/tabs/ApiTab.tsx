// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Info } from 'lucide-react';
import { useState } from 'react';
import type { Scenario, Source, Step, Variant } from '../../data/types';
import { useI18n } from '../../i18n';
import { variantCalls } from '../../lib/cost';
import { bingResponsePreview, responsePreview } from '../../lib/response';
import { SNIPPET_KINDS, bingCurlSnippet, mcpConfig, snippet, type SnippetKind } from '../../lib/snippets';
import { CodeBlock } from '../Copy';
import { EndpointBadge } from '../Icon';

const KIND_LABEL: Record<SnippetKind, string> = { curl: 'curl', python: 'Python', ts: 'TypeScript', mcp: 'MCP' };
const json = (x: unknown) => JSON.stringify(x, null, 2);

export function ApiTab({ scenario: s, variant: v }: { scenario: Scenario; variant: Variant }) {
  const { t, tl, lang } = useI18n();
  const calls = variantCalls(s, 'webiq');
  const [callId, setCallId] = useState(calls[0]?.id ?? '');
  const [kind, setKind] = useState<SnippetKind>('curl');

  if (v === 'bing') return <BingApi scenario={s} />;

  const call = calls.find((c) => c.id === callId) ?? calls[0];
  if (!call) return null;
  const status = call.status ?? 200;

  return (
    <div className="api-tab">
      <p className="tab-intro">{t('apiIntro')}</p>
      <div className="api-controls">
        <div className="call-picker" role="group" aria-label={t('callPick')}>
          {calls.map((c) => (
            <button key={c.id} type="button" className={`call-pick${c.id === call.id ? ' on' : ''}`} aria-pressed={c.id === call.id} onClick={() => setCallId(c.id)}>
              <EndpointBadge endpoint={c.endpoint} small />
              <span>{tl(c.label)}</span>
              {c.status === 202 && <span className="chip pending">202</span>}
            </button>
          ))}
        </div>
        <div className="segmented small" role="group" aria-label={t('snippetFormat')}>
          {SNIPPET_KINDS.map((k) => (
            <button key={k} type="button" className={kind === k ? 'on' : ''} aria-pressed={kind === k} onClick={() => setKind(k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {kind === 'mcp' ? (
        <div className="api-grid">
          <CodeBlock code={mcpConfig()} lang="json" title={t('mcpTitle')} />
          <div className="api-notes">
            <p>
              <Info size={14} aria-hidden="true" />
              {call.endpoint === 'auto' ? (
                <span>{t('mcpNoAuto')}</span>
              ) : (
                <span>
                  {t('mcpTool')}: <code>{call.endpoint}</code>
                </span>
              )}
            </p>
            <p className="muted">{t('mcpScoped')}</p>
          </div>
        </div>
      ) : (
        <div className="api-grid">
          <CodeBlock code={snippet(kind, call.endpoint, call.request)} lang={kind === 'curl' ? 'bash' : kind} title={t('request')} />
          <div className="api-response">
            <CodeBlock
              code={json(responsePreview(s, call, lang, t('structuredNote')))}
              lang="json"
              title={
                <>
                  {t('responsePreview')} <span className={`http s${status}`}>HTTP {status}</span>
                </>
              }
            />
            <p className="api-note">{status === 202 ? `${t('notReady')} ${call.retryAfter ?? ''}` : t('responseNote')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BingApi({ scenario: s }: { scenario: Scenario }) {
  const { t, tl } = useI18n();
  const v = s.variants.bing;
  const find = <K extends Step['kind']>(k: K) => v.steps.find((st): st is Extract<Step, { kind: K }> => st.kind === k);
  const user = find('user');
  const bing = find('bing');
  const answer = find('answer');
  if (!user || !bing || !answer) return null;
  const byId = new Map(s.sources.map((x) => [x.id, x]));
  const cites = v.citations.map((id) => byId.get(id)).filter((x): x is Source => !!x);

  return (
    <div className="api-tab">
      <p className="tab-intro">{t('bingApiIntro')}</p>
      <div className="api-grid">
        <CodeBlock code={bingCurlSnippet(tl(user.text), bing.config)} lang="bash" title={t('bingToolConfig')} />
        <div className="api-response">
          <CodeBlock code={json(bingResponsePreview(tl(answer.text), cites))} lang="json" title={t('bingResponse')} />
          <p className="api-note">{t('bingDisplay')}</p>
        </div>
      </div>
    </div>
  );
}
