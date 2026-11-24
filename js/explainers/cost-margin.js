Lab.register({
  id: "cost-margin",
  group: "Supply chain",
  title: "Landed cost, margin and the value of improvements",
  blurb: "Build a landed cost from supplier price to your shelf, follow it down the P&L to profit, and put a dollar value on supply chain improvements.",
  lede: "The supplier's price is only the start. By the time a unit sits in your warehouse it has picked up freight, insurance, duty and handling: that's its landed cost. Revenue minus landed cost gives gross margin, and logistics, holding stock and overheads take their share before anything is left as profit. Once you can see the whole chain, you can work out what an improvement is really worth and where the money actually shows up.",
  quiz: [
    ["A product costs $8 landed and sells for $10. What are the gross margin and the markup?", "Gross margin = (10 − 8) / 10 = 20% of the selling price. Markup = (10 − 8) / 8 = 25% on cost. People mix these up all the time, so always ask which one is meant."],
    ["Cutting inventory by $500k frees $500k of cash. Does profit go up by $500k?", "No. The $500k is a one-off release of working capital (cash), not profit. Profit only rises by the carrying cost you stop paying each year, e.g. 25% × $500k = $125k a year."],
    ["Why can $1 of cost saving be worth more than $1 of extra sales?", "A dollar saved goes straight to profit. A dollar of extra sales only adds its contribution margin, say 30 cents. So a $1 saving matches about $3.30 of new sales."],
    ["Recovering a lost sale: is it worth the selling price, the gross margin, or something else?", "Its contribution: price minus landed cost and the variable costs of serving it (warehousing, outbound freight, a bit more stock to carry). Not the full price, because you still pay for the goods. Long term, a lost customer can cost far more than one sale."],
    ["Your country charges duty on the CIF value instead of FOB. What changes?", "Duty is charged on the goods plus insurance and international freight, so a freight increase also raises the duty bill. On FOB, freight isn't dutiable."],
  ],
  deeper: [
    ["Incoterms — Wikipedia", "https://en.wikipedia.org/wiki/Incoterms", "FOB, CIF, DDP and who pays which leg"],
    ["Landed cost — Wikipedia", "https://en.wikipedia.org/wiki/Landed_cost", "what goes into it"],
    ["Gross margin — Wikipedia", "https://en.wikipedia.org/wiki/Gross_margin", "margin vs markup"],
    ["Contribution margin — Wikipedia", "https://en.wikipedia.org/wiki/Contribution_margin", "the right lens for extra volume"],
    ["Working capital — Wikipedia", "https://en.wikipedia.org/wiki/Working_capital", "why stock is cash on the shelf"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="40" width="12" height="18" fill="currentColor" fill-opacity=".2"/><rect x="24" y="30" width="12" height="10" fill="currentColor" fill-opacity=".35"/><rect x="40" y="24" width="12" height="6" fill="currentColor" fill-opacity=".5"/><rect x="56" y="24" width="12" height="34" fill="currentColor" fill-opacity=".25"/><path d="M74 14 L74 58 M70 18 L74 14 L78 18"/><path d="M80 10 h10"/></svg>`,

  mount(root) {
    const { css } = Lab;
    const money = (v, d = 0) => (v < 0 ? "−" : "") + "$" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    const pct = (v, d = 1) => (v * 100).toFixed(d) + "%";
    const DEF = {
      fob: 10, ins: 0.5, frt: 0.8, duty: 5, broker: 0.3, inland: 0.4,
      price: 22, units: 100000, lost: 4, wo: 2, wh: 0.6, out: 1.2, cover: 8, carry: 25, oh: 450000,
    };
    let V = { ...DEF }, basis = "CIF";
    const FIELDS = [
      ["Buying and landing (per unit)", [["fob", "Supplier price (FOB)", "$", 0.01], ["ins", "Insurance", "% of FOB", 0.1], ["frt", "International freight", "$", 0.01], ["duty", "Import duty", "%", 0.5], ["broker", "Broker, port and clearance", "$", 0.01], ["inland", "Port → DC freight", "$", 0.01]]],
      ["Selling and running (per year)", [["price", "Selling price", "$ / unit", 0.1], ["units", "Units sold", "per year", 1000], ["lost", "Demand lost to stockouts", "%", 0.5], ["wo", "Stock written off (obsolete, damaged)", "% of units bought", 0.5], ["wh", "Warehousing and handling", "$ / unit", 0.01], ["out", "Outbound freight to customers", "$ / unit", 0.01], ["cover", "Average stock held", "weeks of sales", 1], ["carry", "Carrying cost rate", "% of value / yr", 1], ["oh", "Fixed overheads", "$ / yr", 10000]]],
    ];

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot" style="padding:14px">
          <h4 class="cm-h">Landed cost of one unit</h4>
          <div id="stack"></div>
          <div id="stackLeg" class="legend" style="margin-top:8px"></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="cm-h">From revenue to profit, per year (today, before improvements)</h4>
          <div id="ladder"></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="cm-h">What the improvements are worth</h4>
          <div id="levers"></div>
          <p class="hint" id="leverNote" style="margin:10px 0 0"></p>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="cm-h">Your numbers</h4>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap"><span style="font-size:.86rem">Duty is charged on</span>
            <div class="seg" id="basis" style="min-width:200px"><button type="button" data-v="FOB" aria-pressed="false">FOB value</button><button type="button" data-v="CIF" aria-pressed="true">CIF value</button></div></div>
          <div id="inputs" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:4px 24px"></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="cm-h">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>
          .cm-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
          .cm-row{display:grid;grid-template-columns:minmax(120px,190px) 1fr minmax(84px,auto);gap:10px;align-items:center;font-size:.86rem;padding:3px 0}
          .cm-row .v{font-family:var(--font-mono);text-align:right;font-variant-numeric:tabular-nums}
          .cm-track{position:relative;height:18px}
          .cm-bar{position:absolute;top:0;bottom:0;border-radius:3px}
          .cm-row.sub{border-top:1px solid var(--line);margin-top:2px;padding-top:6px;font-weight:600}
          .cm-in{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:.86rem;padding:3px 0}
          .cm-in small{color:var(--muted)}
          .cm-in input{width:96px;font:inherit;font-family:var(--font-mono);padding:4px 6px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink)}
          @media (max-width:560px){.cm-row{grid-template-columns:110px 1fr 76px;font-size:.8rem}}
        </style>`,
      panel: `
        <p class="hint" style="margin:0">Improvements to value. Each one is worked out on its own, then all together.</p>
        <div class="ctrl"><label for="dLost">Win back lost sales <output id="dLostV"></output></label><input type="range" id="dLost" min="0" max="4" step="0.5" value="2"></div>
        <div class="ctrl"><label for="dCover">Hold less stock <output id="dCoverV"></output></label><input type="range" id="dCover" min="0" max="6" step="0.5" value="2"></div>
        <div class="ctrl"><label for="dFrt">Cheaper freight (all legs) <output id="dFrtV"></output></label><input type="range" id="dFrt" min="0" max="25" step="1" value="10"></div>
        <div class="ctrl"><label for="dWo">Fewer write-offs <output id="dWoV"></output></label><input type="range" id="dWo" min="0" max="2" step="0.25" value="1"></div>
        <div class="ctrl"><label for="dFob">Better supplier price <output id="dFobV"></output></label><input type="range" id="dFob" min="0" max="10" step="0.5" value="2"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset numbers</button></div>`,
      notes: `
        <section>
          <h2>Landed cost</h2>
          <p>Everything it takes to get one unit onto your shelf, ready to sell:</p>
          <div class="eq">CIF = FOB + insurance + international freight<br>duty = rate × (FOB or CIF, depending on the country)<br>landed = CIF + duty + broker/port + inland freight</div>
          <p><b>FOB</b> (free on board) means the supplier's price covers getting the goods onto the ship; you pay from there. <b>CIF</b> adds insurance and freight. These are <a href="https://en.wikipedia.org/wiki/Incoterms" target="_blank" rel="noopener">Incoterms</a>. Which value is dutiable varies by country: the EU charges on CIF, while the US, Australia and New Zealand mostly charge on FOB.</p>
        </section>
        <section>
          <h2>Down the P&amp;L</h2>
          <div class="eq">gross margin = revenue − landed cost of goods sold − write-offs<br>contribution = gross margin − warehousing − outbound freight − carrying cost<br>operating profit = contribution − fixed overheads</div>
          <p><b>Carrying cost</b> is what it costs to hold stock for a year: the money tied up (cost of capital), space, insurance, damage and obsolescence. 20–30% of the stock's value a year is typical.</p>
          <p>Many companies put some of these lines in different places, for example freight-in inside cost of goods and outbound freight below gross margin. The order changes the labels, not the profit.</p>
        </section>
        <section>
          <h2>Valuing an improvement</h2>
          <ul>
            <li><b>Cost savings</b> (freight, price, write-offs) go straight to profit, dollar for dollar.</li>
            <li><b>Recovered sales</b> add only their <i>contribution</i>: price minus landed cost and the variable costs of serving them.</li>
            <li><b>Less stock</b> gives two different things: a <i>one-off</i> cash release, and a <i>yearly</i> profit gain equal to the carrying cost saved. Don't add the cash to the profit.</li>
          </ul>
          <p>The "sales needed" figure divides a profit gain by the contribution margin %. It's why supply chain savings often beat sales growth as a way to raise profit.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Switch duty from CIF to FOB. Duty falls, because freight and insurance are no longer taxed.</li>
            <li>Double international freight to $1.60. Landed cost rises by more than $0.80 on a CIF basis.</li>
            <li>Compare "Win back lost sales" with "Better supplier price". Which gives more profit per point?</li>
            <li>Set the carrying rate to 10%, then to 35%. The value of holding less stock changes a lot, but the cash released doesn't change at all.</li>
            <li>Lower the selling price until operating profit is near zero. See how much extra sales you'd need to match a 10% freight saving.</li>
          </ol>
          <p>Related: <a href="#forecast-value">the value of a better forecast</a>, <a href="#carrying-cost">carrying cost</a>, <a href="#service-level-cost">service level vs cost</a> and <a href="#newsvendor">the newsvendor problem</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const inputsEl = $("#inputs");
    function buildInputs() {
      inputsEl.innerHTML = FIELDS.map(([h, fs]) => `<div><div style="font-weight:600;font-size:.86rem;margin:4px 0 6px">${h}</div>${fs.map(([k, l, u, st]) =>
        `<label class="cm-in"><span>${l} <small>${u}</small></span><input type="number" data-k="${k}" step="${st}" min="0" value="${V[k]}"></label>`).join("")}</div>`).join("");
    }

    function model(p) {
      const cifIns = p.fob * p.ins / 100, cif = p.fob + cifIns + p.frt;
      const duty = (basis === "CIF" ? cif : p.fob) * p.duty / 100;
      const landed = cif + duty + p.broker + p.inland;
      const demand = p.units / (1 - V.lost / 100); // demand is fixed; units sold depend on lost %
      const sold = demand * (1 - p.lost / 100);
      const bought = sold / (1 - p.wo / 100);
      const rev = sold * p.price, cogs = sold * landed, wo = (bought - sold) * landed;
      const gm = rev - cogs - wo;
      const whC = sold * p.wh, outC = sold * p.out;
      const inv = landed * sold / 52 * p.cover, carryC = inv * p.carry / 100;
      const contrib = gm - whC - outC - carryC, profit = contrib - p.oh;
      return { cifIns, cif, duty, landed, demand, sold, bought, rev, cogs, wo, gm, whC, outC, inv, carryC, contrib, profit };
    }

    function draw() {
      const d = { lost: +$("#dLost").value, cover: +$("#dCover").value, frt: +$("#dFrt").value, wo: +$("#dWo").value, fob: +$("#dFob").value };
      $("#dLostV").textContent = `−${d.lost} pts (${V.lost}% → ${Math.max(0, V.lost - d.lost)}%)`;
      $("#dCoverV").textContent = `−${d.cover} wk (${V.cover} → ${Math.max(0, V.cover - d.cover)})`;
      $("#dFrtV").textContent = `−${d.frt}%`;
      $("#dWoV").textContent = `−${d.wo} pts (${V.wo}% → ${Math.max(0, V.wo - d.wo)}%)`;
      $("#dFobV").textContent = `−${d.fob}%`;

      const b = model(V);
      const fr = () => 1 - d.frt / 100;
      const all = { ...V, lost: Math.max(0, V.lost - d.lost), cover: Math.max(0, V.cover - d.cover), frt: V.frt * fr(), inland: V.inland * fr(), out: V.out * fr(), wo: Math.max(0, V.wo - d.wo), fob: V.fob * (1 - d.fob / 100) };
      const mAll = model(all);
      // ---- landed cost stack: today vs after the improvements
      const segsOf = (p, m) => [["Supplier price (FOB)", p.fob, "--accent"], ["Insurance", m.cifIns, "--violet"], ["International freight", p.frt, "--warm"], ["Duty", m.duty, "--bad"], ["Broker and port", p.broker, "--muted"], ["Port → DC", p.inland, "--violet-soft"]];
      const segs = segsOf(V, b), segsA = segsOf(all, mAll);
      const scale = Math.max(V.price, b.landed);
      const bar = (from, w, col, extra = "") => `<div class="cm-bar" style="left:${(from / scale) * 100}%;width:${Math.max(0, (w / scale) * 100)}%;background:var(${col});${extra}"></div>`;
      const stackOf = (sg) => { let x = 0; return sg.map(([, v, c]) => { const h = bar(x, v, c, "border-radius:0"); x += v; return h; }).join(""); };
      const changed = Math.abs(mAll.landed - b.landed) > 1e-9;
      $("#stack").innerHTML = `
        <div class="cm-row"><span>Landed cost today</span><div class="cm-track">${stackOf(segs)}</div><span class="v">${money(b.landed, 2)}</span></div>
        <div class="cm-row"><span>After improvements</span><div class="cm-track">${stackOf(segsA)}</div><span class="v">${money(mAll.landed, 2)}${changed ? `<br><small style="color:var(--good)">−${money(b.landed - mAll.landed, 2)}</small>` : ""}</span></div>
        <div class="cm-row"><span>Selling price</span><div class="cm-track">${bar(0, mAll.landed, "--line")}${bar(mAll.landed, V.price - mAll.landed, "--good")}</div><span class="v">${money(V.price, 2)}</span></div>
        <div class="cm-row" style="color:var(--muted)"><span>Gross margin / unit</span><div class="cm-track"></div><span class="v">${money(V.price - b.landed, 2)} → ${money(V.price - mAll.landed, 2)}</span></div>
        <p class="hint" style="margin:6px 0 0">The second bar applies the freight and supplier-price sliders. Cheaper freight also lowers duty when duty is on CIF. Outbound freight isn't part of landed cost; it shows up further down the P&amp;L.</p>`;
      $("#stackLeg").innerHTML = segs.map(([l, v, c], i) => { const a = segsA[i][1]; return `<span><i style="background:var(${c})"></i>${l} ${money(v, 2)}${Math.abs(a - v) > 1e-9 ? ` → ${money(a, 2)}` : ""}</span>`; }).join("") + `<span><i style="background:var(--good)"></i>Margin</span>`;

      // ---- P&L ladder (waterfall on a revenue scale)
      const R = Math.max(b.rev, 1);
      const steps = [["Revenue", 0, b.rev, "--accent", false], ["− Cost of goods sold (landed)", b.rev - b.cogs, b.rev, "--warm", false], ["− Write-offs", b.rev - b.cogs - b.wo, b.rev - b.cogs, "--bad", false],
        ["Gross margin", 0, b.gm, "--good", true, b.gm / b.rev], ["− Warehousing", b.gm - b.whC, b.gm, "--muted", false], ["− Outbound freight", b.gm - b.whC - b.outC, b.gm - b.whC, "--warm", false],
        ["− Carrying cost of stock", b.contrib, b.contrib + b.carryC, "--violet", false], ["Contribution", 0, b.contrib, "--good", true, b.contrib / b.rev], ["− Fixed overheads", Math.min(b.contrib, b.profit), Math.max(b.contrib, b.profit), "--muted", false],
        ["Operating profit", Math.min(0, b.profit), Math.max(0, b.profit), b.profit >= 0 ? "--good" : "--bad", true, b.profit / b.rev]];
      $("#ladder").innerHTML = steps.map(([l, lo, hi, c, sub, m]) => {
        const lo2 = Math.max(0, lo), w = Math.max(0, hi - lo2);
        return `<div class="cm-row${sub ? " sub" : ""}"><span>${l}</span><div class="cm-track">${bar(lo2 * scale / R, w * scale / R, c)}</div><span class="v">${money(l.startsWith("−") ? -(hi - lo) : (l === "Operating profit" ? b.profit : hi))}${m !== undefined ? `<br><small style="color:var(--muted)">${pct(m)}</small>` : ""}</span></div>`;
      }).join("");

      // ---- levers
      const L = [
        ["Win back lost sales", { ...V, lost: Math.max(0, V.lost - d.lost) }, "--accent"],
        ["Hold less stock", { ...V, cover: Math.max(0, V.cover - d.cover) }, "--violet"],
        ["Cheaper freight", { ...V, frt: V.frt * fr(), inland: V.inland * fr(), out: V.out * fr() }, "--warm"],
        ["Fewer write-offs", { ...V, wo: Math.max(0, V.wo - d.wo) }, "--bad"],
        ["Better supplier price", { ...V, fob: V.fob * (1 - d.fob / 100) }, "--good"],
      ];
      const rows = L.map(([l, p, c]) => { const m = model(p); return [l, m.profit - b.profit, c, b.inv - m.inv]; });
      const tot = mAll.profit - b.profit;
      const mx = Math.max(1, ...rows.map((r) => Math.abs(r[1])), Math.abs(tot));
      const cm = b.contrib / b.rev; // contribution margin %
      const vbar = (v, c) => `<div class="cm-bar" style="left:0;width:${(Math.abs(v) / mx) * 100}%;background:var(${c})"></div>`;
      $("#levers").innerHTML = rows.map(([l, v, c, cash]) => `<div class="cm-row"><span>${l}</span><div class="cm-track">${vbar(v, c)}</div><span class="v">${money(v)}/yr${cash > 1 ? `<br><small style="color:var(--muted)">+ ${money(cash)} cash once</small>` : ""}</span></div>`).join("")
        + `<div class="cm-row sub"><span>All together</span><div class="cm-track">${vbar(tot, "--ink")}</div><span class="v">${money(tot)}/yr</span></div>`;
      $("#leverNote").innerHTML = `To add ${money(tot)} of profit through extra sales alone, you'd need about <b>${money(tot / cm)}</b> more revenue a year (${pct((tot / cm) / b.rev, 0)} growth), because each extra sales dollar only contributes ${pct(cm)}. Holding less stock also releases <b>${money(b.inv - mAll.inv)}</b> of cash once (working capital), which is separate from profit.`;

      $("#ro").innerHTML = `
        <div class="ro"><b>Landed cost / unit</b><span class="num">${money(b.landed, 2)} → ${money(mAll.landed, 2)}</span></div>
        <div class="ro"><b>Gross margin</b><span class="num">${pct(b.gm / b.rev)}</span></div>
        <div class="ro"><b>Markup on landed cost</b><span class="num">${pct((V.price - b.landed) / b.landed)}</span></div>
        <div class="ro"><b>Operating profit</b><span class="num">${money(b.profit)} → ${money(mAll.profit)}</span></div>
        <div class="ro"><b>Stock value held</b><span class="num">${money(b.inv)} → ${money(mAll.inv)}</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`, m2 = (v) => money(v, 2);
      $("#work").innerHTML = [
        `CIF = ${m2(V.fob)} + ${V.ins}% × ${m2(V.fob)} + ${m2(V.frt)} = ${B(m2(b.cif))}`,
        `duty = ${V.duty}% × ${basis} ${m2(basis === "CIF" ? b.cif : V.fob)} = ${B(m2(b.duty))}`,
        `landed = ${m2(b.cif)} + ${m2(b.duty)} + ${m2(V.broker)} + ${m2(V.inland)} = ${B(m2(b.landed))}`,
        `after improvements: FOB ${m2(all.fob)}, freight ${m2(all.frt)}, inland ${m2(all.inland)} → CIF ${m2(mAll.cif)}, duty ${m2(mAll.duty)} → landed ${B(m2(mAll.landed))} ${M(`(saves ${m2(b.landed - mAll.landed)} a unit, ${money((b.landed - mAll.landed) * mAll.bought)} a year on ${Math.round(mAll.bought).toLocaleString()} units bought)`)}`,
        `units bought = ${Math.round(b.sold).toLocaleString()} sold ÷ (1 − ${V.wo}%) = ${Math.round(b.bought).toLocaleString()} → written off ${Math.round(b.bought - b.sold).toLocaleString()} × ${m2(b.landed)} = ${B(money(b.wo))}`,
        `gross margin = ${money(b.rev)} − ${money(b.cogs)} − ${money(b.wo)} = ${B(money(b.gm))} ${M(`(${pct(b.gm / b.rev)})`)}`,
        `stock held = ${m2(b.landed)} × ${Math.round(b.sold).toLocaleString()} ÷ 52 × ${V.cover} wk = ${money(b.inv)} → carrying ${V.carry}% = ${B(money(b.carryC))}`,
        `contribution = ${money(b.gm)} − ${money(b.whC)} − ${money(b.outC)} − ${money(b.carryC)} = ${B(money(b.contrib))} ${M(`(${pct(cm)} of revenue)`)}`,
        `profit = ${money(b.contrib)} − ${money(V.oh)} = ${B(money(b.profit))}`,
        `lost sales: demand ${Math.round(b.demand).toLocaleString()}, recovering ${d.lost} pts = ${Math.round(b.demand * d.lost / 100).toLocaleString()} units × ${m2(rows[0][1] / Math.max(1, b.demand * d.lost / 100))} contribution each = ${B(money(rows[0][1]))} ${M("(price − landed − warehousing − freight − extra stock to carry − extra write-offs)")}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    buildInputs();
    inputsEl.addEventListener("input", (e) => { const k = e.target.dataset.k; if (!k || e.target.value === "") return; V[k] = Math.max(0, +e.target.value); if (k === "lost" || k === "wo") V[k] = Math.min(V[k], 90); draw(); });
    $("#basis").addEventListener("click", (e) => { const v = e.target.closest("button")?.dataset.v; if (!v) return; basis = v; $("#basis").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === v)); draw(); });
    ["#dLost", "#dCover", "#dFrt", "#dWo", "#dFob"].forEach((s) => $(s).addEventListener("input", draw));
    $("#reset").addEventListener("click", () => { V = { ...DEF }; basis = "CIF"; $("#basis").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === "CIF")); buildInputs(); draw(); });
    draw();
  },
});
