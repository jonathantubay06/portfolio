/* ── 21. HERO SCROLL PARALLAX ──────────────
   h1, subtitle, and desc drift at different
   speeds as you scroll — creates depth.
   Desktop only (touch + mobile skipped).
══════════════════════════════════════ */
(function(){
  if (window.matchMedia('(hover: none)').matches) return;
  if (window.innerWidth < 768) return;

  const h1   = document.querySelector('.glitch-name');
  const sub  = document.querySelector('.hero-sub');
  const desc = document.querySelector('.hero-desc');
  if (!h1) return;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > window.innerHeight) return;
    h1.style.transform   = `translateY(-${y * .18}px)`;
    if (sub)  sub.style.transform  = `translateY(-${y * .11}px)`;
    if (desc) desc.style.transform = `translateY(-${y * .07}px)`;
  }, { passive: true });
})();


