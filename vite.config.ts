import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/': 'http://localhost:4000', // Proxy API requests if needed
        },
        fs: {
            strict: false, // Allows serving index.html for all routes
        },
    },
});
