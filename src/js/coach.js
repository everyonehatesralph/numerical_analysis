/* Guided calculation practice. Questions are plain, serializable data so a
   missed calculation can be retried after closing the app, without a server. */
(function (NM) {
  'use strict';
  const { E, UI } = NM, { h } = UI, R = UI.rand;
  const C = (NM.coach = {});
  const show = (v) => E.fmtShort(v, 12);
  const step = (label, expression, answer, explanation, extra) => Object.assign({ label, expression, answer, explanation }, extra || {});
  const op = (label, a, operator, b, explanation) => {
    const answer = operator === '+' ? a + b : operator === '-' ? a - b : operator === '×' ? a * b : a / b;
    return step(label, '(' + show(a) + ') ' + operator + ' (' + show(b) + ')', answer, explanation, { operator, a, b });
  };
  const evaluate = (label, fc, x) => step(label, fc.text.replace(/\bx\b/g, '(' + show(x) + ')'), fc.f(x), 'Substitute into the function. Keep negative values in parentheses and use radians for trigonometric functions.');
  const data = () => { const xs = R.distinct(3, -2, 4).sort((a, b) => a - b); return { xs, ys: xs.map(() => R.int(-5, 8)) }; };
  const points = (xs, ys) => xs.map((x, i) => '(' + x + ', ' + ys[i] + ')').join(', ');
  const make = (title, prompt, steps, summary) => ({ id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9), title, prompt, steps, summary: summary || '' });
  const generators = {
    horner() {
      const c = [R.nz(-3, 3), R.int(-4, 4), R.int(-4, 4), R.int(-4, 4)], x = R.pick([-2, -0.5, 0.5, 2]);
      const fc = E.compile(E.poly.text(c.slice().reverse(), E.RF, 12)), steps = [];
      let total = c[0];
      for (let k = 1; k < c.length; k++) {
        steps.push(op('Multiply the running total by x', total, '×', x, 'Multiply before adding the next coefficient.'));
        steps.push(op('Add coefficient ' + (k + 1), total * x, '+', c[k], 'Keep the sign of the next coefficient. This is the new running total.'));
        total = total * x + c[k];
      }
      return make('Horner: multiply, then add', 'Evaluate P(x) = ' + fc.text + ' at x = ' + x + '. Start with the leading coefficient, ' + c[0] + '.', steps, 'The final running total is P(' + x + ').');
    },
    bisection() {
      const fc = E.compile('x^2 - ' + R.pick([2, 3]));
      let a = 1, b = 2;
      const steps = [];
      for (let i = 0; i < 2; i++) {
        const c = (a + b) / 2, fa = fc.f(a), value = fc.f(c);
        steps.push(op('Iteration ' + (i + 1) + ': add the endpoints', a, '+', b, 'Add the two current endpoints before dividing by 2.'));
        steps.push(op('Find the midpoint', a + b, '÷', 2, 'The midpoint must lie between the two endpoints.'));
        steps.push(evaluate('Evaluate f at the midpoint', fc, c));
        const left = Math.sign(fa) !== Math.sign(value);
        steps.push({ label: 'Keep the sign change', expression: 'f(' + a + ') = ' + show(fa) + '; f(' + c + ') = ' + show(value) + '; f(' + b + ') = ' + show(fc.f(b)), choices: ['[' + a + ', ' + c + ']', '[' + c + ', ' + b + ']'], correct: left ? 0 : 1, explanation: 'Keep the half whose endpoint function values have opposite signs. Replace the endpoint with the same sign as f(c).' });
        if (left) b = c; else a = c;
      }
      return make('Bisection: midpoint, value, sign', 'Use two bisection steps for f(x) = ' + fc.text + ' on [1, 2]. This polynomial is continuous and the endpoint signs differ.', steps, 'The retained interval is [' + a + ', ' + b + ']. Its midpoint is the next root estimate.');
    },
    fpi() {
      const A = R.pick([2, 3, 5]); let x = R.pick([1, 2]); const x0 = x, steps = [];
      for (let i = 0; i < 2; i++) {
        const quotient = A / x;
        steps.push(op('Iteration ' + (i + 1) + ': divide A by the current x', A, '÷', x, 'Use the current iterate, not the original guess.'));
        steps.push(op('Add the current x', x, '+', quotient, 'Keep the full quotient in the calculator.'));
        steps.push(op('Divide the whole sum by 2', x + quotient, '÷', 2, 'The brackets in g(x) = (x + A/x)/2 apply to the whole sum.'));
        x = (x + quotient) / 2;
      }
      return make('Fixed-point iteration: use the last answer', 'Use g(x) = (x + ' + A + '/x)/2 from x₀ = ' + x0 + '. Find x₁ and x₂. This iteration approximates √' + A + '.', steps, 'The final value is x₂. A small change alone does not certify a number of correct decimal places.');
    },
    newton() {
      const it = R.pick(NM.roots.newtonBank.filter((v) => !v.trig)), fc = E.compile(it.f), d = E.derivative(fc.node), steps = [];
      let x = it.x0;
      for (let i = 0; i < 2; i++) {
        const fx = fc.f(x), df = d.f(x);
        steps.push(evaluate('Iteration ' + (i + 1) + ': evaluate f(x)', fc, x));
        steps.push(evaluate('Evaluate f′(x)', d, x));
        steps.push(op('Calculate the correction f / f′', fx, '÷', df, 'Function value goes on top; derivative goes below.'));
        steps.push(op('Subtract the correction from x', x, '-', fx / df, 'Newton uses x − f/f′. Subtracting a negative correction increases x.'));
        x -= fx / df;
      }
      return make('Newton: value, derivative, correction', 'For f(x) = ' + fc.text + ', use f′(x) = ' + d.text + ' and x₀ = ' + it.x0 + '. Calculate two Newton steps.', steps, 'The final value is x₂. Verify it by evaluating f(x₂).');
    },
    secant() {
      const it = R.pick(NM.roots.newtonBank.filter((v) => !v.trig)), fc = E.compile(it.f);
      const a = it.x0, b = it.x1, fa = fc.f(a), fb = fc.f(b), dx = b - a, df = fb - fa;
      return make('Secant: keep the subtraction order', 'For f(x) = ' + fc.text + ', start with x₀ = ' + a + ' and x₁ = ' + b + '. Find x₂ = x₁ − f(x₁)(x₁ − x₀)/(f(x₁) − f(x₀)).', [
        evaluate('Evaluate f(x₀)', fc, a), evaluate('Evaluate f(x₁)', fc, b),
        op('Subtract x₁ − x₀', b, '-', a, 'Use newest minus older in both differences.'),
        op('Subtract f(x₁) − f(x₀)', fb, '-', fa, 'Keep the same order as the x-difference.'),
        op('Multiply the numerator', fb, '×', dx, 'Multiply f(x₁) by the x-difference before dividing.'),
        op('Divide by the function difference', fb * dx, '÷', df, 'Keep both differences in parentheses.'),
        op('Subtract the correction from x₁', b, '-', fb * dx / df, 'This gives x₂. For the next iteration, keep x₁ and x₂.'),
      ]);
    },
    lagrange() {
      const { xs, ys } = data(), k = R.int(0, 2), other = xs.map((_, i) => i).filter((i) => i !== k);
      let t; do { t = R.int(-3, 5); } while (xs.includes(t));
      const nu = other.map((j) => t - xs[j]), de = other.map((j) => xs[k] - xs[j]), N = nu[0] * nu[1], D = de[0] * de[1];
      const steps = other.map((j) => op('Numerator factor: t − x' + (j + 1), t, '-', xs[j], 'Skip your own point when building L' + (k + 1) + '.'));
      steps.push(op('Multiply the numerator factors', nu[0], '×', nu[1], 'Keep negative factors in parentheses.'));
      other.forEach((j) => steps.push(op('Denominator factor: x' + (k + 1) + ' − x' + (j + 1), xs[k], '-', xs[j], 'The denominator uses your own node minus the other node.')));
      steps.push(op('Multiply the denominator factors', de[0], '×', de[1], 'Two negative factors give a positive product.'), op('Divide to find L' + (k + 1) + '(' + t + ')', N, '÷', D, 'Numerator product divided by denominator product.'), op('Multiply by y' + (k + 1), ys[k], '×', N / D, 'This is one contribution yₖLₖ(t). Add all contributions to find P(t).'));
      return make('Lagrange: one basis polynomial', 'Data: ' + points(xs, ys) + '. Find L' + (k + 1) + '(' + t + ') and its weighted contribution to P(' + t + ').', steps);
    },
    ndd() {
      const { xs, ys } = data(), dd = E.divDiff(xs, ys, E.RF), steps = [];
      for (let j = 1; j < xs.length; j++) for (let i = 0; i < xs.length - j; i++) {
        const o = dd.ops[j][i], name = 'f[' + xs.slice(i, i + j + 1).join(', ') + ']';
        steps.push(op(name + ': numerator', o.bot, '-', o.top, 'Subtract lower minus upper from the previous column.'));
        steps.push(op(name + ': denominator', xs[i + j], '-', xs[i], 'End of the whole span minus start. ' + (j > 1 ? 'This column skips the middle x-value.' : 'These are neighboring x-values.')));
        steps.push(op(name + ': divide', o.nu, '÷', o.de, 'Divide the numerator by the span width. Keep the full result for the next column.'));
      }
      return make('Divided differences: one cell at a time', 'Build the divided-difference triangle for ' + points(xs, ys) + '. Each cell has three calculations: numerator, denominator, division.', steps, 'Read the top edge for the Newton coefficients: ' + dd.coef.map(show).join(', ') + '.');
    },
    'interp-error'() {
      const xs = [0, 0.5, 1], x = R.pick([0.25, 0.75]), exponential = R.pick([true, false]), M = exponential ? Math.E : 1, factors = xs.map((v) => x - v), prod = factors.reduce((p, v) => p * v, 1);
      const steps = [step('Count the nodes', 'n = number of data points', 3, 'Three nodes means degree at most 2, a third derivative, and 3!.', { tol: 0 })];
      xs.forEach((v, i) => steps.push(op('Product factor ' + (i + 1), x, '-', v, 'Subtract each node from the evaluation point.')));
      steps.push(op('Multiply the first two factors', factors[0], '×', factors[1], 'Keep the signs until the product is complete.'), op('Multiply by the last factor', factors[0] * factors[1], '×', factors[2], 'Use the absolute value of the completed product in the error bound.'), step('Take the absolute value', '|' + show(prod) + '|', Math.abs(prod), 'An error bound is nonnegative.'), op('Divide by 3! = 6', Math.abs(prod), '÷', 6, 'Use the number of nodes, not the polynomial degree.'), op('Multiply by the derivative bound M', Math.abs(prod) / 6, '×', M, 'M is an upper bound over the whole interval, not just at x.'));
      return make('Interpolation error: product, factorial, derivative', 'Interpolate ' + (exponential ? 'e^x' : 'sin(x)') + ' at 0, 0.5, 1. Bound the error at x = ' + x + '. Use M = ' + (exponential ? 'e' : '1') + ' for the third derivative on [0, 1].', steps);
    },
    chebyshev() {
      const n = R.int(3, 5), i = R.int(1, n), [a, b] = R.pick([[-1, 1], [0, 2], [1, 3]]), mid = (a + b) / 2, half = (b - a) / 2, angle = (2 * i - 1) * Math.PI / (2 * n);
      return make('Chebyshev: stretch and shift', 'Find node x' + i + ' of ' + n + ' Chebyshev nodes on [' + a + ', ' + b + ']. Use xᵢ = (a+b)/2 + (b−a)/2 × cos((2i−1)π/(2n)). Set your calculator to radians.', [
        op('Add a + b', a, '+', b, 'This sum is used for the midpoint.'), op('Find the midpoint', a + b, '÷', 2, 'The midpoint shifts the nodes to the new interval.'),
        op('Find the interval width', b, '-', a, 'Use right endpoint minus left endpoint.'), op('Find the half-width', b - a, '÷', 2, 'This scales the nodes from [−1, 1].'),
        op('Calculate the angle in radians', (2 * i - 1) * Math.PI, '÷', 2 * n, 'Bracket both the whole numerator and the whole denominator.'), step('Take the cosine', 'cos(' + show(angle) + ')', Math.cos(angle), 'Use radians and keep full precision.'),
        op('Multiply by the half-width', half, '×', Math.cos(angle), 'Scale the cosine before adding the midpoint.'), op('Add the midpoint', mid, '+', half * Math.cos(angle), 'The result must lie inside [' + a + ', ' + b + '].'),
      ]);
    },
    spline() {
      const xs = [0, 1, 3], ys = xs.map(() => R.int(-4, 5)), h1 = 1, h2 = 2, dy1 = ys[1] - ys[0], dy2 = ys[2] - ys[1], s1 = dy1 / h1, s2 = dy2 / h2;
      return make('Natural spline: find the inside coefficient', 'Data: ' + points(xs, ys) + '. Natural ends give c₁ = c₃ = 0. Find c₂ = 3(Δ₂/δ₂ − Δ₁/δ₁) / (2(δ₁+δ₂)).', [
        op('First width δ₁', xs[1], '-', xs[0], 'Widths use x-values.'), op('Second width δ₂', xs[2], '-', xs[1], 'Unequal gaps need their own widths.'),
        op('First rise Δ₁', ys[1], '-', ys[0], 'Rises use y-values, in the same order.'), op('Second rise Δ₂', ys[2], '-', ys[1], 'Keep the sign of the rise.'),
        op('First data slope', dy1, '÷', h1, 'Rise divided by width.'), op('Second data slope', dy2, '÷', h2, 'Use this gap’s width.'),
        op('Change in slope', s2, '-', s1, 'Second slope minus first slope.'), op('Multiply by 3', 3, '×', s2 - s1, 'The factor 3 belongs in the c-equation.'),
        op('Add the two widths', h1, '+', h2, 'Use both adjacent widths.'), op('Multiply that sum by 2', 2, '×', h1 + h2, 'This is the coefficient multiplying c₂.'),
        op('Solve for c₂', 3 * (s2 - s1), '÷', 2 * (h1 + h2), 'Divide both sides by the coefficient of c₂.'),
      ], 'Use c₁ = c₃ = 0 and this c₂ to compute the b and d coefficients in independent practice.');
    },
    diff() {
      const fc = E.compile(R.pick(['e^x', 'sin(x)', 'x^3'])), x = R.pick([0.5, 1, 2]), hh = R.pick([0.1, 0.2]), second = R.pick([true, false]), r = E.diffFormulas(fc.f, x, hh);
      const steps = [evaluate('Evaluate f(x − h)', fc, x - hh)];
      if (second) steps.push(evaluate('Evaluate f(x)', fc, x));
      steps.push(evaluate('Evaluate f(x + h)', fc, x + hh));
      if (second) steps.push(op('Multiply f(x) by 2', 2, '×', r.f0, 'This is multiplication: write 2 × (f(x)).'), op('Subtract 2f(x) from f(x − h)', r.fm, '-', 2 * r.f0, 'Bracket the whole product when subtracting.'), op('Add f(x + h)', r.fm - 2 * r.f0, '+', r.fp, 'Complete the numerator before dividing.'), op('Square the step size', hh, '×', hh, 'The second-derivative denominator is h².'), op('Divide to approximate f″(x)', r.fm - 2 * r.f0 + r.fp, '÷', hh * hh, 'Use full function values; rounding before subtraction can magnify the error.'));
      else steps.push(op('Subtract the function values', r.fp, '-', r.fm, 'Forward-side value minus backward-side value.'), op('Calculate 2h', 2, '×', hh, 'Centered first differences divide by 2h, not h.'), op('Divide to approximate f′(x)', r.fp - r.fm, '÷', 2 * hh, 'Divide the completed numerator by 2h.'));
      return make('Differentiation: build the numerator carefully', 'For f(x) = ' + fc.text + ' at x = ' + x + ' with h = ' + hh + ', use ' + (second ? 'f″(x) ≈ [f(x−h) − 2f(x) + f(x+h)]/h².' : 'f′(x) ≈ [f(x+h) − f(x−h)]/(2h).') + ' Use radians for sin.', steps);
    },
    integrate() {
      const method = R.pick(['trap', 'simpson', 'midpoint']), fc = E.compile(R.pick(['x^2', 'e^x'])), a = 0, b = 1, n = 2, res = E.integrate(fc.f, a, b, n, method);
      const name = { trap: 'Trapezoid', simpson: 'Simpson', midpoint: 'Midpoint' }[method], steps = [op('Find the interval width', b, '-', a, 'Right limit minus left limit.'), op('Find h', b - a, '÷', n, 'Divide the width by the number of equal subintervals.')];
      res.pts.forEach((p) => steps.push(evaluate('Evaluate f(' + show(p.x) + ')', fc, p.x)));
      res.pts.filter((p) => p.w !== 1).forEach((p) => steps.push(op('Apply weight ' + p.w + ' at x = ' + show(p.x), p.w, '×', p.y, method === 'simpson' ? 'Simpson weights for n = 2 are 1, 4, 1.' : 'Trapezoid weights for n = 2 are 1, 2, 1.')));
      let sum = res.pts[0].w * res.pts[0].y;
      res.pts.slice(1).forEach((p) => { steps.push(op('Add the next weighted value', sum, '+', p.w * p.y, 'Add the weighted values, not the unweighted values.')); sum += p.w * p.y; });
      if (method !== 'midpoint') steps.push(op('Calculate the rule’s multiplier', res.h, '÷', method === 'trap' ? 2 : 3, 'Trapezoid uses h/2; Simpson uses h/3.'));
      steps.push(op('Multiply to approximate the integral', res.factor, '×', res.sum, 'Multiply the completed sum by the rule’s multiplier.'));
      return make(name + ': weights, sum, multiplier', 'Approximate the integral of ' + fc.text + ' from 0 to 1 with ' + name + ' and n = 2 equal subintervals. ' + (method === 'midpoint' ? 'Use the midpoint of each subinterval.' : 'Evaluate the function at 0, 0.5, 1.'), steps);
    },
  };

  C.create = (id) => generators[id]();
  C.tolerance = (s) => s.tol !== undefined ? s.tol : Math.max(0.5 * Math.pow(10, -UI.dp()), Math.abs(s.answer) * 1e-10);
  C.feedback = (s, raw) => {
    const u = E.evalNumber(raw);
    if (!isFinite(u)) return 'Enter a number or fraction, such as -7/6. Put both parts of a division in parentheses.';
    const matches = (v) => isFinite(v) && Math.abs(u - v) <= C.tolerance(s);
    if (s.operator === '-' && s.a !== s.b && matches(s.b - s.a)) return 'Check the subtraction order. Use the first value minus the second, with negative values in parentheses.';
    if (s.operator === '÷' && s.a !== 0 && s.a !== s.b && matches(s.b / s.a)) return 'Check the fraction order: the first value is the numerator, and the second is the denominator.';
    if (s.answer !== 0 && matches(-s.answer)) return 'Check the sign. Keep negative values in parentheses when entering the calculation.';
    return s.explanation + ' Keep full calculator precision, then enter a fraction or at least ' + UI.dp() + ' decimal places.';
  };

  // Validate restored data and render its strings as text, never HTML.
  C.validQuestion = (q) => q && typeof q.id === 'string' && typeof q.title === 'string' && typeof q.prompt === 'string' && Array.isArray(q.steps) && q.steps.length > 0 && q.steps.length <= 64 && q.steps.every((s) => s && typeof s.label === 'string' && typeof s.expression === 'string' && typeof s.explanation === 'string' && (Array.isArray(s.choices) ? s.choices.length > 1 && s.choices.every((c) => typeof c === 'string') && Number.isInteger(s.correct) && s.correct >= 0 && s.correct < s.choices.length : Number.isFinite(s.answer) && (s.tol === undefined || Number.isFinite(s.tol) && s.tol >= 0)));
  C.validMistake = (r) => !!(r && typeof r.id === 'string' && NM.topic(r.topic) && C.validQuestion(r.question) && Number.isInteger(r.index) && r.index >= 0 && r.index < r.question.steps.length && Number.isFinite(r.due) && Number.isInteger(r.attempts) && r.attempts >= 1 && Number.isInteger(r.repeats) && r.repeats >= 0 && r.repeats <= 3);
  const day = 86400000;
  C.mistakes = {
    all() { const rows = UI.store.get('mistakes', []); return Array.isArray(rows) ? rows.filter(C.validMistake) : []; },
    due(topic) { return this.all().filter((r) => (!topic || r.topic === topic) && r.due <= Date.now()).sort((a, b) => a.due - b.due); },
    record(topic, question, index, raw) {
      const rows = this.all(), id = question.id + ':' + index, existing = rows.find((r) => r.id === id);
      if (existing) { existing.attempts++; existing.lastAnswer = String(raw).slice(0, 80); }
      else rows.push({ id, topic, question, index, attempts: 1, lastAnswer: String(raw).slice(0, 80), due: Date.now() + day, repeats: 0 });
      UI.store.set('mistakes', rows.slice(-60));
      return id;
    },
    review(id, clean) {
      const rows = this.all(), r = rows.find((row) => row.id === id);
      if (!r) return;
      r.repeats = clean ? Math.min(3, (r.repeats || 0) + 1) : 0;
      r.due = Date.now() + [1, 3, 7, 14][r.repeats] * day;
      r.reviewed = Date.now();
      UI.store.set('mistakes', rows);
    },
  };

  C.mount = (parent, topic, options) => {
    const o = options || {}, q = o.question || C.create(topic.id);
    if (!C.validQuestion(q)) { parent.appendChild(h('p', { text: 'This saved calculation is unavailable. Start a fresh guided question.' })); return; }
    let i = o.index || 0, helped = false, wrong = 0, completed = false;
    const end = o.reviewId ? i + 1 : q.steps.length;
    const answers = [], host = h('div', { class: 'coach' });
    parent.appendChild(host);
    function finish() {
      if (!completed) {
        completed = true;
        if (o.reviewId) C.mistakes.review(o.reviewId, !helped && wrong === 0);
        UI.progress.patch(topic.id, (p) => ({ guided: p.guided + 1 }));
      }
      host.innerHTML = '';
      host.appendChild(h('h3', { text: o.reviewId ? 'Review complete' : 'Guided question complete' }));
      if (q.summary && !o.reviewId) host.appendChild(h('p', { text: q.summary }));
      host.appendChild(h('p', { text: 'Guided practice builds the method. Try a fresh problem without hints to check what you can do independently.' }));
      host.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => o.onIndependent && o.onIndependent() }, 'Try independently'), h('button', { class: 'btn', type: 'button', onclick: () => { parent.innerHTML = ''; C.mount(parent, topic, { onIndependent: o.onIndependent }); } }, 'Another guided question')));
      if (wrong) host.appendChild(h('p', { class: 'muted small', text: 'Missed calculations are saved for tomorrow in Review mistakes. You can also retry them now.' }));
      if (o.reviewId) host.appendChild(h('p', { class: 'muted small', text: helped || wrong ? 'Review this calculation again tomorrow.' : 'Your next review is in a few days.' }));
      if (o.reviewId) host.appendChild(h('a', { class: 'btn', href: '#/t/' + topic.id + '/practice/review', text: 'Back to saved calculations' }));
    }
    function render(focus) {
      if (i >= end) { finish(); return; }
      host.innerHTML = '';
      const s = q.steps[i], answerId = 'coach-answer', feedbackId = 'coach-feedback';
      host.appendChild(h('h3', { text: q.title }));
      host.appendChild(h('p', { text: q.prompt }));
      host.appendChild(h('p', { class: 'coach-count', text: o.reviewId ? 'Retry one saved calculation · no timer' : 'Calculation ' + (i + 1) + ' of ' + q.steps.length + ' · no timer' }));
      const earlier = q.steps.slice(0, i);
      if (earlier.length) host.appendChild(h('details', { class: 'coach-history' }, h('summary', { text: o.index ? 'Earlier values for this retry' : 'Your completed calculations' }), h('ol', null, earlier.map((s, k) => h('li', { text: s.label + ': ' + (s.choices ? s.choices[s.correct] : show(s.answer)) + (answers[k] === 'help' ? ' (shown with help)' : '') })))));
      host.appendChild(h(s.choices ? 'p' : 'label', { class: 'coach-label', for: s.choices ? null : answerId, text: s.label }));
      host.appendChild(h('div', { class: 'coach-expression', text: s.expression }));
      const feedback = h('div', { id: feedbackId, class: 'coach-feedback', role: 'status', 'aria-live': 'polite' });
      const hint = h('p', { class: 'coach-hint', hidden: true, text: s.explanation });
      const actions = h('div', { class: 'row coach-actions' });
      const next = h('button', { class: 'btn primary', type: 'button', hidden: true, onclick: () => { i++; render(true); } }, o.reviewId ? 'Finish this review' : i + 1 === end ? 'Finish guided question' : 'Next calculation');
      let locked = false;
      const passed = (withHelp) => {
        if (locked) return;
        locked = true;
        answers[i] = withHelp ? 'help' : 'correct';
        feedback.className = 'coach-feedback fb ok';
        feedback.textContent = withHelp ? 'Step shown: ' + (s.choices ? s.choices[s.correct] : show(s.answer)) + '. Read it, then continue.' : 'Correct. Continue when you’re ready.';
        check.disabled = true; reveal.disabled = true; hintButton.disabled = true;
        check.hidden = reveal.hidden = hintButton.hidden = true;
        if (input) { input.readOnly = true; input.setAttribute('aria-invalid', 'false'); }
        choiceButtons.forEach((b) => { b.disabled = true; });
        next.hidden = false;
      };
      let input = null, choiceButtons = [];
      const check = h('button', { class: 'btn primary', type: 'button' }, 'Check this calculation');
      if (s.choices) {
        const choices = h('div', { class: 'choices' });
        choiceButtons = s.choices.map((label, index) => h('button', { type: 'button', class: 'choice', onclick: () => {
          if (locked) return;
          if (index === s.correct) passed(false);
          else { wrong++; C.mistakes.record(topic.id, q, i, label); feedback.className = 'coach-feedback fb no'; feedback.textContent = s.explanation; }
        } }, label));
        choices.append(...choiceButtons); host.appendChild(choices); check.hidden = true;
      } else {
        input = h('input', { id: answerId, type: 'text', class: 'coach-input mono', autocomplete: 'off', spellcheck: 'false', 'aria-describedby': feedbackId, 'aria-label': s.label });
        const submit = () => {
          if (locked) return;
          if (!input.value.trim()) { feedback.className = 'coach-feedback'; feedback.textContent = 'Enter your answer first. Fractions are welcome.'; input.focus(); return; }
          if (UI.judge(input.value, s.answer, C.tolerance(s)) === 'ok') passed(false);
          else { wrong++; C.mistakes.record(topic.id, q, i, input.value); input.setAttribute('aria-invalid', 'true'); feedback.className = 'coach-feedback fb no'; feedback.textContent = C.feedback(s, input.value); }
        };
        check.addEventListener('click', submit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); locked ? next.click() : submit(); } });
        host.appendChild(input);
      }
      const hintButton = h('button', { class: 'btn', type: 'button', onclick: () => { helped = true; hint.hidden = false; } }, 'Explain this step');
      const reveal = h('button', { class: 'btn', type: 'button', onclick: () => { helped = true; hint.hidden = false; C.mistakes.record(topic.id, q, i, 'Step shown with help'); passed(true); } }, 'Show this step');
      actions.append(check, hintButton, reveal, next);
      host.append(feedback, hint, actions);
      host.appendChild(h('p', { class: 'muted small', text: 'Use full precision in your calculator. Enter fractions or at least ' + UI.dp() + ' decimal places. Guided questions do not count as independent solves.' }));
      if (focus && input) input.focus();
    }
    render(false);
  };

  C.reviewList = (parent, topic, onIndependent) => {
    const rows = C.mistakes.all().filter((r) => r.topic === topic.id).sort((a, b) => a.due - b.due);
    parent.appendChild(h('p', { text: 'Retry the exact calculation you missed. Earlier values are available, and the answer stays hidden until you try or ask for help.' }));
    if (!rows.length) { parent.appendChild(h('p', { class: 'muted', text: 'No saved calculations for this topic yet. Missed guided steps will appear here.' })); return; }
    const list = h('div', { class: 'mistake-list' }), active = h('div');
    rows.forEach((r) => {
      const due = r.due <= Date.now();
      const date = new Date(r.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      list.appendChild(h('div', { class: 'mistake-row' }, h('div', null, h('b', { text: r.question.steps[r.index].label }), h('p', { class: 'muted small', text: r.question.title + ' · ' + (due ? 'Due for review' : 'Review ' + date) })), h('button', { class: 'btn', type: 'button', onclick: () => { active.innerHTML = ''; list.hidden = true; C.mount(active, topic, { question: r.question, index: r.index, reviewId: r.id, onIndependent }); } }, 'Retry calculation')));
    });
    parent.append(list, active);
  };
})(typeof window !== 'undefined' ? window.NM : globalThis.NM);
