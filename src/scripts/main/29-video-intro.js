/* ── VIDEO INTRO MODAL (2026-10-29) ────────────────────────────
   The "Video intro" link under the hero opens the self-hosted clip in a
   native <dialog> sized to the viewport at 16:9 (width or height wins,
   whichever runs out first), so it fits phones, laptops and big
   monitors alike. The <video> is only created on the first open, so the
   page never downloads it unless asked. Without JS the link simply opens
   the MP4. Closing pauses playback and returns focus to the link.
══════════════════════════════════════ */
(function () {
  var links = document.querySelectorAll('[data-video-intro]');
  if (!links.length || typeof HTMLDialogElement !== 'function') return;

  var dlg = document.createElement('dialog');
  dlg.className = 'vi-dialog';
  dlg.setAttribute('aria-label', 'Video intro from Jonathan');
  dlg.innerHTML = '<div class="vi-frame"><button class="vi-close" type="button" aria-label="Close video">&times;</button></div>';
  document.body.appendChild(dlg);
  var frame = dlg.querySelector('.vi-frame');
  var video = null, opener = null, ownsLock = false;

  function open(e) {
    e.preventDefault();
    opener = e.currentTarget;
    if (!video) {
      video = document.createElement('video');
      video.className = 'vi-video';
      video.controls = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.poster = opener.getAttribute('data-poster') || '';
      video.src = opener.getAttribute('href');
      frame.appendChild(video);
    }
    document.documentElement.classList.add('modal-open');
    ownsLock = true;
    dlg.showModal();
    dlg.querySelector('.vi-close').focus();
    // Opened by a click, so playing with sound is allowed; if a browser
    // still refuses, the controls are right there.
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  // Same close handling as the review dialog (21-testimonial-rail.js):
  // cleanup runs directly, the late 'close' event only backs up Escape.
  function cleanup() {
    if (video) video.pause();
    if (!ownsLock) return;
    ownsLock = false;
    document.documentElement.classList.remove('modal-open');
    var o = opener; opener = null;
    if (o) o.focus();
  }
  function close() { if (dlg.open) dlg.close(); cleanup(); }
  dlg.addEventListener('close', cleanup);
  dlg.querySelector('.vi-close').addEventListener('click', close);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });

  links.forEach(function (a) {
    a.setAttribute('aria-haspopup', 'dialog');
    a.addEventListener('click', open);
  });
})();
