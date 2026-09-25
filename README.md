# OliKrys, galerie d'art virtuelle

Refonte du site de la galerie OliKrys avec :

| Couche | Outils |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router |
| Backend | Node.js, Express 5, TypeScript, Zod |
| Base de données | PostgreSQL 16 |
| ORM | Prisma 6 (client sans moteur Rust, via `@prisma/adapter-pg`) |
| Tests | Vitest |
| Rechargement en développement | nodemon (API) et Vite (site) |

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

### Rechargement automatique

`npm run dev` lance les deux serveurs de développement côté à côté :

| Serveur | Outil | Recharge sur |
| --- | --- | --- |
| Site (5173) | Vite | Tout `client/src` — remplacement à chaud, sans perdre l'état de la page |
| API (4000) | nodemon | `server/src`, **`server/.env`** et `server/prisma/schema.prisma` |

La configuration de nodemon est dans `server/nodemon.json`. Il redémarre le processus
entier via `tsx`, ce qui règle un piège de `tsx watch` : une modification de `.env`
n'était pas vue, et il fallait couper l'API à la main pour qu'un nouveau mot de passe
admin ou une nouvelle chaîne de connexion soit pris en compte.

Les fichiers de tests sont exclus de la surveillance : les modifier ne coupe pas l'API
en cours d'utilisation. `npm --prefix server run dev:tsx` reste disponible si vous
préférez l'ancien comportement.

> Le compte admin est recréé depuis `server/.env` **à chaque démarrage de l'API**.
> Un redémarrage suffit donc à appliquer un nouveau `ADMIN_PASSWORD`.
>
> Après un `prisma generate` (schéma modifié), redémarrez l'API : un processus déjà
> lancé garde en mémoire l'ancien client Prisma et répond 500 sur les routes touchées.

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
npm test                          # serveur puis client
npm --prefix server test          # 83 tests
npm --prefix client test          # 18 tests
npm --prefix server run test:watch
```

**101 tests, aucune base de données requise.** La logique est volontairement séparée
de Prisma et d'Express, et les rares tests de routes simulent Prisma.

| Côté | Couverture |
| --- | --- |
| Serveur | Hachage des mots de passe et vérification à temps constant (anti-énumération), configuration du compte admin, options du cookie de session, origines CORS, politique de sécurité du contenu, contrôle d'`Origin` (défense CSRF), limitation des tentatives, séries du tableau de bord, 20 comptes de démonstration |
| Serveur | Validation du formulaire de contact, leurre anti-robot, forme publique d'un message |
| Serveur | Parcours HTTP complet d'un message : `POST /api/contact` → `GET`/`PATCH /api/admin/messages`, avec quota, CSRF et contrôle des droits |
| Client | Playlist du widget sonore : catégories, intégrité des listes, navigation cyclique, index toujours dans les bornes |

## Musique

Le widget en bas à gauche propose deux catégories, chacune parcourable avec les
flèches ◀ ▶ (un compteur « 2/3 » indique où l'on se trouve) :

- **Ambiances** — nappes d'accords générées en direct par Web Audio, aucun fichier téléchargé.
  Trois réglages fournis : *Atelier*, *Aube*, *Nocturne*.
- **Morceaux** — fichiers audio servis depuis `client/public/audio/`.

Les flèches n'apparaissent que lorsqu'une catégorie compte au moins deux éléments.
Chaque catégorie retient sa position : revenir aux morceaux retrouve celui qu'on écoutait.
Grâce à `preload="none"`, rien n'est téléchargé tant que le visiteur n'a pas lancé un morceau.

### Ajouter un morceau ou une ambiance

Tout se déclare dans **`client/src/lib/playlist.ts`** — le composant lit ces listes et n'a
jamais besoin d'être modifié.

Pour un **morceau**, déposez le master dans `medias-sources/audio/`, convertissez-le, puis
ajoutez une entrée à `MORCEAUX` :

```bash
ffmpeg -i "medias-sources/audio/mon-master.wav" -codec:a libmp3lame -b:a 192k client/public/audio/mon-titre.mp3
ffmpeg -i "medias-sources/audio/mon-master.wav" -codec:a libvorbis  -q:a 5    client/public/audio/mon-titre.ogg
```

Les masters non compressés (`.wav`, `.aiff`, `.flac`) sont exclus du dépôt par `.gitignore` :
un master de 3 minutes pèse une trentaine de mégaoctets et alourdirait l'historique git
définitivement. Seuls les fichiers web convertis sont versionnés. Le chemin complet de
`ffmpeg` sur cette machine est noté dans `medias-sources/README.md`.

Pour une **ambiance**, aucun fichier : ajoutez une entrée à `AMBIANCES` avec ses accords
(en hertz), son intervalle, sa coupure de filtre et son écho. Les tests vérifient que les
valeurs restent dans des bornes jouables.

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

`CLIENT_ORIGIN` a un second rôle, plus strict : toute requête modifiante (`POST`, `PUT`,
`DELETE`) dont l'en-tête `Origin` n'y figure pas est refusée en **403 « Origine non
autorisée »**. C'est la défense CSRF, et elle reste active même en `SameSite=None`.
Une origine oubliée dans cette liste se traduit donc par une connexion impossible,
et non par une simple erreur CORS dans la console.

Les barres finales et les chemins collés par erreur (`https://site.app/`,
`https://site.app/contact`) sont retirés automatiquement : la comparaison est une
égalité stricte avec ce qu'envoie le navigateur, et l'erreur est trop facile à faire.

## Déploiement : API sur Render, site sur Vercel

Base de données : **Neon**. API : **Render** (`render.yaml`). Site : **Vercel**
(`client/vercel.json`). Les deux fichiers de configuration sont versionnés ; aucun
secret n'y figure, ils sont saisis dans l'interface de chaque plateforme.

### 1. Render — l'API

New > Blueprint > sélectionner ce dépôt. Render lit `render.yaml` et demande les
variables marquées `sync: false` :

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | chaîne Neon *pooled*, avec `sslmode=require` |
| `CLIENT_ORIGIN` | à laisser vide pour l'instant — voir l'étape 3 |
| `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_NAME` | identifiants de connexion |
| `ADMIN_PASSWORD` | **12 caractères minimum**, sinon l'API refuse de démarrer |

`NODE_ENV`, `NODE_VERSION`, `TRUST_PROXY=1` et `CROSS_SITE_COOKIE=true` sont déjà
dans le blueprint. `PORT` est injecté par Render : ne pas le définir.

Le build lance `npm ci --include=dev && npm run build && npx prisma migrate deploy` —
les migrations sont donc appliquées à chaque déploiement, sans jamais toucher aux
données existantes. Notez l'URL obtenue, par exemple
`https://olikrys-api.onrender.com`.

> **Plan gratuit** : l'instance s'endort après 15 minutes sans trafic et met
> environ 50 secondes à se réveiller. Le premier visiteur voit « Chargement… »
> pendant ce temps. La route `/api/health` sert de réveil manuel.

### 2. Vercel — le site

New Project > sélectionner ce dépôt, puis **Root Directory = `client`**. Vercel lit
`client/vercel.json` pour le reste (build Vite, dossier `dist`, en-têtes de sécurité).
Une seule variable à saisir :

```
VITE_API_URL = https://olikrys-api.onrender.com
```

Sans barre finale et sans `/api` : le client l'ajoute lui-même. Cette variable est
intégrée au bundle au moment du build — **changer sa valeur impose un redéploiement**.

`vercel.json` contient aussi la règle qui renvoie toutes les routes vers
`index.html`. Sans elle, ouvrir `/contact` ou `/bibliographie` directement (ou
simplement rafraîchir la page) donnerait un 404 : ces routes n'existent que côté
navigateur.

### 3. Boucler la configuration

Retourner sur Render et renseigner `CLIENT_ORIGIN` avec le domaine Vercel obtenu :

```
CLIENT_ORIGIN = https://olikrys.vercel.app
```

Plusieurs domaines se séparent par une virgule (domaine `.vercel.app` **et** domaine
personnalisé). Render redémarre l'API automatiquement.

> Les déploiements de prévisualisation Vercel ont une URL différente par branche.
> Elles ne sont pas dans `CLIENT_ORIGIN` : la connexion et le formulaire de contact
> y seront bloqués. C'est volontaire — ajoutez l'URL à la liste si vous devez tester
> une préversion.

### 4. Vérifier la mise en ligne

```bash
curl https://olikrys-api.onrender.com/api/health     # {"status":"ok","database":"ok"}
```

Puis, sur le site : ouvrir `/bibliographie` **en rafraîchissant la page** (teste la
règle de réécriture Vercel), se connecter sur `/connexion` puis **recharger** (teste
le cookie inter-domaines), et envoyer un message depuis `/contact` avant de le
retrouver sur `/admin` (teste CORS, CSRF et la base).

Si la connexion se perd au rechargement, c'est `CROSS_SITE_COOKIE` ou `CLIENT_ORIGIN`.
Si le formulaire renvoie 403, c'est `CLIENT_ORIGIN`.

### Avant d'ouvrir le site au public

```bash
npm --prefix server run db:clean:demo            # aperçu
npm --prefix server run db:clean:demo -- --oui   # supprime les 20 comptes de démo
```

Voir aussi la section « À personnaliser avant la mise en ligne » ci-dessous : les
œuvres, expositions, publications et coordonnées sont encore des exemples.

## Structure

```
olikrys/
├── docker-compose.yml         PostgreSQL 16
├── server/
│   ├── prisma/
│   │   ├── schema.prisma      Artwork, Collection, Technique, Exhibition,
│   │   │                      Publication, ContactMessage, Setting,
│   │   │                      User, Session
│   │   ├── seed.ts            Œuvres, collections, expositions, publications
│   │   └── seed-members.ts    20 comptes membres de démonstration
│   ├── tests/                 Suite Vitest (sans base de données)
│   └── src/
│       ├── index.ts           Démarrage, validation de la configuration
│       ├── app.ts             Express : middlewares, CORS, routes, statiques
│       ├── lib/               Prisma, auth, statistiques, comptes de démo, sérialisation
│       ├── middleware/        Erreurs (404, Zod, 500), limitation de tentatives
│       └── routes/            artworks, collections, settings, about,
│                              publications, contact, auth, admin
├── medias-sources/            Originaux avant conversion (voir son README)
│   ├── audio/                 Masters .wav — hors dépôt
│   └── images/                Photos d'origine
└── client/
    ├── tests/                 Suite Vitest (logique pure : playlist)
    └── src/
        ├── api/               Client HTTP typé et types partagés
        ├── context/           Paramètres du site, thème, recherche, session
        ├── hooks/             useAsync, useReveal, useElementWidth
        ├── lib/               Playlist du widget sonore, lien WhatsApp, stockage
        ├── components/        Navbar, Loader, Slider, Grille, Modale, Recherche,
        │                      Ambiance, graphiques du tableau de bord
        ├── pages/             Galerie, À propos, Bibliographie, Contact,
        │                      Inscription, Connexion, Administration, 404
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
| POST | `/api/contact` | Message du formulaire public (`name`, `email`, `subject`, `message`), enregistré en base |
| POST | `/api/auth/register` | Inscription d'un membre (`name`, `email`, `password`) et ouverture de session |
| POST | `/api/auth/login` | Connexion (`identifier` = pseudo **ou** e-mail, `password`) |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Compte connecté, ou `null` |
| GET | `/api/admin/stats` | Statistiques d'inscription, admin uniquement. Filtre : `days` (7, 30 ou 90) |
| GET | `/api/admin/messages` | Messages de contact reçus, admin uniquement. Filtres : `status`, `limit` |
| PATCH | `/api/admin/messages/:id` | Change le statut d'un message : `NEW`, `READ` ou `ARCHIVED` |

`/api/auth/login` est limité à 10 tentatives par adresse IP toutes les 10 minutes, `/api/auth/register` et `/api/contact` à 5 par heure. Le formulaire de contact porte en plus un champ leurre (`website`) : rempli, la requête reçoit une réponse normale mais rien n'est écrit en base. La connexion consomme le même temps de calcul que l'identifiant existe ou non, afin que la durée de réponse ne révèle pas quels comptes sont inscrits.

Les méthodes `GET` et `HEAD` restent ouvertes à toutes les origines ; les requêtes modifiantes sont soumises au contrôle d'`Origin` décrit plus haut.

## Fonctionnalités reprises

- Écran de chargement animé (une fois par session)
- Hero avec particules et accès direct à la galerie
- Filtres par collection, bascule entre vue « Galerie » (carrousel encadré) et vue « Grille »
- Navigation clavier (flèches, Échap) et balayage tactile
- Fiche détaillée en modale, avec lien partageable `/?oeuvre=slug` et bouton WhatsApp prérempli
- Recherche d'œuvres côté serveur
- Thème sombre / clair mémorisé
- Curseur personnalisé sur ordinateur
- Widget sonore à deux catégories parcourables : ambiances générées en Web Audio et morceaux enregistrés (flèches ◀ ▶, compteur)
- Page À propos alimentée par la base : chiffres clés, démarche, techniques, expositions, collections
- Page Bibliographie : portrait de l'artiste, chiffres clés et références groupées par année
- Page Contact : formulaire enregistré en base, relu et trié depuis le tableau de bord admin
- Section contact WhatsApp / Facebook et pied de page

## À personnaliser avant la mise en ligne

Le code est prêt ; ce sont les **contenus** qui sont encore des exemples. État relevé
sur la base de production le 25 septembre 2026 :

| À remplacer | Où | État |
| --- | --- | --- |
| **Numéro WhatsApp** | table `settings`, clé `whatsapp_number` | ✅ `+225 05 66 92 17 93` |
| **Page Facebook** — pointe vers l'accueil de Facebook | table `settings`, clé `facebook_url` | ⛔ placeholder |
| **Œuvres** — 10 sur 10 utilisent une photo Unsplash provisoire | `server/prisma/seed.ts` ou Prisma Studio | ⛔ 10/10 |
| **Expositions** — 4 sur 4 en « à renseigner » | table `exhibitions` | ⛔ 4/4 |
| **Publications** — 4 sur 4 marquées « (exemple) » | table `publications` | ⛔ 4/4 |
| **Comptes de démonstration** — 20 membres `@example.com` | `npm --prefix server run db:clean:demo -- --oui` | ⛔ 20 comptes |
| **Textes du site** | `settings` : `hero_tagline`, `about_intro`, `about_bio`, `about_quote`, `footer_motto` | ✅ rédigés, à relire |
| **Portrait** | `client/public/images/olikrys.png` | ✅ en place |
| **Mot de passe admin** | `ADMIN_PASSWORD`, 12 caractères minimum | ✅ conforme |

Le plus simple pour les contenus est Prisma Studio, qui écrit directement dans Neon :

```bash
npm --prefix server run db:studio
```

⚠️ **Ne pas lancer `db:seed` sur la base de production** : le script commence par un
`deleteMany()` sur les œuvres, collections, expositions, publications et réglages.
Il est fait pour repartir de zéro en développement.

Deux points juridiques à trancher avant l'ouverture :

- **Droits du morceau** « TOUT VA CHANGER », crédité « Artiste inconnu ». Les fichiers
  convertis sont déjà publiés sur GitHub.
- **Mentions légales et données personnelles** : le formulaire de contact et les
  comptes membres collectent nom et e-mail. Une page de mentions légales et une
  politique de confidentialité sont attendues pour un site public en France.

### Ajouter un back-office d'écriture

Le tableau de bord `/admin` est en lecture seule, sauf pour le statut des messages.
Le jour où des routes d'écriture apparaissent (créer une œuvre, modifier un texte),
le CSRF passe de théorique à sérieux : le contrôle d'`Origin` est déjà en place et
couvre `POST`, `PUT`, `PATCH` et `DELETE`, mais il faudra le réévaluer.
