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
    const proof = E.absBound(d.node, lo, hi);
    const mx = proof || E.maxAbsOn(d.f, lo, hi);
    if (mx.undefinedValues || xs.concat([x]).some((t) => !isFinite(fc.f(t)))) throw new Error('The function or required derivative is undefined on this interval. Check the nodes and domain.');
    const P = E.interpFn(xs, xs.map((t) => fc.f(t)));
    return { n, prod, fact, d, lo, hi, max: mx.max, guaranteed: !!proof, bound: (Math.abs(prod) / fact) * mx.max, actual: Math.abs(fc.f(x) - P(x)), P };
  }

  /* ---------- written solution ---------- */
  const num = (v) => E.fmtE(v, 6); // 6 significant digits, like a calculator display
  const paren = (s) => (/^[−-]/.test(s) ? '(' + s + ')' : s);
  // a small number also written out as a plain decimal: 9.955×10⁻⁴ = 0.0009955
  const plainDec = (v) => (Math.abs(v) >= 1e-7 && Math.abs(v) < 1e-3 ? ' = ' + v.toFixed(Math.min(12, 3 - Math.floor(Math.log10(Math.abs(v))))).replace(/0+$/, '') : '');
  const fPrime = (k) => '<i>f</i>' + (k <= 3 ? ['', '′', '″', '‴'][k] : '<sup>(' + k + ')</sup>') + '(<i>x</i>)';

  function errorBoard(fc, xs, x, o) {
    o = o || {};
    const b = bound(fc, xs, x);
    if (o.maxValue !== undefined) { b.max = o.maxValue; b.bound = (Math.abs(b.prod) / b.fact) * b.max; b.guaranteed = true; }
    const n = b.n;
    const nodes = o.labels || xs.map(s4);
    const X = s4(x);
    const IP = NM.interp, pen = IP.pen, W = IP.W;
    const ord = n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th';
    // in words, for a decimal subtraction or product
    const subWhy = (a, b, r) => (b < 0 ? 'Minus a minus is plus. ' : r < 0 ? 'The node is bigger than <i>x</i>, so this distance is negative. ' : '') + s4(a) + ' − ' + paren(s4(b)) + ' = ' + num(r) + '.';
    const mulWhy = (a, b, r) => (a < 0 && b < 0 ? 'Minus times minus is plus. ' : a < 0 || b < 0 ? 'Minus times plus is minus. ' : '') + paren(num(a)) + ' × ' + paren(num(b)) + ' = ' + num(r) + '.';
    const idDist = xs.map(() => M.wid()), idProd = M.wid(), idPer = M.wid();
    const steps = [];
    steps.push({
      title: 'Write down what you know',
      lines: [
        W('<i>f</i>(<i>x</i>)', null, 'The function. <i>P</i> is the polynomial that copies it.', { g: 'f' }) + ' = ' + W(fc.html, 'the question', 'Copy it exactly as given.', { g: 'f' }),
        W('nodes:', null, 'The nodes are the <i>x</i>-values <i>P</i> was built from.') + ' ' + nodes.map((s, k) => W(M.v('x', k + 1), null, 'Node ' + (k + 1) + '.') + ' = ' + W(s, 'the question', 'Count the nodes as you go: this is node ' + (k + 1) + ' of ' + n + '.', { g: 'x:' + k })).join(', &nbsp; '),
        W('error wanted at <i>x</i>', null, 'The <i>x</i> where we want to know how far <i>P</i> can be from <i>f</i>.') + ' = ' + W(X, 'the question', null, { g: 't' }),
      ],
      text: '<i>P</i> goes through <i>f</i> exactly at the nodes. Between them the two can differ, and we want to know by <b>at most</b> how much.',
      note: 'Count the nodes: <i>n</i> = ' + n + '. Use the number of points (not the degree, which is ' + (n - 1) + ') everywhere below.',
      tut: {
        say: ['This is the function. <i>P</i> is a polynomial that copies it.', 'These are the nodes: the x-values <i>P</i> was built from. Count them: <i>n</i> = ' + n + '.', 'And this is the <i>x</i> where we want the error.'],
        focus: [{ f: 'a' }, IP.focusAll(n, 'x', 'a'), { t: 'c' }],
      },
    });
    steps.push({
      title: 'The error formula and what each part means',
      lines: [W('<i>f</i>(<i>x</i>) − <i>P</i>(<i>x</i>)', null, 'The error: how far <i>P</i> is from <i>f</i> at <i>x</i>.') + ' = '
        + M.fr(W(xs.map((_, k) => '(<i>x</i> − ' + M.v('x', k + 1) + ')').join(''), null, 'Part 1: <i>x</i> minus each node, all multiplied. One bracket per node.'),
          W(n + '!', null, 'Part 2: ' + n + ' factorial, because there are ' + n + ' nodes.'))
        + ' ' + W('<i>f</i><sup>(' + n + ')</sup>(<i>c</i>)', null, 'Part 3: the ' + ord + ' derivative of <i>f</i> (' + n + ' = the number of nodes), at a point <i>c</i> nobody tells us.')],
      text: 'Three parts: <b>(1)</b> the product of the distances from <i>x</i> to every node, <b>(2)</b> ' + n + '! on the bottom, and <b>(3)</b> the ' + ord + ' derivative at some point <i>c</i> that nobody tells us.',
      note: 'Because <i>c</i> is unknown, we use the <b>largest</b> value |<i>f</i><sup>(' + n + ')</sup>| can have. That turns the formula into an upper bound: the true error can be smaller, never bigger.',
      tut: { intro: 'Write the formula first. It always has three parts.', say: ['Part 1 is the product on top, part 2 is ' + n + '! below it, and part 3 is the ' + ord + ' derivative at an unknown <i>c</i>.'] },
    });
    const facs = xs.map((xi) => x - xi);
    const prodLines = [];
    let acc = facs[0], accId = idDist[0];
    for (let k = 1; k < n; k++) {
      const next = acc * facs[k], id = k === n - 1 ? idProd : M.wid();
      prodLines.push(W(paren(num(acc)), k === 1 ? 'distance 1, worked out above' : 'the product on the line above', null, { src: accId }) + ' × '
        + W(paren(num(facs[k])), 'distance ' + (k + 1) + ', worked out above', 'Multiply in one more distance.', { src: idDist[k] }) + ' = '
        + W(num(next), paren(num(acc)) + ' × ' + paren(num(facs[k])), mulWhy(acc, facs[k], next), { pre: 'Now multiply.', id }));
      acc = next; accId = id;
    }
    steps.push({
      title: 'Part 1: the product at x = ' + X,
      text: 'Work out each distance (<i>x</i> − node) first, then multiply them one at a time.',
      lines: xs.map((xi, k) => W(pen('c', X), 'error wanted at <i>x</i> = ' + X, 'Every distance starts from ' + X + '.', { g: 't' }) + ' − '
        + W(pen('a', M.paren(nodes[k])), 'node ' + (k + 1), 'Minus one node at a time.', { g: 'x:' + k })
        + (nodes[k] !== s4(xi) ? ' = ' + X + ' − ' + W(M.paren(num(xi)), nodes[k] + ' as a decimal', 'Turn the node into a decimal first.') : '') + ' = '
        + W(num(facs[k]), X + ' − ' + paren(s4(xi)), subWhy(x, xi, facs[k]), { pre: 'Now subtract.', id: idDist[k] }))
        .concat(prodLines)
        .concat([W('|product|', null, 'The bars mean the size of the number, without its sign.') + ' = ' + M.res(W(num(Math.abs(b.prod)), 'the last product above',
          b.prod < 0 ? 'Drop the minus sign: only the size matters for a bound.' : 'It is already positive, so it stays the same.', { src: accId }))]),
      note: b.prod < 0 ? 'The product came out negative. Only its size matters for a bound, so drop the minus sign.' : null,
      tut: {
        say: xs.map((_, k) => 'Distance to node ' + (k + 1) + ': the pink ' + X + ' minus the yellow ' + nodes[k] + '.')
          .concat(prodLines.map((_, k) => (k === 0 ? 'Now multiply the distances, two at a time.' : 'Times the next distance.')))
          .concat([b.prod < 0 ? 'The product is negative. Drop the minus sign: only the size matters.' : 'This is the size of the product.']),
        focus: xs.map((_, k) => Object.assign(IP.focusOne(k, { x: 'a' }), { t: 'c' })).concat(prodLines.map(() => Object.assign(IP.focusAll(n, 'x', 'a'), { t: 'c' }))),
      },
    });
    steps.push({
      title: 'Part 2: ' + n + '!',
      lines: [(() => {
        const run = [];
        let f = 1;
        for (let k = n; k >= 1; k--) { f *= k; if (k < n) run.push('× ' + k + ' = ' + f); }
        return W(n + '!', null, n + ' factorial: multiply ' + n + ' down to 1.') + ' = ' + Array.from({ length: n }, (_, k) => W(String(n - k), null, k === 0 ? 'Start at ' + n + '…' : '…then go down by one each time, all the way to 1.')).join(' × ')
          + ' = ' + M.res(W(String(b.fact), null, n > 1 ? n + ' ' + run.join(', ') + '.' : '1! is 1.', { pre: 'Now multiply them.' }));
      })()],
      tut: { intro: n + ' nodes, so the bottom is ' + n + ' factorial.', say: ['Multiply ' + n + ' down to 1.'] },
    });
    const ders = [];
    let cur = fc.node;
    let prevId = null;
    for (let k = 1; k <= n; k++) {
      const d = E.derivative(cur), id = M.wid();
      ders.push(W(fPrime(k), null, k === 1 ? 'The first derivative of <i>f</i>.' : 'Derivative number ' + k + ': differentiate the line above once more.' + (k === n ? ' This is the one the formula needs.' : ''))
        + ' = ' + W(d.html, k === 1 ? '<i>f</i>(<i>x</i>) = ' + fc.html : 'the line above', 'Differentiate ' + (k === 1 ? '<i>f</i>' : 'the line above') + ' term by term.', { src: prevId, id, g: k === 1 ? 'f' : null }));
      cur = d.node; prevId = id;
    }
    steps.push({
      title: 'Part 3: the ' + ord + ' derivative',
      text: 'Differentiate ' + n + ' time' + (n > 1 ? 's' : '') + ', one step at a time:',
      lines: ders,
      tut: { say: ders.map((_, k) => (k === 0 ? 'Differentiate once.' : 'Differentiate again: derivative number ' + (k + 1) + '.') + (k === n - 1 ? ' This is the one the formula needs.' : '')), focusIntro: { f: 'a' } },
    });
    steps.push({
      title: (b.guaranteed ? 'Part 3: the largest |<i>f</i><sup>(' + n + ')</sup>|' : 'Part 3: a sampled estimate of the largest |<i>f</i><sup>(' + n + ')</sup>|') + ' between ' + s4(b.lo) + ' and ' + s4(b.hi),
      text: '<i>c</i> can be anywhere from the smallest to the largest of the nodes and <i>x</i>: between ' + s4(b.lo) + ' and ' + s4(b.hi) + '. Take the worst case there.',
      lines: [W(b.guaranteed ? 'max |<i>f</i><sup>(' + n + ')</sup>|' : 'sampled max', null, 'The biggest size the ' + ord + ' derivative reaches between ' + s4(b.lo) + ' and ' + s4(b.hi) + '.') + (b.guaranteed ? ' ≤ ' : ' ≈ ')
        + M.res(W(num(b.max), 'the ' + ord + ' derivative, on ' + s4(b.lo) + ' to ' + s4(b.hi), (b.guaranteed ? 'Nobody tells us <i>c</i>, so we take the worst case: the largest it can be anywhere there.' : 'Sampled, so this is an estimate, not a guarantee.')))],
      note: o.maxWhy || (b.guaranteed ? 'Conservative interval arithmetic bounds the derivative over the whole interval. The interpolation theorem requires the relevant derivatives to exist throughout it.' : 'Sampling can miss peaks. This is an estimate, not a guaranteed upper bound.'),
      tut: { say: ['The largest the ' + ord + ' derivative can be between ' + s4(b.lo) + ' and ' + s4(b.hi) + '. We take the worst case because nobody tells us <i>c</i>.'] },
    });
    const perFact = Math.abs(b.prod) / b.fact;
    steps.push({
      title: b.guaranteed ? 'Put the three parts together' : 'Estimated error scale',
      text: 'Divide the product by ' + n + '!, then multiply by the largest derivative.',
      lines: [
        W(b.guaranteed ? '|<i>f</i>(' + X + ') − <i>P</i>(' + X + ')|' : 'estimated scale', null, 'The size of the error at <i>x</i> = ' + X + '.', { g: 't' }) + (b.guaranteed ? ' ≤ ' : ' ≈ ')
          + M.fr(W('|product|', 'Part 1', null), W(n + '!', 'Part 2', null)) + ' × ' + W('max|<i>f</i><sup>(' + n + ')</sup>|', 'Part 3', 'The worst case replaces the unknown <i>f</i><sup>(' + n + ')</sup>(<i>c</i>).'),
        M.fr(W(num(Math.abs(b.prod)), '|product| from Part 1', null), W(String(b.fact), n + '! from Part 2', null)) + ' = '
          + W(num(perFact), num(Math.abs(b.prod)) + ' ÷ ' + b.fact, num(Math.abs(b.prod)) + ' ÷ ' + b.fact + ' = ' + num(perFact) + '.', { pre: 'Now divide.', id: idPer }),
        W(num(perFact), 'the line above', null, { src: idPer }) + ' × ' + W(num(b.max), 'the largest derivative, from Part 3', null) + ' = '
          + M.res(W(E.fmtE(b.bound, 4), num(perFact) + ' × ' + num(b.max), mulWhy(perFact, b.max, b.bound) + (b.bound < 1e-3 ? ' The ×10 to a minus power means a small number: move the point left.' : ''), { pre: 'Now multiply.' })) + plainDec(b.bound),
      ],
      note: b.guaranteed ? 'In words: <i>P</i>(' + X + ') is within ' + E.fmtE(b.bound, 4) + ' of the true value <i>f</i>(' + X + ').' : null,
      tut: { say: ['Put the three parts into the formula.', 'Part 1 divided by part 2: the product over ' + n + '!.', 'Times part 3, the largest derivative. This is the error bound.'], focusIntro: { t: 'c' } },
    });
    steps.push({
      title: 'Compare with the actual error',
      lines: [W('actual |<i>f</i>(' + X + ') − <i>P</i>(' + X + ')|', null, 'The true error: <i>f</i>(' + X + ') worked out with the real function, minus <i>P</i>(' + X + ').', { g: 't' }) + ' ≈ '
        + W(E.fmtE(b.actual, 4), null, 'Only possible here because we know <i>f</i>. On a test you would not have this.')
        + (b.guaranteed && b.actual <= b.bound * 1.0000001 ? ' ' + W('≤ bound', 'the bound, ' + E.fmtE(b.bound, 4) + ', from the step before', 'The true error is under the bound, as the formula promises.') + ' ✓' : '')],
      note: b.guaranteed ? 'The real error is smaller than the bound, as it must be. On a test you only write the bound; this line is a check.' : 'Do not report the sampled estimate as a guaranteed error bound.',
      tut: { intro: 'A check, not part of the test answer.', say: [b.guaranteed ? 'The real error is smaller than the bound, as it should be.' : 'This is only an estimate. Do not report it as a guaranteed bound.'] },
    });
    return {
      steps,
      answer: [(b.guaranteed ? '|<i>f</i>(' + X + ') − <i>P</i>(' + X + ')| ≤ ' : 'Estimated error scale (not guaranteed): ') + E.fmtE(b.bound, 4) + plainDec(b.bound)],
      given: {
        rows: [{ key: 'k', label: 'node', cells: nodes.map((_, k) => String(k + 1)) }, { key: 'x', label: '<i>x</i>', cells: nodes }],
        extra: [{ key: 'f', html: '<i>f</i>(<i>x</i>) = ' + fc.html }, { key: 't', html: 'error at <i>x</i> = ' + X }],
        remember: IP.remember({ trig: /sin|cos|tan|pi|π/.test(fc.text + ' ' + nodes.join(' ')), exp: /e\^|exp/.test(fc.text), exact: false, n, error: true }),
      },
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
        try { UI.solution(paper, errorBoard(fc, xs, x, { labels: xl.items }), { reveal: 'all' }); }
        catch (e) { out.innerHTML = ''; out.appendChild(UI.error(e.message)); return; }
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
  NM.interp.errorBoard = errorBoard; // for a problem typed into the tutorial (problem.js)
  NM.registerTopic(topic);
})(window.NM);
