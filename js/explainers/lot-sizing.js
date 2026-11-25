Lab.register({
  id: "lot-sizing",
  group: "Supply chain",
  title: "Lot sizing: when demand is lumpy, how much to make at once?",
  blurb: "Twelve weeks of uneven requirements and a setup cost each time you run. Compare lot-for-lot, EOQ, periods of supply, Silver–Meal and the optimal Wagner–Whitin plan, and see the dynamic programming table that finds the optimum.",
  lede: "EOQ assumes steady demand. MRP hands you requirements that jump around: 140 one week, nothing the next, 200 the week after. Each production run or order has a fixed setup cost; each unit made early costs something to hold. Lot sizing decides which weeks to run and how much to cover. Simple rules get close; Wagner–Whitin's dynamic programming finds the cheapest plan exactly, by noticing that the best plan always produces exactly the demand of a run of consecutive weeks.",
  quiz: [
    ["Setup costs $200 and holding costs $1 per unit per week. Is it worth producing week 3's 10 units in week 2?", "Yes. Holding 10 units for one week costs $10, far less than a $200 setup. The question is how far ahead to go: holding week 5's 140 units for 3 weeks costs $420, more than a setup."],
    ["What property makes Wagner–Whitin tractable?", "In an optimal plan you only produce when stock runs out, and each run covers a whole number of upcoming weeks exactly. So you only need to compare 'which week does the last run start in', building up from week 1: dynamic programming over at most n(n+1)/2 options."],
    ["How does Silver–Meal decide how many weeks one run covers?", "It keeps adding weeks while the average cost per week covered (setup + holding so far, divided by weeks) is falling, and stops at the first rise."],
    ["Why can using EOQ on lumpy demand be expensive?", "It orders a fixed quantity that doesn't line up with the demand pattern, leaving odd leftovers that get carried for weeks, or forcing extra setups."],
    ["Why don't all planners use Wagner–Whitin if it's optimal?", "It's optimal only for the fixed horizon with known demand. As the plan rolls forward and forecasts change, the 'optimal' plan changes too, causing nervousness. Heuristics are simpler to explain, and often within a few percent."],
  ],
  diy: {
    intro: "Weekly requirements in C2:N2 (weeks 1–12). Setup cost K in B4, holding cost h per unit per week in B5.",
    steps: [
      ["Cost of one run in week i that covers weeks i..j: setup + holding of each later week's demand.", "=$B$4 + $B$5*SUMPRODUCT((COLUMN(Ci:Cj)-COLUMN(Ci))*Ci:Cj)"],
      ["Wagner–Whitin best cost up to week j (row 8, with F0 = 0 in B8).", "F(j) = MIN over i ≤ j of [ F(i−1) + cost(i..j) ]"],
      ["Work back: the i that gave F(12) is the last run; repeat from F(i−1).", ""],
      ["Silver–Meal from week i: average cost per week covered; stop when it rises.", "=($B$4 + holding so far) / weeks covered"],
      ["Periods of supply: round EOQ / average demand to whole weeks.", "=MAX(1, ROUND(SQRT(2*AVERAGE(C2:N2)*$B$4/$B$5)/AVERAGE(C2:N2), 0))"],
    ],
  },
  deeper: [
    ["Wagner & Whitin (1958), Dynamic version of the economic lot size model, Management Science 5(1)", "https://doi.org/10.1287/mnsc.5.1.89", "the original dynamic programming algorithm"],
    ["Silver & Meal (1973), A heuristic for selecting lot size quantities for the case of a deterministic time-varying demand rate and discrete opportunities for replenishment, Production and Inventory Management 14(2)", "https://en.wikipedia.org/wiki/Silver%E2%80%93Meal_heuristic", "the heuristic that bears their names"],
    ["Wagelmans, van Hoesel & Kolen (1992), Economic lot-sizing: an O(n log n) algorithm that runs in linear time in the Wagner–Whitin case, Operations Research 40(S1)", "https://doi.org/10.1287/opre.40.1.S145", "how to solve it much faster for long horizons"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 58 H90" stroke-opacity=".5"/><rect x="10" y="40" width="8" height="18"/><rect x="22" y="30" width="8" height="28"/><rect x="34" y="52" width="8" height="6"/><rect x="58" y="24" width="8" height="34"/><rect x="70" y="46" width="8" height="12"/><path d="M14 10 V20 M62 6 V20" stroke-width="3"/><path d="M14 20 L42 20 M62 20 L78 20" stroke-dasharray="3 3"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const D0 = [60, 100, 10, 0, 140, 90, 20, 200, 30, 70, 0, 110], N = D0.length;
    const M = [["ww", "Wagner–Whitin (optimal)", "--accent"], ["sm", "Silver–Meal", "--violet"], ["luc", "Least unit cost", "--good"], ["ppb", "Part-period balancing", "--muted"], ["poq", "Periods of supply", "--warm"], ["eoq", "Fixed EOQ", "--bad"], ["l4l", "Lot-for-lot", "--ink"]];
    let dem = [...D0], meth = "ww";
    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot" style="padding:14px;margin-bottom:14px;min-width:0;overflow-x:auto">${h4("Requirements per week (edit)")}<div id="dRow" style="display:grid;grid-template-columns:repeat(${N},minmax(44px,1fr));gap:4px;min-width:${N * 48}px"></div></div>
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("The plan")}</div><canvas id="c1" style="height:260px" aria-label="Weekly demand, production runs and stock carried"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "Cost of each method over 12 weeks", 270, "Stacked bars of setup and holding cost per method"), `<div class="plot" style="padding:14px;min-width:0;overflow-x:auto">${h4("Plan, week by week")}<div id="tbl"></div></div>`)}
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4("Wagner–Whitin table: cost if the last run starts in week i and covers up to week j")}<div id="ww"></div></div>`,
      panel: `
        <div class="ctrl"><label>Method shown</label><div class="seg" id="ms" style="flex-wrap:wrap">${M.map(([k, n]) => `<button type="button" data-m="${k}" aria-pressed="${k === meth}">${n.replace(" (optimal)", "")}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="k">Setup cost per run <output id="kV"></output></label><input type="range" id="k" min="20" max="800" step="10" value="200"></div>
        <div class="ctrl"><label for="h">Holding cost per unit per week <output id="hV"></output></label><input type="range" id="h" min="0.1" max="5" step="0.1" value="1"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="lumpy" type="button">Make demand lumpier</button><button class="btn" id="flat" type="button">Make demand steady</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The methods</h2>
          <ul>
            <li><b>Lot-for-lot</b>: make exactly each week's need. No holding cost, a setup every week with demand.</li>
            <li><b>Fixed EOQ</b>: always make EOQ = √(2 × average demand × K / h) when stock would run short (more if one week needs more).</li>
            <li><b>Periods of supply</b>: turn EOQ into a number of weeks, P = EOQ / average demand, and cover the next P weeks each run.</li>
            <li><b>Silver–Meal</b>: extend the run while the cost per week covered falls.</li>
            <li><b>Least unit cost</b>: extend while the cost per unit covered falls.</li>
            <li><b>Part-period balancing</b>: extend while the holding cost stays below the setup cost.</li>
            <li><b>Wagner–Whitin</b>: try every "last run starts in week i" for every week j, keep the best, and build up. Guaranteed cheapest for this horizon.</li>
          </ul>
        </section>
        <section>
          <h2>Reading the Wagner–Whitin table</h2>
          <p>Each cell (i, j) is the best cost to cover weeks 1 to j if the last run is in week i: the best cost up to week i − 1, plus a setup, plus holding weeks i+1..j's demand from week i. The best cell in each column (outlined) is F(j). Trace back from week 12: the outlined cell's row is the last run; jump to column i − 1 and repeat. In practice, lot sizes feed the <a href="#mrp-bom">MRP</a> record for each item, and constant replanning favours simple, stable rules. See also <a href="#moq">minimum order quantities</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>At the defaults, Wagner–Whitin costs $1,220. Part-period balancing happens to match it and Silver–Meal is within 7%; fixed EOQ and least unit cost save little over lot-for-lot's $2,000.</li>
            <li>Raise the setup cost to 800: lot-for-lot now costs $8,000 against an optimum of about $3,260, because every week with demand pays a setup.</li>
            <li>Lower the setup to 20: the optimum ($190) is barely below lot-for-lot ($200), since holding even a week costs about as much as a setup. Least unit cost does badly here ($640): adding a week keeps lowering the cost per unit, so it over-extends runs.</li>
            <li>Press "Make demand steady": every heuristic except fixed EOQ now finds the optimum. EOQ's fixed lot doesn't divide evenly into the weekly demand, so leftovers get carried.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ k: +$("#k").value, h: +$("#h").value });
    const runCost = (i, j, p) => { let c = p.k; for (let t = i; t <= j; t++) c += p.h * (t - i) * dem[t]; return c; };
    function fromRuns(runs, p) {
      // runs: array of [start, end] covering demand; returns per-week schedule and costs
      const prod = Array(N).fill(0); runs.forEach(([i, j]) => { for (let t = i; t <= j; t++) prod[i] += dem[t]; });
      return evalProd(prod, p);
    }
    function evalProd(prod, p) {
      let inv = 0, cS = 0, cH = 0; const end = [];
      for (let t = 0; t < N; t++) { if (prod[t] > 0) cS += p.k; inv += prod[t] - dem[t]; end.push(inv); cH += p.h * Math.max(0, inv); }
      return { prod, end, cS, cH, tot: cS + cH, runs: prod.filter((v) => v > 0).length };
    }
    const nextDemand = (t) => { while (t < N && dem[t] === 0) t++; return t; };
    function grow(p, crit) {
      const runs = []; let i = nextDemand(0);
      while (i < N) {
        let j = i, best = crit(i, i, p);
        for (let jj = i + 1; jj < N; jj++) { if (dem[jj] === 0) continue; const c = crit(i, jj, p); if (c === null || c > best + 1e-9) break; best = c; j = jj; }
        runs.push([i, j]); i = nextDemand(j + 1);
      }
      return runs;
    }
    function methods(p) {
      const R = {};
      // Wagner–Whitin
      const F = [0], arg = [], tab = Array.from({ length: N }, () => Array(N).fill(null));
      for (let j = 0; j < N; j++) { let best = Infinity, bi = 0; for (let i = 0; i <= j; i++) { const c = F[i] + (dem.slice(i, j + 1).some((v) => v) ? runCost(i, j, p) : 0); tab[i][j] = c; if (c < best - 1e-9) { best = c; bi = i; } } F.push(best); arg.push(bi); }
      const runs = []; let j = N - 1; while (j >= 0) { const i = arg[j]; if (dem.slice(i, j + 1).some((v) => v)) runs.unshift([i, j]); j = i - 1; }
      R.ww = { ...fromRuns(runs, p), tab, F, arg };
      R.sm = fromRuns(grow(p, (i, j) => runCost(i, j, p) / (j - i + 1)), p);
      R.luc = fromRuns(grow(p, (i, j) => { const u = dem.slice(i, j + 1).reduce((a, b) => a + b, 0); return u ? runCost(i, j, p) / u : null; }), p);
      R.ppb = fromRuns(grow(p, (i, j) => { const hc = runCost(i, j, p) - p.k; return hc <= p.k ? 0 : null; }), p);
      const avg = dem.reduce((a, b) => a + b, 0) / N, eoq = avg > 0 ? Math.sqrt((2 * avg * p.k) / p.h) : 0, per = Math.max(1, Math.round(avg > 0 ? eoq / avg : 1));
      const poq = []; let i = nextDemand(0); while (i < N) { const j = Math.min(N - 1, i + per - 1); poq.push([i, j]); i = nextDemand(j + 1); }
      R.poq = { ...fromRuns(poq, p), per };
      const prod = Array(N).fill(0); let inv = 0; for (let t = 0; t < N; t++) { if (inv < dem[t]) { const q = Math.max(Math.round(eoq), dem[t] - inv); prod[t] = q; inv += q; } inv -= dem[t]; }
      R.eoq = { ...evalProd(prod, p), eoq };
      R.l4l = evalProd(dem.map((v) => v), p);
      return R;
    }
    let R;
    const C1 = new Plot($("#c1"), { pad: { l: 56, b: 38 } }), C2 = new Plot($("#c2"), { pad: { l: 150, b: 38, r: 50 } });
    const sw = (c, t, k) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">${k === "box" ? `<span style="width:12px;height:10px;background:var(${c})"></span>` : `<span style="width:20px;border-top:2px ${k} var(${c})"></span>`}${t}</span>`;
    function d1(p) {
      const r = R[meth], col = M.find((m) => m[0] === meth)[2], top = Math.max(...dem, ...r.prod, ...r.end) * 1.12 || 1;
      C1.resize(); C1.x = [0.3, N + 0.7]; C1.y = [0, top]; C1.clear(); C1.axes({ xLabel: "week", yLabel: "units", xTicks: Array.from({ length: N }, (_, i) => i + 1), xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const g = C1.ctx, bw = (C1.sx(1) - C1.sx(0)) * 0.34;
      dem.forEach((d, t) => { const x = C1.sx(t + 1); g.fillStyle = css("--muted"); g.globalAlpha = 0.45; g.fillRect(x - bw - 1, C1.sy(d), bw, C1.sy(0) - C1.sy(d)); g.globalAlpha = 1; const q = r.prod[t]; if (q) { g.fillStyle = css(col); g.globalAlpha = 0.85; g.fillRect(x + 1, C1.sy(q), bw, C1.sy(0) - C1.sy(q)); g.globalAlpha = 1; g.fillStyle = css("--ink"); g.font = `10px ${css("--font-mono")}`; g.textAlign = "center"; g.textBaseline = "bottom"; g.fillText(fmt(q, 0), x + 1 + bw / 2, C1.sy(q) - 2); } });
      C1.path(r.end.map((_, t) => t + 1), r.end, css("--ink"), 1.5, [4, 3]); r.end.forEach((v, t) => C1.dot(t + 1, v, 2.5, css("--ink"), css("--ink")));
      $("#c1Cap").innerHTML = `${sw("--muted", "requirement", "box")}${sw(col, "production run", "box")}${sw("--ink", "stock carried at week end", "dashed")}<br>${M.find((m) => m[0] === meth)[1]}: ${r.runs} runs, setup $${fmt(r.cS, 0)} + holding $${fmt(r.cH, 0)} = <b>$${fmt(r.tot, 0)}</b>${meth === "ww" ? "" : `, ${fmt(((r.tot - R.ww.tot) / R.ww.tot) * 100, 1)}% above the optimum`}.`;
    }
    function d2() {
      const rows = M.map(([k, n, c]) => ({ k, n, c, ...R[k] })), mx = Math.max(...rows.map((r) => r.tot));
      C2.resize(); C2.x = [0, mx * 1.05]; C2.y = [0, rows.length]; C2.clear(); C2.axes({ xLabel: "$ over 12 weeks", yTicks: [], xFormat: (v) => fmt(v, 0), xCount: 4 });
      const g = C2.ctx, bh = C2.ih / rows.length;
      rows.forEach((r, i) => { const y = C2.pad.t + i * bh; g.fillStyle = css("--warm"); g.globalAlpha = 0.85; g.fillRect(C2.sx(0), y + bh * 0.2, C2.sx(r.cS) - C2.sx(0), bh * 0.6); g.fillStyle = css("--accent"); g.fillRect(C2.sx(r.cS), y + bh * 0.2, C2.sx(r.tot) - C2.sx(r.cS), bh * 0.6); g.globalAlpha = 1;
        g.fillStyle = css("--ink"); g.font = `${r.k === meth ? "600 " : ""}11px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(r.n.replace(" (optimal)", ""), C2.pad.l - 6, y + bh / 2); g.font = `10px ${css("--font-mono")}`; g.textAlign = "left"; g.fillText(fmt(r.tot, 0), C2.sx(r.tot) + 4, y + bh / 2); });
      const s = [...rows].sort((a, b) => a.tot - b.tot);
      $("#c2Cap").innerHTML = `${sw("--warm", "setups", "box")}${sw("--accent", "holding", "box")}<br>Cheapest heuristic: ${s.find((r) => r.k !== "ww").n}, ${fmt(((s.find((r) => r.k !== "ww").tot - R.ww.tot) / R.ww.tot) * 100, 1)}% above optimal. EOQ = ${fmt(R.eoq.eoq, 0)} units; periods of supply = ${R.poq.per} week${R.poq.per === 1 ? "" : "s"}.`;
    }
    function tbl(p) {
      const r = R[meth];
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);width:100%"><thead><tr style="color:var(--muted);text-align:right">${["week", "need", "make", "stock at end", "setup $", "holding $"].map((h, i) => `<th style="padding:3px 6px;${i ? "" : "text-align:left"}">${h}</th>`).join("")}</tr></thead><tbody>` +
        dem.map((d, t) => `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:2px 6px;text-align:left">${t + 1}</td><td style="padding:2px 6px">${d}</td><td style="padding:2px 6px;color:var(--accent);font-weight:600">${r.prod[t] || ""}</td><td style="padding:2px 6px">${fmt(r.end[t], 0)}</td><td style="padding:2px 6px">${r.prod[t] ? p.k : ""}</td><td style="padding:2px 6px">${r.end[t] ? fmt(p.h * r.end[t], 0) : ""}</td></tr>`).join("") +
        `<tr style="text-align:right;border-top:2px solid var(--line);font-weight:600"><td style="padding:3px 6px;text-align:left">total</td><td></td><td></td><td></td><td style="padding:3px 6px">${fmt(r.cS, 0)}</td><td style="padding:3px 6px">${fmt(r.cH, 0)}</td></tr></tbody></table>`;
    }
    function ww() {
      const W = R.ww, best = new Set(); let j = N - 1; while (j >= 0) { best.add(`${W.arg[j]},${j}`); j = W.arg[j] - 1; }
      $("#ww").innerHTML = `<table style="border-collapse:collapse;font:.74rem var(--font-mono);min-width:${N * 52 + 60}px;width:100%"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 5px;text-align:left">run in ↓ / up to →</th>${dem.map((_, t) => `<th style="padding:3px 5px">${t + 1}</th>`).join("")}</tr></thead><tbody>` +
        dem.map((_, i) => `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 5px;text-align:left;color:var(--muted)">week ${i + 1}</td>${dem.map((__, jj) => { if (jj < i) return `<td></td>`; const v = W.tab[i][jj], isMin = W.arg[jj] === i, onPath = best.has(`${i},${jj}`); return `<td style="padding:3px 5px;${isMin ? "outline:1.5px solid var(--accent);outline-offset:-2px;" : ""}${onPath ? "background:color-mix(in srgb, var(--accent) 22%, transparent);font-weight:600;" : "color:var(--muted);"}">${fmt(v, 0)}</td>`; }).join("")}</tr>`).join("") +
        `<tr style="text-align:right;border-top:2px solid var(--line);font-weight:600"><td style="padding:3px 5px;text-align:left">F(j)</td>${W.F.slice(1).map((v) => `<td style="padding:3px 5px">${fmt(v, 0)}</td>`).join("")}</tr></tbody></table><p class="hint" style="margin:8px 0 0">Outlined: the cheapest way to reach week j. Shaded: the cells on the optimal path, traced back from week ${N}. Example: cell (week i, up to j) = F(i − 1) + setup + holding, e.g. run in week 1 covering 1–2 = 0 + ${$("#k").value} + ${$("#h").value} × 1 × ${dem[1]} = ${fmt(W.tab[0][1], 0)}.</p>`;
    }
    function readouts(p) {
      const r = R[meth];
      $("#ro").innerHTML = [["Runs", r.runs], ["Setup + holding", `$${fmt(r.cS, 0)} + $${fmt(r.cH, 0)}`], ["Total", `$${fmt(r.tot, 0)}`], ["Optimum (Wagner–Whitin)", `$${fmt(R.ww.tot, 0)}`]].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function inputs() { $("#dRow").innerHTML = dem.map((v, t) => `<label style="display:flex;flex-direction:column;align-items:center;font:.72rem var(--font-mono);color:var(--muted)">wk ${t + 1}<input type="number" min="0" max="999" step="10" value="${v}" data-w="${t}" style="width:100%;text-align:center;font:.85rem var(--font-mono);padding:4px 2px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink)"></label>`).join(""); }
    function labels(p) { $("#kV").textContent = "$" + p.k; $("#hV").textContent = "$" + fmt(p.h, 1); }
    function draw() { const p = P(); labels(p); R = methods(p); d1(p); d2(); tbl(p); ww(); readouts(p); }
    inputs();
    $("#dRow").addEventListener("input", (e) => { const t = +e.target.dataset.w; if (isNaN(t)) return; dem[t] = Math.max(0, Math.round(+e.target.value || 0)); draw(); });
    $("#ms").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; meth = b.dataset.m; $("#ms").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    ["k", "h"].forEach((id) => $("#" + id).addEventListener("input", draw));
    $("#lumpy").addEventListener("click", () => { const tot = dem.reduce((a, b) => a + b, 0); dem = [0, 180, 0, 0, 260, 0, 40, 0, 300, 0, 0, 120].map((v) => Math.round((v * tot) / 900)); inputs(); draw(); });
    $("#flat").addEventListener("click", () => { const tot = dem.reduce((a, b) => a + b, 0); dem = Array(N).fill(Math.round(tot / N)); inputs(); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); dem = [...D0]; meth = "ww"; $("#ms").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.m === meth)); inputs(); draw(); });
    draw();
    return watch([$("#c1"), $("#c2")], draw);
  },
});
