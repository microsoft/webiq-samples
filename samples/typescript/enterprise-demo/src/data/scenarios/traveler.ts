// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { l, type Scenario } from '../types';

const OPERATOR = 'https://www.ferrovie-aeroporto.example/avvisi';

const question = l(
  'Acabo de aterrizar en Fiumicino. ¿Cómo llego al centro de Roma esta noche y hay algo que deba saber para mañana?',
  'I’ve just landed at Fiumicino. How do I get to central Rome tonight, and is there anything I should know for tomorrow?',
);

export const traveler: Scenario = {
  id: 'traveler-assistant',
  num: 5,
  icon: 'Plane',
  primaryClient: 'travel',
  sector: l('Viajes · Atención al cliente', 'Travel · Customer care'),
  title: l('Asistente del viajero en destino', 'In-destination traveller assistant'),
  tagline: l(
    'Hora y tiempo estructurados, huelgas locales en italiano, la señal que hay que seguir, el minuto exacto de un vídeo y el aviso del operador de hoy.',
    'Structured time and weather, local strikes in Italian, the sign to follow, the exact minute of a video and today’s operator notice.',
  ),
  summary: l(
    'Un cliente aterriza en Roma y pregunta al asistente de la agencia. En una sola ronda paralela, Web IQ obtiene hora y tiempo estructurados (auto), noticias locales en italiano, una imagen de la señalización y un vídeo con el minuto clave. Además lee el aviso del operador publicado hoy, que cambia la hora del último tren.',
    'A customer lands in Rome and asks the agency’s assistant. In a single parallel round, Web IQ returns structured time and weather (auto), local news in Italian, an image of the signage and a video with the key minute. It also reads the operator notice published today, which changes the time of the last train.',
  ),
  need: l(
    'Responder al cliente con información local, actual y útil en el momento en que la necesita.',
    'Answer customers with local, current, useful information at the moment they need it.',
  ),
  clientFit: {
    travel: l(
      'Asistente para viajeros en destino: llegada, transporte, huelgas, tiempo y vídeos útiles.',
      'In-destination traveller assistant: arrival, transport, strikes, weather and helpful videos.',
    ),
    hospitality: l(
      'Concierge digital del hotel: tiempo, transporte y eventos cerca del hotel, con imágenes y vídeos.',
      'Digital hotel concierge: weather, transport and events near the hotel, with images and videos.',
    ),
    energy: l(
      'Asistente para brigadas de campo: tiempo y avisos locales en la ubicación de cada intervención.',
      'Assistant for field crews: local weather and notices at each job location.',
    ),
    insurance: l(
      'Asistencia en viaje: tiempo, huelgas y avisos en destino para asegurados con una incidencia.',
      'Travel assistance: weather, strikes and local notices for policyholders with an incident abroad.',
    ),
    'public-sector': l(
      'Atención ciudadana y turismo: tiempo, transporte y avisos de servicio, con imágenes y vídeos.',
      'Citizen services and tourism: weather, transport and service notices, with images and videos.',
    ),
  },
  endpoints: ['auto', 'news', 'images', 'videos', 'browse'],
  sources: [
    {
      id: 'tr-time',
      kind: 'timezone',
      title: 'Hora local · Roma',
      url: 'https://www.hora-mundial.example/roma',
      publisher: 'Hora Mundial (ficticio)',
      language: 'es',
      date: '2026-10-28T19:24:00+01:00',
      excerpt: 'Roma: 19:24, miércoles 28 de octubre. Zona horaria CET (UTC+1), la misma que en Madrid.',
      tr: { en: 'Rome: 19:24, Wednesday 28 October. Time zone CET (UTC+1), the same as Madrid.' },
    },
    {
      id: 'tr-operator',
      kind: 'page',
      title: 'Avvisi ai viaggiatori | Ferrovie Aeroporto',
      url: OPERATOR,
      publisher: 'Ferrovie Aeroporto (fittizio)',
      language: 'it',
      date: '2026-10-28T12:10:00+01:00',
      crawledAt: '2026-10-28T19:24:37+01:00',
      excerpt: 'Mercoledì 28 ottobre, per lavori sulla linea, l’ultimo treno per Roma Termini parte alle 23:35 invece delle 23:50.',
      tr: {
        es: 'Miércoles 28 de octubre: por obras en la línea, el último tren a Roma Termini sale a las 23:35 en lugar de a las 23:50.',
        en: 'Wednesday 28 October: due to engineering works, the last train to Roma Termini leaves at 23:35 instead of 23:50.',
      },
    },
    {
      id: 'tr-image',
      kind: 'image',
      title: 'Terminal 1, arrivi: indicazioni per i treni',
      url: 'https://www.aeroporto-foto.example/t1-arrivi-treni.jpg',
      publisher: 'Aeroporto Foto (fittizio)',
      language: 'it',
      date: '2026-06-03T00:00:00+02:00',
      excerpt: 'Cartello verde «Treni / Trains» nella hall arrivi del Terminal 1.',
      tr: {
        es: 'Señal verde «Treni / Trains» en la sala de llegadas de la Terminal 1.',
        en: 'Green “Treni / Trains” sign in the Terminal 1 arrivals hall.',
      },
      image: {
        width: 1600,
        height: 900,
        caption: l('Señal verde «Treni / Trains» · llegadas T1', 'Green “Treni / Trains” sign · T1 arrivals'),
      },
    },
    {
      id: 'tr-video',
      kind: 'video',
      title: 'Fiumicino to Rome by train: tickets, platforms and tips',
      url: 'https://www.video-platform.example/watch?v=fco-train',
      publisher: 'Rome Travel Tips (fictitious)',
      language: 'en',
      date: '2026-09-14T18:00:00+02:00',
      excerpt: 'Step-by-step guide from arrivals to the platform: where the machines are, which ticket to buy and how to validate it.',
      tr: { es: 'Guía paso a paso desde llegadas hasta el andén: dónde están las máquinas, qué billete comprar y cómo validarlo.' },
      video: {
        length: '00:07:58',
        views: 312000,
        publishedBy: 'Rome Travel Tips',
        moment: { title: l('Comprar el billete', 'Buying the ticket'), start: '0.00:00:48', end: '0.00:01:20' },
      },
    },
    {
      id: 'tr-strike',
      kind: 'news',
      title: 'Sciopero dei treni giovedì 29 ottobre: le fasce garantite',
      url: 'https://www.notizie-roma.example/2026/10/27/sciopero-treni-29-ottobre',
      publisher: 'Notizie Roma (fittizio)',
      language: 'it',
      date: '2026-10-27T16:20:00+01:00',
      excerpt: 'Sciopero nazionale dei treni dalle 00:00 alle 23:59 di giovedì 29 ottobre. Garantite le corse nelle fasce 6-9 e 18-21.',
      tr: {
        es: 'Huelga nacional de trenes de 00:00 a 23:59 del jueves 29 de octubre. Servicios garantizados en las franjas 6–9 y 18–21.',
        en: 'National train strike from 00:00 to 23:59 on Thursday 29 October. Services guaranteed in the 6–9 and 18–21 bands.',
      },
    },
    {
      id: 'tr-weather',
      kind: 'weather',
      title: 'Fiumicino · previsión',
      url: 'https://www.meteo.example/it/fiumicino',
      publisher: 'Meteo (ficticio)',
      language: 'es',
      date: '2026-10-28T19:00:00+01:00',
      excerpt: 'Ahora: 15 °C, nublado. Jueves 29: lluvia de 07 a 12 h (70 %), máx. 19 °C, mín. 13 °C.',
      tr: { en: 'Now: 15 °C, cloudy. Thursday 29: rain from 07:00 to 12:00 (70%), high 19 °C, low 13 °C.' },
    },
    {
      id: 'tr-blog',
      kind: 'web',
      title: 'Cómo ir del aeropuerto de Fiumicino al centro de Roma',
      url: 'https://www.blog-viajes.example/fiumicino-roma-tren',
      publisher: 'Blog de Viajes (ficticio)',
      language: 'es',
      date: '2025-03-02T00:00:00+01:00',
      excerpt: 'El tren del aeropuerto sale cada 15 minutos, tarda 32 minutos hasta Roma Termini y el último sale a las 23:50.',
      tr: { en: 'The airport train runs every 15 minutes, takes 32 minutes to Roma Termini, and the last one leaves at 23:50.' },
    },
  ],
  variants: {
    webiq: {
      label: l('Con Web IQ', 'With Web IQ'),
      desc: l('auto (tiempo y hora) + noticias it-IT + imagen + vídeo + aviso del operador, en paralelo.', 'auto (weather and time) + it-IT news + image + video + operator notice, in parallel.'),
      citations: ['tr-time', 'tr-operator', 'tr-image', 'tr-video', 'tr-strike', 'tr-weather'],
      steps: [
        { kind: 'user', id: 'u', text: question },
        {
          kind: 'plan',
          id: 'p',
          text: l(
            'Plan: hora y tiempo con auto en la ubicación del aeropuerto, noticias locales en italiano, señalización y vídeo para orientarse, y los avisos del operador en vivo.',
            'Plan: time and weather with auto at the airport’s location, local news in Italian, signage and video to find the way, and the operator’s notices, live.',
          ),
        },
        {
          kind: 'calls',
          id: 'c1',
          calls: [
            {
              id: 't1',
              endpoint: 'auto',
              label: l('Tiempo y hora local (beta)', 'Weather and local time (beta)'),
              request: {
                query: 'tiempo y hora local en Fiumicino',
                language: 'es',
                region: 'ES',
                location: 'lat:41.8003;long:12.2389',
                mode: 'fast',
                responseFilter: ['weather', 'timezone'],
              },
              latencyMs: 236,
              results: ['tr-weather', 'tr-time'],
            },
            {
              id: 't2',
              endpoint: 'news',
              label: l('Noticias locales · it-IT', 'Local news · it-IT'),
              request: { query: 'sciopero treni Fiumicino', maxResults: 10, language: 'it', region: 'IT', contentFormat: 'passage', maxLength: 3000 },
              latencyMs: 168,
              results: ['tr-strike'],
              returned: 6,
            },
            {
              id: 't3',
              endpoint: 'images',
              label: l('Señalización', 'Signage'),
              request: { query: 'Fiumicino terminal 1 arrivi indicazioni treni', maxResults: 5, aspectRatio: 'wide', watermarkFree: true },
              latencyMs: 187,
              results: ['tr-image'],
              returned: 5,
            },
            {
              id: 't4',
              endpoint: 'videos',
              label: l('Vídeo: del avión al tren', 'Video: from plane to train'),
              request: { query: 'Fiumicino airport train to Rome ticket', maxResults: 5, language: 'en' },
              latencyMs: 209,
              results: ['tr-video'],
              returned: 5,
            },
            {
              id: 't5',
              endpoint: 'browse',
              label: l('Avisos del operador', 'Operator notices'),
              request: { url: OPERATOR, liveCrawl: 'force', contentFormat: 'markdown', maxLength: 6000 },
              latencyMs: 640,
              results: ['tr-operator'],
            },
          ],
        },
        {
          kind: 'reason',
          id: 'r',
          text: l(
            'Esta noche el tren funciona, pero el aviso de hoy adelanta el último a las 23:35. Mañana hay huelga con franjas garantizadas y llueve por la mañana.',
            'The train is running tonight, but today’s notice brings the last one forward to 23:35. Tomorrow there is a strike with guaranteed bands, and rain in the morning.',
          ),
        },
        {
          kind: 'answer',
          id: 'a',
          text: l(
            'Son las **19:24** en Roma, la misma hora que en Madrid [1]. El tren al centro funciona, pero hoy, por obras, **el último sale a las 23:35** [2]. Sigue la señal verde «Treni / Trains» [3] y compra el billete como se ve en el minuto 0:48 de este vídeo [4]. Mañana jueves hay **huelga de trenes de 24 h**; solo se garantizan las franjas 6–9 y 18–21 [5]. Lleva paraguas: lluvia de 7 a 12 h (70 %), máx. 19 °C [6].',
            'It’s **19:24** in Rome, the same time as in Madrid [1]. The train to the centre is running, but today, due to engineering works, **the last one leaves at 23:35** [2]. Follow the green “Treni / Trains” sign [3] and buy your ticket as shown at 0:48 in this video [4]. Tomorrow, Thursday, there is a **24-hour train strike**; only the 6–9 and 18–21 bands are guaranteed [5]. Take an umbrella: rain from 7 to 12 (70%), high of 19 °C [6].',
          ),
          flags: [l('5 tipos de respuesta en una ronda', '5 answer types in one round'), l('Tiempo y hora estructurados', 'Structured weather and time'), l('Aviso del operador, en vivo', 'Operator notice, live')],
          artifact: {
            kind: 'cards',
            title: l('Tu llegada a Roma', 'Your arrival in Rome'),
            cards: [
              {
                icon: 'TrainFront',
                title: l('Esta noche: tren al centro', 'Tonight: train to the centre'),
                text: l('Hoy el último sale a las 23:35, por obras. Sigue la señal verde «Treni / Trains».', 'Today the last one leaves at 23:35 due to works. Follow the green “Treni / Trains” sign.'),
                cite: 2,
                tone: 'warn',
                media: 'tr-image',
              },
              {
                icon: 'Clapperboard',
                title: l('Cómo comprar el billete', 'How to buy the ticket'),
                text: l('Minuto 0:48–1:20 del vídeo de Rome Travel Tips (312.000 visualizaciones).', 'Minute 0:48–1:20 of the Rome Travel Tips video (312,000 views).'),
                cite: 4,
                tone: 'info',
                media: 'tr-video',
              },
              {
                icon: 'TriangleAlert',
                title: l('Mañana: huelga de trenes', 'Tomorrow: train strike'),
                text: l('24 h el jueves 29-oct. Franjas garantizadas: 6–9 y 18–21.', '24 h on Thursday 29 Oct. Guaranteed bands: 6–9 and 18–21.'),
                cite: 5,
                tone: 'bad',
              },
              {
                icon: 'CloudRain',
                title: l('Tiempo mañana', 'Weather tomorrow'),
                text: l('Lluvia de 7 a 12 h (70 %). Máx. 19 °C. Ahora, 15 °C.', 'Rain from 7 to 12 (70%). High 19 °C. Now 15 °C.'),
                cite: 6,
                tone: 'info',
              },
            ],
          },
        },
      ],
    },
    bing: {
      label: l('Con Grounding with Bing', 'With Grounding with Bing'),
      desc: l('Agente de Foundry con bing_grounding (market es-ES).', 'Foundry agent with bing_grounding (market es-ES).'),
      citations: ['tr-blog'],
      steps: [
        { kind: 'user', id: 'u', text: question },
        {
          kind: 'bing',
          id: 'b',
          query: 'cómo ir de Fiumicino a Roma en tren',
          citations: ['tr-blog'],
          config: 'count: 5 · market: es-ES · set_lang: es',
        },
        {
          kind: 'answer',
          id: 'a',
          text: l(
            'Puedes tomar el tren del aeropuerto: sale cada 15 minutos, tarda 32 minutos hasta Roma Termini y el último sale a las 23:50 [1]. Te recomiendo consultar el tiempo antes de salir.',
            'You can take the airport train: it runs every 15 minutes, takes 32 minutes to Roma Termini, and the last one leaves at 23:50 [1]. I recommend checking the weather before you go.',
          ),
        },
        {
          kind: 'gap',
          id: 'g1',
          title: l('Hora del último tren equivocada', 'Wrong time for the last train'),
          text: l(
            'No puede abrir el aviso del operador: repite el 23:50 de un blog de 2025 y no ve que hoy el último sale a las 23:35. El viajero podría perderlo.',
            'It cannot open the operator notice: it repeats the 23:50 from a 2025 blog and misses that today the last one leaves at 23:35. The traveller could miss it.',
          ),
          workaround: l('Scraper del operador + monitor de cambios.', 'Operator scraper + change monitor.'),
        },
        {
          kind: 'gap',
          id: 'g2',
          title: l('Ni huelga ni tiempo estructurado', 'No strike, no structured weather'),
          text: l(
            'Con market es-ES, la noticia italiana de la huelga no aparece, y no hay respuestas estructuradas de tiempo ni de hora local.',
            'With market es-ES, the Italian strike news never shows up, and there are no structured weather or local-time answers.',
          ),
          workaround: l('API meteorológica + otra herramienta con market it-IT.', 'Weather API + another tool with market it-IT.'),
        },
        {
          kind: 'gap',
          id: 'g3',
          title: l('Solo texto', 'Text only'),
          text: l(
            'No hay imágenes ni vídeos que ayuden a orientarse en el aeropuerto: solo texto y enlaces.',
            'There are no images or videos to help find the way at the airport: only text and links.',
          ),
          workaround: l('APIs de imágenes y de vídeo aparte.', 'Separate image and video APIs.'),
        },
      ],
    },
  },
  diyLabel: l('API meteorológica + scrapers + APIs de imagen y vídeo', 'Weather API + scrapers + image and video APIs'),
  compare: [
    {
      need: l('Tiempo y hora local estructurados', 'Structured weather and local time'),
      webiq: ['yes', l('auto: weather + timezone (beta)', 'auto: weather + timezone (beta)')],
      bing: ['no', l('Solo texto de páginas', 'Only page text')],
      diy: ['partial', l('API meteorológica aparte', 'Separate weather API')],
    },
    {
      need: l('Noticias locales en otro idioma', 'Local news in another language'),
      webiq: ['yes', l('news it-IT en la misma ronda', 'news it-IT in the same round')],
      bing: ['partial', l('Un market por configuración', 'One market per configuration')],
      diy: ['partial', l('Proveedor de noticias', 'News provider')],
    },
    {
      need: l('Imágenes para orientarse', 'Images to find the way'),
      webiq: ['yes', l('images: wide, sin marca de agua', 'images: wide, watermark-free')],
      bing: ['no', l('Sin imágenes', 'No images')],
      diy: ['partial', l('API de imágenes aparte', 'Separate image API')],
    },
    {
      need: l('Vídeo con el minuto exacto', 'Video with the exact minute'),
      webiq: ['yes', l('videos: moments', 'videos: moments')],
      bing: ['no', l('Sin vídeo', 'No video')],
      diy: ['partial', l('API de vídeo + transcripción', 'Video API + transcription')],
    },
    {
      need: l('El aviso del operador de hoy', 'Today’s operator notice'),
      webiq: ['yes', l('browse con liveCrawl force', 'browse with liveCrawl force')],
      bing: ['no', l('No abre URLs concretas', 'Does not open specific URLs')],
      diy: ['partial', l('Un scraper por operador', 'One scraper per operator')],
    },
    {
      need: l('Una sola integración', 'A single integration'),
      webiq: ['yes', l('Una API (o MCP) para todo', 'One API (or MCP) for everything')],
      bing: ['partial', l('Solo web; el resto, aparte', 'Web only; the rest separately')],
      diy: ['no', l('4–5 proveedores distintos', '4–5 different vendors')],
    },
  ],
  cost: {
    unit: l('conversación de llegada (5 llamadas; auto, gratis en beta)', 'arrival conversation (5 calls; auto free in beta)'),
    runsPerMonth: 50000,
    runsHint: l('≈50.000 viajeros al mes usan el asistente', '≈50,000 travellers a month use the assistant'),
    diy: {
      label: l('API meteorológica + scrapers + APIs de imagen y vídeo', 'Weather API + scrapers + image and video APIs'),
      monthly: 6000,
      basis: l(
        'Supuesto ilustrativo: API meteorológica, scrapers de operadores y APIs de imágenes y vídeo, con su mantenimiento. Cámbialo por tu cifra.',
        'Illustrative assumption: weather API, operator scrapers and image and video APIs, plus their maintenance. Replace with your own figure.',
      ),
    },
  },
  live: [
    {
      label: l('Tiempo y hora en Madrid (auto, beta)', 'Weather and time in Madrid (auto, beta)'),
      endpoint: 'auto',
      body: {
        query: 'tiempo y hora en Madrid',
        language: 'es',
        region: 'ES',
        location: 'lat:40.4168;long:-3.7038',
        mode: 'fast',
        responseFilter: ['weather', 'timezone'],
      },
    },
    {
      label: l('Vídeos: del aeropuerto al centro', 'Videos: airport to city centre'),
      endpoint: 'videos',
      body: { query: 'aeropuerto Madrid Barajas cómo llegar al centro', maxResults: 5, language: 'es', region: 'ES' },
    },
    {
      label: l('Imágenes de señalización', 'Signage images'),
      endpoint: 'images',
      body: { query: 'Madrid Barajas T4 señalización metro', maxResults: 5, aspectRatio: 'wide', watermarkFree: true },
    },
  ],
  takeaways: [
    l('Una sola ronda devuelve cinco tipos de respuesta: tiempo, hora, noticias, imagen y vídeo.', 'One round returns five answer types: weather, time, news, image and video.'),
    l('browse con liveCrawl force lee el aviso de hoy: el último tren sale antes de lo habitual.', 'browse with liveCrawl force reads today’s notice: the last train leaves earlier than usual.'),
    l('auto (beta, gratuito) añade tiempo y hora estructurados sin otra API.', 'auto (beta, free) adds structured weather and time without another API.'),
  ],
};
