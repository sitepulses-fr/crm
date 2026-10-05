/* 03 — ÉCOSYSTÈME
   Huit canaux flottent en désordre et fuient le curseur.
   Une onde part du noyau : chaque canal touché s'allume et rejoint son orbite 3D.
   Les liens se tracent, puis les données circulent. */
(function () {
  'use strict';
  const { clamp, lerp, seg, ease } = SP;
  const sec = document.getElementById('ecosystem');
  if (!sec) return;

  const pin = sec.querySelector('.eco-pin');
  const cv = sec.querySelector('.eco-canvas');
  const ctx = cv.getContext('2d');
  const nodesWrap = sec.querySelector('.eco-nodes');
  const before = sec.querySelector('.eco-before');
  const after = sec.querySelector('.eco-after');
  const afterLines = [...after.querySelectorAll('[data-decode]')];
  const coreLbl = sec.querySelector('.eco-core');
  const card = sec.querySelector('.eco-card');
  const cardK = card.querySelector('.eco-card-k');
  const cardT = card.querySelector('.eco-card-t');
  const hint = sec.querySelector('.eco-hint');
  if (SP.touch) hint.textContent = 'Touchez un canal';

  const NODES = [
    { id: 'google', label: 'Google', glyph: 'G', desc: 'Fiche Google complète, photos, posts et réponses aux avis : vous apparaissez quand on vous cherche près de chez vous.' },
    { id: 'site', label: 'Site web', glyph: '</>', desc: 'Un site rapide, mobile et sur mesure, pensé pour transformer les visiteurs en demandes.' },
    { id: 'insta', label: 'Instagram', glyph: 'IG', desc: 'Une ligne éditoriale et visuelle qui donne envie de vous suivre — et de vous contacter.' },
    { id: 'avis', label: 'Avis clients', glyph: '★', desc: 'Un système simple pour collecter des avis réguliers et y répondre : la confiance se construit en public.' },
    { id: 'tiktok', label: 'TikTok', glyph: 'TT', desc: 'Des formats courts qui montrent votre savoir-faire à ceux qui ne vous connaissent pas encore.' },
    { id: 'seo', label: 'SEO', glyph: 'SEO', desc: 'Les bons mots-clés, une structure propre, du contenu local : Google comprend qui vous êtes et où vous êtes.' },
    { id: 'fb', label: 'Facebook', glyph: 'f', desc: 'Votre communauté locale, vos actualités et vos événements, au même endroit.' },
    { id: 'id', label: 'Identité visuelle', glyph: 'Aa', desc: 'Logo, couleurs, typographies : une image cohérente partout, reconnaissable au premier regard.' },
  ];
  const LINKS = [['google', 'avis'], ['google', 'seo'], ['seo', 'site'], ['site', 'id'], ['insta', 'id'], ['insta', 'tiktok'], ['fb', 'avis'], ['fb', 'insta'], ['site', 'google'], ['tiktok', 'id']];
  const byId = {};
  const rnd = SP.rng(42);
  NODES.forEach((n, i) => {
    byId[n.id] = n;
    n.i = i;
    n.cx = 0.12 + rnd() * 0.76; n.cy = 0.3 + rnd() * 0.55;
    n.ph = rnd() * 6.28; n.ox = 0; n.oy = 0;
    const b = document.createElement('button');
    b.className = 'eco-node';
    b.type = 'button';
    b.innerHTML = `<span class="g">${n.glyph}</span><span class="l">${n.label}</span>`;
    b.setAttribute('aria-label', `${n.label} : ${n.desc}`);
    nodesWrap.appendChild(b);
    n.el = b;
    const show = () => focus(n);
    b.addEventListener('pointerenter', show);
    b.addEventListener('focus', show);
    b.addEventListener('click', show);
    b.addEventListener('pointerleave', () => { if (!SP.touch) focus(null); });
    b.addEventListener('blur', () => focus(null));
  });
  const links = LINKS.map(([a, b], k) => ({ a: byId[a], b: byId[b], k }));

  let focused = null;
  function focus(n) {
    focused = n;
    NODES.forEach((m) => {
      const related = !n || m === n || links.some((l) => (l.a === n && l.b === m) || (l.b === n && l.a === m));
      m.el.classList.toggle('dim', !related);
      m.el.classList.toggle('focus', m === n);
    });
    if (n) { cardK.textContent = n.label; cardT.textContent = n.desc; }
    card.classList.toggle('show', !!n);
  }

  let W = 0, H = 0, CX = 0, CY = 0, RX = 0, RY = 0, P = 0, T = 0, visible = false;
  const glow = SP.glowSprite();
  const ripples = [];

  function resize() {
    const dpr = SP.dpr();
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const m = SP.isMobile();
    CX = W / 2; CY = H * (m ? 0.56 : 0.58);
    RX = m ? W * 0.36 : Math.min(W * 0.33, 480);
    RY = m ? RX * 1.05 : RX * 0.42;
  }

  SP.onBeat(() => { if (visible && P > 0.6) ripples.push({ t0: T }); });

  function draw(dt) {
    T += dt;
    const m = SP.isMobile();
    const mx = SP.mouse.x, my = SP.mouse.y - cv.getBoundingClientRect().top;
    const tiltX = SP.mouse.active && !SP.touch ? (mx / W - 0.5) : 0;
    const tiltY = SP.mouse.active && !SP.touch ? (my / H - 0.5) : 0;
    const maxD = Math.hypot(W, H) * 0.6;
    const ringR = ease.out(seg(P, 0.28, 0.55)) * maxD;
    const rot = T * 0.07 + tiltX * 0.6;
    const ry = RY * (1 + tiltY * (m ? 0.1 : 0.5));

    // positions
    NODES.forEach((n) => {
      // chaos : dérive lente + fuite du curseur
      let cxp = n.cx * W + Math.sin(T * 0.4 + n.ph) * 26;
      let cyp = n.cy * H + Math.cos(T * 0.33 + n.ph * 1.3) * 20;
      const dx = cxp - mx, dy = cyp - my, d = Math.hypot(dx, dy) || 1;
      const push = SP.touch ? 0 : Math.max(0, 170 - d) * 0.7;
      n.ox += ((dx / d) * push - n.ox) * 0.08;
      n.oy += ((dy / d) * push - n.oy) * 0.08;
      cxp += n.ox; cyp += n.oy;
      // ordre : orbite projetée
      const a = (n.i / NODES.length) * Math.PI * 2 + rot;
      const z = (Math.sin(a) + 1) / 2;
      const ox = CX + Math.cos(a) * RX, oy = CY + Math.sin(a) * ry;
      const dist = Math.hypot(n.cx * W - CX, n.cy * H - CY);
      const b = ease.inOut(clamp((ringR - dist) / 260));
      n.b = b;
      n.x = lerp(cxp, ox, b); n.y = lerp(cyp, oy, b);
      n.z = lerp(0.5, z, b);
      const s = lerp(0.9, 0.78 + z * 0.36, b);
      n.el.style.transform = `translate3d(${n.x}px,${n.y}px,0) translate(-50%,-26px) scale(${s.toFixed(3)}) rotate(${((1 - b) * Math.sin(n.ph) * 10).toFixed(2)}deg)`;
      n.el.style.zIndex = Math.round(n.z * 10);
      n.el.classList.toggle('on', b > 0.6);
      if (!focused) n.el.style.opacity = (0.45 + 0.55 * b) * lerp(1, 0.55 + 0.45 * z, b);
      else n.el.style.opacity = '';
    });

    ctx.clearRect(0, 0, W, H);

    // l'onde
    if (ringR > 0 && ringR < maxD) {
      const a = 1 - ringR / maxD;
      ctx.strokeStyle = `rgba(143,180,255,${0.8 * a})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(CX, CY, ringR, ringR * (RY / RX) ** 0.4, 0, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = `rgba(59,123,255,${0.15 * a})`;
      ctx.lineWidth = 16;
      ctx.stroke();
    }

    // orbite
    const orbitA = seg(P, 0.45, 0.6);
    if (orbitA > 0) {
      ctx.strokeStyle = `rgba(150,175,255,${0.12 * orbitA})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      ctx.beginPath(); ctx.ellipse(CX, CY, RX, ry, 0, 0, 6.283); ctx.stroke();
      ctx.setLineDash([]);
    }

    // noyau
    const coreA = seg(P, 0.24, 0.32);
    coreLbl.style.opacity = coreA;
    coreLbl.style.transform = `translate3d(${CX}px,${CY + 26}px,0) translateX(-50%)`;
    if (coreA > 0) {
      const bt = Math.exp(-SP.beat.since * 4);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = coreA;
      const r = 30 + bt * 14;
      ctx.drawImage(glow, CX - r, CY - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(CX, CY, 4, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // rayons noyau → canaux
    const spokeA = seg(P, 0.4, 0.55);
    NODES.forEach((n) => {
      const a = spokeA * n.b * (focused ? (focused === n ? 1 : 0.15) : 0.5);
      if (a <= 0.01) return;
      ctx.strokeStyle = `rgba(143,180,255,${0.35 * a})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(n.x, n.y); ctx.stroke();
    });

    // liens entre canaux
    const flowA = seg(P, 0.58, 0.66);
    links.forEach((l) => {
      const prog = ease.inOut(seg(P, 0.46 + l.k * 0.012, 0.58 + l.k * 0.012)) * Math.min(l.a.b, l.b.b);
      if (prog <= 0.01) return;
      const rel = !focused || l.a === focused || l.b === focused;
      const ex = lerp(l.a.x, l.b.x, prog), ey = lerp(l.a.y, l.b.y, prog);
      ctx.strokeStyle = rel ? 'rgba(59,123,255,.75)' : 'rgba(59,123,255,.12)';
      ctx.lineWidth = rel && focused ? 1.8 : 1.2;
      ctx.beginPath(); ctx.moveTo(l.a.x, l.a.y); ctx.lineTo(ex, ey); ctx.stroke();
      // paquets de données
      if (flowA > 0 && prog > 0.98) {
        ctx.globalCompositeOperation = 'lighter';
        for (let j = 0; j < 2; j++) {
          const f = (T * 0.32 + j * 0.5 + l.k * 0.137) % 1;
          const px = lerp(l.a.x, l.b.x, f), py = lerp(l.a.y, l.b.y, f);
          ctx.globalAlpha = flowA * (rel ? 1 : 0.2) * Math.sin(f * Math.PI);
          ctx.drawImage(glow, px - 9, py - 9, 18, 18);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    });

    // battements : ondes concentriques sur l'orbite
    for (let k = ripples.length - 1; k >= 0; k--) {
      const age = T - ripples[k].t0;
      if (age > 1.4) { ripples.splice(k, 1); continue; }
      const e = ease.out(age / 1.4);
      ctx.strokeStyle = `rgba(59,123,255,${0.35 * (1 - age / 1.4)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(CX, CY, RX * 1.25 * e, ry * 1.25 * e, 0, 0, 6.283); ctx.stroke();
    }
  }

  /* ---------- Textes ---------- */
  let afterShown = false;
  function texts() {
    before.style.opacity = 1 - seg(P, 0.26, 0.36);
    before.style.transform = `translateY(${-seg(P, 0.26, 0.36) * 30}px)`;
    const show = P > 0.6;
    if (show !== afterShown) {
      afterShown = show;
      if (show) { after.style.opacity = 1; afterLines.forEach((l, i) => SP.decode(l, 1, i * 0.3)); }
      else after.style.opacity = 0;
    }
    hint.classList.toggle('show', P > 0.66);
  }

  resize();
  window.addEventListener('resize', resize);
  ScrollTrigger.create({
    trigger: sec,
    pin,
    start: 'top top',
    end: () => '+=' + window.innerHeight * (SP.isMobile() ? 2.6 : 3.2),
    onUpdate: (s) => { P = s.progress; texts(); },
  });
  SP.watch(sec, { onToggle: (a) => (visible = a) });
  SP.tick((dt) => { if (visible) draw(dt); });
  texts();
})();
