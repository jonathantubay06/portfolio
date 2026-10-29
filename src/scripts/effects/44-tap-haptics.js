/* ── TAP HAPTICS (2026-10-29) ─────────────────────────────────
   A tiny buzz when a finger taps a button or link, so the static phone
   layout still answers a touch. Android Chrome only: iPhone Safari has
   no vibrate API, and desktop mice never trigger it (pointerType check).
   Off for reduced motion, and 8 ms is short enough to feel like a click
   rather than a notification.
══════════════════════════════════════ */
(function () {
  if (!('vibrate' in navigator) || PREFERS_REDUCED_MOTION) return;
  document.addEventListener('pointerup', function (e) {
    if (e.pointerType !== 'touch') return;
    if (e.target.closest && e.target.closest('a[href],button,summary,[role="tab"],.btn')) navigator.vibrate(8);
  }, { passive: true });
})();
