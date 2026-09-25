/**
 * Contenu du widget sonore, en deux catégories.
 *
 * C'est le seul fichier à modifier pour enrichir le widget : ajoutez une entrée
 * dans MORCEAUX (fichier converti déposé dans client/public/audio) ou dans
 * AMBIANCES (nappe générée en direct, aucun fichier). Le composant se contente
 * de lire ces listes, il n'a jamais besoin d'être touché.
 */

export type Category = "ambiances" | "morceaux";

/** Élément commun aux deux catégories : ce que le widget affiche */
interface PlaylistItem {
  id: string;
  title: string;
  /** Deuxième ligne : l'artiste pour un morceau, une description pour une ambiance */
  subtitle: string;
}

/** Morceau enregistré, servi depuis client/public/audio (le master .wav reste hors du dépôt) */
export interface Track extends PlaylistItem {
  /** Plusieurs formats : le navigateur retient le premier qu'il sait lire */
  sources: { src: string; type: string }[];
}

/** Nappe générée en Web Audio : aucun octet téléchargé, tout est calculé dans le navigateur */
export interface Ambiance extends PlaylistItem {
  /** Accords joués en boucle, en hertz */
  chords: number[][];
  /** Délai entre deux accords, en millisecondes */
  intervalMs: number;
  /** Coupure du filtre passe-bas : plus la valeur est basse, plus le son est feutré */
  filterHz: number;
  /** Écho : durée du retard en secondes et part réinjectée (0 à 1) */
  delaySeconds: number;
  feedback: number;
}

export const MORCEAUX: Track[] = [
  {
    id: "tout-va-changer",
    title: "Tout va changer",
    subtitle: "Artiste inconnu",
    sources: [
      { src: "/audio/tout-va-changer.mp3", type: "audio/mpeg" },
      { src: "/audio/tout-va-changer.ogg", type: "audio/ogg" },
    ],
  },
];

export const AMBIANCES: Ambiance[] = [
  {
    id: "atelier",
    title: "Atelier",
    subtitle: "Nappe douce",
    chords: [
      [130.81, 196.0, 261.63, 329.63],
      [110.0, 164.81, 220.0, 277.18],
      [146.83, 220.0, 293.66, 349.23],
      [123.47, 185.0, 246.94, 311.13],
    ],
    intervalMs: 6000,
    filterHz: 1100,
    delaySeconds: 0.42,
    feedback: 0.35,
  },
  {
    id: "aube",
    title: "Aube",
    subtitle: "Plus clair, plus aéré",
    chords: [
      [174.61, 261.63, 349.23, 440.0],
      [196.0, 293.66, 392.0, 493.88],
      [164.81, 246.94, 329.63, 415.3],
      [146.83, 220.0, 293.66, 369.99],
    ],
    intervalMs: 5000,
    filterHz: 1800,
    delaySeconds: 0.3,
    feedback: 0.28,
  },
  {
    id: "nocturne",
    title: "Nocturne",
    subtitle: "Grave et lent",
    chords: [
      [87.31, 130.81, 174.61, 207.65],
      [98.0, 146.83, 196.0, 233.08],
      [77.78, 116.54, 155.56, 185.0],
      [82.41, 123.47, 164.81, 196.0],
    ],
    intervalMs: 8000,
    filterHz: 700,
    delaySeconds: 0.6,
    feedback: 0.45,
  },
];

/** Libellés des deux boutons de catégorie, dans l'ordre d'affichage */
export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "ambiances", label: "Ambiances" },
  { id: "morceaux", label: "Morceaux" },
];

/** Contenu d'une catégorie, dans l'ordre déclaré */
export function itemsOf(category: Category): (Track | Ambiance)[] {
  return category === "morceaux" ? MORCEAUX : AMBIANCES;
}

/**
 * Avance de `step` positions en rebouclant aux deux extrémités.
 * Une liste vide renvoie 0 : le composant n'affiche alors aucune flèche.
 */
export function cycle(index: number, length: number, step: number) {
  if (length <= 0) return 0;
  return (((index + step) % length) + length) % length;
}

/**
 * Position d'un élément dans sa catégorie, 0 s'il a disparu.
 * Utile quand un identifiant mémorisé ne correspond plus à la liste actuelle.
 */
export function indexOfId(items: PlaylistItem[], id: string | null) {
  const found = items.findIndex((item) => item.id === id);
  return found === -1 ? 0 : found;
}

/** Ramène un index dans les bornes de la liste, quel qu'il soit */
export function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}
