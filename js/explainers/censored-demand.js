Lab.register({
  id: "censored-demand",
  group: "Supply chain",
  title: "Censored demand: when stockouts hide sales",
  blurb: "If you forecast from sales, every stockout teaches the forecast that demand was lower than it was. See the downward spiral, a common fix that backfires, and one that works.",
  lede: "Sales are not demand. When the shelf is empty, you record the sales you made, not the sales you could have made. A forecast built on those sales comes out too low, so you stock less, so you stock out more, so the next forecast is lower again. Statisticians call the data censored: you only see demand up to the amount you had.",
  quiz: [
    ["You had 80 in stock and sold all 80. What do you know about demand that week?", "Only that it was at least 80. It could have been 81 or 200. Recording it as 80 always understates it."],
    ["Why does the bias get worse over time instead of staying constant?", "Lower forecasts lead to less stock, which leads to more stockouts, which censors more weeks and pulls the forecast down again. It's a feedback loop."],
    ["Skipping stocked-out weeks removes the false low values. Why can it end up even worse than using sales?", "Stockouts happen in the high-demand weeks. Skipping them keeps only the weeks where demand was below the stock, so the forecast only ever hears low numbers and ratchets down. The more often you stock out, the worse it gets."],
    ["What real-world signals help estimate lost sales?", "Out-of-stock flags and hours from store systems, web searches or page views for unavailable items, lost-order logs, rain checks, and sales of substitutes that rise when the item is missing."],
  ],
  diy: {
    intro: "Weekly sales in B2:B53, stock available each week in C2:C53. A week is censored if sales = stock.",
    steps: [
      ["Flag stocked-out weeks.", "D2: =IF(B2>=C2,1,0)"],
      ["Naive mean (biased low) and the mean of uncensored weeks only.", "=AVERAGE(B2:B53)\n=AVERAGEIF(D2:D53,0,B2:B53)"],
      ["Starting estimates μ and σ from uncensored weeks, in H1:H2.", "H1: =AVERAGEIF(D2:D53,0,B2:B53)\nH2: =STDEV.S(IF(D2:D53=0,B2:B53))"],
      ["For a censored week, expected true demand given it was at least the stock S.", "a: =(C2-$H$1)/$H$2\nE2: =IF(D2=1,$H$1+$H$2*NORM.S.DIST(a,FALSE)/(1-NORM.S.DIST(a,TRUE)),B2)"],
      ["Re-estimate μ and σ from column E and repeat steps 3–4 a few times (the EM algorithm).", "=AVERAGE(E2:E53)"],
      ["Lost sales estimate.", "=SUM(E2:E53)-SUM(B2:B53)"],
    ],
  },
  deeper: [
    ["Censoring (statistics) — Wikipedia", "https://en.wikipedia.org/wiki/Censoring_(statistics)", "the general idea, also central in survival analysis"],
    ["Truncated normal distribution — Wikipedia", "https://en.wikipedia.org/wiki/Truncated_normal_distribution", "the expected value used for imputing lost sales"],
    ["Tobit model — Wikipedia", "https://en.wikipedia.org/wiki/Tobit_model", "regression for censored data"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="24" x2="92" y2="24" stroke-dasharray="4 3"/><path d="M4 40 L16 30 L28 24 L40 24 L52 36 L64 24 L76 24 L88 44" /><path d="M28 24 L34 10 L40 24 M64 24 L70 6 L76 24" opacity=".4"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css, dnorm, pnorm } = Lab;
    const W = 104, MU = 100;
    const M = [
      { id: "naive", name: "Use sales as demand", col: "--bad" },
      { id: "skip", name: "Skip stocked-out weeks", col: "--warm" },
      { id: "imp", name: "Impute lost sales", col: "--accent" },
    ];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="cdc" aria-label="True demand, and the forecast each method produces over two years"></canvas>
          <div class="legend"><span><i style="background:var(--ink);opacity:.4"></i>True demand</span><span><i style="background:var(--ink)"></i>True average</span>${M.map((m) => `<span><i style="background:var(${m.col})"></i>${m.name}</span>`).join("")}</div>
          <figcaption>Two years of weekly forecasts. Each method stocks forecast + buffer and learns from what it sees.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="cdz" aria-label="Demand, stock and sales for the naive method"></canvas>
          <div class="legend"><span><i style="background:var(--ink);opacity:.4"></i>Demand</span><span><i style="background:var(--bad);opacity:.35;height:10px"></i>Stock available (naive method)</span><span><i style="background:var(--bad)"></i>Weeks it ran out</span></div>
          <figcaption>Inside the naive method: the bars show what was available, and the red marks are weeks where demand exceeded it, so sales were cut off at the bar.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">One stocked-out week, three ways</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.84rem;line-height:1.9"></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="buf">Stock buffer above forecast <output id="bufV"></output></label><input type="range" id="buf" min="0" max="50" step="1" value="10"></div>
        <div class="ctrl"><label for="cv">Demand variability (CV) <output id="cvV"></output></label><input type="range" id="cv" min="0.05" max="0.5" step="0.01" value="0.25"></div>
        <div class="ctrl"><label for="al">Smoothing α <output id="alV"></output></label><input type="range" id="al" min="0.05" max="0.5" step="0.01" value="0.15"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New random demand</button></div>`,
      notes: `
        <section>
          <h2>The three methods</h2>
          <p>Each week, stock = forecast × (1 + buffer). Sales = min(demand, stock). The forecast is then updated with <a href="#exponential-smoothing">exponential smoothing</a>, using:</p>
          <ul>
            <li><b>Use sales as demand:</b> the sales figure, even when it was cut off.</li>
            <li><b>Skip stocked-out weeks:</b> no update in weeks that sold out, since the number is known to be wrong. A common fix, but it backfires: see below.</li>
            <li><b>Impute lost sales:</b> in a sold-out week, replace sales with the expected demand <i>given</i> it was at least the stock:</li>
          </ul>
          <div class="eq">E[D | D ≥ S] = μ + σ × φ(a) / (1 − Φ(a)),&nbsp; a = (S − μ) / σ</div>
          <p>μ and σ are the current forecast and its estimated spread. It's the average of a normal distribution cut off below S.</p>
        </section>
        <section>
          <h2>Why it matters</h2>
          <ul>
            <li>The naive forecast settles well below true demand, and the shortfall is self-inflicted.</li>
            <li>Skipping sold-out weeks sounds safe, but it throws away exactly the high-demand weeks. The forecast then only learns from weeks that were below stock, and ratchets down faster than the naive one.</li>
            <li>Accuracy reports look fine, because forecast is compared with sales, which are also too low.</li>
            <li>The cure needs data: record when items are out of stock. Without a flag you can't tell "sold 80" from "sold out at 80".</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set the buffer to 0%. The naive forecast keeps sinking: every week it stocks exactly its forecast, so it can never learn demand was higher.</li>
            <li>Compare the orange line with the red one: skipping sold-out weeks sinks further, because only below-stock weeks get through.</li>
            <li>Raise the buffer to 40%. Stockouts become rare, and all three methods agree.</li>
            <li>Raise variability to 0.5. More weeks are cut off, and the gap between methods grows.</li>
          </ol>
          <p>The same problem distorts <a href="#intermittent-demand">intermittent demand</a> and <a href="#service-level-cost">service-level</a> calculations.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pF = new Plot($("#cdc"), { x: [0, W - 1], pad: { l: 50 } });
    const pZ = new Plot($("#cdz"), { x: [-0.5, W - 0.5], pad: { l: 50 } });
    let seed = 3, R = null;

    function compute() {
      const r = rng(seed), buf = +$("#buf").value / 100, cv = +$("#cv").value, al = +$("#al").value;
      const dem = Array.from({ length: W }, () => Math.max(0, MU * (1 + cv * r.normal())));
      const out = {};
      M.forEach((m) => {
        let f = MU; const fc = [], stock = [], sales = [], so = [], obs = [];
        for (let t = 0; t < W; t++) {
          const S = f * (1 + buf), s = Math.min(dem[t], S), out_ = dem[t] > S;
          fc.push(f); stock.push(S); sales.push(s); so.push(out_);
          let y = s;
          if (out_ && m.id === "skip") y = null;
          if (out_ && m.id === "imp") { const sg = cv * f, a = (S - f) / sg; y = f + (sg * dnorm(a)) / Math.max(1e-9, 1 - pnorm(a)); }
          obs.push(y);
          if (y !== null) f = al * y + (1 - al) * f;
        }
        const lost = dem.reduce((x, d, t) => x + d - sales[t], 0), tot = dem.reduce((x, y) => x + y, 0);
        out[m.id] = { fc, stock, sales, so, obs, fill: 1 - lost / tot, avgF: fc.slice(W / 2).reduce((x, y) => x + y, 0) / (W / 2), outs: so.filter(Boolean).length };
      });
      R = { dem, out, buf, cv };
    }

    function draw() {
      const { dem, out, buf, cv } = R;
      $("#bufV").textContent = Math.round(buf * 100) + "%"; $("#cvV").textContent = cv.toFixed(2); $("#alV").textContent = (+$("#al").value).toFixed(2);
      const xs = dem.map((_, i) => i);
      const all = dem.concat(...M.map((m) => out[m.id].fc));
      pF.y = [Math.max(0, Math.min(...all) - 10), Math.max(...all) + 10];
      pF.clear(); pF.axes({ xLabel: "week", yLabel: "units" });
      pF.path(xs, dem, css("--ink"), 1.2, null, 0.35);
      pF.path([0, W - 1], [MU, MU], css("--ink"), 1.5, [6, 4]);
      M.forEach((m) => pF.path(xs, out[m.id].fc, css(m.col), 2.5));

      const nv = out.naive;
      pZ.y = [0, Math.max(...dem, ...nv.stock) * 1.08];
      pZ.clear(); pZ.axes({ xLabel: "week", yLabel: "units", yCount: 4 });
      const g = pZ.ctx, bw = (pZ.sx(1) - pZ.sx(0)) * 0.7;
      g.save(); g.fillStyle = css("--bad"); g.globalAlpha = 0.25;
      nv.stock.forEach((s, i) => g.fillRect(pZ.sx(i) - bw / 2, pZ.sy(s), bw, pZ.sy(0) - pZ.sy(s)));
      g.restore();
      pZ.path(xs, dem, css("--ink"), 1.2, null, 0.45);
      nv.so.forEach((o, i) => { if (o) pZ.dot(i, nv.stock[i], 3.5, css("--bad")); });

      $("#ro").innerHTML = `<div class="ro" style="font-size:.78rem;color:var(--muted)"><b>method</b><span>avg forecast yr 2 · fill rate</span></div>` +
        M.map((m) => { const o = out[m.id], bias = (o.avgF / MU - 1) * 100; return `<div class="ro"><b><i style="display:inline-block;width:10px;height:4px;border-radius:2px;background:var(${m.col});margin-right:6px;vertical-align:middle"></i>${m.name}</b><span class="num"><span class="pill ${Math.abs(bias) < 3 ? "ok" : Math.abs(bias) < 8 ? "warn" : "bad"}">${bias > 0 ? "+" : ""}${bias.toFixed(1)}%</span> · ${(o.fill * 100).toFixed(1)}%</span></div>`; }).join("") +
        `<div class="ro" style="display:block;font-size:.8rem;color:var(--muted)">Forecast bias is against the true average demand of ${MU}. Naive method ran out in ${nv.so.filter(Boolean).length} of ${W} weeks.</div>`;

      // worked example: last stocked-out week of the imputing method
      const im = out.imp, t = im.so.lastIndexOf(true);
      const b = (x) => `<b style="color:var(--ink)">${x}</b>`, mu = (x) => `<span style="color:var(--muted)">${x}</span>`;
      if (t < 0) { $("#work").innerHTML = mu("No stockouts in this run. Lower the buffer to see one."); return; }
      const f = im.fc[t], S = im.stock[t], sg = cv * f, a = (S - f) / sg;
      $("#work").innerHTML = [
        `week ${t + 1}: forecast ${b(fmt(f, 1))}, stock ${fmt(f, 1)} × ${(1 + buf).toFixed(2)} = ${b(fmt(S, 1))}, true demand ${b(fmt(dem[t], 1))} ${mu("(unseen)")}`,
        `sales = min(${fmt(dem[t], 0)}, ${fmt(S, 0)}) = ${b(fmt(S, 1))} → sold out`,
        `<span style="color:var(--bad)">naive</span>: learns from ${fmt(S, 1)} ${mu(`→ pulls forecast toward a number that's ${fmt(dem[t] - S, 0)} too low`)}`,
        `<span style="color:var(--warm)">skip</span>: ignores this week ${mu("→ forecast unchanged")}`,
        `<span style="color:var(--accent)">impute</span>: σ = ${cv.toFixed(2)} × ${fmt(f, 1)} = ${fmt(sg, 1)}, a = (${fmt(S, 1)} − ${fmt(f, 1)}) / ${fmt(sg, 1)} = ${a.toFixed(2)}`,
        `&nbsp;&nbsp;E[D | D ≥ ${fmt(S, 0)}] = ${fmt(f, 1)} + ${fmt(sg, 1)} × ${dnorm(a).toFixed(3)} / ${(1 - pnorm(a)).toFixed(3)} = ${b(fmt(im.obs[t], 1))} ${mu("→ learns from this instead")}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    const rerun = () => { compute(); draw(); };
    ["#buf", "#cv", "#al"].forEach((s) => $(s).addEventListener("input", rerun));
    $("#newd").addEventListener("click", () => { seed++; rerun(); });
    rerun();
    return watch([pF.c, pZ.c], (resized) => { if (resized) { pF.resize(); pZ.resize(); } draw(); });
  },
});
