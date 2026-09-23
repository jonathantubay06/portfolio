/* ── 29. TECH STACK MARQUEE — scroll-reactive ─────────────────
   A flat logo row that fades in on the left and out on the right (the
   mask on .built-marquee in 06-section-shared.css). Driven by JS so it
   can react to the reader:
   - a steady drift;
   - page scroll adds speed, and scrolling up runs the row the other way;
   - hover eases the row to a stop so a logo can be read (the hovered
     tile lifts in CSS).

   A first version also wrapped the row round a 3D drum, turning and
   shrinking logos toward the edges. At the edges that read as squashed,
   unreadable logos rather than depth, so it was taken out (2026-09-24)
   in favour of the plain edge fade.

   One transform per frame on the track, no layout reads per frame, and
   the loop only runs while the strip is on screen. Skipped for reduced
   motion (CSS shows a static wrapped row) and when JS is off (the CSS
   keyframe marquee keeps running).
══════════════════════════════════════ */
(function(){
  const track = document.getElementById('builtTrack');
  if (!track || PREFERS_REDUCED_MOTION) return;
  const marquee = track.parentElement;
  const items = [...track.children].filter(el => el.classList.contains('built-item'));
  if (!items.length) return;

  marquee.classList.add('is-js');         // turns off the CSS keyframe marquee

  const BASE_SPEED = 38;                   // px per second
  let setW = 0;
  let offset = 0, speed = BASE_SPEED, target = BASE_SPEED, dir = 1;
  let lastY = window.scrollY, last = 0, raf = null, visible = false, hovering = false;

  function measure() {
    setW = track.scrollWidth / 2;          // markup holds the set twice
  }

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, .05) : 0;
    last = now;

    // Scroll adds speed in the scroll direction, then decays to the drift.
    const dy = window.scrollY - lastY;
    lastY = window.scrollY;
    if (dy) { dir = dy > 0 ? 1 : -1; target = BASE_SPEED + Math.min(Math.abs(dy) * 22, 900); }
    else target += (BASE_SPEED - target) * .06;
    if (hovering) target = 0;
    speed += (target - speed) * .12;

    offset = (offset + dir * speed * dt) % setW;
    if (offset < 0) offset += setW;
    track.style.transform = 'translate3d(' + (-offset).toFixed(2) + 'px,0,0)';

    raf = visible ? requestAnimationFrame(frame) : null;
  }

  function start() { if (!raf) { last = 0; lastY = window.scrollY; raf = requestAnimationFrame(frame); } }

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible) start();
  }, { rootMargin: '100px 0px' }).observe(marquee);

  marquee.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hovering = true; });
  marquee.addEventListener('pointerleave', () => { hovering = false; });

  measure();
  window.addEventListener('resize', measure);
  // Web fonts change the label widths once they land.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
