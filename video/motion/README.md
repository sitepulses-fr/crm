# SitePulse — motion design (40 s)

Cartes de verre 3D, traversées caméra, flou de mouvement réel (accumulation de sous-images adaptative),
profondeur de champ, bloom. Musique originale `music2.py` (électro 120 BPM, ré mineur) synchronisée à l'image.

- `../sitepulse-motion-qhd-master.mp4` — 2560×1440, 30 i/s, H.264 CRF 16 + AAC 320 kb/s
- `../sitepulse-motion-1080p.mp4` — aperçu léger

Contenus tirés de l'app SitePulse du dépôt (services, offres Essentiel 299 € / Pulses 399 €, Dole & Jura).
« Plomberie Martin », les avis et les chiffres sont fictifs.

## Régénérer

```bash
cd video/motion
npm i three@0.169.0 playwright
python3 music2.py                                   # numpy, scipy
python3 -m http.server 8791 --directory .. &        # sert video/
mkdir -p frames && node render.js 0 1 1200          # QHD (deviceScaleFactor 4/3)
ffmpeg -i music2.wav -af loudnorm=I=-14:TP=-1 music2_norm.wav
ffmpeg -framerate 30 -i frames/f%05d.jpg -i music2_norm.wav -c:v libx264 -preset slow -crf 16 \
  -pix_fmt yuv420p -c:a aac -b:a 320k -shortest -movflags +faststart ../sitepulse-motion-qhd-master.mp4
```
`main.js` expose `renderAt(t)` ; `?n=` fixe le nombre max de sous-images de flou.
