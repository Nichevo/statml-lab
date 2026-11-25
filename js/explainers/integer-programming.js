Lab.register({
  id: "integer-programming",
  group: "Optimization",
  title: "Integer programming and branch and bound",
  blurb: "How many 40-foot and 20-foot containers should you book? You can't book 3.4 containers. See why rounding the linear-programming answer can cost money or break a limit, and watch branch and bound find the true best whole-number plan, step by step.",
  lede: "Many supply chain decisions come in whole units or yes/no: containers, trucks, shifts, which warehouses to open. Linear programming lets the answer be fractional; integer programming insists on whole numbers. That small change makes the problem much harder, and simply rounding the fractional answer is often wrong. Branch and bound solves it by splitting the problem into pieces and using the fractional answers as bounds to skip the pieces that can't win.",
  quiz: [
    ["Why not just round the LP answer up?", "Rounding up keeps you feasible here but can cost more than the true best whole-number plan, which may use a quite different mix. Rounding to the nearest can break a constraint altogether."],
    ["What is the LP relaxation and why is it useful?", "The same problem with the whole-number rule dropped. Its cost is a lower bound for any whole-number plan (when minimising), because it has more freedom. If a branch's relaxation already costs more than a plan you have, that whole branch can be skipped."],
    ["How does branch and bound split the problem?", "Pick a variable with a fractional value, say x = 3.4. Make two subproblems: one with x ≤ 3 and one with x ≥ 4. Every whole-number plan is in one of them, and the fractional point is in neither."],
    ["How do yes/no decisions fit in?", "As 0/1 variables. Open a warehouse: y = 1 adds its fixed cost, and a constraint like flow ≤ capacity × y means no flow unless it's open. Facility location, truck selection and project choice all work this way."],
    ["Why can integer programs take so long?", "The number of whole-number combinations grows exponentially with the number of variables. Solvers combine branch and bound with cutting planes and heuristics, and they report a gap between the best plan found and the best bound, so you can stop when it's small enough."],
  ],
  diy: {
    intro: "Excel Solver handles integer programs. Number of 40ft containers in B1, 20ft in B2.",
    steps: [
      ["Cost (objective).", "B4: =2600*B1 + 1700*B2"],
      ["Volume and weight shipped.", "B5: =67*B1 + 33*B2   B6: =26.5*B1 + 21.7*B2"],
      ["Solver: minimise B4 by changing B1:B2, with B5 ≥ volume, B6 ≥ weight, B1:B2 ≥ 0.", "Data > Solver, method Simplex LP"],
      ["Add the whole-number rule.", "Add constraint: B1:B2 int  (for yes/no decisions use bin)"],
      ["Compare with the relaxation: solve again without the int constraint.", "LP cost ≤ integer cost, always (when minimising)"],
      ["Check a rounded plan by hand.", "=IF(AND(67*ROUNDUP(x,0)+33*ROUNDUP(y,0)>=volume, …), 2600*ROUNDUP(x,0)+1700*ROUNDUP(y,0), \"infeasible\")"],
    ],
  },
  deeper: [
    ["Land & Doig (1960), An automatic method of solving discrete programming problems, Econometrica 28(3)", "https://doi.org/10.2307/1910129", "branch and bound"],
    ["Gomory (1958), Outline of an algorithm for integer solutions to linear programs, Bulletin of the AMS 64(5)", "https://doi.org/10.1090/S0002-9904-1958-10224-4", "cutting planes"],
    ["Dantzig, Fulkerson & Johnson (1954), Solution of a large-scale traveling-salesman problem, Operations Research 2(4)", "https://doi.org/10.1287/opre.2.4.393", "the first big integer program solved, with cuts"],
    ["Wolsey (2020), Integer programming, 2nd edition, Wiley", "https://doi.org/10.1002/9781119606475", "the standard textbook"],
    ["Google OR-Tools: mixed-integer programming", "https://developers.google.com/optimization/mip", "free solvers with worked examples"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="48" cy="10" r="5"/><circle cx="28" cy="32" r="5"/><circle cx="68" cy="32" r="5"/><circle cx="16" cy="54" r="5"/><circle cx="40" cy="54" r="5" fill="currentColor"/><path d="M44 14 L32 28 M52 14 L64 28 M25 36 L19 50 M31 36 L37 50"/><path d="M64 36 L72 50 M80 50 L72 50" stroke-opacity=".4" stroke-dasharray="3 3"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const VOL = [67, 33], WT = [26.5, 21.7];
    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(fig("c1", "Every plan, and the best whole-number one", 400, "Plans by number of 40ft and 20ft containers, with the volume and weight limits, the fractional optimum and the integer optimum"), fig("c2", "Branch and bound, step by step", 400, "The branch and bound search tree with the bound at each node"))}
        <div class="plot wide" style="padding:14px;margin-top:14px;overflow-x:auto">${h4("The nodes, worked out")}<div id="tbl"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Ship a consignment to a customer. A 40ft container holds 67 m³ or 26.5 t; a 20ft holds 33 m³ or 21.7 t. Book enough containers for both the volume and the weight, at the lowest cost. Click any dot to check that plan.</p>
        <div class="ctrl"><label for="V">Volume to ship <output id="VV"></output></label><input type="range" id="V" min="200" max="2000" step="10" value="1000"></div>
        <div class="ctrl"><label for="W">Weight to ship <output id="WV"></output></label><input type="range" id="W" min="100" max="800" step="5" value="420"></div>
        <div class="ctrl"><label for="cx">Price of a 40ft container <output id="cxV"></output></label><input type="range" id="cx" min="1500" max="4000" step="50" value="2600"></div>
        <div class="ctrl"><label for="cy">Price of a 20ft container <output id="cyV"></output></label><input type="range" id="cy" min="800" max="3000" step="50" value="1700"></div>
        <div class="ctrl"><label for="st">Branch-and-bound steps shown <output id="stV"></output></label><input type="range" id="st" min="1" max="40" step="1" value="40"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The model</h2>
          <div class="eq">minimise 2600 x + 1700 y<br>subject to 67 x + 33 y ≥ volume, 26.5 x + 21.7 y ≥ weight, x, y ≥ 0 and whole numbers</div>
          <p>Without “whole numbers” it's a <a href="#linear-programming">linear program</a>, and the best answer sits on a corner of the shaded region, usually at fractional values. Per cubic metre the 40ft box is cheaper; per tonne the 20ft is. Heavy loads tip the mix towards 20ft boxes.</p>
        </section>
        <section>
          <h2>Branch and bound</h2>
          <ol>
            <li>Solve the relaxation (the LP). Its cost is a lower bound: no whole-number plan can beat it.</li>
            <li>If the answer is already whole, it's the best plan in this branch. Keep it if it beats the best so far (the <i>incumbent</i>).</li>
            <li>Otherwise pick a fractional variable, x = 3.4 say, and split: one branch adds x ≤ 3, the other x ≥ 4.</li>
            <li>Skip (prune) any branch whose bound is no better than the incumbent, or whose LP has no feasible plan.</li>
            <li>Repeat until no branches are left. The incumbent is then provably optimal.</li>
          </ol>
          <p>The tree shows each node's LP answer and bound. Grey nodes were pruned; green is the best plan. Slide “steps shown” to watch it unfold.</p>
        </section>
        <section>
          <h2>Yes/no decisions</h2>
          <p>The most common integer variables are 0/1: open this warehouse or not, use this carrier, run this shift. A fixed cost becomes cost × y, and a constraint like “flow ≤ capacity × y” forbids using what you didn't open. That's how <a href="#network-design">network design</a> and facility location models work, and why they need integer solvers. For problems too big even for these, heuristics such as <a href="#simulated-annealing">simulated annealing</a> or <a href="#genetic-algorithm">genetic algorithms</a> find good plans without a proof of optimality.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Compare the rounded-up LP plan with the true best: often the best plan has a different mix, not just rounded numbers.</li>
            <li>Raise the weight to 700 t: weight becomes the binding limit and 20ft containers take over.</li>
            <li>Set the 20ft price to $1,300: watch the tree grow or shrink as the bounds change.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ V: +$("#V").value, W: +$("#W").value, cx: +$("#cx").value, cy: +$("#cy").value, st: +$("#st").value });
    // LP in two variables by enumerating corners. cons: [a, b, rhs, sense] meaning a x + b y (>= | <=) rhs.
    function lp(p, bounds) {
      const cons = [[VOL[0], VOL[1], p.V, 1], [WT[0], WT[1], p.W, 1], [1, 0, bounds.xl, 1], [0, 1, bounds.yl, 1], [1, 0, bounds.xu, -1], [0, 1, bounds.yu, -1]];
      const ok = (x, y) => cons.every(([a, b, r, s]) => (s > 0 ? a * x + b * y >= r - 1e-7 : a * x + b * y <= r + 1e-7));
      let best = null;
      for (let i = 0; i < cons.length; i++) for (let j = i + 1; j < cons.length; j++) {
        const [a1, b1, r1] = cons[i], [a2, b2, r2] = cons[j], d = a1 * b2 - a2 * b1; if (Math.abs(d) < 1e-12) continue;
        const x = (r1 * b2 - r2 * b1) / d, y = (a1 * r2 - a2 * r1) / d; if (!ok(x, y)) continue;
        const z = p.cx * x + p.cy * y; if (!best || z < best.z - 1e-9) best = { x, y, z };
      }
      return best;
    }
    const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-6;
    function bb(p) {
      const MAX = 60, nodes = [], stack = [{ b: { xl: 0, xu: 60, yl: 0, yu: 60 }, parent: -1, label: "start", depth: 0 }]; let inc = null;
      while (stack.length && nodes.length < MAX) {
        const nd = stack.pop(), s = lp(p, nd.b), id = nodes.length, node = { id, ...nd, s, status: "" };
        nodes.push(node);
        if (!s) { node.status = "infeasible"; continue; }
        if (inc && s.z >= inc.z - 1e-6) { node.status = "pruned"; continue; }
        if (isInt(s.x) && isInt(s.y)) { node.status = "integer"; inc = { x: Math.round(s.x), y: Math.round(s.y), z: s.z, id }; continue; }
        node.status = "branched";
        const fx = s.x - Math.floor(s.x), fy = s.y - Math.floor(s.y), byX = !isInt(s.x) && (isInt(s.y) || Math.abs(fx - 0.5) <= Math.abs(fy - 0.5)), v = byX ? s.x : s.y, k = Math.floor(v + 1e-9), n = byX ? "x" : "y";
        // push "up" branch last so it's explored first (rounding up tends to find feasible plans quickly)
        stack.push({ b: { ...nd.b, [n + "u"]: k }, parent: id, label: `${n} ≤ ${k}`, depth: nd.depth + 1 });
        stack.push({ b: { ...nd.b, [n + "l"]: k + 1 }, parent: id, label: `${n} ≥ ${k + 1}`, depth: nd.depth + 1 });
      }
      return { nodes, inc };
    }
    const $k = (v) => "$" + Math.round(v).toLocaleString();
    const C1 = new Plot($("#c1"), { pad: { l: 46, b: 40 } }), C2 = new Plot($("#c2"), { x: [0, 1], y: [0, 1], pad: { l: 8, r: 8, t: 10, b: 10 } });
    let pick = null;
    function feas(p, x, y) { return VOL[0] * x + VOL[1] * y >= p.V - 1e-9 && WT[0] * x + WT[1] * y >= p.W - 1e-9; }
    function d1(p, rel, B) {
      const xm = Math.max(4, Math.ceil(Math.max(p.V / VOL[0], p.W / WT[0]) * 1.25)), ym = Math.max(4, Math.ceil(Math.max(p.V / VOL[1], p.W / WT[1]) * 1.1));
      C1.resize(); C1.x = [0, xm]; C1.y = [0, ym]; C1.clear(); C1.axes({ xLabel: "40ft containers (x)", yLabel: "20ft containers (y)", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const g = C1.ctx, hx = (a, b, r) => [[0, r / b], [r / a, 0]];
      C1.clip(() => { g.beginPath(); const pts = []; for (let i = 0; i <= 200; i++) { const x = (xm * i) / 200, y = Math.max(0, (p.V - VOL[0] * x) / VOL[1], (p.W - WT[0] * x) / WT[1]); pts.push([x, y]); } g.moveTo(C1.sx(0), C1.sy(ym)); pts.forEach(([x, y]) => g.lineTo(C1.sx(x), C1.sy(y))); g.lineTo(C1.sx(xm), C1.sy(ym)); g.closePath(); g.fillStyle = css("--accent"); g.globalAlpha = 0.1; g.fill(); g.globalAlpha = 1; });
      [[VOL, p.V, "--accent", "volume"], [WT, p.W, "--warm", "weight"]].forEach(([c, r, col, n]) => { const [[x0, y0], [x1, y1]] = hx(c[0], c[1], r); C1.path([x0, x1], [y0, y1], css(col), 2); g.fillStyle = css(col); g.font = `600 11px ${css("--font-body")}`; g.textAlign = "left"; g.textBaseline = "bottom"; const lx = Math.min(x1, xm) * 0.08, ly = (r - c[0] * lx) / c[1]; g.fillText(n, C1.sx(lx) + 4, C1.sy(ly) - 3); });
      for (let x = 0; x <= xm; x++) for (let y = 0; y <= ym; y++) { const f = feas(p, x, y); C1.dot(x, y, f ? 2 : 1.1, css(f ? "--ink" : "--muted"), null); }
      if (B.inc) { const z = B.inc.z; C1.path([0, z / p.cx], [z / p.cy, 0], css("--good"), 1.5, [5, 4]); }
      const ru = [Math.ceil(rel.x - 1e-9), Math.ceil(rel.y - 1e-9)], rn = [Math.round(rel.x), Math.round(rel.y)];
      C1.dot(ru[0], ru[1], 8, null, css("--violet"));
      if (B.inc) C1.dot(B.inc.x, B.inc.y, 7, css("--good"), css("--surface"));
      const sx = C1.sx(rel.x), sy = C1.sy(rel.y); g.beginPath(); for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + (j * Math.PI) / 5, r = j % 2 ? 4 : 9; g.lineTo(sx + r * Math.cos(a), sy + r * Math.sin(a)); } g.closePath(); g.fillStyle = css("--bad"); g.fill();
      if (pick) C1.dot(pick[0], pick[1], 9, null, css("--ink"));
      const pc = pick ? `Your pick: ${pick[0]} × 40ft + ${pick[1]} × 20ft = ${fmt(VOL[0] * pick[0] + VOL[1] * pick[1], 0)} m³, ${fmt(WT[0] * pick[0] + WT[1] * pick[1], 1)} t, ${$k(p.cx * pick[0] + p.cy * pick[1])}${feas(p, ...pick) ? "" : " <b style=\"color:var(--bad)\">(not enough room)</b>"}. ` : "";
      $("#c1Cap").innerHTML = `${pc}Shaded: enough room for both volume and weight. Black dots: whole-number plans that fit. Red star: the LP answer (${fmt(rel.x, 2)}, ${fmt(rel.y, 2)}), ${$k(rel.z)}, which you can't book. Purple ring: rounded up (${ru[0]}, ${ru[1]}), ${$k(p.cx * ru[0] + p.cy * ru[1])}. Green: the best whole-number plan${B.inc ? ` (${B.inc.x}, ${B.inc.y}), ${$k(B.inc.z)}; the dashed line is every plan with that cost` : ""}. Rounding to the nearest gives (${rn[0]}, ${rn[1]}), which ${feas(p, ...rn) ? `fits and costs ${$k(p.cx * rn[0] + p.cy * rn[1])}` : "doesn't fit"}.`;
      return { ru, rn };
    }
    function d2(p, B) {
      const N = B.nodes.slice(0, p.st), g = C2.ctx; C2.resize(); C2.clear();
      if (!N.length) return;
      const depth = Math.max(...N.map((n) => n.depth)), kids = {}; N.forEach((n) => { if (n.parent >= 0) (kids[n.parent] = kids[n.parent] || []).push(n.id); });
      const pos = {}; let leaf = 0;
      const place = (id) => { const ch = (kids[id] || []).filter((c) => c < N.length); if (!ch.length) pos[id] = leaf++; else { ch.forEach(place); pos[id] = (pos[ch[0]] + pos[ch[ch.length - 1]]) / 2; } };
      place(0);
      const nl = Math.max(1, leaf - 1), X = (id) => C2.pad.l + 26 + (pos[id] / nl) * (C2.w - C2.pad.l - C2.pad.r - 52), Y = (d) => C2.pad.t + 16 + (d / Math.max(1, depth)) * (C2.h - C2.pad.t - C2.pad.b - 40), small = N.length > 14;
      N.forEach((n) => { if (n.parent >= 0) { g.strokeStyle = css("--line"); g.lineWidth = 1.2; g.beginPath(); g.moveTo(X(n.parent), Y(n.depth - 1)); g.lineTo(X(n.id), Y(n.depth)); g.stroke(); if (!small) { g.fillStyle = css("--muted"); g.font = `10px ${css("--font-mono")}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(n.label, (X(n.parent) + X(n.id)) / 2, (Y(n.depth - 1) + Y(n.depth)) / 2); } } });
      N.forEach((n) => { const col = n.status === "integer" ? (B.inc && B.inc.id === n.id ? "--good" : "--warm") : n.status === "branched" ? "--accent" : "--muted", r = small ? 6 : 9; g.beginPath(); g.arc(X(n.id), Y(n.depth), r, 0, Math.PI * 2); g.fillStyle = css(col); g.globalAlpha = n.status === "pruned" || n.status === "infeasible" ? 0.45 : 1; g.fill(); g.globalAlpha = 1; g.fillStyle = css("--surface"); g.font = `600 ${small ? 8 : 10}px ${css("--font-mono")}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(n.id + 1, X(n.id), Y(n.depth) + 0.5);
        if (!small) { g.fillStyle = css("--ink"); g.font = `10px ${css("--font-mono")}`; g.textBaseline = "top"; g.fillText(n.s ? $k(n.s.z) : "none", X(n.id), Y(n.depth) + 12); } });
      const done = p.st >= B.nodes.length;
      $("#c2Cap").innerHTML = `Blue: branched (fractional answer). Orange: a whole-number plan found. Green: the best one. Grey: pruned (bound no better than the best so far) or infeasible. ${done ? `Finished after ${B.nodes.length} nodes: the green plan is proven best.` : `Showing ${p.st} of ${B.nodes.length} nodes.`} ${small ? "Numbers match the table below." : "Under each node: its LP cost, a lower bound for everything below it."}`;
    }
    function tbl(p, B) {
      const N = B.nodes.slice(0, p.st), word = { branched: "split", integer: "whole numbers", pruned: "pruned by bound", infeasible: "no plan fits" };
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.78rem var(--font-mono);white-space:nowrap"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 8px;text-align:left">node</th><th style="padding:3px 8px;text-align:left">added rule</th><th style="padding:3px 8px">LP answer (x, y)</th><th style="padding:3px 8px">LP cost = bound</th><th style="padding:3px 8px;text-align:left">outcome</th></tr></thead><tbody>` +
        N.map((n) => `<tr style="text-align:right;border-top:1px solid var(--line);${B.inc && B.inc.id === n.id && p.st >= B.nodes.length ? "background:color-mix(in srgb, var(--good) 15%, var(--surface))" : ""}"><td style="padding:3px 8px;text-align:left">${n.id + 1}</td><td style="padding:3px 8px;text-align:left">${n.label}</td><td style="padding:3px 8px">${n.s ? `(${fmt(n.s.x, 2)}, ${fmt(n.s.y, 2)})` : "–"}</td><td style="padding:3px 8px">${n.s ? $k(n.s.z) : "–"}</td><td style="padding:3px 8px;text-align:left">${word[n.status]}</td></tr>`).join("") + `</tbody></table>`;
    }
    function readouts(p, rel, B, r) {
      const ruc = p.cx * r.ru[0] + p.cy * r.ru[1], gap = B.inc ? (B.inc.z - rel.z) / B.inc.z : 0;
      $("#ro").innerHTML = [
        ["LP answer (lower bound)", `<span class="num">${$k(rel.z)}</span>`],
        ["Rounded-up LP plan", `<span class="num">${$k(ruc)}</span>`],
        ["Best whole-number plan", `<span class="num">${B.inc ? `${B.inc.x} × 40ft + ${B.inc.y} × 20ft = ${$k(B.inc.z)}` : "–"}</span>`],
        ["Saving vs rounding up", `<span class="pill ${ruc - (B.inc ? B.inc.z : ruc) > 0 ? "ok" : "warn"}">${$k(ruc - (B.inc ? B.inc.z : ruc))}</span>`],
        ["Integrality gap", `<span class="num">${fmt(gap * 100, 1)}%</span>`],
        ["Nodes explored", `<span class="num">${B.nodes.length}</span>`],
      ].map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels(p) { $("#VV").textContent = p.V + " m³"; $("#WV").textContent = p.W + " t"; $("#cxV").textContent = $k(p.cx); $("#cyV").textContent = $k(p.cy); $("#stV").textContent = p.st; }
    function draw() { const p = P(); labels(p); const rel = lp(p, { xl: 0, xu: 60, yl: 0, yu: 60 }), B = bb(p); $("#st").max = Math.max(1, B.nodes.length); if (+$("#st").value > B.nodes.length) $("#st").value = B.nodes.length; p.st = +$("#st").value; labels(p); const r = d1(p, rel, B); d2(p, B); tbl(p, B); readouts(p, rel, B, r); }
    $("#c1").addEventListener("click", (e) => { const b = $("#c1").getBoundingClientRect(), x = Math.round(C1.ix(e.clientX - b.left)), y = Math.round(C1.iy(e.clientY - b.top)); if (x >= 0 && y >= 0 && x <= C1.x[1] && y <= C1.y[1]) { pick = [x, y]; draw(); } });
    $("#c1").style.cursor = "crosshair";
    ["V", "W", "cx", "cy"].forEach((id) => $("#" + id).addEventListener("input", () => { $("#st").value = 40; draw(); }));
    $("#st").addEventListener("input", draw);
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); pick = null; draw(); });
    draw();
    return watch([$("#c1"), $("#c2")], draw);
  },
});
