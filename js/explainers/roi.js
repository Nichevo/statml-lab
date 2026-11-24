Lab.register({
  id: "roi",
  group: "Supply chain",
  title: "Business case: ROI, NPV and payback",
  blurb: "Build the business case for a supply chain project: one-off cost, benefits that ramp up, running costs, discounting, and the range of outcomes when the benefits are uncertain.",
  lede: "Most supply chain improvements (a new planning tool, a better forecast process, a warehouse redesign) cost money up front and pay back over several years. A business case turns that into a few numbers: payback period, net present value (NPV) and return on investment. Because the benefits are estimates, a good case also shows the range: how likely the project is to lose money if the benefits come in low.",
  quiz: [
    ["A project costs $500k and saves $200k a year from year 1. What is the simple payback?", "500 ÷ 200 = 2.5 years. Simple payback ignores the time value of money and anything after the payback point."],
    ["Why discount future benefits?", "A dollar next year is worth less than a dollar today: you could invest today's dollar at the cost of capital. Discounting at r per year divides year-t cash by (1 + r)^t."],
    ["Benefits of $1m a year are usually claimed as 'savings'. Which ones should you count?", "Only those that change cash or profit: lower carrying cost, fewer lost sales (at contribution), less freight. A one-off inventory cut is a cash inflow in the year it happens, not a yearly saving."],
    ["NPV is positive on average but negative in 30% of simulations. What should you do?", "Find which assumptions drive the downside, test them early (a pilot), or phase the investment so you can stop if early benefits disappoint."],
  ],
  diy: {
    intro: "Up-front cost in H1, yearly benefit in H2, running cost in H3, discount rate in H4. Years 0–5 in A2:A7.",
    steps: [
      ["Cash flow each year (ramp % in C).", "B2: =-H1\nB3: =$H$2*C3-$H$3"],
      ["Net present value.", "=B2+NPV($H$4,B3:B7)"],
      ["Internal rate of return.", "=IRR(B2:B7)"],
      ["Simple ROI.", "=(SUM(B3:B7)-H1)/H1"],
      ["Payback year: first year the cumulative cash flow turns positive.", "D2: =SUM($B$2:B2)\n=INDEX(A2:A7,MATCH(TRUE,D2:D7>=0,0))"],
    ],
  },
  deeper: [
    ["Net present value — Wikipedia", "https://en.wikipedia.org/wiki/Net_present_value", "the formula and how to read it"],
    ["Payback period — Wikipedia", "https://en.wikipedia.org/wiki/Payback_period", "simple and discounted payback"],
    ["Internal rate of return — Wikipedia", "https://en.wikipedia.org/wiki/Internal_rate_of_return", "the discount rate that makes NPV zero"],
    ["Monte Carlo method — Wikipedia", "https://en.wikipedia.org/wiki/Monte_Carlo_method", "simulating uncertain inputs"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 32 h82" opacity=".4"/><path d="M8 32 L20 52 L36 44 L52 34 L68 22 L88 10"/><circle cx="54" cy="32" r="3" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, watch, css, rng } = Lab;
    const money = (v) => (v < 0 ? "−" : "") + "$" + (Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toFixed(2) + "m" : Math.round(Math.abs(v) / 1000) + "k");

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="cf" aria-label="Cumulative cash flow by year, undiscounted and discounted"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>Cumulative cash (discounted)</span><span><i style="background:var(--muted)"></i>Undiscounted</span><span><i style="background:var(--good)"></i>Payback</span></div>
          <figcaption>Where the line crosses zero is the payback point. Its height at the end is the NPV.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="mc" aria-label="Histogram of simulated NPV outcomes"></canvas>
          <figcaption>2,000 simulated outcomes, drawing each year's benefit between your low and high cases. Red bars lose money.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Year by year</h4>
          <div style="overflow-x:auto"><table id="tbl" style="width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums"></table></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="cap">Up-front cost <output id="capV"></output></label><input type="range" id="cap" min="50" max="5000" step="50" value="800"></div>
        <div class="ctrl"><label for="ben">Yearly benefit (expected, at full run rate) <output id="benV"></output></label><input type="range" id="ben" min="0" max="3000" step="25" value="450"></div>
        <div class="ctrl"><label for="rng">Benefit could be ± <output id="rngV"></output></label><input type="range" id="rng" min="0" max="100" step="5" value="40"></div>
        <div class="ctrl"><label for="ramp">Ramp-up (share of benefit in year 1) <output id="rampV"></output></label><input type="range" id="ramp" min="0" max="100" step="5" value="40"></div>
        <div class="ctrl"><label for="run">Running cost / yr (licences, people) <output id="runV"></output></label><input type="range" id="run" min="0" max="1000" step="10" value="90"></div>
        <div class="ctrl"><label for="cash">One-off inventory release in year 1 <output id="cashV"></output></label><input type="range" id="cash" min="0" max="3000" step="50" value="300"></div>
        <div class="ctrl"><label for="yrs">Years counted <output id="yrsV"></output></label><input type="range" id="yrs" min="2" max="10" step="1" value="5"></div>
        <div class="ctrl"><label for="r">Discount rate <output id="rV"></output></label><input type="range" id="r" min="0" max="20" step="0.5" value="10"></div>
        <div class="readouts" id="ro"></div>`,
      notes: `
        <section>
          <h2>The numbers</h2>
          <div class="eq">cash flow in year t = benefit × ramp − running cost (+ one-off release)<br>NPV = −up-front + Σ cash flow_t ÷ (1 + r)^t<br>ROI = (total net benefit − up-front) ÷ up-front<br>IRR = the r that makes NPV = 0</div>
          <p>Benefits ramp up: year 1 gets the ramp share, year 2 halfway between that and 100%, then full rate.</p>
        </section>
        <section>
          <h2>What goes in "benefit"</h2>
          <p>Use the yearly profit effects from <a href="#cost-margin">landed cost and margin</a> and <a href="#forecast-value">the value of a better forecast</a>: carrying cost saved, margin from recovered sales, freight and write-off savings. Put the inventory cut in as a one-off cash release, not a yearly benefit.</p>
        </section>
        <section>
          <h2>Uncertainty</h2>
          <p>Each simulated run draws the benefit level from a triangular distribution between low, expected and high (and a separate wobble each year), then computes NPV. The share of runs below zero is a plain-language risk number for the decision.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set the ramp to 0%. Payback slips by about a year: slow adoption is the most common reason business cases miss.</li>
            <li>Remove the one-off inventory release. How much of the case did it carry?</li>
            <li>Raise the range to ±80%. The average NPV barely moves, but the chance of losing money jumps.</li>
            <li>Count only 3 years. Many companies require payback within 2–3 years whatever the NPV.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pC = new Plot($("#cf"), { x: [0, 5], pad: { l: 64 } });
    const pH = new Plot($("#mc"), { x: [0, 1], pad: { l: 40 } });

    function flows(p, level, wob) {
      const out = [-p.cap];
      for (let t = 1; t <= p.yrs; t++) {
        const ramp = t === 1 ? p.ramp : t === 2 ? (p.ramp + 1) / 2 : 1;
        out.push(p.ben * level * (wob ? wob[t] : 1) * ramp - p.run + (t === 1 ? p.cash : 0));
      }
      return out;
    }
    const npv = (f, r) => f.reduce((s, v, t) => s + v / (1 + r) ** t, 0);
    function irr(f) { let lo = -0.99, hi = 5; if (npv(f, lo) * npv(f, hi) > 0) return NaN; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (npv(f, lo) * npv(f, m) <= 0) hi = m; else lo = m; } return (lo + hi) / 2; }
    function payback(f, r) { let c = 0; for (let t = 0; t < f.length; t++) { const v = f[t] / (1 + r) ** t, prev = c; c += v; if (t > 0 && c >= 0 && prev < 0) return t - 1 + -prev / v; } return NaN; }
    const tri = (u, a, m, b) => (u < (m - a) / (b - a) ? a + Math.sqrt(u * (b - a) * (m - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - m)));

    function draw() {
      const k = 1000;
      const p = { cap: +$("#cap").value * k, ben: +$("#ben").value * k, spread: +$("#rng").value / 100, ramp: +$("#ramp").value / 100, run: +$("#run").value * k, cash: +$("#cash").value * k, yrs: +$("#yrs").value, r: +$("#r").value / 100 };
      $("#capV").textContent = money(p.cap); $("#benV").textContent = money(p.ben); $("#rngV").textContent = Math.round(p.spread * 100) + "%"; $("#rampV").textContent = Math.round(p.ramp * 100) + "%";
      $("#runV").textContent = money(p.run); $("#cashV").textContent = money(p.cash); $("#yrsV").textContent = p.yrs; $("#rV").textContent = (p.r * 100).toFixed(1) + "%";

      const f = flows(p, 1), N = npv(f, p.r), I = irr(f), pb = payback(f, p.r), pbU = payback(f, 0);
      const totNet = f.slice(1).reduce((s, v) => s + v, 0), roi = (totNet - p.cap) / p.cap;
      const ts = f.map((_, t) => t);
      let cu = 0, cd = 0; const cumU = f.map((v) => (cu += v)), cumD = f.map((v, t) => (cd += v / (1 + p.r) ** t));
      pC.x = [0, p.yrs];
      const lo = Math.min(...cumU, ...cumD), hi = Math.max(...cumU, ...cumD, 0);
      pC.y = [lo - (hi - lo) * 0.08, hi + (hi - lo) * 0.12];
      pC.clear(); pC.axes({ xLabel: "year", xTicks: ts, yLabel: "cumulative cash", yFormat: money, yCount: 5 });
      pC.path([0, p.yrs], [0, 0], css("--line"), 1.5);
      pC.path(ts, cumU, css("--muted"), 1.8, [5, 4]);
      pC.path(ts, cumD, css("--accent"), 2.8);
      ts.forEach((t) => pC.dot(t, cumD[t], 4, css("--accent"), css("--surface")));
      if (isFinite(pb)) pC.dot(pb, 0, 7, css("--good"), css("--surface"));

      // Monte Carlo
      const R = rng(7), sims = [];
      for (let s = 0; s < 2000; s++) {
        const level = tri(R(), 1 - p.spread, 1, 1 + p.spread * 0.6);
        const wob = Array.from({ length: p.yrs + 1 }, () => 1 + R.normal() * p.spread * 0.25);
        sims.push(npv(flows(p, level, wob), p.r));
      }
      sims.sort((a, b) => a - b);
      const pLoss = sims.filter((v) => v < 0).length / sims.length, p10 = sims[200], p90 = sims[1800], mean = sims.reduce((s, v) => s + v, 0) / sims.length;
      const mn = sims[0], mx = sims[sims.length - 1], nb = 36, w = (mx - mn) / nb || 1, bins = new Array(nb).fill(0);
      sims.forEach((v) => bins[Math.min(nb - 1, Math.floor((v - mn) / w))]++);
      pH.x = [mn, mx + 1e-9]; pH.y = [0, Math.max(...bins) * 1.1];
      pH.clear(); pH.axes({ xLabel: "NPV", xFormat: money, xCount: 5, yTicks: [] });
      const g = pH.ctx;
      bins.forEach((c, i) => { const x0 = mn + i * w; g.fillStyle = x0 + w / 2 < 0 ? css("--bad") : css("--accent"); g.globalAlpha = 0.75; g.fillRect(pH.sx(x0) + 1, pH.sy(c), Math.max(1, pH.sx(x0 + w) - pH.sx(x0) - 2), pH.sy(0) - pH.sy(c)); });
      g.globalAlpha = 1;
      if (mn < 0 && mx > 0) pH.path([0, 0], [0, pH.y[1]], css("--ink"), 1.5, [4, 3]);

      $("#ro").innerHTML = `
        <div class="ro"><b>NPV</b><span class="pill ${N >= 0 ? "ok" : "bad"}">${money(N)}</span></div>
        <div class="ro"><b>IRR</b><span class="num">${isFinite(I) ? (I * 100).toFixed(1) + "%" : "—"}</span></div>
        <div class="ro"><b>Payback (discounted)</b><span class="num">${isFinite(pb) ? pb.toFixed(1) + " yrs" : "not within " + p.yrs}</span></div>
        <div class="ro"><b>Payback (simple)</b><span class="num">${isFinite(pbU) ? pbU.toFixed(1) + " yrs" : "—"}</span></div>
        <div class="ro"><b>ROI over ${p.yrs} yrs</b><span class="num">${(roi * 100).toFixed(0)}%</span></div>
        <div class="ro"><b>NPV 10th–90th pct</b><span class="num">${money(p10)} to ${money(p90)}</span></div>
        <div class="ro"><b>Chance of losing money</b><span class="pill ${pLoss > 0.2 ? "bad" : pLoss > 0.05 ? "warn" : "ok"}">${(pLoss * 100).toFixed(0)}%</span></div>`;

      const td = (v, b) => `<td style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono);${b ? "font-weight:700" : ""}">${v}</td>`;
      const th = (t) => `<th style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500">${t}</th>`;
      $("#tbl").innerHTML = `<tr>${th("Year")}${th("Benefit")}${th("Running cost")}${th("One-off")}${th("Net cash")}${th("Discount factor")}${th("Present value")}${th("Cumulative PV")}</tr>` + f.map((v, t) => {
        const ramp = t === 0 ? 0 : t === 1 ? p.ramp : t === 2 ? (p.ramp + 1) / 2 : 1, df = 1 / (1 + p.r) ** t;
        return `<tr>${td(t)}${td(t ? money(p.ben * ramp) : "—")}${td(t ? money(-p.run) : "—")}${td(t === 0 ? money(-p.cap) : t === 1 ? money(p.cash) : "—")}${td(money(v))}${td(df.toFixed(3))}${td(money(v * df))}${td(money(cumD[t]), t === p.yrs)}</tr>`;
      }).join("");
    }

    root.querySelectorAll("input").forEach((i) => i.addEventListener("input", draw));
    draw();
    return watch([pC.c, pH.c], (resized) => { if (resized) { pC.resize(); pH.resize(); } draw(); });
  },
});
