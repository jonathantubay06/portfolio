/* ── 9. BUTTON CLICK RIPPLE ────────────
   Every .btn emits a circular ripple from
   the exact click point — the classic Material
   Design affordance that makes button presses
   feel satisfyingly physical.
   The ripple span is injected at click coords,
   animates scale(0)→scale(4) with fade-out,
   then removes itself when done.
   Works on all buttons site-wide including
   hero CTAs, contact submit, back-to-top, etc.
══════════════════════════════════════ */
(function(){
  /* phones and tablets only: the desktop redesign dropped it (html.dk) */
  if (document.documentElement.classList.contains('dk')) return;
  if (PREFERS_REDUCED_MOTION) return; // decorative motion only — nothing here carries content
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const r      = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className  = 'btn-ripple';
    ripple.style.left = `${e.clientX - r.left}px`;
    ripple.style.top  = `${e.clientY - r.top}px`;
    btn.appendChild(ripple);

    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
})();

/* ── MOBILE CTA BAR ──────────────────
   Fixed bottom CTA for mobile — reveals
   once the hero scrolls out of view.
══════════════════════════════════════ */
(function(){
  const bar  = document.getElementById('mobileCta');
  if (!bar) return;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  // Hidden over the hero, and again once the contact form or footer is
  // on screen: the button would only cover the thing it points to.
  const seen = new Set();
  const contact = document.getElementById('contact'), footer = document.querySelector('footer');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target));
    bar.classList.toggle('visible', seen.size === 0);
    // at the end of the page the bar steps away; the floating back-to-top
    // ring takes over there (phones only, see 63-audit-fixes)
    document.documentElement.classList.toggle('cta-end', seen.has(contact) || seen.has(footer));
  }, { threshold: 0.1 });
  [hero, contact, footer].forEach(el => el && io.observe(el));
  const top = document.getElementById('ctaTop');
  if (top) top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();


