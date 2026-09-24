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

  function apply() {
    const src = img.currentSrc;
    if (!src || src.startsWith('data:')) return;        // phones get a 1x1 GIF: no hotspots there
    scene.style.setProperty('--plate-src', 'url("' + src + '")');
    scene.classList.add('hs-ready');
    if (!PREFERS_REDUCED_MOTION) {
      setTimeout(() => {
        scene.classList.add('hs-hint');
        setTimeout(() => scene.classList.remove('hs-hint'), 2200);
      }, 3200);
    }
  }
  if (img.complete && img.currentSrc) apply();
  else img.addEventListener('load', apply, { once: true });
})();
