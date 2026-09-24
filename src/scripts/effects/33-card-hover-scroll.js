/* ── 33. PROJECT CARDS — SCROLL THE REAL SITE ON HOVER ─────────
   Hovering a project card scrolls the page inside its browser window
   from top to bottom, so a visitor sees a whole site, not one screen.

   The full-page captures (img/scroll-*.webp, 720px wide, up to 8
   screens tall, ~100-250 KB each) are only fetched the first time a card
   is hovered, so they cost nothing for anyone who does not hover. Once
   decoded the layer gets .is-ready and CSS does the rest: the background
   glides from top to bottom while hovered, and back up on leave. The
   glide time scales with the capture's length (--dur), so long pages do
   not rush and short ones do not crawl.

   Mouse/trackpad only: touch has no hover, and the details modal shows
   the site there.
══════════════════════════════════════ */
(function(){
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('.ss-scroll[data-src]').forEach(layer => {
    const card = layer.closest('.proj-card');
    if (!card) return;
    let started = false;
    card.addEventListener('pointerenter', () => {
      if (started) return;
      started = true;
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const ratio = img.naturalHeight / img.naturalWidth;   // 720 wide, so ~1.2 per screen
        const dur = Math.min(14, Math.max(4, ratio * 1.6));
        layer.style.setProperty('--dur', dur.toFixed(1) + 's');
        layer.style.backgroundImage = 'url("' + img.src + '")';
        layer.classList.add('is-ready');
      };
      img.src = layer.dataset.src;
    });
  });
})();
