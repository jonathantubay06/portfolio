/* ── 43. TECH STACK PIPELINE ──────────────────────────────────
   Adds .go to the tech stack band the first time it is well in view:
   a light runs along the pipe and wakes the Build, Automate and Ship
   nodes in turn (68-tech-pipeline.css). Once only. Reduced motion gets
   the lit end state at once.
══════════════════════════════════════ */
(function () {
  var band = document.querySelector('.stk');
  if (!band) return;
  if (PREFERS_REDUCED_MOTION || !('IntersectionObserver' in window)) { band.classList.add('go'); return; }
  var io = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    band.classList.add('go');
  }, { threshold: 0.45 });
  io.observe(band);
})();
