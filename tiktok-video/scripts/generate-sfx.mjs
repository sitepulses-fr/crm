// Sound design 100 % procédural (aucun fichier externe, aucun droit à gérer).
// Génère des WAV 48 kHz dans public/audio/sfx : nappe grave, whooshes,
// frappes clavier, chutes de pins, scintillement doré, impact, pulsation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'audio', 'sfx');
fs.mkdirSync(outDir, { recursive: true });

const SR = 48000;
const TAU = Math.PI * 2;

// Bruit pseudo-aléatoire déterministe : le rendu est identique à chaque exécution.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Filtre biquad (RBJ) à fréquence modulable échantillon par échantillon.
function biquad(type) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x, freq, q = 0.707) => {
    const w0 = (TAU * Math.min(freq, SR * 0.45)) / SR;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; }
    else if (type === 'hp') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; }
    else { b0 = alpha; b1 = 0; b2 = -alpha; } // passe-bande
    const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const smooth = (t) => t * t * (3 - 2 * t);

function writeWav(name, channels) {
  const n = channels[0].length;
  const ch = channels.length;
  // Normalisation douce + limiteur tanh pour éviter toute saturation.
  let peak = 0;
  for (const c of channels) for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(c[i]));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const buf = Buffer.alloc(44 + n * ch * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * ch * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(ch, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * ch * 2, 28);
  buf.writeUInt16LE(ch * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * ch * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.tanh(channels[c][i] * gain * 1.1) / Math.tanh(1.1);
      buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), o);
      o += 2;
    }
  }
  fs.writeFileSync(path.join(outDir, `${name}.wav`), buf);
}

const make = (seconds) => new Float32Array(Math.round(seconds * SR));

// 1. Nappe grave (drone) : accord mineur sombre, saws désaccordées filtrées.
function drone(seconds) {
  const L = make(seconds), R = make(seconds);
  const notes = [55, 82.41, 110, 130.81, 164.81]; // La1, Mi2, La2, Do3, Mi3
  const lpL = biquad('lp'), lpR = biquad('lp');
  const r = rng(7);
  const phases = notes.flatMap(() => [r(), r(), r()]);
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    let sl = 0, sr = 0;
    notes.forEach((f, k) => {
      for (let d = 0; d < 3; d++) {
        const det = f * (1 + (d - 1) * 0.0035);
        const p = (phases[k * 3 + d] + det * t) % 1;
        const saw = 2 * p - 1;
        const w = (k === 0 ? 1.4 : 1) / (k + 1);
        if (d !== 2) sl += saw * w; else sr += saw * w;
        if (d === 1) sr += saw * w * 0.6;
      }
    });
    // Sub sinus + respiration lente du filtre.
    const sub = Math.sin(TAU * 41.2 * t) * 0.9;
    const cutoff = 260 + 180 * (0.5 + 0.5 * Math.sin(TAU * 0.11 * t)) + 120 * Math.min(1, t / seconds) ;
    const fade = Math.min(1, t / 1.5) * Math.min(1, (seconds - t) / 1.2);
    L[i] = (lpL(sl, cutoff, 0.9) * 0.25 + sub * 0.35) * fade;
    R[i] = (lpR(sr, cutoff * 1.04, 0.9) * 0.25 + sub * 0.35) * fade;
  }
  return [L, R];
}

// 2. Whoosh : bruit filtré passe-bande dont la fréquence balaie.
function whoosh(seconds, f0, f1, seed, peakAt = 0.55) {
  const out = make(seconds);
  const r = rng(seed);
  const bp = biquad('bp'), bp2 = biquad('bp');
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    const shape = t < peakAt ? smooth(t / peakAt) : Math.pow(1 - (t - peakAt) / (1 - peakAt), 2);
    const f = f0 * Math.pow(f1 / f0, smooth(t));
    const n = r() * 2 - 1;
    out[i] = (bp(n, f, 1.4) + bp2(n, f * 1.9, 2.2) * 0.4) * shape;
  }
  return [out];
}

// 3. Frappe clavier : clic court très amorti.
function key(seed) {
  const out = make(0.07);
  const r = rng(seed);
  const hp = biquad('hp'), bp = biquad('bp');
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const n = r() * 2 - 1;
    out[i] = (hp(n, 2500) * Math.exp(-t / 0.006) + bp(n, 900, 3) * Math.exp(-t / 0.018) * 0.8);
  }
  return [out];
}

// 4. Chute de pin : petit « thock » grave + clic aigu.
function pinDrop() {
  const out = make(0.35);
  const r = rng(11);
  const hp = biquad('hp');
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 170 * Math.exp(-t * 18) + 70;
    phase += f / SR;
    out[i] = Math.sin(TAU * phase) * env(t, 0.002, 0.07) + hp(r() * 2 - 1, 3000) * Math.exp(-t / 0.004) * 0.35;
  }
  return [out];
}

// 5. Scintillement doré : partiels aigus en cascade avec léger vibrato.
function shimmer() {
  const L = make(2.6), R = make(2.6);
  const partials = [1318.5, 1567.98, 1975.53, 2637.02, 3135.96, 3951.07];
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    let l = 0, rr = 0;
    partials.forEach((f, k) => {
      const start = k * 0.07;
      if (t < start) return;
      const tt = t - start;
      const e = env(tt, 0.01, 0.55 + k * 0.08);
      const v = Math.sin(TAU * f * tt + 0.3 * Math.sin(TAU * 5.5 * tt)) * e / (1 + k * 0.35);
      if (k % 2) l += v; else rr += v;
      l += v * 0.35; rr += v * 0.35;
    });
    L[i] = l; R[i] = rr;
  }
  return [L, R];
}

// 6. Impact cinématique : sub qui chute + souffle de bruit.
function impact() {
  const L = make(3.2), R = make(3.2);
  const r = rng(23);
  const lp = biquad('lp'), lp2 = biquad('lp');
  let phase = 0;
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    const f = 38 + 90 * Math.exp(-t * 7);
    phase += f / SR;
    const sub = Math.sin(TAU * phase) * env(t, 0.004, 0.9);
    const n = r() * 2 - 1;
    const air = lp(n, 1800 * Math.exp(-t * 2.5) + 200, 0.8) * env(t, 0.003, 0.35) * 0.55;
    const tail = lp2(n, 400, 0.7) * env(t, 0.05, 1.2) * 0.25;
    L[i] = sub + air + tail;
    R[i] = sub + air * 0.9 + tail * 1.1;
  }
  return [L, R];
}

// 7. Pulsation (battement de cœur) : la signature « SitePulse ».
function pulse() {
  const out = make(0.9);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const beat = (tt) => (tt < 0 ? 0 : env(tt, 0.004, 0.08));
    const f = 55 + 40 * Math.exp(-(t % 0.22) * 25);
    phase += f / SR;
    out[i] = Math.sin(TAU * phase) * (beat(t) + beat(t - 0.22) * 0.75);
  }
  return [out];
}

// 8. Montée (riser) : bruit + ton qui monte, avant le texte géant.
function riser() {
  const out = make(2.2);
  const r = rng(31);
  const bp = biquad('bp');
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    const f = 200 * Math.pow(12, t * t);
    phase += f / SR;
    const amp = Math.pow(t, 2.2) * (t > 0.97 ? (1 - t) / 0.03 : 1);
    out[i] = (bp(r() * 2 - 1, f * 3, 1.2) * 0.8 + Math.sin(TAU * phase) * 0.25) * amp;
  }
  return [out];
}

// 9. Tap (validation de la recherche) : clic doux + petit corps.
function tap() {
  const out = make(0.18);
  const r = rng(41);
  const bp = biquad('bp');
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = bp(r() * 2 - 1, 1400, 2) * Math.exp(-t / 0.01) + Math.sin(TAU * 520 * t) * env(t, 0.001, 0.03) * 0.6;
  }
  return [out];
}

const DURATION = Number(process.argv[2] || 23);

writeWav('drone', drone(DURATION));
writeWav('whoosh', whoosh(1.1, 250, 4200, 3));
writeWav('whoosh-deep', whoosh(1.6, 120, 1600, 5, 0.65));
writeWav('whoosh-out', whoosh(0.9, 3000, 300, 9, 0.3));
for (let k = 0; k < 4; k++) writeWav(`key-${k}`, key(100 + k));
writeWav('pin', pinDrop());
writeWav('shimmer', shimmer());
writeWav('impact', impact());
writeWav('pulse', pulse());
writeWav('riser', riser());
writeWav('tap', tap());

console.log(`✓ Sound design généré dans ${path.relative(process.cwd(), outDir) || outDir}`);
