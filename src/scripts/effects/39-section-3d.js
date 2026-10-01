/* ═══════════════════════════════════════
   39. SECTION 3D (desktop only)
   Added 2026-10-02. One shared WebGL renderer for everything 3D below
   the hero:
     - a mini laptop beside each featured project (.proj-feature) whose
       screen shows that project's screenshot; it turns slowly and
       follows the pointer. Procedural boxes, no extra model file.
     - Dumpling, cloned from the hero's img/hero3d/scene.glb (same
       versioned URL, so the browser cache serves it), walking in beside
       the contact form and waiting there, head up, tail going.

   One renderer, many views: the WebGL canvas is never in the page. Each
   view renders into a corner of it and is copied into its own small 2D
   canvas (.sm-slot) in the same task, so one context serves all of
   them and the hero's renderer stays the only other one.

   Loading: three.js (the hero's jsDelivr +esm build, so the module is
   shared) is imported only when #work or #contact comes within ~800px,
   never on the load event. The GLB loads only when #contact is near.
   The loop runs at ~30fps only while a slot is on screen and the tab is
   visible; it stops entirely otherwise. Placement measures the text in
   each card and skips a slot that would cover any of it.
═══════════════════════════════════════ */
(function () {
  var mq = matchMedia('(min-width:1024px) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  if (!mq.matches) return;
  var work = document.getElementById('work'), contact = document.getElementById('contact');
  var feats = [].slice.call(document.querySelectorAll('.proj-feature'));
  if (!work && !contact) return;

  var V = 'https://cdn.jsdelivr.net/npm/three@0.170.0';
  var BW = 600, BH = 400;                 /* shared drawing buffer, device px */
  var T = null, renderer = null, gl = null, modP = null;
  var views = [], running = false, last = 0, clock0 = performance.now();
  var px = innerWidth / 2, py = innerHeight / 2;
  var stat = window.__sm3d = { frames: 0, views: 0 };   /* read by the perf check */

  function engine() {
    if (modP) return modP;
    modP = import(V + '/+esm').then(function (m) {
      T = m;
      gl = document.createElement('canvas');
      renderer = new T.WebGLRenderer({ canvas: gl, antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(1);
      renderer.setSize(BW, BH, false);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      renderer.setScissorTest(true);
    });
    return modP;
  }

  /* ── view plumbing ─────────────────────────────────────────────── */
  function slot(parent, cls) {
    var c = document.createElement('canvas');
    c.className = 'sm-slot ' + cls;
    c.setAttribute('aria-hidden', 'true');
    parent.appendChild(c);
    return c;
  }
  var slotIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      for (var i = 0; i < views.length; i++) if (views[i].canvas === e.target) views[i].vis = e.isIntersecting;
    });
    kick();
  });
  function addView(v) {
    v.ctx = v.canvas.getContext('2d');
    v.vis = false;
    views.push(v); stat.views = views.length;
    slotIO.observe(v.canvas);
  }
  /* the slot's CSS box -> backing size, capped to the shared buffer */
  function fit(v, w, h) {
    var d = Math.min(devicePixelRatio || 1, 2);
    var dw = Math.min(BW, Math.round(w * d)), dh = Math.min(BH, Math.round(h * d));
    v.canvas.style.width = w + 'px'; v.canvas.style.height = h + 'px';
    if (v.canvas.width !== dw) v.canvas.width = dw;
    if (v.canvas.height !== dh) v.canvas.height = dh;
    v.cam.aspect = w / h; v.cam.updateProjectionMatrix();
  }

  function kick() {
    if (running || document.hidden) return;
    for (var i = 0; i < views.length; i++) if (views[i].vis && views[i].ready) { running = true; requestAnimationFrame(loop); return; }
  }
  function loop(now) {
    if (document.hidden) { running = false; return; }
    var any = false;
    for (var i = 0; i < views.length; i++) if (views[i].vis && views[i].ready) { any = true; break; }
    if (!any) { running = false; return; }     /* everything off screen: stop */
    requestAnimationFrame(loop);
    if (now - last < 32) return;              /* ~30fps is plenty for these */
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    var t = (now - clock0) / 1000;
    for (i = 0; i < views.length; i++) {
      var v = views[i];
      if (!v.vis || !v.ready) continue;
      var w = v.canvas.width, h = v.canvas.height;
      v.update(t, dt);
      renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h);
      renderer.clear();
      renderer.render(v.scene, v.cam);
      v.ctx.clearRect(0, 0, w, h);
      /* WebGL's origin is bottom-left: the view sits at the buffer's foot */
      v.ctx.drawImage(gl, 0, BH - h, w, h, 0, 0, w, h);
    }
    stat.frames++;
  }
  document.addEventListener('visibilitychange', kick);
  addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });

  /* ── free-space test: never cover text ───────────────────────────
     Collects the line boxes of every text node in `box` plus the boxes
     of pills/buttons, and returns true if rect r (client coords, with a
     margin) touches none of them. */
  function clear(box, r) {
    var rects = [], walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), n, rg = document.createRange();
    while ((n = walker.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      rg.selectNodeContents(n);
      var cr = rg.getClientRects();
      for (var i = 0; i < cr.length; i++) rects.push(cr[i]);
    }
    box.querySelectorAll('span, a, button, b, .ptags > *').forEach(function (e) {
      if (e.classList.contains('sm-slot')) return;
      var b = e.getBoundingClientRect();
      if (b.width && b.width < box.clientWidth * 0.9) rects.push(b);
    });
    var M = 8;
    for (var j = 0; j < rects.length; j++) {
      var q = rects[j];
      if (q.right + M > r.left && q.left - M < r.right && q.bottom + M > r.top && q.top - M < r.bottom) return false;
    }
    return true;
  }

  /* ── 5 · featured-project laptops ──────────────────────────────── */
  var LW = 176, LH = 120, laptopGeo = null;
  var SIZES = [[176, 120], [156, 106], [136, 92]];
  function laptopParts() {
    if (laptopGeo) return laptopGeo;
    laptopGeo = {
      base: new T.BoxGeometry(1.6, 0.07, 1.08),
      deck: new T.PlaneGeometry(1.42, 0.62),
      pad: new T.PlaneGeometry(0.5, 0.26),
      lid: new T.BoxGeometry(1.6, 1.04, 0.045),
      screen: new T.PlaneGeometry(1.48, 0.93),
      shadow: new T.PlaneGeometry(2.6, 1.8),
      metal: new T.MeshStandardMaterial({ color: 0x9aa6ba, metalness: 0.25, roughness: 0.42 }),
      keys: new T.MeshStandardMaterial({ color: 0x1c2430, metalness: 0.1, roughness: 0.8 }),
      padM: new T.MeshStandardMaterial({ color: 0x8592a6, metalness: 0.2, roughness: 0.45 }),
      shadowM: new T.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.55 })
    };
    return laptopGeo;
  }
  /* soft round contact shadow, drawn once */
  var blob = null;
  function blobTex() {
    if (blob) return blob;
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    blob = new T.CanvasTexture(c);
    return blob;
  }
  function lights(scene, cool) {
    scene.add(new T.HemisphereLight(0xcfe8ff, 0x0a1220, 1.1));
    var k = new T.DirectionalLight(0xffffff, 1.6); k.position.set(-2, 3, 3); scene.add(k);
    var r = new T.DirectionalLight(cool ? 0x33ccff : 0xffb070, 1.2); r.position.set(3, 1.5, -2); scene.add(r);
  }

  function placeLaptop(v) {
    var body = v.card.querySelector('.proj-body');
    var br = body.getBoundingClientRect();
    v.canvas.style.display = 'none';
    /* biggest first; the badge row's right end is usually the free spot */
    for (var s = 0; s < SIZES.length; s++) {
      var w = SIZES[s][0], h = SIZES[s][1];
      var spots = [[br.right - w - 10, br.top + 6], [br.right - w - 10, br.bottom - h - 6]];
      for (var i = 0; i < spots.length; i++) {
        var r = { left: spots[i][0], top: spots[i][1], right: spots[i][0] + w, bottom: spots[i][1] + h };
        if (clear(body, r)) {
          v.canvas.style.display = '';
          v.canvas.style.left = (r.left - br.left) + 'px';
          v.canvas.style.top = (r.top - br.top) + 'px';
          fit(v, w, h);
          return true;
        }
      }
    }
    return false;
  }

  function makeLaptop(card) {
    var P = laptopParts();
    var scene = new T.Scene(); lights(scene, true);
    var rig = new T.Group(); scene.add(rig);
    var base = new T.Mesh(P.base, P.metal); base.position.y = 0.035; rig.add(base);
    var deck = new T.Mesh(P.deck, P.keys); deck.rotation.x = -Math.PI / 2; deck.position.set(0, 0.071, -0.12); rig.add(deck);
    var pad = new T.Mesh(P.pad, P.padM); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.071, 0.34); rig.add(pad);
    var sh = new T.Mesh(P.shadow, P.shadowM); sh.rotation.x = -Math.PI / 2; sh.position.y = -0.002; rig.add(sh);
    /* lid hinged on the back edge, leaning back ~14deg */
    var hinge = new T.Group(); hinge.position.set(0, 0.07, -0.53); hinge.rotation.x = -0.24; rig.add(hinge);
    var lid = new T.Mesh(P.lid, P.metal); lid.position.set(0, 0.52, 0); hinge.add(lid);
    var scrM = new T.MeshBasicMaterial({ color: 0x0b1220 });
    var scr = new T.Mesh(P.screen, scrM); scr.position.set(0, 0.52, 0.024); hinge.add(scr);

    /* the screen shows the card's own screenshot, cropped from the top */
    var img = card.querySelector('.ss-img, .proj-thumb img');
    var src = img && (img.currentSrc || img.src);
    if (src) new T.TextureLoader().load(src, function (tex) {
      tex.colorSpace = T.SRGBColorSpace;
      var ia = tex.image.width / tex.image.height, sa = 1.48 / 0.93;
      if (ia < sa) { tex.repeat.set(1, ia / sa); tex.offset.set(0, 1 - ia / sa); }
      else { tex.repeat.set(sa / ia, 1); tex.offset.set((1 - sa / ia) / 2, 0); }
      scrM.map = tex; scrM.color.set(0xffffff); scrM.needsUpdate = true;
    });

    var cam = new T.PerspectiveCamera(28, LW / LH, 0.1, 30);
    cam.position.set(0, 1.35, 4.1); cam.lookAt(0, 0.42, 0);
    var v = { card: card, scene: scene, cam: cam, canvas: slot(card.querySelector('.proj-body'), 'sm-laptop'), ready: true };
    var ry = 0, rx = 0, ph = feats.indexOf(card) * 2.1;
    v.update = function (t) {
      var r = v.canvas.getBoundingClientRect();
      var dx = Math.max(-1, Math.min(1, (px - (r.left + r.width / 2)) / (innerWidth * 0.5)));
      var dy = Math.max(-1, Math.min(1, (py - (r.top + r.height / 2)) / (innerHeight * 0.5)));
      /* slow turn of its own, plus a pull toward the pointer */
      var ty = Math.sin(t * 0.32 + ph) * 0.55 + dx * 0.45, tx = dy * 0.16;
      ry += (ty - ry) * 0.08; rx += (tx - rx) * 0.08;
      rig.rotation.y = ry - 0.25; rig.rotation.x = rx;
      rig.position.y = Math.sin(t * 1.1 + ph) * 0.03;
    };
    addView(v);
    if (!placeLaptop(v)) v.canvas.style.display = 'none';
    v.canvas.classList.add('is-live');
    return v;
  }

  var laptopsMade = false;
  function laptops() {
    if (laptopsMade || !feats.length) return;
    laptopsMade = true;
    engine().then(function () {
      var vs = feats.map(makeLaptop);
      var rq = 0;
      addEventListener('resize', function () { clearTimeout(rq); rq = setTimeout(function () { vs.forEach(placeLaptop); }, 200); });
      kick();
    }).catch(function () { /* CDN blocked: cards stay as they are */ });
  }

  /* ── 10 · Dumpling by the contact form ─────────────────────────── */
  var dogMade = false, typing = 0;
  function dumpling() {
    if (dogMade || !contact) return;
    dogMade = true;
    var layout = contact.querySelector('.c-layout');
    var form = contact.querySelector('.c-form');
    if (!layout) return;
    if (form) form.addEventListener('input', function () { typing = performance.now(); });
    engine().then(function () {
      return Promise.all([
        import(V + '/examples/jsm/loaders/GLTFLoader.js/+esm'),
        import(V + '/examples/jsm/libs/meshopt_decoder.module.js/+esm')
      ]);
    }).then(function (m) {
      var loader = new m[0].GLTFLoader(); loader.setMeshoptDecoder(m[1].MeshoptDecoder);
      loader.load('img/hero3d/scene.glb', function (g) { buildDog(g, layout); });
    }).catch(function () {});
  }

  function buildDog(g, layout) {
    var src = g.scene.getObjectByName('dog');
    if (!src) return;
    var scene = new T.Scene(); lights(scene, false);
    var dog = src.clone(true);
    /* she is a photo card facing +Z (the camera); a slight turn toward
       the form only, so the flat card never shows edge-on */
    dog.position.set(0, 0, 0); dog.rotation.set(0, 0.12, 0);
    dog.traverse(function (o) {
      if (o.name === 'dog_shadow') o.visible = false;   /* this view draws its own */
      if (o.isMesh && o.material && /^dog_(tail_)?cutout$/.test(o.material.name)) {
        var dm = o.material = o.material.clone();
        dm.transparent = false; dm.alphaTest = 0.4; dm.depthWrite = true; dm.side = T.DoubleSide;
        dm.metalness = 0; dm.roughness = 1; dm.emissive = new T.Color(1, 1, 1); dm.emissiveMap = dm.map; dm.emissiveIntensity = 0.45;
          /* clamp: repeat-wrap pulled the paws row onto the card's top edge (stray dashes) */
          if (dm.map) { dm.map.wrapS = dm.map.wrapT = T.ClampToEdgeWrapping; dm.map.needsUpdate = true; }
        dm.needsUpdate = true;
      }
    });
    var walker = new T.Group(); walker.add(dog); scene.add(walker);
    dog.updateMatrixWorld(true);
    var box = new T.Box3().setFromObject(dog), size = new T.Vector3(), ctr = new T.Vector3();
    box.getSize(size); box.getCenter(ctr);
    dog.position.set(-ctr.x, -box.min.y, -ctr.z);
    var S = Math.max(size.x, size.y, size.z);
    var sh = new T.Mesh(new T.PlaneGeometry(S * 1.15, S * 0.8), new T.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.4 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.001; walker.add(sh);

    var parts = {};
    dog.traverse(function (o) {
      var k = /^dog_(head|tail|ear_l|ear_r|body)$/.exec(o.name);
      if (k) { parts[k[1]] = o; o.userData.r0 = o.rotation.clone(); o.userData.p0 = o.position.clone(); o.userData.s0 = o.scale.clone(); }
    });

    var cam = new T.PerspectiveCamera(26, 1.6, 0.01, 50);
    cam.position.set(0, S * 0.62, S * 2.7); cam.lookAt(0, S * 0.5, 0);
    var W = 300, H = 190;
    var v = { scene: scene, cam: cam, canvas: slot(layout, 'sm-dog'), ready: true };
    function place() {
      var s = window.__smContactSpot;
      if (!s || s.width < 200) { v.canvas.style.display = 'none'; return; }
      var w = Math.min(W, s.width - 90), h = Math.min(H, s.height);
      v.canvas.style.display = '';
      v.canvas.style.left = (s.left + s.width - w) + 'px';
      v.canvas.style.top = (s.top + s.height - h) + 'px';
      fit(v, w, h);
    }
    place();
    /* 38-section-motion.js refreshes the spot whenever the layout resizes */
    new ResizeObserver(function () { requestAnimationFrame(place); }).observe(layout);

    /* walk-in: starts the first time she is on screen. A slide with a
       small trot bob (she is modelled lying down, so she glides in low),
       then the head comes up and the tail starts. */
    var t0 = -1, look = 0, walkX = S * 2.4, lastT = 0, wag = 0, hopAt = 0;
    /* a hop every 4-7 s once she has arrived: squash, up, stretch, land */
    function hop(t) {
      var u = (t - hopAt) / 0.95, r = { h: 0, sx: 1, sy: 1, on: u >= 0 && u < 1 };
      if (u >= 1) { hopAt = t + 4 + Math.random() * 3; return r; }
      if (u < 0) return r;
      var q;
      if (u < 0.22) { q = Math.sin(u / 0.22 * Math.PI / 2); r.sy = 1 - 0.1 * q; r.sx = 1 + 0.06 * q; }
      else if (u < 0.72) { q = (u - 0.22) / 0.5; r.h = Math.sin(q * Math.PI); var st = Math.sin(Math.min(1, q * 1.6) * Math.PI) * 0.09; r.sy = 1 + st; r.sx = 1 - st * 0.5; }
      else { q = Math.sin((u - 0.72) / 0.28 * Math.PI); r.sy = 1 - 0.08 * q; r.sx = 1 + 0.05 * q; }
      return r;
    }
    v.update = function (t) {
      if (t0 < 0) { t0 = t; hopAt = t + 3 + Math.random() * 3; }
      var dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
      var a = t - t0, k = Math.min(1, a / 1.6), e = 1 - Math.pow(1 - k, 3);
      walker.position.x = walkX * (1 - e);
      walker.position.y = k < 1 ? Math.abs(Math.sin(a * 11)) * S * 0.035 * (1 - k) : 0;
      sh.material.opacity = 0.4 * Math.min(1, a * 2);
      var up = Math.max(0, Math.min(1, (a - 1.5) / 0.8)), upE = up * up * (3 - 2 * up);
      /* glance at the form while someone types */
      var busy = performance.now() - typing < 1500 ? 1 : 0;
      look += (busy - look) * 0.06;
      if (parts.head) {
        parts.head.rotation.z = parts.head.userData.r0.z + upE * 0.38;
        parts.head.rotation.y = parts.head.userData.r0.y + look * 0.3 + Math.sin(t * 0.7) * 0.05 * upE;
      }
      var hp = up >= 1 ? hop(t) : { h: 0, sx: 1, sy: 1, on: false };
      if (parts.tail) {
        wag += dt * (hp.on || busy ? 17 : 7.5) * upE;
        parts.tail.rotation.z = parts.tail.userData.r0.z + Math.sin(wag) * (hp.on ? 0.2 : 0.15) * upE;
      }
      if (parts.body) {
        var br = Math.sin(t * 2.1) * 0.5 + 0.5, s0 = parts.body.userData.s0;
        parts.body.scale.set(s0.x * (1 + br * 0.014) * hp.sx, s0.y * (1 + br * (busy ? 0.045 : 0.035)) * hp.sy, s0.z);
        parts.body.position.y = parts.body.userData.p0.y + Math.sin(t * 1.05) * S * 0.012 * upE + hp.h * S * 0.11;
      }
      if (hp.h || hp.on) { var sk = 1 - hp.h * 0.4; sh.scale.set(sk, sk, 1); sh.material.opacity = 0.4 * (1 - hp.h * 0.6); }
      else sh.scale.set(1, 1, 1);
      /* a glance at the form while someone types (the card leans a touch) */
      dog.rotation.y = 0.12 + look * 0.12 + Math.sin(t * 0.7) * 0.03 * upE;
      var et = t % 6.1, ew = et < 0.45 ? Math.sin(et / 0.45 * Math.PI) * 0.3 : 0;
      if (parts.ear_l) parts.ear_l.rotation.x = parts.ear_l.userData.r0.x + ew;
    };
    addView(v);
    v.canvas.classList.add('is-live');
    kick();
  }

  /* ── triggers ──────────────────────────────────────────────────── */
  var near = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      if (e.target === work) laptops();
      if (e.target === contact) dumpling();
      near.unobserve(e.target);
    });
  }, { rootMargin: '800px 0px' });
  function arm() {
    if (work) near.observe(work);
    if (contact) near.observe(contact);
  }
  /* not the load event: a slow third-party beacon can hold it */
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', function () { setTimeout(arm, 1500); });
  else setTimeout(arm, 1500);
})();
