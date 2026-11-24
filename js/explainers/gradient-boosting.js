Lab.register({
  id: "gradient-boosting",
  group: "Machine learning",
  title: "Gradient-boosted trees, one tree at a time",
  blurb: "Boosting builds a model from hundreds of tiny trees. Each new tree looks only at what the model so far got wrong, and nudges the prediction a little way towards fixing it. Step through it tree by tree.",
  lede: "A random forest grows many deep trees independently and averages them. Gradient boosting does the opposite: it grows small trees one after another, and each tree is fitted to the residuals, the errors the model still makes. Its prediction is added in, shrunk by a learning rate so no single tree dominates. After a few hundred steps the sum of these crude step functions traces a smooth, accurate curve. This is the engine inside XGBoost and LightGBM, the methods that win most competitions on tabular data and the M5 forecasting competition.",
  quiz: [
    ["What exactly does tree number 5 try to predict?", "The residuals left after the first 4 trees: actual − (starting value + lr × tree 1 + … + lr × tree 4). For squared error, those residuals are the negative gradient of the loss, hence 'gradient' boosting."],
    ["Why multiply each tree by a small learning rate instead of adding it in full?", "Taking small steps means many trees share the work, which averages out each tree's noise. A learning rate of 0.1 with 300 trees usually beats 1.0 with 30 trees on fresh data."],
    ["Training error keeps falling as you add trees. Why not just use 5,000?", "Eventually the trees start fitting noise and error on fresh data rises again. Pick the number of trees with a validation set or cross-validation (early stopping)."],
    ["Why use very shallow trees (depth 1–6)?", "Each tree only needs to capture a little of what's left. Depth limits how many drivers can interact within one tree: depth 1 (stumps) gives an additive model, depth 3 allows three-way interactions."],
    ["How does boosting differ from a random forest?", "A forest fits deep trees independently to bootstrap samples and averages them, which mainly reduces variance. Boosting fits shallow trees in sequence to the remaining errors, which mainly reduces bias. Boosting is usually more accurate but needs more tuning."],
  ],
  diy: {
    intro: "One driver x in A2:A101 and sales y in B2:B101. A boosted model is just repeated 'fit a stump to the residuals'. Learning rate in H1 (e.g. 0.3).",
    steps: [
      ["Starting prediction: the average.", "C2: =AVERAGE($B$2:$B$101)"],
      ["Residuals.", "D2: =B2-C2"],
      ["Try a split point s (in G2): average residual on each side.", "left: =AVERAGEIF($A$2:$A$101,\"<=\"&G2,$D$2:$D$101)   right: =AVERAGEIF($A$2:$A$101,\">\"&G2,$D$2:$D$101)"],
      ["Score the split: squared error left after it (try several s and keep the lowest; a Data Table over s does this).", "=SUMPRODUCT((D2:D101-IF(A2:A101<=G2,left,right))^2)"],
      ["Update the prediction with the best stump, shrunk by the learning rate.", "E2: =C2+$H$1*IF(A2<=$G$2,left,right)"],
      ["New residuals = B − E. Repeat steps 3–5 on them for the next tree. Real tools (XGBoost, LightGBM, scikit-learn) do hundreds of rounds in milliseconds.", "F2: =B2-E2"],
    ],
  },
  deeper: [
    ["Friedman (2001), Greedy function approximation: a gradient boosting machine, Annals of Statistics 29(5)", "https://doi.org/10.1214/aos/1013203451", "the original gradient boosting paper"],
    ["Chen & Guestrin (2016), XGBoost: a scalable tree boosting system, KDD", "https://doi.org/10.1145/2939672.2939785", "the library that made boosting famous"],
    ["James, Witten, Hastie & Tibshirani, An Introduction to Statistical Learning, §8.2 (free PDF)", "https://www.statlearning.com/", "bagging, random forests and boosting side by side"],
    ["Natekin & Knoll (2013), Gradient boosting machines, a tutorial, Frontiers in Neurorobotics 7", "https://doi.org/10.3389/fnbot.2013.00021", "a readable tutorial with worked examples"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 50 H30 V38 H54 V24 H90" stroke-opacity=".45"/><path d="M6 54 H20 V46 H34 V40 H46 V30 H60 V22 H74 V14 H90" stroke-opacity=".7"/><path d="M6 56 C 30 50, 50 30, 90 12" stroke-width="2.5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const MAXT = 300, NTEST = 400, X0 = 0, X1 = 35;
    const truth = (x) => 40 + 35 / (1 + Math.exp(-(x - 20) / 2.5)) + 6 * Math.sin(x / 2.2);
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const key = (c, t, dash) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><svg width="20" height="8"><path d="M1 4 H19" stroke="${c}" stroke-width="2.5" ${dash ? 'stroke-dasharray="4 3"' : ""}/></svg>${t}</span>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0"><div style="padding:4px 6px 0">${h4("The model after this many trees")}</div><canvas id="g1" aria-label="Data and boosted model prediction"></canvas><div id="g1Key" style="padding:0 8px;font-size:.82rem;color:var(--muted)"></div><figcaption id="g1Cap"></figcaption></figure>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("What the next tree is fitted to")}</div><canvas id="g2" aria-label="Residuals and the next tree fitted to them"></canvas><figcaption id="g2Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Error as trees are added")}</div><canvas id="g3" aria-label="Training and test error against number of trees"></canvas><figcaption id="g3Cap"></figcaption></figure>`)}
        <div class="plot" style="padding:14px">${h4("Worked out: the prediction at one temperature")}<div id="work" style="font:.8rem/1.8 var(--font-mono);overflow-x:auto"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Daily ice-cream sales against temperature. One driver, so you can see every tree.</p>
        <div class="ctrl"><label for="m">Trees added so far <output id="mV"></output></label><input type="range" id="m" min="0" max="${MAXT}" step="1" value="3"></div>
        <div class="ctrl"><label for="lr">Learning rate <output id="lrV"></output></label><input type="range" id="lr" min="0.05" max="1" step="0.05" value="0.3"></div>
        <div class="ctrl"><label for="dp">Tree depth <output id="dpV"></output></label><input type="range" id="dp" min="1" max="4" step="1" value="1"></div>
        <div class="ctrl"><label for="n">Training days <output id="nV"></output></label><input type="range" id="n" min="30" max="300" step="10" value="80"></div>
        <div class="ctrl"><label for="noise">Noise <output id="noiseV"></output></label><input type="range" id="noise" min="1" max="15" step="1" value="6"></div>
        <div class="ctrl"><label for="xq">Temperature for the worked example <output id="xqV"></output></label><input type="range" id="xq" min="0" max="35" step="0.5" value="24"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="step" type="button">Add one tree</button><button class="btn" id="best" type="button">Stop at the best number</button><button class="btn" id="resim" type="button">New data</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The algorithm</h2>
          <div class="eq">F₀(x) = average of y<br>for m = 1, 2, …: &nbsp; rᵢ = yᵢ − Fₘ₋₁(xᵢ) &nbsp; (residuals)<br>&nbsp;&nbsp; fit a small tree hₘ to the residuals<br>&nbsp;&nbsp; Fₘ(x) = Fₘ₋₁(x) + learning rate × hₘ(x)</div>
          <p>Each tree is a step function: a few splits on x, and in each region the average residual. Because the residuals shrink as the model improves, later trees make smaller and smaller corrections.</p>
        </section>
        <section>
          <h2>Why "gradient"?</h2>
          <p>For squared error, the residual y − F is (minus) the gradient of the loss with respect to the prediction. So each tree takes a step downhill, like <a href="#gradient-descent">gradient descent</a>, but in the space of functions. Swap in another loss (absolute error, pinball loss for quantiles, Poisson for counts) and you fit trees to that loss's gradient instead. LightGBM's quantile and Tweedie options for demand forecasting work this way.</p>
        </section>
        <section>
          <h2>The settings that matter</h2>
          <ul>
            <li><b>Number of trees and learning rate</b> work together: halve the rate, roughly double the trees. Choose the number by watching error on held-out data.</li>
            <li><b>Depth</b> sets how much interaction each tree can capture. 3–8 is typical for real data with many drivers.</li>
            <li><b>Minimum leaf size, subsampling rows and columns</b> add randomness and stop trees chasing single points.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Start at 0 trees (a flat line at the average) and press "Add one tree" a few times. Watch the residuals chart: each tree goes after the biggest remaining errors.</li>
            <li>Slide to 300 trees with learning rate 1 and depth 4: training error keeps falling, test error rises. Press "Stop at the best number".</li>
            <li>Set the learning rate to 0.05: the curve builds slowly but ends up smoother.</li>
            <li>Compare depth 1 (stumps) with depth 3 at 10 trees.</li>
          </ol>
          <p>Related: <a href="#random-forest">decision trees and random forests</a>, <a href="#global-forecasting">global ML forecasting</a>, <a href="#shap">SHAP explanations</a>, <a href="#bias-variance">bias and variance</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let seed = 8, D = null, M = null;
    function genData() {
      const n = +$("#n").value, sd = +$("#noise").value, r = rng(seed * 17 + 5), rt = rng(4242);
      const mk = (k, g) => { const xs = [], ys = []; for (let i = 0; i < k; i++) { const x = X0 + (X1 - X0) * g(); xs.push(x); ys.push(truth(x) + sd * g.normal()); } return { xs, ys }; };
      D = { tr: mk(n, r), te: mk(NTEST, rt), sd };
    }
    function fit() {
      const lr = +$("#lr").value, dp = +$("#dp").value, X = D.tr.xs.map((x) => [x]);
      const trE = [], teE = [];
      const ptr = new Float64Array(D.tr.xs.length), pte = new Float64Array(NTEST);
      const m = Lab.gbm.fit(X, D.tr.ys, { trees: MAXT, depth: dp, lr, minLeaf: 4, bins: 40 });
      ptr.fill(m.base); pte.fill(m.base);
      const mse = (p, ys) => ys.reduce((a, y, i) => a + (y - p[i]) ** 2, 0) / ys.length;
      trE.push(mse(ptr, D.tr.ys)); teE.push(mse(pte, D.te.ys));
      for (let t = 0; t < MAXT; t++) { D.tr.xs.forEach((x, i) => (ptr[i] += m.walk(m.trees[t], [x]))); D.te.xs.forEach((x, i) => (pte[i] += m.walk(m.trees[t], [x]))); trE.push(mse(ptr, D.tr.ys)); teE.push(mse(pte, D.te.ys)); }
      const best = teE.indexOf(Math.min(...teE));
      M = { m, trE, teE, best, lr, dp };
    }
    const pg = (x, k) => M.m.predict([x], k);
    const p1 = new Plot($("#g1"), { x: [X0, X1], pad: { l: 46, b: 38 } }), p2 = new Plot($("#g2"), { x: [X0, X1], pad: { l: 46, b: 38 } }), p3 = new Plot($("#g3"), { x: [0, MAXT], pad: { l: 50, b: 38 } });
    const grid = Array.from({ length: 351 }, (_, i) => X0 + ((X1 - X0) * i) / 350);
    function d1() {
      const k = +$("#m").value, ys = D.tr.ys;
      p1.resize(); p1.y = [Math.min(...ys) - 4, Math.max(...ys) + 4]; p1.clear();
      p1.axes({ xLabel: "temperature (°C)", yLabel: "sales", yFormat: (v) => fmt(v, 0) });
      D.tr.xs.forEach((x, i) => p1.dot(x, ys[i], 3, css("--muted")));
      p1.fn(truth, css("--good"), 1.5, [5, 4]);
      if (k > 0) p1.path(grid, grid.map((x) => pg(x, k - 1)), css("--violet"), 1.5, null, 0.5);
      p1.path(grid, grid.map((x) => pg(x, k)), css("--accent"), 2.8);
      const xq = +$("#xq").value; p1.path([xq, xq], p1.y, css("--warm"), 1, [3, 3]);
      $("#g1Key").innerHTML = key(css("--accent"), `model after ${k} tree${k === 1 ? "" : "s"}`) + (k > 0 ? key(css("--violet"), "one tree earlier") : "") + key(css("--good"), "true curve", 1);
      $("#g1Cap").innerHTML = k === 0 ? `With no trees the model predicts the average, <b>${fmt(M.m.base, 1)}</b>, everywhere.` : `${k} trees of depth ${M.dp}, each shrunk by ${M.lr}. Training error (MSE) <b>${fmt(M.trE[k], 1)}</b>, test error <b>${fmt(M.teE[k], 1)}</b> (noise alone gives ${fmt(D.sd * D.sd, 1)}).`;
    }
    function d2() {
      const k = +$("#m").value, res = D.tr.xs.map((x, i) => D.tr.ys[i] - pg(x, k)), lim = Math.max(8, ...res.map(Math.abs)) * 1.1;
      p2.resize(); p2.y = [-lim, lim]; p2.clear();
      p2.axes({ xLabel: "temperature (°C)", yLabel: "residual = actual − model", yFormat: (v) => fmt(v, 0) });
      p2.path([X0, X1], [0, 0], css("--ink"), 1);
      D.tr.xs.forEach((x, i) => p2.dot(x, res[i], 3, css("--muted")));
      if (k < MAXT) { const t = M.m.trees[k], lr = M.lr; p2.path(grid, grid.map((x) => M.m.walk(t, [x]) / lr), css("--warm"), 2.5); p2.path(grid, grid.map((x) => M.m.walk(t, [x])), css("--warm"), 1.5, [4, 3]); }
      const splits = []; (function walk(n) { if (n.left) { splits.push(n.t); walk(n.left); walk(n.right); } })(M.m.trees[Math.min(k, MAXT - 1)]);
      const rss = res.reduce((a, v) => a + v * v, 0);
      $("#g2Cap").innerHTML = `Grey: what the model still gets wrong after ${k} trees (sum of squares ${fmt(rss, 0)}). Orange: tree ${k + 1}, fitted to these residuals, splitting at ${splits.sort((a, b) => a - b).map((s) => fmt(s, 1) + "°").join(", ") || "no useful point"}. Dashed: the same tree × learning rate ${M.lr}, which is what actually gets added.`;
    }
    function d3() {
      const k = +$("#m").value, top = Math.min(Math.max(M.teE[0], M.trE[0]), Math.max(M.teE[M.best] * 2.5, D.sd * D.sd * 2.5)) * 1.05, cl = (a) => a.map((v) => Math.min(v, top)), ks = M.trE.map((_, i) => i);
      p3.resize(); p3.y = [0, top]; p3.clear();
      p3.axes({ xLabel: "number of trees", yLabel: "mean squared error", yFormat: (v) => fmt(v, 0) });
      p3.path([0, MAXT], [D.sd * D.sd, D.sd * D.sd], css("--good"), 1.2, [4, 3]);
      p3.path(ks, cl(M.trE), css("--muted"), 2); p3.path(ks, cl(M.teE), css("--warm"), 2.5);
      p3.dot(M.best, M.teE[M.best], 6, null, css("--warm"));
      p3.path([k, k], [0, top], css("--ink"), 1.2, [4, 3]);
      $("#g3Cap").innerHTML = `Grey: training error. Orange: error on ${NTEST} fresh days. Best test error at <b>${M.best} trees</b> (${fmt(M.teE[M.best], 1)}). Green dashed: the noise floor. The first few trees cut error from ${fmt(M.teE[0], 0)}, off the top of the chart. ${M.teE[MAXT] > M.teE[M.best] * 1.1 ? `By ${MAXT} trees test error has crept back up to ${fmt(M.teE[MAXT], 1)}: overfitting.` : ""}`;
    }
    function work() {
      const k = +$("#m").value, xq = +$("#xq").value, b = (t) => `<b style="color:var(--ink)">${t}</b>`, show = Math.min(k, 5), parts = [];
      for (let t = 0; t < show; t++) parts.push(M.m.walk(M.m.trees[t], [xq]));
      const lines = [`start: average of all ${D.tr.xs.length} training days = ${fmt(M.m.base, 2)}`];
      parts.forEach((v, t) => { const node = (function find(n) { while (n.left) n = xq <= n.t ? n.left : n.right; return n; })(M.m.trees[t]); lines.push(`tree ${t + 1}: ${xq}° falls in a leaf with average residual ${fmt(v / M.lr, 2)} (${node.n} days) → adds ${M.lr} × ${fmt(v / M.lr, 2)} = ${v >= 0 ? "+" : ""}${fmt(v, 2)}`); });
      if (k > show) { const rest = pg(xq, k) - pg(xq, show); lines.push(`trees ${show + 1}–${k} together add ${rest >= 0 ? "+" : ""}${fmt(rest, 2)}`); }
      lines.push(`prediction at ${xq}° = ${b(fmt(pg(xq, k), 2))}; true average sales there = ${fmt(truth(xq), 2)}`);
      $("#work").innerHTML = lines.map((l) => `<div style="margin-bottom:2px">${l}</div>`).join("");
    }
    function readouts() {
      const k = +$("#m").value;
      $("#ro").innerHTML = `<div class="ro"><b>Training error</b><span class="num">${fmt(M.trE[k], 1)}</span></div>
        <div class="ro"><b>Test error</b><span class="num">${fmt(M.teE[k], 1)}</span></div>
        <div class="ro"><b>Best number of trees</b><span class="num">${M.best}</span></div>
        <div class="ro"><b>Overfitting?</b><span class="pill ${k > M.best && M.teE[k] > M.teE[M.best] * 1.05 ? "warn" : k < M.best && M.teE[k] > M.teE[M.best] * 1.05 ? "idle" : "ok"}">${k > M.best && M.teE[k] > M.teE[M.best] * 1.05 ? "too many trees" : k < M.best && M.teE[k] > M.teE[M.best] * 1.05 ? "still underfitting" : "about right"}</span></div>`;
    }
    function labels() { $("#mV").textContent = $("#m").value; $("#lrV").textContent = fmt(+$("#lr").value, 2); $("#dpV").textContent = $("#dp").value; $("#nV").textContent = $("#n").value; $("#noiseV").textContent = "SD " + $("#noise").value; $("#xqV").textContent = $("#xq").value + "°C"; }
    function render() { labels(); d1(); d2(); d3(); work(); readouts(); }
    function refit() { labels(); fit(); render(); }
    function full() { genData(); refit(); }
    ["#m", "#xq"].forEach((s) => $(s).addEventListener("input", render));
    ["#lr", "#dp"].forEach((s) => $(s).addEventListener("input", refit));
    ["#n", "#noise"].forEach((s) => $(s).addEventListener("input", full));
    $("#step").addEventListener("click", () => { $("#m").value = Math.min(MAXT, +$("#m").value + 1); render(); });
    $("#best").addEventListener("click", () => { $("#m").value = M.best; render(); });
    $("#resim").addEventListener("click", () => { seed++; full(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 8; full(); });
    full();
    return watch([$("#g1"), $("#g2"), $("#g3")], () => { d1(); d2(); d3(); });
  },
});
