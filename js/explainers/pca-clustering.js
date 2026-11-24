Lab.register({
  id: "pca-clustering",
  group: "Data quality",
  title: "Finding groups: k-means clustering and PCA",
  blurb: "Group SKUs by sales volume and variability with k-means, watch it iterate, pick k with the elbow chart, and see why you must standardise first. PCA shows which directions carry the information.",
  lede: "Clustering looks for natural groups without being told what they are: SKU segments, customer types, store formats. k-means is the workhorse. Pick k centres, assign every point to its nearest centre, move each centre to the middle of its points, and repeat. It's simple and fast, but 'nearest' depends on the units you measure in, and you have to choose k. PCA (principal component analysis) is the companion tool: it finds the directions in which the data vary most, so you can see which features matter and squash many features down to two or three you can plot.",
  quiz: [
    ["You cluster SKUs on weekly units (0–500) and CV (0–2) without standardising. What happens?", "Distances are dominated by weekly units, because a gap of 100 units dwarfs any CV difference. The clusters become slices by volume and ignore variability. Standardise each feature (subtract the mean, divide by the SD) first."],
    ["What does k-means minimise?", "The within-cluster sum of squares: the total squared distance from each point to its own cluster centre. Each step (assign, then move centres) can only lower it, so it always converges, though possibly to a local minimum."],
    ["How do you choose k with the elbow chart?", "Plot within-cluster sum of squares against k. It always falls as k rises; look for the bend where adding another cluster stops helping much. The silhouette score and business sense (can you act on 7 segments?) are good checks."],
    ["PC1 explains 85% of the variance of two features. What does that tell you?", "The two features move together strongly, so most of the information sits along one direction. One combined score (PC1) would describe the data almost as well as both features."],
    ["Why run k-means several times with different starting points?", "It can get stuck in a poor local minimum depending on where the centres start. Run it several times (or use k-means++ starts) and keep the solution with the lowest within-cluster sum of squares."],
  ],
  diy: {
    intro: "Put SKU names in A2:A121, weekly units in B2:B121 and CV in C2:C121. This sets up k = 3; extend the same pattern for other k.",
    steps: [
      ["Standardise both features so they count equally.", "D2: =STANDARDIZE(B2,AVERAGE(B$2:B$121),STDEV.S(B$2:B$121))\nE2: =STANDARDIZE(C2,AVERAGE(C$2:C$121),STDEV.S(C$2:C$121))"],
      ["Starting centres: copy three rows' standardised values into a small table (centre number in H, coordinates in I and J). Pick rows far apart.", "H2: 1   I2: =D5   J2: =E5\nH3: 2   I3: =D40  J3: =E40\nH4: 3   I4: =D90  J4: =E90"],
      ["Squared distance from each SKU to each centre.", "K2: =(D2-$I$2)^2+(E2-$J$2)^2\nL2: =(D2-$I$3)^2+(E2-$J$3)^2\nM2: =(D2-$I$4)^2+(E2-$J$4)^2"],
      ["Assign each SKU to its nearest centre.", "N2: =MATCH(MIN(K2:M2),K2:M2,0)"],
      ["New centre = average of its SKUs. Paste these values over I2:J4 and recalculate; repeat until column N stops changing (usually under 10 rounds).", "P2: =AVERAGEIF($N$2:$N$121,H2,$D$2:$D$121)\nQ2: =AVERAGEIF($N$2:$N$121,H2,$E$2:$E$121)"],
      ["Within-cluster sum of squares for this k. Repeat for k = 1 … 8 and chart it for the elbow.", "=SUMPRODUCT((N2:N121=1)*K2:K121+(N2:N121=2)*L2:L121+(N2:N121=3)*M2:M121)"],
      ["PCA for two standardised features: the covariance (here equal to the correlation) and the two eigenvalues.", "S1: =COVARIANCE.S(D2:D121,E2:E121)\nS2: =1+ABS(S1)   (λ₁)\nS3: =1-ABS(S1)   (λ₂)\nS4: =S2/(S2+S3)  (share explained by PC1)"],
      ["PC1 score for each SKU. With two standardised features PC1's direction is (1, 1)/√2 if they correlate positively, (1, −1)/√2 if negatively.", "T2: =(D2+SIGN($S$1)*E2)/SQRT(2)"],
    ],
  },
  deeper: [
    ["Lloyd (1982), Least squares quantization in PCM, IEEE Trans. Information Theory 28(2)", "https://doi.org/10.1109/TIT.1982.1056489", "the k-means algorithm (written in 1957)"],
    ["Arthur & Vassilvitskii (2007), k-means++: the advantages of careful seeding, SODA", "https://dl.acm.org/doi/10.5555/1283383.1283494", "the starting rule used on this page"],
    ["Pearson (1901), On lines and planes of closest fit to systems of points in space, Phil. Mag. 2(11)", "https://doi.org/10.1080/14786440109462720", "the original PCA paper"],
    ["Rousseeuw (1987), Silhouettes: a graphical aid to the interpretation and validation of cluster analysis, J. Comp. Appl. Math. 20", "https://doi.org/10.1016/0377-0427(87)90125-7", "a second way to choose k"],
    ["Jolliffe & Cadima (2016), Principal component analysis: a review and recent developments, Phil. Trans. R. Soc. A 374", "https://doi.org/10.1098/rsta.2015.0202", "a readable, open-access review"],
    ["James, Witten, Hastie & Tibshirani, An Introduction to Statistical Learning, ch. 12 (free PDF)", "https://www.statlearning.com/", "unsupervised learning: PCA and clustering, with labs"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor" opacity=".55"><circle cx="18" cy="44" r="3"/><circle cx="24" cy="50" r="3"/><circle cx="14" cy="52" r="3"/><circle cx="48" cy="16" r="3"/><circle cx="54" cy="22" r="3"/><circle cx="44" cy="24" r="3"/><circle cx="76" cy="44" r="3"/><circle cx="82" cy="38" r="3"/><circle cx="72" cy="50" r="3"/></g><circle cx="19" cy="49" r="10" stroke-dasharray="3 3"/><circle cx="49" cy="21" r="10" stroke-dasharray="3 3"/><circle cx="77" cy="44" r="10" stroke-dasharray="3 3"/></svg>`,

  mount(root) {
    const { Plot, watch, css, rng } = Lab;
    let seed = 5, stdz = true, showPca = true;
    const COLS = ["--accent", "--warm", "--good", "--violet", "--bad", "--muted", "--ink", "--violet-soft"];

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="pc-two">
          <figure class="plot">
            <canvas id="sc" aria-label="SKUs plotted by weekly units and variability, coloured by cluster, with cluster centres and principal component arrows"></canvas>
            <figcaption id="scCap"></figcaption>
          </figure>
          <figure class="plot">
            <canvas id="elb" aria-label="Elbow chart: within-cluster sum of squares against number of clusters"></canvas>
            <figcaption>Elbow chart: within-cluster sum of squares for k = 1 to 8. Look for the bend.</figcaption>
          </figure>
        </div>
        <div class="legend"><span><i style="background:var(--ink)"></i>Cluster centre (×)</span><span><i style="background:var(--bad)"></i>PC1 arrow</span><span><i style="background:var(--muted)"></i>PC2 arrow</span></div>
        <div class="plot" style="padding:14px">
          <h4 class="pc-h">Clusters</h4>
          <div style="overflow-x:auto"><table id="tbl" class="pc-t"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="pc-h">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.pc-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:14px}
        .pc-two figure{margin:0;min-width:0}
        .pc-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .pc-t{width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums}
        .pc-t th{text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500}
        .pc-t td{text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono)}
        .pc-t th:first-child,.pc-t td:first-child{text-align:left}</style>`,
      panel: `
        <div class="ctrl"><label for="k">Clusters k <output id="kV"></output></label><input type="range" id="k" min="1" max="8" step="1" value="3"></div>
        <div class="ctrl"><label for="it">k-means step <output id="itV"></output></label><input type="range" id="it" min="0" max="20" step="1" value="20"></div>
        <div class="ctrl"><label for="sep">How distinct the true groups are <output id="sepV"></output></label><input type="range" id="sep" min="0" max="3" step="0.1" value="1.6"></div>
        <div class="ctrl"><label>Features</label>
          <div class="seg" id="std"><button type="button" data-v="1" aria-pressed="true">Standardised</button><button type="button" data-v="0" aria-pressed="false">Raw units</button></div></div>
        <div class="ctrl"><label>PCA arrows</label>
          <div class="seg" id="pca"><button type="button" data-v="1" aria-pressed="true">Show</button><button type="button" data-v="0" aria-pressed="false">Hide</button></div></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New data</button></div>`,
      notes: `
        <section>
          <h2>k-means in four lines</h2>
          <ol>
            <li>Choose k starting centres (k-means++: first at random, each next one far from those already chosen).</li>
            <li>Assign each point to its nearest centre (squared Euclidean distance).</li>
            <li>Move each centre to the average of its points.</li>
            <li>Repeat 2–3 until no point changes cluster.</li>
          </ol>
          <div class="eq">WSS = Σ over clusters Σ over points ‖x − centre‖²</div>
          <p>Drag the step slider back to 0 and forward again to watch the centres move.</p>
        </section>
        <section>
          <h2>Why standardise</h2>
          <div class="eq">z = (x − mean) ÷ SD</div>
          <p>k-means and PCA both use distances or variances, which depend on units. Weekly units range over hundreds, CV over about 2, so raw distances are almost all about volume. After standardising each feature has SD 1 and both count equally. Switch to Raw units to see the clusters turn into volume bands.</p>
        </section>
        <section>
          <h2>PCA</h2>
          <p>PCA finds the direction with the largest spread (PC1), then the largest spread at right angles to it (PC2), and so on. These are the eigenvectors of the covariance matrix; the eigenvalues are the variance along each one. With many features, plotting PC1 against PC2 is often the best two-dimensional picture of the data, and the share of variance explained tells you how much you've lost.</p>
          <p>For two standardised features with correlation r, the eigenvalues are simply 1 + |r| and 1 − |r|.</p>
          <p>Related: <a href="#abc-xyz">ABC-XYZ segmentation</a> (rule-based groups on the same two features), <a href="#distributions">distributions</a> (log skewed volumes before clustering).</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Switch to Raw units: the clusters stop following the visible groups and slice by volume instead.</li>
            <li>Set k to 1–8 and watch the elbow: the bend is at the true number of groups (3).</li>
            <li>Lower 'how distinct' to 0: there are no real groups, yet k-means still returns k tidy clusters. The elbow has no bend. Clustering always finds groups; it's up to you to check they're real.</li>
            <li>Press New data a few times at k = 5: the solutions change, a sign that 5 isn't a natural k.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const S = new Plot($("#sc"), { x: [0, 1], y: [0, 1], pad: { l: 50, b: 40 } });
    const E = new Plot($("#elb"), { x: [0.5, 8.5], y: [0, 1], pad: { l: 56, b: 40 } });

    function data() {
      const r = rng(seed), sep = +$("#sep").value, pts = [];
      const G = [[150, 0.35], [110, 1.15], [290, 0.6]]; // weekly units, CV, share-ish
      for (let i = 0; i < 120; i++) {
        const g = i % 3, [u, c] = G[g];
        const cu = 170 + (u - 170) * sep / 1.6, cc = 0.65 + (c - 0.65) * sep / 1.6;
        pts.push({ u: Math.max(2, cu + 45 * r.normal()), c: Math.max(0.05, cc + 0.13 * r.normal()), g });
      }
      return pts;
    }
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    const sdv = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };

    function kmeans(X, k, steps, r) {
      // k-means++ start
      const C = [X[Math.floor(r() * X.length)].slice()];
      while (C.length < k) {
        const d = X.map((p) => Math.min(...C.map((c) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2)));
        let t = r() * d.reduce((a, b) => a + b, 0), i = 0; while (t > d[i] && i < X.length - 1) { t -= d[i]; i++; }
        C.push(X[i].slice());
      }
      const hist = [C.map((c) => c.slice())];
      let lab = X.map(() => 0), it = 0, done = false;
      const assign = () => X.map((p) => { let b = 0, bd = Infinity; C.forEach((c, j) => { const dd = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2; if (dd < bd) { bd = dd; b = j; } }); return b; });
      lab = assign();
      while (it < steps && !done) {
        for (let j = 0; j < k; j++) { const m = X.filter((_, i) => lab[i] === j); if (m.length) C[j] = [mean(m.map((p) => p[0])), mean(m.map((p) => p[1]))]; }
        const nl = assign(); done = nl.every((v, i) => v === lab[i]); lab = nl; it++; hist.push(C.map((c) => c.slice()));
      }
      const wss = X.reduce((s, p, i) => s + (p[0] - C[lab[i]][0]) ** 2 + (p[1] - C[lab[i]][1]) ** 2, 0);
      return { C, lab, it, done, wss, hist };
    }
    function best(X, k, steps) { let b = null; for (let t = 0; t < 5; t++) { const m = kmeans(X, k, steps, rng(seed * 97 + k * 13 + t)); if (!b || m.wss < b.wss) b = m; } return b; }

    function draw() {
      const k = +$("#k").value, steps = +$("#it").value;
      $("#kV").textContent = k; $("#sepV").textContent = (+$("#sep").value).toFixed(1);
      const pts = data(), U = pts.map((p) => p.u), Cv = pts.map((p) => p.c);
      const mu = [mean(U), mean(Cv)], sd = [sdv(U), sdv(Cv)];
      const X = pts.map((p) => (stdz ? [(p.u - mu[0]) / sd[0], (p.c - mu[1]) / sd[1]] : [p.u, p.c]));
      const km = steps >= 20 ? best(X, k, 50) : kmeans(X, k, steps, rng(seed * 97 + k * 13));
      $("#itV").textContent = steps >= 20 ? `run to the end (${km.it} rounds)` : `${km.it}${km.done ? " (converged)" : ""}`;

      // PCA on the features as used
      const fx = X.map((p) => p[0]), fy = X.map((p) => p[1]), mx = mean(fx), my = mean(fy);
      let a = 0, b = 0, c = 0; X.forEach((p) => { a += (p[0] - mx) ** 2; b += (p[0] - mx) * (p[1] - my); c += (p[1] - my) ** 2; });
      a /= X.length - 1; b /= X.length - 1; c /= X.length - 1;
      const tr = a + c, det = a * c - b * b, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det)), l1 = tr / 2 + disc, l2 = tr / 2 - disc;
      let v1 = Math.abs(b) > 1e-12 ? [l1 - c, b] : a >= c ? [1, 0] : [0, 1]; const nn = Math.hypot(...v1); v1 = [v1[0] / nn, v1[1] / nn]; const v2 = [-v1[1], v1[0]];

      const xs = X.map((p) => p[0]), ys = X.map((p) => p[1]);
      const pad = (lo, hi) => [lo - (hi - lo) * 0.08, hi + (hi - lo) * 0.08];
      S.x = pad(Math.min(...xs), Math.max(...xs)); S.y = pad(Math.min(...ys), Math.max(...ys));
      S.clear(); S.axes({ xLabel: stdz ? "weekly units (standardised)" : "weekly units", yLabel: stdz ? "CV (standardised)" : "CV of weekly demand", xCount: 5, yCount: 5, yFormat: stdz ? undefined : (v) => v.toFixed(1) });
      $("#scCap").textContent = stdz ? "Each dot is a SKU. Both features rescaled to mean 0, SD 1." : "Each dot is a SKU, in raw units. Distances are almost all about weekly units.";
      X.forEach((p, i) => S.dot(p[0], p[1], 3.4, css(COLS[km.lab[i] % COLS.length])));
      const g = S.ctx;
      if (steps < 20 && km.hist.length > 1) km.C.forEach((_, j) => S.path(km.hist.map((h) => h[j][0]), km.hist.map((h) => h[j][1]), css("--ink"), 1.2, [3, 3], 0.7));
      km.C.forEach((cc, j) => {
        const X0 = S.sx(cc[0]), Y0 = S.sy(cc[1]);
        g.strokeStyle = css("--surface"); g.lineWidth = 6; g.beginPath(); g.moveTo(X0 - 7, Y0 - 7); g.lineTo(X0 + 7, Y0 + 7); g.moveTo(X0 + 7, Y0 - 7); g.lineTo(X0 - 7, Y0 + 7); g.stroke();
        g.strokeStyle = css(COLS[j % COLS.length]); g.lineWidth = 3; g.stroke();
      });
      if (showPca) {
        const arrow = (v, len, col) => {
          const x0 = S.sx(mx), y0 = S.sy(my), x1 = S.sx(mx + v[0] * len), y1 = S.sy(my + v[1] * len);
          g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
          const ang = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 10 * Math.cos(ang - 0.4), y1 - 10 * Math.sin(ang - 0.4)); g.lineTo(x1 - 10 * Math.cos(ang + 0.4), y1 - 10 * Math.sin(ang + 0.4)); g.closePath(); g.fill();
        };
        arrow(v1, 2 * Math.sqrt(l1), css("--bad")); arrow(v2, 2 * Math.sqrt(Math.max(0, l2)), css("--muted"));
      }

      // elbow
      const ws = [];
      for (let kk = 1; kk <= 8; kk++) ws.push(kk === k && steps >= 20 ? km.wss : best(X, kk, 50).wss);
      E.y = [0, Math.max(...ws) * 1.08];
      E.clear(); E.axes({ xTicks: [1, 2, 3, 4, 5, 6, 7, 8], xFormat: (v) => v, xLabel: "k (number of clusters)", yLabel: "within-cluster SS", yCount: 5, yFormat: (v) => (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v.toFixed(0)) });
      const ks = [1, 2, 3, 4, 5, 6, 7, 8];
      E.path(ks, ws, css("--accent"), 2.4);
      ks.forEach((kk) => E.dot(kk, ws[kk - 1], kk === k ? 6 : 3.5, kk === k ? css("--bad") : css("--accent"), css("--surface")));

      // cluster table (in original units)
      const rows = [];
      for (let j = 0; j < k; j++) {
        const m = pts.filter((_, i) => km.lab[i] === j);
        if (!m.length) continue;
        const tg = [0, 0, 0]; m.forEach((p) => tg[p.g]++);
        rows.push(`<tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(${COLS[j % COLS.length]});margin-right:6px"></i>Cluster ${j + 1}</td><td>${m.length}</td><td>${mean(m.map((p) => p.u)).toFixed(0)}</td><td>${mean(m.map((p) => p.c)).toFixed(2)}</td><td>${tg.join(" / ")}</td></tr>`);
      }
      $("#tbl").innerHTML = `<tr><th>Cluster</th><th>SKUs</th><th>Avg weekly units</th><th>Avg CV</th><th>True groups A / B / C</th></tr>` + rows.join("");

      // purity
      let pure = 0; for (let j = 0; j < k; j++) { const tg = [0, 0, 0]; pts.forEach((p, i) => { if (km.lab[i] === j) tg[p.g]++; }); pure += Math.max(...tg); }
      $("#ro").innerHTML = `
        <div class="ro"><b>Within-cluster SS</b><span class="num">${km.wss >= 1000 ? Math.round(km.wss).toLocaleString() : km.wss.toFixed(1)}</span></div>
        <div class="ro"><b>Rounds</b><span class="num">${km.it}</span></div>
        <div class="ro"><b>PC1 explains</b><span class="num">${((l1 / (l1 + l2)) * 100).toFixed(1)}%</span></div>
        <div class="ro"><b>Match to true groups</b><span class="num">${((pure / pts.length) * 100).toFixed(0)}%</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      const p0 = pts[0], x0 = X[0], f = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2));
      const d0 = km.C.map((cc) => (x0[0] - cc[0]) ** 2 + (x0[1] - cc[1]) ** 2);
      const lines = [
        `means: units ${mu[0].toFixed(1)}, CV ${mu[1].toFixed(3)}; SDs: units ${sd[0].toFixed(1)}, CV ${sd[1].toFixed(3)}`,
        stdz ? `SKU 1: units ${p0.u.toFixed(0)} → (${p0.u.toFixed(0)} − ${mu[0].toFixed(1)}) ÷ ${sd[0].toFixed(1)} = ${B(x0[0].toFixed(2))}; CV ${p0.c.toFixed(2)} → (${p0.c.toFixed(2)} − ${mu[1].toFixed(3)}) ÷ ${sd[1].toFixed(3)} = ${B(x0[1].toFixed(2))}`
          : `SKU 1: units ${p0.u.toFixed(0)}, CV ${p0.c.toFixed(2)} ${M("(raw: a CV gap of 1 counts the same as 1 unit a week)")}`,
        `squared distance to each centre: ${d0.map((d, j) => `c${j + 1} ${f(d)}`).join(", ")} → nearest ${B("cluster " + (km.lab[0] + 1))}`,
        `centre ${km.lab[0] + 1} = average of its ${km.lab.filter((l) => l === km.lab[0]).length} SKUs = (${f(km.C[km.lab[0]][0])}, ${f(km.C[km.lab[0]][1])})`,
        `covariance matrix [[${f(a)}, ${f(b)}], [${f(b)}, ${f(c)}]] → eigenvalues λ₁ = ${B(f(l1))}, λ₂ = ${B(f(l2))}`,
        `PC1 share = ${f(l1)} ÷ (${f(l1)} + ${f(l2)}) = ${B(((l1 / (l1 + l2)) * 100).toFixed(1) + "%")}; PC1 direction (${v1[0].toFixed(3)}, ${v1[1].toFixed(3)})${stdz ? "" : M(" — almost pure 'weekly units', because its variance is thousands of times larger")}`,
      ];
      $("#work").innerHTML = lines.map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    const seg = (id, set) => $(id).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; set(b.dataset.v === "1"); $(id).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    seg("#std", (v) => (stdz = v));
    seg("#pca", (v) => (showPca = v));
    ["#k", "#it", "#sep"].forEach((s) => $(s).addEventListener("input", draw));
    $("#newd").addEventListener("click", () => { seed++; draw(); });
    draw();
    return watch([S.c, E.c], (resized) => { if (resized) { S.resize(); E.resize(); } draw(); });
  },
});
