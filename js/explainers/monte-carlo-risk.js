Lab.register({
  id: "monte-carlo-risk",
  group: "Risk",
  title: "Monte Carlo risk simulation",
  blurb: "Replace single-number guesses with ranges, roll the dice thousands of times, and get the chance of a loss, P10/P50/P90 outcomes and which input matters most. Also shows the “flaw of averages”: a plan built on average inputs overstates profit.",
  lede: "Every plan rests on guesses: demand, exchange rate, freight, selling price. A spreadsheet with one number per guess gives one answer and no idea of the risk. Monte Carlo simulation draws each guess at random from a range, works out the result, and repeats thousands of times. The spread of results shows how likely a loss is, what a bad year looks like, and which guess deserves the most attention.",
  quiz: [
    ["What is the “flaw of averages”?", "Plugging average inputs into a model doesn't give the average output when the model has limits or curves. Here you can't sell more than you ordered, so high demand is capped but low demand hurts in full. The plan with average demand is too rosy."],
    ["How many runs are enough?", "Enough that the answer stops moving. The standard error of the mean shrinks like 1/√n: 4 times the runs halves the error. 1,000 runs often settle a mean; tail probabilities like a 2% chance of a big loss need many more."],
    ["What does P90 mean here?", "The profit that 90% of runs fall below; only 10% do better. P10 is the bad-year figure: 10% of runs come in under it."],
    ["What does the tornado chart show?", "For each input, how far profit swings when that input moves from its P10 to its P90 while the others stay at their averages. The longest bar is where better information or a hedge is worth most."],
    ["What is the biggest trap in Monte Carlo?", "Inputs that move together but are simulated as independent. If a weak dollar comes with weak demand, treating them separately understates the bad tail. Use correlated draws, or simulate the shared driver."],
  ],
  diy: {
    intro: "One run per row, 5,000 rows. Order quantity in H1. Sell price $50, unit cost $20 in euros, salvage $5 per unsold unit.",
    steps: [
      ["Demand: normal around 10,000.", "A2: =MAX(0, NORM.INV(RAND(), 10000, 2500))"],
      ["Exchange rate (dollars per euro).", "B2: =NORM.INV(RAND(), 1, 0.08)"],
      ["Freight per unit: lognormal with mean $3.", "C2: =LOGNORM.INV(RAND(), LN(3)-0.3^2/2, 0.3)"],
      ["Selling price: triangular between $40 and $52, most likely $50.", "D2: =IF(RAND()<(50-40)/(52-40), 40+SQRT(RAND()*(52-40)*(50-40)), 52-SQRT((1-RAND())*(52-40)*(52-50)))   (use one RAND() in a helper cell for both halves)"],
      ["Profit for the run.", "E2: =D2*MIN(A2,$H$1) + 5*MAX(0,$H$1-A2) - $H$1*(20*B2 + C2)"],
      ["Fill down 5,000 rows, then summarise.", "=AVERAGE(E2:E5001)   =COUNTIF(E2:E5001,\"<0\")/5000   =PERCENTILE.INC(E2:E5001, 0.1)   =PERCENTILE.INC(E2:E5001, 0.9)"],
      ["Standard error of the mean (how much more running would change it).", "=STDEV.S(E2:E5001)/SQRT(5000)"],
    ],
  },
  deeper: [
    ["Metropolis & Ulam (1949), The Monte Carlo method, JASA 44(247)", "https://doi.org/10.1080/01621459.1949.10483310", "the paper that named the method"],
    ["Hertz (1964), Risk analysis in capital investment, Harvard Business Review", "https://hbr.org/1979/09/risk-analysis-in-capital-investment", "brought simulation into business planning"],
    ["Savage (2002), The flaw of averages, Harvard Business Review", "https://hbr.org/2002/11/the-flaw-of-averages", "why plans built on averages are wrong on average"],
    ["Iman & Conover (1982), A distribution-free approach to inducing rank correlation among input variables, Communications in Statistics 11(3)", "https://doi.org/10.1080/03610918208812265", "how to simulate inputs that move together"],
    ["Owen (2013), Monte Carlo theory, methods and examples", "https://artowen.su.domains/mc/", "a free, thorough textbook"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="10" width="22" height="22" rx="4"/><circle cx="14" cy="16" r="1.6" fill="currentColor"/><circle cx="24" cy="26" r="1.6" fill="currentColor"/><path d="M40 56 V44 M48 56 V30 M56 56 V18 M64 56 V24 M72 56 V38 M80 56 V48" stroke-width="5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("Profit across all the runs")}</div><canvas id="c1" style="height:290px" aria-label="Histogram of simulated profit with P10, P50, P90 and the plan based on averages"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "Which input matters most? (tornado)", 260, "Swing in profit as each input moves from its P10 to its P90"), fig("c3", "Has it settled? Estimate vs number of runs", 260, "Running average profit and chance of a loss as runs accumulate"))}
        <div class="plot wide" style="padding:14px;margin-top:14px;overflow-x:auto">${h4("The first 8 runs, worked out")}<div id="tbl"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">You order a seasonal product from a European supplier: pay €20 a unit plus freight, sell at up to $50, and clear leftovers at $5. Demand, the exchange rate, freight and the selling price are all uncertain.</p>
        <div class="ctrl"><label for="Q">Units ordered <output id="QV"></output></label><input type="range" id="Q" min="6000" max="15000" step="250" value="11000"></div>
        <div class="ctrl"><label for="dsd">Demand uncertainty (± 1 sd around 10,000) <output id="dsdV"></output></label><input type="range" id="dsd" min="0" max="4000" step="100" value="2500"></div>
        <div class="ctrl"><label for="fx">Exchange-rate uncertainty (± 1 sd) <output id="fxV"></output></label><input type="range" id="fx" min="0" max="0.2" step="0.005" value="0.08"></div>
        <div class="ctrl"><label for="fr">Freight uncertainty (spread) <output id="frV"></output></label><input type="range" id="fr" min="0" max="0.8" step="0.05" value="0.3"></div>
        <div class="ctrl"><label for="n">Runs <output id="nV"></output></label><input type="range" id="n" min="2" max="4.3" step="0.1" value="3.7"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn primary" id="again" type="button">Run again (new random numbers)</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The recipe</h2>
          <ol>
            <li>Write the result as a formula of the inputs: profit = price × units sold + salvage − units ordered × (€20 × exchange rate + freight).</li>
            <li>Replace each uncertain input with a distribution: normal for demand, lognormal for freight (it can spike but never goes negative), triangular for price (a low, likely and high value from the sales team).</li>
            <li>Draw one value of each input, work out profit, and record it. Repeat thousands of times.</li>
            <li>Summarise the pile of results: average, chance of a loss, P10/P50/P90, <a href="#var-cvar">VaR and CVaR</a>.</li>
          </ol>
        </section>
        <section>
          <h2>The flaw of averages</h2>
          <p>Units sold = min(demand, units ordered). If demand comes in above the order, the extra is lost; if below, the unsold units cost you nearly their full price. Because of that cap, the average of the profits is lower than the profit at the average demand. The gap is the value the single-number plan quietly assumes away, and it grows with uncertainty. Set demand uncertainty to 0 and it disappears. The same logic sits behind the <a href="#newsvendor">newsvendor</a> rule.</p>
        </section>
        <section>
          <h2>How accurate is the simulation itself?</h2>
          <p>Each run is a random draw, so the summary has its own error. For the mean, the standard error is sd / √n: the shaded band in the convergence chart. A chance of loss p has standard error √(p(1−p)/n). Run more until the band is narrower than the precision you need. “Run again” shows how much a small simulation wobbles.</p>
        </section>
        <section>
          <h2>Tornado charts and what to do next</h2>
          <p>The tornado moves one input at a time from its P10 to its P90 and holds the rest at their averages. The longest bar is where a hedge (an FX forward), a contract (fixed freight) or better information (a pre-season order book, see <a href="#value-of-information">value of information</a>) pays back most. Inputs with short bars can stay as single numbers.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Drop runs to 100 and press “Run again” several times: P(loss) jumps around. At 20,000 it barely moves.</li>
            <li>Set demand uncertainty to 0: the plan and the simulation agree. Raise it to 4,000: the gap opens.</li>
            <li>Order 14,000 units: the average profit falls and the chance of a loss rises sharply.</li>
            <li>Raise exchange-rate uncertainty to 20%: the FX bar overtakes demand in the tornado.</li>
          </ul>
        </section>`,
    });
    const PRICE = [40, 50, 52], COST = 20, SALV = 5, FR = 3;
    const tri = (u, [a, m, b]) => (u < (m - a) / (b - a) ? a + Math.sqrt(u * (b - a) * (m - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - m)));
    const triMean = (a, m, b) => (a + m + b) / 3;
    let seed = 1, R = [];
    const P = () => ({ Q: +$("#Q").value, dsd: +$("#dsd").value, fx: +$("#fx").value, fr: +$("#fr").value, n: Number(Math.pow(10, +$("#n").value).toPrecision(2)) });
    const profit = (p, D, X, F, pr) => pr * Math.min(D, p.Q) + SALV * Math.max(0, p.Q - D) - p.Q * (COST * X + F);
    function sim() {
      const p = P(), r = rng(seed);
      R = Array.from({ length: p.n }, () => { const D = Math.max(0, 10000 + p.dsd * r.normal()), X = 1 + p.fx * r.normal(), F = FR * Math.exp(p.fr * r.normal() - (p.fr * p.fr) / 2), pr = tri(r(), PRICE); return { D, X, F, pr, v: profit(p, D, X, F, pr) }; });
    }
    const q = (s, f) => { const i = (s.length - 1) * f, lo = Math.floor(i); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (i - lo); };
    function stats() {
      const p = P(), v = R.map((x) => x.v), s = [...v].sort((a, b) => a - b), n = v.length, mean = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1));
      const plan = profit(p, 10000, 1, FR, triMean(...PRICE)), pl = v.filter((x) => x < 0).length / n;
      return { p, s, n, mean, sd, se: sd / Math.sqrt(n), plan, pl, p10: q(s, 0.1), p50: q(s, 0.5), p90: q(s, 0.9) };
    }
    const k$ = (v) => (v < 0 ? "−$" : "$") + fmt(Math.abs(v) / 1000, 0) + "k";
    const C1 = new Plot($("#c1"), { pad: { l: 50, b: 38 } }), C2 = new Plot($("#c2"), { pad: { l: 96, r: 16, b: 38 } }), C3 = new Plot($("#c3"), { pad: { l: 56, r: 50, b: 38 } });
    function d1(St) {
      const lo = Math.min(St.s[0], St.plan, -20000), hi = Math.max(St.s[St.n - 1], St.plan) * 1.02, B = Math.max(12, Math.min(60, Math.round(Math.sqrt(St.n) * 1.5))), w = (hi - lo) / B, cnt = new Array(B).fill(0);
      St.s.forEach((x) => { cnt[Math.min(B - 1, Math.floor((x - lo) / w))]++; });
      C1.resize(); C1.x = [lo, hi]; C1.y = [0, (Math.max(...cnt) / St.n) * 1.2]; C1.clear(); C1.axes({ xLabel: "profit for the season", yLabel: "share of runs", xFormat: k$, yFormat: (v) => fmt(v * 100, 0) + "%" });
      const g = C1.ctx;
      cnt.forEach((c, b) => { const x0 = lo + b * w, neg = x0 + w / 2 < 0; g.fillStyle = css(neg ? "--bad" : "--accent"); g.globalAlpha = neg ? 0.7 : 0.45; const a = Math.round(C1.sx(x0)), e = Math.round(C1.sx(x0 + w)); g.fillRect(a, C1.sy(c / St.n), Math.max(1, e - a - 1), C1.sy(0) - C1.sy(c / St.n)); });
      g.globalAlpha = 1;
      const L = [[St.p10, "--warm", [5, 4], "P10"], [St.p50, "--ink", [5, 4], "P50"], [St.p90, "--good", [5, 4], "P90"], [St.mean, "--accent", null, "average"], [St.plan, "--violet", [2, 3], "plan"]];
      L.forEach(([x, c, d, t], i) => { C1.path([x, x], C1.y, css(c), 2, d); const lx = C1.pad.l + 10, ly = C1.pad.t + 28 + i * 15; g.save(); g.strokeStyle = css(c); g.lineWidth = 2; if (d) g.setLineDash(d); g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 20, ly); g.stroke(); g.restore(); g.font = `600 11px ${css("--font-body")}`; g.fillStyle = css(c); g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(`${t} ${k$(x)}`, lx + 26, ly); });
      $("#c1Cap").innerHTML = `${St.n.toLocaleString()} runs. Red: runs that lose money (${fmt(St.pl * 100, 1)}%). P10 ${k$(St.p10)}, P50 ${k$(St.p50)}, P90 ${k$(St.p90)}. Average ${k$(St.mean)}, while the plan built from average inputs says <b>${k$(St.plan)}</b>: the flaw of averages is worth ${k$(St.plan - St.mean)} here.`;
    }
    function d2(St) {
      const p = St.p, base = { D: 10000, X: 1, F: FR, pr: triMean(...PRICE) }, z = 1.2816;
      const ins = [
        ["Demand", "D", [10000 - z * p.dsd, 10000 + z * p.dsd], (v) => fmt(v, 0)],
        ["Exchange rate", "X", [1 + z * p.fx, 1 - z * p.fx], (v) => fmt(v, 3)],
        ["Freight", "F", [FR * Math.exp(z * p.fr - p.fr * p.fr / 2), FR * Math.exp(-z * p.fr - p.fr * p.fr / 2)], (v) => "$" + fmt(v, 2)],
        ["Selling price", "pr", [tri(0.1, PRICE), tri(0.9, PRICE)], (v) => "$" + fmt(v, 1)],
      ].map(([n, k, [a, b], f]) => { const lo = profit(p, ...Object.values({ ...base, [k]: a })), hi = profit(p, ...Object.values({ ...base, [k]: b })); return { n, a, b, f, lo: Math.min(lo, hi), hi: Math.max(lo, hi), sw: Math.abs(hi - lo) }; }).sort((x, y) => y.sw - x.sw);
      const mid = profit(p, base.D, base.X, base.F, base.pr), lo = Math.min(mid, ...ins.map((i) => i.lo)), hi = Math.max(mid, ...ins.map((i) => i.hi)), pad = (hi - lo) * 0.08 + 1;
      C2.resize(); C2.x = [lo - pad, hi + pad]; C2.y = [0, ins.length]; C2.clear(); C2.axes({ xLabel: "profit with only this input at its P10 or P90", xFormat: k$, yTicks: [], xCount: 5 });
      const g = C2.ctx, bh = C2.ih / ins.length;
      ins.forEach((it, i) => { const y = C2.pad.t + i * bh; g.fillStyle = css("--bad"); g.globalAlpha = 0.7; g.fillRect(C2.sx(it.lo), y + bh * 0.22, C2.sx(mid) - C2.sx(it.lo), bh * 0.56); g.fillStyle = css("--good"); g.fillRect(C2.sx(mid), y + bh * 0.22, C2.sx(it.hi) - C2.sx(mid), bh * 0.56); g.globalAlpha = 1;
        g.fillStyle = css("--ink"); g.font = `12px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(it.n, C2.pad.l - 8, y + bh / 2); });
      C2.path([mid, mid], [0, ins.length], css("--ink"), 1.5);
      const t = ins[0];
      $("#c2Cap").innerHTML = `Bars start at the plan (${k$(mid)}). Red: the input's bad end; green: its good end. Biggest swing: <b>${t.n}</b>, from ${t.f(t.a)} to ${t.f(t.b)}, moves profit by ${k$(t.sw)}.`;
    }
    function d3(St) {
      const n = St.n, xs = [], ms = [], los = [], his = [], pls = []; let s = 0, s2 = 0, neg = 0;
      R.forEach((r, i) => { s += r.v; s2 += r.v * r.v; if (r.v < 0) neg++; const k = i + 1; if (k >= 10 && (k < 200 || k % Math.max(1, Math.floor(n / 400)) === 0 || k === n)) { const m = s / k, sd = Math.sqrt(Math.max(0, s2 / k - m * m)); xs.push(Math.log10(k)); ms.push(m); los.push(m - 1.96 * sd / Math.sqrt(k)); his.push(m + 1.96 * sd / Math.sqrt(k)); pls.push(neg / k); } });
      if (!xs.length) return;
      const lo = Math.min(...los.slice(Math.floor(los.length * 0.1))), hi = Math.max(...his.slice(Math.floor(his.length * 0.1)));
      C3.resize(); C3.x = [1, Math.max(2, Math.log10(n))]; C3.y = [lo - (hi - lo) * 0.1, hi + (hi - lo) * 0.1]; C3.clear(); C3.axes({ xLabel: "runs so far", yLabel: "average profit", xTicks: [1, 2, 3, 4].filter((v) => v <= C3.x[1]), xFormat: (v) => fmt(Math.pow(10, v), 0), yFormat: k$ });
      const g = C3.ctx; C3.clip(() => { g.beginPath(); xs.forEach((x, i) => g.lineTo(C3.sx(x), C3.sy(his[i]))); for (let i = xs.length - 1; i >= 0; i--) g.lineTo(C3.sx(xs[i]), C3.sy(los[i])); g.closePath(); g.fillStyle = css("--accent"); g.globalAlpha = 0.18; g.fill(); g.globalAlpha = 1; });
      C3.path(xs, ms, css("--accent"), 2);
      const pmax = Math.max(0.05, ...pls) * 1.1, toY = (v) => C3.y[0] + (v / pmax) * (C3.y[1] - C3.y[0]);
      C3.path(xs, pls.map(toY), css("--bad"), 1.5, [4, 3]);
      g.font = `11px ${css("--font-mono")}`; g.fillStyle = css("--bad"); g.textAlign = "left"; g.textBaseline = "middle"; [0, 0.5, 1].forEach((f) => g.fillText(fmt(f * pmax * 100, 0) + "%", C3.w - C3.pad.r + 6, C3.sy(toY(f * pmax))));
      $("#c3Cap").innerHTML = `Blue: running average with its 95% band (± 1.96 × sd / √runs). Red dashed: running chance of a loss (right axis). After ${n.toLocaleString()} runs the average is ${k$(St.mean)} ± ${k$(1.96 * St.se)}; the chance of a loss is ${fmt(St.pl * 100, 1)}% ± ${fmt(196 * Math.sqrt(St.pl * (1 - St.pl) / n), 1)} points.`;
    }
    function tbl(St) {
      const p = St.p;
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.78rem var(--font-mono);white-space:nowrap"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 8px;text-align:left">run</th><th style="padding:3px 8px">demand</th><th style="padding:3px 8px">$ per €</th><th style="padding:3px 8px">freight</th><th style="padding:3px 8px">price</th><th style="padding:3px 8px;text-align:left">profit = price × sold + $5 × left over − units × (€20 × rate + freight)</th></tr></thead><tbody>` +
        R.slice(0, 8).map((r, i) => { const sold = Math.min(r.D, p.Q), left = Math.max(0, p.Q - r.D); return `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 8px;text-align:left">${i + 1}</td><td style="padding:3px 8px">${fmt(r.D, 0)}</td><td style="padding:3px 8px">${fmt(r.X, 3)}</td><td style="padding:3px 8px">${fmt(r.F, 2)}</td><td style="padding:3px 8px">${fmt(r.pr, 2)}</td><td style="padding:3px 8px;text-align:left">${fmt(r.pr, 2)} × ${fmt(sold, 0)} + 5 × ${fmt(left, 0)} − ${p.Q.toLocaleString()} × (20 × ${fmt(r.X, 3)} + ${fmt(r.F, 2)}) = <b style="color:var(${r.v < 0 ? "--bad" : "--ink"})">${k$(r.v)}</b></td></tr>`; }).join("") + `</tbody></table>`;
    }
    function readouts(St) {
      $("#ro").innerHTML = [
        ["Plan with average inputs", `<span class="num">${k$(St.plan)}</span>`],
        ["Average over the runs", `<span class="num">${k$(St.mean)} ± ${k$(1.96 * St.se)}</span>`],
        ["Chance of a loss", `<span class="pill ${St.pl > 0.2 ? "bad" : St.pl > 0.05 ? "warn" : "ok"}">${fmt(St.pl * 100, 1)}%</span>`],
        ["P10 / P90", `<span class="num">${k$(St.p10)} / ${k$(St.p90)}</span>`],
      ].map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { const p = P(); $("#QV").textContent = p.Q.toLocaleString(); $("#dsdV").textContent = "± " + p.dsd.toLocaleString(); $("#fxV").textContent = "± " + fmt(p.fx * 100, 1) + "%"; $("#frV").textContent = fmt(p.fr, 2); $("#nV").textContent = p.n.toLocaleString(); }
    function draw() { labels(); const St = stats(); d1(St); d2(St); d3(St); tbl(St); readouts(St); }
    root.querySelectorAll("input[type=range]").forEach((e) => e.addEventListener("input", () => { sim(); draw(); }));
    $("#again").addEventListener("click", () => { seed++; sim(); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 1; sim(); draw(); });
    sim(); draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
