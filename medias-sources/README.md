# Médias sources

Originaux fournis par l'artiste, **avant** conversion pour le web.
Rien ici n'est servi au visiteur : le site ne lit que les fichiers de
`client/public/`. Cette séparation évite d'envoyer un master de 31 Mo à
quelqu'un qui visite la galerie.

```
medias-sources/
├── audio/    masters non compressés (.wav, .aiff, .flac) — ignorés par git
└── images/   photos et visuels d'origine — versionnés s'ils restent légers
```

## Ce qui part sur GitHub, ce qui reste local

| Dossier | Versionné | Pourquoi |
| --- | --- | --- |
| `medias-sources/audio/` | ❌ | `.gitignore` exclut `*.wav`, `*.aiff`, `*.flac`. Un binaire committé reste dans l'historique à jamais. |
| `medias-sources/images/` | ✅ | Quelques centaines de kilo-octets : garder l'original permet de refaire un recadrage sans redemander le fichier. |

Les masters audio ne sont donc **que sur cette machine** (et dans OneDrive).
Gardez-en une copie ailleurs avant tout nettoyage du dossier.

## Conversion audio

`ffmpeg` a été installé avec `winget install Gyan.FFmpeg`, mais les terminaux
déjà ouverts ne le voient pas dans leur `PATH`. Chemin complet :

```
C:\Users\henoc\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe
```

Deux formats sont produits pour chaque morceau : le MP3 est lu partout, l'OGG
sert de repli aux navigateurs qui refusent le MP3.

```bash
FFMPEG="/c/Users/henoc/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe"
SRC="medias-sources/audio/01 - (Artiste inconnu) - TOUT VA CHANGER MASTER .wav"

"$FFMPEG" -i "$SRC" -codec:a libmp3lame -b:a 192k client/public/audio/tout-va-changer.mp3
"$FFMPEG" -i "$SRC" -codec:a libvorbis  -q:a 5    client/public/audio/tout-va-changer.ogg
```

Déclarez ensuite le morceau dans `client/src/lib/playlist.ts` : c'est le seul
fichier à modifier pour qu'il apparaisse dans le widget sonore.

## Images

Le portrait de la page Bibliographie est servi depuis
`client/public/images/olikrys.png`. Après un recadrage de l'original, recopiez-le :

```bash
cp medias-sources/images/Olikrys.png client/public/images/olikrys.png
```

Pensez à mettre à jour les attributs `width` / `height` du `<img>` dans
`client/src/pages/BibliographyPage.tsx` si les dimensions changent : ils
réservent la place à l'écran et évitent que la page saute au chargement.

## Droits

Le master « TOUT VA CHANGER » est crédité « Artiste inconnu ». **Les droits
restent à vérifier avant toute mise en ligne publique** — les versions
converties, elles, sont déjà sur GitHub.
