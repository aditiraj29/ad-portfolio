/* =====================================================================
   Playable project demos
   1. Nexpilot   — simulated multi-agent run on an SVG graph
   2. Detection  — draggable object-detection sketch with a safety zone
   3. Evidentia  — real SHA-256 integrity check (text or file)
   ===================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  function $(id) { return document.getElementById(id); }
  function observe(el, cb, threshold) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { cb(es[0].isIntersecting); }, { threshold: threshold || 0.2 }).observe(el);
  }

  /* ==================================================================
     1 · NEXPILOT — multi-agent run
     ================================================================== */
  (function nexpilot() {
    var form = $('npForm'), svg = $('npGraph'), logEl = $('npLog'), goal = $('npGoal'), btn = $('npRun');
    if (!form || !svg || !window.gsap) return;

    var NODES = [
      { id: 'goal',       label: 'GOAL',       x: 8,   y: 100, w: 64 },
      { id: 'planner',    label: 'PLANNER',    x: 104, y: 100, w: 76 },
      { id: 'researcher', label: 'RESEARCH',   x: 224, y: 28,  w: 84 },
      { id: 'analyst',    label: 'ANALYST',    x: 224, y: 100, w: 84 },
      { id: 'writer',     label: 'WRITER',     x: 224, y: 172, w: 84 },
      { id: 'reviewer',   label: 'REVIEWER',   x: 348, y: 100, w: 76 },
      { id: 'output',     label: 'OUTPUT',     x: 456, y: 100, w: 70 }
    ];
    var H = 30, byId = {};
    var EDGES = [
      ['goal', 'planner'],
      ['planner', 'researcher'], ['planner', 'analyst'], ['planner', 'writer'],
      ['researcher', 'reviewer'], ['analyst', 'reviewer'], ['writer', 'reviewer'],
      ['reviewer', 'output']
    ];
    var edgeEls = {}, nodeEls = {};

    function el(tag, attrs, parent) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    }
    NODES.forEach(function (n) { byId[n.id] = n; });

    EDGES.forEach(function (pair) {
      var a = byId[pair[0]], b = byId[pair[1]];
      var x1 = a.x + a.w, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = (x1 + x2) / 2;
      var p = el('path', { 'class': 'edge', d: 'M' + x1 + ' ' + y1 + ' C ' + mx + ' ' + y1 + ', ' + mx + ' ' + y2 + ', ' + x2 + ' ' + y2 }, svg);
      edgeEls[pair.join('>')] = p;
    });
    NODES.forEach(function (n) {
      var g = el('g', { 'class': 'node' }, svg);
      el('rect', { x: n.x, y: n.y, width: n.w, height: H, rx: 8 }, g);
      var t = el('text', { x: n.x + n.w / 2, y: n.y + H / 2 + 0.5 }, g);
      t.textContent = n.label;
      nodeEls[n.id] = g;
    });

    var running = false, hasRun = false;

    function say(who, msg) {
      var line = document.createElement('span');
      line.className = 'l';
      var w = document.createElement('span'); w.className = 'who'; w.textContent = '[' + who + '] ';
      line.appendChild(w); line.appendChild(document.createTextNode(msg));
      logEl.appendChild(line);
      while (logEl.children.length > 6) logEl.removeChild(logEl.firstChild);
      if (window.gsap) gsap.from(line, { opacity: 0, x: -8, duration: .35 });
    }
    function activate(id) { nodeEls[id].classList.add('on'); }
    function reset() {
      logEl.textContent = '';
      Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.remove('on'); });
      Object.keys(edgeEls).forEach(function (k) { edgeEls[k].classList.remove('on'); });
      Array.prototype.slice.call(svg.querySelectorAll('.tok')).forEach(function (n) { n.remove(); });
    }
    function hop(tl, from, to, at) {
      var path = edgeEls[from + '>' + to], len = path.getTotalLength();
      var tok = el('circle', { 'class': 'tok', r: 4, cx: -10, cy: -10 }, svg);
      var o = { p: 0 };
      tl.call(function () { path.classList.add('on'); }, null, at);
      tl.to(o, {
        p: 1, duration: .55, ease: 'power1.inOut',
        onUpdate: function () { var pt = path.getPointAtLength(o.p * len); tok.setAttribute('cx', pt.x); tok.setAttribute('cy', pt.y); },
        onComplete: function () { tok.remove(); }
      }, at);
    }

    function run() {
      if (running) return;
      running = true; hasRun = true; btn.disabled = true; reset();
      var g = (goal.value || '').trim() || 'Prepare a competitor brief';
      var tl = gsap.timeline({ onComplete: function () { running = false; btn.disabled = false; btn.textContent = 'Run again ▸'; } });
      tl.call(function () { activate('goal'); say('user', '“' + g + '”'); }, null, 0);
      hop(tl, 'goal', 'planner', 0.4);
      tl.call(function () { activate('planner'); say('planner', 'breaking the goal into 3 parallel tasks'); }, null, 0.95);
      ['researcher', 'analyst', 'writer'].forEach(function (a, i) { hop(tl, 'planner', a, 1.6 + i * 0.08); });
      tl.call(function () { activate('researcher'); say('researcher', 'gathering sources'); }, null, 2.2);
      tl.call(function () { activate('analyst'); say('analyst', 'comparing findings'); }, null, 2.35);
      tl.call(function () { activate('writer'); say('writer', 'drafting the outline'); }, null, 2.5);
      ['researcher', 'analyst', 'writer'].forEach(function (a, i) { hop(tl, a, 'reviewer', 3.4 + i * 0.08); });
      tl.call(function () { activate('reviewer'); say('reviewer', 'checking drafts against the goal'); }, null, 4.05);
      hop(tl, 'reviewer', 'output', 4.7);
      tl.call(function () { activate('output'); say('output', '✓ done — result saved to the workspace'); }, null, 5.3);
      tl.to({}, { duration: .3 }, 5.4);
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    observe($('demoNexpilot'), function (vis) { if (vis && !hasRun) setTimeout(run, 500); }, 0.55);
  })();

  /* ==================================================================
     2 · OBJECT DETECTION SKETCH
     ================================================================== */
  (function detection() {
    var cv = $('odCanvas'); if (!cv) return;
    var ctx = cv.getContext('2d'), toggle = $('odBoxes'), countEl = $('odCount'), alertEl = $('odAlert');
    var W = 0, H = 0, DPR = 1, zone = { x: 0, y: 0, w: 0, h: 0 }, visible = false, t = 0, last = 0;
    var ents = [], nextId = 1, drag = null;
    var CLS = {
      person: { w: 15, h: 38, color: '#d4ff3a', speed: 22 },
      car:    { w: 62, h: 26, color: '#4fe3c8', speed: 58 },
      truck:  { w: 84, h: 40, color: '#4fe3c8', speed: 36 }
    };
    var ORDER = ['person', 'car', 'truck', 'person'];
    var ALERT = '#ff5a1f';

    function size() {
      var r = cv.getBoundingClientRect();
      W = Math.max(280, r.width); H = Math.max(200, r.height); DPR = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
      zone = { x: W * 0.6, y: H * 0.5, w: W * 0.34, h: H * 0.42 };
    }
    function depthScale(y) { return 0.62 + 0.78 * clamp((y - H * 0.38) / (H * 0.6), 0, 1); }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    function spawn(cls, x, y) {
      var c = CLS[cls];
      var dir = Math.random() < 0.5 ? -1 : 1;
      ents.push({
        id: nextId++, cls: cls, x: x, y: y, vx: dir * c.speed * (0.7 + Math.random() * 0.6),
        phase: Math.random() * 6, box: null, held: false
      });
      if (ents.length > 9) ents.shift();
    }
    function seed() {
      ents = [];
      spawn('person', W * 0.22, H * 0.78);
      spawn('car', W * 0.7, H * 0.62);
      spawn('person', W * 0.45, H * 0.9);
      spawn('truck', W * 0.3, H * 0.5);
      ents[0].vx = 18; ents[2].vx = -16;
    }
    function bboxOf(e) {
      var c = CLS[e.cls], s = depthScale(e.y), w = c.w * s, h = c.h * s;
      return { x: e.x - w / 2, y: e.y - h, w: w, h: h };
    }
    function inZone(e) { return e.x > zone.x && e.x < zone.x + zone.w && e.y > zone.y && e.y < zone.y + zone.h; }

    function drawBg() {
      ctx.fillStyle = '#0b0d0e'; ctx.fillRect(0, 0, W, H);
      // horizon + perspective floor
      var hz = H * 0.36;
      var g = ctx.createLinearGradient(0, hz, 0, H);
      g.addColorStop(0, '#12171a'); g.addColorStop(1, '#0b0d0e');
      ctx.fillStyle = g; ctx.fillRect(0, hz, W, H - hz);
      ctx.strokeStyle = 'rgba(160,190,200,.09)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = -8; i <= 8; i++) { ctx.moveTo(W / 2 + i * 14, hz); ctx.lineTo(W / 2 + i * W * 0.2, H); }
      for (var j = 1; j <= 7; j++) { var yy = hz + Math.pow(j / 7, 2) * (H - hz); ctx.moveTo(0, yy); ctx.lineTo(W, yy); }
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, hz); ctx.lineTo(W, hz); ctx.strokeStyle = 'rgba(160,190,200,.16)'; ctx.stroke();
    }
    function drawZone(alert) {
      ctx.save();
      ctx.fillStyle = alert ? 'rgba(255,90,31,.16)' : 'rgba(255,90,31,.06)';
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
      ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,90,31,' + (alert ? 1 : .6) + ')'; ctx.lineWidth = 1.2;
      ctx.strokeRect(zone.x + .5, zone.y + .5, zone.w, zone.h);
      ctx.setLineDash([]);
      ctx.font = '500 9px "JetBrains Mono", monospace'; ctx.fillStyle = '#ff5a1f'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      try { ctx.letterSpacing = '1px'; } catch (e) {}
      ctx.fillText('RESTRICTED ZONE', zone.x + 8, zone.y + 8);
      try { ctx.letterSpacing = '0px'; } catch (e) {}
      ctx.restore();
    }
    function drawEntity(e) {
      var c = CLS[e.cls], s = depthScale(e.y), w = c.w * s, h = c.h * s, x = e.x, y = e.y;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(x, y, w * .6, h * .1, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(175,190,196,.82)'; ctx.strokeStyle = 'rgba(175,190,196,.82)';
      if (e.cls === 'person') {
        var sw = Math.sin(e.phase) * w * .3;
        ctx.lineWidth = Math.max(1.5, w * .16); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y - h * .42); ctx.lineTo(x - sw, y); ctx.moveTo(x, y - h * .42); ctx.lineTo(x + sw, y); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(x - w * .38, y - h * .82, w * .76, h * .46, w * .25); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y - h * .92, w * .3, 0, 6.3); ctx.fill();
      } else if (e.cls === 'car') {
        ctx.beginPath(); ctx.roundRect(x - w / 2, y - h * .55, w, h * .38, h * .12); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x - w * .27, y - h, w * .54, h * .5, h * .14); ctx.fill();
        ctx.fillStyle = '#0b0d0e';
        [-.3, .3].forEach(function (k) { ctx.beginPath(); ctx.arc(x + k * w, y - h * .17, h * .17, 0, 6.3); ctx.fill(); });
      } else {
        ctx.beginPath(); ctx.roundRect(x - w / 2, y - h * .85, w * .66, h * .7, h * .06); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + w * .18, y - h * .62, w * .32, h * .47, h * .1); ctx.fill();
        ctx.fillStyle = '#0b0d0e';
        [-.28, .1, .36].forEach(function (k) { ctx.beginPath(); ctx.arc(x + k * w, y - h * .13, h * .13, 0, 6.3); ctx.fill(); });
      }
      ctx.restore();
    }
    function corners(b, color, label) {
      var l = Math.min(10, b.w * .3, b.h * .3);
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + l); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + l, b.y);
      ctx.moveTo(b.x + b.w - l, b.y); ctx.lineTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w, b.y + l);
      ctx.moveTo(b.x + b.w, b.y + b.h - l); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.lineTo(b.x + b.w - l, b.y + b.h);
      ctx.moveTo(b.x + l, b.y + b.h); ctx.lineTo(b.x, b.y + b.h); ctx.lineTo(b.x, b.y + b.h - l);
      ctx.stroke();
      ctx.globalAlpha = .12; ctx.fillStyle = color; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.globalAlpha = 1;
      ctx.font = '500 9px "JetBrains Mono", monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      var tw = ctx.measureText(label).width + 10, ly = Math.max(0, b.y - 15);
      ctx.fillStyle = color; ctx.fillRect(b.x, ly, tw, 14);
      ctx.fillStyle = '#0b0d0e'; ctx.fillText(label, b.x + 5, ly + 7.5);
      ctx.restore();
    }

    function tick(now) {
      requestAnimationFrame(tick);
      if (!visible) { last = now; return; }
      var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; t += dt;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var showBoxes = toggle.checked, alerting = false, i, e;

      for (i = 0; i < ents.length; i++) {
        e = ents[i];
        if (!e.held && !reduce) {
          e.x += e.vx * dt * depthScale(e.y); e.phase += dt * 7;
          if (e.x < 20) { e.x = 20; e.vx = Math.abs(e.vx); }
          if (e.x > W - 20) { e.x = W - 20; e.vx = -Math.abs(e.vx); }
        }
      }
      drawBg();
      ents.slice().sort(function (a, b) { return a.y - b.y; }).forEach(drawEntity);
      for (i = 0; i < ents.length; i++) if (ents[i].cls === 'person' && inZone(ents[i])) alerting = true;
      drawZone(alerting && showBoxes);

      if (showBoxes) {
        for (i = 0; i < ents.length; i++) {
          e = ents[i];
          var b = bboxOf(e), c = CLS[e.cls];
          if (!e.box) e.box = { x: b.x, y: b.y, w: b.w, h: b.h };
          e.box.x += (b.x - e.box.x) * .28; e.box.y += (b.y - e.box.y) * .28;
          e.box.w += (b.w - e.box.w) * .28; e.box.h += (b.h - e.box.h) * .28;
          var danger = e.cls === 'person' && inZone(e);
          corners(e.box, danger ? ALERT : c.color, e.cls + ' #' + e.id + (danger ? ' ⚠' : ''));
        }
      } else {
        for (i = 0; i < ents.length; i++) ents[i].box = null;
      }
      // scanlines
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      for (var y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

      countEl.textContent = 'objects ' + ents.length;
      alertEl.textContent = alerting && showBoxes ? '⚠ person in restricted zone' : '';
    }

    function pos(ev) { var r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
    function hit(p) {
      for (var i = ents.length - 1; i >= 0; i--) {
        var b = bboxOf(ents[i]);
        if (p.x > b.x - 8 && p.x < b.x + b.w + 8 && p.y > b.y - 8 && p.y < b.y + b.h + 8) return ents[i];
      }
      return null;
    }
    cv.addEventListener('pointerdown', function (ev) {
      var p = pos(ev), h = hit(p);
      if (h) { drag = h; h.held = true; cv.setPointerCapture(ev.pointerId); }
      else if (p.y > H * 0.38) spawn(ORDER[nextId % ORDER.length], p.x, p.y);
    });
    cv.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var p = pos(ev); drag.x = clamp(p.x, 14, W - 14); drag.y = clamp(p.y, H * 0.42, H - 4);
    });
    function release() { if (drag) { drag.held = false; drag.vx = (Math.random() < .5 ? -1 : 1) * CLS[drag.cls].speed * .8; drag = null; } }
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointercancel', release);

    size(); seed();
    window.addEventListener('resize', function () { size(); });
    observe(cv, function (v) { visible = v; if (v) size(); }, 0.1);
    requestAnimationFrame(tick);
  })();

  /* ==================================================================
     3 · EVIDENTIA — real SHA-256 integrity check
     ================================================================== */
  (function evidentia() {
    var txt = $('evText'), sealBtn = $('evSeal'), tamperBtn = $('evTamper'), drop = $('evDrop'), file = $('evFile');
    var sealedEl = $('evSealed'), nowEl = $('evNow'), statusEl = $('evStatus'), chip = $('evChip');
    if (!txt) return;

    var enc = new TextEncoder();
    var fileBytes = null, fileName = '', sealedHash = '', nowHash = '';

    function hex(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += (u8[i] < 16 ? '0' : '') + u8[i].toString(16); return s; }

    // Fallback so the demo still works where crypto.subtle is unavailable (e.g. plain http on a LAN).
    function sha256js(bytes) {
      var K = [], Hh = [], primes = [], n = 2, i, j;
      while (primes.length < 64) { var isP = true; for (j = 0; j < primes.length; j++) { if (n % primes[j] === 0) { isP = false; break; } } if (isP) primes.push(n); n++; }
      for (i = 0; i < 64; i++) K[i] = Math.floor((Math.pow(primes[i], 1 / 3) % 1) * 4294967296) >>> 0;
      for (i = 0; i < 8; i++) Hh[i] = Math.floor((Math.sqrt(primes[i]) % 1) * 4294967296) >>> 0;
      var l = bytes.length, bitLen = l * 8, padLen = (((l + 9 + 63) >> 6) << 6);
      var m = new Uint8Array(padLen); m.set(bytes); m[l] = 0x80;
      var dv = new DataView(m.buffer);
      dv.setUint32(padLen - 8, Math.floor(bitLen / 4294967296)); dv.setUint32(padLen - 4, bitLen >>> 0);
      var w = new Uint32Array(64);
      function rr(x, c) { return (x >>> c) | (x << (32 - c)); }
      for (var off = 0; off < padLen; off += 64) {
        for (i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
        for (i = 16; i < 64; i++) {
          var s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
          var s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
          w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }
        var a = Hh[0], b = Hh[1], c = Hh[2], d = Hh[3], e = Hh[4], f = Hh[5], g = Hh[6], h = Hh[7];
        for (i = 0; i < 64; i++) {
          var S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g);
          var t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
          var S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), maj = (a & b) ^ (a & c) ^ (b & c);
          var t2 = (S0 + maj) >>> 0;
          h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
        }
        Hh[0] = (Hh[0] + a) >>> 0; Hh[1] = (Hh[1] + b) >>> 0; Hh[2] = (Hh[2] + c) >>> 0; Hh[3] = (Hh[3] + d) >>> 0;
        Hh[4] = (Hh[4] + e) >>> 0; Hh[5] = (Hh[5] + f) >>> 0; Hh[6] = (Hh[6] + g) >>> 0; Hh[7] = (Hh[7] + h) >>> 0;
      }
      var out = new Uint8Array(32), odv = new DataView(out.buffer);
      for (i = 0; i < 8; i++) odv.setUint32(i * 4, Hh[i]);
      return out;
    }
    window.__sha256js = sha256js; // exposed for a self-check in the console

    function sha256(bytes) {
      if (window.crypto && crypto.subtle && crypto.subtle.digest) {
        return crypto.subtle.digest('SHA-256', bytes).then(function (d) { return hex(new Uint8Array(d)); }).catch(function () { return hex(sha256js(bytes)); });
      }
      return Promise.resolve(hex(sha256js(bytes)));
    }

    function paint(container, hash, ref) {
      if (!container.children.length) { for (var i = 0; i < 64; i++) container.appendChild(document.createElement('b')); }
      var diff = 0;
      for (var k = 0; k < 64; k++) {
        var c = container.children[k], ch = hash ? hash[k] : '·';
        if (c.textContent !== ch) c.textContent = ch;
        var isDiff = !!(ref && hash && ref[k] !== hash[k]);
        c.classList.toggle('diff', isDiff);
        if (isDiff) diff++;
      }
      return diff;
    }

    function currentBytes() { return fileBytes ? fileBytes : enc.encode(txt.value); }

    function compare() {
      var diff = paint(nowEl, nowHash, sealedHash);
      paint(sealedEl, sealedHash, null);
      if (!sealedHash) { statusEl.className = 'ev__status'; statusEl.textContent = 'Nothing sealed yet'; return; }
      if (diff === 0) { statusEl.className = 'ev__status ok'; statusEl.textContent = 'Intact — digests match'; }
      else { statusEl.className = 'ev__status bad'; statusEl.textContent = 'Tampered — ' + diff + ' of 64 characters changed'; }
    }
    function refresh() { return sha256(currentBytes()).then(function (h) { nowHash = h; compare(); }); }
    function seal() { return sha256(currentBytes()).then(function (h) { sealedHash = h; nowHash = h; compare(); }); }

    function setFile(f) {
      if (!f) return;
      f.arrayBuffer().then(function (buf) {
        fileBytes = new Uint8Array(buf); fileName = f.name;
        chip.hidden = false; chip.textContent = '📎 ' + f.name + ' · ' + f.size.toLocaleString() + ' bytes — hashed locally, never uploaded';
        refresh();
      });
    }
    function clearFile() { fileBytes = null; chip.hidden = true; }

    txt.addEventListener('input', function () { clearFile(); refresh(); });
    sealBtn.addEventListener('click', seal);
    tamperBtn.addEventListener('click', function () {
      if (fileBytes) {
        var copy = new Uint8Array(fileBytes); var idx = Math.floor(Math.random() * copy.length); copy[idx] ^= 1; fileBytes = copy;
      } else {
        var v = txt.value; if (!v) v = 'x';
        var i = Math.floor(Math.random() * v.length), ch = v[i];
        var rep = /[a-z]/.test(ch) ? ch.toUpperCase() : /[A-Z]/.test(ch) ? ch.toLowerCase() : /\d/.test(ch) ? String((+ch + 1) % 10) : '*';
        txt.value = v.slice(0, i) + rep + v.slice(i + 1);
      }
      refresh();
    });
    file.addEventListener('change', function () { setFile(file.files[0]); file.value = ''; });
    ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; setFile(f); });
    // let the whole demo panel accept a drop too
    var win = $('demoEvidentia');
    win.addEventListener('dragover', function (e) { e.preventDefault(); });
    win.addEventListener('drop', function (e) { e.preventDefault(); var f = e.dataTransfer && e.dataTransfer.files[0]; setFile(f); });

    seal();
  })();

})();
