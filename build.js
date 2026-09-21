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
 *   5. copies static assets across
 *
 * Concatenation order is authoritative and lives in src/manifest.json.
 * CSS cascade and the IIFE execution order in the JS both depend on it,
 * so the build must never sort or dedupe.
 *
 * Usage:  node build.js            build once
 *         node build.js --check    build, then verify byte-for-byte
 *                                  against the committed flat files
 */
'use strict';
const fs = require('fs');
const path = require('path');

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

// ── build ────────────────────────────────────────────────────────────
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const outputs = {
  'index.html':  buildHtml(),
  'sitemap.xml': buildSitemap(),
  'style.css':  concat('styles', manifest.styles),
  'main.js':    concat('scripts/main', manifest.main),
  'effects.js': concat('scripts/effects', manifest.effects),
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
  'img', 'cursors', 'case-studies',
  'favicon.png', 'og-preview.jpg', 'robots.txt',
  'humans.txt', '404.html',
];
let copied = 0;
for (const item of STATIC) copied += copy(item);

// Google Search Console verification file, if present
for (const f of fs.readdirSync(ROOT)) {
  if (/^google[0-9a-f]+\.html$/.test(f)) copied += copy(f);
}

// ── report ───────────────────────────────────────────────────────────
const kb = n => (n / 1024).toFixed(0).padStart(4) + ' KB';
console.log('built dist/');
for (const [name, content] of Object.entries(outputs)) {
  const parts = name === 'index.html'
    ? lines(read(path.join(SRC, '_order.txt'))).length
    : (manifest[name.replace(/\.(css|js)$/, '').replace('style', 'styles')] || {}).length;
  const from = parts === undefined ? 'generated' : `from ${parts} partials`;
  console.log(`  ${name.padEnd(12)}${kb(Buffer.byteLength(content))}  ${from}`);
}
console.log(`  ${'static'.padEnd(12)}${String(copied).padStart(4)} files`);

// ── optional verification ────────────────────────────────────────────
if (process.argv.includes('--check')) {
  console.log('\nbyte-for-byte check against the flat files:');
  let ok = true;
  for (const name of Object.keys(outputs)) {
    const flat = path.join(ROOT, name);
    if (!fs.existsSync(flat)) { console.log(`  ${name.padEnd(12)} no flat file to compare`); continue; }
    const same = Buffer.compare(fs.readFileSync(flat), Buffer.from(outputs[name])) === 0;
    if (!same) ok = false;
    console.log(`  ${name.padEnd(12)} ${same ? 'IDENTICAL' : 'DIFFERS'}`);
  }
  if (!ok) process.exitCode = 1;
}
