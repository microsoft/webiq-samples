// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ArrowRight, Check, ExternalLink, Minus, X } from 'lucide-react';
import type { Mark, Scenario } from '../data/types';
import { APPROACHES, BENCHMARKS, BENCHMARKS_NOTE, CAPABILITIES, CAPABILITIES_NOTE, DOCS, NOTES, POSITIONING } from '../data/why';
import { useI18n, type UIKey } from '../i18n';
import { BING_PRICE_PER_1K, PRICES_CHECKED, WEBIQ_PRICE_PER_1K, fmtInt, fmtUSD } from '../lib/cost';
import { fmtDate } from '../lib/format';
import { clientName, type Settings } from '../lib/settings';
import { ClientLogo, WebIQMark } from './Brand';
import { EndpointBadge, ScenarioIcon } from './Icon';

const MARK_KEY: Record<Mark, UIKey> = { yes: 'markYes', partial: 'markPartial', no: 'markNo' };
const MARK_ICON = { yes: Check, partial: Minus, no: X } as const;

function MarkIcon({ m }: { m: Mark }) {
  const { t } = useI18n();
  const Icon = MARK_ICON[m];
  return (
    <span className={`mk ${m}`} title={t(MARK_KEY[m])}>
      <Icon size={15} strokeWidth={2.6} aria-hidden="true" />
      <span className="visually-hidden">{t(MARK_KEY[m])}</span>
    </span>
  );
}

interface Props {
  scenarios: Scenario[];
  settings: Settings;
  onOpen: (id: string) => void;
}

export function WhyView({ scenarios, settings, onOpen }: Props) {
  const { tl, lang } = useI18n();
  const es = lang === 'es';
  const client = settings.activeClient;
  const last = APPROACHES.length - 1;
  const per1k = es ? `/ ${fmtInt(1000, lang)} consultas` : `/ ${fmtInt(1000, lang)} queries`;

  const prices = [
    { value: fmtUSD(WEBIQ_PRICE_PER_1K.web, lang), unit: per1k, label: es ? 'Búsqueda: web, noticias, imágenes y vídeos' : 'Search: web, news, images and videos', hl: true },
    { value: fmtUSD(WEBIQ_PRICE_PER_1K.browse, lang), unit: per1k, label: es ? 'browse: leer una URL concreta en vivo' : 'browse: read a specific URL live', hl: true },
    { value: es ? 'Gratis' : 'Free', unit: es ? 'durante la beta' : 'during the beta', label: es ? 'auto: Web IQ elige la herramienta' : 'auto: Web IQ picks the tool', hl: true },
    {
      value: fmtUSD(BING_PRICE_PER_1K, lang),
      unit: es ? `/ ${fmtInt(1000, lang)} transacciones` : `/ ${fmtInt(1000, lang)} transactions`,
      label: 'Grounding with Bing Search',
      hl: false,
    },
  ];

  return (
    <article className="doc-view why">
      <header className="doc-head">
        <h1>{es ? 'Cuando tu aplicación necesita la web, no solo una respuesta' : 'When your app needs the web, not just an answer'}</h1>
        <p className="lede">{tl(POSITIONING)}</p>
        {client !== 'none' && (
          <p className="doc-client">
            <ClientLogo id={client} settings={settings} height={22} />
            <span>
              {es ? 'Preparado para' : 'Prepared for'} {clientName(settings, client)}
            </span>
          </p>
        )}
      </header>

      <section aria-labelledby="why-cases">
        <h2 id="why-cases">{es ? 'Los seis casos de un vistazo' : 'The six cases at a glance'}</h2>
        <div className="table-scroll">
          <table className="data cases-table">
            <thead>
              <tr>
                <th scope="col">{es ? 'Caso' : 'Case'}</th>
                <th scope="col">{es ? 'La necesidad' : 'The need'}</th>
                <th scope="col">{es ? 'Dónde se queda corto Grounding with Bing' : 'Where Grounding with Bing falls short'}</th>
                <th scope="col">{es ? 'Lo que usa Web IQ' : 'What Web IQ uses'}</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => {
                const gaps = s.variants.bing.steps.flatMap((st) => (st.kind === 'gap' ? [st.title] : []));
                return (
                  <tr key={s.id}>
                    <th scope="row">
                      <button type="button" className="case-link" onClick={() => onOpen(s.id)}>
                        <span className="case-num">{s.num}</span>
                        <ScenarioIcon name={s.icon} size={16} />
                        <span>{tl(s.title)}</span>
                        <ArrowRight size={14} aria-hidden="true" className="case-go" />
                      </button>
                    </th>
                    <td>{tl(s.need)}</td>
                    <td>
                      <ul className="gap-list">
                        {gaps.map((g, i) => (
                          <li key={i}>{tl(g)}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <span className="badge-row">
                        {s.endpoints.map((e) => (
                          <EndpointBadge key={e} endpoint={e} small />
                        ))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="why-cmp">
        <h2 id="why-cmp">{es ? 'Qué cubre cada enfoque' : 'What each approach covers'}</h2>
        <div className="table-scroll">
          <table className="cmp matrix">
            <thead>
              <tr>
                <td />
                {APPROACHES.map((a, i) => (
                  <th key={i} scope="col" className={i === last ? 'hl-col' : ''}>
                    {i === last ? (
                      <span className="cmp-head">
                        <WebIQMark size={15} />
                        {tl(a)}
                      </span>
                    ) : (
                      tl(a)
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((r, i) => (
                <tr key={i}>
                  <th scope="row">{tl(r.row)}</th>
                  {r.marks.map((m, j) => (
                    <td key={j} className={`mark-cell${j === last ? ' hl-col' : ''}`}>
                      <MarkIcon m={m} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">{tl(CAPABILITIES_NOTE)}</p>
      </section>

      <section aria-labelledby="why-price">
        <h2 id="why-price">{es ? 'Precio por uso, sin infraestructura' : 'Pay per use, no infrastructure'}</h2>
        <ul className="price-grid">
          {prices.map((p, i) => (
            <li key={i} className={`price-card${p.hl ? ' is-webiq' : ''}`}>
              <span className="price-label">{p.label}</span>
              <span className="price-value">{p.value}</span>
              <span className="price-unit">{p.unit}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">
          {es
            ? `Precios de lista en USD consultados el ${fmtDate(PRICES_CHECKED, lang, false)}. En ambos casos, los tokens del modelo se pagan aparte. La pestaña «Coste» de cada caso hace la cuenta con su volumen.`
            : `List prices in USD checked on ${fmtDate(PRICES_CHECKED, lang, false)}. In both cases, model tokens are billed separately. Each case’s “Cost” tab does the maths for its volume.`}
        </p>
      </section>

      <section aria-labelledby="why-bench">
        <h2 id="why-bench">{es ? 'Calidad y velocidad medidas' : 'Measured quality and speed'}</h2>
        <ul className="stat-grid">
          {BENCHMARKS.map((b, i) => (
            <li key={i} className="stat">
              <span className="stat-value">{tl(b.value)}</span>
              <span className="stat-label">{tl(b.label)}</span>
              <span className="stat-detail">{tl(b.detail)}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">{tl(BENCHMARKS_NOTE)}</p>
      </section>

      <section aria-labelledby="why-notes">
        <h2 id="why-notes">{es ? 'Lo que conviene saber antes de empezar' : 'What to know before you start'}</h2>
        <dl className="pillars">
          {NOTES.map((n, i) => (
            <div key={i}>
              <dt>{tl(n.title)}</dt>
              <dd>{tl(n.text)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="why-docs">
        <h2 id="why-docs">{es ? 'Documentación' : 'Documentation'}</h2>
        <ul className="doc-links">
          {DOCS.map((d) => (
            <li key={d.url}>
              <a href={d.url} target="_blank" rel="noopener noreferrer">
                {tl(d.label)}
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
