// A small gradient-boosted regression tree model (squared loss), shared by the boosting explainers.
// Lab.gbm.fit(X, y, { trees, depth, lr, minLeaf, bins, onTree }) -> { predict(x), predictAll(X), importance, trees, base }
(function () {
  function edgesFor(col, bins) {
    const s = col.slice().sort((a, b) => a - b), e = [];
    for (let b = 1; b < bins; b++) { const v = s[Math.floor((b / bins) * (s.length - 1))]; if (!e.length || v > e[e.length - 1]) e.push(v); }
    return e; // split candidates: x <= e[k]
  }

  function fit(X, y, o = {}) {
    const n = X.length, F = X[0].length, T = o.trees ?? 100, D = o.depth ?? 3, lr = o.lr ?? 0.1, minLeaf = o.minLeaf ?? 5, bins = o.bins ?? 24;
    const edges = Array.from({ length: F }, (_, f) => edgesFor(X.map((r) => r[f]), bins));
    // bin index of each sample for each feature: number of edges strictly below the value
    const bin = X.map((r) => r.map((v, f) => { const e = edges[f]; let lo = 0, hi = e.length; while (lo < hi) { const m = (lo + hi) >> 1; if (v <= e[m]) hi = m; else lo = m + 1; } return lo; }));
    const base = y.reduce((s, v) => s + v, 0) / n;
    const pred = new Float64Array(n).fill(base), res = new Float64Array(n), importance = new Array(F).fill(0), trees = [];

    function build(idx, depth) {
      let S = 0; for (const i of idx) S += res[i];
      const leaf = { value: (S / idx.length) * lr, n: idx.length };
      if (depth >= D || idx.length < 2 * minLeaf) return leaf;
      let best = null;
      for (let f = 0; f < F; f++) {
        const nb = edges[f].length + 1, sum = new Float64Array(nb), cnt = new Int32Array(nb);
        for (const i of idx) { const b = bin[i][f]; sum[b] += res[i]; cnt[b]++; }
        let sl = 0, cl = 0;
        for (let k = 0; k < nb - 1; k++) {
          sl += sum[k]; cl += cnt[k];
          const cr = idx.length - cl;
          if (cl < minLeaf || cr < minLeaf) continue;
          const sr = S - sl, gain = (sl * sl) / cl + (sr * sr) / cr - (S * S) / idx.length;
          if (!best || gain > best.gain) best = { f, k, gain };
        }
      }
      if (!best || best.gain <= 1e-12) return leaf;
      importance[best.f] += best.gain;
      const L = [], R = [];
      for (const i of idx) (bin[i][best.f] <= best.k ? L : R).push(i);
      return { f: best.f, t: edges[best.f][best.k], left: build(L, depth + 1), right: build(R, depth + 1), n: idx.length };
    }
    const walk = (node, x) => { while (node.left) node = x[node.f] <= node.t ? node.left : node.right; return node.value; };

    const all = Array.from({ length: n }, (_, i) => i);
    for (let t = 0; t < T; t++) {
      for (let i = 0; i < n; i++) res[i] = y[i] - pred[i];
      const tree = build(all, 0);
      trees.push(tree);
      for (let i = 0; i < n; i++) pred[i] += walk(tree, X[i]);
      if (o.onTree) o.onTree(t, pred);
    }
    const tot = importance.reduce((s, v) => s + v, 0) || 1;
    const predict = (x, upTo = trees.length) => { let p = base; for (let t = 0; t < upTo; t++) p += walk(trees[t], x); return p; };
    return { predict, predictAll: (Xs, upTo) => Xs.map((x) => predict(x, upTo)), importance: importance.map((v) => v / tot), trees, base, walk };
  }

  Lab.gbm = { fit };
})();
