Lab.register({
  id: "backtesting",
  group: "Forecasting",
  title: "Backtesting with rolling origins",
  blurb: "One train/test split is one roll of the dice. Repeat the test from many starting points and see how the winner, and the error at each horizon, really look.",
  lede: "To judge a forecasting method, you hide the last few periods, forecast them and score the result. But that's a single test, and the winner can change if you move the cut-off by a month. Rolling-origin evaluation repeats the test from many cut-offs (origins) and averages the scores. It also shows how error grows with the forecast horizon.",
  quiz: [
    ["With 96 months, a 12-month horizon and 10 origins one month apart, how many forecasts are scored in total?", "10 origins × 12 horizons = 120 forecast-actual pairs, against 12 for a single split."],
    ["What's the difference between an expanding and a sliding window?", "Expanding: each origin trains on all data up to that point, so later origins have more history. Sliding: each origin trains on the same length of recent history, which can adapt better if the pattern changes."],
    ["Why must rolling-origin evaluation never shuffle the data, as ordinary cross-validation does?", "Forecasts can only use the past. Shuffling would let the model train on future months and test on past ones, which makes it look far better than it is."],
    ["A method wins the single last split but ranks third on average across 15 origins. Which result do you trust?", "The average across origins. The single split is one sample and may reflect luck in that particular year."],
  ],
  diy: {
    intro: "Monthly actuals in B2:B61. Forecast origins from month 36 to 59; horizon h in H1.",
    steps: [
      ["For each origin o (in D2 down), forecast h months ahead using only data up to o. Seasonal naive shown.", "E2: =INDEX($B$2:$B$61,D2+$H$1-12)"],
      ["Matching actual h months after the origin.", "F2: =INDEX($B$2:$B$61,D2+$H$1)"],
      ["Absolute error per origin.", "G2: =ABS(F2-E2)"],
      ["Score for this method and horizon: average over origins.", "=AVERAGE(G2:G25)"],
      ["Repeat for h = 1 to 6 with a Data Table (H1 as the column input) to see how error grows with horizon.", "What-If Analysis > Data Table"],
      ["Excel's FORECAST.ETS for an origin uses only rows up to that origin.", "=FORECAST.ETS(D2+$H$1,OFFSET($B$2,0,0,D2),OFFSET($A$2,0,0,D2),12)"],
    ],
  },
  deeper: [
    ["FPP3 §5.10: Time series cross-validation", "https://otexts.com/fpp3/tscv.html", "rolling-origin evaluation, with R code"],
    ["Tashman (2000), Out-of-sample tests of forecasting accuracy", "https://doi.org/10.1016/S0169-2070(00)00065-0", "the classic review of rolling-origin designs"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor"><rect x="4" y="8" width="44" height="8" opacity=".35"/><rect x="48" y="8" width="16" height="8"/><rect x="4" y="22" width="52" height="8" opacity=".35"/><rect x="56" y="22" width="16" height="8"/><rect x="4" y="36" width="60" height="8" opacity=".35"/><rect x="64" y="36" width="16" height="8"/><rect x="4" y="50" width="68" height="8" opacity=".35"/><rect x="72" y="50" width="16" height="8"/></g></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const N = 96, M = 12;
    const METH = [
      { id: "naive", name: "Naive", col: "--muted" },
      { id: "snaive", name: "Seasonal naive", col: "--violet" },
      { id: "ses", name: "Simple smoothing", col: "--warm" },
      { id: "hw", name: "Holt-Winters", col: "--accent" },
    ];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="btd" aria-label="Training and test windows for each origin"></canvas>
          <figcaption>Each row is one origin: train on the light part, forecast and score the dark part. The bottom row is the usual single split.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="bth" aria-label="Error by forecast horizon for each method"></canvas>
          <div class="legend">${METH.map((m) => `<span><i style="background:var(${m.col})"></i>${m.name}</span>`).join("")}</div>
          <figcaption>Average absolute error at each horizon, over all origins. Error grows as you forecast further ahead.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Who wins at each origin?</h4>
          <div style="overflow-x:auto"><table id="win" style="width:100%;border-collapse:collapse;font-size:.82rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono)"></table></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="k">Number of origins <output id="kV"></output></label><input type="range" id="k" min="1" max="24" step="1" value="12"></div>
        <div class="ctrl"><label for="h">Forecast horizon <output id="hV"></output></label><input type="range" id="h" min="1" max="12" step="1" value="6"></div>
        <div class="ctrl"><label for="st">Step between origins <output id="stV"></output></label><input type="range" id="st" min="1" max="6" step="1" value="2"></div>
        <div class="ctrl"><label>Training window</label>
          <div class="seg" id="win2"><button type="button" data-v="exp" aria-pressed="true">Expanding</button><button type="button" data-v="slide" aria-pressed="false">Sliding (36)</button></div></div>
        <div class="ctrl"><label for="nz">Noise <output id="nzV"></output></label><input type="range" id="nz" min="0" max="3" step="0.1" value="1.2"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New random series</button></div>`,
      notes: `
        <section>
          <h2>How rolling origin works</h2>
          <ol>
            <li>Pick a first cut-off (origin) far enough in to leave enough history to train on.</li>
            <li>Train on everything before the origin; forecast the next h periods; record the error at each horizon 1, 2, …, h.</li>
            <li>Move the origin forward by a step and repeat.</li>
            <li>Average the errors over origins, separately for each horizon.</li>
          </ol>
          <div class="eq">score(method, horizon h) = mean over origins of |actual − forecast h steps ahead|</div>
        </section>
        <section>
          <h2>Why it's worth the effort</h2>
          <ul>
            <li>More test points means a more reliable ranking. The winner of one split often isn't the winner on average.</li>
            <li>You see accuracy by horizon. A method can be best one month ahead and worst six months ahead, so pick for the horizon you plan at (see <a href="#lead-time-error">lead-time error</a>).</li>
            <li>It mimics real use: each forecast only uses the data that would have been available at the time.</li>
          </ul>
          <p>The <a href="#forecast-lab">forecast lab</a> uses a single split for speed. For decisions, backtest like this.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set origins to 1. That's the single split. Press "New random series" a few times and watch the single-split winner change.</li>
            <li>Raise origins to 24. The average ranking settles down.</li>
            <li>Compare horizon 1 with horizon 12 in the chart: naive is competitive one step ahead but falls away on longer horizons for seasonal data.</li>
            <li>Switch to a sliding window. With a stable pattern, less history usually means slightly worse forecasts.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pD = new Plot($("#btd"), { x: [0, N], pad: { l: 82 } });
    const pH = new Plot($("#bth"), { pad: { l: 52 } });
    let seed = 12, win = "exp", R = null;

    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    function fc(id, tr, h) {
      const n = tr.length;
      if (id === "naive") return Array(h).fill(tr[n - 1]);
      if (id === "snaive") return Array.from({ length: h }, (_, i) => tr[n - M + (i % M)]);
      if (id === "ses") { let l = tr[0]; tr.forEach((v) => (l = 0.3 * v + 0.7 * l)); return Array(h).fill(l); }
      const m1 = mean(tr.slice(0, M)), m2 = mean(tr.slice(M, 2 * M));
      let B = (m2 - m1) / M, L = m1 + (B * (M - 1)) / 2; const S = tr.slice(0, M).map((v) => v - m1);
      for (let t = M; t < n; t++) { const s = S[t % M], Lp = L; L = 0.3 * (tr[t] - s) + 0.7 * (L + B); B = 0.05 * (L - Lp) + 0.95 * B; S[t % M] = 0.2 * (tr[t] - L) + 0.8 * s; }
      return Array.from({ length: h }, (_, i) => L + (i + 1) * B + S[(n + i) % M]);
    }

    function compute() {
      const r = rng(seed), nz = +$("#nz").value;
      const y = Array.from({ length: N }, (_, t) => 100 + 0.6 * t + 15 * Math.sin((2 * Math.PI * (t - 2)) / M) + 5 * nz * r.normal());
      const K = +$("#k").value, h = +$("#h").value, st = +$("#st").value;
      const origins = []; for (let i = 0; i < K; i++) origins.push(N - h - i * st);
      const valid = origins.filter((o) => o >= 36).sort((a, b) => a - b);
      const res = {}; METH.forEach((m) => (res[m.id] = { byH: Array(h).fill(0), per: [] }));
      valid.forEach((o) => {
        const tr = win === "exp" ? y.slice(0, o) : y.slice(o - 36, o), te = y.slice(o, o + h);
        METH.forEach((m) => { const f = fc(m.id, tr, h), e = te.map((a, i) => Math.abs(a - f[i])); e.forEach((v, i) => (res[m.id].byH[i] += v / valid.length)); res[m.id].per.push(mean(e)); });
      });
      R = { y, valid, res, h };
    }

    function draw() {
      const { valid, res, h } = R;
      $("#kV").textContent = $("#k").value; $("#hV").textContent = h + (h === 1 ? " month" : " months");
      $("#stV").textContent = $("#st").value + (+$("#st").value === 1 ? " month" : " months"); $("#nzV").textContent = (+$("#nz").value).toFixed(1);
      const n = valid.length;
      pD.y = [-0.5, Math.max(n, 1) - 0.5]; pD.clear();
      pD.axes({ yTicks: [], xLabel: "month", xTicks: [0, 12, 24, 36, 48, 60, 72, 84, 96] });
      const g = pD.ctx, rh = Math.min(16, (pD.sy(0) - pD.sy(1)) * 0.7);
      valid.forEach((o, i) => {
        const y = pD.sy(n - 1 - i), s = win === "exp" ? 0 : o - 36;
        g.fillStyle = css("--accent"); g.globalAlpha = 0.22; g.fillRect(pD.sx(s), y - rh / 2, pD.sx(o) - pD.sx(s), rh);
        g.globalAlpha = 1; g.fillStyle = css("--warm"); g.fillRect(pD.sx(o), y - rh / 2, pD.sx(o + h) - pD.sx(o), rh);
        g.fillStyle = css("--muted"); g.font = `11px ${css("--font-mono")}`; g.textAlign = "right"; g.textBaseline = "middle";
        g.fillText(`origin ${i + 1}`, pD.pad.l - 6, y);
      });

      const hs = Array.from({ length: h }, (_, i) => i + 1), all = METH.flatMap((m) => res[m.id].byH);
      pH.x = [0.5, h + 0.5]; pH.y = [0, Math.max(...all) * 1.1 || 1]; pH.clear();
      pH.axes({ xTicks: hs, xLabel: "horizon (months ahead)", yLabel: "mean |error|", yCount: 4 });
      METH.forEach((m) => { pH.path(hs, res[m.id].byH, css(m.col), 2.4); res[m.id].byH.forEach((v, i) => pH.dot(i + 1, v, 3.5, css(m.col))); });

      // winners per origin
      const th = (t) => `<th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted);font-family:var(--font-body)">${t}</th>`;
      const wins = METH.map(() => 0);
      const rows = valid.map((o, i) => {
        const e = METH.map((m) => res[m.id].per[i]), b = e.indexOf(Math.min(...e)); wins[b]++;
        return `<tr><td style="padding:4px 6px;border-bottom:1px solid var(--grid);font-family:var(--font-body);color:var(--muted)">origin ${i + 1} (month ${o})</td>${e.map((v, j) => `<td style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--grid);${j === b ? "color:var(--good);font-weight:700" : ""}">${fmt(v, 1)}</td>`).join("")}</tr>`;
      });
      const avg = METH.map((m) => mean(res[m.id].per)), best = avg.indexOf(Math.min(...avg));
      $("#win").innerHTML = `<tr>${th("")}${METH.map((m) => th(m.name)).join("")}</tr>` + rows.join("") +
        `<tr style="font-weight:700"><td style="padding:6px;font-family:var(--font-body)">Average</td>${avg.map((v, j) => `<td style="text-align:right;padding:6px;${j === best ? "color:var(--good)" : ""}">${fmt(v, 1)}</td>`).join("")}</tr>` +
        `<tr><td style="padding:6px;font-family:var(--font-body);color:var(--muted)">Origins won</td>${wins.map((w) => `<td style="text-align:right;padding:6px;color:var(--muted)">${w}</td>`).join("")}</tr>`;

      const last = METH.map((m) => res[m.id].per[n - 1]), lb = last.indexOf(Math.min(...last));
      $("#ro").innerHTML = `
        <div class="ro"><b>Usable origins</b><span class="num">${n}</span></div>
        <div class="ro"><b>Forecasts scored</b><span class="num">${n * h} per method</span></div>
        <div class="ro"><b>Single last split winner</b><span class="pill idle">${METH[lb].name}</span></div>
        <div class="ro"><b>Winner on average</b><span class="pill ok">${METH[best].name}</span></div>`;
    }

    const rerun = () => { compute(); draw(); };
    ["#k", "#h", "#st", "#nz"].forEach((s) => $(s).addEventListener("input", rerun));
    $("#win2").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { win = b.dataset.v; $("#win2").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); rerun(); }));
    $("#newd").addEventListener("click", () => { seed++; rerun(); });
    rerun();
    return watch([pD.c, pH.c], (resized) => { if (resized) { pD.resize(); pH.resize(); } draw(); });
  },
});
