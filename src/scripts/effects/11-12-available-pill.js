/* ── 12. AVAILABLE PILL ────────────────
   Green "Available for Projects" pill slides
   in from the right after the user scrolls
   past the hero — persistent reminder without
   being a pop-up or blocking anything.
   Clicking it scrolls to #contact.
   Hidden on mobile (stacks with back-to-top).
══════════════════════════════════════ */
(function(){
  const pill = document.getElementById('avail-pill');
  if (!pill) return;

  // IntersectionObserver on the hero is screen-height-agnostic — pill appears
  // exactly when the hero scrolls out of view, regardless of viewport height.
  const hero = document.querySelector('.hero');
  if (hero) {
    const io = new IntersectionObserver(([entry]) => {
      pill.classList.toggle('visible', !entry.isIntersecting);
    }, { threshold: 0.1 });
    io.observe(hero);
  } else {
    window.addEventListener('scroll', () => {
      pill.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
  }
})();


