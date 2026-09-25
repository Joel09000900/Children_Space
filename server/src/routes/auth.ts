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
const registerLimit = rateLimit({ max: 5, windowMs: 60 * 60_000 });

/** POST /api/auth/register : crée un compte membre et ouvre la session */
router.post("/register", registerLimit, async (req, res) => {
  const { name, email, password } = registerBody.parse(req.body);
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, "Un compte existe déjà avec cette adresse e-mail");
  }
  const passwordHash = await hashPassword(password);

  // Deux inscriptions simultanées passent toutes les deux le test ci-dessus :
  // seule la contrainte d'unicité de la base tranche.
  const user = await prisma.user.create({ data: { name, email, passwordHash } }).catch((err) => {
    if (isUniqueViolation(err)) throw new HttpError(409, "Un compte existe déjà avec cette adresse e-mail");
    throw err;
  });

  await startSession(res, user.id);
  res.status(201).json({ data: toUserDTO(user) });
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
