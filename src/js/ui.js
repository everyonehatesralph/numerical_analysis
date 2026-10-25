/* ui.js — DOM helpers, saved progress, the step-by-step player,
   inputs, tables and the practice checker shared by every topic. */
(function (root) {
  'use strict';
  const NM = root.NM;
  const E = NM.E;
  const UI = (NM.UI = {});

  /* ---------- tiny DOM helper ---------- */
  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, kid) {
    if (kid === null || kid === undefined || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach((k) => append(el, k)); return; }
    el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  UI.h = h;
  UI.html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content; };

  /* ---------- math snippets ---------- */
  const M = (UI.M = {});
  M.v = (name, idx) => '<i>' + name + '</i>' + (idx !== undefined && idx !== '' ? '<sub>' + idx + '</sub>' : '');
  M.fr = (a, b) => '<span class="fr"><span>' + a + '</span><span>' + b + '</span></span>';
  M.n = (x, dp) => E.fmtShort(x, dp === undefined ? UI.dp() : dp);
  M.nf = (x, dp) => E.fmt(x, dp === undefined ? UI.dp() : dp);
  M.paren = (s) => (/^[−-]/.test(s) ? '(' + s + ')' : s);
  M.res = (s) => '<span class="res">' + s + '</span>';
  M.sign = (v) => (v > 0 ? '<span class="sign pos" title="positive">+</span>' : v < 0 ? '<span class="sign neg" title="negative">−</span>' : '<span class="sign zero">0</span>');
  M.signWord = (v) => (v > 0 ? 'positive' : v < 0 ? 'negative' : 'zero');

  /* ---------- saved data (works offline, survives closing the browser) ---------- */
  const PREFIX = 'nmr1:';
  const Store = (UI.store = {
    get(k, d) { try { const v = localStorage.getItem(PREFIX + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ } },
  });

  UI.settings = Object.assign({ dp: 6, theme: 'auto', size: 'normal' }, Store.get('settings', {}));
  // v2: the theme follows the phone's light/dark setting unless the student picks one later
  if (!UI.settings.v) { UI.settings.theme = 'auto'; UI.settings.v = 2; }
  UI.dp = () => UI.settings.dp;
  UI.saveSettings = () => Store.set('settings', UI.settings);
  UI.applySize = () => {
    if (UI.settings.size === 'normal') document.documentElement.removeAttribute('data-size');
    else document.documentElement.setAttribute('data-size', UI.settings.size);
  };
  // A host page (like the claude.ai viewer) may set its own theme; "auto" gives that back.
  const HOST_THEME = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;
  const DARK_MQ = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  const PAGE_BG = { light: '#fbfbfa', dark: '#191919' };
  UI.isDark = () => {
    const a = document.documentElement.getAttribute('data-theme');
    return a ? a === 'dark' : !!(DARK_MQ && DARK_MQ.matches);
  };
  UI.applyTheme = () => {
    const t = UI.settings.theme, rootEl = document.documentElement;
    if (t !== 'auto') rootEl.setAttribute('data-theme', t);
    else if (HOST_THEME) rootEl.setAttribute('data-theme', HOST_THEME);
    else rootEl.removeAttribute('data-theme');
    const mode = UI.isDark() ? 'dark' : 'light';
    // the tab icon and the phone's status bar follow the theme too
    const svgIcon = document.getElementById('favicon'), pngIcon = document.getElementById('favicon-png');
    if (svgIcon) svgIcon.href = 'data:image/svg+xml,' + encodeURIComponent(UI.logo(LOGO_COLORS[mode]));
    if (pngIcon) pngIcon.href = mode === 'dark' ? 'favicon-32-dark.png' : 'favicon-32.png';
    const following = t === 'auto' && !HOST_THEME;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.setAttribute('content', following ? PAGE_BG[/dark/.test(m.media) ? 'dark' : 'light'] : PAGE_BG[mode]);
    });
    // graphs are drawn on canvas, so they repaint with the new colours
    document.querySelectorAll('canvas').forEach((cv) => cv._plot && cv._plot.render());
  };
  // flipping dark mode on the phone (Control Center, or sunset) restyles the open page in place
  if (DARK_MQ && DARK_MQ.addEventListener) DARK_MQ.addEventListener('change', () => { if (UI.settings.theme === 'auto') UI.applyTheme(); });

  /* ---------- logo: a smooth curve through three points, the last one yellow like a boxed answer ---------- */
  const LOGO_COLORS = {
    light: { tile: '#111111', ink: '#fbfbfa', hl: '#f2c94c' },
    dark: { tile: '#ededec', ink: '#191919', hl: '#d4961f' },
  };
  // c = explicit colours (tab icon); without it, .logo in styles.css paints it in the page's theme colours
  UI.logo = (c) => {
    const a = (attrs) => (c ? ' ' + attrs : '');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"' + (c ? '' : ' class="logo" aria-hidden="true"') + '>' +
      '<rect width="64" height="64" rx="14"' + a('fill="' + (c && c.tile) + '"') + '/>' +
      '<path d="M12 42C15 30 19 22 24 22S35 42 40 42S49 34 52 22" fill="none" stroke-width="3.8" stroke-linecap="round"' + a('stroke="' + (c && c.ink) + '"') + '/>' +
      '<g' + a('fill="' + (c && c.ink) + '"') + '><circle cx="12" cy="42" r="4"/><circle cx="32" cy="32" r="4"/></g>' +
      '<circle class="hl" cx="52" cy="22" r="5"' + a('fill="' + (c && c.hl) + '"') + '/></svg>';
  };

  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const Prog = (UI.progress = {
    all() { return Store.get('progress', {}); },
    get(id) { return Object.assign({ walked: false, solved: 0, clean: 0, tries: 0, streak: 0, wrong: 0 }, this.all()[id] || {}); },
    patch(id, fnc) {
      const all = this.all();
      const cur = this.get(id);
      all[id] = Object.assign(cur, fnc(cur));
      all[id].last = Date.now();
      Store.set('progress', all);
      const days = Store.get('days', []);
      if (days[days.length - 1] !== today()) { days.push(today()); Store.set('days', days.slice(-400)); }
      UI.refreshNav && UI.refreshNav();
    },
    level(id) {
      const p = this.get(id);
      if (p.clean >= 8 && p.streak >= 3) return 3;
      if (p.clean >= 3) return 2;
      if (p.walked || p.solved > 0) return 1;
      return 0;
    },
    dayStreak() {
      const days = Store.get('days', []);
      if (!days.length) return 0;
      const set = new Set(days);
      let n = 0;
      const d = new Date();
      if (!set.has(today())) d.setDate(d.getDate() - 1);
      for (;;) {
        const k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        if (!set.has(k)) break;
        n++; d.setDate(d.getDate() - 1);
      }
      return n;
    },
  });
  UI.stars = (id) => {
    const lv = Prog.level(id);
    return h('span', { class: 'stars', title: ['Not started', 'Started', 'Getting it (3+ clean solves)', 'Mastered'][lv] },
      [1, 2, 3].map((k) => h('i', { class: k <= lv ? 'on' : '' })));
  };

  let toastTimer = null;
  UI.toast = (msg) => {
    let t = document.querySelector('.toast');
    if (!t) { t = h('div', { class: 'toast', role: 'status' }); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  };

  /* ---------- callouts & sections ---------- */
  UI.callout = (kind, title, body) => h('div', { class: 'callout ' + kind }, title ? h('h3', { html: title }) : null, typeof body === 'string' ? h('div', { html: body }) : body);
  UI.section = (title, tag) => h('div', { class: 'section-title' }, h('h2', { html: title }), tag ? h('span', { class: 'tag', text: tag }) : null);
  UI.recipe = (items) => h('ol', { class: 'recipe' }, items.map((s) => h('li', { html: s })));

  /* ---------- table ---------- */
  UI.table = (head, rows, opt) => {
    opt = opt || {};
    const thead = h('thead', null, h('tr', null, head.map((c, i) => h('th', { html: c, class: (opt.align && opt.align[i]) || null }))));
    const trs = rows.map((r, k) => h('tr', { class: opt.rowClass ? opt.rowClass(k) : null }, r.map((c, i) => h('td', { html: c === undefined || c === null ? '' : String(c), class: (opt.align && opt.align[i]) || null }))));
    const table = h('table', { class: 't' }, thead, h('tbody', null, trs));
    const wrap = h('div', { class: 'tbl-wrap' }, table);
    return {
      el: wrap, table, trs,
      focus(k, hideFuture) {
        trs.forEach((tr, j) => {
          tr.classList.toggle('cur', j === k);
          tr.classList.toggle('future', !!hideFuture && j > k);
        });
      },
    };
  };

  /* "aᵢ" style plain text from header HTML, for phone card labels */
  const SUBMAP = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', n: 'ₙ', '+': '₊', '−': '₋', '-': '₋' };
  UI.plain = (html) => String(html)
    .replace(/<sub>(.*?)<\/sub>/g, (m, s) => s.replace(/<[^>]+>/g, '').split('').map((c) => SUBMAP[c] || c).join(''))
    .replace(/<sup>(.*?)<\/sup>/g, (m, s) => '^' + s.replace(/<[^>]+>/g, ''))
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

  /* ---------- Board: a written solution, revealed one step at a time ----------
     sol = { steps: [{ title, text, lines: [html], node, table: {head, rows, align}, note }], answer: [html] }
     opt.reveal: 'step' (start with step 1) | 'all' | 'none' (start hidden, with a Start button) */
  UI.board = (parent, sol, opt) => {
    opt = opt || {};
    const steps = sol.steps || [];
    const wrap = h('div', { class: 'board-wrap' });
    const ol = h('ol', { class: 'board' });
    // a long line may break only before an "=", like continuing a calculation on the next line
    const bal = (s) => (s.match(/<[a-z][^>]*>/gi) || []).length - (s.match(/<\/[a-z]+>/gi) || []).length;
    const lineHTML = (l) => {
      const segs = [];
      let cur = null, depth = 0;
      String(l).split(' = ').forEach((p, k) => {
        cur = cur === null ? (k ? '= ' : '') + p : cur + ' = ' + p;
        depth += bal(p);
        if (depth <= 0) { segs.push(cur); cur = null; depth = 0; }
      });
      if (cur !== null) segs.push(cur);
      return segs.map((s) => '<span class="sg">' + s + '</span>').join(' ');
    };
    const nodes = steps.map((s, k) => h('li', { class: 'bstep' },
      h('div', { class: 'bnum', text: k + 1 }),
      h('div', { class: 'bbody' },
        s.title ? h('div', { class: 'btitle', html: s.title }) : null,
        s.text ? h('p', { html: s.text }) : null,
        (s.lines || []).map((l) => h('div', { class: 'ln', html: lineHTML(l) })),
        s.table ? UI.table(s.table.head, s.table.rows, { align: s.table.align }).el : null,
        s.node || null,
        s.note ? h('div', { class: 'bnote', html: s.note }) : null)));
    const answer = sol.answer && sol.answer.length ? h('div', { class: 'answer' }, h('div', { class: 'kicker', text: 'Answer' }), sol.answer.map((l) => h('div', { class: 'ln', html: lineHTML(l) }))) : null;
    const ctrl = h('div', { class: 'board-ctrl' });
    wrap.append(ol);
    if (answer) wrap.append(answer);
    wrap.append(ctrl);
    parent.appendChild(wrap);
    let shown = opt.reveal === 'all' ? steps.length : opt.reveal === 'none' ? 0 : 1;
    let onScreen = 0;
    const render = (scroll) => {
      // add only the newly revealed steps (staggered), so earlier ones don't replay their entrance
      if (shown < onScreen) nodes.slice(shown, onScreen).forEach((n) => n.remove());
      else nodes.slice(onScreen, shown).forEach((n, j) => { n.style.setProperty('--i', Math.min(j, 12)); ol.appendChild(n); });
      onScreen = shown;
      if (answer) answer.hidden = shown < steps.length;
      ctrl.innerHTML = '';
      if (shown === 0) {
        ctrl.append(h('button', { class: 'btn primary', type: 'button', onclick: () => { shown = 1; render(true); } }, 'Start the solution'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => { shown = steps.length; render(); } }, 'Show all steps'));
      } else if (shown < steps.length) {
        ctrl.append(h('button', { class: 'btn primary', type: 'button', onclick: () => { shown++; render(true); } }, 'Next step (' + (shown + 1) + ' of ' + steps.length + ')'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => { shown = steps.length; render(); } }, 'Show all'));
      } else if (steps.length > 1 && opt.reveal !== 'all') {
        ctrl.append(h('button', { class: 'btn ghost', type: 'button', onclick: () => { shown = opt.reveal === 'none' ? 0 : 1; render(); } }, '↺ Start over'));
      }
      if (scroll && shown > 1) {
        const last = nodes[shown - 1];
        const r = last.getBoundingClientRect();
        if (r.bottom > window.innerHeight - 90) window.scrollBy({ top: r.bottom - window.innerHeight + 120, behavior: 'smooth' });
      }
      if (shown === steps.length && opt.onDone) opt.onDone();
    };
    render();
    return wrap;
  };

  /* A collapsed "watch it as an animation" section; the walk is only built when opened. */
  UI.watch = (parent, build, label) => {
    const d = h('details', { class: 'watch' }, h('summary', { text: label || 'Watch it as an animation' }));
    const body = h('div', { style: { marginTop: '8px' } });
    d.appendChild(body);
    let built = false;
    d.addEventListener('toggle', () => { if (d.open && !built) { built = true; build(body); } });
    parent.appendChild(d);
    return d;
  };

  /* ---------- In depth tab: questions that open one at a time ----------
     items = [{ q, a (html), live? }] — live answers compute their numbers when opened */
  UI.faq = (parent, items, topicId) => {
    const list = h('div', { class: 'faq' });
    const all = items.map((it, k) => {
      const body = h('div', { class: 'faq-body' });
      const d = h('details', { class: 'faq-item', id: 'q-' + topicId + '-' + (k + 1) },
        h('summary', null, h('span', { class: 'faq-n', text: String(k + 1) }), h('span', { class: 'faq-q', html: it.q }), h('span', { class: 'faq-icon', 'aria-hidden': 'true' })),
        body);
      let filled = false;
      d.addEventListener('toggle', () => {
        if (!d.open || filled) return;
        filled = true;
        body.innerHTML = it.a;
        if (it.live && NM.EXPLAIN_LIVE && NM.EXPLAIN_LIVE[it.live]) NM.EXPLAIN_LIVE[it.live](body);
      });
      list.appendChild(d);
      return d;
    });
    const toggleAll = h('button', { class: 'btn sm', type: 'button' }, 'Open all');
    toggleAll.addEventListener('click', () => {
      const open = !all.every((d) => d.open);
      all.forEach((d) => { d.open = open; });
      toggleAll.textContent = open ? 'Close all' : 'Open all';
    });
    parent.appendChild(h('div', { class: 'row spread', style: { marginBottom: '6px' } },
      h('p', { class: 'muted', style: { margin: 0 }, html: 'Each answer explains <b>why</b> a step works. Read them in order the first time.' }), toggleAll));
    parent.appendChild(list);
    return all;
  };

  /* ---------- Learn tab: short lesson pages, one at a time ----------
     topic.lessons = [{ title, build(el) }] */
  UI.lessons = (parent, topic) => {
    const L = topic.lessons || [];
    const key = 'lesson:' + topic.id;
    let i = Math.min(Store.get(key, 0), L.length - 1);
    const box = h('div', { class: 'lesson' });
    parent.appendChild(box);
    const go = (k) => {
      i = Math.max(0, Math.min(L.length - 1, k));
      Store.set(key, i);
      if (i === L.length - 1 && !Prog.get(topic.id).walked) Prog.patch(topic.id, () => ({ walked: true }));
      box.innerHTML = '';
      // each bar sits in a 44px-tall button so it is easy to tap
      const dots = h('div', { class: 'dots', role: 'tablist', 'aria-label': 'Lesson pages' }, L.map((l, k) =>
        h('button', { type: 'button', class: k === i ? 'on' : k < i ? 'done' : '', title: UI.plain(l.title), 'aria-label': 'Page ' + (k + 1) + ': ' + UI.plain(l.title), 'aria-current': k === i ? 'step' : null, onclick: () => go(k) }, h('span'))));
      box.appendChild(h('div', { class: 'lesson-top' }, dots, h('span', { class: 'pg', text: (i + 1) + ' / ' + L.length })));
      const body = h('div', { class: 'lesson-body enter' }, h('h2', { html: L[i].title }));
      box.appendChild(body);
      L[i].build(body);
      const nextBtn = i < L.length - 1
        ? h('button', { class: 'btn primary', type: 'button', onclick: () => { go(i + 1); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 'Next: ' + UI.plain(L[i + 1].title) + ' →')
        : h('a', { class: 'btn primary', href: '#/t/' + topic.id + '/examples' }, 'Go to the examples →');
      box.appendChild(h('div', { class: 'lesson-nav' },
        i > 0 ? h('button', { class: 'btn', type: 'button', onclick: () => { go(i - 1); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, '← Back') : null,
        nextBtn));
    };
    go(i);
  };

  /* ---------- Examples tab ----------
     topic.examples = [{ title, src, problem, solve: () => ({steps, answer}), watch(el) }]
     "New example" builds one from a practice generator that has a board. */
  UI.examples = (parent, topic) => {
    const list = topic.examples || [];
    const gens = (topic.practice || []).filter((g) => !g.noExample);
    parent.appendChild(h('p', { class: 'muted', html: 'Read the problem, <b>try it on paper first</b>, then reveal the solution one step at a time and compare.' }));
    const pick = h('div', { class: 'ex-pick', role: 'tablist', 'aria-label': 'Examples' });
    const host = h('div');
    parent.append(pick, host);
    let cur = 0;
    const show = (k) => {
      cur = k;
      pick.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === k));
      host.innerHTML = '';
      let ex;
      if (k < list.length) ex = list[k];
      else {
        let q = null;
        for (let tries = 0; tries < 12 && !(q && q.board); tries++) q = UI.rand.pick(gens)();
        ex = { title: 'New example', src: 'random numbers', problem: q.prompt, solve: q.board, watch: q.solution };
      }
      const paper = h('div', { class: 'paper enter' });
      paper.appendChild(h('div', { class: 'row spread', style: { marginBottom: '8px' } },
        h('span', { class: 'row', style: { gap: '8px' } },
          h('span', { class: 'meta', text: k < list.length ? 'Example ' + (k + 1) + ' of ' + list.length : 'New example' }),
          ex.src ? h('span', { class: 'tag', text: ex.src }) : null),
        k >= list.length ? h('button', { class: 'btn sm', type: 'button', onclick: () => show(list.length) }, 'Different numbers') : null));
      paper.appendChild(h('h2', { html: ex.title, style: { marginBottom: '.4em' } }));
      paper.appendChild(h('div', { class: 'problem', html: ex.problem }));
      host.appendChild(paper);
      const sol = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Solution' }));
      host.appendChild(sol);
      try { UI.board(sol, ex.solve(), { reveal: 'none' }); } catch (e) { console.error(e); sol.appendChild(UI.error('Could not build this solution: ' + e.message)); }
      if (ex.watch) UI.watch(sol, ex.watch);
      host.appendChild(h('div', { class: 'row spread', style: { marginTop: '6px' } },
        k > 0 ? h('button', { class: 'btn', type: 'button', onclick: () => { show(k - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, '← Previous example') : h('span'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => { show(Math.min(k + 1, list.length)); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, k + 1 < list.length ? 'Next example →' : k + 1 === list.length && gens.length ? 'Try a new example →' : 'Another new example ↻')));
    };
    list.forEach((ex, k) => pick.appendChild(h('button', { type: 'button', title: UI.plain(ex.title), onclick: () => show(k) }, String(k + 1))));
    if (gens.length) pick.appendChild(h('button', { type: 'button', class: 'new', title: 'New example with random numbers', onclick: () => show(list.length) }, '+ New'));
    show(0);
  };

  /* ---------- step-by-step player ----------
     opt: { title, n, plot: {height, equal}, render(i, w), intro }  */
  UI.walk = (parent, opt) => {
    const narr = h('div', { class: 'walk-narr', 'aria-live': 'polite' });
    const plotHost = h('div', { class: 'walk-plot' });
    const body = h('div', { class: 'walk-body' + (opt.plot ? '' : ' no-plot') }, opt.plot ? plotHost : null, narr);
    const bar = h('span');
    const count = h('span', { class: 'count' });
    const prev = h('button', { class: 'btn sm', type: 'button', 'aria-label': 'Previous step' }, '◀ Back');
    const next = h('button', { class: 'btn sm primary', type: 'button', 'aria-label': 'Next step' }, 'Next ▶');
    const first = h('button', { class: 'btn sm ghost icon', type: 'button', title: 'Back to the start', 'aria-label': 'Back to the start' }, '⏮');
    const play = h('button', { class: 'btn sm ghost', type: 'button', title: 'Play all steps' }, '▶ Play');
    const last = h('button', { class: 'btn sm ghost icon', type: 'button', title: 'Jump to the end', 'aria-label': 'Jump to the end' }, '⏭');
    const ctrl = h('div', { class: 'walk-ctrl' }, first, prev, count, h('div', { class: 'walk-progress' }, bar), next, last, play);
    const extra = h('div', { class: 'walk-extra' });
    const el = h('div', { class: 'walk', tabindex: '-1' },
      opt.title ? h('div', { class: 'walk-head' }, h('h3', { html: opt.title })) : null,
      body, ctrl, extra);
    parent.appendChild(el);
    const w = { el, narr, extra, i: 0, n: opt.n, plot: null };
    if (opt.plot) w.plot = new NM.Plot(plotHost, opt.plot);
    let timer = null;
    const stop = () => { clearInterval(timer); timer = null; play.textContent = '▶ Play'; };
    w.go = (i) => {
      w.i = Math.max(0, Math.min(w.n - 1, i));
      count.textContent = 'Step ' + (w.i + 1) + ' of ' + w.n;
      bar.style.width = (w.n > 1 ? (w.i / (w.n - 1)) * 100 : 100) + '%';
      prev.disabled = first.disabled = w.i === 0;
      next.disabled = last.disabled = w.i === w.n - 1;
      opt.render(w.i, w);
      if (w.i === w.n - 1) { stop(); if (opt.onEnd) opt.onEnd(); }
    };
    prev.addEventListener('click', () => { stop(); w.go(w.i - 1); });
    next.addEventListener('click', () => { stop(); w.go(w.i + 1); });
    first.addEventListener('click', () => { stop(); w.go(0); });
    last.addEventListener('click', () => { stop(); w.go(w.n - 1); });
    play.addEventListener('click', () => {
      if (timer) { stop(); return; }
      if (w.i === w.n - 1) w.go(0);
      play.textContent = '⏸ Pause';
      timer = setInterval(() => w.go(w.i + 1), opt.speed || 2600);
    });
    el.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); stop(); w.go(w.i + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); w.go(w.i - 1); }
    });
    w.go(opt.start || 0);
    return w;
  };

  /* ---------- inputs ---------- */
  UI.exprInput = (o) => {
    const input = h('input', { type: 'text', class: 'mono', value: o.value || '', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': o.aria || 'function' });
    const und = h('div', { class: 'understood' });
    const el = h('label', { class: 'field' + (o.wide ? ' wide' : '') }, h('span', { html: o.label }), input, und);
    let cur = null;
    const update = () => {
      cur = E.compile(input.value);
      if (!input.value.trim()) { und.className = 'understood'; und.textContent = ''; cur = null; return; }
      if (cur.ok) {
        und.className = 'understood';
        und.innerHTML = 'I read this as: <span class="math">' + (o.prefix || '') + cur.html + '</span>';
      } else { und.className = 'understood err'; und.textContent = cur.error; }
      if (o.onChange) o.onChange(cur);
    };
    input.addEventListener('input', update);
    update();
    return { el, input, get: () => (cur && cur.ok ? cur : null), set: (v) => { input.value = v; update(); } };
  };
  UI.textInput = (o) => {
    const input = h('input', { type: 'text', class: o.mono === false ? '' : 'mono', value: o.value === undefined ? '' : o.value, spellcheck: 'false', autocomplete: 'off', inputmode: o.inputmode || null });
    const el = h('label', { class: 'field' + (o.wide ? ' wide' : '') }, h('span', { html: o.label }), input, o.hint ? h('span', { class: 'hint', html: o.hint }) : null);
    return { el, input, get: () => input.value, set: (v) => { input.value = v; } };
  };
  UI.select = (o) => {
    const sel = h('select', null, o.options.map((op) => h('option', { value: op[0], selected: String(op[0]) === String(o.value) ? true : null }, op[1])));
    const el = h('label', { class: 'field' + (o.wide ? ' wide' : '') }, h('span', { html: o.label }), sel, o.hint ? h('span', { class: 'hint', html: o.hint }) : null);
    if (o.onChange) sel.addEventListener('change', () => o.onChange(sel.value));
    return { el, input: sel, get: () => sel.value, set: (v) => { sel.value = v; } };
  };
  UI.seg = (options, value, onChange) => {
    const el = h('div', { class: 'seg', role: 'group' });
    const btns = options.map(([v, label]) => {
      const b = h('button', { type: 'button', class: String(v) === String(value) ? 'on' : '' }, label);
      b.addEventListener('click', () => { btns.forEach((x) => x.classList.remove('on')); b.classList.add('on'); onChange(v); });
      el.appendChild(b);
      return b;
    });
    return el;
  };
  UI.error = (msg) => UI.callout('bad', 'Can\'t solve this yet', '<p>' + msg + '</p>');

  /* Stop rule picker for iterative methods: steps or tolerance */
  UI.stopRule = (o) => {
    const mode = UI.select({ label: 'Stop when…', value: o.mode || 'steps', options: [['steps', 'I have done N steps'], ['tol', 'the change is smaller than TOL'], ['places', 'answer is correct to p decimal places']] });
    const val = UI.textInput({ label: 'N', value: o.steps || 5, inputmode: 'decimal' });
    const label = val.el.querySelector('span');
    const sync = () => {
      const m = mode.get();
      label.innerHTML = m === 'steps' ? 'N (number of steps)' : m === 'tol' ? 'TOL (e.g. 0.0001)' : 'p (decimal places)';
      if (m === 'steps' && !/^\d+$/.test(val.get())) val.set(o.steps || 5);
      if (m === 'tol' && !(E.evalNumber(val.get()) < 1)) val.set(o.tol || '0.0001');
      if (m === 'places' && !/^\d+$/.test(val.get())) val.set(o.places || 4);
    };
    mode.input.addEventListener('change', sync);
    sync();
    return {
      els: [mode.el, val.el],
      read() {
        const m = mode.get(), v = E.evalNumber(val.get());
        if (m === 'steps') {
          if (!(v >= 1 && v <= 200)) return { error: 'N must be a whole number from 1 to 200.' };
          return { steps: Math.round(v), describe: Math.round(v) + ' steps' };
        }
        if (m === 'tol') {
          if (!(v > 0)) return { error: 'TOL must be a small positive number like 0.0001.' };
          return { tol: v, steps: 200, describe: 'TOL = ' + val.get() };
        }
        if (!(v >= 1 && v <= 12)) return { error: 'p must be between 1 and 12.' };
        return { tol: 0.5 * Math.pow(10, -Math.round(v)), steps: 200, places: Math.round(v), describe: Math.round(v) + ' correct decimal places (error < 0.5×10<sup>−' + Math.round(v) + '</sup>)' };
      },
    };
  };

  /* ---------- answer checking ---------- */
  UI.judge = (raw, ans, tol) => {
    const s = String(raw || '').trim();
    if (!s) return 'empty';
    const u = E.evalNumber(s);
    if (!isFinite(u)) return 'unreadable';
    const t = tol !== undefined ? tol : Math.max(1e-4, Math.abs(ans) * 1e-4);
    const d = Math.abs(u - ans);
    if (d <= t) return 'ok';
    if (d <= Math.max(6e-3, Math.abs(ans) * 6e-3) && tol === undefined) return 'close';
    return 'no';
  };
  const FEED = {
    ok: '✓ Correct',
    close: '≈ Very close — keep more decimals (don\'t round until the end)',
    no: '✗ Not yet',
    empty: 'Type an answer',
    unreadable: 'I can\'t read that number',
  };

  /* Practice question card.
     q = { type, prompt, fields:[{label, answer, tol}], choices:{options, correct}, build(el, reg), hint, solution } */
  UI.question = (parent, q, opt) => {
    opt = opt || {};
    const entries = [];
    const reg = (input, answer, tol, fb) => { entries.push({ input, answer, tol, fb, wrong: 0 }); return input; };
    const status = h('div', { class: 'fb', 'aria-live': 'polite' });
    const card = h('div', { class: 'pq' });
    card.appendChild(h('div', { class: 'pq-head' },
      h('h3', { html: q.type }),
      opt.counter ? h('span', { class: 'muted small', html: opt.counter }) : null));
    card.appendChild(h('div', { class: 'pq-prompt', html: q.prompt }));
    let choiceState = null;
    if (q.build) {
      const box = h('div', { style: { overflowX: 'auto', marginBottom: '14px' } });
      q.build(box, reg);
      card.appendChild(box);
    }
    if (q.fields && q.fields.length) {
      const box = h('div', { class: 'pq-fields' });
      q.fields.forEach((f) => {
        const input = h('input', { type: 'text', class: 'mono', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': f.aria || 'answer' });
        const fb = h('span', { class: 'fb' });
        box.appendChild(h('div', { class: 'pq-field' }, h('span', { class: 'lab', html: f.label }), input, fb));
        reg(input, f.answer, f.tol, fb);
      });
      card.appendChild(box);
    }
    if (q.choices) {
      choiceState = { picked: null, btns: [] };
      const box = h('div', { class: 'choices' });
      q.choices.options.forEach((op, k) => {
        const b = h('button', { type: 'button', class: 'choice' }, h('span', { class: 'letter', text: 'ABCDEF'[k] }), h('span', { html: op }));
        b.addEventListener('click', () => {
          checks++;
          choiceState.btns.forEach((x) => x.classList.remove('ok', 'no'));
          choiceState.picked = k;
          b.classList.add(k === q.choices.correct ? 'ok' : 'no');
          finish(k === q.choices.correct, k === q.choices.correct ? 'ok' : 'no');
        });
        choiceState.btns.push(b);
        box.appendChild(b);
      });
      card.appendChild(box);
    }
    const reveal = h('div', { class: 'reveal', hidden: true });
    const hintBox = h('div', { hidden: true });
    let usedHelp = false, checks = 0, done = false;
    const btnCheck = h('button', { class: 'btn primary', type: 'button' }, 'Check');
    const btnHint = h('button', { class: 'btn', type: 'button' }, 'Hint');
    const btnSol = h('button', { class: 'btn', type: 'button' }, 'Show full solution');
    const btnNext = h('button', { class: 'btn' + (opt.primaryNext ? ' primary' : ''), type: 'button' }, opt.nextLabel || 'New question ↻');
    const actions = h('div', { class: 'row' }, q.choices ? null : btnCheck, q.hint ? btnHint : null, btnSol, h('span', { class: 'grow' }), btnNext);
    card.appendChild(actions);
    card.appendChild(h('div', { style: { marginTop: '10px' } }, status));
    card.appendChild(hintBox);
    card.appendChild(reveal);
    parent.appendChild(card);

    function finish(allOk, word) {
      if (allOk) {
        status.className = 'fb ok';
        status.innerHTML = usedHelp ? '✓ All correct. (You used help, so this one counts as practice — try a fresh one alone!)' : '✓ All correct on your own. Nice work!';
      } else {
        status.className = 'fb ' + (word === 'close' ? 'close' : 'no');
        status.textContent = word === 'close' ? 'Almost — some answers are very close. Keep more decimals.' : 'Some answers are not right yet. Fix the red ones and press Check again.';
      }
      if (allOk && !done) {
        done = true;
        const clean = !usedHelp && checks <= 1;
        if (opt.onResult) opt.onResult({ correct: true, clean });
      } else if (!allOk && checks === 1 && opt.onResult) opt.onResult({ correct: false, clean: false, firstTry: true });
    }
    btnCheck.addEventListener('click', () => {
      const empty = entries.filter((en) => !String(en.input.value).trim());
      if (empty.length) {
        status.className = 'fb close';
        status.textContent = 'Fill in every box first (' + empty.length + ' still empty).';
        empty[0].input.focus();
        return;
      }
      checks++;
      let allOk = true, anyClose = false;
      entries.forEach((en) => {
        const res = UI.judge(en.input.value, en.answer, en.tol);
        en.input.classList.remove('ok', 'no', 'close');
        if (res === 'ok') en.input.classList.add('ok');
        else {
          allOk = false;
          if (res === 'close') { en.input.classList.add('close'); anyClose = true; }
          else if (res !== 'empty') en.input.classList.add('no');
          if (res === 'no' || res === 'unreadable') en.wrong++;
        }
        let msg = FEED[res];
        if (res !== 'ok' && en.wrong >= 2) msg += ' — answer: ' + E.fmtShort(en.answer, 6);
        if (en.fb) { en.fb.className = 'fb ' + (res === 'ok' ? 'ok' : res === 'close' ? 'close' : 'no'); en.fb.textContent = msg; }
        en.input.title = msg;
      });
      finish(allOk, anyClose ? 'close' : 'no');
    });
    card.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
      e.preventDefault();
      const idx = entries.findIndex((en) => en.input === e.target);
      const nextEmpty = entries.find((en, k) => k > idx && !en.input.value.trim()) || entries.find((en) => !en.input.value.trim());
      if (nextEmpty) nextEmpty.input.focus(); else btnCheck.click();
    });
    btnHint.addEventListener('click', () => {
      usedHelp = true;
      hintBox.hidden = false;
      hintBox.innerHTML = '';
      hintBox.appendChild(UI.callout('idea', 'Hint', q.hint));
    });
    btnSol.addEventListener('click', () => {
      usedHelp = true;
      reveal.hidden = !reveal.hidden;
      btnSol.textContent = reveal.hidden ? 'Show full solution' : 'Hide solution';
      if (!reveal.hidden && !reveal.childNodes.length) {
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Full solution' }));
        reveal.appendChild(paper);
        if (q.board) {
          try { UI.board(paper, q.board(), { reveal: 'all' }); } catch (e) { console.error(e); }
          if (typeof q.solution === 'function') UI.watch(paper, q.solution);
        } else if (typeof q.solution === 'function') q.solution(paper);
        else paper.appendChild(h('div', { html: q.solution }));
      }
    });
    btnNext.addEventListener('click', () => opt.onNext && opt.onNext());
    return card;
  };

  /* Practice tab: pick a question type, answer, get a new one. */
  UI.practice = (parent, topic) => {
    const gens = topic.practice || [];
    if (!gens.length) { parent.appendChild(h('p', { class: 'muted', text: 'Practice for this topic is coming.' })); return; }
    let which = 'mix';
    const score = h('div', { class: 'scorebar' });
    const showScore = () => {
      const p = Prog.get(topic.id);
      score.innerHTML = '<span>On your own: <b>' + p.clean + '</b></span><span>With help: <b>' + (p.solved - p.clean) + '</b></span>' +
        (p.streak >= 2 ? '<span class="streak">' + p.streak + ' in a row</span>' : '') +
        '<span>Goal: 3 on your own</span>';
    };
    const picker = UI.seg([['mix', 'Mixed']].concat(gens.map((g, k) => [k, g.label])), 'mix', (v) => { which = v; fresh(); });
    parent.appendChild(h('p', { class: 'muted', html: 'Solve on paper first, then type your answers to check them. Fractions like <code>-7/6</code> are fine; keep 4+ decimals; tiny numbers as <code>3.2e-5</code>.' }));
    parent.appendChild(h('div', { class: 'row', style: { marginBottom: '10px' } }, picker));
    parent.appendChild(h('div', { style: { marginBottom: '12px' } }, score));
    const host = h('div');
    parent.appendChild(host);
    function fresh() {
      host.innerHTML = '';
      const g = which === 'mix' ? gens[Math.floor(Math.random() * gens.length)] : gens[which];
      let q;
      try { q = g(); } catch (e) { console.error(e); q = g(); }
      UI.question(host, q, {
        onNext: fresh,
        onResult: (r) => {
          Prog.patch(topic.id, (p) => r.correct
            ? { solved: p.solved + 1, clean: p.clean + (r.clean ? 1 : 0), streak: r.clean ? p.streak + 1 : 0 }
            : { wrong: p.wrong + 1, streak: 0 });
          showScore();
        },
      });
    }
    showScore();
    fresh();
  };

  /* Fill-in table builder for practice questions.
     rows: arrays of cells; a cell is a string (shown) or {answer, tol}. */
  UI.drillTable = (head, rows) => (box, reg) => {
    const labels = head.map((c) => UI.plain(c) || ' ');
    const table = h('table', { class: 't' },
      h('thead', null, h('tr', null, head.map((c) => h('th', { html: c })))),
      h('tbody', null, rows.map((r) => h('tr', null, r.map((c, k) => {
        if (c && typeof c === 'object' && 'answer' in c) {
          const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': labels[k] });
          reg(input, c.answer, c.tol);
          return h('td', { 'data-label': labels[k] }, input);
        }
        return h('td', { 'data-label': labels[k], html: c === undefined ? '' : String(c) });
      })))));
    box.appendChild(h('div', { class: 'tbl-wrap stack' }, table));
  };

  /* ---------- random helpers for question generators ---------- */
  const R = (UI.rand = {});
  R.int = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  R.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  R.nz = (a, b) => { let v = 0; while (v === 0) v = R.int(a, b); return v; };
  R.shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  R.distinct = (n, a, b) => { const s = new Set(); while (s.size < n) s.add(R.int(a, b)); return Array.from(s); };

  /* ---------- topic registry ---------- */
  NM.topics = [];
  NM.registerTopic = (t) => { NM.topics.push(t); NM.topics.sort((a, b) => a.num - b.num); };
  NM.topic = (id) => NM.topics.find((t) => t.id === id);
  NM.pages = {};
})(typeof window !== 'undefined' ? window : globalThis);
