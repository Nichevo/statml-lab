Lab.register({
  id: "missing-data",
  group: "Data quality",
  title: "Missing data: filling the gaps",
  blurb: "A system outage, a store that didn't report, a week recorded as zero. Compare zero-fill, mean, carry-forward, interpolation and seasonal fills against the truth.",
  lede: "Real data has holes. How you fill them changes your averages, your forecasts and your safety stock. The most dangerous fill is the one nobody chose: a missing week quietly stored as zero. Better fills use what you know about the series: its neighbours, its trend, its seasonal shape. And why the data is missing matters as much as how you fill it: values that go missing at random are easy; values that go missing because they were unusual (a stockout during a peak) bias every method.",
  quiz: [
    ["Why is 'missing stored as zero' so harmful?", "It looks like real data. The average drops, the forecast drops, the model learns that demand sometimes collapses, and safety stock calculations see extra variability. Always distinguish 'no data' from 'zero'."],
    ["When does linear interpolation work well, and when badly?", "Well for short gaps in a smooth series. Badly for long gaps or gaps that span a seasonal peak: it draws a straight line straight through the peak."],
    ["What are MCAR, MAR and MNAR?", "Missing completely at random (unrelated to anything), missing at random (related to other things you observe, like the store), and missing not at random (related to the missing value itself, like high-demand weeks during a stockout). MNAR biases simple fills."],
    ["Should you fill gaps before or after removing outliers?", "Usually detect outliers first (on the observed data), then fill, so a wild value doesn't contaminate the fill. Then re-check the filled series."],
  ],
  deeper: [
    ["FPP3: Missing values", "https://otexts.com/fpp3/missing-outliers.html", "Hyndman & Athanasopoulos on gaps and outliers in time series"],
    ["Rubin (1976), Inference and missing data", "https://doi.org/10.1093/biomet/63.3.581", "the paper that defined MCAR / MAR / MNAR"],
    ["van Buuren, Flexible Imputation of Missing Data (free online)", "https://stefvanbuuren.name/fimd/", "the standard modern text, including multiple imputation"],
    ["Moritz & Bartz-Beielstein (2017), imputeTS", "https://journal.r-project.org/archive/2017/RJ-2017-009/", "time series imputation methods compared"],
  ],
  diy: {
    intro: "Weekly actuals in B2:B105, blanks where data is missing (not zeros!). Week of year in A.",
    steps: [
      ["First, find blanks and zeros separately.", "=COUNTBLANK(B2:B105)\n=COUNTIF(B2:B105,0)"],
      ["Mean fill (ignores blanks automatically).", "C2: =IF(B2=\"\",AVERAGE($B$2:$B$105),B2)"],
      ["Carry forward the last known value.", "D2: =B2   (first row)\nD3: =IF(B3=\"\",D2,B3)"],
      ["Linear interpolation between the previous and next known values (Excel 365).", "E3: =IF(B3<>\"\",B3,LET(p,XLOOKUP(TRUE,B$2:B2<>\"\",B$2:B2,,0,-1),pr,XMATCH(TRUE,B$2:B2<>\"\",0,-1),n,XLOOKUP(TRUE,B4:B$105<>\"\",B4:B$105),nr,XMATCH(TRUE,B4:B$105<>\"\"),k,ROWS(B$2:B2)-pr+1,p+(n-p)*k/(k+nr)))"],
      ["Seasonal fill: same week last year, scaled by how this year compares (ratio of the last 8 known weeks to the same weeks a year earlier).", "F70: =IF(B70<>\"\",B70,B18*SUM(B62:B69)/SUM(B10:B17))   (row 18 is the same week a year earlier; blanks in the ratio ranges should be excluded from both sums)"],
      ["Check: compare totals and averages before and after filling, and mark filled cells (e.g. a flag column) so they can be excluded from accuracy measures.", "G2: =IF(B2=\"\",\"filled\",\"\")"],
    ],
  },
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 40 L16 34 L28 38 L38 30"/><path d="M38 30 L58 26" stroke-dasharray="3 4"/><path d="M58 26 L70 32 L82 24 L92 28"/><circle cx="46" cy="29" r="3" fill="currentColor" opacity=".5"/><circle cx="52" cy="27" r="3" fill="currentColor" opacity=".5"/></svg>`,

  mount(root) {
    const { Plot, watch, css, rng } = Lab;
    const W = 104;
    const METHODS = [
      ["zero", "Stored as zero", "--bad"],
      ["mean", "Overall mean", "--muted"],
      ["locf", "Carry last value forward", "--violet"],
      ["lin", "Linear interpolation", "--warm"],
      ["seas", "Seasonal (last year × trend)", "--good"],
    ];
    let seed = 9, kind = "random", show = "seas";

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="md" aria-label="Weekly series with missing weeks and the values each fill method puts in"></canvas>
          <div class="legend" id="leg"></div>
          <figcaption>Grey bands: missing weeks. Hollow dots: the true values we hid. Coloured line: the selected fill.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">How good is each fill?</h4>
          <div class="seg" id="show" style="margin-bottom:10px;grid-auto-flow:row;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${METHODS.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${k === show}">${l}</button>`).join("")}</div>
          <div style="overflow-x:auto"><table id="tbl" style="width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums"></table></div>
        </div>`,
      panel: `
        <div class="ctrl"><label>Why the data is missing</label>
          <div class="seg" id="kind" style="grid-auto-flow:row"><button type="button" data-v="random" aria-pressed="true">Random weeks (MCAR)</button><button type="button" data-v="block" aria-pressed="false">System outage: a block</button><button type="button" data-v="peak" aria-pressed="false">High weeks go missing (MNAR)</button></div></div>
        <div class="ctrl"><label for="pct">Share missing <output id="pctV"></output></label><input type="range" id="pct" min="2" max="30" step="1" value="10"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New data</button></div>`,
      notes: `
        <section>
          <h2>The fills</h2>
          <ul>
            <li><b>Zero:</b> what many systems do by default. Never right for demand that simply wasn't recorded.</li>
            <li><b>Mean:</b> ignores trend and season; fine only for flat, random series.</li>
            <li><b>Carry forward:</b> repeats the last known week; good for very short gaps in slow-moving series.</li>
            <li><b>Linear interpolation:</b> a straight line between the known neighbours.</li>
            <li><b>Seasonal:</b> the same week last year, scaled by how this year compares. Uses the shape of the series.</li>
          </ul>
        </section>
        <section>
          <h2>Measuring a fill</h2>
          <p>Here we know the hidden truth, so we score each fill by its error on the missing weeks (MAE) and by how much it biases the yearly total. In real data you can't see the truth, so test a fill by hiding some known weeks and seeing how well it recovers them.</p>
          <div class="eq">MAE = average |filled − true| over missing weeks<br>total bias = (filled total − true total) ÷ true total</div>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Compare "Stored as zero" with any other fill: the total drops by roughly the share missing.</li>
            <li>Choose "System outage". Interpolation cuts straight across the block; the seasonal fill follows the shape.</li>
            <li>Choose "High weeks go missing". Every fill underestimates, because the missing weeks were the big ones. That's MNAR, and it's what happens with <a href="#censored-demand">stockouts</a>.</li>
          </ol>
          <p>Related: <a href="#outliers">outliers</a>, <a href="#ts-anomalies">time-series anomalies</a>, <a href="#censored-demand">censored demand</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    $("#leg").innerHTML = `<span><i style="background:var(--ink)"></i>Observed</span>` + METHODS.map(([, l, c]) => `<span><i style="background:var(${c})"></i>${l}</span>`).join("");
    const P = new Plot($("#md"), { x: [1, W], pad: { l: 56 } });

    function draw() {
      const pct = +$("#pct").value / 100;
      $("#pctV").textContent = Math.round(pct * 100) + "%";
      const r = rng(seed);
      const truth = Array.from({ length: W }, (_, t) => 300 * (1 + 0.004 * t) * (1 + 0.3 * Math.sin((2 * Math.PI * (t - 8)) / 52) + 0.25 * Math.exp(-((((t % 52) - 47) / 2.5) ** 2))) * (1 + 0.08 * r.normal()));
      const m = Math.max(1, Math.round(W * pct)), miss = new Array(W).fill(false);
      if (kind === "random") { let c = 0; while (c < m) { const t = 2 + Math.floor(r() * (W - 4)); if (!miss[t]) { miss[t] = true; c++; } } }
      else if (kind === "block") { const s = 60 + Math.floor(r() * Math.max(1, 40 - m)); for (let t = s; t < Math.min(W - 1, s + m); t++) miss[t] = true; }
      else { const order = truth.map((v, t) => [v * (0.85 + 0.3 * r()), t]).filter(([, t]) => t > 1 && t < W - 1).sort((a, b) => b[0] - a[0]); order.slice(0, m).forEach(([, t]) => (miss[t] = true)); }
      const obs = truth.map((v, t) => (miss[t] ? null : v));
      const known = obs.filter((v) => v != null), mean = known.reduce((a, b) => a + b, 0) / known.length;
      const fills = {};
      fills.zero = obs.map((v) => (v == null ? 0 : v));
      fills.mean = obs.map((v) => (v == null ? mean : v));
      fills.locf = []; obs.forEach((v, t) => fills.locf.push(v == null ? (t ? fills.locf[t - 1] : mean) : v));
      fills.lin = obs.map((v, t) => {
        if (v != null) return v;
        let a = t - 1; while (a >= 0 && obs[a] == null) a--; let b = t + 1; while (b < W && obs[b] == null) b++;
        if (a < 0) return obs[b]; if (b >= W) return obs[a];
        return obs[a] + ((obs[b] - obs[a]) * (t - a)) / (b - a);
      });
      fills.seas = obs.map((v, t) => {
        if (v != null) return v;
        const ly = t >= 52 ? t - 52 : t + 52; // use the other year
        const base = obs[ly] != null ? obs[ly] : fills.lin[ly];
        // year-on-year ratio from known weeks near t
        let s1 = 0, s0 = 0;
        for (let d = -8; d <= 8; d++) { const u = t + d, w = ly + d; if (u >= 0 && u < W && w >= 0 && w < W && obs[u] != null && obs[w] != null) { s1 += obs[u]; s0 += obs[w]; } }
        return base * (s0 > 0 ? s1 / s0 : 1);
      });

      const tsAll = truth.map((_, t) => t + 1);
      P.y = [0, Math.max(...truth) * 1.1];
      P.clear(); P.axes({ xLabel: "week", xTicks: [1, 13, 26, 39, 52, 65, 78, 91, 104], yLabel: "units", yCount: 4 });
      const g = P.ctx; g.fillStyle = css("--muted"); g.globalAlpha = 0.16;
      miss.forEach((m2, t) => { if (m2) g.fillRect(P.sx(t + 0.5), P.pad.t, P.sx(t + 1.5) - P.sx(t + 0.5), P.ih); });
      g.globalAlpha = 1;
      const col = METHODS.find((x) => x[0] === show)[2];
      P.path(tsAll, fills[show], css(col), 2.2, [5, 3]);
      // observed segments
      let seg = [];
      const flush = () => { if (seg.length > 1) P.path(seg.map((t) => t + 1), seg.map((t) => obs[t]), css("--ink"), 1.8); seg = []; };
      obs.forEach((v, t) => { if (v == null) flush(); else seg.push(t); }); flush();
      miss.forEach((m2, t) => { if (m2) { P.dot(t + 1, truth[t], 4.5, css("--surface"), css("--ink")); P.dot(t + 1, fills[show][t], 4, css(col)); } });

      const idx = miss.map((m2, t) => (m2 ? t : -1)).filter((t) => t >= 0), trueTot = truth.reduce((a, b) => a + b, 0);
      const trueSD = (a) => { const mu = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - mu) ** 2, 0) / (a.length - 1)); };
      const rows = METHODS.map(([k, l, c]) => {
        const f = fills[k], mae = idx.reduce((s, t) => s + Math.abs(f[t] - truth[t]), 0) / idx.length, tot = f.reduce((a, b) => a + b, 0);
        return { k, l, c, mae, bias: (tot - trueTot) / trueTot, sd: trueSD(f) };
      });
      const best = rows.reduce((a, b) => (b.mae < a.mae ? b : a));
      const th = (t) => `<th style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500">${t}</th>`;
      const td = (v, st = "") => `<td style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono);${st}">${v}</td>`;
      $("#tbl").innerHTML = `<tr><th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500">Fill</th>${th("MAE on missing weeks")}${th("Bias in total")}${th("SD of series (true " + trueSD(truth).toFixed(0) + ")")}</tr>` + rows.map((x) =>
        `<tr style="${x.k === show ? "background:var(--accent-soft)" : ""}"><td style="padding:5px 8px;border-bottom:1px solid var(--line)"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(${x.c});margin-right:6px"></i>${x.l}</td>${td(x.mae.toFixed(1), x === best ? "color:var(--good);font-weight:700" : "")}${td((x.bias > 0 ? "+" : "") + (x.bias * 100).toFixed(1) + "%", Math.abs(x.bias) > 0.03 ? "color:var(--bad)" : "")}${td(x.sd.toFixed(0))}</tr>`).join("");

      const t0 = idx[Math.floor(idx.length / 2)], f = fills[show][t0];
      $("#ro").innerHTML = `
        <div class="ro"><b>Missing weeks</b><span class="num">${idx.length} of ${W}</span></div>
        <div class="ro"><b>Best fill here</b><span class="pill ok">${best.l}</span></div>
        <div class="ro"><b>Example: week ${t0 + 1}</b><span class="num">true ${truth[t0].toFixed(0)}, filled ${f.toFixed(0)}</span></div>`;
    }

    $("#kind").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; kind = b.dataset.v; $("#kind").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    $("#show").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; show = b.dataset.v; $("#show").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    $("#pct").addEventListener("input", draw);
    $("#newd").addEventListener("click", () => { seed++; draw(); });
    draw();
    return watch([P.c], (resized) => { if (resized) P.resize(); draw(); });
  },
});
