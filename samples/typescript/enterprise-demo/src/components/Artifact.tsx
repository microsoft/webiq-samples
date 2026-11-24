// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CircleAlert, CircleCheck, Image as ImageIcon, Info, Play, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Artifact as ArtifactData, InfoCard, Source, Tone } from '../data/types';
import { useI18n, type UIKey } from '../i18n';
import { clockSeconds, fmtClock, shortTrace } from '../lib/format';
import { EndpointBadge, ScenarioIcon } from './Icon';
import { CiteSup, type CiteHandler } from './Rich';

interface Props {
  artifact: ArtifactData;
  sources: Source[];
  onCite?: CiteHandler;
}

const TONE_ICON: Record<Tone, LucideIcon> = {
  ok: CircleCheck,
  warn: TriangleAlert,
  bad: CircleAlert,
  info: Info,
  muted: Info,
};

const LEVEL_KEY: Record<'low' | 'medium' | 'high', UIKey> = { low: 'levelLow', medium: 'levelMedium', high: 'levelHigh' };

const toneClass = (tone?: Tone) => (tone ? `t-${tone}` : undefined);

/** El entregable que acompaña a la respuesta: tabla, cronología, ficha de riesgo o tarjetas. */
export function Artifact({ artifact: a, sources, onCite }: Props) {
  const { t, tl } = useI18n();
  const cite = (n?: number) => (n ? <CiteSup n={n} onCite={onCite} /> : null);

  return (
    <figure className={`artifact a-${a.kind}`}>
      <figcaption className="artifact-title">{tl(a.title)}</figcaption>

      {a.kind === 'table' && (
        <>
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  {a.columns.map((c, i) => (
                    <th key={i} scope="col">
                      {tl(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((c, j) =>
                      j === 0 ? (
                        <th key={j} scope="row" className={toneClass(c.tone)}>
                          {tl(c.text)}
                          {cite(c.cite)}
                        </th>
                      ) : (
                        <td key={j} className={toneClass(c.tone)}>
                          {tl(c.text)}
                          {cite(c.cite)}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {a.note && <p className="artifact-note">{tl(a.note)}</p>}
        </>
      )}

      {a.kind === 'timeline' && (
        <>
          <div className="tl-grid">
            <ol className="tl">
              {a.items.map((it, i) => (
                <li key={i} className={`tl-item ${toneClass(it.tone) ?? 't-muted'}`}>
                  <time className="tl-time">{it.time}</time>
                  <span className="tl-dot" aria-hidden="true" />
                  <p className="tl-body">
                    <span className="tl-market">{tl(it.market)}</span>
                    {tl(it.text)}
                    {cite(it.cite)}
                  </p>
                </li>
              ))}
            </ol>
            <ul className="heat">
              {a.heat.map((h) => (
                <li key={h.market} className={`heat-cell lv-${h.level}`}>
                  <span className="heat-market">{h.market}</span>
                  <span className="heat-level">{tl(h.label)}</span>
                  <span className="heat-note">{tl(h.note)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="artifact-actions">
            <h5>{t('actions')}</h5>
            <ol>
              {a.actions.map((x, i) => (
                <li key={i}>{tl(x)}</li>
              ))}
            </ol>
          </div>
        </>
      )}

      {a.kind === 'scorecard' && (
        <>
          <Verdict tone={a.verdict.tone} text={tl(a.verdict.text)} />
          <ul className="dims">
            {a.dims.map((d, i) => (
              <li key={i} className="dim">
                <span className="dim-name">{tl(d.name)}</span>
                <span className={`lvl lvl-${d.level}`}>{t(LEVEL_KEY[d.level])}</span>
                <span className="dim-note">
                  {tl(d.note)}
                  {cite(d.cite)}
                </span>
              </li>
            ))}
          </ul>
          <div className="trail">
            <h5>{t('trail')}</h5>
            <div className="table-scroll">
              <table className="data trail-table">
                <thead>
                  <tr>
                    <th scope="col">{t('endpoint')}</th>
                    <th scope="col">{t('target')}</th>
                    <th scope="col">traceId</th>
                    <th scope="col">{t('time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {a.trail.map((e) => (
                    <tr key={e.traceId}>
                      <td>
                        <EndpointBadge endpoint={e.endpoint} small />
                      </td>
                      <td>
                        <code>{e.target}</code>
                      </td>
                      <td>
                        <code title={e.traceId}>{shortTrace(e.traceId)}</code>
                      </td>
                      <td className="num">{e.at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="artifact-note">{tl(a.note)}</p>
          </div>
        </>
      )}

      {a.kind === 'cards' && (
        <div className="info-cards">
          {a.cards.map((c, i) => (
            <InfoCardView key={i} card={c} media={c.media ? sources.find((x) => x.id === c.media) : undefined} cite={cite(c.cite)} />
          ))}
        </div>
      )}
    </figure>
  );
}

function Verdict({ tone, text }: { tone: Tone; text: string }) {
  const I = TONE_ICON[tone];
  return (
    <p className={`verdict t-${tone}`}>
      <I size={18} aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}

function InfoCardView({ card: c, media, cite }: { card: InfoCard; media?: Source; cite: ReactNode }) {
  const { tl } = useI18n();
  return (
    <article className={`info-card ${toneClass(c.tone) ?? 't-info'}`}>
      {media && <MediaPreview source={media} />}
      <div className="info-body">
        <h5>
          <span className="info-icon">
            <ScenarioIcon name={c.icon} size={15} />
          </span>
          {tl(c.title)}
        </h5>
        <p>
          {tl(c.text)}
          {cite}
        </p>
      </div>
    </article>
  );
}

/** Marcador para medios: las URL de la demo son ficticias, así que se pinta la información que devuelve la API. */
function MediaPreview({ source: x }: { source: Source }) {
  const { t, tl, lang } = useI18n();
  if (x.image) {
    const ratio = x.image.width && x.image.height ? `${x.image.width} / ${x.image.height}` : '4 / 3';
    return (
      <div className="media-ph img" style={{ aspectRatio: ratio }}>
        <ImageIcon size={22} aria-hidden="true" />
        <span className="media-cap">{tl(x.image.caption)}</span>
        <span className="media-meta">
          {x.image.width}×{x.image.height} · {t('metadataOnly')}
        </span>
      </div>
    );
  }
  if (x.video) {
    const total = clockSeconds(x.video.length);
    const start = clockSeconds(x.video.moment.start);
    const end = clockSeconds(x.video.moment.end);
    const ok = total > 0 && Number.isFinite(start) && Number.isFinite(end) && end > start;
    return (
      <div className="media-ph vid">
        <span className="vid-play" aria-hidden="true">
          <Play size={18} />
        </span>
        <span className="media-cap">
          {t('keyMoment')} {fmtClock(x.video.moment.start)}–{fmtClock(x.video.moment.end)} · «{x.video.moment.title[lang]}»
        </span>
        {ok && (
          <span className="scrub" aria-hidden="true">
            <span className="scrub-moment" style={{ left: `${(start / total) * 100}%`, width: `${((end - start) / total) * 100}%` }} />
          </span>
        )}
        <span className="media-meta">
          {x.video.publishedBy} · {fmtClock(x.video.length)} · {x.video.views.toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB')} {t('views')}
        </span>
      </div>
    );
  }
  return null;
}
