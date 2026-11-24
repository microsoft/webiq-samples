// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { l, type L, type Mark } from './types';

/** Columnas de la matriz de capacidades (Web IQ, la última, se resalta). */
export const APPROACHES: L[] = [
  l('Grounding with Bing / Web Search (Foundry)', 'Grounding with Bing / Web Search (Foundry)'),
  l('Scrapers y APIs propias', 'In-house scrapers and APIs'),
  l('Microsoft Web IQ', 'Microsoft Web IQ'),
];

export const CAPABILITIES: { row: L; marks: [Mark, Mark, Mark] }[] = [
  { row: l('Resultados con URL, fecha y pasaje que tu código puede verificar', 'Results with URL, date and passage your code can verify'), marks: ['no', 'partial', 'yes'] },
  { row: l('Mercado, idioma y ubicación elegidos en cada consulta', 'Market, language and location chosen per query'), marks: ['partial', 'yes', 'yes'] },
  { row: l('Restringir o excluir dominios (site:, -site:)', 'Restrict or exclude domains (site:, -site:)'), marks: ['partial', 'yes', 'yes'] },
  { row: l('Leer una URL concreta en vivo, incluso con JavaScript', 'Read a specific URL live, even with JavaScript'), marks: ['no', 'partial', 'yes'] },
  { row: l('Verticales de noticias, imágenes y vídeo (con momentos clave)', 'News, image and video verticals (with key moments)'), marks: ['no', 'partial', 'yes'] },
  { row: l('Tiempo y hora local estructurados', 'Structured weather and local time'), marks: ['no', 'partial', 'yes'] },
  { row: l('Desde cualquier aplicación, modelo o framework (REST, SDK, MCP)', 'From any app, model or framework (REST, SDK, MCP)'), marks: ['partial', 'yes', 'yes'] },
  { row: l('Rastro por llamada (traceId) para auditoría', 'Per-call trail (traceId) for audit'), marks: ['partial', 'partial', 'yes'] },
  { row: l('Sin infraestructura que mantener (proxies, navegadores, bloqueos)', 'No infrastructure to maintain (proxies, browsers, blocking)'), marks: ['yes', 'no', 'yes'] },
];

export const CAPABILITIES_NOTE = l(
  '✓ cubierto · – parcial · ✗ no cubierto. Grounding with Bing y Web Search son herramientas de agentes de Foundry: tu aplicación recibe la respuesta del modelo y las citas (título y URL), no los resultados. Para restringir dominios se usa Bing Custom Search. En «Scrapers y APIs propias», todo lo parcial depende de lo que construyas y mantengas.',
  '✓ covered · – partial · ✗ not covered. Grounding with Bing and Web Search are Foundry agent tools: your app gets the model’s answer and the citations (title and URL), not the results. Restricting domains requires Bing Custom Search. Under “In-house scrapers and APIs”, anything partial depends on what you build and maintain.',
);

export const POSITIONING = l(
  'Grounding with Bing sigue siendo la opción más sencilla cuando solo necesitas que un agente de Foundry responda con información general de la web. Web IQ marca la diferencia cuando tu aplicación necesita las evidencias: pasajes con fecha, páginas concretas leídas en vivo, noticias por mercado, imágenes y vídeos, y la libertad de usarlo con cualquier modelo o proceso.',
  'Grounding with Bing is still the simplest option when you only need a Foundry agent to answer with general web information. Web IQ makes the difference when your application needs the evidence: dated passages, specific pages read live, news per market, images and videos, and the freedom to use it with any model or process.',
);

export const BENCHMARKS: { value: L; label: L; detail: L }[] = [
  {
    value: l('79,05', '79.05'),
    label: l('Satisfacción de grounding', 'Grounding satisfaction'),
    detail: l('Frente a 75,70 de la siguiente alternativa · 3.000 consultas reales evaluadas a ciegas', 'Versus 75.70 for the next best · 3,000 real queries rated blind'),
  },
  {
    value: l('164 ms', '164 ms'),
    label: l('Latencia P95', 'P95 latency'),
    detail: l('≈2,5× más rápido que la siguiente alternativa (406 ms)', '≈2.5× faster than the next best (406 ms)'),
  },
  {
    value: l('Menos tokens', 'Fewest tokens'),
    label: l('Tokens por consulta', 'Tokens per query'),
    detail: l('El menor consumo en el mismo conjunto de 3.000 consultas', 'Lowest usage across the same 3,000 queries'),
  },
];

export const BENCHMARKS_NOTE = l(
  'Benchmarks publicados por Microsoft en la documentación de Web IQ. Web IQ es la tecnología de búsqueda que usan Microsoft Copilot y ChatGPT, y cubre más de 100 idiomas y mercados.',
  'Benchmarks published by Microsoft in the Web IQ documentation. Web IQ is the search technology behind Microsoft Copilot and ChatGPT, and it covers 100+ languages and markets.',
);

/** Notas honestas para la conversación con cumplimiento y arquitectura. */
export const NOTES: { title: L; text: L }[] = [
  {
    title: l('Cómo mostrar los resultados', 'How to display results'),
    text: l(
      'Como máximo 200 caracteres por fuente (o menos si el editor lo limita), con atribución y enlace junto a la respuesta. La demo lo respeta en todas las pantallas.',
      'At most 200 characters per source (or less if the publisher limits it), with attribution and a link next to the answer. The demo respects this on every screen.',
    ),
  },
  {
    title: l('Qué se puede guardar', 'What you can store'),
    text: l(
      'No se puede copiar, cachear ni almacenar el contenido, salvo los resúmenes del modelo por usuario, el producto de trabajo interno y el procesamiento transitorio. Por eso el rastro de auditoría guarda consulta, URL, hora y traceId.',
      'Content cannot be copied, cached or stored, except per-user model summaries, internal work product and transient processing. That is why the audit trail keeps query, URL, time and traceId.',
    ),
  },
  {
    title: l('Datos y cumplimiento', 'Data and compliance'),
    text: l(
      'Igual que Grounding with Bing, queda fuera del DPA y del EU Data Boundary, y no tiene Private Link. Revisadlo con cumplimiento y no enviéis datos personales en las consultas.',
      'Like Grounding with Bing, it is outside the DPA and the EU Data Boundary, and has no Private Link. Review it with compliance and do not send personal data in queries.',
    ),
  },
  {
    title: l('Editores y uso del contenido', 'Publishers and content use'),
    text: l(
      'Las tarifas que pueda cobrar un editor de noticias corren por cuenta del cliente. El contenido no puede usarse para entrenar ni evaluar modelos.',
      'Any fees a news publisher may charge are the customer’s responsibility. Content cannot be used to train or evaluate models.',
    ),
  },
  {
    title: l('Requisitos y límites', 'Requirements and limits'),
    text: l(
      'Necesita una suscripción de Azure de pago (los créditos no sirven). Límite por defecto: 15 consultas por segundo por AppID. browse solo admite URLs públicas.',
      'It needs a paid Azure subscription (credits do not work). Default limit: 15 queries per second per AppID. browse only accepts public URLs.',
    ),
  },
  {
    title: l('auto está en beta', 'auto is in beta'),
    text: l(
      'Gratis durante la beta y solo para AppIDs habilitados; el contrato de la API puede cambiar. El resto de endpoints están disponibles con carácter general.',
      'Free during the beta and only for enabled AppIDs; the API contract may change. All other endpoints are generally available.',
    ),
  },
  {
    title: l('Imágenes, vídeos y seguridad', 'Images, videos and safety'),
    text: l(
      'De imágenes y vídeos solo se usan los metadatos y se muestran mediante las URLs devueltas. La protección frente a prompt injection es responsabilidad del orquestador.',
      'For images and videos only metadata is used, and they are displayed through the returned URLs. Protection against prompt injection is the orchestrator’s responsibility.',
    ),
  },
];

export const DOCS: { label: L; url: string }[] = [
  { label: l('Documentación de Web IQ', 'Web IQ documentation'), url: 'https://learn.microsoft.com/en-us/web-iq/' },
  { label: l('Página del producto', 'Product page'), url: 'https://www.microsoft.com/en-us/webiq' },
  { label: l('Términos de uso de Web IQ', 'Web IQ terms of use'), url: 'https://www.microsoft.com/en-us/webiq/webiq-legal' },
  { label: l('Portal: claves y playground', 'Portal: keys and playground'), url: 'https://webiq.microsoft.ai/playground' },
  { label: l('Grounding with Bing en Foundry', 'Grounding with Bing in Foundry'), url: 'https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/bing-tools' },
  { label: l('Herramientas web de Foundry', 'Foundry web tools'), url: 'https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/web-overview' },
  { label: l('Precios de Grounding with Bing', 'Grounding with Bing pricing'), url: 'https://www.microsoft.com/en-us/bing/apis' },
];
