# Guion de demo — español

**Duración sugerida:** 6–9 minutos. La reproducción es guionizada: las consultas, fuentes, resultados y latencias son ficticios. Indícalo antes de presentar la pantalla.

## Apertura

> «Web IQ no es solo una búsqueda para un chatbot. Permite combinar búsqueda web, noticias, vídeo, imágenes, lectura de páginas y respuestas estructuradas. Vamos a ver seis tareas que hoy suelen exigir varias consultas, herramientas o código de integración.»

Selecciona un perfil sectorial genérico que encaje con la audiencia o mantén **Neutral**. En **Ajustes** puedes cambiar el idioma, aplicar una paleta o editar colores. No se incluyen nombres ni logos de clientes; cualquier marca autorizada que añadas es para tu propia presentación y no debe entrar en el ejemplo público.

## Caso 0 · En vivo (opcional, 2–3 minutos)

Úsalo para abrir o cerrar con datos reales, o cuando el cliente pregunte «¿y esto funciona de verdad?». Introduce antes el código de acceso para no hacerlo delante del público.

1. Pulsa un ejemplo: **Último Clásico**, **Fórmula 1** o **Jugadas NBA** (deportes), **Novedades de Microsoft IA**, **iPhone vs Galaxy** o **Starship de SpaceX** (tecnología), **Estrenos y tráilers**, **Paella valenciana**, **Lisboa en 2 días** o **Avances en alzhéimer** (temas varios). También puedes pedir al público una pregunta.
2. Mientras se ejecuta, señala el panel derecho: el plan de búsqueda (idioma, mercado y frescura elegidos por el modelo) y las cuatro llamadas en paralelo con su latencia.
3. Cuando aparezca la respuesta, pulsa una cita `[n]` para resaltar su fuente. Baja hasta los vídeos (momentos clave con marca de tiempo), las imágenes y las métricas: tiempo total, llamadas y coste.

> «Esto no está guionizado: es la web de ahora mismo. Una sola petición por vertical nos da páginas con su fragmento y fecha, noticias, imágenes y vídeos con sus momentos clave. Con un grounding genérico tendríamos que encadenar servicios para conseguir lo mismo.»

Si una búsqueda devuelve poco, dilo con naturalidad: el modelo solo responde con lo que encuentra y lo indica cuando las fuentes no bastan.

## Recorrido por los seis casos

1. **Vigilancia regulatoria.** Abre el caso y deja avanzar la variante Web IQ. Señala la búsqueda restringida al dominio oficial, la prensa en español e inglés y la lectura completa de la guía. En la tabla final, abre una obligación y sigue su fuente.\
   **Idea clave:** pasar de encontrar titulares a relacionar el documento oficial con obligaciones, fechas y evidencia trazable.
2. **Precios de la competencia.** Abre el caso y destaca que la información de precios se consulta en páginas directas, no solo en el índice del buscador. Compara los valores y sus fechas.\
   **Idea clave:** las páginas cambian; la lectura directa y el rastro de origen reducen el trabajo de mantener un scraper o un proceso manual.
3. **Crisis de reputación.** Muestra las consultas en distintos mercados, y después las noticias, la web y los vídeos. Si hay momentos del vídeo en el guion, señala que ayudan a localizar la evidencia concreta.\
   **Idea clave:** monitorizar señales heterogéneas y multilingües implica más que una búsqueda web aislada.
4. **Due diligence de terceros.** Recorre registros oficiales, sanciones, prensa y la página del licitador. En la comparativa, separa lo que resuelve una búsqueda de lo que necesita lectura o una fuente adicional.\
   **Idea clave:** el equipo de riesgo puede partir de una evidencia consolidada y conservar el origen de cada señal.
5. **Asistente del viajero.** Cambia a este caso y enseña la respuesta estructurada de hora y meteorología junto con noticias locales, imágenes, vídeo y avisos.\
   **Idea clave:** una respuesta contextual puede unir datos estructurados y evidencia visual o editorial reciente.
6. **Contratos de proveedores con Foundry IQ y Web IQ.** Presenta el expediente ficticio de Logística Meridiana: tres ofertas sintéticas de Movistar Empresas, Vodafone Business y Orange Empresas. En la variante Web IQ, señala que el agente primero lee los contratos con Foundry IQ y después lanza búsquedas de noticias y web en paralelo (subidas de tarifas e IPC, reclamaciones, caídas, sanciones y reseñas). Cambia a **Con Grounding with Bing**: con datos de 2024 la recomendación pasa a Orange.
   **Idea clave:** el conocimiento interno dice qué hemos firmado; Web IQ añade lo que ha pasado esta semana. La reputación actual estrecha la diferencia, pero no cambia el líder.

## Caso 6 en vivo: agente de Foundry (opcional, 2 minutos)

Abre la pestaña **Agente de Foundry** del Caso 6. El panel izquierdo muestra el agente, el proyecto, el modelo, la base de conocimiento y los documentos sintéticos (se pueden abrir). El prompt de referencia ya está escrito; pulsa **Ejecutar el agente** (o Cmd/Ctrl+Intro).

1. Mientras corre, enseña cada llamada: primero **Foundry IQ · base de conocimiento** con los fragmentos de las ofertas y, después, varias llamadas **Web IQ · news / web** en paralelo, cada una con sus consultas, resultados y fuentes.
2. Cuando termine (unos 20 s), recorre el resumen ejecutivo, la revisión reputacional por operador, la matriz ponderada sobre 100 y los riesgos contractuales cruzados con las noticias. Las fichas azules abren la noticia; las verdes, el documento del expediente.
3. Si alguien pregunta, pulsa **Abrir en Foundry** para enseñar el mismo agente en el portal.

> «Es un agente real de Foundry, con dos herramientas MCP: Foundry IQ para nuestros contratos y Web IQ para lo que dice hoy el mercado. Cada dato llega con su fuente, interna o externa.»

La respuesta cambia entre ejecuciones porque la web cambia; no la presentes como una recomendación de compra.

## Comparación y cierre

En cada caso alterna **Con Web IQ** y **Con Grounding with Bing**. En las pestañas **Comparativa**, **Coste** y **API** enseña, respectivamente, cobertura funcional, el supuesto económico y las peticiones/respuestas de ejemplo.

> «La comparación no dice que Grounding with Bing Search no se pueda ampliar. Muestra qué partes pueden exigir herramientas adicionales, llamadas encadenadas, crawlers o código a medida. Web IQ ofrece endpoints especializados para construir ese flujo con menos piezas.»

El coste de la pantalla es ilustrativo, basado en precios consultados el 28-10-2026 y en volúmenes configurables; no es una cotización. Para una prueba real, revisa precios y términos vigentes, configura una clave en el servidor y usa el **Caso 0 · En vivo** o la pestaña **Agente de Foundry** del Caso 6. No presentes los datos guionizados como resultados de un cliente o de la API real.
