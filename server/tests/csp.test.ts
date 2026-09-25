import { describe, expect, it } from "vitest";
import { cspDirectives } from "../src/app";

describe("politique de sécurité du contenu", () => {
  it("n'autorise aucun script en ligne ni eval", () => {
    // C'est la directive qui compte réellement contre les injections
    const scriptSrc = cspDirectives()["script-src"];
    expect(scriptSrc).toEqual(["'self'"]);
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("autorise les images Unsplash et les polices Google utilisées par le site", () => {
    const d = cspDirectives();
    expect(d["img-src"]).toContain("https://images.unsplash.com");
    expect(d["style-src"]).toContain("https://fonts.googleapis.com");
    expect(d["font-src"]).toContain("https://fonts.gstatic.com");
  });

  it("interdit l'affichage du site dans une iframe tierce", () => {
    expect(cspDirectives()["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("verrouille les vecteurs d'injection restants", () => {
    const d = cspDirectives();
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["form-action"]).toEqual(["'self'"]);
    expect(d["default-src"]).toEqual(["'self'"]);
  });

  it("n'ouvre aucune directive à un joker", () => {
    for (const [directive, sources] of Object.entries(cspDirectives())) {
      expect(sources, directive).not.toContain("*");
      expect(sources, directive).not.toContain("https:");
    }
  });
});
