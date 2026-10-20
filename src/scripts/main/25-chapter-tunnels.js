/* ═══════════════════════════════════════
   CHAPTER TUNNELS (draft 2026-10-20)
   Each .tunnel is a tall block with a sticky full-screen scene inside.
   While it scrolls past, --p runs 0 to 1 and the CSS moves the rings
   and the chapter title with it. One rAF per scroll, only for
   tunnels on screen; reads are batched before writes. It also publishes
   the total progress (window.__worldShot) for the 3D world camera and
   --world-dim, which dims the 3D behind the text while a chapter is read.
   Phones, coarse pointers and reduced motion get the static scene
   (CSS handles that; this script just stays idle there).
═══════════════════════════════════════ */
(function () {
  var tunnels = [].slice.call(document.querySelectorAll('.tunnel'));
  if (!tunnels.length) return;
  var gate = matchMedia('(min-width:901px) and (prefers-reduced-motion:no-preference)');
  var live = [], raf = 0, root = document.documentElement;

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
    var vh = innerHeight, sum = 0, travel = 0;
    /* every tunnel, not only the visible ones: the 3D world camera needs
       the total (one whole shot per tunnel passed) */
    var ps = tunnels.map(function (t) {
      var r = t.getBoundingClientRect();
      return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
    });
    tunnels.forEach(function (t, i) {
      var p = ps[i];
      t.style.setProperty('--p', p.toFixed(4));
      sum += p;
      /* 1 while the camera is travelling, 0 while a chapter is being read */
      travel = Math.max(travel, Math.min(1, Math.min(p, 1 - p) * 5));
    });
    window.__worldShot = sum;
    var heroOut = Math.min(1, Math.max(0, (scrollY - vh * 0.35) / (vh * 0.45)));
    root.style.setProperty('--world-dim', (heroOut * (1 - travel)).toFixed(3));
    /* for the colour grade (cooler, near mono while flying) and the hero
       plasma, which hands over to the world once the hero has gone */
    root.style.setProperty('--world-travel', travel.toFixed(3));
    root.style.setProperty('--world-hero-out', heroOut.toFixed(3));
    window.__worldHeroOut = heroOut;
    window.__worldDim = heroOut * (1 - travel);
    root.classList.toggle('world-past-hero', scrollY > vh * 0.12);
  }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  gate.addEventListener('change', queue);
})();
