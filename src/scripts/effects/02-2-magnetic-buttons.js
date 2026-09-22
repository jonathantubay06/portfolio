/* ── 2. CTA FEEDBACK — magnetic pull + press ───────────────────────
   Rewritten 2026-09-22 from the interaction audit. The previous version
   had three problems:

     1. SCOPE. It bound only `.hero-cta .btn` — two of the fifty
        button-ish elements on the page. The form's submit button, the
        quick-pick service buttons, the ten project modal buttons and
        the floating contact pill were all completely inert. Motion at
        the moment someone is deciding is worth more than any amount of
        ambient motion, and none of the deciding moments had any.

     2. UNCAPPED PULL. `dx * 0.32` is proportional to half the button's
        width, so drift scaled with button size: measured 21.3px at the
        corner of "Launch Project" (133px wide) against 9.4px on a 58px
        quick-pick button. Two buttons in the same design system moving
        by different amounts reads as a bug. Now capped at 6px in both
        axes regardless of size.

     3. TRANSITION RESTART PER FRAME. It set
        `btn.style.transition = 'transform .1s ease'` inside the rAF
        callback, so every frame started a fresh interpolation on top of
        the last. .btn also carries `transition:all .28s`, compounding
        it. Now a class suppresses the transition for the duration of
        the interaction (see 44-interaction-feedback.css) and each frame
        writes the final value directly.

   Added: a press squash on pointerdown. Nothing on the site previously
   acknowledged a click before the page moved.

   Shape follows 05-project-card-3d-tilt.js: one rAF-coalesced write per
   frame, rect read on enter and refreshed only when something could
   have moved it, will-change set and cleared rather than left standing.
═══════════════════════════════════════ */
(function(){
  // Nothing here carries content, so reduced motion opts out completely.
  if (PREFERS_REDUCED_MOTION) return;

  /* Every element that acts as a call to action. Ordered roughly by how
     much a visitor's decision depends on it. */
  const SELECTOR = [
    '.hero-cta .btn',
    '.c-form button[type="submit"]',
    '.qp-btn',
    '.btn-modal-open',
    '.btn-modal-site',
    '.mobile-cta-bar .btn',
    '#book-pill',
    '.pf-btn'
  ].join(',');

  const targets = document.querySelectorAll(SELECTOR);
  if (!targets.length) return;

  const MAX_PULL = 6;   // px. A cap, not a scale factor — see note 2 above.

  // The pull is pointer tracking, which touch devices cannot do: there is
  // no hover, and a finger is already on the element. The press squash is
  // kept on touch, where it does more work than anywhere else — a tap has
  // no hover state to confirm it landed.
  const CAN_PULL = window.matchMedia('(hover: hover)').matches;

  /* Only one CTA can be under the pointer at a time, so one rAF and one
     cached rect serve all of them. */
  let active = null, rect = null, px = 0, py = 0, queued = false;

  function render() {
    queued = false;
    if (!active || !rect) return;
    // Clamped to -1..1 first, so a pointer just outside the box during
    // the frame the pointer leaves cannot throw the element further than
    // the cap.
    const dx = Math.max(-1, Math.min(1,
      (px - rect.left - rect.width  / 2) / (rect.width  / 2)));
    const dy = Math.max(-1, Math.min(1,
      (py - rect.top  - rect.height / 2) / (rect.height / 2)));
    active.style.transform =
      'translate(' + (dx * MAX_PULL) + 'px,' + (dy * MAX_PULL) + 'px)';
  }

  function onEnter(e) {
    if (!CAN_PULL) return;
    const el = e.currentTarget;
    active = el;
    rect = el.getBoundingClientRect();   // read once, not per event
    el.classList.add('is-mag');          // suppresses the CSS transition
    el.style.willChange = 'transform';
    px = e.clientX; py = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(render); }
  }

  function onMove(e) {
    if (active !== e.currentTarget) return;
    px = e.clientX; py = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(render); }
  }

  function onLeave(e) {
    const el = e.currentTarget;
    // Drop .is-mag first so the transition is live again and the element
    // springs back to rest rather than snapping.
    el.classList.remove('is-mag', 'is-press');
    el.style.transform = '';
    // will-change is a standing promise to the compositor. Fifty idle
    // CTAs holding one is exactly the cost the audit flagged.
    el.style.willChange = '';
    if (active === el) { active = null; rect = null; }
  }

  function onDown(e)   { e.currentTarget.classList.add('is-press'); }
  function onUp(e)     { e.currentTarget.classList.remove('is-press'); }

  targets.forEach(el => {
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    // pointercancel fires when a touch becomes a scroll. Without this the
    // squash would stick while the page scrolls away underneath it.
    el.addEventListener('pointercancel', onUp);
  });

  // The cached rect is only wrong if the element moved. Scrolling and
  // resizing are the two ways that happens mid-interaction, and the
  // floating pill and sticky bar move on scroll by design.
  function invalidate() { if (active) rect = active.getBoundingClientRect(); }
  window.addEventListener('scroll', invalidate, { passive: true });
  window.addEventListener('resize', invalidate);
})();
