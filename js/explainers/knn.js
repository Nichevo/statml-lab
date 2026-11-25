Lab.register({
  id: "knn",
  group: "Machine learning",
  title: "k-nearest neighbours",
  blurb: "Classify a new order by asking its closest past orders to vote. Click anywhere to drop an order, see its neighbours and their distances, and watch what k and scaling do.",
  lede: "k-nearest neighbours (kNN) has no training step at all. To judge a new order it finds the k most similar past orders and lets them vote: if 4 of the 5 closest were late, it predicts late with 80%. It's simple and makes no assumptions about shape, but everything depends on what “closest” means, so the scale of each feature matters a lot.",
  quiz: [
    ["With k = 1, training accuracy is always 100%. Why is that misleading?", "Every training order is its own nearest neighbour, so it always “predicts” itself. That says nothing about new orders; 1-NN follows every noisy point and usually does worse on new data than a larger k."],
    ["Distance is in km (0–1,000) and order size in units (0–100). What goes wrong without scaling?", "A 100 km gap counts as much as a 100-unit gap, so distance swamps size and the neighbours are chosen almost on distance alone. Standardise each feature (subtract the mean, divide by the standard deviation) first."],
    ["What happens as k grows very large?", "The vote covers most of the data, so every order gets the overall majority class. The boundary becomes too smooth: underfitting. The best k sits in between and is chosen by cross-validation."],
    ["Why is kNN slow at prediction time with millions of rows?", "It must measure the distance from the new point to every stored point. Index structures (k-d trees, ball trees) or approximate nearest-neighbour search speed this up, which is also how embedding search in AI systems works."],
    ["Why does kNN get worse with many features?", "In many dimensions all points end up roughly the same distance apart (the curse of dimensionality), so “nearest” stops meaning “similar”. Pick or reduce features first."],
  ],
  diy: {
    intro: "Past orders in rows 2–151: distance in A, size in B, late (1/0) in C. New order's distance in F1, size in F2.",
    steps: [
      ["Standardise each feature (do the same to the new order).", "D2: =(A2-AVERAGE(A$2:A$151))/STDEV.S(A$2:A$151)   E2: same for B   F3: =(F1-AVERAGE(A$2:A$151))/STDEV.S(A$2:A$151)"],
      ["Distance from the new order to each past order.", "G2: =SQRT((D2-$F$3)^2+(E2-$F$4)^2)"],
      ["Rank the distances; the k smallest are the neighbours.", "H2: =RANK.EQ(G2,G$2:G$151,1)"],
      ["Share late among the k nearest (k in F5).", "=AVERAGEIFS(C2:C151, H2:H151, \"<=\"&F5)"],
      ["Distance-weighted vote: weight each neighbour by 1/distance.", "=SUMPRODUCT((H2:H151<=F5)*C2:C151/G2:G151)/SUMPRODUCT((H2:H151<=F5)/G2:G151)"],
      ["Predict late if the share is at least 50%.", "=IF(share>=0.5,\"late\",\"on time\")"],
    ],
  },
  deeper: [
    ["Cover & Hart (1967), Nearest neighbor pattern classification, IEEE Transactions on Information Theory 13(1)", "https://doi.org/10.1109/TIT.1967.1053964", "1-NN's error is at most twice the best possible"],
    ["Fix & Hodges (1951/1989), Discriminatory analysis: nonparametric discrimination, consistency properties, International Statistical Review 57(3)", "https://doi.org/10.2307/1403797", "where nearest-neighbour rules began"],
    ["James, Witten, Hastie & Tibshirani, An Introduction to Statistical Learning, §2.2.3 and §4.7 (free PDF)", "https://www.statlearning.com/", "kNN and choosing k"],
    ["scikit-learn user guide: Nearest neighbors", "https://scikit-learn.org/stable/modules/neighbors.html", "algorithms, weighting and fast search"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="48" cy="32" r="22" stroke-dasharray="4 3"/><circle cx="48" cy="32" r="4" fill="currentColor"/><path d="M48 32 L36 20 M48 32 L62 24 M48 32 L44 48" stroke-opacity=".6"/><circle cx="36" cy="20" r="3.5" fill="currentColor"/><circle cx="62" cy="24" r="3.5"/><circle cx="44" cy="48" r="3.5" fill="currentColor"/><circle cx="82" cy="12" r="3"/><circle cx="12" cy="52" r="3"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);
    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Click to place a new order")}</div><canvas id="k1" style="height:320px;cursor:crosshair" aria-label="Past orders, the new order and its nearest neighbours, with the prediction map"></canvas><figcaption id="k1Cap"></figcaption></figure>`,
          `<div class="plot" style="padding:14px">${h4("The neighbours' vote")}<div id="vote"></div></div>`)}
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Error against k")}</div><canvas id="k2" aria-label="Training and test error against k"></canvas><figcaption id="k2Cap"></figcaption></figure>`,
          `<div class="plot" style="padding:14px">${h4("Worked out")}<div id="work" style="font:.78rem/1.75 var(--font-mono);overflow-x:auto"></div></div>`)}`,
      panel: `
        <p class="hint" style="margin:0">150 past orders, coloured by whether they shipped late, and 2,000 new orders for testing. Distance runs 0–1,000 km; order size 0–100 units.</p>
        <div class="ctrl"><label for="k">Neighbours to ask, k <output id="kV"></output></label><input type="range" id="k" min="1" max="51" step="2" value="7"></div>
        <div class="ctrl"><label>Distance measured on</label><div class="seg" id="sc"><button type="button" data-v="1" aria-pressed="true">standardised features</button><button type="button" data-v="0" aria-pressed="false">raw km and units</button></div></div>
        <div class="ctrl"><label>Vote</label><div class="seg" id="wt"><button type="button" data-v="0" aria-pressed="true">one neighbour, one vote</button><button type="button" data-v="1" aria-pressed="false">closer counts more (1/distance)</button></div></div>
        <div class="ctrl"><label for="nz">Label noise <output id="nzV"></output></label><input type="range" id="nz" min="0" max="0.3" step="0.01" value="0.08"></div>
        <div class="ctrl"><label for="qx">New order: distance (km) <output id="qxV"></output></label><input type="range" id="qx" min="0" max="1000" step="10" value="700"></div>
        <div class="ctrl"><label for="qy">New order: size (units) <output id="qyV"></output></label><input type="range" id="qy" min="0" max="100" step="1" value="62"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="bestk" type="button">Use the best k</button><button class="btn" id="resim" type="button">New orders</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The algorithm</h2>
          <ol>
            <li>Put every feature on a comparable scale (usually standardise: subtract the mean, divide by the standard deviation).</li>
            <li>For the new point, compute the distance to every stored point. Usually straight-line (Euclidean): √(Δx₁² + Δx₂² + …).</li>
            <li>Take the k closest. Predict the majority class (classification) or the average value (regression).</li>
          </ol>
          <p>The share of neighbours that are late doubles as a rough probability. With small k it jumps in steps of 1/k, so it's coarse.</p>
        </section>
        <section>
          <h2>Choosing k</h2>
          <p>Small k follows every wiggle and noisy point (high variance); large k blurs everything towards the overall majority (high bias). This is the <a href="#bias-variance">bias–variance trade-off</a> in its purest form. Pick k by <a href="#cross-validation">cross-validation</a>; odd k avoids ties with two classes.</p>
        </section>
        <section>
          <h2>Why scaling matters</h2>
          <p>Distance adds up squared gaps in each feature's own units. Kilometres run to 1,000 and units to 100, so on raw values a 50 km gap outweighs a 40-unit gap and order size barely counts. Switch to “raw” and watch the neighbour circle become a tall thin ellipse in the chart: the neighbours are chosen on distance alone.</p>
        </section>
        <section>
          <h2>Where you meet it</h2>
          <p>Finding similar SKUs for a <a href="#new-product">new-product forecast</a> by analogy, imputing <a href="#missing-data">missing values</a> from similar rows, and recommending “customers like you”. Searching for similar text by <a href="#transformer">embedding</a> is nearest neighbours too, on vectors with hundreds of dimensions.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Set k = 1: training error drops to 0 and the map turns into islands around single orders.</li>
            <li>Set k = 51: the map smooths out and test error rises again.</li>
            <li>Switch to raw km and units with the new order near the boundary: the neighbours and the prediction change.</li>
            <li>Raise the label noise: the best k moves up, because more neighbours are needed to outvote the noise.</li>
          </ul>
        </section>`,
    });

    let seed = 11, train = [], test = [], errs = [], scaled = true, weighted = false;
    const truth = (d, s) => (d > 540 && s > 42 ? 0.88 : d < 220 && s > 80 ? 0.7 : d > 800 ? 0.45 : 0.08);
    function gen() {
      const r = rng(seed), nz = +$("#nz").value, mk = (n) => Array.from({ length: n }, () => { const d = r() * 1000, s = r() * 100; let y = r() < truth(d, s) ? 1 : 0; if (r() < nz) y = 1 - y; return { x: [d, s], y }; });
      train = mk(150); test = mk(2000);
    }
    let mu = [0, 0], sd = [1, 1];
    function stats() { for (let f = 0; f < 2; f++) { const v = train.map((p) => p.x[f]); mu[f] = v.reduce((a, b) => a + b, 0) / v.length; sd[f] = Math.sqrt(v.reduce((a, b) => a + (b - mu[f]) ** 2, 0) / (v.length - 1)); } }
    const tf = (x) => (scaled ? [(x[0] - mu[0]) / sd[0], (x[1] - mu[1]) / sd[1]] : x);
    function neigh(x, k, skip) { const q = tf(x); return train.map((p, i) => { const t = tf(p.x); return { i, d: Math.hypot(t[0] - q[0], t[1] - q[1]) }; }).filter((o) => o.i !== skip).sort((a, b) => a.d - b.d).slice(0, k); }
    function vote(nb) { if (!weighted) return nb.reduce((s, o) => s + train[o.i].y, 0) / nb.length; let w = 0, l = 0; nb.forEach((o) => { const ww = 1 / Math.max(o.d, 1e-6); w += ww; l += ww * train[o.i].y; }); return l / w; }
    const predict = (x, k) => vote(neigh(x, k));
    function errCurve() {
      errs = [];
      for (let k = 1; k <= 51; k += 2) {
        let tr = 0, te = 0; train.forEach((p) => { tr += ((predict(p.x, k) >= 0.5 ? 1 : 0) !== p.y) ? 1 : 0; });
        const sub = test.slice(0, 600); sub.forEach((p) => { te += ((predict(p.x, k) >= 0.5 ? 1 : 0) !== p.y) ? 1 : 0; });
        errs.push([k, tr / train.length, te / sub.length]);
      }
    }
    const P1 = new Plot($("#k1"), { x: [0, 1000], y: [0, 100], pad: { l: 44, b: 38 } }), P2 = new Plot($("#k2"), { x: [1, 51], pad: { l: 46, b: 38 } });
    let map = null, mapKey = "";
    function d1() {
      const k = +$("#k").value, q = [+$("#qx").value, +$("#qy").value], nb = neigh(q, k); P1.resize(); P1.clear();
      P1.axes({ xLabel: "distance (km)", yLabel: "order size (units)", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0), xCount: 5 });
      const key = [k, scaled, weighted, seed, $("#nz").value, Math.round(P1.iw), Math.round(P1.ih)].join();
      const G = 44, g = P1.ctx;
      if (key !== mapKey) { map = []; for (let a = 0; a < G; a++) for (let b = 0; b < G; b++) map.push(predict([(a + 0.5) * 1000 / G, (b + 0.5) * 100 / G], k)); mapKey = key; }
      for (let a = 0; a < G; a++) for (let b = 0; b < G; b++) { const p = map[a * G + b]; g.fillStyle = css(p >= 0.5 ? "--bad" : "--accent"); g.globalAlpha = 0.05 + 0.22 * Math.abs(p - 0.5) * 2; const x0 = Math.round(P1.sx(a * 1000 / G)), x1 = Math.round(P1.sx((a + 1) * 1000 / G)), y0 = Math.round(P1.sy((b + 1) * 100 / G)), y1 = Math.round(P1.sy(b * 100 / G)); g.fillRect(x0, y0, x1 - x0, y1 - y0); }
      g.globalAlpha = 1;
      const R = nb[nb.length - 1].d;
      P1.clip(() => { g.strokeStyle = css("--warm"); g.setLineDash([5, 4]); g.lineWidth = 1.8; g.beginPath(); for (let t = 0; t <= 64; t++) { const a = (t / 64) * 2 * Math.PI, dx = R * Math.cos(a) * (scaled ? sd[0] : 1), dy = R * Math.sin(a) * (scaled ? sd[1] : 1), X = P1.sx(q[0] + dx), Y = P1.sy(q[1] + dy); t ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.stroke(); g.setLineDash([]); });
      g.strokeStyle = css("--ink"); g.globalAlpha = 0.45; g.lineWidth = 1; nb.forEach((o) => { const p = train[o.i]; g.beginPath(); g.moveTo(P1.sx(q[0]), P1.sy(q[1])); g.lineTo(P1.sx(p.x[0]), P1.sy(p.x[1])); g.stroke(); }); g.globalAlpha = 1;
      const inN = new Set(nb.map((o) => o.i));
      train.forEach((p, i) => P1.dot(p.x[0], p.x[1], inN.has(i) ? 4.5 : 3, css(p.y ? "--bad" : "--accent"), inN.has(i) ? css("--ink") : css("--surface")));
      const pr = vote(nb); P1.dot(q[0], q[1], 7, css("--warm"), css("--surface"));
      $("#k1Cap").innerHTML = `Red: late; blue: on time. Shading: what kNN predicts at each spot. Orange: the new order; dashed: the reach of its ${k} nearest neighbour${k > 1 ? "s" : ""}${scaled ? "" : " (on raw values, a tall thin shape: only distance really counts)"}.`;
    }
    function voteHTML() {
      const k = +$("#k").value, q = [+$("#qx").value, +$("#qy").value], nb = neigh(q, k), pr = vote(nb), late = nb.filter((o) => train[o.i].y).length;
      $("#vote").innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">${nb.map((o) => `<span title="distance ${fmt(o.d, 3)}" style="width:18px;height:18px;border-radius:50%;background:var(${train[o.i].y ? "--bad" : "--accent"})"></span>`).join("")}</div>
        <p style="margin:0 0 6px">${late} of ${k} neighbours were late${weighted ? `; weighted by closeness that's <b>${fmt(pr * 100, 0)}%</b>` : ` = <b>${fmt(pr * 100, 0)}%</b>`}.</p>
        <p style="margin:0;font-size:1.15rem">Prediction: <b style="color:var(${pr >= 0.5 ? "--bad" : "--accent"})">${pr >= 0.5 ? "late" : "on time"}</b></p>
        <p class="hint" style="margin:8px 0 0">True chance of being late at this spot: ${fmt(truth(q[0], q[1]) * 100, 0)}% (before label noise).</p>`;
    }
    function d2() {
      const k = +$("#k").value; P2.resize(); P2.x = [1, 51]; const mx = Math.max(...errs.map((e) => e[2]), 0.3); P2.y = [0, mx * 1.1]; P2.clear();
      P2.axes({ xLabel: "k (neighbours)", yLabel: "error rate", xFormat: (v) => fmt(v, 0), yFormat: (v) => Math.round(v * 100) + "%", xCount: 5 });
      P2.path(errs.map((e) => e[0]), errs.map((e) => e[1]), css("--muted"), 2, [5, 4]); P2.path(errs.map((e) => e[0]), errs.map((e) => e[2]), css("--accent"), 2.5);
      const b = errs.reduce((a, e) => (e[2] < a[2] ? e : a)); P2.dot(b[0], b[2], 4.5, css("--good"), css("--surface"));
      const cur = errs.find((e) => e[0] === k); P2.path([k, k], P2.y, css("--warm"), 1.5); P2.dot(k, cur[2], 5, css("--warm"), css("--surface"));
      $("#k2Cap").innerHTML = `Dashed: error on the 150 past orders (each judged by its own neighbours, itself included). Solid: error on new orders. Green: best k = ${b[0]}, ${fmt(b[2] * 100, 1)}% error.`;
    }
    function work() {
      const k = +$("#k").value, q = [+$("#qx").value, +$("#qy").value], nb = neigh(q, k), tq = tf(q), B = (t) => `<b style="color:var(--ink)">${t}</b>`, show = nb.slice(0, 6);
      const L = [scaled ? `New order, standardised:
  distance (${fmt(q[0], 0)} − ${fmt(mu[0], 0)}) / ${fmt(sd[0], 0)} = ${fmt(tq[0], 2)}
  size     (${fmt(q[1], 0)} − ${fmt(mu[1], 1)}) / ${fmt(sd[1], 1)} = ${fmt(tq[1], 2)}` : `New order on raw values: (${fmt(q[0], 0)} km, ${fmt(q[1], 0)} units)`];
      show.forEach((o, j) => { const p = train[o.i], t = tf(p.x); L.push(`#${j + 1} ${String(fmt(p.x[0], 0)).padStart(3)} km ${String(fmt(p.x[1], 0)).padStart(3)} u ${p.y ? "late   " : "on time"} d = √(${fmt(t[0] - tq[0], 2)}²+${fmt(t[1] - tq[1], 2)}²) = ${B(fmt(o.d, scaled ? 2 : 0))}`); });
      if (nb.length > show.length) L.push(`… and ${nb.length - show.length} more, out to d = ${fmt(nb[nb.length - 1].d, scaled ? 3 : 1)}`);
      L.push(`Share late = ${weighted ? "Σ(late × 1/d) / Σ(1/d)" : `${nb.filter((o) => train[o.i].y).length} / ${k}`} = ${B(fmt(vote(nb) * 100, 1) + "%")}`);
      $("#work").innerHTML = L.map((l) => `<div style="white-space:pre">${l}</div>`).join("");
    }
    function readouts() {
      const k = +$("#k").value, cur = errs.find((e) => e[0] === k), b = errs.reduce((a, e) => (e[2] < a[2] ? e : a));
      $("#ro").innerHTML = [["Prediction for the new order", `<span class="num">${fmt(predict([+$("#qx").value, +$("#qy").value], k) * 100, 0)}% late</span>`], ["Training error", `<span class="num">${fmt(cur[1] * 100, 1)}%</span>`],
        ["Test error", `<span class="pill ${cur[2] <= b[2] + 0.005 ? "ok" : cur[2] <= b[2] + 0.03 ? "warn" : "bad"}">${fmt(cur[2] * 100, 1)}%</span>`], ["Best k on test", `<span class="num">${b[0]}</span>`]]
        .map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { $("#kV").textContent = $("#k").value; $("#nzV").textContent = Math.round(+$("#nz").value * 100) + "%"; $("#qxV").textContent = $("#qx").value; $("#qyV").textContent = $("#qy").value; }
    function draw() { labels(); d1(); voteHTML(); d2(); work(); readouts(); }
    function full() { stats(); errCurve(); draw(); }
    ["k", "qx", "qy"].forEach((id) => $("#" + id).addEventListener("input", draw));
    $("#nz").addEventListener("input", () => { gen(); full(); });
    const seg = (id, f) => root.querySelectorAll(`#${id} button`).forEach((b) => b.addEventListener("click", () => { root.querySelectorAll(`#${id} button`).forEach((x) => x.setAttribute("aria-pressed", x === b)); f(b.dataset.v === "1"); full(); }));
    seg("sc", (v) => (scaled = v)); seg("wt", (v) => (weighted = v));
    $("#k1").addEventListener("click", (e) => { const r = $("#k1").getBoundingClientRect(), x = P1.ix(e.clientX - r.left), y = P1.iy(e.clientY - r.top); if (x < 0 || x > 1000 || y < 0 || y > 100) return; $("#qx").value = Math.round(x / 10) * 10; $("#qy").value = Math.round(y); draw(); });
    $("#bestk").addEventListener("click", () => { $("#k").value = errs.reduce((a, e) => (e[2] < a[2] ? e : a))[0]; draw(); });
    $("#resim").addEventListener("click", () => { seed++; gen(); full(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); scaled = true; weighted = false; root.querySelectorAll(".seg").forEach((sg) => sg.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", i === 0))); seed = 11; gen(); full(); });
    gen(); full();
    return watch([$("#k1"), $("#k2")], () => { d1(); d2(); });
  },
});
