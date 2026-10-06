import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const W = 1080, H = 1920, ASPECT = W / H, FPS = 30;

/* ------------------------------------------------------------------ utils */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const ss = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
const E = {
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  outQuart: t => 1 - Math.pow(1 - t, 4),
  outBack: t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutQuint: t => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
};
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

const NOISE_GLSL = `
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm2(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }
`;

/* --------------------------------------------------------------- renderer */
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').prepend(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const mkRT = () => new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtA = mkRT(), rtB = mkRT();

/* ---------------------------------------------------------- shared assets */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}
// roughcast / stucco bump
const STUCCO = canvasTex(512, 512, (g, w, h) => {
  const r = rng(7); const img = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = 110 + r() * 60; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h, s = 0.6 + r() * 2.4; g.fillStyle = `rgba(${r() < .5 ? 255 : 0},${r() < .5 ? 255 : 0},${r() < .5 ? 255 : 0},0)`; g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
});
// wood grain (u along length)
const WOOD = canvasTex(1024, 128, (g, w, h) => {
  const r = rng(11);
  g.fillStyle = '#b98a57'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const y0 = r() * h, a = 2 + r() * 6, f = 0.004 + r() * 0.01, ph = r() * 6;
    g.strokeStyle = r() < 0.5 ? `rgba(90,52,22,${0.15 + r() * 0.35})` : `rgba(235,195,140,${0.1 + r() * 0.25})`;
    g.lineWidth = 0.6 + r() * 2.2; g.beginPath();
    for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + ph) * a; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 3; i++) { const x = r() * w, y = r() * h; const gr = g.createRadialGradient(x, y, 1, x, y, 14); gr.addColorStop(0, 'rgba(70,38,15,.8)'); gr.addColorStop(1, 'rgba(70,38,15,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 22, 9, 0, 0, 7); g.fill(); }
});
WOOD.colorSpace = THREE.SRGBColorSpace;

function backdrop(top, bottom, glow = '#000000', dir = V3(0, 0.1, -1), pow = 6, horizon = null) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { cT: { value: new THREE.Color(top) }, cB: { value: new THREE.Color(bottom) }, cG: { value: new THREE.Color(glow) }, gD: { value: dir.clone().normalize() }, gP: { value: pow }, cH: { value: new THREE.Color(horizon || bottom) } },
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }`,
    fragmentShader: `uniform vec3 cT,cB,cG,gD,cH; uniform float gP; varying vec3 vD;
      void main(){ float y=vD.y; vec3 c=mix(cB,cH,smoothstep(-.4,0.,y)); c=mix(c,cT,smoothstep(0.,.6,y));
        c+=cG*.6*pow(max(dot(vD,gD),0.),gP); c+=cG*.1*pow(max(dot(vD,gD),0.),gP*.3);
        gl_FragColor=vec4(c,1.); }`,
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), m);
  s.frustumCulled = false; s.renderOrder = -10;
  return s;
}

const dustMats = [];
function dust(n, box, color, size, seed, opacity = 0.7) {
  const r = rng(seed); const p = new Float32Array(n * 3), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) { p[i * 3] = (r() - .5) * box[0] + (box[3] || 0); p[i * 3 + 1] = (r() - .5) * box[1] + (box[4] || 0); p[i * 3 + 2] = (r() - .5) * box[2] + (box[5] || 0); ph[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(color) }, uS: { value: size }, uO: { value: opacity } },
    vertexShader: `attribute float ph; uniform float uT,uS; varying float vA;
      void main(){ vec3 p=position; float t=uT*.35+ph*40.; p+=vec3(sin(t*.7+ph*9.),sin(t*.5+ph*5.)*1.4+uT*.05,cos(t*.6+ph*3.))*.35;
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        gl_PointSize=uS*(0.5+ph)*(600./-mv.z); vA=.4+.6*sin(uT*1.3+ph*30.)*.5+.3; }`,
    fragmentShader: `uniform vec3 uC; uniform float uO; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.0,d); gl_FragColor=vec4(uC*a*vA*uO,1.); }`,
  });
  dustMats.push(m);
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; return pts;
}

// canal (roman) tile: half annulus extruded along z, bulge +y
function tileGeometry(r = 0.3, len = 1.0, th = 0.035, seg = 12) {
  const s = new THREE.Shape();
  for (let i = 0; i <= seg; i++) { const a = Math.PI * i / seg; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  for (let i = seg; i >= 0; i--) { const a = Math.PI * i / seg; s.lineTo(Math.cos(a) * (r - th), Math.sin(a) * (r - th)); }
  let g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: seg });
  g.translate(0, 0, -len / 2);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4); g.computeVertexNormals();
  return g;
}
const TERRACOTTA = ['#b4532e', '#c0643b', '#a8472a', '#c87346', '#9c4226', '#b85d36', '#d0814f'].map(c => new THREE.Color(c));

// layout canal tiles on a plane: x across, z down-slope. returns [{pos, quat, c, row}]
function slopeLayout({ cols, rows, r, len, overlap = 0.78, tilt = 0.07 }) {
  const out = []; const sx = 2 * r, sz = len * overlap; const off = (cols - 1) * sx / 2;
  for (let row = 0; row < rows; row++) {
    const z = row * sz + len / 2;
    for (let c = 0; c < cols; c++) {
      out.push({ pos: V3(c * sx - off, r, z), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, Math.PI)), c: c * 2, row, cover: false });
      if (c < cols - 1) out.push({ pos: V3(c * sx - off + r, r * 0.92, z - 0.04), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)), c: c * 2 + 1, row, cover: true });
    }
  }
  return out;
}

function tileMesh(n, seed, r = 0.3, len = 1.0, mat) {
  const m = new THREE.InstancedMesh(tileGeometry(r, len), mat || new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, envMapIntensity: 0.7 }), n);
  const rr = rng(seed); const c = new THREE.Color();
  for (let i = 0; i < n; i++) { c.copy(TERRACOTTA[(rr() * TERRACOTTA.length) | 0]).multiplyScalar(0.85 + rr() * 0.3); m.setColorAt(i, c); }
  m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
  return m;
}

// sweep a closed 2D profile along a curve; adds attribute "along" (0..1)
function sweep(curve, profile, segs, closed = false) {
  const frames = curve.computeFrenetFrames(segs, closed);
  const np = profile.length; const pos = [], al = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const P = curve.getPointAt(i / segs), N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j < np; j++) { const [px, py] = profile[j]; pos.push(P.x + N.x * px + B.x * py, P.y + N.y * px + B.y * py, P.z + N.z * px + B.z * py); al.push(i / segs); }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < np; j++) {
    const a = i * np + j, b = i * np + (j + 1) % np, c = (i + 1) * np + j, d = (i + 1) * np + (j + 1) % np;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('along', new THREE.Float32BufferAttribute(al, 1));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function gutterProfile(R = 0.32, th = 0.035, seg = 14) {
  const p = [];
  for (let i = 0; i <= seg; i++) { const a = Math.PI + Math.PI * i / seg; p.push([Math.cos(a) * R, Math.sin(a) * R]); }
  p.push([R + th * 1.6, th * 0.6], [R + th * 1.6, th * 2.2], [R - th * 0.4, th * 2.2]);
  for (let i = seg; i >= 0; i--) { const a = Math.PI + Math.PI * i / seg; p.push([Math.cos(a) * (R - th), Math.sin(a) * (R - th)]); }
  p.push([-R - th * 1.6 + th * 2, th * 2.2], [-R - th * 1.6, th * 2.2], [-R - th * 1.6, th * 0.6]);
  return p;
}
function revealMaterial(base, uReveal, glow = new THREE.Color('#ffb27a')) {
  base.onBeforeCompile = sh => {
    sh.uniforms.uReveal = uReveal; sh.uniforms.uGlow = { value: glow };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float along; varying float vAl;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAl=along;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAl; uniform float uReveal; uniform vec3 uGlow;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif(vAl>uReveal) discard;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uGlow*6.*smoothstep(uReveal-0.035,uReveal,vAl)*step(uReveal,0.999);');
  };
  return base;
}

// line segments that draw themselves (attribute ord)
function drawLines(points /* flat [x,y,z,...] pairs */, color, sub = 24) {
  const pos = [], ord = []; const nSeg = points.length / 6; let k = 0; const total = nSeg * sub;
  for (let s = 0; s < nSeg; s++) {
    const a = V3(points[s * 6], points[s * 6 + 1], points[s * 6 + 2]), b = V3(points[s * 6 + 3], points[s * 6 + 4], points[s * 6 + 5]);
    for (let i = 0; i < sub; i++) {
      const p0 = a.clone().lerp(b, i / sub), p1 = a.clone().lerp(b, (i + 1) / sub);
      pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z); ord.push(k / total, k / total); k++;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('ord', new THREE.Float32BufferAttribute(ord, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uR: { value: 0 }, uA: { value: 1 }, uC: { value: new THREE.Color(color) } },
    vertexShader: `attribute float ord; varying float vO; void main(){ vO=ord; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uR,uA; uniform vec3 uC; varying float vO; void main(){ if(vO>uR) discard; float head=smoothstep(uR-.04,uR,vO); gl_FragColor=vec4(uC*(1.2+head*6.)*uA,1.); }`,
  });
  const l = new THREE.LineSegments(g, m); l.frustumCulled = false; return l;
}

function beam(a, b, w, h, mat) {
  const d = b.clone().sub(a); const len = d.length();
  const geo = new THREE.BoxGeometry(len, h, w);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 2.5);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V3(1, 0, 0), d.normalize());
  m.castShadow = m.receiveShadow = true;
  return m;
}

function stdLights(scene, { key = '#ffffff', keyI = 3, keyPos = V3(5, 8, 5), fill = '#88a0c8', fillI = 0.4, ground = '#1a120c', rim = null, rimI = 2, rimPos = V3(-6, 4, -6), shadow = 0, shadowBox = 12, target = V3(0, 0, 0) } = {}) {
  const k = new THREE.DirectionalLight(key, keyI); k.position.copy(keyPos); k.target.position.copy(target); scene.add(k, k.target);
  if (shadow) {
    k.castShadow = true; k.shadow.mapSize.set(shadow, shadow); const c = k.shadow.camera;
    c.left = c.bottom = -shadowBox; c.right = c.top = shadowBox; c.near = 0.5; c.far = 80; k.shadow.bias = -0.0004; k.shadow.normalBias = 0.02; k.shadow.radius = 3;
  }
  scene.add(new THREE.HemisphereLight(fill, ground, fillI));
  if (rim) { const r = new THREE.DirectionalLight(rim, rimI); r.position.copy(rimPos); scene.add(r); }
  return k;
}

/* =============================================================== TYPOGRAPHY */
const FONT = new Font(await new Promise((res, rej) => new TTFLoader().load('fonts/Syne-800.ttf', res, undefined, rej)));
await document.fonts.load('800 100px Syne'); await document.fonts.load('400 40px Inter');
const RES = FONT.data.resolution;
const IDQ = new THREE.Quaternion();
const gcache = new Map();
const hasGlyph = ch => !!FONT.data.glyphs[ch];
function glyphGeo(ch, size, depth) {
  const key = ch + '|' + size + '|' + depth;
  if (gcache.has(key)) return gcache.get(key);
  const g = new TextGeometry(ch, { font: FONT, size, depth, curveSegments: 10, bevelEnabled: true, bevelThickness: depth * 0.16, bevelSize: size * 0.016, bevelSegments: 3 });
  g.computeBoundingBox(); const bb = g.boundingBox; const c = new THREE.Vector3(); bb.getCenter(c);
  g.translate(-c.x, -c.y, -c.z);
  const rec = { g, c, w: bb.max.x - bb.min.x, h: bb.max.y - bb.min.y, d: bb.max.z - bb.min.z };
  gcache.set(key, rec); return rec;
}
const adv = (ch, size) => ((FONT.data.glyphs[ch] || FONT.data.glyphs['-']).ha * size) / RES;

function makeText(lines, { size = 1.6, depth = 0.45, lineH = 1.08, tracking = 0.0, maxW = 16, mat }) {
  const group = new THREE.Group(); const inner = new THREE.Group(); group.add(inner);
  const letters = []; let idx = 0;
  const widths = lines.map(l => [...l].reduce((a, ch) => a + adv(ch, size) + tracking * size, 0) - tracking * size);
  const sc = Math.min(1, maxW / Math.max(...widths));
  const totalH = (lines.length - 1) * lineH * size;
  lines.forEach((line, li) => {
    let x = -widths[li] / 2; const y = totalH / 2 - li * lineH * size;
    [...line].forEach(ch => {
      if (ch !== ' ' && hasGlyph(ch)) {
        const r = glyphGeo(ch, size, depth);
        const m = new THREE.Mesh(r.g, mat(ch, li, idx));
        m.position.set(x + r.c.x, y + r.c.y, r.c.z);
        m.castShadow = m.receiveShadow = true;
        inner.add(m);
        letters.push({ m, p0: m.position.clone(), li, idx, ch, r });
        idx++;
      }
      x += adv(ch, size) + tracking * size;
    });
  });
  letters.forEach(l => { l.n = idx; l.k = idx > 1 ? l.idx / (idx - 1) : 0; });
  inner.position.y = -size * 0.36;
  group.scale.setScalar(sc);
  return { group, inner, letters, sc };
}

function textCanvas(txt, { px = 220, color = '#ffffff', stroke = 0, weight = 800, family = 'Syne', pad = 0.25, ls = 0 }) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const font = `${weight} ${px}px ${family}`; g.font = font;
  if (ls) g.letterSpacing = ls + 'px';
  const w = Math.ceil(g.measureText(txt).width + px * pad * 2);
  c.width = Math.min(w, 16000); c.height = Math.ceil(px * 1.35);
  g.font = font; if (ls) g.letterSpacing = ls + 'px'; g.textBaseline = 'middle';
  if (stroke) { g.lineWidth = stroke; g.strokeStyle = color; g.strokeText(txt, px * pad, c.height / 2 + px * 0.04); }
  else { g.fillStyle = color; g.fillText(txt, px * pad, c.height / 2 + px * 0.04); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { tex, aspect: c.width / c.height };
}
function textPlane(txt, { h = 4, opacity = 0.1, add = false, tint = '#ffffff', ...o } = {}) {
  const { tex, aspect } = textCanvas(txt, o);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(tint), transparent: true, opacity, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));
  return m;
}

/* ======================================================================= AD */
const GREEN = new THREE.Color('#44C867');
const Mg = () => new THREE.MeshStandardMaterial({ color: '#12803a', metalness: 0.2, roughness: 0.45, envMapIntensity: 0.3, emissive: '#44C867', emissiveIntensity: 0.85 });
const Mgs = () => new THREE.MeshStandardMaterial({ color: '#1d7a3c', metalness: 0.85, roughness: 0.4 });
const CAMZ = 24;                         // camera distance for all "card" scenes
const PXU = H / (2 * CAMZ * Math.tan(THREE.MathUtils.degToRad(15))); // pixels per world unit at z=0 (~149)

/* ---------- photos + fake depth (for parallax relief) ---------- */
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const PH = {};
async function loadPhoto(key, file, mode) {
  const img = await loadImg(file);
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  // depth map
  const w = 200, h = Math.round(200 * img.height / img.width);
  const d = document.createElement('canvas'); d.width = w; d.height = h; const g = d.getContext('2d'); g.drawImage(img, 0, 0, w, h);
  const id = g.getImageData(0, 0, w, h), px = id.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, r = px[i], gg = px[i + 1], b = px[i + 2], lum = 0.299 * r + 0.587 * gg + 0.114 * b;
    const xx = x / w, yy = y / h;
    const sky = (b > r + 18 && b > gg && lum > 80) || (yy < 0.45 && lum > 214 && Math.abs(r - b) < 30);
    let v;
    if (mode === 'attic') v = Math.min(1, Math.hypot((xx - 0.53) * 0.75, yy - 0.55) * 1.7);
    else if (mode === 'beams') v = sky ? 0.05 : 0.5 + 0.45 * Math.min(1, (1 - yy) * 0.6 + lum / 400);
    else v = sky ? 0.0 : 0.42 + 0.5 * yy;
    px[i] = px[i + 1] = px[i + 2] = Math.round(v * 255); px[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  const d2 = document.createElement('canvas'); d2.width = w; d2.height = h; const g2 = d2.getContext('2d'); g2.filter = 'blur(4px)'; g2.drawImage(d, 0, 0);
  const depth = new THREE.CanvasTexture(d2); depth.generateMipmaps = false; depth.minFilter = THREE.LinearFilter;
  PH[key] = { tex, depth, aspect: img.width / img.height };
}
await Promise.all([['house', 1, 'house'], ['tiles', 2, 'roof'], ['soffit', 3, 'house'], ['gutter', 4, 'house'], ['facade', 5, 'house'], ['attic', 6, 'attic'], ['beams', 7, 'beams']]
  .map(([k, n, m]) => loadPhoto(k, `ads/photos/${n}.jpg`, m)));

const PHOTO_VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const PHOTO_FS = `precision highp float;
uniform sampler2D map, dmap; uniform float uAsp,uImg,uZoom,uLod,uBright,uTintAmt,uAlpha,uRound,uReveal,uSat; uniform vec2 uOff; uniform vec3 uTint,uGreen; uniform int uMode;
varying vec2 vUv;
float h11(float n){ return fract(sin(n*91.345)*47453.5453); }
void main(){
  vec2 uv=vUv; vec2 p=(uv-.5)*vec2(uAsp,1.); vec2 b=vec2(uAsp,1.)*.5;
  vec2 q=abs(p)-b+uRound; float sd=length(max(q,0.))+min(max(q.x,q.y),0.)-uRound;
  float aa=max(fwidth(sd),1e-4); float a=1.-smoothstep(-aa,aa,sd);
  float vis=1., edge=0.; float on=step(.001,uReveal)*step(uReveal,.999);
  if(uMode==1){ float r=length(p)/length(b); float k=uReveal*1.08; vis=1.-smoothstep(k-.012,k,r); edge=exp(-pow((r-k)/.02,2.))*on; }
  else if(uMode==2){ float n=9.; float i=floor(uv.x*n); float pr=clamp((uReveal*1.55-h11(i)*.5)/.55,0.,1.); pr=pr*pr*(3.-2.*pr); float yy=mod(i,2.)<1.?uv.y:1.-uv.y; vis=1.-smoothstep(pr-.004,pr+.004,yy); edge=exp(-pow((yy-pr)/.014,2.))*step(.001,pr)*step(pr,.999); }
  else if(uMode==3){ float x=uv.x*.62+(1.-uv.y)*.38; float k=uReveal*1.3-.15; vis=1.-smoothstep(k-.005,k+.005,x); edge=exp(-pow((x-k)/.014,2.))*on; }
  else if(uMode==4){ float n=14.; float i=floor(uv.y*n); float pr=clamp((uReveal*1.5-h11(i+3.)*.5)/.55,0.,1.); pr=pr*pr*(3.-2.*pr); float xx=mod(i,2.)<1.?uv.x:1.-uv.x; vis=1.-smoothstep(pr-.004,pr+.004,xx); edge=exp(-pow((xx-pr)/.014,2.))*step(.001,pr)*step(pr,.999); }
  vec2 s=vec2(1.); if(uAsp>uImg) s.y=uImg/uAsp; else s.x=uAsp/uImg;
  vec2 tuv=(uv-.5)*s/uZoom+.5;
  float dd=texture2D(dmap,tuv).r; tuv+=uOff*(dd-.5);
  vec3 c=textureLod(map,tuv,uLod).rgb;
  c=mix(vec3(dot(c,vec3(.299,.587,.114))),c,uSat);
  c*=uBright;
  c=mix(c,uTint*(.35+dot(c,vec3(.33))*1.2),uTintAmt);
  c+=uGreen*edge;
  float al=a*clamp(vis+edge,0.,1.)*uAlpha; if(al<.004) discard;
  gl_FragColor=vec4(c,al);
}`;
function photoMat(p, o = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: true, vertexShader: PHOTO_VS, fragmentShader: PHOTO_FS,
    uniforms: {
      map: { value: p.tex }, dmap: { value: p.depth }, uAsp: { value: 1 }, uImg: { value: p.aspect }, uOff: { value: new THREE.Vector2() },
      uZoom: { value: o.zoom || 1 }, uLod: { value: o.lod || 0 }, uBright: { value: o.bright ?? 1.2 }, uTint: { value: new THREE.Color(o.tint || '#06150c') }, uTintAmt: { value: o.tintAmt || 0 },
      uAlpha: { value: 1 }, uRound: { value: o.round || 0 }, uReveal: { value: 1 }, uMode: { value: o.mode || 0 }, uGreen: { value: GREEN.clone().multiplyScalar(2.6) }, uSat: { value: o.sat ?? 1.12 },
    },
  });
}
function roundedShape(w, h, r, s = new THREE.Shape()) {
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0); s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI); s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5); return s;
}
const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 8, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();

function makeCard(p, { w = 5.63, h = 6.7, r = 0.3, depth = 0.24, zoom = 1, mode = 0, frame = true, shadow = true, back = false } = {}) {
  const g = new THREE.Group();
  const mat = photoMat(p, { round: r / h, zoom, mode, bright: 1.2 }); mat.uniforms.uAsp.value = w / h;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); front.position.z = depth + 0.04; g.add(front);
  const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedShape(w, h, r), { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2, curveSegments: 18 }), Mgs());
  slab.castShadow = true; g.add(slab);
  if (back) { const bm = photoMat(p, { round: r / h, zoom, bright: 0.85 }); bm.uniforms.uAsp.value = w / h; const bk = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bm); bk.rotation.y = Math.PI; bk.position.z = -0.035; g.add(bk); }
  let fr = null, sh = null;
  if (frame) {
    const s = roundedShape(w, h, r); const hole = roundedShape(w - 0.09, h - 0.09, r - 0.04, new THREE.Path()); s.holes.push(hole);
    fr = new THREE.Mesh(new THREE.ShapeGeometry(s, 18), new THREE.MeshBasicMaterial({ color: GREEN.clone().multiplyScalar(2.4), transparent: true }));
    fr.position.set(-0.3, -0.3, -0.35); g.add(fr);
  }
  if (shadow) {
    sh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.55, h * 1.45), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.7 }));
    sh.position.set(0.3, -0.5, -0.9); g.add(sh);
  }
  return { group: g, mat, front, slab, frame: fr, shadow: sh, w, h };
}

function adBase({ seed = 1, glow = '#0f3a22', num = null, numPos = V3(-2.4, 4.0, 1.3), numRot = 0.2, bgPhoto = null, bgZoom = 1.25, bgLod = 3.2, bgBright = 0.55, bgTint = 0.4 } = {}) {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = 0.7;
  scene.add(backdrop('#030806', '#020403', glow, V3(0, -0.25, -1), 4, '#04100a'));
  scene.fog = new THREE.Fog('#030806', 36, 90);
  const cam = new THREE.PerspectiveCamera(30, ASPECT, 0.1, 1000);
  stdLights(scene, { key: '#ffffff', keyI: 2.4, keyPos: V3(-5, 8, 12), fill: '#7fa890', fillI: 0.4, rim: '#44C867', rimI: 3.4, rimPos: V3(7, 3, -5) });
  let bg = null;
  if (bgPhoto) {
    const m = photoMat(PH[bgPhoto], { zoom: bgZoom, lod: bgLod, bright: bgBright, tint: '#06150c', tintAmt: bgTint, sat: 0.9 }); const bw = 11.8, bh = 21;
    m.uniforms.uAsp.value = bw / bh; bg = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), m); bg.position.set(0, 0, -8); scene.add(bg);
  }
  let numT = null;
  if (num) {
    numT = makeText([num], { size: 0.85, depth: 0.4, maxW: 9, mat: () => [Mg(), Mgs()] });
    numT.group.position.copy(numPos); scene.add(numT.group);
  }
  scene.add(dust(520, [16, 22, 14, 0, 0, 3], '#9af2b4', 0.05, seed, 0.85));
  return { scene, cam, bg, numT, numRot };
}
function sway(base, t, dur, { x = 1, y = 0.5 } = {}) {
  const c = E.inOutSine(inv(0, dur, t));
  base.cam.position.set(lerp(-x, x, c), lerp(y * 0.6, -y, c), CAMZ);
  base.cam.lookAt(0, 0.9, 0);
  const off = V3(base.cam.position.x * 0.016, base.cam.position.y * -0.016, 0);
  base.scene.traverse(o => { if (o.material && o.material.uniforms && o.material.uniforms.uOff) o.material.uniforms.uOff.value.set(off.x, off.y); });
}
function floatCard(card, t, base = { x: 0, y: 1.61, z: 0 }, amp = 1) {
  card.group.position.y = base.y + Math.sin(t * 1.3) * 0.06 * amp;
}

const shots = [];
function shot(id, dur, build) { shots.push({ id, dur, ...build() }); }

/* ---- INTRO: iris reveal of the house, focus pull, logo letters fly in ---- */
shot('intro', 4.6, () => {
  const B = adBase({ seed: 2, glow: '#124a2a' });
  const { scene, cam } = B;
  const m = photoMat(PH.house, { zoom: 1.3, lod: 4, bright: 1.05, mode: 1, sat: 1.08 }); const bw = 10.6, bh = 18.8; m.uniforms.uAsp.value = bw / bh;
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), m); bg.position.z = -6; scene.add(bg);
  const T = makeText(['ECO', 'RENOV'], { size: 2.0, depth: 0.8, maxW: 6.1, lineH: 0.98, mat: () => [Mg(), Mgs()] });
  T.group.position.set(0, -1.15, 2); scene.add(T.group);
  const r = rng(3); T.letters.forEach(l => { l.from = V3((r() - .5) * 26, (r() - .5) * 22, -60 - r() * 40); l.q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)); });
  const light = new THREE.PointLight('#8bf0a8', 0, 30, 1.4); light.position.set(0, -2, 8); scene.add(light);
  return {
    scene, cam,
    update(t) {
      m.uniforms.uReveal.value = E.inOutCubic(inv(0.1, 1.9, t));
      m.uniforms.uLod.value = lerp(4, 0, E.outCubic(inv(0.5, 2.6, t)));
      m.uniforms.uZoom.value = lerp(1.36, 1.1, E.outCubic(inv(0, 4.6, t)));
      T.letters.forEach(l => {
        const d = 1.5 + l.idx * 0.1; const p = E.outExpo(inv(d, d + 1.5, t));
        l.m.position.lerpVectors(l.from, l.p0, p); l.m.quaternion.slerpQuaternions(l.q0, IDQ, p); l.m.visible = p > 0.0005;
      });
      light.intensity = 60 * Math.sin(Math.PI * inv(2.4, 3.8, t)) ** 2; light.position.x = lerp(-5, 5, inv(2.4, 3.8, t));
      sway(B, t, 4.6, { x: 0.8, y: 0.4 });
    },
  };
});

/* ---- service scene template ---- */
function svcScene(photo, num, o) {
  const B = adBase({ seed: o.seed, num, bgPhoto: photo, numPos: o.numPos, glow: o.glow });
  const card = makeCard(PH[photo], { mode: o.mode || 0, zoom: o.zoom || 1 });
  card.group.position.set(0, 1.61, 0); B.scene.add(card.group);
  return {
    scene: B.scene, cam: B.cam,
    update(t) {
      const st = { x: 0, y: 1.61, z: 0, rx: 0, ry: 0, rz: 0, reveal: 1, nS: 1 };
      o.enter(t, st);
      card.group.position.set(st.x, st.y + Math.sin(t * 1.3) * 0.07, st.z);
      card.group.rotation.set(st.rx + Math.sin(t * 0.8 + 1) * 0.03, st.ry + Math.sin(t * 0.9) * 0.07, st.rz);
      card.mat.uniforms.uReveal.value = st.reveal;
      if (card.frame) { const fp = E.outExpo(inv(0.5, 1.5, t)); card.frame.material.opacity = fp; card.frame.scale.setScalar(lerp(0.9, 1, fp)); }
      const n = B.numT; const np = E.outBack(inv(o.nIn ?? 0.7, (o.nIn ?? 0.7) + 0.9, t));
      n.group.position.set(o.numPos.x, o.numPos.y + (1 - np) * -6, o.numPos.z); n.group.rotation.set(0.12, -0.25 + Math.sin(t * 0.9) * 0.12 + (1 - np) * 2, B.numRot); n.group.scale.setScalar(Math.max(np, 0.001) * n.sc);
      sway(B, t, o.dur, { x: 1.0, y: 0.5 });
    },
  };
}
const NP = V3(-1.75, 3.95, 1.3);
const NP2 = V3(1.75, 3.95, 1.3);
shot('s1', 3.5, () => svcScene('tiles', '01', { seed: 5, dur: 3.5, numPos: NP, glow: '#154a2a',
  enter: (t, s) => { const p = E.outExpo(inv(0.1, 1.5, t)); s.x = (1 - p) * -9; s.ry = (1 - p) * -1.4; s.rz = (1 - p) * 0.25; } }));
shot('s2', 3.3, () => svcScene('gutter', '02', { seed: 6, dur: 3.3, numPos: NP2, glow: '#0f3d4a',
  enter: (t, s) => { const p = E.outExpo(inv(0.1, 1.4, t)); s.y = 1.61 + (1 - p) * -13; s.rx = (1 - p) * 0.9; s.ry = (1 - p) * 0.4; } }));
shot('s3', 3.3, () => svcScene('soffit', '03', { seed: 7, dur: 3.3, numPos: NP, glow: '#4a3a12',
  enter: (t, s) => { const p = E.outBack(inv(0.1, 1.3, t)); s.y = 1.61 + (1 - p) * 13; s.rz = (1 - p) * -0.7; s.ry = (1 - p) * 0.5; } }));
shot('s4', 3.3, () => svcScene('facade', '04', { seed: 8, dur: 3.3, numPos: NP2, glow: '#2a4a3a', mode: 2,
  enter: (t, s) => { s.reveal = inv(0.1, 1.5, t); s.ry = lerp(-0.35, 0, E.outCubic(inv(0, 1.8, t))); } }));
shot('s5', 3.3, () => svcScene('beams', '05', { seed: 9, dur: 3.3, numPos: NP, glow: '#4a2f12',
  enter: (t, s) => { const p = E.outExpo(inv(0.05, 1.4, t)); s.z = (1 - p) * -45; s.ry = (1 - p) * 2.6; s.y = 1.61 + (1 - p) * 3; } }));
shot('s6', 3.5, () => svcScene('attic', '06', { seed: 10, dur: 3.5, numPos: NP2, glow: '#4a4020', mode: 3,
  enter: (t, s) => { s.reveal = inv(0.1, 1.5, t); const p = E.outBack(inv(0.1, 1.2, t)); s.nS = p; s.ry = lerp(0.4, 0, E.outCubic(inv(0, 1.6, t))); } }));

/* ---- COLLAGE: ring of all the photos ---- */
shot('col', 3.8, () => {
  const B = adBase({ seed: 12, glow: '#124a2a' });
  const { scene, cam } = B;
  const ring = new THREE.Group(); scene.add(ring); const keys = ['house', 'tiles', 'gutter', 'soffit', 'facade', 'beams', 'attic'];
  const R = 7.6; const cards = keys.map((k, i) => {
    const c = makeCard(PH[k], { w: 3.1, h: 4.1, r: 0.22, depth: 0.16, frame: false, shadow: false, back: true });
    const th = (i / keys.length) * Math.PI * 2; c.th = th; c.group.position.set(Math.sin(th) * R, 0, Math.cos(th) * R); c.group.rotation.y = th; ring.add(c.group); return c;
  });
  ring.rotation.x = 0.1;
  const torus = new THREE.Mesh(new THREE.TorusGeometry(R, 0.035, 8, 200), new THREE.MeshBasicMaterial({ color: GREEN.clone().multiplyScalar(2.2) })); torus.rotation.x = Math.PI / 2; torus.position.y = -2.7; ring.add(torus);
  const torus2 = torus.clone(); torus2.position.y = 2.7; ring.add(torus2);
  return {
    scene, cam,
    update(t) {
      const sp = E.inOutCubic(inv(0, 3.8, t));
      ring.rotation.y = -0.4 + t * 0.75 + (1 - E.outExpo(inv(0, 1.6, t))) * 2.4;
      const e = E.outExpo(inv(0.05, 1.4, t));
      ring.scale.setScalar(lerp(0.2, 1, e)); ring.position.y = 0.5;
      cards.forEach((c, i) => { c.group.position.y = Math.sin(t * 1.4 + i * 1.3) * 0.2; });
      cam.position.set(Math.sin(t * 0.5) * 1.0, lerp(3.2, 1.2, sp), CAMZ + 2); cam.lookAt(0, 0.5, 0);
    },
  };
});

/* ---- OUTRO: logo, slot-machine phone number, CTA ---- */
shot('outro', 6.0, () => {
  const B = adBase({ seed: 14, glow: '#124a2a', bgPhoto: 'house', bgZoom: 1.2, bgLod: 2.6, bgBright: 0.5, bgTint: 0.45 });
  const { scene, cam } = B;
  const TEL = ['06 12 19', '14 68']; const size = 1.2;
  const T = makeText(TEL, { size, depth: 0.55, maxW: 5.6, lineH: 1.12, tracking: 0.03, mat: () => [Mg(), Mgs()] });
  T.group.position.set(0, 0.95, 1); scene.add(T.group);
  const digits = '0123456789'.split('').map(d => glyphGeo(d, size, 0.55));
  T.letters.forEach((l, i) => { l.target = +l.ch; l.spins = 12 + i * 3; });
  const light = new THREE.PointLight('#8bf0a8', 0, 30, 1.4); light.position.set(0, 0, 8); scene.add(light);
  return {
    scene, cam,
    update(t) {
      T.letters.forEach((l, i) => {
        const p = inv(1.3 + i * 0.08, 2.9 + i * 0.1, t); const e = E.outCubic(p); const roll = l.spins * (1 - e);
        const rec = digits[(((l.target + Math.floor(roll)) % 10) + 10) % 10]; if (l.m.geometry !== rec.g) l.m.geometry = rec.g;
        const fr = roll % 1; l.m.position.set(l.p0.x, l.p0.y + fr * 0.5 * (p < 1 ? 1 : 0), l.p0.z); l.m.rotation.set(-fr * 1.2, 0, 0);
        const vis = inv(1.1 + i * 0.05, 1.4 + i * 0.05, t); l.m.scale.set(1, lerp(0.001, 1, E.outCubic(vis)) * (1 + (1 - e) * 0.25), 1); l.m.visible = vis > 0;
      });
      light.intensity = 70 * Math.sin(Math.PI * inv(3.0, 4.2, t)) ** 2; light.position.x = lerp(-6, 6, inv(3.0, 4.2, t));
      B.bg.material.uniforms.uZoom.value = lerp(1.25, 1.1, E.outCubic(inv(0, 6, t)));
      sway(B, t, 6, { x: 0.9, y: 0.4 });
    },
  };
});

/* ---------------------------------------------------------------- timeline */
const TR = 0.7;
const TMODES = [0, 4, 1, 3, 0, 2, 4, 1];
let acc = 0;
shots.forEach(s => { s.start = acc; s.end = acc + s.dur; acc += s.dur - TR; });
const TOTAL = shots[shots.length - 1].end;
window.TOTAL = TOTAL; window.FPS = FPS;
window.TIMELINE = shots.map(s => ({ id: s.id, start: s.start, end: s.end }));
/* ------------------------------------------------------------- compositor */
const compMat = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, tB: { value: null }, p: { value: 0 }, mode: { value: -1 }, aspect: { value: ASPECT } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `precision highp float;
  uniform sampler2D tA,tB; uniform float p, aspect; uniform int mode; varying vec2 vUv;
  #define PI 3.14159265
  ${NOISE_GLSL}
  const vec3 COPPER=vec3(.27,.78,.4);
  float eio(float x){ return x<.5?4.*x*x*x:1.-pow(-2.*x+2.,3.)/2.; }
  vec3 zb(sampler2D t, vec2 uv, float amt){ vec3 c=vec3(0.); for(int i=0;i<14;i++){ float f=float(i)/13.; vec2 u=.5+(uv-.5)*(1.-amt*f);
      c+=vec3(texture2D(t,.5+(u-.5)*(1.+amt*.04)).r, texture2D(t,u).g, texture2D(t,.5+(u-.5)*(1.-amt*.04)).b); } return c/14.; }
  void main(){
    vec2 uv=vUv; vec3 col;
    if(mode<0){ col=texture2D(tA,uv).rgb; }
    else if(mode==0){ // zoom punch
      float e=eio(p), k=sin(p*PI); vec2 c=uv-.5;
      vec2 ua=.5+c/(1.+e*1.4), ub=.5+c/(1.+(1.-e)*0.7);
      vec3 a=zb(tA,ua,k*.35), b=zb(tB,ub,k*.35);
      col=mix(a,b,smoothstep(.42,.58,p)) + vec3(1.,.8,.65)*pow(k,10.)*0.15;
    }
    else if(mode==1){ // tile flip
      vec2 g=vec2(9.,16.); vec2 cell=floor(uv*g); vec2 lc=fract(uv*g)-.5;
      float d=cell.x/g.x*.65+(1.-cell.y/g.y)*.35; float rr=h21(cell)*.18;
      float cp=clamp((p*1.55-d*1.05-rr)/.4,0.,1.); float ce=eio(cp);
      float s=cos(ce*PI), as=max(abs(s),1e-3);
      vec2 l2=vec2(lc.x*(1.+(1.-as)*.25), lc.y/as);
      if(abs(l2.y)>.5){ col=vec3(0.006); }
      else {
        vec2 su=(cell+.5+l2)/g;
        col= s>0. ? texture2D(tA,su).rgb : texture2D(tB,su).rgb;
        col*=mix(.35,1.,as);
        col+=COPPER*smoothstep(.38,.5,abs(l2.y))*(1.-as)*3.;
      }
      float gap=(1.-step(.47,max(abs(lc.x),abs(lc.y))))+step(cp,0.)+step(1.,cp);
      col*=mix(.15,1.,clamp(gap,0.,1.));
    }
    else if(mode==2){ // fbm dissolve with burning copper edge
      vec2 q=vec2(uv.x*aspect,uv.y);
      float n=.62*fbm2(q*2.6)+.38*(1.-uv.x*.6-uv.y*.4);
      float th=mix(1.15,-0.15,eio(p)); float w=.07;
      float mb=smoothstep(th+.012,th-.012,n);
      mb=1.-mb;
      float ed=1.-smoothstep(0.,w,abs(n-th));
      vec2 dp=(vec2(fbm2(q*5.+3.),fbm2(q*5.+9.))-.5)*ed*.06;
      vec3 a=texture2D(tA,uv+dp).rgb, b=texture2D(tB,uv-dp*.5).rgb;
      col=mix(a,b,mb)+COPPER*pow(ed,3.)*4.*step(.001,p)*step(p,.999);
    }
    else if(mode==3){ // slats
      float N=16.; float i=floor(uv.y*N);
      float sp=clamp((p*1.45-(i/N)*.45),0.,1.); float off=eio(sp);
      float dir=mod(i,2.)<1.?1.:-1.;
      vec2 ua=uv+vec2(off*dir,0.), ub=uv+vec2((off-1.)*dir,0.);
      float vel=sin(sp*PI)*.06;
      vec3 a=vec3(0.),b=vec3(0.);
      for(int k=0;k<8;k++){ float f=(float(k)/7.-.5)*vel; a+=texture2D(tA,ua+vec2(f,0.)).rgb; b+=texture2D(tB,ub+vec2(f,0.)).rgb; }
      a/=8.; b/=8.;
      bool inB = ub.x>=0. && ub.x<=1.;
      col= inB ? b : a;
      float bd=dir>0.? abs(ub.x-0.) : abs(ub.x-1.);
      col+=COPPER*exp(-bd*90.)*2.*sin(sp*PI);
      col*=1.-smoothstep(.0,.006,abs(fract(uv.y*N)-.0))*0.+ (1.-step(.012,fract(uv.y*N)))*-.8*sin(sp*PI);
    }
    else { // diagonal blade
      float x=(uv.x*aspect+uv.y*.55)/(aspect+.55);
      float e=eio(p); float pos=mix(-.12,1.12,e);
      float mb=smoothstep(pos+.003,pos-.003,x);
      vec2 ua=uv+vec2(-.06*e,0.), ub=uv+vec2(.06*(1.-e),0.);
      vec3 a=texture2D(tA,ua).rgb, b=texture2D(tB,ub).rgb;
      col=mix(a,b,mb);
      float dd=abs(x-pos);
      col+=COPPER*exp(-dd*55.)*2.2+vec3(1.,.9,.8)*exp(-dd*500.)*3.;
    }
    gl_FragColor=vec4(col,1.);
  }`,
});

const gradeMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, aspect: { value: ASPECT }, uFade: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT, aspect, uFade; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 uv=vUv; vec2 c=uv-.5; float r2=dot(c,c);
      vec3 col=vec3(texture2D(tDiffuse,uv-c*r2*.012).r, texture2D(tDiffuse,uv).g, texture2D(tDiffuse,uv+c*r2*.012).b);
      float v=smoothstep(1.05,.25,length(c*vec2(1.25,1.)));
      col*=mix(.5,1.,v);
      col=mix(col, col*col*(3.-2.*col), .25);
      col+=(h(uv*1000.+fract(uT*7.3))-.5)*.045;
      col*=1.-uFade;
      gl_FragColor=vec4(col,1.); }`,
});

const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
const compPass = new ShaderPass(compMat, 'nope');
composer.addPass(compPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.38, 0.5, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const gradePass = new ShaderPass(gradeMat);
composer.addPass(gradePass);


/* ------------------------------------------------------------------- DOM */
const $ = s => document.querySelector(s);
function split(el) {
  const txt = el.textContent; el.textContent = ''; const out = [];
  txt.split(/(\s+)/).forEach(w => {
    if (!w) return;
    if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(' ')); return; }
    const wd = document.createElement('span'); wd.className = 'wd';
    for (const ch of w) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; wd.appendChild(s); out.push(s); }
    el.appendChild(wd);
  });
  return out;
}
document.querySelectorAll('[data-split]').forEach(el => { el._chars = split(el); });
function charsAnim(chars, t, tIn, tOut, stagger = 0.03, dur = 0.85, outStagger = 0.01) {
  chars.forEach((s, i) => {
    const pi = E.outExpo(inv(tIn + i * stagger, tIn + i * stagger + dur, t));
    const po = E.inCubic(inv(tOut + i * outStagger, tOut + i * outStagger + 0.4, t));
    s.style.transform = `translate3d(0,${((1 - pi) * 115 - po * 115).toFixed(2)}%,0) rotate(${((1 - pi) * 8).toFixed(2)}deg)`;
    s.style.opacity = (Math.min(pi * 1.4, 1) * (1 - po)).toFixed(3);
    const bl = (1 - pi) * 10 + po * 6; s.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : 'none';
  });
}
function lineAnim(el, t, tIn, tOut, dy = 100) {
  const pi = E.outExpo(inv(tIn, tIn + 0.9, t)), po = E.inCubic(inv(tOut, tOut + 0.4, t));
  el.style.transform = `translate3d(0,${((1 - pi) * dy - po * dy).toFixed(2)}%,0)`;
  el.style.opacity = (pi * (1 - po)).toFixed(3);
}
function lnAnim(el, t, tIn, tOut) { el.style.transform = `scaleX(${(E.outExpo(inv(tIn, tIn + 0.8, t)) * (1 - E.inCubic(inv(tOut, tOut + 0.35, t)))).toFixed(3)})`; el.style.transformOrigin = 'left center'; }
function setVis(el, v) { el.style.display = v ? '' : 'none'; }

const SVC = [
  { id: 's1', k: '01 / 06 — Toiture', t: ['Couverture'], s: 'Pose · Rénovation · Nettoyage de toiture' },
  { id: 's2', k: '02 / 06 — Métal', t: ['Zinguerie'], s: 'Gouttières · Descentes · Habillages' },
  { id: 's3', k: '03 / 06 — Finitions', t: ['Dessous', 'de toit'], s: 'Habillage & rénovation des avancées' },
  { id: 's4', k: '04 / 06 — Façade', t: ['Nettoyage', 'de façade'], s: 'Lavage · Démoussage · Peinture' },
  { id: 's5', k: '05 / 06 — Structure', t: ['Traitement', 'de charpente'], s: 'Préventif & curatif · Insectes · Champignons' },
  { id: 's6', k: '06 / 06 — Confort', t: ['Isolation', 'des combles'], s: 'Confort thermique · Matériaux performants' },
];
const svEls = {};
SVC.forEach(c => {
  const el = document.createElement('div'); el.className = 'sv';
  el.innerHTML = `<div class="kick mono"><span class="ln"></span><span class="mask"><span class="ch">${c.k}</span></span></div><h2>${c.t.map(l => `<span class="mask" data-l>${l}</span>`).join('')}</h2><div class="sub"><span class="mask"><span class="ch">${c.s}</span></span></div>`;
  $('#svc').append(el);
  svEls[c.id] = { el, kc: el.querySelector('.kick .ch'), ln: el.querySelector('.ln'), chars: [...el.querySelectorAll('[data-l]')].map(l => split(l)).flat(), sc: el.querySelector('.sub .ch') };
});

function updateDOM(T) {
  const sh = id => shots.find(s => s.id === id);
  { const s = sh('intro'), t = T - s.start, on = T < s.end; setVis($('#intro'), on);
    if (on) { const tOut = s.dur - TR - 0.35; lineAnim($('#i-kick .ch'), t, 2.6, tOut); $('#i-kick').querySelectorAll('.ln').forEach(l => { l.style.transform = `scaleX(${(E.outExpo(inv(2.5, 3.3, t)) * (1 - E.inCubic(inv(tOut, tOut + .35, t)))).toFixed(3)})`; });
      $('#i-sub').querySelectorAll('.ch').forEach((e, i) => lineAnim(e, t, 3.2 + i * 0.12, tOut + 0.05)); } }
  for (const c of SVC) {
    const s = sh(c.id), t = T - s.start, on = T >= s.start && T < s.end, e = svEls[c.id]; setVis(e.el, on); if (!on) continue;
    const tOut = s.dur - TR - 0.35;
    lineAnim(e.kc, t, 0.45, tOut); lnAnim(e.ln, t, 0.35, tOut); charsAnim(e.chars, t, 0.6, tOut + 0.03, 0.03, 0.8); lineAnim(e.sc, t, 1.15, tOut + 0.08);
  }
  { const s = sh('col'), t = T - s.start, on = T >= s.start && T < s.end; setVis($('#col'), on);
    if (on) { const tOut = s.dur - TR - 0.3; $('#c-top').querySelectorAll('.ch').forEach((e, i) => lineAnim(e, t, 0.35 + i * 0.12, tOut));
      $('#c-bot').querySelectorAll('.ch').forEach((e, i) => lineAnim(e, t, 1.1 + i * 0.12, tOut + 0.05)); } }
  const s1 = sh('s1'), cl = sh('col'), ou = sh('outro');
  const hud = ss(s1.start - 0.1, s1.start + 0.6, T) * (1 - ss(ou.start - 0.1, ou.start + 0.5, T));
  $('#hud').style.opacity = hud.toFixed(3);
  $('#shade').style.opacity = (0.35 + 0.65 * ss(sh('intro').end - TR - 0.2, sh('intro').end - 0.1, T) * (1 - 0.55 * ss(cl.start, cl.start + 0.6, T)) * (1 - ss(ou.start, ou.start + 0.5, T))).toFixed(3);
  const idx = clamp(SVC.findIndex(c => T < sh(c.id).end - TR * 0.5) + 1, 1, 6) || 6;
  $('#cnt').textContent = `0${idx} / 06`;
  $('#prog').style.width = (clamp((T - s1.start) / (cl.end - s1.start)) * 100).toFixed(2) + '%';
  { const t = T - ou.start, on = T >= ou.start; setVis($('#outro'), on);
    $('#vig').style.opacity = on ? (ss(0.2, 1.2, t) * 0.8).toFixed(3) : '0';
    if (on) {
      const d1 = E.inOutCubic(inv(0.1, 1.0, t)), d2 = E.inOutCubic(inv(0.4, 1.2, t));
      $('#lg1').style.strokeDasharray = 140; $('#lg1').style.strokeDashoffset = (140 * (1 - d1)).toFixed(2);
      $('#lg2').style.strokeDasharray = 70; $('#lg2').style.strokeDashoffset = (70 * (1 - d2)).toFixed(2);
      const h = [...document.querySelectorAll('#o-logo [data-split]')]; charsAnim(h[0]._chars, t, 0.6, 99, 0.05, 0.9); charsAnim(h[1]._chars, t, 0.75, 99, 0.05, 0.9);
      lineAnim($('#o-call .ch'), t, 1.0, 99); lineAnim($('#o-place .ch'), t, 3.0, 99); lineAnim($('#o-web .ch'), t, 3.2, 99);
      const cp = E.outBack(inv(3.5, 4.3, t)); const cta = $('#cta');
      cta.style.transform = `scale(${(Math.max(cp, 0.001)).toFixed(3)})`; cta.style.opacity = clamp(cp * 2).toFixed(3);
      const pulse = (t - 4.4) % 1.2; cta.style.boxShadow = t > 4.4 ? `0 0 0 ${(pulse * 40).toFixed(1)}px rgba(68,200,103,${(0.55 * (1 - pulse / 1.2)).toFixed(3)})` : 'none';
    } }
}

/* ------------------------------------------------------------------ render */
function renderAt(T) {
  T = clamp(T, 0, TOTAL - 1e-4);
  dustMats.forEach(m => (m.uniforms.uT.value = T));
  const i = shots.findIndex(s => T >= s.start && T < s.end);
  const a = shots[i], b = shots[i + 1];
  a.update(T - a.start);
  renderer.setRenderTarget(rtA); renderer.render(a.scene, a.cam);
  compMat.uniforms.tA.value = rtA.texture;
  if (b && T >= b.start) {
    b.update(T - b.start);
    renderer.setRenderTarget(rtB); renderer.render(b.scene, b.cam);
    compMat.uniforms.tB.value = rtB.texture;
    compMat.uniforms.p.value = (T - b.start) / TR;
    compMat.uniforms.mode.value = TMODES[i % TMODES.length];
  } else compMat.uniforms.mode.value = -1;
  renderer.setRenderTarget(null);
  gradeMat.uniforms.uT.value = T;
  gradeMat.uniforms.uFade.value = 1 - ss(0, 0.5, T);
  composer.render();
  updateDOM(T);
}
window.renderAt = renderAt;
window.renderFrame = f => renderAt(f / FPS);
renderAt(0);
window.__ready = true;
const q = new URLSearchParams(location.search);
if (q.has('t')) renderAt(+q.get('t'));
if (q.has('play')) { const t0 = performance.now(); const loop = () => { renderAt(((performance.now() - t0) / 1000) % TOTAL); requestAnimationFrame(loop); }; loop(); }
