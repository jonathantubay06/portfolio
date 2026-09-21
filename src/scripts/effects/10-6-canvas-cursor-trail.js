/* ── 6. CANVAS CURSOR TRAIL ────────────────
   Single <canvas> overlay renders a particle
   trail behind the cursor — no DOM nodes, no
   CSS animation conflicts, one rAF loop.
   Particles spawn at cursor, drift outward
   with random velocity, fade+shrink over 800ms.
   Skipped on touch devices.
   Pauses when cursor is idle (same idleFrames
   counter shared with the cursor ring loop).
══════════════════════════════════════ */
(function(){
  // Disabled 2026-09-21. The design audit scored cursor effects under
  // "unobtrusive"; this ran a permanent requestAnimationFrame loop following
  // the pointer purely for decoration. Kept rather than deleted so it can be
  // restored if wanted.
  return;

  if (PREFERS_REDUCED_MOTION) return; // decorative motion only — nothing here carries content
  if (window.matchMedia('(hover: none)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'trailCanvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const particles = [];
  const MAX = 60; // hard cap to prevent memory leaks
  let mx = -100, my = -100;
  let spawnTimer = 0;
  let idleFrames = 0; // for idle detection (was shared with cursor ring)
  const SPAWN_MS = 25; // spawn a particle every 25ms (~40/sec at full speed)

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    idleFrames = 0;
  }, { passive: true });

  (function loop(ts) {
    requestAnimationFrame(loop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Spawn new particles when cursor is active
    if (idleFrames < 120) {
      spawnTimer += 16; // ~60fps delta
      while (spawnTimer >= SPAWN_MS && particles.length < MAX) {
        particles.push({
          x: mx, y: my,
          vx: (Math.random() - .5) * 1.8,
          vy: (Math.random() - .5) * 1.8 - 1.2, // bias upward
          life: 1,
          size: 1.5 + Math.random() * 3,
        });
        spawnTimer -= SPAWN_MS;
      }
    }
    spawnTimer = Math.min(spawnTimer, SPAWN_MS);
    idleFrames++;

    // Update + render particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= .015; // fade over ~67 frames (~1.1s)

      if (p.life <= 0) { particles.splice(i, 1); continue; }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,212,255,${(p.life * .45).toFixed(2)})`;
      ctx.fill();
    }
  })();
})();


