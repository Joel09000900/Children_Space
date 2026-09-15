export function whatsappLink(number: string | undefined, artistName: string, artworkTitle?: string) {
  const digits = (number ?? "").replace(/\D/g, "");
  const message = artworkTitle
    ? `Bonjour, je souhaite en savoir plus sur l'œuvre « ${artworkTitle} » de ${artistName}.`
    : `Bonjour, je souhaite en savoir plus sur les œuvres de ${artistName}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
