/* ── PAGE SHARE BUTTONS (2026-10-29) ──────────────────────────
   Case studies and /notes/ load this as pages.<hash>.js. The LinkedIn
   and X links work without it; this adds "Copy link" and, where the
   browser has one (phones), the native share sheet. The URL shared is
   the page's canonical, so tracking or hash fragments never leak in.
══════════════════════════════════════ */
(function () {
  var box = document.querySelector('.cs-share');
  if (!box) return;
  var canon = document.querySelector('link[rel="canonical"]');
  var url = canon ? canon.href : location.href.split('#')[0];
  var copy = box.querySelector('[data-copy]'), native = box.querySelector('[data-native]');
  if (copy) {
    copy.hidden = false;
    copy.addEventListener('click', function () {
      var done = function () { copy.textContent = 'Copied ✓'; setTimeout(function () { copy.textContent = 'Copy link'; }, 2000); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link:', url); });
      else prompt('Copy this link:', url);
    });
  }
  if (native && navigator.share) {
    native.hidden = false;
    native.addEventListener('click', function () {
      navigator.share({ title: document.title, url: url }).catch(function () {});
    });
  }
})();
