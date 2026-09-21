/* ═══════════════════════════════════════
   HERO PARTICLE NETWORK
═══════════════════════════════════════ */
(function(){
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles, animId;

  function resize() {
    // Match canvas pixel dimensions to its CSS display size.
    // Without this, the canvas stays at its default 300×150 and looks stretched.
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function makeParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      // Speed range: ~−0.175 to +0.175 px/frame — slow enough to feel ambient
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      // Radius range: 0.4–1.6px — tiny dots read as "data" rather than blobs
      r:  Math.random() * 1.2 + 0.4
    };
  }

  function init() {
    resize();
    // 55 particles: enough to form a visible network without over-crowding the hero.
    // Too few (< 30) and connections are sparse; too many (> 80) looks noisy.
    // Mobile gets 25 particles — halves the canvas work and saves battery.
    // Desktop gets 55 — enough for a dense-looking network.
    const COUNT = window.innerWidth < 768 ? 25 : 55;
    particles = Array.from({ length: COUNT }, makeParticle);
  }

  // ── Reactive canvas: track scroll velocity ──────────────────
  // When the user scrolls fast, particles temporarily speed up
  // (max 2× speed) then ease back — makes the hero feel alive.
  let lastScrollY  = 0;
  let scrollVelMul = 1; // current speed multiplier (lerps back to 1)
  window.addEventListener('scroll', () => {
    const delta = Math.abs(window.scrollY - lastScrollY);
    lastScrollY = window.scrollY;
    // Boost proportional to scroll speed, capped at 2×
    scrollVelMul = Math.min(1 + delta * 0.04, 2);
  }, { passive: true });

  function draw() {
    ctx.clearRect(0, 0, W, H); // wipe last frame before drawing new positions

    // Ease the speed multiplier back to 1 each frame (0.96 decay = ~0.8s to settle)
    scrollVelMul = 1 + (scrollVelMul - 1) * 0.96;

    // Move each particle and bounce off walls by flipping velocity sign
    particles.forEach(p => {
      p.x += p.vx * scrollVelMul; p.y += p.vy * scrollVelMul;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,212,255,0.55)'; // brand cyan, semi-transparent
      ctx.fill();
    });

    // Draw connecting lines between any two particles closer than 110px.
    // 110px is the sweet spot — at ~55 particles this creates ~4–8 lines per particle
    // without creating an overwhelming web. Lines fade as distance increases.
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) { // j = i+1 avoids duplicate pairs
        const dx     = particles[i].x - particles[j].x;
        const dy     = particles[i].y - particles[j].y;
        const distSq = dx * dx + dy * dy;

        // Compare squared distance first — avoids expensive Math.sqrt on every pair
        if (distSq < 12100) { // 110² = 12100
          const dist = Math.sqrt(distSq); // only compute sqrt when actually drawing
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          // Opacity scales from 0.12 (close) down to 0 (at max distance).
          // 0.12 max keeps lines subtle — they're decoration, not focus
          ctx.strokeStyle = `rgba(0,212,255,${0.12 * (1 - dist / 110)})`;
          ctx.lineWidth   = 0.5;
          ctx.stroke();
        }
      }
    }

    animId = requestAnimationFrame(draw); // schedule next frame (~60fps)
  }

  // Re-sync canvas size when window resizes (responsive layout changes hero dimensions)
  window.addEventListener('resize', () => { resize(); });

  // Stop the animation loop when tab is hidden — saves CPU/battery.
  // Resume when the user comes back to the tab.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else draw();
  });

  init();
  draw();
})();

