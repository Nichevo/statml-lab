Lab.register({
  id: "distributions",
  group: "Data quality",
  title: "Looking at a distribution: histograms, Q-Q plots and logs",
  blurb: "Is your data roughly normal, skewed, heavy-tailed or two groups mixed together? Read it from a histogram and a Q-Q plot, then see what a log transform does.",
  lede: "Many methods quietly assume the data are roughly normal: z-score outlier rules, prediction intervals, t-tests, safety stock formulas. Real business data often aren't. Sales per SKU are right-skewed, lead times have long tails, and a mix of two customer types gives two humps. A histogram shows the shape; a Q-Q plot shows exactly where it departs from normal. Often a log transform is all it takes to make skewed data well behaved.",
  quiz: [
    ["On a Q-Q plot against the normal, the points bend upwards at the right end. What does that mean?", "The largest values are bigger than a normal distribution would give: a long right tail (right skew). If both ends bend away from the line in opposite directions (low end down, high end up), the tails are heavy on both sides."],
    ["Mean 120, median 85. Which way is the data skewed?", "Right (positive) skew. A few large values pull the mean above the median. The median is the better 'typical' value here."],
    ["Why does taking logs help with right-skewed sales data?", "Logs turn multiplicative differences into additive ones: 10 → 100 and 100 → 1000 become equal steps. Big values are pulled in more than small ones, so a long right tail becomes roughly symmetric. Many skewed business measures are close to lognormal."],
    ["Your data contain zeros. Can you take logs?", "Not directly, since log(0) is undefined. Common fixes: log(x + 1), a square root, or modelling the zeros separately (as in intermittent demand)."],
    ["Excess kurtosis is 4. What should you worry about?", "Heavy tails: extreme values happen much more often than a normal distribution predicts. Normal-based intervals and safety stock will be too narrow for the rare big events."],
    ["The histogram has two clear humps. What's the best next step?", "Look for the grouping variable behind it (two customer types, two plants, before and after a change) and analyse the groups separately. No transform fixes a mixture."],
  ],
  diy: {
    intro: "Put your values in A2:A201. Sort a copy of them ascending into B2:B201 for the Q-Q plot (=SORT(A2:A201) in Excel 365).",
    steps: [
      ["Summary shape statistics. SKEW near 0 means symmetric; KURT is excess kurtosis (0 for a normal).", "D1: =AVERAGE(A2:A201)\nD2: =MEDIAN(A2:A201)\nD3: =STDEV.S(A2:A201)\nD4: =SKEW(A2:A201)\nD5: =KURT(A2:A201)"],
      ["Histogram bins. Choose a bin width (here with the Freedman–Diaconis rule), then list bin upper edges in F2 down.", "D7: =2*(QUARTILE.INC(A2:A201,3)-QUARTILE.INC(A2:A201,1))/COUNT(A2:A201)^(1/3)\nF2: =MIN(A2:A201)+D7\nF3: =F2+$D$7   (fill down)"],
      ["Counts per bin. FREQUENCY spills in Excel 365; in older Excel select G2:G30 and confirm with Ctrl+Shift+Enter. Chart G against F as a column chart.", "G2: =FREQUENCY(A2:A201,F2:F30)"],
      ["Q-Q plot: the plotting position for the i-th sorted value (i = 1 … n).", "C2: =(ROW()-1-0.5)/COUNT($B$2:$B$201)"],
      ["Theoretical normal quantile for that position, scaled to your mean and SD.", "E2: =NORM.INV(C2,$D$1,$D$3)"],
      ["Make an XY scatter with E (theoretical) on the x-axis and B (your sorted data) on the y-axis. Add the line y = x. Points on the line mean 'normal'.", "Insert > Scatter, x = E2:E201, y = B2:B201"],
      ["Log transform and repeat. Use LN(A2+1) if there are zeros. Check SKEW again on the logged column.", "H2: =LN(A2)\n=SKEW(H2:H201)"],
      ["Back-transform results to the original units. The exponential of the mean of logs is the geometric mean, which is close to the median for lognormal data.", "=EXP(AVERAGE(H2:H201))"],
    ],
  },
  deeper: [
    ["Wilk & Gnanadesikan (1968), Probability plotting methods for the analysis of data, Biometrika 55(1)", "https://doi.org/10.1093/biomet/55.1.1", "the original paper on Q-Q plots"],
    ["Box & Cox (1964), An analysis of transformations, JRSS B 26(2)", "https://doi.org/10.1111/j.2517-6161.1964.tb00553.x", "the family of power transforms that includes the log"],
    ["Freedman & Diaconis (1981), On the histogram as a density estimator, Z. Wahrscheinlichkeitstheorie 57", "https://doi.org/10.1007/BF01025868", "the bin-width rule used above"],
    ["Limpert, Stahel & Abbt (2001), Log-normal distributions across the sciences, BioScience 51(5)", "https://doi.org/10.1641/0006-3568(2001)051[0341:LNDATS]2.0.CO;2", "why so much real data is lognormal"],
    ["NIST Engineering Statistics Handbook: Normal probability plot", "https://www.itl.nist.gov/div898/handbook/eda/section3/normprpl.htm", "reading the plot, with examples of each shape"],
    ["Hyndman & Athanasopoulos, FPP3 §3.1: Transformations and adjustments", "https://otexts.com/fpp3/transformations.html", "free textbook: logs and Box-Cox for forecasting"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor" opacity=".35"><rect x="8" y="40" width="8" height="16"/><rect x="17" y="22" width="8" height="34"/><rect x="26" y="14" width="8" height="42"/><rect x="35" y="26" width="8" height="30"/><rect x="44" y="40" width="8" height="16"/><rect x="53" y="48" width="8" height="8"/></g><path d="M66 56 L90 8" stroke-dasharray="3 3"/><g fill="currentColor"><circle cx="68" cy="54" r="2.4"/><circle cx="74" cy="44" r="2.4"/><circle cx="79" cy="35" r="2.4"/><circle cx="84" cy="24" r="2.4"/><circle cx="88" cy="8" r="2.4"/></g></svg>`,

  mount(root) {
    const { Plot, watch, css, rng, qnorm, dnorm } = Lab;
    let seed = 7, shape = "lognormal", tf = "none";
    const SHAPES = [
      ["normal", "Normal"], ["lognormal", "Right-skewed"], ["heavy", "Heavy tails"], ["bimodal", "Two groups"], ["capped", "Capped"],
    ];
    const DESC = {
      normal: "Order sizes from many small independent causes. The bell shape and a straight Q-Q line.",
      lognormal: "Weekly sales per SKU. Most weeks are modest, a few are huge. Typical of anything that grows by percentages.",
      heavy: "Daily price changes or supplier lead-time delays: mostly near the centre, but extreme values far more often than a normal predicts.",
      bimodal: "Order sizes from a mix of small retail customers and large wholesale customers. Two humps.",
      capped: "Sales that hit a capacity or stock limit. Everything above the cap is recorded as the cap (censored).",
    };

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="ds-two">
          <figure class="plot">
            <canvas id="hist" aria-label="Histogram of the data with a fitted normal curve"></canvas>
            <figcaption>Histogram with the normal curve that has the same mean and SD.</figcaption>
          </figure>
          <figure class="plot">
            <canvas id="qq" aria-label="Normal Q-Q plot: sorted data against normal quantiles"></canvas>
            <figcaption>Q-Q plot: each sorted value against where a normal would put it. On the line = normal.</figcaption>
          </figure>
        </div>
        <div class="legend"><span><i style="background:var(--accent)"></i>Data</span><span><i style="background:var(--warm)"></i>Normal with same mean and SD</span><span><i style="background:var(--muted)"></i>Mean (solid) and median (dashed)</span></div>
        <div class="plot" style="padding:14px">
          <h4 class="ds-h">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.ds-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:14px}
        .ds-two figure{margin:0;min-width:0}
        .ds-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}</style>`,
      panel: `
        <div class="ctrl"><label>Data shape</label>
          <div class="seg" id="shape" style="flex-wrap:wrap">${SHAPES.map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${v === shape}">${t}</button>`).join("")}</div></div>
        <p id="desc" style="margin:0 0 14px;font-size:.88rem;color:var(--muted)"></p>
        <div class="ctrl"><label>Transform</label>
          <div class="seg" id="tf"><button type="button" data-v="none" aria-pressed="true">None</button><button type="button" data-v="sqrt" aria-pressed="false">Square root</button><button type="button" data-v="log" aria-pressed="false">Log</button></div></div>
        <div class="ctrl"><label for="n">Sample size <output id="nV"></output></label><input type="range" id="n" min="20" max="1000" step="10" value="200"></div>
        <div class="ctrl"><label for="bins">Bins <output id="binsV"></output></label><input type="range" id="bins" min="0" max="60" step="1" value="0"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New sample</button></div>`,
      notes: `
        <section>
          <h2>Reading a Q-Q plot</h2>
          <p>Sort the data. The i-th smallest value is plotted against the normal quantile at position (i − 0.5) ÷ n. If the data are normal, the points fall on a straight line.</p>
          <ul>
            <li><b>Curves up at both ends like a smile, or bends up on the right:</b> right skew. The big values are too big.</li>
            <li><b>S-shape, low end below and high end above the line:</b> heavy tails on both sides.</li>
            <li><b>A flat step in the middle:</b> two groups, with a gap between them.</li>
            <li><b>Flat run at the top:</b> values piled up at a cap, a sign of censored data.</li>
          </ul>
          <p>Q-Q plots beat histograms for tails, because a histogram's few tail bars are easy to miss and depend on the bin choice.</p>
        </section>
        <section>
          <h2>Shape in numbers</h2>
          <div class="eq">skewness = average of ((x − mean) ÷ SD)³ (×n²/((n−1)(n−2)) in Excel)<br>excess kurtosis = average of ((x − mean) ÷ SD)⁴ − 3 (Excel adds a small-sample correction)</div>
          <p>Rules of thumb: |skew| below 0.5 is fairly symmetric, above 1 is strongly skewed. Excess kurtosis well above 0 means heavy tails. With small samples both numbers jump around a lot, so trust the plot more than the number.</p>
        </section>
        <section>
          <h2>Transforms</h2>
          <p><b>Log</b> suits data where changes are proportional (sales, prices, incomes). <b>Square root</b> is a milder pull, useful for counts. Both are members of the Box-Cox family. Transform, analyse, then transform back, remembering that the back-transformed mean of logs is the <i>geometric</i> mean, closer to the median than the mean.</p>
          <p>Transforms don't fix two humps or a cap. For two humps, split the groups. For a cap, see <a href="#censored-demand">censored demand</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Right-skewed with no transform: mean well above median, the Q-Q bends up. Switch to Log: the points straighten and the skew drops near 0.</li>
            <li>Normal data with Log: logging something that was already symmetric makes it left-skewed. Don't transform by habit.</li>
            <li>Heavy tails at n = 1000: the histogram looks almost fine, but the Q-Q plot's S-shape gives it away.</li>
            <li>Normal at n = 20, press New sample a few times. Small samples wobble around the line, and the skew number swings widely.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const H = new Plot($("#hist"), { x: [0, 1], y: [0, 1], pad: { l: 44, b: 40 } });
    const Q = new Plot($("#qq"), { x: [-3, 3], y: [0, 1], pad: { l: 50, b: 40 } });
    const qs = (s, p) => { const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };

    function sample() {
      const r = rng(seed), n = +$("#n").value, xs = [];
      for (let i = 0; i < n; i++) {
        let v;
        if (shape === "normal") v = 100 + 18 * r.normal();
        else if (shape === "lognormal") v = Math.exp(Math.log(80) + 0.7 * r.normal());
        else if (shape === "heavy") { let c = 0; for (let k = 0; k < 3; k++) c += r.normal() ** 2; v = 100 + 14 * r.normal() / Math.sqrt(c / 3); }
        else if (shape === "bimodal") v = r() < 0.65 ? 70 + 12 * r.normal() : 140 + 15 * r.normal();
        else v = Math.min(130, 100 + 25 * r.normal());
        xs.push(Math.max(0.5, v));
      }
      return xs;
    }
    const T = { none: (x) => x, sqrt: (x) => Math.sqrt(x), log: (x) => Math.log(x) };
    const TL = { none: "x", sqrt: "√x", log: "ln x" };

    function stats(v) {
      const n = v.length, m = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
      const m2 = v.reduce((a, b) => a + (b - m) ** 2, 0) / n, m3 = v.reduce((a, b) => a + (b - m) ** 3, 0) / n, m4 = v.reduce((a, b) => a + (b - m) ** 4, 0) / n;
      const g1 = m3 / m2 ** 1.5, G1 = g1 * Math.sqrt(n * (n - 1)) / (n - 2);
      const g2 = m4 / m2 ** 2 - 3, G2 = ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * g2 + 6);
      const s = v.slice().sort((a, b) => a - b);
      return { n, m, sd, skew: G1, kurt: G2, s, med: qs(s, 0.5), q1: qs(s, 0.25), q3: qs(s, 0.75) };
    }

    function draw() {
      $("#desc").textContent = DESC[shape];
      $("#nV").textContent = $("#n").value;
      const raw = sample(), v = raw.map(T[tf]), st = stats(v), rs = stats(raw);
      const fd = 2 * (st.q3 - st.q1) / Math.cbrt(st.n);
      let nb = +$("#bins").value;
      const lo = st.s[0], hi = st.s[st.n - 1];
      if (!nb) nb = Math.max(5, Math.min(60, Math.ceil((hi - lo) / (fd || 1))));
      $("#binsV").textContent = +$("#bins").value ? nb : `auto (${nb})`;
      const bw = (hi - lo) / nb || 1, cnt = new Array(nb).fill(0);
      v.forEach((x) => cnt[Math.min(nb - 1, Math.floor((x - lo) / bw))]++);
      const dens = cnt.map((c) => c / (st.n * bw));
      const peak = Math.max(...dens, dnorm(0) / st.sd);
      const pad = (hi - lo) * 0.06;
      H.x = [lo - pad, hi + pad]; H.y = [0, peak * 1.12];
      H.clear(); H.axes({ xLabel: tf === "none" ? "value" : TL[tf] + " (transformed)", yLabel: "density", yTicks: [], xCount: 6 });
      const g = H.ctx;
      g.fillStyle = css("--accent"); g.globalAlpha = 0.55;
      dens.forEach((d, i) => { const x0 = H.sx(lo + i * bw), x1 = H.sx(lo + (i + 1) * bw); g.fillRect(x0 + 0.5, H.sy(d), Math.max(1, x1 - x0 - 1), H.sy(0) - H.sy(d)); });
      g.globalAlpha = 1;
      const cx = [], cy = [];
      for (let i = 0; i <= 120; i++) { const x = H.x[0] + (H.x[1] - H.x[0]) * i / 120; cx.push(x); cy.push(dnorm((x - st.m) / st.sd) / st.sd); }
      H.path(cx, cy, css("--warm"), 2.2);
      H.path([st.m, st.m], [0, peak * 1.05], css("--muted"), 1.8);
      H.path([st.med, st.med], [0, peak * 1.05], css("--muted"), 1.8, [5, 4]);

      const th = st.s.map((_, i) => st.m + st.sd * qnorm((i + 0.5) / st.n));
      const all = th.concat(st.s), qlo = Math.min(...all), qhi = Math.max(...all), qp = (qhi - qlo) * 0.05;
      Q.x = [qlo - qp, qhi + qp]; Q.y = [qlo - qp, qhi + qp];
      Q.clear(); Q.axes({ xLabel: "normal quantile (same mean and SD)", yLabel: "sorted data", xCount: 5, yCount: 5 });
      Q.path(Q.x, Q.y, css("--warm"), 2, [6, 4]);
      st.s.forEach((y, i) => Q.dot(th[i], y, st.n > 400 ? 2 : 3, css("--accent")));

      const lbl = (s) => Math.abs(s) < 0.5 ? "fairly symmetric" : Math.abs(s) < 1 ? (s > 0 ? "moderately right-skewed" : "moderately left-skewed") : s > 0 ? "strongly right-skewed" : "strongly left-skewed";
      const f = (x) => Math.abs(x) >= 100 ? x.toFixed(1) : Math.abs(x) >= 10 ? x.toFixed(2) : x.toFixed(3);
      $("#ro").innerHTML = `
        <div class="ro"><b>Mean / median</b><span class="num">${f(st.m)} / ${f(st.med)}</span></div>
        <div class="ro"><b>SD</b><span class="num">${f(st.sd)}</span></div>
        <div class="ro"><b>Skewness</b><span class="num">${st.skew.toFixed(2)}</span></div>
        <div class="ro"><b>Excess kurtosis</b><span class="num">${st.kurt.toFixed(2)}</span></div>
        <div class="ro" style="grid-column:1/-1"><b>Verdict</b><span>${lbl(st.skew)}${st.kurt > 1.5 ? ", heavy tails" : ""}</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      const i1 = Math.floor(st.n * 0.95), p = (i1 + 0.5) / st.n, z = qnorm(p);
      const lines = [
        `n = ${st.n}, mean = ${f(st.m)}, median = ${f(st.med)}, SD = ${f(st.sd)} → mean ${st.m > st.med ? "above" : "below"} median by ${f(Math.abs(st.m - st.med))}`,
        `skewness = ${B(st.skew.toFixed(2))} (${lbl(st.skew)}); excess kurtosis = ${B(st.kurt.toFixed(2))} ${M(st.kurt > 1.5 ? "(heavy tails)" : "(normal ≈ 0)")}`,
        `bin width (Freedman–Diaconis) = 2 × IQR ÷ n^⅓ = 2 × ${f(st.q3 - st.q1)} ÷ ${Math.cbrt(st.n).toFixed(2)} = ${f(fd)}`,
        `Q-Q point ${i1 + 1} of ${st.n}: position (${i1 + 1} − 0.5) ÷ ${st.n} = ${p.toFixed(3)} → z = ${z.toFixed(2)} → normal says ${f(st.m)} + ${z.toFixed(2)} × ${f(st.sd)} = ${B(f(th[i1]))}, data say ${B(f(st.s[i1]))}`,
      ];
      if (tf !== "none") {
        const back = tf === "log" ? Math.exp(st.m) : st.m ** 2;
        lines.push(`before the transform skew was ${rs.skew.toFixed(2)}; after ${TL[tf]} it is ${B(st.skew.toFixed(2))}`);
        lines.push(`back-transform of the mean: ${tf === "log" ? `exp(${f(st.m)})` : `${f(st.m)}²`} = ${B(f(back))} ${M(`(original mean ${f(rs.m)}, median ${f(rs.med)})`)}`);
      }
      $("#work").innerHTML = lines.map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    const seg = (id, set) => $(id).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; set(b.dataset.v); $(id).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    seg("#shape", (v) => (shape = v));
    seg("#tf", (v) => (tf = v));
    ["#n", "#bins"].forEach((s) => $(s).addEventListener("input", draw));
    $("#newd").addEventListener("click", () => { seed++; draw(); });
    draw();
    return watch([H.c, Q.c], (resized) => { if (resized) { H.resize(); Q.resize(); } draw(); });
  },
});
