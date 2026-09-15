export interface CollectionRef {
  slug: string;
  name: string;
  color: string;
}

export interface Artwork {
  id: string;
  slug: string;
  title: string;
  description: string;
  dimensions: string | null;
  year: number | null;
  imageUrl: string;
  thumbUrl: string;
  featured: boolean;
  available: boolean;
  technique: string | null;
  collection: CollectionRef | null;
}

export interface Collection extends CollectionRef {
  id: string;
  description: string | null;
  year: number | null;
  position: number;
  artworkCount: number;
}

export interface Technique {
  id: string;
  name: string;
  description: string | null;
  mastery: number;
}

export interface Exhibition {
  id: string;
  title: string;
  venue: string;
  city: string;
  kind: "SOLO" | "GROUP";
  startDate: string;
  endDate: string | null;
  upcoming: boolean;
}

export type Settings = Record<string, string>;

export interface AboutData {
  settings: Settings;
  heroImage: string | null;
  stats: { artworks: number; collections: number; yearsActive: number | null };
  techniques: Technique[];
  collections: Collection[];
  exhibitions: Exhibition[];
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}
