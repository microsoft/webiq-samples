# Microsoft Web IQ Demo

An interactive demo showcasing six business tasks that combine vertical search, recent evidence, and direct page reading. Each scenario replays a scripted run with fictional data and lets you compare the Web IQ workflow with a Grounding with Bing Search alternative. **Case 0 · Live** lets you enter any question and watch real Web IQ calls and a cited answer in real time. **Case 6** runs a real Microsoft Foundry agent that reviews synthetic telecom contracts with Foundry IQ and supplements them with a live reputational review using Web IQ. The demo includes a Spanish/English interface, generic sector profiles, themes, and optional local branding. It is intended for developers exploring Web IQ integrations and presenters explaining the workflows, not for production procurement or compliance decisions.

**Customer-neutral by default:** no customer names, logos, initials, or brand palettes are bundled. Sector profiles are generic. Real telecom providers in Case 6 are subjects of public-source research, not identified as customers or partners; all example contracts are synthetic.

Adapted from the MIT-licensed [WebIQ-Demo](https://github.com/jrubiosainz/WebIQ-Demo). The original license is preserved in [`LICENSE`](LICENSE) and attribution in [`NOTICE`](NOTICE). Dependency, source, trademark, and third-party content notices are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Repository-wide contribution and security policies apply.

## Use cases

| Case | Example sector | What it demonstrates |
|---|---|---|
| **0 · Live** | Any | Ask your own question using real data: Web IQ searches the web, news, images, and videos in parallel, then streams a cited answer with each fact linked to its source. |
| Regulatory monitoring | Insurance / public sector | Search official domains, cross-check news in multiple languages, and read the complete guidance to extract obligations and dates. |
| Competitor pricing | Energy / retail | Compare prices by querying current pages directly instead of relying only on an indexed copy. |
| Reputation crisis | Consumer / travel | Cross-check news, web, and video across markets, with dates and signals to guide a response. |
| Third-party due diligence | Procurement / risk | Bring official records, sanctions, news, and a supplier's website together in one view with traceable sources. |
| Traveler assistant | Travel / customer service | Combine structured time and weather data with local alerts, web pages, images, and relevant moments from video. |
| **6 · Supplier contracts** | Procurement / any business | A Foundry agent reads offers from Movistar Empresas, Vodafone Business, and Orange Empresas (Foundry IQ), then supplements the comparison with current price increases, complaints, outages, sanctions, and reviews (Web IQ). With 2024 data, generic grounding changes the decision. |

The demo does not claim that Grounding with Bing Search cannot support these workflows. It shows where a generic grounding call may require additional searches, external services, or custom code to handle page reading, video, images, and structured data.

## Requirements and running the demo

- Node.js 22.12 or later (22 LTS or a newer supported LTS release).
- No key is required to explore the scripted scenarios.
- Live search requires Web IQ access and authorization for the selected endpoints; see the [public Web IQ documentation](https://learn.microsoft.com/en-us/web-iq/).
- Generated answers require an OpenAI v1-compatible model deployment. Foundry agent mode additionally requires a Foundry project and Azure AI Search knowledge base. Azure CLI authentication is needed for local Entra access and provisioning; see [sign in with Azure CLI](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-interactively).

```bash
cd samples/typescript/enterprise-demo
npm ci
npm run dev
```

Run all remaining commands from this sample directory.

Open `http://localhost:5173`. The scripted scenarios, comparisons, illustrative cost estimate, and API examples work without calling external services.

### Case 0 · Live

Case 0 is a live playground that uses real data. Enter a question or select one of the ten examples (sports, technology, and other topics designed to return videos, images, news, and web pages):

1. A model (`gpt-5.4-mini` in Microsoft Foundry) turns the question into a vertical search plan and selects the language, market, and, when relevant, freshness.
2. The server calls `/search/web`, `/search/news`, `/search/images`, and `/search/videos` in parallel. Each call appears in the timeline with its status, latency, and result count.
3. The model streams an answer using only those sources. Each fact includes a `[n]` citation that highlights the corresponding card. Cited sources, videos (with duration and key moments), images, and run metrics appear below.

You can disable search verticals using the chips in the prompt box. Web IQ calls and model tokens may incur charges under your contract and current rates. Without a configured model, Case 0 searches the question as entered and displays the results without a generated answer.

**Protection:** The key never reaches the browser. In production, the server refuses to start with Web IQ credentials unless `LIVE_ACCESS_CODE` is set. The site requires this code before running queries and blocks repeated failed attempts. Live queries have per-IP, daily, and concurrency limits (`LIVE_*`); the individual-call proxy has its own limits shared across all endpoints (`WEBIQ_PROXY_*`, defaulting to 8 requests per minute, 200 per day, and 8 concurrent requests). These counters are stored in memory and reset when the process restarts. For a high-traffic public instance or one with multiple replicas, add centralized rate limits and budgets. Source snippets are limited to 200 characters, and nothing is stored.

### Run live mode locally

The local server acts as a proxy: the key stays on the server and is never sent to the browser. Copy `.env.example` to `.env` and add a key authorized for Web IQ:

```bash
cp .env.example .env
# Edit .env and set WEBIQ_API_KEY (and LLM_ENDPOINT if you want generated answers)
```

For the model, `LLM_ENDPOINT` points to an OpenAI v1-compatible endpoint (for example, `https://<resource>.cognitiveservices.azure.com/openai/v1`). Without `LLM_API_KEY`, the server requests an Entra token using your Azure CLI session locally, or the App Service managed identity; the identity needs the **Cognitive Services OpenAI User** role on the resource.

Start the proxy in another terminal while Vite is running:

```bash
npm run live
```

The proxy listens on `127.0.0.1:8787` by default; Vite forwards `/api` to that server. The **Live** tab indicates whether it is available. `npm run start` builds and serves both the demo and proxy from a single process. To avoid exposing the key, do not publish `.env`, enter the key in the browser, or configure the proxy to listen on a shared network without first reviewing access controls.

### Case 6 · Live Foundry agent

Case 6 has two parts: the usual scripted comparison (Web IQ versus Grounding with Bing) and the **Foundry agent** tab, which runs the `revisor-contratos-telco` agent and streams each tool call, its queries and sources, and the answer with citations linked to web pages or case-file documents.

| Component | Value |
|---|---|
| Foundry project | The Foundry project configured for the demo |
| Agent | `revisor-contratos-telco` (prompt agent, `gpt-5.4-mini`) |
| Foundry IQ | Knowledge base `kb-contratos-telco` and MCP connection `kb-contratos-telco-mcp` in your Azure AI Search resource |
| Web IQ | MCP connection `webiq-mcp` (`news` and `web`, `es-ES`, `contentFormat: "passage"`) |
| Synthetic documents | `public/foundry/contratos-telco/` (context, three offers, current comparison, and incident history), published at `/foundry/contratos-telco/` |

Reference prompt (preloaded in the tab; shown in English when the interface is in English):

> Review the Movistar Empresas, Vodafone Business, and Orange Empresas offers in case file COMPRAS-TEL-2026-031 and supplement our current comparison with an up-to-date reputational review of each provider: price increases and CPI, customer complaints and satisfaction, service outages, sanctions, and user reviews. Provide a weighted decision matrix out of 100, with sources, and your recommendation for the committee meeting on December 10.

The scripts are idempotent and can recreate the resources. Before running them, explicitly set `AZURE_SUBSCRIPTION_ID`, `FOUNDRY_RESOURCE_GROUP`, `FOUNDRY_ACCOUNT`, `FOUNDRY_PROJECT`, `FOUNDRY_PROJECT_ENDPOINT`, `FOUNDRY_PROJECT_MI_OBJECT_ID`, `SEARCH_RESOURCE_GROUP`, `SEARCH_SERVICE`, and `DOCS_PUBLIC_BASE` in your environment or `.env`. Provisioning has no defaults that could write to someone else's subscription. The scripts use your Azure CLI session; the Web IQ key is read from `.env` and never printed:

```bash
node foundry/provision-foundry-iq.mjs     # index, knowledge source, and knowledge base
node foundry/provision-agent.mjs          # MCP connections and a new agent version
node foundry/run-agent.mjs                # test the reference prompt using the Responses API
```

To enable the tab, set `FOUNDRY_PROJECT_ENDPOINT` and `FOUNDRY_AGENT` (see `.env.example`). The server calls `POST {project}/openai/v1/responses` with `agent_reference` and relays the stream as NDJSON. It uses your Azure CLI session locally or the App Service managed identity, which needs the **Foundry User** role (formerly **Azure AI User**) on the Foundry resource. The tab shares the Case 0 access code and has its own limits: `FOUNDRY_PER_MINUTE` (2 per IP), `FOUNDRY_DAILY_LIMIT` (60), and `FOUNDRY_MAX_CONCURRENT` (2). If an MCP tool fails before the agent starts writing, the server retries once. Each run takes about 20 seconds and makes 5–8 tool calls; model usage and cost depend on the response.

The demo's Web IQ key only authorizes `contentFormat: "passage"`. With `text` or `markdown`, the MCP returns `403 auth_content_format_forbidden`, so the agent instructions specify `passage`.

## Azure configuration and deployment

The scripted scenarios work without credentials. To enable live queries, deploy the server in an environment you control and configure credentials **on the server only**—never in Vite, the browser, or version-controlled files. You can use an Azure Web App on Linux with Node.js 22 LTS. The free plan may have quotas, cold starts, and limited availability, and does not provide an SLA.

To provision new infrastructure, review the `what-if` first. Resource names and the subscription are required; the Bicep template no longer includes account-specific values:

```bash
az deployment sub what-if \
  --subscription "$AZURE_SUBSCRIPTION_ID" \
  --name webiq-demo --location spaincentral \
  --template-file infra/main.bicep \
  --parameters \
    resourceGroupName="<resource-group>" \
    appServiceName="<globally-unique-name>" \
    appServicePlanName="$AZ_APP_SERVICE_PLAN" \
    deployedBy="$(az ad signed-in-user show --query displayName -o tsv)"
```

After reviewing the output, create the resources with the same parameters by replacing `what-if` with `create`. Before adding `WEBIQ_API_KEY`, create and configure a long, random `LIVE_ACCESS_CODE` through the Azure portal or Azure Key Vault. The app refuses to start in production if Web IQ credentials are present but the access code is missing. Also configure `LLM_ENDPOINT` (if using the model), `FOUNDRY_PROJECT_ENDPOINT` and `FOUNDRY_AGENT` (if using Case 6), `TRUST_PROXY=1`, and your spending limits. The managed identity needs the **Cognitive Services OpenAI User** role on the model resource and the **Foundry User** role on the Foundry resource. For the knowledge base, configure the Azure AI Search identities and permissions as described in its documentation.

Do not retrieve or publish the access code for an installation you do not own. Do not add real keys or codes to `.env.example`, Bicep parameters, or the command line. `.env` is excluded from Git; use a secret store for deployments.

#### Set up the Web IQ key

Azure does not expose the Web IQ key through an API. Create it at <https://webiq.microsoft.ai/profiles> and run:

```bash
npm run set-key            # securely prompts for the key, validates it, saves it to .env, and uploads it
npm run set-key -- --local # saves it to .env only
```

The script runs a test search (charges may apply at current rates), saves `.env` with `600` permissions, and passes the key to `az webapp config appsettings set` through a temporary file so it does not appear on screen, in shell history, or on the command line. To upload it to Azure, you must explicitly set `AZURE_SUBSCRIPTION_ID`, `AZ_RESOURCE_GROUP`, and `AZ_WEBAPP`; no default deployment target is configured. To avoid deploying to Azure, use `npm run set-key -- --local`. The key can also be supplied through stdin (`pbpaste | npm run set-key -- --local`).

Locally, `npm run live` reads `.env` on startup. Restart it after changing the key, or use `node --watch-path=./.env server/index.mjs` to restart it automatically.

`/api/status` will report `hasKey: true`. Keyless alternative: link your web app's managed identity in the Web IQ portal and set `WEBIQ_AUTH=entra` (and `WEBIQ_APPID` if the profile has multiple applications). Configure the identity's access in the Web IQ portal and Azure according to your policies.

### Update the deployed app

Build locally and upload only the static files and server. Do not upload `.env`, `node_modules`, source files, or internal files:

```bash
npm ci
npm test
npm run build
mkdir -p .copilot-azure
ZIP=".copilot-azure/webiq-app-$(date -u +%Y%m%dT%H%M%SZ).zip"
zip -q -r "$ZIP" dist server/index.mjs server/auth.mjs server/live.mjs server/foundry.mjs

az webapp deploy \
  --subscription "$AZURE_SUBSCRIPTION_ID" \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_WEBAPP" \
  --src-path "$ZIP" --type zip

DEMO_URL="${AZ_WEBAPP_URL:-https://${AZ_WEBAPP}.azurewebsites.net}"
curl --fail "${DEMO_URL}/api/status"
```

The expected response depends on the configured features: `hasKey`, `llm`, and `foundry` indicate whether their services are available; `needsCode` should be `true` for a protected instance. Deployment uses your Azure CLI (Entra) session and does not enable basic SCM/FTP credentials.

### Reproducible infrastructure

[`infra/main.bicep`](infra/main.bicep) creates the resource group, and [`infra/app.bicep`](infra/app.bicep) defines the plan and app. The template uses the hostname assigned by Azure to configure `WEBIQ_ALLOWED_HOSTS`, listens on `0.0.0.0:8080`, and starts with `node server/index.mjs`. Oryx is disabled because the package is already built and the server only uses native Node modules.

```bash
az deployment sub what-if \
  --subscription "$AZURE_SUBSCRIPTION_ID" \
  --name webiq-demo --location spaincentral \
  --template-file infra/main.bicep \
  --parameters \
    resourceGroupName="$AZ_RESOURCE_GROUP" \
    appServiceName="$AZ_WEBAPP" \
    appServicePlanName="$AZ_APP_SERVICE_PLAN" \
    deployedBy="$(az ad signed-in-user show --query displayName -o tsv)"

# After reviewing the changes, repeat the command with create instead of what-if.
# Then deploy the ZIP using the previous section.
```

The template enables the managed identity, proxy limits, and `TRUST_PROXY`. The app settings resource **replaces all values**: when provisioning again, also configure any required secrets and endpoints or they will be removed. The model role is assigned separately.

## Language and customization

- Switch between **ES** and **EN** in the header; the selection is saved in the browser.
- Under **Settings → Profile**, choose Energy, Hospitality, Travel, Insurance, Public sector, or Custom. You can apply a generic palette, hide other profiles, and highlight recommended scenarios. The default is **Neutral (no profile)**.
- Under **Settings → Appearance**, choose one of four themes or customize the background, panel, header, and accent colors. You can also change fonts, sizing, and corner radii.
- Under **Settings → Logos**, optionally upload an authorized SVG, PNG, or WebP file for your own presentation; it is stored only in the browser's local storage. No organization logos are shipped. Local logo files are excluded from Git; see [`public/logos/README.md`](public/logos/README.md). Do not publish private branding or exported settings.
- Most options are saved in the browser's `localStorage`. They are not sent to the server.

## Deep links and walkthroughs

The demo supports deep links to prepare a presentation, for example:

```text
?scenario=3&variant=bing&lang=en
?scenario=regulatory-watch&t=end&client=hospitality&theme=dark
?view=why
?view=guide&settings=open
?scenario=0&lang=en
?scenario=6&t=end&tab=foundry
```

`scenario` accepts a case number (0–6) or its identifier (`0` or `view=live` opens Case 0); `variant` can be `webiq` or `bing`; `t=end` jumps to the result; `tab` opens a lower-panel tab (for example, `foundry`). Unknown parameters are ignored.

`client` selects a generic profile: `energy`, `hospitality`, `travel`, `insurance`, `public-sector`, `custom`, or `none`. Old organization-specific profile IDs are no longer recognized; names and logos stored under those IDs are discarded when settings are loaded. Your own custom overrides remain local. Use **Settings → Demo → Reset** or clear this site's storage for a fresh, neutral presentation.

## Data, API, and pricing

- Sources, queries, latencies, and responses in the scripted scenarios are **fictional** and only illustrate the workflow; they are not real results or regulatory, financial, or travel advice. They are labeled in the UI.
- Demo responses show snippets limited to 200 characters per source. Follow the current Web IQ terms when reusing results.
- The API examples are instructional. Case 0 sends real requests to Web IQ (and the configured model) when valid credentials are available; its results reflect real web data at that time.
- Offers, contracts, amounts, and incidents in Case 6 are **synthetic** (Logística Meridiana is fictional) and do not reflect real offers from Movistar, Vodafone, or Orange. The reputational review in the **Foundry agent** tab uses real news and web pages; responses vary between runs and are not purchasing advice.
- The cost table is only a simulation using reference prices retrieved on **October 28, 2026**. The comparison method and volumes are editable assumptions, not a quote. Check current prices, availability, and terms before deploying or making a proposal.
- Microsoft, Web IQ, Foundry, Grounding with Bing Search, and the mentioned provider names are trademarks or services of their respective owners. The demo is not sponsored or endorsed by those providers, does not imply a commercial relationship, and does not recommend any real product.

## Telemetry and data handling

The sample adds no analytics SDK or telemetry collector and sends no telemetry
to repository maintainers; there is no sample telemetry to opt out of. Scripted
playback does not call Web IQ or a model. Live mode sends prompts, search queries,
and retrieved evidence to your configured Web IQ and model/Foundry services.
Use synthetic or public inputs only. Service-side data handling is separate:
see the [Web IQ privacy guidance](https://learn.microsoft.com/en-us/web-iq/resources/faq#privacy-and-data-handling)
and the terms for your configured model and Azure services.

The server does not persist live results. It writes request counts, timing,
startup configuration (including resource hostnames), and error diagnostics to
stdout/stderr. Foundry error messages can include upstream details. The optional
`foundry/run-agent.mjs` CLI prints queries, tool arguments, and the answer;
`--raw` prints additional event data. Do not share raw logs or capture them in
public artifacts. Hosting-platform log collection and retention are controlled
by the operator, not this sample.

UI preferences, user-supplied branding, and the live access code are stored in
browser `localStorage`. Clear site storage to remove
them. Do not distribute exported settings containing private branding. Opening
source links or displaying live media contacts those third-party sites.

## Development and checks

```bash
npm test
npm run build
```

CI runs tests for data, logic, the proxy, and the Case 0 engine (planning, parallel calls, NDJSON streaming, access code, and limits), as well as the Case 6 agent route (Foundry SSE events, retry behavior, language, and citations) using mocked services. No key is required, and the tests do not call the real API.

The path-scoped **Enterprise demo** workflow runs `npm ci`, `npm test`, and
`npm run build` on Node.js 22 for changes to this sample. For a manual UI check,
start the demo with a fresh browser profile: confirm the neutral header, open
**Settings → Profile**, select a generic sector, switch ES/EN, and replay a
scenario. No customer names or logos should appear unless you explicitly add
your own local branding. Live-service and Azure deployment checks are opt-in
and may incur costs; automated tests do not exercise them.

## Contributing and security

Contributions should include tests for new or fixed functionality and follow the [repository contribution guidelines](../../../CONTRIBUTING.md). Do not upload `.env`, API keys, access codes, Azure credentials, or local settings. Report vulnerabilities according to the [repository security policy](../../../SECURITY.md); do not publish exploitable details in a public issue. See [`NOTICE`](NOTICE), [`LICENSE`](LICENSE), and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for attribution and licensing.
