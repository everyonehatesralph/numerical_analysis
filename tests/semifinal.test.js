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
  return ctx;
}

let checks = 0;
const test = (name, run) => { try { run(); checks++; } catch (e) { throw new Error(name + ': ' + e.message, { cause: e }); } };
const plain = (s) => String(s).replace(/<span class="fr"><span>([^<]*)<\/span><span>([^<]*)<\/span><\/span>/g, '$1/$2').replace(/<sup>([^<]*)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
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
        if (t === err && /Error bound/.test(q.type)) assert(texts(b).some((x) => x.includes('≤ bound ✓')), 'the bound is below the true error');
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
const UI_LINES = (b) => b.steps.reduce((n, s) => n + (s.lines || []).length + (s.then || []).length, 0);
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

console.log(checks + ' semifinal checks passed (book examples, 600 random solutions, settings update).');
