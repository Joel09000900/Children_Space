import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getSessionUser } from "../lib/auth";
import { contactBody, looksAutomated, HONEYPOT_FIELD } from "../lib/contactMessage";
import { rateLimit } from "../middleware/rateLimit";

const router = Router();

// Le formulaire est ouvert à tous : sans quota, une seule machine peut remplir la table.
export const contactLimit = rateLimit({
  max: 5,
  windowMs: 60 * 60_000,
  message: "Vous avez déjà envoyé plusieurs messages. Réessayez dans une heure.",
});

/** POST /api/contact — enregistre un message du formulaire public */
router.post("/", contactLimit, async (req, res) => {
  const body = contactBody.parse(req.body);

  // Robot détecté : on répond comme si tout s'était bien passé, sans rien écrire.
  // Lui signaler l'échec l'inciterait simplement à contourner le leurre.
  if (looksAutomated(body)) {
    res.status(201).json({ data: { received: true } });
    return;
  }

  // L'auteur connecté est rattaché au message quand il y en a un : la session n'est
  // jamais exigée, le formulaire reste accessible aux visiteurs anonymes.
  const user = await getSessionUser(req).catch(() => null);

  const { [HONEYPOT_FIELD]: _honeypot, ...data } = body;
  await prisma.contactMessage.create({ data: { ...data, userId: user?.id ?? null } });

  // On ne renvoie pas le message créé : son identifiant n'a aucune utilité côté visiteur.
  res.status(201).json({ data: { received: true } });
});

export default router;
