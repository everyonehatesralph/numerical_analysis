/* roots-shared.js — function banks and helpers shared by the root-finding topics. */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h } = UI;
  const RT = (NM.roots = {});

  /* Equations with exactly one root in [a, a+1] (good for bisection drills). */
  RT.bank = [
    { f: 'x^3 + x - 1', a: 0, b: 1, src: 'Example 1.1' },
    { f: 'x^3 - 9', a: 2, b: 3, src: 'Exercise 1(a)' },
    { f: '3x^3 + x^2 - x - 5', a: 1, b: 2, src: 'Exercise 1(b)' },
    { f: 'cos(x) - x', a: 0, b: 1, src: 'Example 1.2', trig: true },
    { f: 'x^5 + x - 1', a: 0, b: 1, src: 'Exercise 2(a)' },
    { f: 'ln(x) + x^2 - 3', a: 1, b: 2, src: 'Exercise 2(c)' },
    { f: 'x^2 - 2', a: 1, b: 2, src: '√2' },
    { f: 'x^2 - 3', a: 1, b: 2, src: '√3' },
    { f: 'x^2 - 5', a: 2, b: 3, src: '√5' },
    { f: 'x^3 - 2', a: 1, b: 2, src: '∛2' },
    { f: 'x^3 - 2x - 5', a: 2, b: 3, src: 'classic' },
    { f: 'e^x - 3', a: 1, b: 2, src: 'ln 3' },
    { f: 'e^(-x) - x', a: 0, b: 1, src: '' },
    { f: 'x^3 + 4x^2 - 10', a: 1, b: 2, src: '' },
    { f: 'x^4 - x^3 - 10', a: 2, b: 3, src: 'Exercise 5' },
    { f: 'cos(x) - sin(x)', a: 0, b: 1, src: 'Computer Problem 6', trig: true },
    { f: '2x^3 - 6x - 1', a: 1, b: 2, src: 'Computer Problem 3(a)' },
  ];
  /* g(x) for fixed-point drills: all converge from x0. */
  RT.fpiBank = [
    { g: 'cos(x)', x0: 0, trig: true, from: 'cos x = x' },
    { g: 'cos(x)', x0: 1, trig: true, from: 'cos x = x' },
    { g: '(1 - x)^(1/3)', x0: 0.5, from: 'x³ + x − 1 = 0' },
    { g: '(1 + 2x^3)/(1 + 3x^2)', x0: 0.5, from: 'x³ + x − 1 = 0' },
    { g: 'e^(-x)', x0: 0.5, from: 'x − e^(−x) = 0' },
    { g: 'sqrt(x + 2)', x0: 1, from: 'x² − x − 2 = 0' },
    { g: '(2x + 5)^(1/3)', x0: 2, from: 'x³ − 2x − 5 = 0' },
    { g: '1 + 1/x', x0: 1, from: 'x² − x − 1 = 0' },
    { g: 'sqrt(10/(4 + x))', x0: 1.5, from: 'x³ + 4x² − 10 = 0' },
    { g: 'x + cos(x) - sin(x)', x0: 0, trig: true, from: 'cos x = sin x' },
    { g: '(x + 1)^(1/3)', x0: 1, from: 'x³ − x − 1 = 0' },
    { g: '0.5(x + 3/x)', x0: 1, from: 'x² = 3' },
  ];
  /* f(x) and x0 for Newton/secant drills. */
  RT.newtonBank = [
    { f: 'x^3 + x - 1', x0: -0.7, x1: 0, src: 'Example 1.11' },
    { f: 'x^3 + x - 1', x0: 1, x1: 0 },
    { f: 'x^3 - 2x - 5', x0: 2, x1: 3 },
    { f: 'x^2 - 2', x0: 1, x1: 2 },
    { f: 'x^2 - 5', x0: 2, x1: 3 },
    { f: 'x^3 - 9', x0: 2, x1: 3 },
    { f: 'cos(x) - x', x0: 1, x1: 0, trig: true },
    { f: 'e^x - 3', x0: 1, x1: 2 },
    { f: 'x^3 + 4x^2 - 10', x0: 1.5, x1: 1 },
    { f: 'x^4 - x^3 - 10', x0: 2, x1: 3 },
    { f: 'ln(x) + x^2 - 3', x0: 1.5, x1: 2 },
    { f: 'x - e^(-x)', x0: 0.5, x1: 1 },
    { f: '3x^3 + x^2 - x - 5', x0: 1, x1: 2 },
  ];
  RT.fx = (s) => E.compile(s);
  RT.html = (s) => E.compile(s).html;
  RT.trigNote = '<p class="small muted">This has sin/cos, so your calculator must be in <b>radian</b> mode.</p>';

  /* Fit a plot around a set of x-values, always showing the x-axis. */
  RT.fitAround = (plot, f, xs, opt) => {
    const good = xs.filter((v) => isFinite(v));
    let lo = Math.min(...good), hi = Math.max(...good);
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * ((opt && opt.pad) || 0.35);
    plot.fit({ fns: [f], x0: lo - pad, x1: hi + pad, xpad: 0, robust: true });
  };

  /* "Follow" checkbox used by the walks to zoom in on the current step. */
  RT.followToggle = (w, initial, onChange) => {
    const cb = h('input', { type: 'checkbox' });
    cb.checked = !!initial;
    const lab = h('label', { class: 'row small', style: { gap: '6px', cursor: 'pointer', marginLeft: 'auto' } }, cb, 'Zoom in on each step');
    cb.addEventListener('change', () => onChange(cb.checked));
    w.el.querySelector('.walk-ctrl').appendChild(lab);
    return cb;
  };

  /* Values table with signs, like a calculator TABLE (MODE 7) — finds intervals of length one. */
  RT.signTable = (f, from, to) => {
    const rows = [], changes = [];
    let prev = null;
    for (let x = from; x <= to; x++) {
      const v = f(x);
      rows.push(['<i>x</i> = ' + x, isFinite(v) ? E.fmtShort(v, 4) + ' ' + UI.M.sign(v) : 'undefined']);
      if (prev && isFinite(prev.v) && isFinite(v) && Math.sign(prev.v) !== Math.sign(v) && v !== 0) changes.push([prev.x, x]);
      if (v === 0) changes.push([x, x]);
      prev = { x, v };
    }
    return { rows, changes };
  };
})(window.NM);
