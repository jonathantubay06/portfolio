# jonathantubay.com

Static portfolio. No framework, no runtime dependencies.

## Structure

    src/
      _head.html            <head> + opening <body>
      _order.txt            section order for index.html
      manifest.json         concatenation order for css/js
      sections/             18 page sections, one file each
      styles/               42 css partials
      scripts/main/         20 partials -> main.js
      scripts/effects/      26 partials -> effects.js
    build.js                assembles src/ into dist/
    dist/                   build output (gitignored, published by Netlify)

`index.html`, `style.css`, `main.js` and `effects.js` in the repo root are
**generated**. They are gitignored. Edit `src/` instead.

## Build

    node build.js            build to dist/
    node build.js --check    build, then diff against any flat files present

Order matters. CSS cascade and the IIFE execution order in the JS both
depend on `src/manifest.json` and `src/_order.txt`, so the build never
sorts or dedupes. Adding a section means adding the file AND its name to
`_order.txt`.

## Local preview

    node build.js && python -m http.server 5500 --directory dist

Then http://localhost:5500 — hard-refresh (Ctrl+Shift+R) after a rebuild;
css and js cache aggressively.

## Deploy

Netlify runs `bash scripts/update-sitemap.sh && node build.js` and
publishes `dist/`. Only files listed in `build.js`'s STATIC array reach
production, so internal working folders cannot leak.
