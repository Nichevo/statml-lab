Lab.register({
  id: "network-design",
  group: "Supply chain",
  title: "Network design: how many DCs, and where?",
  blurb: "Centre of gravity, facility location and the classic trade-off: more warehouses mean shorter deliveries but more buildings and more stock.",
  lede: "Where should warehouses go, and how many should there be? One central DC keeps buildings and stock to a minimum, but every delivery travels a long way. Many local DCs cut delivery distance and time, but each one has rent, staff and its own safety stock. Network design weighs these costs against each other. It starts with a simple centre-of-gravity calculation and grows into an optimization that picks the best sites from a list of candidates.",
  quiz: [
    ["What does the centre of gravity method give you?", "The demand-weighted average location of your customers: a starting point for one DC. It ignores roads, rents and labour, so it's a guide for where to look, not a final answer."],
    ["Why does total inventory rise with more DCs?", "Each DC needs its own safety stock against its own share of demand, and splitting demand loses risk pooling. With independent demand, safety stock grows roughly with √(number of DCs)."],
    ["Why does inbound transport cost rise with more DCs?", "Inbound loads from the factory or port are split across more destinations, so trucks are less full or travel further in total."],
    ["The cost curve is very flat between 3 and 5 DCs. How do you choose?", "Use the things the model leaves out: delivery lead time promised to customers, risk (one DC is a single point of failure), growth plans, labour availability and the cost of change from today's network."],
  ],
  deeper: [
    ["Facility location problem — Wikipedia", "https://en.wikipedia.org/wiki/Facility_location_problem", "the optimization behind site selection"],
    ["Geometric median — Wikipedia", "https://en.wikipedia.org/wiki/Geometric_median", "Weiszfeld's algorithm for the true minimum-distance point"],
    ["Square root law (inventory) — Wikipedia", "https://en.wikipedia.org/wiki/Square_root_law_(inventory_management)", "why stock grows with the number of DCs"],
    ["Google OR-Tools: assignment and MIP", "https://developers.google.com/optimization/mip", "solve real location models for free"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="40" y="26" width="12" height="12" fill="currentColor"/><path d="M46 32 L14 12 M46 32 L18 52 M46 32 L80 14 M46 32 L84 48 M46 32 L50 58" opacity=".5"/><circle cx="14" cy="12" r="3"/><circle cx="18" cy="52" r="3"/><circle cx="80" cy="14" r="3"/><circle cx="84" cy="48" r="3"/><circle cx="50" cy="58" r="3"/></svg>`,

  mount(root) {
    const { Plot, watch, css, rng, dragPoints } = Lab;
    const money = (v) => "$" + (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + "m" : Math.round(v / 1000) + "k");
    let seed = 5, cust = [], cand = [], k = 3;
    const port = { x: 6, y: 30 };

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="nmap" aria-label="Map of customers (circles sized by demand), candidate DC sites, and the chosen DCs with their customer assignments"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>Customers (size = demand)</span><span><i style="background:var(--muted)"></i>Candidate sites</span><span><i style="background:var(--ink)"></i>Chosen DCs</span><span><i style="background:var(--warm)"></i>Port / factory</span><span><i style="background:var(--violet)"></i>Centre of gravity</span></div>
          <figcaption>Drag customers to move demand. Lines show which DC serves each customer. The ring is the service radius.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="ncost" aria-label="Yearly cost by number of DCs: outbound, inbound, facilities, inventory and total"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>Outbound delivery</span><span><i style="background:var(--warm)"></i>Inbound</span><span><i style="background:var(--muted)"></i>Facilities</span><span><i style="background:var(--violet)"></i>Inventory</span><span><i style="background:var(--ink)"></i>Total</span></div>
          <figcaption>For each number of DCs, the best sites from the candidate list. Total cost is usually U-shaped.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="k">Number of DCs <output id="kV"></output></label><input type="range" id="k" min="1" max="6" step="1" value="3"></div>
        <div class="ctrl"><label for="out">Outbound cost per unit per 100 km <output id="outV"></output></label><input type="range" id="out" min="0.1" max="3" step="0.05" value="1.2"></div>
        <div class="ctrl"><label for="inb">Inbound cost per unit per 100 km <output id="inbV"></output></label><input type="range" id="inb" min="0.05" max="1.5" step="0.05" value="0.15"></div>
        <div class="ctrl"><label for="fix">Fixed cost per DC / yr <output id="fixV"></output></label><input type="range" id="fix" min="0" max="2000" step="50" value="400"></div>
        <div class="ctrl"><label for="ss">Safety stock value with 1 DC <output id="ssV"></output></label><input type="range" id="ss" min="0" max="10000" step="250" value="2000"></div>
        <div class="ctrl"><label for="h">Carrying cost rate <output id="hV"></output></label><input type="range" id="h" min="5" max="40" step="1" value="25"></div>
        <div class="ctrl"><label for="rad">Service radius (next-day) <output id="radV"></output></label><input type="range" id="rad" min="50" max="600" step="25" value="250"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newm" type="button">New map</button><button class="btn" id="bestk" type="button">Use the cheapest number</button></div>`,
      notes: `
        <section>
          <h2>Centre of gravity</h2>
          <div class="eq">x* = Σ(demandᵢ × xᵢ) ÷ Σ demandᵢ<br>y* = Σ(demandᵢ × yᵢ) ÷ Σ demandᵢ</div>
          <p>This minimizes demand-weighted <i>squared</i> distance. The point that truly minimizes unit-km (the geometric median) is found by Weiszfeld's iteration: re-weight each customer by demand ÷ distance and average again. Both are shown; they often differ when demand is lopsided.</p>
        </section>
        <section>
          <h2>Choosing k sites</h2>
          <p>For a given number of DCs, try every combination of candidate sites (there are few enough here), assign each customer to its nearest open DC, and keep the cheapest. Real models use mixed-integer programming for thousands of sites and roads.</p>
          <div class="eq">outbound = Σ demand × distance to its DC × rate<br>inbound = Σ DC volume × distance from port × rate<br>facilities = k × fixed cost<br>inventory = safety stock(1 DC) × √k × carrying rate</div>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Raise the fixed cost per DC to $1.5m. The best number drops.</li>
            <li>Raise the outbound rate (small parcels, expensive last mile). More DCs pay off.</li>
            <li>Drag a big customer to the far corner. Watch the centre of gravity and the chosen sites shift.</li>
            <li>Shrink the service radius to 150 km. Cheapest isn't always fast enough: check the share of demand served next day.</li>
          </ol>
          <p>Related: <a href="#risk-pooling">risk pooling</a>, <a href="#supply-network">safety stock across a network</a>, <a href="#tsp">delivery routing</a>, <a href="#linear-programming">linear programming</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const map = new Plot($("#nmap"), { x: [0, 1000], y: [0, 560], pad: { l: 40, b: 30, t: 10, r: 10 } });
    const pc = new Plot($("#ncost"), { x: [0.7, 6.3], pad: { l: 64 } });
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    function makeMap() {
      const r = rng(seed); cust = []; cand = [];
      const cities = Array.from({ length: 5 }, () => ({ x: 120 + r() * 820, y: 60 + r() * 440, w: 0.5 + r() }));
      for (let i = 0; i < 36; i++) {
        const c = cities[i % 5], big = i < 5;
        cust.push({ x: Math.max(20, Math.min(980, c.x + r.normal() * (big ? 10 : 80))), y: Math.max(20, Math.min(540, c.y + r.normal() * (big ? 10 : 60))), d: Math.round((big ? 60 : 8 + r() * 22) * c.w) * 1000 });
      }
      for (let i = 0; i < 9; i++) cand.push({ x: 80 + r() * 860, y: 50 + r() * 460 });
      cities.forEach((c, i) => { if (i < 3) cand[i] = { x: c.x + 25, y: c.y + 20 }; });
    }

    function combos(n, kk) { const out = [], cur = []; const rec = (s) => { if (cur.length === kk) { out.push(cur.slice()); return; } for (let i = s; i < n; i++) { cur.push(i); rec(i + 1); cur.pop(); } }; rec(0); return out; }

    function evalSet(set, P) {
      const assign = cust.map((c) => set.reduce((b, j) => (dist(c, cand[j]) < dist(c, cand[b]) ? j : b), set[0]));
      const out = cust.reduce((s, c, i) => s + c.d * dist(c, cand[assign[i]]) / 100 * P.out, 0);
      const vol = {}; cust.forEach((c, i) => (vol[assign[i]] = (vol[assign[i]] || 0) + c.d));
      const inb = set.reduce((s, j) => s + (vol[j] || 0) * dist(port, cand[j]) / 100 * P.inb, 0);
      const fac = set.length * P.fix, inv = P.ss * Math.sqrt(set.length) * P.h;
      const served = cust.reduce((s, c, i) => s + (dist(c, cand[assign[i]]) <= P.rad ? c.d : 0), 0);
      return { set, assign, out, inb, fac, inv, tot: out + inb + fac + inv, served, vol };
    }

    let best = [];
    function solveAll(P) { best = [null]; for (let kk = 1; kk <= 6; kk++) best.push(combos(cand.length, kk).map((s) => evalSet(s, P)).reduce((a, b) => (b.tot < a.tot ? b : a))); }

    function params() {
      return { out: +$("#out").value, inb: +$("#inb").value, fix: +$("#fix").value * 1000, ss: +$("#ss").value * 1000, h: +$("#h").value / 100, rad: +$("#rad").value };
    }

    function draw(resolve = true) {
      const P = params();
      $("#kV").textContent = k; $("#outV").textContent = "$" + P.out.toFixed(2); $("#inbV").textContent = "$" + P.inb.toFixed(2); $("#fixV").textContent = money(P.fix);
      $("#ssV").textContent = money(P.ss); $("#hV").textContent = Math.round(P.h * 100) + "%"; $("#radV").textContent = P.rad + " km";
      if (resolve) solveAll(P);
      const sol = best[k], D = cust.reduce((s, c) => s + c.d, 0);

      // centre of gravity and Weiszfeld
      const cog = { x: cust.reduce((s, c) => s + c.d * c.x, 0) / D, y: cust.reduce((s, c) => s + c.d * c.y, 0) / D };
      let gm = { ...cog };
      for (let it = 0; it < 60; it++) { let wx = 0, wy = 0, ws = 0; cust.forEach((c) => { const dd = Math.max(1, dist(c, gm)), w = c.d / dd; wx += w * c.x; wy += w * c.y; ws += w; }); gm = { x: wx / ws, y: wy / ws }; }
      const ukm = (p) => cust.reduce((s, c) => s + c.d * dist(c, p), 0);

      map.clear(); map.axes({ xTicks: [0, 200, 400, 600, 800, 1000], yTicks: [0, 200, 400], xFormat: (v) => v + " km", yFormat: (v) => v });
      const g = map.ctx;
      sol.set.forEach((j) => { g.beginPath(); g.arc(map.sx(cand[j].x), map.sy(cand[j].y), Math.abs(map.sx(P.rad) - map.sx(0)), 0, Math.PI * 2); g.fillStyle = css("--accent"); g.globalAlpha = 0.06; g.fill(); g.globalAlpha = 0.35; g.strokeStyle = css("--accent"); g.setLineDash([4, 4]); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; });
      cust.forEach((c, i) => map.path([c.x, cand[sol.assign[i]].x], [c.y, cand[sol.assign[i]].y], css("--muted"), 1, null, 0.5));
      sol.set.forEach((j) => map.path([port.x, cand[j].x], [port.y, cand[j].y], css("--warm"), 1.6, [6, 4], 0.7));
      cust.forEach((c) => map.dot(c.x, c.y, 3 + Math.sqrt(c.d / 1000) * 1.4, css("--accent"), css("--surface")));
      cand.forEach((c, j) => { const on = sol.set.includes(j), s = on ? 16 : 10; g.fillStyle = on ? css("--ink") : css("--surface"); g.strokeStyle = on ? css("--surface") : css("--muted"); g.lineWidth = 2; g.fillRect(map.sx(c.x) - s / 2, map.sy(c.y) - s / 2, s, s); g.strokeRect(map.sx(c.x) - s / 2, map.sy(c.y) - s / 2, s, s); });
      g.fillStyle = css("--warm"); g.beginPath(); g.moveTo(map.sx(port.x), map.sy(port.y) - 10); g.lineTo(map.sx(port.x) + 9, map.sy(port.y) + 7); g.lineTo(map.sx(port.x) - 9, map.sy(port.y) + 7); g.closePath(); g.fill();
      const star = (p, col, hollow) => { g.save(); g.translate(map.sx(p.x), map.sy(p.y)); g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, a = (Math.PI / 5) * i - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); if (hollow) { g.strokeStyle = col; g.lineWidth = 2; g.stroke(); } else { g.fillStyle = col; g.fill(); } g.restore(); };
      star(cog, css("--violet"), false); star(gm, css("--violet"), true);

      // cost by k
      const ks = [1, 2, 3, 4, 5, 6], f = (key) => ks.map((kk) => best[kk][key]);
      pc.y = [0, Math.max(...f("tot")) * 1.08];
      pc.clear(); pc.axes({ xTicks: ks, xLabel: "number of DCs", yLabel: "cost / yr", yFormat: money, yCount: 4 });
      pc.path(ks, f("out"), css("--accent"), 2); pc.path(ks, f("inb"), css("--warm"), 2); pc.path(ks, f("fac"), css("--muted"), 2); pc.path(ks, f("inv"), css("--violet"), 2);
      pc.path(ks, f("tot"), css("--ink"), 2.8);
      const kb = ks.reduce((a, b) => (best[b].tot < best[a].tot ? b : a), 1);
      ks.forEach((kk) => pc.dot(kk, best[kk].tot, kk === k ? 7 : 4, kk === kb ? css("--good") : css("--ink"), css("--surface")));

      $("#ro").innerHTML = `
        <div class="ro"><b>Total cost / yr</b><span class="num">${money(sol.tot)}</span></div>
        <div class="ro"><b>Cheapest number</b><span class="pill ok">${kb} DC${kb > 1 ? "s" : ""}: ${money(best[kb].tot)}</span></div>
        <div class="ro"><b>Demand within ${P.rad} km</b><span class="pill ${sol.served / D > 0.9 ? "ok" : "warn"}">${(sol.served / D * 100).toFixed(0)}%</span></div>
        <div class="ro"><b>Avg delivery distance</b><span class="num">${Math.round(cust.reduce((s, c, i) => s + c.d * dist(c, cand[sol.assign[i]]), 0) / D)} km</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      $("#work").innerHTML = [
        `total demand = ${(D / 1000).toLocaleString()}k units/yr from ${cust.length} customers`,
        `centre of gravity = (${Math.round(cog.x)}, ${Math.round(cog.y)}) km → ${Math.round(ukm(cog) / D)} km average ${M("(filled star)")}`,
        `geometric median (Weiszfeld) = (${Math.round(gm.x)}, ${Math.round(gm.y)}) km → ${Math.round(ukm(gm) / D)} km average ${M("(hollow star: lower unit-km)")}`,
        `${k} DC${k > 1 ? "s" : ""}: checked ${combos(cand.length, k).length} site combinations, best = sites ${sol.set.map((j) => j + 1).join(", ")}`,
        `outbound ${money(sol.out)} + inbound ${money(sol.inb)} + facilities ${k} × ${money(P.fix)} = ${money(sol.fac)} + inventory ${money(P.ss)} × √${k} × ${Math.round(P.h * 100)}% = ${money(sol.inv)}`,
        `total = ${B(money(sol.tot))} ${M(`(cheapest: ${kb} DCs at ${money(best[kb].tot)})`)}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    makeMap();
    dragPoints(map, () => cust, () => draw(true));
    $("#k").addEventListener("input", () => { k = +$("#k").value; draw(false); });
    ["#out", "#inb", "#fix", "#ss", "#h", "#rad"].forEach((s) => $(s).addEventListener("input", () => draw(true)));
    $("#newm").addEventListener("click", () => { seed++; makeMap(); draw(true); });
    $("#bestk").addEventListener("click", () => { k = [1, 2, 3, 4, 5, 6].reduce((a, b) => (best[b].tot < best[a].tot ? b : a), 1); $("#k").value = k; draw(false); });
    draw(true);
    return watch([map.c, pc.c], (resized) => { if (resized) { map.resize(); pc.resize(); } draw(false); });
  },
});
