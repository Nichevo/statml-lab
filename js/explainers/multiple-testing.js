Lab.register({
  id: "multiple-testing",
  group: "Statistical analysis",
  title: "Multiple testing: when you run 200 tests, some will lie",
  blurb: "Test a price change on 200 products at once and some will look significant by pure chance. See how many false discoveries plain p < 0.05 gives, and how Bonferroni, Holm and Benjamini–Hochberg trade them against missed real effects.",
  lede: "One test at α = 0.05 has a 5% chance of a false alarm. Run 200 tests on products where nothing changed and you expect 10 false alarms. That's the trap behind “we tested every store and found 12 where the promotion worked”. Corrections either control the chance of any false alarm (Bonferroni, Holm) or the share of discoveries that are false (the false discovery rate, Benjamini–Hochberg).",
  quiz: [
    ["You test 100 SKUs where nothing changed, each at α = 0.05. What's the chance of at least one 'significant' result?", "1 − 0.95¹⁰⁰ ≈ 99.4%. You'd expect 5 of them."],
    ["What does Bonferroni do, and what does it cost?", "Uses α/m for each of the m tests, so the chance of any false alarm stays below α. With 200 tests that's p < 0.00025, so many real but modest effects are missed."],
    ["How is Holm better than Bonferroni?", "Same guarantee, more power. Sort the p-values; compare the smallest with α/m, the next with α/(m−1), and so on, stopping at the first that fails. It never finds fewer effects than Bonferroni."],
    ["What does the false discovery rate control?", "The expected share of your discoveries that are false. With FDR 10%, if you flag 30 products you expect about 3 to be flukes. That suits screening, where you'll follow up the flagged ones anyway."],
    ["How does Benjamini–Hochberg work?", "Sort the p-values p₍₁₎ ≤ … ≤ p₍ₘ₎. Find the largest k with p₍ₖ₎ ≤ (k/m) q, and flag the k smallest. Graphically: the last point under the sloped line."],
  ],
  diy: {
    intro: "p-values for each product in B2:B201 (from T.TEST or similar). Number of tests m = 200 in E1, α or q in E2.",
    steps: [
      ["Uncorrected flags.", "C2: =B2<$E$2"],
      ["Bonferroni.", "D2: =B2<$E$2/$E$1"],
      ["Rank of each p-value.", "F2: =RANK.EQ(B2, $B$2:$B$201, 1)"],
      ["Benjamini–Hochberg threshold for each rank, and the largest rank that passes.", "G2: =F2/$E$1*$E$2   H2: =IF(B2<=G2, F2, 0)   k: =MAX(H2:H201)"],
      ["BH flags: everything ranked k or better.", "I2: =F2<=k"],
      ["Holm: sort by p, compare with α/(m − rank + 1), flag until the first failure.", "=AND(B2<=$E$2/($E$1-F2+1), all smaller ranks passed)"],
    ],
  },
  deeper: [
    ["Benjamini & Hochberg (1995), Controlling the false discovery rate, Journal of the Royal Statistical Society B 57(1)", "https://doi.org/10.1111/j.2517-6161.1995.tb02031.x", "the FDR and the step-up procedure"],
    ["Holm (1979), A simple sequentially rejective multiple test procedure, Scandinavian Journal of Statistics 6(2)", "https://www.jstor.org/stable/4615733", "Holm's step-down method"],
    ["Ioannidis (2005), Why most published research findings are false, PLoS Medicine 2(8)", "https://doi.org/10.1371/journal.pmed.0020124", "what many tests and few true effects do to published results"],
    ["Gelman & Loken (2013), The garden of forking paths", "https://sites.stat.columbia.edu/gelman/research/unpublished/p_hacking.pdf", "multiple comparisons you didn't know you made"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 56 L88 16" stroke-dasharray="4 3"/><path d="M8 56 H90 M8 56 V6" stroke-opacity=".5"/><circle cx="16" cy="54" r="2.5" fill="currentColor"/><circle cx="24" cy="52" r="2.5" fill="currentColor"/><circle cx="32" cy="49" r="2.5" fill="currentColor"/><circle cx="44" cy="36" r="2.5"/><circle cx="56" cy="26" r="2.5"/><circle cx="70" cy="18" r="2.5"/><circle cx="84" cy="10" r="2.5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const M = [["none", "No correction", "--muted"], ["bonf", "Bonferroni", "--violet"], ["holm", "Holm", "--warm"], ["bh", "Benjamini–Hochberg", "--accent"]];
    let seed = 4;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("The smallest p-values, in order")}</div><canvas id="c1" style="height:300px" aria-label="Sorted p-values with the thresholds of each correction method"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "What each method flags in this sample", 280, "Bars of true and false discoveries per method"), `<div class="plot" style="padding:14px;min-width:0;overflow-x:auto">${h4("Over 400 repeats of the whole exercise")}<div id="tbl"></div></div>`)}`,
      panel: `
        <p class="hint" style="margin:0">You changed the price of many products and test each one for a change in weekly sales. Most really didn't change; a few did.</p>
        <div class="ctrl"><label for="m">Products tested <output id="mV"></output></label><input type="range" id="m" min="10" max="500" step="10" value="200"></div>
        <div class="ctrl"><label for="pi">Share that really changed <output id="piV"></output></label><input type="range" id="pi" min="0" max="0.5" step="0.01" value="0.1"></div>
        <div class="ctrl"><label for="ef">Size of the real changes (z) <output id="efV"></output></label><input type="range" id="ef" min="0" max="5" step="0.1" value="3"></div>
        <div class="ctrl"><label for="al">α (or q for FDR) <output id="alV"></output></label><input type="range" id="al" min="0.01" max="0.2" step="0.01" value="0.05"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New sample</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Two kinds of guarantee</h2>
          <ul>
            <li><b>Family-wise error rate (FWER)</b>: the chance of even one false alarm across all tests stays below α. Bonferroni and Holm do this. Right when a single false claim is costly, for example a safety finding or one headline result.</li>
            <li><b>False discovery rate (FDR)</b>: on average, no more than a share q of your discoveries are false. Benjamini–Hochberg does this. Right for screening many items where you'll check the flagged ones: SKUs, stores, suppliers, features.</li>
          </ul>
        </section>
        <section>
          <h2>Reading the chart</h2>
          <p>Each dot is one product's p-value, sorted from smallest. Filled dots really changed; hollow ones didn't. A method flags every dot left of where its rule stops:</p>
          <ul>
            <li>No correction: everything under the flat line at α.</li>
            <li>Bonferroni: everything under the much lower flat line at α/m.</li>
            <li>Benjamini–Hochberg: find the last dot under the sloped line (k/m) q, and flag it and all to its left, even ones above the line.</li>
          </ul>
        </section>
        <section>
          <h2>Where it bites in practice</h2>
          <p>Testing every store, SKU or week for an effect; checking dozens of metrics in an <a href="#ab-power">A/B test</a>; trying many features in a model and keeping the significant ones; slicing results by region, channel and month until something shows up. Each extra look is another test, whether or not you write it down. Decide the main comparison in advance, and correct for the rest. The <a href="#ab-power">winner's curse</a> adds to it: the effects that pass a threshold are, on average, overestimated.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Set the share that really changed to 0: with no correction you still get about 10 “discoveries”, all false.</li>
            <li>At the defaults, compare Bonferroni and BH: BH finds more real changes and keeps false ones to a small share.</li>
            <li>Shrink the real changes to z = 2: the corrected methods find fewer than one real change in ten, and “no correction” finds about half only by adding as many false alarms. No correction method can rescue an underpowered test.</li>
          </ul>
        </section>`,
    });
    const Phi = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
    const P = () => ({ m: +$("#m").value, pi: +$("#pi").value, ef: +$("#ef").value, al: +$("#al").value });
    function sample(r, p) { const m1 = Math.round(p.m * p.pi); return Array.from({ length: p.m }, (_, i) => { const real = i < m1, z = (real ? p.ef : 0) + r.normal(); return { real, p: 2 * Phi(-Math.abs(z)) }; }); }
    function flags(T, al) {
      const m = T.length, ord = T.map((t, i) => [t.p, i]).sort((a, b) => a[0] - b[0]), F = { none: new Set(), bonf: new Set(), holm: new Set(), bh: new Set() };
      T.forEach((t, i) => { if (t.p < al) F.none.add(i); if (t.p < al / m) F.bonf.add(i); });
      for (let k = 0; k < m; k++) { if (ord[k][0] <= al / (m - k)) F.holm.add(ord[k][1]); else break; }
      let kb = 0; for (let k = 0; k < m; k++) if (ord[k][0] <= ((k + 1) / m) * al) kb = k + 1;
      for (let k = 0; k < kb; k++) F.bh.add(ord[k][1]);
      return { F, ord, kb };
    }
    const count = (T, S) => { let tp = 0, fp = 0; S.forEach((i) => (T[i].real ? tp++ : fp++)); return { tp, fp }; };
    let T = [];
    function sim() { T = sample(rng(seed), P()); }
    const C1 = new Plot($("#c1"), { pad: { l: 60, b: 38 } }), C2 = new Plot($("#c2"), { pad: { l: 130, r: 40, b: 38 } });
    function d1(p, R) {
      const m = p.m, show = Math.min(m, Math.max(20, Math.min(60, R.kb * 2 + 10, Math.round(m * p.al) + 20))), pts = R.ord.slice(0, show), top = Math.max(p.al * 1.6, pts[pts.length - 1][0] * 1.05);
      C1.resize(); C1.x = [0, show + 1]; C1.y = [0, Math.min(1, top)]; C1.clear(); C1.axes({ xLabel: `rank (smallest p first; showing ${show} of ${m})`, yLabel: "p-value", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 3) });
      C1.path([0, show + 1], [p.al, p.al], css("--muted"), 1.5, [5, 4]);
      C1.path([0, show + 1], [p.al / m, p.al / m], css("--violet"), 1.5, [5, 4]);
      C1.path([0, show + 1], [0, ((show + 1) / m) * p.al], css("--accent"), 1.5);
      if (R.kb) C1.path([R.kb + 0.5, R.kb + 0.5], C1.y, css("--accent"), 1, [2, 3]);
      pts.forEach(([pv, i], k) => C1.dot(k + 1, pv, 4, T[i].real ? css("--ink") : css("--surface"), css(T[i].real ? "--ink" : "--muted")));
      const g = C1.ctx; g.font = `600 11px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "bottom";
      g.fillStyle = css("--muted"); g.fillText(`α = ${p.al}`, C1.w - C1.pad.r - 4, C1.sy(p.al) - 3);
      g.fillStyle = css("--violet"); g.fillText(`α/m = ${fmt(p.al / m, 5)}`, C1.w - C1.pad.r - 4, C1.sy(p.al / m) - 3);
      g.fillStyle = css("--accent"); g.fillText("BH line (k/m) q", C1.w - C1.pad.r - 4, C1.sy(((show + 1) / m) * p.al) - 3);
      const kth = R.kb ? R.ord[R.kb - 1][0] : null;
      $("#c1Cap").innerHTML = `Filled dots: products that really changed. Hollow: no real change. ${R.kb ? `Benjamini–Hochberg: the ${R.kb}${[,'st','nd','rd'][(R.kb%100-20)%10]||[,'st','nd','rd'][R.kb%100]||'th'} smallest p-value, ${fmt(kth, 4)}, is under its line (${R.kb}/${m} × ${p.al} = ${fmt((R.kb / m) * p.al, 4)}), so the ${R.kb} smallest are flagged.` : "Benjamini–Hochberg: no p-value is under its line, so nothing is flagged."} With no correction and no real effects at all, you'd still expect ${fmt(m * p.al, 1)} false alarms; the chance of at least one is 1 − (1 − ${p.al})^${m} = ${(1 - Math.pow(1 - p.al, m)) > 0.999 ? "more than 99.9" : fmt((1 - Math.pow(1 - p.al, m)) * 100, 1)}%.`;
    }
    function d2(p, R) {
      const rows = M.map(([k, n, c]) => ({ n, c, ...count(T, R.F[k]) })), mx = Math.max(5, ...rows.map((r) => r.tp + r.fp)), m1 = Math.round(p.m * p.pi);
      C2.resize(); C2.x = [0, Math.max(mx, m1) * 1.1]; C2.y = [0, rows.length]; C2.clear(); C2.axes({ xLabel: "products flagged", yTicks: [], xFormat: (v) => fmt(v, 0), xCount: 5 });
      const g = C2.ctx, bh = C2.ih / rows.length;
      if (m1) C2.path([m1, m1], [0, rows.length], css("--ink"), 1, [3, 3]);
      rows.forEach((r, i) => { const y = C2.pad.t + i * bh; g.fillStyle = css("--good"); g.globalAlpha = 0.8; g.fillRect(C2.sx(0), y + bh * 0.22, C2.sx(r.tp) - C2.sx(0), bh * 0.56); g.fillStyle = css("--bad"); g.fillRect(C2.sx(r.tp), y + bh * 0.22, C2.sx(r.tp + r.fp) - C2.sx(r.tp), bh * 0.56); g.globalAlpha = 1;
        g.fillStyle = css("--ink"); g.font = `12px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(r.n, C2.pad.l - 8, y + bh / 2); g.font = `10px ${css("--font-mono")}`; g.textAlign = "left"; g.fillText(`${r.tp} + ${r.fp}`, C2.sx(r.tp + r.fp) + 4, y + bh / 2); });
      $("#c2Cap").innerHTML = `Green: real changes found. Red: false discoveries. Dotted: the ${m1} products that really changed.`;
      return rows;
    }
    let cache = {};
    function tbl(p) {
      const key = JSON.stringify(p); if (!cache[key]) { const r = rng(123), A = {}; M.forEach(([k]) => (A[k] = { any: 0, fdp: 0, pow: 0 })); const reps = 400, m1 = Math.round(p.m * p.pi);
        for (let k = 0; k < reps; k++) { const S = sample(r, p), R = flags(S, p.al); M.forEach(([key2]) => { const c = count(S, R.F[key2]); if (c.fp) A[key2].any++; A[key2].fdp += c.tp + c.fp ? c.fp / (c.tp + c.fp) : 0; A[key2].pow += m1 ? c.tp / m1 : 0; }); }
        M.forEach(([k]) => { A[k].any /= reps; A[k].fdp /= reps; A[k].pow /= reps; }); cache = { [key]: A }; }
      const A = cache[key];
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);width:100%"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 6px;text-align:left">method</th><th style="padding:3px 6px">any false alarm</th><th style="padding:3px 6px">share of flags false</th><th style="padding:3px 6px">real changes found</th></tr></thead><tbody>` +
        M.map(([k, n]) => `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 6px;text-align:left;font-family:var(--font-body)">${n}</td><td style="padding:3px 6px"><span class="pill ${A[k].any > p.al + 0.03 ? "bad" : "ok"}">${fmt(A[k].any * 100, 0)}%</span></td><td style="padding:3px 6px"><span class="pill ${A[k].fdp > p.al + 0.03 ? "bad" : "ok"}">${fmt(A[k].fdp * 100, 1)}%</span></td><td style="padding:3px 6px">${p.pi ? fmt(A[k].pow * 100, 0) + "%" : "–"}</td></tr>`).join("") +
        `</tbody></table><p class="hint" style="margin:8px 0 0">“Any false alarm” is the family-wise error rate: Bonferroni and Holm keep it under α = ${p.al}. “Share of flags false” is the false discovery rate: Benjamini–Hochberg keeps it under q = ${p.al}${p.pi ? `, more precisely under q × (share with no real change) = ${fmt(p.al * (1 - p.pi), 3)}` : ""}.</p>`;
    }
    function readouts(rows) { $("#ro").innerHTML = rows.map((r) => [`${r.n}: real / false`, `<span class="num">${r.tp} / <span style="color:var(${r.fp ? "--bad" : "--ink"})">${r.fp}</span></span>`]).map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join(""); }
    function labels(p) { $("#mV").textContent = p.m; $("#piV").textContent = fmt(p.pi * 100, 0) + "% (" + Math.round(p.m * p.pi) + ")"; $("#efV").textContent = fmt(p.ef, 1); $("#alV").textContent = fmt(p.al, 2); }
    function draw() { const p = P(); labels(p); const R = flags(T, p.al); d1(p, R); const rows = d2(p, R); tbl(p); readouts(rows); }
    ["m", "pi", "ef"].forEach((id) => $("#" + id).addEventListener("input", () => { sim(); draw(); }));
    $("#al").addEventListener("input", draw);
    $("#resim").addEventListener("click", () => { seed++; sim(); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 4; sim(); draw(); });
    sim(); draw();
    return watch([$("#c1"), $("#c2")], draw);
  },
});
