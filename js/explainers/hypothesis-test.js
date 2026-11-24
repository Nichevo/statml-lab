Lab.register({
  id: "hypothesis-test",
  group: "Statistical analysis",
  title: "Hypothesis tests and p-values",
  blurb: "Is the difference between two groups real, or could shuffling the labels produce it by chance? Shuffle and see.",
  lede: "A p-value answers one narrow question: if the two groups were really the same, how often would chance alone produce a difference at least as big as the one we saw? A permutation test answers it by literally shuffling the group labels thousands of times.",
  quiz: [
    ["p = 0.03. Does that mean a 3% chance the groups are the same?", "No. It means that if the groups were the same, a difference this big would turn up 3% of the time by chance. The probability the null is true needs a Bayesian analysis."],
    ["Why shuffle the labels?", "If the groups really don't differ, which group a value came from is arbitrary. Shuffling shows the range of differences chance alone produces."],
    ["A test of a tiny, unimportant difference on 1 million customers gives p < 0.001. Should you act?", "Not because of the p-value. With huge samples trivial differences are 'significant'. Look at the effect size and whether it matters commercially."],
    ["You test 20 promotions and one has p = 0.04. Is it a winner?", "Be careful. With 20 tests at 5%, you'd expect about one false positive by chance. Correct for multiple tests (e.g. Bonferroni: 0.05 ÷ 20) or retest it."],
  ],
  diy: {
    intro: "Group A values in A2:A21, group B in B2:B21.",
    steps: [
      ["Observed difference in means.", "E1: =AVERAGE(B2:B21)-AVERAGE(A2:A21)"],
      ["Classic Welch t-test p-value (two-sided, unequal variances).", "=T.TEST(A2:A21,B2:B21,2,3)"],
      ["Permutation test: stack both groups in D2:D41 with a random number beside each.", "D2:D41 = all 40 values\nE2: =RAND()"],
      ["Shuffled 'group B' = the 20 values with the smallest random numbers; difference of means for this shuffle.", "=AVERAGE(IF(RANK(E2:E41,E2:E41)<=20,D2:D41))-AVERAGE(IF(RANK(E2:E41,E2:E41)>20,D2:D41))"],
      ["Repeat the shuffle 1,000 times with a Data Table (What-If Analysis > Data Table, blank input cell) so G2:G1001 hold 1,000 shuffled differences.", ""],
      ["p-value = share of shuffles at least as extreme as observed.", "=COUNTIF(G2:G1001,\">=\"&ABS(E1))/1000+COUNTIF(G2:G1001,\"<=\"&-ABS(E1))/1000"],
      ["Effect size (Cohen's d), so you judge size as well as significance.", "=E1/SQRT((VAR.S(A2:A21)+VAR.S(B2:B21))/2)"],
    ],
  },
  deeper: [
    ["Wasserstein & Lazar (2016), The ASA statement on p-values, The American Statistician 70(2)", "https://doi.org/10.1080/00031305.2016.1154108", "what p-values do and don't mean"],
    ["Greenland et al. (2016), Statistical tests, P values, confidence intervals, and power: a guide to misinterpretations, Eur. J. Epidemiology 31", "https://doi.org/10.1007/s10654-016-0149-3", "25 common misreadings"],
    ["OpenIntro Statistics (free), ch. 5–7", "https://www.openintro.org/book/os/", "tests with randomisation and with formulas"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 58 C 24 58, 32 10, 48 10 S 72 58, 90 58"/><path d="M74 50 C 80 55, 84 58, 90 58 L90 58 L74 58 Z" fill="currentColor"/><line x1="74" y1="24" x2="74" y2="60" stroke-dasharray="3 3"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot short">
          <canvas id="htd" style="aspect-ratio: 5 / 2" aria-label="Dot plot of the two groups"></canvas>
          <div class="legend">
            <span><i style="background:var(--violet)"></i>Group A (control)</span>
            <span><i style="background:var(--accent)"></i>Group B (treatment)</span>
            <span><i style="background:var(--warm)"></i>Difference in means</span>
          </div>
          <figcaption id="dcap">The data you actually collected.</figcaption>
        </figure>
        <figure class="plot wide">
          <canvas id="htp" aria-label="Distribution of differences under shuffled labels"></canvas>
          <figcaption>Each bar counts shuffles that produced that difference. Orange bars are at least as extreme as what you observed: their share is the p-value.</figcaption>
        </figure>`,
      panel: `
        <div class="ctrl">
          <label for="eff">True effect of treatment <output id="effV"></output></label>
          <input type="range" id="eff" min="0" max="3" step="0.1" value="1">
        </div>
        <div class="ctrl">
          <label for="n">People per group <output id="nV"></output></label>
          <input type="range" id="n" min="5" max="60" step="1" value="15">
        </div>
        <div class="ctrl">
          <label for="sd">Person-to-person spread (SD) <output id="sdV"></output></label>
          <input type="range" id="sd" min="0.5" max="4" step="0.1" value="2">
        </div>
        <div class="ctrl">
          <label for="alpha">Significance level α <output id="alphaV"></output></label>
          <input type="range" id="alpha" min="0.01" max="0.1" step="0.01" value="0.05">
        </div>
        <div class="btns">
          <button class="btn" id="one" type="button">Shuffle once</button>
          <button class="btn primary" id="many" type="button">+2,000 shuffles</button>
          <button class="btn" id="newexp" type="button">Run a new experiment</button>
        </div>
        <div class="readouts">
          <div class="ro"><b>Observed difference</b><span class="num" id="obs"></span></div>
          <div class="ro"><b>Shuffles</b><span class="num" id="cnt"></span></div>
          <div class="ro"><b>As extreme or more</b><span class="num" id="ext"></span></div>
          <div class="ro"><b>p-value</b><span class="num big" id="p" style="font-size:1.4rem"></span></div>
          <div class="ro"><b>Verdict</b><span id="verdict"></span></div>
        </div>
        <div>
          <h4>Power check</h4>
          <div class="btns"><button class="btn" id="power" type="button">Repeat the experiment 200 times</button></div>
          <p class="hint" id="powerOut" style="margin-top:8px">How often would this design detect the effect?</p>
        </div>`,
      notes: `
        <section>
          <h2>The logic, step by step</h2>
          <ol>
            <li><b>Null hypothesis</b>: the treatment does nothing, so the labels A and B are arbitrary.</li>
            <li>If that's true, shuffling the labels should give differences just as big as the real one.</li>
            <li>Shuffle many times and record each difference. That pile is the <b>null distribution</b>.</li>
            <li>The <b>p-value</b> is the share of shuffles at least as extreme as the observed difference (either direction).</li>
            <li>If p is below α, call the result <b>statistically significant</b>.</li>
          </ol>
          <div class="eq">p = (number of |shuffled diff| ≥ |observed diff|) / (number of shuffles)</div>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Press "Shuffle once" a few times and watch the dots swap colors. Each shuffle is a world where the treatment did nothing.</li>
            <li>Set the true effect to 0 and run new experiments. About 1 in 20 still comes out "significant" at α = 0.05. Those are false positives.</li>
            <li>With an effect of 1 and 15 per group, run the power check. Then raise the group size to 50 and run it again.</li>
            <li>Lower the spread. Less noise makes the same effect much easier to detect.</li>
          </ol>
        </section>
        <section>
          <h2>What a p-value is not</h2>
          <ul>
            <li>It is not the probability that the null hypothesis is true.</li>
            <li>It says nothing about how big or important the effect is. Huge samples make tiny effects significant.</li>
            <li>A non-significant result is not proof of no effect. It may just mean low <b>power</b>.</li>
            <li>A t-test gives nearly the same answer as this shuffle test, using a formula in place of the shuffling.</li>
          </ul>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const dp = new Plot($("#htd"), { y: [0, 1], pad: { l: 20, r: 20, t: 10, b: 28 } });
    const hp = new Plot($("#htp"), { pad: { l: 46 } });
    let seed = 5, A = [], B = [], obs = 0, diffs = [], shown = null, rnd = rng(99);
    const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;

    function experiment(r, n, eff, sd) {
      const a = Array.from({ length: n }, () => 10 + r.normal() * sd);
      const b = Array.from({ length: n }, () => 10 + eff + r.normal() * sd);
      return [a, b];
    }
    function shuffleDiff(a, b, r) {
      const all = a.concat(b);
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      return { a: all.slice(0, a.length), b: all.slice(a.length) };
    }
    function newExp() {
      [A, B] = experiment(rng(seed++), +$("#n").value, +$("#eff").value, +$("#sd").value);
      obs = mean(B) - mean(A); diffs = []; shown = null;
      $("#powerOut").textContent = "How often would this design detect the effect?";
    }
    function shuffles(k) {
      for (let i = 0; i < k; i++) { const s = shuffleDiff(A, B, rnd); diffs.push(mean(s.b) - mean(s.a)); if (i === k - 1) shown = s; }
    }
    function pval(d, o) { return d.length ? d.filter((x) => Math.abs(x) >= Math.abs(o) - 1e-12).length / d.length : NaN; }

    function draw() {
      $("#effV").textContent = (+$("#eff").value).toFixed(1);
      $("#nV").textContent = $("#n").value;
      $("#sdV").textContent = (+$("#sd").value).toFixed(1);
      $("#alphaV").textContent = (+$("#alpha").value).toFixed(2);
      const ga = shown ? shown.a : A, gb = shown ? shown.b : B;
      const all = A.concat(B), lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.08 + 0.2;
      dp.x = [lo - pad, hi + pad];
      dp.clear();
      dp.axes({ yTicks: [], xCount: 8 });
      const g = dp.ctx, jit = rng(1);
      const rowY = { a: 0.72, b: 0.3 };
      [[ga, "--violet", rowY.a], [gb, "--accent", rowY.b]].forEach(([vals, col, y]) => {
        vals.forEach((v) => dp.dot(v, y + (jit() - 0.5) * 0.18, 4.5, css(col)));
        const m = mean(vals);
        g.strokeStyle = css(col); g.lineWidth = 3;
        g.beginPath(); g.moveTo(dp.sx(m), dp.sy(y + 0.2)); g.lineTo(dp.sx(m), dp.sy(y - 0.2)); g.stroke();
      });
      const ma = mean(ga), mb = mean(gb);
      g.strokeStyle = css("--warm"); g.lineWidth = 2;
      g.beginPath(); g.moveTo(dp.sx(ma), dp.sy(0.51)); g.lineTo(dp.sx(mb), dp.sy(0.51)); g.stroke();
      g.fillStyle = css("--warm"); g.font = `12px ${css("--font-mono")}`; g.textAlign = "center"; g.textBaseline = "bottom";
      g.fillText(`diff ${fmt(mb - ma)}`, dp.sx((ma + mb) / 2), dp.sy(0.53));
      g.fillStyle = css("--muted"); g.textAlign = "left"; g.textBaseline = "middle"; g.font = `12px ${css("--font-body")}`;
      g.fillText("A", dp.pad.l + 4, dp.sy(rowY.a)); g.fillText("B", dp.pad.l + 4, dp.sy(rowY.b));
      $("#dcap").textContent = shown ? "One shuffle: same numbers, labels reassigned at random." : "The data you actually collected.";

      const ext = Math.max(Math.abs(obs) * 1.3, ...diffs.map(Math.abs), 0.5);
      hp.x = [-ext, ext];
      const bins = 50, w = (2 * ext) / bins, h = new Array(bins).fill(0);
      diffs.forEach((d) => { const i = Math.min(bins - 1, Math.floor((d + ext) / w)); if (i >= 0) h[i]++; });
      hp.y = [0, Math.max(5, ...h) * 1.15];
      hp.clear();
      hp.axes({ xLabel: "difference in means (B − A) after shuffling", yLabel: "count", yCount: 4 });
      hp.clip((g2) => {
        h.forEach((c, i) => {
          const x0 = -ext + i * w, mid = x0 + w / 2;
          g2.fillStyle = Math.abs(mid) >= Math.abs(obs) ? css("--warm") : css("--muted");
          g2.globalAlpha = Math.abs(mid) >= Math.abs(obs) ? 0.9 : 0.45;
          g2.fillRect(hp.sx(x0) + 0.5, hp.sy(c), Math.max(1, hp.sx(x0 + w) - hp.sx(x0) - 1), hp.sy(0) - hp.sy(c));
        });
        g2.globalAlpha = 1;
        g2.strokeStyle = css("--warm"); g2.lineWidth = 2; g2.setLineDash([5, 4]);
        [obs, -obs].forEach((o) => { g2.beginPath(); g2.moveTo(hp.sx(o), hp.pad.t); g2.lineTo(hp.sx(o), hp.sy(0)); g2.stroke(); });
        g2.setLineDash([]);
        if (shown && diffs.length) {
          const last = diffs[diffs.length - 1];
          g2.fillStyle = css("--ink"); g2.beginPath(); g2.arc(hp.sx(last), hp.sy(0) - 6, 5, 0, 7); g2.fill();
        }
      });
      const gg = hp.ctx; gg.fillStyle = css("--warm"); gg.font = `12px ${css("--font-mono")}`; gg.textAlign = "left"; gg.textBaseline = "top";
      gg.fillText(`observed ${fmt(obs)}`, Math.min(hp.sx(Math.abs(obs)) + 6, hp.w - 120), hp.pad.t + 4);
      if (!diffs.length) {
        gg.fillStyle = css("--muted"); gg.font = `14px ${css("--font-body")}`; gg.textAlign = "center";
        gg.fillText("Press +2,000 shuffles to build the null distribution", hp.w / 2, hp.h / 2);
      }

      const p = pval(diffs, obs), alpha = +$("#alpha").value;
      $("#obs").textContent = fmt(obs);
      $("#cnt").textContent = diffs.length.toLocaleString();
      $("#ext").textContent = diffs.length ? diffs.filter((x) => Math.abs(x) >= Math.abs(obs) - 1e-12).length.toLocaleString() : "–";
      $("#p").textContent = diffs.length ? (p === 0 ? `< ${(1 / diffs.length).toFixed(4)}` : p.toFixed(4)) : "–";
      $("#verdict").innerHTML = !diffs.length ? `<span class="pill idle">Shuffle first</span>`
        : p < alpha ? `<span class="pill ok">Significant at α = ${alpha.toFixed(2)}</span>` : `<span class="pill warn">Not significant</span>`;
    }

    function power() {
      const n = +$("#n").value, eff = +$("#eff").value, sd = +$("#sd").value, alpha = +$("#alpha").value, r = rng(seed + 1000);
      let hits = 0;
      for (let e = 0; e < 200; e++) {
        const [a, b] = experiment(r, n, eff, sd), o = mean(b) - mean(a), d = [];
        for (let k = 0; k < 300; k++) { const s = shuffleDiff(a, b, r); d.push(mean(s.b) - mean(s.a)); }
        if (pval(d, o) < alpha) hits++;
      }
      $("#powerOut").innerHTML = `<b>${hits} of 200</b> experiments (${((hits / 200) * 100).toFixed(0)}%) came out significant. ` +
        (eff === 0 ? "The true effect is zero, so every one of those is a false positive." : `That is the test's power for an effect of ${eff.toFixed(1)}.`);
    }

    $("#one").addEventListener("click", () => { shuffles(1); draw(); });
    $("#many").addEventListener("click", () => { shuffles(2000); shown = null; draw(); });
    $("#newexp").addEventListener("click", () => { newExp(); shuffles(2000); shown = null; draw(); });
    ["#eff", "#n", "#sd"].forEach((s) => $(s).addEventListener("input", () => { seed--; newExp(); shuffles(2000); shown = null; draw(); }));
    $("#alpha").addEventListener("input", draw);
    $("#power").addEventListener("click", () => { $("#powerOut").textContent = "Running…"; setTimeout(power, 20); });

    newExp(); shuffles(2000); shown = null; draw();
    return watch([dp.c, hp.c], (resized) => { if (resized) { dp.resize(); hp.resize(); } draw(); });
  },
});
