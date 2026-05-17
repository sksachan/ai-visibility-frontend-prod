import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4173,
    allowedHosts: [
      'ai-visibility-frontend-production.up.railway.app',
      'ai-visibility-frontend-production.up.railway.app',
      '.up.railway.app',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
    allowedHosts: [
      'ai-visibility-frontend-production.up.railway.app',
      'ai-visibility-frontend-production.up.railway.app',
      '.up.railway.app',
    ],
  },
})