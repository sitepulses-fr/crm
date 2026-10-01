#!/usr/bin/env python3
"""Génère un fichier HTML unique et autonome (CSS, JS, polices, images et vidéos intégrés).
Usage : python3 build-standalone.py  ->  dl-espaces-verts-standalone.html"""
import base64, mimetypes, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
MIME = {'.woff2': 'font/woff2', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.jpg': 'image/jpeg', '.png': 'image/png'}
cache = {}

def data_uri(rel):
    path = os.path.normpath(os.path.join(ROOT, rel))
    if path not in cache:
        mime = MIME.get(os.path.splitext(path)[1]) or mimetypes.guess_type(path)[0]
        with open(path, 'rb') as f:
            cache[path] = f'data:{mime};base64,' + base64.b64encode(f.read()).decode()
    return cache[path]

def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()

html = read('index.html')
html = re.sub(r'<link rel="preload"[^>]*>\n?', '', html)

css = read('assets/css/style.css')
css = re.sub(r'url\((\.\./fonts/[^)]+)\)', lambda m: 'url(' + data_uri('assets/css/' + m.group(1)) + ')', css)
html = html.replace('<link rel="stylesheet" href="assets/css/style.css">', '<style>\n' + css + '\n</style>')

def inline_script(m):
    js = read(m.group(1))
    js = re.sub(r"'(assets/media/[^']+)'", lambda k: "'" + data_uri(k.group(1)) + "'", js)
    return '<script>\n' + js.replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script src="(assets/js/[^"]+)"></script>', inline_script, html)

# attributs src / href / poster / data-src-* (la balise og:image et le JSON-LD gardent leur chemin)
html = re.sub(r'((?:src|href|poster|data-src-[a-z-]+)=")(assets/[^"]+)"', lambda m: m.group(1) + data_uri(m.group(2)) + '"', html)

out = os.path.join(ROOT, 'dl-espaces-verts-standalone.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print(f'{out} — {os.path.getsize(out) / 1e6:.1f} Mo')
