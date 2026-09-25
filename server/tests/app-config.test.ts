import { describe, expect, it } from "vitest";
import { trustProxySetting } from "../src/app";

describe("confiance accordée au reverse proxy", () => {
  it("ne fait confiance à personne par défaut", () => {
    // Faire confiance à X-Forwarded-For sans proxy devant rendrait l'IP falsifiable,
    // donc la limitation de tentatives contournable.
    expect(trustProxySetting({})).toBe(false);
    expect(trustProxySetting({ TRUST_PROXY: "" })).toBe(false);
    expect(trustProxySetting({ TRUST_PROXY: "false" })).toBe(false);
  });

  it("accepte un nombre de sauts", () => {
    expect(trustProxySetting({ TRUST_PROXY: "1" })).toBe(1);
    expect(trustProxySetting({ TRUST_PROXY: " 2 " })).toBe(2);
    expect(trustProxySetting({ TRUST_PROXY: "0" })).toBe(0);
  });

  it("accepte true et une liste d'adresses de confiance", () => {
    expect(trustProxySetting({ TRUST_PROXY: "true" })).toBe(true);
    expect(trustProxySetting({ TRUST_PROXY: "10.0.0.1, 10.0.0.2" })).toBe("10.0.0.1, 10.0.0.2");
  });

  it("ne transforme jamais une valeur invalide en confiance totale", () => {
    expect(trustProxySetting({ TRUST_PROXY: "-1" })).not.toBe(true);
    expect(trustProxySetting({ TRUST_PROXY: "oui" })).not.toBe(true);
  });
});
