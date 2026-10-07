/* ═══════════════════════════════════════
   SPINNING FAVICON
   The tab icon's gear ring turns like the nav logo; the J dial stays
   still. 60 cached 32px frames swapped at 5fps after load; nothing
   runs while the tab is hidden.
   Off under prefers-reduced-motion (the static favicon.png stays).
═══════════════════════════════════════ */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  /* phones: no tab strip to show it, and iOS re-decodes the icon each swap */
  if (matchMedia('(pointer: coarse)').matches) return;
  function start() {
    var link = document.querySelector('link[rel="icon"][sizes="32x32"]');
    if (!link) return;
    var ring = new Image(), dial = new Image(), loaded = 0;
    ring.src = 'img/brand/logo-ring.webp';
    dial.src = 'img/brand/logo-dial.webp';
    ring.onload = dial.onload = function () { if (++loaded === 2) run(); };
    /* Each 32px frame is drawn and PNG-encoded the first time it is
       shown, then reused, so after one turn the interval only swaps
       href. Encoding a PNG every 100ms forever was one of the largest
       main-thread costs after load in the 2026-10-07 profile. 60 frames
       at 6deg, 5fps: still one turn per 12s. Paused while hidden. */
    function run() {
      var c = document.createElement('canvas'); c.width = c.height = 32;
      /* CPU-backed canvas: a GPU canvas pays a readback on every encode */
      var x = c.getContext('2d', { willReadFrequently: true }), frames = [], N = 60, i = 0;
      setInterval(function () {
        if (document.hidden) return;
        i = (i + 1) % N;
        if (!frames[i]) {
          x.clearRect(0, 0, 32, 32);
          x.save(); x.translate(16, 16); x.rotate(i * Math.PI * 2 / N); x.drawImage(ring, -16, -16, 32, 32); x.restore();
          x.drawImage(dial, 0, 0, 32, 32);
          frames[i] = c.toDataURL('image/png');
        }
        link.href = frames[i];
      }, 200);
    }
  }
  /* DOMContentLoaded + a beat, not 'load': a hung analytics pixel can hold
     'load' back for a minute. */
  if (document.readyState === 'complete') start();
  else addEventListener('DOMContentLoaded', function () { setTimeout(start, 1500); });
})();
