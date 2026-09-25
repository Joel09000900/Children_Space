import { describe, expect, it } from "vitest";
import { DEMO_MEMBER_PASSWORD, demoMembers } from "../src/lib/demoMembers";
import { buildSignupSeries, periodBounds } from "../src/lib/stats";

const NOW = new Date("2026-09-25T14:30:00.000Z");

describe("comptes de démonstration", () => {
  it("fournit exactement 20 comptes", () => {
    expect(demoMembers(NOW)).toHaveLength(20);
  });

  it("n'a ni e-mail ni nom en double", () => {
    const members = demoMembers(NOW);
    expect(new Set(members.map((m) => m.email)).size).toBe(20);
    expect(new Set(members.map((m) => m.name)).size).toBe(20);
  });

  it("date toutes les inscriptions dans le passé, sur 90 jours maximum", () => {
    const { start } = periodBounds(90, NOW);
    for (const { createdAt } of demoMembers(NOW)) {
      expect(createdAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(start.getTime());
    }
  });

  it("alimente les trois périodes du tableau de bord", () => {
    // Chacun des filtres 7 / 30 / 90 jours doit afficher des inscriptions
    for (const days of [7, 30, 90]) {
      const { start } = periodBounds(days, NOW);
      const createdAts = demoMembers(NOW)
        .map((m) => m.createdAt)
        .filter((d) => d >= start);
      const series = buildSignupSeries({ start, days, before: 0, createdAts });
      expect(createdAts.length).toBeGreaterThan(0);
      expect(series.filter((p) => p.signups > 0).length).toBeGreaterThan(0);
    }
  });

  it("répartit les inscriptions sur plusieurs jours distincts", () => {
    const { start } = periodBounds(90, NOW);
    const series = buildSignupSeries({
      start,
      days: 90,
      before: 0,
      createdAts: demoMembers(NOW).map((m) => m.createdAt),
    });
    // Sans répartition, le graphique afficherait une seule barre
    expect(series.filter((p) => p.signups > 0).length).toBeGreaterThanOrEqual(15);
  });

  it("utilise un mot de passe de démonstration conforme à l'inscription publique", () => {
    // L'inscription exige 8 caractères minimum
    expect(DEMO_MEMBER_PASSWORD.length).toBeGreaterThanOrEqual(8);
  });
});
