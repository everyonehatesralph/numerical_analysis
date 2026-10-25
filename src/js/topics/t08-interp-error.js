/* Topic 8 — Interpolation error and the Runge phenomenon, Sauer §3.2 */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h, M } = UI;
  const R = UI.rand;
  const s4 = (v) => E.fmtShort(v, 4);

  function bound(fc, xs, x) {
    const n = xs.length;
    const prod = xs.reduce((p, xi) => p * (x - xi), 1);
    const fact = E.factorial(n);
    const d = E.nthDerivative(fc.node, n);
    const lo = Math.min(...xs, x), hi = Math.max(...xs, x);
    const mx = E.maxAbsOn(d.f, lo, hi);
    const P = E.interpFn(xs, xs.map((t) => fc.f(t)));
    return { n, prod, fact, d, lo, hi, max: mx.max, at: mx.at, bound: (Math.abs(prod) / fact) * mx.max, actual: Math.abs(fc.f(x) - P(x)), P };
  }

  /* ---------- written solution ---------- */
  function errorBoard(fc, xs, x, o) {
    o = o || {};
    const b = bound(fc, xs, x);
    if (o.maxValue !== undefined) { b.max = o.maxValue; b.bound = (Math.abs(b.prod) / b.fact) * b.max; }
    const n = b.n;
    const nodes = o.labels || xs.map(s4);
    return {
      steps: [
        { title: 'Count the points', lines: ['<i>n</i> = ' + n + ' nodes: ' + nodes.join(', ') + ' &nbsp;→&nbsp; <i>P</i> has degree ≤ ' + (n - 1)], note: 'Use <i>n</i> (the number of points), not the degree, in the formula.' },
        { title: 'Write the error formula', lines: ['<i>f</i>(<i>x</i>) − <i>P</i>(<i>x</i>) = ' + M.fr(xs.map((_, k) => '(<i>x</i> − ' + M.v('x', k + 1) + ')').join(''), n + '!') + ' <i>f</i><sup>(' + n + ')</sup>(<i>c</i>)'] },
        { title: 'The product at x = ' + s4(x), lines: [xs.map((xi, k) => '(' + s4(x) + ' − ' + M.paren(nodes[k]) + ')').join(''), '= ' + xs.map((xi) => M.paren(s4(x - xi))).join(' · ') + ' = ' + E.fmtE(b.prod, 5), '|product| = ' + M.res(E.fmtE(Math.abs(b.prod), 5))] },
        { title: 'The largest possible derivative', lines: ['<i>f</i><sup>(' + n + ')</sup>(<i>x</i>) = ' + b.d.html, 'max |<i>f</i><sup>(' + n + ')</sup>| on [' + s4(b.lo) + ', ' + s4(b.hi) + '] ≈ ' + M.res(E.fmtShort(b.max, 6))], note: o.maxWhy || 'Because <i>c</i> is unknown, we use the worst case on the interval.' },
        { title: 'Put it together', lines: ['|<i>f</i>(' + s4(x) + ') − <i>P</i>(' + s4(x) + ')| ≤ ' + M.fr(E.fmtE(Math.abs(b.prod), 5), n + '!') + ' × ' + E.fmtShort(b.max, 6) + ' = ' + M.fr(E.fmtE(Math.abs(b.prod), 5), String(b.fact)) + ' × ' + E.fmtShort(b.max, 6) + ' = ' + M.res(E.fmtE(b.bound, 4))] },
        { title: 'Compare with the actual error', lines: ['actual |<i>f</i> − <i>P</i>| = ' + E.fmtE(b.actual, 4) + (b.actual <= b.bound * 1.0000001 ? ' ≤ bound ✓' : '')], note: 'The bound is a guarantee; the real error is usually a bit smaller.' },
      ],
      answer: ['|<i>f</i>(' + s4(x) + ') − <i>P</i>(' + s4(x) + ')| ≤ ' + E.fmtE(b.bound, 4)],
    };
  }

  /* ---------- animation ---------- */
  function errorWalk(parent, o) {
    const { fc, xs, x } = o;
    const b = bound(fc, xs, x);
    return UI.walk(parent, {
      title: o.title, n: 3, plot: { height: 280 },
      render(i, w) {
        w.narr.innerHTML = ['<h4>f and P</h4><p>They agree exactly at the nodes, but not in between.</p>', '<h4>The error curve</h4><p>The red curve is <i>f</i> − <i>P</i> (scaled). It is zero at every node and biggest near the ends.</p>', '<h4>The product</h4><p>The orange curve is (<i>x</i> − ' + M.v('x', 1) + ')⋯(<i>x</i> − ' + M.v('x', 'n') + ') (scaled) — it has the same shape as the error. That is why the formula works.</p>'][i];
        const lo = Math.min(...xs), hi = Math.max(...xs), L = hi - lo;
        w.plot.scene = (p) => {
          if (i === 0) { p.fn(fc.f, { color: 'c1', width: 2.5 }); p.fn(b.P, { color: 'ink', width: 2, dash: [6, 5] }); xs.forEach((xi) => p.point(xi, fc.f(xi), { color: 'c1', r: 5 })); }
          else {
            const pts = Array.from({ length: 200 }, (_, k) => lo + (L * k) / 199);
            const scale = Math.max(...pts.map((t) => Math.abs(fc.f(t) - b.P(t)))) || 1;
            const wmax = Math.max(...pts.map((t) => Math.abs(xs.reduce((q, xi) => q * (t - xi), 1)))) || 1;
            p.fn((t) => (fc.f(t) - b.P(t)) / scale, { color: 'c6', width: 2.4, from: lo - 0.1 * L, to: hi + 0.1 * L });
            if (i === 2) p.fn((t) => xs.reduce((q, xi) => q * (t - xi), 1) / wmax, { color: 'c2', width: 1.8, dash: [5, 4], from: lo - 0.1 * L, to: hi + 0.1 * L });
            xs.forEach((xi) => p.point(xi, 0, { color: 'c1', r: 4 }));
          }
          p.vline(x, { color: 'c3', width: 1.5, dash: [3, 4] });
        };
        w.plot.legend(i === 0 ? [{ label: '<i>f</i>', color: 'c1' }, { label: '<i>P</i>', color: 'ink' }] : [{ label: 'error (scaled)', color: 'c6' }, { label: 'product (scaled)', color: 'c2' }]);
        if (i === 0) w.plot.fit({ fns: [fc.f], x0: lo - 0.15 * L, x1: hi + 0.15 * L, xpad: 0, robust: true });
        else w.plot.setView({ x0: lo - 0.15 * L, x1: hi + 0.15 * L, y0: -1.3, y1: 1.3 });
      },
    });
  }

  function runge(parent) {
    const card = h('div');
    parent.appendChild(card);
    const label = h('b');
    const slider = h('input', { type: 'range', min: '3', max: '15', value: '9', style: { width: '200px' }, 'aria-label': 'number of points' });
    card.appendChild(h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', null, 'Equally spaced points: '), label, slider));
    const plot = new NM.Plot(card, { height: 280, view: { x0: -1.15, x1: 1.15, y0: -0.6, y1: 1.6 } });
    const f = (x) => 1 / (1 + 12 * x * x);
    const draw = () => {
      const n = +slider.value;
      label.textContent = n + ' ';
      const xs = Array.from({ length: n }, (_, k) => -1 + (2 * k) / (n - 1));
      const P = E.interpFn(xs, xs.map(f));
      plot.scene = (p) => { p.fn(f, { color: 'c1', width: 2.5 }); p.fn(P, { color: 'c6', width: 2 }); xs.forEach((x) => p.point(x, f(x), { color: 'c1', r: 4 })); };
      plot.render();
    };
    slider.addEventListener('input', draw);
    plot.legend([{ label: '1/(1 + 12<i>x</i><sup>2</sup>)', color: 'c1' }, { label: 'interpolating polynomial', color: 'c6' }]);
    draw();
  }

  const ex = (title, src, fs, xs, x, opt) => {
    opt = opt || {};
    const fc = E.compile(fs);
    return {
      title, src,
      problem: '<p><i>f</i>(<i>x</i>) = <span class="math">' + fc.html + '</span> is interpolated at the nodes</p><div class="eq">' + (opt.labels || xs.map(s4)).join(', &nbsp;') + '</div><p>Find an upper bound for |<i>f</i>(' + s4(x) + ') − <i>P</i>(' + s4(x) + ')|.</p>',
      solve: () => errorBoard(fc, xs, x, opt),
      watch: (el) => errorWalk(el, { fc, xs, x }),
    };
  };
  const P6 = Math.PI / 6;

  const topic = {
    id: 'interp-error', num: 8, unit: 'finals',
    title: 'Interpolation Error', short: 'interpolation error',
    book: 'Sauer §3.2', tagline: 'How far can P(x) be from the real function between the data points?',

    lessons: [
      { title: 'The idea', build(el) {
        el.appendChild(h('p', { class: 'big', html: 'If the data come from a function <i>f</i>, the polynomial <i>P</i> matches <i>f</i> exactly at the nodes, but not in between. A formula gives a <b>guaranteed upper bound</b> for that gap.' }));
        el.appendChild(h('div', { class: 'eq', html: '<i>f</i>(<i>x</i>) − <i>P</i>(<i>x</i>) = ' + M.fr('(<i>x</i> − ' + M.v('x', 1) + ')(<i>x</i> − ' + M.v('x', 2) + ')⋯(<i>x</i> − ' + M.v('x', 'n') + ')', '<i>n</i>!') + ' <i>f</i><sup>(<i>n</i>)</sup>(<i>c</i>)' }));
        el.appendChild(h('p', { html: '<i>n</i> = number of points. <i>c</i> is some unknown number in the interval, so we use the <b>largest possible</b> |<i>f</i><sup>(<i>n</i>)</sup>|.' }));
      } },
      { title: 'The steps', build(el) {
        el.appendChild(UI.recipe([
          '<b>Count the points:</b> <i>n</i>.',
          '<b>Product:</b> |(<i>x</i> − ' + M.v('x', 1) + ')(<i>x</i> − ' + M.v('x', 2) + ')⋯(<i>x</i> − ' + M.v('x', 'n') + ')| at the given <i>x</i>.',
          '<b>Derivative:</b> find <i>f</i><sup>(<i>n</i>)</sup> and its largest size on the interval (sin, cos → 1; <i>e</i><sup><i>x</i></sup> on [<i>a</i>, <i>b</i>] → <i>e</i><sup><i>b</i></sup>).',
          '<b>Bound</b> = product ÷ <i>n</i>! × max |<i>f</i><sup>(<i>n</i>)</sup>|.',
        ]));
      } },
      { title: 'Watch it', build(el) {
        el.appendChild(h('p', { class: 'muted', html: 'The error and the product have the same shape — small in the middle, big near the ends.' }));
        errorWalk(el, { title: 'Book Example 3.8: <i>e</i><sup><i>x</i></sup> at −1, −0.5, 0, 0.5, 1', fc: E.compile('e^x'), xs: [-1, -0.5, 0, 0.5, 1], x: 0.25 });
      } },
      { title: 'The Runge phenomenon', build(el) {
        el.appendChild(h('p', { html: 'With <b>equally spaced</b> points, more points can make things <b>worse</b>: the polynomial wiggles wildly near the ends. Slide to 13 or 15. (The fix is Chebyshev nodes — next topic.)' }));
        runge(el);
      } },
      { title: 'Watch out', build(el) {
        el.appendChild(UI.callout('warn', 'Common mistakes', '<ul><li><b>Degree instead of number of points.</b> 5 points → <i>n</i> = 5 → fifth derivative, 5! = 120.</li><li><b>Forgetting the absolute value</b> of the product.</li><li><b>Using <i>f</i><sup>(<i>n</i>)</sup> at the given <i>x</i></b> instead of its maximum on the interval.</li></ul>'));
      } },
    ],

    examples: [
      ex('eˣ with five nodes, at x = 0.25', 'Book Example 3.8', 'e^x', [-1, -0.5, 0, 0.5, 1], 0.25, { maxWhy: 'Every derivative of <i>e</i><sup><i>x</i></sup> is <i>e</i><sup><i>x</i></sup>, largest at the right end: <i>e</i><sup>1</sup> = <i>e</i>.' }),
      ex('Same, at x = 0.75 (nearer the end)', 'Book Example 3.8', 'e^x', [-1, -0.5, 0, 0.5, 1], 0.75, { maxWhy: 'max = <i>e</i><sup>1</sup> = <i>e</i>.' }),
      ex('The sin key, at x = 1', 'Book §3.2', 'sin(x)', [0, P6, 2 * P6, 3 * P6], 1, { labels: ['0', 'π/6', 'π/3', 'π/2'], maxWhy: '<i>f</i><sup>(4)</sup> = sin <i>x</i>, and |sin| ≤ 1.' }),
      ex('The sin key, at x = 0.2', 'Book §3.2', 'sin(x)', [0, P6, 2 * P6, 3 * P6], 0.2, { labels: ['0', 'π/6', 'π/3', 'π/2'], maxWhy: '<i>f</i><sup>(4)</sup> = sin <i>x</i>, and |sin| ≤ 1.' }),
    ],

    solve(el) {
      const fin = UI.exprInput({ label: '<i>f</i>(<i>x</i>) =', value: 'sin(x)', prefix: '<i>f</i>(<i>x</i>) = ', wide: true });
      const xin = UI.textInput({ label: 'Nodes', value: '0, pi/6, pi/3, pi/2', hint: 'pi, fractions and decimals all work.', wide: true });
      const tin = UI.textInput({ label: 'Bound the error at x =', value: '1' });
      const out = h('div');
      el.appendChild(h('div', { class: 'card' }, h('div', { class: 'form-grid' }, fin.el, xin.el, tin.el),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Show the solution'))));
      el.appendChild(out);
      function run() {
        out.innerHTML = '';
        const fc = fin.get();
        if (!fc) { out.appendChild(UI.error('I can\'t read f(x) yet.')); return; }
        const xl = E.parseList(xin.get());
        if (xl.error) { out.appendChild(UI.error(xl.error)); return; }
        const xs = xl.vals.map((v) => (v instanceof E.Q ? v.toNumber() : v));
        if (xs.length < 2 || xs.length > 10) { out.appendChild(UI.error('Use 2 to 10 nodes.')); return; }
        if (E.checkDistinct(xs, E.RF)) { out.appendChild(UI.error('Nodes must be different.')); return; }
        const x = E.evalNumber(tin.get());
        if (!isFinite(x)) { out.appendChild(UI.error('x must be a number.')); return; }
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Solution' }));
        out.appendChild(paper);
        UI.board(paper, errorBoard(fc, xs, x, { labels: xl.items }), { reveal: 'all' });
        UI.watch(paper, (b) => errorWalk(b, { fc, xs, x }));
      }
      run();
    },
    formulas: '<div class="eq"><i>f</i>(<i>x</i>) − <i>P</i>(<i>x</i>) = ' + M.fr('(<i>x</i>−' + M.v('x', 1) + ')⋯(<i>x</i>−' + M.v('x', 'n') + ')', '<i>n</i>!') + '<i>f</i><sup>(<i>n</i>)</sup>(<i>c</i>)</div><ul><li><i>n</i> = number of points</li><li>Bound: use max |<i>f</i><sup>(<i>n</i>)</sup>| on the interval</li><li>Smaller in the middle, bigger at the ends (Runge)</li></ul>',
  };

  /* ---------- practice ---------- */
  const FUNCS = [
    { f: 'sin(x)', max: () => 1, why: '|sin| and |cos| are never above 1' },
    { f: 'cos(x)', max: () => 1, why: '|sin| and |cos| are never above 1' },
    { f: 'e^x', max: (lo, hi) => Math.exp(hi), why: 'every derivative of <i>e</i><sup><i>x</i></sup> is <i>e</i><sup><i>x</i></sup>, largest at the right end' },
    { f: 'e^(-x)', max: (lo) => Math.exp(-lo), why: 'every derivative is ±<i>e</i><sup>−<i>x</i></sup>, largest at the left end' },
  ];
  const NODESETS = [[0, 0.5, 1], [-1, 0, 1], [0, 1, 2], [0, 0.25, 0.5, 0.75], [-1, -0.5, 0, 0.5, 1], [0, 0.5, 1, 1.5], [1, 2, 3]];
  const g1 = () => {
    const fn = R.pick(FUNCS), xs = R.pick(NODESETS);
    const lo = Math.min(...xs), hi = Math.max(...xs);
    let x;
    do { x = lo + Math.round(Math.random() * (hi - lo) * 20) / 20; } while (xs.includes(x));
    const n = xs.length;
    const prod = Math.abs(xs.reduce((p, xi) => p * (x - xi), 1));
    const mx = fn.max(lo, hi);
    const ans = (prod / E.factorial(n)) * mx;
    const fc = E.compile(fn.f);
    return {
      type: 'Error bound',
      prompt: '<p><span class="math"><i>f</i>(<i>x</i>) = ' + fc.html + '</span> is interpolated at <i>x</i> = ' + xs.join(', ') + '. Find |product| and an upper bound for |<i>f</i>(' + x + ') − <i>P</i>(' + x + ')| (use the textbook worst case for the derivative).</p>',
      fields: [{ label: '|(<i>x</i> − ' + M.v('x', 1) + ')⋯| =', answer: prod, tol: prod * 2e-3 + 1e-12 }, { label: 'bound =', answer: ans, tol: ans * 2e-2 }],
      hint: '<p><i>n</i> = ' + n + ' points → <i>f</i><sup>(' + n + ')</sup> and ' + n + '! = ' + E.factorial(n) + '. Max: ' + fn.why + '.</p>',
      board: () => errorBoard(fc, xs, x, { maxValue: mx, maxWhy: 'Worst case: ' + fn.why + '.' }),
      solution: (box) => errorWalk(box, { fc, xs, x }),
    };
  };
  g1.label = 'Bound';
  const g2 = () => ({
    type: 'Where is the error largest?',
    prompt: '<p>For equally spaced nodes, where is the interpolation error usually <b>largest</b>?</p>',
    choices: { options: ['Near the middle', 'Near the ends of the interval', 'Exactly at a node', 'The same everywhere'], correct: 1 },
    board: () => ({ steps: [{ title: 'Look at the product', text: '(<i>x</i> − ' + M.v('x', 1) + ')⋯(<i>x</i> − ' + M.v('x', 'n') + ') is largest near the ends; at a node it is 0. With many equally spaced points this is the Runge phenomenon.' }], answer: ['Near the ends.'] }),
  });
  g2.label = 'Concept';
  g2.noExample = true;
  topic.practice = [g1, g2];
  NM.registerTopic(topic);
})(window.NM);
