Lab.register({
  id: "bias-variance",
  group: "Machine learning",
  title: "The bias–variance tradeoff",
  blurb: "Fit the same model to 30 different samples. Simple models agree but miss; flexible ones hit on average but scatter.",
  lede: "Imagine collecting your training data again and again from the same process. A good model should give similar answers each time (low variance) and be right on average (low bias). Polynomial degree lets you trade one for the other.",
  quiz: [
    ["A degree-15 polynomial fits the training data almost perfectly but tests badly. Bias or variance?", "Variance. It has learned the noise in this particular sample, so it changes wildly with a new sample."],
    ["A straight line fitted to a clearly curved pattern. Bias or variance?", "Bias. Even with endless data the line can't bend, so it's systematically wrong in the same places."],
    ["Why can't test error go below σ²?", "σ² is the irreducible noise: the part of y that no function of x can predict. Even the true function makes that error."],
    ["What are three ways to reduce variance?", "More data, a simpler model, and regularisation or averaging (bagging, random forests, ensembles of forecasts)."],
  ],
  diy: {
    intro: "x in A2:A31, y in B2:B31. Use rows 2–21 for training and 22–31 for testing. Put x, x², x³ … x⁷ in D:J.",
    steps: [
      ["Powers of x for polynomial fits.", "D2: =$A2   E2: =$A2^2   F2: =$A2^3   … up to J2: =$A2^7"],
      ["Fit a degree-d polynomial on the training rows with LINEST (degree 3 shown).", "=LINEST(B2:B21,D2:F21)"],
      ["Predict for every row with TREND, which uses the same fit.", "L2: =TREND($B$2:$B$21,$D$2:$F$21,D2:F2)"],
      ["Training and test error (mean squared error).", "=SUMXMY2(B2:B21,L2:L21)/20\n=SUMXMY2(B22:B31,L22:L31)/10"],
      ["Repeat for degrees 1 to 7 and chart both errors against degree. Training error falls; test error falls then rises.", ""],
      ["To see variance directly: refit on several resampled training sets and take the variance of the predictions at one x.", "=VAR.S(predictions at x from each fit)"],
    ],
  },
  deeper: [
    ["Geman, Bienenstock & Doursat (1992), Neural networks and the bias/variance dilemma, Neural Computation 4(1)", "https://doi.org/10.1162/neco.1992.4.1.1", "the classic paper"],
    ["Hastie, Tibshirani & Friedman, The Elements of Statistical Learning, §7.3 (free PDF)", "https://hastie.su.domains/ElemStatLearn/", "the decomposition derived"],
    ["James et al., An Introduction to Statistical Learning, §2.2 (free PDF)", "https://www.statlearning.com/", "a gentler version"],
    ["Belkin, Hsu, Ma & Mandal (2019), Reconciling modern machine-learning practice and the bias-variance trade-off, PNAS 116(32)", "https://doi.org/10.1073/pnas.1903070116", "double descent: why huge models can generalise"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 32 C 22 4, 38 4, 48 32 S 74 60, 90 32" stroke-dasharray="4 3"/><path d="M6 36 C 22 10, 38 2, 48 30 S 74 56, 90 30" opacity=".35"/><path d="M6 28 C 22 6, 40 10, 48 34 S 72 62, 90 36" opacity=".35"/><path d="M6 34 C 24 2, 36 6, 48 28 S 76 58, 90 26" opacity=".35"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, solve, fmt, css } = Lab;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="bvc" aria-label="Thirty polynomial fits and their average"></canvas>
          <div class="legend">
            <span><i style="background:var(--violet)"></i>True function</span>
            <span><i style="background:var(--accent);opacity:.45"></i>Fits to 30 samples</span>
            <span><i style="background:var(--warm)"></i>Average fit (over 200 samples)</span>
            <span><i style="background:var(--ink)"></i>One sample's points</span>
          </div>
        </figure>
        <figure class="plot short">
          <canvas id="bvd" aria-label="Bias squared, variance and total error by polynomial degree"></canvas>
          <div class="legend">
            <span><i style="background:var(--warm)"></i>Bias²</span>
            <span><i style="background:var(--accent)"></i>Variance</span>
            <span><i style="background:var(--ink)"></i>Expected test error</span>
            <span><i style="background:var(--muted)"></i>Noise floor σ²</span>
          </div>
          <figcaption>Log scale. The dot marks the degree you picked. At very high degrees the bias line gets jumpy: a few wild fits drag the average around.</figcaption>
        </figure>`,
      panel: `
        <div class="ctrl">
          <label for="deg">Polynomial degree <output id="degV"></output></label>
          <input type="range" id="deg" min="0" max="12" step="1" value="3">
        </div>
        <div class="ctrl">
          <label for="n">Points per sample <output id="nV"></output></label>
          <input type="range" id="n" min="8" max="80" step="1" value="20">
        </div>
        <div class="ctrl">
          <label for="sig">Noise σ <output id="sigV"></output></label>
          <input type="range" id="sig" min="0.05" max="0.8" step="0.05" value="0.3">
        </div>
        <div class="readouts">
          <div class="ro"><b><span class="sw" style="background:var(--warm)"></span>Bias²</b><span class="num" id="b2"></span></div>
          <div class="ro"><b><span class="sw" style="background:var(--accent)"></span>Variance</b><span class="num" id="var"></span></div>
          <div class="ro"><b><span class="sw" style="background:var(--muted)"></span>Noise σ²</b><span class="num" id="s2"></span></div>
          <div class="ro"><b>Expected test error</b><span class="num" id="tot"></span></div>
          <div class="ro"><b>Verdict</b><span id="verdict"></span></div>
        </div>
        <div class="meter" aria-hidden="true"><div id="mb" style="background:var(--warm)"></div><div id="mv" style="background:var(--accent)"></div><div id="ms" style="background:var(--muted)"></div></div>
        <label class="check"><input type="checkbox" id="showAll" checked> Show all 30 fits</label>
        <div class="btns"><button class="btn primary" id="resample" type="button">Draw 30 new samples</button></div>`,
      notes: `
        <section>
          <h2>What you're seeing</h2>
          <p>The thin teal curves are the same kind of model fitted to 30 independent training sets from the same process. The orange curve is the average fit across 200 such training sets (30 are drawn so the picture stays readable).</p>
          <p><b>Bias</b> is the gap between the average fit and the truth. <b>Variance</b> is how much the fits spread around their own average. Neither can be seen from a single dataset, which is why this picture needs many samples.</p>
          <div class="eq">E[(y − f̂(x))²] = Bias[f̂(x)]² + Var[f̂(x)] + σ²</div>
          <p>The last term is noise in the data itself. No model can get below it.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Degree 0 or 1: the fits are nearly identical and consistently wrong. That is high bias.</li>
            <li>Degree 10 to 12 with 20 points: the average looks fine but single fits flail at the edges. That is high variance.</li>
            <li>Keep degree 10 and raise the points per sample to 80. Variance collapses. More data tames flexible models.</li>
            <li>Raise the noise. The best degree shifts lower, because simpler models are less fooled by noise.</li>
          </ol>
        </section>
        <section>
          <h2>Why it matters</h2>
          <ul>
            <li>Underfitting is high bias; overfitting is high variance. Cross-validation estimates the U-shaped total error from one dataset.</li>
            <li>Regularization (ridge, lasso, pruning a tree, early stopping) adds a little bias to remove a lot of variance.</li>
            <li>Bagging and random forests average many high-variance models, exactly like the orange curve here.</li>
          </ul>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const top = new Plot($("#bvc"), { x: [0, 1], y: [-2, 2] });
    const curve = new Plot($("#bvd"), { x: [0, 12], y: [-3.2, 1.2], pad: { b: 30, t: 10 } });
    const truth = (x) => Math.sin(2 * Math.PI * x) + 0.4 * x;
    const K = 30, KS = 200, G = 81, MAXD = 12; // draw 30 fits, estimate bias/variance from 200
    const grid = Array.from({ length: G }, (_, i) => i / (G - 1));
    let seed = 11, sets = [], stats = [], preds = [];

    // Chebyshev features on [-1,1] keep the normal equations well conditioned.
    function feats(x, d) {
      const t = 2 * x - 1, f = [1];
      if (d >= 1) f.push(t);
      for (let k = 2; k <= d; k++) f.push(2 * t * f[k - 1] - f[k - 2]);
      return f;
    }
    function fit(pts, d) {
      const m = d + 1, A = Array.from({ length: m }, () => new Array(m).fill(0)), y = new Array(m).fill(0);
      for (const p of pts) {
        const f = feats(p.x, d);
        for (let i = 0; i < m; i++) { y[i] += f[i] * p.y; for (let j = 0; j < m; j++) A[i][j] += f[i] * f[j]; }
      }
      for (let i = 0; i < m; i++) A[i][i] += 1e-3; // a whisper of ridge keeps very high degrees from exploding
      const w = solve(A, y);
      return (x) => feats(x, d).reduce((s, v, i) => s + v * w[i], 0);
    }

    function sample() {
      const n = +$("#n").value, sig = +$("#sig").value, r = rng(seed);
      sets = [];
      for (let k = 0; k < KS; k++) {
        const pts = [];
        for (let i = 0; i < n; i++) { const x = r(); pts.push({ x, y: truth(x) + r.normal() * sig }); }
        sets.push(pts);
      }
      stats = []; preds = [];
      for (let d = 0; d <= MAXD; d++) {
        const P = sets.map((pts) => { const f = fit(pts, d); return grid.map(f); });
        let b2 = 0, v = 0;
        for (let j = 0; j < G; j++) {
          let m = 0; for (let k = 0; k < KS; k++) m += P[k][j]; m /= KS;
          let s = 0; for (let k = 0; k < KS; k++) s += (P[k][j] - m) ** 2;
          b2 += (m - truth(grid[j])) ** 2; v += s / KS;
        }
        stats.push({ b2: b2 / G, v: v / G });
        preds.push(P);
      }
    }

    function draw() {
      const d = +$("#deg").value, sig = +$("#sig").value, s2 = sig * sig;
      $("#degV").textContent = d; $("#nV").textContent = $("#n").value; $("#sigV").textContent = sig.toFixed(2);
      const P = preds[d].slice(0, K);
      top.clear();
      top.axes({ xLabel: "x", yLabel: "y" });
      if ($("#showAll").checked) for (const row of P) top.path(grid, row, css("--accent"), 1.2, null, 0.35);
      const avg = grid.map((_, j) => preds[d].reduce((s, row) => s + row[j], 0) / KS);
      top.fn(truth, css("--violet"), 2.5, [6, 5]);
      top.path(grid, avg, css("--warm"), 3);
      top.clip(() => { for (const p of sets[0]) top.dot(p.x, p.y, 3.2, css("--ink")); });
      top.path(grid, P[0], css("--ink"), 1.5, [2, 3], 0.8);

      const L = (v) => Math.log10(Math.max(v, 1e-6));
      const ds = stats.map((_, i) => i);
      curve.clear();
      curve.axes({ xLabel: "degree", yTicks: [-3, -2, -1, 0, 1], yFormat: (v) => (v >= 0 ? String(10 ** v) : "10" + ["⁻³", "⁻²", "⁻¹"][v + 3]), xTicks: ds });
      curve.path(ds, ds.map(() => L(s2)), css("--muted"), 1.5, [4, 4]);
      curve.path(ds, stats.map((s) => L(s.b2)), css("--warm"), 2);
      curve.path(ds, stats.map((s) => L(s.v)), css("--accent"), 2);
      curve.path(ds, stats.map((s) => L(s.b2 + s.v + s2)), css("--ink"), 2.5);
      const st = stats[d], tot = st.b2 + st.v + s2;
      curve.dot(d, Math.min(1.2, L(tot)), 5, css("--ink"), css("--surface"));

      $("#b2").textContent = fmt(st.b2, 3); $("#var").textContent = fmt(st.v, 3);
      $("#s2").textContent = fmt(s2, 3); $("#tot").textContent = fmt(tot, 3);
      const best = stats.reduce((bi, s, i) => (s.b2 + s.v < stats[bi].b2 + stats[bi].v ? i : bi), 0);
      const v = d === best ? ["ok", "Best degree here"] : st.b2 > st.v ? ["warn", "Underfitting"] : ["bad", "Overfitting"];
      $("#verdict").innerHTML = `<span class="pill ${v[0]}">${v[1]}</span>`;
      $("#mb").style.width = (st.b2 / tot) * 100 + "%";
      $("#mv").style.width = (st.v / tot) * 100 + "%";
      $("#ms").style.width = (s2 / tot) * 100 + "%";
    }

    $("#deg").addEventListener("input", draw);
    $("#showAll").addEventListener("input", draw);
    ["#n", "#sig"].forEach((s) => $(s).addEventListener("input", () => { sample(); draw(); }));
    $("#resample").addEventListener("click", () => { seed++; sample(); draw(); });

    sample(); draw();
    return watch([top.c, curve.c], (resized) => { if (resized) { top.resize(); curve.resize(); } draw(); });
  },
});
