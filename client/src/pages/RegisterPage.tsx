import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (data.get("password") !== data.get("confirm")) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await register(String(data.get("name")), String(data.get("email")), String(data.get("password")));
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible");
      setPending(false);
    }
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
            <input name="name" type="text" autoComplete="name" maxLength={80} required />
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
          {error && <p className="auth__message auth__message--error" role="alert">{error}</p>}
          <button className="btn btn--primary btn--block" type="submit" disabled={pending}>
            {pending ? "Création du compte…" : "Créer mon compte"}
          </button>
        </form>

        <p className="auth__switch">Déjà inscrit ? <Link to="/connexion">Se connecter</Link></p>
      </div>
    </section>
  );
}
