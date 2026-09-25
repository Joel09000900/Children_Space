import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { DEMO_EMAIL_DOMAIN } from "../src/lib/demoMembers";

/**
 * Retire les 20 comptes de démonstration avant la mise en ligne.
 *
 * Ils servent uniquement à peupler les graphiques du tableau de bord pendant le
 * développement. Laissés en production, ils gonflent le compteur « membres
 * inscrits » affiché à l'administrateur et polluent la liste des derniers inscrits.
 *
 *   npm --prefix server run db:clean:demo            # aperçu, ne supprime rien
 *   npm --prefix server run db:clean:demo -- --oui   # supprime réellement
 *
 * Les sessions liées partent avec les comptes (onDelete: Cascade). Les messages de
 * contact, eux, sont conservés : leur `userId` passe simplement à null.
 */
async function main() {
  const confirmed = process.argv.includes("--oui");
  const where = { email: { endsWith: DEMO_EMAIL_DOMAIN }, role: "MEMBER" } as const;

  const doomed = await prisma.user.findMany({ where, select: { name: true, email: true } });

  if (doomed.length === 0) {
    console.log("Aucun compte de démonstration : la base est déjà propre.");
    return;
  }

  console.log(`${doomed.length} compte(s) de démonstration trouvé(s) :`);
  for (const u of doomed) console.log(`  ${u.name} <${u.email}>`);

  if (!confirmed) {
    console.log("\nAperçu seulement — rien n'a été supprimé.");
    console.log("Relancez avec --oui pour confirmer : npm --prefix server run db:clean:demo -- --oui");
    return;
  }

  const { count } = await prisma.user.deleteMany({ where });
  console.log(`\n${count} compte(s) supprimé(s).`);
  console.log(`Membres restants : ${await prisma.user.count({ where: { role: "MEMBER" } })}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
