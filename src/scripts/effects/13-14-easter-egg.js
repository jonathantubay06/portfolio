/* ── 14. EASTER EGG ────────────────────
   Type "hireme" anywhere on the page (no
   input focused) and a terminal-style window
   appears with a typewriter message sequence.
   Perfect conversation starter — any dev or
   recruiter who finds it will remember it.
══════════════════════════════════════ */
(function(){
  const overlay = document.getElementById('egg-overlay');
  const linesEl = document.getElementById('egg-lines');
  const closeBtn = document.getElementById('egg-close');
  if (!overlay || !linesEl || !closeBtn) return;

  const TRIGGER  = 'jt'; // initials — quick to type, fun for devs who try it
  let   buffer   = '';

  // The terminal lines — each is printed with a delay
  const LINES = [
    { text: '> ',          cmd: 'hire jonathan.exe',      delay: 0    },
    { text: 'Loading...',                                  delay: 600  },
    { text: '████████████████████ 100%',                  delay: 1100 },
    { text: '',                                            delay: 1300 },
    { text: '✓ ',          ok: 'Skills loaded',           rest: ' — Shopify · WordPress · Automation', delay: 1500 },
    { text: '✓ ',          ok: 'Status',                  rest: ' — AVAILABLE FOR PROJECTS',           delay: 1900 },
    { text: '✓ ',          ok: 'Location',                rest: ' — Las Piñas, PH  (remote-first)',     delay: 2300 },
    { text: '→ ',          cmd: 'jonatsbuilds@gmail.com',                                               delay: 2800 },
  ];

  function buildLine(line) {
    const p = document.createElement('p');
    p.className = 'egg-line';
    if (line.cmd) {
      p.innerHTML = `${escHtml(line.text || '')}<span class="egg-cmd">${escHtml(line.cmd)}</span>${escHtml(line.rest || '')}`;
    } else if (line.ok) {
      p.innerHTML = `${escHtml(line.text || '')}<span class="egg-ok">${escHtml(line.ok)}</span><span class="egg-dim">${escHtml(line.rest || '')}</span>`;
    } else {
      p.textContent = line.text || '';
    }
    return p;
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function openEgg() {
    linesEl.innerHTML = '';
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    closeBtn.focus();

    LINES.forEach(line => {
      setTimeout(() => {
        linesEl.appendChild(buildLine(line));
      }, line.delay);
    });
  }

  function closeEgg() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  closeBtn.addEventListener('click', closeEgg);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeEgg(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeEgg();
  });

  // Listen for the "hireme" sequence on any non-input keypress
  document.addEventListener('keydown', e => {
    // Don't capture if user is typing in a form field
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key.length === 1) {
      buffer = (buffer + e.key.toLowerCase()).slice(-TRIGGER.length);
      if (buffer === TRIGGER) {
        buffer = '';
        openEgg();
      }
    }
  });
})();

