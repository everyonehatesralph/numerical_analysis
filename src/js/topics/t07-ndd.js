/* Topic 7 — Newton's divided differences, Sauer §3.1.2–3.1.3 (current class topic) */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h, M } = UI;
  const R = UI.rand, IP = NM.interp;
  const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

  /* f[x1 x2 x3] label for cell (column j, row i), 1-based like the book */
  function fLabel(i, j) {
    const idx = [];
    for (let k = i; k <= i + j; k++) idx.push(k + 1);
    const inner = idx.length <= 4 ? idx.map((k) => M.v('x', k)).join(' ') : M.v('x', idx[0]) + ' … ' + M.v('x', idx[idx.length - 1]);
    return '<i>f</i>[' + inner + ']';
  }
  const cellVal = (v) => (v instanceof E.Q ? E.qHTML(v) : E.fmtShort(v, Math.min(UI.dp(), 6)));

  /* The triangle as a CSS grid. st: { known(j,i), target:[j,i], src:[[j,i]], xsrc:[i], top, input(j,i) } */
  function triangle(xs, T, st) {
    const n = xs.length;
    const grid = h('div', { class: 'tri', style: { gridTemplateColumns: 'auto repeat(' + n + ', minmax(64px, auto))' } });
    const place = (node, row, col) => { node.style.gridRow = String(row); node.style.gridColumn = String(col); grid.appendChild(node); return node; };
    place(h('div', { class: 'h', html: '<i>x</i>' }), 1, 1);
    for (let j = 0; j < n; j++) place(h('div', { class: 'h', html: j === 0 ? '<i>y</i>' : ORD[j] }), 1, j + 2);
    xs.forEach((x, i) => place(h('div', { class: 'cell x' + (st.xsrc && st.xsrc.includes(i) ? ' xsrc' : ''), html: cellVal(x) }), 2 + 2 * i, 1));
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n - j; i++) {
        const isTarget = st.target && st.target[0] === j && st.target[1] === i;
        const isSrc = st.src && st.src.some((s) => s[0] === j && s[1] === i);
        const known = j === 0 || (st.known && st.known(j, i));
        let cls = 'cell val';
        if (isTarget) cls += ' target';
        else if (isSrc) cls += ' src';
        else if (!known) cls += ' hidden';
        if (st.top && i === 0 && known) cls += ' top';
        let node;
        if (st.input && j > 0) { node = h('div', { class: 'cell', title: UI.plain(fLabel(i, j)) }); node.appendChild(st.input(j, i)); }
        else node = h('div', { class: cls, title: UI.plain(fLabel(i, j)), html: known || (isTarget && !st.ask) ? cellVal(T[j][i]) : '?' });
        place(node, 2 + 2 * i + j, 2 + j);
      }
    }
    return h('div', { style: { overflowX: 'auto', paddingBottom: '4px' } }, grid);
  }

  const partialFn = (xs, coef, m, F) => {
    const xn = xs.map((v) => F.num(v)), cn = coef.map((v) => F.num(v));
    return (t) => { let y = cn[m]; for (let k = m - 1; k >= 0; k--) y = y * (t - xn[k]) + cn[k]; return y; };
  };
  function newtonFormHTML(xs, coef, F) {
    const parts = [];
    for (let k = 0; k < coef.length; k++) {
      if (F.isZero(coef[k]) && k > 0) continue;
      const facs = xs.slice(0, k).map((x) => IP.factor(x, F)).join('');
      const negative = F.num(coef[k]) < 0;
      const a = negative ? F.neg(coef[k]) : coef[k];
      const isOne = F.exact ? a.eq(new E.Q(1n)) : Math.abs(a - 1) < 1e-12;
      parts.push({ negative, body: k === 0 ? IP.v(a) : (isOne ? '' : IP.v(a)) + facs });
    }
    return parts.map((p, k) => (k === 0 ? (p.negative ? '−' : '') + p.body : (p.negative ? ' − ' : ' + ') + p.body)).join('');
  }
  function nestedFormHTML(xs, coef, F) {
    const d = coef.length - 1;
    let s = IP.v(coef[d]);
    for (let k = d - 1; k >= 0; k--) s = IP.v(coef[k]) + ' + ' + IP.factor(xs[k], F) + '(' + s + ')';
    return s;
  }

  /* ---------- written solution ---------- */
  /* P(t) term by term: each bracket (t − x_j) worked out, then the terms added */
  function termLines(xs, coef, t, F) {
    const lines = [], vals = [], subs = [];
    coef.forEach((c, k) => {
      if (k > 0 && F.isZero(c)) return;
      const facs = xs.slice(0, k).map((x) => F.sub(t, x));
      let v = c;
      facs.forEach((f) => { v = F.mul(v, f); });
      vals.push(v);
      const sub = M.paren(IP.v(c)) + xs.slice(0, k).map((x) => '(' + IP.v(t) + ' − ' + M.paren(IP.v(x)) + ')').join('');
      subs.push(k === 0 ? IP.v(c) : sub);
      if (k === 0) { lines.push('term 1: ' + M.v('c', 1) + ' = ' + IP.v(c)); return; }
      lines.push('term ' + (k + 1) + ': ' + sub + ' = ' + IP.productLine([c].concat(facs), F));
    });
    // the whole substitution on one line: 1 + ½(2 − 0) + ½(2 − 0)(2 − 2)
    return { lines, vals, sub: subs.join(' + ') };
  }

  function nddBoard(xs, ys, F, o) {
    o = o || {};
    const n = xs.length;
    const dd = E.divDiff(xs, ys, F);
    const { T, ops, coef } = dd;
    const deg = E.degreeFromCoef(coef, F);
    const same = (a, b) => (F.exact ? F.isZero(F.sub(a, b)) : Math.abs(F.num(a) - F.num(b)) < 1e-9);
    const steps = [];
    const brackets = (k) => Array.from({ length: k }, (_, j) => '(<i>x</i> − ' + M.v('x', j + 1) + ')').join('');
    const general = '<i>P</i>(<i>x</i>) = ' + Array.from({ length: Math.min(n, 4) }, (_, k) => M.v('c', k + 1) + brackets(k)).join(' + ') + (n > 4 ? ' + ⋯' : '');
    steps.push({
      title: 'Write down what you know',
      text: n + ' points, so <i>P</i>(<i>x</i>) has degree at most ' + (n - 1) + '. Newton\'s divided differences gives the same polynomial as Lagrange, written so that each point adds one term:',
      table: IP.pointsTable(xs, ys),
      then: [general],
      note: 'The numbers ' + M.v('c', 1) + ', ' + M.v('c', 2) + ', … come from a triangle of "divided differences". Each one is a change in y divided by a change in x.',
      tut: {
        sayTable: 'Number the points 1 to ' + n + ', in the order they are given. Keep that order all the way through.',
        sayThen: ['Newton\'s form: every term has one more bracket than the last. The numbers ' + M.v('c', 1) + ', ' + M.v('c', 2) + ', … come from a triangle.'],
      },
    });
    steps.push({
      title: 'Start the triangle: the x and y columns',
      text: 'Write the x-values in the first column and the y-values next to them, in the same order. The y-values are the 0th divided differences: <i>f</i>[' + M.v('x', 'k') + '] = ' + M.v('y', 'k') + '.',
      lines: [xs.map((_, k) => '<i>f</i>[' + M.v('x', k + 1) + '] = ' + cellVal(ys[k])).join(', &nbsp; ')],
      node: triangle(xs, T, { known: () => false }),
      tut: {
        say: ['The y-values are the first column of the triangle. Nothing to work out yet.'],
        sayNode: 'x-values on the left, y-values next to them. Each new column is built from the column on its left.',
      },
    });
    for (let j = 1; j < n; j++) {
      const lines = [], say = [];
      for (let i = 0; i < n - j; i++) {
        const op = ops[j][i];
        lines.push(fLabel(i, j) + ' = ' + M.fr(fLabel(i + 1, j - 1) + ' − ' + fLabel(i, j - 1), M.v('x', i + j + 1) + ' − ' + M.v('x', i + 1)) + ' = ' +
          M.fr(IP.pen('a', cellVal(op.bot)) + ' − ' + IP.pen('a', M.paren(cellVal(op.top))), IP.pen('a', cellVal(xs[i + j])) + ' − ' + IP.pen('a', M.paren(cellVal(xs[i])))) + ' = ' + IP.divLine(op.nu, op.de, F, true));
        say.push('The blue box is ' + fLabel(i, j) + '. Top: the lower yellow number minus the upper one, ' + cellVal(op.bot) + ' − ' + M.paren(cellVal(op.top)) +
          '. Bottom: the yellow x-values, end minus start, ' + cellVal(xs[i + j]) + ' − ' + M.paren(cellVal(xs[i])) + '.' + (j > 1 && i === 0 ? ' These x\'s are ' + j + ' rows apart now.' : ''));
      }
      const m = n - j;
      steps.push({
        title: ORD[j] + ' divided differences (column ' + (j + 2) + ')',
        text: j === 1
          ? 'Each new number = (lower y − upper y) ÷ (lower x − upper x). It is the slope between two neighbouring points.'
          : 'Each new number = (lower − upper number from the column on its left) ÷ (x at the <b>end</b> of its span − x at the <b>start</b>). Each number now spans ' + (j + 1) + ' points, so its two x\'s are ' + j + ' rows apart.',
        lines,
        node: triangle(xs, T, { known: (jj) => jj <= j }),
        warn: j === 1
          ? 'keep fractions exactly as they are. Rounding inside the triangle spoils every number after it.'
          : 'the bottom is not the neighbouring x\'s any more. For ' + fLabel(0, j) + ' it is ' + M.v('x', j + 1) + ' − ' + M.v('x', 1) + ' = ' + cellVal(xs[j]) + ' − ' + M.paren(cellVal(xs[0])) + '.',
        tut: {
          noGiven: true, onlyNewest: true, say,
          // the triangle follows along: yellow = the numbers used, blue = the one being made
          // ask: during "your turn" the blue box shows ? instead of its value
          nodeFor: (c, ask) => (c < 0 ? triangle(xs, T, { known: (jj) => jj < j })
            : c >= m ? triangle(xs, T, { known: (jj) => jj <= j })
              : triangle(xs, T, { known: (jj, ii) => jj < j || (jj === j && ii < c), target: [j, c], src: [[j - 1, c], [j - 1, c + 1]], xsrc: [c, c + j], ask })),
        },
      });
    }
    steps.push({
      title: 'Read the coefficients from the top edge',
      text: 'The first (top) number in every column is a coefficient.',
      lines: coef.map((c, j) => M.v('c', j + 1) + ' = ' + (j === 0 ? '<i>f</i>[' + M.v('x', 1) + ']' : fLabel(0, j)) + ' = ' + cellVal(c)),
      node: triangle(xs, T, { known: () => true, top: true }),
      note: deg < n - 1 ? 'The top edge ends in zero' + (n - 1 - deg > 1 ? 's' : '') + ', so those terms vanish and <i>P</i> has degree only ' + deg + '.' : null,
      tut: {
        noGiven: true,
        intro: 'The triangle is finished. The answer only needs its top edge.',
        say: coef.map((c, j) => M.v('c', j + 1) + ' is the top number of ' + (j === 0 ? 'the y column' : 'column ' + (j + 2)) + ': ' + cellVal(c) + '.'),
        nodeFor: (c) => (c >= 0 && c < n ? triangle(xs, T, { known: () => true, target: [c, 0] }) : triangle(xs, T, { known: () => true, top: c >= n })),
      },
    });
    steps.push({
      title: 'Write P(x)',
      text: 'Each term has one more bracket than the one before. The brackets use ' + M.v('x', 1) + ', ' + M.v('x', 2) + ', … in order; the last point ' + M.v('x', n) + ' never appears in a bracket.',
      lines: [general, '<i>P</i>(<i>x</i>) = ' + M.res(newtonFormHTML(xs, coef, F))],
      tut: { say: ['The pattern: each term has one more bracket than the one before.', 'Put in the top-edge numbers and the x-values. The last x, ' + IP.v(xs[n - 1]) + ', never goes in a bracket.'], focus: [null, IP.focusAll(n - 1, 'x', 'a')] },
    });
    const answer = ['<i>P</i>(<i>x</i>) = ' + newtonFormHTML(xs, coef, F)];
    [o.t, o.t2].forEach((t, which) => {
      if (t === null || t === undefined) return;
      const tl = termLines(xs, coef, t, F), value = E.newtonEval(coef, xs, t, F).value;
      steps.push({
        title: 'Find P(' + IP.v(t) + ')' + (which ? ' the same way' : ''),
        text: 'Put <i>x</i> = ' + IP.v(t) + ' into every term. Work out each bracket first, then multiply.',
        lines: tl.lines.concat(['<i>P</i>(' + IP.v(t) + ') = ' + IP.sumHTML(tl.vals, F) + ' = ' + M.res(IP.vd(value)) + (o.unit ? ' ' + o.unit : '')]),
        note: which ? null : 'On a calculator the nested form is quicker: ' + nestedFormHTML(xs, coef, F) + ', worked from the inside out.',
        tut: {
          focusIntro: which ? { t2: 'c' } : { t: 'c' },
          say: tl.lines.map((_, q) => (q === 0 ? 'Term 1 is just ' + M.v('c', 1) + '.' : 'Next term: its coefficient times its brackets, each with <i>x</i> = ' + IP.v(t) + '.'))
            .concat(['Add the terms. This is <i>P</i>(' + IP.v(t) + ').']),
        },
      });
      answer.push('<i>P</i>(' + IP.v(t) + ') = ' + IP.vd(value) + (o.unit ? ' ' + o.unit : ''));
    });
    if (o.expand !== false && deg >= 2) {
      const rows = [], lines = [];
      let run = [F.one()]; // the brackets of the current term, multiplied out
      coef.forEach((c, k) => {
        if (k === 1) run = E.poly.mulLin(run, xs[0], F);
        if (k >= 2) { const m = IP.mulLinLine(run, xs[k - 1], F); run = m.poly; lines.push('brackets of term ' + (k + 1) + ': ' + m.line); }
        if (F.isZero(c)) return;
        const p = E.poly.scale(run, c, F);
        if (k >= 1) lines.push('term ' + (k + 1) + ': ' + M.paren(IP.v(c)) + '[' + E.poly.html(run, F, UI.dp()) + '] = ' + E.poly.html(p, F, UI.dp()));
        rows.push({ label: 'term ' + (k + 1), poly: p });
      });
      steps.push({
        title: 'Expanded form (only if the question asks)',
        text: 'Each term\'s brackets are the previous term\'s brackets times one more bracket, so multiply out once and reuse. Then line up like terms and add each column.',
        lines,
        table: IP.collectTable(rows, F),
        then: ['<i>P</i>(<i>x</i>) = ' + M.res(E.poly.html(dd.poly, F, UI.dp()))],
        tut: {
          intro: 'Only if the question says "expand" or "simplify". Each term reuses the brackets of the term before it.',
          say: lines.map((l) => (l.indexOf('brackets of term') === 0 ? 'Multiply out this term\'s brackets: the last term\'s brackets times one more.' : 'Multiply every term in the brackets by the coefficient.')),
          sayTable: 'Line up like terms, one column per power of <i>x</i>, and add down each column.',
          sayThen: ['The bottom row is <i>P</i>(<i>x</i>) multiplied out.'],
        },
      });
    } else if (o.expand !== false) {
      steps.push({ title: 'Expanded form (only if the question asks)', lines: ['<i>P</i>(<i>x</i>) = ' + E.poly.html(dd.poly, F, UI.dp())] });
    }
    steps.push({
      title: 'Check: P goes through every point',
      text: 'Put each x into <i>P</i>(<i>x</i>); you must get back its y. In Newton form most brackets become 0, so this is quick.',
      lines: xs.map((x, k) => {
        const tl = termLines(xs, coef, x, F), v = E.newtonEval(coef, xs, x, F).value;
        return '<i>P</i>(' + IP.v(x) + ') = ' + tl.sub + (tl.vals.length > 1 ? ' = ' + IP.sumHTML(tl.vals, F) : '') + ' = ' + IP.v(v) + (same(v, ys[k]) ? ' = ' + M.v('y', k + 1) + ' ✓' : '');
      }),
      tut: {
        say: xs.map((x, k) => 'Put <i>x</i> = ' + IP.v(x) + ' in. ' + (k < n - 1 ? 'From term ' + (k + 2) + ' on, a bracket is 0. ' : '') + 'You should get back ' + M.v('y', k + 1) + ' = ' + IP.v(ys[k]) + '.'),
        focus: xs.map((_, k) => IP.focusOne(k, { x: 'a', y: 'a' })),
      },
    });
    if (o.howMany) {
      steps.push({
        title: 'How many polynomials of each degree?',
        text: 'The degree from the triangle is <b><i>D</i> = ' + deg + '</b>, with ' + n + ' points.',
        lines: Array.from({ length: n + 2 }, (_, d) => 'degree ' + d + ': ' + (d < deg ? 'none' : d === deg ? '<b>exactly one</b>' : d <= n - 1 ? 'none' : 'infinitely many')),
        note: 'Degree ≥ ' + n + ': add <i>c</i>(<i>x</i> − ' + M.v('x', 1) + ')⋯(<i>x</i> − ' + M.v('x', n) + ') with any <i>c</i> ≠ 0.',
      });
    }
    const extra = [[o.t, 't'], [o.t2, 't2']].filter(([t]) => t !== null && t !== undefined).map(([t, key]) => ({ key, html: 'find <i>P</i>(' + IP.v(t) + ')' }));
    return { steps, answer, given: IP.given(xs, ys, extra.length ? extra : null) };
  }

  /* ---------- animation ---------- */
  function nddWalk(parent, o) {
    const { xs, ys, F } = o;
    const n = xs.length;
    const dd = E.divDiff(xs, ys, F);
    const { T, ops, coef } = dd;
    const cells = [];
    for (let j = 1; j < n; j++) for (let i = 0; i < n - j; i++) cells.push([j, i]);
    const N = 2 + cells.length;
    const xn = xs.map((v) => F.num(v)), yn = ys.map((v) => F.num(v));
    const order = (j, i) => cells.findIndex((c) => c[0] === j && c[1] === i);
    return UI.walk(parent, {
      title: o.title, n: N, plot: { height: 260 },
      render(s, w) {
        const ci = s - 1;
        const cur = ci >= 0 && ci < cells.length ? cells[ci] : null;
        const doneUpTo = cur ? ci - 1 : s === 0 ? -1 : cells.length - 1;
        const st = { known: (j, i) => order(j, i) <= doneUpTo, top: s === N - 1 };
        let html;
        if (s === 0) html = '<h4>Set up</h4><p>x and y columns. ' + cells.length + ' numbers to compute.</p>';
        else if (cur) {
          const [j, i] = cur, op = ops[j][i];
          st.target = cur; st.src = [[j - 1, i], [j - 1, i + 1]]; st.xsrc = [i, i + j];
          html = '<h4>' + fLabel(i, j) + '</h4><p>Yellow: the two numbers on its left and the two x\'s at the ends of its span.</p><div class="calcline">' + M.fr(cellVal(op.bot) + ' − ' + M.paren(cellVal(op.top)), cellVal(xs[i + j]) + ' − ' + M.paren(cellVal(xs[i]))) + ' = <b>' + cellVal(T[j][i]) + '</b></div>' + (i === 0 ? '<p>Top edge → coefficient ' + M.v('c', j + 1) + '.</p>' : '');
        } else html = '<h4>Read the top edge</h4><div class="calcline"><i>P</i>(<i>x</i>) = ' + newtonFormHTML(xs, coef, F) + '</div>';
        w.narr.innerHTML = html;
        w.extra.innerHTML = '';
        w.extra.appendChild(triangle(xs, T, st));
        let m = 0;
        for (let j = 1; j < n; j++) if (order(j, 0) <= (cur ? ci : doneUpTo)) m = j;
        const Pm = partialFn(xs, coef, m, F);
        w.plot.scene = (p) => {
          for (let q = 0; q < m; q++) p.fn(partialFn(xs, coef, q, F), { color: 'c' + (2 + (q % 5)), width: 1.3, alpha: 0.45 });
          p.fn(Pm, { color: 'ink', width: 2.6 });
          xn.forEach((x, q) => p.point(x, yn[q], { color: q <= m ? 'c1' : 'plot-axis', r: 6, hollow: q > m, label: 'x' + E.subDigits(q + 1) }));
        };
        w.plot.legend([{ label: 'polynomial through the first ' + (m + 1) + ' point' + (m ? 's' : ''), color: 'ink' }, { label: 'points used so far', color: 'c1', dot: true }]);
        if (!w._fitted) { w._fitted = true; IP.fitPoints(w.plot, xn, yn, [partialFn(xs, coef, n - 1, F)]); } else w.plot.render();
      },
    });
  }

  const q = E.Q.parse;
  const QL = (a) => a.map((s) => q(String(s)));
  const ex = (title, src, xsA, ysA, opt) => {
    opt = opt || {};
    const xs = QL(xsA), ys = QL(ysA);
    const t = opt.t !== undefined ? q(String(opt.t)) : null;
    return {
      title, src,
      problem: (opt.story ? '<p>' + opt.story + '</p>' : '<p>Use Newton\'s divided differences for the points</p>') + '<div class="eq">' + IP.pointsText(xs, ys) + '</div><p>' + (opt.ask || ('Find the interpolating polynomial' + (t ? ' and evaluate it at <i>x</i> = ' + IP.v(t) : '') + '.')) + '</p>',
      solve: () => nddBoard(xs, ys, E.QF, { t, t2: opt.t2 !== undefined ? q(String(opt.t2)) : undefined, howMany: opt.howMany, unit: opt.unit, expand: opt.expand }),
      watch: (el) => nddWalk(el, { xs, ys, F: E.QF }),
    };
  };

  const topic = {
    id: 'ndd', num: 7, unit: 'midterm',
    title: 'Newton\'s Divided Differences', short: 'divided differences',
    book: 'Sauer §3.1.2', tagline: 'The same polynomial as Lagrange, built one point at a time from a triangle.',

    lessons: [
      { title: 'The idea', build(el) {
        el.appendChild(h('p', { class: 'big', html: 'Same goal as Lagrange — one polynomial through all the points — but written so <b>each new point adds just one term</b>:' }));
        el.appendChild(h('div', { class: 'eq', html: '<i>P</i>(<i>x</i>) = ' + M.v('c', 1) + ' + ' + M.v('c', 2) + '(<i>x</i> − ' + M.v('x', 1) + ') + ' + M.v('c', 3) + '(<i>x</i> − ' + M.v('x', 1) + ')(<i>x</i> − ' + M.v('x', 2) + ') + ⋯' }));
        el.appendChild(h('p', { html: 'The coefficients ' + M.v('c', 1) + ', ' + M.v('c', 2) + ', … come from a <b>triangle table</b>. You fill the triangle with one move, over and over.' }));
      } },
      { title: 'The one move', build(el) {
        el.appendChild(h('div', { class: 'eq', html: 'new number = ' + M.fr('(lower-left) − (upper-left)', '(x at the end of the span) − (x at the start)') }));
        el.appendChild(h('p', { html: '<b>Finding the span:</b> from the new cell, slide diagonally up-left and down-left back to the x-column. The two x\'s you land on are the ones you subtract.' }));
        el.appendChild(UI.table(['Column', 'Divide by', 'Example'], [
          ['2nd (1st differences)', 'neighbouring x\'s', M.v('x', 2) + ' − ' + M.v('x', 1)],
          ['3rd (2nd differences)', 'skip one x', M.v('x', 3) + ' − ' + M.v('x', 1)],
          ['4th (3rd differences)', 'skip two x\'s', M.v('x', 4) + ' − ' + M.v('x', 1)],
        ], { align: ['l', 'l', 'l'] }).el);
        el.appendChild(h('p', { class: 'small muted', html: 'Book notation: <i>f</i>[' + M.v('x', 'k') + ' ' + M.v('x', 'k+1') + ' ' + M.v('x', 'k+2') + '] = (<i>f</i>[' + M.v('x', 'k+1') + ' ' + M.v('x', 'k+2') + '] − <i>f</i>[' + M.v('x', 'k') + ' ' + M.v('x', 'k+1') + ']) / (' + M.v('x', 'k+2') + ' − ' + M.v('x', 'k') + ')' }));
      } },
      { title: 'The steps', build(el) {
        el.appendChild(UI.recipe([
          '<b>Two columns:</b> x-values and y-values.',
          '<b>Column 2:</b> (lower y − upper y) ÷ (lower x − upper x).',
          '<b>Next columns:</b> (lower − upper) ÷ (x at end of span − x at start). The span grows by one each column.',
          '<b>Stop</b> when a column has one number.',
          '<b>Read the top edge:</b> ' + M.v('c', 1) + ', ' + M.v('c', 2) + ', ' + M.v('c', 3) + ', …',
          '<b>Write</b> <i>P</i>(<i>x</i>) = ' + M.v('c', 1) + ' + ' + M.v('c', 2) + '(<i>x</i> − ' + M.v('x', 1) + ') + ' + M.v('c', 3) + '(<i>x</i> − ' + M.v('x', 1) + ')(<i>x</i> − ' + M.v('x', 2) + ') + ⋯',
          '<b>Evaluate</b> with nested multiplication, base points ' + M.v('x', 1) + ', ' + M.v('x', 2) + ', … (Topic 1).',
        ]));
      } },
      { title: 'Watch it', build(el) {
        el.appendChild(h('p', { class: 'muted', html: 'Blue = the number being computed. Yellow = the two numbers it uses and the two x\'s it divides by.' }));
        nddWalk(el, { title: 'Book Example 3.4: (0, 1), (2, 2), (3, 4), (1, 0)', xs: QL([0, 2, 3, 1]), ys: QL([1, 2, 4, 0]), F: E.QF });
      } },
      { title: 'New points and zeros', build(el) {
        el.appendChild(h('p', { html: '<b>Adding a point is cheap.</b> Keep the old triangle and add one row at the bottom. Only one new term appears. Example 3.4: adding (1, 0) to (0, 1), (2, 2), (3, 4) gives' }));
        el.appendChild(h('div', { class: 'eq', html: '<i>P</i><sub>3</sub>(<i>x</i>) = <i>P</i><sub>2</sub>(<i>x</i>) − ½<i>x</i>(<i>x</i> − 2)(<i>x</i> − 3)' }));
        el.appendChild(h('p', { html: '<b>Zeros on the top edge mean lower degree.</b> For (0, 2), (1, 1), (2, 0), (3, −1) the top edge is 2, −1, 0, 0, so <i>P</i>(<i>x</i>) = 2 − <i>x</i>.' }));
        el.appendChild(h('p', { html: '<b>"How many polynomials of degree <i>d</i>?"</b> If the triangle gives degree <i>D</i> with <i>n</i> points: fewer than <i>D</i> → none; <i>D</i> → exactly one; between <i>D</i> and <i>n</i> − 1 → none; <i>n</i> or more → infinitely many.' }));
        el.appendChild(h('h3', { text: 'Try it: drag the points', style: { marginTop: '16px' } }));
        const pg = h('div');
        el.appendChild(pg);
        IP.playground(pg, {
          points: [[-1, -5], [0, -1], [2, 1], [3, 11]],
          info: (box, xs, ys) => {
            const F = E.QF, qx = xs.map((v) => E.Q.from(v)), qy = ys.map((v) => E.Q.from(v));
            const dd = E.divDiff(qx, qy, F);
            box.innerHTML = '';
            box.appendChild(triangle(qx, dd.T, { known: () => true, top: true }));
            box.appendChild(h('p', { class: 'math', style: { marginTop: '8px' }, html: '<i>P</i>(<i>x</i>) = ' + newtonFormHTML(qx, dd.coef, F) }));
          },
        });
      } },
      { title: 'Watch out', build(el) {
        el.appendChild(UI.callout('warn', 'Common mistakes (the first costs the most points)', '<ul><li><b>Dividing by neighbouring x\'s in later columns.</b> Column 3 skips one x, column 4 skips two.</li><li><b>Subtracting upside down.</b> Lower − upper on top, end-x − start-x below.</li><li><b>Reading the wrong edge.</b> Coefficients are the <b>top</b> edge.</li><li><b>Using ' + M.v('x', 'n') + ' as a factor.</b> The last factor is (<i>x</i> − ' + M.v('x', 'n−1') + ').</li><li><b>Rounding inside the triangle.</b> Keep fractions.</li></ul>'));
        el.appendChild(UI.callout('calc', 'Calculator tricks', '<ul><li>Each cell is one line: <span class="kbd">(lower − upper) ÷ (x<sub>end</sub> − x<sub>start</sub>)</span>. Bracket both!</li><li>Keep fractions; <span class="kbd">S⇔D</span> only at the end.</li><li>Check <i>P</i>(<i>x</i>) with <span class="kbd">CALC</span> at each data x.</li></ul>'));
      } },
    ],

    examples: [
      ex('Three points', 'Book Example 3.3', [0, 2, 3], [1, 2, 4], { t: 1 }),
      ex('Add a fourth point (1, 0)', 'Book Example 3.4', [0, 2, 3, 1], [1, 2, 4, 0], {}),
      ex('How many polynomials?', 'Book Example 3.6', [-1, 0, 2, 3], [-5, -1, 1, 11], { howMany: true, ask: 'How many polynomials of each degree 0 ≤ <i>d</i> ≤ 5 pass through these points?' }),
      ex('Points on a line', 'Book Example 3.5', [0, 1, 2, 3], [2, 1, 0, -1], {}),
      ex('Four points', 'Exercise 3.1-2(b)', [-1, 2, 3, 5], [0, 1, 1, 2], { t: 4 }),
      ex('CO₂ in the atmosphere', 'Exercise 3.1-17', [1800, 1850, 1900, 2000], [280, 283, 291, 370], { t: 1950, t2: 2050, unit: 'ppm', expand: false, story: 'Carbon dioxide concentration (ppm): 280 in 1800, 283 in 1850, 291 in 1900, 370 in 2000.', ask: 'Find the degree-3 interpolating polynomial and estimate the CO₂ concentration in 1950 and 2050.' }),
    ],

    solve(el) {
      const form = IP.dataForm({ x: '0, 2, 3, 1', y: '1, 2, 4, 0', t: '1.5' });
      const out = h('div');
      el.appendChild(h('div', { class: 'card' },
        h('div', { class: 'form-grid' }, ...form.els),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Show the solution'))));
      el.appendChild(out);
      function run() {
        out.innerHTML = '';
        const d = form.read();
        if (d.error) { out.appendChild(UI.error(d.error)); return; }
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Solution' }));
        out.appendChild(paper);
        UI.solution(paper, nddBoard(d.xs, d.ys, d.F, { t: d.t }), { reveal: 'all' });
        UI.watch(paper, (b) => nddWalk(b, { xs: d.xs, ys: d.ys, F: d.F }));
      }
      run();
    },
    formulas: '<div class="eq"><i>f</i>[' + M.v('x', 'k') + '…' + M.v('x', 'k+j') + '] = ' + M.fr('<i>f</i>[' + M.v('x', 'k+1') + '…' + M.v('x', 'k+j') + '] − <i>f</i>[' + M.v('x', 'k') + '…' + M.v('x', 'k+j−1') + ']', M.v('x', 'k+j') + ' − ' + M.v('x', 'k')) + '</div><div class="eq"><i>P</i>(<i>x</i>) = <i>f</i>[' + M.v('x', 1) + '] + <i>f</i>[' + M.v('x', 1) + ' ' + M.v('x', 2) + '](<i>x</i>−' + M.v('x', 1) + ') + ⋯</div><ul><li>Coefficients = top edge of the triangle</li><li>New point → one new row, one new term</li></ul>',
  };

  /* ---------- practice ---------- */
  function randData(n, sorted) {
    let xs = R.distinct(n, -2, 5);
    if (sorted !== false) xs.sort((a, b) => a - b);
    return { xs: xs.map((v) => E.Q.from(v)), ys: xs.map(() => E.Q.from(R.int(-5, 9))) };
  }
  const g1 = () => {
    const F = E.QF;
    const n = R.pick([3, 4, 4]);
    const { xs, ys } = randData(n, Math.random() < 0.85);
    const dd = E.divDiff(xs, ys, F);
    return {
      type: 'Fill the triangle',
      prompt: '<p>Build the divided-difference triangle for ' + IP.pointsText(xs, ys) + '. Fractions like −7/6 are fine.</p>',
      build: (box, reg) => box.appendChild(triangle(xs, dd.T, { input: (j, i) => reg(h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': UI.plain(fLabel(i, j)) }), F.num(dd.T[j][i])) })),
      hint: '<p>Column 2: (lower y − upper y) ÷ (lower x − upper x). Column 3: divide by the x two rows apart. Column 4: last x − first x.</p>',
      board: () => nddBoard(xs, ys, F, { expand: false }),
      solution: (box) => nddWalk(box, { xs, ys, F }),
    };
  };
  g1.label = 'Fill the triangle';
  const g2 = () => {
    const F = E.QF;
    const { xs, ys } = randData(4);
    const dd = E.divDiff(xs, ys, F);
    let t;
    do { t = E.Q.from(R.int(-2, 6)); } while (xs.some((x) => x.eq(t)));
    const v = E.newtonEval(dd.coef, xs, t, F).value;
    return {
      type: 'Coefficients and P(x)',
      prompt: '<p>For the data ' + IP.pointsText(xs, ys) + ', find the Newton coefficients ' + M.v('c', 1) + ', …, ' + M.v('c', 4) + ' and then <i>P</i>(' + IP.v(t) + ').</p>',
      fields: dd.coef.map((c, j) => ({ label: M.v('c', j + 1) + ' =', answer: F.num(c) })).concat([{ label: '<i>P</i>(' + IP.v(t) + ') =', answer: F.num(v) }]),
      hint: '<p>Do the whole triangle, read the top edge, then nested multiplication with base points ' + xs.slice(0, 3).map((x) => IP.v(x)).join(', ') + '.</p>',
      board: () => nddBoard(xs, ys, F, { t, expand: false }),
      solution: (box) => nddWalk(box, { xs, ys, F }),
    };
  };
  g2.label = 'Coefficients + P(t)';
  const g3 = () => {
    const F = E.QF;
    const { xs, ys } = randData(3);
    const dd3 = E.divDiff(xs, ys, F);
    let xn;
    do { xn = E.Q.from(R.int(-3, 6)); } while (xs.some((x) => x.eq(xn)));
    const yn = E.Q.from(R.int(-5, 9));
    const xs4 = xs.concat([xn]), ys4 = ys.concat([yn]);
    const dd4 = E.divDiff(xs4, ys4, F);
    return {
      type: 'Add a new point',
      prompt: '<p>The triangle for ' + IP.pointsText(xs, ys) + ' is done (below). Now (' + IP.v(xn) + ', ' + IP.v(yn) + ') arrives. Add one row: find the new bottom diagonal and the new coefficient ' + M.v('c', 4) + '.</p>',
      build: (box) => box.appendChild(triangle(xs, dd3.T, { known: () => true, top: true })),
      fields: [
        { label: fLabel(2, 1) + ' =', answer: F.num(dd4.T[1][2]) },
        { label: fLabel(1, 2) + ' =', answer: F.num(dd4.T[2][1]) },
        { label: M.v('c', 4) + ' = ' + fLabel(0, 3) + ' =', answer: F.num(dd4.T[3][0]) },
      ],
      hint: '<p>Put ' + M.v('x', 4) + ' = ' + IP.v(xn) + ' at the bottom and work up the new diagonal.</p>',
      board: () => nddBoard(xs4, ys4, F, { expand: false }),
      solution: (box) => nddWalk(box, { xs: xs4, ys: ys4, F }),
    };
  };
  g3.label = 'Add a point';
  const g4 = () => {
    const F = E.QF;
    const D = R.pick([1, 2, 2, 3]);
    const cs = Array.from({ length: D + 1 }, (_, k) => (k === D ? R.nz(-2, 2) : R.int(-3, 3)));
    const xsN = R.distinct(4, -2, 4).sort((a, b) => a - b);
    const xs = xsN.map((v) => E.Q.from(v));
    const ys = xsN.map((x) => E.Q.from(cs.reduce((s, c, k) => s + c * Math.pow(x, k), 0)));
    const d = R.int(0, 5);
    const ans = d < D ? 0 : d === D ? 1 : d <= 3 ? 0 : 2;
    const opts = ['None (0)', 'Exactly one', 'Infinitely many'];
    return {
      type: 'How many polynomials?',
      prompt: '<p>How many polynomials of degree <b>exactly ' + d + '</b> pass through ' + IP.pointsText(xs, ys) + '?</p>',
      choices: { options: opts, correct: ans },
      hint: '<p>Find the degree <i>D</i> from the triangle\'s top edge. Below <i>D</i>: none. <i>D</i>: one. Between <i>D</i> and 3: none. 4 or more: infinitely many.</p>',
      board: () => { const b = nddBoard(xs, ys, F, { howMany: true, expand: false }); b.answer = ['Degree ' + d + ': ' + opts[ans]]; return b; },
      solution: (box) => nddWalk(box, { xs, ys, F }),
    };
  };
  g4.label = 'How many?';
  const g5 = () => {
    const xs = R.distinct(5, -3, 8).sort((a, b) => a - b);
    const j = R.int(2, 4);
    const i = R.int(0, 4 - j);
    return {
      type: 'Which x\'s do you divide by?',
      prompt: '<p>The x-values are ' + xs.map((x, k) => M.v('x', k + 1) + ' = ' + x).join(', ') + '. What is the <b>denominator</b> when you compute ' + fLabel(i, j) + '?</p>',
      fields: [{ label: 'denominator =', answer: xs[i + j] - xs[i], tol: 0 }],
      hint: '<p>End of the span minus start: ' + M.v('x', i + j + 1) + ' − ' + M.v('x', i + 1) + '. Not the neighbours!</p>',
      board: () => ({ steps: [{ title: 'Find the span', lines: [fLabel(i, j) + ' uses ' + M.v('x', i + 1) + ' through ' + M.v('x', i + j + 1)] }, { title: 'End minus start', lines: [M.v('x', i + j + 1) + ' − ' + M.v('x', i + 1) + ' = ' + xs[i + j] + ' − ' + M.paren(String(xs[i])) + ' = ' + M.res(String(xs[i + j] - xs[i]))] }], answer: ['denominator = ' + (xs[i + j] - xs[i])] }),
    };
  };
  g5.label = 'Denominators';
  g5.noExample = true;
  const g6 = () => {
    const F = E.QF;
    const xs = R.distinct(3, -1, 4).sort((a, b) => a - b).map((v) => E.Q.from(v));
    const coef = Array.from({ length: 4 }, () => E.Q.from(R.pick([1, -1, 2, -2, 3, '1/2', '-1/2'])));
    let t;
    do { t = E.Q.from(R.int(-2, 6)); } while (xs.some((x) => x.eq(t)));
    const xs4 = xs.concat([E.Q.from(99)]);
    const v = E.newtonEval(coef, xs4, t, F).value;
    return {
      type: 'Evaluate a Newton polynomial',
      prompt: '<p>Evaluate at <i>x</i> = ' + IP.v(t) + ':</p><div class="eq"><i>P</i>(<i>x</i>) = ' + newtonFormHTML(xs4, coef, F) + '</div>',
      fields: [{ label: '<i>P</i>(' + IP.v(t) + ') =', answer: F.num(v) }],
      hint: '<p>Nested: start with ' + IP.v(coef[3]) + ', × (' + IP.v(t) + ' − ' + M.paren(IP.v(xs[2])) + '), + ' + IP.v(coef[2]) + ', and so on.</p>',
      board: () => NM.topic('horner').boardFor(coef.slice().reverse(), t, F, xs),
      solution: (box) => NM.topic('horner').walkFor(box, { coefHigh: coef.slice().reverse(), x: t, F, base: xs }),
    };
  };
  g6.label = 'Evaluate';
  topic.practice = [g1, g2, g3, g4, g5, g6];
  topic.walkFor = nddWalk;
  topic.triangle = triangle;
  NM.registerTopic(topic);
})(window.NM);
