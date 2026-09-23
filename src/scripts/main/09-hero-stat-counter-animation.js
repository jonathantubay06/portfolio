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

    el.textContent = Math.floor(eased * num) + suffix;
    if (progress < 1) requestAnimationFrame(tick); // keep going until done
  }

  requestAnimationFrame(tick);
}

// #tz-time is the live clock, not a count: "2:41 PM" contains digits, so
// the counter used to parse it as 2 with the suffix ": PM" and leave
// "2: PM" on screen until the clock's next tick.
const statNums    = document.querySelectorAll('.stat-num:not(#tz-time)');
let countersRun   = false; // one-shot flag — counters should only animate once

// Reduced motion: the markup already holds the final values, so skipping
// the animation shows the right numbers immediately. This was missing —
// every other decorative motion on the site is gated and this was not.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) countersRun = true;

const counterIO = new IntersectionObserver(entries => {
  // threshold:0.5 — wait until the stat strip is half-visible before starting,
  // so the numbers don't finish counting before the user even sees them
  if (entries[0].isIntersecting && !countersRun) {
    countersRun = true; // mark done so repeated scrolling doesn't re-trigger
    statNums.forEach(el => {
      const val = el.textContent.trim();
      if (/\d/.test(val)) animateCounter(el, val, 1800); // 1800ms feels punchy but readable
    });
  }
}, { threshold: 0.5 });

// Observe the parent strip — watching a single element is cheaper than watching all stat-nums
if (statNums.length) counterIO.observe(statNums[0].closest('.stat-strip') || statNums[0]);

