/* ── 22. TOOL CHIP STAGGER ENTRANCE ────────
   Each .chip flies in with 40ms stagger when
   the tools section scrolls into view.
   Runs once per chip via IntersectionObserver.
══════════════════════════════════════ */
(function(){
  const chips = document.querySelectorAll('.chip');
  if (!chips.length) return;

  chips.forEach(c => c.classList.add('chip-hidden'));

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      const idx = Array.from(chips).indexOf(entry.target);
      setTimeout(() => {
        entry.target.classList.remove('chip-hidden');
        entry.target.classList.add('chip-in');
      }, idx * 40);
    });
  }, { threshold: 0.1 });

  chips.forEach(c => io.observe(c));
})();


