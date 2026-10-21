/* ═══════════════════════════════════════
   WORLD HUD, INTRO AND GRAIN (draft 2026-10-20, igloo.inc idea)
   - Intro: drives the reactor ring and counter in .world-loader (eases
     toward 90 on its own, runs to 100 when the 3D world turns on, gives
     up at 4.5 s so a slow or skipped 3D never holds the page), glitches
     at 100 and opens a portal onto the room. Esc or a click skips. Once
     per visit.
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
    var num = loader.querySelector('.wl-n'), prog = loader.querySelector('.wl-prog');
    var core = loader.querySelector('.wl-core'), lines = loader.querySelectorAll('.wl-log li');
    /* the script owns the fade from here; the CSS 3 s fallback is only for
       when no script runs (on a cold load it cut the count off at ~80) */
    loader.style.animation = 'none';
    var t0 = performance.now(), shown = 0, done = false, tDone = 0, from = 0, ended = false;
    var finish = function () { done = true; };
    addEventListener('hero3d:skip', finish);
    /* the 3D boots behind the intro, so wait for it a little longer than
       before, but never past 4.5 s */
    setTimeout(finish, 4500);
    /* the portal: a hole opens from the ring's centre while the rings zoom
       past, then the loader goes. Skipping (Esc or a click) jumps here. */
    var enter = function () {
      if (ended) return; ended = true;
      removeEventListener('keydown', onKey);
      try { sessionStorage.setItem('jt-intro', '1'); } catch (e) {}
      var r = core.getBoundingClientRect();
      loader.style.setProperty('--wl-cx', Math.round(r.left + r.width / 2) + 'px');
      loader.style.setProperty('--wl-cy', Math.round(r.top + r.height / 2) + 'px');
      loader.classList.add('wl-portal');
      setTimeout(function () { loader.classList.add('wl-out'); }, 650);
      setTimeout(function () { loader.remove(); }, 1150);
    };
    var onKey = function (e) { if (e.key === 'Escape') enter(); };
    addEventListener('keydown', onKey);
    loader.addEventListener('click', enter);
    var tick = function (now) {
      if (ended) return;
      /* done once the room's one long priming frame is behind the intro */
      if (root.classList.contains('world-on') && window.__roomPrimed) done = true;
      if (done && !tDone) { tDone = now; from = shown; }
      /* on its own it slows toward 90; done runs it out to 100 by the
         clock, so a frame stall while the 3D compiles can't stop it short */
      if (done) { var k = Math.min(1, (now - tDone) / 450); shown = from + (100 - from) * (1 - Math.pow(1 - k, 3)); }
      else shown += (90 * (1 - Math.exp(-(now - t0) / 700)) - shown) * 0.12;
      if (done && shown > 99.4) shown = 100;
      var v = Math.round(shown), t = (v < 10 ? '00' : v < 100 ? '0' : '') + v;
      num.textContent = t; num.setAttribute('data-t', t);
      prog.style.strokeDashoffset = (100 - shown).toFixed(2);
      for (var i = 0; i < lines.length; i++) if (v >= +lines[i].getAttribute('data-at')) lines[i].classList.add('on');
      if (shown < 100) { requestAnimationFrame(tick); return; }
      /* 100: a short glitch on the number, then through the portal */
      loader.classList.add('wl-glitch');
      setTimeout(enter, 340);
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
