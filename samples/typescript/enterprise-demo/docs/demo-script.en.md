# Demo script — English

**Suggested duration:** 6–9 minutes. This is a scripted replay: queries, sources, results and latency figures are fictional. Say so before presenting the screen.

## Opening

> “Web IQ is more than search for a chatbot. It combines web, news, video and image search, page reading, and structured answers. We’ll look at six business tasks that often take several queries, tools, or custom integration code today.”

Select a generic sector profile that fits the audience, or leave **Neutral** selected. In **Settings**, switch language, apply a palette, or edit colours. No customer names or logos are bundled; any authorized branding you add is for your own presentation and must not enter the public sample.

## Case 0 · Live (optional, 2–3 minutes)

Use it to open or close with real data, or when the customer asks “does this actually work?”. Enter the access code beforehand so you don’t type it in front of the audience.

1. Click an example: **Latest Clásico**, **Formula 1** or **NBA plays** (sports), **Microsoft AI news**, **iPhone vs Galaxy** or **SpaceX Starship** (tech), **Releases and trailers**, **Valencian paella**, **Lisbon in 2 days** or **Alzheimer’s research** (everything else). You can also take a question from the audience.
2. While it runs, point to the right-hand panel: the search plan (language, market and freshness chosen by the model) and the four parallel calls with their latency.
3. When the answer appears, click a `[n]` citation to highlight its source. Scroll to the videos (key moments with timestamps), images and run metrics: total time, calls and cost.

> “This isn’t scripted: it’s the web right now. One request per vertical returns pages with snippet and date, news, images, and videos with their key moments. With generic grounding we would have to chain services to get the same.”

If a search comes back thin, say so: the model only answers from what it finds and flags when sources are insufficient.

## Six use cases

1. **Regulatory watch.** Let the Web IQ variant play. Point out the official-domain search, Spanish and English press, and full guide read. In the final table, open an obligation and follow its source.\
   **Key point:** move from finding headlines to connecting the official document with obligations, deadlines and traceable evidence.
2. **Competitor pricing.** Open the scenario and highlight that pricing is read from direct pages, not only from a search index. Compare values and dates.\
   **Key point:** pages change; direct reads and source trails reduce the effort of maintaining scrapers or manual checks.
3. **Reputation crisis.** Show searches across markets, then news, web and video results. If the replay includes video moments, show how they help locate the relevant evidence.\
   **Key point:** monitoring heterogeneous, multilingual signals takes more than one generic web search.
4. **Third-party due diligence.** Walk through official registers, sanctions, press, and the bidder’s own page. Use the comparison view to separate search coverage from page reading or additional sources.\
   **Key point:** risk teams can start from consolidated evidence while preserving where each signal came from.
5. **Traveller assistant.** Switch to this scenario and show structured time and weather alongside local news, images, video, and current notices.\
   **Key point:** a contextual answer can combine structured data with recent editorial and visual evidence.
6. **Supplier contracts with Foundry IQ and Web IQ.** Introduce the fictitious Logística Meridiana file: three synthetic offers from Movistar Empresas, Vodafone Business and Orange Empresas. In the Web IQ variant, point out that the agent first reads the contracts through Foundry IQ, then runs parallel news and web searches (price rises and CPI, complaints, outages, sanctions and reviews). Switch to **With Grounding with Bing**: with 2024 data, the recommendation flips to Orange.
   **Key point:** internal knowledge tells you what you signed; Web IQ adds what happened this week. Current reputation narrows the gap but does not change the leader.

## Case 6 live: Foundry agent (optional, 2 minutes)

Open the **Foundry agent** tab in Case 6. The left panel shows the agent, project, model, knowledge base and the synthetic documents (they can be opened). The reference prompt is pre-filled; click **Run the agent** (or Cmd/Ctrl+Enter).

1. While it runs, show each call: first **Foundry IQ · knowledge base** with the offer excerpts, then several parallel **Web IQ · news / web** calls, each with its queries, results and sources.
2. When it finishes (about 20 s), walk through the executive summary, the reputational review per operator, the weighted matrix out of 100, and the contract risks cross-checked against the news. Blue chips open the article; green chips open the case-file document.
3. If asked, click **Open in Foundry** to show the same agent in the portal.

> “This is a real Foundry agent with two MCP tools: Foundry IQ for our contracts and Web IQ for what the market is saying today. Every fact comes with its source, internal or external.”

The answer changes between runs because the web changes; don’t present it as a purchasing recommendation.

## Compare and close

For each scenario, switch between **With Web IQ** and **With Grounding with Bing**. Use **Comparison**, **Cost**, and **API** to show functional coverage, the illustrative cost assumption, and example requests/responses.

> “This comparison does not claim that Grounding with Bing Search cannot be extended. It shows where additional tools, chained calls, crawlers, or custom code may be needed. Web IQ offers specialised endpoints to build that workflow with fewer moving parts.”

The on-screen costs are illustrative, based on prices checked on 28 Oct 2026 and configurable volumes; they are not a quote. For a live trial, confirm current prices and terms, configure a server-side key, and use **Case 0 · Live** or the **Foundry agent** tab in Case 6. Never present scripted data as a customer result or as output from the live API.
