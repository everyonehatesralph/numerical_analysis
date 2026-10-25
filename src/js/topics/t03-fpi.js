/* Topic 3 — Fixed-Point Iteration, Sauer §1.2 */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h, M } = UI;
  const R = UI.rand, RT = NM.roots;
  const n = (x) => M.n(x);
  const nf = (x) => M.nf(x);

  /* A fixed point of g near the iterates (solves g(x) − x = 0), for judging S when FPI itself fails. */
  function findFixed(g, rows) {
    const xs = rows.flatMap((r) => [r.x, r.gx]).filter((v) => isFinite(v) && Math.abs(v) < 1e6);
    const lo = Math.min(...xs) - 1, hi = Math.max(...xs) + 1, N = 600;
    const d = (x) => g(x) - x;
    let best = null, px = lo, pv = d(lo);
    for (let i = 1; i <= N; i++) {
      const x = lo + ((hi - lo) * i) / N, v = d(x);
      if (isFinite(v) && isFinite(pv) && Math.sign(v) !== Math.sign(pv)) {
        let a = px, b = x, fa = pv;
        for (let k = 0; k < 80; k++) { const m = (a + b) / 2, fm = d(m); if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m; }
        const r = (a + b) / 2;
        if (best === null || Math.abs(r - rows[0].x) < Math.abs(best - rows[0].x)) best = r;
      }
      px = x; pv = v;
    }
    return best;
  }
  function analyse(gc, res) {
    let dg = null, S = null;
    try { dg = E.derivative(gc.node); } catch (e) { dg = null; }
    const rows = res.rows;
    const conv = res.stop !== 'blowup' && rows.length > 1 && rows[rows.length - 1].diff < 1e-3;
    const r = conv ? res.last : findFixed(gc.f, rows);
    if (dg && r !== null && isFinite(r)) S = Math.abs(dg.f(r));
    return { dg, S, conv, r };
  }

  /* ---------- written solution ---------- */
  function fpiBoard(gc, res, o) {
    o = o || {};
    const rows = res.rows;
    const an = analyse(gc, res);
    const detail = Math.min(rows.length, o.detail === undefined ? 5 : o.detail);
    const steps = [];
    steps.push({
      title: 'Write the iteration',
      lines: [(o.from ? o.from + ' &nbsp;⟹&nbsp; ' : '') + '<i>x</i> = <i>g</i>(<i>x</i>) = ' + gc.html, M.v('x', 'i+1') + ' = <i>g</i>(' + M.v('x', 'i') + '), &nbsp; ' + M.v('x', 0) + ' = ' + n(rows[0].x)],
      note: o.trig ? 'Calculator in <b>radians</b>.' : null,
    });
    for (let k = 0; k < detail; k++) {
      const r = rows[k];
      steps.push({
        title: 'Iteration ' + (k + 1),
        lines: [M.v('x', k + 1) + ' = <i>g</i>(' + M.v('x', k) + ') = ' + E.subHTML(gc.node, n(r.x)) + ' = ' + M.res(nf(r.gx))],
        note: 'Change from the last value: |' + M.v('x', k + 1) + ' − ' + M.v('x', k) + '| = ' + E.fmtE(r.diff, 3),
      });
    }
    if (rows.length > detail) {
      steps.push({
        title: 'Keep going the same way',
        table: { head: ['<i>i</i>', M.v('x', 'i'), M.v('x', 'i+1') + ' = <i>g</i>(' + M.v('x', 'i') + ')', '|' + M.v('x', 'i+1') + ' − ' + M.v('x', 'i') + '|'], rows: rows.map((r) => [r.i, nf(r.x), nf(r.gx), E.fmtE(r.diff, 3)]) },
      });
    }
    if (an.dg && an.S !== null && isFinite(an.S)) {
      steps.push({
        title: 'Check: will it converge?',
        lines: ['<i>g</i>′(<i>x</i>) = ' + an.dg.html, '<i>S</i> = |<i>g</i>′(<i>r</i>)| ' + (an.conv ? '≈' : '=') + ' |<i>g</i>′(' + n(an.r) + ')| = ' + M.res(E.fmtShort(an.S, 4))],
        note: (an.conv ? '' : 'Here <i>r</i> ≈ ' + n(an.r) + ' is the true fixed point (where <i>g</i>(<i>x</i>) = <i>x</i>). ') +
          (an.S < 1 ? '<i>S</i> &lt; 1, so FPI converges near <i>r</i>: each error is about ' + E.fmtShort(an.S, 3) + ' times the one before.' : an.S > 1 ? '<i>S</i> &gt; 1: this fixed point repels nearby iterates. Choose a different rearrangement.' : '<i>S</i> = 1: this derivative test is inconclusive. More analysis is needed.'),
      });
    }
    const last = rows[rows.length - 1];
    const fails = res.stop === 'blowup' || (an.S !== null && an.S > 1 && !an.conv);
    return {
      steps,
      answer: fails
        ? ['The iteration does <b>not</b> converge with this <i>g</i>' + (an.S !== null ? ' (<i>S</i> ≈ ' + E.fmtShort(an.S, 3) + ' &gt; 1)' : '') + '.']
        : [M.v('x', rows.length) + ' = <b>' + nf(res.last) + '</b>' + (an.conv ? ' ≈ the fixed point' : ' (not settled yet — do more iterations)'), '<span class="small">last change |' + M.v('x', rows.length) + ' − ' + M.v('x', rows.length - 1) + '| = ' + E.fmtE(last.diff, 3) + '</span>'],
    };
  }

  /* ---------- animation (cobweb) ---------- */
  function fpiWalk(parent, o) {
    const { gc, res } = o;
    const g = gc.f;
    const rows = res.rows;
    const an = analyse(gc, res);
    const N = rows.length + 2;
    let follow = false;
    const table = UI.table(['<i>i</i>', M.v('x', 'i'), '<i>g</i>(' + M.v('x', 'i') + ')', '|change|'], rows.map((r) => [r.i, nf(r.x), nf(r.gx), E.fmtE(r.diff, 3)]));
    const w = UI.walk(parent, {
      title: o.title, n: N, plot: { height: 320, equal: true }, onEnd: o.onEnd,
      render(i, w) {
        const k = i - 1, r = rows[k];
        let html;
        if (i === 0) html = '<h4>The picture</h4><p>The fixed point is where <span style="color:var(--c1)"><b><i>y</i> = <i>g</i>(<i>x</i>)</b></span> meets <span style="color:var(--c3)"><b><i>y</i> = <i>x</i></b></span>. Start at ' + M.v('x', 0) + ' = ' + n(rows[0].x) + '.</p>';
        else if (i === N - 1) html = '<h4>' + (res.stop === 'blowup' ? 'It blew up — diverges' : an.conv ? 'It settles down — converges' : 'After ' + rows.length + ' steps') + '</h4>' + (an.S !== null && isFinite(an.S) ? '<div class="calcline"><i>S</i> = |<i>g</i>′(<i>r</i>)| ≈ ' + E.fmtShort(an.S, 4) + '</div>' : '');
        else html = '<h4>Step ' + i + '</h4><div class="calcline">' + M.v('x', r.i + 1) + ' = <i>g</i>(' + n(r.x) + ') = <b>' + nf(r.gx) + '</b></div><p>Up (or down) to the curve, then across to the line <i>y</i> = <i>x</i>.</p>';
        w.narr.innerHTML = html;
        table.focus(k, true);
        const shown = i === 0 ? 0 : i === N - 1 ? rows.length : i;
        w.plot.scene = (p) => {
          p.fn((x) => x, { color: 'c3', width: 1.8 });
          p.fn(g, { color: 'c1', width: 2.5 });
          for (let j = 0; j < shown; j++) {
            const rr = rows[j];
            if (!isFinite(rr.gx)) break;
            const cur = j === shown - 1 && i !== N - 1;
            const st = { color: 'c2', width: cur ? 2.4 : 1.4, alpha: cur ? 1 : 0.6 };
            p.arrow(rr.x, j === 0 ? 0 : rr.x, rr.x, rr.gx, st);
            p.arrow(rr.x, rr.gx, rr.gx, rr.gx, st);
          }
          p.point(rows[0].x, 0, { color: 'c2', r: 5 });
          p.xmark(rows[0].x, 'x' + E.subDigits(0), { color: 'c2' });
          if (shown > 0 && i !== N - 1) { const rr = rows[shown - 1]; p.point(rr.gx, rr.gx, { color: 'c2', r: 5 }); p.xmark(rr.gx, 'x' + E.subDigits(rr.i + 1), { color: 'c2' }); }
          if (i === N - 1 && an.conv) p.point(res.last, res.last, { color: 'c3', r: 6, label: 'r ≈ ' + E.fmtShort(res.last, 4) });
        };
        w.plot.legend([{ label: '<i>y</i> = <i>g</i>(<i>x</i>)', color: 'c1' }, { label: '<i>y</i> = <i>x</i>', color: 'c3' }, { label: 'cobweb path', color: 'c2' }]);
        if (follow && shown > 1) {
          const recent = rows.slice(Math.max(0, shown - 2), shown).flatMap((rr) => [rr.x, rr.gx]);
          const lo = Math.min(...recent), hi = Math.max(...recent), c = (lo + hi) / 2, L = Math.max(hi - lo, 1e-9) * 1.6;
          w.plot.setView({ x0: c - L, x1: c + L, y0: c - L, y1: c + L });
          w._zoomed = true;
        } else if (!w._fitted || w._zoomed) {
          w._fitted = true; w._zoomed = false;
          const all = rows.flatMap((rr) => [rr.x, rr.gx]).filter((v) => isFinite(v) && Math.abs(v) < 50);
          const lo = Math.min(...all, rows[0].x), hi = Math.max(...all, rows[0].x);
          const L = Math.max(hi - lo, 0.5), c = (lo + hi) / 2;
          w.plot.setView({ x0: c - L * 0.85, x1: c + L * 0.85, y0: c - L * 0.85, y1: c + L * 0.85 });
        } else w.plot.render();
      },
    });
    RT.followToggle(w, false, (v) => { follow = v; w.go(w.i); });
    w.extra.appendChild(table.el);
    return w;
  }

  const THREE = [
    { g: '1 - x^3', label: '1 − x³' },
    { g: '(1 - x)^(1/3)', label: '∛(1 − x)' },
    { g: '(1 + 2x^3)/(1 + 3x^2)', label: '(1 + 2x³)/(1 + 3x²)' },
  ];
  const ex = (title, src, gs, x0, opt) => {
    const gc = E.compile(gs);
    const res = E.fpi(gc.f, x0, { steps: opt.steps });
    return {
      title, src,
      problem: (opt.from ? '<p>Solve ' + opt.from + ' with Fixed-Point Iteration using</p>' : '<p>Use Fixed-Point Iteration with</p>') + '<div class="eq"><i>g</i>(<i>x</i>) = ' + gc.html + ', &nbsp; ' + M.v('x', 0) + ' = ' + x0 + '</div><p>Do ' + opt.steps + ' iterations. Does it converge?</p>' + (opt.trig ? RT.trigNote : ''),
      solve: () => fpiBoard(gc, res, { detail: opt.detail, trig: opt.trig, from: opt.from }),
      watch: (el) => fpiWalk(el, { gc, res }),
    };
  };

  const topic = {
    id: 'fpi', num: 3, unit: 'prelim',
    title: 'Fixed-Point Iteration', short: 'fixed-point iteration',
    book: 'Sauer §1.2', tagline: 'Rewrite f(x) = 0 as x = g(x), then feed each answer back in.',

    lessons: [
      { title: 'The idea', build(el) {
        el.appendChild(h('p', { class: 'big', html: 'Rewrite the equation so <i>x</i> is alone on one side: <b><i>x</i> = <i>g</i>(<i>x</i>)</b>. Guess ' + M.v('x', 0) + ', then keep plugging the answer back in.' }));
        el.appendChild(h('div', { class: 'eq', html: M.v('x', 1) + ' = <i>g</i>(' + M.v('x', 0) + '), &nbsp; ' + M.v('x', 2) + ' = <i>g</i>(' + M.v('x', 1) + '), &nbsp; ' + M.v('x', 3) + ' = <i>g</i>(' + M.v('x', 2) + '), …' }));
        el.appendChild(h('p', { html: 'If the numbers settle down, they settle on the root. Try it: calculator in radians, type 1, then press <span class="kbd">cos</span> <span class="kbd">=</span> again and again. It settles at <b>0.7390851332</b>, the solution of cos <i>x</i> = <i>x</i>.' }));
      } },
      { title: 'The steps', build(el) {
        el.appendChild(UI.recipe([
          '<b>Rearrange</b> <i>f</i>(<i>x</i>) = 0 into <i>x</i> = <i>g</i>(<i>x</i>).',
          '<b>Start</b> with the given ' + M.v('x', 0) + '.',
          '<b>Iterate:</b> ' + M.v('x', 'i+1') + ' = <i>g</i>(' + M.v('x', 'i') + '). Keep all digits (use Ans).',
          '<b>Stop</b> when |' + M.v('x', 'i+1') + ' − ' + M.v('x', 'i') + '| &lt; TOL, or after the steps asked.',
          '<b>Explain</b> with <i>S</i> = |<i>g</i>′(<i>r</i>)| if asked.',
        ]));
      } },
      { title: 'Will it converge?', build(el) {
        el.appendChild(h('div', { class: 'eq', html: '<i>S</i> = |<i>g</i>′(<i>r</i>)| &lt; 1 ⟹ converges &nbsp;&nbsp; <i>S</i> &gt; 1 ⟹ fails' }));
        el.appendChild(h('p', { html: 'When it works, each error is about <i>S</i> times the previous one (linear convergence). Smaller <i>S</i> = faster. The same equation <i>x</i><sup>3</sup> + <i>x</i> − 1 = 0 rearranged three ways:' }));
        el.appendChild(UI.table(['<i>g</i>(<i>x</i>)', '<i>S</i> = |<i>g</i>′(0.6823)|', 'Result'], [
          ['1 − <i>x</i><sup>3</sup>', '1.40', 'fails ✗'], ['(1 − <i>x</i>)<sup>1/3</sup>', '0.72', 'converges, slowly'], ['(1 + 2<i>x</i><sup>3</sup>)/(1 + 3<i>x</i><sup>2</sup>)', '0', 'converges very fast'],
        ], { align: ['l', 'c', 'l'] }).el);
      } },
      { title: 'Watch it', build(el) {
        el.appendChild(h('p', { class: 'muted', html: 'The cobweb picture: up to the curve, across to the line, repeat. Pick a rearrangement:' }));
        const host = h('div');
        let pick = 1;
        const draw = () => {
          host.innerHTML = '';
          const it = THREE[pick];
          const gc = E.compile(it.g);
          fpiWalk(host, { title: '<i>g</i>(<i>x</i>) = ' + it.label + ', &nbsp;' + M.v('x', 0) + ' = 0.5', gc, res: E.fpi(gc.f, 0.5, { steps: pick === 2 ? 5 : pick === 0 ? 8 : 12 }) });
        };
        el.appendChild(h('div', { style: { marginBottom: '10px' } }, UI.seg(THREE.map((t, k) => [k, t.label]), 1, (v) => { pick = +v; draw(); })));
        el.appendChild(host);
        draw();
      } },
      { title: 'Watch out', build(el) {
        el.appendChild(UI.callout('warn', 'Common mistakes', '<ul><li><b>Degree mode</b> with cos/sin. Use radians.</li><li><b>Plugging into <i>f</i></b> instead of <i>g</i>.</li><li><b>Rounding each step</b> and retyping — use the Ans key.</li><li><b>Counting wrong:</b> ' + M.v('x', 0) + ' is the guess; ' + M.v('x', 1) + ' is the first iteration.</li></ul>'));
        el.appendChild(UI.callout('calc', 'Calculator trick (the best one)', '<p>Type ' + M.v('x', 0) + ', press <span class="kbd">=</span>. Then type <i>g</i> with <b>Ans</b> instead of <i>x</i>, e.g. <span class="kbd">cos(Ans)</span>, and press <span class="kbd">=</span>. <b>Every extra <span class="kbd">=</span> is the next iteration.</b></p>'));
      } },
    ],

    examples: [
      ex('cos x = x', 'Book §1.2 opening', 'cos(x)', 1, { steps: 20, detail: 4, trig: true, from: 'cos <i>x</i> = <i>x</i>' }),
      ex('x³ + x − 1 = 0 with g(x) = ∛(1 − x)', 'Book §1.2', '(1 - x)^(1/3)', 0.5, { steps: 20, detail: 4, from: '<i>x</i><sup>3</sup> + <i>x</i> − 1 = 0' }),
      ex('x³ + x − 1 = 0 with a faster g', 'Book §1.2', '(1 + 2x^3)/(1 + 3x^2)', 0.5, { steps: 4, detail: 4, from: '<i>x</i><sup>3</sup> + <i>x</i> − 1 = 0' }),
      ex('A rearrangement that fails', 'Book §1.2', '1 - x^3', 0.5, { steps: 6, detail: 4, from: '<i>x</i><sup>3</sup> + <i>x</i> − 1 = 0' }),
      ex('cos x = sin x', 'Book Example 1.4', 'x + cos(x) - sin(x)', 0, { steps: 10, detail: 4, trig: true, from: 'cos <i>x</i> = sin <i>x</i>' }),
    ],

    solve(el) {
      const gin = UI.exprInput({ label: '<i>g</i>(<i>x</i>) =', value: '(1 - x)^(1/3)', prefix: '<i>g</i>(<i>x</i>) = ', wide: true });
      const xin = UI.textInput({ label: 'Start <i>x</i><sub>0</sub>', value: '0.5' });
      const stop = UI.stopRule({ mode: 'steps', steps: 6, tol: '0.0001' });
      const out = h('div');
      el.appendChild(h('div', { class: 'card' },
        h('p', { class: 'muted small', html: 'Enter <i>g</i>(<i>x</i>), not <i>f</i>(<i>x</i>). For <i>x</i><sup>3</sup> + <i>x</i> − 1 = 0 you could use <code>(1-x)^(1/3)</code>.' }),
        h('div', { class: 'form-grid' }, gin.el, xin.el, ...stop.els),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Show the solution'))));
      el.appendChild(out);
      function run() {
        out.innerHTML = '';
        const gc = gin.get();
        if (!gc) { out.appendChild(UI.error('I can\'t read g(x) yet.')); return; }
        const x0 = E.evalNumber(xin.get());
        if (!isFinite(x0)) { out.appendChild(UI.error('x₀ must be a number.')); return; }
        const sr = stop.read();
        if (sr.error) { out.appendChild(UI.error(sr.error)); return; }
        const res = E.fpi(gc.f, x0, { steps: sr.steps, tol: sr.tol });
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Solution' }));
        out.appendChild(paper);
        UI.board(paper, fpiBoard(gc, res, { detail: 6, trig: /sin|cos|tan/.test(gc.text) }), { reveal: 'all' });
        UI.watch(paper, (b) => fpiWalk(b, { gc, res }));
      }
      run();
    },
    formulas: '<div class="eq">' + M.v('x', 'i+1') + ' = <i>g</i>(' + M.v('x', 'i') + ')</div><ul><li>Converges near <i>r</i> if <i>S</i> = |<i>g</i>′(<i>r</i>)| &lt; 1; diverges if &gt; 1</li><li>Linear: ' + M.v('e', 'i+1') + ' ≈ <i>S</i>·' + M.v('e', 'i') + '</li><li>Stop when |' + M.v('x', 'i+1') + ' − ' + M.v('x', 'i') + '| &lt; TOL</li></ul>',
  };

  /* ---------- practice ---------- */
  const g1 = () => {
    const it = R.pick(RT.fpiBank);
    const gc = E.compile(it.g);
    const res = E.fpi(gc.f, it.x0, { steps: 3 });
    return {
      type: 'Iterate three times',
      prompt: '<p>Use Fixed-Point Iteration with <span class="math"><i>g</i>(<i>x</i>) = ' + gc.html + '</span> and ' + M.v('x', 0) + ' = ' + it.x0 + '. Find ' + M.v('x', 1) + ', ' + M.v('x', 2) + ', ' + M.v('x', 3) + ' (at least 4 decimals).</p>' + (it.trig ? RT.trigNote : ''),
      fields: [1, 2, 3].map((k) => ({ label: M.v('x', k) + ' =', answer: k < 3 ? res.rows[k].x : res.last })),
      hint: '<p>' + M.v('x', 1) + ' = <i>g</i>(' + it.x0 + '). Then put that answer back into <i>g</i>. Use Ans.</p>',
      board: () => fpiBoard(gc, res, { detail: 3, trig: it.trig }),
      solution: (box) => fpiWalk(box, { gc, res }),
    };
  };
  g1.label = 'Iterate';
  const SETS = [
    { eq: '<i>x</i><sup>3</sup> + <i>x</i> − 1 = 0', gs: ['1 - x^3', '(1 - x)^(1/3)', '(1 + 2x^3)/(1 + 3x^2)'], r: 0.6823278038280193 },
    { eq: '<i>x</i><sup>3</sup> − 2<i>x</i> − 5 = 0', gs: ['(x^3 - 5)/2', '(2x + 5)^(1/3)', '5/(x^2 - 2)'], r: 2.0945514815423265 },
    { eq: '<i>x</i><sup>2</sup> − <i>x</i> − 1 = 0', gs: ['x^2 - 1', '1 + 1/x', 'sqrt(x + 1)'], r: 1.618033988749895 },
    { eq: '<i>x</i><sup>3</sup> + 4<i>x</i><sup>2</sup> − 10 = 0', gs: ['x - x^3 - 4x^2 + 10', 'sqrt(10/x - 4x)', 'sqrt(10/(4 + x))', '0.5 sqrt(10 - x^3)'], r: 1.3652300134140969 },
  ];
  const sBoard = (set, info) => ({
    steps: info.map((x) => ({ title: '<span class="math"><i>g</i>(<i>x</i>) = ' + x.html + '</span>', lines: ['<i>g</i>′(<i>x</i>) = ' + x.dhtml, '<i>S</i> = |<i>g</i>′(' + E.fmtShort(set.r, 4) + ')| = ' + M.res(E.fmtShort(x.S, 3))], note: x.S < 1 ? '&lt; 1 → converges' : '&gt; 1 → diverges' })),
    answer: ['Smallest <i>S</i> converges fastest; <i>S</i> &gt; 1 diverges.'],
  });
  const g2 = () => {
    const set = R.pick(SETS);
    const info = set.gs.map((s) => { const c = E.compile(s); const d = E.derivative(c.node); return { s, html: c.html, dhtml: d.html, S: Math.abs(d.f(set.r)) }; });
    const ask = R.pick(['fastest', 'diverges']);
    const div = info.filter((x) => x.S > 1);
    let correct;
    if (ask === 'diverges' && div.length === 1) correct = div[0];
    else correct = info.filter((x) => x.S < 1).reduce((a, b) => (b.S < a.S ? b : a));
    const question = ask === 'diverges' && div.length === 1 ? 'Which rearrangement will <b>fail</b> (diverge) near the root?' : 'Which rearrangement converges <b>fastest</b> near the root?';
    const order = R.shuffle(info);
    return {
      type: 'Which g(x)?',
      prompt: '<p>' + set.eq + ' has a root <i>r</i> ≈ ' + E.fmtShort(set.r, 4) + '. ' + question + '</p>',
      choices: { options: order.map((x) => '<span class="math"><i>g</i>(<i>x</i>) = ' + x.html + '</span>'), correct: order.indexOf(correct) },
      hint: '<p>Compute <i>S</i> = |<i>g</i>′(<i>r</i>)| for each. Less than 1 converges; smaller is faster.</p>',
      board: () => sBoard(set, info),
    };
  };
  g2.label = 'Which g(x)?';
  const g3 = () => {
    const set = R.pick(SETS);
    const s = R.pick(set.gs);
    const c = E.compile(s), d = E.derivative(c.node);
    const S = Math.abs(d.f(set.r));
    return {
      type: 'Compute S = |g′(r)|',
      prompt: '<p>For <span class="math"><i>g</i>(<i>x</i>) = ' + c.html + '</span> with fixed point <i>r</i> ≈ ' + E.fmtShort(set.r, 6) + ', compute <i>S</i> = |<i>g</i>′(<i>r</i>)|.</p>',
      fields: [{ label: '<i>S</i> =', answer: S, tol: Math.max(2e-3, S * 5e-3) }],
      hint: '<p>Differentiate <i>g</i> (chain rule!), plug in <i>r</i>, take the absolute value.</p>',
      board: () => ({ steps: [{ title: 'Differentiate', lines: ['<i>g</i>′(<i>x</i>) = ' + d.html] }, { title: 'Plug in r', lines: ['<i>g</i>′(' + E.fmtShort(set.r, 6) + ') = ' + E.fmtShort(d.f(set.r), 6), '<i>S</i> = ' + M.res(E.fmtShort(S, 4))], note: S < 1 ? 'Less than 1: FPI converges.' : 'More than 1: FPI diverges.' }], answer: ['<i>S</i> ≈ ' + E.fmtShort(S, 4)] }),
    };
  };
  g3.label = 'Compute S';
  const g4 = () => {
    const S = R.pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8]);
    const e = R.pick([0.01, 0.002, 0.05, 0.004, 0.0003]);
    const k = R.int(1, 3);
    const ans = e * Math.pow(S, k);
    return {
      type: 'Linear convergence',
      prompt: '<p>FPI converges linearly with rate <i>S</i> = ' + S + '. At step 5 the error is ' + M.v('e', 5) + ' = ' + e + '. Estimate ' + M.v('e', 5 + k) + '.</p>',
      fields: [{ label: M.v('e', 5 + k) + ' ≈', answer: ans, tol: ans * 1e-2 }],
      hint: '<p>Each step multiplies the error by <i>S</i>.</p>',
      board: () => ({ steps: [{ title: 'Use e<sub>i+1</sub> ≈ S·e<sub>i</sub>, ' + k + ' time' + (k > 1 ? 's' : ''), lines: [M.v('e', 5 + k) + ' ≈ <i>S</i><sup>' + k + '</sup> · ' + M.v('e', 5) + ' = ' + S + '<sup>' + k + '</sup> × ' + e + ' = ' + M.res(E.fmtShort(ans, 10))] }], answer: [M.v('e', 5 + k) + ' ≈ ' + E.fmtShort(ans, 10)] }),
    };
  };
  g4.label = 'Error rate';
  g4.noExample = true;
  const g5 = () => {
    const a = R.pick([1.5, 2.2, 2.5, 2.8, 3, 3.2]);
    return {
      type: 'Find a fixed point',
      prompt: '<p>Find the <b>nonzero</b> fixed point of <span class="math"><i>g</i>(<i>x</i>) = ' + a + '<i>x</i> − <i>x</i><sup>2</sup></span> (like Example 1.5).</p>',
      fields: [{ label: '<i>r</i> =', answer: a - 1 }],
      hint: '<p>A fixed point solves <i>g</i>(<i>x</i>) = <i>x</i>. Move everything to one side and factor.</p>',
      board: () => ({ steps: [
        { title: 'Set g(x) = x', lines: [a + '<i>x</i> − <i>x</i><sup>2</sup> = <i>x</i>'] },
        { title: 'Move everything to one side and factor', lines: [E.fmtShort(a - 1, 4) + '<i>x</i> − <i>x</i><sup>2</sup> = 0', '<i>x</i>(' + E.fmtShort(a - 1, 4) + ' − <i>x</i>) = 0'] },
        { title: 'Read off the solutions', lines: ['<i>x</i> = 0 &nbsp;or&nbsp; <i>x</i> = ' + M.res(E.fmtShort(a - 1, 4))] },
      ], answer: ['<i>r</i> = ' + E.fmtShort(a - 1, 4)] }),
    };
  };
  g5.label = 'Fixed points';
  topic.practice = [g1, g2, g3, g4, g5];
  NM.registerTopic(topic);
})(window.NM);
