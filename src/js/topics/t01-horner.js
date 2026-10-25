/* Topic 1 — Evaluating a polynomial: nested multiplication (Horner), Sauer §0.1 */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h, M } = UI;
  const R = UI.rand;
  const V = (v) => E.vHTML(v, UI.dp(), false);
  const VD = (v) => E.vHTML(v, UI.dp());

  /* "x − r" with tidy signs: x, x − 2, x + 1 */
  function factorHTML(r, F) {
    if (!r || F.isZero(r)) return '<i>x</i>';
    const v = F.num(r);
    return '(<i>x</i> ' + (v < 0 ? '+ ' + V(F.neg(r)) : '− ' + V(r)) + ')';
  }
  /* coefLow = [c1, c2, ..., c_{d+1}] constant first (book order) */
  function nestedHTML(coefLow, F, base) {
    const d = coefLow.length - 1;
    let s = V(coefLow[d]);
    for (let k = d - 1; k >= 0; k--) {
      const fac = base ? factorHTML(base[k], F) : '<i>x</i>';
      s = V(coefLow[k]) + ' + ' + fac + '(' + s + ')';
    }
    return s;
  }
  const standardHTML = (coefHigh, F) => E.poly.html(coefHigh.slice().reverse(), F, UI.dp());
  const SUPS = ['', '', '<sup>2</sup>', '<sup>3</sup>', '<sup>4</sup>', '<sup>5</sup>', '<sup>6</sup>', '<sup>7</sup>', '<sup>8</sup>'];

  /* ---------- written solution ---------- */
  function hornerBoard(coefHigh, x, F, base) {
    const res = E.horner(coefHigh, x, F, base);
    const d = coefHigh.length - 1;
    const steps = [];
    if (!base) {
      steps.push({
        title: 'List the coefficients, highest power first',
        text: 'Write 0 for any missing power.',
        lines: [coefHigh.map((c, k) => M.v('a', d - k) + ' = ' + V(c) + (d - k > 0 ? ' <span class="muted">(<i>x</i>' + SUPS[d - k] + ')</span>' : '')).join(', &nbsp;')],
      });
      steps.push({ title: 'Rewrite in nested form', lines: ['<i>P</i>(<i>x</i>) = ' + standardHTML(coefHigh, F), '= ' + nestedHTML(coefHigh.slice().reverse(), F)] });
    } else {
      const cl = coefHigh.slice().reverse();
      steps.push({
        title: 'Read the coefficients and base points',
        text: 'Work from the innermost bracket outward.',
        lines: [cl.map((c, k) => M.v('c', k + 1) + ' = ' + V(c)).join(', &nbsp;'), base.map((r, k) => M.v('r', k + 1) + ' = ' + V(r)).join(', &nbsp;')],
      });
    }
    res.steps.forEach((st, k) => {
      if (k === 0) {
        steps.push({ title: 'Start with the innermost number', lines: ['total = ' + M.res(V(st.y))] });
        return;
      }
      const fac = base ? '(' + V(x) + ' − ' + M.paren(V(st.r)) + ')' : M.paren(V(x));
      steps.push({
        title: 'Multiply by ' + (base ? '(<i>x</i> − ' + M.v('r', d - k + 1) + ')' : '<i>x</i>') + ', then add ' + V(st.coef),
        lines: [M.paren(V(st.prev)) + ' × ' + fac + ' + ' + M.paren(V(st.coef)) + ' = ' + V(st.prod) + ' + ' + M.paren(V(st.coef)) + ' = ' + M.res(V(st.y))],
      });
    });
    if (!base) {
      const poly = E.compile(E.poly.text(coefHigh.slice().reverse(), F, 12));
      steps.push({ title: 'Check by plugging in directly', lines: ['<i>P</i>(' + V(x) + ') = ' + E.subHTML(poly.node, E.vText(x)) + ' = ' + V(res.value) + ' ✓'] });
    }
    return {
      steps,
      answer: ['<i>P</i>(' + V(x) + ') = ' + VD(res.value), '<span class="small muted">' + d + ' multiplications, ' + (base ? 2 * d : d) + ' additions</span>'],
    };
  }

  /* The synthetic-division style grid used by the animation */
  function synthGrid(coefHigh, res, F, x, upto, base) {
    const d = coefHigh.length - 1;
    const grid = h('div', { class: 'synth', style: { gridTemplateColumns: 'auto repeat(' + (d + 1) + ', minmax(52px, auto))' } });
    const cls = (k, extra) => 'cell ' + (k < upto ? 'done' : k === upto ? 'cur' : 'hidden') + (extra ? ' ' + extra : '');
    grid.appendChild(h('div', { class: 'lbl', text: 'coefficients' }));
    coefHigh.forEach((c) => grid.appendChild(h('div', { class: 'cell', html: V(c) })));
    grid.appendChild(h('div', { class: 'lbl', html: base ? 'total × (<i>x</i> − <i>r</i>)' : 'total × ' + V(x) }));
    res.steps.forEach((st, k) => grid.appendChild(h('div', { class: k === 0 ? 'cell' : cls(k), html: k === 0 ? '' : V(st.prod) })));
    grid.appendChild(h('div', { class: 'lbl', text: 'running total' }));
    res.steps.forEach((st, k) => grid.appendChild(h('div', { class: cls(k, 'sum'), html: V(st.y) })));
    if (base) {
      grid.appendChild(h('div', { class: 'lbl', text: 'base point r' }));
      res.steps.forEach((st, k) => grid.appendChild(h('div', { class: 'cell muted', html: k === 0 ? '' : V(st.r) })));
    }
    return grid;
  }

  /* Animation: P(x) at one x. coefHigh: highest power first. */
  function hornerWalk(parent, o) {
    const { coefHigh, x, F, base } = o;
    const res = E.horner(coefHigh, x, F, base);
    const d = coefHigh.length - 1;
    const plotF = (t) => {
      let y = F.num(coefHigh[0]);
      for (let k = 1; k <= d; k++) y = y * (t - (base ? F.num(base[d - k]) : 0)) + F.num(coefHigh[k]);
      return y;
    };
    const n = res.steps.length + 1;
    return UI.walk(parent, {
      title: o.title, n, plot: { height: 240 }, onEnd: o.onEnd,
      render(i, w) {
        let html;
        if (i === 0) html = '<h4>Nested form</h4><div class="calcline">' + nestedHTML(coefHigh.slice().reverse(), F, base) + '</div><p>Evaluate from the innermost bracket outward at <i>x</i> = ' + V(x) + '.</p>';
        else if (i === n - 1) html = '<h4>Done</h4><div class="calcline"><i>P</i>(' + V(x) + ') = ' + VD(res.value) + '</div>';
        else {
          const st = res.steps[i - 1];
          html = st.start ? '<h4>Bring down the first coefficient</h4><div class="calcline">total = ' + V(st.y) + '</div>'
            : '<h4>Multiply, then add</h4><div class="calcline">' + M.paren(V(st.prev)) + ' × ' + (base ? '(' + V(x) + ' − ' + M.paren(V(st.r)) + ')' : M.paren(V(x))) + ' + ' + M.paren(V(st.coef)) + ' = <b>' + V(st.y) + '</b></div>';
        }
        w.narr.innerHTML = html;
        w.extra.innerHTML = '';
        w.extra.appendChild(synthGrid(coefHigh, res, F, x, i === 0 ? -1 : i === n - 1 ? res.steps.length : i - 1, base));
        const xv = F.num(x), yv = F.num(res.value);
        if (!w._fit) { w._fit = true; const span = Math.max(1, Math.abs(xv) * 0.5); w.plot.fit({ fns: [plotF], x0: xv - span, x1: xv + span, pts: [[xv, yv]], robust: true }); }
        w.plot.scene = (p) => {
          p.fn(plotF, { color: 'c1', width: 2.5 });
          if (i === n - 1) { p.line(xv, 0, xv, yv, { color: 'c2', dash: [5, 4], width: 1.5 }); p.point(xv, yv, { color: 'c2', r: 6, label: 'P = ' + E.fmtShort(yv, 4) }); }
          p.xmark(xv, 'x = ' + E.fmtShort(xv, 4), { color: 'c2' });
        };
        w.plot.legend([{ label: '<i>y</i> = <i>P</i>(<i>x</i>)', color: 'c1' }]);
        w.plot.render();
      },
    });
  }

  const q = E.Q.parse;
  const QL = (arr) => arr.map((s) => q(String(s)));
  const ex = (title, src, coefHigh, x, base) => ({
    title, src,
    problem: base
      ? '<p>Evaluate at <i>x</i> = ' + V(x) + ':</p><div class="eq"><i>P</i>(<i>x</i>) = ' + nestedHTML(coefHigh.slice().reverse(), E.QF, base) + '</div>'
      : '<p>Use nested multiplication to evaluate</p><div class="eq"><i>P</i>(<i>x</i>) = ' + standardHTML(coefHigh, E.QF) + ' &nbsp;at&nbsp; <i>x</i> = ' + V(x) + '</div>',
    solve: () => hornerBoard(coefHigh, x, E.QF, base),
    watch: (el) => hornerWalk(el, { coefHigh, x, F: E.QF, base }),
  });

  const topic = {
    id: 'horner', num: 1, unit: 'prelim',
    title: 'Evaluating a Polynomial', short: 'nested multiplication',
    book: 'Sauer §0.1', tagline: 'Multiply, add, repeat — the fastest way to get P(x).',

    lessons: [
      { title: 'The idea', build(el) {
        el.appendChild(h('p', { class: 'big', html: 'Don\'t compute <i>x</i><sup>4</sup>, <i>x</i><sup>3</sup>, <i>x</i><sup>2</sup> one by one. Start with the top coefficient and repeat one move:' }));
        el.appendChild(h('div', { class: 'eq', html: '<b>multiply by <i>x</i>, then add the next coefficient</b>' }));
        el.appendChild(h('p', { html: 'This is <b>nested multiplication</b> (also called <b>Horner\'s method</b>). It is the same as synthetic division. The trick is to rewrite the polynomial "inside out":' }));
        el.appendChild(h('div', { class: 'eq', html: '2<i>x</i><sup>4</sup> + 3<i>x</i><sup>3</sup> − 3<i>x</i><sup>2</sup> + 5<i>x</i> − 1 = −1 + <i>x</i>(5 + <i>x</i>(−3 + <i>x</i>(3 + <i>x</i>·2)))' }));
        el.appendChild(h('p', { html: 'Same coefficients, just brackets. A degree <i>d</i> polynomial now needs only <b><i>d</i> multiplications and <i>d</i> additions</b>.' }));
      } },
      { title: 'The steps', build(el) {
        el.appendChild(UI.recipe([
          '<b>List the coefficients</b> from the highest power down to the constant. Missing power → write <b>0</b>.',
          '<b>Bring down</b> the first coefficient. That is your running total.',
          '<b>Multiply the total by <i>x</i>, add the next coefficient.</b> That is the new total.',
          '<b>Repeat</b> until every coefficient is used. The last total is <i>P</i>(<i>x</i>).',
        ]));
        el.appendChild(h('h3', { text: 'How many operations?', style: { marginTop: '18px' } }));
        el.appendChild(UI.table(['Method for 2x⁴ + 3x³ − 3x² + 5x − 1', 'Multiply', 'Add'], [
          ['Compute every term directly', '10', '4'], ['Find powers first, reuse them', '7', '4'], ['<b>Nested multiplication</b>', '<b>4</b>', '<b>4</b>'],
        ], { align: ['l', 'c', 'c'] }).el);
      } },
      { title: 'With base points', build(el) {
        el.appendChild(h('p', { html: 'Sometimes the polynomial is given already nested, with <b>base points</b> <i>r</i><sub>1</sub>, <i>r</i><sub>2</sub>, …:' }));
        el.appendChild(h('div', { class: 'eq', html: '<i>P</i>(<i>x</i>) = <i>c</i><sub>1</sub> + (<i>x</i> − <i>r</i><sub>1</sub>)(<i>c</i><sub>2</sub> + (<i>x</i> − <i>r</i><sub>2</sub>)(<i>c</i><sub>3</sub> + (<i>x</i> − <i>r</i><sub>3</sub>)<i>c</i><sub>4</sub>))' }));
        el.appendChild(h('p', { html: 'Same move, but multiply by <b>(<i>x</i> − <i>r</i>)</b> instead of <i>x</i>. Start with the innermost <i>c</i><sub>4</sub>, multiply by (<i>x</i> − <i>r</i><sub>3</sub>), add <i>c</i><sub>3</sub>, and keep going outward.' }));
        el.appendChild(UI.callout('idea', 'Why this matters', '<p>Newton\'s divided-difference polynomial (Topic 7) is exactly this shape, with the data x-values as base points. Learn it once, use it twice.</p><p>Counting: <i>d</i> multiplications and <b>2<i>d</i></b> additions (each <i>x</i> − <i>r</i> is one more).</p>'));
      } },
      { title: 'Watch it', build(el) {
        el.appendChild(h('p', { class: 'muted', html: 'Press <b>Next</b> to move one step. Try to say the next number before you press.' }));
        hornerWalk(el, { title: 'Book example: 2<i>x</i><sup>4</sup> + 3<i>x</i><sup>3</sup> − 3<i>x</i><sup>2</sup> + 5<i>x</i> − 1 at <i>x</i> = ½', coefHigh: QL([2, 3, -3, 5, -1]), x: q('1/2'), F: E.QF });
      } },
      { title: 'Watch out', build(el) {
        el.appendChild(UI.callout('warn', 'Common mistakes', '<ul><li><b>Forgetting a zero coefficient.</b> 3<i>x</i><sup>4</sup> + <i>x</i> − 5 is 3, 0, 0, 1, −5.</li><li><b>Wrong order.</b> Go from the highest power down. (MATLAB\'s <code>nest</code> lists the constant first.)</li><li><b>Wrong base point.</b> The innermost coefficient multiplies the <i>last</i> base point.</li><li><b>Sign slips</b> when <i>x</i> is negative — write each total down.</li></ul>'));
        el.appendChild(UI.callout('calc', 'Calculator trick', '<p>Type the leading coefficient, press <span class="kbd">=</span>. Then for each next coefficient type <span class="kbd">×</span> <i>x</i> <span class="kbd">+</span> coefficient <span class="kbd">=</span>. Starting with <span class="kbd">×</span> uses <b>Ans</b> automatically.</p><p>At <i>x</i> = 0.5: <span class="kbd">2 =</span> <span class="kbd">×0.5+3 =</span> <span class="kbd">×0.5−3 =</span> <span class="kbd">×0.5+5 =</span> <span class="kbd">×0.5−1 =</span> → 1.25</p>'));
      } },
    ],

    examples: [
      ex('2x⁴ + 3x³ − 3x² + 5x − 1 at x = ½', 'Book §0.1', QL([2, 3, -3, 5, -1]), q('1/2')),
      ex('A missing power: x³ − 2x + 5 at x = −2', 'watch the zero', QL([1, 0, -2, 5]), q('-2')),
      ex('6x³ − 2x² − 3x + 7 at x = −½', 'Exercise 0.1-2(a)', QL([6, -2, -3, 7]), q('-1/2')),
      ex('Nested form with base points, at x = 5', 'Exercise 0.1-4(a)', QL(['-1/2', '1/2', '1/2', 1]), q('5'), QL([0, 2, 3])),
    ],

    solve(el) {
      const mode = { v: 'plain' };
      const coefs = UI.textInput({ label: 'Coefficients, highest power first', value: '2, 3, -3, 5, -1', hint: 'Use 0 for missing powers. Fractions like 1/2 are fine.', wide: true });
      const xin = UI.textInput({ label: 'Evaluate at x =', value: '1/2' });
      const basein = UI.textInput({ label: 'Base points r₁, r₂, … (in order)', value: '0, 2, 3', hint: 'One fewer than the number of coefficients.' });
      const out = h('div');
      const form = h('div', { class: 'form-grid' }, coefs.el, xin.el);
      const segEl = UI.seg([['plain', 'Ordinary polynomial'], ['base', 'Nested with base points']], 'plain', (v) => {
        mode.v = v;
        basein.el.hidden = v !== 'base';
        coefs.el.querySelector('span').textContent = v === 'base' ? 'Coefficients c₁, c₂, … (in the order they appear)' : 'Coefficients, highest power first';
        if (v === 'base') { coefs.set('1, 1/2, 1/2, -1/2'); xin.set('1'); } else { coefs.set('2, 3, -3, 5, -1'); xin.set('1/2'); }
        run();
      });
      form.appendChild(basein.el);
      basein.el.hidden = true;
      el.appendChild(h('div', { class: 'card' }, h('div', { class: 'row', style: { marginBottom: '12px' } }, segEl), form,
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Show the solution'))));
      el.appendChild(out);
      function run() {
        out.innerHTML = '';
        const pl = mode.v === 'base' ? E.parseLists(coefs.get(), xin.get(), basein.get()) : E.parseLists(coefs.get(), xin.get());
        if (pl.error) { out.appendChild(UI.error(pl.error)); return; }
        const [cl, xl, bl] = pl.lists;
        if (cl.length < 2) { out.appendChild(UI.error('Give at least 2 coefficients.')); return; }
        if (xl.length !== 1) { out.appendChild(UI.error('Give one value of x.')); return; }
        let coefHigh = cl, base;
        if (mode.v === 'base') {
          if (bl.length !== cl.length - 1) { out.appendChild(UI.error('You need exactly ' + (cl.length - 1) + ' base points for ' + cl.length + ' coefficients.')); return; }
          coefHigh = cl.slice().reverse(); base = bl;
        }
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Solution' }));
        out.appendChild(paper);
        UI.board(paper, hornerBoard(coefHigh, xl[0], pl.F, base), { reveal: 'all' });
        UI.watch(paper, (b) => hornerWalk(b, { coefHigh, x: xl[0], F: pl.F, base }));
      }
      run();
    },

    practice: [],
    formulas: '<div class="eq"><i>P</i>(<i>x</i>) = <i>c</i><sub>1</sub> + <i>x</i>(<i>c</i><sub>2</sub> + <i>x</i>(<i>c</i><sub>3</sub> + <i>x</i>(<i>c</i><sub>4</sub> + <i>x</i>·<i>c</i><sub>5</sub>)))</div><ul><li>Total ← leading coef; then total ← total·<i>x</i> + next coef</li><li>Base points: total ← total·(<i>x</i> − <i>r<sub>i</sub></i>) + <i>c<sub>i</sub></i></li><li>Degree <i>d</i>: <i>d</i> mult + <i>d</i> add (base points: <i>d</i> mult + 2<i>d</i> add)</li></ul>',
  };

  /* ---------- practice ---------- */
  const XS = ['1/2', '-1/2', '2', '-2', '3', '-1', '1/3', '0.5', '1.5', '-3'];
  function randPoly(deg) {
    const c = [R.nz(-5, 5)];
    for (let k = 1; k <= deg; k++) c.push(Math.random() < 0.15 ? 0 : R.int(-6, 6));
    return c;
  }
  const g1 = () => {
    const F = E.QF;
    const c = randPoly(R.int(3, 4)).map((v) => E.Q.from(v));
    const x = E.Q.parse(R.pick(XS));
    const res = E.horner(c, x, F);
    const head = ['', ...c.map((v) => V(v))];
    const rows = [
      ['× ' + V(x), '', ...res.steps.slice(1).map((s) => ({ answer: F.num(s.prod) }))],
      ['running total', ...res.steps.map((s, k) => (k === 0 ? V(s.y) : { answer: F.num(s.y) }))],
    ];
    return {
      type: 'Nested multiplication table',
      prompt: '<p>Evaluate <span class="math"><i>P</i>(<i>x</i>) = ' + standardHTML(c, F) + '</span> at <i>x</i> = ' + V(x) + ' with nested multiplication. Fill in the table. The last running total is <i>P</i>(' + V(x) + ').</p>',
      build: (box, reg) => {
        const grid = h('table', { class: 't' }, h('thead', null, h('tr', null, head.map((c2) => h('th', { html: c2 })))), h('tbody', null, rows.map((r) => h('tr', null, r.map((c2) => {
          if (c2 && typeof c2 === 'object') { const inp = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'answer' }); reg(inp, c2.answer); return h('td', null, inp); }
          return h('td', { html: String(c2) });
        })))));
        box.appendChild(h('div', { class: 'tbl-wrap' }, grid));
      },
      hint: '<p>Bring down ' + V(c[0]) + '. Each column: (previous total) × ' + V(x) + ', then add the coefficient at the top of that column.</p>',
      board: () => hornerBoard(c, x, F),
      solution: (box) => hornerWalk(box, { coefHigh: c, x, F }),
    };
  };
  g1.label = 'Fill the table';
  const g2 = () => {
    const F = E.QF;
    const n = R.int(3, 4);
    const cl = Array.from({ length: n }, () => E.Q.from(R.pick([1, 2, 3, -1, -2, 4, '1/2', '-1/2'])));
    const base = R.distinct(n - 1, -2, 4).map((v) => E.Q.from(v));
    const x = E.Q.from(R.pick([-1, 1, 2, 5, 0.5, '1/2', -2]));
    const res = E.horner(cl.slice().reverse(), x, F, base);
    return {
      type: 'Nested form with base points',
      prompt: '<p>Evaluate at <i>x</i> = ' + V(x) + ':</p><div class="eq"><i>P</i>(<i>x</i>) = ' + nestedHTML(cl, F, base) + '</div>',
      fields: [{ label: '<i>P</i>(' + V(x) + ') =', answer: F.num(res.value) }],
      hint: '<p>Start at the innermost number (' + V(cl[n - 1]) + '). Multiply by (<i>x</i> − ' + V(base[n - 2]) + '), add ' + V(cl[n - 2]) + ', and keep working outward.</p>',
      board: () => hornerBoard(cl.slice().reverse(), x, F, base),
      solution: (box) => hornerWalk(box, { coefHigh: cl.slice().reverse(), x, F, base }),
    };
  };
  g2.label = 'Base points';
  const g3 = () => {
    const d = R.int(3, 12);
    const kind = R.pick(['mult', 'add', 'baseadd', 'basemult']);
    const map = {
      mult: ['How many <b>multiplications</b> does nested multiplication need for a polynomial of degree ' + d + '?', d],
      add: ['How many <b>additions</b> does nested multiplication need for a polynomial of degree ' + d + '?', d],
      basemult: ['A degree ' + d + ' polynomial is in nested form <b>with base points</b>. How many <b>multiplications</b> does evaluating it take?', d],
      baseadd: ['A degree ' + d + ' polynomial is in nested form <b>with base points</b>. How many <b>additions</b> (each <i>x</i> − <i>r</i> counts as one) does evaluating it take?', 2 * d],
    };
    const [p, a] = map[kind];
    return {
      type: 'Count the operations', prompt: '<p>' + p + '</p>',
      fields: [{ label: 'Answer:', answer: a, tol: 0 }],
      hint: '<p>Each step of the nest is one multiply and one add. Degree <i>d</i> means <i>d</i> steps. Base points add one subtraction per step.</p>',
      board: () => ({ steps: [{ title: 'Count the steps', lines: ['degree ' + d + ' → ' + d + ' steps of "multiply, add"'] }, { title: 'Count each operation', lines: ['plain nest: ' + d + ' multiplications, ' + d + ' additions', 'with base points: ' + d + ' multiplications, ' + 2 * d + ' additions'] }], answer: ['Answer: ' + a] }),
    };
  };
  g3.label = 'Operation counts';
  g3.noExample = true;
  const g4 = () => {
    const F = E.QF;
    let c;
    do { c = randPoly(3); } while (c.filter((v) => v === 0).length > 1);
    c[R.int(1, 2)] = 0;
    const cq = c.map((v) => E.Q.from(v));
    const low = cq.slice().reverse();
    const right = nestedHTML(low, F);
    const opts = Array.from(new Set([right, nestedHTML(low.filter((v, k) => k === 0 || !F.isZero(v)), F), nestedHTML(cq, F), nestedHTML(low.map((v, k) => ((k === 1 || k === 2) && !F.isZero(v) ? F.neg(v) : v)), F)]));
    const order = R.shuffle(opts);
    return {
      type: 'Pick the nested form',
      prompt: '<p>Which is the nested form of <span class="math"><i>P</i>(<i>x</i>) = ' + standardHTML(cq, F) + '</span>?</p>',
      choices: { options: order.map((s) => '<span class="math">' + s + '</span>'), correct: order.indexOf(right) },
      hint: '<p>Start from the constant term. Missing powers still need a 0 inside the nest.</p>',
      board: () => ({ steps: [{ title: 'Coefficients from the constant up (zeros included)', lines: [low.map((v) => V(v)).join(', ')] }, { title: 'Wrap each one in x(…)', lines: [right] }], answer: [right] }),
    };
  };
  g4.label = 'Nested form';
  g4.noExample = true;
  topic.practice = [g1, g2, g3, g4];
  topic.walkFor = hornerWalk;
  topic.boardFor = hornerBoard;
  topic.nestedHTML = nestedHTML;
  NM.registerTopic(topic);
})(window.NM);
