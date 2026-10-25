/* Checks the engine against the worked examples in Sauer, Numerical Analysis 2e.
   Run:  node tests/engine.test.js */
const NM = require('../src/js/engine.js');
const E = NM.E;
let pass = 0, fail = 0;
function near(name, got, want, tol = 1e-6) {
  const ok = Math.abs(got - want) <= tol;
  ok ? pass++ : fail++;
  if (!ok) console.log('FAIL', name, 'got', got, 'want', want);
}
function eq(name, got, want) {
  const ok = got === want;
  ok ? pass++ : fail++;
  if (!ok) console.log('FAIL', name, '\n  got ', JSON.stringify(got), '\n  want', JSON.stringify(want));
}
const Q = E.Q, QF = E.QF, RF = E.RF;
const q = (s) => Q.parse(s);

// ---- parser ----
const f1 = E.compile('x^3 + x - 1');
near('parse cubic', f1.f(0.5), -0.375);
near('cos x - x', E.compile('cos x - x').f(1), Math.cos(1) - 1);
near('implicit 3x^2', E.compile('3x^2+2x').f(2), 16);
near('e^(-x)', E.compile('e^(-x)').f(1), Math.exp(-1));
near('cbrt neg', E.compile('(1-x)^(1/3)').f(9), -2);
near('cos^2 x + 6 = x', E.compile('cos^2 x + 6 = x').f(2), Math.cos(2) ** 2 + 6 - 2);
near('ln x + x^2 = 3', E.compile('ln(x) + x^2 = 3').f(2), Math.log(2) + 1);
near('sin^-1', E.compile('sin^-1(0.5)').f(0), Math.PI / 6);
near('2x(x+1)', E.compile('2x(x+1)').f(3), 24);
near('xe^x', E.compile('xe^x').f(1), Math.E);
near('-x^2', E.compile('-x^2').f(3), -9);
near('2^-1', E.compile('2^-1').f(0), 0.5);
near('unicode', E.compile('x² − 2×x').f(3), 3);
eq('bad parse', E.compile('x +* 2').ok, false);
eq('unknown name', E.compile('y + 1').ok, false);

// ---- derivative ----
eq('d cubic', E.derivative(f1.node).text, '3*x^2 + 1');
eq('d cos x - x', E.derivative(E.compile('cos(x) - x').node).text, '-sin(x) - 1');
eq('d 3x^3+x^2-x-5', E.derivative(E.compile('3x^3+x^2-x-5').node).text, '9*x^2 + 2*x - 1');
eq('d e^x - 3', E.derivative(E.compile('e^x - 3').node).text, 'e^x');
const dfx = E.derivative(E.compile('(1-x)^(1/3)').node);
near('d cbrt', dfx.f(0.6823278), -0.716, 1e-3);
near('d g3 at root', E.derivative(E.compile('(1+2x^3)/(1+3x^2)').node).f(0.6823278038), 0, 1e-8);
near('d x+cos-sin', E.derivative(E.compile('x + cos(x) - sin(x)').node).f(Math.PI / 4), 1 - Math.SQRT2, 1e-12);
near('2nd deriv', E.nthDerivative(E.compile('x^4').node, 2).f(2), 48);
near('5th deriv e^x', E.nthDerivative(E.compile('e^x').node, 5).f(1), Math.E);
near('d ln', E.derivative(E.compile('ln(x)+x^2-3').node).f(2), 0.5 + 4);
near('d sqrt', E.derivative(E.compile('sqrt(x+2)').node).f(2), 1 / 4);

// ---- fractions ----
eq('Q parse', q('0.25').toString(), '1/4');
eq('Q add', q('1/2').add(q('1/3')).toString(), '5/6');
near('evalNumber', E.evalNumber('pi/4'), Math.PI / 4);
near('evalNumber frac', E.evalNumber('-3/4'), -0.75);
near('evalNumber sci x10', E.evalNumber('3.2x10^-5'), 3.2e-5, 1e-15);
near('evalNumber sci e', E.evalNumber('3.2e-5'), 3.2e-5, 1e-15);
near('evalNumber sci ×', E.evalNumber('3.2 × 10^-5'), 3.2e-5, 1e-15);

// ---- 0.1 nested multiplication ----
let h = E.horner([2, 3, -3, 5, -1].map((v) => Q.from(v)), q('1/2'), QF);
eq('nest 2x^4+3x^3-3x^2+5x-1 at 1/2', h.value.toString(), '5/4');
h = E.newtonEval([q('1'), q('1/2'), q('1/2'), q('-1/2')], [q('0'), q('2'), q('3'), q('1')], q('1'), QF);
eq('nest with base points at 1', h.value.toString(), '0');

// ---- 1.1 bisection ----
let b = E.bisection(f1.f, 0, 1, { steps: 10 });
const cs = b.rows.map((r) => +r.c.toFixed(4));
eq('bisection c column', cs.join(' '), '0.5 0.75 0.625 0.6875 0.6563 0.6719 0.6797 0.6836 0.6816 0.6826');
near('bisection best estimate', b.root, 0.6821, 1e-4);
b = E.bisection(E.compile('cos x - x').f, 0, 1, { tol: 0.5e-6 });
eq('bisection steps for 6 places', b.rows.length, 20);
near('bisection cos root', b.root, 0.739085, 1e-6);
eq('steps formula', E.bisectionStepsFor(1, 0.5e-6), 20);

// ---- 1.2 FPI ----
let r = E.fpi(E.compile('(1-x)^(1/3)').f, 0.5, { steps: 3 });
near('fpi x1', r.rows[1].x, 0.79370053, 1e-8);
near('fpi x2', r.rows[2].x, 0.59088011, 1e-8);
r = E.fpi(E.compile('(1+2x^3)/(1+3x^2)').f, 0.5, { steps: 4 });
near('fpi fast x3', r.rows[3].x, 0.68232842, 1e-8);
r = E.fpi(E.compile('x + cos x - sin x').f, 0, { steps: 20 });
near('fpi cos=sin', r.last, Math.PI / 4, 1e-7);

// ---- 1.4 Newton ----
const nw = E.newton(f1.f, E.derivative(f1.node).f, -0.7, { steps: 7 });
near('newton x1', nw.rows[0].next, 0.12712551, 1e-8);
near('newton x2', nw.rows[1].next, 0.95767812, 1e-8);
near('newton x6', nw.rows[5].next, 0.68232780, 1e-8);

// ---- 1.5 secant ----
const sc = E.secant(f1.f, 0, 1, { steps: 8 });
near('secant x2', sc.rows[0].next, 0.5);
near('secant x3', sc.rows[1].next, 7 / 11, 1e-14);
near('secant x4', sc.rows[2].next, 0.69005235602094, 1e-12);
const fp = E.falsePosition(E.compile('x^3 - 2x^2 + 1.5x').f, -1, 1, { steps: 2 });
near('false position x2', fp.rows[0].c, 0.8, 1e-12);

// ---- 3.1 Lagrange ----
const X3 = ['0', '2', '3'].map(q), Y3 = ['1', '2', '4'].map(q);
let lg = E.lagrange(X3, Y3, QF);
eq('lagrange 3.1', lg.poly.map(String).join(','), '1,-1/2,1/2');
lg = E.lagrange(['0', '1', '2', '3'].map(q), ['2', '1', '0', '-1'].map(q), QF);
eq('lagrange 3.2 collinear', lg.poly.map(String).join(','), '2,-1');
eq('lagrange html', E.poly.html(E.lagrange(X3, Y3, QF).poly, QF).includes('<sup>2</sup>'), true);
eq('lagrangeAt', E.lagrangeAt(X3, Y3, QF, q('1')).value.toString(), '1');

// ---- 3.1 divided differences ----
let dd = E.divDiff(['0', '2', '3', '1'].map(q), ['1', '2', '4', '0'].map(q), QF);
eq('ndd 3.4 top edge', dd.coef.map(String).join(','), '1,1/2,1/2,-1/2');
dd = E.divDiff(['-1', '0', '2', '3'].map(q), ['-5', '-1', '1', '11'].map(q), QF);
eq('ndd 3.6 top edge', dd.coef.map(String).join(','), '-5,4,-1,1');
dd = E.divDiff(['0', '1', '2', '3'].map(q), ['2', '1', '0', '-1'].map(q), QF);
eq('ndd 3.5 degree', E.degreeFromCoef(dd.coef, QF), 1);
eq('ndd expand', E.divDiff(X3, Y3, QF).poly.map(String).join(','), '1,-1/2,1/2');

// ---- 3.2 error bound, Example 3.8: e^x at -1,-.5,0,.5,1 ----
const prod = (x) => [-1, -0.5, 0, 0.5, 1].reduce((p, xi) => p * (x - xi), 1);
near('error bound x=0.25', Math.abs(prod(0.25)) / 120 * Math.E, 0.000995, 1e-6);
near('error bound x=0.75', Math.abs(prod(0.75)) / 120 * Math.E, 0.002323, 1e-6);

// ---- 3.3 Chebyshev ----
const ch = E.chebNodes(4, 0, Math.PI / 2);
near('cheb node 1', ch[0].x, Math.PI / 4 + (Math.PI / 4) * Math.cos(Math.PI / 8), 1e-12);
near('T3', E.chebT(3, 0.5), 4 * 0.125 - 3 * 0.5, 1e-12);

// ---- 3.4 natural spline (0,3),(1,-2),(2,1) ----
const sp = E.naturalSpline(['0', '1', '2'].map(q), ['3', '-2', '1'].map(q), QF);
eq('spline c', sp.c.map(String).join(','), '0,6,0');
eq('spline b', sp.b.map(String).join(','), '-7,-1');
eq('spline d', sp.d.map(String).join(','), '2,-2');
near('spline eval', sp.evalNum(1.5), -2 - 0.5 + 6 * 0.25 - 2 * 0.125, 1e-12);
const sp4 = E.naturalSpline(['1', '2', '4', '5'].map(q), ['2', '1', '4', '3'].map(q), QF);
eq('spline eq 3.16 b', sp4.b.map(String).join(','), '-13/8,1/4,1/4');
eq('spline eq 3.16 c', sp4.c.map(String).join(','), '0,15/8,-15/8,0');
eq('spline eq 3.16 d', sp4.d.map(String).join(','), '5/8,-5/8,5/8');

// ---- 5.1 / 5.2 ----
const dfm = E.diffFormulas(Math.exp, 0, 0.1);
near('forward diff', dfm.forward, (Math.exp(0.1) - 1) / 0.1);
near('centered diff', dfm.centered, (Math.exp(0.1) - Math.exp(-0.1)) / 0.2);
const tr = E.integrate((x) => x * x, 0, 1, 4, 'trap');
near('composite trap', tr.value, 0.34375, 1e-12);
const si = E.integrate((x) => x * x * x, 0, 2, 2, 'simpson');
near('simpson exact on cubic', si.value, 4, 1e-12);
near('reference integral', E.integralRef(Math.sin, 0, Math.PI), 2, 1e-10);

// ---- regression: equivalent powers keep their real domains ----
near('decimal square-root power derivative on negative x', E.derivative(E.compile('(x^2)^0.5').node).f(-2), -1, 1e-12);
near('fractional square-root power derivative on negative x', E.derivative(E.compile('(x^2)^(1/2)').node).f(-2), -1, 1e-12);
near('nested power derivative on positive x', E.derivative(E.compile('(x^2)^0.5').node).f(2), 1, 1e-12);

// ---- regression: bounds must cover peaks between sample locations ----
const rapid = E.compile('sin(8000*pi*x)'), rapidD = E.nthDerivative(rapid.node, 2);
const rapidBound = E.absBound(rapidD.node, 0, 1);
eq('rapid oscillation has conservative bound', rapidBound.max >= (8000 * Math.PI) ** 2, true);
eq('singular derivative has no interval bound', E.absBound(E.derivative(E.compile('ln(x)').node).node, -1, 1), null);
eq('unsupported tan has no claimed bound', E.absBound(E.compile('tan(x)').node, 0, 1), null);
eq('sampling reports undefined values', E.maxAbsOn(Math.log, -1, 1).undefinedValues, true);
for (const s of ['x^2', 'x^3', 'e^(-x)', '1/(1+x^2)', 'cos(x)*x^2', 'x^(-2)']) {
  const c = E.compile(s), bnd = E.absBound(c.node, 1, 3);
  eq('finite bound ' + s, !!bnd, true);
  eq('bound covers sampled values ' + s, !!bnd && Array.from({ length: 101 }, (_, k) => Math.abs(c.f(1 + k / 50))).every((v) => v <= bnd.max), true);
}

// ---- regression: domain failures and invalid panel counts fail promptly ----
eq('bisection rejects undefined midpoint', !!E.bisection((x) => 1 / x, -1, 1, { steps: 6 }).error, true);
const endpoint = E.bisection((x) => x - 1, 1, 2, { steps: 4 });
eq('endpoint root is exact', endpoint.exact, true);
eq('endpoint retains initial interval', endpoint.a0, 1);
eq('endpoint needs no iterations', endpoint.rows.length, 0);
near('endpoint root', endpoint.root, 1);
eq('false position rejects singular value', !!E.falsePosition((x) => 1 / x, -1, 1, { steps: 4 }).error, true);
eq('Newton stops at an exact multiple root', E.newton((x) => x * x, (x) => 2 * x, 0, { steps: 4 }).stop, 'exact');
eq('secant rejects undefined starts', E.secant(Math.log, -1, 1, { steps: 4 }).stop, 'undefined');
eq('Simpson rejects odd n', !!E.integrate((x) => x * x, 0, 1, 3, 'simpson').error, true);
eq('integration rejects fractional n', !!E.integrate(Math.exp, 0, 1, 2.5, 'trap').error, true);
eq('integration rejects nonfinite values', !!E.integrate(Math.log, 0, 1, 4, 'trap').error, true);
let undefinedCalls = 0, referenceStopped = false;
try { E.integralRef(() => { undefinedCalls++; return NaN; }, 0, 1); } catch (e) { referenceStopped = /undefined/.test(e.message); }
eq('undefined reference integral gives clear failure', referenceStopped, true);
eq('undefined reference integral stops immediately', undefinedCalls, 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
