Lab.register({
  id: "seasonal-decomposition",
  group: "Forecasting",
  title: "Seasonal decomposition",
  blurb: "Pull a monthly series apart into trend, seasonal pattern and leftover noise, one worked step at a time.",
  lede: "Most business series are a mix of three things: a slow trend, a pattern that repeats every year, and noise. Decomposition separates them so you can see each one on its own. Here it is done the classical way, with moving averages, so every number can be checked by hand.",
  quiz: [
    ["Why use a 2×12 moving average for the trend of monthly data?", "A 12-month average covers each month once, so the seasonal pattern cancels out. But 12 is even, so the average sits between two months; averaging two neighbouring 12-month averages centres it on a month."],
    ["How do you get the seasonal index for March?", "Take every March's detrended value (actual − trend, or actual ÷ trend for multiplicative), average them across years, then adjust all 12 so they sum to zero (or average to 1)."],
    ["What should the remainder look like if the decomposition worked?", "Like noise: no trend, no repeating pattern, roughly constant spread. Structure left in the remainder means a component was missed, or the additive/multiplicative choice is wrong."],
    ["What is seasonally adjusted data?", "The actuals with the seasonal component removed (y − S, or y ÷ S). It shows the underlying movement month to month, which is what you want when asking 'is demand growing?'"],
  ],
  diy: {
    intro: "Monthly actuals in B2:B49 (four years, starting in January), month number 1–12 in A2:A49.",
    steps: [
      ["Centred 2×12 moving average for the trend. The first and last six months have no value.", "C8: =(AVERAGE(B2:B13)+AVERAGE(B3:B14))/2   (fill down to C43)"],
      ["Detrend: additive subtracts the trend, multiplicative divides.", "D8: =B8-C8          (additive)\nD8: =B8/C8          (multiplicative)"],
      ["Raw seasonal index per month: average the detrended values for that month. Month numbers 1–12 in F2:F13.", "G2: =AVERAGEIF($A$8:$A$43,F2,$D$8:$D$43)"],
      ["Normalise so the indices sum to 0 (additive) or average to 1 (multiplicative).", "H2: =G2-AVERAGE($G$2:$G$13)      (additive)\nH2: =G2/AVERAGE($G$2:$G$13)      (multiplicative)"],
      ["Seasonal component for every month, then the remainder.", "E2: =INDEX($H$2:$H$13,A2)\nI8: =B8-C8-E8      (additive)\nI8: =B8/(C8*E8)   (multiplicative)"],
      ["Seasonally adjusted series.", "J2: =B2-E2   (or =B2/E2)"],
      ["Check: the remainder should average about 0 (or 1) with no pattern. Chart it.", "=AVERAGE(I8:I43)"],
    ],
  },
  deeper: [
    ["Hyndman & Athanasopoulos, FPP3 ch. 3: Time series decomposition", "https://otexts.com/fpp3/decomposition.html", "free textbook: classical, X-11, SEATS and STL"],
    ["Hyndman & Athanasopoulos, FPP3 §3.6: STL decomposition", "https://otexts.com/fpp3/stl.html", "the modern alternative (Cleveland et al., 1990)"],
    ["US Census Bureau, X-13ARIMA-SEATS", "https://www.census.gov/data/software/x13as.html", "the method official statistics use"],
    ["NIST Engineering Statistics Handbook: Seasonality", "https://www.itl.nist.gov/div898/handbook/pmc/section4/pmc443.htm", "seasonal indices step by step"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14 L12 8 L20 16 L28 6 L36 12 L44 4 L52 10"/><path d="M4 30 L52 22" opacity=".8"/><path d="M4 44 C 10 38, 16 38, 22 44 S 34 50, 40 44 S 48 38, 52 44" opacity=".6"/><path d="M4 58 L10 56 L16 60 L22 57 L28 59 L34 56 L40 60 L46 57 L52 58" opacity=".4"/><path d="M60 32 L70 32 M66 28 L70 32 L66 36"/><rect x="74" y="8" width="18" height="48" rx="3" opacity=".4"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot"><canvas id="dc0" style="aspect-ratio:3/1" aria-label="Original series with trend"></canvas><figcaption><b>1. The data and its trend.</b> Trend = centred 12-month moving average (the dashed line). Drag any point.</figcaption></figure>
        <figure class="plot"><canvas id="dc1" style="aspect-ratio:3/1" aria-label="Detrended series"></canvas><figcaption id="cap1"></figcaption></figure>
        <figure class="plot"><canvas id="dc2" style="aspect-ratio:3/1" aria-label="Seasonal component"></canvas><figcaption id="cap2"></figcaption></figure>
        <figure class="plot"><canvas id="dc3" style="aspect-ratio:3/1" aria-label="Remainder"></canvas><figcaption id="cap3"></figcaption></figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 8px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Worked out for <span id="mName" style="color:var(--accent)"></span></h4>
          <div id="work" style="font:12.5px/1.7 var(--font-mono);overflow-x:auto"></div>
        </div>`,
      panel: `
        <div>
          <h4>Model</h4>
          <div class="seg" role="group" aria-label="Additive or multiplicative">
            <button type="button" data-k="add" aria-pressed="true">Additive</button>
            <button type="button" data-k="mul" aria-pressed="false">Multiplicative</button>
          </div>
          <p class="hint" style="margin-top:6px" id="modelHint"></p>
        </div>
        <div class="ctrl"><label for="mon">Month to inspect</label><select id="mon">${MON.map((m, i) => `<option value="${i}"${i === 11 ? " selected" : ""}>${m}</option>`).join("")}</select></div>
        <div>
          <h4>The data</h4>
          <div class="ctrl"><label for="tr">Trend per month <output id="trV"></output></label><input type="range" id="tr" min="-1" max="3" step="0.1" value="1.2"></div>
          <div class="ctrl"><label for="sa">Seasonal swing <output id="saV"></output></label><input type="range" id="sa" min="0" max="50" step="1" value="25"></div>
          <label class="check"><input type="checkbox" id="grow"> Seasonal swing grows with the level</label>
          <div class="ctrl"><label for="no">Noise <output id="noV"></output></label><input type="range" id="no" min="0" max="20" step="1" value="6"></div>
          <label class="check"><input type="checkbox" id="spike"> Add a one-off spike</label>
          <div class="btns" style="margin-top:8px"><button class="btn" id="newd" type="button">New random draw</button></div>
        </div>
        <details><summary style="cursor:pointer;font-size:.9rem">Use your own monthly data</summary>
          <textarea id="own" rows="4" spellcheck="false" aria-label="Your monthly values" style="width:100%;margin-top:8px;font:12px/1.5 var(--font-mono);padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink)"></textarea>
          <div class="btns" style="margin-top:6px"><button class="btn" id="useOwn" type="button">Use these numbers</button></div>
          <p class="hint" id="ownMsg">At least 36 monthly values, starting in January, oldest first.</p>
        </details>
        <div class="readouts">
          <div class="ro"><b>Strength of trend</b><span class="num" id="ft"></span></div>
          <div class="ro"><b>Strength of seasonality</b><span class="num" id="fs"></span></div>
        </div>
        <p class="hint">0 = none, 1 = very strong. Measured as how much of the variation each part explains compared with the remainder.</p>`,
      notes: `
        <section>
          <h2>The four steps</h2>
          <ol>
            <li><b>Trend</b>: a centred 12-month moving average. Averaging a full year cancels the seasonal ups and downs, leaving the slow movement. (Centred "2×12" means average two overlapping 12-month windows so it lines up with a month.)</li>
            <li><b>Detrend</b>: subtract the trend (or divide, for multiplicative). What's left is season plus noise.</li>
            <li><b>Seasonal index</b>: average the detrended values for each calendar month across years, then adjust so the twelve indices sum to 0 (or average 1).</li>
            <li><b>Remainder</b>: what is left after removing trend and season. Ideally it looks like random noise.</li>
          </ol>
          <div class="eq">Additive: y = Trend + Season + Remainder</div>
          <div class="eq">Multiplicative: y = Trend × Season × Remainder</div>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Tick "Seasonal swing grows with the level". In additive mode the remainder now has a funnel shape: the model is wrong. Switch to multiplicative and the funnel disappears.</li>
            <li>Add a one-off spike. It shows up clearly in the remainder, which makes decomposition a simple anomaly detector.</li>
            <li>Set the seasonal swing to 0. The seasonal strength drops toward 0 and the seasonal panel is just noise.</li>
            <li>Notice the trend line is missing for the first and last six months. A centred average needs six months on each side.</li>
          </ol>
        </section>
        <section>
          <h2>Beyond the classical method</h2>
          <ul>
            <li><b>STL</b> (Seasonal-Trend decomposition using Loess) replaces moving averages with local smoothing. It handles a seasonal pattern that changes slowly over time, gives values at the ends, and can be made robust to outliers.</li>
            <li><b>X-13ARIMA-SEATS</b> is what statistics agencies use for official seasonally adjusted figures.</li>
            <li>A <b>seasonally adjusted</b> series is the data with the seasonal part removed: trend + remainder.</li>
            <li>Forecasting methods like <a href="#exponential-smoothing">Holt-Winters</a> estimate these same parts on the fly.</li>
          </ul>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const P = [0, 1, 2, 3].map((i) => new Plot($("#dc" + i), { pad: { l: 50, t: 10, b: 26 } }));
    let y = [], seed = 12, mul = false, drag = -1;

    function makeData() {
      const r = rng(seed), tr = +$("#tr").value, sa = +$("#sa").value, no = +$("#no").value, grow = $("#grow").checked;
      y = Array.from({ length: 60 }, (_, t) => {
        const lvl = 100 + tr * t, s = Math.sin((2 * Math.PI * (t - 3)) / 12) + 0.5 * Math.cos((4 * Math.PI * t) / 12);
        return lvl + (grow ? (sa / 100) * lvl * s * 1.6 : sa * s) + r.normal() * no + ($("#spike").checked && t === 33 ? 60 : 0);
      });
      $("#own").value = y.map((v) => v.toFixed(1)).join(", ");
    }

    function decompose() {
      const n = y.length, T = new Array(n).fill(NaN);
      for (let t = 6; t < n - 6; t++) { let s = y[t - 6] / 2 + y[t + 6] / 2; for (let k = -5; k <= 5; k++) s += y[t + k]; T[t] = s / 12; }
      const D = y.map((v, t) => (isFinite(T[t]) ? (mul ? v / T[t] : v - T[t]) : NaN));
      const raw = MON.map((_, m) => { const v = D.filter((d, t) => t % 12 === m && isFinite(d)); return v.reduce((a, b) => a + b, 0) / v.length; });
      const adj = mul ? raw.reduce((a, b) => a + b, 0) / 12 : raw.reduce((a, b) => a + b, 0) / 12;
      const idx = raw.map((v) => (mul ? v / adj : v - adj));
      const S = y.map((_, t) => idx[t % 12]);
      const R = y.map((v, t) => (isFinite(T[t]) ? (mul ? v / (T[t] * S[t]) : v - T[t] - S[t]) : NaN));
      return { T, D, raw, adj, idx, S, R };
    }

    const variance = (v) => { const a = v.filter(isFinite), m = a.reduce((p, q) => p + q, 0) / a.length; return a.reduce((p, q) => p + (q - m) ** 2, 0) / (a.length - 1); };

    function draw() {
      $("#trV").textContent = (+$("#tr").value).toFixed(1); $("#saV").textContent = $("#sa").value; $("#noV").textContent = $("#no").value;
      $("#modelHint").textContent = mul ? "Season and noise scale with the level: y = T × S × R. Use when peaks grow as sales grow." : "Season has a fixed size: y = T + S + R. Use when peaks stay about the same height.";
      const d = decompose(), n = y.length, xs = y.map((_, t) => t), sel = +$("#mon").value;
      const ticks = []; for (let t = 0; t < n; t += 12) ticks.push(t);
      const xf = (v) => `Y${v / 12 + 1}`;
      const range = (arr, padF = 0.1) => { const a = arr.filter(isFinite), lo = Math.min(...a), hi = Math.max(...a), p = (hi - lo) * padF || 1; return [lo - p, hi + p]; };
      const panel = (pl, vals, color, ref, label) => {
        pl.x = [-0.5, n - 0.5];
        if (!(drag >= 0 && pl === P[0])) pl.y = range(ref ? vals.concat([ref]) : vals);
        pl.clear();
        pl.ctx.fillStyle = css("--accent-soft");
        for (let t = sel; t < n; t += 12) pl.ctx.fillRect(pl.sx(t - 0.5), pl.pad.t, pl.sx(t + 0.5) - pl.sx(t - 0.5), pl.ih);
        pl.axes({ xTicks: ticks, xFormat: xf, yCount: 3, yLabel: label });
        if (ref !== undefined) pl.fn(() => ref, css("--muted"), 1, [3, 3]);
        pl.path(xs, vals, color, 1.8);
      };
      panel(P[0], y, css("--ink"), undefined, "sales");
      P[0].path(xs, d.T, css("--violet"), 2.5, [7, 4]);
      y.forEach((v, t) => P[0].dot(t, v, 2.6, css("--ink")));
      panel(P[1], d.D, css("--accent"), mul ? 1 : 0, mul ? "y ÷ trend" : "y − trend");
      d.D.forEach((v, t) => isFinite(v) && P[1].dot(t, v, t % 12 === sel ? 4 : 2.2, css(t % 12 === sel ? "--warm" : "--accent")));
      panel(P[2], d.S, css("--warm"), mul ? 1 : 0, "season");
      panel(P[3], d.R, css("--muted"), mul ? 1 : 0, "remainder");
      d.R.forEach((v, t) => isFinite(v) && P[3].dot(t, v, 2.6, css("--ink")));

      $("#cap1").innerHTML = `<b>2. Detrended:</b> ${mul ? "data ÷ trend" : "data − trend"}. Orange dots are every ${MON[sel]}; their average becomes the ${MON[sel]} seasonal index.`;
      $("#cap2").innerHTML = `<b>3. Seasonal pattern:</b> the same 12 indices repeated every year.`;
      $("#cap3").innerHTML = `<b>4. Remainder:</b> ${mul ? "data ÷ (trend × season)" : "data − trend − season"}. Should look like patternless noise.`;

      const vals = d.D.map((v, t) => [v, t]).filter(([v, t]) => t % 12 === sel && isFinite(v));
      const f = (v) => (mul ? v.toFixed(3) : v.toFixed(1));
      $("#mName").textContent = MON[sel];
      $("#work").innerHTML =
        vals.map(([v, t]) => `Y${Math.floor(t / 12) + 1} ${MON[sel]}: y = ${y[t].toFixed(1)}, trend = ${d.T[t].toFixed(1)} → ${mul ? `${y[t].toFixed(1)} ÷ ${d.T[t].toFixed(1)}` : `${y[t].toFixed(1)} − ${d.T[t].toFixed(1)}`} = <b>${f(v)}</b>`).join("<br>") +
        `<br>Average of these ${vals.length} = <b>${f(d.raw[sel])}</b>` +
        `<br>Adjust so the 12 indices ${mul ? "average 1" : "sum to 0"}: ${f(d.raw[sel])} ${mul ? "÷" : "−"} ${f(d.adj)} = <b style="color:var(--warm)">${f(d.idx[sel])}</b>` +
        `<br><span style="color:var(--muted)">So a typical ${MON[sel]} runs ${mul ? `${((d.idx[sel] - 1) * 100).toFixed(1)}% ${d.idx[sel] >= 1 ? "above" : "below"}` : `${Math.abs(d.idx[sel]).toFixed(1)} units ${d.idx[sel] >= 0 ? "above" : "below"}`} the trend.</span>`;

      const op = (a, b) => (mul ? a * b : a + b);
      const vR = variance(d.R), vTR = variance(d.T.map((tv, t) => op(tv, d.R[t]))), vSR = variance(d.S.map((sv, t) => op(sv, d.R[t])));
      const strength = (v) => Math.max(0, 1 - vR / v);
      $("#ft").textContent = strength(vTR).toFixed(2);
      $("#fs").textContent = strength(vSR).toFixed(2);
    }

    root.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => {
      mul = b.dataset.k === "mul"; root.querySelectorAll("[data-k]").forEach((o) => o.setAttribute("aria-pressed", String(o === b))); draw();
    }));
    ["#tr", "#sa", "#no", "#grow", "#spike"].forEach((s) => $(s).addEventListener("input", () => { makeData(); draw(); }));
    $("#mon").addEventListener("change", draw);
    $("#newd").addEventListener("click", () => { seed++; makeData(); draw(); });
    $("#useOwn").addEventListener("click", () => {
      const v = $("#own").value.split(/[\s,;]+/).filter(Boolean).map(Number);
      if (v.some((x) => !isFinite(x))) { $("#ownMsg").textContent = "Some entries aren't plain numbers."; return; }
      if (v.length < 36) { $("#ownMsg").textContent = `Only ${v.length} values; paste at least 36 (three years).`; return; }
      if (mul && v.some((x) => x <= 0)) { $("#ownMsg").textContent = "Multiplicative needs all values above 0. Switch to additive or check the data."; return; }
      y = v; $("#ownMsg").textContent = `Using your ${v.length} values.`; draw();
    });
    const c = P[0].c;
    const pos = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    c.addEventListener("pointerdown", (e) => {
      const [px, py] = pos(e); let best = -1, bd = 100;
      y.forEach((v, t) => { const dd = (P[0].sx(t) - px) ** 2 + (P[0].sy(v) - py) ** 2; if (dd < bd) { bd = dd; best = t; } });
      if (best >= 0) { drag = best; c.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    c.addEventListener("pointermove", (e) => { if (drag < 0) return; y[drag] = P[0].iy(pos(e)[1]); draw(); });
    const end = () => { if (drag >= 0) { drag = -1; $("#own").value = y.map((v) => v.toFixed(1)).join(", "); draw(); } };
    c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end);

    makeData(); draw();
    return watch(P.map((p) => p.c), (resized) => { if (resized) P.forEach((p) => p.resize()); draw(); });
  },
});
