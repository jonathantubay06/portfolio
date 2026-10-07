/* ── 16. KEYBOARD SHORTCUTS ────────────────
   Press H → Home, W → Work, S → Services,
   T → Testimonials, E → Experience, C → Contact,
   D → Dark/Light theme toggle.
   A one-time hint tooltip shows after the first
   keypress (mouse + keyboard devices only) and
   auto-hides after 4s.
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

  // Show the shortcut hint once, and only to keyboard users: a mouse and
  // keyboard device (hover + fine pointer) after the first keypress outside
  // a form. On touch screens it used to appear on scroll and cover card text.
  const hint = document.getElementById('kb-hint');
  let seen = true;
  try { seen = !!localStorage.getItem('jt-kb-seen'); } catch (e) {}
  if (hint && !seen && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const onKey = e => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      document.removeEventListener('keydown', onKey);
      hint.classList.add('show');
      try { localStorage.setItem('jt-kb-seen', '1'); } catch (e) {} // never show again
      setTimeout(() => hint.classList.remove('show'), 4000);
    };
    document.addEventListener('keydown', onKey);
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


