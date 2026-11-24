Lab.register({
  id: "freight",
  group: "Supply chain",
  title: "Freight: full loads, part loads and how often to ship",
  blurb: "Part loads cost more per pallet; full trucks mean shipping less often and holding more stock. Find the shipping frequency that minimises freight plus inventory.",
  lede: "Freight is priced to reward volume. A full truckload (FTL) costs about the same whether it's packed or half empty; less-than-truckload (LTL) charges per pallet, with cheaper rates for bigger shipments. Shipping every day keeps stock low but sends small, expensive part loads. Shipping weekly fills trucks but builds stock. The best frequency balances freight against the cost of holding what you ship.",
  quiz: [
    ["LTL costs $80 a pallet at 13+ pallets and a full truck costs $1,400. Above how many pallets is FTL cheaper?", "1,400 ÷ 80 = 17.5. From 18 pallets up, book a full truck even if it isn't full."],
    ["Why does shipping less often increase inventory?", "Each shipment brings demand for the whole interval at once. Average cycle stock is half a shipment, so doubling the interval doubles cycle stock."],
    ["What is freight consolidation?", "Combining several smaller shipments (different products, suppliers or customers on the same lane) into fuller loads. It moves you down the per-pallet cost curve without waiting longer for any one product."],
    ["When is expediting worth it?", "When the premium per unit is less than what the shortage would cost: the lost margin, any penalty, and the risk of losing the customer. Regular expediting is usually a sign that safety stock or the forecast is wrong."],
  ],
  diy: {
    intro: "Weekly demand in units in H1, unit weight and value in H2:H3, carrying rate in H4, FTL price in H5, LTL rate per unit in H6.",
    steps: [
      ["Shipment size if you ship every n days.", "=H1*n/7"],
      ["Cost per shipment: LTL until it costs more than a full truck.", "=MIN(H5,shipment*H6)"],
      ["Yearly freight.", "=cost_per_shipment*365/n"],
      ["Cycle stock and its yearly holding cost.", "=shipment/2*H3*H4"],
      ["Total and best frequency: put n = 1 … 28 in a column and find the minimum.", "=INDEX(n_range,MATCH(MIN(total_range),total_range,0))"],
      ["Break-even shipment size where FTL beats LTL.", "=H5/H6"],
    ],
  },
  deeper: [
    ["Less-than-truckload shipping — Wikipedia", "https://en.wikipedia.org/wiki/Less-than-truckload_shipping", "how LTL is priced, and how it compares with full loads"],
    ["Economic order quantity — Wikipedia", "https://en.wikipedia.org/wiki/Economic_order_quantity", "the same trade-off for orders"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="18" width="52" height="28" rx="2" fill="currentColor" fill-opacity=".15"/><path d="M58 26 h18 l12 12 v8 h-30 Z"/><circle cx="22" cy="50" r="5"/><circle cx="72" cy="50" r="5"/><path d="M12 24 h10 v16 h-10 Z M26 24 h10 v16 h-10 Z" fill="currentColor" fill-opacity=".35"/></svg>`,

  mount(root) {
    const { Plot, watch, css } = Lab;
    const money = (v) => (v < 0 ? "−" : "") + "$" + Math.round(Math.abs(v)).toLocaleString("en-US");
    const CAP = 26;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot short">
          <canvas id="frp" aria-label="Freight cost per pallet against shipment size for LTL and FTL"></canvas>
          <div class="legend"><span><i style="background:var(--warm)"></i>LTL (part load)</span><span><i style="background:var(--violet)"></i>FTL (whole trucks)</span><span><i style="background:var(--accent)"></i>Cheaper option</span></div>
          <figcaption>Cost per pallet for one shipment. Each LTL rate break and each extra truck makes a step.</figcaption>
        </figure>
        <figure class="plot wide">
          <canvas id="frt" aria-label="Yearly freight, inventory and total cost against days between shipments"></canvas>
          <div class="legend"><span><i style="background:var(--warm)"></i>Freight / yr</span><span><i style="background:var(--violet)"></i>Holding cycle stock / yr</span><span><i style="background:var(--ink)"></i>Total</span><span><i style="background:var(--good)"></i>Cheapest</span></div>
          <figcaption>Ship more often and freight rises; ship less often and stock rises.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="dem">Demand on this lane <output id="demV"></output></label><input type="range" id="dem" min="2" max="120" step="1" value="20"></div>
        <div class="ctrl"><label for="days">Days between shipments <output id="daysV"></output></label><input type="range" id="days" min="1" max="28" step="1" value="3"></div>
        <div class="ctrl"><label for="ftl">Full truck (26 pallets) <output id="ftlV"></output></label><input type="range" id="ftl" min="400" max="4000" step="50" value="1400"></div>
        <div class="ctrl"><label for="ltl">LTL rate, 1–5 pallets <output id="ltlV"></output></label><input type="range" id="ltl" min="30" max="300" step="5" value="120"></div>
        <div class="ctrl"><label for="val">Stock value per pallet <output id="valV"></output></label><input type="range" id="val" min="200" max="20000" step="100" value="8000"></div>
        <div class="ctrl"><label for="h">Carrying cost rate <output id="hV"></output></label><input type="range" id="h" min="5" max="40" step="1" value="25"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="best" type="button">Ship at the cheapest frequency</button></div>`,
      notes: `
        <section>
          <h2>How LTL and FTL are priced</h2>
          <p>LTL here charges per pallet with rate breaks: the 1–5 pallet rate, 80% of it for 6–12, 67% for 13 and up, with a minimum charge of 1.25 pallets. FTL is a flat price per truck of 26 pallets. For any shipment, pay whichever is cheaper. Above the breakpoint, book a full truck even if it isn't full.</p>
          <div class="eq">breakpoint = FTL price ÷ LTL rate at 13+</div>
        </section>
        <section>
          <h2>Frequency vs stock</h2>
          <div class="eq">shipment = weekly demand × days ÷ 7<br>freight / yr = cost per shipment × 365 ÷ days<br>cycle stock = shipment ÷ 2<br>holding / yr = cycle stock × value × carrying rate</div>
          <p>This is the <a href="#reorder-point">EOQ</a> trade-off, with the freight tariff playing the part of the ordering cost. Because the tariff has steps, the total curve is bumpy: a shipment just over a truck size is expensive.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Slide the days from 1 to 28 and watch the per-pallet dot move along the top chart.</li>
            <li>Raise the stock value to $18,000 a pallet (electronics, pharma). Frequent part loads now win.</li>
            <li>Drop demand to 4 pallets a week. Full trucks are out of reach, so the choice is between LTL rate breaks.</li>
            <li>Find a frequency where a shipment needs 27 pallets. One pallet too many costs a second truck.</li>
          </ol>
          <p>Related: <a href="#carrying-cost">carrying cost</a>, <a href="#cost-to-serve">cost to serve</a>, <a href="#network-design">network design</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pP = new Plot($("#frp"), { x: [0, 80], pad: { l: 56 } });
    const pT = new Plot($("#frt"), { x: [1, 28], pad: { l: 64 } });

    function ship(q, T) {
      if (q <= 0) return { cost: 0, mode: "—", trucks: 0 };
      const r = q <= 5 ? T.ltl : q <= 12 ? T.ltl * 0.8 : T.ltl * 0.67;
      const ltl = Math.max(q, 1.25) * r;
      const full = Math.floor(q / CAP), rest = q - full * CAP;
      const restCost = rest > 0 ? Math.min(T.ftl, Math.max(rest, 1.25) * (rest <= 5 ? T.ltl : rest <= 12 ? T.ltl * 0.8 : T.ltl * 0.67)) : 0;
      const mixed = full * T.ftl + restCost; // full trucks + cheapest way to move the rest
      return ltl <= mixed ? { cost: ltl, mode: "LTL", rate: r, trucks: 0 } : { cost: mixed, mode: rest > 0 && restCost < T.ftl ? `${full} FTL + LTL` : `${Math.ceil(q / CAP)} FTL`, trucks: Math.ceil(q / CAP) };
    }

    function annual(days, T) {
      const q = (T.dem * days) / 7, s = ship(q, T), n = 365 / days;
      const fr = s.cost * n, hold = (q / 2) * T.val * T.h;
      return { q, s, fr, hold, tot: fr + hold, n };
    }

    function draw() {
      const T = { dem: +$("#dem").value, ftl: +$("#ftl").value, ltl: +$("#ltl").value, val: +$("#val").value, h: +$("#h").value / 100 };
      const days = +$("#days").value;
      $("#demV").textContent = T.dem + " pallets/wk"; $("#daysV").textContent = days; $("#ftlV").textContent = "$" + T.ftl.toLocaleString(); $("#ltlV").textContent = "$" + T.ltl + "/pallet";
      $("#valV").textContent = "$" + T.val.toLocaleString(); $("#hV").textContent = Math.round(T.h * 100) + "%";

      const qs = Array.from({ length: 321 }, (_, i) => 0.25 + i * 0.25);
      pP.y = [0, T.ltl * 1.6];
      pP.clear(); pP.axes({ xLabel: "pallets in one shipment", yLabel: "$ per pallet", yCount: 4 });
      const rl = (q) => Math.max(q, 1.25) * (q <= 5 ? T.ltl : q <= 12 ? T.ltl * 0.8 : T.ltl * 0.67) / q;
      pP.path(qs, qs.map(rl), css("--warm"), 1.6, [4, 3]);
      pP.path(qs.filter((q) => q >= 4), qs.filter((q) => q >= 4).map((q) => (Math.ceil(q / CAP) * T.ftl) / q), css("--violet"), 1.6, [4, 3]);
      pP.path(qs, qs.map((q) => ship(q, T).cost / q), css("--accent"), 2.4);
      const cur = annual(days, T);
      if (cur.q <= 80) pP.dot(cur.q, cur.s.cost / cur.q, 6, css("--ink"), css("--surface"));

      const ds = Array.from({ length: 28 }, (_, i) => i + 1), all = ds.map((d) => annual(d, T));
      const best = all.reduce((a, b) => (b.tot < a.tot ? b : a)), bestD = ds[all.indexOf(best)];
      pT.y = [0, Math.max(...all.map((a) => a.tot)) * 1.08];
      pT.clear(); pT.axes({ xLabel: "days between shipments", xTicks: [1, 7, 14, 21, 28], yLabel: "cost per year", yFormat: (v) => "$" + (v >= 1000 ? Math.round(v / 1000) + "k" : v), yCount: 4 });
      pT.path(ds, all.map((a) => a.fr), css("--warm"), 2);
      pT.path(ds, all.map((a) => a.hold), css("--violet"), 2);
      pT.path(ds, all.map((a) => a.tot), css("--ink"), 2.6);
      pT.dot(bestD, best.tot, 6, css("--good"), css("--surface"));
      pT.dot(days, cur.tot, 5, css("--ink"), css("--surface"));

      const bp = T.ftl / (T.ltl * 0.67);
      $("#ro").innerHTML = `
        <div class="ro"><b>Pallets per shipment</b><span class="num">${cur.q.toFixed(1)}</span></div>
        <div class="ro"><b>Mode</b><span class="num">${cur.s.mode}</span></div>
        <div class="ro"><b>FTL breakpoint</b><span class="num">${bp.toFixed(1)} pallets</span></div>
        <div class="ro"><b>Total cost / yr</b><span class="num">${money(cur.tot)}</span></div>
        <div class="ro"><b>Cheapest</b><span class="pill ok">every ${bestD} day${bestD > 1 ? "s" : ""}: ${money(best.tot)}</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      $("#work").innerHTML = [
        `shipment = ${T.dem} × ${days} ÷ 7 = ${B(cur.q.toFixed(1))} pallets`,
        cur.s.mode === "LTL" ? `LTL at $${cur.s.rate.toFixed(2)}/pallet × ${Math.max(cur.q, 1.25).toFixed(1)} = ${B(money(cur.s.cost))} ${M(`(per pallet ${money(cur.s.cost / cur.q)})`)}` : `${cur.s.mode}: ${B(money(cur.s.cost))} ${M(`(per pallet ${money(cur.s.cost / cur.q)})`)}`,
        `freight / yr = ${money(cur.s.cost)} × 365 ÷ ${days} = ${B(money(cur.fr))}`,
        `holding / yr = ${cur.q.toFixed(1)} ÷ 2 × $${T.val.toLocaleString()} × ${Math.round(T.h * 100)}% = ${B(money(cur.hold))}`,
        `total = ${B(money(cur.tot))} ${M(`(cheapest: every ${bestD} days, ${money(best.tot)})`)}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    ["#dem", "#days", "#ftl", "#ltl", "#val", "#h"].forEach((s) => $(s).addEventListener("input", draw));
    $("#best").addEventListener("click", () => {
      const T = { dem: +$("#dem").value, ftl: +$("#ftl").value, ltl: +$("#ltl").value, val: +$("#val").value, h: +$("#h").value / 100 };
      let bd = 1, bt = Infinity; for (let d = 1; d <= 28; d++) { const a = annual(d, T); if (a.tot < bt) { bt = a.tot; bd = d; } }
      $("#days").value = bd; draw();
    });
    draw();
    return watch([pP.c, pT.c], (resized) => { if (resized) { pP.resize(); pT.resize(); } draw(); });
  },
});
