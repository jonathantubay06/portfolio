/* ── 30. PAUSE LOOPING ANIMATIONS OFF SCREEN ───────────────────
   The page carries ~38 infinite CSS animations (glowing divider lines,
   pulsing dots, the hero's wires and lamps, heading sweeps). Browsers keep
   running them while they are scrolled out of view, and several animate
   text-shadow or filter, which repaints every frame: battery on laptops
   and phones, and jank on cheap Android devices.

   Each top-level block of the page gets .is-offscreen while it is more
   than 300px outside the viewport; CSS (52-banger.css) sets
   animation-play-state:paused on it and its descendants. The margin means
   a block is running again well before it scrolls into view, so nothing
   is ever seen paused.

   Scroll-driven animations inside these blocks pause too, which is fine:
   they only matter while their block is on screen, and they resume from
   the scroll position when it returns.
══════════════════════════════════════ */
(function(){
  if (!('IntersectionObserver' in window)) return;
  const blocks = document.querySelectorAll('main > *, body > footer, .divider');
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => en.target.classList.toggle('is-offscreen', !en.isIntersecting));
  }, { rootMargin: '300px 0px' });
  blocks.forEach(el => io.observe(el));
})();
