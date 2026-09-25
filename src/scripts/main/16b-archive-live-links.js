/* ═══════════════════════════════════════
   ARCHIVED PROJECTS
   Links marked data-live-until="YYYY-MM-DD" go to a site that will close
   (Sapmok USA, closing 2026). After that date the link becomes a plain
   "Archived" label and the card's live badge/tag say so, with no deploy
   needed. Before it, nothing changes.
═══════════════════════════════════════ */
(function () {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('[data-live-until]').forEach(a => {
    if (today <= a.dataset.liveUntil) return;
    const label = document.createElement('span');
    label.className = a.className + ' is-archived';
    label.textContent = 'Archived';
    a.replaceWith(label);
  });
  if (!document.querySelector('.is-archived')) return;
  document.querySelectorAll('[data-live-badge]').forEach(b => { b.textContent = 'Archived · Store closed'; });
  document.querySelectorAll('[data-live-tag]').forEach(t => { t.textContent = 'Archived'; });
})();
