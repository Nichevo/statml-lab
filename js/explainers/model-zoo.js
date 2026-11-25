Lab.register({
  id: "model-zoo",
  group: "Machine learning",
  title: "The model zoo: eight classifiers, one dataset",
  blurb: "Logistic regression, kNN, naive Bayes, a tree, a random forest, gradient boosting, an SVM and a neural network, all trained live on the same data. Compare the shapes they draw and how well they do on new points.",
  lede: "Every classifier is a different way of drawing a boundary between classes. Straight lines, nearest-neighbour patches, boxes, smooth curves: each shape suits some problems and fails on others. Here eight models train in your browser on the same points. Change the data and watch the ranking change. No model wins everywhere, which is why you compare several by cross-validation instead of picking a favourite.",
  quiz: [
    ["On the “ring” data, logistic regression scores about 50%. Why?", "It can only draw a straight line, and no straight line separates an inner circle from an outer ring. It would need hand-made features such as distance from the centre (x₁² + x₂²)."],
    ["Why do the tree, forest and boosting maps look boxy?", "Every split is on one feature at a time, so boundaries are made of horizontal and vertical steps. Averaging many trees softens the steps but doesn't remove them."],
    ["Naive Bayes does well on “overlapping clouds” but badly on “chequerboard”. Why?", "Gaussian naive Bayes models each class as one oval blob per feature. Two round clouds fit that perfectly; a chequerboard, where each class sits in two opposite corners, doesn't."],
    ["What's the “no free lunch” theorem?", "Averaged over every possible problem, no learning method beats any other. A method wins only where its assumptions (straight lines, smoothness, boxes) match the problem, so you must test on your own data."],
    ["Two models score 91% and 90% on 1,000 test points. Is the first better?", "Not clearly. With 1,000 points the standard error of an accuracy near 90% is about 1 point, so the gap is within noise. Check with several resamples or cross-validation folds before choosing."],
  ],
  diy: {
    intro: "A fair comparison in Excel: same training rows, same test rows, one column of predictions per model. Labels (1/0) in C2:C1001 of the test sheet; predictions from model A in D, model B in E.",
    steps: [
      ["Accuracy of each model on the test rows.", "=AVERAGE(--(D2:D1001=C2:C1001))   (enter as an array formula in older Excel)"],
      ["Rows where the two models disagree.", "=SUMPRODUCT(--(D2:D1001<>E2:E1001))"],
      ["Of those, how often model A is right (McNemar's idea: only disagreements matter).", "=SUMPRODUCT((D2:D1001<>E2:E1001)*(D2:D1001=C2:C1001))"],
      ["Standard error of an accuracy p on n test rows.", "=SQRT(p*(1-p)/n)"],
      ["Logistic regression scored in Excel, from fitted weights in H1:H3.", "=1/(1+EXP(-(H1+H2*A2+H3*B2)))"],
      ["kNN, naive Bayes and trees: see their own pages for Excel steps.", ""],
    ],
  },
  deeper: [
    ["Wolpert (1996), The lack of a priori distinctions between learning algorithms, Neural Computation 8(7)", "https://doi.org/10.1162/neco.1996.8.7.1341", "the no-free-lunch theorem"],
    ["Fernández-Delgado et al. (2014), Do we need hundreds of classifiers to solve real world classification problems?, JMLR 15", "https://jmlr.org/papers/v15/delgado14a.html", "179 classifiers on 121 datasets; forests and SVMs near the top"],
    ["Grinsztajn, Oyallon & Varoquaux (2022), Why do tree-based models still outperform deep learning on tabular data?, arXiv:2207.08815", "https://arxiv.org/abs/2207.08815", "trees vs neural nets on tables"],
    ["scikit-learn: Classifier comparison", "https://scikit-learn.org/stable/auto_examples/classification/plot_classifier_comparison.html", "the classic side-by-side picture"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="26" height="26" rx="2"/><rect x="35" y="4" width="26" height="26" rx="2"/><rect x="66" y="4" width="26" height="26" rx="2"/><rect x="4" y="34" width="26" height="26" rx="2"/><rect x="35" y="34" width="26" height="26" rx="2"/><rect x="66" y="34" width="26" height="26" rx="2"/><path d="M8 26 L26 8"/><path d="M39 26 V17 H48 V8 H57"/><path d="M70 26 C74 10 86 22 88 8"/><circle cx="17" cy="47" r="8"/><path d="M38 52 C46 38 52 56 58 40"/><path d="M70 40 H78 V50 H88"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const $ = (s) => root.querySelector(s);
    const SETS = [["moons", "Two moons"], ["ring", "Ring"], ["checker", "Chequerboard"], ["blobs", "Overlapping clouds"]];
    const MODELS = [
      ["logit", "Logistic regression", "logistic-regression", "one straight line"],
      ["knn", "k-nearest neighbours", "knn", "vote of the 15 nearest points"],
      ["nb", "Gaussian naive Bayes", "naive-bayes", "one oval blob per class"],
      ["tree", "Decision tree (depth 5)", "decision-tree", "boxes from yes/no splits"],
      ["rf", "Random forest (40 trees)", "random-forest", "average of many boxy trees"],
      ["gbm", "Gradient boosting (80 trees)", "gradient-boosting", "small trees fixing each other's errors"],
      ["svm", "SVM, RBF kernel", "svm", "bumps around support vectors"],
      ["mlp", "Neural network (12 hidden)", "neural-net", "smooth curves from bent lines"],
    ];
    root.innerHTML = Lab.page(this, {
      figure: `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr));gap:12px">${MODELS.map(([k, n]) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(n)}</div><canvas id="z-${k}" style="height:210px" aria-label="${n} decision regions"></canvas><figcaption id="c-${k}" style="font-family:var(--font-mono)"></figcaption></figure>`).join("")}</div>
        <figure class="plot wide" style="margin:0"><div style="padding:4px 6px 0">${h4("Test accuracy, ranked")}</div><canvas id="rank" style="height:260px" aria-label="Models ranked by test accuracy"></canvas><figcaption id="rankCap"></figcaption></figure>
        <div class="plot wide" style="padding:14px;overflow-x:auto">${h4("The numbers")}<div id="tbl"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Two features, two classes (red and blue). Every model trains on the same points and is tested on the same 1,000 new ones.</p>
        <div class="ctrl"><label>Data shape</label><div class="seg" id="set" style="display:flex;flex-wrap:wrap">${SETS.map(([k, n], i) => `<button type="button" data-v="${k}" aria-pressed="${i === 0}">${n}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="nz">Noise <output id="nzV"></output></label><input type="range" id="nz" min="0" max="0.6" step="0.05" value="0.25"></div>
        <div class="ctrl"><label for="n">Training points <output id="nV"></output></label><input type="range" id="n" min="40" max="400" step="20" value="160"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New sample</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Each model's built-in assumption</h2>
          <ul>
            <li><b><a href="#logistic-regression">Logistic regression</a></b>: the log-odds change in a straight line. Fast, readable, gives probabilities; needs hand-made features for curves.</li>
            <li><b><a href="#knn">k-nearest neighbours</a></b>: similar points have similar labels. No training, but needs scaled features and slows down on big data.</li>
            <li><b><a href="#naive-bayes">Naive Bayes</a></b>: within each class, features are independent (here each normally distributed). Tiny and quick; shapes limited to blobs.</li>
            <li><b><a href="#decision-tree">Decision tree</a></b>: the answer depends on a few threshold rules. Readable, boxy, unstable.</li>
            <li><b><a href="#random-forest">Random forest</a></b>: many trees on resampled data, averaged. Robust, little tuning.</li>
            <li><b><a href="#gradient-boosting">Gradient boosting</a></b>: small trees added one by one to fix remaining errors. Usually the most accurate on tables once tuned.</li>
            <li><b><a href="#svm">SVM</a></b>: widest margin, bent by a kernel. Strong on small data; needs C and γ tuned.</li>
            <li><b><a href="#neural-net">Neural network</a></b>: layers of weighted sums and bends. Can fit anything with enough data and tuning; shines on images, text and sound.</li>
          </ul>
        </section>
        <section>
          <h2>How to choose in practice</h2>
          <ol>
            <li>Start with a simple baseline (logistic regression, or a naive forecast for time series).</li>
            <li>Try a tree ensemble (random forest, then gradient boosting).</li>
            <li>Compare on the same <a href="#cross-validation">cross-validation</a> folds, and look at the size of the gaps, not just the order.</li>
            <li>Prefer the simpler model when the difference is within noise. It's easier to explain and maintain.</li>
          </ol>
          <p>The <a href="#which-method">“Which method?” flowchart</a> walks through the same choice.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Ring: the straight-line models (logistic regression) fail; everything else copes.</li>
            <li>Chequerboard: naive Bayes and logistic regression fail; trees and kNN shine.</li>
            <li>Overlapping clouds with high noise: the simple models catch up, because there's no complex shape to find.</li>
            <li>Set training points to 40: the flexible models overfit and the ranking shuffles. Press “New sample” a few times.</li>
          </ul>
        </section>`,
    });

    let set = "moons", seed = 1, train = [], test = [], res = {};
    function gen() {
      const r = rng(seed * 13 + SETS.findIndex((s) => s[0] === set)), nz = +$("#nz").value;
      const one = () => {
        let x, y;
        if (set === "moons") { y = r() < 0.5 ? 1 : 0; const t = r() * Math.PI; x = y ? [Math.cos(t) - 0.5, Math.sin(t) - 0.25] : [0.5 - Math.cos(t), 0.25 - Math.sin(t)]; x = x.map((v) => v * 1.6); }
        else if (set === "ring") { y = r() < 0.5 ? 1 : 0; const a = r() * 2 * Math.PI, rad = y ? 0.8 * Math.sqrt(r()) : 1.4 + 0.6 * r(); x = [rad * Math.cos(a), rad * Math.sin(a)]; }
        else if (set === "checker") { x = [r() * 4 - 2, r() * 4 - 2]; y = (x[0] > 0) === (x[1] > 0) ? 1 : 0; }
        else { y = r() < 0.5 ? 1 : 0; x = y ? [0.7 + 0.8 * r.normal(), 0.5 + 0.8 * r.normal()] : [-0.7 + 0.8 * r.normal(), -0.5 + 0.8 * r.normal()]; }
        return { x: [x[0] + nz * r.normal(), x[1] + nz * r.normal()], y };
      };
      train = Array.from({ length: +$("#n").value }, one); test = Array.from({ length: 1000 }, one);
    }
    // ---- models: each fit(train) returns predict(x) -> P(class 1)
    const sig = (z) => 1 / (1 + Math.exp(-z));
    const FIT = {
      logit(D) { let w = [0, 0, 0]; for (let it = 0; it < 400; it++) { const g = [0, 0, 0]; D.forEach((p) => { const e = sig(w[0] + w[1] * p.x[0] + w[2] * p.x[1]) - p.y; g[0] += e; g[1] += e * p.x[0]; g[2] += e * p.x[1]; }); w = w.map((v, i) => v - (0.5 * g[i]) / D.length); } return (x) => sig(w[0] + w[1] * x[0] + w[2] * x[1]); },
      knn(D) { const k = Math.min(15, D.length); return (x) => { const d = D.map((p) => [(p.x[0] - x[0]) ** 2 + (p.x[1] - x[1]) ** 2, p.y]).sort((a, b) => a[0] - b[0]); let s = 0; for (let i = 0; i < k; i++) s += d[i][1]; return s / k; }; },
      nb(D) { const st = [0, 1].map((c) => { const S = D.filter((p) => p.y === c), m = [0, 1].map((f) => S.reduce((a, p) => a + p.x[f], 0) / S.length), v = [0, 1].map((f) => S.reduce((a, p) => a + (p.x[f] - m[f]) ** 2, 0) / S.length + 1e-6); return { pr: S.length / D.length, m, v }; });
        const ll = (s, x) => Math.log(s.pr) + [0, 1].reduce((a, f) => a - 0.5 * Math.log(2 * Math.PI * s.v[f]) - (x[f] - s.m[f]) ** 2 / (2 * s.v[f]), 0); return (x) => sig(ll(st[1], x) - ll(st[0], x)); },
      tree(D, opt = {}) {
        const maxD = opt.depth || 5, minLeaf = opt.minLeaf || 4, r = opt.r;
        const build = (S, d) => { const n = S.length, l = S.reduce((a, p) => a + p.y, 0), leaf = { v: l / n }; if (d >= maxD || l === 0 || l === n || n < 2 * minLeaf) return leaf;
          let best = null; const feats = r ? [r() < 0.5 ? 0 : 1] : [0, 1];
          for (const f of feats) { const srt = S.slice().sort((a, b) => a.x[f] - b.x[f]); let nl = 0, ll = 0; for (let i = 0; i < n - 1; i++) { nl++; ll += srt[i].y; if (nl < minLeaf || n - nl < minLeaf || srt[i].x[f] === srt[i + 1].x[f]) continue; const nr = n - nl, lr = l - ll, g = nl * (1 - (ll / nl) ** 2 - (1 - ll / nl) ** 2) + nr * (1 - (lr / nr) ** 2 - (1 - lr / nr) ** 2); if (!best || g < best.g) best = { g, f, t: (srt[i].x[f] + srt[i + 1].x[f]) / 2 }; } }
          if (!best) return leaf; return { f: best.f, t: best.t, L: build(S.filter((p) => p.x[best.f] <= best.t), d + 1), R: build(S.filter((p) => p.x[best.f] > best.t), d + 1) }; };
        const T = build(D, 0); return (x) => { let nd = T; while (nd.L) nd = x[nd.f] <= nd.t ? nd.L : nd.R; return nd.v; };
      },
      rf(D) { const r = rng(7), trees = []; for (let b = 0; b < 40; b++) { const S = Array.from({ length: D.length }, () => D[Math.floor(r() * D.length)]); trees.push(FIT.tree(S, { depth: 8, minLeaf: 2, r })); } return (x) => trees.reduce((a, t) => a + t(x), 0) / trees.length; },
      gbm(D) { const m = Lab.gbm.fit(D.map((p) => p.x), D.map((p) => p.y), { trees: 80, depth: 3, lr: 0.1, minLeaf: 4, bins: 32 }); return (x) => Math.min(1, Math.max(0, m.predict(x))); },
      svm(D) {
        const n = D.length, X = D.map((p) => p.x), y = D.map((p) => (p.y ? 1 : -1)), C = 3, g = 1, K = (a, b) => Math.exp(-g * ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)), Km = X.map((a) => X.map((b) => K(a, b))), al = new Array(n).fill(0); let b = 0, passes = 0, it = 0; const r = rng(3);
        const f = (i) => { let s = b; for (let k = 0; k < n; k++) if (al[k]) s += al[k] * y[k] * Km[k][i]; return s; };
        while (passes < 5 && it < 150) { it++; let ch = 0; for (let i = 0; i < n; i++) { const Ei = f(i) - y[i]; if (!((y[i] * Ei < -1e-3 && al[i] < C) || (y[i] * Ei > 1e-3 && al[i] > 0))) continue; let j = Math.floor(r() * (n - 1)); if (j >= i) j++; const Ej = f(j) - y[j], ai = al[i], aj = al[j], L = y[i] !== y[j] ? Math.max(0, aj - ai) : Math.max(0, ai + aj - C), H = y[i] !== y[j] ? Math.min(C, C + aj - ai) : Math.min(C, ai + aj); if (L >= H) continue; const eta = 2 * Km[i][j] - Km[i][i] - Km[j][j]; if (eta >= 0) continue; let nj = Math.min(H, Math.max(L, aj - (y[j] * (Ei - Ej)) / eta)); if (Math.abs(nj - aj) < 1e-6) continue; const ni = ai + y[i] * y[j] * (aj - nj); al[i] = ni; al[j] = nj; const b1 = b - Ei - y[i] * (ni - ai) * Km[i][i] - y[j] * (nj - aj) * Km[i][j], b2 = b - Ej - y[i] * (ni - ai) * Km[i][j] - y[j] * (nj - aj) * Km[j][j]; b = ni > 0 && ni < C ? b1 : nj > 0 && nj < C ? b2 : (b1 + b2) / 2; ch++; } passes = ch ? 0 : passes + 1; }
        const sv = al.map((a, i) => [a, i]).filter(([a]) => a > 1e-6); return (x) => sig(2 * sv.reduce((s, [a, i]) => s + a * y[i] * K(X[i], x), b));
      },
      mlp(D) {
        const H = 12, r = rng(5); let W1 = Array.from({ length: H }, () => [r.normal() * 0.8, r.normal() * 0.8]), b1 = new Array(H).fill(0).map(() => r.normal() * 0.5), W2 = new Array(H).fill(0).map(() => r.normal() * 0.5), b2 = 0;
        const P = [W1, b1, W2], m = { W1: W1.map((v) => [0, 0]), b1: b1.map(() => 0), W2: W2.map(() => 0), b2: 0 }, v = JSON.parse(JSON.stringify(m)); let t = 0;
        const fwd = (x) => { const h = W1.map((w, j) => Math.tanh(w[0] * x[0] + w[1] * x[1] + b1[j])); return [h, sig(h.reduce((s, hj, j) => s + hj * W2[j], b2))]; };
        const ad = (o, k, i, j, g) => { const lr = 0.03, B1 = 0.9, B2 = 0.999; if (j === undefined) { if (i === undefined) { m[k] = B1 * m[k] + (1 - B1) * g; v[k] = B2 * v[k] + (1 - B2) * g * g; return (lr * m[k] / (1 - B1 ** t)) / (Math.sqrt(v[k] / (1 - B2 ** t)) + 1e-8); } m[k][i] = B1 * m[k][i] + (1 - B1) * g; v[k][i] = B2 * v[k][i] + (1 - B2) * g * g; return (lr * m[k][i] / (1 - B1 ** t)) / (Math.sqrt(v[k][i] / (1 - B2 ** t)) + 1e-8); } m[k][i][j] = B1 * m[k][i][j] + (1 - B1) * g; v[k][i][j] = B2 * v[k][i][j] + (1 - B2) * g * g; return (lr * m[k][i][j] / (1 - B1 ** t)) / (Math.sqrt(v[k][i][j] / (1 - B2 ** t)) + 1e-8); };
        for (let ep = 0; ep < 500; ep++) {
          t++; const gW1 = W1.map(() => [0, 0]), gb1 = b1.map(() => 0), gW2 = W2.map(() => 0); let gb2 = 0;
          D.forEach((p) => { const [h, o] = fwd(p.x), e = (o - p.y) / D.length; gb2 += e; h.forEach((hj, j) => { gW2[j] += e * hj; const dh = e * W2[j] * (1 - hj * hj); gb1[j] += dh; gW1[j][0] += dh * p.x[0]; gW1[j][1] += dh * p.x[1]; }); });
          for (let j = 0; j < H; j++) { W1[j][0] -= ad(0, "W1", j, 0, gW1[j][0]); W1[j][1] -= ad(0, "W1", j, 1, gW1[j][1]); b1[j] -= ad(0, "b1", j, undefined, gb1[j]); W2[j] -= ad(0, "W2", j, undefined, gW2[j]); }
          b2 -= ad(0, "b2", undefined, undefined, gb2);
        }
        return (x) => fwd(x)[1];
      },
    };
    const RX = [-3, 3], RY = [-2.4, 2.4], G = 48;
    function runAll() {
      res = {};
      for (const [k] of MODELS) {
        const t0 = performance.now(), f = FIT[k](train), ms = performance.now() - t0, acc = (D) => D.reduce((s, p) => s + ((f(p.x) >= 0.5 ? 1 : 0) === p.y ? 1 : 0), 0) / D.length;
        const grid = []; for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) grid.push(f([RX[0] + ((RX[1] - RX[0]) * (i + 0.5)) / G, RY[0] + ((RY[1] - RY[0]) * (j + 0.5)) / G]));
        res[k] = { f, ms, tr: acc(train), te: acc(test), grid };
      }
    }
    const plots = {}; MODELS.forEach(([k]) => (plots[k] = new Plot($("#z-" + k), { x: RX, y: RY, pad: { l: 8, r: 8, t: 8, b: 8 } })));
    const PR = new Plot($("#rank"), { x: [0.4, 1], pad: { l: 200, r: 60, b: 32 } });
    function drawOne(k) {
      const P = plots[k], R = res[k], g = P.ctx; P.resize(); P.clear();
      for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) { const p = R.grid[i * G + j]; g.fillStyle = css(p >= 0.5 ? "--bad" : "--accent"); g.globalAlpha = 0.06 + 0.3 * Math.abs(p - 0.5) * 2; const x0 = Math.round(P.sx(RX[0] + ((RX[1] - RX[0]) * i) / G)), x1 = Math.round(P.sx(RX[0] + ((RX[1] - RX[0]) * (i + 1)) / G)), y0 = Math.round(P.sy(RY[0] + ((RY[1] - RY[0]) * (j + 1)) / G)), y1 = Math.round(P.sy(RY[0] + ((RY[1] - RY[0]) * j) / G)); g.fillRect(x0, y0, x1 - x0, y1 - y0); }
      g.globalAlpha = 1; train.forEach((p) => P.dot(p.x[0], p.x[1], 2.4, css(p.y ? "--bad" : "--accent"), css("--surface")));
      const best = Math.max(...Object.values(res).map((r) => r.te));
      $("#c-" + k).innerHTML = `test <b style="color:var(${R.te >= best - 0.005 ? "--good" : "--ink"})">${fmt(R.te * 100, 1)}%</b> · train ${fmt(R.tr * 100, 0)}%`;
    }
    function drawRank() {
      const order = MODELS.map(([k, n]) => [k, n, res[k].te]).sort((a, b) => b[2] - a[2]), g = PR.ctx, lo = Math.max(0.3, Math.floor((order[order.length - 1][2] - 0.05) * 10) / 10);
      PR.resize(); PR.x = [lo, 1]; PR.y = [0, order.length]; PR.clear(); PR.axes({ xLabel: "test accuracy", yLabel: "", yTicks: [], xFormat: (v) => Math.round(v * 100) + "%", xCount: 6 });
      const bh = PR.ih / order.length, se = (p) => Math.sqrt((p * (1 - p)) / test.length);
      order.forEach(([k, n, a], i) => { const y = PR.pad.t + i * bh; g.fillStyle = css(i === 0 ? "--good" : "--accent"); g.globalAlpha = 0.85; g.fillRect(PR.sx(lo), y + bh * 0.2, PR.sx(a) - PR.sx(lo), bh * 0.6); g.globalAlpha = 1;
        g.strokeStyle = css("--ink"); g.lineWidth = 1.2; g.beginPath(); g.moveTo(PR.sx(a - 1.96 * se(a)), y + bh / 2); g.lineTo(PR.sx(Math.min(1, a + 1.96 * se(a))), y + bh / 2); g.stroke();
        g.fillStyle = css("--ink"); g.font = "12px " + css("--font-body"); g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(n, PR.pad.l - 8, y + bh / 2); g.font = "11px " + css("--font-mono"); g.textAlign = "left"; g.fillText(fmt(a * 100, 1) + "%", PR.sx(Math.min(1, a + 1.96 * se(a))) + 5, y + bh / 2); });
      const top = order[0], close = order.filter((o) => o[2] >= top[2] - 1.96 * Math.sqrt(2) * se(top[2]));
      $("#rankCap").innerHTML = `Black whiskers: 95% range from test-set noise alone (±1.96 × √(p(1−p)/1000)). ${close.length > 1 ? `The top ${close.length} are within noise of each other: ${close.map((o) => o[1].split(" (")[0]).join(", ")}.` : `${top[1]} is clearly ahead on this data.`}`;
    }
    function tbl() {
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-body);white-space:nowrap"><thead><tr style="color:var(--muted);text-align:right"><th style="text-align:left;padding:4px 10px">model</th><th style="text-align:left;padding:4px 10px">boundary shape</th><th style="padding:4px 10px">train acc.</th><th style="padding:4px 10px">test acc.</th><th style="padding:4px 10px">gap</th><th style="padding:4px 10px">fit time</th></tr></thead><tbody>` +
        MODELS.map(([k, n, id, shape]) => { const R = res[k]; return `<tr style="border-top:1px solid var(--line);text-align:right"><td style="text-align:left;padding:4px 10px"><a href="#${id}">${n}</a></td><td style="text-align:left;padding:4px 10px;color:var(--muted)">${shape}</td><td style="padding:4px 10px;font-family:var(--font-mono)">${fmt(R.tr * 100, 1)}%</td><td style="padding:4px 10px;font-family:var(--font-mono);font-weight:600">${fmt(R.te * 100, 1)}%</td><td style="padding:4px 10px;font-family:var(--font-mono)">${fmt((R.tr - R.te) * 100, 1)}</td><td style="padding:4px 10px;font-family:var(--font-mono)">${fmt(R.ms, 0)} ms</td></tr>`; }).join("") + `</tbody></table><p class="hint" style="margin:8px 0 0">Gap = training minus test accuracy, in points. A big gap means the model memorised its training points (overfitting).</p>`;
    }
    function readouts() {
      const order = MODELS.map(([k, n]) => [n, res[k].te]).sort((a, b) => b[1] - a[1]);
      $("#ro").innerHTML = [["Best on test", `<span class="pill ok">${order[0][0].split(" (")[0]}</span>`], ["Its accuracy", `<span class="num">${fmt(order[0][1] * 100, 1)}%</span>`], ["Worst", `<span class="num">${order[order.length - 1][0].split(" (")[0]}, ${fmt(order[order.length - 1][1] * 100, 1)}%</span>`]]
        .map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function draw() { $("#nzV").textContent = fmt(+$("#nz").value, 2); $("#nV").textContent = $("#n").value; MODELS.forEach(([k]) => drawOne(k)); drawRank(); tbl(); readouts(); }
    let pend = 0; function full() { const my = ++pend; $("#nzV").textContent = fmt(+$("#nz").value, 2); $("#nV").textContent = $("#n").value; setTimeout(() => { if (my !== pend) return; gen(); runAll(); draw(); }, 30); }
    ["nz", "n"].forEach((id) => $("#" + id).addEventListener("input", full));
    root.querySelectorAll("#set button").forEach((b) => b.addEventListener("click", () => { root.querySelectorAll("#set button").forEach((x) => x.setAttribute("aria-pressed", x === b)); set = b.dataset.v; full(); }));
    $("#resim").addEventListener("click", () => { seed++; full(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); set = "moons"; seed = 1; root.querySelectorAll("#set button").forEach((b, i) => b.setAttribute("aria-pressed", i === 0)); full(); });
    gen(); runAll(); draw();
    return watch([...MODELS.map(([k]) => $("#z-" + k)), $("#rank")], () => { if (Object.keys(res).length) { MODELS.forEach(([k]) => drawOne(k)); drawRank(); } });
  },
});
