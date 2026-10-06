import { z } from "zod";
import { PRIVATE_SETTING_PREFIX } from "./serializers";

/**
 * Textes de l'en-tête de la galerie modifiables par l'administrateur.
 *
 * La table `Setting` sert aussi à des réglages techniques (numéro WhatsApp,
 * éventuels jetons préfixés `private_`). Une liste blanche est donc préférable
 * à une validation « toute clé, valeur texte » : un PATCH ne peut écrire que
 * ces quatre clés, et étendre la fonctionnalité demande une ligne ici plutôt
 * qu'une confiance accordée au corps de la requête.
 *
 * `max` borne la saisie pour que la mise en page tienne : au-delà, le titre
 * déborde du héros sur mobile.
 */
export const EDITABLE_TEXTS = {
  hero_eyebrow: { label: "Accroche", max: 60 },
  hero_title: { label: "Titre", max: 80 },
  artist_name: { label: "Nom mis en avant", max: 60 },
  hero_tagline: { label: "Sous-titre", max: 300 },
} as const;

export type EditableTextKey = keyof typeof EDITABLE_TEXTS;

export const EDITABLE_TEXT_KEYS = Object.keys(EDITABLE_TEXTS) as EditableTextKey[];

/** Aucune clé modifiable ne doit tomber dans la zone réservée aux réglages internes */
export const hasPrivateKey = EDITABLE_TEXT_KEYS.some((k) => k.startsWith(PRIVATE_SETTING_PREFIX));

/**
 * Corps attendu par `PATCH /api/admin/settings` : un sous-ensemble des clés
 * modifiables. `.strict()` refuse une clé inconnue au lieu de l'ignorer en
 * silence — sans quoi une faute de frappe côté client répondrait 200 sans rien
 * enregistrer, et l'administrateur croirait sa saisie prise en compte.
 */
export const siteTextPatch = z
  .object(
    Object.fromEntries(
      EDITABLE_TEXT_KEYS.map((key) => [
        key,
        z.string().trim().min(1, `${EDITABLE_TEXTS[key].label} ne peut pas être vide`).max(EDITABLE_TEXTS[key].max),
      ]),
    ) as { [K in EditableTextKey]: z.ZodString },
  )
  .strict()
  .partial()
  .refine((body) => Object.keys(body).length > 0, "Aucun texte à modifier");

export type SiteTextPatch = z.infer<typeof siteTextPatch>;
