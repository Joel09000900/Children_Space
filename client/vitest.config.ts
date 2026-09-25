import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Les modules testés sont de la logique pure : aucun DOM, aucun navigateur requis
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
