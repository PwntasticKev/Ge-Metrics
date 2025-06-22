import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.__WS_TOKEN__': JSON.stringify(process.env.__WS_TOKEN__),
    __WS_TOKEN__: JSON.stringify(process.env.__WS_TOKEN__)
  }
})
