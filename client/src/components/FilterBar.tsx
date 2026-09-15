import { FiFilter, FiGrid, FiImage } from "react-icons/fi";
import type { Collection } from "../api/types";

export type ViewMode = "slider" | "grid";

interface Props {
  collections: Collection[];
  active: string;
  onChange: (slug: string) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
}

export default function FilterBar({ collections, active, onChange, view, onViewChange }: Props) {
  return (
    <div className="filters">
      <div className="filters__inner">
        <span className="filters__label"><FiFilter aria-hidden="true" /> Collections</span>
        <div className="filters__chips" role="tablist" aria-label="Filtrer par collection">
          <button role="tab" aria-selected={active === "all"} className={`chip ${active === "all" ? "chip--active" : ""}`} onClick={() => onChange("all")}>
            Toutes les œuvres
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={active === c.slug}
              className={`chip ${active === c.slug ? "chip--active" : ""}`}
              onClick={() => onChange(c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="view-toggle" role="group" aria-label="Mode d'affichage">
          <button className={view === "slider" ? "is-active" : ""} onClick={() => onViewChange("slider")} aria-pressed={view === "slider"}>
            <FiImage aria-hidden="true" /> <span className="view-toggle__text">Galerie</span>
          </button>
          <button className={view === "grid" ? "is-active" : ""} onClick={() => onViewChange("grid")} aria-pressed={view === "grid"}>
            <FiGrid aria-hidden="true" /> <span className="view-toggle__text">Grille</span>
          </button>
        </div>
      </div>
    </div>
  );
}
