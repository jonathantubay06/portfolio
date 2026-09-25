/* ═══════════════════════════════════════
   SPINNING FAVICON
   The tab icon's gear ring turns like the nav logo; the J dial stays
   still. Drawn on a 32px canvas at ~10fps after load. Browsers throttle
   timers in background tabs, so a hidden tab costs next to nothing.
   Off under prefers-reduced-motion (the static favicon.png stays).
═══════════════════════════════════════ */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  function start() {
    var link = document.querySelector('link[rel="icon"][sizes="32x32"]');
    if (!link) return;
    var ring = new Image(), dial = new Image(), loaded = 0;
    ring.src = 'img/brand/logo-ring.webp';
    dial.src = 'img/brand/logo-dial.webp';
    ring.onload = dial.onload = function () { if (++loaded === 2) run(); };
    function run() {
      var c = document.createElement('canvas'); c.width = c.height = 32;
      var x = c.getContext('2d'), a = 0;
      setInterval(function () {
        a += Math.PI / 60; // 3 deg per frame at 10fps: one turn per 12s
        x.clearRect(0, 0, 32, 32);
        x.save(); x.translate(16, 16); x.rotate(a); x.drawImage(ring, -16, -16, 32, 32); x.restore();
        x.drawImage(dial, 0, 0, 32, 32);
        link.href = c.toDataURL('image/png');
      }, 100);
    }
  }
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
