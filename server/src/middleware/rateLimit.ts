import type { RequestHandler } from "express";
import { HttpError } from "./error";

/**
 * Compteur à fenêtre glissante, en mémoire.
 * Suffisant pour un seul processus : protège la connexion du bourrinage de mots de passe.
 * Derrière plusieurs instances, il faudra un stockage partagé (Redis).
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Enregistre une tentative. Renvoie false si le quota est dépassé. */
  check(key: string, now: number = Date.now()) {
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

  /** Secondes à attendre avant une nouvelle tentative */
  retryAfter(key: string, now: number = Date.now()) {
    const recent = this.hits.get(key) ?? [];
    if (!recent.length) return 0;
    return Math.max(0, Math.ceil((recent[0] + this.windowMs - now) / 1000));
  }

  reset(key?: string) {
    if (key === undefined) this.hits.clear();
    else this.hits.delete(key);
  }
}

/** Limite les tentatives par adresse IP */
export function rateLimit(options: { max: number; windowMs: number; message?: string }): RequestHandler {
  const limiter = new RateLimiter(options.max, options.windowMs);
  const message = options.message ?? "Trop de tentatives, merci de patienter avant de réessayer.";

  return (req, res, next) => {
    const key = req.ip ?? "inconnu";
    if (limiter.check(key)) return next();
    res.setHeader("Retry-After", String(limiter.retryAfter(key)));
    throw new HttpError(429, message);
  };
}
