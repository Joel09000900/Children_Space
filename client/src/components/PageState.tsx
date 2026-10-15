import { useEffect, useState } from "react";

/**
 * Au-delà de ce délai, l'attente n'est plus un simple chargement : sur l'offre
 * gratuite de Render, l'API s'endort après quelques minutes sans visite et met
 * jusqu'à une minute à se réveiller. Sans explication, le visiteur voit « Chargement… »
 * tourner dans le vide et conclut que le site est cassé.
 */
const SLOW_AFTER_MS = 6000;

export function Loading({ label = "Chargement…", page = false }: { label?: string; page?: boolean }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className={page ? "state state--page" : "state"} role="status">
      <div>
        <p>{label}</p>
        {slow && (
          <p className="state__hint">
            Le serveur se réveille après une période d'inactivité, cela peut prendre une minute. Merci de patienter.
          </p>
        )}
      </div>
    </div>
  );
}

/** Message d'erreur avec de quoi réessayer : recharger suffit, les pages se rechargent d'elles-mêmes */
export function LoadError({ message, page = false }: { message: string; page?: boolean }) {
  return (
    <div className={page ? "state state--page state--error" : "state state--error"} role="alert">
      <div>
        <p>{message}</p>
        <button className="btn btn--outline btn--sm" type="button" onClick={() => window.location.reload()}>
          Réessayer
        </button>
      </div>
    </div>
  );
}
