Lab.register({
  id: "pinball-crps",
  group: "Forecasting",
  title: "Scoring probabilistic forecasts: pinball loss and CRPS",
  blurb: "A forecast of '90% sure demand stays under 130' needs its own scorecard. Pinball loss scores one quantile; CRPS scores the whole forecast distribution. Both reward being calibrated and sharp.",
  lede: "Safety stock, service levels and capacity plans need more than one number: they need to know how high demand could go. A probabilistic forecast gives quantiles or a full distribution. MAPE and RMSE can't judge it, because they only look at one point. Pinball loss checks a single quantile, and the continuous ranked probability score (CRPS) checks the whole distribution. Both are lowest for a forecast that is honest about its uncertainty: not too narrow, not too wide, and centred in the right place.",
  quiz: [
    ["Your 90% quantile forecast is 130 and actual demand is 120. What is the pinball loss? What if actual is 140?", "Actual below the quantile: (1 − 0.9) × (130 − 120) = 1. Actual above: 0.9 × (140 − 130) = 9. Undershooting a high quantile is punished 9× harder, which is what pushes the forecast up to the real 90th percentile."],
    ["Why can't you judge a 90% quantile forecast with MAE?", "MAE is minimised by the median. Score a 90% quantile with MAE and the best-scoring 'forecast' drifts back to the median, the wrong target. Pinball loss at τ = 0.9 is minimised exactly at the 90th percentile."],
    ["What does CRPS reduce to if the forecast is a single number?", "The absolute error. So CRPS is like MAE extended to distributions, in the same units as demand, and can be compared directly with a point forecast's MAE."],
    ["Forecast A has 80% intervals that contain actuals 80% of the time but are very wide. Forecast B's are narrower and also contain 80%. Which is better?", "B. Both are calibrated, and B is sharper (more informative). CRPS rewards sharpness subject to calibration. A narrower interval that only caught 60% would be penalised."],
    ["In the chart of CRPS against spread, why is the minimum near the true spread?", "CRPS is a proper scoring rule: on average, it is lowest when the forecast distribution matches the real one. Too narrow means big losses when actuals land in the tails; too wide spreads probability where nothing happens."],
  ],
  diy: {
    intro: "Actuals in A2:A101. Quantile forecasts in B2:B101 for quantile level τ in E1. For a normal forecast, mean in C2:C101 and SD in D2:D101.",
    steps: [
      ["Pinball loss for one row.", "=IF(A2>=B2, $E$1*(A2-B2), (1-$E$1)*(B2-A2))"],
      ["Average pinball loss (lower is better). Repeat for several τ (e.g. 0.1, 0.5, 0.9) and average them for an overall score.", "=AVERAGE(F2:F101)"],
      ["Coverage check: share of actuals at or below the τ quantile; should be close to τ.", "=SUMPRODUCT(--(A2:A101<=B2:B101))/100"],
      ["CRPS for a normal forecast: standardise first.", "z: =(A2-C2)/D2"],
      ["CRPS for the row (closed form for the normal distribution).", "=D2*(G2*(2*NORM.S.DIST(G2,TRUE)-1)+2*NORM.S.DIST(G2,FALSE)-1/SQRT(PI()))"],
      ["Average CRPS; compare with the MAE of a point forecast in the same units.", "=AVERAGE(H2:H101)"],
    ],
  },
  deeper: [
    ["Gneiting & Raftery (2007), Strictly proper scoring rules, prediction, and estimation, JASA 102(477)", "https://doi.org/10.1198/016214506000001437", "the theory: why pinball and CRPS reward honesty"],
    ["Matheson & Winkler (1976), Scoring rules for continuous probability distributions, Management Science 22(10)", "https://doi.org/10.1287/mnsc.22.10.1087", "where CRPS comes from"],
    ["Koenker & Bassett (1978), Regression quantiles, Econometrica 46(1)", "https://doi.org/10.2307/1913643", "the pinball (check) loss behind quantile regression"],
    ["Gneiting & Katzfuss (2014), Probabilistic forecasting, Annual Review of Statistics 1", "https://doi.org/10.1146/annurev-statistics-062713-085831", "calibration and sharpness explained"],
    ["Makridakis, Spiliotis, Assimakopoulos et al. (2022), The M5 uncertainty competition: results, findings and conclusions, IJF 38(4)", "https://doi.org/10.1016/j.ijforecast.2021.10.009", "quantile forecasts of Walmart sales, scored with pinball loss"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 20 L56 54 L90 8" stroke-width="2.5"/><path d="M56 4 V60" stroke-dasharray="3 3"/><path d="M4 58 C 30 58, 40 30, 50 20 S 70 6, 92 6" stroke-width="1.5" stroke-opacity=".5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, qnorm, pnorm, dnorm } = Lab;
    const TM = 100, TS = 20, N = 300; // true demand distribution: normal(100, 20)
    const pin = (y, q, t) => (y >= q ? t * (y - q) : (1 - t) * (q - y));
    const crps = (mu, s, y) => { const z = (y - mu) / s; return s * (z * (2 * pnorm(z) - 1) + 2 * dnorm(z) - 1 / Math.sqrt(Math.PI)); };
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Pinball loss for one forecast")}</div><canvas id="c1" aria-label="Pinball loss against actual demand"></canvas><figcaption id="c1Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Average pinball loss: where should the quantile be?")}</div><canvas id="c2" aria-label="Average pinball loss against quantile value"></canvas><figcaption id="c2Cap"></figcaption></figure>`)}
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("CRPS for one forecast: the shaded gap")}</div><canvas id="c3" aria-label="Forecast CDF and the actual as a step"></canvas><figcaption id="c3Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Average CRPS against forecast spread")}</div><canvas id="c4" aria-label="Average CRPS against forecast spread"></canvas><figcaption id="c4Cap"></figcaption></figure>`)}
        <div class="plot" style="padding:14px">${h4("Worked out for the example day")}<div id="work" style="font:.82rem/1.9 var(--font-mono);overflow-x:auto"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Daily demand really follows a normal distribution with mean ${TM} and SD ${TS}. ${N} days of actuals. Your forecast is a normal distribution you control:</p>
        <div class="ctrl"><label for="mu">Forecast mean (bias) <output id="muV"></output></label><input type="range" id="mu" min="70" max="130" step="1" value="${TM}"></div>
        <div class="ctrl"><label for="sd">Forecast spread (SD) <output id="sdV"></output></label><input type="range" id="sd" min="4" max="50" step="1" value="12"></div>
        <div class="ctrl"><label for="tau">Quantile level τ <output id="tauV"></output></label><input type="range" id="tau" min="0.05" max="0.95" step="0.05" value="0.9"></div>
        <div class="ctrl"><label for="y">Example day's actual <output id="yV"></output></label><input type="range" id="y" min="40" max="160" step="1" value="125"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="honest" type="button">Make the forecast honest</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Pinball loss (quantile loss)</h2>
          <div class="eq">if actual ≥ q: loss = τ × (actual − q)<br>if actual &lt; q: loss = (1 − τ) × (q − actual)</div>
          <p>For a 90% quantile, ending up below the actual costs 9× as much per unit as ending up above it. The only place that balances out over many days is the true 90th percentile, where actuals fall below 90% of the time. That makes pinball loss the right scorecard for each quantile you forecast, and the "average pinball" chart shows its minimum sitting right there.</p>
          <p>At τ = 0.5 pinball loss is half the absolute error, so the median forecast is judged by MAE.</p>
        </section>
        <section>
          <h2>CRPS: the whole distribution at once</h2>
          <div class="eq">CRPS = ∫ ( F(x) − 1{x ≥ actual} )² dx<br>normal forecast: σ × [ z(2Φ(z) − 1) + 2φ(z) − 1/√π ], &nbsp; z = (actual − μ)/σ</div>
          <p>F is the forecast's cumulative distribution and the step is the actual outcome. CRPS is the squared gap between them, added up: the shaded area in the third chart. It is also the average pinball loss over all quantile levels (times 2), so it covers every quantile at once. Its units are demand units, and for a point forecast it equals the absolute error.</p>
        </section>
        <section>
          <h2>Calibration and sharpness</h2>
          <p><b>Calibrated:</b> 80% intervals contain about 80% of actuals. <b>Sharp:</b> intervals are as narrow as possible. The goal is maximum sharpness subject to calibration. A forecast that is too narrow looks confident but its intervals miss too often, so stock-outs surprise you. One that's too wide is safe but uninformative, so you hold too much stock. CRPS and pinball loss penalise both.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>The forecast starts too narrow (SD 12 vs a true 20). Check the 80% interval coverage in the readouts, then press "Make the forecast honest".</li>
            <li>In the fourth chart, find the bottom of the curve: it sits at the true SD of 20.</li>
            <li>Add bias (mean 115). The CRPS curve's minimum shifts to a wider spread: an unbiased forecast is best, but if you can't fix the bias, widening helps.</li>
            <li>Set τ = 0.5 and compare the minimum of the average pinball loss with half the MAE.</li>
          </ol>
          <p>Related: <a href="#prediction-intervals">prediction intervals and quantile forecasts</a>, <a href="#forecast-accuracy">point accuracy measures</a>, <a href="#newsvendor">the newsvendor</a> (which needs exactly the right quantile) and <a href="#reorder-point">safety stock</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const ys = (() => { const r = rng(2024); return Array.from({ length: N }, () => TM + TS * r.normal()); })();
    const p1 = new Plot($("#c1"), { x: [40, 160], pad: { l: 44, b: 38 } }), p2 = new Plot($("#c2"), { x: [60, 160], pad: { l: 44, b: 38 } });
    const p3 = new Plot($("#c3"), { x: [30, 170], y: [0, 1.02], pad: { l: 44, b: 38 } }), p4 = new Plot($("#c4"), { x: [4, 50], pad: { l: 44, b: 38 } });
    let S = null;

    function compute() {
      const mu = +$("#mu").value, sd = +$("#sd").value, tau = +$("#tau").value, y = +$("#y").value;
      const q = mu + sd * qnorm(tau), avgPin = ys.reduce((s, v) => s + pin(v, q, tau), 0) / N;
      const avgCrps = ys.reduce((s, v) => s + crps(mu, sd, v), 0) / N, mae = ys.reduce((s, v) => s + Math.abs(v - mu), 0) / N;
      const lo = mu + sd * qnorm(0.1), hi = mu + sd * qnorm(0.9), cov = ys.filter((v) => v >= lo && v <= hi).length / N, below = ys.filter((v) => v <= q).length / N;
      const sorted = ys.slice().sort((a, b) => a - b), empQ = sorted[Math.min(N - 1, Math.floor(tau * N))];
      S = { mu, sd, tau, y, q, avgPin, avgCrps, mae, cov, below, empQ, trueQ: TM + TS * qnorm(tau) };
    }
    function d1() {
      const { q, tau, y } = S, top = Math.max(pin(40, q, tau), pin(160, q, tau)) * 1.1;
      p1.resize(); p1.y = [0, top]; p1.clear(); p1.axes({ xLabel: "actual demand", yLabel: "pinball loss", yFormat: (v) => fmt(v, 0) });
      p1.fn((x) => pin(x, q, tau), css("--accent"), 2.5);
      p1.path([q, q], [0, top], css("--violet"), 1.5, [4, 3]);
      p1.dot(y, pin(y, q, tau), 6, css("--warm"), css("--surface"));
      $("#c1Cap").innerHTML = `Forecast ${Math.round(tau * 100)}% quantile q = <b>${fmt(q, 1)}</b> (dashed). Slope left of q: ${fmt(1 - tau, 2)}; right of q: ${fmt(tau, 2)}. Example day, actual ${y}: loss <b>${fmt(pin(y, q, tau), 2)}</b>.`;
    }
    function d2() {
      const { tau, q, empQ, trueQ } = S, xs = Array.from({ length: 101 }, (_, i) => 60 + i), L = xs.map((x) => ys.reduce((s, v) => s + pin(v, x, tau), 0) / N);
      p2.resize(); p2.y = [0, Math.max(...L) * 1.08]; p2.clear(); p2.axes({ xLabel: `value chosen as the ${Math.round(tau * 100)}% quantile`, yLabel: "avg pinball loss", yFormat: (v) => fmt(v, 0) });
      p2.path(xs, L, css("--accent"), 2.5);
      const mi = L.indexOf(Math.min(...L));
      p2.path([trueQ, trueQ], [0, p2.y[1]], css("--good"), 1.5, [4, 3]);
      p2.dot(xs[mi], L[mi], 6, null, css("--good"));
      p2.dot(Math.max(60, Math.min(160, q)), ys.reduce((s, v) => s + pin(v, q, tau), 0) / N, 6, css("--violet"), css("--surface"));
      $("#c2Cap").innerHTML = `Lowest average loss at <b>${xs[mi]}</b>, close to the true ${Math.round(tau * 100)}th percentile (${fmt(trueQ, 1)}, green dashed); the small gap is sampling noise in ${N} days. Your forecast's quantile (purple, ${fmt(q, 1)}) scores ${fmt(S.avgPin, 2)} vs the best ${fmt(L[mi], 2)}. ${Math.round(S.below * 100)}% of actuals fell at or below it; a calibrated ${Math.round(tau * 100)}% quantile would have ${Math.round(tau * 100)}%.`;
    }
    function d3() {
      const { mu, sd, y } = S, g = p3.ctx;
      p3.resize(); p3.clear(); p3.axes({ xLabel: "demand", yLabel: "cumulative probability", yTicks: [0, 0.5, 1] });
      p3.clip(() => {
        g.save(); g.fillStyle = css("--warm"); g.globalAlpha = 0.28;
        for (let x = 30; x < 170; x += 0.5) { const F = pnorm((x - mu) / sd), H = x >= y ? 1 : 0, a = Math.min(F, H), b = Math.max(F, H); g.fillRect(p3.sx(x), p3.sy(b), p3.sx(x + 0.5) - p3.sx(x) + 0.5, p3.sy(a) - p3.sy(b)); }
        g.restore();
      });
      p3.fn((x) => pnorm((x - mu) / sd), css("--accent"), 2.5);
      p3.path([30, y, y, 170], [0, 0, 1, 1], css("--ink"), 2);
      $("#c3Cap").innerHTML = `Blue: your forecast's cumulative distribution. Black step: the actual (${y}). CRPS adds up the square of the shaded gap along the axis: <b>${fmt(crps(mu, sd, y), 2)}</b> units. A point forecast of ${mu} would score |${y} − ${mu}| = ${Math.abs(y - mu)}.`;
    }
    function d4() {
      const { mu, sd } = S, xs = Array.from({ length: 93 }, (_, i) => 4 + i * 0.5), C = xs.map((s) => ys.reduce((a, v) => a + crps(mu, s, v), 0) / N);
      p4.resize(); p4.y = [0, Math.max(...C, S.mae) * 1.08]; p4.clear(); p4.axes({ xLabel: "forecast SD", yLabel: "average CRPS", yFormat: (v) => fmt(v, 0) });
      p4.path([4, 50], [S.mae, S.mae], css("--muted"), 1.5, [5, 4]);
      p4.path(xs, C, css("--accent"), 2.5);
      p4.path([TS, TS], [0, p4.y[1]], css("--good"), 1.5, [4, 3]);
      const mi = C.indexOf(Math.min(...C));
      p4.dot(xs[mi], C[mi], 6, null, css("--good")); p4.dot(sd, S.avgCrps, 6, css("--violet"), css("--surface"));
      $("#c4Cap").innerHTML = `With mean ${mu}, CRPS is lowest at SD <b>${xs[mi]}</b>, close to the true SD of ${TS} (green dashed). Yours (SD ${sd}): <b>${fmt(S.avgCrps, 2)}</b>. Grey dashed: MAE of the mean as a point forecast (${fmt(S.mae, 2)}); a good distribution beats it.`;
    }
    function work() {
      const { mu, sd, tau, y, q } = S, z = (y - mu) / sd, b = (t) => `<b style="color:var(--ink)">${t}</b>`;
      $("#work").innerHTML = [
        `forecast: normal, mean ${mu}, SD ${sd}; actual ${y}`,
        `${Math.round(tau * 100)}% quantile = mean + SD × NORM.S.INV(${tau}) = ${mu} + ${sd} × ${fmt(qnorm(tau), 3)} = ${b(fmt(q, 2))}`,
        `pinball: actual ${y >= q ? "≥" : "<"} q → ${y >= q ? `${tau} × (${y} − ${fmt(q, 2)})` : `${fmt(1 - tau, 2)} × (${fmt(q, 2)} − ${y})`} = ${b(fmt(pin(y, q, tau), 3))}`,
        `CRPS: z = (${y} − ${mu}) / ${sd} = ${fmt(z, 3)}; Φ(z) = ${fmt(pnorm(z), 4)}, φ(z) = ${fmt(dnorm(z), 4)}`,
        `CRPS = ${sd} × [${fmt(z, 3)} × (2 × ${fmt(pnorm(z), 4)} − 1) + 2 × ${fmt(dnorm(z), 4)} − 1/√π] = ${b(fmt(crps(mu, sd, y), 3))}`,
      ].map((l) => `<div style="white-space:nowrap">${l}</div>`).join("");
    }
    function readouts() {
      $("#ro").innerHTML = `<div class="ro"><b>80% interval</b><span class="num">${fmt(mu80(0.1), 0)}–${fmt(mu80(0.9), 0)}</span></div>
        <div class="ro"><b>…actuals inside it</b><span class="pill ${Math.abs(S.cov - 0.8) < 0.05 ? "ok" : "warn"}">${Math.round(S.cov * 100)}% (target 80%)</span></div>
        <div class="ro"><b>Avg pinball (τ = ${S.tau})</b><span class="num">${fmt(S.avgPin, 2)}</span></div>
        <div class="ro"><b>Avg CRPS</b><span class="num">${fmt(S.avgCrps, 2)}</span></div>
        <div class="ro"><b>MAE of the mean</b><span class="num">${fmt(S.mae, 2)}</span></div>`;
    }
    const mu80 = (p) => S.mu + S.sd * qnorm(p);
    function labels() { $("#muV").textContent = $("#mu").value; $("#sdV").textContent = $("#sd").value; $("#tauV").textContent = (+$("#tau").value).toFixed(2); $("#yV").textContent = $("#y").value; }
    function update() { labels(); compute(); d1(); d2(); d3(); d4(); work(); readouts(); }
    ["#mu", "#sd", "#tau", "#y"].forEach((s) => $(s).addEventListener("input", update));
    $("#honest").addEventListener("click", () => { $("#mu").value = TM; $("#sd").value = TS; update(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); update(); });
    update();
    return watch([$("#c1"), $("#c2"), $("#c3"), $("#c4")], () => { d1(); d2(); d3(); d4(); });
  },
});
