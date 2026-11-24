// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ExternalLink } from 'lucide-react';
import { useI18n } from '../i18n';
import { CodeBlock } from './Copy';

const CREATE_ACCOUNT = `az login
az account set --subscription "<subscription-id>"
az provider register --namespace Microsoft.WebIQ --wait

az resource create \\
  --resource-group "<resource-group>" \\
  --name "<globally-unique-account-name>" \\
  --resource-type "Microsoft.WebIQ/accounts" \\
  --api-version 2026-06-01-preview \\
  --is-full-object \\
  --properties '{"location":"global","kind":"WebIQ.Grounding","sku":{"name":"G3"},"properties":{"statisticsEnabled":false}}'`;

const RESOURCE_ID = `az resource show \\
  --resource-group "<resource-group>" \\
  --name "<globally-unique-account-name>" \\
  --resource-type "Microsoft.WebIQ/accounts" \\
  --api-version 2026-06-01-preview \\
  --query id --output tsv`;

const RUN_DEMO = `cp .env.example .env      # WEBIQ_API_KEY=<your-api-key>
npm install
npm start                 # http://127.0.0.1:8787`;

const RUN_DEV = `npm run dev               # Vite · http://localhost:5173
npm run live              # otra terminal · another terminal`;

const RUN_CASE0 = `# .env · Caso 0 (en vivo / live)
WEBIQ_API_KEY=<your-api-key>
LLM_ENDPOINT=https://<foundry-resource>.cognitiveservices.azure.com/openai/v1
LLM_MODEL=gpt-5.4-mini            # Entra ID (az login / managed identity) o LLM_API_KEY
LIVE_ACCESS_CODE=<code>           # recomendado si la web es pública · recommended if public
LIVE_PER_MINUTE=6  LIVE_DAILY_LIMIT=200  LIVE_MAX_CONCURRENT=4`;

const MCP_CLI = JSON.stringify(
  {
    mcpServers: {
      'WebIQ-MCP': { url: 'https://api.microsoft.ai/v3/mcp', type: 'http', authtype: 'api-key', headers: { 'x-apikey': '<your-api-key>' } },
    },
  },
  null,
  2,
);

const SDKS = `pip install webiq                # Python 3.11+
npm install @microsoft/webiq     # Node.js 22+`;

type Step = { title: string; body: string; code: string; lang: 'bash' | 'json'; file?: string; extra?: { code: string; lang: 'bash' | 'json'; title: string } };

export function GuideView() {
  const { lang } = useI18n();
  const es = lang === 'es';

  const steps: Step[] = [
    {
      title: es ? 'Crea la cuenta de Web IQ en Azure' : 'Create the Web IQ account in Azure',
      body: es
        ? 'Necesitas una suscripción de Azure de pago (los créditos no sirven) y la CLI de Azure. El proveedor se registra una vez por suscripción. Si Web IQ no está habilitado en ella, la creación falla con un aviso explícito: pide acceso a tu equipo de cuenta de Microsoft. También se puede crear desde el portal de Azure.'
        : 'You need a paid Azure subscription (credits do not work) and the Azure CLI. The provider is registered once per subscription. If Web IQ is not enabled for it, creation fails with an explicit message: ask your Microsoft account team for access. You can also create it from the Azure portal.',
      code: CREATE_ACCOUNT,
      lang: 'bash',
    },
    {
      title: es ? 'Conecta el recurso y crea una clave' : 'Connect the resource and create a key',
      body: es
        ? 'Copia el resource ID, conéctalo en el portal de Web IQ y crea una clave de API. Cada AppID empieza con un límite de 15 consultas por segundo; el portal muestra el tuyo.'
        : 'Copy the resource ID, connect it in the Web IQ portal and create an API key. Each AppID starts with a 15 queries-per-second limit; the portal shows yours.',
      code: RESOURCE_ID,
      lang: 'bash',
    },
    {
      title: es ? 'Arranca la demo con la API en vivo' : 'Start the demo with the live API',
      body: es
        ? 'La clave se queda en el servidor local (server/index.mjs): el navegador nunca la ve. Sin clave, la demo funciona igual y solo el Caso 0 y la pestaña «En vivo» quedan desactivados. Necesitas Node.js 22 o superior.'
        : 'The key stays on the local server (server/index.mjs): the browser never sees it. Without a key the demo works the same, and only Case 0 and the “Live” tab are disabled. You need Node.js 22 or later.',
      code: RUN_DEMO,
      lang: 'bash',
      extra: { code: RUN_DEV, lang: 'bash', title: es ? 'Modo desarrollo' : 'Development mode' },
    },
    {
      title: es ? 'Activa el Caso 0: preguntas libres en tiempo real' : 'Enable Case 0: free-form questions in real time',
      body: es
        ? 'El Caso 0 deja escribir cualquier pregunta. Un modelo de Foundry planifica las búsquedas, Web IQ consulta web, noticias, imágenes y vídeos en paralelo y la respuesta llega en streaming con citas numeradas. Sin LLM_ENDPOINT, el Caso 0 muestra igualmente los resultados de Web IQ, pero sin respuesta redactada. Si publicas la demo, define LIVE_ACCESS_CODE: cada pregunta consume llamadas reales.'
        : 'Case 0 lets you type any question. A Foundry model plans the searches, Web IQ queries web, news, images and videos in parallel, and the answer streams in with numbered citations. Without LLM_ENDPOINT, Case 0 still shows the Web IQ results but no written answer. If you publish the demo, set LIVE_ACCESS_CODE: every question uses real calls.',
      code: RUN_CASE0,
      lang: 'bash',
      file: '.env',
    },
    {
      title: es ? 'Úsalo desde agentes con MCP' : 'Use it from agents over MCP',
      body: es
        ? 'El mismo servidor MCP sirve para VS Code, GitHub Copilot CLI, Foundry y cualquier cliente MCP. Herramientas: web, news, images, videos y browse (según los servicios habilitados en tu cuenta). En Copilot CLI va en ~/.copilot/mcp-config.json (Windows: %USERPROFILE%\\.copilot\\mcp-config.json).'
        : 'The same MCP server works with VS Code, GitHub Copilot CLI, Foundry and any MCP client. Tools: web, news, images, videos and browse (depending on the services enabled for your account). In Copilot CLI it goes in ~/.copilot/mcp-config.json (Windows: %USERPROFILE%\\.copilot\\mcp-config.json).',
      code: MCP_CLI,
      lang: 'json',
    },
    {
      title: es ? 'O desde tu código con los SDK' : 'Or from your code with the SDKs',
      body: es
        ? 'SDK oficiales con licencia MIT para Python y TypeScript, con reintentos incluidos. La pestaña «API» de cada caso muestra la llamada exacta en curl, Python y TypeScript.'
        : 'Official MIT-licensed SDKs for Python and TypeScript, with built-in retries. Each case’s “API” tab shows the exact call in curl, Python and TypeScript.',
      code: SDKS,
      lang: 'bash',
    },
  ];

  const params: [string, string, string][] = [
    ['scenario', es ? '0–5 o id del caso' : '0–5 or case id', es ? 'Abre un caso (0 = en vivo)' : 'Opens a case (0 = live)'],
    ['variant', 'webiq · bing', es ? 'Con Web IQ o con Grounding with Bing' : 'With Web IQ or with Grounding with Bing'],
    ['tab', 'evidence · compare · cost · api · live', es ? 'Pestaña inicial del panel inferior' : 'Initial tab of the bottom panel'],
    ['t', es ? 'ms o end' : 'ms or end', es ? 'Empieza en ese momento (end = resultado final)' : 'Starts at that moment (end = final result)'],
    ['lang', 'es · en', es ? 'Idioma' : 'Language'],
    ['client', 'energy · hospitality · travel · insurance · public-sector · custom · none', es ? 'Perfil sectorial (colores y recomendación)' : 'Sector profile (colours and recommendation)'],
    ['theme', 'light · soft · dark', es ? 'Tema base' : 'Base theme'],
    ['view', 'live · why · guide', es ? 'Abre el Caso 0, «Por qué Web IQ» o esta guía' : 'Opens Case 0, “Why Web IQ” or this guide'],
    ['settings', 'open', es ? 'Abre los ajustes' : 'Opens settings'],
  ];

  const keys: [string, string][] = [
    [es ? 'Espacio' : 'Space', es ? 'Ejecutar o pausar' : 'Run or pause'],
    ['R', es ? 'Reiniciar' : 'Restart'],
    ['→', es ? 'Saltar al resultado' : 'Skip to the result'],
    ['V', es ? 'Cambiar entre Web IQ y Grounding with Bing' : 'Switch between Web IQ and Grounding with Bing'],
    ['0', es ? 'Caso 0 · en vivo' : 'Case 0 · live'],
    ['1–6', es ? 'Ir a un caso' : 'Go to a case'],
    ['L', es ? 'Cambiar idioma' : 'Switch language'],
    ['S', es ? 'Abrir ajustes' : 'Open settings'],
  ];

  return (
    <article className="doc-view guide">
      <header className="doc-head">
        <h1>{es ? 'Cómo probar Web IQ y presentar la demo' : 'How to try Web IQ and present the demo'}</h1>
        <p className="lede">
          {es
            ? 'Los casos 1 a 5 son reproducciones guionizadas con datos ficticios, para que la demo funcione siempre y sin coste. El Caso 6 reproduce un agente de Foundry con contratos sintéticos (Foundry IQ) y noticias reales (Web IQ), y su pestaña «Agente de Foundry» lanza ese agente en vivo. El Caso 0 y la pestaña «En vivo» llaman a la API real de Web IQ con tu clave a través de un pequeño servidor.'
            : 'Cases 1 to 5 are scripted replays with fictitious data, so the demo always works at no cost. Case 6 replays a Foundry agent over synthetic contracts (Foundry IQ) and real news (Web IQ), and its “Foundry agent” tab runs that agent live. Case 0 and the “Live” tab call the real Web IQ API with your key through a small server.'}
        </p>
      </header>

      <ol className="guide-steps">
        {steps.map((s, i) => (
          <li key={i}>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
            <CodeBlock code={s.code} lang={s.lang} title={s.file ?? (s.lang === 'json' ? 'mcp-config.json' : 'shell')} />
            {s.extra && <CodeBlock code={s.extra.code} lang={s.extra.lang} title={s.extra.title} />}
            {i === 1 && (
              <p>
                <a href="https://webiq.microsoft.ai/profiles" target="_blank" rel="noopener noreferrer">
                  {es ? 'Portal de Web IQ: claves de API' : 'Web IQ portal: API keys'}
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </p>
            )}
          </li>
        ))}
      </ol>

      <section aria-labelledby="guide-present">
        <h2 id="guide-present">{es ? 'Presentar la demo' : 'Presenting the demo'}</h2>
        <p>
          {es
            ? 'Selecciona un perfil sectorial en Ajustes y comparte enlaces que abren el caso exacto. Los perfiles incluidos son genéricos y no representan a clientes. Ejemplo:'
            : 'Select a sector profile in Settings and share links that open the exact case. Included profiles are generic and do not represent customers. Example:'}{' '}
          <code>?scenario=2&amp;variant=bing&amp;tab=cost&amp;lang=en&amp;client=hospitality</code>
        </p>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">{es ? 'Parámetro' : 'Parameter'}</th>
                <th scope="col">{es ? 'Valores' : 'Values'}</th>
                <th scope="col">{es ? 'Efecto' : 'Effect'}</th>
              </tr>
            </thead>
            <tbody>
              {params.map(([p, v, d]) => (
                <tr key={p}>
                  <th scope="row">
                    <code>{p}</code>
                  </th>
                  <td>
                    <code>{v}</code>
                  </td>
                  <td>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>{es ? 'Atajos de teclado' : 'Keyboard shortcuts'}</h3>
        <dl className="keys">
          {keys.map(([k, d]) => (
            <div key={k}>
              <dt>
                <kbd>{k}</kbd>
              </dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
