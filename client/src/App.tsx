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
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";

const PAGE_TITLES: [path: string, title: string][] = [
  ["/a-propos", "À propos"],
  ["/inscription", "Inscription"],
  ["/connexion", "Connexion"],
];

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // Laisse le temps à la page de se rendre avant de viser l'ancre
      const t = window.setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }), 80);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0 });
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
        <Route path="/inscription" element={<RegisterPage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer />
      <AmbientAudio />
    </>
  );
}
