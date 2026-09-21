/* ═══════════════════════════════════════
   TESTIMONIAL CAROUSEL
═══════════════════════════════════════ */
/* ── INFINITE TESTIMONIAL CAROUSEL ────────────────────────────
   Strategy: clone the first and last N cards around the originals
   so the track looks like:  [last N clones | originals | first N clones]
   When the user slides into a clone we silently jump (no animation)
   back to the matching real card — making the loop feel seamless.
   `current` always refers to a position in the full cloned track.
──────────────────────────────────────────────────────────────── */
(function(){
  const track   = document.getElementById('testiTrack');
  const wrap    = document.getElementById('testiWrap');
  const prevBtn = document.getElementById('testiPrev');
  const nextBtn = document.getElementById('testiNext');
  const dotsEl  = document.getElementById('testiDots');

  const GAP  = 20;   // px — matches .testi-track gap in CSS
  const EASE = 'transform .58s cubic-bezier(.4,0,.2,1)'; // smooth Material-style ease

  let perPage    = 3;
  let isDragging = false;
  let startX     = 0;
  let dragOffset = 0;
  let autoTimer  = null;
  let _cachedCardWidth = 0; // cached to avoid getBoundingClientRect on every slide
  let _cachedPerPage   = 0; // cache key for invalidation

  // Stash all cards — origCards is the working set, filtered by testimonial type
  const allCards = Array.from(track.children);
  let origCards  = allCards.slice();
  let origTotal  = origCards.length;

  // matchMedia rather than window.innerWidth. Reading innerWidth forces the
  // browser to flush pending style and layout work before it can answer, and
  // buildTrack() calls this immediately before writing to the DOM — the
  // 2026-09-21 PageSpeed run attributed 28ms of forced reflow to exactly
  // this line. A media query list is evaluated without a layout pass.
  // Breakpoints mirror .testi-track in 11-testimonials.css.
  const MQ_ONE = window.matchMedia('(max-width: 600px)');
  const MQ_TWO = window.matchMedia('(max-width: 900px)');
  function getPerPage() {
    if (MQ_ONE.matches) return 1;
    if (MQ_TWO.matches) return 2;
    return 3;
  }

  // ── Build cloned track ──────────────────────────────────────
  // Prepend clones of the last perPage originals (for prev-wrap)
  // Append  clones of the first perPage originals (for next-wrap)
  // current starts at perPage so index 0 = first real card.
  let cloneCount = 0; // how many clones are prepended
  function buildTrack() {
    perPage = Math.min(getPerPage(), origCards.length || 1);
    track.style.setProperty('--tc-cols', perPage);

    // Wipe and re-insert originals fresh so rebuild is idempotent
    track.innerHTML = '';
    origCards.forEach(c => {
      const cl = c.cloneNode(true);
      cl.classList.add('on');
      track.appendChild(cl);
    });

    // Prepend: last perPage originals
    origCards.slice(-perPage).reverse().forEach(c => {
      const cl = c.cloneNode(true);
      cl.setAttribute('aria-hidden', 'true');
      cl.classList.add('on');
      track.insertBefore(cl, track.firstChild);
    });

    // Append: first perPage originals
    origCards.slice(0, perPage).forEach(c => {
      const cl = c.cloneNode(true);
      cl.setAttribute('aria-hidden', 'true');
      cl.classList.add('on');
      track.appendChild(cl);
    });

    cloneCount = perPage;
  }

  // ── Geometry helpers (cached) ──────────────────────────────
  function cardWidth() {
    if (_cachedPerPage !== perPage) {
      // Measured lazily, on first slide, and deliberately not hoisted into
      // buildTrack(): #testimonials carries content-visibility:auto, so
      // while the section is off-screen its subtree is not laid out and
      // this would measure 0. Hence also the width > 0 guard — caching a
      // zero would wedge the carousel for the rest of the session.
      const width = wrap.getBoundingClientRect().width;
      if (width <= 0) return _cachedCardWidth;
      _cachedCardWidth = (width - GAP * (perPage - 1)) / perPage;
      _cachedPerPage = perPage;
    }
    return _cachedCardWidth;
  }
  function offsetForIdx(idx) { return idx * (cardWidth() + GAP); }

  // ── Dot helpers ────────────────────────────────────────────
  // One dot per "page" of originals (ceil groups of perPage)
  function dotCount()    { return Math.ceil(origTotal / perPage); }
  function activeDotIdx(cur) {
    // real 0-based index into originals
    const realIdx = cur - cloneCount;
    return Math.floor(((realIdx % origTotal) + origTotal) % origTotal / perPage);
  }

  function buildDots() {
    dotsEl.innerHTML = '';
    const n = dotCount();
    for (let i = 0; i < n; i++) {
      const d = document.createElement('button');
      d.className = 'testi-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', `Slide ${i + 1}`);
      d.addEventListener('click', () => {
        goTo(cloneCount + i * perPage);
        resetAutoplay();
      });
      dotsEl.appendChild(d);
    }
    return Array.from(dotsEl.children);
  }

  function syncDots() {
    const ai = activeDotIdx(current);
    dots.forEach((d, i) => d.classList.toggle('active', i === ai));
  }

  // ── Testimonial timer reset ────────────────────────────────
  // Resets the CSS countdown bar animation on every slide change.
  const timerEl = document.getElementById('testiTimer');
  function resetTimer() {
    if (!timerEl) return;
    timerEl.classList.remove('running');
    void timerEl.offsetWidth; // force reflow to restart animation
    timerEl.classList.add('running');
  }

  // ── Core navigation ────────────────────────────────────────
  let current = 0; // index into full (cloned) track
  function goTo(idx, animate) {
    track.style.transition = animate === false ? 'none' : EASE;
    track.style.transform  = `translate3d(-${offsetForIdx(idx)}px,0,0)`;
    current = idx;
    syncDots();
    if (animate !== false) {
      resetTimer();
      // Announce slide position to screen readers via the sr-only live region
      const statusEl = document.getElementById('testi-status');
      if (statusEl) {
        const realIdx = ((idx - cloneCount) % origTotal + origTotal) % origTotal;
        statusEl.textContent = `Testimonial ${realIdx + 1} of ${origTotal}`;
      }
    }
  }

  // After an animated slide, check if we landed on a clone
  // and silently teleport to the matching real card
  track.addEventListener('transitionend', () => {
    const totalWithClones = cloneCount + origTotal + cloneCount;
    if (current >= cloneCount + origTotal) {
      // Slid into the appended clones — jump to matching real card
      const jump = current - origTotal;
      goTo(jump, false);
    } else if (current < cloneCount) {
      // Slid into the prepended clones — jump to matching real card
      const jump = current + origTotal;
      goTo(jump, false);
    }
  });

  // ── Init ───────────────────────────────────────────────────
  let dots;
  function init(keepRealIdx) {
    const realIdx = keepRealIdx || 0; // which original to land on
    buildTrack();
    dots = buildDots();
    current = cloneCount + realIdx;
    goTo(current, false);
    // Prev/next always enabled — infinite loop needs no disable
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  }
  init(0);
  resetTimer();

  // ── Testimonial filter ─────────────────────────────────────
  function filterBy(type) {
    document.querySelectorAll('.testi-filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.filter === type)
    );
    origCards = type === 'all' ? allCards.slice() : allCards.filter(c => c.dataset.type === type);
    origTotal = origCards.length;
    stopAutoplay();
    init(0);
    track.querySelectorAll('.r').forEach(el => el.classList.add('on'));
    startAutoplay();
  }
  document.querySelectorAll('.testi-filter-btn').forEach(btn =>
    btn.addEventListener('click', () => filterBy(btn.dataset.filter))
  );

  // ── Button controls ────────────────────────────────────────
  prevBtn.addEventListener('click', () => { goTo(current - 1); resetAutoplay(); });
  nextBtn.addEventListener('click', () => { goTo(current + 1); resetAutoplay(); });

  // ── Autoplay ───────────────────────────────────────────────
  function startAutoplay() {
    stopAutoplay();
    autoTimer = setInterval(() => { goTo(current + 1); }, 6000);
  }
  function stopAutoplay()  { clearInterval(autoTimer); }
  function resetAutoplay() { stopAutoplay(); startAutoplay(); }

  wrap.addEventListener('mouseenter', stopAutoplay);
  wrap.addEventListener('mouseleave', startAutoplay);
  wrap.addEventListener('focusin',    stopAutoplay);
  wrap.addEventListener('focusout',   startAutoplay);
  startAutoplay();

  // ── Drag / swipe ───────────────────────────────────────────
  wrap.addEventListener('mousedown',  e => { isDragging = true; startX = e.clientX; track.style.transition = 'none'; e.preventDefault(); });
  wrap.addEventListener('touchstart', e => { isDragging = true; startX = e.touches[0].clientX; track.style.transition = 'none'; }, { passive: true });

  function onMove(x) {
    if (!isDragging) return;
    dragOffset = x - startX;
    track.style.transform = `translate3d(${-(offsetForIdx(current) - dragOffset)}px,0,0)`;
  }
  wrap.addEventListener('mousemove', e => onMove(e.clientX));
  wrap.addEventListener('touchmove', e => onMove(e.touches[0].clientX), { passive: true });

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    if      (dragOffset < -50) goTo(current + 1);
    else if (dragOffset >  50) goTo(current - 1);
    else    goTo(current); // snap back if nudge was too small
    dragOffset = 0;
    resetAutoplay();
  }
  wrap.addEventListener('mouseup',    onEnd);
  wrap.addEventListener('mouseleave', onEnd);
  wrap.addEventListener('touchend',   onEnd);

  // ── Resize ─────────────────────────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      _cachedPerPage = 0; // invalidate cardWidth cache on resize
      // Remember which real card was leftmost before rebuild
      const realIdx = ((current - cloneCount) % origTotal + origTotal) % origTotal;
      init(realIdx);
      track.querySelectorAll('.r').forEach(el => el.classList.add('on'));
    }, 120);
  });
})();

