/* ═══════════════════════════════════════
   HERO RENDER — pointer parallax
   Tilts the workstation plate up to 3deg. Fine pointers on wide screens
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
    tx =  ((e.clientX - r.left) / r.width  - .5) * 2 * MAX;
    ty = -((e.clientY - r.top)  / r.height - .5) * 2 * MAX;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });

  stage.addEventListener('pointerenter', () => { inside = true; }, { passive: true });
  stage.addEventListener('pointerleave', () => {
    inside = false; tx = 0; ty = 0;
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


