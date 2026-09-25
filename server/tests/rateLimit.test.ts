import { describe, expect, it } from "vitest";
import { RateLimiter } from "../src/middleware/rateLimit";

describe("limitation des tentatives", () => {
  it("laisse passer jusqu'au quota puis bloque", () => {
    const limiter = new RateLimiter(3, 60_000);
    expect(limiter.check("ip", 1000)).toBe(true);
    expect(limiter.check("ip", 1100)).toBe(true);
    expect(limiter.check("ip", 1200)).toBe(true);
    expect(limiter.check("ip", 1300)).toBe(false);
  });

  it("compte chaque adresse séparément", () => {
    const limiter = new RateLimiter(1, 60_000);
    expect(limiter.check("ip-a", 1000)).toBe(true);
    expect(limiter.check("ip-a", 1001)).toBe(false);
    expect(limiter.check("ip-b", 1002)).toBe(true);
  });

  it("rouvre l'accès une fois la fenêtre écoulée", () => {
    const limiter = new RateLimiter(2, 10_000);
    limiter.check("ip", 0);
    limiter.check("ip", 1000);
    expect(limiter.check("ip", 2000)).toBe(false);
    expect(limiter.check("ip", 11_500)).toBe(true);
  });

  it("indique le délai d'attente restant", () => {
    const limiter = new RateLimiter(1, 10_000);
    limiter.check("ip", 0);
    expect(limiter.retryAfter("ip", 3000)).toBe(7);
    expect(limiter.retryAfter("inconnue", 3000)).toBe(0);
  });

  it("oublie les adresses sorties de la fenêtre au lieu de les garder à vie", () => {
    // Sans balayage, chaque visiteur laissait une entrée définitive : sur un site
    // public exposé des mois, la table finissait par saturer la mémoire.
    const limiter = new RateLimiter(5, 10_000);
    for (let i = 0; i < 500; i++) limiter.check(`ip-${i}`, 1000);
    expect(limiter.size).toBe(500);

    // Une requête après la fenêtre déclenche le balayage
    limiter.check("ip-tardive", 30_000);
    expect(limiter.size).toBe(1);
  });

  it("ne balaie pas les adresses encore actives", () => {
    const limiter = new RateLimiter(5, 10_000);
    limiter.check("ancienne", 0);
    limiter.check("recente", 25_000);
    limiter.check("declencheur", 26_000);

    // « ancienne » est hors fenêtre, « recente » doit survivre avec son historique
    expect(limiter.size).toBe(2);
    expect(limiter.check("recente", 26_500)).toBe(true);
  });

  it("repart de zéro après reset, balayage compris", () => {
    const limiter = new RateLimiter(1, 10_000);
    limiter.check("ip", 1000);
    expect(limiter.check("ip", 1100)).toBe(false);
    limiter.reset();
    expect(limiter.size).toBe(0);
    expect(limiter.check("ip", 1200)).toBe(true);
  });

  it("protège un mot de passe faible du bourrinage", () => {
    // 10 essais par 10 minutes : « 0000 » (10 000 combinaisons) devient hors de portée
    const limiter = new RateLimiter(10, 600_000);
    let allowed = 0;
    for (let i = 0; i < 100; i++) if (limiter.check("attaquant", i * 100)) allowed++;
    expect(allowed).toBe(10);
  });
});
