Lab.register({
  id: "model-trees",
  group: "Machine learning",
  title: "Model trees (M5): a line in every leaf",
  blurb: "A regression tree predicts one number per leaf. A model tree fits a small regularised line in each leaf instead, then prunes back wherever one line does as well. Compare them leaf for leaf, edit the data, watch the pruning, and see how it mirrors RuleFit.",
  lede: "Ordinary regression trees chop the data into boxes and predict the average inside each box, so a smooth slope becomes a staircase. Ross Quinlan's M5 model tree (1992) keeps the tree but puts a linear model in each leaf. It grows the tree greedily, fits a regularised line in every node, then works back up from the bottom and removes any split where a single line is no worse. The result is one big piecewise-linear model: readable as a few if-then rules, yet able to follow slopes, kinks and sudden jumps with far fewer leaves.",
  quiz: [
    ["A regression tree and a model tree both have 4 leaves. Which can follow a straight upward slope inside a leaf?", "Only the model tree. A regression tree predicts a constant in each leaf, so a slope becomes steps; it needs many more leaves to get close."],
    ["Why does a model tree regularise (shrink) the line in each leaf?", "Leaves can hold only a handful of points spread over a narrow range of x, so an unshrunk slope can be wild. Shrinking the slope toward zero, more strongly in small leaves, stops a few noisy points producing a steep line."],
    ["How does M5 decide whether to prune a split?", "Bottom-up, it compares the error of a single linear model at the node with the error of the subtree below it. Both are inflated by (n + ν) ÷ (n − ν), ν = number of parameters, to penalise small samples. If one line is no worse, the split is removed."],
    ["The true relationship is a straight line. What should pruning do to the model tree?", "Collapse it to the root: one linear model fits as well as any split version, and the small-sample penalty makes the extra leaves look worse."],
    ["How is a model tree 'RuleFit in reverse'?", "RuleFit takes many rules from an ensemble of trees and uses them as 0/1 features in one sparse linear model (rules feed a linear model). A model tree puts a separate linear model behind each rule (a linear model sits in each rule)."],
    ["Freight cost jumps down when a shipment switches from parcel to pallet rates. Why do trees handle this better than a single regression?", "A split can put the jump exactly at the threshold, and each side gets its own level (and, in a model tree, its own slope). A single line or smooth curve has to blur the jump."],
  ],
  diy: {
    intro: "Points sorted by x in A2:A151, y in B2:B151. This tests one split at s (say in E1) and builds a two-leaf model tree. FILTER needs Excel 365.",
    steps: [
      ["Regression tree, one leaf: the error is the sum of squares around the mean.", "=DEVSQ(B2:B151)"],
      ["Model tree, one leaf: fit a line and sum the squared residuals.", "slope: =SLOPE(B2:B151,A2:A151)   intercept: =INTERCEPT(B2:B151,A2:A151)\nSSE: =SUMXMY2(B2:B151, intercept + slope*A2:A151)"],
      ["Line on the left of the split (repeat with >s for the right).", "=LET(x,FILTER(A2:A151,A2:A151<=E1), y,FILTER(B2:B151,A2:A151<=E1), b,SLOPE(y,x), a,INTERCEPT(y,x), SUMXMY2(y,a+b*x))"],
      ["Gain of the split: one-line error minus the two leaves' errors. Fill a column of candidate s values and pick the largest gain.", "=SSE_one - (SSE_left + SSE_right)"],
      ["Regularised (ridge) slope with penalty λ in H1. Small leaves get shrunk more.", "=SUMPRODUCT((x-AVERAGE(x))*(y-AVERAGE(y))) / (DEVSQ(x)*(1+$H$1/COUNT(x)))"],
      ["M5 pruning test: adjusted error = RMSE × (n + ν) ÷ (n − ν), with ν = 2 for a line. Prune if the one-line figure is not bigger than the leaves' n-weighted average.", "=SQRT(SSE/n)*(n+2)/(n-2)"],
      ["Predict with the finished tree.", "=IF(A2<=$E$1, aL + bL*A2, aR + bR*A2)"],
    ],
  },
  deeper: [
    ["Quinlan (1992), Learning with continuous classes", "https://sci2s.ugr.es/keel/pdf/algorithm/congreso/1992-Quinlan-AI.pdf", "the original M5 paper"],
    ["Wang & Witten (1996), Induction of model trees for predicting continuous classes", "https://researchcommons.waikato.ac.nz/handle/10289/1183", "M5′, the basis of Weka's M5P"],
    ["Friedman & Popescu (2008), Predictive learning via rule ensembles", "https://arxiv.org/abs/0811.1679", "RuleFit: tree rules as features in a lasso"],
    ["Molnar, Interpretable Machine Learning: RuleFit", "https://christophm.github.io/interpretable-ml-book/rulefit.html", "free book chapter with a worked example"],
    ["Python: linear-tree (scikit-learn compatible)", "https://github.com/cerlymarco/linear-tree", "LinearTreeRegressor: any linear model in the leaves"],
    ["LightGBM parameters: linear_tree", "https://lightgbm.readthedocs.io/en/latest/Parameters.html", "boosted trees with a linear model in each leaf"],
    ["R: Cubist package", "https://cran.r-project.org/web/packages/Cubist/vignettes/cubist.html", "rule-based model trees descended from M5"],
    ["R: RWeka (M5P)", "https://cran.r-project.org/package=RWeka", "Weka's M5′ model tree from R"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 56 h84" opacity=".4"/><path d="M8 50 h14 v-12 h16 v-10 h16 v-14 h16 v8 h18" opacity=".5"/><path d="M8 52 L30 34 M30 40 L56 18 M56 22 L90 30" stroke-width="2.6"/></svg>`,

  mount(root) {
    const { Plot, css, watch, rng } = Lab;
    const SHAPES = {
      wave: { label: "Wave with a trend", f: (x) => 0.4 * x + 1.8 * Math.sin(1.05 * x), xl: "feature x", yl: "target y", note: "A smooth wave on a rising trend, like seasonal demand." },
      freight: { label: "Freight cost by shipment size (jumps)", f: (x) => (x < 3 ? 0.4 + 1.5 * x : x < 7 ? 2.2 + 0.5 * x : 4.6), xl: "shipment size (pallets)", yl: "freight cost ($100s)", note: "Courier rates up to 3 pallets, a cheaper part-load rate up to 7, then a flat full-truck price. Two sudden drops." },
      line: { label: "Straight line", f: (x) => 1 + 0.5 * x, xl: "feature x", yl: "target y", note: "One line is all you need. Pruning should collapse the model tree to a single leaf." },
    };
    const KMAX = 16, NU = 2;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const sl = (id, lab, min, max, step, val) => `<div class="ctrl"><label for="${id}">${lab} <output id="${id}V"></output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
    const f2 = (v) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2));

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="mt-cards" id="cards"></div>
        <figure class="plot wide">
          <div style="padding:4px 6px 0;display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center">${h4("Same number of leaves, constant vs line")}<div class="seg" id="view" role="group" aria-label="Model tree stage"><button type="button" data-v="grown" aria-pressed="true">Model tree as grown</button><button type="button" data-v="pruned" aria-pressed="false">After pruning</button></div></div>
          <canvas id="fit" style="min-height:300px;cursor:crosshair" aria-label="Training data with the regression tree and model tree fits"></canvas>
          <div class="legend"><span><i style="background:var(--warm)"></i>Regression tree (constant per leaf)</span><span><i style="background:var(--accent)"></i>Model tree (line per leaf)</span><span id="lgRF"><i style="background:var(--violet)"></i>RuleFit</span><span><i style="background:var(--muted)"></i>True curve</span></div>
          <figcaption id="fitCap"></figcaption>
        </figure>
        <figure class="plot short">
          <div style="padding:4px 6px 0">${h4("Test error as the trees grow")}</div>
          <canvas id="curve" style="min-height:200px" aria-label="Test RMSE against number of leaves for both trees"></canvas>
          <figcaption id="curveCap"></figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          ${h4("Pruning, bottom-up (M5)")}
          <p class="hint" style="margin:0 0 8px">Each split of the grown model tree, deepest first. Adjusted error = RMSE × (n + 2) ÷ (n − 2). If one line at the node is no worse than the leaves below it, the split goes.</p>
          <div style="overflow-x:auto"><table id="prune" class="ia-table"></table></div>
        </div>
        <div class="mt-two">
          <div class="plot" style="padding:14px;margin:0">
            ${h4("Model tree: a line behind each rule")}
            <div style="overflow-x:auto"><table id="rulesMT" class="ia-table"></table></div>
          </div>
          <div class="plot" style="padding:14px;margin:0">
            ${h4("RuleFit: rules into one linear model")}
            <div style="overflow-x:auto"><table id="rulesRF" class="ia-table"></table></div>
            <p class="hint" id="rfNote" style="margin:8px 0 0"></p>
          </div>
        </div>`,
      panel: `
        <label class="rs-sel" style="display:block;margin-bottom:12px">Data <select id="shape">${Object.entries(SHAPES).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join("")}</select></label>
        ${sl("K", "Leaves", 1, KMAX, 1, 8)}
        ${sl("nz", "Noise (standard deviation)", 0, 1.5, 0.05, 0.5)}
        ${sl("n", "Training points", 40, 300, 10, 150)}
        ${sl("ml", "Smallest leaf (points)", 3, 30, 1, 6)}
        ${sl("lam", "Ridge penalty on each leaf's slope", 0, 40, 1, 2)}
        <label class="check"><input type="checkbox" id="showRF"> Show RuleFit</label>
        <label class="check"><input type="checkbox" id="showTrue" checked> Show true curve</label>
        <div class="btns" style="margin-top:10px"><button class="btn primary" id="resim" type="button">New sample</button></div>
        <p class="hint" style="margin-top:10px">Click the chart to add a training point; click a point to remove it.</p>
        <div class="readouts" id="ro" style="margin-top:10px"></div>`,
      notes: `
        <section>
          <h2>How it works</h2>
          <ol>
            <li><b>Grow.</b> Start with all the data in one leaf. Try every split point and keep the one that most reduces the error of the fitted models in the two halves. Repeat on whichever leaf gains most, until you have the number of leaves asked for or leaves get too small. Here the model tree scores each split with lines; the regression tree with constants.</li>
            <li><b>Fit.</b> Put a ridge-regularised line in every node, not just the leaves. The penalty shrinks the slope toward a flat line, more strongly when the node has few points.</li>
            <li><b>Prune.</b> Starting from the deepest splits, compare one line at the node with the leaves beneath it, using errors inflated for small samples. Remove the split if the single line is no worse.</li>
          </ol>
          <p>Quinlan's M5 also chooses splits by the drop in standard deviation, drops unhelpful variables from each leaf model, and smooths predictions across leaf boundaries so the jumps between neighbouring lines are softer. With many inputs, each leaf's model uses all the numeric inputs, not just one.</p>
        </section>
        <section>
          <h2>One big linear model</h2>
          <p>Write each leaf as an indicator \(1[x \in \text{leaf}_j]\) that is 1 inside the leaf and 0 outside. The whole model tree is then</p>
          <div class="eq">ŷ = Σ<sub>j</sub> 1[x in leaf j] × (a<sub>j</sub> + b<sub>j</sub> x)</div>
          <p>a linear model whose terms switch on and off with the rules. That is why it can fit kinks and jumps (the switches) and slopes (the lines) at the same time.</p>
        </section>
        <section>
          <h2>RuleFit in reverse</h2>
          <p>RuleFit (Friedman and Popescu, 2008) grows many shallow trees, turns every node into a 0/1 rule such as "3.0 ≤ x &lt; 6.2", adds the raw inputs, and fits one lasso regression that keeps only the useful rules. Its prediction is a weighted sum of overlapping rules. A model tree goes the other way: a few non-overlapping rules, each with its own line. Here RuleFit takes its rules from 40 small trees on bootstrap samples, and the lasso penalty is picked on a separate validation sample.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>On the wave, set 4 leaves. The model tree's lines already trace the wave; the regression tree is four flat steps. Then slide up to 16: the regression tree catches up slowly, the model tree sits at the noise level early.</li>
            <li>Switch to freight cost and set the noise to 0.2. The model tree puts splits right at the rate breaks (2.99 and 7.02 pallets with the first sample) and gets the slope in each band, for a test error of 0.22 against 0.31. At the default noise of 0.5 the drops are harder to see, and the splits land further from 3 and 7.</li>
            <li>Choose the straight line, 8 leaves, then press "After pruning". Most or all splits go: one line was as good.</li>
            <li>Set the ridge penalty to 0 and the smallest leaf to 3. Tiny leaves get steep, noisy lines. Raise the penalty and they flatten out.</li>
            <li>Click a few wild points into one region. The regression tree's step moves a lot; the model tree's line tilts, and pruning may decide that region needs no split.</li>
          </ol>
        </section>
        <section>
          <h2>Where model trees are used</h2>
          <p>They suit problems where the relationship is roughly linear within regimes but the regimes differ: freight and price breaks, demand at different price points, energy use above and below a temperature, machine wear by operating band. The R package Cubist (a successor to M5), Weka's M5P, the Python linear-tree package and LightGBM's linear_tree option all build them. Like single trees they can be unstable; boosting or bagging model trees smooths that out.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pF = new Plot($("#fit"), { x: [0, 10], pad: { l: 44 } });
    const pC = new Plot($("#curve"), { x: [0.5, KMAX + 0.5], pad: { l: 44 } });
    let seed = 3, view = "grown", X = [], Y = [], TX = [], TY = [], VX = [], VY = [], rf = null, grownReg = null, grownMT = null;

    // ---------- data ----------
    function gen() {
      const s = SHAPES[$("#shape").value], sd = +$("#nz").value, n = +$("#n").value, R = rng(seed), RT = rng(991), RV = rng(577);
      const pts = Array.from({ length: n }, () => { const x = R() * 10; return [x, s.f(x) + sd * R.normal()]; });
      setPts(pts);
      TX = []; TY = []; for (let i = 0; i < 500; i++) { const x = (i + 0.5) / 50; TX.push(x); TY.push(s.f(x) + sd * RT.normal()); }
      VX = []; VY = []; for (let i = 0; i < 200; i++) { const x = RV() * 10; VX.push(x); VY.push(s.f(x) + sd * RV.normal()); }
    }
    function setPts(pts) { pts.sort((a, b) => a[0] - b[0]); X = pts.map((p) => p[0]); Y = pts.map((p) => p[1]); }

    // ---------- tree growing on sorted 1-D data with prefix sums ----------
    function prefix() {
      const n = X.length, P = { n: [0], x: [0], y: [0], xx: [0], xy: [0], yy: [0] };
      for (let i = 0; i < n; i++) { P.n.push(i + 1); P.x.push(P.x[i] + X[i]); P.y.push(P.y[i] + Y[i]); P.xx.push(P.xx[i] + X[i] * X[i]); P.xy.push(P.xy[i] + X[i] * Y[i]); P.yy.push(P.yy[i] + Y[i] * Y[i]); }
      return P;
    }
    function model(P, a, b, kind, lam) {
      const n = b - a, sx = P.x[b] - P.x[a], sy = P.y[b] - P.y[a], mx = sx / n, my = sy / n;
      const cyy = P.yy[b] - P.yy[a] - n * my * my;
      if (kind === "const") return { mx, my, slope: 0, sse: Math.max(0, cyy), n };
      const cxx = P.xx[b] - P.xx[a] - n * mx * mx, cxy = P.xy[b] - P.xy[a] - n * mx * my;
      const slope = cxx > 1e-12 ? cxy / (cxx * (1 + lam / n)) : 0;
      return { mx, my, slope, sse: Math.max(0, cyy - 2 * slope * cxy + slope * slope * cxx), n };
    }
    function bestSplit(P, node, kind, lam, ml) {
      let best = null;
      for (let i = node.a + ml; i <= node.b - ml; i++) {
        if (!(X[i - 1] < X[i])) continue;
        const L = model(P, node.a, i, kind, lam), R = model(P, i, node.b, kind, lam), gain = node.m.sse - L.sse - R.sse;
        if (!best || gain > best.gain) best = { i, gain, thr: (X[i - 1] + X[i]) / 2 };
      }
      return best && best.gain > 1e-9 ? best : null;
    }
    // best-first growth to KMAX leaves; node.order = index of its split (nested, so the first K-1 splits give a K-leaf tree)
    function grow(kind) {
      const lam = +$("#lam").value, ml = +$("#ml").value, P = prefix();
      const nodes = [{ a: 0, b: X.length, lo: -Infinity, hi: Infinity, depth: 0, m: model(P, 0, X.length, kind, lam), order: Infinity }];
      nodes[0].cand = bestSplit(P, nodes[0], kind, lam, ml);
      for (let s = 0; s < KMAX - 1; s++) {
        let pick = null;
        nodes.forEach((nd) => { if (nd.order === Infinity && nd.cand && (!pick || nd.cand.gain > pick.cand.gain)) pick = nd; });
        if (!pick) break;
        const c = pick.cand;
        pick.order = s; pick.thr = c.thr;
        const L = { a: pick.a, b: c.i, lo: pick.lo, hi: c.thr, depth: pick.depth + 1, order: Infinity, parent: pick }, R = { a: c.i, b: pick.b, lo: c.thr, hi: pick.hi, depth: pick.depth + 1, order: Infinity, parent: pick };
        [L, R].forEach((nd) => { nd.m = model(P, nd.a, nd.b, kind, lam); nd.cand = bestSplit(P, nd, kind, lam, ml); nodes.push(nd); });
        pick.L = L; pick.R = R;
      }
      return nodes;
    }
    const isSplit = (nd, K, cut) => nd.order < K - 1 && !(cut && cut.has(nd));
    function predictor(nodes, K, cut) {
      return (x) => { let nd = nodes[0]; while (isSplit(nd, K, cut)) nd = x <= nd.thr ? nd.L : nd.R; return nd.m.my + nd.m.slope * (x - nd.m.mx); };
    }
    function leavesOf(nodes, K, cut) { const out = [], walk = (nd) => (isSplit(nd, K, cut) ? (walk(nd.L), walk(nd.R)) : out.push(nd)); walk(nodes[0]); return out; }
    const adj = (m) => (m.n > NU ? Math.sqrt(m.sse / m.n) * (m.n + NU) / (m.n - NU) : Infinity);
    function prune(nodes, K) {
      const cut = new Set(), rows = [];
      const rec = (nd) => {
        if (!isSplit(nd, K)) return adj(nd.m);
        const eL = rec(nd.L), eR = rec(nd.R), sub = (nd.L.m.n * eL + nd.R.m.n * eR) / nd.m.n, own = adj(nd.m), go = own <= sub;
        rows.push({ nd, own, sub, go });
        if (go) { cut.add(nd); return own; }
        return sub;
      };
      rec(nodes[0]);
      return { cut, rows };
    }
    const rmse = (fn, xs, ys) => Math.sqrt(xs.reduce((s, x, i) => s + (fn(x) - ys[i]) ** 2, 0) / xs.length);

    // ---------- RuleFit-lite: rules from 40 bootstrap trees (4 leaves), plus x, lasso picked on validation ----------
    function ruleFit() {
      const n = X.length; if (n < 10) return null;
      const R = rng(seed * 7 + 1), keySet = new Map();
      const saveX = X, saveY = Y;
      for (let t = 0; t < 40; t++) {
        const pts = Array.from({ length: n }, () => { const j = Math.floor(R() * n); return [saveX[j], saveY[j]]; });
        setPts(pts);
        const P = prefix(), nodes = [{ a: 0, b: n, lo: -Infinity, hi: Infinity, m: model(P, 0, n, "const", 0), order: Infinity }];
        nodes[0].cand = bestSplit(P, nodes[0], "const", 0, 5);
        for (let s = 0; s < 3; s++) {
          let pick = null; nodes.forEach((nd) => { if (nd.order === Infinity && nd.cand && (!pick || nd.cand.gain > pick.cand.gain)) pick = nd; });
          if (!pick) break; const c = pick.cand; pick.order = s;
          [[pick.a, c.i, pick.lo, c.thr], [c.i, pick.b, c.thr, pick.hi]].forEach(([a, b, lo, hi]) => { const nd = { a, b, lo, hi, m: model(P, a, b, "const", 0), order: Infinity }; nd.cand = bestSplit(P, nd, "const", 0, 5); nodes.push(nd); });
        }
        nodes.slice(1).forEach((nd) => { const key = `${nd.lo.toFixed(2)}|${nd.hi.toFixed(2)}`; if (!keySet.has(key)) keySet.set(key, [nd.lo, nd.hi]); });
      }
      X = saveX; Y = saveY;
      const rules = [...keySet.values()];
      const feats = [(x) => x, ...rules.map(([lo, hi]) => (x) => (x > lo && x <= hi ? 1 : 0))];
      const p = feats.length, cols = feats.map((fn) => X.map(fn)), mu = cols.map((c) => c.reduce((s, v) => s + v, 0) / n), sd = cols.map((c, j) => Math.sqrt(c.reduce((s, v) => s + (v - mu[j]) ** 2, 0) / n) || 1);
      const Z = cols.map((c, j) => c.map((v) => (v - mu[j]) / sd[j])), ym = Y.reduce((s, v) => s + v, 0) / n;
      const res = Y.map((v) => v - ym), beta = new Array(p).fill(0);
      let lmax = 0; for (let j = 0; j < p; j++) lmax = Math.max(lmax, Math.abs(Z[j].reduce((s, v, i) => s + v * res[i], 0)) / n);
      let best = null;
      const fit = (b) => { const bb = b.map((v, j) => v / sd[j]), b0 = ym - bb.reduce((s, v, j) => s + v * mu[j], 0); return (x) => b0 + feats.reduce((s, fn, j) => (bb[j] ? s + bb[j] * fn(x) : s), 0); };
      for (let s = 0; s < 22; s++) {
        const lam = lmax * Math.pow(0.001, s / 21);
        for (let sweep = 0; sweep < 60; sweep++) {
          let moved = 0;
          for (let j = 0; j < p; j++) {
            const zj = Z[j]; let rho = 0; for (let i = 0; i < n; i++) rho += zj[i] * (res[i] + zj[i] * beta[j]); rho /= n;
            const nb = Math.sign(rho) * Math.max(0, Math.abs(rho) - lam), d = nb - beta[j];
            if (d) { for (let i = 0; i < n; i++) res[i] -= zj[i] * d; beta[j] = nb; moved = Math.max(moved, Math.abs(d)); }
          }
          if (moved < 1e-5) break;
        }
        const fn = fit(beta), v = rmse(fn, VX, VY);
        if (!best || v < best.v) best = { v, beta: beta.slice(), fn };
      }
      const terms = best.beta.map((b, j) => ({ j, coef: b / sd[j], imp: Math.abs(b) })).filter((t) => t.coef !== 0).sort((a, b) => b.imp - a.imp);
      return { fn: best.fn, terms, rules, nRules: rules.length, kept: terms.filter((t) => t.j > 0).length };
    }

    // ---------- drawing ----------
    function full() { grownReg = grow("const"); grownMT = grow("line"); rf = ruleFit(); draw(); }
    function draw() {
      const s = SHAPES[$("#shape").value], K = +$("#K").value, sd = +$("#nz").value;
      $("#KV").textContent = K; $("#nzV").textContent = sd.toFixed(2); $("#nV").textContent = $("#n").value; $("#mlV").textContent = $("#ml").value; $("#lamV").textContent = $("#lam").value;
      const pr = prune(grownMT, K), cutNow = view === "pruned" ? pr.cut : null;
      const fReg = predictor(grownReg, K), fMT = predictor(grownMT, K, cutNow);
      const lvReg = leavesOf(grownReg, K), lvMT = leavesOf(grownMT, K, cutNow);
      const eReg = rmse(fReg, TX, TY), eMT = rmse(fMT, TX, TY), eRF = rf ? rmse(rf.fn, TX, TY) : NaN;
      const showRF = $("#showRF").checked && rf;

      // cards
      $("#cards").innerHTML = `
        <div class="mt-card"><span>Leaves</span><b>${lvReg.length}${lvMT.length !== lvReg.length ? ` / ${lvMT.length}` : ""}</b><small>${lvMT.length !== lvReg.length ? "regression / model tree" : view === "pruned" ? "nothing pruned" : ""}</small></div>
        <div class="mt-card"><span><i style="background:var(--warm)"></i>Regression tree · test RMSE</span><b>${eReg.toFixed(2)}</b></div>
        <div class="mt-card"><span><i style="background:var(--accent)"></i>Model tree · test RMSE</span><b>${eMT.toFixed(2)}</b></div>
        <div class="mt-card"><span><i style="background:var(--violet)"></i>RuleFit · test RMSE</span><b>${isFinite(eRF) ? eRF.toFixed(2) : "—"}</b><small>${rf ? rf.kept + " of " + rf.nRules + " rules kept" : ""}</small></div>`;

      // main chart
      const ys = Y.concat(TX.map(s.f)), ylo = Math.min(...ys), yhi = Math.max(...ys), pad = (yhi - ylo) * 0.08 || 1;
      pF.x = [0, 10]; pF.y = [ylo - pad, yhi + pad];
      pF.clear(); pF.axes({ xLabel: s.xl, yLabel: s.yl, xTicks: [0, 2, 4, 6, 8, 10] });
      const g = pF.ctx; g.fillStyle = css("--muted"); g.globalAlpha = 0.45;
      X.forEach((x, i) => { g.beginPath(); g.arc(pF.sx(x), pF.sy(Y[i]), 2.6, 0, 7); g.fill(); }); g.globalAlpha = 1;
      if ($("#showTrue").checked) pF.fn(s.f, css("--muted"), 1.4, [4, 4], 0.9, 400);
      const drawPiece = (leaves, col, w) => leaves.forEach((nd) => { const a = Math.max(0, nd.lo), b = Math.min(10, nd.hi), fn = (x) => nd.m.my + nd.m.slope * (x - nd.m.mx); pF.path([a, b], [fn(a), fn(b)], col, w); });
      // vertical joins for the step function
      const joins = (leaves, col, w) => { for (let i = 1; i < leaves.length; i++) { const x = leaves[i].lo, A = leaves[i - 1].m, B = leaves[i].m; pF.path([x, x], [A.my + A.slope * (x - A.mx), B.my + B.slope * (x - B.mx)], col, w, null, 0.9); } };
      drawPiece(lvReg, css("--warm"), 3); joins(lvReg, css("--warm"), 3);
      if (showRF) pF.fn(rf.fn, css("--violet"), 2.2, null, 1, 600);
      drawPiece(lvMT, css("--accent"), 3.2); joins(lvMT, css("--accent"), 1.4);
      $("#lgRF").style.display = showRF ? "" : "none";
      $("#fitCap").innerHTML = `${s.note} ${view === "pruned" ? `After pruning, the model tree keeps <b>${lvMT.length}</b> of its ${lvReg.length >= K ? K : lvReg.length} leaves.` : `Both trees have ${lvReg.length} leaves.`} Test RMSE is measured on 500 fresh points from the same curve and noise, so the best possible is about ${sd.toFixed(2)} (the noise).`;

      // RMSE vs leaves
      const ks = Array.from({ length: KMAX }, (_, i) => i + 1);
      const cR = ks.map((k) => rmse(predictor(grownReg, k), TX, TY)), cM = ks.map((k) => rmse(predictor(grownMT, k), TX, TY));
      const cP = ks.map((k) => rmse(predictor(grownMT, k, prune(grownMT, k).cut), TX, TY));
      pC.y = [0, Math.max(...cR, ...cM, sd) * 1.12 || 1];
      pC.clear(); pC.axes({ xLabel: "number of leaves", yLabel: "test RMSE", xTicks: ks.filter((k) => k === 1 || k % 3 === 1 || k === KMAX), yCount: 4 });
      pC.path([0.5, KMAX + 0.5], [sd, sd], css("--ink"), 1.2, [5, 4]);
      pC.path([K, K], pC.y, css("--line"), 6, null, 0.6);
      pC.path(ks, cR, css("--warm"), 2.4); pC.path(ks, cM, css("--accent"), 2.4);
      ks.forEach((k, i) => { pC.dot(k, cR[i], 3.5, css("--warm"), css("--surface")); pC.dot(k, cM[i], 3.5, css("--accent"), css("--surface")); });
      if (showRF) pC.path([0.5, KMAX + 0.5], [eRF, eRF], css("--violet"), 1.6, [2, 3]);
      const near = (arr) => { const i = arr.findIndex((v) => v <= sd * 1.1 + 0.02); return i < 0 ? null : i + 1; };
      const kM = near(cM), kR = near(cR);
      $("#curveCap").innerHTML = `Dashed line: the noise level (${sd.toFixed(2)}), the floor no model can beat on new data. ` +
        `The model tree gets within 10% of it with ${kM ? `<b>${kM}</b> leaves` : `none of the sizes up to ${KMAX}`}; the regression tree ${kR ? `needs <b>${kR}</b>` : `doesn't get there by ${KMAX}`}. ` +
        `Pruned, the model tree's test error at ${K} leaves is ${cP[K - 1].toFixed(2)} (vs ${cM[K - 1].toFixed(2)} as grown).`;

      // pruning table
      const rng2 = (nd) => `${isFinite(nd.lo) ? nd.lo.toFixed(2) : "0"} – ${isFinite(nd.hi) ? nd.hi.toFixed(2) : "10"}`;
      $("#prune").innerHTML = pr.rows.length
        ? `<thead><tr><th>Split at x =</th><th>x range</th><th>n</th><th>One line</th><th>Leaves below</th><th>Decision</th></tr></thead><tbody>` +
          pr.rows.map((r) => `<tr><td>${r.nd.thr.toFixed(2)}</td><td>${rng2(r.nd)}</td><td>${r.nd.m.n}</td><td>${r.own.toFixed(3)}</td><td>${r.sub.toFixed(3)}</td><td style="font-family:var(--font-body);color:${r.go ? "var(--bad)" : "var(--good)"}">${r.go ? "prune" : "keep"}</td></tr>`).join("") + "</tbody>"
        : `<tbody><tr><td>One leaf: nothing to prune.</td></tr></tbody>`;

      // rules tables
      $("#rulesMT").innerHTML = `<thead><tr><th>If x is in</th><th>then ŷ =</th><th>n</th></tr></thead><tbody>` +
        lvMT.map((nd) => { const b = nd.m.slope, a = nd.m.my - b * nd.m.mx; return `<tr><td>${rng2(nd)}</td><td>${f2(a)} ${b < 0 ? "−" : "+"} ${f2(Math.abs(b))}·x</td><td>${nd.m.n}</td></tr>`; }).join("") + "</tbody>";
      if (rf) {
        const top = rf.terms.slice(0, 8);
        $("#rulesRF").innerHTML = `<thead><tr><th>Term</th><th>Weight</th></tr></thead><tbody>` +
          top.map((t) => { const lab = t.j === 0 ? "x (linear term)" : (() => { const [lo, hi] = rf.rules[t.j - 1]; return `1 if ${isFinite(lo) ? lo.toFixed(2) + " &lt; " : ""}x${isFinite(hi) ? " ≤ " + hi.toFixed(2) : ""}`; })(); return `<tr><td>${lab}</td><td>${t.coef > 0 ? "+" : "−"}${f2(Math.abs(t.coef))}</td></tr>`; }).join("") + "</tbody>";
        $("#rfNote").innerHTML = `Showing the ${top.length} biggest of ${rf.terms.length} non-zero terms. The prediction adds up every rule that is true for x, so the rules overlap, unlike the model tree's leaves. RuleFit test RMSE: ${eRF.toFixed(2)}.`;
      }

      $("#ro").innerHTML = `
        <div class="ro"><b>Regression tree RMSE</b><span class="num">${eReg.toFixed(3)}</span></div>
        <div class="ro"><b>Model tree RMSE</b><span class="pill ${eMT <= eReg ? "ok" : "bad"}">${eMT.toFixed(3)}</span></div>
        <div class="ro"><b>Error cut by lines</b><span class="num">${Math.round((1 - eMT / eReg) * 100)}%</span></div>
        <div class="ro"><b>Splits pruned</b><span class="num">${pr.cut.size === 0 ? "none" : [...pr.cut].reduce((s, nd) => s + leavesOf(grownMT, K).filter((l) => l.a >= nd.a && l.b <= nd.b).length - 1, 0)} of ${Math.max(0, lvReg.length - 1)}</span></div>`;
      root.querySelectorAll("#view button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === view)));
    }

    // ---------- events ----------
    $("#shape").addEventListener("change", () => { gen(); full(); });
    ["#nz", "#n"].forEach((id) => $(id).addEventListener("input", () => { gen(); full(); }));
    ["#ml", "#lam"].forEach((id) => $(id).addEventListener("input", full));
    $("#K").addEventListener("input", draw);
    ["#showRF", "#showTrue"].forEach((id) => $(id).addEventListener("change", draw));
    $("#resim").addEventListener("click", () => { seed++; gen(); full(); });
    $("#view").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; view = b.dataset.v; draw(); });
    $("#fit").addEventListener("click", (e) => {
      const r = $("#fit").getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, x = pF.ix(px), y = pF.iy(py);
      if (x < 0 || x > 10 || y < pF.y[0] || y > pF.y[1]) return;
      let hit = -1, bd = 100; X.forEach((xx, i) => { const d = (pF.sx(xx) - px) ** 2 + (pF.sy(Y[i]) - py) ** 2; if (d < bd) { bd = d; hit = i; } });
      const pts = X.map((xx, i) => [xx, Y[i]]);
      if (hit >= 0) pts.splice(hit, 1); else pts.push([x, y]);
      setPts(pts); full();
    });
    gen(); full();
    return watch([pF.c, pC.c], (resized) => { if (resized) { pF.resize(); pC.resize(); } draw(); });
  },
});
