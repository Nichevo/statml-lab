Lab.register({
  id: "isolation-forest",
  group: "Data quality",
  title: "Isolation forest: finding odd ones out",
  blurb: "Flag unusual supplier invoices without any labels. Random cuts isolate an odd invoice in a few steps and a normal one only after many. Click any invoice to watch a tree cut it out.",
  lede: "Most anomaly methods describe what “normal” looks like and flag what doesn't fit. An isolation forest flips that around: it keeps slicing the data at random until each point sits alone. Unusual points are few and far from the rest, so they get cut off after only a few slices; normal points sit in crowds and take many. Average the number of cuts over a hundred random trees and you have an anomaly score that needs no labels, no distribution and very little tuning.",
  quiz: [
    ["Why does an anomaly need fewer random cuts to isolate?", "It sits far from the crowd, so a random cut has a good chance of falling between it and everyone else. A point in a dense cluster needs many cuts before every neighbour has been separated from it."],
    ["What does a score near 1 mean, and near 0.5?", "The score is 2^(−average path length / c(n)), where c(n) is the average path length for a typical point. Near 1: isolated much faster than usual, a strong anomaly. Around 0.5 or below: an ordinary point."],
    ["Why train each tree on a small subsample (e.g. 256 points)?", "Small samples thin out the crowds, so normal points and anomalies are easier to tell apart (less “swamping” and “masking” by groups of anomalies). It's also fast."],
    ["Does a high score prove an invoice is wrong?", "No. It says the invoice is unusual for its amount and quantity. It might be a genuine bulk order or a price change. Use the score to rank what a person should check first."],
    ["How is this different from a z-score rule?", "A z-score looks at one variable at a time and assumes a bell shape. An isolation forest looks at all features together, so it catches an invoice whose amount and quantity are each normal but whose combination (the implied unit price) is odd."],
  ],
  diy: {
    intro: "A full isolation forest needs code, but the core pieces are simple. Invoices in rows 2–401: amount in A, quantity in B.",
    steps: [
      ["One random cut: pick a feature, then a random value between its min and max.", "=IF(RAND()<0.5,\"amount\",\"quantity\")   =MIN(A2:A401)+RAND()*(MAX(A2:A401)-MIN(A2:A401))"],
      ["Which side of the cut each invoice falls on.", "=IF(A2<=cut,\"left\",\"right\")"],
      ["Expected path length for n points (the normaliser c(n)); H(i) ≈ LN(i) + 0.5772.", "=2*(LN(n-1)+0.5772)-2*(n-1)/n"],
      ["Anomaly score from an average path length h.", "=2^(-h/c)"],
      ["A simple cross-check: implied unit price and its robust z-score.", "C2: =A2/B2   D2: =(C2-MEDIAN(C$2:C$401))/(1.4826*MEDIAN(ABS(C$2:C$401-MEDIAN(C$2:C$401))))"],
      ["Rank and review the top 2%.", "=RANK.EQ(score, scores, 0)<=8"],
    ],
  },
  deeper: [
    ["Liu, Ting & Zhou (2008), Isolation forest, IEEE ICDM", "https://doi.org/10.1109/ICDM.2008.17", "the original method"],
    ["Liu, Ting & Zhou (2012), Isolation-based anomaly detection, ACM TKDD 6(1)", "https://doi.org/10.1145/2133360.2133363", "the longer version with analysis"],
    ["Hariri, Kind & Brunner (2021), Extended isolation forest, IEEE TKDE 33(4)", "https://doi.org/10.1109/TKDE.2019.2947676", "sloped cuts to remove the boxy artefacts"],
    ["scikit-learn user guide: Isolation Forest", "https://scikit-learn.org/stable/modules/outlier_detection.html#isolation-forest", "settings and comparison with other detectors"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="88" height="56" rx="3" stroke-opacity=".5"/><path d="M60 4 V60 M60 22 H92 M76 4 V22" stroke-dasharray="4 3"/><g fill="currentColor" fill-opacity=".6"><circle cx="20" cy="40" r="2.5"/><circle cx="28" cy="34" r="2.5"/><circle cx="34" cy="44" r="2.5"/><circle cx="24" cy="48" r="2.5"/><circle cx="40" cy="38" r="2.5"/></g><circle cx="84" cy="12" r="4" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);
    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Invoices, shaded by anomaly score (click one)")}</div><canvas id="a1" style="height:320px;cursor:pointer" aria-label="Invoices by quantity and amount with anomaly score shading"></canvas><figcaption id="a1Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("One random tree isolating the selected invoice")}</div><canvas id="a2" style="height:320px" aria-label="Random cuts of one isolation tree around the selected invoice"></canvas><figcaption id="a2Cap"></figcaption></figure>`)}
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Cuts needed: selected invoice vs a typical one")}</div><canvas id="a3" aria-label="Distribution of path lengths over all trees"></canvas><figcaption id="a3Cap"></figcaption></figure>`,
          `<div class="plot" style="padding:14px">${h4("Top flagged invoices")}<div id="top" style="font:.78rem/1.7 var(--font-mono);overflow-x:auto"></div></div>`)}`,
      panel: `
        <p class="hint" style="margin:0">400 supplier invoices: quantity and invoice amount. A few have been planted as errors: a mistyped amount, a wrong unit price, a duplicate charge for a large order. The forest is never told which.</p>
        <div class="ctrl"><label for="nt">Trees <output id="ntV"></output></label><input type="range" id="nt" min="1" max="200" step="1" value="100"></div>
        <div class="ctrl"><label for="ss">Rows sampled per tree <output id="ssV"></output></label><input type="range" id="ss" min="0" max="4" step="1" value="2"></div>
        <div class="ctrl"><label for="na">Planted errors <output id="naV"></output></label><input type="range" id="na" min="0" max="24" step="1" value="10"></div>
        <div class="ctrl"><label for="fl">Flag the top <output id="flV"></output></label><input type="range" id="fl" min="0.5" max="10" step="0.5" value="3"></div>
        <label class="check"><input type="checkbox" id="up"> Also give the forest unit price (amount ÷ quantity) as a feature</label>
        <div class="ctrl"><label for="tr">Tree to show (for the cuts chart) <output id="trV"></output></label><input type="range" id="tr" min="1" max="20" step="1" value="1"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="odd" type="button">Select the top-scoring invoice</button><button class="btn" id="typ" type="button">Select a typical invoice</button><button class="btn" id="resim" type="button">New invoices</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The algorithm</h2>
          <ol>
            <li>For each tree, draw a small random sample of rows (often 256).</li>
            <li>Pick a random feature and a random cut value between that feature's min and max in the current group. Split the group in two.</li>
            <li>Repeat inside each group until every point is alone, or a depth limit of about log₂(sample size) is reached.</li>
            <li>A point's <b>path length</b> is the number of cuts from the top of the tree to its leaf (plus a correction if the leaf still holds several points).</li>
            <li>Average path lengths over all trees and convert to a score.</li>
          </ol>
          <div class="eq">score = 2<sup>−E[h(x)] / c(n)</sup>, &nbsp; c(n) = 2H(n−1) − 2(n−1)/n, &nbsp; H(i) ≈ ln i + 0.5772</div>
          <p>c(n) is the average path length of an ordinary point in a random tree of n points, so a typical point scores about 0.5.</p>
        </section>
        <section>
          <h2>Using it on supply chain data</h2>
          <p>Invoice and payment checks, unusual orders (quantity, price, customer and timing together), sensor or scan data, and master-data clean-up. It's a good second pass after simple rules from <a href="#outliers">outlier detection</a>; for time series, compare each point with its forecast instead (<a href="#ts-anomalies">time-series anomalies</a>).</p>
        </section>
        <section>
          <h2>Settings</h2>
          <p>About 100 trees is usually enough; the score barely changes after that. Sample size 256 is the classic default. The one real decision is how many to flag, which depends on how many cases a person can review.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Select the top-scoring invoice and step through trees 1–20: it's usually alone after 2–4 cuts.</li>
            <li>Select a typical invoice: it often reaches the depth limit still sharing its box.</li>
            <li>Set trees to 1: the scores are noisy and the flags change; by 100 they settle.</li>
            <li>The “wrong unit price” errors sit just off the diagonal band. Cuts that are only ever horizontal or vertical struggle to slice them off, and small genuine orders at the ends of the band get flagged instead. Tick “unit price as a feature”: diagonal cuts (purple) appear and those errors jump up the list. That’s <a href="#feature-engineering">feature engineering</a> at work.</li>
          </ul>
        </section>`,
    });

    let seed = 12, D = [], forest = [], scores = [], sel = 0, useUP = false;
    const SS = [32, 64, 128, 256, 400];
    function gen() {
      const r = rng(seed), na = +$("#na").value; D = [];
      for (let i = 0; i < 400 - na; i++) { const q = Math.exp(Math.log(40) + 0.7 * r.normal()), up = 12 * (1 + 0.06 * r.normal()) * (q > 150 ? 0.9 : 1); D.push({ x: [q, q * up], bad: null }); }
      const kinds = ["mistyped amount", "wrong unit price", "duplicate charge"];
      for (let i = 0; i < na; i++) { const k = kinds[i % 3], q = Math.exp(Math.log(40) + 0.6 * r.normal()); let a = q * 12;
        if (k === "mistyped amount") a = a * (r() < 0.5 ? 10 : 0.1); else if (k === "wrong unit price") a = q * 12 * (r() < 0.5 ? 1.6 : 0.6); else { const q2 = 200 + 150 * r(); D.push({ x: [q2, q2 * 12 * 2], bad: k }); continue; }
        D.push({ x: [q, a], bad: k }); }
    }
    const tf = (p) => { const a = Math.log10(p.x[0]), b = Math.log10(p.x[1]); return useUP ? [a, b, b - a] : [a, b]; }; // log scale, like most invoice checks
    const cN = (n) => (n <= 1 ? 0 : n === 2 ? 1 : 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n);
    function build(idx, d, lim, r, box) {
      if (idx.length <= 1 || d >= lim) return { leaf: true, n: idx.length, idx, box };
      const f = Math.floor(r() * (useUP ? 3 : 2)), vals = idx.map((i) => tf(D[i])[f]), lo = Math.min(...vals), hi = Math.max(...vals);
      if (hi - lo < 1e-12) return { leaf: true, n: idx.length, idx, box };
      const t = lo + r() * (hi - lo), L = idx.filter((i) => tf(D[i])[f] < t), R = idx.filter((i) => tf(D[i])[f] >= t), bl = box.map((b) => b.slice()), br = box.map((b) => b.slice()); if (f < 2) { bl[f][1] = t; br[f][0] = t; }
      return { f, t, box, L: build(L, d + 1, lim, r, bl), R: build(R, d + 1, lim, r, br) };
    }
    function path(node, x, d = 0, trail) { if (trail) trail.push(node); if (node.leaf) return d + cN(node.n); return path(x[node.f] < node.t ? node.L : node.R, x, d + 1, trail); }
    function grow() {
      const r = rng(seed * 5 + 3), psi = Math.min(D.length, SS[+$("#ss").value]), lim = Math.ceil(Math.log2(psi)), all = D.map(tf), box0 = [[Math.min(...all.map((v) => v[0])), Math.max(...all.map((v) => v[0]))], [Math.min(...all.map((v) => v[1])), Math.max(...all.map((v) => v[1]))]];
      forest = []; for (let t = 0; t < 200; t++) { const idx = []; const pool = D.map((_, i) => i); for (let k = 0; k < psi; k++) { const j = k + Math.floor(r() * (pool.length - k)); [pool[k], pool[j]] = [pool[j], pool[k]]; idx.push(pool[k]); } forest.push({ root: build(idx, 0, lim, r, box0), psi }); }
    }
    function score() { const nt = +$("#nt").value, c = cN(forest[0].psi); scores = D.map((p) => { const x = tf(p); let h = 0; for (let t = 0; t < nt; t++) h += path(forest[t].root, x); h /= nt; return { h, s: Math.pow(2, -h / c) }; }); }
    const ranked = () => D.map((_, i) => i).sort((a, b) => scores[b].s - scores[a].s);
    const nFlag = () => Math.max(1, Math.round((D.length * +$("#fl").value) / 100));
    const P1 = new Plot($("#a1"), { pad: { l: 52, b: 38 } }), P2 = new Plot($("#a2"), { pad: { l: 52, b: 38 } }), P3 = new Plot($("#a3"), { pad: { l: 46, b: 38 } });
    const lx = (v) => fmt(10 ** v, 10 ** v < 10 ? 1 : 0);
    function setAxes(P) { const all = D.map(tf); P.x = [Math.min(...all.map((v) => v[0])) - 0.05, Math.max(...all.map((v) => v[0])) + 0.05]; P.y = [Math.min(...all.map((v) => v[1])) - 0.1, Math.max(...all.map((v) => v[1])) + 0.1]; P.clear(); P.axes({ xLabel: "quantity (log scale)", yLabel: "amount $ (log)", xFormat: lx, yFormat: (v) => "$" + (10 ** v >= 1000 ? fmt(10 ** v / 1000, 0) + "k" : fmt(10 ** v, 0)), xCount: 5 }); }
    function d1() {
      P1.resize(); setAxes(P1); const fl = new Set(ranked().slice(0, nFlag())), g = P1.ctx;
      D.forEach((p, i) => { const v = tf(p), s = scores[i].s, t = Math.max(0, Math.min(1, (s - 0.4) / 0.35)); P1.dot(v[0], v[1], 3 + 4 * t, css(t > 0.5 ? "--bad" : "--accent"), css("--surface")); if (fl.has(i)) { g.strokeStyle = css("--bad"); g.lineWidth = 1.6; g.beginPath(); g.arc(P1.sx(v[0]), P1.sy(v[1]), 9, 0, 2 * Math.PI); g.stroke(); } if (p.bad) { g.strokeStyle = css("--ink"); g.lineWidth = 1.2; const X = P1.sx(v[0]), Y = P1.sy(v[1]); g.beginPath(); g.moveTo(X - 4, Y - 4); g.lineTo(X + 4, Y + 4); g.moveTo(X - 4, Y + 4); g.lineTo(X + 4, Y - 4); g.stroke(); } });
      const v = tf(D[sel]); g.strokeStyle = css("--warm"); g.lineWidth = 2.5; g.beginPath(); g.arc(P1.sx(v[0]), P1.sy(v[1]), 12, 0, 2 * Math.PI); g.stroke();
      $("#a1Cap").innerHTML = `Bigger and redder = higher score. Red rings: the ${nFlag()} flagged (top ${$("#fl").value}%). ×: planted errors (the forest doesn't know these). Orange ring: selected. The diagonal band is the normal unit price of about $12.`;
    }
    function d2() {
      const T = forest[+$("#tr").value - 1].root, x = tf(D[sel]), trail = []; path(T, x, 0, trail); P2.resize(); setAxes(P2); const g = P2.ctx, leaf = trail[trail.length - 1];
      g.globalAlpha = 0.18; g.fillStyle = css("--warm"); g.fillRect(P2.sx(leaf.box[0][0]), P2.sy(leaf.box[1][1]), P2.sx(leaf.box[0][1]) - P2.sx(leaf.box[0][0]), P2.sy(leaf.box[1][0]) - P2.sy(leaf.box[1][1])); g.globalAlpha = 1;
      D.forEach((p) => { const v = tf(p); P2.dot(v[0], v[1], 2.2, css("--muted")); });
      if (leaf.idx) leaf.idx.forEach((i) => { const v = tf(D[i]); P2.dot(v[0], v[1], 3.2, css("--ink")); });
      trail.slice(0, -1).forEach((nd, k) => { g.strokeStyle = css("--ink"); g.lineWidth = 1.5; g.beginPath(); if (nd.f === 2) { g.strokeStyle = css("--violet"); P2.clip(() => { g.beginPath(); g.moveTo(P2.sx(P2.x[0]), P2.sy(P2.x[0] + nd.t)); g.lineTo(P2.sx(P2.x[1]), P2.sy(P2.x[1] + nd.t)); g.stroke(); }); g.fillStyle = css("--violet"); g.font = "600 11px " + css("--font-mono"); const xm = (P2.x[0] + P2.x[1]) / 2 + (k % 3) * 0.15; g.fillText(String(k + 1), P2.sx(xm) + 3, P2.sy(xm + nd.t) - 3); return; } if (nd.f === 0) { g.moveTo(P2.sx(nd.t), P2.sy(nd.box[1][0])); g.lineTo(P2.sx(nd.t), P2.sy(nd.box[1][1])); } else { g.moveTo(P2.sx(nd.box[0][0]), P2.sy(nd.t)); g.lineTo(P2.sx(nd.box[0][1]), P2.sy(nd.t)); } g.stroke();
        const mx = nd.f === 0 ? P2.sx(nd.t) + 3 : P2.sx((nd.box[0][0] + nd.box[0][1]) / 2), my = nd.f === 0 ? P2.sy((nd.box[1][0] + nd.box[1][1]) / 2) : P2.sy(nd.t) - 3; g.fillStyle = css("--violet"); g.font = "600 11px " + css("--font-mono"); g.textAlign = "left"; g.fillText(String(k + 1), mx, my); });
      P2.dot(x[0], x[1], 6, css("--warm"), css("--surface"));
      const cuts = trail.length - 1;
      $("#a2Cap").innerHTML = `Tree ${$("#tr").value} of ${$("#nt").value}, built on ${forest[0].psi} sampled invoices. Numbered lines: the ${cuts} cut${cuts === 1 ? "" : "s"} on the way to the selected invoice's box (shaded)${leaf.n > 1 ? `, which still holds ${leaf.n} sampled invoices (depth limit reached; adds c(${leaf.n}) = ${fmt(cN(leaf.n), 2)})` : leaf.n === 1 ? ", where it's alone" : ""}. Path length ${fmt(cuts + cN(leaf.n), 2)}.`;
    }
    function d3() {
      const nt = +$("#nt").value, x = tf(D[sel]), typ = ranked()[Math.floor(D.length / 2)], xt = tf(D[typ]), hs = [], ht = [];
      for (let t = 0; t < nt; t++) { hs.push(path(forest[t].root, x)); ht.push(path(forest[t].root, xt)); }
      const mx = Math.max(...hs, ...ht, 1), B = 14, w = mx / B, hist = (a) => { const h = new Array(B).fill(0); a.forEach((v) => h[Math.min(B - 1, Math.floor(v / w))]++); return h; }, hA = hist(hs), hT = hist(ht), g = P3.ctx;
      P3.resize(); P3.x = [0, mx]; P3.y = [0, Math.max(...hA, ...hT) * 1.15]; P3.clear(); P3.axes({ xLabel: "path length (cuts to isolate)", yLabel: "trees", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      [[hT, "--accent"], [hA, "--warm"]].forEach(([h, c]) => h.forEach((v, k) => { g.fillStyle = css(c); g.globalAlpha = 0.55; g.fillRect(P3.sx(k * w) + 1, P3.sy(v), P3.sx(w) - P3.sx(0) - 2, P3.sy(0) - P3.sy(v)); })); g.globalAlpha = 1;
      const m1 = hs.reduce((a, b) => a + b, 0) / nt, m2 = ht.reduce((a, b) => a + b, 0) / nt; P3.path([m1, m1], P3.y, css("--warm"), 2, [5, 4]); P3.path([m2, m2], P3.y, css("--accent"), 2, [5, 4]);
      $("#a3Cap").innerHTML = `Orange: path lengths of the selected invoice over all ${nt} trees (average ${fmt(m1, 2)}). Blue: a typical invoice (average ${fmt(m2, 2)}). Fewer cuts = more unusual.`;
    }
    function top() {
      const R = ranked().slice(0, Math.min(10, nFlag() + 3)), c = cN(forest[0].psi), B = (t) => `<b style="color:var(--ink)">${t}</b>`, s0 = scores[sel];
      $("#top").innerHTML = `<div style="margin-bottom:6px">Selected: average path ${fmt(s0.h, 2)}, c(${forest[0].psi}) = ${fmt(c, 2)}, score = 2^(−${fmt(s0.h, 2)} / ${fmt(c, 2)}) = ${B(fmt(s0.s, 3))}</div>` +
        R.map((i, k) => { const p = D[i]; return `<div style="${k < nFlag() ? "" : "opacity:.55"}">${k + 1}. ${fmt(scores[i].s, 3)} · qty ${fmt(p.x[0], 0)} · $${Math.round(p.x[1]).toLocaleString()} · $${fmt(p.x[1] / p.x[0], 2)}/unit · ${p.bad ? `<span style="color:var(--bad)">✗ ${p.bad}</span>` : `<span style="color:var(--muted)">genuine</span>`}</div>`; }).join("");
    }
    function readouts() {
      const fl = ranked().slice(0, nFlag()), hit = fl.filter((i) => D[i].bad).length, nb = D.filter((p) => p.bad).length;
      $("#ro").innerHTML = [["Selected invoice's score", `<span class="pill ${scores[sel].s > 0.6 ? "bad" : scores[sel].s > 0.5 ? "warn" : "ok"}">${fmt(scores[sel].s, 3)}</span>`], ["Flagged", `<span class="num">${fl.length}</span>`], ["Planted errors caught", `<span class="num">${hit} of ${nb}</span>`], ["Flags that were errors", `<span class="num">${fmt((hit / fl.length) * 100, 0)}%</span>`]]
        .map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { $("#ntV").textContent = $("#nt").value; $("#ssV").textContent = Math.min(D.length || 400, SS[+$("#ss").value]); $("#naV").textContent = $("#na").value; $("#flV").textContent = $("#fl").value + "%"; $("#trV").textContent = $("#tr").value; $("#tr").max = Math.min(20, +$("#nt").value); }
    function draw() { labels(); d1(); d2(); d3(); top(); readouts(); }
    function full() { grow(); score(); draw(); }
    $("#nt").addEventListener("input", () => { score(); draw(); });
    ["fl", "tr"].forEach((id) => $("#" + id).addEventListener("input", draw));
    $("#ss").addEventListener("input", full);
    $("#up").addEventListener("change", () => { useUP = $("#up").checked; full(); });
    $("#na").addEventListener("input", () => { gen(); sel = Math.min(sel, D.length - 1); full(); });
    $("#odd").addEventListener("click", () => { sel = ranked()[0]; draw(); });
    $("#typ").addEventListener("click", () => { sel = ranked()[Math.floor(D.length / 2)]; draw(); });
    $("#a1").addEventListener("click", (e) => { const r = $("#a1").getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top; let b = 0, bd = Infinity; D.forEach((p, i) => { const v = tf(p), d = (P1.sx(v[0]) - px) ** 2 + (P1.sy(v[1]) - py) ** 2; if (d < bd) { bd = d; b = i; } }); sel = b; draw(); });
    $("#resim").addEventListener("click", () => { seed++; gen(); full(); sel = ranked()[0]; draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); $("#up").checked = false; useUP = false; seed = 12; gen(); full(); sel = ranked()[0]; draw(); });
    gen(); full(); sel = ranked()[0]; draw();
    return watch([$("#a1"), $("#a2"), $("#a3")], () => { d1(); d2(); d3(); });
  },
});
