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
   and the same colours mark <span class="pen a|b|c"> inside the lines.
   Each tap also explains the piece it wrote, in the card at the bottom: "From" (where it came from)
   and "Why" (why it is what it is). Those come from notes the solutions put on their parts (M.w in
   ui.js); the source gets a ring, in the given panel (data-gk), the triangle or a line above (data-id),
   and an arrow is drawn from it to the new piece. */
(function (root) {
  'use strict';
  const NM = root.NM, UI = NM.UI, h = UI.h, Store = UI.store, M = UI.M;
  const TRY = '<b>Your turn.</b> Work out the <b>?</b> on paper, then tap the right side of the board to check.';
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
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    pencil: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    down: '<path d="M7 10l5 5 5-5"/>',
  };
  const HINT = 'Tap the <b>right side</b> of the board for the next move, the <b>left side</b> to go back. Drag the bar to jump, or press ▶ to let it play.';
  // the topics whose problems can be typed in (problem.js), by the page's address: #/t/<topic>/…
  const typedTopic = () => { const m = /#\/t\/([^/?]+)/.exec(root.location ? root.location.hash : ''); return m && NM.problem && NM.problem.TOPICS.includes(m[1]) ? m[1] : null; };
  const svg = (name, fill) => '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" ' +
    (fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') + '>' + ICON[name] + '</svg>';

  const synth = root.speechSynthesis || null;
  const reduced = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = null;
  UI.tutorStop = () => { if (active) active.stop(); };
  root.addEventListener('hashchange', () => UI.tutorStop());

  /* ---------- moves: how much one tap writes ----------
     'symbol': one thing with one meaning: a number (½ and −3 included), a letter with its
     subscript and power (x₁, x²), a term (5x), a name like L₁(x) or f[x₁ x₂], an operator or "=";
     a bracket rides along with what it opens or closes. 'part': the pieces between "=" signs;
     'line': the whole line. Symbols not written yet keep their space (visibility: hidden),
     so the line never jumps while it is written. */
  const TOKEN = /−?\d+(?:\.\d+)?|[A-Za-z]+:?|\S/g;
  const FN = /^[PLfgpQ]$/, OPEN = /^[([]$/, CLOSE = /^[)\]]$/, WORD = /^[A-Za-z]{2,}:?$/, BRACKET = /^[([)\],;|]$/;
  const isNum = (s) => /^−?\d/.test(s);
  function tokenize(root) {
    const toks = [];
    let gap = false; // was there a space before the next symbol?
    const up = (n, test) => { for (let e = n.parentNode; e && e !== root; e = e.parentNode) if (test(e)) return e; return null; };
    const tag = (t) => (e) => e.tagName === t, cls = (c) => (e) => !!e.classList && e.classList.contains(c);
    const walk = (el) => [...el.childNodes].forEach((n) => {
      if (n.nodeType === 1) return walk(n);
      if (n.nodeType !== 3) return;
      const text = n.nodeValue;
      if (!text.trim()) { if (text) gap = true; return; }
      const at = { sub: up(n, tag('SUB')), sup: up(n, tag('SUP')), it: !!up(n, tag('I')), res: up(n, cls('res')), fr: up(n, cls('fr')), w: up(n, cls('w')) };
      const frag = document.createDocumentFragment();
      const plain = (s) => { if (s) { frag.appendChild(document.createTextNode(s)); if (/\s/.test(s)) gap = true; } };
      const re = new RegExp(TOKEN.source, 'g');
      let last = 0, m;
      while ((m = re.exec(text))) {
        plain(text.slice(last, m.index));
        const s = document.createElement('span');
        s.className = 'tk';
        s.textContent = m[0];
        frag.appendChild(s);
        toks.push(Object.assign({ el: s, t: m[0], gap }, at));
        gap = false;
        last = m.index + m[0].length;
      }
      plain(text.slice(last));
      n.parentNode.replaceChild(frag, n);
    });
    walk(root);
    return group(toks);
  }
  // which symbols one tap writes together
  function group(toks) {
    const inFr = new Map();
    toks.forEach((t) => { if (t.fr) inFr.set(t.fr, (inFr.get(t.fr) || []).concat(t)); });
    // ½ is one number: a fraction of two plain numbers with no separate notes on its parts
    const numFr = (t) => { const l = t.fr && inFr.get(t.fr); return !!l && l.length === 2 && l.every((q) => isNum(q.t) && q.w === l[0].w); };
    const units = [];
    let u = null;
    toks.forEach((t, idx) => {
      const p = u && u.toks[u.toks.length - 1], nx = toks[idx + 1];
      let join = false;
      if (p && p.res === t.res) { // never across the edge of an answer box
        if (u.fn > 0) join = true; // inside L₁( … ) or f[ … ]
        else if (t.sub || t.sup) join = true; // x₁, x², 10⁻⁴, f⁽⁵⁾
        else if (CLOSE.test(t.t) || /^[,;:!]$/.test(t.t)) join = true; // 2), 0, 5!
        else if (OPEN.test(p.t) || (p.t === '|' && u.toks.length === 1 && !t.gap)) join = true; // (2, |f
        else if (t.gap) join = !t.it && !p.it && WORD.test(p.t) && (WORD.test(t.t) || (isNum(t.t) && nx && nx.t === ':' && !nx.gap)); // "error wanted at", "term 2:"
        else if (OPEN.test(t.t) && u.fnName) join = 'fn'; // L₁(x), f[x₁ x₂], P(2)
        else if (t.t === '|') join = true;
        else if (numFr(t) && p.fr === t.fr) join = true; // the bottom of ½
        else if (t.it && t.t === 'x' && t.w === p.w && (isNum(p.t) || numFr(p) || (p.t === '−' && u.toks.length === 1))) join = true; // 5x, ½x, −x
        else if (p.t === '−' && u.toks.length === 1 && (isNum(t.t) || numFr(t))) join = true; // −½
        else if ((t.t === '×' && isNum(p.t)) || (p.t === '×' && t.t === '10')) join = true; // 9.955×10⁻⁴
        else if (t.t === 'π' && isNum(p.t)) join = true; // 2π
        else if (t.t === '/' && (isNum(p.t) || p.t === 'π') && nx && !nx.gap && (isNum(nx.t) || nx.t === 'π')) join = true; // π/6 typed on one line
        else if (p.t === '/' && u.toks.length >= 2 && (isNum(t.t) || t.t === 'π')) join = true;
      }
      if (join) {
        u.toks.push(t);
        if (join === 'fn') u.fn = 1;
        else if (u.fn > 0) { if (OPEN.test(t.t)) u.fn++; else if (CLOSE.test(t.t)) u.fn--; }
        if (!t.sub && !t.sup) u.fnName = t.it && FN.test(t.t);
      } else { u = { toks: [t], fn: 0, fnName: t.it && FN.test(t.t) }; units.push(u); }
    });
    return units.map((x) => Object.assign(x.toks.map((t) => t.el), { toks: x.toks }));
  }

  /* ---------- the note on each piece: where it came from, and why it is what it is ----------
     The solutions put notes on their parts (M.w in ui.js); the innermost note wins, outer ones fill gaps. */
  const KEYS = ['from', 'why', 'pre', 'g', 'src'];
  function noteOf(unit, root) {
    const o = {};
    let w = null;
    if (unit.toks) w = (unit.toks.find((t) => !BRACKET.test(t.t)) || unit.toks[0]).w;
    else { const all = unit[0].querySelectorAll ? unit[0].querySelectorAll('.w') : []; w = unit[0].classList && unit[0].classList.contains('w') ? unit[0] : all[all.length - 1] || null; }
    for (; w && root.contains(w); w = w.parentElement && w.parentElement.closest('.w')) KEYS.forEach((k) => { if (!o[k] && w.dataset[k]) o[k] = w.dataset[k]; });
    return o;
  }
  const OPS = {
    '+': 'Plus: add the next part.', '−': 'Minus: take the next part away.', '×': 'Times: multiply.', '÷': 'Divided by.',
    '≤': 'At most: the left side can never be bigger than the right side.', '≈': 'About: the number is rounded.', '✓': 'It matches, so this part checks out.', '⋯': 'And so on, in the same pattern.',
  };
  function explain(units, k, root) {
    const u = units[k], text = u.toks ? u.toks.map((t) => t.t).join('') : '';
    if (text === '=') {
      const next = units[k + 1] ? noteOf(units[k + 1], root) : {};
      if (next.pre) return { why: next.pre };
      // "L₁(x) =": the first "=" of a line names what is about to be written
      if (k !== 1) return { why: 'Equals: the same amount, worked out one more step.' };
      const prev = units[0], pt = prev.toks && (prev.toks.find((t) => !BRACKET.test(t.t)) || prev.toks[0]);
      const name = pt ? (pt.w && root.contains(pt.w) ? cleanHTML(pt.w) : chipHTML(prev)) : '';
      return { why: name && UI.plain(name).length <= 18 ? 'Equals: next comes what ' + name + ' is.' : 'Equals: the right side is the same amount as the left side.' };
    }
    const o = noteOf(u, root);
    if (!o.from && !o.why && OPS[text]) o.why = OPS[text];
    // a result with no note: say which part it was worked out from
    if (!o.from && !o.why && k > 0 && u.toks && units[k - 1].toks && units[k - 1].toks.map((t) => t.t).join('') === '=') {
      const sg = u[0].closest('.sg'), prev = sg && sg.previousElementSibling;
      if (prev && prev.classList.contains('sg')) {
        const html = cleanHTML(prev).replace(/^\s*=\s*/, '');
        if (UI.plain(html).length <= 48) { o.from = html; o.why = 'This is that part worked out.'; }
      }
    }
    return o;
  }
  // a part of a written line as plain HTML again (no symbol spans, no notes)
  function cleanHTML(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.tk').forEach((e) => e.replaceWith(e.textContent));
    c.querySelectorAll('[class]').forEach((e) => e.classList.remove('tk-wait', 'tk-hide', 'tk-now', 'tk-in', 'w-src'));
    [c].concat([...c.querySelectorAll('.w')]).forEach((e) => { ['from', 'why', 'pre', 'g', 'id', 'src'].forEach((k) => e.removeAttribute('data-' + k)); });
    return c.innerHTML;
  }
  // the piece just written, for the card: brackets that only open or close are left off
  function chipHTML(unit) {
    if (!unit.toks) return '';
    let toks = unit.toks.filter((t) => !/^[,;]$/.test(t.t));
    const count = (re) => toks.filter((t) => re.test(t.t)).length;
    if (toks.length > 1 && OPEN.test(toks[0].t) && count(OPEN) > count(CLOSE)) toks = toks.slice(1);
    if (toks.length > 1 && CLOSE.test(toks[toks.length - 1].t) && count(CLOSE) > count(OPEN)) toks = toks.slice(0, -1);
    // an absolute-value bar that only opens or closes ("max |") is left off too
    if (toks.length > 1 && count(/^\|$/) % 2 === 1) toks = toks[toks.length - 1].t === '|' ? toks.slice(0, -1) : toks[0].t === '|' ? toks.slice(1) : toks;
    let out = '';
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k], esc = t.t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      if (k > 0 && t.gap) out += ' '; // "error wanted at", f[x₁ x₂]: keep the spaces between words
      // a top and a bottom of the same fraction (not x and ₁, which both sit on the bottom)
      const nx = toks[k + 1], halves = t.fr && t.fr.children.length === 2 ? t.fr.children : null;
      if (halves && nx && nx.fr === t.fr && halves[0].contains(t.el) && halves[1].contains(nx.el)) { out += M.fr(esc, nx.t.replace(/&/g, '&amp;').replace(/</g, '&lt;')); k++; continue; }
      out += t.sub ? '<sub>' + esc + '</sub>' : t.sup ? '<sup>' + esc + '</sup>' : t.it ? '<i>' + esc + '</i>' : esc;
    }
    return out;
  }
  const penOf = (e) => { const p = e && (e.closest('.pen') || (e.querySelector && e.querySelector('.pen'))); return p ? ['a', 'b', 'c'].find((c) => p.classList.contains(c)) || '' : ''; };
  function prepLine(html, size) {
    const node = h('div', { class: 'ln tut-ln', html: UI.lineHTML(html) });
    let units = size === 'line' ? [[node]] : size === 'part' ? [...node.querySelectorAll('.sg')].map((s) => [s]) : tokenize(node);
    if (!units.length) units = [[node]];
    const res = node.querySelector('.res');
    let r0 = -1, r1 = -1;
    if (res) units.forEach((u, k) => { if (u.some((e) => res.contains(e) || e.contains(res))) { if (r0 < 0) r0 = k; r1 = k; } });
    return { node, units, res, r0, r1 };
  }
  // 'try' writes up to the answer box, then shows "?"; 'reveal' opens the box and fills it one piece per tap
  const lineMoves = (P, mode) => (mode === 'try' ? (P.r0 < 0 ? 1 : P.r0 + 1) : mode === 'reveal' && P.r0 >= 0 ? P.units.length - P.r0 : P.units.length);
  function prepTable(s, size) {
    const node = h('div', { class: 'tut-table' }, UI.table(s.table.head, s.table.rows, { align: s.table.align }).el);
    const rows = [...node.querySelectorAll('tr')];
    const units = size === 'line' || !rows.length ? [[node]] : size === 'part' ? rows.map((r) => [r])
      : [[rows[0]]].concat(rows.slice(1).flatMap((r) => [...r.children].map((c) => [c]))); // the headings, then cell by cell
    return { node, units };
  }

  UI.tutor = (parent, sol, opt) => {
    opt = opt || {};
    let steps = sol.steps || [];
    let mine = sol.mine || null; // a problem typed in by the student: { text, said }
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

    /* The player, top to bottom: a bar with the chapter (tap it for the list) and the tools; the
       board (the given strip and the lines being written; tap its right side to go on, its left
       side to go back); a sheet with the note on the newest piece, the progress bar (drag its
       handle to jump) and the buttons. On a phone the lesson plays full screen. */
    const el = h('div', { class: 'tut', tabindex: '-1', role: 'region', 'aria-label': 'Step-by-step tutorial' });
    const given = h('div', { class: 'tut-given' });
    const stage = h('div', { class: 'tut-stage' });
    const screen = h('div', { class: 'tut-screen' }, given, stage);
    // arrows from where a number came from to where it is being written, drawn over the board
    const ink = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ink.setAttribute('class', 'tut-ink');
    ink.setAttribute('aria-hidden', 'true');
    const view = h('div', { class: 'tut-view' }, screen, ink);
    const tool = (name, label, onclick, cls) => h('button', { class: 'tut-ico' + (cls ? ' ' + cls : ''), type: 'button', title: label, 'aria-label': label, html: svg(name), onclick });
    const closeBtn = tool('close', 'Close full screen', () => setFull(false), 'tut-close');
    const chNum = h('span', { class: 'tut-chn' }), chName = h('span', { class: 'tut-chname' });
    const chBtn = h('button', { class: 'tut-chbtn', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', onclick: () => sheet(sheetKind === 'chapters' ? '' : 'chapters') },
      chNum, chName, h('span', { class: 'tut-caret', html: svg('down') }));
    const voiceBtn = synth ? tool('mute', 'Read aloud', () => { prefs.voice = !prefs.voice; save(); if (!prefs.voice) synth.cancel(); else speak(); tools(); }) : null;
    const setBtn = tool('sliders', 'Settings', () => sheet(sheetKind === 'settings' ? '' : 'settings'));
    setBtn.setAttribute('aria-haspopup', 'dialog');
    const fullBtn = tool('full', 'Full screen', () => setFull(true), 'tut-fullbtn');
    const typeBtn = typedTopic() ? tool('pencil', 'Type your own problem', () => sheet(sheetKind === 'problem' ? '' : 'problem')) : null;
    if (typeBtn) typeBtn.setAttribute('aria-haspopup', 'dialog');
    const top = h('div', { class: 'tut-top' }, closeBtn, chBtn, h('div', { class: 'tut-tools' }, typeBtn, voiceBtn, setBtn, fullBtn));
    const cc = h('div', { class: 'tut-cc', 'aria-live': 'polite' });
    const track = h('div', { class: 'tut-track' });
    const thumb = h('span', { class: 'tut-thumb', 'aria-hidden': 'true' });
    const tip = h('span', { class: 'tut-tip', 'aria-hidden': 'true' });
    const bar = h('div', { class: 'tut-bar', role: 'slider', tabindex: '0', 'aria-label': 'Lesson progress', 'aria-valuemin': '0' }, track);
    const time = h('span', { class: 'tut-time', 'aria-hidden': 'true' });
    // you move by tapping the board; these two buttons are for the keyboard and screen readers,
    // and show only while one of them has the keyboard focus
    const back = h('button', { class: 'tut-key', type: 'button', html: svg('back') + '<span>Back</span>' });
    const next = h('button', { class: 'tut-key', type: 'button' });
    back.setAttribute('aria-label', 'Back one move');
    const play = h('button', { class: 'tut-play', type: 'button' });
    const dock = h('div', { class: 'tut-dock' }, cc, h('div', { class: 'tut-prog' }, bar, time, play), h('div', { class: 'tut-keys' }, back, next));
    // settings and the chapter list open as a sheet over the player; a tap outside closes it
    const scrim = h('div', { class: 'tut-scrim', hidden: true, onclick: () => sheet('') });
    const panel = h('div', { class: 'tut-sheet', hidden: true, role: 'dialog', tabindex: '-1' });
    el.append(top, view, dock, scrim, panel);
    parent.appendChild(el);

    /* ---------- the sheet: settings, or the list of chapters ---------- */
    let sheetKind = '', sheetFrom = null;
    function sheet(kind) {
      const was = sheetKind;
      sheetKind = kind || '';
      panel.innerHTML = '';
      panel.hidden = scrim.hidden = !sheetKind;
      panel.classList.toggle('tall', sheetKind === 'problem');
      if (sheetKind === 'settings') drawSettings();
      else if (sheetKind === 'chapters') drawChapters();
      else if (sheetKind === 'problem') drawProblem();
      tools();
      if (sheetKind) {
        if (!was) sheetFrom = document.activeElement;
        const f = panel.querySelector('textarea') || panel.querySelector('[aria-current]') || panel;
        f.focus({ preventScroll: true });
      } else if (was && sheetFrom && sheetFrom.isConnected) { sheetFrom.focus({ preventScroll: true }); sheetFrom = null; }
    }
    const sheetHead = (title) => h('div', { class: 'tut-sheet-h' }, h('h4', { text: title }),
      h('button', { class: 'tut-ico', type: 'button', title: 'Close', 'aria-label': 'Close ' + title.toLowerCase(), html: svg('close'), onclick: () => sheet('') }));
    function drawSettings() {
      panel.setAttribute('aria-label', 'Settings');
      const row = (label, seg) => { seg.setAttribute('aria-label', label); return h('div', { class: 'tut-set' }, h('span', { class: 'tut-set-l', 'aria-hidden': 'true', text: label }), seg); };
      panel.append(sheetHead('Settings'),
        row('Each tap writes', UI.seg([['symbol', 'One symbol'], ['part', 'One part'], ['line', 'One line']], prefs.size, (v) => { prefs.size = v; save(); rebuild(); })),
        row('Play speed', UI.seg([['0.5', '0.5×'], ['1', '1×'], ['1.5', '1.5×'], ['2', '2×']], String(prefs.speed), (v) => { prefs.speed = Number(v); save(); if (playing) schedule(); })),
        row('Your turn', UI.seg([['on', 'Stop before answers'], ['off', 'Don\'t stop']], prefs.tryFirst ? 'on' : 'off', (v) => { prefs.tryFirst = v === 'on'; save(); rebuild(); })),
        row('From / Why notes', UI.seg([['on', 'Show'], ['off', 'Hide']], prefs.cc ? 'on' : 'off', (v) => { prefs.cc = v === 'on'; save(); go(i, false); })));
    }
    // every chapter, with the one you are on marked; used on the cover and in the sheet
    function chapterList(pick) {
      const now = chapterOf(i);
      return h('ol', { class: 'tut-chapters' }, model.chapters.map((ch, k) => h('li', null,
        h('button', { type: 'button', class: k === now ? 'on' : k < now ? 'done' : null, 'aria-current': k === now ? 'step' : null, onclick: () => pick(ch) },
          h('span', { class: 'n', 'aria-hidden': 'true', text: String(k + 1) }), h('span', { class: 't', html: ch.title }),
          k < now ? h('span', { class: 'visually-hidden', text: ', done' }) : null))));
    }
    function drawChapters() {
      panel.setAttribute('aria-label', 'Chapters');
      panel.append(sheetHead('Chapters'), chapterList((ch) => { sheet(''); jump(ch.m0); }));
    }
    /* your own problem: type it in words or equations; it says back what it read, then solves */
    let typed = '';
    function drawProblem() {
      panel.setAttribute('aria-label', 'Type your own problem');
      const topic = typedTopic();
      const box = h('textarea', { class: 'tut-pin', rows: '5', 'aria-label': 'Your problem', 'aria-describedby': 'tut-said', spellcheck: 'false', autocapitalize: 'sentences',
        placeholder: 'Type or paste the question, in words or equations.' });
      box.value = typed;
      const said = h('p', { class: 'tut-said', id: 'tut-said', 'aria-live': 'polite' });
      const solve = h('button', { class: 'btn tut-solve', type: 'button' }, 'Solve it step by step');
      let got = null;
      const check = () => {
        got = NM.problem.read(box.value, topic);
        said.innerHTML = got.ok ? '<b class="ok">I read it as:</b> ' + got.said : got.error || 'For example: <i>' + NM.problem.EXAMPLE[topic] + '</i>';
        said.classList.toggle('bad', !got.ok && !!got.error);
        solve.disabled = !got.ok;
      };
      let wait = 0;
      box.addEventListener('input', () => { clearTimeout(wait); wait = setTimeout(check, 180); });
      const tryOne = (t) => h('button', { type: 'button', class: 'tut-ex', onclick: () => { box.value = NM.problem.EXAMPLE[t]; check(); box.focus({ preventScroll: true }); } }, NM.problem.EXAMPLE[t]);
      solve.addEventListener('click', () => {
        check();
        if (!got || !got.ok) return;
        let s;
        try { s = got.build(); } catch (e) { said.innerHTML = 'I read it, but could not solve it: ' + e.message; said.classList.add('bad'); return; }
        typed = box.value;
        const info = { text: box.value, said: got.said };
        sheet('');
        load(s, info);
      });
      panel.append(sheetHead('Your own problem'), box, said, solve,
        h('p', { class: 'tut-set-l', text: 'Or start from an example' }), h('div', { class: 'tut-exs' }, NM.problem.TOPICS.map(tryOne)));
      check();
    }
    // swap in a new solution (a typed problem) without leaving full screen
    function load(s, info) {
      stopPlay();
      if (synth) synth.cancel();
      sol = s;
      steps = sol.steps || [];
      mine = sol.mine = info || null;
      model = build();
      drawBar();
      go(-1, false);
      if (opt.onSol) opt.onSol(s);
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

    /* ---------- the progress bar: a segment per chapter, and a handle you can drag ---------- */
    let segs = [];
    const chapterOf = (m) => (m < 0 || !model.moves[m] ? -1 : model.beats[model.moves[m].b].c);
    function drawBar() {
      // each chapter as long as its share of the moves, so the handle shows exactly how far you are
      segs = model.chapters.map((ch) => h('span', { class: 'tut-seg', style: { flexGrow: String(ch.m1 - ch.m0) } }, h('span', { class: 'tut-fill' })));
      track.innerHTML = '';
      track.append(...segs, thumb, tip);
      bar.setAttribute('aria-valuemax', String(model.moves.length));
    }
    // where move m ends on the bar, as a share of its width (the cover, −1, is the very start)
    function posOf(m) {
      const W = track.clientWidth, k = chapterOf(m);
      if (!W || k < 0 || !segs[k]) return 0;
      const ch = model.chapters[k], s = segs[k];
      return (s.offsetLeft + s.offsetWidth * (m - ch.m0 + 1) / (ch.m1 - ch.m0)) / W;
    }
    // the move under the finger at screen position x
    function moveAt(x) {
      let k = 0;
      while (k < segs.length - 1 && x > segs[k].getBoundingClientRect().right + 1.5) k++;
      const r = segs[k].getBoundingClientRect(), ch = model.chapters[k];
      const f = Math.max(0, Math.min(1, (x - r.left) / (r.width || 1)));
      return Math.min(ch.m1 - 1, ch.m0 + Math.max(0, Math.ceil(f * (ch.m1 - ch.m0)) - 1));
    }
    const placeThumb = () => { if (!drag) thumb.style.left = (posOf(i) * 100).toFixed(3) + '%'; };
    function paintBar() {
      model.chapters.forEach((ch, k) => {
        const s = segs[k];
        if (!s) return;
        const done = i < ch.m0 ? 0 : i >= ch.m1 - 1 ? 1 : (i - ch.m0 + 1) / (ch.m1 - ch.m0);
        s.firstChild.style.transform = 'scaleX(' + done + ')';
        s.classList.toggle('on', i >= ch.m0 && i < ch.m1);
      });
      placeThumb();
      const c = chapterOf(i);
      bar.setAttribute('aria-valuenow', String(i + 1));
      bar.setAttribute('aria-valuetext', c < 0 ? 'Not started, ' + model.moves.length + ' moves'
        : 'Move ' + (i + 1) + ' of ' + model.moves.length + ', chapter ' + (c + 1) + ': ' + UI.plain(model.chapters[c].title));
    }
    // dragging: the handle follows the finger, a label shows the chapter, and the board follows
    let drag = null, dragRaf = 0;
    function dragTo(x) {
      const tr = track.getBoundingClientRect(), W = tr.width || 1, px = Math.max(0, Math.min(W, x - tr.left));
      const m = moveAt(x), c = chapterOf(m);
      drag.m = m;
      thumb.style.left = (px / W * 100).toFixed(3) + '%';
      tip.innerHTML = '';
      tip.append(h('span', { class: 'tut-tip-t', html: (c + 1) + '. ' + model.chapters[c].title }), h('span', { class: 'tut-tip-n', text: (m + 1) + ' / ' + model.moves.length }));
      const tw = tip.offsetWidth;
      tip.style.left = Math.max(tw / 2, Math.min(W - tw / 2, px)).toFixed(1) + 'px';
      if (m !== i && !dragRaf) dragRaf = requestAnimationFrame(() => { dragRaf = 0; if (drag && drag.m !== i) { i = drag.m; render(false); controls(); } });
    }
    bar.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || !model.moves.length) return;
      e.preventDefault();
      try { bar.setPointerCapture(e.pointerId); } catch (err) { /* the drag still works without capture */ }
      stopPlay();
      active = api;
      if (synth) synth.cancel();
      drag = { id: e.pointerId, m: i };
      bar.classList.add('drag');
      dragTo(e.clientX);
    });
    bar.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id) dragTo(e.clientX); });
    const dragEnd = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const m = drag.m;
      drag = null;
      cancelAnimationFrame(dragRaf);
      dragRaf = 0;
      bar.classList.remove('drag');
      go(m, false);
    };
    bar.addEventListener('pointerup', dragEnd);
    bar.addEventListener('pointercancel', dragEnd);
    // keys on the bar: arrows one move, Page Up / Page Down a chapter, Home / End
    bar.addEventListener('keydown', (e) => {
      const c = chapterOf(i), n = model.chapters.length;
      let m = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') m = i + 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') m = i - 1;
      else if (e.key === 'PageDown') m = c + 1 < n ? model.chapters[c + 1].m0 : model.moves.length - 1;
      else if (e.key === 'PageUp') m = c < 0 ? -1 : i > model.chapters[c].m0 ? model.chapters[c].m0 : c > 0 ? model.chapters[c - 1].m0 : -1;
      else if (e.key === 'Home') m = 0;
      else if (e.key === 'End') m = model.moves.length - 1;
      if (m === null) return;
      e.preventDefault();
      e.stopPropagation();
      stopPlay();
      active = api;
      go(m, false);
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
      if (g.extra && g.extra.length) given.appendChild(h('div', { class: 'tut-gx' }, g.extra.map((x) => h('span', { class: 'tut-gcell' + (typeof focus[x.key] === 'string' ? ' pen-' + focus[x.key] : ''), html: x.html, 'data-gk': x.key }))));
      if (g.rows && g.rows.length) {
        given.appendChild(h('div', { class: 'tut-gwrap' }, h('table', { class: 'tut-gt' }, h('tbody', null, g.rows.map((r) => h('tr', null,
          h('th', { html: r.label }),
          r.cells.map((c, k) => h('td', { class: focus[r.key] && focus[r.key][k] ? 'pen-' + focus[r.key][k] : null, html: c, 'data-gk': r.key + ':' + k }))))))));
      }
      // what to remember before solving (calculator mode, the rule people forget); tap one for why
      if (g.remember && g.remember.length) {
        given.appendChild(h('div', { class: 'tut-rem', role: 'group', 'aria-label': 'Remember' }, h('span', { class: 'tut-rem-l', 'aria-hidden': 'true', text: 'Remember' }),
          g.remember.map((r) => h('button', { type: 'button', class: 'tut-chip', 'aria-label': r.short + ': show why', onclick: () => remind(r) }, r.short))));
      }
    }
    // a reminder's full text, in the note area until the next move
    function remind(r) {
      cc.innerHTML = '';
      cc.className = 'tut-cc rem fresh';
      cc.append(h('p', { class: 'tut-try' }, h('b', { text: 'Remember: ' + r.short }), h('span', { html: r.long })));
      cc.hidden = false;
    }
    const markNewest = (units, anim) => (units || []).forEach((e) => { e.classList.add('tk-now'); if (anim) e.classList.add('tk-in'); });
    // a line written up to `shown` moves
    function lineAt(html, mode, shown, anim) {
      const P = prepLine(html, prefs.size), U = P.units;
      let upto, newest = null, asking = false, opening = false;
      if (mode === 'try') {
        upto = Math.min(shown, P.r0);
        if (shown > P.r0) asking = true; else newest = U[upto - 1];
      } else if (mode === 'reveal' && P.r0 >= 0) {
        upto = P.r0 + shown;
        opening = shown === 1;
        newest = U[upto - 1];
      } else { upto = shown; newest = U[shown - 1]; }
      // the note for the piece just written
      const nk = newest ? upto - 1 : -1;
      if (nk >= 0 && U[nk] && prefs.size !== 'line' && !asking) cur = { unit: U[nk], root: P.node, o: explain(U, nk, P.node), chip: chipHTML(U[nk]) };
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
      if (prefs.size === 'symbol') hlUnit = newest || null;
      return P.node;
    }
    function tableAt(s, shown, anim) {
      const P = prepTable(s, prefs.size);
      P.units.forEach((u, k) => { if (k >= shown) u.forEach((e) => e.classList.add('tk-hide')); });
      if (prefs.size !== 'line' && P.units[shown - 1]) {
        const u = P.units[shown - 1], o = noteOf(u, P.node);
        const cell = u.length === 1 && /^T[DH]$/.test(u[0].tagName) ? u[0] : null;
        cur = { unit: u, root: P.node, o, chip: cell ? cell.innerHTML : '' };
      }
      markNewest(P.units[shown - 1], anim);
      spokenHTML = P.units[shown - 1] && prefs.size === 'symbol' ? P.units[shown - 1].map((e) => e.innerHTML).join(' ') : '';
      return P.node;
    }
    // before the start: your problem (if you typed one), Start, what to remember, every chapter
    function cover() {
      el.classList.add('cover');
      drawGiven(null);
      const per = prefs.size === 'symbol' ? 'one symbol' : prefs.size === 'part' ? 'one part' : 'one line';
      const rem = (sol.given && sol.given.remember) || [];
      stage.appendChild(h('div', { class: 'tut-cover' },
        mine ? h('div', { class: 'tut-mine' }, h('p', { class: 'tut-mine-q', text: mine.text }), h('p', { class: 'tut-mine-r', html: 'I read it as: ' + mine.said })) : null,
        h('h3', { text: 'Solved one move at a time' }),
        h('p', { class: 'tut-cover-t', text: model.chapters.length + ' chapters · ' + model.moves.length + ' moves · ' + per + ' per tap' }),
        h('button', { class: 'btn tut-start', type: 'button', onclick: () => start() }, 'Start', h('span', { html: svg('next') })),
        rem.length ? h('div', { class: 'tut-before' }, h('h4', { text: 'Before you start' }), h('ul', null, rem.map((r) => h('li', null, h('b', { text: r.short }), h('span', { html: r.long }))))) : null,
        h('h4', { class: 'tut-ch-h', text: 'Chapters' }),
        chapterList((ch) => jump(ch.m0))));
    }
    let shownBeat = -2;
    let cur = null; // the newest piece written: { unit, root, o: its note, chip }
    let card = null, cardKey = '', cardNew = false, lead = null;
    // one highlight behind the newest piece, however many small parts (L, ₃, (x)) it is made of
    const hl = h('span', { class: 'tut-hl', 'aria-hidden': 'true', hidden: true });
    let hlUnit = null;
    function placeHl(anim) {
      const rs = (hlUnit || []).filter((e) => e.isConnected && !e.classList.contains('tk-hide')).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
      if (!rs.length || !hl.isConnected) { hl.hidden = true; return; }
      const sr = stage.getBoundingClientRect();
      const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top)), r = Math.max(...rs.map((q) => q.right)), b = Math.max(...rs.map((q) => q.bottom));
      Object.assign(hl.style, { left: (l - sr.left - 3).toFixed(1) + 'px', top: (t - sr.top - 1).toFixed(1) + 'px', width: (r - l + 6).toFixed(1) + 'px', height: (b - t + 2).toFixed(1) + 'px' });
      hl.classList.toggle('in', !!anim);
      hl.hidden = false;
    }
    function render(anim) {
      const keep = screen.scrollTop;
      stage.innerHTML = '';
      el.classList.remove('cover');
      spokenHTML = '';
      cur = null; card = null; lead = null; hlUnit = null;
      if (i < 0) { shownBeat = -2; cardKey = ''; cover(); drawCard(HINT); return marks(false); }
      const mv = model.moves[i], bi = mv.b, b = model.beats[bi], ch = model.chapters[b.c];
      const writing = b.kind === 'line' || b.kind === 'try' || b.kind === 'table';
      let say = b.say;
      if (b.kind === 'answer') {
        drawGiven(null);
        stage.appendChild(h('div', { class: 'tut-answer' + (anim ? ' enter' : '') }, h('div', { class: 'tut-kicker', text: 'Answer' }),
          sol.answer.map((l) => h('div', { class: 'ln', html: UI.lineHTML(l) })),
          h('p', { class: 'tut-done', text: 'Done. Drag the bar or open the chapter list at the top to watch any part again.' }),
          h('button', { class: 'btn tut-start', type: 'button', onclick: () => start() }, 'Watch again', h('span', { html: svg('again') }))));
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
          // the line's own caption sits just above it while it is written (a "your turn" keeps its line's caption)
          if (now && writing && prefs.cc) {
            const ls = bb.kind === 'try' ? model.beats[j + 1].say : bb.say;
            if (ls) { lead = h('p', { class: 'tut-say' + (anim && bi !== shownBeat ? ' enter' : ''), html: ls }); stage.appendChild(lead); }
          }
          stage.appendChild(node);
        }
        if (hlUnit) stage.insertBefore(hl, stage.firstChild);
        // the card at the bottom explains the piece just written: where it came from, and why
        if (writing) {
          if (asking()) say = TRY;
          else if (cur && (cur.o.from || cur.o.why)) { card = cur; say = ''; }
          else say = '';
        }
      }
      const key = card ? (card.o.from || '') + '|' + (card.o.why || '') : '';
      cardNew = !!card && key !== cardKey;
      cardKey = key;
      drawCard(say);
      // keep the screen still while one line is written; bring the newest piece into view
      const sameBeat = bi === shownBeat;
      shownBeat = bi;
      screen.scrollTop = keep;
      const last = stage.lastElementChild, first = lead || last;
      requestAnimationFrame(() => {
        if (!last) return marks(anim);
        const gh = given.hidden ? 0 : given.offsetHeight;
        const room = screen.clientHeight - gh - 24;
        // positions from the top of the board's scroll area
        const origin = screen.getBoundingClientRect().top - screen.scrollTop, y = (e, edge) => e.getBoundingClientRect()[edge] - origin;
        const newest = stage.querySelector('.tut-table .tk-now') || last;
        const from = y(first, 'top'), bottom = y(last, 'bottom');
        // everything from the caption down if it fits; if not, the caption as far as the newest piece allows
        const want = bottom - from > room ? Math.max(from - gh - 8, y(newest, 'bottom') - room - gh) : Math.max(0, bottom - room - gh);
        if (b.kind === 'intro') screen.scrollTo({ top: 0 });
        else if (Math.abs(screen.scrollTop - want) > 2) screen.scrollTo({ top: Math.max(want, 0), behavior: anim && !sameBeat && !reduced() ? 'smooth' : 'auto' });
        marks(anim);
      });
    }
    // the card: the piece just written in a chip, then "From" and "Why"; otherwise a plain caption
    const bare = (html) => String(html || '').replace(/ data-(?:id|src|g|from|why|pre)="[^"]*"/g, '');
    function drawCard(say) {
      cc.innerHTML = '';
      cc.className = 'tut-cc' + (card ? ' why' + (cardNew ? ' fresh' : '') : '');
      if (card) {
        const main = card.unit.toks ? (card.unit.toks.find((t) => !BRACKET.test(t.t)) || card.unit.toks[0]).el : card.unit[0];
        const pen = penOf(main) || (main.closest && main.closest('.res') ? 'a' : '');
        const chip = bare(card.chip);
        const row = (label, html) => (html ? h('p', { class: 'tut-why-' + label.toLowerCase() }, h('b', { text: label }), h('span', { html })) : null);
        cc.append(
          chip ? h('span', { class: 'tut-sym' + (pen ? ' ' + pen : '') }, h('span', { html: chip })) : null,
          h('div', { class: 'tut-why' }, row('From', card.o.from), row('Why', card.o.why)));
      } else if (asking()) {
        cc.classList.add('ask');
        cc.append(h('p', { class: 'tut-try' }, h('b', { text: 'Your turn' }), h('span', { html: 'Work out the <b>?</b> on paper, then tap the <b>right side</b> of the board to check.' })));
      } else if (say) cc.append(h('p', { class: 'tut-cap', html: say }));
      cc.hidden = !prefs.cc;
    }

    /* ---------- where it came from: rings on the sources, and an arrow to the new piece ---------- */
    const SVGNS = 'http://www.w3.org/2000/svg';
    let srcs = [];
    function marks(anim) {
      placeHl(anim);
      screen.querySelectorAll('.w-src, .g-src').forEach((e) => e.classList.remove('w-src', 'g-src'));
      srcs = [];
      if (card && prefs.cc && !cc.hidden) {
        (card.o.g || '').split(/\s+/).filter(Boolean).forEach((k) => {
          const e = screen.querySelector('[data-gk="' + k + '"]');
          if (e && !cc.contains(e)) { e.classList.add('g-src'); srcs.push(e); }
        });
        (card.o.src || '').split(/\s+/).filter(Boolean).forEach((id) => {
          const all = stage.querySelectorAll('[data-id="' + id + '"]'), e = all[all.length - 1];
          if (e) { e.classList.add('w-src'); srcs.push(e); }
        });
      }
      drawInk(anim);
      if (anim && srcs.length) setTimeout(reInk, 380); // after the new piece has settled
    }
    const colourOf = (e) => { const m = /\bpen-([abc])\b/.exec(e.className || ''); return m ? m[1] : penOf(e); };
    function drawInk(anim) {
      while (ink.firstChild) ink.removeChild(ink.firstChild);
      if (!srcs.length || !card || !view.isConnected) return;
      const targets = card.unit.filter((e) => e.isConnected);
      if (!targets.length) return;
      const box = (rs) => rs.reduce((a, r) => ({ left: Math.min(a.left, r.left), right: Math.max(a.right, r.right), top: Math.min(a.top, r.top), bottom: Math.max(a.bottom, r.bottom) }),
        { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
      const t = box(targets.map((e) => e.getBoundingClientRect())), vr = view.getBoundingClientRect(), sr = screen.getBoundingClientRect();
      const top = given.hidden ? sr.top : given.getBoundingClientRect().bottom, bottom = sr.bottom;
      // both ends must really be on screen: not scrolled away, not under the app's header or a sheet
      const seen = (r) => { const e = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return !!e && screen.contains(e); };
      if (t.bottom < top || t.top > bottom || !seen(t)) return;
      const tPen = penOf(targets[0]);
      srcs.forEach((s) => {
        const r = s.getBoundingClientRect(), mid = (r.top + r.bottom) / 2;
        if (!given.contains(s) && (mid < top || mid > bottom)) return; // scrolled out of sight
        if (!seen(r)) return;
        if (r.bottom > t.top - 4 && r.top < t.bottom + 4) return; // on the same row: the ring says enough
        const down = r.bottom <= t.top;
        const x1 = (r.left + r.right) / 2 - vr.left, y1 = (down ? r.bottom + 3 : r.top - 3) - vr.top;
        const x2 = (t.left + t.right) / 2 - vr.left, y2 = (down ? t.top - 5 : t.bottom + 5) - vr.top;
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
        const bow = Math.min(46, len * 0.2) * (dx >= 0 ? 1 : -1); // a gentle hand-drawn curve
        const cx = (x1 + x2) / 2 - (dy / len) * bow, cy = (y1 + y2) / 2 + (dx / len) * bow;
        const ex = x2 - cx, ey = y2 - cy, el2 = Math.hypot(ex, ey) || 1, ux = ex / el2, uy = ey / el2, hl = 9, sp = 0.5;
        const hx = (a) => x2 - hl * (ux * Math.cos(a) - uy * Math.sin(a)), hy = (a) => y2 - hl * (uy * Math.cos(a) + ux * Math.sin(a));
        const g = document.createElementNS(SVGNS, 'g');
        g.setAttribute('class', 'ink ' + (colourOf(s) || tPen || 'n') + (anim && !reduced() ? ' draw' : ''));
        // each stroke sits on a dark outline, so it stays clean where it crosses writing
        const path = (cls, d) => { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('class', cls); p.setAttribute('d', d); return p; };
        const dLine = 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1);
        const dHead = 'M' + hx(sp).toFixed(1) + ' ' + hy(sp).toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + 'L' + hx(-sp).toFixed(1) + ' ' + hy(-sp).toFixed(1);
        const haloLine = path('halo ln', dLine), line = path('ln', dLine);
        g.append(haloLine, path('halo hd', dHead), line, path('hd', dHead));
        ink.appendChild(g);
        if (anim && line.getTotalLength) g.style.setProperty('--len', String(Math.ceil(line.getTotalLength())));
      });
    }
    let inkRaf = 0;
    const reInk = () => { if (!inkRaf) inkRaf = requestAnimationFrame(() => { inkRaf = 0; drawInk(false); }); };
    screen.addEventListener('scroll', reInk, { passive: true });
    if (root.ResizeObserver) { const ro = new root.ResizeObserver(() => { reInk(); placeThumb(); placeHl(false); }); ro.observe(view); ro.observe(track); }

    /* ---------- controls ---------- */
    const asking = () => { const mv = model.moves[i]; return !!mv && model.beats[mv.b].kind === 'try' && mv.k === mv.n - 1; };
    function tools() {
      if (voiceBtn) { voiceBtn.setAttribute('aria-pressed', String(prefs.voice)); voiceBtn.innerHTML = svg(prefs.voice ? 'voice' : 'mute'); }
      setBtn.setAttribute('aria-expanded', String(sheetKind === 'settings'));
      chBtn.setAttribute('aria-expanded', String(sheetKind === 'chapters'));
      if (typeBtn) typeBtn.setAttribute('aria-expanded', String(sheetKind === 'problem'));
    }
    function controls() {
      const last = model.moves.length - 1, ask = asking(), c = chapterOf(i), n = model.chapters.length;
      back.disabled = i < 0;
      const label = i < 0 ? 'Start' : i === last ? 'Watch again' : ask ? 'Check' : 'Next';
      next.innerHTML = '<span>' + label + '</span>' + svg(i === last ? 'again' : 'next');
      next.setAttribute('aria-label', label === 'Next' ? 'Next move' : label === 'Check' ? 'Check: show the answer' : label);
      // play by itself; at the end it plays again from the start
      const done = i === last && !playing;
      play.innerHTML = svg(playing ? 'pause' : done ? 'again' : 'play', !done);
      play.setAttribute('aria-label', playing ? 'Pause' : done ? 'Watch again' : 'Play by itself');
      play.title = play.getAttribute('aria-label');
      time.textContent = Math.max(0, i + 1) + ' / ' + model.moves.length;
      chNum.textContent = c < 0 ? '' : (c + 1) + '/' + n;
      chName.innerHTML = c < 0 ? n + ' chapters' : model.chapters[c].title;
      chBtn.setAttribute('aria-label', 'Chapters, ' + (c < 0 ? 'not started' : 'now on chapter ' + (c + 1) + ' of ' + n + ': ' + UI.plain(model.chapters[c].title)));
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
    // on a phone the lesson plays full screen, so the board and the buttons stay put under your thumb
    const phone = () => !!(root.matchMedia && root.matchMedia('(max-width: 600px)').matches);
    const begin = () => { if (phone() && !el.classList.contains('full')) setFull(true); };
    const start = () => { begin(); go(0, true); scrollIntoView(); };
    const forward = () => {
      active = api;
      if (i < 0 || i === model.moves.length - 1) return start();
      begin();
      go(i + 1, true);
    };
    const jump = (m) => { stopPlay(); active = api; begin(); go(m, true); scrollIntoView(); };
    next.addEventListener('click', () => { stopPlay(); forward(); });
    back.addEventListener('click', () => { stopPlay(); active = api; go(i - 1, false); });
    play.addEventListener('click', () => {
      active = api;
      if (playing) return stopPlay();
      playing = true;
      if (i < 0 || asking() || i === model.moves.length - 1) forward(); else { begin(); schedule(); }
      controls();
    });
    // the board itself: a tap on its right side goes on, on its left side goes back
    view.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('button, a, input, select, textarea, summary, label')) return;
      const r = view.getBoundingClientRect();
      if (e.clientX - r.left < r.width * 0.35) {
        if (i < 0) return;
        stopPlay();
        active = api;
        go(i - 1, false);
      } else {
        if (i === model.moves.length - 1) return;
        stopPlay();
        forward();
      }
    });

    /* ---------- playing by itself, with or without the voice ---------- */
    let playing = false, timer = 0, token = 0, utter = null, afterSpeech = null;
    function stopPlay() { playing = false; clearTimeout(timer); token++; afterSpeech = null; if (play.isConnected) controls(); }
    const delay = () => {
      const mv = model.moves[i], b = model.beats[mv.b], sp = Number(prefs.speed) || 1;
      const read = (html) => Math.min(9000, 900 + UI.plain(html || '').length * 45);
      // writing pace, plus time to read a caption that just appeared or a card that just changed
      let ms = (prefs.size === 'symbol' ? 800 : prefs.size === 'part' ? 1400 : 2200) + (b.kind === 'table' ? 200 : 0);
      if (mv.k === 0) ms = Math.max(ms, 1500, read(lead ? lead.innerHTML : cc.hidden ? '' : cc.innerHTML));
      if (card && cardNew && !cc.hidden) ms = Math.max(ms, read(noteText(card.o)));
      return ms / sp;
    };
    const noteText = (o) => (o.from ? 'From ' + o.from + '. ' : '') + (o.why || '');
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
      else if (b.kind === 'line' || b.kind === 'try' || b.kind === 'table') {
        // the line's caption when it starts, then the symbol just written, then its note when the note is new
        html = [mv.k === 0 && lead ? lead.innerHTML : '', spokenHTML, card && cardNew && !cc.hidden ? noteText(card.o) : ''].filter(Boolean).join('. ');
      } else if (mv.k === 0) html = (b.kind === 'intro' ? UI.plain(steps[b.c].title) + '. ' : '') + (b.speak || (cc.hidden ? '' : cc.innerHTML) || spokenHTML);
      else html = spokenHTML;
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
      // full screen covers the page, so it is a dialog: focus stays inside until it is closed
      el.setAttribute('role', on ? 'dialog' : 'region');
      if (on) el.setAttribute('aria-modal', 'true'); else el.removeAttribute('aria-modal');
      if (on) { active = api; el.focus({ preventScroll: true }); }
      render(false);
      controls();
    }
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (sheetKind) { e.preventDefault(); sheet(''); } else if (el.classList.contains('full')) { e.preventDefault(); setFull(false); }
        return;
      }
      if (e.key === 'Tab' && el.classList.contains('full')) {
        const f = [...el.querySelectorAll('button, textarea, [tabindex="0"]')].filter((x) => !x.disabled && x.offsetParent !== null && !x.closest('[hidden]'));
        const first = f[0], last = f[f.length - 1];
        if (!first) return;
        if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        return;
      }
      if (e.target.closest && e.target.closest('input, select, textarea, .tut-sheet')) return;
      if (e.key === 'ArrowRight' || (e.key === ' ' && e.target === el)) { e.preventDefault(); stopPlay(); forward(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stopPlay(); go(i - 1, false); }
    });
    const api = {
      stop() { stopPlay(); if (synth) synth.cancel(); if (el.classList.contains('full')) setFull(false); },
    };
    drawBar();
    go(-1, false);
    return el;
  };
})(window);
