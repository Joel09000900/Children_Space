import { api } from "../api/client";
import type { PublicationKind } from "../api/types";
import { useAsync } from "../hooks/useAsync";
import { useReveal } from "../hooks/useReveal";
import { useSite } from "../context/SiteContext";

const KIND_LABELS: Record<PublicationKind, string> = {
  BOOK: "Livre",
  CATALOGUE: "Catalogue",
  ARTICLE: "Article",
  INTERVIEW: "Entretien",
};

export default function BibliographyPage() {
  const { artistName } = useSite();
  const { data, loading, error } = useAsync((s) => api.publications(s), []);
  useReveal([data]);

  if (loading) return <p className="state state--page">Chargement…</p>;
  if (error || !data) return <p className="state state--page state--error">Impossible de charger la page : {error}</p>;

  // Les publications arrivent déjà triées, de la plus récente à la plus ancienne
  const years = [...new Set(data.map((p) => p.year))];

  return (
    <div className="biblio">
      <header className="section biblio__intro">
        <p className="eyebrow eyebrow--wide">Publications</p>
        <h1 className="page-title">Bibliographie</h1>
        <p className="lead">Livres, catalogues, articles et entretiens consacrés au travail de {artistName}.</p>
      </header>

      <section className="section biblio__body" aria-label="Publications par année">
        {years.length === 0 && <p className="state">Aucune publication pour le moment.</p>}
        {years.map((year) => (
          <div key={year} className="biblio__year reveal">
            <h2 className="biblio__year-title">{year}</h2>
            <ul className="biblio__list">
              {data
                .filter((p) => p.year === year)
                .map((p) => (
                  <li key={p.id} className="biblio__item">
                    <span className="tag">{KIND_LABELS[p.kind]}</span>
                    <h3>
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a>
                      ) : (
                        p.title
                      )}
                    </h3>
                    <p className="biblio__meta">{[p.author, p.source].filter(Boolean).join(" · ")}</p>
                    {p.note && <p className="biblio__note">{p.note}</p>}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
