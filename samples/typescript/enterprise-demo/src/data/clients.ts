// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { l, type BrandId, type ClientId, type L } from './types';

export interface ClientDef {
  id: BrandId;
  name: L;
  monogram: string;
  sector: L;
  /** Generic sector palettes, editable in Settings; not customer brand colors. */
  brand: { accent: string; sidebar: string; app: string; panel: string; header: string };
}

export const CLIENTS: ClientDef[] = [
  {
    id: 'energy',
    name: l('Energía', 'Energy'),
    monogram: 'EN',
    sector: l('Energía', 'Energy'),
    brand: { accent: '#0F766E', sidebar: '#10252A', app: '#F1F5F5', panel: '#FFFFFF', header: '#FFFFFF' },
  },
  {
    id: 'hospitality',
    name: l('Hostelería', 'Hospitality'),
    monogram: 'HO',
    sector: l('Hoteles y turismo', 'Hotels and travel'),
    brand: { accent: '#9A3412', sidebar: '#292018', app: '#FAF5EF', panel: '#FFFFFF', header: '#FFFFFF' },
  },
  {
    id: 'travel',
    name: l('Viajes', 'Travel'),
    monogram: 'TR',
    sector: l('Distribución turística', 'Travel distribution'),
    brand: { accent: '#475569', sidebar: '#17202D', app: '#F1F5F9', panel: '#FFFFFF', header: '#FFFFFF' },
  },
  {
    id: 'insurance',
    name: l('Seguros', 'Insurance'),
    monogram: 'IN',
    sector: l('Seguros y salud', 'Insurance and health'),
    brand: { accent: '#4338CA', sidebar: '#1E1B3A', app: '#F5F3FF', panel: '#FFFFFF', header: '#FFFFFF' },
  },
  {
    id: 'public-sector',
    name: l('Sector público', 'Public sector'),
    monogram: 'PS',
    sector: l('Sector público', 'Public sector'),
    brand: { accent: '#0369A1', sidebar: '#132838', app: '#F0F7FA', panel: '#FFFFFF', header: '#FFFFFF' },
  },
  {
    id: 'custom',
    name: l('Personalizado', 'Custom'),
    monogram: '+',
    sector: l('Personalizado', 'Custom'),
    brand: { accent: '#0F766E', sidebar: '#10252A', app: '#F1F5F5', panel: '#FFFFFF', header: '#FFFFFF' },
  },
];

export const CLIENT_IDS: ClientId[] = ['energy', 'hospitality', 'travel', 'insurance', 'public-sector'];

export const clientById = (id: BrandId): ClientDef => CLIENTS.find((c) => c.id === id) ?? CLIENTS[0];
