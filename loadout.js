/* =====================================================================
   Loadout — skills, with receipts.
   Each skill is a procedurally generated pixel sprite. Tap one to light up
   the role or project it was used in; tap a role / project to light up its
   skills. Click only: nothing reacts to hover.

   The links between skills and roles/projects below come ONLY from what
   the résumés say (a project's "Tech:" line, or an explicit bullet).
   A skill with no `[…]` isn't tied to a single item, so it lights up none
   instead of guessing. Edit SKILLS to change the mapping.
   ===================================================================== */
(function () {
  'use strict';

  var inv = document.getElementById('inv');
  var questBox = document.getElementById('quests');
  if (!inv || !questBox || !window.Pixel) return;

  var QUESTS = {
    spyne:     { name: 'Spyne',            sub: 'PM Intern' },
    mdtresy:   { name: 'MDTRESY',          sub: 'Data Analytics' },
    nexpilot:  { name: 'Nexpilot AI',      sub: 'Project' },
    detect:    { name: 'Object Detection', sub: 'Project' },
    evidentia: { name: 'Evidentia',        sub: 'Project' }
  };

  var GROUPS = [
    { k: 'p', name: 'Product & Business', v: '--signal' },
    { k: 'a', name: 'Analytics & Tools',  v: '--aqua' },
    { k: 'i', name: 'AI & Technology',    v: '--lime' },
    { k: 't', name: 'Programming & Tools', v: '--ink' }
  ];

  // [skill, group, [roles / projects it was used in]]
  var SKILLS = [
    // Product & Business
    ['Product Implementation', 'p', ['spyne']], ['CRM', 'p', ['spyne']], ['DMS', 'p', ['spyne']], ['Inventory Management', 'p', ['spyne']],
    ['Requirements Gathering', 'p', ['spyne']], ['Client Discovery', 'p', ['spyne']], ['Stakeholder Management', 'p', ['spyne', 'mdtresy']],
    ['Business Analysis', 'p', ['spyne']], ['Process Improvement', 'p', ['spyne']], ['Cross-functional Collaboration', 'p', ['spyne']],
    ['Feature Ownership', 'p', ['spyne']], ['Performance Metrics', 'p', ['spyne']], ['Campaign Planning', 'p', []],
    // Analytics & Tools
    ['Python', 'a', ['mdtresy', 'nexpilot', 'detect']], ['SQL', 'a', []], ['Pandas', 'a', ['mdtresy']], ['NumPy', 'a', ['mdtresy', 'detect']],
    ['Power BI', 'a', ['mdtresy']], ['Data Analysis', 'a', ['spyne', 'mdtresy']], ['Data Visualization', 'a', ['spyne', 'mdtresy']],
    ['Funnel Analysis', 'a', []], ['Performance Analytics', 'a', ['spyne']], ['Predictive Modeling', 'a', []],
    // AI & Technology
    ['Generative AI', 'i', []], ['Machine Learning', 'i', ['detect']], ['NLP', 'i', []], ['Agentic AI', 'i', ['nexpilot']],
    ['AI Workflow Automation', 'i', ['nexpilot']], ['LLM Prompt Engineering', 'i', []], ['Computer Vision', 'i', ['detect']],
    ['YOLOv8', 'i', ['detect']], ['OpenCV', 'i', ['detect']], ['TensorFlow', 'i', []], ['Scikit-learn', 'i', []],
    ['RESTful APIs', 'i', ['nexpilot']], ['FastAPI', 'i', ['nexpilot']], ['React.js', 'i', ['nexpilot']], ['Next.js', 'i', ['nexpilot']],
    // Programming & Tools
    ['Java', 't', []], ['C', 't', []], ['JavaScript', 't', ['evidentia']], ['TypeScript', 't', ['nexpilot']], ['HTML', 't', ['evidentia']],
    ['CSS', 't', ['evidentia']], ['Cryptography', 't', ['evidentia']], ['MySQL', 't', []], ['SQLite', 't', ['nexpilot']],
    ['Git', 't', []], ['GitHub', 't', []], ['Vercel', 't', []], ['Render', 't', []]
  ];

  /* ------------------------------------------------------------------
     build the DOM
     ------------------------------------------------------------------ */
  var skillEls = [], questEls = {};

  Object.keys(QUESTS).forEach(function (id) {
    var q = QUESTS[id], b = document.createElement('button');
    b.type = 'button'; b.className = 'quest'; b.setAttribute('data-q', id);
    b.innerHTML = q.name + '<small>' + q.sub + '</small>';
    questBox.appendChild(b); questEls[id] = b;
  });

  GROUPS.forEach(function (g) {
    var bag = document.createElement('section');
    bag.className = 'inv__bag'; bag.style.setProperty('--c', 'var(' + g.v + ')');
    var count = SKILLS.filter(function (s) { return s[1] === g.k; }).length;
    bag.innerHTML = '<div class="inv__title mono">' + g.name + '<small>' + count + '</small></div><div class="inv__grid"></div>';
    var grid = bag.querySelector('.inv__grid');
    SKILLS.forEach(function (s, idx) {
      if (s[1] !== g.k) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'skill'; b.setAttribute('data-i', idx);
      b.style.setProperty('--c', 'var(' + g.v + ')');
      var cv = document.createElement('canvas');
      cv.className = 'sprite'; cv.width = 7; cv.height = 7; cv.setAttribute('aria-hidden', 'true');
      var span = document.createElement('span'); span.textContent = s[0];
      b.appendChild(cv); b.appendChild(span);
      grid.appendChild(b);
      window.Pixel.skillSprite(cv, s[0], g.v);
      skillEls[idx] = b;
    });
    inv.appendChild(bag);
  });

  /* ------------------------------------------------------------------
     selection state
     ------------------------------------------------------------------ */
  var pinned = null;   // {type, key} set by click / tap
  function apply(sel) {
    var i, id;
    skillEls.forEach(function (el) { if (el) el.classList.remove('is-sel', 'is-hot', 'is-dim'); });
    Object.keys(questEls).forEach(function (k) { questEls[k].classList.remove('is-sel', 'is-hot', 'is-dim'); });
    if (sel && sel.type === 'skill') {
      var s = SKILLS[sel.key];
      skillEls[sel.key].classList.add('is-sel');
      Object.keys(questEls).forEach(function (k) { questEls[k].classList.add(s[2].indexOf(k) !== -1 ? 'is-hot' : 'is-dim'); });
    } else if (sel && sel.type === 'quest') {
      questEls[sel.key].classList.add('is-sel');
      for (i = 0; i < SKILLS.length; i++) {
        if (!skillEls[i]) continue;
        skillEls[i].classList.add(SKILLS[i][2].indexOf(sel.key) !== -1 ? 'is-hot' : 'is-dim');
      }
    }
  }

  function togglePin(sel) {
    pinned = (pinned && pinned.type === sel.type && pinned.key === sel.key) ? null : sel;
    apply(pinned);
  }

  function bind(el, sel) {
    el.addEventListener('click', function () { togglePin(sel); });
  }
  skillEls.forEach(function (el, idx) { if (el) bind(el, { type: 'skill', key: idx }); });
  Object.keys(questEls).forEach(function (id) { bind(questEls[id], { type: 'quest', key: id }); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pinned) { pinned = null; apply(null); } });

  apply(null);

  window.Loadout = { count: SKILLS.length };
})();
