/* ── 18. SECTION LABEL ENTRY FLASH ────────
   Adds .flash to each .sec-label when it enters
   the viewport — triggers the CSS label-flash
   keyframe (brief neon burst) then removes the
   class so it could replay on re-entry.
══════════════════════════════════════ */
(function(){
  const labels = document.querySelectorAll('.sec-label');
  if (!labels.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.remove('flash'); // reset to allow replay
      // Force reflow so removing+adding the class triggers a fresh animation
      void el.offsetWidth;
      el.classList.add('flash');
      // Remove after animation duration so it can replay on re-scroll
      setTimeout(() => el.classList.remove('flash'), 800);
    });
  }, { threshold: 0.8 });

  labels.forEach(el => io.observe(el));
})();
