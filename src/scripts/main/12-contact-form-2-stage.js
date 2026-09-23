/* ═══════════════════════════════════════
   CONTACT — nav CTA

   The form used to sit in a collapsible "stage 2" behind a Hide/Send
   button, and this file toggled it. It shipped open by default and the
   panel above it repeated the same three contact cards, so the toggle
   only ever hid the one thing the section is for. The form is now always
   shown (2026-09-24) and the toggle is gone.

   What is left: the nav CTA scrolls to the form. The href="#contact"
   already does that without script; this only swaps the jump for a
   smooth scroll where motion is allowed.
═══════════════════════════════════════ */
(function(){
  const cta = document.getElementById('navCta');
  const contact = document.getElementById('contact');
  if (!cta || !contact) return;
  cta.addEventListener('click', e => {
    e.preventDefault();
    // Own matchMedia check: PREFERS_REDUCED_MOTION lives in effects.js, which loads after this file.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    contact.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
})();
