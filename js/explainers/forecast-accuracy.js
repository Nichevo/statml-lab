Lab.register({
  id: "forecast-accuracy",
  group: "Forecasting",
  title: "Forecast accuracy measures",
  blurb: "MAE, RMSE, MAPE, WAPE, MASE and bias side by side. Edit the numbers or load a scenario and see which measure tells the truth.",
  lede: "Every accuracy measure boils a column of errors down to one number, and each one does it differently. Some punish big misses, some divide by the actual value, some ignore direction. Load a scenario or type your own actuals and forecasts, then watch the measures disagree.",
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 40 L20 30 L34 36 L48 22 L62 28 L76 16 L90 24"/><path d="M6 46 L20 26 L34 42 L48 30 L62 20 L76 26 L90 18" stroke-dasharray="4 3" opacity=".6"/><g opacity=".5"><line x1="20" y1="26" x2="20" y2="30"/><line x1="34" y1="36" x2="34" y2="42"/><line x1="48" y1="22" x2="48" y2="30"/><line x1="62" y1="20" x2="62" y2="28"/><line x1="76" y1="16" x2="76" y2="26"/></g></svg>`,

  mount(root) {
    const { Plot, watch, fmt, css } = Lab;
    const base = [112, 98, 105, 120, 131, 126, 140, 138, 125, 117, 109, 121];
    const wob = [4, -6, 3, -5, 7, -2, -6, 5, -3, 6, -4, 2];
    const SCEN = {
      steady: {
        name: "Steady errors",
        lesson: "A baseline: actuals around 100 to 140 and forecasts within a few units. All the measures agree the forecast is decent. Load another scenario and compare each number against this one.",
        a: base, f: base.map((v, i) => v + wob[i]),
      },
      outlier: {
        name: "One big miss",
        lesson: "Same as steady, except one month is off by 45. MAE rises a little; RMSE roughly doubles, because squaring makes the one big miss dominate. Pick RMSE in the panel and look at the contribution bars: one month carries most of the total. Use RMSE when big misses really are costly (stock-outs); use MAE when every unit of error costs the same.",
        a: base, f: base.map((v, i) => v + (i === 6 ? -45 : wob[i])),
      },
      small: {
        name: "Small actuals",
        lesson: "Slow-moving items: actuals between 1 and 12, with errors of only 1 to 3 units. MAE looks tiny, but MAPE is huge, because a miss of 2 on an actual of 1 is a 200% error. WAPE divides total error by total actuals, so the small months don't explode it. MAPE is a poor choice for intermittent or low-volume demand.",
        a: [8, 3, 1, 6, 12, 2, 5, 9, 1, 4, 7, 10], f: [6, 5, 3, 6, 10, 4, 6, 8, 3, 5, 6, 9],
      },
      zero: {
        name: "An actual of zero",
        lesson: "One month sold nothing. Its percentage error divides by zero, so MAPE is undefined (many tools silently drop that row or report infinity). sMAPE caps that row at 200%. WAPE and MASE handle it without trouble.",
        a: base.map((v, i) => (i === 4 ? 0 : v)), f: base.map((v, i) => (i === 4 ? 15 : v + wob[i])),
      },
      asym: {
        name: "Over vs under",
        lesson: "Every row misses by exactly 50 units, half too high and half too low. MAE treats them the same. MAPE does not: forecasting 150 when 100 happened is a 50% error, but forecasting 100 when 150 happened is only 33%. Over-forecasts are punished more, so choosing models by MAPE quietly favours forecasts that run low. 1 − xMAPE divides by the larger of the two, so both kinds of miss score the same 66.7%.",
        a: [100, 150, 100, 150, 100, 150, 100, 150, 100, 150, 100, 150], f: [150, 100, 150, 100, 150, 100, 150, 100, 150, 100, 150, 100],
      },
      biased: {
        name: "Always too high",
        lesson: "Each forecast is 6 units above the actual. MAE is about the same as the steady scenario, so on its own it can't tell a random miss from a systematic one. Bias (mean error) exposes it: −6 means consistent over-forecasting, which over time means excess stock. Always check bias alongside a size measure.",
        a: base, f: base.map((v) => v + 6),
      },
      scale: {
        name: "Same errors ×1000",
        lesson: "The steady scenario, with everything multiplied by 1,000 (units to grams, or one store to a thousand). MAE, RMSE and bias grow 1,000 times because they are in the data's units. MAPE, WAPE and MASE stay the same because they are scale-free. Use a scale-free measure to compare products or series of different sizes.",
        a: base.map((v) => v * 1000), f: base.map((v, i) => (v + wob[i]) * 1000),
      },
    };
    const METRICS = [
      { id: "mae", name: "MAE", full: "mean absolute error", col: "abs" },
      { id: "rmse", name: "RMSE", full: "root mean squared error", col: "sq" },
      { id: "mape", name: "MAPE", full: "mean absolute percentage error", col: "ape" },
      { id: "smape", name: "sMAPE", full: "symmetric MAPE", col: "sape" },
      { id: "wape", name: "WAPE", full: "weighted absolute percentage error", col: "abs" },
      { id: "mase", name: "MASE", full: "mean absolute scaled error", col: "scaled" },
      { id: "bias", name: "Bias", full: "mean error, actual − forecast", col: "err" },
      { id: "xacc", name: "1 − xMAPE", full: "accuracy: mean of 1 − |e| / max(A, F); higher is better", col: "xape" },
    ];

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot" style="padding:14px;display:grid;gap:10px">
          <h4 style="margin:0;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Scenario</h4>
          <div class="btns" id="scen">${Object.entries(SCEN).map(([k, s]) => `<button class="btn" type="button" data-s="${k}" aria-pressed="false">${s.name}</button>`).join("")}</div>
          <p id="lesson" style="margin:0;padding:10px 12px;border-radius:8px;background:var(--violet-soft);font-size:.93rem"></p>
        </div>
        <figure class="plot wide">
          <canvas id="fac" aria-label="Actuals and forecasts with errors"></canvas>
          <div class="legend">
            <span><i style="background:var(--ink)"></i>Actual</span>
            <span><i style="background:var(--warm)"></i>Forecast</span>
            <span><i style="background:var(--muted)"></i>Error</span>
          </div>
          <figcaption>Drag any dot up or down, or type in the table below.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="fab" aria-label="Each period's share of the selected measure"></canvas>
          <figcaption id="shareCap"></figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Every error, worked out</h4>
          <div style="overflow-x:auto"><table id="tbl" style="width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums"></table></div>
        </div>`,
      panel: `
        <div>
          <h4>Measures</h4>
          <p class="hint" style="margin:0 0 8px">Pick one to highlight its column and see which periods drive it.</p>
          <div id="mlist" style="display:grid;gap:4px"></div>
        </div>
        <div class="btns">
          <button class="btn" id="naive" type="button">Forecast = last actual</button>
          <button class="btn" id="perfect" type="button">Make it perfect</button>
        </div>`,
      notes: `
        <section>
          <h2>The formulas</h2>
          <p>With actual A, forecast F and error e = A − F over n periods:</p>
          <div class="eq">MAE = mean(|e|)</div>
          <div class="eq">RMSE = √mean(e²)</div>
          <div class="eq">MAPE = mean(|e| / |A|) × 100%</div>
          <div class="eq">sMAPE = mean(2|e| / (|A| + |F|)) × 100%</div>
          <div class="eq">WAPE = Σ|e| / Σ|A| × 100%</div>
          <div class="eq">MASE = MAE / mean(|A<sub>t</sub> − A<sub>t−1</sub>|)</div>
          <div class="eq">Bias = mean(e)</div>
          <div class="eq">1 − xMAPE = mean(1 − |e| / max(A, F)) × 100%</div>
          <p><b>1 − xMAPE</b> is an accuracy score, so higher is better. Dividing by the larger of actual and forecast keeps every month between 0% and 100%, treats a 50-unit over-forecast the same as a 50-unit under-forecast at the same level, and survives an actual of zero (that month just scores 0%).</p>
          <p>MASE divides by the error of the "repeat last value" forecast on the same data. Below 1 beats that naive forecast; above 1 loses to it. Strictly, the scaling uses the training data; this page uses the actuals shown, to keep it simple.</p>
        </section>
        <section>
          <h2>Which one to use</h2>
          <ul>
            <li><b>MAE</b>: easy to explain, in real units. Good default for one series.</li>
            <li><b>RMSE</b>: when big misses cost far more than small ones. Always at least as big as MAE; a large gap means a few big misses.</li>
            <li><b>MAPE</b>: familiar to managers, but breaks near zero and favours under-forecasting.</li>
            <li><b>WAPE</b>: a percentage that weights by volume. Popular in retail and supply chain.</li>
            <li><b>MASE</b>: scale-free and safe with zeros. Good for comparing many series.</li>
            <li><b>1 − xMAPE</b>: a bounded 0 to 100% accuracy score that managers can read like a grade. Symmetric, and safe with zeros, but still unweighted, so small months count as much as big ones.</li>
            <li><b>Bias</b>: not a size measure. Pair it with one of the others to catch systematic over- or under-forecasting.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>In "Steady errors", drag one forecast far away. Watch RMSE pull away from MAE.</li>
            <li>In "Small actuals", drag the actual of 1 up to 5. MAPE drops sharply while MAE barely moves.</li>
            <li>Press "Forecast = last actual". MASE becomes about 1, by definition.</li>
            <li>In "Over vs under", change one forecast of 150 to 125. Compare how much MAPE and MAE improve.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const chart = new Plot($("#fac"), { pad: { l: 56 } });
    const bars = new Plot($("#fab"), { y: [0, 1], pad: { l: 56, b: 30, t: 10 } });
    let A = [], F = [], sel = "mae", scen = "steady";

    function compute() {
      const n = A.length, rows = A.map((a, i) => {
        const f = F[i], e = a - f;
        return { a, f, e, abs: Math.abs(e), sq: e * e, ape: a === 0 ? Infinity : (Math.abs(e) / Math.abs(a)) * 100, sape: Math.abs(a) + Math.abs(f) === 0 ? 0 : (200 * Math.abs(e)) / (Math.abs(a) + Math.abs(f)),
          xape: Math.max(Math.abs(a), Math.abs(f)) === 0 ? 0 : (100 * Math.abs(e)) / Math.max(Math.abs(a), Math.abs(f)) };
      });
      let nd = 0; for (let i = 1; i < n; i++) nd += Math.abs(A[i] - A[i - 1]);
      const scale = nd / (n - 1);
      rows.forEach((r) => (r.scaled = scale > 0 ? r.abs / scale : Infinity));
      const mean = (k) => rows.reduce((s, r) => s + r[k], 0) / n;
      const sumA = A.reduce((s, v) => s + Math.abs(v), 0);
      const m = {
        mae: mean("abs"), rmse: Math.sqrt(mean("sq")), mape: mean("ape"), smape: mean("sape"),
        wape: sumA ? (rows.reduce((s, r) => s + r.abs, 0) / sumA) * 100 : Infinity, mase: scale > 0 ? mean("abs") / scale : Infinity, bias: mean("e"), xacc: 100 - mean("xape"),
      };
      return { rows, m, scale };
    }

    const show = (id, v) => {
      if (!isFinite(v)) return id === "mape" ? "undefined" : "∞";
      if (["mape", "smape", "wape", "xacc"].includes(id)) return v.toFixed(1) + "%";
      if (id === "mase") return v.toFixed(2);
      if (id === "bias") return (v > 0 ? "+" : "") + fmt(v);
      return fmt(v);
    };

    function drawChart() {
      const all = A.concat(F), lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.15 || 1;
      if (dragIdx < 0) { chart.x = [-0.5, A.length - 0.5]; chart.y = [Math.min(0, lo - pad), hi + pad]; }
      chart.clear();
      chart.axes({ xTicks: A.map((_, i) => i), xFormat: (v) => String(v + 1), xLabel: "period", yCount: 5, yFormat: (v) => (Math.abs(v) >= 1e4 ? (v / 1000).toFixed(0) + "k" : String(+v.toFixed(2))) });
      chart.clip((g) => {
        g.strokeStyle = css("--muted"); g.lineWidth = 2; g.setLineDash([3, 3]);
        A.forEach((a, i) => { g.beginPath(); g.moveTo(chart.sx(i), chart.sy(a)); g.lineTo(chart.sx(i), chart.sy(F[i])); g.stroke(); });
      });
      const xs = A.map((_, i) => i);
      chart.path(xs, A, css("--ink"), 2);
      chart.path(xs, F, css("--warm"), 2, [6, 4]);
      A.forEach((a, i) => chart.dot(i, a, 5, css("--ink"), css("--surface")));
      F.forEach((f, i) => chart.dot(i, f, 5, css("--warm"), css("--surface")));
    }

    function drawBars(res) {
      const met = METRICS.find((x) => x.id === sel);
      let vals;
      if (sel === "bias") vals = res.rows.map((r) => r.e);
      else if (sel === "rmse") vals = res.rows.map((r) => r.sq);
      else vals = res.rows.map((r) => r[met.col]);
      const signed = sel === "bias";
      const tot = signed ? vals.reduce((s, v) => s + Math.abs(v), 0) : vals.reduce((s, v) => s + (isFinite(v) ? v : 0), 0);
      const share = vals.map((v) => (isFinite(v) ? (tot ? v / tot : 0) : NaN));
      const mx = Math.max(0.05, ...share.filter(isFinite).map(Math.abs));
      bars.x = [-0.5, A.length - 0.5];
      bars.y = signed ? [-mx * 1.1, mx * 1.1] : [0, mx * 1.1];
      bars.clear();
      bars.axes({ xTicks: A.map((_, i) => i), xFormat: (v) => String(v + 1), yCount: 3, yFormat: (v) => Math.round(v * 100) + "%" });
      bars.clip((g) => {
        share.forEach((s, i) => {
          const x0 = bars.sx(i - 0.35), w = bars.sx(i + 0.35) - x0;
          if (!isFinite(s)) {
            g.fillStyle = css("--bad"); g.font = `bold 13px ${css("--font-mono")}`; g.textAlign = "center"; g.textBaseline = "top";
            g.fillText("∞", bars.sx(i), bars.pad.t + 4); return;
          }
          g.fillStyle = s < 0 ? css("--violet") : css("--accent");
          const y0 = bars.sy(0), y1 = bars.sy(s);
          g.fillRect(x0, Math.min(y0, y1), w, Math.abs(y1 - y0));
        });
      });
      const top = share.map((s, i) => [Math.abs(s), i]).filter(([s]) => isFinite(s)).sort((p, q) => q[0] - p[0])[0];
      $("#shareCap").textContent = signed
        ? "Each period's error with its sign. Teal = actual above forecast (under-forecast), violet = forecast too high. Bias is near zero only when they cancel."
        : `Each period's share of the total behind ${met.name}${sel === "rmse" ? " (squared errors)" : ""}. Period ${top[1] + 1} contributes ${(top[0] * 100).toFixed(0)}%.` + (share.some((s) => !isFinite(s)) ? " ∞ marks a division by zero." : "");
    }

    function drawTable(res) {
      const hl = METRICS.find((x) => x.id === sel).col;
      const cols = [["a", "Actual A"], ["f", "Forecast F"], ["err", "Error e = A − F"], ["abs", "|e|"], ["sq", "e²"], ["ape", "|e|/A"], ["sape", "2|e|/(A+F)"], ["xape", "|e|/max(A,F)"], ["scaled", "|e| ÷ naive"]];
      const cell = (k, r, i) => {
        if (k === "a" || k === "f") return `<input type="number" step="any" data-k="${k}" data-i="${i}" value="${+(k === "a" ? r.a : r.f).toFixed(2)}" aria-label="${k === "a" ? "Actual" : "Forecast"} for period ${i + 1}" style="width:84px;font:inherit;font-family:var(--font-mono);text-align:right;padding:3px 6px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink)">`;
        const v = k === "err" ? r.e : r[k];
        if (!isFinite(v)) return `<span style="color:var(--bad)">÷ 0</span>`;
        if (k === "ape" || k === "sape" || k === "xape") return v.toFixed(1) + "%";
        if (k === "scaled") return v.toFixed(2);
        return fmt(v, Math.abs(v) >= 1000 ? 0 : 2);
      };
      const bg = (k) => (k === hl ? "background:var(--accent-soft);" : "");
      const tot = (k) => {
        const map = { abs: ["mean", "mae"], sq: ["mean", "mse"], ape: ["mean", "mape"], sape: ["mean", "smape"], scaled: ["mean", "mase"], err: ["mean", "bias"], xape: ["mean", "xacc"] };
        if (!map[k]) return "";
        const v = k === "sq" ? res.m.rmse ** 2 : res.m[map[k][1]];
        if (k === "xape") return `${(100 - v).toFixed(1)}%<br><span style="color:var(--muted)">1 − that = ${v.toFixed(1)}%</span>`;
        return k === "sq" ? `${fmt(v)}<br><span style="color:var(--muted)">√ = ${fmt(res.m.rmse)}</span>` : show(map[k][1], v);
      };
      $("#tbl").innerHTML =
        `<tr><th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500">#</th>${cols.map(([k, t]) => `<th style="${bg(k)}text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500;white-space:nowrap">${t}</th>`).join("")}</tr>` +
        res.rows.map((r, i) => `<tr><td style="padding:3px 6px;border-bottom:1px solid var(--grid);color:var(--muted)">${i + 1}</td>${cols.map(([k]) => `<td style="${bg(k)}text-align:right;padding:3px 6px;border-bottom:1px solid var(--grid);font-family:var(--font-mono);white-space:nowrap">${cell(k, r, i)}</td>`).join("")}</tr>`).join("") +
        `<tr><td style="padding:6px;font-weight:600">mean</td><td></td><td></td>${cols.slice(2).map(([k]) => `<td style="${bg(k)}text-align:right;padding:6px;font-family:var(--font-mono);font-weight:600">${tot(k)}</td>`).join("")}</tr>` +
        `<tr><td colspan="10" style="padding:6px;color:var(--muted);font-size:.8rem">Naive scale for MASE = mean |A<sub>t</sub> − A<sub>t−1</sub>| = ${fmt(res.scale)}. WAPE = Σ|e| ÷ Σ|A| = ${show("wape", res.m.wape)}.</td></tr>`;
      $("#tbl").querySelectorAll("input").forEach((inp) => inp.addEventListener("change", () => {
        const v = parseFloat(inp.value);
        if (!isFinite(v)) { inp.value = inp.dataset.k === "a" ? A[+inp.dataset.i] : F[+inp.dataset.i]; return; }
        (inp.dataset.k === "a" ? A : F)[+inp.dataset.i] = v;
        draw();
      }));
    }

    function drawList(res) {
      $("#mlist").innerHTML = METRICS.map((x) => `<button type="button" data-m="${x.id}" aria-pressed="${x.id === sel}"
        style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;text-align:left;padding:7px 10px;border-radius:8px;cursor:pointer;font:inherit;color:var(--ink);
        border:1px solid ${x.id === sel ? "var(--accent)" : "var(--line)"};background:${x.id === sel ? "var(--accent-soft)" : "var(--bg)"}">
        <span><b>${x.name}</b><br><span style="font-size:.78rem;color:var(--muted)">${x.full}</span></span>
        <span class="num" style="font-size:1rem;${!isFinite(res.m[x.id]) ? "color:var(--bad)" : ""}">${show(x.id, res.m[x.id])}</span></button>`).join("");
      $("#mlist").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { sel = b.dataset.m; draw(); }));
    }

    function draw(skipTable) {
      const res = compute();
      drawChart(); drawBars(res); drawList(res);
      if (!skipTable) drawTable(res);
    }

    function load(k) {
      scen = k; A = SCEN[k].a.slice(); F = SCEN[k].f.slice();
      $("#lesson").innerHTML = `<b>${SCEN[k].name}.</b> ${SCEN[k].lesson}`;
      root.querySelectorAll("#scen button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.s === k)));
      root.querySelectorAll("#scen button").forEach((b) => b.classList.toggle("primary", b.dataset.s === k));
      sel = { outlier: "rmse", small: "mape", zero: "mape", asym: "mape", biased: "bias", scale: "mae" }[k] || "mae";
      draw();
    }

    root.querySelectorAll("#scen button").forEach((b) => b.addEventListener("click", () => load(b.dataset.s)));
    $("#naive").addEventListener("click", () => { F = A.map((a, i) => (i ? A[i - 1] : a)); draw(); });
    $("#perfect").addEventListener("click", () => { F = A.slice(); draw(); });

    // drag actual or forecast dots vertically
    let dragIdx = -1, dragArr = null;
    const pos = (e) => { const r = chart.c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const near = (px, py) => {
      let best = null, bd = 12 * 12;
      [[A, "a"], [F, "f"]].forEach(([arr]) => arr.forEach((v, i) => { const d = (chart.sx(i) - px) ** 2 + (chart.sy(v) - py) ** 2; if (d < bd) { bd = d; best = [arr, i]; } }));
      return best;
    };
    chart.c.addEventListener("pointerdown", (e) => {
      const hit = near(...pos(e));
      if (hit) { [dragArr, dragIdx] = hit; chart.c.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    chart.c.addEventListener("pointermove", (e) => {
      const [px, py] = pos(e);
      if (dragIdx < 0) { chart.c.style.cursor = near(px, py) ? "ns-resize" : "default"; return; }
      const v = chart.iy(py);
      dragArr[dragIdx] = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
      draw();
    });
    const end = () => { dragIdx = -1; dragArr = null; draw(); };
    chart.c.addEventListener("pointerup", end);
    chart.c.addEventListener("pointercancel", () => { dragIdx = -1; });

    load("steady");
    return watch([chart.c, bars.c], (resized) => { if (resized) { chart.resize(); bars.resize(); } draw(true); });
  },
});
