/* Topic 11 — Numerical differentiation, Sauer §5.1 */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h, M } = UI;
  const R = UI.rand;
  const n = (x) => M.n(x);
  const nf = (x) => M.nf(x);

  const FORMS = {
    forward: { name: 'Two-point forward difference', short: 'forward', html: M.fr('<i>f</i>(<i>x</i> + <i>h</i>) − <i>f</i>(<i>x</i>)', '<i>h</i>'), err: '−' + M.fr('<i>h</i>', '2') + '<i>f</i>″(<i>c</i>)', order: 1, d: 1 },
    backward: { name: 'Two-point backward difference', short: 'backward', html: M.fr('<i>f</i>(<i>x</i>) − <i>f</i>(<i>x</i> − <i>h</i>)', '<i>h</i>'), err: M.fr('<i>h</i>', '2') + '<i>f</i>″(<i>c</i>)', order: 1, d: 1 },
    centered: { name: 'Three-point centered difference', short: 'centered', html: M.fr('<i>f</i>(<i>x</i> + <i>h</i>) − <i>f</i>(<i>x</i> − <i>h</i>)', '2<i>h</i>'), err: '−' + M.fr('<i>h</i><sup>2</sup>', '6') + '<i>f</i>‴(<i>c</i>)', order: 2, d: 1 },
    second: { name: 'Second-derivative formula', short: 'second derivative', html: M.fr('<i>f</i>(<i>x</i> − <i>h</i>) − 2<i>f</i>(<i>x</i>) + <i>f</i>(<i>x</i> + <i>h</i>)', '<i>h</i><sup>2</sup>'), err: '−' + M.fr('<i>h</i><sup>2</sup>', '12') + '<i>f</i><sup>(4)</sup>(<i>c</i>)', order: 2, d: 2 },
  };

  /* ---------- written solution ---------- */
  function diffBoard(fc, x, hh, which, o) {
    o = o || {};
    const r = E.diffFormulas(fc.f, x, hh);
    if (which.some((k) => !isFinite(r[k]))) throw new Error('The requested formula uses a point where f is undefined. Check x, h, and the function domain.');
    const xm = x - hh, xp = x + hh;
    const steps = [{
      title: 'Values you need (h = ' + n(hh) + ')',
      lines: [
        '<i>f</i>(' + n(xm) + ') = ' + E.subHTML(fc.node, n(xm)) + ' = ' + nf(r.fm),
        '<i>f</i>(' + n(x) + ') = ' + E.subHTML(fc.node, n(x)) + ' = ' + nf(r.f0),
        '<i>f</i>(' + n(xp) + ') = ' + E.subHTML(fc.node, n(xp)) + ' = ' + nf(r.fp),
      ],
      note: o.trig ? 'Calculator in <b>radians</b>.' : null,
    }];
    const sub = {
      forward: M.fr(nf(r.fp) + ' − ' + M.paren(nf(r.f0)), n(hh)),
      backward: M.fr(nf(r.f0) + ' − ' + M.paren(nf(r.fm)), n(hh)),
      centered: M.fr(nf(r.fp) + ' − ' + M.paren(nf(r.fm)), '2(' + n(hh) + ')'),
      second: M.fr(nf(r.fm) + ' − 2 × (' + nf(r.f0) + ') + ' + M.paren(nf(r.fp)), '(' + n(hh) + ')<sup>2</sup>'),
    };
    const d1 = E.derivative(fc.node), d2 = E.nthDerivative(fc.node, 2);
    const answer = [];
    which.forEach((k) => {
      const F = FORMS[k];
      steps.push({ title: F.name, lines: [(F.d === 2 ? '<i>f</i>″' : '<i>f</i>′') + '(' + n(x) + ') ≈ ' + F.html, '= ' + sub[k] + ' = ' + M.res(nf(r[k]))] });
      answer.push(F.short + ': ' + (F.d === 2 ? '<i>f</i>″' : '<i>f</i>′') + '(' + n(x) + ') ≈ ' + nf(r[k]));
    });
    if (o.compare !== false) {
      const lines = [];
      if (which.some((k) => FORMS[k].d === 1)) lines.push('<i>f</i>′(<i>x</i>) = ' + d1.html + ' → <i>f</i>′(' + n(x) + ') = ' + nf(d1.f(x)));
      if (which.includes('second')) lines.push('<i>f</i>″(<i>x</i>) = ' + d2.html + ' → <i>f</i>″(' + n(x) + ') = ' + nf(d2.f(x)));
      which.forEach((k) => lines.push(FORMS[k].short + ' error = ' + E.fmtE(Math.abs(r[k] - (FORMS[k].d === 2 ? d2.f(x) : d1.f(x))), 3)));
      steps.push({ title: 'Compare with the exact derivative', lines, note: 'Centered formulas are much more accurate: their error shrinks like <i>h</i><sup>2</sup>.' });
    }
    if (o.richardson) {
      const F1 = r.centered, F2 = E.diffFormulas(fc.f, x, hh / 2).centered;
      steps.push({
        title: 'Extrapolate (Richardson)',
        lines: ['centered with <i>h</i>/2 = ' + n(hh / 2) + ': <i>F</i>(<i>h</i>/2) = ' + nf(F2), '<i>Q</i> ≈ ' + M.fr('4<i>F</i>(<i>h</i>/2) − <i>F</i>(<i>h</i>)', '3') + ' = ' + M.fr('4(' + nf(F2) + ') − ' + M.paren(nf(F1)), '3') + ' = ' + M.res(nf((4 * F2 - F1) / 3))],
        note: 'The centered formula has order 2, so we use 2<sup>2</sup> = 4.',
      });
      answer.push('extrapolated ≈ ' + nf((4 * F2 - F1) / 3));
    }
    return { steps, answer };
  }

  function diffPlot(parent, fc, x, hh) {
    const r = E.diffFormulas(fc.f, x, hh);
    const ex1 = E.derivative(fc.node).f(x);
    const plot = new NM.Plot(parent, { height: 260 });
    plot.scene = (p) => {
      p.fn(fc.f, { color: 'c1', width: 2.5 });
      p.lineThrough(x, r.f0, x + 1, r.f0 + ex1, { color: 'ink', width: 1.8 });
      p.lineThrough(x, r.f0, x + hh, r.fp, { color: 'c2', width: 1.6, dash: [6, 4] });
      p.lineThrough(x - hh, r.fm, x + hh, r.fp, { color: 'c3', width: 1.6, dash: [2, 3] });
      p.point(x - hh, r.fm, { color: 'c3', r: 4 }); p.point(x + hh, r.fp, { color: 'c2', r: 4 }); p.point(x, r.f0, { color: 'ink', r: 5 });
    };
    plot.legend([{ label: 'true tangent', color: 'ink' }, { label: 'forward secant', color: 'c2' }, { label: 'centered secant (nearly parallel!)', color: 'c3' }]);
    plot.fit({ fns: [fc.f], x0: x - Math.max(hh * 3, 0.6), x1: x + Math.max(hh * 3, 0.6), xpad: 0, zero: false, robust: true, pad: 0.3 });
  }

  function hTable(fc, x) {
    const ex = E.derivative(fc.node).f(x);
    const rows = [];
    for (let k = 1; k <= 12; k++) {
      const hh = Math.pow(10, -k), r = E.diffFormulas(fc.f, x, hh);
      rows.push(['10<sup>−' + k + '</sup>', E.fmtE(Math.abs(r.forward - ex), 2), E.fmtE(Math.abs(r.centered - ex), 2)]);
    }
    return UI.table(['<i>h</i>', 'forward error', 'centered error'], rows);
  }

  const ex = (title, src, fs, x, hh, which, opt) => {
    opt = opt || {};
    const fc = E.compile(fs);
    return {
      title, src,
      problem: '<p>For <span class="math"><i>f</i>(<i>x</i>) = ' + fc.html + '</span> at <i>x</i> = ' + x + ' with <i>h</i> = ' + hh + ', use the ' + which.map((k) => FORMS[k].short).join(' and ') + ' formula' + (which.length > 1 ? 's' : '') + (opt.richardson ? ', then extrapolate' : '') + '.</p>' + (opt.trig ? NM.roots.trigNote : ''),
      solve: () => diffBoard(fc, x, hh, which, opt),
      watch: (el) => diffPlot(el, fc, x, hh),
    };
  };

  const topic = {
    id: 'diff', num: 11, unit: 'finals',
    title: 'Numerical Differentiation', short: 'finite differences',
    book: 'Sauer §5.1', tagline: 'Approximate a derivative with a slope between nearby points.',

    lessons: [
      { title: 'The idea', build(el) {
        el.appendChild(h('p', { class: 'big', html: 'The derivative is the slope of the tangent. Without calculus, take the slope of a <b>secant</b> between points a small step <i>h</i> apart. The centered version (one step each side) is much more accurate.' }));
        diffPlot(el, E.compile('e^x'), 0, 0.5);
      } },
      { title: 'The formulas', build(el) {
        el.appendChild(UI.table(['Formula', 'Approximation', 'Error', 'Order'], Object.keys(FORMS).map((k) => [FORMS[k].name, '<span class="math">' + (FORMS[k].d === 2 ? '<i>f</i>″' : '<i>f</i>′') + '(<i>x</i>) ≈ ' + FORMS[k].html + '</span>', '<span class="math">' + FORMS[k].err + '</span>', 'O(<i>h</i>' + (FORMS[k].order > 1 ? '<sup>2</sup>' : '') + ')']), { align: ['l', 'l', 'l', 'c'] }).el);
        el.appendChild(h('p', { html: '<b>Order:</b> O(<i>h</i>) → halve <i>h</i>, the error halves. O(<i>h</i><sup>2</sup>) → halve <i>h</i>, the error drops to a quarter.' }));
      } },
      { title: 'Smaller h is not always better', build(el) {
        el.appendChild(h('p', { html: 'This app uses about 16 significant digits internally; your calculator’s precision may differ. When <i>h</i> is tiny, <i>f</i>(<i>x</i> + <i>h</i>) and <i>f</i>(<i>x</i>) are almost equal and subtracting loses digits. The error shrinks, then grows again. For <i>e</i><sup><i>x</i></sup> at 0:' }));
        el.appendChild(hTable(E.compile('e^x'), 0).el);
        el.appendChild(h('p', { html: '<b>Richardson extrapolation</b> gets more accuracy for free: <i>Q</i> ≈ (2<sup><i>n</i></sup><i>F</i>(<i>h</i>/2) − <i>F</i>(<i>h</i>))/(2<sup><i>n</i></sup> − 1), with <i>n</i> = the order.' }));
      } },
      { title: 'Watch out', build(el) {
        el.appendChild(UI.callout('warn', 'Common mistakes', '<ul><li><b>Dividing by <i>h</i> instead of 2<i>h</i></b> in the centered formula.</li><li><b>Mixing up</b> the second-derivative formula with the first-derivative ones.</li><li><b>Degree mode</b> for trig.</li></ul>'));
      } },
    ],

    examples: [
      ex('eˣ at x = 0', 'exact answer is 1', 'e^x', 0, 0.1, ['forward', 'centered']),
      ex('sin x: second derivative at x = 1', 'radians!', 'sin(x)', 1, 0.1, ['second'], { trig: true }),
      ex('ln x at x = 2', '', 'ln(x)', 2, 0.05, ['backward', 'centered']),
      ex('eˣ at 0 with extrapolation', 'Richardson', 'e^x', 0, 0.1, ['centered'], { richardson: true }),
    ],

    solve(el) {
      const fin = UI.exprInput({ label: '<i>f</i>(<i>x</i>) =', value: 'sin(x)', prefix: '<i>f</i>(<i>x</i>) = ', wide: true });
      const xin = UI.textInput({ label: 'at <i>x</i> =', value: '1' });
      const hin = UI.textInput({ label: 'step <i>h</i> =', value: '0.1' });
      const out = h('div');
      el.appendChild(h('div', { class: 'card' }, h('div', { class: 'form-grid' }, fin.el, xin.el, hin.el),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Show the solution'))));
      el.appendChild(out);
      function run() {
        out.innerHTML = '';
        const fc = fin.get();
        if (!fc) { out.appendChild(UI.error('I can\'t read f(x) yet.')); return; }
        const x = E.evalNumber(xin.get()), hh = E.evalNumber(hin.get());
        if (!isFinite(x) || !(hh > 0)) { out.appendChild(UI.error('Need a number x and a positive h.')); return; }
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Solution' }));
        out.appendChild(paper);
        try { UI.board(paper, diffBoard(fc, x, hh, ['forward', 'backward', 'centered', 'second'], { richardson: true, trig: /sin|cos|tan/.test(fc.text) }), { reveal: 'all' }); }
        catch (e) { out.innerHTML = ''; out.appendChild(UI.error(e.message)); return; }
        UI.watch(paper, (b) => { diffPlot(b, fc, x, hh); b.appendChild(h('h3', { text: 'Error as h shrinks' })); b.appendChild(hTable(fc, x).el); }, 'Show the picture and the error table');
      }
      run();
    },
    formulas: '<ul style="list-style:none;padding:0"><li>forward: <span class="math">' + FORMS.forward.html + '</span>, O(<i>h</i>)</li><li>centered: <span class="math">' + FORMS.centered.html + '</span>, O(<i>h</i><sup>2</sup>)</li><li><i>f</i>″: <span class="math">' + FORMS.second.html + '</span>, O(<i>h</i><sup>2</sup>)</li><li>Richardson: (2<sup><i>n</i></sup><i>F</i>(<i>h</i>/2) − <i>F</i>(<i>h</i>))/(2<sup><i>n</i></sup> − 1)</li></ul>',
  };

  /* ---------- practice ---------- */
  const FS = ['e^x', 'sin(x)', 'cos(x)', 'ln(x)', 'x^3', 'sqrt(x)', '1/x', 'x e^x'];
  const g1 = () => {
    const s = R.pick(FS), fc = E.compile(s);
    const x = R.pick([1, 2, 0.5, 1.5]), hh = R.pick([0.1, 0.2, 0.05, 0.01]);
    const which = R.pick(['forward', 'centered', 'second', 'backward']);
    const r = E.diffFormulas(fc.f, x, hh);
    const trig = /sin|cos/.test(s);
    return {
      type: FORMS[which].name,
      prompt: '<p>Use the <b>' + FORMS[which].short + '</b> formula with <i>h</i> = ' + hh + ' to approximate <i>f</i>' + (FORMS[which].d === 2 ? '″' : '′') + '(' + x + ') for <span class="math"><i>f</i>(<i>x</i>) = ' + fc.html + '</span>.</p>' + (trig ? NM.roots.trigNote : ''),
      fields: [{ label: 'approximation =', answer: r[which], tol: Math.max(1e-4, Math.abs(r[which]) * 2e-4) }],
      hint: '<p><span class="math">' + FORMS[which].html + '</span></p>',
      board: () => diffBoard(fc, x, hh, [which], { trig }),
      solution: (box) => diffPlot(box, fc, x, hh),
    };
  };
  g1.label = 'Formulas';
  const g2 = () => {
    const F1 = +(R.pick([2.71, 0.54, 1.02, 3.1]) + Math.random() * 0.01).toFixed(6);
    const F2 = +(F1 - (Math.random() * 0.004 + 0.001)).toFixed(6);
    const ans = (4 * F2 - F1) / 3;
    return {
      type: 'Richardson extrapolation',
      prompt: '<p>The centered difference (order 2) gives <i>F</i>(0.1) = ' + F1 + ' and <i>F</i>(0.05) = ' + F2 + '. Extrapolate.</p>',
      fields: [{ label: '<i>Q</i> ≈', answer: ans, tol: 2e-6 }],
      hint: '<p><i>Q</i> = (2<sup>2</sup><i>F</i>(<i>h</i>/2) − <i>F</i>(<i>h</i>))/(2<sup>2</sup> − 1).</p>',
      board: () => ({ steps: [{ title: 'Order 2 → use 2² = 4', lines: ['<i>Q</i> = ' + M.fr('4<i>F</i>(0.05) − <i>F</i>(0.1)', '3') + ' = ' + M.fr('4(' + F2 + ') − ' + F1, '3') + ' = ' + M.res(E.fmtShort(ans, 7))] }], answer: ['<i>Q</i> ≈ ' + E.fmtShort(ans, 7)] }),
    };
  };
  g2.label = 'Extrapolation';
  g2.noExample = true;
  const g3 = () => {
    const ord = R.pick([1, 2]), f = R.pick([2, 4, 10]);
    const ans = 1 / Math.pow(f, ord);
    return {
      type: 'Order of a formula',
      prompt: '<p>A formula has error O(<i>h</i>' + (ord === 2 ? '<sup>2</sup>' : '') + '). If you divide <i>h</i> by ' + f + ', the error is multiplied by about what?</p>',
      fields: [{ label: 'factor =', answer: ans, tol: 1e-9 }],
      board: () => ({ steps: [{ title: 'Error ∝ h' + (ord === 2 ? '²' : ''), lines: ['(1/' + f + ')<sup>' + ord + '</sup> = ' + M.res(E.fmtShort(ans, 6))] }], answer: ['×' + E.fmtShort(ans, 6)] }),
    };
  };
  g3.label = 'Order';
  g3.noExample = true;
  topic.practice = [g1, g2, g3];
  NM.registerTopic(topic);
})(window.NM);
