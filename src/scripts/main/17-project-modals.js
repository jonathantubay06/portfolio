/* ═══════════════════════════════════════
   PROJECT MODALS

   Rewritten 2026-09-24 for the premium modal pass. What changed, and why:

   - Opening morphs the clicked card's screenshot into the modal header
     (View Transitions API). One object moves the whole way, instead of
     one box vanishing and an unrelated one fading in. Engines without
     the API, and reduced-motion users, get the plain fade.
   - Prev/Next swaps modals IN PLACE with a directional slide. The old
     version closed the modal, waited 80ms and opened the next, so the
     backdrop faded out and back in on every click.
   - Arrow keys and horizontal swipes move between projects; on phones a
     downward swipe from the top of the sheet closes it.
   - The scroll lock goes on <html>, with scrollbar-gutter reserving the
     scrollbar's width (48-modals-premium.css), so the page behind no
     longer jumps sideways by the scrollbar width on open and close.
     Setting overflow on <body> did not reliably lock anything: <html>
     carries overflow-x:hidden, which stops body overflow propagating to
     the viewport, so body's own overflow applied to an unconstrained box.
   - The header window leans toward the pointer.

   Kept: focus trap, focus return to the opener, `inert` on closed
   modals, Escape to close.
═══════════════════════════════════════ */
(function(){
  const FOCUSABLE_SEL = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAN_VT  = typeof document.startViewTransition === 'function' && !REDUCED;

  // Reading order of the Work section: freelance, more builds, toolkit.
  const MODAL_ORDER = [
    'modal-moev', 'modal-dpm',
    'modal-toolmart', 'modal-kdl', 'modal-portfolio',
    'modal-kdl-checker', 'modal-service-health', 'modal-project-health',
    'modal-edith', 'modal-thor'
  ];

  let _opener = null;   // element focus returns to when the modal closes
  let current = null;   // the open modal element, if any

  // Closed modals are hidden with opacity/pointer-events only, which would
  // leave their links in the Tab order and accessibility tree. `inert`
  // removes both; aria-hidden alongside it for older engines.
  document.querySelectorAll('.proj-modal').forEach(m => {
    if (!m.classList.contains('open')) {
      m.setAttribute('inert', '');
      m.setAttribute('aria-hidden', 'true');
    }
  });

  const cardFor = id => document.querySelector('.proj-card[data-modal="' + id + '"]');

  function inViewport(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.width > 0;
  }

  /* Show / hide without any focus or history side effects. `instant`
     suppresses the modal's own fade so a swap or a view transition does
     not capture it half-transparent. */
  function show(modal, instant) {
    if (instant) modal.classList.add('m-instant');
    modal.classList.add('open');
    modal.removeAttribute('inert');
    modal.removeAttribute('aria-hidden');
    // Restart the content stagger for this showing.
    modal.classList.remove('m-enter'); void modal.offsetWidth; modal.classList.add('m-enter');
    const content = modal.querySelector('.modal-content');
    if (content) content.scrollTop = 0;
    current = modal;
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.remove('m-instant')));
  }

  function hide(modal, instant) {
    if (instant) modal.classList.add('m-instant');
    modal.classList.remove('open', 'm-enter', 'm-from-next', 'm-from-prev');
    modal.setAttribute('inert', '');
    modal.setAttribute('aria-hidden', 'true');
    if (current === modal) current = null;
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.remove('m-instant')));
  }

  function lockScroll(on) {
    document.documentElement.classList.toggle('modal-open', on);
  }

  /* Morph between a card's screenshot and the modal header. Both elements
     get the same view-transition-name, one before the DOM change and one
     after, and the browser animates the box between them. */
  function morph(fromEl, toEl, change) {
    if (!CAN_VT || !fromEl || !toEl) { change(); return; }
    fromEl.style.viewTransitionName = 'proj-hero';
    const vt = document.startViewTransition(() => {
      fromEl.style.viewTransitionName = '';
      toEl.style.viewTransitionName = 'proj-hero';
      change();
    });
    vt.finished.finally(() => { toEl.style.viewTransitionName = ''; });
  }

  function openModal(id, trigger) {
    const modal = document.getElementById(id);
    if (!modal) return;
    _opener = trigger || null;
    const card = cardFor(id);
    const thumb = card && inViewport(card) ? card.querySelector('.proj-thumb') : null;
    const shot = modal.querySelector('.modal-screenshot');
    morph(thumb, shot, () => {
      lockScroll(true);
      show(modal, !!thumb && CAN_VT);
      // Inside the callback: with a view transition this runs a frame or
      // two later, and focusing before it would hit a still-inert modal.
      modal.querySelector('.modal-close').focus({ preventScroll: true });
    });
  }

  function closeModal(modal) {
    if (!modal) return;
    const card = cardFor(modal.id);
    const thumb = card && inViewport(card) ? card.querySelector('.proj-thumb') : null;
    const shot = modal.querySelector('.modal-screenshot');
    morph(shot, thumb, () => {
      hide(modal, !!thumb && CAN_VT);
      lockScroll(false);
    });
    if (_opener) { _opener.focus({ preventScroll: true }); _opener = null; }
  }

  /* In-place swap to the neighbouring project. The backdrop never leaves:
     both modals switch instantly, and only the incoming content slides in
     from the side it is coming from. The original opener is kept, so
     closing after browsing still returns focus to the card you started on. */
  function go(dir) {
    if (!current) return;
    const i = MODAL_ORDER.indexOf(current.id);
    const nextId = MODAL_ORDER[i + dir];
    if (!nextId) return;
    const to = document.getElementById(nextId);
    if (!to) return;
    const from = current;
    hide(from, true);
    to.classList.add(dir > 0 ? 'm-from-next' : 'm-from-prev');
    show(to, true);
    to.querySelector('.modal-close').focus({ preventScroll: true });
  }

  /* Where focus goes back to when the modal closes. A card can hold two
     Details buttons — the hover overlay's and, on the showcase rows, one in
     the body — and a display:none element silently refuses focus, which
     left focus stranded inside the just-closed (now inert) modal. So take
     the first one actually rendered; failing that, the card itself. */
  function focusTargetFor(card) {
    const btn = Array.from(card.querySelectorAll('.btn-modal-open'))
      .find(b => b.getClientRects().length > 0);
    if (btn) return btn;
    if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '-1');
    return card;
  }

  // ── wiring ──────────────────────────────────────────────────────────

  // Details buttons, and the whole card (not only its hover-revealed
  // button). Clicks on real links and buttons inside a card are left alone.
  document.querySelectorAll('.btn-modal-open').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openModal(btn.dataset.modal, btn);
    });
  });
  document.querySelectorAll('.proj-card[data-modal]').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('a, button')) return;
      openModal(card.dataset.modal, focusTargetFor(card));
    });
  });

  document.querySelectorAll('.proj-modal').forEach(modal => {
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(modal));

    // In-page links (the "talk about a build" CTA) close the modal first,
    // otherwise the page scrolls to #contact behind a modal still open.
    modal.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', () => { _opener = null; closeModal(modal); });
    });

    // Focus trap: Tab and Shift+Tab cycle within the open modal.
    modal.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || !modal.classList.contains('open')) return;
      const focusable = Array.from(modal.querySelectorAll(FOCUSABLE_SEL));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });

  document.addEventListener('keydown', e => {
    if (!current) return;
    if (e.key === 'Escape') { closeModal(current); return; }
    // e.target can be the document itself (no .closest) when nothing
    // inside the page has focus.
    const t = e.target;
    if (t && t.closest && t.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
  });

  // ── prev / next bar + progress ─────────────────────────────────────
  MODAL_ORDER.forEach((id, i) => {
    const modal = document.getElementById(id);
    const inner = modal && modal.querySelector('.modal-inner');
    if (!inner) return;

    const nav = document.createElement('div');
    nav.className = 'modal-nav';
    nav.setAttribute('aria-label', 'Project navigation');

    const makeBtn = (label, dir, disabled) => {
      const b = document.createElement('button');
      b.className = 'modal-nav-btn';
      b.textContent = label;
      if (disabled) b.disabled = true;
      else b.addEventListener('click', () => go(dir));
      return b;
    };
    nav.appendChild(makeBtn('← Prev', -1, i === 0));

    const mid = document.createElement('div');
    mid.className = 'modal-nav-mid';
    const count = document.createElement('span');
    count.className = 'modal-nav-count';
    const pad = n => String(n).padStart(2, '0');
    count.textContent = pad(i + 1) + ' / ' + pad(MODAL_ORDER.length);
    const bar = document.createElement('span');
    bar.className = 'modal-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.style.setProperty('--p', ((i + 1) / MODAL_ORDER.length).toFixed(3));
    mid.append(count, bar);
    nav.appendChild(mid);

    nav.appendChild(makeBtn('Next →', 1, i === MODAL_ORDER.length - 1));
    inner.appendChild(nav);
  });

  // ── swipe: sideways to browse, down from the top to dismiss ────────
  document.querySelectorAll('.proj-modal .modal-inner').forEach(inner => {
    let x0 = 0, y0 = 0, t0 = 0, atTop = false;
    inner.addEventListener('touchstart', e => {
      const t = e.touches[0];
      x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
      const content = inner.querySelector('.modal-content');
      atTop = !content || content.scrollTop <= 0;
    }, { passive: true });
    inner.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      if (Date.now() - t0 > 600) return;                    // a slow drag is a scroll
      if (Math.abs(dx) > 60 && Math.abs(dy) < 45) go(dx < 0 ? 1 : -1);
      else if (dy > 90 && Math.abs(dx) < 50 && atTop) closeModal(current);
    }, { passive: true });
  });

  // ── header window leans toward the pointer ─────────────────────────
  // CSS variables on one element, written once per frame. The scroll-linked
  // lean in the stylesheet uses `rotate`/`scale`, and this uses
  // `transform`, so the two compose instead of overwriting each other.
  if (!REDUCED && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.modal-screenshot').forEach(shot => {
      const win = shot.querySelector('.mw');
      if (!win) return;
      let rect = null, px = 0, py = 0, queued = false;
      const render = () => {
        queued = false;
        if (!rect) return;
        const dx = Math.max(-1, Math.min(1, (px - rect.left - rect.width / 2) / (rect.width / 2)));
        const dy = Math.max(-1, Math.min(1, (py - rect.top - rect.height / 2) / (rect.height / 2)));
        win.style.setProperty('--ry', (dx * 6).toFixed(2) + 'deg');
        win.style.setProperty('--rx', (-dy * 5).toFixed(2) + 'deg');
      };
      shot.addEventListener('pointerenter', () => { rect = shot.getBoundingClientRect(); });
      shot.addEventListener('pointermove', e => {
        px = e.clientX; py = e.clientY;
        if (!rect) rect = shot.getBoundingClientRect();
        if (!queued) { queued = true; requestAnimationFrame(render); }
      }, { passive: true });
      shot.addEventListener('pointerleave', () => {
        rect = null;
        win.style.removeProperty('--ry');
        win.style.removeProperty('--rx');
      });
    });
  }
})();
