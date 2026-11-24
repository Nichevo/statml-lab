Lab.register({
  id: "simulated-annealing",
  group: "Optimization",
  title: "Heuristics: escaping local optima with simulated annealing",
  blurb: "When a problem is too big to solve exactly, search. Greedy improvement gets stuck; simulated annealing sometimes accepts a worse move to escape. Watch both on the same delivery route.",
  lede: "Linear programs have one hill to climb. Most real scheduling, routing and layout problems don't: they have countless local optima, plans that no small change can improve but that are still far from the best. Greedy improvement, like 2-opt on its own, stops at the first one it reaches. Simulated annealing borrows an idea from cooling metal: early on, it often accepts changes that make things worse, so it can wander out of a poor valley; as the 'temperature' falls, it gets pickier, until it only accepts improvements.",
  quiz: [
    ["What is a local optimum?", "A solution that no allowed small change can improve, even though a better solution exists elsewhere. Greedy search stops there."],
    ["What's the rule for accepting a worse move?", "Accept it with probability e^(−Δ/T), where Δ is how much worse it is and T is the current temperature. Big setbacks and low temperatures make acceptance unlikely."],
    ["What happens if you cool too fast?", "The search freezes early in whatever valley it's in: it behaves like greedy improvement. Cool too slowly and it wastes time wandering."],
    ["Name other metaheuristics.", "Tabu search (forbid recently undone moves), genetic algorithms (combine good solutions), large neighbourhood search (destroy and rebuild part of a solution), and ant colony optimization. Commercial routing and scheduling tools mix these."],
  ],
  diy: {
    intro: "Start with a route (or any solution) and its cost. Temperature T0 in H1, cooling factor α in H2.",
    steps: [
      ["Temperature at iteration i.", "=H1*H2^i"],
      ["Propose a small change (e.g. a 2-opt reversal) and compute the change in cost.", "Δ: =new_cost-current_cost"],
      ["Acceptance probability for a worse move.", "=IF(Δ<=0,1,EXP(-Δ/T))"],
      ["Accept or reject.", "=IF(RAND()<p,\"accept\",\"reject\")"],
      ["Cooling factor that takes T0 down to 0.001 over N iterations.", "=(0.001/H1)^(1/N)"],
    ],
  },
  deeper: [
    ["Simulated annealing — Wikipedia", "https://en.wikipedia.org/wiki/Simulated_annealing", "the algorithm and cooling schedules"],
    ["Metaheuristic — Wikipedia", "https://en.wikipedia.org/wiki/Metaheuristic", "the wider family"],
    ["Tabu search — Wikipedia", "https://en.wikipedia.org/wiki/Tabu_search", "memory-based local search"],
    ["Kirkpatrick, Gelatt & Vecchi (1983), Optimization by simulated annealing", "https://doi.org/10.1126/science.220.4598.671", "the original Science paper"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 30 C 12 10, 18 50, 26 40 C 34 28, 38 20, 46 36 C 54 54, 62 60, 70 48 C 78 36, 84 20, 92 24"/><circle cx="26" cy="40" r="4" fill="currentColor" opacity=".5"/><circle cx="64" cy="56" r="4" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, watch, css, rng } = Lab;
    let seed = 11, pts = [], runs = null;

    root.innerHTML = Lab.page(this, {
      figure: `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
          <figure class="plot" style="aspect-ratio:16/11;margin:0"><canvas id="mg" aria-label="Route found by greedy 2-opt"></canvas><figcaption id="capg"></figcaption></figure>
          <figure class="plot" style="aspect-ratio:16/11;margin:0"><canvas id="ms" aria-label="Route found by simulated annealing"></canvas><figcaption id="caps"></figcaption></figure>
        </div>
        <figure class="plot wide">
          <canvas id="trace" aria-label="Route length over iterations for greedy and simulated annealing, with temperature"></canvas>
          <div class="legend"><span><i style="background:var(--muted)"></i>Greedy (only improvements)</span><span><i style="background:var(--accent)"></i>Annealing: current route</span><span><i style="background:var(--good)"></i>Annealing: best so far</span><span><i style="background:var(--warm)"></i>Temperature</span></div>
          <figcaption>Greedy drops fast, then flat-lines at a local optimum. Annealing jumps around early (accepting worse routes), then settles lower.</figcaption>
        </figure>`,
      panel: `
        <div class="ctrl"><label for="n">Stops <output id="nV"></output></label><input type="range" id="n" min="10" max="80" step="5" value="45"></div>
        <div class="ctrl"><label for="t0">Starting temperature <output id="t0V"></output></label><input type="range" id="t0" min="0" max="40" step="1" value="20"></div>
        <div class="ctrl"><label for="cool">Cooling speed <output id="coolV"></output></label><input type="range" id="cool" min="1" max="10" step="1" value="4"></div>
        <div class="ctrl"><label for="it">Iterations <output id="itV"></output></label><input type="range" id="it" min="5000" max="200000" step="5000" value="100000"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="go" type="button">Run again (new random start)</button><button class="btn" id="newc" type="button">New stops</button></div>`,
      notes: `
        <section>
          <h2>The algorithm</h2>
          <ol>
            <li>Start from any route. Set temperature T high.</li>
            <li>Make a random small change (here: reverse a random stretch, a 2-opt move).</li>
            <li>If it's shorter, keep it. If it's longer by Δ, keep it anyway with probability e<sup>−Δ/T</sup>.</li>
            <li>Lower T a little (T ← T × cooling factor) and repeat.</li>
            <li>Remember the best route ever seen.</li>
          </ol>
          <p>Greedy search here makes the same random moves but never accepts a worse one.</p>
        </section>
        <section>
          <h2>Why it works</h2>
          <p>At high temperature the search can climb out of a valley to reach a deeper one. As T falls it settles into the best valley it found. With very slow cooling it is guaranteed to find the global optimum, but "very slow" is impractical, so in practice it's a good heuristic, not a proof.</p>
          <div class="eq">P(accept worse) = e^(−Δ / T)</div>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set the starting temperature to 0. Annealing becomes greedy: same result quality.</li>
            <li>Set it to 40 with fast cooling. Too hot, then frozen too quickly.</li>
            <li>Run several times. Greedy results vary a lot with the random start; annealing is usually shorter and more consistent, but not on every single run. It is a heuristic, not a guarantee.</li>
          </ol>
          <p>Related: <a href="#tsp">travelling salesman</a>, <a href="#linear-programming">linear programming</a> (no local optima to escape), <a href="#gradient-descent">gradient descent</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pg = new Plot($("#mg"), { x: [0, 100], y: [0, 70], pad: { l: 8, r: 8, t: 8, b: 8 } });
    const ps = new Plot($("#ms"), { x: [0, 100], y: [0, 70], pad: { l: 8, r: 8, t: 8, b: 8 } });
    const pt = new Plot($("#trace"), { x: [0, 1], pad: { l: 60, r: 50 } });
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const len = (t) => t.reduce((s, v, i) => s + dist(pts[v], pts[t[(i + 1) % t.length]]), 0);

    function makePts() { const r = rng(seed), n = +$("#n").value; pts = Array.from({ length: n }, () => ({ x: 4 + r() * 92, y: 4 + r() * 62 })); }

    function run(runSeed) {
      const r = rng(runSeed), n = pts.length, iters = +$("#it").value, T0 = +$("#t0").value, cool = +$("#cool").value;
      const alpha = Math.pow(0.001 / Math.max(T0, 1e-9), 1 / ((iters * (11 - cool)) / 10)); // T reaches ~0.001 after (11 − cool)/10 of the run
      const start = Array.from({ length: n }, (_, i) => i).sort(() => r() - 0.5);
      const doRun = (T0x) => {
        const r = rng(runSeed * 7 + 1);
        let t = start.slice(), L = len(t), best = t.slice(), bL = L, T = T0x; const trace = [], temps = [];
        for (let k = 0; k < iters; k++) {
          let i = 1 + Math.floor(r() * (n - 1)), j = 1 + Math.floor(r() * (n - 1)); if (i > j) [i, j] = [j, i]; if (j - i < 1) continue;
          const a = pts[t[i - 1]], b = pts[t[i]], c = pts[t[j]], d = pts[t[(j + 1) % n]];
          const delta = dist(a, c) + dist(b, d) - dist(a, b) - dist(c, d);
          if (delta < 0 || (T > 1e-9 && r() < Math.exp(-delta / T))) { for (let x = i, y = j; x < y; x++, y--) [t[x], t[y]] = [t[y], t[x]]; L += delta; if (L < bL - 1e-9) { bL = L; best = t.slice(); } }
          T *= alpha;
          if (k % Math.max(1, Math.floor(iters / 300)) === 0) { trace.push(L); temps.push(T); }
        }
        return { best, bL, trace, temps };
      };
      return { greedy: doRun(0), sa: doRun(T0), startL: len(start) };
    }

    function drawRoute(p, tour, col) {
      p.clear(); const g = p.ctx;
      p.path([...tour, tour[0]].map((i) => pts[i].x), [...tour, tour[0]].map((i) => pts[i].y), css(col), 2);
      pts.forEach((q) => p.dot(q.x, q.y, 3.5, css("--surface"), css(col)));
      g.strokeStyle = css("--line"); g.strokeRect(p.pad.l, p.pad.t, p.w - p.pad.l - p.pad.r, p.ih);
    }

    let runSeed = 1;
    function compute() { runs = run(runSeed); }
    function draw() {
      const T0 = +$("#t0").value;
      $("#nV").textContent = pts.length; $("#t0V").textContent = T0; $("#coolV").textContent = ["", "very slow", "slow", "", "medium", "", "", "fast", "", "", "very fast"][+$("#cool").value] || $("#cool").value; $("#itV").textContent = (+$("#it").value).toLocaleString();
      const { greedy, sa, startL } = runs;
      drawRoute(pg, greedy.best, "--muted"); drawRoute(ps, sa.best, "--accent");
      $("#capg").textContent = `Greedy 2-opt: ${greedy.bL.toFixed(1)} km`; $("#caps").textContent = `Simulated annealing: ${sa.bL.toFixed(1)} km`;
      const N = sa.trace.length, xs = Array.from({ length: N }, (_, i) => i / (N - 1));
      const lo = Math.min(...sa.trace, ...greedy.trace), hi = Math.max(...sa.trace.slice(Math.floor(N * 0.02)), ...greedy.trace.slice(1));
      pt.y = [lo * 0.95, Math.min(hi, startL) * 1.02];
      pt.clear(); pt.axes({ xLabel: "share of iterations", xFormat: (v) => Math.round(v * 100) + "%", yLabel: "route length (km)", yCount: 4 });
      const T = sa.temps, tmax = Math.max(1e-9, ...T);
      pt.path(xs, T.map((v) => pt.y[0] + (v / tmax) * (pt.y[1] - pt.y[0]) * 0.95), css("--warm"), 1.5, [4, 3]);
      pt.path(xs, greedy.trace, css("--muted"), 2);
      pt.path(xs, sa.trace, css("--accent"), 1.4, null, 0.8);
      let b = Infinity; pt.path(xs, sa.trace.map((v) => (b = Math.min(b, v))), css("--good"), 2.4);
      const g = pt.ctx; g.fillStyle = css("--warm"); g.font = "10px " + css("--font-mono"); g.textAlign = "left"; g.fillText(`T₀ = ${T0}`, pt.w - pt.pad.r + 4, pt.sy(pt.y[0] + (pt.y[1] - pt.y[0]) * 0.95) + 4);
      $("#ro").innerHTML = `
        <div class="ro"><b>Random start</b><span class="num">${startL.toFixed(1)} km</span></div>
        <div class="ro"><b>Greedy result</b><span class="num">${greedy.bL.toFixed(1)} km</span></div>
        <div class="ro"><b>Annealing result</b><span class="num">${sa.bL.toFixed(1)} km</span></div>
        <div class="ro"><b>Annealing vs greedy</b><span class="pill ${sa.bL < greedy.bL - 0.05 ? "ok" : "idle"}">${((sa.bL / greedy.bL - 1) * 100).toFixed(1)}%</span></div>`;
    }

    makePts(); compute();
    const recompute = () => { compute(); draw(); };
    ["#t0", "#cool", "#it"].forEach((s) => $(s).addEventListener("change", recompute));
    ["#t0", "#cool", "#it"].forEach((s) => $(s).addEventListener("input", () => { $("#t0V").textContent = $("#t0").value; $("#itV").textContent = (+$("#it").value).toLocaleString(); }));
    $("#n").addEventListener("change", () => { makePts(); recompute(); });
    $("#n").addEventListener("input", () => { $("#nV").textContent = $("#n").value; });
    $("#go").addEventListener("click", () => { runSeed++; recompute(); });
    $("#newc").addEventListener("click", () => { seed++; makePts(); recompute(); });
    draw();
    return watch([pg.c, ps.c, pt.c], (resized) => { if (resized) { pg.resize(); ps.resize(); pt.resize(); } draw(); });
  },
});
