/* ── 24. SERVICE ROW TAP EXPAND (touch) ────
   On touch devices, hover won't fire.
   Tap a service row to toggle .svc-open
   which triggers the CSS bullet expansion.
   Desktop hover still previews; a click pins it open.
══════════════════════════════════════ */
(function(){
  document.querySelectorAll('.svc-row').forEach(row => {
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-expanded', 'false');
    const toggle = () => row.setAttribute('aria-expanded', row.classList.toggle('svc-open'));
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
})();


