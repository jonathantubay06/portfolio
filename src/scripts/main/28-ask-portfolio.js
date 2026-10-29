/* ── ASK MY PORTFOLIO (2026-10-29) ─────────────────────────────
   The AI chat. Sends the last few turns to /api/ask
   (netlify/functions/ask) and shows the answer as plain text: answers
   come back from a model, so they never go through innerHTML. One
   request at a time; on any failure it points to email instead.

   Reachable from anywhere: a floating "Ask my AI" button on desktop,
   an "Ask AI" button in the phone sticky bar, and a button in the FAQ.
   The chat box (#ask, written in faq.html) is moved into a container so
   the page never grows as messages arrive; the log scrolls inside it.
   The container is a bubble panel: bottom-right on desktop, a bottom
   sheet over a dimmed page on phones (tap the dim area to close).
══════════════════════════════════════ */
(function () {
  var box = document.getElementById('ask');
  if (!box || !window.fetch) return;
  var log = box.querySelector('.ask-log'), form = box.querySelector('.ask-form');
  var input = form.querySelector('input'), btn = form.querySelector('button');
  var turns = [], busy = false, opener = null, ownsLock = false;
  var FAIL = {
    busy: 'Lots of questions right now. Try again in a few minutes, or email jonatsbuilds@gmail.com.',
    'not-configured': 'The AI helper is offline at the moment. Email jonatsbuilds@gmail.com and Jonathan will answer himself.',
    other: 'That did not go through. Email jonatsbuilds@gmail.com and Jonathan will answer himself.'
  };

  /* ── container ─────────────────────────────────────────────── */
  // The FAQ keeps a small prompt in the box's old place.
  var teaser = document.createElement('div');
  teaser.className = 'ask-teaser';
  teaser.innerHTML = '<p>Still curious? <em>Ask my AI</em>. It answers from this site only.</p><button type="button" class="btn btn-p" data-ask-open>Ask my AI</button>';
  box.before(teaser);

  var shell = document.createElement('div');
  shell.className = 'ask-shell ask-bubble';
  shell.setAttribute('role', 'dialog');
  shell.setAttribute('aria-label', 'Ask my AI');
  shell.hidden = true;
  shell.innerHTML = '<button class="ask-close" type="button" aria-label="Close chat">&times;</button>';
  shell.appendChild(box);
  var scrim = document.createElement('div');
  scrim.className = 'ask-scrim';
  document.body.appendChild(scrim);
  document.body.appendChild(shell);
  box.hidden = false;

  // Floating launcher (desktop and tablets without the sticky bar).
  var fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'ask-fab';
  fab.setAttribute('data-ask-open', '');
  fab.innerHTML = '<span class="ask-fab-dot" aria-hidden="true"></span>Ask my AI';
  document.body.appendChild(fab);

  // Phone launcher inside the sticky "Let's talk" bar.
  var bar = document.getElementById('mobileCta');
  if (bar) {
    var mb = document.createElement('button');
    mb.type = 'button';
    mb.className = 'cta-ask';
    mb.setAttribute('data-ask-open', '');
    mb.textContent = 'Ask AI';
    bar.insertBefore(mb, bar.querySelector('.cta-top'));
  }

  function isOpen() { return !shell.hidden; }
  function open(e) {
    if (isOpen()) { close(); return; }
    opener = e.currentTarget;
    shell.hidden = false;
    // Phones: the sheet covers most of the screen, so lock the page.
    if (matchMedia('(max-width:600px)').matches) { document.documentElement.classList.add('modal-open'); ownsLock = true; }
    document.documentElement.classList.add('ask-is-open');
    // Phones would pop the keyboard over the example questions.
    if (!matchMedia('(pointer:coarse)').matches) input.focus();
    else shell.querySelector('.ask-close').focus();
  }
  function cleanup() {
    document.documentElement.classList.remove('ask-is-open');
    if (ownsLock) { ownsLock = false; document.documentElement.classList.remove('modal-open'); }
    var o = opener; opener = null;
    if (o && o.isConnected) o.focus();
  }
  function close() {
    shell.hidden = true;
    cleanup();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) close(); });
  scrim.addEventListener('click', close);
  shell.querySelector('.ask-close').addEventListener('click', close);
  document.querySelectorAll('[data-ask-open]').forEach(function (b) {
    b.setAttribute('aria-haspopup', 'dialog');
    b.addEventListener('click', open);
  });

  /* ── chat ──────────────────────────────────────────────────── */
  function add(cls, text) {
    var p = document.createElement('p');
    p.className = 'ask-msg ' + cls;
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    return p;
  }
  function ask(q) {
    q = q.trim().slice(0, 300);
    if (!q || busy) return;
    busy = true; btn.disabled = true; input.value = '';
    box.classList.add('ask-started');
    add('ask-q', q);
    turns.push({ role: 'user', text: q });
    var wait = add('ask-a ask-wait', 'Thinking…');
    fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: turns.slice(-6) }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        wait.classList.remove('ask-wait');
        if (res.ok && res.d.answer) { wait.textContent = res.d.answer; turns.push({ role: 'model', text: res.d.answer }); }
        else { wait.textContent = FAIL[res.d.error] || FAIL.other; turns.pop(); }
        log.scrollTop = log.scrollHeight;
      })
      .catch(function () { wait.classList.remove('ask-wait'); wait.textContent = FAIL.other; turns.pop(); })
      .then(function () { busy = false; btn.disabled = false; });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  box.querySelectorAll('.ask-chip').forEach(function (c) { c.addEventListener('click', function () { ask(c.textContent); }); });
})();
