import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Ports du serveur de développement.
 *
 * Ils étaient codés en dur. Quand le 5173 ou le 4000 était déjà pris — une autre
 * session `npm run dev` oubliée, ou l'API d'un autre projet — Vite basculait
 * silencieusement sur 5174 tandis que le proxy continuait de viser le 4000 occupé :
 * le site s'affichait, mais chaque appel d'API partait au mauvais serveur et les
 * requêtes modifiantes tombaient en 403 (« Origine non autorisée », le CLIENT_ORIGIN
 * de l'API pointant toujours le 5173). Les deux ports sont donc réglables.
 */
// `@types/node` n'est pas installé côté client (le bundle n'en a pas besoin) :
// on déclare juste ce qu'on lit du processus, plutôt que d'ajouter une dépendance.
declare const process: { env: Record<string, string | undefined> };

const WEB_PORT = Number(process.env.WEB_PORT ?? 5173);
const API_PORT = Number(process.env.API_PORT ?? 4000);

export default defineConfig({
  plugins: [react()],
  server: {
    port: WEB_PORT,
    // Échouer franchement plutôt que de glisser sur un autre port : le décalage
    // avec CLIENT_ORIGIN côté API est invisible et coûte une heure à diagnostiquer.
    strictPort: true,
    // En développement, /api est redirigé vers le serveur Node
    proxy: { "/api": `http://localhost:${API_PORT}` },
  },
});
