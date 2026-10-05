/* SITE PULSE — orchestration : chapitres, coutures, magnétisme, mise en route. */
(function () {
  'use strict';

  SP.initSeams();
  SP.magnetize();

  // chapitres : le HUD et le rythme suivent le récit
  document.querySelectorAll('[data-chapter]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (s) => {
        if (!s.isActive) return;
        SP.setChapter(sec.dataset.chapter);
        if (sec.id !== 'diagnostic') SP.setBPM(+sec.dataset.bpm);
      },
    });
  });

  const ready = () => {
    document.body.classList.remove('is-loading');
    ScrollTrigger.refresh();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready);
  else window.addEventListener('load', ready);

  // un seul recalcul après un redimensionnement
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 200); });
})();
