import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import { api } from "../api/client";
import type { Artwork } from "../api/types";
import { useSite } from "../context/SiteContext";

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useSite();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!searchOpen) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSearchOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, setSearchOpen]);

  // Recherche côté serveur avec un léger délai de frappe
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = window.setTimeout(() => {
      api
        .artworks({ q }, ctrl.signal)
        .then((r) => setResults(r.data))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  if (!searchOpen) return null;

  const open = (slug: string) => {
    setSearchOpen(false);
    setQuery("");
    navigate(`/?oeuvre=${encodeURIComponent(slug)}`);
  };

  return (
    <div className="search" role="dialog" aria-modal="true" aria-label="Recherche">
      <div className="search__backdrop" onClick={() => setSearchOpen(false)} />
      <div className="search__panel">
        <div className="search__field">
          <FiSearch aria-hidden="true" />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Titre, technique, collection…"
            aria-label="Rechercher"
          />
          <button className="icon-btn" onClick={() => setSearchOpen(false)} aria-label="Fermer la recherche">
            <FiX />
          </button>
        </div>
        <ul className="search__results">
          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <li className="search__empty">Aucune œuvre ne correspond à « {query.trim()} ».</li>
          )}
          {results.map((a) => (
            <li key={a.id}>
              <button className="search__item" onClick={() => open(a.slug)}>
                <img src={a.thumbUrl} alt="" loading="lazy" />
                <span>
                  <strong>{a.title}</strong>
                  <small>{[a.collection?.name, a.technique, a.year].filter(Boolean).join(" · ")}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
