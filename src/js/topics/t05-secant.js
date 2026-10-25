/* Topic 5 — Secant Method and False Position, Sauer §1.5 */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h, M } = UI;
  const R = UI.rand, RT = NM.roots;
  const n = (x) => M.n(x);
  const nf = (x) => M.nf(x);
  const SECANT = M.v('x', 'i+1') + ' = ' + M.v('x', 'i') + ' − ' + M.fr('<i>f</i>(' + M.v('x', 'i') + ')(' + M.v('x', 'i') + ' − ' + M.v('x', 'i−1') + ')', '<i>f</i>(' + M.v('x', 'i') + ') − <i>f</i>(' + M.v('x', 'i−1') + ')');
  const FALSEPOS = '<i>c</i> = ' + M.fr('<i>b</i>·<i>f</i>(<i>a</i>) − <i>a</i>·<i>f</i>(<i>b</i>)', '<i>f</i>(<i>a</i>) − <i>f</i>(<i>b</i>)');

  /* ---------- written solutions ---------- */
  function secantBoard(fc, res, o) {
    o = o || {};
    const rows = res.rows;
    const detail = Math.min(rows.length, o.detail === undefined ? 4 : o.detail);
    const r0 = rows[0];
    const steps = [
      { title: 'Write the formula', lines: [SECANT, M.v('x', 0) + ' = ' + n(r0.xp) + ', &nbsp; ' + M.v('x', 1) + ' = ' + n(r0.x)], note: o.trig ? 'Calculator in <b>radians</b>.' : null },
      { title: 'Evaluate f at both starting points', lines: ['<i>f</i>(' + n(r0.xp) + ') = ' + E.subHTML(fc.node, n(r0.xp)) + ' = ' + nf(r0.fp), '<i>f</i>(' + n(r0.x) + ') = ' + E.subHTML(fc.node, n(r0.x)) + ' = ' + nf(r0.fx)] },
    ];
    for (let k = 0; k < detail; k++) {
      const r = rows[k];
      if (r.flat) { steps.push({ title: 'Problem', lines: ['<i>f</i>(' + M.v('x', r.i) + ') = <i>f</i>(' + M.v('x', r.i - 1) + ')'], note: 'The secant line is flat and never meets the axis.' }); break; }
      const lines = [M.v('x', r.i + 1) + ' = ' + n(r.x) + ' − ' + M.fr(M.paren(nf(r.fx)) + '(' + n(r.x) + ' − ' + M.paren(n(r.xp)) + ')', M.paren(nf(r.fx)) + ' − ' + M.paren(nf(r.fp))) + ' = ' + M.res(nf(r.next))];
      if (k + 1 < rows.length) lines.push('<i>f</i>(' + n(r.next) + ') = ' + E.subHTML(fc.node, n(r.next)) + ' = ' + nf(rows[k + 1].fx));
      steps.push({ title: 'Iteration ' + (k + 1) + ': use ' + M.v('x', r.i - 1) + ' and ' + M.v('x', r.i), lines, note: 'Next, drop the oldest point (' + M.v('x', r.i - 1) + ').' });
    }
    if (rows.length > detail) {
      steps.push({ title: 'Keep going the same way', table: { head: ['<i>i</i>', M.v('x', 'i−1'), M.v('x', 'i'), '<i>f</i>(' + M.v('x', 'i−1') + ')', '<i>f</i>(' + M.v('x', 'i') + ')', M.v('x', 'i+1')], rows: rows.map((r) => [r.i, nf(r.xp), nf(r.x), nf(r.fp), nf(r.fx), r.next === undefined ? '—' : nf(r.next)]) } });
    }
    return { steps, answer: ['root ≈ ' + M.v('x', rows[rows.length - 1].i + 1) + ' = <b>' + nf(res.last) + '</b>'] };
  }
  function falseBoard(fc, res, o) {
    o = o || {};
    const rows = res.rows;
    const detail = Math.min(rows.length, o.detail === undefined ? 4 : o.detail);
    const r0 = rows[0];
    const steps = [
      { title: 'Check the bracket', lines: ['<i>f</i>(' + n(r0.a) + ') = ' + E.subHTML(fc.node, n(r0.a)) + ' = ' + nf(r0.fa) + ' ' + M.sign(r0.fa), '<i>f</i>(' + n(r0.b) + ') = ' + E.subHTML(fc.node, n(r0.b)) + ' = ' + nf(r0.fb) + ' ' + M.sign(r0.fb)], note: 'Opposite signs, so a root is in between.' },
      { title: 'Formula for the new point', lines: [FALSEPOS] },
    ];
    for (let k = 0; k < detail; k++) {
      const r = rows[k];
      const same = Math.sign(r.fc) === Math.sign(r.fa);
      steps.push({
        title: 'Iteration ' + (k + 1) + ' on [' + n(r.a) + ', ' + n(r.b) + ']',
        lines: [
          '<i>c</i> = ' + M.fr(n(r.b) + '·' + M.paren(nf(r.fa)) + ' − ' + M.paren(n(r.a)) + '·' + M.paren(nf(r.fb)), M.paren(nf(r.fa)) + ' − ' + M.paren(nf(r.fb))) + ' = ' + M.res(nf(r.c)),
          '<i>f</i>(' + n(r.c) + ') = ' + E.subHTML(fc.node, n(r.c)) + ' = ' + nf(r.fc) + ' ' + M.sign(r.fc),
        ],
        note: r.keep === 'exact' ? 'Exactly zero.' : 'Same sign as <i>f</i>(' + (same ? '<i>a</i>' : '<i>b</i>') + '), so <b><i>c</i> replaces ' + (same ? '<i>a</i>' : '<i>b</i>') + '</b>.',
      });
    }
    if (rows.length > detail) {
      steps.push({ title: 'Keep going the same way', table: { head: ['<i>i</i>', '<i>a</i>', '<i>b</i>', '<i>c</i>', '<i>f</i>(<i>c</i>)'], rows: rows.map((r) => [r.i, nf(r.a), nf(r.b), nf(r.c), nf(r.fc) + M.sign(r.fc)]) } });
    }
    return { steps, answer: ['root ≈ <b>' + nf(res.last) + '</b>'] };
  }

  /* ---------- animation ---------- */
  function secantWalk(parent, o) {
    const { fc, res, method } = o;
    const f = fc.f;
    const rows = res.rows;
    const fp = method === 'false';
    const N = rows.length + 2;
    let follow = false;
    const P = (r) => (fp ? [r.a, r.fa, r.b, r.fb, r.c] : [r.xp, r.fp, r.x, r.fx, r.next]);
    const w = UI.walk(parent, {
      title: o.title, n: N, plot: { height: 310 }, onEnd: o.onEnd,
      render(i, w) {
        const r = rows[i - 1];
        let html;
        if (i === 0) html = fp ? '<h4>Bracket + secant line</h4><div class="calcline">' + FALSEPOS + '</div>' : '<h4>Two starting points</h4><div class="calcline">' + SECANT + '</div>';
        else if (i === N - 1) html = '<h4>Result</h4><div class="calcline">root ≈ ' + nf(res.last) + '</div>';
        else if (fp) html = '<h4>Step ' + i + '</h4><div class="calcline"><i>c</i> = ' + nf(r.c) + ', &nbsp;<i>f</i>(<i>c</i>) = ' + nf(r.fc) + ' ' + M.sign(r.fc) + '</div>';
        else if (r.flat) html = '<h4>Problem</h4><p>Flat secant line.</p>';
        else html = '<h4>Step ' + i + '</h4><div class="calcline">' + M.v('x', r.i + 1) + ' = <b>' + nf(r.next) + '</b></div><p>The line through the two newest points crosses the axis there.</p>';
        w.narr.innerHTML = html;
        const shown = i === 0 ? 0 : i === N - 1 ? rows.length : i;
        w.plot.scene = (p) => {
          p.fn(f, { color: 'c1', width: 2.5 });
          for (let j = 0; j < shown; j++) {
            const [x1, y1, x2, y2, nx] = P(rows[j]);
            if (nx === undefined || !isFinite(nx)) break;
            const cur = j === shown - 1 && i !== N - 1;
            p.lineThrough(x1, y1, x2, y2, { color: 'c2', width: cur ? 2.2 : 1.2, alpha: cur ? 1 : 0.3 });
            if (cur) { p.point(x1, y1, { color: 'c2', r: 5 }); p.point(x2, y2, { color: 'c2', r: 5 }); }
          }
          if (shown === 0) { const [x1, y1, x2, y2] = P(rows[0]); p.point(x1, y1, { color: 'c2', r: 5 }); p.point(x2, y2, { color: 'c2', r: 5 }); }
          else { const nx = P(rows[shown - 1])[4]; if (nx !== undefined && isFinite(nx)) p.point(nx, 0, { color: 'c3', r: 6 }); }
        };
        w.plot.legend([{ label: '<i>y</i> = <i>f</i>(<i>x</i>)', color: 'c1' }, { label: 'secant line', color: 'c2' }, { label: 'new point', color: 'c3', dot: true }]);
        if (follow && shown > 0) {
          const [x1, , x2, , nx] = P(rows[shown - 1]);
          const xs = [x1, x2, nx].filter((v) => v !== undefined && isFinite(v));
          const lo = Math.min(...xs), hi = Math.max(...xs), L = Math.max(hi - lo, 1e-9);
          w.plot.fit({ fns: [f], x0: lo - 0.3 * L, x1: hi + 0.3 * L, xpad: 0 });
          w._zoomed = true;
        } else if (!w._fitted || w._zoomed) {
          w._fitted = true; w._zoomed = false;
          const xs = rows.slice(0, 3).flatMap((rr) => P(rr).filter((_, q) => q % 2 === 0)).filter((v) => v !== undefined && isFinite(v) && Math.abs(v) < 1e4);
          RT.fitAround(w.plot, f, xs, { pad: 0.3 });
        } else w.plot.render();
      },
    });
    RT.followToggle(w, false, (v) => { follow = v; w.go(w.i); });
    return w;
  }

  const ex = (title, src, fs, a, b, opt) => {
    const fc = E.compile(fs);
    const fp = opt.method === 'false';
    const res = fp ? E.falsePosition(fc.f, a, b, { steps: opt.steps }) : E.secant(fc.f, a, b, { steps: opt.steps });
    return {
      title, src,
      problem: '<p>Apply the ' + (fp ? 'Method of False Position' : 'Secant Method') + ' to</p><div class="eq"><i>f</i>(<i>x</i>) = ' + fc.html + ', &nbsp; ' + (fp ? 'on [' + a + ', ' + b + ']' : M.v('x', 0) + ' = ' + a + ', ' + M.v('x', 1) + ' = ' + b) + '</div><p>Do ' + opt.steps + ' iterations.</p>' + (opt.trig ? RT.trigNote : ''),
      solve: () => (fp ? falseBoard : secantBoard)(fc, res, { detail: opt.detail, trig: opt.trig }),
      watch: (el) => secantWalk(el, { fc, res, method: opt.method }),
    };
  };

  const topic = {
    id: 'secant', num: 5, unit: 'prelim',
    title: 'The Secant Method', short: 'the secant method',
    book: 'Sauer §1.5', tagline: 'Newton without the derivative: use the line through your last two points.',

    lessons: [
      { title: 'The idea', build(el) {
        el.appendChild(h('p', { class: 'big', html: 'Newton needs <i>f</i>′. Without it, <b>draw a line through your last two points</b> (a secant line) and see where it hits the <i>x</i>-axis.' }));
        el.appendChild(h('div', { class: 'eq', html: SECANT }));
        el.appendChild(h('p', { html: 'It is Newton\'s formula with <i>f</i>′ replaced by the slope between two points. You need <b>two</b> starting guesses, ' + M.v('x', 0) + ' and ' + M.v('x', 1) + '.' }));
      } },
      { title: 'The steps', build(el) {
        el.appendChild(UI.recipe([
          '<b>Start</b> with ' + M.v('x', 0) + ', ' + M.v('x', 1) + '. Compute <i>f</i>(' + M.v('x', 0) + '), <i>f</i>(' + M.v('x', 1) + ').',
          '<b>Apply the formula</b> to get ' + M.v('x', 2) + '.',
          '<b>Slide the window:</b> drop the oldest point. Use ' + M.v('x', 1) + ', ' + M.v('x', 2) + ' to get ' + M.v('x', 3) + ', and so on.',
          '<b>Stop</b> when |' + M.v('x', 'i+1') + ' − ' + M.v('x', 'i') + '| &lt; TOL.',
        ]));
        el.appendChild(UI.callout('idea', 'Same formula, easier to type', '<div class="eq">' + M.v('x', 'i+1') + ' = ' + M.fr(M.v('x', 'i−1') + '·<i>f</i>(' + M.v('x', 'i') + ') − ' + M.v('x', 'i') + '·<i>f</i>(' + M.v('x', 'i−1') + ')', '<i>f</i>(' + M.v('x', 'i') + ') − <i>f</i>(' + M.v('x', 'i−1') + ')') + '</div>'));
      } },
      { title: 'False Position', build(el) {
        el.appendChild(h('p', { html: 'Same secant idea, but it <b>keeps a bracket</b> like bisection, so the root can\'t escape:' }));
        el.appendChild(h('div', { class: 'eq', html: FALSEPOS }));
        el.appendChild(h('p', { html: 'Then <i>c</i> replaces the endpoint with the same sign. Safe, but often <b>slow</b>: one endpoint can get stuck (Book Example 1.17).' }));
        el.appendChild(UI.table(['Method', 'Needs', 'Speed', 'Always works?'], [
          ['Bisection', 'bracket', 'linear (÷2)', 'yes'], ['Fixed-point', '<i>g</i>, ' + M.v('x', 0), 'linear (<i>S</i>)', 'if <i>S</i> &lt; 1'], ['Newton', '<i>f</i>′, ' + M.v('x', 0), 'quadratic', 'if close'], ['Secant', M.v('x', 0) + ', ' + M.v('x', 1), '≈ 1.62', 'if close'], ['False position', 'bracket', 'often slow', 'yes'],
        ], { align: ['l', 'l', 'l', 'l'] }).el);
      } },
      { title: 'Watch it', build(el) {
        el.appendChild(h('p', { class: 'muted', html: 'Each step draws the line through the two newest points.' }));
        const fc = E.compile('x^3 + x - 1');
        secantWalk(el, { title: 'Book Example 1.16: ' + M.v('x', 0) + ' = 0, ' + M.v('x', 1) + ' = 1', fc, res: E.secant(fc.f, 0, 1, { steps: 6 }), method: 'secant' });
      } },
      { title: 'Watch out', build(el) {
        el.appendChild(UI.callout('warn', 'Common mistakes', '<ul><li><b>Dropping the wrong point.</b> Secant always drops the <b>oldest</b>.</li><li><b>Mixing up the order</b> — keep "newest minus older" on top and bottom.</li><li><b>Recomputing f-values</b> you already have — each step needs only one new <i>f</i>.</li></ul>'));
        el.appendChild(UI.callout('calc', 'Calculator trick', '<p>Use <span class="kbd">CALC</span> for each new <i>f</i> value. Store the two newest points in memories A and B and type <span class="kbd">B − f(B)(B − A) ÷ (f(B) − f(A))</span>.</p>'));
      } },
    ],

    examples: [
      ex('x³ + x − 1 with x₀ = 0, x₁ = 1', 'Book Example 1.16', 'x^3 + x - 1', 0, 1, { steps: 6, detail: 3, method: 'secant' }),
      ex('x³ − 2x − 5 with x₀ = 2, x₁ = 3', 'classic', 'x^3 - 2x - 5', 2, 3, { steps: 5, detail: 3, method: 'secant' }),
      ex('cos x = x with x₀ = 0, x₁ = 1', 'radians!', 'cos(x) - x', 0, 1, { steps: 4, detail: 3, method: 'secant', trig: true }),
      ex('False Position: x³ − 2x² + 1.5x on [−1, 1]', 'Book Example 1.17', 'x^3 - 2x^2 + 1.5x', -1, 1, { steps: 4, detail: 3, method: 'false' }),
      ex('False Position: x³ + x − 1 on [0, 1]', 'compare with bisection', 'x^3 + x - 1', 0, 1, { steps: 4, detail: 3, method: 'false' }),
    ],

    solve(el) {
      let method = 'secant';
      const fin = UI.exprInput({ label: '<i>f</i>(<i>x</i>) =', value: 'x^3 + x - 1', prefix: '<i>f</i>(<i>x</i>) = ', wide: true });
      const ain = UI.textInput({ label: '<i>x</i><sub>0</sub>', value: '0' });
      const bin = UI.textInput({ label: '<i>x</i><sub>1</sub>', value: '1' });
      const stop = UI.stopRule({ mode: 'steps', steps: 4, tol: '0.000001' });
      const out = h('div');
      const seg = UI.seg([['secant', 'Secant'], ['false', 'False Position']], 'secant', (v) => {
        method = v;
        ain.el.querySelector('span').innerHTML = v === 'false' ? '<i>a</i> (left end)' : '<i>x</i><sub>0</sub>';
        bin.el.querySelector('span').innerHTML = v === 'false' ? '<i>b</i> (right end)' : '<i>x</i><sub>1</sub>';
        run();
      });
      el.appendChild(h('div', { class: 'card' }, h('div', { class: 'row', style: { marginBottom: '12px' } }, seg),
        h('div', { class: 'form-grid' }, fin.el, ain.el, bin.el, ...stop.els),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Show the solution'))));
      el.appendChild(out);
      function run() {
        out.innerHTML = '';
        const fc = fin.get();
        if (!fc) { out.appendChild(UI.error('I can\'t read f(x) yet.')); return; }
        const a = E.evalNumber(ain.get()), b = E.evalNumber(bin.get());
        if (!isFinite(a) || !isFinite(b)) { out.appendChild(UI.error('Both starting values must be numbers.')); return; }
        if (a === b) { out.appendChild(UI.error('The two starting values must be different.')); return; }
        const sr = stop.read();
        if (sr.error) { out.appendChild(UI.error(sr.error)); return; }
        const res = method === 'false' ? E.falsePosition(fc.f, Math.min(a, b), Math.max(a, b), { steps: sr.steps, tol: sr.tol }) : E.secant(fc.f, a, b, { steps: sr.steps, tol: sr.tol });
        if (res.error) { out.appendChild(UI.error(res.error)); return; }
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Solution' }));
        out.appendChild(paper);
        const trig = /sin|cos|tan/.test(fc.text);
        UI.board(paper, method === 'false' ? falseBoard(fc, res, { detail: 5, trig }) : secantBoard(fc, res, { detail: 5, trig }), { reveal: 'all' });
        UI.watch(paper, (bx) => secantWalk(bx, { fc, res, method }));
      }
      run();
    },
    formulas: '<div class="eq">' + SECANT + '</div><ul><li>Two starts; drop the oldest point each step</li><li>Superlinear, order (1+√5)/2 ≈ 1.62</li><li>False position: ' + FALSEPOS + ', keep the bracket</li></ul>',
  };

  /* ---------- practice ---------- */
  const g1 = () => {
    const it = R.pick(RT.newtonBank);
    const fc = E.compile(it.f);
    const res = E.secant(fc.f, it.x0, it.x1, { steps: 2 });
    return {
      type: 'Two secant steps',
      prompt: '<p>Apply the Secant Method to <span class="math"><i>f</i>(<i>x</i>) = ' + fc.html + '</span> with ' + M.v('x', 0) + ' = ' + it.x0 + ', ' + M.v('x', 1) + ' = ' + it.x1 + '. Find ' + M.v('x', 2) + ' and ' + M.v('x', 3) + '.</p>' + (it.trig ? RT.trigNote : ''),
      fields: [{ label: M.v('x', 2) + ' =', answer: res.rows[0].next }, { label: M.v('x', 3) + ' =', answer: res.rows[1].next }],
      hint: '<p><i>f</i>(' + it.x0 + ') = ' + E.fmtShort(fc.f(it.x0), 6) + ', <i>f</i>(' + it.x1 + ') = ' + E.fmtShort(fc.f(it.x1), 6) + '. For ' + M.v('x', 3) + ', use ' + M.v('x', 1) + ' and ' + M.v('x', 2) + '.</p>',
      board: () => secantBoard(fc, res, { detail: 2, trig: it.trig }),
      solution: (box) => secantWalk(box, { fc, res, method: 'secant' }),
    };
  };
  g1.label = 'Iterate';
  const g2 = () => {
    const it = R.pick(RT.bank.filter((b) => !b.trig));
    const fc = E.compile(it.f);
    const res = E.falsePosition(fc.f, it.a, it.b, { steps: 2 });
    return {
      type: 'False Position',
      prompt: '<p>Apply 2 steps of False Position to <span class="math"><i>f</i>(<i>x</i>) = ' + fc.html + '</span> on [' + it.a + ', ' + it.b + ']. Give the first two points <i>c</i>.</p>',
      fields: [{ label: 'first <i>c</i> =', answer: res.rows[0].c }, { label: 'second <i>c</i> =', answer: res.rows[1].c }],
      hint: '<p>' + FALSEPOS + '. Then <i>c</i> replaces the endpoint with the same sign.</p>',
      board: () => falseBoard(fc, res, { detail: 2 }),
      solution: (box) => secantWalk(box, { fc, res, method: 'false' }),
    };
  };
  g2.label = 'False position';
  const g3 = () => ({
    type: 'Which point goes?',
    prompt: '<p>In the <b>Secant Method</b>, after computing ' + M.v('x', 'i+1') + ', which two points are used next?</p>',
    choices: { options: ['Drop the <b>oldest</b> point; use the two newest', 'Keep whichever old point has the opposite sign of the new one', 'Always keep ' + M.v('x', 0), 'Average the two old points'], correct: 0 },
    hint: '<p>Secant is a "sliding window" of the two newest points.</p>',
    board: () => ({ steps: [{ title: 'Secant', lines: ['use ' + M.v('x', 'i') + ' and ' + M.v('x', 'i+1') + ' (drop ' + M.v('x', 'i−1') + ')'] }, { title: 'Don\'t confuse with False Position', lines: ['False Position keeps the endpoint with the opposite sign'] }], answer: ['Drop the oldest point.'] }),
  });
  g3.label = 'Concept';
  g3.noExample = true;
  topic.practice = [g1, g2, g3];
  NM.registerTopic(topic);
})(window.NM);
