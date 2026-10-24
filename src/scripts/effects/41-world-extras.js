/* ═══════════════════════════════════════
   WORLD EXTRAS (draft 2026-10-20, on draft/world-extras, port 3002)
   - Quick view: header switch for a plain, fast page (no 3D, wallpaper,
     smooth scroll or motion). Saved in localStorage; flipping it reloads
     so every effect starts (or stays off) cleanly.
   - Action dock: Work · Reviews · Book a call, bottom centre on desktop
     once the hero has gone, hidden at the contact form.
   - Chapter menu: hovering the side dots lists every chapter by name,
     with the desk still of the hovered one.
   - Project dive: in the 3D world, opening a project first flies the
     camera into the laptop with that project on its screen, then the
     details open over it (36-hero-3d.js: __worldDive / __worldDiveEnd).
═══════════════════════════════════════ */
(function () {
  var root = document.documentElement;

  /* ── quick view ── */
  /* the footer's "Pause animations" (every device) is the same switch:
     it is how looping motion can be stopped (WCAG 2.2.2) */
  var on = root.classList.contains('quick');
  ['quickToggle', 'motionToggle'].forEach(function (id) {
    var qt = document.getElementById(id);
    if (!qt) return;
    qt.setAttribute('aria-pressed', on ? 'true' : 'false');
    qt.addEventListener('click', function () {
      try { localStorage.setItem('jt-quick', on ? '0' : '1'); } catch (e) {}
      location.reload();
    });
  });

  var desk = matchMedia('(min-width:1024px) and (pointer:fine)');

  /* ── action dock ── */
  if (desk.matches) {
    /* a div with the navigation role: the site styles every <nav> as the
       full-width header bar */
    var dock = document.createElement('div');
    dock.className = 'world-dock';
    dock.setAttribute('role', 'navigation');
    dock.setAttribute('aria-label', 'Quick links');
    dock.innerHTML = '<a href="#work">Work</a><a href="#testimonials">Reviews</a><a href="#contact" class="wd-cta">Book a call</a>';
    document.body.appendChild(dock);
    root.classList.add('has-dock');
    var contact = document.getElementById('contact'), atContact = false, raf = 0;
    if (contact) new IntersectionObserver(function (e) { atContact = e[0].isIntersecting; place(); }, { rootMargin: '0px 0px -30% 0px' }).observe(contact);
    var place = function () {
      raf = 0;
      dock.classList.toggle('on', scrollY > innerHeight * 0.6 && !atContact);
    };
    addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(place); }, { passive: true });
    place();
  }

  /* ── chapter menu on the side dots ── */
  var CH = {
    Home: ['00', 'Intro', 'img/hero3d/hero-poster-m480w.webp'],
    Services: ['01', 'Boot', 'img/world/chapter-01.webp'],
    Work: ['02', 'Deployments', 'img/world/chapter-02.webp'],
    Reviews: ['03', 'Logs', 'img/world/chapter-03.webp'],
    Experience: ['04', 'Uptime', 'img/world/chapter-04.webp'],
    Contact: ['06', 'Ping', 'img/world/chapter-06.webp']
  };
  var dots = document.getElementById('side-dots');
  if (dots) {
    dots.classList.add('chapter-menu');
    [].forEach.call(dots.querySelectorAll('.sdot'), function (d) {
      var c = CH[d.getAttribute('data-label')];
      if (!c) return;
      var tipEl = document.createElement('span');
      tipEl.className = 'sd-tip';
      tipEl.innerHTML = '<img alt="" loading="lazy" decoding="async" width="720" height="540"><b>' + c[0] + ' · ' + c[1] + '</b><em>' + d.getAttribute('data-label') + '</em>';
      tipEl.querySelector('img').setAttribute('data-src', c[2]);
      d.appendChild(tipEl);
    });
    /* thumbnails load on the first hover only */
    /* pointerover bubbles up from the dots (the container itself takes
       no pointer events) */
    dots.addEventListener('pointerover', function load() {
      dots.removeEventListener('pointerover', load);
      [].forEach.call(dots.querySelectorAll('img[data-src]'), function (i) { i.src = i.getAttribute('data-src'); });
    });
  }

  /* ── project dive ── */
  function shotFor(id) {
    var img = document.querySelector('#' + id + ' .modal-screenshot img');
    if (!img) return null;
    var ss = img.getAttribute('srcset') || '', m = /(\S+)\s+720w/.exec(ss);
    return m ? m[1] : img.getAttribute('src');
  }
  var allow = false;
  function canDive() {
    return !allow && window.__worldDive && root.classList.contains('world-on') &&
      !root.classList.contains('quick') && !matchMedia('(prefers-reduced-motion:reduce)').matches;
  }
  document.addEventListener('click', function (e) {
    if (!canDive()) return;
    var btn = e.target.closest && e.target.closest('.btn-modal-open[data-modal]');
    var card = !btn && e.target.closest && e.target.closest('.proj-card[data-modal]');
    if (card && e.target.closest('a, button')) return;
    var el = btn || card;
    if (!el) return;
    var src = shotFor(el.getAttribute('data-modal'));
    if (!src) return;
    e.preventDefault(); e.stopImmediatePropagation();
    root.classList.add('world-dive');
    window.__worldDive(src);
    setTimeout(function () {
      allow = true; el.click(); allow = false;
      setTimeout(function () { root.classList.remove('world-dive'); }, 250);
    }, 900);
  }, true);
  /* the laptop keeps the open project (and follows next/prev) until the
     last project modal closes */
  var modals = [].slice.call(document.querySelectorAll('.proj-modal'));
  var mo = new MutationObserver(function () {
    if (!window.__worldDive) return;
    var open = modals.filter(function (m) { return m.classList.contains('open'); })[0];
    if (open) { if (root.classList.contains('world-on') && !root.classList.contains('quick')) { var s = shotFor(open.id); if (s) window.__worldDive(s); } }
    else if (window.__worldDiveEnd) window.__worldDiveEnd();
  });
  modals.forEach(function (m) { mo.observe(m, { attributes: true, attributeFilter: ['class'] }); });
})();
