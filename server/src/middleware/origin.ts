import type { RequestHandler } from "express";
import { HttpError } from "./error";

/** Méthodes qui ne modifient rien : aucune vérification nécessaire */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Décide si une requête modifiante est acceptable au vu de son en-tête `Origin`.
 *
 * Une absence d'`Origin` est autorisée : les navigateurs l'envoient systématiquement
 * sur les requêtes non-GET, y compris same-origin. Son absence signale donc un client
 * non-navigateur (curl, application mobile, test), qui ne transporte pas de cookie
 * ambiant et n'est par nature pas exposé au CSRF.
 */
export function isOriginAllowed(origin: string | undefined, allowed: string[]) {
  if (!origin) return true;
  return allowed.includes(origin);
}

/**
 * Défense CSRF indépendante du cookie.
 *
 * `SameSite=Lax` empêche déjà le navigateur de joindre la session sur un POST
 * inter-sites, mais cette protection disparaît dès que le cookie passe en
 * `SameSite=None` (déploiement front/API sur deux domaines). Ce contrôle, lui,
 * reste valable dans les deux configurations.
 */
export function verifyOrigin(allowed: string[]): RequestHandler {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    if (isOriginAllowed(req.headers.origin, allowed)) return next();
    throw new HttpError(403, "Origine non autorisée");
  };
}
