import type { Settings } from "../api/types";

/** Clés des textes de l'en-tête, en miroir de `EDITABLE_TEXTS` côté serveur */
export type HeroTextKey = "hero_eyebrow" | "hero_title" | "artist_name" | "hero_tagline";

export interface HeroTextField {
  key: HeroTextKey;
  label: string;
  /** Précision affichée sous le libellé, pour situer le champ dans le titre rendu */
  hint: string;
  /** Même borne que le serveur, qui reste seul juge */
  max: number;
  /** Valeur servie quand la clé est absente de la base ou vide */
  fallback: string;
  multiline?: boolean;
}

/**
 * Description du formulaire d'édition des titres, dans l'ordre d'affichage.
 *
 * Source unique : la page d'accueil lit ces valeurs par défaut pour l'affichage,
 * le formulaire s'en sert pour construire ses champs. Ajouter un texte éditable
 * demande une entrée ici *et* dans `EDITABLE_TEXTS` du serveur.
 */
export const HERO_TEXTS: HeroTextField[] = [
  { key: "hero_eyebrow", label: "Accroche", hint: "au-dessus du titre", max: 60, fallback: "Bienvenue dans" },
  { key: "hero_title", label: "Titre", hint: "texte en blanc", max: 80, fallback: "La Galerie" },
  { key: "artist_name", label: "Nom mis en avant", hint: "texte en dégradé", max: 60, fallback: "OliKrys" },
  {
    key: "hero_tagline",
    label: "Sous-titre",
    hint: "phrase sous le titre",
    max: 300,
    fallback: "",
    multiline: true,
  },
];

const FALLBACKS = Object.fromEntries(HERO_TEXTS.map((f) => [f.key, f.fallback])) as Record<HeroTextKey, string>;

/**
 * Texte à afficher pour une clé. Une valeur vide (clé jamais renseignée, ou
 * base semée avant l'ajout de la fonctionnalité) retombe sur la valeur par défaut :
 * l'en-tête ne doit jamais apparaître amputé de son titre.
 */
export function heroText(settings: Settings, key: HeroTextKey) {
  return settings[key]?.trim() || FALLBACKS[key];
}
