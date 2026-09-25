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

export type PublicationKind = "BOOK" | "CATALOGUE" | "ARTICLE" | "INTERVIEW";

export interface Publication {
  id: string;
  title: string;
  kind: PublicationKind;
  author: string | null;
  source: string;
  year: number;
  url: string | null;
  note: string | null;
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

export type Role = "ADMIN" | "MEMBER";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Pseudo de connexion, renseigné pour l'admin */
  username: string | null;
  role: Role;
  createdAt: string;
}

export interface SignupPoint {
  date: string; // AAAA-MM-JJ
  signups: number;
  members: number;
}

export interface AdminStats {
  days: number;
  totalMembers: number;
  periodSignups: number;
  previousPeriodSignups: number;
  series: SignupPoint[];
  latest: User[];
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}
