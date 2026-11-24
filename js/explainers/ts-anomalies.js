Lab.register({
  id: "ts-anomalies",
  group: "Data quality",
  title: "Time-series anomalies: outside the forecast band",
  blurb: "A big week in December is normal; the same number in July isn't. Flag weeks that fall outside a forecast band, not outside the overall range.",
  lede: "In a time series, 'unusual' depends on when. A plain outlier rule applied to two years of sales will flag every Christmas peak and miss a July spike that's half as big. The fix is to compare each week with what you expected for that week: make a one-step-ahead forecast, put a band around it sized by typical forecast error, and flag actuals that land outside. Then don't let the flagged week drag the forecast with it.",
  quiz: [
    ["Why does a global z-score flag seasonal peaks?", "It compares every week with the overall mean and SD, ignoring the season. Regular December peaks sit far from the yearly mean, so they get flagged even though they're expected."],
    ["How wide should the band be?", "A multiple k of the typical one-step forecast error. With roughly normal errors, k = 3 flags about 0.3% of normal weeks by chance, k = 2 about 5%. Use a robust spread (MAD of the residuals) so past anomalies don't widen the band."],
    ["Why replace a flagged actual with the forecast before updating the level?", "Otherwise the anomaly pulls the level up (or down) and the next few forecasts are wrong too. That makes the following normal weeks look unusual, or hides a second anomaly."],
    ["What should you do with flagged weeks?", "Investigate and label them: promotion, stockout, data error, one-off order. Clean or adjust the history for forecasting, but keep the label so the model can learn from planned events like promotions."],
  ],
  deeper: [
    ["FPP3: Time series features and anomalies", "https://otexts.com/fpp3/", "Hyndman & Athanasopoulos, free online"],
    ["Anomaly detection — Wikipedia", "https://en.wikipedia.org/wiki/Anomaly_detection", "overview of approaches"],
    ["Twitter's AnomalyDetection (S-H-ESD)", "https://github.com/twitter/AnomalyDetection", "seasonal decomposition + robust test, open source"],
    ["Hampel filter — Wikipedia (median absolute deviation)", "https://en.wikipedia.org/wiki/Median_absolute_deviation", "the robust spread used for the band"],
  ],
  diy: {
    intro: "Weekly actuals in column B from row 2, week number (1–52) in A. Start with a year of history to set the seasonal profile.",
    steps: [
      ["Seasonal index for each week of the year: that week's actual in year 1 divided by the year-1 average.", "C2: =B2/AVERAGE($B$2:$B$53)   (fill down to C53)"],
      ["Starting level = year-1 average. Then for each later week, the forecast is last level × this week's index.", "E54: =AVERAGE($B$2:$B$53)   (level after year 1)\nD55: =E54*INDEX($C$2:$C$53,A55)   (forecast for week 55)"],
      ["Residual = actual − forecast.", "F55: =B55-D55"],
      ["Robust spread of residuals (MAD × 1.4826), using all residuals so far.", "G55: =1.4826*MEDIAN(ABS(F$55:F55-MEDIAN(F$55:F55)))"],
      ["Band and flag: outside forecast ± k × spread (k in $H$1, e.g. 3). Start flagging once you have 8 or so residuals.", "I55: =IF(ABS(F55)>$H$1*MAX(G54,1),\"anomaly\",\"\")"],
      ["Update the level with smoothing α ($H$2), using the forecast instead of the actual when the week is flagged.", "E55: =E54+$H$2*(IF(I55=\"anomaly\",D55,B55)/INDEX($C$2:$C$53,A55)-E54)"],
      ["If three weeks in a row are flagged on the same side, treat it as a level shift: use the actuals again (and consider resetting the level).", "J55: =IF(AND(I53<>\"\",I54<>\"\",I55<>\"\",SIGN(F53)=SIGN(F55),SIGN(F54)=SIGN(F55)),\"level shift?\",\"\")"],
    ],
  },
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 40 C 20 30, 30 22, 44 30 S 70 44, 92 30 L 92 46 C 70 58, 58 46, 44 44 S 20 46, 4 54 Z" fill="currentColor" fill-opacity=".15" stroke="none"/><path d="M4 46 L16 42 L28 36 L40 38 L50 12 L58 42 L70 46 L80 44 L92 38"/><circle cx="50" cy="12" r="4" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, watch, css, rng } = Lab;
    const W = 104;
    let seed = 6;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="ta" aria-label="Weekly sales with a one-step-ahead forecast band; anomalies flagged outside the band"></canvas>
          <div class="legend"><span><i style="background:var(--ink)"></i>Actual</span><span><i style="background:var(--accent)"></i>Forecast and band</span><span><i style="background:var(--bad)"></i>Flagged: outside band</span><span><i style="background:var(--warm)"></i>Flagged by global z-score</span><span><i style="background:var(--muted)"></i>Planted anomaly (ring)</span></div>
          <figcaption>Year 1 sets the seasonal profile; year 2 is checked week by week. Triangles at the top: weeks a plain z-score on all values would flag.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 class="ta-h">Forecast band vs global z-score</h4>
          <div style="overflow-x:auto"><table id="tbl" class="ta-t"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="ta-h">Worked out for one week</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.ta-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .ta-t{width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums}
        .ta-t th{text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500}
        .ta-t td{text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono)}
        .ta-t th:first-child,.ta-t td:first-child{text-align:left;font-family:var(--font-body)}</style>`,
      panel: `
        <div class="ctrl"><label for="k">Band width k (× robust error SD) <output id="kV"></output></label><input type="range" id="k" min="1.5" max="5" step="0.25" value="3"></div>
        <div class="ctrl"><label for="al">Level smoothing α <output id="alV"></output></label><input type="range" id="al" min="0.05" max="0.8" step="0.05" value="0.2"></div>
        <div class="ctrl"><label for="sz">Anomaly size <output id="szV"></output></label><input type="range" id="sz" min="10" max="100" step="5" value="45"></div>
        <div class="ctrl"><label for="nz">Normal noise <output id="nzV"></output></label><input type="range" id="nz" min="2" max="20" step="1" value="7"></div>
        <label style="display:flex;gap:8px;align-items:center;font-size:.9rem"><input type="checkbox" id="contam"> Let flagged weeks update the level</label>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New data</button></div>`,
      notes: `
        <section>
          <h2>The method</h2>
          <div class="eq">forecast(t) = level(t−1) × season(week)<br>residual = actual − forecast<br>flag if |residual| &gt; k × 1.4826 × MAD(residuals)<br>level(t) = level(t−1) + α × (clean(t) ÷ season − level(t−1))</div>
          <p>clean(t) is the actual, or the forecast if the week was flagged. This is a cut-down seasonal exponential smoothing model (see <a href="#exponential-smoothing">exponential smoothing</a>); any good forecast works, including <a href="#seasonal-decomposition">STL</a>.</p>
        </section>
        <section>
          <h2>What gets planted</h2>
          <p>Year 2 has a <b>spike</b> (a one-off bulk order), a <b>dip</b> (a stockout or a missing data feed), and a <b>level shift</b> late in the year (a new customer). The shift gets flagged for a few weeks. After three flags in a row on the same side, the method treats it as a new level and lets the forecast catch up: it's the new normal, not an anomaly. Spotting shifts properly is the job of <a href="#change-points">change-point detection</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Compare the warm triangles with the red dots. The global z-score flags the regular peak season and misses the mid-year spike.</li>
            <li>Tick "Let flagged weeks update the level". After the spike, the forecast overshoots for several weeks.</li>
            <li>Narrow the band to k = 2. More false alarms in normal weeks; that's the price of catching smaller anomalies.</li>
            <li>Shrink the anomaly size until the band stops catching it. Anomalies smaller than about k × noise can't be told apart from noise.</li>
          </ol>
          <p>Related: <a href="#outliers">outlier rules</a>, <a href="#prediction-intervals">prediction intervals</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const P = new Plot($("#ta"), { x: [1, W], pad: { l: 56, t: 22 } });
    let pickWeek = null;

    function draw() {
      const k = +$("#k").value, al = +$("#al").value, sz = +$("#sz").value / 100, nz = +$("#nz").value / 100, contam = $("#contam").checked;
      $("#kV").textContent = k.toFixed(2); $("#alV").textContent = al.toFixed(2); $("#szV").textContent = "±" + Math.round(sz * 100) + "%"; $("#nzV").textContent = Math.round(nz * 100) + "%";
      const r = rng(seed), base = 500;
      const seas = Array.from({ length: 52 }, (_, w) => 1 + 0.35 * Math.exp(-(((w - 48) / 3.2) ** 2)) + 0.12 * Math.sin((2 * Math.PI * w) / 52));
      const y = [], planted = new Map();
      const spikeW = 64 + Math.floor(r() * 8), dipW = 78 + Math.floor(r() * 6), shiftW = 92;
      for (let t = 0; t < W; t++) {
        let lvl = base * (1 + 0.002 * t);
        if (t >= shiftW) lvl *= 1 + sz * 0.6;
        let v = lvl * seas[t % 52] * (1 + nz * r.normal());
        if (t === spikeW) { v *= 1 + sz * 1.3; planted.set(t, "spike"); }
        if (t === dipW) { v *= 1 - Math.min(0.9, sz); planted.set(t, "dip"); }
        if (t === shiftW) planted.set(t, "level shift starts");
        y.push(v);
      }
      // season from year 1
      const m1 = y.slice(0, 52).reduce((a, b) => a + b, 0) / 52, sIdx = y.slice(0, 52).map((v) => v / m1);
      // smooth seasonal index a little (3-week centred) to reduce noise
      const sI = sIdx.map((_, w) => (sIdx[(w + 51) % 52] + 2 * sIdx[w] + sIdx[(w + 1) % 52]) / 4);
      let level = m1, run = 0, runSign = 0;
      const fc = new Array(W).fill(null), lo = [], hi = [], flag = new Array(W).fill(false), res = [], spreads = new Array(W).fill(null), levels = new Array(W).fill(null);
      const med = (a) => { const s = a.slice().sort((x, z) => x - z), i = (s.length - 1) / 2; return (s[Math.floor(i)] + s[Math.ceil(i)]) / 2; };
      for (let t = 52; t < W; t++) {
        const f = level * sI[t % 52]; fc[t] = f;
        const recent = res.slice(-26);
        const spread = recent.length >= 6 ? 1.4826 * med(recent.map((e) => Math.abs(e - med(recent)))) : nz * f * 1.2;
        spreads[t] = spread; lo[t] = f - k * spread; hi[t] = f + k * spread;
        const e = y[t] - f; flag[t] = Math.abs(e) > k * spread;
        if (!flag[t]) res.push(e);
        // three flags in a row on the same side = a level shift: stop fighting it and follow the data
        if (flag[t] && Math.sign(e) === runSign) run++; else { run = flag[t] ? 1 : 0; runSign = flag[t] ? Math.sign(e) : 0; }
        const shift = run >= 3;
        const clean = flag[t] && !contam && !shift ? f : y[t];
        if (shift) level = level + 0.6 * (y[t] / sI[t % 52] - level);
        level = level + al * (clean / sI[t % 52] - level); levels[t] = level;
      }
      const mean = y.reduce((a, b) => a + b, 0) / W, sd = Math.sqrt(y.reduce((a, b) => a + (b - mean) ** 2, 0) / (W - 1));
      const zflag = y.map((v) => Math.abs((v - mean) / sd) > 2.5);

      const ts = y.map((_, t) => t + 1), all = y.concat(hi.filter((v) => v != null), lo.filter((v) => v != null));
      P.y = [Math.max(0, Math.min(...all) * 0.9), Math.max(...all) * 1.06];
      P.clear(); P.axes({ xLabel: "week", xTicks: [1, 13, 26, 39, 52, 65, 78, 91, 104], yLabel: "units", yCount: 4 });
      const g = P.ctx;
      g.fillStyle = css("--muted"); g.globalAlpha = 0.07; g.fillRect(P.sx(1), P.pad.t, P.sx(52.5) - P.sx(1), P.ih); g.globalAlpha = 1;
      g.fillStyle = css("--muted"); g.font = "10px " + css("--font-mono"); g.textAlign = "left"; g.fillText("year 1: sets the seasonal profile", P.sx(2), P.pad.t - 8); g.fillText("year 2: checked week by week", P.sx(54), P.pad.t - 8);
      g.beginPath(); for (let t = 52; t < W; t++) g.lineTo(P.sx(t + 1), P.sy(hi[t])); for (let t = W - 1; t >= 52; t--) g.lineTo(P.sx(t + 1), P.sy(lo[t])); g.closePath();
      g.fillStyle = css("--accent"); g.globalAlpha = 0.15; g.fill(); g.globalAlpha = 1;
      P.path(ts.slice(52), fc.slice(52), css("--accent"), 2);
      P.path(ts, y, css("--ink"), 1.6);
      zflag.forEach((f, t) => { if (f) { const x = P.sx(t + 1); g.fillStyle = css("--warm"); g.beginPath(); g.moveTo(x, P.pad.t + 2); g.lineTo(x - 5, P.pad.t - 6); g.lineTo(x + 5, P.pad.t - 6); g.closePath(); g.fill(); } });
      planted.forEach((_, t) => { g.strokeStyle = css("--muted"); g.lineWidth = 1.6; g.beginPath(); g.arc(P.sx(t + 1), P.sy(y[t]), 9, 0, Math.PI * 2); g.stroke(); });
      flag.forEach((f, t) => { if (f) P.dot(t + 1, y[t], 5, css("--bad"), css("--surface")); });

      const y2 = [...Array(52)].map((_, i) => i + 52);
      const bandF = y2.filter((t) => flag[t]), zF = y2.filter((t) => zflag[t]);
      const hitB = [...planted.keys()].filter((t) => flag[t]).length, hitZ = [...planted.keys()].filter((t) => zflag[t]).length;
      $("#tbl").innerHTML = `<tr><th>Method</th><th>Weeks flagged in year 2</th><th>Planted caught (of ${planted.size})</th><th>Other weeks flagged</th></tr>
        <tr><td>Forecast band (k = ${k})</td><td>${bandF.length}</td><td style="color:var(--good)">${hitB}</td><td>${bandF.filter((t) => !planted.has(t)).length}</td></tr>
        <tr><td>Global z-score (|z| &gt; 2.5, all weeks)</td><td>${zF.length}</td><td style="color:var(--good)">${hitZ}</td><td>${zF.filter((t) => !planted.has(t)).length}</td></tr>`;

      const t = pickWeek ?? spikeW;
      $("#ro").innerHTML = `
        <div class="ro"><b>Spike (week ${spikeW + 1})</b><span class="pill ${flag[spikeW] ? "ok" : "bad"}">${flag[spikeW] ? "caught" : "missed"}</span></div>
        <div class="ro"><b>Dip (week ${dipW + 1})</b><span class="pill ${flag[dipW] ? "ok" : "bad"}">${flag[dipW] ? "caught" : "missed"}</span></div>
        <div class="ro"><b>Level shift (week ${shiftW + 1})</b><span class="pill ${flag[shiftW] ? "ok" : "warn"}">${flag[shiftW] ? "caught" : "missed"}</span></div>
        <div class="ro"><b>False alarms</b><span class="num">${bandF.filter((x) => !planted.has(x)).length}</span></div>`;

      const B = (s) => `<b style="color:var(--ink)">${s}</b>`, M = (s) => `<span style="color:var(--muted)">${s}</span>`;
      $("#work").innerHTML = [
        `week ${t + 1} (week ${(t % 52) + 1} of the year): season index = ${sI[t % 52].toFixed(3)}`,
        `forecast = level ${(fc[t] / sI[t % 52]).toFixed(1)} × ${sI[t % 52].toFixed(3)} = ${B(fc[t].toFixed(1))}`,
        `actual = ${y[t].toFixed(1)} → residual = ${(y[t] - fc[t]).toFixed(1)}`,
        `robust error SD (last 26 residuals) = ${spreads[t].toFixed(1)} → band ${fc[t].toFixed(1)} ± ${k} × ${spreads[t].toFixed(1)} = ${lo[t].toFixed(1)} to ${hi[t].toFixed(1)}`,
        `${B(flag[t] ? "outside → anomaly" : "inside → normal")}; level updated with ${flag[t] && !contam ? "the forecast (anomaly kept out)" : "the actual"} → ${levels[t].toFixed(1)}`,
        M("click the chart to work out a different week"),
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    $("#ta").addEventListener("click", (e) => { const rc = $("#ta").getBoundingClientRect(), w = Math.round(P.ix(e.clientX - rc.left)) - 1; if (w >= 52 && w < W) { pickWeek = w; draw(); } });
    ["#k", "#al", "#sz", "#nz", "#contam"].forEach((s) => $(s).addEventListener("input", draw));
    $("#newd").addEventListener("click", () => { seed++; pickWeek = null; draw(); });
    draw();
    return watch([P.c], (resized) => { if (resized) P.resize(); draw(); });
  },
});
