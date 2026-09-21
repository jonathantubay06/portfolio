/* ═══════════════════════════════════════
   HERO MOUSE PARALLAX
═══════════════════════════════════════ */
const orbit1 = document.querySelector('.orbit-1');
const orbit2 = document.querySelector('.orbit-2');
// t = target (where the mouse is), c = current (where the element is)
// They are different because we lerp toward the target instead of snapping to it
let tX = 0, tY = 0, cX = 0, cY = 0, rafId = null;

document.addEventListener('mousemove', e => {
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;

  // Normalise to −1..+1, where 0,0 is screen center
  tX = (e.clientX - cx) / cx;
  tY = (e.clientY - cy) / cy;
}, { passive: true });

function parallaxLoop() {
  // Linear interpolation (lerp): cX moves 6% closer to tX each frame.
  // 0.06 creates a smooth lag — the orbs follow the mouse with a slight delay,
  // which gives weight and depth. Higher values (e.g. 0.2) feel snappy/cheap;
  // lower (e.g. 0.02) feel too floaty.
  cX += (tX - cX) * 0.06;
  cY += (tY - cY) * 0.06;

  // orbit1 and orbit2 move in opposite directions and at different scales
  // to create a sense of depth (parallax layers)
  if (orbit1) orbit1.style.transform = `rotate(${cX * 12}deg) translate(${cX * 14}px,${cY * 14}px)`;
  if (orbit2) orbit2.style.transform = `rotate(${cY * -8}deg) translate(${cX * -10}px,${cY * -10}px)`;

  rafId = requestAnimationFrame(parallaxLoop); // continuous loop at ~60fps
}
// The orbit rings were removed with the old hero stack. Without this
// guard the loop still ran ~60fps doing nothing.
if (orbit1 || orbit2) parallaxLoop();

// Pause when tab is hidden — no point running a loop nobody can see
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelAnimationFrame(rafId);
  else if (orbit1 || orbit2) parallaxLoop();
});

