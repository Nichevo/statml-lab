Lab.register({
  id: "reorder-point",
  group: "Supply chain",
  title: "Reorder point, safety stock and EOQ",
  blurb: "The classic inventory sawtooth. Set demand, lead time and a service target, and watch stock run down, trigger an order and refill, with the costs worked out.",
  lede: "Every stocked item needs two decisions: when to reorder, and how much to order. The reorder point covers demand during the lead time, plus safety stock for the bad weeks. The order quantity trades the cost of placing orders against the cost of holding stock. Together they make the sawtooth you can see below.",
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10 L26 46 L26 10 L48 46 L48 10 L70 46 L70 10 L92 46"/><line x1="4" y1="34" x2="92" y2="34" stroke-dasharray="4 3" opacity=".6"/><line x1="4" y1="52" x2="92" y2="52" opacity=".35"/></svg>`,
  quiz: [
    ["Average demand is 40 a day and the lead time is 7 days. With no safety stock, what is the reorder point, and how often would you run out before the order arrives?", "40 × 7 = 280. You'd stock out in roughly half of all cycles, because demand during the lead time is above its average about half the time."],
    ["You double the order quantity Q. What happens to safety stock?", "Nothing. Safety stock depends on the variability of demand over the lead time and the service target, not on Q. A bigger Q means fewer cycles, so fewer chances to stock out, so the fill rate rises a little."],
    ["Why does EOQ use a square root, and what does that mean if order costs fall by 75%?", "Total cost = ordering cost (falls as Q grows) + holding cost (rises with Q). Their balance point is √(2DK/h). If K drops to a quarter, EOQ halves: order twice as often in half the size."],
    ["Going from 95% to 99% cycle service level raises z from 1.645 to 2.326. By how much does safety stock grow?", "2.326 / 1.645 ≈ 1.41, so 41% more safety stock for 4 more points of service. Each extra point of service costs more than the last."],
    ["Lead time is 10 days on average but varies with an SD of 3 days. Which term in the safety stock formula captures that, and why can it dominate?", "The d² × σ_L² term. A 3-day delay at 40 a day is 120 units of extra demand to cover. That often outweighs the day-to-day demand noise."],
  ],
  diy: {
    intro: "Daily demand mean d in H1 and SD σd in H2, lead time mean L in H3 and SD σL in H4, service level in H5, annual demand D, order cost K and holding cost per unit h in H6:H8.",
    steps: [
      ["SD of demand over the lead time (demand and lead time both vary).", "H9: =SQRT(H3*H2^2+H1^2*H4^2)"],
      ["Safety stock and reorder point.", "H10: =NORM.S.INV(H5)*H9\nH11: =H1*H3+H10"],
      ["Order quantity.", "=SQRT(2*H6*H7/H8)"],
      ["Periodic review (R days): order-up-to level.", "=H1*(R+H3)+NORM.S.INV(H5)*SQRT((R+H3)*H2^2+H1^2*H4^2)"],
      ["Simulate: stock each day, place an order when position ≤ s.", "on_hand: =prev+arrivals-demand\norder: =IF(position<=$H$11,Q,0)"],
    ],
  },
  deeper: [
    ["Economic order quantity — Wikipedia", "https://en.wikipedia.org/wiki/Economic_order_quantity", "the derivation and its assumptions"],
    ["Safety stock formulas", "https://en.wikipedia.org/wiki/Safety_stock", "the variants for demand and lead-time uncertainty"],
    ["Forecasting: Principles and Practice (3rd ed.)", "https://otexts.com/fpp3/", "free textbook by Hyndman & Athanasopoulos; the forecasts that feed these formulas"],
    ["MIT OpenCourseWare: Introduction to Operations Management", "https://ocw.mit.edu/courses/15-760b-introduction-to-operations-management-spring-2004/", "free lecture notes covering inventory models"],
  ],

  mount(root) {
    const { Plot, watch, rng, fmt, css, qnorm } = Lab;
    const SHOW = 180, YEARS = 5;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="rpc" aria-label="Inventory on hand over 180 days"></canvas>
          <div class="legend">
            <span><i style="background:var(--ink)"></i>On hand</span>
            <span><i style="background:var(--accent)"></i><span id="lvlName">Reorder point</span></span>
            <span><i style="background:var(--good)"></i>Safety stock</span>
            <span><i style="background:var(--violet)"></i>Order placed ▲ / arrives ▼</span>
            <span><i style="background:var(--bad);opacity:.5"></i>Stocked out</span>
          </div>
          <figcaption>The first 180 days of a simulation. Each day's demand is random. The statistics on the right come from ${YEARS} simulated years.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="eoq" aria-label="Annual cost against order quantity"></canvas>
          <div class="legend">
            <span><i style="background:var(--warm)"></i>Ordering cost</span>
            <span><i style="background:var(--violet)"></i>Holding cost</span>
            <span><i style="background:var(--ink)"></i>Total</span>
          </div>
          <figcaption>Yearly cost against order size. The total is flat near the bottom, so being 20% off the EOQ costs only about 2% more.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Worked out with your numbers</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.84rem;line-height:1.9;overflow-x:auto"></div>
        </div>`,
      panel: `
        <div class="ctrl"><label>Policy</label>
          <div class="seg" id="pol"><button type="button" data-v="sQ" aria-pressed="true">Reorder point (s, Q)</button><button type="button" data-v="RS" aria-pressed="false">Periodic (R, S)</button></div></div>
        <div>
          <h4>Demand and supply</h4>
          <div class="ctrl"><label for="d">Average daily demand <output id="dV"></output></label><input type="range" id="d" min="5" max="100" step="1" value="40"></div>
          <div class="ctrl"><label for="sd">Daily demand SD <output id="sdV"></output></label><input type="range" id="sd" min="0" max="40" step="1" value="12"></div>
          <div class="ctrl"><label for="L">Lead time <output id="LV"></output></label><input type="range" id="L" min="1" max="30" step="1" value="7"></div>
          <div class="ctrl"><label for="sL">Lead time SD <output id="sLV"></output></label><input type="range" id="sL" min="0" max="5" step="0.5" value="0"></div>
        </div>
        <div>
          <h4>Targets and costs</h4>
          <div class="ctrl"><label for="csl">Cycle service level <output id="cslV"></output></label><input type="range" id="csl" min="50" max="99.9" step="0.1" value="95"></div>
          <div class="ctrl"><label for="K">Cost per order <output id="KV"></output></label><input type="range" id="K" min="5" max="500" step="5" value="100"></div>
          <div class="ctrl"><label for="h">Holding cost per unit per year <output id="hV"></output></label><input type="range" id="h" min="0.5" max="30" step="0.5" value="5"></div>
          <div class="ctrl" id="qBox"><label for="Q">Order quantity Q <output id="QV"></output></label><input type="range" id="Q" min="20" max="3000" step="10" value="760"></div>
          <div class="ctrl" id="rBox" hidden><label for="R">Review every <output id="RV"></output></label><input type="range" id="R" min="1" max="60" step="1" value="14"></div>
          <div class="btns"><button class="btn" id="toEoq" type="button">Set Q to the EOQ</button></div>
        </div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New random demand</button></div>`,
      notes: `
        <section>
          <h2>The two numbers</h2>
          <div class="eq">reorder point s = d × L + safety stock<br>safety stock = z × σ<sub>LT</sub><br>σ<sub>LT</sub> = √(L × σ<sub>d</sub>² + d² × σ<sub>L</sub>²)</div>
          <p><b>d × L</b> is the average demand while you wait for an order. <b>σ<sub>LT</sub></b> is how much that lead-time demand varies. The first term inside the root comes from daily demand noise, and the second from late or early deliveries. <b>z</b> comes from the service target: 1.645 for 95%, 2.326 for 99%.</p>
          <div class="eq">EOQ = √(2 × D × K / h)</div>
          <p>D is yearly demand, K the cost of placing one order and h the cost of holding one unit for a year. At the EOQ, the yearly ordering cost equals the yearly holding cost.</p>
        </section>
        <section>
          <h2>Two ways to measure service</h2>
          <ul>
            <li><b>Cycle service level (CSL):</b> the share of replenishment cycles with no stockout at all. The z in the formula targets this.</li>
            <li><b>Fill rate:</b> the share of units demanded that were shipped from stock. It is usually much higher than CSL, because even a cycle that stocks out usually only misses a few units at the end.</li>
          </ul>
          <p>Customers feel the fill rate; the textbook formula sets the CSL. When a business says "98% service", always ask which one.</p>
          <p><b>Why the simulated CSL lands a bit below target:</b> stock is checked once a day, so the order usually fires a little <i>below</i> the reorder point, after a day's demand has already pushed past it. That "undershoot" eats into the safety stock. It matters most at low targets and with big daily demand relative to lead-time demand. Real systems either check more often or add about half a day's demand to the reorder point.</p>
        </section>
        <section>
          <h2>Periodic review (R, S)</h2>
          <p>Instead of watching stock continuously, you look every R days and order enough to bring the inventory position up to S. The risk window is now R + L days, not just L, so it needs more safety stock:</p>
          <div class="eq">S = d × (R + L) + z × √((R + L) × σ<sub>d</sub>² + d² × σ<sub>L</sub>²)</div>
          <p>It's simpler to run (fixed order days, combined deliveries), at the cost of extra stock.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set the service level to 50%. Safety stock is zero, and about half the cycles stock out.</li>
            <li>Raise lead time SD to 3 days. Safety stock jumps, because one late delivery means several days' demand to cover.</li>
            <li>Drag Q to a quarter of the EOQ, then to four times it. The cost curve shows how lopsided the penalty is.</li>
            <li>Switch to Periodic and set R to 30 days. The sawtooth teeth get larger and the safety stock grows.</li>
            <li>With demand SD at 0 and lead time SD at 0, nothing ever goes wrong. That's the world EOQ was derived in.</li>
          </ol>
          <p>This is one stage. Chain four of them together and you get the <a href="#bullwhip-effect">bullwhip effect</a>. The safety stock idea comes from <a href="#prediction-intervals">prediction intervals</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pI = new Plot($("#rpc"), { x: [0, SHOW], pad: { l: 54 } });
    const pC = new Plot($("#eoq"), { pad: { l: 54 } });
    let seed = 11, pol = "sQ", sim = null, P = null;

    function params() {
      const d = +$("#d").value, sd = +$("#sd").value, L = +$("#L").value, sL = +$("#sL").value, csl = +$("#csl").value / 100;
      const K = +$("#K").value, h = +$("#h").value, Q = +$("#Q").value, R = +$("#R").value;
      const z = qnorm(csl), D = d * 365, eoq = Math.sqrt((2 * D * K) / h);
      const sLT = Math.sqrt(L * sd * sd + d * d * sL * sL), ss = z * sLT, rop = d * L + ss;
      const sRL = Math.sqrt((R + L) * sd * sd + d * d * sL * sL), ssR = z * sRL, S = d * (R + L) + ssR;
      return { d, sd, L, sL, csl, K, h, Q, R, z, D, eoq, sLT, ss: Math.max(0, ss), rop, sRL, ssR: Math.max(0, ssR), S };
    }

    function simulate(p) {
      const r = rng(seed), N = 365 * YEARS;
      const arrivals = new Map();
      let I = pol === "sQ" ? Math.round(p.rop + p.Q / 2) : Math.round(p.S - p.d * p.L), onOrder = 0;
      const inv = [], orders = [], recv = [], out = [];
      let dem = 0, filled = 0, cycles = 0, badCycles = 0, cycleBad = false, nOrders = 0, invSum = 0;
      for (let t = 0; t < N; t++) {
        const a = arrivals.get(t) || 0;
        if (a) { I += a; onOrder -= a; if (t < SHOW) recv.push(t); cycles++; if (cycleBad) badCycles++; cycleBad = false; arrivals.delete(t); }
        const dt = Math.max(0, Math.round(p.d + p.sd * r.normal()));
        const f = Math.min(I, dt); I -= f; dem += dt; filled += f;
        if (f < dt) { cycleBad = true; if (t < SHOW) out.push(t); }
        invSum += I;
        let q = 0;
        if (pol === "sQ") { const IP = I + onOrder; if (IP <= p.rop) q = p.Q * Math.max(1, Math.ceil((p.rop - IP) / p.Q + 1e-9)); }
        else if (t % p.R === 0) q = Math.max(0, Math.round(p.S - (I + onOrder)));
        if (q > 0) {
          const lt = Math.max(1, Math.round(p.L + p.sL * r.normal()));
          // placed at the end of day t, usable from day t + lt + 1, so it covers exactly lt days of demand
          arrivals.set(t + lt + 1, (arrivals.get(t + lt + 1) || 0) + q); onOrder += q; nOrders++;
          if (t < SHOW) orders.push(t);
        }
        if (t <= SHOW) inv.push(I);
      }
      return { inv, orders, recv, out, fill: filled / dem, csl: cycles ? 1 - badCycles / cycles : 1, cycles, perYear: nOrders / YEARS, avgInv: invSum / N };
    }

    const money = (v) => "$" + (v >= 1000 ? Math.round(v).toLocaleString("en-US") : v.toFixed(0));

    function draw() {
      const p = P, s = sim;
      $("#dV").textContent = p.d + "/day"; $("#sdV").textContent = "±" + p.sd; $("#LV").textContent = p.L + (p.L === 1 ? " day" : " days");
      $("#sLV").textContent = p.sL ? "±" + p.sL + " days" : "none"; $("#cslV").textContent = p.csl * 100 >= 99.5 ? (p.csl * 100).toFixed(1) + "%" : Math.round(p.csl * 1000) / 10 + "%";
      $("#KV").textContent = "$" + p.K; $("#hV").textContent = "$" + p.h; $("#QV").textContent = p.Q; $("#RV").textContent = p.R + (p.R === 1 ? " day" : " days");
      $("#lvlName").textContent = pol === "sQ" ? "Reorder point" : "Order-up-to level S";

      // sawtooth
      const level = pol === "sQ" ? p.rop : p.S, ss = pol === "sQ" ? p.ss : p.ssR;
      const hi = Math.max(...s.inv, level) * 1.08 + 5;
      pI.y = [0, hi];
      pI.clear();
      const g = pI.ctx;
      g.save(); g.globalAlpha = 0.28; g.fillStyle = css("--bad");
      s.out.forEach((t) => g.fillRect(pI.sx(t), pI.pad.t, Math.max(1.5, pI.sx(t + 1) - pI.sx(t)), pI.ih));
      g.restore();
      pI.axes({ xLabel: "day", yLabel: "units on hand" });
      pI.path([0, SHOW], [ss, ss], css("--good"), 2, [5, 4]);
      pI.path([0, SHOW], [level, level], css("--accent"), 2, [8, 4]);
      const xs = [], ys = [];
      s.inv.forEach((v, t) => { xs.push(t, t + 1); ys.push(v, v); });
      pI.path(xs, ys, css("--ink"), 1.8);
      g.save(); g.fillStyle = css("--violet");
      const tri = (t, up) => { const x = pI.sx(t + 0.5), y = up ? pI.h - pI.pad.b - 2 : pI.pad.t + 2; g.beginPath(); g.moveTo(x, up ? y - 9 : y + 9); g.lineTo(x - 5, y); g.lineTo(x + 5, y); g.closePath(); g.fill(); };
      s.orders.forEach((t) => tri(t, true));
      s.recv.forEach((t) => tri(t, false));
      g.restore();

      // EOQ cost curve
      const qMax = Math.max(p.eoq * 3, p.Q * 1.2), cost = (q) => (p.D / q) * p.K + (q / 2) * p.h;
      const cE = cost(p.eoq);
      pC.x = [0, qMax]; pC.y = [0, cE * 2.6];
      pC.clear();
      pC.axes({ xLabel: "order quantity Q", yLabel: "$ per year", yFormat: (v) => (v >= 1000 ? Math.round(v / 1000) + "k" : String(v)), yCount: 4 });
      pC.fn((q) => (q > 0 ? (p.D / q) * p.K : NaN), css("--warm"), 2);
      pC.fn((q) => (q / 2) * p.h, css("--violet"), 2);
      pC.fn((q) => (q > 0 ? cost(q) : NaN), css("--ink"), 2.5);
      pC.path([p.eoq, p.eoq], [0, cE], css("--muted"), 1, [3, 3]);
      pC.dot(p.eoq, cE, 4, css("--surface"), css("--ink"));
      if (pol === "sQ") pC.dot(p.Q, cost(p.Q), 6, css("--accent"), css("--surface"));

      // readouts
      const holdCost = s.avgInv * p.h, ordCost = s.perYear * p.K;
      const pill = (v, tgt) => `<span class="pill ${v >= tgt - 0.01 ? "ok" : v >= tgt - 0.05 ? "warn" : "bad"}">${(v * 100).toFixed(1)}%</span>`;
      $("#ro").innerHTML = `
        <div class="ro"><b>Safety stock</b><span class="num">${fmt(ss, 0)}</span></div>
        <div class="ro"><b>${pol === "sQ" ? "Reorder point" : "Order-up-to S"}</b><span class="num">${fmt(level, 0)}</span></div>
        <div class="ro"><b>EOQ</b><span class="num">${fmt(p.eoq, 0)}</span></div>
        <div class="ro"><b>Cycle service (sim)</b>${pill(s.csl, p.csl)}</div>
        <div class="ro"><b>Fill rate (sim)</b><span class="num">${(s.fill * 100).toFixed(1)}%</span></div>
        <div class="ro"><b>Orders per year</b><span class="num">${s.perYear.toFixed(1)}</span></div>
        <div class="ro"><b>Average on hand</b><span class="num">${fmt(s.avgInv, 0)}</span></div>
        <div class="ro"><b>Yearly cost (sim)</b><span class="num">${money(holdCost + ordCost)}</span></div>`;

      // worked numbers
      const b = (t) => `<b style="color:var(--ink)">${t}</b>`, mu = (t) => `<span style="color:var(--muted)">${t}</span>`;
      const lines = [
        `z for ${(p.csl * 100).toFixed(1)}% service ${mu("=")} ${b(p.z.toFixed(3))}`,
        pol === "sQ"
          ? `σ<sub>LT</sub> = √(${p.L} × ${p.sd}² + ${p.d}² × ${p.sL}²) = √(${fmt(p.L * p.sd * p.sd, 0)} + ${fmt(p.d * p.d * p.sL * p.sL, 0)}) = ${b(fmt(p.sLT, 1))}`
          : `σ over R+L = √((${p.R} + ${p.L}) × ${p.sd}² + ${p.d}² × ${p.sL}²) = ${b(fmt(p.sRL, 1))}`,
        `safety stock = ${p.z.toFixed(3)} × ${fmt(pol === "sQ" ? p.sLT : p.sRL, 1)} = ${b(fmt(ss, 0))}`,
        pol === "sQ"
          ? `reorder point = ${p.d} × ${p.L} + ${fmt(ss, 0)} = ${fmt(p.d * p.L, 0)} + ${fmt(ss, 0)} = ${b(fmt(p.rop, 0))}`
          : `order-up-to S = ${p.d} × (${p.R} + ${p.L}) + ${fmt(ss, 0)} = ${b(fmt(p.S, 0))}`,
        `EOQ = √(2 × ${p.D.toLocaleString("en-US")} × ${p.K} / ${p.h}) = ${b(fmt(p.eoq, 0))} ${mu(`→ about ${(p.D / p.eoq).toFixed(1)} orders a year, one every ${(p.eoq / p.d).toFixed(1)} days`)}`,
        pol === "sQ"
          ? `yearly cost at Q=${p.Q}: ordering ${p.D.toLocaleString("en-US")}/${p.Q} × ${p.K} = ${money((p.D / p.Q) * p.K)} + holding (${p.Q}/2 + ${fmt(ss, 0)}) × ${p.h} = ${money((p.Q / 2 + ss) * p.h)} → ${b(money((p.D / p.Q) * p.K + (p.Q / 2 + ss) * p.h))}`
          : `ordering every ${p.R} days → ${(365 / p.R).toFixed(1)} orders × $${p.K} = ${money((365 / p.R) * p.K)} a year ${mu(`(EOQ timing would be every ${(p.eoq / p.d).toFixed(1)} days)`)}`,
      ];
      $("#work").innerHTML = lines.map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    const rerun = () => { P = params(); sim = simulate(P); draw(); };
    ["#d", "#sd", "#L", "#sL", "#csl", "#K", "#h", "#Q", "#R"].forEach((s) => $(s).addEventListener("input", rerun));
    $("#pol").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      pol = b.dataset.v;
      $("#pol").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $("#qBox").hidden = pol !== "sQ"; $("#toEoq").hidden = pol !== "sQ"; $("#rBox").hidden = pol === "sQ";
      rerun();
    }));
    $("#toEoq").addEventListener("click", () => { $("#Q").value = Math.round(params().eoq / 10) * 10; rerun(); });
    $("#newd").addEventListener("click", () => { seed++; rerun(); });

    $("#Q").value = Math.round(params().eoq / 10) * 10;
    rerun();
    return watch([pI.c, pC.c], (resized) => { if (resized) { pI.resize(); pC.resize(); } draw(); });
  },
});
