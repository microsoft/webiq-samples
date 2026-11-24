#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Crea en Azure AI Search la base de conocimiento de Foundry IQ con los contratos sintéticos del Caso 6:
// índice → knowledge source (searchIndex) → knowledge base (razonamiento «minimal», sin LLM).
// Idempotente. Uso: node foundry/provision-foundry-iq.mjs [--test-only]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));
const DOCS_DIR = join(ROOT, 'public/foundry/contratos-telco');
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Define ${name} antes de aprovisionar Foundry IQ.`);
  return value;
};

const PUBLIC_BASE = `${required('DOCS_PUBLIC_BASE').replace(/\/+$/, '')}/foundry/contratos-telco`;
const SUB = required('AZURE_SUBSCRIPTION_ID');
const RG = required('SEARCH_RESOURCE_GROUP');
const SERVICE = required('SEARCH_SERVICE');
const API = '2026-08-01-preview';
const INDEX = 'idx-contratos-telco';
const KS = 'ks-contratos-telco';
const KB = 'kb-contratos-telco';
const ENDPOINT = `https://${SERVICE}.search.windows.net`;

const OPERATORS = { '01': 'Movistar Empresas', '02': 'Vodafone Business', '03': 'Orange Empresas' };

const key = execFileSync('az', ['search', 'admin-key', 'show', '--subscription', SUB, '-g', RG, '--service-name', SERVICE, '--query', 'primaryKey', '-o', 'tsv'], { encoding: 'utf8' }).trim();

async function call(method, path, body) {
  const res = await fetch(`${ENDPOINT}/${path}${path.includes('?') ? '&' : '?'}api-version=${API}`, {
    method,
    headers: { 'api-key': key, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : {};
}

/** Un fragmento por sección «## »; el preámbulo (título, aviso y ficha) es el fragmento 0. */
export function chunk(file, md) {
  const docId = file.replace(/\.md$/, '');
  const title = md.match(/^# (.+)$/m)?.[1].trim() ?? docId;
  const operator = OPERATORS[file.slice(0, 2)] ?? 'Logística Meridiana (interno)';
  const parts = md.split(/^(?=## )/m);
  return parts.map((part, i) => {
    const section = i === 0 ? 'Ficha del documento' : part.match(/^## (.+)$/m)[1].trim();
    return {
      id: `${docId}-${String(i).padStart(2, '0')}`,
      doc_id: docId,
      title,
      operator,
      section,
      url: `${PUBLIC_BASE}/${file}`,
      content: `Documento: ${title} (DOCUMENTO SINTÉTICO, empresa ficticia)\nSección: ${section}\n\n${part.trim()}`,
    };
  });
}

const indexDef = {
  name: INDEX,
  fields: [
    { name: 'id', type: 'Edm.String', key: true, filterable: true },
    { name: 'doc_id', type: 'Edm.String', filterable: true, facetable: true },
    { name: 'title', type: 'Edm.String', searchable: true, analyzer: 'es.microsoft' },
    { name: 'operator', type: 'Edm.String', searchable: true, filterable: true, facetable: true },
    { name: 'section', type: 'Edm.String', searchable: true, analyzer: 'es.microsoft' },
    { name: 'url', type: 'Edm.String', searchable: false },
    { name: 'content', type: 'Edm.String', searchable: true, analyzer: 'es.microsoft' },
  ],
  semantic: {
    defaultConfiguration: 'default',
    configurations: [
      {
        name: 'default',
        prioritizedFields: {
          titleField: { fieldName: 'title' },
          prioritizedContentFields: [{ fieldName: 'content' }],
          prioritizedKeywordsFields: [{ fieldName: 'operator' }, { fieldName: 'section' }],
        },
      },
    ],
  },
};

const ksDef = {
  name: KS,
  kind: 'searchIndex',
  description: 'Contratos y ofertas sintéticas de Movistar Empresas, Vodafone Business y Orange Empresas para Logística Meridiana (empresa ficticia), comparativa y requisitos del expediente.',
  searchIndexParameters: {
    searchIndexName: INDEX,
    semanticConfigurationName: 'default',
    sourceDataFields: [{ name: 'title' }, { name: 'operator' }, { name: 'section' }, { name: 'url' }],
  },
};

const kbDef = {
  name: KB,
  description: 'Expediente COMPRAS-TEL-2026-031 de Logística Meridiana (sintético): requisitos, ofertas de Movistar, Vodafone y Orange, comparativa actual e incidencias.',
  knowledgeSources: [{ name: KS }],
  outputMode: 'extractiveData',
  retrievalReasoningEffort: { kind: 'minimal' },
};

async function provision() {
  await call('PUT', `indexes/${INDEX}`, indexDef);
  const docs = readdirSync(DOCS_DIR)
    .filter((f) => /^\d\d-.+\.md$/.test(f))
    .sort()
    .flatMap((f) => chunk(f, readFileSync(join(DOCS_DIR, f), 'utf8')));
  const up = await call('POST', `indexes/${INDEX}/docs/index`, { value: docs.map((d) => ({ '@search.action': 'mergeOrUpload', ...d })) });
  const failed = up.value.filter((r) => !r.status);
  if (failed.length) throw new Error(`Fallaron ${failed.length} documentos`);
  console.log(`Índice ${INDEX}: ${docs.length} fragmentos de ${new Set(docs.map((d) => d.doc_id)).size} documentos`);
  await call('PUT', `knowledgesources/${KS}`, ksDef);
  console.log(`Knowledge source ${KS} listo`);
  await call('PUT', `knowledgebases/${KB}`, kbDef);
  console.log(`Knowledge base ${KB} lista`);
}

async function test() {
  await new Promise((r) => setTimeout(r, 2500));
  const r = await call('POST', `knowledgebases/${KB}/retrieve`, {
    intents: [{ type: 'semantic', search: 'cláusula de revisión de precios IPC sin tope Vodafone' }],
  });
  const refs = r.references ?? [];
  console.log(`retrieve: ${refs.length} referencias`);
  for (const ref of refs.slice(0, 3)) console.log(' -', ref.docKey ?? ref.id, ref.sourceData?.title ?? '', ref.sourceData?.section ?? '');
  const mcp = await fetch(`${ENDPOINT}/knowledgebases/${KB}/mcp?api-version=${API}`, {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  const body = await mcp.text();
  console.log(`MCP tools/list → ${mcp.status}: ${body.slice(0, 900)}`);
}

if (!process.argv.includes('--test-only')) await provision();
await test();
