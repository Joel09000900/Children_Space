import { Router } from "express";
import { prisma } from "../lib/prisma";
import { settingsToObject } from "../lib/serializers";

const router = Router();

/** GET /api/settings — paramètres publics sous forme d'objet { clé: valeur } */
router.get("/", async (_req, res) => {
  const rows = await prisma.setting.findMany();
  res.json({ data: settingsToObject(rows) });
});

export default router;
