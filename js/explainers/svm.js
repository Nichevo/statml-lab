Lab.register({
  id: "svm",
  group: "Machine learning",
  title: "Support vector machines",
  blurb: "Find the widest street between two groups of suppliers. Only the points on the kerb matter. Trade width for mistakes with C, and bend the street with a kernel.",
  lede: "A support vector machine (SVM) separates two classes with the widest possible gap, or “margin”. The boundary depends only on the few points closest to it, the support vectors; every other point could move and nothing would change. A setting called C decides how many points may sit inside the margin, and a kernel lets the same maths draw curved boundaries.",
  quiz: [
    ["What are support vectors?", "The training points on or inside the margin (and any on the wrong side). The fitted boundary is a weighted sum over them only; delete any other point and the SVM is unchanged."],
    ["What does a large C do?", "It makes margin violations expensive, so the SVM squeezes the margin to classify more training points correctly. Large C means less bias and more variance; small C means a wider, more forgiving margin."],
    ["How does the RBF kernel make a curved boundary?", "It measures similarity as exp(−γ × distance²). The decision score becomes a weighted sum of bumps centred on the support vectors, which can wrap around groups. Large γ makes narrow bumps and wiggly boundaries."],
    ["Why must features be scaled for an SVM?", "The margin and the RBF distances are measured in feature units, so a feature with a big range dominates. Standardise first."],
    ["SVM vs logistic regression?", "Both draw a line with a linear kernel. Logistic regression uses every point and gives probabilities; the SVM uses only the hard points and gives a score. With kernels the SVM bends easily; logistic regression needs hand-made features."],
  ],
  diy: {
    intro: "Excel can't easily solve the SVM optimisation, but it can score new points from a fitted model. Support vectors in rows 2–20: features in A:B (standardised), label y (+1/−1) in C, weight α in D. Bias b in G1; new point in G2:G3; γ in G4.",
    steps: [
      ["Linear kernel: the weight vector w = Σ αᵢ yᵢ xᵢ.", "w1: =SUMPRODUCT(D2:D20,C2:C20,A2:A20)   w2: =SUMPRODUCT(D2:D20,C2:C20,B2:B20)"],
      ["Linear score of the new point.", "=w1*G2+w2*G3+G1"],
      ["Margin width (linear).", "=2/SQRT(w1^2+w2^2)"],
      ["RBF kernel between each support vector and the new point.", "E2: =EXP(-$G$4*((A2-$G$2)^2+(B2-$G$3)^2))"],
      ["RBF score, and the class.", "=SUMPRODUCT(D2:D20,C2:C20,E2:E20)+G1   then =IF(score>=0,\"at risk\",\"reliable\")"],
      ["Hinge loss of a training point (0 if outside the margin on the right side).", "=MAX(0, 1-C2*score)"],
    ],
  },
  deeper: [
    ["Cortes & Vapnik (1995), Support-vector networks, Machine Learning 20", "https://doi.org/10.1007/BF00994018", "the soft-margin SVM"],
    ["Boser, Guyon & Vapnik (1992), A training algorithm for optimal margin classifiers, COLT", "https://doi.org/10.1145/130385.130401", "the kernel trick for SVMs"],
    ["Platt (1998), Sequential minimal optimization: a fast algorithm for training support vector machines, Microsoft Research TR-98-14", "https://www.microsoft.com/en-us/research/publication/sequential-minimal-optimization-a-fast-algorithm-for-training-support-vector-machines/", "SMO, the solver used on this page"],
    ["James, Witten, Hastie & Tibshirani, An Introduction to Statistical Learning, ch. 9 Support vector machines (free PDF)", "https://www.statlearning.com/", "maximal margin to kernels, gently"],
    ["Hsu, Chang & Lin, A practical guide to support vector classification (LIBSVM)", "https://www.csie.ntu.edu.tw/~cjlin/papers/guide/guide.pdf", "scaling and choosing C and γ in practice"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 58 L82 6"/><path d="M4 46 L64 0 M32 64 L92 18" stroke-dasharray="4 3" stroke-opacity=".6"/><circle cx="22" cy="20" r="4" fill="currentColor"/><circle cx="12" cy="32" r="4" fill="currentColor"/><circle cx="34" cy="22" r="5" fill="currentColor" stroke-width="3"/><circle cx="70" cy="44" r="4"/><circle cx="82" cy="34" r="4"/><circle cx="60" cy="40" r="5" stroke-width="3"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);
    const PRE = [["two", "Two groups"], ["overlap", "Overlapping"], ["ring", "One group inside the other"]];
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0"><div style="padding:4px 6px 0">${h4("The street between reliable and at-risk suppliers (click to score a point)")}</div><canvas id="s1" style="height:380px;cursor:crosshair" aria-label="Suppliers with the SVM boundary, margins and support vectors"></canvas><figcaption id="s1Cap"></figcaption></figure>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Effect of C")}</div><canvas id="s2" aria-label="Test accuracy and number of support vectors against C"></canvas><figcaption id="s2Cap"></figcaption></figure>`,
          `<div class="plot" style="padding:14px">${h4("Worked out for the clicked point")}<div id="work" style="font:.78rem/1.75 var(--font-mono);overflow-x:auto"></div></div>`)}`,
      panel: `
        <p class="hint" style="margin:0">Each dot is a supplier: x = lead-time variability, y = defect rate (both standardised). Red: flagged at risk by the buyer; blue: reliable. 80 suppliers to train on, 1,000 more to test.</p>
        <div class="ctrl"><label>Data</label><div class="seg" id="pre" style="display:flex;flex-wrap:wrap">${PRE.map(([k, n], i) => `<button type="button" data-v="${k}" aria-pressed="${i === 0}">${n}</button>`).join("")}</div></div>
        <div class="ctrl"><label>Kernel</label><div class="seg" id="ker"><button type="button" data-v="lin" aria-pressed="true">linear (straight)</button><button type="button" data-v="rbf" aria-pressed="false">RBF (curved)</button></div></div>
        <div class="ctrl"><label for="c">C, cost of a point inside the margin <output id="cV"></output></label><input type="range" id="c" min="-2" max="3" step="0.25" value="0"></div>
        <div class="ctrl"><label for="g">γ for the RBF kernel (bump narrowness) <output id="gV"></output></label><input type="range" id="g" min="-1.5" max="1.5" step="0.25" value="0"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New suppliers</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The widest street</h2>
          <p>With a straight boundary w·x + b = 0, the two kerbs are w·x + b = +1 and −1, and the street is 2 / ‖w‖ wide. The SVM makes it as wide as possible while charging C for every unit a point sits on the wrong side of its kerb (the <b>hinge loss</b>, max(0, 1 − y × score)):</p>
          <div class="eq">minimise ½‖w‖² + C × Σ max(0, 1 − yᵢ(w·xᵢ + b))</div>
          <p>The solution can be written as w = Σ αᵢ yᵢ xᵢ, where αᵢ is zero for every point safely outside the street. The points with α above zero are the support vectors (circled), and α never exceeds C.</p>
        </section>
        <section>
          <h2>The kernel trick</h2>
          <p>The score only ever uses dot products xᵢ·x. Swap the dot product for another similarity, the kernel K(xᵢ, x), and you get a curved boundary without building new features by hand. The RBF kernel K = exp(−γ‖xᵢ − x‖²) is the usual choice: each support vector contributes a bump, and the boundary is where red bumps and blue bumps balance.</p>
        </section>
        <section>
          <h2>Choosing C and γ</h2>
          <p>Try a grid of values on a log scale (0.01, 0.1, 1, 10, 100) and pick by <a href="#cross-validation">cross-validation</a>; see <a href="#hyperparameter-tuning">hyperparameter tuning</a>. Large C and large γ both lead to overfitting.</p>
        </section>
        <section>
          <h2>Where SVMs fit today</h2>
          <p>Strong on small and medium datasets with many features, such as text. On large tables, <a href="#gradient-boosting">gradient-boosted trees</a> usually win, and SVMs don't give probabilities without an extra calibration step. Compare them all in <a href="#model-zoo">the model zoo</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>On “Two groups”, drag C down: the street widens and more points become support vectors.</li>
            <li>Choose “One group inside the other”: no straight line works. Switch to RBF.</li>
            <li>With RBF, push γ up: the boundary wraps tight islands around single suppliers, and test accuracy drops.</li>
          </ul>
        </section>`,
    });

    let seed = 2, pre = "two", ker = "lin", train = [], test = [], M = null, sweep = [], q = [0.4, 0.3];
    function gen() {
      const r = rng(seed * 7 + PRE.findIndex((p) => p[0] === pre)), mk = (n) => Array.from({ length: n }, () => {
        if (pre === "ring") { const y = r() < 0.5 ? 1 : -1, rad = y > 0 ? 0.3 + 0.45 * Math.abs(r.normal()) * 0.6 : 1.5 + 0.35 * r.normal(), a = r() * 2 * Math.PI; return { x: [rad * Math.cos(a), rad * Math.sin(a)], y }; }
        const y = r() < 0.5 ? 1 : -1, s = pre === "two" ? 0.45 : 0.8, c = y > 0 ? [0.8, 0.7] : [-0.8, -0.6]; return { x: [c[0] + s * r.normal(), c[1] + s * r.normal()], y };
      });
      train = mk(80); test = mk(1000);
    }
    const Cv = () => 10 ** +$("#c").value, Gv = () => 10 ** +$("#g").value;
    const K = (a, b, g) => (ker === "lin" ? a[0] * b[0] + a[1] * b[1] : Math.exp(-g * ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)));
    function smo(C, g) {
      const n = train.length, X = train.map((p) => p.x), y = train.map((p) => p.y), Km = X.map((a) => X.map((b) => K(a, b, g))), al = new Array(n).fill(0); let b = 0, passes = 0, it = 0;
      const f = (i) => { let s = b; for (let k = 0; k < n; k++) if (al[k]) s += al[k] * y[k] * Km[k][i]; return s; };
      const r = rng(99);
      while (passes < 8 && it < 400) {
        it++; let ch = 0;
        for (let i = 0; i < n; i++) {
          const Ei = f(i) - y[i];
          if ((y[i] * Ei < -1e-3 && al[i] < C) || (y[i] * Ei > 1e-3 && al[i] > 0)) {
            let j = Math.floor(r() * (n - 1)); if (j >= i) j++;
            const Ej = f(j) - y[j], ai = al[i], aj = al[j];
            const L = y[i] !== y[j] ? Math.max(0, aj - ai) : Math.max(0, ai + aj - C), H = y[i] !== y[j] ? Math.min(C, C + aj - ai) : Math.min(C, ai + aj);
            if (L >= H) continue;
            const eta = 2 * Km[i][j] - Km[i][i] - Km[j][j]; if (eta >= 0) continue;
            let nj = aj - (y[j] * (Ei - Ej)) / eta; nj = Math.min(H, Math.max(L, nj)); if (Math.abs(nj - aj) < 1e-6) continue;
            const ni = ai + y[i] * y[j] * (aj - nj); al[i] = ni; al[j] = nj;
            const b1 = b - Ei - y[i] * (ni - ai) * Km[i][i] - y[j] * (nj - aj) * Km[i][j], b2 = b - Ej - y[i] * (ni - ai) * Km[i][j] - y[j] * (nj - aj) * Km[j][j];
            b = ni > 0 && ni < C ? b1 : nj > 0 && nj < C ? b2 : (b1 + b2) / 2; ch++;
          }
        }
        passes = ch === 0 ? passes + 1 : 0;
      }
      const sv = al.map((a, i) => [a, i]).filter(([a]) => a > 1e-6).map(([a, i]) => ({ a, i, x: X[i], y: y[i] }));
      const score = (x) => sv.reduce((s, v) => s + v.a * v.y * K(v.x, x, g), b);
      const w = ker === "lin" ? [sv.reduce((s, v) => s + v.a * v.y * v.x[0], 0), sv.reduce((s, v) => s + v.a * v.y * v.x[1], 0)] : null;
      const acc = (d) => d.reduce((s, p) => s + ((score(p.x) >= 0 ? 1 : -1) === p.y ? 1 : 0), 0) / d.length;
      return { sv, b, score, w, C, g, tr: acc(train), te: acc(test) };
    }
    const P1 = new Plot($("#s1"), { x: [-3, 3], y: [-2.6, 2.6], pad: { l: 44, b: 38 } }), P2 = new Plot($("#s2"), { x: [-2, 3], pad: { l: 46, b: 38, r: 46 } });
    function contour(G, xs, ys, vals, lev) {
      const segs = [], v = (a, b) => vals[a][b] - lev, lerp = (p, q, a, b) => p + (q - p) * (a / (a - b));
      for (let i = 0; i < G - 1; i++) for (let j = 0; j < G - 1; j++) {
        const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1), pts = [];
        if ((a > 0) !== (b > 0)) pts.push([lerp(xs[i], xs[i + 1], a, b), ys[j]]);
        if ((b > 0) !== (c > 0)) pts.push([xs[i + 1], lerp(ys[j], ys[j + 1], b, c)]);
        if ((c > 0) !== (d > 0)) pts.push([lerp(xs[i + 1], xs[i], c, d), ys[j + 1]]);
        if ((d > 0) !== (a > 0)) pts.push([xs[i], lerp(ys[j + 1], ys[j], d, a)]);
        if (pts.length >= 2) segs.push([pts[0], pts[1]]); if (pts.length === 4) segs.push([pts[2], pts[3]]);
      }
      return segs;
    }
    function d1() {
      P1.resize(); const asp = P1.iw / P1.ih; P1.x = [-2.6 * Math.max(1, asp) , 2.6 * Math.max(1, asp)]; P1.y = [-2.6, 2.6]; P1.clear();
      P1.axes({ xLabel: "lead-time variability (standardised)", yLabel: "defect rate (std.)", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const G = 70, xs = Array.from({ length: G }, (_, i) => P1.x[0] + ((P1.x[1] - P1.x[0]) * i) / (G - 1)), ys = Array.from({ length: G }, (_, j) => P1.y[0] + ((P1.y[1] - P1.y[0]) * j) / (G - 1)), vals = xs.map((x) => ys.map((y) => M.score([x, y]))), g = P1.ctx;
      for (let i = 0; i < G - 1; i++) for (let j = 0; j < G - 1; j++) { const s = vals[i][j]; g.fillStyle = css(s >= 0 ? "--bad" : "--accent"); g.globalAlpha = 0.05 + 0.2 * Math.min(1, Math.abs(s) / 2); const x0 = Math.round(P1.sx(xs[i])), x1 = Math.round(P1.sx(xs[i + 1])), y0 = Math.round(P1.sy(ys[j + 1])), y1 = Math.round(P1.sy(ys[j])); g.fillRect(x0, y0, x1 - x0, y1 - y0); }
      g.globalAlpha = 1;
      [[0, [], 2.5], [1, [5, 4], 1.4], [-1, [5, 4], 1.4]].forEach(([lev, dash, w]) => { g.strokeStyle = css("--ink"); g.lineWidth = w; g.setLineDash(dash); g.beginPath(); contour(G, xs, ys, vals, lev).forEach(([a, b]) => { g.moveTo(P1.sx(a[0]), P1.sy(a[1])); g.lineTo(P1.sx(b[0]), P1.sy(b[1])); }); g.stroke(); }); g.setLineDash([]);
      const svs = new Set(M.sv.map((v) => v.i));
      train.forEach((p, i) => { P1.dot(p.x[0], p.x[1], 3.6, css(p.y > 0 ? "--bad" : "--accent"), css("--surface")); if (svs.has(i)) { g.strokeStyle = css("--ink"); g.lineWidth = 1.5; g.beginPath(); g.arc(P1.sx(p.x[0]), P1.sy(p.x[1]), 7.5, 0, 2 * Math.PI); g.stroke(); } });
      P1.dot(q[0], q[1], 6, css("--warm"), css("--surface"));
      $("#s1Cap").innerHTML = `Solid line: the boundary (score 0). Dashed: the kerbs (score ±1). Circled: the ${M.sv.length} support vectors; only these define the boundary. Orange: the point you clicked.`;
    }
    function d2() {
      P2.resize(); P2.x = [-2, 3]; P2.y = [0.5, 1]; P2.clear();
      P2.axes({ xLabel: "C (log scale)", yLabel: "accuracy", xTicks: [-2, -1, 0, 1, 2, 3], xFormat: (v) => (10 ** v >= 1 ? fmt(10 ** v, 0) : fmt(10 ** v, 2)), yFormat: (v) => Math.round(v * 100) + "%" });
      const xs = sweep.map((s) => s[0]); P2.path(xs, sweep.map((s) => s[1]), css("--muted"), 2, [5, 4]); P2.path(xs, sweep.map((s) => s[2]), css("--accent"), 2.5);
      const g = P2.ctx, mx = 80; g.strokeStyle = css("--violet"); g.lineWidth = 2; g.beginPath(); sweep.forEach((s, i) => { const X = P2.sx(s[0]), Y = P2.sy(0.5 + (0.5 * s[3]) / mx); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke();
      g.fillStyle = css("--violet"); g.font = "10px " + css("--font-mono"); g.textAlign = "left"; [0, 40, 80].forEach((v) => g.fillText(String(v), P2.w - P2.pad.r + 4, P2.sy(0.5 + (0.5 * v) / mx)));
      const c = +$("#c").value; P2.path([c, c], P2.y, css("--warm"), 1.5);
      const b = sweep.reduce((a, s) => (s[2] > a[2] ? s : a));
      $("#s2Cap").innerHTML = `Dashed: training accuracy. Blue: test accuracy (best ${fmt(b[2] * 100, 1)}% at C = ${fmt(10 ** b[0], 10 ** b[0] < 1 ? 2 : 0)}). Purple: number of support vectors (right axis). Small C keeps many support vectors and a wide street.`;
    }
    function work() {
      const s = M.score(q), B = (t) => `<b style="color:var(--ink)">${t}</b>`, g = M.g, terms = M.sv.map((v) => ({ v, k: K(v.x, q, g) })).map((t) => ({ ...t, c: t.v.a * t.v.y * t.k })).sort((a, b) => Math.abs(b.c) - Math.abs(a.c));
      const L = [`Point (${fmt(q[0], 2)}, ${fmt(q[1], 2)}). Score = b + Σ αᵢ yᵢ K(xᵢ, x) over the ${M.sv.length} support vectors`];
      if (M.w) L.push(`Linear: w = Σ αᵢyᵢxᵢ = (${fmt(M.w[0], 3)}, ${fmt(M.w[1], 3)}), so score = ${fmt(M.w[0], 3)}×${fmt(q[0], 2)} + ${fmt(M.w[1], 3)}×${fmt(q[1], 2)} + ${fmt(M.b, 3)}`);
      terms.slice(0, 5).forEach((t) => L.push(`&nbsp;&nbsp;SV (${fmt(t.v.x[0], 2)}, ${fmt(t.v.x[1], 2)}) y=${t.v.y > 0 ? "+1" : "−1"} α=${fmt(t.v.a, 3)} K=${fmt(t.k, 3)} → ${t.c >= 0 ? "+" : ""}${fmt(t.c, 3)}`));
      if (terms.length > 5) L.push(`&nbsp;&nbsp;… ${terms.length - 5} more support vectors add ${fmt(terms.slice(5).reduce((a, t) => a + t.c, 0), 3)}`);
      L.push(`b = ${fmt(M.b, 3)};  score = ${B(fmt(s, 3))} → ${B(s >= 0 ? "at risk" : "reliable")}${Math.abs(s) < 1 ? " (inside the street: a less certain call)" : ""}`);
      $("#work").innerHTML = L.map((l) => `<div style="padding-left:1.2em;text-indent:-1.2em">${l}</div>`).join("");
    }
    function readouts() {
      const mw = M.w ? 2 / Math.hypot(...M.w) : null;
      $("#ro").innerHTML = [["Support vectors", `<span class="num">${M.sv.length} of ${train.length}</span>`], ["Street width", `<span class="num">${mw ? fmt(mw, 2) : "curved"}</span>`], ["Training accuracy", `<span class="num">${fmt(M.tr * 100, 1)}%</span>`], ["Test accuracy", `<span class="pill ${M.te > 0.9 ? "ok" : M.te > 0.75 ? "warn" : "bad"}">${fmt(M.te * 100, 1)}%</span>`]]
        .map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { const c = Cv(), g = Gv(); $("#cV").textContent = c < 1 ? fmt(c, 2) : fmt(c, 0); $("#gV").textContent = (g < 1 ? fmt(g, 2) : fmt(g, 1)) + (ker === "lin" ? " (not used)" : ""); }
    function fitAll() { M = smo(Cv(), Gv()); }
    function doSweep() { sweep = []; for (let lc = -2; lc <= 3.001; lc += 0.5) { const m = smo(10 ** lc, Gv()); sweep.push([lc, m.tr, m.te, m.sv.length]); } }
    function draw() { labels(); d1(); d2(); work(); readouts(); }
    function full() { fitAll(); doSweep(); draw(); }
    $("#c").addEventListener("input", () => { fitAll(); draw(); });
    $("#g").addEventListener("input", full);
    const seg = (id, f) => root.querySelectorAll(`#${id} button`).forEach((b) => b.addEventListener("click", () => { root.querySelectorAll(`#${id} button`).forEach((x) => x.setAttribute("aria-pressed", x === b)); f(b.dataset.v); full(); }));
    seg("pre", (v) => { pre = v; gen(); }); seg("ker", (v) => (ker = v));
    $("#s1").addEventListener("click", (e) => { const r = $("#s1").getBoundingClientRect(); q = [P1.ix(e.clientX - r.left), P1.iy(e.clientY - r.top)]; draw(); });
    $("#resim").addEventListener("click", () => { seed++; gen(); full(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 2; pre = "two"; ker = "lin"; q = [0.4, 0.3]; root.querySelectorAll(".seg").forEach((sg) => sg.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", i === 0))); gen(); full(); });
    gen(); full();
    return watch([$("#s1"), $("#s2")], () => { d1(); d2(); });
  },
});
