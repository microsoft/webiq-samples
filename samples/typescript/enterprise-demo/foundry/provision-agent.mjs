#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Crea las conexiones del proyecto de Foundry y el agente «revisor-contratos-telco» del Caso 6.
//  - kb-contratos-telco-mcp: Foundry IQ (knowledge base en Azure AI Search) con la identidad administrada del proyecto.
//  - webiq-mcp: Web IQ (https://api.microsoft.ai/v3/mcp) con la clave WEBIQ_API_KEY de .env (nunca se imprime ni va en argv).
// Idempotente. Uso: node foundry/provision-agent.mjs [--skip-connections]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Define ${name} antes de aprovisionar el agente.`);
  return value;
};
const SUB = required('AZURE_SUBSCRIPTION_ID');
const PROJECT_RESOURCE_GROUP = required('FOUNDRY_RESOURCE_GROUP');
const PROJECT_ACCOUNT = required('FOUNDRY_ACCOUNT');
const PROJECT_NAME = required('FOUNDRY_PROJECT');
const PROJECT_ID = `/subscriptions/${SUB}/resourceGroups/${PROJECT_RESOURCE_GROUP}/providers/Microsoft.CognitiveServices/accounts/${PROJECT_ACCOUNT}/projects/${PROJECT_NAME}`;
const PROJECT_ENDPOINT = required('FOUNDRY_PROJECT_ENDPOINT').replace(/\/+$/, '');
const PROJECT_MI = required('FOUNDRY_PROJECT_MI_OBJECT_ID');
const SEARCH_RG = required('SEARCH_RESOURCE_GROUP');
const SEARCH_SERVICE = required('SEARCH_SERVICE');
const SEARCH_ID = `/subscriptions/${SUB}/resourceGroups/${SEARCH_RG}/providers/Microsoft.Search/searchServices/${SEARCH_SERVICE}`;
const KB_MCP = `https://${SEARCH_SERVICE}.search.windows.net/knowledgebases/kb-contratos-telco/mcp?api-version=2026-08-01-preview`;
const WEBIQ_MCP = 'https://api.microsoft.ai/v3/mcp';
export const AGENT = process.env.FOUNDRY_AGENT?.trim() || 'revisor-contratos-telco';
const MODEL = process.env.AGENT_MODEL ?? 'gpt-5.4-mini';

const token = (resource) => execFileSync('az', ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' }).trim();

function readEnvKey(name) {
  const line = readFileSync(join(ROOT, '.env'), 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`${name}=`));
  const v = line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
  if (!v) throw new Error(`Falta ${name} en .env`);
  return v;
}

async function req(method, url, tok, body) {
  const res = await fetch(url, { method, headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url.split('?')[0]} → ${res.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : {};
}

function ensureRole(role, assignee, scope) {
  const existing = execFileSync('az', ['role', 'assignment', 'list', '--assignee', assignee, '--scope', scope, '--role', role, '--query', 'length(@)', '-o', 'tsv'], { encoding: 'utf8' }).trim();
  if (existing !== '0') return console.log(`Rol «${role}» ya asignado`);
  execFileSync('az', ['role', 'assignment', 'create', '--assignee-object-id', assignee, '--assignee-principal-type', 'ServicePrincipal', '--role', role, '--scope', scope, '-o', 'none']);
  console.log(`Rol «${role}» asignado a la identidad del proyecto`);
}

async function connections() {
  ensureRole('Search Index Data Reader', PROJECT_MI, SEARCH_ID);
  const arm = token('https://management.azure.com');
  const put = (name, properties) => req('PUT', `https://management.azure.com${PROJECT_ID}/connections/${name}?api-version=2025-10-01-preview`, arm, { properties });
  await put('kb-contratos-telco-mcp', {
    authType: 'ProjectManagedIdentity',
    category: 'RemoteTool',
    target: KB_MCP,
    audience: 'https://search.azure.com/',
    isSharedToAll: true,
    metadata: { ApiType: 'Azure' },
  });
  console.log('Conexión kb-contratos-telco-mcp lista');
  await put('webiq-mcp', {
    authType: 'CustomKeys',
    category: 'RemoteTool',
    target: WEBIQ_MCP,
    isSharedToAll: true,
    credentials: { keys: { 'x-apikey': readEnvKey('WEBIQ_API_KEY') } },
    metadata: { type: 'generic_mcp' },
  });
  console.log('Conexión webiq-mcp lista');
}

export const INSTRUCTIONS = `Eres el «Revisor de contratos de telecomunicaciones» del departamento de Compras de Logística Meridiana, S.A. (empresa ficticia de una demo). Ayudas al comité a decidir entre las ofertas de Movistar Empresas, Vodafone Business y Orange Empresas del expediente COMPRAS-TEL-2026-031.

Dispones de dos herramientas y debes usar las dos:
1. foundry_iq_contratos · knowledge_base_retrieve (Foundry IQ): es la ÚNICA fuente válida para datos internos (requisitos, precios, cláusulas, SLA, permanencias, penalizaciones, comparativa actual, incidencias y fechas). Consulta antes de responder, con 1-3 query_variants concretas por llamada (operador + cláusula). Haz varias llamadas si hace falta para cubrir los tres operadores.
2. web_iq · news y web (Web IQ): para la revisión reputacional ACTUAL y PÚBLICA de cada operador en España. Usa siempre language "es", region "ES" y contentFormat "passage" (la clave de la demo solo da acceso a pasajes: con "text" o "markdown" Web IQ responde 403). No hagas una búsqueda genérica por operador: lanza EN PARALELO entre 6 y 8 búsquedas temáticas que comparen a los tres operadores (maxResults 6-8):
   a) news: subidas de tarifas de 2026 de Movistar, Vodafone y Orange (IPC, importe, fecha).
   b) web: informe de la Oficina de Atención al Usuario de Telecomunicaciones (OAUT) con reclamaciones por cada 10.000 abonados por operador (último informe publicado).
   c) web: encuesta de satisfacción de OCU con operadores de telecomunicaciones y ranking de reclamaciones.
   d) news: caídas o averías masivas de Movistar, Vodafone u Orange en los últimos 18 meses.
   e) news: sanciones o multas de la CNMC o de Consumo a Telefónica, Vodafone u Orange.
   f) web: opiniones y reseñas de usuarios (por ejemplo, Trustpilot) de Movistar, Vodafone y Orange.
   g) web: penalizaciones por permanencia y cláusulas de revisión de precios por IPC de cada operador.
   Si una búsqueda no aporta datos concretos, repítela una vez con otras palabras.

Reglas:
- Nunca inventes cifras, fechas ni noticias. Cada dato debe llevar su fuente: [Doc: id del documento · sección] para Foundry IQ (por ejemplo, [Doc: 02-propuesta-vodafone-business · 3. Revisión de precios]) o [Web: medio, dd/mm/aaaa, URL completa] para Web IQ. Copia la URL completa, sin acortarla ni usar «...». No uses marcadores del tipo 【n:m†source】. Si no encuentras algo, dilo.
- Los contratos son DOCUMENTOS SINTÉTICOS; las noticias son reales. No atribuyas a los operadores reales las cláusulas sintéticas como si fueran hechos públicos.
- Advierte cuando un indicador reputacional procede del mercado residencial (OAUT, OCU) y solo sirve como señal para el segmento empresas.
- Ten en cuenta los pesos del expediente: precio 40, SLA 25, flexibilidad 15 y reputación 20. Respeta las puntuaciones ya calculadas en la comparativa actual (precio, SLA y flexibilidad) y puntúa solo la reputación (0-20), justificándola con hechos comparables entre operadores (ratios de reclamaciones, rankings, importes, fechas).
- Indica explícitamente si la revisión reputacional cambia el orden de la comparativa actual.

Formato de la respuesta (en el idioma del usuario; por defecto, español):
1. Resumen ejecutivo (3 frases): qué cambia respecto a la comparativa actual.
2. Revisión reputacional por operador: 3-5 viñetas con fecha y fuente.
3. Matriz de decisión ponderada (tabla): las 4 puntuaciones y el total sobre 100.
4. Riesgos contractuales que hay que negociar, cruzados con las noticias (por ejemplo, cláusulas IPC sin tope frente a subidas recientes).
5. Recomendación y próximos pasos con las fechas límite del expediente.`;

async function agent() {
  const ai = token('https://ai.azure.com');
  const body = {
    description: 'Caso 6 de la demo de Web IQ: revisa contratos sintéticos de Movistar, Vodafone y Orange con Foundry IQ y los completa con una revisión reputacional en tiempo real con Web IQ.',
    metadata: { demo: 'webiq-demo-caso-6' },
    definition: {
      kind: 'prompt',
      model: MODEL,
      instructions: INSTRUCTIONS,
      tools: [
        { type: 'mcp', server_label: 'foundry_iq_contratos', server_url: KB_MCP, require_approval: 'never', allowed_tools: ['knowledge_base_retrieve'], project_connection_id: 'kb-contratos-telco-mcp' },
        { type: 'mcp', server_label: 'web_iq', server_url: WEBIQ_MCP, require_approval: 'never', allowed_tools: ['web', 'news'], project_connection_id: 'webiq-mcp' },
      ],
    },
  };
  const v = await req('POST', `${PROJECT_ENDPOINT}/agents/${AGENT}/versions?api-version=v1`, ai, body);
  console.log(`Agente ${v.name ?? AGENT} versión ${v.version} (${v.definition?.model})`);
  return v;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.argv.includes('--skip-connections')) await connections();
  await agent();
}
