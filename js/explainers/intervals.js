Lab.register({
  id: "prediction-intervals",
  group: "Forecasting",
  title: "Prediction intervals and quantile forecasts",
  blurb: "A forecast is a range, not a number. See what an 80% interval promises, check it against a year of actuals, and turn it into a stock level.",
  lede: "A point forecast says \"we expect 100\". A prediction interval says \"80% of the time, demand will land between 82 and 118\". The ends of that range are quantile forecasts, and choosing which quantile to stock to is how forecasts become service levels and safety stock.",
  quiz: [
    ["What does an 80% prediction interval of 82 to 118 mean?", "If the forecasting process is well calibrated, actuals land inside such intervals 80% of the time, below 82 about 10% and above 118 about 10%."],
    ["Underage cost $6 (lost margin), overage cost $2 (holding). What quantile should you stock to?", "Critical ratio = 6 ÷ (6 + 2) = 0.75. Stock to the 75th percentile of demand."],
    ["Why do intervals widen the further ahead you forecast?", "Errors accumulate: uncertainty about the level, the trend and each period's noise all add up. For a random walk the SD grows with √h."],
    ["How can you check your intervals are honest?", "Backtest: count how often past actuals fell inside the intervals you would have issued. An 80% interval that covers 65% is too narrow, and your safety stock with it."],
  ],
  diy: {
    intro: "Backtest errors (actual − forecast) in E2:E101, next period's point forecast in H1.",
    steps: [
      ["Normal approach: spread of errors and the z for your coverage.", "H2: =STDEV.S(E2:E101)\nH3: =NORM.S.INV(0.9)   (80% two-sided → 90th percentile)"],
      ["Interval ends.", "=H1-H3*H2\n=H1+H3*H2"],
      ["Empirical approach (no normal assumption): add the error percentiles to the forecast.", "=H1+PERCENTILE.INC(E2:E101,0.1)\n=H1+PERCENTILE.INC(E2:E101,0.9)"],
      ["Critical ratio for stocking and the matching quantile forecast.", "H5: =cu/(cu+co)\n=H1+PERCENTILE.INC(E2:E101,H5)"],
      ["Safety stock = quantile forecast − point forecast.", "=NORM.S.INV(H5)*H2"],
      ["Widen for h periods ahead (assuming independent errors).", "=H3*H2*SQRT(h)"],
      ["Check coverage on history: share of actuals inside past intervals (F = lower, G = upper).", "=SUMPRODUCT((B2:B101>=F2:F101)*(B2:B101<=G2:G101))/COUNT(B2:B101)"],
    ],
  },
  deeper: [
    ["Hyndman & Athanasopoulos, FPP3 §5.5: Distributional forecasts and prediction intervals", "https://otexts.com/fpp3/prediction-intervals.html", "free textbook"],
    ["Chatfield (1993), Calculating interval forecasts, J. Business & Economic Statistics 11(2)", "https://doi.org/10.1080/07350015.1993.10509938", "why intervals are usually too narrow"],
    ["Koenker & Bassett (1978), Regression quantiles, Econometrica 46(1)", "https://doi.org/10.2307/1913643", "the foundation of quantile forecasting"],
    ["Gneiting & Katzfuss (2014), Probabilistic forecasting, Annual Review of Statistics 1", "https://doi.org/10.1146/annurev-statistics-062713-085831", "calibration and sharpness"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 36 L92 30 L92 6 L4 22 Z" fill="currentColor" fill-opacity=".15" stroke="none"/><path d="M4 50 L92 54 L92 30 L4 36 Z" fill="currentColor" fill-opacity=".15" stroke="none"/><path d="M4 36 L92 30"/><g fill="currentColor"><circle cx="16" cy="30" r="2.5"/><circle cx="30" cy="40" r="2.5"/><circle cx="44" cy="28" r="2.5"/><circle cx="58" cy="12" r="3.5"/><circle cx="72" cy="36" r="2.5"/><circle cx="86" cy="26" r="2.5"/></g></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const W = 52;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="pic" aria-label="A year of actuals against the forecast and its interval"></canvas>
          <div class="legend">
            <span><i style="background:var(--accent)"></i>Point forecast</span>
            <span><i style="background:var(--accent);opacity:.3"></i>Prediction interval</span>
            <span><i style="background:var(--ink)"></i>Actual inside</span>
            <span><i style="background:var(--warm)"></i>Actual outside</span>
          </div>
          <figcaption>52 weeks of actual demand, each forecast 100 units with the same uncertainty. Count the orange dots.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="pid" aria-label="Distribution of demand with the chosen quantile"></canvas>
          <figcaption id="dcap"></figcaption>
        </figure>`,
      panel: `
        <div class="ctrl"><label for="cov">Interval coverage <output id="covV"></output></label><input type="range" id="cov" min="50" max="99" step="1" value="80"></div>
        <div class="ctrl"><label for="sd">Forecast uncertainty (SD) <output id="sdV"></output></label><input type="range" id="sd" min="2" max="40" step="1" value="15"></div>
        <div class="ctrl"><label for="shape">Shape of demand</label>
          <select id="shape"><option value="normal">Symmetric (normal)</option><option value="skew">Skewed: occasional big weeks</option></select></div>
        <label class="check"><input type="checkbox" id="under"> Model underestimates the uncertainty by half</label>
        <div class="readouts">
          <div class="ro"><b>Interval</b><span class="num" id="iv"></span></div>
          <div class="ro"><b>Actuals inside</b><span class="num" id="inside"></span></div>
          <div class="ro"><b>Verdict</b><span id="verdict"></span></div>
        </div>
        <div>
          <h4>Turn it into a stock level</h4>
          <div class="ctrl"><label for="cu">Cost of a lost sale <output id="cuV"></output></label><input type="range" id="cu" min="1" max="20" step="1" value="4"></div>
          <div class="ctrl"><label for="co">Cost of a leftover unit <output id="coV"></output></label><input type="range" id="co" min="1" max="20" step="1" value="1"></div>
          <div class="readouts num" id="stock" style="font-size:.85rem"></div>
        </div>
        <div class="btns"><button class="btn" id="newd" type="button">New year of actuals</button></div>`,
      notes: `
        <section>
          <h2>What the numbers mean</h2>
          <ul>
            <li>A <b>quantile forecast</b> q<sub>0.9</sub> = 119 means demand should be at or below 119 in 90% of weeks.</li>
            <li>An <b>80% prediction interval</b> runs from the 10% quantile to the 90% quantile.</li>
            <li>For a normal shape: interval = forecast ± z × SD, where z = 1.28 for 80%, 1.645 for 90%, 1.96 for 95%.</li>
            <li><b>Calibration</b>: an honest 80% interval should contain about 80% of actuals over time. Fewer means the model is overconfident.</li>
          </ul>
          <div class="eq">safety stock = q<sub>service level</sub> − point forecast</div>
        </section>
        <section>
          <h2>Choosing the quantile: the newsvendor rule</h2>
          <p>If running out costs c<sub>u</sub> per unit and leftovers cost c<sub>o</sub>, the stock level that minimizes expected cost is the quantile</p>
          <div class="eq">q* = c<sub>u</sub> / (c<sub>u</sub> + c<sub>o</sub>)</div>
          <p>Lost sales four times as costly as leftovers gives q* = 4/5 = 80%: stock to the 80% quantile. Models trained this way minimize the <b>pinball (quantile) loss</b> instead of squared error.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set coverage to 80% and press "New year of actuals" a few times. Inside lands near 80% (about 42 of 52) but wobbles: one year is a small sample.</li>
            <li>Tick "Model underestimates the uncertainty". The band shrinks and many more actuals fall outside. Narrow intervals look confident but fail.</li>
            <li>Switch to the skewed shape. The interval becomes lopsided: more room above than below.</li>
            <li>Raise the lost-sale cost. The stock quantile rises, and the safety stock grows faster than linearly as you approach 99%.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const ts = new Plot($("#pic"), { pad: { l: 46 } });
    const dp = new Plot($("#pid"), { pad: { l: 46, b: 30, t: 10 } });
    let seed = 6;
    const MU = 100;

    // inverse normal CDF (Acklam)
    function qnorm(p) {
      const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
      const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
      const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
      const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
      const q = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
      if (q < 0.02425) { const r = Math.sqrt(-2 * Math.log(q)); return (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1); }
      if (q > 1 - 0.02425) return -qnorm(1 - q);
      const r = q - 0.5, s = r * r;
      return ((((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r) / (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1);
    }
    // demand distribution: mean MU, given SD; skewed = lognormal with same mean and SD
    function dist(sd, shape) {
      if (shape === "normal") return { q: (p) => MU + sd * qnorm(p), draw: (r) => MU + sd * r.normal(), pdf: (x) => Math.exp(-0.5 * ((x - MU) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI)) };
      const s2 = Math.log(1 + (sd / MU) ** 2), m = Math.log(MU) - s2 / 2, s = Math.sqrt(s2);
      return { q: (p) => Math.exp(m + s * qnorm(p)), draw: (r) => Math.exp(m + s * r.normal()), pdf: (x) => (x > 0 ? Math.exp(-((Math.log(x) - m) ** 2) / (2 * s2)) / (x * s * Math.sqrt(2 * Math.PI)) : 0) };
    }

    function draw() {
      const cov = +$("#cov").value / 100, sd = +$("#sd").value, shape = $("#shape").value, under = $("#under").checked;
      const cu = +$("#cu").value, co = +$("#co").value;
      $("#covV").textContent = Math.round(cov * 100) + "%"; $("#sdV").textContent = sd; $("#cuV").textContent = "$" + cu; $("#coV").textContent = "$" + co;
      const truth = dist(sd, shape), model = dist(under ? sd / 2 : sd, shape);
      const lo = model.q((1 - cov) / 2), hi = model.q(1 - (1 - cov) / 2);
      const r = rng(seed), act = Array.from({ length: W }, () => Math.max(0, truth.draw(r)));
      const inside = act.filter((a) => a >= lo && a <= hi).length;

      ts.x = [0.5, W + 0.5]; ts.y = [Math.max(0, Math.min(...act, lo) - 10), Math.max(...act, hi) + 10];
      ts.clear();
      ts.axes({ xLabel: "week", yLabel: "units", xTicks: [1, 13, 26, 39, 52] });
      ts.clip((g) => { g.fillStyle = css("--accent-soft"); g.fillRect(ts.pad.l, ts.sy(hi), ts.iw, ts.sy(lo) - ts.sy(hi)); });
      ts.fn(() => MU, css("--accent"), 2);
      ts.fn(() => hi, css("--accent"), 1, [4, 3]); ts.fn(() => lo, css("--accent"), 1, [4, 3]);
      act.forEach((a, i) => { const out = a < lo || a > hi; ts.dot(i + 1, a, out ? 5 : 3.5, css(out ? "--warm" : "--ink")); });

      const qs = cu / (cu + co), stock = truth.q(qs), mStock = model.q(qs);
      const xs0 = Math.max(0, truth.q(0.001) - 5), xs1 = truth.q(0.999) + 5;
      dp.x = [xs0, xs1];
      let pk = 0; for (let i = 0; i <= 200; i++) pk = Math.max(pk, truth.pdf(xs0 + (i / 200) * (xs1 - xs0)));
      dp.y = [0, pk * 1.15];
      dp.clear();
      dp.axes({ xLabel: "weekly demand", yTicks: [], xCount: 7 });
      dp.clip((g) => {
        g.fillStyle = css("--warm-soft"); g.beginPath(); g.moveTo(dp.sx(mStock), dp.sy(0));
        for (let i = 0; i <= 120; i++) { const x = mStock + (i / 120) * (xs1 - mStock); g.lineTo(dp.sx(x), dp.sy(truth.pdf(x))); }
        g.lineTo(dp.sx(xs1), dp.sy(0)); g.fill();
      });
      dp.fn(truth.pdf, css("--ink"), 2);
      dp.clip((g) => {
        [[lo, "--accent"], [hi, "--accent"], [mStock, "--warm"], [MU, "--muted"]].forEach(([x, c], i) => {
          g.strokeStyle = css(c); g.lineWidth = i === 2 ? 2.5 : 1.5; g.setLineDash(i < 2 ? [4, 3] : []);
          g.beginPath(); g.moveTo(dp.sx(x), dp.pad.t); g.lineTo(dp.sx(x), dp.sy(0)); g.stroke();
        });
        g.setLineDash([]);
      });
      const pOut = 1 - (shape === "normal" ? 0.5 * (1 + erf((mStock - MU) / (sd * Math.SQRT2))) : cdfNum(truth, mStock));
      $("#dcap").innerHTML = `True demand distribution. Dashed teal lines: the ${Math.round(cov * 100)}% interval. Orange line: the stock level. Shaded tail: weeks you'd run out, a ${(pOut * 100).toFixed(1)}% chance each week.`;

      $("#iv").textContent = `${lo.toFixed(1)} to ${hi.toFixed(1)}`;
      $("#inside").textContent = `${inside} of ${W} (${((inside / W) * 100).toFixed(0)}%)`;
      const expected = cov * W, sdc = Math.sqrt(W * cov * (1 - cov));
      $("#verdict").innerHTML = inside < expected - 2 * sdc ? `<span class="pill bad">Overconfident</span>` : inside > expected + 2 * sdc ? `<span class="pill warn">Too cautious</span>` : `<span class="pill ok">Consistent with ${Math.round(cov * 100)}%</span>`;
      const z = qnorm(qs);
      $("#stock").innerHTML =
        `<div class="ro"><span>Best quantile = ${cu}/(${cu}+${co})</span><span>${(qs * 100).toFixed(1)}%</span></div>` +
        (shape === "normal" ? `<div class="ro"><span>z for that quantile</span><span>${z.toFixed(3)}</span></div>
         <div class="ro"><span>Stock = 100 + ${z.toFixed(2)} × ${under ? sd / 2 : sd}</span><span>${mStock.toFixed(1)}</span></div>` : `<div class="ro"><span>Stock (skewed quantile)</span><span>${mStock.toFixed(1)}</span></div>`) +
        `<div class="ro"><span>Safety stock above forecast</span><span>${(mStock - MU).toFixed(1)}</span></div>` +
        `<div class="ro"><span>Actual stock-out chance</span><span>${(pOut * 100).toFixed(1)}%${under ? " (planned " + ((1 - qs) * 100).toFixed(1) + "%)" : ""}</span></div>`;
    }
    function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
    function cdfNum(d, x) { let lo = 0, hi = 1; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (d.q(m) < x) lo = m; else hi = m; } return lo; }

    ["#cov", "#sd", "#shape", "#under", "#cu", "#co"].forEach((s) => $(s).addEventListener("input", draw));
    $("#newd").addEventListener("click", () => { seed++; draw(); });
    draw();
    return watch([ts.c, dp.c], (resized) => { if (resized) { ts.resize(); dp.resize(); } draw(); });
  },
});
