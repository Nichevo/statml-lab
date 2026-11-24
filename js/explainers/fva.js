Lab.register({
  id: "forecast-value-added",
  group: "Forecasting",
  title: "Forecast Value Added (FVA)",
  blurb: "Does each step of your forecasting process make the forecast better or worse? Compare naive, statistical, planner and consensus forecasts step by step.",
  lede: "A forecast usually passes through several hands: a statistical model, then a planner's override, then a sales or consensus review. Forecast Value Added measures whether each touch reduced the error compared with the step before it. A negative FVA means a step made the forecast worse.",
  quiz: [
    ["Statistical forecast WAPE 28%, after planner overrides 31%. What's the FVA of the override?", "28 − 31 = −3 points. The override made the forecast worse on average; it removed value."],
    ["What should the first step in an FVA analysis be compared with?", "A naive forecast (last period's actual, or same period last year). If the statistical model can't beat naive, the process is starting from negative value."],
    ["Overrides are positive FVA on average but negative on most items. How?", "A few large, well-informed overrides (a known promotion, a lost customer) add a lot, while many small tweaks add noise. Track FVA by override size and reason, and consider a threshold for small changes."],
    ["Why look at bias as well as accuracy in FVA?", "Sales input often adds optimism: forecasts drift upwards. Accuracy may change little while bias grows, which drives excess stock."],
  ],
  diy: {
    intro: "Actuals in B2:B53. Forecasts from each step in columns C (naive), D (statistical), E (planner), F (consensus).",
    steps: [
      ["Naive forecast: last period's actual.", "C3: =B2"],
      ["Absolute error of each step, side by side.", "G3: =ABS($B3-C3)   (fill right to J for D, E, F)"],
      ["WAPE for each step.", "=SUM(G3:G53)/SUM($B$3:$B$53)   (fill right)"],
      ["FVA of each step = previous step's WAPE − this step's WAPE (positive = improvement). Put the WAPEs in G55:J55.", "H56: =G55-H55   (fill right)"],
      ["Bias of each step (positive = over-forecast).", "=SUM(D3:D53-$B$3:$B$53)/SUM($B$3:$B$53)"],
      ["Share of periods where a step improved on the one before.", "=SUMPRODUCT(--(H3:H53<G3:G53))/COUNT(H3:H53)"],
    ],
  },
  deeper: [
    ["Fildes, Goodwin, Lawrence & Nikolopoulos (2009), Effective forecasting and judgmental adjustments, IJF 25(1)", "https://doi.org/10.1016/j.ijforecast.2008.11.010", "evidence from 60,000 forecasts: large overrides help, small ones hurt"],
    ["Fildes & Goodwin (2007), Against your better judgment? How organizations can improve their use of management judgment in forecasting, Interfaces 37(6)", "https://doi.org/10.1287/inte.1070.0309", "practical guidance on overrides"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor"><rect x="8" y="8" width="70" height="9" opacity=".35"/><rect x="8" y="22" width="48" height="9" opacity=".6"/><rect x="8" y="36" width="40" height="9"/><rect x="8" y="50" width="54" height="9" opacity=".6"/></g><path d="M78 12 L56 26 M56 26 L48 40 M48 40 L62 54"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const H = 24, E = 12, MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const PROMO = new Set([2, 7, 10]); // evaluation months with a promotion (planners know about these)
    const STEPS = [
      { id: "naive", name: "Naive", desc: "last month's actual", col: "--muted" },
      { id: "stat", name: "Statistical", desc: "seasonal smoothing model", col: "--accent" },
      { id: "plan", name: "Planner override", desc: "statistical + planner judgment", col: "--violet" },
      { id: "cons", name: "Consensus", desc: "after the sales review", col: "--warm" },
    ];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="fvc" aria-label="Actuals and each step's forecast over the evaluation year"></canvas>
          <div class="legend" id="leg"></div>
          <figcaption>The evaluation year. Shaded months had a promotion that the planners knew about but the statistical model could not see. Drag the violet or orange dots to override a month yourself.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">FVA stairstep report</h4>
          <div style="overflow-x:auto"><table id="stair" style="width:100%;border-collapse:collapse;font-size:.88rem;font-variant-numeric:tabular-nums"></table></div>
          <p class="hint" style="margin-top:8px">FVA = error of the earlier step − error of this step. Positive (green) means the step helped. Negative (red) means it made the forecast worse.</p>
        </div>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Month by month, worked out</h4>
          <div style="overflow-x:auto"><table id="mon" style="width:100%;border-collapse:collapse;font-size:.82rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono)"></table></div>
        </div>`,
      panel: `
        <div class="ctrl">
          <label for="met">Error measure</label>
          <select id="met"><option value="mape">MAPE</option><option value="wape">WAPE</option><option value="mae">MAE</option></select>
        </div>
        <div>
          <h4>Planner behaviour</h4>
          <div class="ctrl"><label for="ins">Uses promo knowledge <output id="insV"></output></label><input type="range" id="ins" min="0" max="1" step="0.05" value="0.8"></div>
          <div class="ctrl"><label for="pb">Optimism bias <output id="pbV"></output></label><input type="range" id="pb" min="-15" max="25" step="1" value="0"></div>
          <div class="ctrl"><label for="tk">Tinkering (random tweaks) <output id="tkV"></output></label><input type="range" id="tk" min="0" max="20" step="1" value="4"></div>
        </div>
        <div>
          <h4>Sales review</h4>
          <div class="ctrl"><label for="sb">Sales optimism <output id="sbV"></output></label><input type="range" id="sb" min="-15" max="30" step="1" value="10"></div>
        </div>
        <div class="readouts">
          <div class="ro"><b>Best step</b><span id="best"></span></div>
          <div class="ro"><b>Consensus vs naive</b><span id="total"></span></div>
        </div>
        <div class="btns">
          <button class="btn primary" id="reset" type="button">Rebuild overrides from sliders</button>
          <button class="btn" id="newd" type="button">New year of data</button>
        </div>`,
      notes: `
        <section>
          <h2>What FVA is</h2>
          <p>Forecast Value Added asks a simple question of every step in a forecasting process: did this step make the forecast more accurate than the step before it?</p>
          <div class="eq">FVA(step) = error(previous step) − error(step)</div>
          <p>Every step is also compared with the <b>naive forecast</b>, the free forecast you'd get with no effort at all. If a step can't beat naive, it is costing time and adding nothing.</p>
          <p>The method was popularized by Michael Gilliland in supply-chain forecasting. Studies of real companies often find that many manual overrides add negative value, especially small tweaks and optimistic ones.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Default settings: the planner uses promo knowledge and helps (green). Then the sales review adds 10% optimism and gives some of that back (red).</li>
            <li>Set "Uses promo knowledge" to 0. The planner's override is now just noise, and its FVA turns negative.</li>
            <li>Raise tinkering to 20. Small random tweaks feel productive but add error.</li>
            <li>Set sales optimism to 0. The consensus step now adds nothing, so FVA is about zero. A step that adds nothing is still worth questioning, because it costs time.</li>
            <li>Drag a single promo month's planner forecast to match the actual. See how much one good call is worth.</li>
          </ol>
        </section>
        <section>
          <h2>Using FVA well</h2>
          <ul>
            <li>Measure over many items and months. One product for one year is a small sample, and FVA can swing by luck.</li>
            <li>Track bias as well as error. Optimistic overrides often show up as consistent negative bias (forecast above actual).</li>
            <li>Look for where overrides help (promos, launches, known events) and where they don't (routine months), then focus effort on the first.</li>
            <li>See <a href="#forecast-accuracy">forecast accuracy measures</a> for how MAPE, WAPE and MAE differ.</li>
          </ul>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const plot = new Plot($("#fvc"), { x: [-0.5, E - 0.5], pad: { l: 50 } });
    let seed = 3, act = [], hist = [], F = {}, dragging = null;

    function makeData() {
      const r = rng(seed), all = [];
      for (let t = 0; t < H + E; t++) {
        const m = t % 12, promo = t >= H && PROMO.has(t - H);
        all.push(Math.round(200 + 1.2 * t + 35 * Math.sin((2 * Math.PI * (m - 3)) / 12) + r.normal() * 14 + (promo ? 70 : 0)));
      }
      hist = all.slice(0, H); act = all.slice(H);
    }

    function statForecast() {
      // seasonal indices from the 24 months of history, then simple smoothing on the deseasonalized level
      const mean = hist.reduce((a, b) => a + b, 0) / H, idx = [];
      for (let m = 0; m < 12; m++) idx.push((hist[m] + hist[m + 12]) / 2 / mean);
      let L = hist[0] / idx[0];
      const a = 0.3, series = hist.concat(act), out = [];
      for (let t = 1; t < H + E; t++) {
        const f = L * idx[t % 12];
        if (t >= H) out.push(f);
        L = a * (series[t] / idx[t % 12]) + (1 - a) * L;
      }
      return out;
    }

    function rebuild() {
      const r = rng(seed * 101), ins = +$("#ins").value, pb = +$("#pb").value / 100, tk = +$("#tk").value / 100, sb = +$("#sb").value / 100;
      F.naive = act.map((_, i) => (i ? act[i - 1] : hist[H - 1]));
      F.stat = statForecast();
      F.plan = F.stat.map((s, i) => Math.round(s * (1 + pb) + (PROMO.has(i) ? 70 * ins : 0) + s * tk * r.normal()));
      F.cons = F.plan.map((p) => Math.round(p * (1 + sb)));
    }

    function err(f, kind) {
      const e = act.map((a, i) => a - f[i]);
      if (kind === "mae") return e.reduce((s, v) => s + Math.abs(v), 0) / E;
      if (kind === "wape") return (e.reduce((s, v) => s + Math.abs(v), 0) / act.reduce((s, v) => s + v, 0)) * 100;
      return (e.reduce((s, v, i) => s + Math.abs(v) / act[i], 0) / E) * 100;
    }
    const bias = (f) => (act.reduce((s, a, i) => s + (a - f[i]), 0) / E);

    function draw() {
      $("#insV").textContent = Math.round(+$("#ins").value * 100) + "%";
      $("#pbV").textContent = (+$("#pb").value > 0 ? "+" : "") + $("#pb").value + "%";
      $("#tkV").textContent = "±" + $("#tk").value + "%";
      $("#sbV").textContent = (+$("#sb").value > 0 ? "+" : "") + $("#sb").value + "%";
      const kind = $("#met").value, unit = kind === "mae" ? "" : "%";
      const show = (v) => (kind === "mae" ? fmt(v, 1) : v.toFixed(1) + "%");

      const all = act.concat(...STEPS.map((s) => F[s.id]));
      if (!dragging) plot.y = [Math.min(...all) - 20, Math.max(...all) + 20];
      plot.clear();
      const g = plot.ctx;
      g.fillStyle = css("--warm-soft");
      PROMO.forEach((m) => g.fillRect(plot.sx(m - 0.5), plot.pad.t, plot.sx(m + 0.5) - plot.sx(m - 0.5), plot.ih));
      plot.axes({ xTicks: act.map((_, i) => i), xFormat: (v) => MON[v], yLabel: "units" });
      const xs = act.map((_, i) => i);
      STEPS.forEach((s) => plot.path(xs, F[s.id], css(s.col), s.id === "naive" ? 1.5 : 2, s.id === "naive" ? [3, 3] : [6, 4]));
      plot.path(xs, act, css("--ink"), 2.5);
      act.forEach((a, i) => plot.dot(i, a, 4.5, css("--ink"), css("--surface")));
      ["plan", "cons"].forEach((k) => F[k].forEach((v, i) => plot.dot(i, v, 4.5, css(STEPS.find((s) => s.id === k).col), css("--surface"))));
      $("#leg").innerHTML = `<span><i style="background:var(--ink)"></i>Actual</span>` + STEPS.map((s) => `<span><i style="background:var(${s.col})"></i>${s.name}</span>`).join("");

      const errs = STEPS.map((s) => err(F[s.id], kind)), mx = Math.max(...errs);
      const fvaCell = (v) => {
        const good = v > 0.0001, bad = v < -0.0001;
        return `<span class="pill ${good ? "ok" : bad ? "bad" : "idle"}">${v > 0 ? "+" : ""}${kind === "mae" ? fmt(v, 1) : v.toFixed(1) + " pts"}</span>`;
      };
      const th = (t, l) => `<th style="text-align:${l ? "left" : "right"};padding:6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted)">${t}</th>`;
      $("#stair").innerHTML = `<tr>${th("Process step", 1)}${th(kind.toUpperCase(), 1)}${th("Bias")}${th("FVA vs naive")}${th("FVA vs previous step")}</tr>` +
        STEPS.map((s, i) => `<tr>
          <td style="padding:6px;border-bottom:1px solid var(--grid)"><b>${s.name}</b><br><span style="font-size:.78rem;color:var(--muted)">${s.desc}</span></td>
          <td style="padding:6px;border-bottom:1px solid var(--grid);min-width:150px"><div style="display:flex;align-items:center;gap:8px"><div style="height:12px;border-radius:3px;background:var(${s.col});width:${(errs[i] / mx) * 100}px"></div><span style="font-family:var(--font-mono)">${show(errs[i])}</span></div></td>
          <td style="padding:6px;border-bottom:1px solid var(--grid);text-align:right;font-family:var(--font-mono)">${(bias(F[s.id]) > 0 ? "+" : "") + bias(F[s.id]).toFixed(1)}</td>
          <td style="padding:6px;border-bottom:1px solid var(--grid);text-align:right">${i ? fvaCell(errs[0] - errs[i]) : "–"}</td>
          <td style="padding:6px;border-bottom:1px solid var(--grid);text-align:right">${i ? fvaCell(errs[i - 1] - errs[i]) : "–"}</td></tr>`).join("");

      const bi = errs.indexOf(Math.min(...errs));
      $("#best").innerHTML = `<span class="pill ok">${STEPS[bi].name}</span>`;
      const tot = errs[0] - errs[3];
      $("#total").innerHTML = `<span class="pill ${tot > 0 ? "ok" : "bad"}">${tot > 0 ? "+" : ""}${kind === "mae" ? fmt(tot, 1) : tot.toFixed(1) + " pts"}</span>`;

      const td = (t, c, extra = "") => `<td style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--grid);${c ? "color:var(" + c + ");" : ""}${extra}">${t}</td>`;
      const ape = (f, a) => ((Math.abs(a - f) / a) * 100).toFixed(0) + "%";
      const hd = (t) => `<th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted);font-family:var(--font-body)">${t}</th>`;
      $("#mon").innerHTML = `<tr>${hd("month")}${hd("actual")}${STEPS.map((s) => hd(s.name)).join("")}${hd("plan vs stat")}${hd("cons vs plan")}</tr>` +
        act.map((a, i) => {
          const eS = Math.abs(a - F.stat[i]), eP = Math.abs(a - F.plan[i]), eC = Math.abs(a - F.cons[i]);
          const verdict = (prev, cur) => (cur < prev - 0.5 ? `<span style="color:var(--good)">better</span>` : cur > prev + 0.5 ? `<span style="color:var(--bad)">worse</span>` : `<span style="color:var(--muted)">same</span>`);
          return `<tr style="${PROMO.has(i) ? "background:var(--warm-soft)" : ""}">${td(MON[i] + (PROMO.has(i) ? " promo" : ""), null, "font-family:var(--font-body)")}${td(a, null, "font-weight:600")}${STEPS.map((s) => td(`${Math.round(F[s.id][i])} <span style="color:var(--muted)">(${ape(F[s.id][i], a)})</span>`)).join("")}${td(verdict(eS, eP))}${td(verdict(eP, eC))}</tr>`;
        }).join("") + `<tr><td colspan="8" style="padding:6px;color:var(--muted);font-family:var(--font-body)">Bracketed numbers are each month's absolute percentage error.</td></tr>`;
    }

    // drag planner / consensus points
    const pos = (e) => { const r = plot.c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const near = (px, py) => {
      let best = null, bd = 144;
      ["cons", "plan"].forEach((k) => F[k].forEach((v, i) => { const d = (plot.sx(i) - px) ** 2 + (plot.sy(v) - py) ** 2; if (d < bd) { bd = d; best = [k, i]; } }));
      return best;
    };
    plot.c.addEventListener("pointerdown", (e) => { const h = near(...pos(e)); if (h) { dragging = h; plot.c.setPointerCapture(e.pointerId); e.preventDefault(); } });
    plot.c.addEventListener("pointermove", (e) => {
      const [px, py] = pos(e);
      if (!dragging) { plot.c.style.cursor = near(px, py) ? "ns-resize" : "default"; return; }
      F[dragging[0]][dragging[1]] = Math.round(plot.iy(py)); draw();
    });
    const end = () => { dragging = null; draw(); };
    plot.c.addEventListener("pointerup", end);
    plot.c.addEventListener("pointercancel", () => (dragging = null));

    ["#ins", "#pb", "#tk", "#sb"].forEach((s) => $(s).addEventListener("input", () => { rebuild(); draw(); }));
    $("#met").addEventListener("change", draw);
    $("#reset").addEventListener("click", () => { rebuild(); draw(); });
    $("#newd").addEventListener("click", () => { seed++; makeData(); rebuild(); draw(); });

    makeData(); rebuild(); draw();
    return watch([plot.c], (resized) => { if (resized) plot.resize(); draw(); });
  },
});
