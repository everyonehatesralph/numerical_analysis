/* Topic 2 — The Bisection Method, Sauer §1.1 */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h, M } = UI;
  const R = UI.rand, RT = NM.roots;
  const n = (x) => M.n(x);
  const nf = (x) => M.nf(x);
  const signWord = (v) => (v > 0 ? 'positive' : v < 0 ? 'negative' : 'zero');

  function summaryTable(rows) {
    return {
      head: ['<i>i</i>', M.v('a', 'i'), '<i>f</i>(' + M.v('a', 'i') + ')', M.v('c', 'i'), '<i>f</i>(' + M.v('c', 'i') + ')', M.v('b', 'i'), '<i>f</i>(' + M.v('b', 'i') + ')'],
      rows: rows.map((r) => [r.i, n(r.a), M.sign(r.fa), n(r.c), nf(r.fc) + M.sign(r.fc), n(r.b), M.sign(r.fb)]),
    };
  }

  /* ---------- written solution ---------- */
  function bisectBoard(fc, res, o) {
    o = o || {};
    const rows = res.rows;
    const detail = Math.min(rows.length, o.detail === undefined ? 4 : o.detail);
    const steps = [];
    if (res.exactAt) return {
      steps: [{ title: 'An endpoint is already a root', lines: ['<i>f</i>(' + n(res.root) + ') = 0'], note: 'No bisection steps are needed.' }],
      answer: ['root = ' + nf(res.root) + ' (exact)'],
    };
    steps.push({
      title: 'Check that a root is trapped in [' + n(res.a0) + ', ' + n(res.b0) + ']',
      lines: [
        '<i>f</i>(' + n(res.a0) + ') = ' + E.subHTML(fc.node, n(res.a0)) + ' = ' + nf(res.fa0) + ' ' + M.sign(res.fa0),
        '<i>f</i>(' + n(res.b0) + ') = ' + E.subHTML(fc.node, n(res.b0)) + ' = ' + nf(res.fb0) + ' ' + M.sign(res.fb0),
      ],
      note: 'The signs are different, so <i>f</i>(<i>a</i>)<i>f</i>(<i>b</i>) &lt; 0 and a root is between them.' + (o.trig ? ' Calculator in <b>radians</b>.' : ''),
    });
    if (o.tol !== undefined) {
      const L = res.b0 - res.a0;
      const need = E.bisectionStepsFor(L, o.tol);
      steps.push({
        title: 'How many steps are needed?',
        text: 'The error after <i>n</i> steps is less than (<i>b</i> − <i>a</i>)/2<sup><i>n</i>+1</sup>. Make that smaller than ' + (o.places ? '0.5 × 10<sup>−' + o.places + '</sup> (' + o.places + ' correct decimal places)' : 'TOL = ' + E.fmtE(o.tol, 3)) + ':',
        lines: [
          M.fr(n(L), '2<sup><i>n</i>+1</sup>') + ' &lt; ' + E.fmtE(o.tol, 3) + ' &nbsp;⟹&nbsp; <i>n</i> &gt; log<sub>2</sub>(' + M.fr(n(L), E.fmtE(o.tol, 3)) + ') − 1 = ' + E.fmtShort(Math.log2(L / o.tol) - 1, 3),
          '<i>n</i> = ' + M.res(String(need)) + ' steps',
        ],
      });
    }
    for (let k = 0; k < detail; k++) {
      const r = rows[k];
      const same = Math.sign(r.fc) === Math.sign(r.fa);
      steps.push({
        title: 'Iteration <i>i</i> = ' + r.i,
        lines: [
          M.v('c', r.i) + ' = ' + M.fr(M.v('a', r.i) + ' + ' + M.v('b', r.i), '2') + ' = ' + M.fr(n(r.a) + ' + ' + M.paren(n(r.b)), '2') + ' = ' + M.res(n(r.c)),
          '<i>f</i>(' + n(r.c) + ') = ' + E.subHTML(fc.node, n(r.c)) + ' = ' + nf(r.fc) + ' ' + M.sign(r.fc),
        ].concat(r.keep === 'exact' ? [] : ['[' + M.v('a', r.i + 1) + ', ' + M.v('b', r.i + 1) + '] = [' + n(r.na) + ', ' + n(r.nb) + ']']),
        note: r.keep === 'exact' ? '<i>f</i>(<i>c</i>) is exactly 0 — the midpoint is the root.'
          : '<i>f</i>(<i>c</i>) is ' + signWord(r.fc) + ', the same sign as <i>f</i>(' + (same ? '<i>a</i>' : '<i>b</i>') + '), so <b><i>c</i> replaces ' + (same ? '<i>a</i>' : '<i>b</i>') + '</b>.',
      });
    }
    if (rows.length > detail) {
      steps.push({ title: 'Keep going the same way — the full table', text: 'Every row uses the same three moves: midpoint, sign of <i>f</i>(<i>c</i>), replace the endpoint with the same sign.', table: summaryTable(rows) });
    } else if (rows.length > 1) {
      steps.push({ title: 'Put it in a table (for your paper)', table: summaryTable(rows) });
    }
    const last = rows[rows.length - 1];
    const bound = (res.b0 - res.a0) / Math.pow(2, rows.length + 1);
    return {
      steps,
      answer: res.exact ? ['root = ' + nf(last.c) + ' (exact)'] : [
        'root ≈ ' + M.fr(n(res.finalA) + ' + ' + n(res.finalB), '2') + ' = <b>' + nf(res.root) + '</b>',
        '<span class="small">error ≤ ' + E.fmtE(res.errBound, 3) + (last ? ' &nbsp;·&nbsp; last midpoint ' + M.v('c', last.i) + ' = ' + nf(last.c) : ' · the initial interval already meets the tolerance') + '</span>',
      ],
    };
  }

  /* ---------- animation ---------- */
  function bisectWalk(parent, o) {
    const { fc, res } = o;
    if (!res.rows.length) { parent.appendChild(UI.callout('idea', res.exactAt ? 'Endpoint root' : 'No further steps needed', '<p>root ≈ ' + nf(res.root) + '</p>')); return; }
    const f = fc.f;
    const rows = res.rows;
    const N = rows.length + 2;
    let follow = false;
    const table = UI.table(
      ['<i>i</i>', M.v('a', 'i'), '<i>f</i>(' + M.v('a', 'i') + ')', M.v('c', 'i'), '<i>f</i>(' + M.v('c', 'i') + ')', M.v('b', 'i'), '<i>f</i>(' + M.v('b', 'i') + ')'],
      rows.map((r) => [r.i, nf(r.a), M.sign(r.fa), nf(r.c), nf(r.fc) + M.sign(r.fc), nf(r.b), M.sign(r.fb)]));
    const w = UI.walk(parent, {
      title: o.title, n: N, plot: { height: 300 }, onEnd: o.onEnd,
      render(i, w) {
        const k = i - 1;
        const r = rows[k];
        let html;
        if (i === 0) html = '<h4>Check the signs</h4><div class="calcline"><i>f</i>(' + n(res.a0) + ') = ' + n(res.fa0) + ' ' + M.sign(res.fa0) + '<br><i>f</i>(' + n(res.b0) + ') = ' + n(res.fb0) + ' ' + M.sign(res.fb0) + '</div><p>Different signs → the root is trapped.</p>';
        else if (i === N - 1) html = '<h4>Finished after ' + rows.length + ' steps</h4><div class="calcline">root ≈ ' + nf(res.root) + '</div>';
        else {
          const same = Math.sign(r.fc) === Math.sign(r.fa);
          html = '<h4>Iteration ' + r.i + '</h4><div class="calcline">' + M.v('c', r.i) + ' = (' + n(r.a) + ' + ' + n(r.b) + ')/2 = ' + n(r.c) + '<br><i>f</i>(<i>c</i>) = ' + nf(r.fc) + ' ' + M.sign(r.fc) + '</div>' +
            (r.keep === 'exact' ? '<p>Exactly zero!</p>' : '<p><i>c</i> replaces <b>' + (same ? '<i>a</i>' : '<i>b</i>') + '</b> → [' + n(r.na) + ', ' + n(r.nb) + ']</p>');
        }
        w.narr.innerHTML = html;
        table.focus(k, true);
        const cur = r || null;
        const A = i === 0 ? res.a0 : i === N - 1 ? res.finalA : r.a;
        const B = i === 0 ? res.b0 : i === N - 1 ? res.finalB : r.b;
        w.plot.scene = (p) => {
          p.band(A, B, { color: 'c1', alpha: 0.13 });
          p.fn(f, { color: 'c1', width: 2.5 });
          const shown = i === N - 1 ? rows.length : Math.max(0, k + 1);
          for (let j = 0; j < shown; j++) {
            const yy = p.invY(p.H - 10 - j * 7);
            p.line(rows[j].a, yy, rows[j].b, yy, { color: 'c1', width: 3, alpha: 0.25 + 0.6 * ((j + 1) / Math.max(1, shown)) });
          }
          p.point(A, f(A), { color: f(A) > 0 ? 'c6' : 'c1', r: 6 });
          p.point(B, f(B), { color: f(B) > 0 ? 'c6' : 'c1', r: 6 });
          p.xmark(A, 'a', { color: 'c1' });
          p.xmark(B, 'b', { color: 'c1' });
          if (cur && i !== N - 1) {
            p.line(cur.c, 0, cur.c, cur.fc, { color: 'c2', dash: [4, 4], width: 1.5 });
            p.point(cur.c, cur.fc, { color: 'c2', r: 6 });
            p.xmark(cur.c, 'c', { color: 'c2', below: false });
          }
          if (i === N - 1 && !res.exact) p.point(res.root, 0, { color: 'c3', r: 6, label: '≈ ' + E.fmtShort(res.root, 5) });
        };
        w.plot.legend([{ label: '<i>y</i> = <i>f</i>(<i>x</i>)', color: 'c1' }, { label: 'midpoint <i>c</i>', color: 'c2', dot: true }, { label: 'red = positive, blue = negative', color: 'c6', dot: true }]);
        if (follow && i > 0) { const L = B - A; w.plot.fit({ fns: [f], x0: A - 0.4 * L, x1: B + 0.4 * L, xpad: 0 }); w._zoomed = true; }
        else if (!w._fitted || w._zoomed) { w._fitted = true; w._zoomed = false; RT.fitAround(w.plot, f, [res.a0, res.b0], { pad: 0.3 }); }
        else w.plot.render();
      },
    });
    RT.followToggle(w, false, (v) => { follow = v; w.go(w.i); });
    w.extra.appendChild(table.el);
    return w;
  }

  const ex = (title, src, fs, a, b, opt) => {
    const fc = E.compile(fs);
    const res = E.bisection(fc.f, a, b, { steps: opt.steps, tol: opt.tol });
    const what = opt.places ? 'to <b>' + opt.places + ' correct decimal places</b>' : opt.tol ? 'within ' + E.fmtE(opt.tol, 2) : 'for <b>' + opt.steps + ' steps</b>';
    return {
      title, src,
      problem: '<p>Use the Bisection Method on</p><div class="eq"><i>f</i>(<i>x</i>) = ' + fc.html + ' &nbsp; on [' + a + ', ' + b + ']</div><p>' + what + '.</p>' + (opt.trig ? RT.trigNote : ''),
      solve: () => bisectBoard(fc, res, { detail: opt.detail, tol: opt.tol, places: opt.places, trig: opt.trig }),
      watch: (el) => bisectWalk(el, { fc, res }),
    };
  };

  const topic = {
    id: 'bisection', num: 2, unit: 'prelim',
    title: 'The Bisection Method', short: 'bisection',
    book: 'Sauer §1.1', tagline: 'Trap the root, cut the interval in half, keep the half that still has the sign change.',

    lessons: [
      { title: 'The idea', build(el) {
        el.appendChild(h('p', { class: 'big', html: 'If <i>f</i> is <b>continuous on [a, b]</b> and its endpoint values have <b>opposite signs</b>, its graph must cross zero somewhere between <i>a</i> and <i>b</i>.' }));
        el.appendChild(h('p', { html: 'So: cut the interval in half, look at the sign in the middle, and keep the half where the signs still disagree. Repeat. It is the "guess my number" game — slow, but it <b>never fails</b> once the root is trapped.' }));
        el.appendChild(UI.callout('good', 'The one rule', '<p class="big" style="margin:0"><b><i>c</i> replaces the endpoint that has the same sign as <i>f</i>(<i>c</i>).</b></p>'));
      } },
      { title: 'The steps', build(el) {
        el.appendChild(UI.recipe([
          '<b>Check</b> continuity throughout [<i>a</i>, <i>b</i>] and opposite signs at the endpoints.',
          '<b>Midpoint:</b> <i>c</i> = (<i>a</i> + <i>b</i>)/2.',
          '<b>Evaluate</b> <i>f</i>(<i>c</i>). Only its sign matters.',
          '<b>Replace</b> the endpoint with the same sign as <i>f</i>(<i>c</i>).',
          '<b>Repeat</b>. The answer is the midpoint of the last interval.',
        ]));
        el.appendChild(h('p', { style: { marginTop: '14px' }, html: 'On paper, keep a table with columns <i>i</i>, <i>a</i>, <i>f</i>(<i>a</i>), <i>c</i>, <i>f</i>(<i>c</i>), <i>b</i>, <i>f</i>(<i>b</i>) — exactly like the book.' }));
      } },
      { title: 'How many steps?', build(el) {
        el.appendChild(h('p', { html: 'Each step halves the interval. After <i>n</i> steps:' }));
        el.appendChild(h('div', { class: 'eq', html: 'error &lt; ' + M.fr('<i>b</i> − <i>a</i>', '2<sup><i>n</i>+1</sup>') + ' &nbsp;&nbsp; evaluations = <i>n</i> + 2' }));
        el.appendChild(h('p', { html: '<b>"<i>p</i> correct decimal places"</b> means error &lt; 0.5 × 10<sup>−<i>p</i></sup>. Solve for <i>n</i>, then round <b>up</b>:' }));
        el.appendChild(h('div', { class: 'eq', html: '<i>n</i> &gt; ' + M.fr('<i>p</i> + log<sub>10</sub>(<i>b</i> − <i>a</i>)', 'log<sub>10</sub> 2') }));
        el.appendChild(h('p', { html: '<b>Book Example 1.2:</b> [0, 1] to 6 places → <i>n</i> &gt; 6/0.301 = 19.9 → <b>20 steps</b>.' }));
      } },
      { title: 'Watch it', build(el) {
        el.appendChild(h('p', { class: 'muted', html: 'Press <b>Next</b> for each step. Say which endpoint gets replaced before you press.' }));
        const fc = E.compile('x^3 + x - 1');
        bisectWalk(el, { title: 'Book Example 1.1: <i>x</i><sup>3</sup> + <i>x</i> − 1 on [0, 1]', fc, res: E.bisection(fc.f, 0, 1, { steps: 10 }) });
      } },
      { title: 'Watch out', build(el) {
        el.appendChild(UI.callout('warn', 'Common mistakes', '<ul><li><b>Degree mode</b> with sin/cos/tan. Use radians.</li><li><b>Replacing the wrong endpoint.</b> Same sign → replace that one.</li><li><b>Off-by-one.</b> The first midpoint is <i>c</i><sub>0</sub>; "<i>n</i> steps" means <i>n</i> midpoints.</li><li><b>f(a)f(b) &gt; 0 does not mean "no root"</b> — there could be two.</li></ul>'));
        el.appendChild(UI.callout('calc', 'Calculator tricks', '<ul><li><b>CALC:</b> type <i>f</i>(X) once, press <span class="kbd">CALC</span>, enter the midpoint, <span class="kbd">=</span>. CALC again for the next one.</li><li><b>TABLE mode:</b> start −5, end 5, step 1 — look for where the sign flips to find [<i>a</i>, <i>b</i>].</li></ul>'));
      } },
    ],

    examples: [
      ex('x³ + x − 1 on [0, 1]', 'Book Example 1.1', 'x^3 + x - 1', 0, 1, { steps: 10, detail: 4 }),
      ex('cos x − x on [0, 1], six correct places', 'Book Example 1.2', 'cos(x) - x', 0, 1, { tol: 0.5e-6, places: 6, detail: 3, trig: true }),
      ex('x³ = 9: two steps', 'Exercise 1.1-3(a)', 'x^3 = 9', 2, 3, { steps: 2, detail: 2 }),
      ex('ln x + x² = 3: three steps', 'Exercise 1.1-4(c)', 'ln(x) + x^2 = 3', 1, 2, { steps: 3, detail: 3 }),
      ex('√2 to 4 correct places', 'Computer Problem 1.1-4', 'x^2 - 2', 1, 2, { tol: 0.5e-4, places: 4, detail: 3 }),
    ],

    solve(el) {
      const fin = UI.exprInput({ label: '<i>f</i>(<i>x</i>) =', value: 'x^3 + x - 1', prefix: '<i>f</i>(<i>x</i>) = ', wide: true });
      const ain = UI.textInput({ label: '<i>a</i> (left end)', value: '0' });
      const bin = UI.textInput({ label: '<i>b</i> (right end)', value: '1' });
      const stop = UI.stopRule({ mode: 'steps', steps: 5, places: 4, errorBound: true });
      const out = h('div');
      const scanOut = h('div');
      el.appendChild(h('div', { class: 'card' },
        h('p', { class: 'muted small', html: 'Type like a calculator: <code>x^3 + x - 1</code>, <code>cos x - x</code>, <code>e^(-x) - x</code>, <code>ln(x) + x^2 = 3</code>.' }),
        h('div', { class: 'form-grid' }, fin.el, ain.el, bin.el, ...stop.els),
        h('div', { class: 'row', style: { marginTop: '14px' } },
          h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Show the solution'),
          h('button', { class: 'btn', type: 'button', onclick: scan }, 'Find an interval for me')),
        scanOut));
      el.appendChild(out);
      function scan() {
        scanOut.innerHTML = '';
        const fc = fin.get();
        if (!fc) { scanOut.appendChild(UI.error('Type a valid f(x) first.')); return; }
        const st = RT.signTable(fc.f, -6, 6);
        scanOut.appendChild(h('p', { style: { marginTop: '12px' }, html: st.changes.length ? 'The sign changes in: ' + st.changes.map((c) => '[' + c[0] + ', ' + c[1] + ']').join(', ') + '.' : 'No sign change between −6 and 6 at whole numbers.' }));
        const row = h('div', { class: 'row' });
        st.changes.forEach((c) => row.appendChild(h('button', { class: 'btn sm', type: 'button', onclick: () => { ain.set(c[0]); bin.set(c[1]); run(); } }, 'Use [' + c[0] + ', ' + c[1] + ']')));
        scanOut.appendChild(row);
        scanOut.appendChild(UI.table(['<i>x</i>', '<i>f</i>(<i>x</i>)'], st.rows).el);
      }
      function run() {
        out.innerHTML = '';
        const fc = fin.get();
        if (!fc) { out.appendChild(UI.error('I can\'t read f(x) yet. Check the red message under the box.')); return; }
        const a = E.evalNumber(ain.get()), b = E.evalNumber(bin.get());
        if (!isFinite(a) || !isFinite(b)) { out.appendChild(UI.error('a and b must be numbers.')); return; }
        if (a >= b) { out.appendChild(UI.error('a must be smaller than b.')); return; }
        const sr = stop.read();
        if (sr.error) { out.appendChild(UI.error(sr.error)); return; }
        const res = E.bisection(fc.f, a, b, { steps: sr.steps, tol: sr.tol });
        if (res.error) { out.appendChild(UI.error(res.error + (res.sameSign ? ' Try “Find an interval for me”.' : ''))); return; }
        if (!res.rows.length) { out.appendChild(UI.callout('good', 'An endpoint is already a root', '<p><i>f</i> is exactly 0 at ' + E.fmtShort(res.root, 8) + '.</p>')); return; }
        const paper = h('div', { class: 'paper' }, h('div', { class: 'kicker', text: 'Solution' }));
        out.appendChild(paper);
        UI.board(paper, bisectBoard(fc, res, { detail: 4, tol: sr.tol, places: sr.places, trig: /sin|cos|tan/.test(fc.text) }), { reveal: 'all' });
        UI.watch(paper, (b2) => bisectWalk(b2, { fc, res }));
      }
      run();
    },
    formulas: '<div class="eq"><i>c</i> = ' + M.fr('<i>a</i> + <i>b</i>', '2') + '</div><ul><li>Need <i>f</i>(<i>a</i>)<i>f</i>(<i>b</i>) &lt; 0. <i>c</i> replaces the endpoint with the same sign.</li><li>Error after <i>n</i> steps &lt; (<i>b</i> − <i>a</i>)/2<sup><i>n</i>+1</sup>; evaluations = <i>n</i> + 2</li><li><i>p</i> places: <i>n</i> &gt; (<i>p</i> + log<sub>10</sub>(<i>b</i>−<i>a</i>))/log<sub>10</sub>2</li></ul>',
  };

  /* ---------- practice ---------- */
  const g1 = () => {
    const it = R.pick(RT.bank);
    const fc = E.compile(it.f);
    const res = E.bisection(fc.f, it.a, it.b, { steps: 3 });
    const rows = res.rows.map((r, k) => [r.i, k === 0 ? E.fmtShort(r.a, 6) : { answer: r.a }, k === 0 ? E.fmtShort(r.b, 6) : { answer: r.b }, { answer: r.c }, { answer: r.fc, tol: Math.max(1e-3, Math.abs(r.fc) * 2e-3) }]);
    return {
      type: 'Bisection table (3 steps)',
      prompt: '<p>Apply 3 steps of the Bisection Method to <span class="math"><i>f</i>(<i>x</i>) = ' + fc.html + '</span> on [' + it.a + ', ' + it.b + ']. Fill the table (<i>f</i>(<i>c</i>) to at least 3 decimals).</p>' + (it.trig ? RT.trigNote : ''),
      build: UI.drillTable(['<i>i</i>', M.v('a', 'i'), M.v('b', 'i'), M.v('c', 'i'), '<i>f</i>(' + M.v('c', 'i') + ')'], rows),
      hint: '<p><i>c</i> = (<i>a</i> + <i>b</i>)/2, then <i>c</i> replaces the endpoint with the same sign. Here <i>f</i>(' + it.a + ') = ' + E.fmtShort(fc.f(it.a), 4) + ' and <i>f</i>(' + it.b + ') = ' + E.fmtShort(fc.f(it.b), 4) + '.</p>',
      board: () => bisectBoard(fc, res, { detail: 3, trig: it.trig }),
      solution: (box) => bisectWalk(box, { fc, res }),
    };
  };
  g1.label = 'Fill the table';
  const g2 = () => {
    const len = R.pick([1, 1, 1, 2, 0.5, 4]);
    const a = R.int(-3, 3);
    const usePlaces = Math.random() < 0.6;
    const p = R.int(3, 10);
    const tol = usePlaces ? 0.5 * Math.pow(10, -p) : Math.pow(10, -p);
    const need = E.bisectionStepsFor(len, tol);
    const what = usePlaces ? 'correct to <b>' + p + ' decimal places</b>' : 'within <b>10<sup>−' + p + '</sup></b> of the true root';
    return {
      type: 'How many steps?',
      prompt: '<p>The Bisection Method starts on [' + a + ', ' + (a + len) + ']. How many steps <i>n</i> are needed to be sure the answer is ' + what + '?</p>',
      fields: [{ label: '<i>n</i> =', answer: need, tol: 0 }],
      hint: '<p>Solve ' + M.fr('<i>b</i> − <i>a</i>', '2<sup><i>n</i>+1</sup>') + ' &lt; ' + (usePlaces ? '0.5 × 10<sup>−' + p + '</sup>' : '10<sup>−' + p + '</sup>') + ' for <i>n</i>, then round up.</p>',
      board: () => ({
        steps: [
          { title: 'Write the error condition', lines: [M.fr(String(len), '2<sup><i>n</i>+1</sup>') + ' &lt; ' + E.fmtE(tol, 2)] },
          { title: 'Solve for n', lines: ['2<sup><i>n</i>+1</sup> &gt; ' + E.fmtE(len / tol, 4), '<i>n</i> + 1 &gt; log<sub>2</sub>(' + E.fmtE(len / tol, 4) + ') = ' + M.fr('log(' + E.fmtE(len / tol, 4) + ')', 'log 2') + ' = ' + E.fmtShort(Math.log2(len / tol), 4), '<i>n</i> &gt; ' + E.fmtShort(Math.log2(len / tol) - 1, 4)] },
          { title: 'Round up to a whole number', lines: ['<i>n</i> = ' + M.res(String(need))] },
        ],
        answer: ['<i>n</i> = ' + need + ' steps'],
      }),
    };
  };
  g2.label = 'Steps needed';
  const g3 = () => {
    const a = R.int(-2, 2), len = R.pick([1, 2, 0.5]), steps = R.int(3, 12);
    const bound = len / Math.pow(2, steps + 1);
    return {
      type: 'Error bound',
      prompt: '<p>After <b>' + steps + '</b> steps of bisection from [' + a + ', ' + (a + len) + '], what is the guaranteed error bound? How many function evaluations were used?</p>',
      fields: [{ label: 'error bound =', answer: bound, tol: bound * 1e-3 }, { label: 'evaluations =', answer: steps + 2, tol: 0 }],
      hint: '<p>Error &lt; (<i>b</i> − <i>a</i>)/2<sup><i>n</i>+1</sup>; evaluations = <i>n</i> + 2.</p>',
      board: () => ({
        steps: [
          { title: 'Error bound', lines: [M.fr('<i>b</i> − <i>a</i>', '2<sup><i>n</i>+1</sup>') + ' = ' + M.fr(String(len), '2<sup>' + (steps + 1) + '</sup>') + ' = ' + M.res(E.fmtE(bound, 4))] },
          { title: 'Function evaluations', lines: ['<i>n</i> + 2 = ' + steps + ' + 2 = ' + M.res(String(steps + 2))], note: 'One per midpoint, plus <i>f</i>(<i>a</i>) and <i>f</i>(<i>b</i>) at the start.' },
        ],
        answer: ['error &lt; ' + E.fmtE(bound, 4) + ', &nbsp;' + (steps + 2) + ' evaluations'],
      }),
    };
  };
  g3.label = 'Error bound';
  const IVT = ['x^3 - 9', '3x^3 + x^2 - x - 5', 'x^5 + x - 1', 'ln(x) + x^2 - 3', 'x^3 - 2x - 5', 'x^3 + 4x^2 - 10', 'e^x - 3', 'x^3 - 2', 'x^3 + x - 1', 'e^(-x) - x', 'x^3 + 2x + 7', 'x^5 + 2x - 40'];
  const g4 = () => {
    const s = R.pick(IVT);
    const fc = E.compile(s);
    const st = RT.signTable(fc.f, -5, 5);
    const ch = st.changes[0];
    return {
      type: 'Find a starting interval',
      prompt: '<p>Find an interval [<i>a</i>, <i>a</i> + 1], with <i>a</i> a whole number, that contains a root of <span class="math"><i>f</i>(<i>x</i>) = ' + fc.html + '</span>. What is <i>a</i>?</p>',
      fields: [{ label: '<i>a</i> =', answer: ch[0], tol: 0 }],
      hint: '<p>Plug in whole numbers and watch for the sign to flip. Calculator TABLE mode is perfect for this.</p>',
      board: () => ({
        steps: [
          { title: 'Try whole numbers', table: { head: ['<i>x</i>', '<i>f</i>(<i>x</i>)'], rows: st.rows } },
          { title: 'Find where the sign flips', lines: ['<i>f</i>(' + ch[0] + ') = ' + E.fmtShort(fc.f(ch[0]), 4) + ' ' + M.sign(fc.f(ch[0])) + ', &nbsp; <i>f</i>(' + ch[1] + ') = ' + E.fmtShort(fc.f(ch[1]), 4) + ' ' + M.sign(fc.f(ch[1]))], note: 'Opposite signs, so by the Intermediate Value Theorem a root is in between.' },
        ],
        answer: ['[' + ch[0] + ', ' + ch[1] + '], so <i>a</i> = ' + ch[0]],
      }),
    };
  };
  g4.label = 'Find the interval';
  topic.practice = [g1, g2, g3, g4];
  NM.registerTopic(topic);
})(window.NM);
