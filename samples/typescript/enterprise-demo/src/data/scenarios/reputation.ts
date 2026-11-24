// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { l, type Scenario } from '../types';

const HELP = 'https://www.brisahotels.example/ayuda/avisos';

const question = l(
  'Hay ruido por cobros duplicados en Brisa Hotels. ¿Qué se está diciendo, dónde, desde cuándo y hemos respondido ya?',
  'There’s noise about double charges at Brisa Hotels. What is being said, where, since when, and have we responded yet?',
);

export const reputation: Scenario = {
  id: 'reputation-crisis',
  num: 3,
  icon: 'Megaphone',
  primaryClient: 'hospitality',
  sector: l('Hoteles · Comunicación', 'Hotels · Communications'),
  title: l('Crisis de reputación en tiempo real', 'Real-time reputation crisis'),
  tagline: l(
    'Qué se dice de la marca en tres países, en vídeo y en foros, desde cuándo, y si ya hemos respondido.',
    'What is said about the brand in three countries, on video and in forums, since when, and whether we have responded.',
  ),
  summary: l(
    'Comunicación detecta quejas por cobros duplicados en una cadena hotelera ficticia. En una sola ronda paralela, Web IQ cubre prensa de España, Reino Unido y Alemania, vídeos de las últimas 24 h con el minuto clave y foros. Además comprueba en vivo si el centro de ayuda ya publica un aviso.',
    'Communications spots complaints about double charges at a fictitious hotel chain. In a single parallel round, Web IQ covers press from Spain, the UK and Germany, last-24-hour videos with the key minute, and forums. It also checks live whether the help centre already shows a notice.',
  ),
  need: l(
    'Detectar una crisis en cuanto empieza y responder con datos, no con intuiciones.',
    'Detect a crisis as soon as it starts and respond with data, not hunches.',
  ),
  clientFit: {
    hospitality: l(
      'Incidencias de cobro, servicio o seguridad en hoteles: qué se dice en cada mercado emisor y desde cuándo.',
      'Billing, service or safety incidents at hotels: what each source market is saying and since when.',
    ),
    energy: l(
      'Cortes de suministro, facturas o campañas: cobertura por región y vídeos de clientes afectados.',
      'Outages, bills or campaigns: coverage by region and videos from affected customers.',
    ),
    travel: l(
      'Cancelaciones, overbooking o huelgas que afectan a viajeros: qué publican medios y vídeos en cada país.',
      'Cancellations, overbooking or strikes affecting travellers: what press and videos say in each country.',
    ),
    insurance: l(
      'Quejas sobre siniestros o cambios de póliza que se viralizan, y si ya hay una respuesta publicada.',
      'Viral complaints about claims or policy changes, and whether a response is already published.',
    ),
    'public-sector': l(
      'Incidencias en servicios públicos (transporte, sanidad, educación) y su cobertura en prensa y vídeo.',
      'Public service incidents (transport, health, education) and their press and video coverage.',
    ),
  },
  endpoints: ['news', 'videos', 'web', 'browse'],
  sources: [
    {
      id: 'rep-forum',
      kind: 'web',
      title: 'Brisa Hotels charged my card twice, anyone else?',
      url: 'https://www.travel-forum.example/t/brisa-hotels-double-charge/88213',
      publisher: 'Travel Forum (fictitious)',
      language: 'en',
      date: '2026-10-28T07:52:00+01:00',
      excerpt: 'Checked out of Brisa Palma this morning and saw two identical charges on my card. Front desk says it is a “system issue”. Anyone else?',
      tr: { es: 'Hice el check-out en Brisa Palma esta mañana y vi dos cargos idénticos en mi tarjeta. En recepción dicen que es un «fallo del sistema». ¿A alguien más?' },
    },
    {
      id: 'rep-news-es',
      kind: 'news',
      title: 'Clientes de Brisa Hotels denuncian cobros duplicados tras un cambio en el sistema de pagos',
      url: 'https://www.noticias-turismo.example/2026/10/28/brisa-cobros-duplicados',
      publisher: 'Noticias Turismo (ficticio)',
      language: 'es',
      date: '2026-10-28T09:05:00+01:00',
      excerpt: 'Decenas de clientes de Brisa Hotels en Baleares y Canarias aseguran que se les ha cobrado dos veces la estancia desde primera hora de la mañana.',
      tr: { en: 'Dozens of Brisa Hotels guests in the Balearic and Canary Islands say they have been charged twice for their stay since early morning.' },
    },
    {
      id: 'rep-news-gb',
      kind: 'news',
      title: 'Holidaymakers hit by double charges at Spanish hotel chain',
      url: 'https://www.uk-travel-daily.example/news/2026/10/28/brisa-double-charges',
      publisher: 'UK Travel Daily (fictitious)',
      language: 'en',
      date: '2026-10-28T09:40:00+01:00',
      excerpt: 'British guests at Brisa Hotels say they were charged twice for their stay. The chain has not yet commented.',
      tr: { es: 'Clientes británicos de Brisa Hotels dicen que se les cobró dos veces la estancia. La cadena aún no ha hecho comentarios.' },
    },
    {
      id: 'rep-news-de',
      kind: 'news',
      title: 'Doppelte Abbuchungen: Ärger bei Brisa Hotels auf Mallorca',
      url: 'https://www.reise-aktuell.example/2026/10/28/brisa-doppelte-abbuchungen',
      publisher: 'Reise Aktuell (fiktiv)',
      language: 'de',
      date: '2026-10-28T10:15:00+01:00',
      excerpt: 'Mehrere Urlauber berichten von doppelten Abbuchungen nach dem Check-out bei Brisa Hotels auf Mallorca.',
      tr: {
        es: 'Varios turistas denuncian cargos duplicados tras el check-out en Brisa Hotels en Mallorca.',
        en: 'Several holidaymakers report double charges after checking out of Brisa Hotels in Mallorca.',
      },
    },
    {
      id: 'rep-video',
      kind: 'video',
      title: 'Brisa Hotels charged me TWICE (what to do)',
      url: 'https://www.video-platform.example/watch?v=brisa-twice',
      publisher: 'Travel with Mia (fictitious)',
      language: 'en',
      date: '2026-10-28T09:30:00+01:00',
      excerpt: 'Vlogger shows two charges in her banking app and explains how to request a refund.',
      tr: { es: 'La vloguera muestra los dos cargos en la app de su banco y explica cómo pedir el reembolso.' },
      video: {
        length: '00:06:41',
        views: 48000,
        publishedBy: 'Travel with Mia',
        moment: { title: l('Muestra los dos cargos en la app del banco', 'Shows both charges in her banking app'), start: '0.00:01:12', end: '0.00:01:41' },
      },
    },
    {
      id: 'rep-help',
      kind: 'page',
      title: 'Centro de ayuda · Avisos | Brisa Hotels',
      url: HELP,
      publisher: 'Brisa Hotels (ficticio)',
      language: 'es',
      date: '2026-10-20T12:00:00+02:00',
      crawledAt: '2026-10-28T10:38:44+01:00',
      excerpt: 'No hay avisos activos en este momento. Última actualización: 20/10/2026.',
      tr: { en: 'There are no active notices at the moment. Last updated: 20/10/2026.' },
    },
  ],
  variants: {
    webiq: {
      label: l('Con Web IQ', 'With Web IQ'),
      desc: l('Prensa ES/GB/DE + vídeo + foros + nuestra web, todo en paralelo.', 'ES/GB/DE press + video + forums + our own site, all in parallel.'),
      citations: ['rep-forum', 'rep-news-es', 'rep-news-gb', 'rep-news-de', 'rep-video', 'rep-help'],
      steps: [
        { kind: 'user', id: 'u', text: question },
        {
          kind: 'plan',
          id: 'p',
          text: l(
            'Plan: en una sola ronda, prensa de los tres mercados emisores, vídeos de las últimas 24 h, conversación fuera de nuestro dominio y nuestro centro de ayuda en vivo.',
            'Plan: in a single round, press from the three source markets, last-24-hour videos, conversation outside our domain and our help centre, live.',
          ),
        },
        {
          kind: 'calls',
          id: 'c1',
          calls: [
            {
              id: 'm1',
              endpoint: 'news',
              label: l('Prensa · es-ES', 'Press · es-ES'),
              request: { query: 'Brisa Hotels cobros duplicados', maxResults: 10, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 158,
              results: ['rep-news-es'],
              returned: 7,
            },
            {
              id: 'm2',
              endpoint: 'news',
              label: l('Prensa · en-GB', 'Press · en-GB'),
              request: { query: 'Brisa Hotels double charge', maxResults: 10, language: 'en', region: 'GB', contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 172,
              results: ['rep-news-gb'],
              returned: 4,
            },
            {
              id: 'm3',
              endpoint: 'news',
              label: l('Prensa · de-DE', 'Press · de-DE'),
              request: { query: 'Brisa Hotels doppelte Abbuchung', maxResults: 10, language: 'de', region: 'DE', contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 181,
              results: ['rep-news-de'],
              returned: 2,
            },
            {
              id: 'm4',
              endpoint: 'videos',
              label: l('Vídeos · últimas 24 h', 'Videos · last 24 h'),
              request: { query: 'Brisa Hotels charged twice', maxResults: 10, language: 'en', freshness: '2026-10-27T09:30:00Z/..' },
              latencyMs: 205,
              results: ['rep-video'],
              returned: 3,
            },
            {
              id: 'm5',
              endpoint: 'web',
              label: l('Foros (sin nuestro dominio)', 'Forums (excluding our domain)'),
              request: { query: 'Brisa Hotels double charge -site:brisahotels.example', maxResults: 10, contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 149,
              results: ['rep-forum'],
              returned: 10,
            },
            {
              id: 'm6',
              endpoint: 'browse',
              label: l('Nuestro centro de ayuda', 'Our help centre'),
              request: { url: HELP, liveCrawl: 'force', contentFormat: 'markdown', maxLength: 8000 },
              latencyMs: 690,
              results: ['rep-help'],
            },
          ],
        },
        {
          kind: 'reason',
          id: 'r',
          text: l(
            'Primer rastro en un foro a las 07:52; prensa española a las 09:05; vídeo a las 09:30; Reino Unido 09:40; Alemania 10:15. El centro de ayuda no tiene aviso.',
            'First trace on a forum at 07:52; Spanish press at 09:05; video at 09:30; UK at 09:40; Germany at 10:15. The help centre shows no notice.',
          ),
        },
        {
          kind: 'answer',
          id: 'a',
          text: l(
            'El primer rastro es un foro a las **07:52** [1]. A las 09:05 ya hay prensa en España [2] y después en Reino Unido [3] y Alemania [4]. Un vídeo de las 09:30 suma 48.000 visualizaciones; el momento clave está en 1:12–1:41 [5]. **No hemos respondido**: el centro de ayuda no tiene ningún aviso desde el 20-oct [6].',
            'The first trace is a forum post at **07:52** [1]. By 09:05 there is press coverage in Spain [2], then in the UK [3] and Germany [4]. A 09:30 video has 48,000 views; the key moment is at 1:12–1:41 [5]. **We have not responded**: the help centre has had no notice since 20 Oct [6].',
          ),
          flags: [l('3 mercados en paralelo', '3 markets in parallel'), l('Vídeo con minuto clave', 'Video with key minute'), l('Nuestra web, en vivo', 'Our site, live')],
          artifact: {
            kind: 'timeline',
            title: l('Cronología · hoy, 28-oct', 'Timeline · today, 28 Oct'),
            items: [
              { time: '07:52', market: l('Foro · EN', 'Forum · EN'), text: l('Un cliente denuncia un doble cargo en Brisa Palma', 'A guest reports a double charge at Brisa Palma'), cite: 1, tone: 'warn' },
              { time: '09:05', market: l('ES', 'ES'), text: l('Noticias Turismo: decenas de afectados en Baleares y Canarias', 'Noticias Turismo: dozens affected in the Balearic and Canary Islands'), cite: 2, tone: 'bad' },
              { time: '09:30', market: l('Vídeo', 'Video'), text: l('Vlog de 6:41 con 48.000 visualizaciones; cargos visibles en 1:12', '6:41 vlog with 48,000 views; charges visible at 1:12'), cite: 5, tone: 'bad' },
              { time: '09:40', market: l('GB', 'GB'), text: l('UK Travel Daily: «la cadena aún no ha hecho comentarios»', 'UK Travel Daily: “the chain has not yet commented”'), cite: 3, tone: 'bad' },
              { time: '10:15', market: l('DE', 'DE'), text: l('Reise Aktuell: afectados en Mallorca', 'Reise Aktuell: guests affected in Mallorca'), cite: 4, tone: 'warn' },
              { time: '10:38', market: l('Brisa', 'Brisa'), text: l('Centro de ayuda sin aviso (última actualización: 20-oct)', 'Help centre without a notice (last updated 20 Oct)'), cite: 6, tone: 'bad' },
            ],
            heat: [
              { market: 'ES', label: l('Alto', 'High'), level: 3, note: l('Prensa nacional + foros', 'National press + forums') },
              { market: 'GB', label: l('Medio', 'Medium'), level: 2, note: l('Un medio + vídeo en inglés', 'One outlet + English video') },
              { market: 'DE', label: l('Bajo', 'Low'), level: 1, note: l('Un medio regional', 'One regional outlet') },
            ],
            actions: [
              l('Publicar aviso en el centro de ayuda y en la app (ES/EN/DE) antes de las 11:30.', 'Publish a notice in the help centre and app (ES/EN/DE) before 11:30.'),
              l('Responder al vídeo y al hilo del foro con el canal de reembolso.', 'Reply to the video and the forum thread with the refund channel.'),
              l('Enviar una declaración a UK Travel Daily, que cita «sin comentarios».', 'Send a statement to UK Travel Daily, which reports “no comment”.'),
              l('Activar con Finanzas el reembolso automático de cargos duplicados.', 'Trigger automatic refunds of duplicate charges with Finance.'),
            ],
          },
        },
      ],
    },
    bing: {
      label: l('Con Grounding with Bing', 'With Grounding with Bing'),
      desc: l('Agente de Foundry con bing_grounding (market es-ES, freshness Day).', 'Foundry agent with bing_grounding (market es-ES, freshness Day).'),
      citations: ['rep-news-es'],
      steps: [
        { kind: 'user', id: 'u', text: question },
        {
          kind: 'bing',
          id: 'b',
          query: 'Brisa Hotels cobros duplicados',
          citations: ['rep-news-es'],
          config: 'count: 5 · market: es-ES · freshness: Day',
        },
        {
          kind: 'answer',
          id: 'a',
          text: l(
            'Varios medios informan de que clientes de Brisa Hotels denuncian cobros duplicados tras un cambio en el sistema de pagos [1]. Te recomiendo vigilar la evolución en redes sociales.',
            'Several outlets report that Brisa Hotels guests are complaining about double charges after a payment-system change [1]. I recommend monitoring how it evolves on social media.',
          ),
        },
        {
          kind: 'gap',
          id: 'g1',
          title: l('Un mercado por configuración', 'One market per configuration'),
          text: l(
            'La herramienta tiene un solo market e idioma. Reino Unido y Alemania exigen otras herramientas o ejecuciones, y luego hay que fusionar las respuestas.',
            'The tool has a single market and language. The UK and Germany need other tools or runs, and then the answers must be merged.',
          ),
          workaround: l('Una herramienta por mercado + lógica de fusión.', 'One tool per market + merge logic.'),
        },
        {
          kind: 'gap',
          id: 'g2',
          title: l('Sin vídeo ni minuto clave', 'No video, no key minute'),
          text: l(
            'No hay vertical de vídeo con visualizaciones ni con el momento exacto que conviene ver antes de responder.',
            'There is no video vertical with view counts or the exact moment worth watching before responding.',
          ),
          workaround: l('API de cada plataforma de vídeo + transcripción propia.', 'Each video platform’s API + your own transcription.'),
        },
        {
          kind: 'gap',
          id: 'g3',
          title: l('Sin cronología ni comprobación propia', 'No timeline, no self-check'),
          text: l(
            'Sin hora por resultado no hay cronología, y el modelo no puede abrir nuestro centro de ayuda para ver si ya hemos respondido.',
            'Without a per-result time there is no timeline, and the model cannot open our help centre to see whether we have responded.',
          ),
          workaround: l('Herramienta de escucha social (licencia) + revisión manual.', 'Social listening tool (licence) + manual check.'),
        },
      ],
    },
  },
  diyLabel: l('Herramienta de escucha social', 'Social listening tool'),
  compare: [
    {
      need: l('Prensa de varios países a la vez', 'Press from several countries at once'),
      webiq: ['yes', l('news con language/region, en paralelo', 'news with language/region, in parallel')],
      bing: ['partial', l('Un market por configuración', 'One market per configuration')],
      diy: ['yes', l('Incluido en la licencia', 'Included in the licence')],
    },
    {
      need: l('Hora de publicación (cronología)', 'Publication time (timeline)'),
      webiq: ['yes', l('lastUpdatedAt en cada noticia', 'lastUpdatedAt on every article')],
      bing: ['no', l('Sin fecha por resultado', 'No per-result date')],
      diy: ['yes', l('Incluido en la licencia', 'Included in the licence')],
    },
    {
      need: l('Vídeo con alcance y minuto clave', 'Video with reach and key minute'),
      webiq: ['yes', l('videos: viewCount + moments', 'videos: viewCount + moments')],
      bing: ['no', l('Sin vertical de vídeo', 'No video vertical')],
      diy: ['partial', l('Según la plataforma', 'Depends on the platform')],
    },
    {
      need: l('Excluir nuestro propio dominio', 'Exclude our own domain'),
      webiq: ['yes', l('-site: en la consulta', '-site: in the query')],
      bing: ['partial', l('Con Bing Custom Search', 'With Bing Custom Search')],
      diy: ['yes', l('Configurable', 'Configurable')],
    },
    {
      need: l('Comprobar si ya hemos respondido', 'Check whether we have already responded'),
      webiq: ['yes', l('browse de nuestra web, en vivo', 'browse our own site, live')],
      bing: ['no', l('No abre URLs concretas', 'Does not open specific URLs')],
      diy: ['partial', l('Monitor de cambios aparte', 'Separate change monitor')],
    },
    {
      need: l('Integrarlo en nuestras herramientas', 'Integrate it into our own tools'),
      webiq: ['yes', l('REST, SDK y MCP', 'REST, SDK and MCP')],
      bing: ['partial', l('Solo dentro del agente', 'Only inside the agent')],
      diy: ['partial', l('Según la API del proveedor', 'Depends on the vendor API')],
    },
  ],
  cost: {
    unit: l('barrido de reputación (6 llamadas)', 'reputation sweep (6 calls)'),
    runsPerMonth: 1440,
    runsHint: l('Cada 15 min, 12 h al día, 30 días', 'Every 15 min, 12 h a day, 30 days'),
    diy: {
      label: l('Herramienta de escucha social', 'Social listening tool'),
      monthly: 3000,
      basis: l(
        'Supuesto ilustrativo de licencia mensual de una plataforma de escucha social. Cámbialo por tu cifra.',
        'Illustrative monthly licence for a social listening platform. Replace with your own figure.',
      ),
    },
  },
  live: [
    {
      label: l('Noticias sobre la marca (es-ES)', 'Brand news (es-ES)'),
      endpoint: 'news',
      body: { query: '{client}', maxResults: 10, language: 'es', region: 'ES', contentFormat: 'passage', maxLength: 3000 },
    },
    {
      label: l('Noticias sobre la marca (en-GB)', 'Brand news (en-GB)'),
      endpoint: 'news',
      body: { query: '{client}', maxResults: 10, language: 'en', region: 'GB', contentFormat: 'passage', maxLength: 3000 },
    },
    {
      label: l('Vídeos del último mes', 'Videos from the last month'),
      endpoint: 'videos',
      body: { query: '{client}', maxResults: 5, freshness: 'month' },
    },
  ],
  takeaways: [
    l('Tres mercados, vídeo y foros en una sola ronda paralela: cronología con la hora real.', 'Three markets, video and forums in one parallel round: a timeline with real times.'),
    l('videos devuelve visualizaciones y el minuto exacto para responder con contexto.', 'videos returns view counts and the exact minute, so you respond with context.'),
    l('browse revisa nuestra propia web: sabemos que aún no hemos respondido.', 'browse checks our own site: we know we have not responded yet.'),
  ],
};
