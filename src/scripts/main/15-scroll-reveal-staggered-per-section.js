/* ═══════════════════════════════════════
   SCROLL REVEAL — staggered per section
═══════════════════════════════════════ */
// Main observer: fires when a section (or standalone .r element) enters the viewport.
// It then staggers-in all .r children of that section.
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (!isIntersecting) return;

    // If the observed element itself has the .r class, animate it directly
    if (target.classList.contains('r')) target.classList.add('on');

    // Stagger child .r elements: each one enters 90ms after the previous.
    // Excludes .proj-card because those are handled individually by cardIO below —
    // without this exclusion, all cards would animate at once when the section enters.
    const items = target.querySelectorAll('.r:not(.on):not(.proj-card)');
    items.forEach((el, i) => {
      setTimeout(() => el.classList.add('on'), i * 90); // 90ms stagger looks natural
    });

    revealIO.unobserve(target); // one-shot — no need to watch after it's revealed
  });
}, {
  threshold:  0.05,              // trigger as soon as 5% of the section is visible
  rootMargin: '0px 0px -60px 0px' // negative bottom margin: element must be 60px INTO the viewport
                                  // before triggering — prevents animations firing while still off-screen
});

// Separate observer for project cards — each card triggers independently as it scrolls in.
// If we let revealIO handle them, all cards in the section would animate simultaneously
// when the section header hit the threshold, not when each card actually enters view.
const cardIO = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (!isIntersecting) return;
    target.classList.add('on');
    cardIO.unobserve(target); // one-shot
  });
}, {
  threshold:  0.1,               // 10% visible before card animates in
  rootMargin: '0px 0px -40px 0px' // slightly less buffer than revealIO — cards are shorter elements
});

// Observe all sections and special background wrappers
document.querySelectorAll('section, .testi-bg, .tools-bg').forEach(sec => revealIO.observe(sec));

// Also observe standalone .r elements that aren't inside a section (e.g. the nav or footer)
document.querySelectorAll('.r').forEach(el => {
  if (!el.closest('section') && !el.closest('.testi-bg') && !el.closest('.tools-bg')) {
    revealIO.observe(el);
  }
});

// Each project card gets its own individual observation
document.querySelectorAll('.proj-card.r').forEach(card => cardIO.observe(card));

