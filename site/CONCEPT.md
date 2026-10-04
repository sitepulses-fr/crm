# SITE PULSE — « Le Signal »
### Concept motion & direction artistique

> Une seule ligne traverse tout le site.
> Au début elle est plate. Votre entreprise est invisible.
> SITE PULSE lui rend un pouls.

---

## 1. Concept global

**Idée-force : SITE PULSE est le moniteur cardiaque de votre présence en ligne.**

Tout le site est construit autour d'**un seul objet graphique** : une ligne bleu électrique,
fine comme un fil, qui ne quitte jamais l'écran. Elle change de rôle au fil du récit :

| Moment | Ce que devient la ligne |
|---|---|
| Arrivée | un **électrocardiogramme plat** (l'entreprise est invisible) |
| Hero | une **pulsation** qui fait naître la marque et les leviers |
| Diagnostic | un **faisceau de scanner** qui balaie l'entreprise |
| Signal plat | les problèmes détectés **s'effondrent en une ligne plate** |
| Transformation | un **choc de défibrillation** qui reconstruit tout |
| Méthode | une **bande ECG** lue de gauche à droite, 5 battements = 5 étapes |
| Écosystème | une **onde circulaire** qui connecte les canaux entre eux |
| Visibilité | une **courbe de croissance** dont chaque pic est un client |
| Contact | une **corde** qui vibre quand vous tapez le nom de votre entreprise |

La signature reconnaissable en 10 secondes : **le double battement « pu-PULSE »** —
un petit pic, puis un grand. Il est utilisé partout : logo, moniteur, transitions, CTA.

En permanence en bas de l'écran, un **moniteur ECG** affiche le pouls du site, et dans le
header un compteur **BPM** : il commence à ~44, tombe à **000** au moment du signal plat,
explose à 140 au choc, puis se stabilise. Le visiteur *ressent* l'état de l'entreprise.

## 2. Storytelling

Un récit en cinq actes, raconté sans avoir besoin de lire :

1. **Le signal** — une entreprise apparaît sur une ligne. Elle a tout (Google, site, avis…)
   mais rien n'est relié. Puis on recule : elle est un point gris parmi des centaines de
   concurrents qui, eux, battent.
2. **Le diagnostic** — on plonge *à l'intérieur* du point. Un scanner balaie sa fiche Google,
   son site, ses réseaux, son classement. Les problèmes s'allument en rouge/orange/jaune.
   Score de présence : **23/100**.
3. **Le signal plat → l'impulsion** — tous les problèmes tombent sur une ligne plate.
   Silence. BPM 000. Puis **BOOM** : l'onde de choc reconstruit chaque élément en place.
   Même entreprise, toute autre présence : **94/100**.
4. **La méthode & l'écosystème** — on comprend *comment* : 5 battements, puis 8 canaux
   épars que l'impulsion relie en un seul système vivant.
5. **La visibilité → les clients** — l'entreprise remonte de la position #27 à #1 en
   doublant ses concurrents, et chaque battement devient un appel, un devis, un avis.
   Fin : la ligne redevient calme et vous invite à « prendre le pouls » de votre entreprise.

## 3. Architecture des sections

```
00  HERO / SIGNAL ........ pin 320vh  canvas  — naissance du pouls, puis zoom arrière et plongée
01  DIAGNOSTIC ........... pin 520vh  DOM/SVG — scan → signal plat → BOOM → transformation
    ~ couture (la ligne) ~
02  MÉTHODE .............. pin horizontal — 5 battements / 5 scènes
    ~ couture ~
03  ÉCOSYSTÈME ........... pin 320vh  canvas + DOM — chaos → onde → constellation
    ~ couture ~
04  VISIBILITÉ ........... pin 380vh  DOM — #27 → #1 → clients
    ~ couture ~
05  CONTACT .............. corde vibrante + formulaire « diagnostic »
HUD permanent : logo vivant · chapitre en cours · BPM · moniteur ECG bas d'écran
```

## 4. Scénario des animations

### 00 — Signal (hero)
- **0,2 s** : la ligne se trace depuis le centre vers les bords.
- **1,6 s** : premier battement. En passant, il **allume une à une les lettres** de
  « SITE PULSE » posées sur la ligne.
- **2,9 → 5,4 s** : quatre battements de plus en plus rapprochés (un cœur qui démarre).
  Chaque pic **éjecte des fragments** : Google, Site web, Réseaux sociaux, Avis, SEO,
  Visibilité, Clients.
- **5,9 s** : le logotype quitte la ligne et **vient se ranger dans le header** (FLIP).
- **6,2 s** : les fragments **convergent en une constellation** reliée autour d'un noyau :
  « Votre entreprise ». Le titre se *décode* comme un signal reçu :
  *Votre entreprise / mérite d'être vue.*
- **Scroll** : la constellation s'effondre en un point gris, la ligne devient plate,
  la caméra recule → des centaines de concurrents qui pulsent. « Vous · page 3 · 4 avis ».
  Un réticule verrouille la cible… et la caméra **plonge dans le point** jusqu'à ce que
  sa couleur remplisse l'écran : on est *dans* l'entreprise. Le diagnostic commence
  sur ce même fond, sans coupure.

### 01 — Diagnostic & transformation
- Les 4 panneaux (fiche Google, site, Instagram, résultats Google) se **tracent comme des
  plans** puis le **faisceau** les balaie. Chaque problème touché s'encadre et s'étiquette
  par gravité, le journal de la console se remplit, le score se mesure jusqu'à 23.
- **Signal plat** : les cadres se détachent, rétrécissent en tirets et **s'alignent en
  une ligne plate**. BPM → 000. Tout s'éteint.
- **BOOM** : onde de choc, flash, secousse. Le BPM bondit.
- **Reconstruction**, panneau par panneau, *dans les mêmes objets* :
  note 2,1★ → 4,8★, photos qui se remplissent, l'ancien site **se désagrège** puis le
  nouveau est **tracé en fil de fer** puis **rendu ligne par ligne**, un mobile arrive,
  les tuiles Instagram **pivotent en 3D** vers une identité cohérente, le résultat de
  recherche remonte de #27 à #1. Le monogramme de marque apparaît en même temps dans
  les trois panneaux : l'identité est unifiée. Les liens entre panneaux deviennent des
  flux de données.

### 02 — Méthode
Une bande ECG horizontale défile sous une tête de lecture fixe. Chaque étape a son
battement *et* sa scène, pilotée image par image :
01 Analyser (radar qui verrouille une cible) · 02 Construire (blocs épars qui
s'assemblent en maquette) · 03 Optimiser (5 jauges qui montent) · 04 Propulser (courbe
qui décolle) · 05 Convertir (visiteurs filtrés par un entonnoir, les clients s'empilent).

### 03 — Écosystème
8 canaux flottent en désordre et fuient le curseur. Une **onde circulaire** part du noyau :
chaque canal touché s'allume et rejoint son **orbite 3D** (profondeur, échelle, rotation
au curseur). Les liens se tracent, puis des paquets de données circulent. Survol / tap :
le canal isole ses connexions et explique ce que SITE PULSE y fait.

### 04 — Visibilité
Une page de résultats « menuisier lyon ». Le compteur défile de #27 à #8, puis l'entreprise
**double physiquement chaque concurrent** (voie de dépassement, chaque dépassement = un
battement). À #1, la fiche s'ouvre, puis **les notifications sortent de la fiche** :
appel, devis, itinéraire, avis… chiffres de projection en bas.

### 05 — Contact
La ligne revient, calme, et devient une **corde physique** (équation d'onde 1D).
Le champ « nom de votre entreprise » est posé dessus : **chaque touche pince la corde**
et le BPM monte à mesure qu'on écrit. Envoi = balayage de scan + série de battements.

## 5. Transitions

Aucune section ne « remplace » la précédente :
- **Hero → Diagnostic** : zoom extrême dans le point-entreprise ; sa couleur devient le fond.
- **Diagnostic → Méthode**, **Méthode → Écosystème**, etc. : des **coutures** — la ligne
  du pouls se trace au scroll entre deux scènes, sa tête lumineuse descend avec vous et
  son pic déclenche un battement global (le BPM et le moniteur réagissent).
- **À l'intérieur** des scènes : désassemblage → onde → recomposition (problèmes → ligne
  plate → choc → interfaces), lignes qui deviennent des interfaces (tracés fil de fer),
  objets qui deviennent statistiques (visiteurs → clients), 2D → 3D (orbite, tuiles).

## 6. Micro-interactions (peu, mais justes)

- **Curseur** : point + anneau ; sur le diagnostic il devient un **réticule de scan**.
- **Ligne du hero** attirée par le curseur ; **clic / tap = envoyer une impulsion**
  (vibration haptique sur mobile).
- **Panneaux du diagnostic** inclinés selon le curseur, avec vraie profondeur (translateZ).
- **Canaux de l'écosystème** qui fuient le curseur avant d'être connectés, puis qui
  isolent leurs liens au survol.
- **Boutons magnétiques** avec écrasement physique au clic et rebond élastique.
- **Titres décodés** comme un signal (uniquement aux moments narratifs clés).
- **Champ de contact** qui pince la corde et accélère le pouls à chaque touche.
- Tout l'organisme bat au même rythme (horloge de battement unique).

## 7. Moments WOW

1. **La naissance du pouls** — la ligne allume la marque, éjecte les leviers, la
   constellation se forme, puis la plongée caméra dans l'entreprise.
2. **Signal plat → BOOM** — les problèmes deviennent une ligne plate, BPM 000, puis
   l'onde de choc reconstruit chaque élément en place. Le moment signature.
3. **La constellation** — l'onde qui transforme un chaos de canaux en un écosystème 3D vivant.
4. **Le dépassement** — #27 → #1 en doublant les concurrents, puis les clients qui sortent
   de la fiche.

## 8. Système graphique

- **Couleurs** : encre `#03050C`, abysse `#060B1D`, navy `#0B1736`, blanc `#F3F6FF`,
  **pulse `#3B7BFF`** (le seul accent). Rouge/orange/jaune **uniquement** pendant le
  diagnostic — ils disparaissent après le choc : la couleur raconte l'histoire.
- **Typo** : *Instrument Serif* italique (l'émotion, éditorial) · *Inter Tight* (le texte) ·
  *JetBrains Mono* (les données, la machine). Le contraste serif/mono = humain/technologie.
- **Formes** : filets de 1 px, coins droits, aucune ombre portée, aucune icône décorative.
  La lumière (lueur bleue) est réservée à ce qui est vivant.
- **Grain** fixe très léger pour la matière ; beaucoup de vide.
- **Rythme** : tout ce qui bouge suit l'horloge de battement. Le BPM est un élément de marque.

## 9. Expérience mobile

Pas une version « allégée » : une version **tactile**.
- Hero : constellation recentrée, moins de particules ; **tap = impulsion + vibration**.
- Diagnostic : panneaux en grille 2×2, étiquettes remplacées par des cadres, la console
  devient une barre de score + journal court.
- Méthode : **swipe horizontal natif avec aimantation** (scroll-snap) ; la tête de lecture
  reste au centre et les scènes se pilotent au doigt.
- Écosystème : orbite plus ronde, **tap sur un canal** pour l'explorer.
- Contact : la corde réagit au clavier virtuel.
- Pas de smooth-scroll artificiel sur tactile (scroll natif), canvas à DPR ≤ 2.

`prefers-reduced-motion` : pas d'intro animée, pas de flash ni de secousse, pas de lissage
du scroll ; les scènes restent pilotées par le scroll (donc par l'utilisateur).

## 10. Architecture technique

- **HTML/CSS/JS sans build**, fichiers statiques → hébergeable partout (Netlify, OVH, GitHub Pages).
- **GSAP + ScrollTrigger** : épinglage des scènes, scrub, quickTo pour le magnétisme.
- **Lenis** : scroll lissé (desktop uniquement), synchronisé sur le ticker GSAP.
- **Canvas 2D** pour ce qui est massif (particules, constellation, corde) — plus léger que
  WebGL pour ce besoin, sprites de lueur pré-rendus, pas de `shadowBlur`.
- **DOM + SVG** pour ce qui doit rester net et accessible (textes, panneaux, scènes).
- **Une horloge unique** (`SP.tick`, `SP.onBeat`) : toutes les animations partagent le même
  battement. Les scènes sont des fonctions pures `render(progress)` → réversibles, sans
  dérive, faciles à régler.
- Chaque boucle canvas s'arrête hors écran. Librairies embarquées dans `vendor/`
  (aucune dépendance CDN à l'exécution, sauf Google Fonts).

```
site/
  index.html
  css/style.css
  js/core.js        horloge, BPM, moniteur, Lenis, curseur, magnétisme, décodage, coutures
  js/hero.js        00 signal (canvas)
  js/diagnostic.js  01 scan → signal plat → choc → transformation
  js/method.js      02 bande ECG horizontale + 5 scènes SVG
  js/ecosystem.js   03 constellation (canvas + nœuds DOM)
  js/visibility.js  04 classement + notifications
  js/finale.js      05 corde vibrante + formulaire
  js/main.js        orchestration, chapitres
  vendor/           gsap, ScrollTrigger, lenis
```

## 11. Code

Voir `site/`. Lancer : `npx serve site` (ou `python3 -m http.server -d site`).
Le contenu fictif (Atelier Morel, chiffres de projection) est à remplacer par de vrais
cas clients ; l'e-mail de contact se règle en tête de `js/core.js` (`SP.CONTACT_EMAIL`).
