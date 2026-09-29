/**
 * Repli utilisé tant que le réglage `instagram_url` n'existe pas en base.
 * Le seed le renseigne, mais `db:seed` efface les œuvres : sur une base déjà
 * peuplée la ligne s'ajoute à la main, et d'ici là le bouton doit fonctionner.
 */
export const INSTAGRAM_URL = "https://www.instagram.com/sibri_olikrys/";

export function whatsappLink(number: string | undefined, artistName: string, artworkTitle?: string) {
  const digits = (number ?? "").replace(/\D/g, "");
  const message = artworkTitle
    ? `Bonjour, je souhaite en savoir plus sur l'œuvre « ${artworkTitle} » de ${artistName}.`
    : `Bonjour, je souhaite en savoir plus sur les œuvres de ${artistName}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
