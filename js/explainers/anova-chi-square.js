Lab.register({
  id: "anova-chi-square",
  group: "Statistical analysis",
  title: "Comparing several groups: ANOVA and chi-square",
  blurb: "Do four carriers really differ in delivery time, or is it noise? ANOVA compares averages across many groups; the chi-square test compares counts, such as late deliveries per carrier.",
  lede: "A t-test compares two groups. With four carriers, running six separate t-tests inflates the chance of a false alarm. Analysis of variance (ANOVA) asks one question instead: are the differences between the group averages big compared with the spread inside each group? For counts, such as how many deliveries were late for each carrier, the chi-square test asks the same kind of question: are the counts far from what we'd expect if lateness had nothing to do with the carrier?",
  quiz: [
    ["Why not just run a t-test for every pair of the 4 carriers?", "That's 6 tests. At 5% each, the chance of at least one false alarm is about 1 − 0.95⁶ ≈ 26%. ANOVA tests all groups at once at 5%. If it's significant, follow up with a pairwise method that controls the error rate, such as Tukey's test."],
    ["The F statistic is 1.0. What does that mean?", "The variation between group averages is about the size you'd expect from noise alone, given the spread within groups. No evidence the carriers differ."],
    ["If you double the number of deliveries per carrier with the same true differences, what happens to F?", "It roughly doubles. Group averages become more precise, so the same real gap stands out more clearly against noise. The p-value falls."],
    ["Expected count for carrier B, late = 24 when B has 200 shipments and the overall late rate is 12%. How is that worked out?", "Row total × column total ÷ grand total, which is the same as B's shipments × the overall late rate: 200 × 0.12 = 24."],
    ["Chi-square p = 0.001 for late deliveries by carrier. Does that tell you which carrier is the problem?", "No, only that lateness is related to carrier somewhere. Look at the cell contributions (O − E)²/E or the standardised residuals: the big ones show which carriers are driving it."],
    ["Why should every expected count be at least about 5?", "The chi-square distribution is an approximation that works when expected counts aren't tiny. With very small counts use Fisher's exact test or combine categories."],
  ],
  diy: {
    intro: "ANOVA: delivery days for carriers A–D in columns A–D (rows 2–21). Chi-square: on-time counts in G2:G5 and late counts in H2:H5, one row per carrier.",
    steps: [
      ["Quickest route: Data > Data Analysis > Anova: Single Factor (Analysis ToolPak), select A1:D21.", "Gives SS, df, MS, F, p and F crit"],
      ["Or by formula. Grand mean of all values.", "J1: =AVERAGE(A2:D21)"],
      ["Between-group sum of squares: each group's size × (its mean − grand mean)².", "=SUMPRODUCT(COUNT(A2:A21)*(AVERAGE(A2:A21)-$J$1)^2) … repeat for B–D and add"],
      ["Within-group sum of squares: squared deviations from each group's own mean.", "=DEVSQ(A2:A21)+DEVSQ(B2:B21)+DEVSQ(C2:C21)+DEVSQ(D2:D21)"],
      ["F = (SS between ÷ (k − 1)) ÷ (SS within ÷ (N − k)); p-value from the F distribution.", "=F.DIST.RT(F, 3, 76)"],
      ["Chi-square expected count for a cell = row total × column total ÷ grand total.", "=SUM($G2:$H2)*SUM(G$2:G$5)/SUM($G$2:$H$5)"],
      ["Chi-square p-value straight from observed and expected ranges.", "=CHISQ.TEST(G2:H5, K2:L5)"],
      ["Or the statistic itself, then its p-value with df = (rows − 1) × (columns − 1).", "=SUMPRODUCT((G2:H5-K2:L5)^2/K2:L5) → =CHISQ.DIST.RT(stat, 3)"],
    ],
  },
  deeper: [
    ["NIST/SEMATECH e-Handbook of Statistical Methods: one-way ANOVA", "https://www.itl.nist.gov/div898/handbook/prc/section4/prc43.htm", "a clear worked example with the ANOVA table"],
    ["Penn State STAT 500, Lesson 10: Introduction to ANOVA", "https://online.stat.psu.edu/stat500/lesson/10", "free course notes with examples"],
    ["Penn State STAT 500, Lesson 8: Chi-square test for independence", "https://online.stat.psu.edu/stat500/lesson/8", "contingency tables and expected counts"],
    ["Pearson (1900), On the criterion that a given system of deviations from the probable… , Philosophical Magazine 50(302)", "https://doi.org/10.1080/14786440009463897", "where the chi-square test comes from"],
    ["Tukey (1949), Comparing individual means in the analysis of variance, Biometrics 5(2)", "https://doi.org/10.2307/3001913", "the follow-up: which groups differ"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g stroke-opacity=".5"><circle cx="14" cy="40" r="2"/><circle cx="16" cy="30" r="2"/><circle cx="12" cy="46" r="2"/><circle cx="38" cy="22" r="2"/><circle cx="36" cy="30" r="2"/><circle cx="40" cy="16" r="2"/><circle cx="62" cy="36" r="2"/><circle cx="60" cy="44" r="2"/><circle cx="64" cy="28" r="2"/><circle cx="86" cy="12" r="2"/><circle cx="84" cy="20" r="2"/><circle cx="88" cy="26" r="2"/></g><path d="M6 38 H22 M30 22 H46 M54 36 H70 M78 19 H94" stroke-width="3"/><path d="M4 28 H94" stroke-dasharray="3 3"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, pfUpper, pchisqUpper, dchisq, dF } = Lab;
    const K = 4, NMAX = 40, NAMES = ["A", "B", "C", "D"], OFF = [-1, -0.25, 0.35, 0.9];
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const pfmt = (p) => (p < 0.0001 ? "< 0.0001" : p.toFixed(p < 0.01 ? 4 : 3));
    const sig = (p) => `<span class="pill ${p < 0.05 ? "ok" : "idle"}">${p < 0.05 ? "significant at 5%" : "not significant"}</span>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <h3 style="margin:0 0 8px;font:700 1.15rem/1.2 var(--font-display)">1 · ANOVA: delivery days by carrier</h3>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0;display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center">${h4("Each delivery, by carrier")}<div class="seg" id="view"><button type="button" data-v="within" aria-pressed="true">Spread within</button><button type="button" data-v="between" aria-pressed="false">Spread between</button></div></div><canvas id="a1" aria-label="Delivery days for four carriers with group means"></canvas><figcaption id="a1Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("How unusual is this F if carriers were identical?")}</div><canvas id="a2" aria-label="F distribution with the observed F statistic"></canvas><figcaption id="a2Cap"></figcaption></figure>`)}
        <div class="plot" style="padding:14px;margin-top:14px">${h4("ANOVA table")}<div style="overflow-x:auto"><table class="tbl" id="atab" style="width:100%;border-collapse:collapse;font:.84rem/1.5 var(--font-mono)"></table></div><div id="awork" style="font:.8rem/1.8 var(--font-mono);margin-top:8px;color:var(--muted)"></div></div>
        <h3 style="margin:26px 0 8px;font:700 1.15rem/1.2 var(--font-display)">2 · Chi-square: late deliveries by carrier</h3>
        ${two(`<div class="plot" style="padding:14px">${h4("Observed counts (edit them) and expected counts")}<div style="overflow-x:auto"><table id="ctab" style="width:100%;border-collapse:collapse;font:.84rem/1.4 var(--font-mono)"></table></div><p class="hint" style="margin-top:8px">Cell colour = its contribution (O − E)² ÷ E to the chi-square total. Orange: more late than expected; blue: fewer.</p></div>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("How unusual is this chi-square if lateness ignored carrier?")}</div><canvas id="c1" aria-label="Chi-square distribution with the observed statistic"></canvas><figcaption id="c1Cap"></figcaption></figure>`)}
        <div class="plot" style="padding:14px;margin-top:14px">${h4("Worked out")}<div id="cwork" style="font:.8rem/1.8 var(--font-mono)"></div></div>`,
      panel: `
        <p class="hint" style="margin:0"><b>ANOVA</b> · four carriers, true average delivery around 4 days.</p>
        <div class="ctrl"><label for="eff">Real gap between carriers <output id="effV"></output></label><input type="range" id="eff" min="0" max="1.5" step="0.05" value="0.5"></div>
        <div class="ctrl"><label for="sd">Spread within a carrier (SD) <output id="sdV"></output></label><input type="range" id="sd" min="0.2" max="2" step="0.05" value="1"></div>
        <div class="ctrl"><label for="n">Deliveries per carrier <output id="nV"></output></label><input type="range" id="n" min="3" max="40" step="1" value="10"></div>
        <p class="hint" style="margin:6px 0 0"><b>Chi-square</b> · on-time vs late shipments.</p>
        <div class="ctrl"><label for="lr">Real gap in late rates <output id="lrV"></output></label><input type="range" id="lr" min="0" max="0.2" step="0.01" value="0.06"></div>
        <div class="ctrl"><label for="ns">Shipments per carrier <output id="nsV"></output></label><input type="range" id="ns" min="20" max="500" step="10" value="150"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resample" type="button">New sample</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>ANOVA: splitting the variation</h2>
          <p>Every delivery's distance from the grand average splits into two parts: how far its carrier's average is from the grand average (<b>between</b>), and how far the delivery is from its own carrier's average (<b>within</b>). Square and add them up:</p>
          <div class="eq">SS total = SS between + SS within<br>F = [SS between ÷ (k − 1)] ÷ [SS within ÷ (N − k)]</div>
          <p>The top and bottom of F are both estimates of the noise variance <i>if</i> the carriers are identical, so F should be around 1. Real differences inflate the top. The p-value is the chance of an F this large from the F distribution with (k − 1, N − k) degrees of freedom.</p>
          <p>ANOVA assumes roughly normal data with similar spread in each group, and independent observations. With very unequal spreads, use Welch's ANOVA; with skewed data or outliers, the Kruskal–Wallis test.</p>
        </section>
        <section>
          <h2>After a significant ANOVA</h2>
          <p>ANOVA says "at least one carrier differs", not which. Use Tukey's honestly significant difference (HSD) to compare pairs while keeping the overall false-alarm rate at 5%. And look at the size of the gap: half a day might matter for fresh food and not at all for spare parts.</p>
        </section>
        <section>
          <h2>Chi-square: counts against expectations</h2>
          <div class="eq">expected = row total × column total ÷ grand total<br>χ² = Σ (observed − expected)² ÷ expected, &nbsp; df = (rows − 1) × (columns − 1)</div>
          <p>If lateness has nothing to do with carrier, every carrier should be late at the overall rate. The expected counts are what that would look like. Big gaps, relative to the expected count, push χ² up. Keep expected counts above about 5; otherwise use Fisher's exact test or merge categories.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set the real gap to 0 and press "New sample" a few times. F hovers around 1 and p is usually above 0.05, but roughly 1 time in 20 it isn't: that's a false alarm.</li>
            <li>Keep a small gap (0.3 days) and raise deliveries per carrier from 10 to 40. The same gap becomes significant.</li>
            <li>Switch the dot chart between "Spread within" and "Spread between" to see the two halves of F.</li>
            <li>In the chi-square table, type a much bigger late count for one carrier and watch its cell light up.</li>
          </ol>
          <p>Related: <a href="#hypothesis-test">two-group tests and p-values</a>, <a href="#confidence-intervals">confidence intervals</a>, <a href="#distributions">distributions</a> and <a href="#which-method">which method when</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let seed = 3, Z = null, ZC = null, view = "within", edited = null;
    const draw = () => { const r = rng(seed * 101 + 7); Z = Array.from({ length: K }, () => Array.from({ length: NMAX }, () => r.normal())); ZC = Array.from({ length: K }, () => r.normal()); };
    draw();
    const pa1 = new Plot($("#a1"), { x: [0.4, K + 0.6], pad: { l: 46, b: 38 } }), pa2 = new Plot($("#a2"), { x: [0, 8], pad: { l: 46, b: 38 } }), pc1 = new Plot($("#c1"), { x: [0, 20], pad: { l: 46, b: 38 } });
    let A = null, C = null;

    function anova() {
      const eff = +$("#eff").value, sd = +$("#sd").value, n = +$("#n").value;
      const g = OFF.map((o, i) => Z[i].slice(0, n).map((z) => Math.max(0.5, 4 + o * eff + sd * z)));
      const m = g.map((v) => v.reduce((a, b) => a + b, 0) / n), all = g.flat(), N = all.length, gm = all.reduce((a, b) => a + b, 0) / N;
      const ssb = m.reduce((a, v) => a + n * (v - gm) ** 2, 0), ssw = g.reduce((a, v, i) => a + v.reduce((s, x) => s + (x - m[i]) ** 2, 0), 0);
      const d1 = K - 1, d2 = N - K, msb = ssb / d1, msw = ssw / d2, F = msb / msw, p = pfUpper(F, d1, d2);
      A = { g, m, gm, ssb, ssw, d1, d2, msb, msw, F, p, n, N, eff, sd };
    }
    function chisq() {
      const gap = +$("#lr").value, ns = +$("#ns").value;
      let O;
      if (edited) O = edited;
      else O = OFF.map((o, i) => { const p = Math.min(0.95, Math.max(0.01, 0.12 + (o / 1.9) * gap)); const late = Math.max(0, Math.min(ns, Math.round(ns * p + Math.sqrt(ns * p * (1 - p)) * ZC[i]))); return [ns - late, late]; });
      const R = O.map((r) => r[0] + r[1]), Cc = [0, 1].map((j) => O.reduce((a, r) => a + r[j], 0)), T = R.reduce((a, b) => a + b, 0);
      const E = O.map((r, i) => [0, 1].map((j) => (R[i] * Cc[j]) / (T || 1)));
      const cont = O.map((r, i) => r.map((o, j) => (E[i][j] > 0 ? (o - E[i][j]) ** 2 / E[i][j] : 0)));
      const X = cont.flat().reduce((a, b) => a + b, 0), df = (K - 1) * 1, p = pchisqUpper(X, df), minE = Math.min(...E.flat());
      C = { O, R, Cc, T, E, cont, X, df, p, minE };
    }
    function dA1() {
      const { g, m, gm } = A, all = g.flat(), lo = Math.min(...all, gm) - 0.4, hi = Math.max(...all, gm) + 0.4, ctx = pa1.ctx;
      pa1.resize(); pa1.y = [Math.max(0, lo), hi]; pa1.clear();
      pa1.axes({ xLabel: "carrier", yLabel: "delivery days", xTicks: [1, 2, 3, 4], xFormat: (v) => NAMES[v - 1], yFormat: (v) => fmt(v, 1) });
      pa1.path([0.4, K + 0.6], [gm, gm], css("--muted"), 1.5, [5, 4]);
      g.forEach((v, i) => {
        v.forEach((y, j) => {
          const x = i + 1 + ((j % 9) - 4) * 0.045;
          if (view === "within") pa1.path([x, x], [y, m[i]], css("--warm"), 1, null, 0.5);
          pa1.dot(x, y, 3, css("--ink"));
        });
        pa1.path([i + 0.7, i + 1.3], [m[i], m[i]], css("--accent"), 3);
        if (view === "between") { ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = css("--violet"); const y0 = pa1.sy(gm), y1 = pa1.sy(m[i]); ctx.fillRect(pa1.sx(i + 0.72), Math.min(y0, y1), pa1.sx(i + 1.28) - pa1.sx(i + 0.72), Math.abs(y1 - y0)); ctx.restore(); pa1.path([i + 1, i + 1], [gm, m[i]], css("--violet"), 2.5); }
      });
      $("#a1Cap").innerHTML = `Blue bars: carrier averages (${m.map((v, i) => `${NAMES[i]} ${fmt(v, 2)}`).join(", ")}). Dashed: grand average ${fmt(gm, 2)}. ${view === "within" ? `Orange lines: each delivery's gap to its own carrier's average. Their squares add up to SS within = <b>${fmt(A.ssw, 1)}</b>.` : `Purple: each carrier average's gap to the grand average. Squared, times ${A.n} deliveries, they add up to SS between = <b>${fmt(A.ssb, 1)}</b>.`}`;
    }
    function dA2() {
      const { F, d1, d2, p } = A, xmax = Math.max(6, F * 1.25), ctx = pa2.ctx;
      const xs = Array.from({ length: 241 }, (_, i) => 0.001 + (i / 240) * xmax), ys = xs.map((x) => dF(x, d1, d2)), top = Math.min(1.2, Math.max(...ys.slice(3))) * 1.12;
      pa2.resize(); pa2.x = [0, xmax]; pa2.y = [0, top]; pa2.clear();
      pa2.axes({ xLabel: `F with (${d1}, ${d2}) degrees of freedom`, yLabel: "density", yFormat: (v) => fmt(v, 2) });
      pa2.clip(() => { ctx.save(); ctx.fillStyle = css("--warm"); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(pa2.sx(Math.min(F, xmax)), pa2.sy(0)); xs.filter((x) => x >= F).forEach((x) => ctx.lineTo(pa2.sx(x), pa2.sy(Math.min(top, dF(x, d1, d2))))); ctx.lineTo(pa2.sx(xmax), pa2.sy(0)); ctx.closePath(); ctx.fill(); ctx.restore(); });
      pa2.path(xs, ys.map((v) => Math.min(v, top)), css("--accent"), 2.5);
      const crit = (() => { let lo = 0, hi = 50; for (let i = 0; i < 60; i++) { const md = (lo + hi) / 2; if (pfUpper(md, d1, d2) > 0.05) lo = md; else hi = md; } return lo; })();
      if (crit < xmax) pa2.path([crit, crit], [0, top], css("--muted"), 1, [3, 3]);
      pa2.path([Math.min(F, xmax), Math.min(F, xmax)], [0, top], css("--warm"), 2.5);
      $("#a2Cap").innerHTML = `Observed F = <b>${fmt(F, 2)}</b>. Shaded tail = p-value = <b>${pfmt(p)}</b>: the chance of an F at least this big if the carriers were identical. Grey dashed: the 5% cut-off (${fmt(crit, 2)}).`;
      A.crit = crit;
    }
    function tabA() {
      const { ssb, ssw, d1, d2, msb, msw, F, p } = A, td = (v, b) => `<td style="padding:4px 8px;text-align:right;border-bottom:1px solid var(--line)">${b ? `<b>${v}</b>` : v}</td>`, th = (v) => `<th style="padding:4px 8px;text-align:right;color:var(--muted);font-weight:500;border-bottom:1px solid var(--line)">${v}</th>`;
      $("#atab").innerHTML = `<tr><th style="text-align:left;padding:4px 8px;color:var(--muted);font-weight:500;border-bottom:1px solid var(--line)">source</th>${["sum of squares", "df", "mean square", "F", "p-value"].map(th).join("")}</tr>
        <tr><td style="padding:4px 8px;border-bottom:1px solid var(--line)">between carriers</td>${td(fmt(ssb, 2))}${td(d1)}${td(fmt(msb, 3))}${td(fmt(F, 2), 1)}${td(pfmt(p), 1)}</tr>
        <tr><td style="padding:4px 8px;border-bottom:1px solid var(--line)">within carriers</td>${td(fmt(ssw, 2))}${td(d2)}${td(fmt(msw, 3))}${td("")}${td("")}</tr>
        <tr><td style="padding:4px 8px">total</td>${td(fmt(ssb + ssw, 2))}${td(d1 + d2)}${td("")}${td("")}${td("")}</tr>`;
      $("#awork").innerHTML = `F = (${fmt(ssb, 2)} ÷ ${d1}) ÷ (${fmt(ssw, 2)} ÷ ${d2}) = ${fmt(msb, 3)} ÷ ${fmt(msw, 3)} = <b style="color:var(--ink)">${fmt(F, 2)}</b> &nbsp;→&nbsp; p = F.DIST.RT(${fmt(F, 2)}, ${d1}, ${d2}) = <b style="color:var(--ink)">${pfmt(p)}</b>`;
    }
    function tabC() {
      const tb = $("#ctab"), th = (v) => `<th style="padding:4px 6px;color:var(--muted);font-weight:500;border-bottom:1px solid var(--line)">${v}</th>`, bd = "border-bottom:1px solid var(--line);text-align:center";
      if (!tb.dataset.built) {
        tb.innerHTML = `<tr>${th("carrier")}${th("on time")}${th("late")}${th("total")}${th("late %")}</tr>` +
          NAMES.map((nm, i) => `<tr><td style="padding:4px 6px;${bd}">${nm}</td>${[0, 1].map((j) => `<td data-c="${i}${j}" style="padding:4px 6px;${bd}"><input type="number" min="0" step="1" data-i="${i}" data-j="${j}" aria-label="carrier ${nm} ${j ? "late" : "on time"}" style="width:5.2em;font:inherit;text-align:right;padding:3px 4px;border:1px solid var(--line);border-radius:5px;background:var(--surface);color:var(--ink)"><div class="ce" style="font-size:.74rem;color:var(--muted)"></div></td>`).join("")}<td data-r="${i}" style="${bd}"></td><td data-p="${i}" style="${bd}"></td></tr>`).join("") +
          `<tr><td style="padding:4px 6px;text-align:center">total</td><td data-t="0" style="text-align:center"></td><td data-t="1" style="text-align:center"></td><td data-t="T" style="text-align:center"></td><td data-t="p" style="text-align:center"></td></tr>`;
        tb.dataset.built = "1";
        tb.querySelectorAll("input").forEach((inp) => inp.addEventListener("change", () => {
          const cur = C.O.map((r) => r.slice()); cur[+inp.dataset.i][+inp.dataset.j] = Math.max(0, Math.round(+inp.value || 0)); edited = cur; chisq(); renderC(); readouts();
        }));
      }
      const { O, E, cont, R, Cc, T } = C, mx = Math.max(1, ...cont.flat());
      O.forEach((r, i) => {
        [0, 1].forEach((j) => {
          const td = tb.querySelector(`[data-c="${i}${j}"]`), inp = td.querySelector("input"), c = cont[i][j], hot = (O[i][j] > E[i][j]) === (j === 1) ? "--warm" : "--accent";
          if (document.activeElement !== inp) inp.value = O[i][j];
          td.style.background = `color-mix(in srgb, var(${hot}) ${Math.round((c / mx) * 45)}%, transparent)`;
          td.querySelector(".ce").textContent = `exp ${fmt(E[i][j], 1)} · ${fmt(c, 2)}`;
        });
        tb.querySelector(`[data-r="${i}"]`).textContent = R[i];
        tb.querySelector(`[data-p="${i}"]`).textContent = R[i] ? fmt((r[1] / R[i]) * 100, 1) + "%" : "–";
      });
      tb.querySelector('[data-t="0"]').textContent = Cc[0]; tb.querySelector('[data-t="1"]').textContent = Cc[1]; tb.querySelector('[data-t="T"]').textContent = T;
      tb.querySelector('[data-t="p"]').textContent = T ? fmt((Cc[1] / T) * 100, 1) + "%" : "–";
    }
    function dC1() {
      const { X, df, p } = C, xmax = Math.max(14, X * 1.2), ctx = pc1.ctx, xs = Array.from({ length: 241 }, (_, i) => 0.02 + (i / 240) * xmax), ys = xs.map((x) => dchisq(x, df)), top = Math.max(...ys) * 1.15;
      pc1.resize(); pc1.x = [0, xmax]; pc1.y = [0, top]; pc1.clear();
      pc1.axes({ xLabel: `χ² with ${df} degrees of freedom`, yLabel: "density", yFormat: (v) => fmt(v, 2) });
      pc1.clip(() => { ctx.save(); ctx.fillStyle = css("--warm"); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(pc1.sx(X), pc1.sy(0)); xs.filter((x) => x >= X).forEach((x) => ctx.lineTo(pc1.sx(x), pc1.sy(dchisq(x, df)))); ctx.lineTo(pc1.sx(xmax), pc1.sy(0)); ctx.closePath(); ctx.fill(); ctx.restore(); });
      pc1.path(xs, ys, css("--accent"), 2.5);
      pc1.path([7.815, 7.815], [0, top], css("--muted"), 1, [3, 3]);
      pc1.path([Math.min(X, xmax), Math.min(X, xmax)], [0, top], css("--warm"), 2.5);
      $("#c1Cap").innerHTML = `χ² = <b>${fmt(X, 2)}</b>, p = <b>${pfmt(p)}</b>. Grey dashed: the 5% cut-off for 3 df (7.81).${C.minE < 5 ? ` <b>Caution:</b> smallest expected count is ${fmt(C.minE, 1)}, below 5, so the p-value is only approximate.` : ""}`;
    }
    function workC() {
      const { O, E, R, Cc, T, cont, X, df, p } = C, i = cont.map((r) => r[1]).indexOf(Math.max(...cont.map((r) => r[1])));
      $("#cwork").innerHTML = [
        `overall late rate = ${Cc[1]} ÷ ${T} = ${fmt((Cc[1] / (T || 1)) * 100, 2)}%`,
        `carrier ${NAMES[i]}, late: expected = ${R[i]} × ${Cc[1]} ÷ ${T} = ${fmt(E[i][1], 2)}; observed ${O[i][1]}; contribution = (${O[i][1]} − ${fmt(E[i][1], 2)})² ÷ ${fmt(E[i][1], 2)} = <b>${fmt(cont[i][1], 3)}</b>`,
        `χ² = sum of all 8 contributions = <b>${fmt(X, 3)}</b>; df = (4 − 1) × (2 − 1) = ${df}; p = CHISQ.DIST.RT(${fmt(X, 2)}, ${df}) = <b>${pfmt(p)}</b>`,
      ].map((l) => `<div style="margin-bottom:4px">${l}</div>`).join("");
    }
    function readouts() {
      $("#ro").innerHTML = `<div class="ro"><b>ANOVA F</b><span class="num">${fmt(A.F, 2)}</span></div>
        <div class="ro"><b>ANOVA p-value</b><span class="num">${pfmt(A.p)}</span></div>
        <div class="ro"><b>Carriers differ?</b>${sig(A.p)}</div>
        <div class="ro"><b>Chi-square</b><span class="num">${fmt(C.X, 2)}</span></div>
        <div class="ro"><b>Chi-square p-value</b><span class="num">${pfmt(C.p)}</span></div>
        <div class="ro"><b>Lateness linked to carrier?</b>${sig(C.p)}</div>`;
    }
    function labels() {
      $("#effV").textContent = `±${fmt(+$("#eff").value, 2)} days`; $("#sdV").textContent = `${fmt(+$("#sd").value, 2)} days`; $("#nV").textContent = $("#n").value;
      $("#lrV").textContent = `${Math.round(+$("#lr").value * 100)} pts, best to worst`; $("#nsV").textContent = $("#ns").value;
    }
    function renderA() { dA1(); dA2(); tabA(); }
    function renderC() { tabC(); dC1(); workC(); }
    function update() { labels(); anova(); chisq(); renderA(); renderC(); readouts(); }
    ["#eff", "#sd", "#n"].forEach((s) => $(s).addEventListener("input", update));
    ["#lr", "#ns"].forEach((s) => $(s).addEventListener("input", () => { edited = null; update(); }));
    $("#view").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { view = b.dataset.v; $("#view").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); dA1(); }));
    $("#resample").addEventListener("click", () => { seed++; edited = null; draw(); update(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 3; edited = null; view = "within"; $("#view").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === "within"))); draw(); update(); });
    update();
    return watch([$("#a1"), $("#a2"), $("#c1")], () => { renderA(); dC1(); });
  },
});
