# Politique de sécurité

## Signaler une faille

Merci de **ne pas ouvrir de ticket public** pour une faille de sécurité : le dépôt
est public, tout le monde le lirait avant qu'elle soit corrigée.

Utilisez le signalement privé de GitHub : onglet **Security** du dépôt, puis
**Report a vulnerability**. Le message n'est visible que du mainteneur.

Indiquez, si possible :

- la page ou la route concernée ;
- les étapes pour reproduire ;
- ce que la faille permet à un tiers de faire.

## Ce qui est couvert

Le site (React), l'API (Express, Prisma) et leur configuration de déploiement. Les
comptes de démonstration et les valeurs d'exemple de `server/.env.example` ne sont
pas des secrets : ils sont publics, et l'API refuse de démarrer en production avec le
mot de passe d'exemple.

## Pour le mainteneur

Le signalement privé doit être activé une fois : **Settings → Code security →
Private vulnerability reporting → Enable**. Tant que ce n'est pas fait, le bouton
« Report a vulnerability » n'apparaît pas.
