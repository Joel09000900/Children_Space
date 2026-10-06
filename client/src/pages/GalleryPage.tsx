import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiArrowDown, FiEdit2 } from "react-icons/fi";
import { api } from "../api/client";
import type { Artwork } from "../api/types";
import { useAsync } from "../hooks/useAsync";
import { useReveal } from "../hooks/useReveal";
import { useSite } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { storage } from "../lib/storage";
import { heroText } from "../lib/siteText";
import Particles from "../components/Particles";
import FilterBar, { type ViewMode } from "../components/FilterBar";
import ArtworkSlider from "../components/ArtworkSlider";
import ArtworkGrid from "../components/ArtworkGrid";
import ArtworkModal from "../components/ArtworkModal";
import ContactCTA from "../components/ContactCTA";
import HeroTitlesForm from "../components/HeroTitlesForm";

export default function GalleryPage() {
  const { artistName, settings, saveSettings } = useSite();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<ViewMode>(() => (storage.get("olikrys-view") === "grid" ? "grid" : "slider"));
  const [index, setIndex] = useState(0);
  const [editingTitles, setEditingTitles] = useState(false);
  /**
   * Copie de travail des œuvres, alimentée par la réponse du serveur après un
   * renommage. Elle reste à null tant que rien n'a changé : on affiche alors la
   * liste chargée telle quelle, sans passer par une liste vide le temps d'un rendu.
   */
  const [renamed, setRenamed] = useState<Artwork[] | null>(null);

  const collections = useAsync((s) => api.collections(s), []);
  // allArtworks suit la pagination : la galerie n'est plus tronquée à 50 œuvres
  const artworks = useAsync((s) => api.allArtworks({ collection: filter }, s), [filter]);
  const list: Artwork[] = useMemo(() => renamed ?? artworks.data ?? [], [renamed, artworks.data]);

  useReveal([list, view]);
  useEffect(() => storage.set("olikrys-view", view), [view]);
  // Changer de collection déclenche un nouveau chargement : la copie de travail,
  // qui décrit l'ancienne liste, doit être abandonnée avec lui.
  useEffect(() => {
    setIndex(0);
    setRenamed(null);
  }, [filter]);

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

  const isAdmin = user?.role === "ADMIN";

  /** Renommage d'une œuvre : la réponse du serveur remplace l'entrée locale */
  const rename = useCallback(
    async (id: string, title: string) => {
      const updated = await api.renameArtwork(id, title);
      setRenamed((prev) => (prev ?? artworks.data ?? []).map((a) => (a.id === id ? updated : a)));
    },
    [artworks.data],
  );
  const onRename = isAdmin ? rename : undefined;

  const enter = () => document.getElementById("galerie")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <section className="hero">
        <Particles />
        <div className="hero__glow" aria-hidden="true" />
        <div className="hero__content">
          <p className="eyebrow eyebrow--wide">{heroText(settings, "hero_eyebrow")}</p>
          <h1 className="hero__title">
            {heroText(settings, "hero_title")} <em className="text-gradient">{artistName}</em>
          </h1>
          <p className="hero__tagline">{heroText(settings, "hero_tagline")}</p>

          {editingTitles ? (
            <HeroTitlesForm
              settings={settings}
              onSave={async (patch) => {
                await saveSettings(patch);
                setEditingTitles(false);
              }}
              onCancel={() => setEditingTitles(false)}
            />
          ) : (
            <div className="hero__actions">
              <button className="btn btn--primary btn--lg" onClick={enter}>
                Entrer dans la galerie <FiArrowDown />
              </button>
              {isAdmin && (
                <button className="btn btn--outline btn--sm" type="button" onClick={() => setEditingTitles(true)}>
                  <FiEdit2 aria-hidden="true" /> Modifier les titres
                </button>
              )}
            </div>
          )}
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
            <ArtworkSlider
              artworks={list}
              index={Math.min(index, list.length - 1)}
              onIndexChange={setIndex}
              onOpen={openAt}
              onRename={onRename}
            />
          ) : (
            <ArtworkGrid artworks={list} onOpen={openAt} onRename={onRename} />
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
          onRename={onRename}
        />
      )}
    </>
  );
}
