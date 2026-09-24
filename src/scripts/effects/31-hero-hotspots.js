/* ── 31. HERO CUBE HOTSPOTS ───────────────────────────────────
   The three cubes in the render (cart, gear, database) are links. Each
   .hs hotspot shows a copy of its patch of the plate, so it can lift out
   of the picture on hover (CSS in 52-banger.css). That copy must be the
   same file the <img> actually loaded (the <picture> picks 720w, 930w
   or 1500w by screen), or the patch would be a different resolution
   from what surrounds it and, worse, a second download. So the URL is
   read from img.currentSrc once it is known.

   A one-time hint: a few seconds after load the cubes pulse once, so a
   visitor learns they can be clicked without being nagged.
══════════════════════════════════════ */
(function(){
  const scene = document.getElementById('heroScene');
  const img = scene && scene.querySelector('.hero-plate');
  if (!scene || !img || !scene.querySelector('.hs')) return;

  let done = false;
  function apply() {
    const src = img.currentSrc;
    if (done || !src || src.startsWith('data:')) return; // phone placeholder: wait for the real plate
    done = true;
    scene.style.setProperty('--plate-src', 'url("' + src + '")');
    scene.classList.add('hs-ready');
    if (!PREFERS_REDUCED_MOTION) {
      setTimeout(() => {
        scene.classList.add('hs-hint');
        setTimeout(() => scene.classList.remove('hs-hint'), 2200);
      }, 3200);
    }
  }
  img.addEventListener('load', apply);
  if (img.complete && img.currentSrc) apply();

  // Phones: the render sits under the copy, below the fold, so it must not
  // compete with the first paint. The <picture> gives phones a 1x1 GIF at
  // load; once the page has finished loading, the phone source is pointed
  // at the small plates (14 KB at 1x, 38 KB at 2x) and the render appears.
  const phone = scene.querySelector('source[data-phone]');
  if (phone) {
    const swap = () => { phone.srcset = phone.dataset.phone; };
    if (document.readyState === 'complete') swap();
    else window.addEventListener('load', swap, { once: true });
  }
})();
