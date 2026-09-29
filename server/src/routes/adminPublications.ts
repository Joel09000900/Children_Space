import { Router } from "express";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/error";
import { publicationInput, publicationPatch, toPublicationDTO } from "../lib/publication";

/**
 * Écriture de la bibliographie, réservée à l'administrateur.
 *
 * Monté sous /api/admin, qui applique déjà `requireAdmin` : ce routeur n'a pas
 * à revérifier la session, mais il ne doit jamais être monté ailleurs.
 */
const router = Router();

/** P2025 : Prisma signale ainsi une ligne absente (référence supprimée dans un autre onglet) */
const notFound = () => {
  throw new HttpError(404, "Référence introuvable");
};

/** POST /api/admin/publications — ajoute une référence */
router.post("/", async (req, res) => {
  const data = publicationInput.parse(req.body);
  const created = await prisma.publication.create({ data });
  res.status(201).json({ data: toPublicationDTO(created) });
});

/** PATCH /api/admin/publications/:id — modifie les champs fournis */
router.patch("/:id", async (req, res) => {
  const data = publicationPatch.parse(req.body);
  const updated = await prisma.publication
    .update({ where: { id: req.params.id }, data })
    .catch(notFound);
  res.json({ data: toPublicationDTO(updated) });
});

/** DELETE /api/admin/publications/:id — retire une référence */
router.delete("/:id", async (req, res) => {
  await prisma.publication.delete({ where: { id: req.params.id } }).catch(notFound);
  res.status(204).end();
});

export default router;
