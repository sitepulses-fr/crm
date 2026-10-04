# SITE PULSE — film 3D

`site-pulse-film-web.mp4` : 34 s, 1080p, 30 i/s, H.264 + AAC.

## Régénérer

```bash
cd video/src
npm i three@0.169.0 playwright
python3 beats.py && python3 audio.py          # rythme + bande son
python3 -m http.server 8790 &                  # sert scene.html
mkdir -p frames && node render.js 0 1 0 1020   # 1 020 images (Three.js, rendu image par image)
ffmpeg -framerate 30 -i frames/f%05d.jpg -i audio.wav -c:v libx264 -crf 23 -pix_fmt yuv420p -c:a aac -shortest ../site-pulse-film-web.mp4
```

`scene.js` expose `renderAt(t)` : chaque image est une fonction pure du temps.
