Lab.register({
  id: "inventory-simulation",
  group: "Supply chain",
  title: "Monte Carlo inventory simulation: does the safety stock formula deliver?",
  blurb: "Set a reorder point with the textbook formula, then play out hundreds of years of daily demand and random lead times. See the service you'd really get, how much it varies year to year, and where the formula is wrong.",
  lede: "The safety stock formula promises, say, a 95% chance of not running out in each replenishment cycle. It gets there by assuming demand over the lead time is normal, orders never overtake each other, and the inputs are exactly right. A simulation makes none of those assumptions: it walks through every day, draws demand and lead times at random, and counts what happens. Run it a few hundred times and you see both the true service level and how much one year can differ from the next.",
  quiz: [
    ["What's the difference between cycle service level and fill rate?", "Cycle service level is the share of replenishment cycles with no stock-out at all. Fill rate is the share of units demanded that are shipped from stock. A cycle that runs short by 2 units counts as a failure for CSL but barely dents the fill rate."],
    ["Why does a bigger order quantity raise the fill rate but not the cycle service level?", "Safety stock sets the chance of running out in each cycle. Bigger orders mean fewer cycles a year, so fewer chances to run out, and the shortfall in a bad cycle is a smaller share of a bigger order."],
    ["Daily demand is usually steady but now and then a customer orders several days' worth at once. The mean and SD are unchanged. What does that do to the formula's promise?", "The formula only uses the mean and SD and assumes a normal shape. Lumpy demand has a long right tail, so stock-outs are more frequent than the formula says at high service targets. The simulation shows the gap."],
    ["Why run many simulated years instead of one?", "One year is a single draw: with ~20 cycles it can land well above or below the long-run service level by chance. Many years give the average and the spread, so you know how disappointing a bad year can be."],
    ["Your simulation says the formula falls short. What are the two levers?", "Raise the reorder point (more safety stock) or reduce the variation that causes it: shorter or more reliable lead times, or splitting lumpy orders. The trade-off curve shows how much stock each extra point of service costs."],
  ],
  diy: {
    intro: "One row per day. Daily demand mean in H1, SD in H2; lead time mean in H3, SD in H4; reorder point s in H5; order quantity Q in H6. Start on hand (C1) at s + Q.",
    steps: [
      ["Random daily demand (normal, never below 0).", "B2: =MAX(0, ROUND(NORM.INV(RAND(), $H$1, $H$2), 0))"],
      ["Units arriving today: sum of orders whose arrival day is today (orders log in columns J:K).", "D2: =SUMIF($K:$K, A2, $J:$J)"],
      ["On hand after receipts and demand (negative = backorder).", "C2: =C1 + D2 - B2"],
      ["Shipped from stock, for the fill rate.", "E2: =MIN(B2, MAX(0, C1 + D2))"],
      ["Inventory position = on hand + on order; order Q when it drops to s, with a random lead time.", "F2: =C2 + SUMIFS($J:$J, $K:$K, \">\"&A2, $I:$I, \"<=\"&A2)\nG2: =IF(F2<=$H$5, $H$6, 0)   arrival: =A2 + MAX(1, ROUND(NORM.INV(RAND(), $H$3, $H$4), 0))"],
      ["Fill rate for the year.", "=SUM(E2:E366) / SUM(B2:B366)"],
      ["Repeat the year many times: Data ▸ What-If Analysis ▸ Data Table with an empty input cell, then average and take percentiles.", "=AVERAGE(results)   =PERCENTILE.INC(results, 0.1)"],
    ],
  },
  deeper: [
    ["Silver, Pyke & Thomas (2017), Inventory and Production Management in Supply Chains, 4th ed., CRC Press", "https://doi.org/10.1201/9781315374406", "the standard text on (s, Q) policies, service measures and their formulas"],
    ["Law (2015), Simulation Modeling and Analysis, 5th ed., McGraw-Hill", "https://www.mheducation.com/highered/product/simulation-modeling-analysis-law/M9780073401324.html", "how to build, run and analyse simulations properly, including warm-up and number of runs"],
    ["Axsäter (2015), Inventory Control, 3rd ed., Springer", "https://doi.org/10.1007/978-3-319-15729-0", "exact and approximate service formulas, including stochastic lead times"],
    ["Eppen & Martin (1988), Determining safety stock in the presence of stochastic lead time and demand, Management Science 34(11)", "https://doi.org/10.1287/mnsc.34.11.1380", "shows the usual normal approximation can be badly wrong, and how to do better"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12 L20 40 L20 14 L38 44 L38 10 L56 50 L56 16 L74 38 L74 12 L92 42" stroke-opacity=".45"/><path d="M4 18 L20 30 L20 20 L38 36 L38 16 L56 40 L56 22 L74 30 L74 18 L92 34"/><path d="M4 46 H92" stroke-dasharray="4 3"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, qnorm, pnorm, dnorm } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const MU = 20, DAYS = 365, WARM = 60, YEARS = 300;
    let seed = 11, shape = "norm";
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("One simulated year")}</div><canvas id="c1" style="height:300px" aria-label="On-hand stock over one simulated year with stock-outs marked"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", `Fill rate in each of ${YEARS} simulated years`, 260, "Histogram of yearly fill rates against the formula's prediction"), fig("c3", "Stock you hold vs service you get", 260, "Average stock against cycle service level as the reorder point changes, formula and simulation"))}
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4("The first 14 days, worked")}<div id="tbl"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">One item, average demand ${MU} a day. You set the reorder point with the formula, then the simulation checks it.</p>
        <div class="ctrl"><label>Shape of daily demand</label><div class="seg" id="ds"><button type="button" data-d="norm" aria-pressed="true">Normal</button><button type="button" data-d="skew" aria-pressed="false">Skewed</button><button type="button" data-d="lumpy" aria-pressed="false">Lumpy (big orders)</button></div></div>
        <div class="ctrl"><label for="sd">Daily demand SD <output id="sdV"></output></label><input type="range" id="sd" min="2" max="16" step="1" value="6"></div>
        <div class="ctrl"><label for="lt">Average lead time (days) <output id="ltV"></output></label><input type="range" id="lt" min="2" max="20" step="1" value="7"></div>
        <div class="ctrl"><label for="lsd">Lead time SD (days) <output id="lsdV"></output></label><input type="range" id="lsd" min="0" max="5" step="0.5" value="2"></div>
        <div class="ctrl"><label for="csl">Target cycle service level <output id="cslV"></output></label><input type="range" id="csl" min="0.8" max="0.995" step="0.005" value="0.95"></div>
        <div class="ctrl"><label for="q">Order quantity Q <output id="qV"></output></label><input type="range" id="q" min="40" max="600" step="20" value="200"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">Simulate a different year</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>What the formula assumes</h2>
          <p>Reorder point s = d × L + z × σ<sub>LT</sub>, with σ<sub>LT</sub> = √(L σ<sub>d</sub>² + d² σ<sub>L</sub>²), from the <a href="#reorder-point">reorder point page</a>. Behind it:</p>
          <ul>
            <li>Demand over the lead time is normal. With lumpy or skewed demand and short lead times it isn't, and the tail is longer than the formula thinks.</li>
            <li>Only one order is outstanding at a time, and orders arrive in the order placed. With small Q and long, variable lead times, orders overlap and cross.</li>
            <li>Demand that can't be met waits (backorders). The fill rate formula 1 − σ<sub>LT</sub> G(z) / Q is an approximation that is poor when Q is small next to σ<sub>LT</sub>.</li>
          </ul>
        </section>
        <section>
          <h2>How the simulation works</h2>
          <ol>
            <li>Start with s + Q on hand. Each day: receive any orders due, take that day's random demand, ship what's on hand, backorder the rest.</li>
            <li>If inventory position (on hand + on order − backorders) is at or below s, place an order for Q with a random lead time.</li>
            <li>Skip the first ${WARM} days (the warm-up, before the pattern settles), then count a year: units shipped from stock, cycles with a stock-out, average stock.</li>
            <li>Repeat ${YEARS} times with fresh random numbers. The average is the answer; the spread is how much any one year can disappoint.</li>
          </ol>
          <p>The same approach works for anything the formulas can't handle: lost sales instead of backorders, minimum order quantities, shelf life, supplier disruptions. See <a href="#monte-carlo-risk">Monte Carlo risk simulation</a> for the general method.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>At the defaults the simulation lands close to the formula: about 94% of cycles without a stock-out against a 95% target, and the fill rates agree. Most of the risk here is the lead time SD (2 days × ${MU} a day), so the demand shape hardly matters yet.</li>
            <li>Set lead time SD to 0, daily SD to 16 and the target to 99%. Normal demand still hits 99%. Switch to skewed or lumpy: the same mean and SD, but only about 95–96% of cycles avoid a stock-out. The formula only sees the SD, not the long tail.</li>
            <li>Reset, then set Q = 40 and lead time SD = 5. Now the formula errs the other way: it promises 95% but the simulation gives almost 100%. With several orders out at once, early and late deliveries partly cancel, so the d² σ<sub>L</sub>² term overstates the risk and you'd hold stock you don't need.</li>
            <li>Look at the histogram: even when the average is on target, some years come in well below it. A one-year review can blame a policy that's fine.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ sd: +$("#sd").value, lt: +$("#lt").value, lsd: +$("#lsd").value, csl: +$("#csl").value, q: +$("#q").value, shape });
    function demandGen(p) {
      const m = MU, s = p.sd;
      if (p.shape === "skew") { const s2 = Math.log(1 + (s / m) ** 2), mu = Math.log(m) - s2 / 2, sg = Math.sqrt(s2); return (r) => Math.max(0, Math.round(Math.exp(mu + sg * r.normal()))); }
      if (p.shape === "lumpy") { const L = lumpy(p); return (r) => (r() < L.pb ? Math.round(L.B) : Math.max(0, Math.round(L.mb + L.sb * r.normal()))); }
      return (r) => Math.max(0, Math.round(m + s * r.normal()));
    }
    // lumpy: 2% of days bring one big order B; the rest are steady (SD half the slider). B is set so the overall mean and SD match the sliders.
    function lumpy(p) { const pb = 0.02, sb = p.sd / 2, B = MU + Math.sqrt((p.sd ** 2 - (1 - pb) * sb * sb) * (1 - pb) / pb), mb = (MU - pb * B) / (1 - pb); return { pb, sb, B, mb }; }
    const moments = (p) => ({ m: MU, s: p.sd });
    function formula(p, csl = p.csl) {
      const { m, s } = moments(p), sLT = Math.sqrt(p.lt * s * s + m * m * p.lsd * p.lsd), z = qnorm(csl), ss = z * sLT, rop = m * p.lt + ss, G = dnorm(z) - z * (1 - pnorm(z));
      return { m, s, sLT, z, ss, rop, fill: Math.max(0, 1 - (sLT * G) / p.q), G };
    }
    function year(r, p, rop, gen, log) {
      let oh = rop + p.q, ordered = 0; const pipe = []; let ship = 0, dem = 0, cyc = 0, bad = 0, stockSum = 0, outDays = 0, orders = 0; const trace = [];
      for (let t = 0; t < WARM + DAYS; t++) {
        let rec = 0; for (let i = pipe.length - 1; i >= 0; i--) if (pipe[i].at === t) { rec += pipe[i].q; if (t >= WARM) { cyc++; if (pipe[i].short) bad++; } pipe.splice(i, 1); }
        oh += rec; ordered -= rec; const d = gen(r), sh = Math.min(d, Math.max(0, oh)), before = oh; oh -= d;
        if (oh < 0) pipe.forEach((o) => (o.short = true));
        let ord = 0; while (oh + ordered <= rop) { const L = Math.max(1, Math.round(p.lt + p.lsd * r.normal())); pipe.push({ q: p.q, at: t + L, short: false }); ordered += p.q; ord += p.q; if (t >= WARM) orders++; }
        if (t >= WARM) { ship += sh; dem += d; stockSum += Math.max(0, oh); if (oh < 0) outDays++; if (log) trace.push({ t: t - WARM + 1, d, rec, before, oh, pos: oh + ordered, ord }); }
      }
      return { fill: dem ? ship / dem : 1, csl: cyc ? 1 - bad / cyc : 1, avg: stockSum / DAYS, outDays, orders, trace };
    }
    let cache = {};
    function many(p, rop, n, sd) { const gen = demandGen(p), r = rng(sd), A = []; for (let i = 0; i < n; i++) A.push(year(r, p, rop, gen)); return A; }
    function stats(p) {
      const key = JSON.stringify(p); if (cache.key === key) return cache.v;
      const F = formula(p), Y = many(p, F.rop, YEARS, 77), avg = (k) => Y.reduce((s, y) => s + y[k], 0) / Y.length;
      const sweep = [0.8, 0.85, 0.9, 0.93, 0.95, 0.97, 0.98, 0.99, 0.995].map((c) => { const f = formula(p, c), Z = many(p, f.rop, 60, 5); return { c, rop: f.rop, fAvg: f.ss + p.q / 2, sCsl: Z.reduce((s, y) => s + y.csl, 0) / Z.length, sAvg: Z.reduce((s, y) => s + y.avg, 0) / Z.length }; });
      const v = { F, Y, csl: avg("csl"), fill: avg("fill"), avgStock: avg("avg"), outDays: avg("outDays"), orders: avg("orders"), sweep };
      cache = { key, v }; return v;
    }
    let one;
    const C1 = new Plot($("#c1"), { pad: { l: 56, b: 38 } }), C2 = new Plot($("#c2"), { pad: { l: 44, b: 38, r: 22 } }), C3 = new Plot($("#c3"), { pad: { l: 56, b: 38 } });
    function d1(p, S) {
      const tr = one.trace, xs = tr.map((d) => d.t), oh = tr.map((d) => d.oh), g = C1.ctx;
      C1.resize(); C1.x = [0, DAYS + 1]; C1.y = [Math.min(0, ...oh) - 10, Math.max(...tr.map((d) => d.pos), ...oh) * 1.08]; C1.clear();
      C1.axes({ xLabel: "day", yLabel: "", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      g.fillStyle = css("--bad"); g.globalAlpha = 0.18; tr.forEach((d) => { if (d.oh < 0) g.fillRect(C1.sx(d.t - 0.5), C1.pad.t, Math.max(1, C1.sx(1) - C1.sx(0)), C1.ih); }); g.globalAlpha = 1;
      C1.path([0, DAYS + 1], [S.F.rop, S.F.rop], css("--violet"), 1.5, [5, 4]);
      C1.path([0, DAYS + 1], [0, 0], css("--ink"), 1);
      C1.path(xs, tr.map((d) => d.pos), css("--muted"), 1, [2, 3]);
      C1.path(xs, oh, css("--accent"), 1.8);
      tr.forEach((d) => { if (d.ord) C1.dot(d.t, d.pos, 3, css("--warm"), css("--warm")); });
      const sw = (c, t, k) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">${k === "dot" ? `<span style="width:7px;height:7px;border-radius:50%;background:var(${c})"></span>` : k === "box" ? `<span style="width:12px;height:10px;background:var(${c});opacity:.3"></span>` : `<span style="width:20px;border-top:2px ${k} var(${c})"></span>`}${t}</span>`;
      $("#c1Cap").innerHTML = `<span style="display:block;margin-bottom:4px">${sw("--accent", "on hand", "solid")}${sw("--muted", "inventory position (incl. on order)", "dotted")}${sw("--violet", `reorder point s = ${fmt(S.F.rop, 0)}`, "dashed")}${sw("--warm", "order placed", "dot")}${sw("--bad", "short", "box")}</span>This year: ${one.orders} orders, ${one.outDays} day${one.outDays === 1 ? "" : "s"} short, fill rate ${fmt(one.fill * 100, 1)}%, cycle service ${fmt(one.csl * 100, 0)}%. Press “Simulate a different year” to see how much a single year moves around.`;
    }
    function d2(p, S) {
      const v = S.Y.map((y) => y.fill * 100), lo = Math.floor(Math.min(...v, S.F.fill * 100) - 0.5), hi = 100, nb = 24, w = (hi - lo) / nb, H = Array(nb).fill(0);
      v.forEach((x) => H[Math.min(nb - 1, Math.floor((x - lo) / w))]++);
      C2.resize(); C2.x = [lo, hi]; C2.y = [0, Math.max(...H) * 1.15]; C2.clear(); C2.axes({ xLabel: "fill rate in the year (%)", yLabel: "years", xFormat: (x) => fmt(x, 1), yFormat: (x) => fmt(x, 0), xCount: 5 });
      const g = C2.ctx; g.fillStyle = css("--accent"); g.globalAlpha = 0.75; H.forEach((h, i) => { if (h) g.fillRect(C2.sx(lo + i * w) + 1, C2.sy(h), C2.sx(lo + (i + 1) * w) - C2.sx(lo + i * w) - 2, C2.sy(0) - C2.sy(h)); }); g.globalAlpha = 1;
      C2.path([S.F.fill * 100, S.F.fill * 100], C2.y, css("--violet"), 1.8, [5, 4]); C2.path([S.fill * 100, S.fill * 100], C2.y, css("--ink"), 1.5);
      const sorted = [...v].sort((a, b) => a - b), p10 = sorted[Math.floor(YEARS * 0.1)];
      $("#c2Cap").innerHTML = `Solid: average over ${YEARS} years, ${fmt(S.fill * 100, 1)}%. Dashed purple: the formula's fill rate, 1 − σ<sub>LT</sub> G(z) / Q = 1 − ${fmt(S.F.sLT, 1)} × ${fmt(S.F.G, 4)} / ${p.q} = ${fmt(S.F.fill * 100, 1)}%. One year in ten comes in below ${fmt(p10, 1)}%.`;
    }
    function d3(p, S) {
      const sw = S.sweep, xs = sw.map((s) => s.sAvg).concat(sw.map((s) => s.fAvg));
      C3.resize(); C3.x = [Math.min(...xs) * 0.95, Math.max(...xs) * 1.03]; C3.y = [0.75, 1]; C3.clear();
      C3.axes({ xLabel: "average stock on hand (units)", yLabel: "cycle service level", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v * 100, 0) + "%", xCount: 5 });
      C3.path(sw.map((s) => s.fAvg), sw.map((s) => s.c), css("--violet"), 1.8, [5, 4]); C3.path(sw.map((s) => s.sAvg), sw.map((s) => s.sCsl), css("--accent"), 2.2);
      sw.forEach((s) => C3.dot(s.sAvg, s.sCsl, 2.5, css("--accent"), css("--accent")));
      C3.dot(S.avgStock, S.csl, 5, css("--warm"), css("--ink"));
      const g = C3.ctx; g.font = `600 11px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "middle"; const rx = C3.w - C3.pad.r - 6, by = C3.sy(0.75) - 30;
      [["--violet", "formula: target vs SS + Q/2", [5, 4]], ["--accent", "simulated", []]].forEach(([c, t, d], i) => { const y = by + i * 15; g.strokeStyle = css(c); g.lineWidth = 2; g.setLineDash(d); g.beginPath(); g.moveTo(rx - 22, y); g.lineTo(rx, y); g.stroke(); g.setLineDash([]); g.fillStyle = css(c); g.fillText(t, rx - 28, y); });
      $("#c3Cap").innerHTML = `Each point is a reorder point set by the formula for targets from 80% to 99.5%. Where the solid line sits below the dashed one, the formula over-promises; the orange dot is your current setting (${fmt(S.csl * 100, 1)}% simulated vs ${fmt(p.csl * 100, 1)}% target).`;
    }
    function tbl() {
      const rows = one.trace.slice(0, 14);
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);width:100%"><thead><tr style="color:var(--muted);text-align:right">${["day", "start on hand", "received", "demand", "end on hand", "position", "order placed"].map((h, i) => `<th style="padding:3px 6px;${i ? "" : "text-align:left"}">${h}</th>`).join("")}</tr></thead><tbody>` +
        rows.map((d) => `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 6px;text-align:left">${d.t}</td><td style="padding:3px 6px">${fmt(d.before - d.rec + 0, 0)}</td><td style="padding:3px 6px">${d.rec || ""}</td><td style="padding:3px 6px">${d.d}</td><td style="padding:3px 6px;color:var(${d.oh < 0 ? "--bad" : "--ink"})">${fmt(d.oh, 0)}</td><td style="padding:3px 6px">${fmt(d.pos, 0)}</td><td style="padding:3px 6px;color:var(--warm)">${d.ord || ""}</td></tr>`).join("") +
        `</tbody></table><p class="hint" style="margin:8px 0 0">End on hand = start + received − demand. Position = end on hand + everything on order. An order of Q goes in whenever position ≤ s; a negative on-hand figure is a backorder.</p>`;
    }
    function readouts(p, S) {
      const F = S.F, pill = (sim, tgt) => `<span class="pill ${sim < tgt - 0.02 ? "bad" : sim < tgt - 0.005 ? "warn" : "ok"}">${fmt(sim * 100, 1)}%</span>`;
      $("#ro").innerHTML = [
        ["Safety stock (formula)", `${fmt(F.z, 3)} × ${fmt(F.sLT, 1)} = ${fmt(F.ss, 0)}`],
        ["Reorder point s", `${MU} × ${p.lt} + ${fmt(F.ss, 0)} = ${fmt(F.rop, 0)}`],
        ["Cycle service: target / simulated", `${fmt(p.csl * 100, 1)}% / ${pill(S.csl, p.csl)}`],
        ["Fill rate: formula / simulated", `${fmt(F.fill * 100, 1)}% / ${pill(S.fill, F.fill)}`],
        ["Average stock: formula / simulated", `${fmt(F.ss + p.q / 2, 0)} / ${fmt(S.avgStock, 0)}`],
        ["Days short per year (simulated)", fmt(S.outDays, 1)],
      ].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function labels(p) { $("#sdV").textContent = p.shape === "lumpy" ? `${p.sd} (2% of days bring an order of ${fmt(lumpy(p).B, 0)})` : p.sd; $("#ltV").textContent = p.lt; $("#lsdV").textContent = fmt(p.lsd, 1); $("#cslV").textContent = fmt(p.csl * 100, 1) + "%"; $("#qV").textContent = p.q; }
    function draw() { const p = P(), S = stats(p); labels(p); one = year(rng(seed), p, S.F.rop, demandGen(p), true); d1(p, S); d2(p, S); d3(p, S); tbl(); readouts(p, S); }
    ["sd", "lt", "lsd", "csl", "q"].forEach((id) => $("#" + id).addEventListener("input", draw));
    $("#ds").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; shape = b.dataset.d; $("#ds").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    $("#resim").addEventListener("click", () => { seed++; draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 11; shape = "norm"; $("#ds").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.d === shape)); draw(); });
    draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
