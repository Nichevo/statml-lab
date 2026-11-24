Lab.register({
  id: "promo-regression",
  group: "Forecasting",
  title: "Regression with drivers: promotions",
  blurb: "Time-series methods can't see next month's promotion. A regression with drivers can. Fit promo lift, the post-promo dip and cannibalization, then plan your own promotions.",
  lede: "Exponential smoothing and ARIMA only look at the series' own past, so a planned promotion is invisible to them. A regression with drivers adds columns for what you know in advance (promotions, discounts, holidays) and learns how much each one moves sales. It also learns the side effects: the dip after a promotion as shoppers use up what they stocked, and the sales a promotion steals from a sister product.",
  quiz: [
    ["The fitted lift is 3.8 units per % of discount, and the post-promo dip is −45. You run a 20% promotion. What's the net gain over the two weeks?", "Promo week: 3.8 × 20 = +76. Following week: −45. Net +31 units: less than half the headline lift."],
    ["Product B's fitted coefficient on A's promotion is −30. A's lift is +80. What share of A's lift came from B?", "30 / 80 = 37.5%. That's cannibalization: the category only gained about 50 units, not 80."],
    ["Why does exponential smoothing do badly in the weeks after a promotion?", "It treats the spike as a change in level and raises its forecast, just as the post-promo dip arrives. Then it overreacts again on the way down."],
    ["What's needed for a regression to estimate promo lift reliably?", "Enough past promotions, at varied discount depths, and recorded accurately. If every promotion was 20%, the model can't tell how lift changes with depth."],
  ],
  deeper: [
    ["FPP3 chapter 7: Time series regression models", "https://otexts.com/fpp3/regression.html", "regression with trend, seasonal dummies and predictors"],
    ["FPP3 §7.4: Useful predictors (dummies, interventions)", "https://otexts.com/fpp3/useful-predictors.html", "how to code promotions, holidays and lags"],
    ["FPP3 chapter 10: Dynamic regression", "https://otexts.com/fpp3/dynamic.html", "regression with ARIMA errors"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="30" y="6" width="12" height="52" fill="currentColor" fill-opacity=".15" stroke="none"/><rect x="66" y="6" width="12" height="52" fill="currentColor" fill-opacity=".15" stroke="none"/><path d="M4 40 L16 38 L28 40 L36 12 L46 48 L56 40 L64 39 L72 16 L82 46 L92 40"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const HIST = 104, FUT = 13, N = HIST + FUT;
    const FEAT = ["intercept", "trend (per week)", "season sin", "season cos", "discount (per %)", "week after promo", "holiday"];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="prc" aria-label="Weekly sales of product A with regression and smoothing forecasts"></canvas>
          <div class="legend"><span><i style="background:var(--ink)"></i>Actual</span><span><i style="background:var(--accent)"></i>Regression with drivers</span><span><i style="background:var(--warm)"></i>Exponential smoothing</span><span><i style="background:var(--violet);opacity:.4;height:10px"></i>Promotion</span><span><i style="background:var(--good);opacity:.35;height:10px"></i>Holiday</span></div>
          <figcaption><b>Click a week in the shaded future (right of the dashed line) to add or remove a promotion.</b> The future actuals are simulated from the same hidden rules.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="prb" aria-label="Weekly sales of sister product B"></canvas>
          <div class="legend"><span><i style="background:var(--muted)"></i>Product B actual</span><span><i style="background:var(--violet)"></i>Product B fitted</span></div>
          <figcaption>Sister product B. Its sales drop in A's promotion weeks: cannibalization.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">What the regression learned</h4>
          <div style="overflow-x:auto"><table id="coef" style="width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums"></table></div>
          <div id="work" style="font-family:var(--font-mono);font-size:.84rem;line-height:1.9;margin-top:12px"></div>
        </div>`,
      panel: `
        <div>
          <h4>The hidden truth</h4>
          <div class="ctrl"><label for="lf">Lift per % of discount <output id="lfV"></output></label><input type="range" id="lf" min="0" max="8" step="0.1" value="4"></div>
          <div class="ctrl"><label for="dp">Post-promo dip <output id="dpV"></output></label><input type="range" id="dp" min="0" max="100" step="1" value="40"></div>
          <div class="ctrl"><label for="cn">Cannibalization of B <output id="cnV"></output></label><input type="range" id="cn" min="0" max="0.8" step="0.05" value="0.35"></div>
          <div class="ctrl"><label for="nz">Noise (SD) <output id="nzV"></output></label><input type="range" id="nz" min="0" max="40" step="1" value="15"></div>
        </div>
        <div class="ctrl"><label for="dd">Discount for promotions you add <output id="ddV"></output></label><input type="range" id="dd" min="5" max="40" step="5" value="20"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="clr" type="button">Clear future promotions</button><button class="btn" id="newd" type="button">New random history</button></div>`,
      notes: `
        <section>
          <h2>The model</h2>
          <div class="eq">sales = b₀ + b₁·week + b₂·sin + b₃·cos + b₄·discount% + b₅·after-promo + b₆·holiday + error</div>
          <p>Each driver is a column of numbers known in advance. Discount% is 0 in normal weeks and, say, 20 in a promo week. "After-promo" is 1 in the week following a promotion. The sin and cos pair captures a smooth yearly season. The coefficients are found by <a href="#least-squares">least squares</a>, exactly as for a straight line, just with more columns.</p>
          <p>Product B gets its own regression with one extra driver: A's discount. A negative coefficient there measures cannibalization.</p>
        </section>
        <section>
          <h2>Reading the results</h2>
          <ul>
            <li><b>Lift</b> (b₄ × discount) is the headline effect of a promotion.</li>
            <li><b>Post-promo dip</b> (b₅) is pantry loading: shoppers bought ahead, so the next week is weak.</li>
            <li><b>Incremental volume</b> = lift + dip − cannibalized sales of B. This, not the lift, is what a promotion is really worth.</li>
            <li>The ± figure is the standard error. A coefficient smaller than about twice its standard error could be noise.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Click three or four future weeks to plan promotions. The regression forecast jumps in those weeks and dips after; smoothing doesn't move. Compare the MAPE.</li>
            <li>Set the post-promo dip to 100. The net value of a promotion shrinks, and the incremental volume can turn negative.</li>
            <li>Raise noise to 40. The coefficient standard errors widen; the estimates get less trustworthy.</li>
            <li>Set lift to 0. With no real effect, the fitted lift should land near 0 within its standard error.</li>
          </ol>
          <p>Compare <a href="#forecast-value-added">FVA</a>: here the "planner knows about promos" step is built into the model.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pA = new Plot($("#prc"), { x: [-0.5, N - 0.5], pad: { l: 50 } });
    const pB = new Plot($("#prb"), { x: [-0.5, N - 0.5], pad: { l: 50 } });
    let seed = 15, disc = [], hol = [], noiseA = [], noiseB = [], R = null;

    function makeHistory() {
      const r = rng(seed);
      disc = Array(N).fill(0); hol = Array(N).fill(0);
      for (let t = 3; t < HIST - 1; t++) if (r() < 0.12 && !disc[t - 1] && !disc[t - 2]) disc[t] = [10, 15, 20, 25, 30][Math.floor(r() * 5)];
      for (let t = 0; t < N; t++) if (t % 52 === 50 || t % 52 === 21) hol[t] = 1;
      noiseA = Array.from({ length: N }, () => r.normal()); noiseB = Array.from({ length: N }, () => r.normal());
    }

    const row = (t) => [1, t, Math.sin((2 * Math.PI * t) / 52), Math.cos((2 * Math.PI * t) / 52), disc[t], t > 0 && disc[t - 1] > 0 ? 1 : 0, hol[t]];
    function ols(X, y) {
      const k = X[0].length, A = Array.from({ length: k }, () => Array(k).fill(0)), b = Array(k).fill(0);
      X.forEach((x, i) => { for (let a = 0; a < k; a++) { b[a] += x[a] * y[i]; for (let c = 0; c < k; c++) A[a][c] += x[a] * x[c]; } });
      for (let a = 0; a < k; a++) A[a][a] += 1e-9;
      const w = Lab.solve(A.map((r) => r.slice()), b.slice());
      const res = y.map((v, i) => v - X[i].reduce((s, x, j) => s + x * w[j], 0)), s2 = res.reduce((s, v) => s + v * v, 0) / (y.length - k);
      const se = Array.from({ length: k }, (_, j) => { const e = Array(k).fill(0); e[j] = 1; return Math.sqrt(Math.max(0, s2 * Lab.solve(A.map((r) => r.slice()), e)[j])); });
      return { w, se };
    }

    function compute() {
      const lf = +$("#lf").value, dp = +$("#dp").value, cn = +$("#cn").value, nz = +$("#nz").value;
      const truthA = (t) => { const x = row(t); return 200 + 0.4 * t + 25 * x[2] + 10 * x[3] + lf * x[4] - dp * x[5] + 60 * x[6]; };
      const A = Array.from({ length: N }, (_, t) => Math.max(0, truthA(t) + nz * noiseA[t]));
      const B = Array.from({ length: N }, (_, t) => Math.max(0, 150 + 0.2 * t + 15 * Math.sin((2 * Math.PI * t) / 52) - cn * lf * disc[t] + 0.6 * nz * noiseB[t]));
      const X = Array.from({ length: HIST }, (_, t) => row(t));
      const fitA = ols(X, A.slice(0, HIST));
      const XB = Array.from({ length: HIST }, (_, t) => [1, t, Math.sin((2 * Math.PI * t) / 52), Math.cos((2 * Math.PI * t) / 52), disc[t]]);
      const fitB = ols(XB, B.slice(0, HIST));
      const predA = Array.from({ length: N }, (_, t) => row(t).reduce((s, v, j) => s + v * fitA.w[j], 0));
      const predB = Array.from({ length: N }, (_, t) => [1, t, Math.sin((2 * Math.PI * t) / 52), Math.cos((2 * Math.PI * t) / 52), disc[t]].reduce((s, v, j) => s + v * fitB.w[j], 0));
      let l = A[0]; for (let t = 0; t < HIST; t++) l = 0.3 * A[t] + 0.7 * l;
      const ses = Array(FUT).fill(l);
      const mape = (f) => (f.reduce((s, v, i) => s + Math.abs(A[HIST + i] - v) / A[HIST + i], 0) / FUT) * 100;
      R = { A, B, predA, predB, ses, fitA, fitB, lf, dp, cn, mReg: mape(predA.slice(HIST)), mSes: mape(ses) };
    }

    function draw() {
      const { A, B, predA, predB, ses, fitA, fitB, lf, dp, cn, mReg, mSes } = R;
      $("#lfV").textContent = lf.toFixed(1) + " units"; $("#dpV").textContent = "−" + dp; $("#cnV").textContent = Math.round(cn * 100) + "% of lift";
      $("#nzV").textContent = "±" + $("#nz").value; $("#ddV").textContent = $("#dd").value + "%";
      const xs = A.map((_, i) => i);
      const shade = (p, arrB) => {
        const g = p.ctx;
        g.save();
        g.fillStyle = css("--grid"); g.fillRect(p.sx(HIST - 0.5), p.pad.t, p.sx(N - 0.5) - p.sx(HIST - 0.5), p.ih);
        disc.forEach((d, t) => { if (d) { g.fillStyle = css("--violet"); g.globalAlpha = 0.12 + d / 120; g.fillRect(p.sx(t - 0.5), p.pad.t, p.sx(t + 0.5) - p.sx(t - 0.5), p.ih); } });
        if (!arrB) hol.forEach((h, t) => { if (h) { g.fillStyle = css("--good"); g.globalAlpha = 0.25; g.fillRect(p.sx(t - 0.5), p.pad.t, p.sx(t + 0.5) - p.sx(t - 0.5), p.ih); } });
        g.restore();
      };
      const all = A.concat(predA);
      pA.y = [Math.min(...all) * 0.9, Math.max(...all) * 1.05];
      pA.clear(); shade(pA);
      pA.axes({ xLabel: "week", yLabel: "product A units", xTicks: [0, 26, 52, 78, 104, 116] });
      pA.path([HIST - 0.5, HIST - 0.5], pA.y, css("--muted"), 1.2, [4, 4]);
      pA.path(xs, predA, css("--accent"), 2.2);
      pA.path(Array.from({ length: FUT }, (_, i) => HIST + i), ses, css("--warm"), 2.4, [6, 3]);
      pA.path(xs, A, css("--ink"), 1.4);
      A.forEach((v, t) => pA.dot(t, v, t >= HIST ? 3.5 : 2, css("--ink")));

      const allB = B.concat(predB);
      pB.y = [Math.min(...allB) * 0.9, Math.max(...allB) * 1.05];
      pB.clear(); shade(pB, true);
      pB.axes({ xLabel: "week", yLabel: "product B units", yCount: 4, xTicks: [0, 26, 52, 78, 104, 116] });
      pB.path(xs, B, css("--muted"), 1.4);
      pB.path(xs, predB, css("--violet"), 2);

      const truth = [null, 0.4, 25, 10, lf, -dp, 60];
      const th = (t, l) => `<th style="text-align:${l ? "left" : "right"};padding:5px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted)">${t}</th>`;
      const td = (t, x = "") => `<td style="text-align:right;padding:5px 6px;border-bottom:1px solid var(--grid);font-family:var(--font-mono);${x}">${t}</td>`;
      $("#coef").innerHTML = `<tr>${th("Driver (product A)", 1)}${th("Estimate")}${th("± std. error")}${th("Hidden truth")}</tr>` +
        FEAT.map((f, j) => `<tr><td style="padding:5px 6px;border-bottom:1px solid var(--grid)">${f}</td>${td(fmt(fitA.w[j], 2), j >= 4 ? "font-weight:700;color:var(--accent)" : "")}${td("± " + fmt(fitA.se[j], 2))}${td(truth[j] === null ? "200" : fmt(truth[j], 2), "color:var(--muted)")}</tr>`).join("") +
        `<tr><td style="padding:5px 6px;border-bottom:1px solid var(--grid)"><b>Product B:</b> A's discount (per %)</td>${td(fmt(fitB.w[4], 2), "font-weight:700;color:var(--violet)")}${td("± " + fmt(fitB.se[4], 2))}${td(fmt(-cn * lf, 2), "color:var(--muted)")}</tr>`;

      const dd = +$("#dd").value, lift = fitA.w[4] * dd, dip = fitA.w[5], cann = fitB.w[4] * dd;
      const b = (x) => `<b style="color:var(--ink)">${x}</b>`, mu = (x) => `<span style="color:var(--muted)">${x}</span>`;
      $("#work").innerHTML = [
        `A ${dd}% promotion is worth, by the fitted model:`,
        `lift in promo week = ${fmt(fitA.w[4], 2)} × ${dd} = ${b((lift >= 0 ? "+" : "") + fmt(lift, 0))}`,
        `dip the week after = ${b((dip >= 0 ? "+" : "") + fmt(dip, 0))}`,
        `sales taken from product B = ${fmt(fitB.w[4], 2)} × ${dd} = ${b((cann >= 0 ? "+" : "") + fmt(cann, 0))}`,
        `net incremental volume = ${b((lift + dip + cann >= 0 ? "+" : "") + fmt(lift + dip + cann, 0))} ${mu(`(${lift > 0 ? Math.round(((lift + dip + cann) / lift) * 100) : 0}% of the headline lift)`)}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");

      const nFut = disc.slice(HIST).filter(Boolean).length;
      $("#ro").innerHTML = `
        <div class="ro"><b>Future promotions planned</b><span class="num">${nFut}</span></div>
        <div class="ro"><b>MAPE, regression</b><span class="pill ${mReg <= mSes ? "ok" : "idle"}">${mReg.toFixed(1)}%</span></div>
        <div class="ro"><b>MAPE, smoothing</b><span class="pill ${mSes < mReg ? "ok" : "idle"}">${mSes.toFixed(1)}%</span></div>
        <div class="ro"><b>Past promotions to learn from</b><span class="num">${disc.slice(0, HIST).filter(Boolean).length}</span></div>`;
    }

    pA.c.addEventListener("click", (e) => {
      const r = pA.c.getBoundingClientRect(), t = Math.round(pA.ix(e.clientX - r.left));
      if (t < HIST || t >= N) return;
      disc[t] = disc[t] ? 0 : +$("#dd").value; compute(); draw();
    });
    pA.c.addEventListener("pointermove", (e) => { const r = pA.c.getBoundingClientRect(), t = Math.round(pA.ix(e.clientX - r.left)); pA.c.style.cursor = t >= HIST && t < N ? "pointer" : "default"; });
    const rerun = () => { compute(); draw(); };
    ["#lf", "#dp", "#cn", "#nz"].forEach((s) => $(s).addEventListener("input", rerun));
    $("#dd").addEventListener("input", () => { for (let t = HIST; t < N; t++) if (disc[t]) disc[t] = +$("#dd").value; rerun(); });
    $("#clr").addEventListener("click", () => { for (let t = HIST; t < N; t++) disc[t] = 0; rerun(); });
    $("#newd").addEventListener("click", () => { seed++; makeHistory(); rerun(); });
    makeHistory();
    [HIST + 3, HIST + 9].forEach((t) => (disc[t] = 20));
    rerun();
    return watch([pA.c, pB.c], (resized) => { if (resized) { pA.resize(); pB.resize(); } draw(); });
  },
});
