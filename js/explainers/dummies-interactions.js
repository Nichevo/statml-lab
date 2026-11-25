Lab.register({
  id: "dummies-interactions",
  group: "Regression",
  title: "Dummy variables and interactions: seasons, promotions and holidays in a regression",
  blurb: "Turn categories like quarter, promotion and holiday into 0/1 columns, read what each coefficient means, see why one quarter must be left out, and find out when a promotion works better in a holiday week.",
  lede: "Regression needs numbers, but many drivers are categories: which quarter, promoted or not, holiday or not. A dummy variable is a column that is 1 when the category applies and 0 otherwise. Its coefficient is the average difference from the baseline, holding the other drivers fixed. An interaction is the product of two columns: it lets the effect of one driver depend on another, such as a promotion that lifts sales more in holiday weeks.",
  quiz: [
    ["You have four quarters. Why use only three quarter dummies alongside the intercept?", "The four dummies always add up to 1, which is exactly the intercept column. The regression can't separate them (perfect collinearity: the dummy variable trap). Drop one quarter; it becomes the baseline the others are compared with."],
    ["The coefficient on Q3 is +118 with Q1 as the baseline. What does that mean?", "Q3 weeks sell about 118 more than Q1 weeks, with trend, promotion and holiday held the same."],
    ["What does an interaction term promo × holiday measure?", "The extra lift a promotion gets in a holiday week, on top of the promotion's normal lift and the holiday's normal lift. If it's zero, the two effects simply add."],
    ["With an interaction in the model, what's the total lift from a promotion in a holiday week?", "The promo coefficient plus the interaction coefficient. The promo coefficient alone is now the lift in non-holiday weeks."],
    ["You leave out a real interaction. Where does it show up?", "In the residuals for the promo-and-holiday weeks: they're consistently positive (the model under-forecasts them), and the promo and holiday coefficients absorb part of the missing effect."],
  ],
  diy: {
    intro: "Weekly sales in B2:B157, week number in C, quarter (1–4) in D, promo flag (0/1) in E, holiday flag (0/1) in F.",
    steps: [
      ["Quarter dummies, leaving Q1 out as the baseline.", "G2: =--($D2=2)   H2: =--($D2=3)   I2: =--($D2=4)"],
      ["Interaction column.", "J2: =E2*F2"],
      ["Fit all coefficients at once (put the X columns next to each other: C, E:J).", "=LINEST(B2:B157, C2:J157, TRUE, TRUE)   (select 5 rows × 8 columns, enter as an array)"],
      ["Or use Data ▸ Data Analysis ▸ Regression for a labelled table with standard errors and p-values.", ""],
      ["Forecast one week, e.g. week 160, Q4, promoted, holiday.", "=b0 + b_week*160 + b_Q4 + b_promo + b_holiday + b_promo×holiday"],
    ],
  },
  deeper: [
    ["James, Witten, Hastie & Tibshirani, An Introduction to Statistical Learning, section 3.3", "https://www.statlearning.com/", "qualitative predictors and interaction terms, free PDF"],
    ["Hyndman & Athanasopoulos, Forecasting: Principles and Practice (3rd ed.), section 7.4", "https://otexts.com/fpp3/useful-predictors.html", "trend, seasonal dummies, intervention and holiday variables for forecasting"],
    ["Brambor, Clark & Golder (2006), Understanding interaction models: improving empirical analyses, Political Analysis 14(1)", "https://doi.org/10.1093/pan/mpi014", "common mistakes when reading interaction terms"],
    ["Suits (1957), Use of dummy variables in regression equations, Journal of the American Statistical Association 52(280)", "https://doi.org/10.1080/01621459.1957.10501412", "the early paper on dummy variables and how to read them"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 52 L88 40" stroke-opacity=".5"/><path d="M8 40 L88 28" stroke-opacity=".5"/><path d="M8 34 L88 6"/><circle cx="20" cy="50" r="2.5" fill="currentColor"/><circle cx="40" cy="46" r="2.5" fill="currentColor"/><circle cx="60" cy="43" r="2.5" fill="currentColor"/><circle cx="30" cy="30" r="2.5"/><circle cx="56" cy="20" r="2.5"/><circle cx="78" cy="11" r="2.5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, ptTwo } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const N = 156, SEAS = [0, 60, 120, 30], HOL = [1, 13, 26, 39, 47, 51];
    const TERMS = [["trend", "Trend (week number)"], ["qtr", "Quarter dummies (Q2, Q3, Q4)"], ["promo", "Promotion"], ["hol", "Holiday"], ["int", "Promotion × holiday"], ["trap", "All four quarters + intercept (the trap)"]];
    let seed = 2, on = { trend: true, qtr: true, promo: true, hol: true, int: true, trap: false };
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("Three years of weekly sales, actual and fitted")}</div><canvas id="c1" style="height:280px" aria-label="Weekly sales with the regression's fitted values"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "Does the promotion work better in holidays?", 260, "Interaction plot of average sales by promotion and holiday"), fig("c3", "Leftover error by type of week", 260, "Residuals grouped by promotion and holiday"))}
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4("Coefficients")}<div id="coef"></div></div>
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4("What the regression sees: the first rows of X")}<div id="xm"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Simulated weekly sales: base 500, +1 a week trend, quarter effects Q2 +60, Q3 +120, Q4 +30, promotions +150, ${HOL.length} holiday weeks a year +80.</p>
        <div class="ctrl"><label>Terms in the model</label><div id="terms" style="display:grid;gap:6px">${TERMS.map(([k, n]) => `<label style="display:flex;gap:8px;align-items:center;font-size:.9rem"><input type="checkbox" data-t="${k}" ${on[k] ? "checked" : ""}> ${n}</label>`).join("")}</div></div>
        <div class="ctrl"><label for="ix">True extra lift when a promotion falls in a holiday week <output id="ixV"></output></label><input type="range" id="ix" min="0" max="300" step="10" value="120"></div>
        <div class="ctrl"><label for="pf">Share of weeks promoted <output id="pfV"></output></label><input type="range" id="pf" min="0.1" max="0.5" step="0.05" value="0.25"></div>
        <div class="ctrl"><label for="ns">Noise SD <output id="nsV"></output></label><input type="range" id="ns" min="5" max="120" step="5" value="40"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New data</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Reading dummy coefficients</h2>
          <ul>
            <li>The <b>intercept</b> is the prediction for the baseline: week 0, Q1, no promotion, no holiday.</li>
            <li>A <b>quarter dummy</b> is the difference from Q1, not from the average. Change the baseline and every quarter coefficient changes, but the fitted values don't.</li>
            <li>A <b>promotion dummy</b> is the average lift of a promoted week over an otherwise identical unpromoted one. Its standard error tells you how precisely the data pin it down.</li>
          </ul>
        </section>
        <section>
          <h2>Interactions</h2>
          <p>Without an interaction, the model assumes effects add: promotion lift + holiday lift. With promo × holiday, the promotion's lift can differ in holiday weeks. On the interaction plot, parallel lines mean no interaction; lines that spread apart mean the effect of one depends on the other. Once an interaction is in, the promo coefficient alone is the lift in non-holiday weeks only.</p>
          <p>Interactions multiply quickly: four quarters × promotion × holiday is many columns, each estimated from fewer weeks. Add them where there's a business reason, and check the standard errors. The same idea drives <a href="#promo-regression">promotion and cannibalisation models</a> and the features fed to <a href="#global-forecasting">global ML forecasts</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Untick "Promotion × holiday": the promo-and-holiday weeks' errors in the right-hand chart sit well above zero, and the promotion and holiday coefficients grow to soak up part of the missing lift.</li>
            <li>Tick "All four quarters + intercept": the regression can't be solved. The four dummy columns add up to the intercept column, so there's no unique answer.</li>
            <li>Set the true extra lift to 0: the interaction's estimate hovers near zero and its p-value is usually large. Then the simpler model is better.</li>
            <li>Untick the quarter dummies: R² drops, and the residuals swing with the seasons (look at the top chart).</li>
          </ul>
        </section>`,
    });
    const P = () => ({ ix: +$("#ix").value, pf: +$("#pf").value, ns: +$("#ns").value });
    let D;
    function sim(p) {
      const r = rng(seed); D = [];
      for (let t = 0; t < N; t++) { const wk = t + 1, q = Math.floor((t % 52) / 13), hol = HOL.includes(t % 52) ? 1 : 0, pr = r() < p.pf ? 1 : 0;
        D.push({ wk, q, hol, pr, y: 500 + wk + SEAS[q] + 150 * pr + 80 * hol + p.ix * pr * hol + p.ns * r.normal() }); }
    }
    function cols() {
      const C = [["Intercept", () => 1]];
      if (on.trend) C.push(["Week", (d) => d.wk]);
      if (on.trap) C.push(["Q1", (d) => +(d.q === 0)]);
      if (on.qtr || on.trap) { C.push(["Q2", (d) => +(d.q === 1)], ["Q3", (d) => +(d.q === 2)], ["Q4", (d) => +(d.q === 3)]); }
      if (on.promo) C.push(["Promo", (d) => d.pr]);
      if (on.hol) C.push(["Holiday", (d) => d.hol]);
      if (on.int) C.push(["Promo × holiday", (d) => d.pr * d.hol]);
      return C;
    }
    function inv(A) {
      const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => +(i === j))]), scale = Math.max(...A.map((r, i) => Math.abs(r[i]))) || 1;
      for (let i = 0; i < n; i++) { let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r; if (Math.abs(M[p][i]) < 1e-9 * scale) return null; [M[i], M[p]] = [M[p], M[i]]; const d = M[i][i]; for (let c = 0; c < 2 * n; c++) M[i][c] /= d; for (let r = 0; r < n; r++) if (r !== i) { const f = M[r][i]; if (f) for (let c = 0; c < 2 * n; c++) M[r][c] -= f * M[i][c]; } }
      return M.map((r) => r.slice(n));
    }
    function fit() {
      const C = cols(), X = D.map((d) => C.map(([, f]) => f(d))), y = D.map((d) => d.y), k = C.length;
      const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0))), Xty = Array.from({ length: k }, (_, i) => X.reduce((s, r, n) => s + r[i] * y[n], 0));
      const Ai = inv(XtX); if (!Ai) return { C, X, fail: true };
      const b = Ai.map((r) => r.reduce((s, v, j) => s + v * Xty[j], 0)), yh = X.map((r) => r.reduce((s, v, j) => s + v * b[j], 0)), res = y.map((v, i) => v - yh[i]);
      const sse = res.reduce((s, v) => s + v * v, 0), my = y.reduce((s, v) => s + v, 0) / N, sst = y.reduce((s, v) => s + (v - my) ** 2, 0), df = N - k, s2 = sse / df;
      const se = Ai.map((r, i) => Math.sqrt(Math.max(0, r[i] * s2)));
      return { C, X, b, se, yh, res, r2: 1 - sse / sst, ar2: 1 - (sse / df) / (sst / (N - 1)), rmse: Math.sqrt(sse / N), df };
    }
    let F;
    const C1 = new Plot($("#c1"), { pad: { l: 56, b: 38 } }), C2 = new Plot($("#c2"), { pad: { l: 56, b: 38, r: 90 } }), C3 = new Plot($("#c3"), { pad: { l: 56, b: 50 } });
    const sw = (c, t, k) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">${k === "dot" ? `<span style="width:7px;height:7px;border-radius:50%;background:var(${c})"></span>` : `<span style="width:20px;border-top:2px ${k} var(${c})"></span>`}${t}</span>`;
    function d1() {
      const ys = D.map((d) => d.y); C1.resize(); C1.x = [0, N + 1]; C1.y = [Math.min(...ys) * 0.92, Math.max(...ys) * 1.05]; C1.clear(); C1.axes({ xLabel: "week", yLabel: "units", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const g = C1.ctx; g.fillStyle = css("--warm"); g.globalAlpha = 0.12; D.forEach((d) => { if (d.hol) g.fillRect(C1.sx(d.wk - 0.5), C1.pad.t, C1.sx(1) - C1.sx(0), C1.ih); }); g.globalAlpha = 1;
      C1.path(D.map((d) => d.wk), ys, css("--muted"), 1);
      if (!F.fail) C1.path(D.map((d) => d.wk), F.yh, css("--accent"), 1.8);
      D.forEach((d) => C1.dot(d.wk, d.y, d.pr ? 3 : 2, css(d.pr ? "--ink" : "--surface"), css(d.pr ? "--ink" : "--muted")));
      $("#c1Cap").innerHTML = `${sw("--muted", "actual", "solid")}${sw("--accent", "fitted", "solid")}${sw("--ink", "promoted week", "dot")}<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:12px;height:10px;background:var(--warm);opacity:.3"></span>holiday week</span><br>${F.fail ? "<b style='color:var(--bad)'>No fit: the columns are perfectly collinear.</b>" : `R² = ${fmt(F.r2, 3)}, typical error (RMSE) ${fmt(F.rmse, 1)} units.`}`;
    }
    function groups() { const G = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([pr, hol]) => ({ pr, hol, idx: D.map((d, i) => (d.pr === pr && d.hol === hol ? i : -1)).filter((i) => i >= 0) })); return G; }
    function d2() {
      // remove the fitted trend and quarter effects (when the model has them) so the four groups compare like with like
      const bi = (n) => { if (F.fail) return 0; const i = F.C.findIndex((c) => c[0] === n); return i >= 0 ? F.b[i] : 0; };
      const G = groups(), adj = D.map((d) => d.y - bi("Week") * d.wk - (d.q ? bi("Q" + (d.q + 1)) : 0)), m = (idx) => idx.reduce((s, i) => s + adj[i], 0) / Math.max(1, idx.length);
      const pts = G.map((g) => ({ ...g, v: m(g.idx), n: g.idx.length }));
      const vs = pts.map((p) => p.v); C2.resize(); C2.x = [-0.3, 1.3]; C2.y = [Math.min(...vs) - 60, Math.max(...vs) + 60]; C2.clear();
      C2.axes({ xLabel: "", xTicks: [0, 1], xFormat: (v) => (v ? "promoted" : "not promoted"), yLabel: "avg sales, fitted trend & season removed", yFormat: (v) => fmt(v, 0) });
      const g = C2.ctx;
      [[0, "--muted", "normal week"], [1, "--warm", "holiday week"]].forEach(([h, c, lab]) => { const a = pts.find((p) => p.hol === h && !p.pr), b2 = pts.find((p) => p.hol === h && p.pr); C2.path([0, 1], [a.v, b2.v], css(c), 2.2); C2.dot(0, a.v, 4, css(c), css(c)); C2.dot(1, b2.v, 4, css(c), css(c));
        g.fillStyle = css(c); g.font = `600 11px ${css("--font-body")}`; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(lab, C2.sx(1) + 10, C2.sy(b2.v)); g.font = `10px ${css("--font-mono")}`; g.fillText(`+${fmt(b2.v - a.v, 0)}`, C2.sx(1) + 10, C2.sy(b2.v) + 13); });
      const l0 = pts[1].v - pts[0].v, l1 = pts[3].v - pts[2].v;
      $("#c2Cap").innerHTML = `Promotion lift: +${fmt(l0, 0)} in normal weeks, +${fmt(l1, 0)} in holiday weeks (from ${pts[3].n} promoted holiday weeks). The gap, ${fmt(l1 - l0, 0)}, is what the interaction term estimates. Parallel lines would mean no interaction.`;
    }
    function d3() {
      C3.resize(); C3.clear(); const G = groups(), names = ["neither", "promo", "holiday", "both"];
      if (F.fail) { C3.x = [0, 1]; C3.y = [0, 1]; $("#c3Cap").textContent = "No fit, so no residuals."; return; }
      const rr = F.res, m = Math.max(...rr.map(Math.abs)) * 1.1;
      C3.x = [-0.5, 3.5]; C3.y = [-m, m]; C3.axes({ xTicks: [0, 1, 2, 3], xFormat: (v) => names[v] || "", yLabel: "actual − fitted", yFormat: (v) => fmt(v, 0) });
      C3.path([-0.5, 3.5], [0, 0], css("--ink"), 1);
      const r = rng(5); G.forEach((g, k) => { g.idx.forEach((i) => C3.dot(k + (r() - 0.5) * 0.4, rr[i], 2.5, css(k === 3 ? "--warm" : "--muted"), css(k === 3 ? "--warm" : "--muted"))); const mean = g.idx.reduce((s, i) => s + rr[i], 0) / Math.max(1, g.idx.length); C3.path([k - 0.3, k + 0.3], [mean, mean], css("--accent"), 2.5); });
      const mPH = G[3].idx.reduce((s, i) => s + rr[i], 0) / Math.max(1, G[3].idx.length);
      $("#c3Cap").innerHTML = `Blue bars: average error in each group. In promoted holiday weeks the model is off by ${fmt(mPH, 0)} on average${Math.abs(mPH) > 25 ? ` <b>— a sign of a missing term</b>` : ""}.`;
    }
    const meaning = (n, b) => ({ Intercept: `baseline prediction: week 0, Q1, no promo, no holiday`, Week: `${b >= 0 ? "+" : ""}${fmt(b, 2)} units a week of trend`, Q1: "Q1 vs …?", Q2: `Q2 weeks vs Q1 weeks`, Q3: `Q3 weeks vs Q1 weeks`, Q4: `Q4 weeks vs Q1 weeks`, Promo: on.int ? "lift from a promotion in a normal week" : "lift from a promotion (any week)", Holiday: on.int ? "lift from a holiday with no promotion" : "lift from a holiday week", "Promo × holiday": "extra promotion lift in a holiday week" })[n];
    const truth = (p) => ({ Intercept: 500, Week: 1, Q2: 60, Q3: 120, Q4: 30, Promo: 150, Holiday: 80, "Promo × holiday": p.ix });
    function coef(p) {
      if (F.fail) { $("#coef").innerHTML = `<p style="margin:0;color:var(--bad)"><b>The dummy variable trap.</b> Q1 + Q2 + Q3 + Q4 = 1 in every row, exactly the intercept column, so XᵀX can't be inverted and there's no unique answer: add 100 to the intercept and take 100 off every quarter and the fit is identical. Drop one quarter (or the intercept).</p>`; return; }
      const T = truth(p);
      $("#coef").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);width:100%;min-width:560px"><thead><tr style="color:var(--muted);text-align:right">${["term", "estimate", "std error", "p-value", "true value", "meaning"].map((h, i) => `<th style="padding:3px 6px;${i === 0 || i === 5 ? "text-align:left" : ""}">${h}</th>`).join("")}</tr></thead><tbody>` +
        F.C.map(([n], i) => { const t = F.b[i] / F.se[i], pv = ptTwo(Math.abs(t), F.df); return `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 6px;text-align:left;font-family:var(--font-body);white-space:nowrap">${n}</td><td style="padding:3px 6px">${fmt(F.b[i], n === "Week" ? 2 : 1)}</td><td style="padding:3px 6px">${fmt(F.se[i], n === "Week" ? 2 : 1)}</td><td style="padding:3px 6px"><span class="pill ${pv < 0.05 ? "ok" : "warn"}">${pv < 0.001 ? "<0.001" : fmt(pv, 3)}</span></td><td style="padding:3px 6px;color:var(--muted)">${T[n] ?? "–"}</td><td style="padding:3px 6px;text-align:left;font-family:var(--font-body)">${meaning(n, F.b[i])}</td></tr>`; }).join("") + `</tbody></table>`;
    }
    function xm() {
      const rows = [0, 1, 12, 13, 26, 27, 38, 39], C = F.C;
      $("#xm").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);width:100%;min-width:520px"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 6px;text-align:left">week</th><th style="padding:3px 6px">sales</th>${C.map(([n]) => `<th style="padding:3px 6px">${n.replace("Promo × holiday", "P×H")}</th>`).join("")}</tr></thead><tbody>` +
        rows.map((i) => `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 6px;text-align:left">${D[i].wk}</td><td style="padding:3px 6px">${fmt(D[i].y, 0)}</td>${C.map(([, f]) => { const v = f(D[i]); return `<td style="padding:3px 6px;${v === 1 ? "color:var(--accent);font-weight:600" : v === 0 ? "color:var(--muted)" : ""}">${v}</td>`; }).join("")}</tr>`).join("") +
        `</tbody></table><p class="hint" style="margin:8px 0 0">Each category becomes a column of 0s and 1s. ${on.trap ? "With Q1 added, Q1 + Q2 + Q3 + Q4 is 1 in every row: the same as the intercept column." : "Q1 has no column: it's the baseline, a week with 0 in Q2, Q3 and Q4."}</p>`;
    }
    function readouts(p) {
      if (F.fail) { $("#ro").innerHTML = `<div class="ro"><b>Model</b><span class="pill bad">cannot be fitted</span></div>`; return; }
      const idx = (n) => F.C.findIndex((c) => c[0] === n), b = (n) => (idx(n) >= 0 ? F.b[idx(n)] : 0), wk = 160;
      const pred = b("Intercept") + b("Week") * wk + b("Q4") + b("Promo") + b("Holiday") + b("Promo × holiday"), tru = 500 + wk + 30 + 150 + 80 + p.ix;
      $("#ro").innerHTML = [["R² / adjusted R²", `${fmt(F.r2, 3)} / ${fmt(F.ar2, 3)}`], ["RMSE", fmt(F.rmse, 1)], ["Forecast: week 160, Q4, promo + holiday", `${fmt(pred, 0)} (true mean ${fmt(tru, 0)})`]].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function labels(p) { $("#ixV").textContent = "+" + p.ix; $("#pfV").textContent = fmt(p.pf * 100, 0) + "%"; $("#nsV").textContent = p.ns; }
    function draw() { const p = P(); labels(p); F = fit(); d1(); d2(); d3(); coef(p); xm(); readouts(p); }
    $("#terms").addEventListener("change", (e) => { const k = e.target.dataset.t; if (!k) return; on[k] = e.target.checked; draw(); });
    ["ix", "pf", "ns"].forEach((id) => $("#" + id).addEventListener("input", () => { sim(P()); draw(); }));
    $("#resim").addEventListener("click", () => { seed++; sim(P()); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); on = { trend: true, qtr: true, promo: true, hol: true, int: true, trap: false }; $("#terms").querySelectorAll("input").forEach((i) => (i.checked = on[i.dataset.t])); seed = 2; sim(P()); draw(); });
    sim(P()); draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
