/* ── 15. SIDE DOT NAVIGATION ───────────────
   Fixed right-edge dot for each major section.
   Active dot fills cyan based on which section
   occupies the centre of the viewport.
   Dots are built dynamically from the page's
   <section id="..."> elements so adding a new
   section automatically gets a dot.
   Tooltip label comes from data-label attribute
   set on each dot (matches the section heading).
   Hidden on ≤900px (overlaps back-to-top).
══════════════════════════════════════ */
(function(){
  // Sections to track — id maps to a friendly label for the tooltip
  const NAV_SECTIONS = [
    { id: 'main',         label: 'Home'       },
    { id: 'services',     label: 'Services'   },
    { id: 'work',         label: 'Work'       },
    { id: 'testimonials', label: 'Reviews'    },
    { id: 'experience',   label: 'Experience' },
    { id: 'contact',      label: 'Contact'    },
  ];

  // Build the container + one dot per section
  const container = document.createElement('div');
  container.id = 'side-dots';
  container.setAttribute('aria-hidden', 'true'); // decorative — not in tab order

  const dots = NAV_SECTIONS.map(({ id, label }) => {
    const el = document.createElement('button');
    el.className   = 'sdot';
    el.setAttribute('data-label', label);
    el.setAttribute('aria-label', `Scroll to ${label}`);
    // The container is aria-hidden, so these were reachable by keyboard but
    // silent to a screen reader — the worst of both. They duplicate the main
    // nav, so the right answer is out of the tab order entirely rather than
    // announced twice. (aria-label stays for devtools/hover legibility.)
    el.tabIndex = -1;
    el.addEventListener('click', () => {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    container.appendChild(el);
    return { el, id };
  });

  document.body.appendChild(container);

  // IntersectionObserver: when a section hits the middle of the viewport,
  // its dot becomes active. rootMargin pushes the trigger zone to centre.
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const idx = dots.findIndex(d => d.id === entry.target.id);
      if (idx === -1) return;
      dots.forEach((d, i) => d.el.classList.toggle('active', i === idx));
    });
  }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

  // Only observe sections that actually exist in the DOM
  dots.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });
})();


