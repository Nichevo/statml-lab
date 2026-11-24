Lab.register({
  id: "tariffs",
  group: "Supply chain",
  title: "Tariffs: how they work and who really pays",
  blurb: "How import duties are calculated, how they flow into landed cost, when switching supplier pays, who ends up carrying the cost, and whether stockpiling ahead of a tariff is worth it.",
  lede: "A tariff is a tax on imported goods, collected by customs from the importer when the goods cross the border. The rate comes from the country's tariff schedule and depends on what the product is (its HS code), where it was made (its origin) and how it's valued. The importer writes the cheque, but that doesn't settle who bears the cost: some is pushed back onto the supplier as a lower price, some is passed on to customers, and the rest comes out of the importer's margin. Tariffs also change sourcing decisions, because a cheaper supplier can stop being cheaper once duty is added.",
  quiz: [
    ["Goods worth $10 FOB, freight and insurance $1.50, tariff 20% on CIF value. What's the duty?", "20% × ($10 + $1.50) = $2.30 per unit. On an FOB basis it would be 20% × $10 = $2.00. Which value is dutiable depends on the importing country: the EU uses CIF, the US, Australia and New Zealand mostly use FOB."],
    ["What's the difference between an ad valorem and a specific tariff?", "Ad valorem is a percentage of the customs value (e.g. 12%). Specific is a fixed amount per unit, kilo or litre (e.g. $0.50/kg). Compound tariffs combine both. A specific tariff hits cheap goods harder in percentage terms."],
    ["Your supplier in country B is 10% dearer, but B has a free-trade agreement with you. What do you need to check?", "The rules of origin. The FTA rate applies only if the goods count as 'originating' in B under the agreement, usually through enough local content or a change of tariff classification, and you need the paperwork (a certificate or declaration of origin) to claim it."],
    ["A 25% tariff on a $10 product: does the retail price rise by $2.50?", "Not necessarily. The supplier may cut its price, the importer may absorb part, and the retailer may pass on more or less than the duty. Studies of the 2018–19 US tariffs found import prices rose almost one for one (little absorbed by foreign suppliers), while retail prices rose less, so importers and retailers absorbed a share."],
    ["A tariff starts in 3 months. Should you stockpile?", "Compare the duty saved on each unit with the cost of holding it until it would otherwise have been bought: capital, storage, obsolescence risk. The first months of cover are cheap to hold; the last ones are dear. There's an optimal number of months, and it falls as the carrying rate rises or the tariff shrinks."],
    ["You import a component, assemble it and export the finished product. Do you pay duty on the component?", "Often you can reclaim it through duty drawback, or avoid it with a bonded warehouse, free trade zone or inward processing scheme. These exist so tariffs don't penalise re-exported goods."],
  ],
  diy: {
    intro: "Per-unit inputs for one source: FOB price in H1, insurance % of FOB in H2, international freight in H3, tariff rate in H4, specific duty $ per unit in H5, broker/port $ in H6, inland freight in H7.",
    steps: [
      ["Customs value: FOB, or CIF if your country values on CIF.", "H8: =H1+H1*H2+H3   (CIF)\nH8: =H1             (FOB basis)"],
      ["Duty: ad valorem part plus any specific part.", "H9: =H8*H4+H5"],
      ["Landed cost per unit.", "H10: =H1+H1*H2+H3+H9+H6+H7"],
      ["Repeat for each source in its own column and pick the cheapest landed cost, not the cheapest FOB.", "=INDEX(B1:D1,MATCH(MIN(B10:D10),B10:D10,0))"],
      ["Break-even tariff: the rate at which source A's landed cost equals source B's. Set up landed cost of A with the rate in H4, then Goal Seek H10 to B's landed cost by changing H4 (Data > What-If > Goal Seek). Or directly on an FOB basis:", "=(landed_B-(H1+H1*H2+H3+H5+H6+H7))/H1"],
      ["Who pays: supplier absorbs share s of the duty (lower FOB), customer pays share p through the price, importer the rest.", "new FOB: =H1-s*H9\nnew duty: =(new FOB basis)*H4+H5\nnew price: =price+p*new_duty\nimporter share: =1-s-p"],
      ["Volume effect of the price rise, with price elasticity e (e.g. −1.5).", "=units*(new_price/price)^e"],
      ["Stockpiling m months ahead of a tariff: duty saved vs. carrying cost. Units bought early arrive now and are used evenly over m months, so on average they're held m/2 months longer.", "saved: =m*monthly_units*duty_per_unit\ncost: =m*monthly_units*landed_before*carry_rate*(m/2)/12\nnet: =saved-cost"],
      ["Best stockpile (where one more month's saving equals its holding cost).", "=duty_per_unit*12/(landed_before*carry_rate)"],
    ],
  },
  deeper: [
    ["WTO, Tariffs: more bindings and closer to zero", "https://www.wto.org/english/thewto_e/whatis_e/tif_e/agrm2_e.htm", "the basics: bound vs applied rates"],
    ["WTO, Customs valuation", "https://www.wto.org/english/tratop_e/cusval_e/cusval_info_e.htm", "how customs value is set (transaction value, FOB vs CIF)"],
    ["World Customs Organization, What is the Harmonized System (HS)?", "https://www.wcoomd.org/en/topics/nomenclature/overview/what-is-the-harmonized-system.aspx", "the product codes that decide the rate"],
    ["WTO Tariff & Trade Data", "https://ttd.wto.org/", "look up any country's applied rates"],
    ["Amiti, Redding & Weinstein (2019), The impact of the 2018 tariffs on prices and welfare, J. Economic Perspectives 33(4)", "https://doi.org/10.1257/jep.33.4.187", "near-complete pass-through into US import prices"],
    ["Fajgelbaum, Goldberg, Kennedy & Khandelwal (2020), The return to protectionism, Quarterly J. Economics 135(1)", "https://doi.org/10.1093/qje/qjz036", "who paid for the 2018 tariffs, and the welfare cost"],
    ["Cavallo, Gopinath, Neiman & Tang (2021), Tariff pass-through at the border and at the store, AER: Insights 3(1)", "https://doi.org/10.1257/aeri.20190536", "import prices rose, retail prices much less: retailers absorbed it"],
    ["Tax incidence — Wikipedia", "https://en.wikipedia.org/wiki/Tax_incidence", "the textbook analysis of who bears a tax or tariff: it depends on elasticities, not on who writes the cheque"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="20" width="30" height="24" rx="2"/><path d="M38 32 h20" stroke-dasharray="3 3"/><path d="M58 14 v36" stroke-width="3"/><rect x="64" y="20" width="24" height="24" rx="2" fill="currentColor" opacity=".25"/><text x="76" y="37" font-size="13" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif">%</text></svg>`,

  mount(root) {
    const { Plot, watch, css } = Lab;
    const money = (v, d = 2) => (v < 0 ? "−" : "") + "$" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    const pct = (v, d = 1) => (v * 100).toFixed(d) + "%";
    let basis = "CIF", roo = true;
    const SRC = [
      { k: "A", name: "Country A (low cost)", fob: 8.0, frt: 1.2, ins: 0.5, col: "--accent" },
      { k: "B", name: "Country B (FTA partner)", fob: 9.0, frt: 0.9, ins: 0.5, col: "--good" },
      { k: "C", name: "Domestic supplier", fob: 10.6, frt: 0, ins: 0, col: "--violet" },
    ];
    const BROKER = 0.2, INLAND = 0.4;

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot" style="padding:14px">
          <h4 class="tf-h">1 · Landed cost per unit, by source</h4>
          <div id="stack"></div>
          <div id="stackLeg" class="legend" style="margin-top:8px"></div>
          <p class="hint" id="beNote" style="margin:8px 0 0"></p>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="tf-h">2 · Who pays the duty on country A, per year</h4>
          <div id="who"></div>
          <p class="hint" id="whoNote" style="margin:8px 0 0"></p>
        </div>
        <figure class="plot">
          <canvas id="pre" aria-label="Net benefit of stockpiling ahead of the tariff against months of stock bought early"></canvas>
          <div class="legend"><span><i style="background:var(--good)"></i>Duty saved</span><span><i style="background:var(--bad)"></i>Extra holding cost</span><span><i style="background:var(--ink)"></i>Net benefit</span></div>
          <figcaption>3 · Stockpiling from country A before the tariff starts: months of stock bought early.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 class="tf-h">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.tf-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .tf-row{display:grid;grid-template-columns:minmax(120px,190px) 1fr minmax(84px,auto);gap:10px;align-items:center;font-size:.86rem;padding:4px 0}
        .tf-row .v{font-family:var(--font-mono);text-align:right;font-variant-numeric:tabular-nums}
        .tf-track{position:relative;height:18px}
        .tf-bar{position:absolute;top:0;bottom:0}
        .tf-row.best span:first-child{font-weight:600}
        .tf-row.sub{border-top:1px solid var(--line);margin-top:2px;padding-top:6px;font-weight:600}
        @media (max-width:560px){.tf-row{grid-template-columns:104px 1fr 72px;font-size:.8rem}}</style>`,
      panel: `
        <div class="ctrl"><label for="rate">Tariff on country A <output id="rateV"></output></label><input type="range" id="rate" min="0" max="60" step="1" value="25"></div>
        <div class="ctrl"><label for="spec">Plus specific duty on A <output id="specV"></output></label><input type="range" id="spec" min="0" max="2" step="0.05" value="0"></div>
        <div class="ctrl"><label for="rateB">Country B's normal (non-FTA) rate <output id="rateBV"></output></label><input type="range" id="rateB" min="0" max="30" step="1" value="10"></div>
        <div class="ctrl"><label>Country B goods meet the FTA rules of origin</label>
          <div class="seg" id="roo"><button type="button" data-v="1" aria-pressed="true">Yes: 0%</button><button type="button" data-v="0" aria-pressed="false">No: normal rate</button></div></div>
        <div class="ctrl"><label>Duty is charged on</label>
          <div class="seg" id="basis"><button type="button" data-v="FOB" aria-pressed="false">FOB value</button><button type="button" data-v="CIF" aria-pressed="true">CIF value</button></div></div>
        <hr style="border:0;border-top:1px solid var(--line);margin:14px 0">
        <div class="ctrl"><label for="sup">Supplier absorbs (cuts its price) <output id="supV"></output></label><input type="range" id="sup" min="0" max="100" step="5" value="10"></div>
        <div class="ctrl"><label for="pass">Passed on to customers <output id="passV"></output></label><input type="range" id="pass" min="0" max="100" step="5" value="60"></div>
        <div class="ctrl"><label for="el">Price elasticity of demand <output id="elV"></output></label><input type="range" id="el" min="0" max="3" step="0.1" value="1.5"></div>
        <hr style="border:0;border-top:1px solid var(--line);margin:14px 0">
        <div class="ctrl"><label for="carry">Carrying cost rate <output id="carryV"></output></label><input type="range" id="carry" min="5" max="50" step="1" value="25"></div>
        <div class="ctrl"><label for="m">Months of stock bought early <output id="mV"></output></label><input type="range" id="m" min="0" max="36" step="1" value="6"></div>
        <div class="readouts" id="ro"></div>`,
      notes: `
        <section>
          <h2>How the duty is worked out</h2>
          <div class="eq">customs value = FOB (or CIF = FOB + insurance + freight)<br>duty = ad valorem rate × customs value + specific rate × quantity<br>landed cost = FOB + insurance + freight + duty + broker/port + inland freight</div>
          <p>Three things set the rate: the product's <b>HS code</b> (the 6-digit international classification, extended to 8–10 digits nationally), its <b>origin</b> (where it was last substantially transformed, not where it shipped from), and any <b>trade agreement</b> or extra duty (anti-dumping, countervailing, safeguard) that applies. Getting the classification or origin wrong is the most common source of surprise duty bills.</p>
        </section>
        <section>
          <h2>Who really pays</h2>
          <p>The importer pays customs, but the burden ends up split three ways. The <b>foreign supplier</b> may cut its price to keep the business; the <b>customer</b> may pay a higher price; the <b>importer</b> absorbs whatever is left as lower margin. Higher prices also sell fewer units, which loses margin on top. Economists call the split the tariff's <i>incidence</i>, and the share reaching customers the <i>pass-through</i>.</p>
          <p>Which way it goes depends on who has alternatives. A supplier with many other customers won't cut its price; a retailer whose customers can easily switch can't pass much on.</p>
        </section>
        <section>
          <h2>Ways businesses respond</h2>
          <ul>
            <li><b>Re-source</b> to a country with a lower rate or an FTA, after checking rules of origin and total landed cost.</li>
            <li><b>Stockpile</b> before a tariff starts, if the duty saved beats the holding cost (chart 3).</li>
            <li><b>Duty drawback, bonded warehouses and free trade zones</b> to avoid or reclaim duty on goods that are re-exported.</li>
            <li><b>Valuation and classification:</b> make sure assists, royalties and freight are treated correctly, and that the HS code is right. Some countries allow 'first sale' valuation on the factory price in multi-tier deals.</li>
          </ul>
          <p>Related: <a href="#cost-margin">landed cost and margin</a>, <a href="#carrying-cost">carrying cost</a>, <a href="#network-design">network design</a>, <a href="#roi">project ROI</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set A's tariff to 0: A is cheapest. Raise it until B takes over. That's the break-even rate shown under chart 1.</li>
            <li>Switch B's rules of origin to No: B pays its normal rate and may lose its advantage. Paperwork is worth real money.</li>
            <li>Switch duty basis to FOB: duty falls, because freight and insurance are no longer taxed.</li>
            <li>Set pass-through to 100% with elasticity 2: customers 'pay' the duty, but you still lose profit on the volume they stop buying.</li>
            <li>Raise the carrying cost to 45%: the best stockpile shrinks.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const P = new Plot($("#pre"), { x: [0, 36], y: [0, 1], pad: { l: 64, b: 40 } });
    const PRICE = 20, UNITS = 120000; // per year, product imported from A

    function landed(s, rate, spec, fob = s.fob) {
      const ins = fob * s.ins / 100, cif = fob + ins + s.frt;
      const base = basis === "CIF" ? cif : fob;
      const duty = base * rate + spec;
      const extra = s.k === "C" ? 0 : BROKER + INLAND;
      return { fob, ins, frt: s.frt, cif, base, duty, extra, total: cif + duty + extra + (s.k === "C" ? 0.3 : 0) };
    }

    function draw() {
      const rate = +$("#rate").value / 100, spec = +$("#spec").value, rateB = roo ? 0 : +$("#rateB").value / 100;
      const sup = +$("#sup").value / 100, pass = +$("#pass").value / 100, el = +$("#el").value, carry = +$("#carry").value / 100, m = +$("#m").value;
      $("#rateV").textContent = pct(rate, 0); $("#specV").textContent = money(spec) + "/unit"; $("#rateBV").textContent = pct(+$("#rateB").value / 100, 0);
      $("#supV").textContent = pct(sup, 0); $("#passV").textContent = pct(pass, 0); $("#elV").textContent = "−" + el.toFixed(1);
      $("#carryV").textContent = pct(carry, 0) + " / yr"; $("#mV").textContent = m;
      if (sup + pass > 1) { $("#pass").value = Math.round((1 - sup) * 100); return draw(); }

      // ---- 1. landed cost by source
      const L = [landed(SRC[0], rate, spec), landed(SRC[1], rateB, 0), landed(SRC[2], 0, 0)];
      const scale = Math.max(...L.map((l) => l.total)) * 1.05;
      const bestI = L.reduce((b, l, i) => (l.total < L[b].total ? i : b), 0);
      const bar = (from, w, col) => `<div class="tf-bar" style="left:${(from / scale) * 100}%;width:${Math.max(0, (w / scale) * 100)}%;background:var(${col})"></div>`;
      const parts = [["Supplier price", "fob", "--accent"], ["Insurance + freight", null, "--warm"], ["Duty", "duty", "--bad"], ["Broker, port, inland", "extra", "--muted"]];
      $("#stack").innerHTML = L.map((l, i) => {
        const segs = [[l.fob, parts[0][2]], [l.ins + l.frt + (SRC[i].k === "C" ? 0.3 : 0), parts[1][2]], [l.duty, parts[2][2]], [l.extra, parts[3][2]]];
        let x = 0; const h = segs.map(([v, c]) => { const b = bar(x, v, c); x += v; return b; }).join("");
        return `<div class="tf-row${i === bestI ? " best" : ""}"><span>${SRC[i].name}${i === bestI ? " ✓" : ""}</span><div class="tf-track">${h}</div><span class="v">${money(l.total)}${l.duty ? `<br><small style="color:var(--bad)">duty ${money(l.duty)}</small>` : ""}</span></div>`;
      }).join("");
      $("#stackLeg").innerHTML = parts.map(([t, , c]) => `<span><i style="background:var(${c})"></i>${t}</span>`).join("");
      // break-even tariff on A vs the cheaper of B and C
      const alt = Math.min(L[1].total, L[2].total), noTar = landed(SRC[0], 0, spec);
      const be = (alt - noTar.total) / noTar.base;
      $("#beNote").innerHTML = be <= 0 ? `Country A is dearer than the alternatives even with no ad valorem tariff.` :
        `Break-even: country A stays cheapest up to a tariff of <b>${pct(be)}</b>. Above that, ${L[1].total <= L[2].total ? "country B" : "the domestic supplier"} wins on landed cost (${money(alt)}).`;

      // ---- 2. who pays (country A)
      const a0 = landed(SRC[0], 0, 0), a1 = landed(SRC[0], rate, spec);
      const fob2 = SRC[0].fob - sup * a1.duty, a2 = landed(SRC[0], rate, spec, fob2);
      const price2 = PRICE + pass * a2.duty, units2 = UNITS * Math.pow(price2 / PRICE, -el);
      const prof0 = (PRICE - a0.total) * UNITS, prof2 = (price2 - a2.total) * units2;
      const dutyPaid = a2.duty * units2;
      const custPays = (price2 - PRICE) * units2, supPays = (SRC[0].fob - fob2) * units2;
      const impMargin = prof0 - prof2; // importer's total profit loss
      const lostVol = (PRICE - a0.total) * (UNITS - units2);
      const rows = [
        ["Duty paid to customs", dutyPaid, "--bad"],
        ["Supplier's price cut", supPays, "--accent"],
        ["Customers' higher price", custPays, "--warm"],
        ["Importer's lower margin", Math.max(0, impMargin - lostVol), "--violet"],
        ["Margin on lost volume", lostVol, "--muted"],
      ];
      const mx = Math.max(...rows.map((r) => Math.abs(r[1])), 1);
      $("#who").innerHTML = rows.map(([t, v, c], i) => `<div class="tf-row${i === 0 ? " sub" : ""}" ${i === 0 ? 'style="border-top:0;margin:0;padding-top:4px"' : ""}><span>${t}</span><div class="tf-track"><div class="tf-bar" style="left:0;width:${(Math.abs(v) / mx) * 100}%;background:var(${c});border-radius:3px"></div></div><span class="v">${money(v, 0)}</span></div>`).join("")
        + `<div class="tf-row sub"><span>Importer's profit</span><div class="tf-track"></div><span class="v">${money(prof0, 0)} → ${money(prof2, 0)}</span></div>`;
      $("#whoNote").innerHTML = `Selling price ${money(PRICE)} → ${money(price2)}, volume ${Math.round(UNITS).toLocaleString()} → ${Math.round(units2).toLocaleString()} units a year. Of the ${money(dutyPaid, 0)} duty, the supplier carries ${pct(supPays / dutyPaid || 0, 0)} and customers ${pct(custPays / dutyPaid || 0, 0)}. The importer loses ${money(impMargin, 0)} of profit in total, including the margin on units no longer sold.`;

      // ---- 3. pre-buy
      const monthly = UNITS / 12, dpu = a1.duty, val = a0.total;
      const sav = (k) => k * monthly * dpu, cost = (k) => k * monthly * val * carry * (k / 2) / 12;
      const ks = []; for (let k = 0; k <= 36; k += 0.5) ks.push(k);
      const best = Math.min(36, dpu * 12 / (val * carry));
      const ymax = Math.max(sav(36), cost(36) * 0.6, 1), ymin = Math.min(0, ...ks.map((k) => sav(k) - cost(k)));
      P.y = [Math.max(ymin, -ymax * 0.6), ymax * 1.05];
      P.clear(); P.axes({ xLabel: "months of stock bought before the tariff", yLabel: "$", xCount: 7, yCount: 5, yFormat: (v) => (Math.abs(v) >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "m" : "$" + Math.round(v / 1000) + "k") });
      P.path([0, 36], [0, 0], css("--muted"), 1, [4, 4]);
      P.path(ks, ks.map(sav), css("--good"), 2.2);
      P.path(ks, ks.map(cost), css("--bad"), 2.2);
      P.path(ks, ks.map((k) => sav(k) - cost(k)), css("--ink"), 2.6);
      if (dpu > 0) P.dot(best, sav(best) - cost(best), 5, css("--ink"), css("--surface"));
      P.dot(m, sav(m) - cost(m), 6, css("--accent"), css("--surface"));

      $("#ro").innerHTML = `
        <div class="ro"><b>Cheapest source</b><span>${SRC[bestI].name.split(" (")[0]}</span></div>
        <div class="ro"><b>Duty on A / unit</b><span class="num">${money(a1.duty)}</span></div>
        <div class="ro"><b>Break-even tariff on A</b><span class="num">${be > 0 ? pct(be) : "—"}</span></div>
        <div class="ro"><b>Importer profit</b><span class="num">${money(prof0, 0)} → ${money(prof2, 0)}</span></div>
        <div class="ro"><b>Stockpile ${m} months</b><span class="num">${money(sav(m) - cost(m), 0)} net</span></div>
        <div class="ro"><b>Best stockpile</b><span class="num">${dpu > 0 ? best.toFixed(1) + " months" : "—"}</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      const s0 = SRC[0];
      $("#work").innerHTML = [
        `A: CIF = ${money(s0.fob)} + ${s0.ins}% insurance ${money(a1.ins)} + freight ${money(s0.frt)} = ${money(a1.cif)}; customs value (${basis}) = ${B(money(a1.base))}`,
        `A: duty = ${pct(rate, 0)} × ${money(a1.base)}${spec ? ` + ${money(spec)} specific` : ""} = ${B(money(a1.duty))}; landed = ${money(a1.cif)} + ${money(a1.duty)} + broker ${money(BROKER)} + inland ${money(INLAND)} = ${B(money(a1.total))}`,
        `B: rate ${pct(rateB, 0)}${roo ? M(" (FTA, origin proven)") : M(" (normal rate, origin not proven)")} → duty ${money(L[1].duty)}, landed ${B(money(L[1].total))}; domestic landed ${B(money(L[2].total))}`,
        `break-even rate on A = (${money(alt)} − ${money(noTar.total)}) ÷ ${money(noTar.base)} = ${B(be > 0 ? pct(be) : "n/a")}`,
        `supplier cuts FOB by ${pct(sup, 0)} × ${money(a1.duty)} = ${money(SRC[0].fob - fob2)} → new duty ${money(a2.duty)}; price +${pct(pass, 0)} × ${money(a2.duty)} = ${B(money(price2))}`,
        `volume = ${UNITS.toLocaleString()} × (${money(price2)} ÷ ${money(PRICE)})^−${el.toFixed(1)} = ${B(Math.round(units2).toLocaleString())}; profit = (${money(price2)} − ${money(a2.total)}) × ${Math.round(units2).toLocaleString()} = ${B(money(prof2, 0))}`,
        `stockpile ${m} months: saved ${m} × ${Math.round(monthly).toLocaleString()} × ${money(dpu)} = ${money(sav(m), 0)}; holding ${m} × ${Math.round(monthly).toLocaleString()} × ${money(val)} × ${pct(carry, 0)} × ${(m / 2).toFixed(1)}/12 = ${money(cost(m), 0)} → net ${B(money(sav(m) - cost(m), 0))}`,
        `best stockpile = duty × 12 ÷ (landed × carrying rate) = ${money(dpu)} × 12 ÷ (${money(val)} × ${pct(carry, 0)}) = ${B(dpu > 0 ? best.toFixed(1) + " months" : "—")} ${M("(ignores storage limits and obsolescence risk)")}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    const seg = (id, set) => $(id).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; set(b.dataset.v); $(id).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    seg("#roo", (v) => (roo = v === "1"));
    seg("#basis", (v) => (basis = v));
    ["#rate", "#spec", "#rateB", "#sup", "#pass", "#el", "#carry", "#m"].forEach((s) => $(s).addEventListener("input", draw));
    draw();
    return watch([P.c], (resized) => { if (resized) P.resize(); draw(); });
  },
});
