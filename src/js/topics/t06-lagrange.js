/* Topic 6 — Lagrange interpolation, Sauer §3.1.1 (plus shared interpolation helpers) */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h, M } = UI;
  const R = UI.rand;
  const COLORS = ['c2', 'c3', 'c4', 'c5', 'c6', 'c1'];

  /* ---------- shared helpers (also used by divided differences and splines) ---------- */
  const IP = (NM.interp = {});
  IP.v = (v, dp) => E.vHTML(v, dp === undefined ? UI.dp() : dp, false);
  IP.vd = (v) => E.vHTML(v, UI.dp());
  IP.factor = (xj, F, varHTML) => {
    const x = varHTML || '<i>x</i>';
    if (F.isZero(xj)) return x;
    return F.num(xj) < 0 ? '(' + x + ' + ' + IP.v(F.neg(xj)) + ')' : '(' + x + ' − ' + IP.v(xj) + ')';
  };
  IP.pointsText = (xs, ys) => xs.map((x, k) => '(' + IP.v(x) + ', ' + IP.v(ys[k]) + ')').join(', ');
  IP.pointsTable = (xs, ys) => ({ head: ['<i>k</i>', M.v('x', 'k'), M.v('y', 'k')], rows: xs.map((x, k) => [k + 1, IP.v(x), IP.v(ys[k])]) });
  IP.fitPoints = (plot, xs, ys, fns) => {
    const xn = xs.map(Number), yn = ys.map(Number);
    const lo = Math.min(...xn), hi = Math.max(...xn), L = Math.max(hi - lo, 1);
    plot.fit({ fns: fns || [], x0: lo - 0.25 * L, x1: hi + 0.25 * L, xpad: 0, pts: xn.map((x, k) => [x, yn[k]]), robust: true, pad: 0.18 });
  };
  /* x-list + y-list inputs, with an optional f(x) to make the y-values */
  IP.dataForm = (o) => {
    const xin = UI.textInput({ label: 'x-values', value: o.x, hint: 'Separate with commas. Fractions OK.', wide: true });
    const yin = UI.textInput({ label: 'y-values (same order)', value: o.y, hint: 'Or leave empty and give f(x) below.', wide: true });
    const fin = UI.exprInput({ label: 'or y = f(x) <span class="muted small">(only used when y-values is empty)</span>', value: '', prefix: '<i>f</i>(<i>x</i>) = ', wide: true });
    const tin = UI.textInput({ label: 'Evaluate P(x) at x = <span class="muted small">(optional)</span>', value: o.t || '' });
    return {
      els: [xin.el, yin.el, fin.el, tin.el],
      read() {
        let pl;
        if (!yin.get().trim()) {
          const fc = fin.get();
          if (!fc) return { error: 'Type the y-values, or a function f(x) to compute them from.' };
          const xl = E.parseList(xin.get());
          if (xl.error) return { error: xl.error };
          const xs = xl.vals.map((v) => (v instanceof E.Q ? v.toNumber() : v));
          pl = { F: E.RF, lists: [xs, xs.map((x) => fc.f(x))], fc };
          if (pl.lists[1].some((v) => !isFinite(v))) return { error: 'f(x) is undefined at one of the x-values.' };
        } else {
          pl = E.parseLists(xin.get(), yin.get());
          if (pl.error) return { error: pl.error };
        }
        const [xs, ys] = pl.lists;
        if (xs.length < 2) return { error: 'Give at least 2 points.' };
        if (xs.length > 8) return { error: 'Please use at most 8 points.' };
        if (xs.length !== ys.length) return { error: 'You gave ' + xs.length + ' x-values but ' + ys.length + ' y-values. They must match.' };
        const dup = E.checkDistinct(xs, pl.F);
        if (dup) return { error: dup };
        let t = null;
        if (tin.get().trim()) {
          const tv = E.parseValue(tin.get());
          if (tv.error) return { error: tv.error };
          if (pl.F.exact && tv.F.exact) t = tv.v;
          else {
            if (pl.F.exact) { pl.F = E.RF; pl.lists = pl.lists.map((l) => l.map((v) => v.toNumber())); }
            t = tv.v instanceof E.Q ? tv.v.toNumber() : tv.v;
          }
        }
        return { F: pl.F, xs: pl.lists[0], ys: pl.lists[1], t, fc: pl.fc };
      },
    };
  };
  /* Draggable playground: drag points, watch the interpolant update. */
  IP.playground = (parent, o) => {
    const pts = o.points.map((p) => ({ x: p[0], y: p[1] }));
    const info = h('div', { class: 'small', style: { marginTop: '8px', overflowX: 'auto' } });
    const plot = new NM.Plot(parent, { height: 300, hintText: 'Drag the dots. The curve always passes through all of them.' });
    parent.appendChild(info);
    const snap = (v) => Math.round(v * 2) / 2;
    const redraw = () => {
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const P = E.interpFn(xs, ys);
      plot.scene = (p) => {
        if (o.extra) o.extra(p, xs, ys);
        p.fn(P, { color: 'ink', width: 2.6 });
        pts.forEach((pt, k) => p.point(pt.x, pt.y, {
          color: o.pointColor ? o.pointColor(k) : 'c1', r: 8,
          drag: (x, y) => {
            const nx = snap(x), ny = snap(y);
            if (!pts.some((q, j) => j !== k && q.x === nx)) pt.x = nx;
            pt.y = ny;
            redraw();
          },
        }));
      };
      if (o.info) o.info(info, xs, ys);
    };
    redraw();
    IP.fitPoints(plot, pts.map((p) => p.x), pts.map((p) => p.y));
    plot.legend(o.legend || [{ label: 'interpolating polynomial <i>P</i>(<i>x</i>)', color: 'ink' }, { label: 'data points (drag me)', color: 'c1', dot: true }]);
    return plot;
  };

  const numerHTML = (xs, b, F) => b.others.map((j) => IP.factor(xs[j], F)).join('');
  const denomHTML = (xs, b) => b.others.map((j) => '(' + IP.v(xs[b.k]) + ' − ' + M.paren(IP.v(xs[j])) + ')').join('');

  /* ---------- written solution ----------
     o.t: evaluate at t; o.valueOnly: skip the expansion (shortcut for one value) */
  function lagrangeBoard(xs, ys, F, o) {
    o = o || {};
    const n = xs.length;
    const L = E.lagrange(xs, ys, F);
    const steps = [];
    steps.push({ title: 'Label the points', text: n + ' points, so <i>P</i> has degree at most ' + (n - 1) + ':', table: IP.pointsTable(xs, ys), lines: ['<i>P</i>(<i>x</i>) = ' + xs.map((_, k) => M.v('y', k + 1) + M.v('L', k + 1) + '(<i>x</i>)').join(' + ')] });
    if (o.valueOnly && o.t !== null && o.t !== undefined) {
      const ev = E.lagrangeAt(xs, ys, F, o.t);
      ev.parts.forEach((p) => {
        const b = L.basis[p.k];
        steps.push({
          title: 'Find ' + M.v('L', p.k + 1) + '(' + IP.v(o.t) + ') — plug in right away',
          lines: [M.v('L', p.k + 1) + '(' + IP.v(o.t) + ') = ' + M.fr(b.others.map((j) => '(' + IP.v(o.t) + ' − ' + M.paren(IP.v(xs[j])) + ')').join(''), denomHTML(xs, b)) + ' = ' + M.fr(IP.v(p.nu), IP.v(p.de)) + ' = ' + M.res(IP.v(p.L))],
        });
      });
      steps.push({ title: 'Multiply by the y-values and add', lines: ['<i>P</i>(' + IP.v(o.t) + ') = ' + ev.parts.map((p) => M.paren(IP.v(ys[p.k])) + '(' + IP.v(p.L) + ')').join(' + '), '= ' + ev.parts.map((p) => M.paren(IP.v(p.term))).join(' + ') + ' = ' + M.res(IP.v(ev.value))] });
      return { steps, answer: ['<i>P</i>(' + IP.v(o.t) + ') = ' + IP.vd(ev.value)] };
    }
    L.basis.forEach((b) => {
      steps.push({
        title: 'Build ' + M.v('L', b.k + 1) + '(<i>x</i>) — skip ' + M.v('x', b.k + 1) + ' = ' + IP.v(xs[b.k]),
        lines: [
          M.v('L', b.k + 1) + '(<i>x</i>) = ' + M.fr(numerHTML(xs, b, F), denomHTML(xs, b)) + ' = ' + M.fr(numerHTML(xs, b, F), IP.v(b.den)),
          '= ' + M.res(E.poly.html(b.Lk, F, UI.dp())),
        ],
        note: 'Top: every (<i>x</i> − other x). Bottom: the same with <i>x</i> = ' + IP.v(xs[b.k]) + '.',
      });
    });
    steps.push({
      title: 'Multiply each by its y-value',
      lines: L.basis.map((b) => M.v('y', b.k + 1) + M.v('L', b.k + 1) + '(<i>x</i>) = ' + M.paren(IP.v(ys[b.k])) + ' · [' + E.poly.html(b.Lk, F, UI.dp()) + '] = ' + E.poly.html(b.term, F, UI.dp())),
    });
    steps.push({ title: 'Add and collect like terms', lines: ['<i>P</i>(<i>x</i>) = ' + M.res(E.poly.html(L.poly, F, UI.dp()))], note: L.poly.length - 1 < n - 1 ? 'The degree came out lower than ' + (n - 1) + ' — the points lie on a simpler curve.' : null });
    steps.push({ title: 'Check every point', lines: xs.map((x, k) => '<i>P</i>(' + IP.v(x) + ') = ' + IP.v(E.poly.evalAt(L.poly, x, F)) + ' = ' + M.v('y', k + 1) + (F.isZero(F.sub(E.poly.evalAt(L.poly, x, F), ys[k])) ? ' ✓' : '')) });
    const answer = ['<i>P</i>(<i>x</i>) = ' + E.poly.html(L.poly, F, UI.dp())];
    if (o.t !== null && o.t !== undefined) {
      const v = E.poly.evalAt(L.poly, o.t, F);
      const pc = E.compile(E.poly.text(L.poly, F, 12));
      steps.push({ title: 'Evaluate at <i>x</i> = ' + IP.v(o.t), lines: ['<i>P</i>(' + IP.v(o.t) + ') = ' + E.subHTML(pc.node, E.vText(o.t)) + ' = ' + M.res(IP.v(v))] });
      answer.push('<i>P</i>(' + IP.v(o.t) + ') = ' + IP.vd(v));
    }
    return { steps, answer };
  }

  /* ---------- animation ---------- */
  function lagrangeWalk(parent, o) {
    const { xs, ys, F } = o;
    const n = xs.length;
    const L = E.lagrange(xs, ys, F);
    const N = n + 2;
    const xn = xs.map((v) => F.num(v)), yn = ys.map((v) => F.num(v));
    const Lf = L.basis.map((b) => (t) => E.poly.evalNum(b.Lk, t));
    const Pf = (t) => E.poly.evalNum(L.poly, t);
    return UI.walk(parent, {
      title: o.title, n: N, plot: { height: 300 },
      render(i, w) {
        let html;
        if (i === 0) html = '<h4>Goal</h4><p>One polynomial through ' + IP.pointsText(xs, ys) + '.</p>';
        else if (i <= n) {
          const b = L.basis[i - 1];
          html = '<h4>' + M.v('L', i) + ': the switch for point ' + i + '</h4><div class="calcline">' + M.v('L', i) + '(<i>x</i>) = ' + M.fr(numerHTML(xs, b, F), IP.v(b.den)) + '</div><p>It is 1 at ' + M.v('x', i) + ' and 0 at the other points (dashed curve). Solid curve: ' + M.v('y', i) + M.v('L', i) + '(<i>x</i>).</p>';
        } else html = '<h4>Add them up</h4><div class="calcline"><i>P</i>(<i>x</i>) = ' + E.poly.html(L.poly, F, UI.dp()) + '</div>';
        w.narr.innerHTML = html;
        w.plot.scene = (p) => {
          if (i >= 1 && i <= n) {
            const k = i - 1;
            p.fn(Lf[k], { color: COLORS[k % 6], width: 1.5, dash: [6, 5], alpha: 0.8 });
            p.fn((t) => yn[k] * Lf[k](t), { color: COLORS[k % 6], width: 2.6 });
            xn.forEach((x, j) => p.point(x, j === k ? 1 : 0, { color: COLORS[k % 6], r: 4, hollow: true, label: j === k ? '1' : '0' }));
          }
          if (i === n + 1) { L.basis.forEach((b, k) => p.fn((t) => yn[k] * Lf[k](t), { color: COLORS[k % 6], width: 1.4, alpha: 0.5 })); p.fn(Pf, { color: 'ink', width: 2.8 }); }
          xn.forEach((x, k) => p.point(x, yn[k], { color: 'c1', r: 6 }));
        };
        w.plot.legend(i >= 1 && i <= n ? [{ label: M.v('L', i) + ' dashed, ' + M.v('y', i) + M.v('L', i) + ' solid', color: COLORS[(i - 1) % 6] }] : [{ label: '<i>P</i>(<i>x</i>)', color: 'ink' }, { label: 'data', color: 'c1', dot: true }]);
        if (!w._fitted) { w._fitted = true; IP.fitPoints(w.plot, xn, yn.concat([0, 1]), [Pf]); } else w.plot.render();
      },
    });
  }

  const q = E.Q.parse;
  const QL = (a) => a.map((s) => q(String(s)));
  const ex = (title, src, xsA, ysA, opt) => {
    const xs = QL(xsA), ys = QL(ysA);
    const t = opt && opt.t !== undefined ? q(String(opt.t)) : null;
    return {
      title, src,
      problem: (opt && opt.story ? '<p>' + opt.story + '</p>' : '') + '<p>Use Lagrange interpolation through the points</p><div class="eq">' + IP.pointsText(xs, ys) + '</div><p>' + (opt && opt.valueOnly ? 'Find <i>P</i>(' + IP.v(t) + ') (no need to expand).' : 'Find <i>P</i>(<i>x</i>)' + (t ? ' and <i>P</i>(' + IP.v(t) + ')' : '') + '.') + '</p>',
      solve: () => lagrangeBoard(xs, ys, E.QF, { t, valueOnly: opt && opt.valueOnly }),
      watch: (el) => lagrangeWalk(el, { xs, ys, F: E.QF }),
    };
  };

  const topic = {
    id: 'lagrange', num: 6, unit: 'midterm',
    title: 'Lagrange Interpolation', short: 'Lagrange',
    book: 'Sauer §3.1.1', tagline: 'One polynomial through all the points, built from "switch" polynomials.',

    lessons: [
      { title: 'The idea', build(el) {
        el.appendChild(h('p', { class: 'big', html: 'You have some points. You want <b>one polynomial through all of them</b>. With <i>n</i> points there is exactly one of degree ≤ <i>n</i> − 1.' }));
        el.appendChild(h('p', { html: 'Lagrange\'s trick: for each point build a "switch" ' + M.v('L', 'k') + '(<i>x</i>) that is <b>1 at its own point</b> and <b>0 at every other point</b>. Then' }));
        el.appendChild(h('div', { class: 'eq', html: '<i>P</i>(<i>x</i>) = ' + M.v('y', 1) + M.v('L', 1) + '(<i>x</i>) + ' + M.v('y', 2) + M.v('L', 2) + '(<i>x</i>) + ⋯ + ' + M.v('y', 'n') + M.v('L', 'n') + '(<i>x</i>)' }));
        el.appendChild(h('p', { html: 'At ' + M.v('x', 1) + ', only ' + M.v('L', 1) + ' is on, so <i>P</i>(' + M.v('x', 1) + ') = ' + M.v('y', 1) + '. Same for every point.' }));
      } },
      { title: 'The formula', build(el) {
        el.appendChild(h('div', { class: 'eq', html: M.v('L', 'k') + '(<i>x</i>) = ' + M.fr('(<i>x</i> − ' + M.v('x', 1) + ')⋯(<i>x</i> − ' + M.v('x', 'n') + ')  <span class="muted">without (<i>x</i> − ' + M.v('x', 'k') + ')</span>', '(' + M.v('x', 'k') + ' − ' + M.v('x', 1) + ')⋯(' + M.v('x', 'k') + ' − ' + M.v('x', 'n') + ')  <span class="muted">without (' + M.v('x', 'k') + ' − ' + M.v('x', 'k') + ')</span>') }));
        el.appendChild(h('p', { html: 'For 3 points:' }));
        el.appendChild(h('div', { class: 'eq', html: M.v('L', 1) + ' = ' + M.fr('(<i>x</i> − ' + M.v('x', 2) + ')(<i>x</i> − ' + M.v('x', 3) + ')', '(' + M.v('x', 1) + ' − ' + M.v('x', 2) + ')(' + M.v('x', 1) + ' − ' + M.v('x', 3) + ')') + ', &nbsp; ' + M.v('L', 2) + ' = ' + M.fr('(<i>x</i> − ' + M.v('x', 1) + ')(<i>x</i> − ' + M.v('x', 3) + ')', '(' + M.v('x', 2) + ' − ' + M.v('x', 1) + ')(' + M.v('x', 2) + ' − ' + M.v('x', 3) + ')') + ', &nbsp; ' + M.v('L', 3) + ' = ' + M.fr('(<i>x</i> − ' + M.v('x', 1) + ')(<i>x</i> − ' + M.v('x', 2) + ')', '(' + M.v('x', 3) + ' − ' + M.v('x', 1) + ')(' + M.v('x', 3) + ' − ' + M.v('x', 2) + ')') }));
        el.appendChild(UI.callout('idea', 'Memory aid', '<p>Top: every (<i>x</i> − ' + M.v('x', 'j') + ') <b>except your own</b>. Bottom: the top with <i>x</i> replaced by your own ' + M.v('x', 'k') + '.</p>'));
      } },
      { title: 'The steps', build(el) {
        el.appendChild(UI.recipe([
          '<b>Label</b> the points (' + M.v('x', 1) + ', ' + M.v('y', 1) + '), …, (' + M.v('x', 'n') + ', ' + M.v('y', 'n') + ').',
          '<b>Write each ' + M.v('L', 'k') + '</b>: top and bottom as above. Work out the bottom as a number.',
          '<b>Only need one value <i>P</i>(<i>a</i>)?</b> Plug <i>a</i> into every ' + M.v('L', 'k') + ' now, then <i>P</i>(<i>a</i>) = Σ ' + M.v('y', 'k') + M.v('L', 'k') + '(<i>a</i>). No expanding!',
          '<b>Need the polynomial?</b> Expand each ' + M.v('y', 'k') + M.v('L', 'k') + '(<i>x</i>) and collect <i>x</i><sup>2</sup>, <i>x</i>, constant.',
          '<b>Check</b> <i>P</i>(' + M.v('x', 'k') + ') = ' + M.v('y', 'k') + ' for every point.',
        ]));
      } },
      { title: 'Watch it', build(el) {
        el.appendChild(h('p', { class: 'muted', html: 'Each step shows one switch ' + M.v('L', 'k') + ': 1 at its own point, 0 at the others.' }));
        lagrangeWalk(el, { title: 'Book Example 3.1: (0, 1), (2, 2), (3, 4)', xs: QL([0, 2, 3]), ys: QL([1, 2, 4]), F: E.QF });
        el.appendChild(h('h3', { text: 'Try it: drag the points', style: { marginTop: '18px' } }));
        const pg = h('div');
        el.appendChild(pg);
        IP.playground(pg, {
          points: [[0, 1], [2, 2], [3, 4]],
          pointColor: (k) => COLORS[k % 6],
          extra: (p, xs, ys) => { const L = E.lagrange(xs, ys, E.RF); L.basis.forEach((b, k) => p.fn((t) => E.poly.evalNum(b.term, t), { color: COLORS[k % 6], width: 1.5, alpha: 0.7 })); },
          info: (box, xs, ys) => { const F = E.QF; box.innerHTML = '<span class="math"><i>P</i>(<i>x</i>) = ' + E.poly.html(E.lagrange(xs.map((v) => E.Q.from(v)), ys.map((v) => E.Q.from(v)), F).poly, F, 4) + '</span>'; },
          legend: [{ label: '<i>P</i>(<i>x</i>)', color: 'ink' }, { label: 'pieces ' + M.v('y', 'k') + M.v('L', 'k') + ' in each dot\'s color', color: 'c2' }],
        });
      } },
      { title: 'Watch out', build(el) {
        el.appendChild(UI.callout('warn', 'Common mistakes', '<ul><li><b>Including your own factor</b> (<i>x</i> − ' + M.v('x', 'k') + ') in ' + M.v('L', 'k') + '.</li><li><b>Sign errors in the bottom:</b> (0 − 2)(0 − 3) = (−2)(−3) = +6.</li><li><b>Forgetting to multiply by ' + M.v('y', 'k') + '.</b></li><li><b>Expanding when you only need one value.</b></li><li><b>New point?</b> Lagrange starts over; divided differences don\'t.</li></ul>'));
        el.appendChild(UI.callout('calc', 'Calculator tricks', '<ul><li>Fractions stay exact; <span class="kbd">S⇔D</span> switches to decimal.</li><li>Check your <i>P</i>(<i>x</i>) with <span class="kbd">CALC</span> at each data x.</li></ul>'));
      } },
    ],

    examples: [
      ex('Three points', 'Book Example 3.1', [0, 2, 3], [1, 2, 4], { t: 1 }),
      ex('Four points on a line', 'Book Example 3.2', [0, 1, 2, 3], [2, 1, 0, -1], {}),
      ex('Three points', 'Exercise 3.1-1(a)', [0, 2, 3], [1, 3, 0], {}),
      ex('One value only — the shortcut', 'Exercise 3.1-1(b) points', [-1, 2, 3, 5], [0, 1, 1, 2], { t: 1, valueOnly: true }),
      ex('Fan lifetime at 70°C', 'Exercise 3.1-18(a)', [40, 50, 60], [75, 63, 54], { t: 70, valueOnly: true, story: 'An industrial fan lasts 75, 63 and 54 (×1000 hours) at 40, 50 and 60 °C. Estimate its lifetime at 70 °C with the parabola through these three points.' }),
    ],

    solve(el) {
      const form = IP.dataForm({ x: '0, 2, 3', y: '1, 2, 4', t: '1' });
      const out = h('div');
      const only = h('input', { type: 'checkbox', id: 'lag-value-only' });
      el.appendChild(h('div', { class: 'card' },
        h('div', { class: 'form-grid' }, ...form.els),
        h('label', { class: 'row small', style: { marginTop: '10px', gap: '8px', cursor: 'pointer' } }, only, 'I only need P at that x (use the shortcut, no expanding)'),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Show the solution'))));
      el.appendChild(out);
      function run() {
        out.innerHTML = '';
        const d = form.read();
        if (d.error) { out.appendChild(UI.error(d.error)); return; }
        if (only.checked && d.t === null) { out.appendChild(UI.error('Type the x-value to evaluate at, or untick the shortcut box.')); return; }
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Solution' }));
        out.appendChild(paper);
        UI.board(paper, lagrangeBoard(d.xs, d.ys, d.F, { t: d.t, valueOnly: only.checked }), { reveal: 'all' });
        UI.watch(paper, (b) => lagrangeWalk(b, { xs: d.xs, ys: d.ys, F: d.F }));
      }
      run();
    },
    formulas: '<div class="eq"><i>P</i>(<i>x</i>) = Σ ' + M.v('y', 'k') + M.v('L', 'k') + '(<i>x</i>), &nbsp; ' + M.v('L', 'k') + '(<i>x</i>) = ' + M.fr('∏<sub><i>j</i>≠<i>k</i></sub> (<i>x</i> − ' + M.v('x', 'j') + ')', '∏<sub><i>j</i>≠<i>k</i></sub> (' + M.v('x', 'k') + ' − ' + M.v('x', 'j') + ')') + '</div><ul><li>' + M.v('L', 'k') + '(' + M.v('x', 'k') + ') = 1, ' + M.v('L', 'k') + '(' + M.v('x', 'j') + ') = 0</li><li><i>n</i> points → exactly one <i>P</i> of degree ≤ <i>n</i> − 1</li><li>For one value: plug in before expanding</li></ul>',
  };

  /* ---------- practice ---------- */
  function randData(n) {
    const xs = R.distinct(n, -2, 4).sort((a, b) => a - b);
    return { xs: xs.map((v) => E.Q.from(v)), ys: xs.map(() => E.Q.from(R.int(-4, 6))) };
  }
  const g1 = () => {
    const F = E.QF;
    const { xs, ys } = randData(3);
    let t;
    do { t = E.Q.from(R.int(-2, 5)); } while (xs.some((x) => x.eq(t)));
    const v = E.lagrangeAt(xs, ys, F, t).value;
    return {
      type: 'Evaluate P at a point',
      prompt: '<p>Let <i>P</i> be the interpolating polynomial through ' + IP.pointsText(xs, ys) + '. Find <i>P</i>(' + IP.v(t) + ').</p>',
      fields: [{ label: '<i>P</i>(' + IP.v(t) + ') =', answer: F.num(v) }],
      hint: '<p>Don\'t expand. Compute each ' + M.v('L', 'k') + '(' + IP.v(t) + ') as a number, then add ' + M.v('y', 'k') + '·' + M.v('L', 'k') + '(' + IP.v(t) + ').</p>',
      board: () => lagrangeBoard(xs, ys, F, { t, valueOnly: true }),
      solution: (box) => lagrangeWalk(box, { xs, ys, F }),
    };
  };
  g1.label = 'P at a point';
  const g2 = () => {
    const F = E.QF;
    const { xs, ys } = randData(3);
    const L = E.lagrange(xs, ys, F);
    const c = [0, 1, 2].map((k) => (k < L.poly.length ? F.num(L.poly[k]) : 0));
    return {
      type: 'Find the polynomial',
      prompt: '<p>Use Lagrange interpolation to find <i>P</i>(<i>x</i>) = <i>ax</i><sup>2</sup> + <i>bx</i> + <i>c</i> through ' + IP.pointsText(xs, ys) + '.</p>',
      fields: [{ label: '<i>a</i> =', answer: c[2] }, { label: '<i>b</i> =', answer: c[1] }, { label: '<i>c</i> =', answer: c[0] }],
      hint: '<p>Write ' + M.v('L', 1) + ', ' + M.v('L', 2) + ', ' + M.v('L', 3) + ', expand each, multiply by ' + M.v('y', 'k') + ', then collect terms.</p>',
      board: () => lagrangeBoard(xs, ys, F, {}),
      solution: (box) => lagrangeWalk(box, { xs, ys, F }),
    };
  };
  g2.label = 'Find P(x)';
  const g3 = () => {
    const F = E.QF;
    const n = R.pick([3, 3, 4]);
    const { xs, ys } = randData(n);
    const k = R.int(0, n - 1);
    let t;
    do { t = E.Q.from(R.int(-3, 6)); } while (xs.some((x) => x.eq(t)));
    const part = E.lagrangeAt(xs, ys, F, t).parts[k];
    const others = xs.map((_, j) => j).filter((j) => j !== k);
    return {
      type: 'One basis polynomial',
      prompt: '<p>The x-values are ' + xs.map((x) => IP.v(x)).join(', ') + '. Find the denominator of ' + M.v('L', k + 1) + ' and the value ' + M.v('L', k + 1) + '(' + IP.v(t) + ').</p>',
      fields: [{ label: 'denominator =', answer: F.num(part.de) }, { label: M.v('L', k + 1) + '(' + IP.v(t) + ') =', answer: F.num(part.L) }],
      hint: '<p>Denominator: (' + M.v('x', k + 1) + ' − each other x) multiplied. Numerator: (' + IP.v(t) + ' − each other x).</p>',
      board: () => ({
        steps: [
          { title: 'Denominator: skip ' + M.v('x', k + 1) + ' = ' + IP.v(xs[k]), lines: [others.map((j) => '(' + IP.v(xs[k]) + ' − ' + M.paren(IP.v(xs[j])) + ')').join('') + ' = ' + M.res(IP.v(part.de))] },
          { title: 'Numerator at x = ' + IP.v(t), lines: [others.map((j) => '(' + IP.v(t) + ' − ' + M.paren(IP.v(xs[j])) + ')').join('') + ' = ' + IP.v(part.nu)] },
          { title: 'Divide', lines: [M.v('L', k + 1) + '(' + IP.v(t) + ') = ' + M.fr(IP.v(part.nu), IP.v(part.de)) + ' = ' + M.res(IP.v(part.L))] },
        ],
        answer: ['denominator ' + IP.v(part.de) + ', &nbsp; ' + M.v('L', k + 1) + '(' + IP.v(t) + ') = ' + IP.vd(part.L)],
      }),
    };
  };
  g3.label = 'One Lₖ';
  const g4 = () => {
    const kinds = [
      { q: 'Through <b>5 points</b> with different x-values, how many polynomials of degree <b>at most 4</b> pass?', opts: ['None', 'Exactly one', 'Exactly two', 'Infinitely many'], c: 1, why: '<i>n</i> points → exactly one polynomial of degree ≤ <i>n</i> − 1 (Main Theorem).' },
      { q: 'Through <b>3 points</b>, how many polynomials of degree <b>exactly 3</b> pass?', opts: ['None', 'Exactly one', 'Exactly three', 'Infinitely many'], c: 3, why: 'Add any multiple of (<i>x</i> − ' + M.v('x', 1) + ')(<i>x</i> − ' + M.v('x', 2) + ')(<i>x</i> − ' + M.v('x', 3) + ').' },
      { q: 'You add one more data point. What must you do with Lagrange?', opts: ['Add one new term only', 'Recompute every Lₖ from scratch', 'Nothing changes', 'Just change y₁'], c: 1, why: 'Every ' + M.v('L', 'k') + ' gets a new factor.' },
      { q: 'Why is ' + M.v('L', 2) + '(' + M.v('x', 3) + ') = 0?', opts: ['Because y₃ = 0', 'Because the top of L₂ contains (x − x₃)', 'Because the bottom is zero', 'It isn\'t; it equals 1'], c: 1, why: '(<i>x</i> − ' + M.v('x', 3) + ') is 0 at <i>x</i> = ' + M.v('x', 3) + '.' },
    ];
    const k = R.pick(kinds);
    return { type: 'Concept check', prompt: '<p>' + k.q + '</p>', choices: { options: k.opts, correct: k.c }, board: () => ({ steps: [{ title: 'Reason', text: k.why }], answer: [k.opts[k.c]] }) };
  };
  g4.label = 'Concepts';
  g4.noExample = true;
  topic.practice = [g1, g2, g3, g4];
  topic.walkFor = lagrangeWalk;
  NM.registerTopic(topic);
})(window.NM);
