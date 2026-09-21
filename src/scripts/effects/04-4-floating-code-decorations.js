/* ── 4. FLOATING CODE DECORATIONS ──────
   Tokens are pinned to the far left (2–16%)
   and far right (84–97%) fringes only —
   well clear of the centre content column.
   Vertical spread avoids the very top (nav)
   and concentrates on mid + lower hero.
   Skipped on small screens (< 600px).
══════════════════════════════════════ */
(function(){
  // Disabled with the 2026-09-21 hero rebuild — the floating tokens landed
  // directly over the workstation render. See the spotlight note above.
  return;

  if (PREFERS_REDUCED_MOTION) return; // decorative motion only — nothing here carries content
  const hero = document.querySelector('.hero');
  if (!hero || window.innerWidth < 768) return; // hidden on tablets & below via CSS too

  const tokens = ['< />', '{ }', '=>', '//', '&&', '===', 'async', 'const', 'null', '[ ]'];

  tokens.forEach((token, i) => {
    const el = document.createElement('span');
    el.className = 'hero-code-float';
    el.textContent = token;
    el.setAttribute('aria-hidden', 'true');

    // Far left: 2–16% | Far right: 84–97% — nothing near the centre column
    const onLeft = i % 2 === 0;
    const left   = onLeft
      ? (2  + Math.random() * 14)   // 2–16%  (far left fringe)
      : (84 + Math.random() * 13);  // 84–97% (far right fringe)

    // Vertical: start at 12% (below nav), spread to 88% (above scroll hint)
    const top = 12 + (i / tokens.length) * 76;

    el.style.cssText = `
      left:${left.toFixed(1)}%;
      top:${top.toFixed(1)}%;
      animation-delay:${(i * 0.65).toFixed(2)}s;
      animation-duration:${(7 + Math.random() * 5).toFixed(1)}s;
      font-size:${(.62 + Math.random() * 0.26).toFixed(2)}rem;
    `;
    hero.appendChild(el);
  });
})();


