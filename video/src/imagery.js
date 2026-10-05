/* Visuels procéduraux de l'univers « Atelier Morel » (menuiserie) : bois, cuisines, dressings, escaliers…
   Tout est dessiné au canvas, déterministe (graines fixes), mis en cache. */

export const BRAND = {
  cream: '#f3ede3', paper: '#faf7f2', ink: '#1f1b16', oak: '#b8844b', oakLight: '#d4a96f',
  darkOak: '#6e4a2a', forest: '#2e4636', forestDeep: '#1f3127', brass: '#c9a66b', stone: '#2b2824',
};

const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

export function rr(g, x, y, w, h, r) {
  w = Math.max(0.01, w); h = Math.max(0.01, h);
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/* Veinage de bois réaliste : fond dégradé + fibres ondulées + nœuds. */
export function wood(g, x, y, w, h, { c1 = BRAND.oakLight, c2 = BRAND.oak, dark = 'rgba(80,45,15,', seed = 1, vertical = false, scale = 1 } = {}) {
  const r = rng(seed * 97 + 13);
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const gr = vertical ? g.createLinearGradient(x, y, x + w, y) : g.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, c1); gr.addColorStop(0.5, c2); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  const L = vertical ? w : h, S = vertical ? h : w;
  const n = Math.max(8, Math.floor((L / 5) * scale));
  for (let k = 0; k < n; k++) {
    const off = (k / n) * L + r() * 6;
    const amp = 2 + r() * 7, freq = 0.004 + r() * 0.01, ph = r() * 6.28;
    g.strokeStyle = dark + (0.05 + r() * 0.16).toFixed(3) + ')';
    g.lineWidth = 0.5 + r() * 1.6;
    g.beginPath();
    for (let s = 0; s <= S; s += 6) {
      const d = off + Math.sin(s * freq + ph) * amp + Math.sin(s * freq * 3.1 + ph * 2) * amp * 0.3;
      vertical ? (s ? g.lineTo(x + d, y + s) : g.moveTo(x + d, y + s)) : (s ? g.lineTo(x + s, y + d) : g.moveTo(x + s, y + d));
    }
    g.stroke();
  }
  // nœuds
  const knots = Math.floor(r() * 2.2);
  for (let k = 0; k < knots; k++) {
    const kx = x + r() * w, ky = y + r() * h, kr = 4 + r() * 10;
    for (let q = 0; q < 6; q++) {
      g.strokeStyle = dark + (0.12 + q * 0.02) + ')'; g.lineWidth = 1;
      g.beginPath(); g.ellipse(kx, ky, kr * (1 + q * 0.7) * (vertical ? 0.6 : 1.6), kr * (1 + q * 0.7) * (vertical ? 1.6 : 0.6), 0, 0, 6.283); g.stroke();
    }
  }
  // brillance satinée
  const sh = g.createLinearGradient(x, y, x + w, y + h);
  sh.addColorStop(0, 'rgba(255,240,215,.16)'); sh.addColorStop(0.5, 'rgba(255,240,215,0)'); sh.addColorStop(1, 'rgba(0,0,0,.12)');
  g.fillStyle = sh; g.fillRect(x, y, w, h);
  g.restore();
}

function vignette(g, w, h, a = 0.45) {
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${a})`);
  g.fillStyle = v; g.fillRect(0, 0, w, h);
}
function glow(g, x, y, r, col) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,220,160,0)');
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function grain(g, w, h, seed, a = 0.05) {
  const r = rng(seed + 5);
  for (let k = 0; k < (w * h) / 900; k++) { g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${a * r()})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
}

/* ---------- scènes ---------- */
function kitchen(g, w, h, seed, variant = 0) {
  const wall = g.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, variant ? '#e4ddd2' : '#ece5da'); wall.addColorStop(1, '#d3c6b2');
  g.fillStyle = wall; g.fillRect(0, 0, w, h);
  glow(g, w * 0.15, h * 0.1, w * 0.6, 'rgba(255,248,235,.55)');
  // meubles hauts
  const uy = h * 0.1, uh = h * 0.27;
  const n = 4;
  for (let k = 0; k < n; k++) {
    const x = w * 0.06 + k * (w * 0.88 / n);
    wood(g, x + 3, uy, w * 0.88 / n - 6, uh, { seed: seed + k, vertical: true });
  }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(w * 0.06, uy + uh, w * 0.88, h * 0.025);
  // crédence
  g.fillStyle = '#e8e2d8'; g.fillRect(w * 0.06, h * 0.4, w * 0.88, h * 0.16);
  g.strokeStyle = 'rgba(120,110,95,.18)'; g.lineWidth = 1;
  for (let x = w * 0.06; x < w * 0.94; x += w * 0.035) { g.beginPath(); g.moveTo(x, h * 0.4); g.lineTo(x, h * 0.56); g.stroke(); }
  for (let y = h * 0.4; y < h * 0.56; y += h * 0.04) { g.beginPath(); g.moveTo(w * 0.06, y); g.lineTo(w * 0.94, y); g.stroke(); }
  // plan de travail
  g.fillStyle = BRAND.stone; g.fillRect(w * 0.03, h * 0.56, w * 0.94, h * 0.045);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(w * 0.03, h * 0.56, w * 0.94, 2);
  // bas : façades vert forêt + poignées laiton
  const ly = h * 0.605, lh = h * 0.3;
  for (let k = 0; k < 5; k++) {
    const x = w * 0.04 + k * (w * 0.92 / 5);
    const fw = w * 0.92 / 5 - 6;
    const gr = g.createLinearGradient(x, ly, x + fw, ly + lh);
    gr.addColorStop(0, variant ? '#3a5244' : BRAND.forest); gr.addColorStop(1, BRAND.forestDeep);
    g.fillStyle = gr; g.fillRect(x + 3, ly, fw, lh);
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2; g.strokeRect(x + 3 + fw * 0.08, ly + lh * 0.06, fw * 0.84, lh * 0.88);
    g.fillStyle = BRAND.brass; g.fillRect(x + fw * 0.35, ly + lh * 0.12, fw * 0.3, Math.max(3, h * 0.008));
  }
  // sol
  wood(g, 0, h * 0.905, w, h * 0.095, { seed: seed + 40, c1: '#c99a62', c2: '#a87842' });
  // suspensions
  [0.32, 0.62].forEach((px) => {
    g.strokeStyle = 'rgba(30,25,20,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w * px, 0); g.lineTo(w * px, h * 0.3); g.stroke();
    g.fillStyle = '#1f1b16'; g.beginPath(); g.moveTo(w * px - w * 0.045, h * 0.36); g.lineTo(w * px + w * 0.045, h * 0.36); g.lineTo(w * px + w * 0.02, h * 0.3); g.lineTo(w * px - w * 0.02, h * 0.3); g.fill();
    glow(g, w * px, h * 0.37, w * 0.14, 'rgba(255,214,150,.75)');
  });
  vignette(g, w, h, 0.35); grain(g, w, h, seed);
}

function dressing(g, w, h, seed) {
  g.fillStyle = '#2a2520'; g.fillRect(0, 0, w, h);
  const cols = 4, cw = w / cols;
  for (let k = 0; k < cols; k++) {
    if (k === 1 || k === 2) {
      // niche ouverte
      g.fillStyle = '#3a322a'; g.fillRect(k * cw + 4, 0, cw - 8, h * 0.92);
      glow(g, k * cw + cw / 2, h * 0.04, cw * 0.9, 'rgba(255,214,150,.55)');
      g.fillStyle = 'rgba(255,214,150,.9)'; g.fillRect(k * cw + 8, h * 0.035, cw - 16, 3);
      g.strokeStyle = BRAND.brass; g.lineWidth = 3; g.beginPath(); g.moveTo(k * cw + 10, h * 0.12); g.lineTo(k * cw + cw - 10, h * 0.12); g.stroke();
      const r = rng(seed + k * 7);
      const pal = ['#d9cfc1', '#4b5a52', '#8a6a4a', '#e8e2d8', '#2f3a44', '#b9a27f'];
      let x = k * cw + 16;
      while (x < k * cw + cw - 30) {
        const ww = 14 + r() * 22;
        g.fillStyle = pal[Math.floor(r() * pal.length)];
        rr(g, x, h * 0.13, ww, h * (0.32 + r() * 0.16), 6); g.fill();
        x += ww + 3;
      }
      for (let s = 0; s < 3; s++) wood(g, k * cw + 4, h * (0.62 + s * 0.1), cw - 8, h * 0.018, { seed: seed + s + k * 3, scale: 0.4 });
      g.fillStyle = 'rgba(230,220,200,.5)';
      for (let s = 0; s < 3; s++) for (let b = 0; b < 4; b++) { rr(g, k * cw + 18 + b * (cw - 30) / 4, h * (0.555 + s * 0.1), (cw - 40) / 4 - 4, h * 0.06, 4); g.fill(); }
    } else wood(g, k * cw + 4, 0, cw - 8, h * 0.92, { seed: seed + k, vertical: true, c1: '#c79a63', c2: '#a9763f' });
    if (k === 0 || k === 3) { g.fillStyle = BRAND.brass; g.fillRect(k === 0 ? cw - 18 : k * cw + 12, h * 0.4, 5, h * 0.12); }
  }
  wood(g, 0, h * 0.92, w, h * 0.08, { seed: seed + 30, c1: '#8f6a45', c2: '#6e4a2a' });
  vignette(g, w, h, 0.5); grain(g, w, h, seed);
}

function stairs(g, w, h, seed) {
  const wall = g.createLinearGradient(0, 0, w, h);
  wall.addColorStop(0, '#f1ebe1'); wall.addColorStop(1, '#d9cdbb');
  g.fillStyle = wall; g.fillRect(0, 0, w, h);
  glow(g, w * 0.85, h * 0.05, w * 0.7, 'rgba(255,250,240,.6)');
  const steps = 9;
  for (let k = 0; k < steps; k++) {
    const x = w * 0.02 + k * w * 0.1, y = h * 0.92 - (k + 1) * h * 0.095;
    g.fillStyle = '#e9e2d6'; g.fillRect(x, y + h * 0.03, w * 0.1, h * 0.065);       // contremarche
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, y + h * 0.03, w * 0.1, 5);
    wood(g, x - 4, y, w * 0.1 + 26, h * 0.03, { seed: seed + k, scale: 0.6 });     // marche en chêne
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x - 4, y + h * 0.03, w * 0.1 + 26, 3);
    g.fillStyle = BRAND.ink; g.fillRect(x + w * 0.04, y - h * 0.18, 4, h * 0.18);    // balustres
  }
  g.strokeStyle = BRAND.oak; g.lineWidth = Math.max(6, h * 0.018);
  g.beginPath(); g.moveTo(w * 0.04, h * 0.66); g.lineTo(w * 0.96, h * -0.2); g.stroke();
  g.fillStyle = 'rgba(0,0,0,.08)'; g.beginPath(); g.moveTo(0, h); g.lineTo(w, h * 0.05); g.lineTo(w, h); g.fill();
  vignette(g, w, h, 0.3); grain(g, w, h, seed);
}

function table(g, w, h, seed) {
  const wall = g.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, '#2f4a3a'); wall.addColorStop(1, '#1d2d24');
  g.fillStyle = wall; g.fillRect(0, 0, w, h);
  glow(g, w * 0.5, h * 0.25, w * 0.55, 'rgba(255,214,150,.45)');
  g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(w * 0.5, 0); g.lineTo(w * 0.5, h * 0.2); g.stroke();
  g.fillStyle = BRAND.brass; g.beginPath(); g.ellipse(w * 0.5, h * 0.23, w * 0.12, h * 0.035, 0, Math.PI, 0); g.fill();
  // plateau en perspective
  g.save();
  g.beginPath(); g.moveTo(w * 0.2, h * 0.58); g.lineTo(w * 0.8, h * 0.58); g.lineTo(w * 0.95, h * 0.72); g.lineTo(w * 0.05, h * 0.72); g.closePath(); g.clip();
  wood(g, 0, h * 0.58, w, h * 0.14, { seed, c1: '#d6a86d', c2: '#b07a3f' });
  g.restore();
  wood(g, w * 0.05, h * 0.72, w * 0.9, h * 0.03, { seed: seed + 3, c1: '#8f6a45', c2: '#6e4a2a', scale: 0.4 });
  g.fillStyle = '#5a3d22'; [[0.1, 1], [0.86, 1], [0.24, 0.8], [0.72, 0.8]].forEach(([x, s]) => g.fillRect(w * x, h * 0.75, w * 0.03 * s, h * 0.22 * s));
  // vase + branche
  g.fillStyle = '#e8e2d8'; rr(g, w * 0.46, h * 0.46, w * 0.08, h * 0.13, 10); g.fill();
  g.strokeStyle = '#3d2b1b'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(w * 0.5, h * 0.47); g.quadraticCurveTo(w * 0.45, h * 0.3, w * 0.38, h * 0.22); g.moveTo(w * 0.5, h * 0.47); g.quadraticCurveTo(w * 0.56, h * 0.33, w * 0.62, h * 0.27); g.stroke();
  vignette(g, w, h, 0.5); grain(g, w, h, seed);
}

function workshop(g, w, h, seed) {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#3b2f24'); bg.addColorStop(1, '#17120e');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // rayon de lumière
  g.save(); g.globalCompositeOperation = 'lighter';
  const lb = g.createLinearGradient(w * 0.1, 0, w * 0.6, h);
  lb.addColorStop(0, 'rgba(255,220,170,.35)'); lb.addColorStop(1, 'rgba(255,220,170,0)');
  g.fillStyle = lb; g.beginPath(); g.moveTo(w * 0.05, 0); g.lineTo(w * 0.3, 0); g.lineTo(w * 0.85, h); g.lineTo(w * 0.45, h); g.fill();
  const r = rng(seed);
  for (let k = 0; k < 140; k++) { g.fillStyle = `rgba(255,230,190,${r() * 0.6})`; g.fillRect(w * (0.1 + r() * 0.6), h * r(), 2, 2); }
  g.restore();
  // panneau à outils
  g.fillStyle = '#4a3b2d'; g.fillRect(w * 0.55, h * 0.08, w * 0.4, h * 0.4);
  g.fillStyle = 'rgba(0,0,0,.35)';
  for (let x = 0; x < 9; x++) for (let y = 0; y < 6; y++) { g.beginPath(); g.arc(w * (0.57 + x * 0.045), h * (0.1 + y * 0.065), 2, 0, 7); g.fill(); }
  g.fillStyle = '#1b1612';
  g.fillRect(w * 0.6, h * 0.14, w * 0.025, h * 0.22); g.fillRect(w * 0.58, h * 0.14, w * 0.065, h * 0.03);
  g.beginPath(); g.arc(w * 0.75, h * 0.25, h * 0.08, 0, 7); g.fill();
  g.fillRect(w * 0.84, h * 0.12, w * 0.015, h * 0.25); g.fillRect(w * 0.88, h * 0.12, w * 0.015, h * 0.2);
  // établi
  wood(g, w * 0.02, h * 0.6, w * 0.96, h * 0.08, { seed: seed + 2, c1: '#c99a62', c2: '#9c6b37' });
  g.fillStyle = '#2a211a'; g.fillRect(w * 0.06, h * 0.68, w * 0.04, h * 0.32); g.fillRect(w * 0.9, h * 0.68, w * 0.04, h * 0.32);
  wood(g, w * 0.3, h * 0.52, w * 0.35, h * 0.08, { seed: seed + 9, scale: 0.6 });
  vignette(g, w, h, 0.55); grain(g, w, h, seed);
}

function detail(g, w, h, seed) {
  wood(g, 0, 0, w, h, { seed, c1: '#d8ac72', c2: '#b9824a', scale: 0.7 });
  // queue d'aronde
  g.save();
  g.beginPath(); g.moveTo(w * 0.55, 0);
  const teeth = 4;
  for (let k = 0; k < teeth; k++) {
    const y0 = (k / teeth) * h, y1 = ((k + 0.5) / teeth) * h, y2 = ((k + 1) / teeth) * h;
    g.lineTo(w * 0.55, y0 + h * 0.03); g.lineTo(w * 0.45, y0 + h * 0.01); g.lineTo(w * 0.45, y1 - h * 0.01); g.lineTo(w * 0.55, y1 - h * 0.03); g.lineTo(w * 0.55, y2);
  }
  g.lineTo(w, h); g.lineTo(w, 0); g.closePath(); g.clip();
  wood(g, 0, 0, w, h, { seed: seed + 4, c1: '#8a5c33', c2: '#6a4423', vertical: true, scale: 0.7 });
  g.restore();
  vignette(g, w, h, 0.35); grain(g, w, h, seed);
}

function finish(g, w, h, seed) { // façade vert forêt + poignée laiton (gros plan)
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#3d5a48'); gr.addColorStop(1, '#1f3127');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 3; g.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
  const b = g.createLinearGradient(0, h * 0.45, 0, h * 0.55);
  b.addColorStop(0, '#e6cc8f'); b.addColorStop(1, '#9c7a3e');
  g.fillStyle = b; rr(g, w * 0.25, h * 0.47, w * 0.5, h * 0.06, 8); g.fill();
  glow(g, w * 0.3, h * 0.2, w * 0.5, 'rgba(255,240,210,.18)');
  vignette(g, w, h, 0.4); grain(g, w, h, seed);
}

const SCENES = { kitchen, kitchen2: (g, w, h, s) => kitchen(g, w, h, s, 1), dressing, stairs, table, workshop, detail, finish };
const cache = new Map();
export function img(kind, w = 800, h = 800, seed = 1) {
  const key = `${kind}|${w}|${h}|${seed}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  SCENES[kind](c.getContext('2d'), w, h, seed);
  cache.set(key, c);
  return c;
}
/* Dessine une image en mode « cover » avec coins arrondis. */
export function drawImg(g, kind, x, y, w, h, seed = 1, r = 0) {
  const src = img(kind, Math.round(w), Math.round(h), seed);
  g.save(); if (r) { rr(g, x, y, w, h, r); g.clip(); }
  g.drawImage(src, x, y, w, h);
  g.restore();
}

/* Monogramme de marque. */
export function monogram(g, cx, cy, r, { bg = BRAND.cream, fg = BRAND.ink } = {}) {
  g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.fill();
  g.strokeStyle = BRAND.oak; g.lineWidth = Math.max(2, r * 0.05); g.beginPath(); g.arc(cx, cy, r * 0.82, 0, 6.283); g.stroke();
  g.fillStyle = fg; g.font = `400 ${r * 0.95}px "Instrument Serif"`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('AM', cx, cy + r * 0.05);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}
