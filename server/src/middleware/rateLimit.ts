import type { RequestHandler } from "express";
import { HttpError } from "./error";

/**
 * Compteur à fenêtre glissante, en mémoire.
 * Suffisant pour un seul processus : protège la connexion du bourrinage de mots de passe.
 * Derrière plusieurs instances, il faudra un stockage partagé (Redis).
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  /** Date du dernier balayage, pour ne pas parcourir la table à chaque requête */
  private lastSweep = 0;

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /**
   * Retire les adresses dont toutes les tentatives sont sorties de la fenêtre.
   *
   * Sans ce balayage, chaque adresse ayant visité le site une seule fois gardait
   * son entrée indéfiniment : sur un site public exposé des mois, la table grossit
   * jusqu'à saturer la mémoire du conteneur.
   */
  private sweep(now: number) {
    const since = now - this.windowMs;
    for (const [key, times] of this.hits) {
      if (times.length === 0 || times[times.length - 1] <= since) this.hits.delete(key);
    }
    this.lastSweep = now;
  }

  /** Enregistre une tentative. Renvoie false si le quota est dépassé. */
  check(key: string, now: number = Date.now()) {
    // Un balayage par fenêtre suffit : le coût est amorti sur toutes les requêtes
    if (now - this.lastSweep >= this.windowMs) this.sweep(now);

    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  /** Nombre d'adresses suivies — sert à vérifier que la mémoire ne fuit pas */
  get size() {
    return this.hits.size;
  }

  /** Secondes à attendre avant une nouvelle tentative */
  retryAfter(key: string, now: number = Date.now()) {
    const recent = this.hits.get(key) ?? [];
    if (!recent.length) return 0;
    return Math.max(0, Math.ceil((recent[0] + this.windowMs - now) / 1000));
  }

  reset(key?: string) {
    if (key === undefined) {
      this.hits.clear();
      this.lastSweep = 0;
    } else {
      this.hits.delete(key);
    }
  }
}

/**
 * Middleware de limitation, avec son compteur attaché.
 *
 * Le compteur est créé au chargement du module : toutes les instances d'application
 * d'un même processus le partagent. C'est voulu en production (un seul serveur),
 * mais il faut pouvoir le remettre à zéro entre deux tests, d'où `limiter` exposé.
 */
export interface RateLimitHandler extends RequestHandler {
  limiter: RateLimiter;
}

/** Limite les tentatives par adresse IP */
export function rateLimit(options: { max: number; windowMs: number; message?: string }): RateLimitHandler {
  const limiter = new RateLimiter(options.max, options.windowMs);
  const message = options.message ?? "Trop de tentatives, merci de patienter avant de réessayer.";

  const handler: RequestHandler = (req, res, next) => {
    const key = req.ip ?? "inconnu";
    if (limiter.check(key)) return next();
    res.setHeader("Retry-After", String(limiter.retryAfter(key)));
    throw new HttpError(429, message);
  };

  return Object.assign(handler, { limiter });
}
