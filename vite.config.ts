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
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: false, // Faster builds
    chunkSizeWarningLimit: 1000, // 1MB warning limit
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
        // Optimal chunk strategy for CDN caching
        manualChunks: (id) => {
          // Vendor chunks - rarely change, cache longer
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/@mantine')) {
            return 'mantine-vendor'
          }
          if (id.includes('node_modules/@trpc') || id.includes('node_modules/@tanstack')) {
            return 'trpc-vendor'
          }
          if (id.includes('node_modules/@emotion')) {
            return 'emotion-vendor'
          }
          if (id.includes('node_modules/lightweight-charts') || id.includes('node_modules/recharts')) {
            return 'charts-vendor'
          }
          // Large vendor libraries
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
        // Optimize asset naming for CDN
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name!.split('.')
          const extType = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name]-[hash][extname]`
          }
          if (/woff2?|eot|ttf|otf/i.test(extType)) {
            return `assets/fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    // Enable source maps in production for better debugging
    sourcemap: process.env.NODE_ENV === 'production' ? false : true
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
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('Origin', 'http://localhost:8000')
          })
        }
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
