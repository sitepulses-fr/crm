/* SITE PULSE — film 3D (34 s). Tout est une fonction pure du temps t : renderAt(t). */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const W = 1920, H = 1080, DUR = 34;
const BEATS = await (await fetch('beats.json')).json();
await document.fonts.load('46px "Inter Tight"');
await document.fonts.load('500 46px "Inter Tight"');
await document.fonts.load('22px "JetBrains Mono"');
await document.fonts.load('60px "Instrument Serif"');
await document.fonts.load('italic 60px "Instrument Serif"');

/* ---------- utilitaires ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2),
};
const wave = (u) => {
  if (u <= 0 || u >= 1) return 0;
  const g = (m, s, a) => a * Math.exp(-((u - m) * (u - m)) / (2 * s * s));
  return g(0.3, 0.02, 0.36) - g(0.4, 0.012, 0.2) + g(0.46, 0.013, 1) - g(0.52, 0.014, 0.42) + g(0.72, 0.05, 0.13);
};
const lastBeat = (t) => { let b = -99; for (const x of BEATS) if (x <= t) b = x; return b; };
const env = (t, k = 5) => Math.exp(-(t - lastBeat(t)) * k);
const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = (v) => v * v * (3 - 2 * v);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return lerp(lerp(a, b, s(xf)), lerp(c, d, s(xf)), s(yf));
};

const BLUE = new THREE.Color(0x3b7bff), HI = new THREE.Color(0x8fb4ff), RED = new THREE.Color(0xff4f64);

/* ---------- moteur ---------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03050c);
scene.fog = new THREE.FogExp2(0x040918, 0.03);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 400);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.95, 0.55, 0.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight(0x3a5bb0, 0x020409, 0.75));
const sun = new THREE.DirectionalLight(0x9ab8ff, 1.5);
sun.position.set(-14, 22, 12);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x3b7bff, 0.9);
rim.position.set(12, 6, -14);
scene.add(rim);
const towerLight = new THREE.PointLight(0x3b7bff, 0, 26, 1.6);
scene.add(towerLight);

/* ---------- sol ---------- */
const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x040814, roughness: 0.38, metalness: 0.65 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const grid = new THREE.GridHelper(240, 184, 0x16295a, 0x0b1634);
grid.position.y = 0.003;
grid.material.transparent = true;
grid.material.opacity = 0.55;
scene.add(grid);

/* ---------- la ville des concurrents (relief) ---------- */
const S = 1.3, N = 27;
const cells = [];
for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
  if (j === 0) continue;                       // l'avenue du pouls
  const x = i * S, z = j * S, d = Math.hypot(x, z);
  if (d < 5) continue;                          // la place autour de vous
  const n = vnoise(i * 0.22 + 10, j * 0.22 + 4) * 0.7 + hash(i, j) * 0.3;
  let h = 0.12 + Math.pow(n, 2.4) * 7.5;
  if (d < 10) h *= 0.25 + 0.075 * (d - 5);
  if (Math.abs(j) <= 3) h *= 0.3 + 0.15 * (Math.abs(j) - 1);   // un boulevard dégagé
  if (x < -3 && z > 3 && z < 13) h = Math.min(h, 1.1);            // couloir de vol de la caméra
  cells.push({ x, z, d, h0: h, bright: h > 3.2 ? 1 : h > 1.8 ? 0.35 : 0.1, ph: hash(j, i) });
}
const boxG = new THREE.BoxGeometry(0.92, 1, 0.92); boxG.translate(0, 0.5, 0);
const capG = new THREE.BoxGeometry(0.92, 0.045, 0.92);
const cols = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.35 }), cells.length);
const caps = new THREE.InstancedMesh(capG, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), cells.length);
const tmpC = new THREE.Color();
cells.forEach((c, k) => {
  tmpC.setRGB(0.035, 0.07, 0.17).lerp(new THREE.Color(0.08, 0.14, 0.33), clamp(c.h0 / 6));
  cols.setColorAt(k, tmpC);
  caps.setColorAt(k, tmpC);
});
scene.add(cols, caps);
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), SC = new THREE.Vector3();

/* ---------- votre entreprise : la tuile, puis la tour ---------- */
const towerMat = new THREE.MeshStandardMaterial({ color: 0x5a6480, roughness: 0.4, metalness: 0.5, emissive: 0x000000 });
const tower = new THREE.Mesh(boxG, towerMat);
scene.add(tower);
const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.92, 1, 0.92).translate(0, 0.5, 0)), new THREE.LineBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0, toneMapped: false }));
scene.add(edges);
const BANDS = 16;
const bands = new THREE.InstancedMesh(new THREE.BoxGeometry(0.96, 0.035, 0.96), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), BANDS);
scene.add(bands);
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.42, 60, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x3b7bff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
scene.add(beacon);

/* ---------- étiquettes (sprites) ---------- */
function textSprite(text, { size = 34, color = '#f3f6ff', font = 'JetBrains Mono', weight = 400, bg = null, pad = 14, h = 0.28 } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `${weight} ${size}px "${font}"`;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  c.width = w; c.height = size + pad * 2;
  g.font = `${weight} ${size}px "${font}"`;
  if (bg) { g.fillStyle = bg; roundRect(g, 0, 0, c.width, c.height, 10); g.fill(); }
  g.fillStyle = color; g.textBaseline = 'middle';
  g.fillText(text, pad, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  sp.scale.set((h * c.width) / c.height, h, 1);
  return sp;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const youLbl = textSprite('VOUS · page 3 · 4 avis', { color: '#ff4f64', size: 30, h: 0.3 });
scene.add(youLbl);
const compLbls = [['#1 · 4,8★ · 312 avis', 0], ['#2 · site pro', 1], ['#3 · Top 3 local', 2]].map(([t, idx]) => {
  const tall = cells.filter((c) => c.h0 > 2.2 && c.d > 10 && c.d < 18 && c.x < -6 && Math.abs(c.z) < 6).sort((a, b) => a.d - b.d)[idx * 2] || cells[idx];
  const s = textSprite(t, { color: '#c9d8ff', size: 26, h: 0.26 });
  s.userData.cell = tall; scene.add(s); return s;
});

/* ---------- la ligne du pouls, posée sur l'avenue ---------- */
function ribbon(nPts, thick) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(nPts * 2 * 3);
  const idx = [];
  for (let i = 0; i < nPts - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x3b7bff, side: THREE.DoubleSide, toneMapped: false, transparent: true }));
  m.frustumCulled = false;
  m.userData = { nPts, thick };
  return m;
}
function setRibbon(m, fn) { // fn(i) -> [x,y,z]
  const p = m.geometry.attributes.position.array, th = m.userData.thick / 2;
  for (let i = 0; i < m.userData.nPts; i++) {
    const [x, y, z] = fn(i);
    p.set([x, y - th, z, x, y + th, z], i * 6);
  }
  m.geometry.attributes.position.needsUpdate = true;
}
const LINE_N = 900, LX0 = -48, LX1 = 48, CW = 3.6;
const line = ribbon(LINE_N, 0.05);
scene.add(line);
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(143,180,255,.8)'); gr.addColorStop(0.55, 'rgba(59,123,255,.18)'); gr.addColorStop(1, 'rgba(59,123,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const heads = Array.from({ length: 6 }, () => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.set(1.1, 1.1, 1); scene.add(s); return s;
});

/* ---------- le scanner ---------- */
const scanG = new THREE.Group();
const sheet = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), new THREE.MeshBasicMaterial({ color: 0x3b7bff, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
sheet.rotation.y = Math.PI / 2; sheet.position.y = 3.25;
const sheetEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(9, 6.5)), new THREE.LineBasicMaterial({ color: 0xbcd2ff, toneMapped: false, transparent: true }));
sheetEdge.rotation.y = Math.PI / 2; sheetEdge.position.y = 3.25;
const beamBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 6.5, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
beamBar.position.y = 3.25;
scanG.add(sheet, sheetEdge, beamBar);
scene.add(scanG);

/* ---------- les 4 panneaux : Google, site, Instagram, recherche ---------- */
const SEV = { r: '#ff4f64', o: '#ff9442', y: '#ffd23f', b: '#3b7bff' };
const PANELS = [
  { kind: 'google', marks: [[40, 84, 820, 150, 'o', 'Aucune photo', '24 photos pro'], [34, 372, 520, 60, 'r', '2,1★ · 4 avis', '4,8★ · 127 avis'], [34, 452, 600, 112, 'y', 'Fiche incomplète', 'Fiche complète']] },
  { kind: 'site', marks: [[40, 104, 820, 380, 'r', 'Non adapté au mobile', 'Responsive sur mesure'], [34, 500, 420, 60, 'o', 'Chargement 7,8 s', 'Chargement 0,9 s'], [150, 30, 480, 50, 'y', 'Pas de HTTPS', 'Sécurisé']] },
  { kind: 'social', marks: [[40, 160, 820, 400, 'o', 'Dernier post : il y a 14 mois', '3 posts / semaine'], [34, 34, 560, 100, 'y', 'Identité incohérente', 'Identité unifiée']] },
  { kind: 'serp', marks: [[40, 40, 560, 70, 'o', '0 mot-clé local', '38 mots-clés locaux'], [34, 430, 832, 100, 'r', 'Position #27 · page 3', 'Position #1']] },
];
function drawPanel(P, after, nMarks) {
  const g = P.ctx, w = 900, h = 600;
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(5,10,28,.94)'; roundRect(g, 2, 2, w - 4, h - 4, 26); g.fill();
  g.lineWidth = 3; g.strokeStyle = after ? 'rgba(59,123,255,.95)' : 'rgba(150,175,255,.35)'; g.stroke();
  const T = (txt, x, y, size, color, font = 'Inter Tight', weight = 400, italic = false) => {
    g.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${font}"`; g.fillStyle = color; g.fillText(txt, x, y);
  };
  const mute = '#8a94b8', white = '#f3f6ff', hi = '#8fb4ff';
  g.textBaseline = 'alphabetic';
  if (P.kind === 'google') {
    T('FICHE GOOGLE', 40, 60, 22, mute, 'JetBrains Mono');
    [[40, 380], [432, 200], [644, 216]].forEach(([x, ww], i) => {
      if (after) { const gr = g.createLinearGradient(x, 84, x + ww, 234); gr.addColorStop(0, ['#1c3a86', '#0f1f48', '#13244f'][i]); gr.addColorStop(1, ['#6ea0ff', '#2b5fd9', '#3b7bff'][i]); g.fillStyle = gr; g.fillRect(x, 84, ww, 150); }
      else { g.setLineDash([10, 8]); g.strokeStyle = 'rgba(150,175,255,.35)'; g.lineWidth = 2; g.strokeRect(x, 84, ww, 150); g.setLineDash([]); }
    });
    T('Atelier Morel', 40, 300, 46, white, 'Inter Tight', 500);
    T('Menuiserie · Lyon 7e', 40, 342, 26, mute);
    T(after ? '4,8' : '2,1', 40, 414, 36, white, 'JetBrains Mono');
    for (let s = 0; s < 5; s++) T('★', 120 + s * 36, 414, 32, s < (after ? 5 : 2) ? (after ? hi : '#ffd23f') : 'rgba(150,175,255,.25)');
    T(after ? '(127 avis)' : '(4 avis)', 316, 414, 26, mute, 'JetBrains Mono');
    T(after ? 'Ouvert · ferme à 19:00' : 'Horaires non renseignés', 40, 492, 28, after ? white : mute);
    T(after ? 'atelier-morel.fr' : 'Aucun site web', 40, 546, 28, after ? hi : mute);
    if (after) { g.fillStyle = '#3b7bff'; roundRect(g, 640, 380, 220, 50, 25); g.fill(); T('TOP 3 LOCAL', 668, 414, 22, '#fff', 'JetBrains Mono', 500); }
  } else if (P.kind === 'site') {
    [0, 1, 2].forEach((i) => { g.fillStyle = 'rgba(150,175,255,.3)'; g.beginPath(); g.arc(52 + i * 26, 55, 8, 0, 7); g.fill(); });
    g.strokeStyle = 'rgba(150,175,255,.3)'; g.lineWidth = 2; roundRect(g, 150, 32, 480, 46, 23); g.stroke();
    T(after ? 'https://atelier-morel.fr' : 'http://atelier-morel.wixsite…', 172, 64, 22, after ? hi : mute, 'JetBrains Mono');
    if (!after) {
      g.fillStyle = '#d8d2c4'; g.fillRect(40, 104, 820, 380);
      g.fillStyle = '#f6e27a'; g.fillRect(70, 124, 760, 50);
      g.font = '700 30px "Times New Roman"'; g.fillStyle = '#b0202a'; g.textAlign = 'center'; g.fillText('BIENVENUE SUR NOTRE SITE !!!', 450, 160); g.textAlign = 'left';
      for (let k = 0; k < 18; k++) { g.fillStyle = k % 2 ? '#b9b2a2' : '#c9c2b2'; g.fillRect(80 + k * 18, 200, 18, 220); }
      g.strokeStyle = '#8b8473'; g.lineWidth = 4; g.strokeRect(80, 200, 324, 220);
      g.fillStyle = '#8b7e66'; [240, 270, 300].forEach((y, k) => g.fillRect(450, y, k === 1 ? 220 : 340, 12));
      g.save(); g.translate(460, 360); g.rotate(-0.07); g.fillStyle = '#b0202a'; g.fillRect(0, 0, 230, 48); g.font = '26px "Times New Roman"'; g.fillStyle = '#fff'; g.fillText('En construction', 22, 33); g.restore();
    } else {
      g.fillStyle = '#050a1a'; g.fillRect(40, 104, 820, 380);
      T('AM', 70, 150, 30, white, 'Instrument Serif');
      [600, 670, 740].forEach((x) => { g.fillStyle = 'rgba(243,246,255,.35)'; g.fillRect(x, 136, 50, 6); });
      T("L'art du bois,", 70, 240, 58, white, 'Instrument Serif');
      T('sur mesure.', 70, 300, 58, hi, 'Instrument Serif', 400, true);
      g.fillStyle = '#3b7bff'; roundRect(g, 70, 334, 250, 52, 26); g.fill(); T('Demander un devis', 96, 368, 22, '#fff', 'Inter Tight', 500);
      const gr = g.createLinearGradient(470, 180, 700, 460); gr.addColorStop(0, '#6ea0ff'); gr.addColorStop(1, '#10204a'); g.fillStyle = gr; g.fillRect(470, 180, 230, 270);
      g.strokeStyle = '#f3f6ff'; g.lineWidth = 4; roundRect(g, 730, 190, 110, 220, 20); g.stroke();
      g.fillStyle = '#3b7bff'; g.fillRect(745, 230, 80, 70);
      [320, 340, 360].forEach((y) => { g.fillStyle = 'rgba(243,246,255,.4)'; g.fillRect(745, y, 80, 6); });
    }
    T(after ? 'Chargement 0,9 s' : 'Chargement 7,8 s', 40, 540, 26, after ? white : mute, 'JetBrains Mono');
    T(after ? 'Mobile ✓' : 'Mobile ✕', 720, 540, 26, after ? hi : mute, 'JetBrains Mono');
  } else if (P.kind === 'social') {
    g.beginPath(); g.arc(90, 86, 40, 0, 7);
    if (after) { g.fillStyle = '#13244f'; g.fill(); g.strokeStyle = '#3b7bff'; g.lineWidth = 4; g.stroke(); T('AM', 66, 98, 34, white, 'Instrument Serif'); }
    else { g.setLineDash([8, 6]); g.strokeStyle = 'rgba(150,175,255,.4)'; g.lineWidth = 3; g.stroke(); g.setLineDash([]); }
    T('@ateliermorel', 150, 78, 34, white, 'Inter Tight', 500);
    T(after ? '3 480 abonnés · 146 posts' : '212 abonnés · 9 posts', 150, 116, 24, mute, 'JetBrains Mono');
    const before = ['#3d3a35', '#6b5a3f', '#2a2f38', '#5c4b4b', '#4a4f3a', '#333'];
    for (let k = 0; k < 6; k++) {
      const x = 40 + (k % 3) * 278, y = 160 + Math.floor(k / 3) * 206;
      if (after) {
        const gr = g.createLinearGradient(x, y, x + 264, y + 194);
        const pal = [['#13244f', '#3b7bff'], ['#0b1736', '#0b1736'], ['#1d3b85', '#13244f'], ['#8fb4ff', '#13244f'], ['#f3f6ff', '#f3f6ff'], ['#3b7bff', '#0b1736']][k];
        gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]); g.fillStyle = gr; g.fillRect(x, y, 264, 194);
        if (k === 1) { g.strokeStyle = '#3b7bff'; g.lineWidth = 3; g.strokeRect(x + 2, y + 2, 260, 190); T('AM', x + 96, y + 118, 64, white, 'Instrument Serif'); }
        if (k === 4) T("L'art du bois", x + 38, y + 110, 40, '#0b1736', 'Instrument Serif', 400, true);
      } else { g.fillStyle = before[k]; g.fillRect(x, y, 264, 194); }
    }
  } else {
    g.strokeStyle = 'rgba(150,175,255,.35)'; g.lineWidth = 2; roundRect(g, 40, 40, 560, 70, 35); g.stroke();
    T('G', 66, 87, 30, white, 'Inter Tight', 600); T('menuisier lyon', 106, 86, 28, white, 'JetBrains Mono');
    const you = (y, rank, on) => {
      g.fillStyle = on ? 'rgba(59,123,255,.18)' : 'rgba(255,79,100,.08)'; roundRect(g, 40, y, 820, 92, 14); g.fill();
      g.strokeStyle = on ? '#3b7bff' : 'rgba(255,79,100,.6)'; g.lineWidth = 3; g.stroke();
      T(rank, 66, y + 58, 32, on ? hi : '#ff4f64', 'JetBrains Mono', 500);
      T('Atelier Morel', 170, y + 46, 32, white, 'Inter Tight', 500);
      T('atelier-morel.fr · 4,8★', 170, y + 76, 22, mute, 'JetBrains Mono');
    };
    const skel = (y) => { g.fillStyle = 'rgba(243,246,255,.28)'; g.fillRect(50, y, 430, 14); g.fillStyle = 'rgba(143,180,255,.2)'; g.fillRect(50, y + 28, 260, 10); };
    if (after) { you(140, '#1', true); [260, 340, 420, 500].forEach(skel); }
    else { [150, 230, 310].forEach(skel); T('· · · page 3', 50, 405, 22, '#4a5577', 'JetBrains Mono'); you(430, '#27', false); }
  }
  // marqueurs du diagnostic / de la correction
  P.marks.slice(0, nMarks).forEach(([x, y, ww, hh, sev, tb, ta]) => {
    const col = after ? SEV.b : SEV[sev];
    g.lineWidth = 4; g.strokeStyle = col; roundRect(g, x - 4, y - 4, ww + 8, hh + 8, 8); g.stroke();
    const txt = after ? '✓ ' + ta : tb;
    g.font = '500 22px "JetBrains Mono"'; const tw = g.measureText(txt).width + 24;
    const ty = y - 44 < 4 ? y + hh + 8 : y - 44;
    g.fillStyle = col; roundRect(g, x - 4, ty, tw, 36, 6); g.fill();
    g.fillStyle = after ? '#fff' : '#03050c'; g.fillText(txt, x + 8, ty + 25);
  });
  P.tex.needsUpdate = true;
}
PANELS.forEach((P, i) => {
  const c = document.createElement('canvas'); c.width = 900; c.height = 600;
  P.ctx = c.getContext('2d');
  P.tex = new THREE.CanvasTexture(c); P.tex.colorSpace = THREE.SRGBColorSpace; P.tex.anisotropy = 8;
  P.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.4), new THREE.MeshBasicMaterial({ map: P.tex, color: 0xb0b0b0, transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
  P.ax = -3.45 + i * 2.3;
  P.state = '';
  scene.add(P.mesh);
});

/* ---------- l'écosystème ---------- */
const ECO = ['Google', 'Site web', 'Instagram', 'Avis clients', 'TikTok', 'SEO', 'Facebook', 'Identité visuelle'];
const ECO_LINKS = [[0, 3], [0, 5], [5, 1], [1, 7], [2, 7], [2, 4], [6, 3], [6, 2], [1, 0], [4, 7]];
const nodes = ECO.map((name, i) => {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fb4ff).multiplyScalar(2.2), toneMapped: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.scale.set(1.1, 1.1, 1);
  const lbl = textSprite(name.toUpperCase(), { size: 28, color: '#f3f6ff', h: 0.26 });
  lbl.position.y = 0.42;
  g.add(core, halo, lbl);
  g.userData = { i, lbl };
  scene.add(g);
  return g;
});
const linkGeo = new THREE.BufferGeometry();
linkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ECO_LINKS.length + ECO.length) * 6), 3));
const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ color: 0x5b8fff, transparent: true, opacity: 0, toneMapped: false }));
links.frustumCulled = false;
scene.add(links);
const packets = Array.from({ length: ECO_LINKS.length * 2 }, () => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.set(0.35, 0.35, 1); scene.add(s); return s;
});

/* ---------- onde de choc ---------- */
const shock = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fb4ff).multiplyScalar(2.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
shock.rotation.x = -Math.PI / 2; shock.position.y = 0.05;
const shock2 = shock.clone(); shock2.material = shock.material.clone();
scene.add(shock, shock2);

/* ---------- les clients : flux de lumière vers la tour ---------- */
const NCL = 700;
const clients = [];
{
  const r = rng(77);
  for (let k = 0; k < NCL; k++) {
    const a = r() * Math.PI * 2, d = 10 + r() * 26;
    clients.push({ p0: new THREE.Vector3(Math.cos(a) * d, 0.5 + r() * 3, Math.sin(a) * d), hc: 7 + r() * 9, ts: 21.6 + r() * 5.2, dur: 1.5 + r() * 1.1 });
  }
}
const clGeo = new THREE.BufferGeometry();
clGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NCL * 3), 3));
const clPts = new THREE.Points(clGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.55, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: 0xbcd2ff }));
clPts.frustumCulled = false;
scene.add(clPts);

/* ---------- ECG final, en grand dans le ciel ---------- */
const SKY_N = 700;
const sky = ribbon(SKY_N, 0.07);
scene.add(sky);
const skyHead = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
skyHead.scale.set(1.6, 1.6, 1);
scene.add(skyHead);

/* ---------- caméra : clés + Catmull-Rom ---------- */
const KEYS = [
  [0, [-24, 6.5, 9.5], [-8, 0.6, 0]],
  [4.0, [-11, 3.6, 7.5], [-1.5, 0.7, 0]],
  [6.2, [-4.6, 2.9, 6.4], [0, 1.4, 0]],
  [8.6, [-0.8, 3.0, 7.6], [0, 1.9, 0]],
  [11.2, [1.2, 3.2, 7.4], [0, 1.8, 0]],
  [12.8, [0, 5.4, 9.8], [0, 1.2, 0]],
  [14.8, [3.5, 4.8, 10.5], [0, 3.2, 0]],
  [17.8, [10, 6.2, 3], [0, 4.6, 0]],
  [20.8, [5, 8.2, -9.5], [0, 5.2, 0]],
  [24.2, [-11, 19, -7], [0, 4, 0]],
  [27.2, [-15, 13, 12], [0, 4.5, 0]],
  [30.5, [0, 6.6, 23], [0, 5.6, 0]],
  [34, [0, 6.9, 25], [0, 5.8, 0]],
];
const cr = (p0, p1, p2, p3, u) => {
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
};
function camAt(t) {
  let i = 0;
  while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const k0 = KEYS[Math.max(0, i - 1)], k1 = KEYS[i], k2 = KEYS[i + 1], k3 = KEYS[Math.min(KEYS.length - 1, i + 2)];
  const u = clamp((t - k1[0]) / (k2[0] - k1[0]));
  const f = (idx, c) => cr(k0[idx][c], k1[idx][c], k2[idx][c], k3[idx][c], u);
  return { pos: [f(1, 0), f(1, 1), f(1, 2)], look: [f(2, 0), f(2, 1), f(2, 2)] };
}

/* ---------- surcouche HTML ---------- */
const $ = (id) => document.getElementById(id);
const show = (el, t, a, b, c = 99, d = 99, dy = 24) => {
  const k = seg(t, a, b) * (1 - seg(t, c, d));
  el.style.opacity = k;
  el.style.transform = `translateY(${(1 - E.out(seg(t, a, b))) * dy}px)`;
};
$('c1').style.bottom = '238px';
const chapters = [[0, '00 — Signal'], [5.5, '01 — Diagnostic'], [11.2, '02 — Impulsion'], [14.5, '03 — Transformation'], [21, '04 — Visibilité'], [27.5, '05 — Site Pulse']];
const bpmAt = (t) => (t < 5.5 ? 54 : t < 11.2 ? 66 : t < 12.8 ? 0 : t < 13.4 ? 150 : t < 27 ? 100 : 60);
const notifs = [...document.querySelectorAll('.nt')];

function overlay(t) {
  let ch = chapters[0][1]; for (const [a, c] of chapters) if (t >= a) ch = c;
  $('chap').textContent = ch;
  const bpm = bpmAt(t);
  $('bpm').querySelector('b').textContent = String(bpm).padStart(3, '0');
  $('bpm').classList.toggle('flat', bpm === 0);
  $('bpm').querySelector('i').style.transform = `scale(${1 + env(t, 7) * 0.9})`;
  show($('c1'), t, 1.0, 1.8, 4.8, 5.4);
  show($('c2'), t, 2.6, 3.4, 5.0, 5.6);
  // score
  const sc = $('score');
  const scoreK = seg(t, 6.0, 6.6) * (1 - seg(t, 11.0, 11.4)) + seg(t, 15.2, 15.8) * (1 - seg(t, 20.6, 21.1));
  sc.style.opacity = scoreK;
  let v, st, col;
  if (t < 12) { v = t < 6.6 ? '--' : Math.round(23 * E.out(seg(t, 6.6, 10.2))); st = t < 10.2 ? 'ANALYSE EN COURS' : '10 SIGNAUX FAIBLES'; col = '#ff4f64'; }
  else { v = Math.round(lerp(23, 94, E.inOut(seg(t, 15.6, 19.8)))); st = t < 19.8 ? 'TRANSFORMATION' : 'PRÉSENCE OPTIMISÉE'; col = v < 40 ? '#ff4f64' : v < 70 ? '#ff9442' : '#8fb4ff'; }
  $('scoreV').innerHTML = `${v}<small>/100</small>`;
  $('scoreV').style.color = col;
  $('scoreS').textContent = st; $('scoreS').style.color = col;
  $('flatcap').style.opacity = t > 11.5 && t < 12.78 ? (0.55 + 0.45 * Math.round((Math.sin(t * 9) + 1) / 2)) : 0;
  const fl = t >= 12.8 ? Math.exp(-(t - 12.8) * 3.2) : 0;
  $('flash').style.opacity = fl;
  show($('c3'), t, 13.1, 13.6, 14.6, 15.1);
  show($('c4'), t, 17.4, 18.0, 20.6, 21.1);
  show($('rank'), t, 21.4, 22.0, 27.0, 27.5);
  const rk = Math.max(1, Math.round(27 - 26 * E.inOut(seg(t, 22.0, 25.0))));
  $('rankV').innerHTML = `<span>#</span>${rk}`;
  $('rankV').style.color = rk === 1 ? '#f3f6ff' : '#ff4f64';
  $('rankV').style.textShadow = rk === 1 ? '0 0 50px rgba(59,123,255,.9)' : 'none';
  notifs.forEach((n, i) => {
    const a = 24.6 + i * 0.5;
    const k = seg(t, a, a + 0.45) * (1 - seg(t, 27.0, 27.5));
    n.style.opacity = k;
    n.style.transform = `translateX(${(1 - E.out(seg(t, a, a + 0.45))) * 60}px)`;
  });
  show($('end'), t, 29.2, 30.2, 99, 99, 30);
  $('black').style.opacity = seg(t, 0, 0.6) < 1 ? 1 - seg(t, 0, 0.6) : seg(t, 33.2, 34);
}

/* ---------- rendu d'une image ---------- */
function renderAt(t) {
  const flatW = seg(t, 11.2, 11.6) * (1 - seg(t, 12.75, 12.8));       // signal plat
  const boom = t >= 12.8 ? t - 12.8 : -1;
  const rise = E.inOut(seg(t, 14.6, 18.2));                          // la tour monte
  const towerH = lerp(0.12, 9, rise) + (rise > 0.99 ? Math.sin((t - 18.2) * 1.4) * 0.0 : 0);
  const cityScale = lerp(1, 0.72, E.inOut(seg(t, 21, 24.5)));
  const dimAll = 1 - 0.75 * flatW;

  // caméra
  const cam = camAt(t);
  let sx = 0, sy = 0;
  if (boom >= 0 && boom < 1.6) { const a = 0.32 * Math.exp(-boom * 3); sx = Math.sin(boom * 61) * a; sy = Math.cos(boom * 47) * a; }
  camera.position.set(cam.pos[0] + sx, cam.pos[1] + sy, cam.pos[2]);
  camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);

  // ville
  const e = env(t, 4.5);
  cells.forEach((c, k) => {
    const grow = E.out(seg(t, 0.2 + c.d * 0.035, 1.6 + c.d * 0.035));
    let h = c.h0 * grow * cityScale;
    if (boom >= 0) { const r = boom * 15, A = 1.9 * Math.exp(-boom * 0.6); h += A * Math.exp(-((c.d - r) * (c.d - r)) / 2.2); }
    h = Math.max(0.02, h);
    SC.set(1, h, 1); V3.set(c.x, 0, c.z);
    M4.compose(V3, Q, SC); cols.setMatrixAt(k, M4);
    SC.set(1, 1, 1); V3.set(c.x, h + 0.02, c.z);
    M4.compose(V3, Q, SC); caps.setMatrixAt(k, M4);
    // les concurrents battent pendant que vous êtes à plat
    let b = c.bright * (0.55 + 0.45 * Math.sin(t * 1.3 + c.ph * 6.28));
    if (t < 12.8 && c.bright > 0.5) b *= 1 + e * 1.6;
    if (boom >= 0) { const r = boom * 15; b += 0.6 * Math.exp(-((c.d - r) * (c.d - r)) / 1.5) * Math.exp(-boom * 0.5); }
    b *= lerp(1, 0.45, seg(t, 21, 24)) * dimAll * lerp(1, 0.35, seg(t, 27.5, 30));
    tmpC.copy(BLUE).multiplyScalar(b);
    caps.setColorAt(k, tmpC);
  });
  cols.instanceMatrix.needsUpdate = caps.instanceMatrix.needsUpdate = caps.instanceColor.needsUpdate = true;

  // tour
  tower.scale.set(1, towerH, 1);
  edges.scale.set(1.002, towerH, 1.002);
  edges.material.opacity = seg(t, 14.6, 15.4);
  towerMat.color.set(0x5a6480).lerp(new THREE.Color(0x0b1736), seg(t, 12.8, 14.6));
  const endDim = 1 - 0.7 * seg(t, 28, 30);
  towerMat.emissive.copy(BLUE).multiplyScalar(0.25 * seg(t, 14.6, 16) + 0.4 * env(t, 6) * seg(t, 14, 15));
  for (let k = 0; k < BANDS; k++) {
    const y = 0.5 + k * 0.55;
    const on = y < towerH - 0.1 ? 1 : 0;
    SC.set(on, 1, on); V3.set(0, y, 0); M4.compose(V3, Q, SC); bands.setMatrixAt(k, M4);
    const lit = on * (0.6 + 1.6 * env(t - k * 0.03, 5)) * endDim;
    bands.setColorAt(k, tmpC.copy(BLUE).multiplyScalar(lit));
  }
  bands.instanceMatrix.needsUpdate = true; if (bands.instanceColor) bands.instanceColor.needsUpdate = true;
  towerLight.position.set(0, towerH + 0.6, 0);
  towerLight.intensity = 40 * seg(t, 15, 18) * (1 + 0.6 * env(t, 5));
  beacon.position.set(0, towerH + 30, 0);
  beacon.material.opacity = 0.22 * seg(t, 21.5, 23) * (1 - seg(t, 30, 32)) * (1 + 0.5 * env(t, 4));

  // étiquettes
  youLbl.position.set(0, 0.75, 0.2);
  youLbl.material.opacity = seg(t, 2.6, 3.4) * (1 - seg(t, 6, 6.6));
  compLbls.forEach((s, i) => {
    const c = s.userData.cell;
    s.position.set(c.x, c.h0 * E.out(seg(t, 0.2 + c.d * 0.035, 1.6 + c.d * 0.035)) + 0.45, c.z);
    s.material.opacity = seg(t, 3.0 + i * 0.25, 3.6 + i * 0.25) * (1 - seg(t, 5.4, 6));
  });

  // ligne du pouls
  const amp = t < 11.2 ? 0.85 : t < 12.8 ? 0 : t < 27 ? 1.25 : 0.9;
  const pulses = BEATS.filter((b) => b <= t && (t - b) * 22 < LX1 - LX0 + CW).map((b) => ({ b, front: LX0 + (t - b) * 22 }));
  const yBase = 0.07;
  setRibbon(line, (i) => {
    const x = lerp(LX0, LX1, i / (LINE_N - 1));
    let y = yBase;
    for (const p of pulses) y += wave((p.front - x) / CW) * amp * (p.b === 12.8 ? 2.2 : 1);
    return [x, y, 0];
  });
  line.material.color.copy(BLUE).lerp(RED, flatW).multiplyScalar(lerp(2.2, 1.6, flatW) * (1 - 0.6 * seg(t, 27.5, 29)));
  line.material.opacity = seg(t, 0.3, 1.2);
  heads.forEach((s, k) => {
    const p = pulses[pulses.length - 1 - k];
    if (!p || amp === 0) { s.visible = false; return; }
    const px = p.front - CW * 0.46;
    s.visible = px > LX0 && px < LX1;
    s.position.set(px, yBase + amp * (p.b === 12.8 ? 2.2 : 1), 0);
    s.material.opacity = 0.9 * (1 - seg(t, 27.5, 29));
  });

  // scanner
  const scanK = seg(t, 6.6, 10.2);
  scanG.visible = scanK > 0 && scanK < 1;
  const scanX = lerp(-5, 5, scanK);
  scanG.position.set(scanX, 0, 0.4);

  // panneaux
  PANELS.forEach((P, i) => {
    const after = t >= 12.8;
    let marks;
    if (!after) marks = P.marks.filter((m) => scanX > P.ax - 1.05 + ((m[0] + m[2] / 2) / 900) * 2.1).length;
    else marks = Math.round(P.marks.length * seg(t, 15.4 + i * 0.6, 16.6 + i * 0.6));
    if (t < 6.6) marks = 0;
    const key = `${after}|${marks}`;
    if (P.state !== key) { P.state = key; drawPanel(P, after, marks); }
    let pos, op, sc;
    if (t < 14) {
      const up = E.back(seg(t, 5.7 + i * 0.25, 6.9 + i * 0.25));
      const drop = E.in(seg(t, 11.3, 12.6));
      pos = [P.ax, lerp(0.3, 2.05, up) - drop * 1.3, 0.55 + Math.sin(t * 0.9 + i) * 0.03];
      op = seg(t, 5.7 + i * 0.25, 6.1 + i * 0.25) * (1 - 0.85 * drop) * (1 - seg(t, 12.8, 13.2));
      sc = lerp(0.3, 1, up);
    } else {
      const a = i * (Math.PI / 2) + (t - 14) * 0.32 + 0.6;
      const k = E.out(seg(t, 14.4 + i * 0.2, 15.6 + i * 0.2));
      pos = [Math.cos(a) * 3.3, 3.0 + i * 0.85, Math.sin(a) * 3.3];
      op = k * (1 - seg(t, 21.2, 22.4));
      sc = lerp(0.4, 1, k);
    }
    P.mesh.position.set(...pos);
    P.mesh.scale.setScalar(sc);
    P.mesh.material.opacity = op;
    P.mesh.visible = op > 0.01;
    P.mesh.lookAt(camera.position.x, pos[1] + (camera.position.y - pos[1]) * 0.35, camera.position.z);
  });

  // écosystème
  const ecoIn = (i) => E.back(seg(t, 15.4 + i * 0.12, 16.4 + i * 0.12));
  const pos = [];
  nodes.forEach((n, i) => {
    const a = (i / ECO.length) * Math.PI * 2 + (t - 15) * 0.22;
    const r = 5.3, y = 2.6 + ((i * 3) % 8) * 0.62;
    const k = ecoIn(i);
    n.position.set(Math.cos(a) * r * k, y, Math.sin(a) * r * k);
    const fade = 1 - seg(t, 26.5, 28);
    n.scale.setScalar(Math.max(0.001, k) * fade);
    n.visible = k > 0.001 && fade > 0;
    n.children[1].material.opacity = 0.6 + env(t, 4) * 0.4;
    pos.push(n.position.clone());
  });
  const lp = links.geometry.attributes.position.array;
  let q = 0;
  const linkK = seg(t, 16.6, 17.8) * (1 - seg(t, 26.5, 28));
  ECO_LINKS.forEach(([a, b]) => {
    const A = pos[a], B = pos[b];
    lp.set([A.x, A.y, A.z, lerp(A.x, B.x, linkK), lerp(A.y, B.y, linkK), lerp(A.z, B.z, linkK)], q); q += 6;
  });
  pos.forEach((A) => { lp.set([A.x, A.y, A.z, lerp(A.x, 0, linkK), A.y, lerp(A.z, 0, linkK)], q); q += 6; });
  links.geometry.attributes.position.needsUpdate = true;
  links.material.opacity = 0.75 * linkK;
  const flowK = seg(t, 17.6, 18.4) * (1 - seg(t, 26.5, 27.5));
  packets.forEach((s, k) => {
    const [a, b] = ECO_LINKS[k >> 1];
    const f = (t * 0.45 + (k & 1) * 0.5 + (k >> 1) * 0.13) % 1;
    s.position.lerpVectors(pos[a], pos[b], f);
    s.material.opacity = flowK * Math.sin(f * Math.PI);
    s.visible = flowK > 0;
  });

  // onde de choc
  [shock, shock2].forEach((s, k) => {
    const bt = boom - k * 0.25;
    if (bt < 0 || bt > 3) { s.visible = false; return; }
    s.visible = true;
    s.scale.setScalar(Math.max(0.01, bt * 15));
    s.material.opacity = Math.exp(-bt * 1.1) * (k ? 0.5 : 1);
  });

  // clients
  const cp = clGeo.attributes.position.array;
  const top = new THREE.Vector3(0, towerH + 0.3, 0);
  clients.forEach((c, k) => {
    const u = (t - c.ts) / c.dur;
    if (u < 0 || u > 1) { cp[k * 3 + 1] = -50; return; }
    const ue = E.inOut(u);
    const mx = c.p0.x * 0.45, mz = c.p0.z * 0.45;
    const x = lerp(lerp(c.p0.x, mx, ue), lerp(mx, top.x, ue), ue);
    const y = lerp(lerp(c.p0.y, c.hc, ue), lerp(c.hc, top.y, ue), ue);
    const z = lerp(lerp(c.p0.z, mz, ue), lerp(mz, top.z, ue), ue);
    cp.set([x, y, z], k * 3);
  });
  clGeo.attributes.position.needsUpdate = true;

  // ECG final : son pic culmine au sommet de la tour
  const draw = E.inOut(seg(t, 27.8, 29.6));
  sky.visible = draw > 0;
  const SX0 = -13, SX1 = 13, SB = 5.2;
  const skyY = (x) => SB + wave((x - 0) / 5.2 + 0.46) * 3.9 * (1 + 0.12 * env(t, 4));
  setRibbon(sky, (i) => {
    const x = lerp(SX0, lerp(SX0, SX1, draw), i / (SKY_N - 1));
    return [x, skyY(x), 0.8];
  });
  sky.material.color.copy(BLUE).multiplyScalar(2.4);
  const hx = draw < 1 ? lerp(SX0, SX1, draw) : lerp(SX0, SX1, ((t - 29.6) * 0.45) % 1);
  skyHead.visible = draw > 0;
  skyHead.position.set(hx, skyY(hx), 0.85);

  bloom.strength = 0.95 + (boom >= 0 ? 0.6 * Math.exp(-boom * 2.4) : 0);
  renderer.toneMappingExposure = 1.05 * (1 - 0.5 * flatW);
  scene.fog.density = 0.03 * (1 - 0.35 * seg(t, 21, 24)) + 0.012 * seg(t, 27.5, 30);

  overlay(t);
  composer.render();
}

window.renderAt = renderAt;
window.DUR = DUR;
window.sceneReady = true;
renderAt(9);
