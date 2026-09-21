/* ── 24. SERVICE ROW TAP EXPAND (touch) ────
   On touch devices, hover won't fire.
   Tap a service row to toggle .svc-open
   which triggers the CSS bullet expansion.
   Desktop uses CSS :hover only.
══════════════════════════════════════ */
(function(){
  if (!window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.svc-row').forEach(row => {
    row.addEventListener('click', () => row.classList.toggle('svc-open'));
  });
})();


