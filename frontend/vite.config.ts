import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The FastAPI prototype (uvicorn main:app) has no CORS middleware, so the
// frontend reaches it through a same-origin proxy in both dev and preview.
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
  };
});

