import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    // setupFiles: ['./src/test/setup.ts'], // Disabled due to DOM dependency issues
    // Integration testing configuration
    poolOptions: {
      threads: {
        singleThread: true // Ensure database tests don't conflict
      }
    },
    testTimeout: 30000, // 30s for integration tests with real API calls
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      all: true, // Include all files, even those without tests
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.*',
        'dist/',
        '.eslintrc.cjs',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.test.{ts,tsx}'
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 80,
        statements: 80,
        // Component coverage requirement
        perFile: true
      }
    },
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    // Integration test settings
    env: {
      // Use test database for integration tests
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ge_metrics_test'
    },
    // Reporter for better test output (removed html for now due to missing dependencies)
    reporters: ['default']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@server': path.resolve(__dirname, './server/src')
    }
  }
})