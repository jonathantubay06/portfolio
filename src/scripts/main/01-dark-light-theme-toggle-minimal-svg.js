/* ═══════════════════════════════════════
   DARK / LIGHT THEME TOGGLE — minimal SVG
═══════════════════════════════════════ */
(function(){
  const btn  = document.getElementById('themeToggle');
  const root = document.documentElement; // <html> — data-theme attribute lives here
  const saved = localStorage.getItem('jt-theme'); // persist user's last choice across sessions

  // Inline SVGs so no external icon library is needed and no network request is made
  const sunSVG  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="5.64" y1="5.64" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="18.36" y2="18.36"/><line x1="5.64" y1="18.36" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="18.36" y2="5.64"/></svg>`;
  const moonSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

  const apply = theme => {
    // Dark mode is the default — no attribute needed. Light mode is the opt-in,
    // so we only SET the attribute for light and REMOVE it to go back to dark.
    // This means all CSS default values are dark, and [data-theme="light"] overrides them.
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');

    // Show the opposite icon — if you're in light mode, offer the moon (go dark)
    btn.innerHTML = theme === 'light' ? moonSVG : sunSVG;
    btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  };

  // Fall back to OS preference if nothing is saved yet (matches the inline
  // head script in index.html that sets data-theme before first paint)
  apply(saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

  btn.addEventListener('click', () => {
    // Toggle: if the attribute exists we're in light mode, clicking goes dark, and vice versa
    const next = root.hasAttribute('data-theme') ? 'dark' : 'light';
    localStorage.setItem('jt-theme', next); // remember choice for next visit
    apply(next);
  });
})();

