# OliKrys, galerie d'art virtuelle

Refonte du site de la galerie OliKrys avec :

| Couche | Outils |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router |
| Backend | Node.js, Express 5, TypeScript, Zod |
| Base de données | PostgreSQL 16 |
| ORM | Prisma 6 (client sans moteur Rust, via `@prisma/adapter-pg`) |
| Tests | Vitest |

Les œuvres, collections, techniques, expositions et paramètres se modifient dans `server/prisma/seed.ts` ou avec Prisma Studio (`npm --prefix server run db:studio`). Le site dispose d'un tableau de bord d'administration en lecture seule (`/admin`) qui présente les statistiques d'inscription des membres.

## Démarrage rapide

Prérequis : Node.js 20 ou plus, et PostgreSQL.

```bash
# 1. Dépendances (racine, server, client)
npm run install:all

# 2. Variables d'environnement
cp server/.env.example server/.env        # ajuster DATABASE_URL si besoin

# 3. Base PostgreSQL (si vous utilisez Docker)
npm run db:up

# 4. Création des tables + données de démonstration
npm run db:setup

# 5. (facultatif) 20 comptes membres pour peupler le tableau de bord
npm --prefix server run db:seed:members

# 6. Lancer l'API (port 4000) et le site (port 5173)
npm run dev
```

Ouvrir http://localhost:5173.

### Installer PostgreSQL

L'étape 3 suppose Docker Desktop. Si `docker` n'est pas disponible sur votre machine, deux options :

**Docker Desktop** — https://www.docker.com/products/docker-desktop/ puis `npm run db:up`.

**PostgreSQL natif** — https://www.postgresql.org/download/windows/ puis, dans psql en tant que `postgres` :

```sql
CREATE USER olikrys WITH PASSWORD 'olikrys' CREATEDB;
CREATE DATABASE olikrys OWNER olikrys;
```

Reprenez ensuite à l'étape 4. Sans base, l'API démarre mais toutes les routes de données répondent 500 : `GET /api/health` est le moyen le plus rapide de vérifier la connexion.

## Compte admin

Le compte est créé, ou mis à jour, à chaque démarrage de l'API à partir de `server/.env` :

| Variable | Valeur par défaut | Rôle |
| --- | --- | --- |
| `ADMIN_USERNAME` | `olykris` | Pseudo de connexion (sans arobase, 3 à 40 caractères) |
| `ADMIN_EMAIL` | `olykris@olikrys.local` | Adresse, utilisable aussi comme identifiant |
| `ADMIN_PASSWORD` | `0000` | Mot de passe |
| `ADMIN_NAME` | `Olykris` | Nom affiché |

La connexion accepte **le pseudo ou l'adresse e-mail**, sans distinction de casse : `Olykris` et `olykris@olikrys.local` mènent au même compte.

> ⚠️ **`0000` est un mot de passe de développement.** L'API **refuse de démarrer** avec `NODE_ENV=production` tant que `ADMIN_PASSWORD` fait moins de 12 caractères. Changez-le avant toute mise en ligne.

L'inscription publique crée uniquement des comptes membres. Une fois connecté, l'admin accède à `/admin` : nombre de membres, inscriptions par jour et derniers inscrits.

## Tests

```bash
npm --prefix server test          # une passe
npm --prefix server run test:watch
```

37 tests couvrent le hachage des mots de passe, la configuration du compte admin, les options du cookie de session, les origines CORS, la limitation des tentatives, les séries du tableau de bord et les 20 comptes de démonstration. **Aucune base de données n'est nécessaire** : la logique testée est volontairement séparée de Prisma et d'Express.

## Production

```bash
npm run build
cd server && npx prisma migrate deploy && NODE_ENV=production npm start
```

Le serveur Express sert alors l'API sous `/api` et le build React (`client/dist`) sur toutes les autres routes, depuis un seul port.

### Front et API sur deux domaines différents

Le cookie de session ne circule d'un domaine à l'autre que si les trois conditions suivantes sont réunies :

1. `CLIENT_ORIGIN` liste l'origine exacte du front (obligatoire en production, plusieurs valeurs séparées par des virgules) ;
2. `CROSS_SITE_COOKIE=true` côté serveur, ce qui bascule le cookie en `SameSite=None; Secure` — **HTTPS obligatoire** ;
3. `VITE_API_URL` pointe vers l'URL complète de l'API côté client.

Sans cela, la connexion semble réussir puis se perd au premier rechargement.

## Structure

```
olikrys/
├── docker-compose.yml         PostgreSQL 16
├── server/
│   ├── prisma/
│   │   ├── schema.prisma      Artwork, Collection, Technique, Exhibition,
│   │   │                      Publication, Setting, User, Session
│   │   ├── seed.ts            Œuvres, collections, expositions, publications
│   │   └── seed-members.ts    20 comptes membres de démonstration
│   ├── tests/                 Suite Vitest (sans base de données)
│   └── src/
│       ├── index.ts           Démarrage, validation de la configuration
│       ├── app.ts             Express : middlewares, CORS, routes, statiques
│       ├── lib/               Prisma, auth, statistiques, comptes de démo, sérialisation
│       ├── middleware/        Erreurs (404, Zod, 500), limitation de tentatives
│       └── routes/            artworks, collections, settings, about,
│                              publications, auth, admin
└── client/
    └── src/
        ├── api/               Client HTTP typé et types partagés
        ├── context/           Paramètres du site, thème, recherche, session
        ├── hooks/             useAsync, useReveal, useElementWidth
        ├── components/        Navbar, Loader, Slider, Grille, Modale, Recherche,
        │                      Ambiance, graphiques du tableau de bord
        ├── pages/             Galerie, À propos, Bibliographie, Inscription,
        │                      Connexion, Administration, 404
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
| GET | `/api/publications` | Bibliographie : livres, catalogues, articles et entretiens, du plus récent au plus ancien |
| POST | `/api/auth/register` | Inscription d'un membre (`name`, `email`, `password`) et ouverture de session |
| POST | `/api/auth/login` | Connexion (`identifier` = pseudo **ou** e-mail, `password`) |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Compte connecté, ou `null` |
| GET | `/api/admin/stats` | Statistiques d'inscription, admin uniquement. Filtre : `days` (7, 30 ou 90) |

`/api/auth/login` est limité à 10 tentatives par adresse IP toutes les 10 minutes, `/api/auth/register` à 5 par heure.

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

1. **Mot de passe admin** : remplacer `0000` par au moins 12 caractères dans `server/.env`.
2. **Coordonnées** : `whatsapp_number` (chiffres uniquement, indicatif compris) et `facebook_url` dans `server/prisma/seed.ts`, ou directement dans la table `settings`.
3. **Œuvres** : les titres, descriptions et images du seed sont des exemples. Les images viennent d'Unsplash et servent de visuels provisoires ; remplacez-les par les photos des vraies toiles.
4. **Textes** : `hero_tagline`, `about_intro`, `about_bio`, `about_quote`, `footer_motto` dans la table `settings`.
5. **Expositions** : les entrées marquées « exemple » sont à remplacer.
6. **Bibliographie** : même principe, les publications marquées « exemple » dans la table `publications` sont à remplacer.
7. **Comptes de démonstration** : supprimer les 20 membres `@example.com` insérés par `db:seed:members`.
