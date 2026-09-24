/* ── 35. SWIPE DOTS ──────────────────────
   On phones "More builds" and the toolkit are sideways swipe rows. A dot
   per card under each row shows there is more and where you are; tapping
   a dot scrolls to that card. Hidden above 600px by CSS.
══════════════════════════════════════ */
(function(){
  document.querySelectorAll('.work-grid,.work-tiles').forEach(row => {
    const cards = [...row.children].filter(c => c.classList.contains('proj-card'));
    if (cards.length < 2) return;
    const dots = document.createElement('div');
    dots.className = 'swipe-dots';
    dots.setAttribute('aria-hidden', 'true');
    cards.forEach((card, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.tabIndex = -1;
      d.addEventListener('click', () =>
        row.scrollTo({ left: card.offsetLeft - row.offsetLeft - parseFloat(getComputedStyle(row).scrollPaddingInlineStart || 0), behavior: 'smooth' }));
      dots.appendChild(d);
    });
    row.after(dots);
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) dots.children[cards.indexOf(e.target)].classList.toggle('on', true);
        else dots.children[cards.indexOf(e.target)].classList.remove('on');
      });
    }, { root: row, threshold: 0.6 });
    cards.forEach(c => io.observe(c));
  });
})();
