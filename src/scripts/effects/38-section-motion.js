/* ═══════════════════════════════════════
   38. SECTION MOTION (desktop only)
   Added 2026-10-02. The DOM half of the section effects; styles are in
   60-section-motion.css and the WebGL half (laptops, Dumpling) is
   39-section-3d.js.

   Gate: (min-width:1024px) and (pointer:fine) and
   (prefers-reduced-motion:no-preference). On a match html gets .sm-on,
   which every rule in 60-section-motion.css is scoped to. Anything else
   (phones, tablets, reduced motion) returns here and the page is
   exactly as before.

   Per-frame work is limited to pointer- and scroll-driven writes,
   rAF-coalesced, and only while the relevant section is on screen.
   Loops in CSS run under .sm-vis, which an observer adds and removes.
═══════════════════════════════════════ */
(function () {
  var mq = matchMedia('(min-width:1024px) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  if (!mq.matches) return;
  var root = document.documentElement;
  root.classList.add('sm-on');

  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    e.className = cls; e.setAttribute('aria-hidden', 'true');
    if (parent) parent.appendChild(e);
    return e;
  }
  /* add a class once when the element first comes into view */
  function once(target, cls, opts) {
    if (!target) return;
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { target.classList.add(cls); io.disconnect(); }
    }, opts || { threshold: 0.35 });
    io.observe(target);
  }
  /* .sm-vis while on screen: gates the CSS loops */
  var visIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.classList.toggle('sm-vis', e.isIntersecting); });
  }, { rootMargin: '100px 0px' });

  /* ── 11 · heading scan + numeral tilt ─────────────────────────── */
  var heads = [].slice.call(document.querySelectorAll('#services h2, #work h2, #testimonials h2, #experience h2, #contact h2'));
  var liveHeads = [];
  heads.forEach(function (h) {
    if (getComputedStyle(h).position === 'static') h.style.position = 'relative';
    el('span', 'sm-scan', h);
    h.style.setProperty('--sm-w', h.offsetWidth + 'px');
    once(h, 'sm-in', { threshold: 0.6 });
  });
  var tiltHeads = heads.filter(function (h) { return /^(services|work|experience)$/.test(h.closest('section') && h.closest('section').id); });
  var headIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var i = liveHeads.indexOf(e.target);
      if (e.isIntersecting && i < 0) liveHeads.push(e.target);
      if (!e.isIntersecting && i >= 0) liveHeads.splice(i, 1);
    });
  });
  tiltHeads.forEach(function (h) { headIO.observe(h); });

  var px = innerWidth / 2, py = innerHeight / 2, queued = false;
  function tiltFrame() {
    queued = false;
    for (var i = 0; i < liveHeads.length; i++) {
      var h = liveHeads[i], r = h.getBoundingClientRect();
      /* the numeral sits at the right end of the heading */
      var dx = Math.max(-1, Math.min(1, (px - (r.right - 120)) / (innerWidth / 2)));
      var dy = Math.max(-1, Math.min(1, (py - (r.top + r.height / 2)) / (innerHeight / 2)));
      var mag = Math.min(1, Math.hypot(dx, dy));
      /* rotation axis is perpendicular to the pointer direction, so the
         side nearest the pointer swings toward the viewer */
      h.style.setProperty('--sm-ax', (-dy).toFixed(3));
      h.style.setProperty('--sm-ay', dx.toFixed(3));
      h.style.setProperty('--sm-a', (mag * 18).toFixed(1) + 'deg');
    }
  }
  addEventListener('pointermove', function (e) {
    px = e.clientX; py = e.clientY;
    if (!queued && liveHeads.length) { queued = true; requestAnimationFrame(tiltFrame); }
  }, { passive: true });

  /* ── 1 · service icon halo + shadow ───────────────────────────── */
  document.querySelectorAll('.svc-row').forEach(function (row) {
    var ico = row.querySelector('.svc-ico-3d');
    if (!ico) return;
    var halo = el('span', 'sm-halo'), shadow = el('span', 'sm-shadow');
    row.insertBefore(halo, ico); row.insertBefore(shadow, ico);
    /* positioned once per hover from the icon's layout box (offset*
       ignores the tilt transform, which is what we want) */
    row.addEventListener('pointerenter', function () {
      var w = ico.offsetWidth, h = ico.offsetHeight, x = ico.offsetLeft, y = ico.offsetTop;
      var s = Math.max(w, Math.min(h, w * 1.4)) * 1.3;
      halo.style.cssText = 'left:' + (x + w / 2 - s / 2) + 'px;top:' + (y + Math.min(h, w * 1.4) / 2 - s / 2) + 'px;width:' + s + 'px;height:' + s + 'px';
      shadow.style.cssText = 'left:' + (x + w * 0.1) + 'px;top:' + (y + h + 2) + 'px;width:' + (w * 0.8) + 'px';
    });
  });

  /* ── 2 · process steps ────────────────────────────────────────── */
  var proc = document.querySelector('.process-inline');
  if (proc) {
    var steps = proc.querySelectorAll('.pi-step');
    steps.forEach(function (s) { el('span', 'sm-pglow', s); });
    var path = el('span', 'sm-ppath', proc), pdot = el('span', 'sm-pdot', proc);
    var lay = function () {
      if (steps.length < 2) return;
      var a = steps[0], b = steps[steps.length - 1];
      var x0 = a.offsetLeft + a.offsetWidth / 2, x1 = b.offsetLeft + b.offsetWidth / 2;
      path.style.left = pdot.style.left = x0 + 'px';
      path.style.width = (x1 - x0) + 'px';
      proc.style.setProperty('--sm-pw', (x1 - x0) + 'px');
    };
    lay(); addEventListener('resize', lay);
    once(proc, 'sm-lit', { threshold: 0.8 });
  }

  /* ── 3 · automation demo ──────────────────────────────────────────
     Flip and packet ride the classes 32-automation-demo.js already
     sets (.is-fired / .is-flowing), so they stay in sync with its
     run timing without touching that script. */
  var demo = document.getElementById('automation-demo');
  if (demo) visIO.observe(demo);

  /* ── 4 · light sweep on project cards ─────────────────────────── */
  document.querySelectorAll('.proj-card').forEach(function (card) {
    var thumb = card.querySelector('.proj-thumb');
    if (!thumb) return;
    el('span', 'sm-sweep', thumb);
    card.addEventListener('pointerenter', function () {
      card.classList.remove('sm-swept'); void card.offsetWidth; card.classList.add('sm-swept');
    });
  });

  /* ── 6 · reviews: depth drift + stars behind the active quote ─── */
  var testi = document.getElementById('testimonials');
  var rail = document.getElementById('testiRail');
  if (testi && rail) {
    visIO.observe(testi);
    var starred = new WeakSet(), active = null;
    function stars(card) {
      if (starred.has(card)) return;
      starred.add(card);
      var box = el('span', 'sm-stars', card);
      for (var i = 0; i < 9; i++) {
        var s = el('span', 'sm-star', box);
        s.style.left = (8 + i * 10.5 + (i % 3) * 2) + '%';
        s.style.animationDelay = (-(i * 0.53) % 4.8).toFixed(2) + 's';
        s.style.animationDuration = (4.2 + (i % 4) * 0.5) + 's';
      }
    }
    function setActive(card) {
      if (card === active) return;
      if (active) active.classList.remove('sm-active');
      active = card;
      if (card) { stars(card); card.classList.add('sm-active'); }
    }
    /* active = the hovered card, else the first card fully in the rail */
    var hovered = null, rq = false;
    function pick() {
      rq = false;
      if (hovered) return setActive(hovered);
      var x = rail.getBoundingClientRect().left, kids = rail.children;
      for (var i = 0; i < kids.length; i++) {
        if (kids[i].getBoundingClientRect().left >= x - 4) return setActive(kids[i]);
      }
    }
    function queue() { if (!rq) { rq = true; requestAnimationFrame(pick); } }
    rail.addEventListener('scroll', queue, { passive: true });
    rail.addEventListener('pointerover', function (e) { var c = e.target.closest('.tq'); if (c !== hovered) { hovered = c; queue(); } });
    rail.addEventListener('pointerleave', function () { hovered = null; queue(); });
    /* the rail clones its cards when it initialises; pick after that */
    new IntersectionObserver(function (es, io) { if (es[0].isIntersecting) { setTimeout(queue, 400); io.disconnect(); } }).observe(rail);
  }

  /* ── 7 · timeline glow + marker pulses ────────────────────────── */
  var tl = document.querySelector('.timeline');
  if (tl) {
    if (getComputedStyle(tl).position === 'static') tl.style.position = 'relative';
    var glow = el('span', 'sm-tlglow', tl), headDot = el('span', 'sm-tlhead', tl);
    var items = [].slice.call(tl.querySelectorAll('.tl-item'));
    items.forEach(function (it) { var m = it.querySelector('.tl-marker'); if (m) el('span', 'sm-ring', m); });
    var tlOn = false, tq = false, maxP = 0;
    function tlFrame() {
      tq = false;
      var r = tl.getBoundingClientRect();
      if (!r.height) return;               /* certificates tab is showing */
      /* the head sits 60% down the viewport */
      var p = Math.max(0, Math.min(1, (innerHeight * 0.6 - r.top) / r.height));
      maxP = Math.max(maxP, p);            /* never un-draws on scroll up */
      glow.style.transform = 'scaleY(' + maxP.toFixed(4) + ')';
      headDot.style.transform = 'translateY(' + (maxP * r.height).toFixed(1) + 'px)';
      headDot.classList.toggle('is-on', maxP > 0.01 && maxP < 0.999);
      var y = maxP * r.height;
      for (var i = 0; i < items.length; i++) {
        var m = items[i].querySelector('.tl-marker');
        if (m && !items[i].classList.contains('sm-hit') && m.offsetTop + items[i].offsetTop <= y) items[i].classList.add('sm-hit');
      }
    }
    function tlQueue() { if (tlOn && !tq) { tq = true; requestAnimationFrame(tlFrame); } }
    new IntersectionObserver(function (es) { tlOn = es[0].isIntersecting; tlQueue(); }).observe(tl);
    addEventListener('scroll', tlQueue, { passive: true });
  }

  /* ── 9 · envelope waiting + paper plane on success ────────────────
     Hooks the existing flow without changing it: 13-form-submit-
     inline-validation.js puts an svg.form-check into the submit button
     only after the POST succeeded, then navigates 650ms later. A
     MutationObserver sees that tick and launches the plane. */
  var form = document.querySelector('.c-form');
  var layout = document.querySelector('.c-layout');
  var info = document.querySelector('.c-info');
  if (form && layout && info) {
    var btn = form.querySelector('button[type="submit"]');
    var env = el('div', 'sm-env', layout);
    env.innerHTML = '<svg viewBox="0 0 46 34"><rect x="1.5" y="1.5" width="43" height="31" rx="4" fill="rgba(0,212,255,.12)" stroke="#00d4ff" stroke-width="2"/><path d="M3 4l20 15L43 4" fill="none" stroke="#00d4ff" stroke-width="2" stroke-linejoin="round"/></svg>';
    /* sits in the free space below the contact cards, left of where
       Dumpling settles (39-section-3d.js reads window.__smContactSpot) */
    function placeEnv() {
      var lr = layout.getBoundingClientRect(), last = info.lastElementChild;
      var free = form.getBoundingClientRect().bottom - (last ? last.getBoundingClientRect().bottom : lr.top);
      var ir = info.getBoundingClientRect();
      window.__smContactSpot = free > 150 ? { left: ir.left - lr.left, top: (last.getBoundingClientRect().bottom - lr.top) + 16, width: ir.width, height: free - 16 } : null;
      env.style.display = free > 80 ? '' : 'none';
      env.style.left = (ir.left - lr.left + 24) + 'px';
      env.style.top = (form.getBoundingClientRect().bottom - lr.top - 58) + 'px';
    }
    placeEnv(); new ResizeObserver(placeEnv).observe(layout);
    form.addEventListener('input', function () { placeEnv(); env.classList.add('is-on'); });
    form.addEventListener('focusin', function () { env.classList.add('is-on'); });

    if (btn) new MutationObserver(function () {
      if (!btn.querySelector('.form-check') || btn.dataset.smFlown) return;
      btn.dataset.smFlown = '1';
      env.classList.add('is-gone');
      /* folds out of the waiting envelope when it is showing, else
         straight off the button */
      var r = env.classList.contains('is-on') && env.style.display !== 'none' ? env.getBoundingClientRect() : btn.getBoundingClientRect();
      var plane = el('div', 'sm-plane', document.body);
      plane.style.left = (r.left + r.width / 2 - 32) + 'px';
      plane.style.top = (r.top + r.height / 2 - 20) + 'px';
      /* flies to just past the top-right corner */
      plane.style.setProperty('--sm-fx', (innerWidth - r.right + 160) + 'px');
      plane.style.setProperty('--sm-fy', (-(r.top + 160)) + 'px');
      plane.innerHTML = '<div class="sm-plane-body"><span class="sm-trail"></span><span class="sm-wing a"></span><span class="sm-wing b"></span></div>';
      setTimeout(function () { plane.remove(); }, 1200);
    }).observe(btn, { childList: true });
  }
})();
