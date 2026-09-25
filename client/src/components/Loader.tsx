import { useEffect, useState } from "react";

const STEPS = ["Ouverture des portes…", "Accrochage des toiles…", "Réglage de la lumière…", "Bonne visite"];

/** Écran d'accueil animé, affiché une fois par session */
export default function Loader({ name }: { name: string }) {
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem("olikrys-loaded") !== "1";
    } catch {
      return true;
    }
  });
  const [progress, setProgress] = useState(0);

  // L'updater reste pur : React peut le rejouer (StrictMode) sans déclencher d'effet de bord
  useEffect(() => {
    if (!visible) return;
    document.body.classList.add("is-loading");
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(100, p + 9 + Math.random() * 18));
    }, 160);
    return () => {
      window.clearInterval(id);
      document.body.classList.remove("is-loading");
    };
  }, [visible]);

  // La fermeture est un effet à part, déclenché quand la barre est pleine
  useEffect(() => {
    if (!visible || progress < 100) return;
    const t = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem("olikrys-loaded", "1");
      } catch {
        /* ignoré */
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [visible, progress]);

  if (!visible) return null;
  const step = STEPS[Math.min(STEPS.length - 1, Math.floor(progress / 26))];

  return (
    <div className={`loader ${progress >= 100 ? "loader--done" : ""}`} role="status" aria-live="polite">
      <p className="loader__name">{name}</p>
      <p className="loader__sub">Galerie d'art virtuelle</p>
      <div className="loader__track">
        <div className="loader__bar" style={{ width: `${progress}%` }} />
      </div>
      <p className="loader__step">{step}</p>
    </div>
  );
}
