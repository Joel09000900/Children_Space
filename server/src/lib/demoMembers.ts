/**
 * Vingt comptes membres de démonstration pour alimenter le tableau de bord admin.
 * Les dates sont réparties sur ~3 mois pour que les trois périodes (7, 30 et 90 jours)
 * affichent toutes des données. Fonction pure : testable sans base.
 */

/** Mot de passe commun à tous les comptes de démonstration (développement uniquement) */
export const DEMO_MEMBER_PASSWORD = "demo1234";

interface DemoMemberSpec {
  name: string;
  email: string;
  /** Ancienneté de l'inscription, en jours */
  daysAgo: number;
}

// 7 inscriptions sur les 7 derniers jours, 7 entre 8 et 29 jours, 6 entre 30 et 90 jours
const SPECS: DemoMemberSpec[] = [
  { name: "Aya Koffi", email: "aya.koffi@example.com", daysAgo: 0 },
  { name: "Marc Dubois", email: "marc.dubois@example.com", daysAgo: 1 },
  { name: "Fatou Diallo", email: "fatou.diallo@example.com", daysAgo: 1 },
  { name: "Léa Moreau", email: "lea.moreau@example.com", daysAgo: 2 },
  { name: "Kwame Mensah", email: "kwame.mensah@example.com", daysAgo: 4 },
  { name: "Chloé Bernard", email: "chloe.bernard@example.com", daysAgo: 5 },
  { name: "Ibrahim Touré", email: "ibrahim.toure@example.com", daysAgo: 6 },
  { name: "Sarah Lefèvre", email: "sarah.lefevre@example.com", daysAgo: 8 },
  { name: "Yao N'Guessan", email: "yao.nguessan@example.com", daysAgo: 11 },
  { name: "Camille Rousseau", email: "camille.rousseau@example.com", daysAgo: 14 },
  { name: "Aminata Sow", email: "aminata.sow@example.com", daysAgo: 14 },
  { name: "Julien Petit", email: "julien.petit@example.com", daysAgo: 18 },
  { name: "Nadia Benali", email: "nadia.benali@example.com", daysAgo: 22 },
  { name: "Thomas Girard", email: "thomas.girard@example.com", daysAgo: 26 },
  { name: "Awa Traoré", email: "awa.traore@example.com", daysAgo: 34 },
  { name: "Lucas Fontaine", email: "lucas.fontaine@example.com", daysAgo: 41 },
  { name: "Emma Lambert", email: "emma.lambert@example.com", daysAgo: 52 },
  { name: "Sékou Camara", email: "sekou.camara@example.com", daysAgo: 63 },
  { name: "Manon Chevalier", email: "manon.chevalier@example.com", daysAgo: 74 },
  { name: "David Marchand", email: "david.marchand@example.com", daysAgo: 86 },
];

export interface DemoMember {
  name: string;
  email: string;
  createdAt: Date;
}

/**
 * Comptes de démonstration datés par rapport à `now`.
 * L'heure est fixée à 10 h UTC pour éviter tout effet de bord aux frontières de jour.
 */
export function demoMembers(now: Date = new Date()): DemoMember[] {
  return SPECS.map(({ name, email, daysAgo }) => {
    const createdAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10));
    createdAt.setUTCDate(createdAt.getUTCDate() - daysAgo);
    return { name, email, createdAt };
  });
}
