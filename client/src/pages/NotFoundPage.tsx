import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="not-found">
      <p className="eyebrow eyebrow--wide">Erreur 404</p>
      <h1 className="page-title">Cette salle est vide</h1>
      <p className="lead">La page demandée n'existe pas ou a été déplacée.</p>
      <Link className="btn btn--primary" to="/">Retour à la galerie</Link>
    </section>
  );
}
