import { describe, expect, it } from "vitest";
import { allowedOrigins } from "../src/app";

describe("origines CORS autorisées", () => {
  it("retombe sur localhost:5173 en développement", () => {
    expect(allowedOrigins({ NODE_ENV: "development" })).toContain("http://localhost:5173");
  });

  it("découpe et nettoie la liste configurée", () => {
    expect(allowedOrigins({ CLIENT_ORIGIN: " https://olikrys.art , https://www.olikrys.art " })).toEqual([
      "https://olikrys.art",
      "https://www.olikrys.art",
    ]);
  });

  it("refuse de démarrer en production sans CLIENT_ORIGIN", () => {
    // Avec credentials: true, refléter n'importe quelle origine permettrait de voler la session
    expect(() => allowedOrigins({ NODE_ENV: "production" })).toThrow(/CLIENT_ORIGIN est obligatoire/);
    expect(() => allowedOrigins({ NODE_ENV: "production", CLIENT_ORIGIN: "  " })).toThrow(/CLIENT_ORIGIN/);
  });

  it("n'autorise jamais « toutes les origines » en production", () => {
    const origins = allowedOrigins({ NODE_ENV: "production", CLIENT_ORIGIN: "https://olikrys.art" });
    expect(origins).toEqual(["https://olikrys.art"]);
    expect(origins).not.toContain("*");
  });
});
