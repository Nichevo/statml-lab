Lab.register({
  id: "forecast-lab",
  group: "Forecasting",
  title: "Forecast lab",
  blurb: "Every forecasting method on the same data, side by side, from the naive forecast to boosted trees and a neural network. Pick a pattern or paste your own series, then compare scores and read each method's strengths and weaknesses.",
  lede: "No forecasting method wins everywhere. Each one assumes something about the data: that it is flat, trending, seasonal or lumpy. Run them all on the same series, score them on months they haven't seen, and the method whose assumptions match the data comes out on top.",
  quiz: [
    ["Why score methods on months they haven't seen?", "In-sample fit rewards complexity: a flexible method can match history closely and still forecast badly. Holding out the last months tests what you actually care about."],
    ["A seasonal naive forecast beats your fancy model. What does that tell you?", "Most of the predictable signal is the seasonal pattern, and the extra machinery is fitting noise. Seasonal naive is a benchmark every model should beat."],
    ["Should you always pick the method with the lowest error on one holdout?", "Not blindly. One holdout is a small sample; use several origins (rolling backtest) and prefer simpler methods when the gap is small. Averaging the top few often wins."],
    ["What assumption does a moving average make?", "That the series is flat apart from noise. It lags behind any trend and smears out seasonality."],
  ],
  diy: {
    intro: "Monthly actuals in B2:B49. Hold out the last 12 months (rows 38–49) and forecast them from row 37.",
    steps: [
      ["Naive: repeat the last actual.", "=$B$37"],
      ["Seasonal naive: same month last year.", "C38: =B26   (fill down)"],
      ["Moving average of the last 12 months.", "=AVERAGE($B$26:$B$37)"],
      ["Linear trend fitted to the training months (row number in A).", "D38: =FORECAST.LINEAR(A38,$B$2:$B$37,$A$2:$A$37)"],
      ["Excel's built-in Holt-Winters (ETS AAA), with dates in A.", "E38: =FORECAST.ETS(A38,$B$2:$B$37,$A$2:$A$37,12)"],
      ["Score each method on the holdout.", "=SUMPRODUCT(ABS($B$38:$B$49-C38:C49))/SUM($B$38:$B$49)   (WAPE)"],
      ["Average of methods (often hard to beat).", "F38: =AVERAGE(C38:E38)"],
    ],
  },
  deeper: [
    ["Makridakis, Spiliotis & Assimakopoulos (2020), The M4 Competition: 100,000 time series and 61 forecasting methods, IJF 36(1)", "https://doi.org/10.1016/j.ijforecast.2019.04.014", "which methods win, at scale"],
    ["Hyndman & Athanasopoulos, FPP3 §5.2: Some simple forecasting methods", "https://otexts.com/fpp3/simple-methods.html", "free textbook: the benchmarks"],
    ["Tashman (2000), Out-of-sample tests of forecasting accuracy, IJF 16(4)", "https://doi.org/10.1016/S0169-2070(00)00065-0", "how to hold out data properly"],
    ["Green & Armstrong (2015), Simple versus complex forecasting: the evidence, J. Business Research 68(8)", "https://doi.org/10.1016/j.jbusres.2015.03.026", "complexity rarely pays"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 40 L14 34 L24 38 L34 28 L44 32 L54 22"/><path d="M54 22 L92 8" stroke-dasharray="4 3"/><path d="M54 22 L92 22" stroke-dasharray="2 3" opacity=".6"/><path d="M54 22 L64 14 L74 24 L84 12 L92 18" stroke-dasharray="5 2" opacity=".8"/><line x1="54" y1="4" x2="54" y2="60" opacity=".3"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const M = [
      { id: "naive", name: "Naive", col: "--muted", dash: [2, 3] },
      { id: "snaive", name: "Seasonal naive", col: "--ink", dash: [2, 3] },
      { id: "ma", name: "Moving average", col: "#b08a1e", dash: [6, 3] },
      { id: "ses", name: "Simple exp. smoothing", col: "--violet", dash: [6, 3] },
      { id: "holt", name: "Holt (trend)", col: "#c2457a", dash: [6, 3] },
      { id: "hw", name: "Holt-Winters", col: "--accent", dash: null },
      { id: "reg", name: "Regression: trend + months", col: "--good", dash: [8, 3] },
      { id: "arima", name: "ARIMA(2,1,0)", col: "--bad", dash: [3, 2] },
      { id: "croston", name: "Croston", col: "--warm", dash: [8, 2] },
      { id: "gbm", name: "ML: boosted trees", col: "#8a5a2b", dash: [4, 2] },
      { id: "nn", name: "ML: neural network", col: "#3b7dd8", dash: [10, 2, 2, 2] },
      { id: "ensall", name: "Ensemble: average of all", col: "#2f8f8f", dash: [1, 0] },
      { id: "ens3", name: "Ensemble: best 3 averaged", col: "#6b5bd6", dash: [10, 3] },
    ];
    const BASE = M.filter((m) => !m.id.startsWith("ens"));
    const ABOUT = {
      naive: ["Next value = last value.", "Free, instant, and a fair benchmark. Hard to beat for random-walk data like prices.", "Ignores trend and season. Chases every bit of noise.", "As the baseline every other method must beat."],
      snaive: ["Next value = same period last season.", "Captures seasonality with zero effort. Strong benchmark for seasonal data.", "Copies last year's noise and one-offs. Misses growth since last year.", "Seasonal data with a stable pattern; as a seasonal benchmark."],
      ma: ["Average of the last k values, all weighted equally.", "Simple to explain and compute in a spreadsheet. Smooths noise.", "Lags behind any trend. Flattens seasonal peaks. Forgets older data abruptly.", "Flat, non-seasonal series with noise."],
      ses: ["Weighted average with weights fading exponentially into the past.", "Smooth, adaptive, one parameter (α). Good for level that drifts.", "Forecast is flat: no trend, no season.", "Stable series without trend or season; many slow-moving items."],
      holt: ["Smoothing for the level plus smoothing for the slope.", "Follows trends. Still only two parameters.", "Extends the trend forever, which can overshoot. No season.", "Trending, non-seasonal data over short horizons (damped versions are safer for long ones)."],
      hw: ["Level + trend + a seasonal index for each period, all updated as data arrives.", "Handles trend and season together. Fast, transparent, widely used in business.", "Needs at least two full seasons. Three parameters to tune. Seasonal pattern assumed fairly stable.", "Monthly or weekly sales with clear seasonality."],
      reg: ["Least-squares line through time plus a fixed effect for each period of the season.", "Easy to interpret (each month's uplift is a coefficient). Easy to add drivers like price or promotions.", "Assumes trend and season never change. Does not adapt to recent shifts.", "Stable patterns; when you want explainable effects or extra drivers."],
      arima: ["Models changes as depending on the last two changes (fitted by least squares).", "Captures momentum and short-term correlation. Very flexible family.", "This simple version has no seasonal terms. Choosing orders takes skill; less intuitive to explain.", "Non-seasonal series with autocorrelation; seasonal ARIMA for seasonal data."],
      ensall: ["The plain average of every other method's forecast, each weighted equally.", "Errors from different methods partly cancel out, so it is rarely the worst and often near the top. Nothing to tune, and very robust.", "Bad methods drag it down: averaging in naive or Croston on seasonal data hurts. Harder to explain one number.", "When you don't know which method suits the data, or you forecast thousands of items with no time to choose."],
      ens3: ["Hold back the last stretch of training data, find the three methods that forecast it best, then average those three.", "Keeps the benefit of averaging while leaving out methods that clearly don't fit. Often beats every single method.", "The selection step can be fooled by a short validation window. Three methods that make the same mistake don't cancel.", "A strong default in practice. Forecasting competitions (M3, M4) were often won by combinations like this."],
      gbm: ["Machine learning: 120 small decision trees (gradient boosting) learn the next month's change from the last two changes, the change a season ago, and which month it is. Forecasts are built one month at a time, each feeding the next.", "Finds non-linear patterns and interactions without being told their shape. The same set-up scales to thousands of items and extra drivers (price, promotions, weather).", "Trees can't invent values they haven't seen, so they predict changes, not levels. With only a few years of one series there is little to learn from, and errors compound as forecasts feed forward.", "Best across many related series (a 'global' model) or with useful drivers. On a single short series it rarely beats Holt-Winters."],
      nn: ["Machine learning: a small neural network (5 inputs, 6 hidden units) learns the next month's change from the same inputs as the boosted trees, with the month coded as a point on a circle.", "Smooth, flexible fits; the building block of LSTMs, transformers and the new foundation models.", "Needs a lot of data and care: results depend on the random start and training length. With one short series it easily overfits or underfits.", "Worth it with many series, long histories or rich drivers. Here it shows why simple methods are hard to beat on small data."],
      croston: ["Smooths order size and the gap between orders separately; forecast = size ÷ gap.", "Built for lumpy demand with many zeros. Steadier than SES there.", "Slightly biased high; never notices an item has died; poor for regular demand.", "Spare parts, slow sellers, intermittent demand."],
    };
    const PRESETS = {
      seasonal: "Trend + season", flat: "Flat and noisy", trend: "Strong trend, no season", shift: "Level shift",
      walk: "Random walk", lumpy: "Intermittent (lumpy)",
    };

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="flc" aria-label="All methods' forecasts on the same series"></canvas>
          <div class="legend" id="leg" style="gap:6px 14px"></div>
          <figcaption>Click a method in the legend to show or hide it. The shaded stretch is held out and used for scoring.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Scoreboard on the held-out periods</h4>
          <p class="hint" style="margin:0 0 10px">Each method's parameters are tuned on the training data only. Click a column to rank by it. For 1 − xMAPE higher is better; for the rest lower is better.</p>
          <div style="overflow-x:auto"><table id="board" style="width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Strengths and weaknesses</h4>
          <div id="about" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px"></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="pre">Data pattern</label>
          <select id="pre">${Object.entries(PRESETS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}<option value="own">My own data</option></select></div>
        <div class="ctrl"><label for="noise">Noise <output id="noiseV"></output></label><input type="range" id="noise" min="0" max="3" step="0.1" value="1"></div>
        <div class="ctrl"><label for="m">Season length</label>
          <select id="m"><option value="12">12 (monthly)</option><option value="4">4 (quarterly)</option><option value="7">7 (daily)</option><option value="52">52 (weekly)</option></select></div>
        <div class="ctrl"><label for="h">Periods held out <output id="hV"></output></label><input type="range" id="h" min="3" max="24" step="1" value="12"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New random draw</button></div>
        <div>
          <h4>Your data</h4>
          <textarea id="own" rows="5" spellcheck="false" aria-label="Your series" style="width:100%;font:12px/1.5 var(--font-mono);padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink)"></textarea>
          <div class="btns" style="margin-top:6px"><button class="btn primary" id="useOwn" type="button">Use these numbers</button></div>
          <p class="hint" id="ownMsg">Paste a column from Excel, oldest first. The box always shows the series in use, so you can edit a value and press the button.</p>
        </div>
        <div class="readouts"><div class="ro"><b>Winner</b><span id="win"></span></div></div>`,
      notes: `
        <section>
          <h2>How the lab works</h2>
          <ol>
            <li>The last few periods are hidden from every method.</li>
            <li>Each method tunes its own settings (α, β, γ, window k) to give the smallest one-step-ahead error on the training periods.</li>
            <li>Each then forecasts the hidden periods in one go, and the scoreboard compares those forecasts with what actually happened.</li>
          </ol>
          <p>Pages for single methods show the arithmetic in detail: <a href="#exponential-smoothing">smoothing</a>, <a href="#arima">ARIMA</a>, <a href="#intermittent-demand">Croston</a>. The measures are explained on <a href="#forecast-accuracy">forecast accuracy</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Go through each data pattern and note the winner. With stable trend and season, regression or Holt-Winters usually wins; SES on flat noise; naive on a random walk; Croston on lumpy data. Press "New random draw" to see how often the winner changes.</li>
            <li>"Level shift": show only regression and Holt-Winters. Regression reads the jump as a steady upward trend and keeps climbing; Holt-Winters adapts to the new level. Which is right depends on whether the jump was a one-off.</li>
            <li>Compare the two machine-learning methods with Holt-Winters. On the starting seasonal data they finish 4th and 5th, behind regression and Holt-Winters; on flat or lumpy data they land near the bottom. With one short series there is little for them to learn from, which is why ML forecasting pays off across many related items (see <a href="#global-forecasting">global forecasting</a>) rather than one at a time.</li>
            <li>Turn noise to 0, then to 3. With heavy noise the simple methods close the gap, because there is less real pattern to exploit.</li>
            <li>Change the held-out periods from 12 to 3. Short horizons favour adaptive methods; long horizons punish runaway trends.</li>
          </ol>
        </section>
        <section>
          <h2>Caveats</h2>
          <ul>
            <li>One held-out window is a single test. Serious comparisons repeat it from several starting points (rolling-origin evaluation) and across many series.</li>
            <li>Rankings can change with the measure: MAPE punishes over-forecasts, RMSE punishes big misses.</li>
            <li>The two ML methods predict the next change (not the level) from the last two changes, the change a season ago and the month, then feed each forecast into the next. That is a standard set-up, not a tuned one; with drivers like price or promotions, or many series trained together, they usually do much better.</li>
            <li>The simple ARIMA here has no seasonal terms, so it struggles on seasonal patterns by design.</li>
          </ul>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const plot = new Plot($("#flc"), { pad: { l: 50 } });
    const hidden = new Set(["naive", "ma", "croston"]);
    let y = [], seed = 31, sortKey = "rmse", res = [];

    function makeData() {
      const r = rng(seed), k = $("#pre").value, nz = +$("#noise").value, n = 72, m = +$("#m").value;
      const season = (t) => Math.sin((2 * Math.PI * (t - 2)) / m) + 0.4 * Math.cos((4 * Math.PI * t) / m);
      let lvl = 100;
      y = Array.from({ length: n }, (_, t) => {
        switch (k) {
          case "seasonal": return 100 + 0.8 * t + 18 * season(t) + 5 * nz * r.normal();
          case "flat": return 100 + 8 * nz * r.normal();
          case "trend": return 60 + 1.8 * t + 6 * nz * r.normal();
          case "shift": return (t < 45 ? 100 : 140) + 10 * season(t) + 5 * nz * r.normal();
          case "walk": lvl += 4 * Math.max(0.3, nz) * r.normal(); return lvl;
          case "lumpy": return r() < 0.3 ? Math.max(1, Math.round(6 * Math.exp(0.4 * nz * r.normal()))) : 0;
          default: return 100;
        }
      });
      $("#own").value = y.map((v) => +v.toFixed(1)).join(", ");
    }

    // ---- methods: each returns one-step fitted values over training and h-step forecasts ----
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    function run(id, tr, h, m, p) {
      const n = tr.length, fit = new Array(n).fill(NaN);
      let fc;
      if (id === "naive") { for (let t = 1; t < n; t++) fit[t] = tr[t - 1]; fc = Array(h).fill(tr[n - 1]); }
      else if (id === "snaive") { for (let t = m; t < n; t++) fit[t] = tr[t - m]; fc = Array.from({ length: h }, (_, i) => tr[n - m + (i % m)]); }
      else if (id === "ma") { const k = p.k; for (let t = k; t < n; t++) fit[t] = mean(tr.slice(t - k, t)); fc = Array(h).fill(mean(tr.slice(n - k))); }
      else if (id === "ses" || id === "holt") {
        let L = tr[0], B = id === "holt" ? (tr[Math.min(n - 1, 3)] - tr[0]) / Math.min(n - 1, 3) : 0;
        for (let t = 1; t < n; t++) { fit[t] = L + B; const Lp = L; L = p.a * tr[t] + (1 - p.a) * (L + B); if (id === "holt") B = p.b * (L - Lp) + (1 - p.b) * B; }
        fc = Array.from({ length: h }, (_, i) => L + (i + 1) * B);
      } else if (id === "hw") {
        const m1 = mean(tr.slice(0, m)), m2 = mean(tr.slice(m, 2 * m));
        let B = (m2 - m1) / m, L = m1 + (B * (m - 1)) / 2; const S = tr.slice(0, m).map((v) => v - m1);
        for (let t = m; t < n; t++) { const s = S[t % m]; fit[t] = L + B + s; const Lp = L; L = p.a * (tr[t] - s) + (1 - p.a) * (L + B); B = p.b * (L - Lp) + (1 - p.b) * B; S[t % m] = p.g * (tr[t] - L) + (1 - p.g) * s; }
        fc = Array.from({ length: h }, (_, i) => L + (i + 1) * B + S[(n + i) % m]);
      } else if (id === "reg") {
        // y = b0 + b1 t + month effects (sum to zero), solved by least squares
        const k = 2 + (m - 1), X = (t) => { const r = [1, t]; for (let j = 1; j < m; j++) r.push(t % m === j ? 1 : 0); return r; };
        const A = Array.from({ length: k }, () => Array(k).fill(0)), bv = Array(k).fill(0);
        for (let t = 0; t < n; t++) { const x = X(t); for (let i = 0; i < k; i++) { bv[i] += x[i] * tr[t]; for (let j = 0; j < k; j++) A[i][j] += x[i] * x[j]; } }
        for (let i = 0; i < k; i++) A[i][i] += 1e-8;
        const w = Lab.solve(A, bv), f = (t) => X(t).reduce((s, v, i) => s + v * w[i], 0);
        for (let t = 0; t < n; t++) fit[t] = f(t);
        fc = Array.from({ length: h }, (_, i) => f(n + i));
      } else if (id === "arima") {
        const d = tr.slice(1).map((v, i) => v - tr[i]), A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bv = [0, 0, 0];
        for (let t = 2; t < d.length; t++) { const x = [1, d[t - 1], d[t - 2]]; for (let i = 0; i < 3; i++) { bv[i] += x[i] * d[t]; for (let j = 0; j < 3; j++) A[i][j] += x[i] * x[j]; } }
        const w = Lab.solve(A, bv);
        for (let t = 3; t < n; t++) fit[t] = tr[t - 1] + w[0] + w[1] * d[t - 2] + w[2] * d[t - 3];
        const dd = d.slice(); let lv = tr[n - 1]; fc = [];
        for (let i = 0; i < h; i++) { const nd = w[0] + w[1] * dd[dd.length - 1] + w[2] * dd[dd.length - 2]; dd.push(nd); lv += nd; fc.push(lv); }
      } else if (id === "gbm" || id === "nn") {
        // Learn the next change d_t = y_t - y_{t-1} from: d_{t-1}, d_{t-2}, d_{t-m}, month. Forecast recursively.
        const d = [NaN, ...tr.slice(1).map((v, i) => v - tr[i])], t0 = m + 1;
        const feat = (dd, t) => (id === "gbm" ? [dd[t - 1], dd[t - 2], dd[t - m], t % m] : [dd[t - 1], dd[t - 2], dd[t - m], Math.sin((2 * Math.PI * t) / m), Math.cos((2 * Math.PI * t) / m)]);
        const X = [], Y = [];
        for (let t = t0; t < n; t++) { X.push(feat(d, t)); Y.push(d[t]); }
        let predict;
        if (id === "gbm") {
          const g = Lab.gbm.fit(X, Y, { trees: 120, depth: 2, lr: 0.1, minLeaf: 4, bins: 16 });
          predict = (x) => g.predict(x);
        } else {
          // one hidden layer of 6 tanh units, inputs and target standardised, full-batch Adam, fixed seed
          const P = X[0].length, H = 6, mu = Array(P).fill(0), sd = Array(P).fill(0);
          X.forEach((x) => x.forEach((v, j) => (mu[j] += v / X.length))); X.forEach((x) => x.forEach((v, j) => (sd[j] += (v - mu[j]) ** 2 / X.length))); sd.forEach((v, j) => (sd[j] = Math.sqrt(v) || 1));
          const ym = mean(Y), ys = Math.sqrt(mean(Y.map((v) => (v - ym) ** 2))) || 1;
          const Z = X.map((x) => x.map((v, j) => (v - mu[j]) / sd[j])), T = Y.map((v) => (v - ym) / ys), rr = rng(7);
          const W1 = Array.from({ length: H }, () => Array.from({ length: P }, () => rr.normal() * 0.5)), b1 = Array(H).fill(0), W2 = Array.from({ length: H }, () => rr.normal() * 0.5); let b2 = 0;
          const params = [W1, b1, W2], mA = new Map(), vA = new Map(); let step = 0;
          const adam = (arr, grad, key) => { if (!mA.has(key)) { mA.set(key, grad.map(() => 0)); vA.set(key, grad.map(() => 0)); } const mm = mA.get(key), vv = vA.get(key); for (let i = 0; i < grad.length; i++) { mm[i] = 0.9 * mm[i] + 0.1 * grad[i]; vv[i] = 0.999 * vv[i] + 0.001 * grad[i] ** 2; arr[i] -= (0.02 * mm[i] / (1 - 0.9 ** step)) / (Math.sqrt(vv[i] / (1 - 0.999 ** step)) + 1e-8); } };
          const fwd = (z) => { const hdn = W1.map((w, k) => Math.tanh(w.reduce((s, v, j) => s + v * z[j], b1[k]))); return { hdn, out: hdn.reduce((s, v, k) => s + v * W2[k], b2) }; };
          for (let ep = 0; ep < 400; ep++) {
            step++;
            const gW1 = W1.map(() => Array(P).fill(0)), gb1 = Array(H).fill(0), gW2 = Array(H).fill(0); let gb2 = 0;
            Z.forEach((z, i) => { const { hdn, out } = fwd(z), e = (out - T[i]) / Z.length; gb2 += e; hdn.forEach((hv, k) => { gW2[k] += e * hv; const gh = e * W2[k] * (1 - hv * hv); gb1[k] += gh; for (let j = 0; j < P; j++) gW1[k][j] += gh * z[j]; }); });
            for (let k = 0; k < H; k++) { gW2[k] += 1e-3 * W2[k]; for (let j = 0; j < P; j++) gW1[k][j] += 1e-3 * W1[k][j]; }
            W1.forEach((w, k) => adam(w, gW1[k], "w1" + k)); adam(b1, gb1, "b1"); adam(W2, gW2, "w2"); const tmp = [b2]; adam(tmp, [gb2], "b2"); b2 = tmp[0];
          }
          void params;
          predict = (x) => fwd(x.map((v, j) => (v - mu[j]) / sd[j])).out * ys + ym;
        }
        for (let t = t0; t < n; t++) fit[t] = tr[t - 1] + predict(feat(d, t));
        const dd = d.slice(); let lv = tr[n - 1]; fc = [];
        for (let i = 0; i < h; i++) { const t = n + i, nd = predict(feat(dd, t)); dd.push(nd); lv += nd; fc.push(lv); }
      } else if (id === "croston") {
        const nz = tr.map((v, t) => (v > 0 ? t : -1)).filter((t) => t >= 0);
        let z = nz.length ? mean(nz.map((t) => tr[t])) : 0, q = nz.length ? n / nz.length : 1, gap = 1;
        for (let t = 0; t < n; t++) { fit[t] = z / q; if (tr[t] > 0) { z = p.a * tr[t] + (1 - p.a) * z; q = p.a * gap + (1 - p.a) * q; gap = 1; } else gap++; }
        fc = Array(h).fill(z / q);
      }
      return { fit, fc };
    }
    const GRID = [0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9];
    function tune(id, tr, m) {
      const opts = id === "ma" ? Array.from({ length: Math.min(12, tr.length - 3) - 1 }, (_, i) => ({ k: i + 2 }))
        : id === "ses" || id === "croston" ? GRID.map((a) => ({ a }))
        : id === "holt" ? GRID.flatMap((a) => [0.01, 0.05, 0.1, 0.3].map((b) => ({ a, b })))
        : id === "hw" ? GRID.flatMap((a) => [0.01, 0.05, 0.2].flatMap((b) => [0.05, 0.2, 0.5].map((g) => ({ a, b, g })))) : [{}];
      let best = null;
      for (const p of opts) {
        const { fit } = run(id, tr, 1, m, p); let se = 0, c = 0;
        fit.forEach((f, t) => { if (isFinite(f)) { se += (tr[t] - f) ** 2; c++; } });
        const r = Math.sqrt(se / c);
        if (!best || r < best.r) best = { r, p };
      }
      return best.p;
    }
    const pdesc = (p) => p.of ? "of " + p.of.join(", ") : p.members ? `of ${p.members} methods` : Object.entries(p).map(([k, v]) => `${{ a: "α", b: "β", g: "γ", k: "k" }[k]}=${v}`).join(" ");

    function compute() {
      const h = Math.min(+$("#h").value, Math.floor(y.length / 3)), m = +$("#m").value, tr = y.slice(0, y.length - h), te = y.slice(y.length - h);
      let nd = 0; for (let t = 1; t < tr.length; t++) nd += Math.abs(tr[t] - tr[t - 1]);
      const scale = nd / (tr.length - 1);
      // validation: the last h periods of training, used only to pick the "best 3" ensemble members
      const vh = Math.min(h, Math.floor(tr.length / 4)), vtr = tr.slice(0, tr.length - vh), vte = tr.slice(tr.length - vh);
      const valid = {};
      res = BASE.map((meth) => {
        if (meth.id === "hw" && tr.length < 2 * m + 2) return { ...meth, na: "needs two full seasons" };
        if ((meth.id === "snaive" || meth.id === "reg") && tr.length <= m + 2) return { ...meth, na: "needs a full season" };
        if ((meth.id === "gbm" || meth.id === "nn") && tr.length < m + 13) return { ...meth, na: "needs a season plus a year of examples" };
        const p = tune(meth.id, tr, m), out = run(meth.id, tr, h, m, p);
        const okV = !((meth.id === "hw" && vtr.length < 2 * m + 2) || ((meth.id === "snaive" || meth.id === "reg") && vtr.length <= m + 2) || ((meth.id === "gbm" || meth.id === "nn") && vtr.length < m + 13));
        if (okV) { const vf = run(meth.id, vtr, vh, m, tune(meth.id, vtr, m)).fc; valid[meth.id] = Math.sqrt(mean(vf.map((f, i) => (vte[i] - f) ** 2))); }
        return { ...meth, p, ...out };
      });
      const usable = res.filter((r) => !r.na);
      const avg = (rs) => ({ fc: rs[0].fc.map((_, i) => mean(rs.map((r) => r.fc[i]))), fit: rs[0].fit.map((_, t) => { const v = rs.map((r) => r.fit[t]).filter(isFinite); return v.length === rs.length ? mean(v) : NaN; }) });
      const top3 = usable.filter((r) => isFinite(valid[r.id])).sort((a, b) => valid[a.id] - valid[b.id]).slice(0, 3);
      res.push({ ...M.find((x) => x.id === "ensall"), p: { members: usable.length }, ...avg(usable) });
      if (top3.length >= 2) res.push({ ...M.find((x) => x.id === "ens3"), p: { of: top3.map((r) => r.name) }, ...avg(top3) });
      else res.push({ ...M.find((x) => x.id === "ens3"), na: "not enough data to validate" });
      res = res.map((r) => {
        if (r.na) return r;
        const out = r, p = r.p;
        let ae = 0, se = 0, ape = 0, xa = 0, e = 0;
        out.fc.forEach((f, i) => { const a = te[i], d = a - f; ae += Math.abs(d); se += d * d; e += d; ape += a ? Math.abs(d / a) : Infinity; const mx = Math.max(Math.abs(a), Math.abs(f)); xa += mx ? Math.abs(d) / mx : 0; });
        const sa = te.reduce((s, v) => s + Math.abs(v), 0);
        return { ...r, mae: ae / h, rmse: Math.sqrt(se / h), mape: (ape / h) * 100, wape: sa ? (ae / sa) * 100 : Infinity, mase: ae / h / scale, xacc: 100 - (xa / h) * 100, bias: e / h };
      });
      return { h, tr, te };
    }

    function draw() {
      $("#noiseV").textContent = (+$("#noise").value).toFixed(1); $("#hV").textContent = $("#h").value;
      const { h, tr } = compute(), n = y.length, T = tr.length;
      const shown = res.filter((r) => !r.na && !hidden.has(r.id));
      const vals = y.concat(...shown.map((r) => r.fc));
      const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1;
      plot.x = [-0.5, n - 0.5]; plot.y = [lo - sp * 0.08, hi + sp * 0.08];
      plot.clear();
      plot.ctx.fillStyle = css("--grid"); plot.ctx.fillRect(plot.sx(T - 0.5), plot.pad.t, plot.sx(n - 0.5) - plot.sx(T - 0.5), plot.ih);
      plot.axes({ xLabel: "period", yLabel: "value", xCount: 8 });
      const colr = (c) => (c.startsWith("--") ? css(c) : c);
      shown.forEach((r) => plot.path([T - 1, ...r.fc.map((_, i) => T + i)], [r.fit[T - 1] ?? y[T - 1], ...r.fc], colr(r.col), r.id === "hw" ? 2.8 : 2, r.dash));
      plot.path(y.map((_, t) => t), y, css("--ink"), 1.6);
      y.forEach((v, t) => plot.dot(t, v, 2, css("--ink")));

      $("#leg").innerHTML = `<span><i style="background:var(--ink)"></i>Actual</span>` + res.map((r) => `<button type="button" data-id="${r.id}" ${r.na ? "disabled" : ""} style="display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:2px 9px;background:${hidden.has(r.id) ? "transparent" : "var(--bg)"};color:${hidden.has(r.id) || r.na ? "var(--muted)" : "var(--ink)"};font:inherit;font-size:.8rem;cursor:pointer;${hidden.has(r.id) ? "opacity:.6;" : ""}">
        <i style="width:14px;height:4px;border-radius:2px;display:inline-block;background:${colr(r.col)}"></i>${r.name}${r.na ? " (n/a)" : ""}</button>`).join("");
      $("#leg").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { hidden.has(b.dataset.id) ? hidden.delete(b.dataset.id) : hidden.add(b.dataset.id); draw(); }));

      const cols = [["mae", "MAE"], ["rmse", "RMSE"], ["mape", "MAPE"], ["wape", "WAPE"], ["mase", "MASE"], ["xacc", "1 − xMAPE"], ["bias", "Bias"]];
      const key = (r) => (sortKey === "xacc" ? -r.xacc : sortKey === "bias" ? Math.abs(r.bias) : r[sortKey]);
      const ok = res.filter((r) => !r.na).sort((a, b) => key(a) - key(b));
      const bestOf = Object.fromEntries(cols.map(([k]) => [k, k === "xacc" ? Math.max(...ok.map((r) => r.xacc)) : k === "bias" ? Math.min(...ok.map((r) => Math.abs(r.bias))) : Math.min(...ok.map((r) => r[k]))]));
      const show = (k, v) => (!isFinite(v) ? "–" : ["mape", "wape", "xacc"].includes(k) ? v.toFixed(1) + "%" : k === "mase" ? v.toFixed(2) : k === "bias" ? (v > 0 ? "+" : "") + fmt(v) : fmt(v));
      const isBest = (k, r) => (k === "bias" ? Math.abs(r.bias) === bestOf.bias : r[k] === bestOf[k]);
      $("#board").innerHTML = `<tr><th style="text-align:left;padding:5px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted)">#</th><th style="text-align:left;padding:5px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted)">Method</th>` +
        cols.map(([k, t]) => `<th data-k="${k}" style="cursor:pointer;text-align:right;padding:5px 6px;border-bottom:1px solid var(--line);font-weight:${k === sortKey ? 700 : 500};color:${k === sortKey ? "var(--ink)" : "var(--muted)"};white-space:nowrap">${t}${k === sortKey ? " ▾" : ""}</th>`).join("") + `</tr>` +
        ok.map((r, i) => `<tr style="${i === 0 ? "background:var(--accent-soft)" : ""}"><td style="padding:5px 6px;border-bottom:1px solid var(--grid);color:var(--muted)">${i + 1}</td>
          <td style="padding:5px 6px;border-bottom:1px solid var(--grid);white-space:nowrap"><i style="width:12px;height:4px;border-radius:2px;display:inline-block;background:${colr(r.col)};margin-right:6px;vertical-align:middle"></i>${r.name}<br><span style="font:11px var(--font-mono);color:var(--muted)">${pdesc(r.p) || "no settings"}</span></td>` +
          cols.map(([k]) => `<td style="text-align:right;padding:5px 6px;border-bottom:1px solid var(--grid);font-family:var(--font-mono);${isBest(k, r) ? "font-weight:700;color:var(--good)" : ""}">${show(k, r[k])}</td>`).join("") + `</tr>`).join("") +
        res.filter((r) => r.na).map((r) => `<tr><td></td><td colspan="8" style="padding:5px 6px;color:var(--muted)">${r.name}: ${r.na}</td></tr>`).join("");
      $("#board").querySelectorAll("th[data-k]").forEach((th) => th.addEventListener("click", () => { sortKey = th.dataset.k; draw(); }));
      $("#win").innerHTML = ok.length ? `<span class="pill ok">${ok[0].name}</span>` : "–";

      $("#about").innerHTML = M.map((m) => {
        const [what, pro, con, use] = ABOUT[m.id], r = res.find((x) => x.id === m.id), rank = ok.indexOf(r) + 1;
        return `<div style="border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:var(--bg);display:grid;gap:6px;align-content:start">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b style="font-family:var(--font-display)"><i style="width:12px;height:4px;border-radius:2px;display:inline-block;background:${colr(m.col)};margin-right:6px;vertical-align:middle"></i>${m.name}</b>${rank ? `<span class="pill ${rank === 1 ? "ok" : "idle"}">#${rank} here</span>` : ""}</div>
          <div style="font-size:.88rem">${what}</div>
          <div style="font-size:.85rem"><span style="color:var(--good);font-weight:600">+ </span>${pro}</div>
          <div style="font-size:.85rem"><span style="color:var(--bad);font-weight:600">− </span>${con}</div>
          <div style="font-size:.82rem;color:var(--muted)"><b>Use for:</b> ${use}</div></div>`;
      }).join("");
    }

    $("#pre").addEventListener("change", () => {
      const k = $("#pre").value;
      if (k === "own") { $("#ownMsg").textContent = "Edit or paste your numbers, then press the button."; return; }
      if (k === "lumpy") { hidden.delete("croston"); }
      makeData(); draw();
    });
    ["#noise"].forEach((s) => $(s).addEventListener("input", () => { if ($("#pre").value !== "own") { makeData(); draw(); } }));
    $("#m").addEventListener("change", () => { if ($("#pre").value !== "own") makeData(); draw(); });
    $("#h").addEventListener("input", draw);
    $("#newd").addEventListener("click", () => { seed++; if ($("#pre").value === "own") $("#pre").value = "seasonal"; makeData(); draw(); });
    $("#useOwn").addEventListener("click", () => {
      const v = $("#own").value.split(/[\s,;]+/).filter(Boolean).map(Number);
      if (v.some((x) => !isFinite(x))) { $("#ownMsg").textContent = "Some entries aren't plain numbers. Remove currency signs and thousands separators."; return; }
      if (v.length < 16) { $("#ownMsg").textContent = `Only ${v.length} values; paste at least 16.`; return; }
      y = v; $("#pre").value = "own"; $("#ownMsg").textContent = `Using your ${v.length} values.`; draw();
    });

    makeData(); draw();
    return watch([plot.c], (resized) => { if (resized) plot.resize(); draw(); });
  },
});
