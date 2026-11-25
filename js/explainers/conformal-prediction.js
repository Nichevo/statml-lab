Lab.register({
  id: "conformal-prediction",
  group: "Forecasting",
  title: "Conformal prediction: intervals that keep their promise",
  blurb: "Wrap any model's predictions in a range that covers the truth 90% of the time, with no assumptions about the error shape. Calibrate on held-out data, then see where plain conformal falls short and how the adaptive version fixes it.",
  lede: "A model gives a number; you want a range you can trust. The usual ±1.645 × SD assumes errors are normal and the same size everywhere. Conformal prediction skips the assumption: score how wrong the model was on data it hasn't seen (the calibration set), take the right quantile of those scores, and use it as the half-width. If new cases look like the calibration cases, the coverage is guaranteed, for any model and any error shape.",
  quiz: [
    ["With 99 calibration points and a 90% target, which score sets the half-width?", "The ⌈(99 + 1) × 0.9⌉ = 90th smallest absolute error. The +1 accounts for the new point itself; it is what makes the guarantee exact rather than approximate."],
    ["What does conformal prediction guarantee, and what doesn't it?", "On average over new cases, coverage is at least the target, if calibration and new cases are exchangeable (drawn the same way). It does not guarantee coverage for each kind of case separately: the range can be too wide for easy cases and too narrow for hard ones."],
    ["Why use separate calibration data instead of the training residuals?", "The model has been fitted to its training data, so its errors there are too small. Ranges built from them under-cover."],
    ["How does adaptive (normalised) conformal help when errors grow with the prediction?", "Divide each calibration error by an estimate of how hard that case is (a predicted spread σ̂(x)), take the quantile of those ratios, and multiply back: ŷ ± q × σ̂(x). Ranges widen where errors are big and shrink where they're small."],
    ["Your demand pattern shifts after calibration. What happens to coverage?", "The guarantee no longer holds: if errors have grown, coverage falls below target. For time series, recalibrate on a rolling window, or use adaptive conformal inference, which nudges α up or down after each miss or hit."],
  ],
  diy: {
    intro: "Fit your model on one block of data. Keep a separate calibration block: actuals in B2:B101, model predictions in C2:C101. Target coverage 90% in F1.",
    steps: [
      ["Absolute error on each calibration row.", "D2: =ABS(B2-C2)"],
      ["Which ranked error to use: ⌈(n + 1) × coverage⌉.", "F2: =CEILING((COUNT(D2:D101)+1)*F1, 1)"],
      ["The half-width q is that ranked error (if F2 > n, the range is unbounded: get more calibration data).", "F3: =SMALL(D2:D101, F2)"],
      ["Range for a new prediction in C200.", "lower: =C200-$F$3   upper: =C200+$F$3"],
      ["Adaptive version: with a spread estimate s for each row in E2:E101, score the scaled errors instead.", "G2: =D2/E2   q: =SMALL(G2:G101, F2)   range: =C200 ± q*E200"],
      ["Check on a test block: share of actuals inside their ranges.", "=AVERAGE(--(ABS(B300:B499-C300:C499)<=$F$3))"],
    ],
  },
  deeper: [
    ["Angelopoulos & Bates (2021), A gentle introduction to conformal prediction and distribution-free uncertainty quantification", "https://arxiv.org/abs/2107.07511", "the most readable tutorial, with code"],
    ["Lei, G'Sell, Rinaldo, Tibshirani & Wasserman (2018), Distribution-free predictive inference for regression, Journal of the American Statistical Association 113(523)", "https://doi.org/10.1080/01621459.2017.1307116", "split conformal and locally weighted conformal for regression"],
    ["Vovk, Gammerman & Shafer (2005), Algorithmic Learning in a Random World, Springer", "https://doi.org/10.1007/b106715", "the original book"],
    ["Romano, Patterson & Candès (2019), Conformalized quantile regression, NeurIPS", "https://arxiv.org/abs/1905.03222", "conformal on top of quantile forecasts, for ranges that adapt"],
    ["Gibbs & Candès (2021), Adaptive conformal inference under distribution shift, NeurIPS", "https://arxiv.org/abs/2106.00170", "keeping coverage when the data drifts, as in forecasting"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 44 L88 14" /><path d="M8 50 L88 4 M8 38 L88 24" stroke-dasharray="4 3"/><circle cx="20" cy="42" r="2.5" fill="currentColor"/><circle cx="34" cy="31" r="2.5" fill="currentColor"/><circle cx="48" cy="34" r="2.5" fill="currentColor"/><circle cx="62" cy="18" r="2.5" fill="currentColor"/><circle cx="76" cy="26" r="2.5"/><path d="M8 58 H90" stroke-opacity=".5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, qnorm } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const MS = [["norm", "Normal ±z·SD", "--violet"], ["conf", "Conformal", "--warm"], ["adapt", "Adaptive conformal", "--accent"]];
    const NT = 200, NTEST = 1000, BINS = 5;
    let seed = 7, meth = "adapt", noise = "skew";
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("New weeks and their 90% ranges")}</div><canvas id="c1" style="height:320px" aria-label="Scatter of demand against promotion depth with the prediction range of the chosen method"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "Calibration errors, sorted", 260, "Sorted calibration scores with the chosen quantile marked"), fig("c3", "Coverage by promotion depth", 260, "Coverage of each method in five bands of promotion depth"))}
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4("Over 400 repeats with fresh data")}<div id="tbl"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Weekly demand for a product against promotion depth (0 to 10% off). A straight-line model was fitted on ${NT} past weeks. Bigger promotions give bigger, noisier spikes.</p>
        <div class="ctrl"><label>Range shown on the chart</label><div class="seg" id="ms">${MS.map(([k, n]) => `<button type="button" data-m="${k}" aria-pressed="${k === meth}">${n}</button>`).join("")}</div></div>
        <div class="ctrl"><label>Shape of the errors</label><div class="seg" id="ns"><button type="button" data-n="norm" aria-pressed="false">Normal</button><button type="button" data-n="skew" aria-pressed="true">Skewed (spikes up)</button><button type="button" data-n="heavy" aria-pressed="false">Heavy tails</button></div></div>
        <div class="ctrl"><label for="cov">Target coverage <output id="covV"></output></label><input type="range" id="cov" min="0.5" max="0.98" step="0.01" value="0.9"></div>
        <div class="ctrl"><label for="ncal">Calibration weeks <output id="ncalV"></output></label><input type="range" id="ncal" min="9" max="500" step="1" value="100"></div>
        <div class="ctrl"><label for="het">How much noise grows with promotion <output id="hetV"></output></label><input type="range" id="het" min="0" max="1" step="0.05" value="0.7"></div>
        <label style="display:flex;gap:8px;align-items:center;font-size:.9rem"><input type="checkbox" id="drift"> Noise grows 50% after calibration (drift)</label>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New data</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The recipe, step by step</h2>
          <ol>
            <li>Split past data: fit the model on one part, hold back a calibration part it never sees.</li>
            <li>Score each calibration case by how wrong the model was: |actual − prediction|.</li>
            <li>With n calibration scores and target coverage 1 − α, take the ⌈(n + 1)(1 − α)⌉-th smallest. Call it q.</li>
            <li>For any new case: prediction ± q.</li>
          </ol>
          <p>Why it works: if a new case is drawn the same way as the calibration cases, its score is equally likely to land in any of the n + 1 rank positions. So the chance it's no bigger than the k-th smallest of the others is k / (n + 1) ≥ 1 − α. No normal distribution, no model assumptions. The model can be a line, a <a href="#random-forest">random forest</a> or a <a href="#transformer">transformer</a>.</p>
        </section>
        <section>
          <h2>Average coverage, not every case</h2>
          <p>The guarantee is on average over new cases. Plain conformal gives every case the same width, so where noise is small it covers nearly always, and where noise is big it misses more than it should. Watch the coverage-by-depth chart with the noise slider high. Adaptive conformal scores errors relative to a spread model σ̂(x) (here a line fitted to the training errors' sizes), so the range scales with the expected error. Conformalised quantile regression goes further: fit <a href="#pinball-crps">quantile</a> models for the ends, then conformal-correct them.</p>
        </section>
        <section>
          <h2>In forecasting</h2>
          <p>Time series break the "drawn the same way" condition: errors drift with season, regime and horizon. Practical fixes: calibrate on recent <a href="#backtesting">backtest</a> errors, per horizon; recalibrate on a rolling window; or use adaptive conformal inference, which raises α after a hit and lowers it after a miss so long-run coverage tracks the target. Tick the drift box to see what happens without a fix. See <a href="#prediction-intervals">prediction intervals</a> for turning a range into stock.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Switch the error shape: with normal errors the normal range lands on 90% overall, but with skewed errors it covers about 94% (wider than needed), and with heavy tails at a 98% target it falls short at about 96.5%. Both conformal ranges hit the target overall in every case.</li>
            <li>Raise the noise slider to 1 and compare plain and adaptive conformal on the coverage-by-depth chart: plain over-covers small promotions and under-covers big ones.</li>
            <li>Drop calibration weeks to 9: the 90% half-width is set by the very largest of only 9 errors. Coverage still averages about 90%, but it swings widely from one data set to the next: in the unluckiest one in twenty it's around 70% (the table's “worst 5%” column).</li>
            <li>Tick drift: every method's coverage falls (both conformal ranges to about 75–78%), because the calibration errors no longer describe the future.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ cov: +$("#cov").value, ncal: +$("#ncal").value, het: +$("#het").value, drift: $("#drift").checked, noise });
    const sdAt = (x, het) => (1 - het) * 6 + het * (1 + 1.4 * x);
    const err = (r, kind) => { const z = r.normal(); if (kind === "norm") return z; if (kind === "skew") return (Math.exp(0.8 * z) - Math.exp(0.32)) / 1.304; const c = r.normal() ** 2 + r.normal() ** 2 + r.normal() ** 2; return z / Math.sqrt(c / 3) / Math.sqrt(3); };
    const draw1 = (r, n, p, mult) => Array.from({ length: n }, () => { const x = 10 * r(); return { x, y: 40 + 5 * x + mult * sdAt(x, p.het) * err(r, p.noise) }; });
    const ols = (X, Y) => { const n = X.length, mx = X.reduce((a, b) => a + b, 0) / n, my = Y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0; X.forEach((x, i) => { sxy += (x - mx) * (Y[i] - my); sxx += (x - mx) ** 2; }); const b = sxy / sxx; return [my - b * mx, b]; };
    function build(r, p) {
      const tr = draw1(r, NT, p, 1), cal = draw1(r, p.ncal, p, 1), test = draw1(r, NTEST, p, p.drift ? 1.5 : 1);
      const [a, b] = ols(tr.map((d) => d.x), tr.map((d) => d.y)), f = (x) => a + b * x;
      const res = tr.map((d) => d.y - f(d.x)), s = Math.sqrt(res.reduce((t, v) => t + v * v, 0) / (NT - 2));
      const [sa, sb] = ols(tr.map((d) => d.x), res.map((v) => Math.abs(v) * 1.2533)), sig = (x) => Math.max(0.5, sa + sb * x);
      const n = p.ncal, k = Math.ceil((n + 1) * p.cov);
      const s1 = cal.map((d) => Math.abs(d.y - f(d.x))).sort((u, v) => u - v), s2 = cal.map((d) => Math.abs(d.y - f(d.x)) / sig(d.x)).sort((u, v) => u - v);
      const q1 = k > n ? Infinity : s1[k - 1], q2 = k > n ? Infinity : s2[k - 1], z = qnorm(0.5 + p.cov / 2);
      const half = { norm: () => z * s, conf: () => q1, adapt: (x) => q2 * sig(x) };
      const inside = (m, d) => Math.abs(d.y - f(d.x)) <= half[m](d.x);
      const st = {}; MS.forEach(([m]) => { const bins = Array.from({ length: BINS }, () => [0, 0]); let c = 0, w = 0; test.forEach((d) => { const ok = inside(m, d); c += ok; w += 2 * half[m](d.x); const bi = Math.min(BINS - 1, Math.floor(d.x / (10 / BINS))); bins[bi][0] += ok; bins[bi][1]++; }); st[m] = { cov: c / NTEST, w: w / NTEST, bins: bins.map(([o, t]) => (t ? o / t : NaN)) }; });
      return { tr, cal, test, f, s, sig, k, n, s1, s2, q1, q2, z, half, inside, st };
    }
    let D;
    const C1 = new Plot($("#c1"), { pad: { l: 56, b: 38 } }), C2 = new Plot($("#c2"), { pad: { l: 50, b: 38 } }), C3 = new Plot($("#c3"), { pad: { l: 50, b: 38 } });
    function d1(p) {
      const col = css(MS.find((m) => m[0] === meth)[2]), pts = D.test.slice(0, 300);
      C1.resize(); C1.x = [0, 10]; const ys = pts.map((d) => d.y); C1.y = [Math.min(0, Math.min(...ys)), Math.max(...ys) * 1.05]; C1.clear();
      C1.axes({ xLabel: "promotion depth (% off)", yLabel: "weekly demand", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const xs = Array.from({ length: 41 }, (_, i) => i / 4), hw = (x) => Math.min(1e4, D.half[meth](x)), g = C1.ctx;
      C1.clip(() => { g.beginPath(); xs.forEach((x, i) => (i ? g.lineTo : g.moveTo).call(g, C1.sx(x), C1.sy(D.f(x) + hw(x)))); [...xs].reverse().forEach((x) => g.lineTo(C1.sx(x), C1.sy(D.f(x) - hw(x)))); g.closePath(); g.fillStyle = col; g.globalAlpha = 0.14; g.fill(); g.globalAlpha = 1; });
      C1.path(xs, xs.map((x) => D.f(x) + hw(x)), col, 1.5, [5, 4]); C1.path(xs, xs.map((x) => D.f(x) - hw(x)), col, 1.5, [5, 4]); C1.path(xs, xs.map(D.f), css("--ink"), 2);
      let miss = 0; pts.forEach((d) => { const ok = D.inside(meth, d); if (!ok) miss++; C1.dot(d.x, d.y, ok ? 2.5 : 3.5, ok ? css("--muted") : css("--bad"), ok ? css("--muted") : css("--bad")); });
      g.font = `600 11px ${css("--font-body")}`; g.textAlign = "left"; g.textBaseline = "middle"; const lx = C1.pad.l + 12, ly = C1.pad.t + 30;
      g.strokeStyle = css("--ink"); g.lineWidth = 2; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 22, ly); g.stroke(); g.fillStyle = css("--ink"); g.fillText("model prediction", lx + 28, ly);
      g.strokeStyle = col; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(lx, ly + 18); g.lineTo(lx + 22, ly + 18); g.stroke(); g.setLineDash([]); g.fillStyle = col; g.fillText(`${MS.find((m) => m[0] === meth)[1]} range`, lx + 28, ly + 18);
      g.fillStyle = css("--bad"); g.beginPath(); g.arc(lx + 11, ly + 36, 3.5, 0, 7); g.fill(); g.fillText("outside its range", lx + 28, ly + 36);
      const name = MS.find((m) => m[0] === meth)[1];
      $("#c1Cap").innerHTML = `Showing 300 of ${NTEST} new weeks${p.drift ? " (noise 50% bigger than in calibration)" : ""}. ${miss} of 300 fall outside the ${name} range (${fmt((miss / 3), 1)}%); the target is ${fmt((1 - p.cov) * 100, 0)}%. ${meth === "norm" ? `Half-width = z × SD = ${fmt(D.z, 3)} × ${fmt(D.s, 1)} = ${fmt(D.z * D.s, 1)} everywhere.` : meth === "conf" ? (isFinite(D.q1) ? `Half-width = q = ${fmt(D.q1, 1)} everywhere.` : "With this few calibration weeks the range is unbounded.") : isFinite(D.q2) ? `Half-width = q × σ̂(x) = ${fmt(D.q2, 2)} × σ̂(x): ${fmt(D.q2 * D.sig(1), 1)} at 1% off, ${fmt(D.q2 * D.sig(9), 1)} at 9% off.` : "With this few calibration weeks the range is unbounded."}`;
    }
    function d2(p) {
      const ad = meth === "adapt", S = ad ? D.s2 : D.s1, q = ad ? D.q2 : D.q1, n = S.length, col = css(ad ? "--accent" : "--warm");
      C2.resize(); C2.x = [0, n + 1]; C2.y = [0, S[n - 1] * 1.08]; C2.clear();
      C2.axes({ xLabel: "rank (smallest error first)", yLabel: ad ? "|error| / σ̂(x)" : "|error|", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, ad ? 1 : 0), xCount: 5 });
      if (isFinite(q)) { C2.path([0, n + 1], [q, q], col, 1.5, [5, 4]); C2.path([D.k, D.k], C2.y, col, 1, [2, 3]); }
      const r = n > 200 ? 1.6 : n > 60 ? 2.4 : 3.5; S.forEach((v, i) => C2.dot(i + 1, v, r, i + 1 <= D.k ? col : css("--surface"), col));
      const g = C2.ctx; g.font = `600 11px ${css("--font-body")}`; g.fillStyle = col; g.textAlign = "left"; g.textBaseline = "bottom";
      if (isFinite(q)) g.fillText(`q = ${fmt(q, ad ? 2 : 1)}`, C2.pad.l + 6, C2.sy(q) - 3);
      $("#c2Cap").innerHTML = `${ad ? "Adaptive conformal: each error divided by the spread model σ̂(x)." : "Plain conformal: absolute errors."} ${n} calibration weeks, target ${fmt(p.cov * 100, 0)}%, so use rank ⌈(${n} + 1) × ${p.cov}⌉ = ${D.k}${D.k > n ? `, which is more than ${n}: the range is unbounded. Add calibration weeks or lower the target.` : `. Filled dots fall at or below it; q is the value at that rank.`}`;
    }
    function d3(p) {
      C3.resize(); C3.x = [0, BINS]; C3.y = [Math.min(0.5, ...MS.flatMap(([m]) => D.st[m].bins).filter(isFinite).map((v) => Math.floor(v * 10) / 10)), 1]; C3.clear();
      C3.axes({ xLabel: "promotion depth (% off)", xTicks: [0, 1, 2, 3, 4, 5], xFormat: (v) => fmt(v * 2, 0), yFormat: (v) => fmt(v * 100, 0) + "%" });
      C3.path([0, BINS], [p.cov, p.cov], css("--ink"), 1.2, [4, 3]);
      const g = C3.ctx, bw = (C3.sx(1) - C3.sx(0)) / 4;
      MS.forEach(([m, , c], j) => D.st[m].bins.forEach((v, i) => { if (!isFinite(v)) return; const x0 = C3.sx(i) + bw * (0.5 + j); g.fillStyle = css(c); g.globalAlpha = 0.85; g.fillRect(x0, C3.sy(v), bw * 0.9, C3.sy(C3.y[0]) - C3.sy(v)); g.globalAlpha = 1; }));
      const b = (m) => D.st[m].bins, lo = (m) => fmt(b(m)[0] * 100, 0), hi = (m) => fmt(b(m)[BINS - 1] * 100, 0);
      const sw = MS.map(([, n, c]) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px"><span style="width:10px;height:10px;background:var(${c});display:inline-block"></span>${n.replace(" ±z·SD", "")}</span>`).join("");
      $("#c3Cap").innerHTML = `${sw}<br>Dashed: the ${fmt(p.cov * 100, 0)}% target. From the smallest to the biggest promotions, plain conformal covers ${lo("conf")}% → ${hi("conf")}%; adaptive conformal ${lo("adapt")}% → ${hi("adapt")}%; normal ${lo("norm")}% → ${hi("norm")}%.`;
    }
    let cache = {};
    function tbl(p) {
      const key = JSON.stringify(p);
      if (!cache[key]) { const r = rng(99), A = {}; MS.forEach(([m]) => (A[m] = { c: [], w: 0, b: Array(BINS).fill(0) })); const reps = 400;
        for (let i = 0; i < reps; i++) { const E = build(r, p); MS.forEach(([m]) => { A[m].c.push(E.st[m].cov); A[m].w += isFinite(E.st[m].w) ? E.st[m].w : NaN; E.st[m].bins.forEach((v, j) => (A[m].b[j] += v)); }); }
        MS.forEach(([m]) => { const c = A[m].c.sort((u, v) => u - v); A[m] = { mean: c.reduce((s, v) => s + v, 0) / reps, p5: c[Math.floor(reps * 0.05)], w: A[m].w / reps, worst: Math.min(...A[m].b) / reps }; }); cache = { [key]: A }; }
      const A = cache[key], pill = (v) => `<span class="pill ${v < p.cov - 0.03 ? "bad" : v < p.cov - 0.015 ? "warn" : "ok"}">${fmt(v * 100, 1)}%</span>`;
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);width:100%"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 6px;text-align:left">method</th><th style="padding:3px 6px">average coverage</th><th style="padding:3px 6px">worst 5% of repeats</th><th style="padding:3px 6px">worst promotion band</th><th style="padding:3px 6px">average width</th></tr></thead><tbody>` +
        MS.map(([m, n]) => `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 6px;text-align:left;font-family:var(--font-body)">${n}</td><td style="padding:3px 6px">${pill(A[m].mean)}</td><td style="padding:3px 6px">${fmt(A[m].p5 * 100, 1)}%</td><td style="padding:3px 6px">${pill(A[m].worst)}</td><td style="padding:3px 6px">${isFinite(A[m].w) ? fmt(A[m].w, 1) : "∞"}</td></tr>`).join("") +
        `</tbody></table><p class="hint" style="margin:8px 0 0">Each repeat draws new training, calibration and test weeks. “Worst promotion band” is the coverage, averaged over repeats, of whichever of the five bands of promotion depth is covered least. Conformal's promise is the average column${p.drift ? ", and only without drift" : ""}.</p>`;
    }
    function readouts(p) {
      const st = D.st, w = (m) => (isFinite(st[m].w) ? fmt(st[m].w, 1) : "∞");
      $("#ro").innerHTML = MS.map(([m, n]) => `<div class="ro"><b>${n}</b><span class="num">${fmt(st[m].cov * 100, 1)}% covered, width ${w(m)}</span></div>`).join("");
    }
    function labels(p) { $("#covV").textContent = fmt(p.cov * 100, 0) + "%"; $("#ncalV").textContent = p.ncal; $("#hetV").textContent = fmt(p.het, 2); root.querySelector("#c1").previousElementSibling.querySelector("h4").textContent = `New weeks and their ${fmt(p.cov * 100, 0)}% ranges`; }
    function sim() { D = build(rng(seed), P()); }
    function draw() { const p = P(); labels(p); d1(p); d2(p); d3(p); tbl(p); readouts(p); }
    ["cov", "ncal", "het"].forEach((id) => $("#" + id).addEventListener("input", () => { sim(); draw(); }));
    $("#drift").addEventListener("change", () => { sim(); draw(); });
    $("#ms").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; meth = b.dataset.m; $("#ms").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    $("#ns").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; noise = b.dataset.n; $("#ns").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); sim(); draw(); });
    $("#resim").addEventListener("click", () => { seed++; sim(); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); $("#drift").checked = false; seed = 7; meth = "adapt"; noise = "skew"; $("#ms").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.m === meth)); $("#ns").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.n === noise)); sim(); draw(); });
    sim(); draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
