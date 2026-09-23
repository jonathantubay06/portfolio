/* ── 28. SOFT TILT ─────────────────────────────────────────────────
   Gentle pointer tilt for any element carrying data-tilt="<max degrees>".
   Used on the client testimonials, certification cards and the thanks
   card - surfaces with text on them, so the angles are small (2-4deg)
   compared with the project cards' 7.

   Same shape as the project-card tilt: one rAF-coalesced transform write
   per frame, the rect read on enter, will-change set and cleared, and a
   class that suppresses the CSS transform transition while the pointer
   is inside so frames land immediately.

   These elements also carry .r for the scroll reveal, whose .on state
   used to lock transform with !important - the bug that silently killed
   the project-card tilt. 21-reveal-animation.css now excludes
   [data-tilt] from that lock, the same way it excludes .proj-card.
═══════════════════════════════════════ */
(function(){
  if (PREFERS_REDUCED_MOTION) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  const els = document.querySelectorAll('[data-tilt]');
  if (!els.length) return;

  let active = null, rect = null, max = 4, px = 0, py = 0, queued = false;

  function render() {
    queued = false;
    if (!active || !rect) return;
    const dx = Math.max(-1, Math.min(1, (px - rect.left - rect.width / 2) / (rect.width / 2)));
    const dy = Math.max(-1, Math.min(1, (py - rect.top - rect.height / 2) / (rect.height / 2)));
    active.style.transform =
      'perspective(1000px) rotateY(' + (dx * max) + 'deg) rotateX(' + (-dy * max) + 'deg) translateY(-3px)';
  }

  els.forEach(el => {
    el.addEventListener('pointerenter', e => {
      active = el;
      rect = el.getBoundingClientRect();
      max = parseFloat(el.dataset.tilt) || 4;
      el.classList.add('is-soft-tilting');
      el.style.willChange = 'transform';
      px = e.clientX; py = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(render); }
    });
    el.addEventListener('pointermove', e => {
      if (active !== el) return;
      px = e.clientX; py = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(render); }
    }, { passive: true });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-soft-tilting');
      el.style.transform = '';
      el.style.willChange = '';
      if (active === el) { active = null; rect = null; }
    });
  });

  const invalidate = () => { if (active) rect = active.getBoundingClientRect(); };
  window.addEventListener('scroll', invalidate, { passive: true });
  window.addEventListener('resize', invalidate);
})();
