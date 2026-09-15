import "dotenv/config";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";

const port = Number(process.env.PORT ?? 4000);
const server = createApp().listen(port, () => {
  console.log(`API OliKrys prête sur http://localhost:${port}`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
