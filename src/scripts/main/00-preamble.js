'use strict';
// Fallback for browsers without IntersectionObserver: treat every
// observed element as immediately visible instead of throwing and
// breaking every scroll-reveal/animation call site in both scripts.
if (!('IntersectionObserver' in window)) {
  window.IntersectionObserver = class {
    constructor(cb) { this._cb = cb; }
    observe(el) { this._cb([{ target: el, isIntersecting: true }], this); }
    unobserve() {}
    disconnect() {}
  };
}
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

