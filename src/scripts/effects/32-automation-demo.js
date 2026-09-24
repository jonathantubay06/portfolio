/* ── 32. AUTOMATION DEMO ──────────────────────────────────────
   Services section: three nodes (When / Then / And), each with three
   options. Choosing an option swaps the node's logo and label. "Run it"
   sends a signal down the chain: node 1 fires, the packet crosses the
   first link, node 2 fires, and so on, while the log fills in with the
   sample data attached to each chosen option (data-log).

   The CTA underneath is a .qp-btn, so the existing quick-pick script
   pre-selects "Workflow Automation" in the contact form and scrolls there.
   Reduced motion: the run still happens, with no travel animation.
══════════════════════════════════════ */
(function(){
  const demo = document.getElementById('automation-demo');
  if (!demo) return;
  const nodes = [...demo.querySelectorAll('.ad-node')];
  const links = [...demo.querySelectorAll('.ad-link')];
  const log = demo.querySelector('.ad-log');
  const runBtn = demo.querySelector('.ad-run');
  const STEP = PREFERS_REDUCED_MOTION ? 250 : 750;
  let running = false, timers = [];

  nodes.forEach(node => {
    const face = node.querySelector('.ad-face');
    node.querySelectorAll('.ad-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        node.querySelectorAll('.ad-opt').forEach(o => o.setAttribute('aria-pressed', String(o === opt)));
        const tile = face.querySelector('.ptile');
        tile.style.setProperty('--brand', opt.dataset.brand);
        const svg = tile.querySelector('svg');
        svg.classList.toggle('gen', opt.hasAttribute('data-gen'));
        svg.querySelector('use').setAttribute('href', '#ico-' + opt.dataset.icon);
        face.querySelector('.ad-name').textContent = opt.textContent;
        // A changed flow invalidates the last run.
        reset();
        face.classList.remove('is-swapped'); void face.offsetWidth; face.classList.add('is-swapped');
      });
    });
  });

  function reset() {
    timers.forEach(clearTimeout); timers = [];
    running = false;
    demo.classList.remove('is-running', 'is-done');
    nodes.forEach(n => n.classList.remove('is-fired'));
    links.forEach(l => l.classList.remove('is-flowing'));
    log.textContent = '';
    runBtn.disabled = false;
  }

  function line(text) {
    const li = document.createElement('li');
    li.textContent = text;
    log.appendChild(li);
  }

  runBtn.addEventListener('click', () => {
    if (running) return;
    reset();
    running = true;
    runBtn.disabled = true;
    demo.classList.add('is-running');
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    nodes.forEach((node, i) => {
      const t = i * STEP * 2;
      at(t, () => {
        node.classList.add('is-fired');
        line('✓ ' + node.querySelector('.ad-opt[aria-pressed="true"]').dataset.log);
      });
      if (links[i]) at(t + STEP * .35, () => links[i].classList.add('is-flowing'));
    });
    at((nodes.length - 1) * STEP * 2 + STEP, () => {
      line('Done. Nobody had to copy and paste anything.');
      demo.classList.remove('is-running');
      demo.classList.add('is-done');
      running = false;
      runBtn.disabled = false;
      runBtn.firstChild.textContent = 'Run again ';
    });
  });
})();
