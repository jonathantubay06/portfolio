/* ═══════════════════════════════════════
   CONTACT FORM — 2-STAGE
═══════════════════════════════════════ */
function toggleForm() {
  const wrap = document.getElementById('stage2');
  const btn  = document.getElementById('startBtn');
  const open = wrap.classList.toggle('open'); // CSS handles the expand/collapse animation

  btn.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open);
  // Unicode arrows: ↑ (U+2191) when open so user knows clicking collapses it
  const arr = btn.querySelector('.arr');
  btn.textContent = open ? 'Hide form ' : 'Send a message ';
  arr.textContent = open ? '\u2191' : '\u2193';
  btn.appendChild(arr);

  if (open) {
    // Small delay (160ms) lets the CSS transition start before scrolling,
    // so the form is visually expanding while scrolling into view
    setTimeout(() => wrap.scrollIntoView({ behavior: 'smooth', block: 'start' }), 160);
  }
}
const startBtn = document.getElementById('startBtn');
if (startBtn) startBtn.addEventListener('click', toggleForm);

/* Nav CTA also opens form — clicking "Hire Me" in the nav scrolls to contact
   AND opens the form panel if it isn't already open */
document.getElementById('navCta').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });

  const wrap = document.getElementById('stage2');
  if (!wrap.classList.contains('open')) {
    // 520ms delay — wait for the smooth-scroll to near the section before opening,
    // so both animations don't fight each other visually
    setTimeout(toggleForm, 520);
  }
});

