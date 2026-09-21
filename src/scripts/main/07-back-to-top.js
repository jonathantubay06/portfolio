/* ═══════════════════════════════════════
   BACK TO TOP
═══════════════════════════════════════ */
const backToTop = document.getElementById('back-to-top');
backToTop.addEventListener('click', e => {
  e.preventDefault(); // prevent the href="#" from jumping the URL hash
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

