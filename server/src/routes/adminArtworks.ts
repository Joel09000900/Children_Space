import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/error";
import { toArtworkDTO } from "../lib/serializers";

/**
 * Écriture des œuvres, réservée à l'administrateur.
 *
 * Monté sous /api/admin, qui applique déjà `requireAdmin` : ce routeur n'a pas
 * à revérifier la session, mais il ne doit jamais être monté ailleurs.
 */
const router = Router();

/** Même borne que `title` côté bibliographie : une légende doit rester lisible sous l'œuvre */
const titlePatch = z.object({
  title: z.string().trim().min(2, "Titre trop court").max(200),
});

/**
 * PATCH /api/admin/artworks/:id — renomme une œuvre.
 *
 * Le `slug` n'est volontairement pas recalculé : il sert d'identifiant dans
 * l'URL partageable (?oeuvre=slug). Le régénérer à chaque correction de titre
 * casserait les liens déjà envoyés, pour un gain purement cosmétique.
 */
router.patch("/:id", async (req, res) => {
  const data = titlePatch.parse(req.body);
  const updated = await prisma.artwork
    .update({
      where: { id: req.params.id },
      data,
      include: { collection: true, technique: true },
    })
    // P2025 : Prisma lève quand la ligne visée n'existe pas (œuvre supprimée ailleurs)
    .catch(() => {
      throw new HttpError(404, "Œuvre introuvable");
    });

  res.json({ data: toArtworkDTO(updated) });
});

export default router;
