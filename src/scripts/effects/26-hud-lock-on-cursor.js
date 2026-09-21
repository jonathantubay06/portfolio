/* ── 26. HUD LOCK-ON CURSOR ─────────────────
   Desktop-only pointer that becomes a compact
   HUD target over deliberate interactive
   elements. One acquire animation per entry,
   then static — no loop, no rAF.

   The native cursor is suppressed only while
   .hud-on is set, so the two never draw at
   once. If this script never runs, the flag is
   absent and the native SVG arrow is what you
   get — losing the JS costs nothing.
══════════════════════════════════════ */
(function(){
  // ── Gate: every condition must hold, checked once at load ──
  const fine    = window.matchMedia('(pointer: fine)');
  const hover   = window.matchMedia('(hover: hover)');
  const wide    = window.matchMedia('(min-width: 1024px)');
  const reduce  = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || !hover.matches || !wide.matches || reduce.matches) return;

  // Deliberate targets only. Mirrors the existing selector list in the
  // NEON SVG CURSORS css block, minus two cases:
  //   .proj-card  — has a 3D-tilt mousemove listener but no click
  //                 handler; the clickable part is .btn-modal-open
  //                 inside it, already covered by `button`.
  //   input/textarea — text fields are not "clickable"; a lock-on
  //                 target over a text caret reads wrong.
  const SEL = [
    'a[href]',
    'button:not([disabled])',
    '[role="button"]:not([aria-disabled="true"])',
    'select:not([disabled])',
    'input[type="submit"]:not([disabled])',
    'input[type="button"]:not([disabled])',
    'input[type="checkbox"]:not([disabled])',
    'input[type="radio"]:not([disabled])',
    'label[for]',
    '.btn', '.pf-btn'
  ].join(',');

  // ── Element ──
  const cur = document.createElement('div');
  cur.className = 'hud-cursor';
  cur.setAttribute('aria-hidden', 'true');   // decorative, never focusable
  // Idle arrow uses the same silhouette as cursors/arrow.svg so the two
  // states read as one treatment. Inline markup, not an image asset.
  cur.innerHTML =
    '<svg class="hud-arrow" viewBox="0 0 32 32" aria-hidden="true">' +
      '<path d="M6 4L26 9l-8 3-3 8L6 4z"/>' +
    '</svg>' +
    '<span class="hud-ring"></span>' +
    '<span class="hud-tick t-n"></span><span class="hud-tick t-s"></span>' +
    '<span class="hud-tick t-w"></span><span class="hud-tick t-e"></span>' +
    '<span class="hud-pip"></span>';
  document.body.appendChild(cur);
  document.documentElement.classList.add('hud-on');

  // ── Position: written straight from the pointer event.
  //    No requestAnimationFrame and no lerp — a trailing cursor feels
  //    laggy, and an idle rAF loop is exactly the battery cost the
  //    design audit flagged. ──
  let locked = false;

  function onMove(e){
    cur.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';

    // Ignore hits inside a closed (inert) dialog.
    const hit = e.target.closest ? e.target.closest(SEL) : null;
    const want = !!hit && !hit.closest('[inert]');

    if (want !== locked){
      locked = want;
      // Toggling the class restarts the acquire keyframes, so the
      // animation plays once per entry rather than continuously.
      cur.classList.toggle('is-locked', locked);
    }
  }

  document.addEventListener('pointermove', onMove, { passive: true });

  // Hide when the pointer leaves the window entirely
  document.addEventListener('pointerleave', () => { cur.style.opacity = '0'; }, { passive: true });
  document.addEventListener('pointerenter', () => { cur.style.opacity = ''; }, { passive: true });

  // ── Stop entirely while the tab is hidden ──
  document.addEventListener('visibilitychange', () => {
    if (document.hidden){
      document.removeEventListener('pointermove', onMove);
      cur.classList.remove('is-locked');
      locked = false;
      cur.style.opacity = '0';
    } else {
      document.addEventListener('pointermove', onMove, { passive: true });
      cur.style.opacity = '';
    }
  });

  // ── Tear down if the environment stops qualifying (window resized
  //    below 1024px, or the user turns reduced-motion on) ──
  function recheck(){
    if (!fine.matches || !hover.matches || !wide.matches || reduce.matches){
      document.removeEventListener('pointermove', onMove);
      cur.remove();
      document.documentElement.classList.remove('hud-on');
      wide.removeEventListener('change', recheck);
      reduce.removeEventListener('change', recheck);
    }
  }
  wide.addEventListener('change', recheck);
  reduce.addEventListener('change', recheck);
})();
