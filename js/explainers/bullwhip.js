Lab.register({
  id: "bullwhip-effect",
  group: "Supply chain",
  title: "The bullwhip effect",
  blurb: "A small wobble in shopper demand becomes a big swing in factory orders. Simulate a four-stage supply chain and see which habits make it worse.",
  lede: "Each stage of a supply chain only sees the orders from the stage below it. When every stage forecasts from those orders, adds a lead time's worth of cover and reorders, small changes in real demand grow at every step. By the time the signal reaches the factory, it swings far more than shoppers ever did. That growth is the bullwhip effect.",
  quiz: [
    ["Shoppers buy exactly 100 a week, every week. Is there any bullwhip?", "No. With perfectly steady demand every forecast stays at 100, every target stays fixed, and every stage orders exactly 100. The bullwhip needs variation to amplify. Try noise 0 with the steady pattern."],
    ["Lead time is 2 weeks and the forecast is a 4-week moving average. Demand jumps by 20 for one week. Roughly how much extra does the retailer order that week?", "The forecast rises by 20/4 = 5, so the target (forecast × 2 weeks) rises by 10. The order is the extra 20 of demand plus the 10 rise in target: about 30 extra, a 50% overreaction to a one-week change."],
    ["Why does sharing point-of-sale data help, if every stage still uses the same ordering rule?", "Without it, each stage forecasts from the already-amplified orders of the stage below, so the overreactions multiply. With it, each stage forecasts from real demand, so the overreactions only add."],
    ["Order smoothing reduces swings. What's the catch?", "Each stage closes only part of its gap each week, so after a real change in demand, stock takes longer to recover. You trade order stability for more backorders or more stock."],
    ["The factory's orders swing wildly, but shopper demand barely changed. Where would you look first in a real business?", "At what each stage forecasts from (orders vs sales), at lead times, at batching (monthly or full-truck orders) and at promotions or price deals that cause forward buying."],
  ],
  deeper: [
    ["Lee, Padmanabhan & Whang (1997), \"The Bullwhip Effect in Supply Chains\"", "https://sloanreview.mit.edu/article/the-bullwhip-effect-in-supply-chains/", "the classic MIT Sloan article naming the four causes"],
    ["Bullwhip effect — Wikipedia", "https://en.wikipedia.org/wiki/Bullwhip_effect", "overview, history and countermeasures"],
    ["The Beer Distribution Game", "https://en.wikipedia.org/wiki/Beer_distribution_game", "the MIT classroom game that makes people feel the bullwhip"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 32 Q12 29 20 32 T36 32" opacity=".45"/><path d="M36 32 Q44 24 52 32 T68 32" opacity=".7"/><path d="M68 32 Q76 6 84 32 T92 50"/><g fill="currentColor"><circle cx="4" cy="32" r="3"/></g></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const T = 52, MU = 100, WARM = 4;
    const TIERS = [
      { name: "Retailer", col: "--accent" },
      { name: "Wholesaler", col: "--good" },
      { name: "Distributor", col: "--violet" },
      { name: "Factory", col: "--warm" },
    ];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="bwo" aria-label="Orders placed by each stage of the supply chain each week"></canvas>
          <div class="legend" id="leg"></div>
          <figcaption>Orders each stage places upstream, week by week. The dashed black line is what shoppers actually bought.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="bwi" aria-label="Net inventory at each stage"></canvas>
          <figcaption>Net inventory at each stage (stock on hand minus backorders). Below zero means customers are waiting.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">How much each stage amplifies demand</h4>
          <div style="overflow-x:auto"><table id="amp" style="width:100%;border-collapse:collapse;font-size:.88rem;font-variant-numeric:tabular-nums"></table></div>
          <p class="hint" style="margin-top:8px">Amplification = variance of the orders this stage places ÷ variance of shopper demand, measured after a ${WARM}-week warm-up. 1.0× means no bullwhip.</p>
        </div>
        <div class="plot" style="padding:14px">
          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">
            <h4 style="margin:0;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">One stage, week by week, worked out</h4>
            <select id="wt" aria-label="Stage to show">${TIERS.map((t, i) => `<option value="${i}">${t.name}</option>`).join("")}</select>
          </div>
          <div style="overflow-x:auto"><table id="work" style="width:100%;border-collapse:collapse;font-size:.8rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono)"></table></div>
          <p class="hint" style="margin-top:8px">Order = target − inventory position, never below zero (with order smoothing, the order is pulled part-way back toward the forecast). Rows are weeks 16 to 30, around the change in demand.</p>
        </div>`,
      panel: `
        <div class="ctrl">
          <label for="pat">Shopper demand</label>
          <select id="pat">
            <option value="step">Steps up 20% in week 20</option>
            <option value="promo">One promotion week (+60%)</option>
            <option value="noise">Steady, just random noise</option>
            <option value="season">Gentle seasonal wave</option>
          </select>
        </div>
        <div class="ctrl"><label for="nz">Random noise (SD) <output id="nzV"></output></label><input type="range" id="nz" min="0" max="20" step="1" value="5"></div>
        <div>
          <h4>How every stage behaves</h4>
          <div class="ctrl"><label for="lt">Lead time <output id="ltV"></output></label><input type="range" id="lt" min="1" max="6" step="1" value="2"></div>
          <div class="ctrl"><label for="p">Forecast: moving average of <output id="pV"></output></label><input type="range" id="p" min="1" max="12" step="1" value="4"></div>
          <div class="ctrl"><label for="ssw">Safety stock <output id="sswV"></output></label><input type="range" id="ssw" min="0" max="3" step="0.25" value="1"></div>
          <div class="ctrl"><label for="beta">Order smoothing <output id="betaV"></output></label><input type="range" id="beta" min="0.1" max="1" step="0.05" value="1"></div>
          <label class="check"><input type="checkbox" id="share"> Share shopper sales data with every stage</label>
        </div>
        <div class="readouts">
          <div class="ro"><b>Factory swings</b><span class="num" id="fac"></span></div>
          <div class="ro"><b>Theory for retailer</b><span class="num" id="th"></span></div>
        </div>
        <div class="btns"><button class="btn" id="newd" type="button">New random noise</button></div>`,
      notes: `
        <section>
          <h2>How each stage decides what to order</h2>
          <p>Every stage runs the same simple <b>order-up-to</b> policy each week:</p>
          <ol>
            <li>Ship what the stage below ordered, plus any backorders, if stock allows.</li>
            <li>Update the forecast: the average of the last <i>p</i> weeks of orders received.</li>
            <li>Set a target: enough to cover the lead time, plus safety stock (here a fixed number of weeks of average demand).</li>
            <li>Order the gap between the target and the <b>inventory position</b> (on hand + on order − backorders).</li>
          </ol>
          <div class="eq">target = forecast × lead time + safety stock<br>order = max(0, target − inventory position)</div>
          <p>The trouble is step 3. When demand ticks up by 10, the forecast rises a little, and so does the target, which is <i>lead time</i> times the forecast. The stage orders the extra 10 <b>plus</b> the rise in the target. The stage above sees that bigger jump, does the same, and so on.</p>
        </section>
        <section>
          <h2>The math for one stage</h2>
          <p>Chen, Drezner, Ryan and Simchi-Levi (2000) showed that with a moving-average forecast of <i>p</i> weeks and lead time <i>L</i>, a stage's orders vary at least this much more than its demand:</p>
          <div class="eq">Var(orders) / Var(demand) ≥ 1 + 2L/p + 2L²/p²</div>
          <p>Long lead times and short, jumpy forecast windows both make it worse. Stacked across four stages that each forecast from the stage below, the factors multiply. When every stage forecasts from shopper sales instead, they roughly add up instead, which is much smaller.</p>
          <p>The simulation's timing differs a little from the paper's, so the measured retailer number won't match the bound exactly, but it moves the same way.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Default settings: the step in week 20 becomes a large spike and then a dip at the factory. Look at how the factory's inventory swings too.</li>
            <li>Raise the lead time to 5. Every stage now holds a bigger target, so the overreaction grows.</li>
            <li>Set the moving average to 1 week, so every stage chases the latest number. Then try 12 weeks.</li>
            <li>Tick "Share shopper sales data". Every stage now forecasts from real demand, not from the stage below's orders.</li>
            <li>Lower order smoothing to 0.3. Each stage closes only 30% of its gap each week. Swings shrink, but stock takes longer to recover.</li>
            <li>Set safety stock to 0. Every wobble now causes backorders, and shortages upstream starve the stages below, which makes the swings even wilder.</li>
            <li>Pick "Steady, just random noise". There's no real change at all, yet the factory still sees big swings.</li>
          </ol>
        </section>
        <section>
          <h2>Causes and cures in real supply chains</h2>
          <ul>
            <li><b>Forecasting from orders, not sales.</b> The cure is sharing point-of-sale data (here, the checkbox), vendor-managed inventory, or collaborative planning (CPFR).</li>
            <li><b>Long lead times.</b> Shorter lead times shrink the target that every stage overreacts to.</li>
            <li><b>Order batching.</b> Ordering once a month in a big lot turns smooth demand into lumpy orders.</li>
            <li><b>Price promotions and forward buying.</b> Customers stock up during deals, so orders spike and then go quiet.</li>
            <li><b>Shortage gaming.</b> When supply is rationed, customers over-order to get their share, then cancel.</li>
          </ul>
          <p>See <a href="#reorder-point">reorder points, safety stock and EOQ</a> for how a single stage sets its stock levels, and <a href="#forecast-value-added">FVA</a> for testing whether forecast steps add value.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pO = new Plot($("#bwo"), { x: [0, T - 1], pad: { l: 50 } });
    const pI = new Plot($("#bwi"), { x: [0, T - 1], pad: { l: 50 } });
    let seed = 7, demand = [], sim = null;

    function makeDemand() {
      const r = rng(seed), pat = $("#pat").value, nz = +$("#nz").value;
      demand = [];
      for (let t = 0; t < T; t++) {
        let base = MU;
        if (pat === "step" && t >= 20) base = MU * 1.2;
        if (pat === "promo" && t === 20) base = MU * 1.6;
        if (pat === "season") base = MU + 15 * Math.sin((2 * Math.PI * t) / 26);
        demand.push(Math.max(0, Math.round(base + nz * r.normal())));
      }
    }

    function simulate() {
      const L = +$("#lt").value, p = +$("#p").value, beta = +$("#beta").value, share = $("#share").checked;
      const SS = Math.round(+$("#ssw").value * MU); // safety stock as weeks of average demand, held constant
      const st = TIERS.map(() => ({
        I: SS, B: 0, pipe: Array(L).fill(MU), onOrder: L * MU, hist: Array(p).fill(MU),
        orders: [], net: [], rows: [],
      }));
      for (let t = 0; t < T; t++) {
        let d = demand[t];
        for (let k = 0; k < 4; k++) {
          const s = st[k];
          const recv = s.pipe.shift(); s.pipe.push(0);
          s.I += recv; s.onOrder -= recv;
          const need = d + s.B, ship = Math.min(s.I, need);
          s.I -= ship; s.B = need - ship;
          if (k > 0) st[k - 1].pipe[L - 1] += ship; // arrives downstream L weeks later
          s.hist.push(share ? demand[t] : d); s.hist.shift();
          const F = s.hist.reduce((a, b) => a + b, 0) / p;
          const S = F * L + SS, IP = s.I - s.B + s.onOrder;
          const q = Math.max(0, Math.round((1 - beta) * F + beta * (S - IP)));
          s.onOrder += q;
          if (k === 3) s.pipe[L - 1] += q; // factory: production takes L weeks, unlimited capacity
          s.orders.push(q); s.net.push(s.I - s.B);
          s.rows.push({ t, d, recv, ship, F, S, IP, q, I: s.I, B: s.B });
          d = q; // this stage's order is the next stage's demand
        }
      }
      return { st, L, p, SS };
    }

    const variance = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length; };

    function draw() {
      $("#nzV").textContent = "±" + $("#nz").value;
      $("#ltV").textContent = $("#lt").value + (+$("#lt").value === 1 ? " week" : " weeks");
      $("#pV").textContent = $("#p").value + (+$("#p").value === 1 ? " week" : " weeks");
      $("#sswV").textContent = $("#ssw").value + (+$("#ssw").value === 1 ? " week" : " weeks") + " of demand";
      $("#betaV").textContent = (+$("#beta").value).toFixed(2) + (+$("#beta").value === 1 ? " (none)" : "");
      const { st, L, p } = sim, xs = demand.map((_, i) => i);

      const all = demand.concat(...st.map((s) => s.orders));
      const hi = Math.max(...all), lo = Math.min(...all);
      pO.y = [Math.max(0, lo - 10), hi + 10];
      pO.clear();
      pO.axes({ xLabel: "week", yLabel: "units ordered" });
      for (let k = 3; k >= 0; k--) pO.path(xs, st[k].orders, css(TIERS[k].col), k === 0 ? 2.5 : 2);
      pO.path(xs, demand, css("--ink"), 2, [5, 4]);
      $("#leg").innerHTML = `<span><i style="background:var(--ink)"></i>Shoppers</span>` + TIERS.map((t) => `<span><i style="background:var(${t.col})"></i>${t.name}</span>`).join("");

      const nets = [].concat(...st.map((s) => s.net));
      const nh = Math.max(...nets, 10), nl = Math.min(...nets, -10);
      pI.y = [nl - 10, nh + 10];
      pI.clear();
      pI.axes({ xLabel: "week", yLabel: "net inventory", yCount: 4 });
      pI.path([0, T - 1], [0, 0], css("--line"), 1.5);
      for (let k = 3; k >= 0; k--) pI.path(xs, st[k].net, css(TIERS[k].col), 2);

      const vd = variance(demand.slice(WARM)) || 1;
      const ratios = st.map((s) => variance(s.orders.slice(WARM)) / vd);
      const mx = Math.max(...ratios, 1);
      const th = (t, l) => `<th style="text-align:${l ? "left" : "right"};padding:6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted)">${t}</th>`;
      const td = (t, extra = "") => `<td style="padding:6px;border-bottom:1px solid var(--grid);text-align:right;font-family:var(--font-mono);${extra}">${t}</td>`;
      const dm = demand.slice(WARM);
      $("#amp").innerHTML = `<tr>${th("Stage", 1)}${th("Amplification", 1)}${th("Lowest order")}${th("Highest order")}${th("Worst backorder")}</tr>
        <tr><td style="padding:6px;border-bottom:1px solid var(--grid)"><b>Shoppers</b></td><td style="padding:6px;border-bottom:1px solid var(--grid)"><div style="display:flex;align-items:center;gap:8px"><div style="height:12px;border-radius:3px;background:var(--ink);width:${Math.max(2, (1 / mx) * 140)}px"></div><span style="font-family:var(--font-mono)">1.0×</span></div></td>${td(Math.min(...dm))}${td(Math.max(...dm))}${td("–")}</tr>` +
        st.map((s, k) => {
          const o = s.orders.slice(WARM), worst = Math.min(0, ...s.net);
          return `<tr><td style="padding:6px;border-bottom:1px solid var(--grid)"><b>${TIERS[k].name}</b></td>
            <td style="padding:6px;border-bottom:1px solid var(--grid);min-width:180px"><div style="display:flex;align-items:center;gap:8px"><div style="height:12px;border-radius:3px;background:var(${TIERS[k].col});width:${Math.max(2, (ratios[k] / mx) * 140)}px"></div><span style="font-family:var(--font-mono)">${fmt(ratios[k], 1)}×</span></div></td>
            ${td(Math.min(...o))}${td(Math.max(...o))}${td(worst < 0 ? -worst : "0", worst < 0 ? "color:var(--bad)" : "")}</tr>`;
        }).join("");

      const fr = ratios[3];
      $("#fac").innerHTML = `<span class="pill ${fr < 2 ? "ok" : fr < 6 ? "warn" : "bad"}">${fmt(fr, 1)}× shoppers</span>`;
      $("#th").textContent = "≥ " + fmt(1 + (2 * L) / p + (2 * L * L) / (p * p), 2) + "×";

      const k = +$("#wt").value, rows = st[k].rows.slice(16, 31);
      const hd = (t) => `<th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted);font-family:var(--font-body)">${t}</th>`;
      const c = (t, extra = "") => `<td style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--grid);${extra}">${t}</td>`;
      $("#work").innerHTML = `<tr>${hd("week")}${hd(k ? "order received" : "shopper demand")}${hd("stock arrived")}${hd("shipped")}${hd("forecast")}${hd("target")}${hd("inv. position")}${hd("order placed")}${hd("on hand")}${hd("backorder")}</tr>` +
        rows.map((r) => `<tr style="${r.t === 20 && $("#pat").value !== "noise" && $("#pat").value !== "season" ? "background:var(--warm-soft)" : ""}">${c(r.t)}${c(r.d, "font-weight:600")}${c(r.recv)}${c(r.ship)}${c(fmt(r.F, 1))}${c(fmt(r.S, 0))}${c(fmt(r.IP, 0))}${c(r.q, `font-weight:600;color:var(${TIERS[k].col})`)}${c(r.I)}${c(r.B, r.B > 0 ? "color:var(--bad)" : "")}</tr>`).join("");
    }

    const rerun = () => { makeDemand(); sim = simulate(); draw(); };
    ["#lt", "#p", "#beta", "#nz", "#ssw"].forEach((s) => $(s).addEventListener("input", rerun));
    ["#pat", "#share"].forEach((s) => $(s).addEventListener("change", rerun));
    $("#wt").addEventListener("change", draw);
    $("#newd").addEventListener("click", () => { seed++; rerun(); });

    rerun();
    return watch([pO.c, pI.c], (resized) => { if (resized) { pO.resize(); pI.resize(); } draw(); });
  },
});
