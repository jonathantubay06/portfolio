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
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target));
    bar.classList.toggle('visible', seen.size === 0);
  }, { threshold: 0.1 });
  [hero, document.getElementById('contact'), document.querySelector('footer')]
    .forEach(el => el && io.observe(el));
})();


