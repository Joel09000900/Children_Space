import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { FiMenu, FiMoon, FiSearch, FiSun, FiX } from "react-icons/fi";
import { useSite } from "../context/SiteContext";

export default function Navbar() {
  const { artistName, settings, theme, toggleTheme, setSearchOpen } = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname, location.hash]);

  return (
    <header className={`navbar ${scrolled ? "navbar--scrolled" : ""} ${menuOpen ? "navbar--open" : ""}`}>
      <div className="navbar__inner">
        <Link to="/" className="brand" aria-label={`${artistName}, accueil`}>
          <span className="brand__name">{artistName}</span>
          <span className="brand__role">{settings.artist_role || "Artiste peintre"}</span>
        </Link>

        <nav aria-label="Navigation principale">
          <ul className="navbar__links">
            <li><NavLink to="/" end>Galerie</NavLink></li>
            <li><NavLink to="/a-propos">À propos</NavLink></li>
            <li><Link to={{ pathname: location.pathname, hash: "#contact" }}>Contact</Link></li>
            {/* Sur mobile, les boutons de compte passent dans le menu */}
            <li className="navbar__links-auth"><NavLink to="/inscription">Inscription</NavLink></li>
            <li className="navbar__links-auth"><NavLink to="/connexion">Connexion</NavLink></li>
          </ul>
        </nav>

        <section className="navbar__auth" aria-label="Espace membre">
          <Link className="btn btn--primary btn--sm" to="/inscription">Inscription</Link>
          <Link className="btn btn--outline btn--sm" to="/connexion">Connexion</Link>
        </section>

        <div className="navbar__actions">
          <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Rechercher une œuvre">
            <FiSearch />
          </button>
          <button className="icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}>
            {theme === "dark" ? <FiMoon /> : <FiSun />}
          </button>
          <button className="icon-btn navbar__burger" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Menu">
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>
    </header>
  );
}
