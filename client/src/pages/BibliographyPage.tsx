import { Link } from "react-router-dom";
import { FiBookOpen, FiExternalLink } from "react-icons/fi";
import { api } from "../api/client";
import type { Publication, PublicationKind } from "../api/types";
import { useAsync } from "../hooks/useAsync";
import { useReveal } from "../hooks/useReveal";
import { useSite } from "../context/SiteContext";

const KIND_LABELS: Record<PublicationKind, string> = {
  BOOK: "Livre",
  CATALOGUE: "Catalogue",
  ARTICLE: "Article",
  INTERVIEW: "Entretien",
};

/** Ordre d'affichage du décompte par nature, indépendant de l'ordre des données */
const KIND_ORDER: PublicationKind[] = ["BOOK", "CATALOGUE", "ARTICLE", "INTERVIEW"];

const PORTRAIT = "/images/olikrys.png";

/** Décompte par nature, en ne gardant que les catégories réellement présentes */
function countByKind(publications: Publication[]) {
  return KIND_ORDER.map((kind) => ({
    kind,
    count: publications.filter((p) => p.kind === kind).length,
  })).filter((entry) => entry.count > 0);
}

export default function BibliographyPage() {
  const { artistName, settings } = useSite();
  const { data, loading, error } = useAsync((s) => api.publications(s), []);
  useReveal([data]);

  if (loading) return <p className="state state--page">Chargement…</p>;
  if (error || !data) return <p className="state state--page state--error">Impossible de charger la page : {error}</p>;

  // Les publications arrivent déjà triées, de la plus récente à la plus ancienne
  const years = [...new Set(data.map((p) => p.year))];
  const kinds = countByKind(data);
  const span = years.length > 1 ? `${years[years.length - 1]} – ${years[0]}` : years[0];

  return (
    <div className="biblio">
      <header className="section biblio__hero">
        <figure className="biblio__portrait reveal">
          <span className="corner corner--tl" aria-hidden="true" />
          <img
            src={PORTRAIT}
            alt={`Portrait de ${artistName}`}
            width={305}
            height={464}
            loading="eager"
            decoding="async"
          />
          <span className="corner corner--br" aria-hidden="true" />
          <figcaption>
            {artistName}
            <span>{settings.artist_role || "Artiste peintre"}</span>
          </figcaption>
        </figure>

        <div className="biblio__intro reveal">
          <p className="eyebrow eyebrow--wide">Publications</p>
          <h1 className="page-title">Bibliographie</h1>
          <p className="lead">
            Livres, catalogues, articles et entretiens consacrés au travail de {artistName}.
          </p>
          {settings.about_intro && <p className="prose">{settings.about_intro}</p>}

          <dl className="biblio__figures">
            <div>
              <dt>Références</dt>
              <dd>{data.length}</dd>
            </div>
            {span && (
              <div>
                <dt>Période couverte</dt>
                <dd>{span}</dd>
              </div>
            )}
            {kinds.map(({ kind, count }) => (
              <div key={kind}>
                <dt>{KIND_LABELS[kind]}{count > 1 ? "s" : ""}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>

          <p className="biblio__contact">
            Une référence manque à cette liste ?{" "}
            <Link to="/contact">Signalez-la depuis la page contact</Link>.
          </p>
        </div>
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
                        <a href={p.url} target="_blank" rel="noreferrer">
                          {p.title}
                          <FiExternalLink aria-hidden="true" />
                        </a>
                      ) : (
                        p.title
                      )}
                    </h3>
                    <p className="biblio__meta">
                      <FiBookOpen aria-hidden="true" />
                      {[p.author, p.source].filter(Boolean).join(" · ")}
                    </p>
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
