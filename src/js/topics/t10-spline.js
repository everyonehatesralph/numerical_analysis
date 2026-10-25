/* Topic 10 — Natural cubic splines, Sauer §3.4 */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h, M } = UI;
  const R = UI.rand, IP = NM.interp;
  const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  const V = (v) => E.vHTML(v, UI.dp(), false);

  function pieceHTML(sp, xs, ys, F, i) {
    const fac = IP.factor(xs[i], F);
    const terms = [{ c: ys[i], p: '' }, { c: sp.b[i], p: fac }, { c: sp.c[i], p: fac + '<sup>2</sup>' }, { c: sp.d[i], p: fac + '<sup>3</sup>' }];
    const parts = terms.filter((t, k) => k === 0 || !F.isZero(t.c)).map((t, k) => {
      const neg = F.num(t.c) < 0;
      const a = neg ? F.neg(t.c) : t.c;
      const one = !t.p ? false : F.exact ? a.eq(new E.Q(1n)) : Math.abs(a - 1) < 1e-12;
      return (k === 0 ? (neg ? '−' : '') : neg ? ' − ' : ' + ') + (one ? '' : V(a)) + t.p;
    });
    return M.v('S', i + 1) + '(<i>x</i>) = ' + parts.join('');
  }
  /* "4c₂ + c₃ = 24" from a matrix row */
  function eqHTML(row, rhs, F) {
    const parts = [];
    row.forEach((a, j) => {
      if (F.isZero(a)) return;
      const neg = F.num(a) < 0, abs = neg ? F.neg(a) : a;
      const one = F.exact ? abs.eq(new E.Q(1n)) : Math.abs(abs - 1) < 1e-12;
      parts.push((parts.length ? (neg ? ' − ' : ' + ') : neg ? '−' : '') + (one ? '' : V(abs)) + M.v('c', j + 1));
    });
    return parts.join('') + ' = ' + V(rhs);
  }

  /* ---------- written solution ---------- */
  function splineBoard(xs, ys, F, o) {
    o = o || {};
    const n = xs.length;
    const sp = E.naturalSpline(xs, ys, F);
    if (sp.error) throw new Error(sp.error);
    const steps = [];
    steps.push({
      title: 'Widths and rises',
      text: M.v('δ', 'i') + ' = ' + M.v('x', 'i+1') + ' − ' + M.v('x', 'i') + ', &nbsp; ' + M.v('Δ', 'i') + ' = ' + M.v('y', 'i+1') + ' − ' + M.v('y', 'i'),
      lines: sp.del.map((d, k) => M.v('δ', k + 1) + ' = ' + V(xs[k + 1]) + ' − ' + M.paren(V(xs[k])) + ' = ' + V(d) + ', &nbsp; ' + M.v('Δ', k + 1) + ' = ' + V(ys[k + 1]) + ' − ' + M.paren(V(ys[k])) + ' = ' + V(sp.Del[k]) + ', &nbsp; ' + M.v('Δ', k + 1) + '/' + M.v('δ', k + 1) + ' = ' + V(F.div(sp.Del[k], d))),
    });
    steps.push({ title: 'Natural ends', lines: [M.v('c', 1) + ' = 0, &nbsp; ' + M.v('c', n) + ' = 0'], note: 'Zero curvature at both ends.' });
    const eqLines = [];
    for (let i = 1; i < n - 1; i++) {
      eqLines.push(M.v('δ', i) + M.v('c', i) + ' + 2(' + M.v('δ', i) + ' + ' + M.v('δ', i + 1) + ')' + M.v('c', i + 1) + ' + ' + M.v('δ', i + 1) + M.v('c', i + 2) + ' = 3(' + M.v('Δ', i + 1) + '/' + M.v('δ', i + 1) + ' − ' + M.v('Δ', i) + '/' + M.v('δ', i) + ')');
      eqLines.push('&nbsp;&nbsp;→ ' + V(sp.del[i - 1]) + M.v('c', i) + ' + 2(' + V(sp.del[i - 1]) + ' + ' + V(sp.del[i]) + ')' + M.v('c', i + 1) + ' + ' + V(sp.del[i]) + M.v('c', i + 2) + ' = 3(' + V(F.div(sp.Del[i], sp.del[i])) + ' − ' + M.paren(V(F.div(sp.Del[i - 1], sp.del[i - 1]))) + ')');
      const row = sp.A[i].map((a, j) => (j === 0 || j === n - 1 ? F.zero() : a));
      eqLines.push('&nbsp;&nbsp;→ ' + M.res(eqHTML(row, sp.r[i], F)));
    }
    steps.push({ title: 'One equation for each inside point', text: 'With ' + M.v('c', 1) + ' = ' + M.v('c', n) + ' = 0 they drop out:', lines: eqLines });
    steps.push({
      title: 'Solve for the c\'s',
      lines: [sp.c.map((c, k) => M.v('c', k + 1) + ' = ' + V(c)).join(', &nbsp;')],
      note: n === 3 ? 'Only one equation: divide both sides by ' + V(sp.A[1][1]) + '.' : 'Solve the ' + (n - 2) + ' equations together (substitution or elimination).',
    });
    steps.push({ title: 'The d\'s: ' + M.v('d', 'i') + ' = (' + M.v('c', 'i+1') + ' − ' + M.v('c', 'i') + ')/(3' + M.v('δ', 'i') + ')', lines: sp.d.map((d, k) => M.v('d', k + 1) + ' = ' + M.fr(V(sp.c[k + 1]) + ' − ' + M.paren(V(sp.c[k])), '3·' + V(sp.del[k])) + ' = ' + M.res(V(d))) });
    steps.push({ title: 'The b\'s: ' + M.v('b', 'i') + ' = ' + M.v('Δ', 'i') + '/' + M.v('δ', 'i') + ' − ' + M.v('δ', 'i') + '(2' + M.v('c', 'i') + ' + ' + M.v('c', 'i+1') + ')/3', lines: sp.b.map((b, k) => M.v('b', k + 1) + ' = ' + V(F.div(sp.Del[k], sp.del[k])) + ' − ' + M.fr(V(sp.del[k]) + '(2·' + M.paren(V(sp.c[k])) + ' + ' + M.paren(V(sp.c[k + 1])) + ')', '3') + ' = ' + M.res(V(b))) });
    const pieces = sp.b.map((_, k) => pieceHTML(sp, xs, ys, F, k) + ' &nbsp; on [' + V(xs[k]) + ', ' + V(xs[k + 1]) + ']');
    steps.push({ title: 'Write the pieces', lines: pieces, note: 'Each piece is centred at its <b>left</b> point.' });
    const answer = pieces.slice();
    if (o.t !== undefined) {
      const tv = F.num(o.t);
      let k = 0;
      while (k < n - 2 && tv > F.num(xs[k + 1])) k++;
      const s = tv - F.num(xs[k]);
      const val = sp.evalNum(tv);
      steps.push({ title: 'Evaluate S(' + V(o.t) + ') — use piece ' + M.v('S', k + 1), lines: [M.v('S', k + 1) + '(' + V(o.t) + ') = ' + V(ys[k]) + ' + ' + M.paren(V(sp.b[k])) + '(' + E.fmtShort(s, 6) + ') + ' + M.paren(V(sp.c[k])) + '(' + E.fmtShort(s, 6) + ')<sup>2</sup> + ' + M.paren(V(sp.d[k])) + '(' + E.fmtShort(s, 6) + ')<sup>3</sup> = ' + M.res(E.fmtShort(val, UI.dp()))] });
      answer.push('<i>S</i>(' + V(o.t) + ') = ' + E.fmtShort(val, UI.dp()));
    }
    return { steps, answer };
  }

  /* ---------- animation ---------- */
  function splineWalk(parent, o) {
    const { xs, ys, F } = o;
    const n = xs.length;
    const sp = E.naturalSpline(xs, ys, F);
    const xn = xs.map((v) => F.num(v)), yn = ys.map((v) => F.num(v));
    const pieceFn = (i) => (t) => { const s = t - xn[i]; return yn[i] + F.num(sp.b[i]) * s + F.num(sp.c[i]) * s * s + F.num(sp.d[i]) * s * s * s; };
    const Pf = E.interpFn(xn, yn);
    return UI.walk(parent, {
      title: o.title, n: n, plot: { height: 280 },
      render(i, w) {
        w.narr.innerHTML = i === 0 ? '<h4>The knots</h4><p>' + n + ' points → ' + (n - 1) + ' cubic pieces. Press Next to add them one by one.</p>'
          : '<h4>Piece ' + M.v('S', i) + '</h4><div class="calcline">' + pieceHTML(sp, xs, ys, F, i - 1) + '</div><p>It meets the previous piece with the same value, slope and curvature.</p>' + (i === n - 1 ? '<p class="small muted">Dashed: the single polynomial through the same points.</p>' : '');
        w.plot.scene = (p) => {
          if (i === n - 1) p.fn(Pf, { color: 'plot-axis', width: 1.5, dash: [6, 5] });
          for (let k = 0; k < i; k++) p.fn(pieceFn(k), { color: COLORS[k % 6], width: 2.8, from: xn[k], to: xn[k + 1] });
          xn.forEach((x, k) => p.point(x, yn[k], { color: 'ink', r: 5.5 }));
        };
        w.plot.legend([{ label: 'each color = one cubic piece', color: 'c1' }, { label: 'knots', color: 'ink', dot: true }]);
        if (!w._fitted) { w._fitted = true; IP.fitPoints(w.plot, xn, yn, [(t) => sp.evalNum(t)]); } else w.plot.render();
      },
    });
  }

  const q = E.Q.parse;
  const QL = (a) => a.map((s) => q(String(s)));
  const ex = (title, src, xsA, ysA, opt) => {
    opt = opt || {};
    const xs = QL(xsA), ys = QL(ysA);
    const t = opt.t !== undefined ? q(String(opt.t)) : undefined;
    return {
      title, src,
      problem: '<p>Find the natural cubic spline through</p><div class="eq">' + IP.pointsText(xs, ys) + '</div>' + (t !== undefined ? '<p>Then evaluate <i>S</i>(' + V(t) + ').</p>' : '') + (opt.note ? '<p class="small muted">' + opt.note + '</p>' : ''),
      solve: () => splineBoard(xs, ys, E.QF, { t }),
      watch: (el) => splineWalk(el, { xs, ys, F: E.QF }),
    };
  };

  const topic = {
    id: 'spline', num: 10, unit: 'finals',
    title: 'Cubic Splines', short: 'cubic splines',
    book: 'Sauer §3.4', tagline: 'Instead of one wiggly polynomial, glue short cubics together smoothly.',

    lessons: [
      { title: 'The idea', build(el) {
        el.appendChild(h('p', { class: 'big', html: 'Use a <b>separate cubic</b> on each gap between neighbouring points, glued so the joins are invisible: same <b>value</b>, <b>slope</b> and <b>curvature</b> where they meet.' }));
        el.appendChild(h('div', { class: 'eq', html: M.v('S', 'i') + '(<i>x</i>) = ' + M.v('y', 'i') + ' + ' + M.v('b', 'i') + '(<i>x</i> − ' + M.v('x', 'i') + ') + ' + M.v('c', 'i') + '(<i>x</i> − ' + M.v('x', 'i') + ')<sup>2</sup> + ' + M.v('d', 'i') + '(<i>x</i> − ' + M.v('x', 'i') + ')<sup>3</sup> &nbsp; on [' + M.v('x', 'i') + ', ' + M.v('x', 'i+1') + ']' }));
        el.appendChild(h('p', { html: 'Like a flexible ruler bent through pins. Each piece is only cubic, so there are no Runge wiggles.' }));
      } },
      { title: 'The rules', build(el) {
        el.appendChild(h('ol', null,
          h('li', { html: '<b>Property 1</b> — each piece passes through its two points.' }),
          h('li', { html: '<b>Property 2</b> — slopes match at inside points: ' + M.v('S', 'i−1') + '′ = ' + M.v('S', 'i') + '′.' }),
          h('li', { html: '<b>Property 3</b> — curvatures match: ' + M.v('S', 'i−1') + '″ = ' + M.v('S', 'i') + '″.' }),
          h('li', { html: '<b>Property 4a (natural)</b> — zero curvature at both ends: ' + M.v('c', 1) + ' = ' + M.v('c', 'n') + ' = 0.' })));
        el.appendChild(h('p', { class: 'small muted', html: 'Counting: 3(<i>n</i> − 1) unknowns, but Properties 1–3 give 3<i>n</i> − 5 equations. Two short — the end conditions fill the gap. Others: clamped, curvature-adjusted, parabolically terminated, not-a-knot.' }));
      } },
      { title: 'The steps', build(el) {
        el.appendChild(UI.recipe([
          '<b>Widths and rises:</b> ' + M.v('δ', 'i') + ' = ' + M.v('x', 'i+1') + ' − ' + M.v('x', 'i') + ', ' + M.v('Δ', 'i') + ' = ' + M.v('y', 'i+1') + ' − ' + M.v('y', 'i') + '.',
          '<b>c-equations:</b> ' + M.v('c', 1) + ' = ' + M.v('c', 'n') + ' = 0, and for each inside point ' + M.v('δ', 'i−1') + M.v('c', 'i−1') + ' + 2(' + M.v('δ', 'i−1') + ' + ' + M.v('δ', 'i') + ')' + M.v('c', 'i') + ' + ' + M.v('δ', 'i') + M.v('c', 'i+1') + ' = 3(' + M.v('Δ', 'i') + '/' + M.v('δ', 'i') + ' − ' + M.v('Δ', 'i−1') + '/' + M.v('δ', 'i−1') + ').',
          '<b>Solve</b> for the c\'s.',
          '<b>d\'s:</b> ' + M.v('d', 'i') + ' = (' + M.v('c', 'i+1') + ' − ' + M.v('c', 'i') + ')/(3' + M.v('δ', 'i') + ').',
          '<b>b\'s:</b> ' + M.v('b', 'i') + ' = ' + M.v('Δ', 'i') + '/' + M.v('δ', 'i') + ' − ' + M.v('δ', 'i') + '(2' + M.v('c', 'i') + ' + ' + M.v('c', 'i+1') + ')/3.',
          '<b>Write each piece</b> and its interval.',
        ]));
      } },
      { title: 'Watch it', build(el) {
        splineWalk(el, { title: 'Book Example 3.13: (1, 2), (2, 1), (4, 4), (5, 3)', xs: QL([1, 2, 4, 5]), ys: QL([2, 1, 4, 3]), F: E.QF });
        el.appendChild(h('h3', { text: 'Try it: spline vs one polynomial', style: { marginTop: '16px' } }));
        el.appendChild(h('p', { class: 'small muted', html: 'Green: the spline. Black: the single polynomial. Make a sharp step and compare.' }));
        const pg = h('div');
        el.appendChild(pg);
        IP.playground(pg, {
          points: [[-3, 0], [-2, 0], [-1, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
          extra: (p, xs, ys) => {
            const idx = xs.map((_, k) => k).sort((a, b) => xs[a] - xs[b]);
            const sp = E.naturalSpline(idx.map((k) => xs[k]), idx.map((k) => ys[k]), E.RF);
            if (!sp.error) p.fn((t) => sp.evalNum(t), { color: 'c3', width: 3, from: xs[idx[0]], to: xs[idx[idx.length - 1]] });
          },
          legend: [{ label: 'natural cubic spline', color: 'c3' }, { label: 'single polynomial', color: 'ink' }],
        });
      } },
      { title: 'Watch out', build(el) {
        el.appendChild(UI.callout('warn', 'Common mistakes', '<ul><li><b>Index mix-ups:</b> <i>n</i> c\'s (one per point) but <i>n</i> − 1 b\'s and d\'s (one per piece).</li><li><b>(<i>x</i> − ' + M.v('x', 'i+1') + ')</b> in ' + M.v('S', 'i') + ' — each piece uses its <b>left</b> point.</li><li><b>Forgetting the 3</b> in the c-equation and in ' + M.v('d', 'i') + '.</li><li><b>Unsorted x\'s.</b> Sort them first.</li></ul>'));
      } },
    ],

    examples: [
      ex('Three points', 'Book Example 3.14', [0, 1, 2], [3, -2, 1], { t: 0.5 }),
      ex('Four points, uneven spacing', 'Book Example 3.13 / eq. 3.16', [1, 2, 4, 5], [2, 1, 4, 3], { note: 'Uneven widths: δ₁ = 1, δ₂ = 2, δ₃ = 1. Your answer should match the book\'s equation (3.16).' }),
      ex('Points on a line', 'a quick check', [0, 1, 2], [0, 1, 2], { note: 'What should a spline through collinear points be?' }),
      ex('Four evenly spaced points', 'practice-style', [0, 1, 2, 3], [3, -2, 1, 0], { t: 1.5 }),
    ],

    solve(el) {
      const xin = UI.textInput({ label: 'x-values (increasing)', value: '0, 1, 2, 3', wide: true });
      const yin = UI.textInput({ label: 'y-values', value: '3, -2, 1, 0', wide: true });
      const tin = UI.textInput({ label: 'Evaluate S(x) at x = <span class="muted small">(optional)</span>', value: '1.5' });
      const out = h('div');
      el.appendChild(h('div', { class: 'card' }, h('div', { class: 'form-grid' }, xin.el, yin.el, tin.el),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Show the solution'))));
      el.appendChild(out);
      function run() {
        out.innerHTML = '';
        const pl = tin.get().trim() ? E.parseLists(xin.get(), yin.get(), tin.get()) : E.parseLists(xin.get(), yin.get());
        if (pl.error) { out.appendChild(UI.error(pl.error)); return; }
        const [xs, ys, tl] = pl.lists;
        if (xs.length < 3 || xs.length > 8) { out.appendChild(UI.error('Use 3 to 8 points.')); return; }
        if (xs.length !== ys.length) { out.appendChild(UI.error('The x and y lists must be the same length.')); return; }
        const sp = E.naturalSpline(xs, ys, pl.F);
        if (sp.error) { out.appendChild(UI.error(sp.error)); return; }
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Solution' }));
        out.appendChild(paper);
        UI.board(paper, splineBoard(xs, ys, pl.F, { t: tl ? tl[0] : undefined }), { reveal: 'all' });
        UI.watch(paper, (b) => splineWalk(b, { xs, ys, F: pl.F }));
      }
      run();
    },
    formulas: '<div class="eq">' + M.v('S', 'i') + '(<i>x</i>) = ' + M.v('y', 'i') + ' + ' + M.v('b', 'i') + '(<i>x</i>−' + M.v('x', 'i') + ') + ' + M.v('c', 'i') + '(<i>x</i>−' + M.v('x', 'i') + ')<sup>2</sup> + ' + M.v('d', 'i') + '(<i>x</i>−' + M.v('x', 'i') + ')<sup>3</sup></div><ul><li>' + M.v('δ', 'i−1') + M.v('c', 'i−1') + ' + 2(' + M.v('δ', 'i−1') + '+' + M.v('δ', 'i') + ')' + M.v('c', 'i') + ' + ' + M.v('δ', 'i') + M.v('c', 'i+1') + ' = 3(' + M.v('Δ', 'i') + '/' + M.v('δ', 'i') + ' − ' + M.v('Δ', 'i−1') + '/' + M.v('δ', 'i−1') + '); natural: ' + M.v('c', 1) + ' = ' + M.v('c', 'n') + ' = 0</li><li>' + M.v('d', 'i') + ' = (' + M.v('c', 'i+1') + '−' + M.v('c', 'i') + ')/(3' + M.v('δ', 'i') + '), ' + M.v('b', 'i') + ' = ' + M.v('Δ', 'i') + '/' + M.v('δ', 'i') + ' − ' + M.v('δ', 'i') + '(2' + M.v('c', 'i') + '+' + M.v('c', 'i+1') + ')/3</li></ul>',
  };

  /* ---------- practice ---------- */
  const g1 = () => {
    const F = E.QF;
    const step = R.pick([1, 1, 2]), x0 = R.int(-1, 1);
    const xs = [x0, x0 + step, x0 + 2 * step].map((v) => E.Q.from(v));
    const ys = [0, 0, 0].map(() => E.Q.from(R.int(-4, 5)));
    const sp = E.naturalSpline(xs, ys, F);
    return {
      type: '3-point natural spline',
      prompt: '<p>Find the natural cubic spline through ' + IP.pointsText(xs, ys) + '. Give ' + M.v('c', 2) + ', then ' + M.v('b', 1) + ', ' + M.v('d', 1) + ', ' + M.v('b', 2) + ', ' + M.v('d', 2) + '.</p>',
      fields: [{ label: M.v('c', 2) + ' =', answer: F.num(sp.c[1]) }, { label: M.v('b', 1) + ' =', answer: F.num(sp.b[0]) }, { label: M.v('d', 1) + ' =', answer: F.num(sp.d[0]) }, { label: M.v('b', 2) + ' =', answer: F.num(sp.b[1]) }, { label: M.v('d', 2) + ' =', answer: F.num(sp.d[1]) }],
      hint: '<p>' + M.v('c', 1) + ' = ' + M.v('c', 3) + ' = 0. One equation: 2(' + M.v('δ', 1) + ' + ' + M.v('δ', 2) + ')' + M.v('c', 2) + ' = 3(' + M.v('Δ', 2) + '/' + M.v('δ', 2) + ' − ' + M.v('Δ', 1) + '/' + M.v('δ', 1) + ').</p>',
      board: () => splineBoard(xs, ys, F),
      solution: (box) => splineWalk(box, { xs, ys, F }),
    };
  };
  g1.label = '3 points';
  const g2 = () => {
    const F = E.QF;
    const xs = [0, 1, 2, 3].map((v) => E.Q.from(v));
    const ys = [0, 1, 2, 3].map(() => E.Q.from(R.int(-3, 4)));
    const sp = E.naturalSpline(xs, ys, F);
    return {
      type: '4-point natural spline',
      prompt: '<p>For the natural cubic spline through ' + IP.pointsText(xs, ys) + ', solve for ' + M.v('c', 2) + ' and ' + M.v('c', 3) + '.</p>',
      fields: [{ label: M.v('c', 2) + ' =', answer: F.num(sp.c[1]) }, { label: M.v('c', 3) + ' =', answer: F.num(sp.c[2]) }],
      hint: '<p>All widths are 1: 4' + M.v('c', 2) + ' + ' + M.v('c', 3) + ' = 3(' + M.v('Δ', 2) + ' − ' + M.v('Δ', 1) + ') and ' + M.v('c', 2) + ' + 4' + M.v('c', 3) + ' = 3(' + M.v('Δ', 3) + ' − ' + M.v('Δ', 2) + ').</p>',
      board: () => splineBoard(xs, ys, F),
      solution: (box) => splineWalk(box, { xs, ys, F }),
    };
  };
  g2.label = '4 points';
  const g3 = () => {
    const kinds = [
      { q: 'A cubic spline through <b>6 points</b> has how many pieces?', opts: ['6', '5', '4', '18'], c: 1, why: 'One piece per gap: 6 − 1 = 5.' },
      { q: 'What makes a cubic spline <b>natural</b>?', opts: ['S″ = 0 at both end points', 'S′ = 0 at both ends', 'All dᵢ = 0', 'It passes through the origin'], c: 0, why: 'Zero curvature at both ends, i.e. ' + M.v('c', 1) + ' = ' + M.v('c', 'n') + ' = 0.' },
      { q: 'With <i>n</i> points, Properties 1–3 give how many equations?', opts: ['3n − 3', '3n − 5', '2n', 'n − 1'], c: 1, why: '(<i>n</i> − 1) + 2(<i>n</i> − 2) = 3<i>n</i> − 5 — two short of the 3<i>n</i> − 3 unknowns.' },
      { q: 'Which end condition fixes the slopes at the two ends?', opts: ['Natural', 'Clamped', 'Not-a-knot', 'Parabolically terminated'], c: 1, why: 'Clamped splines fix ' + M.v('S', 1) + '′(' + M.v('x', 1) + ') and ' + M.v('S', 'n−1') + '′(' + M.v('x', 'n') + ').' },
    ];
    const k = R.pick(kinds);
    return { type: 'Concept check', prompt: '<p>' + k.q + '</p>', choices: { options: k.opts, correct: k.c }, board: () => ({ steps: [{ title: 'Reason', text: k.why }], answer: [k.opts[k.c]] }) };
  };
  g3.label = 'Concepts';
  g3.noExample = true;
  topic.practice = [g1, g2, g3];
  NM.registerTopic(topic);
})(window.NM);
