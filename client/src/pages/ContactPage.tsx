import { useState, type FormEvent } from "react";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa6";
import { FiCheck, FiClock, FiMail, FiSend } from "react-icons/fi";
import { api } from "../api/client";
import { useSite } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { useReveal } from "../hooks/useReveal";
import { whatsappLink } from "../lib/contact";

/** Doit rester aligné sur CONTACT_LIMITS côté serveur (server/src/lib/contactMessage.ts) */
const LIMITS = { name: 80, email: 200, subject: 120, message: 4000 } as const;
const MESSAGE_MIN = 20;

const SUBJECTS = [
  "Acquérir une œuvre",
  "Commande sur mesure",
  "Exposition ou partenariat",
  "Presse et interview",
  "Autre demande",
];

export default function ContactPage() {
  const { artistName, settings } = useSite();
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [length, setLength] = useState(0);
  useReveal([sent]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError(null);
    try {
      await api.contact({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        subject: String(data.get("subject") ?? ""),
        message: String(data.get("message") ?? ""),
        website: String(data.get("website") ?? ""),
      });
      form.reset();
      setLength(0);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible pour le moment.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="contact-page">
      <header className="section contact-page__intro">
        <p className="eyebrow eyebrow--wide">Écrire à l'atelier</p>
        <h1 className="page-title">Contact</h1>
        <p className="lead">
          Une toile vous intéresse, vous préparez une exposition ou vous avez un projet de commande ?
          Décrivez votre demande : elle arrive directement dans la messagerie de {artistName}.
        </p>
      </header>

      <div className="section contact-page__body">
        <section className="contact-form-card reveal" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title" className="section-title">Votre message</h2>

          {sent ? (
            <div className="contact-success" role="status">
              <span className="contact-success__icon" aria-hidden="true"><FiCheck /></span>
              <h3>Message bien reçu</h3>
              <p>
                Merci, votre demande est enregistrée. Une réponse vous parviendra à l'adresse indiquée,
                généralement sous deux jours ouvrés.
              </p>
              <button type="button" className="btn btn--outline" onClick={() => setSent(false)}>
                Écrire un autre message
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={onSubmit} noValidate={false}>
              <div className="contact-form__row">
                <label className="field">
                  Nom
                  <input
                    name="name" type="text" autoComplete="name" required
                    minLength={2} maxLength={LIMITS.name} defaultValue={user?.name ?? ""}
                    placeholder="Votre nom"
                  />
                </label>
                <label className="field">
                  Adresse e-mail
                  <input
                    name="email" type="email" autoComplete="email" required
                    maxLength={LIMITS.email} defaultValue={user?.email ?? ""}
                    placeholder="vous@exemple.com"
                  />
                </label>
              </div>

              <label className="field">
                Objet
                {/* Liste de suggestions, mais le champ reste libre */}
                <input
                  name="subject" type="text" list="contact-subjects" required
                  minLength={3} maxLength={LIMITS.subject} placeholder="Acquérir une œuvre"
                />
              </label>
              <datalist id="contact-subjects">
                {SUBJECTS.map((s) => <option key={s} value={s} />)}
              </datalist>

              <label className="field">
                Message
                <textarea
                  name="message" rows={7} required
                  minLength={MESSAGE_MIN} maxLength={LIMITS.message}
                  placeholder="Décrivez votre demande : œuvre concernée, format souhaité, délai…"
                  onChange={(e) => setLength(e.target.value.length)}
                />
              </label>
              <p className="contact-form__count" aria-live="polite">
                {length} / {LIMITS.message} caractères
                {length > 0 && length < MESSAGE_MIN && ` — ${MESSAGE_MIN - length} de plus au minimum`}
              </p>

              {/* Leurre anti-robot : hors écran et retiré du parcours clavier, jamais rempli par un visiteur */}
              <div className="contact-form__trap" aria-hidden="true">
                <label htmlFor="website">Ne pas remplir ce champ</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              {error && <p className="auth__message auth__message--error" role="alert">{error}</p>}

              <button className="btn btn--primary btn--block" type="submit" disabled={pending}>
                <FiSend aria-hidden="true" /> {pending ? "Envoi en cours…" : "Envoyer le message"}
              </button>
              <p className="contact-form__legal">
                Vos coordonnées servent uniquement à répondre à cette demande. Aucun envoi commercial.
              </p>
            </form>
          )}
        </section>

        <aside className="contact-aside reveal" aria-label="Autres moyens de contact">
          <div className="contact-aside__block">
            <h2 className="contact-aside__title">Réponse directe</h2>
            <p>Pour une question rapide, la messagerie instantanée reste le plus simple.</p>
            <div className="contact-aside__actions">
              <a
                className="btn btn--whatsapp"
                href={whatsappLink(settings.whatsapp_number, artistName)}
                target="_blank" rel="noreferrer"
              >
                <FaWhatsapp /> Écrire sur WhatsApp
              </a>
              <a
                className="btn btn--facebook"
                href={settings.facebook_url || "https://www.facebook.com/"}
                target="_blank" rel="noreferrer"
              >
                <FaFacebookF /> Suivre sur Facebook
              </a>
            </div>
          </div>

          <ul className="contact-aside__facts">
            <li>
              <FiClock aria-hidden="true" />
              <div><strong>Délai de réponse</strong><span>Sous deux jours ouvrés en moyenne.</span></div>
            </li>
            <li>
              <FiMail aria-hidden="true" />
              <div><strong>Suivi de la demande</strong><span>La réponse arrive à l'adresse que vous indiquez.</span></div>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
