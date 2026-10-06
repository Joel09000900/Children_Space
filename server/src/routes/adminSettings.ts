import { Router } from "express";
import { prisma } from "../lib/prisma";
import { settingsToObject } from "../lib/serializers";
import { siteTextPatch } from "../lib/siteText";

/**
 * Textes de l'en-tête de la galerie, réservés à l'administrateur.
 *
 * Monté sous /api/admin, qui applique déjà `requireAdmin` : ce routeur n'a pas
 * à revérifier la session, mais il ne doit jamais être monté ailleurs.
 */
const router = Router();

/**
 * PATCH /api/admin/settings — enregistre les textes fournis.
 *
 * `upsert` plutôt que `update` : une clé jamais renseignée (hero_eyebrow et
 * hero_title n'existent pas dans les bases déjà semées) n'a pas de ligne à
 * modifier, et un 404 serait incompréhensible côté interface.
 *
 * La réponse renvoie l'ensemble des réglages publics : le client remplace son
 * état d'un bloc, sans second aller-retour ni fusion manuelle côté React.
 */
router.patch("/", async (req, res) => {
  const body = siteTextPatch.parse(req.body);
  const entries = Object.entries(body) as [string, string][];

  const rows = await prisma.$transaction(async (tx) => {
    for (const [key, value] of entries) {
      await tx.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    return tx.setting.findMany();
  });

  res.json({ data: settingsToObject(rows) });
});

export default router;
