import crypto from "node:crypto";
import { promisify } from "node:util";
import type { CookieOptions, Request, RequestHandler, Response } from "express";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError } from "../middleware/error";

const scrypt = promisify(crypto.scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = "olikrys_session";
const SESSION_DAYS = 30;
/** Longueur minimale du mot de passe admin en production */
export const MIN_PROD_ADMIN_PASSWORD = 12;
/** Le pseudo sert d'identifiant de connexion : pas d'arobase, réservée aux e-mails */
export const USERNAME_RE = /^[a-z0-9._-]{3,40}$/;

/** Hash au format scrypt$sel$clé (sel et clé en base64) */
export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  // Un hash tronqué ou illisible ne doit jamais provoquer d'exception ici
  if (expected.length === 0) return false;
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Hash d'un mot de passe aléatoire, calculé une seule fois et jamais comparé pour de vrai.
// Il sert uniquement à consommer du temps de calcul quand le compte n'existe pas.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword(crypto.randomBytes(32).toString("base64")));

/**
 * Vérifie un mot de passe en consommant la même durée, que le compte existe ou non.
 *
 * Sans cela, un identifiant inconnu renvoyait immédiatement (aucun scrypt exécuté)
 * alors qu'un identifiant connu coûtait ~350 ms : le chronomètre révélait donc
 * quels comptes existent, malgré un message d'erreur identique.
 */
export async function verifyPasswordConstantTime(password: string, stored: string | null | undefined) {
  if (stored) return verifyPassword(password, stored);
  await verifyPassword(password, await getDummyHash());
  return false;
}

/** E-mails et pseudos sont stockés en minuscules : la connexion est insensible à la casse */
export const normalizeIdentifier = (value: string) => value.trim().toLowerCase();

/** Recherche par e-mail ou par pseudo, au choix de l'utilisateur */
export const userIdentifierWhere = (identifier: string) => {
  const id = normalizeIdentifier(identifier);
  return { OR: [{ email: id }, { username: id }] };
};

/**
 * Options du cookie de session.
 * Front et API sur deux domaines différents : le navigateur n'accepte le cookie
 * que si SameSite=None ET Secure sont présents, d'où CROSS_SITE_COOKIE.
 */
export function sessionCookieOptions(env: NodeJS.ProcessEnv = process.env): CookieOptions {
  const crossSite = env.CROSS_SITE_COOKIE === "true";
  return {
    httpOnly: true,
    sameSite: crossSite ? "none" : "lax",
    secure: crossSite || env.NODE_ENV === "production",
    path: "/",
  };
}

export interface AdminConfig {
  email: string;
  password: string;
  name: string;
  username: string | null;
}

/**
 * Valide la configuration du compte admin sans toucher à la base.
 * Renvoie null si aucun compte n'est configuré, lève une erreur si la config est invalide.
 */
export function adminConfig(env: NodeJS.ProcessEnv = process.env): AdminConfig | null {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;
  if (!email || !password) return null;

  // Un mot de passe court est toléré en développement, jamais en production
  if (env.NODE_ENV === "production" && password.length < MIN_PROD_ADMIN_PASSWORD) {
    throw new Error(
      `ADMIN_PASSWORD trop faible : ${MIN_PROD_ADMIN_PASSWORD} caractères minimum en production (actuel : ${password.length})`,
    );
  }

  const username = env.ADMIN_USERNAME?.trim().toLowerCase() || null;
  if (username && !USERNAME_RE.test(username)) {
    throw new Error(
      `ADMIN_USERNAME invalide : 3 à 40 caractères parmi a-z, 0-9, point, tiret et souligné (reçu : « ${username} »)`,
    );
  }

  return { email, password, name: env.ADMIN_NAME?.trim() || "Administrateur", username };
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

function readToken(req: Request) {
  for (const part of req.headers.cookie?.split(";") ?? []) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** Ouvre une session : jeton aléatoire dans un cookie httpOnly, hash en base */
export async function startSession(res: Response, userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  res.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions(), expires: expiresAt });
}

export async function endSession(req: Request, res: Response) {
  const token = readToken(req);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
}

/**
 * Supprime les sessions périmées.
 *
 * Une session n'était retirée que si son propre jeton était réutilisé : celles des
 * visiteurs qui ne reviennent jamais restaient en base indéfiniment. Appelé au
 * démarrage, ce nettoyage suffit pour un site de cette taille.
 */
export async function purgeExpiredSessions() {
  const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  if (count > 0) console.log(`Sessions expirées supprimées : ${count}`);
  return count;
}

export async function getSessionUser(req: Request) {
  const token = readToken(req);
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Session périmée : on en profite pour la retirer au lieu de la laisser grossir la table
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
}

export const requireAdmin: RequestHandler = async (req, _res, next) => {
  const user = await getSessionUser(req);
  if (!user) throw new HttpError(401, "Connexion requise");
  if (user.role !== "ADMIN") throw new HttpError(403, "Accès réservé à l'administrateur");
  next();
};

/** Crée ou met à jour le compte admin défini dans .env (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_USERNAME) */
export async function ensureAdmin() {
  const config = adminConfig();
  if (!config) {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD absents de .env : aucun compte admin");
    return;
  }
  const { email, password, name, username } = config;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: { email, name, username, role: "ADMIN", passwordHash: await hashPassword(password) },
    });
    return;
  }

  const passwordOk = await verifyPassword(password, existing.passwordHash);
  const upToDate = existing.role === "ADMIN" && passwordOk && existing.username === username && existing.name === name;
  if (upToDate) return;

  // Le hash est calculé avant la transaction pour ne pas la garder ouverte inutilement
  const passwordHash = passwordOk ? undefined : await hashPassword(password);
  // Changement de rôle ou de mot de passe : les anciennes sessions de ce compte sont fermées
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: existing.id } }),
    prisma.user.update({
      where: { id: existing.id },
      data: { role: "ADMIN", name, username, ...(passwordHash ? { passwordHash } : {}) },
    }),
  ]);
}

export const toUserDTO = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  username: user.username,
  role: user.role,
  createdAt: user.createdAt,
});
