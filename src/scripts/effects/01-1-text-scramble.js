/* ── 1. TEXT SCRAMBLE ──────────────────
   On load, the hero name decodes from
   random characters into "Jonathan Tubay"
   — left-to-right, like a terminal reveal.
   Runs on the two parts separately so the
   cyan colour on "Jonathan" is preserved.
══════════════════════════════════════ */
(function(){
  if (PREFERS_REDUCED_MOTION) return; // decorative motion only — nothing here carries content
  const h1 = document.querySelector('.glitch-name');
  if (!h1) return;

  const spanEl   = h1.querySelector('.glow'); // "Jonathan" — needs to stay inside <span>
  const textNode = h1.childNodes[1];          // " Tubay"   — raw text node after the span
  if (!spanEl || !textNode) return;

  // Character pool: caps + lowercase + symbols for that hacker feel
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&0123456789';

  // Generic scrambler: setter writes the value, target is the final string
  function scramble(setter, target, duration, delay) {
    setTimeout(() => {
      let start = null;
      const len = target.length;

      function frame(ts) {
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
        else setter(target); // guarantee clean final state
      }
      requestAnimationFrame(frame);
    }, delay);
  }

  // Both words start close together and finish around the 3s mark
  scramble(v => { spanEl.textContent   = v; }, 'Jonathan', 2600, 200);
  scramble(v => { textNode.nodeValue   = v; }, ' Tubay',   2600, 400);
})();


