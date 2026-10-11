/* =====================================================================
   main — smooth scroll, intro, text reveals, scroll-driven sections,
   figure windows for the pixel field, pixel wipes, runner track, cursor.
   Light theme only.
   ===================================================================== */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  // If the animation libraries failed to load, show a plain page instead of a stuck loader.
  function showPlain() { html.classList.remove('is-loading'); var l = $('#loader'); if (l) l.style.display = 'none'; }
  if (!window.gsap || !window.ScrollTrigger) { showPlain(); return; }
  gsap.registerPlugin(ScrollTrigger);
  var Pixel = window.Pixel, Field = window.Field;
  // safety net: never leave the page hidden if the intro stalls
  setTimeout(function () { html.classList.remove('is-loading'); }, 9000);

  var MOTTO = 'Turning customer noise into product decisions.';

  /* ------------------------------------------------------------------
     text splitting
     ------------------------------------------------------------------ */
  function wrapWords(root) {
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var i = document.createElement('span'); i.className = 'wi'; i.textContent = p;
            w.appendChild(i); frag.appendChild(w); out.push(i);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) { walk(n); }
      });
    })(root);
    return out;
  }
  function wrapChars(el) {
    var txt = el.textContent, out = [];
    el.textContent = '';
    Array.from(txt).forEach(function (ch) {
      if (ch === ' ') { var sp = document.createElement('span'); sp.className = 'sp'; el.appendChild(sp); return; }
      var w = document.createElement('span'); w.className = 'ch';
      var i = document.createElement('span'); i.className = 'ci'; i.textContent = ch;
      w.appendChild(i); el.appendChild(w); out.push(i);
    });
    return out;
  }

  /* ------------------------------------------------------------------
     smooth scroll (Lenis) wired into GSAP's ticker
     ------------------------------------------------------------------ */
  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollNow(y) { if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); }
  // short hops glide; long jumps dissolve through a pixel wipe instead of scrolling past 10k px of page
  function jumpTo(y) {
    var dist = Math.abs(y - window.pageYOffset);
    if (dist > window.innerHeight * 1.4 && !reduce) { Pixel.Wipe.run(function () { scrollNow(y); }); return; }
    if (lenis) lenis.scrollTo(y, { duration: 1.4, easing: function (x) { return 1 - Math.pow(1 - x, 4); } });
    else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  function topOf(el) { return el.getBoundingClientRect().top + window.pageYOffset; }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'); if (id.length < 2) return;
      var t = $(id); if (!t) return;
      e.preventDefault(); jumpTo(id === '#hero' ? 0 : topOf(t));
    });
  });

  /* ------------------------------------------------------------------
     pixel field — it draws inside each chapter's figure window
     ------------------------------------------------------------------ */
  var chapters = $$('[data-chapter]');
  var figEls = chapters.map(function (c) { return $('.figure__win', c); });
  function updateFigures() {
    var phone = window.innerWidth <= 1000;
    Field.setFigures(figEls.map(function (el, i) {
      if (!el) return null;
      var r = el.getBoundingClientRect();
      var base = parseFloat((el.closest('.figure') || el).getAttribute('data-dim') || '1');   // per-figure strength
      // on phones the Spyne pixel field sits behind the text, so dim it further
      return { x: r.left, y: r.top, w: r.width, h: r.height, dim: base * (phone && i === 2 ? 0.42 : 1) };
    }));
  }
  if (Field) {
    Field.init();
    gsap.ticker.add(function () { updateFigures(); Field.frame(performance.now()); });
  }
  var tops = [];
  function computeBounds() {
    var y = window.pageYOffset;
    tops = chapters.map(function (c) { return c.getBoundingClientRect().top + y; });
    if (Field) Field.setBounds(tops);
    Pixel.Track.layout(tops, Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
  }
  ScrollTrigger.addEventListener('refresh', computeBounds);
  window.addEventListener('resize', computeBounds);
  if (lenis && Field) lenis.on('scroll', function (e) { Field.setScroll(e.velocity || 0); });

  /* ------------------------------------------------------------------
     pixel track + trail + static sprites
     ------------------------------------------------------------------ */
  var activeIdx = 0;
  Pixel.Track.init(chapters.map(function (c) { return c.dataset.chapter; }), function (i) { jumpTo(i === 0 ? 0 : tops[i]); });
  gsap.ticker.add(function () {
    Pixel.Track.update(window.pageYOffset, Math.max(1, document.documentElement.scrollHeight - window.innerHeight), activeIdx);
  });
  Pixel.drawStatic();

  /* ------------------------------------------------------------------
     masthead: the letters thicken once, on landing, then stay put
     ------------------------------------------------------------------ */
  var nameChars = wrapChars($('#heroName .line'));
  var mottoWords = wrapWords($('#motto p'));
  var NAME_WGHT = 780;
  function setWeight(c, v) { c.style.fontVariationSettings = '"wght" ' + Math.round(v); }
  nameChars.forEach(function (c) { setWeight(c, reduce ? NAME_WGHT : 420); });

  /* ------------------------------------------------------------------
     intro: the noise assembles the name, types the motto under it, then
     bursts into the front page
     ------------------------------------------------------------------ */
  gsap.set(nameChars, { yPercent: 115 });
  gsap.set(mottoWords, { yPercent: 115 });
  gsap.set('.mark', { backgroundSize: '0% 100%' });
  gsap.set(['.dateline', '.ticker', '.front'], { opacity: 0, y: 18 });
  gsap.set(['.nav', '.track'], { opacity: 0 });
  if (lenis) lenis.stop();

  function heroIntro() {
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(nameChars, { yPercent: 0, duration: 1.3, stagger: 0.055 }, 0.1)
      .to(mottoWords, { yPercent: 0, duration: 1, stagger: 0.05 }, 0.75)
      .to('.mark', { backgroundSize: '100% 100%', duration: 0.9, ease: 'steps(12)' }, 1.5)
      .to(['.dateline', '.ticker', '.front'], { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, 0.7)
      .to(['.nav', '.track'], { opacity: 1, duration: 1 }, 0.9)
      .add(function () { if (window.Portrait) Portrait.play(0); }, 0.9)
      .add(function () { if (lenis) lenis.start(); ScrollTrigger.refresh(); }, 1.2);
    if (!reduce) nameChars.forEach(function (c, i) {
      var o = { v: 420 };
      tl.to(o, { v: NAME_WGHT, duration: 1.4, ease: 'power2.out', onUpdate: function () { setWeight(c, o.v); } }, 0.35 + i * 0.07);
    });
  }
  (function loader() {
    var num = $('#loadNum'), barEl = $('#loadBar'), msg = $('#loadMsg'), hint = $('#loadHint'), quote = $('#loadQuote'), el = $('#loader');
    var seen = false;
    try { seen = sessionStorage.getItem('ar-seen') === '1'; } catch (e) {}
    function skip() { el.style.display = 'none'; html.classList.remove('is-loading'); gsap.delayedCall(0.1, heroIntro); }
    if (seen || reduce || /[?&]skip\b/.test(location.search) || !Field) { skip(); return; }
    try { sessionStorage.setItem('ar-seen', '1'); } catch (e) {}

    var cells = [], i;
    for (i = 0; i < 24; i++) { var c = document.createElement('i'); barEl.appendChild(c); cells.push(c); }
    var msgs = ['Setting the type…', 'Cleaning the data…', 'Finding the pattern…', 'Going to press.'];
    var started = false, cur = document.createElement('span');
    cur.className = 'cur';
    function begin() {
      if (started) return; started = true;
      Field.intro.start();
      quote.style.top = (Field.intro.bottom() + 30) + 'px';   // sits right under the pixel name
      var o = { v: 0 };
      gsap.to(o, {
        v: 100, duration: 3, ease: 'power1.inOut',
        onUpdate: function () {
          var v = Math.round(o.v);
          num.textContent = v;
          for (var k = 0; k < cells.length; k++) cells[k].classList.toggle('on', k < Math.round(o.v / 100 * cells.length));
          msg.textContent = msgs[Math.min(3, Math.floor(o.v / 26))];
          Field.intro.set(o.v / 78);
          if (o.v > 78) hint.textContent = 'pattern found';
          // the motto types itself in under the name
          var n = Math.round(clamp((o.v - 42) / 50, 0, 1) * MOTTO.length);
          quote.textContent = MOTTO.slice(0, n); quote.appendChild(cur);
        },
        onComplete: finish
      });
    }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function finish() {
      quote.textContent = MOTTO; quote.appendChild(cur);
      gsap.delayedCall(0.55, function () {
        Field.intro.release();
        html.classList.remove('is-loading');
        gsap.to(el, { opacity: 0, duration: 0.5, ease: 'steps(5)', onComplete: function () { el.style.display = 'none'; } });
        heroIntro();
      });
    }
    // wait for fonts so the name is sampled in the right typeface, but never stall
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(begin, 60); });
    setTimeout(begin, 2200);
  })();

  /* ------------------------------------------------------------------
     reveals
     ------------------------------------------------------------------ */
  $$('[data-reveal]').forEach(function (el) {
    var words = wrapWords(el);
    gsap.from(words, { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  $$('[data-fade]').forEach(function (el) {
    gsap.from(el, { y: 30, opacity: 0, duration: 0.9, ease: 'steps(7)', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });

  /* ------------------------------------------------------------------
     feature: scroll-driven steps beside the pixel-field figure
     ------------------------------------------------------------------ */
  var steps = $$('.step'), ticks = $$('#rail li'), panels = $$('#panels .panel'), dashPaths = $$('#dash path'), cur = -1;

  gsap.set(steps, { autoAlpha: 0 });
  gsap.set(panels, { autoAlpha: 0, y: 16 });
  function showCard(card, on) { gsap.to(card, { autoAlpha: on ? 1 : 0, y: on ? 0 : 16, duration: 0.45, ease: 'steps(5)', overwrite: 'auto' }); }
  function setStep(n) {
    if (n === cur) return;
    var prev = cur; cur = n;
    steps.forEach(function (s, i) {
      if (i === n) {
        var h = $('h3', s), p = $('p', s), num = $('.step__n', s);
        gsap.set(s, { autoAlpha: 1, y: 0 });
        gsap.fromTo([num, h, p], { y: prev < n ? 46 : -46, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.07, overwrite: true });
      } else if (i === prev) {
        gsap.to(s, { autoAlpha: 0, duration: 0.25, overwrite: 'auto' });
      } else {
        gsap.set(s, { autoAlpha: 0 });
      }
    });
    ticks.forEach(function (t, i) { t.classList.toggle('on', i <= n); });
    if (Field) Field.setSettle(n / 4);   // the pixel field settles into order as the steps advance
    panels.forEach(function (p, i) { showCard(p, i === n); });
    if (n === 4) gsap.fromTo(dashPaths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: 'steps(14)', stagger: 0.18, delay: 0.25 });
  }
  setStep(0);
  ScrollTrigger.create({
    trigger: '#expPin', start: 'top top', end: 'bottom bottom',
    onUpdate: function (self) { setStep(Math.min(4, Math.floor(self.progress * 5))); }
  });

  // previous role: bars grow
  gsap.from('#bars i', { scaleY: 0, duration: 1.1, ease: 'steps(9)', stagger: 0.07, scrollTrigger: { trigger: '#bars', start: 'top 85%', once: true } });

  /* ------------------------------------------------------------------
     projects: cards stack and recede
     ------------------------------------------------------------------ */
  var cards = $$('.card');
  cards.forEach(function (c, i) {
    if (i === cards.length - 1) return;
    gsap.to(c, { scale: 0.95, opacity: 0.4, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top 80%', end: 'top 22%', scrub: true } });
  });

  /* ------------------------------------------------------------------
     classifieds: items pop in; honours "unlock"
     ------------------------------------------------------------------ */
  // fromTo (not from): these items carry CSS transitions, so GSAP must not read their end values mid-fade
  gsap.fromTo('.skill, .quest', { opacity: 0, scale: 0.5 }, {
    opacity: 1, scale: 1, duration: 0.5, ease: 'steps(4)', stagger: { each: 0.012, from: 'random' },
    clearProps: 'opacity,scale,transform',
    scrollTrigger: { trigger: '#quests', start: 'top 85%', once: true }
  });
  $$('[data-ach]').forEach(function (card) {
    var spr = $('canvas', card);
    ScrollTrigger.create({
      trigger: card, start: 'top 88%', once: true,
      onEnter: function () {
        gsap.from(card, { x: -70, opacity: 0, duration: 0.8, ease: 'steps(8)' });
        card.classList.add('is-new');
        // odd number of blinks so the sprite ends visible; clearProps hands control back to CSS
        gsap.fromTo(spr, { opacity: 0 }, { opacity: 1, duration: 0.14, repeat: 4, yoyo: true, ease: 'steps(1)', delay: 0.5, clearProps: 'opacity' });
        gsap.delayedCall(2.2, function () { card.classList.remove('is-new'); });
      }
    });
  });

  /* ------------------------------------------------------------------
     education: how much of the degree's calendar time has elapsed
     ------------------------------------------------------------------ */
  (function () {
    var start = new Date(2023, 7, 1).getTime(), end = new Date(2027, 6, 31).getTime(), now = Date.now();
    var pct = Math.max(0, Math.min(1, (now - start) / (end - start)));
    var bar = $('#eduCells'), label = $('#eduPct'), cells = [], N = 60, i;
    for (i = 0; i < N; i++) { var c = document.createElement('i'); bar.appendChild(c); cells.push(c); }
    var lit = Math.round(pct * N);
    ScrollTrigger.create({
      trigger: '.timeline', start: 'top 92%', once: true,
      onEnter: function () {
        var o = { v: 0 };
        gsap.to(o, {
          v: 1, duration: 1.8, ease: 'steps(30)',
          onUpdate: function () {
            var n = Math.round(o.v * lit);
            for (var k = 0; k < N; k++) cells[k].classList.toggle('on', k < n);
            label.textContent = Math.round(o.v * pct * 100) + '% of the timeline elapsed';
          }
        });
      }
    });
  })();

  /* ------------------------------------------------------------------
     ticker: drifts, speeds up and reverses with your scroll
     ------------------------------------------------------------------ */
  (function () {
    var tk = $('#ticker'), set = $('.ticker__set', tk), x = 0, dir = -1, w = 0;
    function measure() { w = set.offsetWidth; }
    measure(); window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    if (reduce) return;
    gsap.ticker.add(function (time, dt) {
      var v = lenis ? lenis.velocity : 0;
      if (v > 0.4) dir = -1; else if (v < -0.4) dir = 1;
      x += dir * (50 + Math.min(900, Math.abs(v) * 45)) * dt / 1000;
      if (w) { if (x <= -w) x += w; if (x > 0) x -= w; }
      tk.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    });
  })();

  /* ------------------------------------------------------------------
     nav state, active chapter
     ------------------------------------------------------------------ */
  var navLinks = $$('.nav__links a');
  chapters.forEach(function (sec, i) {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: function (self) {
        if (!self.isActive) return;
        activeIdx = i;
        navLinks.forEach(function (a) { a.classList.toggle('is-on', a.dataset.sec === sec.id); });
      }
    });
  });

  /* ------------------------------------------------------------------
     contact bits
     ------------------------------------------------------------------ */
  var toast = $('#toast'), toastT;
  function showToast(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('show'); }, 2000);
  }
  $('#mail').addEventListener('click', function () {
    var addr = this.dataset.email, hint = $('#mailHint');
    function done() { hint.textContent = 'Copied ✓'; showToast('Email copied to clipboard'); setTimeout(function () { hint.textContent = 'Click to copy'; }, 2200); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(addr).then(done, function () { window.location.href = 'mailto:' + addr; });
    } else {
      var ta = document.createElement('textarea'); ta.value = addr; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (ok) done(); else window.location.href = 'mailto:' + addr;
    }
  });

  var clock = $('#clock');
  function tickClock() {
    try {
      var f = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
      clock.textContent = 'Gurugram · ' + f.format(new Date()) + ' IST';
    } catch (e) { clock.textContent = 'Gurugram, India'; }
  }
  tickClock(); setInterval(tickClock, 20000);

  /* ------------------------------------------------------------------
     layout settling
     ------------------------------------------------------------------ */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  computeBounds();
})();
