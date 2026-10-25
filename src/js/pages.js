/* pages.js — Home, study plan, formula sheet, exam drill, tips, settings */
(function (NM) {
  'use strict';
  const { UI } = NM;
  const { h, M } = UI;
  const P = NM.pages;

  /* ---------------- Home ---------------- */
  P.home = (el) => {
    const cur = NM.topic(NM.CURRENT);
    const prog = UI.progress;
    const pc = prog.get(cur.id);
    const totalClean = NM.topics.reduce((s, t) => s + prog.get(t.id).clean, 0);
    const streak = prog.dayStreak();
    const next = !pc.walked ? ['learn', 'Start the lesson'] : pc.clean < 3 ? ['examples', 'Do the examples'] : ['practice', 'Keep practicing'];
    el.appendChild(h('div', { class: 'card continue' },
      h('span', { class: 'kicker', text: 'Your class is on' }),
      h('h1', { text: cur.title }),
      h('p', { class: 'muted', style: { margin: 0 }, html: cur.tagline }),
      h('div', { class: 'row', style: { marginTop: '6px' } },
        h('a', { class: 'btn primary', href: '#/t/' + cur.id + '/' + next[0] }, next[1] + ' →'),
        h('a', { class: 'btn', href: '#/t/' + cur.id + '/examples' }, 'Examples'),
        h('a', { class: 'btn', href: '#/t/' + cur.id + '/practice' }, 'Practice'))));
    el.appendChild(h('div', { class: 'card' },
      h('h2', { text: 'Today: 45 minutes' }),
      h('ol', { class: 'today' },
        h('li', null, h('span', { class: 'min', text: '5 min' }), h('span', { html: '<a href="#/formulas">Formula sheet</a>: cover it, write the formulas from memory, check.' })),
        h('li', null, h('span', { class: 'min', text: '25 min' }), h('span', { html: '<a href="#/t/' + cur.id + '/examples">' + cur.title + ' examples</a> on paper, then <a href="#/t/' + cur.id + '/practice">practice</a> until 3 on your own.' })),
        h('li', null, h('span', { class: 'min', text: '10 min' }), h('span', { html: '<a href="#/drill">Exam drill</a> with older topics mixed in.' })),
        h('li', null, h('span', { class: 'min', text: '5 min' }), h('span', { html: 'Write today\'s mistakes in a notebook, one line each.' })))));
    el.appendChild(h('div', { class: 'stat-row', style: { margin: '6px 4px 4px' } },
      h('div', { class: 'stat' }, h('b', { text: streak }), h('span', { text: streak === 1 ? 'day in a row' : 'days in a row' })),
      h('div', { class: 'stat' }, h('b', { text: totalClean }), h('span', { text: 'solved on your own' })),
      h('div', { class: 'stat' }, h('b', { text: NM.topics.filter((t) => prog.level(t.id) > 0).length + '/' + NM.topics.length }), h('span', { text: 'topics started' }))));
    NM.UNITS.forEach(([u, name]) => {
      el.appendChild(UI.section(name, u === 'finals' ? 'study ahead' : u === 'midterm' ? 'now' : 'review'));
      el.appendChild(h('div', { class: 'trow-list' }, NM.topics.filter((t) => t.unit === u).map((t) =>
        h('a', { class: 'trow' + (t.id === NM.CURRENT ? ' current' : ''), href: '#/t/' + t.id + '/learn' },
          h('span', { class: 'tn', text: t.num }),
          h('span', null, h('b', { text: t.title }), h('span', { class: 'tl', html: t.tagline })),
          UI.stars(t.id)))));
    });
  };

  /* ---------------- How to study ---------------- */
  P.plan = (el) => {
    el.appendChild(h('h1', { text: 'How to study with this' }));
    el.appendChild(UI.callout('idea', 'The one thing that works', '<p class="big">You learn these methods by <b>doing problems on paper, with your calculator, and checking them</b>. Reading and watching feel like learning, but they aren\'t enough.</p>'));
    el.appendChild(UI.section('For every topic'));
    el.appendChild(UI.recipe([
      '<b>Learn</b> — read the short lesson pages. In "Watch it", say the next number before you press Next.',
      '<b>Examples</b> — read the problem, solve it on paper, then reveal the solution one step at a time and compare.',
      '<b>Practice</b> — fresh questions until you get <b>3 right on your own</b> (no hint).',
      '<b>Solver</b> — type your homework and compare every number with yours. The first number that differs is your mistake.',
    ]));
    el.appendChild(UI.section('Order until the final'));
    const order = [
      ['ndd', 'Your class is here. Master the triangle first.'], ['lagrange', 'Same answer as divided differences — use one to check the other.'],
      ['horner', 'Short; needed to evaluate Newton\'s form.'], ['interp-error', 'Usually right after divided differences.'],
      ['chebyshev', 'The next section.'], ['spline', 'Likely on the final if your class reaches it.'],
      ['diff', 'Only if your teacher includes Chapter 5.'], ['integrate', 'Only if your teacher includes Chapter 5.'],
    ];
    el.appendChild(h('div', { class: 'trow-list' }, order.map(([id, why], k) => {
      const t = NM.topic(id);
      return h('a', { class: 'trow', href: '#/t/' + id + '/learn' }, h('span', { class: 'tn', text: k + 1 }), h('span', null, h('b', { text: t.title }), h('span', { class: 'tl', text: why })), UI.stars(id));
    })));
    el.appendChild(h('p', { class: 'muted small', style: { marginTop: '10px' }, html: 'Prelim topics: one drill a week so they stay fresh, in case the final covers everything.' }));
    el.appendChild(UI.section('Ask your teacher'));
    el.appendChild(h('ul', null,
      h('li', { html: 'Which sections does the final cover — everything, or only after the midterm?' }),
      h('li', { html: 'Is it by hand with a calculator, or also theory / MATLAB?' }),
      h('li', { html: 'How many decimal places, and should we round at each step?' })));
  };

  /* ---------------- Formula sheet ---------------- */
  P.formulas = (el) => {
    el.appendChild(h('div', { class: 'row spread' }, h('h1', { style: { margin: 0 }, text: 'Formula sheet' }),
      NM.ARTIFACT ? null : h('button', { class: 'btn no-print', type: 'button', onclick: () => window.print() }, 'Print / save as PDF')));
    el.appendChild(h('p', { class: 'muted', html: 'Test yourself: cover a box, write the formula on paper, then look.' }));
    NM.UNITS.forEach(([u, name]) => {
      el.appendChild(UI.section(name));
      el.appendChild(h('div', { class: 'fs-grid' }, NM.topics.filter((t) => t.unit === u).map((t) =>
        h('div', { class: 'card flat fs' }, h('h3', null, h('a', { href: '#/t/' + t.id + '/learn', text: t.num + '. ' + t.title }), h('span', { class: 'muted small', text: t.book })), h('div', { html: t.formulas || '' })))));
    });
  };

  /* ---------------- Exam drill ---------------- */
  P.drill = (el) => {
    el.appendChild(h('h1', { text: 'Exam drill' }));
    el.appendChild(h('p', { class: 'muted', html: 'Mixed questions, one after another. Do each on paper first. You get a score and a list of topics to review.' }));
    const saved = UI.store.get('drill', { units: ['midterm'], count: 10 });
    const boxes = NM.UNITS.map(([u, name]) => {
      const cb = h('input', { type: 'checkbox', id: 'drill-' + u });
      cb.checked = saved.units.includes(u);
      return { u, cb, el: h('label', { class: 'row', style: { gap: '10px', cursor: 'pointer', padding: '6px 0' } }, cb, h('b', { text: name }), h('span', { class: 'muted small', text: NM.topics.filter((t) => t.unit === u).map((t) => t.short).join(', ') })) };
    });
    let count = saved.count;
    const host = h('div');
    el.appendChild(h('div', { class: 'card' }, h('h3', { text: 'Topics' }), h('div', { style: { marginBottom: '12px' } }, boxes.map((b) => b.el)),
      h('div', { class: 'row' }, h('span', { text: 'Questions:' }), UI.seg([[5, '5'], [10, '10'], [15, '15'], [20, '20']], count, (v) => { count = +v; }),
        h('span', { class: 'grow' }), h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Start drill'))));
    el.appendChild(host);
    function start() {
      const units = boxes.filter((b) => b.cb.checked).map((b) => b.u);
      if (!units.length) { UI.toast('Pick at least one group of topics.'); return; }
      UI.store.set('drill', { units, count });
      const pool = [];
      NM.topics.filter((t) => units.includes(t.unit)).forEach((t) => (t.practice || []).forEach((g) => pool.push({ t, g })));
      const qs = Array.from({ length: count }, () => UI.rand.pick(pool));
      const results = [];
      const t0 = Date.now();
      let k = 0;
      host.innerHTML = '';
      const timer = h('span', { class: 'muted small' });
      const tick = setInterval(() => {
        if (!document.body.contains(timer)) { clearInterval(tick); return; }
        const s = Math.floor((Date.now() - t0) / 1000);
        timer.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      }, 1000);
      const qhost = h('div');
      host.appendChild(h('div', { class: 'row spread', style: { margin: '18px 0 10px' } }, h('h2', { style: { margin: 0 }, text: 'Drill' }), timer));
      host.appendChild(qhost);
      const show = () => {
        qhost.innerHTML = '';
        if (k >= qs.length) { finish(); return; }
        const { t, g } = qs[k];
        let q;
        try { q = g(); } catch (e) { console.error(e); k++; show(); return; }
        const rec = { t, ok: false, clean: false };
        results.push(rec);
        UI.question(qhost, q, {
          counter: (k + 1) + ' of ' + qs.length + ' · ' + t.title,
          nextLabel: k + 1 < qs.length ? 'Next question →' : 'Finish',
          primaryNext: true,
          onResult: (r) => {
            if (r.correct) { rec.ok = true; rec.clean = r.clean; }
            UI.progress.patch(t.id, (p) => (r.correct ? { solved: p.solved + 1, clean: p.clean + (r.clean ? 1 : 0), streak: r.clean ? p.streak + 1 : 0 } : { wrong: p.wrong + 1, streak: 0 }));
          },
          onNext: () => { k++; show(); window.scrollTo({ top: host.offsetTop - 70 }); },
        });
      };
      const finish = () => {
        clearInterval(tick);
        const clean = results.filter((r) => r.clean).length;
        const byTopic = {};
        results.forEach((r) => { const b = (byTopic[r.t.id] = byTopic[r.t.id] || { t: r.t, n: 0, clean: 0 }); b.n++; if (r.clean) b.clean++; });
        const weak = Object.values(byTopic).filter((b) => b.clean < b.n);
        const s = Math.floor((Date.now() - t0) / 1000);
        qhost.appendChild(h('div', { class: 'card' },
          h('h2', { text: 'Score: ' + clean + ' / ' + results.length + ' on your own' }),
          h('p', { class: 'muted', text: 'Time: ' + Math.floor(s / 60) + ' min ' + (s % 60) + ' s' }),
          UI.table(['Topic', 'Questions', 'On your own'], Object.values(byTopic).map((b) => ['<a href="#/t/' + b.t.id + '/examples">' + b.t.title + '</a>', b.n, b.clean + (b.clean === b.n ? ' ✓' : '')]), { align: ['l', 'c', 'c'] }).el,
          weak.length ? h('p', { html: '<b>Review next:</b> ' + weak.map((b) => '<a href="#/t/' + b.t.id + '/examples">' + b.t.title + '</a>').join(', ') + ' — redo the examples, then 3 practice questions.' }) : h('p', { html: '<b>Perfect run.</b> Add more topics or more questions.' }),
          h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Another drill')));
      };
      show();
    }
  };

  /* ---------------- Tips ---------------- */
  P.tips = (el) => {
    el.appendChild(h('h1', { text: 'Calculator & exam tips' }));
    el.appendChild(h('p', { class: 'muted', html: 'Key names are for Casio fx-991ES / fx-991EX / fx-570. Other calculators have the same features under different keys.' }));
    el.appendChild(UI.callout('calc', 'Before every exam', '<ul><li><b>Radian mode</b> (SETUP → Rad, an <b>R</b> shows on screen). Degree mode is the #1 silent mistake.</li><li><b>Fraction output</b> (MathIO) for Lagrange and divided differences. <span class="kbd">S⇔D</span> switches to decimals.</li><li><b>Clear memories</b> so old values don\'t surprise you.</li></ul>'));
    el.appendChild(UI.section('Five moves that save time'));
    el.appendChild(UI.table(['Move', 'How', 'Use it for'], [
      ['<b>Ans</b>', 'Type the start, <span class="kbd">=</span>. Type the formula with Ans for <i>x</i>, press <span class="kbd">=</span> again and again.', 'Fixed-point, Newton, Horner'],
      ['<b>CALC</b>', 'Type <i>f</i>(X) once, <span class="kbd">CALC</span>, enter a number, <span class="kbd">=</span>.', 'Bisection, secant, checking <i>P</i>(<i>x</i>)'],
      ['<b>TABLE</b>', 'MODE → TABLE, type <i>f</i>(<i>x</i>), start/end/step.', 'Finding a sign change; y-values'],
      ['<b>d/dx</b>', 'SHIFT ∫ → d/dx at a number.', 'Checking a Newton derivative'],
      ['<b>∫</b>', 'The integral key with limits.', 'Checking Trapezoid/Simpson'],
    ], { align: ['l', 'l', 'l'] }).el);
    el.appendChild(UI.section('On the exam paper'));
    el.appendChild(h('ul', null,
      h('li', { html: '<b>Write the formula first</b>, then the numbers, then the answer — partial credit for the set-up.' }),
      h('li', { html: '<b>Draw a table</b> for every iterative method.' }),
      h('li', { html: '<b>Keep full precision</b> in the calculator; round only what you write.' }),
      h('li', { html: '<b>Sanity-check:</b> a root makes <i>f</i> ≈ 0; an interpolating polynomial passes through the data.' }),
      h('li', { html: '<b>Stuck?</b> Skip and come back.' })));
    el.appendChild(UI.section('Mistakes that cost the most points'));
    el.appendChild(UI.table(['Topic', 'Mistake', 'Fix'], [
      ['Bisection', 'Replacing the wrong endpoint', '<i>c</i> replaces the one with the <b>same sign</b>'],
      ['Fixed-point', 'A <i>g</i> that diverges', 'Check |<i>g</i>′(<i>r</i>)| &lt; 1'],
      ['Newton', 'Wrong derivative', 'Check with d/dx'],
      ['Secant', 'Dropping the wrong point', 'Drop the oldest'],
      ['Lagrange', 'Including (<i>x</i> − ' + M.v('x', 'k') + ') in ' + M.v('L', 'k'), 'Skip your own point'],
      ['Divided differences', 'Neighbouring x\'s in later columns', 'Divide by the <b>ends of the span</b>'],
      ['Error bound', 'Degree instead of number of points', '<i>n</i> points → <i>f</i><sup>(<i>n</i>)</sup>, <i>n</i>!'],
      ['Splines', 'Forgetting the 3', 'Write the formula first'],
      ['Simpson', 'Odd <i>n</i> / wrong weights', '<i>n</i> even; 1 4 2 4 … 4 1'],
    ], { align: ['l', 'l', 'l'] }).el);
  };

  /* ---------------- Settings ---------------- */
  P.settings = (el) => {
    el.appendChild(h('h1', { text: 'Settings' }));
    const dp = UI.select({ label: 'Decimal places in answers', value: UI.settings.dp, options: [[4, '4'], [5, '5'], [6, '6 (default)'], [8, '8'], [10, '10']], onChange: (v) => { UI.settings.dp = +v; UI.saveSettings(); UI.toast('Saved'); } });
    const th = UI.select({ label: 'Theme', value: UI.settings.theme, options: [['light', 'Light (easiest to read)'], ['dark', 'Dark'], ['auto', 'Match my device']], onChange: (v) => { UI.settings.theme = v; UI.saveSettings(); UI.applyTheme(); } });
    const sz = UI.select({ label: 'Text size', value: UI.settings.size, options: [['normal', 'Normal'], ['large', 'Large'], ['xl', 'Extra large']], onChange: (v) => { UI.settings.size = v; UI.saveSettings(); UI.applySize(); } });
    el.appendChild(h('div', { class: 'card' }, h('div', { class: 'form-grid' }, dp.el, th.el, sz.el)));
    el.appendChild(h('h2', { text: 'Your progress' }));
    el.appendChild(h('p', { class: 'muted', html: 'Saved in this browser on this device. To move it, make a backup code here and restore it on the other device.' }));
    const area = h('textarea', { id: 'backup-code', rows: '4', class: 'mono', style: { width: '100%' }, spellcheck: 'false', 'aria-label': 'backup code' });
    let armed = null;
    const resetBtn = h('button', { class: 'btn', type: 'button' }, 'Reset progress');
    resetBtn.addEventListener('click', () => {
      if (!armed) {
        resetBtn.textContent = 'Click again to erase all progress';
        resetBtn.style.borderColor = 'var(--bad)'; resetBtn.style.color = 'var(--bad)';
        armed = setTimeout(() => { armed = null; resetBtn.textContent = 'Reset progress'; resetBtn.style.borderColor = ''; resetBtn.style.color = ''; }, 4000);
        return;
      }
      clearTimeout(armed); armed = null;
      resetBtn.textContent = 'Reset progress'; resetBtn.style.borderColor = ''; resetBtn.style.color = '';
      UI.store.set('progress', {}); UI.store.set('days', []); UI.refreshNav(); UI.toast('Progress reset');
    });
    el.appendChild(h('div', { class: 'card' }, area,
      h('div', { class: 'row', style: { marginTop: '10px' } },
        h('button', { class: 'btn', type: 'button', onclick: () => {
          area.value = JSON.stringify({ progress: UI.store.get('progress', {}), days: UI.store.get('days', []), settings: UI.settings });
          area.select();
          try { navigator.clipboard.writeText(area.value).then(() => UI.toast('Backup code copied'), () => UI.toast('Select the text and copy it')); } catch (e) { UI.toast('Select the text and copy it'); }
        } }, 'Make backup code'),
        h('button', { class: 'btn', type: 'button', onclick: () => {
          try {
            const d = JSON.parse(area.value);
            if (!d || typeof d.progress !== 'object') throw new Error('bad');
            UI.store.set('progress', d.progress); UI.store.set('days', d.days || []);
            if (d.settings) { Object.assign(UI.settings, d.settings); UI.saveSettings(); UI.applyTheme(); UI.applySize(); }
            UI.toast('Progress restored'); UI.refreshNav(); NM.route();
          } catch (e) { UI.toast('That backup code doesn\'t look right.'); }
        } }, 'Restore from code'),
        h('span', { class: 'grow' }), resetBtn)));
    el.appendChild(h('p', { class: 'muted small', style: { marginTop: '18px' }, html: 'Follows Timothy Sauer, <i>Numerical Analysis</i> (2nd ed.): §0.1, §1.1–1.5, §3.1–3.4, §5.1–5.2. Runs fully offline.' }));
  };
})(window.NM);
