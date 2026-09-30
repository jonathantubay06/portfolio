/* ═══════════════════════════════════════
   HERO 3D (desktop only)
   Phones and tablets keep the animated still (04-hero.css + 56-hero-
   motion.css). On desktops (>=1024px, fine pointer, motion allowed) the
   Blender scene img/hero3d/scene.glb (built by 3d/build_scene.py) loads
   after the page has finished loading and fades in over the plate, so
   the plate stays the first paint and nothing here delays LCP.

   three.js comes from jsDelivr's +esm build, which rewrites the addons'
   bare 'three' import to the same URL, so one copy of three is shared.
   The GLB is meshopt-compressed (gltf-transform), hence MeshoptDecoder.
   The render loop stops when the hero is off screen or the tab hidden.

   Moving parts (2026-10-01): delivery drone loop, cart robot on the
   desk mat, rack LEDs, typing code window, "new order" pops, data
   packets laptop -> cubes -> gear, click-the-gear spin + sparks,
   scroll pull-back/tilt/fade, depth parallax, theme-following mood.
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
      import(V + '/examples/jsm/libs/meshopt_decoder.module.js/+esm'),
      import(V + '/examples/jsm/postprocessing/EffectComposer.js/+esm'),
      import(V + '/examples/jsm/postprocessing/RenderPass.js/+esm'),
      import(V + '/examples/jsm/postprocessing/UnrealBloomPass.js/+esm'),
      import(V + '/examples/jsm/postprocessing/OutputPass.js/+esm')
    ]).then(function (m) { start(m[0], m[1].GLTFLoader, m[2].MeshoptDecoder, m[3].EffectComposer, m[4].RenderPass, m[5].UnrealBloomPass, m[6].OutputPass); })
      .catch(function () { /* offline or blocked CDN: the plate stays */ });
  }

  function start(THREE, GLTFLoader, MeshoptDecoder, EffectComposer, RenderPass, UnrealBloomPass, OutputPass) {
    var canvas = document.createElement('canvas');
    canvas.className = 'hero-3d';
    scene.appendChild(canvas);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.75;
    renderer.setClearColor(0x000000, 0);

    var world = new THREE.Scene();
    /* the model hangs in a rig so the scroll reaction can tilt the desk */
    var rig = new THREE.Group(); world.add(rig);
    var cam = new THREE.PerspectiveCamera(30, 1500 / 1288, 0.1, 50);
    var camBase = new THREE.Vector3(2.0, 3.2, 6.3);
    var target = new THREE.Vector3(0.2, 0.62, -0.1);

    var hemi = new THREE.HemisphereLight(0x9fd8ff, 0x050a14, 0.35); world.add(hemi);
    var key = new THREE.DirectionalLight(0xcfe6ff, 1.2); key.position.set(-2, 4, 3); world.add(key);
    var cyan = new THREE.PointLight(0x33ccff, 6, 6); cyan.position.set(0.2, 2.1, -0.2); world.add(cyan);
    var warm = new THREE.PointLight(0xff8a33, 4, 5); warm.position.set(1.8, 0.8, 0.8); world.add(warm);
    var lamp = new THREE.PointLight(0xffb060, 3, 1.3); lamp.position.set(-1.42, 0.55, -0.07); world.add(lamp);

    var composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(512, 512, { type: THREE.HalfFloatType, samples: 4 }));
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

    /* scratch objects, reused every frame (no per-frame allocation) */
    var v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
    var camRight = new THREE.Vector3().subVectors(target, camBase).cross(new THREE.Vector3(0, 1, 0)).normalize();

    var motes = null, screens = null, lastDraw = -1, lastT = 0;
    var cubes = [], wires = [], holos = [], floats = [], leds = [], halves = [], picks = [];
    var logo = null, drone = null, props = [], bot = null, wheels = [], hover = null;
    var flow = null, sparks = null, orders = null;
    var loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load('img/hero3d/scene.glb', function (g) {
      rig.add(g.scene);
      g.scene.traverse(function (o) {
        if (HREF[o.name] && o.isMesh) {
          /* gltf-transform's quantizer bakes a scale into mesh nodes, so
             scale relative to the loaded one, never to 1 */
          o.userData.r0 = o.rotation.y; o.userData.s0 = o.scale.x;
          if (o.material) o.material = o.material.clone();
          cubes.push(o); floats.push(o); picks.push(o);
        }
        if (o.name === 'logo_gear') { logo = o; floats.push(o); }
        if (/^logo_(left|right)$/.test(o.name)) halves.push(o);
        if (/^logo_/.test(o.name) && o.isMesh) picks.push(o);
        if (/^holo_/.test(o.name)) { holos.push(o); floats.push(o); }
        if (/^wire_/.test(o.name) && o.material) { o.material = o.material.clone(); wires.push(o); }
        if (o.name === 'drone') drone = o;
        if (/^drone_prop_/.test(o.name)) props.push(o);
        if (o.name === 'bot') { bot = o; o.userData.p0 = o.position.clone(); }
        if (/^bot_wheel_/.test(o.name)) wheels.push(o);
        if ((/^rack_led_/.test(o.name) || o.name === 'bot_led') && o.material) { o.material = o.material.clone(); leds.push(o); }
        /* Blender's emission strengths read hot under ACES; tame them */
        if (o.material && o.material.emissiveIntensity) {
          var n = o.material.name || '';
          o.material.emissiveIntensity = /edge/.test(n) ? 0.9 : /wire/.test(n) ? 1.1 : /cube/.test(n) ? 0.35 : /logo/.test(n) ? 0.35 : /holo/.test(n) ? 0.5 : /bulb/.test(n) ? 3 : /desk_mat/.test(n) ? 0.6 : /accent/.test(n) ? 0.7 : 0.38;
        }
      });
      /* parallax: a float's offset scales with how near the camera it is */
      g.scene.updateMatrixWorld(true);
      floats.forEach(function (o) {
        o.userData.p0 = o.position.clone();
        var d = o.getWorldPosition(v1).distanceTo(camBase);
        o.userData.depth = Math.max(0.2, Math.min(1, (8.6 - d) / 3));
      });
      screens = liveScreens(THREE, g.scene);
      /* drifting data motes around the desk */
      var N = 160, pos = new Float32Array(N * 3);
      for (var i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 4; pos[i * 3 + 1] = Math.random() * 2.4; pos[i * 3 + 2] = (Math.random() - 0.5) * 3; }
      var pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      motes = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x5fdcff, size: 0.018, transparent: true, opacity: 0.7, depthWrite: false }));
      rig.add(motes);
      flow = dataFlow(); sparks = sparkBurst(); orders = orderPops();
      scene.classList.add('has-3d');
      /* after the fade-in, the scroll fade drives opacity directly */
      setTimeout(function () { canvas.style.transition = 'none'; }, 1000);
      loop();
    });

    /* round glow sprite shared by the flow and spark points */
    var dot = (function () {
      var c = document.createElement('canvas'); c.width = c.height = 32;
      var g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
      return new THREE.CanvasTexture(c);
    })();

    /* ── data flow: packets run laptop -> each cube -> the gear logo.
       Each path is sampled once into a flat array; packets interpolate
       along it and fade at both ends (additive blending, so a darker
       vertex colour reads as more transparent). */
    function dataFlow() {
      var S = 64, PER = 8, from = new THREE.Vector3(-0.15, 0.9, -0.62), paths = [];
      var gear = logo.getWorldPosition(new THREE.Vector3());
      cubes.forEach(function (c) {
        var cp = c.getWorldPosition(new THREE.Vector3());
        var curve = new THREE.CatmullRomCurve3([from.clone(),
          new THREE.Vector3().lerpVectors(from, cp, 0.5).add(new THREE.Vector3(0, 0.12, 0.15)), cp,
          new THREE.Vector3().lerpVectors(cp, gear, 0.5).add(new THREE.Vector3(0, 0.22, 0)), gear.clone()]);
        var arr = new Float32Array(S * 3);
        for (var i = 0; i < S; i++) { curve.getPointAt(i / (S - 1), v1); arr[i * 3] = v1.x; arr[i * 3 + 1] = v1.y; arr[i * 3 + 2] = v1.z; }
        paths.push(arr);
      });
      var n = paths.length * PER, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      var pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.16, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      pts.frustumCulled = false; rig.add(pts);
      return function (t) {
        for (var k = 0; k < n; k++) {
          var arr = paths[k % paths.length], u = (t * 0.16 + k / n * 1.7 + (k % paths.length) * 0.13) % 1;
          var f = u * (S - 1), i = Math.min(S - 2, f | 0), fr = f - i, j = i * 3;
          pos[k * 3] = arr[j] + (arr[j + 3] - arr[j]) * fr;
          pos[k * 3 + 1] = arr[j + 1] + (arr[j + 4] - arr[j + 1]) * fr;
          pos[k * 3 + 2] = arr[j + 2] + (arr[j + 5] - arr[j + 2]) * fr;
          /* cyan off the laptop, warming to orange as it reaches the gear */
          var a = Math.min(1, Math.sin(u * Math.PI) * 1.4);
          col[k * 3] = u * a; col[k * 3 + 1] = (0.83 - u * 0.3) * a; col[k * 3 + 2] = (1 - u * 0.85) * a;
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      };
    }

    /* ── click the gear: spin burst + sparks thrown off the rim ────── */
    var gearAng = 0, gearBoost = 0;
    function sparkBurst() {
      var N = 44, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), age = 9;
      var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var mat = new THREE.PointsMaterial({ color: 0xffb060, size: 0.13, map: dot, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      var pts = new THREE.Points(geo, mat); pts.frustumCulled = false; world.add(pts);
      var api = function (dt) {
        if (age > 1.2) { mat.opacity = 0; return; }
        age += dt;
        for (var i = 0; i < N * 3; i += 3) {
          vel[i + 1] -= 2.2 * dt;
          pos[i] += vel[i] * dt; pos[i + 1] += vel[i + 1] * dt; pos[i + 2] += vel[i + 2] * dt;
        }
        mat.opacity = Math.max(0, 1 - age / 1.2);
        geo.attributes.position.needsUpdate = true;
      };
      api.fire = function () {
        logo.getWorldPosition(v2);
        for (var i = 0; i < N; i++) {
          var a = Math.random() * Math.PI * 2;
          v1.set(Math.cos(a) * 0.56, Math.sin(a) * 0.56, 0); logo.localToWorld(v1);
          pos[i * 3] = v1.x; pos[i * 3 + 1] = v1.y; pos[i * 3 + 2] = v1.z;
          v1.sub(v2).normalize().multiplyScalar(0.8 + Math.random() * 1.1);
          vel[i * 3] = v1.x + (Math.random() - 0.5) * 0.4; vel[i * 3 + 1] = v1.y + 0.5; vel[i * 3 + 2] = v1.z + Math.random() * 0.6;
        }
        age = 0;
      };
      return api;
    }

    /* ── order pops: small "new order" cards rise off the laptop and
       fade. Three sprites are recycled; a card redraws its canvas only
       when it respawns. Generic amounts, no store names. */
    function orderPops() {
      var AMT = ['$86.50', '$129.00', '$42.90', '$214.75', '$63.20', '$98.00'], X = [-0.25, 0.15, -0.05];
      var pool = [], next = 2, seq = 1042;
      for (var i = 0; i < 3; i++) {
        var c = document.createElement('canvas'); c.width = 320; c.height = 88;
        var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
        var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
        s.visible = false; s.renderOrder = 5; rig.add(s);
        pool.push({ sp: s, g: c.getContext('2d'), tex: tex, t0: -9, x: 0 });
      }
      function draw(p) {
        var g = p.g; g.clearRect(0, 0, 320, 88);
        g.fillStyle = 'rgba(8,20,38,.92)'; g.strokeStyle = '#00d4ff'; g.lineWidth = 3;
        g.beginPath(); g.roundRect(3, 3, 314, 82, 18); g.fill(); g.stroke();
        g.fillStyle = '#14aa78'; g.beginPath(); g.arc(44, 44, 22, 0, 7); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(34, 45); g.lineTo(42, 53); g.lineTo(55, 36); g.stroke();
        g.fillStyle = '#e8f4ff'; g.font = '700 25px system-ui,sans-serif'; g.fillText('New order ' + AMT[seq % AMT.length], 80, 42);
        g.fillStyle = '#78c8f0'; g.font = '600 17px system-ui,sans-serif'; g.fillText('#' + seq + ' · paid', 80, 68);
        p.tex.needsUpdate = true; p.x = X[seq % 3]; seq++;
      }
      return function (t) {
        if (t >= next) {
          var p = pool[0]; for (var i = 1; i < 3; i++) if (pool[i].t0 < p.t0) p = pool[i];
          draw(p); p.t0 = t; p.sp.visible = true; next = t + 3.4;
        }
        for (var k = 0; k < 3; k++) {
          var q = pool[k], a = t - q.t0;
          if (a > 3) { if (q.sp.visible) { q.sp.visible = false; q.sp.material.opacity = 0; } continue; }
          var sc = Math.min(1, a / 0.2) * (a < 0.3 ? 1 + Math.sin(a / 0.3 * Math.PI) * 0.12 : 1);
          q.sp.scale.set(0.62 * sc, 0.17 * sc, 1);
          q.sp.position.set(q.x, 0.97 + a * 0.1, -0.25);
          q.sp.material.opacity = Math.min(1, a / 0.2) * Math.min(1, (3 - a) / 0.8) * 0.95;
        }
      };
    }

    /* drone loop round the desk (three coords: x, up, toward the viewer) */
    var dronePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.3, 1.0, 0.75), new THREE.Vector3(1.3, 1.1, 0.55), new THREE.Vector3(1.45, 1.2, -0.55),
      new THREE.Vector3(0.45, 1.22, -1.2), new THREE.Vector3(-0.75, 1.1, -0.95), new THREE.Vector3(-0.6, 0.98, 0.45)], true);

    /* day/night mood: the hero stays dark, but the lamp and glow follow
       the site theme a little (light = daytime: lamp down, less bloom) */
    var root = document.documentElement, moodT = 0, mood = 0;
    function readTheme() { moodT = root.getAttribute('data-theme') === 'light' ? 1 : 0; }
    readTheme(); mood = moodT;
    new MutationObserver(readTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    /* scroll: as the hero leaves, the camera pulls back, the desk tilts
       and the canvas fades. The listener only stores scrollY; the render
       loop eases toward it. */
    var sy = scrollY, sp = 0, fade = 1;
    addEventListener('scroll', function () { sy = scrollY; }, { passive: true });

    /* pointer: camera leans toward the cursor; cubes and gear are clickable */
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
      var hit = ray.intersectObjects(picks, true)[0];
      var c = null;
      if (hit) { c = hit.object; while (c && !HREF[c.name] && c !== logo) c = c.parent; }
      hover = c;
      stage.style.cursor = c ? 'pointer' : '';
      if (c) { tip.textContent = c === logo ? 'Give it a spin' : LABEL[c.name] + ' →'; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.classList.add('on'); }
      else tip.classList.remove('on');
    }, { passive: true });
    stage.addEventListener('pointerleave', function () { tx = ty = 0; hover = null; tip.classList.remove('on'); });
    stage.addEventListener('click', function () {
      if (!hover) return;
      if (hover === logo) { gearBoost = 14; if (sparks) sparks.fire(); return; }
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
      var t = clock.getElapsedTime(), dt = Math.min(0.05, t - lastT), i; lastT = t;
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      sp += (Math.min(1, sy / (innerHeight * 0.7)) - sp) * 0.08;
      mood += (moodT - mood) * 0.05;

      /* camera: pointer lean, then pulled back along its view line by scroll */
      v1.set(camBase.x + px * 0.9, camBase.y - py * 0.5, camBase.z - px * 0.6).sub(target).multiplyScalar(1 + sp * 0.45);
      cam.position.copy(target).add(v1);
      cam.lookAt(target);
      rig.rotation.x = sp * 0.15;
      var f = 1 - sp;
      if (Math.abs(f - fade) > 0.004) { fade = f; canvas.style.opacity = f.toFixed(3); }

      /* parallax: near floats shift more than far ones */
      for (i = 0; i < floats.length; i++) {
        var o = floats[i], p0 = o.userData.p0, k = o.userData.depth;
        o.position.set(p0.x + camRight.x * px * 0.07 * k, p0.y - py * 0.04 * k, p0.z + camRight.z * px * 0.07 * k);
      }
      for (i = 0; i < cubes.length; i++) {
        var c = cubes[i], lift = c === hover ? 0.12 : 0;
        c.userData.lift = (c.userData.lift || 0) + (lift - (c.userData.lift || 0)) * 0.12;
        c.position.y += Math.sin(t * 1.3 + i * 1.7) * 0.05 + c.userData.lift;
        c.rotation.y = c.userData.r0 + Math.sin(t * 0.6 + i) * 0.25;
        c.scale.setScalar(c.userData.s0 * (1 + c.userData.lift * 0.8));
        /* icons light up one by one: cart, gear, database (4.5s round) */
        var ph = ((t / 4.5 - i / 3) % 1 + 1) % 1, glow = Math.max(0, Math.sin(ph * Math.PI * 3)) * (ph < 1 / 3 ? 1 : 0);
        if (c.material) c.material.emissiveIntensity = 0.3 + glow * 1.6 + (c === hover ? 0.8 : 0);
      }
      /* one pulse runs through the wires in order */
      for (i = 0; i < wires.length; i++) {
        var wp = (t * 0.45 - i * 0.22) % 1; if (wp < 0) wp += 1;
        wires[i].material.emissiveIntensity = 0.9 + 3 * Math.max(0, Math.sin(wp * Math.PI * 2)) ** 3;
      }
      cyan.intensity = 6 + Math.sin(t * 2) * 2;
      lamp.intensity = (3 + Math.sin(t * 7) * 0.15 + Math.sin(t * 13) * 0.1) * (1.2 - mood * 0.5);
      key.intensity = 1.2 + mood * 0.35; hemi.intensity = 0.35 + mood * 0.15;
      bloom.strength = 0.24 - mood * 0.07;
      if (screens) screens.glow(1.08 - mood * 0.22);

      /* gear: idle turn, plus a decaying burst after a click */
      gearAng += (0.35 + gearBoost) * dt; gearBoost *= Math.exp(-dt * 1.8);
      for (i = 0; i < halves.length; i++) halves[i].rotation.z = -gearAng;
      for (i = 0; i < holos.length; i++) holos[i].position.y += Math.sin(t * 0.9 + i * 2) * 0.06;

      /* drone: 18s loop, nose along the path, banks into the turns */
      if (drone) {
        var u = (t / 18) % 1;
        dronePath.getPointAt(u, drone.position);
        drone.position.y += Math.sin(t * 2.1) * 0.025;
        dronePath.getTangentAt(u, v2); dronePath.getTangentAt((u + 0.02) % 1, v3);
        drone.rotation.set(0, Math.atan2(-v2.z, v2.x), 0);
        drone.rotateX((v2.x * v3.z - v2.z * v3.x) * -4);
        for (i = 0; i < props.length; i++) props[i].rotation.y = t * (i % 2 ? 31 : -31);
      }
      /* cart robot: drive right, turn, drive back, turn (12s round) */
      if (bot) {
        var bt = t % 12, leg = bt < 6 ? 0 : 1, lt = bt - leg * 6, s = ease(lt / 5), A = 0.55;
        bot.position.x = bot.userData.p0.x + (leg ? A - 2 * A * s : -A + 2 * A * s);
        bot.rotation.y = Math.PI * (leg + ease(lt - 5));
        var dist = (Math.floor(t / 6) + s) * 2 * A;
        for (i = 0; i < wheels.length; i++) wheels[i].rotation.z = -dist / 0.022;
      }
      /* status LEDs: green steady with flicks, cyan busy, orange slow */
      for (i = 0; i < leds.length; i++) {
        var L = leds[i], kind = L.name === 'bot_led' ? 2 : i % 3, on;
        if (kind === 0) on = ((t * 0.7 + i * 0.37) % 1) > 0.07;
        else if (kind === 1) on = Math.sin(t * 9 + i * 1.3) * Math.sin(t * 3.3 + i * 2.1) > 0;
        else on = ((t * 0.5 + i * 0.21) % 1) < 0.5;
        L.material.emissiveIntensity = on ? 2.2 : 0.15;
      }
      if (flow) flow(t);
      if (sparks) sparks(dt);
      if (orders) orders(t);
      if (screens && t - lastDraw > 1 / 30) { screens(t); lastDraw = t; }
      if (motes) { motes.rotation.y = t * 0.03; motes.position.y = Math.sin(t * 0.4) * 0.05; }

      composer.render();
      loop();
    }
  }

  function ease(x) { return x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x); }

  /* ── live screens ────────────────────────────────────────────────
     The laptop, tablet, chart and keyboard textures from Blender are
     swapped for canvases redrawn at 30fps:
     laptop   a key lights up, then the store page scrolls down and back
     tablet   the lightning > gear > database flow lights node by node
     chart    the sales line draws itself and the total counts up
     code     a small sync script types itself out, then starts over
     draw.glow(k) scales every screen's emission (day/night mood)     */
  function liveScreens(THREE, root) {
    function slot(name, w, h) {
      var mesh = root.getObjectByName(name);
      if (!mesh || !mesh.material) return null;
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var tex = new THREE.CanvasTexture(c);
      tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      var m = mesh.material = mesh.material.clone();
      m.map = tex; if (m.emissiveMap) m.emissiveMap = tex;
      m.userData.e0 = m.emissiveIntensity; mats.push(m);
      return { g: c.getContext('2d'), w: w, h: h, tex: tex };
    }
    var mats = [];
    var L = slot('laptop_screen', 640, 400), T = slot('tablet_screen', 300, 410),
        C = slot('holo_chart', 320, 200), K = slot('laptop_keys', 512, 256), G = slot('holo_gauge', 256, 256),
        D = slot('holo_code', 360, 240);
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

    /* generic order-sync snippet: [indent, [text, colour], ...] */
    var KW = '#3fe0ff', ID = '#f2f8ff', STR = '#ffa04a', CM = '#7fb0d4', DOTS = ['#ff8c28', '#00d4ff', '#2ee6a0'];
    var CODE = [
      [0, ['const ', KW], ['order = ', ID], ['await ', KW], ['store.get(id);', ID]],
      [0, ['if ', KW], ['(order.paid) {', ID]],
      [1, ['await ', KW], ['stock.sync(order);', ID]],
      [1, ['notify(', ID], ["'#ops'", STR], [', order.total);', ID]],
      [0, ['}', ID]],
      [0, ['// ✓ 42 orders synced', CM]]];
    var CODE_LEN = CODE.reduce(function (n, l) { return n + l.slice(1).reduce(function (m, p) { return m + p[0].length; }, 0); }, 0);
    var vals = [30, 42, 38, 55, 50, 68, 64, 82];

    var draw = function (t) {
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
      /* code window: types at ~24 chars/s, holds, then clears */
      if (D) {
        var g5 = D.g, typed = Math.floor((t % (CODE_LEN / 24 + 2.5)) * 24), y5 = 70;
        g5.fillStyle = '#0b1f3a'; g5.fillRect(0, 0, 360, 240);
        rr(g5, 4, 4, 352, 40, 16, '#12305a');
        g5.strokeStyle = '#3fe0ff'; g5.lineWidth = 6; g5.beginPath(); g5.roundRect(4, 4, 352, 232, 18); g5.stroke();
        for (var di = 0; di < 3; di++) { g5.fillStyle = DOTS[di]; g5.beginPath(); g5.arc(26 + di * 20, 24, 6, 0, 7); g5.fill(); }
        g5.font = '700 16px ui-monospace,Consolas,monospace';
        var left = typed, cx = 0;
        for (var li = 0; li < CODE.length && left > 0; li++, y5 += 26) {
          cx = 22 + CODE[li][0] * 22;
          for (var pi = 1; pi < CODE[li].length && left > 0; pi++) {
            var txt = CODE[li][pi][0], part = txt.slice(0, left);
            g5.fillStyle = CODE[li][pi][1]; g5.fillText(part, cx, y5);
            cx += g5.measureText(part).width; left -= txt.length;
          }
        }
        /* caret blinks at the end of the typed text */
        if ((t * 2 | 0) % 2) { g5.fillStyle = '#9beeff'; g5.fillRect(cx + 2, y5 - 26 - 13, 8, 16); }
        D.tex.needsUpdate = true;
      }
    };
    draw.glow = function (k) { for (var i = 0; i < mats.length; i++) mats[i].emissiveIntensity = mats[i].userData.e0 * k; };
    return draw;
  }

  function whenIdle() { ('requestIdleCallback' in window) ? requestIdleCallback(boot, { timeout: 2500 }) : setTimeout(boot, 1200); }
  /* Not the load event: a slow third-party beacon (the analytics pixel)
     can hold 'load' back for a minute, which kept the 3D waiting. */
  if (document.readyState === 'complete') whenIdle();
  else addEventListener('DOMContentLoaded', function () { setTimeout(whenIdle, 1500); });
})();
