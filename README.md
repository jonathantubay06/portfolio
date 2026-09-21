# jonathantubay.com

Static portfolio. No framework, no runtime dependencies, no npm install.

## Structure

    src/
      _head.html            <head> + opening <body>, plus the critical
                            inline CSS and the @font-face declarations
      _order.txt            section order for index.html
      manifest.json         concatenation order for css/js
      sections/             18 page sections, one file each
      styles/               45 css partials
      scripts/main/         20 partials -> main.js
      scripts/effects/      23 partials -> effects.js
    fonts/                  self-hosted variable woff2 (latin) + OFL texts
    img/                    source renders and their responsive variants
    build.js                assembles src/ into dist/
    minify.js               the whitespace/comment minifiers build.js uses
    dist/                   build output (gitignored, published by Netlify)

Everything in `dist/` is **generated**. Edit `src/` instead.

## Build

    node build.js

Order matters. The CSS cascade and the IIFE execution order in the JS both
depend on `src/manifest.json` and `src/_order.txt`, so the build never
sorts or dedupes. Adding a section means adding the file AND its name to
`_order.txt`; adding a stylesheet or script partial means adding it to
`manifest.json`.

The build also:

- **minifies** the HTML, CSS and JS (`minify.js`). Comments and
  indentation only — nothing is renamed, reordered or removed, and
  newlines survive in the JS so ASI behaves as in the source.
- **content-hashes** the CSS and JS filenames (`style.<hash>.css`) and
  rewrites every reference, in `index.html` and in `case-studies/*.html`.
  This is what allows the `immutable` cache headers in `netlify.toml`: a
  changed file always arrives under a new URL, so there is nothing to
  invalidate. The build throws rather than shipping a page whose
  stylesheet reference it could not rewrite.
- **generates `sitemap.xml`** from each page's canonical URL and the date
  of the last commit that touched its sources.

## Images

`img/preview-*.webp` are the full-size renders. Each has `-360w`, `-720w`
and `-1080w` variants used by the card `srcset`; the modals use `-1080w`
plus the original. `hero-plate.webp` has a `-930w` variant, and the hero
uses `<picture>` with a 1x1 GIF below 1024px because `.hero-art` is
`display:none` there and an `<img>` in a hidden subtree is still fetched.

Regenerating variants after replacing a render is a Pillow resize at
quality 82 (`method=6`); the widths above are the only ones referenced.

## Fonts

Orbitron and Plus Jakarta Sans are self-hosted as single variable woff2
files, latin subset, preloaded, with `font-display: optional`.

They used to come from fonts.googleapis.com loaded asynchronously, which
meant the page always painted in the fallbacks and then re-laid-out every
line of text when the real faces arrived — measured as CLS 0.372 on mobile
and 0.103 on desktop. `optional` is the guarantee that a slow network can
cost the webfont but never the layout.

Both families are SIL OFL 1.1; the licence texts ship in `fonts/`.

## Local preview

    node build.js && python -m http.server 5500 --directory dist

Then http://localhost:5500. Hashed filenames mean a rebuild changes the
URLs, so a plain refresh is enough — no hard-refresh needed.

## Deploy

Netlify runs `node build.js` and publishes `dist/`. Only files listed in
`build.js`'s STATIC array reach production, so internal working folders
cannot leak.
