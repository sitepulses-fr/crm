/* Contenus des cartes de verre (canvas 2D). Chaque fonction dessine l'état à la progression p ∈ [0,1]. */
export const C = {
  white: '#f3f6ff', mute: '#a9b8e0', dim: '#6f80b0', blue: '#3b7bff', hi: '#8fb4ff', ice: '#cfe0ff',
  red: '#ff5470', green: '#3ddc97', star: '#ffc94d',
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const eo = (t) => 1 - Math.pow(1 - t, 3);

export function rr(g, x, y, w, h, r) {
  w = Math.max(0.01, w); h = Math.max(0.01, h); r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function T(g, txt, x, y, size, color, { w = 400, f = 'Inter Tight', i = false, a = 'left', ls = 0 } = {}) {
  g.font = `${i ? 'italic ' : ''}${w} ${size}px "${f}"`; g.fillStyle = color; g.textAlign = a;
  if (ls && 'letterSpacing' in g) g.letterSpacing = ls + 'px';
  g.fillText(txt, x, y);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.textAlign = 'left';
}
function star(g, cx, cy, r, fill) {
  g.beginPath();
  for (let k = 0; k < 10; k++) { const an = -Math.PI / 2 + (k * Math.PI) / 5, rad = k % 2 ? r * 0.45 : r; k ? g.lineTo(cx + Math.cos(an) * rad, cy + Math.sin(an) * rad) : g.moveTo(cx + Math.cos(an) * rad, cy + Math.sin(an) * rad); }
  g.closePath(); g.fillStyle = fill; g.fill();
}
function glow(g, x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }

/* Verre dépoli bleuté : le style des références. */
export function glass(g, w, h, { r = 40, tint = 0.13, edge = 0.55, hot = 0 } = {}) {
  g.clearRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, w * 0.3, h);
  gr.addColorStop(0, `rgba(150,185,255,${tint + 0.07})`); gr.addColorStop(1, `rgba(40,70,170,${tint})`);
  rr(g, 3, 3, w - 6, h - 6, r); g.fillStyle = gr; g.fill();
  g.save(); rr(g, 3, 3, w - 6, h - 6, r); g.clip();
  glow(g, w * 0.2, -h * 0.1, w * 0.7, `rgba(190,215,255,${0.16 + hot * 0.2})`);
  g.restore();
  g.lineWidth = 3; g.strokeStyle = `rgba(185,210,255,${edge + hot * 0.4})`; rr(g, 3, 3, w - 6, h - 6, r); g.stroke();
  const hl = g.createLinearGradient(0, 0, w, 0);
  hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(0.3, 'rgba(255,255,255,.8)'); hl.addColorStop(0.7, 'rgba(255,255,255,.25)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.strokeStyle = hl; g.lineWidth = 2; g.beginPath(); g.moveTo(r, 4); g.lineTo(w - r, 4); g.stroke();
}
const pill = (g, x, y, w, h, fill, stroke) => { rr(g, x, y, w, h, h / 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } };

/* ---------- S1 : la question ---------- */
export const PROMPT = 'Comment avoir plus de clients pour mon entreprise ?';
export function prompt(g, w, h, p) {
  glass(g, w, h, { r: 56, tint: 0.1, edge: 0.45 });
  const n = Math.round(PROMPT.length * clamp(p));
  const txt = PROMPT.slice(0, n);
  g.font = '400 58px "Inter Tight"';
  const tw = g.measureText(txt).width;
  T(g, txt, 80, 150, 58, C.white);
  if (Math.floor(p * 40) % 2 === 0 || p < 1) { g.fillStyle = C.hi; g.fillRect(84 + tw, 104, 4, 60); }
  // barre d'outils
  T(g, '+', 80, h - 70, 54, C.mute);
  pill(g, 150, h - 116, 220, 64, null, 'rgba(185,210,255,.35)'); T(g, 'Site web', 190, h - 72, 30, C.mute);
  pill(g, 390, h - 116, 250, 64, null, 'rgba(185,210,255,.35)'); T(g, 'Google', 430, h - 72, 30, C.mute);
  const ready = p >= 1;
  g.beginPath(); g.arc(w - 120, h - 84, 46, 0, 7); g.fillStyle = ready ? C.blue : 'rgba(185,210,255,.25)'; g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(w - 120, h - 62); g.lineTo(w - 120, h - 106); g.moveTo(w - 138, h - 88); g.lineTo(w - 120, h - 106); g.lineTo(w - 102, h - 88); g.stroke(); g.lineCap = 'butt';
}
export function answer(g, w, h, p) {
  glass(g, w, h, { r: 44, tint: 0.16, edge: 0.7, hot: 0.4 });
  g.beginPath(); g.arc(90, h / 2, 34, 0, 7); g.fillStyle = C.blue; g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(66, h / 2); g.lineTo(78, h / 2); g.lineTo(84, h / 2 - 14); g.lineTo(94, h / 2 + 16); g.lineTo(100, h / 2); g.lineTo(114, h / 2); g.stroke();
  const msg = 'SitePulse — un site moderne qui vous apporte des clients.';
  const n = Math.round(msg.length * clamp(p));
  T(g, msg.slice(0, n), 150, h / 2 + 16, 42, C.white, { w: 500 });
}

/* ---------- S2 : le site d'un artisan (calques éclatés) ---------- */
export const SITE = { w: 1680, h: 1040 };
function bathroom(g, x, y, w, h) {
  const bg = g.createLinearGradient(x, y, x + w, y + h); bg.addColorStop(0, '#dfe9ef'); bg.addColorStop(1, '#9fb9c8'); g.fillStyle = bg; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
  for (let xx = x; xx < x + w; xx += 46) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h * 0.62); g.stroke(); }
  for (let yy = y; yy < y + h * 0.62; yy += 46) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
  g.fillStyle = '#f7fafc'; rr(g, x + w * 0.1, y + h * 0.5, w * 0.5, h * 0.22, 30); g.fill();             // vasque / baignoire
  g.fillStyle = '#c9d6de'; g.fillRect(x + w * 0.12, y + h * 0.72, w * 0.46, h * 0.04);
  g.strokeStyle = '#8a99a6'; g.lineWidth = 10; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x + w * 0.35, y + h * 0.5); g.lineTo(x + w * 0.35, y + h * 0.33); g.lineTo(x + w * 0.45, y + h * 0.33); g.stroke(); g.lineCap = 'butt';
  g.fillStyle = '#7c8f9c'; g.fillRect(x, y + h * 0.78, w, h * 0.22);
  glow(g, x + w * 0.8, y + h * 0.15, w * 0.5, 'rgba(255,255,255,.6)');
  g.fillStyle = 'rgba(46,140,160,.35)'; rr(g, x + w * 0.68, y + h * 0.25, w * 0.22, h * 0.45, 12); g.fill();
}
export const SITE_LAYERS = [
  // [nom, x, y, w, h] dans la page
  ['frame', 0, 0, 1680, 1040],
  ['nav', 40, 100, 1600, 90],
  ['hero', 40, 200, 1600, 470],
  ['title', 110, 300, 820, 220],
  ['cta', 110, 560, 420, 84],
  ['tile0', 40, 700, 520, 300],
  ['tile1', 580, 700, 520, 300],
  ['tile2', 1120, 700, 520, 300],
  ['badge', 1300, 230, 300, 120],
];
export function siteLayer(g, name, w, h) {
  g.clearRect(0, 0, w, h);
  const teal = '#0f6b7a', ink = '#122028';
  if (name === 'frame') {
    glass(g, w, h, { r: 44, tint: 0.12 });
    [['#ff5f57', 60], ['#febc2e', 96], ['#28c840', 132]].forEach(([c, x]) => { g.fillStyle = c; g.beginPath(); g.arc(x, 52, 12, 0, 7); g.fill(); });
    pill(g, 460, 26, 760, 52, 'rgba(255,255,255,.12)'); T(g, '🔒 plomberie-martin.fr'.replace('🔒 ', ''), 520, 62, 28, C.ice, { f: 'JetBrains Mono' });
    g.fillStyle = '#f6f9fb'; rr(g, 40, 100, w - 80, h - 140, 18); g.fill();
  } else if (name === 'nav') {
    g.fillStyle = '#ffffff'; rr(g, 0, 0, w, h, 14); g.fill();
    g.fillStyle = teal; rr(g, 30, 18, 54, 54, 12); g.fill(); T(g, 'PM', 38, 56, 28, '#fff', { w: 600 });
    T(g, 'Plomberie Martin', 104, 58, 34, ink, { w: 600 });
    ['Services', 'Réalisations', 'Avis', 'Contact'].forEach((t, k) => T(g, t, 820 + k * 170, 56, 26, '#47606c', { w: 500 }));
    pill(g, w - 250, 16, 220, 58, teal); T(g, '06 •• •• ••', w - 220, 54, 24, '#fff', { w: 600 });
  } else if (name === 'hero') {
    g.save(); rr(g, 0, 0, w, h, 16); g.clip(); bathroom(g, 0, 0, w, h);
    const ov = g.createLinearGradient(0, 0, w * 0.7, 0); ov.addColorStop(0, 'rgba(8,30,40,.85)'); ov.addColorStop(1, 'rgba(8,30,40,0)'); g.fillStyle = ov; g.fillRect(0, 0, w, h);
    g.restore();
  } else if (name === 'title') {
    T(g, 'PLOMBIER À DOLE · 7J/7', 0, 40, 26, '#7fd3df', { w: 600, f: 'JetBrains Mono' });
    T(g, 'Votre salle de bain,', 0, 120, 72, '#ffffff', { w: 600 });
    T(g, 'refaite à neuf.', 0, 200, 72, '#9fe6ef', { w: 600 });
  } else if (name === 'cta') {
    pill(g, 0, 0, w, h, '#ffb020'); T(g, 'Devis gratuit en 24 h', 44, 54, 32, '#1b1300', { w: 600 });
  } else if (name.startsWith('tile')) {
    const k = +name.slice(4);
    g.fillStyle = '#ffffff'; rr(g, 0, 0, w, h, 18); g.fill();
    g.strokeStyle = '#e3eaee'; g.lineWidth = 2; g.stroke();
    const icons = ['Dépannage', 'Salle de bain', 'Chauffage'];
    const sub = ['Intervention rapide', 'Rénovation complète', 'Entretien & pose'];
    g.fillStyle = ['#e6f4f6', '#fff3dc', '#e9efff'][k]; rr(g, 30, 30, 90, 90, 22); g.fill();
    g.fillStyle = [teal, '#c47a00', '#3b5bdb'][k]; g.beginPath(); g.arc(75, 75, 22, 0, 7); g.fill();
    T(g, icons[k], 30, 190, 40, ink, { w: 600 });
    T(g, sub[k], 30, 240, 28, '#5d7480');
  } else if (name === 'badge') {
    g.fillStyle = '#ffffff'; rr(g, 0, 0, w, h, 20); g.fill();
    T(g, '4,9', 26, 74, 52, ink, { w: 600 });
    for (let s = 0; s < 5; s++) star(g, 130 + s * 30, 52, 13, '#fbbc04');
    T(g, '86 avis Google', 128, 96, 22, '#5d7480');
  }
}
/* version « aplatie » du site (pour les plans éloignés et le mobile) */
export function siteFlat(g, w, h) {
  const tmp = document.createElement('canvas');
  SITE_LAYERS.forEach(([name, x, y, lw, lh]) => {
    tmp.width = lw; tmp.height = lh; siteLayer(tmp.getContext('2d'), name, lw, lh);
    g.drawImage(tmp, (x * w) / SITE.w, (y * h) / SITE.h, (lw * w) / SITE.w, (lh * h) / SITE.h);
  });
}
export function phone(g, w, h, p) {
  glass(g, w, h, { r: 90, tint: 0.14, edge: 0.7 });
  g.fillStyle = '#f6f9fb'; rr(g, 26, 26, w - 52, h - 52, 70); g.fill();
  g.fillStyle = '#0b0f14'; rr(g, w / 2 - 90, 44, 180, 46, 23); g.fill();
  const teal = '#0f6b7a', ink = '#122028';
  g.fillStyle = teal; rr(g, 60, 130, 64, 64, 14); g.fill(); T(g, 'PM', 70, 174, 30, '#fff', { w: 600 });
  T(g, 'Plomberie Martin', 144, 174, 36, ink, { w: 600 });
  g.save(); rr(g, 50, 230, w - 100, 560, 26); g.clip(); bathroom(g, 50, 230, w - 100, 560);
  const ov = g.createLinearGradient(0, 400, 0, 790); ov.addColorStop(0, 'rgba(8,30,40,0)'); ov.addColorStop(1, 'rgba(8,30,40,.9)'); g.fillStyle = ov; g.fillRect(50, 230, w - 100, 560); g.restore();
  T(g, 'Votre salle de bain,', 80, 700, 50, '#fff', { w: 600 }); T(g, 'refaite à neuf.', 80, 760, 50, '#9fe6ef', { w: 600 });
  pill(g, 60, 830, w - 120, 100, '#ffb020'); T(g, 'Devis gratuit en 24 h', w / 2, 896, 38, '#1b1300', { w: 600, a: 'center' });
  pill(g, 60, 960, w - 120, 100, null, teal); T(g, 'Appeler maintenant', w / 2, 1026, 36, teal, { w: 600, a: 'center' });
  for (let k = 0; k < 3; k++) { g.fillStyle = '#fff'; rr(g, 60, 1100 + k * 150, w - 120, 130, 22); g.fill(); g.fillStyle = ['#e6f4f6', '#fff3dc', '#e9efff'][k]; rr(g, 84, 1124 + k * 150, 82, 82, 18); g.fill(); T(g, ['Dépannage 7j/7', 'Salle de bain', 'Chauffage'][k], 190, 1180 + k * 150, 36, ink, { w: 600 }); }
}
export function chip(g, w, h, label, { ok = true, hot = 0 } = {}) {
  glass(g, w, h, { r: h / 2, tint: 0.16, edge: 0.7, hot });
  g.beginPath(); g.arc(h / 2, h / 2, h * 0.28, 0, 7); g.fillStyle = ok ? C.green : C.blue; g.fill();
  g.strokeStyle = '#06210f'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(h / 2 - 12, h / 2); g.lineTo(h / 2 - 3, h / 2 + 9); g.lineTo(h / 2 + 13, h / 2 - 9); g.stroke(); g.lineCap = 'butt';
  T(g, label, h + 6, h / 2 + 15, h * 0.4, C.white, { w: 500 });
}

/* ---------- S4 : Google ---------- */
export function maps(g, w, h, p) {
  glass(g, w, h, { r: 44 });
  // carte
  g.save(); rr(g, 40, 40, 620, h - 80, 26); g.clip();
  g.fillStyle = '#1b2b52'; g.fillRect(40, 40, 620, h - 80);
  g.strokeStyle = 'rgba(160,190,255,.25)'; g.lineWidth = 10;
  for (let x = 40; x < 660; x += 110) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x + 60, h); g.stroke(); }
  for (let y = 60; y < h; y += 100) { g.beginPath(); g.moveTo(40, y); g.lineTo(660, y - 40); g.stroke(); }
  g.strokeStyle = 'rgba(120,200,255,.5)'; g.lineWidth = 34; g.beginPath(); g.moveTo(40, h * 0.7); g.bezierCurveTo(300, h * 0.55, 400, h * 0.95, 660, h * 0.8); g.stroke();
  T(g, 'DOLE', 300, h * 0.45, 30, 'rgba(220,230,255,.6)', { w: 600, f: 'JetBrains Mono', ls: 6 });
  // épingle qui tombe
  const d = eo(seg(p, 0.05, 0.35));
  const py = lerp(-60, h * 0.42, d) - Math.sin(seg(p, 0.35, 0.55) * Math.PI) * 20;
  glow(g, 350, h * 0.44, 150 * d, 'rgba(255,90,110,.45)');
  g.fillStyle = C.red; g.beginPath(); g.moveTo(350, py + 10); g.bezierCurveTo(310, py - 40, 300, py - 72, 350, py - 104); g.bezierCurveTo(400, py - 72, 390, py - 40, 350, py + 10); g.fill();
  g.fillStyle = '#7a0f22'; g.beginPath(); g.arc(350, py - 66, 15, 0, 7); g.fill();
  g.restore();
  // fiche
  const X = 710;
  T(g, 'Plomberie Martin', X, 120, 58, C.white, { w: 600 });
  const r = lerp(4.1, 4.9, eo(seg(p, 0.2, 0.7)));
  T(g, r.toFixed(1).replace('.', ','), X, 200, 46, C.white, { w: 600 });
  for (let s = 0; s < 5; s++) star(g, X + 110 + s * 44, 184, 18, s < Math.round(r) ? C.star : 'rgba(185,210,255,.25)');
  T(g, `(${Math.round(lerp(31, 86, eo(seg(p, 0.2, 0.75))))} avis)`, X + 340, 200, 32, C.mute);
  T(g, 'Plombier · Dole', X, 254, 32, C.mute);
  T(g, 'Ouvert', X, 312, 32, C.green, { w: 600 }); T(g, '· urgences 7j/7', X + 116, 312, 32, C.white);
  ['Itinéraire', 'Appeler', 'Site Web'].forEach((t, k) => {
    pill(g, X + k * 250, 360, 230, 76, k === 0 ? C.blue : null, k ? 'rgba(185,210,255,.5)' : null);
    T(g, t, X + k * 250 + 115, 410, 30, '#fff', { w: 600, a: 'center' });
  });
  T(g, 'plomberie-martin.fr', X, 510, 30, C.hi, { f: 'JetBrains Mono' });
  T(g, 'Rue des Arènes, 39100 Dole', X, 560, 30, C.mute);
}
export const REVIEWS = [
  ['Sophie L.', 'Intervention rapide, travail très propre.'],
  ['Karim B.', 'Salle de bain magnifique, délais tenus.'],
  ['Hélène D.', 'Sérieux, à l\'écoute, je recommande !'],
];
export function review(g, w, h, k, p) {
  glass(g, w, h, { r: 36, tint: 0.15, edge: 0.65, hot: 0.2 });
  const [n, txt] = REVIEWS[k];
  g.beginPath(); g.arc(80, 86, 40, 0, 7); g.fillStyle = ['#7c5cff', '#16a37f', '#e0663d'][k]; g.fill();
  T(g, n[0], 80, 100, 38, '#fff', { w: 600, a: 'center' });
  T(g, n, 140, 76, 34, C.white, { w: 600 });
  for (let s = 0; s < 5; s++) star(g, 156 + s * 34, 112, 14, s < Math.round(5 * clamp(p * 1.4)) ? C.star : 'rgba(185,210,255,.25)');
  T(g, txt, 140, 176, 32, C.ice);
}

/* ---------- S5 : tableau de bord SEO (incliné) ---------- */
export function dash(g, w, h, p) {
  glass(g, w, h, { r: 44, tint: 0.09, edge: 0.4 });
  T(g, 'Visibilité locale', 70, 110, 46, C.white, { w: 600 });
  T(g, 'recherches « plombier dole »', 70, 160, 28, C.mute, { f: 'JetBrains Mono' });
  const months = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN'];
  const vals = [0.16, 0.24, 0.38, 0.55, 0.74, 0.96];
  const base = h - 150, top = 260, bw = 150;
  g.strokeStyle = 'rgba(185,210,255,.14)'; g.lineWidth = 2; g.setLineDash([10, 12]);
  for (let k = 0; k <= 4; k++) { const y = lerp(base, top, k / 4); g.beginPath(); g.moveTo(70, y); g.lineTo(w - 70, y); g.stroke(); }
  g.setLineDash([]);
  const pts = [];
  months.forEach((m, k) => {
    const x = 120 + k * 250, e = eo(seg(p, 0.08 + k * 0.08, 0.45 + k * 0.08));
    const bh = (base - top) * vals[k] * e;
    const gr = g.createLinearGradient(0, base - bh, 0, base);
    gr.addColorStop(0, '#bfe0ff'); gr.addColorStop(0.25, '#4f9bff'); gr.addColorStop(1, 'rgba(40,90,255,.35)');
    g.fillStyle = gr; rr(g, x, base - bh, bw, bh, 28); g.fill();
    T(g, m, x + bw / 2, base + 60, 28, C.mute, { a: 'center', f: 'JetBrains Mono' });
    pts.push([x + bw / 2, base - (base - top) * (0.1 + vals[k] * 0.75) * 1.0]);
  });
  // courbe des appels
  const L = seg(p, 0.35, 0.95);
  g.strokeStyle = C.red; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath();
  const n = (pts.length - 1) * L;
  pts.forEach(([x, y], k) => { if (k <= n) k ? g.lineTo(x, y) : g.moveTo(x, y); });
  const k0 = Math.floor(n), fr = n - k0;
  if (k0 < pts.length - 1 && L > 0) { const [x0, y0] = pts[k0], [x1, y1] = pts[k0 + 1]; g.lineTo(lerp(x0, x1, fr), lerp(y0, y1, fr)); }
  g.stroke();
  if (L > 0) { const kk = Math.min(pts.length - 1, Math.ceil(n)); const [hx, hy] = L >= 1 ? pts[pts.length - 1] : [lerp(pts[k0][0], pts[Math.min(k0 + 1, 5)][0], fr), lerp(pts[k0][1], pts[Math.min(k0 + 1, 5)][1], fr)]; void kk; glow(g, hx, hy, 60, 'rgba(255,84,112,.7)'); g.fillStyle = '#fff'; g.beginPath(); g.arc(hx, hy, 11, 0, 7); g.fill(); }
  // KPI
  pill(g, w - 560, 70, 490, 90, 'rgba(61,220,151,.14)', 'rgba(61,220,151,.6)');
  T(g, `Appels  +${Math.round(240 * eo(seg(p, 0.3, 0.9)))} %`, w - 520, 130, 40, C.green, { w: 600 });
}
export function rank(g, w, h, p) {
  glass(g, w, h, { r: h / 2, tint: 0.18, edge: 0.8, hot: 0.5 });
  T(g, '#1', 54, h / 2 + 26, 76, '#fff', { w: 600 });
  T(g, 'plombier dole', 190, h / 2 - 4, 36, C.white, { w: 500, f: 'JetBrains Mono' });
  T(g, 'Google · position moyenne', 190, h / 2 + 40, 26, C.mute);
}

/* ---------- S6 : la demande → le client ---------- */
export const MAIL = [
  'Bonjour,',
  'Nous souhaiterions un devis pour la rénovation de',
  'notre salle de bain (environ 8 m²), pose comprise.',
  'Idéalement avant le 20 novembre.',
  'Le chantier se situe à Dole.',
  'Merci d\'avance,',
  'Julie Bernard',
];
export function inbox(g, w, h, p) {
  glass(g, w, h, { r: 44, tint: 0.12, edge: 0.55, hot: 0.3 * (1 - seg(p, 0, 0.3)) });
  T(g, 'Boîte de réception', 60, 90, 40, C.white, { w: 600 });
  pill(g, w - 140, 54, 80, 50, C.blue); T(g, '1', w - 100, 92, 30, '#fff', { w: 600, a: 'center' });
  g.fillStyle = 'rgba(185,210,255,.15)'; g.fillRect(60, 120, w - 120, 2);
  g.beginPath(); g.arc(100, 186, 40, 0, 7); g.fillStyle = C.blue; g.fill(); T(g, 'JB', 100, 198, 30, '#fff', { w: 600, a: 'center' });
  T(g, 'Julie Bernard', 160, 180, 34, C.white, { w: 600 }); T(g, 'à moi · 08:02', 160, 216, 24, C.mute);
  T(g, 'Demande de devis — Salle de bain', 60, 300, 44, C.white, { w: 600 });
  const lines = Math.round(MAIL.length * eo(seg(p, 0.05, 0.6)) + 0.4);
  MAIL.slice(0, lines).forEach((l, k) => T(g, l, 60, 370 + k * 52, 32, k === 6 ? C.white : C.ice, { w: k === 6 ? 600 : 400 }));
}
export const CRM_FIELDS = [['CLIENT', 'Julie Bernard'], ['PROJET', 'Rénovation salle de bain'], ['SURFACE', '8 m²'], ['POSE', 'Comprise'], ['ÉCHÉANCE', '20 novembre'], ['LIEU', 'Dole']];
export function crm(g, w, h, p) {
  glass(g, w, h, { r: 44, tint: 0.12, edge: 0.55 });
  [['#ff5f57', 60], ['#febc2e', 92], ['#28c840', 124]].forEach(([c, x]) => { g.fillStyle = c; g.beginPath(); g.arc(x, 56, 11, 0, 7); g.fill(); });
  T(g, 'Votre outil', 160, 66, 26, C.mute);
  g.fillStyle = 'rgba(10,20,50,.35)'; rr(g, 30, 100, 360, h - 130, 24); g.fill();
  ['Tableau de bord', 'Clients', 'Devis', 'Planning', 'Factures', 'Automatisations'].forEach((t, k) => {
    if (k === 1) { rr(g, 46, 150 + k * 76 - 46, 328, 66, 16); g.fillStyle = 'rgba(59,123,255,.35)'; g.fill(); g.strokeStyle = 'rgba(143,180,255,.7)'; g.lineWidth = 2; g.stroke(); }
    g.fillStyle = k === 1 ? C.hi : C.dim; g.beginPath(); g.arc(76, 150 + k * 76 - 13, 6, 0, 7); g.fill();
    T(g, t, 100, 150 + k * 76, 28, k === 1 ? '#fff' : C.mute, { w: k === 1 ? 600 : 400 });
  });
  const X = 430;
  T(g, 'Nouveau client', X, 150, 48, C.white, { w: 600 });
  g.beginPath(); g.arc(X + 40, 230, 38, 0, 7); g.fillStyle = C.blue; g.fill(); T(g, 'JB', X + 40, 242, 28, '#fff', { w: 600, a: 'center' });
  T(g, 'Julie Bernard', X + 96, 226, 36, C.white, { w: 600 }); T(g, 'Particulier · Dole', X + 96, 262, 24, C.mute);
  CRM_FIELDS.forEach(([k, v], i) => {
    const x = X + (i % 2) * 560, y = 310 + Math.floor(i / 2) * 150, fw = 530, fh = 126;
    const on = seg(p, 0.15 + i * 0.1, 0.25 + i * 0.1);
    rr(g, x, y, fw, fh, 18); g.fillStyle = `rgba(20,40,100,${0.35 + on * 0.25})`; g.fill();
    g.strokeStyle = `rgba(143,180,255,${0.25 + on * 0.6})`; g.lineWidth = 2 + on * 2; g.stroke();
    T(g, k, x + 26, y + 44, 22, C.mute, { w: 600, f: 'JetBrains Mono', ls: 3 });
    if (on > 0) { g.globalAlpha = on; T(g, v, x + 26, y + 96, 36, '#fff', { w: 600 }); g.globalAlpha = 1; }
  });
}
export function token(g, w, h, label) {
  glass(g, w, h, { r: h / 2, tint: 0.3, edge: 0.9, hot: 1 });
  T(g, label, w / 2, h / 2 + 14, 38, '#fff', { w: 600, a: 'center' });
}

/* ---------- S7 : les offres ---------- */
export const OFFERS = [
  { name: 'Essentiel', price: 299, tag: '', feats: ['Site web moderne', 'Responsive mobile', 'Formulaire de contact', 'SSL + support'] },
  { name: 'Pulses', price: 399, tag: 'Recommandée', feats: ['Tout l\'Essentiel', 'Google My Business', 'Gestion des avis', 'Intégration carte', 'Analytics'] },
];
export function offer(g, w, h, k, p, hx = 0) {
  const o = OFFERS[k], hot = k === 1 ? 0.45 + 0.55 * hx : 0;
  glass(g, w, h, { r: 56, tint: k ? 0.2 : 0.12, edge: k ? 0.9 : 0.55, hot });
  if (o.tag) { pill(g, 60, 60, 320, 70, C.blue); T(g, o.tag, 220, 108, 32, '#fff', { w: 600, a: 'center' }); }
  T(g, o.name, 60, 240, 76, C.white, { w: 600 });
  const v = Math.round(o.price * eo(seg(p, 0.1, 0.55)));
  T(g, String(v), 60, 420, 170, '#fff', { w: 600 });
  g.font = '600 170px "Inter Tight"'; const pw = g.measureText(String(v)).width;
  T(g, '€', 76 + pw, 420, 80, C.hi, { w: 600 });
  T(g, 'paiement unique', 64, 480, 30, C.mute);
  g.fillStyle = 'rgba(185,210,255,.2)'; g.fillRect(60, 530, w - 120, 2);
  o.feats.forEach((f, i) => {
    const a = seg(p, 0.3 + i * 0.08, 0.4 + i * 0.08);
    if (a <= 0) return;
    g.globalAlpha = a;
    g.beginPath(); g.arc(84, 606 + i * 82, 20, 0, 7); g.fillStyle = k ? C.blue : 'rgba(185,210,255,.35)'; g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(75, 607 + i * 82); g.lineTo(82, 614 + i * 82); g.lineTo(94, 598 + i * 82); g.stroke(); g.lineCap = 'butt';
    T(g, f, 126, 618 + i * 82, 36, C.white, { w: i === 0 && k ? 600 : 400 });
    g.globalAlpha = 1;
  });
}

/* ---------- cartes « fantômes » d'arrière-plan ---------- */
export function ghost(g, w, h, seed) {
  glass(g, w, h, { r: 30, tint: 0.08, edge: 0.35 });
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const rows = 3 + Math.floor(r() * 4);
  for (let k = 0; k < rows; k++) {
    g.fillStyle = `rgba(185,210,255,${0.12 + r() * 0.25})`;
    rr(g, 40, 50 + k * (h - 80) / rows, (w - 80) * (0.3 + r() * 0.7), 18, 9); g.fill();
  }
  if (r() > 0.5) { g.fillStyle = 'rgba(59,123,255,.5)'; rr(g, w - 160, h - 80, 110, 40, 20); g.fill(); }
}
