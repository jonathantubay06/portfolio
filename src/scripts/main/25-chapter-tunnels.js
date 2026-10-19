/* ═══════════════════════════════════════
   CHAPTER TUNNELS (draft 2026-10-20)
   Each .tunnel is a tall block with a sticky full-screen scene inside.
   While it scrolls past, --p runs 0 to 1 and the CSS moves the rings,
   the dog and the chapter title with it. One rAF per scroll, only for
   tunnels on screen; reads are batched before writes.
   Phones, coarse pointers and reduced motion get the static scene
   (CSS handles that; this script just stays idle there).
═══════════════════════════════════════ */
(function () {
  var tunnels = [].slice.call(document.querySelectorAll('.tunnel'));
  if (!tunnels.length) return;
  var gate = matchMedia('(min-width:901px) and (prefers-reduced-motion:no-preference)');
  var live = [], raf = 0;

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var k = live.indexOf(e.target);
      if (e.isIntersecting && k < 0) live.push(e.target);
      if (!e.isIntersecting && k > -1) live.splice(k, 1);
    });
    queue();
  });
  tunnels.forEach(function (t) { io.observe(t); });

  function queue() { if (!raf) raf = requestAnimationFrame(update); }
  function update() {
    raf = 0;
    if (!gate.matches) return;
    var vh = innerHeight;
    var ps = live.map(function (t) {
      var r = t.getBoundingClientRect();
      return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
    });
    live.forEach(function (t, i) { t.style.setProperty('--p', ps[i].toFixed(4)); });
  }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  gate.addEventListener('change', queue);
})();
