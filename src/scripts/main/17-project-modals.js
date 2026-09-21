/* ═══════════════════════════════════════
   PROJECT MODALS
═══════════════════════════════════════ */
(function(){
  // All focusable element types — used by the Tab focus trap
  const FOCUSABLE_SEL = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let _opener = null; // element that triggered open — focus returns here on close

  // Closed modals are hidden with opacity/pointer-events only, which leaves
  // their links and buttons in the accessibility tree and in the Tab order.
  // `inert` removes both; aria-hidden is set alongside it for older engines.
  document.querySelectorAll('.proj-modal').forEach(m => {
    if (!m.classList.contains('open')) {
      m.setAttribute('inert', '');
      m.setAttribute('aria-hidden', 'true');
    }
  });

  function openModal(id, trigger) {
    const modal = document.getElementById(id);
    if (!modal) return;

    _opener = trigger || null;
    modal.classList.add('open');
    // Must clear inert before focusing — an inert subtree cannot take focus
    modal.removeAttribute('inert');
    modal.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal-close').focus();
  }

  function closeModal(modal) {
    modal.classList.remove('open');
    modal.setAttribute('inert', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Return focus to the button that opened this modal so keyboard nav stays coherent
    if (_opener) { _opener.focus(); _opener = null; }
  }

  // Focus trap: Tab and Shift+Tab cycle only within the open modal
  document.querySelectorAll('.proj-modal').forEach(modal => {
    modal.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || !modal.classList.contains('open')) return;
      const focusable = Array.from(modal.querySelectorAll(FOCUSABLE_SEL));
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    });
  });

  // "View Details" button on each card — data-modal="modal-[id]" tells us which modal to open.
  // stopPropagation prevents the click from bubbling to the card's 3D-tilt listener.
  document.querySelectorAll('.btn-modal-open').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openModal(btn.dataset.modal, btn);
    });
  });

  // Close via the ✕ button or by clicking the dark backdrop
  document.querySelectorAll('.proj-modal').forEach(modal => {
    modal.querySelector('.modal-close').addEventListener('click',   () => closeModal(modal));
    modal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(modal));
  });

  // Escape key — standard UX pattern, expected by keyboard users and screen readers
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.proj-modal.open').forEach(m => closeModal(m));
    }
  });

  // Inject prev/next navigation into each modal
  const MODAL_ORDER = [
    'modal-moev', 'modal-dpm', 'modal-portfolio', 'modal-toolmart',
    'modal-kdl', 'modal-kdl-checker', 'modal-service-health', 'modal-project-health',
    'modal-edith', 'modal-thor'
  ];
  MODAL_ORDER.forEach((id, i) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    const inner = modal.querySelector('.modal-inner');
    if (!inner) return;

    const nav     = document.createElement('div');
    nav.className = 'modal-nav';
    nav.setAttribute('aria-label', 'Project navigation');

    const prevId = MODAL_ORDER[i - 1];
    const nextId = MODAL_ORDER[i + 1];

    const makeNavBtn = (label, targetId) => {
      const btn = document.createElement('button');
      btn.className   = 'modal-nav-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        closeModal(modal);
        setTimeout(() => openModal(targetId), 80);
      });
      return btn;
    };

    const spacer = () => { const s = document.createElement('span'); s.className = 'modal-nav-spacer'; return s; };
    nav.appendChild(prevId ? makeNavBtn('← Prev', prevId) : spacer());

    const count     = document.createElement('span');
    count.className = 'modal-nav-count';
    count.textContent = `${i + 1} / ${MODAL_ORDER.length}`;
    nav.appendChild(count);

    nav.appendChild(nextId ? makeNavBtn('Next →', nextId) : spacer());

    inner.appendChild(nav);
  });
})();


