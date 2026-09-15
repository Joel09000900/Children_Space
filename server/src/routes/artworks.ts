import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { toArtworkDTO } from "../lib/serializers";
import { HttpError } from "../middleware/error";

const router = Router();

const listQuery = z.object({
  collection: z.string().trim().optional(),
  q: z.string().trim().max(100).optional(),
  featured: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/** GET /api/artworks?collection=slug&q=texte&featured=true&page=1&limit=50 */
router.get("/", async (req, res) => {
  const { collection, q, featured, page, limit } = listQuery.parse(req.query);

  const where: Prisma.ArtworkWhereInput = {
    ...(collection && collection !== "all" ? { collection: { slug: collection } } : {}),
    ...(featured ? { featured: featured === "true" } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { technique: { name: { contains: q, mode: "insensitive" } } },
            { collection: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.artwork.count({ where }),
    prisma.artwork.findMany({
      where,
      include: { collection: true, technique: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({ data: rows.map(toArtworkDTO), meta: { total, page, limit, pages: Math.ceil(total / limit) } });
});

/** GET /api/artworks/:slug */
router.get("/:slug", async (req, res) => {
  const artwork = await prisma.artwork.findUnique({
    where: { slug: req.params.slug },
    include: { collection: true, technique: true },
  });
  if (!artwork) throw new HttpError(404, "Œuvre introuvable");
  res.json({ data: toArtworkDTO(artwork) });
});

export default router;
