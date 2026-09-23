/* ═══════════════════════════════════════
   TIMELINE DETAILS

   Past roles keep their bullet points behind a "Details" button so the
   timeline stays short; the current role is always open. Uses the
   `hidden` attribute, so the lists are out of the accessibility tree
   until asked for and the button's aria-expanded tells screen readers
   which state they are in.
═══════════════════════════════════════ */
(function(){
  document.querySelectorAll('.tl-more').forEach(btn => {
    const list = document.getElementById(btn.getAttribute('aria-controls'));
    if (!list) return;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Hide' : 'Details';
      list.hidden = !open;
    });
  });
})();
