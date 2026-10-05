// Rendu final MP4 (H.264, 1080x1920, 30 fps).
// Usage : npm run render
//         npm run render -- --metier=plombier --ville="Besançon"
// Options : --out=chemin.mp4  --concurrency=4  --frames=0-120  --sans-voix  --gl=angle  --browser=/chemin/chrome
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { slugify, voiceLinesDir } from '../src/resolveConfig.js';
import { browserOptions, compositionId, buildProps, bundleProject, defaultConcurrency, ensureAssets, loadConfig, parseArgs, root } from './lib.mjs';

const args = parseArgs();
const config = loadConfig();
await ensureAssets();

let inputProps = buildProps(config, args);

// Voix off automatique (une piste par phrase, cache inclus). Sans réseau : la vidéo sort sans voix.
if (!args['sans-voix'] && inputProps.voixOff.mode !== 'fichier') {
  const extra = [args.metier && `--metier=${args.metier}`, args.ville && `--ville=${args.ville}`].filter(Boolean);
  try {
    execFileSync(process.execPath, [path.join(root, 'scripts', 'voiceover.mjs'), ...extra], { stdio: 'inherit' });
  } catch {
    console.warn('⚠ Voix off non générée : rendu avec le sound design seul.');
  }
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
const composition = await selectComposition({ serveUrl, id: compositionId(config, args), inputProps, ...opts });

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

// Normalisation du volume au standard TikTok / Reels (-14 LUFS, crête -1,5 dB), en deux passes.
// La voix ressort au bon niveau ; le sound design garde son équilibre (discret) par rapport à elle.
if (!args['sans-normalisation']) {
  const { execFileSync: run, spawnSync } = await import('node:child_process');
  // ffmpeg écrit la mesure sur stderr.
  const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', output, '-vn', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = JSON.parse(/\{[\s\S]*\}/.exec(probe.stderr)?.[0] ?? '{}');
  if (m.input_i && m.input_i !== '-inf') {
    const tmp = output.replace(/\.mp4$/, '.norm.mp4');
    const filter = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
    run('ffmpeg', ['-loglevel', 'error', '-y', '-i', output, '-c:v', 'copy', '-af', filter, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', tmp]);
    fs.renameSync(tmp, output);
    console.log(`  Volume normalisé : ${m.input_i} → -14 LUFS`);
  }
}

console.log(`\n✓ Vidéo prête : ${path.relative(process.cwd(), output)}  (${((Date.now() - started) / 1000).toFixed(0)} s)`);
