Lab.register({
  id: "plant-shutdown",
  group: "Supply chain",
  title: "Plant shutdowns: building stock ahead",
  blurb: "A factory closes for three weeks of maintenance but customers keep buying. Compare a late build, overtime, a level plan, splitting the shutdown and co-packing.",
  lede: "Plants close for maintenance, holidays or upgrades, but demand doesn't stop. Everything customers buy during the shutdown has to be made beforehand and stored, so stock climbs to a peak just as the plant closes. How high that peak goes, how long you carry it, and what it costs depends on how much spare capacity you have and when you start building. The usual options are to build late at full capacity, add overtime, spread the build over the year, split the shutdown, or pay someone else to make some of it.",
  quiz: [
    ["Demand is 1,000 a week and the plant makes 1,150 a week. How many weeks of pre-build does a 3-week shutdown need?", "3,000 units must be in stock when the plant closes. Spare capacity is 150 a week, so 3,000 ÷ 150 = 20 weeks of building at full rate. Spare capacity, not the shutdown length, drives the build time."],
    ["Why does overtime reduce carrying cost?", "More spare capacity per week means the build can start later, so the same stock is held for fewer weeks. You trade an overtime premium for lower carrying cost (and less shelf-life risk)."],
    ["Why does a level plan usually carry the most stock?", "It produces the same amount every open week, so stock builds slowly all year, not just before the shutdown. It's simplest for the plant, but the average stock is highest."],
    ["What else limits a pre-build besides cost?", "Shelf life (stock built early may expire), warehouse space at the peak, cash, and the risk the forecast is wrong. Building the wrong mix ahead of a shutdown is a classic problem."],
  ],
  diy: {
    intro: "Weekly demand in B2:B53, weekly capacity in C2:C53 (0 in shutdown weeks).",
    steps: [
      ["Stock needed at the end of each week to cover later shortfalls: work backwards from the last week.", "D53: 0\nD52: =MAX(0,D53+B53-C53)   (fill upwards)"],
      ["Late build production.", "E2: =B2+D2-D1   (D1 = opening stock)"],
      ["Level build: spread the pre-build over the k weeks before the shutdown.", "=B2+total_prebuild/k"],
      ["Peak stock and holding cost.", "=MAX(D2:D53)\n=SUM(D2:D53)*unit_value*carry_rate/52"],
      ["Check feasibility: production never above capacity.", "=SUMPRODUCT(--(E2:E53>C2:C53))"],
    ],
  },
  deeper: [
    ["Sales and operations planning — Wikipedia", "https://en.wikipedia.org/wiki/Sales_and_operations_planning", "where build-ahead plans get agreed"],
    ["Contract manufacturer — Wikipedia", "https://en.wikipedia.org/wiki/Contract_manufacturer", "co-packers and toll manufacturing"],
    ["Turnaround (refining) — Wikipedia", "https://en.wikipedia.org/wiki/Turnaround_(refining)", "planned shutdowns in process industries"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 54 L40 54 L58 16 L58 54 L90 54" /><rect x="58" y="10" width="14" height="44" fill="currentColor" fill-opacity=".15" stroke="none"/><path d="M6 40 C 30 40, 46 30, 58 16" opacity=".4"/></svg>`,

  mount(root) {
    const { Plot, watch, css, rng } = Lab;
    const money = (v) => (v < 0 ? "−" : "") + "$" + Math.round(Math.abs(v)).toLocaleString("en-US");
    const W = 52;
    const STRATS = [
      ["late", "Late build", "--accent"],
      ["ot", "Late build + overtime", "--violet"],
      ["level", "Level all year", "--warm"],
      ["split", "Split shutdown", "--good"],
      ["copack", "Co-pack part of it", "--bad"],
    ];
    let pick = "late";

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="sdi" aria-label="Stock on hand through the year for each strategy"></canvas>
          <div class="legend" id="leg"></div>
          <figcaption>Stock on hand each week. Shaded weeks: plant closed. The selected strategy is drawn bold.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="sdp" aria-label="Weekly production for the selected strategy against demand and capacity"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>Production (selected)</span><span><i style="background:var(--ink)"></i>Demand</span><span><i style="background:var(--muted)"></i>Regular capacity</span></div>
          <figcaption>What the plant makes each week under the selected strategy.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Comparing the strategies</h4>
          <div class="seg" id="pick" style="margin-bottom:10px">${STRATS.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${k === pick}">${l}</button>`).join("")}</div>
          <div style="overflow-x:auto"><table id="cmp" style="width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="start">Shutdown starts in week <output id="startV"></output></label><input type="range" id="start" min="2" max="50" step="1" value="28"></div>
        <div class="ctrl"><label for="len">Shutdown length <output id="lenV"></output></label><input type="range" id="len" min="1" max="8" step="1" value="3"></div>
        <div class="ctrl"><label for="mu">Average weekly demand <output id="muV"></output></label><input type="range" id="mu" min="200" max="2000" step="50" value="1000"></div>
        <div class="ctrl"><label for="seas">Seasonality <output id="seasV"></output></label><input type="range" id="seas" min="0" max="40" step="5" value="10"></div>
        <div class="ctrl"><label for="cap">Regular capacity / week <output id="capV"></output></label><input type="range" id="cap" min="500" max="3000" step="25" value="1250"></div>
        <div class="ctrl"><label for="ot">Overtime: extra capacity <output id="otV"></output></label><input type="range" id="ot" min="0" max="40" step="5" value="15"></div>
        <div class="ctrl"><label for="otc">Overtime premium / unit <output id="otcV"></output></label><input type="range" id="otc" min="0" max="10" step="0.25" value="1.5"></div>
        <div class="ctrl"><label for="cp">Co-packer covers (of shutdown demand) <output id="cpV"></output></label><input type="range" id="cp" min="0" max="100" step="10" value="50"></div>
        <div class="ctrl"><label for="cpc">Co-pack premium / unit <output id="cpcV"></output></label><input type="range" id="cpc" min="0" max="10" step="0.25" value="2.5"></div>
        <div class="ctrl"><label for="val">Unit cost <output id="valV"></output></label><input type="range" id="val" min="1" max="100" step="1" value="20"></div>
        <div class="ctrl"><label for="h">Carrying cost rate <output id="hV"></output></label><input type="range" id="h" min="5" max="40" step="1" value="25"></div>
        <div class="ctrl"><label for="ss">Safety stock (weeks of demand) <output id="ssV"></output></label><input type="range" id="ss" min="0" max="4" step="0.5" value="1"></div>
        <div class="readouts" id="ro"></div>`,
      notes: `
        <section>
          <h2>The late build (backward scheduling)</h2>
          <p>Work backwards from the end of the shutdown. Each week, the stock you need at the end of week t is whatever next week can't make for itself:</p>
          <div class="eq">need(t) = max(0, need(t+1) + demand(t+1) − capacity(t+1))<br>production(t) = demand(t) + need(t) − need(t−1)</div>
          <p>Capacity is zero in shutdown weeks. This gives the least stock possible at that capacity. The plan wraps around the year so week 52 leads into week 1.</p>
        </section>
        <section>
          <h2>The other options</h2>
          <ul>
            <li><b>Overtime</b> raises capacity, so the build starts later and stock is held for less time. You pay a premium on units above regular capacity.</li>
            <li><b>Level</b> makes the same amount every open week: simple and steady for the plant, but stock builds all year.</li>
            <li><b>Split</b> takes two shutdowns of half the length, half a year apart. Each pre-build is half the size, and stock is held for about a quarter of the unit-weeks.</li>
            <li><b>Co-pack</b>: an outside manufacturer supplies part of the shutdown demand at a premium, shrinking the pre-build.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Lower capacity to 1,100. Spare capacity is only 100 a week, so the late build starts months earlier.</li>
            <li>Lower capacity below demand plus what the shutdown needs. Some plans become infeasible: there isn't enough capacity in the year.</li>
            <li>Lower the overtime premium to $0.50. Now overtime beats the plain late build: the carrying cost it saves is worth more than the premium.</li>
            <li>Move the shutdown to the seasonal peak (week 13) and then to the trough (week 39). Shutting down in the trough needs much less pre-build.</li>
          </ol>
          <p>Related: <a href="#level-vs-chase">level vs chase</a>, <a href="#carrying-cost">carrying cost</a>, <a href="#frozen-zones">frozen zones</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    $("#leg").innerHTML = STRATS.map(([, l, c]) => `<span><i style="background:var(${c})"></i>${l}</span>`).join("");
    const pI = new Plot($("#sdi"), { x: [1, W], pad: { l: 60 } });
    const pP = new Plot($("#sdp"), { x: [0.5, W + 0.5], pad: { l: 60 } });

    function lateBuild(d, c) {
      const need = new Array(W).fill(0);
      for (let lap = 0; lap < 4; lap++) for (let t = W - 1; t >= 0; t--) { const n = (t + 1) % W; need[t] = Math.max(0, need[n] + d[n] - c[n]); }
      const p = d.map((v, t) => v + need[t] - need[(t + W - 1) % W]);
      return { p, inv: need };
    }

    function draw() {
      const P = { start: +$("#start").value, len: +$("#len").value, mu: +$("#mu").value, seas: +$("#seas").value / 100, cap: +$("#cap").value, ot: +$("#ot").value / 100, otc: +$("#otc").value, cp: +$("#cp").value / 100, cpc: +$("#cpc").value, val: +$("#val").value, h: +$("#h").value / 100, ss: +$("#ss").value };
      P.start = Math.min(P.start, W - P.len + 1); $("#start").value = P.start;
      $("#startV").textContent = P.start; $("#lenV").textContent = P.len + " wk"; $("#muV").textContent = P.mu; $("#seasV").textContent = "±" + Math.round(P.seas * 100) + "%";
      $("#capV").textContent = P.cap; $("#otV").textContent = "+" + Math.round(P.ot * 100) + "%"; $("#otcV").textContent = "$" + P.otc.toFixed(2); $("#cpV").textContent = Math.round(P.cp * 100) + "%";
      $("#cpcV").textContent = "$" + P.cpc.toFixed(2); $("#valV").textContent = "$" + P.val; $("#hV").textContent = Math.round(P.h * 100) + "%"; $("#ssV").textContent = P.ss + " wk";

      const d = Array.from({ length: W }, (_, t) => Math.round(P.mu * (1 + P.seas * Math.cos((2 * Math.PI * (t - 12)) / W))));
      const closed = (t, split) => {
        const w = t + 1;
        if (!split) return w >= P.start && w < P.start + P.len;
        const a = Math.ceil(P.len / 2), b = P.len - a, s2 = ((P.start - 1 + 26) % W) + 1;
        return (w >= P.start && w < P.start + a) || (b > 0 && w >= s2 && w < s2 + b);
      };
      const capArr = (mult, split) => d.map((_, t) => (closed(t, split) ? 0 : P.cap * mult));
      const SS = P.ss * P.mu, hw = (P.h / 52) * P.val;

      const res = {};
      const finish = (key, p, inv, extra = {}) => {
        const feasible = p.every((v, t) => v <= (closed(t, key === "split") ? 0 : P.cap * (key === "ot" || key === "level" ? 1 + P.ot : 1)) + 0.5) && extra.ok !== false;
        const otUnits = p.reduce((s, v) => s + Math.max(0, v - P.cap), 0);
        const invS = inv.map((v) => v + SS), avg = invS.reduce((s, v) => s + v, 0) / W;
        res[key] = { p, inv: invS, peak: Math.max(...invS), avg, carry: avg * P.val * P.h, otCost: otUnits * P.otc, cpCost: extra.cpUnits ? extra.cpUnits * P.cpc : 0, feasible, ...extra };
        res[key].total = res[key].carry + res[key].otCost + res[key].cpCost;
      };
      const totD = d.reduce((s, v) => s + v, 0);
      const okCap = (c) => c.reduce((s, v) => s + v, 0) >= totD;

      let c = capArr(1, false), r = lateBuild(d, c); finish("late", r.p, r.inv, { ok: okCap(c) });
      c = capArr(1 + P.ot, false); r = lateBuild(d, c); finish("ot", r.p, r.inv, { ok: okCap(c) });
      const open = d.filter((_, t) => !closed(t, false)).length, rate = totD / open;
      const pl = d.map((_, t) => (closed(t, false) ? 0 : rate)); let s = 0; const raw = d.map((v, t) => (s += pl[t] - v)); const mn = Math.min(...raw);
      finish("level", pl, raw.map((v) => v - mn), { ok: rate <= P.cap * (1 + P.ot) });
      c = capArr(1, true); r = lateBuild(d, c); finish("split", r.p, r.inv, { ok: okCap(c) });
      const cpUnits = d.reduce((acc, v, t) => acc + (closed(t, false) ? v * P.cp : 0), 0);
      const d2 = d.map((v, t) => (closed(t, false) ? v * (1 - P.cp) : v));
      c = capArr(1, false); r = lateBuild(d2, c); finish("copack", r.p, r.inv, { cpUnits, ok: c.reduce((a, v) => a + v, 0) >= d2.reduce((a, v) => a + v, 0) });

      // inventory chart
      const all = Object.values(res).flatMap((x) => x.inv), ts = d.map((_, t) => t + 1);
      pI.y = [0, Math.max(...all) * 1.08];
      pI.clear();
      const g = pI.ctx; g.fillStyle = css("--muted"); g.globalAlpha = 0.14;
      ts.forEach((w, t) => { if (closed(t, pick === "split")) g.fillRect(pI.sx(w - 0.5), pI.pad.t, pI.sx(w + 0.5) - pI.sx(w - 0.5), pI.ih); });
      g.globalAlpha = 1;
      pI.axes({ xLabel: "week", xTicks: [1, 13, 26, 39, 52], yLabel: "stock on hand", yCount: 4 });
      STRATS.forEach(([k, , col]) => { if (k !== pick) pI.path(ts, res[k].inv, css(col), 1.4, null, 0.45); });
      const sc = STRATS.find((x) => x[0] === pick)[2];
      pI.path(ts, res[pick].inv, css(sc), 3);

      // production chart
      const sel = res[pick];
      pP.y = [0, Math.max(P.cap * (1 + P.ot), ...d, ...sel.p) * 1.1];
      pP.clear(); pP.axes({ xLabel: "week", xTicks: [1, 13, 26, 39, 52], yCount: 3 });
      const g2 = pP.ctx; g2.fillStyle = css(sc); g2.globalAlpha = 0.6;
      sel.p.forEach((v, t) => { const x0 = pP.sx(t + 0.6), x1 = pP.sx(t + 1.4); g2.fillRect(x0, pP.sy(v), x1 - x0, pP.sy(0) - pP.sy(v)); });
      g2.globalAlpha = 1;
      pP.path([0.5, W + 0.5], [P.cap, P.cap], css("--muted"), 1.5, [5, 4]);
      pP.path(ts, d, css("--ink"), 2);

      const th = (t) => `<th style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500;white-space:nowrap">${t}</th>`;
      const td = (v, st = "") => `<td style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono);white-space:nowrap;${st}">${v}</td>`;
      const best = STRATS.map(([k]) => k).filter((k) => res[k].feasible).reduce((a, k) => (!a || res[k].total < res[a].total ? k : a), null);
      $("#cmp").innerHTML = `<tr><th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500">Strategy</th>${th("Peak stock")}${th("Average stock")}${th("Carrying / yr")}${th("Overtime")}${th("Co-pack")}${th("Total / yr")}</tr>` + STRATS.map(([k, l, col]) => {
        const x = res[k], hl = k === pick ? "background:var(--accent-soft);" : "";
        return `<tr style="${hl}"><td style="padding:5px 8px;border-bottom:1px solid var(--line);white-space:nowrap"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(${col});margin-right:6px"></i>${l}</td>${td(Math.round(x.peak).toLocaleString())}${td(Math.round(x.avg).toLocaleString())}${td(money(x.carry))}${td(money(x.otCost))}${td(money(x.cpCost))}${td(x.feasible ? money(x.total) : "not enough capacity", x.feasible ? (k === best ? "color:var(--good);font-weight:700" : "") : "color:var(--bad)")}</tr>`;
      }).join("");

      const late = res.late; let fb = P.start - 2; while (fb > 0 && late.inv[fb - 1] > SS + 0.5) fb--; const firstBuild = late.inv[P.start - 2] > SS + 0.5 ? fb : -1;
      const spare = P.cap - P.mu, shutD = d.reduce((a, v, t) => a + (closed(t, false) ? v : 0), 0);
      $("#ro").innerHTML = `
        <div class="ro"><b>Demand during shutdown</b><span class="num">${Math.round(shutD).toLocaleString()}</span></div>
        <div class="ro"><b>Spare capacity / week</b><span class="num">${spare}</span></div>
        <div class="ro"><b>Weeks of build (late)</b><span class="num">${spare > 0 ? Math.ceil(shutD / spare) : "∞"}</span></div>
        <div class="ro"><b>Cheapest feasible</b><span class="pill ${best ? "ok" : "bad"}">${best ? STRATS.find((x) => x[0] === best)[1] : "none"}</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      $("#work").innerHTML = [
        `demand in weeks ${P.start}–${P.start + P.len - 1} = ${B(Math.round(shutD).toLocaleString())} units must be in stock by week ${P.start - 1}`,
        `spare capacity ≈ ${P.cap} − ${P.mu} = ${spare}/wk → about ${spare > 0 ? Math.ceil(shutD / spare) : "∞"} weeks of building ${M("(seasonality shifts this a little)")}`,
        firstBuild >= 0 ? `late build starts in week ${firstBuild + 1}; peak stock ${Math.round(late.peak).toLocaleString()} (incl. safety stock ${Math.round(SS).toLocaleString()})` : `late build: no pre-build needed`,
        `average stock ${Math.round(sel.avg).toLocaleString()} × $${P.val} × ${Math.round(P.h * 100)}% = ${B(money(sel.carry))}/yr ${M(`(${STRATS.find((x) => x[0] === pick)[1]})`)}`,
        pick === "ot" ? `overtime units ${Math.round(sel.otCost / Math.max(P.otc, 1e-9)).toLocaleString()} × $${P.otc.toFixed(2)} = ${money(sel.otCost)}` : pick === "copack" ? `co-pack ${Math.round(sel.cpUnits).toLocaleString()} units × $${P.cpc.toFixed(2)} = ${money(sel.cpCost)}` : pick === "level" ? `level rate = ${Math.round(totD).toLocaleString()} ÷ ${open} open weeks = ${Math.round(rate)}/wk` : pick === "split" ? `two shutdowns of ${Math.ceil(P.len / 2)} and ${P.len - Math.ceil(P.len / 2)} weeks, 26 weeks apart` : `no extra costs beyond carrying`,
        `total for this strategy = ${B(sel.feasible ? money(sel.total) : "infeasible")}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    root.querySelectorAll("input").forEach((i) => i.addEventListener("input", draw));
    $("#pick").addEventListener("click", (e) => { const v = e.target.closest("button")?.dataset.v; if (!v) return; pick = v; $("#pick").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === v)); draw(); });
    draw();
    return watch([pI.c, pP.c], (resized) => { if (resized) { pI.resize(); pP.resize(); } draw(); });
  },
});
