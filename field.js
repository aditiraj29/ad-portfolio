/* =====================================================================
   Field — the scroll-scrubbed pixel field.
   Every particle follows an analytic "shape" (wave, clusters, settle,
   lattice, rings, @) laid out INSIDE the figure window of the current
   chapter. Scrolling blends between shapes — and between windows — with a
   per-particle stagger, and a spring pulls each dot toward its target.
   During the preloader the same dots assemble the name from raw noise.
   ===================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('field');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // category → colour slot. slots: 0 ink, 1 signal (red), 2 lime (green), 3 aqua (blue)
  var CAT_COLOR = [3, 1, 2]; // Analytics → blue, Product → red, AI → green

  var W = 0, H = 0, DPR = 1, N = 0, big = true;
  var X, Y, VX, VY, SEED, SEED2, U, G, TH, NB, NB2, CAT, CA, CC, CS;
  var colors = ['#15130f', '#d5361f', '#1f8a4c', '#1f4fd8'];
  var bounds = [];
  var figs = [];                       // one {x, y, w, h, dim} window per chapter, in viewport px
  var FULL = { x: 0, y: 0, w: 0, h: 0, dim: 1 };
  var cp = 0, cps = 0;                 // chapter position (raw / smoothed)
  var t = 0, last = 0;
  var burst = { x: 0, y: 0, at: -99 };
  var scrollVel = 0;
  var hl = -1, hlAmt = [1, 1, 1];
  var atPts = null;
  var oA = { x: 0, y: 0, a: 0, c: 0, s: 1, snap: 0 };
  var oB = { x: 0, y: 0, a: 0, c: 0, s: 1, snap: 0 };
  var oI = { x: 0, y: 0, a: 0, c: 0, s: 1, snap: 0 };
  var cc0 = { x: 0, y: 0, a: 0 };
  // intro: while the preloader runs, the noise assembles into the name; `mix` 1 → 0 releases it into the page
  var intro = { p: 0, mix: 0, pts: null, cy: 0, bottom: 0 };

  function rng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sstep(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function cell() { return big ? 4 : 3; }

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    colors = [v('--ink', '#15130f'), v('--signal', '#d5361f'), v('--lime', '#1f8a4c'), v('--aqua', '#1f4fd8')];
  }

  /* ------------------------------------------------------------------
     allocation
     ------------------------------------------------------------------ */
  function alloc() {
    var r = rng(20260711), i;
    X = new Float32Array(N); Y = new Float32Array(N); VX = new Float32Array(N); VY = new Float32Array(N);
    SEED = new Float32Array(N); SEED2 = new Float32Array(N); U = new Float32Array(N);
    G = new Float32Array(N); TH = new Float32Array(N); NB = new Float32Array(N); NB2 = new Float32Array(N);
    CAT = new Uint8Array(N);
    CA = new Float32Array(N); CC = new Uint8Array(N); CS = new Float32Array(N);
    for (i = 0; i < N; i++) {
      SEED[i] = r(); SEED2[i] = r(); U[i] = r();
      G[i] = Math.min(2.6, Math.sqrt(-2 * Math.log(1 - r() * 0.999)));
      TH[i] = r() * 6.2832;
      NB[i] = (r() + r() + r() - 1.5) / 1.5;
      NB2[i] = (r() + r() + r() - 1.5) / 1.5;
      CAT[i] = i % 3;
      X[i] = r() * W; Y[i] = r() * H; // start as pure noise
    }
  }

  /* ------------------------------------------------------------------
     shapes — each writes a target (x, y), alpha, colour slot, size,
     laid out inside the window `b` = {x, y, w, h, dim}
     ------------------------------------------------------------------ */

  // 0 · front page: a drifting multi-lane signal wave
  function wave(i, t, o, b) {
    var k = (i % 9) - 4, u = U[i];
    var env = 0.5 + 0.5 * Math.sin(u * Math.PI);
    o.x = b.x + u * b.w;
    o.y = b.y + b.h * 0.5 + k * b.h * 0.03
      + Math.sin(u * 7.2 + t * 0.55 + k * 0.32) * b.h * 0.2 * env
      + Math.sin(u * 19 - t * 0.8) * b.h * 0.05 * env
      + (SEED2[i] - 0.5) * 4;
    o.a = (0.45 + 0.5 * env) * b.dim;
    o.c = SEED[i] < 0.12 ? 1 : 0;
    o.s = 1; o.snap = 0;
  }

  // 1 · about: three clusters (Analytics / Product / AI) + ambient noise
  function clusterCenter(k, b, out) {
    var m = Math.min(b.w, b.h), R = m * 0.26, a = -Math.PI / 2 + k * 2.0944;
    out.x = b.x + b.w / 2 + Math.cos(a) * R * 1.1;
    out.y = b.y + b.h / 2 + Math.sin(a) * R * 0.9 + m * 0.02;
    out.a = a;
  }
  function clusters(i, t, o, b) {
    o.snap = 0;
    if (i % 7 === 0) {
      o.x = b.x + b.w / 2 + NB[i] * b.w * 0.5 + Math.sin(t * 0.3 + SEED[i] * 9) * 8;
      o.y = b.y + b.h / 2 + NB2[i] * b.h * 0.5 + Math.cos(t * 0.27 + SEED2[i] * 9) * 8;
      o.a = 0.28 * b.dim; o.c = 0; o.s = 0.8;
      return;
    }
    var k = CAT[i];
    clusterCenter(k, b, cc0);
    var sg = Math.min(b.w, b.h) * 0.07 * (hl === k ? 1.2 : 1);
    var ang = TH[i] + t * (0.12 + 0.25 * SEED2[i]) * (k === 1 ? -1 : 1);
    var r = G[i] * sg;
    o.x = cc0.x + Math.cos(ang) * r;
    o.y = cc0.y + Math.sin(ang) * r;
    o.a = 0.92 * hlAmt[k] * b.dim;
    o.c = CAT_COLOR[k];
    o.s = 1.15;
  }

  // 2 · experience: noise settles into order as the five steps advance (Field.setSettle 0 → 1).
  //     No labels: it is the "noise → signal" idea again, driven by how far through the feature you are.
  var settleM = 0, settleS = 0;   // target / eased
  function settle(i, t, o, b) {
    var e = sstep(settleS);
    // scattered: drifting noise across the window
    var nx = b.x + b.w * (0.5 + NB[i] * 0.5) + Math.sin(t * 0.35 + SEED[i] * 9) * 10;
    var ny = b.y + b.h * (0.5 + NB2[i] * 0.5) + Math.cos(t * 0.3 + SEED2[i] * 9) * 10;
    // ordered: a tidy grid, with more of it turning red as the signal emerges
    var cols = Math.max(8, Math.round(Math.sqrt(N * b.w / Math.max(1, b.h))));
    var rows = Math.ceil(N / cols), gx = i % cols, gy = (i / cols) | 0;
    var ox = b.x + (gx + 0.5) * b.w / cols, oy = b.y + (gy + 0.5) * b.h / rows;
    o.x = nx + (ox - nx) * e; o.y = ny + (oy - ny) * e;
    o.a = (0.3 + 0.4 * e) * b.dim;
    o.c = SEED[i] < 0.03 + 0.2 * e * e ? 1 : 0;
    o.s = 0.9; o.snap = 0;
  }

  // 3 · projects: a pixel lattice
  function lattice(i, t, o, b) {
    var cols = Math.max(8, Math.round(Math.sqrt(N * b.w / Math.max(1, b.h))));
    var rows = Math.ceil(N / cols);
    var gx = i % cols, gy = (i / cols) | 0;
    o.x = b.x + (gx + 0.5) * b.w / cols;
    o.y = b.y + (gy + 0.5) * b.h / rows + Math.sin(t * 0.8 + gx * 0.35 + gy * 0.2) * 3;
    o.a = 0.4 * b.dim; o.c = SEED[i] < 0.03 ? 1 : (SEED[i] < 0.05 ? 3 : 0); o.s = 0.8; o.snap = 0;
  }

  // 4 · skills: concentric orbits
  function rings(i, t, o, b) {
    var k = i % 5, m = Math.min(b.w, b.h);
    var r = (0.14 + k * 0.085) * m + (SEED2[i] - 0.5) * 4;
    var dir = k % 2 ? -1 : 1;
    var a = TH[i] + t * dir * 0.25 / (k + 1);
    o.x = b.x + b.w / 2 + Math.cos(a) * r * (b.w / m > 1.4 ? 1.4 : 1);
    o.y = b.y + b.h / 2 + Math.sin(a) * r * 0.85;
    o.a = 0.7 * b.dim; o.c = [2, 3, 1, 0, 0][k]; o.s = 1; o.snap = 0;
  }

  // 5 · letters: the dots spell "@" (sampled once, in normalised coordinates)
  function buildAt() {
    var sz = 260, c = document.createElement('canvas');
    c.width = c.height = sz;
    var g = c.getContext('2d');
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 ' + Math.floor(sz * 0.95) + 'px "Playfair Display", Georgia, serif';
    g.fillText('@', sz / 2, sz / 2 + sz * 0.03);
    var d = g.getImageData(0, 0, sz, sz).data, step = 4, pts = [];
    for (var y = 0; y < sz; y += step) for (var x = 0; x < sz; x += step) {
      if (d[(y * sz + x) * 4 + 3] > 128) pts.push((x - sz / 2) / sz, (y - sz / 2) / sz);
    }
    var r = rng(7), n = pts.length / 2, j, tx, ty;
    for (var i = n - 1; i > 0; i--) {
      j = (r() * (i + 1)) | 0;
      tx = pts[i * 2]; ty = pts[i * 2 + 1];
      pts[i * 2] = pts[j * 2]; pts[i * 2 + 1] = pts[j * 2 + 1];
      pts[j * 2] = tx; pts[j * 2 + 1] = ty;
    }
    atPts = pts;
  }
  function atSign(i, t, o, b) {
    o.snap = 0;
    if (!atPts || atPts.length < 8) { o.x = b.x + b.w / 2; o.y = b.y + b.h / 2; o.a = 0; o.c = 0; o.s = 1; return; }
    var n = atPts.length / 2, k = i % n, size = Math.min(b.w, b.h) * 0.94;
    var br = 1 + Math.sin(t * 0.9) * 0.012;
    o.x = b.x + b.w / 2 + atPts[k * 2] * size * br + Math.sin(t * 1.3 + SEED[i] * 9) * 1.2;
    o.y = b.y + b.h / 2 + atPts[k * 2 + 1] * size * br + Math.cos(t * 1.1 + SEED2[i] * 9) * 1.2;
    o.a = 0.92 * b.dim;
    o.c = SEED[i] < 0.2 ? 1 : (SEED[i] < 0.3 ? 3 : 0);
    o.s = 1.05;
  }

  // intro: raw noise that resolves into "ADITI RAJ" as the loader climbs to 100%
  function buildName() {
    if (!(W > 0 && H > 0)) return;   // a webview can report a 0×0 window while it is still laying out; resize() rebuilds once it has a size
    var stack = W < 700;
    var lines = stack ? ['ADITI', 'RAJ'] : ['ADITI RAJ'];
    var fs = stack ? Math.min(W * 0.28, 150) : Math.min(W * 0.15, 230);
    var cw = Math.ceil(W * 0.96), ch = Math.ceil(fs * 1.2 * lines.length) + 24;
    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    var g = c.getContext('2d');
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 ' + Math.floor(fs) + 'px "Playfair Display", Georgia, serif';
    lines.forEach(function (txt, i) { g.fillText(txt, cw / 2, ch * ((i + 0.5) / lines.length)); });
    var d = g.getImageData(0, 0, cw, ch).data, count = 0, k;
    for (k = 3; k < d.length; k += 4) if (d[k] > 128) count++;
    // sample on the same grid the dots are drawn on, as solid 2×2-cell blocks, with at most one point per particle
    var cl = cell(), step = cl * 2;
    while (count / (step * step) > N * 0.95) step += cl;
    var pts = [], maxY = 0;
    for (var y = 0; y < ch; y += step) for (var x = 0; x < cw; x += step) {
      if (d[(y * cw + x) * 4 + 3] > 128) { pts.push(x - cw / 2, y - ch / 2); if (y - ch / 2 > maxY) maxY = y - ch / 2; }
    }
    var r = rng(11), n = pts.length / 2, j, tx, ty;
    for (var i = n - 1; i > 0; i--) {
      j = (r() * (i + 1)) | 0;
      tx = pts[i * 2]; ty = pts[i * 2 + 1];
      pts[i * 2] = pts[j * 2]; pts[i * 2 + 1] = pts[j * 2 + 1];
      pts[j * 2] = tx; pts[j * 2 + 1] = ty;
    }
    intro.pts = pts; intro.cy = H * 0.42; intro.bottom = intro.cy + maxY + step;
  }
  function introTarget(i, t, o) {
    var n = intro.pts ? intro.pts.length / 2 : 0;
    var nx = W * (0.5 + (U[i] - 0.5) * 1.04) + Math.sin(t * 0.4 + SEED[i] * 9) * 18;
    var ny = H * (0.02 + SEED2[i] * 0.96) + Math.cos(t * 0.35 + SEED[i] * 9) * 18;
    var formed = i < n ? sstep(clamp(intro.p * 1.5 - SEED[i] * 0.5, 0, 1)) : 0;
    var fx = i < n ? W / 2 + intro.pts[i * 2] : nx, fy = i < n ? intro.cy + intro.pts[i * 2 + 1] : ny;
    o.x = nx + (fx - nx) * formed; o.y = ny + (fy - ny) * formed;
    o.a = 0.3 + 0.65 * formed;
    o.c = formed > 0.5 && SEED[i] < 0.14 ? 1 : 0;
    o.s = 0.9 + 1.4 * formed; o.snap = 0; // fully formed dots are drawn as 2×2-cell blocks
  }

  var SHAPES = [wave, clusters, settle, lattice, rings, atSign];

  function box(idx) {
    var b = figs[idx];
    return b && b.w > 8 && b.h > 8 ? b : FULL;
  }

  /* ------------------------------------------------------------------
     chapter position from scroll
     ------------------------------------------------------------------ */
  function chapterPos(sy) {
    var n = bounds.length;
    if (n < 2) return 0;
    var vh = window.innerHeight, s = sy + vh * 0.6;
    for (var k = 0; k < n - 1; k++) {
      var u = (s - (bounds[k + 1] - vh * 0.55)) / (vh * 0.75);
      if (u <= 0) return k;
      if (u < 1) return k + u;
    }
    return n - 1;
  }

  /* ------------------------------------------------------------------
     frame
     ------------------------------------------------------------------ */
  function frame(timeMs) {
    var dtMs = last ? Math.max(0, Math.min(50, timeMs - last)) : 16.7;
    last = timeMs;
    var dt = dtMs / 16.667;
    if (!reduce) t += dtMs / 1000;

    cp = chapterPos(window.pageYOffset || 0);
    cps += (cp - cps) * Math.min(1, 0.14 * dt);
    if (Math.abs(cp - cps) < 0.0005) cps = cp;

    for (var q = 0; q < 3; q++) {
      var want = (hl < 0 || hl === q) ? 1 : 0.1;
      hlAmt[q] += (want - hlAmt[q]) * Math.min(1, 0.12 * dt);
    }

    var ia = Math.floor(cps), f = cps - ia, last_ = SHAPES.length - 1;
    if (ia >= last_) { ia = last_; f = 0; }
    var fa = SHAPES[ia], fb = f > 0.001 ? SHAPES[ia + 1] : null;
    var bA = box(ia), bB = fb ? box(ia + 1) : null;

    var damp = Math.pow(0.86, dt);
    var R = big ? 110 : 80, R2 = R * R;
    var bt = t - burst.at, bActive = bt < 0.7 && !reduce;
    settleS += (settleM - settleS) * Math.min(1, 0.05 * dt);
    scrollVel *= Math.pow(0.88, dt); // decays between scroll events so a stale value can't keep scattering the field
    var swirl = reduce ? 0 : clamp(scrollVel, -50, 50) * 0.028;
    var i, p, tx, ty, ta, tc, ts, snap, k, dx, dy, d2, d, fo;

    for (i = 0; i < N; i++) {
      fa(i, t, oA, bA);
      if (fb) {
        fb(i, t, oB, bB);
        p = clamp(f * 1.7 - SEED[i] * 0.7, 0, 1); p = p * p * (3 - 2 * p);
        tx = oA.x + (oB.x - oA.x) * p;
        ty = oA.y + (oB.y - oA.y) * p;
        ta = oA.a + (oB.a - oA.a) * p;
        ts = oA.s + (oB.s - oA.s) * p;
        tc = p > 0.5 ? oB.c : oA.c;
        snap = p > 0.5 ? oB.snap : oA.snap;
      } else {
        tx = oA.x; ty = oA.y; ta = oA.a; ts = oA.s; tc = oA.c; snap = oA.snap;
      }
      if (intro.mix > 0.001) {
        introTarget(i, t, oI);
        p = sstep(clamp(intro.mix * 1.6 - SEED[i] * 0.6, 0, 1));
        tx += (oI.x - tx) * p; ty += (oI.y - ty) * p; ta += (oI.a - ta) * p; ts += (oI.s - ts) * p;
        if (p > 0.5) tc = oI.c;
        snap = 0;
      }

      if (snap) { X[i] = tx; Y[i] = ty; VX[i] = 0; VY[i] = 0; }

      k = 0.018 + SEED[i] * 0.03;
      VX[i] = (VX[i] + (tx - X[i]) * k * dt) * damp;
      VY[i] = (VY[i] + (ty - Y[i]) * k * dt) * damp;

      if (swirl) VY[i] += swirl * (SEED[i] - 0.5) * 2;

      if (bActive) {
        dx = X[i] - burst.x; dy = Y[i] - burst.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
        fo = Math.exp(-Math.pow((d - bt * 1100) / 90, 2)) * (1 - bt / 0.7) * 16 * dt;
        VX[i] += dx / d * fo; VY[i] += dy / d * fo;
      }

      X[i] += VX[i] * dt; Y[i] += VY[i] * dt;
      CA[i] = ta; CC[i] = tc; CS[i] = ts;
    }

    render();
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // every dot snaps to a pixel grid, so motion steps cell-to-cell like an 8-bit display
    var cl = cell(), c, i, s;
    for (c = 0; c < 4; c++) {
      ctx.fillStyle = colors[c];
      for (i = 0; i < N; i++) {
        if (CC[i] !== c) continue;
        ctx.globalAlpha = CA[i] > 1 ? 1 : CA[i];
        s = CS[i] > 1.9 ? cl * 2 : cl;
        ctx.fillRect(Math.round((X[i] - s / 2) / cl) * cl, Math.round((Y[i] - s / 2) / cl) * cl, s, s);
      }
    }
    ctx.globalAlpha = 1;
    labels();
  }

  /* ------------------------------------------------------------------
     in-figure labels for the cluster chapter
     ------------------------------------------------------------------ */
  function labels() {
    if (!big) return; // labels would collide with text on phones
    var aC = clamp(1 - Math.abs(cps - 1) * 2.4, 0, 1);
    if (aC <= 0.02) return;
    ctx.font = '500 13px "Pixelify Sans", "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = '1.2px'; } catch (e) {}
    var names = ['ANALYTICS', 'PRODUCT', 'AI'], k, b;
    if (aC > 0.02) {
      b = box(1);
      for (k = 0; k < 3; k++) {
        clusterCenter(k, b, cc0);
        var off = Math.min(b.w, b.h) * 0.07 * 2.9;
        var lx = cc0.x + Math.cos(cc0.a) * off, ly = cc0.y + Math.sin(cc0.a) * off;
        var al = Math.cos(cc0.a);
        ctx.globalAlpha = aC * 0.95 * (0.3 + 0.7 * hlAmt[k]);
        ctx.fillStyle = colors[CAT_COLOR[k]];
        ctx.textAlign = al > 0.2 ? 'left' : al < -0.2 ? 'right' : 'center';
        ctx.fillText(names[k], lx, ly + (Math.abs(al) < 0.2 ? -6 : 0));
      }
    }
    ctx.globalAlpha = 1;
    try { ctx.letterSpacing = '0px'; } catch (e) {}
  }

  /* ------------------------------------------------------------------
     sizing
     ------------------------------------------------------------------ */
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    var newN = Math.round(clamp(w * h / 900, 600, 1700));
    var prevW = W;
    W = w; H = h; DPR = Math.min(2, window.devicePixelRatio || 1);
    big = W > 900;
    FULL.w = W; FULL.h = H;
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    if (newN !== N) {
      var oldX = X, oldY = Y, oldN = N;
      N = newN; alloc();
      if (oldX) { for (var i = 0; i < Math.min(N, oldN); i++) { X[i] = oldX[i]; Y[i] = oldY[i]; } }
    }
    if (prevW !== W) { buildAt(); buildName(); }
  }

  /* ------------------------------------------------------------------
     public api
     ------------------------------------------------------------------ */
  window.Field = {
    init: function () {
      readColors(); resize();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { buildAt(); buildName(); });
      window.addEventListener('resize', function () { resize(); });
    },
    frame: frame,
    theme: readColors,
    // intro controls (driven by the preloader)
    intro: {
      start: function () { intro.mix = 1; intro.p = 0; },
      set: function (p) { intro.p = clamp(p, 0, 1); },
      release: function (cx, cy) {
        burst.x = cx == null ? W / 2 : cx; burst.y = cy == null ? intro.cy : cy; burst.at = t;
        if (window.gsap) gsap.to(intro, { mix: 0, duration: 1.2, ease: 'power2.in' }); else intro.mix = 0;
      },
      ready: function () { return !!(intro.pts && intro.pts.length > 40); },
      bottom: function () { return intro.bottom || H * 0.55; }
    },
    setBounds: function (arr) { bounds = arr.slice(); },
    setFigures: function (arr) { figs = arr; },
    setHighlight: function (k) { hl = k; },
    setSettle: function (v) { settleM = clamp(v, 0, 1); },
    setScroll: function (v) { scrollVel = v; },
    get chapter() { return cps; }
  };
})();
