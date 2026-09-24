/* ── 26. QUICK-PICK SERVICE BUTTONS ────────
   Clicks a .qp-btn → pre-selects the service
   dropdown and scrolls to the contact form.
══════════════════════════════════════ */
(function(){
  const btns   = document.querySelectorAll('.qp-btn');
  const select = document.getElementById('f-need');
  if (!btns.length || !select) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.service;
      // Match option text to the data-service value
      Array.from(select.options).forEach((opt, i) => {
        if (opt.value === val || opt.text === val) select.selectedIndex = i;
      });
      // Scroll to contact section
      const contact = document.getElementById('contact');
      if (contact) contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();


