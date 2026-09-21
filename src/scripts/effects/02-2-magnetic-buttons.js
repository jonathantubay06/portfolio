/* ── 2. MAGNETIC BUTTONS ───────────────
   Hero CTA buttons subtly pull toward the
   cursor as it moves nearby — gives a
   premium, agency-site feel.
   Skipped entirely on touch devices where
   mousemove never fires.
══════════════════════════════════════ */
(function(){
  if (PREFERS_REDUCED_MOTION) return; // decorative motion only — nothing here carries content
  if (window.matchMedia('(hover: none)').matches) return; // touch device — skip

  document.querySelectorAll('.hero-cta .btn').forEach(btn => {
    let pending = false; // rAF throttle — cap style updates at ~60fps not ~1000fps

    btn.addEventListener('mousemove', e => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        const r  = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width  / 2);
        const dy = e.clientY - (r.top  + r.height / 2);
        btn.style.transform  = `translate(${dx * 0.32}px, ${dy * 0.32}px) translateY(-2px)`;
        btn.style.transition = 'transform .1s ease';
        pending = false;
      });
    });

    btn.addEventListener('mouseleave', () => {
      pending = false;
      btn.style.transform  = '';
      btn.style.transition = 'transform .55s cubic-bezier(.25,.8,.25,1)';
    });
  });
})();


