/* ═══════════════════════════════════════
   LIVE WALLPAPER (desktop only, 2026-10-01)
   One fixed, full-viewport WebGL canvas behind the whole page, rendered
   at ~0.6 DPR and capped at 30fps. It replaces the CSS backdrops on
   desktops (html.has-wallpaper switches them off in 58-live-wallpaper.css)
   and keeps them as the fallback everywhere else.

   Hero:      light streaks riding a slow dot-mesh wave low on the right,
              soft bokeh (big blurred near, small sharp far) and faint 0/1
              columns at the outer edges. Under the copy column all of it
              drops to 12%, and the copy's own shade (56-hero-motion) sits
              on top of that.
   Sections:  a perspective circuit plane flying toward the viewer plus a
              faint hex lattice and ring-shaped plexus, all in the side
              gutters only. Under the 1200px content column it shows the
              same still, dim grid as before.

   Hero and section looks are masked by where the hero's bottom edge is on
   screen, so scrolling cross-fades between them with no mode switch.

   Phones, tablets and touch laptops never run any of this (same gate as
   the hero 3D); neither does reduced motion, which keeps the CSS layers.
   Per frame: no allocation, no layout reads (hero metrics are cached on
   resize), stopped while the tab is hidden. No WebGL, or a lost context:
   the canvas is removed and the CSS layers come back.
═══════════════════════════════════════ */
(function () {
  var gate = matchMedia('(min-width:1024px) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  if (!gate.matches) return;
  var hero = document.querySelector('.hero'), copy = document.querySelector('.hero-copy');
  if (!hero || !copy) return;
  var root = document.documentElement;

  /* shared GLSL: hash, hero mask, and the wave surface (dots and streaks
     both ride it, so they always line up) */
  var COMMON = [
    'precision highp float;',
    'uniform vec2 uRes;uniform float uS,uT,uHeroB,uHeroH,uCopyL,uCopyR,uLight,uScroll;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    /* 1 on the right and bottom of the hero, 12% under the copy column */
    'float heroMask(vec2 p){return (1.0-smoothstep(uHeroB-70.0,uHeroB+10.0,p.y))*mix(0.12,1.0,smoothstep(uCopyR-20.0,uCopyR+260.0,p.x));}',
    /* z: 0 near (bottom) .. 1 far. Rows bunch up with depth and the whole
       surface tilts up toward the right, behind the desk. */
    'float waveY(float x,float z){',
    '  float span=uHeroH*0.22;',
    '  float yb=uHeroB-62.0-span*(1.0-pow(1.0-z,1.8))-(x/uRes.x)*uHeroH*0.10;',
    '  float amp=30.0*(1.0-0.6*z);',
    '  return yb+amp*(0.6*sin(x*0.0065+uT*0.35+z*5.0)+0.4*sin(x*0.0023-uT*0.21+z*2.3));}'
  ].join('\n');

  var VS_QUAD = 'attribute vec2 aQ;void main(){gl_Position=vec4(aQ,0.0,1.0);}';

  var FS_BG = '#extension GL_OES_standard_derivatives : enable\n' + COMMON + [
    '',
    'const vec3 CY=vec3(0.0,0.83,1.0);const vec3 OR=vec3(1.0,0.55,0.16);',
    /* 0/1 glyphs in drifting columns, ex = distance from the screen edge */
    'float binary(vec2 p,float ex,float side,float lim){',
    '  if(ex>lim)return 0.0;',
    '  float cw=15.0,ch=20.0,ci=floor(ex/cw);',
    '  float sp=9.0+20.0*hash(vec2(ci,side));',
    '  float yy=p.y-(uHeroB-uHeroH)+uT*sp;',
    '  float ri=floor(yy/ch);',
    '  float h=hash(vec2(ci*7.0+side*31.0,ri));',
    '  float bit=step(0.5,fract(h*13.7+floor(uT*0.4+h*4.0)*0.37));',
    '  vec2 q=(vec2(fract(ex/cw),fract(yy/ch))-0.5)*vec2(cw,ch);',
    '  float g=bit>0.5?1.0-smoothstep(0.4,1.3,max(abs(q.x)-0.7,abs(q.y)-5.5))',
    '                 :1.0-smoothstep(0.08,0.24,abs(length(q/vec2(3.4,5.8))-1.0));',
    '  float trail=pow(fract(-yy/(ch*11.0)+hash(vec2(ci,side+5.0))),2.2);',
    '  return g*step(0.3,h)*trail*pow(1.0-ex/lim,1.3)*0.32;}',
    'float hexEdge(vec2 p){',
    '  vec2 r=vec2(1.0,1.7320508),h=r*0.5;',
    '  vec2 a=mod(p,r)-h,b=mod(p-h,r)-h;',
    '  vec2 g=dot(a,a)<dot(b,b)?a:b;vec2 q=abs(g);',
    '  return 0.5-max(dot(q,vec2(0.5,0.8660254)),q.x);}',
    'void main(){',
    '  vec2 p=vec2(gl_FragCoord.x,uRes.y*uS-gl_FragCoord.y)/uS;',
    '  float W=uRes.x,H=uRes.y;',
    '  vec3 acc=vec3(0.0);float al=0.0;',
    /* ── hero ── */
    '  if(uHeroB>0.0&&p.y<uHeroB+20.0){',
    '    float hm=heroMask(p);',
    '    float top=uHeroB-uHeroH;',
    '    if(p.y>top+uHeroH*0.25){',
    '      for(int i=0;i<7;i++){',
    '        float fi=float(i),z=0.05+fi*0.12;',
    '        float y0=waveY(p.x,z)-10.0-fi*3.0;',
    '        float dy=(waveY(p.x+2.0,z)-waveY(p.x-2.0,z))*0.25;',
    '        float d=abs(p.y-y0)/sqrt(1.0+dy*dy);',
    '        float w=1.3*(1.0-0.45*z);',
    '        float pulse=0.3+0.7*pow(0.5+0.5*sin(p.x*0.0042-uT*(0.5+0.07*fi)+fi*1.7),3.0);',
    '        float s=(exp(-d*d/(w*w))*0.7+exp(-d/9.0)*0.12)*pulse*(1.0-0.5*z);',
    '        vec3 c=(i==2||i==5)?OR:CY;',
    '        acc+=c*s;al+=s;}',
    /* a faint haze under the wave so the dots sit in light */
    '      float hz=exp(-pow((p.y-waveY(p.x,0.25))/130.0,2.0))*0.05;',
    '      acc+=CY*hz;al+=hz;',
    '      acc*=hm;al*=hm;}',
    '    float b=binary(p,p.x,0.0,max(24.0,uCopyL-10.0))+binary(p,W-p.x,1.0,92.0);',
    '    b*=1.0-smoothstep(uHeroB-160.0,uHeroB,p.y);',
    '    acc+=CY*b;al+=b;}',
    /* ── sections ── */
    '  if(uHeroB<H){',
    '    float sw=smoothstep(uHeroB-40.0,uHeroB+180.0,p.y);',
    '    float gut=smoothstep(540.0,640.0,abs(p.x-W*0.5));',
    '    float tint=mix(1.0,0.38,uLight);',
    /* still, dim grid under the content column (as the CSS layer was) */
    '    vec2 c64=p/64.0;vec2 f64=abs(fract(c64-0.5)-0.5)*64.0;',
    '    float fl=(1.0-smoothstep(0.0,1.0,min(f64.x,f64.y)))*0.012;',
    '    float tr=0.0;',
    '    if(f64.y<1.2&&hash(vec2(floor(c64.x),floor(c64.y+0.5)))<0.18)tr=1.0-smoothstep(0.3,1.2,f64.y);',
    '    if(f64.x<1.2&&hash(vec2(floor(c64.x+0.5)+17.0,floor(c64.y)))<0.18)tr=max(tr,1.0-smoothstep(0.3,1.2,f64.x));',
    '    fl+=tr*0.09;',
    '    float g=0.0;',
    '    if(gut>0.0){',
    /* circuit plane: floor below a horizon at 42%, a fainter ceiling above */
    '      float hy=H*0.42,dy=p.y-hy,ady=max(abs(dy),1.0),cl=step(dy,0.0);',
    '      float d=H*0.58/ady;',
    '      vec2 gv=vec2((p.x-W*0.5)*d/H,d+uT*0.045+uScroll/H*0.18)*4.0;',
    '      vec2 fw=fwidth(gv)+1e-4;',
    '      vec2 fr=abs(fract(gv-0.5)-0.5);vec2 gg=fr/fw;',
    '      float ln=1.0-min(min(gg.x,gg.y),1.0);',
    '      float t2=0.0;',
    '      if(hash(vec2(floor(gv.x),floor(gv.y+0.5))+cl*91.0)<0.2)t2=1.0-min(gg.y/1.6,1.0);',
    '      if(hash(vec2(floor(gv.x+0.5)+17.0,floor(gv.y))+cl*91.0)<0.2)t2=max(t2,1.0-min(gg.x/1.6,1.0));',
    '      vec2 nd=floor(gv+0.5);',
    '      float via=hash(nd+41.0+cl*7.0)<0.07?1.0-smoothstep(1.5,3.2,length(fr/fw)):0.0;',
    '      float sh=0.75+0.25*sin(uT*0.9+hash(nd)*40.0);',
    '      float fog=exp(-d*0.55)*smoothstep(0.0,50.0,ady)*mix(1.0,0.45,cl);',
    '      g=(ln*0.12+t2*0.34*sh+via*0.55)*fog;',
    /* hex lattice, in slow patches */
    '      float hx=hexEdge((p+vec2(0.0,uT*4.0))/52.0)*52.0;',
    '      float pch=0.5+0.5*sin(p.x*0.004+uT*0.1)*sin(p.y*0.005-uT*0.07);',
    '      g+=(1.0-smoothstep(0.0,1.2,hx))*0.065*pch*(1.0-uLight);}',
    '    float a=mix(fl,g,gut)*sw*tint;',
    '    vec3 c=mix(CY,vec3(0.04,0.39,0.72),uLight);',
    '    acc+=c*a;al+=a;}',
    '  al=min(al,0.9);',
    '  gl_FragColor=vec4(min(acc,vec3(al)),al);}'
  ].join('\n');

  /* points + lines: wave dots (k0), bokeh (k1), plexus nodes/links (k2) */
  var VS_PTS = COMMON + [
    '',
    'attribute vec4 aP;attribute float aK;',
    'varying vec4 vC;varying float vSoft;',
    'void main(){',
    '  float W=uRes.x,H=uRes.y;vec2 p;float size,a;vec3 col=vec3(0.0,0.83,1.0);vSoft=0.35;',
    '  if(aK<0.5){',
    '    float z=aP.y,vpx=0.72*W;',
    '    float x=vpx+(mix(-0.08,1.08,aP.x)*W-vpx)*(1.0-0.5*z);',
    '    p=vec2(x,waveY(x,z));',
    '    float crest=0.6+0.4*sin(x*0.0065+uT*0.35+z*5.0);',
    '    size=mix(3.0,1.4,z);a=0.6*(1.0-0.55*z)*crest*heroMask(p);',
    '    if(aP.z>0.93)col=vec3(1.0,0.55,0.16);',
    '  }else if(aK<1.5){',
    '    float k=aP.z,ph=aP.w*6.2831;',
    '    float top=uHeroB-uHeroH;',
    '    float y=top+mod(aP.y*uHeroH-uT*(4.0+10.0*k),uHeroH);',
    '    p=vec2(aP.x*W+sin(uT*0.13+ph)*30.0,y+sin(uT*0.17+ph)*12.0);',
    '    if(k>0.72){size=mix(26.0,64.0,(k-0.72)/0.28);a=0.075;vSoft=0.0;}',
    '    else{size=mix(1.6,3.6,k/0.72);a=mix(0.2,0.42,k/0.72);vSoft=0.45;}',
    '    a*=heroMask(p)*(0.6+0.4*sin(uT*0.5+ph));',
    '    if(aP.w>0.8)col=vec3(1.0,0.55,0.16);',
    '  }else{',
    /* ring id, angle, radius fraction, phase */
    '    float id=aP.x,left=step(id,1.5),lower=mod(id,2.0);',
    '    float cxL=(W*0.5-600.0)*0.5-30.0;',
    '    vec2 c=vec2(left>0.5?cxL:W-cxL,H*(lower>0.5?0.74:0.30));',
    '    float R=mix(165.0,205.0,lower)*aP.z+sin(uT*0.3+aP.w*6.2831)*9.0;',
    '    float ang=aP.y+uT*0.025*(left>0.5?1.0:-1.0)*(lower>0.5?-1.0:1.0);',
    '    p=c+vec2(cos(ang),sin(ang))*R;',
    '    float gut=smoothstep(560.0,660.0,abs(p.x-W*0.5));',
    '    size=3.0;a=gut*smoothstep(uHeroB-40.0,uHeroB+200.0,p.y)*mix(0.27,0.14,uLight);',
    '    if(uLight>0.5)col=vec3(0.04,0.39,0.72);',
    '    vSoft=0.2;}',
    '  vC=vec4(col*a,a);',
    '  gl_Position=vec4(p.x/W*2.0-1.0,1.0-p.y/H*2.0,0.0,1.0);',
    '  gl_PointSize=size*uS;}'
  ].join('\n');

  var FS_PTS = 'precision mediump float;varying vec4 vC;varying float vSoft;uniform float uLines;' +
    'void main(){if(uLines>0.5){gl_FragColor=vC*0.55;return;}' +
    'float r=length(gl_PointCoord*2.0-1.0);float m=1.0-smoothstep(vSoft,1.0,r);' +
    'if(vSoft<0.01)m=exp(-r*r*3.2)*(1.0-smoothstep(0.85,1.0,r));gl_FragColor=vC*m;}';

  function boot() {
    if (!gate.matches) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'live-wallpaper';
    canvas.setAttribute('aria-hidden', 'true');
    var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl || !gl.getExtension('OES_standard_derivatives')) return;

    function prog(vs, fs) {
      var p = gl.createProgram();
      [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(function (s) {
        var sh = gl.createShader(s[0]); gl.shaderSource(sh, s[1]); gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
        gl.attachShader(p, sh);
      });
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      return p;
    }
    var bg, pts;
    try { bg = prog(VS_QUAD, FS_BG); pts = prog(VS_PTS, FS_PTS); } catch (e) { return; }

    /* ── static geometry, built once ── */
    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var v = [];
    function add(a, b, c, d, k) { v.push(a, b, c, d, k); }
    var COLS = 110, ROWS = 24, x, y, i, r;
    for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) add(x / (COLS - 1), y / (ROWS - 1), rnd(), 0, 0);
    var nHero = COLS * ROWS;
    /* bokeh, weighted to the right two-thirds */
    for (i = 0; i < 46; i++) { add(0.3 + 0.72 * Math.sqrt(rnd()), rnd(), rnd(), rnd(), 1); nHero++; }
    /* plexus: 4 rings, each an outer loop of 16 and an inner loop of 10 */
    var rings = [], OUT = 16, IN = 10;
    for (r = 0; r < 4; r++) {
      var ring = [];
      for (i = 0; i < OUT; i++) ring.push([r, (i + rnd() * 0.5) / OUT * 6.2832, 0.9 + rnd() * 0.22, rnd()]);
      for (i = 0; i < IN; i++) ring.push([r, (i + rnd() * 0.5) / IN * 6.2832, 0.55 + rnd() * 0.15, rnd()]);
      rings.push(ring);
    }
    var nNodes = 0, lines = [];
    function link(a, b) { lines.push(a[0], a[1], a[2], a[3], 2, b[0], b[1], b[2], b[3], 2); }
    rings.forEach(function (ring) {
      ring.forEach(function (n) { add(n[0], n[1], n[2], n[3], 2); nNodes++; });
      for (i = 0; i < OUT; i++) { link(ring[i], ring[(i + 1) % OUT]); if (i % 3 === 0) link(ring[i], ring[(i + 2) % OUT]); }
      for (i = 0; i < IN; i++) {
        link(ring[OUT + i], ring[OUT + (i + 1) % IN]);
        link(ring[OUT + i], ring[Math.round(i * OUT / IN) % OUT]);
      }
    });
    var ptBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
    var lnBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lnBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
    var nLineVerts = lines.length / 5;

    var NAMES = ['uRes', 'uS', 'uT', 'uHeroB', 'uHeroH', 'uCopyL', 'uCopyR', 'uLight', 'uScroll'];
    function locs(p) { var o = {}; NAMES.concat(['uLines']).forEach(function (n) { o[n] = gl.getUniformLocation(p, n); }); return o; }
    var U = { bg: locs(bg), pts: locs(pts) };
    var aQ = gl.getAttribLocation(bg, 'aQ'), aP = gl.getAttribLocation(pts, 'aP'), aK = gl.getAttribLocation(pts, 'aK');

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    /* ── layout, cached (read on resize only) ── */
    var W = 0, H = 0, S = 1, heroTop = 0, heroH = 0, copyL = 0, copyR = 0, light = 0;
    function measure() {
      W = innerWidth; H = innerHeight;
      S = Math.min(0.75, 0.6 * (devicePixelRatio || 1));
      canvas.width = Math.round(W * S); canvas.height = Math.round(H * S);
      var hb = hero.getBoundingClientRect(), cb = copy.getBoundingClientRect();
      heroTop = hb.top + scrollY; heroH = hb.height;
      copyL = cb.left; copyR = cb.right;
      root.style.setProperty('--wp-hero-b', Math.round(heroTop + heroH) + 'px');
    }
    function theme() { light = root.getAttribute('data-theme') === 'light' ? 1 : 0; }

    function setU(u, t, sy) {
      gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uS, S); gl.uniform1f(u.uT, t);
      gl.uniform1f(u.uHeroB, heroTop + heroH - sy); gl.uniform1f(u.uHeroH, heroH);
      gl.uniform1f(u.uCopyL, copyL); gl.uniform1f(u.uCopyR, copyR);
      gl.uniform1f(u.uLight, light); gl.uniform1f(u.uScroll, sy);
    }
    function bindPts(buf) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 4, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(aK); gl.vertexAttribPointer(aK, 1, gl.FLOAT, false, 20, 16);
    }

    var secK = -1;
    function frame(t) {
      var sy = scrollY, hb = heroTop + heroH - sy;
      /* the page glows and stars (body::before/after, main::after) used to
         sit under the opaque hero; now it is see-through they would light
         up the copy, so they fade in only as the hero scrolls away */
      var k = Math.round(Math.min(1, Math.max(0, 1 - hb / H)) * 20) / 20;
      if (k !== secK) { secK = k; root.style.setProperty('--wp-sec', k); }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(bg); setU(U.bg, t, sy);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(aQ); gl.vertexAttribPointer(aQ, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(aQ);

      gl.useProgram(pts); setU(U.pts, t, sy);
      bindPts(ptBuf);
      gl.uniform1f(U.pts.uLines, 0);
      if (hb > 0) gl.drawArrays(gl.POINTS, 0, nHero);
      if (hb < H) {
        gl.drawArrays(gl.POINTS, nHero, nNodes);
        bindPts(lnBuf); gl.uniform1f(U.pts.uLines, 1);
        gl.drawArrays(gl.LINES, 0, nLineVerts);
      }
      gl.disableVertexAttribArray(aP); gl.disableVertexAttribArray(aK);
    }

    /* ── loop: 30fps cap, off while hidden ── */
    var raf = 0, last = 0, t0 = performance.now(), running = false, shown = false;
    function tick(now) {
      raf = requestAnimationFrame(tick);
      if (now - last < 32) return;
      last = now;
      frame((now - t0) / 1000);
      if (!shown) { shown = true; root.classList.add('has-wallpaper'); }
    }
    function play() { if (!running && !document.hidden && gate.matches) { running = true; last = 0; raf = requestAnimationFrame(tick); } }
    function pause() { running = false; cancelAnimationFrame(raf); }

    function teardown() {
      pause();
      root.classList.remove('has-wallpaper');
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    }
    var rz = 0;
    function onResize() { cancelAnimationFrame(rz); rz = requestAnimationFrame(measure); }
    function onVis() { if (document.hidden) pause(); else play(); }

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); teardown(); });
    addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    gate.addEventListener('change', function () { if (!gate.matches) teardown(); });
    new MutationObserver(theme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    /* the hero grows when web fonts swap in, or the 3D settles */
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(hero);

    document.body.insertBefore(canvas, document.body.firstChild);
    theme(); measure(); play();
  }

  /* Not the load event: a slow third-party beacon can hold it back. */
  if (document.readyState !== 'loading') setTimeout(boot, 1500);
  else addEventListener('DOMContentLoaded', function () { setTimeout(boot, 1500); });
})();
