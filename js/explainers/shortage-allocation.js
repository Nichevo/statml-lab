Lab.register({
  id: "shortage-allocation",
  group: "Supply chain",
  title: "Shortage allocation: who gets the stock when there isn't enough?",
  blurb: "1,000 units, 1,600 ordered. Compare first-come-first-served, pro rata, priority tiers, allocation on forecast and allocating for profit. See what each does to margin, fairness and to customers who inflate their orders.",
  lede: "When supply falls short, someone has to decide who gets what. Each rule has a logic: first come first served rewards early orders, pro rata shares the pain, priority tiers protect key accounts, and allocating by value maximises this month's margin. But rules change behaviour. If customers learn that allocation follows orders, they order more than they need, and the shortage looks worse than it is. Allocating on forecast or past sales takes that incentive away.",
  quiz: [
    ["Supply is 1,000 and orders total 1,600. Under pro rata, what does a customer who ordered 400 get?", "400 × 1,000 / 1,600 = 250. Everyone gets the same 62.5% of their order."],
    ["Why does pro rata to orders encourage customers to inflate orders?", "Your share grows with your order. If others inflate and you don't, you get less. So everyone inflates, orders balloon, and the planner sees phantom demand: the bullwhip effect in action."],
    ["How does allocating on forecast or past sales stop that?", "Your share depends on something you can't inflate today. Ordering more doesn't get you more, so orders stay honest."],
    ["The max-profit rule gives everything to the highest-margin customers. Why might you not use it?", "It can cut smaller or lower-margin customers to zero, breaking contracts and relationships that matter for future months. Many firms set a minimum fill for everyone and then allocate the rest by value."],
    ["What's a simple fairness measure for an allocation?", "Jain's index on fill rates: (Σx)² / (n Σx²). It's 1 when everyone gets the same fill rate and falls towards 1/n as one customer takes everything."],
  ],
  diy: {
    intro: "Customers in rows 2–7: order in B, forecast in C, margin per unit in D, penalty per unit short in E, tier in F. Supply in H1.",
    steps: [
      ["Pro rata to orders.", "G2: =B2 * MIN(1, $H$1 / SUM($B$2:$B$7))"],
      ["Pro rata to forecast, capped at the order.", "=MIN(B2, C2 * $H$1 / SUM($C$2:$C$7))   (then share out any leftover the same way)"],
      ["Priority tiers: fill tier 1 in full, then share what's left across tier 2, and so on.", "tier left: =$H$1 - SUMIF($F$2:$F$7, \"<\"&F2, alloc)"],
      ["Allocate by value: sort by margin + penalty per unit, fill in that order until supply runs out.", "=MIN(B2, $H$1 - SUM(alloc of higher-value rows))"],
      ["Fill rate and Jain's fairness index.", "fill: =G2/B2   Jain: =SUM(fills)^2 / (COUNT(fills) * SUMSQ(fills))"],
    ],
  },
  deeper: [
    ["Lee, Padmanabhan & Whang (1997), Information distortion in a supply chain: the bullwhip effect, Management Science 43(4)", "https://doi.org/10.1287/mnsc.43.4.546", "rationing and shortage gaming as one of the four causes of bullwhip"],
    ["Cachon & Lariviere (1999), Capacity choice and allocation: strategic behavior and supply chain performance, Management Science 45(8)", "https://doi.org/10.1287/mnsc.45.8.1091", "why allocation rules that follow orders invite inflated orders, and which rules don't"],
    ["Jain, Chiu & Hawe (1984), A quantitative measure of fairness and discrimination for resource allocation in shared computer systems, DEC Research Report TR-301", "https://arxiv.org/abs/cs/9809099", "Jain's fairness index"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="14" height="50" stroke-dasharray="3 3" stroke-opacity=".6"/><rect x="30" y="18" width="14" height="40" stroke-dasharray="3 3" stroke-opacity=".6"/><rect x="52" y="14" width="14" height="44" stroke-dasharray="3 3" stroke-opacity=".6"/><rect x="74" y="28" width="14" height="30" stroke-dasharray="3 3" stroke-opacity=".6"/><rect x="8" y="30" width="14" height="28" fill="currentColor" fill-opacity=".35"/><rect x="30" y="34" width="14" height="24" fill="currentColor" fill-opacity=".35"/><rect x="52" y="32" width="14" height="26" fill="currentColor" fill-opacity=".35"/><rect x="74" y="40" width="14" height="18" fill="currentColor" fill-opacity=".35"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    // name, true need, margin/unit, penalty/unit short, tier, order sequence (1 = first), inflates?
    const CU = [["Key account", 400, 6, 4, 1, 3, false], ["Big-box retailer", 350, 5, 6, 1, 5, false], ["Online", 250, 9, 0, 2, 1, true], ["Wholesaler", 300, 3, 0, 3, 2, true], ["Independent stores", 150, 7, 0, 2, 4, false], ["Export", 150, 4, 2, 3, 6, false]];
    const RU = [["fcfs", "First come, first served"], ["pro", "Pro rata to orders"], ["fc", "Pro rata to forecast"], ["tier", "Priority tiers"], ["val", "Maximise value"], ["hyb", "Minimum fill, then value"]];
    let rule = "pro";
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("What each customer ordered, needs, and gets")}</div><canvas id="c1" style="height:280px" aria-label="Bars of order, real need and allocation per customer"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "Value vs fairness, every rule", 270, "Scatter of each rule's value against its fairness index"), fig("c3", "Fill rate by customer, every rule", 270, "Fill rate of each customer under each rule"))}
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4("Allocations side by side")}<div id="tbl"></div></div>`,
      panel: `
        <div class="ctrl"><label>Rule shown</label><div class="seg" id="rs" style="flex-wrap:wrap">${RU.map(([k, n]) => `<button type="button" data-r="${k}" aria-pressed="${k === rule}">${n}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="sup">Supply available <output id="supV"></output></label><input type="range" id="sup" min="300" max="1800" step="50" value="1000"></div>
        <div class="ctrl"><label for="inf">How much Online and Wholesaler inflate orders <output id="infV"></output></label><input type="range" id="inf" min="0" max="1" step="0.05" value="0"></div>
        <div class="ctrl"><label for="mf">Minimum fill for everyone (last rule) <output id="mfV"></output></label><input type="range" id="mf" min="0" max="0.8" step="0.05" value="0.4"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The rules</h2>
          <ul>
            <li><b>First come, first served</b>: fill orders in the order they arrived. Simple, but rewards whoever orders earliest, not whoever matters most.</li>
            <li><b>Pro rata to orders</b>: everyone gets the same share of what they ordered. Feels fair; invites inflated orders.</li>
            <li><b>Pro rata to forecast</b> (or to last year's sales): shares based on expected need, capped at the order. Ordering more doesn't help, so orders stay honest.</li>
            <li><b>Priority tiers</b>: fill tier 1 in full, then tier 2 pro rata, and so on. Protects contracts and key accounts.</li>
            <li><b>Maximise value</b>: fill in order of margin plus penalty avoided per unit. Best for this month's profit, as an LP with one constraint (see <a href="#linear-programming">linear programming</a>).</li>
            <li><b>Minimum fill, then value</b>: everyone gets at least a set share of their order, and the rest goes by value. A common compromise.</li>
          </ul>
        </section>
        <section>
          <h2>How value is counted here</h2>
          <p>Margin is earned only on what each customer really needed: stock given beyond real need sits unsold. Contract penalties are charged per unit of real need not met. Fairness is Jain's index on fill rates against orders. Shortage gaming is one of the four causes of the <a href="#bullwhip-effect">bullwhip effect</a>: inflated orders during a shortage vanish when supply recovers, leaving the supplier with excess capacity and the customers with excess stock.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>At the defaults, compare the scatter: maximise value earns the most, and pro rata is the fairest. Priority tiers and the minimum-fill rule sit in between.</li>
            <li>Raise inflation to 100%: under pro rata to orders, Online and Wholesaler grab extra stock they can't sell, and value falls. Pro rata to forecast doesn't move.</li>
            <li>Under first come, first served, Online and Wholesaler order first and are filled in full; the big-box retailer, ordering last, pays the contract penalties.</li>
            <li>With inflation back at 0, raise supply to 1,600: every rule fills everyone, and the choice stops mattering. With inflated orders, even 1,600 isn't enough on paper, and the rules still disagree.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ sup: +$("#sup").value, inf: +$("#inf").value, mf: +$("#mf").value });
    const custs = (p) => CU.map(([name, need, mg, pen, tier, seq, infl]) => ({ name, need, mg, pen, tier, seq, order: Math.round(need * (1 + (infl ? p.inf : 0))), fc: need }));
    function proRata(C, idx, supply, base) {
      // water-fill by base weights, capped at order
      const a = Object.fromEntries(idx.map((i) => [i, 0])); let left = supply, open = [...idx];
      for (let it = 0; it < 20 && left > 1e-9 && open.length; it++) { const w = open.reduce((s, i) => s + base(C[i]), 0); if (!w) break; let used = 0; const next = [];
        open.forEach((i) => { const want = C[i].order - a[i], give = Math.min(want, (left * base(C[i])) / w); a[i] += give; used += give; if (C[i].order - a[i] > 1e-9) next.push(i); }); left -= used; open = next; }
      return a;
    }
    function allocate(C, p, r) {
      const n = C.length, A = Array(n).fill(0), all = C.map((_, i) => i);
      if (r === "fcfs") { let left = p.sup; [...all].sort((a, b) => C[a].seq - C[b].seq).forEach((i) => { A[i] = Math.min(C[i].order, left); left -= A[i]; }); }
      else if (r === "pro") { const a = proRata(C, all, p.sup, (c) => c.order); all.forEach((i) => (A[i] = a[i])); }
      else if (r === "fc") { const a = proRata(C, all, p.sup, (c) => c.fc); all.forEach((i) => (A[i] = a[i])); }
      else if (r === "tier") { let left = p.sup; [1, 2, 3].forEach((t) => { const idx = all.filter((i) => C[i].tier === t), a = proRata(C, idx, left, (c) => c.order); idx.forEach((i) => { A[i] = a[i]; left -= a[i]; }); }); }
      else { let left = p.sup; if (r === "hyb") { const tot = C.reduce((s, c) => s + c.order, 0), f = Math.min(p.mf, p.sup / tot); all.forEach((i) => { A[i] = C[i].order * f; left -= A[i]; }); }
        [...all].sort((a, b) => C[b].mg + C[b].pen - (C[a].mg + C[a].pen)).forEach((i) => { const g = Math.min(C[i].order - A[i], left); A[i] += g; left -= g; }); }
      return A.map((v) => Math.round(v));
    }
    function score(C, A) {
      let val = 0, waste = 0; const fills = C.map((c, i) => A[i] / c.order);
      C.forEach((c, i) => { const sold = Math.min(A[i], c.need); val += c.mg * sold - c.pen * (c.need - sold); waste += A[i] - sold; });
      const jain = fills.reduce((s, v) => s + v, 0) ** 2 / (C.length * fills.reduce((s, v) => s + v * v, 0) || 1);
      return { val, waste, jain, fills, minFill: Math.min(...fills) };
    }
    let S;
    const C1 = new Plot($("#c1"), { pad: { l: 56, b: 52 } }), C2 = new Plot($("#c2"), { pad: { l: 64, b: 38 } }), C3 = new Plot($("#c3"), { pad: { l: 56, b: 52 } });
    const sw = (c, t, k) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">${k === "box" ? `<span style="width:12px;height:10px;background:var(${c});opacity:.8"></span>` : k === "dot" ? `<span style="width:8px;height:8px;border-radius:50%;background:var(${c})"></span>` : `<span style="width:12px;height:10px;border:1.5px ${k} var(${c})"></span>`}${t}</span>`;
    function d1(p) {
      const C = S.C, A = S.res[rule].A, top = Math.max(...C.map((c) => c.order)) * 1.22;
      C1.resize(); C1.x = [-0.5, C.length - 0.5]; C1.y = [0, top]; C1.clear(); C1.axes({ xTicks: C.map((_, i) => i), xFormat: (v) => (C[v] ? C[v].name.replace("Independent stores", "Independents").replace("Big-box retailer", "Big-box") : ""), yLabel: "units", yFormat: (v) => fmt(v, 0) });
      const g = C1.ctx, bw = (C1.sx(1) - C1.sx(0)) * 0.55;
      C.forEach((c, i) => { const x = C1.sx(i) - bw / 2; g.strokeStyle = css("--muted"); g.lineWidth = 1.5; g.strokeRect(x, C1.sy(c.order), bw, C1.sy(0) - C1.sy(c.order));
        const sold = Math.min(A[i], c.need); g.fillStyle = css("--accent"); g.globalAlpha = 0.8; g.fillRect(x + 3, C1.sy(sold), bw - 6, C1.sy(0) - C1.sy(sold)); g.fillStyle = css("--warm"); if (A[i] > c.need) g.fillRect(x + 3, C1.sy(A[i]), bw - 6, C1.sy(sold) - C1.sy(A[i])); g.globalAlpha = 1;
        g.strokeStyle = css("--ink"); g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x - 4, C1.sy(c.need)); g.lineTo(x + bw + 4, C1.sy(c.need)); g.stroke(); g.setLineDash([]);
        g.fillStyle = css("--ink"); g.font = `10px ${css("--font-mono")}`; g.textAlign = "center"; g.textBaseline = "bottom"; g.fillText(`${A[i]} (${fmt((A[i] / c.order) * 100, 0)}%)`, C1.sx(i), C1.sy(Math.max(c.order, A[i])) - 3); });
      const sc = S.res[rule];
      $("#c1Cap").innerHTML = `${sw("--muted", "ordered", "solid")}${sw("--accent", "allocated and sold", "box")}${sw("--warm", "allocated beyond real need", "box")}<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:20px;border-top:2px dashed var(--ink)"></span>real need</span><br>${RU.find((r) => r[0] === rule)[1]}: value $${fmt(sc.val, 0)}, ${sc.waste ? `${fmt(sc.waste, 0)} units sent beyond real need, ` : ""}lowest fill rate ${fmt(sc.minFill * 100, 0)}%.`;
    }
    function d2() {
      const pts = RU.map(([k, n]) => ({ k, n, ...S.res[k] })), vs = pts.map((q) => q.val), lo = Math.min(...vs), hi = Math.max(...vs), pad = Math.max(200, (hi - lo) * 0.15);
      C2.resize(); C2.x = [Math.max(0, Math.min(...pts.map((q) => q.jain)) - 0.08), 1.02]; C2.y = [lo - pad, hi + pad]; C2.clear(); C2.axes({ xLabel: "fairness (Jain's index on fill rates)", yLabel: "value $", xFormat: (v) => fmt(v, 2), yFormat: (v) => fmt(v, 0), xCount: 4 });
      const g = C2.ctx; g.font = `11px ${css("--font-body")}`; g.textBaseline = "middle";
      const placed = [];
      pts.forEach((q) => { const on = q.k === rule; C2.dot(q.jain, q.val, on ? 6 : 4.5, css(on ? "--accent" : "--muted"), css(on ? "--ink" : "--muted"));
        let x = C2.sx(q.jain), y = C2.sy(q.val), lab = q.n.replace("Pro rata to ", "Pro rata: ").replace("First come, first served", "FCFS").replace("Minimum fill, then value", "Min fill + value"), right = x < C2.w * 0.6;
        while (placed.some((pp) => Math.abs(pp - y) < 13)) y += 13; placed.push(y);
        g.fillStyle = css(on ? "--ink" : "--muted"); g.textAlign = right ? "left" : "right"; g.fillText(lab, x + (right ? 9 : -9), y); });
      $("#c2Cap").innerHTML = `Up is more value this month; right is fairer (1 = everyone gets the same share of their order). Rules in the top right would be ideal; usually you trade one for the other.`;
    }
    function d3() {
      const C = S.C, SH = ["Key", "Big-box", "Online", "Wholesale", "Indep.", "Export"]; C3.resize(); C3.x = [-0.5, C.length - 0.5]; C3.y = [0, 1.12]; C3.clear(); C3.axes({ xTicks: C.map((_, i) => i), xFormat: (v) => SH[v] || "", yLabel: "fill rate", yFormat: (v) => fmt(v * 100, 0) + "%" });
      const cols = ["--muted", "--violet", "--good", "--warm", "--bad", "--accent"], g = C3.ctx, bw = ((C3.sx(1) - C3.sx(0)) * 0.8) / RU.length;
      RU.forEach(([k], j) => S.res[k].fills.forEach((f, i) => { const x = C3.sx(i) - (bw * RU.length) / 2 + j * bw; g.fillStyle = css(cols[j]); g.globalAlpha = k === rule ? 0.95 : 0.45; g.fillRect(x, C3.sy(f), bw - 1, C3.sy(0) - C3.sy(f)); g.globalAlpha = 1; }));
      $("#c3Cap").innerHTML = RU.map(([k, n], j) => sw(cols[j], n.replace("Pro rata to ", "Pro rata: "), "box")).join("") + `<br>Solid bars: the rule shown above.`;
    }
    function tbl(p) {
      const C = S.C;
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);width:100%;min-width:760px"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 6px;text-align:left">customer</th><th style="padding:3px 6px">tier</th><th style="padding:3px 6px">margin + penalty</th><th style="padding:3px 6px">ordered</th><th style="padding:3px 6px">real need</th>${RU.map(([k, n]) => `<th style="padding:3px 6px;${k === rule ? "color:var(--ink)" : ""}">${n.replace("Pro rata to ", "Pro rata: ").replace("First come, first served", "FCFS").replace("Minimum fill, then value", "Min fill + value")}</th>`).join("")}</tr></thead><tbody>` +
        C.map((c, i) => `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 6px;text-align:left;font-family:var(--font-body);white-space:nowrap">${c.name}</td><td style="padding:3px 6px">${c.tier}</td><td style="padding:3px 6px">$${c.mg} + $${c.pen}</td><td style="padding:3px 6px">${c.order}</td><td style="padding:3px 6px;color:var(--muted)">${c.need}</td>${RU.map(([k]) => `<td style="padding:3px 6px;${k === rule ? "font-weight:600" : ""}">${S.res[k].A[i]}</td>`).join("")}</tr>`).join("") +
        `<tr style="text-align:right;border-top:2px solid var(--line)"><td style="padding:3px 6px;text-align:left;font-family:var(--font-body)">Value $</td><td></td><td></td><td></td><td></td>${RU.map(([k]) => `<td style="padding:3px 6px;font-weight:600">${fmt(S.res[k].val, 0)}</td>`).join("")}</tr>` +
        `<tr style="text-align:right"><td style="padding:3px 6px;text-align:left;font-family:var(--font-body)">Fairness</td><td></td><td></td><td></td><td></td>${RU.map(([k]) => `<td style="padding:3px 6px">${fmt(S.res[k].jain, 2)}</td>`).join("")}</tr></tbody></table>
        <p class="hint" style="margin:8px 0 0">Worked, pro rata to orders: each customer gets order × ${p.sup} / ${C.reduce((s, c) => s + c.order, 0)} = ${fmt(Math.min(1, p.sup / C.reduce((s, c) => s + c.order, 0)) * 100, 1)}% of their order. Value = Σ margin × min(allocated, need) − Σ penalty × unmet need.</p>`;
    }
    function readouts(p) {
      const C = S.C, ord = C.reduce((s, c) => s + c.order, 0), need = C.reduce((s, c) => s + c.need, 0), sc = S.res[rule];
      $("#ro").innerHTML = [["Ordered / real need", `${ord} / ${need}`], ["Supply covers", `${fmt(Math.min(1, p.sup / ord) * 100, 0)}% of orders`], ["Value this month", `$${fmt(sc.val, 0)}`], ["Fairness (Jain)", fmt(sc.jain, 2)]].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function labels(p) { $("#supV").textContent = p.sup; $("#infV").textContent = "+" + fmt(p.inf * 100, 0) + "%"; $("#mfV").textContent = fmt(p.mf * 100, 0) + "%"; }
    function draw() { const p = P(); labels(p); const C = custs(p); S = { C, res: Object.fromEntries(RU.map(([k]) => { const A = allocate(C, p, k); return [k, { A, ...score(C, A) }]; })) }; d1(p); d2(); d3(); tbl(p); readouts(p); }
    ["sup", "inf", "mf"].forEach((id) => $("#" + id).addEventListener("input", draw));
    $("#rs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; rule = b.dataset.r; $("#rs").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); rule = "pro"; $("#rs").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.r === rule)); draw(); });
    draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
