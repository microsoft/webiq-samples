// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { l, type Scenario } from '../types';

const GUIDE = 'https://www.supervisor-seguros.example/normativa/guias/guia-4-2026-ia';

export const regulatory: Scenario = {
  id: 'regulatory-watch',
  num: 1,
  icon: 'Landmark',
  primaryClient: 'insurance',
  sector: l('Seguros · Cumplimiento', 'Insurance · Compliance'),
  title: l('Vigilancia regulatoria con fuente oficial', 'Regulatory watch from the official source'),
  tagline: l(
    'Qué ha publicado el supervisor, qué nos obliga y desde cuándo, con el texto oficial delante.',
    'What the regulator published, what it requires and from when, with the official text in front of you.',
  ),
  summary: l(
    'Cumplimiento pregunta por una guía nueva del supervisor sobre IA en suscripción y siniestros. Web IQ busca solo en el dominio oficial, cruza prensa en español e inglés, lee el documento completo y devuelve las obligaciones con fecha y pasaje.',
    'Compliance asks about a new regulator guide on AI in underwriting and claims. Web IQ searches only the official domain, cross-checks Spanish and English press, reads the full document and returns obligations with dates and passages.',
  ),
  need: l(
    'Enterarse a tiempo de cada cambio normativo y saber exactamente qué nos obliga.',
    'Learn about every regulatory change in time and know exactly what it requires.',
  ),
  clientFit: {
    insurance: l(
      'Guías del supervisor y de la autoridad europea sobre IA, distribución y siniestros, con plazos y texto oficial.',
      'Regulator and EU authority guidance on AI, distribution and claims, with deadlines and official text.',
    ),
    energy: l(
      'Resoluciones del regulador energético, boletines oficiales y consultas europeas sobre mercado eléctrico.',
      'Energy regulator decisions, official gazettes and EU consultations on the power market.',
    ),
    hospitality: l(
      'Tasas turísticas, alquiler vacacional y normativa fiscal en cada país donde opera la cadena.',
      'Tourist taxes, holiday-rental rules and tax regulation in every country where the chain operates.',
    ),
    travel: l(
      'Requisitos de entrada, autorizaciones de viaje y derechos del pasajero publicados por cada autoridad.',
      'Entry requirements, travel authorisations and passenger rights published by each authority.',
    ),
    'public-sector': l(
      'Boletines estatales y autonómicos sobre contratación pública, ayudas y normativa sectorial.',
      'National and regional gazettes on public procurement, grants and sector regulation.',
    ),
  },
  endpoints: ['web', 'news', 'browse'],
  sources: [
    {
      id: 'reg-guide',
      kind: 'page',
      title: 'Guía técnica 4/2026 sobre el uso de sistemas de IA en la suscripción y la gestión de siniestros',
      url: GUIDE,
      publisher: 'Supervisor de Seguros (ficticio)',
      language: 'es',
      date: '2026-10-21T09:00:00+02:00',
      crawledAt: '2026-10-28T09:14:05+01:00',
      excerpt:
        'Las entidades mantendrán un inventario de sus modelos de IA antes del 31 de marzo de 2027 y garantizarán la revisión humana de todo rechazo de siniestro propuesto por un modelo.',
      tr: {
        en: 'Firms shall keep an inventory of their AI models by 31 March 2027 and ensure human review of every claim rejection proposed by a model.',
      },
    },
    {
      id: 'reg-press',
      kind: 'web',
      title: 'El Supervisor publica la Guía técnica 4/2026 sobre inteligencia artificial',
      url: 'https://www.supervisor-seguros.example/prensa/2026/10/21/guia-ia',
      publisher: 'Supervisor de Seguros (ficticio)',
      language: 'es',
      date: '2026-10-21T10:30:00+02:00',
      excerpt:
        'La guía será aplicable desde el 1 de enero de 2027. Las entidades deberán explicar al asegurado las decisiones automatizadas que le afecten.',
      tr: {
        en: 'The guide will apply from 1 January 2027. Firms must explain to policyholders the automated decisions that affect them.',
      },
    },
    {
      id: 'reg-news-es',
      kind: 'news',
      title: 'El supervisor fija plazos para auditar la IA en las aseguradoras',
      url: 'https://www.diario-financiero.example/seguros/2026/10/22/supervisor-plazos-ia',
      publisher: 'Diario Financiero (ficticio)',
      language: 'es',
      date: '2026-10-22T07:45:00+02:00',
      excerpt:
        'Las aseguradoras deberán comunicar los incidentes graves de sus modelos en 72 horas y presentar el primer informe semestral de sesgos antes del 30 de junio de 2027.',
      tr: {
        en: 'Insurers must report serious model incidents within 72 hours and submit the first half-yearly bias report by 30 June 2027.',
      },
    },
    {
      id: 'reg-news-en',
      kind: 'news',
      title: 'EU insurance authority opens consultation on AI governance in claims handling',
      url: 'https://www.eu-insurance-watch.example/2026/10/23/consultation-ai-claims',
      publisher: 'EU Insurance Watch (fictitious)',
      language: 'en',
      date: '2026-10-23T12:10:00+02:00',
      excerpt:
        'Stakeholders can respond until 15 December 2026; the authority expects to publish final guidelines in the second quarter of 2027.',
      tr: {
        es: 'Las partes interesadas pueden responder hasta el 15 de diciembre de 2026; la autoridad prevé publicar las directrices finales en el segundo trimestre de 2027.',
      },
    },
    {
      id: 'reg-blog',
      kind: 'web',
      title: 'IA en seguros: lo que viene en 2027',
      url: 'https://www.blog-insurtech.example/ia-seguros-2027',
      publisher: 'Blog Insurtech (ficticio)',
      language: 'es',
      date: '2026-06-02T08:00:00+02:00',
      excerpt:
        'Todo apunta a que el regulador exigirá más transparencia en los modelos de IA, aunque todavía no hay plazos concretos.',
      tr: {
        en: 'Everything suggests the regulator will demand more transparency in AI models, although there are no concrete deadlines yet.',
      },
    },
  ],
  variants: {
    webiq: {
      label: l('Con Web IQ', 'With Web IQ'),
      desc: l('Dominio oficial + prensa ES/EN en paralelo + lectura del documento completo.', 'Official domain + ES/EN press in parallel + full-document read.'),
      citations: ['reg-press', 'reg-guide', 'reg-news-es', 'reg-news-en'],
      steps: [
        {
          kind: 'user',
          id: 'u',
          text: l(
            '¿Ha publicado el supervisor algo nuevo sobre el uso de IA en suscripción y siniestros? Dame obligaciones, plazos y la fuente oficial.',
            'Has the regulator published anything new on AI in underwriting and claims? Give me obligations, deadlines and the official source.',
          ),
        },
        {
          kind: 'plan',
          id: 'p',
          text: l(
            'Plan: buscar solo en el dominio oficial del supervisor, revisar prensa en España y en inglés a la vez y leer la guía entera, no solo el titular.',
            'Plan: search only the regulator’s official domain, check Spanish and English press at the same time and read the whole guide, not just the headline.',
          ),
        },
        {
          kind: 'calls',
          id: 'c1',
          calls: [
            {
              id: 'r1',
              endpoint: 'web',
              label: l('Dominio oficial (site:)', 'Official domain (site:)'),
              request: {
                query: 'guía inteligencia artificial suscripción siniestros site:supervisor-seguros.example',
                maxResults: 5,
                language: 'es',
                region: 'ES',
                contentFormat: 'passage',
                maxLength: 3000,
              },
              latencyMs: 142,
              results: ['reg-press'],
              returned: 5,
            },
            {
              id: 'r2',
              endpoint: 'news',
              label: l('Prensa · es-ES', 'Press · es-ES'),
              request: { query: 'supervisor seguros guía IA siniestros plazos', maxResults: 10, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 171,
              results: ['reg-news-es'],
              returned: 8,
            },
            {
              id: 'r3',
              endpoint: 'news',
              label: l('Prensa europea · en-IE', 'EU press · en-IE'),
              request: { query: 'EU insurance authority AI claims handling consultation', maxResults: 10, language: 'en', region: 'IE', contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 188,
              results: ['reg-news-en'],
              returned: 6,
            },
          ],
        },
        {
          kind: 'reason',
          id: 'r',
          text: l(
            'La nota de prensa enlaza a la guía. Los pasajes ya traen fechas, pero las obligaciones están en el documento: lo leo completo.',
            'The press note links to the guide. The passages already carry dates, but the obligations live in the document: I read it in full.',
          ),
        },
        {
          kind: 'calls',
          id: 'c2',
          calls: [
            {
              id: 'r4',
              endpoint: 'browse',
              label: l('Guía completa', 'Full guide'),
              request: { url: GUIDE, liveCrawl: 'fallback', contentFormat: 'markdown', maxLength: 40000 },
              latencyMs: 410,
              results: ['reg-guide'],
            },
          ],
        },
        {
          kind: 'answer',
          id: 'a',
          text: l(
            'Sí. El 21-oct-2026 el supervisor publicó la **Guía técnica 4/2026**, aplicable desde el **1-ene-2027** [1]. Lo más urgente es el inventario de modelos (31-mar-2027) y la revisión humana de rechazos de siniestros [2]. La prensa añade dos plazos [3] y hay una consulta europea abierta hasta el 15-dic-2026 [4].',
            'Yes. On 21 Oct 2026 the regulator published **Technical Guide 4/2026**, applicable from **1 Jan 2027** [1]. Most urgent: the model inventory (31 Mar 2027) and human review of claim rejections [2]. The press adds two deadlines [3] and an EU consultation is open until 15 Dec 2026 [4].',
          ),
          flags: [l('Fuente oficial', 'Official source'), l('Fecha en cada resultado', 'Date on every result'), l('Documento leído entero', 'Full document read')],
          artifact: {
            kind: 'table',
            title: l('Obligaciones y plazos', 'Obligations and deadlines'),
            columns: [l('Obligación', 'Obligation'), l('Plazo', 'Deadline'), l('Área', 'Owner')],
            rows: [
              [
                { text: l('Inventario de modelos de IA', 'AI model inventory') },
                { text: l('31-mar-2027', '31 Mar 2027'), cite: 2, tone: 'warn' },
                { text: l('Cumplimiento + Datos', 'Compliance + Data') },
              ],
              [
                { text: l('Revisión humana de rechazos de siniestros propuestos por un modelo', 'Human review of model-proposed claim rejections') },
                { text: l('1-ene-2027', '1 Jan 2027'), cite: 2, tone: 'warn' },
                { text: l('Siniestros', 'Claims') },
              ],
              [
                { text: l('Explicar al asegurado las decisiones automatizadas', 'Explain automated decisions to policyholders') },
                { text: l('1-ene-2027', '1 Jan 2027'), cite: 1 },
                { text: l('Suscripción', 'Underwriting') },
              ],
              [
                { text: l('Primer informe semestral de sesgos', 'First half-yearly bias report') },
                { text: l('30-jun-2027', '30 Jun 2027'), cite: 3 },
                { text: l('Riesgos', 'Risk') },
              ],
              [
                { text: l('Comunicar incidentes graves de modelos', 'Report serious model incidents') },
                { text: l('72 h', '72 h'), cite: 3, tone: 'bad' },
                { text: l('Seguridad + Cumplimiento', 'Security + Compliance') },
              ],
              [
                { text: l('Consulta europea sobre IA en siniestros (voluntaria)', 'EU consultation on AI in claims (optional)') },
                { text: l('15-dic-2026', '15 Dec 2026'), cite: 4, tone: 'info' },
                { text: l('Asuntos regulatorios', 'Regulatory affairs') },
              ],
            ],
            note: l(
              'Cada fila enlaza a su fuente. El registro interno guarda consulta, URL, fecha y traceId; el texto se muestra en fragmentos de ≤200 caracteres.',
              'Every row links to its source. The internal log keeps query, URL, date and traceId; text is shown in ≤200-character excerpts.',
            ),
          },
        },
      ],
    },
    bing: {
      label: l('Con Grounding with Bing', 'With Grounding with Bing'),
      desc: l('Agente de Foundry con la herramienta bing_grounding (market es-ES).', 'Foundry agent with the bing_grounding tool (market es-ES).'),
      citations: ['reg-press', 'reg-blog'],
      steps: [
        {
          kind: 'user',
          id: 'u',
          text: l(
            '¿Ha publicado el supervisor algo nuevo sobre el uso de IA en suscripción y siniestros? Dame obligaciones, plazos y la fuente oficial.',
            'Has the regulator published anything new on AI in underwriting and claims? Give me obligations, deadlines and the official source.',
          ),
        },
        {
          kind: 'bing',
          id: 'b',
          query: 'supervisor seguros guía IA suscripción siniestros',
          citations: ['reg-press', 'reg-blog'],
          config: 'count: 5 · market: es-ES · set_lang: es',
        },
        {
          kind: 'answer',
          id: 'a',
          text: l(
            'Sí, el supervisor ha publicado una guía sobre el uso de IA en suscripción y siniestros [1]. Se espera que exija más transparencia y supervisión humana de los modelos, aunque no se detallan plazos concretos [2].',
            'Yes, the regulator has published a guide on AI in underwriting and claims [1]. It is expected to require more transparency and human oversight of models, although no concrete deadlines are given [2].',
          ),
        },
        {
          kind: 'gap',
          id: 'g1',
          title: l('Sin el texto oficial, sin plazos', 'No official text, no deadlines'),
          text: l(
            'El modelo trabaja con lo que devuelve la búsqueda y no abre la guía. Tu aplicación solo recibe la respuesta y enlaces: ni pasajes ni fecha de cada resultado, así que nadie ve que la cita [2] es un blog de junio.',
            'The model works with what search returns and never opens the guide. Your app only gets the answer and links: no passages and no per-result date, so nobody sees that citation [2] is a June blog post.',
          ),
          workaround: l('Scraper o automatización de navegador para leer la guía + proceso para extraer plazos.', 'A scraper or browser automation to read the guide + a process to extract deadlines.'),
        },
        {
          kind: 'gap',
          id: 'g2',
          title: l('Un mercado por configuración', 'One market per configuration'),
          text: l(
            'Mercado, idioma y frescura se fijan al configurar la herramienta. La consulta europea, en inglés, se queda fuera.',
            'Market, language and freshness are fixed when the tool is configured. The EU consultation, in English, is left out.',
          ),
          workaround: l('Otra herramienta o agente con market en-IE y fusionar respuestas.', 'Another tool or agent with market en-IE, then merge the answers.'),
        },
      ],
    },
  },
  diyLabel: l('Scrapers de boletines + proveedor de noticias', 'Gazette scrapers + news provider'),
  compare: [
    {
      need: l('Buscar solo en el dominio oficial', 'Search only the official domain'),
      webiq: ['yes', l('site: en la propia consulta', 'site: in the query itself')],
      bing: ['partial', l('Con Bing Custom Search (instancia aparte)', 'With Bing Custom Search (separate instance)')],
      diy: ['partial', l('Un scraper por fuente', 'One scraper per source')],
    },
    {
      need: l('Fecha de publicación de cada resultado', 'Publication date of every result'),
      webiq: ['yes', l('lastUpdatedAt / crawledAt', 'lastUpdatedAt / crawledAt')],
      bing: ['no', l('Solo título y URL en las citas', 'Only title and URL in citations')],
      diy: ['partial', l('Hay que extraerla de cada página', 'Must be parsed from each page')],
    },
    {
      need: l('Leer el documento completo', 'Read the full document'),
      webiq: ['yes', l('browse (markdown, live crawl)', 'browse (markdown, live crawl)')],
      bing: ['no', l('El modelo no abre URLs concretas', 'The model does not open specific URLs')],
      diy: ['partial', l('Scraper + parser por formato', 'Scraper + parser per format')],
    },
    {
      need: l('Prensa de varios mercados a la vez', 'Press from several markets at once'),
      webiq: ['yes', l('language/region en cada llamada', 'language/region on every call')],
      bing: ['partial', l('Mercado fijo por configuración', 'Market fixed per configuration')],
      diy: ['partial', l('Proveedor de noticias por país', 'News provider per country')],
    },
    {
      need: l('Pasaje verificable de cada fuente', 'Verifiable passage from each source'),
      webiq: ['yes', l('Pasaje relevante en cada resultado', 'Relevant passage on every result')],
      bing: ['no', l('Sin acceso al contenido devuelto', 'No access to the returned content')],
      diy: ['partial', l('Depende del scraper', 'Depends on the scraper')],
    },
    {
      need: l('Usarlo desde cualquier aplicación', 'Use it from any application'),
      webiq: ['yes', l('REST, SDK Python/TypeScript y MCP', 'REST, Python/TypeScript SDK and MCP')],
      bing: ['partial', l('Solo como herramienta de un agente de Foundry', 'Only as a Foundry agent tool')],
      diy: ['yes', l('Código propio', 'Your own code')],
    },
  ],
  cost: {
    unit: l('consulta de vigilancia completa (4 llamadas)', 'full watch query (4 calls)'),
    runsPerMonth: 600,
    runsHint: l('20 temas vigilados × 30 días', '20 watched topics × 30 days'),
    diy: {
      label: l('Scrapers de boletines + proveedor de noticias', 'Gazette scrapers + news provider'),
      monthly: 2500,
      basis: l(
        'Supuesto ilustrativo: suscripción a un proveedor de noticias + ≈1 día/mes de mantenimiento de scrapers. Cámbialo por tu cifra.',
        'Illustrative assumption: news provider subscription + ≈1 day/month maintaining scrapers. Replace with your own figure.',
      ),
    },
  },
  live: [
    {
      label: l('Autoridad europea de seguros (site:)', 'EU insurance authority (site:)'),
      endpoint: 'web',
      body: { query: 'artificial intelligence governance opinion site:eiopa.europa.eu', maxResults: 5, language: 'en', region: 'IE', contentFormat: 'passage', maxLength: 3000 },
    },
    {
      label: l('Prensa: regulación de IA en seguros', 'Press: AI regulation in insurance'),
      endpoint: 'news',
      body: { query: 'regulación inteligencia artificial seguros', maxResults: 5, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
    },
    {
      label: l('Leer una página oficial', 'Read an official page'),
      endpoint: 'browse',
      body: { url: 'https://www.eiopa.europa.eu/', liveCrawl: 'fallback', contentFormat: 'markdown', maxLength: 3000 },
    },
  ],
  takeaways: [
    l('site: + fecha + pasaje: la respuesta se apoya en la fuente oficial, no en un blog de junio.', 'site: + date + passage: the answer rests on the official source, not a June blog post.'),
    l('browse lee el documento entero: los plazos salen del texto, no del titular.', 'browse reads the whole document: deadlines come from the text, not the headline.'),
    l('Varios mercados en una sola ronda: cada llamada con su idioma y región.', 'Several markets in one round: each call with its own language and region.'),
  ],
};
