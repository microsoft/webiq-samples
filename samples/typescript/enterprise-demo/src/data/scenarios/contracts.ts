// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { l, type Scenario, type Source } from '../types';

/**
 * Caso 6. Los contratos son documentos SINTÉTICOS (public/foundry/contratos-telco) indexados en Foundry IQ;
 * las noticias e informes son fuentes públicas REALES, con URL, fecha y fragmento literal verificados el 5-nov-2026.
 * Nunca se atribuyen a los operadores reales las cláusulas sintéticas.
 */
const DOCS = '/foundry/contratos-telco';
const DOC_PUBLISHER = 'Logística Meridiana · Compras (sintético)';

/** Mismo texto que REFERENCE_PROMPT en foundry/run-agent.mjs (lo comprueba integrity.test.ts). */
const question = l(
  'Revisa las ofertas de Movistar Empresas, Vodafone Business y Orange Empresas del expediente COMPRAS-TEL-2026-031 y completa nuestra comparativa actual con una revisión reputacional actualizada de cada operador: subidas de tarifas e IPC, reclamaciones y satisfacción de clientes, caídas de servicio, sanciones y reseñas de usuarios. Dame la matriz de decisión ponderada sobre 100, con fuentes, y tu recomendación para el comité del 10 de diciembre.',
  'Review the offers from Movistar Empresas, Vodafone Business and Orange Empresas in file COMPRAS-TEL-2026-031 and complete our current comparison with an up-to-date reputational review of each operator: price rises and CPI, complaints and customer satisfaction, service outages, sanctions and user reviews. Give me the weighted decision matrix out of 100, with sources, and your recommendation for the 10 December committee meeting.',
);

const doc = (id: string, file: string, title: string, date: string, excerpt: string, en: string): Source => ({
  id,
  kind: 'doc',
  title,
  url: `${DOCS}/${file}`,
  publisher: DOC_PUBLISHER,
  language: 'es',
  date,
  excerpt,
  tr: { en },
});

const kbStep = {
  kind: 'kb' as const,
  id: 'k',
  label: l('Expediente COMPRAS-TEL-2026-031', 'File COMPRAS-TEL-2026-031'),
  knowledgeBase: 'kb-contratos-telco',
  queries: [
    'comparativa actual: puntuaciones, criterio pendiente y fechas límite',
    'cláusulas de revisión de precios (IPC) y penalizaciones por salida',
    'SLA, MTTR y créditos de cada operador',
    'incidencias de 2026 y coste de las caídas',
  ],
  results: ['tc-doc-cmp', 'tc-doc-vf', 'tc-doc-mov', 'tc-doc-or', 'tc-doc-inc', 'tc-doc-ctx'],
  latencyMs: 860,
};

const PASSAGE = { language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 } as const;

export const contracts: Scenario = {
  id: 'supplier-contracts',
  num: 6,
  icon: 'Handshake',
  primaryClient: 'energy',
  sector: l('Compras · Proveedores TIC', 'Procurement · ICT suppliers'),
  title: l('Contratos de proveedores con Foundry IQ y Web IQ', 'Supplier contracts with Foundry IQ and Web IQ'),
  tagline: l(
    'Un agente de Foundry lee tres ofertas de telecomunicaciones con Foundry IQ y completa la decisión con la reputación actual de cada operador, con fecha y fuente.',
    'A Foundry agent reads three telecom offers with Foundry IQ and completes the decision with each operator’s current reputation, with date and source.',
  ),
  summary: l(
    'Logística Meridiana (ficticia) renueva sus telecomunicaciones y tiene tres ofertas sintéticas de Movistar Empresas, Vodafone Business y Orange Empresas. Un agente de Foundry lee contratos, comparativa e incidencias con Foundry IQ y lanza seis búsquedas reales con Web IQ: subidas de tarifas, reclamaciones, encuestas y caídas. La reputación no cambia la adjudicación, pero sí lo que hay que negociar.',
    'Logística Meridiana (fictitious) is renewing its telecom services and has three synthetic offers from Movistar Empresas, Vodafone Business and Orange Empresas. A Foundry agent reads contracts, comparison and incidents with Foundry IQ and runs six real Web IQ searches: price rises, complaints, surveys and outages. Reputation does not change the award, but it does change what to negotiate.',
  ),
  need: l(
    'Elegir proveedor con lo que dice su contrato y con lo que se dice de él hoy.',
    'Choose a supplier based on what its contract says and on what is being said about it today.',
  ),
  clientFit: {
    energy: l(
      'Homologación y renovación de proveedores críticos: contratos internos más reputación, sanciones y noticias recientes.',
      'Qualifying and renewing critical suppliers: internal contracts plus reputation, sanctions and recent news.',
    ),
    hospitality: l(
      'Conectividad de cada hotel: elegir operador por precio, SLA y lo que dicen hoy sus clientes.',
      'Connectivity for every hotel: choosing an operator on price, SLA and what its customers say today.',
    ),
    travel: l(
      'Contratos de comunicaciones del contact center y de las oficinas en varios países.',
      'Communications contracts for the contact centre and offices across several countries.',
    ),
    insurance: l(
      'Telefonía del contact center de siniestros y de la red de oficinas: precio estable y SLA exigible.',
      'Telephony for the claims contact centre and the branch network: stable prices and an enforceable SLA.',
    ),
    'public-sector': l(
      'Renovación de servicios de telecomunicaciones: contrastar las ofertas con datos públicos, fechados y verificables.',
      'Renewing telecom services: checking offers against public, dated and verifiable data.',
    ),
  },
  endpoints: ['news', 'web'],
  dataNote: l('Contratos sintéticos · noticias reales (5-nov-2026)', 'Synthetic contracts · real news (5 Nov 2026)'),
  foundry: {
    name: 'revisor-contratos-telco',
    project: '<your-foundry-project>',
    model: 'gpt-5.4-mini',
    knowledgeBase: 'kb-contratos-telco',
    tools: ['foundry_iq_contratos', 'web_iq'],
    prompt: question,
    docs: ['tc-doc-ctx', 'tc-doc-mov', 'tc-doc-vf', 'tc-doc-or', 'tc-doc-cmp', 'tc-doc-inc'],
    version: '3',
    portal: 'https://ai.azure.com/',
  },
  sources: [
    doc(
      'tc-doc-ctx',
      '00-contexto-y-requisitos.md',
      'Contexto y requisitos · Renovación de telecomunicaciones 2027-2029',
      '2026-10-15T00:00:00+02:00',
      'El comité no dispone de datos objetivos y actuales para el criterio de reputación. Hay que completarlo antes de decidir con fuentes externas recientes…',
      'The committee has no objective, current data for the reputation criterion. It must be completed before deciding, using recent external sources…',
    ),
    doc(
      'tc-doc-mov',
      '01-propuesta-movistar-empresas.md',
      'Propuesta de servicios · Movistar Empresas (MOV-EMP-2026-1147)',
      '2026-10-09T00:00:00+02:00',
      'Cláusula 7.2. Las cuotas se actualizarán cada 1 de enero según la variación interanual del IPC general publicado por el INE (dato de octubre del año anterior) más 1 punto porcentual.',
      'Clause 7.2. Fees will be updated every 1 January in line with the year-on-year change in the general CPI published by INE (October figure of the previous year) plus 1 percentage point.',
    ),
    doc(
      'tc-doc-vf',
      '02-propuesta-vodafone-business.md',
      'Propuesta de servicios · Vodafone Business (VFB-ES-2026-88213)',
      '2026-10-13T00:00:00+02:00',
      'Cláusula 9.4. Vodafone podrá modificar precios o condiciones por causas comerciales o de mercado comunicándolo con un mes de antelación.',
      'Clause 9.4. Vodafone may change prices or conditions for commercial or market reasons with one month’s notice.',
    ),
    doc(
      'tc-doc-or',
      '03-propuesta-orange-empresas.md',
      'Propuesta de renovación · Orange Empresas (ORG-REN-2026-0412)',
      '2026-10-14T00:00:00+02:00',
      'Cláusula 6.3. Precios congelados durante los primeros 12 meses. Después se actualizarán cada año según el IPC general publicado por el INE, con un tope del 3 % anual.',
      'Clause 6.3. Prices frozen for the first 12 months. After that they will be updated every year in line with the general CPI published by INE, capped at 3% a year.',
    ),
    doc(
      'tc-doc-cmp',
      '04-comparativa-actual.md',
      'Comparativa actual de ofertas · Matriz de decisión provisional',
      '2026-10-20T00:00:00+02:00',
      'Conclusión provisional: Vodafone Business encabeza la comparativa con 5,2 puntos de ventaja sobre Orange, sobre todo por precio.',
      'Provisional conclusion: Vodafone Business leads the comparison by 5.2 points over Orange, mainly on price.',
    ),
    doc(
      'tc-doc-inc',
      '05-historico-incidencias-2026.md',
      'Histórico de incidencias de telecomunicaciones 2026',
      '2026-10-01T00:00:00+02:00',
      'La incidencia de Getafe del 22 de julio paralizó la preparación de pedidos durante el turno de tarde. Impacto estimado: unos 160.000 € frente a un crédito SLA recibido de 16,25 €.',
      'The Getafe incident on 22 July halted order picking during the afternoon shift. Estimated impact: about €160,000 against an SLA credit received of €16.25.',
    ),
    {
      id: 'tc-vf-ipc',
      kind: 'news',
      real: true,
      title: 'Vodafone desliga sus tarifas del IPC y subirá un 3,9% sus precios',
      url: 'https://www.zonamovilidad.es/vodafone-desliga-tarifas-ipc-subira-3-9-por-ciento-precios',
      publisher: 'Zonamovilidad',
      language: 'es',
      date: '2025-12-01T10:00:00+01:00',
      excerpt: 'Vodafone España encarecerá sus tarifas a partir del 8 de enero de 2026 con una subida media de 2,5 euros al mes, equivalente a un incremento del 3,9%',
      tr: { en: 'Vodafone Spain will raise its prices from 8 January 2026 by an average of €2.50 a month, equivalent to a 3.9% increase' },
    },
    {
      id: 'tc-mov-ipc',
      kind: 'news',
      real: true,
      title: 'Las tarifas de Movistar en 2026 suben de precio: así quedan las ofertas de fibra, móvil y televisión a partir de ahora',
      url: 'https://www.xatakamovil.com/movistar/movistar-sube-precio-a-partir-hoy-estas-tarifas-fibra-movil-television-afectadas',
      publisher: 'Xataka Móvil',
      language: 'es',
      date: '2026-01-13T10:00:00+01:00',
      excerpt: 'De media, los precios subirán un 4%, aunque será más acusado en las tarifas convergentes con servicio de televisión.',
      tr: { en: 'On average, prices will rise by 4%, although the increase will be steeper for converged plans that include TV.' },
    },
    {
      id: 'tc-or-ipc',
      kind: 'news',
      real: true,
      title: 'Orange subirá sus tarifas un 3,8% en enero de 2026 y encarece sus paquetes convergentes hasta 6 euros',
      url: 'https://www.zonamovilidad.es/orange-subira-tarifas-3-8-por-ciento-enero-2026-encarece-paquetes-convergentes-hasta-6-euros',
      publisher: 'Zonamovilidad',
      language: 'es',
      date: '2025-12-01T11:00:00+01:00',
      excerpt: 'Orange aplicará una nueva subida de precios en sus tarifas a partir del próximo 12 de enero de 2026 que supondrá un incremento medio del 3,8%',
      tr: { en: 'Orange will apply a new price rise to its plans from 12 January 2026, an average increase of 3.8%' },
    },
    {
      id: 'tc-mov-caida',
      kind: 'news',
      real: true,
      title: 'Movistar soluciona la avería que ha dejado sin internet a 100.000 pymes durante 3 horas',
      url: 'https://www.elconfidencial.com/tecnologia/2026-02-18/caida-movistar-conexion-internet-1qrt_4305303/',
      publisher: 'El Confidencial',
      language: 'es',
      date: '2026-02-18T10:38:00+01:00',
      excerpt: 'Después de más de tres horas caída, la compañía confirma que ya ha arreglado la avería y que la recuperación del servicio será progresiva.',
      tr: { en: 'After more than three hours down, the company confirms it has fixed the fault and that service will be restored gradually.' },
    },
    {
      id: 'tc-oaut',
      kind: 'news',
      real: true,
      title: 'Las reclamaciones entre las grandes telecos suben un 29% en 2025, con Adamo como la más denunciada',
      url: 'https://forbes.es/ultima-hora/979689/las-reclamaciones-entre-las-grandes-telecos-suben-un-29-en-2025-con-adamo-como-la-mas-denunciada/',
      publisher: 'Forbes España',
      language: 'es',
      date: '2026-07-14T17:23:38+02:00',
      excerpt: 'En el extremo opuesto, Adamo fue la que contabilizó una mayor tasa de reclamaciones por sus servicios convergentes en 2025 (5,93), seguida de Digi Spain, con 2,29, y Vodafone, con 2,21.',
      tr: { en: 'At the other end, Adamo had the highest complaint rate for converged services in 2025 (5.93), followed by Digi Spain at 2.29 and Vodafone at 2.21.' },
    },
    {
      id: 'tc-vf-73',
      kind: 'news',
      real: true,
      title: 'Vodafone reduce hasta un 73% sus reclamaciones en tres años',
      url: 'https://www.europapress.es/economia/noticia-vodafone-reduce-73-reclamaciones-tres-anos-20260826130309.html',
      publisher: 'Europa Press',
      language: 'es',
      date: '2026-08-26T13:03:00+02:00',
      excerpt: 'Vodafone España ha reducido sus reclamaciones recibidas en hasta un 73% en los últimos tres años y consolida su giro en atención al cliente',
      tr: { en: 'Vodafone Spain has cut the complaints it receives by up to 73% over the last three years and is consolidating its turnaround in customer service' },
    },
    {
      id: 'tc-ocu',
      kind: 'web',
      real: true,
      title: 'Encuesta: Pepephone, Parlem y Cableworld, los operadores con el servicio de Internet mejor valorado',
      url: 'https://www.ocu.org/organizacion/prensa/notas-de-prensa/2026/enctelec140426',
      publisher: 'OCU',
      language: 'es',
      date: '2026-04-14T00:00:00+02:00',
      excerpt: 'La encuesta también recoge la satisfacción con la atención al cliente y la facturación, donde se observan grandes diferencias entre compañías: los peores resultados son para Dazn, Orange y Vodafone',
      tr: { en: 'The survey also covers satisfaction with customer service and billing, with big differences between companies: the worst results are for Dazn, Orange and Vodafone' },
    },
    {
      id: 'tc-ep-2024',
      kind: 'news',
      real: true,
      title: 'Las reclamaciones entre las grandes telecos caen un 29% en 2024, con Digi como la menos denunciada',
      url: 'https://www.europapress.es/economia/noticia-reclamaciones-grandes-telecos-caen-29-2024-digi-menos-denunciada-20250707135214.html',
      publisher: 'Europa Press',
      language: 'es',
      date: '2025-07-07T13:52:14+02:00',
      excerpt: 'Vodafone fue la que obtuvo una mayor tasa de reclamaciones por sus servicios convergentes en 2024 (2,96), seguida de Yoigo (MasOrange), con 2,69, y MásMóvil (ahora en MasOrange), con 2,66.',
      tr: { en: 'Vodafone had the highest complaint rate for converged services in 2024 (2.96), followed by Yoigo (MasOrange) at 2.69 and MásMóvil (now part of MasOrange) at 2.66.' },
    },
  ],
  variants: {
    webiq: {
      label: l('Con Web IQ', 'With Web IQ'),
      desc: l(
        'Agente de Foundry con Foundry IQ (contratos) y Web IQ por MCP (news y web, es-ES).',
        'Foundry agent with Foundry IQ (contracts) and Web IQ over MCP (news and web, es-ES).',
      ),
      citations: ['tc-doc-cmp', 'tc-vf-ipc', 'tc-doc-vf', 'tc-mov-ipc', 'tc-or-ipc', 'tc-mov-caida', 'tc-oaut', 'tc-ocu', 'tc-vf-73'],
      steps: [
        { kind: 'user', id: 'u', text: question },
        {
          kind: 'plan',
          id: 'p',
          text: l(
            'Plan: primero, Foundry IQ para leer la comparativa, las cláusulas de precio y SLA y las incidencias. Después, seis búsquedas en paralelo con Web IQ: subidas de tarifas de cada operador, reclamaciones oficiales, la encuesta de OCU y caídas recientes.',
            'Plan: first, Foundry IQ to read the comparison, the price and SLA clauses and the incidents. Then six parallel Web IQ searches: each operator’s price rises, official complaints, the OCU survey and recent outages.',
          ),
        },
        kbStep,
        {
          kind: 'reason',
          id: 'r1',
          text: l(
            'La comparativa deja sin puntuar la reputación (20 puntos). Vodafone lidera con 66,0 frente a 60,8 de Orange, y una diferencia de 6 puntos en reputación cambiaría el orden. Riesgo a contrastar: las cláusulas de precio sin tope de Vodafone (9.1 y 9.4) y Movistar (7.2).',
            'The comparison leaves reputation (20 points) unscored. Vodafone leads with 66.0 against 60.8 for Orange, and a 6-point gap in reputation would change the order. Risk to check: the uncapped price clauses of Vodafone (9.1 and 9.4) and Movistar (7.2).',
          ),
        },
        {
          kind: 'calls',
          id: 'c1',
          calls: [
            {
              id: 't1',
              endpoint: 'news',
              label: l('Vodafone · tarifas 2026', 'Vodafone · 2026 prices'),
              request: { query: 'Vodafone subida tarifas 2026 IPC', maxResults: 10, ...PASSAGE },
              latencyMs: 151,
              results: ['tc-vf-ipc'],
              returned: 8,
            },
            {
              id: 't2',
              endpoint: 'news',
              label: l('Movistar · tarifas 2026', 'Movistar · 2026 prices'),
              request: { query: 'Movistar subida precios enero 2026', maxResults: 10, ...PASSAGE },
              latencyMs: 158,
              results: ['tc-mov-ipc'],
              returned: 9,
            },
            {
              id: 't3',
              endpoint: 'news',
              label: l('Orange · tarifas 2026', 'Orange · 2026 prices'),
              request: { query: 'Orange subida tarifas enero 2026', maxResults: 10, ...PASSAGE },
              latencyMs: 147,
              results: ['tc-or-ipc'],
              returned: 7,
            },
            {
              id: 't4',
              endpoint: 'news',
              label: l('Reclamaciones oficiales (OAUT)', 'Official complaints (OAUT)'),
              request: { query: 'reclamaciones operadores telecomunicaciones 2025 por cada 10.000 abonados', maxResults: 10, ...PASSAGE },
              latencyMs: 166,
              results: ['tc-oaut', 'tc-vf-73'],
              returned: 6,
            },
            {
              id: 't5',
              endpoint: 'web',
              label: l('Encuesta de satisfacción (OCU)', 'Satisfaction survey (OCU)'),
              request: { query: 'encuesta OCU satisfacción operadores telecomunicaciones 2026', maxResults: 10, ...PASSAGE },
              latencyMs: 139,
              results: ['tc-ocu'],
              returned: 10,
            },
            {
              id: 't6',
              endpoint: 'news',
              label: l('Caídas del servicio', 'Service outages'),
              request: { query: 'caída Movistar Vodafone Orange empresas sin internet 2026', maxResults: 10, ...PASSAGE },
              latencyMs: 172,
              results: ['tc-mov-caida'],
              returned: 5,
            },
          ],
        },
        {
          kind: 'reason',
          id: 'r2',
          text: l(
            'Cada resultado trae fecha: el informe de reclamaciones de 2025 (publicado en jul-2026) sustituye al de 2024. OAUT y OCU miden el mercado residencial, así que son una señal para empresas, no una prueba. Con un IPC del 4 %, Vodafone sigue siendo la oferta más barata.',
            'Every result has a date: the 2025 complaints report (published in Jul 2026) replaces the 2024 one. OAUT and OCU measure the consumer market, so they are a signal for businesses, not proof. With 4% CPI, Vodafone is still the cheapest offer.',
          ),
        },
        {
          kind: 'answer',
          id: 'a',
          text: l(
            '**Recomiendo adjudicar a Vodafone Business con condiciones**: 75,0 sobre 100, por delante de Orange (71,8) y Movistar (69,5). Ya lideraba por precio [1] y la reputación no cambia el orden, aunque reduce su ventaja de 5,2 a 3,2 puntos. Vodafone desligó sus tarifas del IPC y las subió un 3,9 % en enero [2], el mismo riesgo que abren sus cláusulas 9.1 y 9.4 [3]; Movistar subió un 4 % [4] y Orange un 3,8 % [5]. En febrero, una avería de Movistar dejó sin internet a unas 100.000 pymes durante más de tres horas [6]. En 2025, Vodafone tuvo la tercera mayor tasa de reclamaciones convergentes (2,21 por cada 10.000 abonados) [7] y OCU sitúa a Orange y Vodafone entre los peores en atención y facturación [8], aunque Vodafone ha reducido un 73 % sus reclamaciones en tres años [9].',
            '**I recommend awarding Vodafone Business with conditions**: 75.0 out of 100, ahead of Orange (71.8) and Movistar (69.5). It already led on price [1] and reputation does not change the order, although it narrows its lead from 5.2 to 3.2 points. Vodafone decoupled its prices from the CPI and raised them by 3.9% in January [2], the same risk its clauses 9.1 and 9.4 open up [3]; Movistar raised prices by 4% [4] and Orange by 3.8% [5]. In February, a Movistar fault left some 100,000 SMEs without internet for more than three hours [6]. In 2025, Vodafone had the third-highest complaint rate for converged services (2.21 per 10,000 subscribers) [7] and OCU ranks Orange and Vodafone among the worst for customer service and billing [8], although Vodafone has cut its complaints by 73% in three years [9].',
          ),
          flags: [l('Foundry IQ + Web IQ', 'Foundry IQ + Web IQ'), l('Fuentes reales con fecha', 'Real sources with dates'), l('Agente ejecutable en vivo', 'Agent runnable live')],
          artifact: {
            kind: 'table',
            title: l('Matriz de decisión con reputación · COMPRAS-TEL-2026-031', 'Decision matrix with reputation · COMPRAS-TEL-2026-031'),
            columns: [l('Criterio (peso)', 'Criterion (weight)'), l('Movistar Empresas', 'Movistar Empresas'), l('Vodafone Business', 'Vodafone Business'), l('Orange Empresas', 'Orange Empresas')],
            rows: [
              [
                { text: l('Precio (40)', 'Price (40)') },
                { text: l('29,5 · TCO 193.810 €', '29.5 · TCO €193,810'), cite: 1 },
                { text: l('40,0 · TCO 184.151 €', '40.0 · TCO €184,151'), cite: 1, tone: 'ok' },
                { text: l('33,8 · TCO 189.852 €', '33.8 · TCO €189,852'), cite: 1 },
              ],
              [
                { text: l('SLA (25)', 'SLA (25)') },
                { text: l('23 · MTTR 4 h, 24×7', '23 · MTTR 4 h, 24×7'), tone: 'ok' },
                { text: l('17 · MTTR 6 h en horario laboral', '17 · MTTR 6 h in business hours'), tone: 'warn' },
                { text: l('14 · MTTR 8 h en almacenes', '14 · MTTR 8 h at warehouses'), tone: 'bad' },
              ],
              [
                { text: l('Flexibilidad (15)', 'Flexibility (15)') },
                { text: l('5 · 36 meses; salida: 100 % de lo pendiente', '5 · 36 months; exit: 100% of what remains'), tone: 'warn' },
                { text: l('9 · 24 meses; salida: 50 %', '9 · 24 months; exit: 50%') },
                { text: l('13 · 24 meses; penalización proporcional', '13 · 24 months; pro-rata penalty'), tone: 'ok' },
              ],
              [
                { text: l('Reputación (20)', 'Reputation (20)') },
                { text: l('12 · caída que afectó a pymes (feb-2026)', '12 · outage that hit SMEs (Feb 2026)'), cite: 6 },
                { text: l('9 · 2,21 reclamaciones convergentes', '9 · 2.21 converged complaints'), cite: 7, tone: 'warn' },
                { text: l('11 · OCU: atención y facturación', '11 · OCU: service and billing'), cite: 8 },
              ],
              [
                { text: l('Total (100)', 'Total (100)') },
                { text: l('69,5', '69.5') },
                { text: l('75,0', '75.0'), tone: 'ok' },
                { text: l('71,8', '71.8') },
              ],
              [
                { text: l('Qué negociar', 'What to negotiate') },
                { text: l('Tope a la cláusula IPC + 1 y salida por SLA', 'Cap on the CPI + 1 clause and SLA exit') },
                { text: l('Tope ≤3 % en la 9.1, quitar la 9.4 y MTTR 6 h 24×7', 'Cap ≤3% in 9.1, remove 9.4 and MTTR 6 h 24×7'), cite: 3, tone: 'warn' },
                { text: l('Incluir Reparación Premium (MTTR 6 h)', 'Include Premium Repair (MTTR 6 h)') },
              ],
            ],
            note: l(
              'Precio, SLA y flexibilidad, de la comparativa interna. Contratos sintéticos; noticias reales verificadas el 5-nov-2026. OAUT y OCU miden el mercado residencial: son una señal, no una prueba, para empresas.',
              'Price, SLA and flexibility come from the internal comparison. Synthetic contracts; real news verified on 5 Nov 2026. OAUT and OCU measure the consumer market: a signal, not proof, for businesses.',
            ),
          },
        },
      ],
    },
    bing: {
      label: l('Con Grounding with Bing', 'With Grounding with Bing'),
      desc: l(
        'Agente de Foundry con Foundry IQ (contratos) y bing_grounding (market es-ES).',
        'Foundry agent with Foundry IQ (contracts) and bing_grounding (market es-ES).',
      ),
      citations: ['tc-doc-cmp', 'tc-ep-2024', 'tc-vf-ipc'],
      steps: [
        { kind: 'user', id: 'u', text: question },
        kbStep,
        {
          kind: 'bing',
          id: 'b',
          query: 'Movistar Vodafone Orange reclamaciones opiniones tarifas',
          citations: ['tc-ep-2024', 'tc-vf-ipc'],
          config: 'count: 5 · market: es-ES',
        },
        {
          kind: 'answer',
          id: 'a',
          text: l(
            'Recomiendo **Orange Empresas**: 70,8 sobre 100 frente a 70,0 de Vodafone Business, que lideraba por precio [1]. Vodafone tiene la mayor tasa de reclamaciones del sector (2,96 por cada 10.000 abonados) [2] y ha desligado sus tarifas del IPC [3], así que su reputación puntúa 4 sobre 20. Para Movistar y Orange no hay datos concluyentes y les asigno 10.',
            'I recommend **Orange Empresas**: 70.8 out of 100 against 70.0 for Vodafone Business, which led on price [1]. Vodafone has the highest complaint rate in the sector (2.96 per 10,000 subscribers) [2] and has decoupled its prices from the CPI [3], so its reputation scores 4 out of 20. There is no conclusive data for Movistar and Orange, so I give them 10.',
          ),
        },
        {
          kind: 'gap',
          id: 'g1',
          title: l('Un dato de 2024 presentado como actual', 'A 2024 figure presented as current'),
          text: l(
            'El 2,96 es del informe de 2024; en 2025 Vodafone bajó a 2,21 y ya no es la peor. Sin fecha por resultado, la aplicación no puede detectarlo y la adjudicación cambia de proveedor.',
            'The 2.96 comes from the 2024 report; in 2025 Vodafone fell to 2.21 and is no longer the worst. Without a per-result date, the app cannot notice, and the award goes to another supplier.',
          ),
          workaround: l('Comprobar a mano la fecha de cada fuente citada.', 'Check the date of every cited source by hand.'),
        },
        {
          kind: 'gap',
          id: 'g2',
          title: l('Una búsqueda genérica para tres operadores', 'One generic search for three operators'),
          text: l(
            'El modelo decide una sola consulta con cinco resultados: no aparecen la caída de Movistar, la encuesta de OCU ni la mejora de Vodafone, y dos operadores quedan con una nota neutra por falta de datos.',
            'The model picks a single query with five results: the Movistar outage, the OCU survey and Vodafone’s improvement never show up, and two operators get a neutral score for lack of data.',
          ),
          workaround: l('Varias herramientas de Bing o un servicio de seguimiento de medios.', 'Several Bing tools or a media monitoring service.'),
        },
        {
          kind: 'gap',
          id: 'g3',
          title: l('La evidencia se queda en el chat', 'The evidence stays in the chat'),
          text: l(
            'El expediente de compras solo recibe título y URL de cada cita, sin pasaje ni fecha que justifiquen la puntuación ante el comité o una auditoría.',
            'The procurement file only receives the title and URL of each citation, with no passage or date to justify the score to the committee or an audit.',
          ),
          workaround: l('Copiar y pegar cada fuente en el expediente.', 'Copy and paste every source into the file.'),
        },
      ],
    },
  },
  diyLabel: l('Analista + servicio de seguimiento de medios', 'Analyst + media monitoring service'),
  compare: [
    {
      need: l('Cruzar contratos internos con la web en el mismo agente', 'Combine internal contracts with the web in the same agent'),
      webiq: ['yes', l('Foundry IQ + Web IQ por MCP', 'Foundry IQ + Web IQ over MCP')],
      bing: ['yes', l('Foundry IQ + bing_grounding', 'Foundry IQ + bing_grounding')],
      diy: ['no', l('Dos herramientas y copiar y pegar', 'Two tools and copy-paste')],
    },
    {
      need: l('Búsquedas en paralelo por operador y tema', 'Parallel searches per operator and topic'),
      webiq: ['yes', l('6 llamadas news/web a la vez', '6 news/web calls at once')],
      bing: ['partial', l('El modelo decide una consulta', 'The model picks one query')],
      diy: ['partial', l('Alertas de medios por operador', 'Media alerts per operator')],
    },
    {
      need: l('Fecha y pasaje de cada fuente', 'Date and passage for every source'),
      webiq: ['yes', l('lastUpdatedAt + pasaje', 'lastUpdatedAt + passage')],
      bing: ['no', l('Solo título y URL', 'Only title and URL')],
      diy: ['yes', l('En el servicio de pago', 'In the paid service')],
    },
    {
      need: l('Detectar datos desactualizados', 'Spot outdated data'),
      webiq: ['yes', l('La fecha descarta el informe de 2024', 'The date rules out the 2024 report')],
      bing: ['no', l('Sin fecha, no se detecta', 'Without a date, it goes unnoticed')],
      diy: ['partial', l('Revisión manual', 'Manual review')],
    },
    {
      need: l('Guardar la evidencia en el expediente de compras', 'Keep the evidence in the procurement file'),
      webiq: ['yes', l('API, SDK o MCP desde la herramienta de compras', 'API, SDK or MCP from the procurement tool')],
      bing: ['partial', l('Solo dentro del agente', 'Only inside the agent')],
      diy: ['partial', l('Copiar y pegar', 'Copy and paste')],
    },
  ],
  cost: {
    unit: l('revisión de un expediente (6 llamadas)', 'one file review (6 calls)'),
    runsPerMonth: 150,
    runsHint: l('≈150 renovaciones y homologaciones de proveedores al mes', '≈150 supplier renewals and qualifications a month'),
    diy: {
      label: l('Analista + servicio de seguimiento de medios', 'Analyst + media monitoring service'),
      monthly: 3000,
      basis: l(
        'Supuesto ilustrativo: suscripción a un servicio de seguimiento de medios + horas de analista. Cámbialo por tu cifra.',
        'Illustrative assumption: media monitoring subscription + analyst hours. Replace with your own figure.',
      ),
    },
  },
  live: [
    {
      label: l('Prensa: subidas de tarifas de operadores', 'Press: operator price rises'),
      endpoint: 'news',
      body: { query: 'Movistar Vodafone Orange subida tarifas 2026', maxResults: 10, ...PASSAGE },
    },
    {
      label: l('Opiniones de operadores para empresas', 'Reviews of business operators'),
      endpoint: 'web',
      body: { query: 'opiniones Movistar Empresas Vodafone Business Orange Empresas', maxResults: 10, ...PASSAGE },
    },
    {
      label: l('Prensa sobre un proveedor de {client}', 'Press about a {client} supplier'),
      endpoint: 'news',
      body: { query: '"{client}" proveedor contrato telecomunicaciones', maxResults: 10, ...PASSAGE },
    },
  ],
  takeaways: [
    l('Foundry IQ lee los contratos; Web IQ añade lo que no está en ellos: subidas, caídas y reclamaciones con fecha.', 'Foundry IQ reads the contracts; Web IQ adds what is not in them: price rises, outages and complaints, with dates.'),
    l('La fecha de cada resultado descarta un informe de 2024 que, sin ella, habría cambiado la adjudicación.', 'Each result’s date rules out a 2024 report that, without it, would have changed the award.'),
    l('La reputación no siempre cambia el orden: aquí decide qué hay que negociar.', 'Reputation does not always change the order: here it decides what to negotiate.'),
    l('El agente es real: ejecútalo en vivo desde la pestaña «Agente de Foundry».', 'The agent is real: run it live from the “Foundry agent” tab.'),
  ],
};
