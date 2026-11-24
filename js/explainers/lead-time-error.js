Lab.register({
  id: "lead-time-error",
  group: "Supply chain",
  title: "Lead-time forecast error",
  blurb: "The error that matters for stock is the error of the forecast you had when you placed the order, added up over the lead time. See why it's bigger than the usual one-week-ahead number.",
  lede: "Most accuracy reports compare each week's actual with the latest forecast for that week. But by then it's too late to act. When you order with a 4-week lead time, you're relying on the forecast from 4 weeks earlier, for 4 weeks of demand added together. That lead-time error is bigger than the one-week error, and it's what safety stock has to cover.",
  quiz: [
    ["The one-week-ahead RMSE is 15 units and the lead time is 4 weeks. What safety stock does the common shortcut give at 95% service, and why can it be too low?", "1.645 × 15 × √4 = 49. The √L rule assumes each week's error is independent. When the forecast is wrong because the underlying level moved, every week in the lead time is wrong in the same direction, so the errors add up faster than √L."],
    ["Your accuracy report shows 92% at lag 1 and your planners say the forecast is great. Why might stockouts still be common?", "Orders were placed using forecasts from lag 4 (the lead time), which are less accurate. Report accuracy at the lag where decisions are frozen, not the most recent lag."],
    ["If demand were pure random noise around a fixed average, would the √L shortcut be right?", "Yes, roughly. With no level drift, errors in different weeks are independent, and the variance of a sum of L independent errors is L times one week's variance. Set level drift to 0 and compare."],
    ["What does a forecast 'waterfall' (or triangle) table show?", "Each target week's forecast as it was at each lag before the week. Reading across a row shows how the forecast for one week evolved as it got closer."],
  ],
  deeper: [
    ["FPP3: Evaluating point forecast accuracy", "https://otexts.com/fpp3/accuracy.html", "train/test, horizons and scale-free measures"],
    ["FPP3: Simple exponential smoothing", "https://otexts.com/fpp3/ses.html", "the forecasting method used here, and its forecast variance"],
    ["Safety stock — Wikipedia", "https://en.wikipedia.org/wiki/Safety_stock", "methods including forecast-error-based safety stock"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor"><rect x="8" y="44" width="10" height="12" opacity=".4"/><rect x="24" y="38" width="10" height="18" opacity=".55"/><rect x="40" y="31" width="10" height="25" opacity=".7"/><rect x="56" y="22" width="10" height="34" opacity=".85"/><rect x="72" y="12" width="10" height="44"/></g><path d="M13 40 L29 33 L45 25 L61 14 L77 4" stroke-dasharray="3 3"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css, qnorm } = Lab;
    const W = 1500, LAGS = 8, SHOWN = 10;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="lec" aria-label="Forecast error by lag and over the lead time"></canvas>
          <div class="legend">
            <span><i style="background:var(--violet);opacity:.5;height:10px"></i>One week's error, by how far ahead the forecast was made</span>
            <span><i style="background:var(--accent)"></i>Error of total demand over L weeks (measured)</span>
            <span><i style="background:var(--muted)"></i>√L × one-week error (shortcut)</span>
          </div>
          <figcaption>RMSE in units, measured over ${W.toLocaleString("en-US")} simulated weeks. The gap between the blue and grey lines is what the shortcut misses.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Forecast waterfall</h4>
          <p class="hint" style="margin:0 0 10px">Each row is one week. Each column is the forecast for that week as it stood 1, 2, … 8 weeks before. Redder cells are further from the actual.</p>
          <div style="overflow-x:auto"><table id="wf" style="width:100%;border-collapse:collapse;font-size:.8rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono)"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">One order, worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.84rem;line-height:1.9"></div>
        </div>`,
      panel: `
        <div>
          <h4>Demand</h4>
          <div class="ctrl"><label for="nz">Week-to-week noise (SD) <output id="nzV"></output></label><input type="range" id="nz" min="0" max="30" step="1" value="12"></div>
          <div class="ctrl"><label for="dr">Level drift per week (SD) <output id="drV"></output></label><input type="range" id="dr" min="0" max="10" step="0.5" value="3"></div>
        </div>
        <div>
          <h4>Planning</h4>
          <div class="ctrl"><label for="L">Lead time <output id="LV"></output></label><input type="range" id="L" min="1" max="8" step="1" value="4"></div>
          <div class="ctrl"><label for="sl">Service target <output id="slV"></output></label><input type="range" id="sl" min="80" max="99.5" step="0.5" value="95"></div>
        </div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New random history</button></div>`,
      notes: `
        <section>
          <h2>Two ways to size safety stock</h2>
          <div class="eq">shortcut: SS = z × RMSE(1 week ahead) × √L<br>direct: &nbsp;&nbsp;SS = z × RMSE(L-week total, forecast at order time)</div>
          <p>The shortcut treats every week's error as independent. The direct method measures what actually happens: at each past order date, take the forecast you had for the next L weeks, add it up, and compare with the actual total.</p>
          <p>When the underlying level drifts (new customers, a competitor, a trend), the forecast is wrong in the <i>same direction</i> for several weeks. Those errors pile up instead of cancelling, so the true lead-time error grows faster than √L.</p>
        </section>
        <section>
          <h2>Measuring accuracy at the right lag</h2>
          <ul>
            <li><b>Lag</b> = how many periods before the target the forecast was taken. Lag 1 is last week's forecast for this week.</li>
            <li>Decisions get locked at the lead time (or the frozen zone). That's the lag to report, because it's the forecast the business actually acted on.</li>
            <li>Keep a snapshot of every forecast you publish. Without stored snapshots you can't compute lag accuracy later.</li>
          </ul>
          <p>Forecast here is <a href="#exponential-smoothing">simple exponential smoothing</a> with α set to suit the noise and drift. A flat forecast means every future week gets the same number, which is why the waterfall's rows change only as new data arrives.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set level drift to 0. The blue and grey lines nearly meet: with pure noise, the shortcut works.</li>
            <li>Raise drift to 8. Now the shortcut badly undersizes safety stock, and its achieved service falls well short of target.</li>
            <li>Slide the lead time from 1 to 8. The gap opens up as the lead time grows.</li>
            <li>In the waterfall, find a week where the lag-8 forecast was far off but lag-1 was close. That's the forecast getting better as the week approached, too late for an order placed 8 weeks earlier.</li>
          </ol>
          <p>Next: <a href="#reorder-point">reorder points and safety stock</a>, and <a href="#frozen-zones">frozen zones</a>, which set the lag where plans lock.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const plot = new Plot($("#lec"), { x: [0.4, LAGS + 0.6], pad: { l: 50 } });
    let seed = 21, R = null;

    function compute() {
      const r = rng(seed), sn = +$("#nz").value, sd = +$("#dr").value, L = +$("#L").value, sl = +$("#sl").value / 100;
      // optimal SES alpha for a local-level model with signal-to-noise q
      const q = sn > 0 ? (sd * sd) / (sn * sn) : 1e6, alpha = sd === 0 ? 0.05 : Math.min(1, Math.max(0.05, (-q + Math.sqrt(q * q + 4 * q)) / 2));
      const d = [], S = [];
      let lvl = 100, s = 100;
      for (let t = 0; t < W + LAGS + 10; t++) {
        lvl = 100 + 0.98 * (lvl - 100) + sd * r.normal();
        d.push(Math.max(0, lvl + sn * r.normal()));
        s = alpha * d[t] + (1 - alpha) * s; S.push(s); // S[t] = forecast made at end of week t for every later week
      }
      const start = 50, rm = (a) => Math.sqrt(a.reduce((x, y) => x + y * y, 0) / a.length);
      const lagErr = [];
      for (let h = 1; h <= LAGS; h++) { const e = []; for (let t = start; t < d.length; t++) e.push(d[t] - S[t - h]); lagErr.push(rm(e)); }
      const cum = [];
      for (let l = 1; l <= LAGS; l++) { const e = []; for (let o = start; o + l < d.length; o++) { let a = 0; for (let j = 1; j <= l; j++) a += d[o + j]; e.push(a - l * S[o]); } cum.push(rm(e)); }
      const z = qnorm(sl), ssShort = z * lagErr[0] * Math.sqrt(L), ssDirect = z * cum[L - 1];
      let okS = 0, okD = 0, n = 0;
      for (let o = start; o + L < d.length; o++) { let a = 0; for (let j = 1; j <= L; j++) a += d[o + j]; const f = L * S[o]; if (a <= f + ssShort) okS++; if (a <= f + ssDirect) okD++; n++; }
      R = { d, S, L, sl, z, alpha, lagErr, cum, ssShort, ssDirect, svcS: okS / n, svcD: okD / n, sn, sd };
    }

    function draw() {
      const { d, S, L, sl, z, alpha, lagErr, cum, ssShort, ssDirect, svcS, svcD } = R;
      $("#nzV").textContent = "±" + $("#nz").value; $("#drV").textContent = +$("#dr").value ? "±" + $("#dr").value : "none";
      $("#LV").textContent = L + (L === 1 ? " week" : " weeks"); $("#slV").textContent = $("#sl").value + "%";

      const shortcut = Array.from({ length: LAGS }, (_, i) => lagErr[0] * Math.sqrt(i + 1));
      const hi = Math.max(...cum, ...shortcut, ...lagErr) * 1.1 || 1;
      plot.y = [0, hi];
      plot.clear();
      plot.axes({ xTicks: [1, 2, 3, 4, 5, 6, 7, 8], xLabel: "lag (weeks ahead) / lead time L", yLabel: "RMSE (units)" });
      const g = plot.ctx;
      g.save(); g.fillStyle = css("--violet"); g.globalAlpha = 0.35;
      lagErr.forEach((v, i) => { const x = plot.sx(i + 1), w = plot.sx(1.3) - plot.sx(1); g.fillRect(x - w / 2, plot.sy(v), w, plot.sy(0) - plot.sy(v)); });
      g.restore();
      g.save(); g.fillStyle = css("--accent-soft"); const xL = plot.sx(L); g.fillRect(xL - 14, plot.pad.t, 28, plot.ih); g.restore();
      const xs = shortcut.map((_, i) => i + 1);
      plot.path(xs, shortcut, css("--muted"), 2, [6, 4]);
      plot.path(xs, cum, css("--accent"), 2.5);
      cum.forEach((v, i) => plot.dot(i + 1, v, i + 1 === L ? 6 : 3.5, css("--accent"), css("--surface")));
      shortcut.forEach((v, i) => plot.dot(i + 1, v, 3, css("--muted")));

      const pill = (v) => `<span class="pill ${v >= sl - 0.01 ? "ok" : v >= sl - 0.05 ? "warn" : "bad"}">${(v * 100).toFixed(1)}%</span>`;
      $("#ro").innerHTML = `
        <div class="ro"><b>Smoothing α used</b><span class="num">${alpha.toFixed(2)}</span></div>
        <div class="ro"><b>1-week-ahead RMSE</b><span class="num">${fmt(lagErr[0], 1)}</span></div>
        <div class="ro"><b>${L}-week total RMSE</b><span class="num">${fmt(cum[L - 1], 1)}</span></div>
        <div class="ro"><b>Safety stock, shortcut</b><span class="num">${fmt(ssShort, 0)}</span></div>
        <div class="ro"><b>&nbsp;&nbsp;service achieved</b>${pill(svcS)}</div>
        <div class="ro"><b>Safety stock, direct</b><span class="num">${fmt(ssDirect, 0)}</span></div>
        <div class="ro"><b>&nbsp;&nbsp;service achieved</b>${pill(svcD)}</div>`;

      // waterfall
      const end = d.length - 1, rows = [];
      const hd = (t) => `<th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted);font-family:var(--font-body)">${t}</th>`;
      for (let t = end - SHOWN + 1; t <= end; t++) {
        const cells = [];
        for (let h = LAGS; h >= 1; h--) {
          const f = S[t - h], pe = d[t] ? Math.abs(d[t] - f) / d[t] : 0, a = Math.min(0.85, pe * 3.5);
          cells.push(`<td style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--grid);background:color-mix(in srgb, var(--bad) ${Math.round(a * 100)}%, transparent);${h === L ? "outline:2px solid var(--accent);outline-offset:-2px;" : ""}">${f.toFixed(0)}</td>`);
        }
        rows.push(`<tr><td style="padding:4px 6px;border-bottom:1px solid var(--grid);font-family:var(--font-body)">wk ${t - end + SHOWN}</td>${cells.join("")}<td style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--grid);font-weight:700">${d[t].toFixed(0)}</td></tr>`);
      }
      const mapeLag = (h) => { let s = 0, c = 0; for (let t = 50; t < d.length; t++) if (d[t] > 0) { s += Math.abs(d[t] - S[t - h]) / d[t]; c++; } return (s / c) * 100; };
      $("#wf").innerHTML = `<tr>${hd("target")}${Array.from({ length: LAGS }, (_, i) => hd(`lag ${LAGS - i}`)).join("")}${hd("actual")}</tr>` + rows.join("") +
        `<tr><td style="padding:6px;font-family:var(--font-body);color:var(--muted)">MAPE, all weeks</td>${Array.from({ length: LAGS }, (_, i) => `<td style="text-align:right;padding:6px;color:var(--muted)">${mapeLag(LAGS - i).toFixed(1)}%</td>`).join("")}<td></td></tr>` +
        `<tr><td colspan="${LAGS + 2}" style="padding:6px;font-family:var(--font-body);color:var(--muted)">The outlined column is lag ${L}, the forecast you had when an order for that week had to be placed.</td></tr>`;

      // worked order
      const o = end - L, act = d.slice(o + 1, o + L + 1), tot = act.reduce((a, b) => a + b, 0), f = S[o];
      const b = (t) => `<b style="color:var(--ink)">${t}</b>`, mu = (t) => `<span style="color:var(--muted)">${t}</span>`;
      $("#work").innerHTML = [
        `Order placed at the end of week ${o - end + SHOWN} ${mu(`(lead time ${L} weeks)`)}`,
        `forecast then for each of the next ${L} weeks = ${b(f.toFixed(1))}`,
        `forecast lead-time demand = ${L} × ${f.toFixed(1)} = ${b((L * f).toFixed(0))}`,
        `actual: ${act.map((v) => v.toFixed(0)).join(" + ")} = ${b(tot.toFixed(0))}`,
        `lead-time error = ${tot.toFixed(0)} − ${(L * f).toFixed(0)} = ${b((tot - L * f > 0 ? "+" : "") + (tot - L * f).toFixed(0))} ${mu(tot - L * f > 0 ? "(short unless covered by safety stock)" : "(surplus)")}`,
        `covered by shortcut SS ${fmt(ssShort, 0)}? ${b(tot - L * f <= ssShort ? "yes" : "no")} &nbsp; by direct SS ${fmt(ssDirect, 0)}? ${b(tot - L * f <= ssDirect ? "yes" : "no")}`,
        mu(`z for ${(sl * 100).toFixed(1)}% = ${z.toFixed(3)}; shortcut = ${z.toFixed(3)} × ${fmt(lagErr[0], 1)} × √${L}; direct = ${z.toFixed(3)} × ${fmt(cum[L - 1], 1)}`),
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    const rerun = () => { compute(); draw(); };
    ["#nz", "#dr", "#L", "#sl"].forEach((s) => $(s).addEventListener("input", rerun));
    $("#newd").addEventListener("click", () => { seed++; rerun(); });
    rerun();
    return watch([plot.c], (resized) => { if (resized) plot.resize(); draw(); });
  },
});
