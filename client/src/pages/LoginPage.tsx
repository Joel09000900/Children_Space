import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

export default function LoginPage() {
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Aucun compte côté serveur pour l'instant : la connexion n'est pas vérifiée
    setMessage("Les comptes ne sont pas encore reliés au serveur : la connexion n'est pas disponible.");
  };

  return (
    <section className="auth">
      <div className="auth__card">
        <p className="eyebrow eyebrow--wide">Espace membre</p>
        <h1 className="auth__title">Connexion</h1>
        <p className="auth__lead">Heureux de vous revoir.</p>

        <form className="auth__form" onSubmit={onSubmit}>
          <label className="field">
            Adresse e-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            Mot de passe
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {message && <p className="auth__message auth__message--info" role="status">{message}</p>}
          <button className="btn btn--primary btn--block" type="submit">Se connecter</button>
        </form>

        <p className="auth__switch">Pas encore de compte ? <Link to="/inscription">S'inscrire</Link></p>
      </div>
    </section>
  );
}
