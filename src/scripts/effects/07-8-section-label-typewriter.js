/* ── 8. SECTION LABEL TYPEWRITER ───────
   Each section label (e.g. "// ABOUT ME",
   "// PROJECTS") types out character by
   character when it enters the viewport —
   reinforces the code-editor motif and gives
   every section a micro-entrance moment.
   Only runs once per label (observer disconnects
   after the first intersection).
   A blinking cursor is appended during typing
   and removed when done.
══════════════════════════════════════ */
(function(){
  if (PREFERS_REDUCED_MOTION) return; // decorative motion only — nothing here carries content
  const labels = document.querySelectorAll('.sec-label');
  if (!labels.length) return;

  const typed = new Set();
  labels.forEach(el => {
    const original = el.textContent.trim();

    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || typed.has(el)) return;
      typed.add(el);
      obs.disconnect();

      el.textContent = ''; // clear just before typing — avoids blank labels on slow page loads

      // Blinking cursor spans beside the label during typing
      const cursor = document.createElement('span');
      cursor.className    = 'tl-cursor'; // reuse existing blink style if present
      cursor.textContent  = '▌';
      cursor.style.cssText = 'opacity:1;animation:blink 1s step-end infinite;margin-left:2px;color:var(--cyan);';
      el.appendChild(cursor);

      let i = 0;
      const SPEED = 48; // ms per character — fast enough to feel snappy

      // Build a text node before the cursor and extend it each tick
      const textNode = document.createTextNode('');
      el.insertBefore(textNode, cursor);

      const tick = setInterval(() => {
        textNode.nodeValue += original[i];
        i++;
        if (i >= original.length) {
          clearInterval(tick);
          setTimeout(() => cursor.remove(), 800); // leave cursor blinking briefly then remove
        }
      }, SPEED);
    }, { threshold: 0.4 });

    obs.observe(el);
  });
})();


