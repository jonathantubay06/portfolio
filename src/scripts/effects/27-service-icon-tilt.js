/* ── 27. SERVICE ICON TILT ─────────────────────────────────────────
   Added 2026-09-22 from the interaction audit.

   The six .svc-ico-3d renders were NOT static — they already bob via
   svcFloat (gated on .inview) and already lift on row hover. What they
   did not do is respond to where the pointer is, so they read as
   pictures that jump rather than objects you can turn.

   This replaces the fixed hover pose with a pointer-tracked one.

   Two details make it compose instead of fight:

     1. The bob writes `translate`. This writes `transform`. Those are
        separate properties applied in a fixed order (translate, rotate,
        scale, transform), so the float keeps running underneath the
        tilt. Had the float used `transform`, the tilt would have
        cancelled it and left a dead icon that turns.

     2. The transform reproduces the existing hover lift
        (translateY(-3px) scale(1.06)) rather than replacing it, so
        turning the icon does not also mean losing the lift that
        07-services-compact.css established.

   Same shape as 05-project-card-3d-tilt.js: one rAF-coalesced write per
   frame, rect cached on enter, nothing that forces paint.
═══════════════════════════════════════ */
(function(){
  if (PREFERS_REDUCED_MOTION) return;
  // Pointer tracking needs a pointer. Touch keeps the CSS hover lift,
  // which 26-touch-no-hover-devices.css maps onto :active.
  if (!window.matchMedia('(hover: hover)').matches) return;

  const rows = document.querySelectorAll('.svc-row');
  if (!rows.length) return;

  /* 14 degrees against the project cards' 7. The icon is roughly 52px
     across inside a much wider row, so the same angle on a small object
     reads as barely anything — and unlike a card, there is no text on
     it to become hard to read. */
  const MAX_DEG = 14;

  let active = null, icon = null, rect = null, px = 0, py = 0, queued = false;

  function render() {
    queued = false;
    if (!active || !rect || !icon) return;
    const dx = Math.max(-1, Math.min(1,
      (px - rect.left - rect.width  / 2) / (rect.width  / 2)));
    const dy = Math.max(-1, Math.min(1,
      (py - rect.top  - rect.height / 2) / (rect.height / 2)));
    // -dy on rotateX so moving the pointer up tilts the top toward you.
    icon.style.transform =
      'rotateY(' + (dx * MAX_DEG) + 'deg) rotateX(' + (-dy * MAX_DEG) +
      'deg) translateY(-3px) scale(1.06)';
  }

  function onEnter(e) {
    const row = e.currentTarget;
    const ico = row.querySelector('.svc-ico-3d');
    if (!ico) return;                 // a row without a render — nothing to tilt
    active = row; icon = ico;
    rect = row.getBoundingClientRect();
    row.classList.add('is-tilting');  // suppresses the .4s CSS transition
    ico.style.willChange = 'transform';
    px = e.clientX; py = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(render); }
  }

  function onMove(e) {
    if (active !== e.currentTarget) return;
    px = e.clientX; py = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(render); }
  }

  function onLeave(e) {
    const row = e.currentTarget;
    const ico = row.querySelector('.svc-ico-3d');
    // Drop .is-tilting first so the transition is live again and the icon
    // eases back to the CSS rest pose instead of snapping.
    row.classList.remove('is-tilting');
    if (ico) { ico.style.transform = ''; ico.style.willChange = ''; }
    if (active === row) { active = null; icon = null; rect = null; }
  }

  rows.forEach(row => {
    row.addEventListener('pointerenter', onEnter);
    row.addEventListener('pointermove', onMove, { passive: true });
    row.addEventListener('pointerleave', onLeave);
  });

  function invalidate() { if (active) rect = active.getBoundingClientRect(); }
  window.addEventListener('scroll', invalidate, { passive: true });
  window.addEventListener('resize', invalidate);
})();
