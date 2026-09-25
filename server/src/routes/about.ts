import { Router } from "express";
import { prisma } from "../lib/prisma";
import { settingsToObject } from "../lib/serializers";

const router = Router();

/** GET /api/about — tout ce dont la page « À propos » a besoin, en un appel */
router.get("/", async (_req, res) => {
  const [artworkCount, collections, techniques, exhibitions, firstArtwork, settingRows, portrait] = await Promise.all([
    prisma.artwork.count(),
    prisma.collection.findMany({
      orderBy: [{ position: "asc" }],
      include: { _count: { select: { artworks: true } } },
    }),
    prisma.technique.findMany({ orderBy: { mastery: "desc" } }),
    prisma.exhibition.findMany({ orderBy: { startDate: "desc" } }),
    prisma.artwork.findFirst({ where: { year: { not: null } }, orderBy: { year: "asc" }, select: { year: true } }),
    prisma.setting.findMany(),
    prisma.artwork.findFirst({ where: { featured: true }, orderBy: { position: "asc" }, select: { imageUrl: true } }),
  ]);

  const now = new Date();
  const yearsActive = firstArtwork?.year ? Math.max(1, now.getFullYear() - firstArtwork.year) : null;

  res.json({
    data: {
      settings: settingsToObject(settingRows),
      heroImage: portrait?.imageUrl ?? null,
      stats: { artworks: artworkCount, collections: collections.length, yearsActive },
      techniques: techniques.map(({ id, name, description, mastery }) => ({ id, name, description, mastery })),
      collections: collections.map(({ _count, createdAt, updatedAt, ...c }) => ({ ...c, artworkCount: _count.artworks })),
      // Champs listés un à un : `createdAt` n'a pas à sortir de l'API
      exhibitions: exhibitions.map(({ id, title, venue, city, kind, startDate, endDate }) => ({
        id,
        title,
        venue,
        city,
        kind,
        startDate,
        endDate,
        upcoming: (endDate ?? startDate) >= now,
      })),
    },
  });
});

export default router;
