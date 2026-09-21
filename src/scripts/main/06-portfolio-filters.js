/* ═══════════════════════════════════════
   PORTFOLIO FILTERS
═══════════════════════════════════════ */
// Cache selectors once — no need to re-query the DOM on every filter click
const pfBtns  = document.querySelectorAll('.pf-btn');
const pfCards = document.querySelectorAll('.proj-card');

pfBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // .active drives the visual state; aria-pressed mirrors it for
    // assistive tech, which cannot see the class change.
    pfBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');

    const filter = btn.dataset.filter;

    pfCards.forEach((card, i) => {
      const matches = filter === 'all' || card.dataset.category === filter;

      if (!matches) {
        /* ── Hide: animate out, then add .hidden after animation ── */
        if (!card.classList.contains('hidden')) {
          card.classList.add('filter-out');
          // Wait for the 200ms out-animation before truly hiding
          setTimeout(() => {
            card.classList.add('hidden');
            card.classList.remove('filter-out');
          }, 220);
        }
      } else {
        /* ── Show: remove hidden, then animate in with stagger ── */
        card.classList.remove('hidden', 'filter-out');
        card.classList.remove('filter-in'); // reset so re-clicking replays
        // Force reflow so the animation replays from scratch
        void card.offsetWidth;
        // Stagger: each visible card enters 50ms after the previous
        setTimeout(() => card.classList.add('filter-in'), i * 50 + 50);
      }
    });
  });
});

