import type { RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EDITABLE_TEXT_KEYS, hasPrivateKey } from "../src/lib/siteText";

/**
 * Édition des titres de la galerie depuis la page publique, réservée à l'administrateur :
 * textes de l'en-tête (PATCH /api/admin/settings) et titre d'une œuvre
 * (PATCH /api/admin/artworks/:id). Prisma est simulé : ces tests vérifient le câblage
 * HTTP (routes montées, verrou d'accès, validation, codes de retour) sans toucher à Neon.
 */

const artwork = { update: vi.fn() };
const setting = { upsert: vi.fn(), findMany: vi.fn() };

/** Session renvoyée par getSessionUser ; ajustée par chaque test */
let sessionUser: { id: string; name: string; role: string } | null = null;

const prismaMock = {
  artwork,
  setting,
  // adminSettings ouvre une transaction interactive (callback) ; les autres routes
  // du projet passent un tableau d'opérations : le double appel doit être couvert.
  $transaction: (arg: unknown) =>
    Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => Promise<unknown>)(prismaMock),
  $queryRaw: () => Promise.resolve([{ "?column?": 1 }]),
};

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("../src/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/auth")>();
  const requireAdmin: RequestHandler = (_req, res, next) => {
    if (!sessionUser) return void res.status(401).json({ error: "Connexion requise" });
    if (sessionUser.role !== "ADMIN") return void res.status(403).json({ error: "Accès réservé" });
    next();
  };
  return { ...actual, getSessionUser: async () => sessionUser, requireAdmin };
});

const { createApp } = await import("../src/app");

const ORIGIN = "http://localhost:5173";
const ADMIN = { id: "u_admin", name: "Olykris", role: "ADMIN" };
const MEMBER = { id: "u_1", name: "Awa", role: "MEMBER" };

const row = {
  id: "art_1",
  slug: "les-enfants-du-vent",
  title: "Les Enfants du Vent",
  description: "Huile sur toile",
  dimensions: "80 × 100 cm",
  year: 2024,
  imageUrl: "/images/1.jpg",
  thumbUrl: null,
  featured: false,
  available: true,
  position: 0,
  collectionId: null,
  techniqueId: null,
  collection: null,
  technique: null,
  createdAt: new Date("2026-09-25T10:00:00.000Z"),
  updatedAt: new Date("2026-09-25T10:00:00.000Z"),
};

/** Erreur « ligne absente » telle que Prisma la lève sur update */
const notFoundError = Object.assign(new Error("Record to update not found"), { code: "P2025" });

beforeEach(() => {
  vi.clearAllMocks();
  sessionUser = null;
  artwork.update.mockResolvedValue({ ...row, title: "Nouveau titre" });
  setting.upsert.mockResolvedValue({ key: "hero_title", value: "La Collection" });
  setting.findMany.mockResolvedValue([
    { key: "hero_title", value: "La Collection" },
    { key: "private_token", value: "secret" },
  ]);
});

describe("liste blanche des textes modifiables", () => {
  it("ne contient aucune clé réservée aux réglages internes", () => {
    expect(hasPrivateKey).toBe(false);
    expect(EDITABLE_TEXT_KEYS).toEqual(["hero_eyebrow", "hero_title", "artist_name", "hero_tagline"]);
  });
});

describe("accès aux routes d'écriture", () => {
  it("refuse un visiteur anonyme", async () => {
    const app = createApp();
    const titles = await request(app).patch("/api/admin/settings").set("Origin", ORIGIN).send({ hero_title: "X" });
    const rename = await request(app).patch("/api/admin/artworks/art_1").set("Origin", ORIGIN).send({ title: "Titre" });

    expect(titles.status).toBe(401);
    expect(rename.status).toBe(401);
    expect(setting.upsert).not.toHaveBeenCalled();
    expect(artwork.update).not.toHaveBeenCalled();
  });

  it("refuse un membre connecté non administrateur", async () => {
    sessionUser = MEMBER;
    const app = createApp();
    const titles = await request(app).patch("/api/admin/settings").set("Origin", ORIGIN).send({ hero_title: "X" });
    const rename = await request(app).patch("/api/admin/artworks/art_1").set("Origin", ORIGIN).send({ title: "Titre" });

    expect(titles.status).toBe(403);
    expect(rename.status).toBe(403);
    expect(setting.upsert).not.toHaveBeenCalled();
    expect(artwork.update).not.toHaveBeenCalled();
  });

  it("refuse une origine étrangère malgré une session admin", async () => {
    sessionUser = ADMIN;
    const res = await request(createApp())
      .patch("/api/admin/settings")
      .set("Origin", "https://site-malveillant.example")
      .send({ hero_title: "X" });

    expect(res.status).toBe(403);
    expect(setting.upsert).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/settings — titres de l'en-tête", () => {
  beforeEach(() => {
    sessionUser = ADMIN;
  });

  it("enregistre les textes fournis et renvoie les réglages publics", async () => {
    const res = await request(createApp())
      .patch("/api/admin/settings")
      .set("Origin", ORIGIN)
      .send({ hero_title: "  La Collection  " });

    expect(res.status).toBe(200);
    // upsert : hero_eyebrow et hero_title n'existent pas dans les bases déjà semées
    expect(setting.upsert).toHaveBeenCalledWith({
      where: { key: "hero_title" },
      create: { key: "hero_title", value: "La Collection" },
      update: { value: "La Collection" },
    });
    // La réponse passe par settingsToObject : les clés internes n'en sortent pas
    expect(res.body.data).toEqual({ hero_title: "La Collection" });
  });

  it("refuse une clé hors liste blanche", async () => {
    const res = await request(createApp())
      .patch("/api/admin/settings")
      .set("Origin", ORIGIN)
      .send({ whatsapp_number: "0000000000" });

    expect(res.status).toBe(400);
    expect(setting.upsert).not.toHaveBeenCalled();
  });

  it("refuse un corps vide et un texte vide", async () => {
    const app = createApp();
    const empty = await request(app).patch("/api/admin/settings").set("Origin", ORIGIN).send({});
    const blank = await request(app).patch("/api/admin/settings").set("Origin", ORIGIN).send({ hero_title: "   " });

    expect(empty.status).toBe(400);
    expect(blank.status).toBe(400);
    expect(setting.upsert).not.toHaveBeenCalled();
  });

  it("refuse un texte trop long pour l'en-tête", async () => {
    const res = await request(createApp())
      .patch("/api/admin/settings")
      .set("Origin", ORIGIN)
      .send({ hero_eyebrow: "a".repeat(61) });

    expect(res.status).toBe(400);
    expect(setting.upsert).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/artworks/:id — titre d'une œuvre", () => {
  beforeEach(() => {
    sessionUser = ADMIN;
  });

  it("renomme l'œuvre sans toucher au slug", async () => {
    const res = await request(createApp())
      .patch("/api/admin/artworks/art_1")
      .set("Origin", ORIGIN)
      .send({ title: "  Nouveau titre  " });

    expect(res.status).toBe(200);
    expect(artwork.update).toHaveBeenCalledWith({
      where: { id: "art_1" },
      data: { title: "Nouveau titre" },
      include: { collection: true, technique: true },
    });
    // Le slug reste celui d'origine : les liens ?oeuvre=slug déjà partagés continuent de fonctionner
    expect(res.body.data).toMatchObject({ slug: row.slug, title: "Nouveau titre" });
  });

  it("refuse un titre trop court ou absent", async () => {
    const app = createApp();
    const short = await request(app).patch("/api/admin/artworks/art_1").set("Origin", ORIGIN).send({ title: "a" });
    const missing = await request(app).patch("/api/admin/artworks/art_1").set("Origin", ORIGIN).send({});

    expect(short.status).toBe(400);
    expect(missing.status).toBe(400);
    expect(artwork.update).not.toHaveBeenCalled();
  });

  it("traduit l'absence de ligne en 404", async () => {
    artwork.update.mockRejectedValue(notFoundError);
    const res = await request(createApp())
      .patch("/api/admin/artworks/inconnu")
      .set("Origin", ORIGIN)
      .send({ title: "Nouveau titre" });

    expect(res.status).toBe(404);
  });
});
