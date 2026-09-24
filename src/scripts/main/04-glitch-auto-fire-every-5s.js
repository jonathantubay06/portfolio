/* ═══════════════════════════════════════
   GLITCH AUTO-FIRE (once, after load)
═══════════════════════════════════════ */
(function(){
  const name = document.querySelector('.glitch-name');
  if (!name) return;

  // Once, just after the name lands. It used to fire every 3s for as long
  // as the page was open, even with the hero scrolled away: repeated
  // flashing competes with reading and is an accessibility concern
  // (WCAG 2.2.2). Hovering the name still replays it (04-hero.css).
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setTimeout(() => {
    name.classList.add('glitch-auto');
    setTimeout(() => name.classList.remove('glitch-auto'), 600); // 600ms = animation duration in CSS
  }, 1400);
})();
