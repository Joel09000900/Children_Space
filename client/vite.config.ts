import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En développement, /api est redirigé vers le serveur Node
    proxy: { "/api": "http://localhost:4000" },
  },
});
