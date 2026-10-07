/* ═══════════════════════════════════════
   39. SECTION 3D (desktop only)
   Added 2026-10-02. One shared WebGL renderer for everything 3D below
   the hero:
     (the mini laptops beside the featured projects were removed on
       2026-10-07: at 136-176 px they read as blurry stickers)
     - Dumpling, cloned from the hero's img/hero3d/scene.glb (same
       versioned URL, so the browser cache serves it), walking in beside
       the contact form and waiting there, head up, tail going.

   One renderer, many views: the WebGL canvas is never in the page. Each
   view renders into a corner of it and is copied into its own small 2D
   canvas (.sm-slot) in the same task, so one context serves all of
   them and the hero's renderer stays the only other one.

   Loading: three.js (the hero's jsDelivr +esm build, so the module is
   shared) is imported only when #contact comes within ~800px,
   never on the load event. The GLB loads only when #contact is near.
   The loop runs at ~30fps only while a slot is on screen and the tab is
   visible; it stops entirely otherwise. Placement measures the text in
   each card and skips a slot that would cover any of it.

   2026-10-02: window.__sm3dApi lends this renderer to 40-desk-extras.js
   (the automation pipeline view). On a successful contact submit
   Dumpling picks up the envelope and trots off with it, and the paper
   plane (38-section-motion.js) launches from her mouth; she also hops
   when a CTA is hovered ('dog-cta').
═══════════════════════════════════════ */
(function () {
  var mq = matchMedia('(min-width:1024px) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  /* 2026-10-07: the gate is live. A window that grows into it sets the
     section 3D up then; leaving it stops the loop and frees the GPU
     memory (pause/resume below). A software rasteriser never starts it
     (window.__gpu3d, defined in 36-hero-3d.js). */
  if (!mq.matches) {
    var later = function () { if (!mq.matches) return; mq.removeEventListener('change', later); main(); };
    mq.addEventListener('change', later);
    return;
  }
  main();
  function main() {
  var contact = document.getElementById('contact');
  if (!contact) return;

  var V = 'https://cdn.jsdelivr.net/npm/three@0.170.0';
  var BW = 1280, BH = 400;                /* shared drawing buffer, device px (wide for the pipeline strip) */
  var T = null, renderer = null, gl = null, modP = null;
  var views = [], running = false, last = 0, clock0 = performance.now(), lost = false, released = false;
  var px = innerWidth / 2, py = innerHeight / 2;
  var stat = window.__sm3d = { frames: 0, views: 0 };   /* read by the perf check */

  function engine() {
    if (modP) return modP;
    if (window.__gpu3d && !window.__gpu3d()) return (modP = Promise.reject(new Error('software WebGL')));
    modP = import(V + '/+esm').then(function (m) {
      T = m;
      gl = document.createElement('canvas');
      renderer = new T.WebGLRenderer({ canvas: gl, antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(1);
      renderer.debug.checkShaderErrors = false;   /* see 36-hero-3d.js: keeps compile waits off the main thread */
      renderer.setSize(BW, BH, false);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      renderer.setScissorTest(true);
      gl.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; running = false; });
      gl.addEventListener('webglcontextrestored', function () { lost = false; kick(); });
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
    if (running || document.hidden || lost || !mq.matches) return;
    released = false;
    for (var i = 0; i < views.length; i++) if (views[i].vis && views[i].ready) { running = true; requestAnimationFrame(loop); return; }
  }
  function loop(now) {
    if (document.hidden || lost) { running = false; return; }
    if (!mq.matches) { running = false; release(); return; }
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
  /* left the desktop gate: free every view's GPU memory; three re-uploads
     on the next render, so coming back is just kick() */
  function release() {
    if (released || !renderer) return;
    released = true;
    views.forEach(function (v) {
      if (!v.scene) return;
      v.scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        var ms = !o.material ? [] : Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(function (m) { for (var k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); });
      });
    });
    renderer.renderLists.dispose();
  }
  mq.addEventListener('change', function () { if (mq.matches) kick(); else if (!running) release(); });
  addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });

  window.__sm3dApi = {
    engine: engine, slot: slot, addView: addView, fit: fit, lights: lights, blobTex: blobTex, kick: kick,
    three: function () { return T; }
  };

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

  /* ── 10 · Dumpling by the contact form ─────────────────────────── */
  var dogMade = false, typing = 0;
  function dumpling() {
    if (dogMade || !contact) return;
    dogMade = true;
    var layout = contact.querySelector('.c-layout');
    var form = contact.querySelector('.c-form');
    if (!layout) return;
    if (form) form.addEventListener('input', function () { typing = performance.now(); });
    /* the hero (36-hero-3d.js) shares its parsed scene.glb as
       window.__heroGlb, so this is a clone of an object already in memory
       rather than a second fetch + meshopt decode + parse. It resolves
       null when the hero did not load the file; then this loads its own. */
    engine().then(function () {
      var shared = window.__heroGlb;
      return shared ? shared.then(function (g) { return g || ownGlb(); }) : ownGlb();
    }).then(function (g) { if (g) buildDog(g, layout); }).catch(function () {});
  }
  function ownGlb() {
    return Promise.all([
      import(V + '/examples/jsm/loaders/GLTFLoader.js/+esm'),
      import(V + '/examples/jsm/libs/meshopt_decoder.module.js/+esm')
    ]).then(function (m) {
      var loader = new m[0].GLTFLoader(); loader.setMeshoptDecoder(m[1].MeshoptDecoder);
      return new Promise(function (res, rej) { loader.load('img/hero3d/scene.glb', res, undefined, rej); });
    });
  }

  function buildDog(g, layout) {
    var src = g.scene.getObjectByName('dog');
    if (!src) return;
    var scene = new T.Scene(); lights(scene, false);
    var dog = src.clone(true);
    /* the shared hero copy may be mid-hop or mid-wag: put every part back
       to the rest pose the hero recorded (userData p0/r0/s0 survive the
       clone as plain {x,y,z} / {_x,_y,_z} objects) */
    dog.traverse(function (o) {
      var u = o.userData;
      if (o === dog) return;
      if (u.p0) o.position.set(u.p0.x, u.p0.y, u.p0.z);
      if (u.r0 && u.r0._x !== undefined) o.rotation.set(u.r0._x, u.r0._y, u.r0._z);
      if (u.s0) o.scale.set(u.s0.x, u.s0.y, u.s0.z);
    });
    /* she is a photo card facing +Z (the camera); a slight turn toward
       the form only, so the flat card never shows edge-on */
    dog.position.set(0, 0, 0); dog.rotation.set(0, 0.12, 0);
    dog.traverse(function (o) {
      if (o.name === 'dog_shadow') o.visible = false;   /* this view draws its own */
      if (o.isMesh && o.material && /^dog_(tail_|paw_[lr]_)?cutout$/.test(o.material.name)) {
        var dm = o.material = o.material.clone();
        dm.transparent = false; dm.alphaTest = 0.4; dm.depthWrite = true; dm.side = T.DoubleSide;
        dm.metalness = 0; dm.roughness = 1; dm.emissive = new T.Color(1, 1, 1); dm.emissiveMap = dm.map; dm.emissiveIntensity = 0.32;
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
    var sh = new T.Mesh(new T.PlaneGeometry(S * 1.0, S * 0.5), new T.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.75 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.001; walker.add(sh);

    var parts = {};
    dog.traverse(function (o) {
      var k = /^dog_(head|tail|ear_l|ear_r|body|paws|paw_l|paw_r)$/.exec(o.name);
      if (k) { parts[k[1]] = o; o.userData.r0 = o.rotation.clone(); o.userData.p0 = o.position.clone(); o.userData.s0 = o.scale.clone(); }
    });

    var cam = new T.PerspectiveCamera(26, 1.6, 0.01, 50);
    cam.position.set(0, S * 0.62, S * 2.95); cam.lookAt(0, S * 0.52, 0);   /* room for the tail tip mid-hop */
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
    /* the envelope she carries off after a successful send */
    var ec = document.createElement('canvas'); ec.width = 128; ec.height = 88;
    (function (g) {
      g.fillStyle = '#eaf6ff'; g.beginPath(); g.roundRect(2, 2, 124, 84, 8); g.fill();
      g.strokeStyle = '#00a8d8'; g.lineWidth = 5; g.stroke();
      g.beginPath(); g.moveTo(6, 8); g.lineTo(64, 50); g.lineTo(122, 8); g.stroke();
    })(ec.getContext('2d'));
    var etex = new T.CanvasTexture(ec); etex.colorSpace = T.SRGBColorSpace;
    var env = new T.Mesh(new T.PlaneGeometry(S * 0.34, S * 0.23), new T.MeshBasicMaterial({ map: etex, transparent: true, side: T.DoubleSide, depthTest: false }));
    var mouth = new T.Vector3(0, S * 0.5, S * 0.05);
    if (parts.head) { parts.head.getWorldPosition(mouth); walker.worldToLocal(mouth); mouth.y -= S * 0.08; mouth.z += S * 0.3; }
    env.renderOrder = 3;
    env.position.copy(mouth); env.rotation.z = -0.2; env.visible = false; walker.add(env);
    var carryT = -1, ctaHop = false;
    addEventListener('dog-cta', function () { ctaHop = true; });
    var pv = new T.Vector3();
    window.__smDogCarry = function () {
      if (!v.vis || v.canvas.style.display === 'none' || t0 < 0) return null;
      carryT = lastT;
      /* 13-form-submit-inline-validation.js waits for this before it leaves */
      window.__formHoldUntil = performance.now() + 1500;
      return function () {
        env.getWorldPosition(pv); pv.project(cam);
        var r = v.canvas.getBoundingClientRect();
        var x = r.left + (pv.x + 1) / 2 * r.width, y = r.top + (1 - pv.y) / 2 * r.height;
        return { left: x - 20, top: y - 14, right: x + 20, bottom: y + 14, width: 40, height: 28 };
      };
    };
    /* a hop every 4-7 s once she has arrived: squash, up, stretch, land */
    function hop(t) {
      var u = (t - hopAt) / 0.95, r = { h: 0, sx: 1, sy: 1, u: u, on: u >= 0 && u < 1 };
      if (u >= 1) { hopAt = t + 4 + Math.random() * 3; return r; }
      if (u < 0) return r;
      var q;
      if (u < 0.22) { q = Math.sin(u / 0.22 * Math.PI / 2); r.sy = 1 - 0.1 * q; r.sx = 1 + 0.06 * q; }
      else if (u < 0.72) { q = (u - 0.22) / 0.5; r.h = Math.sin(q * Math.PI); var st = Math.sin(Math.min(1, q * 1.6) * Math.PI) * 0.09; r.sy = 1 + st; r.sx = 1 - st * 0.5; }
      else { q = Math.sin((u - 0.72) / 0.28 * Math.PI); r.sy = 1 - 0.08 * q; r.sx = 1 + 0.05 * q; }
      return r;
    }
    /* front paws (dog_paws -> dog_paw_l/_r, elbow pivots): slow
       alternating kneading pats, a quick tap just before a hop and the
       paws spreading as she lands */
    function pawPose(P, t, hp, toHop) {
      var kn = Math.max(0, Math.sin(t * 0.9)) , ph = t * 6.2,
        pl = Math.max(0, Math.sin(ph)) * kn, pr = Math.max(0, Math.sin(ph + Math.PI)) * kn,
        tap = toHop > 0 && toHop < 0.4 ? Math.sin((0.4 - toHop) / 0.4 * Math.PI * 2) : 0,
        land = hp.u > 0.72 && hp.u < 1 ? Math.sin((hp.u - 0.72) / 0.28 * Math.PI) : 0,
        up = hp.h > 0 ? hp.h : 0;
      if (tap > 0) pr = Math.max(pr, tap); else if (tap < 0) pl = Math.max(pl, -tap);
      if (P.paws) { var s0 = P.paws.userData.s0; P.paws.scale.x = s0.x * (1 + land * 0.07); }
      if (P.paw_l) { P.paw_l.rotation.z = P.paw_l.userData.r0.z - pl * 0.09 - land * 0.06 + up * 0.08; P.paw_l.position.y = P.paw_l.userData.p0.y + pl * 0.007; }
      if (P.paw_r) { P.paw_r.rotation.z = P.paw_r.userData.r0.z + pr * 0.09 + land * 0.06 - up * 0.06; P.paw_r.position.y = P.paw_r.userData.p0.y + pr * 0.007; }
    }
    v.update = function (t) {
      if (t0 < 0) { t0 = t; hopAt = t + 3 + Math.random() * 3; }
      var dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
      var a = t - t0, k = Math.min(1, a / 1.6), e = 1 - Math.pow(1 - k, 3);
      walker.position.x = walkX * (1 - e);
      walker.position.y = k < 1 ? Math.abs(Math.sin(a * 11)) * S * 0.035 * (1 - k) : 0;
      if (ctaHop) { ctaHop = false; if (a > 2.5 && hopAt - t > 0.3) hopAt = t + 0.05; }
      if (carryT >= 0) {
        /* grab (0-0.3 s), then trot off to the right */
        var c = t - carryT, gk = Math.min(1, c / 0.3);
        env.visible = true; env.scale.setScalar(0.4 + 0.6 * gk);
        var go = Math.max(0, c - 0.35), gx = go * go * S * 2.2 + go * S * 1.2;
        walker.position.x = gx;
        walker.position.y = go > 0 ? Math.abs(Math.sin(go * 13)) * S * 0.05 : 0;
        env.rotation.z = -0.2 + Math.sin(c * 13) * 0.08;
      }
      sh.material.opacity = 0.75 * Math.min(1, a * 2);
      var up = Math.max(0, Math.min(1, (a - 1.5) / 0.8)), upE = up * up * (3 - 2 * up);
      /* glance at the form while someone types */
      var busy = performance.now() - typing < 1500 ? 1 : 0;
      look += (busy - look) * 0.06;
      if (parts.head) {
        parts.head.rotation.z = parts.head.userData.r0.z + upE * 0.38;
        parts.head.rotation.y = parts.head.userData.r0.y + look * 0.3 + Math.sin(t * 0.7) * 0.05 * upE;
      }
      var hp = up >= 1 ? hop(t) : { h: 0, sx: 1, sy: 1, u: -1, on: false };
      if (up >= 1) pawPose(parts, t, hp, hopAt - t);
      if (parts.tail) {
        wag += dt * (hp.on || busy ? 17 : 7.5) * upE;
        parts.tail.rotation.z = parts.tail.userData.r0.z + Math.sin(wag) * (hp.on ? 0.2 : 0.15) * upE;
      }
      if (parts.body) {
        var br = Math.sin(t * 2.1) * 0.5 + 0.5, s0 = parts.body.userData.s0;
        parts.body.scale.set(s0.x * (1 + br * 0.014) * hp.sx, s0.y * (1 + br * (busy ? 0.045 : 0.035)) * hp.sy, s0.z);
        parts.body.position.y = parts.body.userData.p0.y + Math.sin(t * 1.05) * S * 0.012 * upE + hp.h * S * 0.11;
      }
      if (hp.h || hp.on) { var sk = 1 - hp.h * 0.4; sh.scale.set(sk, sk, 1); sh.material.opacity = 0.75 * (1 - hp.h * 0.6); }
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
      if (e.target === contact) dumpling();
      near.unobserve(e.target);
    });
  }, { rootMargin: '800px 0px' });
  function arm() {
    if (contact) near.observe(contact);
  }
  /* not the load event: a slow third-party beacon can hold it */
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', function () { setTimeout(arm, 1500); });
  else setTimeout(arm, 1500);
  }
})();
