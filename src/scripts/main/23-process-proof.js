/* ═══════════════════════════════════════
   PROCESS PROOF LINKS (draft 2026-10-20)
   Each "How I work" step names a real project. Its button opens that
   project's existing modal by clicking the card's own Details button,
   so the modal code stays the single source of truth.
═══════════════════════════════════════ */
document.addEventListener('click', function (e) {
  var b = e.target.closest('.hw-proof[data-open]');
  if (!b) return;
  var opener = document.querySelector('.btn-modal-open[data-modal="' + b.dataset.open + '"]');
  if (opener) opener.click();
});
