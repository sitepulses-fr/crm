/* 00 — SIGNAL
   Intro (temps) : la ligne naît, le pouls allume la marque, éjecte les leviers,
   qui convergent en constellation « Votre entreprise ».
   Scroll (scrub) : la constellation s'effondre → ligne plate → zoom arrière sur
   des centaines de concurrents → verrouillage → plongée dans le point. */
(function () {
  'use strict';
  const { clamp, lerp, seg, ease, wave } = SP;
  const sec = document.getElementById('hero');
  if (!sec) return;

  const pin = sec.querySelector('.hero-pin');
  const cv = sec.querySelector('.hero-canvas');
  const ctx = cv.getContext('2d');
  const wordmark = sec.querySelector('.hero-wordmark');
  const letters = [...wordmark.querySelectorAll('span')].filter((s) => !s.classList.contains('sp'));
  const eyebrow = sec.querySelector('.hero-copy .eyebrow');
  const titleLines = [...sec.querySelectorAll('.hero-title .lt')];
  const sub = sec.querySelector('.hero-sub');
  const hint = sec.querySelector('.hero-hint');
  const hs1 = sec.querySelector('.hs-1');
  const hs2 = sec.querySelector('.hs-2');
  if (SP.touch) hint.querySelector('.hint-click').textContent = 'Touchez pour envoyer une impulsion';

  const LABELS = ['Google', 'Site web', 'Réseaux sociaux', 'Avis clients', 'SEO', 'Visibilité', 'Clients'];
  const COMP_LABELS = ['Concurrent · 4,8★ · #1', '#2 · 312 avis', '#3 · site pro', 'Top 3 local', '#5 · 1,2k abonnés', '#4 · Google Ads'];
  const ZOUT = 0.4;
  const BEATS = [1.6, 2.9, 3.9, 4.7, 5.4];       // le cœur démarre
  const T_DOCK = 5.9, T_CONVERGE = 6.1, T_TITLE = 6.9, T_IDLE = 8.2;

  let W = 0, H = 0, LY = 0, C = { x: 0, y: 0 }, R = 0, CW = 200, AMP = 100;
  let comps = [];
  const frags = LABELS.map((t, i) => ({
    t, i, born: -1, sx: 0, sy: 0, vx: 0, vy: 0, flash: 0,
    beatIdx: 1 + Math.floor(i / 2), ang: -Math.PI / 2 + (i / LABELS.length) * Math.PI * 2,
  }));
  const pulses = [];
  const rings = [];
  let T = SP.reduce ? 9 : 0, P = 0, nextIntroBeat = 0, docked = false, titled = false, visible = true;
  const glow = SP.glowSprite();
  const glowGrey = SP.glowSprite('120,135,175', '200,208,230');

  function resize() {
    const dpr = SP.dpr();
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const m = SP.isMobile();
    LY = Math.round(m ? H * 0.36 : H * 0.5);
    pin.style.setProperty('--ly', LY + 'px');
    C = m ? { x: W * 0.5, y: LY } : { x: W * 0.72, y: LY };
    R = m ? Math.min(W * 0.3, 120) : Math.min(W * 0.15, H * 0.26);
    CW = m ? 150 : 230;
    AMP = m ? H * 0.09 : H * 0.14;
    frags.forEach((f, i) => { f.sx = W * (0.1 + (0.8 * ((i * 3) % 7)) / 6); });

    const rnd = SP.rng(11);
    const n = m ? 120 : 250;
    const sx = W / ZOUT / 2, sy = H / ZOUT / 2;
    comps = [];
    for (let i = 0; i < n; i++) {
      let x, y;
      do { x = (rnd() * 2 - 1) * sx * 0.96; y = (rnd() * 2 - 1) * sy * 0.92; } while (Math.hypot(x, y * 1.3) < (m ? 200 : 300));
      const b = Math.pow(rnd(), 1.6);
      comps.push({ x, y, b, r: 0.8 + b * 3.4, ph: rnd() * 6.28, label: null });
    }
    // les plus brillants, assez près du centre pour être lisibles
    comps.filter((c) => Math.abs(c.x) < sx * 0.75 && Math.abs(c.y) < sy * 0.7)
      .sort((a, b) => b.b - a.b).slice(0, m ? 3 : 6)
      .forEach((c, i) => { c.label = COMP_LABELS[i]; c.b = Math.max(c.b, 0.85); c.r = 3.6; });
  }

  /* ---------- Pulsations le long de la ligne ---------- */
  function addPulse(x0 = -CW, speed = W / 1.35, amp = 1, idx = -1) {
    pulses.push({ x0, t0: T, speed, amp, idx });
  }
  function lineY(x) {
    let y = 0;
    for (const p of pulses) {
      const front = p.x0 + (T - p.t0) * p.speed;
      y -= wave((front - x) / CW) * AMP * p.amp;
    }
    return y;
  }

  /* ---------- Interaction : envoyer une impulsion ---------- */
  pin.addEventListener('pointerdown', (e) => {
    if (P > 0.12) return;
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    rings.push({ x, y, t0: T });
    addPulse(x - CW * 0.46, W / 1.1, 1);
    SP.kick();
    SP.vibrate([8, 60, 14]);
  });

  SP.onBeat(() => {
    if (!visible || T < T_IDLE || P > 0.1) return;
    addPulse(-CW, W / 1.35, 0.7);
  });

  /* ---------- Dock du logotype dans le HUD (FLIP) ---------- */
  function dock() {
    if (docked) return;
    docked = true;
    const target = document.querySelector('.hud-word');
    const a = wordmark.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    letters.forEach((l) => l.classList.add('settle'));
    if (SP.reduce) { wordmark.style.opacity = 0; document.body.classList.add('is-docked'); return; }
    const s = b.height / a.height;
    gsap.to(wordmark, {
      x: `+=${b.left - a.left}`, y: `+=${b.top - a.top}`,
      scale: s, opacity: 0, duration: 1.2, ease: 'expo.inOut',
      onComplete: () => document.body.classList.add('is-docked'),
    });
    setTimeout(() => document.body.classList.add('is-docked'), 700);
  }

  function showTitle() {
    if (titled) return;
    titled = true;
    if (SP.reduce) {
      gsap.set([eyebrow, sub, hint], { opacity: 1 });
      return;
    }
    titleLines.forEach((l, i) => SP.decode(l, 1.1, i * 0.25));
    gsap.fromTo(eyebrow, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' });
    gsap.fromTo(sub, { opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 1.2, delay: 0.6, ease: 'expo.out' });
    gsap.to(hint, { opacity: 1, duration: 1, delay: 1.4 });
  }
  // le titre est vide tant qu'il n'a pas été « reçu »
  titleLines.forEach((l) => { l.dataset.text = l.textContent; if (!SP.reduce) l.textContent = ' '; });

  /* ---------- Rendu ---------- */
  function draw(dt) {
    T += dt;
    const m = SP.isMobile();

    // séquence d'intro
    while (nextIntroBeat < BEATS.length && T >= BEATS[nextIntroBeat]) {
      addPulse(-CW, W / (1.5 - nextIntroBeat * 0.12), 0.75 + nextIntroBeat * 0.08, nextIntroBeat);
      SP.kick();
      nextIntroBeat++;
    }
    if (T >= T_DOCK) dock();
    if (T >= T_TITLE) showTitle();

    // scroll : avance rapide de l'intro si l'utilisateur part tôt
    if (P > 0.01 && T < T_IDLE) { T = T_IDLE; nextIntroBeat = BEATS.length; frags.forEach((f) => { if (f.born < 0) f.born = 0; }); letters.forEach((l) => l.classList.add('lit')); }

    ctx.clearRect(0, 0, W, H);

    // caméra
    const collapse = ease.inOut(seg(P, 0.03, 0.2));
    const move = ease.inOut(seg(P, 0.08, 0.32));
    const ax = lerp(C.x, W / 2, move);
    const ay = lerp(C.y, H / 2, move);
    const zOut = lerp(1, ZOUT, ease.inOut(seg(P, 0.12, 0.42)));
    const zin = seg(P, 0.72, 1);
    const coreR = lerp(9, 3.6, collapse);
    const ZMAX = (Math.hypot(W, H) / 2 / 3.6) * 1.08;
    const zoom = zin > 0 ? Math.exp(lerp(Math.log(ZOUT), Math.log(ZMAX), Math.min(1, Math.pow(zin / 0.94, 1.7)))) : zOut;
    const flatten = 1 - seg(P, 0.02, 0.18);

    // ---------- la ligne ----------
    const reveal = SP.reduce ? 1 : ease.out(seg(T, 0.2, 1.4));
    const lineA = (1 - seg(P, 0.35, 0.6)) * reveal;
    const ly = lerp(LY, ay, move);
    if (lineA > 0) {
      const x0 = W / 2 - (W / 2) * reveal - 2, x1 = W / 2 + (W / 2) * reveal + 2;
      const mx = SP.mouse.x, my = SP.mouse.y - cv.getBoundingClientRect().top;
      const near = SP.mouse.active && !SP.touch ? Math.exp(-((my - ly) * (my - ly)) / (2 * 110 * 110)) : 0;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) {
        let y = ly + lineY(x) * flatten;
        if (near > 0.01) y += (my - ly) * 0.32 * near * Math.exp(-((x - mx) * (x - mx)) / (2 * 120 * 120));
        x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = `rgba(59,123,255,${0.9 * lineA})`;
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = `rgba(59,123,255,${0.12 * lineA})`;
      ctx.stroke();
    }

    // têtes de pulsation + allumage des lettres + naissance des fragments
    ctx.globalCompositeOperation = 'lighter';
    for (let k = pulses.length - 1; k >= 0; k--) {
      const p = pulses[k];
      const front = p.x0 + (T - p.t0) * p.speed;
      const peakX = front - CW * 0.46;
      if (peakX > W + CW) { pulses.splice(k, 1); continue; }
      const py = ly + lineY(peakX) * flatten;
      ctx.globalAlpha = lineA;
      ctx.drawImage(glow, peakX - 22, py - 22, 44, 44);
      if (p.idx === 0) letters.forEach((l) => { if (!l.classList.contains('lit') && peakX > l._cx) l.classList.add('lit'); });
      if (p.idx > 0) {
        frags.forEach((f) => {
          if (f.born < 0 && f.beatIdx === p.idx && peakX >= f.sx) {
            f.born = T; f.sy = py;
            const rnd = Math.sin(f.i * 91.7) * 0.5 + 0.5;
            f.vx = (rnd - 0.5) * 160;
            f.vy = (f.i % 2 ? 1 : -1) * (120 + rnd * 120);
          }
        });
      }
      // les nœuds de la constellation s'illuminent au passage
      frags.forEach((f) => { if (Math.abs(f._x - peakX) < 18) f.flash = 1; });
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // ---------- concurrents ----------
    const compA = seg(P, 0.14, 0.36) * (1 - seg(P, 0.8, 0.92));
    if (compA > 0) {
      const beatBoost = Math.exp(-SP.beat.since * 5);
      ctx.globalCompositeOperation = 'lighter';
      for (const c of comps) {
        const x = ax + c.x * zoom, y = ay + c.y * zoom;
        if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
        const tw = 0.75 + 0.25 * Math.sin(T * 1.7 + c.ph);
        const a = compA * (0.18 + 0.82 * c.b) * tw;
        const r = c.r * (zoom / ZOUT) ** 0.5 * (1 + (c.b > 0.7 ? 0.7 * beatBoost : 0));
        ctx.globalAlpha = a;
        ctx.drawImage(glow, x - r * 5, y - r * 5, r * 10, r * 10);
      }
      ctx.globalCompositeOperation = 'source-over';
      const la = seg(P, 0.3, 0.42) * (1 - seg(P, 0.62, 0.7));
      if (la > 0) {
        ctx.font = `${m ? 9 : 10.5}px "JetBrains Mono", monospace`;
        ctx.textBaseline = 'middle';
        for (const c of comps) {
          if (!c.label) continue;
          const x = ax + c.x * zoom, y = ay + c.y * zoom;
          const right = x < W * 0.75;
          ctx.globalAlpha = la;
          ctx.strokeStyle = 'rgba(143,180,255,.5)';
          ctx.beginPath(); ctx.moveTo(x + (right ? 8 : -8), y); ctx.lineTo(x + (right ? 22 : -22), y - 10); ctx.stroke();
          ctx.fillStyle = 'rgba(243,246,255,.85)';
          ctx.textAlign = right ? 'left' : 'right';
          ctx.fillText(c.label, x + (right ? 26 : -26), y - 10);
        }
        ctx.globalAlpha = 1;
      }
    }

    // ---------- constellation (fragments) ----------
    const conv = (i) => ease.inOut(seg(T, T_CONVERGE + i * 0.07, T_CONVERGE + 1.2 + i * 0.07));
    const labelA = 1 - seg(P, 0.03, 0.12);
    const linkA = seg(T, T_CONVERGE + 0.9, T_CONVERGE + 1.8) * (1 - collapse);
    const pts = [];
    frags.forEach((f) => {
      if (f.born < 0) return;
      const age = T - f.born;
      const d = (1 - Math.exp(-age * 1.6)) / 1.6;
      const dx = f.sx + f.vx * d, dy = f.sy + f.vy * d;
      const k = conv(f.i);
      const tx = C.x + Math.cos(f.ang) * R, ty = C.y + Math.sin(f.ang) * R * (m ? 1 : 0.92);
      let x = lerp(dx, tx, k), y = lerp(dy, ty, k);
      // effondrement → coordonnées relatives au noyau, caméra appliquée
      const rx = (x - C.x) * (1 - collapse), ry = (y - C.y) * (1 - collapse);
      x = ax + rx * zoom; y = ay + ry * zoom;
      f._x = x;
      f.flash *= 0.9;
      pts.push({ x, y, f, k });
    });
    if (linkA > 0.01) {
      ctx.lineWidth = 1;
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        const prog = seg(T, T_CONVERGE + 0.9 + i * 0.08, T_CONVERGE + 1.6 + i * 0.08);
        ctx.strokeStyle = `rgba(143,180,255,${0.35 * linkA})`;
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, p.x, prog), lerp(ay, p.y, prog));
        if (q && pts.length === frags.length) { ctx.moveTo(p.x, p.y); ctx.lineTo(lerp(p.x, q.x, prog), lerp(p.y, q.y, prog)); }
        ctx.stroke();
      });
    }
    ctx.font = `${m ? 10 : 11}px "JetBrains Mono", monospace`;
    ctx.textBaseline = 'middle';
    pts.forEach(({ x, y, f, k }) => {
      const age = T - f.born;
      const a = Math.min(1, age * 3) * (1 - collapse * 0.9);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a;
      const r = 14 + f.flash * 26;
      ctx.drawImage(glow, x - r, y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
      if (labelA > 0) {
        const out = k > 0.5;
        const ang = f.ang;
        const right = out ? Math.cos(ang) > -0.15 : true;
        const lx = out ? x + Math.cos(ang) * 16 + (right ? 4 : -4) : x + 12;
        const lyy = out ? y + Math.sin(ang) * 14 : y;
        ctx.globalAlpha = a * labelA;
        ctx.textAlign = right ? 'left' : 'right';
        ctx.fillStyle = k > 0.5 ? 'rgba(243,246,255,.92)' : 'rgba(143,180,255,.9)';
        ctx.fillText(k < 0.5 ? `[ ${f.t} ]` : f.t, lx, lyy);
      }
    });
    ctx.globalAlpha = 1;

    // ---------- le noyau : votre entreprise ----------
    const coreIn = SP.reduce ? 1 : seg(T, T_CONVERGE + 0.6, T_CONVERGE + 1.4);
    if (coreIn > 0) {
      const rr = coreR * zoom;
      if (zin > 0.02) {
        // plongée : le point devient l'environnement du diagnostic
        const c1 = [90, 100, 128], c2 = [11, 23, 54];
        const k = seg(zin, 0.1, 0.7);
        const col = c1.map((v, i) => Math.round(lerp(v, c2[i], k)));
        ctx.fillStyle = `rgb(${col.join(',')})`;
        ctx.beginPath(); ctx.arc(ax, ay, rr, 0, 6.283); ctx.fill();
        ctx.lineWidth = 1 + 2 * (1 - k);
        ctx.strokeStyle = `rgba(59,123,255,${0.8 * (1 - seg(zin, 0.75, 1))})`;
        ctx.stroke();
      } else {
        const blue = 1 - collapse;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = coreIn * (0.4 + 0.6 * blue) * (1 + 0.5 * Math.exp(-SP.beat.since * 5) * blue);
        const gr = (blue > 0.3 ? 26 : 12) * (0.5 + coreIn * 0.5) * (1 + 0.3 * Math.exp(-SP.beat.since * 5) * blue);
        ctx.drawImage(blue > 0.3 ? glow : glowGrey, ax - gr, ay - gr, gr * 2, gr * 2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = coreIn;
        ctx.fillStyle = blue > 0.5 ? '#fff' : '#5a6480';
        ctx.beginPath(); ctx.arc(ax, ay, Math.max(1.5, rr * 0.45), 0, 6.283); ctx.fill();
        // un halo gris : on vous trouve à peine
        const findA = seg(P, 0.3, 0.42) * (1 - seg(P, 0.56, 0.62));
        if (findA > 0) {
          ctx.strokeStyle = `rgba(150,160,190,${0.5 * findA})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(ax, ay, 10 + 6 * Math.sin(T * 2), 0, 6.283); ctx.stroke();
        }
        // étiquette
        const tagA = coreIn * (1 - seg(P, 0.02, 0.1)) + seg(P, 0.34, 0.45) * (1 - seg(P, 0.66, 0.72));
        if (tagA > 0) {
          ctx.globalAlpha = Math.min(1, tagA);
          ctx.font = `${m ? 10 : 11}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.fillStyle = P < 0.2 ? 'rgba(143,180,255,.95)' : 'rgba(255,79,100,.95)';
          ctx.fillText(P < 0.2 ? 'VOTRE ENTREPRISE' : 'VOUS · page 3 · 4 avis', ax, ay + (P < 0.2 ? 30 : 22));
        }
        ctx.globalAlpha = 1;
      }
    }

    // ---------- réticule de verrouillage ----------
    const lock = seg(P, 0.56, 0.7) * (1 - seg(P, 0.76, 0.8));
    if (lock > 0) {
      const s = lerp(140, 18, ease.out(seg(P, 0.56, 0.68)));
      const L = 10;
      ctx.strokeStyle = `rgba(143,180,255,${lock})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        const x = ax + sx * s, y = ay + sy * s;
        ctx.moveTo(x, y - sy * L); ctx.lineTo(x, y); ctx.lineTo(x - sx * L, y);
      });
      ctx.stroke();
    }

    // anneaux de clic
    for (let k = rings.length - 1; k >= 0; k--) {
      const r = rings[k], age = T - r.t0;
      if (age > 1.2) { rings.splice(k, 1); continue; }
      ctx.strokeStyle = `rgba(143,180,255,${0.7 * (1 - age / 1.2)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, 8 + ease.out(age / 1.2) * 180, 0, 6.283); ctx.stroke();
    }
  }

  function measureLetters() {
    gsap.set(wordmark, { clearProps: 'transform' });
    letters.forEach((l) => { const r = l.getBoundingClientRect(); l._cx = r.left + r.width / 2; });
    if (docked) gsap.set(wordmark, { opacity: 0 });
  }

  resize();
  measureLetters();
  if (SP.reduce) { letters.forEach((l) => l.classList.add('lit')); frags.forEach((f) => (f.born = 0)); nextIntroBeat = BEATS.length; }
  window.addEventListener('resize', () => { resize(); if (!docked) measureLetters(); });

  /* ---------- Scroll ---------- */
  const tl = gsap.timeline({ paused: true });
  tl.to('.hero-copy', { y: -60, opacity: 0, duration: 0.1, ease: 'power2.in' }, 0.01)
    .to(sub, { y: 40, opacity: 0, duration: 0.08 }, 0.01)
    .to(hint, { opacity: 0, duration: 0.05 }, 0)
    .fromTo(hs1, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.07, ease: 'power2.out' }, 0.28)
    .to(hs1, { opacity: 0, y: -30, duration: 0.06 }, 0.58)
    .fromTo(hs2, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.58)
    .to(hs2, { opacity: 0, duration: 0.04 }, 0.72)
    .set({}, {}, 1);

  ScrollTrigger.create({
    trigger: sec,
    pin,
    start: 'top top',
    end: () => '+=' + window.innerHeight * (SP.isMobile() ? 2.6 : 3.2),
    onUpdate: (s) => {
      P = s.progress;
      tl.progress(P);
      if (P > 0.45 && P < 0.72) SP.setBPM(40);
      else if (P <= 0.45) SP.setBPM(50);
    },
  });
  SP.watch(sec, { onToggle: (a) => (visible = a) });

  SP.tick((dt) => { if (visible || T < T_IDLE) draw(dt); });
})();
