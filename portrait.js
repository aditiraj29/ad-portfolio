/* =====================================================================
   Portrait — the author, in pixels.
   Draws the baked grid from portrait-data.js onto a tiny canvas (1 px per
   cell, scaled up crisply). On load it resolves out of raw colour noise —
   the "noise → signal" idea, literally. It plays once on landing, then holds still.
   The background is transparent, so the pixel wave flows behind the figure.
   ===================================================================== */
(function () {
  'use strict';

  var P = window.PORTRAIT, cv = document.getElementById('portrait');
  if (!P || !cv) { if (cv) cv.hidden = true; return; }   // no data → the pixel wave shows instead

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var win = cv.parentElement;
  var W = P.w, H = P.h, N = W * H;
  var ctx = cv.getContext('2d');
  cv.width = W; cv.height = H;
  var img = ctx.createImageData(W, H), px = img.data;

  // palette → rgb
  var pal = P.pal.map(function (h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; });
  var DIG = '0123456789abcdefghij';
  var target = new Int16Array(N), reveal = new Float32Array(N);
  var cx = W * 0.5, cy = H * 0.34;                      // roughly the face
  var i, x, y;
  function rnd(n) { var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    i = y * W + x;
    var ch = P.rows[y].charAt(x);
    target[i] = ch === '-' ? -1 : DIG.indexOf(ch);
    var d = Math.sqrt(Math.pow((x - cx) / W, 2) + Math.pow((y - cy) / H, 2));
    reveal[i] = 0.25 + d * 2.1 + rnd(i) * 0.55;          // seconds: resolves outward from the face
  }

  var t0 = -1, now = 0, done = false, frameKey = -1, running = false;

  function setPx(i, c) {
    var o = i * 4;
    if (!c) { px[o + 3] = 0; return; }
    px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
  }

  function draw(el, key) {
    var changing = false;
    for (var i = 0; i < N; i++) {
      var tg = target[i], c = null;
      if (t0 >= 0 && el >= reveal[i]) {
        if (tg >= 0) c = pal[tg];
      } else {
        // not resolved yet: flickering colour noise
        changing = true;
        if (rnd(i + key * 7.31) < 0.34) c = pal[(rnd(i * 3.7 + key * 1.9) * pal.length) | 0];
      }
      setPx(i, c);
    }
    ctx.putImageData(img, 0, 0);
    return changing;
  }

  // integer scale keeps every pixel the same size; the window shrinks to hug the portrait
  function fit() {
    var avail = win.parentElement.clientWidth - 6;
    var sc = Math.min(7, Math.max(2, Math.floor(avail / W)));
    win.style.width = (W * sc) + 'px'; win.style.height = (H * sc) + 'px';
    win.style.marginLeft = 'auto'; win.style.marginRight = 'auto';
    cv.style.width = (W * sc) + 'px'; cv.style.height = (H * sc) + 'px';
  }

  function tick() {
    now = performance.now() / 1000;
    var el = t0 < 0 ? 0 : now - t0;
    var key = Math.floor(now * 11);                      // noise re-rolls ~11×/s, like a retro screen
    if (key === frameKey) return;
    frameKey = key;
    var changing = draw(el, key);
    if (t0 >= 0 && el > 3.2 && !changing) { done = true; stop(); }   // fully resolved and nothing glitching: go idle
  }
  function start() { if (!running) { running = true; if (window.gsap) gsap.ticker.add(tick); else loop(); } }
  function stop() { if (running) { running = false; if (window.gsap) gsap.ticker.remove(tick); } }
  function loop() { if (!running) return; tick(); requestAnimationFrame(loop); }

  window.Portrait = {
    // begin the noise → portrait resolve (called when the front page appears)
    play: function (delay) {
      if (reduce) { t0 = 0; done = true; draw(99, 0); return; }
      setTimeout(function () { t0 = performance.now() / 1000; done = false; start(); }, (delay || 0) * 1000);
    }
  };

  fit();
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  // before play(): show noise only, so nothing flashes the finished portrait early
  draw(0, 0);
})();
