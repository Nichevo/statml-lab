// Small canvas plotting + math helpers shared by every explainer.
(function () {
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function niceTicks(lo, hi, count = 6) {
    const span = hi - lo;
    if (!(span > 0)) return [lo];
    const raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }

  function fmt(v, d = 2) {
    if (!isFinite(v)) return "∞";
    const a = Math.abs(v);
    if (a < 5e-7) return (0).toFixed(d);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(1);
    return v.toFixed(d);
  }

  class Plot {
    constructor(canvas, opts = {}) {
      this.c = canvas;
      this.ctx = canvas.getContext("2d");
      this.pad = Object.assign({ l: 46, r: 14, t: 14, b: 36 }, opts.pad || {});
      this.x = opts.x || [0, 1];
      this.y = opts.y || [0, 1];
      this.resize();
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      const d = window.devicePixelRatio || 1;
      this.w = Math.max(10, r.width);
      this.h = Math.max(10, r.height);
      this.c.width = Math.round(this.w * d);
      this.c.height = Math.round(this.h * d);
      this.ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    get iw() { return this.w - this.pad.l - this.pad.r; }
    get ih() { return this.h - this.pad.t - this.pad.b; }
    sx(v) { return this.pad.l + ((v - this.x[0]) / (this.x[1] - this.x[0])) * this.iw; }
    sy(v) { return this.h - this.pad.b - ((v - this.y[0]) / (this.y[1] - this.y[0])) * this.ih; }
    ix(px) { return this.x[0] + ((px - this.pad.l) / this.iw) * (this.x[1] - this.x[0]); }
    iy(py) { return this.y[0] + ((this.h - this.pad.b - py) / this.ih) * (this.y[1] - this.y[0]); }
    // pixels per data unit on the y axis
    get ky() { return this.ih / (this.y[1] - this.y[0]); }

    clear() { this.ctx.clearRect(0, 0, this.w, this.h); }

    clip(fn) {
      const g = this.ctx;
      g.save();
      g.beginPath();
      g.rect(this.pad.l, this.pad.t, this.iw, this.ih);
      g.clip();
      fn(g);
      g.restore();
    }

    axes(o = {}) {
      const g = this.ctx;
      const xt = o.xTicks || niceTicks(this.x[0], this.x[1], o.xCount || 6);
      const yt = o.yTicks || niceTicks(this.y[0], this.y[1], o.yCount || 5);
      const xf = o.xFormat || ((v) => String(+v.toFixed(4)));
      const yf = o.yFormat || ((v) => String(+v.toFixed(4)));
      g.save();
      g.lineWidth = 1;
      g.strokeStyle = css("--grid");
      g.beginPath();
      for (const v of xt) { const p = Math.round(this.sx(v)) + 0.5; g.moveTo(p, this.pad.t); g.lineTo(p, this.h - this.pad.b); }
      for (const v of yt) { const p = Math.round(this.sy(v)) + 0.5; g.moveTo(this.pad.l, p); g.lineTo(this.w - this.pad.r, p); }
      g.stroke();
      g.strokeStyle = css("--line");
      g.strokeRect(this.pad.l + 0.5, this.pad.t + 0.5, this.iw, this.ih);
      g.fillStyle = css("--muted");
      g.font = `11px ${css("--font-mono")}`;
      g.textAlign = "center"; g.textBaseline = "top";
      for (const v of xt) g.fillText(xf(v), this.sx(v), this.h - this.pad.b + 6);
      g.textAlign = "right"; g.textBaseline = "middle";
      for (const v of yt) g.fillText(yf(v), this.pad.l - 6, this.sy(v));
      g.font = `12px ${css("--font-body")}`;
      if (o.xLabel) { g.textAlign = "right"; g.textBaseline = "bottom"; g.fillText(o.xLabel, this.w - this.pad.r, this.h - 1); }
      if (o.yLabel) { g.textAlign = "left"; g.textBaseline = "top"; g.fillText(o.yLabel, this.pad.l + 6, this.pad.t + 4); }
      g.restore();
    }

    path(xs, ys, color, width = 2, dash = null, alpha = 1) {
      this.clip((g) => {
        g.globalAlpha = alpha;
        g.strokeStyle = color; g.lineWidth = width; g.lineJoin = "round";
        if (dash) g.setLineDash(dash);
        g.beginPath();
        let started = false;
        for (let i = 0; i < xs.length; i++) {
          const y = ys[i];
          if (!isFinite(y)) { started = false; continue; }
          const px = this.sx(xs[i]), py = Math.max(-1e4, Math.min(1e4, this.sy(y)));
          if (!started) { g.moveTo(px, py); started = true; } else g.lineTo(px, py);
        }
        g.stroke();
      });
    }

    fn(f, color, width = 2, dash = null, alpha = 1, n = 240) {
      const xs = [], ys = [];
      for (let i = 0; i <= n; i++) { const x = this.x[0] + (i / n) * (this.x[1] - this.x[0]); xs.push(x); ys.push(f(x)); }
      this.path(xs, ys, color, width, dash, alpha);
    }

    dot(x, y, r, fill, stroke) {
      const g = this.ctx;
      g.beginPath();
      g.arc(this.sx(x), this.sy(y), r, 0, Math.PI * 2);
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
    }
  }

  // Redraw hooks: canvas size changes and theme changes.
  function watch(canvasList, redraw) {
    const ro = new ResizeObserver(() => redraw(true));
    canvasList.forEach((c) => ro.observe(c));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onTheme = () => redraw(false);
    mq.addEventListener("change", onTheme);
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-palette", "class"] });
    return () => { ro.disconnect(); mq.removeEventListener("change", onTheme); mo.disconnect(); };
  }

  // Pointer dragging of points on a plot. getPts returns [{x,y}], onChange called after moves.
  function dragPoints(plot, getPts, onChange, opts = {}) {
    let active = -1;
    const c = plot.c;
    const pos = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const nearest = (px, py) => {
      let best = -1, bd = 14 * 14;
      getPts().forEach((p, i) => { const dx = plot.sx(p.x) - px, dy = plot.sy(p.y) - py, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
      return best;
    };
    const clampX = (v) => Math.max(plot.x[0], Math.min(plot.x[1], v));
    const clampY = (v) => Math.max(plot.y[0], Math.min(plot.y[1], v));
    c.addEventListener("pointerdown", (e) => {
      const [px, py] = pos(e);
      active = nearest(px, py);
      if (active < 0 && opts.addOnClick && px > plot.pad.l && px < plot.w - plot.pad.r && py > plot.pad.t && py < plot.h - plot.pad.b) {
        getPts().push({ x: plot.ix(px), y: plot.iy(py) });
        active = getPts().length - 1;
        onChange();
      }
      if (active >= 0) { c.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    c.addEventListener("pointermove", (e) => {
      const [px, py] = pos(e);
      if (active < 0) { c.style.cursor = nearest(px, py) >= 0 ? "grab" : opts.addOnClick ? "crosshair" : "default"; return; }
      const p = getPts()[active];
      p.x = clampX(plot.ix(px)); p.y = clampY(plot.iy(py));
      c.style.cursor = "grabbing";
      onChange();
    });
    const end = () => { active = -1; };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
    c.addEventListener("dblclick", (e) => {
      if (!opts.removeOnDblClick) return;
      const [px, py] = pos(e);
      const i = nearest(px, py);
      if (i >= 0 && getPts().length > 3) { getPts().splice(i, 1); onChange(); }
    });
  }

  // Seeded RNG so "the same 30 datasets" stay the same while you move a slider.
  function rng(seed) {
    let a = seed >>> 0;
    const u = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    let spare = null;
    u.normal = () => {
      if (spare !== null) { const s = spare; spare = null; return s; }
      let x, y, s;
      do { x = u() * 2 - 1; y = u() * 2 - 1; s = x * x + y * y; } while (s >= 1 || s === 0);
      const m = Math.sqrt((-2 * Math.log(s)) / s);
      spare = y * m; return x * m;
    };
    return u;
  }

  function ols(pts) {
    const n = pts.length;
    const mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
    let sxy = 0, sxx = 0;
    for (const p of pts) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; }
    const b = sxx > 0 ? sxy / sxx : 0;
    return { a: my - b * mx, b, mx, my };
  }

  // Solve A x = y with partial pivoting (A is n x n, modified in place).
  function solve(A, y) {
    const n = y.length;
    for (let i = 0; i < n; i++) {
      let p = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      [A[i], A[p]] = [A[p], A[i]]; [y[i], y[p]] = [y[p], y[i]];
      const d = A[i][i] || 1e-12;
      for (let r = i + 1; r < n; r++) {
        const f = A[r][i] / d;
        if (!f) continue;
        for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
        y[r] -= f * y[i];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
      x[i] = s / (A[i][i] || 1e-12);
    }
    return x;
  }

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content;
  }

  // Inverse normal CDF (Acklam's approximation): qnorm(0.95) = 1.645
  function qnorm(p) {
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const q = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
    if (q < 0.02425) { const r = Math.sqrt(-2 * Math.log(q)); return (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1); }
    if (q > 1 - 0.02425) return -qnorm(1 - q);
    const r = q - 0.5, s = r * r;
    return ((((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r) / (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1);
  }

  // Standard normal density, CDF (Abramowitz-Stegun 7.1.26 via erf) and loss function G(z) = E[(Z - z)+]
  const dnorm = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  function pnorm(x) {
    const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
  }
  const gloss = (z) => dnorm(z) - z * (1 - pnorm(z));

  window.Lab = { css, niceTicks, fmt, Plot, watch, dragPoints, rng, ols, solve, el, qnorm, dnorm, pnorm, gloss };
})();
