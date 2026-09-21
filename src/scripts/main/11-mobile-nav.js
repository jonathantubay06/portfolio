/* ═══════════════════════════════════════
   MOBILE NAV
═══════════════════════════════════════ */
const toggle = document.getElementById('navToggle');
const drawer = document.getElementById('navDrawer');

toggle.addEventListener('click', () => {
  const open = drawer.classList.toggle('open');
  toggle.classList.toggle('open', open); // syncs hamburger → X animation in CSS
  toggle.setAttribute('aria-expanded', open);       // screen reader: is menu open?
  drawer.setAttribute('aria-hidden', !open);         // screen reader: hide drawer when closed
});

function closeNav() {
  drawer.classList.remove('open');
  toggle.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  drawer.setAttribute('aria-hidden', 'true');
  toggle.focus(); // return focus to the toggle button (WCAG keyboard nav requirement)
}
// Wire drawer links to close nav on click — no inline handlers needed
document.querySelectorAll('#navDrawer a').forEach(a => a.addEventListener('click', closeNav));

/* Close drawer on Escape key — standard UX pattern for modal/overlay menus */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && drawer.classList.contains('open')) closeNav();
});

