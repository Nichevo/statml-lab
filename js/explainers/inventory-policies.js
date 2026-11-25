Lab.register({
  id: "inventory-policies",
  group: "Supply chain",
  title: "(s, Q), (s, S) and periodic review: which ordering rule?",
  blurb: "Four standard ways to decide when and how much to order, run on the same simulated demand. See the sawtooth each one makes, what it costs in stock, orders and shortages, and when checking only once a week pays off.",
  lede: "Every stock policy answers two questions: when do I order, and how much? Continuous review watches stock all the time and orders the moment it drops to a reorder point s, either a fixed quantity Q, or enough to bring it back up to a level S. Periodic review looks only every R days and orders up to S, sometimes only if stock is below s. Periodic review needs more safety stock, because it must cover R + L days instead of L, but it lets you place one order for many items on a fixed day, which is often much cheaper.",
  quiz: [
    ["Demand is 20 a day with SD 14, lead time 5 days, review every 7 days. Over how many days must an (R, S) policy's safety stock protect?", "R + L = 12 days. Stock ordered today won't arrive for 5 days, and you won't get another chance to order for 7, so the next order lands 12 days out. σ over 12 days = 14 × √12 ≈ 48."],
    ["How does (s, S) differ from (s, Q), and when does it matter?", "Both order when position hits s. (s, Q) always orders Q; (s, S) orders S − position, which is more if a big customer order took stock well below s (the undershoot). It matters when single orders are large compared with the gap between s and expected stock."],
    ["Why would anyone choose periodic review if it needs more safety stock?", "Ordering on fixed days lets you combine many items into one purchase order or one truck, schedule receiving labour, and avoid constant monitoring. If that cuts the cost per order enough, it outweighs the extra stock."],
    ["What does (R, s, S) add over (R, S)?", "At each review it orders only if position is at or below s. That skips tiny orders, so fewer orders when the order cost is high, at the price of a little more stock or risk."],
    ["Twelve items come from the same supplier, and every order costs $80 in admin and freight. Why review all twelve on the same day?", "One combined order shares the $80 across twelve items, so each item's effective order cost drops sharply. That's joint replenishment, and it's the main business case for periodic review."],
  ],
  diy: {
    intro: "Daily demand mean μ in H1, SD σ in H2, lead time L in H3, review period R in H4, z = NORM.S.INV(target) in H5, order quantity Q in H6.",
    steps: [
      ["(s, Q) and (s, S): reorder point covers the lead time.", "s: =H1*H3 + H5*H2*SQRT(H3)   S: =s + H6"],
      ["(R, S): order-up-to level covers review period plus lead time.", "S: =H1*(H4+H3) + H5*H2*SQRT(H4+H3)"],
      ["Order size each review for (R, S).", "=MAX(0, S - position)"],
      ["(R, s, S): only order if position is at or below s.", "=IF(position<=s, S - position, 0)"],
      ["Yearly cost to compare policies.", "=K*orders + h*average_on_hand*365 + p*units_short"],
    ],
  },
  deeper: [
    ["Silver, Pyke & Thomas (2017), Inventory and Production Management in Supply Chains, 4th ed., CRC Press", "https://doi.org/10.1201/9781315374406", "chapters on the four policies, how to set their parameters and when to use each"],
    ["Inventory theory — Wikipedia", "https://en.wikipedia.org/wiki/Inventory_theory", "overview, including Scarf's result that (s, S) rules are optimal when each order has a fixed cost"],
    ["Axsäter (2015), Inventory Control, 3rd ed., Springer", "https://doi.org/10.1007/978-3-319-15729-0", "exact evaluation of (R, Q) and (s, S) policies with stochastic demand"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12 L22 36 L22 10 L40 42 L40 14 L58 34 L58 8 L76 40 L76 12 L92 30"/><path d="M4 8 H92" stroke-dasharray="4 3" stroke-opacity=".6"/><path d="M4 38 H92" stroke-dasharray="2 3" stroke-opacity=".6"/><path d="M22 52 V58 M40 52 V58 M58 52 V58 M76 52 V58" stroke-opacity=".6"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, qnorm } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const LAM = 4, MEAN_SIZE = 5, MU = LAM * MEAN_SIZE, H = 0.03, PEN = 4, YRS = 20, SHOW = 120;
    const POL = [["sQ", "(s, Q)", "--accent"], ["sS", "(s, S)", "--violet"], ["RS", "(R, S)", "--warm"], ["RsS", "(R, s, S)", "--good"]];
    let pol = "RS";
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("120 days under the chosen rule")}</div><canvas id="c1" style="height:280px" aria-label="Inventory position and on-hand stock over 120 days"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "Yearly cost of each rule", 250, "Stacked bars of holding, ordering and shortage cost per policy"), fig("c3", "Periodic review: how often to look?", 250, "Total cost against review period for periodic policies"))}
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4(`Side by side, averaged over ${YRS} simulated years`)}<div id="tbl"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">About ${LAM} customer orders a day averaging ${MEAN_SIZE} units: ${MU} units a day. Holding costs $${H} per unit per day; each unit short costs $${PEN}.</p>
        <div class="ctrl"><label>Rule shown on the chart</label><div class="seg" id="ps">${POL.map(([k, n]) => `<button type="button" data-p="${k}" aria-pressed="${k === pol}">${n}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="osd">Customer order size SD <output id="osdV"></output></label><input type="range" id="osd" min="0" max="20" step="1" value="6"></div>
        <div class="ctrl"><label for="lt">Lead time (days) <output id="ltV"></output></label><input type="range" id="lt" min="1" max="14" step="1" value="5"></div>
        <div class="ctrl"><label for="csl">Target cycle service level <output id="cslV"></output></label><input type="range" id="csl" min="0.8" max="0.99" step="0.01" value="0.95"></div>
        <div class="ctrl"><label for="q">Order quantity Q (and S − s) <output id="qV"></output></label><input type="range" id="q" min="40" max="800" step="10" value="320"></div>
        <div class="ctrl"><label for="r">Review period R (days) <output id="rV"></output></label><input type="range" id="r" min="1" max="21" step="1" value="7"></div>
        <div class="ctrl"><label for="k">Cost per order <output id="kV"></output></label><input type="range" id="k" min="10" max="300" step="10" value="80"></div>
        <div class="ctrl"><label for="sv">Order cost saving on fixed review days <output id="svV"></output></label><input type="range" id="sv" min="0" max="0.8" step="0.05" value="0.4"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The four rules</h2>
          <ul>
            <li><b>(s, Q)</b>: watch continuously; when inventory position reaches s, order Q. The classic <a href="#reorder-point">reorder point</a> rule. Simple, fixed order sizes suit pallet or truck quantities.</li>
            <li><b>(s, S)</b>: same trigger, but order S − position. If one big customer order drops stock well below s, the order is bigger to make up the gap. With a fixed cost per order, the best possible rule takes this form (Scarf, 1960).</li>
            <li><b>(R, S)</b>: every R days, order S − position. Order size varies; orders happen on known days. Safety stock covers R + L days.</li>
            <li><b>(R, s, S)</b>: every R days, order up to S only if position is at or below s. Fewer, larger orders than (R, S).</li>
          </ul>
          <p>Inventory position = on hand + on order − backorders. Always trigger on position, not on hand, or you'll reorder again while the first order is still on its way.</p>
        </section>
        <section>
          <h2>How the parameters are set here</h2>
          <ul>
            <li>Continuous rules: s = μL + z σ √L, and S = s + Q.</li>
            <li>(R, S): S = μ(R + L) + z σ √(R + L).</li>
            <li>(R, s, S): s = μ(R + L) + z σ √(R + L), and S = s + Q.</li>
          </ul>
          <p>These are the textbook approximations; the simulation shows what they actually deliver. The undershoot (how far below s stock is when an order triggers) isn't in the formulas, which is why big customer orders hurt the continuous rules' service. See <a href="#inventory-simulation">inventory simulation</a> for more on where formulas fall short.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>At the defaults the four rules cost within about 15% of each other. (R, S) reviews weekly, so it orders about 52 times a year in lots of ~140: less stock than (s, Q), more ordering cost, even with periodic orders 40% cheaper.</li>
            <li>Set the order cost saving to 0: (R, S) now costs over $6,000 a year against about $4,300 for the continuous rules. Without a saving from ordering on fixed days, continuous review wins.</li>
            <li>Raise the customer order size SD to 20: big single orders undershoot s, and (s, Q)'s fill rate falls further than (s, S)'s, which orders extra to make up the gap.</li>
            <li>Watch the review-period chart: very short reviews mean many small orders; long ones mean lots of safety stock. With the defaults the cheapest (R, S) review is every 10 days or so.</li>
            <li>Notice (R, s, S) fills almost 100%: with s set to cover R + L days, it's cautious. In practice s is tuned down by simulation until the service target is just met.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ osd: +$("#osd").value, lt: +$("#lt").value, csl: +$("#csl").value, q: +$("#q").value, r: +$("#r").value, k: +$("#k").value, sv: +$("#sv").value });
    const sigma = (p) => Math.sqrt(LAM * (MEAN_SIZE ** 2 + p.osd ** 2));
    function params(p, key, R = p.r) {
      const z = qnorm(p.csl), s1 = sigma(p);
      if (key === "sQ" || key === "sS") { const s = MU * p.lt + z * s1 * Math.sqrt(p.lt); return { s, S: s + p.q, Q: p.q }; }
      const S0 = MU * (R + p.lt) + z * s1 * Math.sqrt(R + p.lt);
      return key === "RS" ? { S: S0, s: S0 } : { s: S0, S: S0 + p.q };
    }
    function demand(r, p) {
      // Poisson number of customer orders; each order size lognormal with mean MEAN_SIZE and SD osd
      let n = 0, L = Math.exp(-LAM), pr = r(); while (pr > L) { n++; pr *= r(); }
      let d = 0; const s2 = Math.log(1 + (p.osd / MEAN_SIZE) ** 2), m = Math.log(MEAN_SIZE) - s2 / 2, sg = Math.sqrt(s2);
      for (let i = 0; i < n; i++) d += p.osd ? Math.max(1, Math.round(Math.exp(m + sg * r.normal()))) : MEAN_SIZE;
      return d;
    }
    function run(p, key, days, seed, R = p.r, log = false) {
      const r = rng(seed), par = params(p, key, R), periodic = key === "RS" || key === "RsS"; let oh = par.S, pos = oh; const pipe = [];
      let orders = 0, short = 0, dem = 0, ship = 0, hold = 0; const trace = [];
      for (let t = 0; t < days + 30; t++) {
        for (let i = pipe.length - 1; i >= 0; i--) if (pipe[i][0] === t) { oh += pipe[i][1]; pipe.splice(i, 1); }
        const d = demand(r, p), sh = Math.min(d, Math.max(0, oh)); oh -= d; pos -= d;
        let ord = 0;
        if (!periodic) { if (pos <= par.s) { ord = key === "sQ" ? Math.ceil((par.s - pos + 1e-9) / par.Q) * par.Q : par.S - pos; } }
        else if (t % R === 0) { if (key === "RS" ? pos < par.S : pos <= par.s) ord = par.S - pos; }
        ord = Math.round(ord);
        if (ord > 0) { pipe.push([t + p.lt, ord]); pos += ord; if (t >= 30) orders++; }
        if (t >= 30) { dem += d; ship += sh; hold += Math.max(0, oh); short += d - sh; if (log && t < 30 + SHOW) trace.push({ t: t - 29, oh, pos, ord, rev: periodic && t % R === 0 }); }
      }
      const yrs = days / 365, kk = periodic ? p.k * (1 - p.sv) : p.k;
      return { par, orders: orders / yrs, fill: ship / dem, avg: hold / days, cH: (H * hold) / yrs, cK: (kk * orders) / yrs, cP: (PEN * short) / yrs, trace, kk };
    }
    let cache = {};
    function all(p) {
      const key = JSON.stringify(p); if (cache.key === key) return cache.v;
      const res = Object.fromEntries(POL.map(([k]) => [k, run(p, k, 365 * YRS, 21)]));
      const Rs = [1, 2, 3, 4, 5, 7, 10, 14, 21], sweep = Rs.map((R) => { const a = run(p, "RS", 365 * 6, 9, R), b = run(p, "RsS", 365 * 6, 9, R); return { R, a: a.cH + a.cK + a.cP, b: b.cH + b.cK + b.cP }; });
      const v = { res, sweep }; cache = { key, v }; return v;
    }
    const tot = (x) => x.cH + x.cK + x.cP;
    const C1 = new Plot($("#c1"), { pad: { l: 56, b: 38 } }), C2 = new Plot($("#c2"), { pad: { l: 64, b: 38 } }), C3 = new Plot($("#c3"), { pad: { l: 64, b: 38 } });
    function d1(p) {
      const one = run(p, pol, SHOW, 5, p.r, true), tr = one.trace, par = one.par, g = C1.ctx, col = css(POL.find((x) => x[0] === pol)[2]);
      const ys = tr.flatMap((d) => [d.oh, d.pos]).concat([par.S]);
      C1.resize(); C1.x = [0, SHOW + 1]; C1.y = [Math.min(0, ...ys) - 10, Math.max(...ys) * 1.08]; C1.clear(); C1.axes({ xLabel: "day", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      g.fillStyle = css("--bad"); g.globalAlpha = 0.16; tr.forEach((d) => { if (d.oh < 0) g.fillRect(C1.sx(d.t - 0.5), C1.pad.t, Math.max(1, C1.sx(1) - C1.sx(0)), C1.ih); }); g.globalAlpha = 1;
      if (pol !== "RS") C1.path([0, SHOW + 1], [par.s, par.s], css("--muted"), 1.3, [5, 4]);
      if (pol !== "sQ") C1.path([0, SHOW + 1], [par.S, par.S], css("--ink"), 1.3, [2, 3]);
      C1.path([0, SHOW + 1], [0, 0], css("--line"), 1);
      tr.forEach((d) => { if (d.rev) C1.path([d.t, d.t], [C1.y[0], C1.y[0] + (C1.y[1] - C1.y[0]) * 0.04], css("--muted"), 1); });
      C1.path(tr.map((d) => d.t), tr.map((d) => d.pos), col, 1.2, [3, 2]); C1.path(tr.map((d) => d.t), tr.map((d) => d.oh), col, 2);
      tr.forEach((d) => { if (d.ord) C1.dot(d.t, d.pos, 3, col, col); });
      const sw = (c, t, k) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">${k === "dot" ? `<span style="width:7px;height:7px;border-radius:50%;background:${c}"></span>` : `<span style="width:20px;border-top:2px ${k} ${c}"></span>`}${t}</span>`;
      const name = POL.find((x) => x[0] === pol)[1], orders = tr.filter((d) => d.ord), sizes = orders.map((d) => d.ord);
      $("#c1Cap").innerHTML = `<span style="display:block;margin-bottom:4px">${sw(col, "on hand", "solid")}${sw(col, "inventory position", "dashed")}${sw(col, "order placed", "dot")}${pol !== "RS" ? sw(css("--muted"), `s = ${fmt(par.s, 0)}`, "dashed") : ""}${pol !== "sQ" ? sw(css("--ink"), `S = ${fmt(par.S, 0)}`, "dotted") : ""}</span>${name}: ${orders.length} orders in ${SHOW} days, sizes ${sizes.length ? `${fmt(Math.min(...sizes), 0)} to ${fmt(Math.max(...sizes), 0)}` : "none"}${pol === "RS" || pol === "RsS" ? `; ticks on the axis are review days, every ${p.r}` : ""}. Red bands: days with customers waiting.`;
    }
    function d2(p, V) {
      const rows = POL.map(([k, n, c]) => ({ k, n, c, ...V.res[k] })), mx = Math.max(...rows.map(tot));
      C2.resize(); C2.x = [0, mx * 1.18]; C2.y = [0, rows.length]; C2.clear(); C2.axes({ xLabel: "$ per year", yTicks: [], xFormat: (v) => fmt(v, 0), xCount: 4 });
      const g = C2.ctx, bh = C2.ih / rows.length, parts = [["cH", "--accent"], ["cK", "--warm"], ["cP", "--bad"]];
      rows.forEach((r, i) => { const y = C2.pad.t + i * bh; let x0 = 0; parts.forEach(([k, c]) => { g.fillStyle = css(c); g.globalAlpha = 0.8; g.fillRect(C2.sx(x0), y + bh * 0.22, C2.sx(x0 + r[k]) - C2.sx(x0), bh * 0.56); x0 += r[k]; }); g.globalAlpha = 1;
        g.fillStyle = css("--ink"); g.font = `${r.k === pol ? "600 " : ""}12px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(r.n, C2.pad.l - 8, y + bh / 2); g.font = `10px ${css("--font-mono")}`; g.textAlign = "left"; g.fillText(fmt(tot(r), 0), C2.sx(tot(r)) + 4, y + bh / 2); });
      const best = rows.reduce((a, b) => (tot(b) < tot(a) ? b : a));
      const sw = (c, t) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px"><span style="width:10px;height:10px;background:var(${c})"></span>${t}</span>`;
      $("#c2Cap").innerHTML = `${sw("--accent", "holding")}${sw("--warm", "ordering")}${sw("--bad", "shortage")}<br>Cheapest here: ${best.n} at $${fmt(tot(best), 0)} a year. Periodic orders cost $${fmt(p.k * (1 - p.sv), 0)} each against $${p.k} for orders placed any day.`;
    }
    function d3(p, V) {
      const sw = V.sweep, c = tot(V.res.sQ), ys = sw.flatMap((s) => [s.a, s.b]).concat([c]);
      C3.resize(); C3.x = [0, 22]; C3.y = [0, Math.max(...ys) * 1.1]; C3.clear(); C3.axes({ xLabel: "review period R (days)", yLabel: "$ per year", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      C3.path([0, 22], [c, c], css("--accent"), 1.5, [5, 4]);
      C3.path(sw.map((s) => s.R), sw.map((s) => s.a), css("--warm"), 2); C3.path(sw.map((s) => s.R), sw.map((s) => s.b), css("--good"), 2);
      sw.forEach((s) => { C3.dot(s.R, s.a, 2.5, css("--warm"), css("--warm")); C3.dot(s.R, s.b, 2.5, css("--good"), css("--good")); });
      const bestA = sw.reduce((a, b) => (b.a < a.a ? b : a)), bestB = sw.reduce((a, b) => (b.b < a.b ? b : a));
      C3.dot(bestA.R, bestA.a, 5, "transparent", css("--ink"));
      const swc = (cc, t, d) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px"><span style="width:20px;border-top:2px ${d} var(${cc})"></span>${t}</span>`;
      $("#c3Cap").innerHTML = `${swc("--warm", "(R, S)", "solid")}${swc("--good", "(R, s, S)", "solid")}${swc("--accent", "(s, Q) for comparison", "dashed")}<br>Cheapest review period: every ${bestA.R} day${bestA.R === 1 ? "" : "s"} for (R, S) ($${fmt(bestA.a, 0)}), every ${bestB.R} for (R, s, S) ($${fmt(bestB.b, 0)}).`;
    }
    function tbl(p, V) {
      const pr = (k, par) => (k === "sQ" ? `s ${fmt(par.s, 0)}, Q ${fmt(par.Q, 0)}` : k === "RS" ? `R ${p.r}, S ${fmt(par.S, 0)}` : k === "sS" ? `s ${fmt(par.s, 0)}, S ${fmt(par.S, 0)}` : `R ${p.r}, s ${fmt(par.s, 0)}, S ${fmt(par.S, 0)}`);
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);width:100%;min-width:620px"><thead><tr style="color:var(--muted);text-align:right">${["rule", "settings", "orders / yr", "avg on hand", "fill rate", "holding", "ordering", "shortage", "total $"].map((h, i) => `<th style="padding:3px 6px;${i < 2 ? "text-align:left" : ""}">${h}</th>`).join("")}</tr></thead><tbody>` +
        POL.map(([k, n]) => { const r = V.res[k]; return `<tr style="text-align:right;border-top:1px solid var(--line);${k === pol ? "font-weight:600" : ""}"><td style="padding:3px 6px;text-align:left;white-space:nowrap">${n}</td><td style="padding:3px 6px;text-align:left;white-space:nowrap">${pr(k, r.par)}</td><td style="padding:3px 6px">${fmt(r.orders, 1)}</td><td style="padding:3px 6px">${fmt(r.avg, 0)}</td><td style="padding:3px 6px"><span class="pill ${r.fill < 0.97 ? "warn" : "ok"}">${fmt(r.fill * 100, 1)}%</span></td><td style="padding:3px 6px">${fmt(r.cH, 0)}</td><td style="padding:3px 6px">${fmt(r.cK, 0)}</td><td style="padding:3px 6px">${fmt(r.cP, 0)}</td><td style="padding:3px 6px">${fmt(tot(r), 0)}</td></tr>`; }).join("") +
        `</tbody></table><p class="hint" style="margin:8px 0 0">Holding = $${H} × average on hand × 365. Ordering = orders × cost per order. Shortage = $${PEN} × units customers had to wait for. Demand SD per day σ = √(λ(mean² + SD²)) = √(${LAM} × (${MEAN_SIZE}² + ${p.osd}²)) = ${fmt(sigma(p), 1)}.</p>`;
    }
    function readouts(p, V) {
      const r = V.res[pol], par = r.par, z = qnorm(p.csl), s1 = sigma(p), per = pol === "RS" || pol === "RsS", days = per ? p.r + p.lt : p.lt;
      $("#ro").innerHTML = [["Protection period", `${per ? `R + L = ${p.r} + ${p.lt}` : `L`} = ${days} days`], ["Safety stock", `${fmt(z, 2)} × ${fmt(s1, 1)} × √${days} = ${fmt(z * s1 * Math.sqrt(days), 0)}`], [pol === "RS" ? "Order-up-to S" : "Trigger s", fmt(pol === "RS" ? par.S : par.s, 0)], ["Total cost per year", `$${fmt(tot(r), 0)}`]].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function labels(p) { $("#osdV").textContent = p.osd; $("#ltV").textContent = p.lt; $("#cslV").textContent = fmt(p.csl * 100, 0) + "%"; $("#qV").textContent = p.q; $("#rV").textContent = p.r; $("#kV").textContent = "$" + p.k; $("#svV").textContent = fmt(p.sv * 100, 0) + "%"; }
    function draw() { const p = P(), V = all(p); labels(p); d1(p); d2(p, V); d3(p, V); tbl(p, V); readouts(p, V); }
    ["osd", "lt", "csl", "q", "r", "k", "sv"].forEach((id) => $("#" + id).addEventListener("input", draw));
    $("#ps").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; pol = b.dataset.p; $("#ps").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); pol = "RS"; $("#ps").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.p === pol)); draw(); });
    draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
