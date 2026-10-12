import { describe, expect, it } from "vitest";
import { isOriginAllowed } from "../src/middleware/origin";

const ALLOWED = ["http://localhost:5173", "https://olikrys.art"];

describe("vérification de l'origine (défense CSRF)", () => {
  it("accepte une origine connue", () => {
    expect(isOriginAllowed("http://localhost:5173", ALLOWED)).toBe(true);
    expect(isOriginAllowed("https://olikrys.art", ALLOWED)).toBe(true);
  });

  it("refuse un site tiers", () => {
    // Le cas d'attaque : une page piégée poste vers l'API avec le cookie de la victime
    expect(isOriginAllowed("https://site-piege.example", ALLOWED)).toBe(false);
  });

  it("refuse un domaine qui ressemble à un domaine autorisé", () => {
    expect(isOriginAllowed("https://olikrys.art.evil.com", ALLOWED)).toBe(false);
    expect(isOriginAllowed("https://notolikrys.art", ALLOWED)).toBe(false);
  });

  it("distingue le schéma et le port", () => {
    expect(isOriginAllowed("http://olikrys.art", ALLOWED)).toBe(false);
    expect(isOriginAllowed("http://localhost:5174", ALLOWED)).toBe(false);
  });

  it("laisse passer une requête sans Origin ni cookie (client non-navigateur)", () => {
    // curl, application mobile, tests : pas de cookie ambiant, donc pas de risque CSRF
    expect(isOriginAllowed(undefined, ALLOWED)).toBe(true);
    expect(isOriginAllowed(undefined, ALLOWED, false)).toBe(true);
  });

  it("refuse une requête sans Origin qui présente malgré tout un cookie", () => {
    // Un navigateur à jour joint toujours Origin à une requête modifiante :
    // cookie sans Origin ne correspond à aucun client légitime.
    expect(isOriginAllowed(undefined, ALLOWED, true)).toBe(false);
  });

  it("vérifie l'origine même quand la requête porte un cookie", () => {
    expect(isOriginAllowed("https://olikrys.art", ALLOWED, true)).toBe(true);
    expect(isOriginAllowed("https://site-piege.example", ALLOWED, true)).toBe(false);
  });

  it("ne fait confiance à personne quand la liste est vide", () => {
    expect(isOriginAllowed("https://olikrys.art", [])).toBe(false);
  });
});
