/* ── 17. COPY PHONE BUTTON ─────────────────
   Injects a clipboard button next to the phone
   number in the contact section — mirrors the
   copy-email button above it. Copies the raw
   number (+63 917 529 1657) to the clipboard
   and shows the shared "Copied!" toast.
══════════════════════════════════════ */
(function(){
  const PHONE = '+639175291657'; // E.164 format for clipboard

  // Find the phone ci-val by its id
  const phoneVal = document.getElementById('phone-val');
  if (!phoneVal) return;

  const toast = document.querySelector('.copy-toast'); // reuse the existing toast element

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // Same SVG icons used by the email copy button
  const clipSVG  = `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const checkSVG = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;

  // Wrap the existing text in a flex row with the copy button
  const text = phoneVal.textContent.trim();
  phoneVal.innerHTML = '';
  const row  = document.createElement('span');
  row.className = 'c-opt-val-row';
  const span = document.createElement('span');
  span.textContent = text;

  const btn  = document.createElement('button');
  btn.className = 'copy-btn';
  btn.setAttribute('aria-label', 'Copy phone number');
  btn.innerHTML = clipSVG;

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(PHONE).then(() => {
      btn.innerHTML = checkSVG;
      showToast('✓ Number copied!');
      setTimeout(() => { btn.innerHTML = clipSVG; }, 2000);
    });
  });

  row.appendChild(span);
  row.appendChild(btn);
  phoneVal.appendChild(row);
})();


