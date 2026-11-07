/* Tutorial player: plays a written solution like a video lesson, one move per tap
   (one symbol by default: 2, then ×, then 2, then =, then 4).
   It reads the same data as UI.board:
     sol = { steps: [{ title, text, lines, table, node, then, warn, note, tut }], answer, given }
   Extras that make it feel like a tutor at a whiteboard (the semifinal boards fill them in):
     step.tut = { intro,                       caption when the chapter starts (default: step.text)
                  say: [...], sayThen: [...],  a caption for each line
                  sayTable, sayNode,           captions for the table and the picture
                  focus: [...], focusThen, focusIntro, focusTable,
                                               which "given" cells light up, per line
                  nodeFor(i, ask),             a picture redrawn for line i (−1 before the lines, n after);
                                               ask is true while the answer is hidden
                  onlyNewest, noGiven }        show just the newest line; hide the given panel
     sol.given = { rows: [{ key, label, cells: [html] }], extra: [{ key, html }] }, pinned at the top.
   A focus is { rowKey: { index: pen }, extraKey: pen }; pens are 'a' yellow, 'b' blue, 'c' pink,
   and the same colours mark <span class="pen a|b|c"> inside the lines. */
(function (root) {
  'use strict';
  const NM = root.NM, UI = NM.UI, h = UI.h, Store = UI.store;
  const TRY = '<b>Your turn.</b> Work out the <b>?</b> on paper, then tap <b>Check</b>.';
  const hasRes = (html) => String(html).indexOf('class="res"') >= 0;

  /* ---------- the script: one beat per tap ---------- */
  UI.tutorBeats = (sol, o) => {
    o = o || {};
    const beats = [], chapters = [];
    (sol.steps || []).forEach((s, c) => {
      const t = s.tut || {};
      chapters.push({ title: s.title || 'Step ' + (c + 1), start: beats.length });
      beats.push({ c, kind: 'intro', say: t.intro !== undefined ? t.intro : s.text || '', focus: t.focusIntro });
      const lines = (list, src, say, focus) => (list || []).forEach((l, i) => {
        const f = focus ? focus[i] : undefined;
        if (o.tryFirst !== false && hasRes(l)) beats.push({ c, kind: 'try', src, i, say: TRY, focus: f });
        beats.push({ c, kind: 'line', src, i, say: (say && say[i]) || '', focus: f });
      });
      lines(s.lines, 'lines', t.say, t.focus);
      if (s.table) beats.push({ c, kind: 'table', say: t.sayTable || '', focus: t.focusTable });
      if (s.node && !t.nodeFor) beats.push({ c, kind: 'node', say: t.sayNode || '' });
      lines(s.then, 'then', t.sayThen, t.focusThen);
      if (s.warn) beats.push({ c, kind: 'warn', say: '', speak: 'Watch out: ' + s.warn });
      if (s.note) beats.push({ c, kind: 'note', say: '', speak: s.note });
    });
    if (sol.answer && sol.answer.length) {
      chapters.push({ title: 'Answer', start: beats.length, answer: true });
      beats.push({ c: chapters.length - 1, kind: 'answer', say: 'That is the whole solution. Check the answer against your paper.' });
    }
    chapters.forEach((ch, k) => { ch.end = k + 1 < chapters.length ? chapters[k + 1].start : beats.length; });
    return { beats, chapters };
  };

  /* captions as speech: "L₁(2) = 16/9" → "L 1 of 2 equals 16 over 9" */
  const spoken = (html) => {
    if (!html) return '';
    const d = document.createElement('div');
    d.innerHTML = html;
    d.querySelectorAll('.approx').forEach((s) => s.remove());
    d.querySelectorAll('sub').forEach((s) => s.replaceWith(' ' + s.textContent + ' '));
    d.querySelectorAll('sup').forEach((s) => s.replaceWith(s.textContent === '2' ? ' squared ' : s.textContent === '3' ? ' cubed ' : ' to the power ' + s.textContent + ' '));
    d.querySelectorAll('.fr').forEach((f) => f.replaceWith(' ' + (f.children[0] ? f.children[0].textContent : '') + ' over ' + (f.children[1] ? f.children[1].textContent : '') + ' '));
    return d.textContent.replace(/(\w)\(/g, '$1 of (').replace(/−/g, ' minus ').replace(/×/g, ' times ').replace(/÷/g, ' divided by ')
      .replace(/≤/g, ' is at most ').replace(/≈/g, ' about ').replace(/=/g, ' equals ').replace(/[|]/g, ' ').replace(/′/g, ' prime ')
      .replace(/(\d)!/g, '$1 factorial').replace(/[()[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const ICON = {
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    next: '<path d="M9 6l6 6-6 6"/>',
    again: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
    cc: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M10.5 10.3a2 2 0 1 0 0 3.4M16.5 10.3a2 2 0 1 0 0 3.4"/>',
    voice: '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.5 7.5 0 0 1 0 10.4"/>',
    mute: '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    exit: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  };
  const svg = (name, fill) => '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" ' +
    (fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') + '>' + ICON[name] + '</svg>';

  const synth = root.speechSynthesis || null;
  const reduced = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = null;
  UI.tutorStop = () => { if (active) active.stop(); };
  root.addEventListener('hashchange', () => UI.tutorStop());

  /* ---------- moves: how much one tap writes ----------
     'symbol': one number, variable (with its subscript), operator, bracket or exponent;
     'part': the pieces between "=" signs; 'line': the whole line. Symbols not written yet
     keep their space (visibility: hidden), so the line never jumps while it is written. */
  const TOKEN = /−?\d+(?:\.\d+)?|[A-Za-z]+:?|\S/g;
  function tokenize(root) {
    const units = [];
    let supOwner = null;
    const inside = (n, tag) => { for (let e = n.parentNode; e && e !== root; e = e.parentNode) if (e.tagName === tag) return e; return null; };
    const walk = (el) => [...el.childNodes].forEach((n) => {
      if (n.nodeType === 1) return walk(n);
      if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
      const text = n.nodeValue, frag = document.createDocumentFragment();
      const sub = inside(n, 'SUB'), sup = inside(n, 'SUP');
      const re = new RegExp(TOKEN.source, 'g');
      let last = 0, m;
      while ((m = re.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const s = document.createElement('span');
        s.className = 'tk';
        s.textContent = m[0];
        frag.appendChild(s);
        if (sub && units.length) units[units.length - 1].push(s); // x₁ is one symbol
        else if (sup && sup === supOwner) units[units.length - 1].push(s); // a whole exponent is one move
        else { units.push([s]); supOwner = sup; }
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
    walk(root);
    return units;
  }
  function prepLine(html, size) {
    const node = h('div', { class: 'ln tut-ln', html: UI.lineHTML(html) });
    let units = size === 'line' ? [[node]] : size === 'part' ? [...node.querySelectorAll('.sg')].map((s) => [s]) : tokenize(node);
    if (!units.length) units = [[node]];
    const res = node.querySelector('.res');
    let r0 = -1, r1 = -1;
    if (res) units.forEach((u, k) => { if (u.some((e) => res.contains(e) || e.contains(res))) { if (r0 < 0) r0 = k; r1 = k; } });
    return { node, units, res, r0, r1 };
  }
  // 'try' writes up to the answer box, then shows "?"; 'reveal' opens the box, then writes the rest
  const lineMoves = (P, mode) => (mode === 'try' ? (P.r0 < 0 ? 1 : P.r0 + 1) : mode === 'reveal' && P.r1 >= 0 ? P.units.length - P.r1 : P.units.length);
  function prepTable(s, size) {
    const node = h('div', { class: 'tut-table' }, UI.table(s.table.head, s.table.rows, { align: s.table.align }).el);
    const rows = [...node.querySelectorAll('tr')];
    const units = size === 'line' || !rows.length ? [[node]] : size === 'part' ? rows.map((r) => [r])
      : [[rows[0]]].concat(rows.slice(1).flatMap((r) => [...r.children].map((c) => [c]))); // the headings, then cell by cell
    return { node, units };
  }

  UI.tutor = (parent, sol, opt) => {
    opt = opt || {};
    const steps = sol.steps || [];
    const prefs = Object.assign({ cc: true, voice: false, tryFirst: true, size: 'symbol', speed: 1 }, Store.get('tutor', {}));
    if (!['symbol', 'part', 'line'].includes(prefs.size)) prefs.size = 'symbol';
    const save = () => Store.set('tutor', prefs);
    const list = (s, src) => ((src === 'then' ? s.then : s.lines) || []);
    const modeOf = (bi, beats) => (beats[bi].kind === 'try' ? 'try' : bi > 0 && beats[bi - 1].kind === 'try' ? 'reveal' : 'line');
    function build() {
      const base = UI.tutorBeats(sol, { tryFirst: prefs.tryFirst });
      const moves = [], first = [];
      base.beats.forEach((b, bi) => {
        first[bi] = moves.length;
        let n = 1;
        if (b.kind === 'line' || b.kind === 'try') n = lineMoves(prepLine(list(steps[b.c], b.src)[b.i], prefs.size), modeOf(bi, base.beats));
        else if (b.kind === 'table') n = prepTable(steps[b.c], prefs.size).units.length;
        for (let k = 0; k < n; k++) moves.push({ b: bi, k, n });
      });
      base.chapters.forEach((ch) => { ch.m0 = first[ch.start]; ch.m1 = ch.end < base.beats.length ? first[ch.end] : moves.length; });
      return { beats: base.beats, chapters: base.chapters, moves, first };
    }
    let model = build();
    let i = -1; // a move index; −1 is the cover
    let spokenHTML = ''; // what the newest move wrote, for the voice

    const el = h('div', { class: 'tut', tabindex: '-1', role: 'region', 'aria-label': 'Step-by-step tutorial' });
    const given = h('div', { class: 'tut-given' });
    const stage = h('div', { class: 'tut-stage' });
    const cc = h('div', { class: 'tut-cc', 'aria-live': 'polite' });
    // settings open as a sheet over the video, like a video player's own settings
    const panel = h('div', { class: 'tut-settings', hidden: true, role: 'group', 'aria-label': 'Tutorial settings' });
    const screen = h('div', { class: 'tut-screen' }, given, stage, cc, panel);
    const bar = h('div', { class: 'tut-bar' });
    const time = h('span', { class: 'tut-time' });
    const where = h('span', { class: 'tut-chname' });
    const tool = (name, label, onclick) => h('button', { class: 'tut-ico', type: 'button', title: label, 'aria-label': label, html: svg(name), onclick });
    const ccBtn = tool('cc', 'Captions', () => { prefs.cc = !prefs.cc; save(); go(i, false); });
    const voiceBtn = synth ? tool('mute', 'Read aloud', () => { prefs.voice = !prefs.voice; save(); if (!prefs.voice) synth.cancel(); else speak(); tools(); }) : null;
    const showPanel = (on) => { panel.hidden = !on; if (on) drawPanel(); cc.hidden = on || !prefs.cc || !cc.innerHTML; tools(); };
    const setBtn = tool('sliders', 'Settings', () => showPanel(panel.hidden));
    const fullBtn = tool('full', 'Full screen', () => setFull(!el.classList.contains('full')));
    const back = h('button', { class: 'btn tut-back', type: 'button', 'aria-label': 'Back one move', html: svg('back') });
    const next = h('button', { class: 'btn primary tut-next', type: 'button' });
    const play = h('button', { class: 'btn tut-play', type: 'button' });
    el.append(screen, bar,
      h('div', { class: 'tut-meta' }, h('div', { class: 'tut-where' }, time, where), h('div', { class: 'tut-tools' }, ccBtn, voiceBtn, setBtn, fullBtn)),
      h('div', { class: 'tut-ctrl' }, back, next, play));
    parent.appendChild(el);

    /* ---------- settings: how much each tap writes, play speed, "your turn" ---------- */
    function drawPanel() {
      panel.innerHTML = '';
      const row = (label, seg) => h('div', { class: 'tut-set' }, h('span', { class: 'tut-set-l', text: label }), seg);
      panel.append(
        row('Each tap writes', UI.seg([['symbol', 'One symbol'], ['part', 'One part'], ['line', 'One line']], prefs.size, (v) => { prefs.size = v; save(); rebuild(); })),
        row('Play speed', UI.seg([['0.5', '0.5×'], ['1', '1×'], ['1.5', '1.5×'], ['2', '2×']], String(prefs.speed), (v) => { prefs.speed = Number(v); save(); if (playing) schedule(); })),
        row('Your turn', UI.seg([['on', 'Stop before answers'], ['off', 'Don\'t stop']], prefs.tryFirst ? 'on' : 'off', (v) => { prefs.tryFirst = v === 'on'; save(); rebuild(); })),
        h('button', { class: 'btn sm tut-set-done', type: 'button', onclick: () => showPanel(false) }, 'Done'));
    }
    function rebuild() {
      const bi = i < 0 ? -1 : model.moves[i].b, nBeats = model.beats.length;
      const c = bi < 0 ? -1 : model.beats[bi].c;
      stopPlay();
      model = build();
      drawBar();
      // same line if the beats did not change, else the start of the same chapter
      go(bi < 0 ? -1 : model.beats.length === nBeats ? model.first[bi] : model.chapters[c].m0, false);
    }

    /* ---------- chapter bar, like video chapters ---------- */
    function drawBar() {
      bar.innerHTML = '';
      model.chapters.forEach((ch, k) => {
        const seg = h('button', { type: 'button', class: 'tut-seg', style: { flexGrow: String(Math.max(1, Math.sqrt(ch.m1 - ch.m0))) }, title: UI.plain(ch.title), 'aria-label': 'Chapter ' + (k + 1) + ': ' + UI.plain(ch.title) }, h('span', { class: 'tut-fill' }));
        seg.addEventListener('click', () => { stopPlay(); go(ch.m0, true); });
        bar.appendChild(seg);
      });
    }
    const paintBar = () => model.chapters.forEach((ch, k) => {
      const seg = bar.children[k];
      const done = i < ch.m0 ? 0 : i >= ch.m1 - 1 ? 1 : (i - ch.m0 + 1) / (ch.m1 - ch.m0);
      seg.firstChild.style.transform = 'scaleX(' + done + ')';
      seg.classList.toggle('on', i >= ch.m0 && i < ch.m1);
    });

    /* ---------- the screen ---------- */
    const focusAt = (bi) => {
      const ch = model.chapters[model.beats[bi].c];
      for (let j = bi; j >= ch.start; j--) if (model.beats[j].focus) return model.beats[j].focus;
      return null;
    };
    function drawGiven(focus, hide) {
      given.innerHTML = '';
      const g = sol.given;
      given.hidden = !g || hide;
      if (given.hidden) return;
      focus = focus || {};
      if (g.extra && g.extra.length) given.appendChild(h('div', { class: 'tut-gx' }, g.extra.map((x) => h('span', { class: 'tut-gcell' + (typeof focus[x.key] === 'string' ? ' pen-' + focus[x.key] : ''), html: x.html }))));
      if (g.rows && g.rows.length) {
        given.appendChild(h('div', { class: 'tut-gwrap' }, h('table', { class: 'tut-gt' }, h('tbody', null, g.rows.map((r) => h('tr', null,
          h('th', { html: r.label }),
          r.cells.map((c, k) => h('td', { class: focus[r.key] && focus[r.key][k] ? 'pen-' + focus[r.key][k] : null, html: c }))))))));
      }
    }
    const markNewest = (units, anim) => (units || []).forEach((e) => { e.classList.add('tk-now'); if (anim) e.classList.add('tk-in'); });
    // a line written up to `shown` moves
    function lineAt(html, mode, shown, anim) {
      const P = prepLine(html, prefs.size), U = P.units;
      let upto, newest = null, asking = false, opening = false;
      if (mode === 'try') {
        upto = Math.min(shown, P.r0);
        if (shown > P.r0) asking = true; else newest = U[upto - 1];
      } else if (mode === 'reveal') {
        upto = P.r1 + shown;
        if (shown === 1) opening = true; else newest = U[upto - 1];
      } else { upto = shown; newest = U[shown - 1]; }
      U.forEach((u, k) => { if (k >= upto && !(asking && k === P.r0)) u.forEach((e) => e.classList.add('tk-hide')); });
      if (asking && P.res) { P.res.classList.add('ask'); P.res.textContent = '?'; }
      if (opening && P.res) { if (anim) P.res.classList.add('tk-pop'); spokenHTML = 'The answer is ' + P.res.innerHTML; } else spokenHTML = newest ? newest.map((e) => e.outerHTML).join(' ') : '';
      if (prefs.size === 'symbol') {
        P.node.classList.add('tk-mode');
        // a fraction bar or an answer box appears with its first symbol
        P.node.querySelectorAll('.res, .fr').forEach((w) => {
          if (asking && (w === P.res || w.contains(P.res))) return;
          if (!w.querySelector('.tk:not(.tk-hide)')) w.classList.add('tk-wait');
        });
      } else if (prefs.size === 'line' && newest && anim) {
        P.node.querySelectorAll('.sg').forEach((s, k) => s.style.setProperty('--d', k));
        P.node.classList.add('write');
      }
      markNewest(newest, anim && prefs.size !== 'line');
      return P.node;
    }
    function tableAt(s, shown, anim) {
      const P = prepTable(s, prefs.size);
      P.units.forEach((u, k) => { if (k >= shown) u.forEach((e) => e.classList.add('tk-hide')); });
      markNewest(P.units[shown - 1], anim);
      spokenHTML = P.units[shown - 1] && prefs.size === 'symbol' ? P.units[shown - 1].map((e) => e.innerHTML).join(' ') : '';
      return P.node;
    }
    function cover() {
      el.classList.add('cover');
      drawGiven(null);
      const per = prefs.size === 'symbol' ? 'one symbol' : prefs.size === 'part' ? 'one part' : 'one line';
      stage.appendChild(h('div', { class: 'tut-cover' },
        h('button', { class: 'tut-big', type: 'button', 'aria-label': 'Start the tutorial', html: svg('play', true), onclick: () => start() }),
        h('p', { class: 'tut-cover-t', text: model.chapters.length + ' chapters · ' + model.moves.length + ' moves · ' + per + ' per tap' }),
        h('ol', { class: 'tut-chapters' }, model.chapters.map((ch, k) => h('li', null,
          h('button', { type: 'button', onclick: () => { stopPlay(); go(ch.m0, true); scrollIntoView(); } }, h('span', { class: 'n', text: String(k + 1) }), h('span', { html: ch.title })))))));
      cc.hidden = true;
    }
    let shownBeat = -2;
    function render(anim) {
      const keep = screen.scrollTop;
      stage.innerHTML = '';
      el.classList.remove('cover');
      spokenHTML = '';
      if (i < 0) { shownBeat = -2; return cover(); }
      const mv = model.moves[i], bi = mv.b, b = model.beats[bi], ch = model.chapters[b.c];
      let say = b.say;
      if (b.kind === 'answer') {
        drawGiven(null);
        stage.appendChild(h('div', { class: 'tut-answer' + (anim ? ' enter' : '') }, h('div', { class: 'tut-kicker', text: 'Answer' }),
          sol.answer.map((l) => h('div', { class: 'ln', html: UI.lineHTML(l) })),
          h('p', { class: 'tut-done', text: 'Done. Tap a chapter on the bar below to watch any part again.' })));
      } else {
        const s = steps[b.c], t = s.tut || {};
        drawGiven(focusAt(bi), t.noGiven);
        stage.appendChild(h('div', { class: 'tut-head' + (b.kind === 'intro' && anim ? ' enter' : '') },
          h('div', { class: 'tut-kicker', text: 'Step ' + (b.c + 1) + ' of ' + steps.length }), h('h3', { html: s.title })));
        if (t.nodeFor) {
          const at = (b.kind === 'line' || b.kind === 'try') && b.src === 'lines' ? b.i : b.kind === 'intro' ? -1 : list(s, 'lines').length;
          stage.appendChild(h('div', { class: 'tut-pic' + (anim && bi !== shownBeat ? ' swap' : '') }, t.nodeFor(at, b.kind === 'try')));
        }
        for (let j = ch.start + 1; j <= bi; j++) {
          const bb = model.beats[j], now = j === bi;
          if (bb.kind === 'try' && !now) continue;
          if (!now && t.onlyNewest && bb.kind === 'line') continue;
          let node = null;
          if (bb.kind === 'line' || bb.kind === 'try') {
            const html = list(s, bb.src)[bb.i];
            node = now ? lineAt(html, modeOf(j, model.beats), mv.k + 1, anim) : h('div', { class: 'ln tut-ln', html: UI.lineHTML(html) });
          } else if (bb.kind === 'table') node = now ? tableAt(s, mv.k + 1, anim) : prepTable(s, 'line').node;
          else if (bb.kind === 'node') node = h('div', { class: 'tut-pic' }, s.node);
          else if (bb.kind === 'warn') node = h('div', { class: 'tut-warn', html: '<b>Watch out:</b> ' + s.warn });
          else if (bb.kind === 'note') node = h('div', { class: 'tut-note', html: '<b>Tip:</b> ' + s.note });
          if (!node) continue;
          node.classList.add(now ? 'now' : 'past');
          if (now && anim && (bb.kind === 'node' || bb.kind === 'warn' || bb.kind === 'note' || (bb.kind === 'table' && prefs.size === 'line'))) node.classList.add('enter');
          stage.appendChild(node);
        }
        // a "your turn" beat keeps its line's caption until the ? appears
        if (b.kind === 'try' && mv.k < mv.n - 1) say = model.beats[bi + 1].say;
      }
      cc.innerHTML = say || '';
      cc.hidden = !prefs.cc || !say || !panel.hidden;
      // keep the screen still while one line is written; bring the newest piece into view
      const sameBeat = bi === shownBeat;
      shownBeat = bi;
      screen.scrollTop = keep;
      const last = stage.lastElementChild;
      requestAnimationFrame(() => {
        if (!last) return;
        const gh = given.hidden ? 0 : given.offsetHeight, ch2 = cc.hidden ? 0 : cc.offsetHeight;
        const room = screen.clientHeight - gh - ch2 - 24;
        const top = last.offsetTop - gh - 8;
        const want = last.offsetHeight > room ? top : Math.max(0, last.offsetTop + last.offsetHeight - room - gh);
        if (b.kind === 'intro') screen.scrollTo({ top: 0 });
        else if (Math.abs(screen.scrollTop - want) > 2) screen.scrollTo({ top: Math.max(want, 0), behavior: anim && !sameBeat && !reduced() ? 'smooth' : 'auto' });
      });
    }

    /* ---------- controls ---------- */
    const asking = () => { const mv = model.moves[i]; return !!mv && model.beats[mv.b].kind === 'try' && mv.k === mv.n - 1; };
    function tools() {
      ccBtn.setAttribute('aria-pressed', String(prefs.cc));
      if (voiceBtn) { voiceBtn.setAttribute('aria-pressed', String(prefs.voice)); voiceBtn.innerHTML = svg(prefs.voice ? 'voice' : 'mute'); }
      setBtn.setAttribute('aria-pressed', String(!panel.hidden));
      const full = el.classList.contains('full');
      fullBtn.setAttribute('aria-pressed', String(full));
      fullBtn.innerHTML = svg(full ? 'exit' : 'full');
      fullBtn.setAttribute('aria-label', full ? 'Exit full screen' : 'Full screen');
    }
    function controls() {
      const last = model.moves.length - 1;
      back.disabled = i < 0;
      const label = i < 0 ? 'Start' : i === last ? 'Watch again' : asking() ? 'Check' : 'Next';
      next.innerHTML = '<span>' + label + '</span>' + svg(i === last ? 'again' : 'next');
      next.setAttribute('aria-label', label === 'Next' ? 'Next move' : label);
      play.innerHTML = svg(playing ? 'pause' : 'play', true);
      play.setAttribute('aria-label', playing ? 'Pause' : 'Play by itself');
      play.disabled = i === last;
      time.textContent = i < 0 ? model.moves.length + ' moves' : (i + 1) + ' / ' + model.moves.length;
      where.innerHTML = i < 0 ? 'Tap Start' : model.chapters[model.beats[model.moves[i].b].c].title;
      paintBar();
      tools();
    }
    function go(k, anim) {
      i = Math.max(-1, Math.min(model.moves.length - 1, k));
      render(anim && !reduced());
      controls();
      speak();
      if (playing) schedule();
      if (i === model.moves.length - 1 && opt.onDone) opt.onDone();
    }
    const scrollIntoView = () => {
      if (el.classList.contains('full')) return;
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > root.innerHeight) el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    };
    const start = () => { go(0, true); scrollIntoView(); };
    const forward = () => {
      active = api;
      if (i < 0 || i === model.moves.length - 1) return start();
      go(i + 1, true);
    };
    next.addEventListener('click', () => { stopPlay(); forward(); });
    back.addEventListener('click', () => { stopPlay(); active = api; go(i - 1, false); });
    play.addEventListener('click', () => {
      active = api;
      if (playing) return stopPlay();
      playing = true;
      if (i < 0 || asking()) forward(); else schedule();
      controls();
    });

    /* ---------- playing by itself, with or without the voice ---------- */
    let playing = false, timer = 0, token = 0, utter = null, afterSpeech = null;
    function stopPlay() { playing = false; clearTimeout(timer); token++; afterSpeech = null; if (play.isConnected) controls(); }
    const delay = () => {
      const mv = model.moves[i], b = model.beats[mv.b], sp = Number(prefs.speed) || 1;
      // the first move of a step leaves time to read its caption; later moves go at writing pace
      if (mv.k === 0) return Math.max(1500, Math.min(8000, 900 + UI.plain(cc.hidden ? '' : cc.innerHTML).length * 45)) / sp;
      return (prefs.size === 'symbol' ? 800 : prefs.size === 'part' ? 1400 : 2200) / sp + (b.kind === 'table' ? 200 : 0);
    };
    function schedule() {
      clearTimeout(timer);
      if (!playing) return;
      if (i >= model.moves.length - 1 || asking()) return stopPlay(); // a "your turn" moment waits for you
      const my = ++token;
      const advance = () => { if (my === token && playing) go(i + 1, true); };
      if (prefs.voice && utter) { afterSpeech = advance; timer = setTimeout(advance, delay() * 2 + 5000); } else timer = setTimeout(advance, delay());
    }
    function speak() {
      if (!synth) return;
      synth.cancel();
      utter = null;
      if (!prefs.voice || i < 0) return;
      const mv = model.moves[i], b = model.beats[mv.b];
      let html;
      if (asking()) html = TRY;
      else if (mv.k === 0) html = (b.kind === 'intro' ? UI.plain(steps[b.c].title) + '. ' : '') + (b.speak || (cc.hidden ? '' : cc.innerHTML) || spokenHTML);
      else html = spokenHTML; // the symbol just written: "minus", "x 1", "equals"
      const text = spoken(html);
      if (!text) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = Math.max(0.7, Math.min(1.5, 0.95 * (Number(prefs.speed) || 1)));
      u.onend = () => { if (u === utter && afterSpeech) { const f = afterSpeech; afterSpeech = null; clearTimeout(timer); timer = setTimeout(f, mv.k === 0 ? 600 : 200); } };
      utter = u;
      synth.speak(u);
    }

    /* ---------- full screen, keys, clean-up ---------- */
    // full screen lifts the player onto <body>, so no parent's transform or overflow can clip it
    let holder = null;
    function setFull(on) {
      if (on === el.classList.contains('full')) return tools();
      if (on) { holder = document.createComment('tutorial'); el.parentNode.insertBefore(holder, el); document.body.appendChild(el); }
      else if (holder) { if (holder.parentNode) holder.parentNode.replaceChild(el, holder); else el.remove(); holder = null; }
      el.classList.toggle('full', on);
      document.body.classList.toggle('tut-full', on);
      if (on) { active = api; el.focus({ preventScroll: true }); }
      tools();
      render(false);
    }
    el.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      if (e.key === 'ArrowRight' || (e.key === ' ' && e.target === el)) { e.preventDefault(); stopPlay(); forward(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stopPlay(); go(i - 1, false); }
      else if (e.key === 'Escape' && el.classList.contains('full')) setFull(false);
    });
    const api = {
      stop() { stopPlay(); if (synth) synth.cancel(); if (el.classList.contains('full')) setFull(false); },
    };
    drawBar();
    go(-1, false);
    return el;
  };
})(window);
