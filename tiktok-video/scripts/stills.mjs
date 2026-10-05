// Aperçu rapide : rend quelques images clés en PNG (out/stills).
// Usage : npm run stills [-- --frames=0,60,200 --metier=plombier --ville=Besançon]
import fs from 'node:fs';
import path from 'node:path';
import { renderStill, selectComposition } from '@remotion/renderer';
import { browserOptions, buildProps, bundleProject, ensureAssets, loadConfig, parseArgs, root } from './lib.mjs';

const args = parseArgs();
await ensureAssets();
const inputProps = buildProps(loadConfig(), args);
const frames = String(args.frames || '20,64,110,150,215,300,360,440,520,600').split(',').map(Number);
const outDir = path.join(root, 'out', 'stills');
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundleProject();
const opts = browserOptions(args);
const composition = await selectComposition({ serveUrl, id: 'SitePulseMaps', inputProps, ...opts });
for (const frame of frames) {
  const output = path.join(outDir, `${inputProps.slug}-${String(frame).padStart(3, '0')}.png`);
  await renderStill({ composition, serveUrl, frame, output, inputProps, ...opts, scale: Number(args.scale || 1) });
  console.log(`✓ frame ${frame} → ${path.relative(root, output)}`);
}
