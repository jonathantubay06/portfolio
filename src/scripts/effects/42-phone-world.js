/* ═══════════════════════════════════════
   PHONE WORLD (prototype 2026-10-29)
   Phones get the desk world without WebGL: a fixed background of
   pre-rendered camera shots, one per chapter, taken from the live 3D
   (img/world/phone/shot-N, 14-26 KB AVIF each). The shot changes as
   each chapter card scrolls past the middle of the screen, and the
   scrim lifts while a card is on screen so the world shows between
   chapters and sits dim behind the text. Images, opacity and one-shot
   transforms only: nothing runs per frame, so phones stay cool.
   Desktop keeps the live world (36-hero-3d.js).
═══════════════════════════════════════ */
(function () {
  var de = document.documentElement;
  if (de.classList.contains('dk') || de.classList.contains('quick')) return;
  if (navigator.connection && navigator.connection.saveData) return;
  var tunnels = [].slice.call(document.querySelectorAll('.tunnel'));
  if (tunnels.length < 2) return;

  /* per shot, in % of the 720x1280 shot image: tappable props that jump
     to their section (the desk is the menu, like OWN in 36-hero-3d.js)
     and soft glow pulses on the lights. Read off the shots 2026-10-29;
     re-check them whenever the shots are re-captured. */
  var HOT = [
    [[72, 47, 'Selected work', '#work']],
    [[76, 15, 'Client reviews', '#testimonials'], [50, 42, 'Selected work', '#work']],
    [[52, 25, 'Services', '#services'], [13, 37, 'Client reviews', '#testimonials']],
    [[42, 65, 'Book a call', '#contact'], [70, 42, 'Experience', '#experience']],
    [[50, 30, 'Services', '#services']],
    [[70, 50, 'Selected work', '#work'], [70, 30, 'Services', '#services']]
  ];
  var GLOW = [
    [[90, 96, 70], [20, 86, 40]],
    [[48, 84, 120]],
    [[22, 76, 80]],
    [[72, 52, 50]],
    [[16, 60, 40]],
    [[72, 50, 110], [22, 57, 50]]
  ];

  /* the world is drawn for the dark page: a visit that starts in light
     builds it the first time the theme switches to dark */
  if (de.getAttribute('data-theme') === 'light') {
    var mo = new MutationObserver(function () {
      if (de.getAttribute('data-theme') !== 'light') { mo.disconnect(); build(); }
    });
    mo.observe(de, { attributes: true, attributeFilter: ['data-theme'] });
  } else build();

  function build() {
    var root = document.createElement('div');
    root.className = 'pw';
    root.setAttribute('aria-hidden', 'true');
    var shots = tunnels.map(function (t, i) {
      var s = document.createElement('div');
      s.className = 'pw-shot';
      s.dataset.n = i + 1;
      root.appendChild(s);
      return s;
    });
    var scrim = document.createElement('div');
    scrim.className = 'pw-scrim';
    root.appendChild(scrim);
    document.body.insertBefore(root, document.body.firstChild);
    de.classList.add('pw-on');

    /* the props and glows sit in a fixed layer above the page, clipped to
       the same window as the scrim, so they only exist over a chapter card */
    var hot = document.createElement('div');
    hot.className = 'pw-hot';
    hot.setAttribute('aria-hidden', 'true');
    var spots = [];
    HOT.forEach(function (list, i) {
      list.forEach(function (h) {
        var el = document.createElement('a');
        el.href = h[3]; el.tabIndex = -1; el.className = 'pw-spot';
        el.innerHTML = '<i></i><span></span>';
        el.lastChild.textContent = h[2] + ' →';
        hot.appendChild(el);
        spots.push({ el: el, n: i + 1, x: h[0], y: h[1] });
      });
    });
    GLOW.forEach(function (list, i) {
      list.forEach(function (g) {
        var el = document.createElement('b');
        el.className = 'pw-glow';
        el.style.width = el.style.height = g[2] + 'px';
        hot.appendChild(el);
        spots.push({ el: el, n: i + 1, x: g[0], y: g[1] });
      });
    });
    document.body.appendChild(hot);
    /* shot % to screen px: the shot box is the viewport plus 4% each side
       (.pw-shot inset:-4%), with the image cover-fitted inside it */
    function place() {
      var vw = innerWidth, vh = innerHeight, W = vw * 1.08, H = vh * 1.08;
      var k = Math.max(W / 720, H / 1280), dw = 720 * k, dh = 1280 * k;
      var ox = -vw * 0.04 + (W - dw) / 2, oy = -vh * 0.04 + (H - dh) / 2;
      spots.forEach(function (p) {
        var x = ox + p.x / 100 * dw, y = oy + p.y / 100 * dh;
        p.el.style.left = Math.round(x) + 'px'; p.el.style.top = Math.round(y) + 'px';
        p.el.hidden = x < 24 || x > vw - 24;
        /* labels open toward the middle of the screen */
        p.el.classList.toggle('l', x > vw * 0.55);
      });
    }
    place();
    addEventListener('resize', place, { passive: true });

    /* load a shot only when it is current or next, so a visitor who
       stops at the hero downloads none of them */
    function load(i) {
      var s = shots[i];
      if (!s || s.dataset.ok) return;
      s.dataset.ok = 1;
      var u = 'img/world/phone/shot-' + (i + 1);
      /* plain WebP first: an older Safari ignores the image-set line */
      s.style.backgroundImage = 'url(' + u + '.webp)';
      s.style.backgroundImage = 'image-set(url(' + u + '.avif) type("image/avif"), url(' + u + '.webp) type("image/webp"))';
    }

    var active = 0; /* 0 = hero, no world yet; n = chapter n */
    function show(n) {
      if (n === active) return;
      active = n;
      load(n - 1); load(n);
      shots.forEach(function (s, i) { s.classList.toggle('on', i === n - 1); });
      spots.forEach(function (p) { p.el.classList.toggle('on', p.n === n); });
      de.classList.toggle('pw-in', n > 0);
    }

    /* on scroll, once per frame: the current chapter is the last card
       whose top has passed 55% of the screen, and the scrim opens a window
       exactly where a card is on screen, so the world shows only behind
       the chapter title and never behind section text. Rect reads first,
       then one style write, so no forced layout. (An IntersectionObserver
       line missed fast flings in WebKit: a card that jumps across it never
       reports a change.) */
    var queued = false, win = '';
    function check() {
      queued = false;
      var h = innerHeight, n = 0, a = -9999, b = -9999;
      for (var i = 0; i < tunnels.length; i++) {
        var r = tunnels[i].getBoundingClientRect();
        if (r.top < h * 0.55) n = i + 1;
        if (r.bottom > 0 && r.top < h) { a = Math.round(r.top); b = Math.round(r.bottom); }
      }
      show(n);
      var w = a + ',' + b;
      if (w !== win) {
        win = w;
        [scrim, hot].forEach(function (el) { el.style.setProperty('--a', a + 'px'); el.style.setProperty('--b', b + 'px'); });
        /* the glows pulse only while a window is open */
        de.classList.toggle('pw-win', a > -9999);
      }
    }
    addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(check); }
    }, { passive: true });
    check();
    /* the first shot is warm before the first card arrives */
    addEventListener('scroll', function () { load(0); }, { passive: true, once: true });
  }
})();
