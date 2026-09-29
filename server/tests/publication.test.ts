import { describe, expect, it } from "vitest";
import {
  PUBLICATION_KINDS,
  YEAR_MIN,
  publicationInput,
  publicationPatch,
  toPublicationDTO,
  yearMax,
} from "../src/lib/publication";

/** Référence minimale valide, à moduler dans chaque cas */
const base = { title: "Regards d'enfance", kind: "BOOK", source: "Éditions du Soir", year: 2024 };

describe("publicationInput", () => {
  it("accepte une référence minimale et comble les champs facultatifs par null", () => {
    const parsed = publicationInput.parse(base);
    expect(parsed).toEqual({ ...base, author: null, url: null, note: null });
  });

  it("accepte les quatre natures de publication", () => {
    for (const kind of PUBLICATION_KINDS) {
      expect(publicationInput.parse({ ...base, kind }).kind).toBe(kind);
    }
  });

  it("refuse une nature inconnue", () => {
    expect(publicationInput.safeParse({ ...base, kind: "THESE" }).success).toBe(false);
  });

  it("supprime les espaces autour des champs", () => {
    const parsed = publicationInput.parse({ ...base, title: "  Regards  ", source: " Le Soir " });
    expect(parsed.title).toBe("Regards");
    expect(parsed.source).toBe("Le Soir");
  });

  /*
   * Un formulaire HTML envoie "" pour un champ laissé vide, jamais undefined.
   * Sans normalisation la base stockerait des chaînes vides, que l'affichage
   * de la bibliographie compte comme des valeurs renseignées.
   */
  it("ramène les champs facultatifs vides à null", () => {
    const parsed = publicationInput.parse({ ...base, author: "", url: "   ", note: "" });
    expect(parsed).toMatchObject({ author: null, url: null, note: null });
  });

  it("accepte une année transmise sous forme de chaîne", () => {
    expect(publicationInput.parse({ ...base, year: "2019" }).year).toBe(2019);
  });

  it("refuse une année hors bornes ou décimale", () => {
    expect(publicationInput.safeParse({ ...base, year: YEAR_MIN - 1 }).success).toBe(false);
    expect(publicationInput.safeParse({ ...base, year: yearMax() + 1 }).success).toBe(false);
    expect(publicationInput.safeParse({ ...base, year: 2024.5 }).success).toBe(false);
  });

  it("accepte les bornes exactes de l'année", () => {
    expect(publicationInput.safeParse({ ...base, year: YEAR_MIN }).success).toBe(true);
    expect(publicationInput.safeParse({ ...base, year: yearMax() }).success).toBe(true);
  });

  it("n'accepte que des URL http(s)", () => {
    expect(publicationInput.parse({ ...base, url: "https://exemple.fr/a" }).url).toBe("https://exemple.fr/a");
    expect(publicationInput.safeParse({ ...base, url: "exemple.fr" }).success).toBe(false);
    // Vecteur XSS classique dans un href : il ne doit jamais atteindre la base
    expect(publicationInput.safeParse({ ...base, url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("refuse un titre trop court ou une source absente", () => {
    expect(publicationInput.safeParse({ ...base, title: "R" }).success).toBe(false);
    expect(publicationInput.safeParse({ ...base, source: "" }).success).toBe(false);
  });
});

describe("publicationPatch", () => {
  it("accepte une modification partielle", () => {
    expect(publicationPatch.parse({ year: 2020 })).toEqual({ year: 2020 });
  });

  // Sans ce garde-fou, un corps vide répondrait 200 sans rien avoir modifié
  it("refuse un corps vide", () => {
    expect(publicationPatch.safeParse({}).success).toBe(false);
  });

  it("applique les mêmes règles que la création", () => {
    expect(publicationPatch.safeParse({ kind: "THESE" }).success).toBe(false);
    expect(publicationPatch.safeParse({ url: "ftp://exemple.fr" }).success).toBe(false);
  });
});

describe("toPublicationDTO", () => {
  it("retire createdAt et conserve le reste", () => {
    const row = { id: "abc", ...base, kind: "BOOK" as const, author: null, url: null, note: null, createdAt: new Date() };
    const dto = toPublicationDTO(row);
    expect(dto).not.toHaveProperty("createdAt");
    expect(dto).toEqual({ id: "abc", ...base, author: null, url: null, note: null });
  });
});
