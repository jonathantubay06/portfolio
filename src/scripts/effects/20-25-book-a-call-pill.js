/* ── 25. BOOK-A-CALL PILL ──────────────────
   Slides in after 800px scroll — appears just
   below the Available pill. Same pattern.
══════════════════════════════════════ */
(function(){
  const pill = document.getElementById('book-pill');
  if (!pill) return;

  const hero = document.querySelector('.hero');
  if (hero) {
    const io = new IntersectionObserver(([entry]) => {
      pill.classList.toggle('visible', !entry.isIntersecting);
    }, { threshold: 0 });
    io.observe(hero);
  } else {
    window.addEventListener('scroll', () => {
      pill.classList.toggle('visible', window.scrollY > 800);
    }, { passive: true });
  }
})();


