import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { useSite } from "./context/SiteContext";
import Loader from "./components/Loader";
import CustomCursor from "./components/CustomCursor";
import Navbar from "./components/Navbar";
import SearchOverlay from "./components/SearchOverlay";
import AmbientAudio from "./components/AmbientAudio";
import Footer from "./components/Footer";
import GalleryPage from "./pages/GalleryPage";
import AboutPage from "./pages/AboutPage";
import BibliographyPage from "./pages/BibliographyPage";
import ContactPage from "./pages/ContactPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import NotFoundPage from "./pages/NotFoundPage";

const PAGE_TITLES: [path: string, title: string][] = [
  ["/a-propos", "À propos"],
  ["/bibliographie", "Bibliographie"],
  ["/contact", "Contact"],
  ["/inscription", "Inscription"],
  ["/connexion", "Connexion"],
  ["/admin", "Administration"],
];

/** Durée maximale d'attente de l'ancre, le temps que la page charge ses données */
const ANCHOR_TIMEOUT_MS = 1500;

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    // Un délai fixe ratait l'ancre quand la page attendait encore l'API :
    // on réessaie jusqu'à ce que l'élément existe.
    let raf = 0;
    const deadline = Date.now() + ANCHOR_TIMEOUT_MS;
    const tryScroll = () => {
      let target: Element | null = null;
      try {
        target = document.querySelector(hash);
      } catch {
        return; // hash qui n'est pas un sélecteur valide
      }
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        return;
      }
      if (Date.now() < deadline) raf = requestAnimationFrame(tryScroll);
    };
    raf = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  const { artistName } = useSite();
  const { pathname } = useLocation();

  useEffect(() => {
    // Comparaison exacte, comme le routeur : « startsWith » titrait « Administration »
    // une adresse inexistante telle que /admin/xyz, que le routeur envoie en 404.
    const path = pathname.replace(/\/+$/, "") || "/";
    const page = PAGE_TITLES.find(([p]) => p === path)?.[1];
    if (page) document.title = `${page} — ${artistName}`;
    else if (path === "/") document.title = `${artistName} — Galerie d'art virtuelle`;
    // Le serveur répond 200 à toute adresse (repli SPA) : le titre est le seul signe d'une page absente
    else document.title = `Page introuvable — ${artistName}`;
  }, [pathname, artistName]);

  return (
    <>
      <Loader name={artistName} />
      <CustomCursor />
      <ScrollManager />
      <Navbar />
      <SearchOverlay />
      <Routes>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/a-propos" element={<AboutPage />} />
        <Route path="/bibliographie" element={<BibliographyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer />
      <AmbientAudio />
    </>
  );
}
