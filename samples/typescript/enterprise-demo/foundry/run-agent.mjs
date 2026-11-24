#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Prueba el agente del Caso 6 con el prompt de referencia (Responses API en streaming) y resume las llamadas a herramientas.
// Uso: node foundry/run-agent.mjs ["prompt"] [--raw]
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));
const PROJECT_ENDPOINT = process.env.FOUNDRY_PROJECT_ENDPOINT?.trim().replace(/\/+$/, '');
const AGENT = process.env.FOUNDRY_AGENT?.trim() || 'revisor-contratos-telco';
export const REFERENCE_PROMPT =
  'Revisa las ofertas de Movistar Empresas, Vodafone Business y Orange Empresas del expediente COMPRAS-TEL-2026-031 y completa nuestra comparativa actual con una revisión reputacional actualizada de cada operador: subidas de tarifas e IPC, reclamaciones y satisfacción de clientes, caídas de servicio, sanciones y reseñas de usuarios. Dame la matriz de decisión ponderada sobre 100, con fuentes, y tu recomendación para el comité del 10 de diciembre.';

const prompt = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? REFERENCE_PROMPT;
const raw = process.argv.includes('--raw');
if (!PROJECT_ENDPOINT) throw new Error('Define FOUNDRY_PROJECT_ENDPOINT antes de invocar el agente.');
const tok = execFileSync('az', ['account', 'get-access-token', '--resource', 'https://ai.azure.com', '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' }).trim();

const t0 = Date.now();
const res = await fetch(`${PROJECT_ENDPOINT}/openai/v1/responses`, {
  method: 'POST',
  headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' },
  body: JSON.stringify({ agent_reference: { name: AGENT, type: 'agent_reference' }, input: prompt, stream: true }),
});
if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 800)}`);

const seen = new Map();
let text = '';
let buf = '';
const dec = new TextDecoder();
for await (const chunk of res.body) {
  buf += dec.decode(chunk, { stream: true });
  let i;
  while ((i = buf.indexOf('\n\n')) >= 0) {
    const block = buf.slice(0, i);
    buf = buf.slice(i + 2);
    const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
    if (!data || data === '[DONE]') continue;
    const ev = JSON.parse(data);
    seen.set(ev.type, (seen.get(ev.type) ?? 0) + 1);
    if (raw && !ev.type.endsWith('.delta')) console.log(JSON.stringify(ev).slice(0, 600));
    if (ev.type === 'response.output_text.delta') text += ev.delta;
    if (ev.type === 'response.output_item.done' && ev.item?.type === 'mcp_call')
      console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${ev.item.server_label}.${ev.item.name} ${ev.item.arguments?.slice(0, 140)} ${ev.item.error ? 'ERROR ' + JSON.stringify(ev.item.error).slice(0, 300) : `→ ${ev.item.output?.length ?? 0} car.`}`);
    if (ev.type === 'response.failed' || ev.type === 'error') console.log('FALLO', JSON.stringify(ev).slice(0, 1200));
  }
}
console.log(`\nEventos: ${[...seen].map(([k, v]) => `${k}×${v}`).join(', ')}`);
console.log(`Duración: ${((Date.now() - t0) / 1000).toFixed(1)} s\n\n${text}`);
