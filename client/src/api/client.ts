import type { AboutData, AdminStats, Artwork, Collection, Paginated, Publication, Settings, User } from "./types";

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // credentials: "include" est indispensable dès que l'API est sur un autre domaine,
  // sinon le cookie de session n'est jamais transmis et la connexion ne survit pas au rechargement.
  const res = await fetch(`${BASE}/api${path}`, { credentials: "include", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erreur ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal });

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/** Maximum accepté par l'API pour `limit` */
const PAGE_SIZE = 100;

export const api = {
  artworks: (
    params: { collection?: string; q?: string; page?: number; limit?: number } = {},
    signal?: AbortSignal,
  ) => {
    const qs = new URLSearchParams();
    if (params.collection && params.collection !== "all") qs.set("collection", params.collection);
    if (params.q) qs.set("q", params.q);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs}` : "";
    return get<Paginated<Artwork>>(`/artworks${suffix}`, signal);
  },

  /**
   * Parcourt toutes les pages. Sans cela la galerie s'arrêtait silencieusement
   * à la 50e œuvre (limite par défaut de l'API), sans aucun message.
   */
  allArtworks: async (params: { collection?: string; q?: string } = {}, signal?: AbortSignal) => {
    const first = await api.artworks({ ...params, page: 1, limit: PAGE_SIZE }, signal);
    const items = [...first.data];
    for (let page = 2; page <= first.meta.pages; page++) {
      const next = await api.artworks({ ...params, page, limit: PAGE_SIZE }, signal);
      items.push(...next.data);
    }
    return items;
  },
  collections: (signal?: AbortSignal) => get<{ data: Collection[] }>("/collections", signal).then((r) => r.data),
  settings: (signal?: AbortSignal) => get<{ data: Settings }>("/settings", signal).then((r) => r.data),
  about: (signal?: AbortSignal) => get<{ data: AboutData }>("/about", signal).then((r) => r.data),
  publications: (signal?: AbortSignal) => get<{ data: Publication[] }>("/publications", signal).then((r) => r.data),
  me: () => get<{ data: User | null }>("/auth/me").then((r) => r.data),
  register: (body: { name: string; email: string; password: string }) =>
    post<{ data: User }>("/auth/register", body).then((r) => r.data),
  login: (body: { identifier: string; password: string }) =>
    post<{ data: User }>("/auth/login", body).then((r) => r.data),
  logout: () => post<void>("/auth/logout"),
  adminStats: (days: number, signal?: AbortSignal) =>
    get<{ data: AdminStats }>(`/admin/stats?days=${days}`, signal).then((r) => r.data),
};
