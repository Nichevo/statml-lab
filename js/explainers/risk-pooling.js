Lab.register({
  id: "risk-pooling",
  group: "Supply chain",
  title: "Risk pooling and where to hold stock",
  blurb: "Hold stock in one place instead of ten and you need far less safety stock. See the square-root law, and why correlated demand breaks it.",
  lede: "When one store sells more than expected, another often sells less. Stock held centrally can serve whichever one needs it, so the ups and downs partly cancel. That's risk pooling: the combined demand is relatively steadier than each part, so the same service needs less safety stock. How much less depends on how many locations you combine and how alike their surprises are.",
  quiz: [
    ["Nine stores each need 100 units of safety stock. Demand is independent across stores. How much would one central warehouse need?", "√9 × 100 = 300, instead of 9 × 100 = 900. A two-thirds cut. That's the square-root law."],
    ["The stores' demand is perfectly correlated (they all go up and down together). How much does pooling save?", "Nothing. With ρ = 1 the surprises never cancel, so the central warehouse needs the full 9 × 100 = 900."],
    ["Why don't companies always centralize everything?", "Central stock is further from customers: longer delivery times, higher transport cost, and sometimes lost sales when customers won't wait. Pooling saves stock but costs speed."],
    ["What other ways are there to pool risk without one warehouse?", "Transshipping between stores, holding generic components and customizing late (postponement), or using fewer product variants. Each lets one buffer cover several sources of demand."],
  ],
  diy: {
    intro: "n locations, each with demand SD σ in H1, lead time L in H2, service z in H3, correlation between locations ρ in H4.",
    steps: [
      ["Separate safety stocks.", "=n*H3*H1*SQRT(H2)"],
      ["Pooled safety stock.", "=H3*H1*SQRT(n*(1+(n-1)*H4))*SQRT(H2)"],
      ["Saving as a share.", "=1-pooled/separate"],
      ["Square-root law (ρ = 0): pooled = separate ÷ √n.", "=separate/SQRT(n)"],
      ["Measure ρ from history: weekly demand at two sites in B and C.", "=CORREL(B2:B105,C2:C105)"],
    ],
  },
  deeper: [
    ["Risk pool — Wikipedia", "https://en.wikipedia.org/wiki/Risk_pool", "the general idea, in insurance and inventory"],
    ["Maister (1976), Centralisation of inventories and the square root law, Int. J. Physical Distribution 6(3)", "https://doi.org/10.1108/eb014366", "the original square root rule and its assumptions"],
    ["Postponement — Wikipedia", "https://en.wikipedia.org/wiki/Postponement", "pooling by delaying product differentiation"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g opacity=".6"><rect x="4" y="6" width="14" height="12"/><rect x="4" y="26" width="14" height="12"/><rect x="4" y="46" width="14" height="12"/></g><path d="M18 12 L56 30 M18 32 L56 32 M18 52 L56 34"/><rect x="56" y="22" width="34" height="20" fill="currentColor" fill-opacity=".25"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css, qnorm } = Lab;
    const WEEKS = 26;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="rpw" aria-label="Weekly demand of individual stores and of all stores combined, as a percentage of average"></canvas>
          <div class="legend"><span><i style="background:var(--muted)"></i>Individual stores</span><span><i style="background:var(--accent)"></i>All stores combined</span></div>
          <figcaption>26 weeks of demand, each line shown as % of its own average. The combined line wobbles far less.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="rpn" aria-label="Total safety stock against number of locations"></canvas>
          <div class="legend"><span><i style="background:var(--warm)"></i>Separate stock at each store</span><span><i style="background:var(--accent)"></i>One pooled stock</span><span><i style="background:var(--muted)"></i>Square-root law (ρ = 0)</span></div>
          <figcaption>Total safety stock needed for the same service, as the number of locations grows.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Worked out with your numbers</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.84rem;line-height:1.9"></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="n">Number of stores <output id="nV"></output></label><input type="range" id="n" min="1" max="25" step="1" value="9"></div>
        <div class="ctrl"><label for="rho">Correlation between stores (ρ) <output id="rhoV"></output></label><input type="range" id="rho" min="0" max="1" step="0.05" value="0.1"></div>
        <div class="ctrl"><label for="mu">Average weekly demand per store <output id="muV"></output></label><input type="range" id="mu" min="10" max="500" step="10" value="100"></div>
        <div class="ctrl"><label for="sd">Weekly SD per store <output id="sdV"></output></label><input type="range" id="sd" min="1" max="100" step="1" value="30"></div>
        <div class="ctrl"><label for="L">Lead time <output id="LV"></output></label><input type="range" id="L" min="1" max="8" step="1" value="2"></div>
        <div class="ctrl"><label for="sl">Cycle service level <output id="slV"></output></label><input type="range" id="sl" min="80" max="99.5" step="0.5" value="95"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New random weeks</button></div>`,
      notes: `
        <section>
          <h2>The math</h2>
          <p>For n stores, each with demand SD σ, and correlation ρ between any two:</p>
          <div class="eq">separate: SS = n × z × σ × √L<br>pooled: &nbsp;&nbsp;SS = z × σ × √(n(1 + (n − 1)ρ)) × √L</div>
          <p>With ρ = 0 the pooled SD is σ√n, so pooled safety stock is √n times one store's, not n times. Divide the two and you get the <b>square-root law</b>: pooling n independent locations cuts safety stock by a factor of √n.</p>
          <p>As ρ rises toward 1, the pooled SD approaches nσ and the saving disappears.</p>
        </section>
        <section>
          <h2>Why it works</h2>
          <p>Variances of independent demands add, but standard deviations don't. Ten stores with SD 30 each have a combined SD of 30√10 ≈ 95, not 300. The combined average grows ten times while the wobble grows only about three times, so the coefficient of variation (CV = SD / mean) falls by √10.</p>
          <p>The same reasoning is behind the <a href="#central-limit">central limit theorem</a> and behind <a href="#ensemble-forecasts">ensemble forecasts</a>: averaging independent errors shrinks them.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set ρ to 0 and step the stores from 1 to 25. The pooled curve follows √n.</li>
            <li>Raise ρ to 0.5. Pooling still helps, but the curve flattens. Stores in the same region, hit by the same weather, behave like this.</li>
            <li>Set ρ to 1. The two lines meet: no saving at all.</li>
            <li>Look at the weekly chart with 1 store, then 25. The combined line flattens as n grows.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pW = new Plot($("#rpw"), { x: [0, WEEKS - 1], pad: { l: 52 } });
    const pN = new Plot($("#rpn"), { x: [0.5, 25.5], pad: { l: 52 } });
    let seed = 2;

    function draw() {
      const n = +$("#n").value, rho = +$("#rho").value, mu = +$("#mu").value, sd = +$("#sd").value, L = +$("#L").value, sl = +$("#sl").value / 100, z = qnorm(sl);
      $("#nV").textContent = n; $("#rhoV").textContent = rho.toFixed(2); $("#muV").textContent = mu; $("#sdV").textContent = sd + ` (CV ${(sd / mu).toFixed(2)})`;
      $("#LV").textContent = L + (L === 1 ? " week" : " weeks"); $("#slV").textContent = $("#sl").value + "%";

      const r = rng(seed), stores = Array.from({ length: n }, () => []), tot = [];
      for (let w = 0; w < WEEKS; w++) { const sh = r.normal(); let s = 0; for (let i = 0; i < n; i++) { const v = Math.max(0, mu + sd * (Math.sqrt(rho) * sh + Math.sqrt(1 - rho) * r.normal())); stores[i].push(v); s += v; } tot.push(s); }
      const pct = (a, m) => a.map((v) => (v / m) * 100), xs = tot.map((_, i) => i);
      const all = stores.flatMap((s) => pct(s, mu)).concat(pct(tot, mu * n));
      pW.y = [Math.max(0, Math.min(...all) - 5), Math.max(...all) + 5];
      pW.clear(); pW.axes({ xLabel: "week", yLabel: "% of average", yFormat: (v) => v + "%" });
      stores.slice(0, 12).forEach((s) => pW.path(xs, pct(s, mu), css("--muted"), 1.2, null, 0.55));
      pW.path(xs, pct(tot, mu * n), css("--accent"), 3);

      const sep = (k) => k * z * sd * Math.sqrt(L), pool = (k) => z * sd * Math.sqrt(k * (1 + (k - 1) * rho)) * Math.sqrt(L);
      pN.y = [0, sep(25) * 1.05];
      pN.clear(); pN.axes({ xTicks: [1, 5, 10, 15, 20, 25], xLabel: "number of locations n", yLabel: "total safety stock", yCount: 4 });
      const ks = Array.from({ length: 25 }, (_, i) => i + 1);
      pN.path(ks, ks.map((k) => z * sd * Math.sqrt(k) * Math.sqrt(L)), css("--muted"), 1.5, [4, 4]);
      pN.path(ks, ks.map(sep), css("--warm"), 2.4);
      pN.path(ks, ks.map(pool), css("--accent"), 2.4);
      pN.dot(n, sep(n), 5, css("--warm"), css("--surface")); pN.dot(n, pool(n), 6, css("--accent"), css("--surface"));

      const S = sep(n), P = pool(n), sdP = sd * Math.sqrt(n * (1 + (n - 1) * rho));
      $("#ro").innerHTML = `
        <div class="ro"><b>Separate safety stock</b><span class="num">${fmt(S, 0)}</span></div>
        <div class="ro"><b>Pooled safety stock</b><span class="num">${fmt(P, 0)}</span></div>
        <div class="ro"><b>Saving</b><span class="pill ${S - P > 0.5 ? "ok" : "idle"}">${S > 0 ? Math.round((1 - P / S) * 100) : 0}%</span></div>
        <div class="ro"><b>CV: one store → combined</b><span class="num">${(sd / mu).toFixed(2)} → ${(sdP / (n * mu)).toFixed(2)}</span></div>`;
      const b = (t) => `<b style="color:var(--ink)">${t}</b>`, mu_ = (t) => `<span style="color:var(--muted)">${t}</span>`;
      $("#work").innerHTML = [
        `z for ${(sl * 100).toFixed(1)}% = ${b(z.toFixed(3))}, √L = √${L} = ${Math.sqrt(L).toFixed(3)}`,
        `one store: SS = ${z.toFixed(3)} × ${sd} × ${Math.sqrt(L).toFixed(3)} = ${b(fmt(sep(1), 1))}`,
        `separate: ${n} × ${fmt(sep(1), 1)} = ${b(fmt(S, 0))}`,
        `pooled SD per week = ${sd} × √(${n} × (1 + ${n - 1} × ${rho.toFixed(2)})) = ${sd} × ${Math.sqrt(n * (1 + (n - 1) * rho)).toFixed(3)} = ${b(fmt(sdP, 1))}`,
        `pooled: SS = ${z.toFixed(3)} × ${fmt(sdP, 1)} × ${Math.sqrt(L).toFixed(3)} = ${b(fmt(P, 0))} ${mu_(`(square-root law with ρ = 0 would give ${fmt(sep(1) * Math.sqrt(n), 0)})`)}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    ["#n", "#rho", "#mu", "#sd", "#L", "#sl"].forEach((s) => $(s).addEventListener("input", draw));
    $("#newd").addEventListener("click", () => { seed++; draw(); });
    draw();
    return watch([pW.c, pN.c], (resized) => { if (resized) { pW.resize(); pN.resize(); } draw(); });
  },
});
