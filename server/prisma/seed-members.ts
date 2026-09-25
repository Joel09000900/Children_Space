/**
 * Insère les 20 comptes membres de démonstration utilisés par le tableau de bord admin.
 * Idempotent : relancer le script met simplement les dates à jour.
 *
 *   npm --prefix server run db:seed:members
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEMO_MEMBER_PASSWORD, demoMembers } from "../src/lib/demoMembers";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const members = demoMembers();
  // Un seul hash réutilisé : les 20 comptes partagent le même mot de passe de démonstration
  const passwordHash = await hashPassword(DEMO_MEMBER_PASSWORD);

  for (const { name, email, createdAt } of members) {
    await prisma.user.upsert({
      where: { email },
      create: { name, email, passwordHash, role: "MEMBER", createdAt },
      update: { name, createdAt, role: "MEMBER" },
    });
  }

  const total = await prisma.user.count({ where: { role: "MEMBER" } });
  console.log(`${members.length} comptes de démonstration insérés (${total} membres au total).`);
  console.log(`Mot de passe commun : ${DEMO_MEMBER_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
