import type { RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Écriture de la bibliographie depuis la page publique, réservée à l'administrateur.
 * Prisma est simulé : ces tests vérifient le câblage HTTP (routes montées, verrou
 * d'accès, validation, codes de retour) sans toucher à la base Neon.
 */

const db = {
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

/** Session renvoyée par getSessionUser ; ajustée par chaque test */
let sessionUser: { id: string; name: string; role: string } | null = null;

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    publication: db,
    $transaction: (ops: unknown[]) => Promise.all(ops),
    $queryRaw: () => Promise.resolve([{ "?column?": 1 }]),
  },
}));

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

const valid = {
  title: "Regards d'enfance",
  kind: "BOOK",
  source: "Éditions du Soir",
  year: 2024,
};

const row = {
  id: "pub_1",
  title: valid.title,
  kind: "BOOK",
  source: valid.source,
  year: valid.year,
  author: null,
  url: null,
  note: null,
  createdAt: new Date("2026-09-25T10:00:00.000Z"),
};

/** Erreur « ligne absente » telle que Prisma la lève sur update/delete */
const notFoundError = Object.assign(new Error("Record to update not found"), { code: "P2025" });

beforeEach(() => {
  vi.clearAllMocks();
  sessionUser = null;
  db.findMany.mockResolvedValue([{ ...row }]);
  db.create.mockResolvedValue({ ...row });
  db.update.mockResolvedValue({ ...row, year: 2020 });
  db.delete.mockResolvedValue({ ...row });
});

describe("GET /api/publications — lecture publique", () => {
  it("reste accessible sans session et masque createdAt", async () => {
    const res = await request(createApp()).get("/api/publications");

    expect(res.status).toBe(200);
    expect(res.body.data[0]).not.toHaveProperty("createdAt");
    expect(res.body.data[0]).toMatchObject({ id: "pub_1", title: valid.title });
  });
});

describe("accès aux routes d'écriture", () => {
  it("refuse un visiteur anonyme", async () => {
    const res = await request(createApp()).post("/api/admin/publications").set("Origin", ORIGIN).send(valid);

    expect(res.status).toBe(401);
    expect(db.create).not.toHaveBeenCalled();
  });

  it("refuse un membre connecté non administrateur", async () => {
    sessionUser = MEMBER;
    const res = await request(createApp()).post("/api/admin/publications").set("Origin", ORIGIN).send(valid);

    expect(res.status).toBe(403);
    expect(db.create).not.toHaveBeenCalled();
  });

  /*
   * Ces routes sont les premières écritures métier du projet : le contrôle d'Origin
   * passe ici de théorique à réellement utile. Une origine étrangère doit être
   * rejetée même avec une session administrateur valide.
   */
  it("refuse une origine étrangère malgré une session admin", async () => {
    sessionUser = ADMIN;
    const res = await request(createApp())
      .post("/api/admin/publications")
      .set("Origin", "https://site-malveillant.example")
      .send(valid);

    expect(res.status).toBe(403);
    expect(db.create).not.toHaveBeenCalled();
  });

  it("protège aussi PATCH et DELETE", async () => {
    const app = createApp();
    const patch = await request(app).patch("/api/admin/publications/pub_1").set("Origin", ORIGIN).send({ year: 2020 });
    const del = await request(app).delete("/api/admin/publications/pub_1").set("Origin", ORIGIN);

    expect(patch.status).toBe(401);
    expect(del.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/publications", () => {
  beforeEach(() => {
    sessionUser = ADMIN;
  });

  it("crée la référence et répond 201 sans createdAt", async () => {
    const res = await request(createApp()).post("/api/admin/publications").set("Origin", ORIGIN).send(valid);

    expect(res.status).toBe(201);
    expect(res.body.data).not.toHaveProperty("createdAt");
    expect(db.create).toHaveBeenCalledWith({
      data: { ...valid, author: null, url: null, note: null },
    });
  });

  it("normalise les champs facultatifs vides en null", async () => {
    await request(createApp())
      .post("/api/admin/publications")
      .set("Origin", ORIGIN)
      .send({ ...valid, author: "  ", url: "", note: "" });

    expect(db.create).toHaveBeenCalledWith({ data: { ...valid, author: null, url: null, note: null } });
  });

  it("refuse un corps invalide en 400", async () => {
    const res = await request(createApp())
      .post("/api/admin/publications")
      .set("Origin", ORIGIN)
      .send({ ...valid, kind: "THESE" });

    expect(res.status).toBe(400);
    expect(db.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/publications/:id", () => {
  beforeEach(() => {
    sessionUser = ADMIN;
  });

  it("ne transmet que les champs fournis", async () => {
    const res = await request(createApp())
      .patch("/api/admin/publications/pub_1")
      .set("Origin", ORIGIN)
      .send({ year: 2020 });

    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalledWith({ where: { id: "pub_1" }, data: { year: 2020 } });
  });

  it("refuse un corps vide", async () => {
    const res = await request(createApp()).patch("/api/admin/publications/pub_1").set("Origin", ORIGIN).send({});

    expect(res.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("traduit l'absence de ligne en 404", async () => {
    db.update.mockRejectedValue(notFoundError);
    const res = await request(createApp())
      .patch("/api/admin/publications/inconnu")
      .set("Origin", ORIGIN)
      .send({ year: 2020 });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/publications/:id", () => {
  beforeEach(() => {
    sessionUser = ADMIN;
  });

  it("supprime et répond 204 sans corps", async () => {
    const res = await request(createApp()).delete("/api/admin/publications/pub_1").set("Origin", ORIGIN);

    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    expect(db.delete).toHaveBeenCalledWith({ where: { id: "pub_1" } });
  });

  it("traduit l'absence de ligne en 404", async () => {
    db.delete.mockRejectedValue(notFoundError);
    const res = await request(createApp()).delete("/api/admin/publications/inconnu").set("Origin", ORIGIN);

    expect(res.status).toBe(404);
  });
});
