Lab.register({
  id: "ensemble-forecasts",
  group: "Forecasting",
  title: "Ensemble forecasts: why averaging works",
  blurb: "Average several forecasts and the result is often better than any one of them. See the errors cancel month by month, and when they don't.",
  lede: "An ensemble combines several forecasts into one, usually by averaging. It works because different methods make different mistakes: when one is too high, another is often too low, and the average lands closer to the truth. How much you gain depends on one thing above all, how similar the methods' errors are.",
  quiz: [
    ["Three forecasts for one month are 90, 105 and 120. The actual is 100. What are the absolute errors of each, and of the average?", "Errors are 10, 5 and 20, so the methods average 11.7. The ensemble forecast is 105, error 5. It ties the best single method that month, without knowing in advance which one that was."],
    ["Can the average forecast ever have a bigger absolute error than the average of the individual absolute errors?", "No. |mean of errors| ≤ mean of |errors| always (the triangle inequality). The ensemble is never worse than the typical member. It can be worse than the single best member, though."],
    ["Five methods all have the same error size and their errors are perfectly correlated (ρ = 1). How much does averaging help?", "Not at all. √((1 + 4 × 1) / 5) = 1, so the ensemble error equals each member's. Averaging only helps when the errors differ."],
    ["Why might an equal-weight average beat 'optimal' weights estimated from past errors?", "Weights estimated from a short history are noisy, and past winners don't always stay winners. Equal weights have no estimation error. Forecasters call this the forecast combination puzzle."],
    ["A random forest is an ensemble too. What makes its trees' errors less correlated?", "Each tree sees a different bootstrap sample and a random subset of features at each split, so they make different mistakes, and the vote averages those out."],
  ],
  diy: {
    intro: "Forecasts from three methods in C2:E25, actuals in B2:B25.",
    steps: [
      ["Simple average ensemble.", "F2: =AVERAGE(C2:E2)"],
      ["Median ensemble (robust to one bad method).", "G2: =MEDIAN(C2:E2)"],
      ["RMSE of each method and the ensemble.", "=SQRT(SUMXMY2($B$2:$B$25,C2:C25)/24)"],
      ["Correlation of two methods' errors: lower correlation means more gain from averaging.", "=CORREL(B2:B25-C2:C25,B2:B25-D2:D25)"],
      ["Inverse-error weights from a past period.", "w_i: =(1/RMSE_i)/SUM(1/RMSE_1,1/RMSE_2,1/RMSE_3)\n=SUMPRODUCT(C2:E2,weights)"],
      ["Theory check for k methods with equal error σ and error correlation ρ.", "=σ*SQRT((1+(k-1)*ρ)/k)"],
    ],
  },
  deeper: [
    ["FPP3: Forecast combinations", "https://otexts.com/fpp3/combinations.html", "Hyndman & Athanasopoulos on averaging forecasts, with R code"],
    ["The M4 Competition results (2020)", "https://doi.org/10.1016/j.ijforecast.2019.04.014", "most top methods were combinations"],
    ["Ensemble learning — Wikipedia", "https://en.wikipedia.org/wiki/Ensemble_learning", "bagging, boosting and stacking in machine learning"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 40 L30 30" /><path d="M30 30 L92 10" opacity=".4" stroke-dasharray="4 3"/><path d="M30 30 L92 50" opacity=".4" stroke-dasharray="4 3"/><path d="M30 30 L92 22" opacity=".4" stroke-dasharray="4 3"/><path d="M30 30 L92 28" stroke-width="3"/><circle cx="92" cy="30" r="3" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const TR = 24, H = 12, N = TR + H, REPS = 400;
    const NAMES = ["Model A", "Model B", "Model C", "Model D", "Model E", "Model F"];
    const COLS = ["--accent", "--violet", "--warm", "--good", "#c2457a", "#b08a1e"];
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="enc" aria-label="Actuals, each model's forecast and the ensemble over the test year"></canvas>
          <div class="legend" id="leg"></div>
          <figcaption>The test year. Thin dashed lines are the individual models; the thick line is the ensemble.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="enk" aria-label="Ensemble error against the number of models"></canvas>
          <figcaption id="kcap"></figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Errors cancelling, month by month</h4>
          <div style="overflow-x:auto"><table id="mon" style="width:100%;border-collapse:collapse;font-size:.8rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono)"></table></div>
          <p class="hint" style="margin-top:8px">Error = actual − forecast. Green ensemble cells beat the average member that month.</p>
        </div>`,
      panel: `
        <div class="ctrl"><label for="k">Number of models <output id="kV"></output></label><input type="range" id="k" min="2" max="6" step="1" value="3"></div>
        <div class="ctrl"><label for="rho">Error correlation ρ <output id="rhoV"></output></label><input type="range" id="rho" min="0" max="0.95" step="0.05" value="0.3"></div>
        <div class="ctrl"><label for="gap">Quality gap between models <output id="gapV"></output></label><input type="range" id="gap" min="0" max="2" step="0.1" value="0.5"></div>
        <div class="ctrl"><label for="bias">Opposite biases <output id="biasV"></output></label><input type="range" id="bias" min="0" max="15" step="1" value="5"></div>
        <div class="ctrl"><label>Combine by</label>
          <div class="seg" id="wt"><button type="button" data-v="eq" aria-pressed="true">Equal</button><button type="button" data-v="inv" aria-pressed="false">Inverse error</button><button type="button" data-v="best" aria-pressed="false">Pick best</button></div></div>
        <div class="readouts" id="ro"></div>
        <p class="hint" id="roNote"></p>
        <div class="btns"><button class="btn" id="newd" type="button">New random year</button></div>`,
      notes: `
        <section>
          <h2>Why averaging helps</h2>
          <p>Write each model's error as a shared part plus its own part. Averaging k models leaves the shared part alone but shrinks the individual parts, because they point in different directions. With equal-sized errors σ and correlation ρ between any two models:</p>
          <div class="eq">RMSE(ensemble) = σ × √((1 + (k − 1)ρ) / k)</div>
          <ul>
            <li>ρ = 0, k = 4: error halves (√(1/4) = 0.5).</li>
            <li>ρ = 0.5, k = 4: √(2.5/4) = 0.79, a 21% cut.</li>
            <li>ρ = 1: no gain at all, however many models you add.</li>
          </ul>
          <p>Biases cancel too: if one model runs 5 high and another 5 low, their average has no bias.</p>
        </section>
        <section>
          <h2>Three ways to combine</h2>
          <ul>
            <li><b>Equal weights:</b> the simple average. Nothing to estimate, so nothing to get wrong. Hard to beat in practice.</li>
            <li><b>Inverse-error weights:</b> weight each model by 1 / MSE on the training year, so better models count more. Helps when models really differ in quality; can overfit when they don't.</li>
            <li><b>Pick the best:</b> use whichever model did best on the training year. Throws away the averaging benefit and is fooled by luck.</li>
          </ul>
          <p>Other combinations: the <b>median</b> (robust to one wild model), <b>trimmed mean</b>, and <b>stacking</b>, where a second model learns how to combine the first ones.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set ρ to 0 and step k from 2 to 6. Watch the ensemble's dot follow the theory curve down.</li>
            <li>Set ρ to 0.9. Adding models now barely helps, because they all make the same mistakes.</li>
            <li>Set the quality gap to 2. Model A is now much better than the rest. Equal weights get dragged down; inverse-error weights hold up.</li>
            <li>With the gap at 0, compare Equal with Pick best. Picking is often worse, because the "best" on the training year was partly luck.</li>
            <li>Raise opposite biases to 15 and look at the monthly table: the ensemble's bias is near zero even though every member is biased.</li>
          </ol>
          <p>In the <a href="#forecast-lab">forecast lab</a>, both ensembles run on real methods. In machine learning, a <a href="#random-forest">random forest</a> is an ensemble of trees.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pF = new Plot($("#enc"), { x: [-0.5, H - 0.5], pad: { l: 50 } });
    const pK = new Plot($("#enk"), { x: [0.6, 6.4], y: [0, 1.15], pad: { l: 50 } });
    let seed = 5, wmode = "eq", cur = null, mc = null;

    const cfg = () => ({ k: +$("#k").value, rho: +$("#rho").value, gap: +$("#gap").value, bias: +$("#bias").value });
    const SIG = 10;

    // One simulated "world": actuals for 36 months and k model forecasts.
    function world(r, c) {
      const truth = Array.from({ length: N }, (_, t) => 200 + 1.5 * t + 30 * Math.sin((2 * Math.PI * (t - 3)) / 12));
      const act = truth.map((v) => v + 4 * r.normal());
      const sig = Array.from({ length: c.k }, (_, i) => SIG * (1 + (c.gap * i) / Math.max(1, c.k - 1)));
      const bias = Array.from({ length: c.k }, (_, i) => (c.k === 1 ? 0 : c.bias * (1 - (2 * i) / (c.k - 1))));
      const F = sig.map(() => []);
      for (let t = 0; t < N; t++) {
        const shared = r.normal();
        for (let i = 0; i < c.k; i++) F[i].push(act[t] - bias[i] + sig[i] * (Math.sqrt(c.rho) * shared + Math.sqrt(1 - c.rho) * r.normal()));
      }
      return { act, F, sig, bias };
    }
    function weights(w, c, mode) {
      const mse = w.F.map((f) => f.slice(0, TR).reduce((s, v, t) => s + (w.act[t] - v) ** 2, 0) / TR);
      if (mode === "eq") return mse.map(() => 1 / c.k);
      if (mode === "best") { const b = mse.indexOf(Math.min(...mse)); return mse.map((_, i) => (i === b ? 1 : 0)); }
      const inv = mse.map((m) => 1 / m), s = inv.reduce((a, b) => a + b, 0);
      return inv.map((v) => v / s);
    }
    const rmse = (act, f) => Math.sqrt(f.reduce((s, v, i) => s + (act[i] - v) ** 2, 0) / f.length);

    function compute() {
      const c = cfg();
      const w = world(rng(seed), c), wt = weights(w, c, wmode);
      const test = (f) => f.slice(TR);
      const ens = w.act.map((_, t) => w.F.reduce((s, f, i) => s + wt[i] * f[t], 0));
      cur = { c, w, wt, ens, act: test(w.act), Ft: w.F.map(test), Et: test(ens) };
      // Monte Carlo over many worlds for steady numbers, for every k so the chart can show the curve
      const r = rng(999 + seed);
      mc = [];
      for (let k = 1; k <= 6; k++) {
        const ck = { ...c, k };
        let sEns = 0, sAvgMember = 0, sBest = 0;
        for (let rep = 0; rep < REPS / 2; rep++) {
          const ww = world(r, ck), wts = weights(ww, ck, wmode), a = ww.act.slice(TR);
          const e = a.map((_, j) => ww.F.reduce((s, f, i) => s + wts[i] * f[TR + j], 0));
          const rm = ww.F.map((f) => rmse(a, f.slice(TR)));
          sEns += rmse(a, e); sAvgMember += rm.reduce((x, y) => x + y, 0) / k; sBest += Math.min(...rm);
        }
        mc.push({ k, ens: sEns / (REPS / 2), avg: sAvgMember / (REPS / 2), best: sBest / (REPS / 2) });
      }
    }

    function draw() {
      const { c, w, wt, act, Ft, Et } = cur;
      $("#kV").textContent = c.k; $("#rhoV").textContent = c.rho.toFixed(2);
      $("#gapV").textContent = c.gap ? `worst ${(1 + c.gap).toFixed(1)}× best` : "all equal";
      $("#biasV").textContent = c.bias ? `±${c.bias}` : "none";
      const xs = act.map((_, i) => i);
      const all = act.concat(...Ft, Et);
      pF.y = [Math.min(...all) - 10, Math.max(...all) + 10];
      pF.clear();
      pF.axes({ xTicks: xs, xFormat: (v) => MON[(TR + v) % 12], yLabel: "units" });
      const colr = (x) => (x.startsWith("--") ? css(x) : x);
      Ft.forEach((f, i) => pF.path(xs, f, colr(COLS[i]), 1.5, [5, 4], wt[i] > 0.001 ? 0.9 : 0.3));
      pF.path(xs, act, css("--ink"), 2.5);
      act.forEach((a, i) => pF.dot(i, a, 4, css("--ink"), css("--surface")));
      pF.path(xs, Et, css("--bad"), 3.5);
      $("#leg").innerHTML = `<span><i style="background:var(--ink)"></i>Actual</span><span><i style="background:var(--bad);height:5px"></i>Ensemble</span>` +
        Ft.map((_, i) => `<span><i style="background:${colr(COLS[i])}"></i>${NAMES[i]} <span style="font-family:var(--font-mono);font-size:.75rem">w=${wt[i].toFixed(2)}</span></span>`).join("");

      // k chart: theory vs simulated ensemble, relative to the average member's RMSE
      pK.clear();
      pK.axes({ xTicks: [1, 2, 3, 4, 5, 6], yTicks: [0, 0.25, 0.5, 0.75, 1], xLabel: "number of models k", yLabel: "ensemble RMSE ÷ typical model RMSE", yFormat: (v) => v.toFixed(2) });
      pK.fn((k) => Math.sqrt((1 + (k - 1) * c.rho) / k), css("--muted"), 2, [5, 4]);
      mc.forEach((m) => pK.dot(m.k, m.ens / m.avg, m.k === c.k ? 7 : 4.5, css("--bad"), css("--surface")));
      pK.path([0.6, 6.4], [1, 1], css("--line"), 1);
      $("#kcap").innerHTML = `Dashed: theory √((1 + (k − 1)ρ)/k) for equal, unbiased models. Red dots: simulated, with your settings and weighting, averaged over ${REPS / 2} years each. Below 1 means the ensemble beats a typical member.`;

      const m = mc[c.k - 1], wins = m.ens < m.best;
      $("#ro").innerHTML = `
        <div class="ro"><b>Typical model RMSE</b><span class="num">${fmt(m.avg, 1)}</span></div>
        <div class="ro"><b>Best single model</b><span class="num">${fmt(m.best, 1)}</span></div>
        <div class="ro"><b>Ensemble RMSE</b><span class="pill ${wins ? "ok" : m.ens < m.avg ? "warn" : "bad"}">${fmt(m.ens, 1)}</span></div>`;
      $("#roNote").textContent = `Averages over ${REPS / 2} simulated test years. "Best single model" is the one that turned out best each year, known only with hindsight. ${wins ? "The ensemble beats even that." : m.ens < m.avg ? "The ensemble beats a typical model, but not the hindsight best." : "Here the ensemble doesn't help."}`;

      const hd = (t) => `<th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted);font-family:var(--font-body)">${t}</th>`;
      const td = (t, extra = "") => `<td style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--grid);${extra}">${t}</td>`;
      const sg = (v) => (v > 0 ? "+" : "") + v.toFixed(0);
      let sumAbs = Ft.map(() => 0), sumE = 0, sumBias = Ft.map(() => 0), sumEB = 0;
      const rows = act.map((a, j) => {
        const errs = Ft.map((f) => a - f[j]), ee = a - Et[j], avgAbs = errs.reduce((s, v) => s + Math.abs(v), 0) / errs.length;
        errs.forEach((e, i) => { sumAbs[i] += Math.abs(e); sumBias[i] += e; }); sumE += Math.abs(ee); sumEB += ee;
        return `<tr>${td(MON[(TR + j) % 12], "font-family:var(--font-body)")}${td(a.toFixed(0), "font-weight:600")}${errs.map((e, i) => td(sg(e), `color:${colr(COLS[i])}`)).join("")}${td(avgAbs.toFixed(1), "color:var(--muted)")}${td(Et[j].toFixed(0))}${td(sg(ee), `font-weight:600;${Math.abs(ee) < avgAbs ? "color:var(--good)" : "color:var(--bad)"}`)}</tr>`;
      }).join("");
      $("#mon").innerHTML = `<tr>${hd("month")}${hd("actual")}${Ft.map((_, i) => hd(NAMES[i] + " error")).join("")}${hd("avg |error|")}${hd("ensemble")}${hd("ens. error")}</tr>` + rows +
        `<tr style="font-weight:600">${td("MAE", "font-family:var(--font-body)")}${td("")}${sumAbs.map((s) => td((s / H).toFixed(1))).join("")}${td((sumAbs.reduce((a, b) => a + b, 0) / H / Ft.length).toFixed(1), "color:var(--muted)")}${td("")}${td((sumE / H).toFixed(1), "color:var(--bad)")}</tr>` +
        `<tr>${td("bias", "font-family:var(--font-body)")}${td("")}${sumBias.map((s) => td(sg(s / H))).join("")}${td("")}${td("")}${td(sg(sumEB / H))}</tr>`;
    }

    const rerun = () => { compute(); draw(); };
    ["#k", "#rho", "#gap", "#bias"].forEach((s) => $(s).addEventListener("input", rerun));
    $("#wt").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      wmode = b.dataset.v; $("#wt").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); rerun();
    }));
    $("#newd").addEventListener("click", () => { seed++; rerun(); });

    rerun();
    return watch([pF.c, pK.c], (resized) => { if (resized) { pF.resize(); pK.resize(); } draw(); });
  },
});
