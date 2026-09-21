/* ── 3. MOUSE SPOTLIGHT ────────────────
   A soft cyan radial gradient follows the
   cursor over the hero, revealing more of
   the anime background — adds depth and
   makes the hero feel interactive.
   Uses lerp (0.09 factor) so the spotlight
   has a slight lag behind the cursor, which
   gives it weight and feels cinematic.
══════════════════════════════════════ */
(function(){
  // Disabled with the 2026-09-21 hero rebuild: the hero now holds a single
  // workstation render, and a mouse-follow glow sat on top of it as another
  // competing layer. Kept rather than deleted so it can be restored if the
  // hero direction changes.
  return;

  if (PREFERS_REDUCED_MOTION) return; // decorative motion only — nothing here carries content
  if (window.matchMedia('(hover: none)').matches) return;

  const hero = document.querySelector('.hero');
  if (!hero) return;

  // Injected div — cleaner than ::after, no z-index fights with canvas or overlay
  const spot = document.createElement('div');
  spot.className = 'hero-spotlight';
  spot.setAttribute('aria-hidden', 'true');
  hero.appendChild(spot);

  let tX = 0, tY = 0, cX = 0, cY = 0, rafId = null;

  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    tX = e.clientX - r.left;
    tY = e.clientY - r.top;
  }, { passive: true }); // passive — no preventDefault, browser can scroll optimise

  function loop() {
    // Linear interpolation: moves 9% closer to target each frame (~60fps)
    cX += (tX - cX) * 0.09;
    cY += (tY - cY) * 0.09;
    spot.style.setProperty('--sx', `${cX}px`);
    spot.style.setProperty('--sy', `${cY}px`);
    rafId = requestAnimationFrame(loop);
  }

  hero.addEventListener('mouseenter', () => {
    const r = hero.getBoundingClientRect();
    cX = r.width / 2; cY = r.height / 2; // start from center so it doesn't jump in from 0,0
    spot.style.opacity = '1';
    loop();
  });

  hero.addEventListener('mouseleave', () => {
    spot.style.opacity = '0';
    cancelAnimationFrame(rafId); // stop the loop — no point running when mouse is gone
  });
})();


