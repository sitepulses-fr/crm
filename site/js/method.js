/* 02 — MÉTHODE
   Une bande ECG défile sous une tête de lecture fixe.
   Chaque étape = un battement + une scène pilotée image par image.
   Desktop : scroll vertical → défilement horizontal. Mobile : swipe natif aimanté. */
(function () {
  'use strict';
  const { clamp, lerp, seg, ease } = SP;
  const sec = document.getElementById('method');
  if (!sec) return;

  const pin = sec.querySelector('.method-pin');
  const viewport = sec.querySelector('.method-viewport');
  const track = sec.querySelector('.method-track');
  const steps = [...sec.querySelectorAll('.step')];
  const svgLine = sec.querySelector('.method-line');
  const dimPath = svgLine.querySelector('.ml-dim');
  const litPath = svgLine.querySelector('.ml-lit');
  const litRect = svgLine.querySelector('.lit-rect');
  const NS = 'http://www.w3.org/2000/svg';

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const makeSvg = (host) => el('svg', { viewBox: '0 0 400 260', 'aria-hidden': 'true' }, host);

  /* ---------- 01 ANALYSER : radar qui verrouille une cible ---------- */
  function analyse(host) {
    const svg = makeSvg(host);
    const cx = 200, cy = 130;
    const rings = [40, 80, 118].map((r) => el('circle', { cx, cy, r, class: 'sc' }, svg));
    el('line', { x1: cx - 130, y1: cy, x2: cx + 130, y2: cy, class: 'sc' }, svg);
    el('line', { x1: cx, y1: cy - 125, x2: cx, y2: cy + 125, class: 'sc' }, svg);
    const sweep = el('path', { d: `M${cx} ${cy} L${cx + 118} ${cy} A118 118 0 0 0 ${cx + 118 * Math.cos(-0.55)} ${cy + 118 * Math.sin(-0.55)} Z`, fill: 'url(#swg)' }, svg);
    const defs = el('defs', {}, svg);
    const lg = el('linearGradient', { id: 'swg', x1: '1', y1: '0', x2: '0', y2: '0' }, defs);
    el('stop', { offset: '0', 'stop-color': '#3b7bff', 'stop-opacity': '.5' }, lg);
    el('stop', { offset: '1', 'stop-color': '#3b7bff', 'stop-opacity': '0' }, lg);
    const r = SP.rng(3);
    const dots = Array.from({ length: 16 }, () => {
      const a = r() * Math.PI * 2, d = 20 + r() * 95;
      return { a, n: el('circle', { cx: cx + Math.cos(a) * d, cy: cy + Math.sin(a) * d, r: 2.2, class: 'sc-dot' }, svg) };
    });
    const target = dots[5];
    const lock = el('rect', { class: 'sc-hi', width: 0, height: 0 }, svg);
    const tag = el('text', { class: 'sc-txt-hi', x: 0, y: 0 }, svg);
    tag.textContent = 'fiche Google · 2,1★';
    const tx = +target.n.getAttribute('cx'), ty = +target.n.getAttribute('cy');
    return (k) => {
      rings.forEach((c, i) => { const s = ease.out(seg(k, i * 0.08, 0.3 + i * 0.08)); c.style.opacity = s; c.setAttribute('r', [40, 80, 118][i] * s); });
      const ang = k * 720;
      sweep.setAttribute('transform', `rotate(${-ang} ${cx} ${cy})`);
      sweep.style.opacity = seg(k, 0.05, 0.15) * (1 - seg(k, 0.85, 1));
      dots.forEach((d) => {
        let da = ((-d.a * 180) / Math.PI) % 360; if (da < 0) da += 360;
        const lit = ang > da + 0 ? 1 : 0;
        d.n.style.opacity = 0.15 + 0.85 * lit;
        d.n.style.fill = d === target && k > 0.7 ? '#ff4f64' : '';
      });
      const lk = ease.out(seg(k, 0.7, 0.9));
      const s = lerp(60, 12, lk);
      lock.setAttribute('x', tx - s); lock.setAttribute('y', ty - s);
      lock.setAttribute('width', s * 2); lock.setAttribute('height', s * 2);
      lock.style.opacity = lk;
      tag.setAttribute('x', tx + 18); tag.setAttribute('y', ty - 16);
      tag.style.opacity = seg(k, 0.85, 0.95);
    };
  }

  /* ---------- 02 CONSTRUIRE : blocs épars → maquette ---------- */
  function construire(host) {
    const svg = makeSvg(host);
    const T = [
      [20, 16, 360, 14], [20, 48, 190, 22], [20, 78, 140, 10], [20, 96, 80, 18],
      [226, 46, 154, 108], [20, 172, 112, 66], [144, 172, 112, 66], [268, 172, 112, 66],
    ];
    const r = SP.rng(9);
    const blocks = T.map(([x, y, w, h], i) => ({
      t: [x, y, w, h],
      s: [r() * 340, r() * 220, r() * 120 - 60, r() * 0.6 + 0.4],
      n: el('rect', { x: 0, y: 0, width: w, height: h, rx: 2, class: i === 3 ? 'sc-hi' : 'sc-w' }, svg),
    }));
    const lbl = el('text', { class: 'sc-txt', x: 20, y: 256 }, svg);
    lbl.textContent = 'atelier-morel.fr · responsive';
    return (k) => {
      blocks.forEach((b, i) => {
        const e = ease.inOut(seg(k, i * 0.05, 0.5 + i * 0.05));
        const [x, y, w, h] = b.t;
        const [sx, sy, sr, ss] = b.s;
        const px = lerp(sx, x, e), py = lerp(sy, y, e);
        const sc = lerp(ss, 1, e);
        b.n.setAttribute('transform', `translate(${px} ${py}) rotate(${sr * (1 - e)} ${w / 2} ${h / 2}) scale(${sc})`);
        b.n.style.opacity = 0.25 + 0.75 * e;
        const fill = seg(k, 0.75 + i * 0.02, 0.95);
        b.n.style.fill = i === 3 ? `rgba(59,123,255,${fill})` : `rgba(243,246,255,${0.07 * fill})`;
      });
      lbl.style.opacity = seg(k, 0.85, 1);
    };
  }

  /* ---------- 03 OPTIMISER : cinq jauges ---------- */
  function optimiser(host) {
    const svg = makeSvg(host);
    const rows = [['Google', 0.22, 0.94], ['SEO', 0.12, 0.88], ['Contenu', 0.3, 0.91], ['Réseaux', 0.18, 0.86], ['Local', 0.08, 0.97]];
    const R = rows.map(([name, a, b], i) => {
      const y = 22 + i * 48;
      const t = el('text', { class: 'sc-txt', x: 0, y }, svg); t.textContent = name.toUpperCase();
      el('rect', { x: 0, y: y + 10, width: 400, height: 3, fill: 'rgba(150,175,255,.12)' }, svg);
      const bar = el('rect', { x: 0, y: y + 10, width: 0, height: 3, class: 'sc-fill' }, svg);
      const knob = el('circle', { cx: 0, cy: y + 11.5, r: 4, fill: '#fff' }, svg);
      const v = el('text', { class: 'sc-txt-hi', x: 400, y, 'text-anchor': 'end' }, svg);
      return { a, b, bar, knob, v };
    });
    return (k) => {
      R.forEach((r, i) => {
        const e = ease.inOut(seg(k, 0.1 + i * 0.08, 0.55 + i * 0.08));
        const w = lerp(r.a, r.b, e) * 400;
        r.bar.setAttribute('width', w);
        r.knob.setAttribute('cx', w);
        r.v.textContent = Math.round(lerp(r.a, r.b, e) * 100) + ' %';
        r.bar.style.fill = e > 0.98 ? '#8fb4ff' : '';
      });
    };
  }

  /* ---------- 04 PROPULSER : la courbe décolle ---------- */
  function propulser(host) {
    const svg = makeSvg(host);
    for (let i = 0; i <= 4; i++) el('line', { x1: 0, x2: 400, y1: 20 + i * 55, y2: 20 + i * 55, class: 'sc' }, svg);
    let d = 'M0 236';
    for (let x = 4; x <= 380; x += 4) {
      const t = x / 380;
      const y = 236 - (Math.pow(t, 2.6) * 206 + Math.sin(t * 40) * 3 * (1 - t));
      d += ` L${x} ${y.toFixed(1)}`;
    }
    const path = el('path', { d, class: 'sc-hi', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, svg);
    path.style.strokeWidth = 2;
    const area = el('path', { d: d + ' L380 260 L0 260 Z', fill: 'url(#pg)' }, svg);
    const defs = el('defs', {}, svg);
    const lg = el('linearGradient', { id: 'pg', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#3b7bff', 'stop-opacity': 0.28 }, lg);
    el('stop', { offset: 1, 'stop-color': '#3b7bff', 'stop-opacity': 0 }, lg);
    const ring = el('circle', { r: 10, class: 'sc-hi' }, svg);
    const head = el('circle', { r: 4, fill: '#fff' }, svg);
    const mult = el('text', { class: 'sc-big', x: 0, y: 60 }, svg);
    const cap = el('text', { class: 'sc-txt', x: 0, y: 80 }, svg); cap.textContent = 'VISIBILITÉ';
    const len = path.getTotalLength();
    return (k) => {
      const e = ease.inOut(seg(k, 0.05, 0.9));
      path.setAttribute('stroke-dashoffset', 1 - e);
      area.style.clipPath = `inset(0 ${(1 - e) * 100}% 0 0)`;
      const pt = path.getPointAtLength(len * e);
      head.setAttribute('cx', pt.x); head.setAttribute('cy', pt.y);
      ring.setAttribute('cx', pt.x); ring.setAttribute('cy', pt.y);
      const bt = Math.exp(-SP.beat.since * 3);
      ring.setAttribute('r', 6 + (1 - bt) * 18);
      ring.style.opacity = bt * e;
      mult.textContent = '×' + SP.fmt(lerp(1, 3.4, e), 1);
    };
  }

  /* ---------- 05 CONVERTIR : visiteurs → entonnoir → clients ---------- */
  function convertir(host) {
    const svg = makeSvg(host);
    el('path', { d: 'M120 30 L250 112 M120 230 L250 148', class: 'sc-w' }, svg);
    const r = SP.rng(21);
    const N = 42;
    const dots = Array.from({ length: N }, (_, i) => ({
      o: (i / N) * 0.75,
      y0: 30 + r() * 200,
      client: i % 3 === 0,
      n: el('circle', { r: 2.6, class: 'sc-dot' }, svg),
    }));
    const clients = dots.filter((d) => d.client);
    clients.forEach((d, j) => { d.slot = [300 + (j % 4) * 18, 92 + Math.floor(j / 4) * 18]; });
    const cnt = el('text', { class: 'sc-big', x: 300, y: 70 }, svg);
    const cap = el('text', { class: 'sc-txt', x: 300, y: 196 }, svg); cap.textContent = 'NOUVEAUX CLIENTS';
    return (k) => {
      let arrived = 0;
      dots.forEach((d) => {
        const f = clamp((k * 1.25 - d.o) / 0.42);
        let x, y, a = 1;
        if (f <= 0) { d.n.style.opacity = 0; return; }
        if (f < 0.6) {
          const t = f / 0.6;
          x = lerp(-10, 250, t);
          const funnel = seg(x, 120, 250);
          y = lerp(d.y0, 130 + (d.y0 - 130) * 0.12, ease.inOut(funnel));
        } else if (d.client) {
          const t = ease.inOut((f - 0.6) / 0.4);
          x = lerp(250, d.slot[0], t); y = lerp(130, d.slot[1], t);
          if (t >= 1) arrived++;
        } else {
          const t = (f - 0.6) / 0.4;
          x = lerp(250, 280, t); y = 130 + (d.y0 - 130) * 0.12;
          a = 1 - t;
        }
        d.n.setAttribute('cx', x); d.n.setAttribute('cy', y);
        d.n.style.opacity = a;
        d.n.style.fill = d.client && f >= 0.6 ? '#3b7bff' : '';
        d.n.setAttribute('r', d.client && f >= 0.6 ? 5 : 2.6);
      });
      cnt.textContent = '+' + arrived;
    };
  }

  const SCENES = { analyse, construire, optimiser, propulser, convertir };
  const renders = steps.map((st) => {
    const host = st.querySelector('.step-scene');
    return SCENES[host.dataset.scene](host);
  });

  /* ---------- La bande ECG ---------- */
  let LY = 0, lineW = 0;
  function buildLine() {
    const m = SP.isMobile();
    lineW = track.scrollWidth;
    const H = viewport.clientHeight;
    LY = Math.round(H * (m ? 0.9 : 0.84));
    viewport.style.setProperty('--ly', LY + 'px');
    svgLine.setAttribute('width', lineW);
    svgLine.setAttribute('height', H);
    svgLine.style.width = lineW + 'px';
    const beats = steps.map((st) => ({ x: st.offsetLeft + st.offsetWidth * (m ? 0.5 : 0.3), w: m ? 90 : 140, a: m ? 34 : 52 }));
    steps.forEach((st, i) => { st._bx = beats[i].x; });
    const d = SP.ecgPath(lineW, LY, beats, 3);
    dimPath.setAttribute('d', d);
    litPath.setAttribute('d', d);
  }

  /* ---------- Rendu image par image ---------- */
  const hit = steps.map(() => false);
  let visible = false;
  function frame() {
    const vr = viewport.getBoundingClientRect();
    const tr = track.getBoundingClientRect();
    const head = vr.left + vr.width / 2;
    litRect.setAttribute('width', Math.max(0, head - tr.left));
    steps.forEach((st, i) => {
      const r = st.getBoundingClientRect();
      const k = clamp((vr.left + vr.width * 0.72 - r.left) / (r.width * 0.85));
      st.style.setProperty('--sp', k.toFixed(3));
      renders[i](k);
      const past = tr.left + st._bx < head;
      if (past !== hit[i]) { hit[i] = past; if (past) { SP.kick(); SP.vibrate(10); } }
    });
  }

  buildLine();
  window.addEventListener('resize', buildLine);

  const mm = gsap.matchMedia();
  mm.add('(min-width: 820px)', () => {
    gsap.to(track, {
      x: () => -(track.scrollWidth - window.innerWidth),
      ease: 'none',
      scrollTrigger: {
        trigger: sec,
        pin,
        start: 'top top',
        end: () => '+=' + (track.scrollWidth - window.innerWidth) * 1.1,
        scrub: true,
        invalidateOnRefresh: true,
        onRefresh: buildLine,
      },
    });
  });
  SP.watch(sec, { onToggle: (a) => (visible = a) });
  SP.tick(() => { if (visible) frame(); });
  frame();
})();
