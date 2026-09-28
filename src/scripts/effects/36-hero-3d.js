/* ═══════════════════════════════════════
   HERO 3D (desktop only)
   Phones and tablets keep the animated still (04-hero.css + 56-hero-
   motion.css). On desktops (>=1024px, fine pointer, motion allowed) the
   Blender scene img/hero3d/scene.glb (built by 3d/build_scene.py) loads
   after the page has finished loading and fades in over the plate, so
   the plate stays the first paint and nothing here delays LCP.

   three.js comes from jsDelivr's +esm build, which rewrites the addons'
   bare 'three' import to the same URL, so one copy of three is shared.
   The render loop stops when the hero is off screen or the tab hidden.
═══════════════════════════════════════ */
(function () {
  var stage = document.getElementById('heroStage');
  var scene = document.getElementById('heroScene');
  if (!stage || !scene) return;
  var ok = matchMedia('(min-width:1024px) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  if (!ok.matches) return;

  var V = 'https://cdn.jsdelivr.net/npm/three@0.170.0';
  var HREF = { cube_cart: '#work', cube_gear: '#automation-demo', cube_db: '#toolkit' };
  var LABEL = { cube_cart: 'Store builds', cube_gear: 'Try an automation', cube_db: 'Data & monitoring' };

  function boot() {
    Promise.all([
      import(V + '/+esm'),
      import(V + '/examples/jsm/loaders/GLTFLoader.js/+esm'),
      import(V + '/examples/jsm/postprocessing/EffectComposer.js/+esm'),
      import(V + '/examples/jsm/postprocessing/RenderPass.js/+esm'),
      import(V + '/examples/jsm/postprocessing/UnrealBloomPass.js/+esm'),
      import(V + '/examples/jsm/postprocessing/OutputPass.js/+esm')
    ]).then(function (m) { start(m[0], m[1].GLTFLoader, m[2].EffectComposer, m[3].RenderPass, m[4].UnrealBloomPass, m[5].OutputPass); })
      .catch(function () { /* offline or blocked CDN: the plate stays */ });
  }

  function start(THREE, GLTFLoader, EffectComposer, RenderPass, UnrealBloomPass, OutputPass) {
    var canvas = document.createElement('canvas');
    canvas.className = 'hero-3d';
    scene.appendChild(canvas);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.75;
    renderer.setClearColor(0x000000, 0);

    var world = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(30, 1500 / 1288, 0.1, 50);
    var camBase = new THREE.Vector3(2.0, 3.2, 6.3);
    var target = new THREE.Vector3(0.2, 0.62, -0.1);

    world.add(new THREE.HemisphereLight(0x9fd8ff, 0x050a14, 0.35));
    var key = new THREE.DirectionalLight(0xcfe6ff, 1.2); key.position.set(-2, 4, 3); world.add(key);
    var cyan = new THREE.PointLight(0x33ccff, 6, 6); cyan.position.set(0.2, 2.1, -0.2); world.add(cyan);
    var warm = new THREE.PointLight(0xff8a33, 4, 5); warm.position.set(1.8, 0.8, 0.8); world.add(warm);
    var lamp = new THREE.PointLight(0xffb060, 3, 1.3); lamp.position.set(-1.42, 0.55, -0.07); world.add(lamp);

    var composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(512, 512, { type: THREE.HalfFloatType }));
    composer.addPass(new RenderPass(world, cam));
    var bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.22, 0.4, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    function size() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    size();
    new ResizeObserver(size).observe(canvas);

    var motes = null, screens = null, lastDraw = -1;
    var cubes = [], wires = [], holos = [], logo = null, hover = null;
    new GLTFLoader().load('img/hero3d/scene.glb', function (g) {
      world.add(g.scene);
      g.scene.traverse(function (o) {
        if (/^cube_/.test(o.name) && o.isMesh !== undefined) {
          o.userData.y0 = o.position.y; o.userData.r0 = o.rotation.y;
          if (o.material) o.material = o.material.clone();
          cubes.push(o);
        }
        if (o.name === 'logo_gear') logo = o;
        if (/^holo_/.test(o.name)) { o.userData.y0 = o.position.y; holos.push(o); }
        if (/^wire_/.test(o.name) && o.material) { o.material = o.material.clone(); wires.push(o); }
        /* Blender's emission strengths read hot under ACES; tame them */
        if (o.material && o.material.emissiveIntensity) {
          var n = o.material.name || '';
          o.material.emissiveIntensity = /edge/.test(n) ? 0.9 : /wire/.test(n) ? 1.1 : /cube/.test(n) ? 0.35 : /logo/.test(n) ? 0.35 : /holo/.test(n) ? 0.5 : /bulb/.test(n) ? 3 : /desk_mat/.test(n) ? 0.6 : 0.38;
        }
      });
      screens = liveScreens(THREE, g.scene);
      /* drifting data motes around the desk */
      var N = 160, pos = new Float32Array(N * 3);
      for (var i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 4; pos[i * 3 + 1] = Math.random() * 2.4; pos[i * 3 + 2] = (Math.random() - 0.5) * 3; }
      var pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      motes = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x5fdcff, size: 0.018, transparent: true, opacity: 0.7, depthWrite: false }));
      world.add(motes);
      scene.classList.add('has-3d');
      loop();
    });

    /* pointer: camera leans toward the cursor; cubes are clickable */
    var px = 0, py = 0, tx = 0, ty = 0;
    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    var tip = document.createElement('span'); tip.className = 'hero-3d-tip'; scene.appendChild(tip);
    stage.addEventListener('pointermove', function (e) {
      /* the canvas overhangs the scene box (56-hero-motion.css), so
         pick against the canvas and place the tip against the scene */
      var cr = canvas.getBoundingClientRect(), r = scene.getBoundingClientRect();
      tx = ((e.clientX - cr.left) / cr.width - 0.5) * 2;
      ty = ((e.clientY - cr.top) / cr.height - 0.5) * 2;
      ndc.set(tx, -ty);
      ray.setFromCamera(ndc, cam);
      var hit = ray.intersectObjects(cubes, true)[0];
      var c = null;
      if (hit) { c = hit.object; while (c && !HREF[c.name]) c = c.parent; }
      hover = c;
      stage.style.cursor = c ? 'pointer' : '';
      if (c) { tip.textContent = LABEL[c.name] + ' →'; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.classList.add('on'); }
      else tip.classList.remove('on');
    }, { passive: true });
    stage.addEventListener('pointerleave', function () { tx = ty = 0; hover = null; tip.classList.remove('on'); });
    stage.addEventListener('click', function () {
      if (!hover) return;
      var el = document.querySelector(HREF[hover.name]);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    /* only render while the hero is visible and the tab is in front */
    var visible = true, raf = 0, clock = new THREE.Clock();
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) loop(); }).observe(stage);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) loop(); });

    function loop() {
      if (raf || !visible || document.hidden || !cubes.length) return;
      raf = requestAnimationFrame(frame);
    }
    function frame() {
      raf = 0;
      var t = clock.getElapsedTime();
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      cam.position.set(camBase.x + px * 0.9, camBase.y - py * 0.5, camBase.z - px * 0.6);
      cam.lookAt(target);

      cubes.forEach(function (c, i) {
        var lift = c === hover ? 0.12 : 0;
        c.userData.lift = (c.userData.lift || 0) + (lift - (c.userData.lift || 0)) * 0.12;
        c.position.y = c.userData.y0 + Math.sin(t * 1.3 + i * 1.7) * 0.05 + c.userData.lift;
        c.rotation.y = c.userData.r0 + Math.sin(t * 0.6 + i) * 0.25;
        c.scale.setScalar(1 + c.userData.lift * 0.8);
        /* icons light up one by one: cart, gear, database (4.5s round) */
        var ph = ((t / 4.5 - i / 3) % 1 + 1) % 1, glow = Math.max(0, Math.sin(ph * Math.PI * 3)) * (ph < 1 / 3 ? 1 : 0);
        if (c.material) c.material.emissiveIntensity = 0.3 + glow * 1.6 + (c === hover ? 0.8 : 0);
      });
      /* one pulse runs through the wires in order */
      wires.forEach(function (w, i) {
        var p = (t * 0.45 - i * 0.22) % 1; if (p < 0) p += 1;
        w.material.emissiveIntensity = 0.9 + 3 * Math.max(0, Math.sin(p * Math.PI * 2)) ** 3;
      });
      cyan.intensity = 6 + Math.sin(t * 2) * 2;
      lamp.intensity = 3 + Math.sin(t * 7) * 0.15 + Math.sin(t * 13) * 0.1;
      if (logo) logo.children.forEach(function (c) { if (/logo_(left|right)/.test(c.name)) c.rotation.z = -t * 0.35; });
      holos.forEach(function (h, i) { h.position.y = h.userData.y0 + Math.sin(t * 0.9 + i * 2) * 0.06; });
      if (screens && t - lastDraw > 1 / 30) { screens(t); lastDraw = t; }
      if (motes) { motes.rotation.y = t * 0.03; motes.position.y = Math.sin(t * 0.4) * 0.05; }

      composer.render();
      loop();
    }
  }

  /* ── live screens ────────────────────────────────────────────────
     The laptop, tablet, chart and keyboard textures from Blender are
     swapped for canvases redrawn at 30fps:
     laptop   a key lights up, then the store page scrolls down and back
     tablet   the lightning > gear > database flow lights node by node
     chart    the sales line draws itself and the total counts up      */
  function liveScreens(THREE, root) {
    function slot(name, w, h) {
      var mesh = root.getObjectByName(name);
      if (!mesh || !mesh.material) return null;
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var tex = new THREE.CanvasTexture(c);
      tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      var m = mesh.material = mesh.material.clone();
      m.map = tex; if (m.emissiveMap) m.emissiveMap = tex;
      return { g: c.getContext('2d'), w: w, h: h, tex: tex };
    }
    var L = slot('laptop_screen', 640, 400), T = slot('tablet_screen', 300, 410),
        C = slot('holo_chart', 320, 200), K = slot('laptop_keys', 512, 256), G = slot('holo_gauge', 256, 256);
    function rr(g, x, y, w, h, r, fill) { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }

    /* one long generic store page, drawn once, windowed each frame */
    var page = document.createElement('canvas'); page.width = 640; page.height = 1200;
    (function (g) {
      g.fillStyle = '#f6f4f0'; g.fillRect(0, 0, 640, 1200);
      g.fillStyle = '#fff'; g.fillRect(0, 0, 640, 34);
      rr(g, 20, 11, 60, 11, 3, '#142032');
      for (var i = 0; i < 4; i++) rr(g, 300 + i * 56, 13, 40, 7, 3, '#aab0ba');
      rr(g, 20, 46, 600, 150, 10, '#12284a');
      g.fillStyle = '#0096dc'; g.beginPath(); g.arc(500, 120, 95, 0, 7); g.fill();
      g.fillStyle = '#ff8c28'; g.beginPath(); g.arc(500, 120, 58, 0, 7); g.fill();
      rr(g, 45, 78, 210, 22, 5, '#fff'); rr(g, 45, 112, 160, 11, 4, '#96b4d2'); rr(g, 45, 146, 86, 24, 12, '#00d4ff');
      var cols = ['#e6c8aa', '#b4d2e6', '#dcb4be', '#bedcbe', '#d6d0f0', '#f0dcb4', '#c8e6dc', '#e6c8d6'];
      for (var r = 0; r < 4; r++) for (var k = 0; k < 4; k++) {
        var x = 20 + k * 152, y = 214 + r * 200;
        rr(g, x, y, 140, 186, 8, '#fff'); rr(g, x + 8, y + 8, 124, 120, 6, cols[(r * 4 + k) % 8]);
        rr(g, x + 8, y + 140, 90, 9, 3, '#283246'); rr(g, x + 8, y + 158, 48, 9, 3, '#0096dc');
      }
      rr(g, 20, 1030, 600, 150, 10, '#142032');
      rr(g, 45, 1060, 180, 14, 4, '#fff'); rr(g, 45, 1090, 260, 9, 3, '#5a7896');
    })(page.getContext('2d'));

    var ease = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x); };
    var vals = [30, 42, 38, 55, 50, 68, 64, 82];

    return function (t) {
      /* laptop + keyboard: 8s loop */
      var lt = t % 8, press = lt < 0.35;
      if (K) {
        var g = K.g; g.fillStyle = '#161c26'; g.fillRect(0, 0, 512, 256);
        for (var r = 0; r < 4; r++) for (var k = 0; k < 13; k++) {
          var hot = press && r === 3 && k === 11;
          rr(g, 14 + k * 38, 14 + r * 40, 32, 32, 5, hot ? '#00d4ff' : '#222a38');
        }
        rr(g, 180, 180, 150, 64, 8, '#1e2532');
        K.tex.needsUpdate = true;
      }
      if (L) {
        var sc = ease((lt - 0.5) / 2.6) * 800 - ease((lt - 5) / 1.8) * 800;
        L.g.drawImage(page, 0, sc, 640, 400, 0, 0, 640, 400);
        /* scrollbar */
        rr(L.g, 630, 6 + sc / 1200 * 388, 5, 130, 3, 'rgba(20,32,50,.35)');
        L.tex.needsUpdate = true;
      }
      /* tablet: a pulse walks the three nodes, rows scroll */
      if (T) {
        var g2 = T.g; g2.fillStyle = '#0c182c'; g2.fillRect(0, 0, 300, 410);
        var ph = (t % 3) / 3, off = (t * 18) % 30;
        for (var y = -30 + (30 - off); y < 410; y += 30) rr(g2, 190, y, 90, 7, 3, '#284670');
        g2.strokeStyle = '#46a0dc'; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(95, 95); g2.lineTo(95, 315); g2.stroke();
        g2.strokeStyle = '#9beeff'; g2.lineWidth = 5; g2.beginPath(); g2.moveTo(95, 95); g2.lineTo(95, 95 + 220 * ph); g2.stroke();
        [[95, '#2896ff', 0], [205, '#3c5a82', 0.5], [315, '#14a082', 1]].forEach(function (n) {
          var on = ph >= n[2] - 0.02;
          g2.fillStyle = n[1]; g2.globalAlpha = on ? 1 : 0.45;
          g2.beginPath(); g2.arc(95, n[0], on ? 40 : 36, 0, 7); g2.fill();
          if (on) { g2.strokeStyle = '#bff3ff'; g2.lineWidth = 4; g2.stroke(); }
          g2.globalAlpha = 1;
        });
        T.tex.needsUpdate = true;
      }
      /* chart: line draws over 3s, holds, then a new week */
      if (C) {
        var g3 = C.g, ct = t % 5, pr = ease(ct / 3);
        if (ct < 0.04) vals = vals.map(function (v, i) { return Math.max(18, Math.min(90, 20 + i * 8 + (Math.random() * 24 - 12))); });
        g3.fillStyle = '#081426'; g3.fillRect(0, 0, 320, 200);
        g3.strokeStyle = '#00d4ff'; g3.lineWidth = 3; g3.beginPath(); g3.roundRect(3, 3, 314, 194, 12); g3.stroke();
        rr(g3, 20, 18, 90, 10, 4, '#78c8f0');
        g3.fillStyle = '#fff'; g3.font = '700 26px system-ui,sans-serif';
        g3.fillText('$' + Math.round(1200 + 4800 * pr).toLocaleString(), 20, 60);
        var n = vals.length, upto = pr * (n - 1);
        g3.beginPath();
        for (var i = 0; i <= Math.floor(upto); i++) { var X = 20 + i * 40, Y = 180 - vals[i] * 1.2; i ? g3.lineTo(X, Y) : g3.moveTo(X, Y); }
        var fi = Math.floor(upto), fr = upto - fi;
        if (fi < n - 1) g3.lineTo(20 + (fi + fr) * 40, 180 - (vals[fi] + (vals[fi + 1] - vals[fi]) * fr) * 1.2);
        g3.strokeStyle = '#00e6ff'; g3.lineWidth = 4; g3.stroke();
        var hx = 20 + upto * 40, hy = 180 - (vals[fi] + ((vals[fi + 1] || vals[fi]) - vals[fi]) * fr) * 1.2;
        g3.fillStyle = '#ff963c'; g3.beginPath(); g3.arc(hx, hy, 6, 0, 7); g3.fill();
        C.tex.needsUpdate = true;
      }
      /* uptime gauge: ring sweeps to 99.9%, then a heartbeat blip */
      if (G) {
        var g4 = G.g, gt = t % 6, gp = ease(gt / 1.6);
        g4.fillStyle = '#081426'; g4.fillRect(0, 0, 256, 256);
        g4.strokeStyle = '#00d4ff'; g4.lineWidth = 4; g4.beginPath(); g4.roundRect(3, 3, 250, 250, 24); g4.stroke();
        g4.lineCap = 'round';
        g4.strokeStyle = '#16304e'; g4.lineWidth = 16; g4.beginPath(); g4.arc(128, 118, 72, 0, 7); g4.stroke();
        g4.strokeStyle = '#2ee6a0'; g4.beginPath(); g4.arc(128, 118, 72, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.999 * gp); g4.stroke();
        g4.fillStyle = '#fff'; g4.font = '700 30px system-ui,sans-serif'; g4.textAlign = 'center';
        g4.fillText((99.9 * gp).toFixed(1) + '%', 128, 128);
        g4.fillStyle = '#78c8f0'; g4.font = '600 16px system-ui,sans-serif'; g4.fillText('UPTIME', 128, 226);
        g4.textAlign = 'left';
        G.tex.needsUpdate = true;
      }
    };
  }

  function whenIdle() { ('requestIdleCallback' in window) ? requestIdleCallback(boot, { timeout: 2500 }) : setTimeout(boot, 1200); }
  /* Not the load event: a slow third-party beacon (the analytics pixel)
     can hold 'load' back for a minute, which kept the 3D waiting. */
  if (document.readyState === 'complete') whenIdle();
  else addEventListener('DOMContentLoaded', function () { setTimeout(whenIdle, 1500); });
})();
