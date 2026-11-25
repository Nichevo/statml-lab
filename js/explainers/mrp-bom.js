Lab.register({
  id: "mrp-bom",
  group: "Supply chain",
  title: "MRP: from one forecast to every part order",
  blurb: "A plan to ship gift packs becomes orders for tubes, labels, soap, cartons and cream base. Follow the bill of materials down, offset each order by its lead time, apply order rules, and see where the plan is already late.",
  lede: "Material requirements planning (MRP) answers: given what we plan to make, what do we need to buy or make, how much and when? It explodes the master schedule through the bill of materials (what each item is made of), nets off stock already on hand or on order, rounds to order rules, and moves each order earlier by its lead time. The result is a time-phased list of orders, and a list of exceptions where an order should already have been placed.",
  quiz: [
    ["A gift pack needs 2 soap bars. 100 gift packs are planned for release in week 5 and soap has a 2-week lead time. When must soap be ordered, and how many (ignoring stock)?", "200 bars, released in week 3 so they arrive for week 5."],
    ["What's the difference between gross and net requirements?", "Gross is everything the parents need in that week. Net is what's left after using projected stock on hand and scheduled receipts (and keeping safety stock). You only order the net."],
    ["Labels go on both the gift pack and the cream tube. Why does MRP plan labels only after both parents?", "Because labels' gross requirements are the sum of both parents' planned orders. MRP processes items by their lowest level in any bill of materials (the low-level code) so every parent is planned before the shared part."],
    ["What is the cumulative lead time, and why does it matter?", "The longest chain of lead times from buying the first part to finishing the product. Changes to the plan inside that window can't be fully supplied without expediting, which is why plans are frozen near-term."],
    ["Why can a small change in the gift pack plan cause big swings in the empty tube orders?", "Lot-size rules (minimum orders, multiples) turn smooth requirements into lumps, and each level adds its own rounding. A small change can push a requirement over a threshold and move a whole order. This is MRP nervousness."],
  ],
  diy: {
    intro: "One block per item, columns for weeks 1–10. Row 1 gross requirements, row 2 scheduled receipts, row 3 projected on hand (start in the column before week 1), row 4 net requirements, row 5 planned receipts, row 6 planned releases. Lead time L and safety stock SS in named cells.",
    steps: [
      ["Gross requirements of the top item = the master schedule. For a component, sum each parent's planned releases × quantity per.", "C1: =MPS!C1   (component) =Parent1!C6*1 + Parent2!C6*1"],
      ["Net requirement: how far stock would fall below safety stock.", "C4: =MAX(0, SS - (B3 + C2 - C1))"],
      ["Planned receipt with a lot rule: lot-for-lot, a minimum order, or round up to a multiple.", "L4L: =C4   minimum: =IF(C4>0, MAX(C4, MOQ), 0)   multiple: =CEILING(C4, M)"],
      ["Projected on hand after receipts.", "C3: =B3 + C2 - C1 + C5"],
      ["Planned release = planned receipt moved earlier by the lead time.", "C6: =IFERROR(OFFSET(C5, -1, L), 0)   (anything that would fall before week 1 is past due)"],
    ],
  },
  deeper: [
    ["Material requirements planning — Wikipedia", "https://en.wikipedia.org/wiki/Material_requirements_planning", "history, inputs, outputs and problems"],
    ["Bill of materials — Wikipedia", "https://en.wikipedia.org/wiki/Bill_of_materials", "single-level, multi-level and the different BOMs a business keeps"],
    ["Blackburn, Kropp & Millen (1986), A comparison of strategies to dampen nervousness in MRP systems, Management Science 32(4)", "https://doi.org/10.1287/mnsc.32.4.413", "why MRP plans keep changing, and freezing, time fences and safety stock as remedies"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="36" y="4" width="24" height="12" rx="2"/><rect x="8" y="26" width="22" height="12" rx="2"/><rect x="38" y="26" width="20" height="12" rx="2"/><rect x="66" y="26" width="22" height="12" rx="2"/><rect x="24" y="48" width="18" height="12" rx="2"/><rect x="54" y="48" width="18" height="12" rx="2"/><path d="M48 16 V22 M19 22 H77 M19 22 V26 M48 22 V26 M77 22 V26 M48 38 V44 M33 44 H63 M33 44 V48 M63 44 V48"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const W = 10, MPS0 = [60, 60, 80, 80, 100, 60, 60, 120, 80, 80];
    // id, name, unit, make/buy, lead time, on hand, safety stock, rule, lot size, scheduled receipts {week: qty}, decimals
    const ITEMS0 = [
      ["GP", "Gift pack", "packs", "make", 1, 70, 0, "l4l", 0, {}, 0],
      ["CT", "Cream tube", "tubes", "make", 1, 60, 0, "l4l", 0, {}, 0],
      ["SB", "Soap bar", "bars", "buy", 2, 150, 0, "foq", 200, { 1: 200 }, 0],
      ["CA", "Carton", "cartons", "buy", 3, 100, 0, "moq", 250, { 2: 250 }, 0],
      ["CB", "Cream base", "kg", "buy", 2, 12, 0, "mult", 10, {}, 1],
      ["ET", "Empty tube", "tubes", "buy", 4, 300, 0, "moq", 500, {}, 0],
      ["LB", "Label", "labels", "buy", 2, 200, 0, "mult", 500, { 2: 500 }, 0],
    ];
    // parent, child, quantity per
    const BOM = [["GP", "CT", 1], ["GP", "SB", 2], ["GP", "CA", 1], ["GP", "LB", 1], ["CT", "CB", 0.05], ["CT", "ET", 1], ["CT", "LB", 1]];
    const RULES = [["l4l", "Lot-for-lot"], ["moq", "Minimum order"], ["foq", "Fixed quantity"], ["mult", "Multiple of"]];
    let items, mps, sel = "ET";
    const reset = () => { items = Object.fromEntries(ITEMS0.map(([id, name, unit, mb, lt, oh, ss, rule, lot, sr, dp]) => [id, { id, name, unit, mb, lt, oh, ss, rule, lot, sr: { ...sr }, dp }])); mps = [...MPS0]; };
    reset();
    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(fig("c1", "Bill of materials (tap an item)", 250, "Bill of materials tree for the gift pack"), fig("c2", "Lead-time chain for one gift pack due in week 10", 250, "Gantt chart of back-scheduled orders for each item"))}
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4("Master schedule: gift packs to finish each week (edit)")}<div id="mpsRow" style="display:grid;grid-template-columns:repeat(${W},minmax(46px,1fr));gap:4px;min-width:${W * 50}px"></div></div>
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4("MRP record")}<div id="tbl"></div></div>
        <figure class="plot wide" style="margin:14px 0 0"><div style="padding:4px 6px 0">${h4("Planned order releases, every item")}</div><canvas id="c3" style="height:250px" aria-label="Grid of planned order releases by item and week"></canvas><figcaption id="c3Cap"></figcaption></figure>`,
      panel: `
        <div class="ctrl"><label>Item</label><div class="seg" id="is" style="flex-wrap:wrap">${ITEMS0.map(([id, n]) => `<button type="button" data-i="${id}" aria-pressed="${id === sel}">${n}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="lt">Lead time (weeks) <output id="ltV"></output></label><input type="range" id="lt" min="0" max="6" step="1"></div>
        <div class="ctrl"><label for="oh">Stock on hand now <output id="ohV"></output></label><input type="range" id="oh" min="0" max="600" step="10"></div>
        <div class="ctrl"><label for="ss">Safety stock <output id="ssV"></output></label><input type="range" id="ss" min="0" max="300" step="10"></div>
        <div class="ctrl"><label>Order rule</label><div class="seg" id="rs" style="flex-wrap:wrap">${RULES.map(([k, n]) => `<button type="button" data-r="${k}">${n}</button>`).join("")}</div></div>
        <div class="ctrl" id="lotC"><label for="lot">Lot size <output id="lotV"></output></label><input type="range" id="lot" min="0" max="1000" step="10"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset everything</button></div>`,
      notes: `
        <section>
          <h2>The MRP record, row by row</h2>
          <ol>
            <li><b>Gross requirements</b>: for the gift pack, the master schedule; for a part, every parent's planned releases times the quantity per.</li>
            <li><b>Scheduled receipts</b>: orders already placed and due in.</li>
            <li><b>Projected on hand</b>: last week's stock + receipts − gross requirements.</li>
            <li><b>Net requirements</b>: how much stock would fall below safety stock.</li>
            <li><b>Planned receipts</b>: the net requirement rounded by the order rule.</li>
            <li><b>Planned releases</b>: the same orders moved earlier by the lead time. These become the parents' demand for the next level down.</li>
          </ol>
          <p>Items are planned top-down in order of their lowest level in the bill (the low-level code), so a shared part like the label is planned once, after both of its parents.</p>
        </section>
        <section>
          <h2>Where MRP struggles</h2>
          <ul>
            <li><b>Past-due orders.</b> If a release falls before this week, the plan is already late: expedite, or move the master schedule. The exceptions list shows them.</li>
            <li><b>Nervousness.</b> Order rules turn smooth demand into lumps, and each level adds its own. A small schedule change can move or cancel big part orders. <a href="#frozen-zones">Frozen zones</a> and lot-for-lot near-term help.</li>
            <li><b>Fixed lead times.</b> MRP assumes lead times are fixed and capacity is unlimited. Real suppliers vary (see <a href="#inventory-simulation">inventory simulation</a>), and plants fill up.</li>
            <li><b>Garbage in.</b> Wrong stock records or a wrong bill flows straight into wrong orders for every part.</li>
          </ul>
          <p>Choosing lot sizes well is its own problem: see <a href="#lot-sizing">lot sizing</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Pick the empty tube: with a 4-week lead time and only 300 on hand, MRP shows a past-due order. Lower its lead time or raise stock and the exception clears.</li>
            <li>Change week 3 of the master schedule from 80 to 120 and watch which parts' orders move, and by how much.</li>
            <li>Switch the carton from minimum order 250 to lot-for-lot: orders become smaller and more frequent, and its stock at the end of week 10 drops.</li>
            <li>Raise the gift pack's lead time to 3: the lead-time chain gets longer and more orders fall into the past.</li>
          </ul>
        </section>`,
    });
    // low-level codes
    const llc = {}; ITEMS0.forEach(([id]) => (llc[id] = 0));
    for (let k = 0; k < 5; k++) BOM.forEach(([p, c]) => (llc[c] = Math.max(llc[c], llc[p] + 1)));
    const order = ITEMS0.map(([id]) => id).sort((a, b) => llc[a] - llc[b]);
    function lotOf(it, net) {
      if (net <= 1e-9) return 0;
      if (it.rule === "moq") return Math.max(net, it.lot);
      if (it.rule === "foq") return it.lot > 0 ? Math.ceil(net / it.lot) * it.lot : net;
      if (it.rule === "mult") return it.lot > 0 ? Math.ceil(net / it.lot - 1e-9) * it.lot : net;
      return net;
    }
    function plan() {
      const R = {};
      order.forEach((id) => {
        const it = items[id], gr = Array(W).fill(0);
        if (id === "GP") mps.forEach((v, t) => (gr[t] = v));
        BOM.filter(([, c]) => c === id).forEach(([p, , q]) => R[p].rel.forEach((v, t) => (gr[t] += v * q)));
        const pastIn = BOM.filter(([, c]) => c === id).reduce((s, [p, , q]) => s + R[p].pastDue * q, 0);
        const sr = Array.from({ length: W }, (_, t) => it.sr[t + 1] || 0), poh = [], net = [], rec = Array(W).fill(0), rel = Array(W).fill(0); let past = 0, oh = it.oh - pastIn;
        for (let t = 0; t < W; t++) {
          let x = oh + sr[t] - gr[t], n = 0;
          if (x < it.ss) { n = it.ss - x; rec[t] = lotOf(it, n); x += rec[t]; const r = t - it.lt; if (r >= 0) rel[r] += rec[t]; else past += rec[t]; }
          net.push(n); poh.push(x); oh = x;
        }
        R[id] = { gr, sr, poh, net, rec, rel, pastDue: past, pastIn };
      });
      return R;
    }
    const C1 = new Plot($("#c1"), { pad: { l: 6, r: 6, t: 6, b: 6 } }), C2 = new Plot($("#c2"), { pad: { l: 92, b: 38 } }), C3 = new Plot($("#c3"), { pad: { l: 92, b: 30, t: 22 } });
    let boxes = [], R;
    function d1() {
      C1.resize(); C1.clear(); const g = C1.ctx, w = C1.w, h = C1.h, bw = Math.min(118, (w - 24) / 3), bh = 40;
      const pos = { GP: [w / 2, 28], CT: [w / 6 + 4, 118], SB: [w / 2, 118], CA: [(5 * w) / 6 - 4, 118], CB: [w / 6 + 4, 208], ET: [w / 2, 208], LB: [(5 * w) / 6 - 4, 208] };
      g.lineWidth = 1.3; g.font = `10px ${css("--font-mono")}`; g.textAlign = "center"; g.textBaseline = "middle";
      BOM.forEach(([p, c, q]) => { const [x1, y1] = pos[p], [x2, y2] = pos[c]; g.strokeStyle = css("--muted"); g.setLineDash(p === "GP" && c === "LB" ? [4, 3] : []); g.beginPath(); g.moveTo(x1, y1 + bh / 2); g.lineTo(x2, y2 - bh / 2); g.stroke(); g.setLineDash([]);
        const mx = x1 + (x2 - x1) * 0.55, my = y1 + bh / 2 + (y2 - y1 - bh) * 0.55; const t = `×${q}`; g.fillStyle = css("--surface"); const tw = g.measureText(t).width + 6; g.fillRect(mx - tw / 2, my - 7, tw, 14); g.fillStyle = css("--ink"); g.fillText(t, mx, my); });
      boxes = [];
      Object.entries(pos).forEach(([id, [x, y]]) => { const it = items[id], on = id === sel, past = R[id].pastDue > 0; g.fillStyle = css(on ? "--accent" : "--surface"); g.strokeStyle = css(past ? "--bad" : on ? "--accent" : "--line"); g.lineWidth = past ? 2.2 : 1.2;
        g.beginPath(); g.roundRect ? g.roundRect(x - bw / 2, y - bh / 2, bw, bh, 6) : g.rect(x - bw / 2, y - bh / 2, bw, bh); g.fill(); g.stroke();
        g.fillStyle = on ? "#fff" : css("--ink"); g.font = `600 11px ${css("--font-body")}`; g.fillText(it.name, x, y - 7); g.font = `10px ${css("--font-mono")}`; g.fillStyle = on ? "#fff" : css("--muted"); g.fillText(`${it.mb} · ${it.lt} wk`, x, y + 9);
        boxes.push([id, x - bw / 2, y - bh / 2, bw, bh]); });
      $("#c1Cap").innerHTML = `Numbers on the lines are quantity per parent (0.05 kg of cream base per tube). The label is used twice: once on the pack (dashed) and once on each tube. ${Object.values(R).some((r) => r.pastDue) ? "Red outline: the item has a past-due order." : "No past-due orders."}`;
    }
    function d2() {
      const due = W, chain = {}; // finish week of each item's order for one GP due at week 10
      const fin = { GP: due }; order.forEach((id) => { if (id === "GP") return; fin[id] = Math.min(...BOM.filter(([, c]) => c === id).map(([p]) => fin[p] - items[p].lt)); });
      order.forEach((id) => (chain[id] = [fin[id] - items[id].lt, fin[id]]));
      const start = Math.min(...Object.values(chain).map((c) => c[0])), ids = ITEMS0.map(([id]) => id);
      C2.resize(); C2.x = [Math.min(0, start - 0.5), due + 0.5]; C2.y = [0, ids.length]; C2.clear(); C2.axes({ xLabel: "week", yTicks: [], xFormat: (v) => fmt(v, 0) });
      const g = C2.ctx, rh = C2.ih / ids.length;
      if (start < 1) { g.fillStyle = css("--bad"); g.globalAlpha = 0.1; g.fillRect(C2.sx(C2.x[0]), C2.pad.t, C2.sx(0.5) - C2.sx(C2.x[0]), C2.ih); g.globalAlpha = 1; }
      ids.forEach((id, i) => { const [a, b] = chain[id], y = C2.pad.t + i * rh; g.fillStyle = css(id === sel ? "--accent" : items[id].mb === "make" ? "--violet" : "--warm"); g.globalAlpha = 0.8; g.fillRect(C2.sx(a + 0.5), y + rh * 0.2, Math.max(2, C2.sx(b + 0.5) - C2.sx(a + 0.5)), rh * 0.6); g.globalAlpha = 1;
        g.fillStyle = css("--ink"); g.font = `${id === sel ? "600 " : ""}11px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(items[id].name, C2.pad.l - 6, y + rh / 2); });
      const crit = ids.filter((id) => chain[id][0] === start).map((id) => items[id].name);
      let path = [], cur = crit.length ? ids.find((id) => chain[id][0] === start) : "GP"; while (cur) { path.unshift(cur); const p = BOM.filter(([, c]) => c === cur).map(([pp]) => pp).find((pp) => fin[pp] - items[pp].lt === fin[cur]); cur = p; }
      $("#c2Cap").innerHTML = `Each bar runs from when the order must be released to when it's needed, working back from a pack finished in week ${due}. Purple: made, orange: bought. The longest chain is ${path.map((id) => `${items[id].name} (${items[id].lt})`).join(" → ")}: a cumulative lead time of ${due - start} weeks.${start < 1 ? " Anything starting left of week 1 is already late for that week's packs." : ""}`;
    }
    const f = (v, dp) => (Math.abs(v) < 1e-9 ? "" : fmt(v, dp));
    function tbl() {
      const it = items[sel], r = R[sel], dp = it.dp, cell = (v, st = "") => `<td style="padding:3px 6px;${st}">${v}</td>`;
      const parents = BOM.filter(([, c]) => c === sel).map(([p, , q]) => `${items[p].name} × ${q}`).join(" + ");
      const row = (name, arr, first = "", style = () => "") => `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 6px;text-align:left;font-family:var(--font-body);white-space:nowrap">${name}</td>${cell(first)}${arr.map((v, t) => cell(f(v, dp), style(v, t))).join("")}</tr>`;
      $("#tbl").innerHTML = `<p class="hint" style="margin:0 0 6px">${it.name} (${it.unit}). Lead time ${it.lt} wk, safety stock ${fmt(it.ss, dp)}, rule: ${RULES.find((x) => x[0] === it.rule)[1]}${it.rule === "l4l" ? "" : ` ${fmt(it.lot, dp)}`}. Gross requirements come from ${sel === "GP" ? "the master schedule" : parents}.</p>
        <table style="border-collapse:collapse;font:.8rem var(--font-mono);width:100%;min-width:640px"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 6px;text-align:left">week</th><th style="padding:3px 6px;color:var(--bad)">past due</th>${Array.from({ length: W }, (_, t) => `<th style="padding:3px 6px">${t + 1}</th>`).join("")}</tr></thead><tbody>` +
        row("Gross requirements", r.gr, r.pastIn ? fmt(r.pastIn, dp) : "") + row("Scheduled receipts", r.sr) +
        row("Projected on hand", r.poh, `<span style="color:var(--muted)">${fmt(it.oh, dp)}</span>`, (v) => (v < it.ss - 1e-9 ? "color:var(--bad)" : "")) +
        row("Net requirements", r.net) + row("Planned receipts", r.rec, "", (v) => (v ? "color:var(--accent);font-weight:600" : "")) +
        row("Planned releases", r.rel, r.pastDue ? `<b style="color:var(--bad)">${fmt(r.pastDue, dp)}</b>` : "", (v) => (v ? "color:var(--warm);font-weight:600" : "")) +
        `</tbody></table>`;
      const t = R[sel].net.findIndex((v) => v > 0);
      if (t >= 0) { const prev = t ? r.poh[t - 1] : it.oh; $("#tbl").innerHTML += `<p class="hint" style="margin:8px 0 0">Worked: week ${t + 1}. Start ${fmt(prev, dp)} + receipts ${fmt(r.sr[t], dp)} − gross ${fmt(r.gr[t], dp)} = ${fmt(prev + r.sr[t] - r.gr[t], dp)}, below safety stock ${fmt(it.ss, dp)} by ${fmt(r.net[t], dp)}. The order rule makes that a receipt of ${fmt(r.rec[t], dp)}, released ${it.lt} week${it.lt === 1 ? "" : "s"} earlier, ${t - it.lt >= 0 ? `in week ${t + 1 - it.lt}` : `which is before week 1: <b style="color:var(--bad)">past due</b>`}.</p>`; }
    }
    function d3() {
      const ids = order, cols = W + 1;
      C3.resize(); C3.x = [-1, W]; C3.y = [0, ids.length]; C3.clear();
      const g = C3.ctx, cw = C3.iw / cols, rh = C3.ih / ids.length;
      g.font = `10px ${css("--font-mono")}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = css("--muted");
      for (let c = 0; c < cols; c++) g.fillText(c ? c : "late", C3.pad.l + (c + 0.5) * cw, C3.pad.t - 10);
      ids.forEach((id, i) => {
        const r = R[id], mx = Math.max(1e-9, ...r.rel, r.pastDue), y = C3.pad.t + i * rh;
        g.fillStyle = css("--ink"); g.font = `${id === sel ? "600 " : ""}11px ${css("--font-body")}`; g.textAlign = "right"; g.fillText(items[id].name, C3.pad.l - 6, y + rh / 2);
        [r.pastDue, ...r.rel].forEach((v, c) => { const x = C3.pad.l + c * cw; g.fillStyle = css(c === 0 ? "--bad" : "--warm"); g.globalAlpha = v ? 0.15 + 0.6 * (v / mx) : 0.04; g.fillRect(x + 1, y + 1, cw - 2, rh - 2); g.globalAlpha = 1;
          if (v) { g.fillStyle = css("--ink"); g.font = `10px ${css("--font-mono")}`; g.textAlign = "center"; g.fillText(fmt(v, items[id].dp), x + cw / 2, y + rh / 2); } });
      });
      const ex = order.filter((id) => R[id].pastDue > 0).map((id) => `${items[id].name}: ${fmt(R[id].pastDue, items[id].dp)} ${items[id].unit} should already have been ordered`);
      const lumps = order.map((id) => [id, R[id].rel.filter((v) => v > 0).length]).filter(([, n]) => n);
      $("#c3Cap").innerHTML = `Darker = bigger order. ${ex.length ? `<b style="color:var(--bad)">Exceptions:</b> ${ex.join("; ")}.` : "No exceptions: every order can still be placed on time."} Orders per item over ${W} weeks: ${lumps.map(([id, n]) => `${items[id].name} ${n}`).join(", ")}.`;
    }
    function readouts() {
      const it = items[sel], r = R[sel], dp = it.dp;
      $("#ro").innerHTML = [["Total gross requirement", fmt(r.gr.reduce((a, b) => a + b, 0) + r.pastIn, dp)], ["Orders planned", `${r.rec.filter((v) => v).length}, total ${fmt(r.rec.reduce((a, b) => a + b, 0), dp)}`], ["Stock at end of week 10", fmt(r.poh[W - 1], dp)], ["Past due", r.pastDue ? `<span class="pill bad">${fmt(r.pastDue, dp)}</span>` : `<span class="pill ok">none</span>`]].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function controls() {
      const it = items[sel];
      $("#is").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.i === sel));
      $("#rs").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.r === it.rule));
      $("#lt").value = it.lt; $("#oh").max = it.unit === "kg" ? 60 : 600; $("#oh").step = it.unit === "kg" ? 1 : 10; $("#oh").value = it.oh;
      $("#ss").max = it.unit === "kg" ? 30 : 300; $("#ss").step = it.unit === "kg" ? 1 : 10; $("#ss").value = it.ss;
      $("#lot").max = it.unit === "kg" ? 50 : 1000; $("#lot").step = it.unit === "kg" ? 1 : 10; $("#lot").value = it.lot; $("#lotC").hidden = it.rule === "l4l";
    }
    function labels() { const it = items[sel]; $("#ltV").textContent = it.lt; $("#ohV").textContent = `${fmt(it.oh, it.dp)} ${it.unit}`; $("#ssV").textContent = fmt(it.ss, it.dp); $("#lotV").textContent = `${fmt(it.lot, it.dp)} ${it.unit}`; }
    function mpsInputs() { $("#mpsRow").innerHTML = mps.map((v, t) => `<label style="display:flex;flex-direction:column;align-items:center;font:.72rem var(--font-mono);color:var(--muted)">wk ${t + 1}<input type="number" min="0" max="999" step="10" value="${v}" data-w="${t}" style="width:100%;text-align:center;font:.85rem var(--font-mono);padding:4px 2px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink)"></label>`).join(""); }
    function draw() { R = plan(); labels(); d1(); d2(); tbl(); d3(); readouts(); }
    mpsInputs(); controls();
    $("#mpsRow").addEventListener("input", (e) => { const t = +e.target.dataset.w; if (isNaN(t)) return; mps[t] = Math.max(0, +e.target.value || 0); draw(); });
    $("#is").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; sel = b.dataset.i; controls(); draw(); });
    $("#rs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const it = items[sel]; it.rule = b.dataset.r; if (it.rule !== "l4l" && !it.lot) it.lot = it.unit === "kg" ? 10 : 200; controls(); draw(); });
    [["lt", "lt"], ["oh", "oh"], ["ss", "ss"], ["lot", "lot"]].forEach(([id, k]) => $("#" + id).addEventListener("input", () => { items[sel][k] = +$("#" + id).value; draw(); }));
    $("#c1").addEventListener("click", (e) => { const b = $("#c1").getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, hit = boxes.find(([, bx, by, bw, bh]) => x >= bx && x <= bx + bw && y >= by && y <= by + bh); if (hit) { sel = hit[0]; controls(); draw(); } });
    $("#reset").addEventListener("click", () => { reset(); sel = "ET"; mpsInputs(); controls(); draw(); });
    draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
