// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { l, type Scenario } from '../types';

const NEXA = 'https://www.nexa-energia.example/hogar/tarifa-fija-12';
const VATIO = 'https://www.vatioverde.example/tarifas/sin-permanencia';
const LUMEN = 'https://www.lumenhogar.example/luz/lumen-estable';

const question = l(
  'Compárame hoy las tarifas fijas de luz de Nexa Energía, Vatio Verde y Lumen Hogar: precio de energía, potencia, permanencia y promociones.',
  'Compare today’s fixed electricity tariffs from Nexa Energía, Vatio Verde and Lumen Hogar: energy price, power price, lock-in and promotions.',
);

export const pricing: Scenario = {
  id: 'competitor-pricing',
  num: 2,
  icon: 'Tags',
  primaryClient: 'energy',
  sector: l('Energía · Pricing', 'Energy · Pricing'),
  title: l('Precios de la competencia, hoy', 'Competitor pricing, today'),
  tagline: l(
    'Las tarifas de tres comercializadoras leídas en vivo en su web, no la versión que indexó un buscador hace días.',
    'Three retailers’ tariffs read live from their websites, not the version a search engine indexed days ago.',
  ),
  summary: l(
    'Pricing necesita la foto de hoy. Web IQ localiza las páginas de tarifa, busca promociones en prensa y lee cada web en vivo, incluida una página nueva hecha con JavaScript que aún no estaba indexada. Descubre que un competidor bajó su precio ayer, aunque el índice aún mostraba el anterior.',
    'Pricing needs today’s picture. Web IQ finds the tariff pages, looks for promotions in the press and reads each site live, including a new JavaScript page that was not indexed yet. It finds that a competitor cut its price yesterday, even though the index still showed the old one.',
  ),
  need: l(
    'Saber qué cobra hoy la competencia, con la hora exacta en que se leyó cada precio.',
    'Know what competitors charge today, with the exact time each price was read.',
  ),
  clientFit: {
    energy: l(
      'Tarifas de luz y gas de las comercializadoras rivales, leídas cada mañana en su web.',
      'Rival retailers’ power and gas tariffs, read from their websites every morning.',
    ),
    hospitality: l(
      'Ofertas y condiciones publicadas por hoteles competidores en su propia web, por destino.',
      'Offers and terms published by competing hotels on their own websites, by destination.',
    ),
    travel: l(
      'Precios y condiciones de paquetes de la competencia, con la hora exacta de lectura.',
      'Competitors’ package prices and terms, with the exact time they were read.',
    ),
    insurance: l(
      'Primas de referencia, coberturas y promociones publicadas por otras aseguradoras.',
      'Reference premiums, coverage and promotions published by other insurers.',
    ),
    'public-sector': l(
      'Precios públicos de referencia para estudios de mercado y para fijar el presupuesto de licitaciones.',
      'Public reference prices for market studies and for setting tender budgets.',
    ),
  },
  endpoints: ['web', 'news', 'browse'],
  sources: [
    {
      id: 'nexa-live',
      kind: 'page',
      title: 'Tarifa Fija Nexa 12 · Nexa Energía',
      url: NEXA,
      publisher: 'Nexa Energía (ficticio)',
      language: 'es',
      date: '2026-10-27T18:30:00+01:00',
      crawledAt: '2026-10-28T08:20:11+01:00',
      excerpt: 'Nuevo precio desde el 27/10: energía 0,1290 €/kWh · potencia 0,0890 €/kW día · permanencia 12 meses.',
      tr: { en: 'New price from 27/10: energy €0.1290/kWh · power €0.0890/kW·day · 12-month lock-in.' },
    },
    {
      id: 'vatio-live',
      kind: 'page',
      title: 'Tarifa Verde Sin Permanencia · Vatio Verde',
      url: VATIO,
      publisher: 'Vatio Verde (ficticio)',
      language: 'es',
      date: '2026-10-26T07:00:00+01:00',
      crawledAt: '2026-10-28T08:20:16+01:00',
      excerpt: 'Energía 0,1190 €/kWh (0,0952 €/kWh con la promo -20 % hasta el 30/11) · potencia 0,0820 €/kW día · sin permanencia.',
      tr: { en: 'Energy €0.1190/kWh (€0.0952/kWh with the -20% promo until 30/11) · power €0.0820/kW·day · no lock-in.' },
    },
    {
      id: 'vatio-news',
      kind: 'news',
      title: 'Vatio Verde lanza un 20 % de descuento en la energía hasta el 30 de noviembre',
      url: 'https://www.energia-hoy.example/2026/10/26/vatio-verde-descuento',
      publisher: 'Energía Hoy (ficticio)',
      language: 'es',
      date: '2026-10-26T09:15:00+01:00',
      excerpt: 'La comercializadora aplicará un 20 % de descuento sobre el precio de la energía a las nuevas altas hasta el 30 de noviembre, sin permanencia.',
      tr: { en: 'The retailer will apply a 20% discount on the energy price to new customers until 30 November, with no lock-in.' },
    },
    {
      id: 'lumen-live',
      kind: 'page',
      title: 'Lumen Estable · Lumen Hogar',
      url: LUMEN,
      publisher: 'Lumen Hogar (ficticio)',
      language: 'es',
      date: '2026-10-14T10:00:00+02:00',
      crawledAt: '2026-10-28T08:20:19+01:00',
      excerpt: 'Precio fijo 12 meses: 0,1345 €/kWh en energía y 0,0750 €/kW día en potencia. Permanencia de 12 meses.',
      tr: { en: 'Fixed price for 12 months: €0.1345/kWh energy and €0.0750/kW·day power. 12-month lock-in.' },
    },
    {
      id: 'nexa-idx',
      kind: 'web',
      title: 'Tarifa Fija Nexa 12 · Nexa Energía',
      url: NEXA,
      publisher: 'Nexa Energía (ficticio)',
      language: 'es',
      date: '2026-10-19T06:00:00+02:00',
      excerpt: 'Tarifa Fija Nexa 12: energía a 0,1350 €/kWh y potencia a 0,0890 €/kW día. Permanencia de 12 meses.',
      tr: { en: 'Nexa Fixed 12 tariff: energy at €0.1350/kWh and power at €0.0890/kW·day. 12-month lock-in.' },
    },
    {
      id: 'cmp-blog',
      kind: 'web',
      title: 'Comparativa de tarifas de luz fijas (octubre 2026)',
      url: 'https://www.comparaluz.example/comparativa-tarifas-fijas',
      publisher: 'ComparaLuz (ficticio)',
      language: 'es',
      date: '2026-10-02T08:00:00+02:00',
      excerpt: 'Nexa Energía ofrece 0,1350 €/kWh en su tarifa fija y Lumen Hogar, 0,1345 €/kWh. Precios de principios de octubre.',
      tr: { en: 'Nexa Energía offers €0.1350/kWh on its fixed tariff and Lumen Hogar €0.1345/kWh. Early-October prices.' },
    },
  ],
  variants: {
    webiq: {
      label: l('Con Web IQ', 'With Web IQ'),
      desc: l('Descubrir páginas + promociones + lectura en vivo de cada web.', 'Discover pages + promotions + live read of each site.'),
      citations: ['vatio-live', 'vatio-news', 'nexa-live', 'nexa-idx', 'lumen-live'],
      steps: [
        { kind: 'user', id: 'u', text: question },
        {
          kind: 'plan',
          id: 'p',
          text: l(
            'Plan: localizar la página de tarifa de cada comercializadora, buscar promociones de esta semana y leer cada web en vivo; si una página aún no está indexada, leerla renderizando JavaScript.',
            'Plan: find each retailer’s tariff page, look for this week’s promotions and read every site live; if a page is not indexed yet, read it rendering JavaScript.',
          ),
        },
        {
          kind: 'calls',
          id: 'c1',
          calls: [
            {
              id: 'p1',
              endpoint: 'web',
              label: l('Páginas de tarifa', 'Tariff pages'),
              request: { query: 'tarifa fija luz Nexa Energía Vatio Verde Lumen Hogar precio kWh', maxResults: 10, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 151,
              results: ['nexa-idx', 'cmp-blog'],
              returned: 10,
            },
            {
              id: 'p2',
              endpoint: 'news',
              label: l('Promociones en prensa', 'Promotions in the press'),
              request: { query: 'Nexa Energía Vatio Verde Lumen Hogar promoción tarifa luz', maxResults: 10, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 166,
              results: ['vatio-news'],
              returned: 4,
            },
          ],
        },
        {
          kind: 'reason',
          id: 'r1',
          text: l(
            'El pasaje indexado de Nexa es del 19-oct (0,1350 €/kWh) y la página de Vatio Verde aún no está en el índice. Leo Nexa y Lumen en vivo (force) y Vatio Verde renderizando JavaScript (fallback).',
            'Nexa’s indexed passage is from 19 Oct (€0.1350/kWh) and Vatio Verde’s page is not in the index yet. I read Nexa and Lumen live (force) and Vatio Verde rendering JavaScript (fallback).',
          ),
        },
        {
          kind: 'calls',
          id: 'c2',
          calls: [
            {
              id: 'p3',
              endpoint: 'browse',
              label: l('Nexa · en vivo', 'Nexa · live'),
              request: { url: NEXA, liveCrawl: 'force', contentFormat: 'markdown', maxLength: 20000 },
              latencyMs: 1240,
              results: ['nexa-live'],
            },
            {
              id: 'p4',
              endpoint: 'browse',
              label: l('Vatio Verde · página nueva, con JavaScript', 'Vatio Verde · new page, with JavaScript'),
              request: { url: VATIO, liveCrawl: 'fallback', renderDynamicPages: true, contentFormat: 'markdown', maxLength: 20000 },
              latencyMs: 380,
              results: [],
              status: 202,
              retryAfter: '2s',
            },
            {
              id: 'p5',
              endpoint: 'browse',
              label: l('Vatio Verde · reintento', 'Vatio Verde · retry'),
              request: { url: VATIO, liveCrawl: 'fallback', renderDynamicPages: true, contentFormat: 'markdown', maxLength: 20000 },
              latencyMs: 960,
              results: ['vatio-live'],
              retryOf: 'p4',
            },
            {
              id: 'p6',
              endpoint: 'browse',
              label: l('Lumen Hogar · en vivo', 'Lumen Hogar · live'),
              request: { url: LUMEN, liveCrawl: 'force', contentFormat: 'markdown', maxLength: 20000 },
              latencyMs: 1110,
              results: ['lumen-live'],
            },
          ],
        },
        {
          kind: 'reason',
          id: 'r2',
          text: l(
            'Nexa bajó a 0,1290 €/kWh el 27-oct; el índice aún mostraba 0,1350. Vatio Verde aplica un -20 % hasta el 30-nov.',
            'Nexa cut to €0.1290/kWh on 27 Oct; the index still showed €0.1350. Vatio Verde applies -20% until 30 Nov.',
          ),
        },
        {
          kind: 'answer',
          id: 'a',
          text: l(
            'Hoy la energía más barata es la de **Vatio Verde** con su promoción: 0,0952 €/kWh hasta el 30-nov y sin permanencia [1][2]. **Nexa** bajó ayer a 0,1290 €/kWh [3], aunque el índice aún mostraba 0,1350 [4]. **Lumen** mantiene 0,1345 €/kWh, pero tiene la potencia más barata [5].',
            'Today the cheapest energy is **Vatio Verde** with its promotion: €0.0952/kWh until 30 Nov and no lock-in [1][2]. **Nexa** cut to €0.1290/kWh yesterday [3], although the index still showed €0.1350 [4]. **Lumen** keeps €0.1345/kWh but has the cheapest power price [5].',
          ),
          flags: [l('Leído en vivo', 'Read live'), l('JavaScript renderizado', 'JavaScript rendered'), l('Hora de lectura', 'Read time')],
          artifact: {
            kind: 'table',
            title: l('Tarifas fijas · 28-oct-2026', 'Fixed tariffs · 28 Oct 2026'),
            columns: [
              l('Comercializadora', 'Retailer'),
              l('Energía €/kWh', 'Energy €/kWh'),
              l('Potencia €/kW día', 'Power €/kW·day'),
              l('Permanencia', 'Lock-in'),
              l('Promoción', 'Promotion'),
              l('Leído', 'Read at'),
            ],
            rows: [
              [
                { text: l('Nexa Energía', 'Nexa Energía') },
                { text: l('0,1290 (antes 0,1350)', '0.1290 (was 0.1350)'), cite: 3, tone: 'warn' },
                { text: l('0,0890', '0.0890') },
                { text: l('12 meses', '12 months') },
                { text: l('—', '—'), tone: 'muted' },
                { text: l('08:20', '08:20'), tone: 'muted' },
              ],
              [
                { text: l('Vatio Verde', 'Vatio Verde') },
                { text: l('0,1190 · 0,0952 con promo', '0.1190 · 0.0952 with promo'), cite: 1, tone: 'ok' },
                { text: l('0,0820', '0.0820') },
                { text: l('Sin permanencia', 'None') },
                { text: l('-20 % hasta 30-nov', '-20% until 30 Nov'), cite: 2, tone: 'info' },
                { text: l('08:20', '08:20'), tone: 'muted' },
              ],
              [
                { text: l('Lumen Hogar', 'Lumen Hogar') },
                { text: l('0,1345', '0.1345'), cite: 5 },
                { text: l('0,0750', '0.0750'), tone: 'ok' },
                { text: l('12 meses', '12 months') },
                { text: l('—', '—'), tone: 'muted' },
                { text: l('08:20', '08:20'), tone: 'muted' },
              ],
            ],
            note: l(
              'Leído con browse: liveCrawl force para Nexa y Lumen; fallback con renderDynamicPages para Vatio Verde, que aún no estaba indexada. Esa lectura devolvió 202 y se reintentó a los 2 s (retryAfter).',
              'Read with browse: liveCrawl force for Nexa and Lumen; fallback with renderDynamicPages for Vatio Verde, which was not indexed yet. That read returned 202 and was retried after 2 s (retryAfter).',
            ),
          },
        },
      ],
    },
    bing: {
      label: l('Con Grounding with Bing', 'With Grounding with Bing'),
      desc: l('Agente de Foundry con bing_grounding: respuesta a partir del índice.', 'Foundry agent with bing_grounding: answer built from the index.'),
      citations: ['cmp-blog', 'nexa-idx'],
      steps: [
        { kind: 'user', id: 'u', text: question },
        {
          kind: 'bing',
          id: 'b',
          query: 'tarifa fija luz Nexa Energía Vatio Verde Lumen Hogar precio',
          citations: ['cmp-blog', 'nexa-idx'],
          config: 'count: 5 · market: es-ES',
        },
        {
          kind: 'answer',
          id: 'a',
          text: l(
            'Según las comparativas, Nexa Energía ofrece 0,1350 €/kWh y Lumen Hogar 0,1345 €/kWh en sus tarifas fijas [1][2]. No he encontrado el precio actual de Vatio Verde.',
            'According to comparison sites, Nexa Energía offers €0.1350/kWh and Lumen Hogar €0.1345/kWh on their fixed tariffs [1][2]. I could not find Vatio Verde’s current price.',
          ),
        },
        {
          kind: 'gap',
          id: 'g1',
          title: l('Precio desactualizado, sin aviso', 'Outdated price, no warning'),
          text: l(
            'La comparativa citada es del 2-oct y Nexa cambió el precio el 27-oct. Tu aplicación no recibe la fecha de cada resultado, así que no puede detectarlo.',
            'The cited comparison is from 2 Oct and Nexa changed its price on 27 Oct. Your app gets no per-result date, so it cannot notice.',
          ),
          workaround: l('Un scraper diario por web con control de cambios.', 'A daily scraper per site with change tracking.'),
        },
        {
          kind: 'gap',
          id: 'g2',
          title: l('No lee páginas dinámicas ni URLs concretas', 'Cannot read dynamic pages or specific URLs'),
          text: l(
            'La página de Vatio Verde es nueva y se pinta con JavaScript. Grounding with Bing no abre ni renderiza la página de cada comercializadora: solo cita lo que ya está en su índice.',
            'Vatio Verde’s page is new and rendered with JavaScript. Grounding with Bing does not open or render each retailer’s page: it only cites what is already in its index.',
          ),
          workaround: l('Navegador headless (Playwright) + mantener selectores por web.', 'Headless browser (Playwright) + maintaining selectors per site.'),
        },
        {
          kind: 'gap',
          id: 'g3',
          title: l('Sin hora de lectura', 'No read time'),
          text: l(
            'Sin crawledAt no se puede demostrar cuándo se vio cada precio, algo clave para pricing y para auditoría.',
            'Without crawledAt you cannot prove when each price was seen, which matters for pricing and audit.',
          ),
          workaround: l('Guardar capturas y marcas de tiempo en tu propio pipeline.', 'Store screenshots and timestamps in your own pipeline.'),
        },
      ],
    },
  },
  diyLabel: l('Scrapers headless por competidor', 'Headless scrapers per competitor'),
  compare: [
    {
      need: l('Leer la página de tarifa de cada competidor', 'Read each competitor’s tariff page'),
      webiq: ['yes', l('browse sobre la URL exacta', 'browse on the exact URL')],
      bing: ['no', l('No abre URLs concretas', 'Does not open specific URLs')],
      diy: ['partial', l('Un scraper por web', 'One scraper per site')],
    },
    {
      need: l('Páginas hechas con JavaScript', 'JavaScript-rendered pages'),
      webiq: ['yes', l('renderDynamicPages (con liveCrawl: fallback)', 'renderDynamicPages (with liveCrawl: fallback)')],
      bing: ['no', l('Sin renderizado', 'No rendering')],
      diy: ['partial', l('Navegador headless', 'Headless browser')],
    },
    {
      need: l('El dato de hoy, no el del índice', 'Today’s figure, not the index’s'),
      webiq: ['yes', l('liveCrawl: force', 'liveCrawl: force')],
      bing: ['no', l('Lo indexado, sin fecha visible', 'Whatever is indexed, no visible date')],
      diy: ['yes', l('Si el scraper corre a diario', 'If the scraper runs daily')],
    },
    {
      need: l('Cuándo se leyó cada precio', 'When each price was read'),
      webiq: ['yes', l('crawledAt y lastUpdatedAt', 'crawledAt and lastUpdatedAt')],
      bing: ['no', l('Solo título y URL', 'Only title and URL')],
      diy: ['partial', l('Hay que instrumentarlo', 'Must be instrumented')],
    },
    {
      need: l('Promociones publicadas en prensa', 'Promotions reported in the press'),
      webiq: ['yes', l('news con fecha y medio', 'news with date and outlet')],
      bing: ['partial', l('En la respuesta, sin fecha', 'In the answer, without a date')],
      diy: ['partial', l('Proveedor de noticias aparte', 'Separate news provider')],
    },
    {
      need: l('Mantenimiento', 'Maintenance'),
      webiq: ['yes', l('Sin selectores ni parsers por web', 'No selectors or parsers per site')],
      bing: ['yes', l('Ninguno, pero sin el dato', 'None, but no data either')],
      diy: ['no', l('Se rompe cuando cambia la web', 'Breaks when the site changes')],
    },
  ],
  cost: {
    unit: l('comparativa diaria de una gama de producto', 'daily comparison for one product line'),
    runsPerMonth: 120,
    runsHint: l('4 gamas de producto × 30 días', '4 product lines × 30 days'),
    diy: {
      label: l('Scrapers headless por competidor', 'Headless scrapers per competitor'),
      monthly: 1800,
      basis: l(
        'Supuesto ilustrativo: infraestructura headless + ≈2 días/mes de mantenimiento de selectores. Cámbialo por tu cifra.',
        'Illustrative assumption: headless infrastructure + ≈2 days/month maintaining selectors. Replace with your own figure.',
      ),
    },
  },
  live: [
    {
      label: l('Tarifas de luz (búsqueda web)', 'Power tariffs (web search)'),
      endpoint: 'web',
      body: { query: 'tarifa luz precio fijo kWh {client}', maxResults: 5, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
    },
    {
      label: l('Promociones de comercializadoras', 'Retailer promotions'),
      endpoint: 'news',
      body: { query: 'comercializadora luz descuento tarifa', maxResults: 5, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
    },
    {
      label: l('Leer una web en vivo con JavaScript', 'Read a site live with JavaScript'),
      endpoint: 'browse',
      body: { url: 'https://www.omie.es/', liveCrawl: 'fallback', renderDynamicPages: true, contentFormat: 'markdown', maxLength: 3000 },
    },
  ],
  takeaways: [
    l('El índice decía 0,1350; la web, 0,1290. browse con liveCrawl lee el precio de hoy.', 'The index said 0.1350; the site, 0.1290. browse with liveCrawl reads today’s price.'),
    l('renderDynamicPages (con liveCrawl: fallback) lee páginas nuevas hechas con JavaScript sin mantener scrapers.', 'renderDynamicPages (with liveCrawl: fallback) reads new JavaScript pages without maintaining scrapers.'),
    l('crawledAt deja constancia de cuándo se vio cada precio.', 'crawledAt records when each price was seen.'),
  ],
};
