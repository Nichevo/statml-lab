Lab.register({
  id: "cross-validation",
  group: "Machine learning",
  title: "Overfitting and cross-validation",
  blurb: "Fit curves of rising flexibility to a small dataset. Training error keeps falling, but error on unseen data turns back up. K-fold cross-validation finds the sweet spot using only the data you have.",
  lede: "A flexible enough model can fit any dataset perfectly, including its noise. That is overfitting: the model looks brilliant on the data it learned from and does worse on anything new. You can't judge a model on its own training data. Cross-validation holds back part of the data, tests on it, and rotates so every point gets a turn. The average error on the held-back parts estimates how the model will do in real use.",
  quiz: [
    ["A degree-9 polynomial fits 10 training points with zero error. Is it a good model?", "Almost certainly not. With 10 coefficients it can pass through any 10 points, noise and all. Its error on new data will usually be large: the curve swings wildly between points."],
    ["Describe 5-fold cross-validation in four steps.", "Split the data into 5 equal folds. Train on 4 folds and measure error on the 5th. Repeat so each fold is held out once. Average the 5 errors and use that to compare models."],
    ["Why does training error always fall as the model gets more flexible, but CV error doesn't?", "More flexibility can only fit the training points better. But beyond the true pattern's complexity, the extra flexibility goes into fitting noise, which doesn't repeat in held-out data, so CV error rises again."],
    ["Can you use ordinary k-fold cross-validation for a forecasting model?", "Not safely. Random folds let the model train on the future and test on the past, and neighbouring weeks leak information. Use rolling-origin evaluation instead: always train on the past and test on the period after it (see backtesting)."],
    ["CV error is lowest at degree 3, but degree 4 is only a hair worse. Which should you pick?", "Usually degree 3. When scores are within noise of each other, prefer the simpler model (the 'one standard error rule'): it's cheaper and less likely to misbehave."],
  ],
  diy: {
    intro: "x in A2:A31, y in B2:B31. In Excel you can fit polynomials with LINEST and powers of x, and do 5-fold CV with a fold number column.",
    steps: [
      ["Fold number for each row (fixed, so results don't reshuffle: paste as values after creating).", "C2: =MOD(ROW()-2,5)+1   (or =RANDBETWEEN(1,5), then paste values)"],
      ["Polynomial of degree 3 fitted on rows not in fold k (k in F1): put x, x², x³ in D:F for training rows only, then use LINEST.", "=LINEST(B_train, D_train:F_train)   (returns b3, b2, b1, b0)"],
      ["Prediction for a held-out row.", "=b0 + b1*A2 + b2*A2^2 + b3*A2^3"],
      ["Squared error on the held-out fold.", "=SUMPRODUCT((C2:C31=$F$1)*(B2:B31-pred)^2)/COUNTIF(C2:C31,$F$1)"],
      ["Repeat for k = 1 to 5 (a Data Table over F1), then average: that's the 5-fold CV error for degree 3. Repeat for each degree and pick the lowest.", "=AVERAGE(fold_errors)"],
    ],
  },
  deeper: [
    ["Stone (1974), Cross-validatory choice and assessment of statistical predictions, JRSS B 36(2)", "https://doi.org/10.1111/j.2517-6161.1974.tb00994.x", "the classic paper on cross-validation"],
    ["Arlot & Celisse (2010), A survey of cross-validation procedures for model selection, Statistics Surveys 4", "https://doi.org/10.1214/09-SS054", "which CV variant to use when"],
    ["Bergmeir, Hyndman & Koo (2018), A note on the validity of cross-validation for evaluating autoregressive time series prediction, CSDA 120", "https://doi.org/10.1016/j.csda.2017.11.003", "when CV is and isn't OK for time series"],
    ["James et al., An Introduction to Statistical Learning, ch. 5 (free PDF)", "https://www.statlearning.com/", "resampling methods and cross-validation"],
    ["Hyndman & Athanasopoulos, FPP3 §5.10: Time series cross-validation", "https://otexts.com/fpp3/tscv.html", "the forecasting version: rolling origin"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 10 C 20 56, 40 60, 54 40 S 80 6, 90 4" stroke-width="2.5"/><path d="M6 44 C 30 40, 60 36, 90 30" stroke-dasharray="4 3"/><g fill="currentColor"><circle cx="14" cy="34" r="3"/><circle cx="28" cy="48" r="3"/><circle cx="44" cy="44" r="3"/><circle cx="60" cy="30" r="3"/><circle cx="76" cy="20" r="3"/></g></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, solve } = Lab;
    const truth = (x) => Math.sin(2.6 * x) + 0.4 * x; // the real pattern, x in [-1, 1]
    const MAXD = 12, FOLDCOLS = ["--accent", "--warm", "--violet", "--good", "--bad"];
    const h4 = (t) => `<h4 style="margin:0;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="padding:8px 8px 4px">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:4px 6px 6px">${h4("The data and the fitted curve")}
            <div class="seg" id="view" style="min-width:250px"><button type="button" data-v="all" aria-pressed="true">Fit on all data</button><button type="button" data-v="fold" aria-pressed="false">Show one CV fold</button></div></div>
          <canvas id="fc" aria-label="Training points and fitted polynomial"></canvas>
          <div class="legend" id="lg1"></div>
          <figcaption id="fcCap"></figcaption>
        </figure>
        <figure class="plot wide" style="padding:8px 8px 4px">
          <div style="padding:4px 6px 6px">${h4("Error by flexibility: the U-curve")}</div>
          <canvas id="ec" aria-label="Training, cross-validation and true test error by polynomial degree"></canvas>
          <div class="legend"><span><i style="background:var(--warm)"></i>training error</span><span><i style="background:var(--accent)"></i>k-fold CV error (estimated from training data only)</span><span><i style="background:var(--violet)"></i>true error on 2,000 fresh points</span></div>
          <figcaption id="ecCap"></figcaption>
        </figure>
        <div class="plot" style="padding:14px">${h4("Worked out: k-fold CV for the chosen degree")}<div id="work" style="margin-top:10px;overflow-x:auto"></div></div>`,
      panel: `
        <div class="ctrl"><label for="deg">Polynomial degree (flexibility) <output id="degV"></output></label><input type="range" id="deg" min="1" max="${MAXD}" step="1" value="3"></div>
        <div class="ctrl"><label for="k">Number of folds k <output id="kV"></output></label><input type="range" id="k" min="2" max="10" step="1" value="5"></div>
        <div class="ctrl"><label for="fold">Fold to show <output id="foldV"></output></label><input type="range" id="fold" min="1" max="10" step="1" value="1"></div>
        <div class="ctrl"><label for="n">Training points <output id="nV"></output></label><input type="range" id="n" min="12" max="120" step="1" value="25"></div>
        <div class="ctrl"><label for="noise">Noise <output id="noiseV"></output></label><input type="range" id="noise" min="0.05" max="1" step="0.05" value="0.35"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="pick" type="button">Use the degree CV picks</button><button class="btn" id="newd" type="button">New data</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Three kinds of error</h2>
          <ul>
            <li><b>Training error</b>: how well the model fits the data it learned from. It only ever goes down as the model gets more flexible, so it's useless for choosing flexibility.</li>
            <li><b>Test error</b>: error on genuinely new data, which is what you care about. In real life you don't have it in advance. Here it's computed on 2,000 fresh points from the same process.</li>
            <li><b>Cross-validation error</b>: an estimate of test error built only from the training data, by holding parts back in turn.</li>
          </ul>
          <div class="eq">CV error = (1/k) Σ<sub>folds</sub> mean squared error on that fold, using a model trained on the other k − 1 folds</div>
          <p>The U-shape is the <a href="#bias-variance">bias–variance trade-off</a>. On the left, the model is too rigid to follow the pattern (bias). On the right, it bends to the noise of this particular sample (variance).</p>
        </section>
        <section>
          <h2>Choosing k</h2>
          <p>k = 5 or 10 is standard. Small k trains each model on less data, so CV error is a bit pessimistic. k = n (leave-one-out) uses nearly all the data each time but costs n fits and can be noisy. Whatever k, use the same folds to compare models.</p>
          <p>On this page the two end points always stay in the training folds. Holding one out would mean predicting beyond the range of the data, which is extrapolation, and high-degree polynomials go wild there. That is a separate danger from overfitting, and a good reason never to trust a flexible model outside the range it was trained on.</p>
          <p>For <b>time series</b>, don't shuffle: train on the past, test on the next period, and roll forward. See <a href="#backtesting">backtesting with rolling origins</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Slide the degree from 1 to 12 and watch the curve: too stiff at 1, about right at 3 to 5, wild at 10 or more.</li>
            <li>Watch the error chart: the training line keeps falling, while the CV and true-error lines turn up.</li>
            <li>Raise the training points to 120. Overfitting shrinks: high degrees behave much better with more data.</li>
            <li>Switch to "Show one CV fold" and step through the folds: each time, a different fifth of the points is hidden and predicted.</li>
            <li>Press "New data" a few times. The CV pick moves around a little, but it usually lands near the degree with the lowest true error.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pF = new Plot($("#fc"), { x: [-1.05, 1.05], y: [-2.4, 2.4], pad: { l: 44, b: 36 } }), pE = new Plot($("#ec"), { x: [0.7, MAXD + 0.3], pad: { l: 54, b: 38 } });
    let seed = 1, view = "all", D = null, E = null;

    function polyfit(xs, ys, d) {
      const m = d + 1, A = Array.from({ length: m }, () => new Array(m).fill(0)), b = new Array(m).fill(0);
      xs.forEach((x, i) => { const p = [1]; for (let j = 1; j < m; j++) p.push(p[j - 1] * x); for (let r = 0; r < m; r++) { b[r] += p[r] * ys[i]; for (let c = 0; c < m; c++) A[r][c] += p[r] * p[c]; } });
      for (let r = 0; r < m; r++) A[r][r] += 1e-9;
      return solve(A, b);
    }
    const pv = (c, x) => { let s = 0, p = 1; for (const k of c) { s += k * p; p *= x; } return s; };
    const mse = (c, xs, ys) => xs.reduce((s, x, i) => s + (pv(c, x) - ys[i]) ** 2, 0) / xs.length;

    function data() {
      const r = rng((seed + 3) * 313), n = +$("#n").value, nz = +$("#noise").value;
      const xs = Array.from({ length: n }, (_, i) => -1 + (2 * (i + 0.15 + 0.7 * r())) / n), ys = xs.map((x) => truth(x) + nz * r.normal());
      // fold assignment: random, but the two end points always stay in training (a held-out end point means extrapolating, where polynomials explode)
      const mid = xs.map((_, i) => i).slice(1, -1); for (let i = mid.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [mid[i], mid[j]] = [mid[j], mid[i]]; }
      const perm = [...mid, 0, n - 1];
      const tx = Array.from({ length: 2000 }, (_, i) => -1 + (2 * (i + 0.5)) / 2000), ty = tx.map((x) => truth(x) + nz * r.normal());
      D = { xs, ys, perm, tx, ty, n, nz };
    }
    function errors() {
      const k = Math.min(+$("#k").value, D.n), fold = new Array(D.n); D.perm.forEach((p, i) => (fold[p] = i < D.n - 2 ? i % k : -1));
      const rows = [];
      for (let d = 1; d <= MAXD; d++) {
        const c = polyfit(D.xs, D.ys, d), tr = mse(c, D.xs, D.ys), te = mse(c, D.tx, D.ty), fe = [];
        for (let f = 0; f < k; f++) {
          const ix = D.xs.map((_, i) => i).filter((i) => fold[i] !== f), ox = D.xs.map((_, i) => i).filter((i) => fold[i] === f);
          const cf = polyfit(ix.map((i) => D.xs[i]), ix.map((i) => D.ys[i]), d);
          fe.push({ c: cf, err: mse(cf, ox.map((i) => D.xs[i]), ox.map((i) => D.ys[i])), n: ox.length, nt: ix.length });
        }
        rows.push({ d, c, tr, te, cv: fe.reduce((s, f) => s + f.err, 0) / k, fe });
      }
      const bestCV = rows.reduce((a, b) => (b.cv < a.cv ? b : a)), bestTE = rows.reduce((a, b) => (b.te < a.te ? b : a));
      E = { k, fold, rows, bestCV, bestTE };
    }
    function drawFit() {
      const d = +$("#deg").value, row = E.rows[d - 1], f = Math.min(+$("#fold").value, E.k) - 1, g = pF.ctx;
      pF.resize(); pF.clear(); pF.axes({ xLabel: "x", yLabel: "y", xCount: 4 });
      pF.fn(truth, css("--muted"), 1.5, [5, 4]);
      if (view === "all") {
        D.xs.forEach((x, i) => pF.dot(x, D.ys[i], 4, css("--ink")));
        pF.fn((x) => pv(row.c, x), css("--accent"), 2.5);
        $("#lg1").innerHTML = `<span><i style="background:var(--ink)"></i>training points</span><span><i style="background:var(--accent)"></i>degree-${d} fit</span><span><i style="background:var(--muted)"></i>true pattern</span>`;
        $("#fcCap").innerHTML = `Degree ${d}: training error <b>${fmt(row.tr, 3)}</b>, true error on fresh data <b>${fmt(row.te, 3)}</b> (the noise alone gives ${fmt(D.nz * D.nz, 3)}, the best any model can do).`;
      } else {
        const fe = row.fe[f];
        D.xs.forEach((x, i) => { const out = E.fold[i] === f; pF.dot(x, D.ys[i], out ? 5 : 3.5, out ? null : css("--ink"), out ? css("--bad") : null); if (out) { g.save(); g.strokeStyle = css("--bad"); g.globalAlpha = 0.6; g.beginPath(); g.moveTo(pF.sx(x), pF.sy(D.ys[i])); g.lineTo(pF.sx(x), pF.sy(pv(fe.c, x))); g.stroke(); g.restore(); } });
        pF.fn((x) => pv(fe.c, x), css("--accent"), 2.5);
        $("#lg1").innerHTML = `<span><i style="background:var(--ink)"></i>training folds (${fe.nt} points)</span><span><i style="background:var(--bad)"></i>held-out fold ${f + 1} (${fe.n} points) and its errors</span><span><i style="background:var(--accent)"></i>fit without fold ${f + 1}</span>`;
        $("#fcCap").innerHTML = `Fold ${f + 1} of ${E.k}: the degree-${d} curve is fitted without the red-ringed points, then scored on them. Error on this fold: <b>${fmt(fe.err, 3)}</b>.`;
      }
    }
    function drawErr() {
      const d = +$("#deg").value, R = E.rows, top = Math.min(Math.max(...R.map((r) => Math.max(r.cv, r.te))) * 1.05, Math.max(R[0].te, R[0].cv) * 4);
      pE.resize(); pE.y = [0, top]; pE.clear();
      pE.axes({ xLabel: "polynomial degree", yLabel: "mean squared error", xTicks: R.map((r) => r.d), yFormat: (v) => fmt(v, 2) });
      const ds = R.map((r) => r.d);
      pE.path(ds, R.map((r) => r.tr), css("--warm"), 2.5); pE.path(ds, R.map((r) => r.cv), css("--accent"), 2.5); pE.path(ds, R.map((r) => r.te), css("--violet"), 2, [5, 3]);
      R.forEach((r) => { pE.dot(r.d, Math.min(r.cv, top), 3, css("--accent")); pE.dot(r.d, r.tr, 3, css("--warm")); });
      pE.path([d, d], [0, top], css("--muted"), 1, [2, 3]);
      pE.dot(E.bestCV.d, E.bestCV.cv, 7, null, css("--good"));
      const g = pE.ctx; g.save(); g.fillStyle = css("--good"); g.font = `600 12px ${css("--font-body")}`; g.textAlign = "center"; g.fillText("CV pick", pE.sx(E.bestCV.d), pE.sy(E.bestCV.cv) - 12); g.restore();
      $("#ecCap").innerHTML = `${E.k}-fold CV picks <b>degree ${E.bestCV.d}</b> (CV error ${fmt(E.bestCV.cv, 3)}). The degree with the lowest true error is <b>${E.bestTE.d}</b> (${fmt(E.bestTE.te, 3)}). Training error just keeps falling: at degree ${MAXD} it's ${fmt(R[MAXD - 1].tr, 3)}.${R.some((r) => r.cv > top) ? " Very large CV errors are cut off at the top." : ""}`;
    }
    function work() {
      const d = +$("#deg").value, row = E.rows[d - 1];
      const th = (t) => `<th style="padding:5px 9px;text-align:right;font-weight:500;color:var(--muted);border-bottom:1px solid var(--line)">${t}</th>`, td = (t, s = "") => `<td style="padding:5px 9px;text-align:right;border-bottom:1px solid var(--grid);font-family:var(--font-mono);${s}">${t}</td>`;
      $("#work").innerHTML = `<table style="border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums"><tr>${th("fold")}${th("trained on")}${th("tested on")}${th("error on held-out fold")}</tr>` +
        row.fe.map((f, i) => `<tr>${td(i + 1)}${td(f.nt + " points")}${td(f.n + " points")}${td(fmt(f.err, 3))}</tr>`).join("") +
        `<tr>${td("<b>average</b>")}${td("")}${td("")}${td("<b>" + fmt(row.cv, 3) + "</b>", "color:var(--accent)")}</tr></table>
        <p class="hint" style="margin:8px 0 0">For comparison, degree ${d}: training error ${fmt(row.tr, 3)}, true error ${fmt(row.te, 3)}. CV ${row.cv > row.tr * 1.8 ? "is well above the training error, a warning that the fit flatters itself" : "is close to the training error, so this degree isn't overfitting much"}.</p>`;
    }
    function readouts() {
      const d = +$("#deg").value, row = E.rows[d - 1];
      $("#ro").innerHTML = `<div class="ro"><b>Training error</b><span class="num">${fmt(row.tr, 3)}</span></div>
        <div class="ro"><b>${E.k}-fold CV error</b><span class="num">${fmt(row.cv, 3)}</span></div>
        <div class="ro"><b>True error (fresh data)</b><span class="num">${fmt(row.te, 3)}</span></div>
        <div class="ro"><b>CV pick / truly best</b><span class="pill ${E.bestCV.d === d ? "ok" : "idle"}">degree ${E.bestCV.d} / ${E.bestTE.d}</span></div>`;
    }
    function labels() { $("#degV").textContent = $("#deg").value; $("#kV").textContent = $("#k").value; $("#foldV").textContent = Math.min(+$("#fold").value, +$("#k").value); $("#nV").textContent = $("#n").value; $("#noiseV").textContent = (+$("#noise").value).toFixed(2); }
    function render() { labels(); drawFit(); drawErr(); work(); readouts(); }
    const full = () => { data(); errors(); render(); };
    $("#view").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { view = b.dataset.v; $("#view").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); render(); }));
    $("#deg").addEventListener("input", render);
    $("#fold").addEventListener("input", () => { if (view !== "fold") { view = "fold"; $("#view").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === "fold"))); } render(); });
    $("#k").addEventListener("input", () => { errors(); render(); });
    ["#n", "#noise"].forEach((s) => $(s).addEventListener("input", full));
    $("#pick").addEventListener("click", () => { $("#deg").value = E.bestCV.d; render(); });
    $("#newd").addEventListener("click", () => { seed++; full(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 1; view = "all"; $("#view").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === "all"))); full(); });
    full();
    return watch([$("#fc"), $("#ec")], render);
  },
});
