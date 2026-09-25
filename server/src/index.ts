import "dotenv/config";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";
import { adminConfig, ensureAdmin, purgeExpiredSessions } from "./lib/auth";

// Une configuration invalide (mot de passe admin trop faible en production,
// pseudo mal formé, CLIENT_ORIGIN manquant) doit empêcher le démarrage tout de suite.
let app;
try {
  adminConfig();
  app = createApp();
} catch (err) {
  console.error("Configuration invalide :", err instanceof Error ? err.message : err);
  process.exit(1);
}

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, () => {
  console.log(`API OliKrys prête sur http://localhost:${port}`);
});

// La base peut être injoignable au démarrage : on ne bloque pas le serveur pour autant.
ensureAdmin().catch((err) =>
  console.error("Compte admin non synchronisé (base injoignable ?) :", err instanceof Error ? err.message : err),
);

purgeExpiredSessions().catch((err) =>
  console.error("Purge des sessions impossible :", err instanceof Error ? err.message : err),
);

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
