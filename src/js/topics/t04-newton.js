/* Topic 4 — Newton's Method, Sauer §1.4 */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h, M } = UI;
  const R = UI.rand, RT = NM.roots;
  const n = (x) => M.n(x);
  const nf = (x) => M.nf(x);
  const NEWTON = M.v('x', 'i+1') + ' = ' + M.v('x', 'i') + ' − ' + M.fr('<i>f</i>(' + M.v('x', 'i') + ')', '<i>f</i>′(' + M.v('x', 'i') + ')');

  /* ---------- written solution ---------- */
  function newtonBoard(fc, dc, res, o) {
    o = o || {};
    const rows = res.rows;
    const detail = Math.min(rows.length, o.detail === undefined ? 4 : o.detail);
    const steps = [
      { title: 'Find the derivative', lines: ['<i>f</i>(<i>x</i>) = ' + fc.html, '<i>f</i>′(<i>x</i>) = ' + M.res(dc.html)], note: o.trig ? 'Calculator in <b>radians</b>.' : null },
      { title: 'Write Newton\'s formula', lines: [NEWTON, M.v('x', 0) + ' = ' + n(rows[0].x)] },
    ];
    for (let k = 0; k < detail; k++) {
      const r = rows[k];
      if (r.zeroSlope) { steps.push({ title: 'Iteration ' + (k + 1) + ': problem', lines: ['<i>f</i>′(' + n(r.x) + ') = 0'], note: 'A flat tangent never meets the <i>x</i>-axis. Pick another starting point.' }); break; }
      steps.push({
        title: 'Iteration ' + (k + 1) + ': find ' + M.v('x', k + 1),
        lines: [
          '<i>f</i>(' + n(r.x) + ') = ' + E.subHTML(fc.node, n(r.x)) + ' = ' + nf(r.fx),
          '<i>f</i>′(' + n(r.x) + ') = ' + E.subHTML(dc.node, n(r.x)) + ' = ' + nf(r.dfx),
          M.v('x', k + 1) + ' = ' + n(r.x) + ' − ' + M.fr(M.paren(nf(r.fx)), M.paren(nf(r.dfx))) + ' = ' + M.res(nf(r.next)),
        ],
        note: 'Change: |' + M.v('x', k + 1) + ' − ' + M.v('x', k) + '| = ' + E.fmtE(r.diff, 3),
      });
    }
    if (rows.length > detail) {
      steps.push({
        title: 'Keep going the same way',
        table: { head: ['<i>i</i>', M.v('x', 'i'), '<i>f</i>(' + M.v('x', 'i') + ')', '<i>f</i>′(' + M.v('x', 'i') + ')', M.v('x', 'i+1')], rows: rows.map((r) => [r.i, nf(r.x), nf(r.fx), nf(r.dfx), r.next === undefined ? '—' : nf(r.next)]) },
        note: 'Once close, the number of correct digits roughly doubles each step (quadratic convergence).',
      });
    }
    const last = rows[rows.length - 1];
    return {
      steps,
      answer: res.stop === 'zeroSlope' ? ['Newton stops: <i>f</i>′ = 0 at ' + n(last.x)] : res.stop === 'blowup' ? ['The iterates run away — choose a better ' + M.v('x', 0) + '.']
        : ['root ≈ ' + M.v('x', rows.length) + ' = <b>' + nf(res.last) + '</b>', '<span class="small">check: <i>f</i>(' + n(res.last) + ') = ' + E.fmtE(fc.f(res.last), 3) + '</span>'],
    };
  }

  /* ---------- animation ---------- */
  function newtonWalk(parent, o) {
    const { fc, res } = o;
    const f = fc.f;
    const rows = res.rows;
    const N = rows.length + 2;
    let follow = false;
    const table = UI.table(['<i>i</i>', M.v('x', 'i'), '<i>f</i>(' + M.v('x', 'i') + ')', '<i>f</i>′(' + M.v('x', 'i') + ')', M.v('x', 'i+1')],
      rows.map((r) => [r.i, nf(r.x), nf(r.fx), nf(r.dfx), r.next === undefined ? '—' : nf(r.next)]));
    const w = UI.walk(parent, {
      title: o.title, n: N, plot: { height: 310 }, onEnd: o.onEnd,
      render(i, w) {
        const k = i - 1, r = rows[k];
        let html;
        if (i === 0) html = '<h4>Start at ' + M.v('x', 0) + ' = ' + n(rows[0].x) + '</h4><div class="calcline">' + NEWTON + '</div><p>Draw the tangent there and slide down it to the <i>x</i>-axis.</p>';
        else if (i === N - 1) html = '<h4>Result</h4><div class="calcline">root ≈ ' + nf(res.last) + '</div>';
        else if (r.zeroSlope) html = '<h4>Problem</h4><p><i>f</i>′ = 0: the tangent is flat.</p>';
        else html = '<h4>Step ' + i + '</h4><div class="calcline">' + M.v('x', r.i + 1) + ' = ' + n(r.x) + ' − ' + M.fr(M.paren(nf(r.fx)), M.paren(nf(r.dfx))) + ' = <b>' + nf(r.next) + '</b></div><p>The orange tangent crosses the axis at ' + M.v('x', r.i + 1) + '.</p>';
        w.narr.innerHTML = html;
        table.focus(k, true);
        const shown = i === 0 ? 0 : i === N - 1 ? rows.length : i;
        w.plot.scene = (p) => {
          p.fn(f, { color: 'c1', width: 2.5 });
          for (let j = 0; j < shown; j++) {
            const rr = rows[j];
            if (rr.next === undefined) break;
            const cur = j === shown - 1 && i !== N - 1;
            p.lineThrough(rr.x, rr.fx, rr.next, 0, { color: 'c2', width: cur ? 2.2 : 1.2, alpha: cur ? 1 : 0.35 });
            p.line(rr.x, 0, rr.x, rr.fx, { color: 'plot-axis', dash: [3, 4], width: 1.2 });
            p.point(rr.x, rr.fx, { color: 'c2', r: cur ? 6 : 4 });
          }
          const at = shown === 0 ? rows[0].x : rows[shown - 1].next;
          if (at !== undefined && isFinite(at)) { p.point(at, 0, { color: 'c3', r: 6 }); p.xmark(at, 'x' + E.subDigits(shown), { color: 'c3' }); }
        };
        w.plot.legend([{ label: '<i>y</i> = <i>f</i>(<i>x</i>)', color: 'c1' }, { label: 'tangent line', color: 'c2' }, { label: 'next guess', color: 'c3', dot: true }]);
        if (follow && shown > 0 && rows[shown - 1].next !== undefined) {
          const rr = rows[shown - 1];
          const L = Math.max(Math.abs(rr.next - rr.x), 1e-9) * 1.4, c = (rr.x + rr.next) / 2;
          w.plot.fit({ fns: [f], x0: c - L, x1: c + L, xpad: 0 });
          w._zoomed = true;
        } else if (!w._fitted || w._zoomed) {
          w._fitted = true; w._zoomed = false;
          const xs = rows.slice(0, Math.min(rows.length, 4)).flatMap((rr) => [rr.x, rr.next]).filter((v) => v !== undefined && isFinite(v) && Math.abs(v) < 1e4);
          RT.fitAround(w.plot, f, xs.length ? xs : [rows[0].x], { pad: 0.3 });
        } else w.plot.render();
      },
    });
    RT.followToggle(w, false, (v) => { follow = v; w.go(w.i); });
    w.extra.appendChild(table.el);
    return w;
  }

  const ex = (title, src, fs, x0, opt) => {
    const fc = E.compile(fs), dc = E.derivative(fc.node);
    const res = E.newton(fc.f, dc.f, x0, { steps: opt.steps });
    return {
      title, src,
      problem: '<p>Apply Newton\'s Method to</p><div class="eq"><i>f</i>(<i>x</i>) = ' + fc.html + ', &nbsp; ' + M.v('x', 0) + ' = ' + x0 + '</div><p>Do ' + opt.steps + ' iterations.</p>' + (opt.trig ? RT.trigNote : ''),
      solve: () => newtonBoard(fc, dc, res, { detail: opt.detail, trig: opt.trig }),
      watch: (el) => newtonWalk(el, { fc, res }),
    };
  };

  const topic = {
    id: 'newton', num: 4, unit: 'prelim',
    title: 'Newton\'s Method', short: 'Newton\'s method',
    book: 'Sauer §1.4', tagline: 'Follow the tangent line down to the x-axis. Fast: correct digits double every step.',

    lessons: [
      { title: 'The idea', build(el) {
        el.appendChild(h('p', { class: 'big', html: 'At your guess, draw the <b>tangent line</b>. Where it hits the <i>x</i>-axis is your next guess. Repeat.' }));
        el.appendChild(h('div', { class: 'eq', html: NEWTON }));
        el.appendChild(h('p', { html: 'Where it comes from: the tangent at ' + M.v('x', 'i') + ' is <i>y</i> − <i>f</i>(' + M.v('x', 'i') + ') = <i>f</i>′(' + M.v('x', 'i') + ')(<i>x</i> − ' + M.v('x', 'i') + '). Set <i>y</i> = 0 and solve for <i>x</i>.' }));
      } },
      { title: 'The steps', build(el) {
        el.appendChild(UI.recipe([
          '<b>Differentiate:</b> find <i>f</i>′(<i>x</i>). Double-check it — most mistakes happen here.',
          '<b>Write the formula</b> ' + M.v('x', 'i+1') + ' = ' + M.v('x', 'i') + ' − <i>f</i>(' + M.v('x', 'i') + ')/<i>f</i>′(' + M.v('x', 'i') + ').',
          '<b>Plug in ' + M.v('x', 0) + '</b> to get ' + M.v('x', 1) + ', then ' + M.v('x', 1) + ' to get ' + M.v('x', 2) + ', …',
          '<b>Stop</b> when |' + M.v('x', 'i+1') + ' − ' + M.v('x', 'i') + '| &lt; TOL or after the steps asked.',
        ]));
        el.appendChild(UI.callout('idea', 'Shortcut for square roots', '<p>For √<i>A</i>, use <i>f</i>(<i>x</i>) = <i>x</i><sup>2</sup> − <i>A</i>. Newton becomes ' + M.v('x', 'i+1') + ' = (' + M.v('x', 'i') + ' + <i>A</i>/' + M.v('x', 'i') + ')/2.</p>'));
      } },
      { title: 'How fast? When does it fail?', build(el) {
        el.appendChild(h('div', { class: 'eq', html: M.v('e', 'i+1') + ' ≈ <i>M</i>·' + M.v('e', 'i') + '<sup>2</sup>, &nbsp; <i>M</i> = ' + M.fr('|<i>f</i>″(<i>r</i>)|', '2|<i>f</i>′(<i>r</i>)|') }));
        el.appendChild(h('p', { html: '<b>Quadratic convergence:</b> squaring a small error makes it much smaller, so correct digits roughly <b>double</b> each step.' }));
        el.appendChild(h('ul', null,
          h('li', { html: '<b><i>f</i>′(' + M.v('x', 'i') + ') = 0</b> → flat tangent, division by zero.' }),
          h('li', { html: '<b>Bad start</b> → it can jump away or bounce forever.' }),
          h('li', { html: '<b>Multiple root</b> (<i>f</i>′(<i>r</i>) = 0 too) → only linear, with <i>S</i> = (<i>m</i> − 1)/<i>m</i>. Fix: multiply the step by <i>m</i>.' })));
      } },
      { title: 'Watch it', build(el) {
        el.appendChild(h('p', { class: 'muted', html: 'Press <b>Next</b> for each tangent line.' }));
        const fc = E.compile('x^3 + x - 1'), d = E.derivative(fc.node);
        newtonWalk(el, { title: 'Book Example 1.11: <i>x</i><sup>3</sup> + <i>x</i> − 1, ' + M.v('x', 0) + ' = −0.7', fc, res: E.newton(fc.f, d.f, -0.7, { steps: 6 }) });
      } },
      { title: 'Watch out', build(el) {
        el.appendChild(UI.callout('warn', 'Common mistakes', '<ul><li><b>Wrong derivative</b> — the #1 error.</li><li><b>Forgetting the minus</b> or flipping the fraction to <i>f</i>′/<i>f</i>.</li><li><b>Degree mode</b> with trig.</li><li><b>Rounding between steps</b> — use Ans.</li></ul>'));
        el.appendChild(UI.callout('calc', 'Calculator trick', '<p>Type ' + M.v('x', 0) + ', press <span class="kbd">=</span>. Then type the formula with <b>Ans</b> for <i>x</i>: <span class="kbd">Ans − (Ans³ + Ans − 1) ÷ (3Ans² + 1)</span>. Each <span class="kbd">=</span> is one Newton step. Check <i>f</i>′ with <span class="kbd">d/dx</span>.</p>'));
      } },
    ],

    examples: [
      ex('x³ + x − 1, starting at −0.7', 'Book Example 1.11', 'x^3 + x - 1', -0.7, { steps: 6, detail: 3 }),
      ex('√2 with Newton', 'square-root shortcut', 'x^2 - 2', 1, { steps: 4, detail: 4 }),
      ex('cos x = x', 'radians!', 'cos(x) - x', 1, { steps: 3, detail: 3, trig: true }),
      ex('x³ − 2x − 5 = 0', 'classic', 'x^3 - 2x - 5', 2, { steps: 4, detail: 3 }),
      ex('eˣ = 3 (so x = ln 3)', '', 'e^x - 3', 1, { steps: 4, detail: 3 }),
    ],

    solve(el) {
      let manualDf = false;
      let dfin = null;
      const fin = UI.exprInput({ label: '<i>f</i>(<i>x</i>) =', value: 'x^3 + x - 1', prefix: '<i>f</i>(<i>x</i>) = ', wide: true, onChange: (c) => { if (dfin && !manualDf && c && c.ok) { try { dfin.set(E.derivative(c.node).text); } catch (e) { /* keep */ } } } });
      dfin = UI.exprInput({ label: '<i>f</i>′(<i>x</i>) = <span class="muted small">(filled in for you — check it)</span>', value: '3*x^2 + 1', prefix: '<i>f</i>′(<i>x</i>) = ', wide: true });
      dfin.input.addEventListener('input', () => { manualDf = true; });
      const xin = UI.textInput({ label: 'Start <i>x</i><sub>0</sub>', value: '-0.7' });
      const stop = UI.stopRule({ mode: 'steps', steps: 4, tol: '0.000001' });
      const out = h('div');
      el.appendChild(h('div', { class: 'card' },
        h('div', { class: 'form-grid' }, fin.el, dfin.el, xin.el, ...stop.els),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Show the solution'),
          h('button', { class: 'btn', type: 'button', onclick: () => { manualDf = false; const c = fin.get(); if (c) dfin.set(E.derivative(c.node).text); } }, 'Recompute f′ for me'))));
      el.appendChild(out);
      function run() {
        out.innerHTML = '';
        const fc = fin.get(), dc = dfin.get();
        if (!fc) { out.appendChild(UI.error('I can\'t read f(x) yet.')); return; }
        if (!dc) { out.appendChild(UI.error('I can\'t read f′(x) yet.')); return; }
        const x0 = E.evalNumber(xin.get());
        if (!isFinite(x0)) { out.appendChild(UI.error('x₀ must be a number.')); return; }
        const sr = stop.read();
        if (sr.error) { out.appendChild(UI.error(sr.error)); return; }
        try {
          const auto = E.derivative(fc.node);
          const pts = [x0, x0 + 0.37, x0 - 0.61, 1.3];
          if (pts.some((t) => isFinite(auto.f(t)) && Math.abs(auto.f(t) - dc.f(t)) > 1e-6 * Math.max(1, Math.abs(auto.f(t))))) out.appendChild(UI.callout('warn', 'Check your derivative', '<p>Your <i>f</i>′(<i>x</i>) does not match the derivative of <i>f</i>(<i>x</i>). I would use: <span class="math">' + auto.html + '</span></p>'));
        } catch (e) { /* no check */ }
        const res = E.newton(fc.f, dc.f, x0, { steps: sr.steps, tol: sr.tol });
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Solution' }));
        out.appendChild(paper);
        UI.board(paper, newtonBoard(fc, dc, res, { detail: 5, trig: /sin|cos|tan/.test(fc.text) }), { reveal: 'all' });
        UI.watch(paper, (b) => newtonWalk(b, { fc, res }));
      }
      run();
    },
    formulas: '<div class="eq">' + NEWTON + '</div><ul><li>Quadratic: ' + M.v('e', 'i+1') + ' ≈ <i>M</i>' + M.v('e', 'i') + '<sup>2</sup>, <i>M</i> = |<i>f</i>″(<i>r</i>)/(2<i>f</i>′(<i>r</i>))|</li><li>Multiplicity <i>m</i>: linear, <i>S</i> = (<i>m</i>−1)/<i>m</i>; fix: ' + M.v('x', 'i+1') + ' = ' + M.v('x', 'i') + ' − <i>m f</i>/<i>f</i>′</li><li>√<i>A</i>: ' + M.v('x', 'i+1') + ' = (' + M.v('x', 'i') + ' + <i>A</i>/' + M.v('x', 'i') + ')/2</li></ul>',
  };

  /* ---------- practice ---------- */
  const g1 = () => {
    const it = R.pick(RT.newtonBank);
    const fc = E.compile(it.f), d = E.derivative(fc.node);
    const res = E.newton(fc.f, d.f, it.x0, { steps: 2 });
    return {
      type: 'Two Newton steps',
      prompt: '<p>Apply Newton\'s Method to <span class="math"><i>f</i>(<i>x</i>) = ' + fc.html + '</span> with ' + M.v('x', 0) + ' = ' + it.x0 + '. Find ' + M.v('x', 1) + ' and ' + M.v('x', 2) + '.</p>' + (it.trig ? RT.trigNote : ''),
      fields: [{ label: M.v('x', 1) + ' =', answer: res.rows[0].next }, { label: M.v('x', 2) + ' =', answer: res.rows[1].next }],
      hint: '<p><i>f</i>′(<i>x</i>) = <span class="math">' + d.html + '</span>.</p>',
      board: () => newtonBoard(fc, d, res, { detail: 2, trig: it.trig }),
      solution: (box) => newtonWalk(box, { fc, res }),
    };
  };
  g1.label = 'Iterate';
  const g2 = () => {
    const it = R.pick(RT.newtonBank.filter((x) => !x.trig));
    const fc = E.compile(it.f), d = E.derivative(fc.node);
    const res = E.newton(fc.f, d.f, it.x0, { steps: 2 });
    const rows = res.rows.map((r) => [r.i, r.i === 0 ? E.fmtShort(r.x, 6) : { answer: r.x }, { answer: r.fx }, { answer: r.dfx }, { answer: r.next }]);
    return {
      type: 'Newton table',
      prompt: '<p>Fill the table for Newton\'s Method on <span class="math"><i>f</i>(<i>x</i>) = ' + fc.html + '</span>, starting at ' + M.v('x', 0) + ' = ' + it.x0 + '.</p>',
      build: UI.drillTable(['<i>i</i>', M.v('x', 'i'), '<i>f</i>(' + M.v('x', 'i') + ')', '<i>f</i>′(' + M.v('x', 'i') + ')', M.v('x', 'i+1')], rows),
      hint: '<p><i>f</i>′(<i>x</i>) = <span class="math">' + d.html + '</span>. The last column of one row is the first column of the next.</p>',
      board: () => newtonBoard(fc, d, res, { detail: 2 }),
      solution: (box) => newtonWalk(box, { fc, res }),
    };
  };
  g2.label = 'Fill the table';
  const g3 = () => {
    const A = R.pick([2, 3, 5, 6, 7, 10, 11, 13, 17]);
    const x0 = Math.max(1, Math.round(Math.sqrt(A)));
    const fc = E.compile('x^2 - ' + A), d = E.derivative(fc.node);
    const res = E.newton(fc.f, d.f, x0, { steps: 3 });
    return {
      type: 'Square root by Newton',
      prompt: '<p>Approximate √' + A + ' with Newton\'s Method on <i>f</i>(<i>x</i>) = <i>x</i><sup>2</sup> − ' + A + ', from ' + M.v('x', 0) + ' = ' + x0 + '. Give ' + M.v('x', 1) + ', ' + M.v('x', 2) + ', ' + M.v('x', 3) + '.</p>',
      fields: [0, 1, 2].map((k) => ({ label: M.v('x', k + 1) + ' =', answer: res.rows[k].next })),
      hint: '<p>For <i>x</i><sup>2</sup> − <i>A</i>: ' + M.v('x', 'i+1') + ' = (' + M.v('x', 'i') + ' + <i>A</i>/' + M.v('x', 'i') + ')/2.</p>',
      board: () => newtonBoard(fc, d, res, { detail: 3 }),
      solution: (box) => newtonWalk(box, { fc, res }),
    };
  };
  g3.label = 'Square roots';
  const g4 = () => {
    const m = R.int(2, 5);
    const S = (m - 1) / m;
    const r = R.pick([0, 1, 2, -1]);
    const fac = r === 0 ? '<i>x</i>' : '(<i>x</i> ' + (r < 0 ? '+ ' + -r : '− ' + r) + ')';
    return {
      type: 'Multiple roots',
      prompt: '<p>Newton\'s Method is applied to <span class="math"><i>f</i>(<i>x</i>) = ' + fac + '<sup>' + m + '</sup></span>. It converges to <i>r</i> = ' + r + ' only linearly. What is the rate <i>S</i>? What <i>m</i> makes ' + M.v('x', 'i+1') + ' = ' + M.v('x', 'i') + ' − <i>m</i>·<i>f</i>/<i>f</i>′ fast again?</p>',
      fields: [{ label: '<i>S</i> =', answer: S }, { label: '<i>m</i> =', answer: m, tol: 0 }],
      hint: '<p>Multiplicity <i>m</i> → linear convergence with <i>S</i> = (<i>m</i> − 1)/<i>m</i>.</p>',
      board: () => ({ steps: [{ title: 'Find the multiplicity', lines: ['the factor is raised to the power ' + m + ' → <i>m</i> = ' + m] }, { title: 'Rate of linear convergence', lines: ['<i>S</i> = ' + M.fr('<i>m</i> − 1', '<i>m</i>') + ' = ' + M.fr(String(m - 1), String(m)) + ' = ' + M.res(E.fmtShort(S, 4))] }, { title: 'Fix', lines: [M.v('x', 'i+1') + ' = ' + M.v('x', 'i') + ' − ' + m + '·' + M.fr('<i>f</i>(' + M.v('x', 'i') + ')', '<i>f</i>′(' + M.v('x', 'i') + ')')] }], answer: ['<i>S</i> = ' + E.fmtShort(S, 4) + ', &nbsp;<i>m</i> = ' + m] }),
    };
  };
  g4.label = 'Multiple roots';
  g4.noExample = true;
  const g5 = () => {
    const Mv = R.pick([0.5, 0.85, 1, 2, 3]);
    const e = R.pick([0.01, 0.001, 0.02, 0.005]);
    const ans = Mv * e * e;
    return {
      type: 'Quadratic convergence',
      prompt: '<p>Newton converges with ' + M.v('e', 'i+1') + ' ≈ <i>M</i>·' + M.v('e', 'i') + '<sup>2</sup>, <i>M</i> = ' + Mv + '. If ' + M.v('e', 3) + ' = ' + e + ', estimate ' + M.v('e', 4) + '.</p>',
      fields: [{ label: M.v('e', 4) + ' ≈', answer: ans, tol: ans * 1e-2 }],
      hint: '<p>Square the error, then multiply by <i>M</i>.</p>',
      board: () => ({ steps: [{ title: 'Square, then multiply by M', lines: [M.v('e', 4) + ' ≈ ' + Mv + ' × (' + e + ')<sup>2</sup> = ' + M.res(E.fmtShort(ans, 10))] }], answer: [M.v('e', 4) + ' ≈ ' + E.fmtShort(ans, 10)] }),
    };
  };
  g5.label = 'Error estimate';
  g5.noExample = true;
  topic.practice = [g1, g2, g3, g4, g5];
  topic.walkFor = newtonWalk;
  NM.registerTopic(topic);
})(window.NM);
