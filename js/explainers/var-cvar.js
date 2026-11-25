Lab.register({
  id: "var-cvar",
  group: "Risk",
  title: "Value at Risk and expected shortfall (VaR and CVaR)",
  blurb: "How bad could a bad month be? Read VaR and CVaR off a product line's monthly profit, see why assuming a normal curve misses rare supply disruptions, and back-test the numbers on months the model hasn't seen.",
  lede: "Value at Risk answers “how much could we lose in a bad month?” as a single number: the loss that is exceeded only 5% (or 1%) of the time. Expected shortfall, also called CVaR, asks the follow-up question: when one of those bad months does happen, how much do we lose on average? Both come from the same sorted list of outcomes, and both are only as good as the history or model behind them.",
  quiz: [
    ["What does “95% monthly VaR = $80k” mean?", "In 95% of months the loss is no more than $80k. In the other 5%, about one month in 20, it is worse. VaR says nothing about how much worse."],
    ["Why look at CVaR as well as VaR?", "CVaR (expected shortfall) is the average loss in the months beyond VaR, so it sees how deep the tail goes. Two businesses can share a VaR while one has a far worse tail. CVaR also adds up sensibly across business units (it's 'coherent'), which VaR doesn't always do."],
    ["Why is the normal-curve VaR too high at 95% but too low at 99%?", "The few disruptions inflate the standard deviation, so the normal curve spreads its probability evenly: too much in the middle of the tail, far too little at the very end. It gets the shape wrong, and which way the error goes depends on how far into the tail you look. Its CVaR is too low either way."],
    ["With 60 months of history, how reliable is a 99% VaR?", "Not very. 1% of 60 is 0.6 months, so the estimate rests on the single worst month you happened to see. It jumps around a lot between samples: press “New history” and watch."],
    ["How do you back-test a VaR?", "Count the months the loss went beyond VaR. At 95% over 60 months you expect about 3. Far more means the model understates risk; Kupiec's test turns the count into a p-value."],
  ],
  diy: {
    intro: "Monthly profit in B2:B61 (60 months, $k). Confidence level in E1 (e.g. 0.95).",
    steps: [
      ["Turn profit into loss (positive = bad).", "C2: =-B2"],
      ["How many worst months sit at or beyond VaR.", "E2: =INT((1-E1)*COUNT(C2:C61))+1"],
      ["Historical VaR: the E2-th largest loss.", "E3: =LARGE(C2:C61, E2)"],
      ["Historical CVaR: the average of losses at or beyond VaR.", "E4: =AVERAGEIF(C2:C61, \">=\"&E3)"],
      ["Normal VaR and CVaR from the mean and standard deviation of the losses.", "E5: =AVERAGE(C2:C61)+NORM.S.INV(E1)*STDEV.S(C2:C61)   E6: =AVERAGE(C2:C61)+STDEV.S(C2:C61)*NORM.S.DIST(NORM.S.INV(E1),FALSE)/(1-E1)"],
      ["Back-test: count months in a new period whose loss beat VaR.", "=COUNTIF(new_losses, \">\"&E3)"],
      ["Simulate a month with a 4% chance of a disruption costing about $250k.", "=NORM.INV(RAND(),40,60) - IF(RAND()<0.04, LOGNORM.INV(RAND(), LN(250)-0.18, 0.6), 0)"],
    ],
  },
  deeper: [
    ["Artzner, Delbaen, Eber & Heath (1999), Coherent measures of risk, Mathematical Finance 9(3)", "https://doi.org/10.1111/1467-9965.00068", "the four properties a risk measure should have; VaR fails one"],
    ["Acerbi & Tasche (2002), On the coherence of expected shortfall, Journal of Banking & Finance 26(7)", "https://doi.org/10.1016/S0378-4266(02)00283-2", "expected shortfall does have them"],
    ["Rockafellar & Uryasev (2000), Optimization of conditional value-at-risk, Journal of Risk 2(3)", "https://doi.org/10.21314/JOR.2000.038", "CVaR can be minimised with linear programming"],
    ["Kupiec (1995), Techniques for verifying the accuracy of risk measurement models, Journal of Derivatives 3(2)", "https://doi.org/10.3905/jod.1995.407942", "the back-test used here"],
    ["Basel Committee (2019), Minimum capital requirements for market risk", "https://www.bis.org/bcbs/publ/d457.htm", "why banking regulation moved from VaR to expected shortfall"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 56 C26 56 30 10 48 10 S70 50 90 54"/><path d="M70 30 V58" stroke-dasharray="4 3"/><path d="M72 44 C78 50 84 53 90 54 V58 H72 Z" fill="currentColor" fill-opacity=".35" stroke="none"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("Monthly loss: what 40,000 simulated months look like")}</div><canvas id="c1" style="height:300px" aria-label="Histogram of monthly losses with VaR and CVaR marked"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "VaR and CVaR at every confidence level", 300, "VaR and CVaR against the confidence level, true and normal-curve versions"), `<div class="plot" style="padding:14px;min-width:0">${h4("Worked out from your history")}<div id="wk"></div></div>`)}
        <figure class="plot wide" style="margin:14px 0 0"><div style="padding:4px 6px 0">${h4("Back-test: the next 60 months")}</div><canvas id="c3" style="height:260px" aria-label="Losses in 60 new months against the VaR lines, with exceptions marked"></canvas><figcaption id="c3Cap"></figcaption></figure>`,
      panel: `
        <p class="hint" style="margin:0">A product line makes $40k a month on average, give or take $60k. Now and then a supplier disruption (a plant fire, a port closure, a quality recall) knocks a large amount off one month.</p>
        <div class="ctrl"><label for="a">Confidence level <output id="aV"></output></label><input type="range" id="a" min="0.8" max="0.995" step="0.005" value="0.95"></div>
        <div class="ctrl"><label for="q">Chance of a disruption in a month <output id="qV"></output></label><input type="range" id="q" min="0" max="0.15" step="0.005" value="0.04"></div>
        <div class="ctrl"><label for="S">Typical disruption cost <output id="SV"></output></label><input type="range" id="S" min="50" max="600" step="10" value="250"></div>
        <div class="ctrl"><label for="n">Months of history <output id="nV"></output></label><input type="range" id="n" min="24" max="240" step="12" value="60"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New history</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Reading VaR and CVaR off a sorted list</h2>
          <p>Turn each month into a loss (a profit of $30k is a loss of −30). Sort from worst to best. With 60 months and 95% confidence, 5% of 60 = 3 months are allowed to be worse than VaR, so VaR is the 4th worst month. CVaR is the average of those 4 worst months. That's the whole historical method, and the table shows it with your numbers.</p>
          <div class="eq">VaR<sub>α</sub> = the loss exceeded with probability 1 − α &nbsp;&nbsp; CVaR<sub>α</sub> = average loss given loss ≥ VaR<sub>α</sub></div>
        </section>
        <section>
          <h2>Three ways to get the numbers</h2>
          <ul>
            <li><b>Historical:</b> sort your own past months. No assumptions, but only as rich as your history: a disruption that didn't happen in the sample doesn't exist.</li>
            <li><b>Normal (parametric):</b> VaR = mean + z × standard deviation, with z = 1.645 at 95% and 2.326 at 99%. Quick and smooth, but blind to fat tails.</li>
            <li><b>Monte Carlo:</b> write down a model of what drives the result (here: normal everyday noise plus rare disruptions), simulate thousands of months and sort them. See <a href="#monte-carlo-risk">Monte Carlo risk simulation</a>. The “true” lines here come from 40,000 simulated months of the model.</li>
          </ul>
        </section>
        <section>
          <h2>Why CVaR is usually the better number</h2>
          <p>VaR is a threshold, so it can't see what's beyond it. Raise the disruption cost from $250k to $600k with a 4% chance: 95% VaR barely moves, because fewer than 5% of months are hit, but CVaR jumps. Artzner and colleagues also showed VaR can break diversification: two units' combined VaR can be more than the sum of their separate VaRs. Expected shortfall never does that, which is why bank regulation switched to it.</p>
        </section>
        <section>
          <h2>Using it in a supply chain</h2>
          <p>Swap “profit” for whatever hurts: freight spend over budget, margin lost to stock-outs, cost of expediting. Report it as “in 1 month out of 20 we expect to lose at least $X, and on those months $Y on average”. Then compare options (a second supplier, more safety stock, insurance) by how much they cut CVaR for what they cost. See <a href="#stress-test">stress tests</a> for single named scenarios and <a href="#supplier-disruption">supplier disruption</a> for where the big losses come from.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>At 95% the normal VaR is actually above the true VaR, yet its CVaR is far below. Move to 99%: now the normal VaR is too low as well.</li>
            <li>Set the disruption chance to 0: everything is normal, and all the lines meet.</li>
            <li>Press “New history” a few times at 99% with 60 months: the historical VaR swings wildly. Then try 240 months.</li>
            <li>Raise the disruption cost to $600k at 95%: VaR hardly changes, CVaR does.</li>
          </ul>
        </section>`,
    });

    const MU = 40, SD = 60, LSD = 0.6;
    let seed = 7;
    const month = (r, q, S) => -(MU + SD * r.normal()) + (r() < q ? S * Math.exp(LSD * r.normal() - (LSD * LSD) / 2) : 0);
    const kOf = (a, n) => Math.floor((1 - a) * n + 1e-9) + 1;
    const hist = (sorted, a) => { const k = kOf(a, sorted.length), v = sorted[k - 1]; let s = 0; for (let i = 0; i < k; i++) s += sorted[i]; return { k, var: v, cvar: s / k }; };
    const zq = (p) => { // inverse standard normal (Acklam)
      const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239], b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572], c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
      if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
      if (p > 1 - 0.02425) return -zq(1 - p);
      const q = p - 0.5, r = q * q; return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    };
    const phi = (z) => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    const normVC = (mu, sd, a) => { const z = zq(a); return { var: mu + z * sd, cvar: mu + (sd * phi(z)) / (1 - a) }; };
    let MC = [], H = [], T = [];
    function simMC() { const r = rng(99), q = +$("#q").value, S = +$("#S").value; MC = Array.from({ length: 40000 }, () => month(r, q, S)).sort((x, y) => y - x); }
    function simH() { const r = rng(seed), q = +$("#q").value, S = +$("#S").value, n = +$("#n").value; H = Array.from({ length: n }, (_, i) => ({ i, L: month(r, q, S) })); const r2 = rng(seed + 500); T = Array.from({ length: 60 }, () => month(r2, q, S)); }
    function stats() {
      const a = +$("#a").value, hs = H.map((h) => h.L).sort((x, y) => y - x), n = hs.length, mu = hs.reduce((s, x) => s + x, 0) / n, sd = Math.sqrt(hs.reduce((s, x) => s + (x - mu) ** 2, 0) / (n - 1));
      return { a, hs, n, mu, sd, hv: hist(hs, a), nv: normVC(mu, sd, a), tv: hist(MC, a) };
    }
    const C1 = new Plot($("#c1"), { pad: { l: 50, b: 38 } }), C2 = new Plot($("#c2"), { x: [0.8, 0.995], pad: { l: 50, b: 38 } }), C3 = new Plot($("#c3"), { x: [0, 61], pad: { l: 50, b: 38 } });
    const vline = (P, x, col, dash, label, row) => { P.path([x, x], [P.y[0], P.y[1]], col, 2, dash); const g = P.ctx, lx = P.w - P.pad.r - 150, ly = P.pad.t + 12 + row * 17; g.save(); g.strokeStyle = col; g.lineWidth = 2; if (dash) g.setLineDash(dash); g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 22, ly); g.stroke(); g.restore(); g.font = `600 11px ${css("--font-body")}`; g.fillStyle = col; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(label, lx + 28, ly); };
    function d1(St) {
      const lo = -200, hi = Math.max(300, Math.min(MC[0], MC[Math.floor(MC.length * 0.0005)] * 1.1)), B = 70, w = (hi - lo) / B, cnt = new Array(B).fill(0);
      MC.forEach((x) => { const b = Math.floor((x - lo) / w); if (b >= 0 && b < B) cnt[b]++; else if (b >= B) cnt[B - 1]++; });
      const mx = Math.max(...cnt) / MC.length;
      C1.resize(); C1.x = [lo, hi]; C1.y = [0, mx * 1.15]; C1.clear(); C1.axes({ xLabel: "loss in the month, $k (right = worse)", yLabel: "share of months", yFormat: (v) => fmt(v * 100, 1) + "%", xFormat: (v) => fmt(v, 0) });
      const g = C1.ctx;
      cnt.forEach((c, b) => { const x0 = lo + b * w, tail = x0 + w / 2 >= St.tv.var; g.fillStyle = css(tail ? "--bad" : "--accent"); g.globalAlpha = tail ? 0.75 : 0.4; const px = Math.round(C1.sx(x0)), px1 = Math.round(C1.sx(x0 + w)); g.fillRect(px, C1.sy(c / MC.length), Math.max(1, px1 - px - 1), C1.sy(0) - C1.sy(c / MC.length)); });
      g.globalAlpha = 1;
      vline(C1, St.tv.var, css("--bad"), null, `true VaR ${fmt(St.tv.var, 0)}`, 0);
      vline(C1, St.tv.cvar, css("--bad"), [6, 4], `true CVaR ${fmt(St.tv.cvar, 0)}`, 1);
      vline(C1, St.nv.var, css("--accent"), [2, 3], `normal VaR ${fmt(St.nv.var, 0)}`, 2);
      vline(C1, St.hv.var, css("--violet"), [8, 3], `history VaR ${fmt(St.hv.var, 0)}`, 3);
      const dis = MC.filter((x) => x > 200).length / MC.length;
      $("#c1Cap").innerHTML = `The big hump is ordinary months; the long right tail is disruptions (${fmt(dis * 100, 1)}% of months lose more than $200k). Red: the worst ${fmt((1 - St.a) * 100, 1)}% of months, beyond the true VaR. Blue dotted: VaR from a normal curve fitted to your ${St.n} months. Purple: VaR read straight off your ${St.n} months.`;
    }
    function d2(St) {
      const as = []; for (let a = 0.8; a <= 0.9951; a += 0.0025) as.push(a);
      const tv = as.map((a) => hist(MC, a)), nv = as.map((a) => normVC(St.mu, St.sd, a)), top = Math.max(...tv.map((t) => t.cvar), ...nv.map((t) => t.cvar)) * 1.08;
      C2.resize(); C2.y = [Math.min(0, ...nv.map((t) => t.var)), top]; C2.clear(); C2.axes({ xLabel: "confidence level", yLabel: "$k", xFormat: (v) => fmt(v * 100, 0) + "%", xTicks: [0.8, 0.85, 0.9, 0.95, 0.99], yFormat: (v) => fmt(v, 0) });
      C2.path(as, tv.map((t) => t.var), css("--bad"), 2.5); C2.path(as, tv.map((t) => t.cvar), css("--bad"), 2, [6, 4]);
      C2.path(as, nv.map((t) => t.var), css("--accent"), 2.5); C2.path(as, nv.map((t) => t.cvar), css("--accent"), 2, [6, 4]);
      C2.path([St.a, St.a], C2.y, css("--muted"), 1, [3, 3]);
      $("#c2Cap").innerHTML = `Red: true (from the simulation). Blue: normal curve fitted to your history. Solid: VaR. Dashed: CVaR. At ${fmt(St.a * 100, 1)}% the normal curve says VaR ${fmt(St.nv.var, 0)}, CVaR ${fmt(St.nv.cvar, 0)}; the truth is ${fmt(St.tv.var, 0)} and ${fmt(St.tv.cvar, 0)}. The gap widens as you go further into the tail.`;
    }
    function wk(St) {
      const k = St.hv.k, show = Math.min(St.n, Math.max(k + 2, 6));
      const rows = St.hs.slice(0, show).map((L, i) => `<tr style="border-top:1px solid var(--line);${i < k ? "background:color-mix(in srgb, var(--bad) 12%, var(--surface))" : ""}"><td style="padding:3px 8px">${i + 1}</td><td style="padding:3px 8px;text-align:right">${fmt(L, 1)}</td><td style="padding:3px 8px;color:var(--muted)">${i === k - 1 ? "← VaR" : i < k ? "in CVaR average" : ""}</td></tr>`).join("");
      const z = zq(St.a);
      $("#wk").innerHTML = `<p style="margin:0 0 8px">Your ${St.n} months, worst first. (1 − ${fmt(St.a, 3)}) × ${St.n} = ${fmt((1 - St.a) * St.n, 2)}, so up to ${k - 1} month${k - 1 === 1 ? "" : "s"} may be worse than VaR: VaR is month #${k}.</p>
        <div style="overflow-x:auto"><table style="border-collapse:collapse;font:.8rem var(--font-mono);white-space:nowrap"><thead><tr style="color:var(--muted)"><th style="padding:3px 8px;text-align:left">rank</th><th style="padding:3px 8px;text-align:right">loss $k</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
        <p style="margin:10px 0 0;font:.8rem/1.6 var(--font-mono)">History VaR = <b>${fmt(St.hv.var, 1)}</b><br>History CVaR = average of ${k} worst = <b>${fmt(St.hv.cvar, 1)}</b><br>Normal VaR = ${fmt(St.mu, 1)} + ${fmt(z, 3)} × ${fmt(St.sd, 1)} = <b>${fmt(St.nv.var, 1)}</b><br>Normal CVaR = ${fmt(St.mu, 1)} + ${fmt(St.sd, 1)} × φ(${fmt(z, 2)}) / ${fmt(1 - St.a, 3)} = <b>${fmt(St.nv.cvar, 1)}</b></p>`;
    }
    function kupiec(x, n, p) {
      const ll0 = (n - x) * Math.log(1 - p) + x * Math.log(p), ph = x / n, ll1 = (x === 0 ? 0 : x * Math.log(ph)) + (x === n ? 0 : (n - x) * Math.log(1 - ph)), LR = Math.max(0, -2 * (ll0 - ll1));
      const erfc = (z) => { const t = 1 / (1 + 0.5 * z), y = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return y; };
      return erfc(Math.sqrt(LR / 2));
    }
    function d3(St) {
      const top = Math.max(St.nv.var, St.hv.var, ...T) * 1.1, bot = Math.min(...T) * 1.1;
      C3.resize(); C3.y = [bot, top]; C3.clear(); C3.axes({ xLabel: "month in the new period", yLabel: "loss $k", xTicks: [1, 12, 24, 36, 48, 60], xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const g = C3.ctx, bw = Math.max(2, C3.iw / 61 - 2), xn = T.filter((x) => x > St.nv.var).length, xh = T.filter((x) => x > St.hv.var).length;
      T.forEach((L, i) => { const over = L > Math.min(St.nv.var, St.hv.var); g.fillStyle = css(over ? "--bad" : "--muted"); g.globalAlpha = over ? 0.9 : 0.45; const y0 = C3.sy(0), y1 = C3.sy(L); g.fillRect(C3.sx(i + 1) - bw / 2, Math.min(y0, y1), bw, Math.abs(y1 - y0)); });
      g.globalAlpha = 1;
      C3.path([0, 61], [St.nv.var, St.nv.var], css("--accent"), 2, [2, 3]); C3.path([0, 61], [St.hv.var, St.hv.var], css("--violet"), 2, [8, 3]);
      const exp = (1 - St.a) * 60, p = 1 - St.a, pn = kupiec(xn, 60, p), ph = kupiec(xh, 60, p);
      $("#c3Cap").innerHTML = `60 months the VaR never saw. Red bars beat at least one VaR line. Expected exceptions at ${fmt(St.a * 100, 1)}%: ${fmt(exp, 1)}. Normal VaR (blue): <b>${xn}</b> exceptions, Kupiec p = ${fmt(pn, 3)}${pn < 0.05 ? (xn > exp ? " (rejected: it understates risk)" : " (rejected: too cautious, it overstates risk)") : ""}. History VaR (purple): <b>${xh}</b>, p = ${fmt(ph, 3)}${ph < 0.05 ? (xh > exp ? " (rejected: it understates risk)" : " (rejected: too cautious)") : ""}. With only 60 months the test has little power, so passing isn't proof.`;
      return { xn, xh };
    }
    function readouts(St) {
      const gap = (St.tv.cvar - St.nv.cvar) / St.tv.cvar;
      $("#ro").innerHTML = [
        ["VaR from your history", `<span class="num">$${fmt(St.hv.var, 0)}k</span>`],
        ["CVaR from your history", `<span class="num">$${fmt(St.hv.cvar, 0)}k</span>`],
        ["VaR, normal curve", `<span class="num">$${fmt(St.nv.var, 0)}k</span>`],
        ["True VaR / CVaR", `<span class="num">$${fmt(St.tv.var, 0)}k / $${fmt(St.tv.cvar, 0)}k</span>`],
        ["Normal CVaR understates the tail by", `<span class="pill ${gap > 0.25 ? "bad" : gap > 0.1 ? "warn" : "ok"}">${fmt(Math.max(0, gap) * 100, 0)}%</span>`],
      ].map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { $("#aV").textContent = fmt(+$("#a").value * 100, 1) + "%"; $("#qV").textContent = fmt(+$("#q").value * 100, 1) + "%"; $("#SV").textContent = "$" + $("#S").value + "k"; $("#nV").textContent = $("#n").value; }
    function draw() { labels(); const St = stats(); d1(St); d2(St); wk(St); d3(St); readouts(St); }
    $("#a").addEventListener("input", draw);
    ["q", "S"].forEach((id) => $("#" + id).addEventListener("input", () => { simMC(); simH(); draw(); }));
    $("#n").addEventListener("input", () => { simH(); draw(); });
    $("#resim").addEventListener("click", () => { seed++; simH(); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 7; simMC(); simH(); draw(); });
    simMC(); simH(); draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
