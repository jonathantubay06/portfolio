/* ═══════════════════════════════════════
   RESULTS STRIP COUNTERS

   Counts the four key metrics up when the strip scrolls into view. The
   strip previously had a scroll reveal and nothing else, despite being
   the most conversion-relevant block on the page.

   Two things make this different from the hero's stat counter:

   1. The numbers sit inside a sentence ("180+ videos"), so counting
      changes the string's WIDTH. The box is measured and pinned before
      the first frame, exactly as the hero name scramble does — an
      unpinned count would re-wrap the line and move everything below it,
      which is where this site's mobile CLS came from last time.

   2. .results-strip carries content-visibility:auto, so while it is off
      screen its subtree is not laid out and any measurement taken there
      is meaningless. Measuring inside the IntersectionObserver callback
      means it always happens after the section is rendered, and the
      width > 0 check is the belt to that braces — the carousel shipped a
      bug from caching a bogus measurement out of a skipped subtree.
══════════════════════════════════════ */
(function(){
  const strip = document.querySelector('.results-strip');
  if (!strip) return;

  const nums = strip.querySelectorAll('.result-num');
  if (!nums.length) return;

  // Animated numbers are decoration over text that is already correct in
  // the markup, so reduced motion just keeps the authored value.
  // matchMedia rather than the PREFERS_REDUCED_MOTION const: that lives in
  // the effects.js preamble, and this file is concatenated into main.js.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /**
   * Split "180+ videos" into 180 and "+ videos".
   *
   * Deliberately anchored to the leading digits rather than stripping
   * every digit in the string the way the hero counter does. That
   * approach happens to work on the current copy but would mangle a
   * label containing its own number — "5 of 12 services" would become
   * 512.
   */
  function parse(text){
    const m = /^(\d+)([\s\S]*)$/.exec(text.trim());
    return m ? { value: parseInt(m[1], 10), rest: m[2] } : null;
  }

  function countUp(el, target, rest, duration){
    // Pin the final width so the digits cannot change the line box.
    // Measured here, after the observer fired, so the section is
    // definitely laid out. A zero means it is not, in which case leave
    // the number alone rather than animating inside a box we cannot
    // trust.
    const width = el.getBoundingClientRect().width;
    if (width <= 0) return;
    el.style.minWidth = width + 'px';

    const start = performance.now();
    let done = false;

    function finish(){
      if (done) return;
      done = true;
      el.textContent = target + rest;
      el.style.minWidth = '';   // hand the width back for later reflows
    }

    function tick(now){
      if (done) return;
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out cubic, matching the hero counter so the two read as one
      // system: fast start, settles into the final value.
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target) + rest;
      if (progress < 1) requestAnimationFrame(tick);
      else finish();
    }

    requestAnimationFrame(tick);
    // requestAnimationFrame is paused in a hidden tab. Without this the
    // strip could be left showing "0+ videos" behind a pinned width until
    // the tab was looked at.
    setTimeout(finish, duration + 1000);
  }

  let run = false;
  const io = new IntersectionObserver(entries => {
    if (run || !entries.some(e => e.isIntersecting)) return;
    run = true;
    io.disconnect();

    nums.forEach((el, i) => {
      const parsed = parse(el.textContent);
      if (!parsed) return;
      // Staggered so the four do not tick in lockstep.
      setTimeout(() => countUp(el, parsed.value, parsed.rest, 1500), i * 120);
    });
  }, { threshold: 0.35 });

  io.observe(strip);
})();
