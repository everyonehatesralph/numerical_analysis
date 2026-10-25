/* Topic 9 — Chebyshev interpolation, Sauer §3.3 */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h, M } = UI;
  const R = UI.rand;
  const s6 = (v) => E.fmtShort(v, 6);
  const nodeFormula = '<i>x</i><sub><i>i</i></sub> = ' + M.fr('<i>b</i> + <i>a</i>', '2') + ' + ' + M.fr('<i>b</i> − <i>a</i>', '2') + ' cos ' + M.fr('(2<i>i</i> − 1)π', '2<i>n</i>') + ', &nbsp; <i>i</i> = 1, …, <i>n</i>';

  /* ---------- written solutions ---------- */
  function nodesBoard(n, a, b, aL, bL) {
    const mid = (a + b) / 2, half = (b - a) / 2;
    const nodes = E.chebNodes(n, a, b);
    return {
      steps: [
        { title: 'Write the node formula', lines: [nodeFormula] },
        { title: 'Midpoint and half-width of [' + aL + ', ' + bL + ']', lines: [M.fr('<i>b</i> + <i>a</i>', '2') + ' = ' + s6(mid) + ', &nbsp; ' + M.fr('<i>b</i> − <i>a</i>', '2') + ' = ' + s6(half)], note: 'Calculator in <b>radians</b>.' },
        { title: 'Compute each node', lines: nodes.map((nd) => M.v('x', nd.i) + ' = ' + s6(mid) + ' + ' + s6(half) + ' cos(' + (2 * nd.i - 1) + 'π/' + 2 * n + ') = ' + s6(mid) + ' + ' + s6(half) + '(' + s6(nd.t) + ') = ' + M.res(s6(nd.x))) },
      ],
      answer: [nodes.map((nd) => s6(nd.x)).join(', ')],
    };
  }
  function boundBoard(o) {
    const { n, a, b, aL, bL, fc, maxValue, maxWhy } = o;
    const factor = Math.pow((b - a) / 2, n) / Math.pow(2, n - 1);
    const d = E.nthDerivative(fc.node, n);
    const mx = maxValue !== undefined ? maxValue : E.maxAbsOn(d.f, a, b).max;
    const bound = (factor / E.factorial(n)) * mx;
    return {
      steps: [
        { title: 'Number of nodes', lines: [o.deg !== undefined ? 'degree ' + o.deg + ' → <i>n</i> = ' + n + ' nodes' : '<i>n</i> = ' + n] },
        { title: 'Largest value of the product (Chebyshev\'s theorem)', lines: ['max |(<i>x</i> − ' + M.v('x', 1) + ')⋯(<i>x</i> − ' + M.v('x', n) + ')| = ' + M.fr('((<i>b</i> − <i>a</i>)/2)<sup><i>n</i></sup>', '2<sup><i>n</i>−1</sup>') + ' = ' + M.fr('(' + s6((b - a) / 2) + ')<sup>' + n + '</sup>', '2<sup>' + (n - 1) + '</sup>') + ' = ' + M.res(E.fmtE(factor, 4))], note: 'On [' + aL + ', ' + bL + '].' },
        { title: 'Largest derivative', lines: ['<i>f</i><sup>(' + n + ')</sup>(<i>x</i>) = ' + d.html, 'max |<i>f</i><sup>(' + n + ')</sup>| = ' + M.res(s6(mx))], note: maxWhy || null },
        { title: 'Put it together', lines: ['|<i>f</i> − <i>P</i>| ≤ ' + M.fr(E.fmtE(factor, 4), n + '!') + ' × ' + s6(mx) + ' = ' + M.fr(E.fmtE(factor, 4), String(E.factorial(n))) + ' × ' + s6(mx) + ' = ' + M.res(E.fmtE(bound, 4))] },
      ],
      answer: ['|<i>f</i>(<i>x</i>) − <i>P</i>(<i>x</i>)| ≤ ' + E.fmtE(bound, 4)],
    };
  }
  function tBoard(n, t) {
    const lines = ['<i>T</i><sub>0</sub>(' + t + ') = 1', '<i>T</i><sub>1</sub>(' + t + ') = ' + t];
    for (let k = 1; k < n; k++) lines.push('<i>T</i><sub>' + (k + 1) + '</sub> = 2(' + t + ')(' + s6(E.chebT(k, t)) + ') − ' + M.paren(s6(E.chebT(k - 1, t))) + ' = ' + (k + 1 === n ? M.res(s6(E.chebT(k + 1, t))) : s6(E.chebT(k + 1, t))));
    return {
      steps: [
        { title: 'Start the recursion', lines: ['<i>T</i><sub><i>k</i>+1</sub>(<i>x</i>) = 2<i>x</i>·<i>T</i><sub><i>k</i></sub>(<i>x</i>) − <i>T</i><sub><i>k</i>−1</sub>(<i>x</i>)'] },
        { title: 'Build up to T' + n, lines },
        { title: 'Check with the cosine form', lines: ['cos(' + n + ' arccos ' + t + ') = ' + s6(Math.cos(n * Math.acos(t)))] },
      ],
      answer: ['<i>T</i><sub>' + n + '</sub>(' + t + ') = ' + s6(E.chebT(n, t))],
    };
  }

  /* Semicircle picture + Runge comparison, one slider */
  function chebPicture(parent) {
    const card = h('div');
    parent.appendChild(card);
    const label = h('b');
    const slider = h('input', { type: 'range', min: '2', max: '15', value: '7', style: { width: '200px' }, 'aria-label': 'number of nodes' });
    card.appendChild(h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', null, 'Nodes n: '), label, slider));
    const left = h('div'), right = h('div');
    card.appendChild(left);
    left.appendChild(h('p', { class: 'small muted', html: 'Equal angles on a half-circle, dropped straight down → Chebyshev nodes. They crowd toward ±1.' }));
    const p1 = new NM.Plot(left, { height: 220, equal: true, view: { x0: -1.25, x1: 1.25, y0: -0.3, y1: 1.2 }, hint: false });
    card.appendChild(right);
    right.appendChild(h('p', { class: 'small muted', style: { marginTop: '10px' }, html: 'Interpolating 1/(1 + 12<i>x</i><sup>2</sup>): <span style="color:var(--c6)">equally spaced</span> vs <span style="color:var(--c3)">Chebyshev</span>.' }));
    const p2 = new NM.Plot(right, { height: 240, view: { x0: -1.1, x1: 1.1, y0: -0.6, y1: 1.5 }, hint: false });
    const f = (x) => 1 / (1 + 12 * x * x);
    const draw = () => {
      const n = +slider.value;
      label.textContent = n + ' ';
      const nodes = E.chebNodes(n, -1, 1);
      p1.scene = (p) => {
        p.fn((x) => Math.sqrt(Math.max(0, 1 - x * x)), { color: 'plot-axis', width: 1.5, from: -1, to: 1 });
        nodes.forEach((nd) => { const px = Math.cos(nd.ang), py = Math.sin(nd.ang); p.line(0, 0, px, py, { color: 'plot-grid', width: 1 }); p.line(px, py, px, 0, { color: 'c3', width: 1.4, dash: [3, 3] }); p.point(px, py, { color: 'c4', r: 4 }); p.point(px, 0, { color: 'c3', r: 4.5 }); });
      };
      const xsE = Array.from({ length: n }, (_, k) => -1 + (2 * k) / (n - 1));
      const xsC = nodes.map((nd) => nd.x);
      const PE = E.interpFn(xsE, xsE.map(f)), PC = E.interpFn(xsC, xsC.map(f));
      p2.scene = (p) => { p.fn(f, { color: 'c1', width: 2.4 }); p.fn(PE, { color: 'c6', width: 1.8 }); p.fn(PC, { color: 'c3', width: 2 }); xsC.forEach((x) => p.point(x, f(x), { color: 'c3', r: 3.5 })); };
      p1.render(); p2.render();
    };
    slider.addEventListener('input', draw);
    draw();
  }

  const topic = {
    id: 'chebyshev', num: 9, unit: 'finals',
    title: 'Chebyshev Interpolation', short: 'Chebyshev nodes',
    book: 'Sauer §3.3', tagline: 'Choose the nodes cleverly — bunched near the ends — and the error gets as small as possible.',

    lessons: [
      { title: 'The idea', build(el) {
        el.appendChild(h('p', { class: 'big', html: 'The error formula contains (<i>x</i> − ' + M.v('x', 1) + ')⋯(<i>x</i> − ' + M.v('x', 'n') + '). We get to <b>choose the nodes</b>. Chebyshev found the choice that makes the biggest value of that product as small as possible.' }));
        el.appendChild(h('p', { html: 'The answer: equal <b>angles</b> on a half-circle, dropped onto the <i>x</i>-axis. The nodes crowd near the ends — exactly where equally spaced nodes cause wiggles.' }));
        chebPicture(el);
      } },
      { title: 'The formulas', build(el) {
        el.appendChild(h('p', { html: '<b>Nodes on [−1, 1]:</b>' }));
        el.appendChild(h('div', { class: 'eq', html: '<i>x</i><sub><i>i</i></sub> = cos ' + M.fr('(2<i>i</i> − 1)π', '2<i>n</i>') + ', &nbsp; <i>i</i> = 1, …, <i>n</i>' }));
        el.appendChild(h('p', { html: '<b>Nodes on [<i>a</i>, <i>b</i>]</b> (stretch and shift):' }));
        el.appendChild(h('div', { class: 'eq', html: nodeFormula }));
        el.appendChild(h('p', { html: '<b>Error bound</b> with Chebyshev nodes:' }));
        el.appendChild(h('div', { class: 'eq', html: '|<i>f</i>(<i>x</i>) − <i>P</i>(<i>x</i>)| ≤ ' + M.fr('((<i>b</i> − <i>a</i>)/2)<sup><i>n</i></sup>', '2<sup><i>n</i>−1</sup> <i>n</i>!') + ' max |<i>f</i><sup>(<i>n</i>)</sup>|' }));
        el.appendChild(h('p', { class: 'small muted', html: 'On [−1, 1] the product is at most 1/2<sup><i>n</i>−1</sup>.' }));
      } },
      { title: 'Chebyshev polynomials', build(el) {
        el.appendChild(h('div', { class: 'eq', html: '<i>T</i><sub><i>n</i></sub>(<i>x</i>) = cos(<i>n</i> arccos <i>x</i>), &nbsp; <i>T</i><sub><i>n</i>+1</sub> = 2<i>x T</i><sub><i>n</i></sub> − <i>T</i><sub><i>n</i>−1</sub>' }));
        el.appendChild(h('div', { class: 'eq', html: '<i>T</i><sub>0</sub> = 1, &nbsp;<i>T</i><sub>1</sub> = <i>x</i>, &nbsp;<i>T</i><sub>2</sub> = 2<i>x</i><sup>2</sup> − 1, &nbsp;<i>T</i><sub>3</sub> = 4<i>x</i><sup>3</sup> − 3<i>x</i>' }));
        el.appendChild(h('ul', null,
          h('li', { html: 'Degree <i>n</i>, leading coefficient 2<sup><i>n</i>−1</sup>.' }),
          h('li', { html: '|<i>T</i><sub><i>n</i></sub>| ≤ 1 on [−1, 1].' }),
          h('li', { html: 'Its roots are exactly the Chebyshev nodes.' })));
      } },
      { title: 'Watch out', build(el) {
        el.appendChild(UI.callout('warn', 'Common mistakes', '<ul><li><b>Degree mode.</b> The angles are radians.</li><li><b>(2<i>i</i> − 1), not 2<i>i</i>.</b> For <i>n</i> = 4: π/8, 3π/8, 5π/8, 7π/8.</li><li><b>Forgetting to stretch</b> to [<i>a</i>, <i>b</i>].</li><li><b>Degree vs nodes:</b> degree <i>d</i> uses <i>n</i> = <i>d</i> + 1 nodes.</li></ul>'));
      } },
    ],

    examples: [
      { title: 'Four Chebyshev nodes on [0, π/2]', src: 'Book Example 3.11', problem: '<p>Find the four Chebyshev base points for interpolation on [0, π/2].</p>', solve: () => nodesBoard(4, 0, Math.PI / 2, '0', 'π/2') },
      { title: 'Error bound for sin x with those nodes', src: 'Book Example 3.11', problem: '<p>Find the worst-case error when sin <i>x</i> is interpolated by a degree-3 polynomial at the four Chebyshev nodes on [0, π/2].</p>', solve: () => boundBoard({ n: 4, deg: 3, a: 0, b: Math.PI / 2, aL: '0', bL: 'π/2', fc: E.compile('sin(x)'), maxValue: 1, maxWhy: '<i>f</i><sup>(4)</sup> = sin <i>x</i>, at most 1.' }) },
      { title: 'eˣ by a degree-4 polynomial on [−1, 1]', src: 'Book Example 3.10', problem: '<p>Find a worst-case error bound on [−1, 1] between <i>e</i><sup><i>x</i></sup> and its degree-4 Chebyshev interpolating polynomial.</p>', solve: () => boundBoard({ n: 5, deg: 4, a: -1, b: 1, aL: '−1', bL: '1', fc: E.compile('e^x'), maxValue: Math.E, maxWhy: '<i>f</i><sup>(5)</sup> = <i>e</i><sup><i>x</i></sup>, largest at <i>x</i> = 1: <i>e</i>.' }) },
      { title: 'Three nodes on [−1, 1]', src: 'roots of T₃', problem: '<p>Find the three Chebyshev nodes on [−1, 1]. Check that they are the roots of <i>T</i><sub>3</sub>(<i>x</i>) = 4<i>x</i><sup>3</sup> − 3<i>x</i>.</p>', solve: () => { const s = nodesBoard(3, -1, 1, '−1', '1'); s.steps.push({ title: 'Check with T₃', lines: ['4<i>x</i><sup>3</sup> − 3<i>x</i> = <i>x</i>(4<i>x</i><sup>2</sup> − 3) = 0 &nbsp;⟹&nbsp; <i>x</i> = 0, ±√3/2 = ±0.866025 ✓'] }); return s; } },
      { title: 'T₄(0.5) by the recursion', src: 'Chebyshev polynomials', problem: '<p>Use the recursion to find <i>T</i><sub>4</sub>(0.5).</p>', solve: () => tBoard(4, 0.5) },
    ],

    solve(el) {
      const nin = UI.textInput({ label: 'Number of nodes <i>n</i>', value: '4' });
      const ain = UI.textInput({ label: '<i>a</i>', value: '0' });
      const bin = UI.textInput({ label: '<i>b</i>', value: 'pi/2' });
      const fin = UI.exprInput({ label: '<i>f</i>(<i>x</i>) for an error bound <span class="muted small">(optional)</span>', value: 'sin(x)', prefix: '<i>f</i>(<i>x</i>) = ', wide: true });
      const out = h('div');
      el.appendChild(h('div', { class: 'card' }, h('div', { class: 'form-grid' }, nin.el, ain.el, bin.el, fin.el),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Show the solution'))));
      el.appendChild(out);
      function run() {
        out.innerHTML = '';
        const n = Math.round(E.evalNumber(nin.get())), a = E.evalNumber(ain.get()), b = E.evalNumber(bin.get());
        if (!(n >= 1 && n <= 20)) { out.appendChild(UI.error('n must be between 1 and 20.')); return; }
        if (!(isFinite(a) && isFinite(b) && b > a)) { out.appendChild(UI.error('Need numbers with a < b.')); return; }
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Nodes' }));
        out.appendChild(paper);
        UI.board(paper, nodesBoard(n, a, b, ain.get(), bin.get()), { reveal: 'all' });
        const fc = fin.get();
        if (fc) {
          const p2 = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Error bound' }));
          out.appendChild(p2);
          UI.board(p2, boundBoard({ n, a, b, aL: ain.get(), bL: bin.get(), fc }), { reveal: 'all' });
        }
      }
      run();
    },
    formulas: '<div class="eq">' + nodeFormula + '</div><ul><li>[−1,1]: max |∏(<i>x</i>−' + M.v('x', 'i') + ')| = 1/2<sup><i>n</i>−1</sup>; [<i>a</i>,<i>b</i>]: ((<i>b</i>−<i>a</i>)/2)<sup><i>n</i></sup>/2<sup><i>n</i>−1</sup></li><li><i>T</i><sub><i>n</i>+1</sub> = 2<i>xT</i><sub><i>n</i></sub> − <i>T</i><sub><i>n</i>−1</sub>, <i>T</i><sub>0</sub> = 1, <i>T</i><sub>1</sub> = <i>x</i></li></ul>',
  };

  /* ---------- practice ---------- */
  const IVS = [[-1, 1, '−1', '1'], [0, 1, '0', '1'], [0, 2, '0', '2'], [0, Math.PI / 2, '0', 'π/2'], [-2, 2, '−2', '2'], [1, 3, '1', '3']];
  const g1 = () => {
    const n = R.int(2, 6), iv = R.pick(IVS), i = R.int(1, n);
    const nd = E.chebNodes(n, iv[0], iv[1])[i - 1];
    return {
      type: 'Find a Chebyshev node',
      prompt: '<p>Find ' + M.v('x', i) + ' for <i>n</i> = ' + n + ' Chebyshev nodes on [' + iv[2] + ', ' + iv[3] + '].</p>',
      fields: [{ label: M.v('x', i) + ' =', answer: nd.x }],
      hint: '<p>' + nodeFormula + '. Radians!</p>',
      board: () => { const b = nodesBoard(n, iv[0], iv[1], iv[2], iv[3]); b.answer = [M.v('x', i) + ' = ' + s6(nd.x)]; return b; },
    };
  };
  g1.label = 'Nodes';
  const g2 = () => {
    const n = R.int(2, 8), iv = R.pick(IVS);
    const factor = Math.pow((iv[1] - iv[0]) / 2, n) / Math.pow(2, n - 1);
    return {
      type: 'Biggest product',
      prompt: '<p>With <i>n</i> = ' + n + ' Chebyshev nodes on [' + iv[2] + ', ' + iv[3] + '], what is the largest value of |(<i>x</i> − ' + M.v('x', 1) + ')⋯(<i>x</i> − ' + M.v('x', n) + ')|?</p>',
      fields: [{ label: 'max =', answer: factor, tol: factor * 5e-3 }],
      hint: '<p>((<i>b</i> − <i>a</i>)/2)<sup><i>n</i></sup> ÷ 2<sup><i>n</i>−1</sup>.</p>',
      board: () => ({ steps: [{ title: 'Chebyshev\'s theorem', lines: [M.fr('((<i>b</i> − <i>a</i>)/2)<sup><i>n</i></sup>', '2<sup><i>n</i>−1</sup>') + ' = ' + M.fr('(' + s6((iv[1] - iv[0]) / 2) + ')<sup>' + n + '</sup>', '2<sup>' + (n - 1) + '</sup>') + ' = ' + M.res(E.fmtE(factor, 5))] }], answer: ['max = ' + E.fmtE(factor, 5)] }),
    };
  };
  g2.label = 'Product bound';
  const g3 = () => {
    const n = R.int(2, 6), t = R.pick([0.5, -0.5, 0.3, 0.8, -0.2, 0.25]);
    return {
      type: 'Chebyshev polynomial value',
      prompt: '<p>Use the recursion to find <i>T</i><sub>' + n + '</sub>(' + t + ').</p>',
      fields: [{ label: '<i>T</i><sub>' + n + '</sub>(' + t + ') =', answer: E.chebT(n, t) }],
      hint: '<p>Start with <i>T</i><sub>0</sub> = 1, <i>T</i><sub>1</sub> = ' + t + '.</p>',
      board: () => tBoard(n, t),
    };
  };
  g3.label = 'Tₙ(x)';
  const g4 = () => {
    const deg = R.int(2, 5), n = deg + 1;
    const iv = R.pick([[-1, 1, '−1', '1', Math.E, 'e'], [0, 1, '0', '1', Math.E, 'e'], [0, 2, '0', '2', Math.E * Math.E, 'e²']]);
    const bound = (Math.pow((iv[1] - iv[0]) / 2, n) / (Math.pow(2, n - 1) * E.factorial(n))) * iv[4];
    return {
      type: 'Chebyshev error bound',
      prompt: '<p><i>e</i><sup><i>x</i></sup> is interpolated on [' + iv[2] + ', ' + iv[3] + '] by a polynomial of <b>degree ' + deg + '</b> at Chebyshev nodes. Find the worst-case error bound.</p>',
      fields: [{ label: 'bound =', answer: bound, tol: bound * 1e-2 }],
      hint: '<p>Degree ' + deg + ' → <i>n</i> = ' + n + '. Max |<i>f</i><sup>(' + n + ')</sup>| = ' + iv[5] + '.</p>',
      board: () => boundBoard({ n, deg, a: iv[0], b: iv[1], aL: iv[2], bL: iv[3], fc: E.compile('e^x'), maxValue: iv[4], maxWhy: 'Every derivative is <i>e</i><sup><i>x</i></sup>, largest at the right end: ' + iv[5] + '.' }),
    };
  };
  g4.label = 'Error bound';
  topic.practice = [g1, g2, g3, g4];
  NM.registerTopic(topic);
})(window.NM);
