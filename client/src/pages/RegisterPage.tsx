import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

type Message = { type: "error" | "info"; text: string };

export default function RegisterPage() {
  const [message, setMessage] = useState<Message | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (data.get("password") !== data.get("confirm")) {
      setMessage({ type: "error", text: "Les deux mots de passe ne correspondent pas." });
      return;
    }
    // Aucun compte côté serveur pour l'instant : rien n'est enregistré
    setMessage({ type: "info", text: "Les comptes ne sont pas encore reliés au serveur : votre inscription n'a pas été enregistrée." });
  };

  return (
    <section className="auth">
      <div className="auth__card">
        <p className="eyebrow eyebrow--wide">Espace membre</p>
        <h1 className="auth__title">Inscription</h1>
        <p className="auth__lead">Créez votre compte pour suivre la galerie.</p>

        <form className="auth__form" onSubmit={onSubmit}>
          <label className="field">
            Nom
            <input name="name" type="text" autoComplete="name" required />
          </label>
          <label className="field">
            Adresse e-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            Mot de passe
            <input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <label className="field">
            Confirmer le mot de passe
            <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          {message && <p className={`auth__message auth__message--${message.type}`} role="status">{message.text}</p>}
          <button className="btn btn--primary btn--block" type="submit">Créer mon compte</button>
        </form>

        <p className="auth__switch">Déjà inscrit ? <Link to="/connexion">Se connecter</Link></p>
      </div>
    </section>
  );
}
