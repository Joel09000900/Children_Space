import { FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa6";
import { useSite } from "../context/SiteContext";
import { INSTAGRAM_URL, TIKTOK_URL, whatsappLink } from "../lib/contact";

export default function Footer() {
  const { artistName, settings } = useSite();
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <p className="footer__name">{artistName}</p>
          <p className="footer__motto">{settings.footer_motto}</p>
        </div>
        <div className="footer__social">
          <a className="icon-btn icon-btn--outline" href={settings.instagram_url || INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="Instagram">
            <FaInstagram />
          </a>
          <a className="icon-btn icon-btn--outline" href={settings.tiktok_url || TIKTOK_URL} target="_blank" rel="noreferrer" aria-label="TikTok">
            <FaTiktok />
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
