/* SITEPULSE — motion design (40 s). Cartes de verre dans l'espace, traversées caméra,
   flou de mouvement réel (accumulation de sous-images), profondeur de champ, bloom.
   renderAt(t) est une fonction pure du temps. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import * as K from './cards.js';

const W = 1920, H = 1080, PR = window.devicePixelRatio || 1, DUR = 40;
const QS = new URLSearchParams(location.search);
const NSUB = +(QS.get('n') || 6);          // sous-images de flou de mouvement
const SHUTTER = 0.5 / 30;                  // obturateur 180°
for (const f of ['400 40px "Inter Tight"', '500 40px "Inter Tight"', '600 40px "Inter Tight"', '400 40px "JetBrains Mono"', '500 40px "JetBrains Mono"']) await document.fonts.load(f);

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  out5: (t) => 1 - Math.pow(1 - t, 5),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOut5: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  back: (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rng = (s) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

/* ---------- moteur ---------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(PR); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const FW = W * PR, FH = H * PR;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040c);
scene.fog = new THREE.FogExp2(0x02040c, 0.032);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 300);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(FW, FH, { type: THREE.HalfFloatType }));
composer.setPixelRatio(PR); composer.setSize(W, H);
composer.renderToScreen = false;
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 5, aperture: 0.0025, maxblur: 0.012 });
const bloom = new UnrealBloomPass(new THREE.Vector2(FW, FH), 0.55, 0.5, 0.9);
composer.addPass(bloom);
composer.addPass(bokeh);
if (QS.has('nobloom')) bloom.enabled = false;
if (QS.has('nobokeh')) bokeh.enabled = false;
if (QS.has('noglow')) window.NOGLOW = true;

const accum = new THREE.WebGLRenderTarget(FW, FH, { type: THREE.HalfFloatType });
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const accMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: null }, weight: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: 'uniform sampler2D map; uniform float weight; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(map, vUv).rgb * weight, weight); }',
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
  depthTest: false, depthWrite: false, transparent: true,
});
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
const outMat = new THREE.MeshBasicMaterial({ map: accum.texture, depthTest: false, depthWrite: false });
const outScene = new THREE.Scene(); outScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), outMat));

/* ---------- textures partagées ---------- */
function radial(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowTex = radial([[0, 'rgba(90,140,255,.9)'], [0.35, 'rgba(50,100,255,.28)'], [1, 'rgba(30,60,200,0)']]);
const dotTex = radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(170,200,255,.6)'], [1, 'rgba(120,160,255,0)']]);

/* ---------- cartes ---------- */
const U = 1 / 400;
function makeCard(cw, ch, draw, { u = U, glow = 1.0, parent = scene, ghost = false } = {}) {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
  const grp = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cw * u, ch * u), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: true, alphaTest: 0.01 }));
  mesh.userData.main = !ghost;
  mesh.material.color.setScalar(0.74);
  grp.add(mesh);
  let halo = null;
  if (glow) {
    halo = new THREE.Mesh(new THREE.PlaneGeometry(cw * u * 1.9, ch * u * 2.2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.2 * glow }));
    halo.position.z = -0.05; grp.add(halo);
  }
  parent.add(grp);
  const card = { grp, mesh, halo, c, g: c.getContext('2d'), tex, key: null, draw, glow,
    redraw(p, x = 0) { const k = Math.round(p * 300) + '|' + Math.round(x * 60); if (k === card.key) return; card.key = k; draw(card.g, cw, ch, p, x); tex.needsUpdate = true; },
    set(o = 1) { mesh.material.opacity = o; if (halo) halo.material.opacity = 0.2 * glow * o; grp.visible = o > 0.003; },
  };
  return card;
}

/* ---------- stations (une par scène) ---------- */
const SC = [[0, 4], [4, 8], [8, 12], [12, 16], [16, 20], [20, 24], [24, 30], [30, 40]];
const ST = SC.map((_, i) => {
  const g = new THREE.Group();
  g.position.set(i * 24, ((i % 3) - 1) * 3, -i * 18);
  g.rotation.y = [0, 0.15, -0.12, 0.12, -0.18, 0.1, 0, 0][i];
  scene.add(g);
  // grande lueur derrière chaque scène
  const big = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.11 }));
  big.position.set(0, 0, -6); g.add(big);
  g.updateMatrixWorld(true);
  return g;
});
const W2L = (i, v) => ST[i].localToWorld(v.clone());

/* ---------- décor : cartes fantômes + poussière lumineuse ---------- */
{
  const r = rng(9);
  for (let k = 0; k < 70; k++) {
    const i = Math.floor(r() * SC.length);
    const w = 400 + Math.floor(r() * 700), h = 220 + Math.floor(r() * 380);
    const card = makeCard(w, h, (g, cw, ch) => K.ghost(g, cw, ch, 1000 + k), { glow: 0.4, parent: ST[i], ghost: true });
    card.redraw(0);
    const side = r() > 0.5 ? 1 : -1;
    card.grp.position.set(side * (3.6 + r() * 6), (r() - 0.5) * 7, -2 - r() * 12);
    card.grp.rotation.set((r() - 0.5) * 0.3, -side * (0.2 + r() * 0.5), (r() - 0.5) * 0.15);
    card.set(0.42);
  }
  const N = 2600, pos = new Float32Array(N * 3);
  for (let k = 0; k < N; k++) {
    const i = r() * (SC.length - 1);
    const a = Math.floor(i), f = i - a;
    const p = ST[a].position.clone().lerp(ST[Math.min(a + 1, SC.length - 1)].position, f);
    pos.set([p.x + (r() - 0.5) * 30, p.y + (r() - 0.5) * 18, p.z + (r() - 0.5) * 30], k * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ map: dotTex, size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xb8ccff, toneMapped: false })));
}

/* =========================================================================
   SCÈNES
   ========================================================================= */
const S = [];

/* S0 — la question */
{
  const pr = makeCard(1600, 420, K.prompt, { parent: ST[0] });
  pr.grp.position.set(0, 0.3, 0);
  const an = makeCard(1500, 150, K.answer, { parent: ST[0], glow: 1.4 });
  S.push({
    cam: (u) => ({ pos: V(0, 0.18, lerp(5.6, 3.9, E.inOut(u))), look: V(0, 0.05, 0) }),
    focus: V(0, 0.2, 0),
    update(t) {
      pr.redraw(seg(t, 0.55, 2.6)); pr.set(seg(t, 0.1, 0.6));
      pr.grp.rotation.y = lerp(0.25, 0, E.out(seg(t, 0, 2)));
      const a = E.back(seg(t, 2.85, 3.35));
      an.redraw(seg(t, 2.95, 3.8)); an.set(seg(t, 2.85, 3.0));
      an.grp.position.set(0, lerp(-1.4, -0.72, a), 0.2); an.grp.scale.setScalar(Math.max(0.01, lerp(0.7, 1, a)));
    },
  });
}

/* S1 — le site se construit (calques éclatés) */
{
  const layers = K.SITE_LAYERS.map(([name, x, y, w, h], i) => {
    const c = makeCard(w, h, (g, cw, ch) => K.siteLayer(g, name, cw, ch), { parent: ST[1], glow: i === 0 ? 1 : 0 });
    c.redraw(0);
    const r = rng(40 + i);
    c.home = V((x + w / 2 - 840) * U, (520 - (y + h / 2)) * U, i * 0.012);
    c.from = V(c.home.x * 1.6 + (r() - 0.5) * 2.4, c.home.y * 1.6 + (r() - 0.5) * 2, 1.0 + i * 0.42);
    c.rot = V((r() - 0.5) * 0.9, (r() - 0.5) * 1.2, (r() - 0.5) * 0.6);
    return c;
  });
  S.push({
    cam: (u) => ({ pos: V(lerp(2.8, -1.3, E.inOut(u)), lerp(1.1, 0.25, E.inOut(u)), lerp(5.4, 4.5, u)), look: V(0, 0, 0) }),
    focus: V(0, 0, 0.3),
    update(t) {
      layers.forEach((c, i) => {
        const e = E.expo(seg(t, 4.3 + i * 0.17, 5.3 + i * 0.17));
        const spread = 0.06 * seg(t, 6.8, 7.8) * i;
        c.grp.position.lerpVectors(c.from, c.home, e); c.grp.position.z += spread;
        c.grp.rotation.set(c.rot.x * (1 - e), c.rot.y * (1 - e), c.rot.z * (1 - e));
        c.set(seg(t, 4.25 + i * 0.17, 4.45 + i * 0.17));
      });
    },
  });
}

/* S2 — responsive */
{
  const desk = makeCard(1680, 1040, (g, w, h) => K.siteFlat(g, w, h), { parent: ST[2] });
  desk.redraw(0); desk.grp.position.set(-1.25, 0.05, -0.7); desk.grp.rotation.y = 0.38;
  const ph = makeCard(700, 1460, K.phone, { parent: ST[2], u: 1 / 470, glow: 1.2 });
  ph.redraw(0);
  const chips = [['Responsive', 1.6, 1.05, 0.9], ['SSL sécurisé', 2.95, 0.15, 0.5], ['Chargement 0,8 s', 1.9, -1.15, 1.0]].map(([l, x, y, z], k) => {
    const c = makeCard(640, 120, (g, w, h) => K.chip(g, w, h, l, { hot: 0.3 }), { parent: ST[2], glow: 1.2 });
    c.redraw(0); c.home = V(x, y, z); c.k = k; return c;
  });
  S.push({
    cam: (u) => ({ pos: V(lerp(0.2, 1.3, E.inOut(u)), lerp(0.45, 0.0, u), lerp(6.0, 4.9, u)), look: V(lerp(0.2, 0.7, u), 0, 0) }),
    focus: V(1.4, 0, 0.4),
    update(t) {
      desk.set(seg(t, 7.9, 8.2));
      const e = E.back(seg(t, 8.25, 9.35));
      ph.set(seg(t, 8.25, 8.45));
      ph.grp.position.set(lerp(4.5, 1.55, E.out5(seg(t, 8.25, 9.2))), -0.05, lerp(1.2, 0.35, e));
      ph.grp.rotation.set(0, lerp(-1.25, -0.22, e), lerp(0.2, 0, e));
      chips.forEach((c) => {
        const a = E.back(seg(t, 9.5 + c.k * 0.3, 10.0 + c.k * 0.3));
        c.set(seg(t, 9.5 + c.k * 0.3, 9.6 + c.k * 0.3));
        c.grp.position.set(c.home.x, c.home.y + Math.sin(t * 1.4 + c.k) * 0.04, c.home.z);
        c.grp.scale.setScalar(Math.max(0.01, a)); c.grp.rotation.y = -0.2;
      });
    },
  });
}

/* S3 — Google */
{
  const mp = makeCard(1600, 640, K.maps, { parent: ST[3] });
  mp.grp.position.set(0, 0.45, 0);
  const rv = [V(-1.35, -0.95, 0.45), V(0.35, -1.25, 0.85), V(1.85, -0.85, 0.3)].map((home, k) => {
    const c = makeCard(1000, 220, (g, w, h, p) => K.review(g, w, h, k, p), { parent: ST[3], glow: 0.9 });
    c.home = home; c.k = k; return c;
  });
  S.push({
    cam: (u) => ({ pos: V(lerp(-1.2, 0.7, E.inOut(u)), lerp(0.7, -0.15, u), lerp(5.6, 4.7, u)), look: V(0, -0.2, 0) }),
    focus: V(0, 0, 0.3),
    update(t) {
      mp.redraw(seg(t, 12.3, 14.2)); mp.set(seg(t, 11.9, 12.2));
      rv.forEach((c) => {
        const t0 = 13.0 + c.k * 0.38, e = E.out5(seg(t, t0, t0 + 0.7));
        c.redraw(seg(t, t0 + 0.2, t0 + 1.0)); c.set(seg(t, t0, t0 + 0.1));
        c.grp.position.lerpVectors(V(3.6 + c.k, -3.2, 2.6), c.home, e);
        c.grp.rotation.set(lerp(0.9, 0, e), lerp(-0.8, -0.08, e), lerp(0.4, 0, e));
      });
    },
  });
}

/* S4 — SEO : tableau de bord incliné */
{
  const ds = makeCard(1700, 1000, K.dash, { parent: ST[4], glow: 0.8 });
  ds.grp.position.set(0, -0.2, 0); ds.grp.rotation.set(-0.95, 0, 0.3);
  const rk = makeCard(900, 200, K.rank, { parent: ST[4], glow: 1.6 });
  rk.redraw(0);
  S.push({
    cam: (u) => ({ pos: V(lerp(-2.6, 1.7, E.inOut(u)), lerp(0.75, 1.45, u), lerp(2.6, 3.4, u)), look: V(lerp(-0.7, 0.7, E.inOut(u)), lerp(-0.25, 0.1, u), 0) }),
    focus: V(0, -0.2, 0),
    update(t) {
      ds.redraw(seg(t, 16.3, 19.0)); ds.set(seg(t, 15.9, 16.2));
      const a = E.back(seg(t, 18.0, 18.6));
      rk.set(seg(t, 18.0, 18.1)); rk.grp.scale.setScalar(Math.max(0.01, a));
      rk.grp.position.set(1.0, 0.95 + Math.sin(t * 1.3) * 0.03, 0.75); rk.grp.rotation.set(-0.15, -0.25, 0.05);
    },
  });
}

/* S5 — la demande devient un client */
{
  const ib = makeCard(1300, 780, K.inbox, { parent: ST[5] });
  ib.grp.position.set(-2.0, 0, 0); ib.grp.rotation.y = 0.22;
  const cr = makeCard(1560, 760, K.crm, { parent: ST[5] });
  cr.grp.position.set(2.05, 0, -0.3); cr.grp.rotation.y = -0.2;
  const tokens = K.CRM_FIELDS.map(([, v], i) => {
    const c = makeCard(560, 90, (g, w, h) => K.token(g, w, h, v), { parent: ST[5], glow: 1.8 });
    c.redraw(0); c.i = i;
    // départ : la ligne du mail ; arrivée : le champ du CRM (repères locaux des cartes)
    const line = [6, 1, 2, 2, 3, 4][i];
    c.fromL = V((-650 + 60 + 280) * U, (390 - (370 + line * 52 - 12)) * U, 0.05);
    const fx = 430 + (i % 2) * 560 + 265, fy = 310 + Math.floor(i / 2) * 150 + 63;
    c.toL = V((fx - 780) * U, (380 - fy) * U, 0.05);
    return c;
  });
  ST[5].updateMatrixWorld(true);
  tokens.forEach((c) => {
    c.from = ST[5].worldToLocal(ib.grp.localToWorld(c.fromL.clone()));
    c.to = ST[5].worldToLocal(cr.grp.localToWorld(c.toL.clone()));
  });
  S.push({
    cam: (u, t) => {
      const k = E.inOut(seg(t, 21.5, 22.4));
      return { pos: V(lerp(-1.6, 1.75, k), lerp(0.1, 0.2, k), lerp(4.0, 4.3, k) - 0.25 * Math.sin(k * Math.PI)), look: V(lerp(-2.0, 1.95, k), 0, lerp(0, -0.3, k)) };
    },
    focus: null,
    focusAt: (t) => (t < 21.9 ? V(-2.0, 0, 0) : V(2.0, 0, -0.3)),
    update(t) {
      ib.redraw(seg(t, 20.25, 21.3)); ib.set(seg(t, 19.95, 20.25));
      cr.redraw(clamp(0.25 + (t - 22.05) / 1.4, 0, 1)); cr.set(seg(t, 20.0, 20.3));
      tokens.forEach((c) => {
        const t0 = 21.5 + c.i * 0.14, e = E.inOut5(seg(t, t0, t0 + 0.55));
        const on = t > t0 && t < t0 + 0.6;
        c.set(on ? Math.min(1, seg(t, t0, t0 + 0.08)) * (1 - seg(t, t0 + 0.5, t0 + 0.6)) : 0);
        const p = c.from.clone().lerp(c.to, e); p.z += Math.sin(e * Math.PI) * 1.1; p.y += Math.sin(e * Math.PI) * 0.35;
        c.grp.position.copy(p); c.grp.rotation.y = lerp(0.22, -0.2, e);
      });
    },
  });
}

/* S6 — les offres */
{
  const of = [0, 1].map((k) => {
    const c = makeCard(1000, 1080, (g, w, h, p, x) => K.offer(g, w, h, k, p, x), { parent: ST[6], glow: k ? 1.6 : 0.8 });
    c.k = k; return c;
  });
  S.push({
    cam: (u, t) => {
      const a = lerp(-0.42, 0.28, E.inOut(seg(t, 24.35, 27.6)));
      const orbit = V(Math.sin(a) * 6.2, 0.45, Math.cos(a) * 6.2);
      const k = E.inOut(seg(t, 27.6, 29.6));
      return { pos: orbit.lerp(V(1.55, 0.1, 6.1), k), look: V(lerp(0, 1.45, k), 0, lerp(0, 0.3, k)) };
    },
    focus: null,
    focusAt: (t) => (t < 27.6 ? V(0, 0, 0) : V(1.45, 0, 0.3)),
    update(t) {
      of.forEach((c) => {
        const t0 = 24.3 + c.k * 0.4, e = E.back(seg(t, t0, t0 + 0.85));
        c.redraw(seg(t, t0 + 0.2, t0 + 2.2), c.k ? seg(t, 27.6, 28.2) : 0);
        c.set(seg(t, t0, t0 + 0.12));
        c.grp.position.set(c.k ? 1.45 : -1.45, lerp(-0.6, 0, E.out(seg(t, t0, t0 + 0.8))), c.k ? 0.3 : 0);
        c.grp.rotation.set(0, lerp(c.k ? 1.4 : -1.4, c.k ? -0.08 : 0.08, e), 0);
        const pop = c.k ? 1 + 0.05 * E.out(seg(t, 27.7, 28.3)) : 1;
        c.grp.scale.setScalar(pop);
        if (c.halo) c.halo.material.opacity *= c.k ? 1 + seg(t, 27.6, 28.2) : 1;
      });
    },
  });
}

/* S7 — final : tout converge */
{
  const picks = [];
  scene.traverse((o) => { if (o.isMesh && o.userData.main && ST.slice(0, 7).includes(o.parent.parent) && o.parent.parent !== ST[1]) picks.push(o); });
  const ring = picks.map((src, k) => {
    const m = new THREE.Mesh(src.geometry, new THREE.MeshBasicMaterial({ map: src.material.map, color: new THREE.Color(0.62, 0.62, 0.62), transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: true, alphaTest: 0.01 }));
    const s = 1.7 / Math.max(src.geometry.parameters.width, src.geometry.parameters.height);
    m.userData = { k, s, n: picks.length };
    ST[7].add(m); return m;
  });
  const core = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: dotTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  ST[7].add(core);
  S.push({
    cam: (u, t) => ({ pos: V(0, lerp(1.4, 0.4, E.inOut(seg(t, 30.3, 34))), lerp(8.8, 7.0, E.inOut(seg(t, 30.3, 34))) - 0.6 * seg(t, 34, 40)), look: V(0, 0, 0) }),
    focus: V(0, 0, 0),
    update(t) {
      const col = E.inOut5(seg(t, 32.9, 34.0));
      ring.forEach((m) => {
        const { k, s, n } = m.userData;
        const a = (k / n) * Math.PI * 2 + (t - 30) * 0.55 + col * 2.5;
        const R = lerp(4.2, 0, col) * E.out(seg(t, 30.0, 31.0) + 0.0001);
        m.position.set(Math.cos(a) * R, Math.sin(a * 2 + k) * 0.6 * (1 - col) + Math.sin(a) * R * 0.28, Math.sin(a) * R);
        m.lookAt(camera.position);
        m.scale.setScalar(Math.max(0.001, s * (1 - col) * E.out(seg(t, 30.0, 30.8))));
        m.visible = col < 0.999 && t > 30;
      });
      const flash = t >= 34 ? Math.exp(-(t - 34) * 2.6) : 0;
      core.material.opacity = Math.min(1, 0.25 * seg(t, 31, 33) + 0.9 * flash) * (1 - 0.6 * seg(t, 34.6, 35.6));
      core.scale.setScalar(1 + col * 0.6 + flash * 2.2);
    },
  });
}

/* =========================================================================
   CAMÉRA : plans posés + traversées éclair entre stations
   ========================================================================= */
const WHIP_IN = 0.35, WHIP_OUT = 0.22;
function pose(i, t) {
  const [t0, t1] = SC[i];
  const u = seg(t, t0 + WHIP_IN, t1 - WHIP_OUT);
  const p = S[i].cam(u, t);
  return { pos: W2L(i, p.pos), look: W2L(i, p.look) };
}
function camAt(t) {
  for (let j = 1; j < SC.length; j++) {
    const t0 = SC[j][0];
    if (t >= t0 - WHIP_OUT && t < t0 + WHIP_IN) {
      const a = pose(j - 1, t0 - WHIP_OUT), b = pose(j, t0 + WHIP_IN);
      const k = E.inOut5(seg(t, t0 - WHIP_OUT, t0 + WHIP_IN));
      return { pos: a.pos.lerp(b.pos, k), look: a.look.lerp(b.look, k), roll: Math.sin(k * Math.PI) * 0.22 * (j % 2 ? 1 : -1) };
    }
  }
  let i = 0; for (let k = 0; k < SC.length; k++) if (t >= SC[k][0]) i = k;
  return { ...pose(i, t), roll: 0 };
}
function focusAt(t) {
  let i = 0; for (let k = 0; k < SC.length; k++) if (t >= SC[k][0]) i = k;
  const f = S[i].focusAt ? S[i].focusAt(t) : S[i].focus;
  return W2L(i, f);
}

/* ---------- surcouche : typographie cinétique ---------- */
const $ = (id) => document.getElementById(id);
const CAPS = [
  ['cap1', 5.0, 7.75], ['cap2', 9.2, 11.75], ['cap3', 13.0, 15.75], ['cap4', 17.1, 19.75], ['cap5', 22.45, 23.85], ['cap6', 25.1, 27.5],
].map(([id, a, b]) => {
  const el = $(id);
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = el.innerHTML.replace(/(<br>)|([^\s<>]+)/g, (m, br) => (br ? br : `<span class="w">${m}</span>`));
  return { el, a, b, spans: [...el.querySelectorAll('.w')], n: words.length };
});
function overlay(t) {
  CAPS.forEach(({ el, a, b, spans }) => {
    const vis = t > a - 0.1 && t < b + 0.4;
    el.style.display = vis ? 'block' : 'none';
    if (!vis) return;
    spans.forEach((s, k) => {
      const i = E.out5(seg(t, a + k * 0.055, a + k * 0.055 + 0.5));
      const o = E.inOut(seg(t, b - 0.25 + k * 0.02, b + 0.15 + k * 0.02));
      s.style.opacity = i * (1 - o);
      s.style.transform = `translateY(${(1 - i) * 60 - o * 40}px) scale(${lerp(1.25, 1, i)})`;
      s.style.filter = `blur(${(1 - i) * 18 + o * 14}px)`;
    });
  });
  // fin
  const end = $('end');
  const ea = seg(t, 34.15, 35.0);
  end.style.opacity = ea * (1 - seg(t, 39.3, 39.95));
  end.style.transform = `scale(${lerp(1.18, 1, E.out5(ea))})`;
  end.style.filter = `blur(${(1 - E.out5(ea)) * 22}px)`;
  const ln = $('endline');
  ln.style.strokeDashoffset = 1 - E.inOut(seg(t, 34.3, 35.6));
  ['e1', 'e2', 'e3'].forEach((id, k) => { const v = E.out5(seg(t, 35.2 + k * 0.35, 35.9 + k * 0.35)); $(id).style.opacity = v; $(id).style.transform = `translateY(${(1 - v) * 30}px)`; $(id).style.filter = `blur(${(1 - v) * 10}px)`; });
  $('flash').style.opacity = t >= 34 ? Math.exp(-(t - 34) * 3.5) : 0;
  $('black').style.opacity = Math.max(1 - seg(t, 0, 0.5), seg(t, 39.5, 40));
}

/* ---------- rendu d'une image : N sous-images accumulées ---------- */
const HALTON = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
/* Flou adaptatif : beaucoup de sous-images seulement quand ça bouge vite. */
const FAST = [[4.25, 6.1], [8.2, 9.5], [12.95, 14.6], [21.4, 22.7], [24.25, 25.6], [30, 34.3]];
function subframes(t) {
  const a = camAt(t - SHUTTER / 2), b = camAt(t + SHUTTER / 2);
  const d = a.pos.distanceTo(b.pos) + a.look.distanceTo(b.look) * 0.6 + Math.abs(a.roll - b.roll) * 3;
  let n = Math.ceil(d / 0.012);
  if (FAST.some(([x, y]) => t > x && t < y)) n = Math.max(n, 4);
  return Math.max(1, Math.min(NSUB, n));
}
function renderAt(t) {
  renderer.setRenderTarget(accum); renderer.setClearColor(0x000000, 0); renderer.clear();
  const NS = QS.has('fixed') ? NSUB : subframes(t);
  for (let s = 0; s < NS; s++) {
    const ts = NS === 1 ? t : t + ((s + 0.5) / NS - 0.5) * SHUTTER;
    for (const sc of S) sc.update(ts);
    const c = camAt(ts);
    camera.position.copy(c.pos);
    camera.up.set(Math.sin(c.roll), Math.cos(c.roll), 0);
    camera.lookAt(c.look);
    if (NS > 1) camera.setViewOffset(FW, FH, HALTON(s + 1, 2) - 0.5, HALTON(s + 1, 3) - 0.5, FW, FH); else camera.clearViewOffset();
    camera.updateMatrixWorld();
    const fd = camera.position.distanceTo(focusAt(ts));
    bokeh.uniforms.focus.value = fd;
    bokeh.uniforms.aperture.value = ts > 29.9 ? 0.0012 : 0.0028;
    bokeh.uniforms.maxblur.value = 0.011;
    composer.render();
    accMat.uniforms.map.value = composer.readBuffer.texture;
    accMat.uniforms.weight.value = 1 / NS;
    renderer.setRenderTarget(accum); renderer.autoClear = false;
    renderer.render(accScene, ortho);
    renderer.autoClear = true;
  }
  renderer.setRenderTarget(null);
  renderer.render(outScene, ortho);
  overlay(t);
}
window.renderAt = renderAt;
window.subframes = subframes;
window.DUR = DUR;
window.sceneReady = true;
renderAt(2);
