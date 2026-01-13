import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/integration/**/*.test.{js,jsx,ts,tsx}'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    retry: 2,
    pool: 'threads'
  },
  define: {
    'import.meta.env.NODE_ENV': JSON.stringify('test'),
  }
})