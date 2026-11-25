Lab.register({
  id: "genetic-algorithm",
  group: "Optimization",
  title: "Genetic algorithms: evolving a warehouse network",
  blurb: "Which of 16 candidate warehouse sites should you open? Each plan is a string of 16 yes/no genes. Watch a population of plans breed, mutate and get selected over generations, see diversity collapse, and check the result against the true best plan found by trying all 65,536.",
  lede: "A genetic algorithm searches by imitating evolution. It keeps a population of candidate plans, picks the better ones as parents, mixes their genes (crossover), changes a few at random (mutation), and repeats. It needs no formula for the slope of the problem and copes with yes/no choices, odd costs and rules that linear programming can't express. In exchange, it gives no proof that its answer is the best.",
  quiz: [
    ["What is a chromosome here?", "A plan written as genes: 16 yes/no values, one per candidate site, 1 = open. The fitness of a plan is its total cost: fixed costs of the open sites plus the cost of serving each customer from its nearest open site."],
    ["Why both crossover and mutation?", "Crossover combines good parts of two plans (one parent's good western sites, the other's good eastern ones). Mutation brings in genes nobody in the population has, so the search doesn't get stuck. Turn either off and watch the result suffer."],
    ["What does selection pressure do?", "With a large tournament, only the very best plans breed: fast progress, but the population loses variety and can lock onto a good-but-not-best plan. With size 1, selection is random and the search drifts."],
    ["Why keep the best plan each generation (elitism)?", "So a lucky good plan isn't lost through crossover or mutation. The best cost can then only stay the same or improve."],
    ["When would you use a GA instead of integer programming?", "When the problem won't fit a linear model (complex rules, simulation-based costs) or is too big for a solver in the time you have. If it does fit a MIP and the solver finishes, the solver wins: it's exact and tells you how close it is."],
  ],
  diy: {
    intro: "Excel Solver has a GA-style method called Evolutionary. Sites in columns, customers in rows: distance matrix D3:S62 (60 customers × 16 sites), demand in B3:B62, open flags (0/1) in D1:S1, fixed cost per site in D2:S2.",
    steps: [
      ["Distance to the nearest open site for each customer (array formula).", "T3: =MIN(IF($D$1:$S$1=1, D3:S3))   (Ctrl+Shift+Enter in older Excel)"],
      ["Transport cost and total cost.", "U3: =B3*T3*rate   total: =SUMPRODUCT(D1:S1, D2:S2) + SUM(U3:U62)"],
      ["Solver: minimise total by changing D1:S1, with D1:S1 binary and at least one open.", "Data > Solver, method Evolutionary"],
      ["Its options mirror the sliders here: population size and mutation rate.", "Solver > Options > Evolutionary"],
      ["Compare with the exact answer: switch the method to Simplex LP after writing the model with assignment variables.", "see the integer programming page"],
    ],
  },
  deeper: [
    ["Holland (1975/1992), Adaptation in natural and artificial systems, MIT Press", "https://doi.org/10.7551/mitpress/1090.001.0001", "the book that introduced genetic algorithms"],
    ["Goldberg & Deb (1991), A comparative analysis of selection schemes used in genetic algorithms, Foundations of Genetic Algorithms 1", "https://doi.org/10.1016/B978-0-08-050684-5.50008-2", "tournament and other selection methods compared"],
    ["Wolpert & Macready (1997), No free lunch theorems for optimization, IEEE Transactions on Evolutionary Computation 1(1)", "https://doi.org/10.1109/4235.585893", "no search method beats all others on every problem"],
    ["Beasley & Chu (1996), A genetic algorithm for the set covering problem, European Journal of Operational Research 94(2)", "https://doi.org/10.1016/0377-2217(95)00159-X", "a GA tuned for a classic location-style problem"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 8 C40 22 56 42 82 56 M14 56 C40 42 56 22 82 8"/><path d="M24 14 V50 M36 22 V42 M60 22 V42 M72 14 V50" stroke-opacity=".5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const NS = 16, NC = 60, GMAX = 150;
    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(fig("c1", "Best plan so far", 360, "Map of customers and candidate warehouse sites, with the open sites of the best plan and customer assignments"), fig("c2", "Cost by generation", 360, "Best and average cost of the population each generation, with the true optimum"))}
        <figure class="plot wide" style="margin:14px 0 0"><div style="padding:4px 6px 0">${h4("The population: one row per plan, one column per site")}</div><canvas id="c3" style="height:220px" aria-label="Population of plans as rows of open and closed sites, sorted by cost"></canvas><figcaption id="c3Cap"></figcaption></figure>`,
      panel: `
        <p class="hint" style="margin:0">60 customers (dot size = demand) and 16 possible warehouse sites. Each open site has a fixed yearly cost; each customer is served from its nearest open site at a cost per unit per km.</p>
        <div class="ctrl"><label for="fc">Fixed cost per site <output id="fcV"></output></label><input type="range" id="fc" min="20" max="400" step="10" value="150"></div>
        <div class="ctrl"><label for="pop">Population size <output id="popV"></output></label><input type="range" id="pop" min="6" max="120" step="2" value="30"></div>
        <div class="ctrl"><label for="mu">Mutation rate per gene <output id="muV"></output></label><input type="range" id="mu" min="0" max="0.2" step="0.005" value="0.03"></div>
        <div class="ctrl"><label for="ts">Tournament size (selection pressure) <output id="tsV"></output></label><input type="range" id="ts" min="1" max="8" step="1" value="3"></div>
        <div class="ctrl"><label>Crossover</label><div class="seg" id="cx"><button type="button" data-c="one" aria-pressed="true">One-point</button><button type="button" data-c="uni" aria-pressed="false">Uniform</button><button type="button" data-c="none" aria-pressed="false">None</button></div></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn primary" id="run" type="button">Run 150 generations</button><button class="btn" id="step" type="button">One generation</button><button class="btn" id="seed" type="button">New random start</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>One generation</h2>
          <ol>
            <li><b>Score</b> every plan: fixed costs of its open sites plus, for each customer, demand × distance to the nearest open site.</li>
            <li><b>Select</b> parents by tournament: pick a few plans at random and take the cheapest. Repeat for each parent.</li>
            <li><b>Cross over</b>: one-point takes the first part of one parent and the rest of the other; uniform picks each gene from either parent at random.</li>
            <li><b>Mutate</b>: flip each gene (open ↔ closed) with a small probability.</li>
            <li><b>Keep the best</b> plan unchanged into the next generation (elitism), and repeat.</li>
          </ol>
        </section>
        <section>
          <h2>Exploration versus exploitation</h2>
          <p>Every GA setting trades the two. Strong selection and low mutation exploit: quick progress, then the population becomes copies of one plan (watch the rows in the population chart become identical). Weak selection and high mutation explore: slow, noisy, but less likely to get stuck. The same trade-off appears in <a href="#simulated-annealing">simulated annealing</a>'s temperature.</p>
        </section>
        <section>
          <h2>How good is the answer?</h2>
          <p>With 16 sites there are 2¹⁶ = 65,536 possible plans, few enough to try them all, so the chart shows the true best. A real network might have 200 candidate sites: 2²⁰⁰ plans, about 10⁶⁰, far too many to try. Then a GA can't prove anything, and an <a href="#integer-programming">integer program</a> that reports its gap is the better tool if it fits. GAs shine when the cost comes from a simulation or rules that can't be written linearly.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Run with the defaults: it usually reaches the best plan, or close, in well under 1,000 evaluations, a small fraction of 65,536.</li>
            <li>Set mutation to 0 and tournament size to 8: diversity collapses within a few generations and it often stalls above the optimum.</li>
            <li>Turn crossover off: progress relies on mutation alone and slows down.</li>
            <li>Change the fixed cost: cheap sites mean many small warehouses; expensive ones mean a few big ones.</li>
          </ul>
        </section>`,
    });
    let dseed = 3, gseed = 1, cxm = "one", data, OPT, pop = [], gen = 0, hist = [], evals = 0, job = 0, timer = null;
    function makeData() {
      const r = rng(dseed), cl = [[0.25, 0.3], [0.7, 0.25], [0.5, 0.7], [0.15, 0.75], [0.85, 0.7]];
      const cust = Array.from({ length: NC }, () => { const c = cl[Math.floor(r() * cl.length)]; return { x: Math.min(0.98, Math.max(0.02, c[0] + 0.12 * r.normal())), y: Math.min(0.98, Math.max(0.02, c[1] + 0.12 * r.normal())), d: 5 + Math.floor(r() * 25) }; });
      const site = Array.from({ length: NS }, () => ({ x: 0.06 + 0.88 * r(), y: 0.06 + 0.88 * r() }));
      const D = cust.map((c) => site.map((s) => Math.hypot(c.x - s.x, c.y - s.y) * 1000));
      data = { cust, site, D };
    }
    const RATE = 0.012;
    function cost(bits) {
      const fc = +$("#fc").value; let open = 0, t = 0; for (let j = 0; j < NS; j++) if (bits[j]) open++;
      if (!open) return 1e9;
      for (let i = 0; i < NC; i++) { let m = Infinity; const Di = data.D[i]; for (let j = 0; j < NS; j++) if (bits[j] && Di[j] < m) m = Di[j]; t += data.cust[i].d * m * RATE; }
      return open * fc + t;
    }
    function exhaustive() { let best = Infinity, bm = 0; const b = new Array(NS); for (let m = 1; m < 1 << NS; m++) { for (let j = 0; j < NS; j++) b[j] = (m >> j) & 1; const c = cost(b); if (c < best) { best = c; bm = m; } } OPT = { cost: best, bits: Array.from({ length: NS }, (_, j) => (bm >> j) & 1) }; }
    let R = rng(gseed);
    function init() { R = rng(gseed); const n = +$("#pop").value; pop = Array.from({ length: n }, () => { const b = Array.from({ length: NS }, () => (R() < 0.3 ? 1 : 0)); return { b, c: cost(b) }; }); evals = n; gen = 0; pop.sort((a, b) => a.c - b.c); hist = [stat()]; }
    function stat() { const cs = pop.map((p) => p.c).filter((c) => c < 1e8); let ham = 0, k = 0; for (let i = 0; i < pop.length; i++) for (let j = i + 1; j < pop.length; j++) { k++; for (let g = 0; g < NS; g++) ham += pop[i].b[g] !== pop[j].b[g]; } return { best: pop[0].c, mean: cs.reduce((a, b) => a + b, 0) / Math.max(1, cs.length), div: k ? ham / k : 0 }; }
    function step() {
      const n = +$("#pop").value, mu = +$("#mu").value, ts = +$("#ts").value;
      const tour = () => { let b = null; for (let i = 0; i < ts; i++) { const c = pop[Math.floor(R() * pop.length)]; if (!b || c.c < b.c) b = c; } return b; };
      const next = [{ b: [...pop[0].b], c: pop[0].c }];
      while (next.length < n) {
        const a = tour().b, b = tour().b; let ch;
        if (cxm === "one") { const k = 1 + Math.floor(R() * (NS - 1)); ch = a.slice(0, k).concat(b.slice(k)); } else if (cxm === "uni") ch = a.map((g, i) => (R() < 0.5 ? g : b[i])); else ch = [...a];
        for (let i = 0; i < NS; i++) if (R() < mu) ch[i] = 1 - ch[i];
        next.push({ b: ch, c: cost(ch) }); evals++;
      }
      pop = next.sort((a, b) => a.c - b.c); gen++; hist.push(stat());
    }
    const C1 = new Plot($("#c1"), { x: [0, 1], y: [0, 1], pad: { l: 10, r: 10, t: 10, b: 10 } }), C2 = new Plot($("#c2"), { pad: { l: 56, b: 38 } }), C3 = new Plot($("#c3"), { x: [0, 1], y: [0, 1], pad: { l: 40, r: 10, t: 10, b: 26 } });
    function d1() {
      const b = pop[0].b, g = C1.ctx; C1.resize(); C1.clear();
      g.strokeStyle = css("--line"); g.strokeRect(C1.pad.l + 0.5, C1.pad.t + 0.5, C1.iw, C1.ih);
      data.cust.forEach((c, i) => { let m = Infinity, j0 = -1; for (let j = 0; j < NS; j++) if (b[j] && data.D[i][j] < m) { m = data.D[i][j]; j0 = j; } if (j0 >= 0) C1.path([c.x, data.site[j0].x], [c.y, data.site[j0].y], css("--accent"), 1, null, 0.35); });
      data.cust.forEach((c) => C1.dot(c.x, c.y, 1.5 + Math.sqrt(c.d) * 0.7, css("--muted"), null));
      data.site.forEach((s, j) => { const x = C1.sx(s.x), y = C1.sy(s.y), o = b[j], opt = OPT.bits[j]; g.fillStyle = css(o ? "--accent" : "--surface"); g.strokeStyle = css(o ? "--accent" : "--muted"); g.lineWidth = 1.5; g.fillRect(x - 6, y - 6, 12, 12); g.strokeRect(x - 6, y - 6, 12, 12); if (opt) { g.strokeStyle = css("--good"); g.lineWidth = 2; g.strokeRect(x - 9, y - 9, 18, 18); } g.fillStyle = css("--ink"); g.font = `10px ${css("--font-mono")}`; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(String.fromCharCode(65 + j), x + 10, y); });
      const open = b.reduce((a, x) => a + x, 0), same = b.every((x, j) => x === OPT.bits[j]);
      $("#c1Cap").innerHTML = `Filled squares: sites open in the best plan of generation ${gen} (${open} open: ${b.map((x, j) => (x ? String.fromCharCode(65 + j) : "")).join("")}). Green frames: the true best plan (${OPT.bits.map((x, j) => (x ? String.fromCharCode(65 + j) : "")).join("")}). ${same ? "<b>They match.</b>" : ""} Lines: each customer to its nearest open site.`;
    }
    function d2() {
      const xs = hist.map((_, i) => i), lo = OPT.cost * 0.97, hi = Math.max(...hist.map((h) => Math.min(h.mean, OPT.cost * 3)));
      C2.resize(); C2.x = [0, Math.max(20, gen)]; C2.y = [lo, hi * 1.03]; C2.clear(); C2.axes({ xLabel: "generation", yLabel: "cost per year", xFormat: (v) => fmt(v, 0), yFormat: (v) => "$" + fmt(v, 0) + "k" });
      C2.path([0, C2.x[1]], [OPT.cost, OPT.cost], css("--good"), 1.5, [5, 4]);
      C2.path(xs, hist.map((h) => Math.min(h.mean, C2.y[1])), css("--muted"), 1.5);
      C2.path(xs, hist.map((h) => h.best), css("--accent"), 2.5);
      const hit = hist.findIndex((h) => h.best <= OPT.cost + 1e-6);
      $("#c2Cap").innerHTML = `Blue: best plan in the population. Grey: population average. Green dashed: the true best, $${fmt(OPT.cost, 1)}k, found by trying all 65,536 plans. ${hit >= 0 ? `Reached in generation ${hit}, after about ${(+$("#pop").value * hit + +$("#pop").value).toLocaleString()} evaluations.` : `Not reached yet: ${fmt((pop[0].c / OPT.cost - 1) * 100, 1)}% above.`}`;
    }
    function d3() {
      const g = C3.ctx, n = pop.length; C3.resize(); C3.clear();
      const cw = C3.iw / NS, rh = C3.ih / n;
      pop.forEach((p, i) => p.b.forEach((v, j) => { g.fillStyle = css(v ? "--accent" : "--grid"); g.globalAlpha = v ? 0.85 : 0.6; g.fillRect(Math.round(C3.pad.l + j * cw) + 0.5, Math.round(C3.pad.t + i * rh), Math.max(1, Math.round(cw) - 1), Math.max(1, Math.round(rh) - (rh > 4 ? 1 : 0))); }));
      g.globalAlpha = 1; g.fillStyle = css("--muted"); g.font = `10px ${css("--font-mono")}`; g.textAlign = "center"; g.textBaseline = "top";
      for (let j = 0; j < NS; j++) g.fillText(String.fromCharCode(65 + j), C3.pad.l + (j + 0.5) * cw, C3.h - C3.pad.b + 6);
      g.textAlign = "right"; g.textBaseline = "middle"; g.fillText("best", C3.pad.l - 4, C3.pad.t + rh / 2); g.fillText("worst", C3.pad.l - 4, C3.pad.t + C3.ih - rh / 2);
      const h = hist[hist.length - 1];
      $("#c3Cap").innerHTML = `Rows sorted by cost, best at the top; blue = site open. Diversity: plans differ in ${fmt(h.div, 1)} of 16 genes on average${h.div < 1 ? " (the population has converged: mostly copies of one plan)" : ""}.`;
    }
    function readouts() {
      const gap = (pop[0].c / OPT.cost - 1) * 100;
      $("#ro").innerHTML = [["Generation", `<span class="num">${gen}</span>`], ["Best cost found", `<span class="num">$${fmt(pop[0].c, 1)}k</span>`], ["True best (all 65,536 tried)", `<span class="num">$${fmt(OPT.cost, 1)}k</span>`], ["Gap", `<span class="pill ${gap < 0.01 ? "ok" : gap < 2 ? "warn" : "bad"}">${gap < 0.01 ? "0% (optimal)" : fmt(gap, 1) + "%"}</span>`], ["Plans evaluated", `<span class="num">${evals.toLocaleString()}</span>`]].map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { $("#fcV").textContent = "$" + $("#fc").value + "k"; $("#popV").textContent = $("#pop").value; $("#muV").textContent = fmt(+$("#mu").value * 100, 1) + "%"; $("#tsV").textContent = $("#ts").value; }
    function draw() { labels(); d1(); d2(); d3(); readouts(); }
    function stop() { job++; if (timer) clearTimeout(timer); timer = null; $("#run").textContent = "Run 150 generations"; }
    function runAll() { stop(); const my = job; $("#run").textContent = "Running…"; const tick = () => { if (my !== job) return; for (let k = 0; k < 2 && gen < GMAX; k++) step(); draw(); if (gen < GMAX) timer = setTimeout(tick, 40); else stop(); }; tick(); }
    function restart(full) { stop(); if (full) { makeData(); exhaustive(); } init(); draw(); }
    $("#run").addEventListener("click", () => { if (timer) { stop(); return; } if (gen >= GMAX) init(); runAll(); });
    $("#step").addEventListener("click", () => { stop(); step(); draw(); });
    $("#seed").addEventListener("click", () => { gseed++; restart(false); });
    $("#fc").addEventListener("input", () => { labels(); restart(true); });
    ["pop", "mu", "ts"].forEach((id) => $("#" + id).addEventListener("input", () => restart(false)));
    root.querySelectorAll("#cx button").forEach((b) => b.addEventListener("click", () => { cxm = b.dataset.c; root.querySelectorAll("#cx button").forEach((x) => x.setAttribute("aria-pressed", x === b)); restart(false); }));
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); cxm = "one"; gseed = 1; root.querySelectorAll("#cx button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.c === "one")); restart(true); });
    makeData(); exhaustive(); init(); draw();
    const unw = watch([$("#c1"), $("#c2"), $("#c3")], draw);
    return () => { stop(); unw(); };
  },
});
