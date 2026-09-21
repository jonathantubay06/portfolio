/* ═══════════════════════════════════════
   SECTION OBJECT MOTION
   Adds .inview only while a section is on screen, so the rendered
   service objects idle-float in one section at a time rather than
   running every loop down the whole page.
═══════════════════════════════════════ */
(function(){
  const targets = document.querySelectorAll('#services, #experience');
  if (!targets.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver(entries => {
    for (const e of entries) e.target.classList.toggle('inview', e.isIntersecting);
  }, { rootMargin: '80px 0px', threshold: 0.06 });

  targets.forEach(t => io.observe(t));
})();
