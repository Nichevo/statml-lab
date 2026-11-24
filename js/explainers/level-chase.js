Lab.register({
  id: "level-vs-chase",
  group: "Supply chain",
  title: "S&OP: level vs chase production",
  blurb: "Seasonal demand, fixed capacity. Make the same amount every month and store the surplus, follow demand month by month, or mix the two. Compare the costs.",
  lede: "Sales and operations planning (S&OP) has to match a seasonal demand forecast with a factory that can't change speed for free. A level plan runs at a steady rate and lets inventory absorb the season. A chase plan changes the production rate every month to follow demand. Most real plans sit in between, and the right mix depends on what's more expensive: holding stock or changing the rate.",
  quiz: [
    ["Demand is 100, 100, 200, 200 over four months. What's the level rate, and how does stock move?", "Average = 150 a month. Cumulative production 150, 300, 450, 600 never falls behind cumulative demand 100, 200, 400, 600, so no opening stock is needed. Stock goes 50, 100, 50, 0."],
    ["When is a pure chase strategy the obvious choice?", "When the product can't be stored (fresh food, services, hotel rooms), or holding costs are very high, and capacity is cheap to change (temporary staff, flexible shifts)."],
    ["Why does a level plan sometimes need stock at the start of the year?", "If demand peaks early, producing the average falls behind before the slow months catch it up. That deficit has to be built in the previous year's quiet months and carried in as opening stock."],
    ["What does the hybrid slider represent in practice?", "A base rate the factory runs at all year, with overtime or temporary labour added only in the months when the base rate plus stock can't cover demand."],
  ],
  diy: {
    intro: "Monthly demand in B2:B13, capacity per month in H1, holding cost per unit-month in H2, cost per unit of rate change in H3, overtime premium in H4.",
    steps: [
      ["Level rate.", "H5: =AVERAGE(B2:B13)"],
      ["Opening stock needed so stock never goes negative: cumulative demand minus cumulative level production, take the largest.", "G2: =SUM($B$2:B2)-ROWS($B$2:B2)*$H$5\n=MAX(0,MAX(G2:G13))"],
      ["Level plan stock each month.", "C2: =opening+H5-B2\nC3: =C2+$H$5-B3"],
      ["Chase plan: produce demand each month; rate changes.", "D2: =B2\nE3: =ABS(D3-D2)"],
      ["Cost of a plan.", "=$H$2*SUM(stock)+$H$3*SUM(changes)+$H$4*SUMPRODUCT((production>$H$1)*(production-$H$1))"],
    ],
  },
  deeper: [
    ["Sales and operations planning — Wikipedia", "https://en.wikipedia.org/wiki/Sales_and_operations_planning", "the process this plan feeds"],
    ["Aggregate planning — Wikipedia", "https://en.wikipedia.org/wiki/Aggregate_planning", "level, chase and hybrid strategies"],
    ["MIT OpenCourseWare: Introduction to Operations Management", "https://ocw.mit.edu/courses/15-760b-introduction-to-operations-management-spring-2004/", "aggregate planning lecture notes"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor" opacity=".35"><rect x="6" y="40" width="10" height="18"/><rect x="20" y="32" width="10" height="26"/><rect x="34" y="20" width="10" height="38"/><rect x="48" y="12" width="10" height="46"/><rect x="62" y="24" width="10" height="34"/><rect x="76" y="38" width="10" height="20"/></g><line x1="4" y1="30" x2="90" y2="30" stroke-width="2.5"/><path d="M11 40 L25 32 L39 20 L53 12 L67 24 L81 38" stroke-dasharray="4 3"/></svg>`,

  mount(root) {
    const { Plot, watch, fmt, css } = Lab;
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const DEF = [800, 850, 1000, 1200, 1500, 1700, 1600, 1400, 1100, 950, 850, 900];
    const S = [
      { id: "level", name: "Level", col: "--violet" },
      { id: "chase", name: "Chase", col: "--warm" },
      { id: "hybrid", name: "Hybrid", col: "--accent" },
    ];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="lcc" aria-label="Monthly demand, production and inventory for the chosen strategy"></canvas>
          <div class="legend"><span><i style="background:var(--muted);opacity:.5;height:10px"></i>Demand</span><span><i id="pcol" style="background:var(--accent)"></i>Production</span><span><i style="background:var(--good)"></i>Inventory at month end</span><span><i style="background:var(--ink)"></i>Regular capacity</span></div>
          <figcaption id="lcap"></figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="lcb" aria-label="Total yearly cost of each strategy split by cost type"></canvas>
          <div class="legend"><span><i style="background:var(--good);height:10px"></i>Holding</span><span><i style="background:var(--warm);height:10px"></i>Rate changes</span><span><i style="background:var(--bad);height:10px"></i>Overtime</span></div>
          <figcaption>Yearly cost of each strategy, split by type. Shorter is better.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Month by month for the chosen strategy</h4>
          <div style="overflow-x:auto"><table id="tab" style="width:100%;border-collapse:collapse;font-size:.8rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono)"></table></div>
        </div>`,
      panel: `
        <div class="ctrl"><label>Show strategy</label>
          <div class="seg" id="st">${S.map((s, i) => `<button type="button" data-v="${s.id}" aria-pressed="${i === 2}">${s.name}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="hb">Hybrid base rate <output id="hbV"></output></label><input type="range" id="hb" min="0" max="100" step="1" value="45"></div>
        <div>
          <h4>Costs</h4>
          <div class="ctrl"><label for="cap">Regular capacity per month <output id="capV"></output></label><input type="range" id="cap" min="800" max="2000" step="50" value="1300"></div>
          <div class="ctrl"><label for="h">Holding, per unit per month <output id="hV"></output></label><input type="range" id="h" min="0" max="10" step="0.25" value="2"></div>
          <div class="ctrl"><label for="ch">Change rate, per unit of change <output id="chV"></output></label><input type="range" id="ch" min="0" max="20" step="0.5" value="5"></div>
          <div class="ctrl"><label for="ot">Overtime premium, per unit <output id="otV"></output></label><input type="range" id="ot" min="0" max="20" step="0.5" value="6"></div>
        </div>
        <div>
          <h4>Monthly demand forecast</h4>
          <textarea id="dem" rows="3" spellcheck="false" aria-label="Monthly demand, January to December" style="width:100%;font:12px/1.5 var(--font-mono);padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink)">${DEF.join(", ")}</textarea>
          <div class="btns" style="margin-top:6px"><button class="btn primary" id="use" type="button">Use these numbers</button></div>
          <p class="hint" id="msg">Twelve numbers, January to December.</p>
        </div>
        <div class="readouts" id="ro"></div>`,
      notes: `
        <section>
          <h2>The three plans</h2>
          <ul>
            <li><b>Level:</b> one rate all year, equal to average demand. In the slow months, the surplus goes into stock; in the peak, stock runs down. If the peak comes early, it needs opening stock carried over from last year.</li>
            <li><b>Chase:</b> produce each month's demand. No stock, but the rate changes every month, and peaks above regular capacity need overtime.</li>
            <li><b>Hybrid:</b> run at a base rate between the two, and add overtime only in the months when the base rate plus stock can't cover demand.</li>
          </ul>
          <div class="eq">level rate = average monthly demand<br>opening stock = max over months t of (cumulative demand to t − t × level rate)<br>cost = Σ holding × stock + change × |rate − last rate| + premium × units above capacity</div>
        </section>
        <section>
          <h2>What drives the choice</h2>
          <ul>
            <li>High holding cost (perishable, bulky, expensive) pushes toward chase.</li>
            <li>High cost of changing the rate (hiring, training, set-ups) pushes toward level.</li>
            <li>Tight regular capacity makes chase expensive in the peak, because every unit over capacity pays the overtime premium.</li>
            <li>Uncertainty matters too: stock built for a peak that doesn't come is a loss. That's where <a href="#prediction-intervals">prediction intervals</a> and <a href="#frozen-zones">frozen zones</a> come in.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set the holding cost to 0. Level wins: stock is free, and the rate never changes.</li>
            <li>Set the change cost and overtime to 0. Chase wins.</li>
            <li>With the defaults, slide the hybrid base rate and find the cheapest point. Often it beats both pure strategies.</li>
            <li>Paste a flat year (12 × 1000). All three plans become the same.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pM = new Plot($("#lcc"), { x: [-0.5, 11.5], pad: { l: 56 } });
    const pB = new Plot($("#lcb"), { pad: { l: 70, b: 30 } });
    let D = DEF.slice(), show = "hybrid";

    function plan(id, base) {
      const cap = +$("#cap").value, h = +$("#h").value, ch = +$("#ch").value, ot = +$("#ot").value;
      // The plan repeats every year, so each strategy starts the year with the stock it ends with.
      const levelRate = D.reduce((a, b) => a + b, 0) / 12;
      let cum = 0, open = 0;
      if (id === "level") D.forEach((d, t) => { cum += d; open = Math.max(open, cum - levelRate * (t + 1)); });
      const year = (I0) => { const P = []; let I = I0; D.forEach((d) => { const p = id === "level" ? levelRate : id === "chase" ? Math.max(0, d - I) : Math.max(base, d - I); P.push(p); I = I + p - d; }); return { P, end: I }; };
      if (id === "hybrid") { for (let k = 0; k < 20; k++) { const e = year(open).end; if (Math.abs(e - open) < 0.5) break; open = e; } }
      const { P } = year(open);
      const rows = []; let I = open, hold = 0, chg = 0, over = 0;
      P.forEach((p, t) => {
        I = I + p - D[t];
        const prev = t ? P[t - 1] : P[11], c = Math.abs(p - prev), o = Math.max(0, p - cap);
        hold += h * I; chg += ch * c; over += ot * o;
        rows.push({ t, d: D[t], p, I, c, o, cost: h * I + ch * c + ot * o });
      });
      return { P, rows, hold, chg, over, total: hold + chg + over, levelRate, open };
    }

    function draw() {
      const cap = +$("#cap").value, avg = D.reduce((a, b) => a + b, 0) / 12, lv = avg;
      const lo = Math.min(...D), base = Math.round(lo + ((lv - lo) * +$("#hb").value) / 100);
      $("#hbV").textContent = base; $("#capV").textContent = cap; $("#hV").textContent = "$" + $("#h").value; $("#chV").textContent = "$" + $("#ch").value; $("#otV").textContent = "$" + $("#ot").value;
      const res = Object.fromEntries(S.map((s) => [s.id, plan(s.id, base)]));
      const cur = res[show], sObj = S.find((s) => s.id === show);
      $("#pcol").style.background = `var(${sObj.col})`;

      const hi = Math.max(...D, ...cur.P, ...cur.rows.map((r) => r.I), cap) * 1.1;
      pM.y = [0, hi]; pM.clear();
      pM.axes({ xTicks: D.map((_, i) => i), xFormat: (v) => MON[v], yLabel: "units" });
      const g = pM.ctx, bw = (pM.sx(1) - pM.sx(0)) * 0.6;
      g.save(); g.fillStyle = css("--muted"); g.globalAlpha = 0.3;
      D.forEach((d, i) => g.fillRect(pM.sx(i) - bw / 2, pM.sy(d), bw, pM.sy(0) - pM.sy(d)));
      g.globalAlpha = 0.85; g.fillStyle = css("--bad");
      cur.rows.forEach((r, i) => { if (r.o > 0) g.fillRect(pM.sx(i) - bw / 2, pM.sy(r.p), bw, pM.sy(cap) - pM.sy(r.p)); });
      g.restore();
      pM.path([-0.5, 11.5], [cap, cap], css("--ink"), 1.5, [6, 4]);
      const xs = D.map((_, i) => i);
      pM.path(xs, cur.rows.map((r) => r.I), css("--good"), 2.2);
      pM.path(xs, cur.P, css(sObj.col), 3);
      cur.P.forEach((p, i) => pM.dot(i, p, 4, css(sObj.col), css("--surface")));
      $("#lcap").innerHTML = `${sObj.name} plan. Grey bars are demand; red caps show production above regular capacity (overtime). Average demand ${fmt(avg, 0)} a month. This plan starts the year with ${fmt(cur.open, 0)} in stock, the same as it ends with.`;

      const mx = Math.max(...S.map((s) => res[s.id].total)) * 1.1 || 1;
      pB.x = [0, mx]; pB.y = [-0.5, 2.5]; pB.clear();
      pB.axes({ yTicks: [], xLabel: "$ per year", xFormat: (v) => (v >= 1000 ? "$" + v / 1000 + "k" : "$" + v), xCount: 5 });
      const gb = pB.ctx, bh = (pB.sy(0) - pB.sy(1)) * 0.55, best = Math.min(...S.map((s) => res[s.id].total));
      S.forEach((s, i) => {
        const r = res[s.id], y = pB.sy(2 - i);
        let x = 0;
        [["hold", "--good"], ["chg", "--warm"], ["over", "--bad"]].forEach(([k, c]) => { gb.fillStyle = css(c); gb.fillRect(pB.sx(x), y - bh / 2, pB.sx(x + r[k]) - pB.sx(x), bh); x += r[k]; });
        gb.fillStyle = css("--ink"); gb.font = `${r.total === best ? 700 : 500} 12px ${css("--font-body")}`; gb.textAlign = "right"; gb.textBaseline = "middle";
        gb.fillText(s.name, pB.pad.l - 8, y);
        gb.textAlign = "left"; gb.font = `12px ${css("--font-mono")}`; gb.fillText("$" + Math.round(r.total).toLocaleString("en-US"), pB.sx(x) + 6, y);
      });

      $("#ro").innerHTML = S.map((s) => `<div class="ro"><b>${s.name}</b><span class="${res[s.id].total === best ? "pill ok" : "num"}">$${Math.round(res[s.id].total).toLocaleString("en-US")}</span></div>`).join("");

      const hd = (t) => `<th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted);font-family:var(--font-body)">${t}</th>`;
      const td = (t, x = "") => `<td style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--grid);${x}">${t}</td>`;
      const h = +$("#h").value, ch = +$("#ch").value, ot = +$("#ot").value;
      $("#tab").innerHTML = `<tr>${hd("month")}${hd("demand")}${hd("production")}${hd("end stock")}${hd("rate change")}${hd("overtime units")}${hd("holding $")}${hd("change $")}${hd("overtime $")}${hd("month cost")}</tr>` +
        cur.rows.map((r) => `<tr>${td(MON[r.t], "font-family:var(--font-body)")}${td(r.d)}${td(fmt(r.p, 0), "font-weight:600")}${td(fmt(r.I, 0))}${td(r.c > 0.5 ? (r.p > (r.t ? cur.P[r.t - 1] : cur.P[11]) ? "+" : "−") + fmt(r.c, 0) : "0")}${td(r.o > 0.5 ? fmt(r.o, 0) : "–", r.o ? "color:var(--bad)" : "")}${td(fmt(h * r.I, 0))}${td(fmt(ch * r.c, 0))}${td(fmt(ot * r.o, 0))}${td(fmt(r.cost, 0), "font-weight:600")}</tr>`).join("") +
        `<tr style="font-weight:700">${td("Year", "font-family:var(--font-body)")}${td(D.reduce((a, b) => a + b, 0))}${td(fmt(cur.P.reduce((a, b) => a + b, 0), 0))}${td("")}${td("")}${td("")}${td(fmt(cur.hold, 0))}${td(fmt(cur.chg, 0))}${td(fmt(cur.over, 0))}${td(fmt(cur.total, 0))}</tr>` +
        `<tr><td colspan="10" style="padding:6px;color:var(--muted);font-family:var(--font-body)">The plan repeats every year: it opens January with ${fmt(cur.open, 0)} units (December's closing stock), and the January rate change is measured against December.</td></tr>`;
    }

    $("#st").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { show = b.dataset.v; $("#st").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); draw(); }));
    ["#hb", "#cap", "#h", "#ch", "#ot"].forEach((s) => $(s).addEventListener("input", draw));
    $("#use").addEventListener("click", () => {
      const v = $("#dem").value.split(/[\s,;]+/).filter(Boolean).map(Number);
      if (v.length !== 12 || v.some((x) => !isFinite(x) || x < 0)) { $("#msg").textContent = `Need exactly 12 non-negative numbers; got ${v.length}.`; return; }
      D = v.map(Math.round); $("#msg").textContent = "Using your 12 months."; draw();
    });
    draw();
    return watch([pM.c, pB.c], (resized) => { if (resized) { pM.resize(); pB.resize(); } draw(); });
  },
});
