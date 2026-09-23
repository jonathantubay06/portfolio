/* ═══════════════════════════════════════
   PROJECT CARD 3D TILT

   Pointer-driven tilt on the portfolio cards, written to be free per
   frame. The previous version cost real main-thread time on every mouse
   move, in three compounding ways:

     1. It wrote card.style.boxShadow alongside the transform. box-shadow
        is a PAINT property, so putting it in the same handler dragged the
        whole interaction onto the main thread every event — the same
        mistake that made the hero scramble expensive.
     2. It called getBoundingClientRect() inside the move handler, forcing
        a layout flush per event rather than per frame.
     3. .proj-card carries `transition:transform .15s ease`, so each write
        STARTED A NEW 150ms TRANSITION — roughly sixty overlapping
        transitions a second, which is both slower and visibly mushier
        than no transition at all.

   Now: one rAF-coalesced transform write per frame, the rect cached until
   something could have moved it, the shadow static in CSS, and the
   directional highlight moved to a transform-driven element so it stays
   on the compositor. The transition is suppressed while tilting (via
   .is-tilting) and restored on leave so the settle back to rest still
   animates.
═══════════════════════════════════════ */
(function(){
  // Hover-only interaction. Touch gets .proj-card:active in CSS instead,
  // and reduced-motion users get nothing — matching the CSS rules in
  // 24-reduced-motion-granular.css and 26-touch-no-hover-devices.css,
  // which already neutralise .proj-card:hover transforms.
  if (!window.matchMedia('(hover: hover)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Showcase rows (.proj-feature) are excluded: at roughly 1000px wide a
  // 7deg pointer tilt swings their far edge by ~60px, which reads as the
  // row lurching rather than turning. They get a scroll-linked 3D
  // entrance instead (47-work-layout.css).
  const cards = document.querySelectorAll('.proj-card:not(.proj-feature)');
  if (!cards.length) return;

  const MAX_DEG = 7;    // noticeable tilt without making the text hard to read
  const DEPTH   = 700;  // perspective px — lower is more dramatic

  // Shared state: only one card can be hovered at a time, so one rAF and
  // one cached rect serve all of them.
  let active = null;    // the card currently under the pointer
  let rect = null;      // its cached bounds
  let px = 0, py = 0;   // latest pointer position
  let queued = false;

  /** The moving specular highlight, created on first hover and reused.
   *  It lives inside .proj-thumb, which is already position:relative with
   *  overflow:hidden — so the highlight is clipped to the screenshot and
   *  can never wash over the card's text and affect its contrast. */
  function sheenFor(card) {
    const thumb = card.querySelector('.proj-thumb');
    if (!thumb) return null;
    let el = thumb.querySelector('.proj-sheen');
    if (!el) {
      el = document.createElement('span');
      el.className = 'proj-sheen';
      el.setAttribute('aria-hidden', 'true');  // decorative
      thumb.appendChild(el);
    }
    return el;
  }

  function render() {
    queued = false;
    if (!active || !rect) return;

    // −1..+1 relative to the card centre. dx = -1 is far left.
    const dx = (px - rect.left - rect.width / 2) / (rect.width / 2);
    // -dy on rotateX so moving the pointer UP tilts the top toward you.
    const dy = (py - rect.top - rect.height / 2) / (rect.height / 2);

    active.style.transform =
      'perspective(' + DEPTH + 'px) rotateY(' + (dx * MAX_DEG) + 'deg) rotateX(' +
      (-dy * MAX_DEG) + 'deg) translateY(-8px) scale(1.02)';

    // Highlight drifts opposite the tilt, so the light reads as fixed in
    // the room while the card turns under it. transform only — no paint.
    const sheen = active._sheen;
    if (sheen) {
      sheen.style.transform =
        'translate3d(' + (dx * 22) + '%,' + (dy * 22) + '%,0)';
    }
  }

  function onMove(e) {
    px = e.clientX;
    py = e.clientY;
    if (!queued) {
      queued = true;
      requestAnimationFrame(render);
    }
  }

  function onEnter(e) {
    const card = e.currentTarget;
    active = card;
    rect = card.getBoundingClientRect();   // read once, not per event
    card._sheen = sheenFor(card);
    // Suppress the CSS transform transition for the duration of the tilt,
    // so each frame's write lands immediately instead of starting a new
    // 150ms interpolation on top of the last one.
    card.classList.add('is-tilting');
    card.style.willChange = 'transform';
    px = e.clientX;
    py = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(render); }
  }

  function onLeave(e) {
    const card = e.currentTarget;
    // Drop .is-tilting first so the CSS transition is live again and the
    // card animates back to rest rather than snapping.
    card.classList.remove('is-tilting');
    card.style.transform = '';
    if (card._sheen) card._sheen.style.transform = '';
    // will-change is a standing promise to the compositor; holding it on
    // ten idle cards is exactly the kind of cost the design audit flagged.
    card.style.willChange = '';
    if (active === card) { active = null; rect = null; }
  }

  cards.forEach(card => {
    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointermove', onMove, { passive: true });
    card.addEventListener('pointerleave', onLeave);
  });

  // The cached rect is only wrong if the card moved. Scrolling and
  // resizing are the two ways that happens while a pointer is inside one.
  function invalidate() { if (active) rect = active.getBoundingClientRect(); }
  window.addEventListener('scroll', invalidate, { passive: true });
  window.addEventListener('resize', invalidate);
})();
