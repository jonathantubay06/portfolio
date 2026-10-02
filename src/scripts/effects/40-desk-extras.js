/* ═══════════════════════════════════════
   40. DESK EXTRAS (2026-10-02)
   Builds on the hero scene (36-hero-3d.js, via window.__hero3d) and the
   shared section renderer (39-section-3d.js, via window.__sm3dApi):
     A  dogs react to the primary CTAs ('dog-cta' event)
     B  keyboard shortcuts for the clickable desk objects
     C  desk monitor: a bezel + stand around the floating chart, whose
        canvas becomes a live ops dashboard (ticking counters)
     D  before/after desk toggle: procedural clutter + camera dolly in
        3D; an SVG overlay on the plate everywhere else
     E  live automation pipeline (Shopify -> n8n -> Cin7 -> Slack) above
        the 3-click demo, hover a node for what it replaces
     F  project cards flip to show their result stat
   3D parts (A, C, D-3D, E) run only on desktops with motion allowed,
   the same gate as 36/39. D's overlay and F work on every device, with
   no 3D transforms on touch screens and no motion when it is reduced.
═══════════════════════════════════════ */
(function () {
  var DESK = matchMedia('(min-width:1024px) and (pointer:fine) and (prefers-reduced-motion:no-preference)').matches;
  var FINE = matchMedia('(pointer:fine)').matches;
  function el(tag, cls, parent, html) {
    var e = document.createElement(tag); if (cls) e.className = cls;
    if (html) e.innerHTML = html; if (parent) parent.appendChild(e); return e;
  }
  function ease(x) { return x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x); }
  function onHero(fn) {
    if (window.__hero3d) fn(window.__hero3d);
    else addEventListener('hero3d:ready', function () { fn(window.__hero3d); }, { once: true });
  }

  /* ── A · dogs react to CTAs ─────────────────────────────────────── */
  if (DESK) {
    var last = 0;
    document.querySelectorAll('.hero-cta .btn, #navCta, a.btn[href="#contact"], a.btn[href="#work"]').forEach(function (b) {
      b.addEventListener('pointerenter', function () {
        var now = performance.now(); if (now - last < 900) return; last = now;
        var r = b.getBoundingClientRect();
        dispatchEvent(new CustomEvent('dog-cta', { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
      });
    });
  }

  /* ── B · keyboard equivalents for the desk links ─────────────────
     The 3D stage is aria-hidden and pointer-only, like the cube
     hotspots. These sit outside it, hidden until focused. */
  var heroSec = document.querySelector('.hero');
  var stage = document.getElementById('heroStage');
  var sceneEl = document.getElementById('heroScene');
  if (DESK && heroSec && stage) onHero(function () {
    var nav = el('nav', 'desk-keys', null, '<span>Desk:</span>' +
      '<a href="case-studies/inventory-sync">Laptop: inventory sync case study</a>' +
      '<button type="button" data-modal-open="modal-kdl-checker">Monitor: KDL video checker</button>' +
      '<a href="case-studies/moev">Tablet: MOEV case study</a>');
    nav.setAttribute('aria-label', 'Desk objects');
    stage.parentNode.insertBefore(nav, stage);
    nav.querySelector('button').addEventListener('click', function () {
      var b = document.querySelector('.btn-modal-open[data-modal="modal-kdl-checker"]'); if (b) b.click();
    });
  });

  /* plane frame of a flat mesh in world space: centre, half axes, normal */
  function frameOf(T, mesh, camPos) {
    var g = mesh.geometry; g.computeBoundingBox();
    var b = g.boundingBox, s = new T.Vector3(), c = new T.Vector3();
    b.getSize(s); b.getCenter(c);
    var ax = [0, 1, 2].sort(function (i, j) { return s.getComponent(j) - s.getComponent(i); });
    mesh.updateWorldMatrix(true, false);
    var M = mesh.matrixWorld, cw = c.clone().applyMatrix4(M);
    function half(i) { var p = c.clone(); p.setComponent(i, p.getComponent(i) + s.getComponent(i) / 2); return p.applyMatrix4(M).sub(cw); }
    var A = half(ax[0]), B = half(ax[1]);
    var u = Math.abs(A.y) > Math.abs(B.y) ? B : A, v = u === A ? B : A;
    if (v.y < 0) v.negate();
    var n = new T.Vector3().crossVectors(u, v).normalize();
    if (n.dot(camPos.clone().sub(cw)) < 0) { u.negate(); n.negate(); }
    return { c: cw, u: u, v: v, n: n, w: u.length() * 2, h: v.length() * 2 };
  }

  /* ── C · desk monitor with a live dashboard ────────────────────── */
  if (DESK) onHero(function (H) {
    var T = H.THREE, holo = H.root.getObjectByName('holo_chart');
    if (!holo || !holo.isMesh) return;
    var camPos = new T.Vector3(2.0, 3.2, 6.3);
    var f = frameOf(T, holo, camPos);
    var uh = f.u.clone().normalize(), vh = f.v.clone().normalize();
    var G = new T.Matrix4().makeBasis(uh, vh, f.n).setPosition(f.c);
    var mon = new T.Group(); mon.matrixAutoUpdate = false;
    holo.updateWorldMatrix(true, false);
    mon.matrix.copy(holo.matrixWorld.clone().invert().multiply(G));
    var dark = new T.MeshStandardMaterial({ color: 0x111a28, metalness: 0.5, roughness: 0.35 });
    var edge = new T.MeshStandardMaterial({ color: 0x0b2030, emissive: 0x00d4ff, emissiveIntensity: 0.6 });
    function box(w, h, d, x, y, z, m) { var o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); mon.add(o); H.picks.push(o); return o; }
    box(f.w + 0.05, f.h + 0.05, 0.03, 0, 0, -0.02, dark);
    box(f.w + 0.05, 0.008, 0.032, 0, -f.h / 2 - 0.024, -0.02, edge);
    /* stand down to the desk top (y = 0 in the scene) */
    var L = Math.max(0.05, (f.c.y - f.h / 2 - 0.03) / Math.max(0.5, vh.y));
    box(0.045, L, 0.03, 0, -f.h / 2 - 0.025 - L / 2, -0.05, dark);
    box(0.26, 0.016, 0.16, 0, -f.h / 2 - 0.025 - L, -0.05, dark);
    holo.add(mon);
    /* keep it on its stand: no float bob or parallax for this one */
    H.ticks.push(function () { if (holo.userData.p0) holo.position.copy(holo.userData.p0); });

    var st = { orders: 12480, skus: 48210, hours: 1312.4 }, flash = { orders: -9, skus: -9, hours: -9 }, next = { orders: 1, skus: 1.6, hours: 3 };
    var bars = [32, 44, 38, 52, 47, 60, 58, 66, 61, 72, 70, 78];
    function rr(g, x, y, w, h, r, fill) { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }
    H.screens.chart = function (g, t, w, h) {
      if (t > next.orders) { st.orders += 1 + (Math.random() * 3 | 0); flash.orders = t; next.orders = t + 0.7 + Math.random() * 0.8; bars[bars.length - 1] += 1; }
      if (t > next.skus) { st.skus += 6 + (Math.random() * 18 | 0); flash.skus = t; next.skus = t + 1.3 + Math.random(); }
      if (t > next.hours) { st.hours += 0.1; flash.hours = t; next.hours = t + 3.5; }
      if (bars[bars.length - 1] > 92) { bars.shift(); bars.push(40 + Math.random() * 30); }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#071223'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#00d4ff'; g.lineWidth = 3; g.beginPath(); g.roundRect(3, 3, w - 6, h - 6, 14); g.stroke();
      g.font = '700 19px system-ui,sans-serif'; g.fillStyle = '#9fdcff'; g.fillText('OPS DASHBOARD', 24, 38);
      var on = (t % 1.2) < 0.8;
      g.fillStyle = on ? '#2ee6a0' : '#14684a'; g.beginPath(); g.arc(w - 82, 32, 6, 0, 7); g.fill();
      g.font = '700 15px system-ui,sans-serif'; g.fillStyle = '#2ee6a0'; g.fillText('LIVE', w - 70, 38);
      [['Orders synced', st.orders.toLocaleString(), 'orders', '#00e6ff'],
       ['SKUs updated', st.skus.toLocaleString(), 'skus', '#ffa04a'],
       ['Hours saved', st.hours.toFixed(1), 'hours', '#2ee6a0']].forEach(function (row, i) {
        var x = 20 + i * 150, y = 62, k = Math.max(0, 1 - (t - flash[row[2]]) / 0.6);
        rr(g, x, y, 140, 96, 10, k > 0 ? 'rgba(0,212,255,' + (0.1 + k * 0.22) + ')' : 'rgba(255,255,255,.05)');
        g.font = '600 14px system-ui,sans-serif'; g.fillStyle = '#7fb0d4'; g.fillText(row[0], x + 12, y + 26);
        g.font = '800 30px system-ui,sans-serif'; g.fillStyle = row[3]; g.fillText(row[1], x + 12, y + 68 - k * 3);
        if (k > 0) { g.font = '700 14px system-ui,sans-serif'; g.fillStyle = '#fff'; g.fillText('▲', x + 118, y + 26); }
      });
      var bw = (w - 48) / bars.length;
      for (var i = 0; i < bars.length; i++) {
        var bh = bars[i] * 1.1;
        rr(g, 24 + i * bw, h - 22 - bh, bw - 6, bh, 4, i === bars.length - 1 ? '#00e6ff' : '#1e4a78');
      }
    };
  });

  /* ── D · before / after desk ───────────────────────────────────── */
  var mess = 0;               /* 0 = after (calm), 1 = before (clutter) */
  var setMess3d = null;
  if (heroSec && stage && sceneEl) {
    var tog = el('div', 'desk-ba', null,
      '<span class="desk-ba-k" id="deskBaK">The desk</span>' +
      '<button type="button" data-v="1" aria-pressed="false">Before</button>' +
      '<button type="button" data-v="0" aria-pressed="true">After</button>');
    tog.setAttribute('role', 'group'); tog.setAttribute('aria-labelledby', 'deskBaK');
    stage.parentNode.insertBefore(tog, stage.nextSibling);
    var live = el('span', 'sr-only', tog); live.setAttribute('aria-live', 'polite');
    /* SVG fallback overlay (phones, tablets, or no WebGL); the plate is 1500x1288 */
    var svg = el('div', 'desk-mess', sceneEl,
      '<svg viewBox="0 0 1500 1288" aria-hidden="true">' +
      '<g class="dm-i" style="--d:0s"><rect x="560" y="600" width="170" height="40" rx="4" fill="#e9eef5" transform="rotate(-8 640 620)"/><rect x="566" y="586" width="170" height="16" rx="3" fill="#cfd7e2" transform="rotate(-4 640 600)"/><rect x="572" y="570" width="170" height="16" rx="3" fill="#f4f7fb" transform="rotate(-11 650 580)"/></g>' +
      '<g class="dm-i" style="--d:.06s"><rect x="660" y="625" width="190" height="120" rx="4" fill="#f6f8fb" transform="rotate(9 750 680)"/><path d="M680 650h150M680 672h150M680 694h150M680 716h150M720 640v95M770 640v95" stroke="#9fb3c8" stroke-width="3" transform="rotate(9 750 680)"/></g>' +
      '<g class="dm-i" style="--d:.12s"><rect x="845" y="352" width="58" height="56" rx="3" fill="#ffe066" transform="rotate(-9 874 380)"/><rect x="1000" y="360" width="54" height="52" rx="3" fill="#ff9ec7" transform="rotate(7 1027 386)"/><rect x="1160" y="400" width="48" height="46" rx="3" fill="#ffe066" transform="rotate(12 1184 423)"/><rect x="640" y="300" width="50" height="48" rx="3" fill="#9fe3ff" transform="rotate(-14 665 324)"/></g>' +
      '<g class="dm-i dm-alert" style="--d:.18s"><circle cx="1072" cy="340" r="26" fill="#ff3b4e"/><text x="1072" y="351" text-anchor="middle" font-size="32" font-weight="800" fill="#fff" font-family="system-ui">!</text><circle cx="1240" cy="380" r="22" fill="#ff3b4e"/><text x="1240" y="390" text-anchor="middle" font-size="28" font-weight="800" fill="#fff" font-family="system-ui">!</text><circle cx="760" cy="280" r="22" fill="#ff3b4e"/><text x="760" y="290" text-anchor="middle" font-size="28" font-weight="800" fill="#fff" font-family="system-ui">3</text></g>' +
      '</svg>');
    function setMess(v) {
      mess = v;
      tog.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.v === v)); });
      live.textContent = v ? 'Before: a cluttered desk, manual work everywhere.' : 'After: the calm, automated desk.';
      if (setMess3d) setMess3d(v); else sceneEl.classList.toggle('is-messy', !!v);
    }
    tog.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setMess(+b.dataset.v); });
    /* sits over the bottom-left of the art, outside its aria-hidden box */
    function placeTog() {
      var hr = heroSec.getBoundingClientRect(), sr = sceneEl.getBoundingClientRect();
      tog.style.left = (sr.left - hr.left + 12) + 'px';
      tog.style.top = (sr.bottom - hr.top - tog.offsetHeight - 12) + 'px';
    }
    if (getComputedStyle(heroSec).position === 'static') heroSec.style.position = 'relative';
    placeTog(); new ResizeObserver(placeTog).observe(sceneEl);
    addEventListener('load', placeTog);

    if (DESK) onHero(function (H) {
      sceneEl.classList.remove('is-messy');
      var T = H.THREE, items = [], k = 0, kT = mess;
      var group = new T.Group(); group.visible = false; H.root.add(group);
      var camPos = new T.Vector3(2.0, 3.2, 6.3);
      function tex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; }
      var paper = new T.MeshStandardMaterial({ color: 0xe8edf3, roughness: 0.9, emissive: 0x30343a, emissiveIntensity: 0.4 });
      var sheet = new T.MeshStandardMaterial({ roughness: 0.9, side: T.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0.25,
        map: tex(256, 340, function (g, w, h) {
          g.fillStyle = '#f7f9fc'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a7d4f'; g.fillRect(0, 0, w, 26);
          g.strokeStyle = '#a8b8ca'; g.lineWidth = 2;
          for (var y = 40; y < h; y += 22) { g.beginPath(); g.moveTo(8, y); g.lineTo(w - 8, y); g.stroke(); }
          for (var x = 8; x < w; x += 62) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x, h - 8); g.stroke(); }
          g.fillStyle = '#e84a5f'; g.fillRect(70, 128, 62, 22); g.fillRect(132, 216, 62, 22);
        }) });
      sheet.emissiveMap = sheet.map;
      var noteC = [0xffe066, 0xff9ec7, 0x9fe3ff, 0xffb35c];
      function add(o, base, delay) { o.userData.base = base; o.userData.delay = delay; o.scale.setScalar(0.0001); group.add(o); items.push(o); return o; }
      /* paper stacks: [x, z, sheets] on free desk spots */
      [[-1.0, 0.62, 9], [0.62, 0.64, 7], [1.55, -0.2, 12]].forEach(function (p, i) {
        var stack = new T.Group(); stack.position.set(p[0], 0, p[1]);
        for (var j = 0; j < p[2]; j++) {
          var s = new T.Mesh(new T.BoxGeometry(0.3, 0.012, 0.4), paper);
          s.position.y = 0.006 + j * 0.013; s.rotation.y = (Math.random() - 0.5) * 0.35; stack.add(s);
        }
        add(stack, 1, i * 0.06);
      });
      /* spreadsheet printouts lying about */
      [[-0.55, 0.55, 0.4], [0.15, 0.78, -0.5], [-1.45, 0.25, 1.1]].forEach(function (p, i) {
        var m = new T.Mesh(new T.PlaneGeometry(0.34, 0.45), sheet);
        m.rotation.set(-Math.PI / 2, 0, p[2]); m.position.set(p[0], 0.004 + i * 0.001, p[1]);
        add(m, 1, 0.1 + i * 0.05);
      });
      /* sticky notes on the screens' frames */
      var noteG = new T.PlaneGeometry(0.11, 0.11);
      ['laptop_screen', 'tablet_screen', 'holo_chart'].forEach(function (name, si) {
        var m = H.root.getObjectByName(name); if (!m || !m.isMesh) return;
        var f = frameOf(T, m, camPos);
        [[0.92, 0.82], [-0.9, 0.6], [0.75, -0.85]].forEach(function (q, j) {
          if (si && j === 2) return;
          var n = new T.Mesh(noteG, new T.MeshStandardMaterial({ color: noteC[(si + j) % 4], roughness: 0.8, emissive: noteC[(si + j) % 4], emissiveIntensity: 0.35, side: T.DoubleSide }));
          var pos = f.c.clone().addScaledVector(f.u, q[0]).addScaledVector(f.v, q[1]).addScaledVector(f.n, 0.012);
          H.root.worldToLocal(pos); n.position.copy(pos);
          n.lookAt(H.root.localToWorld(pos.clone()).add(f.n));
          n.rotateZ((Math.random() - 0.5) * 0.5);
          add(n, 1, 0.2 + si * 0.08 + j * 0.04);
        });
        /* a red alert badge over each screen */
        var badge = new T.Sprite(new T.SpriteMaterial({ depthTest: false, transparent: true, map: tex(128, 128, function (g) {
          g.fillStyle = '#ff3b4e'; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 8; g.stroke();
          g.fillStyle = '#fff'; g.font = '900 76px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(si === 1 ? '3' : '!', 64, 92);
        }) }));
        var bp = f.c.clone().addScaledVector(f.u, 0.85).addScaledVector(f.v, 1.25);
        H.root.worldToLocal(bp); badge.position.copy(bp); badge.userData.p = bp.clone(); badge.renderOrder = 5;
        add(badge, 0.16, 0.35 + si * 0.08);
      });
      H.ticks.push(function (t, dt) {
        k += (kT - k) * Math.min(1, dt * 2.6);
        if (Math.abs(kT - k) < 0.001) k = kT;
        H.dolly = ease(k);
        group.visible = k > 0.002;
        if (!group.visible) return;
        for (var i = 0; i < items.length; i++) {
          var o = items[i], q = ease((k - o.userData.delay) / 0.5);
          var pop = q < 1 ? 1 + Math.sin(q * Math.PI) * 0.15 : 1;
          o.scale.setScalar(Math.max(0.0001, o.userData.base * q * pop));
          if (o.isSprite) { o.position.y = o.userData.p.y + Math.sin(t * 3 + i) * 0.02; o.material.opacity = q; var s = 1 + Math.max(0, Math.sin(t * 4 + i)) * 0.12; o.scale.multiplyScalar(s); }
        }
      });
      setMess3d = function (v) { kT = v; };
      if (mess) kT = 1;
    });
  }

  /* ── E · automation pipeline (desktop) ─────────────────────────── */
  var demo = document.getElementById('automation-demo');
  var board = demo && demo.querySelector('.ad-board');
  if (DESK && board) {
    var NODES = [
      { name: 'Shopify', c: 0x95bf47, tip: '<b>Shopify · new order</b>Replaces refreshing the admin for new orders', h: '~2 h/week' },
      { name: 'n8n', c: 0xea4b71, tip: '<b>n8n · checks &amp; routes</b>Replaces copy-paste between tabs and typo fixes', h: '~4 h/week' },
      { name: 'Cin7', c: 0x2f7fe0, tip: '<b>Cin7 · stock + sale</b>Replaces hand-keying stock changes and orders', h: '~3 h/week' },
      { name: 'Slack', c: 0xb05bd6, tip: '<b>Slack · team pinged</b>Replaces "did this ship?" emails', h: '~1 h/week' }
    ];
    var wrap = el('div', 'pipe3d');
    wrap.setAttribute('aria-hidden', 'true');
    board.parentNode.insertBefore(wrap, board);
    var ptip = el('div', 'pipe3d-tip', wrap);
    var built = false;
    var nearIO = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || built) return;
      built = true; nearIO.disconnect();
      var api = window.__sm3dApi; if (!api) { wrap.remove(); return; }
      api.engine().then(function () { buildPipe(api); }).catch(function () { wrap.remove(); });
    }, { rootMargin: '600px 0px' });
    var armP = function () { nearIO.observe(wrap); };
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', function () { setTimeout(armP, 1500); });
    else setTimeout(armP, 1500);

    function buildPipe(api) {
      var T = api.three(), scene = new T.Scene(); api.lights(scene, true);
      var X = [-2.7, -0.9, 0.9, 2.7], nodes = [];
      function label(text, col) {
        var c = document.createElement('canvas'); c.width = 256; c.height = 128;
        var g = c.getContext('2d');
        g.fillStyle = '#0b1424'; g.beginPath(); g.roundRect(0, 0, 256, 128, 22); g.fill();
        g.fillStyle = '#' + col.toString(16).padStart(6, '0'); g.beginPath(); g.roundRect(0, 0, 256, 12, 6); g.fill();
        g.fillStyle = '#fff'; g.font = '800 48px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(text, 128, 84);
        var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
      }
      var boxG = new T.BoxGeometry(1.2, 0.6, 0.45), faceG = new T.PlaneGeometry(1.1, 0.55);
      NODES.forEach(function (n, i) {
        var g = new T.Group(); g.position.x = X[i]; scene.add(g);
        var m = new T.MeshStandardMaterial({ color: 0x18243a, metalness: 0.35, roughness: 0.4, emissive: n.c, emissiveIntensity: 0.15 });
        g.add(new T.Mesh(boxG, m));
        var face = new T.Mesh(faceG, new T.MeshBasicMaterial({ map: label(n.name, n.c), transparent: true }));
        face.position.z = 0.228; g.add(face);
        nodes.push({ g: g, m: m, pulse: 0, hover: 0 });
      });
      var linkM = new T.MeshStandardMaterial({ color: 0x0b2030, emissive: 0x00d4ff, emissiveIntensity: 0.7 });
      for (var i = 0; i < 3; i++) {
        var L = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, X[i + 1] - X[i] - 1.2, 10), linkM);
        L.rotation.z = Math.PI / 2; L.position.set((X[i] + X[i + 1]) / 2, -0.05, 0); scene.add(L);
      }
      /* order packets: little order slips with a green tick */
      var pc = document.createElement('canvas'); pc.width = 96; pc.height = 64;
      (function (g) {
        g.fillStyle = '#f2f8ff'; g.beginPath(); g.roundRect(2, 2, 92, 60, 8); g.fill();
        g.fillStyle = '#2ee6a0'; g.beginPath(); g.arc(24, 32, 13, 0, 7); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(17, 32); g.lineTo(22, 37); g.lineTo(31, 27); g.stroke();
        g.fillStyle = '#5a7896'; g.fillRect(44, 22, 40, 7); g.fillRect(44, 36, 28, 7);
      })(pc.getContext('2d'));
      var ptex = new T.CanvasTexture(pc); ptex.colorSpace = T.SRGBColorSpace;
      var pG = new T.BoxGeometry(0.46, 0.3, 0.035), pM = [0, 0, 0, 0, 1, 1].map(function (f) { return f ? new T.MeshBasicMaterial({ map: ptex }) : new T.MeshStandardMaterial({ color: 0xdfe8f2 }); });
      var packets = [];
      for (i = 0; i < 4; i++) { var p = new T.Mesh(pG, pM); scene.add(p); packets.push(p); }
      var shadow = new T.Mesh(new T.PlaneGeometry(7.4, 1.1), new T.MeshBasicMaterial({ map: api.blobTex(), transparent: true, opacity: 0.35, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.36; scene.add(shadow);

      var cam = new T.PerspectiveCamera(24, 6, 0.1, 40);
      var v = { scene: scene, cam: cam, canvas: api.slot(wrap, 'sm-pipe'), ready: true };
      function size() { var r = wrap.getBoundingClientRect(); if (r.width) api.fit(v, r.width, r.height); var a = r.width / r.height, tn = Math.tan(12 * Math.PI / 180); cam.position.set(0, 0.85, Math.max(4.1 / (tn * a), 1.05 / tn)); cam.lookAt(0, 0.1, 0); }
      size(); new ResizeObserver(size).observe(wrap);
      var mx = 0, hov = -1, PER = 5.4, pv = new T.Vector3();
      v.update = function (t) {
        scene.rotation.y += ((mx * 0.12) - scene.rotation.y) * 0.06;
        for (var i = 0; i < packets.length; i++) {
          var u = ((t / PER + i / packets.length) % 1), x = X[0] + (X[3] - X[0]) * u;
          var seg = (x - X[0]) / (X[1] - X[0]), f = seg - Math.floor(seg);
          var P = packets[i];
          P.position.set(x, 0.42 + Math.sin(f * Math.PI) * 0.32, 0.05);
          P.rotation.set(0.25, Math.sin(t * 2 + i) * 0.4, Math.sin(f * Math.PI * 2) * 0.15);
          var vis = u > 0.02 && u < 0.98 ? 1 : 0; P.visible = !!vis;
          /* it lands on a node: that node pulses */
          for (var j = 0; j < 4; j++) if (Math.abs(x - X[j]) < 0.08) nodes[j].pulse = 1;
        }
        for (j = 0; j < 4; j++) {
          var N = nodes[j];
          N.pulse *= 0.9; N.hover += ((hov === j ? 1 : 0) - N.hover) * 0.15;
          N.g.scale.setScalar(1 + N.pulse * 0.08 + N.hover * 0.06);
          N.g.position.y = Math.sin(t * 1.4 + j) * 0.03 + N.hover * 0.06;
          N.m.emissiveIntensity = 0.15 + N.pulse * 0.6 + N.hover * 0.5;
        }
      };
      wrap.addEventListener('pointermove', function (e) {
        var r = wrap.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        var best = -1, bd = 70;
        for (var j = 0; j < 4; j++) {
          nodes[j].g.getWorldPosition(pv); pv.project(cam);
          var sx = (pv.x + 1) / 2 * r.width, sy = (1 - pv.y) / 2 * r.height;
          var d = Math.hypot(sx - (e.clientX - r.left), sy - (e.clientY - r.top));
          if (d < bd) { bd = d; best = j; ptip.style.left = sx + 'px'; ptip.style.top = (sy - r.height * 0.22) + 'px'; }
        }
        if (best !== hov) {
          hov = best;
          if (best >= 0) { ptip.innerHTML = NODES[best].tip + '<i>saves ' + NODES[best].h + ' (typical)</i>'; ptip.classList.add('on'); }
          else ptip.classList.remove('on');
        }
      });
      wrap.addEventListener('pointerleave', function () { hov = -1; mx = 0; ptip.classList.remove('on'); });
      api.addView(v);
      v.canvas.classList.add('is-live');
      wrap.classList.add('is-live');
      api.kick();
    }
  }

  /* ── F · project cards flip to their result ───────────────────── */
  document.querySelectorAll('.proj-card[data-modal]').forEach(function (card, i) {
    var modal = document.getElementById(card.dataset.modal), thumb = card.querySelector('.proj-thumb');
    if (!modal || !thumb) return;
    var met = modal.querySelector('.mh-metric'), res = modal.querySelector('.modal-result');
    if (!met && !res) return;
    var rt = res ? res.textContent.replace(/^\s*Result\s*/, '').trim() : '';
    var id = 'pcb-' + i;
    var back = el('div', 'pc-back', thumb,
      '<span class="pc-k">Result</span>' +
      (met ? '<b>' + met.querySelector('b').textContent + '</b><span class="pc-s">' + (met.querySelector('span') ? met.querySelector('span').textContent : '') + '</span>' : '') +
      (rt ? '<p>' + rt.replace(/[<>&]/g, '') + '</p>' : ''));
    back.id = id; back.setAttribute('aria-hidden', 'true');
    var btn = el('button', 'pc-flip-tab', thumb, 'Result');
    btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', id);
    btn.setAttribute('aria-label', 'Show the result for ' + ((card.querySelector('.proj-name') || {}).textContent || 'this project'));
    function flip(on) {
      thumb.classList.toggle('is-flipped', on);
      btn.setAttribute('aria-expanded', String(on)); back.setAttribute('aria-hidden', String(!on));
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); flip(!thumb.classList.contains('is-flipped')); });
    if (FINE) {
      btn.addEventListener('pointerenter', function () { flip(true); });
      card.addEventListener('pointerleave', function () { flip(false); });
    }
    btn.addEventListener('keydown', function (e) { if (e.key === 'Escape') flip(false); });
  });
  if (FINE) document.documentElement.classList.add('pc-3d');
})();
