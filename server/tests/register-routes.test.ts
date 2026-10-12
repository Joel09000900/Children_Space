import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Inscription, avec Prisma simulé.
 *
 * L'enjeu de ces tests n'est pas le compte créé mais ce que la réponse laisse
 * deviner : une adresse déjà inscrite doit produire exactement la même chose
 * qu'une adresse libre, sans quoi l'API dit à qui le demande qui est membre.
 */

const db = { create: vi.fn() };

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    user: db,
    $queryRaw: () => Promise.resolve([{ "?column?": 1 }]),
  },
}));

const { createApp } = await import("../src/app");
const { registerLimit } = await import("../src/routes/auth");
const { SESSION_COOKIE } = await import("../src/lib/auth");

const ORIGIN = "http://localhost:5173";
const valid = { name: "Awa Traoré", email: "awa@exemple.fr", password: "motdepasse-solide" };

/** Erreur Prisma levée quand l'adresse est déjà prise */
const uniqueViolation = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

const post = (body: unknown) => request(createApp()).post("/api/auth/register").set("Origin", ORIGIN).send(body);

beforeEach(() => {
  db.create.mockReset();
  db.create.mockResolvedValue({ id: "u1", ...valid, role: "MEMBER", username: null, createdAt: new Date() });
  // Le compteur est partagé par tout le processus : sans remise à zéro, les
  // derniers tests du fichier se heurteraient au quota des premiers.
  registerLimit.limiter.reset();
});

describe("POST /api/auth/register", () => {
  it("accepte une inscription valide", async () => {
    const res = await post(valid);

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ data: { registered: true } });
    expect(db.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: valid.name, email: valid.email }) }),
    );
  });

  it("ne stocke jamais le mot de passe en clair", async () => {
    await post(valid);

    const { passwordHash } = db.create.mock.calls[0][0].data;
    expect(passwordHash).toMatch(/^scrypt\$/);
    expect(passwordHash).not.toContain(valid.password);
  });

  it("répond exactement pareil quand l'adresse est déjà inscrite", async () => {
    const libre = await post(valid);

    db.create.mockRejectedValue(uniqueViolation());
    const prise = await post({ ...valid, email: "deja@exemple.fr" });

    expect(prise.status).toBe(libre.status);
    expect(prise.body).toEqual(libre.body);
  });

  it("n'ouvre aucune session : le cookie trahirait l'adresse libre", async () => {
    const libre = await post(valid);
    expect(libre.headers["set-cookie"]).toBeUndefined();

    db.create.mockRejectedValue(uniqueViolation());
    const prise = await post({ ...valid, email: "deja@exemple.fr" });
    expect(prise.headers["set-cookie"]).toBeUndefined();

    // Le nom du cookie ne doit apparaître nulle part dans l'échange
    expect(JSON.stringify(prise.body)).not.toContain(SESSION_COOKIE);
  });

  it("ne renvoie aucune donnée de compte", async () => {
    const res = await post(valid);

    const body = JSON.stringify(res.body);
    expect(body).not.toContain(valid.email);
    expect(body).not.toContain(valid.name);
    expect(body).not.toContain("u1");
  });

  it("refuse un corps invalide sans rien écrire", async () => {
    for (const body of [
      { ...valid, email: "pas-une-adresse" },
      { ...valid, password: "court" },
      { ...valid, name: "" },
      {},
    ]) {
      const res = await post(body);
      expect(res.status).toBe(400);
    }
    expect(db.create).not.toHaveBeenCalled();
  });

  it("laisse remonter une panne de base au lieu de la faire passer pour un succès", async () => {
    db.create.mockRejectedValue(new Error("base injoignable"));

    const res = await post(valid);

    expect(res.status).toBe(500);
  });

  it("coupe le robinet après 5 inscriptions depuis la même adresse", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await post({ ...valid, email: `membre${i}@exemple.fr` })).status).toBe(202);
    }

    const res = await post({ ...valid, email: "membre5@exemple.fr" });
    expect(res.status).toBe(429);
  });
});
