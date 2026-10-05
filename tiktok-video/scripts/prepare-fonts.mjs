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
];

for (const [pkg, file] of webFonts) {
  fs.copyFileSync(fontsource(pkg, file), path.join(outDir, file));
}

// Typefaces 3D (WOFF -> JSON Three.js). TTFLoader embarque opentype.js.
const typefaces = [
  ['inter', 'inter-latin-900-normal.woff', 'inter-900.typeface.json'],
  ['inter', 'inter-latin-800-normal.woff', 'inter-800.typeface.json'],
];

for (const [pkg, file, out] of typefaces) {
  const buf = fs.readFileSync(fontsource(pkg, file));
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const json = new TTFLoader().parse(arrayBuffer);
  fs.writeFileSync(path.join(outDir, out), JSON.stringify(json));
}

console.log(`✓ Polices prêtes dans ${path.relative(process.cwd(), outDir) || outDir}`);
