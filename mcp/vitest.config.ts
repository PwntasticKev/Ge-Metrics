import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@ge/engine': fileURLToPath(new URL('../src/domain/flipping/index.js', import.meta.url)) }
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node'
  }
})
