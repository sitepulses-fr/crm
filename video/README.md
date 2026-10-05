# SITE PULSE — film 3D

| Fichier | Contenu |
|---|---|
| `site-pulse-film-4k.mp4` | 3840×2160, 30 i/s, 44,2 s, H.264 16 Mb/s + AAC 256 kb/s |
| `site-pulse-film-1080p.mp4` | aperçu 1920×1080 (léger, pour partager) |

Le master 4K en qualité maximale (CRF 17, ~40 Mb/s, 223 Mo) dépasse la limite de 100 Mo de GitHub : il n'est pas versionné, on le régénère avec les commandes ci-dessous.

## Contenu

1. Signal — ville 3D des concurrents, votre entreprise est une tuile grise.
2. Diagnostic — scan de la fiche Google, du site, d'Instagram et du classement (23/100).
3. Signal plat → impulsion — onde de choc.
4. Transformation — la tour monte, l'écosystème se connecte (94/100).
5. **Vitrine** — gros plans 3D sur la fiche Google, le site (desktop + mobile) et le compte Instagram d'Atelier Morel.
6. Visibilité — #27 → #1, les clients affluent.
7. Signature SITE PULSE.

Musique originale (`src/music.py`) : électro cinématique en la mineur, 100 BPM, calée sur les battements de l'image.
Atelier Morel et tous les chiffres sont fictifs.

## Régénérer

```bash
cd video/src
npm i three@0.169.0 playwright
python3 beats.py && python3 music.py                  # rythme + musique (numpy, scipy)
python3 -m http.server 8790 &
mkdir -p frames4k && node render.js 0 1 1326          # 1 326 images 4K (Three.js, image par image)
ffmpeg -i music.wav -af loudnorm=I=-14:TP=-1 music_norm.wav
ffmpeg -framerate 30 -i frames4k/f%05d.jpg -i music_norm.wav -c:v libx264 -preset slow -crf 17 \
  -pix_fmt yuv420p -c:a aac -b:a 320k -shortest -movflags +faststart ../site-pulse-film-4k-master.mp4
```

`scene.js` expose `renderAt(t)` : chaque image est une fonction pure du temps.
