// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, expect, it } from 'vitest';
import { azureTargetFromEnv, checkKey, cleanKey, missingAzureTarget, upsertEnv } from './set-webiq-key.mjs';

describe('set-webiq-key', () => {
  it('no fija un destino Azure y permite modo solo local sin configurarlo', () => {
    expect(missingAzureTarget({})).toEqual(['AZURE_SUBSCRIPTION_ID', 'AZ_RESOURCE_GROUP', 'AZ_WEBAPP']);
    expect(missingAzureTarget({ subscription: 'sub', resourceGroup: 'rg', webApp: 'app' })).toEqual([]);
    expect(azureTargetFromEnv({ AZURE_SUBSCRIPTION_ID: 'sub', AZ_RESOURCE_GROUP: 'rg', AZ_WEBAPP: 'app' }).url).toBe('https://app.azurewebsites.net');
    expect(azureTargetFromEnv({ AZ_WEBAPP: 'app', AZ_WEBAPP_URL: 'https://demo.example' }).url).toBe('https://demo.example');
  });

  it('sustituye la clave existente sin tocar el resto', () => {
    const env = '# comentario\nWEBIQ_API_KEY=\nLLM_MODEL=gpt-5.4-mini\n';
    expect(upsertEnv(env, 'WEBIQ_API_KEY', 'abc')).toBe('# comentario\nWEBIQ_API_KEY=abc\nLLM_MODEL=gpt-5.4-mini\n');
    expect(upsertEnv('export WEBIQ_API_KEY=old', 'WEBIQ_API_KEY', 'new')).toBe('WEBIQ_API_KEY=new\n');
  });

  it('añade la clave si no existe y respeta las líneas comentadas', () => {
    expect(upsertEnv('# WEBIQ_API_KEY=\nPORT=8787\n', 'WEBIQ_API_KEY', 'k')).toBe('# WEBIQ_API_KEY=\nPORT=8787\nWEBIQ_API_KEY=k\n');
    expect(upsertEnv('', 'WEBIQ_API_KEY', 'k')).toBe('WEBIQ_API_KEY=k\n');
  });

  it('limpia lo pegado', () => {
    expect(cleanKey('\x1b[200~  abc123 \x1b[201~\n')).toBe('abc123');
    expect(cleanKey('\n\nWEBIQ_API_KEY="abc"\nresto')).toBe('abc');
    expect(cleanKey("'xyz'")).toBe('xyz');
    expect(cleanKey(undefined)).toBe('');
  });

  it('valida la clave con una búsqueda mínima', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const ok = await checkKey('k', {
      baseUrl: 'http://x/v3/',
      fetch: (async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return new Response(JSON.stringify({ webResults: [] }), { status: 200 });
      }) as unknown as typeof fetch,
    });
    expect(ok.ok).toBe(true);
    expect(calls[0].url).toBe('http://x/v3/search/web');
    expect((calls[0].init.headers as Record<string, string>)['x-apikey']).toBe('k');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ query: 'Microsoft Web IQ', maxResults: 1 });

    const bad = await checkKey('k', {
      fetch: (async () => new Response(JSON.stringify({ error: { code: 'Unauthorized' } }), { status: 401 })) as unknown as typeof fetch,
    });
    expect(bad).toMatchObject({ ok: false, status: 401, detail: 'Unauthorized' });

    const down = await checkKey('k', {
      fetch: (async () => {
        throw new Error('ECONNREFUSED');
      }) as unknown as typeof fetch,
    });
    expect(down).toMatchObject({ ok: false, status: 0, detail: 'ECONNREFUSED' });
  });
});
