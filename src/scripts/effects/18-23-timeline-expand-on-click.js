/* ── 23. TIMELINE EXPAND ON CLICK ──────────
   Toggles .tl-open on .tl-content elements
   that have a .tl-expand child list.
   Keyboard accessible via Enter / Space.
══════════════════════════════════════ */
(function(){
  document.querySelectorAll('.tl-content[role="button"]').forEach(el => {
    function toggle() {
      const open = el.classList.toggle('tl-open');
      el.setAttribute('aria-expanded', String(open));
      const exp = el.querySelector('.tl-expand');
      if (exp) exp.setAttribute('aria-hidden', String(!open));
    }
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
})();


