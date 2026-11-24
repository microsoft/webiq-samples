// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import { ENDPOINTS, type Scenario } from '../../data/types';
import { useI18n } from '../../i18n';
import { BING_PRICE_PER_1K, PRICES_CHECKED, WEBIQ_PRICE_PER_1K, callPrice, fmtInt, fmtUSD, monthlyCost, runCost } from '../../lib/cost';
import { fmtDate } from '../../lib/format';
import { EndpointBadge } from '../Icon';

const toNumber = (v: string): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function CostTab({ scenario: s }: { scenario: Scenario }) {
  const { t, tl, lang } = useI18n();
  const ids = useId();
  const [runs, setRuns] = useState(String(s.cost.runsPerMonth));
  const [diy, setDiy] = useState(String(s.cost.diy.monthly));
  const rc = runCost(s);
  const m = monthlyCost(s, toNumber(runs), toNumber(diy));
  const used = ENDPOINTS.filter((e) => rc.byEndpoint[e] > 0);

  const bars = [
    { id: 'webiq', label: t('barWebIQ'), value: m.webiq },
    { id: 'bing', label: t('barBing'), value: m.bing },
    ...(rc.uncovered > 0 ? [{ id: 'bingdiy', label: t('barBingDiy'), value: m.bingPlusDiy }] : []),
    { id: 'diy', label: t('barDiy'), value: m.diy },
  ];
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="cost-tab">
      <div className="cost-grid">
        <section className="cost-run" aria-labelledby={`${ids}-run`}>
          <h3 id={`${ids}-run`}>
            {t('costPerRun')} <span className="muted">· {tl(s.cost.unit)}</span>
          </h3>
          <div className="table-scroll">
            <table className="data cost-table">
              <thead>
                <tr>
                  <th scope="col">{t('endpoint')}</th>
                  <th scope="col" className="num">
                    {t('callsCol')}
                  </th>
                  <th scope="col" className="num">
                    {t('pricePer1k')}
                  </th>
                  <th scope="col" className="num">
                    {t('subtotal')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {used.map((e) => (
                  <tr key={e}>
                    <th scope="row">
                      <EndpointBadge endpoint={e} small />
                    </th>
                    <td className="num">{rc.byEndpoint[e]}</td>
                    <td className="num">{WEBIQ_PRICE_PER_1K[e] === 0 ? t('freeBeta') : fmtUSD(WEBIQ_PRICE_PER_1K[e], lang)}</td>
                    <td className="num">{fmtUSD(rc.byEndpoint[e] * callPrice(e), lang)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{t('total')}</th>
                  <td className="num">{rc.calls}</td>
                  <td />
                  <td className="num">
                    <strong>{fmtUSD(rc.webiq, lang)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="bing-eq">
            <h4>{t('bingEquivalent')}</h4>
            <p>
              {rc.bingTx} {t('bingTxN')} × {fmtUSD(BING_PRICE_PER_1K, lang)} / {fmtInt(1000, lang)} = <strong>{fmtUSD(rc.bing, lang)}</strong>
            </p>
            {rc.uncovered > 0 && (
              <p className="uncovered">
                <TriangleAlert size={14} aria-hidden="true" />
                <span>
                  {t('uncovered')}:{' '}
                  {rc.uncoveredEndpoints.map((e) => (
                    <EndpointBadge key={e} endpoint={e} small />
                  ))}{' '}
                  ({rc.uncovered} {t('callsCol').toLowerCase()})
                </span>
              </p>
            )}
          </div>
        </section>

        <section className="cost-scale" aria-labelledby={`${ids}-scale`}>
          <h3 id={`${ids}-scale`}>{t('atScale')}</h3>
          <div className="cost-inputs">
            <label className="text-field">
              <span>{t('runsMonth')}</span>
              <input type="number" inputMode="numeric" min={0} step={10} value={runs} onChange={(e) => setRuns(e.target.value)} />
              <small>{tl(s.cost.runsHint)}</small>
            </label>
            <label className="text-field">
              <span>{t('diyMonthly')}</span>
              <input type="number" inputMode="numeric" min={0} step={100} value={diy} onChange={(e) => setDiy(e.target.value)} />
              <small>{tl(s.cost.diy.label)}</small>
            </label>
          </div>
          <p className="illustrative">
            <strong>{t('illustrative')}.</strong> {tl(s.cost.diy.basis)}
          </p>
          <ul className="cost-bars">
            {bars.map((b) => (
              <li key={b.id} className={`bar-row b-${b.id}`}>
                <span className="bar-label">{b.label}</span>
                <span className="bar-track" aria-hidden="true">
                  <span className="bar-fill" style={{ transform: `scaleX(${Math.max(0.006, b.value / max)})` }} />
                </span>
                <span className="bar-val">
                  {fmtUSD(b.value, lang)}
                  <small>{t('perMonth')}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="muted small">
            {fmtInt(m.runs, lang)} × {fmtUSD(rc.webiq, lang)} = {fmtUSD(m.webiq, lang)}
            {t('perMonth')}
          </p>
        </section>
      </div>
      <p className="cost-note">
        {t('costNote')} {t('pricesChecked')} {fmtDate(PRICES_CHECKED, lang, false)}.
      </p>
    </div>
  );
}
