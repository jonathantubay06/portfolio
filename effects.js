'use strict';
/* ═══════════════════════════════════════
   EFFECTS.JS — visual enhancements
   Loaded with `defer` so it never blocks
   HTML parsing or first paint. By the time
   this runs, main.js has already wired up
   all interactive features (nav, modals, etc.)
═══════════════════════════════════════ */

/* ── 1. TEXT SCRAMBLE ──────────────────
   On load, the hero name decodes from
   random characters into "Jonathan Tubay"
   — left-to-right, like a terminal reveal.
   Runs on the two parts separately so the
   cyan colour on "Jonathan" is preserved.
══════════════════════════════════════ */
(function(){
  const h1 = document.querySelector('.glitch-name');
  if (!h1) return;

  const spanEl   = h1.querySelector('.glow'); // "Jonathan" — needs to stay inside <span>
  const textNode = h1.childNodes[1];          // " Tubay"   — raw text node after the span
  if (!spanEl || !textNode) return;

  // Character pool: caps + lowercase + symbols for that hacker feel
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&0123456789';

  // Generic scrambler: setter writes the value, target is the final string
  function scramble(setter, target, duration, delay) {
    setTimeout(() => {
      let start = null;
      const len = target.length;

      function frame(ts) {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        // How many chars from the left have "settled" into the real letter
        const settled = Math.floor(progress * len);

        let out = '';
        for (let i = 0; i < len; i++) {
          if (i < settled || target[i] === ' ') {
            out += target[i]; // real character — locked in
          } else {
            out += CHARS[Math.floor(Math.random() * CHARS.length)]; // still scrambling
          }
        }
        setter(out);
        if (progress < 1) requestAnimationFrame(frame);
        else setter(target); // guarantee clean final state
      }
      requestAnimationFrame(frame);
    }, delay);
  }

  // Both words start close together and finish around the 3s mark
  scramble(v => { spanEl.textContent   = v; }, 'Jonathan', 2600, 200);
  scramble(v => { textNode.nodeValue   = v; }, ' Tubay',   2600, 400);
})();


/* ── 2. MAGNETIC BUTTONS ───────────────
   Hero CTA buttons subtly pull toward the
   cursor as it moves nearby — gives a
   premium, agency-site feel.
   Skipped entirely on touch devices where
   mousemove never fires.
══════════════════════════════════════ */
(function(){
  if (window.matchMedia('(hover: none)').matches) return; // touch device — skip

  document.querySelectorAll('.hero-cta .btn').forEach(btn => {
    let pending = false; // rAF throttle — cap style updates at ~60fps not ~1000fps

    btn.addEventListener('mousemove', e => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        const r  = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width  / 2);
        const dy = e.clientY - (r.top  + r.height / 2);
        btn.style.transform  = `translate(${dx * 0.32}px, ${dy * 0.32}px) translateY(-2px)`;
        btn.style.transition = 'transform .1s ease';
        pending = false;
      });
    });

    btn.addEventListener('mouseleave', () => {
      pending = false;
      btn.style.transform  = '';
      btn.style.transition = 'transform .55s cubic-bezier(.25,.8,.25,1)';
    });
  });
})();


/* ── 3. MOUSE SPOTLIGHT ────────────────
   A soft cyan radial gradient follows the
   cursor over the hero, revealing more of
   the anime background — adds depth and
   makes the hero feel interactive.
   Uses lerp (0.09 factor) so the spotlight
   has a slight lag behind the cursor, which
   gives it weight and feels cinematic.
══════════════════════════════════════ */
(function(){
  if (window.matchMedia('(hover: none)').matches) return;

  const hero = document.querySelector('.hero');
  if (!hero) return;

  // Injected div — cleaner than ::after, no z-index fights with canvas or overlay
  const spot = document.createElement('div');
  spot.className = 'hero-spotlight';
  spot.setAttribute('aria-hidden', 'true');
  hero.appendChild(spot);

  let tX = 0, tY = 0, cX = 0, cY = 0, rafId = null;

  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    tX = e.clientX - r.left;
    tY = e.clientY - r.top;
  }, { passive: true }); // passive — no preventDefault, browser can scroll optimise

  function loop() {
    // Linear interpolation: moves 9% closer to target each frame (~60fps)
    cX += (tX - cX) * 0.09;
    cY += (tY - cY) * 0.09;
    spot.style.setProperty('--sx', `${cX}px`);
    spot.style.setProperty('--sy', `${cY}px`);
    rafId = requestAnimationFrame(loop);
  }

  hero.addEventListener('mouseenter', () => {
    const r = hero.getBoundingClientRect();
    cX = r.width / 2; cY = r.height / 2; // start from center so it doesn't jump in from 0,0
    spot.style.opacity = '1';
    loop();
  });

  hero.addEventListener('mouseleave', () => {
    spot.style.opacity = '0';
    cancelAnimationFrame(rafId); // stop the loop — no point running when mouse is gone
  });
})();


/* ── 4. FLOATING CODE DECORATIONS ──────
   Tokens are pinned to the far left (2–16%)
   and far right (84–97%) fringes only —
   well clear of the centre content column.
   Vertical spread avoids the very top (nav)
   and concentrates on mid + lower hero.
   Skipped on small screens (< 600px).
══════════════════════════════════════ */
(function(){
  const hero = document.querySelector('.hero');
  if (!hero || window.innerWidth < 768) return; // hidden on tablets & below via CSS too

  const tokens = ['< />', '{ }', '=>', '//', '&&', '===', 'async', 'const', 'null', '[ ]'];

  tokens.forEach((token, i) => {
    const el = document.createElement('span');
    el.className = 'hero-code-float';
    el.textContent = token;
    el.setAttribute('aria-hidden', 'true');

    // Far left: 2–16% | Far right: 84–97% — nothing near the centre column
    const onLeft = i % 2 === 0;
    const left   = onLeft
      ? (2  + Math.random() * 14)   // 2–16%  (far left fringe)
      : (84 + Math.random() * 13);  // 84–97% (far right fringe)

    // Vertical: start at 12% (below nav), spread to 88% (above scroll hint)
    const top = 12 + (i / tokens.length) * 76;

    el.style.cssText = `
      left:${left.toFixed(1)}%;
      top:${top.toFixed(1)}%;
      animation-delay:${(i * 0.65).toFixed(2)}s;
      animation-duration:${(7 + Math.random() * 5).toFixed(1)}s;
      font-size:${(.62 + Math.random() * 0.26).toFixed(2)}rem;
    `;
    hero.appendChild(el);
  });
})();


/* ── 5. WORLD CLOCK CYCLE ──────────────
   Rotates through global timezones every 7s
   — shows clients in any region that you're
   available in their time. Both the clock
   and the city label swap together with a
   quick fade so the transition feels smooth.
══════════════════════════════════════ */
(function(){
  const timeEl  = document.getElementById('tz-time');
  const labelEl = document.getElementById('tz-label');
  if (!timeEl || !labelEl) return;

  // Zones ordered: PH first (home), then major client markets
  const zones = [
    { tz: 'Asia/Manila',        flag: '🇵🇭', city: 'PH Time'  },
    { tz: 'America/New_York',   flag: '🇺🇸', city: 'New York' },
    { tz: 'Europe/London',      flag: '🇬🇧', city: 'London'   },
    { tz: 'America/Los_Angeles',flag: '🇺🇸', city: 'LA Time'  },
    { tz: 'Australia/Sydney',   flag: '🇦🇺', city: 'Sydney'   },
    { tz: 'Asia/Dubai',         flag: '🇦🇪', city: 'Dubai'    },
    { tz: 'Asia/Ho_Chi_Minh',  flag: '🇻🇳', city: 'Vietnam'  },
  ];

  let zoneIdx = 0;
  let seconds = 0; // counts up each tick; zone rotates every ZONE_SECS ticks
  const ZONE_SECS = 7;

  function getTime(tz) {
    const d    = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
    const h    = d.getHours();
    const m    = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${(h % 12) || 12}:${m} ${ampm}`;
  }

  function switchZone() {
    // Fade out → swap content → fade in
    timeEl.style.transition  = labelEl.style.transition = 'opacity .3s';
    timeEl.style.opacity     = labelEl.style.opacity    = '0';
    setTimeout(() => {
      const z = zones[zoneIdx];
      timeEl.textContent  = getTime(z.tz);
      labelEl.textContent = `${z.flag} ${z.city}`;
      timeEl.style.opacity = labelEl.style.opacity = '1';
    }, 320);
  }

  // Single interval does everything — no timer leaks
  const z0 = zones[0];
  timeEl.textContent  = getTime(z0.tz);
  labelEl.textContent = `${z0.flag} ${z0.city}`;

  let clockId = setInterval(tick, 1000);

  function tick() {
    seconds++;
    // Rotate zone every ZONE_SECS seconds
    if (seconds % ZONE_SECS === 0) {
      zoneIdx = (zoneIdx + 1) % zones.length;
      switchZone();
    } else {
      // Just update the clock for the current zone — no fade needed
      timeEl.textContent = getTime(zones[zoneIdx].tz);
    }
  }

  // Pause the clock when the tab is hidden — saves CPU/battery on background tabs
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(clockId);
    } else {
      // Sync immediately on return so the time isn't stale
      timeEl.textContent = getTime(zones[zoneIdx].tz);
      clockId = setInterval(tick, 1000);
    }
  });
})();


/* ── 6. CURSOR TRAIL ───────────────────
   Tiny cyan dots appear wherever the mouse
   moves and fade out in 600ms — adds a
   satisfying "particle" feel that reinforces
   the tech/dev identity without being noisy.
   Throttled to one dot every 50ms so fast
   sweeps stay clean and memory stays light.
   Dots remove themselves on animationend so
   the DOM never accumulates stale nodes.
   Skipped on touch devices.
══════════════════════════════════════ */
(function(){
  if (window.matchMedia('(hover: none)').matches) return;

  let last = 0;
  const THROTTLE = 50; // ms — one dot per 50ms max

  document.addEventListener('mousemove', e => {
    const now = Date.now();
    if (now - last < THROTTLE) return;
    last = now;

    const dot = document.createElement('div');
    dot.className = 'cursor-trail-dot';
    dot.style.left = `${e.clientX}px`;
    dot.style.top  = `${e.clientY}px`;
    document.body.appendChild(dot);

    // Self-remove after animation finishes — no stale DOM nodes
    dot.addEventListener('animationend', () => dot.remove(), { once: true });
  }, { passive: true });
})();


/* ── 7. TIMELINE LINE DRAW ─────────────
   The vertical timeline bar starts at 0 height
   and grows to full height as the section
   scrolls into view — feels like the career
   history is being written in real-time.
   Uses IntersectionObserver (threshold 0.15)
   so the animation fires early enough to be
   visible but not before the section appears.
   Once drawn, the observer disconnects.
══════════════════════════════════════ */
(function(){
  const tl = document.querySelector('.timeline');
  if (!tl) return;

  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      tl.classList.add('tl-drawn');
      obs.disconnect(); // fire once — no need to watch after drawn
    }
  }, { threshold: 0.15 });

  obs.observe(tl);
})();


/* ── 8. SECTION LABEL TYPEWRITER ───────
   Each section label (e.g. "// ABOUT ME",
   "// PROJECTS") types out character by
   character when it enters the viewport —
   reinforces the code-editor motif and gives
   every section a micro-entrance moment.
   Only runs once per label (observer disconnects
   after the first intersection).
   A blinking cursor is appended during typing
   and removed when done.
══════════════════════════════════════ */
(function(){
  const labels = document.querySelectorAll('.sec-label');
  if (!labels.length) return;

  const typed = new Set();
  labels.forEach(el => {
    const original = el.textContent.trim();

    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || typed.has(el)) return;
      typed.add(el);
      obs.disconnect();

      el.textContent = ''; // clear just before typing — avoids blank labels on slow page loads

      // Blinking cursor spans beside the label during typing
      const cursor = document.createElement('span');
      cursor.className    = 'tl-cursor'; // reuse existing blink style if present
      cursor.textContent  = '▌';
      cursor.style.cssText = 'opacity:1;animation:blink 1s step-end infinite;margin-left:2px;color:var(--cyan);';
      el.appendChild(cursor);

      let i = 0;
      const SPEED = 48; // ms per character — fast enough to feel snappy

      // Build a text node before the cursor and extend it each tick
      const textNode = document.createTextNode('');
      el.insertBefore(textNode, cursor);

      const tick = setInterval(() => {
        textNode.nodeValue += original[i];
        i++;
        if (i >= original.length) {
          clearInterval(tick);
          setTimeout(() => cursor.remove(), 800); // leave cursor blinking briefly then remove
        }
      }, SPEED);
    }, { threshold: 0.4 });

    obs.observe(el);
  });
})();


/* ── 9. BUTTON CLICK RIPPLE ────────────
   Every .btn emits a circular ripple from
   the exact click point — the classic Material
   Design affordance that makes button presses
   feel satisfyingly physical.
   The ripple span is injected at click coords,
   animates scale(0)→scale(4) with fade-out,
   then removes itself when done.
   Works on all buttons site-wide including
   hero CTAs, contact submit, back-to-top, etc.
══════════════════════════════════════ */
(function(){
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const r      = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className  = 'btn-ripple';
    ripple.style.left = `${e.clientX - r.left}px`;
    ripple.style.top  = `${e.clientY - r.top}px`;
    btn.appendChild(ripple);

    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
})();

/* ── MOBILE CTA BAR ──────────────────
   Fixed bottom CTA for mobile — reveals
   once the hero scrolls out of view.
══════════════════════════════════════ */
(function(){
  const bar  = document.getElementById('mobileCta');
  if (!bar) return;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const io = new IntersectionObserver(([entry]) => {
    bar.classList.toggle('visible', !entry.isIntersecting);
  }, { threshold: 0.1 });
  io.observe(hero);
})();


/* ── 10. ACTIVE NAV HIGHLIGHT ───────────
   Adds .active to the correct nav link as
   you scroll past each section — gives clear
   wayfinding without any extra UI chrome.
   Uses IntersectionObserver with a centre-
   biased rootMargin so only the section that
   fills the middle of the viewport wins.
   Disconnects cleanly when all sections pass.
══════════════════════════════════════ */
(function(){
  const links    = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = [];

  // Build a map of id → nav link
  const linkMap = {};
  links.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    linkMap[id] = a;
    const el = document.getElementById(id);
    if (el) sections.push(el);
  });

  if (!sections.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const link = linkMap[entry.target.id];
      if (!link) return;
      if (entry.isIntersecting) {
        // Remove active from all, then set on the one that entered
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

  sections.forEach(s => obs.observe(s));
})();


/* ── 11. CUSTOM CURSOR ─────────────────
   A small dot + trailing ring replace the
   default cursor on desktop — the dot snaps
   to the exact cursor position while the ring
   lerp-follows with a slight lag for depth.
   Ring scales up on hover over links/buttons.
   Skipped entirely on touch devices.
══════════════════════════════════════ */
(function(){
  if (window.matchMedia('(hover: none)').matches) return;

  const dot  = document.createElement('div');
  dot.className  = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  // Hide native cursor once elements are ready
  document.body.classList.add('custom-cursor-active');

  let mx = -200, my = -200; // start off-screen so it never flashes at 0,0
  let rx = -200, ry = -200;

  // Initialise off-screen so neither element flashes in the viewport before mouse enters
  dot.style.left  = '-200px';
  dot.style.top   = '-200px';

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  }, { passive: true });

  // Ring follows with lerp lag — gives it weight
  (function loopRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx.toFixed(2) + 'px';
    ring.style.top  = ry.toFixed(2) + 'px';
    requestAnimationFrame(loopRing);
  })();

  // Scale ring on hoverable elements
  document.addEventListener('mouseover', e => {
    const hov = e.target.closest('a, button, [role="button"], label, input, select, textarea');
    dot.classList.toggle('cursor-hover', !!hov);
    ring.classList.toggle('cursor-hover', !!hov);
  });

  // Hide when mouse leaves the window
  document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = ''; ring.style.opacity = ''; });
})();


/* ── 12. AVAILABLE PILL ────────────────
   Green "Available for Projects" pill slides
   in from the right after the user scrolls
   past the hero — persistent reminder without
   being a pop-up or blocking anything.
   Clicking it scrolls to #contact.
   Hidden on mobile (stacks with back-to-top).
══════════════════════════════════════ */
(function(){
  const pill = document.getElementById('avail-pill');
  if (!pill) return;

  // IntersectionObserver on the hero is screen-height-agnostic — pill appears
  // exactly when the hero scrolls out of view, regardless of viewport height.
  const hero = document.querySelector('.hero');
  if (hero) {
    const io = new IntersectionObserver(([entry]) => {
      pill.classList.toggle('visible', !entry.isIntersecting);
    }, { threshold: 0.1 });
    io.observe(hero);
  } else {
    window.addEventListener('scroll', () => {
      pill.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
  }
})();


/* ── 13. COPY EMAIL BUTTON ─────────────
   Injects a small clipboard button next to
   the email address in the contact section.
   Click copies to clipboard and shows a
   "Copied!" toast for 2 seconds — one-touch
   convenience for clients on mobile.
══════════════════════════════════════ */
(function(){
  const EMAIL = 'jonatsbuilds@gmail.com';

  // Create the toast element (one shared instance)
  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.textContent = '✓ Email copied!';
  document.body.appendChild(toast);

  let toastTimer = null;
  function showToast() {
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // Clipboard SVG icon
  const clipSVG = `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const checkSVG = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;

  // Find the email value element inside the .c-opt card
  document.querySelectorAll('.c-opt-val, .ci-val').forEach(el => {
    if (!el.textContent.includes(EMAIL)) return;

    // Wrap text + button in a flex row
    const text = el.textContent.trim();
    el.innerHTML = '';
    const row  = document.createElement('span');
    row.className = 'c-opt-val-row';
    const span = document.createElement('span');
    span.textContent = text;

    const btn  = document.createElement('button');
    btn.className = 'copy-btn';
    btn.setAttribute('aria-label', 'Copy email address');
    btn.innerHTML = clipSVG;

    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(EMAIL).then(() => {
        btn.innerHTML = checkSVG;
        showToast();
        setTimeout(() => { btn.innerHTML = clipSVG; }, 2000);
      });
    });

    row.appendChild(span);
    row.appendChild(btn);
    el.appendChild(row);
  });
})();


/* ── 14. EASTER EGG ────────────────────
   Type "hireme" anywhere on the page (no
   input focused) and a terminal-style window
   appears with a typewriter message sequence.
   Perfect conversation starter — any dev or
   recruiter who finds it will remember it.
══════════════════════════════════════ */
(function(){
  const overlay = document.getElementById('egg-overlay');
  const linesEl = document.getElementById('egg-lines');
  const closeBtn = document.getElementById('egg-close');
  if (!overlay || !linesEl || !closeBtn) return;

  const TRIGGER  = 'jt'; // initials — quick to type, fun for devs who try it
  let   buffer   = '';

  // The terminal lines — each is printed with a delay
  const LINES = [
    { text: '> ',          cmd: 'hire jonathan.exe',      delay: 0    },
    { text: 'Loading...',                                  delay: 600  },
    { text: '████████████████████ 100%',                  delay: 1100 },
    { text: '',                                            delay: 1300 },
    { text: '✓ ',          ok: 'Skills loaded',           rest: ' — Shopify · WordPress · Automation', delay: 1500 },
    { text: '✓ ',          ok: 'Status',                  rest: ' — AVAILABLE FOR PROJECTS',           delay: 1900 },
    { text: '✓ ',          ok: 'Location',                rest: ' — Las Piñas, PH  (remote-first)',     delay: 2300 },
    { text: '→ ',          cmd: 'jonatsbuilds@gmail.com',                                               delay: 2800 },
  ];

  function buildLine(line) {
    const p = document.createElement('p');
    p.className = 'egg-line';
    if (line.cmd) {
      p.innerHTML = `${escHtml(line.text || '')}<span class="egg-cmd">${escHtml(line.cmd)}</span>${escHtml(line.rest || '')}`;
    } else if (line.ok) {
      p.innerHTML = `${escHtml(line.text || '')}<span class="egg-ok">${escHtml(line.ok)}</span><span class="egg-dim">${escHtml(line.rest || '')}</span>`;
    } else {
      p.textContent = line.text || '';
    }
    return p;
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function openEgg() {
    linesEl.innerHTML = '';
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    closeBtn.focus();

    LINES.forEach(line => {
      setTimeout(() => {
        linesEl.appendChild(buildLine(line));
      }, line.delay);
    });
  }

  function closeEgg() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  closeBtn.addEventListener('click', closeEgg);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeEgg(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeEgg();
  });

  // Listen for the "hireme" sequence on any non-input keypress
  document.addEventListener('keydown', e => {
    // Don't capture if user is typing in a form field
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key.length === 1) {
      buffer = (buffer + e.key.toLowerCase()).slice(-TRIGGER.length);
      if (buffer === TRIGGER) {
        buffer = '';
        openEgg();
      }
    }
  });
})();

/* ── 19. AURORA BLOB INIT ──────────────────
   Force reflow so CSS animations start cleanly
   (avoids Safari flash-of-invisible on first load).
══════════════════════════════════════ */
(function(){
  document.querySelectorAll('.aurora-blob').forEach(b => void b.offsetWidth);
})();


/* ── 20. CURSOR SPARKLE TRAIL ──────────────
   Tiny cyan sparks emit from the cursor on
   mousemove — throttled to 1 per 60ms max.
   Skipped on touch devices.
══════════════════════════════════════ */
(function(){
  if (window.matchMedia('(hover: none)').matches) return;

  let last = 0;
  document.addEventListener('mousemove', e => {
    const now = Date.now();
    if (now - last < 60) return;
    last = now;

    const s = document.createElement('div');
    s.className = 'cursor-sparkle';
    s.style.left = (e.clientX + (Math.random() - .5) * 8) + 'px';
    s.style.top  = (e.clientY + (Math.random() - .5) * 8) + 'px';
    const sz = 4 + Math.random() * 4;
    s.style.width = s.style.height = sz + 'px';
    document.body.appendChild(s);
    s.addEventListener('animationend', () => s.remove(), { once: true });
  }, { passive: true });
})();


/* ── 21. HERO SCROLL PARALLAX ──────────────
   h1, subtitle, and desc drift at different
   speeds as you scroll — creates depth.
   Desktop only (touch + mobile skipped).
══════════════════════════════════════ */
(function(){
  if (window.matchMedia('(hover: none)').matches) return;
  if (window.innerWidth < 768) return;

  const h1   = document.querySelector('.glitch-name');
  const sub  = document.querySelector('.hero-sub');
  const desc = document.querySelector('.hero-desc');
  if (!h1) return;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > window.innerHeight) return;
    h1.style.transform   = `translateY(-${y * .18}px)`;
    if (sub)  sub.style.transform  = `translateY(-${y * .11}px)`;
    if (desc) desc.style.transform = `translateY(-${y * .07}px)`;
  }, { passive: true });
})();


/* ── 22. TOOL CHIP STAGGER ENTRANCE ────────
   Each .chip flies in with 40ms stagger when
   the tools section scrolls into view.
   Runs once per chip via IntersectionObserver.
══════════════════════════════════════ */
(function(){
  const chips = document.querySelectorAll('.chip');
  if (!chips.length) return;

  chips.forEach(c => c.classList.add('chip-hidden'));

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      const idx = Array.from(chips).indexOf(entry.target);
      setTimeout(() => {
        entry.target.classList.remove('chip-hidden');
        entry.target.classList.add('chip-in');
      }, idx * 40);
    });
  }, { threshold: 0.1 });

  chips.forEach(c => io.observe(c));
})();


/* ── 23. TIMELINE EXPAND ON CLICK ──────────
   Toggles .tl-open on .tl-content elements
   that have a .tl-expand child list.
   Keyboard accessible via Enter / Space.
══════════════════════════════════════ */
(function(){
  document.querySelectorAll('.tl-content[role="button"]').forEach(el => {
    function toggle() {
      const open = el.classList.toggle('tl-open');
      el.setAttribute('aria-expanded', String(open));
      const exp = el.querySelector('.tl-expand');
      if (exp) exp.setAttribute('aria-hidden', String(!open));
    }
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
})();


/* ── 24. SERVICE ROW TAP EXPAND (touch) ────
   On touch devices, hover won't fire.
   Tap a service row to toggle .svc-open
   which triggers the CSS bullet expansion.
   Desktop uses CSS :hover only.
══════════════════════════════════════ */
(function(){
  if (!window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.svc-row').forEach(row => {
    row.addEventListener('click', () => row.classList.toggle('svc-open'));
  });
})();


/* ── 25. BOOK-A-CALL PILL ──────────────────
   Slides in after 800px scroll — appears just
   below the Available pill. Same pattern.
══════════════════════════════════════ */
(function(){
  const pill = document.getElementById('book-pill');
  if (!pill) return;

  const hero = document.querySelector('.hero');
  if (hero) {
    const io = new IntersectionObserver(([entry]) => {
      pill.classList.toggle('visible', !entry.isIntersecting);
    }, { threshold: 0 });
    io.observe(hero);
  } else {
    window.addEventListener('scroll', () => {
      pill.classList.toggle('visible', window.scrollY > 800);
    }, { passive: true });
  }
})();


/* ── 26. QUICK-PICK SERVICE BUTTONS ────────
   Clicks a .qp-btn → pre-selects the service
   dropdown, opens Stage 2, scrolls to contact.
══════════════════════════════════════ */
(function(){
  const btns   = document.querySelectorAll('.qp-btn');
  const select = document.getElementById('f-need');
  if (!btns.length || !select) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.service;
      // Match option text to the data-service value
      Array.from(select.options).forEach((opt, i) => {
        if (opt.value === val || opt.text === val) select.selectedIndex = i;
      });
      // Open Stage 2 if not open already
      const stage2   = document.getElementById('stage2');
      const startBtn = document.getElementById('startBtn');
      if (stage2 && startBtn && !stage2.classList.contains('open')) startBtn.click();
      // Scroll to contact section
      const contact = document.getElementById('contact');
      if (contact) contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();


/* ── 15. SIDE DOT NAVIGATION ───────────────
   Fixed right-edge dot for each major section.
   Active dot fills cyan based on which section
   occupies the centre of the viewport.
   Dots are built dynamically from the page's
   <section id="..."> elements so adding a new
   section automatically gets a dot.
   Tooltip label comes from data-label attribute
   set on each dot (matches the section heading).
   Hidden on ≤900px (overlaps back-to-top).
══════════════════════════════════════ */
(function(){
  // Sections to track — id maps to a friendly label for the tooltip
  const NAV_SECTIONS = [
    { id: 'main',         label: 'Home'       },
    { id: 'services',     label: 'Services'   },
    { id: 'work',         label: 'Work'       },
    { id: 'testimonials', label: 'Reviews'    },
    { id: 'experience',   label: 'Experience' },
    { id: 'contact',      label: 'Contact'    },
  ];

  // Build the container + one dot per section
  const container = document.createElement('div');
  container.id = 'side-dots';
  container.setAttribute('aria-hidden', 'true'); // decorative — not in tab order

  const dots = NAV_SECTIONS.map(({ id, label }) => {
    const el = document.createElement('button');
    el.className   = 'sdot';
    el.setAttribute('data-label', label);
    el.setAttribute('aria-label', `Scroll to ${label}`);
    el.addEventListener('click', () => {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    container.appendChild(el);
    return { el, id };
  });

  document.body.appendChild(container);

  // IntersectionObserver: when a section hits the middle of the viewport,
  // its dot becomes active. rootMargin pushes the trigger zone to centre.
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const idx = dots.findIndex(d => d.id === entry.target.id);
      if (idx === -1) return;
      dots.forEach((d, i) => d.el.classList.toggle('active', i === idx));
    });
  }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

  // Only observe sections that actually exist in the DOM
  dots.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });
})();


/* ── 16. KEYBOARD SHORTCUTS ────────────────
   Press W → Work, S → Services, T → Reviews,
   E → Experience, C → Contact, H → Home (top).
   A one-time hint tooltip shows on first scroll
   (after 200px) and auto-hides after 4s.
   The hint never shows again (localStorage flag).
   Shortcuts are disabled while typing in any form.
══════════════════════════════════════ */
(function(){
  // Map of key (lowercase) → section id
  const SHORTCUTS = {
    h: 'main',
    s: 'services',
    w: 'work',
    t: 'testimonials',
    e: 'experience',
    c: 'contact',
  };

  // Show keyboard shortcut hint — once only, after user scrolls 200px
  const hint = document.getElementById('kb-hint');
  if (hint && !localStorage.getItem('jt-kb-seen')) {
    const onScroll = () => {
      if (window.scrollY < 200) return;
      hint.classList.add('show');
      localStorage.setItem('jt-kb-seen', '1'); // never show again
      setTimeout(() => hint.classList.remove('show'), 4000);
      window.removeEventListener('scroll', onScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Keydown handler — skip if user is typing in a form field
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1) return;

    const id = SHORTCUTS[e.key.toLowerCase()];
    if (!id) return;

    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();


/* ── 17. COPY PHONE BUTTON ─────────────────
   Injects a clipboard button next to the phone
   number in the contact section — mirrors the
   copy-email button above it. Copies the raw
   number (+63 917 529 1657) to the clipboard
   and shows the shared "Copied!" toast.
══════════════════════════════════════ */
(function(){
  const PHONE = '+639175291657'; // E.164 format for clipboard

  // Find the phone ci-val by its id
  const phoneVal = document.getElementById('phone-val');
  if (!phoneVal) return;

  const toast = document.querySelector('.copy-toast'); // reuse the existing toast element

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // Same SVG icons used by the email copy button
  const clipSVG  = `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const checkSVG = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;

  // Wrap the existing text in a flex row with the copy button
  const text = phoneVal.textContent.trim();
  phoneVal.innerHTML = '';
  const row  = document.createElement('span');
  row.className = 'c-opt-val-row';
  const span = document.createElement('span');
  span.textContent = text;

  const btn  = document.createElement('button');
  btn.className = 'copy-btn';
  btn.setAttribute('aria-label', 'Copy phone number');
  btn.innerHTML = clipSVG;

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(PHONE).then(() => {
      btn.innerHTML = checkSVG;
      showToast('✓ Number copied!');
      setTimeout(() => { btn.innerHTML = clipSVG; }, 2000);
    });
  });

  row.appendChild(span);
  row.appendChild(btn);
  phoneVal.appendChild(row);
})();


/* ── 18. SECTION LABEL ENTRY FLASH ────────
   Adds .flash to each .sec-label when it enters
   the viewport — triggers the CSS label-flash
   keyframe (brief neon burst) then removes the
   class so it could replay on re-entry.
══════════════════════════════════════ */
(function(){
  const labels = document.querySelectorAll('.sec-label');
  if (!labels.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.remove('flash'); // reset to allow replay
      // Force reflow so removing+adding the class triggers a fresh animation
      void el.offsetWidth;
      el.classList.add('flash');
      // Remove after animation duration so it can replay on re-scroll
      setTimeout(() => el.classList.remove('flash'), 800);
    });
  }, { threshold: 0.8 });

  labels.forEach(el => io.observe(el));
})();
