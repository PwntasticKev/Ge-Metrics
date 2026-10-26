import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsup'

// The flipping engine lives in the web app (src/domain/flipping). Bundle it in
// so the published package is self-contained; npm deps stay external.
const engine = fileURLToPath(new URL('../src/domain/flipping/index.js', import.meta.url))

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  sourcemap: true,
  banner: { js: '#!/usr/bin/env node' },
  esbuildOptions (options) {
    options.alias = { ...options.alias, '@ge/engine': engine }
  }
})
