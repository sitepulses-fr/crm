/* 04 — VISIBILITÉ → CLIENTS
   #27 → #8 (le compteur défile), puis l'entreprise double chaque concurrent.
   À #1 la fiche s'ouvre et les clients en sortent, battement après battement. */
(function () {
  'use strict';
  const { clamp, lerp, seg, ease } = SP;
  const sec = document.getElementById('visibility');
  if (!sec) return;

  const pin = sec.querySelector('.vis-pin');
  const left = sec.querySelector('.vis-left');
  const rankEl = sec.querySelector('.vis-rank');
  const serp = sec.querySelector('.serp-big');
  const list = sec.querySelector('.sb-list');
  const comps = [...list.querySelectorAll('.sb-it')];
  const gap = list.querySelector('.sb-gap');
  const you = list.querySelector('.sb-you');
  const youRank = you.querySelector('em b');
  const actions = you.querySelector('.sb-actions');
  const notifsBox = sec.querySelector('.notifs');
  const notifs = [...sec.querySelectorAll('.notif')];
  const signal = sec.querySelector('.notif-signal path');
  const stats = sec.querySelector('.vis-stats');
  const statNums = [...stats.querySelectorAll('b[data-to]')];

  let h = 50, youH = 60, cardH = 70;
  function measure() {
    h = comps[0].offsetHeight + 4;
    youH = you.offsetHeight;
    list.style.height = h * 7 + 26 + youH + 'px';
    gap.style.transform = `translateY(${h * 7}px)`;
    cardH = notifs[0].offsetHeight + 12;
    // tracé : un battement par notification
    const H = notifsBox.clientHeight || 400;
    const beats = notifs.map((_, i) => ({ x: (i * cardH + cardH / 2) * (600 / H), w: 50, a: 9 }));
    // tracé vertical : on construit horizontalement puis on échange x/y
    const d = SP.ecgPath(600, 9, beats, 3).replace(/([ML])([\d.]+) ([\d.-]+)/g, (_, c, x, y) => `${c}${y} ${x}`);
    signal.setAttribute('d', d);
    signal.parentNode.setAttribute('viewBox', '0 0 18 600');
  }

  let lastRank = 27;
  function render(p) {
    const m = SP.isMobile();
    // A : la remontée invisible, 27 → 8
    const a = ease.inOut(seg(p, 0.06, 0.28));
    // B : les dépassements, 8 → 1
    const b = ease.inOut(seg(p, 0.3, 0.62));
    let rank, slot;
    if (b <= 0) { rank = Math.round(lerp(27, 8, a)); slot = 7; }
    else { const rc = lerp(8, 1, b); rank = Math.round(rc); slot = rc - 1; }

    // le classement
    const baseY = (s) => s * h;
    comps.forEach((c, i) => {
      const shift = clamp(i + 1 - slot, 0, 1);
      c.style.transform = `translateY(${baseY(i) + shift * (youH + 6)}px)`;
    });
    gap.style.opacity = 1 - seg(b, 0, 0.15);
    const lane = b > 0 && b < 1 ? Math.sin(b * Math.PI) : 0;
    const youY = baseY(slot) + 26 * clamp(slot - 6, 0, 1);
    you.style.transform = `translate(${lane * (m ? 10 : 22)}px, ${youY}px) scale(${1 + lane * 0.03})`;
    you.classList.toggle('top', rank === 1);
    actions.style.clipPath = `inset(0 ${(1 - ease.out(seg(p, 0.62, 0.7))) * 100}% 0 0)`;

    rankEl.textContent = rank;
    youRank.textContent = rank;
    rankEl.classList.toggle('top', rank === 1);
    if (rank !== lastRank) {
      if (rank < lastRank && rank <= 7) {
        const passed = comps[rank - 1];
        if (passed) { passed.classList.remove('passed'); void passed.offsetWidth; passed.classList.add('passed'); }
        SP.kick();
        SP.vibrate(8);
      }
      lastRank = rank;
    }

    // C/D : les clients sortent de la fiche
    const nr = notifsBox.getBoundingClientRect();
    const yr = you.getBoundingClientRect();
    const fromX = yr.right - nr.left - 40, fromY = yr.top + yr.height / 2 - nr.top;
    notifs.forEach((n, i) => {
      const k = seg(p, 0.68 + i * 0.05, 0.75 + i * 0.05);
      const e = ease.out(k);
      const ty = m ? i * (cardH * 0.82) : i * cardH;
      const x = lerp(m ? 0 : fromX - nr.width / 2, 0, e);
      const y = lerp(m ? ty + 40 : fromY, ty, e);
      const arc = m ? 0 : Math.sin(e * Math.PI) * -40;
      n.style.transform = `translate(${x}px, ${y + arc}px) scale(${lerp(0.4, 1, e)})`;
      n.style.opacity = seg(k, 0, 0.3);
      if (k > 0 && !n._fired) { n._fired = true; SP.kick(); }
      if (k === 0) n._fired = false;
    });
    signal.style.strokeDashoffset = 1 - seg(p, 0.68, 0.95);
    if (m) {
      serp.style.opacity = 1 - 0.75 * seg(p, 0.66, 0.72);
      left.style.opacity = 1 - seg(p, 0.82, 0.86);
    }

    // chiffres de projection
    const sk = seg(p, 0.86, 0.97);
    stats.style.opacity = ease.out(sk);
    stats.style.transform = `translateY(${(1 - ease.out(sk)) * 30}px)`;
    statNums.forEach((s) => {
      const to = +s.dataset.to;
      const v = to <= 10 ? SP.fmt(lerp(1, to, ease.out(sk)), 1).replace(',0', '') : Math.round(lerp(0, to, ease.out(sk)));
      s.textContent = s.dataset.pre + v + s.dataset.suf;
    });
  }

  measure();
  let cur = 0;
  ScrollTrigger.create({
    trigger: sec,
    pin,
    start: 'top top',
    end: () => '+=' + window.innerHeight * (SP.isMobile() ? 3.2 : 3.8),
    onUpdate: (s) => { cur = s.progress; render(cur); },
    onRefresh: () => { measure(); render(cur); },
  });
  render(0);
})();
