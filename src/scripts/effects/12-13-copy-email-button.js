/* ── 13. COPY EMAIL BUTTON ─────────────
   Injects a small clipboard button next to
   the email address in the contact section.
   Click copies to clipboard and shows a
   "Copied!" toast for 2 seconds — one-touch
   convenience for clients on mobile.
══════════════════════════════════════ */
(function(){
  const EMAIL = 'jonatsbuilds@gmail.com';

  // Create the toast element (one shared instance)
  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.textContent = '✓ Email copied!';
  document.body.appendChild(toast);

  let toastTimer = null;
  function showToast() {
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // Clipboard SVG icon
  const clipSVG = `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const checkSVG = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;

  // Find the email value element inside the .c-opt card
  document.querySelectorAll('.c-opt-val, .ci-val').forEach(el => {
    if (!el.textContent.includes(EMAIL)) return;

    // Wrap text + button in a flex row
    const text = el.textContent.trim();
    el.innerHTML = '';
    const row  = document.createElement('span');
    row.className = 'c-opt-val-row';
    const span = document.createElement('span');
    span.textContent = text;

    const btn  = document.createElement('button');
    btn.className = 'copy-btn';
    btn.setAttribute('aria-label', 'Copy email address');
    btn.innerHTML = clipSVG;

    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(EMAIL).then(() => {
        btn.innerHTML = checkSVG;
        showToast();
        setTimeout(() => { btn.innerHTML = clipSVG; }, 2000);
      });
    });

    row.appendChild(span);
    row.appendChild(btn);
    el.appendChild(row);
  });
})();


