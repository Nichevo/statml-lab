Lab.register({
  id: "carrying-cost",
  group: "Supply chain",
  title: "Inventory carrying cost",
  blurb: "Build the yearly cost of holding stock from capital, space, insurance, obsolescence and shrink, and see what cutting inventory is really worth.",
  lede: "Stock sitting in a warehouse costs money every day, even though no invoice says so. The money is tied up instead of earning a return, the space has to be paid for, some of it gets damaged, stolen or goes out of date. Added up, holding stock typically costs 20–30% of its value a year. That rate decides how much it's worth paying to hold less, through better forecasts, shorter lead times or smaller, more frequent orders.",
  quiz: [
    ["Average inventory is $2m and the carrying rate is 25%. What does holding it cost per year?", "25% × $2m = $500k a year. It's charged on the average value held, at cost (not at selling price)."],
    ["If you halve the order quantity, what happens to average cycle stock?", "It halves too. Average cycle stock is Q/2: you start each cycle with Q and run down to zero. Safety stock is unchanged."],
    ["Your warehouse lease is fixed for 5 years. Should storage be in the carrying rate when you value a stock cut?", "Not in the short run. You only save storage if you can release space or avoid an extension. Use the marginal rate: the costs that actually change when stock changes."],
    ["Why use the cost of capital, not the bank interest rate?", "Money tied up in stock could otherwise be used elsewhere in the business, which is expected to earn the company's cost of capital (WACC), usually higher than a deposit rate."],
  ],
  deeper: [
    ["Carrying cost — Wikipedia", "https://en.wikipedia.org/wiki/Carrying_cost", "the components"],
    ["Weighted average cost of capital — Wikipedia", "https://en.wikipedia.org/wiki/Weighted_average_cost_of_capital", "where the capital charge comes from"],
    ["Economic order quantity — Wikipedia", "https://en.wikipedia.org/wiki/Economic_order_quantity", "the trade-off between ordering and holding"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 18 L8 54 L30 54 L30 18 Z" fill="currentColor" fill-opacity=".15"/><path d="M8 54 h22 M8 40 h22 M8 30 h22 M8 24 h22"/><path d="M40 20 L52 50 L52 20 L64 50 L64 20 L76 50 L76 20 L88 50" opacity=".6"/></svg>`,

  mount(root) {
    const { Plot, watch, css, fmt } = Lab;
    const money = (v) => (v < 0 ? "−" : "") + "$" + Math.round(Math.abs(v)).toLocaleString("en-US");
    const PARTS = [
      ["cap", "Cost of capital", 10, "--accent", "The return the business could earn on that money elsewhere (WACC)."],
      ["store", "Storage and space", 5, "--violet", "Rent, racking, utilities. Often fixed in the short run."],
      ["ins", "Insurance and taxes", 1.5, "--muted", "Insuring stock; some countries tax inventory."],
      ["obs", "Obsolescence", 6, "--bad", "Stock that expires, goes out of fashion or is superseded."],
      ["shr", "Shrink and damage", 1.5, "--warm", "Theft, breakage, losses in counts."],
      ["hand", "Handling and counting", 1, "--good", "Moving, re-slotting and cycle counting stock that sits."],
    ];

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot" style="padding:14px">
          <h4 class="cc-h">The carrying rate, built up</h4>
          <div id="stack" style="display:flex;height:34px;border-radius:6px;overflow:hidden;border:1px solid var(--line)"></div>
          <div id="parts" style="margin-top:12px;display:grid;gap:6px"></div>
        </div>
        <figure class="plot wide">
          <canvas id="ccs" aria-label="Inventory over a year: cycle stock sawtooth on top of safety stock"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>Stock on hand</span><span><i style="background:var(--warm)"></i>Average stock</span><span><i style="background:var(--violet)"></i>Safety stock</span></div>
          <figcaption>Stock rises with each delivery of Q units and runs down. Average = Q/2 + safety stock. That average is what you pay carrying cost on.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 class="cc-h">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.cc-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .cc-p{display:grid;grid-template-columns:14px minmax(110px,170px) 1fr 54px;gap:10px;align-items:center;font-size:.86rem}
        .cc-p input{width:100%}.cc-p small{display:block;color:var(--muted);font-size:.76rem}
        @media (max-width:560px){.cc-p{grid-template-columns:12px 1fr 54px}.cc-p .cc-r{grid-column:2/4}}</style>`,
      panel: `
        <label style="display:flex;gap:8px;align-items:center;font-size:.9rem"><input type="checkbox" id="fixed"> Space is fixed (long lease)</label>
        <div class="ctrl"><label for="D">Annual demand (units) <output id="DV"></output></label><input type="range" id="D" min="1000" max="200000" step="1000" value="52000"></div>
        <div class="ctrl"><label for="c">Unit cost <output id="cV"></output></label><input type="range" id="c" min="1" max="200" step="1" value="20"></div>
        <div class="ctrl"><label for="Q">Order quantity Q <output id="QV"></output></label><input type="range" id="Q" min="250" max="20000" step="250" value="4000"></div>
        <div class="ctrl"><label for="ss">Safety stock (units) <output id="ssV"></output></label><input type="range" id="ss" min="0" max="10000" step="100" value="1500"></div>
        <div class="ctrl"><label for="S">Cost per order <output id="SV"></output></label><input type="range" id="S" min="0" max="1000" step="10" value="150"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="eoq" type="button">Set Q to EOQ</button></div>`,
      notes: `
        <section>
          <h2>Carrying cost</h2>
          <div class="eq">carrying rate h = capital + storage + insurance + obsolescence + shrink + handling<br>yearly carrying cost = h × average inventory value<br>average inventory = Q/2 + safety stock</div>
          <p>The rate is applied to stock valued at <b>cost</b> (landed cost), not selling price. It is an <i>opportunity</i> cost for the most part: no single invoice shows it, which is why it's easy to underestimate.</p>
        </section>
        <section>
          <h2>Marginal vs average</h2>
          <p>When you value a stock reduction, include only the costs that will actually change. Capital, obsolescence and shrink scale with stock straight away. Storage only falls if you release space or avoid paying for more. Tick "Space is fixed" to see the short-run rate.</p>
        </section>
        <section>
          <h2>Ordering vs holding</h2>
          <p>Smaller, more frequent orders cut cycle stock but cost more in ordering (transport, admin, set-ups). The <b>economic order quantity</b> balances the two:</p>
          <div class="eq">EOQ = √(2 × D × S ÷ (h × c))</div>
          <p>At the EOQ, yearly ordering cost equals yearly holding cost of cycle stock.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Tick "Space is fixed". The rate drops, and so does the yearly value of cutting stock. The cash release doesn't change.</li>
            <li>Raise obsolescence to 20% (fashion, tech, fresh food). Holding stock now costs as much as the capital tied up.</li>
            <li>Press "Set Q to EOQ", then halve the cost per order. EOQ falls by about 30% (√½), not by half.</li>
            <li>Drag safety stock up. Average stock rises one-for-one: safety stock is always there.</li>
          </ol>
          <p>Related: <a href="#cost-margin">landed cost and margin</a>, <a href="#reorder-point">reorder point and EOQ</a>, <a href="#forecast-value">value of a better forecast</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    $("#parts").innerHTML = PARTS.map(([k, l, v, c, h]) => `<div class="cc-p"><i style="width:12px;height:12px;border-radius:3px;background:var(${c})"></i><span>${l}<small>${h}</small></span><input class="cc-r" type="range" data-k="${k}" min="0" max="25" step="0.5" value="${v}" aria-label="${l} %"><output class="num" id="o-${k}"></output></div>`).join("");
    const pS = new Plot($("#ccs"), { x: [0, 52], pad: { l: 64 } });

    function draw() {
      const fixed = $("#fixed").checked;
      const vals = PARTS.map(([k, , , c]) => { const v = +root.querySelector(`[data-k="${k}"]`).value; $("#o-" + k).textContent = v.toFixed(1) + "%"; return [k, v, c]; });
      const rate = vals.reduce((s, [k, v]) => s + (fixed && k === "store" ? 0 : v), 0);
      const full = vals.reduce((s, [, v]) => s + v, 0);
      $("#stack").innerHTML = vals.map(([k, v, c]) => `<div title="${k}" style="flex:${v} 0 0;background:var(${c});opacity:${fixed && k === "store" ? 0.2 : 1}"></div>`).join("");

      const D = +$("#D").value, c = +$("#c").value, Q = +$("#Q").value, ss = +$("#ss").value, S = +$("#S").value, h = rate / 100;
      $("#DV").textContent = D.toLocaleString(); $("#cV").textContent = "$" + c; $("#QV").textContent = Q.toLocaleString(); $("#ssV").textContent = ss.toLocaleString(); $("#SV").textContent = "$" + S;
      const avg = Q / 2 + ss, avgV = avg * c, carryY = avgV * h, orders = D / Q, orderY = orders * S, eoq = h > 0 ? Math.sqrt((2 * D * S) / (h * c)) : Infinity;

      // sawtooth
      const per = (Q / D) * 52, xs = [], ys = [];
      for (let t = 0; t < 52; t += per) { const e = Math.min(52, t + per); xs.push(t, e); ys.push(ss + Q, ss + Q - ((e - t) / per) * Q); }
      pS.y = [0, (ss + Q) * 1.15];
      pS.clear(); pS.axes({ xLabel: "week", yLabel: "units on hand", xTicks: [0, 13, 26, 39, 52], yCount: 4 });
      pS.path([0, 52], [ss, ss], css("--violet"), 2, [5, 4]);
      pS.path([0, 52], [avg, avg], css("--warm"), 2, [5, 4]);
      pS.path(xs, ys, css("--accent"), 2.2);

      $("#ro").innerHTML = `
        <div class="ro"><b>Carrying rate</b><span class="num">${rate.toFixed(1)}%${fixed ? ` <small style="color:var(--muted)">(full ${full.toFixed(1)}%)</small>` : ""}</span></div>
        <div class="ro"><b>Average stock value</b><span class="num">${money(avgV)}</span></div>
        <div class="ro"><b>Carrying cost / yr</b><span class="num">${money(carryY)}</span></div>
        <div class="ro"><b>Ordering cost / yr</b><span class="num">${money(orderY)}</span></div>
        <div class="ro"><b>EOQ</b><span class="num">${isFinite(eoq) ? Math.round(eoq).toLocaleString() : "∞"}</span></div>
        <div class="ro"><b>$1m less stock is worth</b><span class="pill ok">${money(1e6 * h)}/yr</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      $("#work").innerHTML = [
        `rate = ${vals.map(([k, v]) => (fixed && k === "store" ? M("0") : v.toFixed(1))).join(" + ")} = ${B(rate.toFixed(1) + "%")}`,
        `average stock = Q/2 + SS = ${Q.toLocaleString()}/2 + ${ss.toLocaleString()} = ${B(avg.toLocaleString())} units × $${c} = ${money(avgV)}`,
        `carrying = ${rate.toFixed(1)}% × ${money(avgV)} = ${B(money(carryY))}/yr ${M(`($${(carryY / D).toFixed(2)} per unit sold, ${fmt(carryY / D / c * 100, 1)}% of its cost)`)}`,
        `ordering = ${D.toLocaleString()} ÷ ${Q.toLocaleString()} = ${fmt(orders, 1)} orders × $${S} = ${B(money(orderY))}/yr`,
        `EOQ = √(2 × ${D.toLocaleString()} × ${S} ÷ (${(h).toFixed(3)} × ${c})) = ${B(isFinite(eoq) ? Math.round(eoq).toLocaleString() : "∞")}`,
        `cut stock by $1m → ${B(money(1e6 * h))} a year of profit + $1,000,000 cash released once`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    root.querySelectorAll("input").forEach((i) => i.addEventListener("input", draw));
    $("#eoq").addEventListener("click", () => {
      const D = +$("#D").value, c = +$("#c").value, S = +$("#S").value;
      const rate = PARTS.reduce((s, [k]) => s + ($("#fixed").checked && k === "store" ? 0 : +root.querySelector(`[data-k="${k}"]`).value), 0) / 100;
      if (rate > 0) { $("#Q").value = Math.round(Math.sqrt((2 * D * S) / (rate * c)) / 250) * 250; draw(); }
    });
    draw();
    return watch([pS.c], (resized) => { if (resized) pS.resize(); draw(); });
  },
});
