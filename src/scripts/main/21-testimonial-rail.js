/* ═══════════════════════════════════════
   TESTIMONIAL RAIL

   A native horizontal scroll-snap row (see 49-proof-sections.css), so
   touch, trackpad, shift+wheel and the keyboard all work. The script adds:
   - an endless loop: the eleven cards are cloned once before and once
     after, and whenever scrolling settles inside a clone set the rail
     jumps silently by one set width to the matching real card. Clones
     are inert and aria-hidden, so focus and screen readers only meet the
     real eleven;
   - prev/next arrows that move by one card (never disabled, it loops);
   - a "3 / 11" counter and progress bar;
   - "Read full review" on clamped quotes, opening the quote in a dialog.

   Replaces the 12.6 KB autoplay carousel. No autoplay: a quote that
   moves while someone is reading it is a quote they do not finish.
═══════════════════════════════════════ */
function initTestiRail(){
  const rail = document.getElementById('testiRail');
  if (!rail) return;
  const prev  = document.getElementById('testiPrev');
  const next  = document.getElementById('testiNext');
  const count = document.getElementById('testiCount');
  const bar   = document.getElementById('testiBar');
  const cards = [...rail.querySelectorAll('.tq')];
  const n = cards.length;

  /* ── full-review dialog ──────────────────────────────────────────
     Opens the full quote instead of growing the card, which would
     stretch the whole row (every card in it is sized to the tallest).
     A native <dialog> with showModal(): focus trap, Escape and the top
     layer come from the browser. The project button inside is a proxy
     that closes the dialog and clicks the card's real button, because
     17-project-modals.js binds its listeners to the original buttons
     and a cloned one would do nothing. */
  const dlg = document.createElement('dialog');
  dlg.className = 'tq-dialog';
  dlg.setAttribute('aria-labelledby', 'tqDialogName');
  dlg.innerHTML = '<div class="tq-dialog-card"><button class="tq-dialog-close" type="button" aria-label="Close">&times;</button><div class="tq-dialog-body"></div></div>';
  document.body.appendChild(dlg);
  const body = dlg.querySelector('.tq-dialog-body');
  let opener = null, ownsLock = false;

  function openQuote(card, btn) {
    opener = btn;
    body.innerHTML = '';
    const top = card.querySelector('.tq-top');
    if (top) body.appendChild(top.cloneNode(true));
    body.appendChild(card.querySelector('.tq-quote').cloneNode(true));
    const author = card.querySelector('.tq-author').cloneNode(true);
    const name = author.querySelector('.tq-name');
    if (name) name.id = 'tqDialogName';
    const proj = author.querySelector('.tq-proj');
    const real = card.querySelector('.tq-proj');
    if (proj && real) {
      proj.classList.remove('btn-modal-open');
      proj.addEventListener('click', () => { opener = null; closeQuote(); real.click(); });
    }
    body.appendChild(author);
    dlg.classList.toggle('is-client', card.classList.contains('tq-client'));
    document.documentElement.classList.add('modal-open');
    ownsLock = true;
    dlg.showModal();
    dlg.querySelector('.tq-dialog-close').focus();
  }

  // Cleanup runs directly from every close path. The 'close' event only
  // backs it up for Escape: it is dispatched as a queued task, and a
  // backgrounded page may run it late, which would leave the page
  // scroll-locked in the meantime. Runs once per open: ownsLock stops the
  // late event from removing the lock a project modal has since taken
  // (the dialog's project button hands straight over to one).
  function cleanup() {
    if (!ownsLock) return;
    ownsLock = false;
    document.documentElement.classList.remove('modal-open');
    const o = opener; opener = null;
    if (o) o.focus();
  }
  function closeQuote() { if (dlg.open) dlg.close(); cleanup(); }
  dlg.addEventListener('close', cleanup);
  dlg.querySelector('.tq-dialog-close').addEventListener('click', closeQuote);
  // A click on the backdrop lands on the <dialog> itself, not the card.
  dlg.addEventListener('click', e => { if (e.target === dlg) closeQuote(); });

  // Read more only where the clamp actually cut. Added before cloning so
  // the clones look identical (their copies are inert, never clicked).
  cards.forEach(card => {
    const q = card.querySelector('.tq-quote');
    if (!q || q.scrollHeight <= q.clientHeight + 2) return;
    const btn = document.createElement('button');
    btn.className = 'tq-readmore';
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.innerHTML = 'Read full review <span aria-hidden="true">&rarr;</span>';
    btn.addEventListener('click', () => openQuote(card, btn));
    q.after(btn);
  });

  /* ── endless loop ────────────────────────────────────────────── */
  const makeClones = () => cards.map(c => {
    const k = c.cloneNode(true);
    k.setAttribute('aria-hidden', 'true');
    k.inert = true;
    k.classList.add('tq-clone');
    return k;
  });
  const before = makeClones(), after = makeClones();
  before.forEach(k => rail.insertBefore(k, cards[0]));
  after.forEach(k => rail.appendChild(k));

  // Measured live: card width changes across breakpoints.
  const stride  = () => cards[1].offsetLeft - cards[0].offsetLeft;
  const setW    = () => cards[0].offsetLeft - before[0].offsetLeft; // one set's width = scrollLeft where real card 1 sits at the start

  function jump(x) {
    rail.style.scrollBehavior = 'auto';
    rail.style.scrollSnapType = 'none';
    rail.scrollLeft = x;
    rail.offsetHeight; // flush before restoring snap, so it does not re-snap mid-jump
    rail.style.scrollSnapType = '';
    rail.style.scrollBehavior = '';
  }

  // Once scrolling settles, fold any position inside a clone set back
  // into the real set. Only on settle: jumping mid-fling would kill the
  // momentum on touch devices.
  function settle() {
    const w = setW(), x = rail.scrollLeft;
    if (x < w - 2) jump(x + w);
    else if (x >= 2 * w - 2) jump(x - w);
    update();
  }

  function update() {
    const w = setW(), s = stride();
    const pos = ((rail.scrollLeft - w) % w + w) % w;          // 0 … w within the real set
    const first = Math.round(pos / s) % n;                     // index of leftmost card
    const perView = Math.max(1, Math.round(rail.clientWidth / s));
    count.textContent = ((first + perView - 1) % n + 1) + ' / ' + n;
    bar.style.width = (Math.min(n, first + perView) / n) * 100 + '%';
  }

  prev.disabled = false;
  prev.addEventListener('click', () => rail.scrollBy({ left: -stride(), behavior: 'smooth' }));
  next.addEventListener('click', () => rail.scrollBy({ left:  stride(), behavior: 'smooth' }));

  let queued = false, idle = 0;
  rail.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); }
    // scrollend is not in every Safari yet; a short idle timer covers it.
    clearTimeout(idle);
    idle = setTimeout(settle, 140);
  }, { passive: true });
  if ('onscrollend' in window) rail.addEventListener('scrollend', () => { clearTimeout(idle); settle(); });

  // Keep the same card at the start when the width changes.
  let lastFirst = 0;
  window.addEventListener('resize', () => {
    jump(setW() + lastFirst * stride());
    update();
  });
  rail.addEventListener('scroll', () => {
    lastFirst = Math.round((((rail.scrollLeft - setW()) % setW()) + setW()) % setW() / stride()) % n;
  }, { passive: true });

  jump(setW());
  update();
}

/* Deferred until the section is near the viewport. Measuring the quotes
   and card offsets at startup forced a layout of the whole page before
   first paint had settled: about 200 ms of blocking time on PageSpeed's
   desktop run. */
(function(){
  const sec = document.getElementById('testimonials') || document.getElementById('testiRail');
  if (!sec) return;
  let started = false;
  const start = () => { if (started) return; started = true; io && io.disconnect(); initTestiRail(); };
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) start(); }, { rootMargin: '900px 0px' })
    : null;
  if (io) io.observe(sec); else start();
  // A deep link or restored scroll can land past the section.
  if (location.hash && location.hash !== '#main') start();
})();
