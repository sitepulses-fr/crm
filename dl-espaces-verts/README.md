# DL Espaces Verts — site vitrine « film »

Site one-page immersif pour DL Espaces Verts (paysagiste & grimpeur-élagueur, Gers → Bordeaux).
100 % statique : aucune dépendance externe (GSAP, Lenis et polices sont hébergés dans `assets/`).

## Lancer en local
```
cd dl-espaces-verts && python3 -m http.server 8000
# puis http://localhost:8000
```

## À compléter avant mise en ligne
- `assets/js/main.js` → objet `CONFIG` en haut du fichier : téléphone, e-mail de réception des devis, lien de la page Facebook.
- Pellicule « Nos interventions » : les vignettes sont illustrées ; remplacer par de vraies photos de chantiers
  (fonction `buildStrips()` dans `main.js`, ou directement des `<figure class="frame"><img …></figure>`).
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
