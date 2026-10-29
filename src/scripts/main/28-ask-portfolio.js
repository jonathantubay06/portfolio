/* ── ASK MY PORTFOLIO (2026-10-29) ─────────────────────────────
   The small chat under the FAQ. Sends the last few turns to /api/ask
   (netlify/functions/ask) and shows the answer as plain text: answers
   come back from a model, so they never go through innerHTML. One
   request at a time; on any failure it points to email instead.
══════════════════════════════════════ */
(function () {
  var box = document.getElementById('ask');
  if (!box || !window.fetch) return;
  box.hidden = false;
  var log = box.querySelector('.ask-log'), form = box.querySelector('.ask-form');
  var input = form.querySelector('input'), btn = form.querySelector('button');
  var turns = [], busy = false;
  var FAIL = {
    busy: 'Lots of questions right now. Try again in a few minutes, or email jonatsbuilds@gmail.com.',
    'not-configured': 'The AI helper is offline at the moment. Email jonatsbuilds@gmail.com and Jonathan will answer himself.',
    other: 'That did not go through. Email jonatsbuilds@gmail.com and Jonathan will answer himself.'
  };
  function add(cls, text) {
    var p = document.createElement('p');
    p.className = 'ask-msg ' + cls;
    p.textContent = text;
    log.appendChild(p);
    p.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    return p;
  }
  function ask(q) {
    q = q.trim().slice(0, 300);
    if (!q || busy) return;
    busy = true; btn.disabled = true; input.value = '';
    add('ask-q', q);
    turns.push({ role: 'user', text: q });
    var wait = add('ask-a ask-wait', 'Thinking…');
    fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: turns.slice(-6) }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        wait.classList.remove('ask-wait');
        if (res.ok && res.d.answer) { wait.textContent = res.d.answer; turns.push({ role: 'model', text: res.d.answer }); }
        else { wait.textContent = FAIL[res.d.error] || FAIL.other; turns.pop(); }
      })
      .catch(function () { wait.classList.remove('ask-wait'); wait.textContent = FAIL.other; turns.pop(); })
      .then(function () { busy = false; btn.disabled = false; });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  box.querySelectorAll('.ask-chip').forEach(function (c) { c.addEventListener('click', function () { ask(c.textContent); }); });
})();
