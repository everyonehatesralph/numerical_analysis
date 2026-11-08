/* A problem typed in your own words → the worked solution, in the tutorial.
   It reads the three interpolation topics (Lagrange, Newton's divided differences and the
   interpolation error bound) from sentences or equations:
     "Find the Lagrange polynomial through (0, 1), (2, 2), (3, 4) and P(1)"
     "x = 0, 2, 3, 1 and y = 1, 2, 4, 0. Use divided differences. Find P(1.5)"
     "280 in 1800, 283 in 1850, 291 in 1900, 370 in 2000. Estimate it in 1950 and 2050."
     "An industrial fan lasts 75, 63 and 54 at 40, 50 and 60 °C. Estimate it at 70 °C."
     "Bound the error of f(x) = e^x at x = 0.25 with nodes −1, −0.5, 0, 0.5, 1"
   It always says back what it read ("I read it as: …") before solving, and builds the same
   board the examples use. It works offline, so it only knows these problem types; anything
   else gets a message that says what is missing. */
(function (NM) {
  'use strict';
  const { E } = NM;
  const TOPICS = ['lagrange', 'ndd', 'interp-error'];
  const NAME = { lagrange: 'Lagrange', ndd: 'Divided differences', 'interp-error': 'Error bound' };
  const EXAMPLE = {
    lagrange: 'Find the Lagrange polynomial through (0, 1), (2, 2), (3, 4) and P(1).',
    ndd: 'Use divided differences for x = 0, 2, 3, 1 and y = 1, 2, 4, 0. Find P(1.5).',
    'interp-error': 'Bound the error of f(x) = e^x at x = 0.25 with nodes −1, −0.5, 0, 0.5, 1.',
  };

  // a number as typed: 2, -1.5, .5, 3/4, pi, pi/6, 2pi/3
  const NUM = '[-+]?(?:\\d*\\.?\\d+\\s*\\*?\\s*pi(?:/\\d+)?|pi(?:/\\d+)?|\\d*\\.?\\d+(?:/\\d*\\.?\\d+)?)';
  const SEP = '\\s*(?:,|;|&|\\band\\b)\\s*|\\s+';
  const LIST = '(' + NUM + '(?:(?:' + SEP + ')' + NUM + ')+)';
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function norm(src) {
    return String(src || '')
      .replace(/[−‒–]/g, '-') // the minus signs people paste
      .replace(/π/g, 'pi').replace(/×/g, '*').replace(/÷/g, '/').replace(/·/g, '*')
      .replace(/ˣ/g, '^x').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^' + [...m].map((c) => SUP[c]).join(''))
      .replace(/\|/g, ' ') // a table typed with bars, or |f − P|
      .replace(/\s*\/\s*/g, '/').replace(/\s*\^\s*/g, '^')
      .replace(/\b(sin|cos|tan|ln|log|sqrt|exp)\s+(-?[a-z0-9.]+(?:\^[a-z0-9.]+)?)/gi, '$1($2)') // "sin x" → "sin(x)"
      .replace(/\s+/g, ' ');
  }
  const items = (list) => list.split(new RegExp(SEP)).map((s) => s.trim()).filter(Boolean);
  const pretty = (s) => String(s).replace(/\*/g, '').replace(/pi/g, 'π').replace(/^-/, '−');
  const blank = (m) => ' '.repeat(m.length);

  function read(text, prefer) {
    const raw = norm(text);
    if (!raw.trim()) return { ok: false, error: '' };
    const low = raw.toLowerCase();
    let s = ' ' + raw + ' ';
    const take = (re, fn) => { s = s.replace(re, (...m) => (fn(...m) === false ? m[0] : blank(m[0]))); };

    // 0. other methods are not wired in yet
    if (/bisection|secant|fixed[- ]point|newton'?s? method|root of|spline|chebyshev|simpson|trapezoid|integra|derivative of/.test(low) && !/divided|lagrange|interpolat|error|bound/.test(low)) {
      return { ok: false, error: 'This reader solves interpolation problems only: <b>Lagrange</b>, <b>divided differences</b> and the <b>error bound</b>. For other methods, use that topic\'s Solver tab.' };
    }

    // 1. the function: "f(x) = e^x", "y = sin(x)"; or a familiar one on its own ("for e^x")
    let fx = null;
    take(/\b(?:f\s*\(\s*x\s*\)|f|y)\s*=\s*([^,;\n]+?)(?=\s*(?:[,;\n]|\.(?:\s|$)|\s(?:at|on|with|using|for|and|nodes?|in|over|from|between|find|estimate|evaluate|interpolat\w*|bound|where)\b|$))/gi, (m, ex) => {
      if (fx || !/x/.test(ex)) return false;
      const c = E.compile(ex.trim());
      if (!c.ok) return false;
      fx = c;
    });
    if (!fx) {
      take(/(e\^\(?-?\d*\.?\d*\*?x\)?|(?:sin|cos|tan|ln|sqrt|exp)\s*\(\s*[^()]*x[^()]*\)|(?:sin|cos|tan|ln)\s*x\b|1\/\(1\+[^()]*x[^()]*\))/gi, (m) => {
        if (fx) return false;
        const c = E.compile(m.trim());
        if (!c.ok) return false;
        fx = c;
      });
    }

    // 2. points: (0, 1), (2, 2) … · f(0) = 1, f(2) = 2 … · "280 in 1800, 283 in 1850 …"
    let xs = null, ys = null;
    const pairs = [];
    take(new RegExp('\\(\\s*(' + NUM + ')\\s*[,;]\\s*(' + NUM + ')\\s*\\)', 'gi'), (m, a, b) => { pairs.push([a, b]); });
    take(new RegExp('\\b[fy]\\s*\\(\\s*(' + NUM + ')\\s*\\)\\s*=\\s*(' + NUM + ')', 'gi'), (m, a, b) => { pairs.push([a, b]); });
    if (!pairs.length) {
      const re = new RegExp('(' + NUM + ')\\s*(?:[a-z%°]+\\s*){0,2}?\\b(?:in|at|for|when)\\s+(?:the\\s+)?(?:year\\s+|x\\s*=\\s*)?(' + NUM + ')', 'gi');
      const found = [...s.matchAll(re)];
      if (found.length >= 2) take(re, (m, a, b) => { pairs.push([b, a]); });
    }
    if (pairs.length) { xs = pairs.map((p) => p[0]); ys = pairs.map((p) => p[1]); }

    // 3. labelled lists: "x = 0, 2, 3", "y-values: 1 2 4", "nodes −1, 0, 1", "at x = 1, 2, 4"
    let nodes = null;
    const singles = [];
    take(new RegExp('\\b(x[-_ ]?(?:values?|i|s|k)?|nodes?|abscissas?|y[-_ ]?(?:values?|i|s|k)?|f\\(x[-_ ]?[ik]?\\))(?:\\s*(?:are|is|of|at|=|:))*\\s*(' + LIST + '|' + NUM + ')(?![\\w(])', 'gi'), (m, label, val) => {
      const isY = /^(?:y|f\()/i.test(label), list = items(val);
      if (list.length < 2) { if (!isY && /^x/i.test(label)) singles.push(val); return /^x/i.test(label) && !isY ? undefined : false; }
      if (isY) { if (ys) return false; ys = list; }
      else if (/^node/i.test(label)) { if (nodes) return false; nodes = list; }
      else { if (xs) return false; xs = list; }
    });

    // 4. where to evaluate: "P(1)", "at x = 0.25", "estimate … in 1950 and 2050"
    const ts = [];
    take(new RegExp('\\bP\\s*\\(\\s*(' + NUM + ')\\s*\\)(?!\\s*=\\s*[-+\\d.])', 'g'), (m, a) => { ts.push(a); });
    take(new RegExp('\\b(?:estimate|evaluate|find|predict|approximate|compute|calculate|interpolate|value|error|bound|what\\s+is)\\b[^.?!]*?\\b(?:at|in|for|when)\\s+(?:x\\s*=\\s*|the\\s+year\\s+|year\\s+)?(' + NUM + ')(?:\\s*(?:and|,|&)\\s*(' + NUM + '))?(?![\\w(])', 'gi'), (m, a, b) => {
      ts.push(a);
      if (b) ts.push(b);
    });
    take(new RegExp('\\bat\\s+x\\s*=\\s*(' + NUM + ')(?![\\w(])', 'gi'), (m, a) => { ts.push(a); });
    singles.forEach((v) => ts.push(v));
    const tList = ts.filter((v, k) => ts.indexOf(v) === k);

    // 5. lists in a sentence: "lasts 75, 63 and 54 … at 40, 50 and 60 °C"
    const loose = [...s.matchAll(new RegExp(LIST, 'gi'))].map((m) => ({ list: items(m[1]), before: s.slice(Math.max(0, m.index - 14), m.index).toLowerCase() }));
    if (!xs && !ys && loose.length >= 2) {
      const pair = loose.find((a, k) => loose.slice(k + 1).some((b) => b.list.length === a.list.length));
      if (pair) {
        const other = loose.slice(loose.indexOf(pair) + 1).find((b) => b.list.length === pair.list.length);
        const xMark = (o) => /\b(at|in|when|for|x|temperatures?|years?|times?|ages?)\b/.test(o.before);
        const first = xMark(other) && !xMark(pair) ? other : pair;
        xs = first.list;
        ys = (first === pair ? other : pair).list;
      }
    }
    if (!nodes && !xs && loose.length === 1 && fx) nodes = loose[0].list;
    if (!xs && nodes && !/error|bound/.test(low)) xs = nodes;
    if (!nodes && fx && xs && !ys) nodes = xs;

    // which method
    let topic = null;
    if (/divided|triangle|\bndd\b/.test(low) || (/newton/.test(low) && /interpolat|polynomial|points?|data/.test(low))) topic = 'ndd';
    else if (/lagrange/.test(low)) topic = 'lagrange';
    else if (fx && /error|bound|how far|accura/.test(low)) topic = 'interp-error';
    if (!topic) topic = TOPICS.includes(prefer) && (prefer !== 'interp-error' || fx) ? prefer : fx && nodes && !ys && tList.length ? 'interp-error' : 'lagrange';
    if (topic === 'interp-error' && !nodes && xs) nodes = xs;

    return topic === 'interp-error' ? errorProblem(fx, nodes, tList, text) : pointsProblem(topic, xs, ys, fx, tList, low, text);
  }

  const missing = (need, topic) => ({ ok: false, error: 'I still need ' + need + '. For example: <i>' + EXAMPLE[topic] + '</i>' });

  function pointsProblem(topic, xsS, ysS, fx, tList, low, text) {
    if (!xsS || !xsS.length) return missing('the points: write them like (0, 1), (2, 2), (3, 4), or as x = … and y = …', topic);
    let F, xs, ys;
    if (!ysS) {
      if (!fx) return missing('the y-values (or a function f(x) to make them)', topic);
      const xn = xsS.map((v) => E.evalNumber(v));
      if (xn.some((v) => !isFinite(v))) return { ok: false, error: 'I could not read one of the x-values.' };
      F = E.RF; xs = xn; ys = xn.map((v) => fx.f(v));
      if (ys.some((v) => !isFinite(v))) return { ok: false, error: 'f(x) has no value at one of the x-values.' };
    } else {
      if (xsS.length !== ysS.length) return { ok: false, error: 'I found ' + xsS.length + ' x-values but ' + ysS.length + ' y-values. They must match, one y for each x.' };
      const pl = E.parseLists(xsS.join(','), ysS.join(','));
      if (pl.error) return { ok: false, error: pl.error };
      F = pl.F; [xs, ys] = pl.lists;
      // a question written in decimals is worked in decimals, like on the calculator
      if (F.exact && xsS.concat(ysS).some((v) => /\./.test(v))) { F = E.RF; xs = xs.map((v) => v.toNumber()); ys = ys.map((v) => v.toNumber()); }
    }
    if (xs.length < 2) return missing('at least 2 points', topic);
    if (xs.length > 8) return { ok: false, error: 'Please use at most 8 points.' };
    const dup = E.checkDistinct(xs, F);
    if (dup) return { ok: false, error: dup };
    // where to evaluate: kept exact when everything else is exact
    const tv = tList.slice(0, topic === 'ndd' ? 2 : 1).map((v) => E.parseValue(v));
    if (tv.some((v) => v.error)) return { ok: false, error: tv.find((v) => v.error).error };
    if (F.exact && tv.some((v) => !v.F.exact)) { F = E.RF; xs = xs.map((v) => v.toNumber()); ys = ys.map((v) => v.toNumber()); }
    const ts = tv.map((v) => (F.exact ? v.v : v.v instanceof E.Q ? v.v.toNumber() : v.v));
    const IP = NM.interp, n = xs.length;
    const pts = xs.map((x, k) => '(' + IP.v(x) + ', ' + IP.v(ys[k]) + ')').join(', ');
    const said = '<b>' + NAME[topic] + '</b> · ' + n + ' points ' + pts + (fx && !ysS ? ' from <i>f</i>(<i>x</i>) = ' + fx.html : '') + (ts.length ? ' · find ' + ts.map((t) => '<i>P</i>(' + IP.v(t) + ')').join(' and ') : '');
    const valueOnly = topic === 'lagrange' && ts.length > 0 && /\bonly\b|shortcut|just the value/.test(low);
    const big = xs.some((x) => Math.abs(F.num(x)) >= 100);
    return {
      ok: true, topic, said, text,
      build() {
        const sol = topic === 'ndd'
          ? IP.nddBoard(xs, ys, F, { t: ts[0] !== undefined ? ts[0] : null, t2: ts[1], expand: !big })
          : IP.lagrangeBoard(xs, ys, F, { t: ts[0] !== undefined ? ts[0] : null, valueOnly });
        const trig = !!fx && /sin|cos|tan|pi/.test(fx.text);
        sol.given.remember = IP.remember({ trig: trig || xsS.some((v) => /pi/.test(v)), exp: !!fx && /e\^|exp/.test(fx.text), exact: F.exact, n });
        return sol;
      },
    };
  }

  function errorProblem(fx, nodesS, tList, text) {
    const topic = 'interp-error';
    const need = [];
    if (!fx) need.push('the function, like f(x) = e^x');
    if (!nodesS || nodesS.length < 2) need.push('the nodes, like nodes −1, 0, 1');
    if (!tList.length) need.push('the x where you want the error, like at x = 0.25');
    if (need.length) return missing(need.join(', '), topic);
    const xs = nodesS.map((v) => E.evalNumber(v));
    if (xs.some((v) => !isFinite(v))) return { ok: false, error: 'I could not read one of the nodes.' };
    if (xs.length > 10) return { ok: false, error: 'Use 2 to 10 nodes.' };
    if (E.checkDistinct(xs, E.RF)) return { ok: false, error: 'The nodes must all be different.' };
    const x = E.evalNumber(tList[0]);
    if (!isFinite(x)) return { ok: false, error: 'I could not read the x where you want the error.' };
    const labels = nodesS.some((v) => /pi/.test(v)) ? nodesS.map(pretty) : null;
    const said = '<b>' + NAME[topic] + '</b> · <i>f</i>(<i>x</i>) = ' + fx.html + ' · ' + xs.length + ' nodes ' + (labels || nodesS.map(pretty)).join(', ') + ' · at <i>x</i> = ' + pretty(tList[0]);
    return { ok: true, topic, said, text, build: () => NM.interp.errorBoard(fx, xs, x, labels ? { labels } : {}) };
  }

  NM.problem = { read, TOPICS, EXAMPLE };
})(window.NM);
