#!/usr/bin/env node
/**
 * build.js — assembles src/ into dist/
 *
 * Deliberately dependency-free. The site is a single page with no
 * data-driven content, so a static-site generator would add an upgrade
 * treadmill for no gain. If per-project pages are added later, moving to
 * Eleventy from here is straightforward.
 *
 * What it does:
 *   1. index.html  <- src/_head.html + every section in src/_order.txt
 *   2. style.css   <- src/styles/*   concatenated in manifest order
 *   3. main.js     <- src/scripts/main/*
 *   4. effects.js  <- src/scripts/effects/*
 *   5. minifies all four (see minify.js)
 *   6. content-hashes the CSS/JS filenames and rewrites every reference
 *   7. copies static assets across
 *
 * Concatenation order is authoritative and lives in src/manifest.json.
 * CSS cascade and the IIFE execution order in the JS both depend on it,
 * so the build must never sort or dedupe.
 *
 * Usage:  node build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const minify = require('./minify.js');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');
const ROOT = __dirname;

const read = p => fs.readFileSync(p, 'utf8');
/** Split on newlines, tolerant of CRLF — _order.txt is edited on Windows. */
const lines = t => t.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const manifest = JSON.parse(read(path.join(SRC, 'manifest.json')));

/** Concatenate an ordered list of partials from a directory. */
function concat(dir, files) {
  return files.map(f => read(path.join(SRC, dir, f))).join('');
}

/** Assemble index.html from the head shell plus ordered sections. */
function buildHtml() {
  const order = lines(read(path.join(SRC, '_order.txt')));
  const head = read(path.join(SRC, '_head.html'));
  const body = order
    .map(name => read(path.join(SRC, 'sections', name + '.html')))
    .join('');
  return head + body;
}

/** Copy a directory tree, or a single file, into dist. */
function copy(rel) {
  const from = path.join(ROOT, rel);
  if (!fs.existsSync(from)) return 0;
  const to = path.join(DIST, rel);
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    return fs.readdirSync(from).reduce((n, f) => n + copy(path.join(rel, f)), 0);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  return 1;
}

/* ── sitemap ──────────────────────────────────────────────────────────
 * Generated here rather than sed-stamped, for two reasons found in the
 * 2026-09-21 Search Console review:
 *
 *  1. The sitemap listed /case-studies/moev.html while that page's own
 *     canonical says /case-studies/moev. Google follows the sitemap URL,
 *     finds a canonical pointing elsewhere, and reports "Alternate page
 *     with proper canonical tag" — the URL never gets indexed. URLs here
 *     must match each page's canonical exactly.
 *
 *  2. The old script rewrote every lastmod to today on every deploy, even
 *     when nothing changed. Google's guidance is that an inaccurate
 *     lastmod is ignored, so the signal was wasted. Dates now come from
 *     the last commit that actually touched each page's sources.
 *
 * changefreq and priority are omitted: Google has stated for years that
 * it ignores both.
 */
const { execSync } = require('child_process');

function lastChanged(paths){
  try {
    const out = execSync(`git log -1 --format=%cs -- ${paths.join(' ')}`,
                         { cwd: ROOT, encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }).trim();
    if (out) return out;
  } catch { /* shallow clone or no git — fall through */ }
  // Fallback: newest mtime among the sources
  const t = paths
    .filter(p => fs.existsSync(path.join(ROOT, p)))
    .map(p => fs.statSync(path.join(ROOT, p)).mtime.getTime());
  return new Date(t.length ? Math.max(...t) : Date.now()).toISOString().slice(0, 10);
}

const SITE = 'https://jonathantubay.com';
const PAGES = [
  { loc: '/',                     sources: ['src/sections', 'src/_head.html'] },
  { loc: '/case-studies/moev',    sources: ['case-studies/moev.html'] },
  { loc: '/case-studies/inventory-sync', sources: ['case-studies/inventory-sync.html'] },
  { loc: '/now',                  sources: ['now/index.html'] },
  { loc: '/uses',                 sources: ['uses/index.html'] },
];

function buildSitemap(){
  const NL = String.fromCharCode(10);
  const urls = PAGES.map(p => [
    '  <url>',
    '    <loc>' + SITE + p.loc + '</loc>',
    '    <lastmod>' + lastChanged(p.sources) + '</lastmod>',
    '  </url>'
  ].join(NL)).join(NL);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    ''
  ].join(NL);
}

/* ── analytics beacon ─────────────────────────────────────────────────
 * Cloudflare Web Analytics. Cookieless and storing no personal data, so
 * it needs no consent banner — which is the whole reason it was chosen
 * over Google Analytics for a site whose visitors arrive from anywhere.
 *
 * Injected here rather than pasted into each page because the site has
 * four independent HTML entry points: the assembled index, the 404, the
 * confirmation page and the case studies. Pasting would mean four copies
 * of the token and, eventually, one page that quietly stops reporting
 * after an edit. /thanks/ is the one that would hurt most to miss — it is
 * the only evidence a visitor became an enquiry.
 *
 * The token is not a secret. It ships in the page source by design and
 * identifies the site, not the account.
 *
 * type="module" is implicitly deferred, so this never blocks rendering
 * even though it sits in the markup just before </body>.
 */
const CF_TOKEN = '716f0221784b40f8adcbb337bdcb1f93';
const BEACON =
  '<!-- Cloudflare Web Analytics -->' +
  '<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js"' +
  ' data-cf-beacon=\'{"token": "' + CF_TOKEN + '"}\'><\/script>' +
  '<!-- End Cloudflare Web Analytics -->';

/** Put the beacon immediately before </body>. Idempotent: a page that
 *  already carries the token comes back untouched, so a build run over an
 *  existing dist tree can never inject it twice. */
function withBeacon(html) {
  if (html.includes('cloudflareinsights.com')) return html;
  const i = html.lastIndexOf('</body>');
  if (i === -1) throw new Error('no </body> to anchor the analytics beacon to');
  return html.slice(0, i) + BEACON + html.slice(i);
}

// ── build ────────────────────────────────────────────────────────────
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

/* ── content hashing ──────────────────────────────────────────────────
 * The CSS and JS filenames carry a hash of their own contents, which is
 * what lets netlify.toml serve them `immutable` for a year. Before this,
 * the names were fixed, so the only safe header was a one-hour max-age
 * plus a revalidation request per asset per visit — PageSpeed flagged all
 * three files under "Use efficient cache lifetimes".
 *
 * A changed build produces a new filename, so a stale cached copy can
 * never be served: there is nothing to invalidate.
 */
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 8);

/* An unclosed comment in one partial silently swallows the rules after
   it (twice so far: a pruned light-mode rule and the hero hotspots).
   Fail the build instead of shipping a quietly broken stylesheet. */
for (const f of manifest.styles) {
  const css = read(path.join(SRC, 'styles', f));
  const open = (css.match(/\/\*/g) || []).length, close = (css.match(/\*\//g) || []).length;
  if (open !== close) throw new Error(`src/styles/${f}: ${open} "/*" but ${close} "*/" (unclosed comment)`);
  /* A stray "}" is just as quiet: the browser folds it into the next
     selector, which then matches nothing (60-section-motion.css lost its
     .sm-stars rule this way until 2026-10-07). Count braces outside
     comments and strings. */
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '');
  let depth = 0;
  for (const ch of bare) {
    if (ch === '{') depth++;
    else if (ch === '}' && --depth < 0) throw new Error(`src/styles/${f}: a "}" closes nothing (stray brace)`);
  }
  if (depth) throw new Error(`src/styles/${f}: ${depth} unclosed "{"`);
}
const styleCss = minify.css(concat('styles', manifest.styles));
const mainJs = minify.js(concat('scripts/main', manifest.main));
// The GLB sits under img/ (cached immutable for a year), so its URL carries
// a content hash: a rebuilt scene reaches returning visitors.
// The hero posters are re-rendered from the same scene, so they get the same.
const fileV = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, rel))).digest('hex').slice(0, 8);
const glbV = fileV('img/hero3d/scene.glb');
const stampAssets = (code) => code
  .replace(/scene.glb'/g, "scene.glb?v=" + glbV + "'")
  .replace(/img\/hero3d\/(hero-poster-\w+\.webp)/g, (m, f) => `${m}?v=${fileV('img/hero3d/' + f)}`);
// Desktop-only effects (the 3D desk and friends) are their own bundle so
// phones never download them; 00-desktop-bundle-loader.js in effects.js
// fetches it on the dk layout, so its hashed name is written in there.
const effectsDkJs = stampAssets(minify.js(concat('scripts/effects', manifest.effectsDk)));
const DK_NAME = `effects-dk.${hash(effectsDkJs)}.js`;
const effectsSrc = stampAssets(minify.js(concat('scripts/effects', manifest.effects)));
if (!effectsSrc.includes("'./effects-dk.js'")) throw new Error('effects.js lost its effects-dk.js loader');
const effectsJs = effectsSrc.replace("'./effects-dk.js'", `'./${DK_NAME}'`);

/** Fixed name -> hashed name, for rewriting references. */
const HASHED = {
  'style.css': `style.${hash(styleCss)}.css`,
  'main.js': `main.${hash(mainJs)}.js`,
  'effects.js': `effects.${hash(effectsJs)}.js`,
  'effects-dk.js': DK_NAME,
};

/**
 * Point every reference at the hashed filename. Throws rather than
 * silently shipping a page with no stylesheet: a renamed reference in a
 * partial would otherwise produce an unstyled site that still built
 * cleanly.
 */
function rehash(markup, prefix, { require: mustExist = true } = {}) {
  let out = markup;
  for (const [from, to] of Object.entries(HASHED)) {
    const ref = prefix + from;
    const hits = out.split(ref).length - 1;
    if (hits === 0) {
      if (mustExist && from === 'style.css') {
        throw new Error(`no reference to ${ref} found — cannot hash it`);
      }
      continue;
    }
    out = out.split(ref).join(prefix + to);
  }
  return out;
}

/**
 * AVIF where it helps: an <img> whose WebP files all have a smaller AVIF
 * twin (made by make-avif.py) is wrapped in <picture class="av"> with an
 * AVIF <source>; the WebP stays as the fallback. Existing <picture>s and
 * lazy data-src images are left alone. picture.av is display:contents,
 * so layouts that size the <img> are unchanged.
 */
function withAvif(markup, prefix) {
  const twin = f => path.join(ROOT, f.slice(prefix.length).split('?')[0].replace(/\.webp$/, '.avif'));
  return markup.replace(/<picture\b[\s\S]*?<\/picture>|<img\b[^>]*>/g, tag => {
    if (tag.startsWith('<picture') || /\bdata-src=/.test(tag)) return tag;
    const src = (tag.match(/\bsrc="([^"]+)"/) || [])[1];
    if (!src || !/\.webp(\?|$)/.test(src)) return tag;
    const set = (tag.match(/\bsrcset="([^"]+)"/) || [])[1] || src;
    const files = set.split(',').map(s => s.trim().split(/\s+/)[0]);
    if (!files.every(f => f.startsWith(prefix) && /\.webp(\?|$)/.test(f) && fs.existsSync(twin(f)))) return tag;
    const sizes = (tag.match(/\bsizes="([^"]+)"/) || [])[1];
    return `<picture class="av"><source type="image/avif" srcset="${set.replace(/\.webp/g, '.avif')}"${sizes ? ` sizes="${sizes}"` : ''}>${tag}</picture>`;
  });
}

const outputs = {
  'index.html': withBeacon(rehash(stampAssets(withAvif(minify.html(buildHtml()), '')), './')),
  'sitemap.xml': buildSitemap(),
  [HASHED['style.css']]: styleCss,
  [HASHED['main.js']]: mainJs,
  [HASHED['effects.js']]: effectsJs,
  [DK_NAME]: effectsDkJs,
};

for (const [name, content] of Object.entries(outputs)) {
  fs.writeFileSync(path.join(DIST, name), content);
}

// Static assets that ship as-is. Anything NOT listed here never reaches
// dist, which is the point: `publish = "dist"` means internal working
// folders cannot leak just because someone forgot a .gitignore line.
// netlify.toml and scripts/ are deliberately absent: Netlify reads the
// config from the repo root, not the publish directory, and the build
// script is tooling rather than site content. Shipping either would put
// build internals on the public site.
const STATIC = [
  'img', 'cursors', 'case-studies', 'fonts', 'thanks', 'now', 'uses',
  'favicon.png', 'og-preview.jpg', 'robots.txt',
  'humans.txt', 'llms.txt', '404.html', '.well-known', 'vendor',
];
let copied = 0;
for (const item of STATIC) copied += copy(item);

// security.txt must carry an Expires date under a year ahead (RFC 9116), so
// every deploy stamps a fresh one 360 days out instead of a date someone has
// to remember to renew. The monthly security-txt workflow warns if no deploy
// has refreshed it for so long that it nears the date.
{
  const p = path.join(DIST, '.well-known', 'security.txt');
  const expires = new Date(Date.now() + 360 * 864e5).toISOString().slice(0, 10) + 'T00:00:00.000Z';
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/^Expires: .*$/m, 'Expires: ' + expires));
}

// case-studies/*.html load ../style.css, so they need the hashed name too.
// They are plain files copied verbatim above rather than assembled from
// partials, so the rewrite happens here, after the copy.
// /now and /uses are one level deep too and share the case-study layout.
for (const dir of ['case-studies', 'now', 'uses']) {
  for (const f of fs.readdirSync(path.join(DIST, dir))) {
    if (!f.endsWith('.html')) continue;
    const p = path.join(DIST, dir, f);
    fs.writeFileSync(p, withBeacon(rehash(withAvif(minify.html(fs.readFileSync(p, 'utf8')), '../'), '../')));
  }
}

// The remaining standalone pages — 404.html and thanks/index.html — are
// copied verbatim rather than assembled, so they need the beacon stamped in
// after the copy too. Walking dist rather than naming files means a page
// added to STATIC later is covered without anyone remembering to come here.
for (const rel of ['404.html', 'thanks']) {
  const abs = path.join(DIST, rel);
  if (!fs.existsSync(abs)) continue;
  const files = fs.statSync(abs).isDirectory()
    ? fs.readdirSync(abs).map(f => path.join(abs, f))
    : [abs];
  for (const f of files) {
    if (!f.endsWith('.html')) continue;
    fs.writeFileSync(f, withBeacon(fs.readFileSync(f, 'utf8')));
  }
}

// Google Search Console verification file, if present
for (const f of fs.readdirSync(ROOT)) {
  if (/^google[0-9a-f]+\.html$/.test(f)) copied += copy(f);
}

// ── security policy ──────────────────────────────────────────────────
// Content-Security-Policy, written to dist/_headers (Netlify applies it with
// the netlify.toml headers). Scripts run only from this site, Cloudflare's
// analytics beacon and Google reCAPTCHA, plus inline scripts whose exact
// text is hashed below: an injected inline script has no matching hash and
// does not run, so there is no 'unsafe-inline' for scripts. Inline event
// handlers (onclick=...) cannot be hashed this way, so the build refuses
// them. The rest:
//   'wasm-unsafe-eval'  meshopt decoder that unpacks the GLB scenes
//   style 'unsafe-inline'  style="--brand:..." attributes throughout
//   img/connect blob: data:  GLTFLoader reads embedded textures via blob URLs
//   frame  reCAPTCHA's checkbox and challenge iframes
const scriptHashes = new Set();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!e.name.endsWith('.html')) continue;
    const html = fs.readFileSync(p, 'utf8');
    for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
      const attrs = m[1] || '';
      if (/\bsrc\s*=/i.test(attrs) || /application\/ld\+json/i.test(attrs)) continue;
      scriptHashes.add(`'sha256-${crypto.createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
    }
    const handler = html.replace(/<script[\s\S]*?<\/script>/gi, '').match(/<[a-z][^>]*\son[a-z]+\s*=/i);
    if (handler) throw new Error(`${path.relative(DIST, p)}: inline event handler (${handler[0].slice(-40)}); use addEventListener, the CSP blocks it`);
  }
})(DIST);
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'wasm-unsafe-eval' ${[...scriptHashes].join(' ')} https://static.cloudflareinsights.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' blob: data: https://cloudflareinsights.com",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');
fs.writeFileSync(path.join(DIST, '_headers'), `/*
  Content-Security-Policy: ${CSP}
`);

// ── report ───────────────────────────────────────────────────────────
const kb = n => (n / 1024).toFixed(0).padStart(4) + ' KB';
// Partial counts are keyed off the ORIGINAL name, since the shipped one now
// carries a content hash.
const PARTS = {
  'index.html': ['sections', lines(read(path.join(SRC, '_order.txt'))).length],
  [HASHED['style.css']]: ['style partials', manifest.styles.length],
  [HASHED['main.js']]: ['main partials', manifest.main.length],
  [HASHED['effects.js']]: ['effects partials', manifest.effects.length],
  [DK_NAME]: ['desktop effects partials', manifest.effectsDk.length],
};
console.log('built dist/');
for (const [name, content] of Object.entries(outputs)) {
  const p = PARTS[name];
  const from = p ? `from ${p[1]} ${p[0]}` : 'generated';
  console.log(`  ${name.padEnd(24)}${kb(Buffer.byteLength(content))}  ${from}`);
}
console.log(`  ${'static'.padEnd(24)}${String(copied).padStart(4)} files`);
console.log(`  ${'_headers'.padEnd(24)}CSP with ${scriptHashes.size} inline script hashes`);
