// Génère la voix off phrase par phrase.
// Chaque phrase devient public/audio/vo/<metier>-<ville>/line-N.mp3 et est
// calée dans la vidéo sur le champ "debut" de config.json → voixOff.lignes.
//
// Fournisseurs (config.json → voixOff.fournisseur) :
//   - "edge"       : voix neuronales Microsoft Edge, gratuites, sans clé (par défaut : fr-FR-HenriNeural, homme).
//   - "elevenlabs" : nécessite ELEVENLABS_API_KEY.
//
// Usage : npm run voiceover [-- --metier=plombier --ville=Besançon --force --fournisseur=elevenlabs]
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { EdgeTTS } from 'node-edge-tts';
import { resolveConfig, voiceLinesDir } from '../src/resolveConfig.js';
import { loadConfig, parseArgs, root } from './lib.mjs';

const args = parseArgs();
const config = loadConfig();
const props = resolveConfig(config, { metier: args.metier, ville: args.ville });
const provider = args.fournisseur || config.voixOff.fournisseur || 'edge';
const settings = config.voixOff[provider];
if (!settings) {
  console.error(`Fournisseur de voix inconnu : ${provider}`);
  process.exit(1);
}
if (provider === 'elevenlabs' && !process.env.ELEVENLABS_API_KEY) {
  console.error('ELEVENLABS_API_KEY manquante (ou passe "fournisseur": "edge" dans config.json).');
  process.exit(1);
}

const dir = path.join(root, 'public', voiceLinesDir(props.slug));
fs.mkdirSync(dir, { recursive: true });
const manifestPath = path.join(dir, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};

async function synthEdge(text, file) {
  const tts = new EdgeTTS({
    voice: settings.voix,
    lang: settings.voix.slice(0, 5),
    outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
    rate: settings.debit ?? 'default',
    pitch: settings.hauteur ?? 'default',
    proxy: process.env.HTTPS_PROXY || process.env.https_proxy || undefined,
    timeout: 30000,
  });
  await tts.ttsPromise(text, file);
}

async function synthElevenLabs(text, file) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${settings.voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: settings.modelId,
      language_code: 'fr',
      voice_settings: { stability: settings.stability, similarity_boost: settings.similarityBoost, style: settings.style, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status} : ${await res.text()}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

// Prononciation : « 3 » → « trois », sigles en majuscules lus comme des mots.
const speakable = (t) => t.replace(/\b3\b/g, 'trois').replace(/\bAUDIT\b/g, 'audit');

for (const [i, line] of props.voixOff.lignes.entries()) {
  const file = path.join(dir, `line-${i + 1}.mp3`);
  const text = speakable(line.texte);
  const hash = crypto.createHash('sha1').update(JSON.stringify([provider, text, settings])).digest('hex');
  if (!args.force && manifest[i + 1] === hash && fs.existsSync(file)) {
    console.log(`= ${i + 1}. ${line.texte} (déjà généré)`);
    continue;
  }
  try {
    if (provider === 'edge') await synthEdge(text, file);
    else await synthElevenLabs(text, file);
  } catch (e) {
    fs.rmSync(file, { force: true });
    console.error(`✗ Voix off impossible (${provider}) : ${e?.message || e}`);
    process.exit(1);
  }
  manifest[i + 1] = hash;
  console.log(`✓ ${i + 1}. ${line.texte}`);
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Voix off prête dans ${path.relative(root, dir)}/ (${provider} · ${settings.voix || settings.voiceId})`);
