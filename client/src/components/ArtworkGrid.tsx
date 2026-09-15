import type { Artwork } from "../api/types";

export default function ArtworkGrid({ artworks, onOpen }: { artworks: Artwork[]; onOpen: (i: number) => void }) {
  return (
    <section className="grid" aria-label="Œuvres en grille">
      {artworks.map((a, i) => (
        <article key={a.id} className="card reveal" style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
          <button className="card__button" data-cursor="art" onClick={() => onOpen(i)} aria-label={`Voir « ${a.title} »`}>
            <div className="card__media">
              <img src={a.thumbUrl} alt={a.title} loading="lazy" />
              {a.featured && <span className="card__badge">Coup de cœur</span>}
            </div>
            <div className="card__body">
              <p className="eyebrow">{a.collection?.name}</p>
              <h3 className="card__title">{a.title}</h3>
              <p className="card__meta">{[a.technique, a.year].filter(Boolean).join(" · ")}</p>
            </div>
          </button>
        </article>
      ))}
    </section>
  );
}
