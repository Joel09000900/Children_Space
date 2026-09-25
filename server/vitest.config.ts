import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Les tests ne touchent pas la base, mais le client Prisma exige la variable au chargement
    env: { DATABASE_URL: "postgresql://olikrys:olikrys@localhost:5432/olikrys_test?schema=public" },
  },
});
