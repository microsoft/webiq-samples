// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, expect, it } from 'vitest';
import { applyFoundryEvent, newFoundryRun, parseBlocks, parseInline, trimPartial, type DocRef, type FoundryEvent, type Inline } from './foundry';

const DOCS: DocRef[] = [
  { stem: '02-propuesta-vodafone-business', title: 'Propuesta Vodafone Business', href: '/foundry/contratos-telco/02-propuesta-vodafone-business.md' },
  { stem: '04-comparativa-actual', title: 'Comparativa actual', href: '/foundry/contratos-telco/04-comparativa-actual.md' },
];

const citesOf = (xs: Inline[]) => xs.filter((x): x is Extract<Inline, { t: 'cite' }> => x.t === 'cite');
const textOf = (xs: Inline[]): string => xs.map((x) => (x.t === 'text' ? x.v : x.t === 'b' ? textOf(x.v) : x.t === 'link' ? x.label : `{${x.label}}`)).join('');

describe('applyFoundryEvent', () => {
  const run = (evs: FoundryEvent[]) => evs.reduce(applyFoundryEvent, newFoundryRun('p'));

  it('fusiona las llamadas a herramientas por id y acumula el texto', () => {
    const r = run([
      { type: 'start', at: 0, agent: 'revisor' },
      { type: 'meta', at: 10, model: 'gpt-5.4-mini' },
      { type: 'tool', id: 't1', at: 100, server: 'foundry_iq_contratos', name: 'knowledge_base_retrieve', status: 'calling', queries: ['precios'] },
      { type: 'tool', id: 't1', at: 900, status: 'completed', count: 3, sources: [{ title: 'Doc' }] },
      { type: 'token', text: 'Hola ' },
      { type: 'token', text: 'mundo' },
      { type: 'done', at: 2000, firstTextMs: 1200, tools: 1, failedTools: 0, inputTokens: 10, outputTokens: 20 },
    ]);
    expect(r.status).toBe('done');
    expect(r.agent).toBe('revisor');
    expect(r.model).toBe('gpt-5.4-mini');
    expect(r.tools).toHaveLength(1);
    expect(r.tools[0]).toMatchObject({ server: 'foundry_iq_contratos', queries: ['precios'], status: 'completed', count: 3, startAt: 100, endAt: 900 });
    expect(r.text).toBe('Hola mundo');
    expect(r.done?.tools).toBe(1);
    expect(r.at).toBe(2000);
  });

  it('un reintento descarta herramientas y texto parcial y cuenta el intento', () => {
    const r = run([
      { type: 'tool', id: 't1', at: 100, status: 'failed', error: 'boom' },
      { type: 'retry', at: 300, attempt: 2, code: 'tool_user_error', message: 'boom' },
      { type: 'tool', id: 't2', at: 400, status: 'calling' },
    ]);
    expect(r.retries).toBe(1);
    expect(r.tools.map((t) => t.id)).toEqual(['t2']);
    expect(r.text).toBe('');
  });

  it('un error cierra la ejecución con su código', () => {
    const r = run([{ type: 'error', code: 'Timeout', message: 'tarde', at: 5 }]);
    expect(r.status).toBe('error');
    expect(r.error).toEqual({ code: 'Timeout', message: 'tarde' });
  });
});

describe('parseBlocks', () => {
  it('los títulos markdown numerados también llevan número', () => {
    expect(parseBlocks('### 3. Weighted decision matrix (out of 100)\n## **4. Riesgos**\n# Fuentes')).toEqual([
      { t: 'h', num: '3', text: 'Weighted decision matrix (out of 100)' },
      { t: 'h', num: '4', text: 'Riesgos' },
      { t: 'h', text: 'Fuentes' },
    ]);
  });

  it('convierte las secciones numeradas en negrita en títulos y respeta listas, citas y tablas', () => {
    const md = [
      '1. **Resumen ejecutivo**',
      '- Vodafone **sigue** primero.',
      '  - detalle',
      '',
      '**Movistar Empresas**',
      '> Nota del comité',
      '| Operador | Total |',
      '|---|---:|',
      '| Vodafone | 75,0 |',
      '| Orange | 71,8 |',
      '---',
      '### Fuentes',
    ].join('\n');
    const b = parseBlocks(md);
    expect(b[0]).toEqual({ t: 'h', num: '1', text: 'Resumen ejecutivo' });
    expect(b[1]).toEqual({ t: 'li', level: 0, marker: '•', text: 'Vodafone **sigue** primero.' });
    expect(b[2]).toMatchObject({ t: 'li', level: 1 });
    expect(b[3]).toEqual({ t: 'p', text: '**Movistar Empresas**' });
    expect(b[4]).toEqual({ t: 'quote', text: 'Nota del comité' });
    expect(b[5]).toEqual({ t: 'table', head: ['Operador', 'Total'], align: ['l', 'r'], rows: [['Vodafone', '75,0'], ['Orange', '71,8']] });
    expect(b[6]).toEqual({ t: 'hr' });
    expect(b[7]).toEqual({ t: 'h', text: 'Fuentes' });
  });

  it('una lista numerada normal sigue siendo lista', () => {
    expect(parseBlocks('2. Revisar el SLA')[0]).toEqual({ t: 'li', level: 0, marker: '2.', text: 'Revisar el SLA' });
  });
});

describe('parseInline', () => {
  it('convierte 【URL】 en fichas web enlazadas con el dominio', () => {
    const xs = parseInline('Mejora clara【https://forbes.es/ultima-hora/1005671/vodafone-reduce/】【https://www.ocu.org/x】.', DOCS);
    const c = citesOf(xs);
    expect(c.map((x) => [x.kind, x.label, x.href])).toEqual([
      ['web', 'forbes.es', 'https://forbes.es/ultima-hora/1005671/vodafone-reduce/'],
      ['web', 'ocu.org', 'https://www.ocu.org/x'],
    ]);
    expect(textOf(xs)).toBe('Mejora clara{forbes.es}{ocu.org}.');
  });

  it('lee [Web: medio, fecha, URL] y no enlaza URL recortadas', () => {
    const c = citesOf(parseInline('x [Web: Expansión, 12/09/2026, https://www.expansion.com/empresas/tecnologia/2026/09/12/vodafone.html]; y 【Web: Xataka, 01/10/2026, https://www.xataka.com/movil/orange-sube...】', DOCS));
    expect(c[0]).toMatchObject({ kind: 'web', label: 'Expansión', href: 'https://www.expansion.com/empresas/tecnologia/2026/09/12/vodafone.html' });
    expect(c[0].title).toContain('12/09/2026');
    expect(c[1]).toMatchObject({ kind: 'web', label: 'Xataka' });
    expect(c[1].href).toBeUndefined();
  });

  it('enlaza [Doc: id · sección] con el documento sintético, también por id de fragmento', () => {
    const c = citesOf(parseInline('a [Doc: 02-propuesta-vodafone-business · 3. Revisión de precios] b 【Doc: 04-comparativa-actual-05 · 5. Fechas clave】', DOCS));
    expect(c[0]).toMatchObject({ kind: 'doc', label: '02 · 3. Revisión de precios', href: DOCS[0].href });
    expect(c[1]).toMatchObject({ kind: 'doc', label: '04 · 5. Fechas clave', href: DOCS[1].href });
  });

  it('admite corchetes ASCII dentro de 【】', () => {
    const c = citesOf(parseInline('a【[Web: Forbes España, 12/03/2026, https://forbes.es/x/]】 b【[Doc: 04-comparativa-actual-03 · Matriz de decisión provisional] [Web: OCU, 2026, https://www.ocu.org/a]】', DOCS));
    expect(c.map((x) => [x.kind, x.label, x.href])).toEqual([
      ['web', 'Forbes España', 'https://forbes.es/x/'],
      ['doc', '04 · Matriz de decisión provisional', DOCS[1].href],
      ['web', 'OCU', 'https://www.ocu.org/a'],
    ]);
  });

  it('separa varias citas dentro del mismo corchete', () => {
    const c = citesOf(parseInline('【Doc: 04-comparativa-actual · 2. Matriz; Web: OCU, 2026, https://www.ocu.org/a】', DOCS));
    expect(c.map((x) => x.kind)).toEqual(['doc', 'web']);
  });

  it('las marcas internas del agente quedan como una sola ficha genérica de Foundry IQ', () => {
    const c = citesOf(parseInline('dato【5:4†source】【5:5†source】 y otro【https://a.es/x】【https://a.es/x】', DOCS));
    expect(c.map((x) => x.label)).toEqual(['Foundry IQ', 'a.es']);
    expect(c[0]).toMatchObject({ kind: 'kb' });
  });

  it('negritas, enlaces markdown y URL sueltas; nunca enlaces http ni javascript', () => {
    const xs = parseInline('**Vodafone** ver [informe](https://cnmc.es/x) y https://www.oaut.es/info. Mal: [a](http://x.com) javascript:alert(1)', DOCS);
    expect(xs[0]).toEqual({ t: 'b', v: [{ t: 'text', v: 'Vodafone' }] });
    expect(xs).toContainEqual({ t: 'link', href: 'https://cnmc.es/x', label: 'informe' });
    expect(citesOf(xs).map((x) => x.href)).toEqual(['https://www.oaut.es/info']);
    expect(textOf(xs)).toContain('{oaut.es}. Mal: a javascript:alert(1)');
  });
});

describe('trimPartial', () => {
  it('oculta una cita, un enlace o una negrita a medio escribir al final', () => {
    expect(trimPartial('Hola【https://forbes.es/ult')).toBe('Hola');
    expect(trimPartial('Hola [Doc: 02-propuesta')).toBe('Hola ');
    expect(trimPartial('Hola [informe](https://cn')).toBe('Hola ');
    expect(trimPartial('Hola **')).toBe('Hola ');
    expect(trimPartial('Completo【https://a.es】')).toBe('Completo【https://a.es】');
  });
});
