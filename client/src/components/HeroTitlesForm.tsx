import { useState, type FormEvent } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import type { Settings } from "../api/types";
import { HERO_TEXTS, heroText } from "../lib/siteText";

interface Props {
  settings: Settings;
  onSave: (patch: Partial<Settings>) => Promise<void>;
  onCancel: () => void;
}

/** Édition des textes de l'en-tête de la galerie, réservée à l'administrateur */
export default function HeroTitlesForm({ settings, onSave, onCancel }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    /**
     * Seuls les champs réellement modifiés partent au serveur : un texte laissé
     * à sa valeur par défaut n'a pas à créer une ligne en base, et le serveur
     * refuse de son côté un patch vide.
     */
    const patch: Partial<Settings> = {};
    for (const field of HERO_TEXTS) {
      const value = String(form.get(field.key) ?? "").trim();
      if (value && value !== heroText(settings, field.key)) patch[field.key] = value;
    }
    if (Object.keys(patch).length === 0) {
      onCancel();
      return;
    }

    setPending(true);
    setError(null);
    try {
      await onSave(patch);
      // Pas de setPending(false) en cas de succès : le parent démonte le formulaire
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <form className="hero-form" onSubmit={onSubmit}>
      <p className="hero-form__title">Titres de la galerie</p>

      {HERO_TEXTS.map((field) => (
        <label className="field" key={field.key}>
          {field.label} <span className="field__hint">{field.hint}</span>
          {field.multiline ? (
            <textarea
              name={field.key}
              rows={2}
              maxLength={field.max}
              defaultValue={heroText(settings, field.key)}
              placeholder={field.label}
            />
          ) : (
            <input
              name={field.key}
              type="text"
              maxLength={field.max}
              defaultValue={heroText(settings, field.key)}
              placeholder={field.label}
            />
          )}
        </label>
      ))}

      {error && <p className="auth__message auth__message--error" role="alert">{error}</p>}

      <div className="hero-form__actions">
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
