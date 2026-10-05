/* Passage « vitrine » : trois appareils 3D en relief montrant la présence transformée d'Atelier Morel.
   Tablette = fiche Google · Écran + mobile = site web · Téléphone = Instagram. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BRAND, rr, wood, img, drawImg, monogram } from './imagery.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2),
};

function T(g, txt, x, y, size, color, { weight = 400, font = 'Inter Tight', italic = false, align = 'left' } = {}) {
  g.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${font}"`;
  g.fillStyle = color; g.textAlign = align; g.fillText(txt, x, y); g.textAlign = 'left';
}
function star(g, cx, cy, r, fill) {
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rad = k % 2 ? r * 0.45 : r;
    k ? g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad) : g.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  g.closePath(); g.fillStyle = fill; g.fill();
}
function shadow(g, blur, oy, a = 0.18) { g.shadowColor = `rgba(0,0,0,${a})`; g.shadowBlur = blur; g.shadowOffsetY = oy; }
function noShadow(g) { g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; }
function wrap(g, txt, x, y, maxW, lh) {
  const words = txt.split(' '); let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = test;
  }
  g.fillText(line, x, y); return y;
}

/* =========================================================================
   FICHE GOOGLE (tablette 2400×1600)
   ========================================================================= */
const GB = '#1a73e8', GTXT = '#202124', GMUTE = '#70757a', GLINE = '#dadce0', GSTAR = '#fbbc04', GGREEN = '#188038';
const mapLayer = (() => {
  const c = document.createElement('canvas'); c.width = 1000; c.height = 1600;
  const g = c.getContext('2d');
  g.fillStyle = '#eef0f3'; g.fillRect(0, 0, 1000, 1600);
  for (let x = -40; x < 1000; x += 150) for (let y = -30; y < 1600; y += 130) { g.fillStyle = (x + y) % 3 ? '#e4e7eb' : '#e8eaed'; rr(g, x + 14, y + 14, 122, 102, 10); g.fill(); }
  g.fillStyle = '#cfe8cc'; g.beginPath(); g.ellipse(760, 380, 200, 140, 0.4, 0, 7); g.fill();
  g.strokeStyle = '#a9d3f5'; g.lineWidth = 70; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-50, 980); g.bezierCurveTo(300, 900, 450, 1150, 1050, 1080); g.stroke();
  g.lineCap = 'butt';
  const road = (pts, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  for (let x = 0; x < 1000; x += 150) road([[x, 0], [x, 1600]], 16, '#fff');
  for (let y = 0; y < 1600; y += 130) road([[0, y], [1000, y]], 16, '#fff');
  road([[0, 640], [1000, 520]], 30, '#fde293');
  road([[220, 0], [300, 1600]], 26, '#fde293');
  g.font = '500 26px "Inter Tight"'; g.fillStyle = '#7b8794';
  g.fillText('Parc Blandan', 680, 390); g.fillText('Rhône', 120, 1010); g.fillText('Lyon 7e', 520, 820);
  return c;
})();
const ROUTE = [[300, 1260], [300, 1170], [450, 1170], [450, 910], [600, 910], [600, 770], [640, 770]];
function routeLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }

function gButtonIcon(g, kind, cx, cy, col) {
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  if (kind === 0) { g.moveTo(cx, cy - 20); g.lineTo(cx + 20, cy); g.lineTo(cx, cy + 20); g.lineTo(cx - 20, cy); g.closePath(); g.fill(); g.strokeStyle = col === '#fff' ? GB : '#fff'; g.beginPath(); g.moveTo(cx - 6, cy + 6); g.lineTo(cx - 6, cy - 2); g.lineTo(cx + 6, cy - 2); g.moveTo(cx + 2, cy - 6); g.lineTo(cx + 6, cy - 2); g.lineTo(cx + 2, cy + 2); g.stroke(); }
  else if (kind === 1) { g.moveTo(cx - 14, cy - 16); g.quadraticCurveTo(cx - 20, cy + 8, cx + 14, cy + 16); g.stroke(); g.beginPath(); g.arc(cx - 13, cy - 15, 5, 0, 7); g.arc(cx + 13, cy + 15, 5, 0, 7); g.fill(); }
  else if (kind === 2) { g.arc(cx, cy, 18, 0, 7); g.stroke(); g.beginPath(); g.ellipse(cx, cy, 8, 18, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(cx - 18, cy); g.lineTo(cx + 18, cy); g.stroke(); }
  else if (kind === 3) { g.moveTo(cx - 12, cy - 18); g.lineTo(cx + 12, cy - 18); g.lineTo(cx + 12, cy + 18); g.lineTo(cx, cy + 8); g.lineTo(cx - 12, cy + 18); g.closePath(); g.stroke(); }
  else { [[cx + 12, cy - 14], [cx - 12, cy], [cx + 12, cy + 14]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }); g.beginPath(); g.moveTo(cx + 12, cy - 14); g.lineTo(cx - 12, cy); g.lineTo(cx + 12, cy + 14); g.stroke(); }
  g.lineCap = 'butt';
}

function drawGoogle(g, s) {
  const W = 2400, H = 1600;
  g.clearRect(0, 0, W, H);
  // carte
  g.drawImage(mapLayer, 0, 0);
  const L = routeLen(ROUTE), draw = E.inOut(seg(s, 0.05, 0.55)) * L;
  g.strokeStyle = GB; g.lineWidth = 16; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); let acc = 0; g.moveTo(...ROUTE[0]);
  for (let i = 1; i < ROUTE.length; i++) {
    const [x0, y0] = ROUTE[i - 1], [x1, y1] = ROUTE[i], d = Math.hypot(x1 - x0, y1 - y0);
    if (acc + d <= draw) g.lineTo(x1, y1); else { const k = (draw - acc) / d; if (k > 0) g.lineTo(lerp(x0, x1, k), lerp(y0, y1, k)); break; }
    acc += d;
  }
  g.stroke(); g.lineCap = 'butt';
  g.fillStyle = 'rgba(26,115,232,.2)'; g.beginPath(); g.arc(300, 1260, 46 + 10 * Math.sin(s * 30), 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(300, 1260, 22, 0, 7); g.fill(); g.fillStyle = GB; g.beginPath(); g.arc(300, 1260, 15, 0, 7); g.fill();
  // épingle
  const py = 760 - 20 * Math.abs(Math.sin(s * 9)) * (1 - seg(s, 0.3, 0.6));
  shadow(g, 18, 8, 0.3);
  g.fillStyle = '#ea4335'; g.beginPath(); g.moveTo(640, py + 10); g.bezierCurveTo(600, py - 40, 590, py - 70, 640, py - 100); g.bezierCurveTo(690, py - 70, 680, py - 40, 640, py + 10); g.fill();
  noShadow(g);
  g.fillStyle = '#a50e0e'; g.beginPath(); g.arc(640, py - 62, 14, 0, 7); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#fff'; g.font = '600 34px "Inter Tight"'; g.strokeText('Atelier Morel', 680, py - 50); g.fillStyle = '#c5221f'; g.fillText('Atelier Morel', 680, py - 50);
  // barre de recherche
  shadow(g, 24, 6, 0.2); g.fillStyle = '#fff'; rr(g, 40, 40, 920, 112, 56); g.fill(); noShadow(g);
  T(g, 'Atelier Morel', 110, 112, 38, GTXT, { weight: 500 });
  g.strokeStyle = GMUTE; g.lineWidth = 4; g.beginPath(); g.moveTo(880, 76); g.lineTo(920, 116); g.moveTo(920, 76); g.lineTo(880, 116); g.stroke();

  // panneau fiche
  const X = 1000;
  shadow(g, 40, 0, 0.25); g.fillStyle = '#fff'; g.fillRect(X, 0, W - X, H); noShadow(g);
  drawImg(g, 'kitchen', X, 0, 820, 500, 3);
  drawImg(g, 'stairs', X + 826, 0, 574, 247, 5);
  drawImg(g, 'workshop', X + 826, 253, 574, 247, 7);
  g.fillStyle = 'rgba(0,0,0,.55)'; rr(g, X + 30, 420, 300, 56, 28); g.fill();
  T(g, 'Voir les 24 photos', X + 58, 458, 26, '#fff', { weight: 500 });
  T(g, 'Atelier Morel', X + 50, 600, 70, GTXT, { weight: 500 });
  const cnt = Math.round(lerp(118, 127, E.out(seg(s, 0.45, 0.8))));
  T(g, '4,8', X + 50, 668, 34, GTXT);
  for (let k = 0; k < 5; k++) star(g, X + 128 + k * 40, 656, 17, GSTAR);
  T(g, `(${cnt})`, X + 336, 668, 32, GMUTE);
  T(g, 'Menuisier ébéniste · €€ · Lyon 7e', X + 50, 720, 30, GMUTE);
  ['Présentation', 'Avis', 'À propos'].forEach((t, k) => T(g, t, X + 50 + k * 300, 806, 30, k ? GMUTE : GB, { weight: 500 }));
  g.fillStyle = GB; g.fillRect(X + 40, 826, 210, 6); g.fillStyle = GLINE; g.fillRect(X, 832, W - X, 2);
  ['Itinéraire', 'Appeler', 'Site Web', 'Enregistrer', 'Partager'].forEach((t, k) => {
    const cx = X + 120 + k * 270, cy = 930;
    g.beginPath(); g.arc(cx, cy, 50, 0, 7);
    if (k === 0) { g.fillStyle = GB; g.fill(); } else { g.strokeStyle = GLINE; g.lineWidth = 3; g.stroke(); }
    gButtonIcon(g, k, cx, cy, k === 0 ? '#fff' : GB);
    T(g, t, cx, 1030, 26, GB, { weight: 500, align: 'center' });
  });
  g.fillStyle = GLINE; g.fillRect(X, 1072, W - X, 2);
  const info = [['12 rue des Artisans, 69007 Lyon', GTXT], ['Ouvert', GGREEN, ' · Ferme à 19:00'], ['atelier-morel.fr', GTXT], ['Devis gratuit · Intervention Lyon et alentours', GTXT]];
  info.forEach(([a, c, b], k) => {
    const y = 1140 + k * 64;
    g.fillStyle = GB; g.beginPath(); g.arc(X + 66, y - 10, 9, 0, 7); g.fill();
    T(g, a, X + 110, y, 30, c, { weight: c === GGREEN ? 600 : 400 });
    if (b) { g.font = '600 30px "Inter Tight"'; T(g, b, X + 110 + g.measureText(a).width, y, 30, GTXT); }
  });
  // avis
  g.fillStyle = GLINE; g.fillRect(X + 820, 1086, 2, 470);
  T(g, 'Avis', X + 870, 1140, 36, GTXT, { weight: 500 });
  const reviews = [['C', '#5e35b1', 'Claire D.', 'il y a 2 jours', 'Cuisine magnifique, délais tenus. Un vrai savoir-faire.'], ['M', '#00897b', 'Marc L.', 'il y a 1 semaine', 'Escalier en chêne superbe, artisan à l\'écoute.']];
  reviews.forEach(([i, col, n, d, txt], k) => {
    const y = 1200 + k * 180;
    g.fillStyle = col; g.beginPath(); g.arc(X + 900, y + 10, 30, 0, 7); g.fill();
    T(g, i, X + 900, y + 22, 32, '#fff', { weight: 600, align: 'center' });
    T(g, n, X + 950, y + 4, 28, GTXT, { weight: 600 });
    for (let q = 0; q < 5; q++) star(g, X + 960 + q * 28, y + 40, 12, GSTAR);
    T(g, d, X + 1110, y + 48, 24, GMUTE);
    g.font = '400 26px "Inter Tight"'; g.fillStyle = '#3c4043'; wrap(g, txt, X + 950, y + 92, 470, 34);
  });
  // toast « nouvel avis »
  const tk = E.out(seg(s, 0.5, 0.62)) * (1 - seg(s, 0.92, 1));
  if (tk > 0) {
    const ty = lerp(H + 20, H - 150, tk);
    shadow(g, 30, 10, 0.3); g.fillStyle = '#323232'; rr(g, X + 300, ty, 820, 110, 16); g.fill(); noShadow(g);
    for (let q = 0; q < 5; q++) star(g, X + 360 + q * 34, ty + 56, 14, GSTAR);
    T(g, 'Nouvel avis 5 étoiles · « Travail impeccable »', X + 540, ty + 66, 28, '#fff');
  }
}

/* =========================================================================
   SITE WEB (écran 2560×1600 + page longue) et version mobile (1000×2100)
   ========================================================================= */
const PAGE_W = 2560, PAGE_H = 4300;
let pageCanvas = null;
function buildPage() {
  const c = document.createElement('canvas'); c.width = PAGE_W; c.height = PAGE_H;
  const g = c.getContext('2d');
  g.fillStyle = BRAND.paper; g.fillRect(0, 0, PAGE_W, PAGE_H);
  // hero
  g.drawImage(img('kitchen', PAGE_W, 1130, 11), 0, 0);
  const ov = g.createLinearGradient(0, 0, PAGE_W * 0.7, 0);
  ov.addColorStop(0, 'rgba(20,16,12,.86)'); ov.addColorStop(0.55, 'rgba(20,16,12,.45)'); ov.addColorStop(1, 'rgba(20,16,12,0)');
  g.fillStyle = ov; g.fillRect(0, 0, PAGE_W, 1130);
  T(g, 'MENUISIER ÉBÉNISTE · LYON 7e', 170, 400, 30, BRAND.brass, { font: 'JetBrains Mono', weight: 500 });
  T(g, "L'art du bois,", 160, 590, 170, BRAND.cream, { font: 'Instrument Serif' });
  T(g, 'sur mesure.', 160, 760, 170, BRAND.oakLight, { font: 'Instrument Serif', italic: true });
  g.font = '400 40px "Inter Tight"'; g.fillStyle = 'rgba(243,237,227,.85)';
  g.fillText('Cuisines, dressings et escaliers dessinés et fabriqués', 168, 850);
  g.fillText('dans notre atelier lyonnais depuis 1998.', 168, 904);
  g.fillStyle = BRAND.cream; rr(g, 168, 960, 560, 104, 52); g.fill();
  T(g, 'Voir nos réalisations', 222, 1026, 36, BRAND.ink, { weight: 600 });
  g.strokeStyle = BRAND.cream; g.lineWidth = 3; rr(g, 760, 960, 400, 104, 52); g.stroke();
  T(g, 'Devis gratuit', 830, 1026, 36, BRAND.cream, { weight: 600 });
  // chiffres
  g.fillStyle = BRAND.forest; g.fillRect(0, 1130, PAGE_W, 270);
  [['25 ans', "D'EXPÉRIENCE"], ['600+', 'PROJETS LIVRÉS'], ['4,8 ★', '127 AVIS GOOGLE'], ['100 %', 'FABRIQUÉ À LYON']].forEach(([a, b], k) => {
    const x = 170 + k * 600;
    T(g, a, x, 1270, 96, BRAND.cream, { font: 'Instrument Serif' });
    T(g, b, x + 4, 1330, 26, BRAND.brass, { font: 'JetBrains Mono', weight: 500 });
  });
  // réalisations
  T(g, 'NOS RÉALISATIONS', 170, 1560, 30, BRAND.oak, { font: 'JetBrains Mono', weight: 500 });
  T(g, 'Pensé pour votre intérieur,', 160, 1700, 110, BRAND.ink, { font: 'Instrument Serif' });
  T(g, 'fabriqué pour durer.', 160, 1820, 110, BRAND.darkOak, { font: 'Instrument Serif', italic: true });
  [['dressing', 'Dressings', 'Sur mesure, du sol au plafond'], ['stairs', 'Escaliers', 'Chêne massif, lignes épurées'], ['table', 'Mobilier', 'Tables et pièces uniques']].forEach(([k, t, d], i) => {
    const x = 160 + i * 770;
    shadow(g, 40, 20, 0.15); drawImg(g, k, x, 1920, 720, 620, 20 + i, 18); noShadow(g);
    T(g, t, x, 2640, 64, BRAND.ink, { font: 'Instrument Serif' });
    T(g, d, x, 2700, 32, '#6f665b');
  });
  // témoignage
  g.fillStyle = BRAND.ink; g.fillRect(0, 2820, PAGE_W, 700);
  for (let q = 0; q < 5; q++) star(g, 200 + q * 52, 2960, 20, BRAND.brass);
  g.font = 'italic 400 84px "Instrument Serif"'; g.fillStyle = BRAND.cream;
  wrap(g, '« Un travail d\'orfèvre et des délais tenus. Notre cuisine est devenue la pièce préférée de la maison. »', 190, 3110, 2100, 100);
  T(g, 'CLAIRE D. · CUISINE SUR MESURE · LYON 6e', 196, 3420, 28, BRAND.brass, { font: 'JetBrains Mono', weight: 500 });
  // atelier
  drawImg(g, 'workshop', 160, 3640, 1100, 560, 31, 18);
  T(g, "L'ATELIER", 1380, 3760, 30, BRAND.oak, { font: 'JetBrains Mono', weight: 500 });
  T(g, 'Chaque pièce naît', 1370, 3880, 96, BRAND.ink, { font: 'Instrument Serif' });
  T(g, 'à Lyon 7e.', 1370, 3990, 96, BRAND.darkOak, { font: 'Instrument Serif', italic: true });
  g.fillStyle = BRAND.forest; rr(g, 1380, 4060, 520, 100, 50); g.fill();
  T(g, 'Prendre rendez-vous', 1436, 4124, 34, BRAND.cream, { weight: 600 });
  return c;
}
function siteNav(g, y, solid) {
  if (solid) { g.fillStyle = 'rgba(250,247,242,.97)'; g.fillRect(0, y, PAGE_W, 130); g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, y + 128, PAGE_W, 2); }
  const col = solid ? BRAND.ink : BRAND.cream;
  monogram(g, 210, y + 65, 40, solid ? {} : { bg: 'rgba(243,237,227,.95)' });
  T(g, 'Atelier Morel', 270, y + 82, 48, col, { font: 'Instrument Serif' });
  ['Réalisations', 'Savoir-faire', "L'atelier", 'Avis', 'Contact'].forEach((t, k) => T(g, t, 1180 + k * 210, y + 78, 30, col, { weight: 500 }));
  g.fillStyle = BRAND.forest; rr(g, 2200, y + 30, 300, 72, 36); g.fill();
  T(g, 'Devis gratuit', 2240, y + 77, 30, BRAND.cream, { weight: 600 });
}
function drawSite(g, s) {
  if (!pageCanvas) pageCanvas = buildPage();
  const W = 2560, H = 1600, CH = 92;
  g.fillStyle = '#dee1e6'; g.fillRect(0, 0, W, CH);
  [['#ff5f57', 40], ['#febc2e', 76], ['#28c840', 112]].forEach(([c, x]) => { g.fillStyle = c; g.beginPath(); g.arc(x, 46, 12, 0, 7); g.fill(); });
  g.fillStyle = '#fff'; rr(g, 170, 14, 520, 78, 14); g.fill();
  T(g, 'Atelier Morel — Menuisier sur…', 200, 64, 26, '#3c4043');
  g.fillStyle = '#f1f3f4'; rr(g, 740, 22, 1300, 52, 26); g.fill();
  g.strokeStyle = '#188038'; g.lineWidth = 4; rr(g, 768, 36, 18, 22, 4); g.stroke();
  T(g, 'atelier-morel.fr', 806, 58, 28, '#202124');
  const scroll = E.inOut(seg(s, 0.18, 0.92)) * 2550;
  g.save(); g.beginPath(); g.rect(0, CH, W, H - CH); g.clip();
  g.drawImage(pageCanvas, 0, scroll, PAGE_W, H - CH, 0, CH, W, H - CH);
  siteNav(g, CH, scroll > 300);
  g.restore();
  // curseur
  const cx = lerp(1700, 2330, E.inOut(seg(s, 0.0, 0.16))), cy = lerp(900, CH + 66, E.inOut(seg(s, 0.0, 0.16)));
  if (s < 0.2) { g.fillStyle = '#000'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + 46); g.lineTo(cx + 12, cy + 34); g.lineTo(cx + 32, cy + 34); g.closePath(); g.fill(); g.stroke(); }
}
function drawMobile(g, s) {
  const W = 1000, H = 2100;
  g.fillStyle = BRAND.paper; g.fillRect(0, 0, W, H);
  const off = E.inOut(seg(s, 0.3, 0.95)) * 700;
  g.save(); g.translate(0, -off);
  g.drawImage(img('kitchen2', W, 1250, 14), 0, 0);
  const ov = g.createLinearGradient(0, 300, 0, 1250);
  ov.addColorStop(0, 'rgba(20,16,12,0)'); ov.addColorStop(1, 'rgba(20,16,12,.9)');
  g.fillStyle = ov; g.fillRect(0, 0, W, 1250);
  T(g, "L'art du bois,", 70, 900, 110, BRAND.cream, { font: 'Instrument Serif' });
  T(g, 'sur mesure.', 70, 1010, 110, BRAND.oakLight, { font: 'Instrument Serif', italic: true });
  g.fillStyle = BRAND.cream; rr(g, 70, 1080, 520, 100, 50); g.fill();
  T(g, 'Devis gratuit', 190, 1144, 38, BRAND.ink, { weight: 600 });
  g.fillStyle = BRAND.forest; g.fillRect(0, 1250, W, 330);
  [['25 ans', "D'EXPÉRIENCE"], ['4,8 ★', '127 AVIS']].forEach(([a, b], k) => { T(g, a, 70 + k * 470, 1410, 90, BRAND.cream, { font: 'Instrument Serif' }); T(g, b, 74 + k * 470, 1470, 26, BRAND.brass, { font: 'JetBrains Mono' }); });
  drawImg(g, 'dressing', 70, 1660, 860, 640, 21, 18);
  T(g, 'Dressings', 70, 2390, 70, BRAND.ink, { font: 'Instrument Serif' });
  drawImg(g, 'stairs', 70, 2460, 860, 640, 22, 18);
  g.restore();
  // barre du haut
  g.fillStyle = 'rgba(250,247,242,.96)'; g.fillRect(0, 0, W, 210);
  T(g, '9:41', 70, 70, 38, BRAND.ink, { weight: 600 });
  g.fillStyle = BRAND.ink; rr(g, 860, 44, 70, 32, 8); g.fill();
  monogram(g, 110, 150, 40);
  T(g, 'Atelier Morel', 170, 166, 46, BRAND.ink, { font: 'Instrument Serif' });
  g.fillStyle = BRAND.ink; [136, 152, 168].forEach((y) => g.fillRect(860, y, 70, 5));
}

/* =========================================================================
   INSTAGRAM (téléphone 1200×2560)
   ========================================================================= */
const IG_GRID = [['kitchen', 41], ['detail', 42], ['dressing', 43], ['stairs', 44], ['finish', 45], ['workshop', 46], ['table', 47], ['kitchen2', 48], ['detail', 49], ['dressing', 50], ['stairs', 51], ['kitchen', 52], ['workshop', 53], ['finish', 54], ['table', 55]];
function igGradientRing(g, cx, cy, r, lw) {
  const gr = g.createLinearGradient(cx - r, cy + r, cx + r, cy - r);
  gr.addColorStop(0, '#feda75'); gr.addColorStop(0.35, '#fa7e1e'); gr.addColorStop(0.6, '#d62976'); gr.addColorStop(0.85, '#962fbf'); gr.addColorStop(1, '#4f5bd5');
  g.strokeStyle = gr; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
}
function drawInsta(g, s) {
  const W = 1200, H = 2560, ink = '#000', mute = '#737373';
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  const off = E.inOut(seg(s, 0.4, 0.95)) * 760;
  g.save(); g.translate(0, -off);
  // profil
  igGradientRing(g, 170, 400, 132, 12);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(170, 400, 122, 0, 7); g.fill();
  monogram(g, 170, 400, 112);
  const fol = Math.round(lerp(3300, 3480, E.out(seg(s, 0.1, 0.6))));
  [['146', 'publications'], [fol.toLocaleString('fr-FR'), 'abonnés'], ['212', 'suivi(e)s']].forEach(([a, b], k) => {
    const x = 520 + k * 240;
    T(g, a, x, 400, 50, ink, { weight: 700, align: 'center' });
    T(g, b, x, 452, 32, ink, { align: 'center' });
  });
  T(g, 'Atelier Morel', 60, 610, 38, ink, { weight: 700 });
  T(g, 'Menuisier ébéniste', 60, 662, 34, mute);
  ['Cuisines, dressings & escaliers sur mesure', 'Fabriqué à la main à Lyon 7e, depuis 1998', 'Devis gratuit en message privé'].forEach((t, k) => T(g, t, 60, 716 + k * 50, 34, ink));
  T(g, 'atelier-morel.fr', 60, 872, 34, '#00376b', { weight: 600 });
  g.fillStyle = '#0095f6'; rr(g, 60, 920, 520, 88, 20); g.fill(); T(g, 'Suivre', 320, 976, 34, '#fff', { weight: 700, align: 'center' });
  g.fillStyle = '#efefef'; rr(g, 600, 920, 420, 88, 20); g.fill(); T(g, 'Message', 810, 976, 34, ink, { weight: 700, align: 'center' });
  g.fillStyle = '#efefef'; rr(g, 1040, 920, 100, 88, 20); g.fill();
  g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.arc(1084, 952, 12, 0, 7); g.stroke(); g.beginPath(); g.arc(1084, 990, 22, Math.PI, 0); g.stroke();
  // à la une
  [['kitchen', 'Cuisines'], ['dressing', 'Dressings'], ['stairs', 'Escaliers'], ['workshop', "L'atelier"], ['detail', 'Détails']].forEach(([k, t], i) => {
    const cx = 130 + i * 235, cy = 1150;
    g.strokeStyle = '#dbdbdb'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 86, 0, 7); g.stroke();
    g.save(); g.beginPath(); g.arc(cx, cy, 76, 0, 7); g.clip(); g.drawImage(img(k, 152, 152, 60 + i), cx - 76, cy - 76); g.restore();
    T(g, t, cx, 1290, 28, ink, { align: 'center' });
  });
  // onglets
  g.fillStyle = '#dbdbdb'; g.fillRect(0, 1350, W, 2); g.fillStyle = ink; g.fillRect(0, 1348, W / 3, 4);
  g.strokeStyle = ink; g.lineWidth = 4;
  g.strokeRect(W / 6 - 22, 1380, 44, 44); g.beginPath(); g.moveTo(W / 6 - 7, 1380); g.lineTo(W / 6 - 7, 1424); g.moveTo(W / 6 + 7, 1380); g.lineTo(W / 6 + 7, 1424); g.moveTo(W / 6 - 22, 1395); g.lineTo(W / 6 + 22, 1395); g.moveTo(W / 6 - 22, 1409); g.lineTo(W / 6 + 22, 1409); g.stroke();
  g.strokeStyle = mute; rr(g, W / 2 - 22, 1380, 44, 44, 10); g.stroke();
  g.beginPath(); g.moveTo(W / 2 - 6, 1394); g.lineTo(W / 2 + 10, 1402); g.lineTo(W / 2 - 6, 1410); g.closePath(); g.stroke();
  g.strokeRect(5 * W / 6 - 22, 1380, 44, 44);
  // grille
  const cw = (W - 6) / 3, chh = cw * 1.33;
  IG_GRID.forEach(([k, seed], i) => {
    const x = (i % 3) * (cw + 3), y = 1450 + Math.floor(i / 3) * (chh + 3);
    g.drawImage(img(k, Math.round(cw), Math.round(chh), seed), x, y, cw, chh);
    if (i === 1 || i === 7) { // réel
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x + cw - 50, y + 22); g.lineTo(x + cw - 22, y + 38); g.lineTo(x + cw - 50, y + 54); g.closePath(); g.fill();
    }
    if (i === 4) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + chh - 90, cw, 90); T(g, 'AVANT / APRÈS', x + cw / 2, y + chh - 32, 30, '#fff', { font: 'JetBrains Mono', weight: 500, align: 'center' }); }
  });
  g.restore();
  // barre d'état + en-tête (fixes)
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, 230);
  T(g, '9:41', 80, 76, 40, ink, { weight: 600 });
  g.fillStyle = ink; rr(g, 1030, 46, 90, 38, 10); g.fill();
  T(g, 'ateliermorel', 60, 196, 54, ink, { weight: 700 });
  g.strokeStyle = ink; g.lineWidth = 5; rr(g, 990, 154, 56, 56, 14); g.stroke();
  g.beginPath(); g.moveTo(1018, 166); g.lineTo(1018, 198); g.moveTo(1002, 182); g.lineTo(1034, 182); g.stroke();
  [164, 182, 200].forEach((y) => { g.beginPath(); g.moveTo(1080, y); g.lineTo(1130, y); g.stroke(); });
  // notification
  const nk = E.out(seg(s, 0.55, 0.66)) * (1 - seg(s, 0.9, 1));
  if (nk > 0) {
    const y = lerp(-160, 250, nk);
    shadow(g, 40, 12, 0.25); g.fillStyle = '#fff'; rr(g, 60, y, W - 120, 140, 36); g.fill(); noShadow(g);
    g.fillStyle = '#ff3040'; g.beginPath(); g.arc(150, y + 70, 42, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(150, y + 92); g.bezierCurveTo(118, y + 70, 120, y + 46, 140, y + 50); g.bezierCurveTo(147, y + 52, 150, y + 58, 150, y + 60); g.bezierCurveTo(150, y + 58, 153, y + 52, 160, y + 50); g.bezierCurveTo(180, y + 46, 182, y + 70, 150, y + 92); g.fill();
    T(g, '+180 abonnés cette semaine', 220, y + 64, 36, ink, { weight: 700 });
    T(g, '« Cuisine en chêne » · 1 240 j\'aime', 220, y + 110, 30, mute);
  }
  // barre de navigation
  g.fillStyle = '#fff'; g.fillRect(0, H - 150, W, 150); g.fillStyle = '#dbdbdb'; g.fillRect(0, H - 150, W, 2);
  g.strokeStyle = ink; g.lineWidth = 5;
  [120, 360, 600, 840].forEach((x, k) => { g.beginPath(); if (k === 0) { g.moveTo(x - 26, H - 60); g.lineTo(x - 26, H - 92); g.lineTo(x, H - 112); g.lineTo(x + 26, H - 92); g.lineTo(x + 26, H - 60); g.closePath(); } else if (k === 1) { g.arc(x, H - 88, 22, 0, 7); g.moveTo(x + 16, H - 72); g.lineTo(x + 30, H - 58); } else if (k === 2) rr(g, x - 28, H - 114, 56, 56, 14); else rr(g, x - 28, H - 114, 56, 56, 12); g.stroke(); });
  g.save(); g.beginPath(); g.arc(1080, H - 86, 30, 0, 7); g.clip(); monogram(g, 1080, H - 86, 30); g.restore();
  g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(1080, H - 86, 33, 0, 7); g.stroke();
}

/* =========================================================================
   Appareils 3D
   ========================================================================= */
function screenMesh(w, h, cw, ch) {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(0.86, 0.86, 0.86) }));
  m.userData = { g: c.getContext('2d'), tex };
  return m;
}
function device(w, h, d, r, bezel, cw, ch) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 6, r), new THREE.MeshStandardMaterial({ color: 0x0e1322, metalness: 0.85, roughness: 0.3 }));
  const rim = new THREE.Mesh(new RoundedBoxGeometry(w + 0.03, h + 0.03, d * 0.6, 6, r), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3b7bff).multiplyScalar(1.6), toneMapped: false }));
  const scr = screenMesh(w - bezel * 2, h - bezel * 2, cw, ch);
  scr.position.z = d / 2 + 0.003;
  grp.add(rim, body, scr);
  grp.userData.screen = scr;
  return grp;
}

export function buildShowcase(scene) {
  const R = 9.6, Y = 8.6;
  const mk = (theta) => {
    const n = new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta));
    return { C: new THREE.Vector3(n.x * R, Y, n.z * R), n, tan: new THREE.Vector3(-n.z, 0, n.x) };
  };
  const G = Object.assign(mk((32 * Math.PI) / 180), { dev: device(4.4, 3.0, 0.14, 0.14, 0.1, 2400, 1600), D: 5.5, shift: 1.45, draw: drawGoogle });
  const S = Object.assign(mk((-16 * Math.PI) / 180), { dev: device(5.4, 3.55, 0.12, 0.08, 0.1, 2560, 1600), D: 7.0, shift: 0.95, draw: drawSite });
  const I = Object.assign(mk((-64 * Math.PI) / 180), { dev: device(2.0, 4.15, 0.14, 0.26, 0.06, 1200, 2560), D: 6.2, shift: 1.6, draw: drawInsta });
  const phone = device(1.25, 2.6, 0.12, 0.17, 0.05, 1000, 2100);
  phone.position.set(2.55, -0.75, 0.42);
  phone.rotation.y = -0.18;
  S.dev.add(phone);
  const shots = [G, S, I];
  shots.forEach((sh) => {
    sh.holder = new THREE.Group();
    sh.holder.position.copy(sh.C);
    sh.holder.lookAt(sh.C.clone().add(sh.n));
    sh.holder.add(sh.dev);
    scene.add(sh.holder);
  });

  const W = [[19.9, 22.7], [23.5, 26.7], [27.5, 30.3]];
  function shotCam(k, u) {
    const sh = shots[k];
    const drift = lerp(0.45, -0.45, u);
    const D = sh.D * lerp(1.04, 0.96, u);
    const pos = sh.C.clone().addScaledVector(sh.n, D * 1.1).addScaledVector(sh.tan, drift).add(new THREE.Vector3(0, 0.25 + 0.1 * u, 0));
    const look = sh.C.clone().addScaledVector(sh.tan, sh.shift + drift * 0.25);
    return { pos, look };
  }
  function camera(Tg) {
    if (Tg < 19 || Tg > 31) return null;
    let k = 0;
    for (let i = 0; i < 3; i++) if (Tg >= W[i][0]) k = i;
    let cam;
    if (Tg < W[0][0]) cam = shotCam(0, 0);
    else if (Tg <= W[k][1]) cam = shotCam(k, seg(Tg, W[k][0], W[k][1]));
    else if (k < 2) {
      const e = E.inOut(seg(Tg, W[k][1], W[k + 1][0]));
      const a = shotCam(k, 1), b = shotCam(k + 1, 0);
      cam = { pos: a.pos.lerp(b.pos, e), look: a.look.lerp(b.look, e) };
      cam.pos.y += Math.sin(e * Math.PI) * 0.6;
    } else cam = shotCam(2, 1);
    const wIn = E.inOut(seg(Tg, 19, 19.9)), wOut = E.inOut(seg(Tg, 30.3, 31));
    return { cam, w: wIn * (1 - wOut) };
  }
  function update(Tg) {
    const vis = E.back(seg(Tg, 18.7, 19.7)) * (1 - E.inOut(seg(Tg, 30.4, 31.1)));
    shots.forEach((sh, i) => {
      sh.dev.visible = vis > 0.001;
      sh.dev.scale.setScalar(Math.max(0.001, vis));
      if (!sh.dev.visible) return;
      const sOwn = seg(Tg, W[i][0] - 0.6, W[i][1] + 0.3);
      const sc = sh.dev.userData.screen;
      sh.draw(sc.userData.g, sOwn);
      sc.userData.tex.needsUpdate = true;
      sh.dev.rotation.z = Math.sin(Tg * 0.6 + i) * 0.015;
    });
    if (phone.visible) {
      const sc = phone.userData.screen;
      drawMobile(sc.userData.g, seg(Tg, W[1][0] - 0.3, W[1][1]));
      sc.userData.tex.needsUpdate = true;
    }
  }
  return { camera, update, windows: W };
}

/* Visuels « après » réutilisables pour les petits panneaux de l'acte II. */
export { img, drawImg, monogram, wood };
