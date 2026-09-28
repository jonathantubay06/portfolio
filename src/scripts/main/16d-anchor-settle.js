/* ═══════════════════════════════════════
   ANCHOR SETTLE (2026-09-29)
   Sections below the fold use content-visibility:auto, so they sit at a
   placeholder height until rendered. A jump to #testimonials renders the
   sections it passes, they grow, and the target ends up far below the
   screen. After the browser's own jump, re-aim at the target a few times
   while the layout settles. Only corrects; never blocks the default jump.
═══════════════════════════════════════ */
(function () {
  function settle(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var nav = document.querySelector('nav');
    var off = nav ? nav.offsetHeight : 0;
    [120, 450, 900].forEach(function (t) {
      setTimeout(function () {
        var top = el.getBoundingClientRect().top;
        if (Math.abs(top - off) > 8) window.scrollTo({ top: window.scrollY + top - off, behavior: 'auto' });
      }, t);
    });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    if (a.closest('.proj-modal')) return; // modals handle their own links
    settle(a.getAttribute('href').slice(1));
  });
})();
