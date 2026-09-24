/* ── 34. EXPERIENCE | CERTIFICATIONS TABS + 3D CERT CAROUSEL ───
   Tabs: standard ARIA tabs. Click or arrow keys switch; the inactive
   panel gets `hidden`. An ink bar slides under the active tab.

   Carousel: the four certification groups become a 3D coverflow. The
   front group faces you; its neighbours sit behind it, turned toward the
   centre and dimmed. Arrows, the pips, a click on a side card, arrow keys
   (while the carousel has focus), and a horizontal drag or swipe all
   turn it. Each card keeps its soft tilt (28-soft-tilt.js) when it is at
   the front.

   Without JS, both panels show one after the other and the groups stay a
   grid, as before.
══════════════════════════════════════ */
(function(){
  /* ── tabs ─────────────────────────────────────────────────────── */
  const list = document.querySelector('.exp-tabs');
  if (list) {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const ink = list.querySelector('.exp-tab-ink');
    const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
    list.classList.add('is-js');

    function moveInk(tab) {
      if (!ink) return;
      ink.style.width = tab.offsetWidth + 'px';
      ink.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
    }
    function select(i, focus) {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
        if (on) panels[j].classList.remove('exp-panel-in'), void panels[j].offsetWidth, panels[j].classList.add('exp-panel-in');
      });
      moveInk(tabs[i]);
      if (focus) tabs[i].focus();
      // A panel that was hidden when its reveal observer fired never got .on
      panels[i].querySelectorAll('.r:not(.on)').forEach(el => el.classList.add('on'));
      if (panels[i].id === 'panel-certs') layout();
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', e => {
        const k = e.key;
        if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End') return;
        e.preventDefault();
        const n = tabs.length;
        const to = k === 'Home' ? 0 : k === 'End' ? n - 1 : (i + (k === 'ArrowRight' ? 1 : -1) + n) % n;
        select(to, true);
      });
    });
    select(0);
    window.addEventListener('resize', () => moveInk(tabs.find(t => t.getAttribute('aria-selected') === 'true')));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveInk(tabs.find(t => t.getAttribute('aria-selected') === 'true')));
  }

  /* ── certificate coverflow ────────────────────────────────────── */
  const wrap = document.querySelector('.certs-groups');
  const ctrl = document.querySelector('.cert-ctrl');
  let layout = () => {};
  if (!wrap || !ctrl) return;
  const cards = [...wrap.querySelectorAll(':scope > .cert-group')];
  if (cards.length < 2) return;

  wrap.classList.add('is-carousel');
  wrap.setAttribute('tabindex', '0');
  wrap.setAttribute('aria-roledescription', 'carousel');
  wrap.setAttribute('aria-label', 'Certification groups');
  ctrl.hidden = false;
  const pipsBox = ctrl.querySelector('.cert-pips');
  const pips = cards.map((card, i) => {
    const name = card.querySelector('.cert-group-name');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cert-pip';
    b.setAttribute('aria-label', (name ? name.textContent.trim() : 'Group ' + (i + 1)));
    b.addEventListener('click', () => go(i));
    pipsBox.appendChild(b);
    return b;
  });
  let idx = 0;

  layout = function () {
    const n = cards.length;
    cards.forEach((card, i) => {
      let p = i - idx;
      if (p > n / 2) p -= n;
      if (p < -n / 2) p += n;
      const a = Math.abs(p);
      card.style.setProperty('--p', p);
      card.style.setProperty('--a', a);
      card.classList.toggle('is-front', p === 0);
      card.classList.toggle('is-far', a >= 2);
      card.setAttribute('aria-hidden', String(p !== 0));
      card.inert = p !== 0;
      card.style.zIndex = String(10 - a);
    });
    pips.forEach((b, i) => b.setAttribute('aria-current', String(i === idx)));
    // Height fits the tallest group, so the arrows below do not jump as
    // the carousel turns and no side card pokes out underneath.
    wrap.style.height = Math.max(...cards.map(c => c.offsetHeight)) + 'px';
  };

  function go(i) {
    idx = (i + cards.length) % cards.length;
    layout();
  }
  ctrl.querySelectorAll('.cert-arrow').forEach(b => b.addEventListener('click', () => go(idx + Number(b.dataset.dir))));
  // Clicking a side card brings it to the front. It is inert while at the
  // side, so the click is caught on the carousel and mapped by position.
  wrap.addEventListener('click', e => {
    const r = wrap.getBoundingClientRect();
    const x = e.clientX - r.left;
    if (x < r.width * .22) go(idx - 1);
    else if (x > r.width * .78) go(idx + 1);
  });
  wrap.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(idx - 1); }
  });
  // Drag / swipe
  let sx = null, sy = null;
  wrap.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  wrap.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(idx + (dx < 0 ? 1 : -1));
  });
  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  layout();
})();
