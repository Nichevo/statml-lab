Lab.register({
  id: "cost-to-serve",
  group: "Supply chain",
  title: "Cost to serve and the whale curve",
  blurb: "Two customers with the same sales and margin can earn you very different profit. Charge each one for the orders, picks, drops, returns and credit it uses.",
  lede: "Gross margin treats every dollar of sales the same. But one customer orders a full pallet once a week, pays in 30 days and never returns anything, while another orders a few cartons daily, wants deliveries to a remote site, sends back 8% and pays in 90 days. Cost to serve uses activity-based costing to charge each customer for the work it causes. Sorting customers by the profit left over gives the whale curve: often the top customers earn more than 100% of profit, and the tail gives some of it back.",
  quiz: [
    ["What does it mean when the whale curve peaks at 140%?", "The profitable customers together earn 140% of the company's total profit. The rest lose 40% of it, bringing the total down to 100%."],
    ["A customer has a high gross margin but is unprofitable after cost to serve. What are typical causes?", "Many small orders (order and pick costs per dollar are high), frequent or remote deliveries, high returns, long payment terms, or special services like labelling and rush orders."],
    ["Should you drop unprofitable customers?", "Usually not first. Fixed costs they absorb would move to others. Change how you serve them: minimum order sizes, delivery days, a charge for rush orders, better terms, or a cheaper channel. Drop only if that fails."],
    ["Why charge credit (receivable days) as a cost?", "Unpaid invoices tie up cash just like stock. 90 days of a customer's revenue at a 10% cost of capital is a real cost, often bigger than people expect."],
  ],
  diy: {
    intro: "One row per customer: revenue B, gross margin % C, orders D, lines per order E, deliveries F, km G, returns % H.",
    steps: [
      ["Order handling cost.", "I2: =D2*rate_per_order"],
      ["Picking cost.", "J2: =D2*E2*rate_per_line"],
      ["Delivery cost (round trip).", "K2: =F2*(rate_per_drop+2*G2*rate_per_km)"],
      ["Returns and credit cost.", "L2: =B2*H2*cost_per_return_$\nM2: =B2*credit_days/365*cost_of_capital"],
      ["Cost to serve and customer profit.", "N2: =SUM(I2:M2)\nO2: =B2*C2-N2"],
      ["Whale curve: sort by profit descending, then the running total as a % of total profit.", "P2: =SUM($O$2:O2)/SUM($O$2:$O$201)"],
    ],
  },
  deeper: [
    ["Activity-based costing — Wikipedia", "https://en.wikipedia.org/wiki/Activity-based_costing", "assigning costs by what drives them"],
    ["Kaplan & Narayanan (2001), Measuring and managing customer profitability", "https://www.hbs.edu/faculty/Pages/item.aspx?num=11286", "where the whale curve comes from"],
    ["Time-driven activity-based costing — Wikipedia", "https://en.wikipedia.org/wiki/Time-driven_activity-based_costing", "a lighter way to set activity rates"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 56 C 20 14, 34 8, 52 8 C 66 8, 78 14, 90 30"/><path d="M8 56 h82" opacity=".4"/><path d="M8 40 h82" stroke-dasharray="3 3" opacity=".5"/></svg>`,

  mount(root) {
    const { Plot, watch, css } = Lab;
    const money = (v) => (v < 0 ? "−" : "") + "$" + Math.round(Math.abs(v)).toLocaleString("en-US");
    const COLS = [["rev", "Revenue $k", 10], ["gm", "GM %", 1], ["orders", "Orders / yr", 10], ["lines", "Lines / order", 1], ["drops", "Deliveries / yr", 10], ["km", "km per drop", 5], ["ret", "Returns %", 0.5], ["days", "Pays in (days)", 5]];
    const DEF = [
      ["Supermarket chain", 2400, 22, 52, 40, 52, 20, 0.5, 45],
      ["Wholesaler", 1500, 18, 26, 25, 26, 40, 0.5, 30],
      ["Regional grocer", 600, 26, 150, 18, 150, 60, 1.5, 30],
      ["Online retailer", 450, 30, 365, 3, 250, 15, 12, 14],
      ["Pharmacy group", 380, 32, 250, 6, 250, 35, 2, 60],
      ["Café chain", 260, 35, 300, 8, 300, 25, 1, 30],
      ["Hardware stores", 220, 28, 150, 6, 150, 120, 3, 75],
      ["Export distributor", 520, 15, 12, 30, 12, 400, 0, 90],
      ["Corner shops (group)", 140, 38, 500, 4, 500, 30, 2, 20],
      ["Hotel group", 180, 33, 200, 10, 200, 150, 1, 90],
    ];
    let D = DEF.map((r) => r.slice());

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="whale" aria-label="Whale curve: cumulative profit as a percentage of total, customers sorted from most to least profitable"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>After cost to serve</span><span><i style="background:var(--muted)"></i>Gross margin only</span></div>
          <figcaption>Customers sorted from most to least profitable. The curve climbs, peaks, then falls as loss-making customers give profit back.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 class="cs-h">Gross margin vs profit after cost to serve</h4>
          <div style="overflow-x:auto"><table id="res" class="cs-t"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="cs-h">Customers (edit any number)</h4>
          <div style="overflow-x:auto"><table id="ed" class="cs-t"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="cs-h">Worked out for one customer</h4>
          <select id="pick" aria-label="Customer to show" style="margin-bottom:8px"></select>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.cs-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .cs-t{width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums}
        .cs-t th{text-align:right;padding:5px 6px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500;white-space:nowrap}
        .cs-t td{text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-family:var(--font-mono);white-space:nowrap}
        .cs-t th:first-child,.cs-t td:first-child{text-align:left;font-family:var(--font-body)}
        .cs-t input{width:64px;font:inherit;padding:3px 5px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink);text-align:right}</style>`,
      panel: `
        <p class="hint" style="margin:0">Activity rates: what each piece of work costs.</p>
        <div class="ctrl"><label for="rOrd">Per order (admin, invoicing) <output id="rOrdV"></output></label><input type="range" id="rOrd" min="0" max="100" step="1" value="25"></div>
        <div class="ctrl"><label for="rLine">Per order line picked <output id="rLineV"></output></label><input type="range" id="rLine" min="0" max="10" step="0.25" value="2"></div>
        <div class="ctrl"><label for="rDrop">Per delivery (stop) <output id="rDropV"></output></label><input type="range" id="rDrop" min="0" max="200" step="5" value="60"></div>
        <div class="ctrl"><label for="rKm">Per km (return trip) <output id="rKmV"></output></label><input type="range" id="rKm" min="0" max="5" step="0.1" value="1.6"></div>
        <div class="ctrl"><label for="rRet">Cost of a return (% of value) <output id="rRetV"></output></label><input type="range" id="rRet" min="0" max="100" step="5" value="40"></div>
        <div class="ctrl"><label for="wacc">Cost of capital (for credit) <output id="waccV"></output></label><input type="range" id="wacc" min="0" max="20" step="0.5" value="10"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset customers</button></div>`,
      notes: `
        <section>
          <h2>Cost to serve, line by line</h2>
          <div class="eq">order cost = orders × rate per order<br>pick cost = orders × lines × rate per line<br>delivery = deliveries × (rate per drop + 2 × km × rate per km)<br>returns = revenue × returns % × cost of a return<br>credit = revenue × days ÷ 365 × cost of capital<br>profit = revenue × GM% − all of the above</div>
          <p>The rates come from activity-based costing: take the cost of a department (say the warehouse pick team) and divide by its activity count (lines picked a year).</p>
        </section>
        <section>
          <h2>Reading the whale curve</h2>
          <p>The x axis is the share of customers, sorted from most to least profitable. The y axis is cumulative profit as % of the total. A peak far above 100% means a few customers carry the business and a tail destroys value. Gross margin alone (grey) hides this almost completely.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Find the customer with the best GM% that still loses money. What drives it?</li>
            <li>Give "Corner shops" a minimum order: cut orders and deliveries from 500 to 150, and raise lines per order from 4 to 12. Watch it move up the ranking.</li>
            <li>Set "Pays in" for the export distributor to 30 days. Credit cost is invisible in most margin reports.</li>
            <li>Set the per-delivery rate to 0. This is what a report that ignores logistics shows.</li>
          </ol>
          <p>Related: <a href="#cost-margin">landed cost and margin</a>, <a href="#abc-xyz">ABC/XYZ</a>, <a href="#freight">freight trade-offs</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pW = new Plot($("#whale"), { x: [0, 100], pad: { l: 56 } });

    function buildEd() {
      $("#ed").innerHTML = `<tr><th>Customer</th>${COLS.map((c) => `<th>${c[1]}</th>`).join("")}</tr>` + D.map((r, i) =>
        `<tr><td>${r[0]}</td>${COLS.map((c, j) => `<td><input type="number" min="0" step="${c[2]}" value="${r[j + 1]}" data-i="${i}" data-j="${j + 1}" aria-label="${r[0]} ${c[1]}"></td>`).join("")}</tr>`).join("");
      const sel = $("#pick"), cur = sel.value || "3";
      sel.innerHTML = D.map((r, i) => `<option value="${i}">${r[0]}</option>`).join(""); sel.value = cur;
    }

    function calc(r, R) {
      const [name, revK, gm, orders, lines, drops, km, ret, days] = r, rev = revK * 1000;
      const c = { ord: orders * R.ord, pick: orders * lines * R.line, del: drops * (R.drop + 2 * km * R.km), ret: rev * ret / 100 * R.ret / 100, cred: rev * days / 365 * R.wacc / 100 };
      const cts = c.ord + c.pick + c.del + c.ret + c.cred, gmv = rev * gm / 100;
      return { name, rev, gm, gmv, c, cts, profit: gmv - cts };
    }

    function draw() {
      const R = { ord: +$("#rOrd").value, line: +$("#rLine").value, drop: +$("#rDrop").value, km: +$("#rKm").value, ret: +$("#rRet").value, wacc: +$("#wacc").value };
      $("#rOrdV").textContent = "$" + R.ord; $("#rLineV").textContent = "$" + R.line.toFixed(2); $("#rDropV").textContent = "$" + R.drop; $("#rKmV").textContent = "$" + R.km.toFixed(2);
      $("#rRetV").textContent = R.ret + "%"; $("#waccV").textContent = R.wacc + "%";
      const rows = D.map((r) => calc(r, R));
      const totP = rows.reduce((s, x) => s + x.profit, 0), totG = rows.reduce((s, x) => s + x.gmv, 0), totR = rows.reduce((s, x) => s + x.rev, 0);
      const byP = rows.slice().sort((a, b) => b.profit - a.profit), byG = rows.slice().sort((a, b) => b.gmv - a.gmv);
      const cum = (arr, key, tot) => { let s = 0; return [0, ...arr.map((x) => (s += x[key]) / tot * 100)]; };
      const n = rows.length, xs = Array.from({ length: n + 1 }, (_, i) => (i / n) * 100);
      const yP = Math.abs(totP) > 1 ? cum(byP, "profit", totP) : xs.map(() => 0), yG = cum(byG, "gmv", totG);
      pW.y = [Math.min(0, ...yP) - 5, Math.max(110, ...yP) * 1.08];
      pW.clear(); pW.axes({ xLabel: "share of customers (most profitable first)", yLabel: "cumulative % of total profit", xFormat: (v) => v + "%", yFormat: (v) => v + "%", yCount: 5 });
      pW.path([0, 100], [100, 100], css("--line"), 1.5, [4, 4]);
      pW.path(xs, yG, css("--muted"), 2);
      pW.path(xs, yP, css("--accent"), 2.8);
      xs.forEach((x, i) => i && pW.dot(x, yP[i], 4, byP[i - 1].profit < 0 ? css("--bad") : css("--accent"), css("--surface")));
      const peak = Math.max(...yP);

      $("#res").innerHTML = `<tr><th>Customer</th><th>Revenue</th><th>Gross margin</th><th>Cost to serve</th><th>CTS % of rev</th><th>Profit</th><th>Profit %</th></tr>` + byP.map((x) =>
        `<tr><td>${x.name}</td><td>${money(x.rev)}</td><td>${money(x.gmv)} <span style="color:var(--muted)">${x.gm}%</span></td><td>${money(x.cts)}</td><td>${(x.cts / x.rev * 100).toFixed(1)}%</td><td style="color:${x.profit < 0 ? "var(--bad)" : "var(--good)"}">${money(x.profit)}</td><td>${(x.profit / x.rev * 100).toFixed(1)}%</td></tr>`).join("")
        + `<tr style="font-weight:600"><td>Total</td><td>${money(totR)}</td><td>${money(totG)}</td><td>${money(totG - totP)}</td><td>${((totG - totP) / totR * 100).toFixed(1)}%</td><td>${money(totP)}</td><td>${(totP / totR * 100).toFixed(1)}%</td></tr>`;

      const losers = rows.filter((x) => x.profit < 0);
      $("#ro").innerHTML = `
        <div class="ro"><b>Total profit after CTS</b><span class="num">${money(totP)}</span></div>
        <div class="ro"><b>Whale curve peak</b><span class="pill ${peak > 110 ? "warn" : "ok"}">${peak.toFixed(0)}%</span></div>
        <div class="ro"><b>Loss-making customers</b><span class="num">${losers.length} of ${n}</span></div>
        <div class="ro"><b>Profit they give back</b><span class="num">${money(-losers.reduce((s, x) => s + x.profit, 0))}</span></div>`;

      const x = rows[+$("#pick").value] || rows[0], r = D[+$("#pick").value] || D[0], B = (t) => `<b style="color:var(--ink)">${t}</b>`;
      $("#work").innerHTML = [
        `gross margin = ${money(x.rev)} × ${x.gm}% = ${B(money(x.gmv))}`,
        `orders: ${r[3]} × $${R.ord} = ${money(x.c.ord)}`,
        `picking: ${r[3]} × ${r[4]} lines × $${R.line.toFixed(2)} = ${money(x.c.pick)}`,
        `delivery: ${r[5]} × ($${R.drop} + 2 × ${r[6]} km × $${R.km.toFixed(2)}) = ${money(x.c.del)}`,
        `returns: ${money(x.rev)} × ${r[7]}% × ${R.ret}% = ${money(x.c.ret)}`,
        `credit: ${money(x.rev)} × ${r[8]} ÷ 365 × ${R.wacc}% = ${money(x.c.cred)}`,
        `cost to serve = ${B(money(x.cts))} (${(x.cts / x.rev * 100).toFixed(1)}% of revenue) → profit = ${B(money(x.profit))}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    buildEd();
    $("#ed").addEventListener("input", (e) => { const t = e.target; if (!t.dataset.i || t.value === "") return; D[+t.dataset.i][+t.dataset.j] = Math.max(0, +t.value); draw(); });
    ["#rOrd", "#rLine", "#rDrop", "#rKm", "#rRet", "#wacc", "#pick"].forEach((s) => $(s).addEventListener("input", draw));
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); D = DEF.map((r) => r.slice()); buildEd(); draw(); });
    draw();
    return watch([pW.c], (resized) => { if (resized) pW.resize(); draw(); });
  },
});
