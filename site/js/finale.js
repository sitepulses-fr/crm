/* 05 — CONTACT
   La ligne revient, calme, et devient une corde physique (équation d'onde 1D).
   Chaque touche pince la corde et accélère le pouls : vous lui donnez vie. */
(function () {
  'use strict';
  const { clamp, wave } = SP;
  const sec = document.getElementById('contact');
  if (!sec) return;

  const cv = sec.querySelector('.finale-canvas');
  const ctx = cv.getContext('2d');
  const form = sec.querySelector('.pulse-form');
  const input = form.querySelector('input');
  const result = sec.querySelector('.finale-result');
  const mail = sec.querySelector('.foot-mail');
  sec.querySelector('.year').textContent = new Date().getFullYear();
  mail.href = 'mailto:' + SP.CONTACT_EMAIL;
  mail.textContent = SP.CONTACT_EMAIL;

  const N = 260;
  const y = new Float32Array(N), v = new Float32Array(N);
  let W = 0, H = 0, LY = 0, visible = false, T = 0;
  const pulses = [];
  const measureCtx = document.createElement('canvas').getContext('2d');

  function resize() {
    const dpr = SP.dpr();
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sr = sec.getBoundingClientRect(), ir = input.getBoundingClientRect();
    LY = ir.bottom - sr.top;
  }

  function pluck(x, amount, spread = 3) {
    const c = Math.round((x / W) * (N - 1));
    for (let i = -spread * 2; i <= spread * 2; i++) {
      const j = c + i;
      if (j > 0 && j < N - 1) v[j] += amount * Math.exp(-(i * i) / (2 * spread * spread));
    }
  }

  function caretX() {
    const cs = getComputedStyle(input);
    measureCtx.font = `${cs.fontSize} ${cs.fontFamily}`;
    const ir = input.getBoundingClientRect(), sr = sec.getBoundingClientRect();
    const txt = input.value.slice(0, input.selectionStart ?? input.value.length);
    let w = measureCtx.measureText(txt).width;
    if (cs.textAlign === 'center') w = (ir.width - measureCtx.measureText(input.value).width) / 2 + w;
    return Math.min(ir.right, ir.left + w) - sr.left;
  }

  input.addEventListener('input', () => {
    pluck(caretX(), -7 - Math.random() * 4);
    SP.setBPM(clamp(56 + input.value.length * 3, 56, 132));
  });
  input.addEventListener('focus', () => pluck(caretX(), -10, 6));

  SP.onBeat(() => { if (visible) pulses.push({ t0: T, speed: W / 1.6 }); });

  let prevMy = null;
  function step(dt) {
    T += dt;
    // le curseur effleure la corde
    if (!SP.touch && SP.mouse.active) {
      const r = sec.getBoundingClientRect();
      const my = SP.mouse.y - r.top, mx = SP.mouse.x - r.left;
      if (prevMy !== null && Math.abs(my - LY) < 40 && Math.sign(prevMy - LY) !== Math.sign(my - LY)) {
        pluck(mx, clamp((my - prevMy) * 0.6, -14, 14), 4);
      }
      prevMy = my;
    }
    for (let s = 0; s < 3; s++) {
      for (let i = 1; i < N - 1; i++) v[i] += (y[i - 1] + y[i + 1] - 2 * y[i]) * 0.42 - y[i] * 0.002;
      for (let i = 1; i < N - 1; i++) { v[i] *= 0.992; y[i] += v[i]; }
    }

    ctx.clearRect(0, 0, W, H);
    const CW = SP.isMobile() ? 120 : 190;
    const amp = SP.isMobile() ? 26 : 38;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * W;
      let yy = LY + y[i];
      for (const p of pulses) yy -= wave(((T - p.t0) * p.speed - x) / CW) * amp * 0.6;
      i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
    }
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(59,123,255,.95)';
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(59,123,255,.12)';
    ctx.stroke();
    for (let k = pulses.length - 1; k >= 0; k--) if ((T - pulses[k].t0) * pulses[k].speed > W + CW) pulses.splice(k, 1);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (!val) {
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      pluck(W / 2, 22, 10);
      input.focus();
      return;
    }
    form.classList.remove('sending'); void form.offsetWidth; form.classList.add('sending');
    for (let i = 0; i < 5; i++) setTimeout(() => { SP.kick(120); pluck(W * (0.2 + i * 0.15), -16, 6); }, i * 180);
    SP.vibrate([10, 50, 10, 50, 30]);
    const subject = encodeURIComponent(`Diagnostic SITE PULSE — ${val}`);
    const body = encodeURIComponent(`Bonjour,\n\nJe souhaite recevoir le diagnostic de présence digitale de : ${val}\n\nMerci !`);
    const href = `mailto:${SP.CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setTimeout(() => {
      result.dataset.text = 'Signal reçu. Votre messagerie s\'ouvre pour confirmer la demande.';
      SP.decode(result, 0.9);
      window.location.href = href;
      setTimeout(() => {
        result.innerHTML = `Signal reçu. Si rien ne s'ouvre&nbsp;: <a href="${href}">${SP.CONTACT_EMAIL}</a>`;
        SP.setBPM(72);
      }, 1100);
    }, 1000);
  });

  resize();
  window.addEventListener('resize', resize);
  ScrollTrigger.addEventListener('refresh', resize);
  SP.watch(sec, { onToggle: (a) => { visible = a; if (a) resize(); } });
  SP.tick((dt) => { if (visible) step(dt); });
})();
