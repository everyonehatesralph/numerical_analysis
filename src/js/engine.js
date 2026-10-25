/* engine.js — the math engine.
   Expression parser, symbolic derivative, exact fractions, polynomials and
   every numerical method in the reviewer. No DOM code lives here, so the same
   file runs in the browser and in the Node tests. */
(function (root) {
  'use strict';
  const NM = (root.NM = root.NM || {});
  const E = (NM.E = {});

  /* ================================================================
     Exact fractions (BigInt), so 1/2 stays 1/2 instead of 0.5000001
     ================================================================ */
  const bAbs = (a) => (a < 0n ? -a : a);
  function bgcd(a, b) {
    a = bAbs(a); b = bAbs(b);
    while (b) { const t = a % b; a = b; b = t; }
    return a;
  }

  class Q {
    constructor(n, d) {
      n = BigInt(n);
      d = d === undefined ? 1n : BigInt(d);
      if (d === 0n) throw new Error('Division by zero');
      if (d < 0n) { n = -n; d = -d; }
      const g = bgcd(n, d);
      if (g > 1n) { n /= g; d /= g; }
      this.n = n; this.d = d;
    }
    add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { return new Q(this.n * o.n, this.d * o.d); }
    div(o) {
      if (o.n === 0n) throw new Error('Division by zero');
      return new Q(this.n * o.d, this.d * o.n);
    }
    neg() { return new Q(-this.n, this.d); }
    isZero() { return this.n === 0n; }
    isInt() { return this.d === 1n; }
    sign() { return this.n > 0n ? 1 : this.n < 0n ? -1 : 0; }
    eq(o) { return this.n === o.n && this.d === o.d; }
    toNumber() { return Number(this.n) / Number(this.d); }
    toString() { return this.d === 1n ? this.n.toString() : this.n + '/' + this.d; }
  }

  function decToQ(s) {
    const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(s);
    if (!m) return null;
    if (m[2] === '' && !m[3]) return null;
    const sign = m[1] === '-' ? -1n : 1n;
    const frac = m[3] || '';
    let n = BigInt((m[2] || '0') + frac) * sign;
    let d = 10n ** BigInt(frac.length);
    if (m[4]) {
      const e = parseInt(m[4], 10);
      if (Math.abs(e) > 300) return null;
      if (e >= 0) n *= 10n ** BigInt(e); else d *= 10n ** BigInt(-e);
    }
    return new Q(n, d);
  }

  /* Reads "3", "-0.25", "1/2", "-3/4", "2.5/0.5". Anything else gives null. */
  Q.parse = function (s) {
    s = String(s).replace(/[−–]/g, '-').replace(/\s+/g, '');
    if (!s) return null;
    while (/^\(.*\)$/.test(s)) s = s.slice(1, -1);
    const parts = s.split('/');
    if (parts.length === 1) return decToQ(parts[0]);
    if (parts.length === 2) {
      const a = decToQ(parts[0]), b = decToQ(parts[1]);
      if (!a || !b || b.isZero()) return null;
      return a.div(b);
    }
    return null;
  };
  Q.from = function (v) {
    if (v instanceof Q) return v;
    if (typeof v === 'bigint') return new Q(v);
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return new Q(BigInt(v));
      return decToQ(String(v));
    }
    return Q.parse(v);
  };
  E.Q = Q;

  /* A "field" is the set of + − × ÷ used by an algorithm. The same
     divided-difference code runs on exact fractions or on decimals. */
  E.QF = {
    exact: true,
    zero: () => new Q(0n), one: () => new Q(1n),
    from: (v) => Q.from(v),
    add: (a, b) => a.add(b), sub: (a, b) => a.sub(b),
    mul: (a, b) => a.mul(b), div: (a, b) => a.div(b), neg: (a) => a.neg(),
    isZero: (a) => a.isZero(),
    num: (a) => a.toNumber(),
  };
  E.RF = {
    exact: false,
    zero: () => 0, one: () => 1,
    from: (v) => (typeof v === 'number' ? v : v.toNumber()),
    add: (a, b) => a + b, sub: (a, b) => a - b,
    mul: (a, b) => a * b,
    div: (a, b) => {
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    },
    neg: (a) => -a,
    isZero: (a) => Math.abs(a) < 1e-13,
    num: (a) => a,
  };

  /* ================================================================
     Expression parser:  "x^3 + x - 1",  "cos x - x",  "e^(-x)", "2x = 5"
     ================================================================ */
  const FN = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x),
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    exp: Math.exp, ln: Math.log, log: Math.log10,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  };
  const ALIAS = { arcsin: 'asin', arccos: 'acos', arctan: 'atan', log10: 'log', root: 'sqrt' };
  const CONST = { pi: Math.PI, e: Math.E };
  const NAMES = Object.keys(FN).concat(Object.keys(ALIAS), Object.keys(CONST), ['x'])
    .sort((a, b) => b.length - a.length);
  const INVERSE = { sin: 'asin', cos: 'acos', tan: 'atan' };

  function ParseError(msg) { const e = new Error(msg); e.isParse = true; return e; }

  function tokenize(src) {
    const s = String(src)
      .replace(/[−–—]/g, '-').replace(/[×·∙⋅]/g, '*').replace(/÷/g, '/')
      .replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/\*\*/g, '^')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
      .replace(/[[{]/g, '(').replace(/[\]}]/g, ')');
    const toks = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+(?![a-z(]))?/i.exec(s.slice(i));
        if (!m) throw ParseError('I could not read the number near "' + s.slice(i, i + 6) + '"');
        toks.push({ t: 'num', v: parseFloat(m[0]) });
        i += m[0].length;
        continue;
      }
      if (/[a-zA-Z]/.test(ch)) {
        const word = /^[a-zA-Z]+(10)?/.exec(s.slice(i))[0];
        let j = 0;
        const low = word.toLowerCase();
        while (j < low.length) {
          const name = NAMES.find((nm) => low.startsWith(nm, j));
          if (!name) throw ParseError('I don\'t know "' + word.slice(j) + '". Use x as the variable, and names like sin, cos, ln, sqrt, e, pi.');
          toks.push({ t: 'id', v: ALIAS[name] || name });
          j += name.length;
        }
        i += word.length;
        continue;
      }
      if ('+-*/^()='.includes(ch)) { toks.push({ t: ch }); i++; continue; }
      throw ParseError('I don\'t understand the symbol "' + ch + '"');
    }
    return toks;
  }

  // AST node builders
  const num = (v) => ({ k: 'num', v });
  const X = () => ({ k: 'x' });
  const cst = (n) => ({ k: 'c', n });
  const neg = (a) => ({ k: 'neg', a });
  const bin = (k, a, b) => ({ k, a, b });
  const add = (a, b) => bin('+', a, b);
  const sub = (a, b) => bin('-', a, b);
  const mul = (a, b) => bin('*', a, b);
  const div = (a, b) => bin('/', a, b);
  const pow = (a, b) => bin('^', a, b);
  const fn = (n, a) => ({ k: 'fn', n, a });

  function parse(src) {
    const toks = tokenize(src);
    if (!toks.length) throw ParseError('Type something first.');
    let p = 0;
    const peek = () => toks[p];
    const next = () => toks[p++];
    const is = (t) => toks[p] && toks[p].t === t;
    const expect = (t) => {
      const k = next();
      if (!k || k.t !== t) throw ParseError(t === ')' ? 'A ")" is missing.' : 'Expected "' + t + '".');
    };
    const startsPrimary = (k) => k && (k.t === 'num' || k.t === 'id' || k.t === '(');

    function expr() {
      let a = term();
      while (is('+') || is('-')) {
        const op = next().t;
        a = bin(op, a, term());
      }
      return a;
    }
    function term() {
      let a = unary();
      for (;;) {
        if (is('*') || is('/')) { const op = next().t; a = bin(op, a, unary()); }
        else if (startsPrimary(peek())) a = mul(a, power()); // implicit: 2x, x(x+1)
        else break;
      }
      return a;
    }
    function unary() {
      if (is('-')) { next(); return neg(unary()); }
      if (is('+')) { next(); return unary(); }
      return power();
    }
    function power() {
      const base = primary();
      if (is('^')) { next(); return pow(base, unary()); }
      return base;
    }
    function smallExponent() {
      if (is('-')) { next(); return neg(smallExponent()); }
      if (is('(')) { next(); const e = expr(); expect(')'); return e; }
      const k = next();
      if (!k || k.t !== 'num') throw ParseError('Put the power in brackets, like sin^(2)(x).');
      return num(k.v);
    }
    function primary() {
      const k = next();
      if (!k) throw ParseError('The expression ends too early.');
      if (k.t === 'num') return num(k.v);
      if (k.t === '(') { const e = expr(); expect(')'); return e; }
      if (k.t === 'id') {
        if (k.v === 'x') return X();
        if (k.v in CONST) return cst(k.v);
        if (k.v in FN) {
          let pw = null;
          if (is('^')) { next(); pw = smallExponent(); }
          let arg;
          if (is('(')) { next(); arg = expr(); expect(')'); }
          else if (startsPrimary(peek()) || is('-')) arg = unary();
          else throw ParseError(k.v + ' needs something after it, like ' + k.v + '(x).');
          if (pw && pw.k === 'neg' && pw.a.k === 'num' && pw.a.v === 1 && INVERSE[k.v]) return fn(INVERSE[k.v], arg);
          const node = fn(k.v, arg);
          return pw ? pow(node, pw) : node;
        }
      }
      if (k.t === ')') throw ParseError('There is an extra ")".');
      throw ParseError('Something is missing before "' + k.t + '".');
    }

    const lhs = expr();
    if (is('=')) {
      next();
      const rhs = expr();
      if (p < toks.length) throw ParseError('I could not read the end of the expression.');
      return { node: sub(lhs, rhs), lhs, rhs, eq: true };
    }
    if (p < toks.length) {
      const t = toks[p].t;
      throw ParseError(t === ')' ? 'There is an extra ")".' : 'I could not read the end of the expression.');
    }
    return { node: lhs, eq: false };
  }

  /* Real-number power: (−8)^(1/3) = −2 like a calculator, not NaN. */
  function realPow(a, b) {
    if (a < 0 && !Number.isInteger(b)) {
      for (const q of [3, 5, 7, 9, 11]) {
        const pq = b * q;
        if (Math.abs(pq - Math.round(pq)) < 1e-9) {
          const r = Math.pow(-a, b);
          return Math.round(pq) % 2 === 0 ? r : -r;
        }
      }
      return NaN;
    }
    return Math.pow(a, b);
  }

  function compileNode(n) {
    switch (n.k) {
      case 'num': { const v = n.v; return () => v; }
      case 'x': return (x) => x;
      case 'c': { const v = CONST[n.n]; return () => v; }
      case 'neg': { const a = compileNode(n.a); return (x) => -a(x); }
      case '+': { const a = compileNode(n.a), b = compileNode(n.b); return (x) => a(x) + b(x); }
      case '-': { const a = compileNode(n.a), b = compileNode(n.b); return (x) => a(x) - b(x); }
      case '*': { const a = compileNode(n.a), b = compileNode(n.b); return (x) => a(x) * b(x); }
      case '/': { const a = compileNode(n.a), b = compileNode(n.b); return (x) => a(x) / b(x); }
      case '^': {
        const a = compileNode(n.a), b = compileNode(n.b);
        if (n.b.k === 'num' && n.b.v === 2) return (x) => { const t = a(x); return t * t; };
        return (x) => realPow(a(x), b(x));
      }
      case 'fn': { const f = FN[n.n], a = compileNode(n.a); return (x) => f(a(x)); }
    }
    throw new Error('bad node ' + n.k);
  }

  const hasX = (n) => n.k === 'x' || (n.a && hasX(n.a)) || (n.b && hasX(n.b));
  const isNum = (n, v) => n.k === 'num' && (v === undefined || n.v === v);
  function same(a, b) {
    if (a.k !== b.k) return false;
    switch (a.k) {
      case 'num': return a.v === b.v;
      case 'x': return true;
      case 'c': return a.n === b.n;
      case 'fn': return a.n === b.n && same(a.a, b.a);
      case 'neg': return same(a.a, b.a);
      default: return same(a.a, b.a) && same(a.b, b.b);
    }
  }

  /* ---------- simplifier (keeps fractions like 1/3 as fractions) ---------- */
  function igcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
  function rat(n) {
    if (n.k === 'num' && Number.isInteger(n.v)) return [n.v, 1];
    if (n.k === '/' && n.a.k === 'num' && n.b.k === 'num' && Number.isInteger(n.a.v) && Number.isInteger(n.b.v) && n.b.v !== 0) return [n.a.v, n.b.v];
    if (n.k === 'neg') { const r = rat(n.a); return r && [-r[0], r[1]]; }
    return null;
  }
  function mkRat(p, q) {
    if (q < 0) { p = -p; q = -q; }
    const g = igcd(p, q);
    p /= g; q /= g;
    if (q === 1) return num(p);
    return p < 0 ? neg(div(num(-p), num(q))) : div(num(p), num(q));
  }
  function foldRat(op, a, b) {
    const r = rat(a), s = rat(b);
    if (!r || !s) return null;
    const big = (v) => Math.abs(v) > 1e9;
    let p, q;
    if (op === '+') { p = r[0] * s[1] + s[0] * r[1]; q = r[1] * s[1]; }
    else if (op === '-') { p = r[0] * s[1] - s[0] * r[1]; q = r[1] * s[1]; }
    else if (op === '*') { p = r[0] * s[0]; q = r[1] * s[1]; }
    else if (op === '/') { if (s[0] === 0) return null; p = r[0] * s[1]; q = r[1] * s[0]; }
    if (big(p) || big(q)) return null;
    return mkRat(p, q);
  }
  const negCoef = (n) => n.k === '*' && n.a.k === 'num' && n.a.v < 0;

  function S(n) {
    switch (n.k) {
      case 'num': case 'x': case 'c': return n;
      case 'neg': {
        const a = S(n.a);
        if (a.k === 'num') return num(-a.v);
        if (a.k === 'neg') return a.a;
        if (negCoef(a)) return mul(num(-a.a.v), a.b);
        return neg(a);
      }
      case 'fn': {
        const a = S(n.a);
        if (n.n === 'ln' && a.k === 'c' && a.n === 'e') return num(1);
        if ((n.n === 'ln' || n.n === 'log') && isNum(a, 1)) return num(0);
        if (n.n === 'exp' && isNum(a, 0)) return num(1);
        return fn(n.n, a);
      }
      case '+': {
        const a = S(n.a), b = S(n.b);
        if (isNum(a, 0)) return b;
        if (isNum(b, 0)) return a;
        const f = foldRat('+', a, b); if (f) return f;
        if (a.k === 'num' && b.k === 'num') return num(a.v + b.v);
        if (b.k === 'neg') return sub(a, b.a);
        if (b.k === 'num' && b.v < 0) return sub(a, num(-b.v));
        if (negCoef(b)) return sub(a, mul(num(-b.a.v), b.b));
        if (a.k === 'neg') return sub(b, a.a);
        if (same(a, b)) return mul(num(2), a);
        return add(a, b);
      }
      case '-': {
        const a = S(n.a), b = S(n.b);
        if (isNum(b, 0)) return a;
        if (isNum(a, 0)) return S(neg(b));
        const f = foldRat('-', a, b); if (f) return f;
        if (a.k === 'num' && b.k === 'num') return num(a.v - b.v);
        if (b.k === 'neg') return add(a, b.a);
        if (b.k === 'num' && b.v < 0) return add(a, num(-b.v));
        if (negCoef(b)) return add(a, mul(num(-b.a.v), b.b));
        if (same(a, b)) return num(0);
        return sub(a, b);
      }
      case '*': {
        let a = S(n.a), b = S(n.b);
        if (isNum(a, 0) || isNum(b, 0)) return num(0);
        if (isNum(a, 1)) return b;
        if (isNum(b, 1)) return a;
        if (isNum(a, -1)) return S(neg(b));
        if (isNum(b, -1)) return S(neg(a));
        const f = foldRat('*', a, b); if (f) return f;
        if (a.k === 'num' && b.k === 'num') return num(a.v * b.v);
        if (b.k === 'num' || (rat(b) && !rat(a))) [a, b] = [b, a];
        if (a.k === 'neg') return S(neg(mul(a.a, b)));
        if (b.k === 'neg') return S(neg(mul(a, b.a)));
        if (a.k === 'num' && b.k === '*' && b.a.k === 'num') return S(mul(num(a.v * b.a.v), b.b));
        if (same(a, b)) return pow(a, num(2));
        if (b.k === '^' && same(a, b.a) && b.b.k === 'num') return pow(a, num(b.b.v + 1));
        if (a.k === '^' && same(b, a.a) && a.b.k === 'num') return pow(b, num(a.b.v + 1));
        if (b.k === '/' && isNum(b.a, 1)) return S(div(a, b.b));
        if (a.k === '/' && isNum(a.a, 1)) return S(div(b, a.b));
        if (rat(a) && rat(a)[1] !== 1 && !rat(b)) { const r = rat(a); return S(div(mul(num(r[0]), b), num(r[1]))); }
        return mul(a, b);
      }
      case '/': {
        const a = S(n.a), b = S(n.b);
        if (isNum(a, 0)) return num(0);
        if (isNum(b, 1)) return a;
        const f = foldRat('/', a, b); if (f) return f;
        if (a.k === 'num' && b.k === 'num' && !Number.isInteger(a.v / b.v)) return div(a, b);
        if (a.k === 'num' && b.k === 'num') return num(a.v / b.v);
        if (a.k === 'neg') return S(neg(div(a.a, b)));
        if (same(a, b)) return num(1);
        return div(a, b);
      }
      case '^': {
        const a = S(n.a), b = S(n.b);
        if (isNum(b, 0)) return num(1);
        if (isNum(b, 1)) return a;
        if (a.k === 'num' && b.k === 'num' && Number.isInteger(b.v) && b.v > 0 && b.v <= 12 && Number.isInteger(a.v)) return num(Math.pow(a.v, b.v));
        // Do not flatten nested powers: (x^2)^0.5 is |x|, not x.
        return pow(a, b);
      }
    }
    return n;
  }
  function simplify(n) {
    let cur = n;
    for (let i = 0; i < 8; i++) {
      const nx = S(cur);
      if (same(nx, cur)) return nx;
      cur = nx;
    }
    return cur;
  }

  /* ---------- symbolic derivative ---------- */
  function D(n) {
    switch (n.k) {
      case 'num': case 'c': return num(0);
      case 'x': return num(1);
      case 'neg': return neg(D(n.a));
      case '+': return add(D(n.a), D(n.b));
      case '-': return sub(D(n.a), D(n.b));
      case '*':
        if (!hasX(n.a)) return mul(n.a, D(n.b));
        if (!hasX(n.b)) return mul(n.b, D(n.a));
        return add(mul(D(n.a), n.b), mul(n.a, D(n.b)));
      case '/':
        if (!hasX(n.b)) return div(D(n.a), n.b);
        return div(sub(mul(D(n.a), n.b), mul(n.a, D(n.b))), pow(n.b, num(2)));
      case '^': {
        const u = n.a, v = n.b;
        if (!hasX(v)) return mul(mul(v, pow(u, sub(v, num(1)))), D(u));
        if (!hasX(u)) return mul(mul(n, fn('ln', u)), D(v));
        return mul(n, add(mul(D(v), fn('ln', u)), div(mul(v, D(u)), u)));
      }
      case 'fn': {
        const u = n.a, du = D(u);
        let outer;
        switch (n.n) {
          case 'sin': outer = fn('cos', u); break;
          case 'cos': outer = neg(fn('sin', u)); break;
          case 'tan': outer = pow(fn('sec', u), num(2)); break;
          case 'sec': outer = mul(fn('sec', u), fn('tan', u)); break;
          case 'csc': outer = neg(mul(fn('csc', u), fn('cot', u))); break;
          case 'cot': outer = neg(pow(fn('csc', u), num(2))); break;
          case 'asin': outer = div(num(1), fn('sqrt', sub(num(1), pow(u, num(2))))); break;
          case 'acos': outer = neg(div(num(1), fn('sqrt', sub(num(1), pow(u, num(2)))))); break;
          case 'atan': outer = div(num(1), add(num(1), pow(u, num(2)))); break;
          case 'sinh': outer = fn('cosh', u); break;
          case 'cosh': outer = fn('sinh', u); break;
          case 'tanh': outer = sub(num(1), pow(fn('tanh', u), num(2))); break;
          case 'exp': outer = fn('exp', u); break;
          case 'ln': return div(du, u);
          case 'log': return div(du, mul(fn('ln', num(10)), u));
          case 'sqrt': return div(du, mul(num(2), fn('sqrt', u)));
          case 'cbrt': return div(du, mul(num(3), pow(fn('cbrt', u), num(2))));
          case 'abs': outer = div(u, fn('abs', u)); break;
          default: throw new Error('No derivative rule for ' + n.n);
        }
        return mul(outer, du);
      }
    }
    throw new Error('bad node');
  }

  /* ---------- printing ---------- */
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4, num: 5, x: 5, c: 5, fn: 5 };
  const prec = (n) => (n.k === 'num' && n.v < 0 ? 3 : PREC[n.k]);
  function numText(v) {
    if (Number.isInteger(v)) return String(v);
    const s = String(+v.toPrecision(12));
    return s;
  }
  function toText(n) {
    const wrap = (c, min) => (prec(c) < min ? '(' + toText(c) + ')' : toText(c));
    switch (n.k) {
      case 'num': return numText(n.v);
      case 'x': return 'x';
      case 'c': return n.n;
      case 'neg': return '-' + wrap(n.a, 3);
      case '+': return toText(n.a) + ' + ' + wrap(n.b, 1);
      case '-': return toText(n.a) + ' - ' + wrap(n.b, 2);
      case '*': return wrap(n.a, 2) + '*' + wrap(n.b, 3);
      case '/': return wrap(n.a, 2) + '/' + wrap(n.b, 3);
      case '^': return wrap(n.a, 5) + '^' + wrap(n.b, 5);
      case 'fn': return n.n + '(' + toText(n.a) + ')';
    }
  }
  const FNHTML = { asin: 'sin<sup>−1</sup>', acos: 'cos<sup>−1</sup>', atan: 'tan<sup>−1</sup>' };
  let SUBX = null; // when set, x prints as this number: f(0.5) = (0.5)³ + (0.5) − 1
  function numHTML(v) { return numText(v).replace('-', '−'); }
  const startsWithDigit = (n) => n.k === 'num' || ((n.k === '*' || n.k === '/' || n.k === '^') && startsWithDigit(n.a));
  function toHTML(n, inSup) {
    const wrap = (c, min) => (prec(c) < min ? '(' + toHTML(c, inSup) + ')' : toHTML(c, inSup));
    switch (n.k) {
      case 'num': return numHTML(n.v);
      case 'x': return SUBX !== null ? '(' + SUBX + ')' : '<i>x</i>';
      case 'c': return n.n === 'pi' ? 'π' : '<i>e</i>';
      case 'neg': return '−' + (n.a.k === '/' ? toHTML(n.a, inSup) : wrap(n.a, 3));
      case '+': return toHTML(n.a, inSup) + ' + ' + wrap(n.b, 1);
      case '-': return toHTML(n.a, inSup) + ' − ' + wrap(n.b, 2);
      case '*': {
        const A = wrap(n.a, 2), B = wrap(n.b, 3);
        if (startsWithDigit(n.b) && prec(n.b) >= 3) return A + '·' + B;
        if (n.a.k === 'num') return A + B;
        return A + ' ' + B;
      }
      case '/':
        if (inSup) return wrap(n.a, 2) + '/' + wrap(n.b, 3);
        return '<span class="fr"><span>' + toHTML(n.a) + '</span><span>' + toHTML(n.b) + '</span></span>';
      case '^': {
        const ex = '<sup>' + toHTML(n.b, true) + '</sup>';
        if (n.a.k === 'fn' && n.a.n !== 'sqrt' && n.a.n !== 'abs' && n.a.n !== 'exp' && isNum(n.b) && n.b.v > 0) {
          return n.a.n + ex + '(' + toHTML(n.a.a, inSup) + ')';
        }
        if (n.a.k === 'c' && n.a.n === 'e') return '<i>e</i>' + ex;
        return wrap(n.a, 5) + ex;
      }
      case 'fn': {
        const arg = SUBX !== null && n.a.k === 'x' ? SUBX : toHTML(n.a, inSup);
        if (n.n === 'sqrt') return '√<span class="ov">' + arg + '</span>';
        if (n.n === 'cbrt') return '∛<span class="ov">' + arg + '</span>';
        if (n.n === 'abs') return '|' + arg + '|';
        if (n.n === 'exp') return '<i>e</i><sup>' + toHTML(n.a, true) + '</sup>';
        return (FNHTML[n.n] || n.n) + '(' + arg + ')';
      }
    }
  }

  /* compile("x^3 + x - 1") → { f, node, html, text } or { error } */
  E.compile = function (src) {
    try {
      const pr = parse(src);
      const node = pr.node;
      const f = compileNode(node);
      return {
        ok: true, node, f, eq: pr.eq,
        html: pr.eq ? toHTML(pr.lhs) + ' − (' + toHTML(pr.rhs) + ')' : toHTML(node),
        text: toText(node),
      };
    } catch (e) {
      return { ok: false, error: e.isParse ? e.message : 'Could not read that: ' + e.message };
    }
  };
  E.derivative = function (node) {
    const d = simplify(D(node));
    return { node: d, f: compileNode(d), html: toHTML(d), text: toText(d) };
  };
  E.nthDerivative = function (node, n) {
    let cur = node;
    for (let i = 0; i < n; i++) cur = simplify(D(cur));
    return { node: cur, f: compileNode(cur), html: toHTML(cur), text: toText(cur) };
  };
  E.simplify = simplify;
  E.toHTML = toHTML;
  /* The expression with a number written in place of x, for board-style work. */
  E.subHTML = function (node, valueText) {
    SUBX = String(valueText).replace('-', '−');
    try { return toHTML(node); } finally { SUBX = null; }
  };
  E.toText = toText;

  /* Value of a typed answer: "1/2", "-0.6823", "pi/4", "sqrt(2)" → number */
  E.evalNumber = function (src) {
    // "3.2x10^-5" and "3.2 X 10^-5" mean 3.2 × 10^-5 here, not the variable x
    const s = String(src == null ? '' : src).trim().replace(/(\d)\s*[xX×]\s*10\s*\^/g, '$1*10^');
    if (!s) return NaN;
    const q = Q.parse(s);
    if (q) return q.toNumber();
    const c = E.compile(s);
    if (!c.ok || hasX(c.node)) return NaN;
    return c.f(0);
  };

  /* A list typed as "0, 2, 3" → exact fractions when possible, else decimals. */
  E.parseList = function (src) {
    const items = String(src).split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const qs = items.map((s) => Q.parse(s));
    if (qs.every((q) => q)) return { F: E.QF, vals: qs, items };
    const vals = items.map((s) => E.evalNumber(s));
    const bad = vals.findIndex((v) => !isFinite(v));
    if (bad >= 0) return { error: 'I could not read "' + items[bad] + '" as a number.' };
    return { F: E.RF, vals, items };
  };
  /* Several lists that must share one field (all exact or all decimal). */
  E.parseLists = function (...srcs) {
    const lists = srcs.map((s) => E.parseList(s));
    const err = lists.find((l) => l.error);
    if (err) return { error: err.error };
    if (lists.every((l) => l.F.exact)) return { F: E.QF, lists: lists.map((l) => l.vals) };
    return { F: E.RF, lists: lists.map((l) => l.vals.map((v) => (v instanceof Q ? v.toNumber() : v))) };
  };
  E.parseValue = function (src) {
    const q = Q.parse(src);
    if (q) return { F: E.QF, v: q };
    const v = E.evalNumber(src);
    if (!isFinite(v)) return { error: 'I could not read "' + src + '" as a number.' };
    return { F: E.RF, v };
  };

  /* ================================================================
     Number formatting
     ================================================================ */
  E.fmt = function (x, dp) {
    if (x instanceof Q) x = x.toNumber();
    if (x === undefined || x === null) return '';
    if (Number.isNaN(x)) return 'undefined';
    if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
    if (dp === undefined) dp = 6;
    if (Math.abs(x) >= 1e9) return E.fmtE(x, 4);
    let s = x.toFixed(dp);
    if (/^-0\.?0*$/.test(s)) s = s.slice(1);
    return s.replace('-', '−');
  };
  /* Short form for display: drops trailing zeros (0.500000 → 0.5). */
  E.fmtShort = function (x, dp) {
    if (x instanceof Q) x = x.toNumber();
    let s = E.fmt(x, dp === undefined ? 6 : dp);
    if (s.includes('.') && !s.includes('e') && !s.includes('×')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  };
  E.fmtE = function (x, sig) {
    if (x instanceof Q) x = x.toNumber();
    if (!isFinite(x)) return E.fmt(x);
    if (x === 0) return '0';
    const [m, e] = x.toExponential(sig === undefined ? 2 : sig - 1).split('e');
    const ex = parseInt(e, 10);
    if (ex >= -3 && ex <= 4) return E.fmtShort(x, Math.max(0, (sig || 3) - 1 - ex));
    return m.replace('-', '−') + '×10<sup>' + String(ex).replace('-', '−') + '</sup>';
  };
  /* Exact value as HTML: integers plain, fractions stacked. */
  E.qHTML = function (q) {
    if (!(q instanceof Q)) return E.fmtShort(q, 6);
    if (q.isInt()) return q.n.toString().replace('-', '−');
    const sgn = q.n < 0n ? '−' : '';
    return sgn + '<span class="fr"><span>' + bAbs(q.n) + '</span><span>' + q.d + '</span></span>';
  };
  /* Value in field F: fraction plus a decimal hint when it is not whole. */
  E.vHTML = function (v, dp, withDec) {
    if (v instanceof Q) {
      if (v.isInt() || withDec === false) return E.qHTML(v);
      return E.qHTML(v) + ' <span class="approx">≈ ' + E.fmtShort(v.toNumber(), dp === undefined ? 6 : dp) + '</span>';
    }
    return E.fmtShort(v, dp === undefined ? 6 : dp);
  };
  E.vText = function (v, dp) {
    if (v instanceof Q) return v.toString();
    return E.fmtShort(v, dp === undefined ? 6 : dp);
  };

  /* ================================================================
     Polynomials — coefficient arrays, constant term first: [c0, c1, c2...]
     ================================================================ */
  const P = (E.poly = {});
  P.trim = (p, F) => { const q = p.slice(); while (q.length > 1 && F.isZero(q[q.length - 1])) q.pop(); return q; };
  P.add = function (p, q, F) {
    const n = Math.max(p.length, q.length), r = [];
    for (let i = 0; i < n; i++) r.push(F.add(i < p.length ? p[i] : F.zero(), i < q.length ? q[i] : F.zero()));
    return r;
  };
  P.scale = (p, s, F) => p.map((c) => F.mul(c, s));
  /* p(x)·(x − r) */
  P.mulLin = function (p, r, F) {
    const out = [F.neg(F.mul(p[0], r))];
    for (let i = 1; i < p.length; i++) out.push(F.sub(p[i - 1], F.mul(p[i], r)));
    out.push(p[p.length - 1]);
    return out;
  };
  P.evalAt = function (p, x, F) {
    let y = p[p.length - 1];
    for (let i = p.length - 2; i >= 0; i--) y = F.add(F.mul(y, x), p[i]);
    return y;
  };
  P.evalNum = function (p, x) {
    let y = typeof p[p.length - 1] === 'number' ? p[p.length - 1] : p[p.length - 1].toNumber();
    for (let i = p.length - 2; i >= 0; i--) y = y * x + (typeof p[i] === 'number' ? p[i] : p[i].toNumber());
    return y;
  };
  /* Pretty polynomial, highest power first: ½x² − ½x + 1 */
  P.html = function (p, F, dp, varName) {
    const v = varName || '<i>x</i>';
    const terms = [];
    for (let i = p.length - 1; i >= 0; i--) {
      const c = p[i];
      if (F.isZero(c)) continue;
      const negative = F.num(c) < 0;
      const a = negative ? F.neg(c) : c;
      const isOne = F.exact ? a.eq(new Q(1n)) : Math.abs(a - 1) < 1e-12;
      let coef = i > 0 && isOne ? '' : E.vHTML(a, dp, false);
      const pw = i === 0 ? '' : i === 1 ? v : v + '<sup>' + i + '</sup>';
      terms.push({ negative, s: coef + pw });
    }
    if (!terms.length) return '0';
    return terms.map((t, k) => (k === 0 ? (t.negative ? '−' : '') + t.s : (t.negative ? ' − ' : ' + ') + t.s)).join('');
  };
  P.text = function (p, F, dp) {
    const terms = [];
    for (let i = p.length - 1; i >= 0; i--) {
      if (F.isZero(p[i])) continue;
      const c = E.vText(p[i], dp);
      terms.push((i === 0 ? c : (c === '1' ? '' : c === '-1' ? '-' : c + '*') + (i === 1 ? 'x' : 'x^' + i)));
    }
    return terms.join(' + ').replace(/\+ -/g, '- ') || '0';
  };

  /* ================================================================
     0.1  Nested multiplication (Horner), optional base points
     coefHigh: highest power first [a_d, ..., a_0]; base points r_1..r_d.
     ================================================================ */
  E.horner = function (coefHigh, x, F, base) {
    const steps = [];
    let y = coefHigh[0];
    steps.push({ k: 0, coef: coefHigh[0], y, start: true });
    for (let k = 1; k < coefHigh.length; k++) {
      const r = base ? base[coefHigh.length - 1 - k] : F.zero();
      const factor = base ? F.sub(x, r) : x;
      const prod = F.mul(y, factor);
      const ny = F.add(prod, coefHigh[k]);
      steps.push({ k, coef: coefHigh[k], prev: y, factor, r, prod, y: ny });
      y = ny;
    }
    return { value: y, steps };
  };

  /* ================================================================
     1.1  Bisection — table rows i, a_i, f(a_i), c_i, f(c_i), b_i, f(b_i)
     ================================================================ */
  E.bisection = function (f, a, b, opt) {
    if (!(isFinite(a) && isFinite(b) && a < b)) return { error: 'Use a finite interval with a < b.' };
    const tol = opt.tol, maxSteps = opt.steps || 200;
    let fa = f(a), fb = f(b);
    if (!isFinite(fa) || !isFinite(fb)) return { error: 'f is undefined at an endpoint. Pick a different interval.' };
    const initial = { a0: a, b0: b, fa0: fa, fb0: fb };
    if (fa === 0 || fb === 0) {
      const root = fa === 0 ? a : b;
      return Object.assign(initial, { rows: [], root, exact: true, exactAt: fa === 0 ? 'a' : 'b', finalA: root, finalB: root, errBound: 0 });
    }
    if (Math.sign(fa) === Math.sign(fb)) return { error: 'f(a) and f(b) have the same sign, so a root is not guaranteed in [a, b]. Pick an interval where the signs are different.', fa, fb, sameSign: true };
    const rows = [];
    const a0 = a, b0 = b, fa0 = fa, fb0 = fb;
    for (let i = 0; i < maxSteps; i++) {
      if (tol !== undefined && (b - a) / 2 <= tol) break;
      const c = (a + b) / 2, fc = f(c);
      if (!isFinite(fc)) return { error: 'f is undefined at the midpoint x = ' + c + '. Bisection requires a continuous function throughout the interval.', rows };
      if (c === a || c === b) break; // no further representable midpoint
      const row = { i, a, fa, c, fc, b, fb, half: (b - a) / 2 };
      if (fc === 0) { row.keep = 'exact'; rows.push(row); return { rows, root: c, exact: true, a0, b0, fa0, fb0 }; }
      if (Math.sign(fa) !== Math.sign(fc)) { row.keep = 'left'; b = c; fb = fc; }
      else { row.keep = 'right'; a = c; fa = fc; }
      row.na = a; row.nb = b;
      rows.push(row);
    }
    return { rows, root: (a + b) / 2, finalA: a, finalB: b, a0, b0, fa0, fb0, errBound: (b - a) / 2 };
  };
  /* Steps so that (b−a)/2^(n+1) < tol  →  n > log2((b−a)/tol) − 1 */
  E.bisectionStepsFor = function (len, tol) {
    const v = Math.log2(len / tol) - 1;
    return Math.max(0, Math.floor(v + 1e-12) + 1);
  };

  /* ================================================================
     1.2  Fixed-point iteration x_{i+1} = g(x_i)
     ================================================================ */
  const BLOWUP = 1e12;
  E.fpi = function (g, x0, opt) {
    const rows = [];
    let x = x0;
    const max = opt.steps || 100;
    let stop = 'steps';
    for (let i = 0; i < max; i++) {
      const gx = g(x);
      rows.push({ i, x, gx, diff: Math.abs(gx - x) });
      if (!isFinite(gx) || Math.abs(gx) > BLOWUP) { stop = 'blowup'; break; }
      x = gx;
      if (opt.tol !== undefined && rows[i].diff < opt.tol) { stop = 'tol'; break; }
    }
    return { rows, last: x, stop };
  };

  /* ================================================================
     1.4  Newton's method
     ================================================================ */
  E.newton = function (f, df, x0, opt) {
    const rows = [];
    let x = x0;
    const max = opt.steps || 50;
    let stop = 'steps';
    for (let i = 0; i < max; i++) {
      const fx = f(x), dfx = df(x);
      const row = { i, x, fx, dfx };
      if (fx === 0) { row.exact = true; row.next = x; row.diff = 0; rows.push(row); stop = 'exact'; break; }
      if (!isFinite(fx) || !isFinite(dfx)) { row.bad = true; rows.push(row); stop = 'undefined'; break; }
      if (dfx === 0) { row.zeroSlope = true; rows.push(row); stop = 'zeroSlope'; break; }
      row.next = x - fx / dfx;
      row.diff = Math.abs(row.next - x);
      rows.push(row);
      x = row.next;
      if (!isFinite(x) || Math.abs(x) > BLOWUP) { stop = 'blowup'; break; }
      if (opt.tol !== undefined && row.diff < opt.tol) { stop = 'tol'; break; }
    }
    return { rows, last: x, stop };
  };

  /* ================================================================
     1.5  Secant and False Position
     ================================================================ */
  E.secant = function (f, x0, x1, opt) {
    const rows = [];
    let xp = x0, x = x1, fp = f(x0), fx = f(x1);
    const max = opt.steps || 50;
    let stop = 'steps';
    for (let i = 1; i <= max; i++) {
      const row = { i, xp, x, fp, fx };
      if (!isFinite(fp) || !isFinite(fx)) { row.bad = true; rows.push(row); stop = 'undefined'; break; }
      if (fx === 0) { row.exact = true; row.next = x; row.diff = 0; rows.push(row); stop = 'exact'; break; }
      if (fx === fp) { row.flat = true; rows.push(row); stop = 'flat'; break; }
      row.next = x - (fx * (x - xp)) / (fx - fp);
      row.diff = Math.abs(row.next - x);
      rows.push(row);
      xp = x; fp = fx; x = row.next; fx = f(x);
      if (!isFinite(x) || Math.abs(x) > BLOWUP) { stop = 'blowup'; break; }
      if (opt.tol !== undefined && row.diff < opt.tol) { stop = 'tol'; break; }
    }
    return { rows, last: x, stop };
  };
  E.falsePosition = function (f, a, b, opt) {
    let fa = f(a), fb = f(b);
    if (!(isFinite(a) && isFinite(b) && a < b && isFinite(fa) && isFinite(fb))) return { error: 'Use a < b with finite function values at both endpoints.' };
    if (Math.sign(fa) === Math.sign(fb)) return { error: 'f(a) and f(b) must have different signs for False Position.' };
    const rows = [];
    const max = opt.steps || 50;
    let prev = null, stop = 'steps';
    for (let i = 0; i < max; i++) {
      const c = (b * fa - a * fb) / (fa - fb), fc = f(c);
      if (!isFinite(c) || !isFinite(fc)) return { error: 'The new function value is undefined. False Position requires a continuous function throughout the interval.' };
      const row = { i, a, fa, b, fb, c, fc, diff: prev === null ? null : Math.abs(c - prev) };
      if (fc === 0) { row.keep = 'exact'; rows.push(row); stop = 'exact'; break; }
      if (Math.sign(fa) !== Math.sign(fc)) { row.keep = 'left'; b = c; fb = fc; }
      else { row.keep = 'right'; a = c; fa = fc; }
      rows.push(row);
      if (opt.tol !== undefined && row.diff !== null && row.diff < opt.tol) { stop = 'tol'; break; }
      prev = c;
    }
    return { rows, last: rows[rows.length - 1].c, stop };
  };

  /* ================================================================
     3.1  Lagrange and Newton's divided differences
     ================================================================ */
  E.checkDistinct = function (xs, F) {
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
      if (F.isZero(F.sub(xs[i], xs[j]))) return 'Two points have the same x-value (' + E.vText(xs[i]) + '). Every x must be different.';
    }
    return null;
  };
  E.lagrange = function (xs, ys, F) {
    const n = xs.length;
    const basis = [];
    let total = [F.zero()];
    for (let k = 0; k < n; k++) {
      let numer = [F.one()];
      let den = F.one();
      const others = [];
      for (let j = 0; j < n; j++) {
        if (j === k) continue;
        numer = P.mulLin(numer, xs[j], F);
        den = F.mul(den, F.sub(xs[k], xs[j]));
        others.push(j);
      }
      const Lk = P.scale(numer, F.div(F.one(), den), F);
      const term = P.scale(Lk, ys[k], F);
      total = P.add(total, term, F);
      basis.push({ k, others, numer, den, Lk, term });
    }
    return { basis, poly: P.trim(total, F) };
  };
  E.lagrangeAt = function (xs, ys, F, t) {
    const n = xs.length;
    const parts = [];
    let sum = F.zero();
    for (let k = 0; k < n; k++) {
      let nu = F.one(), de = F.one();
      for (let j = 0; j < n; j++) {
        if (j === k) continue;
        nu = F.mul(nu, F.sub(t, xs[j]));
        de = F.mul(de, F.sub(xs[k], xs[j]));
      }
      const L = F.div(nu, de);
      sum = F.add(sum, F.mul(ys[k], L));
      parts.push({ k, nu, de, L, term: F.mul(ys[k], L) });
    }
    return { parts, value: sum };
  };
  /* Triangle T[j][i] = f[x_i ... x_{i+j}] (0-based), with the arithmetic kept. */
  E.divDiff = function (xs, ys, F) {
    const n = xs.length;
    const T = [ys.slice()], ops = [ys.map(() => null)];
    for (let j = 1; j < n; j++) {
      T[j] = []; ops[j] = [];
      for (let i = 0; i < n - j; i++) {
        const top = T[j - 1][i], bot = T[j - 1][i + 1];
        const nu = F.sub(bot, top), de = F.sub(xs[i + j], xs[i]);
        T[j][i] = F.div(nu, de);
        ops[j][i] = { top, bot, nu, de, i, j };
      }
    }
    const coef = T.map((col) => col[0]);
    let poly = [coef[n - 1]];
    for (let k = n - 2; k >= 0; k--) poly = P.add(P.mulLin(poly, xs[k], F), [coef[k]], F);
    return { T, ops, coef, poly: P.trim(poly, F) };
  };
  /* Evaluate the Newton form c1 + (x−x1)(c2 + (x−x2)(...)) — nested, inside out. */
  E.newtonEval = function (coef, xs, t, F) {
    const base = xs.slice(0, coef.length - 1);
    return E.horner(coef.slice().reverse(), t, F, base);
  };
  /* Degree of the interpolating polynomial = last nonzero top-edge entry. */
  E.degreeFromCoef = function (coef, F) {
    let d = coef.length - 1;
    while (d > 0 && F.isZero(coef[d])) d--;
    return d;
  };

  /* ================================================================
     3.2 / 3.3  Interpolation error and Chebyshev nodes
     ================================================================ */
  E.factorial = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  E.maxAbsOn = function (f, a, b, samples) {
    const N = samples || 4000;
    let best = 0, at = a, undefinedValues = false;
    for (let i = 0; i <= N; i++) {
      const x = a + ((b - a) * i) / N, v = Math.abs(f(x));
      if (!isFinite(v)) undefinedValues = true;
      else if (v > best) { best = v; at = x; }
    }
    return { max: best, at, undefinedValues };
  };

  /* Conservative interval arithmetic for derivative bounds. Unsupported or
     possibly undefined expressions return null; sampling is never a proof. */
  E.absBound = function (node, a, b) {
    if (!(isFinite(a) && isFinite(b) && a <= b)) return null;
    const range = (lo, hi) => {
      if (!isFinite(lo) || !isFinite(hi)) return null;
      const pad = 8 * Number.EPSILON * Math.max(Math.abs(lo), Math.abs(hi));
      return [lo - pad, hi + pad];
    };
    const visit = (n) => {
      if (n.k === 'num') return [n.v, n.v];
      if (n.k === 'c') return [CONST[n.n], CONST[n.n]];
      if (n.k === 'x') return [a, b];
      const u = n.a && visit(n.a);
      if (!u) return null;
      if (n.k === 'neg') return [-u[1], -u[0]];
      if (n.k === 'fn') {
        const [lo, hi] = u;
        switch (n.n) {
          case 'sin': case 'cos': return [-1, 1];
          case 'exp': return range(Math.exp(lo), Math.exp(hi));
          case 'ln': case 'log': return lo > 0 ? range(FN[n.n](lo), FN[n.n](hi)) : null;
          case 'sqrt': return lo >= 0 ? range(Math.sqrt(lo), Math.sqrt(hi)) : null;
          case 'cbrt': case 'sinh': case 'tanh': case 'atan': return range(FN[n.n](lo), FN[n.n](hi));
          case 'asin': return lo >= -1 && hi <= 1 ? range(Math.asin(lo), Math.asin(hi)) : null;
          case 'acos': return lo >= -1 && hi <= 1 ? range(Math.acos(hi), Math.acos(lo)) : null;
          case 'abs': return [lo <= 0 && hi >= 0 ? 0 : Math.min(Math.abs(lo), Math.abs(hi)), Math.max(Math.abs(lo), Math.abs(hi))];
          case 'cosh': return range(lo <= 0 && hi >= 0 ? 1 : Math.min(Math.cosh(lo), Math.cosh(hi)), Math.max(Math.cosh(lo), Math.cosh(hi)));
          default: return null;
        }
      }
      const v = n.b && visit(n.b);
      if (!v) return null;
      if (n.k === '+') return range(u[0] + v[0], u[1] + v[1]);
      if (n.k === '-') return range(u[0] - v[1], u[1] - v[0]);
      if (n.k === '*' || n.k === '/') {
        if (n.k === '/' && v[0] <= 0 && v[1] >= 0) return null;
        const w = n.k === '/' ? [1 / v[1], 1 / v[0]] : v;
        const products = [u[0] * w[0], u[0] * w[1], u[1] * w[0], u[1] * w[1]];
        return range(Math.min(...products), Math.max(...products));
      }
      if (n.k === '^' && !hasX(n.b)) {
        const p = compileNode(n.b)(0);
        if (!isFinite(p)) return null;
        if (p === 0) return [1, 1];
        if (p < 0 && u[0] <= 0 && u[1] >= 0) return null;
        if (!Number.isInteger(p) && u[0] < 0) return null;
        const ends = [Math.pow(u[0], p), Math.pow(u[1], p)];
        const lo = p > 0 && u[0] <= 0 && u[1] >= 0 ? 0 : Math.min(...ends);
        // Odd integer powers remain monotone across zero.
        return range(Number.isInteger(p) && p % 2 !== 0 ? Math.min(...ends) : lo, Math.max(...ends));
      }
      if (n.k === '^' && u[0] > 0) {
        const corners = [Math.pow(u[0], v[0]), Math.pow(u[0], v[1]), Math.pow(u[1], v[0]), Math.pow(u[1], v[1])];
        return range(Math.min(...corners), Math.max(...corners));
      }
      return null;
    };
    const r = visit(node);
    return r ? { max: Math.max(Math.abs(r[0]), Math.abs(r[1])), method: 'interval' } : null;
  };
  E.chebNodes = function (n, a, b) {
    const out = [];
    for (let i = 1; i <= n; i++) {
      const ang = ((2 * i - 1) * Math.PI) / (2 * n);
      const t = Math.cos(ang);
      out.push({ i, ang, t, x: (b + a) / 2 + ((b - a) / 2) * t });
    }
    return out;
  };
  /* Chebyshev polynomial T_n(t) by the recurrence T_{n+1} = 2tT_n − T_{n−1} */
  E.chebT = function (n, t) {
    if (n === 0) return 1;
    let a = 1, b = t;
    for (let k = 1; k < n; k++) { const c = 2 * t * b - a; a = b; b = c; }
    return b;
  };
  /* Fast float interpolant through (xs, ys) for plotting. */
  E.interpFn = function (xs, ys) {
    const F = E.RF;
    const xf = xs.map(Number), yf = ys.map(Number);
    const dd = E.divDiff(xf, yf, F);
    return (t) => {
      let y = dd.coef[dd.coef.length - 1];
      for (let k = dd.coef.length - 2; k >= 0; k--) y = y * (t - xf[k]) + dd.coef[k];
      return y;
    };
  };

  /* ================================================================
     3.4  Natural cubic spline (Sauer eq. 3.22–3.24)
     ================================================================ */
  E.naturalSpline = function (xs, ys, F) {
    const n = xs.length;
    const del = [], Del = [];
    for (let i = 0; i < n - 1; i++) {
      del.push(F.sub(xs[i + 1], xs[i]));
      Del.push(F.sub(ys[i + 1], ys[i]));
      if (F.num(del[i]) <= 0) return { error: 'For a spline, list the x-values from smallest to largest, all different.' };
    }
    const three = F.from(3), two = F.from(2);
    // Tridiagonal system for c_1..c_n
    const A = [], r = [];
    for (let i = 0; i < n; i++) {
      const row = Array.from({ length: n }, () => F.zero());
      if (i === 0 || i === n - 1) { row[i] = F.one(); r.push(F.zero()); }
      else {
        row[i - 1] = del[i - 1];
        row[i] = F.mul(two, F.add(del[i - 1], del[i]));
        row[i + 1] = del[i];
        r.push(F.mul(three, F.sub(F.div(Del[i], del[i]), F.div(Del[i - 1], del[i - 1]))));
      }
      A.push(row);
    }
    // Thomas algorithm (works for any tridiagonal, exact or decimal)
    const c = new Array(n);
    const cp = [], dp = [];
    for (let i = 0; i < n; i++) {
      const ai = i > 0 ? A[i][i - 1] : F.zero();
      const bi = A[i][i];
      const ci = i < n - 1 ? A[i][i + 1] : F.zero();
      const denom = i > 0 ? F.sub(bi, F.mul(ai, cp[i - 1])) : bi;
      cp.push(F.div(ci, denom));
      dp.push(F.div(i > 0 ? F.sub(r[i], F.mul(ai, dp[i - 1])) : r[i], denom));
    }
    c[n - 1] = dp[n - 1];
    for (let i = n - 2; i >= 0; i--) c[i] = F.sub(dp[i], F.mul(cp[i], c[i + 1]));
    const b = [], d = [];
    for (let i = 0; i < n - 1; i++) {
      d.push(F.div(F.sub(c[i + 1], c[i]), F.mul(three, del[i])));
      b.push(F.sub(F.div(Del[i], del[i]), F.div(F.mul(del[i], F.add(F.mul(two, c[i]), c[i + 1])), three)));
    }
    const evalNum = (t) => {
      let i = 0;
      const xn = xs.map((v) => F.num(v));
      while (i < n - 2 && t > xn[i + 1]) i++;
      const s = t - xn[i];
      return F.num(ys[i]) + F.num(b[i]) * s + F.num(c[i]) * s * s + F.num(d[i]) * s * s * s;
    };
    return { del, Del, A, r, c, b, d, evalNum, n };
  };

  /* ================================================================
     5.1  Numerical differentiation   5.2  Newton–Cotes integration
     ================================================================ */
  E.diffFormulas = function (f, x, h) {
    const f0 = f(x), fp = f(x + h), fm = f(x - h);
    return {
      f0, fp, fm,
      forward: (fp - f0) / h,
      backward: (f0 - fm) / h,
      centered: (fp - fm) / (2 * h),
      second: (fm - 2 * f0 + fp) / (h * h),
    };
  };
  E.integrate = function (f, a, b, n, method) {
    if (!(isFinite(a) && isFinite(b) && a !== b)) return { error: 'Use two different finite integration limits.' };
    if (!Number.isInteger(n) || n < 1 || n > 10000) return { error: 'The panel count must be a whole number from 1 to 10000.' };
    if (!['trap', 'simpson', 'midpoint'].includes(method)) return { error: 'Choose Trapezoid, Simpson, or Midpoint.' };
    if (method === 'simpson' && n % 2) return { error: 'Simpson\'s Rule needs an even number of panels.' };
    const h = (b - a) / n;
    const pts = [];
    if (method === 'midpoint') {
      let s = 0;
      for (let i = 0; i < n; i++) {
        const x = a + (i + 0.5) * h, y = f(x);
        if (!isFinite(y)) return { error: 'f is undefined at x = ' + x + '. Check the function and limits.' };
        pts.push({ i, x, y, w: 1 });
        s += y;
      }
      return { h, pts, value: h * s, sum: s, factor: h };
    }
    for (let i = 0; i <= n; i++) {
      const x = a + i * h, y = f(x);
      if (!isFinite(y)) return { error: 'f is undefined at x = ' + x + '. Check the function and limits.' };
      let w;
      if (method === 'trap') w = i === 0 || i === n ? 1 : 2;
      else w = i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2;
      pts.push({ i, x, y, w });
    }
    const sum = pts.reduce((s, p) => s + p.w * p.y, 0);
    const factor = method === 'trap' ? h / 2 : h / 3;
    return { h, pts, sum, factor, value: factor * sum };
  };
  /* High-accuracy reference value (adaptive Simpson). */
  E.integralRef = function (f, a, b) {
    let evaluations = 0;
    const value = (x) => {
      if (++evaluations > 20000) throw new Error('The reference integral did not converge within the calculation limit.');
      const y = f(x);
      if (!isFinite(y)) throw new Error('The reference integral is undefined at x = ' + x + '.');
      return y;
    };
    function simp(a, b, fa, fm, fb) { return ((b - a) / 6) * (fa + 4 * fm + fb); }
    function rec(a, b, fa, fm, fb, whole, eps, depth) {
      const m = (a + b) / 2, lm = (a + m) / 2, rm = (m + b) / 2;
      const flm = value(lm), frm = value(rm);
      const left = simp(a, m, fa, flm, fm), right = simp(m, b, fm, frm, fb);
      if (!isFinite(left + right)) throw new Error('The reference integral overflowed.');
      if (Math.abs(left + right - whole) <= 15 * eps) return left + right + (left + right - whole) / 15;
      if (depth >= 20) throw new Error('A reliable reference value is unavailable for this function and interval.');
      return rec(a, m, fa, flm, fm, left, eps / 2, depth + 1) + rec(m, b, fm, frm, fb, right, eps / 2, depth + 1);
    }
    const fa = value(a), fb = value(b), fm = value((a + b) / 2);
    return rec(a, b, fa, fm, fb, simp(a, b, fa, fm, fb), 1e-12, 0);
  };

  /* Unicode subscripts for canvas labels: x₁, c₂ */
  E.subDigits = (n) => String(n).replace(/[0-9]/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]).replace('-', '₋');

  if (typeof module !== 'undefined' && module.exports) module.exports = NM;
})(typeof window !== 'undefined' ? window : globalThis);
