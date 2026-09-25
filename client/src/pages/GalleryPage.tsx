import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiArrowDown } from "react-icons/fi";
import { api } from "../api/client";
import type { Artwork } from "../api/types";
import { useAsync } from "../hooks/useAsync";
import { useReveal } from "../hooks/useReveal";
import { useSite } from "../context/SiteContext";
import { storage } from "../lib/storage";
import Particles from "../components/Particles";
import FilterBar, { type ViewMode } from "../components/FilterBar";
import ArtworkSlider from "../components/ArtworkSlider";
import ArtworkGrid from "../components/ArtworkGrid";
import ArtworkModal from "../components/ArtworkModal";
import ContactCTA from "../components/ContactCTA";

export default function GalleryPage() {
  const { artistName, settings } = useSite();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<ViewMode>(() => (storage.get("olikrys-view") === "grid" ? "grid" : "slider"));
  const [index, setIndex] = useState(0);

  const collections = useAsync((s) => api.collections(s), []);
  // allArtworks suit la pagination : la galerie n'est plus tronquée à 50 œuvres
  const artworks = useAsync((s) => api.allArtworks({ collection: filter }, s), [filter]);
  const list: Artwork[] = useMemo(() => artworks.data ?? [], [artworks.data]);

  useReveal([list, view]);
  useEffect(() => storage.set("olikrys-view", view), [view]);
  useEffect(() => setIndex(0), [filter]);

  // La modale est pilotée par l'URL (?oeuvre=slug) : lien partageable, retour arrière du navigateur
  const openSlug = params.get("oeuvre");
  const modalIndex = openSlug ? list.findIndex((a) => a.slug === openSlug) : -1;

  // Œuvre demandée par la recherche mais absente du filtre courant : on repasse sur « Toutes »
  useEffect(() => {
    if (openSlug && !artworks.loading && modalIndex === -1 && filter !== "all") setFilter("all");
  }, [openSlug, artworks.loading, modalIndex, filter]);

  // Slug absent de toute la galerie : sans message, la page restait muette
  const slugMissing = !!openSlug && !artworks.loading && !artworks.error && modalIndex === -1 && filter === "all";

  const openAt = useCallback(
    (i: number) => {
      const a = list[i];
      if (!a) return;
      setIndex(i);
      setParams((p) => { p.set("oeuvre", a.slug); return p; }, { replace: !!openSlug });
    },
    [list, openSlug, setParams],
  );
  const close = useCallback(() => setParams((p) => { p.delete("oeuvre"); return p; }), [setParams]);
  const step = useCallback((d: number) => openAt((modalIndex + d + list.length) % list.length), [openAt, modalIndex, list.length]);

  const enter = () => document.getElementById("galerie")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <section className="hero">
        <Particles />
        <div className="hero__glow" aria-hidden="true" />
        <div className="hero__content">
          <p className="eyebrow eyebrow--wide">Bienvenue dans</p>
          <h1 className="hero__title">
            La Galerie <em className="text-gradient">{artistName}</em>
          </h1>
          <p className="hero__tagline">{settings.hero_tagline}</p>
          <button className="btn btn--primary btn--lg" onClick={enter}>
            Entrer dans la galerie <FiArrowDown />
          </button>
        </div>
        <button className="hero__scroll" onClick={enter} aria-label="Faire défiler vers la galerie">
          <span />
        </button>
      </section>

      <main id="galerie" className="gallery">
        <FilterBar
          collections={collections.data ?? []}
          active={filter}
          onChange={setFilter}
          view={view}
          onViewChange={setView}
        />

        {artworks.loading && !artworks.data && <p className="state">Accrochage des œuvres…</p>}
        {artworks.error && <p className="state state--error">Impossible de charger la galerie : {artworks.error}</p>}
        {slugMissing && (
          <p className="state state--error">
            L'œuvre « {openSlug} » est introuvable.{" "}
            <button className="btn btn--ghost btn--sm" onClick={close}>
              Voir toute la galerie
            </button>
          </p>
        )}
        {!artworks.loading && !artworks.error && list.length === 0 && (
          <p className="state">Aucune œuvre dans cette collection pour le moment.</p>
        )}

        {list.length > 0 &&
          (view === "slider" ? (
            <ArtworkSlider artworks={list} index={Math.min(index, list.length - 1)} onIndexChange={setIndex} onOpen={openAt} />
          ) : (
            <ArtworkGrid artworks={list} onOpen={openAt} />
          ))}
      </main>

      <ContactCTA />

      {modalIndex >= 0 && (
        <ArtworkModal
          artwork={list[modalIndex]}
          position={modalIndex}
          total={list.length}
          onClose={close}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
        />
      )}
    </>
  );
}
