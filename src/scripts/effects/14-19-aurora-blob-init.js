/* ── 19. AURORA BLOB INIT ──────────────────
   Force reflow so CSS animations start cleanly
   (avoids Safari flash-of-invisible on first load).
══════════════════════════════════════ */
(function(){
  document.querySelectorAll('.aurora-blob').forEach(b => void b.offsetWidth);
})();


