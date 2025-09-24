import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 8000,
    strictPort: true,
    host: true
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    }
  },
  define: {
    // Expose Vercel's URL to the client
    'import.meta.env.VITE_VERCEL_URL': JSON.stringify(process.env.VERCEL_URL)
  }
})
