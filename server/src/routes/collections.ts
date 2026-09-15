import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

/** GET /api/collections — collections triées, avec le nombre d'œuvres */
router.get("/", async (_req, res) => {
  const rows = await prisma.collection.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { artworks: true } } },
  });
  res.json({
    data: rows.map(({ _count, createdAt, updatedAt, ...c }) => ({ ...c, artworkCount: _count.artworks })),
  });
});

export default router;
