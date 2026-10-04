/* SITE PULSE — noyau
   Horloge de battement unique, BPM, moniteur ECG, scroll lissé, curseur,
   magnétisme, décodage de texte, coutures entre scènes. */
(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const mq = (q) => window.matchMedia(q).matches;
  const SP = (window.SP = {});

  /* ---------- Configuration ---------- */
  SP.CONTACT_EMAIL = 'contact@sitepulse.fr';

  SP.reduce = mq('(prefers-reduced-motion: reduce)');
  SP.touch = mq('(hover: none), (pointer: coarse)');
  SP.isMobile = () => window.innerWidth < 820;

  SP.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  SP.lerp = (a, b, t) => a + (b - a) * t;
  SP.seg = (p, a, b) => SP.clamp((p - a) / (b - a));
  SP.ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    back: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
  };
  SP.fmt = (n, d = 0) => n.toFixed(d).replace('.', ',');

  /* Seeded random — les compositions sont identiques à chaque visite. */
  SP.rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  /* La signature : le double battement « pu-PULSE ».
     u ∈ [0,1] parcourt le complexe ; renvoie une amplitude ≈ [-0.45, 1]. */
  SP.wave = function (u) {
    if (u <= 0 || u >= 1) return 0;
    const g = (m, s, a) => a * Math.exp(-((u - m) * (u - m)) / (2 * s * s));
    return g(0.3, 0.02, 0.36) - g(0.4, 0.012, 0.2) + g(0.46, 0.013, 1) - g(0.52, 0.014, 0.42) + g(0.72, 0.05, 0.13);
  };

  /* Construit un tracé SVG « ligne plate + battements ». */
  SP.ecgPath = function (width, mid, beats, step = 3) {
    let d = `M0 ${mid.toFixed(1)}`;
    for (let x = step; x <= width; x += step) {
      let y = mid;
      for (const b of beats) y -= SP.wave((x - b.x) / b.w + 0.46) * b.a;
      d += ` L${x} ${y.toFixed(1)}`;
    }
    return d;
  };

  /* ---------- Horloge de battement ---------- */
  const beat = (SP.beat = { bpm: 44, target: 44, phase: 0.5, count: 0, since: 9 });
  const beatFns = [];
  const tickFns = [];
  SP.onBeat = (fn) => beatFns.push(fn);
  SP.tick = (fn) => tickFns.push(fn);
  SP.setBPM = (v) => { beat.target = v; };
  SP.kick = (bpm) => {
    if (bpm) { beat.bpm = bpm; beat.target = Math.max(beat.target, 1); }
    fire();
  };
  function fire() {
    beat.phase = 0; beat.count++; beat.since = 0;
    for (const f of beatFns) f(beat);
  }

  let last = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    beat.bpm += (beat.target - beat.bpm) * Math.min(1, dt * 1.6);
    if (beat.target <= 0 && beat.bpm < 1.5) beat.bpm = 0;
    beat.since += dt;
    if (beat.bpm > 1) {
      beat.phase += (dt * beat.bpm) / 60;
      if (beat.phase >= 1) fire();
    }
    for (const f of tickFns) f(dt, now / 1000);
  });

  /* ---------- HUD : BPM, chapitre, logo vivant ---------- */
  const bpmBox = document.querySelector('.hud-bpm');
  const bpmEl = bpmBox && bpmBox.querySelector('b');
  const logo = document.querySelector('.hud-logo');
  let bpmAcc = 0;
  SP.tick((dt) => {
    bpmAcc += dt;
    if (bpmAcc < 0.1 || !bpmEl) return;
    bpmAcc = 0;
    const v = Math.round(beat.bpm);
    bpmEl.textContent = String(v).padStart(3, '0');
    bpmBox.classList.toggle('flat', v < 2);
    document.documentElement.style.setProperty('--bpm', Math.max(30, v));
  });
  SP.onBeat(() => {
    if (bpmBox) { bpmBox.classList.add('beat'); setTimeout(() => bpmBox.classList.remove('beat'), 140); }
    if (logo) { logo.classList.remove('beat'); void logo.offsetWidth; logo.classList.add('beat'); }
  });

  const chapterEl = document.querySelector('.hud-chapter-txt');
  SP.setChapter = (txt) => {
    if (!chapterEl || chapterEl.dataset.text === txt) return;
    chapterEl.dataset.text = txt;
    SP.decode(chapterEl, 0.7);
  };

  /* ---------- Moniteur ECG permanent ---------- */
  const mon = document.querySelector('.monitor canvas');
  if (mon) {
    const mctx = mon.getContext('2d');
    let mw = 0, mh = 0, buf = [], acc = 0;
    const SPEED = 110;
    const size = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      mw = mon.clientWidth; mh = mon.clientHeight;
      mon.width = mw * d; mon.height = mh * d;
      mctx.setTransform(d, 0, 0, d, 0, 0);
      buf = new Array(Math.ceil(mw)).fill(0);
    };
    size();
    window.addEventListener('resize', size);
    SP.tick((dt) => {
      if (!mw) return;
      acc += dt * SPEED;
      const n = Math.floor(acc);
      acc -= n;
      const dur = Math.min(0.9, (0.85 * 60) / Math.max(beat.bpm, 40));
      for (let i = n - 1; i >= 0; i--) buf.push(SP.wave((beat.since - i / SPEED) / dur));
      if (buf.length > mw) buf.splice(0, buf.length - mw);
      mctx.clearRect(0, 0, mw, mh);
      const mid = mh * 0.62, amp = mh * 0.5;
      const flat = beat.bpm < 2;
      mctx.lineWidth = 1.2;
      mctx.strokeStyle = flat ? 'rgba(255,79,100,.85)' : 'rgba(59,123,255,.9)';
      mctx.beginPath();
      const off = mw - buf.length;
      for (let i = 0; i < buf.length; i++) {
        const y = mid - buf[i] * amp;
        i ? mctx.lineTo(off + i, y) : mctx.moveTo(off + i, y);
      }
      mctx.stroke();
      // tête
      const hy = mid - buf[buf.length - 1] * amp;
      mctx.fillStyle = '#fff';
      mctx.beginPath(); mctx.arc(mw - 1, hy, 2, 0, 6.283); mctx.fill();
      // fondu à gauche
      mctx.globalCompositeOperation = 'destination-out';
      const g = mctx.createLinearGradient(0, 0, mw * 0.35, 0);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      mctx.fillStyle = g; mctx.fillRect(0, 0, mw * 0.35, mh);
      mctx.globalCompositeOperation = 'source-over';
    });
  }

  /* ---------- Scroll lissé (desktop) ---------- */
  if (!SP.reduce && !SP.touch && window.Lenis) {
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    SP.lenis = lenis;
  }
  SP.scrollTo = (target) => {
    if (SP.lenis) SP.lenis.scrollTo(target, { duration: 2.2 });
    else document.querySelector(target).scrollIntoView({ behavior: SP.reduce ? 'auto' : 'smooth' });
  };
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2 || !document.querySelector(id)) return;
      e.preventDefault();
      SP.scrollTo(id);
    });
  });

  /* ---------- Pointeur global ---------- */
  SP.mouse = { x: -9999, y: -9999, vx: 0, vy: 0, active: false };
  window.addEventListener('pointermove', (e) => {
    SP.mouse.vx = e.clientX - SP.mouse.x;
    SP.mouse.vy = e.clientY - SP.mouse.y;
    SP.mouse.x = e.clientX; SP.mouse.y = e.clientY; SP.mouse.active = true;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { SP.mouse.active = false; });

  /* ---------- Curseur ---------- */
  const cursor = document.querySelector('.cursor');
  if (cursor && !SP.touch) {
    document.body.classList.add('has-cursor');
    const dot = cursor.querySelector('.cursor-dot');
    const ring = cursor.querySelector('.cursor-ring');
    const lbl = cursor.querySelector('.cursor-lbl');
    let rx = 0, ry = 0;
    SP.tick(() => {
      const { x, y } = SP.mouse;
      rx += (x - rx) * 0.2; ry += (y - ry) * 0.2;
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      lbl.style.transform = `translate3d(${rx + 40}px,${ry - 30}px,0)`;
    });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('a, button, [data-cursor], .eco-node');
      let mode = '';
      if (t) mode = t.dataset.cursor || 'link';
      if (e.target.closest('input')) mode = '';
      cursor.dataset.mode = mode;
    });
  }

  /* ---------- Boutons magnétiques & physiques ---------- */
  SP.magnetize = (root = document) => {
    if (SP.touch || SP.reduce) return;
    root.querySelectorAll('[data-magnetic]').forEach((el) => {
      const inner = el.querySelector('span');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: dx * 0.32, y: dy * 0.4, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
        if (inner) gsap.to(inner, { x: dx * 0.12, y: dy * 0.14, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
      });
      el.addEventListener('pointerleave', () => {
        gsap.to(el, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 1.1, ease: 'elastic.out(1, 0.32)', overwrite: 'auto' });
        if (inner) gsap.to(inner, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.32)', overwrite: 'auto' });
      });
      el.addEventListener('pointerdown', () => gsap.to(el, { scaleX: 1.08, scaleY: 0.88, duration: 0.14, ease: 'power2.out' }));
      el.addEventListener('pointerup', () => gsap.to(el, { scaleX: 1, scaleY: 1, duration: 0.9, ease: 'elastic.out(1.2, 0.28)' }));
    });
  };

  /* ---------- Décodage : le texte arrive comme un signal ---------- */
  const GLYPHS = '01<>/\\|_—·+×#%=';
  SP.scramble = (txt, p) => {
    const n = txt.length;
    let out = '';
    for (let i = 0; i < n; i++) {
      const c = txt[i];
      if (c === ' ' || c === ' ') { out += c; continue; }
      const t = (i / n) * 0.75;
      if (p >= t + 0.25) out += c;
      else if (p > t) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      else out += ' ';
    }
    return out;
  };
  SP.decode = (el, dur = 1, delay = 0) => {
    const txt = el.dataset.text || (el.dataset.text = el.textContent);
    gsap.killTweensOf(el.__dec || {});
    if (SP.reduce) { el.textContent = txt; return; }
    const o = (el.__dec = { p: 0 });
    el.textContent = SP.scramble(txt, 0);
    gsap.to(o, { p: 1, duration: dur, delay, ease: 'none', onUpdate: () => { el.textContent = SP.scramble(txt, o.p); }, onComplete: () => { el.textContent = txt; } });
  };

  /* ---------- Flash global (choc) ---------- */
  const flashEl = document.querySelector('.flash');
  SP.flash = (strength = 1) => {
    if (SP.reduce || !flashEl) return;
    gsap.fromTo(flashEl, { opacity: 0.9 * strength }, { opacity: 0, duration: 0.9, ease: 'power2.out', overwrite: true });
  };

  SP.vibrate = (pattern) => {
    const ua = navigator.userActivation;
    if (!SP.touch || !navigator.vibrate || (ua && !ua.hasBeenActive)) return;
    try { navigator.vibrate(pattern); } catch (e) { /* non supporté */ }
  };

  /* ---------- Coutures : la ligne traverse la page entre deux scènes ---------- */
  SP.initSeams = () => {
    document.querySelectorAll('.seam').forEach((seam) => {
      const dim = seam.querySelector('.seam-dim');
      const line = seam.querySelector('.seam-line');
      const head = seam.querySelector('.seam-head');
      const lbl = seam.querySelector('.seam-lbl');
      lbl.textContent = seam.dataset.label || '';
      const beats = [{ x: 500, w: 130, a: 34 }];
      const d = SP.ecgPath(1000, 50, beats, 2);
      dim.setAttribute('d', d);
      line.setAttribute('d', d);
      const len = line.getTotalLength();
      line.style.strokeDasharray = `${len} ${len}`;
      line.style.strokeDashoffset = len;
      let fired = false;
      const update = (p) => {
        const L = len * p;
        line.style.strokeDashoffset = len - L;
        const pt = line.getPointAtLength(L);
        head.style.left = pt.x / 10 + '%';
        head.style.top = pt.y + '%';
        const past = p > 0.5;
        if (past !== fired) {
          fired = past;
          seam.classList.toggle('fired', past);
          if (past) { SP.kick(); SP.vibrate(12); }
        }
      };
      update(0);
      ScrollTrigger.create({
        trigger: seam,
        start: 'top 85%',
        end: 'bottom 15%',
        onUpdate: (s) => update(s.progress),
      });
    });
  };

  /* Observe si un élément est à l'écran (pour couper les boucles canvas). */
  SP.watch = (el, opts = {}) => {
    const state = { active: false };
    ScrollTrigger.create({
      trigger: el,
      start: opts.start || 'top bottom',
      end: opts.end || 'bottom top',
      onToggle: (s) => { state.active = s.isActive; if (opts.onToggle) opts.onToggle(s.isActive); },
    });
    return state;
  };

  SP.dpr = () => Math.min(window.devicePixelRatio || 1, 2);

  /* Sprite de lueur pré-rendu (bien plus rapide que shadowBlur). */
  SP.glowSprite = (rgb = '59,123,255', core = '190,212,255') => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${core},1)`);
    gr.addColorStop(0.18, `rgba(${rgb},.7)`);
    gr.addColorStop(0.5, `rgba(${rgb},.16)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return c;
  };
})();
