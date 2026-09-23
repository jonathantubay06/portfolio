/* ── 15. SIDE DOT NAVIGATION ───────────────
   Fixed right-edge dot per major section; the active one fills cyan.
   Hidden on ≤900px (CSS), where it would crowd the back-to-top button.

   Fixed 2026-09-24: "back to top stops on the 2nd dot". The page did
   reach the top, but the Home dot tracked <main id="main">, which wraps
   the entire page. An IntersectionObserver only fires on changes, and
   <main> never stops intersecting, so after scrolling down and back up
   no event ever re-lit Home and Services stayed highlighted. Home now
   tracks the hero, and the active dot is computed from scroll position
   (the last section whose top has passed 40% of the viewport) instead of
   from enter events, so it cannot get stuck whichever way you scroll.

   The container is aria-hidden and the dots are out of the tab order:
   they duplicate the main nav, so they are a pointer shortcut only.
══════════════════════════════════════ */
(function(){
  const NAV_SECTIONS = [
    { sel: '.hero',         label: 'Home'       },
    { sel: '#services',     label: 'Services'   },
    { sel: '#work',         label: 'Work'       },
    { sel: '#testimonials', label: 'Reviews'    },
    { sel: '#experience',   label: 'Experience' },
    { sel: '#contact',      label: 'Contact'    },
  ];

  const container = document.createElement('div');
  container.id = 'side-dots';
  container.setAttribute('aria-hidden', 'true');

  const dots = NAV_SECTIONS.map(({ sel, label }) => {
    const target = document.querySelector(sel);
    if (!target) return null;
    const el = document.createElement('button');
    el.className = 'sdot';
    el.type = 'button';
    el.tabIndex = -1;
    el.setAttribute('data-label', label);
    el.setAttribute('aria-label', 'Scroll to ' + label);
    el.addEventListener('click', () => {
      if (sel === '.hero') window.scrollTo({ top: 0, behavior: PREFERS_REDUCED_MOTION ? 'auto' : 'smooth' });
      else target.scrollIntoView({ behavior: PREFERS_REDUCED_MOTION ? 'auto' : 'smooth', block: 'start' });
    });
    container.appendChild(el);
    return { el, target };
  }).filter(Boolean);

  document.body.appendChild(container);

  let current = -1;
  function update() {
    const line = window.innerHeight * 0.4;
    let idx = 0;
    dots.forEach((d, i) => { if (d.target.getBoundingClientRect().top <= line) idx = i; });
    // At the very bottom the last section may never reach the 40% line
    // (it is shorter than the space below it), so light it explicitly.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) idx = dots.length - 1;
    if (idx === current) return;
    current = idx;
    dots.forEach((d, i) => d.el.classList.toggle('active', i === idx));
  }

  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
