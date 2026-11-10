/* rcode.js — "R code for the coding test" (#/rcode): the instructor's two divided-difference
   functions in R, line by line, a box to try your own points (showing exactly what R prints),
   and tested code for what the instructor may add next. Every block and every "R prints" line
   here was run in R 4.6.1; tests/semifinal.test.js checks the printing rules against R's output. */
(function (NM) {
  'use strict';
  const { UI, E } = NM;
  const { h, M } = UI;
  const v = (k) => M.v('x', k), w = (k) => M.v('y', k);

  /* ---------- how R prints a vector of numbers (print(), 7 significant digits) ----------
     Every entry gets the same number of decimals (the most any entry needs, up to 7 significant
     digits), right-aligned; R switches to 1e-05 style only when that is narrower. */
  const sig = (x) => {
    if (x === 0) return { neg: false, kp: 0, nsig: 1 };
    const [m, e] = Math.abs(x).toExponential(6).split('e');
    return { neg: x < 0, kp: Number(e), nsig: Math.max(1, m.replace('.', '').replace(/0+$/, '').length) };
  };
  UI.rPrint = (vals, width) => {
    const xs = [].concat(vals);
    if (xs.some((x) => !Number.isFinite(x))) return '[1] ' + xs.map((x) => (Number.isNaN(x) ? 'NaN' : x === Infinity ? 'Inf' : x === -Infinity ? '-Inf' : String(x))).join(' ');
    let rgt = 0, mxsl = 1, mxns = 1, mxe = 0, anyNeg = false;
    xs.forEach((x) => {
      const s = sig(x), left = s.kp + 1;
      rgt = Math.max(rgt, s.nsig - left);
      mxsl = Math.max(mxsl, (s.neg ? 1 : 0) + (left <= 0 ? 1 : left));
      mxns = Math.max(mxns, s.nsig);
      mxe = Math.max(mxe, Math.abs(s.kp));
      if (s.neg) anyNeg = true;
    });
    const fixedW = mxsl + rgt + (rgt ? 1 : 0), sciW = (anyNeg ? 1 : 0) + (mxns > 1 ? mxns + 1 : mxns) + (mxe >= 100 ? 5 : 4);
    const strs = fixedW <= sciW ? xs.map((x) => (x === 0 ? 0 : x).toFixed(rgt))
      : xs.map((x) => x.toExponential(mxns - 1).replace(/e([+-])(\d)$/, 'e$10$2'));
    // long vectors wrap at 80 characters; the [n] labels are as wide as the label of the last entry
    const labW = String(xs.length).length + 2, cw = Math.max(...strs.map((s) => s.length));
    const per = Math.max(1, Math.floor(((width || 80) - labW) / (cw + 1))), lab = (i) => '[' + (i + 1) + ']';
    const lines = [];
    for (let i = 0; i < strs.length; i += per) lines.push(lab(i).padStart(labW) + ' ' + strs.slice(i, i + per).map((s) => s.padStart(cw)).join(' '));
    return lines.join('\n');
  };

  /* ---------- the divided-difference table, worked out the same way the R code does ---------- */
  // t[i][j]: column j (0 = y), row i; the same subtraction and division, in the same order, as a, b, … in R
  const ddTable = (x, y) => {
    const n = x.length, t = x.map(() => []);
    y.forEach((val, i) => { t[i][0] = val; });
    for (let j = 1; j < n; j++) for (let i = j; i < n; i++) t[i][j] = (t[i][j - 1] - t[i - 1][j - 1]) / (x[i] - x[i - j]);
    return t;
  };
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
  // the instructor's names: first differences a, b, c, …, then the next column carries on the alphabet
  const letterOf = (n) => { const out = {}; let k = 0; for (let j = 1; j < n; j++) for (let i = j; i < n; i++) out[i + ',' + j] = LETTERS[k++] || ''; return out; };
  // a short number for the board: whole numbers as they are, otherwise up to 4 decimals
  const short = (x) => { if (Object.is(x, -0) || Math.abs(x) < 1e-12) return '0'; const s = Number.isInteger(x) ? String(x) : String(Number(x.toFixed(4))); return s.replace('-', '−'); };

  /* ---------- a listing: code lines, each with a note under it; "Hide code" turns it into a drill ---------- */
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paint = (code) => {
    const hash = code.indexOf('#');
    const body = hash >= 0 ? code.slice(0, hash) : code, rest = hash >= 0 ? code.slice(hash) : '';
    return esc(body).replace(/\b(function|return|for|in|if|else)\b/g, '<b class="rk">$1</b>').replace(/([A-Za-z_][A-Za-z0-9_.]*)(?=\()/g, (m, name) => (/^(function|return|for|if)$/.test(name) ? m : '<span class="rf">' + name + '</span>')) +
      (rest ? '<i class="rcm">' + esc(rest) + '</i>' : '');
  };
  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall back below */ }
    try {
      const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }, text);
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  };
  function listing(L) {
    const box = h('div', { class: 'rc' });
    const lines = h('ol', { class: 'rc-lines' });
    L.lines.forEach(([code, note], k) => {
      const li = h('li', { class: 'rc-line' + (note ? ' has-note' : '') });
      const c = h('code', { class: 'rc-code', html: paint(code) || ' ' });
      li.append(c);
      if (note) {
        li.append(h('button', { class: 'rc-peek', type: 'button', 'aria-label': 'Show line ' + (k + 1), onclick: () => li.classList.add('shown') }, 'Write line ' + (k + 1) + ', then tap to check'));
        li.append(h('p', { class: 'rc-note', html: note }));
      }
      lines.append(li);
    });
    const hide = h('button', { class: 'rc-btn', type: 'button', 'aria-pressed': 'false', onclick: () => {
      const on = !box.classList.contains('memory');
      box.classList.toggle('memory', on);
      box.querySelectorAll('.rc-line.shown').forEach((li) => li.classList.remove('shown'));
      hide.setAttribute('aria-pressed', String(on));
      hide.textContent = on ? 'Show code' : 'Hide code';
    } }, 'Hide code');
    const copy = h('button', { class: 'rc-btn', type: 'button', onclick: async () => UI.toast((await copyText(L.lines.map((x) => x[0]).concat(L.run ? [L.run] : []).join('\n'))) ? 'Copied. Paste it into RStudio.' : 'Could not copy here. Select the code instead.') }, 'Copy');
    box.append(h('div', { class: 'rc-bar' }, h('span', { class: 'rc-name', text: L.name }), L.drill === false ? null : hide, copy));
    if (L.needs) box.append(h('p', { class: 'rc-needs', html: 'Run first: ' + L.needs.map((k) => '<code>' + NEED_NAME[k] + '</code>').join(' and ') + '.' }));
    box.append(lines);
    if (L.run) box.append(h('div', { class: 'rc-run' }, h('span', { class: 'rc-l', text: 'Run it' }), h('code', { class: 'rc-code', html: paint(L.run) })));
    if (L.out) box.append(h('div', { class: 'rc-out' }, h('span', { class: 'rc-l', text: L.outLabel || 'R prints' }), h('pre', { text: L.out })));
    if (L.after) box.append(h('p', { class: 'rc-after', html: L.after }));
    return box;
  }

  const NEED_NAME = { FOUR: 'four_points (and its x, y)', COEF: 'newton_coef', EVAL: 'newton_eval' };

  /* ---------- the triangle: where each letter sits, with its value ---------- */
  function triangle(x, y, opt) {
    opt = opt || {};
    const n = x.length, t = ddTable(x, y), names = opt.names ? letterOf(n) : {};
    const grid = h('div', { class: 'rc-tri', style: { gridTemplateColumns: 'repeat(' + (n + 1) + ', minmax(0, auto))' }, role: 'img', 'aria-label': 'Divided-difference table. The top edge is y1' + (n > 1 ? ', ' + Array.from({ length: n - 1 }, (_, j) => (names[j + 1 + ',' + (j + 1)] || 'column ' + (j + 1)) + ' = ' + short(t[j + 1][j + 1])).join(', ') : '') });
    const put = (row, col, html, cls) => grid.append(h('span', { class: 'rc-cell' + (cls ? ' ' + cls : ''), style: { gridRow: String(row + 2), gridColumn: String(col + 1) }, html }));
    ['<i>x</i>', '<i>y</i>'].concat(Array.from({ length: n - 1 }, (_, j) => ['1st', '2nd', '3rd'][j] || (j + 1) + 'th')).forEach((lab, c) => grid.append(h('span', { class: 'rc-head', style: { gridRow: '1', gridColumn: String(c + 1) }, html: lab })));
    for (let i = 0; i < n; i++) { put(2 * i, 0, short(x[i])); put(2 * i, 1, short(y[i]), i === 0 ? 'top' : ''); }
    for (let j = 1; j < n; j++) for (let i = j; i < n; i++) {
      const nm = names[i + ',' + j];
      put(2 * i - j, j + 1, (nm ? '<b>' + nm + '</b> = ' : '') + short(t[i][j]), i === j ? 'top' : '');
    }
    return grid;
  }
  // P(x) in Newton's form, from the top edge
  const newtonForm = (x, co) => {
    // each term stays on one line; a long P breaks between terms, never inside a bracket
    const term = (s) => '<span class="rc-term">' + s + '</span>';
    let out = term('P(<i>x</i>) = ' + short(co[0]));
    for (let k = 1; k < co.length; k++) {
      if (Math.abs(co[k]) < 1e-12) continue;
      const prod = x.slice(0, k).map((xi) => (Math.abs(xi) < 1e-12 ? '<i>x</i>' : '(<i>x</i> ' + (xi < 0 ? '+ ' + short(-xi) : '− ' + short(xi)) + ')')).join('');
      const c = Math.abs(co[k]);
      out += ' ' + term((co[k] < 0 ? '− ' : '+ ') + (Math.abs(c - 1) < 1e-12 ? '' : short(c)) + prod);
    }
    return out;
  };

  /* ---------- the code (every block was run in R 4.6.1; "out" is what R printed) ---------- */
  const DIVIDED = {
    name: 'divided_diff: three points',
    lines: [
      ['x<-c(0,1)', 'Point 1: ' + v(1) + ' = 0, ' + w(1) + ' = 1. In this function <b>x is a whole point</b>, not the list of x-values.'],
      ['y<-c(2,2)', 'Point 2: (2, 2).'],
      ['z<-c(3,4)', 'Point 3: (3, 4).'],
      ['divided_diff<-function(x,y,z){', 'A function that takes the three points. Inside it, <code>[1]</code> is a point\'s x-value and <code>[2]</code> is its y-value.'],
      ['  a=(y[2]-x[2])/(y[1]-x[1])', '<i>f</i>[' + v(1) + ' ' + v(2) + '] = (' + w(2) + ' − ' + w(1) + ') / (' + v(2) + ' − ' + v(1) + ') = (2 − 1) / (2 − 0) = <b>0.5</b>'],
      ['  b=(z[2]-y[2])/(z[1]-y[1])', '<i>f</i>[' + v(2) + ' ' + v(3) + '] = (4 − 2) / (3 − 2) = <b>2</b>'],
      ['  c=(b-a)/(z[1]-x[1])', '<i>f</i>[' + v(1) + ' ' + v(2) + ' ' + v(3) + '] = (2 − 0.5) / (3 − 0) = <b>0.5</b>. Divide by the <b>two ends</b>, ' + v(3) + ' − ' + v(1) + ', not ' + v(3) + ' − ' + v(2) + '.'],
      ['return(c(x[2],a,c))}', 'Gives back the top edge of the table: ' + w(1) + ', then a, then c. Those are the numbers in Newton\'s form. (Here <code>c</code> is both a number and R\'s <code>c( )</code>; R still works, because after a name with "(" it looks for a function.)'],
    ],
    run: 'divided_diff(x,y,z)', out: '[1] 1.0 0.5 0.5',
    after: 'So <span class="rc-term">P(<i>x</i>) = 1</span> <span class="rc-term">+ 0.5<i>x</i></span> <span class="rc-term">+ 0.5<i>x</i>(<i>x</i> − 2),</span> the book\'s Example 3.1.',
  };
  const FOUR = {
    name: 'four_points: four points',
    lines: [
      ['x<-c(0,2,3,1)', 'The four x-values in order, ' + v(1) + ' … ' + v(4) + '. Here <b>x is the list of x-values</b> (not a point, as in the first function).'],
      ['y<-c(1,2,4,0)', 'The four y-values.'],
      ['four_points<-function(x,y){', 'A function that takes both lists.'],
      ['  a=(y[2]-y[1])/(x[2]-x[1])', '1st column: <i>f</i>[' + v(1) + ' ' + v(2) + '] = (2 − 1) / (2 − 0) = <b>0.5</b>'],
      ['  b=(y[3]-y[2])/(x[3]-x[2])', '<i>f</i>[' + v(2) + ' ' + v(3) + '] = (4 − 2) / (3 − 2) = <b>2</b>'],
      ['  c=(y[4]-y[3])/(x[4]-x[3])', '<i>f</i>[' + v(3) + ' ' + v(4) + '] = (0 − 4) / (1 − 3) = <b>2</b>'],
      ['  d=(b-a)/(x[3]-x[1])', '2nd column: (b − a) over the ends of a and b, ' + v(3) + ' − ' + v(1) + ': (2 − 0.5) / (3 − 0) = <b>0.5</b>'],
      ['  e=(c-b)/(x[4]-x[2])', '(c − b) / (' + v(4) + ' − ' + v(2) + ') = (2 − 2) / (1 − 2) = <b>0</b>'],
      ['  f=(e-d)/(x[4]-x[1])', '3rd column: (e − d) over the ends of everything, ' + v(4) + ' − ' + v(1) + ': (0 − 0.5) / (1 − 0) = <b>−0.5</b>'],
      ['return(c(y[1],a,d,f))}', 'The top edge: ' + w(1) + ', a, d, f.'],
    ],
    run: 'four_points(x,y)', out: '[1]  1.0  0.5  0.5 -0.5',
    after: 'So <span class="rc-term">P(<i>x</i>) = 1</span> <span class="rc-term">+ 0.5<i>x</i></span> <span class="rc-term">+ 0.5<i>x</i>(<i>x</i> − 2)</span> <span class="rc-term">− 0.5<i>x</i>(<i>x</i> − 2)(<i>x</i> − 3).</span> The first three numbers are the same as with three points: adding a point only adds a term.',
  };
  const FIVE = {
    name: 'five_points: five points, the same way',
    lines: [
      ['x<-c(0,2,3,1,4)', 'One more point, (4, 2).'],
      ['y<-c(1,2,4,0,2)', ''],
      ['five_points<-function(x,y){', ''],
      ['  a=(y[2]-y[1])/(x[2]-x[1])', '1st column: 4 letters, a b c d.'],
      ['  b=(y[3]-y[2])/(x[3]-x[2])', ''],
      ['  c=(y[4]-y[3])/(x[4]-x[3])', ''],
      ['  d=(y[5]-y[4])/(x[5]-x[4])', ''],
      ['  e=(b-a)/(x[3]-x[1])', '2nd column: 3 letters, e f g. Each over the ends of its two letters.'],
      ['  f=(c-b)/(x[4]-x[2])', ''],
      ['  g=(d-c)/(x[5]-x[3])', ''],
      ['  h=(f-e)/(x[4]-x[1])', '3rd column: 2 letters, h i.'],
      ['  i=(g-f)/(x[5]-x[2])', ''],
      ['  j=(i-h)/(x[5]-x[1])', '4th column: 1 letter, j, over ' + v(5) + ' − ' + v(1) + '.'],
      ['return(c(y[1],a,e,h,j))}', 'The top edge: ' + w(1) + ' and the first letter of each column.'],
    ],
    run: 'five_points(x,y)', out: '[1]  1.00000000  0.50000000  0.50000000 -0.50000000 -0.04166667',
    after: 'The first four numbers did not change; the new one is −1/24. (R shows 8 decimals for all of them because −0.04166667 needs them.)',
  };
  const COEF = {
    name: 'newton_coef: any number of points',
    lines: [
      ['newton_coef<-function(x,y){', 'Works for 2, 3, 10, … points.'],
      ['  n=length(x)', 'How many points.'],
      ['  a=y', 'Start from the y column. The list <code>a</code> slowly turns into the top edge.'],
      ['  for(j in 2:n){', 'One column at a time: j = 2 is the 1st differences, j = 3 the 2nd, …'],
      ['    for(i in n:j){', 'Bottom to top, so <code>a[i-1]</code> still holds the old column when <code>a[i]</code> uses it.'],
      ['      a[i]=(a[i]-a[i-1])/(x[i]-x[i-j+1])', 'Lower minus upper, over the ends of the span: <code>x[i]</code> and <code>x[i-j+1]</code>.'],
      ['    }', ''],
      ['  }', ''],
      ['return(a)}', 'The same numbers his functions give.'],
    ],
    run: 'newton_coef(c(0,2,3,1),c(1,2,4,0))', out: '[1]  1.0  0.5  0.5 -0.5',
  };
  const PAT = {
    name: 'P at a value, no loop (four points)', needs: ['FOUR'],
    lines: [
      ['p_at<-function(co,x,t){', 'co = what four_points gave back; t = the x you want.'],
      ['return(co[1]+co[2]*(t-x[1])+co[3]*(t-x[1])*(t-x[2])+co[4]*(t-x[1])*(t-x[2])*(t-x[3]))}', 'Newton\'s form written out: each term has one more bracket.'],
    ],
    run: 'p_at(four_points(x,y),x,1.5)', out: '[1] 0.8125',
  };
  const EVAL = {
    name: 'newton_eval: P at a value, any number of points', needs: ['FOUR', 'COEF'],
    lines: [
      ['newton_eval<-function(coef,x,t){', 'Nested multiplication, like the book\'s <code>nest</code>.'],
      ['  n=length(coef)', ''],
      ['  p=coef[n]', 'Start with the last coefficient.'],
      ['  for(k in (n-1):1){', 'Work back to the first one.'],
      ['    p=coef[k]+(t-x[k])*p', 'p = c<sub>k</sub> + (t − ' + v('k') + ') · p'],
      ['  }', ''],
      ['return(p)}', ''],
    ],
    run: 'newton_eval(newton_coef(x,y),x,1.5)', out: '[1] 0.8125',
  };
  const TABLE = {
    name: 'dd_table: the whole table', needs: ['FOUR'],
    drill: false,
    lines: [
      ['dd_table<-function(x,y){', ''],
      ['  n=length(x)', ''],
      ['  t=matrix(0,n,n)', 'An n × n grid of zeros.'],
      ['  t[,1]=y', 'Column 1 is y.'],
      ['  for(j in 2:n){', ''],
      ['    for(i in j:n){', ''],
      ['      t[i,j]=(t[i,j-1]-t[i-1,j-1])/(x[i]-x[i-j+1])', 'The same rule as newton_coef, kept in its own column.'],
      ['    }', ''],
      ['  }', ''],
      ['return(t)}', 'The top edge is the diagonal: <code>diag(dd_table(x,y))</code>.'],
    ],
    run: 'dd_table(x,y)',
    out: '     [,1] [,2] [,3] [,4]\n[1,]    1  0.0  0.0  0.0\n[2,]    2  0.5  0.0  0.0\n[3,]    4  2.0  0.5  0.0\n[4,]    0  2.0  0.0 -0.5',
    after: 'Each column is one column of the triangle, written downward. The zeros above it are unused.',
  };
  const LAGR = {
    name: 'lagrange: P at a value, straight from the points', needs: ['FOUR'],
    drill: false,
    lines: [
      ['lagrange<-function(x,y,t){', ''],
      ['  n=length(x)', ''],
      ['  p=0', ''],
      ['  for(k in 1:n){', 'One term per point.'],
      ['    L=1', ''],
      ['    for(j in 1:n){', ''],
      ['      if(j!=k) L=L*(t-x[j])/(x[k]-x[j])', 'Skip your own point: that is the whole trick of ' + M.v('L', 'k') + '.'],
      ['    }', ''],
      ['    p=p+y[k]*L', ''],
      ['  }', ''],
      ['return(p)}', ''],
    ],
    run: 'lagrange(x,y,1.5)', out: '[1] 0.8125', after: 'The same P(1.5) as Newton\'s form: one polynomial, two ways to write it.',
  };
  const PLOT = {
    name: 'Draw P through the points', needs: ['FOUR', 'COEF', 'EVAL'],
    drill: false,
    lines: [
      ['plot(x,y,pch=19)', 'The points as dots.'],
      ['t=seq(min(x),max(x),length.out=200)', '200 x-values from the smallest to the largest.'],
      ['lines(t,sapply(t,function(s) newton_eval(newton_coef(x,y),x,s)))', 'P at each of them, joined into a curve.'],
    ],
    out: 'A graph opens in RStudio\'s Plots pane: the four dots and the curve through all of them.', outLabel: 'You see',
  };
  const ERR = {
    name: 'Compare with the real function (the error)', needs: ['COEF', 'EVAL'],
    drill: false,
    lines: [
      ['f<-function(x) sin(x)', 'The real function.'],
      ['nx<-c(0,pi/6,pi/3,pi/2)', 'Four nodes.'],
      ['co<-newton_coef(nx,f(nx))', 'The y-values are f at the nodes.'],
      ['newton_eval(co,nx,1)', 'P(1)'],
      ['sin(1)', 'The true value'],
      ['abs(sin(1)-newton_eval(co,nx,1))', 'The actual error, below the error bound.'],
    ],
    out: '[1] 0.841086\n[1] 0.841471\n[1] 0.0003849685',
  };
  NM.rcode = { DIVIDED, FOUR, FIVE, COEF, PAT, EVAL, TABLE, LAGR, PLOT, ERR, ddTable };

  /* ---------- try your own points ---------- */
  // a list as typed: "0, 2, 3, 1", "0 2 3 1" or "c(0,2,3,1)"; each entry a number, a fraction, pi or sqrt( )
  const readList = (text) => {
    const s = String(text).trim().replace(/^c\s*\(/, '').replace(/\)\s*$/, '').replace(/[−–]/g, '-').replace(/π/g, 'pi');
    if (!s) return { ok: false, error: 'empty' };
    const parts = (s.includes(',') ? s.split(',') : s.split(/\s+/)).map((p) => p.trim()).filter(Boolean);
    const vals = [], src = [];
    for (const p of parts) {
      if (!/^[0-9.\s+\-*/()^]*$/.test(p.replace(/pi|sqrt/g, ''))) return { ok: false, error: '"' + p + '" is not a number. Use numbers, fractions like 1/3, pi or sqrt(2).' };
      const c = E.compile(p);
      const val = c.ok ? c.f(0) : NaN;
      if (!Number.isFinite(val)) return { ok: false, error: '"' + p + '" is not a number.' };
      vals.push(val); src.push(p.replace(/\s+/g, ''));
    }
    return { ok: true, vals, src };
  };
  function tryBox() {
    const xin = h('input', { type: 'text', value: '0, 2, 3, 1', autocomplete: 'off', spellcheck: 'false', 'data-kp': 'off', 'aria-describedby': 'rc-try-help' });
    const yin = h('input', { type: 'text', value: '1, 2, 4, 0', autocomplete: 'off', spellcheck: 'false', 'data-kp': 'off' });
    const tin = h('input', { type: 'text', value: '1.5', autocomplete: 'off', spellcheck: 'false', 'data-kp': 'off', inputmode: 'decimal' });
    const out = h('div', { class: 'rc-tryout', 'aria-live': 'polite' });
    const draw = () => {
      out.innerHTML = '';
      const X = readList(xin.value), Y = readList(yin.value);
      const bad = (msg) => out.append(h('p', { class: 'rc-bad', html: msg }));
      if (!X.ok) return bad(X.error === 'empty' ? 'Type the x-values.' : X.error);
      if (!Y.ok) return bad(Y.error === 'empty' ? 'Type the y-values.' : Y.error);
      const n = X.vals.length;
      if (n !== Y.vals.length) return bad('You have ' + n + ' x-values and ' + Y.vals.length + ' y-values. Each x needs its own y.');
      if (n < 2) return bad('Type at least 2 points.');
      if (n > 8) return bad('Up to 8 points here, so the table fits on a phone.');
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.abs(X.vals[i] - X.vals[j]) < 1e-12) {
        return bad(v(i + 1) + ' and ' + v(j + 1) + ' are both ' + short(X.vals[i]) + '. R would divide by 0 and print <code>NaN</code> or <code>Inf</code>: every x must be different.');
      }
      const t = ddTable(X.vals, Y.vals), co = t.map((row, i) => row[i]);
      out.append(triangle(X.vals, Y.vals, { names: n <= 7 }));
      // the R to type, and what it prints
      const xs = 'c(' + X.src.join(',') + ')', ys = 'c(' + Y.src.join(',') + ')';
      let code, call;
      if (n === 3) {
        code = ['x<-c(' + X.src[0] + ',' + Y.src[0] + ')', 'y<-c(' + X.src[1] + ',' + Y.src[1] + ')', 'z<-c(' + X.src[2] + ',' + Y.src[2] + ')'];
        call = 'divided_diff(x,y,z)';
      } else {
        code = ['x<-' + xs, 'y<-' + ys];
        call = n === 4 ? 'four_points(x,y)' : n === 5 ? 'five_points(x,y)' : 'newton_coef(x,y)';
      }
      const lines = code.concat([call, UI.rPrint(co)]);
      const T = readList(tin.value);
      if (T.ok && T.vals.length === 1) {
        let p = co[n - 1];
        for (let k = n - 2; k >= 0; k--) p = co[k] + (T.vals[0] - X.vals[k]) * p;
        // three points come as points, so their x-values are x[1], y[1], z[1]
        const at = n === 3 ? 'newton_eval(divided_diff(x,y,z),c(x[1],y[1],z[1]),' : n === 4 ? 'p_at(four_points(x,y),x,' : 'newton_eval(' + call + ',x,';
        lines.push(at + T.src[0] + ')', UI.rPrint(p));
      }
      const pre = h('pre', { class: 'rc-console' });
      lines.forEach((ln) => pre.append(h('span', { class: /^\s*\[\d+\]/.test(ln) ? 'rc-o' : 'rc-i', text: ln }), '\n'));
      out.append(h('p', { class: 'rc-l', text: 'In R (type the lines, R prints the [1] lines)' }), pre);
      out.append(h('p', { class: 'rc-form', html: newtonForm(X.vals, co) }));
      if (n !== 3 && n !== 4 && n !== 5) out.append(h('p', { class: 'muted small', html: 'His functions are for 3 and 4 points; for ' + n + ' points use <code>newton_coef</code> from "What he might add".' }));
    };
    let timer = 0;
    const later = () => { clearTimeout(timer); timer = setTimeout(draw, 160); };
    [xin, yin, tin].forEach((i) => i.addEventListener('input', later));
    draw();
    const field = (label, input) => h('label', { class: 'field' }, h('span', { html: label }), input);
    return h('div', { class: 'card rc-try' },
      h('div', { class: 'rc-fields' }, field('x-values', xin), field('y-values', yin), field('P at x =', tin)),
      h('p', { class: 'muted small', id: 'rc-try-help', html: 'Separate with commas. Fractions like <code>1/3</code>, <code>pi/6</code> and <code>sqrt(2)</code> work.' }),
      out);
  }

  /* ---------- the page ---------- */
  NM.pages.rcode = (el) => {
    el.appendChild(h('h1', { text: 'R code: divided differences' }));
    el.appendChild(h('p', { class: 'muted', text: 'Your instructor\'s two functions, line by line, then the code for what he might add. Every block here was run in R and prints exactly what is shown.' }));
    el.appendChild(UI.callout('warn', 'His two functions take the data in two different ways', '<p><b>divided_diff(x, y, z)</b>: x, y and z are the three <b>points</b>. <code>x[1]</code> is point 1\'s x-value, <code>x[2]</code> its y-value.</p><p><b>four_points(x, y)</b>: x is the <b>list of x-values</b> and y the list of y-values. <code>x[2]</code> is the 2nd x-value.</p>'));

    el.appendChild(UI.section('1 · Three points'));
    el.appendChild(listing(DIVIDED));
    el.appendChild(UI.section('2 · Four points'));
    el.appendChild(h('div', { class: 'rc-tri-wrap' }, h('p', { class: 'rc-l', text: 'Where each letter sits (the yellow ones are what return( ) gives back)' }), triangle([0, 2, 3, 1], [1, 2, 4, 0], { names: true })));
    el.appendChild(listing(FOUR));
    el.appendChild(UI.callout('idea', 'The one rule behind every letter', '<p>(lower one − upper one) ÷ (x at the bottom end − x at the top end). With 3 points there are 3 letters; 4 points, 6 letters; 5 points, 10 letters.</p>'));

    el.appendChild(UI.section('3 · Try your own points'));
    el.appendChild(tryBox());

    el.appendChild(UI.section('4 · What he might add'));
    el.appendChild(h('p', { class: 'muted', text: 'Nobody knows for sure. These are the usual next steps after these two functions, most likely first. Each one runs and gives the answer shown.' }));
    const more = (title, why, blocks, open) => {
      const d = h('details', { class: 'rc-more' }, h('summary', null, h('span', { class: 'rc-more-t', html: title }), h('span', { class: 'rc-more-w', html: why })), blocks.map(listing));
      if (open) d.open = true;
      return d;
    };
    el.appendChild(more('Five points, the same way', 'His code goes 3 points → 4 points. Five is the same pattern: 10 letters.', [FIVE], true));
    el.appendChild(more('P at a value: "estimate at x = …"', 'Every book problem ends with a number to estimate. This turns the coefficients into that number.', [PAT, EVAL]));
    el.appendChild(more('Any number of points, with loops', 'Writing letters by hand stops working past 5 points.', [COEF]));
    el.appendChild(more('The whole table', 'To show every column, not only the top edge.', [TABLE]));
    el.appendChild(more('Lagrange in R', 'Your other semifinal method. Same polynomial, different formula.', [LAGR]));
    el.appendChild(more('A graph of P', 'To see the curve pass through every point.', [PLOT]));
    el.appendChild(more('The error against a real function', 'Interpolation error, in code.', [ERR]));

    el.appendChild(UI.section('5 · Mistakes that break the code'));
    el.appendChild(h('ul', { class: 'rc-mistakes' },
      h('li', { html: '<b>R counts from 1.</b> The first x is <code>x[1]</code>; <code>x[0]</code> gives nothing.' }),
      h('li', { html: '<b>Brackets around both differences.</b> <code>(y[2]-y[1])/(x[2]-x[1])</code>. Without them R divides only <code>y[1]</code>.' }),
      h('li', { html: '<b>The ends of the span.</b> d uses <code>x[3]-x[1]</code>, f uses <code>x[4]-x[1]</code>, not neighbours.' }),
      h('li', { html: '<b>Lower minus upper.</b> <code>(b-a)</code>, not <code>(a-b)</code>, or every sign flips.' }),
      h('li', { html: '<b>Defining is not running.</b> The function prints nothing until you call it: <code>four_points(x,y)</code>.' }),
      h('li', { html: '<b>Same x twice</b> makes a division by 0: R prints <code>NaN</code> or <code>Inf</code>.' }),
      h('li', { html: '<b>The order of the points</b> changes the letters, not P. Keep the order the question gives.' })));
  };
})(window.NM);
