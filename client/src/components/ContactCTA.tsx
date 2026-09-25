import { Link } from "react-router-dom";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa6";
import { FiSend } from "react-icons/fi";
import { useSite } from "../context/SiteContext";
import { whatsappLink } from "../lib/contact";

export default function ContactCTA({ title = "Acquérir une œuvre" }: { title?: string }) {
  const { artistName, settings } = useSite();
  return (
    <section id="contact" className="cta reveal">
      <span className="gold-rule" aria-hidden="true" />
      <h2 className="cta__title">{title}</h2>
      <p className="cta__text">
        Une toile vous intéresse, vous avez une question sur une série ou un projet de commande ?
        L'agent de {artistName} vous répond directement.
      </p>
      <div className="cta__actions">
        {/* Le formulaire enregistre la demande : elle survit à la fermeture de l'onglet,
            contrairement à une conversation WhatsApp jamais ouverte. */}
        <Link className="btn btn--primary" to="/contact">
          <FiSend /> Remplir le formulaire
        </Link>
        <a className="btn btn--whatsapp" href={whatsappLink(settings.whatsapp_number, artistName)} target="_blank" rel="noreferrer">
          <FaWhatsapp /> Écrire sur WhatsApp
        </a>
        <a className="btn btn--facebook" href={settings.facebook_url || "https://www.facebook.com/"} target="_blank" rel="noreferrer">
          <FaFacebookF /> Suivre sur Facebook
        </a>
      </div>
    </section>
  );
}
