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

const W = 1920, H = 1080, ASPECT = W / H, FPS = 30;

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
const SERVICES = ['COUVERTURE', 'NETTOYAGE DE TOITURE', 'ZINGUERIE', 'DESSOUS DE TOIT', 'NETTOYAGE FAÇADE', 'CHARPENTE', 'ISOLATION DES COMBLES'];
function bgWords(scene, seed, { n = 7, z0 = -30, z1 = -75, opacity = 0.035, speed = 0.6, color = '#ffffff' } = {}) {
  const r = rng(seed); const items = [];
  for (let i = 0; i < n; i++) {
    const p = textPlane(SERVICES[(i + seed) % SERVICES.length], { px: 200, h: 3 + r() * 4, stroke: 3, color, opacity: opacity * (0.6 + r() * 0.6) });
    p.position.set((r() - .5) * 60, (r() < .5 ? -1 : 1) * (9 + r() * 10), lerp(z0, z1, r()));
    scene.add(p); items.push({ p, x0: p.position.x, s: (r() < .5 ? -1 : 1) * speed * (0.5 + r()) });
  }
  return t => items.forEach(it => { it.p.position.x = it.x0 + it.s * t; });
}

const M = {
  cream: () => new THREE.MeshPhysicalMaterial({ color: '#cfc6b8', roughness: 0.42, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.3 }),
  darkSide: () => new THREE.MeshStandardMaterial({ color: '#2a2522', metalness: 0.9, roughness: 0.35 }),
  copper: () => new THREE.MeshStandardMaterial({ color: '#d07a45', metalness: 1, roughness: 0.22 }),
  copperSide: () => new THREE.MeshStandardMaterial({ color: '#6a321a', metalness: 1, roughness: 0.38 }),
  chrome: () => new THREE.MeshStandardMaterial({ color: '#f2f4f7', metalness: 1, roughness: 0.12, envMapIntensity: 1.6 }),
  zinc: () => new THREE.MeshStandardMaterial({ color: '#8a929b', metalness: 1, roughness: 0.3 }),
};

function base(o) {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = o.env ?? 0.5;
  scene.add(backdrop(...o.bg));
  scene.fog = new THREE.Fog(o.fog || '#030405', o.fogN || 30, o.fogF || 90);
  const cam = new THREE.PerspectiveCamera(o.fov || 30, ASPECT, 0.1, 1000);
  const key = stdLights(scene, o.lights || {});
  scene.add(dust(o.dustN || 600, [50, 26, 50, 0, 0, -8], o.dust || '#ffd2a6', 0.05, o.seed || 1, 0.75));
  let num = null;
  if (o.n) { num = textPlane(o.n, { px: 400, h: 15, stroke: 4, opacity: 0.05 }); num.position.set(o.numX ?? 10, 0, -16); scene.add(num); }
  const drift = bgWords(scene, o.seed || 1, o.words || {});
  return { scene, cam, key, num, drift };
}
function lightBar(scene, color = '#ffb070', h = 16, z = -3) {
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.07, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(7), transparent: true, depthWrite: false }));
  bar.position.z = z; scene.add(bar);
  const pl = new THREE.PointLight(color, 0, 22, 1.4); scene.add(pl);
  return (x, a) => { bar.position.x = x; bar.material.opacity = a; pl.position.set(x, 1.5, 4); pl.intensity = 60 * a; };
}

/* ================================================================== SHOTS */
const shots = [];
function shot(id, dur, build) { shots.push({ id, dur, ...build() }); }

/* ---- INTRO : ECO RENOV flies in from depth */
shot('intro', 6.8, () => {
  const { scene, cam, drift } = base({ bg: ['#05070c', '#020203', '#1b2b48', V3(0.3, 0.4, -1), 5, '#070a12'], env: 0.6, seed: 2,
    lights: { key: '#fff1e0', keyI: 1.5, keyPos: V3(-6, 8, 12), fill: '#6f86b8', fillI: 0.3, rim: '#ff8a4a', rimI: 3.2, rimPos: V3(8, 3, -6) } });
  const f = M.cream(), s = M.darkSide(), cf = M.copper(), cs = M.copperSide();
  const T = makeText(['ECO RENOV'], { size: 2.3, depth: 0.75, maxW: 17.5, mat: (ch, li, i) => (i < 3 ? [f, s] : [cf, cs]) });
  scene.add(T.group);
  const r = rng(3);
  T.letters.forEach(l => { l.from = V3((r() - .5) * 34, (r() - .5) * 18, -55 - r() * 50); l.q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)); });
  const sweepL = lightBar(scene);
  return {
    scene, cam,
    update(t) {
      drift(t);
      T.letters.forEach(l => {
        const d = 0.5 + l.idx * 0.12; const p = E.outExpo(inv(d, d + 1.9, t));
        l.m.position.lerpVectors(l.from, l.p0, p); l.m.quaternion.slerpQuaternions(l.q0, IDQ, p);
        l.m.position.y += Math.sin(t * 1.4 + l.idx * 0.7) * 0.06 * ss(3, 4.2, t);
        l.m.visible = p > 0.0005;
      });
      const sw = inv(2.7, 4.7, t); sweepL(lerp(-15, 15, E.inOutCubic(sw)), Math.sin(sw * Math.PI));
      const c = inv(0, 6.8, t);
      cam.position.set(lerp(-4, 1.2, E.inOutSine(c)), lerp(2.2, 0.4, E.inOutSine(c)), lerp(38, 24, E.outCubic(c)));
      cam.lookAt(0, 0, 0); cam.rotateZ(lerp(0.05, -0.015, E.inOutSine(c)));
    },
  };
});

/* ---- TUNNEL : flight through rings of words */
shot('tunnel', 5.6, () => {
  const scene = new THREE.Scene();
  scene.add(backdrop('#020305', '#020305', '#3a1a0a', V3(0, 0, -1), 6));
  scene.fog = new THREE.Fog('#020305', 6, 34);
  const cam = new THREE.PerspectiveCamera(62, ASPECT, 0.1, 1000);
  const strip = SERVICES.join('   ·   ') + '   ·   ';
  const styles = [
    textCanvas(strip, { px: 130, color: '#f4efe8', pad: 0 }),
    textCanvas(strip, { px: 130, color: '#e0864e', stroke: 3, pad: 0 }),
    textCanvas(strip, { px: 130, color: '#e0864e', pad: 0 }),
    textCanvas(strip, { px: 130, color: '#f4efe8', stroke: 2.5, pad: 0 }),
  ];
  styles.forEach(s => { s.tex.wrapS = THREE.RepeatWrapping; });
  const R = 5.2, RH = 1.25, GAP = 1.75, NR = 48; const rings = [];
  const r = rng(12);
  for (let i = 0; i < NR; i++) {
    const st = styles[i % 4];
    const tex = st.tex.clone(); tex.needsUpdate = true; tex.wrapS = THREE.RepeatWrapping;
    const circ = 2 * Math.PI * R; const rep = Math.max(1, Math.round(circ / (RH * st.aspect)));
    tex.repeat.set(-rep * 0.9999, 1); tex.offset.x = r();
    const g = new THREE.CylinderGeometry(R, R, RH, 128, 1, true); g.rotateX(Math.PI / 2);
    const bright = i % 4 === 0 ? 1.4 : i % 4 === 2 ? 1.8 : 1.6;
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, color: new THREE.Color('#ffffff').multiplyScalar(bright) }));
    m.position.z = -i * GAP; scene.add(m);
    rings.push({ m, dir: i % 2 ? 1 : -1, sp: 0.15 + r() * 0.25 });
  }
  scene.add(dust(900, [8, 8, 90, 0, 0, -40], '#ffc89a', 0.04, 9, 0.8));
  return {
    scene, cam,
    update(t) {
      rings.forEach(g => { g.m.rotation.z = g.dir * g.sp * t + g.dir * 0.3; });
      const c = inv(0, 5.6, t);
      const z = 4 - 62 * (0.35 * c + 0.65 * E.inOutCubic(c));
      cam.position.set(Math.sin(t * 0.9) * 0.6, Math.cos(t * 0.7) * 0.4, z);
      cam.lookAt(Math.sin(t * 0.9 + 0.5) * 0.4, Math.cos(t * 0.7 + 0.5) * 0.3, z - 10);
      cam.rotateZ(t * 0.22);
    },
  };
});

/* ---- 01 COUVERTURE : letters drop like tiles */
shot('s1', 4.6, () => {
  const { scene, cam, drift, num } = base({ n: '01', numX: 11, bg: ['#06080d', '#060302', '#8a3a14', V3(-0.4, 0.15, -1), 8, '#140904'], env: 0.45, seed: 3,
    lights: { key: '#ffc79a', keyI: 3.4, keyPos: V3(-8, 12, 10), fill: '#7d93c4', fillI: 0.35, rim: '#ff7a3a', rimI: 2.5, rimPos: V3(6, -2, -8), shadow: 2048, shadowBox: 14 } });
  const f = new THREE.MeshStandardMaterial({ color: '#c4623a', roughness: 0.55 }), s = new THREE.MeshStandardMaterial({ color: '#4a1e10', roughness: 0.6 });
  const T = makeText(['Couverture'], { size: 2.4, depth: 0.8, maxW: 16, mat: () => [f, s] });
  scene.add(T.group);
  const r = rng(4); T.letters.forEach(l => { l.rx = -1.5 - r() * 1.5; l.h = 9 + r() * 4; l.rz = (r() - .5) * 0.8; });
  // echo rows (outline repeats receding like roof courses)
  for (let i = 1; i <= 4; i++) { const p = textPlane('Couverture', { px: 220, h: 3.2, stroke: 2.5, opacity: 0.16 / i, tint: '#ff9a5a' }); p.position.set(0, -3.1 * i + 1.5, -5 * i); p.rotation.x = -0.25; scene.add(p); }
  return {
    scene, cam,
    update(t) {
      drift(t); num.position.x = 11 - t * 0.4;
      T.letters.forEach(l => {
        const d = 0.15 + l.k * 0.9; const p = inv(d, d + 0.85, t); const e = E.outBack(p);
        l.m.position.set(l.p0.x, l.p0.y + (1 - e) * l.h, l.p0.z);
        l.m.rotation.set((1 - E.outCubic(p)) * l.rx, 0, (1 - E.outCubic(p)) * l.rz);
        l.m.visible = p > 0;
      });
      const c = E.inOutSine(inv(0, 4.6, t));
      cam.position.set(lerp(-5, 3, c), lerp(-2.6, -1.2, c), lerp(23, 20, c)); cam.lookAt(0, 0.4, 0);
    },
  };
});

/* ---- 02 NETTOYAGE DE TOITURE : moss washed off the letters */
shot('s2', 4.8, () => {
  const { scene, cam, drift, num } = base({ n: '02', numX: -11, bg: ['#05080d', '#020304', '#1d3a5e', V3(0.6, 0.4, -1), 5, '#081018'], env: 0.7, seed: 5,
    lights: { key: '#fff1e0', keyI: 2.0, keyPos: V3(6, 10, 10), fill: '#88a8d8', fillI: 0.35, rim: '#9fd8ff', rimI: 2, rimPos: V3(-8, 3, -6) }, dust: '#bfe3ff' });
  const uSweep = { value: -14 };
  const f = new THREE.MeshStandardMaterial({ color: '#cfc7bb', roughness: 0.4 });
  f.onBeforeCompile = sh => {
    sh.uniforms.uSweep = uSweep;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uSweep;\n' + NOISE_GLSL)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float n=fbm2(vWP.xy*1.1); float n2=fbm2(vWP.xy*6.+3.);
        float edge=uSweep+(n-.5)*1.2;
        float dirty=smoothstep(edge-.3,edge+.3,vWP.x);
        vec3 moss=mix(vec3(.02,.03,.012),vec3(.09,.11,.03),smoothstep(.3,.75,n2));
        moss=mix(moss,vec3(.06,.06,.05),smoothstep(.55,.75,n)*.7);
        diffuseColor.rgb=mix(diffuseColor.rgb,moss,dirty*.95);
        float band=exp(-pow((vWP.x-edge)/.16,2.));`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(.22,.95,dirty);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.55,.85,1.)*band*2.4;');
  };
  const s = M.darkSide();
  const T = makeText(['Nettoyage', 'de toiture'], { size: 1.9, depth: 0.6, maxW: 15, mat: () => [f, s] });
  scene.add(T.group);
  // spray
  const N = 1600, pr = rng(4), seeds = new Float32Array(N * 4); for (let i = 0; i < N * 4; i++) seeds[i] = pr();
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); sg.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  const sm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uX: uSweep },
    vertexShader: `attribute vec4 seed; uniform float uT,uX; varying float vA;
      void main(){ float life=.45+seed.w*.4; float age=mod(uT+seed.x*life*7.,life);
        vec3 p=vec3(uX+.2, (seed.y-.5)*5., 1.2)+vec3(1.+seed.z*3.,(seed.w-.5)*2.5,1.5+seed.x*3.)*age+vec3(0.,-5.*age*age,0.);
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(.6+seed.x*1.6)*(90./-mv.z);
        vA=(1.-age/life)*step(-8.5,uX)*step(uX,8.5); }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-.5); gl_FragColor=vec4(vec3(.65,.85,1.)*smoothstep(.5,0.,d)*vA*.6,1.); }`,
  });
  const spray = new THREE.Points(sg, sm); spray.frustumCulled = false; scene.add(spray);
  return {
    scene, cam,
    update(t) {
      drift(t); num.position.x = -11 + t * 0.4;
      T.letters.forEach(l => {
        const d = 0.05 + l.k * 0.5; const p = E.outExpo(inv(d, d + 1.0, t));
        l.m.position.set(l.p0.x, l.p0.y, l.p0.z - (1 - p) * 6); l.m.rotation.set(0, (1 - p) * 0.9, 0); l.m.visible = p > 0;
      });
      uSweep.value = lerp(-10, 10, E.inOutSine(inv(1.0, 4.0, t)));
      sm.uniforms.uT.value = t;
      const c = E.inOutSine(inv(0, 4.8, t));
      cam.position.set(lerp(6, -2, c), lerp(3.5, 1.5, c), lerp(21, 19, c)); cam.lookAt(0, 0, 0);
    },
  };
});

/* ---- 03 ZINGUERIE : chrome letters spinning in */
shot('s3', 4.6, () => {
  const { scene, cam, drift, num } = base({ n: '03', numX: 11, bg: ['#070b12', '#020305', '#2a4a78', V3(0, 0.6, -1), 5, '#0a1018'], env: 2.2, seed: 7,
    lights: { key: '#ffffff', keyI: 2.5, keyPos: V3(4, 10, 8), fill: '#6f8fc0', fillI: 0.4, rim: '#ff9a5a', rimI: 4, rimPos: V3(-6, -2, -8) }, dust: '#cfe4ff' });
  const f = M.chrome(), s = M.zinc();
  const T = makeText(['Zinguerie'], { size: 2.5, depth: 0.7, maxW: 16, mat: () => [f, s] });
  scene.add(T.group);
  const sweepL = lightBar(scene, '#cfe6ff');
  const p1 = new THREE.PointLight('#ff8a4a', 40, 20); const p2 = new THREE.PointLight('#8ab8ff', 40, 20); scene.add(p1, p2);
  return {
    scene, cam,
    update(t) {
      drift(t); num.position.x = 11 - t * 0.4;
      T.letters.forEach(l => {
        const d = 0.1 + l.k * 0.7; const p = E.outExpo(inv(d, d + 1.3, t));
        l.m.position.set(l.p0.x, l.p0.y, l.p0.z - (1 - p) * 8); l.m.rotation.set(0, (1 - p) * Math.PI * 1.5, (1 - p) * 0.4); l.m.visible = p > 0;
      });
      const sw = inv(1.6, 3.4, t); sweepL(lerp(-13, 13, E.inOutCubic(sw)), Math.sin(sw * Math.PI));
      p1.position.set(Math.sin(t * 1.5) * 8, 2, 5); p2.position.set(Math.sin(t * 1.5 + 3) * 8, -2, 5);
      const c = E.inOutSine(inv(0, 4.6, t)); const a = lerp(0.45, -0.3, c);
      cam.position.set(Math.sin(a) * 21, lerp(1.8, -0.8, c), Math.cos(a) * 21); cam.lookAt(0, 0, 0); cam.rotateZ(lerp(-0.06, 0.04, c));
    },
  };
});

/* ---- 04 DESSOUS DE TOIT : letters hinge up, seen from below */
shot('s4', 4.6, () => {
  const { scene, cam, drift, num } = base({ n: '04', numX: -11, bg: ['#0e1a2e', '#07080b', '#ff8a40', V3(1, 0.2, 0.2), 10, '#18141a'], env: 0.5, seed: 9,
    lights: { key: '#ffd2a6', keyI: 2.0, keyPos: V3(10, -6, 10), fill: '#7d9ccf', fillI: 0.5, rim: '#ff8a4a', rimI: 2.5, rimPos: V3(-8, 6, -4), shadow: 2048, shadowBox: 14 } });
  const f = new THREE.MeshPhysicalMaterial({ color: '#cdc6bc', roughness: 0.45, clearcoat: 0.3 }), s = new THREE.MeshStandardMaterial({ map: WOOD, color: '#b08860', roughness: 0.7 });
  const T = makeText(['Dessous', 'de toit'], { size: 2.1, depth: 0.55, maxW: 15, mat: () => [f, s] });
  scene.add(T.group);
  // overhead slats for depth
  const slatM = new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 0.8 });
  for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 40), slatM); b.position.set(-16 + i * 1.28, 6.5, -12); scene.add(b); }
  return {
    scene, cam,
    update(t) {
      drift(t); num.position.x = -11 + t * 0.4;
      T.letters.forEach(l => {
        const d = 0.15 + (l.li * 0.25) + l.k * 0.8; const p = inv(d, d + 0.9, t); const e = E.outBack(p);
        l.m.rotation.set((1 - e) * Math.PI / 2, 0, 0);
        l.m.position.set(l.p0.x, l.p0.y + (1 - E.outCubic(p)) * -1.5, l.p0.z); l.m.visible = p > 0;
      });
      const c = E.inOutSine(inv(0, 4.6, t));
      cam.position.set(lerp(-4, 3, c), lerp(-8.5, -5.5, c), lerp(17, 19, c)); cam.lookAt(0, 0.6, 0);
    },
  };
});

/* ---- 05 NETTOYAGE FACADE : letters embossed out of a stucco wall, then washed */
shot('s5', 4.8, () => {
  const { scene, cam, drift } = base({ bg: ['#07090e', '#030304', '#ff7a3a', V3(-1, 0.2, 0.3), 8, '#120c0a'], env: 0.3, seed: 11,
    lights: { key: '#ffd8b0', keyI: 2.3, keyPos: V3(-20, 3, 7), fill: '#7d93c4', fillI: 0.3, rim: '#9fc0ff', rimI: 0.6, rimPos: V3(8, 8, 6), shadow: 2048, shadowBox: 13 }, words: { n: 0 } });
  const uSweep = { value: -16 };
  const dirtyShader = mat => {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uSweep = uSweep;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uSweep;\n' + NOISE_GLSL)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float st=fbm2(vec2(vWP.x*6.,vWP.y*.35)); float n=fbm2(vWP.xy*1.2);
          vec3 dirt=mix(vec3(.17,.17,.15),vec3(.28,.27,.24),n);
          dirt=mix(dirt,vec3(.05,.06,.035),smoothstep(.45,.75,st)*.85);
          dirt=mix(dirt,vec3(.06,.09,.03),smoothstep(.6,.8,fbm2(vWP.xy*3.+5.))*.7);
          float edge=uSweep+(n-.5)*1.4;
          float dirty=smoothstep(edge-.3,edge+.3,vWP.x);
          diffuseColor.rgb=mix(diffuseColor.rgb,dirt,dirty);
          float band=exp(-pow((vWP.x-edge)/.15,2.));`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.55,.85,1.)*band*1.6;');
    };
    return mat;
  };
  const wallM = dirtyShader(new THREE.MeshStandardMaterial({ color: '#a89e8f', roughness: 0.95, bumpMap: STUCCO, bumpScale: 2.0 }));
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), wallM); wall.receiveShadow = true; scene.add(wall);
  const f = dirtyShader(new THREE.MeshStandardMaterial({ color: '#c9bfae', roughness: 0.9, bumpMap: STUCCO, bumpScale: 1.4 }));
  const T = makeText(['Nettoyage', 'façade'], { size: 2.1, depth: 0.9, maxW: 15, mat: () => [f, f] });
  T.inner.position.y = -2.1 * 0.36; scene.add(T.group);
  return {
    scene, cam,
    update(t) {
      drift(t);
      T.letters.forEach(l => {
        const d = 0.1 + l.k * 1.1 + l.li * 0.15; const p = E.outBack(inv(d, d + 0.9, t));
        l.m.position.set(l.p0.x, l.p0.y, l.p0.z - (1 - p) * (l.r.d + 0.1));
      });
      uSweep.value = lerp(-13, 13, E.inOutSine(inv(1.5, 4.3, t)));
      const c = E.inOutSine(inv(0, 4.8, t));
      cam.position.set(lerp(11, 6, c), lerp(2.5, 0.8, c), lerp(17, 19.5, c)); cam.lookAt(lerp(0.8, 0, c), 0, 0);
    },
  };
});

/* ---- 06 TRAITEMENT DE CHARPENTE : blueprint lines, then treated wood */
shot('s6', 4.8, () => {
  const { scene, cam, drift, num } = base({ n: '06', numX: 11, bg: ['#05070c', '#030304', '#8a3c16', V3(1, 0.3, -0.5), 10, '#100906'], env: 0.35, seed: 13,
    lights: { key: '#ffcf9a', keyI: 3.2, keyPos: V3(8, 10, 10), fill: '#6f8ab8', fillI: 0.45, rim: '#9fd6ff', rimI: 1.8, rimPos: V3(-8, 4, -8), shadow: 2048, shadowBox: 14 } });
  const uScan = { value: -14 };
  const wood = new THREE.MeshStandardMaterial({ map: WOOD, roughness: 0.8 });
  wood.onBeforeCompile = sh => {
    sh.uniforms.uScan = uScan;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uScan;\n' + NOISE_GLSL)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float edge=uScan+(fbm2(vWP.yz*2.)-.5)*.6;
        float treated=1.-smoothstep(edge-.15,edge+.15,vWP.x);
        vec3 raw=vec3(dot(diffuseColor.rgb,vec3(.33)))*vec3(.95,.93,.9)*.85;
        vec3 tr=diffuseColor.rgb*vec3(1.05,.7,.4);
        diffuseColor.rgb=mix(raw,tr,treated);
        float band=exp(-pow((vWP.x-edge)/.12,2.));`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(.95,.38,treated);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.45,.85,1.)*band*2.6;');
  };
  const T = makeText(['Traitement', 'de charpente'], { size: 1.9, depth: 0.7, maxW: 16, mat: () => [wood, wood] });
  scene.add(T.group);
  const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color('#ff8a4a').multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  T.letters.forEach(l => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(l.r.g, 25), lineMat.clone()); e.position.copy(l.p0); T.inner.add(e); l.e = e; });
  return {
    scene, cam,
    update(t) {
      drift(t); num.position.x = 11 - t * 0.4;
      T.letters.forEach(l => {
        const pl = ss(0.05 + l.k * 0.6, 0.35 + l.k * 0.6, t);
        l.e.material.opacity = pl * (1 - ss(2.6, 3.4, t));
        l.e.visible = l.e.material.opacity > 0.003;
        const d = 0.9 + l.k * 0.8; const p = E.outBack(inv(d, d + 0.7, t));
        l.m.scale.set(1, 1, Math.max(p, 0.001)); l.m.visible = p > 0.001;
      });
      uScan.value = lerp(-10, 10, E.inOutSine(inv(2.0, 4.4, t)));
      const c = E.inOutSine(inv(0, 4.8, t));
      cam.position.set(lerp(-7, 2, c), lerp(-2.5, 1.5, c), lerp(18, 20, c)); cam.lookAt(0, 0, 0); cam.rotateZ(0.03);
    },
  };
});

/* ---- 07 ISOLATION DES COMBLES : fibres assemble the letters */
shot('s7', 5.0, () => {
  const { scene, cam, drift, num } = base({ n: '07', numX: -11, bg: ['#0c1a2c', '#0a0503', '#2c5a90', V3(0, 1, -0.4), 3, '#08080e'], env: 0.4, seed: 15,
    lights: { key: '#ffe6c8', keyI: 1.8, keyPos: V3(6, 10, 12), fill: '#6f90c8', fillI: 0.35, rim: '#ff8a40', rimI: 2.5, rimPos: V3(-6, -5, 6), shadow: 2048, shadowBox: 13 }, dust: '#ffe6c8' });
  const f = new THREE.MeshStandardMaterial({ color: '#c9b98f', roughness: 1 }), s = new THREE.MeshStandardMaterial({ color: '#b89a62', roughness: 1 });
  const T = makeText(['Isolation', 'des combles'], { size: 1.95, depth: 0.5, maxW: 15.5, mat: () => [f, s] });
  scene.add(T.group);
  // sample front faces
  const pts = []; const r = rng(21);
  T.letters.forEach(l => {
    const pos = l.r.g.attributes.position; const tris = []; let area = 0;
    for (let i = 0; i < pos.count; i += 3) {
      const a = V3(pos.getX(i), pos.getY(i), pos.getZ(i)), b = V3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)), c = V3(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
      if (Math.min(a.z, b.z, c.z) < l.r.d / 2 - 0.02) continue;
      const ar = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2; if (ar < 1e-6) continue;
      area += ar; tris.push({ a, b, c, cum: area });
    }
    const n = Math.round(area * 260);
    for (let k = 0; k < n; k++) {
      const x = r() * area; const tr = tris.find(q => q.cum >= x);
      let u = r(), v = r(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const p = tr.a.clone().add(tr.b.clone().sub(tr.a).multiplyScalar(u)).add(tr.c.clone().sub(tr.a).multiplyScalar(v));
      p.add(l.p0); p.z += 0.02 + r() * 0.18;
      pts.push({ tgt: p, order: clamp((p.x / (T.sc * 16) + 0.5) * 0.8 + r() * 0.2), from: V3(-24 - r() * 6, (r() - .5) * 10, (r() - .5) * 8 + 2), rot: new THREE.Euler(r() * 6, r() * 6, r() * 6), s: 0.6 + r() * 0.9, wob: r() * 6 });
    }
  });
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.075, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), pts.length);
  const FIB = ['#c9bb98', '#bfae80', '#d6cab0', '#b39d6c', '#cfc2a2'].map(c => new THREE.Color(c));
  pts.forEach((_, i) => im.setColorAt(i, FIB[(r() * FIB.length) | 0]));
  im.castShadow = true; im.frustumCulled = false; T.inner.add(im);
  return {
    scene, cam,
    update(t) {
      drift(t); num.position.x = -11 + t * 0.4;
      pts.forEach((q, i) => {
        const b = 0.2 + q.order * 2.4; const p = inv(b, b + 0.9, t);
        if (p <= 0) { im.setMatrixAt(i, _m.makeScale(0, 0, 0)); return; }
        const e = E.outCubic(p);
        _v.lerpVectors(q.from, q.tgt, e); _v.y += Math.sin(p * Math.PI) * 1.5 * Math.sin(q.wob); _v.z += Math.sin(p * Math.PI) * 2;
        _q.setFromEuler(_e.set(q.rot.x + (1 - e) * 6, q.rot.y, q.rot.z));
        const sc = q.s * lerp(0.4, 1, e); im.setMatrixAt(i, _m.compose(_v, _q, _s.set(sc, sc, sc)));
      });
      _s.set(1, 1, 1); im.instanceMatrix.needsUpdate = true;
      T.letters.forEach(l => { const p = E.outCubic(inv(2.6 + l.k * 0.5, 3.3 + l.k * 0.5, t)); l.m.scale.set(1, 1, Math.max(p, 0.001)); l.m.visible = p > 0.001; });
      const c = E.inOutSine(inv(0, 5, t));
      cam.position.set(lerp(-3, 4, c), lerp(2.5, 0.5, c), lerp(20, 18.5, c)); cam.lookAt(0, 0, 0);
    },
  };
});

/* ---- LOCATION : rings of 3D letters around the camera */
shot('loc', 5.4, () => {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = 0.7;
  scene.add(backdrop('#05070c', '#030203', '#7a3010', V3(0, -0.2, -1), 4, '#0a0605'));
  scene.fog = new THREE.Fog('#040405', 16, 40);
  const cam = new THREE.PerspectiveCamera(58, ASPECT, 0.1, 1000);
  stdLights(scene, { key: '#fff1e0', keyI: 1.5, keyPos: V3(0, 10, 0), fill: '#6f86b8', fillI: 0.5, rim: '#ff8a4a', rimI: 1.5, rimPos: V3(0, -5, 0) });
  const pl = new THREE.PointLight('#ffd2a6', 40, 40, 1.2); scene.add(pl);
  const rings = [];
  const mk = (txt, R, y, size, mats, dir) => {
    const g = new THREE.Group(); g.position.y = y; scene.add(g);
    let s = ''; const circ = 2 * Math.PI * R; const unit = [...txt].reduce((a, ch) => a + adv(ch, size), 0);
    const reps = Math.max(1, Math.round(circ / unit)); for (let i = 0; i < reps; i++) s += txt;
    const total = [...s].reduce((a, ch) => a + adv(ch, size), 0); let acc = 0; const L = [];
    [...s].forEach(ch => {
      const a = adv(ch, size);
      if (ch !== ' ' && hasGlyph(ch)) {
        const th = Math.PI - ((acc + a / 2) / total) * Math.PI * 2;
        const rr = glyphGeo(ch, size, size * 0.3); const m = new THREE.Mesh(rr.g, mats);
        m.position.set(Math.sin(th) * R, rr.c.y - size * 0.36, Math.cos(th) * R); m.rotation.y = th + Math.PI;
        g.add(m); L.push({ m, y0: m.position.y, th });
      }
      acc += a;
    });
    rings.push({ g, L, dir });
  };
  mk('SAINT-SERNIN · ARDÈCHE · ', 15, 3.2, 1.5, [M.cream(), M.copperSide()], 1);
  mk('PRÈS D\'AUBENAS · 07 · ', 16, -3.6, 1.25, [M.copper(), M.copperSide()], -1);
  scene.add(dust(700, [30, 14, 30, 0, 0, 0], '#ffd2a6', 0.05, 17, 0.8));
  return {
    scene, cam,
    update(t) {
      rings.forEach((R, ri) => {
        R.g.rotation.y = R.dir * (0.12 * t + 0.5 * (1 - E.outExpo(inv(0, 2.2, t))));
        R.L.forEach(l => { const p = E.outExpo(inv(0.1 + ri * 0.2 + Math.abs(Math.sin(l.th)) * 0.4, 1.4 + ri * 0.2 + Math.abs(Math.sin(l.th)) * 0.4, t)); l.m.position.y = l.y0 + (1 - p) * (ri ? -6 : 6); });
      });
      cam.position.set(0, Math.sin(t * 0.6) * 0.3, 0);
      cam.rotation.set(lerp(0.06, -0.04, inv(0, 5.4, t)), 0, Math.sin(t * 0.5) * 0.04);
      pl.position.set(Math.sin(t) * 4, 0, -6);
    },
  };
});

/* ---- OUTRO : slot-machine phone number */
shot('outro', 9.5, () => {
  const { scene, cam, drift } = base({ bg: ['#06090f', '#030203', '#7a3010', V3(0, -0.3, -1), 6, '#0c0705'], env: 0.6, seed: 19,
    lights: { key: '#fff1e0', keyI: 2.4, keyPos: V3(-4, 8, 12), fill: '#6f86b8', fillI: 0.35, rim: '#ff8a4a', rimI: 3, rimPos: V3(6, -3, -6) }, words: { n: 9, opacity: 0.06 } });
  const f = M.cream(), s = M.copper();
  const TEL = '06 12 19 14 68';
  const size = 1.75;
  const T = makeText([TEL], { size, depth: 0.6, maxW: 15, tracking: 0.02, mat: () => [f, s] });
  T.group.position.y = -0.15; scene.add(T.group);
  const digits = '0123456789'.split('').map(d => glyphGeo(d, size, 0.6));
  T.letters.forEach((l, i) => { l.target = +l.ch; l.spins = 14 + i * 3; });
  const sweepL = lightBar(scene, '#ffcf9a', 10, -2);
  return {
    scene, cam,
    update(t) {
      drift(t);
      T.letters.forEach((l, i) => {
        const p = inv(2.4 + i * 0.07, 4.0 + i * 0.1, t); const e = E.outCubic(p);
        const roll = l.spins * (1 - e);
        const dIdx = ((l.target + Math.floor(roll)) % 10 + 10) % 10;
        const rec = digits[dIdx]; if (l.m.geometry !== rec.g) l.m.geometry = rec.g;
        const fr = roll % 1;
        l.m.position.set(l.p0.x - (l.r.c.x - rec.c.x) * 0, l.p0.y + fr * 0.6 * (p < 1 ? 1 : 0), l.p0.z);
        l.m.rotation.set(-fr * 1.2, 0, 0);
        const vis = inv(2.2 + i * 0.05, 2.5 + i * 0.05, t); l.m.scale.set(1, lerp(0.001, 1, E.outCubic(vis)) * (1 + (1 - e) * 0.25), 1);
        l.m.visible = vis > 0;
      });
      const sw = inv(4.6, 6.2, t); sweepL(lerp(-11, 11, E.inOutCubic(sw)), Math.sin(sw * Math.PI));
      const c = E.inOutSine(inv(0, 9.5, t));
      cam.position.set(lerp(-2, 1.5, c), lerp(1.2, 0.3, c), lerp(30, 24, c)); cam.lookAt(0, 0, 0);
    },
  };
});

/* ---------------------------------------------------------------- timeline */
const TR = 0.8;
const TMODES = [0, 4, 1, 3, 2, 0, 4, 1, 3, 2];
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
  const vec3 COPPER=vec3(1.,.42,.16);
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
      vec2 g=vec2(16.,9.); vec2 cell=floor(uv*g); vec2 lc=fract(uv*g)-.5;
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
      float N=11.; float i=floor(uv.y*N);
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
      float v=smoothstep(1.05,.25,length(c*vec2(aspect*.62,1.)));
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
function charsAnim(chars, t, tIn, tOut, stagger = 0.028, dur = 0.85, outStagger = 0.012) {
  chars.forEach((s, i) => {
    const pi = E.outExpo(inv(tIn + i * stagger, tIn + i * stagger + dur, t));
    const po = E.inCubic(inv(tOut + i * outStagger, tOut + i * outStagger + 0.45, t));
    const y = (1 - pi) * 115 - po * 115;
    s.style.transform = `translate3d(0,${y.toFixed(2)}%,0) rotate(${((1 - pi) * 8).toFixed(2)}deg)`;
    s.style.opacity = (Math.min(pi * 1.4, 1) * (1 - po)).toFixed(3);
    const bl = (1 - pi) * 10 + po * 6; s.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : 'none';
  });
}
function lineAnim(el, t, tIn, tOut, dy = 100) {
  const pi = E.outExpo(inv(tIn, tIn + 1.0, t)), po = E.inCubic(inv(tOut, tOut + 0.45, t));
  el.style.transform = `translate3d(0,${((1 - pi) * dy - po * dy).toFixed(2)}%,0)`;
  el.style.opacity = (pi * (1 - po)).toFixed(3);
}
function lnAnim(el, t, tIn, tOut) { el.style.transform = `scaleX(${(E.outExpo(inv(tIn, tIn + 0.9, t)) * (1 - E.inCubic(inv(tOut, tOut + 0.4, t)))).toFixed(3)})`; }
function setVis(el, v) { el.style.display = v ? '' : 'none'; }

const CAP = {
  s1: { n: '01', k: 'Toiture', s: 'Réfection · Rénovation · Entretien' },
  s2: { n: '02', k: 'Toiture', s: 'Démoussage · Traitement · Hydrofuge' },
  s3: { n: '03', k: 'Métal', s: 'Gouttières · Descentes · Habillages' },
  s4: { n: '04', k: 'Finitions', s: 'Habillage & rénovation des avancées' },
  s5: { n: '05', k: 'Murs', s: 'Démoussage · Lavage · Protection' },
  s6: { n: '06', k: 'Structure', s: 'Préventif & curatif · Insectes · Champignons' },
  s7: { n: '07', k: 'Confort', s: 'Soufflage · Confort thermique · Économies' },
};
const capEls = {};
for (const [id, c] of Object.entries(CAP)) {
  const k = document.createElement('div'); k.className = 'center mono sk';
  k.innerHTML = `<span class="row"><span class="ln"></span><span class="mask"><span class="ch">${c.n} / 07 — ${c.k}</span></span><span class="ln"></span></span>`;
  const s = document.createElement('div'); s.className = 'center subl ss'; s.innerHTML = `<span class="mask"><span class="ch">${c.s}</span></span>`;
  $('#svc').append(k, s);
  capEls[id] = { k, s, kc: k.querySelector('.ch'), lns: [...k.querySelectorAll('.ln')], sc: s.querySelector('.ch') };
}

function updateDOM(T) {
  const sh = id => shots.find(s => s.id === id);
  // intro
  { const s = sh('intro'), t = T - s.start, on = T < s.end; setVis($('#intro'), on);
    if (on) { const tOut = s.dur - TR - 0.5; lineAnim($('#i-kick .ch'), t, 3.0, tOut); $('#i-kick').querySelectorAll('.ln').forEach(l => lnAnim(l, t, 2.9, tOut)); lineAnim($('#i-loc .ch'), t, 3.6, tOut + 0.05); } }
  // manifesto
  { const s = sh('tunnel'), t = T - s.start, on = T >= s.start && T < s.end; setVis($('#mani'), on);
    if (on) {
      const ws = [...document.querySelectorAll('#mani .w')]; const times = [[0.35, 1.55], [1.65, 2.85], [2.95, s.dur - TR - 0.45]];
      ws.forEach((w, i) => {
        const [a, b] = times[i]; const el = w.querySelector('[data-split]');
        charsAnim(el._chars, t, a, b, 0.035, 0.7, 0.01);
        const z = 1 + 0.08 * inv(a, b + 0.4, t) + 0.5 * E.inCubic(inv(b, b + 0.45, t));
        w.style.transform = `translateY(-50%) scale(${z.toFixed(4)})`;
        setVis(w, t > a - 0.05 && t < b + 0.6);
      });
    } }
  // service captions
  for (const [id, c] of Object.entries(capEls)) {
    const s = sh(id), t = T - s.start, on = T >= s.start && T < s.end;
    setVis(c.k, on); setVis(c.s, on); if (!on) continue;
    const tOut = s.dur - TR - 0.4;
    lineAnim(c.kc, t, 0.35, tOut); c.lns.forEach(l => lnAnim(l, t, 0.25, tOut)); lineAnim(c.sc, t, 1.0, tOut + 0.05);
  }
  // location
  { const s = sh('loc'), t = T - s.start, on = T >= s.start && T < s.end; setVis($('#locd'), on);
    if (on) { const tOut = s.dur - TR - 0.4; lineAnim($('#l-mid small .ch'), t, 0.9, tOut); charsAnim($('#l-mid [data-split]')._chars, t, 1.1, tOut, 0.04, 0.9); } }
  // hud
  const s1 = sh('s1'), s7 = sh('s7'), lo = sh('loc'), ou = sh('outro');
  $('#hud').style.opacity = (ss(sh('tunnel').start + 0.3, sh('tunnel').start + 1.2, T) * (1 - ss(ou.start, ou.start + 0.6, T))).toFixed(3);
  const idx = clamp(['s1', 's2', 's3', 's4', 's5', 's6', 's7'].findIndex(id => T < sh(id).end - TR * 0.5) + 1, 1, 7) || 7;
  $('#cnt').textContent = `0${idx} / 07`;
  $('#prog').style.width = (clamp((T - s1.start) / (lo.start - s1.start)) * 100).toFixed(2) + '%';
  $('#shade').style.opacity = '1';
  // outro
  { const t = T - ou.start, on = T >= ou.start; setVis($('#outro'), on);
    $('#vig').style.opacity = on ? (ss(0.5, 1.5, t) * 0.6).toFixed(3) : '0';
    if (on) {
      const d1 = E.inOutCubic(inv(0.5, 1.6, t)), d2 = E.inOutCubic(inv(0.9, 1.8, t));
      $('#lg1').style.strokeDasharray = 140; $('#lg1').style.strokeDashoffset = (140 * (1 - d1)).toFixed(2);
      $('#lg2').style.strokeDasharray = 70; $('#lg2').style.strokeDashoffset = (70 * (1 - d2)).toFixed(2);
      const h = [...document.querySelectorAll('#o-top [data-split]')];
      charsAnim(h[0]._chars, t, 1.0, 99, 0.05, 1.0); charsAnim(h[1]._chars, t, 1.2, 99, 0.05, 1.0);
      lineAnim($('#o-call .ch'), t, 2.0, 99);
      lineAnim($('#o-loc .ch'), t, 4.3, 99);
      lineAnim($('#o-web .ch'), t, 4.6, 99);
      $('#o-svc').querySelectorAll('.ch').forEach((e, i) => lineAnim(e, t, 5.0 + i * 0.12, 99));
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
  gradeMat.uniforms.uFade.value = 1 - ss(0, 0.6, T);
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
