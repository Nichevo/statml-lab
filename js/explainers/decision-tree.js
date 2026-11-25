Lab.register({
  id: "decision-tree",
  group: "Machine learning",
  title: "One decision tree, split by split",
  blurb: "Watch a tree learn which orders ship late, one split at a time. See every threshold it tried, the Gini sums behind the winner, and the point where more splits start to hurt.",
  lede: "A decision tree is a flowchart the computer writes for itself. At each step it tries every possible yes/no question (“is distance over 540 km?”), keeps the one that best separates late orders from on-time ones, and repeats inside each branch. It's easy to read, needs no scaling, and is the building block of random forests and gradient boosting. Left alone it keeps splitting until it memorises the noise.",
  quiz: [
    ["A node holds 30 orders: 12 late, 18 on time. What's its Gini impurity?", "1 − 0.4² − 0.6² = 1 − 0.16 − 0.36 = 0.48. A pure node scores 0; a 50/50 node scores 0.5 (with two classes)."],
    ["How does the tree pick the split at a node?", "It tries every feature and every threshold between neighbouring values, computes the size-weighted Gini of the two child groups, and keeps the split with the lowest. The drop from the parent's Gini is the gain."],
    ["Training accuracy keeps rising as you add splits but test accuracy peaks and falls. Why?", "Late splits carve out tiny boxes around a handful of noisy orders. They fit those exact orders but don't repeat in new data: overfitting. Stop early (minimum leaf size, max depth) or grow fully and prune back using validation data."],
    ["Why do trees not need features to be scaled?", "A split only asks whether a value is above or below a threshold, so stretching a feature's units moves the threshold but not which orders go left or right."],
    ["Why are single trees unstable, and what fixes that?", "A small change in the data can change the first split, and everything below it changes too. Averaging many trees (random forest) or adding small trees in sequence (gradient boosting) smooths that out."],
  ],
  diy: {
    intro: "Orders in rows 2–201: distance (km) in A, order size (units) in B, late flag (1/0) in C. This scores one candidate split on distance.",
    steps: [
      ["Gini of the whole set: p = share late.", "E1: =AVERAGE(C2:C201)   E2: =1-E1^2-(1-E1)^2"],
      ["Pick a threshold, e.g. 540 km. Count and share late on each side.", "nL: =COUNTIF(A2:A201,\"<=540\")   pL: =AVERAGEIFS(C2:C201,A2:A201,\"<=540\")   (same with \">540\" for the right)"],
      ["Gini of each side.", "gL: =1-pL^2-(1-pL)^2   gR: =1-pR^2-(1-pR)^2"],
      ["Weighted Gini of the split, and the gain.", "=(nL*gL+nR*gR)/(nL+nR)   gain: =E2-that"],
      ["Try many thresholds: put candidates in a column and fill the formulas down; the smallest weighted Gini wins. Repeat for order size.", "=MIN(weighted Gini column), =INDEX(threshold column, MATCH(MIN(...), weighted column, 0))"],
      ["Prediction from a fitted two-level tree.", "=IF(A2>540, IF(B2>42, \"late\", \"on time\"), \"on time\")"],
    ],
  },
  deeper: [
    ["Breiman, Friedman, Olshen & Stone (1984), Classification and Regression Trees, Wadsworth", "https://doi.org/10.1201/9781315139470", "CART, the method shown here"],
    ["Quinlan (1986), Induction of decision trees, Machine Learning 1", "https://doi.org/10.1007/BF00116251", "ID3 and information gain"],
    ["James, Witten, Hastie & Tibshirani, An Introduction to Statistical Learning, ch. 8 Tree-based methods (free PDF)", "https://www.statlearning.com/", "trees, pruning and ensembles"],
    ["scikit-learn user guide: Decision trees", "https://scikit-learn.org/stable/modules/tree.html", "practical settings: depth, leaf size, pruning"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="38" y="4" width="20" height="10" rx="2"/><path d="M48 14 L26 30 M48 14 L70 30"/><rect x="16" y="30" width="20" height="10" rx="2"/><rect x="60" y="30" width="20" height="10" rx="2"/><path d="M70 40 L60 54 M70 40 L80 54"/><circle cx="26" cy="54" r="4" fill="currentColor"/><circle cx="60" cy="56" r="4"/><circle cx="80" cy="56" r="4" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const MAXS = 24, F = ["distance (km)", "order size (units)"], FS = ["distance", "size"], RANGE = [[0, 1000], [0, 100]];
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);
    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Orders and the tree's boxes")}</div><canvas id="d1" style="height:320px" aria-label="Orders by distance and size with the tree's decision regions"></canvas><figcaption id="d1Cap"></figcaption></figure>`,
          `<div class="plot" style="padding:14px">${h4("The tree so far (click a node)")}<div id="tree" style="font:.78rem/1.5 var(--font-mono)"></div></div>`)}
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Every split tried at the selected node")}</div><canvas id="d2" aria-label="Weighted Gini against threshold"></canvas><figcaption id="d2Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Accuracy as the tree grows")}</div><canvas id="d3" aria-label="Training and test accuracy against number of splits"></canvas><figcaption id="d3Cap"></figcaption></figure>`)}
        <div class="plot wide" style="padding:14px">${h4("Worked out for the selected node")}<div id="work" style="font:.8rem/1.8 var(--font-mono);overflow-x:auto"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">200 past orders (training) and 2,000 new ones (test). Long-distance, large orders are usually late; very large local orders are sometimes late too.</p>
        <div class="ctrl"><label for="k">Splits made so far <output id="kV"></output></label><input type="range" id="k" min="0" max="${MAXS}" step="1" value="3"></div>
        <div class="ctrl"><label for="ml">Smallest leaf allowed (orders) <output id="mlV"></output></label><input type="range" id="ml" min="1" max="30" step="1" value="3"></div>
        <div class="ctrl"><label for="nz">Label noise (orders that are late or on time for no visible reason) <output id="nzV"></output></label><input type="range" id="nz" min="0" max="0.3" step="0.01" value="0.1"></div>
        <div class="ctrl"><label>Scan which feature at the selected node</label><div class="seg" id="ft">${F.map((f, i) => `<button type="button" data-v="${i}" aria-pressed="${i === 0}">${FS[i]}</button>`).join("")}</div></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn primary" id="step" type="button">Make the next split</button><button class="btn" id="best" type="button">Jump to best test accuracy</button><button class="btn" id="resim" type="button">New orders</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Gini impurity</h2>
          <p>For a group with a share p of late orders, Gini = 1 − p² − (1 − p)². It's the chance that two orders drawn at random from the group have different labels: 0 when the group is pure, 0.5 when it's half and half.</p>
          <div class="eq">weighted Gini of a split = (n<sub>left</sub> × Gini<sub>left</sub> + n<sub>right</sub> × Gini<sub>right</sub>) / n &nbsp;&nbsp; gain = Gini<sub>parent</sub> − weighted Gini</div>
          <p>Entropy (information gain) is the other common choice. It almost always picks the same splits.</p>
        </section>
        <section>
          <h2>Growing the tree</h2>
          <p>This page grows <b>best-first</b>: at each step it looks at every leaf, finds each one's best split, and makes the one that removes the most total impurity (gain × orders in the leaf). Many libraries grow depth-first to a maximum depth instead; the splits found are the same, only the order differs.</p>
          <p>The “smallest leaf” rule refuses any split that leaves fewer orders than that on one side. Raising it is the simplest guard against overfitting.</p>
        </section>
        <section>
          <h2>Pruning</h2>
          <p>Rather than guessing when to stop, CART grows a big tree and then prunes it back: it removes the splits that add least for their size, giving a sequence of smaller trees, and picks the one that does best on validation data. The accuracy chart is that idea: test accuracy against the number of splits.</p>
        </section>
        <section>
          <h2>Strengths and weaknesses</h2>
          <ul>
            <li><b>Good</b>: readable rules; handles mixed units, missing values and interactions; no scaling needed.</li>
            <li><b>Bad</b>: boxy boundaries (a diagonal edge needs a staircase of splits), unstable, and rarely the most accurate alone.</li>
          </ul>
          <p>That's why trees are usually used in groups: <a href="#random-forest">random forests</a> average many; <a href="#gradient-boosting">gradient boosting</a> adds small ones in sequence. <a href="#model-zoo">The model zoo</a> compares a tree with other classifiers on the same data.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Step through the first three splits and check each one's Gini sums in the worked panel.</li>
            <li>Set label noise to 0.25 and splits to 24: training accuracy climbs while test accuracy falls.</li>
            <li>Raise the smallest leaf to 20: the tree stops early and test accuracy holds up.</li>
            <li>Click a leaf that hasn't been split and scan both features: the lowest point of the curve is the split it would make next.</li>
          </ul>
        </section>`,
    });

    let seed = 5, train = [], test = [], nodes = [], order = [], sel = 0, feat = 0;
    const truth = (d, s) => (d > 540 && s > 42 ? 0.88 : d < 220 && s > 80 ? 0.7 : d > 800 ? 0.45 : 0.08);
    function gen() {
      const r = rng(seed), nz = +$("#nz").value, mk = (n) => Array.from({ length: n }, () => { const d = r() * 1000, s = r() * 100, p = truth(d, s); let y = r() < p ? 1 : 0; if (r() < nz) y = 1 - y; return { x: [d, s], y }; });
      train = mk(200); test = mk(2000);
    }
    const gini = (n, l) => (n ? 1 - (l / n) ** 2 - (1 - l / n) ** 2 : 0);
    function scan(idx, f, ml) {
      const pts = idx.map((i) => train[i]).sort((a, b) => a.x[f] - b.x[f]), n = pts.length, L = pts.reduce((s, p) => s + p.y, 0), out = [];
      let nl = 0, ll = 0;
      for (let i = 0; i < n - 1; i++) { nl++; ll += pts[i].y; if (pts[i].x[f] === pts[i + 1].x[f]) continue; const nr = n - nl, lr = L - ll, w = (nl * gini(nl, ll) + nr * gini(nr, lr)) / n; out.push({ t: (pts[i].x[f] + pts[i + 1].x[f]) / 2, w, ok: nl >= ml && nr >= ml, nl, ll, nr, lr }); }
      return out;
    }
    function bestSplit(node, ml) {
      let b = null;
      for (let f = 0; f < 2; f++) for (const c of scan(node.idx, f, ml)) if (c.ok && (!b || c.w < b.w - 1e-12)) b = { ...c, f };
      return b && node.g - b.w > 1e-9 ? b : null;
    }
    function grow() {
      const ml = +$("#ml").value, all = train.map((_, i) => i), L = train.reduce((s, p) => s + p.y, 0);
      nodes = [{ idx: all, n: all.length, late: L, g: gini(all.length, L), depth: 0, parent: -1, kids: null, ord: Infinity, box: [[...RANGE[0]], [...RANGE[1]]] }]; order = [];
      nodes[0].best = bestSplit(nodes[0], ml);
      for (let k = 0; k < MAXS; k++) {
        let bi = -1, bv = 0;
        nodes.forEach((nd, i) => { if (!nd.kids && nd.best) { const v = (nd.g - nd.best.w) * nd.n; if (v > bv) { bv = v; bi = i; } } });
        if (bi < 0) break;
        const nd = nodes[bi], b = nd.best; nd.ord = k; order.push(bi); nd.split = b;
        const li = nd.idx.filter((i) => train[i].x[b.f] <= b.t), ri = nd.idx.filter((i) => train[i].x[b.f] > b.t);
        const mkKid = (idx, side) => { const l = idx.reduce((s, i) => s + train[i].y, 0), box = nd.box.map((r) => r.slice()); box[b.f][side ? 0 : 1] = b.t; const kid = { idx, n: idx.length, late: l, g: gini(idx.length, l), depth: nd.depth + 1, parent: bi, kids: null, ord: Infinity, box, side }; kid.best = bestSplit(kid, ml); nodes.push(kid); return nodes.length - 1; };
        nd.kids = [mkKid(li, 0), mkKid(ri, 1)];
      }
    }
    const K = () => Math.min(+$("#k").value, order.length);
    const isSplit = (i, k) => nodes[i].ord < k;
    function leafOf(x, k) { let i = 0; while (isSplit(i, k)) { const s = nodes[i].split; i = nodes[i].kids[x[s.f] <= s.t ? 0 : 1]; } return i; }
    const predLeaf = (i) => (nodes[i].late * 2 >= nodes[i].n ? 1 : 0);
    const acc = (data, k) => data.reduce((s, p) => s + (predLeaf(leafOf(p.x, k)) === p.y ? 1 : 0), 0) / data.length;
    let curve = [];
    function curves() { curve = []; for (let k = 0; k <= order.length; k++) curve.push([acc(train, k), acc(test, k)]); }

    const P1 = new Plot($("#d1"), { x: RANGE[0], y: RANGE[1], pad: { l: 44, b: 38 } }), P2 = new Plot($("#d2"), { pad: { l: 50, b: 38 } }), P3 = new Plot($("#d3"), { x: [0, MAXS], pad: { l: 46, b: 38 } });
    function d1() {
      const k = K(); P1.resize(); P1.clear(); P1.axes({ xLabel: F[0], yLabel: F[1], xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0), xCount: 5 });
      const g = P1.ctx;
      nodes.forEach((nd, i) => { const isLeaf = !isSplit(i, k) && (nd.parent < 0 || isSplit(nd.parent, k)); if (!isLeaf) return; const [bx, by] = nd.box; g.fillStyle = css(predLeaf(i) ? "--bad" : "--accent"); g.globalAlpha = 0.07 + 0.18 * Math.abs(nd.late / nd.n - 0.5) * 2; g.fillRect(P1.sx(bx[0]), P1.sy(by[1]), P1.sx(bx[1]) - P1.sx(bx[0]), P1.sy(by[0]) - P1.sy(by[1])); g.globalAlpha = 1;
        if (i === sel) { g.strokeStyle = css("--warm"); g.lineWidth = 2.5; g.strokeRect(P1.sx(bx[0]), P1.sy(by[1]), P1.sx(bx[1]) - P1.sx(bx[0]), P1.sy(by[0]) - P1.sy(by[1])); } });
      g.strokeStyle = css("--ink"); g.lineWidth = 1.2;
      order.slice(0, k).forEach((ni) => { const nd = nodes[ni], s = nd.split, [bx, by] = nd.box; g.beginPath(); if (s.f === 0) { g.moveTo(P1.sx(s.t), P1.sy(by[0])); g.lineTo(P1.sx(s.t), P1.sy(by[1])); } else { g.moveTo(P1.sx(bx[0]), P1.sy(s.t)); g.lineTo(P1.sx(bx[1]), P1.sy(s.t)); } g.stroke(); });
      if (selNode().ord >= k && selNode().best && !isSplit(sel, k)) { const s = selNode().best, [bx, by] = selNode().box; g.setLineDash([5, 4]); g.strokeStyle = css("--warm"); g.lineWidth = 2; g.beginPath(); if (s.f === 0) { g.moveTo(P1.sx(s.t), P1.sy(by[0])); g.lineTo(P1.sx(s.t), P1.sy(by[1])); } else { g.moveTo(P1.sx(bx[0]), P1.sy(s.t)); g.lineTo(P1.sx(bx[1]), P1.sy(s.t)); } g.stroke(); g.setLineDash([]); }
      train.forEach((p) => P1.dot(p.x[0], p.x[1], 3.2, p.y ? css("--bad") : css("--accent"), css("--surface")));
      $("#d1Cap").innerHTML = `Red: late; blue: on time. Shading: what each box predicts (stronger = purer). Orange outline: the selected node${!isSplit(sel, k) && selNode().best ? "; dashed: the split it would make next" : ""}.`;
    }
    const selNode = () => nodes[sel] || nodes[0];
    function d2() {
      const nd = selNode(), ml = +$("#ml").value, c = scan(nd.idx, feat, ml);
      P2.resize(); P2.x = RANGE[feat]; const ws = c.map((v) => v.w), lo = Math.min(nd.g, ...ws, 0.5), hi = Math.max(nd.g, ...ws, 0);
      P2.y = [Math.max(0, Math.min(...ws, nd.g) - 0.03), Math.max(...ws, nd.g) + 0.03]; P2.clear();
      P2.axes({ xLabel: `threshold on ${F[feat]}`, yLabel: "weighted Gini after split", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 2), xCount: 5 });
      P2.path(P2.x, [nd.g, nd.g], css("--muted"), 1.2, [5, 4]);
      if (c.length) { P2.path(c.map((v) => v.t), ws, css("--accent"), 2); c.forEach((v) => { if (!v.ok) P2.dot(v.t, v.w, 2, css("--muted")); }); }
      const okc = c.filter((v) => v.ok), b = okc.length ? okc.reduce((a, v) => (v.w < a.w ? v : a)) : null;
      if (b) P2.dot(b.t, b.w, 5.5, css("--warm"), css("--surface"));
      const other = nd.best && nd.best.f !== feat ? ` Its best split overall is on ${FS[nd.best.f]} (weighted Gini ${fmt(nd.best.w, 3)}), so that one wins.` : "";
      $("#d2Cap").innerHTML = c.length ? `Dashed: the node's own Gini (${fmt(nd.g, 3)}). Each point on the line is one threshold between neighbouring orders. Orange: the best on ${FS[feat]}${b ? `, at ${fmt(b.t, 0)}, weighted Gini ${fmt(b.w, 3)}` : ""}. Grey dots break the smallest-leaf rule.${other}` : "This node has too few distinct values to split.";
    }
    function d3() {
      const k = K(); P3.resize(); P3.x = [0, MAXS]; const all = curve.flat(); P3.y = [Math.max(0.4, Math.min(...all) - 0.03), 1]; P3.clear();
      P3.axes({ xLabel: "splits", yLabel: "accuracy", xFormat: (v) => fmt(v, 0), yFormat: (v) => Math.round(v * 100) + "%", xCount: 6 });
      const xs = curve.map((_, i) => i); P3.path(xs, curve.map((c) => c[0]), css("--muted"), 2, [5, 4]); P3.path(xs, curve.map((c) => c[1]), css("--accent"), 2.5);
      const bi = curve.reduce((b, c, i) => (c[1] > curve[b][1] ? i : b), 0); P3.dot(bi, curve[bi][1], 4, css("--good"), css("--surface"));
      P3.path([k, k], P3.y, css("--warm"), 1.5); P3.dot(k, curve[k][1], 5, css("--warm"), css("--surface"));
      $("#d3Cap").innerHTML = `Dashed: accuracy on the 200 training orders. Solid: on 2,000 new orders. Green: the best test accuracy, ${fmt(curve[bi][1] * 100, 1)}% at ${bi} split${bi === 1 ? "" : "s"}. ${order.length < MAXS ? `The tree can't split further than ${order.length} with leaves of at least ${$("#ml").value}.` : ""}`;
    }
    function rule(i) { const nd = nodes[i], p = nodes[nd.parent], s = p.split; return `${FS[s.f]} ${nd.side ? ">" : "≤"} ${fmt(s.t, 0)}`; }
    function treeHTML() {
      const k = K(), rows = [];
      const walk = (i, pre) => { const nd = nodes[i], pl = nd.late / nd.n, leaf = !isSplit(i, k), lab = i === 0 ? "all orders" : rule(i);
        rows.push(`<div data-n="${i}" style="cursor:pointer;padding:1px 4px 1px ${4 + nd.depth * 16}px;border-radius:4px;${i === sel ? "background:var(--accent-soft);outline:1.5px solid var(--warm)" : ""}"><b style="color:var(--ink)">${lab}</b> <span style="color:var(--muted)">n=${nd.n}, ${Math.round(pl * 100)}% late, Gini ${fmt(nd.g, 2)}</span>${leaf ? ` → <span style="color:var(${predLeaf(i) ? "--bad" : "--accent"});font-weight:600">${predLeaf(i) ? "late" : "on time"}</span>` : ""}</div>`);
        if (!leaf) nd.kids.forEach((c) => walk(c, pre + "   "));
      };
      walk(0, ""); $("#tree").innerHTML = rows.join("");
      root.querySelectorAll("#tree [data-n]").forEach((e) => e.addEventListener("click", () => { sel = +e.dataset.n; draw(); }));
    }
    function work() {
      const nd = selNode(), b = nd.best, B = (t) => `<b style="color:var(--ink)">${t}</b>`, p = nd.late / nd.n;
      const L = [`Selected node: ${nd.n} orders, ${nd.late} late. p = ${nd.late}/${nd.n} = ${fmt(p, 3)}. Gini = 1 − ${fmt(p, 3)}² − ${fmt(1 - p, 3)}² = ${B(fmt(nd.g, 3))}`];
      if (!b) L.push("No split allowed here (too few orders for the smallest-leaf rule, or already pure).");
      else {
        const gl = gini(b.nl, b.ll), gr = gini(b.nr, b.lr);
        L.push(`Best split: ${B(`${FS[b.f]} ≤ ${fmt(b.t, 0)}`)}`);
        L.push(`&nbsp;&nbsp;left: ${b.nl} orders, ${b.ll} late → Gini = 1 − ${fmt(b.ll / b.nl, 3)}² − ${fmt(1 - b.ll / b.nl, 3)}² = ${fmt(gl, 3)}`);
        L.push(`&nbsp;&nbsp;right: ${b.nr} orders, ${b.lr} late → Gini = 1 − ${fmt(b.lr / b.nr, 3)}² − ${fmt(1 - b.lr / b.nr, 3)}² = ${fmt(gr, 3)}`);
        L.push(`&nbsp;&nbsp;weighted = (${b.nl} × ${fmt(gl, 3)} + ${b.nr} × ${fmt(gr, 3)}) / ${nd.n} = ${fmt(b.w, 3)}; gain = ${fmt(nd.g, 3)} − ${fmt(b.w, 3)} = ${B(fmt(nd.g - b.w, 3))}`);
        L.push(`&nbsp;&nbsp;priority for best-first growth: gain × n = ${fmt(nd.g - b.w, 3)} × ${nd.n} = ${fmt((nd.g - b.w) * nd.n, 2)}${nd.ord < Infinity ? ` (made as split #${nd.ord + 1})` : ""}`);
      }
      $("#work").innerHTML = L.map((l) => `<div style="white-space:nowrap">${l}</div>`).join("");
    }
    function readouts() {
      const k = K(), [tr, te] = curve[k], leaves = k + 1, bi = curve.reduce((b, c, i) => (c[1] > curve[b][1] ? i : b), 0);
      $("#ro").innerHTML = [["Splits / leaves", `<span class="num">${k} / ${leaves}</span>`], ["Training accuracy", `<span class="num">${fmt(tr * 100, 1)}%</span>`],
        ["Test accuracy (new orders)", `<span class="pill ${te >= curve[bi][1] - 0.005 ? "ok" : te >= curve[bi][1] - 0.03 ? "warn" : "bad"}">${fmt(te * 100, 1)}%</span>`], ["Gap (overfit)", `<span class="num">${fmt((tr - te) * 100, 1)} pts</span>`]]
        .map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { $("#kV").textContent = K() + (K() < +$("#k").value ? ` (max ${order.length})` : ""); $("#mlV").textContent = $("#ml").value; $("#nzV").textContent = Math.round(+$("#nz").value * 100) + "%"; }
    function nextSel() { const k = K(); let bi = 0, bv = -1; nodes.forEach((nd, i) => { const leaf = !isSplit(i, k) && (nd.parent < 0 || isSplit(nd.parent, k)); if (leaf && nd.best) { const v = (nd.g - nd.best.w) * nd.n; if (v > bv) { bv = v; bi = i; } } }); return bi; }
    function draw() { labels(); treeHTML(); d1(); d2(); d3(); work(); readouts(); }
    function full() { grow(); curves(); sel = nextSel(); draw(); }
    $("#k").addEventListener("input", () => { sel = nextSel(); draw(); });
    $("#ml").addEventListener("input", full);
    $("#nz").addEventListener("input", () => { gen(); full(); });
    root.querySelectorAll("#ft button").forEach((b) => b.addEventListener("click", () => { root.querySelectorAll("#ft button").forEach((x) => x.setAttribute("aria-pressed", x === b)); feat = +b.dataset.v; draw(); }));
    $("#step").addEventListener("click", () => { $("#k").value = Math.min(MAXS, +$("#k").value + 1); sel = nextSel(); draw(); });
    $("#best").addEventListener("click", () => { const bi = curve.reduce((b, c, i) => (c[1] > curve[b][1] ? i : b), 0); $("#k").value = bi; sel = nextSel(); draw(); });
    $("#resim").addEventListener("click", () => { seed++; gen(); full(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 5; gen(); full(); });
    $("#d1").addEventListener("click", (e) => { const r = $("#d1").getBoundingClientRect(), x = [P1.ix(e.clientX - r.left), P1.iy(e.clientY - r.top)]; if (x[0] < 0 || x[0] > 1000 || x[1] < 0 || x[1] > 100) return; sel = leafOf(x, K()); draw(); });
    gen(); full();
    return watch([$("#d1"), $("#d2"), $("#d3")], () => { d1(); d2(); d3(); });
  },
});
