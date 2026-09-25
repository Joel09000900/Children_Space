import { describe, expect, it } from "vitest";
import { buildSignupSeries, dayKey, periodBounds } from "../src/lib/stats";
import { demoMembers } from "../src/lib/demoMembers";

const NOW = new Date("2026-09-25T14:30:00.000Z");

describe("bornes de période", () => {
  it("couvre exactement 7 jours en incluant aujourd'hui", () => {
    const { start } = periodBounds(7, NOW);
    expect(dayKey(start)).toBe("2026-09-19");
    expect(start.toISOString()).toBe("2026-09-19T00:00:00.000Z");
  });

  it("place la période précédente juste avant", () => {
    const { start, previousStart } = periodBounds(30, NOW);
    expect(dayKey(start)).toBe("2026-08-27");
    expect(dayKey(previousStart)).toBe("2026-07-28");
  });
});

describe("série d'inscriptions", () => {
  it("produit une entrée par jour, même sans inscription", () => {
    const { start } = periodBounds(7, NOW);
    const series = buildSignupSeries({ start, days: 7, before: 0, createdAts: [] });
    expect(series).toHaveLength(7);
    expect(series.map((p) => p.date)).toEqual([
      "2026-09-19",
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
    ]);
    expect(series.every((p) => p.signups === 0)).toBe(true);
  });

  it("cumule les membres en partant de l'existant", () => {
    const { start } = periodBounds(3, NOW);
    const series = buildSignupSeries({
      start,
      days: 3,
      before: 10,
      createdAts: [new Date("2026-09-23T10:00:00Z"), new Date("2026-09-23T18:00:00Z"), new Date("2026-09-25T09:00:00Z")],
    });
    expect(series).toEqual([
      { date: "2026-09-23", signups: 2, members: 12 },
      { date: "2026-09-24", signups: 0, members: 12 },
      { date: "2026-09-25", signups: 1, members: 13 },
    ]);
  });

  it("ne perd aucune inscription : le dernier cumul vaut l'existant plus le total", () => {
    const { start } = periodBounds(30, NOW);
    const createdAts = demoMembers(NOW)
      .map((m) => m.createdAt)
      .filter((d) => d >= start);
    const series = buildSignupSeries({ start, days: 30, before: 5, createdAts });
    expect(series.at(-1)!.members).toBe(5 + createdAts.length);
    expect(series.reduce((sum, p) => sum + p.signups, 0)).toBe(createdAts.length);
  });

  it("garde un cumul croissant", () => {
    const { start } = periodBounds(90, NOW);
    const series = buildSignupSeries({
      start,
      days: 90,
      before: 0,
      createdAts: demoMembers(NOW).map((m) => m.createdAt),
    });
    expect(series).toHaveLength(90);
    for (let i = 1; i < series.length; i++) {
      expect(series[i].members).toBeGreaterThanOrEqual(series[i - 1].members);
    }
    expect(series.at(-1)!.members).toBe(20);
  });
});
