Lab.register({
  id: "rollup",
  group: "Statistical analysis",
  title: "Rolling up numbers: bottom-up vs average vs weighted average",
  blurb: "Total margin %, overall forecast error, average cost per unit: add up the parts, average the percentages, or weight them? Edit a product table and watch the three answers disagree.",
  lede: "Every report rolls numbers up: margin % for a category, forecast error for a business unit, cost per unit for a network. There are three common ways to do it. Bottom-up adds the dollars (or units) first and divides once at the end. A simple average takes each product's percentage and averages them, so a tiny product counts as much as a huge one. A weighted average gives each product a weight, and it matches bottom-up exactly when the weight is the right one: whatever sits in the denominator of the ratio. Pick the wrong method and the total can be off by a mile, or move the wrong way.",
  quiz: [
    ["Product A: revenue $900k, margin 10%. Product B: revenue $100k, margin 50%. What's the total margin %?", "Bottom-up: ($90k + $50k) ÷ $1,000k = 14%. The simple average (10% + 50%) ÷ 2 = 30% is badly wrong, because B is a tenth of the size."],
    ["To roll up margin % with a weighted average, what should the weights be?", "Revenue, because margin % = margin $ ÷ revenue. Weighting by units sold gives a different (wrong) answer whenever prices differ between products."],
    ["What's the difference between MAPE and WAPE in these terms?", "MAPE is the simple average of each item's % error. WAPE is the bottom-up version: total absolute error ÷ total actuals, which is the same as % errors weighted by actual volume. WAPE isn't dominated by tiny items."],
    ["Every product's margin % went up this year, yet the total margin % went down. Is that possible?", "Yes. If the sales mix shifted towards low-margin products, the weights changed. Each part improved but the total fell. This is Simpson's paradox, and it's why mix effects belong in any margin bridge."],
    ["When is the simple average the right answer?", "When you really want each item to count equally: 'what does a typical product look like?' rather than 'what does the business look like?'. For example, the median or average service level across SKUs as a measure of how many products are well served."],
  ],
  diy: {
    intro: "One row per product: units in B2:B7, price in C2:C7, unit cost in D2:D7, forecast in E2:E7 (actual = units sold).",
    steps: [
      ["Item-level ratios.", "F2: =(C2-D2)/C2          (margin %)\nG2: =ABS(E2-B2)/B2       (forecast error %)\nH2: =D2                  (cost per unit)"],
      ["Bottom-up: add the numerators, add the denominators, divide once.", "Margin %:  =SUMPRODUCT(B2:B7,C2:C7-D2:D7)/SUMPRODUCT(B2:B7,C2:C7)\nError %:   =SUMPRODUCT(ABS(E2:E7-B2:B7))/SUM(B2:B7)\nCost/unit: =SUMPRODUCT(B2:B7,D2:D7)/SUM(B2:B7)"],
      ["Simple average of the item ratios (each product counts once).", "=AVERAGE(F2:F7)"],
      ["Weighted average with weights w in I2:I7.", "=SUMPRODUCT(F2:F7,I2:I7)/SUM(I2:I7)"],
      ["The right weight is the ratio's denominator: revenue for margin %, actual units for error %, units for cost per unit. Then the weighted average equals bottom-up exactly.", "I2: =B2*C2   (revenue weight for margin %)"],
      ["Mix vs rate bridge between two periods (old weights w0, rates r0; new w1, r1, weights as shares).", "rate effect: =SUMPRODUCT(w1,r1-r0)\nmix effect:  =SUMPRODUCT(w1-w0,r0)\ncheck: =SUMPRODUCT(w1,r1)-SUMPRODUCT(w0,r0)"],
    ],
  },
  deeper: [
    ["Simpson (1951), The interpretation of interaction in contingency tables, JRSS B 13(2)", "https://doi.org/10.1111/j.2517-6161.1951.tb00088.x", "the original paper on the paradox"],
    ["Bickel, Hammel & O'Connell (1975), Sex bias in graduate admissions: data from Berkeley, Science 187(4175)", "https://doi.org/10.1126/science.187.4175.398", "the famous real example of rates and mix disagreeing"],
    ["Hyndman & Koehler (2006), Another look at measures of forecast accuracy, IJF 22(4)", "https://doi.org/10.1016/j.ijforecast.2006.03.001", "why averaged percentage errors mislead"],
    ["Hyndman & Athanasopoulos, FPP3 §5.8: Evaluating point forecast accuracy", "https://otexts.com/fpp3/accuracy.html", "free textbook: scale-dependent and percentage errors"],
    ["Stanford Encyclopedia of Philosophy: Simpson's paradox", "https://plato.stanford.edu/entries/paradox-simpson/", "a careful, readable overview"],
    ["Weighted arithmetic mean — Wikipedia", "https://en.wikipedia.org/wiki/Weighted_arithmetic_mean", "the maths of weighted averages"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor" opacity=".4"><rect x="8" y="34" width="34" height="22"/><rect x="44" y="18" width="10" height="38"/><rect x="56" y="10" width="6" height="46"/><rect x="64" y="26" width="22" height="30"/></g><path d="M6 30 H90" stroke-dasharray="4 3"/><path d="M6 22 H90" opacity=".6"/></svg>`,

  mount(root) {
    const { Plot, watch, css } = Lab;
    const DEF = [
      ["Bulk flour 25kg", 60000, 18.0, 16.2, 63000],
      ["Bread mix", 20000, 6.5, 4.6, 17000],
      ["Specialty yeast", 1500, 12.0, 5.0, 2400],
      ["Gluten-free mix", 800, 15.0, 7.5, 300],
      ["Cake decorations", 300, 9.0, 3.0, 700],
      ["Sourdough starter", 150, 20.0, 6.0, 40],
    ];
    let D = DEF.map((r) => r.slice()), metric = "margin", wsel = "right";
    const M = {
      margin: { name: "Margin %", unit: "%", num: (r) => r[1] * (r[2] - r[3]), den: (r) => r[1] * r[2], denName: "revenue", fmt: (v) => (v * 100).toFixed(1) + "%", ylab: "margin % of price" },
      error: { name: "Forecast error %", unit: "%", num: (r) => Math.abs(r[4] - r[1]), den: (r) => r[1], denName: "actual units", fmt: (v) => (v * 100).toFixed(1) + "%", ylab: "absolute forecast error ÷ actual" },
      cost: { name: "Cost per unit", unit: "$", num: (r) => r[1] * r[3], den: (r) => r[1], denName: "units", fmt: (v) => "$" + v.toFixed(2), ylab: "unit cost ($)" },
    };
    const W = {
      right: ["The ratio's denominator", null],
      units: ["Units sold", (r) => r[1]],
      revenue: ["Revenue", (r) => r[1] * r[2]],
      cost: ["Cost of goods", (r) => r[1] * r[3]],
    };
    const COLS = ["--accent", "--warm", "--good", "--violet", "--bad", "--muted"];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="mk" aria-label="Each product as a bar: width is its weight, height is its ratio; horizontal lines show the three roll-ups"></canvas>
          <div class="legend"><span><i style="background:var(--ink)"></i>Bottom-up</span><span><i style="background:var(--bad)"></i>Simple average</span><span><i style="background:var(--good)"></i>Weighted average</span></div>
          <figcaption id="cap"></figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 class="ru-h">Your products (edit any number)</h4>
          <div style="overflow-x:auto"><table class="ru-t" id="ed"></table></div>
          <div class="btns" style="margin-top:10px"><button class="btn" id="reset" type="button">Reset table</button></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="ru-h">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.ru-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .ru-t{width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums}
        .ru-t th{text-align:right;padding:5px 6px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500;white-space:nowrap}
        .ru-t td{text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-family:var(--font-mono);white-space:nowrap}
        .ru-t th:first-child,.ru-t td:first-child{text-align:left;font-family:var(--font-body)}
        .ru-t input{width:86px;font:inherit;font-family:var(--font-mono);padding:3px 5px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink);text-align:right}
        .ru-t tfoot td{font-weight:600;border-top:2px solid var(--line)}</style>`,
      panel: `
        <div class="ctrl"><label>What to roll up</label>
          <div class="seg" id="metric" style="flex-wrap:wrap"><button type="button" data-v="margin" aria-pressed="true">Margin %</button><button type="button" data-v="error" aria-pressed="false">Forecast error %</button><button type="button" data-v="cost" aria-pressed="false">Cost per unit</button></div></div>
        <div class="ctrl"><label>Weights for the weighted average</label>
          <div class="seg" id="wsel" style="flex-wrap:wrap">${Object.entries(W).map(([k, [t]]) => `<button type="button" data-v="${k}" aria-pressed="${k === wsel}">${t}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="big">Scale the biggest product's volume <output id="bigV"></output></label><input type="range" id="big" min="0.1" max="3" step="0.1" value="1"></div>
        <div class="readouts" id="ro"></div>`,
      notes: `
        <section>
          <h2>The three methods</h2>
          <div class="eq">bottom-up = Σ numerator ÷ Σ denominator<br>simple average = (r₁ + r₂ + … + rₙ) ÷ n<br>weighted average = Σ wᵢ·rᵢ ÷ Σ wᵢ</div>
          <p>Because each ratio is rᵢ = numᵢ ÷ denᵢ, a weighted average with wᵢ = denᵢ gives Σ numᵢ ÷ Σ denᵢ: exactly the bottom-up figure. So 'weighted average' is only right if you weight by the denominator. Any other weight, or none, answers a different question.</p>
          <p>In the chart each product is a block: its <b>width</b> is its weight and its <b>height</b> is its ratio. The bottom-up line is the level that gives the same total area, the 'water level' if you let the blocks flatten out.</p>
        </section>
        <section>
          <h2>Which one to use</h2>
          <ul>
            <li><b>Reporting the business</b> (total margin %, overall forecast error, network cost per unit): bottom-up, or a weighted average with the denominator as the weight.</li>
            <li><b>Describing a typical product</b> ('how accurate is a typical SKU forecast?'): simple average or, better, the median, which isn't pulled by a few odd items.</li>
            <li><b>Comparing periods</b>: split the change into a <i>rate</i> effect (each product's ratio changed) and a <i>mix</i> effect (the weights changed). Mix shifts can make every product better and the total worse.</li>
          </ul>
          <p>Related: <a href="#forecast-accuracy">forecast accuracy measures</a> (MAPE vs WAPE), <a href="#cost-margin">landed cost and margin</a>, <a href="#correlation-traps">correlation traps</a> (hidden groups), <a href="#reconciliation">hierarchical reconciliation</a> (making forecasts add up).</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Margin %: the simple average says about 50%, the business actually makes about 13%. The small specialty lines look great but barely move the total.</li>
            <li>Switch the weights to Units sold: close, but not equal to bottom-up, because prices differ. Switch to Revenue: exact match.</li>
            <li>Forecast error %: the simple average (MAPE) is huge because the sourdough starter is way off on tiny volume. Bottom-up (WAPE) is modest.</li>
            <li>Shrink the biggest product's volume to 0.1×: the bottom-up figure jumps towards the small products' level. Mix alone changed the total.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const P = new Plot($("#mk"), { x: [0, 1], y: [0, 1], pad: { l: 60, b: 44 } });
    const nf = (v, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

    function buildEd() {
      $("#ed").innerHTML = `<thead><tr><th>Product</th><th>Units sold</th><th>Price $</th><th>Unit cost $</th><th>Forecast</th><th id="rh">Ratio</th><th>Weight share</th></tr></thead><tbody>` +
        D.map((r, i) => `<tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(${COLS[i]});margin-right:6px"></i>${r[0]}</td>${[1, 2, 3, 4].map((k) => `<td><input type="number" min="0" step="${k === 1 || k === 4 ? 10 : 0.1}" data-i="${i}" data-k="${k}" value="${r[k]}" aria-label="${r[0]} ${["", "units", "price", "cost", "forecast"][k]}"></td>`).join("")}<td data-r="${i}"></td><td data-w="${i}"></td></tr>`).join("") +
        `</tbody><tfoot><tr><td>Total / bottom-up</td><td id="tu"></td><td></td><td></td><td id="tf"></td><td id="tr"></td><td>100%</td></tr></tfoot>`;
    }

    function draw() {
      const big = +$("#big").value; $("#bigV").textContent = big.toFixed(1) + "×";
      const rows = D.map((r, i) => (i === 0 ? [r[0], r[1] * big, r[2], r[3], r[4] * big] : r));
      const m = M[metric];
      const num = rows.map(m.num), den = rows.map(m.den), rat = rows.map((r, i) => (den[i] > 0 ? num[i] / den[i] : 0));
      const wf = wsel === "right" ? m.den : W[wsel][1], w = rows.map(wf);
      const sN = num.reduce((a, b) => a + b, 0), sD = den.reduce((a, b) => a + b, 0), sW = w.reduce((a, b) => a + b, 0);
      const bu = sN / sD, sa = rat.reduce((a, b) => a + b, 0) / rat.length, wa = rat.reduce((a, r, i) => a + r * w[i], 0) / sW;

      // chart: x = cumulative weight share of the chosen weight, y = ratio
      const ymax = Math.max(...rat, bu, sa, wa) * 1.12 || 1;
      P.x = [0, 1]; P.y = [0, ymax];
      P.clear(); P.axes({ xLabel: `share of ${wsel === "right" ? m.denName : W[wsel][0].toLowerCase()} (block width)`, yLabel: m.ylab, xFormat: (v) => Math.round(v * 100) + "%", yFormat: (v) => (m.unit === "%" ? Math.round(v * 100) + "%" : "$" + v.toFixed(0)), xCount: 5, yCount: 5 });
      const g = P.ctx; let x = 0;
      rows.forEach((r, i) => {
        const ww = w[i] / sW; g.fillStyle = css(COLS[i]); g.globalAlpha = 0.7;
        g.fillRect(P.sx(x), P.sy(rat[i]), Math.max(1, P.sx(x + ww) - P.sx(x) - 1), P.sy(0) - P.sy(rat[i]));
        g.globalAlpha = 1; x += ww;
      });
      // small items get labels as dots at top
      x = 0; rows.forEach((r, i) => { const ww = w[i] / sW; if (P.sx(x + ww) - P.sx(x) < 6) P.dot(x + ww / 2, rat[i], 4, css(COLS[i]), css("--surface")); x += ww; });
      const line = (v, c, dash, lbl) => { P.path([0, 1], [v, v], css(c), 2.4, dash); g.fillStyle = css(c); g.font = "600 12px " + css("--font-body"); g.textAlign = "left"; const tx = lbl + " " + m.fmt(v), tw = g.measureText(tx).width; g.fillStyle = css("--surface"); g.globalAlpha = 0.85; g.fillRect(P.sx(0) + 4, P.sy(v) - 19, tw + 8, 16); g.globalAlpha = 1; g.fillStyle = css(c); g.fillText(tx, P.sx(0) + 8, P.sy(v) - 6); };
      line(sa, "--bad", [6, 4], "simple avg");
      line(bu, "--ink", null, "bottom-up");
      if (Math.abs(wa - bu) > 1e-9) line(wa, "--good", [2, 3], "weighted");
      $("#cap").textContent = `Each block is a product. Width = its share of ${wsel === "right" ? m.denName : W[wsel][0].toLowerCase()}, height = its ${m.name.toLowerCase()}. Tiny products show as dots.`;

      // table
      $("#rh").textContent = m.name;
      rows.forEach((r, i) => { root.querySelector(`[data-r="${i}"]`).textContent = m.fmt(rat[i]); root.querySelector(`[data-w="${i}"]`).textContent = ((w[i] / sW) * 100).toFixed(1) + "%"; });
      $("#tu").textContent = nf(rows.reduce((a, r) => a + r[1], 0)); $("#tf").textContent = nf(rows.reduce((a, r) => a + r[4], 0)); $("#tr").textContent = m.fmt(bu);

      const match = Math.abs(wa - bu) < 1e-9;
      $("#ro").innerHTML = `
        <div class="ro"><b>Bottom-up</b><span class="num">${m.fmt(bu)}</span></div>
        <div class="ro"><b>Simple average</b><span class="num" style="color:var(--bad)">${m.fmt(sa)}</span></div>
        <div class="ro"><b>Weighted (${W[wsel][0].toLowerCase()})</b><span class="num" style="color:var(--good)">${m.fmt(wa)}</span></div>
        <div class="ro" style="grid-column:1/-1"><b>Weighted = bottom-up?</b><span>${match ? "Yes: weights are the denominator (" + m.denName + ")" : "No: off by " + (m.unit === "%" ? (Math.abs(wa - bu) * 100).toFixed(1) + " points" : m.fmt(Math.abs(wa - bu))) + ". The right weight is " + m.denName}</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, Mu = (t) => `<span style="color:var(--muted)">${t}</span>`;
      const big2 = (v) => (Math.abs(v) >= 1000 ? nf(v) : nf(v, 2));
      const lines = [
        `numerators: ${num.map(big2).join(" + ")} = ${big2(sN)}`,
        `denominators (${m.denName}): ${den.map(big2).join(" + ")} = ${big2(sD)}`,
        `bottom-up = ${big2(sN)} ÷ ${big2(sD)} = ${B(m.fmt(bu))}`,
        `simple average = (${rat.map(m.fmt).join(" + ")}) ÷ ${rat.length} = ${B(m.fmt(sa))}`,
        `weighted by ${W[wsel][0].toLowerCase()} = Σ(w × r) ÷ Σw = ${big2(rat.reduce((a, r, i) => a + r * w[i], 0) * (m.unit === "%" ? 1 : 1))} ÷ ${big2(sW)} = ${B(m.fmt(wa))} ${Mu(match ? "(identical to bottom-up)" : "(differs from bottom-up)")}`,
      ];
      if (metric === "error") lines.push(Mu("simple average of item % errors is MAPE; bottom-up is WAPE"));
      $("#work").innerHTML = lines.map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    buildEd();
    $("#ed").addEventListener("input", (e) => { const t = e.target; if (!t.dataset.k || t.value === "") return; D[+t.dataset.i][+t.dataset.k] = Math.max(0, +t.value); draw(); });
    const seg = (id, set) => $(id).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; set(b.dataset.v); $(id).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    seg("#metric", (v) => (metric = v));
    seg("#wsel", (v) => (wsel = v));
    $("#big").addEventListener("input", draw);
    $("#reset").addEventListener("click", () => { D = DEF.map((r) => r.slice()); $("#big").value = 1; buildEd(); draw(); });
    draw();
    return watch([P.c], (resized) => { if (resized) P.resize(); draw(); });
  },
});
