import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Page demandée avant la redirection vers la connexion (ex. /admin)
  const from = (location.state as { from?: string } | null)?.from;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const user = await login(String(data.get("identifier")), String(data.get("password")));
      navigate(from ?? (user.role === "ADMIN" ? "/admin" : "/"), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
      setPending(false);
    }
  };

  return (
    <section className="auth">
      <div className="auth__card">
        <p className="eyebrow eyebrow--wide">Espace membre</p>
        <h1 className="auth__title">Connexion</h1>
        <p className="auth__lead">Heureux de vous revoir.</p>

        <form className="auth__form" onSubmit={onSubmit}>
          <label className="field">
            Identifiant ou e-mail
            <input name="identifier" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
          </label>
          <label className="field">
            Mot de passe
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error && <p className="auth__message auth__message--error" role="alert">{error}</p>}
          <button className="btn btn--primary btn--block" type="submit" disabled={pending}>
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="auth__switch">Pas encore de compte ? <Link to="/inscription">S'inscrire</Link></p>
      </div>
    </section>
  );
}
