import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: [
      "ai-visibility-frontend-production.up.railway.app"
    ],
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 4173
  },
  server: {
    host: "0.0.0.0"
  }
});