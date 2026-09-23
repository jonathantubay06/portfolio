/* ═══════════════════════════════════════
   HERO RENDER — pointer parallax
   Tilts the workstation plate up to 3deg and moves the cursor light.
   Fine pointers on wide screens
   only, skipped for reduced motion, and the rAF stops once it settles
   so nothing idles at 60fps.
═══════════════════════════════════════ */
(function(){
  const stage = document.getElementById('heroStage');
  const scene = document.getElementById('heroScene');
  if (!stage || !scene) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (!window.matchMedia('(min-width: 1024px)').matches) return;

  const MAX = 3;
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = null, inside = false;

  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    // Cursor light (.hero-light in 51-hero-polish.css) follows the pointer
    // directly; only the tilt below is eased.
    scene.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%');
    scene.style.setProperty('--my', ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%');
    tx =  ((e.clientX - r.left) / r.width  - .5) * 2 * MAX;
    ty = -((e.clientY - r.top)  / r.height - .5) * 2 * MAX;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });

  stage.addEventListener('pointerenter', () => { inside = true; scene.classList.add('is-lit'); }, { passive: true });
  stage.addEventListener('pointerleave', () => {
    inside = false; tx = 0; ty = 0;
    scene.classList.remove('is-lit');
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });

  function loop(){
    cx += (tx - cx) * .07;
    cy += (ty - cy) * .07;
    scene.style.setProperty('--htx', cx.toFixed(3));
    scene.style.setProperty('--hty', cy.toFixed(3));
    raf = (Math.abs(tx - cx) > .01 || Math.abs(ty - cy) > .01 || inside)
      ? requestAnimationFrame(loop) : null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; }
  });
})();


