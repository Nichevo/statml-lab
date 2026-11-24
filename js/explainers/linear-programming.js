Lab.register({
  id: "linear-programming",
  group: "Optimization",
  title: "Linear programming: the best plan within limits",
  blurb: "Pick how much of two products to make with limited machine time, labour and material. See the feasible region, why the best answer sits on a corner, and what an extra hour is worth.",
  lede: "Many planning questions have the same shape: choose quantities to maximise profit (or minimise cost) without breaking any limits. When the profit and every limit are straight-line (linear) in the quantities, it's a linear program. With two products you can draw it: each limit cuts off part of the plane, what's left is the feasible region, and the best plan is always at one of its corners. The simplex method walks from corner to corner, uphill, until no neighbour is better. Solvers do the same with thousands of variables.",
  quiz: [
    ["Why is the optimum of a linear program always at a corner (or along an edge)?", "Profit rises steadily in one direction. Inside the region you can always move further in that direction, so you stop only when you hit a boundary, and then slide along it to a corner."],
    ["Machine hours have a shadow price of $12. What does that mean?", "One more machine hour would raise the best profit by $12 (as long as the same constraints stay binding). Paying less than $12 for overtime on that machine is worth it; more is not."],
    ["A constraint has a shadow price of zero. Why?", "It isn't binding: the best plan doesn't use all of that resource, so a bit more of it wouldn't change anything. It has slack."],
    ["The LP says make 23.3 of product A. What if you can only make whole units?", "That's an integer program. Rounding can break a limit or miss the best plan. Solvers use branch and bound: split on A ≤ 23 and A ≥ 24, solve each LP, and prune branches that can't beat the best whole-number plan found so far."],
  ],
  diy: {
    intro: "Two products A and B. Profit per unit in B1:C1; per-unit use of each resource in B3:C5; resource limits in E3:E5. Decision cells B7:C7.",
    steps: [
      ["Total profit.", "E7: =SUMPRODUCT(B1:C1,B7:C7)"],
      ["Resource used for each constraint.", "D3: =SUMPRODUCT(B3:C3,$B$7:$C$7)   (fill down)"],
      ["Solver: Data > Solver. Set objective E7 to Max, by changing B7:C7, subject to D3:D5 <= E3:E5, choose Simplex LP, tick 'make unconstrained variables non-negative'.", ""],
      ["Integer version: add constraint B7:C7 = int.", ""],
      ["Shadow prices: choose 'Sensitivity' report after solving. The shadow price is the profit gained per extra unit of each resource.", ""],
      ["Check a corner by hand: solve two binding constraints together.", "=MMULT(MINVERSE(B3:C4),E3:E4)"],
    ],
  },
  deeper: [
    ["Linear programming — Wikipedia", "https://en.wikipedia.org/wiki/Linear_programming", "formulation, duality and history"],
    ["Simplex algorithm — Wikipedia", "https://en.wikipedia.org/wiki/Simplex_algorithm", "how the corner-walk works"],
    ["Branch and bound — Wikipedia", "https://en.wikipedia.org/wiki/Branch_and_bound", "how integer programs are solved"],
    ["Google OR-Tools: linear optimization", "https://developers.google.com/optimization/lp", "free solver with examples in Python"],
    ["Excel Solver — Microsoft support", "https://support.microsoft.com/en-us/office/define-and-solve-a-problem-by-using-solver-5d1a388f-079d-43ac-a7eb-f63e45925040", "solve LPs in a spreadsheet"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 56 L10 18 L40 12 L70 30 L80 56 Z" fill="currentColor" fill-opacity=".18"/><path d="M10 56 h80 M10 56 v-50" opacity=".5"/><circle cx="70" cy="30" r="4" fill="currentColor"/><path d="M52 6 L90 44" stroke-dasharray="4 3"/></svg>`,

  mount(root) {
    const { Plot, watch, css } = Lab;
    const COLORS = ["--accent", "--warm", "--violet", "--bad", "--good"];
    let C = [
      ["Machine hours", 2, 1, 100],
      ["Labour hours", 1, 3, 115],
      ["Material (kg)", 1, 1, 58],
      ["Max demand for B", 0, 1, 35],
    ];
    let integer = false;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="lp" aria-label="Feasible region for two products, with constraint lines, corners, the simplex path and the best profit line"></canvas>
          <div class="legend" id="leg"></div>
          <figcaption>Shaded: every plan that breaks no limit. Dots: corners. Arrows: the path simplex takes from (0, 0). Dashed: the line of equal profit through the best plan.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 class="lp-h">Constraints (edit)</h4>
          <div style="overflow-x:auto"><table id="ct" class="lp-t"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="lp-h">Corners checked</h4>
          <div style="overflow-x:auto"><table id="corners" class="lp-t"></table></div>
        </div>
        <style>.lp-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .lp-t{width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums}
        .lp-t th{text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500;white-space:nowrap}
        .lp-t td{text-align:right;padding:4px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono);white-space:nowrap}
        .lp-t th:first-child,.lp-t td:first-child{text-align:left;font-family:var(--font-body)}
        .lp-t input{width:64px;font:inherit;padding:3px 5px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink);text-align:right}</style>`,
      panel: `
        <div class="ctrl"><label for="pa">Profit per unit of A <output id="paV"></output></label><input type="range" id="pa" min="0" max="100" step="1" value="30"></div>
        <div class="ctrl"><label for="pb">Profit per unit of B <output id="pbV"></output></label><input type="range" id="pb" min="0" max="100" step="1" value="40"></div>
        <label style="display:flex;gap:8px;align-items:center;font-size:.9rem"><input type="checkbox" id="int"> Whole units only (integer program)</label>
        <div class="readouts" id="ro"></div>`,
      notes: `
        <section>
          <h2>Writing it down</h2>
          <div class="eq" id="model"></div>
          <p>Three parts: <b>decision variables</b> (A and B), an <b>objective</b> to maximise or minimise, and <b>constraints</b>. Everything must be linear: no A × B, no A², no "if" statements.</p>
        </section>
        <section>
          <h2>Corners and simplex</h2>
          <p>Every corner is where two boundary lines cross. Simplex starts at a corner (here, making nothing), looks at the neighbouring corners along the edges, moves to one that improves profit, and stops when none does. Because the region is convex, a corner with no better neighbour is the global best: no local-optimum trap, unlike <a href="#tsp">2-opt</a> or <a href="#gradient-descent">gradient descent</a> on a bumpy surface.</p>
        </section>
        <section>
          <h2>Shadow prices</h2>
          <p>Add one unit to a constraint's limit, solve again, and see how much the best profit rises. That's the constraint's <b>shadow price</b> (or dual value). It tells you what an extra machine hour or kilo of material is worth, and which limits are bottlenecks.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Raise the profit of A slowly. The dashed line tilts, and at some point the best corner jumps. Between jumps, the plan doesn't change at all.</li>
            <li>Lower machine hours from 100 to 80. Machine time becomes a bottleneck: it gets a shadow price and the best plan moves.</li>
            <li>Tick "Whole units only". The best whole-number plan may not be next to the LP corner.</li>
            <li>Make the material limit very large. It stops touching the region: a redundant constraint.</li>
          </ol>
          <p>Supply chain uses: production mix, blending, transport (cheapest shipments from plants to DCs), <a href="#network-design">network design</a>, and <a href="#level-vs-chase">aggregate planning</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pl = new Plot($("#lp"), { x: [0, 80], y: [0, 70], pad: { l: 50, b: 36 } });

    function buildCT() {
      $("#ct").innerHTML = `<tr><th>Constraint</th><th>per unit A</th><th>per unit B</th><th>limit</th><th>used at best</th><th>slack</th><th>shadow price</th></tr>` + C.map((c, i) =>
        `<tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(${COLORS[i]});margin-right:6px"></i>${c[0]}</td>${[1, 2, 3].map((j) => `<td><input type="number" step="1" min="0" value="${c[j]}" data-i="${i}" data-j="${j}" aria-label="${c[0]} ${["", "A", "B", "limit"][j]}"></td>`).join("")}<td id="use${i}"></td><td id="sl${i}"></td><td id="sp${i}"></td></tr>`).join("");
    }

    // lines: a x + b y = r ; include axes x = 0 (1,0,0) and y = 0 (0,1,0)
    function corners(cons) {
      const L = cons.map((c) => [c[1], c[2], c[3]]).concat([[1, 0, 0], [0, 1, 0]]), pts = [];
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
        const [a1, b1, r1] = L[i], [a2, b2, r2] = L[j], det = a1 * b2 - a2 * b1;
        if (Math.abs(det) < 1e-12) continue;
        const x = (r1 * b2 - r2 * b1) / det, y = (a1 * r2 - a2 * r1) / det;
        if (x < -1e-9 || y < -1e-9) continue;
        if (cons.every((c) => c[1] * x + c[2] * y <= c[3] + 1e-7)) {
          const act = L.map((l, k) => (Math.abs(l[0] * x + l[1] * y - l[2]) < 1e-7 ? k : -1)).filter((k) => k >= 0);
          if (!pts.some((p) => Math.abs(p.x - x) < 1e-7 && Math.abs(p.y - y) < 1e-7)) pts.push({ x: Math.max(0, x), y: Math.max(0, y), act });
        }
      }
      return pts;
    }
    function solve(cons, pa, pb) { const cs = corners(cons); if (!cs.length) return null; return cs.reduce((a, b) => (pa * b.x + pb * b.y > pa * a.x + pb * a.y + 1e-9 ? b : a)); }

    function draw() {
      const pa = +$("#pa").value, pb = +$("#pb").value; integer = $("#int").checked;
      $("#paV").textContent = "$" + pa; $("#pbV").textContent = "$" + pb;
      const cs = corners(C), prof = (p) => pa * p.x + pb * p.y;
      const best = solve(C, pa, pb);
      // order corners around centroid for the polygon
      const cx = cs.reduce((s, p) => s + p.x, 0) / cs.length, cy = cs.reduce((s, p) => s + p.y, 0) / cs.length;
      const poly = cs.slice().sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
      const xmax = Math.max(10, ...cs.map((p) => p.x)) * 1.35, ymax = Math.max(10, ...cs.map((p) => p.y)) * 1.35;
      pl.x = [0, xmax]; pl.y = [0, ymax];
      pl.clear(); pl.axes({ xLabel: "units of A", yLabel: "units of B", yCount: 5 });
      const g = pl.ctx;
      if (poly.length > 2) { g.beginPath(); poly.forEach((p, i) => (i ? g.lineTo : g.moveTo).call(g, pl.sx(p.x), pl.sy(p.y))); g.closePath(); g.fillStyle = css("--accent"); g.globalAlpha = 0.12; g.fill(); g.globalAlpha = 1; }
      C.forEach((c, i) => {
        const [, a, b, r] = c, col = css(COLORS[i]);
        if (b !== 0) pl.path([0, xmax], [r / b, (r - a * xmax) / b], col, 1.8);
        else if (a !== 0) pl.path([r / a, r / a], [0, ymax], col, 1.8);
      });
      // integer points
      let ibest = null;
      if (integer) {
        for (let x = 0; x <= Math.floor(xmax); x++) for (let y = 0; y <= Math.floor(ymax); y++) {
          if (C.every((c) => c[1] * x + c[2] * y <= c[3] + 1e-9)) { if (xmax < 120) pl.dot(x, y, 1.6, css("--muted")); if (!ibest || pa * x + pb * y > prof(ibest)) ibest = { x, y }; }
        }
      }
      // simplex path (steepest improving neighbour)
      const path = [cs.find((p) => p.x < 1e-9 && p.y < 1e-9) || cs[0]];
      for (let guard = 0; guard < 20; guard++) {
        const cur = path[path.length - 1];
        const nb = cs.filter((p) => p !== cur && p.act.filter((k) => cur.act.includes(k)).length >= 1 && prof(p) > prof(cur) + 1e-9);
        if (!nb.length) break;
        path.push(nb.reduce((a, b) => (prof(b) > prof(a) ? b : a)));
      }
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i]; pl.path([a.x, b.x], [a.y, b.y], css("--ink"), 2.6);
        const ang = Math.atan2(pl.sy(b.y) - pl.sy(a.y), pl.sx(b.x) - pl.sx(a.x)); g.fillStyle = css("--ink"); g.beginPath(); g.moveTo(pl.sx(b.x), pl.sy(b.y)); g.lineTo(pl.sx(b.x) - 11 * Math.cos(ang - 0.4), pl.sy(b.y) - 11 * Math.sin(ang - 0.4)); g.lineTo(pl.sx(b.x) - 11 * Math.cos(ang + 0.4), pl.sy(b.y) - 11 * Math.sin(ang + 0.4)); g.closePath(); g.fill();
      }
      if (best && (pa || pb)) { const P = prof(best); if (pb > 0) pl.path([0, xmax], [P / pb, (P - pa * xmax) / pb], css("--good"), 2, [6, 5]); else pl.path([P / pa, P / pa], [0, ymax], css("--good"), 2, [6, 5]); }
      cs.forEach((p) => pl.dot(p.x, p.y, p === best ? 7 : 4.5, p === best ? css("--good") : css("--surface"), css("--ink")));
      if (ibest) pl.dot(ibest.x, ibest.y, 6, css("--warm"), css("--ink"));
      $("#leg").innerHTML = C.map((c, i) => `<span><i style="background:var(${COLORS[i]})"></i>${c[0]}</span>`).join("") + `<span><i style="background:var(--good)"></i>Best profit line</span>` + (integer ? `<span><i style="background:var(--warm)"></i>Best whole-number plan</span>` : "");

      // shadow prices
      C.forEach((c, i) => {
        const used = best ? c[1] * best.x + c[2] * best.y : 0;
        const C2 = C.map((x, k) => (k === i ? [x[0], x[1], x[2], x[3] + 1] : x)), b2 = solve(C2, pa, pb);
        const sp = best && b2 ? prof(b2) - prof(best) : 0;
        $("#use" + i).textContent = used.toFixed(1); $("#sl" + i).textContent = (c[3] - used).toFixed(1);
        $("#sp" + i).innerHTML = `<span style="color:${sp > 1e-6 ? "var(--good)" : "var(--muted)"}">$${sp.toFixed(2)}</span>`;
      });

      const nm = (k) => (k < C.length ? C[k][0] : k === C.length ? "A = 0" : "B = 0");
      $("#corners").innerHTML = `<tr><th>Corner</th><th>A</th><th>B</th><th>Profit</th><th style="text-align:left">Where these lines cross</th></tr>` + cs.slice().sort((a, b) => prof(b) - prof(a)).map((p) =>
        `<tr style="${p === best ? "background:var(--accent-soft);font-weight:600" : ""}"><td>${path.includes(p) ? `simplex step ${path.indexOf(p)}` : ""}</td><td>${p.x.toFixed(2)}</td><td>${p.y.toFixed(2)}</td><td>$${prof(p).toFixed(0)}</td><td style="text-align:left;font-family:var(--font-body)">${p.act.map(nm).join(" & ")}</td></tr>`).join("");

      $("#model").innerHTML = `maximise ${pa}·A + ${pb}·B<br>subject to:<br>` + C.map((c) => `&nbsp;&nbsp;${c[1]}·A + ${c[2]}·B ≤ ${c[3]} &nbsp;(${c[0].toLowerCase()})`).join("<br>") + `<br>&nbsp;&nbsp;A, B ≥ 0${integer ? ", whole numbers" : ""}`;

      $("#ro").innerHTML = best ? `
        <div class="ro"><b>Best plan</b><span class="num">A ${best.x.toFixed(1)}, B ${best.y.toFixed(1)}</span></div>
        <div class="ro"><b>Best profit</b><span class="pill ok">$${prof(best).toFixed(0)}</span></div>
        <div class="ro"><b>Simplex steps</b><span class="num">${path.length - 1}</span></div>
        <div class="ro"><b>Corners in total</b><span class="num">${cs.length}</span></div>
        ${ibest ? `<div class="ro"><b>Best whole-number plan</b><span class="num">A ${ibest.x}, B ${ibest.y}: $${prof(ibest).toFixed(0)}</span></div><div class="ro"><b>Cost of whole units</b><span class="num">$${(prof(best) - prof(ibest)).toFixed(0)}</span></div>` : ""}` : `<div class="ro"><b>No feasible plan</b></div>`;
    }

    buildCT();
    $("#ct").addEventListener("input", (e) => { const t = e.target; if (!t.dataset.i || t.value === "") return; C[+t.dataset.i][+t.dataset.j] = Math.max(0, +t.value); draw(); });
    ["#pa", "#pb", "#int"].forEach((s) => $(s).addEventListener("input", draw));
    draw();
    return watch([pl.c], (resized) => { if (resized) pl.resize(); draw(); });
  },
});
