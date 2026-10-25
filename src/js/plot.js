/* plot.js — small canvas plotter: grid, axes, curves, points, shading,
   drag to pan, +/− to zoom, and draggable data points. */
(function (root) {
  'use strict';
  const NM = root.NM;

  function niceStep(span, target) {
    const raw = span / target;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
  }
  function fmtTick(v, step) {
    const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    let s = v.toFixed(Math.min(d, 6));
    if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);
    return s.replace('-', '−');
  }
  const PALETTE = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

  class Plot {
    constructor(parent, opts) {
      this.opts = Object.assign({ height: 330, equal: false, tools: true, hint: true }, opts || {});
      this.wrap = document.createElement('div');
      this.wrap.className = 'plot';
      this.canvas = document.createElement('canvas');
      this.canvas._plot = this; // lets a theme change repaint every graph on the page
      this.canvas.setAttribute('role', 'img');
      this.canvas.setAttribute('aria-label', this.opts.label || 'Graph');
      this.wrap.appendChild(this.canvas);
      if (this.opts.tools) {
        const tools = document.createElement('div');
        tools.className = 'plot-tools';
        const mk = (txt, title, fnc) => {
          const b = document.createElement('button');
          b.className = 'btn sm'; b.type = 'button'; b.textContent = txt; b.title = title;
          b.setAttribute('aria-label', title);
          b.addEventListener('click', fnc);
          tools.appendChild(b);
        };
        mk('+', 'Zoom in', () => this.zoom(0.7));
        mk('−', 'Zoom out', () => this.zoom(1 / 0.7));
        mk('⟲', 'Reset view', () => { this.view = Object.assign({}, this.home); this.render(); });
        this.wrap.appendChild(tools);
      }
      this.legendEl = document.createElement('div');
      this.legendEl.className = 'plot-legend';
      parent.appendChild(this.wrap);
      parent.appendChild(this.legendEl);
      if (this.opts.hint) {
        const hint = document.createElement('div');
        hint.className = 'plot-hint';
        hint.textContent = this.opts.hintText || 'Drag the graph to move it · use + and − to zoom';
        parent.appendChild(hint);
      }
      this.ctx = this.canvas.getContext('2d');
      this.view = Object.assign({ x0: -5, x1: 5, y0: -5, y1: 5 }, this.opts.view || {});
      this.home = Object.assign({}, this.view);
      this.scene = null;
      this.handles = [];
      this.W = 0; this.H = 0;
      this._bind();
      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(() => this.resize());
        this._ro.observe(this.wrap);
      }
      requestAnimationFrame(() => this.resize());
    }

    setView(v, keepHome) {
      this.view = Object.assign({}, v);
      if (!keepHome) this.home = Object.assign({}, v);
      this.render();
    }
    zoom(factor, cx, cy) {
      const v = this.view;
      const mx = cx === undefined ? (v.x0 + v.x1) / 2 : cx;
      const my = cy === undefined ? (v.y0 + v.y1) / 2 : cy;
      this.view = {
        x0: mx - (mx - v.x0) * factor, x1: mx + (v.x1 - mx) * factor,
        y0: my - (my - v.y0) * factor, y1: my + (v.y1 - my) * factor,
      };
      this.render();
    }
    resize() {
      const w = this.wrap.clientWidth;
      if (!w) return;
      const hgt = Math.round(Math.min(this.opts.height, Math.max(230, w * 0.74)));
      const dpr = Math.min(root.devicePixelRatio || 1, 2.5);
      if (w === this.W && hgt === this.H && this._dpr === dpr) return;
      this.W = w; this.H = hgt; this._dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(hgt * dpr);
      this.canvas.style.height = hgt + 'px';
      this.render();
    }
    /* view actually used: equal aspect stretches the y-range to match x */
    _eff() {
      const v = this.view;
      if (!this.opts.equal || !this.W) return v;
      const sx = this.W / (v.x1 - v.x0);
      const yc = (v.y0 + v.y1) / 2, half = this.H / sx / 2;
      return { x0: v.x0, x1: v.x1, y0: yc - half, y1: yc + half };
    }
    X(x) { const v = this.ev; return ((x - v.x0) / (v.x1 - v.x0)) * this.W; }
    Y(y) { const v = this.ev; return this.H - ((y - v.y0) / (v.y1 - v.y0)) * this.H; }
    invX(px) { const v = this.ev; return v.x0 + (px / this.W) * (v.x1 - v.x0); }
    invY(py) { const v = this.ev; return v.y0 + ((this.H - py) / this.H) * (v.y1 - v.y0); }
    color(c) {
      if (!c) c = 'c1';
      if (c.startsWith('#') || c.startsWith('rgb')) return c;
      if (!this._cs) this._cs = getComputedStyle(this.wrap);
      return this._cs.getPropertyValue('--' + c).trim() || c;
    }

    render() {
      if (!this.W) return;
      this._cs = null;
      const ctx = this.ctx, dpr = this._dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ev = this._eff();
      ctx.clearRect(0, 0, this.W, this.H);
      ctx.fillStyle = this.color('plot-bg');
      ctx.fillRect(0, 0, this.W, this.H);
      this._grid();
      this.handles = [];
      if (this.scene) {
        try { this.scene(this); } catch (e) { console.error(e); }
      }
    }
    _grid() {
      const ctx = this.ctx, v = this.ev;
      const sx = niceStep(v.x1 - v.x0, Math.max(4, this.W / 90));
      const sy = niceStep(v.y1 - v.y0, Math.max(3, this.H / 70));
      ctx.lineWidth = 1;
      ctx.strokeStyle = this.color('plot-grid');
      ctx.beginPath();
      for (let x = Math.ceil(v.x0 / sx) * sx; x <= v.x1; x += sx) { const px = Math.round(this.X(x)) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, this.H); }
      for (let y = Math.ceil(v.y0 / sy) * sy; y <= v.y1; y += sy) { const py = Math.round(this.Y(y)) + 0.5; ctx.moveTo(0, py); ctx.lineTo(this.W, py); }
      ctx.stroke();
      // axes
      ctx.strokeStyle = this.color('plot-axis');
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      const ax = v.y0 <= 0 && v.y1 >= 0 ? Math.round(this.Y(0)) + 0.5 : null;
      const ay = v.x0 <= 0 && v.x1 >= 0 ? Math.round(this.X(0)) + 0.5 : null;
      if (ax !== null) { ctx.moveTo(0, ax); ctx.lineTo(this.W, ax); }
      if (ay !== null) { ctx.moveTo(ay, 0); ctx.lineTo(ay, this.H); }
      ctx.stroke();
      // tick labels
      ctx.fillStyle = this.color('plot-text');
      ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const ly = ax === null ? this.H - 15 : Math.min(this.H - 15, ax + 4);
      for (let x = Math.ceil(v.x0 / sx) * sx; x <= v.x1; x += sx) {
        if (Math.abs(x) < sx / 2 && ay !== null) continue;
        const px = this.X(x);
        if (px < 12 || px > this.W - 12) continue;
        ctx.fillText(fmtTick(x, sx), px, ly);
      }
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const lx = ay === null ? 30 : Math.max(30, ay - 5);
      for (let y = Math.ceil(v.y0 / sy) * sy; y <= v.y1; y += sy) {
        if (Math.abs(y) < sy / 2 && ax !== null) continue;
        const py = this.Y(y);
        if (py < 10 || py > this.H - 10) continue;
        ctx.fillText(fmtTick(y, sy), lx, py);
      }
    }

    _style(s) {
      const ctx = this.ctx;
      s = s || {};
      ctx.strokeStyle = this.color(s.color);
      ctx.fillStyle = this.color(s.fill || s.color);
      ctx.lineWidth = s.width || 2;
      ctx.setLineDash(s.dash || []);
      ctx.globalAlpha = s.alpha === undefined ? 1 : s.alpha;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    }
    _reset() { this.ctx.setLineDash([]); this.ctx.globalAlpha = 1; }

    /* y = f(x) over the view (or [s.from, s.to]) */
    fn(f, s) {
      s = s || {};
      const ctx = this.ctx, v = this.ev;
      const a = s.from !== undefined ? Math.max(s.from, v.x0) : v.x0;
      const b = s.to !== undefined ? Math.min(s.to, v.x1) : v.x1;
      if (b <= a) return;
      this._style(s);
      const n = Math.max(60, Math.ceil(((this.X(b) - this.X(a)) / 1.5)));
      ctx.beginPath();
      let pen = false, lastPy = 0;
      for (let i = 0; i <= n; i++) {
        const x = a + ((b - a) * i) / n;
        let y;
        try { y = f(x); } catch (e) { y = NaN; }
        if (!isFinite(y)) { pen = false; continue; }
        let py = this.Y(y);
        const huge = this.H * 4;
        if (py < -huge || py > this.H + huge) { pen = false; lastPy = py; continue; }
        if (pen && Math.abs(py - lastPy) > this.H * 1.5) pen = false;
        const px = this.X(x);
        if (pen) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        pen = true; lastPy = py;
      }
      ctx.stroke();
      this._reset();
    }
    line(x1, y1, x2, y2, s) {
      this._style(s);
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(this.X(x1), this.Y(y1));
      ctx.lineTo(this.X(x2), this.Y(y2));
      ctx.stroke();
      this._reset();
    }
    /* infinite line through two points, clipped to the view */
    lineThrough(x1, y1, x2, y2, s) {
      const v = this.ev;
      if (x1 === x2) { this.line(x1, v.y0, x1, v.y1, s); return; }
      const m = (y2 - y1) / (x2 - x1);
      this.line(v.x0, y1 + m * (v.x0 - x1), v.x1, y1 + m * (v.x1 - x1), s);
    }
    arrow(x1, y1, x2, y2, s) {
      this.line(x1, y1, x2, y2, s);
      const ctx = this.ctx;
      const px1 = this.X(x1), py1 = this.Y(y1), px2 = this.X(x2), py2 = this.Y(y2);
      const len = Math.hypot(px2 - px1, py2 - py1);
      if (len < 10) return;
      const ux = (px2 - px1) / len, uy = (py2 - py1) / len;
      const hx = px1 + ux * len * 0.55, hy = py1 + uy * len * 0.55;
      this._style(Object.assign({}, s, { dash: [] }));
      ctx.beginPath();
      ctx.moveTo(hx + ux * 5, hy + uy * 5);
      ctx.lineTo(hx - ux * 4 - uy * 4.5, hy - uy * 4 + ux * 4.5);
      ctx.lineTo(hx - ux * 4 + uy * 4.5, hy - uy * 4 - ux * 4.5);
      ctx.closePath();
      ctx.fill();
      this._reset();
    }
    vline(x, s) { const v = this.ev; this.line(x, v.y0, x, v.y1, s); }
    hline(y, s) { const v = this.ev; this.line(v.x0, y, v.x1, y, s); }
    path(pts, s) {
      if (pts.length < 2) return;
      this._style(s);
      const ctx = this.ctx;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(this.X(p[0]), this.Y(p[1])) : ctx.moveTo(this.X(p[0]), this.Y(p[1]))));
      if (s && s.close) ctx.closePath();
      if (s && s.fillAlpha) { ctx.globalAlpha = s.fillAlpha; ctx.fill(); ctx.globalAlpha = s.alpha === undefined ? 1 : s.alpha; }
      if (!s || s.stroke !== false) ctx.stroke();
      this._reset();
    }
    /* shaded vertical band a ≤ x ≤ b */
    band(a, b, s) {
      const ctx = this.ctx;
      this._style(s);
      ctx.globalAlpha = (s && s.alpha) || 0.14;
      const pa = this.X(Math.min(a, b)), pb = this.X(Math.max(a, b));
      ctx.fillRect(pa, 0, pb - pa, this.H);
      this._reset();
    }
    /* area between y = f(x) and the x-axis */
    area(f, a, b, s) {
      const n = 120, pts = [[a, 0]];
      for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; pts.push([x, f(x)]); }
      pts.push([b, 0]);
      this.path(pts, Object.assign({ close: true, fillAlpha: 0.18, width: 1.2 }, s));
    }
    point(x, y, s) {
      s = s || {};
      if (!isFinite(x) || !isFinite(y)) return;
      const ctx = this.ctx, r = s.r || 5;
      const px = this.X(x), py = this.Y(y);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = s.hollow ? this.color('plot-bg') : this.color(s.color);
      ctx.fill();
      ctx.lineWidth = s.hollow ? 2 : 1.5;
      ctx.strokeStyle = s.hollow ? this.color(s.color) : this.color('plot-bg');
      ctx.stroke();
      if (s.label) this.text(x, y, s.label, Object.assign({ dy: -(r + 7), color: s.color }, s.labelStyle || {}));
      if (s.drag) this.handles.push({ px, py, r: Math.max(16, r + 10), onDrag: s.drag, x, y });
    }
    /* label at world (x, y), shifted dx/dy pixels; boxed=true draws a pill */
    text(x, y, str, s) {
      s = s || {};
      const ctx = this.ctx;
      let px = this.X(x) + (s.dx || 0), py = this.Y(y) + (s.dy || 0);
      ctx.font = (s.bold ? '600 ' : '') + (s.size || 12) + 'px ' + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = s.align || 'center';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(str).width;
      // keep labels on the canvas
      const left = ctx.textAlign === 'center' ? px - w / 2 : ctx.textAlign === 'right' ? px - w : px;
      if (left < 3) px += 3 - left;
      if (left + w > this.W - 3) px -= left + w - (this.W - 3);
      py = Math.max(9, Math.min(this.H - 9, py));
      if (s.boxed) {
        const bx = (ctx.textAlign === 'center' ? px - w / 2 : ctx.textAlign === 'right' ? px - w : px) - 5;
        ctx.fillStyle = this.color('plot-bg');
        ctx.globalAlpha = 0.88;
        ctx.fillRect(bx, py - 9, w + 10, 18);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = this.color(s.color || 'plot-text');
      ctx.fillText(str, px, py);
    }
    /* tick + label on the x-axis (or bottom edge) */
    xmark(x, label, s) {
      s = s || {};
      const v = this.ev;
      const y0 = v.y0 <= 0 && v.y1 >= 0 ? 0 : v.y0;
      const ctx = this.ctx;
      const px = this.X(x), py = this.Y(y0);
      ctx.strokeStyle = this.color(s.color || 'ink');
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px, py + 6); ctx.stroke();
      if (label) this.text(x, y0, label, { dy: s.below === false ? -16 : 18, color: s.color || 'ink', bold: true, boxed: true });
    }
    legend(items) {
      this.legendEl.innerHTML = '';
      (items || []).forEach((it) => {
        const sp = document.createElement('span');
        if (it.dot) sp.className = 'dot';
        sp.style.setProperty('--sw', this.color(it.color));
        sp.innerHTML = '<span>' + it.label + '</span>';
        this.legendEl.appendChild(sp);
      });
    }

    /* fit the view around some curves and points */
    fit(opt) {
      const x0 = opt.x0, x1 = opt.x1;
      const ys = [];
      (opt.fns || []).forEach((f) => {
        for (let i = 0; i <= 200; i++) {
          const x = x0 + ((x1 - x0) * i) / 200;
          let y; try { y = f(x); } catch (e) { y = NaN; }
          if (isFinite(y)) ys.push(y);
        }
      });
      (opt.pts || []).forEach((p) => { if (isFinite(p[1])) ys.push(p[1]); });
      if (opt.zero !== false) ys.push(0);
      let lo, hi;
      if (!ys.length) { lo = -1; hi = 1; }
      else {
        ys.sort((a, b) => a - b);
        const q = (t) => ys[Math.min(ys.length - 1, Math.max(0, Math.round(t * (ys.length - 1))))];
        lo = opt.robust ? q(0.04) : ys[0];
        hi = opt.robust ? q(0.96) : ys[ys.length - 1];
        (opt.pts || []).forEach((p) => { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
        if (opt.zero !== false) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
      }
      if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
      const pad = (hi - lo) * (opt.pad || 0.12);
      const px = (x1 - x0) * (opt.xpad === undefined ? 0.06 : opt.xpad);
      this.setView({ x0: x0 - px, x1: x1 + px, y0: lo - pad, y1: hi + pad });
    }

    _bind() {
      const cv = this.canvas;
      let mode = null, start = null, handle = null;
      const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const hit = (px, py) => this.handles.find((hd) => Math.hypot(hd.px - px, hd.py - py) <= hd.r);
      cv.addEventListener('pointerdown', (e) => {
        const [px, py] = pos(e);
        handle = hit(px, py);
        if (handle) mode = 'handle';
        else { mode = 'pan'; start = { px, py, v: Object.assign({}, this.view), ev: Object.assign({}, this.ev) }; }
        cv.setPointerCapture(e.pointerId);
        cv.classList.add('dragging');
      });
      cv.addEventListener('pointermove', (e) => {
        const [px, py] = pos(e);
        if (mode === 'handle' && handle) {
          handle.onDrag(this.invX(px), this.invY(py));
          this.render();
          return;
        }
        if (mode === 'pan' && start) {
          const ev = start.ev;
          const dx = ((px - start.px) / this.W) * (ev.x1 - ev.x0);
          const dy = ((py - start.py) / this.H) * (ev.y1 - ev.y0);
          this.view = { x0: start.v.x0 - dx, x1: start.v.x1 - dx, y0: start.v.y0 + dy, y1: start.v.y1 + dy };
          this.render();
          return;
        }
        cv.classList.toggle('on-handle', !!hit(px, py));
      });
      const end = () => { mode = null; handle = null; start = null; cv.classList.remove('dragging'); };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
      cv.addEventListener('wheel', (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const [px, py] = pos(e);
        this.zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, this.invX(px), this.invY(py));
      }, { passive: false });
    }
  }
  Plot.PALETTE = PALETTE;
  NM.Plot = Plot;
})(typeof window !== 'undefined' ? window : globalThis);
