Lab.register({
  id: "random-forest",
  group: "Machine learning",
  title: "Decision trees and random forests",
  blurb: "Grow one decision tree and see it overfit. Grow a hundred on shuffled data and let them vote. Every split rule is spelled out.",
  lede: "A decision tree classifies by asking a chain of yes/no questions like \"is x₁ below 0.42?\". One deep tree memorizes its training data. A random forest trains many trees, each on a random resample of the data, and lets them vote. The mistakes of individual trees cancel out.",
  quiz: [
    ["A node has 8 of class A and 2 of class B. What is its Gini impurity?", "1 − 0.8² − 0.2² = 1 − 0.64 − 0.04 = 0.32."],
    ["How does a tree choose a split?", "It tries every feature and threshold and picks the one that most reduces the weighted average impurity of the two child nodes."],
    ["What two kinds of randomness make a random forest?", "Each tree trains on a bootstrap sample of the rows (bagging), and each split considers only a random subset of features. Both make trees less alike, so their errors cancel when they vote."],
    ["What is the out-of-bag error?", "Each tree never sees about a third of the rows. Scoring each row using only the trees that didn't see it gives a free estimate of test error."],
  ],
  diy: {
    intro: "Two features in A2:B101, class (A or B) in C2:C101. This finds the best single split on feature 1, which is what each tree node does.",
    steps: [
      ["Gini of the whole set.", "F1: =1-(COUNTIF(C2:C101,\"A\")/100)^2-(COUNTIF(C2:C101,\"B\")/100)^2"],
      ["Candidate threshold t in E2 (try each sorted value of A). Counts on each side.", "nL: =COUNTIF(A2:A101,\"<\"&E2)\nnL_A: =COUNTIFS(A2:A101,\"<\"&E2,C2:C101,\"A\")"],
      ["Gini of the left and right groups.", "GL: =1-(nL_A/nL)^2-((nL-nL_A)/nL)^2\nGR: =1-(nR_A/nR)^2-((nR-nR_A)/nR)^2"],
      ["Weighted impurity after the split; pick the threshold with the lowest.", "=(nL*GL+nR*GR)/100"],
      ["Bootstrap sample for one tree: draw row numbers with replacement.", "=RANDBETWEEN(2,101)   (100 times, then INDEX the rows)"],
      ["Forest prediction = majority vote of the trees' predictions in J:S.", "=IF(COUNTIF(J2:S2,\"A\")>COUNTIF(J2:S2,\"B\"),\"A\",\"B\")"],
    ],
  },
  deeper: [
    ["Breiman (2001), Random forests, Machine Learning 45(1)", "https://doi.org/10.1023/A:1010933404324", "the original paper"],
    ["Breiman (1996), Bagging predictors, Machine Learning 24(2)", "https://doi.org/10.1007/BF00058655", "the bootstrap-and-vote idea"],
    ["James et al., An Introduction to Statistical Learning, ch. 8 (free PDF)", "https://www.statlearning.com/", "trees, bagging, forests and boosting"],
    ["Breiman, Friedman, Olshen & Stone, Classification and Regression Trees (1984)", "https://doi.org/10.1201/9781315139470", "CART, the tree algorithm inside"],
    ["Grinsztajn, Oyallon & Varoquaux (2022), Why do tree-based models still outperform deep learning on tabular data?, arXiv:2207.08815", "https://arxiv.org/abs/2207.08815", "why forests and boosting rule business data"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="38" y="4" width="20" height="10" rx="2"/><rect x="14" y="26" width="20" height="10" rx="2"/><rect x="62" y="26" width="20" height="10" rx="2"/><path d="M48 14 L24 26 M48 14 L72 26 M24 36 L14 50 M24 36 L34 50 M72 36 L64 50 M72 36 L82 50"/><circle cx="14" cy="54" r="4" fill="currentColor"/><circle cx="34" cy="54" r="4"/><circle cx="64" cy="54" r="4" fill="currentColor"/><circle cx="82" cy="54" r="4"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, css } = Lab;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot">
          <canvas id="rfc" aria-label="Decision regions and data points"></canvas>
          <div class="legend">
            <span><i style="background:var(--accent)"></i>Class A (teal)</span>
            <span><i style="background:var(--warm)"></i>Class B (orange)</span>
            <span>Shading = share of votes. Ringed points were not in the selected tree's bootstrap sample.</span>
          </div>
          <figcaption id="probe">Hover over the map to see how the trees vote at that spot. Click to add a point of the class chosen in the panel.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="rfa" aria-label="Accuracy as trees are added"></canvas>
          <div class="legend">
            <span><i style="background:var(--ink)"></i>Training accuracy</span>
            <span><i style="background:var(--accent)"></i>Out-of-bag accuracy</span>
            <span><i style="background:var(--warm)"></i>Test accuracy (400 fresh points)</span>
          </div>
          <figcaption>Accuracy of a forest made of the first n trees.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
            <h4 style="margin:0;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Inside <span id="treeName"></span></h4>
            <label style="font-size:.85rem;display:flex;gap:6px;align-items:center">Levels shown <select id="lv" style="width:auto"><option>2</option><option selected>3</option><option>4</option></select></label>
          </div>
          <p class="hint" style="margin:0 0 8px">Each box is a question; go left for yes, right for no. The bar shows the mix of classes reaching that box. Hover a box to light up its region on the map. Deeper branches are folded into "more splits".</p>
          <div style="overflow-x:auto"><svg id="tree" role="img" aria-label="Decision tree diagram" style="display:block"></svg></div>
          <details style="margin-top:10px"><summary style="cursor:pointer;font-size:.88rem">Full rule list (every node)</summary>
            <div id="rules" style="font:12.5px/1.6 var(--font-mono);overflow-x:auto;max-height:420px;overflow-y:auto;margin-top:8px"></div>
          </details>
        </div>`,
      panel: `
        <div class="ctrl">
          <label for="ds">Dataset</label>
          <select id="ds"><option value="moons">Two moons</option><option value="ring">Ring</option><option value="xor">Checkerboard (XOR)</option><option value="blobs">Overlapping blobs</option></select>
        </div>
        <div class="ctrl">
          <label for="noise">Noise <output id="noiseV"></output></label>
          <input type="range" id="noise" min="0" max="0.3" step="0.01" value="0.06">
        </div>
        <div>
          <h4>Show</h4>
          <div class="seg" role="group" aria-label="View">
            <button type="button" data-v="forest" aria-pressed="true">Whole forest</button>
            <button type="button" data-v="tree" aria-pressed="false">One tree</button>
          </div>
        </div>
        <div class="ctrl" id="treeCtl">
          <label for="ti">Tree to inspect <output id="tiV"></output></label>
          <input type="range" id="ti" min="1" max="50" step="1" value="1">
        </div>
        <div class="ctrl">
          <label for="nt">Number of trees <output id="ntV"></output></label>
          <input type="range" id="nt" min="1" max="150" step="1" value="50">
        </div>
        <div class="ctrl">
          <label for="md">Max depth <output id="mdV"></output></label>
          <input type="range" id="md" min="1" max="12" step="1" value="8">
        </div>
        <label class="check"><input type="checkbox" id="boot" checked> Bootstrap sample for each tree</label>
        <label class="check"><input type="checkbox" id="rfeat" checked> Random feature at each split</label>
        <div class="readouts">
          <div class="ro"><b>Training accuracy</b><span class="num" id="trA"></span></div>
          <div class="ro"><b>Out-of-bag accuracy</b><span class="num" id="oobA"></span></div>
          <div class="ro"><b>Test accuracy</b><span class="num" id="teA"></span></div>
          <div class="ro"><b>Single tree test accuracy</b><span class="num" id="t1A"></span></div>
        </div>
        <div class="ctrl">
          <label for="addc">Clicking adds</label>
          <div class="seg" role="group" aria-label="Class to add"><button type="button" data-c="0" aria-pressed="true">Class A</button><button type="button" data-c="1" aria-pressed="false">Class B</button></div>
        </div>
        <div class="btns"><button class="btn primary" id="regrow" type="button">Regrow the forest</button><button class="btn" id="newdata" type="button">New data</button></div>`,
      notes: `
        <section>
          <h2>How one tree grows</h2>
          <ol>
            <li>Start with all training points in one box.</li>
            <li>Try every possible cut on each feature (x₁ below some value, or x₂ below some value).</li>
            <li>Keep the cut that leaves the two halves purest, measured by <b>Gini impurity</b>.</li>
            <li>Repeat inside each half until a box is pure or the depth limit is reached. Each final box (a <b>leaf</b>) predicts its majority class.</li>
          </ol>
          <div class="eq">Gini = 1 − p<sub>A</sub>² − p<sub>B</sub>²&nbsp;&nbsp;(0 = pure, 0.5 = 50/50 mix)</div>
        </section>
        <section>
          <h2>What makes it a forest</h2>
          <ul>
            <li><b>Bootstrap</b>: each tree trains on n points drawn with replacement, so about 63% of the original points, some repeated. This is <b>bagging</b>.</li>
            <li><b>Random features</b>: at each split, a tree may only consider a random subset of features. That stops every tree from making the same first split and keeps the trees different.</li>
            <li><b>Vote</b>: the forest predicts whatever most trees predict. The shading on the map is the vote share.</li>
            <li><b>Out-of-bag (OOB)</b>: each point is scored only by trees that never saw it, giving a free estimate of test accuracy.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Look at the tree diagram. The first question splits the data roughly in half; hover each box to see the region it covers on the map.</li>
            <li>Set trees to 1 and depth to 12. The single tree draws boxy islands around individual noisy points: overfitting. Compare its test accuracy with the 50-tree forest.</li>
            <li>Switch to "One tree" and step through trees 1, 2, 3. Each is jagged in a different way. Switch back to the forest and the jaggedness averages out.</li>
            <li>Untick both bootstrap and random features. Every tree is now identical, so the forest is no better than one tree.</li>
            <li>Watch the accuracy chart: test accuracy climbs quickly over the first 10 to 20 trees, then flattens. More trees rarely hurt, they just stop helping.</li>
            <li>Try the checkerboard at depth 1. A single cut can't separate it, no matter how many trees vote.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const map = new Plot($("#rfc"), { x: [0, 1], y: [0, 1], pad: { l: 40, b: 32 } });
    const acc = new Plot($("#rfa"), { x: [1, 50], y: [0.5, 1], pad: { b: 30, t: 10 } });
    let train = [], test = [], trees = [], view = "forest", addClass = 0, dataSeed = 4, forestSeed = 1, bg = null, curve = [], hl = null;

    function gen(kind, n, noise, r) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        let x, y, c;
        if (kind === "moons") {
          c = i % 2; const t = Math.PI * r();
          x = c ? 0.5 + 0.28 * (1 - Math.cos(t)) - 0.14 : 0.36 + 0.28 * Math.cos(t);
          y = c ? 0.5 - 0.28 * Math.sin(t) + 0.12 : 0.42 + 0.28 * Math.sin(t);
        } else if (kind === "ring") {
          c = i % 2; const a = 2 * Math.PI * r(), rad = c ? 0.36 + 0.04 * r() : 0.15 * Math.sqrt(r());
          x = 0.5 + rad * Math.cos(a); y = 0.5 + rad * Math.sin(a);
        } else if (kind === "xor") {
          x = r(); y = r(); c = (x > 0.5) !== (y > 0.5) ? 1 : 0;
        } else {
          c = i % 2; x = (c ? 0.62 : 0.38) + 0.13 * r.normal(); y = (c ? 0.6 : 0.4) + 0.13 * r.normal();
        }
        x += noise * r.normal(); y += noise * r.normal();
        pts.push({ x: Math.min(0.99, Math.max(0.01, x)), y: Math.min(0.99, Math.max(0.01, y)), c });
      }
      return pts;
    }

    const gini = (n0, n1) => { const n = n0 + n1; return n ? 1 - (n0 / n) ** 2 - (n1 / n) ** 2 : 0; };

    function grow(idx, depth, maxD, r, randFeat) {
      let n1 = 0; for (const i of idx) n1 += train[i].c; const n0 = idx.length - n1;
      const node = { n0, n1, g: gini(n0, n1), pred: n1 > n0 ? 1 : n1 < n0 ? 0 : (r() < 0.5 ? 0 : 1) };
      if (depth >= maxD || n0 === 0 || n1 === 0 || idx.length < 2) return node;
      const feats = randFeat ? [r() < 0.5 ? "x" : "y"] : ["x", "y"];
      let best = null;
      for (const f of feats) {
        const s = idx.slice().sort((a, b) => train[a][f] - train[b][f]);
        let l0 = 0, l1 = 0;
        for (let k = 0; k < s.length - 1; k++) {
          if (train[s[k]].c) l1++; else l0++;
          const v0 = train[s[k]][f], v1 = train[s[k + 1]][f];
          if (v1 - v0 < 1e-9) continue;
          const nl = k + 1, nr = s.length - nl;
          const score = (nl * gini(l0, l1) + nr * gini(n0 - l0, n1 - l1)) / s.length;
          if (!best || score < best.score - 1e-12) best = { score, f, t: (v0 + v1) / 2, k, s };
        }
      }
      if (!best || best.score >= node.g - 1e-12) return node;
      node.f = best.f; node.t = best.t; node.after = best.score;
      node.l = grow(best.s.slice(0, best.k + 1), depth + 1, maxD, r, randFeat);
      node.r = grow(best.s.slice(best.k + 1), depth + 1, maxD, r, randFeat);
      return node;
    }
    const predict = (node, p) => { while (node.l) node = p[node.f] < node.t ? node.l : node.r; return node.pred; };

    function growForest() {
      const r = rng(forestSeed), n = train.length, maxD = +$("#md").value, boot = $("#boot").checked, rf = $("#rfeat").checked;
      trees = [];
      for (let k = 0; k < +$("#nt").value; k++) {
        const idx = boot ? Array.from({ length: n }, () => Math.floor(r() * n)) : train.map((_, i) => i);
        const inBag = new Uint8Array(n); idx.forEach((i) => (inBag[i] = 1));
        trees.push({ root: grow(idx, 0, maxD, r, rf), inBag });
      }
      // accuracy curves for forests of the first m trees
      const votesTr = new Array(n).fill(0), oobV = Array.from({ length: n }, () => [0, 0]), votesTe = new Array(test.length).fill(0);
      curve = [];
      trees.forEach((t, m) => {
        train.forEach((p, i) => { const v = predict(t.root, p); votesTr[i] += v; if (!t.inBag[i]) oobV[i][v]++; });
        test.forEach((p, i) => (votesTe[i] += predict(t.root, p)));
        const k = m + 1;
        const trA = train.filter((p, i) => (votesTr[i] * 2 > k ? 1 : 0) === p.c).length / n;
        const teA = test.filter((p, i) => (votesTe[i] * 2 > k ? 1 : 0) === p.c).length / test.length;
        const scored = oobV.map((v, i) => [v, i]).filter(([v]) => v[0] + v[1] > 0);
        const oobA = scored.length ? scored.filter(([v, i]) => (v[1] > v[0] ? 1 : 0) === train[i].c).length / scored.length : NaN;
        curve.push({ trA, teA, oobA });
      });
      $("#ti").max = trees.length;
      if (+$("#ti").value > trees.length) $("#ti").value = trees.length;
      bg = null;
    }

    function votesAt(p) { let v = 0; for (const t of trees) v += predict(t.root, p); return v; }
    const hex = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };

    function renderBg() {
      const W = Math.max(60, Math.round(map.iw / 4)), H = Math.max(60, Math.round(map.ih / 4));
      const off = document.createElement("canvas"); off.width = W; off.height = H;
      const g = off.getContext("2d"), img = g.createImageData(W, H);
      const a = hex(css("--accent")), b = hex(css("--warm")), s = hex(css("--surface"));
      const single = view === "tree" ? trees[+$("#ti").value - 1] : null;
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const p = { x: (i + 0.5) / W, y: 1 - (j + 0.5) / H };
        const share = single ? predict(single.root, p) : votesAt(p) / trees.length;
        const col = share >= 0.5 ? b : a, conf = Math.abs(share - 0.5) * 2;
        const q = 0.12 + 0.38 * conf, k = (j * W + i) * 4;
        for (let c = 0; c < 3; c++) img.data[k + c] = s[c] + (col[c] - s[c]) * q;
        img.data[k + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      bg = off;
    }

    function rulesHTML(node, depth, path) {
      const mix = `<span style="color:var(--accent)">${node.n0}A</span> / <span style="color:var(--warm)">${node.n1}B</span>`;
      const stat = `<span style="color:var(--muted)">n=${node.n0 + node.n1} · ${mix} · gini ${node.g.toFixed(3)}</span>`;
      if (!node.l) return `<div style="padding-left:${depth ? 16 : 0}px">${path} → <b style="color:var(${node.pred ? "--warm" : "--accent"})">predict ${node.pred ? "B" : "A"}</b> ${stat}</div>`;
      const nm = node.f === "x" ? "x₁" : "x₂";
      return `<details open style="padding-left:${depth ? 16 : 0}px"><summary style="cursor:pointer">${path} ${stat}${depth === 0 ? ` <span style="color:var(--violet)">best split lowers weighted gini to ${node.after.toFixed(3)}</span>` : ""}</summary>
        ${rulesHTML(node.l, depth + 1, `if ${nm} &lt; ${node.t.toFixed(3)}`)}${rulesHTML(node.r, depth + 1, `if ${nm} ≥ ${node.t.toFixed(3)}`)}</details>`;
    }

    function treeSVG(t) {
      const L = +$("#lv").value, BW = 112, BH = 52, GAP = 12, RH = 82;
      let slot = 0;
      const nodes = [], edges = [];
      const count = (n) => (n.l ? 1 + count(n.l) + count(n.r) : 0);
      function lay(n, d, box, parent, side) {
        const me = { n, d, box, folded: d === L && !!n.l };
        if (n.l && !me.folded) {
          const lb = { ...box }, rb = { ...box };
          if (n.f === "x") { lb.x1 = n.t; rb.x0 = n.t; } else { lb.y1 = n.t; rb.y0 = n.t; }
          const a = lay(n.l, d + 1, lb, me, "yes"), b = lay(n.r, d + 1, rb, me, "no");
          me.x = (a.x + b.x) / 2;
        } else me.x = slot++ * (BW + GAP) + BW / 2;
        me.y = d * RH + BH / 2 + 4;
        if (parent) edges.push([parent, me, side]);
        nodes.push(me);
        return me;
      }
      lay(t.root, 0, { x0: 0, x1: 1, y0: 0, y1: 1 }, null);
      const W = slot * (BW + GAP), H = (Math.max(...nodes.map((m) => m.d)) + 1) * RH;
      const nm = (f) => (f === "x" ? "x₁" : "x₂");
      const svg = $("#tree");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
      svg.style.minWidth = "100%";
      const txt = (x, y, s, o = "") => `<text x="${x}" y="${y}" text-anchor="middle" ${o}>${s}</text>`;
      svg.innerHTML =
        edges.map(([a, b, side]) => {
          const y1 = a.y + BH / 2, y2 = b.y - BH / 2;
          return `<path d="M${a.x} ${y1} C ${a.x} ${y1 + 22}, ${b.x} ${y2 - 22}, ${b.x} ${y2}" fill="none" stroke="var(--line)" stroke-width="2"/>` +
            txt((a.x + b.x) / 2 + (side === "yes" ? -10 : 10), (y1 + y2) / 2, side, `font-size="10" fill="var(--muted)" font-family="var(--font-mono)"`);
        }).join("") +
        nodes.map((m, i) => {
          const n = m.n, tot = n.n0 + n.n1, leaf = !n.l, x = m.x - BW / 2, y = m.y - BH / 2;
          const maj = n.n1 > n.n0 ? "--warm" : "--accent";
          const head = leaf ? `predict ${n.pred ? "B" : "A"}` : m.folded ? `+${count(n)} more splits` : `${nm(n.f)} &lt; ${n.t.toFixed(2)} ?`;
          const stroke = leaf ? `var(${n.pred ? "--warm" : "--accent"})` : "var(--line)";
          return `<g data-i="${i}" style="cursor:pointer">
            <rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="7" fill="${leaf ? `var(${n.pred ? "--warm-soft" : "--accent-soft"})` : "var(--surface)"}" stroke="${stroke}" stroke-width="${leaf ? 2 : 1.5}" ${m.folded ? 'stroke-dasharray="4 3"' : ""}/>
            ${txt(m.x, y + 17, head, `font-size="12" font-weight="600" fill="${m.folded ? "var(--muted)" : "var(--ink)"}" font-family="var(--font-mono)"`)}
            ${txt(m.x, y + 31, `n=${tot} · gini ${n.g.toFixed(2)}`, `font-size="10" fill="var(--muted)" font-family="var(--font-mono)"`)}
            <rect x="${x + 10}" y="${y + 38}" width="${(BW - 20) * (n.n0 / tot)}" height="6" fill="var(--accent)"/>
            <rect x="${x + 10 + (BW - 20) * (n.n0 / tot)}" y="${y + 38}" width="${(BW - 20) * (n.n1 / tot)}" height="6" fill="var(--warm)"/>
          </g>`;
        }).join("");
      svg.querySelectorAll("g[data-i]").forEach((gEl) => {
        const m = nodes[+gEl.dataset.i];
        gEl.addEventListener("pointerenter", () => { hl = m.box; draw(true); });
        gEl.addEventListener("pointerleave", () => { hl = null; draw(true); });
      });
    }

    function draw(mapOnly = false) {
      $("#noiseV").textContent = (+$("#noise").value).toFixed(2);
      $("#ntV").textContent = $("#nt").value; $("#mdV").textContent = $("#md").value; $("#tiV").textContent = $("#ti").value;
      $("#treeCtl").hidden = view !== "tree";
      if (!bg) renderBg();
      map.clear();
      map.ctx.imageSmoothingEnabled = view !== "tree";
      map.ctx.drawImage(bg, map.pad.l, map.pad.t, map.iw, map.ih);
      map.axes({ xLabel: "x₁", yLabel: "x₂", xCount: 5, yCount: 5 });
      const t = trees[+$("#ti").value - 1];
      train.forEach((p, i) => {
        map.dot(p.x, p.y, 4.5, css(p.c ? "--warm" : "--accent"), css("--surface"));
        if (view === "tree" && t && !t.inBag[i]) map.dot(p.x, p.y, 7.5, null, css("--ink"));
      });
      if (hl) {
        const g = map.ctx, x0 = map.sx(hl.x0), x1 = map.sx(hl.x1), y0 = map.sy(hl.y1), y1 = map.sy(hl.y0);
        g.save(); g.fillStyle = css("--ink"); g.globalAlpha = 0.35;
        g.beginPath(); g.rect(map.pad.l, map.pad.t, map.iw, map.ih); g.rect(x0, y0, x1 - x0, y1 - y0); g.fill("evenodd");
        g.globalAlpha = 1; g.strokeStyle = css("--ink"); g.lineWidth = 2.5; g.strokeRect(x0, y0, x1 - x0, y1 - y0); g.restore();
      }
      if (mapOnly) return;

      acc.x = [1, Math.max(2, curve.length)];
      const lo = Math.min(...curve.map((c) => Math.min(c.teA, isFinite(c.oobA) ? c.oobA : 1))) - 0.05;
      acc.y = [Math.max(0, Math.floor(lo * 20) / 20), 1.01];
      acc.clear();
      acc.axes({ xLabel: "trees", yCount: 4, yFormat: (v) => Math.round(v * 100) + "%" });
      const xs = curve.map((_, i) => i + 1);
      acc.path(xs, curve.map((c) => c.trA), css("--ink"), 1.5);
      acc.path(xs, curve.map((c) => c.oobA), css("--accent"), 2);
      acc.path(xs, curve.map((c) => c.teA), css("--warm"), 2.5);

      const last = curve[curve.length - 1], pc = (v) => (isFinite(v) ? (v * 100).toFixed(1) + "%" : "–");
      $("#trA").textContent = pc(last.trA); $("#oobA").textContent = pc(last.oobA); $("#teA").textContent = pc(last.teA);
      $("#t1A").textContent = pc(test.filter((p) => predict(trees[0].root, p) === p.c).length / test.length);
      $("#treeName").textContent = `tree ${$("#ti").value}${view === "forest" ? " (switch to One tree to pick another)" : ""}`;
      $("#rules").innerHTML = rulesHTML(t.root, 0, "all points");
      treeSVG(t);
    }

    function rebuild(newData) {
      if (newData) {
        const r = rng(dataSeed), kind = $("#ds").value, nz = +$("#noise").value;
        train = gen(kind, 200, nz, r); test = gen(kind, 400, nz, r);
      }
      growForest(); draw();
    }

    root.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => {
      view = b.dataset.v; root.querySelectorAll("[data-v]").forEach((o) => o.setAttribute("aria-pressed", String(o === b))); bg = null; draw();
    }));
    root.querySelectorAll("[data-c]").forEach((b) => b.addEventListener("click", () => {
      addClass = +b.dataset.c; root.querySelectorAll("[data-c]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    }));
    $("#ds").addEventListener("change", () => rebuild(true));
    $("#noise").addEventListener("input", () => rebuild(true));
    ["#nt", "#md", "#boot", "#rfeat"].forEach((s) => $(s).addEventListener("input", () => rebuild(false)));
    $("#ti").addEventListener("input", () => { bg = null; draw(); });
    $("#lv").addEventListener("change", () => draw());
    $("#regrow").addEventListener("click", () => { forestSeed++; rebuild(false); });
    $("#newdata").addEventListener("click", () => { dataSeed++; rebuild(true); });
    map.c.addEventListener("pointermove", (e) => {
      const r = map.c.getBoundingClientRect(), p = { x: map.ix(e.clientX - r.left), y: map.iy(e.clientY - r.top) };
      if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return;
      const v = votesAt(p), n = trees.length;
      $("#probe").innerHTML = `At (${p.x.toFixed(2)}, ${p.y.toFixed(2)}): <b style="color:var(--warm)">${v} of ${n}</b> trees vote B, <b style="color:var(--accent)">${n - v}</b> vote A, so the forest says <b>${v * 2 > n ? "B" : "A"}</b>.`;
    });
    map.c.addEventListener("click", (e) => {
      const r = map.c.getBoundingClientRect(), x = map.ix(e.clientX - r.left), y = map.iy(e.clientY - r.top);
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      train.push({ x, y, c: addClass }); rebuild(false);
    });
    map.c.style.cursor = "crosshair";

    rebuild(true);
    return watch([map.c, acc.c], (resized) => { if (resized) { map.resize(); acc.resize(); } bg = null; draw(); });
  },
});
