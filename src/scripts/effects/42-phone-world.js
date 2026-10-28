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
  if (de.getAttribute('data-theme') === 'light') return;
  if (navigator.connection && navigator.connection.saveData) return;
  var tunnels = [].slice.call(document.querySelectorAll('.tunnel'));
  if (tunnels.length < 2) return;

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
    if (w !== win) { win = w; scrim.style.setProperty('--a', a + 'px'); scrim.style.setProperty('--b', b + 'px'); }
  }
  addEventListener('scroll', function () {
    if (!queued) { queued = true; requestAnimationFrame(check); }
  }, { passive: true });
  check();
  /* the first shot is warm before the first card arrives */
  addEventListener('scroll', function () { load(0); }, { passive: true, once: true });
})();
