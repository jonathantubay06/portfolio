/* ═══════════════════════════════════════
   GLITCH AUTO-FIRE (every 5s)
═══════════════════════════════════════ */
(function(){
  const name = document.querySelector('.glitch-name');
  if (!name) return;

  setInterval(() => {
    // Add the glitch class to trigger the CSS animation, then remove it after
    // 600ms so it can fire again. Without removal the class stays and the
    // animation only plays once (CSS animations don't replay on the same class).
    name.classList.add('glitch-auto');
    setTimeout(() => name.classList.remove('glitch-auto'), 600); // 600ms = animation duration in CSS
  }, 3000); // Every 3s — zaps frequently enough to feel alive
})();

