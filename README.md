# OliKrys, galerie d'art virtuelle

Refonte du site de la galerie OliKrys avec :

| Couche | Outils |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router |
| Backend | Node.js, Express 5, TypeScript, Zod |
| Base de données | PostgreSQL 16 |
| ORM | Prisma 6 (client sans moteur Rust, via `@prisma/adapter-pg`) |

L'espace d'administration du site d'origine n'est pas inclus. Les œuvres, collections, techniques, expositions et paramètres se modifient dans `server/prisma/seed.ts` ou avec Prisma Studio (`npm --prefix server run db:studio`).

## Démarrage rapide

Prérequis : Node.js 20 ou plus, et PostgreSQL (installé localement ou lancé avec Docker).

```bash
# 1. Dépendances (racine, server, client)
npm run install:all

# 2. Variables d'environnement
cp server/.env.example server/.env        # ajuster DATABASE_URL si besoin

# 3. Base PostgreSQL (si vous utilisez Docker)
npm run db:up

# 4. Création des tables + données de démonstration
npm run db:setup

# 5. Lancer l'API (port 4000) et le site (port 5173)
npm run dev
```

Ouvrir http://localhost:5173.

Sans Docker, créez la base à la main puis reprenez à l'étape 4 :

```sql
CREATE USER olikrys WITH PASSWORD 'olikrys' CREATEDB;
CREATE DATABASE olikrys OWNER olikrys;
```

## Production

```bash
npm run build
cd server && npx prisma migrate deploy && NODE_ENV=production npm start
```

Le serveur Express sert alors l'API sous `/api` et le build React (`client/dist`) sur toutes les autres routes, depuis un seul port.

## Structure

```
olikrys/
├── docker-compose.yml         PostgreSQL 16
├── server/
│   ├── prisma/
│   │   ├── schema.prisma      Modèles Artwork, Collection, Technique, Exhibition, Setting
│   │   └── seed.ts            Données de démonstration
│   └── src/
│       ├── index.ts           Démarrage du serveur
│       ├── app.ts             Express : middlewares, routes, fichiers statiques
│       ├── lib/               Client Prisma, mise en forme des réponses
│       ├── middleware/        Gestion des erreurs (404, validation Zod, 500)
│       └── routes/            artworks, collections, settings, about
└── client/
    └── src/
        ├── api/               Client HTTP typé et types partagés
        ├── context/           Paramètres du site, thème, recherche
        ├── hooks/             useAsync, useReveal
        ├── components/        Navbar, Loader, Slider, Grille, Modale, Recherche, Ambiance…
        ├── pages/             Galerie, À propos, 404
        └── styles/            Jetons de design et feuilles de style
```

## API

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/api/health` | État du serveur et de la base |
| GET | `/api/artworks` | Liste des œuvres. Filtres : `collection` (slug), `q` (recherche plein texte), `featured`, `page`, `limit` |
| GET | `/api/artworks/:slug` | Détail d'une œuvre |
| GET | `/api/collections` | Collections avec leur nombre d'œuvres |
| GET | `/api/settings` | Paramètres publics (`whatsapp_number`, `facebook_url`, textes du site) |
| GET | `/api/about` | Données de la page À propos : statistiques, techniques, expositions, collections |

## Fonctionnalités reprises

- Écran de chargement animé (une fois par session)
- Hero avec particules et accès direct à la galerie
- Filtres par collection, bascule entre vue « Galerie » (carrousel encadré) et vue « Grille »
- Navigation clavier (flèches, Échap) et balayage tactile
- Fiche détaillée en modale, avec lien partageable `/?oeuvre=slug` et bouton WhatsApp prérempli
- Recherche d'œuvres côté serveur
- Thème sombre / clair mémorisé
- Curseur personnalisé sur ordinateur
- Ambiance musicale générée en Web Audio (aucun fichier audio)
- Page À propos alimentée par la base : chiffres clés, démarche, techniques, expositions, collections
- Section contact WhatsApp / Facebook et pied de page

## À personnaliser avant la mise en ligne

1. **Coordonnées** : `whatsapp_number` (chiffres uniquement, indicatif compris) et `facebook_url` dans `server/prisma/seed.ts`, ou directement dans la table `settings`.
2. **Œuvres** : les titres, descriptions et images du seed sont des exemples. Les images viennent d'Unsplash et servent de visuels provisoires ; remplacez-les par les photos des vraies toiles.
3. **Textes** : `hero_tagline`, `about_intro`, `about_bio`, `about_quote`, `footer_motto` dans la table `settings`.
4. **Expositions** : les entrées marquées « exemple » sont à remplacer.
