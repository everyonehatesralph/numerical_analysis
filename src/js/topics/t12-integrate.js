/* Topic 12 — Newton–Cotes integration: Trapezoid, Simpson, Midpoint, Sauer §5.2 */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h, M } = UI;
  const R = UI.rand;
  const n6 = (x) => M.n(x);
  const nf = (x) => M.nf(x);
  const NAMES = { trap: 'Composite Trapezoid Rule', simpson: 'Composite Simpson\'s Rule', midpoint: 'Composite Midpoint Rule' };
  const RULE = {
    trap: M.fr('<i>h</i>', '2') + '[' + M.v('y', 0) + ' + 2' + M.v('y', 1) + ' + 2' + M.v('y', 2) + ' + ⋯ + 2' + M.v('y', 'n−1') + ' + ' + M.v('y', 'n') + ']',
    simpson: M.fr('<i>h</i>', '3') + '[' + M.v('y', 0) + ' + 4' + M.v('y', 1) + ' + 2' + M.v('y', 2) + ' + 4' + M.v('y', 3) + ' + ⋯ + 4' + M.v('y', 'n−1') + ' + ' + M.v('y', 'n') + ']',
    midpoint: '<i>h</i>[<i>f</i>(' + M.v('m', 1) + ') + <i>f</i>(' + M.v('m', 2) + ') + ⋯ + <i>f</i>(' + M.v('m', 'n') + ')]',
  };

  /* ---------- written solution ---------- */
  function integrateBoard(fc, a, b, n, method, o) {
    o = o || {};
    const res = E.integrate(fc.f, a, b, n, method);
    if (res.error) throw new Error(res.error);
    let exact = null, referenceError = '';
    try { exact = E.integralRef(fc.f, a, b); } catch (e) { referenceError = e.message; }
    const aL = o.aL || n6(a), bL = o.bL || n6(b);
    const steps = [
      { title: 'Write the rule', lines: ['∫ ≈ ' + RULE[method]], note: method === 'simpson' ? '<i>n</i> must be even. Weights: 1, 4, 2, 4, …, 4, 1.' : method === 'trap' ? 'Weights: 1 at the ends, 2 inside.' : 'Use the middle of each panel.' },
      { title: 'Step size', lines: ['<i>h</i> = ' + M.fr('<i>b</i> − <i>a</i>', '<i>n</i>') + ' = ' + M.fr(bL + ' − ' + M.paren(aL), String(n)) + ' = ' + M.res(nf(res.h))] },
      {
        title: method === 'midpoint' ? 'Function values at the midpoints' : 'Function values at the points',
        text: method === 'midpoint' ? 'Midpoints ' + M.v('m', 'i') + ' = <i>a</i> + (<i>i</i> − ½)<i>h</i>.' : M.v('x', 'i') + ' = <i>a</i> + <i>ih</i>.',
        table: { head: ['<i>i</i>', method === 'midpoint' ? M.v('m', 'i') : M.v('x', 'i'), '<i>f</i>(·)', 'weight', 'weight × <i>f</i>'], rows: res.pts.map((p) => [method === 'midpoint' ? p.i + 1 : p.i, n6(p.x), nf(p.y), p.w, nf(p.w * p.y)]) },
        note: o.trig ? 'Calculator in <b>radians</b>.' : null,
      },
      { title: 'Add the weighted values', lines: ['sum = ' + res.pts.map((p) => (p.w === 1 ? '' : p.w + '·') + M.paren(n6(p.y))).join(' + ') + ' = ' + M.res(nf(res.sum))] },
      { title: 'Multiply', lines: [(method === 'trap' ? M.fr('<i>h</i>', '2') : method === 'simpson' ? M.fr('<i>h</i>', '3') : '<i>h</i>') + ' × sum = ' + nf(res.factor) + ' × ' + nf(res.sum) + ' = ' + M.res(nf(res.value))] },
    ];
    if (o.compare !== false) steps.push(exact !== null
      ? { title: 'Compare with a numerical reference', lines: ['reference value ≈ ' + nf(exact) + (o.exactLabel ? ' (' + o.exactLabel + ')' : ''), 'estimated error ≈ ' + E.fmtE(Math.abs(res.value - exact), 3)] }
      : { title: 'Reference comparison unavailable', text: referenceError, note: 'The rule above used only its required sample points. A reliable true-error comparison is unavailable; check the domain and any improper endpoints.' });
    return { steps, answer: ['∫<sub>' + aL + '</sub><sup>' + bL + '</sup> <i>f</i>(<i>x</i>) d<i>x</i> ≈ <b>' + nf(res.value) + '</b>'] };
  }

  /* ---------- picture ---------- */
  function integratePlot(parent, fc, a, b, n, method) {
    const res = E.integrate(fc.f, a, b, n, method);
    const plot = new NM.Plot(parent, { height: 260 });
    plot.scene = (p) => {
      if (method === 'trap') for (let k = 0; k < n; k++) { const p0 = res.pts[k], p1 = res.pts[k + 1]; p.path([[p0.x, 0], [p0.x, p0.y], [p1.x, p1.y], [p1.x, 0]], { color: 'c2', width: 1.3, close: true, fillAlpha: 0.22 }); }
      else if (method === 'simpson') for (let k = 0; k + 2 <= n; k += 2) { const [p0, p1, p2] = [res.pts[k], res.pts[k + 1], res.pts[k + 2]]; p.area(E.interpFn([p0.x, p1.x, p2.x], [p0.y, p1.y, p2.y]), p0.x, p2.x, { color: 'c3', width: 1.3, fillAlpha: 0.22 }); }
      else res.pts.forEach((pt) => { const x0 = pt.x - res.h / 2, x1 = pt.x + res.h / 2; p.path([[x0, 0], [x0, pt.y], [x1, pt.y], [x1, 0]], { color: 'c4', width: 1.3, close: true, fillAlpha: 0.22 }); });
      p.fn(fc.f, { color: 'c1', width: 2.6 });
      res.pts.forEach((pt) => p.point(pt.x, pt.y, { color: 'ink', r: 4 }));
    };
    plot.legend([{ label: '<i>y</i> = <i>f</i>(<i>x</i>)', color: 'c1' }, { label: method === 'simpson' ? 'parabola pieces' : method === 'trap' ? 'trapezoids' : 'rectangles', color: method === 'simpson' ? 'c3' : method === 'trap' ? 'c2' : 'c4' }]);
    plot.fit({ fns: [fc.f], x0: a, x1: b, xpad: 0.1 });
  }

  const ex = (title, src, fs, a, b, n, method, opt) => {
    opt = opt || {};
    const fc = E.compile(fs);
    return {
      title, src,
      problem: '<p>Approximate</p><div class="eq">∫<sub>' + (opt.aL || a) + '</sub><sup>' + (opt.bL || b) + '</sup> ' + fc.html + ' d<i>x</i></div><p>with the ' + NAMES[method].toLowerCase() + ' and <i>n</i> = ' + n + ' panels.</p>' + (opt.trig ? NM.roots.trigNote : ''),
      solve: () => integrateBoard(fc, a, b, n, method, opt),
      watch: (el) => integratePlot(el, fc, a, b, n, method),
    };
  };

  const topic = {
    id: 'integrate', num: 12, unit: 'finals',
    title: 'Numerical Integration', short: 'Trapezoid & Simpson',
    book: 'Sauer §5.2', tagline: 'Approximate the area under a curve with trapezoids or parabolas.',

    lessons: [
      { title: 'The idea', build(el) {
        el.appendChild(h('p', { class: 'big', html: 'Cut [<i>a</i>, <i>b</i>] into <i>n</i> equal panels of width <i>h</i>. Replace the curve on each panel by something easy — a <b>straight line</b> (Trapezoid) or a <b>parabola</b> (Simpson) — and add up the areas.' }));
        const host = h('div');
        let m = 'trap';
        const draw = () => { host.innerHTML = ''; integratePlot(host, E.compile('ln(x)'), 1, 2, 4, m); };
        el.appendChild(h('div', { style: { marginBottom: '8px' } }, UI.seg([['trap', 'Trapezoid'], ['simpson', 'Simpson'], ['midpoint', 'Midpoint']], 'trap', (v) => { m = v; draw(); })));
        el.appendChild(host);
        draw();
      } },
      { title: 'The formulas', build(el) {
        el.appendChild(h('p', { html: '<i>h</i> = (<i>b</i> − <i>a</i>)/<i>n</i>, &nbsp; ' + M.v('y', 'i') + ' = <i>f</i>(<i>a</i> + <i>ih</i>)' }));
        el.appendChild(h('div', { class: 'eq', html: 'Trapezoid: ' + RULE.trap }));
        el.appendChild(h('div', { class: 'eq', html: 'Simpson (<i>n</i> even): ' + RULE.simpson }));
        el.appendChild(h('div', { class: 'eq', html: 'Midpoint: ' + RULE.midpoint }));
        el.appendChild(UI.table(['Rule', 'Error', 'Exact for'], [
          ['Trapezoid', '−(<i>b</i> − <i>a</i>)<i>h</i><sup>2</sup><i>f</i>″(<i>c</i>)/12', 'lines'],
          ['Simpson', '−(<i>b</i> − <i>a</i>)<i>h</i><sup>4</sup><i>f</i><sup>(4)</sup>(<i>c</i>)/180', 'cubics'],
          ['Midpoint', '(<i>b</i> − <i>a</i>)<i>h</i><sup>2</sup><i>f</i>″(<i>c</i>)/24', 'lines'],
        ], { align: ['l', 'l', 'l'] }).el);
        el.appendChild(h('p', { class: 'small muted', html: 'The book writes Simpson with 2<i>m</i> panels; that is <i>n</i> = 2<i>m</i> here.' }));
      } },
      { title: 'The steps', build(el) {
        el.appendChild(UI.recipe([
          '<b><i>h</i> = (<i>b</i> − <i>a</i>)/<i>n</i>.</b> (Simpson: <i>n</i> even.)',
          '<b>Table:</b> ' + M.v('x', 'i') + ' = <i>a</i> + <i>ih</i> and ' + M.v('y', 'i') + ' = <i>f</i>(' + M.v('x', 'i') + ').',
          '<b>Weights:</b> Trapezoid 1, 2, …, 2, 1. Simpson 1, 4, 2, 4, …, 4, 1.',
          '<b>Multiply and add</b>, then × <i>h</i>/2 (Trapezoid) or × <i>h</i>/3 (Simpson).',
        ]));
      } },
      { title: 'Watch out', build(el) {
        el.appendChild(UI.callout('warn', 'Common mistakes', '<ul><li><b>Odd <i>n</i> with Simpson.</b> Not allowed.</li><li><b>Wrong weights</b> — the ends are always 1.</li><li><b><i>h</i>/2 vs <i>h</i>/3</b> mixed up.</li><li><b>Degree mode</b> for trig.</li></ul>'));
        el.appendChild(UI.callout('calc', 'Calculator tricks', '<p><span class="kbd">CALC</span> or TABLE mode for the ' + M.v('y', 'i') + '. Check your answer with the calculator\'s <span class="kbd">∫</span> key — close, not equal.</p>'));
      } },
    ],

    examples: [
      ex('ln x from 1 to 2, Trapezoid', 'exact: 2 ln 2 − 1', 'ln(x)', 1, 2, 4, 'trap', { exactLabel: '2 ln 2 − 1' }),
      ex('ln x from 1 to 2, Simpson', 'same 5 values, far better', 'ln(x)', 1, 2, 4, 'simpson', { exactLabel: '2 ln 2 − 1' }),
      ex('e^(−x²) from 0 to 1', 'no formula antiderivative', 'e^(-x^2)', 0, 1, 2, 'simpson'),
      ex('sin x from 0 to π, Midpoint', 'exact: 2', 'sin(x)', 0, Math.PI, 4, 'midpoint', { bL: 'π', trig: true, exactLabel: '2' }),
      ex('x³ from 0 to 2, Simpson', 'Simpson is exact for cubics', 'x^3', 0, 2, 2, 'simpson', { exactLabel: '4' }),
    ],

    solve(el) {
      let method = 'trap';
      const fin = UI.exprInput({ label: '<i>f</i>(<i>x</i>) =', value: 'ln(x)', prefix: '<i>f</i>(<i>x</i>) = ', wide: true });
      const ain = UI.textInput({ label: '<i>a</i>', value: '1' });
      const bin = UI.textInput({ label: '<i>b</i>', value: '2' });
      const nin = UI.textInput({ label: 'panels <i>n</i>', value: '4' });
      const out = h('div');
      const seg = UI.seg([['trap', 'Trapezoid'], ['simpson', 'Simpson'], ['midpoint', 'Midpoint']], 'trap', (v) => { method = v; run(); });
      el.appendChild(h('div', { class: 'card' }, h('div', { class: 'row', style: { marginBottom: '12px' } }, seg), h('div', { class: 'form-grid' }, fin.el, ain.el, bin.el, nin.el),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Show the solution'))));
      el.appendChild(out);
      function run() {
        out.innerHTML = '';
        const fc = fin.get();
        if (!fc) { out.appendChild(UI.error('I can\'t read f(x) yet.')); return; }
        const a = E.evalNumber(ain.get()), b = E.evalNumber(bin.get()), n = E.evalNumber(nin.get());
        if (!isFinite(a) || !isFinite(b) || a === b) { out.appendChild(UI.error('Need two different numbers a and b.')); return; }
        if (!(Number.isInteger(n) && n >= 1 && n <= 200)) { out.appendChild(UI.error('n must be a whole number from 1 to 200.')); return; }
        if (method === 'simpson' && n % 2) { out.appendChild(UI.error('Simpson\'s Rule needs an even number of panels. Try n = ' + (n + 1) + '.')); return; }
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Solution' }));
        out.appendChild(paper);
        try { UI.board(paper, integrateBoard(fc, a, b, n, method, { aL: ain.get(), bL: bin.get(), trig: /sin|cos|tan/.test(fc.text) }), { reveal: 'all' }); }
        catch (e) { out.innerHTML = ''; out.appendChild(UI.error(e.message)); return; }
        UI.watch(paper, (bx) => integratePlot(bx, fc, a, b, n, method), 'Show the picture');
      }
      run();
    },
    formulas: '<ul style="list-style:none;padding:0"><li>Trap: (<i>h</i>/2)[' + M.v('y', 0) + ' + ' + M.v('y', 'n') + ' + 2Σ inside], error −(<i>b</i>−<i>a</i>)<i>h</i><sup>2</sup><i>f</i>″/12</li><li>Simpson: (<i>h</i>/3)[' + M.v('y', 0) + ' + ' + M.v('y', 'n') + ' + 4Σ odd + 2Σ even], error −(<i>b</i>−<i>a</i>)<i>h</i><sup>4</sup><i>f</i><sup>(4)</sup>/180</li><li>Midpoint: <i>h</i>Σ<i>f</i>(' + M.v('m', 'i') + '), error (<i>b</i>−<i>a</i>)<i>h</i><sup>2</sup><i>f</i>″/24</li></ul>',
  };

  /* ---------- practice ---------- */
  const PROBS = [
    { f: 'x^2', a: 0, b: 1 }, { f: 'x^3', a: 0, b: 2 }, { f: '1/x', a: 1, b: 2 }, { f: 'e^x', a: 0, b: 1 },
    { f: 'sqrt(x)', a: 1, b: 2 }, { f: 'ln(x)', a: 1, b: 2 }, { f: '1/(1 + x^2)', a: 0, b: 1 }, { f: 'sin(x)', a: 0, b: 'pi' },
    { f: 'x e^x', a: 0, b: 1 }, { f: 'e^(-x^2)', a: 0, b: 1 },
  ];
  const mk = (method) => () => {
    const pr = R.pick(PROBS), fc = E.compile(pr.f);
    const b = E.evalNumber(String(pr.b));
    const n = method === 'simpson' ? R.pick([2, 4]) : R.pick([2, 3, 4]);
    const res = E.integrate(fc.f, pr.a, b, n, method);
    const bL = pr.b === 'pi' ? 'π' : String(pr.b);
    return {
      type: NAMES[method] + ', n = ' + n,
      prompt: '<p>Approximate ∫<sub>' + pr.a + '</sub><sup>' + bL + '</sup> <span class="math">' + fc.html + '</span> d<i>x</i> with the ' + NAMES[method].toLowerCase() + ' and <i>n</i> = ' + n + '.</p>' + (/sin|cos/.test(pr.f) ? NM.roots.trigNote : ''),
      fields: [{ label: '<i>h</i> =', answer: res.h }, { label: 'approximation =', answer: res.value, tol: Math.max(1e-4, Math.abs(res.value) * 2e-4) }],
      hint: '<p><i>h</i> = (<i>b</i> − <i>a</i>)/' + n + '. ' + (method === 'trap' ? 'Weights 1, 2, …, 2, 1, then × <i>h</i>/2.' : method === 'simpson' ? 'Weights 1, 4, 2, …, 4, 1, then × <i>h</i>/3.' : 'Midpoints, add, × <i>h</i>.') + '</p>',
      board: () => integrateBoard(fc, pr.a, b, n, method, { bL, trig: /sin|cos/.test(pr.f) }),
      solution: (box) => integratePlot(box, fc, pr.a, b, n, method),
    };
  };
  const g1 = mk('trap'); g1.label = 'Trapezoid';
  const g2 = mk('simpson'); g2.label = 'Simpson';
  const g3 = mk('midpoint'); g3.label = 'Midpoint';
  const g4 = () => ({
    type: 'Which rule is exact?',
    prompt: '<p>Which rule gives the <b>exact</b> value of ∫<sub>0</sub><sup>2</sup> <i>x</i><sup>3</sup> d<i>x</i> (any even <i>n</i>)?</p>',
    choices: { options: ['Trapezoid', 'Simpson', 'Midpoint', 'All of them'], correct: 1 },
    board: () => ({ steps: [{ title: 'Look at the error terms', text: 'Simpson\'s error contains <i>f</i><sup>(4)</sup>, which is 0 for a cubic. Trapezoid and Midpoint contain <i>f</i>″, which is not 0.' }], answer: ['Simpson'] }),
  });
  g4.label = 'Concept';
  g4.noExample = true;
  topic.practice = [g1, g2, g3, g4];
  NM.registerTopic(topic);
})(window.NM);
