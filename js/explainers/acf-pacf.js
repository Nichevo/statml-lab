Lab.register({
  id: "acf-pacf",
  group: "Forecasting",
  title: "Autocorrelation: reading ACF and PACF charts",
  blurb: "Does this week's demand tell you about next week's? The autocorrelation (ACF) and partial autocorrelation (PACF) charts show how a series relates to its own past, and they're the main tool for choosing ARIMA settings.",
  lede: "Autocorrelation is the correlation between a series and a lagged copy of itself: this week against last week (lag 1), against two weeks ago (lag 2), and so on. Plot it for many lags and you get the ACF, a fingerprint of the series. Trends make it decay slowly; seasonality puts spikes at the season length; a short memory makes it cut off after a few lags. The PACF shows the direct link to each lag after removing the shorter lags in between. Together they tell you whether to difference, and which AR and MA terms an ARIMA model needs.",
  quiz: [
    ["The ACF starts near 1 and decays very slowly over 20+ lags. What does that suggest?", "The series isn't stationary: it has a trend or wanders like a random walk. Difference it (take week-to-week changes) and look at the ACF again."],
    ["The PACF has one big spike at lag 1 and nothing after; the ACF decays gradually. Which model?", "AR(1): each value depends directly on the previous one. The ACF decays because the effect passes on step by step (φ, φ², φ³…), but the PACF shows only one direct link."],
    ["The ACF has one spike at lag 1, then nothing; the PACF decays. Which model?", "MA(1): this period shares one random shock with the previous one, and nothing further back."],
    ["Monthly data with ACF spikes at lags 12 and 24. What does that mean?", "Yearly seasonality. Consider a seasonal difference (this month − same month last year) or a seasonal ARIMA term."],
    ["What are the dashed lines at ±1.96/√n for?", "Roughly 95% bounds for pure noise. Bars inside them are consistent with no autocorrelation. With 24 lags, expect about one bar to poke out by chance."],
    ["After fitting a model, why look at the ACF of the residuals?", "If the model has captured the structure, the residuals should look like white noise: no bars outside the bounds, and a Ljung–Box test with a large p-value. Leftover spikes mean there's pattern the model missed."],
  ],
  diy: {
    intro: "Weekly demand in B2:B201 (n = 200). Put the lag k in D1.",
    steps: [
      ["Mean of the series.", "E1: =AVERAGE(B2:B201)"],
      ["Autocorrelation at lag k (the ACF value).", "=SUMPRODUCT((OFFSET(B2,0,0,200-D1)-E1)*(OFFSET(B2,D1,0,200-D1)-E1))/DEVSQ(B2:B201)"],
      ["Quick approximation: plain correlation of the series with its shifted copy.", "=CORREL(OFFSET(B2,0,0,200-D1), OFFSET(B2,D1,0,200-D1))"],
      ["Significance bound for each bar.", "=1.96/SQRT(200)"],
      ["Partial autocorrelation at lag 2 from the ACF values r1 (F2) and r2 (F3).", "=(F3-F2^2)/(1-F2^2)"],
      ["Ljung–Box statistic over lags 1–10 (ACF values in F2:F11), and its p-value.", "Q: =200*202*SUMPRODUCT(F2:F11^2/(200-ROW(F2:F11)+1))   p: =CHISQ.DIST.RT(Q,10)"],
      ["First difference to remove a trend; then recompute the ACF on column C.", "C3: =B3-B2"],
    ],
  },
  deeper: [
    ["Hyndman & Athanasopoulos, Forecasting: Principles and Practice (3rd ed), §2.8 Autocorrelation", "https://otexts.com/fpp3/acf.html", "what ACF plots look like for trend and seasonality"],
    ["Hyndman & Athanasopoulos, FPP3 §9.5 Non-seasonal ARIMA models", "https://otexts.com/fpp3/non-seasonal-arima.html", "using ACF and PACF to choose p and q"],
    ["NIST/SEMATECH e-Handbook: Autocorrelation plot", "https://www.itl.nist.gov/div898/handbook/eda/section3/autocopl.htm", "how to read one, with examples"],
    ["Ljung & Box (1978), On a measure of lack of fit in time series models, Biometrika 65(2)", "https://doi.org/10.1093/biomet/65.2.297", "the portmanteau test for leftover autocorrelation"],
    ["Durbin (1960), The fitting of time-series models, Revue de l'Institut International de Statistique 28(3)", "https://doi.org/10.2307/1401322", "the recursion used to compute the PACF"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 34 H90" stroke-opacity=".4"/><path d="M8 24 H90 M8 44 H90" stroke-dasharray="3 3" stroke-opacity=".5"/><path d="M14 34 V6 M24 34 V14 M34 34 V20 M44 34 V25 M54 34 V28 M64 34 V30 M74 34 V31 M84 34 V32" stroke-width="3"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, pchisqUpper } = Lab;
    const LAGS = 24, NMAX = 500, BURN = 60;
    const PRE = { noise: [0, 0, 0, 0, 0, "White noise"], ar1: [0.7, 0, 0, 0, 0, "AR(1)"], ar2: [0.5, 0.3, 0, 0, 0, "AR(2)"], ma1: [0, 0, 0.8, 0, 0, "MA(1)"], seas: [0.3, 0, 0, 6, 0, "Seasonal"], trend: [0.5, 0, 0, 0, 0.15, "Trend"] };
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot short" style="margin:0"><div style="padding:4px 6px 0;display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center">${h4("The series")}<div class="seg" id="diff"><button type="button" data-v="0" aria-pressed="true">As is</button><button type="button" data-v="1" aria-pressed="false">Differenced</button></div></div><canvas id="t1" style="aspect-ratio:3/1;min-height:180px" aria-label="Simulated weekly demand series"></canvas><figcaption id="t1Cap"></figcaption></figure>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("ACF: correlation with each lag")}</div><canvas id="t2" aria-label="Autocorrelation function"></canvas><figcaption id="t2Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("PACF: direct link to each lag")}</div><canvas id="t3" aria-label="Partial autocorrelation function"></canvas><figcaption id="t3Cap"></figcaption></figure>`)}
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("What one ACF bar means")}</div><canvas id="t4" aria-label="Scatter of the series against its lagged values"></canvas><figcaption id="t4Cap"></figcaption></figure>`,
          `<div class="plot" style="padding:14px">${h4("Reading the charts")}<div id="read" style="font-size:.9rem;line-height:1.55"></div>${h4("Worked out")}<div id="work" style="font:.8rem/1.8 var(--font-mono)"></div></div>`)}`,
      panel: `
        <p class="hint" style="margin:0">Simulated weekly demand around 100. Pick a pattern, then fine-tune it.</p>
        <div class="btns" id="pre">${Object.entries(PRE).map(([k, v]) => `<button class="btn" type="button" data-p="${k}">${v[5]}</button>`).join("")}</div>
        <div class="ctrl"><label for="p1">AR(1) weight φ₁ <output id="p1V"></output></label><input type="range" id="p1" min="-0.9" max="0.95" step="0.05" value="0.7"></div>
        <div class="ctrl"><label for="p2">AR(2) weight φ₂ <output id="p2V"></output></label><input type="range" id="p2" min="-0.6" max="0.6" step="0.05" value="0"></div>
        <div class="ctrl"><label for="th">MA(1) weight θ₁ <output id="thV"></output></label><input type="range" id="th" min="-0.9" max="0.9" step="0.05" value="0"></div>
        <div class="ctrl"><label for="sa">Seasonal swing (period 12) <output id="saV"></output></label><input type="range" id="sa" min="0" max="10" step="0.5" value="0"></div>
        <div class="ctrl"><label for="tr">Trend per week <output id="trV"></output></label><input type="range" id="tr" min="0" max="0.3" step="0.01" value="0"></div>
        <div class="ctrl"><label for="n">Weeks of data <output id="nV"></output></label><input type="range" id="n" min="40" max="${NMAX}" step="10" value="200"></div>
        <div class="ctrl"><label for="lag">Lag shown in the scatter <output id="lagV"></output></label><input type="range" id="lag" min="1" max="${LAGS}" step="1" value="1"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New random shocks</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Autocorrelation at lag k</h2>
          <div class="eq">r<sub>k</sub> = Σ (y<sub>t</sub> − ȳ)(y<sub>t−k</sub> − ȳ) ÷ Σ (y<sub>t</sub> − ȳ)²</div>
          <p>It's the slope-like measure in the lag scatter: how well last week (or k weeks ago) lines up with this week. r<sub>k</sub> near 1 means strong memory; near 0, none; negative, a zig-zag.</p>
        </section>
        <section>
          <h2>Partial autocorrelation</h2>
          <p>If this week depends on last week, and last week on the week before, then this week and two weeks ago are correlated too, even with no direct link. The PACF at lag k removes the part explained by lags 1 to k − 1, leaving only the direct link. For lag 2:</p>
          <div class="eq">φ<sub>22</sub> = (r<sub>2</sub> − r<sub>1</sub>²) ÷ (1 − r<sub>1</sub>²)</div>
          <p>Longer lags use the Durbin–Levinson recursion, which is the same idea extended.</p>
        </section>
        <section>
          <h2>The classic patterns</h2>
          <ul>
            <li><b>AR(p)</b>: ACF decays gradually; PACF cuts off after lag p.</li>
            <li><b>MA(q)</b>: ACF cuts off after lag q; PACF decays gradually.</li>
            <li><b>Trend or random walk</b>: ACF decays very slowly from near 1. Difference first.</li>
            <li><b>Seasonality</b>: spikes at the season length and its multiples (12, 24).</li>
            <li><b>White noise</b>: everything inside the bounds. Nothing left to model, which is what you want from a model's residuals.</li>
          </ul>
          <p>Real data is messier than these textbook shapes, so treat the charts as a starting point and let accuracy on a hold-out period decide (see <a href="#arima">ARIMA</a> and <a href="#backtesting">backtesting</a>).</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Click through the six pattern buttons and compare the ACF and PACF shapes with the list above.</li>
            <li>Choose "Trend": the ACF barely decays. Switch to "Differenced" and it collapses.</li>
            <li>Set φ₁ negative (−0.7): the series zig-zags and the ACF alternates in sign.</li>
            <li>Choose "White noise" and press "New random shocks" a few times: count how often one bar crosses the bounds by chance.</li>
          </ol>
          <p>Related: <a href="#arima">ARIMA</a>, <a href="#seasonal-decomposition">seasonal decomposition</a>, <a href="#exponential-smoothing">exponential smoothing</a> and <a href="#correlation-traps">correlation traps</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let seed = 4, E = null, S = null, diff = 0;
    const gen = () => { const r = rng(seed * 71 + 3); E = Array.from({ length: NMAX + BURN }, () => r.normal()); };
    gen();
    const P1 = new Plot($("#t1"), { x: [1, 200], pad: { l: 46, b: 34 } }), P2 = new Plot($("#t2"), { x: [0.3, LAGS + 0.7], y: [-1, 1], pad: { l: 46, b: 38 } }), P3 = new Plot($("#t3"), { x: [0.3, LAGS + 0.7], y: [-1, 1], pad: { l: 46, b: 38 } }), P4 = new Plot($("#t4"), { x: [0, 1], pad: { l: 46, b: 38 } });

    function acf(y, K) { const n = y.length, m = y.reduce((a, b) => a + b, 0) / n, d = y.reduce((a, v) => a + (v - m) ** 2, 0); return Array.from({ length: K + 1 }, (_, k) => { let s = 0; for (let t = k; t < n; t++) s += (y[t] - m) * (y[t - k] - m); return s / d; }); }
    function pacf(r, K) { // Durbin–Levinson
      const out = [1], phi = []; let prev = [];
      for (let k = 1; k <= K; k++) {
        let num = r[k], den = 1; for (let j = 1; j < k; j++) { num -= prev[j - 1] * r[k - j]; den -= prev[j - 1] * r[j]; }
        const pk = num / den, cur = []; for (let j = 1; j < k; j++) cur.push(prev[j - 1] - pk * prev[k - j - 1]); cur.push(pk); prev = cur; out.push(pk); phi.push(pk);
      }
      return out;
    }
    function compute() {
      const f1 = +$("#p1").value, f2 = +$("#p2").value, th = +$("#th").value, sa = +$("#sa").value, tr = +$("#tr").value, n = +$("#n").value;
      const z = []; for (let t = 0; t < n + BURN; t++) { const v = (t > 0 ? f1 * z[t - 1] : 0) + (t > 1 ? f2 * z[t - 2] : 0) + E[t] * 3 + (t > 0 ? th * E[t - 1] * 3 : 0); z.push(Math.max(-1e6, Math.min(1e6, v))); }
      const raw = z.slice(BURN).map((v, t) => 100 + v + sa * Math.sin((2 * Math.PI * t) / 12) + tr * t), y = diff ? raw.slice(1).map((v, i) => v - raw[i]) : raw;
      const r = acf(y, LAGS), pr = pacf(r, LAGS), bnd = 1.96 / Math.sqrt(y.length);
      let Q = 0; for (let k = 1; k <= 10; k++) Q += (r[k] * r[k]) / (y.length - k); Q *= y.length * (y.length + 2);
      const stable = !(f1 + f2 >= 1 || f2 - f1 >= 1 || Math.abs(f2) >= 1);
      S = { f1, f2, th, sa, tr, n, raw, y, r, pr, bnd, Q, pQ: pchisqUpper(Q, 10), stable };
    }
    function d1() {
      const { y } = S, lo = Math.min(...y), hi = Math.max(...y), pad = (hi - lo) * 0.08 || 1;
      P1.resize(); P1.x = [1, y.length]; P1.y = [lo - pad, hi + pad]; P1.clear();
      P1.axes({ xLabel: "week", yLabel: diff ? "change vs last week" : "units", yFormat: (v) => fmt(v, 0), yCount: 4 });
      P1.path(y.map((_, i) => i + 1), y, css("--accent"), 1.6);
      $("#t1Cap").innerHTML = `${diff ? "Week-to-week changes (first difference). " : ""}${S.n} weeks. ${!S.stable ? "<b>φ₁ + φ₂ ≥ 1 or similar: this AR process is unstable and wanders off, like a random walk.</b>" : ""}`;
    }
    function bars(P, vals, col, label) {
      const { bnd } = S, g = P.ctx;
      P.resize(); P.clear(); P.axes({ xLabel: "lag (weeks)", yLabel: label, xTicks: [1, 4, 8, 12, 16, 20, 24], yTicks: [-1, -0.5, 0, 0.5, 1], yFormat: (v) => fmt(v, 1) });
      g.save(); g.fillStyle = css("--accent-soft"); g.fillRect(P.sx(0.3), P.sy(bnd), P.sx(LAGS + 0.7) - P.sx(0.3), P.sy(-bnd) - P.sy(bnd)); g.restore();
      P.path([0.3, LAGS + 0.7], [bnd, bnd], css("--muted"), 1, [4, 3]); P.path([0.3, LAGS + 0.7], [-bnd, -bnd], css("--muted"), 1, [4, 3]); P.path([0.3, LAGS + 0.7], [0, 0], css("--ink"), 1);
      const lag = +$("#lag").value;
      for (let k = 1; k <= LAGS; k++) { const v = vals[k], out = Math.abs(v) > bnd, w = Math.max(3, (P.sx(1) - P.sx(0)) * 0.5); g.fillStyle = css(out ? col : "--muted"); g.globalAlpha = out ? 1 : 0.55; g.fillRect(P.sx(k) - w / 2, P.sy(Math.max(0, v)), w, Math.abs(P.sy(v) - P.sy(0))); g.globalAlpha = 1; if (k === lag) { g.strokeStyle = css("--warm"); g.lineWidth = 2; g.strokeRect(P.sx(k) - w / 2 - 2, P.sy(Math.max(0, v)) - 2, w + 4, Math.abs(P.sy(v) - P.sy(0)) + 4); } }
    }
    const sigList = (v) => { const out = []; for (let k = 1; k <= LAGS; k++) if (Math.abs(v[k]) > S.bnd) out.push(k); return out; };
    function d23() {
      bars(P2, S.r, "--accent", "autocorrelation"); bars(P3, S.pr, "--violet", "partial autocorrelation");
      const a = sigList(S.r), p = sigList(S.pr), lst = (L) => (L.length ? (L.length > 8 ? L.slice(0, 8).join(", ") + " and more" : L.join(", ")) : "none");
      $("#t2Cap").innerHTML = `Lags outside the ±${fmt(S.bnd, 3)} bounds: <b>${lst(a)}</b>. Lag 1: r₁ = ${fmt(S.r[1], 3)}.`;
      $("#t3Cap").innerHTML = `Lags outside the bounds: <b>${lst(p)}</b>. Lag 1 PACF always equals lag 1 ACF.`;
    }
    function d4() {
      const k = +$("#lag").value, y = S.y, xs = y.slice(0, y.length - k), ys = y.slice(k), lo = Math.min(...y), hi = Math.max(...y), pad = (hi - lo) * 0.06 || 1;
      P4.resize(); P4.x = [lo - pad, hi + pad]; P4.y = [lo - pad, hi + pad]; P4.clear();
      P4.axes({ xLabel: `value ${k} week${k > 1 ? "s" : ""} earlier`, yLabel: "this week", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0), xCount: 4, yCount: 4 });
      xs.forEach((x, i) => P4.dot(x, ys[i], 2.4, css("--accent")));
      const m = y.reduce((a, b) => a + b, 0) / y.length, r = S.r[k];
      P4.path([lo - pad, hi + pad], [m + r * (lo - pad - m), m + r * (hi + pad - m)], css("--warm"), 2);
      $("#t4Cap").innerHTML = `Each dot pairs a week with the week ${k} earlier. The orange line has slope r<sub>${k}</sub> = <b>${fmt(r, 3)}</b>, the ACF bar outlined in orange. ${Math.abs(r) < S.bnd ? "A shapeless cloud: no memory at this lag." : r > 0 ? "Dots line up uphill: high weeks follow high weeks." : "Dots slope downhill: high weeks follow low weeks."}`;
    }
    function reading() {
      const r = S.r, pr = S.pr, bnd = S.bnd, msgs = [];
      const cut = (v) => { let c = 0; while (c < 4 && Math.abs(v[c + 1]) > bnd) c++; if (!c) return 0; for (let k = c + 1; k <= c + 3; k++) if (Math.abs(v[k]) > bnd) return 0; return c; };
      const nsig = (v, up) => { let c = 0; for (let k = 1; k <= up; k++) if (Math.abs(v[k]) > bnd) c++; return c; };
      const slow = r[1] > 0.8 && r[6] > 0.5, seas = r[12] > bnd && r[12] > Math.max(r[8], r[9]) + 0.05;
      if (slow) msgs.push("<b>Slow decay from near 1</b>: trend or random walk. Difference the series before choosing AR/MA terms.");
      else if (S.pQ > 0.05) msgs.push("<b>Looks like white noise</b>: the Ljung–Box test finds no real autocorrelation, and any bar outside the bounds is likely chance. Nothing left for a model to capture.");
      else {
        if (seas) msgs.push("<b>Rise back up at lag 12 (and 24)</b>: seasonality with period 12. Consider a seasonal difference or seasonal terms.");
        const cP = cut(pr), cA = cut(r);
        if (!seas && cP && nsig(r, 8) > cP) msgs.push(`<b>PACF cuts off after lag ${cP}</b> while the ACF fades: points to <b>AR(${cP})</b>.`);
        else if (!seas && cA && nsig(pr, 8) > cA) msgs.push(`<b>ACF cuts off after lag ${cA}</b> while the PACF fades: points to <b>MA(${cA})</b>.`);
        else if (!seas) msgs.push("<b>No clean cut-off in either chart</b>: a mixed ARMA model is likely. Try a few small ARIMA models and compare their accuracy.");
      }
      msgs.push(`Ljung–Box test on lags 1–10: Q = ${fmt(S.Q, 1)}, p ${S.pQ < 0.0001 ? "< 0.0001" : "= " + fmt(S.pQ, 3)} (${S.pQ < 0.05 ? "there is autocorrelation" : "consistent with white noise"}).`);
      $("#read").innerHTML = msgs.map((m) => `<p style="margin:0 0 8px">${m}</p>`).join("");
    }
    function work() {
      const { y, r, pr } = S, n = y.length, m = y.reduce((a, b) => a + b, 0) / n, b = (t) => `<b style="color:var(--ink)">${t}</b>`;
      let num = 0, den = 0; for (let t = 1; t < n; t++) num += (y[t] - m) * (y[t - 1] - m); for (const v of y) den += (v - m) ** 2;
      $("#work").innerHTML = [
        `ȳ = ${fmt(m, 2)}; Σ(yₜ − ȳ)(yₜ₋₁ − ȳ) = ${fmt(num, 1)}; Σ(yₜ − ȳ)² = ${fmt(den, 1)}`,
        `r₁ = ${fmt(num, 1)} ÷ ${fmt(den, 1)} = ${b(fmt(r[1], 3))}; r₂ = ${fmt(r[2], 3)}`,
        `PACF lag 2 = (${fmt(r[2], 3)} − ${fmt(r[1], 3)}²) ÷ (1 − ${fmt(r[1], 3)}²) = ${b(fmt(pr[2], 3))}`,
        `bounds = ±1.96 ÷ √${n} = ±${fmt(S.bnd, 3)}`,
      ].map((l) => `<div style="margin-bottom:3px">${l}</div>`).join("");
    }
    function readouts() {
      $("#ro").innerHTML = `<div class="ro"><b>r₁ (lag 1)</b><span class="num">${fmt(S.r[1], 3)}</span></div>
        <div class="ro"><b>ACF lags outside bounds</b><span class="num">${sigList(S.r).length} of ${LAGS}</span></div>
        <div class="ro"><b>PACF lags outside bounds</b><span class="num">${sigList(S.pr).length} of ${LAGS}</span></div>
        <div class="ro"><b>Ljung–Box p (10 lags)</b><span class="pill ${S.pQ < 0.05 ? "warn" : "ok"}">${S.pQ < 0.0001 ? "< 0.0001" : fmt(S.pQ, 3)}</span></div>`;
    }
    function labels() { [["p1", 2], ["p2", 2], ["th", 2], ["sa", 1], ["tr", 2]].forEach(([id, d]) => ($(`#${id}V`).textContent = fmt(+$(`#${id}`).value, d))); $("#nV").textContent = $("#n").value; $("#lagV").textContent = $("#lag").value; }
    function update() { labels(); compute(); d1(); d23(); d4(); reading(); work(); readouts(); }
    ["#p1", "#p2", "#th", "#sa", "#tr", "#n", "#lag"].forEach((s) => $(s).addEventListener("input", update));
    $("#pre").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { const v = PRE[b.dataset.p]; ["#p1", "#p2", "#th", "#sa", "#tr"].forEach((s, i) => ($(s).value = v[i])); update(); }));
    $("#diff").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { diff = +b.dataset.v; $("#diff").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); update(); }));
    $("#resim").addEventListener("click", () => { seed++; gen(); update(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 4; diff = 0; $("#diff").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === "0"))); gen(); update(); });
    update();
    return watch([$("#t1"), $("#t2"), $("#t3"), $("#t4")], () => { d1(); d23(); d4(); });
  },
});
