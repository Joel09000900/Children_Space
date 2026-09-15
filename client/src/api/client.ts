import type { AboutData, Artwork, Collection, Paginated, Settings } from "./types";

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  artworks: (params: { collection?: string; q?: string } = {}, signal?: AbortSignal) => {
    const qs = new URLSearchParams();
    if (params.collection && params.collection !== "all") qs.set("collection", params.collection);
    if (params.q) qs.set("q", params.q);
    const suffix = qs.toString() ? `?${qs}` : "";
    return get<Paginated<Artwork>>(`/artworks${suffix}`, signal);
  },
  collections: (signal?: AbortSignal) => get<{ data: Collection[] }>("/collections", signal).then((r) => r.data),
  settings: (signal?: AbortSignal) => get<{ data: Settings }>("/settings", signal).then((r) => r.data),
  about: (signal?: AbortSignal) => get<{ data: AboutData }>("/about", signal).then((r) => r.data),
};
