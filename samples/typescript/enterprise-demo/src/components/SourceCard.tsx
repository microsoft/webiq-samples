// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { BadgeCheck, Clapperboard, Image as ImageIcon, Languages, Link2, Radio } from 'lucide-react';
import type { Source, Variant } from '../data/types';
import { useI18n } from '../i18n';
import { fmtClock, fmtDate, langName } from '../lib/format';
import { SourceKindIcon } from './Icon';

interface Props {
  source: Source;
  variant: Variant;
  /** Número de cita [n] si la respuesta la cita. */
  n?: number;
  /** La respuesta ya está escrita: las fuentes sin [n] se marcan como «consultada, no citada». */
  final?: boolean;
  flash?: boolean;
}

/** URL de la fuente: las reales y los documentos sintéticos se abren; las ficticias (.example) no. */
function SourceUrl({ source: x }: { source: Source }) {
  const { t } = useI18n();
  if (!x.real && x.kind !== 'doc') {
    return (
      <span className="src-url" title={t('fakeDomain')}>
        {x.url}
      </span>
    );
  }
  return (
    <a className="src-url src-link" href={x.url} target="_blank" rel="noopener noreferrer">
      {x.url}
    </a>
  );
}

/** Marca de procedencia: fuente pública real o documento sintético de Foundry IQ. */
function Provenance({ source: x }: { source: Source }) {
  const { t } = useI18n();
  if (x.kind === 'doc') return <span className="chip src-doc">Foundry IQ · {t('syntheticDoc')}</span>;
  if (x.real)
    return (
      <span className="chip src-real">
        <BadgeCheck size={12} aria-hidden="true" />
        {t('realSource')}
      </span>
    );
  return null;
}

/** Una fuente tal como llega a la aplicación con cada variante. */
export function SourceCard({ source: x, variant, n, final = true, flash = false }: Props) {
  const { t, lang } = useI18n();
  const cls = `src-card${flash ? ' flash' : ''}`;

  // Los documentos de Foundry IQ llegan con pasaje en las dos variantes; solo las citas de Bing pierden pasaje y fecha.
  if (variant === 'bing' && x.kind !== 'doc') {
    return (
      <article className={`${cls} bing`} data-src={x.id}>
        <header className="src-head">
          <Link2 size={14} aria-hidden="true" />
          <span className="src-pub">url_citation</span>
          <Provenance source={x} />
          {n !== undefined && <span className="cite-badge">[{n}]</span>}
        </header>
        <h4 className="src-title">{x.title}</h4>
        <SourceUrl source={x} />
        <dl className="src-missing">
          <div>
            <dt>{t('passage')}</dt>
            <dd>{t('notReturned')}</dd>
          </div>
          <div>
            <dt>{t('date')}</dt>
            <dd>{t('notReturned')}</dd>
          </div>
        </dl>
      </article>
    );
  }

  const translated = x.language !== lang ? x.tr?.[lang] : undefined;
  const structured = x.kind === 'weather' || x.kind === 'timezone';
  return (
    <article className={cls} data-src={x.id}>
      <header className="src-head">
        <span className={`src-kind k-${x.kind}`}>
          <SourceKindIcon kind={x.kind} size={13} />
        </span>
        <span className="src-pub">{x.publisher}</span>
        <span className="chip lang" title={x.language}>
          {langName(x.language, lang)}
        </span>
        {structured && <span className="chip">{t('structured')}</span>}
        <Provenance source={x} />
        {n !== undefined ? <span className="cite-badge">[{n}]</span> : final ? <span className="src-unused">{t('retrieved')}</span> : null}
      </header>
      <h4 className="src-title" lang={x.language}>
        {x.title}
      </h4>
      <SourceUrl source={x} />
      <blockquote className="src-excerpt" lang={x.language}>
        {x.excerpt}
      </blockquote>
      {translated && (
        <p className="src-tr">
          <Languages size={13} aria-hidden="true" />
          <span>
            <span className="src-tr-label">{t('translation')}:</span> {translated}
          </span>
        </p>
      )}
      {x.video && (
        <p className="src-media">
          <Clapperboard size={13} aria-hidden="true" />
          <span>
            {t('duration')} {fmtClock(x.video.length)} · {x.video.views.toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB')} {t('views')} · {t('keyMoment')}{' '}
            <strong>
              {fmtClock(x.video.moment.start)}–{fmtClock(x.video.moment.end)}
            </strong>{' '}
            «{x.video.moment.title[lang]}»
          </span>
        </p>
      )}
      {x.image && (
        <p className="src-media">
          <ImageIcon size={13} aria-hidden="true" />
          <span>
            {x.image.width}×{x.image.height} · {t('metadataOnly')}
          </span>
        </p>
      )}
      <footer className="src-dates">
        <span>
          {t('updated')} <time dateTime={x.date}>{fmtDate(x.date, lang)}</time>
        </span>
        {x.crawledAt && (
          <span className="src-crawl">
            <Radio size={12} aria-hidden="true" />
            {t('crawled')} <time dateTime={x.crawledAt}>{fmtDate(x.crawledAt, lang)}</time>
          </span>
        )}
      </footer>
    </article>
  );
}
