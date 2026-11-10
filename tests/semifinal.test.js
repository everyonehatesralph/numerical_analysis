/* The detailed written solutions for the semifinal topics (Lagrange, divided differences,
   interpolation error): book answers, self-checks on random questions, and the settings update. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const { environment } = require('./dom-stub');

function app(storage) {
  const ctx = vm.createContext(environment());
  Object.entries(storage || {}).forEach(([k, v]) => ctx.localStorage.setItem('nmr1:' + k, JSON.stringify(v)));
  const load = (name) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), ctx, { filename: name });
  load('src/js/engine.js'); load('src/js/ui.js');
  ctx.NM.Plot = class { constructor() { return new Proxy(this, { get: (o, k) => (k in o ? o[k] : () => {}) }); } };
  load('src/js/topics/roots-shared.js');
  fs.readdirSync(path.join(__dirname, '../src/js/topics')).filter((f) => /^t\d/.test(f)).sort().forEach((f) => load('src/js/topics/' + f));
  ctx.addEventListener = () => {};
  load('src/js/tutor.js');
  load('src/js/problem.js');
  load('src/js/rcode.js');
  return ctx;
}

let checks = 0;
const test = (name, run) => { try { run(); checks++; } catch (e) { throw new Error(name + ': ' + e.message, { cause: e }); } };
// drop the tutorial's note wrappers (<span class="w" data-…>…</span>), keeping what they wrap
const unW = (s) => { const open = []; return String(s).replace(/<(\/?)([a-z]+)([^>]*)>/gi, (m, close, tag, rest) => {
  if (!close) { const w = tag === 'span' && / class="w"/.test(rest); open.push(w); return w ? '' : m; }
  return open.pop() ? '' : m;
}); };
const plain = (s) => unW(s).replace(/<span class="fr"><span>([^<]*)<\/span><span>([^<]*)<\/span><\/span>/g, '$1/$2').replace(/<sup>([^<]*)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
// every string a board can show
const texts = (b) => b.steps.flatMap((s) => [s.title, s.text, s.note, s.warn].concat(s.lines || [], s.then || [], s.table ? s.table.head.concat(...s.table.rows) : [])).concat(b.answer).filter((x) => x !== undefined && x !== null).map(String);
const clean = (b, where) => texts(b).forEach((t) => assert(!/NaN|undefined|Infinity|\[object/.test(t), where + ' shows "' + plain(t).slice(0, 80) + '"'));
const step = (b, title) => b.steps.find((s) => plain(s.title).startsWith(title));
const ticks = (s) => (s.lines || []).filter((l) => l.endsWith(' ✓')).length;

const ctx = app();
const { NM } = ctx;
const lag = NM.topic('lagrange'), ndd = NM.topic('ndd'), err = NM.topic('interp-error');

test('Lagrange, book Example 3.1: brackets multiplied out and the polynomial checked', () => {
  const b = lag.examples[0].solve();
  clean(b, 'Example 3.1');
  const L1 = step(b, 'Build L1(x)');
  assert(L1.lines.some((l) => plain(l) === 'bottom = (−2)(−3) = 6'));
  assert(L1.lines.some((l) => plain(l).endsWith('= x^2 − 5x + 6')));
  assert.strictEqual(plain(b.answer[0]), 'P(x) = 1/2x^2 − 1/2x + 1');
  assert.strictEqual(plain(b.answer[1]), 'P(1) = 1');
  assert.strictEqual(ticks(step(b, 'Check')), 3);
  assert.strictEqual(plain(step(b, 'Add them').table.rows.at(-1).join('|')), 'add|1/2|−1/2|1');
});
test('Lagrange shortcut, Exercise 3.1-1(b) points: L-values add to 1', () => {
  const b = lag.examples[3].solve();
  clean(b, 'shortcut');
  assert.strictEqual(plain(step(b, 'Find L2(1)').lines.at(-1)), 'L2(1) = 16/9');
  assert.strictEqual(ticks(step(b, 'Check your L-values')), 1);
  assert.strictEqual(plain(b.answer[0]), 'P(1) = 1');
});
test('Divided differences, book Examples 3.3 and 3.4', () => {
  const b3 = ndd.examples[0].solve();
  clean(b3, 'Example 3.3');
  assert.deepStrictEqual([...step(b3, 'Read the coefficients').lines.map((l) => plain(l).split(' = ').pop())], ['1', '1/2', '1/2']);
  assert.strictEqual(plain(b3.answer[1]), 'P(1) = 1');
  const b4 = ndd.examples[1].solve();
  clean(b4, 'Example 3.4');
  assert.strictEqual(plain(b4.answer[0]), 'P(x) = 1 + 1/2x + 1/2x(x − 2) − 1/2x(x − 2)(x − 3)');
  assert.strictEqual(ticks(step(b4, 'Check')), 4);
  const exp = step(b4, 'Expanded form');
  assert.strictEqual(exp.lines.filter((l) => plain(l).startsWith('brackets of term')).length, 2, 'each bracket product is multiplied out once');
});
test('Divided differences, CO2 exercise 3.1-17: 1950 and 2050', () => {
  const b = ndd.examples[5].solve();
  clean(b, 'CO2');
  assert.strictEqual(plain(b.answer[1]), 'P(1950) = 316 ppm');
  assert.strictEqual(plain(b.answer[2]), 'P(2050) = 465 ppm');
});
test('Interpolation error, book Example 3.8 and the sin key', () => {
  const b = err.examples[0].solve();
  clean(b, 'Example 3.8');
  assert(step(b, 'Part 1').lines.some((l) => plain(l) === '(−0.0585938) × (−0.75) = 0.0439453'));
  assert.strictEqual(plain(step(b, 'Part 2').lines[0]), '5! = 5 × 4 × 3 × 2 × 1 = 120');
  assert.strictEqual(step(b, 'Part 3: the 5th').lines.length, 5, 'five derivatives, one per line');
  assert.strictEqual(plain(b.answer[0]), '|f(0.25) − P(0.25)| ≤ 9.955×10^−4 = 0.0009955');
  const s = err.examples[2].solve();
  clean(s, 'sin key');
  assert.strictEqual(plain(s.answer[0]), '|f(1) − P(1)| ≤ 5.348×10^−4 = 0.0005348');
});
test('600 random practice solutions pass their own checks', () => {
  [[lag, 'Lagrange'], [ndd, 'divided differences'], [err, 'interpolation error']].forEach(([t, name]) => {
    t.practice.forEach((g) => {
      for (let k = 0; k < 50; k++) {
        const q = g();
        if (!q.board) continue;
        const b = q.board();
        clean(b, name + ' / ' + q.type);
        const check = step(b, 'Check');
        if (check && check.lines) assert.strictEqual(ticks(check), check.lines.length, name + ' / ' + q.type + ': a check line has no ✓');
        if (t === err && /Error bound/.test(q.type)) assert(texts(b).some((x) => plain(x).includes('≤ bound ✓')), 'the bound is below the true error');
      }
    });
  });
});

/* the tutorial player reads the same boards: captions must belong to real lines */
const tutorOK = (b, where) => {
  b.steps.forEach((s) => {
    const t = s.tut;
    if (!t) return;
    const name = where + ' / ' + plain(s.title);
    if (t.say) assert.strictEqual(t.say.length, (s.lines || []).length, name + ': one caption per line');
    if (t.sayThen) assert.strictEqual(t.sayThen.length, (s.then || []).length, name + ': one caption per closing line');
    if (t.focus) assert(t.focus.length <= (s.lines || []).length, name + ': highlights for lines that do not exist');
    [t.intro, t.sayTable, t.sayNode].concat(t.say || [], t.sayThen || []).filter(Boolean).forEach((c) => assert(!/NaN|undefined|Infinity|\[object/.test(c), name + ' caption shows "' + plain(c).slice(0, 80) + '"'));
    if (t.nodeFor) for (let c = -1; c <= (s.lines || []).length; c++) assert(t.nodeFor(c), name + ': no picture for line ' + c);
  });
  const m = NM.UI.tutorBeats(b, { tryFirst: true });
  const answers = b.steps.flatMap((s) => (s.lines || []).concat(s.then || [])).filter((l) => l.includes('class="res"')).length;
  assert.strictEqual(m.beats.filter((x) => x.kind === 'try').length, answers, where + ': every answer box gets a "your turn" pause');
  assert.strictEqual(m.beats.at(-1).kind, 'answer', where + ': ends on the answer');
  assert.strictEqual(m.chapters.at(-1).end, m.beats.length, where + ': chapters cover every step');
  assert(m.beats.length > UI_LINES(b), where + ': one beat per line at least');
  assert.strictEqual(NM.UI.tutorBeats(b, { tryFirst: false }).beats.filter((x) => x.kind === 'try').length, 0);
};
/* the "From / Why" notes: they never change where a line may break, and every arrow
   (data-src) points at a part written earlier in the same step, so it is on the screen */
const notesOK = (b, where) => {
  b.steps.forEach((s) => {
    const lines = (s.lines || []).concat(s.then || []);
    lines.forEach((l) => assert.strictEqual(NM.UI.lineSegs(l).length, NM.UI.lineSegs(unW(l)).length, where + ': a note splits the line "' + plain(l).slice(0, 60) + '"'));
    const html = lines.join(' ');
    const ids = new Set([...html.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]));
    [...html.matchAll(/data-src="([^"]+)"/g)].forEach((m) => m[1].split(' ').forEach((id) => assert(ids.has(id), where + ' / ' + plain(s.title) + ': an arrow points at "' + id + '", which is not in this step')));
  });
};
test('notes keep the lines intact and point at real sources', () => {
  [lag, ndd, err].forEach((t) => {
    t.examples.forEach((ex, k) => notesOK(ex.solve(), t.id + ' example ' + (k + 1)));
    t.practice.forEach((g) => { for (let k = 0; k < 20; k++) { const q = g(); if (q.board) notesOK(q.board(), t.id + ' / ' + q.type); } });
  });
});
const UI_LINES = (b) =>b.steps.reduce((n, s) => n + (s.lines || []).length + (s.then || []).length, 0);
test('tutorial captions and highlights line up with the book examples', () => {
  [[lag, 'Lagrange'], [ndd, 'divided differences'], [err, 'interpolation error']].forEach(([t, name]) => t.examples.forEach((ex, k) => {
    const b = ex.solve();
    assert(b.given && b.given.rows.length, name + ' example ' + (k + 1) + ': the given panel is filled in');
    tutorOK(b, name + ' example ' + (k + 1));
  }));
});
test('tutorial captions line up on 300 random practice solutions', () => {
  [lag, ndd, err].forEach((t) => t.practice.forEach((g) => { for (let k = 0; k < 25; k++) { const q = g(); if (q.board) tutorOK(q.board(), t.id + ' / ' + q.type); } }));
});

/* a problem typed in words or equations (problem.js): read right, solved like the book */
test('typed problems are read and solved', () => {
  const P = NM.problem;
  const solved = (text, prefer) => { const r = P.read(text, prefer); assert(r.ok, '"' + text + '" was not read: ' + plain(r.error || '')); return { r, b: r.build() }; };
  let s = solved('Find the Lagrange polynomial through (0, 1), (2, 2), (3, 4) and P(1).', 'ndd');
  assert.strictEqual(s.r.topic, 'lagrange');
  assert.strictEqual(plain(s.b.answer[0]), 'P(x) = 1/2x^2 − 1/2x + 1');
  assert.strictEqual(plain(s.b.answer[1]), 'P(1) = 1');
  s = solved('Carbon dioxide (ppm): 280 in 1800, 283 in 1850, 291 in 1900, 370 in 2000. Estimate it in 1950 and 2050.', 'ndd');
  assert.strictEqual(plain(s.b.answer[1]), 'P(1950) = 316');
  assert.strictEqual(plain(s.b.answer[2]), 'P(2050) = 465');
  s = solved('An industrial fan lasts 75, 63 and 54 (×1000 hours) at 40, 50 and 60 °C. Estimate its lifetime at 70 °C.', 'lagrange');
  assert(plain(s.b.answer.at(-1)).endsWith('= 48'), 'fan: ' + plain(s.b.answer.at(-1)));
  s = solved('Bound the error of f(x) = e^x at x = 0.25 with nodes −1, −0.5, 0, 0.5, 1.', 'lagrange');
  assert.strictEqual(s.r.topic, 'interp-error');
  assert.strictEqual(plain(s.b.answer[0]), '|f(0.25) − P(0.25)| ≤ 9.955×10^−4 = 0.0009955');
  assert.deepStrictEqual([...s.b.given.remember.map((x) => x.key)], ['dec', 'exp', 'n']);
  s = solved('f(x) = sin x, nodes 0, π/6, π/3, π/2, bound the error at x = 1', 'interp-error');
  assert.strictEqual(plain(s.b.answer[0]), '|f(1) − P(1)| ≤ 5.348×10^−4 = 0.0005348');
  assert.strictEqual(s.b.given.remember[0].key, 'rad', 'sin needs radian mode');
  s = solved('x = 0, 2, 3, 1 and y = 1, 2, 4, 0. Use divided differences.', 'lagrange');
  assert.strictEqual(s.r.topic, 'ndd');
  s = solved('f(0)=1, f(2)=2, f(3)=4. Find P(1).', 'lagrange');
  assert.strictEqual(plain(s.b.answer[1]), 'P(1) = 1');
  s = solved('Find P(1.5) through (1, 2.5), (2, 3.1), (3, 4.0)', 'lagrange');
  assert.strictEqual(s.b.given.remember[0].key, 'dec', 'decimals in, decimals out');
  assert(!P.read('x = 1, 2, 3; y = 4, 5', 'lagrange').ok);
  assert(/3 x-values but 2 y-values/.test(P.read('x = 1, 2, 3; y = 4, 5', 'lagrange').error));
  assert(/interpolation problems only/.test(P.read('Use Newton\'s method to find a root of x^3 − 2x − 5', 'lagrange').error));
  assert(!P.read('hello', 'lagrange').ok);
});
test('every example says what to remember', () => {
  [lag, ndd, err].forEach((t) => t.examples.forEach((ex) => { const b = ex.solve(); assert(b.given.remember && b.given.remember.length, t.id + ': no reminders'); }));
  assert.strictEqual(err.examples[2].solve().given.remember[0].key, 'rad', 'the sin example needs radian mode');
});

test('first visit: the semifinal topics are the exam list', () => {
  const c = app();
  assert.deepStrictEqual([...c.NM.UI.confirmedTopics()], ['lagrange', 'ndd', 'interp-error']);
  assert.strictEqual(c.NM.UI.examName(), 'Semifinal');
});
test('saved settings with an empty list move to the semifinal topics once', () => {
  const c = app({ settings: { dp: 8, theme: 'dark', size: 'normal', focus: 'ndd', examTopics: [], examDate: '', v: 2 }, drill: { units: ['midterm'], count: 10, confirmedOnly: false } });
  const UI = c.NM.UI;
  assert.deepStrictEqual([...UI.confirmedTopics()], ['lagrange', 'ndd', 'interp-error']);
  assert.strictEqual(UI.settings.dp, 8); assert.strictEqual(UI.settings.theme, 'dark');
  assert.strictEqual(UI.store.get('drill').confirmedOnly, true);
  assert.strictEqual(UI.store.get('settings').v, 3, 'saved, so it does not run again');
});
test('a list the student already chose is kept', () => {
  const c = app({ settings: { examTopics: ['spline', 'diff'], v: 2 } });
  assert.deepStrictEqual([...c.NM.UI.confirmedTopics()], ['spline', 'diff']);
});

/* the tutorial's arrows: around the writing, square to both ends, the head on the target */
test('arrows go around the writing and point straight at the new piece', () => {
  const route = NM.UI.inkRoute, box = (l, t, r, b) => ({ l, t, r, b });
  const ends = (w) => {
    const [a, tip, c] = w.head, base = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    return { tip, base };
  };
  // nothing in the way: one straight line down, the tip just above the target's middle
  let w = route({ w: 390, h: 600, src: box(100, 40, 120, 60), dst: box(100, 300, 120, 322), gap: [3, 3, 7, 3] });
  assert(w, 'a route on a clear board');
  assert.strictEqual(w.turns, 0);
  assert.strictEqual(w.cross, 0);
  assert.deepStrictEqual(Array.from(ends(w).tip, Math.round), [110, 297]);
  // a line of writing in the way, with a gap: the arrow uses the gap
  const wall = [box(16, 150, 180, 172), box(204, 150, 380, 172)];
  w = route({ w: 390, h: 600, src: box(60, 40, 80, 60), dst: box(290, 300, 310, 322), blocks: wall });
  assert.strictEqual(w.cross, 0, 'goes through the gap');
  const mid = w.pts.find((p, k) => k && (w.pts[k - 1].y - 161) * (p.y - 161) <= 0);
  assert(mid && mid.x > 180 && mid.x < 204, 'passes the line at the gap, at x = ' + (mid && mid.x));
  // no way round: it still arrives, crossing as little as it can (one line's height)
  w = route({ w: 390, h: 600, src: box(100, 40, 120, 60), dst: box(100, 300, 120, 322), blocks: [box(0, 150, 390, 172)] });
  assert(w && w.cross > 0 && w.cross <= 8, 'crosses the full-width line once, straight through: ' + (w && w.cross));
  // a target in a fraction's bottom, with its top right above: the arrow comes from the side, not through the top
  const top = box(100, 260, 160, 282), bar = box(100, 283, 160, 285), dst = box(118, 287, 142, 309);
  w = route({ w: 390, h: 600, src: box(250, 60, 270, 80), dst, blocks: [top, bar], gap: [3, 3, 7, 3] });
  const e = ends(w);
  assert.strictEqual(w.cross, 0);
  assert(!(e.tip[1] < dst.t && e.tip[0] > dst.l && e.tip[0] < dst.r), 'does not land on the top of the fraction');
  // every arrow ends square to the target: the head's base and tip share an x or a y
  [w].forEach((x) => { const q = ends(x); assert(Math.abs(q.tip[0] - q.base[0]) < 0.01 || Math.abs(q.tip[1] - q.base[1]) < 0.01); });
  // two arrows to one piece take different lanes
  const used = new Uint8Array(Math.ceil(390 / 4) * Math.ceil(600 / 4));
  const a1 = route({ w: 390, h: 600, src: box(60, 40, 80, 60), dst: box(180, 300, 220, 322), used });
  const a2 = route({ w: 390, h: 600, src: box(320, 40, 340, 60), dst: box(180, 300, 220, 322), used });
  assert.notDeepStrictEqual(Array.from(ends(a1).tip), Array.from(ends(a2).tip), 'two heads on one spot');
});

/* the R code page: R's own print-out, the table maths, and the instructor's code kept word for word */
test('the R page prints numbers exactly the way R does', () => {
  const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'r-print.json'), 'utf8'));
  fx.cases.forEach((c) => assert.strictEqual(NM.UI.rPrint(c.vals), c.out, 'R prints ' + c.expr + ' as\n' + c.out));
});
test('the R page works out the same table as the instructor\'s functions', () => {
  const R = NM.rcode, top = (x, y) => Array.from(R.ddTable(x, y), (row, i) => row[i]);
  assert.strictEqual(NM.UI.rPrint(top([0, 2, 3], [1, 2, 4])), R.DIVIDED.out);
  assert.strictEqual(NM.UI.rPrint(top([0, 2, 3, 1], [1, 2, 4, 0])), R.FOUR.out);
  assert.strictEqual(NM.UI.rPrint(top([0, 2, 3, 1, 4], [1, 2, 4, 0, 2])), R.FIVE.out);
  assert.strictEqual(NM.UI.rPrint(top([40, 50, 60], [75, 63, 54])), '[1] 75.000 -1.200  0.015', 'the fan problem');
  // his code, word for word (the photo of the board)
  assert.strictEqual(R.DIVIDED.lines.map((l) => l[0]).join('\n'), 'x<-c(0,1)\ny<-c(2,2)\nz<-c(3,4)\ndivided_diff<-function(x,y,z){\n  a=(y[2]-x[2])/(y[1]-x[1])\n  b=(z[2]-y[2])/(z[1]-y[1])\n  c=(b-a)/(z[1]-x[1])\nreturn(c(x[2],a,c))}');
  assert.strictEqual(R.FOUR.lines.map((l) => l[0]).join('\n'), 'x<-c(0,2,3,1)\ny<-c(1,2,4,0)\nfour_points<-function(x,y){\n  a=(y[2]-y[1])/(x[2]-x[1])\n  b=(y[3]-y[2])/(x[3]-x[2])\n  c=(y[4]-y[3])/(x[4]-x[3])\n  d=(b-a)/(x[3]-x[1])\n  e=(c-b)/(x[4]-x[2])\n  f=(e-d)/(x[4]-x[1])\nreturn(c(y[1],a,d,f))}');
});

console.log(checks + ' semifinal checks passed (book examples, 600 random solutions, settings update).');
