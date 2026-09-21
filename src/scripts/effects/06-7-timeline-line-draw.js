/* ── 7. TIMELINE LINE DRAW ─────────────
   The vertical timeline bar starts at 0 height
   and grows to full height as the section
   scrolls into view — feels like the career
   history is being written in real-time.
   Uses IntersectionObserver (threshold 0.15)
   so the animation fires early enough to be
   visible but not before the section appears.
   Once drawn, the observer disconnects.
══════════════════════════════════════ */
(function(){
  const tl = document.querySelector('.timeline');
  if (!tl) return;

  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      tl.classList.add('tl-drawn');
      obs.disconnect(); // fire once — no need to watch after drawn
    }
  }, { threshold: 0.15 });

  obs.observe(tl);
})();


