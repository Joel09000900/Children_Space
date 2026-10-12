import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  endSession,
  getSessionUser,
  hashPassword,
  startSession,
  toUserDTO,
  userIdentifierWhere,
  verifyPasswordConstantTime,
} from "../lib/auth";
import { HttpError, isUniqueViolation } from "../middleware/error";
import { rateLimit } from "../middleware/rateLimit";

const router = Router();

const email = z.string().trim().toLowerCase().email().max(200);
const registerBody = z.object({
  name: z.string().trim().min(1).max(80),
  email,
  password: z.string().min(8).max(200),
});
/** Connexion par pseudo OU par e-mail : un seul champ côté formulaire */
const loginBody = z.object({
  identifier: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
});

// Le compte admin peut avoir un mot de passe court en développement :
// sans cette limite, il serait cassable en quelques secondes.
const loginLimit = rateLimit({
  max: 10,
  windowMs: 10 * 60_000,
  message: "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
});
// Exporté comme `contactLimit` : le compteur vit dans le module, les tests
// doivent pouvoir le remettre à zéro entre deux cas.
export const registerLimit = rateLimit({ max: 5, windowMs: 60 * 60_000 });

/**
 * POST /api/auth/register : crée un compte membre.
 *
 * La réponse est volontairement la même, que l'adresse soit libre ou déjà prise,
 * et aucune session n'est ouverte. Un 409 « un compte existe déjà » disait à qui
 * le demandait quelles adresses sont inscrites — exactement ce que la connexion
 * prend grand soin de taire, message générique et durée constante comprises.
 * Ouvrir la session seulement dans un cas aurait été tout aussi bavard : la
 * présence du cookie suffit à distinguer les deux issues.
 *
 * L'énumération n'est pas close pour autant : qui s'inscrit sur une adresse
 * libre s'en aperçoit en se connectant juste après. La fermer complètement
 * suppose de n'activer le compte qu'après vérification de l'adresse, donc un
 * service d'envoi d'e-mails que le site n'a pas encore.
 */
router.post("/register", registerLimit, async (req, res) => {
  const { name, email, password } = registerBody.parse(req.body);

  // Haché dans tous les cas : ne calculer le scrypt que pour une adresse libre
  // rendrait la durée de réponse aussi explicite que l'ancien 409.
  const passwordHash = await hashPassword(password);

  // Adresse déjà prise : on n'écrit rien et on n'en dit rien. La contrainte
  // d'unicité de la base tranche seule, y compris entre deux envois simultanés.
  await prisma.user.create({ data: { name, email, passwordHash } }).catch((err) => {
    if (!isUniqueViolation(err)) throw err;
  });

  res.status(202).json({ data: { registered: true } });
});

/** POST /api/auth/login — `identifier` accepte le pseudo ou l'e-mail */
router.post("/login", loginLimit, async (req, res) => {
  const { identifier, password } = loginBody.parse(req.body);
  const user = await prisma.user.findFirst({ where: userIdentifierWhere(identifier) });
  // La vérification est lancée dans tous les cas, y compris sans compte trouvé :
  // le temps de réponse ne doit pas trahir l'existence de l'identifiant.
  const passwordOk = await verifyPasswordConstantTime(password, user?.passwordHash);
  if (!user || !passwordOk) {
    throw new HttpError(401, "Identifiant ou mot de passe incorrect");
  }
  await startSession(res, user.id);
  res.json({ data: toUserDTO(user) });
});

/** POST /api/auth/logout */
router.post("/logout", async (req, res) => {
  await endSession(req, res);
  res.status(204).end();
});

/** GET /api/auth/me : compte connecté, ou null */
router.get("/me", async (req, res) => {
  const user = await getSessionUser(req);
  res.json({ data: user ? toUserDTO(user) : null });
});

export default router;
