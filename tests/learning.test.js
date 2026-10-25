const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const { Element, environment } = require('./dom-stub');
const ctx = vm.createContext(environment());
const load = (name) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), ctx, { filename: name });
load('src/js/engine.js'); load('src/js/ui.js');
ctx.NM.Plot = class { constructor() { this.view = {}; return new Proxy(this, { get: (o, k) => k in o ? o[k] : () => {} }); } };
load('src/js/topics/roots-shared.js');
fs.readdirSync(path.join(__dirname, '../src/js/topics')).filter((f) => /^t\d/.test(f)).sort().forEach((f) => load('src/js/topics/' + f));
load('src/js/coach.js'); load('src/js/pages.js');
const { E, UI, coach: C } = ctx.NM;
ctx.NM.CURRENT = 'ndd'; UI.refreshNav = () => {}; ctx.NM.route = () => {};
let checks = 0;
const test = (name, run) => { try { run(); checks++; } catch (e) { throw new Error(name + ': ' + e.message, { cause: e }); } };
const button = (el, text) => el.querySelectorAll('button').find((b) => b.textContent === text);

test('repeated wrong answers are not automatically revealed or mislabeled independent', () => {
  const el = new Element(), results = [];
  UI.question(el, { type: 'test', prompt: '', fields: [{ label: 'value', answer: 2 }], solution: '2' }, { onResult: (r) => results.push(r) });
  const input = el.querySelector('input'); input.value = '-99';
  button(el, 'Check').click(); button(el, 'Check').click();
  assert(!el.textContent.includes('answer: 2'));
  input.value = '2'; button(el, 'Check').click();
  assert(el.textContent.includes('Correct after a revision'));
  assert.strictEqual(results.at(-1).clean, false);
});
test('showing a solution cannot earn a clean solve', () => {
  const el = new Element(), results = [];
  UI.question(el, { type: 'test', prompt: '', fields: [{ label: 'value', answer: 2 }], solution: '2' }, { onResult: (r) => results.push(r) });
  button(el, 'Show full solution').click(); el.querySelector('input').value = '2'; button(el, 'Check').click();
  assert(el.textContent.includes('All correct with help'));
  assert.strictEqual(results[0].clean, false);
});
test('first-try independent solve remains distinct', () => {
  const el = new Element(), results = [];
  UI.question(el, { type: 'test', prompt: '', fields: [{ label: 'value', answer: 2 }], solution: '2' }, { onResult: (r) => results.push(r) });
  el.querySelector('input').value = '2'; button(el, 'Check').click(); button(el, 'Check').click();
  assert.strictEqual(results.length, 1); assert.strictEqual(results[0].clean, true);
});
test('second-derivative written solution contains an explicit multiplication', () => {
  const board = ctx.NM.topic('diff').examples[1].solve();
  const lines = board.steps.flatMap((s) => s.lines || []).join(' ');
  assert(lines.includes('2 × (0.841471)')); assert(!lines.includes('− 20.841471'));
});
test('endpoint-root and already-small bisection intervals render without missing rows', () => {
  const topic = ctx.NM.topic('bisection'), el = new Element();
  topic.solve(el);
  const inputs = el.querySelectorAll('input');
  inputs[0].value = 'x-1'; inputs[0].dispatch('input'); inputs[1].value = '1'; inputs[2].value = '2';
  button(el, 'Show the solution').click();
  assert(el.textContent.includes('An endpoint is already a root'));
});

test('all topic coaches survive serialization with finite answers and consistent displayed arithmetic', () => {
  for (const topic of ctx.NM.topics) for (let n = 0; n < 100; n++) {
    const q = JSON.parse(JSON.stringify(C.create(topic.id)));
    assert(C.validQuestion(q), topic.id);
    q.steps.forEach((s) => {
      if (s.choices) return;
      assert(Number.isFinite(s.answer), topic.id);
      if (s.operator || /^(sin|cos|e\^|\(|-?\d)/.test(s.expression)) {
        const value = E.evalNumber(s.expression);
        if (Number.isFinite(value)) assert(Math.abs(value - s.answer) <= Math.max(C.tolerance(s), Math.abs(s.answer) * 1e-9), topic.id + ': ' + s.expression);
      }
    });
  }
});
test('feedback recognizes likely reversed subtraction and division', () => {
  assert(C.feedback({ operator: '-', a: 8, b: 3, answer: 5 }, '-5').includes('subtraction order'));
  assert(C.feedback({ operator: '÷', a: 8, b: 2, answer: 4 }, '1/4').includes('fraction order'));
});

const sample = { id: 'fixture', title: 'Two operations', prompt: 'Find a difference, then double it.', steps: [
  { label: 'Subtract', expression: '(8) − (3)', answer: 5, explanation: 'Use first minus second.', operator: '-', a: 8, b: 3 },
  { label: 'Double', expression: '(5) × (2)', answer: 10, explanation: 'Multiply by 2.', operator: '×', a: 5, b: 2 },
] };
test('a wrong guided answer stays on the first calculation and is saved once', () => {
  const el = new Element(); C.mount(el, ctx.NM.topic('ndd'), { question: sample });
  el.querySelector('input').value = '-5'; button(el, 'Check this calculation').click(); button(el, 'Check this calculation').click();
  assert(el.textContent.includes('Calculation 1 of 2')); assert(el.textContent.includes('subtraction order'));
  assert.strictEqual(C.mistakes.all().length, 1); assert.strictEqual(C.mistakes.all()[0].attempts, 2);
  assert(C.mistakes.all()[0].due > Date.now());
});
test('guided success and a revealed step never inflate independent progress', () => {
  const el = new Element(); C.mount(el, ctx.NM.topic('ndd'), { question: sample });
  el.querySelector('input').value = '5'; button(el, 'Check this calculation').click(); button(el, 'Next calculation').click();
  button(el, 'Show this step').click(); button(el, 'Finish guided question').click();
  assert(el.textContent.includes('Guided question complete'));
  assert.strictEqual(UI.progress.get('ndd').guided, 1); assert.strictEqual(UI.progress.get('ndd').clean, 0); assert.strictEqual(UI.progress.get('ndd').solved, 0);
});
test('an exact saved calculation can be retried and rescheduled without the original generator', () => {
  const row = C.mistakes.all().find((r) => r.index === 0), el = new Element();
  const saved = JSON.parse(JSON.stringify(row));
  C.mount(el, ctx.NM.topic('ndd'), { question: saved.question, index: 0, reviewId: saved.id });
  el.querySelector('input').value = '5'; button(el, 'Check this calculation').click(); button(el, 'Finish this review').click();
  const updated = C.mistakes.all().find((r) => r.id === saved.id);
  assert.strictEqual(updated.repeats, 1); assert(updated.due > Date.now() + 2 * 86400000);
  assert.strictEqual(UI.progress.get('ndd').clean, 0);
  assert(el.textContent.includes('Review complete')); assert(!el.querySelector('input'));
});
test('corrupt saved questions are ignored, and the mistake history is bounded', () => {
  const before = C.mistakes.all(); UI.store.set('mistakes', [...before, { id: 'bad', topic: 'ndd', question: sample, index: 500, due: Date.now() }]);
  assert.strictEqual(C.mistakes.all().length, before.length);
  for (let i = 0; i < 65; i++) C.mistakes.record('ndd', Object.assign({}, sample, { id: 'limit-' + i }), 0, '-5');
  assert.strictEqual(C.mistakes.all().length, 60);
});
test('backup includes guided progress and mistakes; malformed restores do not overwrite progress', () => {
  const el = new Element(); ctx.NM.pages.settings(el);
  button(el, 'Make backup code').click();
  const area = el.querySelector('textarea'), data = JSON.parse(area.value);
  assert.strictEqual(data.mistakes.length, 60); assert(data.progress.ndd.guided > 0);
  const before = JSON.stringify(UI.store.get('progress', {}));
  area.value = JSON.stringify({ progress: {}, settings: { dp: 1000 }, mistakes: [] }); button(el, 'Restore from code').click();
  assert.strictEqual(JSON.stringify(UI.store.get('progress', {})), before);
  area.value = JSON.stringify({ progress: {}, days: [] }); button(el, 'Restore from code').click();
  assert.strictEqual(C.mistakes.all().length, 0);
});

console.log(checks + ' learning checks passed (including 1,200 generated guided questions).');
