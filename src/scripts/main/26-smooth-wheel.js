/* ═══════════════════════════════════════
   SMOOTH WHEEL SCROLL (draft 2026-10-20)
   The weighted, gliding scroll of sophie-dv.netlify.app, without a library:
   mouse-wheel input sets a target and the page eases toward it each frame.
   Only the wheel is taken over; keyboard, scrollbar drag, touch, anchor
   links and find-in-page stay native, and the eased position re-syncs to
   wherever they leave the page. Desktop with a fine pointer only, never
   with reduced motion, and wheel events inside scrollable panels, modals
   or with ctrl (zoom) pass through untouched.
═══════════════════════════════════════ */
(function () {
  var gate = matchMedia('(min-width:901px) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  if (!gate.matches || document.documentElement.classList.contains('quick')) return;
  var root = document.documentElement;
  root.classList.add('smooth-wheel');
  var target = scrollY, pos = scrollY, raf = 0;

  function scrollable(el) {
    for (; el && el !== document.body; el = el.parentElement) {
      if (el.matches('dialog, .proj-modal, .fan-card, [data-native-scroll]')) return true;
      var s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) return true;
    }
    return false;
  }
  function max() { return root.scrollHeight - innerHeight; }

  addEventListener('wheel', function (e) {
    if (!gate.matches || e.ctrlKey || e.defaultPrevented || scrollable(e.target)) return;
    if (document.querySelector('.proj-modal.open, dialog[open]')) return;
    e.preventDefault();
    if (!raf) { target = pos = scrollY; }
    var dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    target = Math.max(0, Math.min(max(), target + dy));
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: false });

  function step() {
    pos += (target - pos) * 0.11;
    if (Math.abs(target - pos) < 0.5) pos = target;
    scrollTo(0, pos);
    raf = pos === target ? 0 : requestAnimationFrame(step);
  }

  /* any scroll we did not cause (keys, scrollbar, anchor jump) wins */
  addEventListener('scroll', function () {
    if (Math.abs(scrollY - pos) < 2) return;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    target = pos = scrollY;
  }, { passive: true });
})();
