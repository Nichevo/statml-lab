Lab.register({
  id: "tsp",
  group: "Supply chain",
  title: "Travelling salesman: planning a delivery route",
  blurb: "Visit every stop once and return to the depot by the shortest route. Watch nearest neighbour build a tour and 2-opt untangle it. Drag the stops around.",
  lede: "A van leaves the depot, visits every customer once and comes back. Which order is shortest? That's the travelling salesman problem (TSP). It sounds simple, but the number of possible routes explodes: 10 stops can be visited in about 1.8 million different orders, and 20 stops in about a billion billion. Nobody checks them all. Instead, routing software builds a good tour quickly with a rule of thumb (a heuristic), then improves it with small local changes until no change helps.",
  quiz: [
    ["How many distinct tours are there through n stops plus a depot, if direction doesn't matter?", "n! ÷ 2. With 10 stops that's 3,628,800 ÷ 2 = 1,814,400. Every extra stop multiplies the count again."],
    ["What does a 2-opt move do?", "It removes two edges of the tour and reconnects the pieces the other way, which reverses the section in between. If that's shorter, keep it. Repeating until no such move helps removes every crossing."],
    ["Why can nearest neighbour give a poor tour?", "It's greedy: it always grabs the closest unvisited stop, which strands far-away stops until the end and forces long return legs and crossings."],
    ["Real delivery routing adds what to the TSP?", "Vehicle capacity, several vehicles, time windows, driver hours, traffic and service times. That's the vehicle routing problem (VRP). The same build-then-improve heuristics are used."],
  ],
  diy: {
    intro: "Stops: x in B2:B11, y in C2:C11. Route order (stop numbers) in E2:E11.",
    steps: [
      ["Distance matrix.", "G2: =SQRT((INDEX($B$2:$B$11,ROW()-1)-INDEX($B$2:$B$11,COLUMN()-6))^2+(INDEX($C$2:$C$11,ROW()-1)-INDEX($C$2:$C$11,COLUMN()-6))^2)"],
      ["Leg length for the route order.", "F2: =INDEX($G$2:$P$11,E2,E3)\nF11: =INDEX($G$2:$P$11,E11,E2)   (back to start)"],
      ["Route length.", "=SUM(F2:F11)"],
      ["Nearest neighbour: from the current stop, the closest unvisited one.", "=MATCH(MIN(IF(unvisited,row_of_distances)),row_of_distances,0)"],
      ["2-opt check for edges A→B and C→D: reversing the segment helps if this is negative.", "=d(A,C)+d(B,D)-d(A,B)-d(C,D)"],
      ["Or use Solver's Evolutionary method with an 'alldifferent' constraint on E2:E11.", ""],
    ],
  },
  deeper: [
    ["Travelling salesman problem — Wikipedia", "https://en.wikipedia.org/wiki/Travelling_salesman_problem", "history, complexity and methods"],
    ["2-opt — Wikipedia", "https://en.wikipedia.org/wiki/2-opt", "the improvement move used here"],
    ["Vehicle routing problem — Wikipedia", "https://en.wikipedia.org/wiki/Vehicle_routing_problem", "TSP with trucks, capacities and time windows"],
    ["Google OR-Tools: routing", "https://developers.google.com/optimization/routing", "free solver with worked examples"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 48 L28 14 L54 22 L84 10 L76 50 L44 56 Z"/><rect x="8" y="44" width="8" height="8" fill="currentColor"/><circle cx="28" cy="14" r="3" fill="currentColor"/><circle cx="54" cy="22" r="3" fill="currentColor"/><circle cx="84" cy="10" r="3" fill="currentColor"/><circle cx="76" cy="50" r="3" fill="currentColor"/><circle cx="44" cy="56" r="3" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, watch, css, rng, dragPoints } = Lab;
    let method = "2opt", seed = 3, pts = [], steps = [], stepIdx = 0;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="map" aria-label="Map of stops and the route between them. Drag stops to move them; click empty space to add one."></canvas>
          <div class="legend"><span><i style="background:var(--ink)"></i>Depot</span><span><i style="background:var(--accent)"></i>Route</span><span><i style="background:var(--bad)"></i>Crossing edges</span><span><i style="background:var(--good)"></i>Best known (dashed)</span></div>
          <figcaption>Drag any stop. Click empty space to add one. Distances are straight lines in km.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 class="ts-h">Methods compared on these stops</h4>
          <div style="overflow-x:auto"><table id="cmp" style="width:100%;border-collapse:collapse;font-size:.86rem;font-variant-numeric:tabular-nums"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="ts-h">How fast the number of routes grows</h4>
          <div id="fact" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.ts-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}</style>`,
      panel: `
        <div class="ctrl"><label>Show route from</label>
          <div class="seg" id="meth" style="grid-auto-flow:row;grid-template-columns:1fr 1fr"><button type="button" data-v="random" aria-pressed="false">Random order</button><button type="button" data-v="nn" aria-pressed="false">Nearest neighbour</button><button type="button" data-v="ins" aria-pressed="false">Cheapest insertion</button><button type="button" data-v="2opt" aria-pressed="true">NN + 2-opt</button></div></div>
        <div class="ctrl"><label for="step">2-opt improvements applied <output id="stepV"></output></label><input type="range" id="step" min="0" max="0" step="1" value="0"></div>
        <div class="ctrl"><label for="n">Number of stops <output id="nV"></output></label><input type="range" id="n" min="4" max="60" step="1" value="18"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newc" type="button">New stops</button><button class="btn" id="clus" type="button">Clustered towns</button></div>`,
      notes: `
        <section>
          <h2>Build: nearest neighbour</h2>
          <p>Start at the depot. Go to the closest stop you haven't visited. Repeat until all are visited, then return. Fast and usually within about 25% of the best tour, but it leaves crossings and a long trip home.</p>
          <h2>Build: cheapest insertion</h2>
          <p>Start with a small loop. Repeatedly pick the stop that adds the least distance and insert it where it fits best. Slower, usually better.</p>
        </section>
        <section>
          <h2>Improve: 2-opt</h2>
          <p>Take two edges A→B and C→D. Replace them with A→C and B→D, reversing the stretch between. Keep the change if:</p>
          <div class="eq">d(A,C) + d(B,D) &lt; d(A,B) + d(C,D)</div>
          <p>Repeat until no swap helps. The result has no crossing edges, because uncrossing two edges always shortens a route. Slide "2-opt improvements" to replay each swap.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Choose "Random order". Then "Nearest neighbour". Then step through 2-opt from 0. Count the red crossings disappearing.</li>
            <li>Drag a stop far out to a corner. Nearest neighbour often leaves it to the end.</li>
            <li>With 8 stops or fewer, the page checks every route and shows the true optimum. Does 2-opt find it?</li>
            <li>Try "Clustered towns". Good routes finish one town before moving to the next.</li>
          </ol>
          <p>Related: <a href="#network-design">network design</a>, <a href="#freight">freight trade-offs</a>, <a href="#gradient-descent">local vs global minima</a> (2-opt stops at a local optimum).</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const map = new Plot($("#map"), { x: [0, 100], y: [0, 56], pad: { l: 30, b: 30, t: 10, r: 10 } });
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const len = (tour) => tour.reduce((s, v, i) => s + dist(pts[v], pts[tour[(i + 1) % tour.length]]), 0);

    function makePts(clustered) {
      const r = rng(seed), n = +$("#n").value;
      pts = [{ x: 50, y: 28 }];
      const centres = Array.from({ length: 4 }, () => ({ x: 12 + r() * 76, y: 8 + r() * 40 }));
      for (let i = 0; i < n; i++) {
        if (clustered) { const c = centres[i % 4]; pts.push({ x: Math.max(2, Math.min(98, c.x + r.normal() * 5)), y: Math.max(2, Math.min(54, c.y + r.normal() * 4)) }); }
        else pts.push({ x: 4 + r() * 92, y: 3 + r() * 50 });
      }
    }

    function nn() {
      const n = pts.length, seen = new Array(n).fill(false), t = [0]; seen[0] = true;
      for (let k = 1; k < n; k++) { const a = t[t.length - 1]; let b = -1, bd = Infinity; for (let j = 0; j < n; j++) if (!seen[j] && dist(pts[a], pts[j]) < bd) { bd = dist(pts[a], pts[j]); b = j; } t.push(b); seen[b] = true; }
      return t;
    }
    function insertion() {
      const n = pts.length; if (n < 3) return pts.map((_, i) => i);
      let far = 1; for (let j = 1; j < n; j++) if (dist(pts[0], pts[j]) > dist(pts[0], pts[far])) far = j;
      const t = [0, far], left = new Set(pts.map((_, i) => i).filter((i) => i !== 0 && i !== far));
      while (left.size) {
        let best = null;
        for (const k of left) for (let i = 0; i < t.length; i++) { const a = pts[t[i]], b = pts[t[(i + 1) % t.length]], add = dist(a, pts[k]) + dist(pts[k], b) - dist(a, b); if (!best || add < best.add) best = { k, i, add }; }
        t.splice(best.i + 1, 0, best.k); left.delete(best.k);
      }
      return t;
    }
    function twoOptSteps(start) {
      const out = [start.slice()]; let t = start.slice(), improved = true, guard = 0;
      while (improved && guard++ < 2000) {
        improved = false;
        outer: for (let i = 0; i < t.length - 1; i++) for (let j = i + 2; j < t.length; j++) {
          if (i === 0 && j === t.length - 1) continue;
          const A = pts[t[i]], B = pts[t[i + 1]], C = pts[t[j]], D = pts[t[(j + 1) % t.length]];
          if (dist(A, C) + dist(B, D) < dist(A, B) + dist(C, D) - 1e-9) { t = t.slice(0, i + 1).concat(t.slice(i + 1, j + 1).reverse(), t.slice(j + 1)); out.push(t.slice()); improved = true; break outer; }
        }
      }
      return out;
    }
    function brute() {
      const n = pts.length; if (n > 9) return null;
      const rest = pts.map((_, i) => i).slice(1); let best = null, bl = Infinity;
      const perm = (arr, k) => { if (k === arr.length) { const t = [0, ...arr], l = len(t); if (l < bl) { bl = l; best = t.slice(); } return; } for (let i = k; i < arr.length; i++) { [arr[k], arr[i]] = [arr[i], arr[k]]; perm(arr, k + 1); [arr[k], arr[i]] = [arr[i], arr[k]]; } };
      perm(rest, 0); return best;
    }
    const segX = (p1, p2, p3, p4) => { const o = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)); return o(p1, p2, p3) * o(p1, p2, p4) < 0 && o(p3, p4, p1) * o(p3, p4, p2) < 0; };
    function crossings(t) { const e = t.map((v, i) => [v, t[(i + 1) % t.length]]), out = new Set(); for (let i = 0; i < e.length; i++) for (let j = i + 2; j < e.length; j++) { if (i === 0 && j === e.length - 1) continue; if (segX(pts[e[i][0]], pts[e[i][1]], pts[e[j][0]], pts[e[j][1]])) { out.add(i); out.add(j); } } return out; }

    let cache = null;
    function solve() {
      const r = rng(seed + 99), rand = [0, ...pts.map((_, i) => i).slice(1).sort(() => r() - 0.5)];
      const t0 = performance.now(); const nnT = nn(); const tNN = performance.now() - t0;
      const t1 = performance.now(); const insT = insertion(); const tIns = performance.now() - t1;
      const t2 = performance.now(); steps = twoOptSteps(nnT); const t2o = performance.now() - t2;
      const t3 = performance.now(); const opt = brute(); const tBr = performance.now() - t3;
      const insOpt = twoOptSteps(insT);
      cache = { rand, nnT, insT, opt, times: { nn: tNN, ins: tIns, two: t2o + tNN, br: tBr }, insOpt: insOpt[insOpt.length - 1] };
      $("#step").max = steps.length - 1; stepIdx = steps.length - 1; $("#step").value = stepIdx;
    }

    function draw() {
      const n = pts.length - 1;
      $("#nV").textContent = n; $("#stepV").textContent = `${stepIdx} of ${steps.length - 1}`;
      $("#step").disabled = method !== "2opt";
      const tour = method === "random" ? cache.rand : method === "nn" ? cache.nnT : method === "ins" ? cache.insT : steps[stepIdx];
      const L = len(tour), X = crossings(tour);
      map.clear(); map.axes({ xTicks: [0, 20, 40, 60, 80, 100], yTicks: [0, 20, 40], xFormat: (v) => v + " km", yFormat: (v) => v });
      if (cache.opt) { const o = cache.opt; map.path([...o, o[0]].map((i) => pts[i].x), [...o, o[0]].map((i) => pts[i].y), css("--good"), 5, [2, 6], 0.55); }
      tour.forEach((v, i) => { const a = pts[v], b = pts[tour[(i + 1) % tour.length]]; map.path([a.x, b.x], [a.y, b.y], X.has(i) ? css("--bad") : css("--accent"), X.has(i) ? 2.6 : 2.2); });
      const g = map.ctx;
      pts.forEach((p, i) => {
        if (i === 0) { g.fillStyle = css("--ink"); g.fillRect(map.sx(p.x) - 7, map.sy(p.y) - 7, 14, 14); }
        else map.dot(p.x, p.y, 5, css("--surface"), css("--accent"));
      });
      if (method !== "random") {
        g.font = "600 10px " + css("--font-mono"); g.fillStyle = css("--muted"); g.textAlign = "center";
        tour.forEach((v, k) => { if (k && n <= 30) g.fillText(k, map.sx(pts[v].x), map.sy(pts[v].y) - 9); });
      }

      const rows = [["Random order", len(cache.rand), "—", "random"], ["Nearest neighbour", len(cache.nnT), cache.times.nn, "nn"], ["Cheapest insertion", len(cache.insT), cache.times.ins, "ins"],
        ["NN + 2-opt", len(steps[steps.length - 1]), cache.times.two, "2opt"], ["Insertion + 2-opt", len(cache.insOpt), "—", ""]];
      if (cache.opt) rows.push(["Every route checked (optimal)", len(cache.opt), cache.times.br, ""]);
      const ref = cache.opt ? len(cache.opt) : Math.min(...rows.map((r) => r[1]));
      const th = (t, l) => `<th style="text-align:${l ? "left" : "right"};padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500">${t}</th>`;
      const td = (v, l, st = "") => `<td style="text-align:${l ? "left" : "right"};padding:5px 8px;border-bottom:1px solid var(--line);${l ? "" : "font-family:var(--font-mono)"};${st}">${v}</td>`;
      $("#cmp").innerHTML = `<tr>${th("Method", 1)}${th("Route length")}${th(cache.opt ? "vs optimal" : "vs best found")}${th("Time")}</tr>` + rows.map(([l, d, tm, k]) =>
        `<tr style="${k === method ? "background:var(--accent-soft)" : ""}">${td(l, 1)}${td(d.toFixed(1) + " km")}${td("+" + ((d / ref - 1) * 100).toFixed(1) + "%", 0, d - ref < 0.05 ? "color:var(--good)" : "")}${td(typeof tm === "number" ? (tm < 1 ? "<1 ms" : tm.toFixed(0) + " ms") : tm)}</tr>`).join("");

      $("#ro").innerHTML = `
        <div class="ro"><b>This route</b><span class="num">${L.toFixed(1)} km</span></div>
        <div class="ro"><b>Crossings</b><span class="pill ${X.size ? "warn" : "ok"}">${X.size / 2 | 0}</span></div>
        <div class="ro"><b>Possible routes</b><span class="num">${fmtBig(n)}</span></div>`;

      const facts = [5, 8, 10, 15, 20, 30, 60].map((k) => `${String(k).padStart(2)} stops → ${fmtBig(k)} routes${k <= 9 ? "" : `  (at a billion a second: ${yrs(k)})`}`);
      $("#fact").innerHTML = [`routes = n! ÷ 2 (each route counted once, either direction)`, ...facts].map((l) => `<div>${l}</div>`).join("");
    }
    const fact = (k) => { let f = 1; for (let i = 2; i <= k; i++) f *= i; return f; };
    function fmtBig(k) { const v = fact(k) / 2; return v < 1e9 ? Math.round(v).toLocaleString() : v.toExponential(1).replace("e+", " × 10^"); }
    function yrs(k) { const s = fact(k) / 2 / 1e9; return s < 1 ? (s * 1000).toFixed(1) + " ms" : s < 60 ? s.toFixed(1) + " s" : s < 3600 * 24 ? (s / 3600).toFixed(1) + " hours" : s < 3.15e7 * 1e3 ? (s / 3.15e7).toFixed(0) + " years" : (s / 3.15e7).toExponential(0).replace("e+", " × 10^") + " years"; }

    makePts(false); solve();
    dragPoints(map, () => pts, () => { solve(); draw(); }, { addOnClick: true });
    $("#meth").addEventListener("click", (e) => { const v = e.target.closest("button")?.dataset.v; if (!v) return; method = v; $("#meth").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === v)); draw(); });
    $("#step").addEventListener("input", () => { stepIdx = +$("#step").value; draw(); });
    $("#n").addEventListener("input", () => { makePts(false); solve(); draw(); });
    $("#newc").addEventListener("click", () => { seed++; makePts(false); solve(); draw(); });
    $("#clus").addEventListener("click", () => { seed++; makePts(true); solve(); draw(); });
    draw();
    return watch([map.c], (resized) => { if (resized) map.resize(); draw(); });
  },
});
