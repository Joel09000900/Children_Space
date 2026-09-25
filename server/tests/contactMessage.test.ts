import { describe, expect, it } from "vitest";
import {
  CONTACT_LIMITS,
  HONEYPOT_FIELD,
  contactBody,
  looksAutomated,
  toContactMessageDTO,
} from "../src/lib/contactMessage";

const valid = {
  name: "Awa Traoré",
  email: "Awa.Traore@Example.com",
  subject: "Acquisition d'une toile",
  message: "Bonjour, je souhaite connaître le prix de la toile « Songes ».",
};

describe("validation du formulaire de contact", () => {
  it("accepte un message complet", () => {
    expect(contactBody.parse(valid)).toMatchObject({ name: "Awa Traoré", subject: "Acquisition d'une toile" });
  });

  it("normalise l'e-mail en minuscules et retire les espaces autour des champs", () => {
    const parsed = contactBody.parse({ ...valid, name: "  Awa Traoré  " });
    expect(parsed.email).toBe("awa.traore@example.com");
    expect(parsed.name).toBe("Awa Traoré");
  });

  it("refuse une adresse e-mail invalide", () => {
    expect(() => contactBody.parse({ ...valid, email: "pas-une-adresse" })).toThrow();
  });

  it("refuse un message trop court", () => {
    expect(() => contactBody.parse({ ...valid, message: "Bonjour" })).toThrow();
  });

  it("refuse un message au-delà de la limite, pour ne pas laisser gonfler la table", () => {
    expect(() => contactBody.parse({ ...valid, message: "a".repeat(CONTACT_LIMITS.message + 1) })).toThrow();
    expect(() => contactBody.parse({ ...valid, subject: "a".repeat(CONTACT_LIMITS.subject + 1) })).toThrow();
  });

  it("refuse les champs manquants", () => {
    for (const field of ["name", "email", "subject", "message"] as const) {
      const { [field]: _omitted, ...partial } = valid;
      expect(() => contactBody.parse(partial)).toThrow();
    }
  });
});

describe("leurre anti-robot", () => {
  it("laisse passer un envoi dont le leurre est vide ou absent", () => {
    expect(looksAutomated(contactBody.parse(valid))).toBe(false);
    expect(looksAutomated(contactBody.parse({ ...valid, [HONEYPOT_FIELD]: "" }))).toBe(false);
    expect(looksAutomated(contactBody.parse({ ...valid, [HONEYPOT_FIELD]: "   " }))).toBe(false);
  });

  it("signale un envoi dont le leurre est rempli", () => {
    expect(looksAutomated(contactBody.parse({ ...valid, [HONEYPOT_FIELD]: "http://spam.example" }))).toBe(true);
  });
});

describe("forme publique d'un message", () => {
  const row = {
    id: "msg_1",
    ...valid,
    email: "awa.traore@example.com",
    status: "NEW",
    createdAt: new Date("2026-09-25T10:00:00.000Z"),
  };

  it("expose la date en ISO et l'auteur quand il est connecté", () => {
    const dto = toContactMessageDTO({ ...row, user: { id: "u1", name: "Awa" } });
    expect(dto.createdAt).toBe("2026-09-25T10:00:00.000Z");
    expect(dto.author).toEqual({ id: "u1", name: "Awa" });
  });

  it("met l'auteur à null pour un envoi anonyme", () => {
    expect(toContactMessageDTO({ ...row, user: null }).author).toBeNull();
  });

  it("ne laisse fuiter aucun champ interne", () => {
    const dto = toContactMessageDTO({ ...row, user: null });
    expect(Object.keys(dto).sort()).toEqual(
      ["author", "createdAt", "email", "id", "message", "name", "status", "subject"].sort(),
    );
  });
});
