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
import { prisma } from "./lib/prisma";
import { errorHandler, notFound } from "./middleware/error";

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") ?? true }));
  app.use(express.json());
  if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

  app.get("/api/health", async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  });

  app.use("/api/artworks", artworks);
  app.use("/api/collections", collections);
  app.use("/api/settings", settings);
  app.use("/api/about", about);
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
