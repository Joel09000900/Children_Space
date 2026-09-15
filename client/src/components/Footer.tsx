import { Link } from "react-router-dom";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa6";
import { useSite } from "../context/SiteContext";
import { whatsappLink } from "../lib/contact";

export default function Footer() {
  const { artistName, settings } = useSite();
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <p className="footer__name">{artistName}</p>
          <p className="footer__motto">{settings.footer_motto}</p>
        </div>
        <nav className="footer__links" aria-label="Liens du pied de page">
          <Link to="/">Galerie</Link>
          <Link to="/a-propos">À propos</Link>
          <Link to={{ hash: "#contact" }}>Contact</Link>
        </nav>
        <div className="footer__social">
          <a className="icon-btn icon-btn--outline" href={settings.facebook_url || "https://www.facebook.com/"} target="_blank" rel="noreferrer" aria-label="Facebook">
            <FaFacebookF />
          </a>
          <a className="icon-btn icon-btn--outline" href={whatsappLink(settings.whatsapp_number, artistName)} target="_blank" rel="noreferrer" aria-label="WhatsApp">
            <FaWhatsapp />
          </a>
        </div>
      </div>
      <p className="footer__legal">
        © {new Date().getFullYear()} {artistName}. Tous droits réservés. Les œuvres présentées sont protégées par le droit d'auteur.
      </p>
    </footer>
  );
}
