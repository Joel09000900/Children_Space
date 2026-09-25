import type { RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Parcours complet d'un message, du formulaire public au tableau de bord admin,
 * avec Prisma simulé : ces tests vérifient le câblage HTTP (routes montées, statuts,
 * champs transmis, protections) sans toucher à la base Neon.
 */

const db = {
  create: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
};

/** Session renvoyée par getSessionUser ; modifiée par chaque test selon le besoin */
let sessionUser: { id: string; name: string; role: string } | null = null;

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    contactMessage: db,
    // Le tableau de bord lit la liste et le compteur dans une seule transaction
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
const { contactLimit } = await import("../src/routes/contact");

const ORIGIN = "http://localhost:5173";
const valid = {
  name: "Awa Traoré",
  email: "Awa.Traore@Example.com",
  subject: "Acquisition d'une toile",
  message: "Bonjour, je souhaite connaître le prix de la toile Songes Intérieurs.",
};

const row = {
  id: "msg_1",
  name: valid.name,
  email: "awa.traore@example.com",
  subject: valid.subject,
  message: valid.message,
  status: "NEW",
  createdAt: new Date("2026-09-25T10:00:00.000Z"),
  user: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Le compteur vit au niveau du module : sans remise à zéro, les envois d'un test
  // épuiseraient le quota du suivant.
  contactLimit.limiter.reset();
  sessionUser = null;
  db.create.mockResolvedValue({ ...row });
  db.findMany.mockResolvedValue([{ ...row }]);
  db.count.mockResolvedValue(1);
  db.update.mockResolvedValue({ ...row, status: "READ" });
});

describe("POST /api/contact — formulaire public", () => {
  it("enregistre le message et répond 201", async () => {
    const res = await request(createApp()).post("/api/contact").set("Origin", ORIGIN).send(valid);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: { received: true } });
    expect(db.create).toHaveBeenCalledTimes(1);
  });

  it("écrit bien les quatre champs du formulaire, e-mail normalisé", async () => {
    await request(createApp()).post("/api/contact").set("Origin", ORIGIN).send(valid);

    expect(db.create).toHaveBeenCalledWith({
      data: {
        name: "Awa Traoré",
        email: "awa.traore@example.com",
        subject: "Acquisition d'une toile",
        message: valid.message,
        userId: null,
      },
    });
  });

  it("ne renvoie jamais l'identifiant du message créé au visiteur", async () => {
    const res = await request(createApp()).post("/api/contact").set("Origin", ORIGIN).send(valid);
    expect(JSON.stringify(res.body)).not.toContain("msg_1");
  });

  it("rattache le membre connecté au message, sans jamais exiger de session", async () => {
    sessionUser = { id: "u1", name: "Awa", role: "MEMBER" };
    await request(createApp()).post("/api/contact").set("Origin", ORIGIN).send(valid);

    expect(db.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "u1" }) }));
  });

  it("refuse un formulaire incomplet ou invalide sans rien écrire", async () => {
    const app = createApp();
    for (const bad of [
      { ...valid, email: "pas-une-adresse" },
      { ...valid, message: "trop court" },
      { ...valid, name: "" },
      {},
    ]) {
      const res = await request(app).post("/api/contact").set("Origin", ORIGIN).send(bad);
      expect(res.status).toBe(400);
    }
    expect(db.create).not.toHaveBeenCalled();
  });

  it("accepte le leurre rempli sans rien écrire en base", async () => {
    // Répondre 201 évite de signaler au robot que le piège a fonctionné
    const res = await request(createApp())
      .post("/api/contact")
      .set("Origin", ORIGIN)
      .send({ ...valid, website: "http://spam.example" });

    expect(res.status).toBe(201);
    expect(db.create).not.toHaveBeenCalled();
  });

  it("rejette un envoi venu d'une autre origine (défense CSRF)", async () => {
    const res = await request(createApp())
      .post("/api/contact")
      .set("Origin", "https://evil.example")
      .send(valid);

    expect(res.status).toBe(403);
    expect(db.create).not.toHaveBeenCalled();
  });

  it("coupe le robinet après 5 envois depuis la même adresse", async () => {
    const app = createApp();
    for (let i = 0; i < 5; i++) {
      const ok = await request(app).post("/api/contact").set("Origin", ORIGIN).send(valid);
      expect(ok.status).toBe(201);
    }
    const blocked = await request(app).post("/api/contact").set("Origin", ORIGIN).send(valid);
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(db.create).toHaveBeenCalledTimes(5);
  });
});

describe("GET /api/admin/messages — réception côté administration", () => {
  it("exige une session administrateur", async () => {
    const app = createApp();

    sessionUser = null;
    expect((await request(app).get("/api/admin/messages")).status).toBe(401);

    sessionUser = { id: "u1", name: "Awa", role: "MEMBER" };
    expect((await request(app).get("/api/admin/messages")).status).toBe(403);
  });

  it("renvoie les messages reçus et le nombre de non lus", async () => {
    sessionUser = { id: "a1", name: "Olykris", role: "ADMIN" };
    const res = await request(createApp()).get("/api/admin/messages");

    expect(res.status).toBe(200);
    expect(res.body.meta.unread).toBe(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toEqual({
      id: "msg_1",
      name: "Awa Traoré",
      email: "awa.traore@example.com",
      subject: "Acquisition d'une toile",
      message: valid.message,
      status: "NEW",
      createdAt: "2026-09-25T10:00:00.000Z",
      author: null,
    });
  });

  it("présente les messages du plus récent au plus ancien", async () => {
    sessionUser = { id: "a1", name: "Olykris", role: "ADMIN" };
    await request(createApp()).get("/api/admin/messages");

    expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { createdAt: "desc" } }));
  });

  it("filtre par statut quand le tableau de bord le demande", async () => {
    sessionUser = { id: "a1", name: "Olykris", role: "ADMIN" };
    await request(createApp()).get("/api/admin/messages?status=NEW&limit=10");

    expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "NEW" }, take: 10 }));
  });

  it("refuse un filtre inconnu plutôt que de l'ignorer", async () => {
    sessionUser = { id: "a1", name: "Olykris", role: "ADMIN" };
    const res = await request(createApp()).get("/api/admin/messages?status=SUPPRIME");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/messages/:id — suivi des messages", () => {
  it("change le statut d'un message", async () => {
    sessionUser = { id: "a1", name: "Olykris", role: "ADMIN" };
    const res = await request(createApp())
      .patch("/api/admin/messages/msg_1")
      .set("Origin", ORIGIN)
      .send({ status: "READ" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("READ");
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "msg_1" }, data: { status: "READ" } }));
  });

  it("n'accepte que les trois statuts connus", async () => {
    sessionUser = { id: "a1", name: "Olykris", role: "ADMIN" };
    const res = await request(createApp())
      .patch("/api/admin/messages/msg_1")
      .set("Origin", ORIGIN)
      .send({ status: "SUPPRIME" });

    expect(res.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("répond 404 quand le message a disparu, au lieu d'une erreur interne", async () => {
    sessionUser = { id: "a1", name: "Olykris", role: "ADMIN" };
    db.update.mockRejectedValue(Object.assign(new Error("not found"), { code: "P2025" }));

    const res = await request(createApp())
      .patch("/api/admin/messages/inconnu")
      .set("Origin", ORIGIN)
      .send({ status: "READ" });

    expect(res.status).toBe(404);
  });

  it("reste fermé aux visiteurs et aux membres", async () => {
    const app = createApp();
    const patch = () => request(app).patch("/api/admin/messages/msg_1").set("Origin", ORIGIN).send({ status: "READ" });

    sessionUser = null;
    expect((await patch()).status).toBe(401);

    sessionUser = { id: "u1", name: "Awa", role: "MEMBER" };
    expect((await patch()).status).toBe(403);
    expect(db.update).not.toHaveBeenCalled();
  });
});
