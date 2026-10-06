import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

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

/* ------------------------------------------------------------- the house */
function buildHouse(seed, { gutters = false } = {}) {
  const group = new THREE.Group();
  const HW = 8, D = 6, Hw = 3.4, rise = 2.5, ox = 0.55, oz = 0.6;
  const a = Math.atan2(rise, D / 2);
  const L = (D / 2 + oz) / Math.cos(a) + 0.15;
  const r = 0.25, len = 0.9;
  const lay = slopeLayout({ cols: Math.ceil((HW + 2 * ox) / (2 * r)), rows: Math.ceil(L / (len * 0.78)), r, len });
  const tiles = [];
  for (const side of [1, -1]) {
    const slope = new THREE.Object3D();
    slope.position.set(0, Hw + rise + 0.05, 0);
    slope.rotation.set(side > 0 ? a : -a, side > 0 ? 0 : Math.PI, 0);
    slope.updateMatrixWorld();
    for (const t of lay) {
      const mm = new THREE.Matrix4().compose(t.pos, t.quat, _s);
      mm.premultiply(slope.matrixWorld);
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); mm.decompose(p, q, sc);
      tiles.push({ pos: p, quat: q, row: t.row, c: t.c, side });
    }
  }
  // ridge
  const ridgeN = Math.ceil((HW + 2 * ox) / (len * 0.78));
  for (let i = 0; i < ridgeN; i++) {
    const x = -HW / 2 - ox + len / 2 + i * len * 0.78;
    tiles.push({ pos: V3(x, Hw + rise + 0.16, 0), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), row: -1, c: i, side: 0, ridge: true });
  }
  const im = tileMesh(tiles.length, seed, r, len);
  tiles.forEach((t, i) => { im.setMatrixAt(i, _m.compose(t.pos, t.quat, _s)); });
  group.add(im);

  // walls
  const wallMat = new THREE.MeshStandardMaterial({ color: '#d6c7ae', roughness: 0.92, bumpMap: STUCCO, bumpScale: 1.2 });
  STUCCO.repeat.set(3, 2);
  const walls = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(HW, Hw, D), wallMat); box.position.y = Hw / 2; box.castShadow = box.receiveShadow = true; walls.add(box);
  const tri = new THREE.Shape(); tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, rise); tri.lineTo(-D / 2, 0);
  for (const sx of [1, -1]) {
    const g = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.01, bevelEnabled: false }), wallMat);
    g.rotation.y = Math.PI / 2; g.position.set(sx * (HW / 2) - 0.005, Hw, 0); g.castShadow = g.receiveShadow = true; walls.add(g);
  }
  // windows (glowing)
  const winMat = new THREE.MeshStandardMaterial({ color: '#1a1410', emissive: new THREE.Color('#ffb066'), emissiveIntensity: 0, roughness: 0.3 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#3a3532', roughness: 0.6 });
  const wins = [[-2.6, 1.9, 1.1, 1.3], [0, 1.15, 1.0, 2.3], [2.6, 1.9, 1.1, 1.3]];
  for (const [x, y, w, h] of wins) for (const sz of [1, -1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.1), frameMat); f.position.set(x, y, sz * (D / 2 + 0.02)); walls.add(f);
    const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), winMat); g.position.set(x, y, sz * (D / 2 + 0.05)); walls.add(g);
  }
  // chimney
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), wallMat); ch.position.set(2.2, Hw + rise + 0.2, -1.2); ch.castShadow = true; walls.add(ch);
  group.add(walls);

  // outline for draw-in
  const y0 = 0, y1 = Hw, y2 = Hw + rise, hx = HW / 2, hz = D / 2;
  const P = [];
  const seg = (a, b) => P.push(...a, ...b);
  const c = [[-hx, y0, -hz], [hx, y0, -hz], [hx, y0, hz], [-hx, y0, hz]];
  const cu = c.map(v => [v[0], y1, v[2]]);
  for (let i = 0; i < 4; i++) { seg(c[i], c[(i + 1) % 4]); }
  for (let i = 0; i < 4; i++) { seg(c[i], cu[i]); }
  for (let i = 0; i < 4; i++) { seg(cu[i], cu[(i + 1) % 4]); }
  const rl = [-hx - ox, y2, 0], rr = [hx + ox, y2, 0];
  seg(rl, rr);
  const ey = y1 - oz * Math.tan(a);
  for (const sz of [1, -1]) { seg([-hx - ox, ey, sz * (hz + oz)], [hx + ox, ey, sz * (hz + oz)]); seg(rl, [-hx - ox, ey, sz * (hz + oz)]); seg(rr, [hx + ox, ey, sz * (hz + oz)]); }
  const outline = drawLines(P, '#ff8a4a', 30);
  group.add(outline);

  let gutterMeshes = [];
  if (gutters) {
    const zinc = new THREE.MeshStandardMaterial({ color: '#c9ced4', metalness: 1, roughness: 0.28, envMapIntensity: 1.2 });
    for (const sz of [1, -1]) {
      const curve = new THREE.LineCurve3(V3(-hx - ox - 0.1, ey - 0.12, sz * (hz + oz + 0.12)), V3(hx + ox + 0.1, ey - 0.12, sz * (hz + oz + 0.12)));
      const gm = new THREE.Mesh(sweep(curve, gutterProfile(0.13, 0.015, 10).map(([x, y]) => [y, -x]), 4), zinc);
      group.add(gm); gutterMeshes.push(gm);
      const dp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, ey, 16), zinc); dp.position.set(hx + 0.2, ey / 2, sz * (hz + 0.15)); group.add(dp);
    }
  }
  return { group, im, tiles, walls, winMat, outline, dims: { HW, D, Hw, rise } };
}

/* =================================================================== SHOTS */
const shots = [];
function shot(id, dur, build) { shots.push({ id, dur, ...build() }); }

/* ---- 1. INTRO */
shot('intro', 7.2, () => {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = 0.18;
  scene.add(backdrop('#04070d', '#020304', '#132440', V3(0.4, 0.15, -1), 4, '#0a1120'));
  scene.fog = new THREE.Fog('#04060a', 26, 70);
  const cam = new THREE.PerspectiveCamera(30, ASPECT, 0.1, 1000);
  stdLights(scene, { key: '#a9bfff', keyI: 1.1, keyPos: V3(-10, 14, 10), fill: '#4b6290', fillI: 0.35, ground: '#0a0806', rim: '#ff9a5c', rimI: 3.2, rimPos: V3(10, 5, -9), shadow: 2048, shadowBox: 10 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshLambertMaterial({ color: '#0d0f12' }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const ring = new THREE.Mesh(new THREE.RingGeometry(7.6, 7.66, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a3a').multiplyScalar(2.5), transparent: true }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  const house = buildHouse(21); scene.add(house.group);
  const r = rng(5);
  const st = house.tiles.map(t => {
    const dir = V3(r() - .5, r() * 0.8 + 0.2, r() - .5).normalize();
    return { from: t.pos.clone().add(dir.multiplyScalar(10 + r() * 14)), q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)), delay: (t.ridge ? 1.05 : (1 - (t.row + 1) / 9) * 0.55 + (t.c / 40) * 0.25) + r() * 0.25 };
  });
  scene.add(dust(900, [50, 16, 50, 0, 6, 0], '#ffb48a', 0.06, 3, 0.8));
  return {
    scene, cam,
    update(t) {
      house.outline.material.uniforms.uR.value = E.inOutCubic(inv(0.15, 2.3, t));
      house.outline.material.uniforms.uA.value = 1 - 0.75 * ss(3.2, 5, t);
      ring.material.opacity = ss(0.4, 1.6, t);
      ring.scale.setScalar(lerp(0.6, 1, E.outExpo(inv(0.4, 2.2, t))));
      const ws = E.outExpo(inv(1.2, 2.9, t));
      house.walls.scale.set(1, Math.max(ws, 0.001), 1); house.walls.visible = ws > 0.002;
      house.winMat.emissiveIntensity = 2.2 * ss(3.0, 4.2, t);
      st.forEach((s, i) => {
        const T = house.tiles[i];
        const p = E.outExpo(inv(1.5 + s.delay * 2.2, 1.5 + s.delay * 2.2 + 1.4, t));
        _v.lerpVectors(s.from, T.pos, p); _q.slerpQuaternions(s.q0, T.quat, p);
        const k = p <= 0 ? 0.0001 : 1;
        house.im.setMatrixAt(i, _m.compose(_v, _q, _s.set(k, k, k)));
      });
      _s.set(1, 1, 1);
      house.im.instanceMatrix.needsUpdate = true;
      const k = E.inOutCubic(inv(0, 7.2, t));
      const ang = lerp(-1.05, -0.38, k), rad = lerp(19, 26, E.outCubic(inv(0, 7.2, t))), hy = lerp(1.6, 6.5, k);
      cam.position.set(Math.sin(ang) * rad, hy, Math.cos(ang) * rad);
      cam.lookAt(0, lerp(2.4, 3.2, k), 0);
      cam.setViewOffset(W, H, -W * 0.23, H * 0.03, W, H);
    },
  };
});

/* ---- 2. COUVERTURE: tile field crashing into place */
shot('couv', 6.0, () => {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = 0.25;
  scene.add(backdrop('#05080e', '#080402', '#b0441a', V3(-0.5, 0.05, -1), 14, '#1e0c05'));
  scene.fog = new THREE.Fog('#160b06', 14, 46);
  const cam = new THREE.PerspectiveCamera(38, ASPECT, 0.1, 1000);
  const key = stdLights(scene, { key: '#ffb071', keyI: 4.2, keyPos: V3(-14, 5, -20), fill: '#7d93c4', fillI: 0.35, ground: '#2a120a', rim: '#ffd2a8', rimI: 0.8, rimPos: V3(8, 6, 8), shadow: 2048, shadowBox: 18, target: V3(0, 0, -10) });
  const lay = slopeLayout({ cols: 30, rows: 28, r: 0.3, len: 1.0, tilt: 0.06 });
  const im = tileMesh(lay.length, 33); scene.add(im);
  const r = rng(9);
  const meta = lay.map(t => ({ z: -t.pos.z + 6, x: t.pos.x, jit: r() * 1.2, h: 2.5 + r() * 5, q0: new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - .5) * 4, (r() - .5) * 4, (r() - .5) * 3)), spin: (r() - .5) * 2, base: t }));
  scene.add(dust(700, [30, 8, 40, 0, 3, -12], '#ffc79a', 0.05, 8, 0.9));
  return {
    scene, cam,
    update(t) {
      const front = lerp(8, -24, E.inOutSine(inv(0.0, 5.6, t)));
      meta.forEach((m, i) => {
        const d = front - m.z; // positive = not yet reached
        const p = inv(1.6, -0.6, d - m.jit * 0.6 + Math.sin(m.x * 0.4) * 0.6);
        const py = E.outCubic(p), pr = E.outExpo(p);
        _v.set(m.base.pos.x, m.base.pos.y + (1 - py) * m.h, -m.base.pos.z + 6);
        _q.setFromEuler(_e.set(m.spin * t * 0.3, m.spin * t * 0.5, 0)).premultiply(m.q0);
        _q.slerpQuaternions(_q.clone(), m.base.quat, pr);
        im.setMatrixAt(i, _m.compose(_v, _q, _s));
      });
      im.instanceMatrix.needsUpdate = true;
      const k = E.inOutSine(inv(0, 6, t));
      cam.position.set(lerp(-3.5, 2.5, k), lerp(1.3, 2.6, k), lerp(9, -5, k));
      cam.lookAt(lerp(0.5, -1.5, k), lerp(0.2, -0.6, k), lerp(-6, -18, k));
      cam.rotateZ(lerp(0.08, -0.05, k));
    },
  };
});

/* ---- 3. NETTOYAGE TOITURE: moss washed away */
shot('nett', 6.0, () => {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = 0.55;
  scene.add(backdrop('#060a12', '#020304', '#1d3a5e', V3(0.6, 0.4, -1), 4, '#0a1018'));
  scene.fog = new THREE.Fog('#05080c', 18, 45);
  const cam = new THREE.PerspectiveCamera(34, ASPECT, 0.1, 1000);
  stdLights(scene, { key: '#fff1e0', keyI: 3.2, keyPos: V3(8, 12, -4), fill: '#88a8d8', fillI: 0.5, ground: '#140c08', rim: '#9fd8ff', rimI: 1.4, rimPos: V3(-8, 3, -10), shadow: 2048, shadowBox: 16 });
  const uSweep = { value: -14 };
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, envMapIntensity: 1 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uSweep = uSweep;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 _wp = modelMatrix * instanceMatrix * vec4(transformed,1.0); vWP=_wp.xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uSweep;\n' + NOISE_GLSL)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float n = fbm2(vWP.xz*0.9);
        float n2 = fbm2(vWP.xz*7.0+vec2(3.,7.));
        float edge = uSweep + (n-0.5)*1.4;
        float dirty = smoothstep(edge-0.35, edge+0.35, vWP.x);
        vec3 moss = mix(vec3(0.018,0.028,0.010), vec3(0.075,0.095,0.025), smoothstep(.3,.75,n2));
        moss = mix(moss, vec3(0.05,0.05,0.045), smoothstep(.55,.75,n)*0.8);
        moss = mix(moss, vec3(0.12,0.11,0.06), smoothstep(.72,.8,n2)*0.6);
        diffuseColor.rgb = mix(diffuseColor.rgb*1.05, moss, dirty*0.94);
        float band = exp(-pow((vWP.x-edge)/0.16,2.0));`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.28, 0.98, dirty);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.55,0.85,1.0)*band*2.2;');
  };
  const lay = slopeLayout({ cols: 26, rows: 20, r: 0.3, len: 1.0 });
  const im = tileMesh(lay.length, 44, 0.3, 1.0, mat); scene.add(im);
  const grp = new THREE.Object3D(); grp.rotation.x = -0.32; grp.position.set(0, 0, -7); grp.updateMatrixWorld();
  lay.forEach((t, i) => { im.setMatrixAt(i, _m.compose(t.pos, t.quat, _s).premultiply(grp.matrixWorld)); });
  // spray particles
  const N = 2200, pr = rng(4), seeds = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { seeds[i * 4] = pr(); seeds[i * 4 + 1] = pr(); seeds[i * 4 + 2] = pr(); seeds[i * 4 + 3] = pr(); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); sg.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  const sm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uX0: { value: -14 }, uX1: { value: 14 }, uS0: { value: 0.3 }, uS1: { value: 5.6 } },
    vertexShader: `attribute vec4 seed; uniform float uT,uX0,uX1,uS0,uS1; varying float vA;
      float sweepX(float t){ float k=clamp((t-uS0)/(uS1-uS0),0.,1.); k=-(cos(3.14159*k)-1.)/2.; return mix(uX0,uX1,k); }
      void main(){ float life=.55+seed.w*.5; float age=mod(uT+seed.x*life*7.,life); float birth=uT-age;
        float x0=sweepX(birth); float z0=mix(-15.,2.,seed.y); float y0=-0.32*(z0+7.)*-1.*0.33+0.5;
        vec3 v=vec3(-1.5+seed.z*3.2, 2.0+seed.w*3.5, (seed.z-.5)*2.);
        vec3 p=vec3(x0, y0, z0)+v*age+vec3(0.,-6.*age*age,0.);
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        gl_PointSize=(0.6+seed.x*1.6)*(90./-mv.z);
        float on=step(uS0,birth)*step(birth,uS1);
        vA=(1.-age/life)*on; }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(vec3(.65,.85,1.)*a*vA*0.55,1.); }`,
  });
  const spray = new THREE.Points(sg, sm); spray.frustumCulled = false; scene.add(spray);
  scene.add(dust(500, [30, 8, 30, 0, 3, -6], '#bfe3ff', 0.05, 12, 0.6));
  return {
    scene, cam,
    update(t) {
      const k = E.inOutSine(inv(0.3, 5.6, t));
      uSweep.value = lerp(-14, 14, k);
      sm.uniforms.uT.value = t;
      const c = E.inOutSine(inv(0, 6, t));
      cam.position.set(lerp(-9, 7, c), lerp(8.5, 6.5, c), lerp(7, 5.5, c));
      cam.lookAt(lerp(-4, 5, c), 0, -6);
      cam.rotateZ(-0.04);
    },
  };
});

/* ---- 4. ZINGUERIE: flowing zinc gutters */
shot('zinc', 5.6, () => {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = 1.1;
  scene.add(backdrop('#070b12', '#020305', '#2a4a78', V3(0, 0.6, -1), 5, '#0a1018'));
  scene.fog = new THREE.FogExp2('#03050a', 0.028);
  const cam = new THREE.PerspectiveCamera(40, ASPECT, 0.1, 1000);
  stdLights(scene, { key: '#ffffff', keyI: 3.5, keyPos: V3(4, 10, 2), fill: '#6f8fc0', fillI: 0.5, ground: '#100a06', rim: '#ff9a5a', rimI: 4, rimPos: V3(-6, -2, -10) });
  const pl = new THREE.PointLight('#9cc8ff', 60, 30); pl.position.set(0, 4, -12); scene.add(pl);
  const pl2 = new THREE.PointLight('#ff8a4a', 50, 30); pl2.position.set(-4, -3, -26); scene.add(pl2);
  const ribbons = [];
  const r = rng(77);
  for (let k = 0; k < 9; k++) {
    const pts = []; const ph = r() * 6, amp = 1.5 + r() * 2.5, bx = (k - 4) * 1.25, by = (r() - .5) * 3.2;
    for (let i = 0; i < 10; i++) pts.push(V3(bx + Math.sin(i * 0.8 + ph) * amp, by + Math.cos(i * 0.6 + ph * 1.3) * amp * 0.6, 6 - i * 6));
    const curve = new THREE.CatmullRomCurve3(pts);
    const uR = { value: 0 };
    const copper = k === 4 || k === 1;
    const mat = revealMaterial(new THREE.MeshStandardMaterial({ color: copper ? '#c97b4b' : '#c4cad2', metalness: 1, roughness: copper ? 0.3 : 0.22, side: THREE.DoubleSide, envMapIntensity: 1.3 }), uR, copper ? new THREE.Color('#ff9a5a') : new THREE.Color('#bfe0ff'));
    const R = 0.22 + r() * 0.14;
    const m = new THREE.Mesh(sweep(curve, gutterProfile(R, R * 0.12, 14), 260), mat); m.frustumCulled = false;
    scene.add(m); ribbons.push({ uR, delay: r() * 0.7 });
  }
  // floating standing-seam panels
  const panels = [];
  const pm = new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: 1, roughness: 0.35, envMapIntensity: 1.2 });
  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.03, 1.4), pm); g.add(base);
    for (let j = -2; j <= 2; j++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.04), pm); rib.position.set(0, 0.05, j * 0.33); g.add(rib); }
    g.position.set((r() - .5) * 26, (r() - .5) * 14, -8 - r() * 40); g.rotation.set(r() * 6, r() * 6, r() * 6);
    scene.add(g); panels.push({ g, s: (r() - .5) * 0.6, s2: (r() - .5) * 0.6 });
  }
  scene.add(dust(900, [30, 18, 60, 0, 0, -20], '#cfe4ff', 0.04, 31, 0.7));
  return {
    scene, cam,
    update(t) {
      ribbons.forEach(b => { b.uR.value = E.outCubic(inv(0.0 + b.delay * 0.6, 2.8 + b.delay, t)); });
      panels.forEach(p => { p.g.rotation.set(p.s2 * 3 + p.s * t, p.s * t + p.s2, p.s2 * t); });
      const c = E.inOutSine(inv(0, 5.6, t));
      cam.position.set(Math.sin(c * 2) * 1.5, lerp(3.2, 0.6, c), lerp(14, -10, c));
      cam.lookAt(Math.sin(c * 2 + 0.6) * 1.2, lerp(-0.5, 0, c), lerp(-6, -30, c));
      cam.rotateZ(lerp(-0.25, 0.2, E.inOutCubic(c)));
    },
  };
});

/* ---- 5. DESSOUS DE TOIT: soffit planks flipping into place */
shot('soff', 5.6, () => {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = 0.45;
  scene.add(backdrop('#0e1a2e', '#08090c', '#ff8a40', V3(1, 0.2, 0.2), 8, '#1e1a22'));
  scene.fog = new THREE.Fog('#0b0f16', 18, 40);
  const cam = new THREE.PerspectiveCamera(48, ASPECT, 0.1, 1000);
  stdLights(scene, { key: '#ffc890', keyI: 3.2, keyPos: V3(14, 3.5, 7), fill: '#7d9ccf', fillI: 0.6, ground: '#2a1a10', shadow: 2048, shadowBox: 14, target: V3(0, 3.5, 0) });
  const wallMat = new THREE.MeshStandardMaterial({ color: '#b9ab96', roughness: 0.95, bumpMap: STUCCO, bumpScale: 2.0 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 8, 0.4), wallMat); wall.position.set(0, 0, -0.2); wall.receiveShadow = true; wall.castShadow = true; scene.add(wall);
  const Y = 4.0, DEP = 1.5;
  const wood = new THREE.MeshStandardMaterial({ map: WOOD, color: '#9a7350', roughness: 0.7 });
  for (let x = -14; x <= 14; x += 0.75) { const rf = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, DEP + 0.2), wood); rf.position.set(x, Y + 0.2, DEP / 2 + 0.1); rf.castShadow = true; scene.add(rf); }
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(30, 0.32, 0.05), new THREE.MeshStandardMaterial({ color: '#f1ede6', roughness: 0.5 })); fascia.position.set(0, Y + 0.12, DEP + 0.03); fascia.castShadow = true; scene.add(fascia);
  const zinc = new THREE.MeshStandardMaterial({ color: '#c7ccd2', metalness: 1, roughness: 0.25, envMapIntensity: 1.3 });
  const gut = new THREE.Mesh(sweep(new THREE.LineCurve3(V3(-15, Y + 0.18, DEP + 0.25), V3(15, Y + 0.18, DEP + 0.25)), gutterProfile(0.17, 0.016, 12).map(([x, y]) => [y, -x]), 4), zinc); scene.add(gut);
  const tileLay = []; for (let x = -15; x <= 15; x += 0.5) tileLay.push(x);
  const tim = tileMesh(tileLay.length * 2, 55, 0.25, 0.9);
  tileLay.forEach((x, i) => {
    tim.setMatrixAt(i * 2, _m.compose(V3(x, Y + 0.62, DEP - 0.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.45, 0, Math.PI)), _s));
    tim.setMatrixAt(i * 2 + 1, _m.compose(V3(x + 0.25, Y + 0.58, DEP - 0.14), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.45, 0, 0)), _s));
  });
  tim.position.y = 0.25; scene.add(tim);
  // planks (instanced)
  const PW = 0.14, xs = []; for (let x = -14; x <= 14; x += PW + 0.012) xs.push(x);
  const pg = new THREE.BoxGeometry(PW, 0.025, DEP); pg.translate(0, 0, DEP / 2);
  const plank = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: '#f2eee8', roughness: 0.45, envMapIntensity: 0.8 }), xs.length);
  plank.castShadow = plank.receiveShadow = true; plank.frustumCulled = false; scene.add(plank);
  const pr = rng(3); const pj = xs.map(() => pr());
  scene.add(dust(500, [26, 8, 14, 0, 3, 3], '#ffd9b0', 0.05, 15, 0.8));
  return {
    scene, cam,
    update(t) {
      const c = E.inOutSine(inv(0, 5.6, t));
      xs.forEach((x, i) => {
        const d = (x + 14) / 28; const p = inv(0.2 + d * 3.6 + pj[i] * 0.25, 0.2 + d * 3.6 + pj[i] * 0.25 + 0.75, t);
        const a = (1 - E.outBack(p)) * (Math.PI / 2 + 0.2);
        _v.set(x, Y - (1 - E.outCubic(p)) * 1.2, 0.02);
        _q.setFromEuler(_e.set(a, 0, 0));
        plank.setMatrixAt(i, _m.compose(_v, _q, _s));
      });
      plank.instanceMatrix.needsUpdate = true;
      cam.position.set(lerp(-8, 3, c), lerp(2.0, 2.5, c), lerp(4.4, 3.9, c));
      cam.lookAt(lerp(-4.5, 6.5, c), Y + 0.5, 0.6);
      cam.rotateZ(lerp(0.06, -0.04, c));
    },
  };
});

/* ---- 6. FACADE: wall panels flip from dirty to clean */
shot('faca', 5.8, () => {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = 0.35;
  scene.add(backdrop('#07090e', '#030304', '#ff7a3a', V3(-1, 0.2, 0.3), 8, '#120c0a'));
  scene.fog = new THREE.Fog('#05060a', 16, 40);
  const cam = new THREE.PerspectiveCamera(36, ASPECT, 0.1, 1000);
  stdLights(scene, { key: '#ffd2a6', keyI: 3.0, keyPos: V3(-14, 6, 5), fill: '#7d93c4', fillI: 0.35, ground: '#140c08', rim: '#9fc0ff', rimI: 1.2, rimPos: V3(8, 8, 6), shadow: 2048, shadowBox: 12, target: V3(0, 3.5, 0) });
  const COLS = 30, ROWS = 16, S = 0.52, G = 0.035;
  const geo = new THREE.BoxGeometry(S, S, 0.16);
  const side = new THREE.MeshStandardMaterial({ color: '#8b857b', roughness: 0.9 });
  const clean = new THREE.MeshStandardMaterial({ color: '#d9cfbf', roughness: 0.85, bumpMap: STUCCO, bumpScale: 1.6 });
  const dirty = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1.0, bumpMap: STUCCO, bumpScale: 2.2 });
  dirty.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 _wp = modelMatrix * instanceMatrix * vec4(transformed,1.0); vWP=_wp.xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\n' + NOISE_GLSL)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float st = fbm2(vec2(vWP.x*7.0, vWP.y*0.35));
        float n = fbm2(vWP.xy*1.2);
        vec3 base = mix(vec3(0.20,0.20,0.17), vec3(0.32,0.31,0.27), n);
        base = mix(base, vec3(0.05,0.06,0.035), smoothstep(.45,.75,st)*0.85);
        base = mix(base, vec3(0.06,0.09,0.03), smoothstep(.6,.8,fbm2(vWP.xy*3.+5.))*0.7);
        diffuseColor.rgb = base;`);
  };
  const im = new THREE.InstancedMesh(geo, [side, side, side, side, clean, dirty], COLS * ROWS);
  im.castShadow = im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 1 })); back.position.z = -0.3; back.position.y = 4; scene.add(back);
  const cells = []; const r = rng(17);
  const ox = -(COLS - 1) * (S + G) / 2, oy = 0.4;
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    const x = ox + i * (S + G), y = oy + j * (S + G);
    cells.push({ x, y, d: Math.hypot(x + 9, y - 2.5) / 19 + r() * 0.08 });
  }
  scene.add(dust(600, [24, 10, 12, 0, 4, 4], '#ffd2a6', 0.05, 19, 0.8));
  return {
    scene, cam,
    update(t) {
      cells.forEach((c, i) => {
        const p = inv(0.35 + c.d * 3.4, 0.35 + c.d * 3.4 + 0.9, t); const e = E.inOutCubic(p);
        _v.set(c.x, c.y, Math.sin(p * Math.PI) * 0.7);
        _q.setFromEuler(_e.set(Math.sin(p * Math.PI) * 0.15, Math.PI * (1 - e), 0));
        im.setMatrixAt(i, _m.compose(_v, _q, _s));
      });
      im.instanceMatrix.needsUpdate = true;
      const c = E.inOutSine(inv(0, 5.8, t));
      cam.position.set(lerp(9, 4.5, c), lerp(1.5, 3.2, c), lerp(9.5, 7.5, c));
      cam.lookAt(lerp(-1, -3, c), 4, 0);
    },
  };
});

/* ---- 7. CHARPENTE: blueprint -> beams -> treatment scan */
shot('charp', 6.0, () => {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = 0.3;
  scene.add(backdrop('#05070c', '#030304', '#8a3c16', V3(1, 0.3, -0.5), 10, '#100906'));
  scene.fog = new THREE.Fog('#040508', 12, 34);
  const cam = new THREE.PerspectiveCamera(40, ASPECT, 0.1, 1000);
  stdLights(scene, { key: '#ffcf9a', keyI: 3.6, keyPos: V3(10, 10, 6), fill: '#6f8ab8', fillI: 0.45, ground: '#1a0e06', rim: '#9fd6ff', rimI: 1.5, rimPos: V3(-8, 4, -8), shadow: 2048, shadowBox: 12 });
  const uScan = { value: -12 };
  const wood = new THREE.MeshStandardMaterial({ map: WOOD, roughness: 0.8 });
  wood.onBeforeCompile = sh => {
    sh.uniforms.uScan = uScan;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uScan;\n' + NOISE_GLSL)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float edge = uScan + (fbm2(vWP.yz*2.)-.5)*0.6;
        float treated = 1.-smoothstep(edge-0.15, edge+0.15, vWP.x);
        vec3 raw = vec3(dot(diffuseColor.rgb, vec3(.33)))*vec3(0.95,0.93,0.9)*0.85;
        vec3 tr = diffuseColor.rgb*vec3(1.05,0.72,0.42)*0.95;
        diffuseColor.rgb = mix(raw, tr, treated);
        float band = exp(-pow((vWP.x-edge)/0.12,2.));`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.95, 0.42, treated);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.45,0.85,1.0)*band*2.5;');
  };
  const beams = []; const lines = [];
  const NT = 7, SP = 1.9, w = 0.16, h = 0.24;
  for (let i = 0; i < NT; i++) {
    const x = (i - (NT - 1) / 2) * SP;
    const P = (y, z) => V3(x, y, z);
    const mem = [[P(0, -3.3), P(0, 3.3)], [P(-0.2, -3.5), P(2.75, 0)], [P(-0.2, 3.5), P(2.75, 0)], [P(0, 0), P(2.6, 0)], [P(0.45, 0), P(1.45, -1.75)], [P(0.45, 0), P(1.45, 1.75)]];
    mem.forEach(([a, b], k) => beams.push({ a, b, w, h, delay: i * 0.13 + k * 0.05 }));
  }
  const xa = -(NT - 1) / 2 * SP - 0.5, xb = -xa;
  const along = [[2.95, 0], [1.05, -2.0], [1.05, 2.0], [2.0, -1.0], [2.0, 1.0]];
  along.forEach(([y, z], k) => beams.push({ a: V3(xa, y, z), b: V3(xb, y, z), w: 0.14, h: 0.18, delay: 0.9 + k * 0.08 }));
  const r = rng(13);
  const LP = [];
  beams.forEach(b => {
    b.mesh = beam(b.a, b.b, b.w, b.h, wood); scene.add(b.mesh);
    b.p0 = b.mesh.position.clone(); b.q0 = b.mesh.quaternion.clone();
    b.from = b.p0.clone().add(V3((r() - .5) * 6, -6 - r() * 6, (r() - .5) * 6)); b.qf = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 4, r() * 4, r() * 4)).multiply(b.q0);
    LP.push(b.a.x, b.a.y, b.a.z, b.b.x, b.b.y, b.b.z);
  });
  const blue = drawLines(LP, '#ff8a4a', 16); scene.add(blue);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: '#0e0e10' })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.25; floor.receiveShadow = true; scene.add(floor);
  // mist at scan plane
  const N = 1400, pr = rng(8), sd = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) sd[i] = pr();
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); mg.setAttribute('sd', new THREE.BufferAttribute(sd, 3));
  const mm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uX: uScan, uT: { value: 0 }, uO: { value: 0 } },
    vertexShader: `attribute vec3 sd; uniform float uX,uT; varying float vA; void main(){ float ph=fract(sd.x+uT*.8); vec3 p=vec3(uX-ph*1.2+(sd.z-.5)*.3, sd.y*3.2-0.1, (sd.z*2.-1.)*3.6*(1.-sd.y*.85)); vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(0.6+sd.z*1.4)*(90./-mv.z); vA=(1.-ph)*.6; }`,
    fragmentShader: `uniform float uO; varying float vA; void main(){ float d=length(gl_PointCoord-.5); gl_FragColor=vec4(vec3(.5,.85,1.)*smoothstep(.5,0.,d)*vA*uO,1.); }`,
  });
  const mist = new THREE.Points(mg, mm); mist.frustumCulled = false; scene.add(mist);
  scene.add(dust(500, [20, 8, 14, 0, 2, 0], '#ffcf9a', 0.05, 23, 0.8));
  return {
    scene, cam,
    update(t) {
      blue.material.uniforms.uR.value = E.inOutCubic(inv(0.0, 1.3, t));
      blue.material.uniforms.uA.value = 1 - ss(2.2, 3.2, t);
      beams.forEach(b => {
        const p = E.outExpo(inv(0.6 + b.delay, 0.6 + b.delay + 1.0, t));
        b.mesh.position.lerpVectors(b.from, b.p0, p); b.mesh.quaternion.slerpQuaternions(b.qf, b.q0, p);
        b.mesh.visible = p > 0.001;
      });
      uScan.value = lerp(-7.5, 7.5, E.inOutSine(inv(2.2, 5.8, t)));
      mm.uniforms.uT.value = t; mm.uniforms.uO.value = ss(2.1, 2.5, t) * (1 - ss(5.6, 5.9, t));
      const c = E.inOutSine(inv(0, 6, t));
      cam.position.set(lerp(-9, 2.5, c), lerp(0.7, 1.4, c), lerp(4.6, 4.0, c));
      cam.lookAt(lerp(-3, 6, c), 1.9, -0.5);
      cam.rotateZ(0.05);
    },
  };
});

/* ---- 8. ISOLATION: blown insulation fills the attic */
let isolT = 0;
shot('isol', 6.2, () => {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = 0.35;
  scene.add(backdrop('#0c1a2c', '#120804', '#2c5a90', V3(0, 1, -0.4), 3, '#0a0a10'));
  scene.fog = new THREE.Fog('#05070b', 16, 40);
  const cam = new THREE.PerspectiveCamera(34, ASPECT, 0.1, 1000);
  stdLights(scene, { key: '#ffe6c8', keyI: 2.8, keyPos: V3(6, 12, 8), fill: '#6f90c8', fillI: 0.5, ground: '#3a1a08', rim: '#ff8a40', rimI: 2.5, rimPos: V3(-6, -4, 6), shadow: 2048, shadowBox: 9 });
  const LX = 4.2, HZ = 3.4, AP = 2.8;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(LX * 2 + 0.4, 0.25, HZ * 2 + 0.4), new THREE.MeshStandardMaterial({ color: '#5a5650', roughness: 0.9 })); slab.position.y = -0.125; slab.receiveShadow = slab.castShadow = true; scene.add(slab);
  const wood = new THREE.MeshStandardMaterial({ map: WOOD, color: '#d8b48a', roughness: 0.7 });
  for (let x = -LX; x <= LX + 0.01; x += 1.4) { scene.add(beam(V3(x, 0, -HZ), V3(x, AP, 0), 0.12, 0.18, wood)); scene.add(beam(V3(x, 0, HZ), V3(x, AP, 0), 0.12, 0.18, wood)); }
  scene.add(beam(V3(-LX - 0.2, AP, 0), V3(LX + 0.2, AP, 0), 0.14, 0.2, wood));
  const glass = new THREE.MeshStandardMaterial({ color: '#9cc4ff', transparent: true, opacity: 0.06, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  const sl = Math.hypot(HZ, AP);
  for (const s of [1, -1]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(LX * 2, sl), glass); g.position.set(0, AP / 2, s * HZ / 2); g.rotation.x = -s * (Math.PI / 2 - Math.atan2(AP, HZ)); scene.add(g); }
  const L = []; for (const x of [-LX, LX]) { L.push(x, 0, -HZ, x, AP, 0, x, AP, 0, x, 0, HZ, x, 0, HZ, x, 0, -HZ); }
  L.push(-LX, AP, 0, LX, AP, 0, -LX, 0, HZ, LX, 0, HZ, -LX, 0, -HZ, LX, 0, -HZ);
  const outl = drawLines(L, '#ff8a4a', 20); scene.add(outl);
  // warm house below
  const below = new THREE.Mesh(new THREE.BoxGeometry(LX * 2, 3, HZ * 2), new THREE.MeshStandardMaterial({ color: '#0c0807', emissive: new THREE.Color('#ff5a18'), emissiveIntensity: 0.0, roughness: 1 })); below.position.y = -1.75; scene.add(below);
  // fibres
  const N = 5200, r = rng(29);
  const fg = new THREE.IcosahedronGeometry(0.085, 0);
  const fm = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
  const im = new THREE.InstancedMesh(fg, fm, N); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
  const FIB = ['#f3e6c4', '#ead7a4', '#fff3dc', '#e2c98e', '#f7ecd0'].map(c => new THREE.Color(c));
  const fib = [];
  for (let i = 0; i < N; i++) {
    const y = Math.pow(r(), 0.8) * 1.0 + 0.05; const x = (r() * 2 - 1) * (LX - 0.1); const zmax = HZ * (1 - y / AP) - 0.12; const z = (r() * 2 - 1) * zmax;
    const order = clamp((LX - x) / (2 * LX) * 0.85 + r() * 0.15 + y * 0.05);
    fib.push({ tgt: V3(x, y, z), order, spread: V3((r() - .5) * 1.4, (r() - .5) * 0.8, (r() - .5) * 1.4), rot: new THREE.Euler(r() * 6, r() * 6, r() * 6), s: 0.7 + r() * 0.9 });
    im.setColorAt(i, FIB[(r() * FIB.length) | 0]);
  }
  // heat particles
  const HN = 900, hs = new Float32Array(HN * 3); for (let i = 0; i < HN * 3; i++) hs[i] = r();
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(HN * 3), 3)); hg.setAttribute('sd', new THREE.BufferAttribute(hs, 3));
  const hm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uF: { value: 0 } },
    vertexShader: `attribute vec3 sd; uniform float uT,uF; varying float vA;
      void main(){ float x=(sd.x*2.-1.)*4.; float z=(sd.z*2.-1.)*3.2; float ph=fract(sd.y+uT*.35);
        float y=-3.+ph*8.; float covered=step(x, mix(4.6,-4.6,uF)); float cap=mix(9.,0.,covered);
        vA=(1.-ph)*.9; if(y>cap){ vA*=max(0.,1.-(y-cap)*3.); y=cap-(y-cap)*.15; }
        float zl=3.2*(1.-max(y,0.)/2.8); z=clamp(z,-zl,zl);
        vec4 mv=modelViewMatrix*vec4(x,y,z,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(1.+sd.z*2.)*(90./-mv.z); }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-.5); gl_FragColor=vec4(vec3(1.,.45,.15)*smoothstep(.5,0.,d)*vA*1.1,1.); }`,
  });
  const heat = new THREE.Points(hg, hm); heat.frustumCulled = false; scene.add(heat);
  scene.add(dust(500, [24, 10, 20, 0, 2, 0], '#ffe6c8', 0.04, 41, 0.6));
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.4, 16), new THREE.MeshStandardMaterial({ color: '#2b2b2b', metalness: 0.6, roughness: 0.4 })); scene.add(nozzle);
  const T0 = 0.5, T1 = 4.7;
  return {
    scene, cam,
    update(t) {
      isolT = t;
      outl.material.uniforms.uR.value = E.inOutCubic(inv(0, 1.2, t)); outl.material.uniforms.uA.value = 0.8;
      const front = lerp(LX, -LX, inv(T0, T1, t));
      nozzle.position.set(front, 1.6, 0.3 * Math.sin(t * 3)); nozzle.rotation.z = 0.5;
      fib.forEach((f, i) => {
        const b = T0 + f.order * (T1 - T0 - 0.5); const p = inv(b, b + 0.55, t);
        if (p <= 0) { im.setMatrixAt(i, _m.makeScale(0, 0, 0)); return; }
        const e = E.outCubic(p);
        const src = V3(lerp(LX, -LX, inv(T0, T1, b)), 1.5, 0);
        const ctrl = src.clone().add(f.spread).add(V3(0, 0.8, 0));
        const a = src.clone().lerp(ctrl, e), bb = ctrl.clone().lerp(f.tgt, e); a.lerp(bb, e);
        _q.setFromEuler(_e.set(f.rot.x + t * (1 - e) * 4, f.rot.y, f.rot.z));
        const sc = f.s * lerp(0.3, 1, e);
        im.setMatrixAt(i, _m.compose(a, _q, _s.set(sc, sc * 0.8, sc)));
      });
      _s.set(1, 1, 1);
      im.instanceMatrix.needsUpdate = true;
      hm.uniforms.uT.value = t; hm.uniforms.uF.value = inv(T0, T1, t);
      below.material.emissiveIntensity = 0.12 + 0.1 * ss(3, 5, t);
      const c = E.inOutSine(inv(0, 6.2, t));
      const ang = lerp(0.95, 0.35, c), rad = lerp(14.5, 12.2, c);
      cam.position.set(Math.sin(ang) * rad - 0.5, lerp(5.2, 3.4, c), Math.cos(ang) * rad);
      cam.lookAt(0, 0.5, 0);
      cam.setViewOffset(W, H, W * 0.12, 0, W, H);
    },
  };
});

/* ---- 9. OUTRO */
shot('outro', 10.0, () => {
  const scene = new THREE.Scene(); scene.environment = ENV; scene.environmentIntensity = 0.35;
  scene.add(backdrop('#0a1424', '#0a0604', '#ff8a3a', V3(1, 0.08, -0.6), 8, '#3a1a0c'));
  scene.fog = new THREE.Fog('#160c08', 28, 80);
  const cam = new THREE.PerspectiveCamera(30, ASPECT, 0.1, 1000);
  stdLights(scene, { key: '#ffb67a', keyI: 4.0, keyPos: V3(16, 5, -8), fill: '#6f8fc8', fillI: 0.5, ground: '#2a140a', rim: '#a9c4ff', rimI: 0.8, rimPos: V3(-10, 8, 10), shadow: 2048, shadowBox: 12 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshLambertMaterial({ color: '#16110d' })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const house = buildHouse(21, { gutters: true }); scene.add(house.group);
  house.outline.material.uniforms.uR.value = 1; house.outline.material.uniforms.uA.value = 0.18;
  house.winMat.emissiveIntensity = 2.4;
  const ring = new THREE.Mesh(new THREE.RingGeometry(7.6, 7.66, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a3a').multiplyScalar(2.5) })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  scene.add(dust(1000, [50, 16, 50, 0, 6, 0], '#ffc28a', 0.06, 47, 0.9));
  return {
    scene, cam,
    update(t) {
      const c = E.inOutSine(inv(0, 10, t));
      const ang = lerp(0.55, 1.35, c), rad = lerp(19, 27, E.outCubic(inv(0, 10, t)));
      cam.position.set(Math.sin(ang) * rad, lerp(4, 9, c), Math.cos(ang) * rad);
      cam.lookAt(0, lerp(3.3, 2.5, c), 0);
      cam.setViewOffset(W, H, 0, lerp(0, -H * 0.06, ss(2.5, 5, t)), W, H);
    },
  };
});

/* ---------------------------------------------------------------- timeline */
const TR = 0.9;
const TMODES = [0, 4, 1, 3, 2, 0, 4, 2];
let acc = 0;
shots.forEach((s, i) => { s.start = acc; s.end = acc + s.dur; acc += s.dur - TR; });
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
      col=mix(a,b,smoothstep(.42,.58,p)) + vec3(1.,.8,.65)*pow(k,10.)*0.8;
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
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.6, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const gradePass = new ShaderPass(gradeMat);
composer.addPass(gradePass);

/* ------------------------------------------------------------------- DOM */
const $ = s => document.querySelector(s);
function split(el, accent) {
  const txt = el.textContent; el.textContent = '';
  const out = [];
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

const CARDS = {
  couv: { n: '01', k: 'Toiture', t: ['Couverture'], s: 'Réfection · Rénovation · Entretien', side: 'left' },
  nett: { n: '02', k: 'Toiture', t: ['Nettoyage', 'de toiture'], s: 'Démoussage · Traitement · Hydrofuge', side: 'right' },
  zinc: { n: '03', k: 'Métal', t: ['Zinguerie'], s: 'Gouttières · Descentes · Habillages', side: 'left' },
  soff: { n: '04', k: 'Finitions', t: ['Dessous', 'de toit'], s: 'Habillage & rénovation des avancées', side: 'left' },
  faca: { n: '05', k: 'Murs', t: ['Nettoyage', 'façade'], s: 'Démoussage · Lavage · Protection', side: 'right' },
  charp: { n: '06', k: 'Structure', t: ['Traitement', 'de charpente'], s: 'Préventif & curatif · Insectes · Champignons', side: 'left' },
  isol: { n: '07', k: 'Confort', t: ['Isolation', 'des combles'], s: 'Soufflage · Confort thermique · Économies', side: 'left' },
};
const cardEls = {};
for (const [id, c] of Object.entries(CARDS)) {
  const ghost = document.createElement('div'); ghost.className = 'ghost ' + c.side; ghost.textContent = c.n;
  const el = document.createElement('div'); el.className = 'card ' + c.side;
  el.innerHTML = `<div class="kick">${c.side === 'right' ? '' : '<span class="ln"></span>'}<span class="mask"><span class="ch">${c.n} — ${c.k}</span></span>${c.side === 'right' ? '<span class="ln"></span>' : ''}</div><h2>${c.t.map(l => `<span class="mask" data-l>${l}</span>`).join('')}</h2><div class="sub"><span class="mask"><span class="ch">${c.s}</span></span></div>`;
  $('#cards').append(ghost, el);
  const lines = [...el.querySelectorAll('[data-l]')].map(l => split(l));
  cardEls[id] = { el, ghost, chars: lines.flat(), kick: el.querySelector('.kick .ch'), ln: el.querySelector('.ln'), sub: el.querySelector('.sub .ch'), side: c.side };
}

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
function setVis(el, v) { el.style.visibility = v ? 'visible' : 'hidden'; }

function updateDOM(T) {
  // intro
  const si = shots[0], ti = T - si.start, introOn = T < si.end;
  setVis($('#intro'), introOn);
  if (introOn) {
    const tOut = si.dur - TR - 0.55;
    const k = $('#intro .kick');
    lineAnim(k.querySelector('.ch'), ti, 3.0, tOut);
    k.querySelector('.ln').style.transform = `scaleX(${(E.outExpo(inv(2.9, 3.9, ti)) * (1 - E.inCubic(inv(tOut, tOut + .4, ti)))).toFixed(3)})`;
    const h = [...document.querySelectorAll('#intro h1 [data-split]')];
    charsAnim(h[0]._chars, ti, 3.25, tOut, 0.06, 1.1);
    charsAnim(h[1]._chars, ti, 3.45, tOut + 0.05, 0.06, 1.1);
    lineAnim($('#intro .sub .ch'), ti, 4.2, tOut + 0.1);
  }
  // cards
  for (const s of shots) {
    const c = cardEls[s.id]; if (!c) continue;
    const t = T - s.start; const on = T >= s.start && T < s.end;
    setVis(c.el, on); setVis(c.ghost, on);
    if (!on) continue;
    const tIn = 0.45, tOut = s.dur - TR - 0.5;
    lineAnim(c.kick, t, tIn, tOut);
    c.ln.style.transform = `scaleX(${(E.outExpo(inv(tIn - 0.1, tIn + 0.8, t)) * (1 - E.inCubic(inv(tOut, tOut + .4, t)))).toFixed(3)})`;
    charsAnim(c.chars, t, tIn + 0.15, tOut + 0.05);
    lineAnim(c.sub, t, tIn + 0.7, tOut + 0.1);
    const gi = E.outExpo(inv(0.2, 1.6, t)), go = E.inCubic(inv(tOut, tOut + 0.6, t));
    const dir = c.side === 'left' ? -1 : 1;
    c.ghost.style.transform = `translate3d(${(dir * (1 - gi) * 160 + dir * t * 14).toFixed(1)}px,0,0) scale(${(1.08 - gi * 0.08).toFixed(3)})`;
    c.ghost.style.opacity = (gi * (1 - go)).toFixed(3);
  }
  // stat (isolation)
  const is = shots.find(s => s.id === 'isol'); const ts = T - is.start; const sOn = T >= is.start && T < is.end;
  setVis($('#stat'), sOn);
  if (sOn) {
    const tOut = is.dur - TR - 0.5;
    const n = $('#statNum'); const cnt = Math.round(30 * E.outCubic(inv(1.6, 3.4, ts)));
    n.innerHTML = `${cnt}<small>%</small>`;
    lineAnim(n, ts, 1.5, tOut);
    $('#stat .lbl').querySelectorAll('.ch').forEach((e, i) => lineAnim(e, ts, 1.8 + i * 0.12, tOut + 0.05));
  }
  // HUD
  const hudIn = ss(shots[1].start - 0.2, shots[1].start + 0.6, T) * (1 - ss(shots[8].start, shots[8].start + 0.6, T));
  $('#hud').style.opacity = hudIn.toFixed(3);
  $('#shade').style.opacity = (ss(2.6, 3.6, T) * (1 - ss(shots[8].start + 1.5, shots[8].start + 3, T))).toFixed(3);
  const idx = Math.max(1, Math.min(7, shots.findIndex(s => T >= s.start && T < s.end - TR * 0.5)));
  $('#cnt').textContent = `0${idx} / 07`;
  $('#prog').style.width = (clamp((T - shots[1].start) / (shots[8].start - shots[1].start)) * 100).toFixed(2) + '%';
  // outro
  const so = shots[8], to = T - so.start, oOn = T >= so.start;
  setVis($('#outro'), oOn);
  $('#vig').style.opacity = oOn ? (ss(2.2, 3.6, to) * 0.95).toFixed(3) : '0';
  if (oOn) {
    const L1 = $('#lg1'), L2 = $('#lg2');
    const l1 = 140, l2 = 70;
    const d1 = E.inOutCubic(inv(2.8, 3.9, to)), d2 = E.inOutCubic(inv(3.2, 4.1, to));
    L1.style.strokeDasharray = l1; L1.style.strokeDashoffset = (l1 * (1 - d1)).toFixed(2);
    L2.style.strokeDasharray = l2; L2.style.strokeDashoffset = (l2 * (1 - d2)).toFixed(2);
    const h = [...document.querySelectorAll('#outro h1 [data-split]')];
    charsAnim(h[0]._chars, to, 3.3, 99, 0.05, 1.0);
    charsAnim(h[1]._chars, to, 3.5, 99, 0.05, 1.0);
    $('#outro .svc').querySelectorAll('.ch').forEach((e, i) => lineAnim(e, to, 4.3 + i * 0.12, 99));
    $('#outro .sep').style.transform = `scaleX(${E.outExpo(inv(4.7, 5.9, to)).toFixed(3)})`;
    lineAnim($('#outro .loc .ch'), to, 5.0, 99);
    charsAnim($('#outro .tel [data-split]')._chars, to, 5.3, 99, 0.035, 0.9);
    lineAnim($('#outro .web .ch'), to, 6.1, 99);
  }
}

/* ------------------------------------------------------------------ render */
function renderAt(T) {
  T = clamp(T, 0, TOTAL - 1e-4);
  dustMats.forEach(m => (m.uniforms.uT.value = T));
  let i = shots.findIndex(s => T >= s.start && T < s.end);
  const a = shots[i], b = shots[i + 1];
  a.update(T - a.start);
  renderer.setRenderTarget(rtA); renderer.render(a.scene, a.cam);
  compMat.uniforms.tA.value = rtA.texture;
  if (b && T >= b.start) {
    b.update(T - b.start);
    renderer.setRenderTarget(rtB); renderer.render(b.scene, b.cam);
    compMat.uniforms.tB.value = rtB.texture;
    compMat.uniforms.p.value = (T - b.start) / TR;
    compMat.uniforms.mode.value = TMODES[i];
  } else compMat.uniforms.mode.value = -1;
  renderer.setRenderTarget(null);
  gradeMat.uniforms.uT.value = T;
  gradeMat.uniforms.uFade.value = 1 - ss(0, 0.6, T);
  composer.render();
  updateDOM(T);
}
window.renderAt = renderAt; window.__bloom = bloom; window.__shots = shots; window.__dbg = { THREE, renderer, composer, compMat, gradeMat, rtA };
window.renderFrame = f => renderAt(f / FPS);

document.fonts.ready.then(() => {
  renderAt(0);
  window.__ready = true;
  const q = new URLSearchParams(location.search);
  if (q.has('t')) renderAt(+q.get('t'));
  if (q.has('play')) { const t0 = performance.now(); const loop = () => { renderAt(((performance.now() - t0) / 1000) % TOTAL); requestAnimationFrame(loop); }; loop(); }
});
