// Rendu final MP4 (H.264, 1080x1920, 30 fps).
// Usage : npm run render
//         npm run render -- --metier=plombier --ville="Besançon"
// Options : --out=chemin.mp4  --concurrency=4  --frames=0-120  --sans-voix  --gl=angle  --browser=/chemin/chrome
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { slugify, voiceLinesDir } from '../src/resolveConfig.js';
import { browserOptions, buildProps, bundleProject, defaultConcurrency, ensureAssets, loadConfig, parseArgs, root } from './lib.mjs';

const args = parseArgs();
const config = loadConfig();
await ensureAssets();

let inputProps = buildProps(config, args);

// Voix off automatique (une piste par phrase) si une clé ElevenLabs est disponible.
if (!args['sans-voix'] && !inputProps.voixOff.mode && process.env.ELEVENLABS_API_KEY) {
  const extra = [args.metier && `--metier=${args.metier}`, args.ville && `--ville=${args.ville}`].filter(Boolean);
  execFileSync(process.execPath, [path.join(root, 'scripts', 'voiceover.mjs'), ...extra], { stdio: 'inherit' });
  inputProps = buildProps(config, args);
}

const date = new Date().toISOString().slice(0, 10);
const outTemplate = args.out || config.rendu.sortie;
const output = path.resolve(
  root,
  outTemplate.replace('{metier}', slugify(inputProps.metier)).replace('{ville}', slugify(inputProps.ville)).replace('{date}', date),
);
fs.mkdirSync(path.dirname(output), { recursive: true });

console.log(`\n▶ ${inputProps.metier} / ${inputProps.ville}`);
console.log(`  Accroche : ${inputProps.hook}`);
console.log(`  Top 3    : ${inputProps.entreprises.slice(0, 3).map((e) => e.nom).join(' · ')}`);
console.log(
  `  Voix off : ${
    inputProps.voixOff.mode === 'fichier'
      ? `public/${config.voixOff.fichier}`
      : inputProps.voixOff.mode === 'lignes'
        ? `public/${voiceLinesDir(inputProps.slug)}/`
        : 'aucune (sound design seul)'
  }\n`,
);

console.log('Bundling…');
const serveUrl = await bundleProject();
const opts = browserOptions(args);
const composition = await selectComposition({ serveUrl, id: 'SitePulseMaps', inputProps, ...opts });

const started = Date.now();
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  crf: Number(args.crf || config.rendu.crf || 18),
  pixelFormat: 'yuv420p',
  audioCodec: 'aac',
  audioBitrate: '192k',
  outputLocation: output,
  inputProps,
  concurrency: defaultConcurrency(args),
  frameRange: args.frames ? args.frames.split('-').map(Number) : null,
  timeoutInMilliseconds: 120000,
  ...opts,
  onProgress: ({ progress, renderedFrames, encodedFrames }) => {
    const pct = Math.floor(progress * 100);
    if (pct !== last && pct % 5 === 0) {
      last = pct;
      const elapsed = (Date.now() - started) / 1000;
      console.log(`  ${String(pct).padStart(3)} %  (images ${renderedFrames}, encodées ${encodedFrames}, ${elapsed.toFixed(0)} s)`);
    }
  },
});

console.log(`\n✓ Vidéo prête : ${path.relative(process.cwd(), output)}  (${((Date.now() - started) / 1000).toFixed(0)} s)`);
