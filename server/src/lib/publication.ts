import { z } from "zod";
import type { Publication } from "@prisma/client";

/** Natures de publication acceptées, dans l'ordre d'affichage de la bibliographie */
export const PUBLICATION_KINDS = ["BOOK", "CATALOGUE", "ARTICLE", "INTERVIEW"] as const;

/**
 * Bornes de l'année. La limite haute laisse passer une parution annoncée
 * (un catalogue d'exposition sort souvent avant l'année civile suivante),
 * sans autoriser la faute de frappe à quatre chiffres.
 */
export const YEAR_MIN = 1900;
export const yearMax = (now = new Date()) => now.getUTCFullYear() + 5;

/**
 * Champ texte facultatif. Un formulaire HTML n'envoie jamais `undefined` mais
 * une chaîne vide : sans cette normalisation, la base se remplirait de `""`
 * que l'affichage traite pourtant comme « renseigné » (`p.note &&` serait faux,
 * mais `[p.author, p.source].filter(Boolean)` laisserait un séparateur orphelin).
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const optionalUrl = optionalText(500).refine(
  (v) => v === null || /^https?:\/\//i.test(v),
  "L'adresse doit commencer par http:// ou https://",
);

/** Corps attendu à la création d'une référence */
export const publicationInput = z.object({
  title: z.string().trim().min(2, "Titre trop court").max(200),
  kind: z.enum(PUBLICATION_KINDS),
  source: z.string().trim().min(2, "Éditeur, revue ou média obligatoire").max(160),
  year: z.coerce
    .number()
    .int("L'année doit être un nombre entier")
    .min(YEAR_MIN, `Année antérieure à ${YEAR_MIN}`)
    .max(yearMax(), "Année trop lointaine"),
  author: optionalText(160),
  url: optionalUrl,
  note: optionalText(600),
});

/**
 * Corps attendu à la modification. `.partial()` autorise l'envoi d'un seul champ,
 * mais un objet vide ne doit pas produire un `UPDATE` sans effet qui répondrait 200
 * en laissant croire à l'administrateur que sa saisie a été prise en compte.
 */
export const publicationPatch = publicationInput
  .partial()
  .refine((body) => Object.keys(body).length > 0, "Aucun champ à modifier");

export type PublicationInput = z.infer<typeof publicationInput>;

/** `createdAt` est un détail de stockage : il n'a rien à faire dans la réponse publique */
export function toPublicationDTO({ createdAt: _createdAt, ...publication }: Publication) {
  return publication;
}
