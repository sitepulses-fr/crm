// Copie les polices locales (fontsource) dans public/fonts et génère les
// typefaces JSON utilisées par Three.js pour le texte 3D extrudé.
// Aucune dépendance réseau au rendu : tout est servi depuis public/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'fonts');
fs.mkdirSync(outDir, { recursive: true });

const fontsource = (pkg, file) => path.join(root, 'node_modules', '@fontsource', pkg, 'files', file);

const webFonts = [
  ['inter', 'inter-latin-500-normal.woff2'],
  ['inter', 'inter-latin-700-normal.woff2'],
  ['inter', 'inter-latin-800-normal.woff2'],
  ['inter', 'inter-latin-900-normal.woff2'],
  ['roboto', 'roboto-latin-400-normal.woff2'],
  ['roboto', 'roboto-latin-500-normal.woff2'],
  ['roboto', 'roboto-latin-700-normal.woff2'],
  ['geist-sans', 'geist-sans-latin-500-normal.woff2'],
  ['geist-sans', 'geist-sans-latin-600-normal.woff2'],
  ['geist-sans', 'geist-sans-latin-700-normal.woff2'],
  ['geist-mono', 'geist-mono-latin-400-normal.woff2'],
  ['geist-mono', 'geist-mono-latin-500-normal.woff2'],
];

for (const [pkg, file] of webFonts) {
  fs.copyFileSync(fontsource(pkg, file), path.join(outDir, file));
}

// Typefaces 3D (WOFF -> JSON Three.js). TTFLoader embarque opentype.js.
const typefaces = [
  ['inter', 'inter-latin-900-normal.woff', 'inter-900.typeface.json'],
  ['inter', 'inter-latin-800-normal.woff', 'inter-800.typeface.json'],
  ['geist-sans', 'geist-sans-latin-600-normal.woff', 'geist-600.typeface.json'],
  ['geist-sans', 'geist-sans-latin-700-normal.woff', 'geist-700.typeface.json'],
  ['geist-mono', 'geist-mono-latin-500-normal.woff', 'geist-mono-500.typeface.json'],
];

// --- Normalisation du sens des contours -------------------------------------
// Selon les polices (TrueType, CFF, instances de polices variables), le sens des
// contours varie, parfois au sein d'une même police. Three.js distingue pleins et
// trous par leur sens : on réoriente chaque contour selon sa profondeur
// d'imbrication (pair = plein → horaire, impair = trou → anti-horaire).

function parseContours(o) {
  const t = o.trim().split(/\s+/);
  const contours = [];
  let cur = null;
  for (let i = 0; i < t.length; ) {
    const c = t[i++];
    const n = () => Number(t[i++]);
    if (c === 'm') {
      cur = { start: [n(), n()], segs: [] };
      contours.push(cur);
    } else if (c === 'l') cur.segs.push({ type: 'l', end: [n(), n()] });
    else if (c === 'q') {
      const end = [n(), n()];
      cur.segs.push({ type: 'q', end, c1: [n(), n()] });
    } else if (c === 'b') {
      const end = [n(), n()];
      const c1 = [n(), n()];
      cur.segs.push({ type: 'b', end, c1, c2: [n(), n()] });
    }
  }
  return contours;
}

const polygonOf = (ct) => [ct.start, ...ct.segs.flatMap((s) => (s.type === 'b' ? [s.c1, s.c2, s.end] : s.type === 'q' ? [s.c1, s.end] : [s.end]))];

function signedArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function inside([px, py], poly) {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
}

function reverseContour(ct) {
  const pts = [ct.start, ...ct.segs.map((s) => s.end)];
  const segs = [];
  for (let k = ct.segs.length - 1; k >= 0; k--) {
    const s = ct.segs[k];
    const end = pts[k];
    if (s.type === 'l') segs.push({ type: 'l', end });
    else if (s.type === 'q') segs.push({ type: 'q', end, c1: s.c1 });
    else segs.push({ type: 'b', end, c1: s.c2, c2: s.c1 });
  }
  return { start: pts[pts.length - 1], segs };
}

const fmt = (v) => String(Math.round(v * 100) / 100);
function serialize(contours) {
  return contours
    .map((ct) =>
      [`m ${fmt(ct.start[0])} ${fmt(ct.start[1])}`]
        .concat(
          ct.segs.map((s) =>
            s.type === 'l'
              ? `l ${fmt(s.end[0])} ${fmt(s.end[1])}`
              : s.type === 'q'
                ? `q ${fmt(s.end[0])} ${fmt(s.end[1])} ${fmt(s.c1[0])} ${fmt(s.c1[1])}`
                : `b ${fmt(s.end[0])} ${fmt(s.end[1])} ${fmt(s.c1[0])} ${fmt(s.c1[1])} ${fmt(s.c2[0])} ${fmt(s.c2[1])}`,
          ),
        )
        .join(' '),
    )
    .join(' ');
}

function normalizeGlyph(o) {
  const contours = parseContours(o).filter((c) => c.segs.length > 0);
  const polys = contours.map(polygonOf);
  const out = contours.map((ct, i) => {
    // Profondeur = nombre d'autres contours (plus grands) qui contiennent un point de celui-ci.
    const area = Math.abs(signedArea(polys[i]));
    const depth = polys.filter((p, j) => j !== i && Math.abs(signedArea(p)) > area && inside(polys[i][0], p)).length;
    const wantClockwise = depth % 2 === 0;
    const isClockwise = signedArea(polys[i]) < 0;
    return isClockwise === wantClockwise ? ct : reverseContour(ct);
  });
  return serialize(out);
}

for (const [pkg, file, out] of typefaces) {
  const buf = fs.readFileSync(fontsource(pkg, file));
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const json = new TTFLoader().parse(arrayBuffer);
  for (const g of Object.values(json.glyphs)) if (g.o) g.o = normalizeGlyph(g.o);
  fs.writeFileSync(path.join(outDir, out), JSON.stringify(json));
}

console.log(`✓ Polices prêtes dans ${path.relative(process.cwd(), outDir) || outDir}`);
