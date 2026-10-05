/* 01 — DIAGNOSTIC
   scan → diagnostic → signal plat → BOOM → transformation des mêmes objets.
   Tout est une fonction pure de la progression p : réversible, sans dérive. */
(function () {
  'use strict';
  const { clamp, lerp, seg, ease, fmt } = SP;
  const sec = document.getElementById('diagnostic');
  if (!sec) return;

  const pin = sec.querySelector('.diag-pin');
  const wrap = sec.querySelector('.board-wrap');
  const board = sec.querySelector('.board');
  const consoleEl = sec.querySelector('.console');
  const P = {
    google: board.querySelector('.p-google'),
    site: board.querySelector('.p-site'),
    social: board.querySelector('.p-social'),
    serp: board.querySelector('.p-serp'),
  };
  const panels = Object.values(P);
  const DEPTH = [24, 8, 36, 16];
  const beam = board.querySelector('.beam');
  const tint = board.querySelector('.scan-tint');
  const flatline = board.querySelector('.flatline');
  const flagsWrap = board.querySelector('.flags');
  const linksSvg = board.querySelector('.board-links');
  const log = sec.querySelector('.c-log');
  const scoreEl = sec.querySelector('.score');
  const ringEl = sec.querySelector('.c-ring');
  const statusEl = sec.querySelector('.c-status');
  const progEl = sec.querySelector('.c-progress');
  const progBar = progEl.querySelector('i');
  const shock = sec.querySelector('.shock');
  const titleTxt = sec.querySelector('.diag-title-txt');
  const head = sec.querySelector('.diag-head');
  const outro = sec.querySelector('.diag-outro');

  // éléments de chaque panneau
  const G = {
    note: P.google.querySelector('.pg-note'),
    stars: P.google.querySelector('.stars-fill'),
    count: P.google.querySelector('.pg-count b'),
    photos: [...P.google.querySelectorAll('.ph')],
    hours: P.google.querySelector('.pg-hours'),
    web: P.google.querySelector('.pg-web'),
  };
  const S = {
    view: P.site.querySelector('.ps-view'),
    obs: [...P.site.querySelectorAll('.ob')],
    wire: [...P.site.querySelectorAll('.ps-wire rect')],
    wireSvg: P.site.querySelector('.ps-wire'),
    after: P.site.querySelector('.ps-after'),
    mobile: P.site.querySelector('.ps-mobile'),
    speed: P.site.querySelector('.ps-speed b'),
    mob: P.site.querySelector('.ps-mob'),
    url: P.site.querySelector('.ps-url'),
  };
  const rnd = SP.rng(5);
  S.obs.forEach((o) => { o._r = [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]; });
  const SO = {
    tiles: [...P.social.querySelectorAll('.tile')],
    f: P.social.querySelector('.pso-f'),
    p: P.social.querySelector('.pso-p'),
  };
  const SE = {
    items: [...P.serp.querySelectorAll('.serp-it')],
    gap: P.serp.querySelector('.serp-gap'),
    you: P.serp.querySelector('.serp-you'),
    rank: P.serp.querySelector('.serp-you em b'),
  };
  const brandmarks = [...board.querySelectorAll('.brandmark')];

  /* Les signaux faibles. k = moment de la correction dans la progression du panneau. */
  const ISSUES = [
    { pn: 'google', sel: '.pg-rating', sev: 'r', w: 10, k: 0.7, t: 'Note 2,1★ · 4 avis seulement', f: '4,8★ · 127 avis' },
    { pn: 'google', sel: '.pg-photos', sev: 'o', w: 7, k: 0.45, t: 'Aucune photo', f: '24 photos professionnelles' },
    { pn: 'google', sel: '.pg-info', sev: 'y', w: 6, k: 0.85, t: 'Horaires & site absents', f: 'Fiche complète' },
    { pn: 'social', sel: '.pso-grid', sev: 'o', w: 7, k: 0.6, t: 'Dernier post il y a 14 mois', f: '3 posts / semaine' },
    { pn: 'site', sel: '.ps-view', sev: 'r', w: 12, k: 0.8, t: 'Site non adapté au mobile', f: 'Site responsive sur mesure' },
    { pn: 'site', sel: '.ps-speed', sev: 'o', w: 8, k: 0.9, t: 'Chargement 7,8 s', f: 'Chargement 0,9 s' },
    { pn: 'social', sel: '.pso-head', sev: 'y', w: 5, k: 0.95, t: 'Identité incohérente', f: 'Identité unifiée' },
    { pn: 'site', sel: '.ps-url', sev: 'y', w: 4, k: 0.62, t: 'Pas de HTTPS', f: 'Sécurisé' },
    { pn: 'serp', sel: '.serp-q', sev: 'o', w: 7, k: 0.5, t: '0 mot-clé local travaillé', f: '38 mots-clés locaux' },
    { pn: 'serp', sel: '.serp-you', sev: 'r', w: 11, k: 0.9, t: 'Position #27 · page 3', f: 'Position #1' },
  ];
  const TOTAL_W = ISSUES.reduce((a, i) => a + i.w, 0);

  ISSUES.forEach((is) => {
    is.target = P[is.pn].querySelector(is.sel);
    const fl = document.createElement('div');
    fl.className = `flag sev-${is.sev}`;
    fl.innerHTML = `<span class="flag-box"></span><span class="flag-tag"><span class="t-b">${is.t}</span><span class="t-a">✓ ${is.f}</span></span>`;
    flagsWrap.appendChild(fl);
    is.el = fl;
    is.tag = fl.querySelector('.flag-tag');
    const li = document.createElement('li');
    li.className = `sev-${is.sev}`;
    li.innerHTML = `<i></i><span><span class="l-b">${is.t}</span><span class="l-a">✓ ${is.f}</span></span>`;
    log.appendChild(li);
    is.li = li;
  });

  /* ---------- Mesures (sans transformations, via offset*) ---------- */
  let bw = 1, bh = 1;
  const LINKS = [['google', 'site'], ['google', 'social'], ['site', 'serp'], ['social', 'serp'], ['google', 'serp']];
  let linkEls = [];
  function rel(el) {
    let x = 0, y = 0, n = el;
    while (n && n !== board) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }
  function measure() {
    bw = board.offsetWidth; bh = board.offsetHeight;
    panels.forEach((pn) => { pn._r = rel(pn); });
    ISSUES.forEach((is) => {
      const r = rel(is.target);
      is.r = r;
      is.cx = (r.x + r.w / 2) / bw;
      Object.assign(is.el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      is.el.classList.toggle('left', r.x + r.w > bw * 0.8);
    });
    linksSvg.setAttribute('viewBox', `0 0 ${bw} ${bh}`);
    linksSvg.innerHTML = '';
    linkEls = LINKS.map(([a, b]) => {
      const ra = P[a]._r, rb = P[b]._r;
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', ra.x + ra.w / 2); l.setAttribute('y1', ra.y + ra.h / 2);
      l.setAttribute('x2', rb.x + rb.w / 2); l.setAttribute('y2', rb.y + rb.h / 2);
      linksSvg.appendChild(l);
      return { el: l, a, b };
    });
    // SERP mini : géométrie avant/après
    SE.youTop = SE.you.offsetTop;
    SE.shift = SE.you.offsetHeight + 4;
  }

  /* ---------- Phases ---------- */
  const PHASES = [
    { at: 0, id: 'init', st: 'INITIALISATION', cls: '', title: 'Nous scannons votre présence.' },
    { at: 0.06, id: 'scan', st: 'ANALYSE EN COURS', cls: '', title: 'Nous scannons votre présence.' },
    { at: 0.42, id: 'done', st: 'DIAGNOSTIC TERMINÉ', cls: 'alert', title: '10 signaux faibles détectés.' },
    { at: 0.465, id: 'flat', st: 'SIGNAL PLAT', cls: 'alert', title: 'Signal plat.' },
    { at: 0.55, id: 'boom', st: 'IMPULSION', cls: 'ok', title: "Puis vient l'impulsion." },
    { at: 0.6, id: 'tf', st: 'TRANSFORMATION', cls: 'ok', title: 'Nous transformons tout.' },
    { at: 0.92, id: 'out', st: 'PRÉSENCE OPTIMISÉE', cls: 'ok', title: 'Présence optimisée.' },
  ];
  let phase = null;
  let live = false;
  function setPhase(ph, forward) {
    if (phase === ph.id) return;
    const prev = phase;
    phase = ph.id;
    statusEl.textContent = ph.st;
    statusEl.className = 'c-status ' + ph.cls;
    if (titleTxt.dataset.text !== ph.title) { titleTxt.dataset.text = ph.title; SP.decode(titleTxt, 0.6); }
    if (!live) return;
    if (ph.id === 'flat') SP.setBPM(0);
    else if (ph.id === 'boom') {
      if (forward && prev === 'flat') { SP.kick(150); SP.flash(1); SP.vibrate([30, 40, 60]); }
      SP.setBPM(110);
    } else if (ph.id === 'tf' || ph.id === 'out') SP.setBPM(84);
    else SP.setBPM(64);
  }

  const pnProg = (p) => ({
    google: seg(p, 0.6, 0.72),
    site: seg(p, 0.64, 0.8),
    social: seg(p, 0.7, 0.84),
    serp: seg(p, 0.76, 0.9),
  });

  let lastP = 0;
  function render(p) {
    const forward = p >= lastP;
    lastP = p;
    let ph = PHASES[0];
    for (const x of PHASES) if (p >= x.at) ph = x;
    setPhase(ph, forward);

    const scan = seg(p, 0.06, 0.42);
    const bx = lerp(-0.03, 1.03, scan);
    const col = ease.inOut(seg(p, 0.465, 0.545));
    const b = seg(p, 0.55, 0.62);
    const boomed = p >= 0.55;
    const tp = pnProg(p);

    // --- panneaux : tracé, révélation, effondrement, retour élastique
    const dimK = boomed ? 1 - ease.back(seg(b, 0, 0.45)) : col;
    panels.forEach((pn, i) => {
      const k = ease.out(seg(p, i * 0.008, 0.045 + i * 0.008));
      pn.style.clipPath = k >= 1 ? 'none' : `inset(0 ${(1 - k) * 100}% ${(1 - k) * 100}% 0)`;
      const r = pn._r;
      const rv = boomed ? 1 : seg(bx, r.x / bw, (r.x + r.w) / bw);
      pn.style.setProperty('--rv', rv.toFixed(3));
      pn.style.opacity = lerp(1, 0.22, clamp(dimK, 0, 1.2));
      pn.style.transform = `translateZ(${DEPTH[i]}px) scale(${lerp(1, 0.95, dimK)})`;
    });

    // --- faisceau
    beam.style.opacity = scan > 0 && scan < 1 ? 1 : 0;
    beam.style.transform = `translateX(${bx * bw}px)`;
    tint.style.width = clamp(bx) * 100 + '%';
    tint.style.opacity = 1 - seg(p, 0.44, 0.5);

    // --- drapeaux
    ISSUES.forEach((is, i) => {
      const found = bx > is.cx;
      const fixK = seg(tp[is.pn], is.k - 0.12, is.k);
      const fixed = fixK >= 1;
      let op = 0, tr = '';
      if (!boomed) {
        const pop = seg(bx, is.cx, is.cx + 0.05);
        op = found ? 1 : 0;
        const s = 1 + 0.12 * (1 - ease.out(pop));
        if (col > 0) {
          const r = is.r;
          const tx = bw / 2 + (i - (ISSUES.length - 1) / 2) * bw * 0.07 - (r.x + r.w / 2);
          const ty = bh / 2 - (r.y + r.h / 2);
          tr = `translate(${tx * col}px,${ty * col}px) scale(${lerp(1, 30 / r.w, col)},${lerp(1, 2 / r.h, col)})`;
          op = 1 - seg(col, 0.85, 1);
        } else tr = `scale(${s})`;
        is.tag.style.opacity = 1 - seg(col, 0, 0.25);
      } else {
        op = ease.out(fixK) * (1 - seg(p, 0.92, 0.96));
        tr = `scale(${1 + 0.1 * (1 - ease.out(fixK))})`;
        is.tag.style.opacity = 1;
      }
      is.el.style.opacity = op;
      is.el.style.transform = tr;
      is.el.classList.toggle('fixed', boomed && fixK > 0);
      is.li.classList.toggle('on', found || boomed);
      is.li.classList.toggle('fixed', boomed && fixed);
    });

    // --- ligne plate → choc
    flatline.style.opacity = col > 0.5 && !boomed ? 1 : 0;
    flatline.style.transform = `scaleX(${seg(col, 0.5, 1)})`;
    flatline.classList.toggle('dead', col > 0.95);
    shock.style.opacity = b > 0 && b < 1 ? (1 - b) : 0;
    shock.style.transform = `scale(${ease.out(b) * 3.2})`;
    if (!SP.reduce && b > 0 && b < 0.5) {
      const k = 1 - b * 2;
      wrap.style.translate = `${Math.sin(b * 95) * 16 * k}px ${Math.cos(b * 70) * 9 * k}px`;
    } else wrap.style.translate = '0 0';

    // --- console : score, progression
    let score;
    if (!boomed) score = scan > 0 ? Math.round(23 * ease.out(scan)) : null;
    else {
      let f = 0;
      ISSUES.forEach((is) => { f += is.w * seg(tp[is.pn], is.k - 0.12, is.k); });
      score = Math.round(23 + 71 * (f / TOTAL_W));
    }
    scoreEl.textContent = score == null ? '--' : score;
    const sc = score || 0;
    ringEl.style.strokeDashoffset = 1 - sc / 100;
    consoleEl.style.setProperty('--ring-c', sc < 40 ? 'var(--red)' : sc < 70 ? 'var(--orange)' : 'var(--pulse)');
    const tfAll = seg(p, 0.6, 0.9);
    progBar.style.width = (boomed ? tfAll : scan) * 100 + '%';
    progEl.classList.toggle('tf', boomed);

    // --- FICHE GOOGLE
    const g = tp.google;
    const rk = ease.inOut(seg(g, 0.1, 0.7));
    const rating = lerp(2.1, 4.8, rk);
    G.note.textContent = fmt(rating, 1);
    G.stars.style.width = (rating / 5) * 100 + '%';
    G.count.textContent = Math.round(lerp(4, 127, rk));
    G.photos.forEach((ph, i) => ph.style.setProperty('--k', ease.out(seg(g, 0.05 + i * 0.1, 0.35 + i * 0.1)).toFixed(3)));
    G.hours.classList.toggle('is-a', g > 0.5);
    G.web.classList.toggle('is-a', g > 0.75);
    P.google.classList.toggle('is-a', g > 0.6);
    brandmarks.forEach((bm) => bm.classList.toggle('is-a', p > 0.68));

    // --- SITE : désagrégation → fil de fer → rendu → mobile
    const s = tp.site;
    const d = ease.in(seg(s, 0, 0.3));
    S.obs.forEach((o) => {
      const [rx, ry, rr] = o._r;
      o.style.transform = d ? `translate(${rx * d * 70}px,${ry * d * 50 + d * 40}px) rotate(${rr * d * 35}deg)` : '';
      o.style.opacity = 1 - d;
    });
    const bgk = seg(s, 0.1, 0.35);
    S.view.style.background = `rgb(${Math.round(lerp(216, 5, bgk))},${Math.round(lerp(210, 10, bgk))},${Math.round(lerp(196, 26, bgk))})`;
    const wk = seg(s, 0.18, 0.5);
    S.wire.forEach((r, i) => { r.style.strokeDashoffset = 1 - seg(wk, i * 0.06, 0.6 + i * 0.06); });
    S.wireSvg.style.opacity = 1 - seg(s, 0.75, 0.92);
    const ak = ease.inOut(seg(s, 0.45, 0.8));
    S.after.style.clipPath = `inset(0 0 ${(1 - ak) * 100}% 0)`;
    const mk = seg(s, 0.75, 0.97);
    S.mobile.style.transform = `translateY(${(1 - (mk > 0 ? ease.back(mk) : 0)) * 130}%)`;
    S.speed.textContent = fmt(lerp(7.8, 0.9, ease.inOut(seg(s, 0.4, 0.9))), 1);
    S.mob.classList.toggle('is-a', s > 0.85);
    S.url.classList.toggle('is-a', s > 0.6);

    // --- RÉSEAUX : les tuiles pivotent vers une identité cohérente
    const so = tp.social;
    SO.tiles.forEach((t, i) => t.style.setProperty('--r', ease.inOut(seg(so, i * 0.09, 0.4 + i * 0.09)) * 180 + 'deg'));
    const fk = ease.inOut(seg(so, 0.2, 0.95));
    SO.f.textContent = Math.round(lerp(212, 3480, fk)).toLocaleString('fr-FR');
    SO.p.textContent = Math.round(lerp(9, 146, fk));

    // --- RECHERCHE : #27 → #1
    const se = ease.inOut(seg(tp.serp, 0.1, 0.8));
    SE.you.style.transform = `translateY(${-SE.youTop * se}px)`;
    SE.items.forEach((it) => { it.style.transform = `translateY(${SE.shift * se}px)`; });
    SE.gap.style.opacity = 1 - seg(se, 0, 0.3);
    SE.rank.textContent = Math.max(1, Math.round(27 - 26 * se));
    P.serp.classList.toggle('is-a', tp.serp > 0.8);

    // --- liens : l'écosystème se connecte
    linkEls.forEach((l) => l.el.classList.toggle('live', tp[l.a] > 0.9 && tp[l.b] > 0.9));

    // --- sortie
    const o = seg(p, 0.93, 1);
    outro.style.opacity = ease.out(seg(o, 0.1, 0.7));
    outro.style.transform = `translateY(calc(-50% + ${(1 - ease.out(o)) * 40}px))`;
    wrap.style.opacity = 1 - o * 0.88;
    consoleEl.style.opacity = 1 - o * 0.88;
    head.style.opacity = 1 - o;
  }

  /* ---------- Inclinaison : les cartes ont une vraie profondeur ---------- */
  if (!SP.touch && !SP.reduce) {
    const rx = gsap.quickTo(board, 'rotationX', { duration: 0.9, ease: 'power3' });
    const ry = gsap.quickTo(board, 'rotationY', { duration: 0.9, ease: 'power3' });
    pin.addEventListener('pointermove', (e) => {
      ry((e.clientX / window.innerWidth - 0.5) * 7);
      rx(-(e.clientY / window.innerHeight - 0.5) * 5);
    });
    pin.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  measure();
  let curP = 0;
  ScrollTrigger.create({
    trigger: sec,
    pin,
    start: 'top top',
    end: () => '+=' + window.innerHeight * (SP.isMobile() ? 4.4 : 5.2),
    onToggle: (st) => { live = st.isActive; if (live) { phase = null; } },
    onUpdate: (st) => { curP = st.progress; render(curP); },
    onRefresh: () => { measure(); render(curP); },
  });
  render(0);
})();
