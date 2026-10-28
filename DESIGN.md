# DESIGN.md: jonathantubay.com

Owner: Jojo (personal). Written 2026-10-29 from the shipped code. The code is the source of truth. Update this file when a token changes.

## World

Late-night engineer's room: deep navy, cyan light, screens glowing in the dark. It should feel technical and calm, never neon-noisy. One accent colour does the work.

## Colour

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#060e1a` | `#faf8f5` | page |
| `--navy` | `#0a1628` | `#f2efe9` | bands, phone world (`#0f1d33` / `#081221` in sections) |
| `--surface` | `rgba(8,18,36,.92)` | `#fff` | cards, chips |
| `--cyan` | `#00d4ff` | `#00d4ff` (`#0a8fd6` for marks on paper) | the accent: links, nodes, glows |
| `--blue` | `#0e7aff` | | secondary accent, gradients only |
| `--text` | `#e8f4ff` | `#1c2333` | body |
| `--muted2` | `#a3c4d8` | `#3d4f63` | secondary text: the default for small labels |
| `--muted` | `#7b9ab0` | `#5a6880` | tertiary text. On dark it is under 4.5:1 for very small text on lifted cards, so use `--muted2` there. |
| `--border` | `rgba(0,212,255,.14)` | `rgba(0,100,180,.14)` | hairlines |

The tokens live in `src/styles/00-base.css` and `23-light-mode.css`. Light mode is an additive `[data-theme="light"]` override, and the hero stays dark.

## Type

- Headings use Orbitron (`--font-head`): uppercase, wide tracking (.12em+), short words only.
- Body uses Plus Jakarta Sans (`--font-body`): `clamp(15.5px,1.6vw,17px)` with 1.75 line height.
- Scale: `45-typographic-scale.css`. The hero is `clamp(2.1rem,7.6vw,5.75rem)` and section titles are about `clamp(1.7rem,4.6vw,3.4rem)`.
- Small caps-style labels run .62 to .8rem at 700 weight. They must still pass 4.5:1, so check them first in any contrast pass.

## Shape and depth

- Radius: `--radius` 8px, `--radius-sm` 3px, pills 100px. Chips use 11px.
- Depth comes from soft dark drop shadows plus cyan rim glows. No heavy borders.

## Motion

- Use transform and opacity only. Motion is authored moments, not loops: an effect runs once when it scrolls into view, then rests. The marquee and live wallpaper are the deliberate exceptions on desktop.
- Easing: `cubic-bezier(.4,0,.2,1)` for runs, `ease` for state changes. Durations are .2 to .35s for UI and about 2.2s for one-off reveals.
- `prefers-reduced-motion` turns off the runs and keeps the end state visible. The default state is always complete and readable without JS.
- Rich motion runs on desktop, lighter motion on tablet, and the phone world is static shots with scroll-linked reveals.

## Device rules

- The `html.dk` gate is `(min-width:1024px) and (pointer:fine)`, set in `_head.html`. Crossing it reloads the page.
- Desktop-only code goes in the manifest `effectsDk` list, which becomes `effects-dk.js`. Never put it in `effects`.
- Phones: 16px gutters, no horizontal overflow, and tap targets of 44px or more. The sticky "Let's talk" bar covers the bottom roughly 70px, so keep key text clear of it.

## Components worth knowing

- **Tech stack:** desktop shows the moving logo marquee (`29-tech-marquee-3d.js`). Phones show the Build / Automate / Ship pipeline (`68-tech-pipeline.css`, `43-tech-pipeline.js`), and that list stays screen-reader-only on desktop.
- **Phone world:** `42-phone-world.js` and `67-phone-world.css`. It sits behind a .96 scrim, with a mask window over the chapter card on screen. Props are tappable and glow.
- **Brand chips:** `.built-ico` tiles are shared by the hero and tech stack.

## Don'ts

- No new accent colours, purple gradients or glassmorphism stacks.
- No body opacity fades: they leave a blank page on iOS.
- No `startViewTransition` on WebKit.
- No lazy images inside closed fixed modals.
