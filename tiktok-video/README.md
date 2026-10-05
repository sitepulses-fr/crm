# SitePulse · TikTok « Google Maps : qui apparaît en premier ? »

Vidéo publicitaire verticale (1080×1920, 30 fps, 21 s, MP4 H.264) en motion design 3D, générée par du code
(Remotion + React Three Fiber). Tu changes le métier et la ville, tu relances, tu as la vidéo du jour.

## Démarrage

```bash
cd tiktok-video
npm install          # installe tout + génère polices 3D et sound design (postinstall)
npm run render       # → out/sitepulse-couvreur-dole-AAAA-MM-JJ.mp4
```

Pour changer de cible **sans toucher au fichier** :

```bash
npm run render -- --metier=plombier --ville="Besançon"
```

Ou modifie `metier` / `ville` dans `config.json` puis relance `npm run render`.

Autres commandes :

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Remotion Studio : prévisualisation en direct, timeline, réglages |
| `npm run stills` | Rend 10 images clés en PNG dans `out/stills/` (contrôle rapide en 1 min environ) |
| `npm run voiceover` | Génère la voix off phrase par phrase avec ElevenLabs (facultatif) |

Options de `render` : `--out=chemin.mp4`, `--concurrency=4`, `--frames=0-120` (extrait), `--sans-voix`,
`--crf=18`, `--gl=angle|swangle`, `--browser=/chemin/vers/chrome`.

## config.json

| Clé | Rôle |
| --- | --- |
| `metier`, `ville` | Les deux variables du jour. Elles alimentent l'accroche, la recherche tapée, la carte, les fiches et la voix off. |
| `article`, `prepositionVille` | « Tu cherches **un** couvreur **à** Dole » (ex. `"une"`, `"au"` pour « au Havre »). |
| `entreprises` | `[]` = 8 fiches générées automatiquement (noms crédibles selon le métier, notes, avis, horaires). Le résultat est identique pour un même couple métier + ville. Tu peux aussi lister tes propres noms, les 3 premiers formant le top 3. Ces noms ne s'appliquent qu'au métier et à la ville du fichier. |
| `textes` | Accroche, recherche, légendes (avec timings en secondes), punchline 3D (une ligne par entrée, `punchlineAccent` en or), CTA et mot-clé. `{metier}`, `{ville}`, `{article}`, `{preposition}`, `{motCle}` sont remplacés automatiquement. |
| `voixOff` | Script et calage (`debut` en secondes) de chaque phrase, réglages de la voix ElevenLabs. |
| `marque` | Nom, accroche, bleu de marque, or. |
| `audio` | Sound design on/off et volume ; `musique` : chemin d'un fichier dans `public/` (ex. `"audio/musique.mp3"`). |
| `rendu` | Modèle du nom de sortie, CRF, `qualite3D` (`haute` = bloom + profondeur de champ, `moyenne` = sans profondeur de champ, `basse` = sans post-traitement) et `afficherZonesSures` (affiche en rouge les 150 px du haut et les 350 px du bas). |

## Voix off

Le script est dans `config.json → voixOff.lignes` :

> Tu cherches un couvreur à Dole. · Tu tapes sur Google. · Tu regardes qui ? · Les trois premiers. ·
> Les autres ? Personne ne les voit. · Si t'es pas dans les 3, t'existes pas. · Commente AUDIT, et je te montre où tu en es.

Deux options :

1. **Enregistrement maison** : un seul fichier `public/audio/voiceover.mp3`, calé sur les timings `debut`.
   Ce fichier n'est utilisé que pour le métier et la ville du `config.json`.
2. **Automatique (une voix par jour, zéro effort)** : `export ELEVENLABS_API_KEY=...`, puis `npm run render`.
   Chaque phrase est générée dans `public/audio/vo/<metier>-<ville>/` (avec un cache) et placée à son timing.
   Choisis une voix grave et posée via `voixOff.elevenlabs.voiceId`.

Sans voix off, la vidéo sort avec le sound design seul. Le sound design est entièrement procédural, donc sans droits à
gérer : nappe grave, whooshes, frappes clavier, chutes de pins, scintillement doré, impact et pulsation « SitePulse ».
Il est automatiquement baissé quand une voix off est présente.

## Storyboard (timings réels)

| Temps | Scène | Fichier |
| --- | --- | --- |
| 0 – 2,4 s | Smartphone 3D (titane, écran OLED), rotation lente, dolly avant puis traversée lumineuse de l'écran. Texte d'accroche avec métier et ville en or. | `src/scenes/HookScene.tsx`, `src/three/Phone.tsx` |
| 1,9 – 5,3 s | Interface de recherche sombre type Google : barre avec halo animé, frappe « couvreur dole », suggestions, tap, puis bascule 3D vers l'arrière. | `src/scenes/SearchScene.tsx` |
| 4,9 – 13,3 s | Carte 3D procédurale (rues, fleuve, bâtiments extrudés), caméra zénithale qui s'incline, pins qui tombent avec rebond, profondeur de champ, parallaxe. Fiches résultats. Top 3 : halo doré, badges 1-2-3, pins dorés. Le reste s'assombrit, se floute et est avalé par l'ombre. | `src/scenes/MapScene.tsx`, `src/three/MapWorld.tsx`, `src/three/mapTexture.ts` |
| 12,9 – 17,3 s | « Si t'es pas / dans les 3, / t'existes pas. » en 3D extrudée chromée (le « 3 » en or), caméra en orbite, impact. | `src/scenes/PunchScene.tsx` |
| 16,9 – 21 s | Logo SitePulse 3D (badge + tracé de pouls lumineux), wordmark 3D, CTA « Commente AUDIT », champ commentaire animé. Fondu final sur le plan d'ouverture exact : la vidéo boucle sans coupure. | `src/scenes/CtaScene.tsx`, `src/three/Logo3D.tsx` |

Les timings globaux sont dans `src/timeline.ts`. Tout le texte important reste entre y = 150 et y = 1570.

## Notes techniques

- Le rendu 3D est déterministe : chaque image est calculée à partir du numéro de frame, sans horloge. La carte, les
  bâtiments et les fiches sont générés à partir d'une graine « métier + ville ».
- Les polices sont locales (Inter, Roboto). Les typefaces 3D sont générées depuis les WOFF par
  `scripts/prepare-fonts.mjs`, accents compris. Au moment du rendu, aucune ressource réseau n'est nécessaire.
- Durée de rendu indicative : quelques minutes sur un Mac avec GPU. Sur un serveur Linux sans GPU (WebGL logiciel
  `swangle`), compte environ 1 à 2 s par image. Si Remotion ne peut pas télécharger son Chrome, indique-lui un Chrome
  ou un Chromium local avec `REMOTION_BROWSER_EXECUTABLE=/chemin/vers/chrome`.
- Pour automatiser la publication quotidienne : un cron ou une tâche planifiée qui lance
  `npm run render -- --metier=... --ville=...`.
