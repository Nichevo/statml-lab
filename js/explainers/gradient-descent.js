Lab.register({
  id: "gradient-descent",
  group: "Machine learning",
  title: "Gradient descent",
  blurb: "Roll a ball downhill on a loss surface. Tune the learning rate and momentum and watch it converge, zig-zag or blow up.",
  lede: "Most models learn by repeatedly nudging their parameters a small step against the gradient, the direction in which the loss rises fastest. The step size, called the learning rate, decides whether that works.",
  quiz: [
    ["The loss goes up and down wildly and never settles. What should you change?", "Lower the learning rate. Each step overshoots the bottom of the valley and lands on the other side, higher up."],
    ["Training is very slow but steady. What might help?", "A larger learning rate, or momentum, which builds up speed along directions where the gradient keeps pointing the same way."],
    ["Why does a long, narrow valley make plain gradient descent zig-zag?", "The gradient points mostly across the valley (the steep direction), not along it. Momentum or optimisers like Adam average out the zig-zag."],
    ["What is stochastic gradient descent?", "Computing the gradient on a small random batch of data instead of all of it. Each step is noisier but far cheaper, and the noise can help escape poor local minima."],
  ],
  diy: {
    intro: "Fit y = a + b·x by gradient descent. x in A2:A31, y in B2:B31, learning rate η in H1. Each row below is one iteration.",
    steps: [
      ["Starting parameters in row 2 of columns D (a) and E (b).", "D2: 0\nE2: 0"],
      ["Gradient of the mean squared error with respect to a and b.", "F2: =-2*AVERAGE($B$2:$B$31-(D2+E2*$A$2:$A$31))\nG2: =-2*AVERAGE(($B$2:$B$31-(D2+E2*$A$2:$A$31))*$A$2:$A$31)"],
      ["Step against the gradient.", "D3: =D2-$H$1*F2\nE3: =E2-$H$1*G2   (fill D3:G3 down 200 rows)"],
      ["Loss each iteration, to chart.", "I2: =AVERAGE(($B$2:$B$31-(D2+E2*$A$2:$A$31))^2)"],
      ["With momentum β in H2: keep a velocity for each parameter.", "J3: =$H$2*J2-$H$1*F2   (velocity for a)\nD3: =D2+J3"],
      ["Check the answer against least squares.", "=INTERCEPT(B2:B31,A2:A31)\n=SLOPE(B2:B31,A2:A31)"],
    ],
  },
  deeper: [
    ["Ruder (2016), An overview of gradient descent optimization algorithms, arXiv:1609.04747", "https://arxiv.org/abs/1609.04747", "momentum, Adam and friends, clearly compared"],
    ["Kingma & Ba (2014), Adam: a method for stochastic optimization, arXiv:1412.6980", "https://arxiv.org/abs/1412.6980", "the most used optimiser today"],
    ["Goh (2017), Why momentum really works, Distill", "https://distill.pub/2017/momentum/", "beautiful interactive explanation"],
    ["Goodfellow, Bengio & Courville, Deep Learning, ch. 8 (free online)", "https://www.deeplearningbook.org/contents/optimization.html", "optimisation for training models"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="60" cy="34" rx="30" ry="12" opacity=".3"/><ellipse cx="60" cy="34" rx="18" ry="7" opacity=".5"/><ellipse cx="60" cy="34" rx="6" ry="2.5"/><path d="M10 8 L24 26 L32 18 L42 30 L48 26 L56 33 L60 34"/><circle cx="10" cy="8" r="3" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, watch, fmt, css } = Lab;
    const SURF = {
      bowl: {
        name: "Stretched bowl", x: [-3, 3], y: [-2, 2], start: [-2.6, 1.5], lr: 0.1,
        f: (x, y) => 0.5 * (x * x + 8 * y * y), g: (x, y) => [x, 8 * y],
        formula: "L(w₁, w₂) = ½(w₁² + 8·w₂²)",
      },
      banana: {
        name: "Curved valley", x: [-2, 2], y: [-1, 3], start: [-1.5, 2.5], lr: 0.02,
        f: (x, y) => (1 - x) ** 2 + 5 * (y - x * x) ** 2, g: (x, y) => [-2 * (1 - x) - 20 * x * (y - x * x), 10 * (y - x * x)],
        formula: "L(w₁, w₂) = (1 − w₁)² + 5(w₂ − w₁²)²",
      },
      twin: {
        name: "Two valleys", x: [-2, 2], y: [-2, 2], start: [0.15, 1.6], lr: 0.05,
        f: (x, y) => (x * x - 1) ** 2 + 0.5 * y * y + 0.3 * x, g: (x, y) => [4 * x * (x * x - 1) + 0.3, y],
        formula: "L(w₁, w₂) = (w₁² − 1)² + ½w₂² + 0.3·w₁",
      },
      bumpy: {
        name: "Bumpy landscape (many minima)", x: [-3, 3], y: [-3, 3], start: [1.9, 2.4], lr: 0.1,
        wells: [[1.5, 1.0, 1.3, 0.5], [-1.6, -1.2, 2.0, 0.6], [1.3, -1.6, 1.0, 0.35], [-1.2, 1.6, 0.9, 0.4], [0.1, 0.1, 0.6, 0.25]],
        f(x, y) { return 0.1 * (x * x + y * y) - this.wells.reduce((s, [a, b, h, w]) => s + h * Math.exp(-((x - a) ** 2 + (y - b) ** 2) / w), 0); },
        g(x, y) {
          let gx = 0.2 * x, gy = 0.2 * y;
          for (const [a, b, h, w] of this.wells) { const e = h * Math.exp(-((x - a) ** 2 + (y - b) ** 2) / w); gx += (2 * (x - a) / w) * e; gy += (2 * (y - b) / w) * e; }
          return [gx, gy];
        },
        formula: "L = 0.1(w₁² + w₂²) − Σ hᵢ·exp(−‖w − cᵢ‖² / sᵢ)  (five wells of different depth)",
      },
    };
    Object.values(SURF).forEach((s) => { s.f = s.f.bind(s); s.g = s.g.bind(s); });

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot">
          <canvas id="gdc" aria-label="Contour map of the loss with the descent path"></canvas>
          <div class="legend">
            <span><i style="background:var(--accent)"></i>Stronger color = higher loss</span>
            <span><i style="background:var(--warm)"></i>Path taken</span>
            <span><i style="background:var(--violet)"></i>Gradient arrow at the current point</span>
          </div>
          <figcaption>Click anywhere on the map to start from there.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="gdl" aria-label="Loss over iterations"></canvas>
          <figcaption>Loss above the lowest point, per step (log scale).</figcaption>
        </figure>`,
      panel: `
        <div class="ctrl">
          <label for="surf">Loss surface</label>
          <select id="surf">${Object.entries(SURF).map(([k, s]) => `<option value="${k}">${s.name}</option>`).join("")}</select>
          <p class="hint num" id="formula"></p>
        </div>
        <div class="ctrl">
          <label for="lr">Learning rate η <output id="lrV"></output></label>
          <input type="range" id="lr" min="-3" max="0" step="0.01" value="-1">
        </div>
        <div class="ctrl">
          <label for="mom">Momentum β <output id="momV"></output></label>
          <input type="range" id="mom" min="0" max="0.95" step="0.05" value="0">
        </div>
        <div class="btns">
          <button class="btn primary" id="play" type="button">Run</button>
          <button class="btn" id="step" type="button">One step</button>
          <button class="btn" id="reset" type="button">Reset</button>
          <button class="btn" id="multi" type="button">Try 20 random starts</button>
        </div>
        <div class="readouts">
          <div class="ro"><b>Status</b><span id="status"></span></div>
          <div class="ro"><b>Step</b><span class="num" id="it"></span></div>
          <div class="ro"><b>Loss</b><span class="num" id="lossV"></span></div>
          <div class="ro"><b>Ended in</b><span id="which"></span></div>
          <p class="hint" id="multiOut" style="margin:0"></p>
        </div>
        <div>
          <h4>Last step, worked out</h4>
          <div class="readouts num" id="work" style="font-size:.8rem"></div>
        </div>`,
      notes: `
        <section>
          <h2>The update rule</h2>
          <p>At each step, compute the gradient ∇L (how fast the loss rises in each direction), then move a little the other way:</p>
          <div class="eq">w ← w − η·∇L(w)</div>
          <p>With momentum, keep a running velocity so that consistent directions speed up and back-and-forth directions cancel out:</p>
          <div class="eq">v ← β·v − η·∇L(w)&nbsp;&nbsp;&nbsp;w ← w + v</div>
          <p>The panel shows the numbers from the most recent step so you can check each one by hand.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Stretched bowl, η = 0.10: a smooth curve to the center. Now try 0.22: it zig-zags across the narrow direction. At 0.26 it blows up. The steep direction has curvature 8, and any η above 2/8 overshoots it.</li>
            <li>Keep η = 0.10 and add momentum 0.8. The path overshoots, then settles faster.</li>
            <li>Curved valley: gradient descent races into the valley floor and then crawls along it. Momentum helps a lot here.</li>
            <li>Two valleys: click to start on the right side, then the left. Gradient descent finds the nearest valley, not the deepest one.</li>
          </ol>
        </section>
        <section>
          <h2>Local vs global minima</h2>
          <p>A <b>global minimum</b> is the lowest point anywhere. A <b>local minimum</b> is a dip that is lowest only compared with its neighbours. Gradient descent only feels the slope where it stands, so it rolls into whichever dip is downhill from its start and stops there.</p>
          <ul>
            <li>Pick "Bumpy landscape" and press "Try 20 random starts". Some paths reach the global minimum (green ring), others get trapped (black rings).</li>
            <li><b>Random restarts</b>: run from many starts and keep the best. Cheap and effective in low dimensions.</li>
            <li><b>Momentum</b> can carry the ball over a small bump into a deeper valley. Try β = 0.9 with 20 random starts and compare the count.</li>
            <li><b>Convex</b> problems, like least squares and logistic regression, have a single bowl, so any minimum is the global one.</li>
            <li>Neural networks are not convex, but in very high dimensions most local minima turn out to be nearly as good as the best, which is part of why training works.</li>
          </ul>
        </section>
        <section>
          <h2>How this connects to real models</h2>
          <ul>
            <li>A neural network has millions of weights instead of two, but each training step is this same update.</li>
            <li>Stochastic gradient descent estimates the gradient from a small batch of data, so the path is noisy.</li>
            <li>Optimizers like Adam adapt the step size for each weight, which fixes the stretched-bowl problem automatically.</li>
          </ul>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const map = new Plot($("#gdc"), { pad: { l: 40, b: 32 } });
    const lossP = new Plot($("#gdl"), { x: [0, 50], y: [-6, 2], pad: { b: 30, t: 10 } });
    let minima = [], multi = [], S, fmin, path, losses, vel, running = false, raf = 0, last = null, status = "idle", bg = null;

    const hex = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
    const lr = () => 10 ** +$("#lr").value;

    function setSurface(k, keepLr) {
      S = SURF[k];
      map.x = S.x; map.y = S.y;
      fmin = Infinity;
      for (let i = 0; i <= 300; i++) for (let j = 0; j <= 300; j++) {
        const x = S.x[0] + (i / 300) * (S.x[1] - S.x[0]), y = S.y[0] + (j / 300) * (S.y[1] - S.y[0]);
        fmin = Math.min(fmin, S.f(x, y));
      }
      // find the minima: run small-step descent from a grid of starts and merge endpoints
      minima = [];
      for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
        let x = S.x[0] + ((i + 0.5) / 9) * (S.x[1] - S.x[0]), y = S.y[0] + ((j + 0.5) / 9) * (S.y[1] - S.y[0]);
        for (let k = 0; k < 4000; k++) { const g = S.g(x, y), st = 0.01; x -= st * g[0]; y -= st * g[1]; if (Math.hypot(...g) < 1e-6) break; }
        if (x < S.x[0] || x > S.x[1] || y < S.y[0] || y > S.y[1]) continue;
        if (!minima.some((m) => Math.hypot(m.x - x, m.y - y) < 0.05)) minima.push({ x, y, L: S.f(x, y) });
      }
      minima.sort((a, b) => a.L - b.L);
      multi = [];
      $("#multiOut").textContent = "";
      if (!keepLr) $("#lr").value = Math.log10(S.lr);
      $("#formula").textContent = S.formula;
      bg = null;
      reset(S.start);
    }

    function reset(p) {
      path = [p.slice()]; losses = [S.f(p[0], p[1])]; vel = [0, 0]; last = null; status = "idle";
      stop(); draw();
    }

    function renderBg() {
      const W = Math.max(60, Math.round(map.iw / 3)), H = Math.max(40, Math.round(map.ih / 3));
      const off = document.createElement("canvas"); off.width = W; off.height = H;
      const g = off.getContext("2d"), img = g.createImageData(W, H);
      const a = hex(css("--accent")), s = hex(css("--surface"));
      const vals = [];
      let lo = Infinity, hi = -Infinity;
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const x = S.x[0] + ((i + 0.5) / W) * (S.x[1] - S.x[0]), y = S.y[1] - ((j + 0.5) / H) * (S.y[1] - S.y[0]);
        const v = Math.log(S.f(x, y) - fmin + 0.02);
        vals.push(v); lo = Math.min(lo, v); hi = Math.max(hi, v);
      }
      vals.forEach((v, k) => {
        const t = (v - lo) / (hi - lo);
        const band = Math.floor(t * 14);
        const q = (band / 14) * 0.55 + (band % 2) * 0.05;
        for (let c = 0; c < 3; c++) img.data[k * 4 + c] = s[c] + (a[c] - s[c]) * q;
        img.data[k * 4 + 3] = 255;
      });
      g.putImageData(img, 0, 0);
      bg = off;
    }

    function stepOnce() {
      const [x, y] = path[path.length - 1];
      const gr = S.g(x, y), eta = lr(), beta = +$("#mom").value;
      vel = [beta * vel[0] - eta * gr[0], beta * vel[1] - eta * gr[1]];
      const nx = x + vel[0], ny = y + vel[1], L = S.f(nx, ny);
      last = { x, y, gr, eta, beta, v: vel.slice(), nx, ny, L };
      path.push([nx, ny]); losses.push(L);
      const n = losses.length;
      if (!isFinite(L) || L > 1e6 || Math.abs(nx) > 1e3 || Math.abs(ny) > 1e3) status = "diverged";
      else if (Math.hypot(...gr) < 1e-3 && Math.hypot(...vel) < 1e-4) status = "converged";
      else if (n > 4 && losses[n - 1] > losses[n - 2] && losses[n - 2] > losses[n - 3] && losses[n - 3] > losses[n - 4]) status = "diverging";
      else if (n > 4) {
        const d = path.slice(-4).map((p, i, a) => (i ? p[1] - a[i - 1][1] : 0)).slice(1);
        const e = path.slice(-4).map((p, i, a) => (i ? p[0] - a[i - 1][0] : 0)).slice(1);
        status = (d[0] * d[1] < 0 && d[1] * d[2] < 0) || (e[0] * e[1] < 0 && e[1] * e[2] < 0) ? "zigzag" : "descending";
      } else status = "descending";
      if (status === "diverged" || status === "converged" || path.length > 600) stop();
    }

    function tick() {
      for (let i = 0; i < 2 && running; i++) stepOnce();
      draw();
      if (running) raf = requestAnimationFrame(tick);
    }
    function play() { if (status === "diverged" || status === "converged" || path.length > 600) reset(path[0]); running = true; $("#play").textContent = "Pause"; raf = requestAnimationFrame(tick); }
    function stop() { running = false; cancelAnimationFrame(raf); $("#play").textContent = "Run"; }

    function arrow(g, x0, y0, x1, y1) {
      const ang = Math.atan2(y1 - y0, x1 - x0);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
      g.lineTo(x1 - 8 * Math.cos(ang - 0.4), y1 - 8 * Math.sin(ang - 0.4));
      g.moveTo(x1, y1); g.lineTo(x1 - 8 * Math.cos(ang + 0.4), y1 - 8 * Math.sin(ang + 0.4));
      g.stroke();
    }

    function draw() {
      $("#lrV").textContent = lr().toFixed(3);
      $("#momV").textContent = (+$("#mom").value).toFixed(2);
      if (!bg) renderBg();
      map.clear();
      const g = map.ctx;
      g.imageSmoothingEnabled = true;
      g.drawImage(bg, map.pad.l, map.pad.t, map.iw, map.ih);
      map.axes({ xLabel: "w₁", yLabel: "w₂" });
      map.clip(() => {
        g.strokeStyle = css("--warm"); g.lineWidth = 2; g.lineJoin = "round";
        g.beginPath();
        path.forEach((p, i) => { const px = map.sx(p[0]), py = map.sy(p[1]); i ? g.lineTo(px, py) : g.moveTo(px, py); });
        g.stroke();
        g.fillStyle = css("--warm");
        for (const p of path) { g.beginPath(); g.arc(map.sx(p[0]), map.sy(p[1]), 2.2, 0, 7); g.fill(); }
        const p = path[path.length - 1];
        if (isFinite(p[0]) && isFinite(p[1])) {
          const gr = S.g(p[0], p[1]), m = Math.hypot(...gr);
          if (m > 1e-3) {
            g.strokeStyle = css("--violet"); g.lineWidth = 2.5;
            const len = 34;
            arrow(g, map.sx(p[0]), map.sy(p[1]), map.sx(p[0]) - (gr[0] / m) * len, map.sy(p[1]) + (gr[1] / m) * len);
          }
          map.dot(p[0], p[1], 6, css("--surface"), css("--ink"));
        }
      });
      map.dot(path[0][0], path[0][1], 4, css("--ink"));
      map.clip((g) => {
        multi.forEach((m) => {
          g.strokeStyle = css(m.global ? "--good" : "--warm"); g.globalAlpha = 0.55; g.lineWidth = 1.3; g.beginPath();
          m.path.forEach((p, i) => (i ? g.lineTo(map.sx(p[0]), map.sy(p[1])) : g.moveTo(map.sx(p[0]), map.sy(p[1])))); g.stroke();
          g.globalAlpha = 1; g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(map.sx(m.path[0][0]), map.sy(m.path[0][1]), 2.5, 0, 7); g.fill();
        });
        if (minima.length > 1) minima.forEach((m, i) => {
          const px = map.sx(m.x), py = map.sy(m.y);
          g.lineWidth = 2; g.strokeStyle = css(i ? "--ink" : "--good"); g.fillStyle = css("--surface");
          g.beginPath(); g.arc(px, py, i ? 6 : 8, 0, 7); g.fill(); g.stroke();
          if (!i) { g.fillStyle = css("--good"); g.beginPath(); g.arc(px, py, 3.5, 0, 7); g.fill(); }
          g.font = `600 11px ${css("--font-mono")}`; g.textAlign = "left"; g.textBaseline = "middle";
          const txt = i ? `local ${m.L.toFixed(2)}` : `global ${m.L.toFixed(2)}`;
          g.lineWidth = 3; g.strokeStyle = css("--surface"); g.strokeText(txt, px + 11, py);
          g.fillStyle = css(i ? "--ink" : "--good"); g.fillText(txt, px + 11, py);
        });
      });

      const ys = losses.map((L) => Math.log10(Math.max(1e-6, L - fmin)));
      lossP.x = [0, Math.max(50, losses.length)];
      lossP.clear();
      lossP.axes({ xLabel: "step", yTicks: [-6, -4, -2, 0, 2], yFormat: (v) => "1e" + v });
      lossP.path(ys.map((_, i) => i), ys.map((v) => Math.min(v, 2.5)), css("--warm"), 2);

      const labels = { idle: ["idle", "Ready"], descending: ["ok", "Descending"], converged: ["ok", "Converged"], zigzag: ["warn", "Zig-zagging"], diverging: ["bad", "Loss rising"], diverged: ["bad", "Blew up"] };
      let st = labels[status];
      const endP = path[path.length - 1];
      const near = minima.map((m, i) => [Math.hypot(m.x - endP[0], m.y - endP[1]), i]).sort((a, b) => a[0] - b[0])[0];
      if (status === "converged" && minima.length > 1 && near && near[0] < 0.1) st = near[1] === 0 ? ["ok", "Found the global minimum"] : ["warn", "Stuck in a local minimum"];
      $("#which").innerHTML = minima.length > 1 && near && near[0] < 0.1
        ? (near[1] === 0 ? `<span class="pill ok">Global minimum</span>` : `<span class="pill warn">Local minimum ${near[1] + 1} of ${minima.length}</span>`)
        : `<span class="hint">${minima.length > 1 ? "Not at a minimum yet" : "Only one minimum here"}</span>`;
      $("#status").innerHTML = `<span class="pill ${st[0]}">${st[1]}</span>`;
      $("#it").textContent = path.length - 1;
      $("#lossV").textContent = fmt(losses[losses.length - 1], 4);
      const f2 = (v) => fmt(v, 3);
      const row = (k, v) => `<div style="display:grid;gap:1px"><span style="color:var(--muted)">${k}</span><span>${v}</span></div>`;
      $("#work").innerHTML = last
        ? row("w (where we were)", `(${f2(last.x)}, ${f2(last.y)})`) +
          row("∇L(w), the gradient", `(${f2(last.gr[0])}, ${f2(last.gr[1])})`) +
          row(`v = ${last.beta.toFixed(2)}·v − ${last.eta.toFixed(3)}·∇L`, `(${f2(last.v[0])}, ${f2(last.v[1])})`) +
          row("new w = w + v", `(${f2(last.nx)}, ${f2(last.ny)})`) +
          row("L(new w)", fmt(last.L, 4))
        : `<p class="hint">Press One step to see the arithmetic.</p>`;
    }

    $("#surf").addEventListener("change", (e) => setSurface(e.target.value));
    ["#lr", "#mom"].forEach((s) => $(s).addEventListener("input", () => reset(path[0])));
    $("#play").addEventListener("click", () => (running ? stop() : play()));
    $("#step").addEventListener("click", () => { stop(); if (status !== "diverged") stepOnce(); draw(); });
    $("#reset").addEventListener("click", () => { multi = []; $("#multiOut").textContent = ""; reset(path[0]); });
    $("#multi").addEventListener("click", () => {
      const r = Lab.rng(Date.now() % 100000), eta = lr(), beta = +$("#mom").value;
      multi = [];
      for (let k = 0; k < 20; k++) {
        let x = S.x[0] + r() * (S.x[1] - S.x[0]), y = S.y[0] + r() * (S.y[1] - S.y[0]), v = [0, 0];
        const pth = [[x, y]];
        for (let s = 0; s < 800; s++) {
          const gr = S.g(x, y); v = [beta * v[0] - eta * gr[0], beta * v[1] - eta * gr[1]]; x += v[0]; y += v[1];
          if (!isFinite(x) || Math.abs(x) > 1e3) break;
          pth.push([x, y]); if (Math.hypot(...gr) < 1e-4 && Math.hypot(...v) < 1e-5) break;
        }
        const g0 = minima[0], global = g0 ? Math.hypot(g0.x - x, g0.y - y) < 0.1 : true;
        multi.push({ path: pth, global });
      }
      const hits = multi.filter((m) => m.global).length;
      $("#multiOut").innerHTML = minima.length > 1
        ? `<b>${hits} of 20</b> random starts reached the global minimum (green paths). The other ${20 - hits} settled in a local one (orange).`
        : `All 20 starts head for the same single minimum.`;
      draw();
    });
    map.c.addEventListener("pointerdown", (e) => {
      const r = map.c.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      if (px < map.pad.l || px > map.w - map.pad.r || py < map.pad.t || py > map.h - map.pad.b) return;
      reset([map.ix(px), map.iy(py)]);
      play();
    });
    map.c.style.cursor = "crosshair";

    setSurface("bowl");
    const unwatch = watch([map.c, lossP.c], (resized) => { if (resized) { map.resize(); lossP.resize(); } bg = null; draw(); });
    return () => { stop(); unwatch(); };
  },
});
