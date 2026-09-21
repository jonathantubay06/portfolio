/* ── 16. KEYBOARD SHORTCUTS ────────────────
   Press H → Home, W → Work, S → Services,
   T → Testimonials, E → Experience, C → Contact,
   D → Dark/Light theme toggle.
   A one-time hint tooltip shows on first scroll
   (after 200px) and auto-hides after 4s.
   The hint never shows again (localStorage flag).
   Shortcuts are disabled while typing in any form.
══════════════════════════════════════ */
(function(){
  // Map of key (lowercase) → section id
  const SHORTCUTS = {
    h: 'main',
    s: 'services',
    w: 'work',
    t: 'testimonials',
    e: 'experience',
    c: 'contact',
  };

  // Show keyboard shortcut hint — once only, after user scrolls 200px
  const hint = document.getElementById('kb-hint');
  if (hint && !localStorage.getItem('jt-kb-seen')) {
    const onScroll = () => {
      if (window.scrollY < 200) return;
      hint.classList.add('show');
      localStorage.setItem('jt-kb-seen', '1'); // never show again
      setTimeout(() => hint.classList.remove('show'), 4000);
      window.removeEventListener('scroll', onScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Keydown handler — skip if user is typing in a form field
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1) return;

    // 'd' toggles dark/light theme
    if (e.key.toLowerCase() === 'd') {
      document.getElementById('themeToggle')?.click();
      return;
    }

    const id = SHORTCUTS[e.key.toLowerCase()];
    if (!id) return;

    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();


