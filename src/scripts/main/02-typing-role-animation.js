/* ═══════════════════════════════════════
   TYPING ROLE ANIMATION
═══════════════════════════════════════ */
(function(){
  const el = document.getElementById('typingRole');
  if (!el) return; // guard — safe exit if element doesn't exist

  const roles = ['eCommerce Builder', 'Automation Specialist', 'Ops Tech Lead', 'Shopify Developer', 'Workflow Automator'];
  let roleIdx = 0, charIdx = 0, deleting = false;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = roles[0];
    return;
  }

  function type() {
    const word = roles[roleIdx];

    if (!deleting) {
      // Add one character at a time by slicing the string to an increasing length
      el.textContent = word.slice(0, ++charIdx);

      if (charIdx === word.length) {
        // Fully typed — pause for 2.2s so the reader can see it before backspacing
        deleting = true;
        setTimeout(type, 2200);
        return;
      }
    } else {
      // Remove one character at a time
      el.textContent = word.slice(0, --charIdx);

      if (charIdx === 0) {
        // Fully deleted — advance to the next role (wraps around with modulo)
        deleting = false;
        roleIdx = (roleIdx + 1) % roles.length;
      }
    }

    // Deleting is faster (40ms) than typing (85ms) — feels more natural,
    // backspacing reads as quicker/less deliberate than forward typing
    setTimeout(type, deleting ? 40 : 85);
  }

  type(); // kick off the loop
})();

