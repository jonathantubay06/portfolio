/* ═══════════════════════════════════════
   SCROLL — single throttled handler (perf)
═══════════════════════════════════════ */
const scrollBar = document.getElementById('scroll-bar');
const navEl     = document.querySelector('nav');
let scrollTicking = false; // flag prevents queueing multiple rAF calls per scroll event

function onScroll() {
  // Throttle: if we already have a rAF queued, skip this scroll event.
  // This ensures we process at most one update per animation frame (~60/s),
  // not one per scroll event (can be hundreds per second on fast trackpads).
  if (scrollTicking) return;
  scrollTicking = true;

  requestAnimationFrame(() => {
    const sy        = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    // Progress bar: what % of the page has been scrolled
    const pct = maxScroll > 0 ? (sy / maxScroll) * 100 : 0;
    scrollBar.style.width = pct + '%';

    // Back-to-top ring: fill the SVG circle based on scroll progress
    // circumference = 2π × r18 ≈ 113.1 — dashoffset 113.1 = empty, 0 = full
    const bttRing = document.querySelector('.btt-progress');
    if (bttRing) bttRing.style.strokeDashoffset = (113.1 * (1 - pct / 100)).toFixed(2);

    // Show back-to-top button only after scrolling 400px — any earlier and it
    // overlaps hero content before the user needs it
    backToTop.classList.toggle('visible', sy > 400);

    // Add .scrolled class to nav after 60px — triggers background blur/opacity
    // change so nav text stays readable over page content
    navEl.classList.toggle('scrolled', sy > 60);

    scrollTicking = false; // allow next scroll event to queue another rAF
  });
}
window.addEventListener('scroll', onScroll, { passive: true }); // passive = no preventDefault, allows browser scroll optimisations

