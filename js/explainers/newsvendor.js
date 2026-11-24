Lab.register({
  id: "newsvendor",
  group: "Supply chain",
  title: "The newsvendor: how much to buy once",
  blurb: "One chance to buy a seasonal or perishable item. Too many and you mark down, too few and you miss sales. The critical ratio tells you exactly where to aim.",
  lede: "Some items are bought once for a season, a promotion or a day: Christmas stock, fresh bread, a fashion range, the morning papers. Demand is uncertain, and every unit you guess wrong costs something. Unsold units get marked down or thrown away. Missing units cost the margin you would have made. The best order isn't the forecast. It's the forecast pushed up or down depending on which mistake costs more.",
  quiz: [
    ["Price $10, cost $4, leftovers are worthless. What is the critical ratio, and do you order above or below the mean?", "Underage cost Cu = 10 − 4 = 6, overage cost Co = 4 − 0 = 4. Critical ratio = 6 / (6 + 4) = 0.6, so order at the 60th percentile of demand, a bit above the mean."],
    ["Same item, but leftovers can be sold off at $3. What changes?", "Co = 4 − 3 = 1, so the ratio is 6 / 7 = 0.857. Cheap leftovers make over-buying less painful, so you order more."],
    ["The forecast is unbiased but you order exactly the forecast. When is that right?", "Only when Cu = Co, so the critical ratio is 0.5. Otherwise the best quantity is above the forecast (high margin) or below it (high write-off cost)."],
    ["Why does a more accurate forecast raise expected profit even if the average stays the same?", "A smaller σ means the order needs less buffer above or below the mean, and fewer units end up leftover or short. The value of accuracy is the profit gap between σ and a smaller σ."],
  ],
  deeper: [
    ["Newsvendor model — Wikipedia", "https://en.wikipedia.org/wiki/Newsvendor_model", "derivation and variants"],
    ["MIT OCW 15.762 Supply Chain Planning", "https://ocw.mit.edu/courses/15-762j-supply-chain-planning-spring-2011/", "lecture notes covering the newsvendor"],
    ["Fisher & Raman (1996), Reducing the cost of demand uncertainty", "https://doi.org/10.1287/opre.44.1.87", "fashion buying with early sales signals"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 56 C 26 56, 34 10, 48 10 C 62 10, 70 56, 90 56"/><path d="M58 6 v52" stroke-dasharray="3 3"/><path d="M58 24 C 64 34, 70 50, 90 56 L 58 56 Z" fill="currentColor" fill-opacity=".2" stroke="none"/></svg>`,

  mount(root) {
    const { Plot, watch, css, qnorm, dnorm, pnorm, gloss } = Lab;
    const money = (v) => (v < 0 ? "−" : "") + "$" + Math.round(Math.abs(v)).toLocaleString("en-US");

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot short">
          <canvas id="nvd" aria-label="Demand distribution with the order quantity marked"></canvas>
          <div class="legend"><span><i style="background:var(--warm)"></i>Demand above Q: missed sales</span><span><i style="background:var(--violet)"></i>Demand below Q: leftovers</span><span><i style="background:var(--ink)"></i>Your order Q</span></div>
          <figcaption>Demand for the season. The area to the right of Q is the chance you sell out.</figcaption>
        </figure>
        <figure class="plot wide">
          <canvas id="nvp" aria-label="Expected profit against order quantity"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>Expected profit</span><span><i style="background:var(--muted)"></i>With a perfect forecast</span><span><i style="background:var(--good)"></i>Best Q</span></div>
          <figcaption>Expected profit for every order quantity. The peak sits where the chance of selling out equals 1 − critical ratio.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="p">Selling price <output id="pV"></output></label><input type="range" id="p" min="1" max="100" step="0.5" value="40"></div>
        <div class="ctrl"><label for="c">Unit cost <output id="cV"></output></label><input type="range" id="c" min="0.5" max="100" step="0.5" value="18"></div>
        <div class="ctrl"><label for="s">Markdown / salvage value <output id="sV"></output></label><input type="range" id="s" min="0" max="100" step="0.5" value="8"></div>
        <div class="ctrl"><label for="mu">Forecast (mean demand) <output id="muV"></output></label><input type="range" id="mu" min="50" max="2000" step="10" value="1000"></div>
        <div class="ctrl"><label for="sd">Forecast uncertainty (SD) <output id="sdV"></output></label><input type="range" id="sd" min="10" max="800" step="10" value="300"></div>
        <div class="ctrl"><label for="Q">Your order Q <output id="QV"></output></label><input type="range" id="Q" min="0" max="4000" step="10" value="1000"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="best" type="button">Order the best Q</button></div>`,
      notes: `
        <section>
          <h2>The critical ratio</h2>
          <div class="eq">underage cost Cu = price − cost<br>overage cost Co = cost − salvage<br>critical ratio = Cu ÷ (Cu + Co)<br>best Q = μ + z × σ, with z = Φ⁻¹(critical ratio)</div>
          <p>Ordering one more unit pays Cu if it sells (chance P(D &gt; Q)) and costs Co if it doesn't. Keep adding units until those balance: P(D ≤ Q) = Cu / (Cu + Co).</p>
        </section>
        <section>
          <h2>Expected profit</h2>
          <div class="eq">expected sales = μ − σ × G(z)<br>expected leftovers = Q − expected sales<br>profit = price × sales + salvage × leftovers − cost × Q</div>
          <p>G is the normal loss function, the same one used for expected shortfalls in <a href="#forecast-value">the value of a better forecast</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set the salvage value to $0. The best Q drops: leftovers now cost the full $18.</li>
            <li>Raise the price to $80. The critical ratio rises above 0.8 and the best Q moves well above the forecast.</li>
            <li>Order exactly the forecast (Q = 1000) and compare the profit with the best Q.</li>
            <li>Halve the SD. The gap to the perfect-forecast line roughly halves: that gap is the cost of uncertainty.</li>
          </ol>
          <p>Related: <a href="#cost-margin">landed cost and margin</a>, <a href="#service-level-cost">service level vs cost</a>, <a href="#censored-demand">censored demand</a> (sold-out days hide true demand).</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pD = new Plot($("#nvd"), { x: [0, 4000], pad: { l: 30 } });
    const pP = new Plot($("#nvp"), { x: [0, 4000], pad: { l: 70 } });

    function profit(Q, p, c, s, mu, sd) {
      const z = (Q - mu) / sd, sales = mu - sd * gloss(z) - Math.max(0, 0); // E[min(Q, D)] for normal D
      return { sales, left: Q - sales, short: mu - sales, P: p * sales + s * (Q - sales) - c * Q, sellout: 1 - pnorm(z) };
    }

    function draw() {
      let p = +$("#p").value, c = +$("#c").value, s = +$("#s").value;
      if (c > p) { c = p; $("#c").value = c; } if (s > c) { s = c; $("#s").value = s; }
      const mu = +$("#mu").value, sd = +$("#sd").value, Q = +$("#Q").value;
      $("#pV").textContent = "$" + p.toFixed(2); $("#cV").textContent = "$" + c.toFixed(2); $("#sV").textContent = "$" + s.toFixed(2);
      $("#muV").textContent = mu; $("#sdV").textContent = sd + ` (CV ${(sd / mu).toFixed(2)})`; $("#QV").textContent = Q;
      const Cu = p - c, Co = c - s, cr = Cu + Co > 0 ? Cu / (Cu + Co) : 0.5;
      const z = qnorm(Math.min(0.9995, Math.max(0.0005, cr))), Qs = Math.max(0, mu + z * sd);
      const best = profit(Qs, p, c, s, mu, sd), mine = profit(Q, p, c, s, mu, sd), perfect = Cu * mu;

      const xmax = Math.max(4000, mu + 4 * sd);
      pD.x = [0, xmax]; pP.x = [0, xmax];
      const xs = Array.from({ length: 201 }, (_, i) => (i / 200) * xmax), dens = xs.map((x) => dnorm((x - mu) / sd) / sd);
      pD.y = [0, Math.max(...dens) * 1.15];
      pD.clear(); pD.axes({ xLabel: "demand", yTicks: [], yFormat: () => "" });
      const ctx = pD.ctx;
      const fill = (cond, col) => { ctx.beginPath(); ctx.moveTo(pD.sx(xs[0]), pD.sy(0)); xs.forEach((x, i) => ctx.lineTo(pD.sx(x), pD.sy(cond(x) ? dens[i] : 0))); ctx.lineTo(pD.sx(xmax), pD.sy(0)); ctx.closePath(); ctx.globalAlpha = 0.28; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; };
      fill((x) => x <= Q, css("--violet")); fill((x) => x > Q, css("--warm"));
      pD.path(xs, dens, css("--ink"), 1.6);
      pD.path([Q, Q], [0, pD.y[1]], css("--ink"), 2);
      pD.path([Qs, Qs], [0, pD.y[1]], css("--good"), 2, [5, 4]);

      const ps = xs.map((x) => profit(x, p, c, s, mu, sd).P);
      const lo = Math.min(0, ...ps.slice(0, 1)), hi = Math.max(perfect, ...ps);
      pP.y = [Math.max(Math.min(...ps), -hi * 0.6), hi * 1.1];
      pP.clear(); pP.axes({ xLabel: "order quantity Q", yLabel: "expected profit", yFormat: (v) => (v < 0 ? "−$" : "$") + (Math.abs(v) >= 1000 ? Math.round(Math.abs(v) / 1000) + "k" : Math.abs(v)), yCount: 4 });
      pP.path([0, xmax], [perfect, perfect], css("--muted"), 1.5, [5, 4]);
      pP.path(xs, ps, css("--accent"), 2.6);
      pP.dot(Qs, best.P, 6, css("--good"), css("--surface"));
      pP.dot(Q, mine.P, 6, css("--ink"), css("--surface"));

      $("#ro").innerHTML = `
        <div class="ro"><b>Critical ratio</b><span class="num">${cr.toFixed(3)}</span></div>
        <div class="ro"><b>Best Q</b><span class="pill ok">${Math.round(Qs)}</span></div>
        <div class="ro"><b>Profit at best Q</b><span class="num">${money(best.P)}</span></div>
        <div class="ro"><b>Profit at your Q</b><span class="num">${money(mine.P)}</span></div>
        <div class="ro"><b>Chance of selling out</b><span class="num">${(mine.sellout * 100).toFixed(0)}%</span></div>
        <div class="ro"><b>Cost of uncertainty</b><span class="num">${money(perfect - best.P)}</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      const zq = (Q - mu) / sd;
      $("#work").innerHTML = [
        `Cu = ${p} − ${c} = ${Cu.toFixed(2)}, Co = ${c} − ${s} = ${Co.toFixed(2)} → ratio = ${Cu.toFixed(2)} ÷ ${(Cu + Co).toFixed(2)} = ${B(cr.toFixed(3))}`,
        `z = Φ⁻¹(${cr.toFixed(3)}) = ${z.toFixed(3)} → best Q = ${mu} + ${z.toFixed(3)} × ${sd} = ${B(Math.round(Qs))}`,
        `your Q = ${Q}: z = (${Q} − ${mu}) ÷ ${sd} = ${zq.toFixed(3)}, G(z) = ${gloss(zq).toFixed(4)}`,
        `expected sales = ${mu} − ${sd} × ${gloss(zq).toFixed(4)} = ${B(Math.round(mine.sales))}, leftovers = ${B(Math.round(mine.left))}, missed = ${Math.round(mine.short)}`,
        `profit = ${p} × ${Math.round(mine.sales)} + ${s} × ${Math.round(mine.left)} − ${c} × ${Q} = ${B(money(mine.P))} ${M(`(best Q: ${money(best.P)}, perfect forecast: ${money(perfect)})`)}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    ["#p", "#c", "#s", "#mu", "#sd", "#Q"].forEach((k) => $(k).addEventListener("input", draw));
    $("#best").addEventListener("click", () => {
      const p = +$("#p").value, c = +$("#c").value, s = +$("#s").value, cr = (p - c) / Math.max(1e-9, p - s);
      $("#Q").value = Math.round(Math.max(0, +$("#mu").value + qnorm(Math.min(0.9995, Math.max(0.0005, cr))) * +$("#sd").value) / 10) * 10; draw();
    });
    draw();
    return watch([pD.c, pP.c], (resized) => { if (resized) { pD.resize(); pP.resize(); } draw(); });
  },
});
