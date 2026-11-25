Lab.register({
  id: "feature-engineering",
  group: "Machine learning",
  title: "Feature engineering and data leakage",
  blurb: "Turn weekly sales history into lags, rolling averages, promo and calendar features, and watch the forecast improve. Then switch on a “leaky” feature: the test score looks brilliant and the live forecast falls apart.",
  lede: "Models only see the columns you give them. Most of the accuracy in a demand model comes from good features: last week's sales, the same week last year, a rolling average, whether a promotion is planned. But every feature must be something you would really know at the moment you make the forecast. Use anything from the future, even by accident, and the back-test lies. That's data leakage, and it's the most common reason a model that tested well fails in use.",
  quiz: [
    ["Why is “this week's store traffic” a leaky feature for forecasting this week's sales?", "You only know this week's traffic after the week has happened, at the same time as the sales. In a back-test it's available and very predictive; at forecast time it isn't. Use a traffic forecast or last week's traffic instead."],
    ["A rolling 4-week average includes the current week. What's wrong?", "It contains the target itself. The model learns to read the answer from the feature. Rolling features must end at the last week you'd actually have: weeks t−1 to t−4."],
    ["Why test time-series models on the most recent weeks, not a random sample of weeks?", "A random split puts weeks on both sides of each test week into training, so the model sees the neighbourhood of the answer. A time-ordered hold-out (or rolling-origin back-test) matches how forecasts are really used."],
    ["Planned promotions are fine to use, but actual promo uplift isn't. Why?", "The promo calendar is decided weeks in advance, so it's known at forecast time. The uplift is measured from the sales you're trying to predict."],
    ["What's a good test for leakage?", "For every feature ask “would I have this value, at this accuracy, at the time I make the forecast?”. Then check: if one feature makes accuracy suspiciously good, or test accuracy is much better than live accuracy, suspect leakage."],
  ],
  diy: {
    intro: "Weekly sales in B2:B157 (week 1 in row 2), promo flag in C, price in D. Features go in new columns, each using only rows above the current one.",
    steps: [
      ["Lag 1 (last week's sales).", "E3: =B2"],
      ["Lag 52 (same week last year).", "F54: =B2"],
      ["Rolling 4-week average of past weeks only (not including this week).", "G6: =AVERAGE(B2:B5)"],
      ["Seasonal shape with two Fourier terms (week number in A).", "H2: =SIN(2*PI()*A2/52)   I2: =COS(2*PI()*A2/52)"],
      ["Fit on weeks 53–104, test on 105–156.", "=LINEST(B54:B105, E54:I105, TRUE, TRUE)"],
      ["Leakage check: a rolling average that includes this week. Don't do this.", "Wrong: =AVERAGE(B3:B6) in row 6   Right: =AVERAGE(B2:B5)"],
    ],
  },
  deeper: [
    ["Kaufman, Rosset, Perlich & Stitelman (2012), Leakage in data mining: formulation, detection, and avoidance, ACM TKDD 6(4)", "https://doi.org/10.1145/2382577.2382579", "the standard paper on leakage"],
    ["Kapoor & Narayanan (2023), Leakage and the reproducibility crisis in machine-learning-based science, Patterns 4(9)", "https://doi.org/10.1016/j.patter.2023.100804", "leakage found in hundreds of published studies"],
    ["Hyndman & Athanasopoulos, Forecasting: Principles and Practice (3rd ed.), §7.4 Some useful predictors", "https://otexts.com/fpp3/useful-predictors.html", "trend, dummies, Fourier terms, lags"],
    ["Bergmeir & Benítez (2012), On the use of cross-validation for time series predictor evaluation, Information Sciences 191", "https://doi.org/10.1016/j.ins.2011.12.028", "when random splits are and aren't OK for time series"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 46 L16 38 L28 44 L40 28 L52 34"/><path d="M52 34 L60 30" stroke-dasharray="3 3"/><rect x="64" y="6" width="28" height="52" rx="3"/><path d="M70 16 H86 M70 26 H86 M70 36 H86 M70 46 H80"/><path d="M40 28 V58 M52 34 V58" stroke-opacity=".4"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);
    // [key, label, known at forecast time?, default on]
    const FEATS = [
      ["lag1", "last week's sales (lag 1)", true, true],
      ["lag52", "same week last year (lag 52)", true, false],
      ["roll4", "average of the past 4 weeks", true, false],
      ["fourier", "seasonal shape (sine + cosine of week)", true, false],
      ["promo", "promotion planned this week", true, false],
      ["price", "planned shelf price", true, false],
      ["holiday", "public holiday this week", true, false],
      ["traffic", "LEAK: this week's actual store traffic", false, false],
      ["roll4c", "LEAK: 4-week average including this week", false, false],
    ];
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0"><div style="padding:4px 6px 0">${h4("The last 52 weeks: actual sales and the 1-week-ahead forecast")}</div><canvas id="f1" aria-label="Actual weekly sales with forecasts from the test and the live setting"></canvas><figcaption id="f1Cap"></figcaption></figure>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Error: what the test says vs what happens live")}</div><canvas id="f2" aria-label="Mean absolute error in testing and live"></canvas><figcaption id="f2Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("How much each feature is used")}</div><canvas id="f3" aria-label="Standardised coefficient size per feature"></canvas><figcaption id="f3Cap"></figcaption></figure>`)}
        <div class="plot wide" style="padding:14px;overflow-x:auto">${h4("One week's feature row: what's known when")}<div id="row"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Three years of weekly sales for one SKU: a slow trend, a yearly season, promotions, price changes and holidays. The model is a linear regression forecasting next week; it trains on years 1–2 and is tested on year 3.</p>
        <div class="ctrl"><label>Features</label><div id="feats" style="display:grid;gap:4px">${FEATS.map(([k, n, ok, on]) => `<label class="check" style="margin:0;${ok ? "" : "color:var(--bad)"}"><input type="checkbox" data-f="${k}" ${on ? "checked" : ""}> ${n}</label>`).join("")}</div></div>
        <div class="ctrl"><label>How the test weeks are chosen</label><div class="seg" id="ev"><button type="button" data-v="time" aria-pressed="true">last 52 weeks (time order)</button><button type="button" data-v="rand" aria-pressed="false">random third of weeks</button></div></div>
        <div class="ctrl"><label for="wk">Week to inspect (in year 3) <output id="wkV"></output></label><input type="range" id="wk" min="1" max="52" step="1" value="20"></div>
        <div class="ctrl"><label for="nz">Weekly noise <output id="nzV"></output></label><input type="range" id="nz" min="0.02" max="0.3" step="0.01" value="0.1"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn primary" id="good" type="button">Use all honest features</button><button class="btn" id="leak" type="button">Add the leaks</button><button class="btn" id="resim" type="button">New history</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Features that usually matter for demand</h2>
          <ul>
            <li><b>Lags</b>: last week, last month, the same week last year. They carry the level and the season.</li>
            <li><b>Rolling statistics</b>: averages, maxima or volatility over the last few weeks, always ending at the last known week.</li>
            <li><b>Calendar</b>: week of year (or Fourier terms), month, holidays, paydays, school terms.</li>
            <li><b>Known future drivers</b>: planned promotions, planned prices, marketing, store openings.</li>
            <li><b>Item attributes</b>: category, size, price tier. These let a <a href="#global-forecasting">global model</a> share patterns across SKUs.</li>
          </ul>
        </section>
        <section>
          <h2>Kinds of leakage</h2>
          <ul>
            <li><b>Future information</b>: actual traffic, actual weather, actual competitor prices for the week being forecast.</li>
            <li><b>Target inside a feature</b>: rolling windows, averages or encodings that include the current row's value.</li>
            <li><b>Wrong split</b>: random splits of time series, or the same customer in both train and test.</li>
            <li><b>Preprocessing on all data</b>: scaling or imputing with means computed over train and test together.</li>
            <li><b>Labels in disguise</b>: a “return reason” field that only exists if the item was returned.</li>
          </ul>
          <p>Fixes: build features with an “as-of date”, test with a <a href="#backtesting">rolling-origin back-test</a>, and treat any feature that is almost too good as a suspect.</p>
        </section>
        <section>
          <h2>Test vs live</h2>
          <p>“Test” here uses the feature values as stored in the history table. “Live” replays year 3 as it would really have run: honest features are unchanged, but a leaky feature must be replaced by what you'd actually have had (last week's traffic; the 4-week average ending last week). Honest features with a time-ordered test give the same error both ways. A live model is always trained on years 1\u20132 only.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Add features one by one from the top and watch the error fall. Lag 52 and the promo flag usually make the biggest difference.</li>
            <li>Tick the traffic leak: the test error drops sharply, the live error jumps.</li>
            <li>With only the 4-week average including this week, switch to random test weeks: it looks even better, because neighbouring weeks are in training.</li>
          </ul>
        </section>`,
    });

    let seed = 3, W = [], ev = "time", res = null;
    function gen() {
      const r = rng(seed), nz = +$("#nz").value; W = []; let lvl = 100;
      for (let t = 0; t < 156; t++) {
        lvl = lvl * (1 + 0.002) + 1.5 * r.normal(); const wk = t % 52, season = 1 + 0.25 * Math.sin((2 * Math.PI * (wk - 10)) / 52) + 0.08 * Math.cos((4 * Math.PI * wk) / 52);
        const promo = r() < 0.15 ? 1 : 0, price = 10 * (1 - (promo ? 0.2 : 0)) * (1 + 0.05 * Math.round(r.normal())), holiday = [0, 13, 51, 50].includes(wk) ? 1 : 0;
        const trafficShock = 0.22 * r.normal(), traffic = 1000 * season * (1 + trafficShock) * (holiday ? 1.15 : 1);
        const y = Math.max(5, lvl * season * (promo ? 1.6 : 1) * Math.pow(price / 10, -1.5) * (holiday ? 1.2 : 1) * (1 + trafficShock) * (1 + nz * r.normal()));
        W.push({ t, wk, promo, price, holiday, traffic, y });
      }
    }
    function feat(t, k, live) {
      const w = W[t], y = (i) => W[i].y;
      switch (k) {
        case "lag1": return y(t - 1);
        case "lag52": return y(t - 52);
        case "roll4": return (y(t - 1) + y(t - 2) + y(t - 3) + y(t - 4)) / 4;
        case "fourier": return null;
        case "promo": return w.promo;
        case "price": return w.price;
        case "holiday": return w.holiday;
        case "traffic": return live ? W[t - 1].traffic : w.traffic;
        case "roll4c": return live ? (y(t - 1) + y(t - 2) + y(t - 3) + y(t - 4)) / 4 : (y(t) + y(t - 1) + y(t - 2) + y(t - 3)) / 4;
      }
    }
    const on = () => [...root.querySelectorAll("#feats input")].filter((e) => e.checked).map((e) => e.dataset.f);
    function rowOf(t, ks, live) { const x = [1]; ks.forEach((k) => { if (k === "fourier") { x.push(Math.sin((2 * Math.PI * W[t].wk) / 52), Math.cos((2 * Math.PI * W[t].wk) / 52)); } else x.push(feat(t, k, live)); }); return x; }
    const SHORT = { lag1: "lag 1", lag52: "lag 52", roll4: "past 4-week avg", promo: "promo planned", price: "planned price", holiday: "holiday", traffic: "actual traffic (leak)", roll4c: "avg incl. this week (leak)" };
    function names(ks) { const n = []; ks.forEach((k) => (k === "fourier" ? n.push("sin(week)", "cos(week)") : n.push(SHORT[k]))); return n; }
    function lsq(X, y) { const p = X[0].length, A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? 1e-6 : 0))), b = Array.from({ length: p }, (_, i) => X.reduce((s, r, k) => s + r[i] * y[k], 0)); return Lab.solve(A, b); }
    function run() {
      const ks = on(), all = Array.from({ length: 104 }, (_, i) => i + 52); // weeks 52..155 usable (lag 52)
      let trainW, testW;
      if (ev === "time") { trainW = all.filter((t) => t < 104); testW = all.filter((t) => t >= 104); }
      else { const r = rng(seed + 9), sh = all.slice().sort(() => r() - 0.5); testW = sh.slice(0, 35).sort((a, b) => a - b); trainW = sh.slice(35); }
      const beta = lsq(trainW.map((t) => rowOf(t, ks, false)), trainW.map((t) => W[t].y)), pastW = all.filter((t) => t < 104), betaL = ev === "time" ? beta : lsq(pastW.map((t) => rowOf(t, ks, false)), pastW.map((t) => W[t].y));
      const pred = (t, live) => rowOf(t, ks, live).reduce((s, v, j) => s + v * (live ? betaL : beta)[j], 0);
      const mae = (ws, live) => ws.reduce((s, t) => s + Math.abs(W[t].y - pred(t, live)), 0) / ws.length;
      const liveW = all.filter((t) => t >= 104), naive = liveW.reduce((s, t) => s + Math.abs(W[t].y - W[t - 1].y), 0) / liveW.length;
      const X = trainW.map((t) => rowOf(t, ks, false)), sds = beta.map((_, j) => { if (!j) return 0; const v = X.map((r) => r[j]), m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); });
      res = { ks, beta, pred, testMae: mae(testW, false), liveMae: mae(liveW, true), naive, imp: beta.map((b, j) => Math.abs(b) * sds[j]).slice(1), names: names(ks), leaky: ks.some((k) => !FEATS.find((f) => f[0] === k)[2]), testW };
    }
    const P1 = new Plot($("#f1"), { x: [104, 155], pad: { l: 46, b: 38 } }), P2 = new Plot($("#f2"), { pad: { l: 46, b: 38 } }), P3 = new Plot($("#f3"), { pad: { l: 150, r: 20, b: 30 } });
    function d1() {
      const xs = Array.from({ length: 52 }, (_, i) => 104 + i), ys = xs.map((t) => W[t].y), te = xs.map((t) => res.pred(t, false)), lv = xs.map((t) => res.pred(t, true)), all = ys.concat(te, lv);
      P1.resize(); P1.x = [104, 155]; P1.y = [Math.min(...all) * 0.9, Math.max(...all) * 1.05]; P1.clear(); P1.axes({ xLabel: "week of year 3", yLabel: "units", xFormat: (v) => fmt(v - 103, 0), yFormat: (v) => fmt(v, 0) });
      const g = P1.ctx; xs.forEach((t) => { if (W[t].promo) { g.fillStyle = css("--warm"); g.globalAlpha = 0.12; g.fillRect(P1.sx(t - 0.5), P1.pad.t, P1.sx(t + 0.5) - P1.sx(t - 0.5), P1.ih); g.globalAlpha = 1; } });
      P1.path(xs, ys, css("--ink"), 2); if (res.leaky) P1.path(xs, te, css("--muted"), 1.6, [5, 4]); P1.path(xs, lv, css("--accent"), 2.2);
      const wk = 103 + +$("#wk").value; P1.path([wk, wk], P1.y, css("--warm"), 1.2, [2, 3]);
      $("#f1Cap").innerHTML = `Black: actual sales. Blue: the forecast as it would really have run${res.leaky ? `. Grey dashed: what the test saw, using the leaky values` : ""}. Shaded weeks had a promotion.`;
    }
    function d2() {
      const bars = [["naive", res.naive, "--muted"], ["model: test", res.testMae, res.leaky ? "--good" : "--accent"], ["model: live", res.liveMae, "--accent"]], mx = Math.max(...bars.map((b) => b[1])) * 1.15, g = P2.ctx;
      P2.resize(); P2.x = [0, 3]; P2.y = [0, mx]; P2.clear(); P2.axes({ xLabel: "", yLabel: "mean absolute error (units)", xTicks: [0.5, 1.5, 2.5], xFormat: (v) => bars[Math.floor(v)][0], yFormat: (v) => fmt(v, 0) });
      bars.forEach(([n, v, c], i) => { const w = P2.sx(0.55) - P2.sx(0); g.fillStyle = css(c); g.fillRect(P2.sx(i + 0.5) - w / 2, P2.sy(v), w, P2.sy(0) - P2.sy(v)); g.fillStyle = css("--ink"); g.font = "11px " + css("--font-mono"); g.textAlign = "center"; g.fillText(fmt(v, 1), P2.sx(i + 0.5), P2.sy(v) - 6); });
      const gap = res.liveMae / res.testMae;
      $("#f2Cap").innerHTML = res.leaky ? `<b>Leak:</b> the test promises ${fmt(res.testMae, 1)} units of error; live it's ${fmt(res.liveMae, 1)}, ${fmt(gap, 1)}× worse${res.liveMae > res.naive ? ", worse even than the naive forecast" : ""}.` : ev === "rand" && gap > 1.1 ? `Honest features, but random test weeks flatter the model: test ${fmt(res.testMae, 1)} vs live ${fmt(res.liveMae, 1)}, because the weeks around each test week were in training.` : `Honest features: test and live errors agree. The model beats the naive forecast by ${fmt((1 - res.liveMae / res.naive) * 100, 0)}%.`;
    }
    function d3() {
      const n = res.names, v = res.imp, g = P3.ctx, mx = Math.max(...v, 1e-9);
      P3.resize(); P3.x = [0, mx * 1.15]; P3.y = [0, Math.max(1, n.length)]; P3.clear(); P3.axes({ xLabel: "effect of a typical change (units)", yLabel: "", yTicks: [], xFormat: (x) => fmt(x, 0), xCount: 4 });
      const bh = P3.ih / Math.max(1, n.length);
      n.forEach((nm, i) => { const y = P3.pad.t + i * bh, leak = /leak/.test(nm); g.fillStyle = css(leak ? "--bad" : "--accent"); g.fillRect(P3.sx(0), y + bh * 0.2, P3.sx(v[i]) - P3.sx(0), bh * 0.6); g.fillStyle = css("--ink"); g.font = "11px " + css("--font-body"); g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(nm, P3.pad.l - 6, y + bh / 2); });
      $("#f3Cap").innerHTML = `|coefficient| × the feature's standard deviation: how many units the forecast moves for a typical change in it. Red: leaky features. A leak usually dominates.`;
    }
    function rowHTML() {
      const t = 103 + +$("#wk").value, ks = on(), cells = [];
      const all = ["lag1", "lag52", "roll4", "promo", "price", "holiday", "traffic", "roll4c"];
      all.forEach((k) => { const f = FEATS.find((x) => x[0] === k), test = feat(t, k, false), live = feat(t, k, true), used = ks.includes(k);
        cells.push(`<tr style="border-top:1px solid var(--line);${used ? "" : "opacity:.5"}"><td style="padding:3px 8px;${f[2] ? "" : "color:var(--bad)"}">${f[1].replace("LEAK: ", "")}</td><td style="padding:3px 8px">${f[2] ? "yes" : "<b style='color:var(--bad)'>no</b>"}</td><td style="padding:3px 8px;text-align:right;font-family:var(--font-mono)">${fmt(test, k === "price" ? 2 : 0)}</td><td style="padding:3px 8px;text-align:right;font-family:var(--font-mono)">${fmt(live, k === "price" ? 2 : 0)}</td></tr>`); });
      $("#row").innerHTML = `<p style="margin:0 0 8px">Week ${+$("#wk").value} of year 3: actual sales <b>${fmt(W[t].y, 0)}</b>; forecast in test ${fmt(res.pred(t, false), 0)}, live ${fmt(res.pred(t, true), 0)}.</p><table style="border-collapse:collapse;font-size:.82rem;white-space:nowrap"><thead><tr style="color:var(--muted)"><th style="text-align:left;padding:3px 8px">feature</th><th style="text-align:left;padding:3px 8px">known when forecasting?</th><th style="padding:3px 8px">value in history table</th><th style="padding:3px 8px">value you'd really have</th></tr></thead><tbody>${cells.join("")}</tbody></table>`;
    }
    function readouts() {
      $("#ro").innerHTML = [["Error in test", `<span class="num">${fmt(res.testMae, 1)}</span>`], ["Error live", `<span class="pill ${res.liveMae > res.testMae * 1.3 ? "bad" : res.liveMae < res.naive ? "ok" : "warn"}">${fmt(res.liveMae, 1)}</span>`], ["Naive forecast error", `<span class="num">${fmt(res.naive, 1)}</span>`], ["Features in use", `<span class="num">${res.names.length}</span>`]]
        .map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function draw() { $("#wkV").textContent = $("#wk").value; $("#nzV").textContent = Math.round(+$("#nz").value * 100) + "%"; run(); d1(); d2(); d3(); rowHTML(); readouts(); }
    root.querySelectorAll("#feats input").forEach((e) => e.addEventListener("change", draw));
    $("#wk").addEventListener("input", draw);
    $("#nz").addEventListener("input", () => { gen(); draw(); });
    root.querySelectorAll("#ev button").forEach((b) => b.addEventListener("click", () => { root.querySelectorAll("#ev button").forEach((x) => x.setAttribute("aria-pressed", x === b)); ev = b.dataset.v; draw(); }));
    $("#good").addEventListener("click", () => { root.querySelectorAll("#feats input").forEach((e) => (e.checked = FEATS.find((f) => f[0] === e.dataset.f)[2])); draw(); });
    $("#leak").addEventListener("click", () => { root.querySelectorAll("#feats input").forEach((e) => { if (!FEATS.find((f) => f[0] === e.dataset.f)[2]) e.checked = true; }); draw(); });
    $("#resim").addEventListener("click", () => { seed++; gen(); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); root.querySelectorAll("#feats input").forEach((e) => (e.checked = FEATS.find((f) => f[0] === e.dataset.f)[3])); ev = "time"; root.querySelectorAll("#ev button").forEach((b, i) => b.setAttribute("aria-pressed", i === 0)); seed = 3; gen(); draw(); });
    gen(); draw();
    return watch([$("#f1"), $("#f2"), $("#f3")], () => { d1(); d2(); d3(); });
  },
});
