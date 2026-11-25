Lab.register({
  id: "stress-test",
  group: "Risk",
  title: "Stress-testing a supply chain",
  blurb: "Hit a simple two-supplier supply chain with a named shock (port closure, supplier outage, demand surge, freight spike, or all at once) and follow it week by week: stock, lost sales, extra cost, time to recover. Then run it in reverse: how big a shock does it take to break your service target?",
  lede: "Probabilities of rare events are hard to pin down, so banks and, more and more, supply chain teams also ask a plainer question: if this specific bad thing happened, what would it do to us? A stress test plays a named scenario through a model of the operation and reads off the damage. A reverse stress test turns it around and finds the smallest shock that breaks you, which is often the more useful number.",
  quiz: [
    ["How is a stress test different from Monte Carlo?", "Monte Carlo draws thousands of random futures and gives probabilities. A stress test plays one chosen, severe but plausible scenario and gives its impact. No probability is needed, which is the point when you can't estimate one."],
    ["What does a reverse stress test tell you?", "The smallest shock that breaks a limit you care about, for example fill rate below 95%. Then you ask: is a shock that size plausible? If a 3-week port closure breaks you, that's a finding even if nobody can say how likely it is."],
    ["Why does a port closure echo weeks after the port reopens?", "Goods stuck at the port arrive in one lump, and no new orders went to the overseas supplier while it was shut. That gap in orders lands six weeks later as a second dip in stock. With less safety stock, the echo turns into a second round of lost sales."],
    ["Which helps more against a long supplier outage: safety stock or flexible capacity at a second supplier?", "For short shocks, stock. For long ones, flexible capacity, because stock runs out and then every extra week is lost, while a second supplier who can ramp up keeps serving. Try both on the 'supplier down' scenario."],
    ["Why test combined scenarios?", "Real crises bundle shocks: a pandemic closes ports, shifts demand and doubles freight at the same time. Effects can interact; a demand surge during a supply gap is far worse than either alone."],
  ],
  diy: {
    intro: "One row per week (26 rows). Columns: demand B, arrivals C, stock D, sold E, lost F, order G. Base demand 1,000; supplier A lead time 6 weeks, supplier B 2 weeks; shock weeks flagged in H (1 = shock).",
    steps: [
      ["Stock after arrivals, then sales.", "E3: =MIN(D2+C3, B3)   F3: =B3-E3   D3: =D2+C3-E3"],
      ["Target inventory position and the order.", "G3: =MAX(0, 1000*(safety_weeks+1) + 4800 - (D3 + SUM(pipeline)))   (4,800 = what is normally in transit)"],
      ["Split the order; A is cut to zero while it's down.", "A: =IF(H3=1, 0, 0.7*G3)   B: =MIN(IF(H3=1, G3, 0.3*G3), 300*(1+flex))"],
      ["Arrivals: A's order lands 6 rows down, B's 2 rows down.", "C9: =A_order_row3 + B_order_row7"],
      ["Service and cost.", "fill rate =SUM(E:E)/SUM(B:B)   lost revenue =SUM(F:F)*price"],
      ["Reverse stress test: raise the shock size until fill rate drops below target.", "Data > What-If Analysis > Goal Seek (set fill rate to 0.95 by changing severity)"],
    ],
  },
  deeper: [
    ["Simchi-Levi & Simchi-Levi (2020), We need a stress test for critical supply chains, Harvard Business Review", "https://hbr.org/2020/04/we-need-a-stress-test-for-critical-supply-chains", "the case for supply chain stress tests"],
    ["Ivanov (2020), Predicting the impacts of epidemic outbreaks on global supply chains, Transportation Research Part E 136", "https://doi.org/10.1016/j.tre.2020.101922", "simulating a pandemic shock: timing matters more than size"],
    ["Basel Committee (2018), Stress testing principles", "https://www.bis.org/bcbs/publ/d450.htm", "how banks design scenarios, including reverse stress tests"],
    ["Tomlin (2006), On the value of mitigation and contingency strategies for managing supply chain disruption risks, Management Science 52(5)", "https://doi.org/10.1287/mnsc.1050.0487", "stock versus flexible capacity"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 20 H28 L36 50 H52 L60 22 H90"/><rect x="30" y="8" width="26" height="48" fill="currentColor" fill-opacity=".12" stroke="none"/><path d="M6 56 H90" stroke-opacity=".5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const SC = {
      port: ["Port closure", (s) => ({ port: Math.round(4 * s) })],
      down: ["Supplier A down", (s) => ({ down: Math.round(6 * s) })],
      surge: ["Demand surge", (s) => ({ surge: 0.4 * s, sdur: 8 })],
      freight: ["Freight ×2", (s) => ({ freight: s })],
      combo: ["Pandemic (all at once)", (s) => ({ port: Math.round(3 * s), surge: 0.25 * s, sdur: 8, freight: s })],
    };
    const W = 26, T0 = 4, BASE = 1000, LA = 6, LB = 2, PRICE = 50, PREM = 4, FRA = 2, UNIT = 30;
    let sc = "port";
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("Week by week through the shock")}</div><canvas id="c1" style="height:300px" aria-label="Weekly sales, lost sales and stock on hand through the shock"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "Reverse stress test: how big a shock breaks you?", 300, "Fill rate against the size of the shock, with the service target and the breaking point"), `<div class="plot" style="padding:14px;min-width:0;overflow-x:auto">${h4("Every scenario at this size")}<div id="tbl"></div></div>`)}`,
      panel: `
        <p class="hint" style="margin:0">One product, 1,000 units a week. 70% comes from supplier A overseas (6 weeks door to door, through one port), 30% from supplier B nearby (2 weeks, a bit dearer). The shock starts in week ${T0 + 1}.</p>
        <div class="ctrl"><label>Scenario</label><div class="seg" id="sc" style="flex-wrap:wrap">${Object.entries(SC).map(([k, [n]]) => `<button type="button" data-s="${k}" aria-pressed="${k === sc}">${n}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="sev">Size of the shock <output id="sevV"></output></label><input type="range" id="sev" min="0" max="2.5" step="0.05" value="1"></div>
        <div class="ctrl"><label for="ss">Safety stock <output id="ssV"></output></label><input type="range" id="ss" min="0" max="6" step="0.5" value="1"></div>
        <div class="ctrl"><label for="fx">Supplier B can ramp up by <output id="fxV"></output></label><input type="range" id="fx" min="0" max="2" step="0.1" value="0.5"></div>
        <div class="ctrl"><label for="tg">Service target (fill rate over 26 weeks) <output id="tgV"></output></label><input type="range" id="tg" min="0.85" max="0.99" step="0.01" value="0.95"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>What the model does each week</h2>
          <ol>
            <li>Goods arrive: supplier A's orders from 6 weeks ago, B's from 2 weeks ago.</li>
            <li>Customers buy what's on the shelf; anything more is a lost sale.</li>
            <li>The planner orders up to a target: enough to cover what's in transit over the lead time, one week of sales, and the safety stock, minus stock and everything already on order. 70% goes to A and 30% to B. If A is down or the port is shut, the whole order goes to B, up to its normal 300 a week times (1 + ramp-up).</li>
          </ol>
          <p>It's deliberately small, a <a href="#bullwhip-effect">beer-game</a>-sized model, but it already shows the main effects: delayed arrivals, lumps after reopening, and a recovery that outlasts the shock.</p>
        </section>
        <section>
          <h2>Designing scenarios</h2>
          <p>Good scenarios are severe but plausible, specific (which port, how long), and tied to things that have happened: the 2021 Suez blockage, a typhoon at a chip plant, a strike, a viral product. Run each alone and then combined, because shocks that arrive together interact. Report impacts the business feels: fill rate, lost revenue, extra cost, weeks to recover.</p>
        </section>
        <section>
          <h2>Reverse stress testing</h2>
          <p>Instead of asking “what does a 4-week closure do?”, ask “what length of closure breaks our 95% fill rate?”. The chart sweeps the shock size and marks the breaking point. If it's a shock you could easily imagine, you have a finding without needing a probability. Banks have been required to run reverse stress tests since the 2008 crisis.</p>
        </section>
        <section>
          <h2>Where it fits</h2>
          <p>Use <a href="#supplier-disruption">TTR/TTS</a> to find which sites to test, a stress test to see what a named shock does, and <a href="#monte-carlo-risk">Monte Carlo</a> or <a href="#var-cvar">VaR and CVaR</a> when you can put probabilities on the inputs.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Port closure: stock runs out, a lump arrives when the port reopens, and a second dip follows about six weeks later. Set safety stock to 0 and size 1.5×: the echo costs sales too.</li>
            <li>Supplier A down: raise safety stock to 6 weeks, then instead set it to 1 week and B's ramp-up to 200%. Compare the cost.</li>
            <li>Demand surge alone is handled; the pandemic scenario, with a smaller surge plus a closure, is not.</li>
            <li>Freight ×2 costs money but no sales: not every stress shows up in service.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ sev: +$("#sev").value, ss: +$("#ss").value, fx: +$("#fx").value, tg: +$("#tg").value });
    function run(key, sev, ss, fx) {
      const S = SC[key][1](sev), capB = 300 * (1 + fx), arr = new Array(W + LA + 2).fill(0), arrA = new Array(W + LA + 2).fill(0), out = [];
      for (let k = 1; k <= LA; k++) arrA[k - 1] += 700; for (let k = 1; k <= LB; k++) arr[k - 1] += 300;
      let I = ss * BASE + BASE, held = 0, lost = 0, sold = 0, dem = 0, extra = 0, bUnits = 0;
      const portShut = (t) => S.port && t >= T0 && t < T0 + S.port, aDown = (t) => S.down && t >= T0 && t < T0 + S.down, inSurge = (t) => S.surge && t >= T0 && t < T0 + S.sdur, inShock = (t) => portShut(t) || aDown(t) || inSurge(t) || (S.freight && t >= T0 && t < T0 + 8);
      for (let t = 0; t < W; t++) {
        let inA = arrA[t]; if (portShut(t)) { held += inA; inA = 0; } else if (held && S.port && t === T0 + S.port) { inA += held; held = 0; }
        const recv = inA + arr[t]; I += recv;
        const d = BASE * (1 + (inSurge(t) ? S.surge : 0)), s = Math.min(I, d); I -= s; lost += d - s; sold += s; dem += d;
        let pipe = held; for (let k = t + 1; k < arr.length; k++) pipe += arr[k] + arrA[k];
        const q = Math.max(0, BASE * (ss + 1) + 4800 - (I + pipe)), aOff = aDown(t) || portShut(t);
        let qB = aOff ? Math.min(q, capB) : Math.min(0.3 * q, capB), qA = aDown(t) ? 0 : q - qB;
        if (portShut(t)) qA = 0; // no new orders through a shut port
        arr[t + LB] += qB; arrA[t + LA] += qA;
        if (qB > 300) extra += (qB - 300) * PREM; bUnits += qB;
        if (S.freight && t >= T0 && t < T0 + 8) extra += inA * FRA * S.freight;
        out.push({ t, d, s, l: d - s, I, recv, shock: inShock(t) });
      }
      const lastLost = out.reduce((m, o) => (o.l > 0.5 ? o.t : m), -1), firstLost = out.findIndex((o) => o.l > 0.5);
      return { out, fill: sold / dem, lost, lostRev: lost * PRICE, extra, rec: lastLost < 0 ? 0 : lastLost - T0 + 1, firstLost, S };
    }
    const k$ = (v) => (v >= 1e6 ? "$" + fmt(v / 1e6, 2) + "m" : "$" + fmt(v / 1000, 0) + "k");
    const C1 = new Plot($("#c1"), { x: [-0.5, W - 0.5], pad: { l: 56, b: 38 } }), C2 = new Plot($("#c2"), { x: [0, 2.5], y: [0.5, 1.01], pad: { l: 50, b: 38 } });
    function d1(r, p) {
      const ym = Math.max(...r.out.map((o) => Math.max(o.d, o.I, o.recv))) * 1.1;
      C1.resize(); C1.y = [0, ym]; C1.clear(); C1.axes({ xLabel: "week", yLabel: "units", xTicks: [0, 4, 8, 12, 16, 20, 24, 28], xFormat: (v) => fmt(v + 1, 0), yFormat: (v) => fmt(v, 0) });
      const g = C1.ctx, bw = C1.iw / W * 0.7;
      r.out.forEach((o) => { if (o.shock) { g.fillStyle = css("--warm"); g.globalAlpha = 0.1; g.fillRect(C1.sx(o.t - 0.5), C1.pad.t, C1.sx(o.t + 0.5) - C1.sx(o.t - 0.5), C1.ih); g.globalAlpha = 1; }
        g.fillStyle = css("--accent"); g.globalAlpha = 0.55; g.fillRect(C1.sx(o.t) - bw / 2, C1.sy(o.s), bw, C1.sy(0) - C1.sy(o.s)); g.fillStyle = css("--bad"); g.globalAlpha = 0.85; g.fillRect(C1.sx(o.t) - bw / 2, C1.sy(o.d), bw, C1.sy(o.s) - C1.sy(o.d)); g.globalAlpha = 1; });
      C1.path(r.out.map((o) => o.t), r.out.map((o) => o.I), css("--ink"), 2);
      C1.path(r.out.map((o) => o.t), r.out.map((o) => o.recv), css("--violet"), 1.5, [4, 3]);
      $("#c1Cap").innerHTML = `Blue bars: units sold. Red on top: lost sales. Black line: stock left at the end of the week. Purple dashed: goods arriving. Orange band: shock in force. Fill rate ${fmt(r.fill * 100, 1)}%; ${fmt(r.lost, 0)} units lost${r.rec ? `; the last lost sale is in week ${T0 + r.rec}, ${r.rec} weeks after the shock began` : ""}.`;
    }
    function sweep(p) { const xs = [], ys = []; for (let s = 0; s <= 2.5001; s += 0.05) { xs.push(s); ys.push(run(sc, s, p.ss, p.fx).fill); } return { xs, ys }; }
    function d2(p) {
      const { xs, ys } = sweep(p), lo = Math.min(0.8, ...ys) - 0.02;
      C2.resize(); C2.y = [lo, 1.01]; C2.clear(); C2.axes({ xLabel: "size of the shock (1 = the standard scenario)", yLabel: "fill rate", xFormat: (v) => fmt(v, 1) + "×", yFormat: (v) => fmt(v * 100, 0) + "%" });
      C2.path([0, 2.5], [p.tg, p.tg], css("--bad"), 1.5, [5, 4]);
      C2.path(xs, ys, css("--accent"), 2.5);
      const br = xs.find((x, i) => ys[i] < p.tg - 1e-9), cur = run(sc, p.sev, p.ss, p.fx).fill;
      C2.dot(p.sev, cur, 6, css("--ink"), css("--surface"));
      if (br !== undefined) C2.path([br, br], C2.y, css("--bad"), 1.5);
      const desc = (s) => { const S = SC[sc][1](s); return [S.port ? `${S.port}-week port closure` : "", S.down ? `${S.down}-week supplier outage` : "", S.surge ? `${fmt(S.surge * 100, 0)}% demand surge` : "", S.freight ? `freight ×${fmt(1 + S.freight, 1)}` : ""].filter(Boolean).join(" + "); };
      $("#c2Cap").innerHTML = br === undefined ? `Even at 2.5× the ${SC[sc][0].toLowerCase()} scenario, fill rate stays above ${fmt(p.tg * 100, 0)}%.` : `Breaking point: <b>${fmt(br, 2)}×</b>, that is a ${desc(br)}, takes fill rate below ${fmt(p.tg * 100, 0)}%. Black dot: the size you've set (${desc(p.sev) || "no shock"}).`;
      return br;
    }
    function tbl(p) {
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.78rem var(--font-mono);white-space:nowrap;width:100%"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 6px;text-align:left">scenario</th><th style="padding:3px 6px">fill rate</th><th style="padding:3px 6px">lost sales</th><th style="padding:3px 6px">extra cost</th><th style="padding:3px 6px">weeks to recover</th></tr></thead><tbody>` +
        Object.keys(SC).map((k) => { const r = run(k, p.sev, p.ss, p.fx); return `<tr style="text-align:right;border-top:1px solid var(--line);${k === sc ? "background:var(--accent-soft)" : ""}"><td style="padding:3px 6px;text-align:left;font-family:var(--font-body)">${SC[k][0]}</td><td style="padding:3px 6px"><span class="pill ${r.fill < p.tg ? "bad" : "ok"}">${fmt(r.fill * 100, 1)}%</span></td><td style="padding:3px 6px">${k$(r.lostRev)}</td><td style="padding:3px 6px">${k$(r.extra)}</td><td style="padding:3px 6px">${r.rec || "–"}</td></tr>`; }).join("") +
        `</tbody></table><p class="hint" style="margin:8px 0 0">Lost sales at $${PRICE} a unit. Extra cost: B's premium of $${PREM} a unit above its normal 300 a week, plus extra freight. Holding ${fmt(p.ss, 1)} weeks of safety stock costs about ${k$(p.ss * BASE * UNIT * 0.25)} a year.</p>`;
    }
    function readouts(r, br, p) {
      $("#ro").innerHTML = [
        ["Fill rate over 26 weeks", `<span class="pill ${r.fill < p.tg ? "bad" : "ok"}">${fmt(r.fill * 100, 1)}%</span>`],
        ["Lost revenue", `<span class="num">${k$(r.lostRev)}</span>`],
        ["Extra cost", `<span class="num">${k$(r.extra)}</span>`],
        ["Weeks to recover", `<span class="num">${r.rec || "–"}</span>`],
        ["Breaking point (reverse stress test)", `<span class="pill ${br === undefined ? "ok" : br < 1 ? "bad" : "warn"}">${br === undefined ? "> 2.5×" : fmt(br, 2) + "×"}</span>`],
      ].map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { const p = P(); $("#sevV").textContent = fmt(p.sev, 2) + "×"; $("#ssV").textContent = fmt(p.ss, 1) + " weeks"; $("#fxV").textContent = fmt(p.fx * 100, 0) + "%"; $("#tgV").textContent = fmt(p.tg * 100, 0) + "%"; }
    function draw() { labels(); const p = P(), r = run(sc, p.sev, p.ss, p.fx); d1(r, p); const br = d2(p); tbl(p); readouts(r, br, p); }
    root.querySelectorAll("#sc button").forEach((b) => b.addEventListener("click", () => { sc = b.dataset.s; root.querySelectorAll("#sc button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); }));
    root.querySelectorAll("input[type=range]").forEach((e) => e.addEventListener("input", draw));
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); sc = "port"; root.querySelectorAll("#sc button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.s === "port")); draw(); });
    draw();
    return watch([$("#c1"), $("#c2")], draw);
  },
});
