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
   Round 5: click the laptop to zoom in on a sale, hover labels on most
   props, double-click the robot, desk sheen, lamp dust, a Manila-time
   sky behind the desk, Dumpling asleep on the books, a reviews shelf and
   a label printer that prints with every order.
   Round 6: Dumpling's siblings Mochi, Tofu and Pochi sit on the front
   right (wag, head tilt, breathing, a blink), a flip calendar that
   ticks off a task every 8s, parcels on a scale that weighs each order,
   and steam off the coffee mug.
═══════════════════════════════════════ */
(function () {
  var stage = document.getElementById('heroStage');
  var scene = document.getElementById('heroScene');
  if (!stage || !scene) return;
  var ok = matchMedia('(min-width:1024px) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  if (!ok.matches) return;

  var V = 'https://cdn.jsdelivr.net/npm/three@0.170.0';
  /* hover labels: node name -> { label, href (click scrolls), act } */
  var LAPTOP = { label: 'Click to see a sale', act: 'laptop' }, TABLET = { label: 'Workflow automation' };
  var OWN = {
    cube_cart: { label: 'Store builds', href: '#work' },
    cube_gear: { label: 'Try an automation', href: '#automation-demo' },
    cube_db: { label: 'Data & monitoring', href: '#toolkit' },
    logo_gear: { label: 'Give it a spin', act: 'gear' },
    laptop_base: LAPTOP, laptop_lid: LAPTOP, laptop_keys: LAPTOP,
    drone: { label: 'Fulfilment' }, rack: { label: 'Monitoring 24/7' },
    holo_code: { label: 'Custom integrations' }, holo_chart: { label: 'Live analytics' },
    tablet: TABLET, tablet_screen: TABLET, tablet_stand: TABLET,
    holo_order: { label: 'Real-time orders' }, bot: { label: 'Warehouse automation', act: 'bot' },
    dog: { label: 'Dumpling, chief morale officer' },
    shelf: { label: 'Read the reviews', href: '#testimonials' }
  };

  /* the pups: node name in scene.glb -> hover label (names swap here and
     in 3d/build_scene.py). wag = tail rhythm (rad/s), amp = wag size,
     tilt = head-tilt period (s), blink = seconds between blinks. */
  var MOCHI = 'Mochi', TOFU = 'Tofu', POCHI = 'Pochi';
  var PUPS = {
    mochi: { label: MOCHI + ', head of security', wag: 9, amp: 0.45, tilt: 9.5, blink: 4.3 },
    tofu: { label: TOFU + ', snack inspector', wag: 5.5, amp: 0.3, tilt: 7.1, blink: 5.9 },
    pochi: { label: POCHI + ', QA tester', wag: 13, amp: 0.38, tilt: 11.3, blink: 3.7 }
  };
  Object.keys(PUPS).forEach(function (k) { OWN[k] = { label: PUPS[k].label }; });
  OWN.cal = { label: 'Done list' }; OWN.parcels = { label: 'Packed & weighed' };

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

    var motes = null, screens = null, lastDraw = -1, lastT = 0, skyT = 0;
    var cubes = [], wires = [], holos = [], floats = [], leds = [], halves = [], picks = [];
    var logo = null, drone = null, props = [], bot = null, wheels = [], hover = null;
    var flow = null, sparks = null, orders = null, dust = null, sky = null, dog = {}, dogW = new THREE.Vector3(), printer = null;
    /* Dumpling's hop: idle until hopAt, then 0.95 s of squash -> up ->
       stretch -> land squash. h = height 0..1, sx/sy = scale factors. */
    var hopAt = 3 + Math.random() * 3, dogWag = 0;
    function dogHop(t) {
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
    var pups = [], cal = null, weigh = null, steam = null;
    var zc = new THREE.Vector3(), zcam = new THREE.Vector3(), look = new THREE.Vector3();
    var loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load('img/hero3d/scene.glb', function (g) {
      rig.add(g.scene);
      g.scene.traverse(function (o) {
        if (OWN[o.name]) o.userData.own = OWN[o.name];
        /* every mesh is a pick target, so props hidden behind others
           stay unpickable; the owner is found by walking up parents */
        if (o.isMesh) picks.push(o);
        if (/^cube_/.test(o.name) && o.isMesh) {
          /* gltf-transform's quantizer bakes a scale into mesh nodes, so
             scale relative to the loaded one, never to 1 */
          o.userData.r0 = o.rotation.y; o.userData.s0 = o.scale.x;
          if (o.material) o.material = o.material.clone();
          cubes.push(o); floats.push(o);
        }
        if (o.name === 'logo_gear') { logo = o; floats.push(o); }
        if (/^logo_(left|right)$/.test(o.name)) halves.push(o);
        if (/^holo_/.test(o.name)) { holos.push(o); floats.push(o); }
        if (/^wire_/.test(o.name) && o.material) { o.material = o.material.clone(); wires.push(o); }
        if (o.name === 'drone') drone = o;
        if (/^drone_prop_/.test(o.name)) props.push(o);
        if (o.name === 'bot') { bot = o; o.userData.p0 = o.position.clone(); }
        if (/^bot_wheel_/.test(o.name)) wheels.push(o);
        if ((/^rack_led_/.test(o.name) || o.name === 'bot_led') && o.material) { o.material = o.material.clone(); leds.push(o); }
        if (PUPS[o.name]) pups.push({ cfg: PUPS[o.name], root: o });
        if (/^dog_(body|head|ear_l|ear_r|tail|paws|paw_l|paw_r|shadow)$/.test(o.name)) { dog[o.name.slice(4)] = o; o.userData.p0 = o.position.clone(); o.userData.r0 = o.rotation.clone(); o.userData.s0 = o.scale.clone(); }
        if (o.name === 'dog') { dog.root = o; o.userData.r0 = o.rotation.clone(); o.userData.p0 = o.position.clone(); }
        /* Dumpling is a photo cut-out: crisp alpha edge, both faces, and a
           soft self-glow so the cream coat is not greyed by the cool key */
        if (o.isMesh && o.material && /^dog_(tail_|paw_[lr]_)?cutout$/.test(o.material.name)) {
          var dm = o.material = o.material.clone();
          dm.transparent = false; dm.alphaTest = 0.4; dm.depthWrite = true; dm.side = THREE.DoubleSide;
          dm.metalness = 0; dm.roughness = 1; dm.emissive = new THREE.Color(1, 1, 1); dm.emissiveMap = dm.map; dm.emissiveIntensity = 0.45;
          /* clamp: repeat-wrap pulled the paws row onto the card's top edge (stray dashes) */
          if (dm.map) { dm.map.wrapS = dm.map.wrapT = THREE.ClampToEdgeWrapping; dm.map.needsUpdate = true; }
          dm.userData.keepEmissive = true; dm.needsUpdate = true;
        }
        if (o.isMesh && o.material && o.material.name === 'dog_shadow') { o.material = o.material.clone(); o.material.transparent = true; o.material.depthWrite = false; o.material.opacity = 0.55; }
        /* Blender's emission strengths read hot under ACES; tame them */
        if (o.material && o.material.emissiveIntensity && !o.material.userData.keepEmissive) {
          var n = o.material.name || '';
          o.material.emissiveIntensity = /edge/.test(n) ? 0.9 : /wire/.test(n) ? 1.1 : /cube/.test(n) ? 0.35 : /logo/.test(n) ? 0.35 : /holo/.test(n) ? 0.5 : /bulb/.test(n) ? 3 : /plaque|trophy/.test(n) ? 0.9 : /desk_mat/.test(n) ? 0.6 : /accent/.test(n) ? 0.7 : 0.38;
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
      /* zoom target: the laptop screen's centre, seen square on. The lid
         leans back 14deg, so its normal is (0, sin14, cos14). */
      g.scene.getObjectByName('laptop_screen').getWorldPosition(zc);
      zcam.set(0, 0.242, 0.97).multiplyScalar(3.8).add(zc);
      printer = labelPrinter(g.scene);
      pups.forEach(function (p) {
        ['body', 'head', 'eyes', 'tail'].forEach(function (k) {
          var o = g.scene.getObjectByName(p.root.name + '_' + k);
          if (o) { o.userData.p0 = o.position.clone(); o.userData.r0 = o.rotation.clone(); o.userData.s0 = o.scale.clone(); }
          p[k] = o;
        });
        p.ph = Math.random() * 6;
      });
      cal = deskCalendar(g.scene); weigh = parcelScale(g.scene); steam = mugSteam(g.scene);
      deskSheen(g.scene);
      dust = lampDust(); sky = skyPanel();
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
        s.userData.own = { label: 'Real-time orders' }; picks.push(s);
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
          if (printer) printer.print(t);
          if (weigh) weigh.bump(t);
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

    /* ── label printer: each new order slides a label out of the slot,
       it drops onto the desk and fades. Only the printer_label empty
       moves (local +z is the printer's front). */
    function labelPrinter(root) {
      var lab = root.getObjectByName('printer_label'), led = root.getObjectByName('printer_led');
      if (!lab) return null;
      var p0 = lab.position.clone(), r0 = lab.rotation.x, t0 = -9, mats = [];
      lab.traverse(function (o) { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
      if (led) led.material = led.material.clone();
      lab.visible = false;
      var api = function (t) {
        var u = t - t0;
        if (led) led.material.emissiveIntensity = u < 1.4 && ((t * 10) | 0) % 2 ? 2.4 : 0.3;
        if (u > 2.6) { lab.visible = false; return; }
        lab.visible = true;
        var out = ease(u / 0.7), drop = ease((u - 1.4) / 0.3), a = 1 - ease((u - 1.8) / 0.8);
        lab.position.set(p0.x, p0.y - 0.027 * drop, p0.z - 0.1 * (1 - out) + 0.03 * drop);
        lab.rotation.x = r0 + 0.12 * drop * (1 - drop) * 4;
        for (var i = 0; i < mats.length; i++) mats[i].opacity = a;
      };
      api.print = function (t) { t0 = t; };
      return api;
    }

    /* canvas-backed texture on a named mesh (UVs from Blender: flipY off) */
    function paintSlot(root, name, w, h) {
      var mesh = root.getObjectByName(name);
      if (!mesh || !mesh.material) return null;
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var tex = new THREE.CanvasTexture(c); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      var m = mesh.material = mesh.material.clone();
      m.map = tex; m.emissiveMap = tex; m.emissive.set(0xffffff); m.emissiveIntensity = 0.32; m.needsUpdate = true;
      return { g: c.getContext('2d'), tex: tex, m: m, mesh: mesh };
    }

    /* ── flip calendar: every 8s the top note swings up over the rings,
       flutters and fades, showing the next ticked-off task underneath */
    function deskCalendar(root) {
      var NOTES = ['Launch', 'Sync', 'Ship orders', 'Fix checkout', 'Go live'];
      var page = paintSlot(root, 'cal_page', 256, 204), top = paintSlot(root, 'cal_flip_page', 256, 204);
      var hinge = root.getObjectByName('cal_flip');
      if (!page || !top || !hinge) return null;
      top.m.transparent = true;
      var r0 = hinge.rotation.x, PERIOD = 8, last = -1;
      function draw(s, k) {
        var g = s.g, w = NOTES[k % NOTES.length];
        g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 256, 204);
        g.fillStyle = '#e8572a'; g.fillRect(0, 0, 256, 44);
        g.fillStyle = '#fff'; g.font = '700 22px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('TODAY', 128, 30);
        g.fillStyle = '#142032'; g.font = '800 ' + (w.length > 9 ? 31 : 38) + 'px system-ui,sans-serif'; g.fillText(w, 128, 116);
        g.fillStyle = '#14aa78'; g.beginPath(); g.arc(128, 160, 22, 0, 7); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(117, 161); g.lineTo(125, 169); g.lineTo(139, 151); g.stroke();
        s.tex.needsUpdate = true;
      }
      return function (t) {
        var cyc = Math.floor(t / PERIOD), u = (t % PERIOD - (PERIOD - 1.4)) / 1.4;
        if (cyc !== last) { last = cyc; draw(top, cyc); draw(page, cyc + 1); }
        if (u < 0) { hinge.rotation.x = r0; top.m.opacity = 1; top.mesh.visible = true; return; }
        var e = ease(u);
        hinge.rotation.x = r0 - e * 3.3 + Math.sin(u * 18) * 0.12 * (1 - u);
        top.m.opacity = 1 - ease((u - 0.55) / 0.45);
        top.mesh.visible = top.m.opacity > 0.01;
      };
    }

    /* ── parcel scale: each order the top box hops and the display
       counts up to a new weight */
    function parcelScale(root) {
      var lcd = paintSlot(root, 'scale_lcd', 160, 32), box = root.getObjectByName('parcel_top');
      if (!lcd) return null;
      lcd.m.emissiveIntensity = 1.1;
      var W = [1.24, 0.86, 2.31, 0.47, 1.68, 3.05], k = 0, from = 1.24, to = 1.24, t0 = -9, shown = -1;
      var p0 = box ? box.position.clone() : null;
      function draw(v) {
        var g = lcd.g; g.fillStyle = '#061a12'; g.fillRect(0, 0, 160, 32);
        g.fillStyle = '#3dffa0'; g.font = '700 24px ui-monospace,Consolas,monospace'; g.textAlign = 'center';
        g.fillText(v.toFixed(2) + ' kg', 80, 25); lcd.tex.needsUpdate = true;
      }
      var api = function (t) {
        var u = t - t0;
        if (box) box.position.y = p0.y + (u < 0.5 ? Math.sin(u / 0.5 * Math.PI) * 0.02 : 0);
        var v = u < 0.5 ? 0 : u < 1.3 ? from + (to - from) * ease((u - 0.5) / 0.8) : to;
        v = Math.round(v * 100) / 100;
        if (v !== shown) { shown = v; draw(v); }
      };
      api.bump = function (t) { from = 0; k = (k + 1) % W.length; to = W[k]; t0 = t; };
      return api;
    }

    /* ── mug steam: a few soft wisps rise, sway and fade, recycled */
    function mugSteam(root) {
      var mug = root.getObjectByName('mug');
      if (!mug) return null;
      var c = document.createElement('canvas'); c.width = 64; c.height = 128;
      var g = c.getContext('2d');
      /* one curling stroke, blurred into a wisp */
      g.filter = 'blur(5px)'; g.strokeStyle = 'rgba(255,244,228,.9)'; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(32, 120); g.bezierCurveTo(10, 90, 54, 64, 30, 36); g.bezierCurveTo(18, 22, 36, 12, 34, 6); g.stroke();
      var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      var top = new THREE.Vector3(); mug.getWorldPosition(top); top.y += 0.09;
      var N = 5, list = [];
      for (var i = 0; i < N; i++) {
        var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xfff1dc, transparent: true, opacity: 0, depthWrite: false }));
        sp.renderOrder = 4; rig.add(sp); list.push({ s: sp, o: i / N, side: i % 2 ? 1 : -1 });
      }
      return function (t) {
        for (var i = 0; i < N; i++) {
          var w = list[i], u = (t / 3.6 + w.o) % 1, s = 0.07 + u * 0.09;
          w.s.position.set(top.x + Math.sin(t * 1.3 + i * 2) * 0.02 * u + w.side * 0.012, top.y + u * 0.32, top.z + Math.cos(t * 0.9 + i) * 0.015 * u);
          w.s.scale.set(s * 0.55, s, 1);
          w.s.material.rotation = w.side * (0.15 + u * 0.4) * Math.sin(t * 0.7 + i);
          w.s.material.opacity = Math.sin(u * Math.PI) * 0.26;
        }
      };
    }

    /* ── desk sheen: a tiny environment of glowing strips, prefiltered
       once (PMREM), gives the desk soft glossy reflections. Plus faint
       additive glow decals under the bright things that stand on it. */
    function deskSheen(root) {
      var desk = root.getObjectByName('desk');
      var env = new THREE.Scene(); env.background = new THREE.Color(0x03070e);
      [[0x00d4ff, 6, 0.5, -0.3, 0.3, -5], [0xff8c28, 2, 0.4, 2.4, 0.5, -4.6], [0x9fd8ff, 2.5, 0.6, -2.6, 0.7, -4.8], [0x0e7aff, 8, 1.4, 0, 2.6, -4]]
        .forEach(function (b) {
          var m = new THREE.Mesh(new THREE.PlaneGeometry(b[1], b[2]), new THREE.MeshBasicMaterial({ color: b[0] }));
          m.position.set(b[3], b[4], b[5]); m.lookAt(0, 0, 0); env.add(m);
        });
      var pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(env, 0.04);
      pm.dispose(); env.traverse(function (o) { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      if (desk && desk.material) {
        desk.material = desk.material.clone();
        desk.material.envMap = rt.texture; desk.material.envMapIntensity = 0.55; desk.material.roughness = 0.3;
      }
      /* glow decals: soft streak fading away from the source */
      var c = document.createElement('canvas'); c.width = 64; c.height = 128;
      var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
      g.globalCompositeOperation = 'destination-in';
      var gx = g.createLinearGradient(0, 0, 64, 0);
      gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.3, '#000'); gx.addColorStop(0.7, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gx; g.fillRect(0, 0, 64, 128);
      var tex = new THREE.CanvasTexture(c), geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      /* [colour, opacity, x, z (three), width, length, turn] */
      [[0x2aa8ff, 0.2, 1.17, -0.12, 0.6, 0.5, -0.49], [0x2ee6a0, 0.12, 1.6, -0.4, 0.24, 0.3, -0.21],
       [0xffa040, 0.16, -1.36, -0.02, 0.5, 0.45, 0.2], [0x7fd8ff, 0.1, -0.15, 0.62, 1.3, 0.22, 0]]
        .forEach(function (d) {
          var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: d[0], transparent: true, opacity: d[1], depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
          m.scale.set(d[4], 1, d[5]); m.rotation.y = d[6];
          /* the bright end (texture top) sits at the source, toward -z */
          m.position.set(d[2], 0.004, d[3] + d[5] / 2); m.renderOrder = 1; rig.add(m);
        });
    }

    /* ── dust motes drifting in the lamp's light cone. Each mote keeps a
       fixed spot in the cone and drifts slowly down it; additive warm
       points that fade at both ends (darker colour = more transparent). */
    function lampDust() {
      var N = 36, apex = new THREE.Vector3(-1.4, 0.6, -0.05), axis = new THREE.Vector3(0.12, -1, 0.14).normalize();
      var a = new THREE.Vector3(1, 0, 0).cross(axis).normalize(), b = new THREE.Vector3().crossVectors(axis, a);
      var seed = new Float32Array(N * 4), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
      for (var i = 0; i < N; i++) { seed[i * 4] = Math.random(); seed[i * 4 + 1] = Math.random() * Math.PI * 2; seed[i * 4 + 2] = Math.sqrt(Math.random()); seed[i * 4 + 3] = 0.02 + Math.random() * 0.03; }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      var pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.035, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      pts.frustumCulled = false; rig.add(pts);
      return function (t, k) {
        for (var i = 0; i < N; i++) {
          var j = i * 4, u = (seed[j] + t * seed[j + 3]) % 1, ang = seed[j + 1] + t * 0.15, r = seed[j + 2] * u * 0.32;
          var ca = Math.cos(ang) * r, sa = Math.sin(ang) * r, d = 0.08 + u * 0.55, w = Math.sin(t * 0.7 + i) * 0.01;
          pos[i * 3] = apex.x + axis.x * d + a.x * ca + b.x * sa + w;
          pos[i * 3 + 1] = apex.y + axis.y * d + a.y * ca + b.y * sa;
          pos[i * 3 + 2] = apex.z + axis.z * d + a.z * ca + b.z * sa;
          var f = Math.sin(u * Math.PI) * k * (0.6 + 0.4 * Math.sin(t * 2 + i * 1.7));
          col[i * 3] = f; col[i * 3 + 1] = f * 0.72; col[i * 3 + 2] = f * 0.4;
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      };
    }

    /* ── sky behind the desk: a faint, feathered window onto a distant
       skyline whose sky follows Manila time (night, dawn, day, sunset,
       evening). Redrawn once a minute; drawn first, never bloomed. */
    function skyPanel() {
      var W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
      var g = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      /* [hour, top, bottom] keyframes, Manila local time */
      var KEY = [[0, '#060d24', '#0d1a3a'], [4.8, '#08122e', '#1a2452'], [5.8, '#2c3a78', '#e0866a'], [7, '#3f86cc', '#f2c49a'],
        [9, '#2f8fe0', '#a6d6f2'], [16, '#3a8ad8', '#b0d8ee'], [17.4, '#5a4c9c', '#ff8a52'], [18.2, '#3a2c70', '#e0607a'],
        [19.2, '#141c4c', '#4a3466'], [20.5, '#060d24', '#0d1a3a'], [24, '#060d24', '#0d1a3a']];
      var rnd = 11, R = function () { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
      var towers = [], stars = [], i;
      for (var x = 0; x < W;) { var w = 16 + R() * 34; towers.push([x, w, 40 + R() * 90]); x += w + 2 + R() * 6; }
      for (i = 0; i < 40; i++) stars.push([R() * W, R() * H * 0.55, R()]);
      function mix(a, b, f) {
        var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), o = '#';
        for (var s = 16; s >= 0; s -= 8) o += ('0' + Math.round(((A >> s) & 255) * (1 - f) + ((B >> s) & 255) * f).toString(16)).slice(-2);
        return o;
      }
      var mesh = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }));
      mesh.position.set(-0.4, 1.35, -3.1); mesh.rotation.y = 0.26; mesh.renderOrder = -1; rig.add(mesh);
      var api = function (hourOverride) {
        var h = hourOverride != null ? hourOverride : (Date.now() / 3.6e6 + 8) % 24, k = 0;
        while (KEY[k + 1][0] <= h) k++;
        var f = (h - KEY[k][0]) / (KEY[k + 1][0] - KEY[k][0]);
        var night = h < 5.5 || h > 19.5 ? 1 : h < 6.5 ? 6.5 - h : h > 18.5 ? h - 18.5 : 0;
        var top = mix(KEY[k][1], KEY[k + 1][1], f), gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, top); gr.addColorStop(1, mix(KEY[k][2], KEY[k + 1][2], f));
        g.globalCompositeOperation = 'source-over'; g.fillStyle = gr; g.fillRect(0, 0, W, H);
        for (i = 0; i < stars.length; i++) { g.fillStyle = 'rgba(220,235,255,' + (night * (0.3 + stars[i][2] * 0.6)).toFixed(2) + ')'; g.fillRect(stars[i][0], stars[i][1], 2, 2); }
        if (night < 1) {  /* sun arcs over the day, low and warm at the ends */
          var sd = Math.max(0, Math.min(1, (h - 6) / 12)), sx = 60 + sd * 390, sy2 = 150 - Math.sin(sd * Math.PI) * 110;
          g.fillStyle = 'rgba(255,236,190,' + (0.9 * (1 - night)).toFixed(2) + ')'; g.beginPath(); g.arc(sx, sy2, 16, 0, 7); g.fill();
        }
        if (night > 0) {  /* crescent moon: a disc with a sky-coloured bite */
          g.fillStyle = 'rgba(230,240,255,' + (0.85 * night).toFixed(2) + ')'; g.beginPath(); g.arc(400, 56, 13, 0, 7); g.fill();
          g.fillStyle = top; g.beginPath(); g.arc(407, 51, 12, 0, 7); g.fill();
        }
        for (i = 0; i < towers.length; i++) {
          var T = towers[i]; g.fillStyle = '#0a1424'; g.fillRect(T[0], H - T[2], T[1], T[2]);
          if (night > 0.2) {
            g.fillStyle = 'rgba(255,196,110,' + (0.65 * night).toFixed(2) + ')';
            for (var wy = H - T[2] + 8; wy < H - 6; wy += 11) for (var wx = T[0] + 4; wx < T[0] + T[1] - 5; wx += 8)
              if (((wx * 7 + wy * 13) | 0) % 5 < 2) g.fillRect(wx, wy, 3, 4);
          }
        }
        /* the towers share the hero's navy, so the skyline reads as a cut
           out of the sky glow, never as dark slabs; then the window frame
           and a feather on every edge into the dark hero */
        g.fillStyle = 'rgba(10,20,36,.85)'; g.fillRect(W / 3 - 2, 0, 4, H); g.fillRect(W * 2 / 3 - 2, 0, 4, H);
        g.globalCompositeOperation = 'destination-in';
        g.save(); g.scale(1, H / W);
        var fe = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
        fe.addColorStop(0, '#000'); fe.addColorStop(0.5, '#000'); fe.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = fe; g.fillRect(0, 0, W, W); g.restore();
        g.globalCompositeOperation = 'source-over';
        /* bright daytime sky reads louder, so it gets less opacity */
        mesh.material.opacity = 0.26 + night * 0.1;
        tex.needsUpdate = true;
      };
      api(); return api;
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

    /* pointer: camera leans toward the cursor; labelled props show a tip,
       cubes and the plaque scroll to their section, the gear spins, the
       laptop zooms in on a sale, the robot answers a double-click */
    var px = 0, py = 0, tx = 0, ty = 0, lastPick = 0;
    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    var tip = document.createElement('span'); tip.className = 'hero-3d-tip'; scene.appendChild(tip);
    var beep = document.createElement('span'); beep.className = 'hero-3d-tip hero-3d-beep'; beep.textContent = 'beep!'; scene.appendChild(beep);
    function owner(e) {
      if (e) {
        var cr = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - cr.left) / cr.width - 0.5) * 2, -((e.clientY - cr.top) / cr.height - 0.5) * 2);
        ray.setFromCamera(ndc, cam);
      }
      var hits = ray.intersectObjects(picks, false);
      for (var i = 0; i < hits.length; i++) {
        var o = hits[i].object;
        /* recycled order cards are invisible between pops */
        if (o.isSprite && (!o.visible || o.material.opacity < 0.3)) continue;
        while (o && !o.userData.own) o = o.parent;
        return o || null;
      }
      return null;
    }
    stage.addEventListener('pointermove', function (e) {
      /* the canvas overhangs the scene box (56-hero-motion.css), so
         pick against the canvas and place the tip against the scene */
      var cr = canvas.getBoundingClientRect(), r = scene.getBoundingClientRect();
      tx = ((e.clientX - cr.left) / cr.width - 0.5) * 2;
      ty = ((e.clientY - cr.top) / cr.height - 0.5) * 2;
      tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px';
      if (zoomT) { hover = null; tip.classList.remove('on'); stage.style.cursor = 'zoom-out'; return; }
      /* every mesh is tested now, so pick at most ~30 times a second */
      if (e.timeStamp - lastPick < 33) return;
      lastPick = e.timeStamp;
      var c = owner(e);
      hover = c;
      stage.style.cursor = c && (c.userData.own.href || c.userData.own.act) ? 'pointer' : '';
      if (c) { tip.textContent = c.userData.own.label + (c.userData.own.href ? ' →' : ''); tip.classList.add('on'); }
      else tip.classList.remove('on');
    }, { passive: true });
    stage.addEventListener('pointerleave', function () { tx = ty = 0; hover = null; tip.classList.remove('on'); });
    stage.addEventListener('click', function (e) {
      if (zoomT) { zoomOut(); return; }
      hover = owner(e);
      if (!hover) return;
      var own = hover.userData.own;
      if (own.act === 'gear') { gearBoost = 14; if (sparks) sparks.fire(); return; }
      if (own.act === 'laptop') { zoomIn(); return; }
      var el = own.href && document.querySelector(own.href);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    /* the robot is small and moving, so a double-click near it counts too */
    stage.addEventListener('dblclick', function (e) {
      if (!bot) return;
      var o = owner(e), cr = canvas.getBoundingClientRect();
      v2.set(0, 0.05, 0); bot.localToWorld(v2); v2.project(cam);
      var d = Math.hypot(cr.left + (v2.x + 1) / 2 * cr.width - e.clientX, cr.top + (1 - v2.y) / 2 * cr.height - e.clientY);
      if ((o && o.userData.own.act === 'bot') || d < 40) hopReq = true;
    });

    /* laptop zoom: eases the camera to face the screen while the store
       page plays a sale. Any click, Esc, wheel or scroll zooms back out,
       and page scrolling itself is never blocked. */
    var zoomT = 0, zoom = 0, zoomSy = 0, saleReq = false, hopReq = false, hopT = -9, beepOn = false;
    function zoomIn() { zoomT = 1; zoomSy = scrollY; saleReq = true; hover = null; tip.classList.remove('on'); stage.style.cursor = 'zoom-out'; }
    function zoomOut() { if (!zoomT) return; zoomT = 0; stage.style.cursor = ''; }
    addEventListener('keydown', function (e) { if (e.key === 'Escape') zoomOut(); });
    stage.addEventListener('wheel', zoomOut, { passive: true });
    document.addEventListener('click', function (e) { if (!stage.contains(e.target)) zoomOut(); });
    addEventListener('scroll', function () { if (zoomT && Math.abs(scrollY - zoomSy) > 40) zoomOut(); }, { passive: true });

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
      /* laptop zoom (z: 0 out, 1 in) mutes the lean, parallax and tilt */
      zoom += (zoomT - zoom) * Math.min(1, dt * 3.2);
      var z = ease(zoom), lean = 1 - z;
      if (saleReq) { saleReq = false; if (screens) screens.sale(t); }
      if (!zoomT && zoom < 0.15 && screens) screens.sale(-1);

      /* camera: pointer lean, then pulled back along its view line by scroll,
         then eased toward the face-on view of the laptop screen */
      v1.set(camBase.x + px * 0.9 * lean, camBase.y - py * 0.5 * lean, camBase.z - px * 0.6 * lean).sub(target).multiplyScalar(1 + sp * 0.45 * lean);
      cam.position.copy(target).add(v1).lerp(zcam, z);
      cam.lookAt(look.copy(target).lerp(zc, z));
      rig.rotation.x = sp * 0.15 * lean;
      var f = 1 - sp;
      if (Math.abs(f - fade) > 0.004) { fade = f; canvas.style.opacity = f.toFixed(3); }

      /* parallax: near floats shift more than far ones */
      for (i = 0; i < floats.length; i++) {
        var o = floats[i], p0 = o.userData.p0, k = o.userData.depth;
        k *= lean;
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
      /* face-on, the white store page would bloom; ease it down a little */
      if (screens) screens.glow((1.08 - mood * 0.22) * (1 - z * 0.3));

      /* gear: idle turn, plus a decaying burst after a click */
      gearAng += (0.35 + gearBoost) * dt; gearBoost *= Math.exp(-dt * 1.8);
      for (i = 0; i < halves.length; i++) halves[i].rotation.z = -gearAng;
      for (i = 0; i < holos.length; i++) holos[i].position.y += Math.sin(t * 0.9 + i * 2) * 0.06;

      /* drone: 18s loop, nose along the path, banks into the turns */
      if (drone) {
        var u = (t / 18) % 1;
        dronePath.getPointAt(u, drone.position);
        /* while zoomed it flies higher, clear of the laptop screen */
        drone.position.y += Math.sin(t * 2.1) * 0.025 + z * 0.75;
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
        /* double-click: a quick spin hop and a "beep!" bubble */
        if (hopReq) { hopReq = false; hopT = t; }
        var hu = (t - hopT) / 0.75;
        bot.position.y = bot.userData.p0.y + (hu < 1 ? Math.sin(hu * Math.PI) * 0.13 : 0);
        if (hu < 1) bot.rotation.y += Math.PI * 2 * ease(hu);
        if (hu < 2) {
          v2.set(0, 0.32, 0); bot.localToWorld(v2); v2.project(cam);
          var cr = canvas.getBoundingClientRect(), sr = scene.getBoundingClientRect();
          beep.style.left = (cr.left - sr.left + (v2.x + 1) / 2 * cr.width) + 'px';
          beep.style.top = (cr.top - sr.top + (1 - v2.y) / 2 * cr.height) + 'px';
          if (!beepOn) { beepOn = true; beep.classList.add('on'); }
        } else if (beepOn) { beepOn = false; beep.classList.remove('on'); }
      }
      /* status LEDs: green steady with flicks, cyan busy, orange slow */
      for (i = 0; i < leds.length; i++) {
        var L = leds[i], kind = L.name === 'bot_led' ? 2 : i % 3, on;
        if (kind === 0) on = ((t * 0.7 + i * 0.37) % 1) > 0.07;
        else if (kind === 1) on = Math.sin(t * 9 + i * 1.3) * Math.sin(t * 3.3 + i * 2.1) > 0;
        else on = ((t * 0.5 + i * 0.21) % 1) < 0.5;
        /* the robot's antenna flashes fast for a second after the hop */
        if (kind === 2 && t - hopT < 1.3) { L.material.emissiveIntensity = ((t * 14) | 0) % 2 ? 4 : 0.2; continue; }
        L.material.emissiveIntensity = on ? 2.2 : 0.15;
      }
      if (flow) flow(t);
      if (sparks) sparks(dt);
      if (orders) orders(t);
      if (printer) printer(t);
      if (dust) dust(t, 1.1 - mood * 0.5);
      if (sky && t - skyT > 60) { sky(); skyT = t; }
      /* Dumpling (photo billboard): breaths, a bob, a hop every 4-7 s
         (squash, up, stretch, land squash) and the tail plume wagging on
         its own empty (dog_tail, pivot at the tail base) */
      if (dog.body) {
        var hp = dogHop(t), br = Math.sin(t * 2.1) * 0.5 + 0.5, bs = dog.body.userData.s0;
        dog.body.scale.set(bs.x * (1 + br * 0.014) * hp.sx, bs.y * (1 + br * 0.035) * hp.sy, bs.z);
        dog.body.position.y = dog.body.userData.p0.y + Math.sin(t * 1.05) * 0.004 + hp.h * 0.055;
        if (dog.shadow) {
          var ss = dog.shadow.userData.s0, sk = 1 - hp.h * 0.4;
          dog.shadow.scale.set(ss.x * sk, ss.y, ss.z * sk);
          dog.shadow.material.opacity = 0.55 * (1 - hp.h * 0.6);
        }
        pawPose(dog, t, hp, hopAt - t);
        if (dog.tail) {
          dogWag += dt * (hp.on ? 17 : 7.5);
          dog.tail.rotation.z = dog.tail.userData.r0.z + Math.sin(dogWag) * (hp.on ? 0.2 : 0.15);
        }
      }
      if (dog.root && dog.root.parent) {
        /* camera position in the dog's parent frame (the rig tilts) */
        cam.getWorldPosition(dogW); dog.root.parent.worldToLocal(dogW);
        var cx = dogW.x - dog.root.position.x, cz = dogW.z - dog.root.position.z;
        var yaw = Math.atan2(cx, cz), base = dog.root.userData.r0.y;
        /* the card faces +Z in its own frame; follow 35% of the offset */
        var off = Math.atan2(Math.sin(yaw - base), Math.cos(yaw - base));
        dog.root.rotation.y = base + Math.max(-0.35, Math.min(0.35, off * 0.35));
      }
      /* the pups: breathing, a wag each to its own beat, a head tilt now
         and then (about the snout axis) and a quick blink */
      for (i = 0; i < pups.length; i++) {
        var P = pups[i], C = P.cfg, pt = t + P.ph, pb = Math.sin(pt * 2.4) * 0.5 + 0.5;
        if (P.body) P.body.scale.set(P.body.userData.s0.x * (1 + pb * 0.03), P.body.userData.s0.y * (1 + pb * 0.012), P.body.userData.s0.z * (1 + pb * 0.03));
        if (P.tail) P.tail.rotation.y = P.tail.userData.r0.y + Math.sin(pt * C.wag) * C.amp * (0.6 + 0.4 * Math.sin(pt * 0.37));
        if (P.head) {
          var hu = (pt % C.tilt) / 1.6, tl = hu < 1 ? Math.sin(hu * Math.PI) : 0;
          P.head.rotation.x = P.head.userData.r0.x + tl * 0.32 * (i % 2 ? -1 : 1);
          P.head.position.y = P.head.userData.p0.y + pb * 0.002;
        }
        if (P.eyes && C.blink) {
          var bu = (pt % C.blink) / 0.18;
          P.eyes.scale.y = P.eyes.userData.s0.y * (bu < 1 ? 1 - Math.sin(bu * Math.PI) * 0.9 : 1);
        }
      }
      if (cal) cal(t);
      if (weigh) weigh(t);
      if (steam) steam(t);
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
     draw.glow(k) scales every screen's emission (day/night mood)
     draw.sale(t0) plays a sale on the laptop from t0 (-1 = normal): the
     page scrolls, a product lights up, "Add to cart" is pressed, the
     cart badge pops, then the payment confirms and stays until the
     camera zooms back out.                                          */
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
      if (L && sale0 >= 0) { sale(L.g, t - sale0); L.tex.needsUpdate = true; }
      else if (L) {
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
    /* the sale, s seconds in. Card 2 of the first row is the product. */
    var sale0 = -1;
    function arrow(g, x, y, down) {
      g.save(); g.translate(x, y); if (down) g.scale(0.88, 0.88);
      g.fillStyle = '#fff'; g.strokeStyle = '#142032'; g.lineWidth = 2.5; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 26); g.lineTo(7, 20); g.lineTo(12, 31); g.lineTo(17, 29); g.lineTo(12, 18); g.lineTo(21, 18); g.closePath();
      g.fill(); g.stroke(); g.restore();
    }
    function sale(g, s) {
      s = Math.min(s, 9);
      var sc = ease((s - 0.4) / 1.2) * 170, cx = 172, cy = 214 - sc;
      g.drawImage(page, 0, sc, 640, 400, 0, 0, 640, 400);
      /* sticky header with the cart and its badge */
      g.drawImage(page, 0, 0, 640, 34, 0, 0, 640, 34);
      g.strokeStyle = '#142032'; g.lineWidth = 2.5; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(584, 10); g.lineTo(589, 10); g.lineTo(593, 23); g.lineTo(607, 23); g.lineTo(610, 13); g.lineTo(591, 13); g.stroke();
      g.fillStyle = '#142032'; g.beginPath(); g.arc(595, 27, 2, 0, 7); g.arc(605, 27, 2, 0, 7); g.fill();
      if (s > 3.3) {
        var bp = Math.min(1, (s - 3.3) / 0.25), bs = 8 * (bp < 1 ? 0.6 + bp * 0.7 : 1);
        g.fillStyle = '#ff8c28'; g.beginPath(); g.arc(612, 9, bs, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.font = '700 11px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('1', 612, 13); g.textAlign = 'left';
      }
      /* the product lights up once the cursor reaches it */
      if (s > 1.9) {
        var hl = Math.min(1, (s - 1.9) / 0.3);
        g.strokeStyle = 'rgba(0,212,255,' + hl + ')'; g.lineWidth = 4;
        g.beginPath(); g.roundRect(cx - 2, cy - 2, 144, 190, 10); g.stroke();
      }
      /* "Add to cart": appears, gets pressed at 2.9s, turns into "Added" */
      if (s > 2.0) {
        var pr = s > 2.9 && s < 3.15, done = s >= 3.15, bx = cx + 8, by = cy + 146;
        g.fillStyle = '#fff'; g.fillRect(cx + 6, cy + 136, 128, 46);
        g.fillStyle = done ? '#14aa78' : pr ? '#0077b8' : '#0096dc';
        g.beginPath(); g.roundRect(bx + (pr ? 3 : 0), by + (pr ? 2 : 0), 124 - (pr ? 6 : 0), 30 - (pr ? 4 : 0), 8); g.fill();
        g.fillStyle = '#fff'; g.font = '700 15px system-ui,sans-serif'; g.textAlign = 'center';
        g.fillText(done ? 'Added ✓' : 'Add to cart', bx + 62, by + 20); g.textAlign = 'left';
      }
      /* cursor: in from the right, to the product, down to the button */
      if (s > 1.0 && s < 4.2) {
        var m1 = ease((s - 1.0) / 0.9), m2 = ease((s - 2.3) / 0.55);
        var ax = 520 + (cx + 90 - 520) * m1 + (cx + 70 - (cx + 90)) * m2, ay = 330 + (cy + 80 - 330) * m1 + (cy + 160 - (cy + 80)) * m2;
        arrow(g, ax, ay, s > 2.9 && s < 3.15);
      }
      /* checkout: dim the page, a card rises, a spinner, then "Paid" */
      if (s > 4.2) {
        var ov = ease((s - 4.2) / 0.4), up = (1 - ov) * 30;
        g.fillStyle = 'rgba(8,16,30,' + (0.62 * ov) + ')'; g.fillRect(0, 0, 640, 400);
        g.globalAlpha = ov; rr(g, 170, 95 + up, 300, 210, 18, '#fff');
        var paid = s > 5.4;
        if (!paid) {
          g.strokeStyle = '#0096dc'; g.lineWidth = 7; g.lineCap = 'round';
          g.beginPath(); g.arc(320, 170 + up, 30, s * 7, s * 7 + 4.2); g.stroke();
          g.fillStyle = '#5a6a80'; g.font = '600 20px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('Processing payment', 320, 248 + up);
        } else {
          var ck = Math.min(1, (s - 5.4) / 0.3);
          g.fillStyle = '#14aa78'; g.beginPath(); g.arc(320, 165 + up, 34 * (0.7 + 0.3 * ck), 0, 7); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 8; g.lineCap = 'round'; g.lineJoin = 'round';
          g.beginPath(); g.moveTo(304, 166); g.lineTo(315, 178); g.lineTo(337, 152); g.stroke();
          g.fillStyle = '#142032'; g.font = '800 32px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('Paid ✓', 320, 240);
          g.fillStyle = '#5a6a80'; g.font = '600 17px system-ui,sans-serif'; g.fillText('Order #1043 · $129.00', 320, 272);
        }
        g.textAlign = 'left'; g.lineCap = 'butt'; g.globalAlpha = 1;
      }
    }
    draw.sale = function (t0) { sale0 = t0; };
    draw.glow = function (k) { for (var i = 0; i < mats.length; i++) mats[i].emissiveIntensity = mats[i].userData.e0 * k; };
    return draw;
  }

  function whenIdle() { ('requestIdleCallback' in window) ? requestIdleCallback(boot, { timeout: 2500 }) : setTimeout(boot, 1200); }
  /* Not the load event: a slow third-party beacon (the analytics pixel)
     can hold 'load' back for a minute, which kept the 3D waiting. */
  if (document.readyState === 'complete') whenIdle();
  else addEventListener('DOMContentLoaded', function () { setTimeout(whenIdle, 1500); });
})();
