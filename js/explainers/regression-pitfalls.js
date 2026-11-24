Lab.register({
  id: "regression-pitfalls",
  group: "Regression",
  title: "Six ways a regression misleads you (and how to spot them)",
  blurb: "A regression always gives you numbers, even when they're wrong. Curves, uneven noise, one rogue point, forecasting outside the data, a missing driver, and drivers that move together: see each one happen, the chart that gives it away, and the fix.",
  lede: "Least squares will fit a line through anything and report coefficients to three decimals. Whether those numbers mean anything depends on assumptions that are easy to break with real business data. The good news is that most problems leave fingerprints, usually in a plot of the residuals (actual minus fitted) or in the stability of the coefficients. Pick a pitfall below, turn up its severity, watch the estimate go wrong, then switch on the fix.",
  quiz: [
    ["The residuals-vs-fitted plot shows a U shape. What's wrong, and what's the fix?", "The relationship is curved and a straight line can't follow it. Add a squared term, transform a variable (e.g. log), or use a flexible model."],
    ["The residuals fan out: small for small stores, large for big ones. Are the coefficients wrong?", "The coefficients are still unbiased, but their standard errors and any prediction intervals are wrong: too wide for small stores, too narrow for big ones. Model the log of sales, use weighted least squares, or use robust (heteroscedasticity-consistent) standard errors."],
    ["Your promo-uplift regression used discounts from 0% to 20%. Can you use it to predict a 50% discount?", "Not safely. Nothing in the data says what happens beyond 20%; the real response may flatten out (saturation) or jump. Treat predictions outside the data range as guesses."],
    ["Sales fall as price rises, with a strong slope. Then you add 'on promotion' as a driver and the price effect halves. Which number is right?", "Usually the second. Promotions both cut price and add displays and flyers, so without the promo variable, price gets credit for the whole promo effect (omitted-variable bias)."],
    ["Two drivers, 'flyer' and 'display', are almost always used together. What happens to their coefficients?", "They become unstable: the model can't tell them apart, so it splits the effect arbitrarily, standard errors balloon, and signs can flip from sample to sample. Their combined effect is still well estimated. Check the variance inflation factor (VIF); above about 5–10 is a warning."],
    ["One point has a big residual but sits in the middle of the x range. Is it influential?", "Not much. Influence needs leverage (an unusual x) as well as a big residual. Cook's distance combines the two; a point far out in x that's off the line can swing the whole fit."],
  ],
  diy: {
    intro: "Driver x in A2:A51, sales y in B2:B51. Fit with =LINEST(B2:B51, A2:A51, TRUE, TRUE) or the Analysis ToolPak's Regression (tick 'Residuals' and 'Residual plots').",
    steps: [
      ["Fitted values and residuals.", "C2: =INTERCEPT($B$2:$B$51,$A$2:$A$51)+SLOPE($B$2:$B$51,$A$2:$A$51)*A2   D2: =B2-C2"],
      ["Plot D against C (scatter). Look for curves, fans or lone points.", "Insert > Scatter, x = C2:C51, y = D2:D51"],
      ["Curvature fix: add a squared column and fit both.", "E2: =A2^2   then =LINEST(B2:B51, A2:A51:E2:E51 as two columns, TRUE, TRUE)"],
      ["Fan-shaped residuals: try logs.", "=LINEST(LN(B2:B51), A2:A51, TRUE, TRUE)"],
      ["Leverage of each point (simple regression).", "=1/50 + (A2-AVERAGE($A$2:$A$51))^2/DEVSQ($A$2:$A$51)"],
      ["Variance inflation factor for a driver: regress it on the other drivers, then…", "=1/(1-RSQ(driver1, driver2))"],
    ],
  },
  deeper: [
    ["James, Witten, Hastie & Tibshirani, An Introduction to Statistical Learning, §3.3.3 Potential problems (free PDF)", "https://www.statlearning.com/", "the six problems covered here, with R/Python labs"],
    ["Penn State STAT 501, Lesson 4: Linear model assumptions and residual analysis", "https://online.stat.psu.edu/stat501/lesson/4", "free course notes on residual plots"],
    ["Anscombe (1973), Graphs in statistical analysis, The American Statistician 27(1)", "https://doi.org/10.1080/00031305.1973.10478966", "four datasets with identical regressions and very different stories"],
    ["Cook (1977), Detection of influential observation in linear regression, Technometrics 19(1)", "https://doi.org/10.1080/00401706.1977.10489493", "Cook's distance"],
    ["White (1980), A heteroskedasticity-consistent covariance matrix estimator and a direct test for heteroskedasticity, Econometrica 48(4)", "https://doi.org/10.2307/1912934", "robust standard errors for fan-shaped residuals"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g stroke-opacity=".5"><circle cx="14" cy="50" r="2"/><circle cx="24" cy="40" r="2"/><circle cx="34" cy="34" r="2"/><circle cx="46" cy="30" r="2"/><circle cx="58" cy="30" r="2"/><circle cx="70" cy="34" r="2"/></g><circle cx="86" cy="54" r="3"/><path d="M8 46 L90 30" stroke-width="2.5"/><path d="M8 54 C 30 30, 60 22, 80 34" stroke-dasharray="4 3"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, solve } = Lab;
    const SC = [
      ["curve", "Curved relationship"], ["fan", "Uneven spread"], ["lever", "One rogue point"],
      ["extrap", "Predicting outside the data"], ["omit", "Missing driver"], ["collin", "Drivers that move together"],
    ];
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="seg" id="sc" style="display:flex;flex-wrap:wrap;margin-bottom:12px">${SC.map(([k, n], i) => `<button type="button" data-v="${k}" aria-pressed="${i === 0}" style="flex:1 1 auto">${n}</button>`).join("")}</div>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("The data and the fit")}</div><canvas id="q1" aria-label="Data with fitted regression"></canvas><figcaption id="q1Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("The diagnostic that gives it away")}</div><canvas id="q2" aria-label="Diagnostic chart"></canvas><figcaption id="q2Cap"></figcaption></figure>`)}
        <div class="plot" style="padding:14px">${h4("What's going on")}<div id="expl" style="font-size:.92rem;line-height:1.6;max-width:72ch"></div><div id="work" style="font:.8rem/1.8 var(--font-mono);margin-top:8px"></div></div>`,
      panel: `
        <p class="hint" style="margin:0" id="ctx"></p>
        <div class="ctrl"><label for="sev">How bad the problem is <output id="sevV"></output></label><input type="range" id="sev" min="0" max="1" step="0.05" value="0.6"></div>
        <div class="ctrl"><label for="nz">Noise <output id="nzV"></output></label><input type="range" id="nz" min="0.2" max="2" step="0.1" value="1"></div>
        <div class="ctrl"><label for="n">Data points <output id="nV"></output></label><input type="range" id="n" min="15" max="200" step="5" value="50"></div>
        <div class="ctrl"><label class="check" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="fix"> <span id="fixL">Apply the fix</span></label></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New sample</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The assumptions, in plain words</h2>
          <ol>
            <li><b>Straight-line shape</b>: the average of y really moves linearly with each driver (or you've added the right curves).</li>
            <li><b>Even noise</b>: the scatter around the line is about the same everywhere.</li>
            <li><b>No single point runs the show</b>.</li>
            <li><b>You stay inside the data</b> when predicting.</li>
            <li><b>The important drivers are in the model</b>, especially ones linked to the drivers you care about.</li>
            <li><b>Drivers aren't near-copies of each other</b>.</li>
          </ol>
          <p>Independent errors (no autocorrelation) matter too for time series: see <a href="#acf-pacf">ACF/PACF</a>. Normal-looking residuals matter mostly for small samples and prediction intervals.</p>
        </section>
        <section>
          <h2>The first plot to make</h2>
          <p>Residuals against fitted values. A healthy one is a shapeless horizontal band around zero. Curves mean missing shape; fans mean uneven noise; lone points far out mean outliers or influential points. It takes seconds and catches most problems.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Go through the six tabs at the default severity, then tick "Apply the fix" in each.</li>
            <li>On "Drivers that move together", press "New sample" repeatedly: the two coefficients jump around while their sum stays steady.</li>
            <li>On "One rogue point", raise the severity and watch Cook's distance for that point cross 1.</li>
          </ol>
          <p>Related: <a href="#least-squares">least squares</a>, <a href="#r-squared">R²</a>, <a href="#correlation-traps">correlation traps</a>, <a href="#outliers">outliers</a>, <a href="#regularisation">ridge and lasso</a> and <a href="#promo-regression">regression with promotions</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let sc = "curve", seed = 3, R = null;
    function lsq(X, y) { // X rows include intercept
      const p = X[0].length, A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0))), b = Array.from({ length: p }, (_, i) => X.reduce((s, r, k) => s + r[i] * y[k], 0));
      const beta = solve(A.map((r) => r.slice()), b.slice()), fit = X.map((r) => r.reduce((s, v, j) => s + v * beta[j], 0)), res = y.map((v, i) => v - fit[i]);
      const sse = res.reduce((s, v) => s + v * v, 0), s2 = sse / Math.max(1, y.length - p);
      const inv = Array.from({ length: p }, (_, j) => solve(A.map((r) => r.slice()), Array.from({ length: p }, (_, k) => (k === j ? 1 : 0))));
      const se = beta.map((_, j) => Math.sqrt(s2 * inv[j][j])), my = y.reduce((a, v) => a + v, 0) / y.length, r2 = 1 - sse / y.reduce((s, v) => s + (v - my) ** 2, 0);
      return { beta, fit, res, se, r2, s2, inv };
    }
    const CTX = {
      curve: ["x = price discount (%), y = weekly units. The real response flattens at deep discounts.", "Add a squared term (discount²)"],
      fan: ["x = store size (m²), y = weekly sales. Big stores vary more in absolute terms.", "Model log(sales) instead"],
      lever: ["x = advertising spend, y = sales. One week had a huge spend and a poor result.", "Leave the rogue week out (after checking why it's odd)"],
      extrap: ["Discounts tried so far: 0–20%. Management asks what 50% would do.", "Fit a saturating (log) curve instead of a line"],
      omit: ["x = shelf price, y = weekly units. Promotions cut the price and also add displays.", "Add 'on promotion' as a second driver"],
      collin: ["Two drivers, flyer spend and display spend, almost always move together.", "Combine them into one 'promo spend' driver"],
    };
    function gen() {
      const sev = +$("#sev").value, nz = +$("#nz").value, n = +$("#n").value, r = rng(seed * 97 + SC.findIndex((s) => s[0] === sc)), fix = $("#fix").checked, D = { sev, nz, n, fix };
      if (sc === "curve") { D.x = Array.from({ length: n }, () => r() * 40); D.truth = (x) => 50 + 3 * x - sev * 0.06 * x * x; D.y = D.x.map((x) => D.truth(x) + 4 * nz * r.normal()); }
      if (sc === "fan") { D.x = Array.from({ length: n }, () => 200 + r() * 1800); D.truth = (x) => 20 + 0.1 * x; D.y = D.x.map((x) => Math.max(1, D.truth(x) * Math.exp((0.05 + 0.35 * sev) * nz * r.normal()))); }
      if (sc === "lever") { D.x = Array.from({ length: n - 1 }, () => r() * 10); D.truth = (x) => 40 + 4 * x; D.y = D.x.map((x) => D.truth(x) + 4 * nz * r.normal()); D.x.push(10 + 25 * sev); D.y.push(D.truth(10 + 25 * sev) - 100 * sev); D.rogue = n - 1; }
      if (sc === "extrap") { D.x = Array.from({ length: n }, () => r() * 20); D.truth = (x) => 100 + (60 + 60 * sev) * Math.log(1 + x / (8 + 0 * sev)) - 0 * x; D.y = D.x.map((x) => D.truth(x) + 6 * nz * r.normal()); D.q = 50; }
      if (sc === "omit") { D.promo = Array.from({ length: n }, () => (r() < 0.35 ? 1 : 0)); D.x = D.promo.map((p) => 5 - p * (0.6 + 1.2 * sev) + 0.35 * r.normal()); D.truth = -15; D.pl = 50 + 60 * sev; D.y = D.x.map((x, i) => 200 + D.truth * x + D.pl * D.promo[i] + 8 * nz * r.normal()); }
      if (sc === "collin") { const rho = 0.6 + 0.39 * Math.sqrt(sev); D.x = []; D.x2 = []; for (let i = 0; i < n; i++) { const f = r.normal(), a = f, b = rho * f + Math.sqrt(1 - rho * rho) * r.normal(); D.x.push(10 + 3 * a); D.x2.push(10 + 3 * b); } D.rho = rho; D.y = D.x.map((x, i) => 20 + 2 * x + 2 * D.x2[i] + 12 * nz * r.normal()); }
      return D;
    }
    function analyse(D) {
      const out = { D };
      if (sc === "curve") { const X = D.x.map((x) => (D.fix ? [1, x, x * x] : [1, x])), f = lsq(X, D.y); out.f = f; out.pred = (x) => f.beta[0] + f.beta[1] * x + (D.fix ? f.beta[2] * x * x : 0); }
      if (sc === "fan") { const yy = D.fix ? D.y.map(Math.log) : D.y, f = lsq(D.x.map((x) => [1, x]), yy); out.f = f; out.pred = (x) => (D.fix ? Math.exp(f.beta[0] + f.beta[1] * x) : f.beta[0] + f.beta[1] * x); }
      if (sc === "lever") { const keep = D.x.map((_, i) => i).filter((i) => !(D.fix && i === D.rogue)), f = lsq(keep.map((i) => [1, D.x[i]]), keep.map((i) => D.y[i])); out.f = f; out.keep = keep; out.pred = (x) => f.beta[0] + f.beta[1] * x;
        const all = lsq(D.x.map((x) => [1, x]), D.y), n = D.x.length, mx = D.x.reduce((a, b) => a + b, 0) / n, sxx = D.x.reduce((a, x) => a + (x - mx) ** 2, 0); out.cook = D.x.map((x, i) => { const h = 1 / n + (x - mx) ** 2 / sxx; return (all.res[i] ** 2 / (2 * all.s2)) * (h / (1 - h) ** 2); }); out.lev = D.x.map((x) => 1 / n + (x - mx) ** 2 / sxx); out.all = all; }
      if (sc === "extrap") { const X = D.x.map((x) => (D.fix ? [1, Math.log(1 + x / 8)] : [1, x])), f = lsq(X, D.y); out.f = f; out.pred = (x) => (D.fix ? f.beta[0] + f.beta[1] * Math.log(1 + x / 8) : f.beta[0] + f.beta[1] * x); }
      if (sc === "omit") { const f = lsq(D.x.map((x, i) => (D.fix ? [1, x, D.promo[i]] : [1, x])), D.y); out.f = f; const f0 = lsq(D.x.map((x) => [1, x]), D.y), f1 = lsq(D.x.map((x, i) => [1, x, D.promo[i]]), D.y); out.f0 = f0; out.f1 = f1; }
      if (sc === "collin") { const f = D.fix ? lsq(D.x.map((x, i) => [1, x + D.x2[i]]), D.y) : lsq(D.x.map((x, i) => [1, x, D.x2[i]]), D.y); out.f = f;
        const reps = []; for (let k = 0; k < 40; k++) { const r = rng(1000 + k), xs = [], x2 = [], ys = []; for (let i = 0; i < D.n; i++) { const fct = r.normal(), a = 10 + 3 * fct, b = 10 + 3 * (D.rho * fct + Math.sqrt(1 - D.rho * D.rho) * r.normal()); xs.push(a); x2.push(b); ys.push(20 + 2 * a + 2 * b + 12 * D.nz * r.normal()); } const g = lsq(xs.map((x, i) => [1, x, x2[i]]), ys); reps.push(g.beta); } out.reps = reps; out.vif = 1 / (1 - D.rho * D.rho); }
      return out;
    }
    const P1 = new Plot($("#q1"), { x: [0, 1], pad: { l: 50, b: 38 } }), P2 = new Plot($("#q2"), { x: [0, 1], pad: { l: 50, b: 38 } });
    function scatter(P, xs, ys, xl, yl, xr, yr) { const ex = (xr[1] - xr[0]) * 0.05, ey = (yr[1] - yr[0]) * 0.08; P.resize(); P.x = [xr[0] - ex, xr[1] + ex]; P.y = [yr[0] - ey, yr[1] + ey]; P.clear(); P.axes({ xLabel: xl, yLabel: yl, xFormat: (v) => fmt(v, Math.abs(xr[1] - xr[0]) < 8 ? 1 : 0), yFormat: (v) => fmt(v, Math.abs(yr[1] - yr[0]) < 5 ? 1 : 0), xCount: 5 }); xs.forEach((x, i) => P.dot(x, ys[i], 3, css("--muted"))); }
    function resid(f, label) {
      const fx = f.fit, rs = f.res, lim = Math.max(...rs.map(Math.abs)) * 1.1 || 1;
      P2.resize(); P2.x = [Math.min(...fx) - 1e-9, Math.max(...fx) + 1e-9]; const ex = (P2.x[1] - P2.x[0]) * 0.05; P2.x = [P2.x[0] - ex, P2.x[1] + ex]; P2.y = [-lim, lim]; P2.clear();
      P2.axes({ xLabel: "fitted value" + (label || ""), yLabel: "residual", xFormat: (v) => fmt(v, Math.abs(P2.x[1]) < 20 ? 1 : 0), yFormat: (v) => fmt(v, lim < 5 ? 2 : 0), xCount: 5 });
      P2.path(P2.x, [0, 0], css("--ink"), 1); fx.forEach((x, i) => P2.dot(x, rs[i], 3, css("--accent")));
      const lo = Math.min(...fx), hi = Math.max(...fx), bw = (hi - lo) / 7 || 1, gx = Array.from({ length: 41 }, (_, i) => lo + ((hi - lo) * i) / 40);
      const sm = gx.map((g) => { let sw = 0, sy = 0; fx.forEach((x, i) => { const w = Math.exp(-0.5 * ((x - g) / bw) ** 2); sw += w; sy += w * rs[i]; }); return sy / sw; });
      P2.path(gx, sm, css("--warm"), 2.5);
    }
    function render() {
      const D = gen(), A = analyse(D), f = A.f, b = (t) => `<b style="color:var(--ink)">${t}</b>`; R = A;
      $("#ctx").textContent = CTX[sc][0]; $("#fixL").textContent = CTX[sc][1];
      let ro = [], expl = "", work = [], c1 = "", c2 = "";
      if (sc === "curve" || sc === "fan" || sc === "extrap") {
        const xmax = sc === "extrap" ? 55 : Math.max(...D.x), ys = [...D.y, ...(sc === "extrap" ? [A.pred(50), D.truth(50)] : [])];
        scatter(P1, D.x, D.y, sc === "fan" ? "store size (m²)" : "price discount (%)", "weekly units", [0, xmax], [Math.min(...ys), Math.max(...ys)]);
        if (sc === "extrap") { const g = P1.ctx; g.save(); g.fillStyle = css("--grid"); g.fillRect(P1.sx(20), P1.pad.t, P1.sx(P1.x[1]) - P1.sx(20), P1.ih); g.restore(); D.x.forEach((x, i) => P1.dot(x, D.y[i], 3, css("--muted"))); P1.axes({ xLabel: "price discount (%)", yLabel: "weekly units", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) }); }
        P1.fn(D.truth, css("--good"), 1.5, [5, 4]); P1.fn(A.pred, css("--accent"), 2.5);
        if (sc === "extrap") { P1.dot(50, A.pred(50), 6, css("--accent"), css("--surface")); P1.dot(50, D.truth(50), 6, css("--good"), css("--surface")); }
        resid(f, sc === "fan" && D.fix ? " (log scale)" : "");
      }
      if (sc === "curve") {
        c1 = `Blue: the fitted ${D.fix ? "curve (with discount²)" : "straight line"}. Green dashed: the true response. R² = ${fmt(f.r2, 3)}.`;
        c2 = D.fix ? "With the squared term the residuals form a flat, shapeless band: nothing left to explain." : `The orange smoother shows a hump: residuals are negative at both ends and positive in the middle. That's the curve the straight line missed.`;
        expl = `A straight line through a curved response is wrong in a predictable way: it over-predicts the effect of deep discounts and under-predicts the middle. R² can still look respectable${D.fix ? "" : ` (${fmt(f.r2, 2)} here)`}, which is why you need the residual plot.`;
        ro = [["R²", fmt(f.r2, 3)], ["Slope per 1% discount", fmt(f.beta[1], 2)], ["Predicted at 40%", fmt(A.pred(40), 0)], ["True at 40%", fmt(D.truth(40), 0)]];
        work.push(D.fix ? `fit: units = ${fmt(f.beta[0], 1)} + ${fmt(f.beta[1], 3)} × d ${f.beta[2] < 0 ? "−" : "+"} ${fmt(Math.abs(f.beta[2]), 4)} × d²` : `fit: units = ${fmt(f.beta[0], 1)} + ${fmt(f.beta[1], 3)} × d`);
      }
      if (sc === "fan") {
        const small = D.x.map((x, i) => [x, f.res[i]]).filter((v) => v[0] < 800), big = D.x.map((x, i) => [x, f.res[i]]).filter((v) => v[0] > 1400), sd = (a) => Math.sqrt(a.reduce((s, v) => s + v[1] * v[1], 0) / (a.length || 1));
        c1 = `Blue: the fit${D.fix ? " (made on log sales, shown back on the original scale)" : ""}. Green dashed: the true average.`;
        c2 = D.fix ? `On the log scale the band is even: residual SD ${fmt(sd(small), 3)} for small stores vs ${fmt(sd(big), 3)} for big ones.` : `A fan: residual SD is ${fmt(sd(small), 1)} for stores under 800 m² and ${fmt(sd(big), 1)} for stores over 1,400 m².`;
        expl = "Uneven spread doesn't bias the slope, but it makes the standard errors and prediction intervals wrong: one interval width is used for stores that are really much more or less predictable. Percentages (logs), weights, or robust standard errors fix it.";
        ro = [["Slope", D.fix ? fmt(f.beta[1] * 1000, 3) + " log-units / 1,000 m²" : fmt(f.beta[1], 3) + " / m²"], ["Slope's standard error", fmt(f.se[1] * (D.fix ? 1000 : 1), 4)], ["R²", fmt(f.r2, 3)]];
      }
      if (sc === "extrap") {
        c1 = `Shaded: discounts never tried. Blue dot: the ${D.fix ? "log-curve" : "straight-line"} prediction at 50%, ${fmt(A.pred(50), 0)}. Green dot: what would really happen, ${fmt(D.truth(50), 0)}.`;
        c2 = D.fix ? "With the log curve the residuals are a flat band. But a good fit inside 0–20% still says nothing certain about 50%." : "Inside the data the line misses only by a gentle bend (the smoother), easy to shrug off as noise. The plot can't show how big the gap becomes where you have no data.";
        expl = `Both models fit the 0–20% range almost equally well, yet they disagree by ${fmt(Math.abs(A.pred(50) - D.truth(50)), 0)} units at 50%. Data only tells you about the range you've tried; beyond it the model's shape is an assumption. Use business knowledge (saturation, cannibalisation, stock limits), or run a test at a deeper discount.`;
        ro = [["Prediction at 50%", fmt(A.pred(50), 0)], ["Truth at 50%", fmt(D.truth(50), 0)], ["Error", fmt(((A.pred(50) - D.truth(50)) / D.truth(50)) * 100, 0) + "%"], ["R² in the data range", fmt(f.r2, 3)]];
      }
      if (sc === "lever") {
        const xs = D.x, ys = D.y, ymin = Math.min(...ys), ymax = Math.max(...ys);
        scatter(P1, xs, ys, "advertising spend ($k)", "sales", [0, Math.max(...xs)], [ymin, ymax]);
        P1.dot(xs[D.rogue], ys[D.rogue], 6, css("--bad"), css("--surface"));
        P1.fn(D.truth, css("--good"), 1.5, [5, 4]); if (D.fix) P1.fn((x) => A.all.beta[0] + A.all.beta[1] * x, css("--muted"), 1.5, [2, 3]); P1.fn(A.pred, css("--accent"), 2.5);
        P2.resize(); P2.x = [0, Math.max(...A.lev) * 1.1]; P2.y = [0, Math.max(1.2, ...A.cook) * 1.1]; P2.clear(); P2.axes({ xLabel: "leverage (how unusual the spend is)", yLabel: "Cook's distance", xFormat: (v) => fmt(v, 2), yFormat: (v) => fmt(v, 1) });
        P2.path(P2.x, [1, 1], css("--bad"), 1, [4, 3]); A.lev.forEach((h, i) => P2.dot(h, A.cook[i], i === D.rogue ? 6 : 3, css(i === D.rogue ? "--bad" : "--accent")));
        const ck = A.cook[D.rogue];
        c1 = `Red: the rogue week. ${D.fix ? `Grey dotted: fit with it, slope ${fmt(A.all.beta[1], 2)}. Blue: fit without it, slope ${fmt(f.beta[1], 2)}.` : `Blue: the fit with it included, slope ${fmt(A.all.beta[1], 2)}.`} Green dashed: the true slope of 4.`;
        c2 = `Cook's distance combines leverage and residual. The rogue week scores <b>${fmt(ck, 2)}</b>${ck > 1 ? ", above the usual warning level of 1" : ""}; the next highest is ${fmt(Math.max(...A.cook.filter((_, i) => i !== D.rogue)), 2)}.`;
        expl = "A point far out on x has leverage: the line pivots to get close to it. If it's also off-pattern, it drags the slope on its own. Don't just delete it: find out why (a data error? a stock-out that week?), then decide. Report results with and without it if unsure.";
        ro = [["Slope with the rogue week", fmt(A.all.beta[1], 2)], ["Slope without it", fmt(lsq(xs.slice(0, -1).map((x) => [1, x]), ys.slice(0, -1)).beta[1], 2)], ["Its Cook's distance", fmt(ck, 2)], ["Its leverage", fmt(A.lev[D.rogue], 2)]];
      }
      if (sc === "omit") {
        const { f0, f1 } = A, xs = D.x, ys = D.y;
        scatter(P1, xs, ys, "shelf price ($)", "weekly units", [Math.min(...xs), Math.max(...xs)], [Math.min(...ys), Math.max(...ys)]);
        xs.forEach((x, i) => P1.dot(x, ys[i], 3, css(D.promo[i] ? "--warm" : "--accent")));
        P1.fn((x) => f0.beta[0] + f0.beta[1] * x, css("--muted"), 2, [5, 4]);
        if (D.fix) { P1.fn((x) => f1.beta[0] + f1.beta[1] * x, css("--accent"), 2.5); P1.fn((x) => f1.beta[0] + f1.beta[1] * x + f1.beta[2], css("--warm"), 2.5); }
        P2.resize(); P2.x = [0, 3]; const vals = [f0.beta[1], f1.beta[1], D.truth], lo = Math.min(...vals, 0) * 1.2; P2.y = [lo, -lo * 0.12]; P2.clear();
        P2.axes({ xLabel: "", yLabel: "", xTicks: [0.5, 1.5, 2.5], xFormat: (v) => ["without promo", "with promo", "truth"][Math.floor(v)], yFormat: (v) => fmt(v, 0) });
        const g = P2.ctx; vals.forEach((v, i) => { const w = P2.sx(0.5) - P2.sx(0); g.fillStyle = css(["--muted", "--accent", "--good"][i]); g.fillRect(P2.sx(i + 0.5) - w / 2, P2.sy(0), w, P2.sy(v) - P2.sy(0)); g.fillStyle = css("--ink"); g.font = "12px " + css("--font-mono"); g.textAlign = "center"; g.fillText(fmt(v, 1), P2.sx(i + 0.5), P2.sy(v) + 14); });
        c1 = `Orange: promo weeks; blue: normal weeks. Grey dashed: one line ignoring promos, slope ${fmt(f0.beta[1], 1)}.${D.fix ? ` Solid: with a promo driver, two parallel lines, slope ${fmt(f1.beta[1], 1)}.` : ""}`;
        c2 = `Bars: estimated units lost per $1 of price. Price effect without the promo driver: <b>${fmt(f0.beta[1], 1)}</b> units per $1. With it: <b>${fmt(f1.beta[1], 1)}</b>. Truth: ${D.truth}.`;
        expl = `Promo weeks have lower prices <i>and</i> displays and flyers. Leave promos out and price takes credit for all of it, so the price effect looks ${fmt(f0.beta[1] / D.truth, 1)}× too strong. A pricing decision based on it would overestimate what a price cut alone delivers. Any driver linked to both price and sales causes this: think about what else changes when your driver changes.`;
        ro = [["Price effect, promo left out", fmt(f0.beta[1], 1)], ["Price effect, promo included", fmt(f1.beta[1], 1)], ["True price effect", fmt(D.truth, 1)], ["Promo uplift estimate", fmt(f1.beta[2], 0)]];
      }
      if (sc === "collin") {
        const xs = D.x, x2 = D.x2;
        scatter(P1, xs, x2, "flyer spend", "display spend", [Math.min(...xs), Math.max(...xs)], [Math.min(...x2), Math.max(...x2)]);
        P2.resize(); const bs = A.reps.map((b) => [b[1], b[2]]), lim = Math.max(3, ...bs.flat().map((v) => Math.abs(v - 2))) * 1.1; P2.x = [2 - lim, 2 + lim]; P2.y = [2 - lim, 2 + lim]; P2.clear();
        P2.axes({ xLabel: "flyer coefficient", yLabel: "display coefficient", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
        P2.path(P2.x, [4 - P2.x[0], 4 - P2.x[1]], css("--muted"), 1, [4, 3]); bs.forEach(([a, c]) => P2.dot(a, c, 3, css("--accent"))); P2.dot(2, 2, 6, null, css("--good"));
        const sdA = Math.sqrt(bs.reduce((s, v) => s + (v[0] - 2) ** 2, 0) / bs.length), sdS = Math.sqrt(bs.reduce((s, v) => s + (v[0] + v[1] - 4) ** 2, 0) / bs.length);
        c1 = `Correlation between the two drivers: <b>${fmt(D.rho, 2)}</b>. The points hug a line: the data barely tells them apart.`;
        c2 = `Each dot: the two coefficients from a fresh sample of ${D.n}. Truth: 2 and 2 (green). They scatter along the dashed line where their sum is 4: SD of the flyer coefficient ${fmt(sdA, 2)}, SD of the sum only ${fmt(sdS, 2)}.`;
        expl = `When drivers move together, the model knows their combined effect well but not how to split it. Individual coefficients swing, can take the wrong sign, and get huge standard errors. VIF = 1/(1 − r²) = ${fmt(A.vif, 1)} here (above 5–10 is a warning). Combine them, drop one, use <a href="#regularisation">ridge regression</a>, or vary them independently in a test.`;
        ro = D.fix ? [["Combined promo coefficient", fmt(f.beta[1], 2)], ["Its standard error", fmt(f.se[1], 3)], ["VIF", "1 (one driver)"]] : [["Flyer coefficient", `${fmt(f.beta[1], 2)} ± ${fmt(f.se[1], 2)}`], ["Display coefficient", `${fmt(f.beta[2], 2)} ± ${fmt(f.se[2], 2)}`], ["Their sum", fmt(f.beta[1] + f.beta[2], 2)], ["VIF", fmt(A.vif, 1)]];
      }
      $("#q1Cap").innerHTML = c1; $("#q2Cap").innerHTML = c2; $("#expl").innerHTML = expl;
      $("#work").innerHTML = work.map((l) => `<div>${l}</div>`).join("");
      $("#ro").innerHTML = ro.map(([k, v]) => `<div class="ro"><b>${k}</b><span class="num">${v}</span></div>`).join("");
    }
    function labels() { $("#sevV").textContent = Math.round(+$("#sev").value * 100) + "%"; $("#nzV").textContent = fmt(+$("#nz").value, 1) + "×"; $("#nV").textContent = $("#n").value; }
    function update() { labels(); render(); }
    root.querySelectorAll("input[type=range]").forEach((e) => e.addEventListener("input", update));
    $("#fix").addEventListener("change", update);
    $("#sc").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { sc = b.dataset.v; $("#sc").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); $("#fix").checked = false; update(); }));
    $("#resim").addEventListener("click", () => { seed++; update(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 3; $("#fix").checked = false; update(); });
    update();
    return watch([$("#q1"), $("#q2")], render);
  },
});
