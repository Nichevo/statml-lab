Lab.register({
  id: "cash-to-cash",
  group: "Supply chain",
  title: "Cash-to-cash cycle and working capital",
  blurb: "How many days your cash is tied up between paying suppliers and getting paid by customers, and what cutting inventory days does to cash and profit.",
  lede: "A business pays its suppliers, holds the goods as stock, sells them, and then waits for the customer to pay. The cash-to-cash cycle counts the days between money going out and coming back in. Every day of it has to be funded with working capital. Supply chain decisions move two of the three levers directly: days of inventory, and the payment terms agreed with suppliers.",
  quiz: [
    ["DIO 60, DSO 45, DPO 30. What is the cash-to-cash cycle?", "60 + 45 − 30 = 75 days. Cash leaves when you pay the supplier (day 30) and returns when the customer pays (day 60 + 45 = 105), 75 days later."],
    ["Cost of goods sold is $36.5m a year. How much cash does cutting DIO by 10 days release?", "$36.5m ÷ 365 = $100k per day of inventory, so 10 days = $1m released once. At a 10% cost of capital that also saves $100k a year."],
    ["Why can a fast-growing profitable company run out of cash?", "Working capital grows with sales. If the cycle is 75 days, each extra $1m of sales a year needs about $1m × 75 ÷ 365 ≈ $205k more cash tied up before it comes back."],
    ["Is stretching supplier payments (higher DPO) free cash?", "Not always. Suppliers may raise prices, drop early-payment discounts, or become financially fragile. Supply chain finance schemes try to share the benefit."],
  ],
  diy: {
    intro: "From the accounts: revenue in H1, COGS in H2, inventory in H3, receivables in H4, payables in H5 (year-end or average balances).",
    steps: [
      ["Days inventory outstanding.", "=H3/H2*365"],
      ["Days sales outstanding.", "=H4/H1*365"],
      ["Days payables outstanding.", "=H5/H2*365"],
      ["Cash-to-cash cycle.", "=DIO+DSO-DPO"],
      ["Cash released by cutting inventory by one day.", "=H2/365"],
      ["Yearly financing value of that cash at cost of capital r.", "=H2/365*r"],
    ],
  },
  deeper: [
    ["Cash conversion cycle — Wikipedia", "https://en.wikipedia.org/wiki/Cash_conversion_cycle", "definitions and formulas"],
    ["Days sales outstanding — Wikipedia", "https://en.wikipedia.org/wiki/Days_sales_outstanding", "measuring receivables"],
    ["Working capital — Wikipedia", "https://en.wikipedia.org/wiki/Working_capital", "what it is and why it matters"],
    ["Reverse factoring — Wikipedia", "https://en.wikipedia.org/wiki/Reverse_factoring", "supply chain finance"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 20 h48" stroke-width="6" opacity=".4"/><path d="M56 32 h30" stroke-width="6" opacity=".7"/><path d="M8 46 h22" stroke-width="6" opacity=".25"/><path d="M30 54 h56" stroke-dasharray="3 3"/></svg>`,

  mount(root) {
    const money = (v) => (v < 0 ? "−" : "") + "$" + (Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toFixed(2) + "m" : Math.round(Math.abs(v)).toLocaleString("en-US"));

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot" style="padding:14px">
          <h4 class="cx-h">The cycle on a timeline</h4>
          <div id="tl" style="position:relative;min-height:170px"></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="cx-h">Working capital tied up</h4>
          <div id="wc"></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="cx-h">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.cx-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .cx-bar{position:absolute;height:26px;border-radius:4px;display:flex;align-items:center;padding:0 8px;font-size:.8rem;color:var(--ink);white-space:nowrap;overflow:hidden}
        .cx-row{display:grid;grid-template-columns:minmax(110px,160px) 1fr 90px;gap:10px;align-items:center;font-size:.86rem;padding:4px 0}
        .cx-row .v{text-align:right;font-family:var(--font-mono)}</style>`,
      panel: `
        <div class="ctrl"><label for="dio">Days inventory (DIO) <output id="dioV"></output></label><input type="range" id="dio" min="0" max="180" step="1" value="60"></div>
        <div class="ctrl"><label for="dso">Days to get paid (DSO) <output id="dsoV"></output></label><input type="range" id="dso" min="0" max="120" step="1" value="45"></div>
        <div class="ctrl"><label for="dpo">Days to pay suppliers (DPO) <output id="dpoV"></output></label><input type="range" id="dpo" min="0" max="120" step="1" value="30"></div>
        <div class="ctrl"><label for="rev">Revenue per year <output id="revV"></output></label><input type="range" id="rev" min="5" max="500" step="5" value="60"></div>
        <div class="ctrl"><label for="gm">Gross margin <output id="gmV"></output></label><input type="range" id="gm" min="5" max="70" step="1" value="35"></div>
        <div class="ctrl"><label for="wacc">Cost of capital <output id="waccV"></output></label><input type="range" id="wacc" min="0" max="20" step="0.5" value="10"></div>
        <div class="ctrl"><label for="cut">Supply chain project: cut DIO by <output id="cutV"></output></label><input type="range" id="cut" min="0" max="60" step="1" value="15"></div>
        <div class="ctrl"><label for="gr">Sales growth next year <output id="grV"></output></label><input type="range" id="gr" min="0" max="50" step="1" value="10"></div>
        <div class="readouts" id="ro"></div>`,
      notes: `
        <section>
          <h2>The three day counts</h2>
          <div class="eq">DIO = inventory ÷ COGS × 365<br>DSO = receivables ÷ revenue × 365<br>DPO = payables ÷ COGS × 365<br>cash-to-cash = DIO + DSO − DPO</div>
          <p>Inventory and payables are measured against cost of goods sold (they're held at cost); receivables against revenue (customers owe the selling price).</p>
        </section>
        <section>
          <h2>From days to dollars</h2>
          <div class="eq">working capital = COGS × DIO/365 + revenue × DSO/365 − COGS × DPO/365<br>one day of inventory = COGS ÷ 365</div>
          <p>Cutting days releases cash <b>once</b>. The yearly profit effect is the financing cost saved (cost of capital × cash released), plus the other parts of <a href="#carrying-cost">carrying cost</a> for inventory.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Raise DPO above DIO + DSO. The cycle goes negative: suppliers fund the business. Large retailers often run like this.</li>
            <li>Set growth to 30%. See how much extra cash growth needs, then cut DIO by 20 days and compare.</li>
            <li>Lower the gross margin. COGS gets bigger, so each inventory day is worth more cash.</li>
          </ol>
          <p>Related: <a href="#cost-margin">landed cost and margin</a>, <a href="#carrying-cost">carrying cost</a>, <a href="#roi">project ROI</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    function draw() {
      const dio = +$("#dio").value, dso = +$("#dso").value, dpo = +$("#dpo").value, rev = +$("#rev").value * 1e6, gm = +$("#gm").value / 100, wacc = +$("#wacc").value / 100, cut = Math.min(+$("#cut").value, dio), gr = +$("#gr").value / 100;
      $("#dioV").textContent = dio; $("#dsoV").textContent = dso; $("#dpoV").textContent = dpo; $("#revV").textContent = "$" + $("#rev").value + "m";
      $("#gmV").textContent = Math.round(gm * 100) + "%"; $("#waccV").textContent = (wacc * 100).toFixed(1) + "%"; $("#cutV").textContent = cut + " days"; $("#grV").textContent = Math.round(gr * 100) + "%";
      const cogs = rev * (1 - gm), c2c = dio + dso - dpo;
      const inv = cogs * dio / 365, ar = rev * dso / 365, ap = cogs * dpo / 365, wc = inv + ar - ap;

      const span = Math.max(dio + dso, dpo) + 10, X = (d) => (d / span) * 100;
      $("#tl").innerHTML = `
        <div style="position:absolute;left:0;right:0;top:4px;font-size:.78rem;color:var(--muted)">day 0: goods arrive</div>
        <div class="cx-bar" style="top:26px;left:0;width:${X(dio)}%;background:var(--accent-soft)">In stock ${dio} d</div>
        <div class="cx-bar" style="top:26px;left:${X(dio)}%;width:${X(dso)}%;background:var(--violet-soft)">Customer owes ${dso} d</div>
        <div class="cx-bar" style="top:62px;left:0;width:${X(dpo)}%;background:var(--warm-soft)">Supplier credit ${dpo} d</div>
        <div class="cx-bar" style="top:104px;left:${X(Math.min(dpo, dio + dso))}%;width:${X(Math.abs(c2c))}%;background:${c2c >= 0 ? "var(--bad)" : "var(--good)"};color:var(--surface);font-weight:600">${c2c >= 0 ? "Cash tied up" : "Suppliers fund you"} ${Math.abs(c2c)} d</div>
        <div style="position:absolute;left:${X(dpo)}%;top:94px;height:46px;border-left:2px dashed var(--warm)"></div>
        <div style="position:absolute;left:${X(dio + dso)}%;top:20px;height:120px;border-left:2px dashed var(--violet)"></div>
        <div style="position:absolute;left:0;right:0;top:144px;font-size:.78rem;color:var(--muted);display:flex;justify-content:space-between"><span>you pay the supplier on day ${dpo}</span><span>the customer pays on day ${dio + dso}</span></div>`;

      const mx = Math.max(inv, ar, ap, Math.abs(wc), 1), bar = (v, c) => `<div style="height:18px;width:${(Math.abs(v) / mx) * 100}%;background:var(${c});border-radius:3px"></div>`;
      $("#wc").innerHTML = [["Inventory", inv, "--accent"], ["+ Receivables", ar, "--violet"], ["− Payables", -ap, "--warm"], ["= Working capital", wc, wc >= 0 ? "--bad" : "--good"]]
        .map(([l, v, c], i) => `<div class="cx-row" style="${i === 3 ? "border-top:1px solid var(--line);font-weight:600;padding-top:8px" : ""}"><span>${l}</span>${bar(v, c)}<span class="v">${money(v)}</span></div>`).join("");

      const perDay = cogs / 365, freed = perDay * cut, finSave = freed * wacc;
      const needGrowth = wc * gr, needGrowthCut = (cogs * (1 + gr) * (dio - cut) / 365 + rev * (1 + gr) * dso / 365 - cogs * (1 + gr) * dpo / 365) - wc;
      $("#ro").innerHTML = `
        <div class="ro"><b>Cash-to-cash</b><span class="pill ${c2c > 60 ? "warn" : "ok"}">${c2c} days</span></div>
        <div class="ro"><b>Working capital</b><span class="num">${money(wc)}</span></div>
        <div class="ro"><b>Cash per inventory day</b><span class="num">${money(perDay)}</span></div>
        <div class="ro"><b>Cut DIO ${cut} d: cash once</b><span class="num">${money(freed)}</span></div>
        <div class="ro"><b>…financing saved / yr</b><span class="num">${money(finSave)}</span></div>
        <div class="ro"><b>Extra cash growth needs</b><span class="num">${money(needGrowth)}</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`;
      $("#work").innerHTML = [
        `COGS = ${money(rev)} × (1 − ${Math.round(gm * 100)}%) = ${money(cogs)}`,
        `cash-to-cash = ${dio} + ${dso} − ${dpo} = ${B(c2c + " days")}`,
        `inventory = ${money(cogs)} × ${dio}/365 = ${money(inv)}; receivables = ${money(rev)} × ${dso}/365 = ${money(ar)}; payables = ${money(cogs)} × ${dpo}/365 = ${money(ap)}`,
        `working capital = ${money(inv)} + ${money(ar)} − ${money(ap)} = ${B(money(wc))}`,
        `one inventory day = ${money(cogs)} ÷ 365 = ${money(perDay)} → cut ${cut} days = ${B(money(freed))} cash once, × ${(wacc * 100).toFixed(1)}% = ${money(finSave)}/yr`,
        `growth ${Math.round(gr * 100)}% needs ${B(money(needGrowth))} more working capital; ${needGrowthCut >= 0 ? `with the DIO cut it needs only ${B(money(needGrowthCut))}` : `with the DIO cut, the business grows and still frees ${B(money(-needGrowthCut))}`}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }
    root.querySelectorAll("input").forEach((i) => i.addEventListener("input", draw));
    draw();
  },
});
