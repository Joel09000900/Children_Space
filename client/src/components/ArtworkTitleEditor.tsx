import { useState, type FormEvent } from "react";
import { FiCheck, FiEdit2, FiX } from "react-icons/fi";

/** Même borne que `PATCH /api/admin/artworks/:id`, qui reste seul juge */
const TITLE_MAX = 200;

export type RenameArtwork = (title: string) => Promise<void>;

interface Props {
  title: string;
  onRename: RenameArtwork;
}

/**
 * Renommage d'une œuvre depuis la galerie publique, réservé à l'administrateur.
 *
 * Le composant porte son propre état d'édition : chaque emplacement (carrousel,
 * grille, modale) s'ouvre et se referme indépendamment, sans que la page ait à
 * suivre quelle œuvre est en cours de modification.
 */
export default function ArtworkTitleEditor({ title, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new FormData(event.currentTarget).get("title");
    const value = String(next ?? "").trim();
    if (!value || value === title) {
      setEditing(false);
      setError(null);
      return;
    }

    setPending(true);
    setError(null);
    try {
      await onRename(value);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <button
        className="btn btn--outline btn--sm title-editor__open"
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Renommer « ${title} »`}
      >
        <FiEdit2 aria-hidden="true" /> Renommer
      </button>
    );
  }

  return (
    <form className="title-editor" onSubmit={onSubmit}>
      <input
        name="title"
        type="text"
        // autoFocus : le bouton qui vient de disparaître avait le focus, sans cela
        // il retombe sur le <body> et le champ demande un clic de plus.
        autoFocus
        required
        minLength={2}
        maxLength={TITLE_MAX}
        defaultValue={title}
        aria-label="Titre de l'œuvre"
        disabled={pending}
      />
      <div className="title-editor__actions">
        <button className="btn btn--primary btn--sm" type="submit" disabled={pending}>
          <FiCheck aria-hidden="true" /> {pending ? "…" : "Enregistrer"}
        </button>
        <button
          className="btn btn--outline btn--sm"
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          disabled={pending}
        >
          <FiX aria-hidden="true" /> Annuler
        </button>
      </div>
      {error && <p className="auth__message auth__message--error" role="alert">{error}</p>}
    </form>
  );
}
