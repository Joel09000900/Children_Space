import { useEffect, useState } from "react";

/** Durée d'affichage d'un cliché, en millisecondes */
const INTERVAL = 2000;

/**
 * Diaporama : les clichés sont empilés dans une même cellule de grille et se
 * succèdent en fondu. La mécanique vit dans `.slideshow` (base.css), l'habillage
 * — format, arrondi, ombre — appartient à l'appelant via `className`.
 *
 * Le réglage système « réduire les animations » coupe la rotation plutôt que de
 * la raccourcir : la règle globale de base.css ramène les transitions à 0,01 ms,
 * ce qui transformerait le fondu en clignotement toutes les deux secondes.
 */
export default function Slideshow({
  images,
  alt,
  className,
}: {
  images: string[];
  alt: string;
  className: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), INTERVAL);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <div className={`slideshow ${className}`}>
      {images.map((src, i) => (
        <img
          key={src}
          className={i === index ? "is-active" : undefined}
          src={src}
          /* Un seul cliché porte la description : les autres sont le même sujet */
          alt={i === index ? alt : ""}
          aria-hidden={i === index ? undefined : true}
          /* Chargés d'emblée : un cliché arrivé en retard sauterait son tour */
          loading="eager"
          decoding="async"
        />
      ))}
    </div>
  );
}
