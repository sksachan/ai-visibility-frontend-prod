import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const allowedRailwayHosts = [
  'ai-visibility-frontend-production.up.railway.app',
  'ai-visibility-frontend-production.up.railway.app',
  '.up.railway.app'
];

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    host: '0.0.0.0',
    allowedHosts: allowedRailwayHosts
  },
  preview: {
    port: Number(process.env.PORT) || 4173,
    host: '0.0.0.0',
    allowedHosts: allowedRailwayHosts
  },
  build: {
    chunkSizeWarningLimit: 1800
  }
});
