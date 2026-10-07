/**
 * Données du site.
 *
 * Les œuvres et les collections décrivent les toiles réelles de l'artiste, dont les
 * photos sont versionnées dans client/public/images/oeuvres. Expositions et
 * publications restent des exemples à remplacer.
 */
import "dotenv/config";
import { PrismaClient, ExhibitionKind, PublicationKind } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

/**
 * Chemin public d'une photo d'œuvre. Les fichiers sont servis par le frontend
 * (client/public/images/oeuvres), pas par l'API : un chemin relatif fonctionne
 * aussi bien derrière Vite en développement que sur Vercel en production, et
 * reste couvert par la directive CSP « img-src 'self' ».
 */
const img = (file: string) => `/images/oeuvres/${file}`;

const collections = [
  { slug: "ribambelles", name: "Ribambelles", color: "#7c3aed", position: 1,
    description: "Les bandes d'enfants, serrées les unes contre les autres, qui occupent toute la toile." },
  { slug: "doudous-et-cartables", name: "Doudous et Cartables", color: "#9333ea", position: 2,
    description: "Oursons, ardoises et premiers mots écrits à la craie." },
  { slug: "ballons-et-coeurs", name: "Ballons et Cœurs", color: "#db2777", position: 3,
    description: "Un fil, un ballon, et tout ce qu'on n'ose pas dire." },
  { slug: "racines", name: "Racines", color: "#ea580c", position: 4,
    description: "Drapeaux, cartes et ciels d'Afrique de l'Ouest." },
  { slug: "jardins-interieurs", name: "Jardins Intérieurs", color: "#0d9488", position: 5,
    description: "Fleurs, papillons et nuages pour seule compagnie." },
];

/**
 * Techniques affichées sur la page « À propos », barres classées par `mastery` décroissant.
 *
 * La liste décrivait auparavant de l'huile et de l'aquarelle, qui n'apparaissent dans
 * aucune toile : la page affichait « Huile sur toile 90 % » sans une seule œuvre dans
 * cette technique. Les quatre entrées ci-dessous correspondent à ce que montrent les
 * photos. « Acrylique sur toile » et « Technique mixte » gardent leur nom exact : les
 * œuvres s'y rattachent par ce libellé.
 */
const techniques = [
  { name: "Acrylique sur toile", mastery: 92,
    description: "Les fonds, les aplats et les cernes de couleur : la base de presque toutes les toiles." },
  { name: "Technique mixte", mastery: 84,
    description: "Acrylique, marqueur et pastel sur la même toile, parfois sur panneau de bois." },
  { name: "Marqueur et pastel à l'huile", mastery: 76,
    description: "Le trait fluo qui détoure chaque figure, repassé jusqu'à ce qu'il vibre sur le fond." },
  { name: "Coulure et projection", mastery: 70,
    description: "La peinture lancée ou laissée couler sur toute la hauteur, avant que les personnages soient posés." },
];

/**
 * Les 22 toiles photographiées dans client/public/images/oeuvres.
 *
 * `image` est la photo affichée en grand (modale et carrousel), `thumb` celle de
 * la grille et de la recherche. Dix toiles ont été photographiées deux fois : le
 * cliché le plus défini sert d'image principale, l'autre de vignette. Les toiles
 * sans second cliché laissent `thumb` à null — le sérialiseur retombe alors sur
 * `imageUrl` (voir server/src/lib/serializers.ts).
 *
 * `year` et `dimensions` sont volontairement absents : ces informations
 * n'accompagnaient pas les photos et ne doivent pas être inventées. Elles
 * s'ajoutent œuvre par œuvre dans Prisma Studio (`npm --prefix server run db:studio`) ;
 * l'interface affiche « — » tant qu'elles manquent.
 */
const artworks = [
  { slug: "deux-oursons-et-la-poupee", title: "Deux Oursons et la Poupée", collection: "doudous-et-cartables",
    technique: "Technique mixte", featured: true, image: "img27.jpeg", thumb: "img1.jpeg",
    description: "Deux têtes d'ourson cernées de bleu et d'orange veillent sur une figure debout. Le fond brun est rayé de coulures verticales et criblé de mots écrits à la main : « école », « vacance », « jolie »." },

  { slug: "coucou", title: "Coucou", collection: "ribambelles",
    technique: "Acrylique sur toile", featured: true, image: "img2.jpeg", thumb: null,
    description: "Trois personnages et un papillon se détachent sur un orange saturé. Les contours bleus et roses sont repassés plusieurs fois ; les mots « coucou » et « love » traversent la toile." },

  { slug: "la-ronde-mauve", title: "La Ronde Mauve", collection: "doudous-et-cartables",
    technique: "Technique mixte", featured: false, image: "img3.jpeg", thumb: null,
    description: "Un ourson aux longs bras plane au-dessus de trois figures mauves. Les cernes arc-en-ciel se superposent sur un fond vert acide entièrement ruisselant." },

  { slug: "enfant-sous-la-lune", title: "Enfant sous la Lune", collection: "racines",
    technique: "Technique mixte", featured: false, image: "img4.jpeg", thumb: null,
    description: "Une silhouette cernée de jaune tient un petit drapeau, une lune pleine occupe le coin supérieur droit. Les mots « africain », « union » et « voyage » sont tracés dans la peinture encore fraîche." },

  { slug: "lire-ecrire-un-plus-un", title: "Lire, Écrire, 1 + 1", collection: "doudous-et-cartables",
    technique: "Acrylique sur toile", featured: true, image: "img25.jpeg", thumb: "img5.jpeg",
    description: "Une ardoise noire porte « lire », « écrire », « 1 + 1 ». Deux figures roses l'encadrent, un ourson doré apparaît en bas à droite, et tout le fond part en coulures vertes et bleues." },

  { slug: "la-fille-orange-et-le-garcon-bleu", title: "La Fille Orange et le Garçon Bleu", collection: "ribambelles",
    technique: "Technique mixte", featured: false, image: "img24.jpeg", thumb: "img6.jpeg",
    description: "Deux enfants se font face, l'un orange, l'autre bleu nuit, cernés de vert d'eau. Au-dessus d'eux flottent un nuage et une bulle de pensée." },

  { slug: "joie-enfant-ballon", title: "Joie, Enfant, Ballon", collection: "racines",
    technique: "Technique mixte", featured: false, image: "img26.jpeg", thumb: "img7.jpeg",
    description: "Quatre figures et un ballon jaune sur un fond violet entièrement ruisselé. Une écharpe orange, blanche et verte barre la silhouette centrale ; « joie », « enfant » et « amour » courent entre les coulures." },

  { slug: "bleu-outremer", title: "Bleu Outremer", collection: "doudous-et-cartables",
    technique: "Acrylique sur toile", featured: false, image: "img8.jpeg", thumb: null,
    description: "Un ourson couché et une figure debout, tous deux peints en bleu franc, se détachent sur un bordeaux moucheté. Les cernes passent du noir au cyan." },

  { slug: "les-trois-curieux", title: "Les Trois Curieux", collection: "ribambelles",
    technique: "Acrylique sur toile", featured: false, image: "img9.jpeg", thumb: null,
    description: "Trois enfants aux yeux ronds se tiennent côte à côte, cernés de rose et de bleu. Le fond, vert et rouge, est entièrement tacheté de projections." },

  { slug: "arc-en-ciel-sur-le-continent", title: "Arc-en-ciel sur le Continent", collection: "racines",
    technique: "Acrylique sur toile", featured: true, image: "img10.jpeg", thumb: null,
    description: "Un arc-en-ciel traverse la toile en diagonale ; à gauche, la forme blanche du continent africain. Format panoramique, fond rouge brique et vert bouteille." },

  { slug: "la-marguerite", title: "La Marguerite", collection: "jardins-interieurs",
    technique: "Acrylique sur toile", featured: true, image: "img29.jpeg", thumb: "img11.jpeg",
    description: "Un enfant bleu pâle, cerné de rose et d'orange, tend une marguerite blanche plus grande que lui. Le fond bleu nuit est semé de pastilles turquoise." },

  { slug: "le-ballon-grenat", title: "Le Ballon Grenat", collection: "ballons-et-coeurs",
    technique: "Technique mixte", featured: true, image: "img12.jpeg", thumb: "img17.jpeg",
    description: "Deux enfants bleus se partagent un ballon grenat. Papillons verts, pastilles cyan, et un fond crème entièrement griffé de fils noirs." },

  { slug: "le-nuage-blanc", title: "Le Nuage Blanc", collection: "ribambelles",
    technique: "Acrylique sur toile", featured: false, image: "img30.jpeg", thumb: "img13.jpeg",
    description: "Trois enfants cernés de turquoise, un nuage blanc dans un cadre violet, des papillons dorés. Le fond mêle prune, bleu et rose en touches serrées." },

  { slug: "fratrie", title: "Fratrie", collection: "ribambelles",
    technique: "Acrylique sur toile", featured: false, image: "img31.jpeg", thumb: "img14.jpeg",
    description: "Trois enfants roses aux grands yeux ovales sur un sarcelle profond. Les cernes jaune, vert et violet se répondent ; un nuage mauve occupe le coin gauche." },

  { slug: "le-papillon-bleu", title: "Le Papillon Bleu", collection: "jardins-interieurs",
    technique: "Acrylique sur toile", featured: false, image: "img15.jpeg", thumb: null,
    description: "Une figure seule, cernée de vert fluo, lève la main vers un papillon bleu. Fond rose brique ponctué de pastilles turquoise et de fils noirs." },

  { slug: "ballon-coeur", title: "Ballon-Cœur", collection: "ballons-et-coeurs",
    technique: "Acrylique sur toile", featured: false, image: "img16.jpeg", thumb: null,
    description: "Une petite figure en robe blanche tient un ballon en forme de cœur. Le fond, vert sombre et brun, s'éclaire de ronds jaunes et blancs." },

  { slug: "coeur-brise", title: "Cœur Brisé", collection: "ballons-et-coeurs",
    technique: "Technique mixte", featured: true, image: "img18.jpeg", thumb: null,
    description: "Format vertical. Un cœur rose fendu flotte au bout d'un fil ; en dessous, une figure repliée sur elle-même. Un papillon mauve, et rien d'autre, sur un fond brun profond." },

  { slug: "les-deux-rieurs", title: "Les Deux Rieurs", collection: "ribambelles",
    technique: "Technique mixte", featured: false, image: "img19.jpeg", thumb: null,
    description: "Deux visages hilares, dents apparentes, cernés de vert pâle. Une fleur et une troisième tête rouge complètent la scène sur un fond turquoise et prune." },

  { slug: "la-voiture-et-le-ballon", title: "La Voiture et le Ballon", collection: "ribambelles",
    technique: "Technique mixte", featured: false, image: "img20.jpeg", thumb: null,
    description: "Trois enfants debout sur un fond vert anis ruisselé de noir. Une voiture cernée de rouge flotte à gauche, un ballon orange roule à leurs pieds." },

  { slug: "la-tete-dans-les-nuages", title: "La Tête dans les Nuages", collection: "jardins-interieurs",
    technique: "Acrylique sur toile", featured: false, image: "img21.jpeg", thumb: null,
    description: "Format vertical. Une figure rose cernée de vert traverse un ciel bleu peuplé de nuages blancs soulignés d'orange." },

  { slug: "la-danse-des-oursons", title: "La Danse des Oursons", collection: "doudous-et-cartables",
    technique: "Technique mixte", featured: false, image: "img22.jpeg", thumb: null,
    description: "Une figure aux grands yeux blancs ouvre les bras entre deux oursons, l'un bordeaux, l'autre orange. Fond bleu roi criblé de projections." },

  { slug: "la-fleur-offerte", title: "La Fleur Offerte", collection: "ribambelles",
    technique: "Technique mixte", featured: false, image: "img23.jpeg", thumb: null,
    description: "Deux enfants cernés de vert fluo, une petite fleur entre eux, un nuage et un ballon jaune enfermés dans une bulle. Fond bleu et saumon entièrement tacheté." },
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

const publications = [
  { title: "Catalogue de l'exposition personnelle (exemple)", kind: PublicationKind.CATALOGUE, author: null,
    source: "Galerie à renseigner", year: 2026, note: "Texte de présentation et reproductions des œuvres exposées." },
  { title: "Portrait d'artiste (exemple)", kind: PublicationKind.ARTICLE, author: "Auteur à renseigner",
    source: "Magazine à renseigner", year: 2024, note: null },
  { title: "Entretien autour de la série Songes Intérieurs (exemple)", kind: PublicationKind.INTERVIEW, author: null,
    source: "Média à renseigner", year: 2023, note: null },
  { title: "Peintres d'Afrique de l'Ouest (exemple)", kind: PublicationKind.BOOK, author: "Auteur à renseigner",
    source: "Éditeur à renseigner", year: 2023, note: "Ouvrage collectif, notice consacrée à l'artiste." },
];

const settings: Record<string, string> = {
  artist_name: "OliKrys",
  artist_role: "Artiste peintre",
  // Textes de l'en-tête de la galerie, modifiables depuis la page d'accueil (admin)
  hero_eyebrow: "Bienvenue dans",
  hero_title: "La Galerie",
  // L'accroche annonçait de l'huile et de l'aquarelle : aucune toile n'est dans ces
  // techniques. Elle décrit maintenant ce que le visiteur voit réellement en arrivant.
  hero_tagline: "Des enfants et des doudous cernés de néon sur des fonds en coulures, à parcourir comme on visite un atelier.",
  footer_motto: "Peindre ce qui reste quand on ferme les yeux",
  about_intro: "Autodidacte, OliKrys peint depuis plusieurs années entre souvenirs d'enfance, scènes de rue et paysages d'Afrique de l'Ouest.",
  about_bio: "Son travail part presque toujours d'une observation précise : une lumière sur un mur, un geste, un reflet. Au fil des séances, le motif se simplifie et la couleur prend le relais. Chaque série explore une idée pendant une ou deux années avant de laisser place à la suivante.",
  about_quote: "Je ne cherche pas à copier ce que je vois, mais à garder la sensation qu'il m'a laissée.",
  // Chiffres uniquement, indicatif compris : whatsappLink() retire tout le reste
  whatsapp_number: "2250566921793",
  facebook_url: "https://www.facebook.com/",
  instagram_url: "https://www.instagram.com/sibri_olikrys/",
  tiktok_url: "https://www.tiktok.com/@olikrys?_r=1&_t=ZS-9AKOSkHvHsr",
};

async function main() {
  await prisma.artwork.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.technique.deleteMany();
  await prisma.exhibition.deleteMany();
  await prisma.publication.deleteMany();
  await prisma.setting.deleteMany();

  for (const c of collections) await prisma.collection.create({ data: c });
  for (const t of techniques) await prisma.technique.create({ data: t });

  const colBySlug = Object.fromEntries((await prisma.collection.findMany()).map((c) => [c.slug, c.id]));
  const techByName = Object.fromEntries((await prisma.technique.findMany()).map((t) => [t.name, t.id]));

  let position = 0;
  for (const a of artworks) {
    const { image, thumb, collection, technique, ...rest } = a;
    await prisma.artwork.create({
      data: {
        ...rest,
        position: position++,
        imageUrl: img(image),
        // Second cliché de la même toile quand il en existe un ; sinon null, et le
        // sérialiseur renvoie imageUrl à sa place pour la grille.
        thumbUrl: thumb ? img(thumb) : null,
        collectionId: colBySlug[collection],
        techniqueId: techByName[technique],
      },
    });
  }

  await prisma.exhibition.createMany({ data: exhibitions });
  await prisma.publication.createMany({ data: publications });
  await prisma.setting.createMany({ data: Object.entries(settings).map(([key, value]) => ({ key, value })) });

  console.log(`Seed terminé : ${artworks.length} œuvres, ${collections.length} collections, ${publications.length} publications.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
