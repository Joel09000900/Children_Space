import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/auth";

describe("hachage des mots de passe", () => {
  it("accepte le bon mot de passe", async () => {
    const stored = await hashPassword("0000");
    expect(await verifyPassword("0000", stored)).toBe(true);
  });

  it("refuse un mot de passe erroné", async () => {
    const stored = await hashPassword("0000");
    expect(await verifyPassword("0001", stored)).toBe(false);
  });

  it("produit un sel différent à chaque appel", async () => {
    const [a, b] = await Promise.all([hashPassword("0000"), hashPassword("0000")]);
    expect(a).not.toBe(b);
  });

  it("stocke le format scrypt$sel$clé et jamais le mot de passe en clair", async () => {
    const stored = await hashPassword("mot-de-passe-secret");
    const [scheme, salt, key] = stored.split("$");
    expect(scheme).toBe("scrypt");
    expect(Buffer.from(salt, "base64")).toHaveLength(16);
    expect(Buffer.from(key, "base64")).toHaveLength(64);
    expect(stored).not.toContain("mot-de-passe-secret");
  });

  it("refuse un hash mal formé sans lever d'exception", async () => {
    for (const bad of ["", "nimporte-quoi", "bcrypt$a$b", "scrypt$", "scrypt$sel$"]) {
      expect(await verifyPassword("0000", bad)).toBe(false);
    }
  });
});
