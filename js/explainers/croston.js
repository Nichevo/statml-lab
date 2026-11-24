Lab.register({
  id: "intermittent-demand",
  group: "Forecasting",
  title: "Intermittent demand and Croston's method",
  blurb: "Spare parts and slow sellers: mostly zeros with the odd order. See why ordinary smoothing struggles and how Croston splits size from timing.",
  lede: "Many items sell nothing most weeks, then a few units at once. Ordinary exponential smoothing drops after every zero and jumps after every sale, so it is always out of step. Croston's method forecasts two things separately: how big an order is when one comes, and how often one comes.",
  quiz: [
    ["Why does simple exponential smoothing struggle with intermittent demand?", "It updates every period, so it drops after each zero and jumps after each order. The forecast is always too high just after a sale and too low just before the next."],
    ["Croston's size z = 6 units and gap p = 4 weeks. What's the forecast?", "z ÷ p = 1.5 units per week. Not a prediction that 1.5 units will sell next week, but the average rate for stock and ordering decisions."],
    ["What's wrong with plain Croston, and what's the fix?", "It's biased upwards, because the average of z/p isn't z̄/p̄. The Syntetos–Boylan approximation (SBA) multiplies the forecast by (1 − α/2)."],
    ["Why is MAPE useless here?", "Most actuals are zero, so the percentage error is undefined for most periods. Use MAE, MASE or, better, measures of stock outcomes."],
  ],
  diy: {
    intro: "Weekly demand in B2:B105, α in H1. Columns: C = size estimate z, D = gap estimate p, E = weeks since last order.",
    steps: [
      ["Start values: the first non-zero demand and the average gap.", "C2: =INDEX(B2:B105,MATCH(TRUE,B2:B105>0,0))\nD2: =COUNT(B2:B105)/COUNTIF(B2:B105,\">0\")\nE2: =1"],
      ["Weeks since last order: reset to 1 after a sale, otherwise count up.", "E3: =IF(B2>0,1,E2+1)"],
      ["Update size only in weeks with demand.", "C3: =IF(B3>0,$H$1*B3+(1-$H$1)*C2,C2)"],
      ["Update gap only in weeks with demand, using the weeks since the previous order.", "D3: =IF(B3>0,$H$1*E3+(1-$H$1)*D2,D2)"],
      ["Croston forecast per week, and the SBA bias-corrected version.", "F3: =C3/D3\nG3: =(1-$H$1/2)*C3/D3"],
      ["Compare with simple exponential smoothing on the same data.", "I2: =B2\nI3: =$H$1*B3+(1-$H$1)*I2"],
      ["Classify the item (Syntetos et al.): ADI = average gap, CV² of non-zero sizes. ADI > 1.32 means intermittent; CV² > 0.49 means lumpy.", "=D2\n=(STDEV.S(IF(B2:B105>0,B2:B105))/AVERAGE(IF(B2:B105>0,B2:B105)))^2"],
    ],
  },
  deeper: [
    ["Croston (1972), Forecasting and stock control for intermittent demands, ORQ 23(3)", "https://doi.org/10.1057/jors.1972.50", "the original method"],
    ["Syntetos & Boylan (2005), The accuracy of intermittent demand estimates, IJF 21(2)", "https://doi.org/10.1016/j.ijforecast.2004.10.001", "the SBA bias correction"],
    ["Syntetos, Boylan & Croston (2005), On the categorization of demand patterns, JORS 56(5)", "https://doi.org/10.1057/palgrave.jors.2601841", "the ADI / CV² classification"],
    ["Teunter, Syntetos & Babai (2011), Intermittent demand: linking forecasting to inventory obsolescence, EJOR 214(3)", "https://doi.org/10.1016/j.ejor.2011.05.018", "the TSB method for items that may die out"],
    ["Hyndman & Athanasopoulos, FPP3 §13.2: Time series of counts", "https://otexts.com/fpp3/counts.html#sec-counts", "free textbook section on Croston"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="56" x2="92" y2="56"/><g fill="currentColor"><rect x="10" y="30" width="6" height="26"/><rect x="34" y="40" width="6" height="16"/><rect x="40" y="22" width="6" height="34"/><rect x="70" y="34" width="6" height="22"/></g><path d="M4 44 L92 44" stroke-dasharray="5 3"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const N = 60, TEST = 12, TRAIN = N - TEST;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="crc" aria-label="Intermittent demand with forecasts"></canvas>
          <div class="legend">
            <span><i style="background:var(--ink)"></i>Demand each week</span>
            <span><i style="background:var(--muted)"></i>Simple exponential smoothing</span>
            <span><i style="background:var(--accent)"></i>Croston</span>
            <span><i style="background:var(--violet)"></i>SBA (bias-corrected Croston)</span>
          </div>
          <figcaption>Forecasts are a <b>rate</b>: expected units per week. The last ${TEST} weeks are held out. Drag a bar's top to change that week's demand.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 8px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Croston, worked out at each order</h4>
          <p class="hint" style="margin:0 0 8px">Croston only updates in weeks with demand. Between orders, the forecast stays flat. It starts from the average order size and average gap in the training weeks.</p>
          <div style="overflow-x:auto;max-height:360px;overflow-y:auto"><table id="work" style="width:100%;border-collapse:collapse;font-size:.82rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono)"></table></div>
        </div>`,
      panel: `
        <div>
          <h4>The demand pattern</h4>
          <div class="ctrl"><label for="pd">Chance of an order in a week <output id="pdV"></output></label><input type="range" id="pd" min="0.05" max="1" step="0.05" value="0.25"></div>
          <div class="ctrl"><label for="sz">Average order size <output id="szV"></output></label><input type="range" id="sz" min="1" max="20" step="1" value="6"></div>
          <div class="ctrl"><label for="sv">Order size variability <output id="svV"></output></label><input type="range" id="sv" min="0" max="1" step="0.05" value="0.4"></div>
          <div class="btns"><button class="btn" id="newd" type="button">New random draw</button></div>
        </div>
        <div class="ctrl"><label for="al">Smoothing α (all methods) <output id="alV"></output></label><input type="range" id="al" min="0.05" max="0.6" step="0.05" value="0.15"></div>
        <div class="readouts" id="score"></div>
        <p class="hint">True average rate = chance × size = <b id="truth"></b> units per week. MAPE is undefined here: most actuals are zero.</p>
        <details><summary style="cursor:pointer;font-size:.9rem">Use your own weekly demand</summary>
          <textarea id="own" rows="4" spellcheck="false" aria-label="Your weekly demand" style="width:100%;margin-top:8px;font:12px/1.5 var(--font-mono);padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink)"></textarea>
          <div class="btns" style="margin-top:6px"><button class="btn" id="useOwn" type="button">Use these numbers</button></div>
          <p class="hint" id="ownMsg">At least 24 values, zeros included.</p>
        </details>`,
      notes: `
        <section>
          <h2>How Croston works</h2>
          <p>Only in weeks where demand is above zero:</p>
          <div class="eq">size z ← α·(this order) + (1 − α)·z</div>
          <div class="eq">gap p ← α·(weeks since last order) + (1 − α)·p</div>
          <div class="eq">forecast rate = z / p</div>
          <p>In zero weeks nothing changes. <b>SBA</b> (Syntetos–Boylan approximation) multiplies by (1 − α/2), because plain Croston is known to forecast slightly too high.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Compare the grey SES line with Croston. SES dips after every zero and spikes after every order. Croston stays near the true rate.</li>
            <li>Raise the chance of an order to 1. Every week has demand, and Croston becomes plain exponential smoothing.</li>
            <li>Check the bias column. Croston usually runs a bit high; SBA pulls it back.</li>
            <li>Drag a few held-out bars to zero, as if the item stopped selling. Every method keeps forecasting the old rate, which is the weakness TSB fixes.</li>
          </ol>
        </section>
        <section>
          <h2>In practice</h2>
          <ul>
            <li>A flat rate forecast is right on average but never matches a single week. For stock decisions, what matters is the chance of a stock-out over the lead time, which needs the full distribution of demand.</li>
            <li>Judge these methods with MAE, MASE or bias, not MAPE. See <a href="#forecast-accuracy">forecast accuracy measures</a>.</li>
            <li>Newer variants like <b>TSB</b> update the probability every week, so they can notice when an item has stopped selling entirely.</li>
          </ul>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const plot = new Plot($("#crc"), { pad: { l: 46 } });
    let seed = 2, y = [], drag = -1;

    function makeData() {
      const r = rng(seed), pd = +$("#pd").value, sz = +$("#sz").value, sv = +$("#sv").value;
      y = Array.from({ length: N }, () => (r() < pd ? Math.max(1, Math.round(sz * Math.exp(sv * r.normal() - (sv * sv) / 2))) : 0));
      $("#own").value = y.join(", ");
    }

    function methods(a) {
      const ses = [], cro = [], sba = [], rows = [];
      const first = y.findIndex((v) => v > 0);
      let L = y.slice(0, TRAIN).reduce((s, v) => s + v, 0) / TRAIN;
      // start from the training averages: mean order size and mean gap between orders
      const nzIdx = y.slice(0, TRAIN).map((v, t) => (v > 0 ? t : -1)).filter((t) => t >= 0);
      let z = nzIdx.length ? nzIdx.reduce((s, t) => s + y[t], 0) / nzIdx.length : 0;
      let p = nzIdx.length ? TRAIN / nzIdx.length : 1, gap = 1;
      for (let t = 0; t < N; t++) {
        ses.push(L); cro.push(z / p); sba.push((1 - a / 2) * (z / p));
        const v = y[t];
        if (t < TRAIN) {
          L = a * v + (1 - a) * L;
          if (v > 0 && t > first) {
            const zo = z, po = p;
            z = a * v + (1 - a) * z; p = a * gap + (1 - a) * p;
            rows.push({ t, v, gap, zo, po, z, p });
            gap = 1;
          } else if (t >= first) gap++;
        }
      }
      return { ses, cro, sba, rows };
    }

    function score(f) {
      let ae = 0, se = 0, e = 0, nd = 0;
      for (let t = TRAIN; t < N; t++) { const d = y[t] - f[t]; ae += Math.abs(d); se += d * d; e += d; }
      for (let t = 1; t < TRAIN; t++) nd += Math.abs(y[t] - y[t - 1]);
      return { mae: ae / TEST, rmse: Math.sqrt(se / TEST), bias: e / TEST, mase: ae / TEST / (nd / (TRAIN - 1)) };
    }

    function draw() {
      $("#pdV").textContent = Math.round(+$("#pd").value * 100) + "%"; $("#szV").textContent = $("#sz").value;
      $("#svV").textContent = (+$("#sv").value).toFixed(2); $("#alV").textContent = (+$("#al").value).toFixed(2);
      $("#truth").textContent = (+$("#pd").value * +$("#sz").value).toFixed(2);
      const a = +$("#al").value, m = methods(a);
      plot.x = [-0.5, N - 0.5];
      if (drag < 0) plot.y = [0, Math.max(5, ...y) * 1.12];
      plot.clear();
      plot.ctx.fillStyle = css("--grid"); plot.ctx.fillRect(plot.sx(TRAIN - 0.5), plot.pad.t, plot.sx(N - 0.5) - plot.sx(TRAIN - 0.5), plot.ih);
      plot.axes({ xLabel: "week", yLabel: "units", xCount: 8 });
      plot.clip((g) => {
        g.fillStyle = css("--ink");
        y.forEach((v, t) => { if (v > 0) { const x0 = plot.sx(t - 0.32), x1 = plot.sx(t + 0.32); g.fillRect(x0, plot.sy(v), x1 - x0, plot.sy(0) - plot.sy(v)); } });
      });
      const xs = y.map((_, t) => t);
      const step = (arr, col, w, dash) => { const sx = [], sy = []; arr.forEach((v, t) => { sx.push(t - 0.5, t + 0.5); sy.push(v, v); }); plot.path(sx, sy, css(col), w, dash); };
      step(m.ses, "--muted", 1.5);
      step(m.cro, "--accent", 2.5);
      step(m.sba, "--violet", 2, [5, 3]);
      const ctx = plot.ctx; ctx.fillStyle = css("--muted"); ctx.font = `12px ${css("--font-body")}`; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("held out", plot.sx(TRAIN) + 4, plot.pad.t + 4);

      const S = [["SES", m.ses, "--muted"], ["Croston", m.cro, "--accent"], ["SBA", m.sba, "--violet"]].map(([n, f, c]) => ({ n, c, ...score(f) }));
      const best = Math.min(...S.map((s) => s.mae));
      $("#score").innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums"><tr style="color:var(--muted)"><td></td><td style="text-align:right">MAE</td><td style="text-align:right">MASE</td><td style="text-align:right">bias</td></tr>` +
        S.map((s) => `<tr style="${s.mae === best ? "font-weight:600" : ""}"><td><span class="sw" style="background:var(${s.c})"></span>${s.n}</td><td style="text-align:right;font-family:var(--font-mono)">${fmt(s.mae)}</td><td style="text-align:right;font-family:var(--font-mono)">${s.mase.toFixed(2)}</td><td style="text-align:right;font-family:var(--font-mono)">${(s.bias > 0 ? "+" : "") + fmt(s.bias)}</td></tr>`).join("") + `</table>`;

      const th = (t) => `<th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted);font-family:var(--font-body);position:sticky;top:0;background:var(--surface)">${t}</th>`;
      const td = (t, c) => `<td style="text-align:right;padding:3px 6px;border-bottom:1px solid var(--grid);white-space:nowrap${c ? ";color:var(" + c + ")" : ""}">${t}</td>`;
      const f2 = (v) => v.toFixed(2);
      $("#work").innerHTML = `<tr>${th("week")}${th("order")}${th("weeks since last")}${th("size z")}${th("gap p")}${th("rate z/p")}</tr>` +
        (m.rows.length ? m.rows.map((r) => `<tr>${td(r.t + 1)}${td(r.v)}${td(r.gap)}${td(`${a}·${r.v} + ${(1 - a).toFixed(2)}·${f2(r.zo)} = <b>${f2(r.z)}</b>`)}${td(`${a}·${r.gap} + ${(1 - a).toFixed(2)}·${f2(r.po)} = <b>${f2(r.p)}</b>`)}${td(f2(r.z / r.p), "--accent")}</tr>`).join("")
          : `<tr><td colspan="6" style="padding:6px;color:var(--muted);font-family:var(--font-body)">Fewer than two orders in the training weeks.</td></tr>`);
    }

    ["#pd", "#sz", "#sv"].forEach((s) => $(s).addEventListener("input", () => { makeData(); draw(); }));
    $("#al").addEventListener("input", draw);
    $("#newd").addEventListener("click", () => { seed++; makeData(); draw(); });
    $("#useOwn").addEventListener("click", () => {
      const v = $("#own").value.split(/[\s,;]+/).filter(Boolean).map(Number);
      if (v.some((x) => !isFinite(x) || x < 0)) { $("#ownMsg").textContent = "Use whole numbers of 0 or more."; return; }
      if (v.length < N) { $("#ownMsg").textContent = `This page needs ${N} weeks; you pasted ${v.length}.`; return; }
      y = v.slice(-N); $("#ownMsg").textContent = `Using your last ${N} weeks.`; draw();
    });
    const pos = (e) => { const r = plot.c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    plot.c.addEventListener("pointerdown", (e) => {
      const [px] = pos(e), t = Math.round(plot.ix(px));
      if (t >= 0 && t < N) { drag = t; plot.c.setPointerCapture(e.pointerId); y[t] = Math.max(0, Math.round(plot.iy(pos(e)[1]))); draw(); e.preventDefault(); }
    });
    plot.c.addEventListener("pointermove", (e) => { plot.c.style.cursor = "ns-resize"; if (drag < 0) return; y[drag] = Math.max(0, Math.round(plot.iy(pos(e)[1]))); draw(); });
    const end = () => { if (drag >= 0) { drag = -1; $("#own").value = y.join(", "); draw(); } };
    plot.c.addEventListener("pointerup", end); plot.c.addEventListener("pointercancel", end);

    makeData(); draw();
    return watch([plot.c], (resized) => { if (resized) plot.resize(); draw(); });
  },
});
