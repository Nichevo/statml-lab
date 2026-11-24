Lab.register({
  id: "confidence-intervals",
  group: "Statistical analysis",
  title: "Confidence intervals and the bootstrap",
  blurb: "Take a sample, put a range around the average, and check how often that range catches the truth. Then build the same range by resampling, for any statistic, with no formulas.",
  lede: "A sample average is never exactly the true average. A confidence interval is a range built so that, if you repeated the sampling many times, a stated share of those ranges (say 95%) would contain the true value. The classic formula works for averages. The bootstrap gets an interval for almost anything, such as a median, a percentile or a ratio, by resampling your own data thousands of times.",
  quiz: [
    ["A 95% confidence interval for average weekly demand is 180 to 220. Does that mean there's a 95% chance the true mean is between 180 and 220?", "Not quite. The true mean is fixed; it either is or isn't in that range. The 95% describes the method: 95% of intervals built this way, from repeated samples, contain the true mean. The 100-samples chart shows exactly this."],
    ["You quadruple the sample size. What happens to the interval's width?", "It roughly halves, because the standard error is σ/√n and √4 = 2."],
    ["Why use the t distribution rather than z = 1.96 for small samples?", "With few data points the sample SD is itself uncertain, often too small. The t multiplier is bigger (2.78 for n = 5 at 95%) to make up for this, and it shrinks towards 1.96 as n grows."],
    ["What is a bootstrap resample?", "A new sample of the same size, drawn from your data with replacement, so some values appear twice and others not at all. Recompute the statistic on each of thousands of resamples; the spread of those results stands in for the sampling spread."],
    ["When is the bootstrap especially useful?", "When there's no simple formula: medians, percentiles (e.g. a 90th-percentile lead time), ratios like fill rate, or skewed data with modest n. It still needs a reasonably sized, representative sample; it can't invent information."],
  ],
  diy: {
    intro: "Sample values in A2:A31 (n = 30), confidence level 95%.",
    steps: [
      ["Mean, standard deviation and standard error.", "=AVERAGE(A2:A31)   =STDEV.S(A2:A31)   SE: =STDEV.S(A2:A31)/SQRT(COUNT(A2:A31))"],
      ["t multiplier and half-width (or CONFIDENCE.T does both).", "=T.INV.2T(0.05, COUNT(A2:A31)-1)\nhalf-width: =CONFIDENCE.T(0.05, STDEV.S(A2:A31), COUNT(A2:A31))"],
      ["Interval.", "low: =mean - half_width   high: =mean + half_width"],
      ["Bootstrap: one resampled value (fill B2:B31). Pressing F9 redraws.", "=INDEX($A$2:$A$31, RANDBETWEEN(1, 30))"],
      ["Statistic of that resample, e.g. median, in B33. Then a one-column Data Table (What-If Analysis) with 2,000 rows repeats it.", "=MEDIAN(B2:B31)"],
      ["Bootstrap 95% interval from the 2,000 results in D2:D2001.", "=PERCENTILE.INC(D2:D2001, 0.025)   =PERCENTILE.INC(D2:D2001, 0.975)"],
    ],
  },
  deeper: [
    ["Neyman (1937), Outline of a theory of statistical estimation based on the classical theory of probability, Phil. Trans. R. Soc. A 236", "https://doi.org/10.1098/rsta.1937.0005", "where confidence intervals come from"],
    ["Efron (1979), Bootstrap methods: another look at the jackknife, Annals of Statistics 7(1)", "https://doi.org/10.1214/aos/1176344552", "the paper that introduced the bootstrap"],
    ["Greenland et al. (2016), Statistical tests, P values, confidence intervals, and power: a guide to misinterpretations, Eur. J. Epidemiology 31", "https://doi.org/10.1007/s10654-016-0149-3", "what a 95% interval does and doesn't mean"],
    ["OpenIntro Statistics (free textbook)", "https://www.openintro.org/book/os/", "confidence intervals and the bootstrap, chapters 5–7"],
    ["Seeing Theory: Probability distributions", "https://seeing-theory.brown.edu/probability-distributions/index.html", "interactive sampling and the CLT"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M48 4 V60" stroke-dasharray="3 3"/><g stroke-width="2.5"><path d="M20 12 H70"/><path d="M30 22 H64"/><path d="M16 32 H58"/><path d="M52 42 H88" stroke-opacity=".45"/><path d="M26 52 H74"/></g><g fill="currentColor"><circle cx="45" cy="12" r="3"/><circle cx="47" cy="22" r="3"/><circle cx="37" cy="32" r="3"/><circle cx="70" cy="42" r="3"/><circle cx="50" cy="52" r="3"/></g></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, qnorm } = Lab;
    // Weekly demand at a store: skewed (log-normal). True mean known so we can check coverage.
    const MU = Math.log(180), SIG = 0.55, TRUE_MEAN = Math.exp(MU + SIG * SIG / 2);
    const qt = (p, v) => { const z = qnorm(p), z3 = z ** 3, z5 = z ** 5, z7 = z ** 7, z9 = z ** 9; return z + (z3 + z) / (4 * v) + (5 * z5 + 16 * z3 + 3 * z) / (96 * v * v) + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * v ** 3) + (79 * z9 + 776 * z7 + 1482 * z5 - 1920 * z3 - 945 * z) / (92160 * v ** 4); };
    const STATS = { mean: { name: "Mean", f: (a) => a.reduce((s, v) => s + v, 0) / a.length }, median: { name: "Median", f: (a) => pct(a, 0.5) }, p90: { name: "90th percentile", f: (a) => pct(a, 0.9) } };
    const TRUE = { mean: TRUE_MEAN, median: Math.exp(MU), p90: Math.exp(MU + SIG * qnorm(0.9)) };
    function pct(a, p) { const s = Float64Array.from(a).sort(), h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); }
    const h4 = (t) => `<h4 style="margin:0;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="padding:8px 8px 4px">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:4px 6px 6px">${h4("100 samples, 100 intervals")}
            <div class="seg" id="meth" style="min-width:250px"><button type="button" data-v="t" aria-pressed="true">t formula</button><button type="button" data-v="boot" aria-pressed="false">Bootstrap</button></div></div>
          <canvas id="cv" aria-label="One hundred confidence intervals and the true mean"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>interval caught the true value</span><span><i style="background:var(--bad)"></i>missed it</span><span><i style="background:var(--violet)"></i>true value</span></div>
          <figcaption id="cvCap"></figcaption>
        </figure>
        <figure class="plot wide" style="padding:8px 8px 4px">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:4px 6px 6px">${h4("Bootstrapping one sample")}
            <div class="seg" id="stat" style="min-width:300px">${Object.entries(STATS).map(([k, s], i) => `<button type="button" data-v="${k}" aria-pressed="${i === 0}">${s.name}</button>`).join("")}</div></div>
          <canvas id="bh" aria-label="Histogram of bootstrap results"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>statistic on each resample</span><span><i style="background:var(--warm)"></i>bootstrap interval</span><span><i style="background:var(--violet)"></i>true value</span><span><i style="background:var(--ink)"></i>this sample's value</span></div>
          <figcaption id="bhCap"></figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          ${h4("Worked out for sample #1")}
          <div id="work" style="margin-top:10px;font:.82rem/1.9 var(--font-mono);overflow-x:auto"></div>
          <details style="margin-top:10px"><summary style="cursor:pointer">Use your own numbers instead</summary>
            <p class="hint">Paste values separated by commas, spaces or new lines, such as weekly sales or lead times. The bootstrap chart and worked numbers will use them. The 100-samples chart keeps using simulated data, because it needs a known true value.</p>
            <textarea id="own" rows="3" style="width:100%;font:.85rem var(--font-mono);background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:8px" placeholder="e.g. 12, 15, 9, 22, 31, 14, 18, 11, 40, 16"></textarea>
            <label class="check" style="margin-top:6px"><input type="checkbox" id="useOwn"> Use these numbers</label>
          </details>
        </div>`,
      panel: `
        <div class="ctrl"><label for="n">Sample size n <output id="nV"></output></label><input type="range" id="n" min="5" max="200" step="1" value="20"></div>
        <div class="ctrl"><label for="cl">Confidence level <output id="clV"></output></label><input type="range" id="cl" min="50" max="99" step="1" value="95"></div>
        <div class="ctrl"><label for="B">Bootstrap resamples <output id="BV"></output></label><input type="range" id="B" min="100" max="5000" step="100" value="2000"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="redraw" type="button">Draw new samples</button><button class="btn" id="reset" type="button">Reset</button></div>
        <p class="hint">The data: weekly demand at a store, skewed to the right (log-normal), true mean ${TRUE_MEAN.toFixed(1)} units.</p>`,
      notes: `
        <section>
          <h2>The formula interval</h2>
          <div class="eq">mean ± t × s / √n<br>s = sample standard deviation, n = sample size<br>t = T.INV.2T(1 − level, n − 1), e.g. 2.09 for n = 20 at 95%</div>
          <p>s/√n is the <b>standard error</b>: how much the sample mean typically wanders from the true mean. The interval is that wander times a multiplier for the confidence level you want. It leans on the <a href="#central-limit">central limit theorem</a>, so with small, skewed samples its real coverage can fall short of the label. Try n = 5.</p>
        </section>
        <section>
          <h2>The bootstrap interval</h2>
          <ol>
            <li>Draw n values from your sample <b>with replacement</b>.</li>
            <li>Compute the statistic (mean, median, 90th percentile…).</li>
            <li>Repeat B times (1,000 to 10,000).</li>
            <li>The middle 95% of the B results (the 2.5th to 97.5th percentiles) is the 95% interval. This is the <i>percentile bootstrap</i>.</li>
          </ol>
          <p>The idea: your sample is the best picture you have of the population, so resampling it mimics drawing new samples. Efron introduced it in 1979, and it made intervals possible for statistics with no neat formula.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Count the red intervals. At 95% you'd expect about 5 of 100. Press "Draw new samples" a few times: it varies, from about 2 to 9.</li>
            <li>Drop n to 5. Intervals get wide and, because the data are skewed, coverage slips below 95%.</li>
            <li>Switch the bootstrap chart to the 90th percentile, a typical figure for safety stock or lead-time promises. Its interval is much wider than the mean's: extremes are hard to pin down.</li>
            <li>Lower the confidence level to 50%. Intervals shrink, and about half miss.</li>
          </ol>
          <p>Related: <a href="#hypothesis-test">hypothesis tests</a> (an interval that excludes 0 is a significant difference) and <a href="#prediction-intervals">prediction intervals</a>, which cover a single future value, not the mean, so they are much wider.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pCv = new Plot($("#cv"), { pad: { l: 46, b: 38 } }), pB = new Plot($("#bh"), { pad: { l: 46, b: 38 } });
    let meth = "t", stat = "mean", seed = 1, R = null;
    const draw = (r, n) => Array.from({ length: n }, () => Math.exp(MU + SIG * r.normal()));
    function ownData() { if (!$("#useOwn").checked) return null; const v = ($("#own").value.match(/-?\d+(\.\d+)?/g) || []).map(Number); return v.length >= 3 ? v : null; }

    function bootstrap(a, f, B, r) { const n = a.length, out = new Float64Array(B), tmp = new Array(n); for (let b = 0; b < B; b++) { for (let i = 0; i < n; i++) tmp[i] = a[(r() * n) | 0]; out[b] = f(tmp); } return out; }
    function compute() {
      const n = +$("#n").value, cl = +$("#cl").value / 100, B = +$("#B").value, r = rng(seed * 101), a = (1 - cl) / 2;
      const tm = qt(1 - a, n - 1), samples = [];
      for (let k = 0; k < 100; k++) {
        const s = draw(r, n), m = STATS.mean.f(s), sd = Math.sqrt(s.reduce((q, v) => q + (v - m) ** 2, 0) / (n - 1));
        let lo, hi;
        if (meth === "t") { lo = m - tm * sd / Math.sqrt(n); hi = m + tm * sd / Math.sqrt(n); }
        else { const bs = bootstrap(s, STATS.mean.f, 400, r); lo = pct(bs, a); hi = pct(bs, 1 - a); }
        samples.push({ s, m, sd, lo, hi, hit: lo <= TRUE_MEAN && TRUE_MEAN <= hi });
      }
      const own = ownData(), s1 = own || samples[0].s, rb = rng(seed * 7 + 3);
      const bs = bootstrap(s1, STATS[stat].f, B, rb);
      R = { n, cl, a, tm, B, samples, s1, own, bs, est: STATS[stat].f(s1), blo: pct(bs, a), bhi: pct(bs, 1 - a), hits: samples.filter((x) => x.hit).length };
    }
    function drawCv() {
      const { samples, hits, cl } = R, all = samples.flatMap((x) => [x.lo, x.hi]);
      const lo = Math.min(...all, TRUE_MEAN), hi = Math.max(...all, TRUE_MEAN), pad = (hi - lo) * 0.05;
      pCv.resize(); pCv.x = [0.5, 100.5]; pCv.y = [lo - pad, hi + pad]; pCv.clear();
      pCv.axes({ xLabel: "sample number", yLabel: "weekly demand (units)", xTicks: [1, 20, 40, 60, 80, 100], yFormat: (v) => fmt(v, 0) });
      const g = pCv.ctx, ac = css("--accent"), bad = css("--bad");
      samples.forEach((x, i) => { const X = pCv.sx(i + 1); g.strokeStyle = x.hit ? ac : bad; g.lineWidth = x.hit ? 2 : 2.5; g.beginPath(); g.moveTo(X, pCv.sy(x.lo)); g.lineTo(X, pCv.sy(x.hi)); g.stroke(); pCv.dot(i + 1, x.m, 2, x.hit ? ac : bad); });
      pCv.path([0.5, 100.5], [TRUE_MEAN, TRUE_MEAN], css("--violet"), 2);
      const w = samples.reduce((s, x) => s + x.hi - x.lo, 0) / 100;
      $("#cvCap").innerHTML = `Each vertical line is one sample's ${Math.round(cl * 100)}% interval for the mean (${meth === "t" ? "t formula" : "bootstrap, 400 resamples each"}), n = ${R.n}. <b>${hits} of 100</b> contain the true mean of ${TRUE_MEAN.toFixed(1)}; the label promises about ${Math.round(cl * 100)}. Average width ±${fmt(w / 2, 1)} units.`;
    }
    function drawB() {
      const { bs, blo, bhi, est, B, own } = R, mn = Math.min(...bs), mx = Math.max(...bs), nb = 40, w = (mx - mn) / nb || 1, cnt = new Array(nb).fill(0);
      bs.forEach((v) => cnt[Math.min(nb - 1, Math.floor((v - mn) / w))]++);
      const tv = own ? null : TRUE[stat], xlo = Math.min(mn, tv ?? mn), xhi = Math.max(mx, tv ?? mx);
      pB.resize(); pB.x = [xlo - w, xhi + w]; pB.y = [0, Math.max(...cnt) * 1.12]; pB.clear();
      pB.axes({ xLabel: `${STATS[stat].name.toLowerCase()} of a resample`, yLabel: "number of resamples", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const g = pB.ctx;
      cnt.forEach((c, i) => { const x0 = mn + i * w, inside = x0 + w / 2 >= blo && x0 + w / 2 <= bhi; g.fillStyle = css("--accent"); g.globalAlpha = inside ? 0.85 : 0.3; g.fillRect(pB.sx(x0) + 0.5, pB.sy(c), Math.max(1, pB.sx(x0 + w) - pB.sx(x0) - 1), pB.sy(0) - pB.sy(c)); });
      g.globalAlpha = 1;
      const vline = (x, col, lw, dash) => pB.path([x, x], [0, pB.y[1]], col, lw, dash);
      vline(blo, css("--warm"), 2.5); vline(bhi, css("--warm"), 2.5); vline(est, css("--ink"), 2, [4, 3]); if (tv != null) vline(tv, css("--violet"), 2);
      $("#bhCap").innerHTML = `${own ? "Your " + own.length + " numbers" : "Sample #1 (n = " + R.n + ")"}, resampled ${B.toLocaleString()} times. ${STATS[stat].name} of the sample: <b>${fmt(est, 1)}</b>. ${Math.round(R.cl * 100)}% bootstrap interval: <b>${fmt(blo, 1)} to ${fmt(bhi, 1)}</b>${tv != null ? `. True value ${fmt(tv, 1)}: ${blo <= tv && tv <= bhi ? "caught" : "missed"}` : ""}.`;
    }
    function work() {
      const s = R.s1, n = s.length, m = STATS.mean.f(s), sd = Math.sqrt(s.reduce((q, v) => q + (v - m) ** 2, 0) / (n - 1)), se = sd / Math.sqrt(n), tm = qt(1 - R.a, n - 1), r = rng(42);
      const show = s.slice(0, 12).map((v) => fmt(v, 0)).join(", ") + (n > 12 ? ", …" : "");
      const rs = [0, 1, 2].map(() => Array.from({ length: Math.min(n, 12) }, () => s[(r() * n) | 0]));
      const b = (t) => `<b style="color:var(--ink)">${t}</b>`, lvl = Math.round(R.cl * 100);
      $("#work").innerHTML = [
        `data (n = ${n}): ${show}`,
        `mean = ${b(fmt(m, 2))}, s = ${fmt(sd, 2)}, standard error = s/√n = ${fmt(sd, 2)}/√${n} = ${b(fmt(se, 2))}`,
        `t multiplier for ${lvl}%, ${n - 1} degrees of freedom = ${fmt(tm, 3)} <span style="color:var(--muted)">(z would be ${fmt(qnorm(1 - R.a), 3)})</span>`,
        `t interval: ${fmt(m, 2)} ± ${fmt(tm, 3)} × ${fmt(se, 2)} = ${fmt(m, 2)} ± ${fmt(tm * se, 2)} = ${b(fmt(m - tm * se, 1) + " to " + fmt(m + tm * se, 1))}`,
        `<span style="color:var(--muted)">bootstrap resamples (first ${Math.min(n, 12)} values each), drawn with replacement:</span>`,
        ...rs.map((x, i) => `&nbsp; #${i + 1}: ${x.map((v) => fmt(v, 0)).join(", ")}${n > 12 ? ", …" : ""}`),
        `… ${R.B.toLocaleString()} resamples → ${STATS[stat].name.toLowerCase()} of each → ${(R.a * 100).toFixed(1)}th and ${((1 - R.a) * 100).toFixed(1)}th percentiles = ${b(fmt(R.blo, 1) + " to " + fmt(R.bhi, 1))}`,
      ].map((l) => `<div style="white-space:nowrap">${l}</div>`).join("");
    }
    function readouts() {
      $("#ro").innerHTML = `<div class="ro"><b>Intervals that caught the truth</b><span class="pill ${Math.abs(R.hits - R.cl * 100) <= 4 ? "ok" : "warn"}">${R.hits} / 100</span></div>
        <div class="ro"><b>t multiplier</b><span class="num">${fmt(R.tm, 3)}</span></div>
        <div class="ro"><b>Bootstrap interval (${STATS[stat].name.toLowerCase()})</b><span class="num">${fmt(R.blo, 0)}–${fmt(R.bhi, 0)}</span></div>`;
    }
    function labels() { $("#nV").textContent = $("#n").value; $("#clV").textContent = $("#cl").value + "%"; $("#BV").textContent = (+$("#B").value).toLocaleString(); }
    function update() { labels(); compute(); drawCv(); drawB(); work(); readouts(); }
    const seg = (id, set) => $(id).querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { set(b.dataset.v); $(id).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); update(); }));
    seg("#meth", (v) => (meth = v)); seg("#stat", (v) => (stat = v));
    ["#n", "#cl", "#B"].forEach((s) => $(s).addEventListener("input", update));
    $("#own").addEventListener("input", () => { if ($("#useOwn").checked) update(); });
    $("#useOwn").addEventListener("change", update);
    $("#redraw").addEventListener("click", () => { seed++; update(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 1; $("#useOwn").checked = false; update(); });
    update();
    return watch([$("#cv"), $("#bh")], () => { drawCv(); drawB(); });
  },
});
