import path from "node:path";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import artworks from "./routes/artworks";
import collections from "./routes/collections";
import settings from "./routes/settings";
import about from "./routes/about";
import publications from "./routes/publications";
import contact from "./routes/contact";
import auth from "./routes/auth";
import admin from "./routes/admin";
import { prisma } from "./lib/prisma";
import { errorHandler, notFound } from "./middleware/error";
import { verifyOrigin } from "./middleware/origin";

/** Origines autorisées par défaut quand CLIENT_ORIGIN n'est pas renseigné (développement) */
const DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

/**
 * Met une origine sous la forme exacte qu'envoie le navigateur : « schéma://hôte[:port] ».
 *
 * Un `CLIENT_ORIGIN` recopié depuis la barre d'adresse traîne presque toujours une
 * barre finale, parfois un chemin. La comparaison étant une égalité stricte, l'API
 * rejetait alors *toutes* les requêtes du site — CORS et contrôle d'`Origin` — sans
 * message explicite. Le piège coûte une soirée à comprendre : on le neutralise ici.
 */
export function normalizeOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    // new URL() reconstruit l'origine canonique et laisse tomber chemin et barre finale
    return new URL(trimmed).origin;
  } catch {
    // Valeur qui n'est pas une URL absolue : on retire au moins les barres finales
    return trimmed.replace(/\/+$/, "");
  }
}

export function allowedOrigins(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.CLIENT_ORIGIN?.split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
  if (configured?.length) return [...new Set(configured)];
  // En production on n'autorise jamais « toutes les origines » : le cookie de session
  // est envoyé avec credentials, une origine reflétée permettrait de voler la session.
  if (env.NODE_ENV === "production") {
    throw new Error("CLIENT_ORIGIN est obligatoire en production (liste d'origines séparées par des virgules)");
  }
  return DEV_ORIGINS;
}

/**
 * Derrière un reverse proxy (Nginx, Render, Railway…), `req.ip` vaut l'adresse du proxy :
 * la limitation de tentatives regrouperait alors tous les visiteurs dans un même quota.
 * TRUST_PROXY indique combien de sauts sont de confiance (généralement 1).
 * Laissé à false par défaut : faire confiance à X-Forwarded-For sans proxy devant
 * permettrait à n'importe qui d'usurper une adresse IP et de contourner la limite.
 */
export function trustProxySetting(env: NodeJS.ProcessEnv = process.env): boolean | number | string {
  const raw = env.TRUST_PROXY?.trim();
  if (!raw || raw === "false") return false;
  if (raw === "true") return true;
  const hops = Number(raw);
  return Number.isInteger(hops) && hops >= 0 ? hops : raw;
}

/**
 * Politique de sécurité du contenu appliquée au site servi en production.
 * Les seules sources externes du site sont les images Unsplash et les polices Google.
 */
export function cspDirectives(): Record<string, string[]> {
  return {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "script-src": ["'self'"],
    // React pose des styles en ligne (style={{…}}) : 'unsafe-inline' est inévitable pour style-src,
    // mais il reste absent de script-src, qui est ce qui compte contre les injections.
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "img-src": ["'self'", "data:", "https://images.unsplash.com"],
    "connect-src": ["'self'"],
  };
}

export function createApp() {
  const app = express();

  app.set("trust proxy", trustProxySetting());
  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: true, directives: cspDirectives() },
      crossOriginEmbedderPolicy: false,
    }),
  );
  const origins = allowedOrigins();
  // credentials: true est indispensable pour que le cookie de session circule
  // quand le front est servi depuis un autre domaine que l'API.
  app.use(cors({ origin: origins, credentials: true }));
  // Défense CSRF : une requête modifiante venue d'une origine inconnue est refusée,
  // même si le navigateur y a joint le cookie de session.
  app.use("/api", verifyOrigin(origins));
  app.use(express.json({ limit: "100kb" }));
  // « dev » colore la sortie avec des codes ANSI, illisibles dans les journaux Render.
  // « combined » est le format standard, exploitable par les agrégateurs de logs.
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  app.get("/api/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", database: "ok" });
    } catch {
      // 503 plutôt que 500 : le serveur va bien, c'est la base qui manque.
      // Le détail de l'erreur reste dans les logs, il n'a rien à faire dans la réponse.
      res.status(503).json({ status: "error", database: "injoignable" });
    }
  });

  app.use("/api/artworks", artworks);
  app.use("/api/collections", collections);
  app.use("/api/settings", settings);
  app.use("/api/about", about);
  app.use("/api/publications", publications);
  app.use("/api/contact", contact);
  app.use("/api/auth", auth);
  app.use("/api/admin", admin);
  app.use("/api", notFound);

  // En production, l'API sert aussi le build du frontend (client/dist)
  const clientDist = path.resolve(__dirname, "../../client/dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
