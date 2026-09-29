import { useState, type FormEvent } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import type { Publication, PublicationInput, PublicationKind } from "../api/types";

/** Libellés des natures, dans le même ordre que la bibliographie */
const KIND_OPTIONS: { value: PublicationKind; label: string }[] = [
  { value: "BOOK", label: "Livre" },
  { value: "CATALOGUE", label: "Catalogue" },
  { value: "ARTICLE", label: "Article" },
  { value: "INTERVIEW", label: "Entretien" },
];

/** Bornes reprises de `server/src/lib/publication.ts` : le serveur reste seul juge */
const YEAR_MIN = 1900;
const LIMITS = { title: 200, source: 160, author: 160, url: 500, note: 600 };

interface Props {
  /** Référence à modifier ; absente, le formulaire crée une nouvelle entrée */
  publication?: Publication;
  onSave: (body: PublicationInput) => Promise<void>;
  onCancel: () => void;
}

/** Un champ vide vaut « non renseigné » : le serveur attend null, pas "" */
const orNull = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return text || null;
};

export default function PublicationForm({ publication, onSave, onCancel }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const yearMax = new Date().getFullYear() + 5;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await onSave({
        title: String(form.get("title") ?? "").trim(),
        kind: String(form.get("kind")) as PublicationKind,
        source: String(form.get("source") ?? "").trim(),
        year: Number(form.get("year")),
        author: orNull(form.get("author")),
        url: orNull(form.get("url")),
        note: orNull(form.get("note")),
      });
      // Pas de setPending(false) en cas de succès : le parent démonte le formulaire
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <form className="biblio-form" onSubmit={onSubmit}>
      <p className="biblio-form__title">
        {publication ? "Modifier la référence" : "Nouvelle référence"}
      </p>

      <div className="biblio-form__row">
        <label className="field">
          Nature
          <select name="kind" defaultValue={publication?.kind ?? "ARTICLE"} required>
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Année
          <input
            name="year" type="number" required
            min={YEAR_MIN} max={yearMax} step={1}
            defaultValue={publication?.year ?? new Date().getFullYear()}
          />
        </label>
      </div>

      <label className="field">
        Titre
        <input
          name="title" type="text" required
          minLength={2} maxLength={LIMITS.title}
          defaultValue={publication?.title ?? ""}
          placeholder="Titre de la publication"
        />
      </label>

      <div className="biblio-form__row">
        <label className="field">
          Éditeur, revue ou média
          <input
            name="source" type="text" required
            minLength={2} maxLength={LIMITS.source}
            defaultValue={publication?.source ?? ""}
            placeholder="Éditions du Soir"
          />
        </label>
        <label className="field">
          Auteur <span className="field__hint">facultatif</span>
          <input
            name="author" type="text" maxLength={LIMITS.author}
            defaultValue={publication?.author ?? ""}
            placeholder="Nom de l'auteur"
          />
        </label>
      </div>

      <label className="field">
        Lien <span className="field__hint">facultatif</span>
        <input
          name="url" type="url" maxLength={LIMITS.url}
          defaultValue={publication?.url ?? ""}
          placeholder="https://exemple.fr/article"
        />
      </label>

      <label className="field">
        Note <span className="field__hint">facultatif</span>
        <textarea
          name="note" rows={3} maxLength={LIMITS.note}
          defaultValue={publication?.note ?? ""}
          placeholder="Précision affichée sous la référence"
        />
      </label>

      {error && <p className="auth__message auth__message--error" role="alert">{error}</p>}

      <div className="biblio-form__actions">
        <button className="btn btn--primary btn--sm" type="submit" disabled={pending}>
          <FiCheck aria-hidden="true" /> {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button className="btn btn--outline btn--sm" type="button" onClick={onCancel} disabled={pending}>
          <FiX aria-hidden="true" /> Annuler
        </button>
      </div>
    </form>
  );
}
