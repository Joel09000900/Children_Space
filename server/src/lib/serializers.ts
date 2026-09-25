import type { Artwork, Collection, Technique } from "@prisma/client";

type ArtworkWithRelations = Artwork & { collection: Collection | null; technique: Technique | null };

/** Forme publique d'une œuvre renvoyée par l'API */
export function toArtworkDTO(a: ArtworkWithRelations) {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    description: a.description,
    dimensions: a.dimensions,
    year: a.year,
    imageUrl: a.imageUrl,
    thumbUrl: a.thumbUrl ?? a.imageUrl,
    featured: a.featured,
    available: a.available,
    technique: a.technique?.name ?? null,
    collection: a.collection
      ? { slug: a.collection.slug, name: a.collection.name, color: a.collection.color }
      : null,
  };
}

/**
 * Préfixe réservé aux réglages internes.
 * `GET /api/settings` sert la table entière : sans cette barrière, une clé ajoutée
 * plus tard depuis Prisma Studio (jeton d'API, identifiant de service…) partirait
 * telle quelle dans la réponse publique.
 */
export const PRIVATE_SETTING_PREFIX = "private_";

/** Réglages publics, sous forme d'objet { clé: valeur } */
export function settingsToObject(rows: { key: string; value: string }[]) {
  return Object.fromEntries(
    rows.filter((r) => !r.key.startsWith(PRIVATE_SETTING_PREFIX)).map((r) => [r.key, r.value]),
  ) as Record<string, string>;
}
