/* keypad.js — an on-screen scientific keypad laid out like the Casio fx-991EX ClassWiz.
   It slides up under any number box on the page and types symbols the engine reads
   (−, ×, ÷, π, √, ^, sin, ln …). The bar above the keys shows the value as you type, like
   the calculator's display; = turns the box into its exact result (16/72 → 2/9) and S⇔D
   switches between fraction and decimal. Phones get it by default; Settings can turn it
   on everywhere or off. */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { h } = UI;

  /* ---------- arithmetic ---------- */
  // exact value when the expression only uses numbers, + − × ÷ and whole powers; else null
  function exact(node) {
    const Q = E.Q;
    switch (node.k) {
      case 'num': return Q.parse(String(node.v));
      case 'neg': { const a = exact(node.a); return a && a.neg(); }
      case '+': case '-': case '*': case '/': {
        const a = exact(node.a), b = exact(node.b);
        if (!a || !b || (node.k === '/' && b.isZero())) return null;
        return node.k === '+' ? a.add(b) : node.k === '-' ? a.sub(b) : node.k === '*' ? a.mul(b) : a.div(b);
      }
      case '^': {
        const a = exact(node.a), b = exact(node.b);
        if (!a || !b || !b.isInt() || b.n > 64n || b.n < -64n) return null;
        let r = Q.from(1);
        for (let k = 0n; k < (b.n < 0n ? -b.n : b.n); k++) r = r.mul(a);
        return b.n < 0n ? (r.isZero() ? null : Q.from(1).div(r)) : r;
      }
      default: return null;
    }
  }
  const hasX = (n) => !!n && (n.k === 'x' || hasX(n.a) || hasX(n.b));
  const normalize = (s) => String(s).trim().replace(/(\d)\s*[×xX]\s*10\s*\^/g, '$1*10^');
  // one item: {q, v} for a number, {expr} for a formula in x, {error} if unreadable, null if empty
  function evaluate(text) {
    const s = normalize(text);
    if (!s) return null;
    const c = E.compile(s);
    if (!c.ok) return { error: c.error };
    if (hasX(c.node)) return { expr: true, html: c.html };
    const q = exact(c.node), v = q ? q.toNumber() : c.f(0);
    if (!isFinite(v)) return { error: 'Math error: that value is undefined.' };
    return { q, v };
  }
  const minus = (s) => s.replace(/-/g, '−');
  const dec = (v) => { const s = Number(v.toPrecision(10)).toString(); return minus(s); };
  const frac = (q) => minus(q.toString());
  // a fraction worth showing: whole, or a denominator under 10 000 (a typed decimal stays a decimal)
  const nice = (q) => !!q && (q.isInt() || q.d < 10000n);
  // a decimal as a fraction, when it is one with a denominator below 10 000 (S⇔D)
  function toFraction(v) {
    let h0 = 1, h1 = 0, k0 = 0, k1 = 1, x = v;
    for (let i = 0; i < 20; i++) {
      const a = Math.floor(x);
      [h0, h1] = [a * h0 + h1, h0]; [k0, k1] = [a * k0 + k1, k0];
      if (k0 > 9999) return null;
      if (Math.abs(v - h0 / k0) < 1e-10 * Math.max(1, Math.abs(v))) return E.Q.from(h0).div(E.Q.from(k0));
      if (x === a) break;
      x = 1 / (x - a);
    }
    return null;
  }

  /* ---------- keys, as on the fx-991EX (SHIFT functions in the small label above) ---------- */
  const fx = (main, shift) => ({ main, shift });
  const k = (label, ins, aria) => ({ label, ins, aria });
  const FN = [
    fx(k('SHIFT', 'SHIFT', 'Shift'), null),
    fx(k('<span class="kp-fr"><span>■</span><span>□</span></span>', '/', 'Fraction'), null),
    fx(k('√■', '√(|)', 'Square root'), k('∛■', 'cbrt(|)', 'Cube root')),
    fx(k('<i>x</i><sup>2</sup>', '^2', 'Squared'), k('<i>x</i><sup>3</sup>', '^3', 'Cubed')),
    fx(k('<i>x</i><sup>■</sup>', '^(|)', 'Power'), k('<sup>■</sup>√', '^(1/|)', 'Root')),
    fx(k('log', 'log(|)', 'Log base 10'), k('10<sup>■</sup>', '10^(|)', 'Ten to the power')),
    fx(k('(−)', '−', 'Negative'), null),
    fx(k('<i>x</i><sup>−1</sup>', '^(−1)', 'Reciprocal'), k('Abs', 'abs(|)', 'Absolute value')),
    fx(k('sin', 'sin(|)', 'Sine'), k('sin<sup>−1</sup>', 'asin(|)', 'Inverse sine')),
    fx(k('cos', 'cos(|)', 'Cosine'), k('cos<sup>−1</sup>', 'acos(|)', 'Inverse cosine')),
    fx(k('tan', 'tan(|)', 'Tangent'), k('tan<sup>−1</sup>', 'atan(|)', 'Inverse tangent')),
    fx(k('ln', 'ln(|)', 'Natural log'), k('<i>e</i><sup>■</sup>', 'e^(|)', 'e to the power')),
    fx(k('<i>x</i>', 'x', 'Variable x'), null),
    fx(k('π', 'π', 'Pi'), null),
    fx(k('<i>e</i>', 'e', 'e'), null),
    fx(k('(', '(', 'Open bracket'), null),
    fx(k(')', ')', 'Close bracket'), null),
    fx(k(',', ', ', 'Comma, next number'), null),
  ];
  const NUM = [
    ['7'], ['8'], ['9'], ['DEL', 'DEL', 'Delete'], ['AC', 'AC', 'Clear all'],
    ['4'], ['5'], ['6'], ['×', '×', 'Times'], ['÷', '÷', 'Divide'],
    ['1'], ['2'], ['3'], ['+', '+', 'Plus'], ['−', '−', 'Minus'],
    ['0'], ['.', '.', 'Point'], ['×10<sup><i>x</i></sup>', '×10^(|)', 'Times ten to the power'], ['Ans', 'Ans', 'Last answer'], ['=', '=', 'Equals'],
  ];

  /* ---------- which boxes get it ---------- */
  const coarse = typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)') : null;
  const enabled = () => {
    const s = UI.settings.keypad || 'auto';
    return s === 'on' || (s === 'auto' && !!(coarse && coarse.matches));
  };
  const eligible = (el) => !!el && el.tagName === 'INPUT' && el.type === 'text' && !el.disabled && !el.readOnly &&
    el.dataset.kp !== 'off' && el.dataset.kpNative !== '1' && !!el.closest('#content');
  const allInputs = () => [...document.querySelectorAll('#content input[type="text"]')].filter((el) => eligible(el) && el.offsetParent !== null);

  /* ---------- the sheet ---------- */
  let sheet, display, fnKeys, nextBtn, cur = null, shift = false, ans = '';
  function build() {
    display = h('div', { class: 'kp-display', 'aria-live': 'polite' });
    const nav = (label, aria, act) => h('button', { class: 'kp-nav', type: 'button', tabindex: '-1', 'aria-label': aria, html: label, 'data-act': act });
    nextBtn = nav('Next', 'Next box', 'next');
    const bar = h('div', { class: 'kp-bar' }, display,
      nav('◀', 'Move left', 'left'), nav('▶', 'Move right', 'right'), nav('S⇔D', 'Fraction or decimal', 'sd'),
      nav('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>', 'Use the phone keyboard', 'native'),
      nextBtn);
    fnKeys = FN.map((f) => {
      const b = h('button', { class: 'kp-key kp-fn' + (f.main.ins === 'SHIFT' ? ' kp-shift' : ''), type: 'button', tabindex: '-1', 'aria-label': f.main.aria },
        h('span', { class: 'kp-alt', html: f.shift ? f.shift.label : '&nbsp;' }), h('span', { class: 'kp-main', html: f.main.label }));
      b._f = f;
      return b;
    });
    const numKeys = NUM.map(([label, ins, aria]) => {
      const b = h('button', { class: 'kp-key kp-n' + (/^(DEL|AC)$/.test(label) ? ' kp-del' : label === '=' ? ' kp-eq' : /^[×÷+−]$/.test(label) ? ' kp-op' : '') + (label.length > 3 && !/^(DEL|Ans)$/.test(label) ? ' kp-small' : ''), type: 'button', tabindex: '-1', 'aria-label': aria || label, html: '<span>' + label + '</span>' });
      b._ins = ins || label;
      return b;
    });
    sheet = h('div', { class: 'kp', role: 'group', 'aria-label': 'Calculator keypad', hidden: true },
      h('div', { class: 'kp-inner' }, bar, h('div', { class: 'kp-grid kp-grid-fn' }, fnKeys), h('div', { class: 'kp-grid kp-grid-num' }, numKeys)));
    // A key acts the moment it is pressed, like a real calculator. Cancelling the press keeps the
    // focus (and the caret) in the box; a click with no press before it (a screen reader) still works.
    let pressedAt = 0;
    const release = () => sheet.querySelectorAll('.down').forEach((b) => b.classList.remove('down'));
    sheet.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('button');
      e.preventDefault();
      if (!b || b.disabled) return;
      b.classList.add('down');
      pressedAt = Date.now();
      act(b);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => sheet.addEventListener(t, release));
    sheet.addEventListener('mousedown', (e) => e.preventDefault());
    sheet.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b && Date.now() - pressedAt > 600) act(b);
    });
    document.body.appendChild(sheet);
  }
  function act(b) {
    if (!cur) return;
    if (b.dataset.act) return navAct(b.dataset.act);
    if (!b._f) return press(b._ins);
    if (b._f.main.ins === 'SHIFT') { shift = !shift; paintShift(); return; }
    const key = shift && b._f.shift ? b._f.shift : b._f.main;
    shift = false; paintShift();
    press(key.ins);
  }
  const paintShift = () => {
    sheet.classList.toggle('shifted', shift);
    fnKeys.forEach((b) => { const f = b._f; if (f.shift) b.querySelector('.kp-main').innerHTML = shift ? f.shift.label : f.main.label; b.querySelector('.kp-alt').innerHTML = f.shift ? (shift ? f.main.label : f.shift.label) : '&nbsp;'; b.setAttribute('aria-label', shift && f.shift ? f.shift.aria : f.main.aria); });
  };

  /* ---------- typing ---------- */
  const caret = () => [cur.selectionStart == null ? cur.value.length : cur.selectionStart, cur.selectionEnd == null ? cur.value.length : cur.selectionEnd];
  function changed() { cur.dispatchEvent(new Event('input', { bubbles: true })); show(); }
  function insert(text) {
    const mark = text.indexOf('|'), t = text.replace('|', '');
    const [s, e] = caret();
    cur.setRangeText(t, s, e, 'end');
    if (mark >= 0) cur.setSelectionRange(s + mark, s + mark);
    changed();
  }
  function press(ins) {
    if (ins === 'DEL') {
      const [s, e] = caret();
      if (s !== e) { cur.setRangeText('', s, e, 'end'); return changed(); }
      if (!s) return;
      const before = cur.value.slice(0, s);
      const m = /(asin|acos|atan|sin|cos|tan|log|ln|abs|cbrt|√|×10\^)\($|, $/.exec(before);
      const n = m ? m[0].length : 1;
      cur.setRangeText('', s - n, s, 'end');
      return changed();
    }
    if (ins === 'AC') { cur.value = ''; return changed(); }
    if (ins === 'Ans') return ans ? insert(ans) : flash('No answer yet. Press = first.');
    if (ins === '=') return equals();
    if (ins === 'x' && cur.dataset.kp !== 'expr') return flash('x is only for f(x) boxes.');
    insert(ins);
  }
  function equals() {
    const raw = cur.value.trim();
    if (!raw) return;
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    const out = [];
    for (const p of parts) {
      const r = evaluate(p);
      if (!r || r.error) return flash(r ? r.error : 'Type something first.');
      if (r.expr) return flash('That is a formula in x, so it stays as it is.');
      out.push(nice(r.q) ? frac(r.q) : dec(r.v));
    }
    cur.value = out.join(', ');
    cur.setSelectionRange(cur.value.length, cur.value.length);
    if (out.length === 1) ans = out[0];
    changed();
  }
  function navAct(act) {
    const [s] = caret();
    if (act === 'left') cur.setSelectionRange(Math.max(0, s - 1), Math.max(0, s - 1));
    else if (act === 'right') cur.setSelectionRange(Math.min(cur.value.length, s + 1), Math.min(cur.value.length, s + 1));
    else if (act === 'sd') {
      const r = evaluate(cur.value);
      if (!r || r.error || r.expr) return flash('S⇔D works on a single number.');
      // a/b → decimal; a decimal → a/b when it is one (S⇔D on the calculator)
      const f = toFraction(r.v);
      cur.value = cur.value.includes('/') ? dec(r.v) : f && !f.isInt() ? frac(f) : dec(r.v);
      changed();
    } else if (act === 'native') {
      const box = cur;
      box.dataset.kpNative = '1';
      box.setAttribute('inputmode', box.dataset.kpMode || 'text');
      close();
      box.blur(); setTimeout(() => box.focus(), 30);
    } else if (act === 'next') {
      const list = allInputs(), i = list.indexOf(cur);
      if (i >= 0 && i < list.length - 1) list[i + 1].focus(); else cur.blur();
    }
  }
  let flashTimer = null;
  function flash(msg) {
    display.classList.add('kp-msg');
    display.textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(show, 1800);
  }
  // the live value, like the calculator's display
  function show() {
    if (!cur) return;
    display.classList.remove('kp-msg');
    const raw = cur.value.trim();
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    if (!parts.length) { display.innerHTML = '<span class="kp-hint">= gives the value</span>'; return; }
    if (parts.length > 1) {
      const bad = parts.findIndex((p) => { const r = evaluate(p); return !r || r.error || r.expr; });
      display.innerHTML = bad >= 0 ? '<span class="kp-err">Item ' + (bad + 1) + ' is not a number yet</span>' : parts.length + ' numbers';
      return;
    }
    const r = evaluate(parts[0]);
    if (!r) display.textContent = '';
    else if (r.error) display.innerHTML = '<span class="kp-err">' + r.error.replace(/</g, '&lt;') + '</span>';
    else if (r.expr) display.innerHTML = '<span class="math">' + r.html + '</span>';
    else display.innerHTML = '= ' + (nice(r.q) && !r.q.isInt() ? E.qHTML(r.q) + ' <span class="kp-dec">≈ ' + dec(r.v) + '</span>' : '<b>' + dec(r.v) + '</b>');
  }

  /* ---------- opening and closing ---------- */
  function open(el) {
    if (!sheet) build();
    if (cur && cur !== el) cur.classList.remove('kp-active');
    cur = el;
    el.classList.add('kp-active');
    const list = allInputs(), i = list.indexOf(el);
    nextBtn.textContent = i >= 0 && i < list.length - 1 ? 'Next' : 'Done';
    fnKeys.forEach((b) => { if (b._f.main.ins === 'x') b.disabled = el.dataset.kp !== 'expr'; });
    const wasHidden = sheet.hidden;
    sheet.hidden = false;
    document.documentElement.style.setProperty('--kp-h', sheet.offsetHeight + 'px');
    document.body.classList.add('kp-open');
    if (wasHidden) { sheet.classList.remove('kp-in'); void sheet.offsetWidth; sheet.classList.add('kp-in'); }
    show();
    // keep the box in view above the keys
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect(), room = innerHeight - sheet.offsetHeight;
      if (r.bottom > room - 12 || r.top < 80) window.scrollBy({ top: r.top - Math.max(90, room * 0.35), behavior: 'smooth' });
    });
  }
  function close() {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    shift = false; paintShift();
    document.body.classList.remove('kp-open');
    document.documentElement.style.setProperty('--kp-h', '0px');
    if (cur) cur.classList.remove('kp-active');
    cur = null;
  }
  // set inputmode before the tap focuses the box, so the phone keyboard never appears
  const prime = (el) => {
    if (!eligible(el) || !enabled()) return;
    if (el.dataset.kpMode === undefined) el.dataset.kpMode = el.getAttribute('inputmode') || '';
    el.setAttribute('inputmode', 'none');
  };
  document.addEventListener('pointerdown', (e) => prime(e.target), true);
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (eligible(el) && enabled()) { prime(el); open(el); }
    else if (sheet && !sheet.contains(el)) close();
  });
  document.addEventListener('focusout', () => setTimeout(() => {
    const a = document.activeElement;
    if (!eligible(a) || !enabled()) close();
  }, 0));
  document.addEventListener('input', (e) => { if (e.target === cur && e.isTrusted) show(); });
  // a page change removes the box: close with it
  window.addEventListener('hashchange', close);
  UI.keypad = { close, evaluate, enabled };
})(window.NM);
