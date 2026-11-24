Lab.register({
  id: "service-level-cost",
  group: "Supply chain",
  title: "Service level vs inventory cost",
  blurb: "Each extra point of service costs more stock than the last. See the curve, the difference between cycle service and fill rate, and where the cheapest service level sits.",
  lede: "Going from 90% to 95% service is cheap. Going from 99% to 99.9% is expensive. Safety stock grows with z, and z shoots up as you approach 100%. Whether the extra stock is worth it depends on what a shortage costs you, and on which kind of service you mean.",
  quiz: [
    ["Lead-time demand has SD 100. How much safety stock is needed for 90%, 95%, 99% and 99.9% cycle service?", "z × 100: 128, 164, 233 and 309. The last 0.9 points cost 76 units, more than the whole jump from 90% to 95%."],
    ["With 95% cycle service, why is the fill rate often 99% or more?", "Cycle service counts cycles with any shortage. In a cycle that does run short, usually only a few units are missed at the end, out of a whole order quantity. Fill rate counts units, so it's much higher."],
    ["Holding a unit costs $5 a year, a lost sale costs $50, you order 20 times a year. What cycle service level minimizes cost?", "Stockout probability per cycle = h × Q / (p × D) = h / (p × orders per year) = 5 / (50 × 20) = 0.5%, so 99.5% cycle service."],
    ["Why might a business choose a service level below the cost-optimal one?", "Cash or space limits, short shelf life, or because the shortage cost is overstated (customers wait or substitute). The optimum is only as good as the shortage cost you put in."],
  ],
  deeper: [
    ["Service level — Wikipedia", "https://en.wikipedia.org/wiki/Service_level", "alpha (cycle) and beta (fill rate) service"],
    ["Safety stock — Wikipedia", "https://en.wikipedia.org/wiki/Safety_stock", "formulas for each service definition"],
    ["Newsvendor model — Wikipedia", "https://en.wikipedia.org/wiki/Newsvendor_model", "the same cost trade-off for a single period"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 56 L40 50 L60 42 L74 30 L84 14 L88 4"/><path d="M4 20 Q40 60 92 40" stroke-dasharray="4 3" opacity=".6"/><circle cx="64" cy="42" r="3.5" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, watch, fmt, css, qnorm, pnorm, gloss } = Lab;
    const LEVELS = [80, 90, 95, 97.5, 99, 99.5, 99.9];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="scc" aria-label="Yearly cost against cycle service level"></canvas>
          <div class="legend"><span><i style="background:var(--warm)"></i>Holding cost of safety stock</span><span><i style="background:var(--violet)"></i>Shortage cost</span><span><i style="background:var(--ink)"></i>Total</span><span><i style="background:var(--accent)"></i>Your target</span></div>
          <figcaption id="ccap"></figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="scf" aria-label="Fill rate against cycle service level"></canvas>
          <figcaption>Fill rate (share of units served from stock) against cycle service level (share of cycles with no shortage). The dashed line is where they'd be equal.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">The cost of each step up</h4>
          <div style="overflow-x:auto"><table id="tab" style="width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono)"></table></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="tg">Target cycle service level <output id="tgV"></output></label><input type="range" id="tg" min="50" max="99.9" step="0.1" value="95"></div>
        <div>
          <h4>Item</h4>
          <div class="ctrl"><label for="sd">SD of lead-time demand <output id="sdV"></output></label><input type="range" id="sd" min="10" max="500" step="10" value="100"></div>
          <div class="ctrl"><label for="D">Yearly demand <output id="DV"></output></label><input type="range" id="D" min="1000" max="50000" step="1000" value="10000"></div>
          <div class="ctrl"><label for="Q">Order quantity <output id="QV"></output></label><input type="range" id="Q" min="100" max="5000" step="50" value="500"></div>
        </div>
        <div>
          <h4>Costs</h4>
          <div class="ctrl"><label for="h">Holding cost per unit per year <output id="hV"></output></label><input type="range" id="h" min="0.5" max="30" step="0.5" value="5"></div>
          <div class="ctrl"><label for="p">Cost of each unit short <output id="pV"></output></label><input type="range" id="p" min="1" max="200" step="1" value="40"></div>
        </div>
        <div class="readouts" id="ro"></div>`,
      notes: `
        <section>
          <h2>The formulas</h2>
          <div class="eq">safety stock = z × σ<sub>LT</sub><br>units short per cycle = σ<sub>LT</sub> × G(z)<br>fill rate = 1 − σ<sub>LT</sub> × G(z) / Q</div>
          <p>G(z) is the <b>normal loss function</b>: the expected amount by which a standard normal value exceeds z. It shrinks fast as z grows.</p>
          <div class="eq">yearly cost = h × z × σ<sub>LT</sub> + p × (D / Q) × σ<sub>LT</sub> × G(z)</div>
          <p>Setting the slope to zero gives the cost-optimal stockout chance per cycle:</p>
          <div class="eq">1 − CSL* = h × Q / (p × D)</div>
        </section>
        <section>
          <h2>Two definitions of service</h2>
          <ul>
            <li><b>Cycle service level (CSL, α):</b> chance a replenishment cycle has no stockout. Easy to compute; ignores how big the shortage is.</li>
            <li><b>Fill rate (β):</b> share of demand served from stock. What customers feel; depends on Q as well as safety stock.</li>
          </ul>
          <p>With big orders (large Q), a 90% CSL can still give a 99% fill rate. Setting safety stock for a fill-rate target with the CSL formula overstocks; doing the reverse understocks.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Move the target from 95% to 99.9% and watch the holding cost climb steeply at the right edge.</li>
            <li>Raise the shortage cost to 200. The cost-optimal service level moves right.</li>
            <li>Raise Q to 5,000. The fill rate stays high even at low CSL, because each cycle is long.</li>
            <li>In the table, read "extra per point": each extra percentage point of service costs more stock than the one before, about 4 units per point near 85% but over 100 per point near 99.7%.</li>
          </ol>
          <p>See this in a running simulation on <a href="#reorder-point">reorder point and EOQ</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    // x axes are drawn in z units (so safety stock is a straight line) and labelled with service levels
    const ZMAX = qnorm(0.999), TICKS = [50, 80, 90, 95, 98, 99, 99.5, 99.9], zt = TICKS.map((c) => qnorm(c / 100));
    const lab = (z) => { const i = zt.findIndex((v) => Math.abs(v - z) < 1e-6); return i >= 0 ? TICKS[i] + "%" : ""; };
    const pC = new Plot($("#scc"), { x: [0, ZMAX], pad: { l: 56 } });
    const pF = new Plot($("#scf"), { x: [0, ZMAX], y: [50, 100], pad: { l: 56 } });

    function draw() {
      const tg = +$("#tg").value, sd = +$("#sd").value, D = +$("#D").value, Q = +$("#Q").value, h = +$("#h").value, p = +$("#p").value;
      $("#tgV").textContent = tg.toFixed(1) + "%"; $("#sdV").textContent = sd; $("#DV").textContent = D.toLocaleString("en-US");
      $("#QV").textContent = Q.toLocaleString("en-US"); $("#hV").textContent = "$" + h; $("#pV").textContent = "$" + p;
      const cyc = D / Q;
      const at = (csl) => { const z = qnorm(csl / 100), ss = Math.max(0, z * sd), short = sd * gloss(z); return { z, ss, hold: h * ss, shortC: p * cyc * short, fill: Math.max(0, 1 - short / Q), short }; };
      const opt = Math.min(99.95, Math.max(50, (1 - (h * Q) / (p * D)) * 100));
      const xs = []; for (let z = 0; z <= ZMAX + 1e-9; z += 0.01) xs.push(z);
      const rows = xs.map((z) => at(pnorm(z) * 100)), T = at(tg), O = at(opt);
      const zx = (c) => qnorm(c / 100);
      const cap = Math.max(T.hold + T.shortC, O.hold + O.shortC) * 2.2;
      pC.y = [0, cap];
      pC.clear();
      pC.axes({ xTicks: zt, xFormat: lab, xLabel: "cycle service level (spaced by z)", yLabel: "$ per year", yFormat: (v) => (v >= 1000 ? "$" + v / 1000 + "k" : "$" + v) });
      pC.path(xs, rows.map((r) => r.hold), css("--warm"), 2.2);
      pC.path(xs, rows.map((r) => r.shortC), css("--violet"), 2.2);
      pC.path(xs, rows.map((r) => r.hold + r.shortC), css("--ink"), 2.8);
      pC.path([zx(tg), zx(tg)], [0, cap], css("--accent"), 1.5, [5, 4]);
      pC.dot(zx(tg), T.hold + T.shortC, 6, css("--accent"), css("--surface"));
      pC.dot(zx(opt), O.hold + O.shortC, 5, css("--surface"), css("--ink"));
      $("#ccap").innerHTML = `Yearly cost against target. The horizontal axis is stretched toward 100% (spaced by z), so safety-stock cost is a straight line. The open circle marks the cheapest level, <b>${opt.toFixed(1)}%</b>, where 1 − CSL = h × Q / (p × D) = ${h} × ${Q} / (${p} × ${D.toLocaleString("en-US")}) = ${((h * Q) / (p * D) * 100).toFixed(2)}%.`;

      pF.y = [Math.max(50, Math.floor(rows[0].fill * 100 / 5) * 5 - 5), 100];
      pF.clear();
      pF.axes({ xTicks: zt, xFormat: lab, yFormat: (v) => v + "%", xLabel: "cycle service level", yLabel: "fill rate", yCount: 4 });
      pF.path(xs, xs.map((z) => pnorm(z) * 100), css("--muted"), 1, [4, 4]);
      pF.path(xs, rows.map((r) => r.fill * 100), css("--accent"), 2.5);
      pF.dot(zx(tg), T.fill * 100, 6, css("--accent"), css("--surface"));

      $("#ro").innerHTML = `
        <div class="ro"><b>z</b><span class="num">${T.z.toFixed(3)}</span></div>
        <div class="ro"><b>Safety stock</b><span class="num">${fmt(T.ss, 0)} units</span></div>
        <div class="ro"><b>Fill rate</b><span class="num">${(T.fill * 100).toFixed(2)}%</span></div>
        <div class="ro"><b>Yearly cost</b><span class="num">$${Math.round(T.hold + T.shortC).toLocaleString("en-US")}</span></div>
        <div class="ro"><b>Cheapest level</b><span class="pill ok">${opt.toFixed(1)}%</span></div>
        <div class="ro"><b>Extra cost vs cheapest</b><span class="num">$${Math.round(T.hold + T.shortC - O.hold - O.shortC).toLocaleString("en-US")}</span></div>`;

      const hd = (t) => `<th style="text-align:right;padding:5px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted);font-family:var(--font-body)">${t}</th>`;
      const td = (t, x = "") => `<td style="text-align:right;padding:5px 6px;border-bottom:1px solid var(--grid);${x}">${t}</td>`;
      $("#tab").innerHTML = `<tr>${hd("cycle service")}${hd("z")}${hd("safety stock")}${hd("extra stock for this step")}${hd("extra per point")}${hd("holding cost")}${hd("fill rate")}${hd("units short / year")}</tr>` +
        LEVELS.map((c, i) => { const r = at(c), prev = i ? at(LEVELS[i - 1]) : null; return `<tr>${td(c + "%", "font-weight:600")}${td(r.z.toFixed(3))}${td(fmt(r.ss, 0))}${td(prev ? "+" + fmt(r.ss - prev.ss, 0) : "–", prev ? "color:var(--warm)" : "")}${td(prev ? "+" + fmt((r.ss - prev.ss) / (c - LEVELS[i - 1]), 1) : "–", prev ? "color:var(--warm);font-weight:600" : "")}${td("$" + Math.round(r.hold).toLocaleString("en-US"))}${td((r.fill * 100).toFixed(2) + "%")}${td(fmt(cyc * r.short, 0))}</tr>`; }).join("");
    }

    ["#tg", "#sd", "#D", "#Q", "#h", "#p"].forEach((s) => $(s).addEventListener("input", draw));
    draw();
    return watch([pC.c, pF.c], (resized) => { if (resized) { pC.resize(); pF.resize(); } draw(); });
  },
});
