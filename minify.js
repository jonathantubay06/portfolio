/**
 * minify.js — whitespace/comment minifiers for the build.
 *
 * Deliberately hand-written rather than adding esbuild or terser. The site
 * ships three generated files and the only wins on the table were comments
 * and indentation (PageSpeed measured 10 KiB of CSS and 14 KiB of JS), so a
 * dependency, a lockfile and an npm install step on every Netlify build
 * would have bought very little.
 *
 * The rules that follow from that: nothing here renames, reorders, removes
 * or rewrites code. No identifier mangling, no dead-code elimination, no
 * semicolon removal. Newlines survive in the JS output so automatic
 * semicolon insertion behaves exactly as it does in the source.
 *
 * Every minifier is a character scanner rather than a regex pass, because
 * the source contains `//` inside strings and URLs, `/` inside regex
 * literals, and braces inside template literals — all of which a regex
 * pass would corrupt.
 *
 * build.js runs `node --check` on the JS output as a guard.
 */
'use strict';

/* ── CSS ──────────────────────────────────────────────────────────────
 * Strips comments, collapses whitespace runs, and drops the whitespace
 * that is never significant (around { } ; ,) plus the semicolon before a
 * closing brace. Whitespace around : + > ~ is left alone: `a :hover` and
 * `a:hover` are different selectors, so removing it is not always safe and
 * the bytes are not worth the risk.
 */
function css(src) {
  let out = '';
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];

    // comment
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      // A comment separates tokens, so leave a space behind if there is not
      // one already; the final pass squeezes it where it is redundant.
      if (out.length && !/\s$/.test(out)) out += ' ';
      continue;
    }

    // string — copied verbatim, escapes included
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === quote) { j++; break; }
        j++;
      }
      out += src.slice(i, j);
      i = j;
      continue;
    }

    // unquoted url(...) — may hold characters that look like syntax
    if (c === 'u' && src.slice(i, i + 4).toLowerCase() === 'url(') {
      const end = src.indexOf(')', i);
      if (end !== -1 && !/["']/.test(src.slice(i + 4, end))) {
        out += src.slice(i, end + 1).replace(/\s+/g, '');
        i = end + 1;
        continue;
      }
    }

    if (/\s/.test(c)) {
      let j = i;
      while (j < n && /\s/.test(src[j])) j++;
      out += ' ';
      i = j;
      continue;
    }

    out += c;
    i++;
  }

  return out
    .replace(/\s*([{};,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

/* ── JavaScript ───────────────────────────────────────────────────────
 * Removes comments and per-line indentation, nothing else. The scanner
 * exists to know when a `/` opens a regex literal rather than a comment or
 * a division, and to copy strings and template literals through untouched.
 */
const REGEX_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw',
]);

function js(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  // Last significant character emitted, used to tell a regex literal from a
  // division: after a value (identifier, number, `)`, `]`) a slash divides;
  // after an operator or at the start of a statement it opens a regex.
  let prev = '';
  let prevWord = '';

  const regexCanFollow = () => {
    if (prev === '') return true;
    if (REGEX_KEYWORDS.has(prevWord)) return true;
    return !/[A-Za-z0-9_$)\]]/.test(prev);
  };

  const emit = (s) => {
    out += s;
    const t = s.replace(/\s+$/, '');
    if (t) {
      prev = t[t.length - 1];
      const m = t.match(/[A-Za-z_$][A-Za-z0-9_$]*$/);
      prevWord = m ? m[0] : '';
    }
  };

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];

    if (c === '/' && c2 === '/') {
      const end = src.indexOf('\n', i);
      i = end === -1 ? n : end;          // leave the newline itself
      continue;
    }

    if (c === '/' && c2 === '*') {
      const end = src.indexOf('*/', i + 2);
      const body = src.slice(i, end === -1 ? n : end + 2);
      i = end === -1 ? n : end + 2;
      // A block comment that spanned lines must leave a newline behind, or
      // two statements can end up on one line without the semicolon that
      // ASI would otherwise have supplied.
      if (body.includes('\n')) out += '\n';
      continue;
    }

    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === quote) { j++; break; }
        j++;
      }
      emit(src.slice(i, j));
      i = j;
      continue;
    }

    // Template literal, including nested ${ ... } which may itself contain
    // strings, templates and braces.
    if (c === '`') {
      let j = i + 1;
      let depth = 0;
      while (j < n) {
        const ch = src[j];
        if (ch === '\\') { j += 2; continue; }
        if (depth === 0 && ch === '`') { j++; break; }
        if (depth === 0 && ch === '$' && src[j + 1] === '{') { depth = 1; j += 2; continue; }
        if (depth > 0) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          else if (ch === '"' || ch === "'" || ch === '`') {
            const q = ch;
            j++;
            while (j < n) {
              if (src[j] === '\\') { j += 2; continue; }
              if (src[j] === q) break;
              j++;
            }
          }
        }
        j++;
      }
      emit(src.slice(i, j));
      i = j;
      continue;
    }

    if (c === '/' && regexCanFollow()) {
      let j = i + 1;
      let inClass = false;
      let ok = false;
      while (j < n) {
        const ch = src[j];
        if (ch === '\\') { j += 2; continue; }
        if (ch === '\n') break;                       // not a regex after all
        if (ch === '[') inClass = true;
        else if (ch === ']') inClass = false;
        else if (ch === '/' && !inClass) { j++; ok = true; break; }
        j++;
      }
      if (ok) {
        while (j < n && /[a-z]/.test(src[j])) j++;    // flags
        emit(src.slice(i, j));
        i = j;
        continue;
      }
    }

    emit(c);
    i++;
  }

  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

/* ── HTML ─────────────────────────────────────────────────────────────
 * Comments only, plus minification of inline <style>, <script> and
 * JSON-LD. Text whitespace is left exactly as authored: collapsing it
 * changes rendering between inline elements, and the partials have no
 * pretty-printed indentation inside text nodes that would make it worth
 * the risk.
 *
 * <pre> and <textarea> are skipped explicitly — the contact form has a
 * <textarea> whose content is whitespace-significant.
 */
function html(src) {
  const SKIP = ['script', 'style', 'pre', 'textarea'];
  let out = '';
  let i = 0;
  const n = src.length;

  while (i < n) {
    if (src.startsWith('<!--', i)) {
      // Downlevel-revealed conditional comments are real markup; keep them.
      if (src.startsWith('<!--[if', i)) {
        const end = src.indexOf('-->', i);
        const stop = end === -1 ? n : end + 3;
        out += src.slice(i, stop);
        i = stop;
        continue;
      }
      const end = src.indexOf('-->', i);
      i = end === -1 ? n : end + 3;
      continue;
    }

    const skip = SKIP.find((t) =>
      src.startsWith('<' + t, i) && /[\s>]/.test(src[i + t.length + 1] || ''));

    if (skip) {
      const openEnd = src.indexOf('>', i);
      const closeTag = '</' + skip;
      const closeAt = src.toLowerCase().indexOf(closeTag, openEnd);
      const bodyEnd = closeAt === -1 ? n : closeAt;
      const openTag = src.slice(i, openEnd + 1);
      let body = src.slice(openEnd + 1, bodyEnd);

      if (skip === 'style') {
        body = css(body);
      } else if (skip === 'script') {
        if (/type\s*=\s*["']application\/ld\+json["']/i.test(openTag)) {
          try { body = JSON.stringify(JSON.parse(body)); } catch { /* leave as-is */ }
        } else if (!/\ssrc\s*=/i.test(openTag)) {
          body = js(body);
        }
      }

      out += openTag + body;
      i = bodyEnd;
      continue;
    }

    out += src[i];
    i++;
  }

  return out;
}

module.exports = { css, js, html };
