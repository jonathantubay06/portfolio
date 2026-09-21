/* ── 1. TEXT SCRAMBLE ──────────────────
   On load, the hero name decodes from
   random characters into "Jonathan Tubay"
   — left-to-right, like a terminal reveal.
   Runs on the two halves separately so the
   cyan colour on "Jonathan" is preserved.

   Each half's box is measured and pinned to
   its final width before the scramble starts.
   Without that pin this animation was the
   whole of the site's mobile CLS: the pool
   below contains characters whose advance
   widths in Orbitron differ by a third, the
   H1 re-laid-out on every one of ~45 frames,
   and the 2026-09-21 PageSpeed run scored it
   0.333 — attributed to <span class="glow">,
   which is exactly the element whose width
   was changing.

   Worth noting for future debugging: this
   never reproduced in a background tab,
   because requestAnimationFrame is paused
   there and the scramble simply never ran.
══════════════════════════════════════ */
(function(){
  if (PREFERS_REDUCED_MOTION) return; // decorative motion only — nothing here carries content
  const h1 = document.querySelector('.glitch-name');
  if (!h1) return;

  const spanEl = h1.querySelector('.glow');       // "Jonathan" — keeps the cyan glow
  const tailEl = h1.querySelector('.gname-tail'); // "Tubay"
  if (!spanEl || !tailEl) return;

  // Character pool: caps + lowercase + symbols for that hacker feel
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&0123456789';

  /**
   * Pin an element to the width it currently occupies, and return the
   * function that releases it. Called with the final text still in place,
   * so the measurement is the layout the page settles into — the scramble
   * then plays inside a box that cannot move anything.
   *
   * getBoundingClientRect rather than offsetWidth: the H1 uses a clamp()
   * font-size, so the natural width is usually fractional and rounding it
   * down would let the last glyph reflow.
   */
  function pinWidth(el) {
    const w = el.getBoundingClientRect().width;
    el.style.width = w + 'px';
    return () => { el.style.width = ''; };
  }

  /** Generic scrambler: setter writes the value, target is the final string. */
  function scramble(el, setter, target, duration, delay) {
    setTimeout(() => {
      // Measured here rather than at script load: by now the preloaded
      // fonts have resolved, so this is the real final metric. (If a font
      // swapped mid-animation the pin would be stale — which is a second
      // reason the faces use font-display:optional.)
      const release = pinWidth(el);
      let start = null;
      let done = false;
      const len = target.length;

      // Settle on the final text and hand the width back to the layout
      // engine, so a later viewport change reflows normally.
      //
      // Reached either by the animation finishing or by the watchdog
      // below, whichever comes first. The watchdog matters because
      // requestAnimationFrame is paused outright in a hidden tab: if the
      // page loads in a background tab the loop can stop after its first
      // frame, and without this the name would sit half-scrambled behind a
      // pinned width until the tab was looked at. Observed while
      // debugging this very animation.
      function finish() {
        if (done) return;
        done = true;
        setter(target);
        release();
      }

      function frame(ts) {
        if (done) return;
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        // How many chars from the left have "settled" into the real letter
        const settled = Math.floor(progress * len);

        let out = '';
        for (let i = 0; i < len; i++) {
          if (i < settled || target[i] === ' ') {
            out += target[i]; // real character — locked in
          } else {
            out += CHARS[Math.floor(Math.random() * CHARS.length)]; // still scrambling
          }
        }
        setter(out);
        if (progress < 1) requestAnimationFrame(frame);
        else finish();
      }

      requestAnimationFrame(frame);
      setTimeout(finish, duration + 1000);
    }, delay);
  }

  // Both words start close together and finish around the 3s mark
  scramble(spanEl, v => { spanEl.textContent = v; }, 'Jonathan', 2600, 200);
  scramble(tailEl, v => { tailEl.textContent = v; }, 'Tubay',    2600, 400);
})();
