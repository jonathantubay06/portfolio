/* ═══════════════════════════════════════
   DYNAMIC FOOTER YEAR
═══════════════════════════════════════ */
// Automatically updates the copyright year — no manual update needed each January
const yearEl = document.getElementById('footer-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();


