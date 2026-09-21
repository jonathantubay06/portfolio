/* ── 20. CURSOR SPARKLE TRAIL ──────────────
   Tiny cyan sparks emit from the cursor on
   mousemove — throttled to 1 per 60ms max.
   Skipped on touch devices.
══════════════════════════════════════ */
(function(){
  // Disabled 2026-09-21 alongside the canvas cursor trail — two pointer-
  // following decorations on one page. See the note on block 6.
  return;

  if (window.matchMedia('(hover: none)').matches) return;

  let last = 0;
  document.addEventListener('mousemove', e => {
    const now = Date.now();
    if (now - last < 60) return;
    last = now;

    const s = document.createElement('div');
    s.className = 'cursor-sparkle';
    s.style.left = (e.clientX + (Math.random() - .5) * 8) + 'px';
    s.style.top  = (e.clientY + (Math.random() - .5) * 8) + 'px';
    const sz = 4 + Math.random() * 4;
    s.style.width = s.style.height = sz + 'px';
    document.body.appendChild(s);
    s.addEventListener('animationend', () => s.remove(), { once: true });
  }, { passive: true });
})();


