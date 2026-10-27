/* ═══════════════════════════════════════
   HERO STAT COUNTER ANIMATION
═══════════════════════════════════════ */
function animateCounter(el, target, duration) {
  const isNum  = /\d/.test(target);       // guard: skip if no digit found
  const num    = parseInt(target);         // extract the numeric part
  const suffix = target.replace(/[0-9]/g, ''); // keep the suffix (e.g. '+', 'k', '%')
  if (!isNum) return;

  const start = performance.now(); // high-res timestamp for smooth easing

  function tick(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1); // 0 → 1 over `duration` ms

    // Ease-out cubic: starts fast, slows near the end — feels more satisfying
    // than linear because the number "settles" into its final value.
    // Formula: 1 - (1 - t)^3 gives strong deceleration in the last 30%
    const eased = 1 - Math.pow(1 - progress, 3);

    if (landed) return; // the backstop already wrote the real value
    el.textContent = Math.floor(eased * num) + suffix;
    if (progress < 1) requestAnimationFrame(tick); // keep going until done
  }

  let landed = false;
  requestAnimationFrame(tick);
  // rAF can pause mid-count while the 3D desk compiles on a refresh (seen
  // 2026-10-24: "7+ / 7 / 6" left on screen), so a timer always lands the
  // real value once the count should be over, and a late frame can no
  // longer overwrite it (2026-10-27: "5+ / 5 / 4" still seen).
  setTimeout(() => { landed = true; el.textContent = target; }, duration + 400);
}

// #tz-time is the live clock, not a count: "2:41 PM" contains digits, so
// the counter used to parse it as 2 with the suffix ": PM" and leave
// "2: PM" on screen until the clock's next tick.
const statNums    = document.querySelectorAll('.stat-num:not(#tz-time)');
// Real values read once from the HTML, before any count can touch the text,
// so a second run never mistakes a mid-count number for the target.
const statTargets = new Map([...statNums].map(el => [el, el.textContent.trim()]));
let countersRun   = false; // one-shot flag — counters should only animate once

// Reduced motion: the markup already holds the final values, so skipping
// the animation shows the right numbers immediately. This was missing —
// every other decorative motion on the site is gated and this was not.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('quick')) countersRun = true;

const counterIO = new IntersectionObserver(entries => {
  // threshold:0.5 — wait until the stat strip is half-visible before starting,
  // so the numbers don't finish counting before the user even sees them
  if (entries[0].isIntersecting && !countersRun) {
    countersRun = true; // mark done so repeated scrolling doesn't re-trigger
    const run = () => {
      statNums.forEach(el => {
        const val = statTargets.get(el);
        if (/\d/.test(val)) animateCounter(el, val, 1800); // 1800ms feels punchy but readable
      });
      // last line of defence: whatever stalled, the strip ends on the real numbers
      setTimeout(() => statTargets.forEach((val, el) => { if (el.textContent.trim() !== val) el.textContent = val; }), 4000);
    };
    // Desktop 3D: count after the WebGL desk has faded in (36-hero-3d.js
    // fires hero3d:ready), so two things are not animating at once. The
    // timeout covers a skipped or failed 3D boot.
    if (window.__hero3dPending) {
      let done = false;
      const once = () => { if (!done) { done = true; setTimeout(run, 900); } };
      addEventListener('hero3d:ready', once, { once: true });
      addEventListener('hero3d:skip', once, { once: true });
      setTimeout(once, 6000);
    } else run();
  }
}, { threshold: 0.5 });

// Observe the parent strip — watching a single element is cheaper than watching all stat-nums
if (statNums.length) counterIO.observe(statNums[0].closest('.stat-strip') || statNums[0]);

