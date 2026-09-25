import { z } from "zod";

/**
 * Validation du formulaire de contact public.
 * Isolée de Prisma et d'Express pour rester testable sans base de données.
 */

export const CONTACT_LIMITS = {
  name: 80,
  email: 200,
  subject: 120,
  message: 4000,
} as const;

/** Longueur minimale d'un message : en dessous, c'est du bruit, pas une demande */
const MESSAGE_MIN = 20;

/**
 * Champ leurre : invisible à l'écran, laissé vide par un visiteur, rempli par les
 * robots qui remplissent tous les champs d'un formulaire. Une valeur non vide
 * fait passer la requête pour acceptée sans rien écrire en base (voir la route).
 */
export const HONEYPOT_FIELD = "website";

export const contactBody = z.object({
  name: z.string().trim().min(2, "Merci d'indiquer votre nom.").max(CONTACT_LIMITS.name),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(CONTACT_LIMITS.email),
  subject: z.string().trim().min(3, "Précisez l'objet de votre message.").max(CONTACT_LIMITS.subject),
  message: z
    .string()
    .trim()
    .min(MESSAGE_MIN, `Votre message doit faire au moins ${MESSAGE_MIN} caractères.`)
    .max(CONTACT_LIMITS.message),
  [HONEYPOT_FIELD]: z.string().max(200).optional(),
});

export type ContactBody = z.infer<typeof contactBody>;

/** Vrai quand le leurre a été rempli : la soumission vient très probablement d'un robot. */
export function looksAutomated(body: { [HONEYPOT_FIELD]?: string }) {
  return Boolean(body[HONEYPOT_FIELD]?.trim());
}

/** Forme publique d'un message, telle que la reçoit le tableau de bord admin */
export function toContactMessageDTO(m: {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: Date;
  user?: { id: string; name: string } | null;
}) {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    subject: m.subject,
    message: m.message,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    author: m.user ? { id: m.user.id, name: m.user.name } : null,
  };
}
