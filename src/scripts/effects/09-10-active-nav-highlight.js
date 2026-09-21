/* ── 10. ACTIVE NAV HIGHLIGHT ───────────
   Adds .active to the correct nav link as
   you scroll past each section — gives clear
   wayfinding without any extra UI chrome.
   Uses IntersectionObserver with a centre-
   biased rootMargin so only the section that
   fills the middle of the viewport wins.
   Disconnects cleanly when all sections pass.
══════════════════════════════════════ */
(function(){
  const links    = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = [];

  // Build a map of id → nav link
  const linkMap = {};
  links.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    linkMap[id] = a;
    const el = document.getElementById(id);
    if (el) sections.push(el);
  });

  if (!sections.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const link = linkMap[entry.target.id];
      if (!link) return;
      if (entry.isIntersecting) {
        // Remove active from all, then set on the one that entered
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

  sections.forEach(s => obs.observe(s));
})();


