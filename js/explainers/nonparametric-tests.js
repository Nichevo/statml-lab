Lab.register({
  id: "nonparametric-tests",
  group: "Statistical analysis",
  title: "Non-parametric tests: when the data aren't normal",
  blurb: "Is the new supplier really faster? Lead times are skewed and have the odd huge delay, which can blind a t-test. Compare the t-test with the Mann–Whitney rank test and a permutation test on the same data, see the ranks worked out, and check which test has more power for each kind of data.",
  lede: "The t-test compares means and assumes the data are roughly normal, or the sample is large. Lead times, order sizes and repair times are usually skewed, with a few extreme values. Non-parametric tests drop the normal assumption. The Mann–Whitney test replaces each value with its rank, so one 60-day delay counts as “the slowest” and no more. On clean normal data you lose a little power; on skewed data with outliers you can gain a lot.",
  quiz: [
    ["What does the Mann–Whitney test actually test?", "Whether a value from one group tends to be larger than a value from the other: P(A > B) = 0.5 under the null. When the two groups have the same shape, that's a test of equal medians."],
    ["Why can one outlier hide a real difference from the t-test?", "It drags the mean of its group and inflates the standard deviation, and the t statistic is the difference in means divided by that spread. The rank test just sees one more value in last place."],
    ["How much power do you give up using ranks on normal data?", "Very little: the Mann–Whitney test is about 95% as efficient as the t-test (3/π ≈ 0.955) when the data really are normal, and can be far more efficient with heavy tails."],
    ["What is a permutation test?", "Shuffle the group labels many times and recompute the difference each time. The share of shuffles at least as extreme as the real one is the p-value. No distribution assumed, just that the labels are exchangeable under the null."],
    ["What's the paired version?", "The Wilcoxon signed-rank test: for before/after pairs, rank the absolute differences and compare the sums for positive and negative ones. Use it instead of a paired t-test when differences are skewed."],
  ],
  diy: {
    intro: "Supplier A lead times in A2:A21, supplier B in B2:B21. Stack them into one column D2:D41 with the group in E.",
    steps: [
      ["Ranks across both groups (ties get the average rank).", "F2: =RANK.AVG(D2, $D$2:$D$41, 1)"],
      ["Rank sum for B and the U statistic.", "R_B: =SUMIF(E2:E41, \"B\", F2:F41)   U_B: =R_B - nB*(nB+1)/2"],
      ["Normal approximation (large samples, few ties).", "z: =(U_B - nA*nB/2) / SQRT(nA*nB*(nA+nB+1)/12)   p: =2*(1-NORM.S.DIST(ABS(z), TRUE))"],
      ["Welch t-test for comparison.", "=T.TEST(A2:A21, B2:B21, 2, 3)"],
      ["Permutation test: shuffle labels with RAND(), recompute the mean difference, repeat 1,000 times (Data Table), count.", "p ≈ COUNTIF(diffs, \">=\"&ABS(observed))*2/1000"],
    ],
  },
  deeper: [
    ["Mann & Whitney (1947), On a test of whether one of two random variables is stochastically larger than the other, Annals of Mathematical Statistics 18(1)", "https://doi.org/10.1214/aoms/1177730491", "the rank-sum test"],
    ["Wilcoxon (1945), Individual comparisons by ranking methods, Biometrics Bulletin 1(6)", "https://doi.org/10.2307/3001968", "rank-sum and signed-rank tests"],
    ["Fay & Proschan (2010), Wilcoxon–Mann–Whitney or t-test? On assumptions for hypothesis tests and multiple interpretations of decision rules, Statistics Surveys 4", "https://doi.org/10.1214/09-SS051", "which test answers which question"],
    ["Hollander, Wolfe & Chicken (2013), Nonparametric statistical methods, 3rd edition, Wiley", "https://doi.org/10.1002/9781119196037", "the standard reference"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 54 H88" stroke-opacity=".5"/><circle cx="16" cy="22" r="4"/><circle cx="26" cy="22" r="4"/><circle cx="34" cy="22" r="4"/><circle cx="84" cy="22" r="4"/><circle cx="22" cy="42" r="4" fill="currentColor"/><circle cx="40" cy="42" r="4" fill="currentColor"/><circle cx="50" cy="42" r="4" fill="currentColor"/><circle cx="58" cy="42" r="4" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    let dist = "skew", seed = 2;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("Lead times from the two suppliers")}</div><canvas id="c1" style="height:220px" aria-label="Strip plot of lead times for supplier A and supplier B, with means and medians"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(`<div class="plot" style="padding:14px;min-width:0;overflow-x:auto">${h4("Three tests, worked out")}<div id="wk"></div></div>`, fig("c2", "Power: how often each test spots a real difference", 320, "Share of simulated samples where each test finds a significant difference, against the true difference"))}`,
      panel: `
        <p class="hint" style="margin:0">You trial supplier B against your current supplier A. Is B faster? Lead times in days.</p>
        <div class="ctrl"><label>Shape of lead times</label><div class="seg" id="ds"><button type="button" data-d="norm" aria-pressed="false">Normal</button><button type="button" data-d="skew" aria-pressed="true">Skewed</button><button type="button" data-d="out" aria-pressed="false">Skewed + big delays</button></div></div>
        <div class="ctrl"><label for="sh">B's typical lead time vs A's <output id="shV"></output></label><input type="range" id="sh" min="0.5" max="1.3" step="0.02" value="0.8"></div>
        <div class="ctrl"><label for="n">Shipments per supplier <output id="nV"></output></label><input type="range" id="n" min="5" max="60" step="1" value="30"></div>
        <div class="ctrl"><label for="al">Significance level α <output id="alV"></output></label><input type="range" id="al" min="0.01" max="0.1" step="0.01" value="0.05"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New sample</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Mann–Whitney (Wilcoxon rank-sum) in four steps</h2>
          <ol>
            <li>Pool both samples and sort them. Give each value its rank (1 = shortest); ties share the average rank.</li>
            <li>Add up the ranks of group B: R<sub>B</sub>.</li>
            <li>U<sub>B</sub> = R<sub>B</sub> − n<sub>B</sub>(n<sub>B</sub> + 1)/2 counts how many (A, B) pairs have B above A. With no difference, its average is n<sub>A</sub>n<sub>B</sub>/2.</li>
            <li>Compare U with its spread under the null: z = (U − n<sub>A</sub>n<sub>B</sub>/2) / √(n<sub>A</sub>n<sub>B</sub>(n<sub>A</sub> + n<sub>B</sub> + 1)/12). For very small samples, use exact tables instead.</li>
          </ol>
          <p>U / (n<sub>A</sub>n<sub>B</sub>) is itself a useful effect size: the chance a random B shipment is slower than a random A one. It's the same number as the <a href="#logistic-regression">AUC</a> of a classifier.</p>
        </section>
        <section>
          <h2>Which test when</h2>
          <ul>
            <li><b>Roughly normal data, or large samples, and you care about the mean</b> (e.g. total cost): <a href="#hypothesis-test">t-test</a>.</li>
            <li><b>Skewed data, outliers, small samples, or ordinal scores</b> (ratings 1–5): Mann–Whitney, or Wilcoxon signed-rank for pairs.</li>
            <li><b>Any statistic you like</b> (median, P90, trimmed mean): a permutation test or the <a href="#confidence-intervals">bootstrap</a>.</li>
            <li><b>Three or more groups</b>: Kruskal–Wallis, the rank version of <a href="#anova-chi-square">ANOVA</a>.</li>
          </ul>
          <p>A log transform is another fix for lead times: on the log scale they're often close to normal, and a t-test there compares geometric means.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Compare the power chart for the three shapes. On skewed data the rank test edges ahead; add a few big delays and the t-test almost never finds B's faster typical lead time, while the rank test still does, and more so with 60 shipments.</li>
            <li>Switch to Normal: the power curves almost overlap. Ranks cost you very little.</li>
            <li>Set B to 1.0 (no difference) and press “New sample” many times: each test should be significant only about 5% of the time.</li>
          </ul>
        </section>`,
    });
    // ---- stats helpers ----
    const lgam = (x) => { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const k of c) s += k / ++y; return -t + Math.log((2.5066282746310005 * s) / x); };
    function betacf(a, b, x) { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - (qab * x) / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d; for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c; aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break; } return h; }
    const ibeta = (x, a, b) => { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgam(a + b) - lgam(a) - lgam(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b; };
    const tp2 = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5);
    const Phi = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
    const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length, vr = (a) => { const m = mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1); }, med = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
    function welch(A, B) { const va = vr(A) / A.length, vb = vr(B) / B.length, t = (mean(B) - mean(A)) / Math.sqrt(va + vb), df = (va + vb) ** 2 / (va * va / (A.length - 1) + vb * vb / (B.length - 1)); return { t, df, p: tp2(t, df) }; }
    function mw(A, B) {
      const all = A.map((v) => [v, 0]).concat(B.map((v) => [v, 1])).sort((x, y) => x[0] - y[0]), N = all.length, rk = new Array(N); let tie = 0;
      for (let i = 0; i < N;) { let j = i; while (j + 1 < N && all[j + 1][0] === all[i][0]) j++; const r = (i + j + 2) / 2; for (let k = i; k <= j; k++) rk[k] = r; const tt = j - i + 1; tie += tt ** 3 - tt; i = j + 1; }
      const nA = A.length, nB = B.length, RB = all.reduce((s, x, i) => s + (x[1] ? rk[i] : 0), 0), U = RB - (nB * (nB + 1)) / 2, mu = (nA * nB) / 2, sd = Math.sqrt(((nA * nB) / 12) * (N + 1 - tie / (N * (N - 1)))), z = (U - mu - 0.5 * Math.sign(U - mu)) / sd;
      return { all, rk, RB, U, mu, sd, z, p: 2 * Phi(-Math.abs(z)) };
    }
    function perm(A, B, r, reps) { const all = A.concat(B), nA = A.length, obs = Math.abs(mean(B) - mean(A)); let c = 0; const x = [...all]; for (let k = 0; k < reps; k++) { for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } let sa = 0; for (let i = 0; i < nA; i++) sa += x[i]; const sb = all.reduce((s, v) => s + v, 0) - sa; if (Math.abs(sb / (x.length - nA) - sa / nA) >= obs - 1e-12) c++; } return (c + 1) / (reps + 1); }
    function draw1(r, n, shift, d) {
      const one = (m) => (d === "norm" ? Math.max(0.5, m + 2.5 * (m / 10) * r.normal()) : m * Math.exp(0.45 * r.normal()));
      const A = Array.from({ length: n }, () => +one(10).toFixed(1)), B = Array.from({ length: n }, () => +one(10 * shift).toFixed(1));
      if (d === "out") { const k = Math.max(1, Math.round(n / 8)); for (let i = 0; i < k; i++) { A[i] = +(45 + 25 * r()).toFixed(1); B[i] = +(45 + 25 * r()).toFixed(1); } }
      return { A, B };
    }
    let S;
    const P = () => ({ sh: +$("#sh").value, n: +$("#n").value, al: +$("#al").value });
    function sim() { const p = P(); S = draw1(rng(seed), p.n, p.sh, dist); }
    const C1 = new Plot($("#c1"), { pad: { l: 80, b: 38, t: 10 } }), C2 = new Plot($("#c2"), { x: [0.5, 1], y: [0, 1], pad: { l: 50, b: 38 } });
    function d1(T) {
      const all = S.A.concat(S.B), hi = Math.max(...all) * 1.05;
      C1.resize(); C1.x = [0, hi]; C1.y = [0, 2]; C1.clear(); C1.axes({ xLabel: "lead time, days", yTicks: [], xFormat: (v) => fmt(v, 0) });
      const g = C1.ctx;
      [["Supplier A", S.A, 1.45, "--muted"], ["Supplier B", S.B, 0.55, "--accent"]].forEach(([nm, a, y, c]) => {
        g.fillStyle = css("--ink"); g.font = `12px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(nm, C1.pad.l - 8, C1.sy(y));
        const sorted = [...a].sort((x, z) => x - z); sorted.forEach((v, i) => C1.dot(v, y + ((i % 5) - 2) * 0.06, 4, css(c), css("--surface")));
        const m = mean(a), md = med(a); C1.path([m, m], [y - 0.35, y + 0.35], css("--bad"), 2); C1.path([md, md], [y - 0.35, y + 0.35], css("--good"), 2.5, [4, 3]);
      });
      $("#c1Cap").innerHTML = `Red: mean. Green dashed: median. A: mean ${fmt(mean(S.A), 1)}, median ${fmt(med(S.A), 1)} days. B: mean ${fmt(mean(S.B), 1)}, median ${fmt(med(S.B), 1)} days.${dist === "out" ? " A few very late shipments at both suppliers (a port hold, a lost container) pull the means about and make the spread huge." : ""}`;
    }
    function wk(T, M, pp, p) {
      const sh = M.all.slice(0, Math.min(M.all.length, 12));
      $("#wk").innerHTML = `<p style="margin:0 0 6px"><b>Mann–Whitney.</b> Pool and rank all ${M.all.length} shipments (first ${sh.length} shown):</p>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${sh.map((x, i) => `<span style="font:.75rem var(--font-mono);padding:2px 6px;border-radius:6px;background:${x[1] ? "var(--accent-soft)" : "color-mix(in srgb, var(--muted) 18%, var(--surface))"}">${x[1] ? "B" : "A"} ${fmt(x[0], 1)} → ${fmt(M.rk[i], 1)}</span>`).join("")}${M.all.length > 12 ? "<span style=\"color:var(--muted)\">…</span>" : ""}</div>
        <p style="margin:0;font:.8rem/1.6 var(--font-mono)">R_B = ${fmt(M.RB, 1)}; U_B = ${fmt(M.RB, 1)} − ${p.n}×${p.n + 1}/2 = ${fmt(M.U, 1)} (expected ${fmt(M.mu, 1)} if no difference)<br>z = (${fmt(M.U, 1)} − ${fmt(M.mu, 1)} ± 0.5) / ${fmt(M.sd, 2)} = ${fmt(M.z, 2)} → <b>p = ${fmt(M.p, 4)}</b><br>P(random B slower than random A) = U / n² = ${fmt(M.U / (p.n * p.n), 2)}</p>
        <p style="margin:10px 0 0;font:.8rem/1.6 var(--font-mono)"><span style="font-family:var(--font-body);font-weight:600">Welch t-test.</span> t = (${fmt(mean(S.B), 2)} − ${fmt(mean(S.A), 2)}) / √(${fmt(vr(S.B), 1)}/${p.n} + ${fmt(vr(S.A), 1)}/${p.n}) = ${fmt(T.t, 2)}, df ${fmt(T.df, 1)} → <b>p = ${fmt(T.p, 4)}</b></p>
        <p style="margin:10px 0 0;font:.8rem/1.6 var(--font-mono)"><span style="font-family:var(--font-body);font-weight:600">Permutation test</span> (difference in means, 2,000 shuffles) → <b>p = ${fmt(pp, 4)}</b></p>`;
    }
    let powCache = {};
    function power(p) {
      const key = [dist, p.n, p.al].join("|"); if (powCache[key]) return powCache[key];
      const xs = [], pt = [], pm = [], r = rng(77), reps = 300; for (let s = 0.5; s <= 1.0001; s += 0.05) { let a = 0, b = 0; for (let k = 0; k < reps; k++) { const d = draw1(r, p.n, s, dist); if (welch(d.A, d.B).p < p.al) a++; if (mw(d.A, d.B).p < p.al) b++; } xs.push(s); pt.push(a / reps); pm.push(b / reps); }
      return (powCache = { [key]: { xs, pt, pm } })[key];
    }
    function d2(p) {
      const { xs, pt, pm } = power(p);
      C2.resize(); C2.clear(); C2.axes({ xLabel: "B's typical lead time vs A's (1 = no difference)", yLabel: "share found significant", xFormat: (v) => fmt(v, 1) + "×", yFormat: (v) => fmt(v * 100, 0) + "%" });
      C2.path([0.5, 1], [p.al, p.al], css("--muted"), 1, [3, 3]);
      C2.path(xs, pt, css("--bad"), 2.5); C2.path(xs, pm, css("--accent"), 2.5);
      if (p.sh <= 1) C2.path([p.sh, p.sh], [0, 1], css("--warm"), 1, [4, 3]);
      const i = xs.findIndex((x) => Math.abs(x - 0.8) < 0.01);
      $("#c2Cap").innerHTML = `${p.n} shipments each, 300 simulated trials per point, ${dist === "norm" ? "normal data" : dist === "skew" ? "skewed data" : "skewed data with a few big delays at both suppliers"}. Red: t-test. Blue: Mann–Whitney. At 0.8× the t-test finds the difference ${fmt(pt[i] * 100, 0)}% of the time, the rank test ${fmt(pm[i] * 100, 0)}%. Dotted: α, the false-alarm rate when there's no difference.`;
    }
    function readouts(T, M, pp, p) {
      const pill = (v) => `<span class="pill ${v < p.al ? "ok" : "warn"}">p = ${fmt(v, 4)}${v < p.al ? " ✓" : ""}</span>`;
      $("#ro").innerHTML = [["t-test (means)", pill(T.p)], ["Mann–Whitney (ranks)", pill(M.p)], ["Permutation (means)", pill(pp)], ["Median A → B", `<span class="num">${fmt(med(S.A), 1)} → ${fmt(med(S.B), 1)} days</span>`]].map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels(p) { $("#shV").textContent = fmt(p.sh, 2) + "×"; $("#nV").textContent = p.n; $("#alV").textContent = fmt(p.al, 2); }
    function draw() { const p = P(); labels(p); const T = welch(S.A, S.B), M = mw(S.A, S.B), pp = perm(S.A, S.B, rng(seed + 9), 2000); d1(T); wk(T, M, pp, p); d2(p); readouts(T, M, pp, p); }
    root.querySelectorAll("#ds button").forEach((b) => b.addEventListener("click", () => { dist = b.dataset.d; root.querySelectorAll("#ds button").forEach((x) => x.setAttribute("aria-pressed", x === b)); sim(); draw(); }));
    ["sh", "n"].forEach((id) => $("#" + id).addEventListener("input", () => { sim(); draw(); }));
    $("#al").addEventListener("input", draw);
    $("#resim").addEventListener("click", () => { seed++; sim(); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); dist = "skew"; seed = 2; root.querySelectorAll("#ds button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.d === "skew")); sim(); draw(); });
    sim(); draw();
    return watch([$("#c1"), $("#c2")], draw);
  },
});
