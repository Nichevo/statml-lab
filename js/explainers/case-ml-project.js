Lab.register({
  id: "case-ml-project",
  group: "Case studies",
  title: "Case study: a machine-learning project, step by step",
  blurb: "Predict which orders will ship late, from framing the question to watching the model once it's live. Includes a leakage trap, a time-based split, tuning, five ways to value a feature, a cost-based threshold and drift.",
  lede: "Most ML failures aren't about the algorithm. They come from asking the wrong question, a feature that secretly contains the answer, a test that lets the model peek at the future, or a model nobody watches after launch. This page walks one project through every step: deciding which orders to expedite because they're likely to arrive late. Each step's numbers feed the next.",
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="32" r="6"/><circle cx="34" cy="16" r="5"/><circle cx="34" cy="48" r="5"/><circle cx="58" cy="32" r="6"/><path d="M18 30 L29 18 M18 34 L29 46 M39 18 L52 29 M39 46 L52 35"/><path d="M64 32 H76" stroke-dasharray="3 3"/><rect x="76" y="22" width="14" height="20" rx="2"/><path d="M80 36 L83 30 L86 33" /></svg>`,
  quiz: [
    ["The delay-scan feature makes the model almost perfect in testing. Why does that number mean nothing?", "The scan is recorded after the parcel has been dispatched, often because it is already running late. At order time, when the decision is made, it doesn't exist yet. The model learned to read the answer, so its test score measures nothing it can do in real use, which the live-year cost shows."],
    ["Why split by time (train on year 1, tune on early year 2, test on late year 2) rather than at random?", "In use, the model always predicts orders later than everything it was trained on. A random split mixes future orders into training, so seasonal patterns and drift leak in and the test score is optimistic. A time split reproduces how the model will actually be used."],
    ["Distance in km and distance in miles are both in the model. What happens to their importance, and why?", "It is shared between them. Permutation importance of each one alone looks small, because when one is shuffled the model still has the other. Drop-column importance for each is near zero for the same reason. Group the two and score them together: then the importance of distance reappears."],
    ["A feature's permutation importance is smaller than the random-numbers column. What should you conclude?", "On this data the model gets no reliable value from it: any apparent gain is noise. Drop it, or test whether it helps in a different form (e.g. as an interaction), but don't report it as a driver."],
    ["The cost-optimal threshold is far below 0.5. Is that a mistake?", "No. With the starting costs (flagging an order costs $" + "5 and missing a late one costs $" + "40), it is worth flagging any order with more than about 5/40 = 12.5% chance of being late (if the probabilities are calibrated). 0.5 is only right when both mistakes cost the same."],
  ],
  diy: {
    intro: "One row per order: date in A, features in B:H, Late (1/0) in I. Sort by date.",
    steps: [
      ["Split by time: the first 52 weeks for training, the next 26 for validation, the last 26 for the test.", "split: =IF(A2<start+364,\"train\",IF(A2<start+546,\"valid\",\"test\"))"],
      ["Leakage check: for each column, write down when it becomes known. Anything recorded after the order is placed is out.", ""],
      ["Baseline: the training share of late orders, used as everyone's probability. Log loss for one row:", "p: =AVERAGEIFS(I:I,split,\"train\")\nlogloss: =-(I2*LN(p)+(1-I2)*LN(1-p))"],
      ["Logistic regression: standardise each feature with training mean and SD, then fit with Solver (maximise the sum of log-likelihoods) or the Analysis ToolPak.", "z: =(B2-mean_train)/sd_train\nprob: =1/(1+EXP(-(b0+SUMPRODUCT(coefs,z_row))))"],
      ["Permutation importance: copy the test rows, shuffle one column (sort it by =RAND()), recompute log loss, and subtract the original.", "=AVERAGE(logloss_shuffled)-AVERAGE(logloss_original)"],
      ["Cost of a threshold t on validation rows.", "flag: =IF(prob>=t,1,0)\ncost: =flag*C_act+(1-flag)*I2*C_miss"],
      ["Drift: population stability index for one feature, comparing bin shares now (a) with training (e).", "=SUMPRODUCT((a-e)*LN(a/e))"],
    ],
  },
  deeper: [
    ["Sculley et al. (2015), Hidden technical debt in machine learning systems, NeurIPS", "https://papers.nips.cc/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html", "why most of the work, and most failures, are outside the model"],
    ["Kaufman, Rosset, Perlich & Stitelman (2012), Leakage in data mining: formulation, detection, and avoidance, ACM TKDD 6(4)", "https://doi.org/10.1145/2382577.2382579", "the classic study of leakage"],
    ["Breiman (2001), Random forests, Machine Learning 45(1)", "https://doi.org/10.1023/A:1010933404324", "where permutation importance comes from"],
    ["Lundberg & Lee (2017), A unified approach to interpreting model predictions, NeurIPS", "https://arxiv.org/abs/1705.07874", "SHAP values"],
    ["Molnar, Interpretable Machine Learning (free online book)", "https://christophm.github.io/interpretable-ml-book/", "permutation importance, PDP, ICE and SHAP side by side, with their pitfalls"],
    ["Gama, Žliobaitė, Bifet, Pechenizkiy & Bouchachia (2014), A survey on concept drift adaptation, ACM Computing Surveys 46(4)", "https://doi.org/10.1145/2523813", "detecting and handling drift after launch"],
  ],

  mount(root) {
    const { Plot, fmt, css, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);
    const step = (n, t) => `<span style="display:inline-block;min-width:1.7em;height:1.7em;line-height:1.7em;text-align:center;border-radius:50%;background:var(--accent-soft);color:var(--ink);font:600 .8rem/1.7em var(--font-mono);margin-right:8px">${n}</span>${t}`;
    const sw = (c, t, k) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">${k === "box" ? `<span style="width:12px;height:10px;background:var(${c});opacity:.8"></span>` : k === "dot" ? `<span style="width:8px;height:8px;border-radius:50%;background:var(${c})"></span>` : `<span style="width:20px;border-top:2px ${k} var(${c})"></span>`}${t}</span>`;
    const pct = (v, d = 1) => fmt(v * 100, d) + "%";
    const money = (v) => "$" + fmt(v, 2);

    const PER_WEEK = 60, W_TRAIN = 52, W_VAL = 26, W_TEST = 26, W_LIVE = 52;
    // feature groups: name, raw columns, known at order time?
    const GROUPS = [
      { key: "dist", name: "Distance (km)", when: "order time", ok: true },
      { key: "lines", name: "Order lines", when: "order time", ok: true },
      { key: "carrier", name: "Carrier", when: "order time", ok: true },
      { key: "fri", name: "Ships on a Friday", when: "order time", ok: true },
      { key: "load", name: "Warehouse load", when: "order time (planned)", ok: true },
      { key: "rain", name: "Rain forecast", when: "order time", ok: true },
      { key: "miles", name: "Distance (miles)", when: "order time (duplicate of km)", ok: true, opt: "dup" },
      { key: "rand", name: "Random numbers", when: "baseline: pure noise", ok: true },
      { key: "leak", name: "Carrier delay scan", when: "after dispatch: leaks the answer", ok: false, opt: "leak" },
    ];

    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(fig("c1", "4–5 · Models and tuning", 240, "Validation log loss against number of boosted trees, with the baselines and logistic regression"), fig("c2", "6 · What is each feature worth?", 240, "Feature importance by four methods, scaled to the largest"))}
        ${two(fig("c3", "6 · How a feature moves the prediction", 230, "Partial dependence and ICE curves for the selected feature"), fig("c4", "7 · Choosing the threshold by cost", 230, "Validation cost per order against the probability threshold"))}
        ${fig("c5", "8 · After launch: the live year", 230, "Weekly cost per order in the live year, with the drift alarm")}`,
      panel: `
        <p class="hint" style="margin:0">A distributor ships about ${PER_WEEK} orders a week. Expediting an order (a faster carrier, a call to the customer) costs a fixed amount; a late order that wasn't expedited costs a penalty and goodwill. Which orders should be expedited?</p>
        <div class="ctrl"><label>Model</label><div class="seg" id="model"><button type="button" data-v="lr" aria-pressed="false">Logistic regression</button><button type="button" data-v="gbm" aria-pressed="true">Boosted trees</button></div></div>
        <label class="check"><input type="checkbox" id="leak"> Step 2: include the delay-scan feature (leaks)</label>
        <label class="check"><input type="checkbox" id="dup"> Step 6: add distance in miles too (duplicate)</label>
        <div class="ctrl"><label for="feat">Step 6: feature to plot</label><select id="feat"></select></div>
        <div class="ctrl"><label for="cAct">Step 7: cost to expedite an order <output id="cActV"></output></label><input type="range" id="cAct" min="1" max="20" step="1" value="5"></div>
        <div class="ctrl"><label for="cMiss">Step 7: cost of a late order not expedited <output id="cMissV"></output></label><input type="range" id="cMiss" min="10" max="100" step="5" value="40"></div>
        <div class="ctrl"><label for="drift">Step 8: how much carrier C worsens after launch <output id="driftV"></output></label><input type="range" id="drift" min="0" max="1" step="0.05" value="0.8"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newD" type="button">New data</button></div>
        <p class="hint" id="status" style="margin:0"></p>`,
      notes: `
        <section>
          <h2>${step(1, "Frame the decision, not just the prediction")}</h2>
          <p>The business question is "which orders should we expedite?", so the model must predict, <b>at the moment the order is placed</b>, the probability it will arrive late. The score that matters is money: expediting costs <span class="cAct"></span> per order, and an unexpedited late order costs <span class="cMiss"></span>. Accuracy alone would mislead: only <span id="base"></span> of orders are late, so "never late" is already ${"<span id='acc0'></span>"} accurate and saves nothing.</p>
        </section>
        <section>
          <h2>${step(2, "Audit the data for leakage")}</h2>
          <div style="overflow-x:auto"><table class="tbl" id="tLeak"></table></div>
          <p id="n2"></p>
          <p>More in <a href="#feature-engineering">feature engineering and leakage</a>.</p>
        </section>
        <section>
          <h2>${step(3, "Split by time")}</h2>
          <p>Weeks 1–${W_TRAIN} train the models, weeks ${W_TRAIN + 1}–${W_TRAIN + W_VAL} choose between them and set the threshold, and weeks ${W_TRAIN + W_VAL + 1}–${W_TRAIN + W_VAL + W_TEST} are opened once, at the end, for an honest score. Then the model goes live for a year. A random split would let it learn from orders later than the ones it is tested on. See <a href="#cross-validation">cross-validation</a> and <a href="#backtesting">backtesting</a>.</p>
        </section>
        <section>
          <h2>${step(4, "Start with baselines")}</h2>
          <div style="overflow-x:auto"><table class="tbl" id="tModels"></table></div>
          <p id="n4"></p>
          <p>Log loss rewards honest probabilities (lower is better); AUC is the chance a random late order scores higher than a random on-time one. See <a href="#logistic-regression">logistic regression</a>, <a href="#gradient-boosting">gradient boosting</a> and <a href="#model-zoo">the model zoo</a>.</p>
        </section>
        <section>
          <h2>${step(5, "Tune on the validation weeks")}</h2>
          <p id="n5"></p>
          <p>More in <a href="#hyperparameter-tuning">hyperparameter tuning</a> and <a href="#bias-variance">bias–variance</a>.</p>
        </section>
        <section>
          <h2>${step(6, "Measure what each feature is worth")}</h2>
          <div style="overflow-x:auto"><table class="tbl" id="tImp"></table></div>
          <p id="n6"></p>
          <ul>
            <li><b>Drop-column</b>: refit without the feature and see how much test log loss rises. The most direct answer, but needs one refit per feature.</li>
            <li><b>Permutation</b>: shuffle the feature in the test weeks, average over 5 shuffles. No refit. ± is the spread across shuffles.</li>
            <li><b>SHAP</b>: average size of each feature's push on individual predictions, in probability points. See <a href="#shap">SHAP</a>.</li>
            <li><b>Built-in</b>: split gain for boosted trees, |standardised coefficient| for logistic regression. Quick, but measured on training data.</li>
          </ul>
          <p>The <b>Random numbers</b> column is the yardstick: a feature that doesn't beat it isn't helping. The plot of how a feature moves the prediction is a <a href="#hyperparameter-tuning">partial dependence plot with ICE curves</a>.</p>
        </section>
        <section>
          <h2>${step(7, "Set the threshold by cost")}</h2>
          <p id="n7"></p>
          <p>See <a href="#imbalanced-calibration">rare events and calibration</a>.</p>
        </section>
        <section>
          <h2>${step(8, "Ship it, then watch it")}</h2>
          <p id="n8"></p>
          <div style="overflow-x:auto"><table class="tbl" id="tPsi"></table></div>
          <p>See <a href="#model-drift">model drift</a> and <a href="#change-points">change points (CUSUM)</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul id="try">
            <li><b>Tick the delay-scan box.</b> Test AUC jumps from about 0.81 to 0.95 and test cost per order drops from about $3.96 to $2.31. It looks like a breakthrough. Then look at step 8: in real use the scan doesn't exist yet when the order is placed, and the drift alarm goes off in the first week.</li>
            <li><b>Tick "distance in miles too".</b> Distance was by far the most valuable feature (permutation about 147). Now km scores about 27 and miles about 52, and drop-column for each is close to zero, because the model can lean on the other copy. The value didn't disappear; it was split.</li>
            <li><b>Switch to logistic regression</b> and plot warehouse load. The boosted trees curve stays flat until the warehouse is about 80% busy and then climbs; the logistic curve is a smooth S that can't make that bend, which is why its log loss is a little worse (0.423 vs 0.414).</li>
            <li><b>Move the cost to expedite.</b> At $20 against $40 the best threshold moves to about 50% and the model flags only 13% of orders. At $1 it flags almost everything, and the model adds nothing over "expedite everything".</li>
            <li><b>Drag the drift slider.</b> At 0 the live year looks like the test weeks and nothing alarms. At 0.8 the CUSUM alarm fires around week 43; at 1 it fires around week 32. The PSI table points at the input that moved most: warehouse load.</li>
            <li><b>Press New data</b> a few times. The winner between logistic regression and boosted trees can flip, and the feature rankings shuffle among the smaller features. Differences that small aren't worth a decision on one test set.</li>
          </ul>
        </section>`,
    });

    // ---------- data
    let seed = 3;
    function makeData(sd, drift) {
      const r = rng(sd), rows = [], weeks = W_TRAIN + W_VAL + W_TEST + W_LIVE;
      for (let w = 0; w < weeks; w++) {
        const live = w >= W_TRAIN + W_VAL + W_TEST, lw = live ? (w - (W_TRAIN + W_VAL + W_TEST)) / W_LIVE : 0;
        const seasonLoad = 0.76 + 0.1 * Math.sin((2 * Math.PI * (w - 40)) / 52), seasonRain = 0.35 + 0.25 * Math.sin((2 * Math.PI * (w - 20)) / 52);
        for (let k = 0; k < PER_WEEK; k++) {
          const dist = Math.exp(Math.log(300) + 0.8 * r.normal()), lines = 1 + Math.round(-Math.log(1 - r()) * 4), u = r();
          const pC = 0.2 + (live ? 0.2 * drift * lw : 0), carrier = u < 0.5 - pC / 2 + 0.1 ? 0 : u < 1 - pC ? 1 : 2;
          const fri = r() < 0.2 ? 1 : 0, load = Math.min(1, Math.max(0.45, seasonLoad + 0.07 * r.normal() + (live ? 0.06 * drift * lw : 0))), rain = Math.min(1, Math.max(0, seasonRain + 0.2 * r.normal()));
          const ld = Math.log(dist / 300);
          const z = -3.3 + 1.2 * ld + 0.12 * (lines - 5) + (carrier === 1 ? 0.6 : carrier === 2 ? 1.4 + (live ? 3 * drift * lw : 0) : 0) + 0.6 * fri + 16 * Math.max(0, load - 0.8) + 1.3 * rain + 1.2 * rain * Math.max(0, ld);
          const late = r() < 1 / (1 + Math.exp(-z)) ? 1 : 0;
          rows.push({ w, live, dist, miles: dist * 0.6214 * (1 + 0.03 * r.normal()), lines, carrier, fri, load, rain, rand: r(), leak: late * 1.0 + 0.45 * r.normal(), late });
        }
      }
      return rows;
    }
    // feature matrix for the chosen groups; leak column at order time = unknown -> training mean
    function cols(groups) { const c = []; groups.forEach((g) => { if (g === "carrier") c.push(["carrier", "B"], ["carrier", "C"]); else c.push([g]); }); return c; }
    function rowVec(o, cs, leakMean) {
      return cs.map(([g, s]) => g === "dist" ? Math.log(o.dist) : g === "miles" ? Math.log(o.miles) : g === "carrier" ? (s === "B" ? +(o.carrier === 1) : +(o.carrier === 2)) : g === "leak" ? (leakMean !== undefined ? leakMean : o.leak) : o[g]);
    }

    // ---------- models
    function fitLR(X, y) {
      const n = X.length, p = X[0].length, mu = Array(p).fill(0), sd = Array(p).fill(0);
      X.forEach((x) => x.forEach((v, j) => (mu[j] += v / n))); X.forEach((x) => x.forEach((v, j) => (sd[j] += (v - mu[j]) ** 2 / n))); sd.forEach((v, j) => (sd[j] = Math.sqrt(v) || 1));
      const Z = X.map((x) => [1, ...x.map((v, j) => (v - mu[j]) / sd[j])]); let b = Array(p + 1).fill(0); const lam = 1;
      for (let it = 0; it < 25; it++) {
        const H = Array.from({ length: p + 1 }, () => Array(p + 1).fill(0)), g = Array(p + 1).fill(0);
        Z.forEach((z, i) => { const e = z.reduce((s, v, j) => s + v * b[j], 0), q = 1 / (1 + Math.exp(-e)), wgt = q * (1 - q); for (let a = 0; a <= p; a++) { g[a] += (y[i] - q) * z[a]; for (let c = a; c <= p; c++) H[a][c] += wgt * z[a] * z[c]; } });
        for (let a = 0; a <= p; a++) { for (let c = 0; c < a; c++) H[a][c] = H[c][a]; if (a) { H[a][a] += lam; g[a] -= lam * b[a]; } }
        const d = Lab.solve(H, g); b = b.map((v, j) => v + d[j]); if (Math.max(...d.map(Math.abs)) < 1e-7) break;
      }
      const predict = (x) => { let e = b[0]; for (let j = 0; j < p; j++) e += b[j + 1] * (x[j] - mu[j]) / sd[j]; return 1 / (1 + Math.exp(-e)); };
      return { predict, builtin: b.slice(1).map(Math.abs), b };
    }
    function fitGBM(X, y, T) { const m = Lab.gbm.fit(X, y, { trees: T, depth: 3, lr: 0.1, minLeaf: 20, bins: 32 }); return { m, predict: (x, upTo) => Math.min(0.995, Math.max(0.005, m.predict(x, upTo))), builtin: m.importance }; }
    const logloss = (ps, ys) => { let s = 0; ps.forEach((p, i) => { const q = Math.min(0.995, Math.max(0.005, p)); s -= ys[i] ? Math.log(q) : Math.log(1 - q); }); return s / ps.length; };
    function auc(ps, ys) { const idx = ps.map((p, i) => i).sort((a, b) => ps[a] - ps[b]); let r = 0, np = 0, nn = 0; for (let a = 0; a < idx.length; ) { let b = a; while (b + 1 < idx.length && ps[idx[b + 1]] === ps[idx[a]]) b++; const avg = (a + b) / 2 + 1; for (let k = a; k <= b; k++) { if (ys[idx[k]]) { r += avg; np++; } else nn++; } a = b + 1; } return np && nn ? (r - (np * (np + 1)) / 2) / (np * nn) : 0.5; }

    // ---------- the pipeline (cached per data + options; slow parts async)
    let D = null, job = 0;
    const cache = new Map();
    const st = () => ({ model: $("#model [aria-pressed=true]").dataset.v, leak: $("#leak").checked, dup: $("#dup").checked, cAct: +$("#cAct").value, cMiss: +$("#cMiss").value, drift: +$("#drift").value, feat: $("#feat").value });

    function core(p) {
      const key = `${seed}|${p.leak}|${p.dup}|${p.drift}`;
      if (cache.has(key)) return cache.get(key);
      const rows = makeData(seed, p.drift), groups = GROUPS.filter((g) => (g.opt === "leak" ? p.leak : g.opt === "dup" ? p.dup : true)).map((g) => g.key), cs = cols(groups);
      const part = (a, b) => rows.filter((o) => o.w >= a && o.w < b);
      const tr = part(0, W_TRAIN), va = part(W_TRAIN, W_TRAIN + W_VAL), te = part(W_TRAIN + W_VAL, W_TRAIN + W_VAL + W_TEST), lv = rows.filter((o) => o.live);
      const leakMean = tr.reduce((s, o) => s + o.leak, 0) / tr.length;
      const M = (set, live) => set.map((o) => rowVec(o, cs, live && p.leak ? leakMean : undefined)), Y = (set) => set.map((o) => o.late);
      const S = { rows, groups, cs, tr, va, te, lv, Xtr: M(tr), Xva: M(va), Xte: M(te), Xlv: M(lv, true), ytr: Y(tr), yva: Y(va), yte: Y(te), ylv: Y(lv), leakMean };
      S.base = S.ytr.reduce((a, b) => a + b, 0) / S.ytr.length;
      // rule of thumb: carrier C or Friday -> training late rate of that segment
      const rule = (o) => (o.carrier === 2 || o.fri ? 1 : 0), segRate = [0, 1].map((k) => { const s = tr.filter((o) => rule(o) === k); return s.reduce((a, o) => a + o.late, 0) / s.length; });
      S.rulePred = (o) => segRate[rule(o)];
      S.lr = fitLR(S.Xtr, S.ytr);
      const TMAX = 250; S.gbmFull = fitGBM(S.Xtr, S.ytr, TMAX);
      // validation curve
      const pv = S.Xva.map(() => S.gbmFull.m.base), curve = [];
      S.gbmFull.m.trees.forEach((tree, t) => { S.Xva.forEach((x, i) => (pv[i] += S.gbmFull.m.walk(tree, x))); curve.push(logloss(pv, S.yva)); });
      S.curve = curve; S.bestT = curve.indexOf(Math.min(...curve)) + 1;
      S.gbm = { predict: (x) => S.gbmFull.predict(x, S.bestT), builtin: S.gbmFull.builtin };
      // train curve for the chart
      const pt = S.Xtr.map(() => S.gbmFull.m.base), tc = []; S.gbmFull.m.trees.forEach((tree) => { S.Xtr.forEach((x, i) => (pt[i] += S.gbmFull.m.walk(tree, x))); tc.push(logloss(pt, S.ytr)); }); S.trainCurve = tc;
      S.imp = {}; cache.set(key, S); return S;
    }
    const modelOf = (S, m) => (m === "lr" ? S.lr : S.gbm);
    const colIdx = (S, g) => S.cs.map((c, i) => (c[0] === g ? i : -1)).filter((i) => i >= 0);

    function importance(S, m, done) {
      if (S.imp[m] && S.imp[m].ready) return done();
      const M = modelOf(S, m), P = S.Xte.map((x) => M.predict(x)), base = logloss(P, S.yte), r = rng(17), out = { ready: false, rows: {} };
      S.imp[m] = out;
      // permutation (5 shuffles), shapley sampling, built-in
      S.groups.forEach((g) => {
        const ci = colIdx(S, g), ds = [];
        for (let k = 0; k < 5; k++) { const perm = S.Xte.map((_, i) => i); for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; } const Xp = S.Xte.map((x, i) => { const y = x.slice(); ci.forEach((c) => (y[c] = S.Xte[perm[i]][c])); return y; }); ds.push(logloss(Xp.map((x) => M.predict(x)), S.yte) - base); }
        const mean = ds.reduce((a, b) => a + b, 0) / ds.length, sd = Math.sqrt(ds.reduce((a, b) => a + (b - mean) ** 2, 0) / (ds.length - 1));
        out.rows[g] = { perm: mean, permSd: sd, builtin: ci.reduce((s, c) => s + M.builtin[c], 0) };
      });
      // Shapley values by permutation sampling: 150 test orders x 12 orderings, one background order each
      const G = S.groups, shap = Object.fromEntries(G.map((g) => [g, 0])), NI = 150, NP = 12;
      for (let k = 0; k < NI; k++) {
        const x = S.Xte[Math.floor(r() * S.Xte.length)];
        for (let q = 0; q < NP; q++) {
          const bg = S.Xtr[Math.floor(r() * S.Xtr.length)].slice(), order = G.slice().sort(() => r() - 0.5);
          let prev = M.predict(bg);
          order.forEach((g) => { colIdx(S, g).forEach((c) => (bg[c] = x[c])); const now = M.predict(bg); shap[g] += Math.abs(now - prev) / (NI * NP); prev = now; });
        }
      }
      G.forEach((g) => (out.rows[g].shap = shap[g]));
      out.base = base;
      // drop-column: refit without each group, async so the page stays responsive
      const my = job; let gi = 0;
      const next = () => {
        if (my !== job) return;
        if (gi >= G.length) { out.ready = true; return done(); }
        const g = G[gi++], keep = S.cs.map((c, i) => (c[0] === g ? -1 : i)).filter((i) => i >= 0), sub = (X) => X.map((x) => keep.map((i) => x[i]));
        const Mx = m === "lr" ? fitLR(sub(S.Xtr), S.ytr) : (() => { const f = fitGBM(sub(S.Xtr), S.ytr, S.bestT); return { predict: (x) => f.predict(x) }; })();
        out.rows[g].drop = logloss(sub(S.Xte).map((x) => Mx.predict(x)), S.yte) - base;
        $("#status").textContent = `Refitting without each feature for drop-column importance… ${gi} of ${G.length}`;
        draw(true); setTimeout(next, 0);
      };
      setTimeout(next, 0);
    }

    // ---------- drawing
    const C1 = new Plot($("#c1"), { pad: { l: 52, b: 36 } }), C2 = new Plot($("#c2"), { pad: { l: 112, b: 30 } }), C3 = new Plot($("#c3"), { pad: { l: 48, b: 36 } }), C4 = new Plot($("#c4"), { pad: { l: 52, b: 36 } }), C5 = new Plot($("#c5"), { pad: { l: 52, b: 36 } });
    const gname = (g) => GROUPS.find((x) => x.key === g).name;
    const thrCost = (ps, ys, t, p) => { let c = 0; ps.forEach((q, i) => (c += q >= t ? p.cAct : ys[i] ? p.cMiss : 0)); return c / ps.length; };

    function draw(fromImp) {
      const p = st(); labels(p); const S = core(p), M = modelOf(S, p.model);
      const pva = S.Xva.map((x) => M.predict(x)), pte = S.Xte.map((x) => M.predict(x)), plv = S.Xlv.map((x) => M.predict(x));
      // 1 & 4: tables
      const acc0 = 1 - S.yte.reduce((a, b) => a + b, 0) / S.yte.length;
      $("#base").textContent = pct(S.base); $("#acc0").textContent = pct(acc0); root.querySelectorAll(".cAct").forEach((e) => (e.textContent = "$" + p.cAct)); root.querySelectorAll(".cMiss").forEach((e) => (e.textContent = "$" + p.cMiss));
      $("#tLeak").innerHTML = `<thead><tr><th>Feature</th><th>Known when?</th><th>Use?</th></tr></thead><tbody>${GROUPS.map((g) => `<tr><td>${g.name}</td><td>${g.when}</td><td>${g.ok ? (g.opt === "dup" ? (p.dup ? "in model" : "off") : "yes") : `<span class="pill ${p.leak ? "bad" : "ok"}">${p.leak ? "in model!" : "excluded"}</span>`}</td></tr>`).join("")}</tbody>`;
      const evals = [["Base rate for everyone", S.va.map(() => S.base), S.te.map(() => S.base)], ["Rule: carrier C or Friday", S.va.map(S.rulePred), S.te.map(S.rulePred)], ["Logistic regression", S.Xva.map((x) => S.lr.predict(x)), S.Xte.map((x) => S.lr.predict(x))], [`Boosted trees (${S.bestT} trees)`, S.Xva.map((x) => S.gbm.predict(x)), S.Xte.map((x) => S.gbm.predict(x))]];
      $("#tModels").innerHTML = `<thead><tr><th>Model</th><th>Valid. log loss</th><th>Valid. AUC</th><th>Test log loss</th><th>Test AUC</th></tr></thead><tbody>${evals.map(([n, a, b], i) => `<tr${(i === 2 && p.model === "lr") || (i === 3 && p.model === "gbm") ? ' style="background:var(--accent-soft)"' : ""}><td>${n}</td><td class="num">${fmt(logloss(a, S.yva), 3)}</td><td class="num">${fmt(auc(a, S.yva), 3)}</td><td class="num">${fmt(logloss(b, S.yte), 3)}</td><td class="num">${fmt(auc(b, S.yte), 3)}</td></tr>`).join("")}</tbody>`;
      const llLR = logloss(evals[2][1], S.yva), llG = logloss(evals[3][1], S.yva);
      $("#n4").innerHTML = `Two baselines first: everyone gets the training late rate (${pct(S.base)}), and a planner's rule of thumb. ${llG < llLR ? `Boosted trees beat logistic regression on the validation weeks (log loss ${fmt(llG, 3)} vs ${fmt(llLR, 3)}), because warehouse load only matters above about 80% busy, a bend a straight-line model can't draw.` : `Logistic regression is as good as boosted trees here (log loss ${fmt(llLR, 3)} vs ${fmt(llG, 3)}).`}${p.leak ? " <b>With the delay scan in, every model looks nearly perfect, which is the clue that something is wrong.</b>" : ""}`;
      $("#n2").innerHTML = p.leak ? `<b>The delay scan is in the model.</b> It is recorded after dispatch, so at order time it doesn't exist. Test AUC is ${fmt(auc(pte, S.yte), 3)}, but in the live year, where the scan is unknown when the decision is made, the same model scores ${fmt(auc(plv, S.ylv), 3)}.` : `Every feature in the model is known when the order is placed. The delay scan is excluded: it is recorded after dispatch, so using it would let the model read the answer. Tick the box to see what happens.`;
      $("#n5").innerHTML = `Boosted trees add one small tree at a time. Training error keeps falling, but validation error bottoms out at <b>${S.bestT} trees</b> (log loss ${fmt(Math.min(...S.curve), 3)}) and creeps up after: more trees are fitting noise in the training weeks. The test weeks played no part in this choice.`;

      // c1: tuning curve
      C1.resize(); const all = [...S.curve, ...S.trainCurve, logloss(S.va.map(() => S.base), S.yva), llLR]; C1.x = [0, S.curve.length]; C1.y = [Math.min(...all) * 0.9, Math.max(...all) * 1.05]; C1.clear();
      C1.axes({ xLabel: "number of trees", yLabel: "log loss", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 2) });
      C1.path(S.trainCurve.map((_, i) => i + 1), S.trainCurve, css("--muted"), 1.4, [4, 3]); C1.path(S.curve.map((_, i) => i + 1), S.curve, css("--accent"), 2.2);
      const b0 = logloss(S.va.map(() => S.base), S.yva); C1.path(C1.x, [b0, b0], css("--bad"), 1.4, [2, 3]); C1.path(C1.x, [llLR, llLR], css("--violet"), 1.6, [6, 3]);
      C1.dot(S.bestT, S.curve[S.bestT - 1], 4.5, css("--warm"), css("--ink"));
      $("#c1Cap").innerHTML = `${sw("--accent", "boosted trees, validation", "solid")}${sw("--muted", "training", "dashed")}${sw("--violet", "logistic regression", "dashed")}${sw("--bad", "base rate", "dotted")}${sw("--warm", `best: ${S.bestT} trees`, "dot")}`;

      // 6: importance
      const I = S.imp[p.model];
      if (!I && !fromImp) { job++; importance(S, p.model, () => { $("#status").textContent = ""; draw(true); }); }
      const imp = S.imp[p.model];
      if (imp && imp.rows) {
        const G = S.groups, meth = [["drop", "Drop-column", "--warm"], ["perm", "Permutation", "--accent"], ["shap", "SHAP", "--violet"], ["builtin", "Built-in", "--muted"]];
        const mx = Object.fromEntries(meth.map(([k]) => [k, Math.max(1e-9, ...G.map((g) => Math.max(0, imp.rows[g][k] ?? 0)))]));
        C2.resize(); C2.x = [0, 1.05]; C2.y = [G.length, 0]; C2.clear(); C2.axes({ xLabel: "share of the largest, per method", yLabel: "", xTicks: [0, 0.5, 1], yTicks: [], xFormat: (v) => fmt(v * 100, 0) + "%" });
        const g2 = C2.ctx, bh = (C2.sy(1) - C2.sy(0)) * 0.8 / meth.length;
        G.forEach((g, i) => { g2.fillStyle = css("--ink"); g2.font = "11px var(--font-body)"; g2.textAlign = "right"; g2.fillText(gname(g).replace(" (km)", " km").replace(" (miles)", " mi"), C2.pad.l - 6, C2.sy(i + 0.5) + 4); g2.textAlign = "left";
          meth.forEach(([k, , c], j) => { const v = imp.rows[g][k]; if (v === undefined) return; const w = Math.max(0, v) / mx[k]; g2.fillStyle = css(c); g2.globalAlpha = 0.8; g2.fillRect(C2.sx(0), C2.sy(i + 0.1) + j * bh, C2.sx(w) - C2.sx(0), bh - 1); g2.globalAlpha = 1; }); });
        $("#c2Cap").innerHTML = meth.map(([, l, c]) => sw(c, l, "box")).join("") + (imp.ready ? "" : "<br>Drop-column bars appear as each refit finishes.");
        const randP = imp.rows.rand.perm, rows = G.map((g) => { const r = imp.rows[g]; return `<tr${g === "rand" ? ' style="color:var(--muted)"' : ""}><td>${gname(g)}</td><td class="num">${r.drop === undefined ? "…" : fmt(r.drop * 1000, 1)}</td><td class="num">${fmt(r.perm * 1000, 1)} ± ${fmt(r.permSd * 1000, 1)}</td><td class="num">${fmt(r.shap * 100, 2)}</td><td class="num">${pct(r.builtin / G.reduce((s, h) => s + imp.rows[h].builtin, 0), 0)}</td><td>${g === "rand" ? "yardstick" : r.perm - 2 * r.permSd > randP + 2 * imp.rows.rand.permSd ? '<span class="pill ok">beats noise</span>' : '<span class="pill warn">no better than noise</span>'}</td></tr>`; }).join("");
        $("#tImp").innerHTML = `<thead><tr><th>Feature</th><th>Drop-column (Δ log loss ×1000)</th><th>Permutation (Δ log loss ×1000)</th><th>SHAP (mean |push|, % points)</th><th>Built-in (share)</th><th>vs random</th></tr></thead><tbody>${rows}</tbody>`;
        const top = (k) => G.filter((g) => g !== "rand").reduce((a, g) => ((imp.rows[g][k] ?? -1) > (imp.rows[a][k] ?? -1) ? g : a), G[0]);
        const notes = [];
        notes.push(`By permutation, the most valuable feature is <b>${gname(top("perm"))}</b>; by SHAP, <b>${gname(top("shap"))}</b>; by the built-in measure, <b>${gname(top("builtin"))}</b>.`);
        if (p.dup) notes.push(`With distance in both km and miles, the two share the credit: each one's permutation and drop-column value shrinks because the model can lean on the other. Grouping them would restore the value of "distance".`);
        if (p.leak) notes.push(`The delay scan dominates every method. Importance measures can't tell you a feature is illegal; only the leakage audit in step 2 can.`);
        if (p.model === "gbm") notes.push(`Built-in split gain is measured on the training weeks, so it can credit features (even the random column) that only helped fit noise.`);
        $("#n6").innerHTML = notes.join(" ");
      }

      // c3: PDP + ICE for selected feature (numeric only; carrier shows bars)
      const fg = p.feat && S.groups.includes(p.feat) ? p.feat : "load"; const ci = colIdx(S, fg), sample = S.Xte.filter((_, i) => i % 26 === 0).slice(0, 40);
      C3.resize();
      if (fg === "carrier") {
        const lv = [[0, 0, "A"], [1, 0, "B"], [0, 1, "C"]], avgs = lv.map(([b, c]) => sample.reduce((s, x) => { const y = x.slice(); y[ci[0]] = b; y[ci[1]] = c; return s + M.predict(y); }, 0) / sample.length);
        C3.x = [-0.6, 2.6]; C3.y = [0, Math.max(...avgs) * 1.25]; C3.clear(); C3.axes({ xLabel: "carrier", yLabel: "P(late)", xTicks: [0, 1, 2], xFormat: (v) => "ABC"[Math.round(v)], yFormat: (v) => pct(v, 0) });
        const g3 = C3.ctx; avgs.forEach((a, i) => { g3.fillStyle = css("--accent"); g3.globalAlpha = 0.7; g3.fillRect(C3.sx(i - 0.3), C3.sy(a), C3.sx(0.6) - C3.sx(0), C3.sy(0) - C3.sy(a)); g3.globalAlpha = 1; });
        $("#c3Cap").innerHTML = `Average predicted chance of being late if every order used each carrier.`;
      } else {
        const c = ci[0], vals = S.Xtr.map((x) => x[c]).sort((a, b) => a - b), lo = vals[Math.floor(vals.length * 0.02)], hi = vals[Math.floor(vals.length * 0.98)], grid = Array.from({ length: 25 }, (_, k) => lo + ((hi - lo) * k) / 24);
        const ice = sample.map((x) => grid.map((v) => { const y = x.slice(); y[c] = v; return M.predict(y); })), pdp = grid.map((_, k) => ice.reduce((s, r) => s + r[k], 0) / ice.length);
        const isLog = fg === "dist" || fg === "miles", tx = (v) => (isLog ? Math.exp(v) : v);
        C3.x = [lo, hi]; C3.y = [0, Math.min(1, Math.max(...ice.flat()) * 1.05)]; C3.clear(); C3.axes({ xLabel: gname(fg).toLowerCase(), yLabel: "P(late)", xFormat: (v) => (isLog ? fmt(tx(v), 0) : fg === "load" || fg === "rain" ? fmt(v * 100, 0) + (fg === "load" ? "%" : "") : fmt(v, fg === "rand" ? 1 : 0)), yFormat: (v) => pct(v, 0) });
        ice.forEach((r) => C3.path(grid, r, css("--accent"), 1, null, 0.18)); C3.path(grid, pdp, css("--warm"), 2.6);
        $("#c3Cap").innerHTML = `${sw("--accent", "one order (ICE)", "solid")}${sw("--warm", "average (partial dependence)", "solid")}`;
      }

      // 7: threshold by cost on validation
      const ts = Array.from({ length: 60 }, (_, k) => 0.01 + k * 0.01), cv = ts.map((t) => thrCost(pva, S.yva, t, p)), bi = cv.indexOf(Math.min(...cv)), tStar = ts[bi];
      const none = (S.yva.reduce((a, b) => a + b, 0) / S.yva.length) * p.cMiss, allC = p.cAct, theory = p.cAct / p.cMiss;
      C4.resize(); C4.x = [0, 0.6]; C4.y = [0, Math.max(none, allC, ...cv) * 1.08]; C4.clear(); C4.axes({ xLabel: "flag orders with P(late) above", yLabel: "cost per order", xFormat: (v) => pct(v, 0), yFormat: (v) => "$" + fmt(v, 1) });
      C4.path(ts, cv, css("--accent"), 2.2); C4.path(C4.x, [none, none], css("--bad"), 1.4, [4, 3]); C4.path(C4.x, [allC, allC], css("--muted"), 1.4, [2, 3]); C4.path([theory, theory], C4.y, css("--violet"), 1.4, [6, 3]); C4.dot(tStar, cv[bi], 4.5, css("--warm"), css("--ink"));
      $("#c4Cap").innerHTML = `${sw("--accent", "validation cost", "solid")}${sw("--bad", "expedite none", "dashed")}${sw("--muted", "expedite all", "dotted")}${sw("--violet", `theory: ${p.cAct}/${p.cMiss}`, "dashed")}${sw("--warm", "cheapest", "dot")}`;
      const testCost = thrCost(pte, S.yte, tStar, p), testNone = (S.yte.reduce((a, b) => a + b, 0) / S.yte.length) * p.cMiss, flagged = pte.filter((q) => q >= tStar).length, tp = pte.filter((q, i) => q >= tStar && S.yte[i]).length, lateN = S.yte.reduce((a, b) => a + b, 0);
      $("#n7").innerHTML = `Expedite an order when its predicted chance of being late is above the threshold. If the probabilities are honest, the break-even is cost to expedite ÷ cost of a late order = ${p.cAct}/${p.cMiss} = ${pct(theory)}; on the validation weeks the cheapest threshold is <b>${pct(tStar, 0)}</b>. Used on the untouched test weeks it flags ${pct(flagged / pte.length, 0)} of orders and catches ${pct(tp / Math.max(1, lateN), 0)} of the late ones (precision ${pct(tp / Math.max(1, flagged), 0)}). Cost per order: <b>${money(testCost)}</b>, against ${money(testNone)} with no model and ${money(p.cAct)} if you expedite everything. ${(() => { const sv = (Math.min(testNone, p.cAct) - testCost) * PER_WEEK * 52; return sv > 50 ? ` Over a year of ${PER_WEEK * 52} orders that saves about $${fmt(sv, 0)} against the better of those two.` : ` Here the model adds almost nothing: expediting is so ${p.cAct * 4 < p.cMiss ? "cheap that you might as well expedite everything" : "expensive that you might as well expedite nothing"}.`; })()}`;

      // 8: live year
      const wk = Array.from({ length: W_LIVE }, (_, k) => k), lvW = S.lv.map((o) => o.w - (W_TRAIN + W_VAL + W_TEST)), wc = wk.map((k) => { const ii = lvW.map((w, i) => (w === k ? i : -1)).filter((i) => i >= 0); return ii.reduce((s, i) => s + (plv[i] >= tStar ? p.cAct : S.ylv[i] ? p.cMiss : 0), 0) / ii.length; });
      const teW = S.te.map((o) => o.w), tw = [...new Set(teW)], twc = tw.map((w) => { const ii = teW.map((x, i) => (x === w ? i : -1)).filter((i) => i >= 0); return ii.reduce((s, i) => s + (pte[i] >= tStar ? p.cAct : S.yte[i] ? p.cMiss : 0), 0) / ii.length; });
      const ref = testCost, oc = pte.map((q, i) => (q >= tStar ? p.cAct : S.yte[i] ? p.cMiss : 0)), sdW = Math.max(Math.sqrt(twc.reduce((s, v) => s + (v - ref) ** 2, 0) / (twc.length - 1)), Math.sqrt(oc.reduce((s, v) => s + (v - ref) ** 2, 0) / (oc.length - 1) / PER_WEEK), p.cMiss / PER_WEEK) || 1; let cus = 0, alarm = -1; const cs = [];
      wc.forEach((v, k) => { cus = Math.max(0, cus + (v - ref) / sdW - 0.25); cs.push(cus); if (alarm < 0 && cus > 5) alarm = k; });
      C5.resize(); C5.x = [-0.5, W_LIVE - 0.5]; C5.y = [0, Math.max(...wc, testNone) * 1.15]; C5.clear(); C5.axes({ xLabel: "week after launch", yLabel: "cost per order", xFormat: (v) => fmt(v + 1, 0), yFormat: (v) => "$" + fmt(v, 1) });
      const g5 = C5.ctx, bw = (C5.sx(1) - C5.sx(0)) * 0.7; wc.forEach((v, k) => { g5.fillStyle = css(alarm >= 0 && k >= alarm ? "--bad" : "--accent"); g5.globalAlpha = 0.6; g5.fillRect(C5.sx(k) - bw / 2, C5.sy(v), bw, C5.sy(0) - C5.sy(v)); g5.globalAlpha = 1; });
      C5.path(C5.x, [ref, ref], css("--ink"), 1.4, [4, 3]); C5.path(C5.x, [testNone, testNone], css("--bad"), 1.2, [2, 3]);
      $("#c5Cap").innerHTML = `${sw("--accent", "weekly cost, model in use", "box")}${sw("--ink", "test-weeks cost", "dashed")}${sw("--bad", "no model", "dotted")}${alarm >= 0 ? sw("--bad", `after the CUSUM alarm (week ${alarm + 1})`, "box") : ""}`;
      const half = (a) => a.slice(W_LIVE / 2).reduce((s, v) => s + v, 0) / (W_LIVE / 2);
      $("#n8").innerHTML = `The model runs unchanged for a year. ${p.drift > 0 ? `Partway through, carrier C gets worse and takes more of the volume, and the warehouse gets busier.` : "Nothing changes in the world, so performance should hold."} Second-half cost per order is ${money(half(wc))}, against ${money(ref)} in the test weeks.${p.leak ? ` (With the leaky scan unavailable at order time, the model is much worse than its test score promised from day one.)` : ""} A CUSUM on weekly cost ${alarm >= 0 ? `raises an alarm in <b>week ${alarm + 1}</b>: time to retrain.` : "raises no alarm."} The population stability index (PSI) compares each feature's spread in the last 13 weeks with the same 13 weeks of the training year (same season, so seasonal swings don't raise false alarms):`;
      const psi = (g) => { const c = colIdx(S, g)[0]; if (g === "carrier") { const sh = (X) => [0, 1, 2].map((k) => X.filter((x) => (k === 0 ? !x[c] && !x[c + 1] : k === 1 ? x[c] : x[c + 1])).length / X.length); const e = sh(S.Xtr.slice(-13 * PER_WEEK)), a = sh(S.Xlv.slice(-13 * PER_WEEK)); return e.reduce((s, ev, k) => s + (a[k] - ev) * Math.log((a[k] + 1e-4) / (ev + 1e-4)), 0); }
        const v = S.Xtr.map((x) => x[c]).sort((a, b) => a - b), cuts = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => v[Math.floor((k / 10) * v.length)]), bin = (x) => cuts.filter((t) => x > t).length, sh = (X) => { const h = Array(10).fill(1e-4); X.forEach((x) => h[bin(x[c])]++); const n = X.length; return h.map((q) => q / n); }; const e = sh(S.Xtr.slice(-13 * PER_WEEK)), a = sh(S.Xlv.slice(-13 * PER_WEEK)); return e.reduce((s, ev, k) => s + (a[k] - ev) * Math.log(a[k] / ev), 0); };
      $("#tPsi").innerHTML = `<thead><tr><th>Feature</th><th>PSI</th><th></th></tr></thead><tbody>${S.groups.filter((g) => g !== "rand" && g !== "leak").map((g) => { const v = psi(g); return `<tr><td>${gname(g)}</td><td class="num">${fmt(v, 3)}</td><td><span class="pill ${v < 0.1 ? "ok" : v < 0.25 ? "warn" : "bad"}">${v < 0.1 ? "stable" : v < 0.25 ? "watch" : "shifted"}</span></td></tr>`; }).join("")}</tbody>`;

      $("#ro").innerHTML = [["Late orders (training)", pct(S.base)], ["Test AUC", fmt(auc(pte, S.yte), 3)], ["Live-year AUC", fmt(auc(plv, S.ylv), 3)], ["Threshold", pct(tStar, 0)], ["Test cost / order", money(testCost)], ["No-model cost / order", money(testNone)], ["Drift alarm", alarm >= 0 ? `<span class="pill bad">week ${alarm + 1}</span>` : '<span class="pill ok">none</span>']].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function labels(p) { $("#cActV").textContent = "$" + p.cAct; $("#cMissV").textContent = "$" + p.cMiss; $("#driftV").textContent = p.drift ? `${fmt(p.drift * 100, 0)}%` : "no change"; }
    function fillFeat() { const p = st(), cur = $("#feat").value || "load"; const gs = GROUPS.filter((g) => (g.opt === "leak" ? p.leak : g.opt === "dup" ? p.dup : true)); $("#feat").innerHTML = gs.map((g) => `<option value="${g.key}"${g.key === cur ? " selected" : ""}>${g.name}</option>`).join(""); }

    const redo = () => { job++; $("#status").textContent = ""; fillFeat(); draw(); };
    $("#model").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $("#model").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); redo(); });
    ["#leak", "#dup"].forEach((s) => $(s).addEventListener("change", redo));
    $("#drift").addEventListener("change", redo); $("#drift").addEventListener("input", () => labels(st()));
    ["#cAct", "#cMiss", "#feat"].forEach((s) => $(s).addEventListener("input", () => draw(true)));
    $("#newD").addEventListener("click", () => { seed++; cache.clear(); redo(); });
    fillFeat();
    const unwatch = Lab.watch([$("#c1"), $("#c2"), $("#c3"), $("#c4"), $("#c5")], () => draw(true));
    draw();
    return () => { job++; unwatch(); };
  },
});
