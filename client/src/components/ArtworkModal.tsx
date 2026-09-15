import { useEffect, useRef } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa6";
import type { Artwork } from "../api/types";
import { useSite } from "../context/SiteContext";
import { whatsappLink } from "../lib/contact";

interface Props {
  artwork: Artwork;
  position: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function ArtworkModal({ artwork, position, total, onClose, onPrev, onNext }: Props) {
  const { artistName, settings } = useSite();
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.classList.add("modal-open");
    closeBtn.current?.focus();
    return () => document.body.classList.remove("modal-open");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__panel" key={artwork.id}>
        <button ref={closeBtn} className="icon-btn modal__close" onClick={onClose} aria-label="Fermer">
          <FiX />
        </button>

        <div className="modal__media">
          <img src={artwork.imageUrl} alt={artwork.title} />
        </div>

        <div className="modal__content">
          {artwork.collection && (
            <p className="eyebrow" style={{ color: artwork.collection.color }}>
              {artwork.collection.name}
            </p>
          )}
          <h2 id="modal-title" className="modal__title">{artwork.title}</h2>

          <dl className="specs">
            <div><dt>Technique</dt><dd>{artwork.technique ?? "—"}</dd></div>
            <div><dt>Dimensions</dt><dd>{artwork.dimensions ?? "—"}</dd></div>
            <div><dt>Année</dt><dd>{artwork.year ?? "—"}</dd></div>
          </dl>

          <p className="modal__description">{artwork.description}</p>

          <a
            className="btn btn--whatsapp btn--block"
            href={whatsappLink(settings.whatsapp_number, artistName, artwork.title)}
            target="_blank"
            rel="noreferrer"
          >
            <FaWhatsapp /> Demander des informations
          </a>

          <div className="modal__nav">
            <button className="btn btn--ghost" onClick={onPrev}><FiChevronLeft /> Précédente</button>
            <span>{position + 1} / {total}</span>
            <button className="btn btn--ghost" onClick={onNext}>Suivante <FiChevronRight /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
