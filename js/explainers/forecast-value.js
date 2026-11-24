Lab.register({
  id: "forecast-value",
  group: "Supply chain",
  title: "What a better forecast is worth",
  blurb: "Turn forecast error into dollars: safety stock, carrying cost, lost sales and expediting. See what a few points of accuracy are really worth.",
  lede: "Forecast error is what safety stock protects against. Cut the error and you can either hold less stock for the same service, or hold the same stock and run out less often. Either way it shows up as money: less carrying cost, fewer lost sales, fewer emergency shipments. This page follows one item from its forecast error to its yearly cost, so you can put a dollar figure on an accuracy improvement.",
  quiz: [
    ["Forecast error (as SD) falls by 20%. At the same service level, how much does safety stock fall?", "Also 20%. Safety stock = z × σ × √(lead time + review), which is proportional to σ. Halve the error, halve the safety stock."],
    ["Why convert MAPE or MAE to a standard deviation first?", "Safety stock formulas use the SD of the error. For roughly normal errors, SD ≈ 1.25 × MAE. Using MAE directly would understate the buffer by about 20%."],
    ["The improvement could go into lower stock or into higher service. How do you choose?", "Compare the carrying cost per unit of safety stock with the margin lost per stockout. High-margin items with expensive stockouts should take it as service; cheap, slow, perishable items as lower stock."],
    ["Does a biased forecast need more safety stock?", "Bias is a different problem. Over-forecasting builds excess stock on average; under-forecasting runs it down and causes stockouts. Fix bias by correcting the forecast, not by adding buffer: safety stock is sized for random error around an unbiased forecast."],
  ],
  deeper: [
    ["FPP3: Evaluating point forecast accuracy", "https://otexts.com/fpp3/accuracy.html", "MAE, RMSE, MAPE and how they relate"],
    ["Safety stock — Wikipedia", "https://en.wikipedia.org/wiki/Safety_stock", "the formula and its assumptions"],
    ["Service level — Wikipedia", "https://en.wikipedia.org/wiki/Service_level", "cycle service level vs fill rate"],
    ["Hyndman (2006) — Another look at forecast-accuracy metrics", "https://robjhyndman.com/papers/foresight.pdf", "why MAPE misleads and scaled errors help"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 50 C 26 50, 30 14, 48 14 C 66 14, 70 50, 90 50" opacity=".45"/><path d="M18 50 C 34 50, 38 30, 48 30 C 58 30, 62 50, 78 50"/><path d="M48 8 v48" stroke-dasharray="3 3" opacity=".5"/><text x="70" y="22" font-size="16" fill="currentColor" stroke="none">$</text></svg>`,

  mount(root) {
    const { Plot, watch, css, qnorm, gloss } = Lab;
    const money = (v) => (v < 0 ? "−" : "") + "$" + Math.round(Math.abs(v)).toLocaleString("en-US");
    let mode = "stock";

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="fvc" aria-label="Yearly cost of forecast error against forecast error, split into carrying, lost margin and expediting"></canvas>
          <div class="legend"><span><i style="background:var(--violet)"></i>Carrying cost of safety stock</span><span><i style="background:var(--warm)"></i>Expediting</span><span><i style="background:var(--bad)"></i>Lost margin</span><span><i style="background:var(--ink)"></i>Total</span></div>
          <figcaption>Yearly cost for this item against forecast error, holding the service level fixed. The lines are straight because, at a fixed z, every cost is proportional to the error SD. Dots: today and the improved forecast.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Today vs improved forecast</h4>
          <div style="overflow-x:auto"><table id="cmp" style="width:100%;border-collapse:collapse;font-size:.86rem;font-variant-numeric:tabular-nums"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="e0">Forecast error today (MAE % of demand) <output id="e0V"></output></label><input type="range" id="e0" min="5" max="80" step="1" value="40"></div>
        <div class="ctrl"><label for="e1">Improved forecast error <output id="e1V"></output></label><input type="range" id="e1" min="5" max="80" step="1" value="32"></div>
        <div class="ctrl"><label>Use the improvement for</label>
          <div class="seg" id="mode"><button type="button" data-v="stock" aria-pressed="true">Less stock</button><button type="button" data-v="service" aria-pressed="false">Better service</button></div></div>
        <div class="ctrl"><label for="mu">Weekly demand (units) <output id="muV"></output></label><input type="range" id="mu" min="10" max="2000" step="10" value="500"></div>
        <div class="ctrl"><label for="L">Lead time + review period <output id="LV"></output></label><input type="range" id="L" min="1" max="12" step="1" value="4"></div>
        <div class="ctrl"><label for="sl">Cycle service level <output id="slV"></output></label><input type="range" id="sl" min="80" max="99.5" step="0.5" value="95"></div>
        <div class="ctrl"><label for="cost">Unit cost / price <output id="costV"></output></label><input type="range" id="cost" min="1" max="100" step="1" value="12"></div>
        <div class="ctrl"><label for="mgn">Gross margin % <output id="mgnV"></output></label><input type="range" id="mgn" min="5" max="80" step="1" value="40"></div>
        <div class="ctrl"><label for="carry">Carrying cost rate / yr <output id="carryV"></output></label><input type="range" id="carry" min="5" max="40" step="1" value="25"></div>
        <div class="ctrl"><label for="exp">Shortfalls rescued by expediting <output id="expV"></output></label><input type="range" id="exp" min="0" max="100" step="5" value="50"></div>
        <div class="ctrl"><label for="prem">Expedite premium per unit <output id="premV"></output></label><input type="range" id="prem" min="0" max="20" step="0.5" value="3"></div>
        <div class="readouts" id="ro"></div>`,
      notes: `
        <section>
          <h2>From error to safety stock</h2>
          <p>Forecast accuracy is usually reported as MAE or MAPE, but safety stock needs the <b>standard deviation</b> of the error. For roughly normal errors:</p>
          <div class="eq">σ ≈ 1.25 × MAE<br>SS = z × σ × √(L + R)</div>
          <p>L + R is the lead time plus the review period: how far ahead the order has to cover. Safety stock is proportional to σ, so every percent off the error is a percent off the buffer.</p>
        </section>
        <section>
          <h2>From safety stock to shortfalls</h2>
          <p>Even with safety stock, demand sometimes beats the cover. The expected shortfall per order cycle uses the <b>normal loss function</b> G(z):</p>
          <div class="eq">short per cycle = σ√(L+R) × G(z)<br>G(z) = φ(z) − z(1 − Φ(z))</div>
          <p>Here a share of each shortfall is rescued by expediting (paid at a premium). The rest is lost, costing its gross margin.</p>
        </section>
        <section>
          <h2>Two ways to take the gain</h2>
          <ul>
            <li><b>Less stock:</b> keep z fixed. Safety stock and shortfalls both shrink in proportion to σ.</li>
            <li><b>Better service:</b> keep the same safety stock. z rises to old SS ÷ new σ√(L+R), and shortfalls fall much faster than proportionally.</li>
          </ul>
          <p>Freeing safety stock also releases cash once (see <a href="#cost-margin">landed cost and margin</a>), on top of the yearly saving.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Cut error from 40% to 32%: a typical "8 points" improvement. Read the saving per year for this one item, then multiply by your number of similar items.</li>
            <li>Switch to "Better service". Lost margin falls far more, but carrying cost stays the same.</li>
            <li>Raise the margin to 70%. Stockouts now cost more than stock, so "Better service" pays off more.</li>
            <li>Lower the service level to 85%. Safety stock is cheaper, but lost margin dominates. Error costs you either way.</li>
          </ol>
          <p>Related: <a href="#forecast-accuracy">forecast accuracy measures</a>, <a href="#service-level-cost">service level vs cost</a>, <a href="#lead-time-error">lead-time forecast error</a>, <a href="#forecast-value-added">forecast value added</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pC = new Plot($("#fvc"), { x: [0, 80], pad: { l: 70 } });

    function calc(e, p, zFixed) {
      const sigma = 1.25 * (e / 100) * p.mu, s = sigma * Math.sqrt(p.L);
      const z = zFixed !== undefined ? zFixed : p.z;
      const ss = z * s, carryC = ss * p.cost * p.carry / 100;
      const cycles = 52 / p.R; // order cycles per year (review period R weeks)
      const shortPerCycle = s * gloss(z), shortYr = shortPerCycle * cycles;
      const expC = shortYr * p.exp / 100 * p.prem, lostC = shortYr * (1 - p.exp / 100) * p.cost * p.mgn / (100 - p.mgn);
      const fill = 1 - shortYr / (p.mu * 52);
      return { sigma, s, z, ss, carryC, shortYr, expC, lostC, total: carryC + expC + lostC, fill };
    }

    function draw() {
      const p = { mu: +$("#mu").value, L: +$("#L").value, R: 1, sl: +$("#sl").value / 100, cost: +$("#cost").value, mgn: +$("#mgn").value, carry: +$("#carry").value, exp: +$("#exp").value, prem: +$("#prem").value };
      p.z = qnorm(p.sl);
      const e0 = +$("#e0").value, e1 = +$("#e1").value;
      $("#e0V").textContent = e0 + "%"; $("#e1V").textContent = e1 + "%" + (e1 < e0 ? ` (−${e0 - e1} pts)` : "");
      $("#muV").textContent = p.mu; $("#LV").textContent = p.L + " wk"; $("#slV").textContent = $("#sl").value + "%";
      $("#costV").textContent = "$" + p.cost + " / $" + (p.cost / (1 - p.mgn / 100)).toFixed(2); $("#mgnV").textContent = p.mgn + "%";
      $("#carryV").textContent = p.carry + "%"; $("#expV").textContent = p.exp + "%"; $("#premV").textContent = "$" + p.prem.toFixed(2);

      const A = calc(e0, p);
      const B = mode === "stock" ? calc(e1, p) : calc(e1, p, A.ss / (1.25 * (e1 / 100) * p.mu * Math.sqrt(p.L)));

      // curve: cost vs error at fixed z
      const es = Array.from({ length: 76 }, (_, i) => 5 + i), cs = es.map((e) => calc(e, p));
      const top = Math.max(...cs.map((c) => c.total), A.total, B.total) * 1.08;
      pC.y = [0, top];
      pC.clear(); pC.axes({ xLabel: "forecast error (MAE as % of demand)", yLabel: "yearly cost", xFormat: (v) => v + "%", yFormat: (v) => "$" + (v >= 1000 ? Math.round(v / 1000) + "k" : v), yCount: 4 });
      pC.path(es, cs.map((c) => c.carryC), css("--violet"), 2);
      pC.path(es, cs.map((c) => c.expC), css("--warm"), 2);
      pC.path(es, cs.map((c) => c.lostC), css("--bad"), 2);
      pC.path(es, cs.map((c) => c.total), css("--ink"), 2.6);
      pC.dot(e0, A.total, 6, css("--muted"), css("--surface"));
      pC.dot(e1, B.total, 6, css("--accent"), css("--surface"));

      const rows = [["Error SD per week (σ)", A.sigma, B.sigma, 0, ""], ["Safety stock (units)", A.ss, B.ss, 0, ""], ["Safety stock value", A.ss * p.cost, B.ss * p.cost, 0, "$"], ["z (service factor)", A.z, B.z, 2, ""],
        ["Units short per year", A.shortYr, B.shortYr, 0, ""], ["Fill rate", A.fill * 100, B.fill * 100, 2, "%"],
        ["Carrying cost / yr", A.carryC, B.carryC, 0, "$"], ["Expediting / yr", A.expC, B.expC, 0, "$"], ["Lost margin / yr", A.lostC, B.lostC, 0, "$"], ["Total cost / yr", A.total, B.total, 0, "$"]];
      const f = (v, d, u) => u === "$" ? money(v) : u === "%" ? v.toFixed(d) + "%" : Math.round(v * 10 ** d) / 10 ** d;
      const th = (t, r) => `<th style="text-align:${r ? "right" : "left"};padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500">${t}</th>`;
      $("#cmp").innerHTML = `<tr>${th("")}${th(`Today (${e0}%)`, 1)}${th(`Improved (${e1}%)`, 1)}${th("Change", 1)}</tr>` + rows.map(([l, a, b, d, u], i) => {
        const ch = b - a, good = l === "Fill rate" || l.startsWith("z") ? ch > 0 : ch < 0;
        return `<tr style="${i === rows.length - 1 ? "font-weight:600" : ""}"><td style="padding:5px 8px;border-bottom:1px solid var(--line)">${l}</td><td style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono)">${f(a, d, u)}</td><td style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono)">${f(b, d, u)}</td><td style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono);color:${Math.abs(ch) < 1e-9 ? "var(--muted)" : good ? "var(--good)" : "var(--bad)"}">${ch > 0 ? "+" : ""}${f(ch, d, u)}</td></tr>`;
      }).join("");

      const save = A.total - B.total, cash = (A.ss - B.ss) * p.cost;
      $("#ro").innerHTML = `
        <div class="ro"><b>Saving per year</b><span class="pill ${save > 0.5 ? "ok" : "idle"}">${money(save)}</span></div>
        <div class="ro"><b>Cash released once</b><span class="num">${money(cash)}</span></div>
        <div class="ro"><b>Per point of error</b><span class="num">${e0 !== e1 ? money(save / (e0 - e1)) : "—"}</span></div>`;

      const Bo = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      $("#work").innerHTML = [
        `σ = 1.25 × ${e0}% × ${p.mu} = ${Bo(A.sigma.toFixed(1))} units/week ${M(`(improved: ${B.sigma.toFixed(1)})`)}`,
        `cover σ = ${A.sigma.toFixed(1)} × √${p.L} = ${A.s.toFixed(1)}; z for ${(p.sl * 100).toFixed(1)}% = ${p.z.toFixed(3)}`,
        `SS = ${p.z.toFixed(3)} × ${A.s.toFixed(1)} = ${Bo(Math.round(A.ss))} units × $${p.cost} × ${p.carry}% = ${Bo(money(A.carryC))}/yr`,
        `G(${A.z.toFixed(2)}) = ${gloss(A.z).toFixed(4)} → short ${A.s.toFixed(1)} × ${gloss(A.z).toFixed(4)} × 52 cycles = ${Bo(Math.round(A.shortYr))} units/yr`,
        `expedited ${p.exp}% × $${p.prem} = ${money(A.expC)}; lost ${100 - p.exp}% × margin $${(p.cost * p.mgn / (100 - p.mgn)).toFixed(2)} = ${money(A.lostC)}`,
        mode === "service" ? `better service: keep SS ${Math.round(A.ss)} → z = ${Math.round(A.ss)} ÷ ${B.s.toFixed(1)} = ${Bo(B.z.toFixed(3))}, G = ${gloss(B.z).toFixed(4)}` : `less stock: keep z = ${p.z.toFixed(3)} → SS = ${p.z.toFixed(3)} × ${B.s.toFixed(1)} = ${Bo(Math.round(B.ss))}`,
        `total ${money(A.total)} → ${money(B.total)}: ${Bo(money(save) + " saved per year")}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    ["#e0", "#e1", "#mu", "#L", "#sl", "#cost", "#mgn", "#carry", "#exp", "#prem"].forEach((s) => $(s).addEventListener("input", draw));
    $("#mode").addEventListener("click", (e) => { const v = e.target.closest("button")?.dataset.v; if (!v) return; mode = v; $("#mode").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === v)); draw(); });
    draw();
    return watch([pC.c], (resized) => { if (resized) pC.resize(); draw(); });
  },
});
