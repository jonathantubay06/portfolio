/* ═══════════════════════════════════════
   WORLD HUD, INTRO AND GRAIN (draft 2026-10-20, igloo.inc idea)
   - Intro: drives the counter in .world-loader (eases toward 90 on its
     own, jumps to 100 when the 3D world turns on, gives up at 2.6 s so a
     slow or skipped 3D never holds the page). Once per visit.
   - HUD: small mono readouts in the bottom-left corner: chapter, its
     name, Manila coordinates and how far down the page you are.
   - Grain: a fixed film-grain and vignette layer above the 3D world and
     below all content, so it never sits on top of text.
   Same desktop gate as the 3D; phones and reduced motion get none of it.
═══════════════════════════════════════ */
(function () {
  var root = document.documentElement;
  var loader = document.querySelector('.world-loader');
  var gate = matchMedia('(min-width:1024px) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  /* no 3D after all (software WebGL, CDN blocked, lost context): bring
     the hero's still poster back */
  addEventListener('hero3d:skip', function () { root.classList.remove('world-pending'); });
  if (!gate.matches || root.classList.contains('quick') || !document.querySelector('.tunnel')) { if (loader) loader.remove(); root.classList.remove('world-pending'); return; }

  /* ── intro counter ── */
  if (loader && !root.classList.contains('intro-seen')) {
    var num = loader.querySelector('.wl-n'), bar = loader.querySelector('.wl-bar i');
    /* the script owns the fade from here; the CSS 3 s fallback is only for
       when no script runs (on a cold load it cut the count off at ~80) */
    loader.style.animation = 'none';
    var t0 = performance.now(), shown = 0, done = false, tDone = 0, from = 0;
    var finish = function () { done = true; };
    addEventListener('hero3d:skip', finish);
    setTimeout(finish, 2600);
    var tick = function (now) {
      if (root.classList.contains('world-on')) done = true;
      if (done && !tDone) { tDone = now; from = shown; }
      /* on its own it slows toward 90; done runs it out to 100 by the
         clock, so a frame stall while the 3D compiles can't stop it short */
      if (done) { var k = Math.min(1, (now - tDone) / 450); shown = from + (100 - from) * (1 - Math.pow(1 - k, 3)); }
      else shown += (90 * (1 - Math.exp(-(now - t0) / 700)) - shown) * 0.12;
      if (done && shown > 99.4) shown = 100;
      var v = Math.round(shown);
      num.textContent = (v < 10 ? '00' : v < 100 ? '0' : '') + v;
      bar.style.transform = 'scaleX(' + (shown / 100).toFixed(3) + ')';
      if (shown < 100) { requestAnimationFrame(tick); return; }
      loader.classList.add('wl-out');
      try { sessionStorage.setItem('jt-intro', '1'); } catch (e) {}
      setTimeout(function () { loader.remove(); }, 700);
    };
    requestAnimationFrame(tick);
  } else if (loader) loader.remove();

  /* ── grain + vignette (z -1, after the world canvas and its scrim) ── */
  var fx = document.createElement('div');
  fx.className = 'world-fx';
  document.body.appendChild(fx);

  /* ── HUD ── */
  var names = [].map.call(document.querySelectorAll('.tunnel .tn-text'), function (p) {
    return p.lastChild.textContent.trim();
  });
  var total = names.length;
  var hud = document.createElement('div');
  hud.className = 'world-hud';
  hud.setAttribute('aria-hidden', 'true');
  hud.innerHTML = '<span class="wh-ch"></span><span class="wh-meta">Manila <i class="wh-ph"></i> · <b class="wh-pc">000</b>%</span>';
  document.body.appendChild(hud);
  var ch = hud.querySelector('.wh-ch'), pc = hud.querySelector('.wh-pc'), ph = hud.querySelector('.wh-ph');
  setInterval(queue, 30000);
  var lastCh = -1, lastPc = -1, raf = 0;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function update() {
    raf = 0;
    var s = window.__worldShot || 0;
    /* a chapter counts from the moment its title starts to show */
    var c = Math.min(total, Math.ceil(s - 0.04));
    if (c !== lastCh) {
      lastCh = c;
      ch.textContent = pad(c) + ' / ' + pad(total) + ' · ' + (c ? names[c - 1] : 'Intro');
    }
    var max = root.scrollHeight - innerHeight;
    var p = max > 0 ? Math.round(scrollY / max * 100) : 0;
    if (p !== lastPc) { lastPc = p; pc.textContent = (p < 10 ? '00' : p < 100 ? '0' : '') + p; }
    if (window.__manilaPhase && ph.textContent !== window.__manilaPhase) ph.textContent = window.__manilaPhase;
  }
  function queue() { if (!raf) raf = requestAnimationFrame(update); }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  queue();
})();
