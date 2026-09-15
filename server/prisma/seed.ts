/**
 * Données de démonstration.
 * Les textes et titres sont des exemples à remplacer par les vraies œuvres de l'artiste.
 * Les images proviennent d'Unsplash (licence Unsplash) et servent de visuels provisoires.
 */
import "dotenv/config";
import { PrismaClient, ExhibitionKind } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const img = (id: string, w: number) => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

const collections = [
  { slug: "terres-solaires", name: "Terres Solaires", year: 2022, color: "#7c3aed", position: 1,
    description: "Paysages et visages saisis dans la chaleur des fins de journée." },
  { slug: "songes-interieurs", name: "Songes Intérieurs", year: 2023, color: "#9333ea", position: 2,
    description: "Des formes libres, nées de la mémoire et du rêve." },
  { slug: "rythmes-urbains", name: "Rythmes Urbains", year: 2023, color: "#6d28d9", position: 3,
    description: "La ville la nuit, ses reflets et ses passants." },
  { slug: "silences-vegetaux", name: "Silences Végétaux", year: 2024, color: "#5b21b6", position: 4,
    description: "Forêts, rivages et brumes observés au calme." },
];

const techniques = [
  { name: "Huile sur toile", mastery: 90 },
  { name: "Acrylique sur toile", mastery: 78 },
  { name: "Technique mixte", mastery: 66 },
  { name: "Aquarelle", mastery: 55 },
];

const artworks = [
  { slug: "braises-du-soir", title: "Braises du Soir", collection: "terres-solaires", technique: "Huile sur toile",
    year: 2022, dimensions: "80 × 100 cm", featured: true, photo: "photo-1578301978693-85fa9c0320b9",
    description: "Un horizon qui s'embrase lentement. Les ocres du premier plan répondent au violet du ciel, posé en couches fines pour garder la transparence." },
  { slug: "ile-des-reves", title: "L'Île des Rêves", collection: "songes-interieurs", technique: "Acrylique sur toile",
    year: 2023, dimensions: "60 × 80 cm", featured: true, photo: "photo-1541961017774-22349e4a1262",
    description: "Des taches de couleur qui se rapprochent puis s'éloignent, comme des souvenirs qu'on n'arrive pas à fixer." },
  { slug: "averse-nocturne", title: "Averse Nocturne", collection: "rythmes-urbains", technique: "Huile sur toile",
    year: 2023, dimensions: "100 × 120 cm", featured: false, photo: "photo-1519501025264-65ba15a82390",
    description: "Une avenue mouillée où les phares se dédoublent sur le bitume. Le tableau a été peint en trois séances, de nuit." },
  { slug: "brume-matinale", title: "Brume Matinale", collection: "silences-vegetaux", technique: "Aquarelle",
    year: 2024, dimensions: "70 × 90 cm", featured: true, photo: "photo-1448375240586-882707db888b",
    description: "Les troncs disparaissent dans le blanc du papier. Très peu de pigment, beaucoup d'eau." },
  { slug: "regard-dore", title: "Regard Doré", collection: "terres-solaires", technique: "Huile sur toile",
    year: 2022, dimensions: "50 × 70 cm", featured: false, photo: "photo-1531746020798-e6953c6e8e04",
    description: "Portrait en lumière rasante. Le fond rose poudré laisse toute la place au visage." },
  { slug: "courants-magenta", title: "Courants Magenta", collection: "songes-interieurs", technique: "Technique mixte",
    year: 2023, dimensions: "90 × 110 cm", featured: false, photo: "photo-1549490349-8643362247b5",
    description: "Encre, acrylique et vernis coulés à plat, puis travaillés au couteau pendant le séchage." },
  { slug: "toits-au-crepuscule", title: "Toits au Crépuscule", collection: "rythmes-urbains", technique: "Acrylique sur toile",
    year: 2023, dimensions: "80 × 80 cm", featured: false, photo: "photo-1502602898657-3e91760cbb34",
    description: "Une vue plongeante sur une ville qui allume ses premières fenêtres." },
  { slug: "grand-large", title: "Grand Large", collection: "silences-vegetaux", technique: "Huile sur toile",
    year: 2024, dimensions: "120 × 80 cm", featured: true, photo: "photo-1505118380757-91f5f5632de0",
    description: "Une vague au moment où elle se retourne, peinte en bleus froids et en blancs épais." },
  { slug: "sommets-voiles", title: "Sommets Voilés", collection: "terres-solaires", technique: "Huile sur toile",
    year: 2022, dimensions: "100 × 100 cm", featured: false, photo: "photo-1506905925346-21bda4d32df4",
    description: "Des crêtes qui émergent d'une mer de nuages, dans une palette réduite à quatre couleurs." },
  { slug: "eclosion", title: "Éclosion", collection: "songes-interieurs", technique: "Technique mixte",
    year: 2023, dimensions: "75 × 95 cm", featured: false, photo: "photo-1547826039-bfc35e0f1ea8",
    description: "Projections et coulures sur panneau de bois : un tableau construit par gestes rapides." },
];

const exhibitions = [
  { title: "Exposition personnelle (exemple)", venue: "Galerie à renseigner", city: "Abidjan", kind: ExhibitionKind.SOLO,
    startDate: new Date("2026-11-06"), endDate: new Date("2026-12-20") },
  { title: "Salon d'art contemporain (exemple)", venue: "Lieu à renseigner", city: "Dakar", kind: ExhibitionKind.GROUP,
    startDate: new Date("2024-05-10"), endDate: new Date("2024-05-26") },
  { title: "Exposition collective (exemple)", venue: "Centre culturel à renseigner", city: "Abidjan", kind: ExhibitionKind.GROUP,
    startDate: new Date("2023-03-02"), endDate: new Date("2023-03-30") },
  { title: "Premières toiles (exemple)", venue: "Espace à renseigner", city: "Bouaké", kind: ExhibitionKind.SOLO,
    startDate: new Date("2022-09-15"), endDate: null },
];

const settings: Record<string, string> = {
  artist_name: "OliKrys",
  artist_role: "Artiste peintre",
  hero_tagline: "Des toiles peintes à l'huile, à l'acrylique et à l'aquarelle, à parcourir comme on visite un atelier.",
  footer_motto: "Peindre ce qui reste quand on ferme les yeux",
  about_intro: "Autodidacte, OliKrys peint depuis plusieurs années entre souvenirs d'enfance, scènes de rue et paysages d'Afrique de l'Ouest.",
  about_bio: "Son travail part presque toujours d'une observation précise : une lumière sur un mur, un geste, un reflet. Au fil des séances, le motif se simplifie et la couleur prend le relais. Chaque série explore une idée pendant une ou deux années avant de laisser place à la suivante.",
  about_quote: "Je ne cherche pas à copier ce que je vois, mais à garder la sensation qu'il m'a laissée.",
  // À remplacer par les vraies coordonnées de l'agent (chiffres uniquement, indicatif compris)
  whatsapp_number: "2250000000000",
  facebook_url: "https://www.facebook.com/",
};

async function main() {
  await prisma.artwork.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.technique.deleteMany();
  await prisma.exhibition.deleteMany();
  await prisma.setting.deleteMany();

  for (const c of collections) await prisma.collection.create({ data: c });
  for (const t of techniques) await prisma.technique.create({ data: t });

  const colBySlug = Object.fromEntries((await prisma.collection.findMany()).map((c) => [c.slug, c.id]));
  const techByName = Object.fromEntries((await prisma.technique.findMany()).map((t) => [t.name, t.id]));

  let position = 0;
  for (const a of artworks) {
    const { photo, collection, technique, ...rest } = a;
    await prisma.artwork.create({
      data: {
        ...rest,
        position: position++,
        imageUrl: img(photo, 1200),
        thumbUrl: img(photo, 500),
        collectionId: colBySlug[collection],
        techniqueId: techByName[technique],
      },
    });
  }

  await prisma.exhibition.createMany({ data: exhibitions });
  await prisma.setting.createMany({ data: Object.entries(settings).map(([key, value]) => ({ key, value })) });

  console.log(`Seed terminé : ${artworks.length} œuvres, ${collections.length} collections.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
