import { Router } from "express";
import { prisma } from "../lib/prisma";
import { toPublicationDTO } from "../lib/publication";

const router = Router();

/** GET /api/publications — bibliographie, de la plus récente à la plus ancienne */
router.get("/", async (_req, res) => {
  const rows = await prisma.publication.findMany({ orderBy: [{ year: "desc" }, { title: "asc" }] });
  res.json({ data: rows.map(toPublicationDTO) });
});

export default router;
