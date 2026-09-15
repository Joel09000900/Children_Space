import { FiDroplet, FiEye, FiGlobe, FiHeart } from "react-icons/fi";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useReveal } from "../hooks/useReveal";
import ContactCTA from "../components/ContactCTA";

const APPROACH = [
  { icon: FiEye, title: "Observer", text: "Tout commence par un détail remarqué dans la rue, un paysage ou un visage." },
  { icon: FiHeart, title: "Ressentir", text: "Le souvenir de ce moment compte plus que sa description exacte." },
  { icon: FiDroplet, title: "Colorer", text: "La couleur porte l'émotion : elle est choisie avant le dessin." },
  { icon: FiGlobe, title: "Partager", text: "Des sujets ancrés localement, pensés pour parler à tous les regards." },
];

const dateFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

export default function AboutPage() {
  const { data, loading, error } = useAsync((s) => api.about(s), []);
  useReveal([data]);

  if (loading) return <p className="state state--page">Chargement…</p>;
  if (error || !data) return <p className="state state--page state--error">Impossible de charger la page : {error}</p>;

  const { settings, stats, techniques, exhibitions, collections, heroImage } = data;
  const name = settings.artist_name || "OliKrys";

  return (
    <div className="about">
      <section className="about-hero">
        {heroImage && (
          <div className="about-hero__media reveal">
            <span className="corner corner--tl" aria-hidden="true" />
            <img src={heroImage} alt={`Œuvre de ${name}`} />
            <span className="corner corner--br" aria-hidden="true" />
          </div>
        )}
        <div className="about-hero__text reveal">
          <p className="eyebrow eyebrow--wide">{settings.artist_role || "Artiste peintre"}</p>
          <h1 className="page-title">{name}</h1>
          <p className="lead">{settings.about_intro}</p>
        </div>
      </section>

      <section className="stats reveal" aria-label="Chiffres clés">
        <div><strong>{stats.artworks}</strong><span>œuvres en ligne</span></div>
        <div><strong>{stats.collections}</strong><span>collections</span></div>
        <div><strong>{stats.yearsActive ?? "—"}</strong><span>années de création</span></div>
      </section>

      <section className="section two-col">
        <div className="reveal">
          <h2 className="section-title">Parcours</h2>
          <p className="prose">{settings.about_bio}</p>
        </div>
        {settings.about_quote && (
          <blockquote className="quote reveal">
            <p>{settings.about_quote}</p>
            <cite>{name}</cite>
          </blockquote>
        )}
      </section>

      <section className="section">
        <h2 className="section-title reveal">Démarche</h2>
        <div className="approach">
          {APPROACH.map(({ icon: Icon, title, text }, i) => (
            <article key={title} className="approach__item reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section two-col">
        <div className="reveal">
          <h2 className="section-title">Techniques</h2>
          <ul className="skills">
            {techniques.map((t) => (
              <li key={t.id}>
                <div className="skills__head"><span>{t.name}</span><span>{t.mastery} %</span></div>
                <div className="skills__track"><div className="skills__bar" style={{ "--value": `${t.mastery}%` } as React.CSSProperties} /></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal">
          <h2 className="section-title">Expositions</h2>
          <ol className="timeline">
            {exhibitions.map((e) => (
              <li key={e.id} className={e.upcoming ? "is-upcoming" : ""}>
                <span className="timeline__date">{dateFmt.format(new Date(e.startDate))}</span>
                <h3>{e.title}</h3>
                <p>{e.venue}, {e.city}</p>
                <span className="tag">{e.upcoming ? "À venir" : e.kind === "SOLO" ? "Personnelle" : "Collective"}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title reveal">Collections</h2>
        <div className="collections">
          {collections.map((c, i) => (
            <article key={c.id} className="collection reveal" style={{ "--accent": c.color, transitionDelay: `${i * 80}ms` } as React.CSSProperties}>
              <span className="collection__year">{c.year}</span>
              <h3>{c.name}</h3>
              <p>{c.description}</p>
              <small>{c.artworkCount} œuvre{c.artworkCount > 1 ? "s" : ""}</small>
            </article>
          ))}
        </div>
      </section>

      <ContactCTA title="Échanger avec l'atelier" />
    </div>
  );
}
