'use strict';
/* ═══════════════════════════════════════════════════════════════
   main.js — Jonathan Tubay Portfolio
   Critical interactive functionality — runs on DOMContentLoaded.
   ─────────────────────────────────────────────────────────────
   RESPONSIBILITIES (in order of appearance)
    1.  Dark / Light theme toggle
        Persists choice in localStorage; dark is the default.
        CSS vars on <html data-theme="light"> drive every colour.

    2.  Typing role animation
        Hero subtitle cycles through job titles using a typewriter
        loop with erase-and-retype logic.

    3.  Hero particle network
        Canvas element behind the hero: 55 slow-moving dots
        connected by fading lines when closer than 110px.

    4.  Glitch auto-fire
        Adds/removes .glitch-auto on the name every 3s to
        retrigger the CSS glitch keyframe animation.

    5.  Project card 3D tilt
        mousemove → perspective(700px) rotateX/Y based on
        cursor offset from card centre. rAF-safe, resets on leave.

    6.  Portfolio filter tabs
        "All / Shopify / WordPress / Tools" — toggles .hidden on
        cards by matching their data-category attribute.

    7.  Back-to-top button
        Smooth scroll to 0; visibility toggled at 400px scroll.

    8.  Scroll handler (single rAF-throttled listener)
        Updates: progress bar width, back-to-top ring dashoffset,
        back-to-top visibility, nav .scrolled class.

    9.  Hero stat counter animation
        Numbers count up from 0 when the stat strip scrolls into
        view. Ease-out cubic. One-shot via IntersectionObserver.

   10.  Hero mouse parallax
        Two orbit rings (orbit-1, orbit-2) lerp-follow the cursor
        in opposite directions to create a depth illusion.

   11.  Mobile nav
        Hamburger → X animation; drawer open/close; Escape key;
        focus management for WCAG keyboard nav.

   12.  Contact form — 2-stage
        toggleForm() collapses/expands Stage 2 via max-height
        CSS transition. Nav CTA also opens it via scroll + delay.

   13.  Form submit + inline validation
        Client-side name/email check → Netlify POST fetch.
        Success/error feedback on the submit button.

   14.  Testimonial carousel
        Drag + touch swipe, autoplay every 6s, responsive
        per-page count (1/2/3), dot navigation, keyboard arrows.

   15.  Scroll reveal
        IntersectionObserver adds .on to .r elements as they
        enter the viewport. Cards observed individually so they
        stagger naturally rather than all at once.

   16.  Dynamic footer year
        Automatically shows current year — no manual updates.

   17.  Project modals
        Open/close by card button, backdrop click, or Escape.
        Body scroll locked while modal is open.
   ─────────────────────────────────────────────────────────────
   SPLIT: effects.js handles all purely visual enhancements
   (cursor trail, spotlight, tokens, world clock, easter egg, etc.)
   and is loaded with `defer` so it never blocks first paint.
═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════
   DARK / LIGHT THEME TOGGLE — minimal SVG
═══════════════════════════════════════ */
(function(){
  const btn  = document.getElementById('themeToggle');
  const root = document.documentElement; // <html> — data-theme attribute lives here
  const saved = localStorage.getItem('jt-theme'); // persist user's last choice across sessions

  // Inline SVGs so no external icon library is needed and no network request is made
  const sunSVG  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="5.64" y1="5.64" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="18.36" y2="18.36"/><line x1="5.64" y1="18.36" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="18.36" y2="5.64"/></svg>`;
  const moonSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

  const apply = theme => {
    // Dark mode is the default — no attribute needed. Light mode is the opt-in,
    // so we only SET the attribute for light and REMOVE it to go back to dark.
    // This means all CSS default values are dark, and [data-theme="light"] overrides them.
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');

    // Show the opposite icon — if you're in light mode, offer the moon (go dark)
    btn.innerHTML = theme === 'light' ? moonSVG : sunSVG;
    btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  };

  apply(saved || 'dark'); // fall back to dark if nothing is saved yet

  btn.addEventListener('click', () => {
    // Toggle: if the attribute exists we're in light mode, clicking goes dark, and vice versa
    const next = root.hasAttribute('data-theme') ? 'dark' : 'light';
    localStorage.setItem('jt-theme', next); // remember choice for next visit
    apply(next);
  });
})();

/* ═══════════════════════════════════════
   TYPING ROLE ANIMATION
═══════════════════════════════════════ */
(function(){
  const el = document.getElementById('typingRole');
  if (!el) return; // guard — safe exit if element doesn't exist

  const roles = ['eCommerce Builder', 'Automation Specialist', 'Ops Tech Lead', 'Shopify Developer', 'Workflow Automator'];
  let roleIdx = 0, charIdx = 0, deleting = false;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = roles[0];
    return;
  }

  function type() {
    const word = roles[roleIdx];

    if (!deleting) {
      // Add one character at a time by slicing the string to an increasing length
      el.textContent = word.slice(0, ++charIdx);

      if (charIdx === word.length) {
        // Fully typed — pause for 2.2s so the reader can see it before backspacing
        deleting = true;
        setTimeout(type, 2200);
        return;
      }
    } else {
      // Remove one character at a time
      el.textContent = word.slice(0, --charIdx);

      if (charIdx === 0) {
        // Fully deleted — advance to the next role (wraps around with modulo)
        deleting = false;
        roleIdx = (roleIdx + 1) % roles.length;
      }
    }

    // Deleting is faster (40ms) than typing (85ms) — feels more natural,
    // backspacing reads as quicker/less deliberate than forward typing
    setTimeout(type, deleting ? 40 : 85);
  }

  type(); // kick off the loop
})();

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

/* ═══════════════════════════════════════
   PROJECT CARD 3D TILT
═══════════════════════════════════════ */
document.querySelectorAll('.proj-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();

    // Normalise mouse position to −1..+1 relative to card center.
    // dx = -1 means far left, +1 means far right
    const dx = (e.clientX - rect.left  - rect.width  / 2) / (rect.width  / 2);
    const dy = (e.clientY - rect.top   - rect.height / 2) / (rect.height / 2);

    // perspective(700px): lower = more dramatic 3D. 700px gives a subtle but
    // visible depth without distorting text readability.
    // 7deg max rotation: noticeable tilt without making content hard to read.
    // -dy for rotateX so moving mouse UP tilts the top toward you (natural direction).
    card.style.transform  = `perspective(700px) rotateY(${dx * 7}deg) rotateX(${-dy * 7}deg) translateY(-8px) scale(1.02)`;

    // Shadow offsets mirror the tilt — shadow "falls away" from where mouse is,
    // reinforcing the 3D illusion
    card.style.boxShadow  = `${-dx * 8}px ${-dy * 8}px 30px rgba(0,212,255,0.12)`;
  });

  card.addEventListener('mouseleave', () => {
    // Reset to neutral — empty string removes the inline style and lets CSS take over
    card.style.transform = '';
    card.style.boxShadow = '';
  });
});

/* ═══════════════════════════════════════
   PORTFOLIO FILTERS
═══════════════════════════════════════ */
// Cache selectors once — no need to re-query the DOM on every filter click
const pfBtns  = document.querySelectorAll('.pf-btn');
const pfCards = document.querySelectorAll('.proj-card');

pfBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    pfBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;

    pfCards.forEach((card, i) => {
      const matches = filter === 'all' || card.dataset.category === filter;

      if (!matches) {
        /* ── Hide: animate out, then add .hidden after animation ── */
        if (!card.classList.contains('hidden')) {
          card.classList.add('filter-out');
          // Wait for the 200ms out-animation before truly hiding
          setTimeout(() => {
            card.classList.add('hidden');
            card.classList.remove('filter-out');
          }, 220);
        }
      } else {
        /* ── Show: remove hidden, then animate in with stagger ── */
        card.classList.remove('hidden', 'filter-out');
        card.classList.remove('filter-in'); // reset so re-clicking replays
        // Force reflow so the animation replays from scratch
        void card.offsetWidth;
        // Stagger: each visible card enters 50ms after the previous
        setTimeout(() => card.classList.add('filter-in'), i * 50 + 50);
      }
    });
  });
});

/* ═══════════════════════════════════════
   BACK TO TOP
═══════════════════════════════════════ */
const backToTop = document.getElementById('back-to-top');
backToTop.addEventListener('click', e => {
  e.preventDefault(); // prevent the href="#" from jumping the URL hash
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ═══════════════════════════════════════
   SCROLL — single throttled handler (perf)
═══════════════════════════════════════ */
const scrollBar = document.getElementById('scroll-bar');
const navEl     = document.querySelector('nav');
let scrollTicking = false; // flag prevents queueing multiple rAF calls per scroll event

function onScroll() {
  // Throttle: if we already have a rAF queued, skip this scroll event.
  // This ensures we process at most one update per animation frame (~60/s),
  // not one per scroll event (can be hundreds per second on fast trackpads).
  if (scrollTicking) return;
  scrollTicking = true;

  requestAnimationFrame(() => {
    const sy        = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    // Progress bar: what % of the page has been scrolled
    const pct = maxScroll > 0 ? (sy / maxScroll) * 100 : 0;
    scrollBar.style.width = pct + '%';

    // Back-to-top ring: fill the SVG circle based on scroll progress
    // circumference = 2π × r18 ≈ 113.1 — dashoffset 113.1 = empty, 0 = full
    const bttRing = document.querySelector('.btt-progress');
    if (bttRing) bttRing.style.strokeDashoffset = (113.1 * (1 - pct / 100)).toFixed(2);

    // Show back-to-top button only after scrolling 400px — any earlier and it
    // overlaps hero content before the user needs it
    backToTop.classList.toggle('visible', sy > 400);

    // Add .scrolled class to nav after 60px — triggers background blur/opacity
    // change so nav text stays readable over page content
    navEl.classList.toggle('scrolled', sy > 60);

    scrollTicking = false; // allow next scroll event to queue another rAF
  });
}
window.addEventListener('scroll', onScroll, { passive: true }); // passive = no preventDefault, allows browser scroll optimisations

/* ═══════════════════════════════════════
   HERO STAT COUNTER ANIMATION
═══════════════════════════════════════ */
function animateCounter(el, target, duration) {
  const isNum  = /\d/.test(target);       // guard: skip if no digit found
  const num    = parseInt(target);         // extract the numeric part
  const suffix = target.replace(/[0-9]/g, ''); // keep the suffix (e.g. '+', 'k', '%')
  if (!isNum) return;

  const start = performance.now(); // high-res timestamp for smooth easing

  function tick(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1); // 0 → 1 over `duration` ms

    // Ease-out cubic: starts fast, slows near the end — feels more satisfying
    // than linear because the number "settles" into its final value.
    // Formula: 1 - (1 - t)^3 gives strong deceleration in the last 30%
    const eased = 1 - Math.pow(1 - progress, 3);

    el.textContent = Math.floor(eased * num) + suffix;
    if (progress < 1) requestAnimationFrame(tick); // keep going until done
  }

  requestAnimationFrame(tick);
}

const statNums    = document.querySelectorAll('.stat-num');
let countersRun   = false; // one-shot flag — counters should only animate once

const counterIO = new IntersectionObserver(entries => {
  // threshold:0.5 — wait until the stat strip is half-visible before starting,
  // so the numbers don't finish counting before the user even sees them
  if (entries[0].isIntersecting && !countersRun) {
    countersRun = true; // mark done so repeated scrolling doesn't re-trigger
    statNums.forEach(el => {
      const val = el.textContent.trim();
      if (/\d/.test(val)) animateCounter(el, val, 1800); // 1800ms feels punchy but readable
    });
  }
}, { threshold: 0.5 });

// Observe the parent strip — watching a single element is cheaper than watching all stat-nums
if (statNums.length) counterIO.observe(statNums[0].closest('.stat-strip') || statNums[0]);

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
parallaxLoop();

// Pause when tab is hidden — no point running a loop nobody can see
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelAnimationFrame(rafId);
  else parallaxLoop();
});

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

/* ═══════════════════════════════════════
   CONTACT FORM — 2-STAGE
═══════════════════════════════════════ */
function toggleForm() {
  const wrap = document.getElementById('stage2');
  const btn  = document.getElementById('startBtn');
  const open = wrap.classList.toggle('open'); // CSS handles the expand/collapse animation

  btn.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open);
  // Unicode arrows: ↑ (U+2191) when open so user knows clicking collapses it
  const arr = btn.querySelector('.arr');
  btn.textContent = open ? 'Hide form ' : 'Send a message ';
  arr.textContent = open ? '\u2191' : '\u2193';
  btn.appendChild(arr);

  if (open) {
    // Small delay (160ms) lets the CSS transition start before scrolling,
    // so the form is visually expanding while scrolling into view
    setTimeout(() => wrap.scrollIntoView({ behavior: 'smooth', block: 'start' }), 160);
  }
}
const startBtn = document.getElementById('startBtn');
if (startBtn) startBtn.addEventListener('click', toggleForm);

/* Nav CTA also opens form — clicking "Hire Me" in the nav scrolls to contact
   AND opens the form panel if it isn't already open */
document.getElementById('navCta').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });

  const wrap = document.getElementById('stage2');
  if (!wrap.classList.contains('open')) {
    // 520ms delay — wait for the smooth-scroll to near the section before opening,
    // so both animations don't fight each other visually
    setTimeout(toggleForm, 520);
  }
});

/* ═══════════════════════════════════════
   FORM SUBMIT + INLINE VALIDATION
═══════════════════════════════════════ */
function handleSubmit(e) {
  e.preventDefault(); // stop native browser form submission
  const form = e.target;
  const btn  = form.querySelector('button[type="submit"]');
  const orig = btn.textContent; // save original label to restore after success/error

  /* Quick client-side validation — show errors before even hitting the network */
  const nameField  = form.querySelector('#f-name');
  const emailField = form.querySelector('#f-email');
  let valid = true;

  if (!nameField.value.trim()) {
    showFieldError(nameField, 'Please enter your name');
    valid = false;
  } else {
    clearFieldError(nameField);
  }

  // .validity.valid uses the browser's built-in email format check (RFC 5322-ish)
  if (!emailField.value.trim() || !emailField.validity.valid) {
    showFieldError(emailField, 'Please enter a valid email');
    valid = false;
  } else {
    clearFieldError(emailField);
  }

  if (!valid) return; // stop here — don't submit until fields are fixed

  /* Disable button during submit to prevent double-sending */
  btn.disabled    = true;
  btn.textContent = 'Sending...';

  // Netlify forms: POST to '/' with URL-encoded body — Netlify intercepts this
  // server-side before the response comes back. The form needs data-netlify="true" in HTML.
  const formData = new FormData(form);
  fetch('/', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams(formData).toString()
  })
  .then(res => {
    if (!res.ok) throw new Error('Network response was not ok');
  })
  .then(() => {
    btn.textContent   = 'Message Sent! \u2713'; // ✓ checkmark
    btn.style.background = 'linear-gradient(135deg,#27c984,#00d4ff)'; // success green-to-cyan

    // Reset after 3.5s — long enough to read the success state, not so long it feels stuck
    setTimeout(() => {
      btn.textContent      = orig;
      btn.style.background = '';
      btn.disabled         = false;
      form.reset();
    }, 3500);
  })
  .catch(() => {
    // Something went wrong — re-enable so user can try again
    btn.textContent = 'Error \u2014 try again'; // — em dash
    btn.disabled    = false;
  });
}
const contactForm = document.querySelector('.c-form');
if (contactForm) contactForm.addEventListener('submit', handleSubmit);

function showFieldError(field, msg) {
  // Re-use existing error span if present, or create a new one
  let err = field.parentElement.querySelector('.field-error');
  if (!err) {
    err           = document.createElement('span');
    err.className = 'field-error';
    field.parentElement.appendChild(err);
  }
  err.textContent = msg;
  err.classList.add('visible');
  field.style.borderColor = '#ff4d6a'; // red border to visually flag the problem field
}

function clearFieldError(field) {
  const err = field.parentElement.querySelector('.field-error');
  if (err) { err.classList.remove('visible'); err.textContent = ''; }
  field.style.borderColor = ''; // revert to CSS default
}

/* Clear error as soon as user starts typing — immediate positive feedback */
document.querySelectorAll('.c-form input').forEach(input => {
  input.addEventListener('input', () => clearFieldError(input));
});

/* Validate on blur — gives early feedback before the user hits submit */
document.querySelectorAll('.c-form input[required]').forEach(input => {
  input.addEventListener('blur', () => {
    if (!input.value.trim()) {
      showFieldError(input, input.type === 'email' ? 'Please enter a valid email' : 'Please enter your name');
    } else if (input.type === 'email' && !input.validity.valid) {
      showFieldError(input, 'Please enter a valid email');
    }
  });
});

/* ═══════════════════════════════════════
   TESTIMONIAL CAROUSEL
═══════════════════════════════════════ */
/* ── INFINITE TESTIMONIAL CAROUSEL ────────────────────────────
   Strategy: clone the first and last N cards around the originals
   so the track looks like:  [last N clones | originals | first N clones]
   When the user slides into a clone we silently jump (no animation)
   back to the matching real card — making the loop feel seamless.
   `current` always refers to a position in the full cloned track.
──────────────────────────────────────────────────────────────── */
(function(){
  const track   = document.getElementById('testiTrack');
  const wrap    = document.getElementById('testiWrap');
  const prevBtn = document.getElementById('testiPrev');
  const nextBtn = document.getElementById('testiNext');
  const dotsEl  = document.getElementById('testiDots');

  const GAP  = 20;   // px — matches .testi-track gap in CSS
  const EASE = 'transform .58s cubic-bezier(.4,0,.2,1)'; // smooth Material-style ease

  let perPage    = 3;
  let isDragging = false;
  let startX     = 0;
  let dragOffset = 0;
  let autoTimer  = null;

  // Stash all cards — origCards is the working set, filtered by testimonial type
  const allCards = Array.from(track.children);
  let origCards  = allCards.slice();
  let origTotal  = origCards.length;

  function getPerPage() {
    if (window.innerWidth <= 600) return 1;
    if (window.innerWidth <= 900) return 2;
    return 3;
  }

  // ── Build cloned track ──────────────────────────────────────
  // Prepend clones of the last perPage originals (for prev-wrap)
  // Append  clones of the first perPage originals (for next-wrap)
  // current starts at perPage so index 0 = first real card.
  let cloneCount = 0; // how many clones are prepended
  function buildTrack() {
    perPage = Math.min(getPerPage(), origCards.length || 1);
    track.style.setProperty('--tc-cols', perPage);

    // Wipe and re-insert originals fresh so rebuild is idempotent
    track.innerHTML = '';
    origCards.forEach(c => {
      const cl = c.cloneNode(true);
      cl.classList.add('on');
      track.appendChild(cl);
    });

    // Prepend: last perPage originals
    origCards.slice(-perPage).reverse().forEach(c => {
      const cl = c.cloneNode(true);
      cl.setAttribute('aria-hidden', 'true');
      cl.classList.add('on');
      track.insertBefore(cl, track.firstChild);
    });

    // Append: first perPage originals
    origCards.slice(0, perPage).forEach(c => {
      const cl = c.cloneNode(true);
      cl.setAttribute('aria-hidden', 'true');
      cl.classList.add('on');
      track.appendChild(cl);
    });

    cloneCount = perPage;
  }

  // ── Geometry helpers ───────────────────────────────────────
  function cardWidth() {
    return (wrap.getBoundingClientRect().width - GAP * (perPage - 1)) / perPage;
  }
  function offsetForIdx(idx) { return idx * (cardWidth() + GAP); }

  // ── Dot helpers ────────────────────────────────────────────
  // One dot per "page" of originals (ceil groups of perPage)
  function dotCount()    { return Math.ceil(origTotal / perPage); }
  function activeDotIdx(cur) {
    // real 0-based index into originals
    const realIdx = cur - cloneCount;
    return Math.floor(((realIdx % origTotal) + origTotal) % origTotal / perPage);
  }

  function buildDots() {
    dotsEl.innerHTML = '';
    const n = dotCount();
    for (let i = 0; i < n; i++) {
      const d = document.createElement('button');
      d.className = 'testi-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', `Slide ${i + 1}`);
      d.addEventListener('click', () => {
        goTo(cloneCount + i * perPage);
        resetAutoplay();
      });
      dotsEl.appendChild(d);
    }
    return Array.from(dotsEl.children);
  }

  function syncDots() {
    const ai = activeDotIdx(current);
    dots.forEach((d, i) => d.classList.toggle('active', i === ai));
  }

  // ── Testimonial timer reset ────────────────────────────────
  // Resets the CSS countdown bar animation on every slide change.
  const timerEl = document.getElementById('testiTimer');
  function resetTimer() {
    if (!timerEl) return;
    timerEl.classList.remove('running');
    void timerEl.offsetWidth; // force reflow to restart animation
    timerEl.classList.add('running');
  }

  // ── Core navigation ────────────────────────────────────────
  let current = 0; // index into full (cloned) track
  function goTo(idx, animate) {
    track.style.transition = animate === false ? 'none' : EASE;
    track.style.transform  = `translateX(-${offsetForIdx(idx)}px)`;
    current = idx;
    syncDots();
    if (animate !== false) {
      resetTimer();
      // Announce slide position to screen readers via the sr-only live region
      const statusEl = document.getElementById('testi-status');
      if (statusEl) {
        const realIdx = ((idx - cloneCount) % origTotal + origTotal) % origTotal;
        statusEl.textContent = `Testimonial ${realIdx + 1} of ${origTotal}`;
      }
    }
  }

  // After an animated slide, check if we landed on a clone
  // and silently teleport to the matching real card
  track.addEventListener('transitionend', () => {
    const totalWithClones = cloneCount + origTotal + cloneCount;
    if (current >= cloneCount + origTotal) {
      // Slid into the appended clones — jump to matching real card
      const jump = current - origTotal;
      goTo(jump, false);
    } else if (current < cloneCount) {
      // Slid into the prepended clones — jump to matching real card
      const jump = current + origTotal;
      goTo(jump, false);
    }
  });

  // ── Init ───────────────────────────────────────────────────
  let dots;
  function init(keepRealIdx) {
    const realIdx = keepRealIdx || 0; // which original to land on
    buildTrack();
    dots = buildDots();
    current = cloneCount + realIdx;
    goTo(current, false);
    // Prev/next always enabled — infinite loop needs no disable
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  }
  init(0);
  resetTimer();

  // ── Testimonial filter ─────────────────────────────────────
  function filterBy(type) {
    document.querySelectorAll('.testi-filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.filter === type)
    );
    origCards = type === 'all' ? allCards.slice() : allCards.filter(c => c.dataset.type === type);
    origTotal = origCards.length;
    stopAutoplay();
    init(0);
    track.querySelectorAll('.r').forEach(el => el.classList.add('on'));
    startAutoplay();
  }
  document.querySelectorAll('.testi-filter-btn').forEach(btn =>
    btn.addEventListener('click', () => filterBy(btn.dataset.filter))
  );

  // ── Button controls ────────────────────────────────────────
  prevBtn.addEventListener('click', () => { goTo(current - 1); resetAutoplay(); });
  nextBtn.addEventListener('click', () => { goTo(current + 1); resetAutoplay(); });

  // ── Autoplay ───────────────────────────────────────────────
  function startAutoplay() {
    stopAutoplay();
    autoTimer = setInterval(() => { goTo(current + 1); }, 6000);
  }
  function stopAutoplay()  { clearInterval(autoTimer); }
  function resetAutoplay() { stopAutoplay(); startAutoplay(); }

  wrap.addEventListener('mouseenter', stopAutoplay);
  wrap.addEventListener('mouseleave', startAutoplay);
  wrap.addEventListener('focusin',    stopAutoplay);
  wrap.addEventListener('focusout',   startAutoplay);
  startAutoplay();

  // ── Drag / swipe ───────────────────────────────────────────
  wrap.addEventListener('mousedown',  e => { isDragging = true; startX = e.clientX; track.style.transition = 'none'; e.preventDefault(); });
  wrap.addEventListener('touchstart', e => { isDragging = true; startX = e.touches[0].clientX; track.style.transition = 'none'; }, { passive: true });

  function onMove(x) {
    if (!isDragging) return;
    dragOffset = x - startX;
    track.style.transform = `translateX(${-(offsetForIdx(current) - dragOffset)}px)`;
  }
  wrap.addEventListener('mousemove', e => onMove(e.clientX));
  wrap.addEventListener('touchmove', e => onMove(e.touches[0].clientX), { passive: true });

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    if      (dragOffset < -50) goTo(current + 1);
    else if (dragOffset >  50) goTo(current - 1);
    else    goTo(current); // snap back if nudge was too small
    dragOffset = 0;
    resetAutoplay();
  }
  wrap.addEventListener('mouseup',    onEnd);
  wrap.addEventListener('mouseleave', onEnd);
  wrap.addEventListener('touchend',   onEnd);

  // ── Resize ─────────────────────────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Remember which real card was leftmost before rebuild
      const realIdx = ((current - cloneCount) % origTotal + origTotal) % origTotal;
      init(realIdx);
      track.querySelectorAll('.r').forEach(el => el.classList.add('on'));
    }, 120);
  });
})();

/* ═══════════════════════════════════════
   SCROLL REVEAL — staggered per section
═══════════════════════════════════════ */
// Main observer: fires when a section (or standalone .r element) enters the viewport.
// It then staggers-in all .r children of that section.
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (!isIntersecting) return;

    // If the observed element itself has the .r class, animate it directly
    if (target.classList.contains('r')) target.classList.add('on');

    // Stagger child .r elements: each one enters 90ms after the previous.
    // Excludes .proj-card because those are handled individually by cardIO below —
    // without this exclusion, all cards would animate at once when the section enters.
    const items = target.querySelectorAll('.r:not(.on):not(.proj-card)');
    items.forEach((el, i) => {
      setTimeout(() => el.classList.add('on'), i * 90); // 90ms stagger looks natural
    });

    revealIO.unobserve(target); // one-shot — no need to watch after it's revealed
  });
}, {
  threshold:  0.05,              // trigger as soon as 5% of the section is visible
  rootMargin: '0px 0px -60px 0px' // negative bottom margin: element must be 60px INTO the viewport
                                  // before triggering — prevents animations firing while still off-screen
});

// Separate observer for project cards — each card triggers independently as it scrolls in.
// If we let revealIO handle them, all cards in the section would animate simultaneously
// when the section header hit the threshold, not when each card actually enters view.
const cardIO = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (!isIntersecting) return;
    target.classList.add('on');
    cardIO.unobserve(target); // one-shot
  });
}, {
  threshold:  0.1,               // 10% visible before card animates in
  rootMargin: '0px 0px -40px 0px' // slightly less buffer than revealIO — cards are shorter elements
});

// Observe all sections and special background wrappers
document.querySelectorAll('section, .testi-bg, .tools-bg').forEach(sec => revealIO.observe(sec));

// Also observe standalone .r elements that aren't inside a section (e.g. the nav or footer)
document.querySelectorAll('.r').forEach(el => {
  if (!el.closest('section') && !el.closest('.testi-bg') && !el.closest('.tools-bg')) {
    revealIO.observe(el);
  }
});

// Each project card gets its own individual observation
document.querySelectorAll('.proj-card.r').forEach(card => cardIO.observe(card));

/* ═══════════════════════════════════════
   DYNAMIC FOOTER YEAR
═══════════════════════════════════════ */
// Automatically updates the copyright year — no manual update needed each January
const yearEl = document.getElementById('footer-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();


/* ═══════════════════════════════════════
   PROJECT MODALS
═══════════════════════════════════════ */
(function(){
  // All focusable element types — used by the Tab focus trap
  const FOCUSABLE_SEL = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let _opener = null; // element that triggered open — focus returns here on close

  function openModal(id, trigger) {
    const modal = document.getElementById(id);
    if (!modal) return;

    _opener = trigger || null;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal-close').focus();
  }

  function closeModal(modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    // Return focus to the button that opened this modal so keyboard nav stays coherent
    if (_opener) { _opener.focus(); _opener = null; }
  }

  // Focus trap: Tab and Shift+Tab cycle only within the open modal
  document.querySelectorAll('.proj-modal').forEach(modal => {
    modal.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || !modal.classList.contains('open')) return;
      const focusable = Array.from(modal.querySelectorAll(FOCUSABLE_SEL));
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    });
  });

  // "View Details" button on each card — data-modal="modal-[id]" tells us which modal to open.
  // stopPropagation prevents the click from bubbling to the card's 3D-tilt listener.
  document.querySelectorAll('.btn-modal-open').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openModal(btn.dataset.modal, btn);
    });
  });

  // Close via the ✕ button or by clicking the dark backdrop
  document.querySelectorAll('.proj-modal').forEach(modal => {
    modal.querySelector('.modal-close').addEventListener('click',   () => closeModal(modal));
    modal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(modal));
  });

  // Escape key — standard UX pattern, expected by keyboard users and screen readers
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.proj-modal.open').forEach(m => closeModal(m));
    }
  });

  // Inject prev/next navigation into each modal
  const MODAL_ORDER = [
    'modal-moev', 'modal-dpm', 'modal-portfolio', 'modal-toolmart',
    'modal-kdl', 'modal-kdl-checker', 'modal-service-health', 'modal-project-health'
  ];
  MODAL_ORDER.forEach((id, i) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    const inner = modal.querySelector('.modal-inner');
    if (!inner) return;

    const nav     = document.createElement('div');
    nav.className = 'modal-nav';
    nav.setAttribute('aria-label', 'Project navigation');

    const prevId = MODAL_ORDER[i - 1];
    const nextId = MODAL_ORDER[i + 1];

    const makeNavBtn = (label, targetId) => {
      const btn = document.createElement('button');
      btn.className   = 'modal-nav-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        closeModal(modal);
        setTimeout(() => openModal(targetId), 80);
      });
      return btn;
    };

    nav.appendChild(prevId ? makeNavBtn('← Prev', prevId) : document.createElement('span'));

    const count     = document.createElement('span');
    count.className = 'modal-nav-count';
    count.textContent = `${i + 1} / ${MODAL_ORDER.length}`;
    nav.appendChild(count);

    nav.appendChild(nextId ? makeNavBtn('Next →', nextId) : document.createElement('span'));

    inner.appendChild(nav);
  });
})();
