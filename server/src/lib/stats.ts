/**
 * Calcul des séries d'inscriptions du tableau de bord.
 * Volontairement sans Prisma ni Express : la logique reste testable sans base de données.
 */

export interface SignupPoint {
  /** Jour au format AAAA-MM-JJ, en UTC */
  date: string;
  signups: number;
  members: number;
}

/** Jour calendaire en UTC (AAAA-MM-JJ) — le client relit la même clé en UTC */
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Bornes de la période : `start` est minuit UTC du premier jour affiché,
 * `previousStart` celui de la période équivalente juste avant (pour la comparaison).
 */
export function periodBounds(days: number, now: Date = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const previousStart = new Date(start);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  return { start, previousStart };
}

/**
 * Une entrée par jour, même sans inscription ce jour-là.
 * `members` est le cumul en fin de journée, en partant du nombre de membres existant avant `start`.
 */
export function buildSignupSeries(options: {
  start: Date;
  days: number;
  /** Nombre de membres déjà inscrits avant `start` */
  before: number;
  /** Dates de création des membres inscrits depuis `start` */
  createdAts: Date[];
}): SignupPoint[] {
  const { start, days, before, createdAts } = options;

  const perDay = new Map<string, number>();
  for (const createdAt of createdAts) {
    const key = dayKey(createdAt);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }

  let running = before;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = dayKey(d);
    const signups = perDay.get(key) ?? 0;
    running += signups;
    return { date: key, signups, members: running };
  });
}
