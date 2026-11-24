// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: el build funciona servido desde cualquier carpeta.
  base: './',
  server: {
    port: 5173,
    // Pestaña «En vivo»: el proxy local (npm run live) guarda la clave en el servidor.
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  preview: { port: 4173 },
  // App local de demo: un único bundle es aceptable.
  build: { chunkSizeWarningLimit: 900 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.mjs', 'scripts/**/*.test.ts'],
  },
});
