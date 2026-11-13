import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In local development, Vite proxies /api and /ws to DEFENCEIQ_BACKEND (default: http://127.0.0.1:8000).
// In production deployments (e.g. Vercel), the frontend connects directly to the
// Render FastAPI backend via VITE_API_BASE and VITE_WS_URL using configured CORS and WebSocket origin security.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.DEFENCEIQ_BACKEND ?? 'http://127.0.0.1:8000';
  const proxy = {
    '/api': { target: backend, changeOrigin: true },
    '/ws': { target: backend.replace(/^http/, 'ws'), ws: true, changeOrigin: true },
  };
  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 1000,
    },
  };
});

