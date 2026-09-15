import { useEffect, useRef } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { Artwork } from "../api/types";

interface Props {
  artworks: Artwork[];
  index: number;
  onIndexChange: (i: number) => void;
  onOpen: (i: number) => void;
}

/** Carrousel « salle d'exposition » : l'œuvre centrale est encadrée, les voisines s'estompent */
export default function ArtworkSlider({ artworks, index, onIndexChange, onOpen }: Props) {
  const touchX = useRef<number | null>(null);
  const count = artworks.length;
  const go = (i: number) => onIndexChange((i + count) % count);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.body.classList.contains("modal-open")) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (count === 0) return null;

  return (
    <section className="slider" aria-roledescription="carrousel" aria-label="Œuvres">
      <div
        className="slider__stage"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        {artworks.map((a, i) => {
          // Distance circulaire à l'œuvre active (-2 … 2)
          let offset = i - index;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;
          const hidden = Math.abs(offset) > 2;
          return (
            <figure
              key={a.id}
              className={`slide ${offset === 0 ? "slide--active" : ""}`}
              style={{ "--offset": offset, "--abs": Math.abs(offset) } as React.CSSProperties}
              aria-hidden={offset !== 0}
              hidden={hidden}
            >
              <button
                className="frame"
                data-cursor="art"
                tabIndex={offset === 0 ? 0 : -1}
                onClick={() => (offset === 0 ? onOpen(i) : go(i))}
                aria-label={offset === 0 ? `Voir le détail de « ${a.title} »` : `Afficher « ${a.title} »`}
              >
                <img src={a.imageUrl} alt={a.title} loading={Math.abs(offset) <= 1 ? "eager" : "lazy"} />
              </button>
              <figcaption>
                <strong>{a.title}</strong>
                <small>{[a.collection?.name, a.year].filter(Boolean).join(" · ")}</small>
              </figcaption>
            </figure>
          );
        })}

        <button className="slider__nav slider__nav--prev" onClick={() => go(index - 1)} aria-label="Œuvre précédente">
          <FiChevronLeft />
        </button>
        <button className="slider__nav slider__nav--next" onClick={() => go(index + 1)} aria-label="Œuvre suivante">
          <FiChevronRight />
        </button>
      </div>

      <div className="slider__footer">
        <div className="slider__dots">
          {artworks.map((a, i) => (
            <button key={a.id} className={i === index ? "is-active" : ""} onClick={() => go(i)} aria-label={`Aller à l'œuvre ${i + 1}`} />
          ))}
        </div>
        <span className="slider__count">
          {index + 1} <span>/</span> {count}
        </span>
      </div>
    </section>
  );
}
