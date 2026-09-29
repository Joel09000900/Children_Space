import { useState } from "react";
import { Link } from "react-router-dom";
import { FiBookOpen, FiEdit2, FiExternalLink, FiPlus, FiTrash2 } from "react-icons/fi";
import { api } from "../api/client";
import type { Publication, PublicationInput, PublicationKind } from "../api/types";
import { useAsync } from "../hooks/useAsync";
import { useReveal } from "../hooks/useReveal";
import { useSite } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import PublicationForm from "../components/PublicationForm";

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

/**
 * Reproduit l'ordre de l'API (année décroissante, puis titre) côté client.
 * Sans cela, une référence ajoutée — ou dont l'année vient de changer — resterait
 * affichée à sa position d'origine jusqu'au prochain rechargement de la page.
 */
function sortPublications(list: Publication[]) {
  return [...list].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title, "fr"));
}

export default function BibliographyPage() {
  const { artistName, settings } = useSite();
  const { user } = useAuth();
  const { data, loading, error } = useAsync((s) => api.publications(s), []);

  /**
   * Copie de travail, alimentée par les réponses du serveur après chaque écriture.
   * Elle reste à null tant que rien n'a été modifié : on affiche alors `data`
   * directement, ce qui évite le passage par une liste vide qu'un effet de
   * synchronisation aurait rempli un rendu plus tard.
   */
  const [items, setItems] = useState<Publication[] | null>(null);
  /** Identifiant de la référence en cours d'édition, ou "new" pour la création */
  const [editing, setEditing] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useReveal([data, items]);

  if (loading) return <p className="state state--page">Chargement…</p>;
  if (error || !data) return <p className="state state--page state--error">Impossible de charger la page : {error}</p>;

  const isAdmin = user?.role === "ADMIN";
  const publications = items ?? data;

  // Les publications arrivent déjà triées, de la plus récente à la plus ancienne
  const years = [...new Set(publications.map((p) => p.year))];
  const kinds = countByKind(publications);
  const span = years.length > 1 ? `${years[years.length - 1]} – ${years[0]}` : years[0];

  /** Liste de référence pour les mises à jour locales, avant toute modification */
  const current = () => items ?? data;

  async function handleCreate(body: PublicationInput) {
    const created = await api.createPublication(body);
    setItems(sortPublications([...current(), created]));
    setEditing(null);
    setActionError(null);
  }

  async function handleUpdate(id: string, body: PublicationInput) {
    const updated = await api.updatePublication(id, body);
    setItems(sortPublications(current().map((p) => (p.id === id ? updated : p))));
    setEditing(null);
    setActionError(null);
  }

  async function handleDelete(publication: Publication) {
    // La suppression est définitive en base : une confirmation explicite s'impose
    if (!window.confirm(`Supprimer « ${publication.title} » ? Cette action est définitive.`)) return;
    setBusyId(publication.id);
    setActionError(null);
    try {
      await api.deletePublication(publication.id);
      setItems(current().filter((p) => p.id !== publication.id));
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

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
            Exploration de l’innocence de l’enfant. Cette période de la vie où tout l’imaginaire est Roi.
          </p>

          <dl className="biblio__figures">
            <div>
              <dt>Références</dt>
              <dd>{publications.length}</dd>
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
        {isAdmin && (
          <div className="biblio__admin">
            <p className="biblio__admin-label">Mode administrateur — cette liste est modifiable</p>
            {editing === "new" ? (
              <PublicationForm onSave={handleCreate} onCancel={() => setEditing(null)} />
            ) : (
              <button className="btn btn--primary btn--sm" type="button" onClick={() => setEditing("new")}>
                <FiPlus aria-hidden="true" /> Ajouter une référence
              </button>
            )}
            {actionError && <p className="auth__message auth__message--error" role="alert">{actionError}</p>}
          </div>
        )}

        {years.length === 0 && <p className="state">Aucune publication pour le moment.</p>}
        {years.map((year) => (
          <div key={year} className="biblio__year reveal">
            <h2 className="biblio__year-title">{year}</h2>
            <ul className="biblio__list">
              {publications
                .filter((p) => p.year === year)
                .map((p) => (
                  <li key={p.id} className="biblio__item">
                    {editing === p.id ? (
                      <PublicationForm
                        publication={p}
                        onSave={(body) => handleUpdate(p.id, body)}
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      <>
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

                        {isAdmin && (
                          <div className="biblio__item-actions">
                            <button
                              className="btn btn--outline btn--sm"
                              type="button"
                              onClick={() => setEditing(p.id)}
                              disabled={busyId === p.id}
                            >
                              <FiEdit2 aria-hidden="true" /> Modifier
                            </button>
                            <button
                              className="btn btn--outline btn--sm biblio__danger"
                              type="button"
                              onClick={() => handleDelete(p)}
                              disabled={busyId === p.id}
                            >
                              <FiTrash2 aria-hidden="true" />
                              {busyId === p.id ? "Suppression…" : "Supprimer"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
