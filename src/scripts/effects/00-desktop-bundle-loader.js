/* ── DESKTOP BUNDLE LOADER (2026-10-29) ───────────────────────
   The desktop-only effects (36 hero 3D, 37 live wallpaper, 39 section
   3D, 40 desk extras, about 228 KB) ship in their own file,
   effects-dk.js, so phones never download them (PageSpeed "reduce
   unused JavaScript"). Loaded only on the dk layout, which reloads the
   page when a resize crosses it (_head.html). build.js swaps in the
   hashed file name, and the head preloads the same URL.
══════════════════════════════════════ */
(function () {
  var de = document.documentElement;
  if (!de.classList.contains('dk')) return;
  /* the stat counter waits for the 3D desk (09-hero-stat-counter): say so
     before the bundle lands; 36 clears it on a skip, and the counter has
     its own timeout if the bundle never arrives */
  if (!PREFERS_REDUCED_MOTION) window.__hero3dPending = true;
  var s = document.createElement('script');
  s.src = './effects-dk.js';
  s.crossOrigin = 'anonymous';
  document.body.appendChild(s);
})();
