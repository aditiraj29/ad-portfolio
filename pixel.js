/* =====================================================================
   Pixel — the shared pixel-art toolkit
     · Wipe   pixel-grid dissolve used for long jumps and the theme swap
     · sprites  procedural skill "identicons", trophy, star, the runner
     · track  scroll track with a tiny runner and chapter flags
   Everything draws crisp squares — no smoothing, no rounded corners.
   ===================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  function css(name, fallback) { return getComputedStyle(root).getPropertyValue(name).trim() || fallback; }
  var C = { ink: '#ece8de', signal: '#ff5a1f', lime: '#d4ff3a', aqua: '#4fe3c8', bg: '#0a0a0b' };
  function readColors() {
    C = { ink: css('--ink', C.ink), signal: css('--signal', C.signal), lime: css('--lime', C.lime), aqua: css('--aqua', C.aqua), bg: css('--bg', C.bg) };
  }
  readColors();

  function rng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ------------------------------------------------------------------
     sprites
     ------------------------------------------------------------------ */
  function matrix(canvas, rows, pal) {
    var h = rows.length, w = rows[0].length;
    canvas.width = w; canvas.height = h;
    var g = canvas.getContext('2d');
    g.clearRect(0, 0, w, h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var c = pal[rows[y][x]];
      if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
    }
  }

  // a deterministic, mirrored 7×7 "invader" for each skill name
  function identicon(canvas, name, color) {
    var r = rng(hash(name)), S = 7, half = 4, cells, tries = 0, count;
    do {
      cells = []; count = 0;
      for (var y = 0; y < S; y++) {
        cells[y] = [];
        for (var x = 0; x < half; x++) { var on = r() < 0.56; cells[y][x] = on; }
        for (x = half; x < S; x++) cells[y][x] = cells[y][S - 1 - x];
      }
      for (y = 0; y < S; y++) for (x = 0; x < S; x++) if (cells[y][x]) count++;
    } while ((count < 17 || count > 33) && ++tries < 12);
    canvas.width = canvas.height = S;
    var g = canvas.getContext('2d');
    g.clearRect(0, 0, S, S);
    g.fillStyle = color;
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) if (cells[y][x]) g.fillRect(x, y, 1, 1);
    // eyes: knock out two mirrored pixels so each sprite looks like a tiny creature
    g.fillStyle = C.bg;
    var ey = 2 + (hash(name) % 2);
    if (cells[ey][1] && cells[ey][5]) { g.fillRect(1, ey, 1, 1); g.fillRect(5, ey, 1, 1); }
    else if (cells[ey][2] && cells[ey][4]) { g.fillRect(2, ey, 1, 1); g.fillRect(4, ey, 1, 1); }
  }

  var TROPHY = [
    '..GGGGGGGG..',
    'GGGGLLGGGGGG',
    'G.GLLGGGGD.G',
    'G.GLGGGGGD.G',
    'GGGGGGGGGDGG',
    '..GGGGGGDD..',
    '...GGGGGD...',
    '.....GGD....',
    '.....GGD....',
    '....GGGGDD..',
    '...GGGGGGDD.',
    '...DDDDDDDD.'
  ];
  var TROPHY_PAL = { G: '#ffc83d', L: '#fff3b0', D: '#c98a12' };

  function starRows() {
    var rows = [], cx = 5.5, cy = 6, R = 5.7, r = 2.5, pts = [], i;
    for (i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    function inside(x, y) {
      var c = false;
      for (var a = 0, b = pts.length - 1; a < pts.length; b = a++) {
        var xi = pts[a][0], yi = pts[a][1], xj = pts[b][0], yj = pts[b][1];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
      }
      return c;
    }
    for (var y = 0; y < 12; y++) {
      var s = '';
      for (var x = 0; x < 12; x++) {
        if (!inside(x + 0.5, y + 0.5)) s += '.';
        else if (Math.abs(x + 0.5 - cx) + Math.abs(y + 0.5 - cy) < 2.6) s += 'L';
        else if (x + y > 14) s += 'D';
        else s += 'G';
      }
      rows.push(s);
    }
    return rows;
  }

  var RUN_A = [
    '...oooooo...', '..oooooooo..', '..ooeooeoo..', '..oooooooo..', '...oooooo...', '..rrrrrrrr..',
    '.orrrrrrrro.', '.orrrrrrrro.', '..rrrrrrrr..', '..oo....oo..', '.oo......oo.', '.oo......oo.'
  ];
  var RUN_B = [
    '...oooooo...', '..oooooooo..', '..ooeooeoo..', '..oooooooo..', '...oooooo...', '..rrrrrrrr..',
    '.orrrrrrrro.', '.orrrrrrrro.', '..rrrrrrrr..', '...oo..oo...', '...oo..oo...', '...oo..oo...'
  ];
  function runnerPal() { return { o: C.ink, r: C.signal, e: C.bg }; }

  var named = [];       // skill identicons, so they can be recoloured on theme change
  var drawn = [];       // trophy / star canvases

  function drawStatic() {
    var els = document.querySelectorAll('canvas[data-sprite]');
    Array.prototype.forEach.call(els, function (cv) {
      var kind = cv.getAttribute('data-sprite');
      matrix(cv, kind === 'trophy' ? TROPHY : starRows(), TROPHY_PAL);
    });
  }

  /* ------------------------------------------------------------------
     wipe — pixel-grid dissolve
     ------------------------------------------------------------------ */
  var Wipe = (function () {
    var cv = document.getElementById('wipe');
    if (!cv) return { run: function (mid) { mid(); } };
    var ctx = cv.getContext('2d'), W = 0, H = 0, DPR = 1, cols = 0, rows = 0, cell = 48, th, col, running = false;

    function size() {
      W = window.innerWidth; H = window.innerHeight; DPR = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
      cell = W > 900 ? 52 : 40;
      cols = Math.ceil(W / cell); rows = Math.ceil(H / cell);
      var r = rng(Date.now() & 0xffff);
      th = new Float32Array(cols * rows); col = new Uint8Array(cols * rows);
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var i = y * cols + x, d = (x / cols + y / rows) / 2;
        th[i] = Math.min(0.999, r() * 0.72 + d * 0.28);
        var k = r(); col[i] = k < 0.5 ? 1 : k < 0.72 ? 0 : k < 0.88 ? 2 : 3;
      }
    }
    function paint(p, cover) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var pal = [C.ink, C.signal, C.lime, C.aqua];
      for (var c = 0; c < 4; c++) {
        ctx.fillStyle = pal[c];
        for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
          var i = y * cols + x;
          if (col[i] !== c) continue;
          var vis = cover ? th[i] <= p : th[i] > p;
          if (vis) ctx.fillRect(x * cell, y * cell, cell + 1, cell + 1);
        }
      }
    }
    // cover the screen with pixels, run `mid` while hidden, then dissolve them away
    function run(mid) {
      if (reduce || !window.gsap || running) { mid(); return; }
      running = true; size();
      var o = { p: 0 };
      var tl = gsap.timeline({ onComplete: function () { ctx.clearRect(0, 0, W, H); running = false; } });
      tl.to(o, { p: 1, duration: 0.45, ease: 'none', onUpdate: function () { paint(o.p, true); } })
        .add(function () { mid(); o.p = 0; paint(0, false); })
        .to(o, { p: 1, duration: 0.55, ease: 'none', onUpdate: function () { paint(o.p, false); } }, '+=0.06');
    }
    return { run: run };
  })();

  /* ------------------------------------------------------------------
     track — a pixel runner follows your scroll; flags jump to chapters
     ------------------------------------------------------------------ */
  var Track = (function () {
    var el = document.getElementById('track'), fill = document.getElementById('trackFill'), runner = document.getElementById('runner');
    if (!el || !runner) return { init: function () {}, update: function () {}, layout: function () {} };
    var flags = [], frameIdx = 1, lastMove = 0, lastY = 0, tick = 0, current = -1, goFn = null;

    function drawRunner() { matrix(runner, frameIdx ? RUN_B : RUN_A, runnerPal()); }

    function init(names, go) {
      goFn = go;
      names.forEach(function (n, i) {
        var b = document.createElement('button');
        b.className = 'flag'; b.type = 'button'; b.setAttribute('aria-label', 'Jump to ' + n);
        b.innerHTML = '<span>' + n + '</span>';
        b.addEventListener('click', function () { if (goFn) goFn(i); });
        el.appendChild(b); flags.push(b);
      });
      drawRunner();
    }
    // tops: document-Y of each chapter; total: scrollable distance
    function layout(tops, total) {
      flags.forEach(function (f, i) { f.style.left = Math.max(0, Math.min(1, tops[i] / total)) * 100 + '%'; });
    }
    function update(y, total, activeIdx) {
      var p = total > 0 ? Math.max(0, Math.min(1, y / total)) : 0;
      runner.style.left = p * 100 + '%';
      fill.style.width = p * 100 + '%';
      var now = performance.now();
      if (Math.abs(y - lastY) > 0.5) lastMove = now;
      lastY = y;
      var moving = now - lastMove < 160;
      if (moving && now - tick > 110) { tick = now; frameIdx ^= 1; drawRunner(); }
      else if (!moving && frameIdx !== 1) { frameIdx = 1; drawRunner(); }
      if (activeIdx !== current) {
        current = activeIdx;
        flags.forEach(function (f, i) { f.classList.toggle('is-on', i === activeIdx); f.classList.toggle('is-done', i < activeIdx); });
      }
    }
    function recolor() { drawRunner(); }
    return { init: init, layout: layout, update: update, recolor: recolor };
  })();

  /* ------------------------------------------------------------------
     public api
     ------------------------------------------------------------------ */
  window.Pixel = {
    Wipe: Wipe, Track: Track,
    rng: rng, hash: hash,
    colors: function () { return C; },
    // draw a skill identicon and remember it so a theme change can recolour it
    skillSprite: function (canvas, name, colorVar) {
      named.push({ canvas: canvas, name: name, v: colorVar });
      identicon(canvas, name, css(colorVar, C.ink));
    },
    drawStatic: drawStatic,
    recolor: function () {
      readColors();
      named.forEach(function (n) { identicon(n.canvas, n.name, css(n.v, C.ink)); });
      Track.recolor();
    }
  };
})();
