// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { traceIdFor } from '../../lib/response';
import { l, type Scenario } from '../types';

/** El mismo traceId que muestra la pestaña API para cada llamada. */
const trace = (callId: string) => traceIdFor(`third-party-dd:${callId}`);

const SITE = 'https://www.brumal-construcciones.example/quienes-somos';

const question = l(
  'Antes de adjudicar el lote 3 a Construcciones Brumal S.A., revisa cambios societarios, sanciones y noticias relevantes de los últimos 12 meses.',
  'Before awarding lot 3 to Construcciones Brumal S.A., check corporate changes, sanctions and relevant news from the last 12 months.',
);

export const duediligence: Scenario = {
  id: 'third-party-dd',
  num: 4,
  icon: 'ShieldCheck',
  primaryClient: 'public-sector',
  sector: l('Sector público · Contratación', 'Public sector · Procurement'),
  title: l('Due diligence de proveedores y licitadores', 'Supplier and bidder due diligence'),
  tagline: l(
    'Antes de adjudicar: registros oficiales, sanciones, prensa en dos países y la propia web del licitador, con rastro auditable.',
    'Before awarding: official registers, sanctions, press in two countries and the bidder’s own website, with an auditable trail.',
  ),
  summary: l(
    'Contratación debe revisar a un licitador ficticio antes de adjudicar. Web IQ consulta en paralelo el registro mercantil y el boletín oficial, prensa en España y Portugal, y la web del licitador. Encuentra una sanción, un cambio de administradora que su web no refleja y una obra abandonada en otro país.',
    'Procurement must vet a fictitious bidder before awarding. Web IQ queries the company register and official gazette, press in Spain and Portugal, and the bidder’s website in parallel. It finds a sanction, a change of director the website does not reflect and a project abandoned in another country.',
  ),
  need: l(
    'No adjudicar ni contratar sin revisar a fondo a la otra parte, y poder demostrarlo.',
    'Never award or sign without thoroughly vetting the other party, and be able to prove it.',
  ),
  clientFit: {
    'public-sector': l(
      'Revisión de licitadores antes de adjudicar contratos públicos: sanciones, cambios societarios y prensa.',
      'Vetting bidders before awarding public contracts: sanctions, corporate changes and press.',
    ),
    energy: l(
      'Homologación de proveedores y contratistas de obra en varios países.',
      'Qualifying suppliers and construction contractors across several countries.',
    ),
    hospitality: l(
      'Revisión de propietarios y socios antes de firmar la gestión de un hotel.',
      'Vetting owners and partners before signing a hotel management agreement.',
    ),
    travel: l(
      'Revisión de proveedores en destino (receptivos, traslados) antes de contratarlos.',
      'Vetting destination suppliers (ground handlers, transfers) before contracting them.',
    ),
    insurance: l(
      'Control de proveedores (talleres, peritos, clínicas) y de terceros implicados en siniestros.',
      'Checks on suppliers (repair shops, adjusters, clinics) and third parties involved in claims.',
    ),
  },
  endpoints: ['web', 'news', 'browse'],
  sources: [
    {
      id: 'dd-registro',
      kind: 'web',
      title: 'Construcciones Brumal S.A. · Nombramiento de administradora única',
      url: 'https://www.registro-mercantil.example/actos/2026/09/02/brumal-administracion',
      publisher: 'Registro Mercantil (ficticio)',
      language: 'es',
      date: '2026-09-02T00:00:00+02:00',
      excerpt: 'Cese de D. Álvaro Ríos como administrador único. Nombramiento de Dña. Inés Varela Soto como administradora única. Inscrito el 02/09/2026.',
      tr: { en: 'Álvaro Ríos removed as sole director. Inés Varela Soto appointed sole director. Registered on 02/09/2026.' },
    },
    {
      id: 'dd-sancion',
      kind: 'web',
      title: 'Resolución sancionadora en materia de prevención de riesgos laborales · Construcciones Brumal S.A.',
      url: 'https://www.boletin-oficial.example/2026/05/14/sancion-prl-brumal',
      publisher: 'Boletín Oficial (ficticio)',
      language: 'es',
      date: '2026-05-14T00:00:00+02:00',
      excerpt: 'Se impone a Construcciones Brumal S.A. una sanción de 40.000 euros por una infracción grave en materia de prevención de riesgos laborales.',
      tr: { en: 'Construcciones Brumal S.A. is fined €40,000 for a serious occupational health and safety infringement.' },
    },
    {
      id: 'dd-news-es',
      kind: 'news',
      title: 'El ayuntamiento investiga sobrecostes en dos obras adjudicadas a Brumal',
      url: 'https://www.prensa-local.example/2026/07/18/brumal-sobrecostes',
      publisher: 'Prensa Local (ficticio)',
      language: 'es',
      date: '2026-07-18T08:30:00+02:00',
      excerpt: 'El ayuntamiento ha abierto un expediente para revisar los sobrecostes del 28 % en las obras del polideportivo y del centro de mayores.',
      tr: { en: 'The city council has opened proceedings to review 28% cost overruns on the sports centre and senior centre projects.' },
    },
    {
      id: 'dd-news-pt',
      kind: 'news',
      title: 'Obra abandonada em Braga: subempreiteiros denunciam pagamentos em atraso',
      url: 'https://www.jornal-norte.example/2026/08/30/braga-obra-abandonada',
      publisher: 'Jornal do Norte (fictício)',
      language: 'pt',
      date: '2026-08-30T10:00:00+01:00',
      excerpt: 'A filial portuguesa da Construcciones Brumal abandonou a obra em Braga; os subempreiteiros denunciam pagamentos em atraso desde junho.',
      tr: {
        es: 'La filial portuguesa de Construcciones Brumal abandonó la obra de Braga; los subcontratistas denuncian pagos atrasados desde junio.',
        en: 'Construcciones Brumal’s Portuguese subsidiary abandoned the Braga site; subcontractors report late payments since June.',
      },
    },
    {
      id: 'dd-web',
      kind: 'page',
      title: 'Quiénes somos · Construcciones Brumal',
      url: SITE,
      publisher: 'Construcciones Brumal (ficticio)',
      language: 'es',
      date: '2026-03-10T00:00:00+01:00',
      crawledAt: '2026-10-28T08:31:02+01:00',
      excerpt: 'Nuestro administrador, D. Álvaro Ríos, lidera la compañía desde 2015. Certificación ambiental ISO 14001: en renovación.',
      tr: { en: 'Our director, Álvaro Ríos, has led the company since 2015. ISO 14001 environmental certification: under renewal.' },
    },
    {
      id: 'dd-directory',
      kind: 'web',
      title: 'Construcciones Brumal S.A. · Ficha de empresa',
      url: 'https://www.directorio-empresas.example/construcciones-brumal-sa',
      publisher: 'Directorio de Empresas (ficticio)',
      language: 'es',
      date: '2025-11-04T00:00:00+01:00',
      excerpt: 'Construcciones Brumal S.A. Actividad: construcción de edificios. Administrador: Álvaro Ríos. Empleados: 180.',
      tr: { en: 'Construcciones Brumal S.A. Activity: building construction. Director: Álvaro Ríos. Employees: 180.' },
    },
  ],
  variants: {
    webiq: {
      label: l('Con Web IQ', 'With Web IQ'),
      desc: l('Registros oficiales + prensa ES/PT + web del licitador, con traceId por llamada.', 'Official registers + ES/PT press + bidder website, with a traceId per call.'),
      citations: ['dd-sancion', 'dd-registro', 'dd-web', 'dd-news-es', 'dd-news-pt'],
      steps: [
        { kind: 'user', id: 'u', text: question },
        {
          kind: 'plan',
          id: 'p',
          text: l(
            'Plan: registro mercantil y boletín oficial con site:, prensa en España y Portugal (tiene filial allí) y la web del licitador para contrastar lo que declara.',
            'Plan: company register and official gazette with site:, press in Spain and Portugal (it has a subsidiary there) and the bidder’s website to check what it declares.',
          ),
        },
        {
          kind: 'calls',
          id: 'c1',
          calls: [
            {
              id: 'd1',
              endpoint: 'web',
              label: l('Registro mercantil (site:)', 'Company register (site:)'),
              request: { query: '"Construcciones Brumal" site:registro-mercantil.example', maxResults: 10, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 139,
              results: ['dd-registro'],
              returned: 3,
            },
            {
              id: 'd2',
              endpoint: 'web',
              label: l('Boletín oficial (site:)', 'Official gazette (site:)'),
              request: { query: '"Construcciones Brumal" sanción site:boletin-oficial.example', maxResults: 10, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 144,
              results: ['dd-sancion'],
              returned: 2,
            },
            {
              id: 'd3',
              endpoint: 'news',
              label: l('Prensa · es-ES', 'Press · es-ES'),
              request: { query: '"Construcciones Brumal"', maxResults: 20, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 163,
              results: ['dd-news-es'],
              returned: 5,
            },
            {
              id: 'd4',
              endpoint: 'news',
              label: l('Prensa · pt-PT', 'Press · pt-PT'),
              request: { query: '"Construcciones Brumal" Braga', maxResults: 10, language: 'pt', region: 'PT', contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 176,
              results: ['dd-news-pt'],
              returned: 2,
            },
            {
              id: 'd5',
              endpoint: 'browse',
              label: l('Web del licitador', 'Bidder website'),
              request: { url: SITE, liveCrawl: 'fallback', contentFormat: 'markdown', maxLength: 10000 },
              latencyMs: 520,
              results: ['dd-web'],
            },
          ],
        },
        {
          kind: 'reason',
          id: 'r',
          text: l(
            'Discrepancia: el registro inscribió una nueva administradora el 02-sep, pero la web sigue mostrando al anterior. La ISO 14001 figura «en renovación».',
            'Mismatch: the register recorded a new director on 2 Sep, but the website still shows the previous one. ISO 14001 is listed as “under renewal”.',
          ),
        },
        {
          kind: 'answer',
          id: 'a',
          text: l(
            'Recomiendo **adjudicar con condiciones**. Hay una sanción grave de 40.000 € en prevención de riesgos (14-may-2026) [1] y un cambio de administradora el 02-sep-2026 [2] que su web aún no refleja [3]. Además, se investigan sobrecostes del 28 % en España [4] y su filial abandonó una obra en Braga con impagos [5].',
            'I recommend a **conditional award**. There is a serious €40,000 health-and-safety fine (14 May 2026) [1] and a change of director on 2 Sep 2026 [2] that its website still does not reflect [3]. Also, 28% cost overruns are under investigation in Spain [4] and its subsidiary abandoned a project in Braga with unpaid bills [5].',
          ),
          flags: [l('Fuentes oficiales', 'Official sources'), l('Dos países', 'Two countries'), l('Rastro auditable', 'Auditable trail')],
          artifact: {
            kind: 'scorecard',
            title: l('Ficha de riesgo · Construcciones Brumal S.A.', 'Risk sheet · Construcciones Brumal S.A.'),
            verdict: {
              tone: 'warn',
              text: l(
                'Adjudicación condicionada: pedir aclaraciones sobre la sanción, la solvencia (Braga) y la certificación ambiental.',
                'Conditional award: request clarification on the sanction, solvency (Braga) and environmental certification.',
              ),
            },
            dims: [
              { name: l('Sanciones', 'Sanctions'), level: 'high', note: l('Infracción grave en prevención de riesgos: 40.000 € (14-may-2026)', 'Serious health-and-safety infringement: €40,000 (14 May 2026)'), cite: 1 },
              { name: l('Solvencia y pagos', 'Solvency and payments'), level: 'high', note: l('Obra abandonada en Braga; impagos desde junio', 'Braga project abandoned; unpaid since June'), cite: 5 },
              { name: l('Gobierno corporativo', 'Corporate governance'), level: 'medium', note: l('Nueva administradora desde el 02-sep-2026; la web no lo refleja', 'New director since 2 Sep 2026; the website does not reflect it'), cite: 2 },
              { name: l('Prensa', 'Press'), level: 'medium', note: l('Expediente por sobrecostes del 28 % (jul-2026)', 'Proceedings over 28% cost overruns (Jul 2026)'), cite: 4 },
              { name: l('Certificaciones', 'Certifications'), level: 'medium', note: l('ISO 14001 «en renovación» según su web', 'ISO 14001 “under renewal” per its website'), cite: 3 },
            ],
            trail: [
              { endpoint: 'web', target: '"Construcciones Brumal" site:registro-mercantil.example', traceId: trace('d1'), at: '08:30:58' },
              { endpoint: 'web', target: '"Construcciones Brumal" sanción site:boletin-oficial.example', traceId: trace('d2'), at: '08:30:58' },
              { endpoint: 'news', target: '"Construcciones Brumal" (es-ES)', traceId: trace('d3'), at: '08:30:58' },
              { endpoint: 'news', target: '"Construcciones Brumal" Braga (pt-PT)', traceId: trace('d4'), at: '08:30:58' },
              { endpoint: 'browse', target: SITE, traceId: trace('d5'), at: '08:31:02' },
            ],
            note: l(
              'El rastro guarda consulta, URL, hora y traceId, no el contenido, como piden los términos de uso.',
              'The trail keeps query, URL, time and traceId, not the content, as the terms of use require.',
            ),
          },
        },
      ],
    },
    bing: {
      label: l('Con Grounding with Bing', 'With Grounding with Bing'),
      desc: l('Agente de Foundry con bing_grounding (market es-ES).', 'Foundry agent with bing_grounding (market es-ES).'),
      citations: ['dd-directory'],
      steps: [
        { kind: 'user', id: 'u', text: question },
        {
          kind: 'bing',
          id: 'b',
          query: 'Construcciones Brumal S.A. sanciones noticias',
          citations: ['dd-directory'],
          config: 'count: 5 · market: es-ES',
        },
        {
          kind: 'answer',
          id: 'a',
          text: l(
            'Construcciones Brumal S.A. es una constructora con unos 180 empleados cuyo administrador es Álvaro Ríos [1]. No se han encontrado sanciones ni noticias negativas relevantes.',
            'Construcciones Brumal S.A. is a construction company with about 180 employees whose director is Álvaro Ríos [1]. No sanctions or relevant negative news were found.',
          ),
        },
        {
          kind: 'gap',
          id: 'g1',
          title: l('Un «no se ha encontrado» sin pruebas', 'A “nothing found” with no evidence'),
          text: l(
            'El agente devuelve texto y una cita. No hay resultados, fechas ni pasajes que un auditor pueda revisar para sostener que no hay sanciones.',
            'The agent returns text and one citation. There are no results, dates or passages an auditor can review to support the claim that there are no sanctions.',
          ),
          workaround: l('Proveedor de datos de empresas (KYB) + revisión manual de boletines.', 'Company data provider (KYB) + manual gazette review.'),
        },
        {
          kind: 'gap',
          id: 'g2',
          title: l('Dato desactualizado', 'Outdated data'),
          text: l(
            'La ficha citada es de nov-2025 y nombra a un administrador que ya no lo es. Sin fecha por resultado, la aplicación no puede detectarlo.',
            'The cited listing is from Nov 2025 and names a director who no longer holds the post. Without a per-result date, the app cannot notice.',
          ),
          workaround: l('Consultar el registro oficial a mano.', 'Check the official register by hand.'),
        },
        {
          kind: 'gap',
          id: 'g3',
          title: l('Ni su web ni la prensa portuguesa', 'Neither its website nor Portuguese press'),
          text: l(
            'No lee URLs concretas y el mercado está fijado en es-ES: la obra abandonada en Braga no aparece.',
            'It does not read specific URLs and the market is fixed to es-ES: the abandoned Braga project never shows up.',
          ),
          workaround: l('Otra herramienta con market pt-PT + un scraper.', 'Another tool with market pt-PT + a scraper.'),
        },
      ],
    },
  },
  diyLabel: l('Proveedor KYB + horas de analista', 'KYB provider + analyst hours'),
  compare: [
    {
      need: l('Buscar en registros y boletines oficiales', 'Search official registers and gazettes'),
      webiq: ['yes', l('site: por fuente, en paralelo', 'site: per source, in parallel')],
      bing: ['partial', l('Bing Custom Search por dominio', 'Bing Custom Search per domain')],
      diy: ['partial', l('Proveedor KYB (licencia)', 'KYB provider (licence)')],
    },
    {
      need: l('Fecha y pasaje de cada hallazgo', 'Date and passage for every finding'),
      webiq: ['yes', l('lastUpdatedAt + pasaje', 'lastUpdatedAt + passage')],
      bing: ['no', l('Solo título y URL', 'Only title and URL')],
      diy: ['yes', l('En proveedores de pago', 'In paid providers')],
    },
    {
      need: l('Prensa de otros países e idiomas', 'Press from other countries and languages'),
      webiq: ['yes', l('news con language/region (pt-PT)', 'news with language/region (pt-PT)')],
      bing: ['partial', l('Un market por configuración', 'One market per configuration')],
      diy: ['partial', l('Cobertura variable', 'Variable coverage')],
    },
    {
      need: l('Contrastar con la web del licitador', 'Cross-check with the bidder’s website'),
      webiq: ['yes', l('browse de la URL', 'browse the URL')],
      bing: ['no', l('No abre URLs concretas', 'Does not open specific URLs')],
      diy: ['no', l('Manual', 'Manual')],
    },
    {
      need: l('Rastro auditable', 'Auditable trail'),
      webiq: ['yes', l('traceId por llamada, sin guardar contenido', 'traceId per call, without storing content')],
      bing: ['partial', l('Enlace a la consulta de Bing', 'Link to the Bing query')],
      diy: ['partial', l('Depende del proveedor', 'Depends on the provider')],
    },
    {
      need: l('Dentro de nuestra herramienta de compras', 'Inside our procurement tool'),
      webiq: ['yes', l('API, SDK o MCP desde cualquier aplicación', 'API, SDK or MCP from any application')],
      bing: ['partial', l('Solo dentro del agente', 'Only inside the agent')],
      diy: ['yes', l('Integración propia', 'Custom integration')],
    },
  ],
  cost: {
    unit: l('revisión de un licitador (5 llamadas)', 'one bidder review (5 calls)'),
    runsPerMonth: 400,
    runsHint: l('≈400 licitadores al mes', '≈400 bidders a month'),
    diy: {
      label: l('Proveedor KYB + horas de analista', 'KYB provider + analyst hours'),
      monthly: 4000,
      basis: l(
        'Supuesto ilustrativo: suscripción a un proveedor de datos de empresas + horas de analista. Cámbialo por tu cifra.',
        'Illustrative assumption: company data provider subscription + analyst hours. Replace with your own figure.',
      ),
    },
  },
  live: [
    {
      label: l('Boletín Oficial del Estado (site:)', 'Spanish Official Gazette (site:)'),
      endpoint: 'web',
      body: { query: '"{client}" site:boe.es', maxResults: 5, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
    },
    {
      label: l('Prensa: sanciones e investigaciones', 'Press: sanctions and investigations'),
      endpoint: 'news',
      body: { query: '"{client}" sanción OR multa OR investigación', maxResults: 10, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
    },
  ],
  takeaways: [
    l('Consultas dirigidas a fuentes oficiales: hallazgos con fecha y pasaje, no un «no se ha encontrado».', 'Targeted queries to official sources: findings with date and passage, not a “nothing found”.'),
    l('browse contrasta el registro con la web del licitador y detecta incoherencias.', 'browse checks the register against the bidder’s website and spots mismatches.'),
    l('traceId por llamada: rastro auditable sin almacenar contenido.', 'A traceId per call: an auditable trail without storing content.'),
  ],
};
