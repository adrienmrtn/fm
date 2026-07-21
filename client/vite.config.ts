import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The client talks to the backend only through /api, proxied in dev so
// the LLM key never lives in the browser.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.SERVER_URL ?? 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
