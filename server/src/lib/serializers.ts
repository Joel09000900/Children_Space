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

export function settingsToObject(rows: { key: string; value: string }[]) {
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
}
