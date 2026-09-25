import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/error";
import { requireAdmin, toUserDTO } from "../lib/auth";
import { buildSignupSeries, periodBounds } from "../lib/stats";
import { toContactMessageDTO } from "../lib/contactMessage";

const router = Router();
router.use(requireAdmin);

const statsQuery = z.object({
  days: z.enum(["7", "30", "90"]).default("30").transform(Number),
});

/** GET /api/admin/stats?days=7|30|90 : inscriptions de membres sur la période */
router.get("/stats", async (req, res) => {
  const { days } = statsQuery.parse(req.query);
  const { start, previousStart } = periodBounds(days);

  const members = { role: "MEMBER" } as const;
  const [totalMembers, before, previousPeriodSignups, recent, latest] = await prisma.$transaction([
    prisma.user.count({ where: members }),
    prisma.user.count({ where: { ...members, createdAt: { lt: start } } }),
    prisma.user.count({ where: { ...members, createdAt: { gte: previousStart, lt: start } } }),
    prisma.user.findMany({ where: { ...members, createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.user.findMany({ where: members, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const series = buildSignupSeries({
    start,
    days,
    before,
    createdAts: recent.map((r) => r.createdAt),
  });

  res.json({
    data: {
      days,
      totalMembers,
      periodSignups: recent.length,
      previousPeriodSignups,
      series,
      latest: latest.map(toUserDTO),
    },
  });
});

/** Statuts acceptés par le tableau de bord (ARCHIVED sert de corbeille douce) */
const statusUpdate = z.object({ status: z.enum(["NEW", "READ", "ARCHIVED"]) });
const messagesQuery = z.object({
  status: z.enum(["NEW", "READ", "ARCHIVED", "ALL"]).default("ALL"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/** GET /api/admin/messages — messages du formulaire de contact, du plus récent au plus ancien */
router.get("/messages", async (req, res) => {
  const { status, limit } = messagesQuery.parse(req.query);
  const where = status === "ALL" ? {} : { status };

  const [rows, unread] = await prisma.$transaction([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
  ]);

  res.json({ data: rows.map(toContactMessageDTO), meta: { unread } });
});

/** PATCH /api/admin/messages/:id — marquer lu, non lu ou archivé */
router.patch("/messages/:id", async (req, res) => {
  const { status } = statusUpdate.parse(req.body);
  const updated = await prisma.contactMessage
    .update({
      where: { id: req.params.id },
      data: { status },
      include: { user: { select: { id: true, name: true } } },
    })
    // P2025 : Prisma lève quand la ligne visée n'existe pas (message déjà supprimé ailleurs)
    .catch(() => {
      throw new HttpError(404, "Message introuvable");
    });

  res.json({ data: toContactMessageDTO(updated) });
});

export default router;
