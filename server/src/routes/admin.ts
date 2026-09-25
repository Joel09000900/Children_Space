import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin, toUserDTO } from "../lib/auth";
import { buildSignupSeries, periodBounds } from "../lib/stats";

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

export default router;
