Lab.register({
  id: "moq",
  group: "Supply chain",
  title: "MOQs and price breaks: is the discount worth it?",
  blurb: "A supplier offers 4% off if you order 5,000. Weigh the cheaper price against the extra stock, carrying cost and risk of being left with it.",
  lede: "Suppliers set minimum order quantities and offer lower prices for bigger orders. A bigger order saves money on every unit bought and on ordering, but it brings in stock you won't sell for weeks or months. That stock ties up cash, costs space, and might go out of date. The right question isn't \"is 4% a good discount?\" but \"what is the total yearly cost at each order size?\"",
  quiz: [
    ["Why isn't the cheapest unit price automatically the best choice?", "The order size needed for it raises average stock (Q/2), and carrying cost on that stock can outweigh the price saving, especially for slow movers or expensive items."],
    ["How do you find the best order size with all-units price breaks?", "For each price tier, work out the EOQ at that price. If it falls below the tier's minimum, bump it up to the minimum. Compare total yearly cost (purchase + ordering + holding) across tiers and pick the cheapest."],
    ["The best option is 26 weeks of cover, but the product has a 13-week shelf life. What now?", "The model's answer is infeasible. Cap the order at what you can sell within shelf life (minus a safety margin), or price in the expected write-off. Obsolescence risk grows with cover."],
    ["A supplier's MOQ is 3× your EOQ. What can you negotiate?", "A lower MOQ for a small price premium, splitting the MOQ across several delivery dates, or sharing the MOQ with sister products from the same supplier."],
  ],
  diy: {
    intro: "Annual demand D in H1, order cost S in H2, carrying rate h in H3. Price breaks: minimum quantities in A2:A5, prices in B2:B5.",
    steps: [
      ["Price for a quantity Q.", "=LOOKUP(Q,$A$2:$A$5,$B$2:$B$5)"],
      ["EOQ at each price, raised to that break's minimum if below.", "C2: =MAX(A2,SQRT(2*$H$1*$H$2/($H$3*B2)))"],
      ["Total yearly cost at that Q.", "D2: =$H$1*B2+$H$1/C2*$H$2+C2/2*B2*$H$3"],
      ["Best option.", "=INDEX(C2:C5,MATCH(MIN(D2:D5),D2:D5,0))"],
      ["Cost of a supplier MOQ above your EOQ.", "=total(MOQ)-total(EOQ)"],
    ],
  },
  deeper: [
    ["Economic order quantity — Wikipedia (quantity discounts)", "https://en.wikipedia.org/wiki/Economic_order_quantity#Quantity_discounts", "the all-units discount method"],
    ["Minimum order quantity — Wikipedia", "https://en.wikipedia.org/wiki/Minimum_order_quantity", "why suppliers set them"],
    ["Volume discount — Wikipedia", "https://en.wikipedia.org/wiki/Volume_discount", "pricing structures"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 14 h24 v14 h24 v10 h32"/><path d="M8 56 C 30 30, 60 30, 88 50" opacity=".5"/><circle cx="56" cy="38" r="4" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, watch, css } = Lab;
    const money = (v) => (v < 0 ? "−" : "") + "$" + Math.round(Math.abs(v)).toLocaleString("en-US");
    let TIERS = [[0, 10.0], [2000, 9.7], [5000, 9.6], [10000, 9.4]];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="mq" aria-label="Total yearly cost against order quantity with price breaks"></canvas>
          <div class="legend"><span><i style="background:var(--ink)"></i>Total cost / yr</span><span><i style="background:var(--accent)"></i>Purchase cost (above the cheapest)</span><span><i style="background:var(--violet)"></i>Holding</span><span><i style="background:var(--warm)"></i>Ordering</span><span><i style="background:var(--good)"></i>Best</span></div>
          <figcaption>Each price break makes the total drop in a step. Between breaks, holding rises with the order size. The shaded zone is past the shelf life.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 class="mq-h">Price tiers (edit)</h4>
          <div style="overflow-x:auto"><table id="tiers" class="mq-t"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="mq-h">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.mq-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .mq-t{width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums}
        .mq-t th{text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500;white-space:nowrap}
        .mq-t td{text-align:right;padding:4px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono);white-space:nowrap}
        .mq-t input{width:80px;font:inherit;padding:3px 5px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink);text-align:right}</style>`,
      panel: `
        <div class="ctrl"><label for="D">Annual demand <output id="DV"></output></label><input type="range" id="D" min="1000" max="100000" step="1000" value="26000"></div>
        <div class="ctrl"><label for="S">Cost per order <output id="SV"></output></label><input type="range" id="S" min="0" max="1000" step="10" value="200"></div>
        <div class="ctrl"><label for="h">Carrying cost rate <output id="hV"></output></label><input type="range" id="h" min="5" max="50" step="1" value="25"></div>
        <div class="ctrl"><label for="life">Shelf life <output id="lifeV"></output></label><input type="range" id="life" min="4" max="104" step="1" value="26"></div>
        <div class="ctrl"><label for="Q">Your order quantity <output id="QV"></output></label><input type="range" id="Q" min="100" max="15000" step="100" value="2000"></div>
        <div class="readouts" id="ro"></div>`,
      notes: `
        <section>
          <h2>Total yearly cost</h2>
          <div class="eq">purchase = D × price(Q)<br>ordering = D ÷ Q × S<br>holding = Q ÷ 2 × price(Q) × h<br>total = purchase + ordering + holding</div>
          <p>With <b>all-units</b> discounts, the lower price applies to every unit in the order once Q reaches the break.</p>
        </section>
        <section>
          <h2>The method</h2>
          <ol>
            <li>For each tier, compute EOQ = √(2DS ÷ (h × price)).</li>
            <li>If EOQ is below the tier's minimum, use the minimum.</li>
            <li>If it's above the tier's range, that tier's best point is already covered by a cheaper tier.</li>
            <li>Compare total cost at each candidate. Then check cover against shelf life.</li>
          </ol>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Halve demand. The bigger breaks stop paying, because each unit sits in stock twice as long.</li>
            <li>Raise the carrying rate to 40% (fast-moving fashion or tech). The best Q drops back.</li>
            <li>Shorten shelf life to 10 weeks. The best affordable option may be infeasible.</li>
            <li>Change the 10,000 tier price to $9.00. A deep enough discount justifies very large orders.</li>
          </ol>
          <p>Related: <a href="#carrying-cost">carrying cost and EOQ</a>, <a href="#reorder-point">reorder point</a>, <a href="#newsvendor">newsvendor</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pM = new Plot($("#mq"), { x: [0, 15000], pad: { l: 70 } });
    const price = (q) => TIERS.reduce((p, [m, pr]) => (q >= m ? pr : p), TIERS[0][1]);

    function buildTiers() {
      $("#tiers").innerHTML = `<tr><th style="text-align:left">Tier</th><th>Min order</th><th>Unit price</th><th>EOQ at this price</th><th>Candidate Q</th><th>Total cost / yr</th><th>Weeks of cover</th></tr>` + TIERS.map(([m, p], i) =>
        `<tr><td style="text-align:left;font-family:var(--font-body)">${i + 1}</td><td>${i === 0 ? "0" : `<input type="number" min="1" step="100" value="${m}" data-i="${i}" data-k="0" aria-label="Tier ${i + 1} minimum">`}</td><td><input type="number" min="0.01" step="0.05" value="${p}" data-i="${i}" data-k="1" aria-label="Tier ${i + 1} price"></td><td id="eoq${i}"></td><td id="cq${i}"></td><td id="tc${i}"></td><td id="wk${i}"></td></tr>`).join("");
    }

    function draw() {
      const D = +$("#D").value, S = +$("#S").value, h = +$("#h").value / 100, life = +$("#life").value, Q = +$("#Q").value;
      $("#DV").textContent = D.toLocaleString() + " units"; $("#SV").textContent = "$" + S; $("#hV").textContent = Math.round(h * 100) + "%"; $("#lifeV").textContent = life + " weeks"; $("#QV").textContent = Q.toLocaleString();
      const T = TIERS;
      const cost = (q) => { const p = price(q); return { p, buy: D * p, ord: (D / q) * S, hold: (q / 2) * p * h, tot: D * p + (D / q) * S + (q / 2) * p * h }; };
      const maxQ = Math.max(15000, T[T.length - 1][0] * 1.3);
      pM.x = [0, maxQ]; $("#Q").max = maxQ;

      const cands = T.map(([m, p], i) => {
        const eoq = Math.sqrt((2 * D * S) / (h * p)), hiB = i < T.length - 1 ? T[i + 1][0] - 1 : Infinity;
        const q = Math.max(m, Math.min(eoq, hiB), 1);
        return { m, p, eoq, q, c: cost(q), cover: (q / D) * 52, valid: eoq <= hiB || m > 0 };
      });
      const feasible = cands.filter((c) => c.cover <= life);
      const best = cands.reduce((a, b) => (b.c.tot < a.c.tot ? b : a));
      const bestOk = feasible.length ? feasible.reduce((a, b) => (b.c.tot < a.c.tot ? b : a)) : null;

      const qs = Array.from({ length: 400 }, (_, i) => 50 + (i / 399) * (maxQ - 50)), cs = qs.map(cost);
      const pmin = Math.min(...T.map((t) => t[1])), base = D * pmin;
      const tots = cs.map((c) => c.tot - base);
      pM.y = [0, Math.min(Math.max(...tots), Math.min(...tots) * 4) * 1.05];
      pM.clear(); pM.axes({ xLabel: "order quantity", yLabel: "cost / yr above D × lowest price", yFormat: (v) => "$" + (v >= 1000 ? Math.round(v / 1000) + "k" : v), yCount: 4 });
      const lifeQ = (life / 52) * D;
      if (lifeQ < maxQ) { const g = pM.ctx; g.fillStyle = css("--bad"); g.globalAlpha = 0.08; g.fillRect(pM.sx(lifeQ), pM.pad.t, pM.sx(maxQ) - pM.sx(lifeQ), pM.ih); g.globalAlpha = 1; }
      pM.path(qs, cs.map((c) => c.buy - base), css("--accent"), 1.6);
      pM.path(qs, cs.map((c) => c.hold), css("--violet"), 1.6);
      pM.path(qs, cs.map((c) => c.ord), css("--warm"), 1.6);
      pM.path(qs, tots, css("--ink"), 2.6);
      const bp = bestOk || best;
      pM.dot(bp.q, bp.c.tot - base, 7, css("--good"), css("--surface"));
      const my = cost(Q); pM.dot(Q, my.tot - base, 5, css("--ink"), css("--surface"));

      cands.forEach((c, i) => {
        const r = (id, v) => { const e = $(`#${id}${i}`); if (e) e.innerHTML = v; };
        r("eoq", Math.round(c.eoq).toLocaleString()); r("cq", Math.round(c.q).toLocaleString());
        r("tc", `<span style="${c === bp ? "color:var(--good);font-weight:700" : ""}">${money(c.c.tot)}</span>`);
        r("wk", `<span style="color:${c.cover > life ? "var(--bad)" : "inherit"}">${c.cover.toFixed(1)}${c.cover > life ? " ✕" : ""}</span>`);
      });

      $("#ro").innerHTML = `
        <div class="ro"><b>Best order size</b><span class="pill ${bestOk ? "ok" : "bad"}">${bestOk ? Math.round(bestOk.q).toLocaleString() : "none fits shelf life"}</span></div>
        <div class="ro"><b>Its total / yr</b><span class="num">${money(bp.c.tot)}</span></div>
        <div class="ro"><b>Your Q total / yr</b><span class="num">${money(my.tot)}</span></div>
        <div class="ro"><b>Your Q vs best</b><span class="num">${my.tot - bp.c.tot >= 0 ? "+" : ""}${money(my.tot - bp.c.tot)}</span></div>
        <div class="ro"><b>Your cover</b><span class="num">${((Q / D) * 52).toFixed(1)} weeks</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      $("#work").innerHTML = [
        `your Q = ${Q.toLocaleString()} → price $${my.p.toFixed(2)}`,
        `purchase = ${D.toLocaleString()} × $${my.p.toFixed(2)} = ${money(my.buy)}`,
        `ordering = ${D.toLocaleString()} ÷ ${Q.toLocaleString()} × $${S} = ${money(my.ord)}`,
        `holding = ${Q.toLocaleString()} ÷ 2 × $${my.p.toFixed(2)} × ${Math.round(h * 100)}% = ${money(my.hold)}`,
        `total = ${B(money(my.tot))} ${M(`(best: Q = ${Math.round(bp.q).toLocaleString()} at $${bp.p.toFixed(2)}, ${money(bp.c.tot)})`)}`,
        best !== bp ? `cheapest overall is Q = ${Math.round(best.q).toLocaleString()} (${money(best.c.tot)}), but that's ${best.cover.toFixed(0)} weeks of cover: past the ${life}-week shelf life` : `the best option fits within the ${life}-week shelf life`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    buildTiers();
    $("#tiers").addEventListener("input", (e) => { const t = e.target; if (!t.dataset.i || t.value === "" || +t.value <= 0) return; TIERS[+t.dataset.i][+t.dataset.k] = +t.value; draw(); });
    ["#D", "#S", "#h", "#life", "#Q"].forEach((s) => $(s).addEventListener("input", draw));
    draw();
    return watch([pM.c], (resized) => { if (resized) pM.resize(); draw(); });
  },
});
