Lab.register({
  id: "frozen-zones",
  group: "Supply chain",
  title: "Frozen zones and time fences",
  blurb: "Locking the near-term plan keeps the factory calm but stops it reacting. See the trade-off between schedule stability, safety stock and service as the frozen zone grows.",
  lede: "A production or supply plan is redone every week, but changing next week's plan is expensive: materials are ordered, shifts are booked, trucks are planned. So most businesses freeze the first few weeks. Inside the frozen zone the plan can't change, whatever the new forecast says. That buys stability, and costs responsiveness, which has to be paid for in safety stock.",
  quiz: [
    ["With a 4-week frozen zone, which forecast actually determined what was produced in week 10?", "The one available when week 10 entered the frozen zone, at the planning run 4 weeks earlier. That's why forecast accuracy should be measured at lag 4 (or more) for this business, not lag 1."],
    ["Why does a longer frozen zone need more safety stock for the same service?", "Production can't respond to demand changes inside the fence, so stock has to absorb all the forecast error over the frozen weeks plus the lead time, a longer window with more uncertainty."],
    ["What is 'schedule nervousness'?", "Frequent, often small, changes to the plan from one planning run to the next. They ripple into materials, labour and suppliers, and can cause more cost and confusion than the forecast errors they react to."],
    ["Many companies use a frozen zone, then a 'slushy' zone, then a free zone. What's the idea?", "Frozen: no changes. Slushy: limited changes, say ±10%, or only with approval. Free: anything goes. It keeps the near term stable while still allowing some reaction before the plan freezes."],
  ],
  diy: {
    intro: "Weekly forecast in C2:C27, opening stock in H1, safety stock in H2, frozen weeks F in H3.",
    steps: [
      ["Projected stock before the planned production of week w.", "D2: =H1\nD3: =D2+E2-C2"],
      ["Planned production: top up to forecast + safety stock.", "E2: =MAX(0,C2+$H$2-D2)"],
      ["Inside the frozen zone the plan can't change: keep last cycle's plan.", "=IF(ROW()-1<=$H$3,old_plan,MAX(0,C2+$H$2-D2))"],
      ["Count plan changes (nervousness) between two runs.", "=SUMPRODUCT(--(ABS(plan_new-plan_old)>0))"],
      ["Service: weeks where projected stock fell below zero.", "=COUNTIF(D2:D27,\"<0\")"],
    ],
  },
  deeper: [
    ["Master production schedule — Wikipedia", "https://en.wikipedia.org/wiki/Master_production_schedule", "the plan that time fences protect"],
    ["Material requirements planning — Wikipedia", "https://en.wikipedia.org/wiki/Material_requirements_planning", "how plan changes ripple down to materials"],
    ["FPP3: Forecasting horizon and accuracy", "https://otexts.com/fpp3/accuracy.html", "why error grows with lag"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="8" width="30" height="48" fill="currentColor" fill-opacity=".2" stroke="none"/><line x1="34" y1="4" x2="34" y2="60"/><g fill="currentColor"><rect x="8" y="30" width="8" height="26"/><rect x="20" y="30" width="8" height="26"/><rect x="40" y="24" width="8" height="32" opacity=".6"/><rect x="54" y="34" width="8" height="22" opacity=".6"/><rect x="68" y="20" width="8" height="36" opacity=".6"/><rect x="82" y="28" width="8" height="28" opacity=".6"/></g></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const T = 520, H = 12, NEAR = 4, SHOW = 30, FMAX = 8, ROWS = 8;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="fzc" aria-label="Demand, production and inventory over 30 weeks"></canvas>
          <div class="legend"><span><i style="background:var(--ink)"></i>Demand</span><span><i style="background:var(--accent);height:10px;opacity:.5"></i>Production</span><span><i style="background:var(--good)"></i>Inventory at week end</span><span><i style="background:var(--bad)"></i>Lost sales</span></div>
          <figcaption>The last 30 weeks of a 10-year simulation, with safety stock set so the fill rate meets the target.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="fzt" aria-label="Safety stock needed and plan changes for each frozen zone length"></canvas>
          <div class="legend"><span><i style="background:var(--warm);height:10px;opacity:.6"></i>Safety stock needed for the fill-rate target</span><span><i style="background:var(--violet)"></i>Plan changes inside the next ${NEAR} weeks, per run</span></div>
          <figcaption>The trade-off. Each frozen zone length is simulated over 10 years. Stability (fewer changes) is bought with stock.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">The plan, run by run</h4>
          <p class="hint" style="margin:0 0 10px">Each row is one weekly planning run; each column is a production week. Shaded cells are frozen. Purple cells changed since the previous run.</p>
          <div style="overflow-x:auto"><table id="pw" style="border-collapse:collapse;font-size:.78rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono)"></table></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="F">Frozen zone <output id="FV"></output></label><input type="range" id="F" min="0" max="${FMAX}" step="1" value="3"></div>
        <div class="ctrl"><label for="fr">Fill-rate target <output id="frV"></output></label><input type="range" id="fr" min="90" max="99.5" step="0.5" value="98"></div>
        <div>
          <h4>Demand</h4>
          <div class="ctrl"><label for="nz">Week-to-week noise (SD) <output id="nzV"></output></label><input type="range" id="nz" min="0" max="30" step="1" value="12"></div>
          <div class="ctrl"><label for="dr">Level drift per week (SD) <output id="drV"></output></label><input type="range" id="dr" min="0" max="10" step="0.5" value="3"></div>
        </div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New random demand</button></div>`,
      notes: `
        <section>
          <h2>How the planning works here</h2>
          <ol>
            <li>Each week, demand is forecast with <a href="#exponential-smoothing">exponential smoothing</a>: one number for every future week.</li>
            <li>The plan covers the next ${H} weeks. For weeks outside the frozen zone, production is set to bring projected stock up to forecast + safety stock.</li>
            <li>Weeks inside the frozen zone keep whatever the earlier run planned.</li>
            <li>The week is played out: production arrives, demand is served from stock, and anything unmet is lost.</li>
          </ol>
          <div class="eq">plan(w) = max(0, forecast + safety stock − projected stock before w)</div>
          <p><b>Near-term plan changes</b> add up how much each run moved the plan for the next ${NEAR} weeks, where changes are costly. Changes further out are cheap, so they aren't counted.</p>
          <p>Notice one more side effect: whatever correction is needed lands all at once in the first week outside the fence, so production gets lumpier as the zone grows. Watch the production standard deviation in the readouts.</p>
        </section>
        <section>
          <h2>What freezing does to forecasting</h2>
          <p>Once a week is frozen, later forecasts can't change what is produced for it. So the forecast that matters is the one at the moment of freezing, F weeks before. That's the lag your accuracy should be measured at, and it's usually worse than the lag-1 figure people quote (see <a href="#lead-time-error">lead-time forecast error</a>).</p>
          <p>It also means forecast improvements inside the fence add no value to production, though they may still help sales or logistics. Measure <a href="#forecast-value-added">FVA</a> at the frozen lag.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set the frozen zone to 0. The plan changes every week in response to every wobble, but needs the least stock.</li>
            <li>Step up one week at a time. Near-term changes barely fall until the fence covers the whole ${NEAR}-week costly window, because a partial fence only pushes the change into the first free week. Then they drop to zero, while the safety stock keeps climbing.</li>
            <li>Set level drift to 0. With demand that doesn't drift, the forecast barely moves, so freezing costs little.</li>
            <li>Raise the fill-rate target to 99.5%. The stock cost of a long frozen zone grows sharply.</li>
          </ol>
          <p>Freezing is a deliberate trade: the right length is where the cost of plan changes equals the cost of the extra stock.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pM = new Plot($("#fzc"), { x: [-0.5, SHOW - 0.5], pad: { l: 50 } });
    const pT = new Plot($("#fzt"), { x: [-0.6, FMAX + 0.6], pad: { l: 50 } });
    let seed = 13, D = null, R = null;

    function demand() {
      const r = rng(seed), sn = +$("#nz").value, sd = +$("#dr").value, d = [];
      let lvl = 100;
      for (let t = 0; t < T + H + 5; t++) { lvl = 100 + 0.98 * (lvl - 100) + sd * r.normal(); d.push(Math.max(0, Math.round(lvl + sn * r.normal()))); }
      const alpha = 0.3, S = []; let s = 100;
      d.forEach((v) => { s = alpha * v + (1 - alpha) * s; S.push(s); });
      return { d, S };
    }

    function run(F, ss, keep) {
      const { d, S } = D;
      let prodSum = 0, prodSq = 0, cnt = 0;
      let I = 100 + ss, sold = 0, dem = 0, invSum = 0, change = 0, cycles = 0;
      let plan = {}; const hist = [], series = [];
      for (let t = 1; t < T; t++) {
        const f = S[t - 1], np = {};
        let proj = I;
        for (let w = t; w < t + H; w++) {
          const p = w < t + F && plan[w] !== undefined ? plan[w] : Math.max(0, Math.round(f + ss - proj));
          np[w] = p; proj = proj + p - f;
        }
        if (t > 20) { for (let w = t; w < t + H - 1; w++) if (plan[w] !== undefined) change += (w < t + NEAR ? Math.abs(np[w] - plan[w]) : 0); /* only changes to the costly near window count */ cycles++; }
        if (keep && t >= T - SHOW - ROWS) hist.push({ t, p: { ...np } });
        plan = np;
        const avail = I + plan[t], ship = Math.min(avail, d[t]);
        I = avail - ship;
        if (t > 20) { prodSum += plan[t]; prodSq += plan[t] ** 2; cnt++; sold += ship; dem += d[t]; invSum += I; }
        if (keep && t >= T - SHOW) series.push({ t, d: d[t], p: plan[t], I, lost: d[t] - ship });
      }
      return { fill: sold / dem, inv: invSum / (T - 21), change: change / cycles, hist, series, psd: Math.sqrt(prodSq / cnt - (prodSum / cnt) ** 2) };
    }
    function needed(F, target) {
      let lo = 0, hi = 400;
      if (run(F, hi).fill < target) return hi;
      for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (run(F, m).fill >= target) hi = m; else lo = m; }
      return hi;
    }

    function compute() {
      D = demand();
      const target = +$("#fr").value / 100, F = +$("#F").value;
      const trade = Array.from({ length: FMAX + 1 }, (_, f) => { const ss = needed(f, target); const r = run(f, ss); return { f, ss, change: r.change, inv: r.inv }; });
      const ss = trade[F].ss, main = run(F, ss, true);
      const rm = (lag) => { let s = 0, c = 0; for (let t = 30; t < T; t++) { s += Math.abs(D.d[t] - D.S[t - lag]) / Math.max(1, D.d[t]); c++; } return (s / c) * 100; };
      R = { F, target, trade, ss, main, mape1: rm(1), mapeF: rm(F + 1) };
    }

    function draw() {
      const { F, target, trade, ss, main, mape1, mapeF } = R;
      $("#FV").textContent = F ? `${F} week${F > 1 ? "s" : ""}` : "none"; $("#frV").textContent = $("#fr").value + "%";
      $("#nzV").textContent = "±" + $("#nz").value; $("#drV").textContent = +$("#dr").value ? "±" + $("#dr").value : "none";

      const s = main.series, xs = s.map((_, i) => i);
      const hi = Math.max(...s.map((v) => Math.max(v.d, v.p, v.I))) * 1.1;
      pM.y = [0, hi]; pM.clear();
      pM.axes({ xLabel: "week", yLabel: "units", xFormat: (v) => String(v + 1) });
      const g = pM.ctx, bw = (pM.sx(1) - pM.sx(0)) * 0.6;
      g.save(); g.fillStyle = css("--accent"); g.globalAlpha = 0.35;
      s.forEach((v, i) => g.fillRect(pM.sx(i) - bw / 2, pM.sy(v.p), bw, pM.sy(0) - pM.sy(v.p)));
      g.globalAlpha = 0.9; g.fillStyle = css("--bad");
      s.forEach((v, i) => { if (v.lost > 0) g.fillRect(pM.sx(i) - bw / 2, pM.sy(v.d), bw, pM.sy(v.d - v.lost) - pM.sy(v.d)); });
      g.restore();
      pM.path(xs, s.map((v) => v.I), css("--good"), 2.2);
      pM.path(xs, s.map((v) => v.d), css("--ink"), 2);
      s.forEach((v, i) => pM.dot(i, v.d, 3, css("--ink")));

      const tmax = Math.max(...trade.map((v) => Math.max(v.ss, v.change))) * 1.15 || 1;
      pT.y = [0, tmax]; pT.clear();
      pT.axes({ xTicks: trade.map((v) => v.f), xLabel: "frozen zone (weeks)", yLabel: "units", yCount: 4 });
      const gt = pT.ctx, w = (pT.sx(1) - pT.sx(0)) * 0.5;
      gt.save(); gt.fillStyle = css("--warm");
      trade.forEach((v) => { gt.globalAlpha = v.f === F ? 0.85 : 0.4; gt.fillRect(pT.sx(v.f) - w / 2, pT.sy(v.ss), w, pT.sy(0) - pT.sy(v.ss)); });
      gt.restore();
      pT.path(trade.map((v) => v.f), trade.map((v) => v.change), css("--violet"), 2.4);
      trade.forEach((v) => pT.dot(v.f, v.change, v.f === F ? 6 : 3.5, css("--violet"), css("--surface")));

      $("#ro").innerHTML = `
        <div class="ro"><b>Safety stock needed</b><span class="num">${fmt(ss, 0)}</span></div>
        <div class="ro"><b>Average inventory</b><span class="num">${fmt(main.inv, 0)}</span></div>
        <div class="ro"><b>Fill rate achieved</b><span class="num">${(main.fill * 100).toFixed(1)}%</span></div>
        <div class="ro"><b>Near-term plan changes</b><span class="num">${fmt(main.change, 0)} units</span></div>
        <div class="ro"><b>Production SD per week</b><span class="num">${fmt(main.psd, 0)} units</span></div>
        <div class="ro"><b>Forecast MAPE at lag 1</b><span class="num">${mape1.toFixed(1)}%</span></div>
        <div class="ro"><b>at lag ${F + 1} (when frozen)</b><span class="num">${mapeF.toFixed(1)}%</span></div>
        <div class="ro" style="display:block;font-size:.8rem;color:var(--muted)">vs no frozen zone: ${ss - trade[0].ss >= 0 ? "+" : ""}${fmt(ss - trade[0].ss, 0)} safety stock, ${trade[0].change ? Math.round((1 - main.change / trade[0].change) * 100) : 0}% fewer plan changes</div>`;

      // plan waterfall
      const rows = main.hist.slice(-ROWS), c0 = rows[0].t, cols = Array.from({ length: ROWS + H - 1 }, (_, i) => c0 + i);
      const th = (t) => `<th style="padding:4px 5px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted);font-family:var(--font-body);text-align:right">${t}</th>`;
      $("#pw").innerHTML = `<tr>${th("run")}${cols.map((c) => th("w" + (c - c0 + 1))).join("")}</tr>` + rows.map((r, k) => {
        const prev = k ? rows[k - 1].p : null;
        return `<tr><td style="padding:4px 5px;border-bottom:1px solid var(--grid);font-family:var(--font-body);color:var(--muted)">run ${k + 1}</td>${cols.map((c) => {
          const v = r.p[c];
          if (v === undefined) return `<td style="border-bottom:1px solid var(--grid)"></td>`;
          const frozen = c < r.t + F, changed = prev && prev[c] !== undefined && prev[c] !== v;
          return `<td style="text-align:right;padding:4px 5px;border-bottom:1px solid var(--grid);${frozen ? "background:var(--accent-soft);" : ""}${changed ? "color:var(--violet);font-weight:700;" : ""}">${v}</td>`;
        }).join("")}</tr>`;
      }).join("");
    }

    const rerun = () => { compute(); draw(); };
    ["#F", "#fr", "#nz", "#dr"].forEach((s) => $(s).addEventListener("input", rerun));
    $("#newd").addEventListener("click", () => { seed++; rerun(); });
    rerun();
    return watch([pM.c, pT.c], (resized) => { if (resized) { pM.resize(); pT.resize(); } draw(); });
  },
});
