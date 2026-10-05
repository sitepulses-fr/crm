// Transcription mot à mot d'un rush (Whisper small, 100 % local) → src/montage/montage.json
// Prérequis (une fois, ~250 Mo) :
//   npm i --no-save --ignore-scripts sts-whisper-small @huggingface/transformers
// Usage : npm run transcribe -- --rush=/chemin/video.mov
// Ensuite : ajuste "segments" (passages gardés) dans montage.json, puis npm run montage.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, root } from './lib.mjs';

const args = parseArgs();
if (!args.rush) {
  console.error('Indique la vidéo : npm run transcribe -- --rush=/chemin/video.mov');
  process.exit(1);
}

// 1. Rush → H.264 1080x1920 30 fps dans public/rush/.
const rushOut = path.join(root, 'public', 'rush', 'facecam.mp4');
fs.mkdirSync(path.dirname(rushOut), { recursive: true });
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', args.rush, '-vf', 'scale=1080:1920:flags=lanczos,fps=30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', rushOut], { stdio: 'inherit' });

// 2. Audio 16 kHz mono pour Whisper.
const pcm = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', args.rush, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const audio = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
const duration = audio.length / 16000;

const { pipeline, env } = await import('@huggingface/transformers');
env.allowRemoteModels = false;
env.localModelPath = path.join(root, 'node_modules', 'sts-whisper-small', 'models') + path.sep;
const asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', { dtype: 'q8' });
const res = await asr(audio, { language: 'french', task: 'transcribe', return_timestamps: 'word', chunk_length_s: 30, stride_length_s: 5 });

// 3. Fusion des jetons (apostrophes, nombres) et écriture.
const mots = [];
for (const c of res.chunks) {
  const t = c.text.trim();
  if (mots.length && /^['-]/.test(t)) {
    mots[mots.length - 1].w += t;
    mots[mots.length - 1].e = c.timestamp[1];
  } else mots.push({ w: t, s: c.timestamp[0], e: c.timestamp[1] ?? c.timestamp[0] + 0.3 });
}
const file = path.join(root, 'src', 'montage', 'montage.json');
const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const out = {
  ...prev,
  source: 'rush/facecam.mp4',
  segments: [[Math.max(0, mots[0].s - 0.2), Math.min(duration, mots[mots.length - 1].e + 0.4)]],
  mots: mots.map((m) => ({ w: m.w, s: +m.s.toFixed(2), e: +m.e.toFixed(2) })),
};
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(res.text);
console.log(`\n✓ ${mots.length} mots → src/montage/montage.json (relis-les : la transcription automatique peut se tromper)`);
