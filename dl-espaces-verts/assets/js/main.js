/* ==========================================================
   DL Espaces Verts — expérience « film »
   ========================================================== */

/* ---- À COMPLÉTER avec les vraies coordonnées de l'entreprise ---- */
const CONFIG = {
  phone: '06 XX XX XX XX',          // ex. '06 12 34 56 78'
  email: 'contact@exemple.fr',      // adresse qui recevra les demandes de devis
  facebook: 'https://www.facebook.com/' // lien de la page Facebook DL Espaces Verts
};

(() => {
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const hasGSAP = !!(window.gsap && window.ScrollTrigger);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function rng(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const f1 = n => n.toFixed(1);

/* ==========================================================
   Générateurs SVG (style illustré du logo)
   ========================================================== */
const COL = { brown: '#402711', brown2: '#2e1b0b', green: '#165026', green2: '#0b4e1e', white: '#ffffff' };

function hill(w, h, base, amp, seed, step = 50) {
  const r = rng(seed), p1 = r() * 6.28, p2 = r() * 6.28;
  const k1 = (1 + r() * .8) * Math.PI * 2 / w, k2 = (2.5 + r() * 2) * Math.PI * 2 / w;
  const y = x => base + Math.sin(x * k1 + p1) * amp + Math.sin(x * k2 + p2) * amp * .35;
  const pts = [];
  for (let x = -step * 2; x <= w + step * 2; x += step) pts.push([x, y(x)]);
  let d = `M${pts[0][0]},${h + 60}L${pts[0][0]},${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    d += `Q${x0},${f1(y0)} ${(x0 + x1) / 2},${f1((y0 + y1) / 2)}`;
  }
  const last = pts[pts.length - 1];
  d += `L${last[0]},${f1(last[1])}L${last[0]},${h + 60}Z`;
  return { d, y };
}

function oak(x, y, h, seed, o = {}) {
  const r = rng(seed), tc = o.trunk || COL.brown, tw = h * .045;
  const cy = y - h * .66, rx = h * (o.rx || .42), ry = h * .3;
  let s = `<path d="M${f1(x - tw * 1.7)},${y} Q${f1(x - tw * .8)},${f1(y - h * .15)} ${f1(x - tw * .75)},${f1(y - h * .4)} L${f1(x - tw * .4)},${f1(y - h * .64)} L${f1(x + tw * .4)},${f1(y - h * .64)} L${f1(x + tw * .75)},${f1(y - h * .4)} Q${f1(x + tw * .8)},${f1(y - h * .15)} ${f1(x + tw * 1.7)},${y}Z" fill="${tc}"/>`;
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, sy = y - h * (.36 + r() * .24), a = -Math.PI / 2 + side * (.35 + r() * .8);
    const len = h * (.18 + r() * .2), ex = x + Math.cos(a) * len, ey = sy + Math.sin(a) * len;
    s += `<path d="M${f1(x)},${f1(sy)}Q${f1(x + side * len * .25)},${f1(sy - len * .5)} ${f1(ex)},${f1(ey)}" stroke="${tc}" stroke-width="${f1(tw * (.95 - r() * .45))}" fill="none" stroke-linecap="round"/>`;
  }
  const leaves = [], n = o.n || 58;
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * .92;
    const px = x + Math.cos(a) * rx * d, py = cy + Math.sin(a) * ry * d + (r() - .5) * 10;
    const rr = h * (.055 + r() * .07), rel = (py - cy) / ry;
    leaves.push([rel > .25 ? 1 : rel < -.3 ? 3 : 2, px, py, rr]);
  }
  leaves.sort((a, b) => a[0] - b[0]);
  let c = `<g class="crown">`;
  for (const [sh, px, py, rr] of leaves) {
    c += o.colors
      ? `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(rr)}" fill="${o.colors[sh - 1]}"/>`
      : `<circle class="lf l${sh}" cx="${f1(px)}" cy="${f1(py)}" r="${f1(rr)}"/>`;
  }
  c += '</g>';
  let extra = '';
  if (o.blossom) {
    extra += '<g class="blossom">';
    for (let i = 0; i < 70; i++) {
      const a = r() * 6.283, d = Math.sqrt(r()) * .95;
      extra += `<circle cx="${f1(x + Math.cos(a) * rx * d)}" cy="${f1(cy + Math.sin(a) * ry * d)}" r="${f1(3 + r() * 5)}" fill="${r() > .5 ? '#f7c6d3' : '#fde4ea'}"/>`;
    }
    extra += '</g>';
  }
  return `<g class="${o.cls || ''}">${s}${c}${extra}</g>`;
}

function poplar(x, y, h, w, color) {
  return `<line x1="${x}" y1="${f1(y - h * .14)}" x2="${x}" y2="${y}" stroke="${COL.brown}" stroke-width="${f1(w * .18)}" stroke-linecap="round"/>` +
    `<path d="M${x},${f1(y - h)} C${f1(x + w * 1.25)},${f1(y - h * .62)} ${f1(x + w)},${f1(y - h * .14)} ${x},${f1(y - h * .1)} C${f1(x - w)},${f1(y - h * .14)} ${f1(x - w * 1.25)},${f1(y - h * .62)} ${x},${f1(y - h)}Z" fill="${color}"/>`;
}

function house(x, y, s = 1, snow = false) {
  const B = COL.brown, R = COL.brown2;
  const win = (wx, wy, sz) => `<rect x="${wx}" y="${wy}" width="${sz}" height="${sz}" fill="#fff"/><path d="M${wx + sz / 2},${wy}V${wy + sz}M${wx},${wy + sz / 2}H${wx + sz}" stroke="${B}" stroke-width="${sz * .14}"/>`;
  let g = `<g transform="translate(${x},${y}) scale(${s})">`;
  g += `<rect x="-112" y="-150" width="20" height="44" fill="${R}"/>`;
  g += `<rect x="-120" y="-95" width="140" height="95" fill="${B}"/>`;
  g += `<path d="M-138,-88 L-50,-162 L38,-88Z" fill="${R}"/>`;
  g += win(-88, -72, 34);
  g += `<rect x="0" y="-112" width="122" height="112" fill="${B}"/>`;
  g += `<path d="M-22,-100 L61,-178 L144,-100" fill="${R}" stroke="#fff" stroke-width="7" stroke-linejoin="miter"/>`;
  g += `<path d="M-6,-100 L61,-162 L128,-100Z" fill="${B}"/>`;
  g += win(42, -80, 36);
  if (snow) g += `<g class="snowy"><path d="M-138,-88 L-50,-162 L38,-88 L28,-92 L-50,-152 L-128,-92Z" fill="#fff"/><path d="M-26,-100 L61,-182 L148,-100 L138,-104 L61,-172 L-16,-104Z" fill="#fff"/></g>`;
  return g + '</g>';
}

function climber(x, y, s = 1, color = COL.green2, helmet = '#e3b866') {
  return `<g transform="translate(${x},${y}) scale(${s})">` +
    `<g stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">` +
    `<path d="M0,-30 L4,-8"/><path d="M1,-26 L14,-40"/><path d="M3,-21 L14,-28"/>` +
    `<path d="M4,-8 L-9,-3 L-18,9"/><path d="M4,-8 L-5,6 L-17,15"/></g>` +
    `<rect x="-1" y="-14" width="11" height="6" rx="2" fill="#c0392b"/>` +
    `<circle cx="-1" cy="-38" r="6.5" fill="${helmet}"/></g>`;
}

function grassBlades(w, yfn, n, seed, colors, hmin, hmax) {
  const r = rng(seed); let s = '';
  for (let g = 0; g < 3; g++) {
    s += `<g class="sway ${g ? 'd' + (g + 1) : ''}">`;
    for (let i = 0; i < n / 3; i++) {
      const x = r() * w, y = yfn(x) + 6, h = hmin + r() * (hmax - hmin), lean = (r() - .5) * h * .5;
      s += `<path d="M${f1(x - 3)},${f1(y)} Q${f1(x + lean * .4)},${f1(y - h * .6)} ${f1(x + lean)},${f1(y - h)} Q${f1(x + lean * .3 + 2)},${f1(y - h * .5)} ${f1(x + 3)},${f1(y)}Z" fill="${colors[i % colors.length]}"/>`;
    }
    s += '</g>';
  }
  return s;
}

function bush(x, y, rad, seed, colors) {
  const r = rng(seed); let s = '';
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + r() * Math.PI, d = r() * rad * .7;
    s += `<circle cx="${f1(x + Math.cos(a) * d * 1.3)}" cy="${f1(y + Math.sin(a) * d * .8)}" r="${f1(rad * (.35 + r() * .35))}" fill="${colors[i % colors.length]}"/>`;
  }
  return s;
}

/* ==========================================================
   Scène d'ouverture
   ========================================================== */
function buildHero() {
  const W = 1600, H = 900;
  // Lointain : collines bleutées, cyprès, clocher de bastide
  const far1 = hill(W, H, 560, 30, 11), far2 = hill(W, H, 600, 24, 12);
  let far = `<g class="mp"><path d="${far1.d}" fill="#8aa596" opacity=".85"/>`;
  const r = rng(5);
  for (let i = 0; i < 26; i++) { const x = r() * W; far += poplar(x, far1.y(x) + 6, 24 + r() * 22, 5 + r() * 3, '#6d8b7a'); }
  far += `<g fill="#6d8b7a"><rect x="236" y="${f1(far1.y(250) - 40)}" width="28" height="44"/><path d="M232,${f1(far1.y(250) - 40)} L250,${f1(far1.y(250) - 84)} L268,${f1(far1.y(250) - 40)}Z"/><rect x="200" y="${f1(far1.y(250) - 18)}" width="90" height="22"/></g>`;
  far += `<path d="${far2.d}" fill="#6f8f78"/></g>`;
  $('#l-far').innerHTML = far;

  // Plan moyen : tournesols, vignes, peupliers, ferme
  const mid = hill(W, H, 645, 36, 3);
  let m = `<g class="mp"><path d="${mid.d}" fill="#3f7343"/>`;
  const r2 = rng(9);
  for (let i = 0; i < 260; i++) {
    const x = 90 + r2() * 420, y = mid.y(x) + 10 + r2() * 70;
    if (y > mid.y(x) + 4) m += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2.2 + (y - mid.y(x)) * .03)}" fill="#f2c230"/>`;
  }
  for (let row = 0; row < 7; row++) {
    let d = '';
    for (let x = 1040; x <= 1560; x += 20) d += `${x === 1040 ? 'M' : 'L'}${x},${f1(mid.y(x) + 14 + row * 11)}`;
    m += `<path d="${d}" stroke="#285a2d" stroke-width="3.2" stroke-dasharray="2 6" stroke-linecap="round" fill="none"/>`;
  }
  m += poplar(560, mid.y(560) + 8, 120, 16, '#22592c') + poplar(596, mid.y(596) + 8, 96, 13, '#2b6633') + poplar(1180, mid.y(1180) + 8, 110, 15, '#22592c');
  const fx = 1390, fy = mid.y(1390) + 6;
  m += `<g><rect x="${fx - 40}" y="${fy - 34}" width="80" height="34" fill="#7a5a3a"/><path d="M${fx - 48},${fy - 32} L${fx},${fy - 62} L${fx + 48},${fy - 32}Z" fill="#9b4b2c"/><rect x="${fx + 14}" y="${fy - 70}" width="9" height="20" fill="#5a3d24"/>`;
  for (let i = 0; i < 3; i++) m += `<circle class="smoke" style="animation-delay:${i * 2}s" cx="${fx + 18}" cy="${fy - 76}" r="7" fill="#e9e2d6"/>`;
  m += `</g></g>`;
  $('#l-mid').innerHTML = m;

  // Plan principal : maison, chêne, grimpeur-élagueur
  const g = hill(W, H, 738, 18, 7);
  let mm = `<g class="mp"><path d="${g.d}" fill="#1f5f2f"/>`;
  mm += `<path d="M180,${f1(g.y(180) + 40)} Q700,${f1(g.y(700) - 30)} 1500,${f1(g.y(1500) + 10)}" stroke="#fff" stroke-opacity=".55" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  mm += `<path d="M180,${f1(g.y(180) + 60)} Q700,${f1(g.y(700) - 5)} 1500,${f1(g.y(1500) + 30)}" stroke="${COL.green2}" stroke-width="18" fill="none" stroke-linecap="round" opacity=".7"/>`;
  mm += `<g class="sway d2">${poplar(395, g.y(395) + 6, 150, 24, COL.green2)}</g><g class="sway d3">${poplar(440, g.y(440) + 6, 118, 19, '#1d6b2e')}</g>`;
  mm += house(650, g.y(650) + 8, .95);
  mm += bush(770, g.y(770) + 10, 34, 4, ['#185a29', '#2a7a3a', '#0f4a1e']);
  mm += oak(930, g.y(930) + 8, 560, 42, { colors: ['#0b3f19', '#165026', '#2f7a3c'] });
  const ropeX = 981, ropeTop = 400, ground = g.y(ropeX);
  mm += `<g class="swing" style="transform-origin:${ropeX}px ${ropeTop}px"><line x1="${ropeX}" y1="${ropeTop}" x2="${ropeX}" y2="${f1(ground)}" stroke="#d8b46a" stroke-width="2.5"/>${climber(ropeX - 14, 610, 1.15, '#e8742a', '#f5f1e6')}</g>`;
  mm += `</g>`;
  $('#l-main').innerHTML = mm;

  // Premier plan : herbes hautes, fleurs sauvages, buissons de cadrage
  const fr = hill(W, H, 862, 26, 21);
  let f = `<g class="mp"><path d="${fr.d}" fill="#0b2a13"/>`;
  f += bush(60, 900, 150, 3, ['#081f0e', '#0d2e15', '#0a2611']) + bush(1560, 905, 170, 8, ['#081f0e', '#0d2e15', '#0a2611']);
  f += grassBlades(W, fr.y, 150, 31, ['#0f3318', '#16421f', '#0b2a13', '#1d4f25'], 26, 78);
  const r3 = rng(77);
  for (let i = 0; i < 24; i++) {
    const x = 120 + r3() * 1360, y = fr.y(x) - 10 - r3() * 40, c = ['#f5f1e6', '#f2c230', '#b48ad6', '#f5f1e6'][i % 4];
    f += `<g class="sway ${i % 2 ? 'd2' : ''}"><line x1="${f1(x)}" y1="${f1(fr.y(x) + 6)}" x2="${f1(x)}" y2="${f1(y)}" stroke="#1d4f25" stroke-width="2"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(4 + r3() * 3)}" fill="${c}"/></g>`;
  }
  f += `</g>`;
  $('#l-front').innerHTML = f;
}

/* ==========================================================
   Illustrations des 4 métiers
   ========================================================== */
function buildServiceArt() {
  const ground = (fill = '#7fb069', dark = '#5e9a46') => `<ellipse cx="400" cy="485" rx="390" ry="105" fill="${dark}"/><ellipse cx="400" cy="472" rx="380" ry="96" fill="${fill}"/>`;

  // 01 Création
  let a = ground();
  a += `<path d="M110,470 Q400,350 690,470 Q400,560 110,470Z" fill="#6b4423"/><path d="M140,470 Q400,372 660,470" stroke="#8a5a30" stroke-width="3" fill="none" stroke-dasharray="10 12"/>`;
  a += poplar(70, 440, 200, 30, COL.green2) + poplar(735, 440, 170, 26, '#1d6b2e');
  const r = rng(14), cols = ['#e8a33a', '#d9534f', '#f5f1e6', '#b56fd6', '#f5d742', '#ef8fb0'];
  for (let i = 0; i < 46; i++) {
    const t = r(), x = 150 + t * 500, top = 470 - Math.sin(t * Math.PI) * 85, y = top + 14 + r() * (470 - top + Math.sin(t * Math.PI) * 40);
    const h = 26 + r() * 34, c = cols[i % cols.length];
    a += `<g class="grow" style="transition-delay:${(i * .025).toFixed(2)}s"><path d="M${f1(x)},${f1(y)} Q${f1(x + 4)},${f1(y - h / 2)} ${f1(x)},${f1(y - h)}" stroke="#2f7a3c" stroke-width="3" fill="none"/><ellipse cx="${f1(x - 6)}" cy="${f1(y - h / 2)}" rx="6" ry="3" fill="#3f8f4f"/>` +
      `<circle cx="${f1(x)}" cy="${f1(y - h)}" r="${f1(6 + r() * 4)}" fill="${c}"/><circle cx="${f1(x)}" cy="${f1(y - h)}" r="2.5" fill="#6b4423"/></g>`;
  }
  [[430, 545, 30], [500, 530, 26], [565, 515, 24], [620, 498, 20]].forEach(([x, y, w]) => { a += `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${w * .42}" fill="#d9d2bf"/>`; });
  a += `<g class="grow" style="transition-delay:.6s">${oak(640, 455, 210, 3, { colors: ['#1d5e2c', '#2f7a3c', '#5aa45e'] })}</g><line x1="660" y1="455" x2="660" y2="350" stroke="#a37b4f" stroke-width="5"/>`;
  $('#art-create').innerHTML = a;

  // 02 Élagage
  let b = ground('#6fa85a', '#4f8a3f');
  b += oak(390, 515, 560, 21, { colors: ['#0b3f19', '#165026', '#2f7a3c'] });
  b += `<g class="branch-fall"><path d="M560,240 L630,215" stroke="${COL.brown}" stroke-width="9" stroke-linecap="round"/>${bush(640, 225, 30, 2, ['#165026', '#2f7a3c'])}</g>`;
  b += `<line x1="448" y1="170" x2="448" y2="520" stroke="#d8b46a" stroke-width="2.5"/>`;
  b += `<g class="climber-move">${climber(434, 470, 1.6, '#e8742a', '#f5f1e6')}</g>`;
  b += `<g transform="translate(600,500)"><rect x="-50" y="-16" width="100" height="16" rx="8" fill="#7a4a24"/><rect x="-40" y="-32" width="86" height="16" rx="8" fill="#8f5a2c"/><circle cx="-50" cy="-8" r="8" fill="#c8955a"/><circle cx="-40" cy="-24" r="8" fill="#c8955a"/></g>`;
  b += `<g transform="translate(150,505)"><path d="M-14,0 L0,-36 L14,0Z" fill="#e8742a"/><rect x="-16" y="-3" width="32" height="5" fill="#e8742a"/><rect x="-7" y="-22" width="14" height="5" fill="#fff"/></g>`;
  $('#art-prune').innerHTML = b;

  // 03 Entretien
  let c = `<rect x="70" y="200" width="660" height="110" rx="46" fill="#1d5e2c"/>`;
  const r2 = rng(31);
  for (let i = 0; i < 90; i++) c += `<circle cx="${f1(90 + r2() * 620)}" cy="${f1(215 + r2() * 80)}" r="${f1(6 + r2() * 8)}" fill="${['#246b34', '#2f7a3c', '#185a29'][i % 3]}"/>`;
  c += `<polygon points="60,320 740,320 792,560 8,560" fill="#5e9a46"/>`;
  c += `<g class="mow-reveal" style="transform-box:fill-box;transform-origin:0 50%">`;
  for (let i = 0; i < 4; i++) { const y0 = 320 + i * 60; c += `<polygon points="${f1(60 - i * 13)},${y0} ${f1(740 + i * 13)},${y0} ${f1(740 + (i + .5) * 13)},${y0 + 30} ${f1(60 - (i + .5) * 13)},${y0 + 30}" fill="#85c063"/>`; }
  c += `</g>`;
  c += `<g class="mower"><g transform="translate(60,470)"><path d="M-10,-40 L-70,-120" stroke="#2b2b2b" stroke-width="6" stroke-linecap="round"/><path d="M-78,-124 L-62,-116" stroke="#2b2b2b" stroke-width="8" stroke-linecap="round"/><rect x="-20" y="-46" width="90" height="40" rx="12" fill="${COL.green2}"/><rect x="0" y="-62" width="40" height="20" rx="6" fill="#e3b866"/><circle cx="-6" cy="-4" r="12" fill="#222"/><circle cx="58" cy="-4" r="12" fill="#222"/><circle cx="-6" cy="-4" r="4" fill="#aaa"/><circle cx="58" cy="-4" r="4" fill="#aaa"/></g></g>`;
  c += poplar(30, 320, 210, 30, COL.green2) + poplar(770, 320, 180, 26, '#1d6b2e');
  $('#art-mow').innerHTML = c;

  // 04 Débroussaillage
  let d = `<rect x="0" y="470" width="800" height="130" rx="40" fill="#7a9a4a"/><rect x="0" y="470" width="800" height="16" fill="#6b8a3e"/>`;
  const r3 = rng(55);
  let brush = '';
  for (let i = 0; i < 140; i++) {
    const x = 40 + r3() * 420, h = 60 + r3() * 160, lean = (r3() - .5) * 120;
    brush += `<path d="M${f1(x)},476 Q${f1(x + lean * .3)},${f1(476 - h * .6)} ${f1(x + lean)},${f1(476 - h)}" stroke="${['#5b6b2a', '#3f5a24', '#7a6a32', '#2f4a1e'][i % 4]}" stroke-width="${f1(2 + r3() * 3)}" fill="none" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 30; i++) brush += `<circle cx="${f1(50 + r3() * 400)}" cy="${f1(330 + r3() * 140)}" r="${f1(10 + r3() * 18)}" fill="${['#3f5a24', '#4d6b2a', '#2f4a1e'][i % 3]}" opacity=".9"/>`;
  d += brush;
  d += `<g class="mow-reveal" style="transform-box:fill-box;transform-origin:0 50%;animation:clearreveal 7s ease-in-out infinite alternate"><rect x="20" y="250" width="440" height="222" fill="#f1ede0"/><rect x="20" y="470" width="440" height="16" fill="#8fb35a"/>`;
  for (let i = 0; i < 60; i++) d += `<line x1="${f1(24 + i * 7.2)}" y1="470" x2="${f1(24 + i * 7.2 + 2)}" y2="462" stroke="#6b8a3e" stroke-width="2"/>`;
  d += `</g>`;
  d += `<g class="clear-front"><g transform="translate(40,470)"><g stroke="${COL.green2}" stroke-width="9" stroke-linecap="round" fill="none"><path d="M0,-70 L0,-30"/><path d="M0,-30 L-10,0"/><path d="M0,-30 L12,0"/><path d="M0,-60 L22,-44"/></g><circle cx="0" cy="-84" r="11" fill="#e8742a"/><rect x="-4" y="-80" width="16" height="6" fill="#333"/><path d="M-30,-70 L40,-2" stroke="#555" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="-2" r="9" fill="none" stroke="#aaa" stroke-width="3"/></g></g>`;
  d += `<g transform="translate(590,470)"><rect x="-90" y="-60" width="180" height="56" rx="6" fill="${COL.brown}"/>${bush(0, -62, 80, 12, ['#4d6b2a', '#3f5a24', '#5b6b2a'])}<circle cx="-50" cy="0" r="18" fill="#222"/><circle cx="50" cy="0" r="18" fill="#222"/><path d="M90,-30 L150,-20" stroke="#333" stroke-width="6"/></g>`;
  $('#art-clear').innerHTML = d;
}

/* ==========================================================
   Pellicule : petites scènes illustrées
   (remplacez par de vraies photos de chantiers : <img src="...">)
   ========================================================== */
const FRAMES = [
  ['Taille de haies', 'PLAN 01'], ['Élagage sur cordes', 'PLAN 02'], ['Création de massifs', 'PLAN 03'], ['Tonte & finitions', 'PLAN 04'],
  ['Abattage par démontage', 'PLAN 05'], ["Plantation d'arbres", 'PLAN 06'], ['Débroussaillage', 'PLAN 07'], ['Ramassage de feuilles', 'PLAN 08']
];
function frameArt(i) {
  const skies = [['#a9d1e6', '#f2ead0'], ['#f0b27a', '#fbe3b8'], ['#bfe0e8', '#f3f0d8'], ['#7fb6d9', '#eef0d6'], ['#d99a7a', '#f4d9b0'], ['#a6c8d8', '#e8eedc'], ['#e9c27a', '#f8ebc8'], ['#d0896a', '#f3c98e']];
  const [s1, s2] = skies[i], id = 'fs' + i;
  let s = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient></defs><rect width="400" height="300" fill="url(#${id})"/>`;
  const h = hill(400, 300, 215, 10, 100 + i, 30);
  s += `<path d="${hill(400, 300, 190, 14, 200 + i, 30).d}" fill="#7d9a86" opacity=".7"/><path d="${h.d}" fill="#3f7a45"/>`;
  const r = rng(300 + i);
  switch (i) {
    case 0: s += `<rect x="40" y="150" width="320" height="70" rx="18" fill="#1d5e2c"/>`; for (let k = 0; k < 50; k++) s += `<circle cx="${f1(50 + r() * 300)}" cy="${f1(158 + r() * 55)}" r="${f1(5 + r() * 6)}" fill="${['#246b34', '#2f7a3c', '#185a29'][k % 3]}"/>`; break;
    case 1: s += oak(190, 240, 250, 61, { colors: ['#0b3f19', '#165026', '#2f7a3c'] }) + `<line x1="225" y1="80" x2="225" y2="240" stroke="#d8b46a" stroke-width="1.5"/>` + climber(214, 175, .9, '#e8742a', '#f5f1e6'); break;
    case 2: for (let k = 0; k < 40; k++) { const x = 40 + r() * 320, y = 215 + r() * 60; s += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x)}" y2="${f1(y - 22)}" stroke="#2f7a3c" stroke-width="2"/><circle cx="${f1(x)}" cy="${f1(y - 22)}" r="6" fill="${['#e8a33a', '#d9534f', '#f5f1e6', '#b56fd6', '#f5d742'][k % 5]}"/>`; } break;
    case 3: for (let k = 0; k < 5; k++) s += `<rect x="0" y="${222 + k * 16}" width="400" height="8" fill="${k % 2 ? '#5e9a46' : '#85c063'}"/>`; s += poplar(330, 220, 120, 18, COL.green2); break;
    case 4: s += `<rect x="180" y="110" width="34" height="115" fill="${COL.brown}"/><rect x="172" y="100" width="50" height="10" fill="#c8955a"/><path d="M220,150 L280,138" stroke="${COL.brown}" stroke-width="8"/><g transform="translate(280,240)"><rect x="-40" y="-14" width="80" height="14" rx="7" fill="#7a4a24"/><circle cx="-40" cy="-7" r="7" fill="#c8955a"/></g>`; break;
    case 5: s += oak(200, 235, 140, 9, { colors: ['#2f7a3c', '#3f8f4f', '#6fae5c'] }) + `<line x1="214" y1="235" x2="214" y2="150" stroke="#a37b4f" stroke-width="4"/><ellipse cx="200" cy="238" rx="40" ry="8" fill="#6b4423"/>`; break;
    case 6: for (let k = 0; k < 60; k++) { const x = 20 + r() * 200, hh = 30 + r() * 70; s += `<path d="M${f1(x)},240 q${f1((r() - .5) * 30)},${f1(-hh * .6)} ${f1((r() - .5) * 50)},${f1(-hh)}" stroke="${['#5b6b2a', '#3f5a24', '#7a6a32'][k % 3]}" stroke-width="3" fill="none"/>`; } s += `<rect x="230" y="225" width="170" height="80" fill="#8fb35a"/>`; break;
    case 7: s += oak(110, 230, 190, 13, { colors: ['#8a3b12', '#c8641c', '#e8a33a'] }); for (let k = 0; k < 40; k++) s += `<ellipse cx="${f1(240 + r() * 90)}" cy="${f1(240 - r() * 30 * (1 - Math.abs(r() - .5)))}" rx="7" ry="4" fill="${['#c8641c', '#e8a33a', '#8a3b12'][k % 3]}" transform="rotate(${f1(r() * 180)} 0 0)" transform-origin="center"/>`; s += `<ellipse cx="285" cy="240" rx="55" ry="22" fill="#c8641c"/>`; break;
  }
  return s + '</svg>';
}
function buildStrips() {
  const html = list => list.map(i => `<figure class="frame">${frameArt(i)}<figcaption><small>${FRAMES[i][1]} · DL ESPACES VERTS</small>${FRAMES[i][0]}</figcaption></figure>`).join('');
  const a = [0, 1, 2, 3, 4, 5, 6, 7], b = [4, 7, 2, 0, 6, 1, 5, 3];
  $('#strip-inner').innerHTML = html(a.concat(a));
  $('#strip-inner-2').innerHTML = html(b.concat(b));
}

/* ==========================================================
   Scène des saisons
   ========================================================== */
const SEASONS = [
  { name: 'Printemps', title: 'Le réveil', mode: 'petals', birds: 1,
    list: ['Plantations & massifs', 'Scarification du gazon', 'Premières tontes', 'Paillage des plates-bandes'],
    c: { sky1: '#bfe0e8', sky2: '#f6f1d6', hill1: '#9cc27f', hill2: '#6fae5c', ground: '#5c9a4a', leaf1: '#4d8f3a', leaf2: '#6fb24b', leaf3: '#a6d86e', crown: 1, blossom: 1, snow: 0 } },
  { name: 'Été', title: 'La lumière', mode: 'pollen', birds: .8,
    list: ['Tonte régulière', 'Taille des haies', 'Arrosage & paillage', 'Entretien des massifs'],
    c: { sky1: '#6fb3d9', sky2: '#f7e7b0', hill1: '#b8b45a', hill2: '#7c9a3e', ground: '#5d8a35', leaf1: '#0f4a1e', leaf2: '#1d6b2e', leaf3: '#3f8f3f', crown: 1, blossom: 0, snow: 0 } },
  { name: 'Automne', title: "L'or", mode: 'leaves', birds: .4,
    list: ['Ramassage des feuilles', "Plantation d'arbres & haies", 'Préparation des sols', 'Dernières tontes'],
    c: { sky1: '#e9a86b', sky2: '#f6d9a5', hill1: '#b8924a', hill2: '#8a7434', ground: '#6e6a2e', leaf1: '#8a3b12', leaf2: '#c8641c', leaf3: '#e8a33a', crown: .9, blossom: 0, snow: 0 } },
  { name: 'Hiver', title: 'Le repos', mode: 'snow', birds: .1,
    list: ['Élagage hors sève', 'Abattage & dessouchage', 'Taille des fruitiers', 'Nettoyage & débroussaillage'],
    c: { sky1: '#9fb3c4', sky2: '#e6ecf0', hill1: '#d5dde0', hill2: '#bcc8cc', ground: '#e6ecee', leaf1: '#3b4a3a', leaf2: '#4a5a48', leaf3: '#5f6f5c', crown: .05, blossom: 0, snow: 1 } }
];
function buildSeasonScene() {
  const W = 1600, H = 900;
  const h1 = hill(W, H, 560, 34, 61), h2 = hill(W, H, 650, 28, 62), g = hill(W, H, 760, 16, 63);
  let s = `<defs><linearGradient id="ssky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky1)"/><stop offset="1" style="stop-color:var(--sky2)"/></linearGradient></defs>`;
  s += `<rect width="${W}" height="${H}" fill="url(#ssky)"/>`;
  s += `<circle id="season-sun" cx="1320" cy="220" r="70" fill="#fff6d8" opacity=".85"/>`;
  s += `<path d="${h1.d}" style="fill:var(--hill1)"/>`;
  const r = rng(71);
  for (let i = 0; i < 18; i++) { const x = r() * W; s += poplar(x, h1.y(x) + 6, 40 + r() * 30, 7 + r() * 4, 'rgba(30,60,35,.45)'); }
  s += `<path d="${h2.d}" style="fill:var(--hill2)"/>`;
  s += `<path d="${g.d}" style="fill:var(--ground)"/>`;
  s += house(430, g.y(430) + 8, .8, true);
  s += oak(880, g.y(880) + 10, 640, 88, { blossom: true, n: 70 });
  s += `<ellipse class="snowy" cx="880" cy="${f1(g.y(880) + 8)}" rx="160" ry="14" fill="#fff"/>`;
  s += `<g class="lawn-lines" opacity=".25">`;
  for (let i = 0; i < 5; i++) s += `<path d="M0,${f1(g.y(0) + 30 + i * 26)} Q800,${f1(g.y(800) + 10 + i * 26)} 1600,${f1(g.y(1600) + 30 + i * 26)}" stroke="#fff" stroke-width="10" fill="none"/>`;
  s += `</g>`;
  $('#season-svg').innerHTML = s;
}
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };
let currentSeason = -1;
function applySeason(t) {
  t = clamp(t, 0, 3);
  const i = Math.min(2, Math.floor(t)), f = t - i, A = SEASONS[i].c, B = SEASONS[i + 1].c;
  const stage = $('.season-stage');
  for (const k in A) stage.style.setProperty('--' + k, typeof A[k] === 'number' ? lerp(A[k], B[k], f).toFixed(3) : mixHex(A[k], B[k], f));
  const sun = $('#season-sun');
  if (sun) { sun.setAttribute('cy', f1(200 + Math.abs(Math.sin(t * Math.PI / 3 + .3)) * 80 + (t > 2 ? (t - 2) * 60 : 0))); }
  $('.season-bar i').style.transform = `scaleX(${t / 3})`;
  const idx = Math.round(t);
  if (idx !== currentSeason) setSeasonText(idx);
}
function setSeasonText(idx) {
  currentSeason = idx;
  const S = SEASONS[idx];
  $$('.season-dial button').forEach((b, i) => { b.classList.toggle('on', i === idx); b.setAttribute('aria-selected', i === idx); });
  const els = [$('#season-name'), $('#season-title'), $('#season-list')];
  const swap = () => {
    $('#season-name').textContent = S.name;
    $('#season-title').textContent = S.title;
    $('#season-list').innerHTML = S.list.map(l => `<li>${l}</li>`).join('');
  };
  if (hasGSAP && !reduced) {
    gsap.timeline()
      .to(els, { opacity: 0, y: -14, duration: .2, stagger: .04, overwrite: true })
      .add(swap)
      .fromTo(els, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .5, stagger: .06, ease: 'power3.out' })
      .add(() => gsap.from('#season-list li', { x: -20, opacity: 0, stagger: .06, duration: .4 }), '<.1');
  } else swap();
  if (Particles.active === 'season') Particles.setMode(S.mode);
  Sound.birdiness = S.birds;
  Sound.whoosh(.5);
}

/* ==========================================================
   Carte du territoire
   ========================================================== */
const TOWNS = [
  ['Auch', .59, 43.65, 1], ['Condom', .37, 43.96, 1], ['Eauze', .10, 43.86, 1], ['Lectoure', .62, 43.93, 1], ['Fleurance', .66, 43.85, 0],
  ['Mirande', .40, 43.52, 1], ["L'Isle-Jourdain", 1.08, 43.61, 0], ['Nogaro', -.03, 43.76, 0], ['Agen', .62, 44.20, 1], ['Nérac', .34, 44.14, 0],
  ['Marmande', .17, 44.50, 1], ['Langon', -.25, 44.55, 1], ['Mont-de-Marsan', -.50, 43.89, 0], ['Libourne', -.24, 44.92, 0], ['Bordeaux', -.58, 44.84, 1]
];
const proj = (lon, lat) => [(lon + 1.3) * 232 + 40, (45.1 - lat) * 322 + 40];
function smoothPath(pts, close) {
  const P = pts.map(p => proj(p[0], p[1])), n = P.length; let d = `M${f1(P[0][0])},${f1(P[0][1])}`;
  const get = i => close ? P[(i + n) % n] : P[clamp(i, 0, n - 1)];
  for (let i = 0; i < (close ? n : n - 1); i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d + (close ? 'Z' : '');
}
function buildMap() {
  let s = '<defs><radialGradient id="mapglow"><stop offset="0" stop-color="#6fae5c" stop-opacity=".35"/><stop offset="1" stop-color="#6fae5c" stop-opacity="0"/></radialGradient></defs>';
  for (let i = 1; i < 9; i++) s += `<circle cx="${f1(proj(.4, 43.75)[0])}" cy="${f1(proj(.4, 43.75)[1])}" r="${i * 70}" fill="none" stroke="rgba(245,241,230,.05)"/>`;
  const gers = [[-.25, 43.62], [-.2, 43.82], [.02, 43.97], [.3, 44.05], [.6, 44.08], [.85, 43.95], [1.05, 43.8], [1.15, 43.6], [.95, 43.42], [.6, 43.33], [.25, 43.33], [-.08, 43.45]];
  s += `<circle cx="${f1(proj(.45, 43.72)[0])}" cy="${f1(proj(.45, 43.72)[1])}" r="230" fill="url(#mapglow)"/>`;
  s += `<path d="${smoothPath(gers, true)}" fill="rgba(111,174,92,.16)" stroke="#6fae5c" stroke-width="2" stroke-dasharray="6 6"/>`;
  s += `<text x="${f1(proj(.35, 43.66)[0])}" y="${f1(proj(.35, 43.66)[1])}" font-family="Anton, Impact, sans-serif" font-size="64" fill="rgba(111,174,92,.35)" letter-spacing="6">GERS</text>`;
  s += `<text x="${f1(proj(-1.1, 45.02)[0])}" y="${f1(proj(-1.1, 45.02)[1])}" font-family="Anton, Impact, sans-serif" font-size="34" fill="rgba(245,241,230,.15)" letter-spacing="4">GIRONDE</text>`;
  s += `<text x="${f1(proj(.55, 44.42)[0])}" y="${f1(proj(.55, 44.42)[1])}" font-family="Anton, Impact, sans-serif" font-size="26" fill="rgba(245,241,230,.12)" letter-spacing="3">LOT-ET-GARONNE</text>`;
  s += `<text x="${f1(proj(-1.2, 43.75)[0])}" y="${f1(proj(-1.2, 43.75)[1])}" font-family="Anton, Impact, sans-serif" font-size="30" fill="rgba(245,241,230,.12)" letter-spacing="4">LANDES</text>`;
  const garonne = [[1.44, 43.6], [1.2, 43.85], [.95, 44.05], [.62, 44.2], [.35, 44.35], [.17, 44.5], [-.25, 44.55], [-.45, 44.7], [-.58, 44.84], [-.68, 45.05]];
  s += `<path d="${smoothPath(garonne)}" stroke="#5f9fc6" stroke-width="3.5" fill="none" opacity=".7"/>`;
  s += `<text x="${f1(proj(.05, 44.62)[0])}" y="${f1(proj(.05, 44.62)[1])}" font-family="Fraunces, serif" font-style="italic" font-size="15" fill="#8fbfdc">la Garonne</text>`;
  const route = [[.59, 43.65], [.37, 43.96], [.34, 44.14], [.17, 44.5], [-.25, 44.55], [-.58, 44.84]];
  s += `<path id="route" d="${smoothPath(route)}" stroke="#e3b866" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const [tx, ty] = proj(1.44, 43.6);
  s += `<g opacity=".45"><circle cx="${f1(tx)}" cy="${f1(ty)}" r="5" fill="#a9b8a6"/><text x="${f1(tx - 70)}" y="${f1(ty + 22)}" font-family="Inter" font-size="13" fill="#a9b8a6">Toulouse</text></g>`;
  TOWNS.forEach(([n, lon, lat, main], i) => {
    const [x, y] = proj(lon, lat), hq = n === 'Auch', bdx = n === 'Bordeaux';
    const right = lon < -.3 || n === 'Langon' || n === 'Libourne';
    s += `<g class="city" data-town="${n}" data-i="${i}">`;
    if (hq || bdx) s += `<circle class="pulse" cx="${f1(x)}" cy="${f1(y)}" r="9" fill="${hq ? '#6fae5c' : '#e3b866'}"/>`;
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${hq || bdx ? 8 : main ? 5 : 3.5}" fill="${hq ? '#6fae5c' : bdx ? '#e3b866' : '#f5f1e6'}" stroke="#0b100c" stroke-width="2"/>`;
    if (main || hq) s += `<text x="${f1(x + (right ? -12 : 12))}" y="${f1(y + 5)}" text-anchor="${right ? 'end' : 'start'}" ${hq || bdx ? 'font-size="18"' : ''}>${n}</text>`;
    s += `</g>`;
  });
  $('#map').innerHTML = s;
  $('#towns').innerHTML = TOWNS.map(t => `<li data-town="${t[0]}">${t[0]}</li>`).join('') + '<li>& alentours</li>';
  $('#towns-list').innerHTML = TOWNS.map(t => `<option value="${t[0]}">`).join('');
  const hl = (n, on) => { $$(`[data-town="${CSS.escape(n)}"]`).forEach(el => el.classList.toggle('hl', on)); };
  $$('#towns li[data-town], #map .city').forEach(el => {
    el.addEventListener('mouseenter', () => hl(el.dataset.town, true));
    el.addEventListener('mouseleave', () => hl(el.dataset.town, false));
  });
}

/* ==========================================================
   Particules (pollen, feuilles, pétales, neige)
   ========================================================== */
const Particles = {
  cv: null, ctx: null, list: [], mode: 'pollen', active: null, w: 0, h: 0, dpr: 1, mx: -999, my: -999, mvx: 0, mvy: 0, t: 0,
  counts: { pollen: 38, leaves: 26, petals: 34, snow: 110, none: 0 },
  init() {
    this.cv = $('#particles'); this.ctx = this.cv.getContext('2d');
    const rs = () => { this.dpr = Math.min(devicePixelRatio || 1, 1.5); this.w = innerWidth; this.h = innerHeight; this.cv.width = this.w * this.dpr; this.cv.height = this.h * this.dpr; this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); };
    rs(); addEventListener('resize', rs);
    addEventListener('pointermove', e => { if (this.mx > -999) { this.mvx = e.clientX - this.mx; this.mvy = e.clientY - this.my; } this.mx = e.clientX; this.my = e.clientY; }, { passive: true });
    if (reduced) this.counts = { pollen: 0, leaves: 0, petals: 0, snow: 0, none: 0 };
    const loop = () => { this.step(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },
  setMode(m) { if (m === this.mode) return; this.mode = m; this.list.forEach(p => { if (p.k !== m && !p.burst) p.dying = true; }); },
  make(k, x, y, burst) {
    const r = Math.random, p = { k, x: x ?? r() * this.w, y: y ?? -20, rot: r() * 6.28, vr: (r() - .5) * .06, ph: r() * 6.28, a: 0, burst };
    if (k === 'leaves') { p.r = 6 + r() * 7; p.vy = .6 + r() * .9; p.vx = (r() - .5) * .6; p.c = ['#c8641c', '#e8a33a', '#8a3b12', '#6fae5c', '#2f7a3c'][r() * 5 | 0]; }
    else if (k === 'hedge') { p.r = 4 + r() * 5; p.vy = -2 - r() * 3; p.vx = (r() - .5) * 6; p.c = ['#2f7a3c', '#165026', '#5aa45e', '#3f8f4f'][r() * 4 | 0]; p.k = 'leaves'; p.grav = .18; p.life = 90; }
    else if (k === 'petals') { p.r = 4 + r() * 4; p.vy = .5 + r() * .7; p.vx = .3 + r() * .6; p.c = ['#f7c6d3', '#fde4ea', '#f3a9bd', '#fff'][r() * 4 | 0]; }
    else if (k === 'snow') { p.r = 1 + r() * 2.8; p.vy = .5 + r() * 1.2; p.vx = (r() - .5) * .4; p.c = '#fff'; }
    else { p.r = 1 + r() * 2.2; p.vy = -.15 - r() * .3; p.vx = (r() - .5) * .3; p.c = '#ffe9a8'; if (y == null) p.y = r() * this.h; }
    this.list.push(p); return p;
  },
  burst(x, y, n = 8) { for (let i = 0; i < n; i++) this.make('hedge', x, y, true); },
  step() {
    const c = this.ctx, target = this.counts[this.mode] || 0;
    this.t += 1; c.clearRect(0, 0, this.w, this.h);
    const alive = this.list.filter(p => !p.dying && !p.burst).length;
    if (alive < target && Math.random() < .5) this.make(this.mode);
    this.mvx *= .9; this.mvy *= .9;
    const wind = Math.sin(this.t * .004) * .4;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.a = p.dying ? p.a - .02 : Math.min(1, p.a + .03);
      if (p.grav) { p.vy += p.grav; p.vx *= .98; p.life--; if (p.life < 20) p.a = p.life / 20; }
      const dx = p.x - this.mx, dy = p.y - this.my, d2 = dx * dx + dy * dy;
      if (d2 < 20000) { const f = (1 - d2 / 20000) * .08; p.x += this.mvx * f * 3; p.y += this.mvy * f * 3; }
      if (p.k === 'pollen') { p.x += p.vx + Math.sin(this.t * .02 + p.ph) * .3; p.y += p.vy; }
      else { p.x += p.vx + wind + (p.grav ? 0 : Math.sin(this.t * .03 + p.ph) * (p.k === 'snow' ? .3 : .9)); p.y += p.vy; p.rot += p.vr + (p.k === 'leaves' && !p.grav ? Math.sin(this.t * .03 + p.ph) * .02 : 0); }
      if (p.a <= 0 || p.y > this.h + 30 || p.y < -40 || p.x < -40 || p.x > this.w + 40 || (p.grav && p.life <= 0)) { this.list.splice(i, 1); continue; }
      c.globalAlpha = p.a * (p.k === 'pollen' ? .55 + Math.sin(this.t * .05 + p.ph) * .35 : .9);
      c.fillStyle = p.c;
      if (p.k === 'leaves' || p.k === 'petals') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.abs(Math.cos(this.t * .04 + p.ph)) * .7 + .3);
        c.beginPath(); c.ellipse(0, 0, p.r, p.r * .5, 0, 0, 6.283); c.fill();
        if (p.k === 'leaves') { c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = .8; c.beginPath(); c.moveTo(-p.r, 0); c.lineTo(p.r, 0); c.stroke(); }
        c.restore();
      } else {
        if (p.k === 'pollen') { c.shadowColor = '#ffd77a'; c.shadowBlur = 8; }
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill(); c.shadowBlur = 0;
      }
    }
    c.globalAlpha = 1;
  }
};

/* ==========================================================
   Son d'ambiance génératif (Web Audio, aucun fichier)
   ========================================================== */
const Sound = {
  ctx: null, master: null, on: false, birdiness: 1, birdTimer: null, lastWhoosh: 0, lastSnip: 0,
  init() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    // vent
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 450; bp.Q.value = .6;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    const wg = ctx.createGain(); wg.gain.value = .22;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = .07; lfoG.gain.value = 260; lfo.connect(lfoG).connect(bp.frequency);
    const lfo2 = ctx.createOscillator(), lfo2G = ctx.createGain(); lfo2.frequency.value = .11; lfo2G.gain.value = .1; lfo2.connect(lfo2G).connect(wg.gain);
    src.connect(bp).connect(lp).connect(wg).connect(this.master); src.start(); lfo.start(); lfo2.start();
    // nappe « musique de film »
    const pad = ctx.createGain(); pad.gain.value = .035;
    const plp = ctx.createBiquadFilter(); plp.type = 'lowpass'; plp.frequency.value = 900;
    pad.connect(plp).connect(this.master);
    [110, 164.81, 220.5, 277.18, 329.6].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = (Math.random() - .5) * 12;
      const g = ctx.createGain(); g.gain.value = i === 0 ? .9 : .45;
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = .05 + i * .03; lg.gain.value = .3; l.connect(lg).connect(g.gain); l.start();
      o.connect(g).connect(pad); o.start();
    });
    return true;
  },
  enable() {
    if (!this.ctx && !this.init()) return;
    this.ctx.resume(); this.on = true;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(.55, this.ctx.currentTime, 1.2);
    this.scheduleBird();
    const b = $('#sound-toggle'); b.setAttribute('aria-pressed', 'true'); $('.sound-label', b).textContent = 'Son activé';
  },
  disable() {
    this.on = false; clearTimeout(this.birdTimer);
    if (this.ctx) { this.master.gain.cancelScheduledValues(this.ctx.currentTime); this.master.gain.setTargetAtTime(0, this.ctx.currentTime, .25); }
    const b = $('#sound-toggle'); b.setAttribute('aria-pressed', 'false'); $('.sound-label', b).textContent = 'Son coupé';
  },
  scheduleBird() {
    clearTimeout(this.birdTimer);
    if (!this.on) return;
    this.birdTimer = setTimeout(() => { if (Math.random() < this.birdiness) this.chirp(); this.scheduleBird(); }, 1500 + Math.random() * 4000);
  },
  chirp() {
    const ctx = this.ctx, t0 = ctx.currentTime, n = 2 + (Math.random() * 4 | 0), base = 2600 + Math.random() * 1800;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (pan) { pan.pan.value = Math.random() * 1.6 - .8; pan.connect(this.master); }
    for (let i = 0; i < n; i++) {
      const t = t0 + i * (.11 + Math.random() * .06), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * .3), t + .05); o.frequency.exponentialRampToValueAtTime(base * .85, t + .1);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + .11);
      o.connect(g).connect(pan || this.master); o.start(t); o.stop(t + .13);
    }
  },
  noiseHit(dur, type, freq, gain, sweepTo) {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = type === 'bandpass' ? 1.2 : .7;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(.02, dur / 3) + (sweepTo ? dur * .4 : 0)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * 2); s.stop(t + dur + .05);
  },
  whoosh(vol = 1) { const now = performance.now(); if (now - this.lastWhoosh < 700) return; this.lastWhoosh = now; this.noiseHit(1.1, 'bandpass', 300, .35 * vol, 2400); },
  snip() { const now = performance.now(); if (now - this.lastSnip < 90) return; this.lastSnip = now; this.noiseHit(.05, 'highpass', 3500, .35); },
  clap() {
    this.noiseHit(.14, 'bandpass', 1600, .9);
    if (!this.on) return;
    const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + .12); g.gain.setValueAtTime(.4, t); g.gain.exponentialRampToValueAtTime(.0001, t + .15);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + .2);
  },
  tick() { this.noiseHit(.03, 'highpass', 5000, .12); }
};

/* ==========================================================
   Découpe des titres en lettres
   ========================================================== */
function splitText() {
  $$('.split').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="w">${[...w].map(ch => `<span class="c">${ch}</span>`).join('')}</span>`).join(' ');
  });
  const mt = $('#manifesto-text');
  mt.innerHTML = mt.innerHTML.split(/(\s+)/).map(w => /\s+/.test(w) || !w ? w : `<span class="mw">${w}</span>`).join('');
}

/* ==========================================================
   Curseur personnalisé
   ========================================================== */
function initCursor() {
  if (!finePointer || !hasGSAP) return;
  document.documentElement.classList.add('has-cursor');
  const cur = $('.cursor'), ring = $('.cursor-ring'), dot = $('.cursor-dot'), label = $('.cursor-label');
  const rx = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
  const sh = $('.cursor-shears');
  addEventListener('pointermove', e => { rx(e.clientX); ry(e.clientY); gsap.set([dot, sh], { x: e.clientX, y: e.clientY }); }, { passive: true });
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor], a, button, label, input[type=range]');
    cur.classList.toggle('is-hover', !!t);
    label.textContent = t ? (t.dataset.cursor || '') : '';
  });
  document.addEventListener('pointerdown', () => cur.classList.add('is-down'));
  document.addEventListener('pointerup', () => cur.classList.remove('is-down'));
}

/* ==========================================================
   Mini-jeu : tailler la haie
   ========================================================== */
function initHedgeGame() {
  const box = $('#hedge-game'), cv = $('#hedge-canvas'), ctx = cv.getContext('2d', { willReadFrequently: true }), neat = $('#hedge-neat');
  let W, H, total = 1, down = false, last = null, won = false, pct = 0, checkT = 0;
  const geo = () => { const gy = H * .62, x0 = W * .1, x1 = W * .9, top = gy - H * .34; return { gy, x0, x1, top }; };

  function drawNeat() {
    const { gy, x0, x1, top } = geo(), r = rng(5);
    neat.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let s = `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${gy - top + 6}" rx="${Math.min(30, H * .06)}" fill="#1d5e2c"/>`;
    for (let i = 0; i < (W * H) / 900; i++) {
      const x = x0 + 8 + r() * (x1 - x0 - 16), y = top + 8 + r() * (gy - top - 10);
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(5 + r() * 6)}" fill="${['#246b34', '#2f7a3c', '#185a29', '#2a7339'][i % 4]}"/>`;
    }
    s += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="6" rx="3" fill="#5aa45e" opacity=".6"/>`;
    neat.innerHTML = s;
  }
  function drawMess() {
    const { gy, x0, x1, top } = geo(), r = rng(Date.now() % 1000);
    ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W, H);
    const greens = ['#3f7d35', '#4f8f3a', '#2f6b2c', '#5d9a40', '#6aa64a'];
    // pousses folles au-dessus et sur les côtés
    for (let i = 0; i < 260; i++) {
      const side = r(), sx = side < .8 ? x0 + r() * (x1 - x0) : (side < .9 ? x0 + r() * 10 : x1 - r() * 10), sy = side < .8 ? top + r() * 30 : top + r() * (gy - top);
      const len = 30 + r() * (H * .22), ang = side < .8 ? -Math.PI / 2 + (r() - .5) * 1.6 : (side < .9 ? Math.PI + (r() - .5) * 1.2 : (r() - .5) * 1.2);
      const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
      ctx.strokeStyle = r() > .5 ? '#5a4326' : '#3f6b2c'; ctx.lineWidth = 1.5 + r() * 2;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + (r() - .5) * 30, (sy + ey) / 2, ex, ey); ctx.stroke();
      const leaves = 2 + (r() * 5 | 0);
      for (let k = 0; k < leaves; k++) {
        const t = .3 + r() * .7, lx = sx + (ex - sx) * t + (r() - .5) * 14, ly = sy + (ey - sy) * t + (r() - .5) * 14;
        ctx.fillStyle = greens[r() * greens.length | 0];
        ctx.beginPath(); ctx.ellipse(lx, ly, 5 + r() * 7, 3 + r() * 4, r() * 6.28, 0, 6.283); ctx.fill();
      }
    }
    // touffes irrégulières sur le dessus
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = greens[r() * greens.length | 0];
      ctx.beginPath(); ctx.arc(x0 + r() * (x1 - x0), top - 10 + r() * 50, 14 + r() * 26, 0, 6.283); ctx.fill();
    }
    total = count() || 1; pct = 0; updatePct(0);
  }
  function count() {
    const d = ctx.getImageData(0, 0, W, H).data; let n = 0;
    for (let i = 3; i < d.length; i += 32) if (d[i] > 40) n++;
    return n;
  }
  function updatePct(p) { $('#hedge-pct').textContent = Math.round(p); $('#hedge-meter').style.transform = `scaleX(${p / 100})`; }
  function resize() {
    const r = box.getBoundingClientRect(); W = Math.round(r.width); H = Math.round(r.height);
    cv.width = W; cv.height = H; drawNeat(); drawMess(); won = false; $('#hedge-win').classList.remove('on'); cv.style.opacity = 1;
  }
  function cut(x, y) {
    const rad = Math.max(22, W * .028);
    ctx.globalCompositeOperation = 'destination-out'; ctx.lineCap = 'round'; ctx.lineWidth = rad * 2;
    ctx.beginPath(); ctx.moveTo(last ? last[0] : x, last ? last[1] : y); ctx.lineTo(x, y); ctx.stroke();
    last = [x, y];
    const br = box.getBoundingClientRect();
    if (Math.random() < .5) Particles.burst(br.left + x, br.top + y, 3);
    Sound.snip();
    const now = performance.now();
    if (now - checkT > 200) {
      checkT = now; pct = clamp((1 - count() / total) * 100 / .9, 0, 100); updatePct(pct);
      if (pct >= 99 && !won) win();
    }
  }
  function win() {
    won = true; updatePct(100);
    if (hasGSAP) gsap.to(cv, { opacity: 0, duration: .8 }); else cv.style.opacity = 0;
    $('#hedge-win').classList.add('on'); Sound.clap();
    const br = box.getBoundingClientRect(); for (let i = 0; i < 6; i++) Particles.burst(br.left + br.width * (.2 + i * .12), br.top + br.height * .4, 8);
  }
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => { down = true; last = null; cv.setPointerCapture(e.pointerId); cut(...pos(e)); });
  cv.addEventListener('pointermove', e => { if (down && !won) cut(...pos(e)); });
  ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => { down = false; last = null; }));
  box.addEventListener('pointerenter', () => $('.cursor').classList.add('is-shears'));
  box.addEventListener('pointerleave', () => $('.cursor').classList.remove('is-shears'));
  $('#hedge-reset').addEventListener('click', e => { e.stopPropagation(); resize(); });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
  resize();
}

/* ==========================================================
   Formulaire de devis en 3 prises
   ========================================================== */
const ICONS = {
  create: '<path d="M12 22V12M12 12C12 7 8 4 3 4c0 5 4 8 9 8zm0 0c0-5 4-8 9-8 0 5-4 8-9 8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  tree: '<circle cx="12" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 15v7M9 22h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  axe: '<path d="M4 20 14 10M12 4l8 8-3 3-8-8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
  hedge: '<rect x="3" y="8" width="18" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 21h18" stroke="currentColor" stroke-width="1.8"/>',
  mow: '<path d="M3 17h13l2-5H7zM7 12 4 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7" cy="19" r="2" fill="currentColor"/><circle cx="15" cy="19" r="2" fill="currentColor"/>',
  brush: '<path d="M4 20c2-6 1-10-1-14M9 20c1-5 2-9 6-13M14 20c0-4 2-7 6-9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  stump: '<path d="M5 20h14M7 20V11h10v9" fill="none" stroke="currentColor" stroke-width="1.8"/><ellipse cx="12" cy="11" rx="5" ry="2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
};
const SERVICES = [
  ['Création de jardin', 'create'], ['Élagage', 'tree'], ['Abattage', 'axe'], ['Taille de haies', 'hedge'],
  ['Tonte & entretien', 'mow'], ['Débroussaillage', 'brush'], ['Dessouchage', 'stump'], ['Autre demande', 'plus']
];
const SURFACES = ['Moins de 200 m²', '200 – 500 m²', '500 – 1 000 m²', '1 000 – 3 000 m²', 'Plus de 3 000 m²'];
function initDevis() {
  $('#service-chips').innerHTML = SERVICES.map(([l, ic], i) => `<label class="chip"><input type="checkbox" name="services" value="${l}" id="svc${i}"><span><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[ic]}</svg>${l}</span></label>`).join('');
  const surf = $('#surface'), out = $('#surface-out');
  const so = () => out.textContent = SURFACES[surf.value]; surf.addEventListener('input', () => { so(); Sound.tick(); }); so();
  let take = 1;
  const form = $('#devis-form'), err = $('#form-error'), prev = $('#take-prev'), next = $('#take-next'), clap = $('.clap');
  const show = n => {
    take = n;
    $$('.take', form).forEach(f => f.classList.toggle('on', +f.dataset.take === n));
    $$('.take-steps span', form).forEach((s, i) => s.classList.toggle('on', i < n));
    $('#clap-take').textContent = `PRISE ${n} / 3`;
    prev.disabled = n === 1;
    next.textContent = n === 3 ? 'Action ! Envoyer →' : 'Prise suivante →';
    clap.classList.add('snap'); setTimeout(() => clap.classList.remove('snap'), 260); Sound.clap();
    err.textContent = '';
  };
  const validate = () => {
    if (take === 1 && !$$('input[name=services]:checked', form).length) { err.textContent = 'Choisissez au moins une prestation.'; return false; }
    if (take === 3) {
      let ok = true;
      $$('.take[data-take="3"] [required]', form).forEach(inp => { const bad = !inp.value.trim(); inp.classList.toggle('err', bad); if (bad) ok = false; });
      if (!ok) { err.textContent = 'Merci de compléter les champs marqués *.'; return false; }
    }
    return true;
  };
  prev.addEventListener('click', () => show(Math.max(1, take - 1)));
  next.addEventListener('click', () => {
    if (!validate()) return;
    if (take < 3) return show(take + 1);
    const fd = new FormData(form);
    const body = [
      'Bonjour DL Espaces Verts,', '', 'Je souhaite recevoir un devis pour :',
      ...fd.getAll('services').map(s => '  • ' + s), '',
      'Surface : ' + SURFACES[surf.value], 'Fréquence : ' + fd.get('freq'), 'Client : ' + fd.get('client'), '',
      'Nom : ' + fd.get('name'), 'Téléphone : ' + fd.get('phone'), 'Commune : ' + fd.get('town'), 'E-mail : ' + (fd.get('email') || '—'), '',
      'Projet : ' + (fd.get('message') || '—')
    ].join('\n');
    const subject = `Demande de devis — ${fd.get('name')} (${fd.get('town')})`;
    clap.classList.add('snap'); Sound.clap();
    $('#take-done').classList.add('on');
    setTimeout(() => { location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }, 700);
  });
  $('#take-again').addEventListener('click', () => { form.reset(); so(); $('#take-done').classList.remove('on'); show(1); });

  // coordonnées
  $$('[data-config]').forEach(el => el.textContent = CONFIG[el.dataset.config]);
  const tel = CONFIG.phone.replace(/[^\d+]/g, '');
  $('#cta-phone').href = /X/i.test(CONFIG.phone) ? '#devis' : 'tel:' + tel;
  $('#cta-mail').href = 'mailto:' + CONFIG.email;
  $('#cta-fb').href = CONFIG.facebook;
}

/* ==========================================================
   Intro : amorce 3-2-1, puis ouverture des rideaux
   ========================================================== */
let lenis = null;
const barSize = () => innerWidth < 700 ? '5vh' : '9vh';
function runIntro(onDone) {
  const intro = $('#intro'), num = $('.leader-num'), sweep = $('.leader-sweep');
  if (!hasGSAP) {
    $$('[data-enter]').forEach(b => b.addEventListener('click', () => { if (b.dataset.enter === 'sound') Sound.enable(); intro.remove(); document.body.classList.remove('locked'); onDone(); }));
    $('.leader').style.display = 'none'; $('.intro-title').style.cssText = 'opacity:1;visibility:visible;position:relative';
    return;
  }
  const showTitle = () => gsap.timeline()
    .to('.leader', { opacity: 0, scale: .9, duration: .5 })
    .set('.intro-title', { visibility: 'visible' })
    .fromTo('.intro-title', { opacity: 0 }, { opacity: 1, duration: .1 })
    .from('.intro-logo', { scale: .6, opacity: 0, rotate: -40, duration: 1.2, ease: 'expo.out' }, '<')
    .from('.intro-present, .intro-film, .intro-sub', { y: 30, opacity: 0, stagger: .15, duration: .9, ease: 'power3.out' }, '-=.8')
    .from('.intro-actions .btn, .intro-hint', { y: 20, opacity: 0, stagger: .1, duration: .6 }, '-=.4');
  let countdown = null, titleTl = null;
  if (reduced) { titleTl = showTitle(); }
  else {
    const tl = countdown = gsap.timeline({ onComplete: () => { titleTl = showTitle(); } });
    [3, 2, 1].forEach(n => {
      tl.call(() => { num.textContent = n; })
        .fromTo(sweep, { '--a': '0deg' }, { '--a': '360deg', duration: .75, ease: 'none' })
        .fromTo(num, { scale: 1.15, opacity: .6 }, { scale: 1, opacity: 1, duration: .75, ease: 'power2.out' }, '<');
    });
  }
  let entered = false;
  $$('[data-enter]').forEach(b => b.addEventListener('click', () => {
    if (entered) return; entered = true;
    if (b.dataset.enter === 'sound') Sound.enable();
    if (countdown) countdown.kill();
    if (titleTl) titleTl.progress(1).kill();
    const bar = barSize();
    gsap.timeline({ onComplete: () => { intro.remove(); onDone(); } })
      .to('.intro-content, .intro-skip', { opacity: 0, scale: .96, duration: .5, ease: 'power2.in' })
      .add(() => Sound.whoosh(1.2))
      .to('.intro-half.top', { yPercent: -100, duration: 1.5, ease: 'power4.inOut' }, '+=.1')
      .to('.intro-half.bottom', { yPercent: 100, duration: 1.5, ease: 'power4.inOut' }, '<')
      .to(document.documentElement, { '--bar': bar, duration: 1.2, ease: 'power3.out' }, '<.3')
      .fromTo('.hero-stage', { scale: 1.3, filter: 'brightness(.4)' }, { scale: 1, filter: 'brightness(1)', duration: 2.6, ease: 'power3.out', transformOrigin: '60% 75%', clearProps: 'transform,filter' }, '<')
      .from('.hero-title .eyebrow', { opacity: 0, y: 20, duration: .8 }, '-=1.4')
      .from('.hero-title h1 .c', { yPercent: 110, duration: 1, ease: 'expo.out', stagger: .035 }, '<.1')
      .from('.tagline', { opacity: 0, y: 20, duration: .9 }, '-=.6')
      .from('.scroll-hint > *', { opacity: 0, duration: .8 }, '-=.4')
      .add(() => { document.body.classList.remove('locked'); lenis && lenis.start(); }, '-=1.2')
      .add(() => ScrollTrigger.refresh());
  }));
}

/* ==========================================================
   Mise en scène au scroll
   ========================================================== */
function initScroll() {
  gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ lerp: .085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  // ancres
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const el = $(id); if (!el) return; e.preventDefault();
    lenis ? lenis.scrollTo(el, { duration: 2, offset: 0 }) : el.scrollIntoView({ behavior: 'smooth' });
  }));

  /* --- Ouverture : travelling avant + lever de soleil --- */
  const mp = $$('.mp');
  if (finePointer) {
    const qs = mp.map((g, i) => [gsap.quickTo(g, 'x', { duration: 1.2, ease: 'power2' }), gsap.quickTo(g, 'y', { duration: 1.2, ease: 'power2' }), [6, 14, 26, 46][i] || 10]);
    addEventListener('pointermove', e => { const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5; qs.forEach(([qx, qy, k]) => { qx(-nx * k); qy(-ny * k * .4); }); }, { passive: true });
  }
  const hero = gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=230%', pin: true, scrub: 1 } });
  hero
    .to('.hero-title', { yPercent: -60, opacity: 0, ease: 'power1.in', duration: .14 }, 0)
    .to('.scroll-hint', { opacity: 0, duration: .05 }, 0)
    .to('.sky-day', { opacity: 1, duration: .9 }, 0)
    .to('.sun, .sun-rays', { top: '20%', duration: 1 }, 0)
    .to('.clouds', { yPercent: -20, duration: 1 }, 0)
    .to('#l-far', { scale: 1.08, yPercent: -2, transformOrigin: '60% 70%', duration: 1 }, 0)
    .to('#l-mid', { scale: 1.22, transformOrigin: '60% 75%', duration: 1 }, 0)
    .to('.mist', { opacity: .2, duration: 1 }, 0)
    .to('#l-main', { scale: 1.9, transformOrigin: '60% 72%', duration: 1 }, 0)
    .to('#l-front', { scale: 2.8, yPercent: 30, transformOrigin: '50% 100%', duration: .8 }, 0);
  [[.12, .3], [.3, .48], [.48, .66], [.66, .96]].forEach(([a, b], i) => {
    const el = `.subtitle[data-sub="${i + 1}"]`;
    hero.fromTo(el, { opacity: 0, y: 20, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .06 }, a)
      .to(el, { opacity: 0, y: -16, filter: 'blur(8px)', duration: .05 }, b - .04);
  });


  /* --- Manifeste : les mots s'allument --- */
  gsap.to('.manifesto-text .mw', { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: '#manifesto-text', start: 'top 80%', end: 'bottom 45%', scrub: true } });
  gsap.fromTo('.manifesto-logo', { rotate: -20, scale: .9 }, { rotate: 25, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '#manifeste', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.pillar', { y: 60, opacity: 0, stagger: .12, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.pillars', start: 'top 85%' } });

  /* --- Savoir-faire : travelling horizontal --- */
  const track = $('.hz-track'), dist = () => track.scrollWidth - innerWidth;
  const hz = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '#savoir-faire', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, onUpdate: s => $('.hz-progress i').style.transform = `scaleX(${s.progress})` } });
  $$('.panel').forEach(p => {
    ScrollTrigger.create({ trigger: p, containerAnimation: hz, start: 'left 75%', end: 'right 25%', toggleClass: 'in', onEnter: () => Sound.whoosh(.6), onEnterBack: () => Sound.whoosh(.6) });
    const art = $('.panel-art', p), num = $('.panel-num', p);
    if (art) gsap.fromTo(art, { xPercent: 7 }, { xPercent: -7, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: hz, start: 'left right', end: 'right left', scrub: true } });
    if (num) gsap.fromTo(num, { xPercent: -30 }, { xPercent: 30, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: hz, start: 'left right', end: 'right left', scrub: true } });
    const copy = $('.panel-copy', p);
    if (copy) gsap.from($$('.eyebrow, h3, p, li', copy), { y: 40, opacity: 0, stagger: .05, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: p, containerAnimation: hz, start: 'left 60%' } });
  });

  /* --- Saisons : l'année défile avec le scroll --- */
  const seasonST = ScrollTrigger.create({
    trigger: '#saisons', start: 'top top', end: '+=320%', pin: true, scrub: true,
    onUpdate: s => applySeason(s.progress * 3.15 - .05),
    onToggle: s => { Particles.active = s.isActive ? 'season' : null; if (s.isActive) Particles.setMode(SEASONS[Math.max(0, currentSeason)].mode); }
  });
  $$('.season-dial button').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.season, y = seasonST.start + (seasonST.end - seasonST.start) * ((i + .05) / 3.15) + 2;
    lenis ? lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: 'smooth' });
  }));

  /* --- Pellicule --- */
  gsap.fromTo('#strip-inner', { xPercent: 0 }, { xPercent: -30, ease: 'none', scrollTrigger: { trigger: '#pellicule', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('#strip-inner-2', { xPercent: -30 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '#pellicule', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* --- Carte : la route se trace --- */
  const route = $('#route');
  if (route) {
    const L = route.getTotalLength(); route.style.strokeDasharray = L; route.style.strokeDashoffset = L;
    gsap.to(route, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '#territoire', start: 'top 70%', end: 'center center', scrub: true } });
    gsap.from('#map .city', { scale: 0, opacity: 0, transformOrigin: 'center', stagger: .05, duration: .6, ease: 'back.out(2)', scrollTrigger: { trigger: '#map', start: 'top 75%' } });
    gsap.from('#towns li', { y: 16, opacity: 0, stagger: .03, duration: .5, scrollTrigger: { trigger: '#towns', start: 'top 85%' } });
  }

  /* --- Devis --- */
  gsap.from('.devis-form', { y: 80, opacity: 0, rotateX: 8, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.devis-form', start: 'top 85%' } });
  gsap.from('.contact-card', { x: -40, opacity: 0, stagger: .1, duration: .8, scrollTrigger: { trigger: '.contact-cards', start: 'top 90%' } });

  /* --- Générique de fin --- */
  const roll = $('#credits-roll'), rollDist = () => roll.offsetHeight - innerHeight * .78;
  gsap.to(roll, { y: () => -rollDist(), ease: 'none', scrollTrigger: { trigger: '.credits-stage', start: 'top top', end: () => '+=' + rollDist(), pin: true, scrub: 1, invalidateOnRefresh: true } });

  /* barres cinéma : présentes à l'ouverture & au générique */
  gsap.fromTo(document.documentElement, { '--bar': barSize }, { '--bar': '0px', ease: 'none', immediateRender: false, scrollTrigger: { trigger: '#manifeste', start: 'top bottom', end: 'top 30%', scrub: true } });
  gsap.fromTo(document.documentElement, { '--bar': '0px' }, { '--bar': barSize, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '#generique', start: 'top bottom', end: 'top top', scrub: true } });

  /* --- Titres découpés --- */
  $$('.split').forEach(el => { if (el.closest('.hero-title')) return; gsap.from($$('.c', el), { yPercent: 110, stagger: .025, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', containerAnimation: el.closest('.hz-track') ? hz : undefined } }); });

  /* --- HUD : chapitres, timecode, frise --- */
  const scenes = $$('main section[data-chapter]'), ticks = $('.timeline-ticks'), sceneLabel = $('#hud-scene');
  const sts = scenes.map((sec, i) => ScrollTrigger.create({
    trigger: sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec, start: 'top 50%', end: 'bottom 50%',
    onToggle: s => {
      if (!s.isActive) return;
      sceneLabel.textContent = `Scène ${String(i + 1).padStart(2, '0')} — ${sec.dataset.chapter}`;
      $('.hud').classList.toggle('solid', i > 0);
      if (Particles.active !== 'season') Particles.setMode(sec.dataset.particles || 'none');
      if (i > 0) Sound.whoosh(.7);
      $$('button', ticks).forEach((b, k) => b.classList.toggle('past', k <= i));
    }
  }));
  ticks.innerHTML = scenes.map((s, i) => `<button aria-label="Aller à : ${s.dataset.chapter}" data-i="${i}"><span>${String(i + 1).padStart(2, '0')} · ${s.dataset.chapter}</span></button>`).join('');
  const placeTicks = () => { const max = ScrollTrigger.maxScroll(window) || 1; $$('button', ticks).forEach((b, i) => { b.style.left = (clamp(scenes[i] === scenes[0] ? 0 : (sts[i].start + innerHeight / 2) / max, 0, 1) * 100) + '%'; }); };
  $$('button', ticks).forEach((b, i) => b.addEventListener('click', () => { const y = i === 0 ? 0 : sts[i].start + innerHeight / 2 + 2; lenis ? lenis.scrollTo(y, { duration: 2.2 }) : scrollTo({ top: y, behavior: 'smooth' }); }));
  ScrollTrigger.addEventListener('refresh', placeTicks);
  const fill = $('.timeline-fill'), tc = $('#tc'), FILM = 252; // durée fictive : 4 min 12 s
  const onScroll = () => {
    const max = ScrollTrigger.maxScroll(window) || 1, p = clamp(scrollY / max, 0, 1);
    fill.style.transform = `scaleX(${p})`;
    const t = p * FILM, fr = Math.floor((t % 1) * 25), s = Math.floor(t) % 60, m = Math.floor(t / 60);
    tc.textContent = `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(fr).padStart(2, '0')}`;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  ScrollTrigger.refresh(); placeTicks();
}

/* ==========================================================
   Démarrage
   ========================================================== */
function boot() {
  $('#year').textContent = new Date().getFullYear();
  buildHero(); buildServiceArt(); buildStrips(); buildSeasonScene(); buildMap();
  splitText(); initDevis(); Particles.init(); initCursor(); initHedgeGame();
  applySeason(0);
  $('#sound-toggle').addEventListener('click', () => Sound.on ? Sound.disable() : Sound.enable());
  if (!hasGSAP) {
    document.documentElement.classList.add('no-gsap');
    $$('.panel').forEach(p => p.classList.add('in'));
    runIntro(() => {});
    return;
  }
  initScroll();
  runIntro(() => {});
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
