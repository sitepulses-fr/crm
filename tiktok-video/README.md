# SitePulse · TikTok « Google Maps : qui apparaît en premier ? »

Vidéo publicitaire verticale (1080×1920, 30 fps, 21 s, MP4 H.264) en motion design 3D, générée par du code
(Remotion + React Three Fiber). Tu changes le métier et la ville, tu relances, tu as la vidéo du jour.

Deux styles (`config.json → rendu.style`, ou `--style=` en ligne de commande) :

- **`minimal`** (par défaut) : noir, typographie géante, une seule couleur d'accent (or). Le fil conducteur est
  une ligne de lumière : hairline → barre de recherche → classement → pouls SitePulse → hairline (boucle parfaite).
- **`illustre`** : smartphone 3D, interfaces Google / Google Maps recréées, carte 3D avec pins.

## Démarrage

```bash
cd tiktok-video
npm install          # installe tout + génère polices 3D et sound design (postinstall)
npm run render       # → out/sitepulse-couvreur-dole-AAAA-MM-JJ.mp4 (style minimal)
npm run render -- --style=illustre   # l'autre style
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
`--crf=18`, `--style=minimal|illustre`, `--gl=angle|swangle`, `--browser=/chemin/vers/chrome`.

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

## Voix off (voix d'homme)

Le script est dans `config.json → voixOff.lignes` :

> Tu cherches un couvreur à Dole. · Tu tapes sur Google. · Tu regardes qui ? · Les trois premiers. ·
> Les autres ? Personne ne les voit. · Si t'es pas dans les 3, t'existes pas. · Commente AUDIT, et je te montre où tu en es.

`npm run render` génère automatiquement la voix off, phrase par phrase, calée sur les timings `debut`, et la met en
cache dans `public/audio/vo/<metier>-<ville>/`. Chaque jour, la voix dit donc le bon métier et la bonne ville.

- **Par défaut (`"fournisseur": "edge"`)** : voix neuronales Microsoft Edge, gratuites et sans clé. Voix d'homme
  `fr-FR-HenriNeural`, légèrement ralentie et plus grave pour un ton posé. Variante : `fr-FR-RemyMultilingualNeural`.
  Le débit et la hauteur se règlent dans `voixOff.edge`.
- **ElevenLabs (`"fournisseur": "elevenlabs"`)** : `export ELEVENLABS_API_KEY=...`, voix choisie par `voixOff.elevenlabs.voiceId`.
- **Enregistrement maison** : `public/audio/voiceover.mp3`, un seul fichier calé sur les timings. Il est prioritaire
  pour le métier et la ville du `config.json`.

Commandes : `npm run voiceover` (générer seulement), `--force` (régénérer), `npm run render -- --sans-voix`.
Sans accès réseau, le rendu continue sans voix, avec le sound design seul. Le sound design est entièrement procédural
et automatiquement baissé quand une voix off est présente.

## Storyboard — style `minimal` (timings réels)

| Temps | Scène | Fichier |
| --- | --- | --- |
| 0 – 2,7 s | Image 0 : une hairline seule. Elle s'étire ; « Tu cherches / un couvreur / à Dole. » monte au-dessus en très grand (métier et ville en or). | `src/minimal/HookMinimal.tsx` |
| 2,3 – 5,3 s | La ligne devient la recherche : « couvreur dole » se tape en très grand, curseur or. Validation : la ligne s'illumine puis se dissout. | `src/minimal/SearchMinimal.tsx` |
| 4,9 – 13,3 s | Classement en 3D : les résultats (rang, nom, note) s'alignent, chacun sur sa ligne de lumière, caméra de biais avec profondeur de champ. Le top 3 s'allume en or ; les autres s'éteignent un par un, façon néon. | `src/minimal/RankingScene.tsx` |
| 12,9 – 17,3 s | « SI T'ES PAS / DANS LES 3, / T'EXISTES PAS. » en 3D (faces blanc mat, flancs noirs, « 3 » en or), lente orbite. | `src/scenes/PunchScene.tsx` (variante `minimal`) |
| 16,9 – 21 s | La ligne bat comme un pouls (or sur les battements), wordmark SitePulse, « Commente AUDIT, je te montre où tu en es. » Puis le pouls s'aplatit et redevient la hairline de l'image 0. | `src/minimal/CtaMinimal.tsx` |

## Storyboard — style `illustre` (timings réels)

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

## Montage facecam (tes rushs filmés)

Composition `MontageFacecam` : tu te filmes, et le code fait le montage « créateur » :

- **Sous-titres mot à mot** (Geist) : le mot prononcé s'allume dans une pastille bleue, les mots-clés restent en bleu.
- **Blancs coupés** entre les plans et **zoom cuts** (changements de cadrage secs sur les relances).
- **3 transitions** sur les raccords : whip pan, zoom traversant avec flash, spin avec light leak.
- **Apparitions synchronisées** sur ce que tu dis : STOP, carte SitePulse, « 1/2 », site introuvable,
  avis Google, le concurrent qui décroche, Jura, courbe des devis, aperçu de site, commentaire « VISUEL », 48 h.
  Elles se placent au-dessus de ta tête sur les plans larges et au niveau du torse sur les plans rapprochés, jamais sur le visage.
- Étalonnage léger, vignette, sound design (impact, whooshes, pops, clavier).

```bash
npm i --no-save --ignore-scripts sts-whisper-small @huggingface/transformers   # une fois (Whisper local)
npm run transcribe -- --rush=/chemin/ma-video.mov   # rush → public/rush + transcription mot à mot
# relis src/montage/montage.json (mots + "segments" gardés), puis :
npm run montage                                      # → out/montage-facecam.mp4
```

Les apparitions et leurs timings (en secondes du rush) se règlent dans `src/montage/Overlays.tsx`,
les zooms dans `src/montage/Montage.tsx` (`PUNCHES`). Les rushs ne sont pas versionnés (`public/rush/`).
