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
   right (photo cut-outs like Dumpling: breathing, tail wag, paw pats,
   the odd hop, each to its own beat), a flip calendar that
   ticks off a task every 8s, parcels on a scale that weighs each order,
   and steam off the coffee mug.
   Round 7 (2026-10-02): the laptop, tablet and desk monitor are links
   (case studies / project modal) with a hover tint; window.__hero3d
   exposes the scene to 40-desk-extras.js (monitor dashboard, before/
   after clutter, camera dolly) and Dumpling + the pups hop toward a
   hovered CTA (the 'dog-cta' event).
═══════════════════════════════════════ */
(function () {
  var stage = document.getElementById('heroStage');
  var scene = document.getElementById('heroScene');
  if (!stage || !scene) return;
  var ok = matchMedia('(min-width:1024px) and (pointer:fine) and (prefers-reduced-motion:no-preference)');

  /* ── perf plumbing (2026-10-07 audit) ─────────────────────────────
     - the gate is live: growing a window past 1024px boots the 3D then,
       and leaving the gate pauses the loop and frees the GPU memory
       (api.pause / api.resume below)
     - window.__gpu3d() probes once for a software rasteriser
       (SwiftShader, llvmpipe, Microsoft Basic Render) or a context the
       browser flags as slow; those keep the static plate. 39 and 40 use
       the same probe.
     - window.__heroGlb: a promise of the parsed scene.glb, so the
       Contact Dumpling (39-section-3d.js) clones from this one parse
       instead of fetching and decoding the file a second time
     - window.__hero3dPending: the stat counter waits for hero3d:ready
       or hero3d:skip */
  window.__gpu3d = window.__gpu3d || (function () {
    var memo;
    return function () {
      if (memo !== undefined) return memo;
      memo = false;
      try {
        var c = document.createElement('canvas'), o = { failIfMajorPerformanceCaveat: true };
        var g = c.getContext('webgl2', o) || c.getContext('webgl', o);
        if (g) {
          var e = g.getExtension('WEBGL_debug_renderer_info');
          var r = String(g.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : g.RENDERER) || '');
          memo = !/swiftshader|llvmpipe|softpipe|basic render|software/i.test(r);
          var lose = g.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
        }
      } catch (err) { memo = false; }
      return memo;
    };
  })();
  var booted = false, api = null, glbDone = null;
  function pend() {
    window.__hero3dPending = true;
    if (!window.__heroGlb) window.__heroGlb = new Promise(function (r) { glbDone = r; });
  }
  function skip(why) {
    window.__hero3dPending = false;
    if (glbDone) { glbDone(null); glbDone = null; }
    if (window.console && console.info) console.info('[hero 3D] static plate kept: ' + why);
    dispatchEvent(new Event('hero3d:skip'));
  }
  function preconnect() {
    if (document.querySelector('link[rel="preconnect"][href="https://cdn.jsdelivr.net"]')) return;
    var l = document.createElement('link'); l.rel = 'preconnect'; l.href = 'https://cdn.jsdelivr.net'; l.crossOrigin = 'anonymous';
    document.head.appendChild(l);
  }
  ok.addEventListener('change', function () {
    if (ok.matches) { if (!booted) arm(); else if (api) api.resume(); }
    else if (api) api.pause();
  });

  var V = 'https://cdn.jsdelivr.net/npm/three@0.170.0';
  /* hover labels: node name -> { label, href (click scrolls), act } */
  /* hl: tint on hover. Page hrefs navigate, #hrefs scroll, modal opens a project modal */
  var LAPTOP = { label: 'Inventory sync case study', href: 'case-studies/inventory-sync', hl: true },
    TABLET = { label: 'MOEV case study', href: 'case-studies/moev', hl: true };
  var OWN = {
    cube_cart: { label: 'Store builds', href: '#work' },
    cube_gear: { label: 'Try an automation', href: '#automation-demo' },
    cube_db: { label: 'Data & monitoring', href: '#toolkit' },
    logo_gear: { label: 'Give it a spin', act: 'gear' },
    laptop_base: LAPTOP, laptop_lid: LAPTOP, laptop_keys: LAPTOP,
    drone: { label: 'Fulfilment' }, rack: { label: 'Monitoring 24/7' },
    holo_chart: { label: 'KDL video checker', modal: 'modal-kdl-checker', hl: true },
    tablet: TABLET, tablet_screen: TABLET, tablet_stand: TABLET,
    holo_order: { label: 'Real-time orders' }, bot: { label: 'Warehouse automation', act: 'bot' },
    dog: { label: 'Dumpling, chief morale officer' }
  };

  /* the pups: node name in scene.glb -> hover label (names swap here and
     in 3d/build_scene.py). Small personalities: wag = tail rhythm
     (rad/s), amp = wag size (rad), hop = [min, extra] s between hops,
     jump = hop height, pat = paw-pat tempo, br = breath rate, look =
     how far the head follows the cursor, lag = how fast (1/s), idle =
     [min, extra] s between idle actions (sniff, head tilt, weight
     shift). Mochi (eldest) is calm, Tofu easy-going, Pochi (youngest)
     bounces; Dumpling (DOG) is the playful one. sig = each pup's own
     move, picked for about 2 in 5 idle actions: Mochi stands guard (nose
     up, ears perked, one bark bob), Tofu wiggles her whole body, Pochi
     tilts her head one way, then the other. */
  var MOCHI = 'Mochi', TOFU = 'Tofu', POCHI = 'Pochi';
  var PUPS = {
    mochi: { label: MOCHI + ', head of security', wag: 4.6, amp: 0.09, hop: [11, 6], jump: 0.03, pat: 0.55, br: 1.5, look: 0.6, lag: 1.6, idle: [7, 5], sig: 'guard' },
    tofu: { label: TOFU + ', snack inspector', wag: 6.8, amp: 0.13, hop: [7, 5], jump: 0.04, pat: 0.8, br: 1.9, look: 0.8, lag: 3, idle: [5, 4], sig: 'wiggle' },
    pochi: { label: POCHI + ', QA tester', wag: 7.5, amp: 0.16, hop: [5, 4], jump: 0.035, pat: 1.25, br: 2.5, look: 1, lag: 6, idle: [3.5, 3], sig: 'tilts' }
  };
  var DOG = { wag: 7.5, amp: 0.15, pat: 1, br: 2.1, look: 1, lag: 5, idle: [4, 4] };
  Object.keys(PUPS).forEach(function (k) { OWN[k] = { label: PUPS[k].label }; });
  OWN.cal = { label: 'Done list' }; OWN.parcels = { label: 'Packed & weighed' };

  function boot() {
    if (!ok.matches) { booted = false; return; }       /* left the gate while waiting: re-arms on change */
    if (document.documentElement.classList.contains('quick')) { skip('quick view'); return; }
    if (!window.__gpu3d()) { skip('software or slow WebGL'); return; }
    Promise.all([
      import(V + '/+esm'),
      import(V + '/examples/jsm/loaders/GLTFLoader.js/+esm'),
      import(V + '/examples/jsm/libs/meshopt_decoder.module.js/+esm'),
      import(V + '/examples/jsm/postprocessing/EffectComposer.js/+esm'),
      import(V + '/examples/jsm/postprocessing/RenderPass.js/+esm'),
      import(V + '/examples/jsm/postprocessing/UnrealBloomPass.js/+esm'),
      import(V + '/examples/jsm/postprocessing/OutputPass.js/+esm'),
      import(V + '/examples/jsm/postprocessing/ShaderPass.js/+esm')
    ]).then(function (m) { start(m[0], m[1].GLTFLoader, m[2].MeshoptDecoder, m[3].EffectComposer, m[4].RenderPass, m[5].UnrealBloomPass, m[6].OutputPass, m[7].ShaderPass); })
      .catch(function () { skip('three.js did not load (offline or blocked CDN)'); });
  }

  function start(THREE, GLTFLoader, MeshoptDecoder, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass) {
    var canvas = document.createElement('canvas');
    /* WORLD (draft 2026-10-20, igloo.inc idea): when the page has chapter
       tunnels, the desk is not a hero picture but the page's fixed world.
       The canvas becomes a full-viewport layer behind everything, and the
       scroll flies the camera from shot to shot (one per chapter) instead
       of fading the desk out. Without tunnels it is the hero canvas as before. */
    /* the world is drawn for the dark page: a light-theme visit keeps the
       hero canvas as before */
    var WORLD = document.documentElement.classList.contains('dk') && !!document.querySelector('.tunnel') && document.documentElement.getAttribute('data-theme') !== 'light';
    if (WORLD) {
      /* the desk is the page's menu: props fly the camera to their chapter */
      OWN.rack = { label: 'Experience', href: '#experience', hl: true };
      OWN.holo_order = { label: 'Client reviews', href: '#testimonials' };
      OWN.cal = { label: 'Book a call', href: '#contact', hl: true };
      OWN.cube_cart = { label: 'Selected work', href: '#work' };
      canvas.className = 'world-3d';
      document.body.insertBefore(canvas, document.body.firstChild);
      var scrim = document.createElement('div'); scrim.className = 'world-scrim';
      canvas.after(scrim);
    } else {
      canvas.className = 'hero-3d';
      scene.appendChild(canvas);
    }

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: true });
    } catch (err) { canvas.remove(); skip('no hardware WebGL context'); return; }
    /* 1.5 is visually close to 2 on this soft, bloomed scene and draws
       about 44% fewer pixels; the governor below can drop it to 1 */
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    /* production: no shader error logs. With them on, three asks for the
       link status and info logs of every program, which blocks the main
       thread until the GPU process finishes compiling (~0.8 s of the
       desktop TBT in the 2026-10-07 profile). Without them the compile
       wait stays in the GPU process. */
    renderer.debug.checkShaderErrors = false;
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
    var lamp = new THREE.PointLight(0xffb060, 3, 1.3); lamp.position.set(-1.2, 0.34, 0.24); world.add(lamp);

    var composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(512, 512, { type: THREE.HalfFloatType, samples: 4 }));
    composer.addPass(new RenderPass(world, cam));
    var bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.22, 0.4, 0.9);
    composer.addPass(bloom);
    /* WORLD: a short radial colour split at the start of each camera
       flight (igloo's scene-change glitch). Off, so free, the rest of
       the time: the pass only runs while its amount is above zero. */
    var split = null;
    /* switched off 2026-10-20: it read as flicker ("matrix") */
    if (false && WORLD && ShaderPass) {
      split = new ShaderPass({
        uniforms: { tDiffuse: { value: null }, amount: { value: 0 } },
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'uniform sampler2D tDiffuse;uniform float amount;varying vec2 vUv;void main(){vec2 d=(vUv-0.5)*amount;vec4 r=texture2D(tDiffuse,vUv+d),g=texture2D(tDiffuse,vUv),b=texture2D(tDiffuse,vUv-d);gl_FragColor=vec4(r.r,g.g,b.b,max(g.a,max(r.a,b.a)));}'
      });
      split.enabled = false;
      composer.addPass(split);
    }
    composer.addPass(new OutputPass());
    var bloomOn = true;

    var vw = 1, vh = 1;   /* canvas size, cached for the per-frame view offset */
    function size() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      vw = w; vh = h;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    size();
    new ResizeObserver(size).observe(canvas);

    /* scratch objects, reused every frame (no per-frame allocation) */
    var v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
    var camRight = new THREE.Vector3().subVectors(target, camBase).cross(new THREE.Vector3(0, 1, 0)).normalize();

    /* ── WORLD: chapter shots and the atmosphere around the desk ──
       Shots: p camera position, l look-at point, o how far right of centre
       the subject sits (fraction of the viewport). Order matches the
       tunnels: hero, 01 Services, 02 Work, 03 Reviews, 04 Experience. */
    var shots = null, shotS = 0, shotPos = new THREE.Vector3(), shotLook = new THREE.Vector3();
    var shell = null, shell2 = null, field = null, focus = null, bg = null;
    function buildWorld(root3) {
      var away = new THREE.Vector3().subVectors(camBase, target).normalize();
      function at(name, dist, lift, o, side) {
        var obj = root3.getObjectByName(name);
        if (!obj) return null;
        var c = new THREE.Vector3(); new THREE.Box3().setFromObject(obj).getCenter(c);
        var p = c.clone().addScaledVector(away, dist).addScaledVector(camRight, side || 0); p.y += lift;
        return { p: p, l: c, o: o };
      }
      var hero = { p: camBase.clone(), l: target.clone(), o: 0.22 };
      var lap = { p: new THREE.Vector3(0, 0.3, 0.95).multiplyScalar(3.0).add(zc), l: zc.clone(), o: 0.24 };
      shots = [
        hero,
        at('holo_chart', 3.4, 0.3, 0.24, -0.5) || hero,
        lap,
        at('holo_order', 3.0, 0.2, 0.24, 0.4) || lap,
        at('rack', 3.6, 0.35, 0.24, 0.3) || hero,
        /* 05 Debug: pull right back, the whole desk small in its world */
        { p: target.clone().addScaledVector(away, 13).add(new THREE.Vector3(0, 1.6, 0)), l: target.clone(), o: 0.2 },
        /* 06 Ping: looking down on the desk from above, lights on, done */
        { p: target.clone().add(new THREE.Vector3(0.6, 8.5, 2.4)), l: target.clone(), o: 0.18 }
      ];
      /* fog: the far wire shell and particles fade into the page navy */
      world.fog = new THREE.FogExp2(0x0a1628, 0.03);
      /* the world around the desk (2026-10-20): the default is the room,
         a work-from-home bedroom office with a window on the Manila
         skyline (Jojo's pick). ?bg=combo, ?bg=city, ?bg=ocean and
         ?bg=island still preview the other looks. */
      var mode = (/[?&]bg=(city|ocean|island|room|combo)/.exec(location.search) || [])[1] || 'room';
      var parts = [];
      if (mode === 'ocean' || mode === 'combo') parts.push(dataOcean(target));
      if (mode === 'city') parts.push(skyline(target, 9, 26, 9, 4, 10.5, 190, 0.28));
      if (mode === 'combo') parts.push(skyline(target, 20, 34, 6, 2, 6.5, 240, 0.3));
      if (mode === 'room') parts.push(room(target, root3));
      bg = {
        tick: function (t) { for (var i = 0; i < parts.length; i++) parts[i].tick(t); },
        day: function (k, dusk) { for (var i = 0; i < parts.length; i++) parts[i].day(k, dusk); }
      };
      var isle = mode === 'island';
      /* a deep particle field, not just the motes by the desk */
      var N = 700, fp = new Float32Array(N * 3);
      for (var i = 0; i < N; i++) {
        var r = 3 + Math.random() * 9, a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
        fp[i * 3] = r * Math.sin(b) * Math.cos(a);
        fp[i * 3 + 1] = r * Math.cos(b) * 0.6;
        fp[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
      }
      var fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
      field = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0x7fe3ff, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false }));
      field.position.copy(target);
      world.add(field);
      if (isle) parts.push(island(target));
      /* a soft key light that follows the camera's subject */
      focus = new THREE.PointLight(0x66e0ff, 0, 2.6); world.add(focus);
    }
    /* ── world backgrounds ── */
    /* B. data ocean: a rolling field of dots under the desk; rings of light
       run inward toward it, like orders flowing in */
    function dataOcean(c) {
      var n = 160, sp = 0.36, pos = new Float32Array(n * n * 3), k = 0;
      for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
        pos[k++] = (i - n / 2) * sp; pos[k++] = 0; pos[k++] = (j - n / 2) * sp;
      }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var u = { uT: { value: 0 }, uDay: { value: 0 }, uPx: { value: renderer.getPixelRatio() } };
      var m = new THREE.ShaderMaterial({
        uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: 'uniform float uT,uPx;varying float vP,vF;void main(){vec3 p=position;float d=length(p.xz);' +
          'p.y+=sin(p.x*.32+uT*.45)*.22+sin(p.z*.27-uT*.38)*.22+sin(d*.45-uT*.55)*.12;' +
          'vP=pow(smoothstep(.86,1.,fract(d*.05+uT*.13)),2.);vF=(1.-smoothstep(9.,27.,d))*smoothstep(1.2,3.2,d);' +
          'vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=(2.2+vP*3.)*uPx*(16./-mv.z);gl_Position=projectionMatrix*mv;}',
        fragmentShader: 'uniform float uDay;varying float vP,vF;void main(){vec2 q=gl_PointCoord-.5;if(dot(q,q)>.25)discard;' +
          'vec3 base=mix(vec3(.1,.55,.8),vec3(.3,.6,.85),uDay);vec3 col=mix(base,vec3(.55,.95,1.),vP);' +
          'gl_FragColor=vec4(col,vF*(.5+.5*vP));}'
      });
      var pts = new THREE.Points(g, m); pts.position.set(c.x, c.y - 2.2, c.z); pts.frustumCulled = false;
      world.add(pts);
      return { tick: function (t) { u.uT.value = t; }, day: function (k) { u.uDay.value = k; } };
    }
    /* A. Manila skyline: low-poly towers in a ring, lit windows that dim by
       day; one instanced draw. Close rings leave a gap where the hero and
       wide-shot cameras stand, so no tower ever blocks them. */
    function skyline(c, r0, r1, sink, h0, h1, count, lit, rect) {
      if (rect) count = rect.count;
      /* the room's view (rect) uses fewer, bigger window cells: thin lit
         slits on tall towers shimmered through the window as the camera
         moved (sub-pixel aliasing, then bloom made it flicker) */
      var cv = document.createElement('canvas'), CW = rect ? 16 : 8, CL = rect ? 9 : 4;
      cv.width = 64; cv.height = rect ? 256 : 128;
      var x = cv.getContext('2d'); x.fillStyle = '#05080f'; x.fillRect(0, 0, cv.width, cv.height);
      for (var wy = CW / 2; wy < cv.height - CW / 2; wy += CW) for (var wx = CW / 2; wx < 64 - CW / 2; wx += CW) {
        if (Math.random() < lit) { x.fillStyle = Math.random() < 0.7 ? '#ffcf8a' : '#7fe3ff'; x.fillRect(wx, wy, CL, CL); }
      }
      var tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      var mat = new THREE.MeshStandardMaterial({ color: 0x0c1830, roughness: 0.85, metalness: 0.1, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.65 });
      var mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, count);
      var aw = Math.atan2(camBase.z - target.z, camBase.x - target.x), o = new THREE.Object3D(), n = 0;
      for (var i = 0; i < count * 3 && n < count; i++) {
        var w = 0.7 + Math.random() * 1.6, h;
        if (rect) {
          h = rect.h0 + Math.pow(Math.random(), 1.4) * (rect.h1 - rect.h0); w *= 1.6;
          o.position.set(rect.x0 + Math.random() * (rect.x1 - rect.x0), rect.base + h / 2, rect.z0 + Math.random() * (rect.z1 - rect.z0));
        } else {
          var a = Math.random() * Math.PI * 2;
          var da = Math.abs(Math.atan2(Math.sin(a - aw), Math.cos(a - aw)));
          if (da < 0.6 && r0 < 14) continue;
          var r = r0 + Math.random() * (r1 - r0); h = h0 + Math.pow(Math.random(), 1.6) * (h1 - h0);
          o.position.set(c.x + Math.cos(a) * r, c.y - sink + h / 2, c.z + Math.sin(a) * r);
        }
        o.rotation.set(0, Math.random() * Math.PI, 0); o.scale.set(w, h, 0.7 + Math.random() * 1.4);
        o.updateMatrix(); mesh.setMatrixAt(n++, o.matrix);
      }
      mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
      world.add(mesh);
      return {
        mesh: mesh, tick: function () {},
        fade: function (a) { mat.transparent = a < 0.99; mat.opacity = a; },
        day: function (k) { mat.emissiveIntensity = 0.65 - 0.55 * k; mat.color.setHex(k > 0.5 ? 0x3a5478 : 0x0c1830); }
      };
    }
    /* C. floating island: a rock under the desk, soft clouds below, an
       aurora sky dome around it */
    /* an upturned, roughed-up cone: reads as rock, not a party hat */
    function rockGeo() {
      var g = new THREE.ConeGeometry(2.7, 3.2, 18, 6), p = g.attributes.position, v = new THREE.Vector3();
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        var top = v.y > 1.55, n = Math.sin(v.x * 3.1) * Math.cos(v.z * 2.7) + Math.sin(v.y * 4.3 + v.x);
        if (!top) { v.x *= 1 + n * 0.08; v.z *= 1 + n * 0.08; v.y += n * 0.06; }
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      return g;
    }
    function island(c) {
      var rock = new THREE.Mesh(rockGeo(), new THREE.MeshStandardMaterial({ color: 0x1b2a3f, roughness: 0.95, flatShading: true }));
      rock.rotation.x = Math.PI; rock.position.set(c.x, c.y - 0.62 - 0.25 - 1.6, c.z);
      world.add(rock);
      var cv = document.createElement('canvas'); cv.width = cv.height = 128;
      var x = cv.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      var ctex = new THREE.CanvasTexture(cv), clouds = new THREE.Group();
      for (var i = 0; i < 46; i++) {
        var sm = new THREE.SpriteMaterial({ map: ctex, color: 0x9fbce8, transparent: true, opacity: 0.5, depthWrite: false, fog: false });
        var spr = new THREE.Sprite(sm), a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 14;
        spr.position.set(Math.cos(a) * r, -2.4 - Math.random() * 2.2, Math.sin(a) * r);
        var sc = 3 + Math.random() * 5; spr.scale.set(sc * 1.6, sc, 1);
        clouds.add(spr);
      }
      clouds.position.copy(c); world.add(clouds);
      var su = { uT: { value: 0 }, uDay: { value: 0 } };
      var sky = new THREE.Mesh(new THREE.SphereGeometry(44, 32, 16), new THREE.ShaderMaterial({
        uniforms: su, side: THREE.BackSide, depthWrite: false,
        vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'uniform float uT,uDay;varying vec3 vD;void main(){float y=vD.y;float az=atan(vD.z,vD.x);' +
          'vec3 nite=mix(vec3(.015,.025,.07),vec3(.04,.08,.2),smoothstep(-.3,.15,y));nite=mix(nite,vec3(.02,.03,.09),smoothstep(.15,.9,y));' +
          'float band=exp(-pow((y-.32-.06*sin(az*3.+uT*.07))*9.,2.));' +
          'vec3 aur=mix(vec3(.1,.9,.7),vec3(.45,.3,.95),.5+.5*sin(az*2.+uT*.05));nite+=aur*band*.9;' +
          'vec3 dayc=mix(vec3(.55,.72,.92),vec3(.25,.5,.85),smoothstep(-.1,.8,y));gl_FragColor=vec4(mix(nite,dayc,uDay*.85),1.);}'
      }));
      sky.position.copy(c); world.add(sky);
      if (field) field.material.opacity = 0.8;
      return {
        tick: function (t) { su.uT.value = t; clouds.rotation.y = t * 0.01; },
        day: function (k) { su.uDay.value = k; for (var i = 0; i < clouds.children.length; i++) clouds.children[i].material.color.setHex(k > 0.5 ? 0xffffff : 0x9fbce8); }
      };
    }
    /* D. work-from-home room (?bg=room): the desk in a bedroom office, a
       big window onto the Manila skyline, day and night outside. The hero
       keeps its plasma: the room builds itself around the desk as the hero
       scrolls away (everything fades in with __worldHeroOut). Open on the
       two camera sides and no ceiling, like a cut-away dollhouse, so no
       chapter shot is ever blocked. */
    function room(c, root3) {
      /* the desk slab: the widest mesh sitting at the bottom of the model.
         The whole model's box includes floating cubes and holograms, which
         left the desk standing far from the wall. */
      var B = new THREE.Box3().setFromObject(root3), bb = new THREE.Box3(), best = 0;
      root3.traverse(function (o) {
        if (!o.isMesh) return;
        bb.setFromObject(o);
        var area = (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z);
        if (bb.min.y < B.min.y + 0.12 && area > best) { best = area; B = bb.clone(); }
      });
      var cx = (B.min.x + B.max.x) / 2, deskY = B.min.y, floorY = deskY - 1.45;
      var backZ = B.min.z - 0.12, leftX = B.min.x - 2.6, H = 6.2;
      var grp = new THREE.Group(), mats = [];
      function M(o) { var m = new THREE.MeshStandardMaterial(o); m.transparent = true; mats.push(m); return m; }
      function box(w, h, d, x, y, z, m) { var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); grp.add(b); return b; }
      /* Sketchfab props (CC BY 4.0, credits in the footer and in
         docs/source-art/room/CREDITS.md), cut down with glTF-Transform.
         prop(file, size, x, y, z, ry, done): scales the model so its
         largest side is `size` (or its height, when size is {h}), turns it,
         and stands it with its base centred on x, y, z. Its materials join
         the room fade; mirror-like metal is dulled because the room has no
         environment map to reflect, so pure metal renders black. */
      var propLoader = new GLTFLoader(); propLoader.setMeshoptDecoder(MeshoptDecoder);
      var mixers = [], propCache = {};
      /* shaders are compiled in the background before the room shows
         (parallel compile where the GPU allows it). Without this the
         first frame with the room compiled ~30 programs at once and froze
         the page for about 3 s. Light counts are part of every program,
         and the hero's lights switch off as it scrolls away, so this runs
         at the moment the room is about to show, with the room's lights
         on, and the room waits for it. Frames go through the bloom
         composer's render target, whose variants (no tone mapping,
         linear output) differ from the screen's, so compile against it. */
      var ready = false, warming = false, earlyT = 0;
      /* while the hero is up, compile as the models arrive (debounced) so
         the gate at the reveal finds the programs already built */
      function early() { clearTimeout(earlyT); earlyT = setTimeout(function () { if (!ready) compileThen(grp, function () { prime = 1; }); }, 400); }
      /* the GPU driver still finishes each shader on its first real draw
         (~0.6 s for the whole room), so once compiled the room is drawn one
         time while still hidden: no colour, no depth, during the hero */
      var prime = 0;
      function compileThen(obj, done) {
        if (!renderer.compileAsync) { done(); return; }
        var v = obj.visible, rt = renderer.getRenderTarget();
        obj.visible = true;
        if (bloomOn && composer) renderer.setRenderTarget(composer.renderTarget1);
        renderer.compileAsync(obj, cam, world).then(done, done);
        renderer.setRenderTarget(rt); obj.visible = v;
      }
      /* turns a flat object exported at an angle (the keyboard scan sits
         tilted and diagonal) so it lies flat: the axis its vertices spread
         least along becomes up, the longest becomes x. Up points to the side
         with more mass (the keycaps), so it never lands upside down. */
      function lieFlat(o, flip) {
        o.updateMatrixWorld(true);
        var pts = [], v = new THREE.Vector3(), c = new THREE.Vector3();
        o.traverse(function (m) {
          if (!m.isMesh) return;
          var pa = m.geometry.attributes.position, step = Math.max(1, Math.floor(pa.count / 4000));
          for (var i = 0; i < pa.count; i += step) { v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); pts.push(v.clone()); c.add(v); }
        });
        if (pts.length < 3) return;
        c.divideScalar(pts.length);
        var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        pts.forEach(function (p) { var d = [p.x - c.x, p.y - c.y, p.z - c.z]; for (var r = 0; r < 3; r++) for (var s = 0; s < 3; s++) C[r][s] += d[r] * d[s]; });
        /* Jacobi eigen solve of the 3x3 covariance */
        var V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        for (var it = 0; it < 30; it++) {
          var pq = [[0, 1], [0, 2], [1, 2]].reduce(function (b, e) { return Math.abs(C[e[0]][e[1]]) > Math.abs(C[b[0]][b[1]]) ? e : b; });
          var P = pq[0], Q = pq[1];
          if (Math.abs(C[P][Q]) < 1e-12) break;
          var th = 0.5 * Math.atan2(2 * C[P][Q], C[Q][Q] - C[P][P]), cs = Math.cos(th), sn = Math.sin(th);
          for (var k = 0; k < 3; k++) { var a = C[k][P], b2 = C[k][Q]; C[k][P] = cs * a - sn * b2; C[k][Q] = sn * a + cs * b2; }
          for (k = 0; k < 3; k++) { a = C[P][k]; b2 = C[Q][k]; C[P][k] = cs * a - sn * b2; C[Q][k] = sn * a + cs * b2; }
          for (k = 0; k < 3; k++) { a = V[k][P]; b2 = V[k][Q]; V[k][P] = cs * a - sn * b2; V[k][Q] = sn * a + cs * b2; }
        }
        var ord = [0, 1, 2].sort(function (i, j) { return C[j][j] - C[i][i]; });
        var ax = ord.map(function (i) { return new THREE.Vector3(V[0][i], V[1][i], V[2][i]).normalize(); });
        var X = ax[0], U = ax[2], skew = 0;
        pts.forEach(function (p) { var t = v.subVectors(p, c).dot(U); skew += t * t * t; });
        if (skew < 0) U.negate();
        if (flip) U.negate();
        var Z = new THREE.Vector3().crossVectors(X, U);
        var basis = new THREE.Matrix4().makeBasis(X, U, Z);
        o.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(basis).invert());
      }
      function prop(file, size, x, y, z, ry, done) {
        var p = propCache[file] || (propCache[file] = new Promise(function (res) { propLoader.load('img/hero3d/room/' + file + '.glb', res, undefined, function () { res(null); }); }));
        p.then(function (g) {
          if (!g) return;
          /* skinned models are used once and keep their bones; the rest are
             cloned per placement (the shoe box is placed five times) */
          var skinned = false; g.scene.traverse(function (m) { if (m.isSkinnedMesh) skinned = true; });
          var o = skinned ? g.scene : g.scene.clone(true);
          o.traverse(function (m) {
            if (!m.isMesh) return;
            var mt = m.material = m.material.clone(); mt.transparent = true;
            if (mt.metalness > 0.4) { mt.metalness = 0.4; mt.roughness = Math.max(mt.roughness, 0.35); }
            mats.push(mt);
            /* upload its textures now, not on the frame the room appears */
            for (var key in mt) if (mt[key] && mt[key].isTexture && renderer.initTexture) renderer.initTexture(mt[key]);
          });
          if (size.rx) o.rotation.x = size.rx;
          if (size.flat) lieFlat(o, size.flat < 0);
          var piv = new THREE.Group(), bb = new THREE.Box3(), one = new THREE.Box3(); piv.add(o); piv.rotation.y = ry || 0;
          function grow() { piv.updateMatrixWorld(true); bb.union(one.setFromObject(piv, true)); }
          /* animation only where asked (size.anim); it is fitted over its
             whole clip, so a moving figure never leaves its slot (the
             spider used to climb through the cabinet glass) */
          var mx = size.anim && g.animations.length ? new THREE.AnimationMixer(o) : null;
          if (mx) {
            var clip = g.animations[0]; mx.clipAction(clip).play();
            for (var q = 0; q < 16; q++) { mx.setTime(clip.duration * q / 16); grow(); }
            mx.setTime(0); mixers.push(mx);
          } else grow();
          var sz = bb.getSize(new THREE.Vector3());
          var k = size.h ? size.h / sz.y : (size.s || size) / Math.max(sz.x, sz.y, sz.z);
          if (size.d) k = Math.min(k, size.d / Math.max(sz.x, sz.z));
          piv.scale.setScalar(k); bb.min.multiplyScalar(k); bb.max.multiplyScalar(k);
          /* size.sz stretches the length (z) only, for a bed a 1.80 m person fits */
          if (size.sz) { piv.scale.z *= size.sz; bb.min.z *= size.sz; bb.max.z *= size.sz; }
          var c0 = bb.getCenter(new THREE.Vector3());
          piv.position.set(x - c0.x, y - bb.min.y, z - c0.z);
          grp.add(piv);
          if (done) done(piv, o);
          shown = -1;
          /* a model that arrives after the room is up compiles before it shows */
          if (ready) { piv.visible = false; compileThen(piv, function () { piv.visible = true; }); }
          else early();
        });
      }
      var wallM = M({ color: 0x26365e, roughness: 0.92 }), floorM = M({ color: 0x3a2b20, roughness: 0.75 });
      var woodM = M({ color: 0x3a2a1f, roughness: 0.7 }), frameM = M({ color: 0x0f1626, roughness: 0.5, metalness: 0.3 });
      /* floor and rug */
      var fl = new THREE.Mesh(new THREE.PlaneGeometry(16, 13), floorM); fl.rotation.x = -Math.PI / 2;
      fl.position.set(cx + 1.5, floorY, backZ + 6.5); grp.add(fl);
      var rug = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), M({ color: 0x123a52, roughness: 1 }));
      rug.rotation.x = -Math.PI / 2; rug.position.set(cx + 0.3, floorY + 0.01, B.max.z + 0.6); grp.add(rug);
      /* desk legs, so the glowing slab reads as a real desk */
      [[B.min.x + 0.2, B.min.z + 0.25], [B.max.x - 0.2, B.min.z + 0.25], [B.min.x + 0.2, B.max.z - 0.25], [B.max.x - 0.2, B.max.z - 0.25]].forEach(function (p) {
        box(0.09, deskY - floorY, 0.09, p[0], (deskY + floorY) / 2, p[1], frameM);
      });
      /* back wall with a big window cut out of it */
      var x0 = leftX, x1 = cx + 8, wx0 = cx - 2.4, wx1 = cx + 2.9, wy0 = deskY + 0.5, wy1 = deskY + 3.4;
      var sh = new THREE.Shape(); sh.moveTo(x0, floorY); sh.lineTo(x1, floorY); sh.lineTo(x1, floorY + H); sh.lineTo(x0, floorY + H); sh.lineTo(x0, floorY);
      var hole = new THREE.Path(); hole.moveTo(wx0, wy0); hole.lineTo(wx0, wy1); hole.lineTo(wx1, wy1); hole.lineTo(wx1, wy0); hole.lineTo(wx0, wy0);
      sh.holes.push(hole);
      var bw = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false }), wallM);
      bw.position.z = backZ - 0.14; grp.add(bw);
      /* window: a proper frame (outer casing, a centred mullion and one
         transom, a deep sill) all centred on the opening, plus a faint
         glass pane so it reads as a window, not a hole */
      var wc = (wx0 + wx1) / 2, ww = wx1 - wx0, wh = wy1 - wy0, fz = backZ - 0.07;
      /* every frame piece reaches 2.5 cm into the opening: faces lying
         exactly on the wall's cut faces z-fought (the window flicker) */
      box(ww + 0.36, 0.08, 0.42, wc, wy0 - 0.015, backZ + 0.1, frameM);
      box(ww + 0.24, 0.12, 0.22, wc, wy1 + 0.035, fz, frameM);
      box(0.12, wh + 0.24, 0.22, wx0 - 0.035, (wy0 + wy1) / 2, fz, frameM);
      box(0.12, wh + 0.24, 0.22, wx1 + 0.035, (wy0 + wy1) / 2, fz, frameM);
      box(0.07, wh, 0.14, wc, (wy0 + wy1) / 2, fz, frameM);
      box(ww, 0.06, 0.14, wc, wy0 + wh * 0.7, fz, frameM);
      var glassM = new THREE.MeshStandardMaterial({ color: 0x9cc8ff, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.08, depthWrite: false });
      mats.push(glassM); glassM.userData.max = 0.08;
      var glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), glassM); glass.position.set(wc, (wy0 + wy1) / 2, fz); grp.add(glass);
      /* left wall (the sneaker wall hangs on it), a book shelf on the back
         wall right of the window, and a cyan LED strip along the top */
      box(0.14, H, 9, leftX - 0.07, floorY + H / 2, backZ + 4.5, wallM);
      box(1.8, 0.05, 0.32, wx1 + 1.4, deskY + 1.6, backZ + 0.16, woodM);
      var BOOK = [0x00a6d6, 0xf59e0b, 0x1e3a8a, 0xe2e8f0, 0x0e7490, 0xc2410c];
      for (var i = 0; i < 9; i++) box(0.1, 0.26 + (i * 37 % 10) / 50, 0.22, wx1 + 0.65 + i * 0.13, deskY + 1.6 + 0.15 + (i * 37 % 10) / 100, backZ + 0.15, M({ color: BOOK[i % BOOK.length], roughness: 0.8 }));
      var ledM = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, toneMapped: false }); mats.push(ledM);
      box(x1 - x0, 0.04, 0.04, (x0 + x1) / 2, floorY + H - 0.12, backZ + 0.05, ledM);
      box(0.04, 0.04, 9, leftX + 0.05, floorY + H - 0.12, backZ + 4.5, ledM);
      /* the collection (2026-10-20 polish, after real collector setups):
         a wall-mounted glass cabinet above the bed with a backlit back
         panel (the LED faces the panel, so the glow is soft and bounced)
         holds six vinyl-style hero figures on round stands and risers;
         the left wall is a sneaker wall, each high-top in its own clear
         cube with an LED strip under the lid, on a dark panel; shoe boxes
         stack by the desk. Generic shapes in the colourways, no logos or
         likenesses. */
      var caseM = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.1, depthWrite: false });
      mats.push(caseM); caseM.userData.max = 0.1;
      var shelfGlassM = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false });
      mats.push(shelfGlassM); shelfGlassM.userData.max = 0.32;
      var stripM = new THREE.MeshBasicMaterial({ color: 0xfff4e0, transparent: true, toneMapped: false }); mats.push(stripM);
      var panelM = M({ color: 0x0b1220, roughness: 0.6 });
      /* soft bounced glow: a vertical gradient card, brightest at the top */
      var glowTex = (function () {
        var c = document.createElement('canvas'); c.width = 4; c.height = 64;
        var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64);
        gr.addColorStop(0, 'rgba(255,236,210,1)'); gr.addColorStop(0.45, 'rgba(255,220,180,.35)'); gr.addColorStop(1, 'rgba(255,210,170,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
        var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
      })();
      function glowCard(w, h, x, y, z, ry, max) {
        var m = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
        m.userData.max = max; mats.push(m);
        var p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.y = ry || 0; grp.add(p); return p;
      }

      /* ── figure cabinet ── */
      var cbW = Math.min(1.5, wx0 - leftX - 0.5), cbX = (leftX + wx0) / 2 + 0.05, cbD = 0.38;
      var cbY0 = deskY + 0.75, cbH = 2.25, cbZ = backZ + cbD / 2;
      box(cbW, cbH, 0.02, cbX, cbY0 + cbH / 2, backZ + 0.012, panelM);                       /* back panel */
      [cbY0, cbY0 + cbH].forEach(function (y) { box(cbW + 0.06, 0.05, cbD + 0.02, cbX, y, cbZ, frameM); });   /* top and base */
      [-1, 1].forEach(function (s) { box(0.035, cbH, cbD, cbX + s * (cbW / 2 + 0.012), cbY0 + cbH / 2, cbZ, frameM); });   /* sides */
      var front = new THREE.Mesh(new THREE.PlaneGeometry(cbW, cbH - 0.05), caseM); front.position.set(cbX, cbY0 + cbH / 2, backZ + cbD + 0.004); grp.add(front);
      box(0.012, cbH - 0.05, 0.012, cbX, cbY0 + cbH / 2, backZ + cbD + 0.01, frameM);          /* door split */
      var BAY = cbH / 3;
      for (var b = 0; b < 3; b++) {
        var by = cbY0 + b * BAY;
        if (b) { var gs = new THREE.Mesh(new THREE.BoxGeometry(cbW - 0.02, 0.014, cbD - 0.04), shelfGlassM); gs.position.set(cbX, by, cbZ + 0.01); grp.add(gs); }
        box(cbW - 0.08, 0.012, 0.012, cbX, by + BAY - 0.05, backZ + 0.05, stripM);              /* LED strip aimed at the panel */
        glowCard(cbW - 0.04, BAY - 0.06, cbX, by + BAY / 2, backZ + 0.026, 0, 0.55);
      }
      var cabL = new THREE.PointLight(0xffe7c4, 0, 2.6); cabL.position.set(cbX, cbY0 + cbH - 0.3, backZ + cbD + 0.35); world.add(cabL);

      /* ── collector figures (Sketchfab, CC BY 4.0): one per bay side,
         each on a stand with a lit rim, the right one on a clear riser ── */
      var standM = M({ color: 0x0b0f17, roughness: 0.3, metalness: 0.4 });
      var rimM = M({ color: 0x7fe3ff, emissive: 0x00d4ff, emissiveIntensity: 1.2 });
      var standGeo = new THREE.CylinderGeometry(0.091, 0.0975, 0.021, 24), rimGeo = new THREE.CylinderGeometry(0.098, 0.098, 0.004, 24);
      var FIGS = [
        { glb: 'ironman', h: 0.52, ry: Math.PI },   /* "Iron Man Mark 6" by Mittergen */
        { glb: 'chibi', h: 0.46, anim: true },       /* "Chibi Spider-Man Animated" by Ysn.Aitaddi */
        { glb: 'cap', h: 0.46 },                     /* chibi Captain America by klrxyz */
        { glb: 'hulk', h: 0.5, ry: -Math.PI / 2 },   /* "Hulk Mini" by henriquebbarcellos (the scan faces +x) */
        { glb: 'venom', h: 0.44 },                   /* "Kawaii Venom-Inspired Chibi" by mizoohdn */
        { glb: 'deadpool', h: 0.48 }                 /* "Deadpool-like chibi character" by tinkerlane_studio */
      ];
      var figZ = backZ + cbD * 0.55;
      FIGS.forEach(function (f, i) {
        var bay = Math.floor(i / 2), side = i % 2 ? 1 : -1, by = cbY0 + bay * BAY + 0.008, x = cbX + side * cbW * 0.24;
        var lift = side > 0 ? 0.05 : 0;
        if (lift) box(0.2, lift, 0.16, x, by + lift / 2, figZ, shelfGlassM);
        var st = new THREE.Mesh(standGeo, standM); st.position.set(x, by + lift + 0.0105, figZ); grp.add(st);
        var rim = new THREE.Mesh(rimGeo, rimM); rim.position.set(x, by + lift + 0.005, figZ); grp.add(rim);
        /* the depth cap keeps every figure clear of the glass front */
        prop(f.glb, { h: f.h, d: f.anim ? 0.32 : 0.26, anim: f.anim }, x, by + lift + 0.021, figZ, f.ry || 0);
      });

      /* ── high-top sneaker: a side profile with layered colour-block
         panels (toe cap, heel counter, collar, eyestay), a stitched
         midsole, outsole, laces and a padded tongue ── */
      function shp(pts) {
        var p = new THREE.Shape(); p.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) { var q = pts[i]; if (q.length === 4) p.quadraticCurveTo(q[0], q[1], q[2], q[3]); else p.lineTo(q[0], q[1]); }
        return p;
      }
      function ext(shape, depth, bevel) {
        var g = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 12 });
        g.translate(0, 0, -depth / 2); return g;
      }
      var SN = {
        upper: ext(shp([[-0.165, 0.03], [0.15, 0.03], [0.18, 0.033, 0.178, 0.062], [0.175, 0.09, 0.145, 0.098], [0.075, 0.115], [0.035, 0.13, 0.012, 0.17],
          [-0.025, 0.245], [-0.075, 0.262, -0.135, 0.258], [-0.168, 0.255, -0.17, 0.225], [-0.172, 0.07], [-0.174, 0.03, -0.165, 0.03]]), 0.1, 0.008),
        toe: ext(shp([[0.03, 0.026], [0.15, 0.026], [0.184, 0.029, 0.182, 0.062], [0.18, 0.094, 0.148, 0.102], [0.125, 0.108], [0.14, 0.075, 0.11, 0.062], [0.03, 0.058]]), 0.104, 0.008),
        heel: ext(shp([[-0.174, 0.026], [-0.06, 0.026], [-0.055, 0.06, -0.085, 0.1], [-0.12, 0.15, -0.176, 0.16], [-0.176, 0.07]]), 0.104, 0.008),
        collar: ext(shp([[-0.176, 0.19], [-0.06, 0.2], [-0.028, 0.25], [-0.075, 0.267, -0.135, 0.263], [-0.172, 0.26, -0.175, 0.225]]), 0.104, 0.008),
        stay: ext(shp([[0.078, 0.11], [0.086, 0.122], [0.04, 0.14, 0.018, 0.175], [-0.02, 0.25], [-0.034, 0.243], [0.004, 0.172], [0.022, 0.135, 0.078, 0.11]]), 0.104, 0.008),
        mid: ext(shp([[-0.168, 0.004], [0.16, 0.004], [0.185, 0.008, 0.182, 0.036], [-0.172, 0.036], [-0.176, 0.008, -0.168, 0.004]]), 0.106, 0.006),
        out: ext(shp([[-0.168, -0.002], [0.162, -0.002], [0.188, 0.002, 0.185, 0.012], [-0.174, 0.012], [-0.178, 0.002, -0.168, -0.002]]), 0.11, 0.004),
        stitch: new THREE.BoxGeometry(0.33, 0.003, 0.1245),
        lace: new THREE.BoxGeometry(0.012, 0.006, 0.086),
        tongue: new THREE.BoxGeometry(0.03, 0.05, 0.07)
      };
      var SNM = {};
      function snMat(col, r) { var k = col + ':' + r; return SNM[k] || (SNM[k] = M({ color: col, roughness: r })); }
      function sneaker(x, y, z, ry, c, sc) {
        var g = new THREE.Group(), add = function (geo, col, r, px, py, pz) {
          var m = new THREE.Mesh(geo, snMat(col, r)); m.position.set(px || 0, py || 0, pz || 0); g.add(m); return m;
        };
        add(SN.upper, c.base, 0.6);
        add(SN.toe, c.over, 0.5); add(SN.heel, c.over, 0.5); add(SN.stay, c.over, 0.5);
        add(SN.collar, c.collar, 0.55);
        add(SN.mid, 0xf4f1ea, 0.7); add(SN.out, c.sole, 0.85);
        add(SN.stitch, 0x8a8478, 0.9, 0.005, 0.03, 0);
        for (var i = 0; i < 6; i++) add(SN.lace, c.lace || 0xf8fafc, 0.8, 0.062 - i * 0.016, 0.13 + i * 0.021, 0).rotation.z = -0.95;
        add(SN.tongue, c.collar, 0.6, -0.042, 0.262, 0).rotation.z = 0.3;
        g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(sc || 1.15); grp.add(g); return g;
      }
      var CW = {
        chicago: { base: 0xf6f4ef, over: 0xb4121b, collar: 0x111111, sole: 0xb4121b },
        royal: { base: 0x111111, over: 0x1e40af, collar: 0x111111, sole: 0x1e40af },
        unc: { base: 0xf6f4ef, over: 0x7cc0ec, collar: 0x7cc0ec, sole: 0x7cc0ec },
        bred: { base: 0x111111, over: 0xb4121b, collar: 0x111111, sole: 0xb4121b },
        shadow: { base: 0x9aa0a6, over: 0x111111, collar: 0x111111, sole: 0x111111 },
        pine: { base: 0xf6f4ef, over: 0x0f6b3f, collar: 0x111111, sole: 0x0f6b3f }
      };

      /* ── sneaker wall on the left wall, above the bed ── */
      var swZ0 = backZ + 1.05, swZ1 = backZ + 3.55, swY0 = deskY + 0.35, cell = (swZ1 - swZ0) / 3, rowH = 0.62;
      /* dark panel; drawn first so the glass cubes (no depth write) are not painted over by it */
      box(0.025, rowH * 2 + 0.2, swZ1 - swZ0 + 0.2, leftX + 0.013, swY0 + rowH - 0.04, (swZ0 + swZ1) / 2, panelM).renderOrder = -1;
      var shoeSlots = [];
      /* the real pair (img/hero3d/sneaker-aj1.glb: "Nike Air Jordan" by Ar41k,
         CC BY 4.0, cut to 25k triangles) replaces each code-built placeholder
         once it loads; one model, six colourways by turning the hue of its
         colour panels in the shader (white and black stay as they are) */
      var SHOE_HUE = [[3.72, 1.25], [-1.0, 1], [0, 1], [3.45, 1.1], [0, 0.04], [1.2, 1]];
      ['chicago', 'royal', 'unc', 'bred', 'shadow', 'pine'].forEach(function (k, i) {
        var col = i % 3, row = Math.floor(i / 3), zc = swZ0 + cell * (col + 0.5), y = swY0 + (1 - row) * rowH;
        var cw = cell - 0.12, ch = 0.44, cd = 0.36, xc = leftX + 0.025 + cd / 2 + 0.02;
        box(cd + 0.03, 0.012, cw + 0.03, xc, y - 0.006, zc, shelfGlassM);   /* floating acrylic ledge */
        var cube = new THREE.Mesh(new THREE.BoxGeometry(cd, ch, cw), caseM); cube.position.set(xc, y + ch / 2, zc); grp.add(cube);
        cube.renderOrder = 3;   /* glass after the shoes, or the distance sort put the bottom row in front of its case */
        var lit = new THREE.Mesh(new THREE.PlaneGeometry(cd - 0.08, cw - 0.08), stripM);   /* lit panel under the lid */
        lit.rotation.x = Math.PI / 2; lit.position.set(xc, y + ch - 0.014, zc); grp.add(lit);
        glowCard(cw - 0.04, ch - 0.04, leftX + 0.03, y + ch / 2, zc, Math.PI / 2, 0.2);
        shoeSlots.push({ ph: sneaker(xc + 0.01, y + 0.012, zc, -Math.PI / 2 + 0.12, CW[k], 1.1), x: xc, y: y + 0.006, z: zc, w: cd - 0.04, h: ch - 0.06, d: cw - 0.06, hue: SHOE_HUE[i], ry: Math.PI / 2 });
      });
      var swL = new THREE.PointLight(0xe8f1ff, 0, 3); swL.position.set(leftX + 1.1, swY0 + rowH, (swZ0 + swZ1) / 2); world.add(swL);

      /* ── shoe boxes by the desk, the top one open with a pair inside ── */
      /* "Nike Shoe Box" by samplemem: three closed, the top one open with
         its lid on the floor beside the stack */
      var bxX = B.max.x + 0.8, bxZ = backZ + 0.7, BXH = 0.235;
      function only(part) { return function (piv, o) { o.traverse(function (m) { if (m.isMesh && m.name.indexOf(part) < 0) m.visible = false; }); }; }
      for (var k = 0; k < 4; k++) prop('shoebox', 0.64, bxX + (k % 2) * 0.03, floorY + k * BXH, bxZ + k * 0.02, (k % 2) * 0.04, k < 3 ? null : only('BOTTOM'));
      prop('shoebox', 0.64, bxX + 0.75, floorY, bxZ + 0.35, 0.5, only('TOP'));
      var boxPair = new THREE.Group();
      boxPair.add(sneaker(-0.12, 0, 0.04, 0.1, CW.chicago, 0.95), sneaker(0.13, 0, 0.08, -0.15, CW.chicago, 0.95));
      grp.add(boxPair); boxPair.position.set(bxX, floorY + 3 * BXH + 0.03, bxZ);
      shoeSlots.push({ ph: boxPair, x: bxX + 0.03, y: floorY + 3 * BXH + 0.03, z: bxZ + 0.06, w: 0.56, h: 0.3, d: 0.36, hue: SHOE_HUE[0], ry: 0.15 });
      var HUE_GLSL = 'vec3 hueRot(vec3 c,float a,float s){vec3 y=mat3(.299,.596,.211,.587,-.274,-.523,.114,-.322,.312)*c;' +
        'float h=atan(y.z,y.y)+a,k=length(y.yz)*s;y.y=k*cos(h);y.z=k*sin(h);return mat3(1.,1.,1.,.956,-.272,-1.106,.621,-.647,1.703)*y;}\n';
      var shoeLoader = new GLTFLoader(); shoeLoader.setMeshoptDecoder(MeshoptDecoder);
      shoeLoader.load('img/hero3d/sneaker-aj1.glb', function (g) {
        var src = g.scene, bb = new THREE.Box3();
        shoeSlots.forEach(function (sl) {
          var o = src.clone(true);
          o.traverse(function (m) {
            if (!m.isMesh) return;
            var mt = m.material = m.material.clone(); mt.transparent = true; mats.push(mt);
            mt.onBeforeCompile = function (sh) {
              sh.uniforms.uHue = { value: sl.hue[0] }; sh.uniforms.uSat = { value: sl.hue[1] };
              sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uHue,uSat;\n' + HUE_GLSL + 'void main() {')
                .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = max(hueRot(diffuseColor.rgb, uHue, uSat), 0.);');
            };
            mt.customProgramCacheKey = function () { return 'aj-hue'; };
          });
          /* fit the pair inside its slot, sitting on the floor of it */
          var piv = new THREE.Group(); piv.add(o); piv.rotation.y = sl.ry; piv.updateMatrixWorld(true);
          bb.setFromObject(piv); var sz = bb.getSize(new THREE.Vector3());
          var k = Math.min(sl.w / sz.x, sl.h / sz.y, sl.d / sz.z) * 0.92;
          piv.scale.setScalar(k); piv.updateMatrixWorld(true); bb.setFromObject(piv);
          var c0 = bb.getCenter(new THREE.Vector3());
          piv.position.set(sl.x - c0.x, sl.y - bb.min.y, sl.z - c0.z);
          grp.add(piv); sl.ph.visible = false;
        });
        shown = -1; if (!ready) early();   /* re-apply the current fade to the new materials */
      });
      /* the bed along the left wall, between it and the desk */
      /* "Dark Modern Bed" by renviros, head against the back wall */
      var bz = backZ + 1.82, bx = leftX + 1.2, bedPiv = null;   /* head still at the back wall */
      var ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
      function onBed(x, z) {   /* top of the covers under (x, z) */
        ray.set(new THREE.Vector3(x, floorY + 3, z), down);
        var hit = bedPiv && ray.intersectObject(bedPiv, true)[0];
        return hit ? hit.point.y : floorY + 0.6;
      }
      function bedY(x, z, r) {   /* highest cover point under a prop's footprint, so it never sinks in */
        var y = onBed(x, z);
        for (var a = 0; a < 8; a++) y = Math.max(y, onBed(x + Math.cos(a * Math.PI / 4) * r, z + Math.sin(a * Math.PI / 4) * r), onBed(x + Math.cos(a * Math.PI / 4) * r / 2, z + Math.sin(a * Math.PI / 4) * r / 2));
        return y;
      }
      /* gamer corner: the desk gets an AULA F75 and a gaming chair, the bed
         an iPad with its pencil and a SNES pad, a monstera fills the gap
         between bed and desk, a film camera lies by the pillow and a neon
         sign glows on the wall under the cabinet */
      var topY = B.max.y;
      var lap = root3.getObjectByName('laptop_base'), lb = lap ? new THREE.Box3().setFromObject(lap) : null;
      var kx = lb ? (lb.min.x + lb.max.x) / 2 : cx, kz = lb ? B.max.z - 0.15 : B.max.z - 0.3;
      prop('keyboard', { s: 0.6, flat: -1 },   /* mass test lands this scan upside down */
         kx, topY, kz, 0);
      prop('chair', { h: 1.5 }, B.min.x + 0.55, floorY, B.max.z + 0.05, Math.PI + 0.6);
      prop('bed', { s: 2.3, sz: 1.6 }, bx, floorY, bz, 0, function (piv) {
        bedPiv = piv; piv.updateMatrixWorld(true);
        /* the iPad model has no textures: a space-grey body plus a lit screen */
        var padScr = (function () {
          var c = document.createElement('canvas'); c.width = 128; c.height = 92;
          var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 128, 92);
          gr.addColorStop(0, '#1e1b4b'); gr.addColorStop(0.55, '#0e7490'); gr.addColorStop(1, '#f59e0b');
          g.fillStyle = gr; g.fillRect(0, 0, 128, 92);
          var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
        })();
        prop('ipad', 0.5, bx + 0.2, bedY(bx + 0.2, bz + 0.55, 0.25), bz + 0.55, 0.35, function (piv, o) {
          o.traverse(function (m) { if (m.isMesh) m.material.color.setHex(0x2b2f36); });
          var sm = new THREE.MeshBasicMaterial({ map: padScr, transparent: true, toneMapped: false }); mats.push(sm);
          var scr = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.3), sm); scr.rotation.x = -Math.PI / 2;
          /* the screen sits on the body's top face */
          var pb = new THREE.Box3().setFromObject(piv), pc = pb.getCenter(new THREE.Vector3());
          var hold = new THREE.Group(); hold.add(scr); hold.rotation.y = 0.35; hold.position.set(pc.x, pb.max.y + 0.002, pc.z); grp.add(hold);
        });
        prop('pencil', 0.32, bx + 0.55, bedY(bx + 0.55, bz + 0.6, 0.16), bz + 0.6, -0.2);
        prop('snes', 0.5, bx - 0.35, bedY(bx - 0.35, bz + 0.65, 0.22), bz + 0.65, -0.5);
        prop('camera', 0.3, bx - 0.4, bedY(bx - 0.4, bz - 0.65, 0.14), bz - 0.65, 0.6);
      });
      prop('monstera', { h: 2.0 }, B.max.x + 0.3, floorY, backZ + 0.3, 0.4);   /* floor, right of the desk (beside the bed it read as sitting on it) */
      prop('neon', { h: 0.95, anim: true }, cbX - cbW * 0.22, deskY - 0.3, backZ + 0.12, 0);
      /* outside: the city below the window and a sky that follows Manila */
      var city = skyline(new THREE.Vector3(cx, floorY, backZ - 18), 0, 0, 0, 0, 0, 0, 0.32, {
        x0: cx - 30, x1: cx + 30, z0: backZ - 4, z1: backZ - 32, base: floorY - 12, h0: 7, h1: 17, count: 230 });
      var su = { uDay: { value: 0 }, uDusk: { value: 0 }, uA: { value: 0 } };
      var skyM = new THREE.ShaderMaterial({
        uniforms: su, transparent: true, depthWrite: false,
        vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'uniform float uDay,uDusk,uA;varying vec2 vU;float h(vec2 p){return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5);}' +
          'void main(){float y=vU.y;vec3 nite=mix(vec3(.05,.09,.2),vec3(.01,.02,.06),y);' +
          'vec2 g=floor(vU*vec2(260.,130.));float st=step(.997,h(g))*smoothstep(.35,.8,y);nite+=st*.8;' +
          'vec3 dusk=mix(vec3(.85,.42,.2),vec3(.12,.15,.35),smoothstep(.1,.7,y));' +
          'vec3 day=mix(vec3(.62,.78,.95),vec3(.25,.5,.86),y);' +
          'vec3 col=mix(mix(nite,dusk,uDusk),day,uDay);gl_FragColor=vec4(col,uA);}'
      });
      var sky = new THREE.Mesh(new THREE.PlaneGeometry(110, 50), skyM);
      sky.position.set(cx, floorY + 6, backZ - 34); sky.renderOrder = -3; grp.add(sky);
      /* room lights: a warm ceiling lamp (stronger at night) and cool
         light spilling in from the window; both fade in with the room */
      /* the room's lights live in the world, not in the room group, and
         sit at 0 while it is hidden: hiding them changed the light count,
         which is part of every shader, so each reveal recompiled them all */
      var lampL = new THREE.PointLight(0xffc98a, 0, 13); lampL.position.set(cx - 1.2, floorY + H - 0.7, backZ + 3.2); world.add(lampL);
      var winL = new THREE.PointLight(0x8fb8ff, 0, 11); winL.position.set(cx, (wy0 + wy1) / 2, backZ + 1.2); world.add(winL);
      var dayNow = 0;
      world.add(grp);
      var shown = -1, mixT = 0, fadeK = 0, fadeGoal = 0, fadeT = 0;
      return {
        tick: function () {
          /* the room fades in as the hero scrolls away; hidden in the hero */
          /* eased, and solid surfaces keep writing depth while they fade:
             without it the walls went see-through and the bed showed
             through the desk (an x-ray look, not a fade) */
          /* time-based, not scrubbed by scroll: once the hero is a little
             way out the room fades in over 0.6s (and back out), so it never
             rests half see-through behind the hero */
          var ho = window.__worldHeroOut || 0, tNow = performance.now(), fdt = Math.min(0.1, (tNow - (fadeT || tNow)) / 1000); fadeT = tNow;
          if (ho > 0.15) fadeGoal = 1; else if (ho < 0.06) fadeGoal = 0;
          fadeK += Math.max(-fdt / 0.6, Math.min(fdt / 0.6, fadeGoal - fadeK));
          var a = fadeK * fadeK * (3 - 2 * fadeK);
          if (prime === 1 && a <= 0.01) {
            prime = 2; grp.visible = true;
            for (var q = 0; q < mats.length; q++) { mats[q].colorWrite = false; mats[q].depthWrite = false; }
            return;
          }
          if (prime === 2) { prime = 3; for (var q2 = 0; q2 < mats.length; q2++) mats[q2].colorWrite = true; shown = -1; }
          var now = performance.now(), dt = Math.min(0.1, (now - (mixT || now)) / 1000); mixT = now;
          if (a > 0.01 && !ready) {
            if (!warming) { warming = true; compileThen(grp, function () { ready = true; shown = -1; }); }
            a = 0; fadeK = 0;
          }
          if (a > 0.01) for (var j = 0; j < mixers.length; j++) mixers[j].update(dt);
          if (Math.abs(a - shown) < 0.01) return;
          shown = a;
          grp.visible = city.mesh.visible = a > 0.01;
          for (var i = 0; i < mats.length; i++) { var mx = mats[i].userData.max; mats[i].opacity = a * (mx || 1); mats[i].depthWrite = !mx; }
          city.fade(a); su.uA.value = a;
          lampL.intensity = a * (9 - 6 * dayNow); winL.intensity = a * (3 + 5 * dayNow);
          cabL.intensity = a * 2.2; swL.intensity = a * 1.6;
        },
        day: function (k, dusk) { dayNow = k; shown = -1; su.uDay.value = k; su.uDusk.value = dusk || 0; city.day(k); ledM.color.setHex(k > 0.5 ? 0x5fa8c0 : 0x00d4ff); }
      };
    }
    /* Manila day and night: the world's light follows the real time in
       Manila (?hour=13 in the URL previews any hour). Checked once a
       minute; day 0..1, dusk 0..1 around sunrise and sunset. */
    var dayK = 0, lightAt = -1, NIGHT_FOG = new THREE.Color(0x0a1628), DAY_FOG = new THREE.Color(0x1a3c66);
    var HEMI0 = hemi.color.clone(), HEMI_DAY = new THREE.Color(0xd8ecff);
    function manilaHour() {
      var q = /[?&]hour=(\d+(?:\.\d+)?)/.exec(location.search);
      if (q) return +q[1] % 24;
      try {
        var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
        var h = 0, m = 0;
        p.forEach(function (x) { if (x.type === 'hour') h = +x.value; if (x.type === 'minute') m = +x.value; });
        return (h % 24) + m / 60;
      } catch (e) { return 21; }
    }
    function sstep(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
    function dayLight(t) {
      if (t - lightAt < 60 && lightAt >= 0) return;
      lightAt = t;
      var h = manilaHour();
      var day = sstep(5.5, 8, h) * (1 - sstep(17, 19.5, h));
      var dusk = Math.max(1 - Math.abs(h - 18.2) / 1.3, 1 - Math.abs(h - 6.2) / 1.1, 0);
      renderer.toneMappingExposure = 0.75 + 0.4 * day;
      /* intensities are set per frame with the mood (below); this only
         stores how much daylight to add */
      dayK = day; hemi.color.copy(HEMI0).lerp(HEMI_DAY, day);
      key.color.setHex(day > 0.5 ? 0xfff1d6 : 0xcfe6ff);
      warm.intensity = 4 + 4 * dusk;
      if (world.fog) world.fog.color.copy(NIGHT_FOG).lerp(DAY_FOG, day);
      if (bg) bg.day(day, dusk);
      var phase = day > 0.6 ? 'Day' : dusk > 0.3 ? (h < 12 ? 'Dawn' : 'Dusk') : 'Night';
      document.documentElement.setAttribute('data-manila', phase.toLowerCase());
      window.__manilaPhase = phase;
    }
    function worldTick(t, s, sf) {
      dayLight(t);
      if (shell) { shell.rotation.y = t * 0.018; shell.rotation.x = Math.sin(t * 0.05) * 0.08; }
      if (shell2) shell2.rotation.y = -t * 0.03;
      /* in the hero the live wallpaper's plasma is the backdrop; the wire
         shells come up only once the hero has scrolled away */
      if (shell) {
        var ho = window.__worldHeroOut || 0;
        shell.material.opacity = 0.03 + 0.11 * ho;
        shell2.material.opacity = 0.02 + 0.06 * ho;
      }
      if (field) field.rotation.y = t * 0.008;
      if (bg) bg.tick(t);
      if (focus) {
        focus.position.copy(shotLook); focus.position.y += 0.45; focus.position.z += 0.5;
        /* brightest once the camera has arrived, dark in the hero shot */
        var arrive = sf > 0.85 || sf < 0.02 ? 1 : 0.4;
        focus.intensity += ((s > 0.05 ? 2.2 * arrive : 0) - focus.intensity) * 0.06;
      }
    }

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
      return hopShape(u, r);
    }
    /* the same squash/stretch hop for a pup; P.hopAt / P.cfg.hop */
    function pupHop(P, t) {
      var u = (t - P.hopAt) / 0.85, r = { h: 0, sx: 1, sy: 1, u: u, on: u >= 0 && u < 1 };
      if (u >= 1) { P.hopAt = t + P.cfg.hop[0] + Math.random() * P.cfg.hop[1]; return r; }
      return hopShape(u, r);
    }
    function hopShape(u, r) {
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
    function pawPose(P, t, hp, toHop, tempo) {
      tempo = tempo || 1;
      var kn = Math.max(0, Math.sin(t * 0.9 * tempo)) , ph = t * 6.2 * tempo,
        pl = Math.max(0, Math.sin(ph)) * kn, pr = Math.max(0, Math.sin(ph + Math.PI)) * kn,
        tap = toHop > 0 && toHop < 0.4 ? Math.sin((0.4 - toHop) / 0.4 * Math.PI * 2) : 0,
        land = hp.u > 0.72 && hp.u < 1 ? Math.sin((hp.u - 0.72) / 0.28 * Math.PI) : 0,
        up = hp.h > 0 ? hp.h : 0;
      if (tap > 0) pr = Math.max(pr, tap); else if (tap < 0) pl = Math.max(pl, -tap);
      if (P.paws) { var s0 = P.paws.userData.s0; P.paws.scale.x = s0.x * (1 + land * 0.07); }
      if (P.paw_l) { P.paw_l.rotation.z = P.paw_l.userData.r0.z - pl * 0.09 - land * 0.06 + up * 0.08; P.paw_l.position.y = P.paw_l.userData.p0.y + pl * 0.007; }
      if (P.paw_r) { P.paw_r.rotation.z = P.paw_r.userData.r0.z + pr * 0.09 + land * 0.06 - up * 0.06; P.paw_r.position.y = P.paw_r.userData.p0.y + pr * 0.007; }
    }
    /* head (neck pivot), ears and idle actions, shared by all four dogs.
       Cards face +Z: rotation.z turns in the card plane (nose up = -z,
       the dogs face left), rotation.y a small turn (kept small so the
       bulged card never shows its edge). look: -1..1 cursor side of the
       dog, lu: cursor above (-) / below (+) her; ck: CTA envelope */
    function headPose(P, C, t, dt, hp, br, look, lu, ck, cdir) {
      if (t > P.idleAt) {
        P.idle = C.sig && Math.random() < 0.4 ? 3 : (Math.random() * 3) | 0;
        P.idleT = t; P.idleAt = t + C.idle[0] + Math.random() * C.idle[1] + (P.idle === 3 ? 1 : 0);
      }
      var it = t - (P.idleT || -9), id = P.idle === 3 ? 2.6 : 1.8,
        ie = it < id ? Math.sin(it / id * Math.PI) : 0, ik = ie * ie;
      /* the signature move's envelope, also read by the body/tail code */
      P.sig = P.idle === 3 ? ik : 0; P.sigT = it;
      var k = Math.min(1, dt * C.lag);
      P.lk = (P.lk || 0) + ((look * (1 - ck) + cdir * ck) - (P.lk || 0)) * k;
      P.lu = (P.lu || 0) + ((lu * (1 - ck) - ck) - (P.lu || 0)) * k;
      var ty = P.lk * 0.16 * C.look, tz = P.lu * 0.05 * C.look, perk = 0;
      if (P.idle === 3 && C.sig === 'guard') {                                 /* on guard: nose up, eyes front, ears perk, one bark bob */
        ty *= 1 - ik; tz -= ik * 0.08; perk = ik * 0.12;
        if (it > 1.1 && it < 1.45) tz += Math.sin((it - 1.1) / 0.35 * Math.PI) * 0.05;
      }
      if (P.idle === 3 && C.sig === 'tilts') {                                 /* one way, then the other */
        var hw = id / 2, side = it < hw ? 1 : -1, hk = Math.sin((it % hw) / hw * Math.PI);
        tz += side * hk * hk * 0.11;
      }
      if (P.idle === 0) tz += ik * 0.07 + Math.sin(it * 19) * 0.012 * ie;     /* sniff: nose dips, quick snuffles */
      if (P.idle === 1) tz += ik * (P.lk > 0 ? -0.09 : 0.09);                 /* head tilt: the quizzical cock */
      tz += Math.sin(t * C.br) * 0.012 - hp.h * 0.05;                          /* breath bob; nose up mid-hop */
      if (P.head) {
        var h0 = P.head.userData;
        P.head.rotation.y = h0.r0.y + ty;
        P.head.rotation.z = h0.r0.z + tz;
        P.head.position.y = h0.p0.y + br * 0.0018 - (P.idle === 0 ? ik * 0.003 : 0);
      }
      /* ears flop: lag behind the head on a hop (up on the drop, down on the rise) */
      var fl = hp.on ? Math.sin(Math.max(0, hp.u) * Math.PI * 2) * 0.16 : 0;
      fl += Math.sin(t * C.br * 1.3) * 0.02 + (P.idle === 1 ? ik * 0.08 : 0) - perk;
      if (P.ear_l) P.ear_l.rotation.z = P.ear_l.userData.r0.z - fl;
      if (P.ear_r) P.ear_r.rotation.z = P.ear_r.userData.r0.z + fl;
      /* weight shift: the body settles and leans for a moment */
      return P.idle === 2 ? ik : 0;
    }
    var gx = innerWidth / 2, gy = innerHeight / 2, crc = null;
    addEventListener('pointermove', function (e) { gx = e.clientX; gy = e.clientY; }, { passive: true });
    function lookAt(o) {
      /* -1..1: where the cursor is relative to this dog on screen */
      o.getWorldPosition(v2); v2.project(cam);
      var x = crc.left + (v2.x + 1) / 2 * crc.width, y = crc.top + (1 - v2.y) / 2 * crc.height;
      return [Math.max(-1, Math.min(1, (gx - x) / (innerWidth * 0.3))), Math.max(-1, Math.min(1, (gy - y) / (innerHeight * 0.35)))];
    }
    var pups = [], cal = null, weigh = null, steam = null;
    /* shared with 40-desk-extras.js: ticks run each frame before render,
       dolly 0..1 pulls the camera in toward the desk */
    var H = { THREE: THREE, world: world, rig: rig, cam: cam, picks: picks, ticks: [], dolly: 0, chartDraw: null };
    var zc = new THREE.Vector3(), zcam = new THREE.Vector3(), look = new THREE.Vector3();
    var loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load('img/hero3d/scene.glb', function (g) {
      if (glbDone) { glbDone(g); glbDone = null; }
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
        if (/^dog_(body|head|ear_l|ear_r|tail|paws|paw_l|paw_r|shadow)$/.test(o.name)) { dog[o.name.slice(4)] = o; o.userData.p0 = o.position.clone(); o.userData.r0 = o.rotation.clone(); o.userData.s0 = o.scale.clone(); if (o.name === 'dog_shadow') o.userData.s0.multiplyScalar(1.3); }
        if (o.name === 'dog') { dog.root = o; o.userData.r0 = o.rotation.clone(); o.userData.p0 = o.position.clone(); }
        /* the dogs are photo cut-outs: alpha-to-coverage (the composer's
           4x MSAA target) for a smooth, halo-free fur edge, both faces,
           and a soft self-glow so the coats are not greyed by the cool
           key (the light match itself is baked by 3d/cutout_fx.py) */
        if (o.isMesh && o.material && /^(dog|mochi|tofu|pochi)_((tail|head|ear_[lr]|paw_[lr])_)?cutout$/.test(o.material.name)) {
          var dm = o.material = o.material.clone();
          dm.transparent = false; dm.alphaTest = 0.4; dm.alphaToCoverage = true; dm.depthWrite = true; dm.side = THREE.DoubleSide;
          dm.metalness = 0; dm.roughness = 1; dm.emissive = new THREE.Color(1, 1, 1); dm.emissiveMap = dm.map; dm.emissiveIntensity = 0.27; cardFx(dm);
          /* clamp: repeat-wrap pulled the paws row onto the card's top edge (stray dashes) */
          if (dm.map) { dm.map.wrapS = dm.map.wrapT = THREE.ClampToEdgeWrapping; dm.map.needsUpdate = true; }
          dm.userData.keepEmissive = true; dm.needsUpdate = true;
        }
        /* contact shadows: paw pads + ambient pool, strength baked in the texture */
        if (o.isMesh && o.material && /^(dog|mochi|tofu|pochi)_shadow$/.test(o.material.name)) { o.material = o.material.clone(); o.material.transparent = true; o.material.depthWrite = false; o.material.opacity = 1; o.material.polygonOffset = true; o.material.polygonOffsetFactor = -1; }
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
      gamingLaptop(g.scene); ledLamp(g.scene);
      /* zoom target: the laptop screen's centre, seen square on. The lid
         leans back 14deg, so its normal is (0, sin14, cos14). */
      g.scene.getObjectByName('laptop_screen').getWorldPosition(zc);
      zcam.set(0, 0.242, 0.97).multiplyScalar(3.8).add(zc);
      if (WORLD) buildWorld(g.scene);
      printer = labelPrinter(g.scene);
      pups.forEach(function (p) {
        p.root.userData.r0 = p.root.rotation.clone();
        ['body', 'head', 'ear_l', 'ear_r', 'tail', 'paws', 'paw_l', 'paw_r', 'shadow'].forEach(function (k) {
          var o = g.scene.getObjectByName(p.root.name + '_' + k);
          if (o) { o.userData.p0 = o.position.clone(); o.userData.r0 = o.rotation.clone(); o.userData.s0 = o.scale.clone(); if (k === 'shadow') o.userData.s0.multiplyScalar(1.3); }
          p[k] = o;
        });
        p.ph = Math.random() * 6; p.wag = 0; p.idleAt = 3 + Math.random() * p.cfg.idle[0];
        /* staggered first hops: Pochi soon, Mochi much later */
        p.hopAt = 2 + p.cfg.hop[0] * 0.5 + Math.random() * p.cfg.hop[1];
      });
      /* a tight dark contact blob under every dog, on top of the baked
         soft shadow, so the cards sit on the desk instead of hovering */
      [dog.root].concat(pups.map(function (p) { return p.root; })).forEach(function (r) {
        if (!r) return;
        var bb = new THREE.Box3().setFromObject(r), w = bb.max.x - bb.min.x;
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var cg = c.getContext('2d'), gr = cg.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        cg.fillStyle = gr; cg.fillRect(0, 0, 64, 64);
        var m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
        r.updateMatrixWorld(true);
        var s = r.getWorldScale(v1);
        m.scale.set(w * 0.8 / s.x, 1, w * 0.32 / s.z); m.position.y = 0.003 / s.y; m.renderOrder = 2; r.add(m);
      });
      cal = deskCalendar(g.scene); weigh = parcelScale(g.scene); steam = mugSteam(g.scene);
      ['holo_order', 'holo_gauge'].forEach(function (n) { glassSlab(g.scene.getObjectByName(n)); });
      deskSheen(g.scene);
      dust = lampDust(); sky = skyPanel();
      /* drifting data motes around the desk */
      var N = 110, pos = new Float32Array(N * 3);
      /* x > -0.4: none drift over the headline side of the canvas */
      for (var i = 0; i < N; i++) { pos[i * 3] = -0.4 + Math.random() * 2.6; pos[i * 3 + 1] = Math.random() * 2.4; pos[i * 3 + 2] = (Math.random() - 0.5) * 3; }
      var pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      motes = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x5fdcff, size: 0.018, transparent: true, opacity: 0.7, depthWrite: false }));
      rig.add(motes);
      flow = dataFlow(); sparks = sparkBurst(); orders = orderPops();
      H.root = g.scene; H.dog = dog; H.pups = pups; H.screens = screens;
      /* compile every shader before the first frame, in parallel where
         KHR_parallel_shader_compile exists, instead of stalling the first
         render (the audit's 780 ms long task was parse + compile) */
      /* compiled against the composer's half-float target: the RenderPass
         draws there (no tone mapping, linear output), and programs built
         for the canvas would be a different variant, compiled again on
         the first real frame */
      var warm = Promise.resolve();
      if (renderer.compileAsync) {
        renderer.setRenderTarget(composer.readBuffer);
        warm = renderer.compileAsync(world, cam);
        renderer.setRenderTarget(null);
      }
      warm.catch(function () {}).then(function () {
        window.__hero3d = H;
        dispatchEvent(new Event('hero3d:ready'));
        if (!paused) scene.classList.add('has-3d');
        if (WORLD && !paused) document.documentElement.classList.add('world-on');
        /* after the fade-in, the scroll fade drives opacity directly */
        setTimeout(function () { canvas.style.transition = 'none'; }, 1000);
        loop();
      });
    }, undefined, function () { skip('scene.glb failed to load'); });

    /* ── glass slabs (2026-10-07): the floating cards were bare planes;
       each gets a thin bevelled glass body behind its face (0.012 deep)
       with a cyan rim, so it has an edge and catches the light when the
       camera leans. Child of the card mesh, so it floats with it. */
    function glassSlab(card) {
      if (!card || !card.isMesh) return;
      var gb = card.geometry; gb.computeBoundingBox();
      var sz = gb.boundingBox.getSize(new THREE.Vector3()), ctr = gb.boundingBox.getCenter(new THREE.Vector3());
      card.updateWorldMatrix(true, false);
      var e = card.matrixWorld.elements, sc = [Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10])];
      var ax = [0, 1, 2].sort(function (i, j) { return sz.getComponent(i) * sc[i] - sz.getComponent(j) * sc[j]; })[0];
      var nw = new THREE.Vector3().setComponent(ax, 1).transformDirection(card.matrixWorld);
      var front = nw.dot(v1.copy(camBase).sub(card.getWorldPosition(v2))) > 0 ? 1 : -1;
      var dim = [0, 1, 2].map(function (i) { return i === ax ? 0.012 / sc[i] : sz.getComponent(i) + 0.03 / sc[i]; });
      var geo = new THREE.BoxGeometry(dim[0], dim[1], dim[2]);
      var slab = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0a2038, metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.6,
        emissive: 0x0b4a6e, emissiveIntensity: 0.35, depthWrite: false }));
      slab.position.copy(ctr).setComponent(ax, ctr.getComponent(ax) - front * 0.0075 / sc[ax]);
      slab.material.userData.keepEmissive = true;
      var rim = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x5fe0ff, transparent: true, opacity: 0.3 }));
      slab.add(rim); card.add(slab);
    }

    /* round glow sprite shared by the flow and spark points */
    var dot = (function () {
      var c = document.createElement('canvas'); c.width = c.height = 32;
      var g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
      return new THREE.CanvasTexture(c);
    })();

    /* desk lamp: the Blender lamp's base hung off the desk edge and its
       shade pointed up, so it is swapped for a slim LED arm lamp standing
       at the back-left of the desk, its light bar angled down at the
       mug and keyboard (the warm point light and dust sit under it) */
    function ledLamp(root) {
      ['lamp_base', 'lamp_arm', 'lamp_head', 'lamp_bulb'].forEach(function (n) { var o = root.getObjectByName(n); if (o) o.visible = false; });
      var body = new THREE.MeshStandardMaterial({ color: 0x4a505c, metalness: 0.7, roughness: 0.28 });
      var g = new THREE.Group(); g.name = 'led_lamp'; root.add(g);
      function rod(a, b, r) {
        var d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 12), body);
        m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(m);
        var j = new THREE.Mesh(new THREE.SphereGeometry(r * 1.6, 12, 8), body); j.position.copy(b); g.add(j);
      }
      var base = new THREE.Vector3(-1.56, 0.02, -0.02), elbow = new THREE.Vector3(-1.6, 0.42, -0.12), head = new THREE.Vector3(-1.34, 0.46, 0.12);
      var foot = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.02, 28), body); foot.position.set(base.x, 0.01, base.z); g.add(foot);
      var ring = new THREE.Mesh(new THREE.CylinderGeometry(0.087, 0.087, 0.004, 28), new THREE.MeshBasicMaterial({ color: 0x00d4ff, toneMapped: false }));
      ring.position.set(base.x, 0.003, base.z); g.add(ring);
      rod(base, elbow, 0.013); rod(elbow, head, 0.012);
      /* the head: a thin bar along the arm, tipped 20 degrees down, warm LEDs underneath */
      var dir = new THREE.Vector3().subVectors(head, elbow).setY(0).normalize();
      var bar = new THREE.Group(); bar.position.copy(head); bar.rotation.y = Math.atan2(-dir.z, dir.x); g.add(bar);
      var tilt = new THREE.Group(); tilt.rotation.z = -0.35; bar.add(tilt);
      var shell = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.026, 0.07), body); shell.position.x = 0.13; tilt.add(shell);
      var led = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.04), new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false }));
      led.rotation.x = Math.PI / 2; led.position.set(0.12, -0.0115, 0); tilt.add(led);
      /* a warm edge line so the lit bar reads from above too */
      var edge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.004, 0.004), led.material); edge.position.set(0.12, -0.009, 0.031); tilt.add(edge);
      var edge2 = edge.clone(); edge2.position.z = -0.031; tilt.add(edge2);
    }

    /* gaming laptop: gunmetal body and lid, a red stripe on the lid edge
       and an RGB light bar on the front edge of the base (a scrolling
       rainbow texture, so it costs one tiny draw) */
    function gamingLaptop(root) {
      var base = root.getObjectByName('laptop_base'), lid = root.getObjectByName('laptop_lid');
      [base, lid].forEach(function (m) {
        if (!m || !m.material || !m.material.color) return;
        m.material = m.material.clone(); m.material.color.setHex(0x1a1d24); m.material.metalness = 0.55; m.material.roughness = 0.32;
      });
      if (!base || !base.geometry) return;
      base.geometry.computeBoundingBox();
      var bb = base.geometry.boundingBox, w = bb.max.x - bb.min.x;
      var c = document.createElement('canvas'); c.width = 256; c.height = 4;
      var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 256, 0);
      ['#ff2d55', '#ff9f0a', '#ffd60a', '#30d158', '#00d4ff', '#5e5ce6', '#bf5af2', '#ff2d55'].forEach(function (col, i) { gr.addColorStop(i / 7, col); });
      g.fillStyle = gr; g.fillRect(0, 0, 256, 4);
      var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
      var bar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.006, 0.006), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      bar.position.set((bb.min.x + bb.max.x) / 2, bb.min.y + 0.006, bb.max.z + 0.002);
      bar.onBeforeRender = function () { tex.offset.x = (performance.now() / 6000) % 1; };
      base.add(bar);
      if (lid && lid.geometry) {
        lid.geometry.computeBoundingBox();
        var lb = lid.geometry.boundingBox;
        var stripe = new THREE.Mesh(new THREE.BoxGeometry((lb.max.x - lb.min.x) * 0.5, 0.004, 0.004), new THREE.MeshBasicMaterial({ color: 0xff2d3d, toneMapped: false }));
        stripe.position.set((lb.min.x + lb.max.x) / 2, lb.max.y - 0.002, lb.min.z - 0.001);
        lid.add(stripe);
      }
    }

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
        g.fillStyle = '#e8f4ff'; g.font = '700 25px ' + FONT; g.fillText('New order ' + AMT[seq % AMT.length], 80, 42);
        g.fillStyle = '#78c8f0'; g.font = '600 17px ' + FONT; g.fillText('#' + seq + ' · paid', 80, 68);
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
      top.m.transparent = true; top.m.side = THREE.FrontSide; page.m.side = THREE.FrontSide;
      var back = root.getObjectByName('cal_flip_back');
      if (back && back.material) { back.material = back.material.clone(); back.material.transparent = true; }
      var r0 = hinge.rotation.x, PERIOD = 8, last = -1;
      function draw(s, k) {
        var g = s.g, w = NOTES[k % NOTES.length];
        g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 256, 204);
        g.fillStyle = '#e8572a'; g.fillRect(0, 0, 256, 44);
        g.fillStyle = '#fff'; g.font = '700 22px ' + FONT; g.textAlign = 'center'; g.fillText('TODAY', 128, 30);
        g.fillStyle = '#142032'; g.font = '800 ' + (w.length > 9 ? 31 : 38) + 'px ' + FONT; g.fillText(w, 128, 116);
        g.fillStyle = '#14aa78'; g.beginPath(); g.arc(128, 160, 22, 0, 7); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(117, 161); g.lineTo(125, 169); g.lineTo(139, 151); g.stroke();
        s.tex.needsUpdate = true;
      }
      return function (t) {
        var cyc = Math.floor(t / PERIOD), u = (t % PERIOD - (PERIOD - 1.4)) / 1.4;
        if (cyc !== last) { last = cyc; draw(top, cyc); draw(page, cyc + 1); }
        if (u < 0) { hinge.rotation.x = r0; top.m.opacity = 1; top.mesh.visible = true; if (back) { back.material.opacity = 1; back.visible = true; } return; }
        var e = ease(u);
        hinge.rotation.x = r0 - e * 3.3 + Math.sin(u * 18) * 0.12 * (1 - u);
        top.m.opacity = 1 - ease((u - 0.55) / 0.45);
        top.mesh.visible = top.m.opacity > 0.01;
        if (back) { back.material.opacity = top.m.opacity; back.visible = top.mesh.visible; }
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

    /* ── mug steam: three soft puffs rise (0.25 units/s), swell, sway
       and fade; additive, so they read as warm vapour, never as lines */
    function mugSteam(root) {
      var mug = root.getObjectByName('mug');
      if (!mug) return null;
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,246,232,1)'); gr.addColorStop(0.45, 'rgba(255,246,232,.45)'); gr.addColorStop(1, 'rgba(255,246,232,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      var top = new THREE.Vector3(); mug.getWorldPosition(top); top.y += 0.09;
      var N = 3, RISE = 0.3, LIFE = RISE / 0.25, list = [];
      for (var i = 0; i < N; i++) {
        var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xfff1dc, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
        sp.renderOrder = 4; rig.add(sp); list.push({ s: sp, o: i / N });
      }
      return function (t) {
        for (var i = 0; i < N; i++) {
          var w = list[i], u = (t / LIFE + w.o) % 1, sz = 0.05 + u * 0.1;
          w.s.position.set(top.x + Math.sin(t * 0.9 + i * 2.1) * 0.025 * u, top.y + u * RISE, top.z + Math.cos(t * 0.7 + i) * 0.015 * u);
          w.s.scale.set(sz, sz, 1);
          /* smooth in and out, so the recycle at u = 0 never pops */
          w.s.material.opacity = Math.sin(u * Math.PI) * Math.sin(u * Math.PI) * 0.35;
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
      var N = 36, apex = new THREE.Vector3(-1.22, 0.4, 0.22), axis = new THREE.Vector3(0.1, -1, 0.12).normalize();
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

    /* ── skyline behind the desk (2026-10-07): a few real extruded
       towers instead of a painted panel, so they shift with the camera
       like everything else. Navy massing, lit windows at night, one
       faint palette-clamped glow behind them (navy to burnt orange at
       dawn/dusk, never magenta). Transparent and drawn first, so they
       never cover a prop. Redrawn once a minute (Manila time). */
    function skyPanel() {
      var wc = document.createElement('canvas'); wc.width = 64; wc.height = 128;
      var wg = wc.getContext('2d'); wg.fillStyle = '#000'; wg.fillRect(0, 0, 64, 128);
      for (var wy = 6; wy < 124; wy += 10) for (var wx = 5; wx < 60; wx += 9)
        if (((wx * 7 + wy * 13) | 0) % 7 < 2) { wg.fillStyle = (wx + wy) % 3 ? '#ffc46e' : '#7fd8ff'; wg.fillRect(wx, wy, 4, 5); }
      var wtex = new THREE.CanvasTexture(wc); wtex.colorSpace = THREE.SRGBColorSpace;
      var tm = new THREE.MeshStandardMaterial({ color: 0x0b1a30, roughness: 0.85, metalness: 0.1, emissive: 0xffffff, emissiveMap: wtex,
        emissiveIntensity: 0, transparent: true, opacity: 0.28, depthWrite: false });
      /* [x, z, width, depth, height] in rig space, behind the desk */
      var T = [[-2.6, -5.0, 0.5, 0.45, 1.5], [-1.95, -5.4, 0.42, 0.4, 1.8], [-1.3, -4.9, 0.36, 0.36, 1.2], [-0.6, -5.5, 0.55, 0.5, 1.9],
        [0.1, -5.1, 0.4, 0.4, 1.4], [0.8, -5.45, 0.48, 0.44, 1.7], [1.5, -5.0, 0.38, 0.36, 1.25], [2.15, -5.3, 0.5, 0.45, 1.5]];
      var box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
      var city = new THREE.InstancedMesh(box, tm, T.length), m4 = new THREE.Matrix4();
      T.forEach(function (b, i) { m4.makeScale(b[2], b[4], b[3]).setPosition(b[0], -1.0, b[1]); city.setMatrixAt(i, m4); });
      city.renderOrder = -1; city.frustumCulled = false; rig.add(city);
      /* the glow behind: a feathered gradient card */
      var W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
      var g = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      var glow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }));
      glow.position.set(-0.2, 0.9, -5.8); glow.rotation.y = 0.26; glow.renderOrder = -2; rig.add(glow);
      /* [hour, top, bottom], Manila time, all inside the site palette */
      var KEY = [[0, '#060d24', '#0d1a3a'], [5, '#08122e', '#16244e'], [6, '#1b2a5a', '#c46a3a'], [7.5, '#1d3f72', '#3f7fae'],
        [16.5, '#1d3f72', '#3f7fae'], [17.8, '#1b2a5a', '#c46a3a'], [19, '#0e1a40', '#1b2a5a'], [20.5, '#060d24', '#0d1a3a'], [24, '#060d24', '#0d1a3a']];
      function mix(a, b, f) {
        var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), o = '#';
        for (var s = 16; s >= 0; s -= 8) o += ('0' + Math.round(((A >> s) & 255) * (1 - f) + ((B >> s) & 255) * f).toString(16)).slice(-2);
        return o;
      }
      var api = function (hourOverride) {
        var h = hourOverride != null ? hourOverride : (Date.now() / 3.6e6 + 8) % 24, k = 0;
        while (KEY[k + 1][0] <= h) k++;
        var f = (h - KEY[k][0]) / (KEY[k + 1][0] - KEY[k][0]);
        var night = h < 5.5 || h > 19.5 ? 1 : h < 6.5 ? 6.5 - h : h > 18.5 ? h - 18.5 : 0;
        var gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, mix(KEY[k][1], KEY[k + 1][1], f)); gr.addColorStop(1, mix(KEY[k][2], KEY[k + 1][2], f));
        g.globalCompositeOperation = 'source-over'; g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'destination-in';
        g.save(); g.scale(1, H / W);
        var fe = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
        fe.addColorStop(0, '#000'); fe.addColorStop(0.45, '#000'); fe.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = fe; g.fillRect(0, 0, W, W); g.restore();
        g.globalCompositeOperation = 'source-over';
        tex.needsUpdate = true;
        glow.material.opacity = 0.22 + night * 0.06;
        tm.emissiveIntensity = 0.06 + night * 0.22;
      };
      api(); return api;
    }

    /* drone loop round the desk (three coords: x, up, toward the viewer) */
    var dronePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.3, 0.98, 0.75), new THREE.Vector3(1.3, 1.02, 0.55), new THREE.Vector3(1.45, 1.05, -0.55),
      new THREE.Vector3(0.45, 1.05, -1.2), new THREE.Vector3(-0.75, 1.02, -0.95), new THREE.Vector3(-0.6, 0.96, 0.45)], true);

    /* day/night mood: the hero stays dark, but the lamp and glow follow
       the site theme a little (light = daytime: lamp down, less bloom) */
    var root = document.documentElement, moodT = 0, mood = 0;
    function readTheme() { moodT = root.getAttribute('data-theme') === 'light' ? 1 : 0; }
    readTheme(); mood = moodT;
    new MutationObserver(readTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    /* scroll: as the hero leaves, the camera pulls back, the desk tilts
       and the canvas fades. The listener only stores scrollY; the render
       loop eases toward it. */
    var sy = scrollY, sp = 0, fade = 1, lastInput = performance.now();
    addEventListener('scroll', function () { sy = scrollY; lastInput = performance.now(); }, { passive: true });
    addEventListener('pointermove', function () { lastInput = performance.now(); }, { passive: true });

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
    /* WORLD: the tip follows the pointer anywhere on the page, and the
       world answers hover and clicks wherever nothing on the page sits on
       top of it (empty space in the hero, the chapter flights) */
    if (WORLD) { tip.classList.add('world-tip'); beep.classList.add('world-tip'); document.body.appendChild(tip); document.body.appendChild(beep); }
    function openSpace(e) {
      var el = e.target;
      if (stage.contains(el)) return false;
      if ((window.__worldDim || 0) > 0.35) return false;
      return el === document.documentElement || el === document.body || el.tagName === 'MAIN' ||
        !!(el.closest && el.closest('.tunnel')) || el.matches('.sec, .hero, .hero-inner, .testi-bg, .world-fx');
    }
    if (WORLD) {
      document.addEventListener('pointermove', function (e) {
        if (stage.contains(e.target)) return;
        if (!openSpace(e)) { if (hover) { tint(hover, 0); hover = null; } tip.classList.remove('on'); document.documentElement.classList.remove('world-hot'); return; }
        pointerOver(e);
      }, { passive: true });
      document.addEventListener('click', function (e) {
        if (!openSpace(e)) return;
        var c = owner(e);
        if (c) pickClick(c);
      });
    }
    stage.addEventListener('pointermove', pointerOver, { passive: true });
    function pointerOver(e) {
      /* the canvas overhangs the scene box (56-hero-motion.css), so
         pick against the canvas and place the tip against the scene */
      var cr = canvas.getBoundingClientRect(), r = WORLD ? { left: 0, top: 0 } : scene.getBoundingClientRect();
      tx = ((e.clientX - cr.left) / cr.width - 0.5) * 2;
      ty = ((e.clientY - cr.top) / cr.height - 0.5) * 2;
      tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px';
      if (zoomT) { hover = null; tip.classList.remove('on'); stage.style.cursor = 'zoom-out'; return; }
      /* every mesh is tested now, so pick at most ~30 times a second */
      if (e.timeStamp - lastPick < 33) return;
      lastPick = e.timeStamp;
      var c = owner(e);
      if (c !== hover) { tint(hover, 0); tint(c, 1); }
      hover = c;
      var go = c && (c.userData.own.href || c.userData.own.act || c.userData.own.modal);
      stage.style.cursor = go ? 'pointer' : '';
      if (WORLD) document.documentElement.classList.toggle('world-hot', !!go);
      if (c) { tip.textContent = c.userData.own.label + (c.userData.own.href || c.userData.own.modal ? ' →' : ''); tip.classList.add('on'); }
      else tip.classList.remove('on');
    }
    stage.addEventListener('pointerleave', function () { tx = ty = 0; tint(hover, 0); hover = null; tip.classList.remove('on'); stage.style.cursor = ''; });
    /* hover tint for clickable props (own.hl): a cool emissive wash on
       their own (cloned) materials. Live-screen materials are skipped,
       their glow is rewritten every frame. */
    var TINT = new THREE.Color(0x1d6f99);
    function tint(o, on) {
      if (!o || !o.userData.own.hl) return;
      o.traverse(function (m) {
        if (!m.isMesh || !m.material || m.material.userData.e0 !== undefined || m.material.userData.keepEmissive) return;
        if (!m.userData.tint) {
          m.material = m.material.clone();
          m.userData.tint = { c: m.material.emissive.clone(), i: m.material.emissiveIntensity };
        }
        var b = m.userData.tint;
        if (on) { m.material.emissive.copy(b.c).lerp(TINT, 0.65); m.material.emissiveIntensity = Math.max(b.i, 0.9); }
        else { m.material.emissive.copy(b.c); m.material.emissiveIntensity = b.i; }
      });
    }
    H.tint = tint;
    /* a CTA hovered (40-desk-extras.js): Dumpling hops and turns toward
       it, the pups follow one after another */
    var ctaReq = null, ctaT = -9, ctaDir = 0;
    addEventListener('dog-cta', function (e) { ctaReq = e.detail || {}; });
    stage.addEventListener('click', function (e) {
      if (zoomT) { zoomOut(); return; }
      hover = owner(e);
      if (!hover) return;
      pickClick(hover);
    });
    function pickClick(o) {
      var own = o.userData.own;
      if (own.act === 'gear') { gearBoost = 14; if (sparks) sparks.fire(); return; }
      if (own.act === 'laptop') { zoomIn(); return; }
      if (own.modal) { var mb = document.querySelector('.btn-modal-open[data-modal="' + own.modal + '"]'); if (mb) mb.click(); return; }
      if (own.href && own.href.charAt(0) !== '#') { location.href = own.href; return; }
      var el = own.href && document.querySelector(own.href);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    document.addEventListener('click', function (e) { if (!stage.contains(e.target) && !diving) zoomOut(); });
    addEventListener('scroll', function () { if (zoomT && !diving && Math.abs(scrollY - zoomSy) > 40) zoomOut(); }, { passive: true });
    /* WORLD: opening a project flies the camera into the laptop with that
       project on its screen (41-world-extras.js drives it; the modal opens
       over the dive and the laptop keeps the shot until it closes) */
    var diving = false;
    if (WORLD) {
      window.__worldDive = function (src) {
        diving = true;
        var img = new Image(); img.decoding = 'async';
        img.onload = function () { if (diving && screens) screens.photo(img); };
        img.src = src;
        zoomT = 1; zoomSy = scrollY; hover = null; tip.classList.remove('on');
      };
      window.__worldDiveEnd = function () {
        if (!diving) return;
        diving = false; zoomT = 0;
        if (screens) screens.photo(null);
      };
    }

    /* only render while the hero is visible and the tab is in front */
    var visible = true, raf = 0, clock = new THREE.Clock(), paused = false, dead = false, lost = false;
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) loop(); }).observe(WORLD ? canvas : stage);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) loop(); });

    /* the driver or the OS can drop the context; three restores it, the
       loop just has to stop meanwhile and the plate show through */
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault(); lost = true;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      scene.classList.remove('has-3d');
    });
    canvas.addEventListener('webglcontextrestored', function () {
      lost = false;
      if (!paused && !dead) { scene.classList.add('has-3d'); loop(); }
    });

    /* pause: stop the loop and free the GPU memory (geometry, textures,
       programs, render targets). three re-uploads everything on the next
       render, so resume is just a restart of the loop. */
    function release() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      scene.classList.remove('has-3d'); tip.classList.remove('on');
      document.documentElement.classList.remove('world-on');
      canvas.style.opacity = '0'; fade = -1;
      world.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        var ms = !o.material ? [] : Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(function (m) { for (var k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); });
      });
      composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); bloom.dispose();
      renderer.renderLists.dispose();
    }
    api = {
      pause: function () { if (paused || dead) return; paused = true; release(); },
      resume: function () {
        if (!paused || dead) return;
        paused = false; govPrev = 0; gov.t0 = 0; gov.s.length = 0; gov.bad = 0;
        size(); scene.classList.add('has-3d');
        if (WORLD) { canvas.style.opacity = ''; document.documentElement.classList.add('world-on'); }
        loop();
      }
    };

    /* quality governor: the median frame time of 2 s windows, after a
       3 s warm-up. The median ignores one-off hitches (an image decoding,
       a section mounting); two slow windows in a row are needed before
       it steps down. Over 22 ms: DPR 1 and no bloom composer. Still over
       30 ms: stop for good and keep the static plate. Only the gap after
       a rendered frame is sampled, so the idle half-rate below does not
       count against it. */
    var gov = { lvl: 0, t0: 0, s: [], bad: 0, last: 0 }, govPrev = 0, lastRendered = false, skipOdd = false;
    function govern(ms, now) {
      if (!gov.t0) { gov.t0 = now + 3000; return; }
      if (now < gov.t0) return;
      gov.s.push(ms);
      if (now - gov.t0 < 2000) return;
      gov.s.sort(function (a, b) { return a - b; });
      var med = gov.last = gov.s[gov.s.length >> 1];
      gov.t0 = now; gov.s.length = 0;
      var limit = gov.lvl === 0 ? 22 : 30;
      gov.bad = med > limit ? gov.bad + 1 : 0;
      if (gov.bad < 2) return;
      gov.bad = 0;
      if (gov.lvl === 0) {
        gov.lvl = 1; bloomOn = false; gov.t0 = now + 1000;
        renderer.setPixelRatio(1); composer.setPixelRatio(1); size();
        if (window.console && console.info) console.info('[hero 3D] ' + med.toFixed(1) + ' ms/frame: DPR 1, no bloom');
      } else if (gov.lvl === 1) {
        gov.lvl = 2; dead = true; release();
        skip(med.toFixed(1) + ' ms/frame at the lowest setting');
      }
    }
    window.__hero3dGov = gov;   /* read by the perf check */
    if (!ok.matches) api.pause();

    function loop() {
      if (raf || paused || dead || lost || !visible || document.hidden || !cubes.length) return;
      raf = requestAnimationFrame(frame);
    }
    function frame(now) {
      raf = 0;
      var gap = govPrev ? now - govPrev : 0; govPrev = now;
      if (lastRendered && gap > 0 && gap < 250) govern(gap, now);
      /* nothing touched for 3 s and no laptop zoom: render every other
         frame (~30 fps); the motion is all time-based, so only the
         smoothness changes */
      if (now - lastInput > 3000 && !zoomT && zoom < 0.01 && (skipOdd = !skipOdd)) { lastRendered = false; loop(); return; }
      lastRendered = true;
      var t = clock.getElapsedTime(), dt = Math.min(0.05, t - lastT), i; lastT = t;
      /* frame-rate independent easing: the same feel at 30, 60 or 144 Hz */
      var k05 = 1 - Math.pow(0.95, dt * 60), k08 = 1 - Math.pow(0.92, dt * 60);
      px += (tx - px) * k05; py += (ty - py) * k05;
      sp += (Math.min(1, sy / (innerHeight * 0.7)) - sp) * k08;
      mood += (moodT - mood) * k05;
      /* laptop zoom (z: 0 out, 1 in) mutes the lean, parallax and tilt */
      zoom += (zoomT - zoom) * Math.min(1, dt * 3.2);
      var z = ease(zoom), lean = 1 - z;
      if (saleReq) { saleReq = false; if (screens) screens.sale(t); }
      if (!zoomT && zoom < 0.15 && screens) screens.sale(-1);

      /* camera: pointer lean, then pulled back along its view line by scroll,
         then eased toward the face-on view of the laptop screen */
      if (WORLD && shots) {
        /* world: glide between chapter shots. __worldShot (0..n) is written
           by 25-chapter-tunnels.js from the tunnels' scroll progress; easing
           it here adds the weight, smoothstep shapes each leg */
        var goal = Math.min(shots.length - 1, window.__worldShot || 0);
        if (Math.abs(goal - shotS) > 0.001) lastInput = now;
        shotS += (goal - shotS) * k05;
        var si = Math.min(shots.length - 2, Math.floor(shotS)), sf = ease(shotS - si);
        var SA = shots[si], SB = shots[si + 1];
        shotPos.lerpVectors(SA.p, SB.p, sf); shotLook.lerpVectors(SA.l, SB.l, sf);
        var so = SA.o + (SB.o - SA.o) * sf;
        v1.subVectors(shotPos, shotLook);
        /* idle drift: a slow sway around the subject so the world never
           sits frozen while a chapter is read */
        v1.applyAxisAngle(UP, Math.sin(t * 0.09) * 0.07 * lean);
        v1.y += Math.sin(t * 0.13) * 0.08 * lean;
        v1.x += px * 0.45 * lean; v1.y -= py * 0.25 * lean;
        cam.position.copy(shotLook).add(v1).lerp(zcam, z);
        cam.lookAt(look.copy(shotLook).lerp(zc, z));
        cam.setViewOffset(vw, vh, -so * (1 - z) * vw, 0, vw, vh);
        rig.rotation.x = 0;
        worldTick(t, shotS, sf);
        if (split) {
          /* a bell over the first third of each leg, nothing at rest */
          var lf = shotS - si, amt = lf > 0.01 && lf < 0.4 ? Math.sin(lf / 0.4 * Math.PI) * 0.007 : 0;
          split.uniforms.amount.value = amt;
          split.enabled = amt > 0.0005;
        }
      } else {
      v1.set(camBase.x + px * 0.9 * lean, camBase.y - py * 0.5 * lean, camBase.z - px * 0.6 * lean).sub(target).multiplyScalar((1 + sp * 0.45 * lean) * (1 - H.dolly * 0.16));
      cam.position.copy(target).add(v1).lerp(zcam, z);
      look.copy(target); look.y -= H.dolly * 0.1;
      cam.lookAt(look.lerp(zc, z));
      rig.rotation.x = sp * 0.15 * lean;
      var f = 1 - sp;
      if (Math.abs(f - fade) > 0.004) { fade = f; canvas.style.opacity = f.toFixed(3); }
      }

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
        if (c.material) c.material.emissiveIntensity = 0.3 + glow * 1.1 + (c === hover ? 0.7 : 0);
      }
      /* one pulse runs through the wires in order */
      for (i = 0; i < wires.length; i++) {
        var wp = (t * 0.45 - i * 0.22) % 1; if (wp < 0) wp += 1;
        wires[i].material.emissiveIntensity = 0.9 + 3 * Math.max(0, Math.sin(wp * Math.PI * 2)) ** 3;
      }
      cyan.intensity = 6 + Math.sin(t * 2) * 2;
      lamp.intensity = (3 + Math.sin(t * 1.7) * 0.05 + Math.sin(t * 0.63) * 0.04) * (1.2 - mood * 0.5);
      key.intensity = 1.2 + mood * 0.35 + dayK * 1.6; hemi.intensity = 0.35 + mood * 0.15 + dayK * 1.1;
      bloom.strength = 0.2 - mood * 0.06;
      /* face-on, the white store page would bloom; ease it down a little */
      if (screens) screens.glow(Math.min(0.85, (1.08 - mood * 0.22) * (1 - z * 0.3)));

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
      if (ctaReq && dog.root) {
        var cr0 = canvas.getBoundingClientRect();
        dog.root.getWorldPosition(v2); v2.project(cam);
        ctaDir = (ctaReq.x || 0) < cr0.left + (v2.x + 1) / 2 * cr0.width ? -1 : 1;
        ctaReq = null;
        /* only if she is not already mid-hop; the pups queue up behind */
        if (t - ctaT > 1.2) {
          if (hopAt - t > 0.1) hopAt = t + 0.05;
          for (i = 0; i < pups.length; i++) if (pups[i].hopAt - t > 0.1) pups[i].hopAt = t + 0.25 + i * 0.18;
          ctaT = t;
        }
      }
      var ck = t - ctaT, cta = ck < 0 ? 0 : ck < 0.3 ? ease(ck / 0.3) : ck < 2 ? 1 : ease(1 - (ck - 2) / 0.6);
      crc = canvas.getBoundingClientRect();
      if (dog.body) {
        var hp = dogHop(t), br = Math.sin(t * 2.1) * 0.5 + 0.5, bs = dog.body.userData.s0;
        if (dog.idleAt === undefined) dog.idleAt = 4;
        var la = lookAt(dog.root), sh = headPose(dog, DOG, t, dt, hp, br, la[0], la[1], cta, ctaDir);
        dog.body.scale.set(bs.x * (1 + br * 0.014) * hp.sx * (1 + sh * 0.03), bs.y * (1 + br * 0.035) * hp.sy * (1 - sh * 0.04), bs.z);
        dog.body.rotation.z = dog.body.userData.r0.z + sh * 0.03;
        dog.body.position.y = dog.body.userData.p0.y + Math.sin(t * 1.05) * 0.003 + hp.h * 0.04 * (1 + 0.5 * cta);
        if (dog.shadow) {
          var ss = dog.shadow.userData.s0, sk = 1 - hp.h * 0.4;
          dog.shadow.scale.set(ss.x * sk, ss.y, ss.z * sk);
          dog.shadow.material.opacity = 1 - hp.h * 0.6;
        }
        pawPose(dog, t, hp, hopAt - t);
        if (dog.tail) {
          dogWag += dt * (hp.on || cta > 0.5 ? 17 : 7.5);
          dog.tail.rotation.z = dog.tail.userData.r0.z + Math.sin(dogWag) * (hp.on ? 0.2 : 0.15);
        }
      }
      if (dog.root && dog.root.parent) {
        /* camera position in the dog's parent frame (the rig tilts) */
        cam.getWorldPosition(dogW); dog.root.parent.worldToLocal(dogW);
        var cx = dogW.x - dog.root.position.x, cz = dogW.z - dog.root.position.z;
        var yaw = Math.atan2(cx, cz), base = dog.root.userData.r0.y;
        /* the card faces +Z in its own frame; follow half the offset, at
           most ~10deg, so it stays square-on and never turns visibly */
        var off = Math.atan2(Math.sin(yaw - base), Math.cos(yaw - base));
        /* total turn capped at ~18deg: the bulged card never shows its flat edge */
        dog.root.rotation.y = base + Math.max(-0.32, Math.min(0.32, Math.max(-0.18, Math.min(0.18, off * 0.5)) + ctaDir * 0.22 * cta));
      }
      /* the pups (photo cut-outs): breathing, the odd hop, paw pats and
         a tail wag, each on its own clock and temperament; the card
         yaw-follows the camera a little, like Dumpling */
      for (i = 0; i < pups.length; i++) {
        var P = pups[i], C = P.cfg, pt = t + P.ph;
        if (P.body) {
          var php = pupHop(P, t), pbr = Math.sin(pt * C.br) * 0.5 + 0.5, pbs = P.body.userData.s0;
          var pc0 = t - ctaT - 0.25 - i * 0.18, pck = pc0 < 0 ? 0 : pc0 < 0.3 ? ease(pc0 / 0.3) : pc0 < 1.8 ? 1 : ease(1 - (pc0 - 1.8) / 0.6);
          var pla = lookAt(P.root), psh = headPose(P, C, t, dt, php, pbr, pla[0], pla[1], pck, ctaDir);
          P.body.scale.set(pbs.x * (1 + pbr * 0.012) * php.sx * (1 + psh * 0.03), pbs.y * (1 + pbr * 0.03) * php.sy * (1 - psh * 0.04), pbs.z);
          /* Tofu's wiggle: the whole body sways fast while the tail goes wild */
          var wig = C.sig === 'wiggle' ? (P.sig || 0) : 0;
          P.body.rotation.z = P.body.userData.r0.z + psh * 0.03 + wig * Math.sin(P.sigT * 15) * 0.045;
          P.body.position.y = P.body.userData.p0.y + php.h * C.jump * (1 + 0.5 * cta);
          if (P.shadow) {
            var pss = P.shadow.userData.s0, psk = 1 - php.h * 0.4;
            P.shadow.scale.set(pss.x * psk, pss.y, pss.z * psk);
            P.shadow.material.opacity = 1 - php.h * 0.6;
          }
          pawPose(P, pt, php, P.hopAt - t, C.pat);
          if (P.tail) {
            var gd = C.sig === 'guard' ? (P.sig || 0) : 0;             /* on guard the tail slows and stays up */
            P.wag += dt * (php.on ? C.wag * 1.8 : C.wag) * (0.75 + 0.25 * Math.sin(pt * 0.31)) * (1 + wig * 1.6) * (1 - gd * 0.7);
            P.tail.rotation.z = P.tail.userData.r0.z + Math.sin(P.wag) * C.amp * (php.on ? 1.4 : 1) * (1 + wig * 0.7);
          }
        }
        if (P.root.parent) {
          cam.getWorldPosition(dogW); P.root.parent.worldToLocal(dogW);
          var pyaw = Math.atan2(dogW.x - P.root.position.x, dogW.z - P.root.position.z), pb0 = P.root.userData.r0.y;
          var poff = Math.atan2(Math.sin(pyaw - pb0), Math.cos(pyaw - pb0));
          var pc = t - ctaT - 0.25 - i * 0.18, pk = pc < 0 ? 0 : pc < 0.3 ? ease(pc / 0.3) : pc < 1.8 ? 1 : ease(1 - (pc - 1.8) / 0.6);
          P.root.rotation.y = pb0 + Math.max(-0.32, Math.min(0.32, Math.max(-0.18, Math.min(0.18, poff * 0.5)) + ctaDir * 0.2 * pk));
        }
      }
      if (cal) cal(t);
      if (weigh) weigh(t);
      if (steam) steam(t);
      /* screen canvases re-upload as textures: 30 fps at rest, 12 fps
         while the page scrolls (nobody reads them then) */
      if (screens && t - lastDraw > (Math.abs(sy / (innerHeight * 0.7) - sp) > 0.01 ? 1 / 12 : 1 / 30)) { screens(t); lastDraw = t; }
      if (motes) { motes.rotation.y = t * 0.03; motes.position.y = Math.sin(t * 0.4) * 0.05; }

      for (i = 0; i < H.ticks.length; i++) H.ticks[i](t, dt);
      if (bloomOn) composer.render(); else renderer.render(world, cam);
      loop();
    }
  }

  /* the dog photo cards (3d/build_scene.py card()): baked ground AO in
     COLOR_0 darkens the feet (lit and self-glow parts alike), and a rim
     light picks up the bulged edge - cyan from above/left like the key
     and the cyan point, warm on the side toward the warm point */
  function cardFx(m) {
    m.vertexColors = true;
    m.onBeforeCompile = function (sh) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
        'float rimF = 1.0 - clamp(abs(dot(normal, geometryViewDir)), 0.0, 1.0);\n' +
        'rimF = rimF * rimF;\n' +
        'vec3 rimC = mix(vec3(0.3, 0.82, 1.0), vec3(1.0, 0.64, 0.32), smoothstep(-0.2, 0.5, normal.x - 0.5 * normal.y));\n' +
        'outgoingLight -= totalEmissiveRadiance * (1.0 - vColor.r);\n' +
        'outgoingLight += rimC * rimF * (0.3 + 0.7 * diffuseColor.rgb) * 0.9;\n' +
        '#include <opaque_fragment>\n' +
        /* the canvas is premultiplied: a cut edge's partial alpha (alpha
           test / alpha-to-coverage) with straight colour read as a bright
           dotted line along every layer seam and a light fringe */
        'gl_FragColor.rgb *= gl_FragColor.a;');
    };
    m.customProgramCacheKey = function () { return 'dogcard1'; };
  }

  function ease(x) { return x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x); }
  /* canvas text uses the page's own face (falls back until it has loaded) */
  var FONT = '"Plus Jakarta Sans",system-ui,sans-serif';

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
    /* s: backing-store scale. Drawing stays in w x h units; the canvas
       is s times denser so labels stay sharp at DPR 1.5-2 (2026-10-07) */
    function slot(name, w, h, s) {
      var mesh = root.getObjectByName(name);
      if (!mesh || !mesh.material) return null;
      s = s || 1;
      var c = document.createElement('canvas'); c.width = w * s; c.height = h * s;
      var tex = new THREE.CanvasTexture(c);
      tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      var m = mesh.material = mesh.material.clone();
      m.map = tex; if (m.emissiveMap) m.emissiveMap = tex;
      m.userData.e0 = m.emissiveIntensity; mats.push(m);
      var g = c.getContext('2d'); g.scale(s, s);
      return { g: g, w: w, h: h, s: s, tex: tex };
    }
    var mats = [];
    var L = slot('laptop_screen', 640, 400, 1.6), T = slot('tablet_screen', 300, 410, 1.25),
        C = slot('holo_chart', 480, 300, 2), K = slot('laptop_keys', 512, 256), G = slot('holo_gauge', 256, 256, 1.5),
        D = slot('holo_code', 360, 240, 2);
    /* gaming laptop: the key texture is also the keys' glow (RGB backlight) */
    if (K) {
      var km = root.getObjectByName('laptop_keys').material;
      if (km.emissive) { km.emissive.setHex(0xffffff); km.emissiveMap = K.tex; km.emissiveIntensity = km.userData.e0 = 1.1; km.needsUpdate = true; }
    }
    function rr(g, x, y, w, h, r, fill) { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }

    /* the laptop shows a demo storefront drawn here ("Brightline
       Goods", invented: no client name, logo or product, because the
       laptop links to the anonymous inventory case study). 640 x 1156
       page units at 1.6x density; the product row (y 591-804, cards
       146 apart from x 31) is where the sale below plays. */
    var PS = 1.6, PH = 1156, page = document.createElement('canvas');
    page.width = 640 * PS; page.height = PH * PS;
    (function (g) {
      g.scale(PS, PS);
      var INK = '#16202e', MUTE = '#6b7686', ACC = '#0e8f7e', WARM = '#f2ece3';
      function t(txt, x, y, font, col, al) { g.font = font + ' ' + FONT; g.fillStyle = col; g.textAlign = al || 'left'; g.fillText(txt, x, y); }
      g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, 640, PH);
      /* announcement bar + header */
      g.fillStyle = INK; g.fillRect(0, 0, 640, 18); t('Free shipping on orders over $50', 320, 13, '600 9px', '#e8eef5', 'center');
      g.fillStyle = '#fff'; g.fillRect(0, 18, 640, 49); g.fillStyle = '#e7e3dc'; g.fillRect(0, 66, 640, 1);
      g.fillStyle = ACC; g.beginPath(); g.arc(44, 42, 9, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(44, 42, 4, 0, 7); g.fill();
      t('Brightline', 60, 47, '800 15px', INK);
      ['Shop', 'New in', 'Home', 'Outdoor', 'Sale'].forEach(function (n, i) { t(n, 250 + i * 50, 46, '600 10px', i === 4 ? '#c2410c' : INK); });
      g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.arc(560, 41, 6, 0, 7); g.moveTo(565, 46); g.lineTo(569, 50); g.stroke();
      g.beginPath(); g.moveTo(592, 35); g.lineTo(596, 35); g.lineTo(600, 48); g.lineTo(612, 48); g.lineTo(615, 38); g.lineTo(598, 38); g.stroke();
      g.fillStyle = INK; g.beginPath(); g.arc(602, 52, 1.6, 0, 7); g.arc(610, 52, 1.6, 0, 7); g.fill();
      /* hero banner */
      var hg = g.createLinearGradient(0, 80, 640, 300); hg.addColorStop(0, '#103b47'); hg.addColorStop(1, '#0e8f7e');
      g.fillStyle = hg; g.beginPath(); g.roundRect(24, 80, 592, 230, 14); g.fill();
      g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(520, 190, 120, 0, 7); g.fill();
      g.fillStyle = '#f4b860'; g.beginPath(); g.arc(505, 185, 62, 0, 7); g.fill();
      g.fillStyle = '#fff6e8'; g.beginPath(); g.roundRect(470, 160, 70, 52, 8); g.fill();
      g.fillStyle = '#f4b860'; g.fillRect(470, 176, 70, 6);
      t('NEW SEASON', 56, 130, '700 10px', '#9fe7da'); t('Everyday goods,', 56, 168, '800 30px', '#fff'); t('built to last.', 56, 204, '800 30px', '#fff');
      t('Free returns. Ships in 24 hours.', 56, 232, '500 12px', '#cfe9e4');
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(56, 252, 110, 32, 16); g.fill(); t('Shop new in', 111, 272, '700 11px', INK, 'center');
      /* trust row */
      ['Free shipping $50+', 'Easy 30-day returns', 'Ships in 24 h'].forEach(function (n, i) {
        var x = 24 + i * 200; g.fillStyle = '#fff'; g.strokeStyle = '#e7e3dc'; g.lineWidth = 1; g.beginPath(); g.roundRect(x, 330, 192, 44, 8); g.fill(); g.stroke();
        g.fillStyle = ACC; g.beginPath(); g.arc(x + 22, 352, 8, 0, 7); g.fill(); t(n, x + 38, 356, '600 11px', INK);
      });
      /* category tiles */
      [['Kitchen', '#f3dfc8'], ['Bags', '#d9e6f2'], ['Lighting', '#efe3f3'], ['Outdoor', '#dcefe0']].forEach(function (c, i) {
        var x = 31 + i * 146; g.fillStyle = c[1]; g.beginPath(); g.roundRect(x, 396, 140, 120, 10); g.fill(); t(c[0], x + 12, 502, '700 12px', INK);
      });
      t('Best sellers', 31, 568, '800 18px', INK); t('View all →', 609, 568, '600 10px', ACC, 'right');
      /* product art: simple drawn objects, no brands */
      function art(k, x, y) {
        g.save(); g.translate(x + 70, y + 64);
        if (k === 0) { g.fillStyle = '#e9e4dc'; g.beginPath(); g.roundRect(-26, -24, 44, 52, 6); g.fill(); g.strokeStyle = '#e9e4dc'; g.lineWidth = 7; g.beginPath(); g.arc(20, 2, 12, -1.2, 1.2); g.stroke(); g.fillStyle = ACC; g.fillRect(-26, -6, 44, 8); }
        else if (k === 1) { g.fillStyle = '#2f5d7c'; g.beginPath(); g.roundRect(-30, -26, 60, 62, 14); g.fill(); g.fillStyle = '#244a63'; g.beginPath(); g.roundRect(-20, 6, 40, 22, 6); g.fill(); g.strokeStyle = '#244a63'; g.lineWidth = 5; g.beginPath(); g.arc(0, -26, 14, Math.PI, 0); g.stroke(); }
        else if (k === 2) { g.fillStyle = '#c9a26b'; g.fillRect(-3, -6, 6, 40); g.fillRect(-20, 32, 40, 6); g.fillStyle = '#f4b860'; g.beginPath(); g.moveTo(-26, -6); g.lineTo(26, -6); g.lineTo(14, -34); g.lineTo(-14, -34); g.closePath(); g.fill(); }
        else { g.fillStyle = '#d8573a'; g.beginPath(); g.moveTo(-38, 18); g.lineTo(-30, -6); g.quadraticCurveTo(-6, -14, 4, 0); g.lineTo(38, 8); g.quadraticCurveTo(40, 22, 30, 24); g.lineTo(-36, 24); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(-38, 20, 76, 5); }
        g.restore();
      }
      [['Stoneware mug', '$24.00', '#f6efe6'], ['Daypack 20L', '$68.00', '#e8eff5'], ['Brass desk lamp', '$89.00', '#f5efe2'], ['Trail runner', '$112.00', '#f6e9e4']].forEach(function (p, i) {
        var x = 31 + i * 146, y = 591;
        g.fillStyle = '#fff'; g.strokeStyle = '#e7e3dc'; g.lineWidth = 1; g.beginPath(); g.roundRect(x, y, 140, 213, 10); g.fill(); g.stroke();
        g.fillStyle = p[2]; g.beginPath(); g.roundRect(x + 6, y + 6, 128, 120, 8); g.fill(); art(i, x, y);
        t(p[0], x + 10, y + 146, '700 11px', INK); t(p[1], x + 10, y + 164, '600 11px', MUTE);
        g.fillStyle = '#f4b860'; for (var k = 0; k < 5; k++) { g.beginPath(); g.arc(x + 14 + k * 9, y + 194, 3, 0, 7); g.fill(); }
      });
      /* newsletter + footer */
      g.fillStyle = WARM; g.beginPath(); g.roundRect(24, 836, 592, 120, 12); g.fill();
      t('Get 10% off your first order', 48, 882, '800 18px', INK); t('One email a week. No spam.', 48, 904, '500 11px', MUTE);
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(360, 866, 160, 34, 17); g.fill(); g.fillStyle = INK; g.beginPath(); g.roundRect(526, 866, 70, 34, 17); g.fill(); t('Join', 561, 887, '700 11px', '#fff', 'center');
      g.fillStyle = INK; g.fillRect(0, 990, 640, PH - 990);
      ['Shop', 'Help', 'About', 'Contact'].forEach(function (n, i) { t(n, 40 + i * 120, 1030, '700 11px', '#e8eef5'); t('Link · Link · Link', 40 + i * 120, 1052, '500 9px', '#8a96a8'); });
      g.textAlign = 'left';
    })(page.getContext('2d'));
    function pageWin(g, sc, h, dy) { g.drawImage(page, 0, sc * PS, 640 * PS, h * PS, 0, dy || 0, 640, h); }

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
        /* RGB wave across the keys, the pressed key flashes white */
        var g = K.g; g.fillStyle = '#05070b'; g.fillRect(0, 0, 512, 256);
        for (var r = 0; r < 4; r++) for (var k = 0; k < 13; k++) {
          var hot = press && r === 3 && k === 11;
          rr(g, 14 + k * 38, 14 + r * 40, 32, 32, 5, hot ? '#ffffff' : 'hsl(' + ((k * 22 + r * 14 - t * 70) % 360 + 360) % 360 + ',95%,52%)');
          rr(g, 18 + k * 38, 18 + r * 40, 24, 24, 4, '#0b0f17');
        }
        rr(g, 180, 180, 150, 64, 8, '#0b0f17');
        K.tex.needsUpdate = true;
      }
      if (L && photo) {
        if (!photoDrawn) { L.g.fillStyle = '#fff'; L.g.fillRect(0, 0, 640, 400); L.g.drawImage(photo, 0, 0, 640, 400); L.tex.needsUpdate = true; photoDrawn = true; }
      }
      else if (L && sale0 >= 0) { sale(L.g, t - sale0); L.tex.needsUpdate = true; }
      else if (L) {
        var sc = ease((lt - 0.5) / 2.6) * 700 - ease((lt - 5) / 1.8) * 700;
        pageWin(L.g, sc, 400);
        /* scrollbar */
        rr(L.g, 630, 6 + sc / PH * 388, 5, 130, 3, 'rgba(20,32,50,.35)');
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
      /* draw.chart (40-desk-extras.js) turns the chart into the monitor's dashboard */
      if (C && draw.chart) { draw.chart(C.g, t, C.w, C.h); C.tex.needsUpdate = true; }
      else if (C) {
        var g3 = C.g, ct = t % 5, pr = ease(ct / 3);
        g3.setTransform(C.s * 1.5, 0, 0, C.s * 1.5, 0, 0);
        if (ct < 0.04) vals = vals.map(function (v, i) { return Math.max(18, Math.min(90, 20 + i * 8 + (Math.random() * 24 - 12))); });
        g3.fillStyle = '#081426'; g3.fillRect(0, 0, 320, 200);
        g3.strokeStyle = '#00d4ff'; g3.lineWidth = 3; g3.beginPath(); g3.roundRect(3, 3, 314, 194, 12); g3.stroke();
        rr(g3, 20, 18, 90, 10, 4, '#78c8f0');
        g3.fillStyle = '#fff'; g3.font = '700 26px ' + FONT;
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
        g4.fillStyle = '#fff'; g4.font = '700 30px ' + FONT; g4.textAlign = 'center';
        g4.fillText((99.9 * gp).toFixed(1) + '%', 128, 128);
        g4.fillStyle = '#78c8f0'; g4.font = '600 16px ' + FONT; g4.fillText('UPTIME', 128, 226);
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
    var sale0 = -1, photo = null, photoDrawn = false;
    function arrow(g, x, y, down) {
      g.save(); g.translate(x, y); if (down) g.scale(0.88, 0.88);
      g.fillStyle = '#fff'; g.strokeStyle = '#142032'; g.lineWidth = 2.5; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 26); g.lineTo(7, 20); g.lineTo(12, 31); g.lineTo(17, 29); g.lineTo(12, 18); g.lineTo(21, 18); g.closePath();
      g.fill(); g.stroke(); g.restore();
    }
    function sale(g, s) {
      s = Math.min(s, 9);
      var sc = ease((s - 0.4) / 1.2) * 520, cx = 177, cy = 591 - sc;
      pageWin(g, sc, 400);
      /* the store's own header stays put (sticky), cart badge on its cart icon */
      pageWin(g, 0, 67);
      if (s > 3.3) {
        var bp = Math.min(1, (s - 3.3) / 0.25), bs = 7 * (bp < 1 ? 0.6 + bp * 0.7 : 1);
        g.fillStyle = '#e8572a'; g.beginPath(); g.arc(616, 33, bs, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.font = '700 10px ' + FONT; g.textAlign = 'center'; g.fillText('1', 616, 37); g.textAlign = 'left';
      }
      /* the product lights up once the cursor reaches it */
      if (s > 1.9) {
        var hl = Math.min(1, (s - 1.9) / 0.3);
        g.strokeStyle = 'rgba(14,143,126,' + hl + ')'; g.lineWidth = 4;
        g.beginPath(); g.roundRect(cx - 2, cy - 2, 144, 218, 8); g.stroke();
      }
      /* "Add to cart": appears, gets pressed at 2.9s, turns into "Added" */
      if (s > 2.0) {
        var pr = s > 2.9 && s < 3.15, done = s >= 3.15, bx = cx + 8, by = cy + 176;
        g.fillStyle = '#fff'; g.fillRect(cx + 4, cy + 168, 132, 44);
        g.fillStyle = done ? '#14aa78' : pr ? '#000' : '#111';
        g.beginPath(); g.roundRect(bx + (pr ? 3 : 0), by + (pr ? 2 : 0), 124 - (pr ? 6 : 0), 30 - (pr ? 4 : 0), 8); g.fill();
        g.fillStyle = '#fff'; g.font = '700 15px ' + FONT; g.textAlign = 'center';
        g.fillText(done ? 'Added ✓' : 'Add to cart', bx + 62, by + 20); g.textAlign = 'left';
      }
      /* cursor: in from the right, to the product, down to the button */
      if (s > 1.0 && s < 4.2) {
        var m1 = ease((s - 1.0) / 0.9), m2 = ease((s - 2.3) / 0.55);
        var ax = 520 + (cx + 90 - 520) * m1 + (cx + 70 - (cx + 90)) * m2, ay = 330 + (cy + 90 - 330) * m1 + (cy + 190 - (cy + 90)) * m2;
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
          g.fillStyle = '#5a6a80'; g.font = '600 20px ' + FONT; g.textAlign = 'center'; g.fillText('Processing payment', 320, 248 + up);
        } else {
          var ck = Math.min(1, (s - 5.4) / 0.3);
          g.fillStyle = '#14aa78'; g.beginPath(); g.arc(320, 165 + up, 34 * (0.7 + 0.3 * ck), 0, 7); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 8; g.lineCap = 'round'; g.lineJoin = 'round';
          g.beginPath(); g.moveTo(304, 166); g.lineTo(315, 178); g.lineTo(337, 152); g.stroke();
          g.fillStyle = '#142032'; g.font = '800 32px ' + FONT; g.textAlign = 'center'; g.fillText('Paid ✓', 320, 240);
          g.fillStyle = '#5a6a80'; g.font = '600 17px ' + FONT; g.fillText('Order #1043 · $68.00', 320, 272);
        }
        g.textAlign = 'left'; g.lineCap = 'butt'; g.globalAlpha = 1;
      }
    }
    draw.sale = function (t0) { sale0 = t0; };
    draw.photo = function (img) { photo = img; photoDrawn = false; };
    draw.glow = function (k) { for (var i = 0; i < mats.length; i++) mats[i].emissiveIntensity = mats[i].userData.e0 * k; };
    return draw;
  }

  function whenIdle() { ('requestIdleCallback' in window) ? requestIdleCallback(boot, { timeout: 2500 }) : setTimeout(boot, 1200); }
  function arm() {
    if (booted || !ok.matches) return;
    booted = true; pend(); preconnect(); whenIdle();
  }
  /* Not the load event: a slow third-party beacon (the analytics pixel)
     can hold 'load' back for a minute, which kept the 3D waiting. */
  if (ok.matches) {
    pend(); preconnect();
    if (document.readyState === 'complete') arm();
    else addEventListener('DOMContentLoaded', function () { setTimeout(arm, 1500); });
  }
})();
