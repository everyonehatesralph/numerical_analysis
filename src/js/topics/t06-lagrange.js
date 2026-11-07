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
  IP.pointsTable = (xs, ys) => {
    const hw = (s) => IP.W(s, null, 'One row per point: its number <i>k</i>, its <i>x</i> and its <i>y</i>.');
    const pt = (k) => 'point ' + (k + 1) + ' in the question, (' + IP.v(xs[k]) + ', ' + IP.v(ys[k]) + ')';
    return {
      head: [hw('<i>k</i>'), hw(M.v('x', 'k')), hw(M.v('y', 'k'))],
      rows: xs.map((x, k) => [
        IP.W(String(k + 1), null, 'Number the points 1, 2, 3, … in the order the question gives them.'),
        IP.W(IP.v(x), pt(k), 'The first number of a point is its <i>x</i>, so ' + M.v('x', k + 1) + ' = ' + IP.v(x) + '.', { g: 'x:' + k }),
        IP.W(IP.v(ys[k]), pt(k), 'The second number is its <i>y</i>, so ' + M.v('y', k + 1) + ' = ' + IP.v(ys[k]) + '.', { g: 'y:' + k }),
      ]),
    };
  };
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

  /* ---------- "From / Why" notes for the tutorial player (M.w in ui.js) ----------
     Every number the detailed solutions write carries where it came from and, for a result,
     the arithmetic that made it, in plain words. The written board looks the same. */
  const poly = (p, F) => E.poly.html(p, F, UI.dp());
  const W = (IP.W = (html, from, why, o) => M.w(html, Object.assign({ from, why }, o)));
  const frac = (v) => v instanceof E.Q && !v.isInt();
  const bg = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  const over = (n, d) => (n < 0n ? '−' : '') + M.fr(String(n < 0n ? -n : n), String(d)); // n/d as written, not simplified
  // fractions over one common bottom: ½, ⅓ → bottom 6, tops 3 and 2
  const common = (vals) => { let d = 1n; vals.forEach((v) => { d = (d / bg(d, v.d)) * v.d; }); return { d, tops: vals.map((v) => v.n * (d / v.d)) }; };
  const overSum = (tops, d) => tops.map((t, k) => (k === 0 ? over(t, d) : (t < 0n ? ' − ' : ' + ') + over(t < 0n ? -t : t, d))).join('');
  const POWW = (IP.powWord = (i) => (i === 0 ? 'plain-number' : i === 1 ? '<i>x</i>' : '<i>x</i><sup>' + i + '</sup>'));
  const mono = (IP.mono = (c, i, F) => { const a = Array.from({ length: i + 1 }, () => F.zero()); a[i] = c; return poly(a, F); });
  IP.whySub = (a, b, F) => {
    const A = IP.v(a), B = M.paren(IP.v(b)), R = IP.v(F.sub(a, b));
    if (F.exact && (frac(a) || frac(b))) {
      const c = common([a, b]), top = c.tops[0] - c.tops[1];
      return 'Give both the same bottom, ' + c.d + ': ' + over(c.tops[0], c.d) + ' − ' + M.paren(over(c.tops[1], c.d)) + ' = ' + over(top, c.d) + (top === 0n || bg(top, c.d) > 1n ? ' = ' + R : '') + '.';
    }
    const na = F.num(a), nb = F.num(b);
    if (nb < 0) return 'Minus a minus is plus: ' + A + ' − ' + B + ' = ' + A + ' + ' + IP.v(F.neg(b)) + ' = ' + R + '.';
    if (nb === 0) return 'Taking away 0 changes nothing: ' + R + '.';
    if (na >= nb) return A + ' take away ' + B + ' leaves ' + R + '.';
    if (na >= 0) return B + ' is more than ' + A + ', so the answer goes below zero: ' + A + ' − ' + B + ' = ' + R + '.';
    return A + ' is already below zero. Going down ' + B + ' more gives ' + R + '.';
  };
  IP.whyMul = (a, b, F) => {
    const na = F.num(a), nb = F.num(b), R = IP.v(F.mul(a, b));
    if (na === 0 || nb === 0) return 'Anything times 0 is 0.';
    const sign = na < 0 && nb < 0 ? 'Minus times minus is plus. ' : na < 0 || nb < 0 ? 'Minus times plus is minus. ' : '';
    if (F.exact && (frac(a) || frac(b))) {
      const n = a.n * b.n, d = a.d * b.d;
      return sign + 'Top times top, bottom times bottom: ' + over(n, d) + (bg(n, d) > 1n ? ' = ' + R : '') + '.';
    }
    return sign + M.paren(IP.v(a)) + ' × ' + M.paren(IP.v(b)) + ' = ' + R + '.';
  };
  IP.whyDiv = (nu, de, F) => {
    const q = F.div(nu, de), Q = IP.v(q), N = IP.v(nu), D = M.paren(IP.v(de));
    if (!F.exact || q.isInt()) return N + ' ÷ ' + D + ' = ' + Q + '.';
    const neg = F.num(de) < 0 ? 'The minus on the bottom moves to the front. ' : '';
    if (nu.isInt() && de.isInt()) {
      const g = bg(nu.n, de.n);
      return neg + (g > 1n ? 'Divide the top and the bottom by ' + g + ': ' + Q + '.' : 'No number divides both ' + N + ' and ' + D + ', so it stays the fraction ' + Q + '.');
    }
    if (de.isInt()) return 'Dividing by ' + D + ' multiplies the bottom by ' + D + ': ' + Q + '.';
    return 'Dividing by a fraction is multiplying by it flipped over: ' + Q + '.';
  };
  IP.whyAdd = (vals, F) => {
    const R = IP.v(vals.reduce((s, v) => F.add(s, v), F.zero()));
    if (vals.length === 1) return 'Only one term, so that is the total: ' + R + '.';
    if (F.exact && vals.some(frac)) {
      const c = common(vals), top = c.tops.reduce((s, t) => s + t, 0n);
      return 'Give them the same bottom, ' + c.d + ': ' + overSum(c.tops, c.d) + ' = ' + over(top, c.d) + (top === 0n || bg(top, c.d) > 1n ? ' = ' + R : '') + '.';
    }
    return IP.sumHTML(vals, F) + ' = ' + R + '.';
  };

  /* ---------- arithmetic written out, for the detailed solutions (Lagrange, divided differences) ---------- */
  const nb = (s) => s.replace(/ = /g, '&nbsp;=&nbsp;'); // keep one small calculation on one line
  // "1 − (−1) = 2"
  IP.subLine = (a, b, F) => nb(IP.v(a) + ' − ' + M.paren(IP.v(b)) + ' = ' + IP.v(F.sub(a, b)));
  /* running product, left to right: (2)(−2)(−4) = (−4)(−4) = 16
     o: { from: [where each factor came from], why: [..], src: [ids], id: a name for the result } */
  IP.productLine = (vals, F, o) => {
    o = o || {};
    const br = (v) => '(' + IP.v(v) + ')';
    const pick = (list, q) => (list ? list[q] : null);
    if (vals.length === 1) return W(IP.v(vals[0]), pick(o.from, 0), 'Only one bracket, so there is nothing to multiply.', { src: pick(o.src, 0), id: o.id });
    const out = [vals.map((v, q) => W(br(v), pick(o.from, q), pick(o.why, q) || 'Brackets written side by side mean multiply.', { src: pick(o.src, q) })).join('')];
    let acc = vals[0];
    for (let k = 1; k < vals.length; k++) {
      const prev = acc, two = br(prev) + br(vals[k]), last = k === vals.length - 1;
      acc = F.mul(acc, vals[k]);
      const made = W(last ? IP.v(acc) : br(acc), two, IP.whyMul(prev, vals[k], F), { pre: 'Now multiply the first two: ' + two + '.', id: last ? o.id : null });
      out.push(made + (last ? '' : vals.slice(k + 1).map((v) => W(br(v), 'the line before', 'Not multiplied yet, so copy it down unchanged.')).join('')));
    }
    return out.join(' = ');
  };
  /* nu/de = simplified; just nu/de when it is already in lowest terms
     o: { from, fromTop, whyTop, srcTop, fromBot, whyBot, srcBot, id } */
  IP.divLine = (nu, de, F, highlight, o) => {
    o = o || {};
    const q = F.div(nu, de), hl = (s) => (highlight ? M.res(s) : s);
    const lowest = F.exact && nu.isInt() && de.isInt() && de.n > 1n && q.n === nu.n && q.d === de.n;
    const why = IP.whyDiv(nu, de, F);
    if (lowest) {
      const parts = (o.whyTop ? 'Top: ' + o.whyTop + ' ' : '') + (o.whyBot ? 'Bottom: ' + o.whyBot + ' ' : '');
      return hl(W(M.fr(IP.v(nu), IP.v(de)), o.from, parts + why, { src: [o.srcTop, o.srcBot].filter(Boolean).join(' '), id: o.id }));
    }
    const fr = M.fr(W(IP.v(nu), o.fromTop, o.whyTop, { src: o.srcTop }), W(IP.v(de), o.fromBot, o.whyBot, { src: o.srcBot }));
    return fr + ' = ' + hl(W(IP.v(q), IP.v(nu) + ' ÷ ' + M.paren(IP.v(de)), why, { pre: 'Now divide the top by the bottom.', id: o.id }));
  };
  /* a + b − c, with each sign written once. o: { from: [..], why: [..], src: [..] } puts a note on each term */
  IP.sumHTML = (vals, F, o) => vals.map((v, k) => {
    const neg = F.num(v) < 0, a = IP.v(neg ? F.neg(v) : v);
    const s = k === 0 && neg ? '−' + a : a;
    const piece = o ? W(s, o.from ? o.from[k] : null, o.why ? o.why[k] : null, { src: o.src ? o.src[k] : null }) : s;
    return k === 0 ? piece : (neg ? ' − ' : ' + ') + piece;
  }).join('');
  // a polynomial with a note on each term; note(i) → { from, why, src }, pre goes on the first term
  IP.polyW = (p, F, note, pre) => {
    const terms = [];
    for (let i = p.length - 1; i >= 0; i--) if (!F.isZero(p[i])) terms.push(i);
    if (!terms.length) return W('0', null, note ? note(0).why : null, { pre });
    return terms.map((i, k) => {
      const c = p[i], neg = F.num(c) < 0, n = (note && note(i)) || {};
      return (k === 0 ? '' : neg ? ' − ' : ' + ') + W((k === 0 && neg ? '−' : '') + mono(neg ? F.neg(c) : c, i, F), n.from, n.why, { src: n.src, g: n.g, pre: k === 0 ? pre : null });
    }).join('');
  };
  /* p(x)·(x − r) = x(p) − r(p) = (x·p) + (−r·p) = result
     o: { fromP, srcP, fromR, srcR, gR, id } say where the two brackets came from */
  IP.mulLinLine = (p, r, F, o) => {
    o = o || {};
    const res = E.poly.mulLin(p, r, F), ph = poly(p, F), fac = IP.factor(r, F);
    const lone = p.length === 2 && F.isZero(p[0]) && F.isZero(F.sub(p[1], F.one())); // p is just x
    const head = W(lone ? '<i>x</i>' : '(' + ph + ')', o.fromP || 'the brackets multiplied so far', 'Multiply out two brackets at a time.', { src: o.srcP })
      + W(fac, o.fromR || 'the next bracket', 'One more bracket to multiply in.', { src: o.srcR, g: o.gR });
    const negR = F.neg(r), xp = [F.zero()].concat(p), rp = E.poly.scale(p, negR, F);
    const xItems = p.map((c, i) => (F.isZero(c) ? null : '<i>x</i> × ' + M.paren(mono(c, i, F)) + ' = ' + mono(c, i + 1, F))).filter(Boolean).reverse();
    const rItems = p.map((c, i) => (F.isZero(c) ? null : M.paren(IP.v(negR)) + ' × ' + M.paren(mono(c, i, F)) + ' = ' + mono(F.mul(negR, c), i, F))).filter(Boolean).reverse();
    const wrap = (s) => M.w(s, { id: o.id });
    if (F.isZero(r) || lone) {
      // x times a bracket, or (x)(x − r): each term of the answer is one product
      const items = F.isZero(r) ? xItems : ['<i>x</i> × <i>x</i> = <i>x</i><sup>2</sup>', '<i>x</i> × ' + M.paren(IP.v(negR)) + ' = ' + mono(negR, 1, F)];
      return { line: head + ' = ' + wrap(IP.polyW(res, F, () => ({ why: 'Multiply out: ' + items.join(', ') + '.' }), 'Multiply out.')), poly: res };
    }
    const minus = F.num(r) > 0, rv = IP.v(minus ? r : negR);
    const split = W('<i>x</i>(' + ph + ')', 'the <i>x</i> in ' + fac, 'Share out ' + fac + ': first its <i>x</i> times the whole bracket (' + ph + ').', { pre: 'Split ' + fac + ' into its <i>x</i> and its number.' })
      + (minus ? ' − ' : ' + ') + W(rv + '(' + ph + ')', 'the ' + (minus ? '−' : '+') + rv + ' in ' + fac, 'Then its ' + IP.v(negR) + ' times the whole bracket (' + ph + ').');
    const parts = W('(' + poly(xp, F) + ')', '<i>x</i>(' + ph + ')', xItems.join(', ') + '.', { pre: 'Multiply each piece out, term by term.' })
      + ' + ' + W('(' + poly(rp, F) + ')', IP.v(negR) + '(' + ph + ')', rItems.join(', ') + '.');
    const termNote = (i) => {
      const a = i >= 1 ? xp[i] : F.zero(), b = i < rp.length ? rp[i] : F.zero();
      if (!F.isZero(a) && !F.isZero(b)) return { from: mono(a, i, F) + ' and ' + mono(b, i, F), why: 'Like terms add up: ' + mono(a, i, F) + ' + ' + M.paren(mono(b, i, F)) + ' = ' + mono(F.add(a, b), i, F) + '.' };
      return { from: mono(F.isZero(a) ? b : a, i, F) + ' above', why: 'The only ' + POWW(i) + ' term, so it comes down unchanged.' };
    };
    return { line: head + ' = ' + split + ' = ' + parts + ' = ' + wrap(IP.polyW(res, F, termNote, 'Collect like terms: the same power of <i>x</i> goes together.')), poly: res };
  };
  // multiply out (x − r1)(x − r2)⋯ one bracket at a time; o.src: the names of the brackets
  IP.expandLines = (roots, F, o) => {
    o = o || {};
    let p = E.poly.mulLin([F.one()], roots[0], F), srcP = o.src ? o.src[0] : null, id = null;
    const lines = [];
    for (let k = 1; k < roots.length; k++) {
      id = M.wid();
      const m = IP.mulLinLine(p, roots[k], F, { srcP, srcR: o.src ? o.src[k] : null, fromP: k === 1 ? 'the first bracket on top' : 'the line above', fromR: 'the next bracket on top', id });
      lines.push(m.line); p = m.poly; srcP = id;
    }
    return { lines, poly: p, id };
  };
  // one row per polynomial, one column per power of x, and the column totals
  IP.collectTable = (rows, F) => {
    const deg = Math.max(...rows.map((r) => r.poly.length)) - 1;
    const pows = Array.from({ length: deg + 1 }, (_, k) => deg - k);
    const at = (p, i) => (i < p.length ? p[i] : F.zero());
    const cell = (p, i) => (!F.isZero(at(p, i)) ? IP.v(p[i]) : '0');
    let total = [F.zero()];
    rows.forEach((r) => { total = E.poly.add(total, r.poly, F); });
    const headWhy = 'One column for each power of <i>x</i>, highest first.';
    return {
      head: [''].concat(pows.map((i) => W(i === 0 ? 'number' : i === 1 ? '<i>x</i>' : '<i>x</i><sup>' + i + '</sup>', null, headWhy))),
      rows: rows.map((r) => [W(r.label, null, 'This row is ' + r.label + ' from the step before.')].concat(pows.map((i) => W(cell(r.poly, i), r.label + ', its ' + POWW(i) + ' term',
        F.isZero(at(r.poly, i)) ? r.label + ' has no ' + POWW(i) + ' term, so write 0.' : 'Each term goes under its own power of <i>x</i>.'))))
        .concat([[W('<b>add</b>', null, 'The bottom row adds up each column.')].concat(pows.map((i) => W('<b>' + cell(total, i) + '</b>', 'the ' + POWW(i) + ' column above', IP.whyAdd(rows.map((r) => at(r.poly, i)), F))))]),
      align: ['l'].concat(pows.map(() => 'r')),
      total: E.poly.trim(total, F),
    };
  };
  /* P(t) term by term: P(1) = ½(1)² − ½(1) + 1 = ½ − ½ + 1 = 1
     o: { fromT, gT } where t came from, for the notes */
  IP.evalLine = (p, t, F, name, highlight, o) => {
    o = o || {};
    const terms = [];
    for (let i = p.length - 1; i >= 0; i--) if (!F.isZero(p[i]) || (i === 0 && terms.length === 0)) terms.push(i);
    const T = IP.v(t);
    const tt = () => W('(' + T + ')', o.fromT || '<i>x</i> = ' + T, 'Every <i>x</i> becomes ' + T + '.', { g: o.gT });
    const coefW = (a, i) => W(IP.v(a), 'the ' + POWW(i) + ' term of ' + (name || '<i>P</i>') + '(<i>x</i>)', null);
    const plainSub = [];
    const sub = terms.map((i, k) => {
      const c = p[i], neg = F.num(c) < 0, a = neg ? F.neg(c) : c;
      const one = i > 0 && F.isZero(F.sub(a, F.one()));
      const pw = i > 1 ? '<sup>' + i + '</sup>' : '';
      plainSub.push((one ? '' : IP.v(a)) + (i === 0 ? '' : '(' + T + ')' + pw));
      const body = i === 0 ? coefW(a, 0) : (one ? '' : coefW(a, i)) + tt() + pw;
      return k === 0 ? (neg ? '−' : '') + body : (neg ? ' − ' : ' + ') + body;
    }).join('');
    const vals = terms.map((i) => F.mul(p[i], powOf(t, i, F)));
    const termWhy = terms.map((i) => {
      if (i === 0) return 'A plain number stays as it is.';
      const pw = powOf(t, i, F);
      return (i > 1 ? '(' + T + ')<sup>' + i + '</sup> = ' + IP.v(pw) + '. ' : '') + IP.whyMul(p[i], pw, F);
    });
    const value = E.poly.evalAt(p, t, F);
    const valW = W(IP.v(value), terms.length > 1 ? 'the terms added' : plainSub[0], terms.length > 1 ? IP.whyAdd(vals, F) : termWhy[0], { pre: terms.length > 1 ? 'Now add them up.' : 'Now work it out.' });
    return W((name || '<i>P</i>') + '(' + T + ')', null, 'Put <i>x</i> = ' + T + ' into ' + (name || '<i>P</i>') + '(<i>x</i>).', { g: o.gT }) + ' = ' + sub
      + (terms.length > 1 ? ' = ' + IP.sumHTML(vals, F, { from: plainSub, why: termWhy }) : '') + ' = ' + (highlight ? M.res(valW) : valW);
  };
  function powOf(t, i, F) { let r = F.one(); for (let k = 0; k < i; k++) r = F.mul(r, t); return r; }

  const numerHTML = (xs, b, F) => b.others.map((j) => IP.factor(xs[j], F)).join('');

  /* ---------- for the tutorial player (tutor.js): coloured pens and the pinned "given" panel ---------- */
  const pen = (IP.pen = (c, s) => '<span class="pen ' + c + '">' + s + '</span>');
  // own point yellow, every other point blue
  IP.focusPoint = (n, k, row) => { const m = {}; for (let j = 0; j < n; j++) m[j] = j === k ? 'a' : 'b'; const f = {}; f[row || 'x'] = m; return f; };
  IP.focusOne = (k, pens) => { const f = {}; Object.keys(pens).forEach((r) => { f[r] = {}; f[r][k] = pens[r]; }); return f; };
  IP.focusAll = (n, row, c) => { const m = {}; for (let j = 0; j < n; j++) m[j] = c; const f = {}; f[row] = m; return f; };
  IP.given = (xs, ys, extra) => ({
    rows: [{ key: 'k', label: 'point', cells: xs.map((_, k) => String(k + 1)) }, { key: 'x', label: '<i>x</i>', cells: xs.map((x) => IP.v(x)) }, { key: 'y', label: '<i>y</i>', cells: ys.map((y) => IP.v(y)) }],
    extra: extra || null,
  });
  IP.and = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const inTable = (IP.inTable = (name, k, v) => M.v(name, k + 1) + ' = ' + IP.v(v) + ' in the table');
  // a top bracket (x − xj) with its number in blue; id names the whole bracket
  const factorPen = (xj, F, j, id) => {
    const from = inTable('x', j, xj), g = 'x:' + j;
    const xW = W('<i>x</i>', null, '<i>x</i> stays a letter: the switch has to work for every <i>x</i>.');
    let s;
    if (F.isZero(xj)) s = W('<i>x</i>', from, '<i>x</i> − 0 is just <i>x</i>, so this bracket is only <i>x</i>.', { g });
    else if (F.num(xj) < 0) s = '(' + xW + ' + ' + W(pen('b', IP.v(F.neg(xj))), from, '<i>x</i> − (' + IP.v(xj) + ') is <i>x</i> + ' + IP.v(F.neg(xj)) + ': minus a minus is plus.', { g }) + ')';
    else s = '(' + xW + ' − ' + W(pen('b', IP.v(xj)), from, 'Point ' + (j + 1) + ' is another point, so its <i>x</i> makes a bracket on top.', { g }) + ')';
    return M.w(s, { id });
  };
  // the bottom brackets (xk − xj): own x yellow, the other x blue; ids name each number
  const denomPen = (xs, b, idOwn, idOther) => b.others.map((j, q) => '(' +
    W(pen('a', IP.v(xs[b.k])), inTable('x', b.k, xs[b.k]), 'This point\'s own <i>x</i> starts every bracket on the bottom.', { g: 'x:' + b.k, id: idOwn && idOwn[q] }) + ' − ' +
    W(pen('b', M.paren(IP.v(xs[j]))), inTable('x', j, xs[j]), 'Then minus another point\'s <i>x</i>: one bracket for each other point.', { g: 'x:' + j, id: idOther && idOther[q] }) + ')').join('');

  /* ---------- written solution ----------
     o.t: evaluate at t; o.valueOnly: skip the expansion (shortcut for one value) */
  function lagrangeBoard(xs, ys, F, o) {
    o = o || {};
    const n = xs.length;
    const L = E.lagrange(xs, ys, F);
    const hasT = o.t !== null && o.t !== undefined;
    const Lx = (k, arg) => M.v('L', k + 1) + '(' + (arg || '<i>x</i>') + ')';
    const same = (a, b) => (F.exact ? F.isZero(F.sub(a, b)) : Math.abs(F.num(a) - F.num(b)) < 1e-9);
    /* "0 − 2 = −2" with the numbers in the same colours as the given panel.
       o: { fa, sa, fb, sb, id }: where the two numbers came from (text, names) and a name for the result */
    const subPen = (a, b, ca, cb, o) => {
      o = o || {};
      const A = IP.v(a), B = M.paren(IP.v(b));
      return '<span class="nw">' + W(pen(ca, A), o.fa, null, { src: o.sa }) + ' − ' + W(pen(cb, B), o.fb, null, { src: o.sb }) + '&nbsp;=&nbsp;'
        + W(IP.v(F.sub(a, b)), A + ' − ' + B, IP.whySub(a, b, F), { pre: 'Now work out ' + A + ' − ' + B + '.', id: o.id }) + '</span>';
    };
    const ids = (list) => list.map(() => M.wid());
    const LBL = {
      'top:': 'Work out each bracket of the top, one at a time.', 'bottom:': 'Work out each bracket of the bottom, one at a time.',
      top: 'The top is all its brackets multiplied together.', bottom: 'The bottom is all its brackets multiplied together.',
      'top*': 'Multiply out the top, two brackets at a time.',
    };
    const lbl = (s, k) => W(s, null, LBL[k || s]);
    const Pw = W('<i>P</i>(<i>x</i>)', null, 'The polynomial we are building. It has to go through every point.');
    const LxW = (k, why) => W(Lx(k), null, why || 'The switch for point ' + (k + 1) + ': it is 1 at ' + M.v('x', k + 1) + ' and 0 at every other point.');
    const steps = [];
    steps.push({
      title: 'Write down what you know',
      text: n + ' points, so <i>P</i>(<i>x</i>) has degree at most ' + (n - 1) + ' (one less than the number of points). Number the points in order:',
      table: IP.pointsTable(xs, ys),
      then: [
        Pw + ' = ' + xs.map((_, k) => W(M.v('y', k + 1), 'the <i>y</i> row of the table', 'Point ' + (k + 1) + '\'s <i>y</i>-value. Each point brings its own term.', { g: 'y:' + k }) + LxW(k)).join(' + '),
        Pw + ' = ' + xs.map((_, k) => W(pen('c', M.paren(IP.v(ys[k]))), inTable('y', k, ys[k]), 'Swap ' + M.v('y', k + 1) + ' for its number.', { g: 'y:' + k }) + LxW(k, 'Still unknown. The next steps build each switch.')).join(' + '),
      ],
      note: 'Each ' + M.v('L', 'k') + '(<i>x</i>) is a "switch": it equals 1 at its own point and 0 at every other point. At ' + M.v('x', 1) + ' only the first term is switched on, so <i>P</i>(' + M.v('x', 1) + ') = ' + M.v('y', 1) + '. The same happens at every point.',
      tut: {
        sayTable: 'Number the points 1 to ' + n + ', in order. Every number you need comes from this table.',
        sayThen: ['Lagrange\'s idea: each y-value times its own "switch" ' + M.v('L', 'k') + '.', 'Put in the y-values (pink). Now we only need the switches.'],
        focusThen: [null, IP.focusAll(n, 'y', 'c')],
      },
    });

    /* shortcut: one value P(t), no expanding */
    if (o.valueOnly && hasT) {
      const t = o.t, ev = E.lagrangeAt(xs, ys, F, t);
      const T = IP.v(t);
      steps.push({
        title: 'Plan: put x = ' + T + ' in right away',
        text: 'You need one number, not the whole polynomial, so nothing gets expanded. Each ' + M.v('L', 'k') + '(' + T + ') becomes a plain number:',
        lines: [W(M.v('L', 'k') + '(' + T + ')', null, 'The L-value of any point <i>k</i>, at <i>x</i> = ' + T + '.', { g: 't' }) + ' = ' + M.fr(
          W('(' + T + ' − each other <i>x</i>), multiplied', null, 'Top: the <i>x</i> you want, ' + T + ', minus every <i>x</i> except this point\'s own. Multiply those brackets.', { g: 't' }),
          W('(' + M.v('x', 'k') + ' − each other <i>x</i>), multiplied', null, 'Bottom: the same brackets, but starting from this point\'s own <i>x</i>.'))],
        tut: { say: ['This is the pattern for every L-value. You will use it ' + n + ' times.'], focusIntro: { t: 'c' } },
      });
      ev.parts.forEach((p) => {
        const k = p.k, others = L.basis[k].others;
        const idT = ids(others), idTo = ids(others), idK = ids(others), idBo = ids(others), idTd = ids(others), idBd = ids(others), idTop = M.wid(), idBot = M.wid();
        const xk = IP.v(xs[k]);
        steps.push({
          title: 'Find ' + Lx(k, T) + ': leave out point ' + (k + 1),
          text: 'Point ' + (k + 1) + ' has ' + M.v('x', k + 1) + ' = ' + IP.v(xs[k]) + ', so use the other x-values: ' + others.map((j) => IP.v(xs[j])).join(', ') + '.',
          lines: [
            W(Lx(k, T), null, 'The L-value of point ' + (k + 1) + ' at <i>x</i> = ' + T + '.') + ' = ' + M.fr(others.map((j, q) => '(' +
              W(pen('c', T), 'find <i>P</i>(' + T + '): the <i>x</i> we want', 'Every bracket on top starts with ' + T + '.', { g: 't', id: idT[q] }) + ' − ' +
              W(pen('b', M.paren(IP.v(xs[j]))), inTable('x', j, xs[j]), 'Point ' + (j + 1) + ' is not point ' + (k + 1) + ', so its <i>x</i> gets a bracket.', { g: 'x:' + j, id: idTo[q] }) + ')').join(''), denomPen(xs, L.basis[k], idK, idBo)),
            lbl('top:') + ' ' + others.map((j, q) => subPen(t, xs[j], 'c', 'b', { fa: 'the pink ' + T + ' in the top bracket', sa: idT[q], fb: 'the blue ' + M.paren(IP.v(xs[j])) + ' in that bracket above', sb: idTo[q], id: idTd[q] })).join(', &nbsp; '),
            lbl('top') + ' = ' + IP.productLine(others.map((j) => F.sub(t, xs[j])), F, { src: idTd, from: others.map((j) => 'the top bracket ' + T + ' − ' + M.paren(IP.v(xs[j])) + ', worked out above'), id: idTop }),
            lbl('bottom:') + ' ' + others.map((j, q) => subPen(xs[k], xs[j], 'a', 'b', { fa: 'the yellow ' + xk + ' in the bottom bracket', sa: idK[q], fb: 'the blue ' + M.paren(IP.v(xs[j])) + ' in that bracket above', sb: idBo[q], id: idBd[q] })).join(', &nbsp; '),
            lbl('bottom') + ' = ' + IP.productLine(others.map((j) => F.sub(xs[k], xs[j])), F, { src: idBd, from: others.map((j) => 'the bottom bracket ' + xk + ' − ' + M.paren(IP.v(xs[j])) + ', worked out above'), id: idBot }),
            W(Lx(k, T), null, 'Top over bottom.') + ' = ' + IP.divLine(p.nu, p.de, F, true, { from: 'the top ' + IP.v(p.nu) + ' and the bottom ' + IP.v(p.de) + ', worked out above', fromTop: 'the top, worked out above', srcTop: idTop, fromBot: 'the bottom, worked out above', srcBot: idBot }),
          ],
          tut: {
            intro: 'Point ' + (k + 1) + ' is the one left out. Its x, ' + IP.v(xs[k]) + ', is yellow. The other x-values, ' + IP.and(others.map((j) => IP.v(xs[j]))) + ', are blue.',
            focusIntro: Object.assign(IP.focusPoint(n, k), { t: 'c' }),
            say: [
              'Top: the pink ' + T + ' minus each blue x. Bottom: the yellow ' + IP.v(xs[k]) + ' minus each blue x.',
              'Work out each bracket on top.',
              'Multiply them. The top is ' + IP.v(p.nu) + '.',
              'Now each bracket on the bottom.',
              'Multiply them. The bottom is ' + IP.v(p.de) + '.',
              'Divide the top by the bottom.',
            ],
          },
        });
      });
      steps.push({
        title: 'Multiply each by its y-value',
        lines: ev.parts.map((p) => W(M.v('y', p.k + 1) + Lx(p.k, T), null, 'Point ' + (p.k + 1) + '\'s <i>y</i> times its L-value.') + ' = '
          + W(pen('c', M.paren(IP.v(ys[p.k]))), inTable('y', p.k, ys[p.k]), null, { g: 'y:' + p.k }) + ' × '
          + W(M.paren(IP.v(p.L)), Lx(p.k, T) + ', found in step ' + (p.k + 3), null) + ' = '
          + W(IP.v(p.term), M.paren(IP.v(ys[p.k])) + ' × ' + M.paren(IP.v(p.L)), IP.whyMul(ys[p.k], p.L, F), { pre: 'Now multiply.' })),
        tut: {
          intro: 'Each L-value gets multiplied by the y-value of its own point.',
          say: ev.parts.map((p) => 'Point ' + (p.k + 1) + ': its y-value, ' + IP.v(ys[p.k]) + ' (pink), times ' + Lx(p.k, T) + '.'),
          focus: ev.parts.map((p) => IP.focusOne(p.k, { y: 'c' })),
        },
      });
      steps.push({
        title: 'Add them up',
        lines: [W('<i>P</i>(' + T + ')', null, 'The answer is the sum of the terms from the step before.', { g: 't' }) + ' = '
          + IP.sumHTML(ev.parts.map((p) => p.term), F, { from: ev.parts.map((p) => M.v('y', p.k + 1) + Lx(p.k, T) + ' from the step before') })
          + ' = ' + M.res(W(IP.vd(ev.value), null, IP.whyAdd(ev.parts.map((p) => p.term), F), { pre: 'Now add them.' }))],
        tut: { intro: 'Last move: add the ' + n + ' results.', say: ['Add them. This is <i>P</i>(' + T + ').'] },
      });
      const sumL = ev.parts.reduce((s, p) => F.add(s, p.L), F.zero());
      steps.push({
        title: 'Check your L-values',
        lines: [ev.parts.map((p) => W(Lx(p.k, T), null, 'Add the L-values themselves, not the terms.')).join(' + ') + ' = '
          + IP.sumHTML(ev.parts.map((p) => p.L), F, { from: ev.parts.map((p) => Lx(p.k, T) + ', found in step ' + (p.k + 3)) }) + ' = '
          + W(IP.v(sumL), null, IP.whyAdd(ev.parts.map((p) => p.L), F) + (same(sumL, F.one()) ? ' They add up to exactly 1, as they must.' : ''), { pre: 'Now add them.' }) + (same(sumL, F.one()) ? ' ✓' : '')],
        note: 'The L-values always add up to exactly 1, whatever the points. If yours don\'t, one of them has a mistake.',
        tut: { intro: 'A 10-second check before you hand it in.', say: ['Add the L-values (not the terms). You must get 1.'] },
      });
      return { steps, answer: ['<i>P</i>(' + T + ') = ' + IP.vd(ev.value)], given: IP.given(xs, ys, [{ key: 't', html: 'find <i>P</i>(' + T + ')' }]) };
    }

    /* full polynomial */
    L.basis.forEach((b) => {
      const k = b.k, others = b.others, xk = IP.v(xs[k]), X = (j) => M.v('x', j + 1);
      const idTopF = ids(others), idOwn = ids(others), idOth = ids(others), idDiff = ids(others), idBot = M.wid();
      const exp = others.length > 1 ? IP.expandLines(others.map((j) => xs[j]), F, { src: idTopF }) : null;
      const lines = [
        LxW(k) + ' = ' + M.fr(
          others.map((j) => W('(<i>x</i> − ' + X(j) + ')', null, 'Point ' + (j + 1) + ' is not point ' + (k + 1) + ', so it gets a bracket on top: <i>x</i> minus its <i>x</i>.')).join(''),
          others.map((j) => W('(' + X(k) + ' − ' + X(j) + ')', null, 'The same bracket with <i>x</i> swapped for ' + X(k) + ', point ' + (k + 1) + '\'s own <i>x</i>.')).join('')),
        LxW(k, 'Same switch, now with the numbers from the table.') + ' = ' + M.fr(others.map((j, q) => factorPen(xs[j], F, j, idTopF[q])).join(''), denomPen(xs, b, idOwn, idOth)),
        lbl('bottom:') + ' ' + others.map((j, q) => subPen(xs[k], xs[j], 'a', 'b', { fa: 'the yellow ' + xk + ' in the bottom bracket above', sa: idOwn[q], fb: 'the blue ' + M.paren(IP.v(xs[j])) + ' in that bracket above', sb: idOth[q], id: idDiff[q] })).join(', &nbsp; '),
        lbl('bottom') + ' = ' + IP.productLine(others.map((j) => F.sub(xs[k], xs[j])), F, { src: idDiff, from: others.map((j) => 'the bracket ' + xk + ' − ' + M.paren(IP.v(xs[j])) + ', worked out above'), id: idBot }),
      ];
      const say = [
        'First with letters. Top: <i>x</i> minus each <b>other</b> x. Bottom: the same brackets with <i>x</i> replaced by ' + M.v('x', k + 1) + '.',
        'Now the numbers. The yellow ' + IP.v(xs[k]) + ' is this point\'s own x, so it only goes on the bottom. The blue ' + IP.and(others.map((j) => IP.v(xs[j]))) + ' go in every bracket.',
        'Work out each bracket on the bottom. Careful with the minus signs.',
        'Multiply them. The bottom is ' + IP.v(b.den) + '.',
      ];
      if (exp) exp.lines.forEach((l, e) => { lines.push(lbl('top:', 'top*') + ' ' + l); say.push(e === 0 ? 'Now multiply out the top: <i>x</i> times the bracket, then the number times the bracket, then add.' : 'Same again with the next bracket.'); });
      const den = IP.v(b.den);
      lines.push(LxW(k, 'Top over bottom.') + ' = ' + M.fr(
        W(poly(b.numer, F), exp ? 'the top, multiplied out above' : 'the top bracket above', 'Copy the top down: it goes over the bottom.', { src: exp ? exp.id : idTopF[0] }),
        W(den, 'the bottom, worked out above', 'Copy the bottom down, under the top.', { src: idBot })) + ' = ' +
        M.res(IP.polyW(b.Lk, F, (i) => ({ from: mono(b.numer[i], i, F) + ' ÷ ' + M.paren(den), why: 'Divide the ' + POWW(i) + ' term by ' + den + '. ' + IP.whyDiv(b.numer[i], b.den, F) }), 'Divide every term on top by ' + den + '.')));
      say.push('Divide every term on top by ' + IP.v(b.den) + '. That is ' + Lx(k) + '.');
      steps.push({
        title: 'Build ' + Lx(k) + ', the switch for point ' + (k + 1),
        text: 'Leave out point ' + (k + 1) + ' (' + M.v('x', k + 1) + ' = ' + IP.v(xs[k]) + '). <b>Top:</b> (<i>x</i> − each other x-value). <b>Bottom:</b> the same brackets with <i>x</i> replaced by ' + IP.v(xs[k]) + '.',
        lines,
        note: (exp ? 'Multiply the brackets one at a time: <i>x</i> times the bracket, then the number times the bracket, then add. ' : '') + 'Divide every term of the top by the bottom. Quick check: ' + xs.map((x) => Lx(k, IP.v(x)) + ' = ' + IP.v(E.poly.evalAt(b.Lk, x, F))).join(', ') + ' ✓',
        tut: {
          intro: 'Now the switch for point ' + (k + 1) + '. Its own x, ' + IP.v(xs[k]) + ', is yellow. The other x-values, in blue, make the brackets.',
          focusIntro: IP.focusPoint(n, k),
          say,
        },
      });
    });
    const zeroY = L.basis.filter((b) => F.isZero(ys[b.k]));
    steps.push({
      title: 'Multiply each switch by its y-value',
      text: 'Multiply every term inside the bracket by the y-value.',
      lines: L.basis.map((b) => {
        const y = ys[b.k], Y = M.paren(IP.v(y));
        return W(M.v('y', b.k + 1) + Lx(b.k), null, 'Point ' + (b.k + 1) + '\'s <i>y</i> times its switch.') + ' = '
          + W(pen('c', Y), inTable('y', b.k, y), 'Point ' + (b.k + 1) + '\'s <i>y</i>-value.', { g: 'y:' + b.k })
          + W('[' + poly(b.Lk, F) + ']', Lx(b.k) + ', built in step ' + (b.k + 2), 'Square brackets: the whole switch gets multiplied.') + ' = '
          + IP.polyW(E.poly.trim(b.term, F), F, (i) => ({ from: Y + ' × ' + M.paren(mono(b.Lk[i], i, F)), why: IP.whyMul(y, b.Lk[i], F) }),
            F.isZero(y) ? 'The <i>y</i>-value is 0, so everything is 0.' : 'Multiply every term inside by ' + IP.v(y) + '.');
      }),
      note: zeroY.length ? zeroY.map((b) => M.v('y', b.k + 1)).join(', ') + ' = 0, so ' + (zeroY.length > 1 ? 'those terms vanish' : 'that term vanishes') + '. On a test you can skip building that switch.' : null,
      tut: {
        intro: 'All ' + n + ' switches are done. Now each one is multiplied by the y-value of its own point.',
        say: L.basis.map((b) => 'Point ' + (b.k + 1) + ': multiply every term of ' + Lx(b.k) + ' by its y-value, ' + IP.v(ys[b.k]) + ' (pink).'),
        focus: L.basis.map((b) => IP.focusOne(b.k, { y: 'c' })),
      },
    });
    const tbl = IP.collectTable(L.basis.map((b) => ({ label: M.v('y', b.k + 1) + M.v('L', b.k + 1), poly: b.term })), F);
    steps.push({
      title: 'Add them: line up like terms',
      text: 'One row per term, one column per power of <i>x</i>. Add each column down.',
      table: tbl,
      then: [Pw + ' = ' + M.res(IP.polyW(L.poly, F, (i) => ({ from: 'the add row, ' + POWW(i) + ' column', why: 'Each total in the bottom row is one term of <i>P</i>(<i>x</i>).' }), 'Read the totals from the bottom row.'))],
      note: L.poly.length - 1 < n - 1 ? 'The degree came out lower than ' + (n - 1) + ': the points happen to lie on a simpler curve. That is allowed.' : null,
      tut: {
        sayTable: 'One row for each result, one column for each power of <i>x</i>. Add down each column; the bottom row is the total.',
        sayThen: ['Read the totals from the bottom row. This is <i>P</i>(<i>x</i>).'],
      },
    });
    steps.push({
      title: 'Check: P goes through every point',
      text: 'Put each x into <i>P</i>(<i>x</i>). You must get back its y.',
      lines: xs.map((x, k) => IP.evalLine(L.poly, x, F, null, false, { fromT: inTable('x', k, x), gT: 'x:' + k }) + (same(E.poly.evalAt(L.poly, x, F), ys[k])
        ? ' = ' + W(M.v('y', k + 1), inTable('y', k, ys[k]), 'It matches the table, so <i>P</i> goes through point ' + (k + 1) + '.', { g: 'y:' + k }) + ' ✓' : '')),
      tut: {
        say: xs.map((x, k) => 'Put <i>x</i> = ' + IP.v(x) + ' into <i>P</i>. You should get back ' + M.v('y', k + 1) + ' = ' + IP.v(ys[k]) + '.'),
        focus: xs.map((_, k) => IP.focusOne(k, { x: 'a', y: 'a' })),
      },
    });
    const answer = ['<i>P</i>(<i>x</i>) = ' + poly(L.poly, F)];
    if (hasT) {
      const v = E.poly.evalAt(L.poly, o.t, F);
      steps.push({
        title: 'Evaluate at <i>x</i> = ' + IP.v(o.t), text: 'Replace every <i>x</i> with ' + IP.v(o.t) + ', work out each term, then add.', lines: [IP.evalLine(L.poly, o.t, F, null, true, { fromT: 'then find <i>P</i>(' + IP.v(o.t) + ')', gT: 't' })],
        tut: { intro: 'Last part: the value at <i>x</i> = ' + IP.v(o.t) + '.', say: ['Replace every <i>x</i> with ' + IP.v(o.t) + ', work out each term, then add.'], focusIntro: { t: 'c' } },
      });
      answer.push('<i>P</i>(' + IP.v(o.t) + ') = ' + IP.vd(v));
    }
    return { steps, answer, given: IP.given(xs, ys, hasT ? [{ key: 't', html: 'then find <i>P</i>(' + IP.v(o.t) + ')' }] : null) };
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
        UI.solution(paper, lagrangeBoard(d.xs, d.ys, d.F, { t: d.t, valueOnly: only.checked }), { reveal: 'all' });
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
