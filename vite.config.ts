import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    dedupe: ['@emotion/react', '@emotion/styled'],
    alias: {
      '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, 'node_modules/@emotion/styled')
    }
  },
  optimizeDeps: {
    include: [
      'lightweight-charts',
      '@emotion/react',
      '@emotion/styled',
      '@mantine/core',
      '@mantine/hooks'
    ],
    esbuildOptions: {
      // Ensure CommonJS modules are handled correctly
      target: 'es2020'
    }
  },
  build: {
    commonjsOptions: {
      include: [/lightweight-charts/, /node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      onwarn(warning, defaultWarn) {
        // Ignore unresolved import warnings - these will be resolved at build time
        if (warning.code === 'UNRESOLVED_IMPORT') {
          return;
        }
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        defaultWarn(warning);
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'mantine-vendor': ['@mantine/core', '@mantine/hooks', '@mantine/form', '@mantine/dates']
        }
      }
    }
  },
  server: {
    port: 8000,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/trpc': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  publicDir: 'public',
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    }
  },
  define: {
    // Expose Vercel's environment variables to the client
    'import.meta.env.VERCEL_URL': JSON.stringify(process.env.VERCEL_URL)
  }
})
