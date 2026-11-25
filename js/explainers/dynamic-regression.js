Lab.register({
  id: "dynamic-regression",
  group: "Forecasting",
  title: "Dynamic regression: forecasting with weather and price",
  blurb: "Weekly drink sales driven by temperature and price, with errors that linger from week to week. Compare plain regression with regression plus ARIMA errors, read the residual autocorrelation, and see that the forecast is only as good as the weather forecast you feed it.",
  lede: "Regression on drivers explains sales with things you can measure: temperature, price, promotions. But the leftover error usually isn't random noise. A hot spell, a competitor's stock-out or a viral post leaves sales high for several weeks, so this week's error predicts next week's. Plain regression ignores that: its standard errors are too small and its forecasts throw away what the latest errors say. Dynamic regression (regression with ARIMA errors) models the drivers and the lingering error together. And to forecast, you need forecasts of the drivers too.",
  quiz: [
    ["Plain regression residuals have lag-1 autocorrelation of 0.7. What's wrong with its output?", "The coefficients are still roughly unbiased, but the standard errors are too small, so drivers look more certain than they are. And forecasts ignore the fact that recent errors will persist."],
    ["In a regression with AR(1) errors, sales were 40 above the model last week and φ = 0.7. What does the error part add to the forecast for 1, 2 and 3 weeks ahead?", "0.7 × 40 = 28, then 0.7² × 40 ≈ 20, then 0.7³ × 40 ≈ 14. It fades back to the driver-only forecast."],
    ["Your model says +12 units per °C. To forecast next month you use the seasonal average temperature. What happens to the forecast intervals?", "They must widen to include the uncertainty in temperature: roughly 12² × (variance of temperature around normal) is added. A good weather forecast narrows them for the first week or two only."],
    ["Why might a driver-based model forecast worse than a model with no drivers?", "If the drivers' own forecasts are poor (weather beyond 10 days, competitor prices), plugging them in adds error. The driver model shines for scenarios (what if we cut price?) and for horizons where driver forecasts are good."],
    ["How do you check whether the error model is adequate?", "Look at the autocorrelation of the innovations (the errors left after the ARIMA part). They should look like white noise: bars inside ±2/√n, and a Ljung–Box test that isn't significant."],
  ],
  diy: {
    intro: "Weekly sales in B, temperature in C, price in D (rows 2–157).",
    steps: [
      ["Plain regression and its residuals.", "=LINEST(B2:B157, C2:D157, TRUE, TRUE)   residual E2: =B2-(b0+b1*C2+b2*D2)"],
      ["Lag-1 autocorrelation of the residuals.", "=CORREL(E3:E157, E2:E156)"],
      ["Cochrane–Orcutt step: transform with that φ and refit.", "y*: =B3-φ*B2   temp*: =C3-φ*C2   price*: =D3-φ*D2   then LINEST(y*, temp*:price*); intercept = b0*/(1−φ)"],
      ["Repeat with the new residuals' φ until it settles (or try φ values and keep the one with the smallest SSE).", ""],
      ["Forecast h weeks ahead.", "=b0 + b1*temp_forecast + b2*planned_price + φ^h * last_residual"],
    ],
  },
  deeper: [
    ["Hyndman & Athanasopoulos, Forecasting: Principles and Practice (3rd ed.), chapter 10: Dynamic regression models", "https://otexts.com/fpp3/dynamic.html", "regression with ARIMA errors, forecasting with drivers, and lagged predictors"],
    ["Cochrane & Orcutt (1949), Application of least squares regression to relationships containing auto-correlated error terms, Journal of the American Statistical Association 44(245)", "https://doi.org/10.1080/01621459.1949.10483290", "the classic fix for autocorrelated errors"],
    ["Granger & Newbold (1974), Spurious regressions in econometrics, Journal of Econometrics 2(2)", "https://doi.org/10.1016/0304-4076(74)90034-7", "what goes wrong when you regress one trending series on another"],
    ["Ljung & Box (1978), On a measure of lack of fit in time series models, Biometrika 65(2)", "https://doi.org/10.1093/biomet/65.2.297", "the standard test for leftover autocorrelation"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 44 C16 30 24 20 34 26 C44 32 50 48 62 40 C72 34 76 18 86 14" /><path d="M62 40 C72 34 76 18 92 12" stroke-dasharray="4 3"/><path d="M6 58 H90" stroke-opacity=".5"/><circle cx="18" cy="12" r="6" stroke-opacity=".6"/><path d="M18 2 V4 M18 20 V22 M8 12 H10 M26 12 H28" stroke-opacity=".6"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const N = 156, H = 12, B0 = 200, BT = 12, BP = -160, LAGS = 12;
    const MS = [["ols", "Plain regression", "--violet"], ["dyn", "Regression + AR(1) errors", "--accent"], ["ar", "No drivers (season + AR(1))", "--warm"]];
    let seed = 6, meth = "dyn", fut = "wx";
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("The last year of sales and a 12-week forecast")}</div><canvas id="c1" style="height:290px" aria-label="Weekly sales, fitted values and a 12-week forecast with interval"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "Is the leftover error still predictable?", 260, "Autocorrelation of residuals for plain regression and innovations for the dynamic model"), fig("c3", "Forecast error vs weather-forecast quality", 260, "Forecast error against the size of the temperature forecast error"))}
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4("Coefficients")}<div id="tbl"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Simulated weekly sales of a cold drink: ${B0} + ${BT} per °C − ${-BP} per $1 of price, plus an error that carries over from week to week. Price is $3.00, or $2.50 in promotion weeks.</p>
        <div class="ctrl"><label>Model</label><div class="seg" id="ms" style="flex-wrap:wrap">${MS.map(([k, n]) => `<button type="button" data-m="${k}" aria-pressed="${k === meth}">${n}</button>`).join("")}</div></div>
        <div class="ctrl"><label>Temperatures fed into the forecast</label><div class="seg" id="fs"><button type="button" data-f="wx" aria-pressed="true">Weather forecast</button><button type="button" data-f="norm" aria-pressed="false">Seasonal normal</button></div></div>
        <div class="ctrl"><label for="phi">How much error carries over (true φ) <output id="phiV"></output></label><input type="range" id="phi" min="0" max="0.95" step="0.05" value="0.7"></div>
        <div class="ctrl"><label for="wx">Weather forecast error (SD, °C) <output id="wxV"></output></label><input type="range" id="wx" min="0" max="5" step="0.25" value="1.5"></div>
        <div class="ctrl"><label for="ns">Week-to-week shock SD <output id="nsV"></output></label><input type="range" id="ns" min="5" max="60" step="5" value="25"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New data</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The model</h2>
          <p>Sales<sub>t</sub> = β₀ + β₁ temperature<sub>t</sub> + β₂ price<sub>t</sub> + η<sub>t</sub>, with η<sub>t</sub> = φ η<sub>t−1</sub> + ε<sub>t</sub>. The regression part says how drivers move sales; η is the part they don't explain, which here follows an AR(1) (see <a href="#arima">ARIMA</a>); ε is the truly new shock each week. Fitting both together (here by trying φ values and keeping the one with the smallest leftover error, the Cochrane–Orcutt idea) gives honest standard errors and better short-term forecasts.</p>
        </section>
        <section>
          <h2>Forecasting needs driver forecasts</h2>
          <ul>
            <li>Prices and promotions you set yourself: use the plan. That's the strength of driver models: they answer "what if".</li>
            <li>Weather: good for a week or so, then no better than the seasonal normal. Using the normal is honest, but the interval must include the weather's own spread.</li>
            <li>A driver you can't forecast (a competitor's price) may still help explain the past, but not predict the future.</li>
          </ul>
          <p>This is also how promotions, holidays and price enter <a href="#promo-regression">promotion models</a>. Driver effects can also be lagged (pre-buying before a price rise) or built with <a href="#dummies-interactions">dummies and interactions</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Look at the autocorrelation chart: plain regression's residuals have big bars at lags 1–3 (the error lingers); the dynamic model's innovations sit inside the bands.</li>
            <li>Compare the coefficient table: for temperature, which drifts slowly just like the error, plain regression reports a smaller standard error than the dynamic model. It's overconfident exactly where it matters. Price promotions jump around at random, so that bias doesn't apply to price.</li>
            <li>Switch to "Seasonal normal": the interval widens to include weather uncertainty. On the right-hand chart, once the weather forecast error passes about 3°C, the seasonal normal is as good as the forecast.</li>
            <li>Set φ to 0: the error no longer lingers, and plain regression and the dynamic model agree.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ phi: +$("#phi").value, wx: +$("#wx").value, ns: +$("#ns").value });
    const normT = (t) => 18 + 8 * Math.sin((2 * Math.PI * (t - 13)) / 52);
    let D;
    function sim(p) {
      const r = rng(seed); let a = 0, e = 0; D = [];
      for (let t = 0; t < N + H; t++) { a = 0.6 * a + 2.5 * r.normal(); const temp = normT(t) + a, price = r() < 0.2 ? 2.5 : 3; e = p.phi * e + p.ns * r.normal(); D.push({ t, temp, price, y: B0 + BT * temp + BP * (price - 3) + e, wxErr: r.normal() }); }
    }
    function lsq(X, y) {
      const k = X[0].length, A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0))), b = Array.from({ length: k }, (_, i) => X.reduce((s, r, n) => s + r[i] * y[n], 0));
      const M = A.map((r, i) => [...r, ...Array.from({ length: k }, (_, j) => +(i === j))]);
      for (let i = 0; i < k; i++) { let pv = i; for (let rr = i + 1; rr < k; rr++) if (Math.abs(M[rr][i]) > Math.abs(M[pv][i])) pv = rr; [M[i], M[pv]] = [M[pv], M[i]]; const d = M[i][i]; for (let c = 0; c < 2 * k; c++) M[i][c] /= d; for (let rr = 0; rr < k; rr++) if (rr !== i) { const f = M[rr][i]; for (let c = 0; c < 2 * k; c++) M[rr][c] -= f * M[i][c]; } }
      const Ai = M.map((r) => r.slice(k)), beta = Ai.map((r) => r.reduce((s, v, j) => s + v * b[j], 0)), res = y.map((v, n) => v - X[n].reduce((s, x, j) => s + x * beta[j], 0)), sse = res.reduce((s, v) => s + v * v, 0), s2 = sse / (y.length - k);
      return { beta, se: Ai.map((r, i) => Math.sqrt(r[i] * s2)), res, sse, s2 };
    }
    const xOf = (d, kind) => (kind === "ar" ? [1, Math.sin((2 * Math.PI * d.t) / 52), Math.cos((2 * Math.PI * d.t) / 52)] : [1, d.temp, d.price]);
    function fitModel(kind) {
      const tr = D.slice(0, N), X = tr.map((d) => xOf(d, kind)), y = tr.map((d) => d.y);
      if (kind === "ols") { const f = lsq(X, y); return { kind, beta: f.beta, se: f.se, phi: 0, res: f.res, innov: f.res, sig: Math.sqrt(f.s2) }; }
      let best = null;
      for (let ph = -0.2; ph <= 0.981; ph += 0.01) { const Xs = X.slice(1).map((r, i) => r.map((v, j) => v - ph * X[i][j])), ys = y.slice(1).map((v, i) => v - ph * y[i]), f = lsq(Xs, ys); if (!best || f.sse < best.f.sse) best = { ph, f }; }
      const beta = best.f.beta, res = y.map((v, n) => v - X[n].reduce((s, x, j) => s + x * beta[j], 0)), innov = res.slice(1).map((v, i) => v - best.ph * res[i]);
      return { kind, beta, se: best.f.se, phi: best.ph, res, innov, sig: Math.sqrt(best.f.s2) };
    }
    const tempVar = () => { const a = D.slice(0, N).map((d) => d.temp - normT(d.t)), m = a.reduce((s, v) => s + v, 0) / N; return a.reduce((s, v) => s + (v - m) ** 2, 0) / (N - 1); };
    function forecast(F, p, mode = fut, wxsd = p.wx, errs = null) {
      const last = F.res[N - 1], tv = tempVar(), out = [];
      for (let h = 1; h <= H; h++) { const d = D[N - 1 + h], e = errs ? errs[h - 1] : d.wxErr, tf = mode === "wx" ? d.temp + wxsd * Math.sqrt(Math.min(1, h / 4)) * e : normT(d.t);
        const x = F.kind === "ar" ? xOf(d, "ar") : [1, tf, d.price], mean = x.reduce((s, v, j) => s + v * F.beta[j], 0) + Math.pow(F.phi, h) * last;
        let v = F.sig * F.sig * (F.phi ? (1 - Math.pow(F.phi, 2 * h)) / (1 - F.phi * F.phi) : 1); if (F.kind !== "ar") v += F.beta[1] ** 2 * (mode === "wx" ? wxsd * wxsd * Math.min(1, h / 4) : tv);
        out.push({ h, t: d.t, mean, sd: Math.sqrt(v), act: d.y, tf }); }
      return out;
    }
    const acf = (x) => { const n = x.length, m = x.reduce((s, v) => s + v, 0) / n, c0 = x.reduce((s, v) => s + (v - m) ** 2, 0); return Array.from({ length: LAGS }, (_, k) => { let s = 0; for (let i = k + 1; i < n; i++) s += (x[i] - m) * (x[i - k - 1] - m); return s / c0; }); };
    let FIT, FC;
    const C1 = new Plot($("#c1"), { pad: { l: 56, b: 38 } }), C2 = new Plot($("#c2"), { pad: { l: 50, b: 38 } }), C3 = new Plot($("#c3"), { pad: { l: 56, b: 38 } });
    const sw = (c, t, k) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">${k === "box" ? `<span style="width:12px;height:10px;background:var(${c});opacity:.4"></span>` : k === "dot" ? `<span style="width:8px;height:8px;border-radius:50%;background:var(${c})"></span>` : `<span style="width:20px;border-top:2px ${k} var(${c})"></span>`}${t}</span>`;
    function d1(p) {
      const F = FIT[meth], fc = FC[meth], col = css(MS.find((m) => m[0] === meth)[2]), from = N - 52, hist = D.slice(from, N);
      const one = hist.map((d, i) => (i ? d.y - F.res[from + i] + F.phi * F.res[from + i - 1] : null));
      const ys = D.slice(from).map((d) => d.y).concat(fc.map((f) => f.mean + 1.96 * f.sd), fc.map((f) => f.mean - 1.96 * f.sd));
      C1.resize(); C1.x = [from, N + H]; C1.y = [Math.min(...ys) * 0.95, Math.max(...ys) * 1.03]; C1.clear(); C1.axes({ xLabel: "week", yLabel: "units", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const g = C1.ctx; g.fillStyle = css("--line"); g.globalAlpha = 0.35; g.fillRect(C1.sx(N - 0.5), C1.pad.t, C1.sx(N + H) - C1.sx(N - 0.5), C1.ih); g.globalAlpha = 1;
      C1.clip(() => { g.beginPath(); fc.forEach((f, i) => (i ? g.lineTo : g.moveTo).call(g, C1.sx(f.t), C1.sy(f.mean + 1.96 * f.sd))); [...fc].reverse().forEach((f) => g.lineTo(C1.sx(f.t), C1.sy(f.mean - 1.96 * f.sd))); g.closePath(); g.fillStyle = col; g.globalAlpha = 0.16; g.fill(); g.globalAlpha = 1; });
      C1.path(D.slice(from).map((d) => d.t), D.slice(from).map((d) => d.y), css("--muted"), 1.2);
      D.slice(from).forEach((d) => { if (d.price < 3) C1.dot(d.t, d.y, 2.6, css("--ink"), css("--ink")); });
      C1.path(hist.map((d) => d.t).slice(1), one.slice(1), col, 1.6);
      C1.path([N - 1, ...fc.map((f) => f.t)], [D[N - 1].y, ...fc.map((f) => f.mean)], col, 2.2, [5, 3]);
      const err = Math.sqrt(fc.reduce((s, f) => s + (f.act - f.mean) ** 2, 0) / H);
      $("#c1Cap").innerHTML = `${sw("--muted", "actual sales", "solid")}${sw(MS.find((m) => m[0] === meth)[2], "one-week-ahead fit", "solid")}${sw(MS.find((m) => m[0] === meth)[2], "forecast, 95% band", "dashed")}${sw("--ink", "promotion week", "dot")}<br>Shaded: the 12 weeks being forecast (actuals shown for checking). Forecast error (RMSE) over those weeks: <b>${fmt(err, 1)}</b>. Last week's sales were ${fmt(F.res[N - 1], 0)} ${F.res[N - 1] >= 0 ? "above" : "from"} the driver-only model${F.phi ? `; the error part adds ${fmt(F.phi * F.res[N - 1], 0)} to next week, fading by ×${fmt(F.phi, 2)} each week` : ", which plain regression ignores"}.`;
    }
    function d2() {
      const a = acf(FIT.ols.res), b = acf(FIT.dyn.innov), band = 2 / Math.sqrt(N), m = Math.max(0.3, ...a.map(Math.abs), ...b.map(Math.abs)) * 1.1;
      C2.resize(); C2.x = [0.3, LAGS + 0.7]; C2.y = [-m, m]; C2.clear(); C2.axes({ xLabel: "lag (weeks)", yLabel: "autocorrelation", xTicks: Array.from({ length: LAGS }, (_, i) => i + 1), xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 1) });
      const g = C2.ctx; g.fillStyle = css("--line"); g.globalAlpha = 0.5; g.fillRect(C2.sx(0.3), C2.sy(band), C2.sx(LAGS + 0.7) - C2.sx(0.3), C2.sy(-band) - C2.sy(band)); g.globalAlpha = 1; C2.path([0.3, LAGS + 0.7], [0, 0], css("--ink"), 1);
      const w = (C2.sx(1) - C2.sx(0)) * 0.3; a.forEach((v, i) => { g.fillStyle = css("--violet"); g.fillRect(C2.sx(i + 1) - w - 1, Math.min(C2.sy(0), C2.sy(v)), w, Math.abs(C2.sy(v) - C2.sy(0))); }); b.forEach((v, i) => { g.fillStyle = css("--accent"); g.fillRect(C2.sx(i + 1) + 1, Math.min(C2.sy(0), C2.sy(v)), w, Math.abs(C2.sy(v) - C2.sy(0))); });
      const lb = (x) => x.reduce((s, r, k) => s + (r * r) / (N - k - 1), 0) * N * (N + 2), q1 = lb(a.slice(0, 10)), q2 = lb(b.slice(0, 10));
      $("#c2Cap").innerHTML = `${sw("--violet", "plain regression residuals", "box")}${sw("--accent", "dynamic model innovations", "box")}<br>Grey band: ±2/√n = ±${fmt(band, 2)}, roughly what pure noise stays inside. Ljung–Box Q over 10 lags: ${fmt(q1, 0)} vs ${fmt(q2, 0)} (above ~18 means leftover pattern at the 5% level).`;
    }
    function d3(p) {
      const sds = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5], R = rng(77), draws = Array.from({ length: 40 }, () => Array.from({ length: H }, () => R.normal()));
      const rm = (F, mode, s) => { let t = 0; draws.forEach((e) => { const fc = forecast(F, p, mode, s, e); t += fc.reduce((a, f) => a + (f.act - f.mean) ** 2, 0) / H; }); return Math.sqrt(t / draws.length); };
      const dyn = sds.map((s) => rm(FIT.dyn, "wx", s)), norm = rm(FIT.dyn, "norm"), ar = rm(FIT.ar, "wx"), ols = sds.map((s) => rm(FIT.ols, "wx", s)), all = [...dyn, ...ols, norm, ar];
      C3.resize(); C3.x = [0, 5]; C3.y = [0, Math.max(...all) * 1.15]; C3.clear(); C3.axes({ xLabel: "weather forecast error SD (°C)", yLabel: "12-week RMSE", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      C3.path([0, 5], [norm, norm], css("--accent"), 1.4, [2, 3]); C3.path([0, 5], [ar, ar], css("--warm"), 1.6, [5, 4]); C3.path(sds, ols, css("--violet"), 1.8); C3.path(sds, dyn, css("--accent"), 2.2);
      C3.dot(p.wx, rm(FIT.dyn, "wx", p.wx), 5, css("--accent"), css("--ink"));
      const cross = sds.find((s, i) => dyn[i] >= norm);
      $("#c3Cap").innerHTML = `${sw("--accent", "dynamic, weather forecast", "solid")}${sw("--violet", "plain, weather forecast", "solid")}${sw("--accent", "dynamic, seasonal normal", "dotted")}${sw("--warm", "no drivers", "dashed")}<br>Averaged over 40 draws of weather-forecast error, with the error growing over the first 4 weeks. ${cross !== undefined ? `From about ${cross}°C of forecast error, the seasonal normal does as well.` : "Across this range the weather forecast beats the seasonal normal."}`;
    }
    function tbl() {
      const names = ["Intercept", "Temperature (per °C)", "Price (per $1)"], T = [B0 - 3 * BP, BT, BP];
      const cell = (F, i) => { return `<td style="padding:3px 6px">${fmt(F.beta[i], 1)}</td><td style="padding:3px 6px">${fmt(F.se[i], 1)}</td>`; };
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);width:100%;min-width:560px"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 6px;text-align:left">term</th><th style="padding:3px 6px">true</th><th style="padding:3px 6px">plain: estimate</th><th style="padding:3px 6px">std error</th><th style="padding:3px 6px">dynamic: estimate</th><th style="padding:3px 6px">std error</th></tr></thead><tbody>` +
        names.map((n, i) => `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 6px;text-align:left;font-family:var(--font-body)">${n}</td><td style="padding:3px 6px;color:var(--muted)">${T[i]}</td>${cell(FIT.ols, i)}${cell(FIT.dyn, i)}</tr>`).join("") +
        `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 6px;text-align:left;font-family:var(--font-body)">Error carry-over φ</td><td style="padding:3px 6px;color:var(--muted)">${$("#phi").value}</td><td style="padding:3px 6px">(assumed 0)</td><td></td><td style="padding:3px 6px">${fmt(FIT.dyn.phi, 2)}</td><td></td></tr></tbody></table>
        <p class="hint" style="margin:8px 0 0">Price per $1: a $0.50 promotion adds about ${fmt(-FIT.dyn.beta[2] * 0.5, 0)} units. The plain regression's standard error on temperature is ${fmt(FIT.ols.se[1], 2)} vs ${fmt(FIT.dyn.se[1], 2)} for the dynamic model: ${FIT.ols.se[1] < FIT.dyn.se[1] ? "plain regression claims more certainty than the data support." : "close, because the error barely lingers."}</p>`;
    }
    function readouts(p) {
      const F = FIT[meth], fc = FC[meth];
      $("#ro").innerHTML = [["Estimated φ", fmt(F.phi, 2)], ["Next week's forecast", `${fmt(fc[0].mean, 0)} ± ${fmt(1.96 * fc[0].sd, 0)}`], ["12-week forecast RMSE", fmt(Math.sqrt(fc.reduce((s, f) => s + (f.act - f.mean) ** 2, 0) / H), 1)]].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function labels(p) { $("#phiV").textContent = fmt(p.phi, 2); $("#wxV").textContent = fmt(p.wx, 2); $("#nsV").textContent = p.ns; }
    function refit() { FIT = { ols: fitModel("ols"), dyn: fitModel("dyn"), ar: fitModel("ar") }; }
    function draw() { const p = P(); labels(p); FC = Object.fromEntries(MS.map(([k]) => [k, forecast(FIT[k], p)])); d1(p); d2(); d3(p); tbl(); readouts(p); }
    ["phi", "ns"].forEach((id) => $("#" + id).addEventListener("input", () => { sim(P()); refit(); draw(); }));
    $("#wx").addEventListener("input", draw);
    $("#ms").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; meth = b.dataset.m; $("#ms").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    $("#fs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; fut = b.dataset.f; $("#fs").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    $("#resim").addEventListener("click", () => { seed++; sim(P()); refit(); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 6; meth = "dyn"; fut = "wx"; $("#ms").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.m === meth)); $("#fs").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.f === fut)); sim(P()); refit(); draw(); });
    sim(P()); refit(); draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
