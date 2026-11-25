Lab.register({
  id: "hyperparameter-tuning",
  group: "Machine learning",
  title: "Tuning a model and reading what it learned",
  blurb: "Tune a gradient-boosting demand model: tree depth, learning rate, number of trees. Compare grid search with random search, stop early, and then open the black box with partial-dependence plots.",
  lede: "Most models have settings you choose before training: how deep the trees go, how big each learning step is, how many trees to add. These hyperparameters can matter as much as the choice of model. You tune them by trying combinations and scoring each on validation data the model never trained on, then confirm once on a separate test set. Afterwards, partial-dependence plots show what the tuned model actually learned about each driver.",
  quiz: [
    ["Why keep three sets of data: training, validation and test?", "Training fits the model; validation chooses the hyperparameters; test gives an honest final score. If you choose settings by test score, the test set has been used for fitting too and its score is optimistic."],
    ["Why does random search often beat grid search with the same budget?", "Usually only one or two hyperparameters really matter. A grid wastes runs repeating the same few values of the important one; random search tries a new value of every setting on every run."],
    ["What is early stopping?", "Add trees (or training rounds) one at a time and track validation error; stop when it stops improving. It sets the number of trees automatically and prevents overfitting."],
    ["Learning rate 0.3 vs 0.03: what's the trade-off?", "Small steps need many more trees but usually reach a slightly better, smoother model. Large steps fit quickly and overfit sooner."],
    ["A partial-dependence plot of price is flat above $12. Does price not matter there?", "It means that, averaged over the other drivers, the model's prediction doesn't change with price there. Either demand really is insensitive, or the model had too little data in that range. ICE lines show whether some rows react while others don't."],
  ],
  diy: {
    intro: "Excel can't train boosted trees, but it can run the tuning logic around any model, and compute partial dependence from a model's predictions.",
    steps: [
      ["Split rows randomly: 60% train, 20% validation, 20% test.", "=IF(RAND()<0.6,\"train\",IF(RAND()<0.5,\"valid\",\"test\"))   (then paste as values so it doesn't change)"],
      ["Random search: draw a learning rate between 0.01 and 0.5 on a log scale.", "=10^(LOG10(0.01)+RAND()*(LOG10(0.5)-LOG10(0.01)))"],
      ["Random depth from 1 to 6, and number of trees from 20 to 400.", "=RANDBETWEEN(1,6)   =RANDBETWEEN(20,400)"],
      ["Validation error of each run (actual in B, prediction in C, validation rows only).", "=AVERAGEIFS(ABS(B2:B1001-C2:C1001), D2:D1001, \"valid\")   (array formula)"],
      ["Pick the best run.", "=INDEX(run_ids, MATCH(MIN(val_errors), val_errors, 0))"],
      ["Partial dependence at price p: set every row's price to p, predict, and average.", "=AVERAGE(predictions with price column overwritten by p)   repeat for a range of p"],
    ],
  },
  deeper: [
    ["Bergstra & Bengio (2012), Random search for hyper-parameter optimization, JMLR 13", "https://jmlr.org/papers/v13/bergstra12a.html", "why random beats grid"],
    ["Friedman (2001), Greedy function approximation: a gradient boosting machine, Annals of Statistics 29(5)", "https://doi.org/10.1214/aos/1013203451", "introduced partial-dependence plots"],
    ["Goldstein, Kapelner, Bleich & Pitkin (2015), Peeking inside the black box: visualizing statistical learning with plots of individual conditional expectation, JCGS 24(1)", "https://doi.org/10.1080/10618600.2014.907095", "ICE plots"],
    ["Snoek, Larochelle & Adams (2012), Practical Bayesian optimization of machine learning algorithms, NeurIPS", "https://arxiv.org/abs/1206.2944", "smarter search than random"],
    ["Molnar, Interpretable Machine Learning, chapter on partial dependence (free online book)", "https://christophm.github.io/interpretable-ml-book/pdp.html", "PDP pros and cons"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g stroke-opacity=".5"><rect x="6" y="6" width="12" height="12"/><rect x="18" y="6" width="12" height="12"/><rect x="30" y="6" width="12" height="12"/><rect x="6" y="18" width="12" height="12"/><rect x="18" y="18" width="12" height="12" fill="currentColor"/><rect x="30" y="18" width="12" height="12"/><rect x="6" y="30" width="12" height="12"/><rect x="18" y="30" width="12" height="12"/><rect x="30" y="30" width="12" height="12"/></g><path d="M52 52 C62 52 66 20 76 18 C82 17 86 18 90 18"/><path d="M52 58 H92 M52 58 V10" stroke-opacity=".5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);
    const FN = ["price ($)", "temperature (°C)", "promotion", "display"], DEP = [1, 2, 3, 4, 5, 6], LRS = [0.01, 0.03, 0.1, 0.3], MAXT = 300;
    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Search map: validation error by depth and learning rate")}</div><canvas id="h1" style="height:300px;cursor:pointer" aria-label="Grid of validation errors with random search points"></canvas><figcaption id="h1Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Error as trees are added (early stopping)")}</div><canvas id="h2" style="height:300px" aria-label="Training and validation error against number of trees"></canvas><figcaption id="h2Cap"></figcaption></figure>`)}
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Partial dependence: what the model learned")}</div><canvas id="h3" style="height:300px" aria-label="Partial dependence and ICE lines for one driver"></canvas><figcaption id="h3Cap"></figcaption></figure>`,
          `<div class="plot" style="padding:14px">${h4("Worked out")}<div id="work" style="font:.78rem/1.8 var(--font-mono);overflow-x:auto"></div></div>`)}`,
      panel: `
        <p class="hint" style="margin:0">Weekly units for 550 store-weeks, from price, temperature, promotion and display (promotions work much better with a display). 300 rows train, 150 validate, 100 are held back for the final test.</p>
        <div class="ctrl"><label for="dp">Tree depth <output id="dpV"></output></label><input type="range" id="dp" min="1" max="6" step="1" value="3"></div>
        <div class="ctrl"><label for="lr">Learning rate <output id="lrV"></output></label><input type="range" id="lr" min="0" max="3" step="1" value="2"></div>
        <div class="ctrl"><label for="nt">Number of trees <output id="ntV"></output></label><input type="range" id="nt" min="10" max="${MAXT}" step="10" value="250"></div>
        <div class="ctrl"><label for="bud">Search budget (runs) <output id="budV"></output></label><input type="range" id="bud" min="4" max="24" step="1" value="8"></div>
        <div class="ctrl"><label>Partial dependence of</label><div class="seg" id="pf" style="display:flex;flex-wrap:wrap">${FN.map((f, i) => `<button type="button" data-v="${i}" aria-pressed="${i === 0}">${f.split(" (")[0]}</button>`).join("")}</div></div>
        <label class="check"><input type="checkbox" id="ice" checked> Show ICE lines (one per store-week)</label>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn primary" id="early" type="button">Stop early (best tree count)</button><button class="btn" id="gbest" type="button">Use the grid's best</button><button class="btn" id="rbest" type="button">Use random search's best</button><button class="btn" id="resim" type="button">New data</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The main settings of gradient boosting</h2>
          <ul>
            <li><b>Depth</b>: how many questions each tree may ask. Depth 1 can't capture interactions (promo × display); deep trees overfit.</li>
            <li><b>Learning rate</b>: how much of each tree's correction is kept. Smaller is steadier but needs more trees.</li>
            <li><b>Number of trees</b>: set by early stopping on validation error.</li>
            <li>Others in real libraries: minimum rows per leaf, row and column subsampling, L1/L2 penalties.</li>
          </ul>
          <p>See <a href="#gradient-boosting">gradient boosting, step by step</a> for how the trees are built.</p>
        </section>
        <section>
          <h2>Search strategies</h2>
          <p><b>Grid search</b> tries every combination of a few values each; easy to read but its cost multiplies with every extra setting. <b>Random search</b> samples settings at random (learning rates on a log scale) and, for the same budget, explores more distinct values of each setting. <b>Bayesian optimisation</b> (Optuna, Hyperopt) uses earlier results to pick promising next settings. For small data, use <a href="#cross-validation">k-fold cross-validation</a> instead of one validation split.</p>
        </section>
        <section>
          <h2>Partial dependence and ICE</h2>
          <p>To get the partial dependence on price at $9: take every row, set its price to $9 (leave everything else), predict, and average. Repeat for a range of prices. Each thin line (ICE) is one row's predictions as its price varies; the thick line is their average. Lines that fan out mean the effect depends on other drivers, an interaction. For contributions to one prediction see <a href="#shap">SHAP values</a>.</p>
          <p>Caution: partial dependence imagines combinations that may never occur (a $14 price during a promotion), so read it where you have data.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Set depth 6, learning rate 0.3: validation error rises after a few dozen trees. Press “Stop early”.</li>
            <li>Depth 1: the display ICE lines for promo and non-promo rows are parallel; the model can't learn that displays matter more with a promotion.</li>
            <li>Compare the grid's best with random search's best at a budget of 8 runs.</li>
          </ul>
        </section>`,
    });

    let seed = 8, tr = [], va = [], te = [], grid = [], rnd = [], cur = null, pf = 0;
    const truth = (x) => 160 * Math.pow(x[0] / 10, -1.6) * (1 + 0.5 / (1 + Math.exp(-(x[1] - 22) / 3))) * (1 + 0.35 * x[2] + 0.1 * x[3] + 0.6 * x[2] * x[3]);
    function gen() {
      const r = rng(seed), mk = (n) => Array.from({ length: n }, () => { const promo = r() < 0.3 ? 1 : 0, x = [promo ? 6 + 3 * r() : 8 + 6 * r(), 5 + 30 * r(), promo, r() < 0.35 ? 1 : 0]; return { x, y: truth(x) * (1 + 0.12 * r.normal()) }; });
      tr = mk(300); va = mk(150); te = mk(100);
    }
    function fitCurve(depth, lr, withTrain = true, T = MAXT) {
      const m = Lab.gbm.fit(tr.map((p) => p.x), tr.map((p) => p.y), { trees: T, depth, lr, minLeaf: 5, bins: 24 });
      const run = (D) => { const pr = D.map(() => m.base), out = []; for (let t = 0; t < T; t++) { let e = 0; D.forEach((p, i) => { pr[i] += m.walk(m.trees[t], p.x); e += Math.abs(p.y - pr[i]); }); out.push(e / D.length); } return out; };
      return { m, trC: withTrain ? run(tr) : null, vaC: run(va) };
    }
    const bestT = (c) => { let b = 0; c.vaC.forEach((v, i) => { if (v < c.vaC[b]) b = i; }); return b + 1; };
    function search() {
      grid = []; DEP.forEach((d) => LRS.forEach((l) => { const c = fitCurve(d, l, false), bt = bestT(c); grid.push({ d, l, err: c.vaC[bt - 1], t: bt }); }));
      const r = rng(seed * 3 + 1); rnd = [];
      for (let k = 0; k < 24; k++) { const d = 1 + Math.floor(r() * 6), l = 10 ** (-2 + r() * Math.log10(50)), t = 20 + Math.floor(r() * (MAXT - 20)), c = fitCurve(d, l, false, t); rnd.push({ d, l, t, err: c.vaC[t - 1] }); }
    }
    function refit() { const d = +$("#dp").value, l = LRS[+$("#lr").value]; cur = { d, l, ...fitCurve(d, l) }; }
    const P1 = new Plot($("#h1"), { x: [-2.15, -0.35], y: [0.4, 6.6], pad: { l: 46, b: 38 } }), P2 = new Plot($("#h2"), { x: [0, MAXT], pad: { l: 46, b: 38 } }), P3 = new Plot($("#h3"), { pad: { l: 46, b: 38 } });
    const errs = () => grid.map((g) => g.err).concat(rnd.map((r) => r.err));
    function col(e) { const E = errs(), lo = Math.min(...E), hi = Math.max(...E), t = Math.min(1, (e - lo) / (hi - lo || 1)); return t; }
    function d1() {
      P1.resize(); P1.clear(); P1.axes({ xLabel: "learning rate (log scale)", yLabel: "depth", xTicks: LRS.map(Math.log10), xFormat: (v) => fmt(10 ** v, 2), yTicks: DEP, yFormat: (v) => fmt(v, 0) });
      const g = P1.ctx, B = +$("#bud").value, gb = gridChoice();
      grid.forEach((c) => { const t = col(c.err), x0 = P1.sx(Math.log10(c.l) - 0.2), x1 = P1.sx(Math.log10(c.l) + 0.2), y0 = P1.sy(c.d + 0.42), y1 = P1.sy(c.d - 0.42), inB = gb.cells.includes(c);
        g.fillStyle = css(t < 0.5 ? "--good" : "--bad"); g.globalAlpha = (inB ? 0.15 : 0.05) + (inB ? 0.6 : 0.15) * Math.abs(t - 0.5) * 2; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.globalAlpha = 1;
        if (inB) { g.strokeStyle = css("--ink"); g.lineWidth = c === gb.best ? 2.5 : 0.8; g.strokeRect(x0, y0, x1 - x0, y1 - y0); }
        g.fillStyle = css("--ink"); g.font = "10px " + css("--font-mono"); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(fmt(c.err, 1), (x0 + x1) / 2, (y0 + y1) / 2); });
      rnd.slice(0, B).forEach((c, i) => { const best = c === randChoice(); P1.dot(Math.log10(c.l), c.d + (((i * 37) % 7) - 3) * 0.06, best ? 6 : 4, css("--violet"), best ? css("--ink") : css("--surface")); });
      const d = +$("#dp").value, l = LRS[+$("#lr").value]; g.strokeStyle = css("--warm"); g.lineWidth = 2.5; g.setLineDash([4, 3]); g.strokeRect(P1.sx(Math.log10(l) - 0.22), P1.sy(d + 0.46), P1.sx(Math.log10(l) + 0.22) - P1.sx(Math.log10(l) - 0.22), P1.sy(d - 0.46) - P1.sy(d + 0.46)); g.setLineDash([]);
      $("#h1Cap").innerHTML = `Each cell: validation error (mean absolute, units) with early stopping. Outlined: the ${gb.cells.length} cells a ${B}-run grid can afford (bold: its best, ${fmt(gb.best.err, 1)}). Purple: ${B} random-search runs, each with a random tree count too (black ring: best, ${fmt(randChoice().err, 1)}). Orange dashed: your current setting. Click a cell to use it.`;
    }
    function gridChoice() {
      const B = +$("#bud").value, [ds, ls] = B >= 24 ? [DEP, LRS] : B >= 18 ? [DEP, [0.03, 0.1, 0.3]] : B >= 12 ? [[1, 3, 5], LRS] : B >= 9 ? [[2, 4, 6], [0.01, 0.1, 0.3]] : B >= 6 ? [[2, 4, 6], [0.03, 0.3]] : [[2, 5], [0.03, 0.3]];
      const cells = grid.filter((c) => ds.includes(c.d) && ls.includes(c.l)); return { cells, best: cells.reduce((a, c) => (c.err < a.err ? c : a)) };
    }
    const randChoice = () => rnd.slice(0, +$("#bud").value).reduce((a, c) => (c.err < a.err ? c : a));
    function d2() {
      const nt = +$("#nt").value, all = cur.trC.concat(cur.vaC), bt = bestT(cur); P2.resize(); P2.y = [0, Math.min(Math.max(...all), cur.vaC[0] * 1.05)]; P2.clear();
      P2.axes({ xLabel: "number of trees", yLabel: "mean absolute error (units)", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0), xCount: 5 });
      const xs = cur.trC.map((_, i) => i + 1); P2.path(xs, cur.trC, css("--muted"), 2, [5, 4]); P2.path(xs, cur.vaC, css("--accent"), 2.5);
      P2.dot(bt, cur.vaC[bt - 1], 5, css("--good"), css("--surface")); P2.path([nt, nt], P2.y, css("--warm"), 1.5); P2.dot(nt, cur.vaC[nt - 1], 5, css("--warm"), css("--surface"));
      $("#h2Cap").innerHTML = `Dashed: error on the training rows, which keeps falling. Blue: validation error. Green: its lowest point, ${fmt(cur.vaC[bt - 1], 1)} at ${bt} trees${cur.vaC[MAXT - 1] > cur.vaC[bt - 1] * 1.03 ? "; after that the model starts to overfit" : ""}.`;
    }
    function d3() {
      const nt = +$("#nt").value, f = pf, lo = f === 0 ? 5.5 : f === 1 ? 5 : 0, hi = f === 0 ? 14 : f === 1 ? 35 : 1, grid = f >= 2 ? [0, 1] : Array.from({ length: 30 }, (_, i) => lo + ((hi - lo) * i) / 29), rows = va.slice(0, 60);
      const ice = rows.map((p) => grid.map((v) => { const x = p.x.slice(); x[f] = v; return cur.m.predict(x, nt); })), pd = grid.map((_, j) => ice.reduce((s, l) => s + l[j], 0) / ice.length);
      const tr0 = grid.map((v) => rows.reduce((s, p) => { const x = p.x.slice(); x[f] = v; return s + truth(x); }, 0) / rows.length), all = (($("#ice").checked ? ice.flat() : []).concat(pd, tr0));
      P3.resize(); P3.x = f >= 2 ? [-0.3, 1.3] : [lo, hi]; P3.y = [0, Math.max(...all) * 1.05]; P3.clear();
      P3.axes({ xLabel: FN[f], yLabel: "predicted units", xTicks: f >= 2 ? [0, 1] : undefined, xFormat: (v) => (f >= 2 ? (v ? "yes" : "no") : fmt(v, 0)), yFormat: (v) => fmt(v, 0), xCount: 5 });
      if ($("#ice").checked) ice.forEach((l, i) => P3.path(grid, l, css(rows[i].x[2] ? "--warm" : "--accent"), 1, null, 0.25));
      P3.path(grid, tr0, css("--good"), 2, [5, 4]); P3.path(grid, pd, css("--ink"), 3); if (f >= 2) grid.forEach((v, j) => P3.dot(v, pd[j], 5, css("--ink")));
      $("#h3Cap").innerHTML = `Black: partial dependence (average of the thin lines). Green dashed: the true average effect. ${$("#ice").checked ? "Thin lines: individual store-weeks, orange if on promotion. " : ""}${f === 3 ? "Displays should lift promo weeks (orange) far more than others; parallel lines mean the model missed that." : ""}`;
      return { grid, pd };
    }
    function work(pdRes) {
      const nt = +$("#nt").value, ve = cur.vaC[nt - 1], tst = te.reduce((s, p) => s + Math.abs(p.y - cur.m.predict(p.x, nt)), 0) / te.length, B = (t) => `<b style="color:var(--ink)">${t}</b>`, p0 = va[0];
      const L = [`Setting: depth ${cur.d}, learning rate ${cur.l}, ${nt} trees`,
        `Validation error = mean |actual − predicted| over 150 rows = ${B(fmt(ve, 2))}`,
        `Test error (100 untouched rows, look once) = ${B(fmt(tst, 2))}`,
        `Partial dependence at ${pf >= 2 ? (pdRes.grid[1] ? "yes" : "") : fmt(pdRes.grid[10], 2)}: set ${FN[pf].split(" (")[0]} to that value in all 60 rows, predict each, average = ${fmt(pdRes.pd[pf >= 2 ? 1 : 10], 1)}`,
        `e.g. row 1 (price ${fmt(p0.x[0], 2)}, ${fmt(p0.x[1], 0)}°C, promo ${p0.x[2]}, display ${p0.x[3]}): actual ${fmt(p0.y, 0)}, predicted ${fmt(cur.m.predict(p0.x, nt), 0)}`];
      $("#work").innerHTML = L.map((l) => `<div>${l}</div>`).join("");
      return { ve, tst };
    }
    function readouts(w) {
      const gb = gridChoice().best, rb = randChoice();
      $("#ro").innerHTML = [["Validation error", `<span class="num">${fmt(w.ve, 1)}</span>`], ["Test error", `<span class="pill ${w.tst <= Math.min(gb.err, rb.err) * 1.15 ? "ok" : w.tst <= Math.min(gb.err, rb.err) * 1.4 ? "warn" : "bad"}">${fmt(w.tst, 1)}</span>`], ["Grid's best (validation)", `<span class="num">${fmt(gb.err, 1)}</span>`], ["Random search's best", `<span class="num">${fmt(rb.err, 1)}</span>`]]
        .map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { $("#dpV").textContent = $("#dp").value; $("#lrV").textContent = LRS[+$("#lr").value]; $("#ntV").textContent = $("#nt").value; $("#budV").textContent = $("#bud").value; }
    function draw() { labels(); d1(); d2(); const pd = d3(); readouts(work(pd)); }
    function setTo(d, l, t) { $("#dp").value = d; $("#lr").value = LRS.indexOf(l) >= 0 ? LRS.indexOf(l) : LRS.reduce((b, v, i) => (Math.abs(Math.log(v / l)) < Math.abs(Math.log(LRS[b] / l)) ? i : b), 0); refit(); $("#nt").value = Math.round((t ?? bestT(cur)) / 10) * 10 || 10; draw(); }
    ["dp", "lr"].forEach((id) => $("#" + id).addEventListener("input", () => { refit(); draw(); }));
    ["nt", "bud"].forEach((id) => $("#" + id).addEventListener("input", draw));
    $("#ice").addEventListener("change", draw);
    root.querySelectorAll("#pf button").forEach((b) => b.addEventListener("click", () => { root.querySelectorAll("#pf button").forEach((x) => x.setAttribute("aria-pressed", x === b)); pf = +b.dataset.v; draw(); }));
    $("#early").addEventListener("click", () => { $("#nt").value = Math.max(10, Math.round(bestT(cur) / 10) * 10); draw(); });
    $("#gbest").addEventListener("click", () => { const b = gridChoice().best; setTo(b.d, b.l, b.t); });
    $("#rbest").addEventListener("click", () => { const b = randChoice(); setTo(b.d, b.l, b.t); });
    $("#h1").addEventListener("click", (e) => { const r = $("#h1").getBoundingClientRect(), x = P1.ix(e.clientX - r.left), y = P1.iy(e.clientY - r.top), d = Math.round(y), li = LRS.reduce((b, v, i) => (Math.abs(Math.log10(v) - x) < Math.abs(Math.log10(LRS[b]) - x) ? i : b), 0); if (d < 1 || d > 6) return; setTo(d, LRS[li]); });
    const later = (f) => { $("#h1Cap").textContent = "Searching\u2026"; setTimeout(f, 20); };
    $("#resim").addEventListener("click", () => later(() => { seed++; gen(); search(); refit(); draw(); }));
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); $("#ice").checked = true; pf = 0; root.querySelectorAll("#pf button").forEach((b, i) => b.setAttribute("aria-pressed", i === 0)); seed = 8; later(() => { gen(); search(); refit(); draw(); }); });
    gen(); search(); refit(); draw();
    return watch([$("#h1"), $("#h2"), $("#h3")], () => { d1(); d2(); d3(); });
  },
});
