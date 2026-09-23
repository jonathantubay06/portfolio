/* ── 12. AVAILABLE PILL ────────────────
   Green "Available · Let's talk" pill that floats above the back-to-top
   button and links to the contact form. Replaces two pills that both
   linked to #contact (Available for Projects + Get In Touch).

   Shown only while none of these is on screen:
   - the hero: it has its own CTAs, the pill is not needed yet;
   - #contact: the pill would point at where the visitor already is;
   - the footer: the pill and back-to-top were covering its links.
   Hidden on phones by CSS; the mobile sticky CTA bar does this job there.
══════════════════════════════════════ */
(function(){
  const pill = document.getElementById('avail-pill');
  if (!pill) return;

  const blockers = [document.querySelector('.hero'), document.getElementById('contact'), document.querySelector('footer')]
    .filter(Boolean);
  const onScreen = new Set();

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => en.isIntersecting ? onScreen.add(en.target) : onScreen.delete(en.target));
    pill.classList.toggle('visible', onScreen.size === 0);
  }, { threshold: 0 });
  blockers.forEach(el => io.observe(el));
})();
