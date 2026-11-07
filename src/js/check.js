/* check.js — "Check my work": photograph a handwritten solution and compare it with the
   app's own worked solution. The app computes the correct steps exactly; Claude (only in
   the claude.ai copy, through the `sample` capability) reads the handwriting and lines it up
   against those steps. Without Claude the photo sits next to the correct solution instead. */
(function (NM) {
  'use strict';
  const { UI } = NM;
  const { h } = UI;

  /* A worked solution as plain text, for Claude: fractions as (a)/(b), powers as ^, tables as rows. */
  function boardText(root) {
    const walk = (n) => {
      if (n.nodeType === 3) return n.nodeValue;
      if (n.nodeType !== 1) return '';
      const el = n, tag = el.tagName;
      if (el.classList.contains('tri') || el.classList.contains('board-ctrl') || tag === 'BUTTON' || tag === 'CANVAS' || tag === 'SVG') return '';
      const inner = () => [...el.childNodes].map(walk).join('');
      if (el.classList.contains('fr') && el.children.length === 2) return '(' + walk(el.children[0]).trim() + ')/(' + walk(el.children[1]).trim() + ')';
      if (tag === 'SUP') return '^(' + inner().trim() + ')';
      if (tag === 'SUB') return '_' + inner().trim();
      if (tag === 'TR') return [...el.children].map((c) => walk(c).trim()).join(' | ') + '\n';
      if (el.classList.contains('bnum')) return 'Step ' + inner().trim() + ': ';
      if (/^(DIV|P|LI|TABLE|THEAD|TBODY|H3|H4|OL|UL)$/.test(tag)) return inner() + '\n';
      return inner();
    };
    return walk(root).replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  }

  /* Phone photos are large: shrink to at most 2000 px on the long side, as JPEG. */
  function shrink(file) {
    return new Promise((resolve) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => resolve(b || file), 'image/jpeg', 0.88);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function prompt(topic, problem, solution) {
    return [
      'You are a patient numerical-methods tutor checking a student\'s handwritten work. The photo shows the student\'s own solution on paper.',
      'Below are the problem and the CORRECT worked solution, computed exactly by the app. Trust these values; do not redo the arithmetic unless you must.',
      '',
      'Topic: ' + topic.title + ' (' + topic.book + ')',
      'Problem data the student typed into the app:',
      problem,
      '',
      'Correct worked solution:',
      solution.slice(0, 12000),
      '',
      'Do this:',
      '1. Read the handwriting carefully. Copy what the student wrote, line by line, into "transcription" (plain text, fractions as a/b).',
      '2. Match the student\'s lines to the correct steps. They may skip steps, change the order, use decimals instead of fractions (accept values that agree after rounding), or use another valid method. Judge the numbers, not the style.',
      '3. Give each step a status: "correct", "wrong", "missing" (needed but not on the page), "unclear" (you cannot read it), or "follows" (wrong only because an earlier mistake carried forward).',
      '4. Find the FIRST real mistake. That is the one to fix.',
      '5. If the photo is not a solution to this problem (other numbers, blank, unreadable), set "matchesProblem" to false and say why in "summary".',
      '',
      'Reply with only this JSON, no other text:',
      '{"matchesProblem": true, "readable": true, "transcription": ["..."], "steps": [{"step": "short name, e.g. L1 bottom", "student": "what they wrote", "correct": "the correct value", "status": "correct", "note": "one short sentence"}], "firstMistake": "where and what, in one or two sentences, or null", "summary": "one-sentence verdict", "tip": "one concrete tip, or null"}',
      'Write for a student who finds this hard: simple English, kind and specific, no more than 12 steps.',
    ].join('\n');
  }

  const STATUS = {
    correct: ['✓', 'good', 'Correct'], wrong: ['✗', 'bad', 'Mistake'], follows: ['→', 'warn', 'Follows from an earlier mistake'],
    missing: ['…', 'warn', 'Missing'], unclear: ['?', 'muted', 'Could not read'],
  };
  const ERRORS = {
    not_granted: 'Claude is not allowed for this page. You can still compare your photo with the solution yourself.',
    sampling_disabled: 'Claude is not available on this account.',
    rate_limited: 'Too many checks for now. Wait a few minutes, then try again.',
    session_expired: 'Sign in to Claude again, then try again.',
    image_rejected: 'That photo could not be used. Try another photo (JPEG or PNG).',
    images_unavailable: 'This view cannot send photos to Claude.',
    refused: 'Claude would not check this photo. Try a clearer photo of just your solution.',
    invalid_json: 'Claude\'s answer came back garbled. Press Check again.',
  };

  NM.pages.check = (el) => {
    el.appendChild(h('h1', { text: 'Check my work' }));
    el.appendChild(h('p', { class: 'muted', text: 'Solve on paper first. Then pick the topic, type the same numbers as your problem, and take a photo of your work.' }));

    /* 1. topic */
    const exam = UI.confirmedTopics();
    const sel = h('select', { id: 'check-topic' },
      exam.length ? h('optgroup', { label: 'Your ' + UI.examName().toLowerCase() + ' exam' }, exam.map((id) => h('option', { value: id }, NM.topic(id).num + '. ' + NM.topic(id).title))) : null,
      h('optgroup', { label: exam.length ? 'Other topics' : 'Topics' }, NM.topics.filter((t) => !exam.includes(t.id)).map((t) => h('option', { value: t.id }, t.num + '. ' + t.title))));
    const saved = UI.store.get('check-topic', null);
    sel.value = NM.topic(saved) ? saved : exam[0] || NM.CURRENT;
    el.appendChild(h('div', { class: 'card' }, h('h2', { class: 'check-h', text: '1. Topic' }), h('label', { class: 'field' }, h('span', { text: 'Which topic is your solution?' }), sel)));

    /* 2. the problem: the topic's own Solver form, with its solution kept hidden */
    const solver = h('div', { class: 'check-solver' });
    el.appendChild(h('div', { class: 'card' }, h('h2', { class: 'check-h', text: '2. Your problem' }),
      h('p', { class: 'muted small', text: 'Type the numbers from your question. The app works out the correct solution but keeps it hidden until after the check.' }), solver));
    const mountSolver = () => {
      solver.innerHTML = '';
      solver.classList.add('hide-solution');
      reveal.textContent = 'Show the correct solution';
      NM.topic(sel.value).solve(solver);
      solver.querySelectorAll('button').forEach((b) => { if (b.textContent === 'Show the solution') b.textContent = 'Use these numbers'; });
    };
    // run the topic's solver again so the hidden solution matches the numbers now in the boxes
    const recompute = () => { const b = [...solver.querySelectorAll('button')].find((x) => x.textContent === 'Use these numbers'); if (b) b.click(); };
    const problemText = () => [...solver.querySelectorAll('.card input, .card select, .card textarea')].map((inp) => {
      const label = inp.closest('label') ? inp.closest('label').querySelector('span') : null;
      const name = label ? label.textContent.trim() : inp.getAttribute('aria-label') || '';
      const val = inp.type === 'checkbox' ? (inp.checked ? 'yes' : 'no') : inp.value;
      return name && String(val).trim() ? '- ' + name + ': ' + val : null;
    }).filter(Boolean).join('\n');

    /* 3. photo */
    const photos = [];
    const strip = h('div', { class: 'check-photos' });
    const camera = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'visually-hidden', id: 'check-camera' });
    const gallery = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'visually-hidden', id: 'check-gallery' });
    const addFiles = async (files) => {
      for (const f of [...files]) { if (photos.length >= maxPhotos) break; photos.push({ blob: await shrink(f), url: '' }); }
      drawPhotos();
    };
    camera.addEventListener('change', () => { addFiles(camera.files); camera.value = ''; });
    gallery.addEventListener('change', () => { addFiles(gallery.files); gallery.value = ''; });
    let maxPhotos = 3;
    const drawPhotos = () => {
      strip.innerHTML = '';
      photos.forEach((p, k) => {
        if (!p.url) p.url = URL.createObjectURL(p.blob);
        strip.appendChild(h('figure', { class: 'check-photo' }, h('img', { src: p.url, alt: 'Photo ' + (k + 1) + ' of your solution' }),
          h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { URL.revokeObjectURL(p.url); photos.splice(k, 1); drawPhotos(); } }, 'Remove')));
      });
      checkBtn.disabled = !photos.length;
      sideBySide.hidden = !photos.length || ai;
    };
    el.appendChild(h('div', { class: 'card' }, h('h2', { class: 'check-h', text: '3. Photo of your work' }),
      h('p', { class: 'muted small', text: 'Good light, the whole solution in the frame, one page per photo. Up to 3 photos for a long solution.' }),
      h('div', { class: 'row' },
        h('label', { class: 'btn primary', for: 'check-camera' }, 'Take a photo'),
        h('label', { class: 'btn', for: 'check-gallery' }, 'Choose from gallery'), camera, gallery),
      strip));

    /* 4. check */
    const status = h('div', { class: 'check-status', 'aria-live': 'polite' });
    const result = h('div');
    const checkBtn = h('button', { class: 'btn primary', type: 'button', disabled: true }, 'Check my work');
    const stopBtn = h('button', { class: 'btn ghost', type: 'button', hidden: true }, 'Stop');
    const aiNote = h('p', { class: 'muted small' });
    const sideBySide = h('p', { class: 'muted small', hidden: true, text: 'Compare your photo with the correct solution below, line by line. The first line that differs is where to look.' });
    const reveal = h('button', { class: 'btn', type: 'button' }, 'Show the correct solution');
    reveal.addEventListener('click', () => {
      const hidden = solver.classList.toggle('hide-solution');
      reveal.textContent = hidden ? 'Show the correct solution' : 'Hide the correct solution';
      if (!hidden) solver.querySelector('.paper') && solver.querySelector('.paper').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const checkCard = h('div', { class: 'card' }, h('h2', { class: 'check-h', text: '4. Check' }), aiNote,
      h('div', { class: 'row' }, checkBtn, stopBtn, reveal), status, sideBySide, result);
    el.appendChild(checkCard);

    sel.addEventListener('change', () => { UI.store.set('check-topic', sel.value); result.innerHTML = ''; status.textContent = ''; mountSolver(); });
    mountSolver();

    /* Claude is only reachable inside the claude.ai viewer */
    let ai = null, ctl = null;
    checkBtn.hidden = true;
    aiNote.textContent = 'Looking for Claude…';
    const noAI = (why) => {
      ai = null; checkBtn.hidden = true;
      aiNote.textContent = why || 'Automatic checking works in the claude.ai copy of this app. Here, compare your photo with the correct solution yourself.';
      drawPhotos();
    };
    const use = window.claude && typeof window.claude.use === 'function' ? window.claude.use('sample') : Promise.resolve(null);
    use.then(async (sample) => {
      if (!sample) return noAI();
      const lim = await sample.limits().catch(() => null);
      if (!lim || !lim.images) return noAI('This view cannot send photos to Claude. Compare your photo with the correct solution yourself.');
      ai = sample; maxPhotos = Math.min(3, lim.images.maxCount || 1);
      checkBtn.hidden = false;
      aiNote.textContent = 'Claude reads your handwriting and compares it with the correct steps. It uses your Claude account and takes about a minute.';
      drawPhotos();
    }).catch(() => noAI());

    stopBtn.addEventListener('click', () => ctl && ctl.abort());
    checkBtn.addEventListener('click', async () => {
      if (!ai || !photos.length) return;
      recompute();
      const paper = solver.querySelector('.paper');
      const err = solver.querySelector('.callout.bad');
      if (!paper || err) { status.textContent = 'Fix the problem numbers first: ' + (err ? err.textContent.replace(/^Can't solve this yet/, '').trim() : 'the app could not solve it.'); return; }
      const topic = NM.topic(sel.value);
      ctl = new AbortController();
      checkBtn.disabled = true; stopBtn.hidden = false; result.innerHTML = '';
      const t0 = Date.now();
      status.textContent = 'Reading your work…';
      const tick = setInterval(() => { status.textContent = 'Reading your work… ' + Math.round((Date.now() - t0) / 1000) + ' s'; }, 1000);
      try {
        const r = await ai.json(prompt(topic, problemText(), boardText(paper)), { images: photos.map((p) => p.blob), signal: ctl.signal });
        status.textContent = '';
        render(r);
      } catch (e) {
        status.textContent = e && e.code === 'cancelled' ? 'Stopped.' : ERRORS[e && e.code] || 'Something went wrong while checking. Press Check again in a moment.';
        if (e && (e.code === 'not_granted' || e.code === 'sampling_disabled' || e.code === 'images_unavailable')) noAI(ERRORS[e.code]);
      } finally {
        clearInterval(tick); checkBtn.disabled = !photos.length; stopBtn.hidden = true;
      }
    });

    function render(r) {
      r = r && typeof r === 'object' ? r : {};
      const steps = Array.isArray(r.steps) ? r.steps : [];
      const wrong = steps.filter((s) => s && s.status === 'wrong');
      const ok = r.matchesProblem !== false && r.readable !== false && !wrong.length && steps.some((s) => s && s.status === 'correct');
      result.appendChild(h('div', { class: 'callout ' + (ok ? 'good' : 'warn') },
        h('h3', { text: r.matchesProblem === false ? 'This photo doesn\'t match the problem' : ok ? 'Looks right' : wrong.length ? 'Found the first mistake' : 'Check the details below' }),
        h('div', null,
          r.summary ? h('p', { text: String(r.summary) }) : null,
          r.firstMistake ? h('p', null, h('b', { text: 'First mistake: ' }), document.createTextNode(String(r.firstMistake))) : null,
          r.tip ? h('p', null, h('b', { text: 'Tip: ' }), document.createTextNode(String(r.tip))) : null)));
      if (steps.length) {
        result.appendChild(h('ol', { class: 'check-steps' }, steps.slice(0, 16).map((s) => {
          const st = STATUS[s && s.status] || STATUS.unclear;
          return h('li', { class: 'check-step ' + st[1] },
            h('span', { class: 'check-mark', 'aria-label': st[2], text: st[0] }),
            h('div', null,
              h('b', { text: String(s.step || '') }),
              s.student ? h('div', { class: 'small' }, h('span', { class: 'muted', text: 'You wrote: ' }), document.createTextNode(String(s.student))) : null,
              s.status !== 'correct' && s.correct ? h('div', { class: 'small' }, h('span', { class: 'muted', text: 'Correct: ' }), document.createTextNode(String(s.correct))) : null,
              s.note ? h('div', { class: 'small muted', text: String(s.note) }) : null));
        })));
      }
      if (Array.isArray(r.transcription) && r.transcription.length) {
        result.appendChild(h('details', { class: 'check-read' }, h('summary', { text: 'What Claude read from your photo' }),
          h('pre', { text: r.transcription.map(String).join('\n') }),
          h('p', { class: 'small muted', text: 'Claude can misread handwriting. If a line here differs from your paper, that is a reading slip, not your mistake.' })));
      }
    }
  };
})(window.NM);
