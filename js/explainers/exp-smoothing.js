Lab.register({
  id: "exponential-smoothing",
  group: "Forecasting",
  title: "Moving averages and exponential smoothing",
  blurb: "Naive, moving average and exponential smoothing up to Holt-Winters, scored head to head on held-out months. Paste in your own data or drag the points.",
  lede: "Exponential smoothing forecasts the future from a weighted average of the past, with recent months counting most. Adding a trend term and a seasonal term turns the simple version into Holt's method and then Holt-Winters, the workhorse of business forecasting.",
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 44 L12 36 L20 42 L28 30 L36 36 L44 26 L52 32 L60 22"/><path d="M60 22 L68 28 L76 18 L84 24 L92 14" stroke-dasharray="4 3"/><path d="M60 22 L92 4 L92 34 Z" fill="currentColor" fill-opacity=".12" stroke="none"/><line x1="60" y1="4" x2="60" y2="60" opacity=".3"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    let N = 72, TEST = 12, TRAIN = 60, M = 12;
    const METHODS = {
      naive: { name: "Naive (repeat last value)", params: [] },
      snaive: { name: "Seasonal naive (same month last year)", params: [] },
      ma: { name: "Moving average (last k periods)", params: ["k"] },
      ses: { name: "Simple exponential smoothing", params: ["a"] },
      holt: { name: "Holt (level + trend)", params: ["a", "b"] },
      hw: { name: "Holt-Winters (level + trend + season)", params: ["a", "b", "g"] },
    };
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="fsc" aria-label="Monthly sales series with fitted values and forecast"></canvas>
          <div class="legend">
            <span><i style="background:var(--ink)"></i>Actual sales</span>
            <span><i style="background:var(--accent)"></i>One-step-ahead fit</span>
            <span><i style="background:var(--warm)"></i>Forecast for the held-out year</span>
            <span><i style="background:var(--warm);opacity:.3"></i>Rough 95% interval</span>
          </div>
          <figcaption>The shaded right-hand stretch is held out. The model never sees it, so its errors there are an honest score. Drag any black dot up or down to change that actual value.</figcaption>
        </figure>
        <div class="plot" style="padding:14px;display:grid;gap:10px">
          <h4 style="margin:0;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">The actuals (edit or paste your own)</h4>
          <textarea id="dataTxt" rows="4" spellcheck="false" aria-label="Actual values, separated by commas, spaces or new lines"
            style="width:100%;font:13px/1.5 var(--font-mono);padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);resize:vertical"></textarea>
          <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
            <button class="btn primary" id="useData" type="button">Use these numbers</button>
            <label for="seasonLen" style="font-size:.9rem">Season length</label>
            <select id="seasonLen" style="width:auto"><option value="12">12 (monthly)</option><option value="4">4 (quarterly)</option><option value="7">7 (daily, weekly cycle)</option><option value="52">52 (weekly, yearly cycle)</option></select>
          </div>
          <p class="hint" id="dataMsg">Separate values with commas, spaces or new lines, oldest first. You can paste a column straight from Excel. Needs at least 8 values; Holt-Winters needs at least two full seasons plus a hold-out.</p>
        </div>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">The last six training months, worked out</h4>
          <div style="overflow-x:auto"><table id="work" style="width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono)"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Every method, head to head on the held-out data</h4>
          <p class="hint" style="margin:0 0 10px">Each method uses the parameters that fit the training data best. MASE below 1 beats the naive forecast. Click a row to switch the chart to that method.</p>
          <div style="overflow-x:auto"><table id="cmp" style="width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums"></table></div>
        </div>`,
      panel: `
        <div class="ctrl">
          <label for="meth">Method</label>
          <select id="meth">${Object.entries(METHODS).map(([k, m]) => `<option value="${k}"${k === "hw" ? " selected" : ""}>${m.name}</option>`).join("")}</select>
        </div>
        <div class="ctrl" data-p="a">
          <label for="a">α, level smoothing <output id="aV"></output></label>
          <input type="range" id="a" min="0.01" max="1" step="0.01" value="0.3">
        </div>
        <div class="ctrl" data-p="b">
          <label for="b">β, trend smoothing <output id="bV"></output></label>
          <input type="range" id="b" min="0" max="1" step="0.01" value="0.05">
        </div>
        <div class="ctrl" data-p="k">
          <label for="k">k, periods averaged <output id="kV"></output></label>
          <input type="range" id="k" min="2" max="24" step="1" value="6">
        </div>
        <div class="ctrl" data-p="g">
          <label for="g">γ, season smoothing <output id="gV"></output></label>
          <input type="range" id="g" min="0" max="1" step="0.01" value="0.2">
        </div>
        <div class="btns"><button class="btn primary" id="opt" type="button">Find best parameters</button></div>
        <div class="readouts">
          <div class="ro"><b>Training RMSE</b><span class="num" id="rtr"></span></div>
          <div class="ro"><b>Held-out MAE</b><span class="num" id="mae"></span></div>
          <div class="ro"><b>Held-out RMSE</b><span class="num" id="rte"></span></div>
          <div class="ro"><b>Held-out MAPE</b><span class="num" id="mape"></span></div>
          <div class="ro"><b>Held-out bias</b><span class="num" id="bias"></span></div>
          <p class="hint">What these mean and when each misleads: <a href="#forecast-accuracy">forecast accuracy</a>.</p>
        </div>
        <div>
          <h4>The data</h4>
          <div class="ctrl"><label for="tr">Trend per month <output id="trV"></output></label><input type="range" id="tr" min="-1" max="2" step="0.1" value="0.8"></div>
          <div class="ctrl"><label for="se">Seasonal swing <output id="seV"></output></label><input type="range" id="se" min="0" max="30" step="1" value="15"></div>
          <div class="ctrl"><label for="no">Noise <output id="noV"></output></label><input type="range" id="no" min="0" max="15" step="0.5" value="5"></div>
          <div class="btns"><button class="btn" id="newd" type="button">New series</button></div>
        </div>`,
      notes: `
        <section>
          <h2>The update equations</h2>
          <p>Each month, blend what you just saw with what you expected. α, β and γ say how much to trust the new observation.</p>
          <div class="eq">level ℓ<sub>t</sub> = α(y<sub>t</sub> − s<sub>t−12</sub>) + (1 − α)(ℓ<sub>t−1</sub> + b<sub>t−1</sub>)</div>
          <div class="eq">trend b<sub>t</sub> = β(ℓ<sub>t</sub> − ℓ<sub>t−1</sub>) + (1 − β)b<sub>t−1</sub></div>
          <div class="eq">season s<sub>t</sub> = γ(y<sub>t</sub> − ℓ<sub>t</sub>) + (1 − γ)s<sub>t−12</sub></div>
          <div class="eq">forecast ŷ<sub>t+h</sub> = ℓ<sub>t</sub> + h·b<sub>t</sub> + s<sub>t+h−12</sub></div>
          <p>A moving average is the simplest smoother: forecast = mean of the last k values, each weighted 1/k. Simple exponential smoothing keeps only the level. Holt adds the trend. Holt-Winters adds the seasonal pattern.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Look at the head-to-head table. A moving average lags behind any trend, and it flattens the seasonal peaks, so on seasonal data it usually loses even to the seasonal naive forecast.</li>
            <li>Step through the methods from naive to Holt-Winters and watch the held-out RMSE drop as each new component matches something real in the data.</li>
            <li>Simple smoothing with α = 1 is exactly the naive forecast. Small α averages over a long memory and reacts slowly.</li>
            <li>Set the seasonal swing to 0. Holt does as well as Holt-Winters, because there is no season to learn.</li>
            <li>Turn the noise up and press "Find best parameters". The best α falls: with noisy data, each new point deserves less trust.</li>
            <li>Drag one held-out point far up to make a one-off spike. RMSE jumps much more than MAE, because RMSE squares the big miss.</li>
            <li>Paste your own monthly sales from Excel into the box under the chart and see which method wins.</li>
          </ol>
        </section>
        <section>
          <h2>Terms</h2>
          <ul>
            <li><b>One-step-ahead fit</b>: the forecast for each month made using only earlier months.</li>
            <li><b>RMSE</b>: root mean squared error, in the same units as sales. <b>MAPE</b>: average error as a percentage of actual sales.</li>
            <li><b>Hold-out</b>: data kept back to test the model. Always judge a forecast on months it hasn't seen.</li>
            <li>The interval here is a rough rule (training error × √h). Proper intervals come from the ETS state-space form of these models.</li>
          </ul>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const plot = new Plot($("#fsc"), { x: [0, N - 1], pad: { l: 50 } });
    let seed = 21, y = [], dragT = -1;

    let custom = false;
    function setLength(n) {
      N = n;
      TEST = N >= 3 * M ? M : Math.max(2, Math.round(N * 0.2));
      TRAIN = N - TEST;
      plot.x = [0, N - 1];
    }
    function syncText() { $("#dataTxt").value = y.map((v) => +v.toFixed(1)).join(", "); }
    function makeData() {
      custom = false;
      setLength(72);
      const r = rng(seed), tr = +$("#tr").value, se = +$("#se").value, no = +$("#no").value;
      y = Array.from({ length: N }, (_, t) => 100 + tr * t + se * Math.sin((2 * Math.PI * (t - 2)) / M) + 0.4 * se * Math.cos((4 * Math.PI * t) / M) + r.normal() * no);
      syncText();
    }
    function useText() {
      const vals = $("#dataTxt").value.split(/[\s,;]+/).filter(Boolean).map(Number);
      const bad = vals.filter((v) => !isFinite(v)).length;
      if (bad) { $("#dataMsg").innerHTML = `<span style="color:var(--bad)">${bad} entr${bad > 1 ? "ies aren't numbers" : "y isn't a number"}. Use plain numbers like 120 or 98.5, without currency signs or thousands separators.</span>`; return; }
      if (vals.length < 8) { $("#dataMsg").innerHTML = `<span style="color:var(--bad)">Only ${vals.length} values. Add at least 8.</span>`; return; }
      custom = true; y = vals; setLength(vals.length);
      $("#dataMsg").textContent = `Using your ${N} values: ${TRAIN} for training, the last ${TEST} held out.`;
      draw();
    }
    const label = (t) => (M === 12 && !custom ? `Y${Math.floor(t / 12) + 1} ${MONTHS[t % 12]}` : `t = ${t + 1}`);
    const allowed = (method) => (method === "hw" ? TRAIN >= 2 * M + 1 : method === "snaive" ? TRAIN > M : true);

    // Runs the chosen method over the training data; returns fitted one-step values, states, and forecasts.
    function run(method, a, b, g, k = +$("#k").value) {
      const fit = new Array(TRAIN).fill(NaN), rows = [];
      let fc;
      if (method === "ma") {
        k = Math.min(k, TRAIN - 1);
        for (let t = k; t < TRAIN; t++) { let s = 0; for (let j = t - k; j < t; j++) s += y[j]; fit[t] = s / k; }
        let s = 0; for (let j = TRAIN - k; j < TRAIN; j++) s += y[j];
        fc = Array.from({ length: TEST }, () => s / k);
      } else if (method === "naive") {
        for (let t = 1; t < TRAIN; t++) fit[t] = y[t - 1];
        fc = Array.from({ length: TEST }, () => y[TRAIN - 1]);
      } else if (method === "snaive") {
        for (let t = M; t < TRAIN; t++) fit[t] = y[t - M];
        fc = Array.from({ length: TEST }, (_, h) => y[TRAIN - M + (h % M)]);
      } else {
        const useT = method !== "ses", useS = method === "hw";
        // initial state from the first year
        const first = y.slice(0, M), second = y.slice(M, 2 * M);
        const m1 = first.reduce((s, v) => s + v, 0) / M, m2 = second.reduce((s, v) => s + v, 0) / M;
        let L = useS ? m1 : y[0], B = useT ? (useS ? (m2 - m1) / M : y[1] - y[0]) : 0;
        const S = useS ? first.map((v) => v - m1) : new Array(M).fill(0);
        const start = useS ? M : 1;
        if (useS) L = m1 + B * (M - 1) / 2;
        for (let t = start; t < TRAIN; t++) {
          const s = S[t % M];
          const yhat = L + B + s;
          fit[t] = yhat;
          const Lp = L, Bp = B;
          L = a * (y[t] - s) + (1 - a) * (Lp + Bp);
          if (useT) B = b * (L - Lp) + (1 - b) * Bp;
          if (useS) S[t % M] = g * (y[t] - L) + (1 - g) * s;
          rows.push({ t, y: y[t], yhat, L, B, s: S[t % M] });
        }
        fc = Array.from({ length: TEST }, (_, h) => L + (h + 1) * B + S[(TRAIN + h) % M]);
      }
      let se = 0, cnt = 0;
      for (let t = 0; t < TRAIN; t++) if (isFinite(fit[t])) { se += (y[t] - fit[t]) ** 2; cnt++; }
      return { fit, fc, rows, rmse: Math.sqrt(se / cnt) };
    }

    function scores(fc) {
      let se = 0, ape = 0, ae = 0, e = 0;
      fc.forEach((f, h) => { const a = y[TRAIN + h]; se += (a - f) ** 2; ae += Math.abs(a - f); e += a - f; ape += Math.abs((a - f) / a); });
      return { rmse: Math.sqrt(se / TEST), mae: ae / TEST, bias: e / TEST, mape: (ape / TEST) * 100 };
    }

    function draw() {
      [...$("#meth").options].forEach((o) => (o.disabled = !allowed(o.value)));
      if (!allowed($("#meth").value)) $("#meth").value = "holt";
      const method = $("#meth").value, a = +$("#a").value, b = +$("#b").value, g = +$("#g").value;
      ["a", "b", "g", "k"].forEach((p) => { root.querySelector(`[data-p="${p}"]`).hidden = !METHODS[method].params.includes(p); $(`#${p}V`).textContent = p === "k" ? $("#k").value : (+$("#" + p).value).toFixed(2); });
      $("#trV").textContent = (+$("#tr").value).toFixed(1); $("#seV").textContent = $("#se").value; $("#noV").textContent = (+$("#no").value).toFixed(1);
      $("#opt").hidden = !METHODS[method].params.length;
      const res = run(method, a, b, g), sc = scores(res.fc);

      const span = Math.max(...y, ...res.fc) - Math.min(...y, ...res.fc) || 1;
      const lo = Math.min(...y, ...res.fc) - span * 0.12, hi = Math.max(...y, ...res.fc) + span * 0.12;
      if (dragT < 0) plot.y = [lo, hi];
      plot.clear();
      const ctx = plot.ctx;
      ctx.fillStyle = css("--grid");
      ctx.fillRect(plot.sx(TRAIN - 0.5), plot.pad.t, plot.sx(N - 1) - plot.sx(TRAIN - 0.5), plot.ih);
      const ticks = M === 12 && !custom ? [0, 12, 24, 36, 48, 60] : Lab.niceTicks(0, N - 1, 7).filter((v) => Number.isInteger(v));
      plot.axes({ xTicks: ticks, xFormat: (v) => (M === 12 && !custom ? `Y${v / 12 + 1} Jan` : String(v + 1)), yLabel: custom ? "your values" : "units sold", xLabel: M === 12 && !custom ? "" : "period" });
      // interval band
      const xsF = [TRAIN - 1, ...res.fc.map((_, h) => TRAIN + h)];
      const ysF = [y[TRAIN - 1], ...res.fc];
      plot.clip((g2) => {
        g2.fillStyle = css("--warm-soft");
        g2.beginPath();
        xsF.forEach((x, i) => { const w = 1.96 * res.rmse * Math.sqrt(Math.max(i, 0)); const py = plot.sy(ysF[i] + w); i ? g2.lineTo(plot.sx(x), py) : g2.moveTo(plot.sx(x), py); });
        for (let i = xsF.length - 1; i >= 0; i--) { const w = 1.96 * res.rmse * Math.sqrt(i); g2.lineTo(plot.sx(xsF[i]), plot.sy(ysF[i] - w)); }
        g2.fill();
      });
      plot.path(y.map((_, t) => t), y, css("--ink"), 1.6);
      y.forEach((v, t) => plot.dot(t, v, 2.2, css("--ink")));
      plot.path(res.fit.map((_, t) => t), res.fit, css("--accent"), 2);
      plot.path(xsF, ysF, css("--warm"), 2.5, [6, 4]);
      ctx.fillStyle = css("--muted"); ctx.font = `12px ${css("--font-body")}`; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("held out", plot.sx(TRAIN) + 4, plot.pad.t + 4);

      $("#rtr").textContent = fmt(res.rmse);
      $("#rte").textContent = fmt(sc.rmse);
      $("#mape").textContent = isFinite(sc.mape) ? sc.mape.toFixed(1) + "%" : "undefined (an actual is 0)";
      $("#mae").textContent = fmt(sc.mae);
      $("#bias").textContent = (sc.bias > 0 ? "+" : "") + fmt(sc.bias) + (Math.abs(sc.bias) > 0.5 * sc.mae ? (sc.bias > 0 ? " (under-forecasting)" : " (over-forecasting)") : "");

      const th = (t) => `<th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted);font-family:var(--font-body)">${t}</th>`;
      const td = (t, c) => `<td style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--grid)${c ? ";color:var(" + c + ")" : ""}">${t}</td>`;
      if (!res.rows.length) {
        if (method === "ma") {
          const k = Math.min(+$("#k").value, TRAIN - 1);
          const last = y.slice(TRAIN - k, TRAIN);
          $("#work").innerHTML = `<tr><td style="font-family:var(--font-body);padding:4px 0;white-space:normal">The forecast for every future period is the plain average of the last ${k} training values:<br>
            <span style="font-family:var(--font-mono)">(${last.map((v) => v.toFixed(1)).join(" + ")}) ÷ ${k} = <b style="color:var(--warm)">${(last.reduce((a, b) => a + b, 0) / k).toFixed(1)}</b></span><br>
            <span style="color:var(--muted)">Every period in the window counts equally and older ones count not at all. Exponential smoothing instead fades weights gradually: α, α(1−α), α(1−α)², …</span></td></tr>`;
        } else
        $("#work").innerHTML = `<tr><td style="font-family:var(--font-body);color:var(--muted);padding:4px 0">${method === "naive" ? "The naive forecast for every future month is the last value seen" : "The seasonal naive forecast copies the same month from the previous year"}: no state to update.</td></tr>`;
      } else {
        const useT = method !== "ses", useS = method === "hw";
        $("#work").innerHTML = `<tr>${th(M === 12 && !custom ? "month" : "period")}${th("actual y")}${th("forecast ŷ")}${th("error")}${th("level ℓ")}${useT ? th("trend b") : ""}${useS ? th("season s") : ""}</tr>` +
          res.rows.slice(-6).map((r) => `<tr>${td(label(r.t))}${td(r.y.toFixed(1))}${td(r.yhat.toFixed(1), "--accent")}${td((r.y - r.yhat).toFixed(1), "--warm")}${td(r.L.toFixed(1))}${useT ? td(r.B.toFixed(2)) : ""}${useS ? td(r.s.toFixed(1)) : ""}</tr>`).join("");
      }
      clearTimeout(cmpTimer); cmpTimer = setTimeout(compareAll, dragT >= 0 ? 400 : 60);
    }

    function bestParams(method) {
      const ps = METHODS[method].params;
      if (method === "ma") {
        let best = { r: Infinity };
        for (let k = 2; k <= Math.min(24, TRAIN - 2); k++) { const r = run("ma", 0, 0, 0, k).rmse; if (r < best.r) best = { r, k, a: +$("#a").value, b: +$("#b").value, g: +$("#g").value }; }
        return best;
      }
      const grid = [0.01, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
      const gridB = [0, 0.01, 0.03, 0.05, 0.1, 0.2, 0.3, 0.5];
      let best = { r: Infinity, a: 0.3, b: 0.05, g: 0.2, k: +$("#k").value };
      if (!ps.length) return { ...best, r: run(method, 0, 0, 0).rmse };
      for (const a of grid) for (const b of ps.includes("b") ? gridB : [0]) for (const g of ps.includes("g") ? grid.slice(0, 10) : [0]) {
        const r = run(method, a, b, g).rmse;
        if (r < best.r) best = { r, a, b, g, k: +$("#k").value };
      }
      return best;
    }

    let cmpTimer = 0;
    function compareAll() {
      let nd = 0; for (let t = 1; t < TRAIN; t++) nd += Math.abs(y[t] - y[t - 1]);
      const scale = nd / (TRAIN - 1);
      const rows = Object.keys(METHODS).filter(allowed).map((m) => {
        const p = bestParams(m), res = run(m, p.a, p.b, p.g, p.k), sc = scores(res.fc);
        const pl = METHODS[m].params.map((q) => (q === "k" ? `k=${p.k}` : `${{ a: "α", b: "β", g: "γ" }[q]}=${p[q]}`)).join(" ");
        return { m, pl, ...sc, mase: sc.mae / scale };
      });
      const best = Math.min(...rows.map((r) => r.rmse));
      const th = (t, l) => `<th style="text-align:${l ? "left" : "right"};padding:4px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted)">${t}</th>`;
      const td = (t, l) => `<td style="text-align:${l ? "left" : "right"};padding:4px 6px;border-bottom:1px solid var(--grid);${l ? "" : "font-family:var(--font-mono);"}">${t}</td>`;
      $("#cmp").innerHTML = `<tr>${th("method", 1)}${th("best params", 1)}${th("MAE")}${th("RMSE")}${th("MAPE")}${th("MASE")}</tr>` +
        rows.map((r) => `<tr data-m="${r.m}" style="cursor:pointer;${r.rmse === best ? "background:var(--accent-soft);" : ""}${r.m === $("#meth").value ? "font-weight:600;" : ""}">${td(METHODS[r.m].name + (r.rmse === best ? ' <span class="pill ok">best</span>' : ""), 1)}${td(`<span style="font-family:var(--font-mono);color:var(--muted)">${r.pl || "–"}</span>`, 1)}${td(fmt(r.mae))}${td(fmt(r.rmse))}${td(isFinite(r.mape) ? r.mape.toFixed(1) + "%" : "–")}${td(r.mase.toFixed(2))}</tr>`).join("");
      $("#cmp").querySelectorAll("tr[data-m]").forEach((tr) => tr.addEventListener("click", () => {
        const m = tr.dataset.m, p = bestParams(m);
        $("#meth").value = m; $("#a").value = p.a; $("#b").value = p.b; $("#g").value = p.g; $("#k").value = p.k; draw();
      }));
    }

    function optimize() {
      const method = $("#meth").value, ps = METHODS[method].params;
      if (method === "ma") { $("#k").value = bestParams("ma").k; draw(); return; }
      const grid = [0.01, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
      const gridB = [0, 0.01, 0.03, 0.05, 0.1, 0.2, 0.3, 0.5];
      let best = { r: Infinity };
      for (const a of grid) for (const b of ps.includes("b") ? gridB : [0]) for (const g of ps.includes("g") ? grid.slice(0, 10) : [0]) {
        const r = run(method, a, b, g).rmse;
        if (r < best.r) best = { r, a, b, g };
      }
      $("#a").value = best.a; $("#b").value = best.b; $("#g").value = best.g;
      draw();
    }

    $("#meth").addEventListener("change", draw);
    ["#a", "#b", "#g", "#k"].forEach((s) => $(s).addEventListener("input", draw));
    ["#tr", "#se", "#no"].forEach((s) => $(s).addEventListener("input", () => { makeData(); draw(); }));
    $("#newd").addEventListener("click", () => { seed++; makeData(); draw(); });
    $("#opt").addEventListener("click", optimize);

    $("#useData").addEventListener("click", useText);
    $("#seasonLen").addEventListener("change", (e) => { M = +e.target.value; if (custom) setLength(N); else makeData(); draw(); });
    // Drag actuals up and down on the chart.
    const posOf = (e) => { const r = plot.c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    plot.c.addEventListener("pointerdown", (e) => {
      const [px, py] = posOf(e);
      let best = -1, bd = 12 * 12;
      y.forEach((v, t) => { const d = (plot.sx(t) - px) ** 2 + (plot.sy(v) - py) ** 2; if (d < bd) { bd = d; best = t; } });
      if (best >= 0) { dragT = best; plot.c.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    plot.c.addEventListener("pointermove", (e) => {
      const [px, py] = posOf(e);
      if (dragT < 0) { plot.c.style.cursor = y.some((v, t) => (plot.sx(t) - px) ** 2 + (plot.sy(v) - py) ** 2 < 144) ? "ns-resize" : "default"; return; }
      y[dragT] = plot.iy(py); custom = custom || false; syncText();
      $("#dataMsg").textContent = `Changed ${label(dragT)} to ${y[dragT].toFixed(1)}.`;
      draw();
    });
    const endDrag = () => { dragT = -1; };
    plot.c.addEventListener("pointerup", endDrag);
    plot.c.addEventListener("pointercancel", endDrag);

    makeData(); draw();
    return watch([plot.c], (resized) => { if (resized) plot.resize(); draw(); });
  },
});
