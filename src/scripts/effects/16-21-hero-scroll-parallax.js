/* ── 21. HERO SCROLL PARALLAX ──────────────
   h1, subtitle, and desc drift at different
   speeds as you scroll — creates depth.
   Desktop only (touch + mobile skipped).
══════════════════════════════════════ */
// Set up after load: reading innerWidth during startup forced the page's
// first full layout inside this script (~300 ms at 4x CPU throttle).
function initHeroParallax(){
  if (window.matchMedia('(hover: none)').matches) return;
  if (window.innerWidth < 768) return;

  const h1   = document.querySelector('.glitch-name');
  const sub  = document.querySelector('.hero-sub');
  const desc = document.querySelector('.hero-desc');
  if (!h1) return;

  // One write per frame at most: scroll can fire several times a frame.
  let queued = false;
  function apply() {
    queued = false;
    const y = window.scrollY;
    if (y > window.innerHeight) return;
    h1.style.transform   = `translateY(-${y * .18}px)`;
    if (sub)  sub.style.transform  = `translateY(-${y * .11}px)`;
    if (desc) desc.style.transform = `translateY(-${y * .07}px)`;
  }
  window.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(apply); }
  }, { passive: true });
}
if (document.readyState === 'complete') initHeroParallax();
else window.addEventListener('load', initHeroParallax, { once: true });
