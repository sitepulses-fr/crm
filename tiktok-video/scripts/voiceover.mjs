// Génère la voix off phrase par phrase avec ElevenLabs (optionnel).
// Chaque phrase devient public/audio/vo/<metier>-<ville>/line-N.mp3 et est
// calée dans la vidéo sur le champ "debut" de config.json → voixOff.lignes.
// Usage : ELEVENLABS_API_KEY=... npm run voiceover [-- --metier=plombier --ville=Besançon --force]
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { resolveConfig, voiceLinesDir } from '../src/resolveConfig.js';
import { loadConfig, parseArgs, root } from './lib.mjs';

const args = parseArgs();
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error('ELEVENLABS_API_KEY manquante. Sinon, dépose ton enregistrement dans public/audio/voiceover.mp3.');
  process.exit(1);
}

const config = loadConfig();
const props = resolveConfig(config, { metier: args.metier, ville: args.ville });
const voice = config.voixOff.elevenlabs;
const dir = path.join(root, 'public', voiceLinesDir(props.slug));
fs.mkdirSync(dir, { recursive: true });
const manifestPath = path.join(dir, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};

for (const [i, line] of props.voixOff.lignes.entries()) {
  const file = path.join(dir, `line-${i + 1}.mp3`);
  const hash = crypto.createHash('sha1').update(JSON.stringify([line.texte, voice])).digest('hex');
  if (!args.force && manifest[i + 1] === hash && fs.existsSync(file)) {
    console.log(`= ${i + 1}. ${line.texte} (déjà généré)`);
    continue;
  }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: line.texte,
      model_id: voice.modelId,
      language_code: 'fr',
      voice_settings: { stability: voice.stability, similarity_boost: voice.similarityBoost, style: voice.style, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    console.error(`✗ ElevenLabs ${res.status} : ${await res.text()}`);
    process.exit(1);
  }
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  manifest[i + 1] = hash;
  console.log(`✓ ${i + 1}. ${line.texte}`);
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Voix off prête dans ${path.relative(root, dir)}/`);
