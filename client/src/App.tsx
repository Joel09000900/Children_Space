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
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import NotFoundPage from "./pages/NotFoundPage";

const PAGE_TITLES: [path: string, title: string][] = [
  ["/a-propos", "À propos"],
  ["/bibliographie", "Bibliographie"],
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
    const page = PAGE_TITLES.find(([path]) => pathname.startsWith(path))?.[1];
    document.title = page ? `${page} — ${artistName}` : `${artistName} — Galerie d'art virtuelle`;
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
