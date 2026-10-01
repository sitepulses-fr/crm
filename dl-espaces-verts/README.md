# DL Espaces Verts — site vitrine « film »

Site one-page immersif pour DL Espaces Verts (paysagiste & grimpeur-élagueur, Gers → Bordeaux).
100 % statique : aucune dépendance externe (GSAP, Lenis et polices sont hébergés dans `assets/`).

## Version fichier unique
`dl-espaces-verts-standalone.html` contient tout le site (CSS, JS, polices, photos, vidéos) dans un seul fichier :
il s'ouvre par double-clic, sans serveur. Pour le régénérer après modification : `python3 build-standalone.py`.

## Vidéo du héros
`assets/media/hero-16x9.*` (ordinateur) et `hero-9x16.*` (mobile) : travelling avant stabilisé, en boucle sans coupure,
généré à partir de la photo `pelouse.jpg` (ffmpeg, zoompan sur image suréchantillonnée). MP4/H.264 + repli WebM/VP9.

## Lancer en local
```
cd dl-espaces-verts && python3 -m http.server 8000
# puis http://localhost:8000
```

## À compléter avant mise en ligne
- `assets/js/main.js` → objet `CONFIG` en haut du fichier : téléphone, e-mail de réception des devis, lien de la page Facebook.
- Photos (`assets/media/*.jpg`) : ce sont des images d'inspiration ; les remplacer par de vraies photos de chantiers
  de l'entreprise (tableau `PHOTOS` dans `main.js` et les 3 `viewfinder` du travelling dans `index.html`).
  Les photos d'origine sont en basse résolution : des originaux plus grands rendront le héros plus net.
- Le formulaire de devis ouvre la messagerie du visiteur (mailto). Pour un envoi direct, brancher un service type Formspree / n8n.

## Structure des scènes
1. Ouverture — amorce 3-2-1, lever du rideau, travelling avant + lever de soleil au scroll
2. Manifeste — le texte s'illumine mot à mot
3. Savoir-faire — travelling horizontal sur 4 métiers animés
4. Les saisons — le décor passe du printemps à l'hiver avec le scroll
5. À vous de tailler — mini-jeu : tailler la haie au sécateur
6. Sur le tournage — bandes de pellicule
7. Le territoire — carte Gers → Bordeaux, l'itinéraire se trace
8. Votre projet — devis en 3 « prises » avec clap
9. Générique de fin

Son d'ambiance (vent, oiseaux, nappe) généré en Web Audio, désactivé par défaut.
Respecte `prefers-reduced-motion`.
