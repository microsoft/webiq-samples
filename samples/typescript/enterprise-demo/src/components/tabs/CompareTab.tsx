// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Check, Minus, X } from 'lucide-react';
import type { L, Mark, Scenario } from '../../data/types';
import { useI18n, type UIKey } from '../../i18n';
import { WebIQMark } from '../Brand';

const MARK_KEY: Record<Mark, UIKey> = { yes: 'markYes', partial: 'markPartial', no: 'markNo' };
const MARK_ICON = { yes: Check, partial: Minus, no: X } as const;

function MarkCell({ mark: [m, text], hl = false }: { mark: [Mark, L]; hl?: boolean }) {
  const { t, tl } = useI18n();
  const Icon = MARK_ICON[m];
  return (
    <td className={`mark m-${m}${hl ? ' hl-col' : ''}`}>
      <span className="mark-icon" title={t(MARK_KEY[m])}>
        <Icon size={13} strokeWidth={2.6} aria-hidden="true" />
      </span>
      <span className="visually-hidden">{t(MARK_KEY[m])}: </span>
      <span className="mark-text">{tl(text)}</span>
    </td>
  );
}

export function CompareTab({ scenario: s }: { scenario: Scenario }) {
  const { t, tl } = useI18n();
  return (
    <div className="compare-tab">
      <p className="tab-intro">{t('compareIntro')}</p>
      <div className="table-scroll">
        <table className="cmp">
          <thead>
            <tr>
              <th scope="col">{t('needCol')}</th>
              <th scope="col" className="hl-col">
                <span className="cmp-head">
                  <WebIQMark size={15} />
                  Web IQ
                </span>
              </th>
              <th scope="col">Grounding with Bing</th>
              <th scope="col">{tl(s.diyLabel)}</th>
            </tr>
          </thead>
          <tbody>
            {s.compare.map((r, i) => (
              <tr key={i}>
                <th scope="row">{tl(r.need)}</th>
                <MarkCell mark={r.webiq} hl />
                <MarkCell mark={r.bing} />
                <MarkCell mark={r.diy} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="talking-points">
        <h3>{t('keyPoints')}</h3>
        <ul>
          {s.takeaways.map((x, i) => (
            <li key={i}>{tl(x)}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
