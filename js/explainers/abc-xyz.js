Lab.register({
  id: "abc-xyz",
  group: "Supply chain",
  title: "ABC/XYZ segmentation",
  blurb: "Sort a range of products by value (ABC) and by how predictable they are (XYZ), then give each of the nine groups the right planning approach.",
  lede: "Most ranges follow the Pareto pattern: a few items make most of the money. ABC sorts items by annual value, so attention goes where the money is. XYZ sorts them by how much demand varies, so you know which ones can be forecast well. Put the two together and you get a nine-box grid that tells you how to plan each item.",
  quiz: [
    ["An item sells $2M a year with a CV of 0.15. Which box, and how would you plan it?", "AX: high value, steady demand. Forecast it statistically, review often, hold lean safety stock and consider automating replenishment."],
    ["An item sells $5k a year with a CV of 1.4. Which box, and what policy fits?", "CZ: low value, erratic. Don't spend planner time on it. Use a simple rule (e.g. a generous reorder point or make-to-order), Croston-type forecasts, or consider delisting."],
    ["Why is CV, not standard deviation, used for XYZ?", "SD scales with volume: a big seller has a big SD even if it's very predictable. CV = SD / mean compares variability on the same relative scale across items of any size."],
    ["Your AZ items are high value but erratic. What do you do with them?", "They need human attention: understand why they're erratic (promotions, a few big customers, projects), collaborate with sales, and consider make-to-order or agreed lead times rather than heavy safety stock."],
  ],
  deeper: [
    ["ABC analysis — Wikipedia", "https://en.wikipedia.org/wiki/ABC_analysis", "the method and its Pareto roots"],
    ["Pareto principle — Wikipedia", "https://en.wikipedia.org/wiki/Pareto_principle", "the 80/20 pattern"],
    ["Coefficient of variation — Wikipedia", "https://en.wikipedia.org/wiki/Coefficient_of_variation", "the measure behind XYZ"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor"><rect x="24" y="4" width="20" height="16" opacity=".9"/><rect x="48" y="4" width="20" height="16" opacity=".6"/><rect x="72" y="4" width="20" height="16" opacity=".3"/><rect x="24" y="24" width="20" height="16" opacity=".6"/><rect x="48" y="24" width="20" height="16" opacity=".4"/><rect x="72" y="24" width="20" height="16" opacity=".2"/><rect x="24" y="44" width="20" height="16" opacity=".3"/><rect x="48" y="44" width="20" height="16" opacity=".2"/><rect x="72" y="44" width="20" height="16" opacity=".1"/></g><path d="M4 56 Q8 10 20 6"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const N = 200;
    const POLICY = {
      AX: "Statistical forecast, automate, lean safety stock, review weekly.",
      AY: "Statistical forecast plus planner review; moderate safety stock.",
      AZ: "Planner attention: find the cause (promos, big customers). Collaborate with sales; consider make-to-order.",
      BX: "Automate replenishment with a standard reorder point.",
      BY: "Statistical forecast, periodic review, standard safety stock.",
      BZ: "Higher safety stock or make-to-order; check if demand can be smoothed.",
      CX: "Automate fully; larger, less frequent orders (EOQ).",
      CY: "Simple rules, generous reorder points; review rarely.",
      CZ: "Croston-type forecasts or make-to-order; candidates for delisting.",
    };
    const CLS_COL = { A: "--accent", B: "--violet", C: "--warm" };

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="abp" aria-label="Pareto curve of cumulative value against share of items"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>A items</span><span><i style="background:var(--violet)"></i>B items</span><span><i style="background:var(--warm)"></i>C items</span></div>
          <figcaption>Pareto curve: items sorted from highest to lowest annual value, with the running share of total value.</figcaption>
        </figure>
        <figure class="plot wide">
          <canvas id="abs" aria-label="Each item's annual value against its demand variability"></canvas>
          <figcaption>Each dot is one item: annual value (log scale) against coefficient of variation of weekly demand. Dashed lines are the XYZ cut-offs. Hover a dot to see it.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">The nine-box grid</h4>
          <div style="overflow-x:auto"><table id="grid" style="width:100%;border-collapse:separate;border-spacing:6px;font-size:.84rem"></table></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="a">A = top items making <output id="aV"></output> of value</label><input type="range" id="a" min="50" max="90" step="1" value="80"></div>
        <div class="ctrl"><label for="b">A + B make <output id="bV"></output></label><input type="range" id="b" min="80" max="99" step="1" value="95"></div>
        <div class="ctrl"><label for="x">X if CV below <output id="xV"></output></label><input type="range" id="x" min="0.1" max="0.8" step="0.05" value="0.5"></div>
        <div class="ctrl"><label for="y">Y if CV below <output id="yV"></output> (else Z)</label><input type="range" id="y" min="0.5" max="2" step="0.05" value="1"></div>
        <div class="ctrl"><label for="sk">How concentrated is value <output id="skV"></output></label><input type="range" id="sk" min="0.5" max="2" step="0.1" value="1.2"></div>
        <div class="readouts" id="ro"></div>
        <p class="hint" id="hov" style="min-height:3em"></p>
        <div class="btns"><button class="btn" id="newd" type="button">New random range</button></div>`,
      notes: `
        <section>
          <h2>How the classes are set</h2>
          <ol>
            <li><b>ABC:</b> work out each item's annual value (units × price). Sort high to low, and add up the running share of the total. Items until the running share reaches 80% are A, until 95% are B, the rest are C.</li>
            <li><b>XYZ:</b> work out each item's coefficient of variation from its weekly (or monthly) demand. X: steady (CV &lt; 0.5). Y: variable (0.5–1). Z: erratic (&gt; 1).</li>
          </ol>
          <div class="eq">CV = standard deviation of demand / mean demand</div>
          <p>The cut-offs are conventions, not laws. Adjust them to your business and look at how many items land in each box.</p>
        </section>
        <section>
          <h2>Cautions</h2>
          <ul>
            <li>CV mixes up variation you can forecast (seasonality, trend, promotions) with true noise. A seasonal item can look like Z while being very predictable. Better: use the CV of forecast <i>errors</i>.</li>
            <li>Classes change over time. Re-run quarterly, and watch new items, which have little history.</li>
            <li>Value isn't everything. A cheap part that stops a production line may deserve A-level care.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Raise "how concentrated" to 2. A handful of items now make most of the value, and the A class shrinks.</li>
            <li>Move the A cut-off from 80% to 60%. Fewer items are A. The count in each box tells you where planner time goes.</li>
            <li>Notice that the biggest sellers tend to have lower CV. High volume means more pooling, as in <a href="#risk-pooling">risk pooling</a>. Erratic, low-volume items are often <a href="#intermittent-demand">intermittent</a>.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pP = new Plot($("#abp"), { x: [0, 100], y: [0, 100], pad: { l: 50 } });
    const pS = new Plot($("#abs"), { pad: { l: 50 } });
    let seed = 6, items = [], hover = -1;

    function makeItems() {
      const r = rng(seed), sk = +$("#sk").value;
      items = Array.from({ length: N }, (_, i) => {
        const value = Math.exp(11 + sk * 1.6 * r.normal());
        // bigger items tend to be steadier; plus some intermittent ones
        const base = 1.6 - 0.11 * Math.log(value) + 0.25 * r.normal(), cv = Math.max(0.08, base + (r() < 0.12 ? 0.9 : 0));
        return { id: "SKU-" + String(1000 + i), value, cv };
      }).sort((a, b) => b.value - a.value);
    }

    function classify() {
      const A = +$("#a").value / 100, B = Math.max(A + 0.01, +$("#b").value / 100), X = +$("#x").value, Y = Math.max(X + 0.05, +$("#y").value);
      const tot = items.reduce((s, it) => s + it.value, 0);
      let run = 0;
      items.forEach((it) => { const before = run / tot; run += it.value; it.cum = run / tot; it.abc = before < A ? "A" : before < B ? "B" : "C"; it.xyz = it.cv < X ? "X" : it.cv < Y ? "Y" : "Z"; });
      return { A, B, X, Y, tot };
    }

    function draw() {
      const { A, B, X, Y, tot } = classify();
      $("#aV").textContent = Math.round(A * 100) + "%"; $("#bV").textContent = Math.round(B * 100) + "%";
      $("#xV").textContent = X.toFixed(2); $("#yV").textContent = Y.toFixed(2); $("#skV").textContent = (+$("#sk").value).toFixed(1);

      pP.clear(); pP.axes({ xLabel: "% of items (sorted by value)", yLabel: "% of total value", xFormat: (v) => v + "%", yFormat: (v) => v + "%" });
      const g = pP.ctx;
      items.forEach((it, i) => { const x0 = pP.sx((i / N) * 100), x1 = pP.sx(((i + 1) / N) * 100); g.fillStyle = css(CLS_COL[it.abc]); g.globalAlpha = 0.25; g.fillRect(x0, pP.sy(it.cum * 100), x1 - x0, pP.sy(0) - pP.sy(it.cum * 100)); });
      g.globalAlpha = 1;
      pP.path([0, ...items.map((_, i) => ((i + 1) / N) * 100)], [0, ...items.map((it) => it.cum * 100)], css("--ink"), 2.2);
      [A, B].forEach((c) => pP.path([0, 100], [c * 100, c * 100], css("--muted"), 1, [4, 4]));
      const nA = items.filter((i) => i.abc === "A").length, nB = items.filter((i) => i.abc === "B").length;
      g.fillStyle = css("--ink"); g.font = `12px ${css("--font-mono")}`; g.textAlign = "left";
      g.fillText(`A: ${Math.round((nA / N) * 100)}% of items → ${Math.round(A * 100)}% of value`, pP.sx((nA / N) * 100) + 8, pP.sy(A * 100) + 16);

      const lv = items.map((it) => Math.log10(it.value)), cvMax = Math.max(...items.map((i) => i.cv), Y + 0.2);
      pS.x = [Math.floor(Math.min(...lv) * 2) / 2, Math.ceil(Math.max(...lv) * 2) / 2]; pS.y = [0, cvMax * 1.05];
      pS.clear();
      pS.axes({ xLabel: "annual value", yLabel: "CV of demand", xFormat: (v) => (Number.isInteger(v) ? "$" + (10 ** v >= 1e6 ? 10 ** v / 1e6 + "M" : 10 ** v >= 1e3 ? 10 ** v / 1e3 + "k" : 10 ** v) : ""), xTicks: Array.from({ length: Math.floor(pS.x[1]) - Math.ceil(pS.x[0]) + 1 }, (_, i) => Math.ceil(pS.x[0]) + i) });
      [X, Y].forEach((c) => pS.path(pS.x, [c, c], css("--muted"), 1, [4, 4]));
      g.globalAlpha = 1;
      const gs = pS.ctx; gs.fillStyle = css("--muted"); gs.font = `11px ${css("--font-mono")}`; gs.textAlign = "right";
      gs.fillText("X", pS.w - pS.pad.r - 6, pS.sy(X / 2) + 4); gs.fillText("Y", pS.w - pS.pad.r - 6, pS.sy((X + Y) / 2) + 4); gs.fillText("Z", pS.w - pS.pad.r - 6, pS.sy((Y + cvMax) / 2) + 4);
      items.forEach((it, i) => pS.dot(Math.log10(it.value), it.cv, i === hover ? 6 : 3.5, css(CLS_COL[it.abc]), i === hover ? css("--ink") : null));

      // grid
      const cell = (a, x) => {
        const its = items.filter((i) => i.abc === a && i.xyz === x), v = its.reduce((s, i) => s + i.value, 0);
        return `<td style="vertical-align:top;border:1px solid var(--line);border-radius:8px;padding:8px 10px;background:color-mix(in srgb, var(${CLS_COL[a]}) ${x === "X" ? 18 : x === "Y" ? 11 : 5}%, var(--surface));min-width:150px">
          <div style="display:flex;justify-content:space-between;gap:6px"><b style="font-family:var(--font-display);font-size:1.05rem">${a}${x}</b><span style="font:12px var(--font-mono);color:var(--muted)">${its.length} item${its.length === 1 ? "" : "s"} · ${((v / tot) * 100).toFixed(0)}% value</span></div>
          <div style="font-size:.8rem;margin-top:4px">${POLICY[a + x]}</div></td>`;
      };
      const th = (t) => `<th style="font:600 .75rem/1.2 var(--font-mono);color:var(--muted);text-align:left;padding:0 4px">${t}</th>`;
      $("#grid").innerHTML = `<tr><th></th>${th(`X · steady<br>CV &lt; ${X.toFixed(2)}`)}${th(`Y · variable<br>CV ${X.toFixed(2)}–${Y.toFixed(2)}`)}${th(`Z · erratic<br>CV &gt; ${Y.toFixed(2)}`)}</tr>` +
        ["A", "B", "C"].map((a) => `<tr>${th(a + `<br>${a === "A" ? "high value" : a === "B" ? "medium" : "low value"}`)}${["X", "Y", "Z"].map((x) => cell(a, x)).join("")}</tr>`).join("");

      const cnt = (c) => items.filter((i) => i.abc === c).length;
      $("#ro").innerHTML = ["A", "B", "C"].map((c) => `<div class="ro"><b><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(${CLS_COL[c]});margin-right:6px;vertical-align:-1px"></i>${c} items</b><span class="num">${cnt(c)} (${Math.round((cnt(c) / N) * 100)}%)</span></div>`).join("");
      const h = items[hover];
      $("#hov").innerHTML = h ? `<b>${h.id}</b>: annual value $${fmt(h.value, 0)}, CV ${h.cv.toFixed(2)} → <b>${h.abc}${h.xyz}</b>. ${POLICY[h.abc + h.xyz]}` : "Hover over a dot in the scatter to see an item.";
    }

    pS.c.addEventListener("pointermove", (e) => {
      const r = pS.c.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      let best = -1, bd = 100;
      items.forEach((it, i) => { const d = (pS.sx(Math.log10(it.value)) - px) ** 2 + (pS.sy(it.cv) - py) ** 2; if (d < bd) { bd = d; best = i; } });
      if (best !== hover) { hover = best; draw(); }
    });
    ["#a", "#b", "#x", "#y"].forEach((s) => $(s).addEventListener("input", draw));
    $("#sk").addEventListener("input", () => { makeItems(); draw(); });
    $("#newd").addEventListener("click", () => { seed++; makeItems(); draw(); });
    makeItems(); draw();
    return watch([pP.c, pS.c], (resized) => { if (resized) { pP.resize(); pS.resize(); } draw(); });
  },
});
