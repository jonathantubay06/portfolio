'use strict';
/* Single source of truth for the motion preference. CSS has its own
   @media (prefers-reduced-motion) rules; this gates the JS-driven loops
   (rAF spotlight, cursor trail, scramble, typewriter) that CSS cannot reach. */
const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ═══════════════════════════════════════
   EFFECTS.JS — visual enhancements
   Loaded with `defer` so it never blocks
   HTML parsing or first paint. By the time
   this runs, main.js has already wired up
   all interactive features (nav, modals, etc.)
═══════════════════════════════════════ */

