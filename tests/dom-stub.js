/* Small DOM fixture for testing learning state transitions without dependencies.
   Layout, canvas rendering, and responsive behavior are checked in a browser. */
class Element {
  constructor(tag = 'div', text = '') {
    this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.listeners = {};
    this.value = ''; this._text = text; this._html = ''; this.parentNode = null;
    this.style = { setProperty() {} };
    this.classList = {
      add: (...v) => this.classes(v, true), remove: (...v) => this.classes(v, false),
      toggle: (v, on) => { const has = (this.className || '').split(' ').includes(v); this.classes([v], on === undefined ? !has : on); return !has; },
      contains: (v) => (this.className || '').split(' ').includes(v),
    };
  }
  classes(values, on) { const s = new Set((this.className || '').split(' ').filter(Boolean)); values.forEach((v) => on ? s.add(v) : s.delete(v)); this.className = [...s].join(' '); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); if (k === 'value') this.value = String(v); if (k === 'hidden') this.hidden = true; }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; if (k === 'hidden') this.hidden = false; }
  appendChild(n) { if (n.parentNode) n.remove(); this.children.push(n); n.parentNode = this; return n; }
  append(...ns) { ns.forEach((n) => this.appendChild(n instanceof Element ? n : new Element('#text', String(n)))); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((n) => n !== this); this.parentNode = null; }
  replaceWith(n) { if (!this.parentNode) return; const p = this.parentNode, i = p.children.indexOf(this); p.children[i] = n; n.parentNode = p; this.parentNode = null; }
  get childNodes() { return this.children; }
  set textContent(s) { this._text = String(s); this._html = ''; this.children = []; }
  get textContent() { return this._text + this._html + this.children.map((c) => c.textContent).join(' '); }
  set innerHTML(s) { this._html = String(s); this._text = ''; this.children = []; }
  get innerHTML() { return this._html + this.children.map((c) => c.textContent).join(' '); }
  addEventListener(k, cb) { (this.listeners[k] || (this.listeners[k] = [])).push(cb); }
  dispatch(k, extra) { (this.listeners[k] || []).forEach((cb) => cb(Object.assign({ target: this, preventDefault() {} }, extra || {}))); }
  click() { if (!this.disabled) this.dispatch('click'); }
  matches(s) { return s.startsWith('.') ? (this.className || '').split(' ').includes(s.slice(1)) : s.startsWith('#') ? this.attrs.id === s.slice(1) : this.tagName.toLowerCase() === s; }
  querySelectorAll(s) { return this.children.flatMap((c) => [...(c.matches(s) ? [c] : []), ...c.querySelectorAll(s)]); }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  contains(n) { return n === this || this.children.some((c) => c.contains(n)); }
  focus() { this.focused = true; }
  scrollIntoView() {} select() {}
  getBoundingClientRect() { return { bottom: 0, width: 800, height: 400 }; }
}

function environment() {
  const document = {
    documentElement: new Element('html'), body: new Element('body'),
    createElement: (t) => new Element(t), createTextNode: (s) => new Element('#text', s),
    querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
  };
  const memory = new Map(); let seed = 73621;
  const math = Object.create(Math);
  math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const context = {
    document, Node: Element, Math: math, console, innerHeight: 900,
    localStorage: { getItem: (k) => memory.get(k) || null, setItem: (k, v) => memory.set(k, v), removeItem: (k) => memory.delete(k) },
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    scrollBy() {}, scrollTo() {}, navigator: { clipboard: { writeText: () => Promise.resolve() } },
  };
  context.window = context;
  return context;
}
module.exports = { Element, environment };
