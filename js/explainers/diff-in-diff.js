Lab.register({
  id: "diff-in-diff",
  group: "Statistical analysis",
  title: "Did the change really work? Difference-in-differences and causal impact",
  blurb: "A new replenishment system went live in the North stores in week 30, and sales rose. But summer started too. Comparing the change in the North with the change in similar South stores separates the system's effect from everything else.",
  lede: "When you can't run a randomised trial, you still want to know what a change did: a new system, a price change, a store refit. 'After minus before' mixes the effect with seasonality, trends and market shocks. 'Changed stores minus unchanged stores' mixes it with the fact that the stores were different to begin with. Difference-in-differences subtracts one from the other, so anything the two groups share drops out. Causal-impact methods go a step further: they learn how the changed stores tracked the control stores before the change, predict what would have happened without it, and measure the gap week by week.",
  quiz: [
    ["North sales went from 200 to 260 a week; South from 150 to 190. What's the difference-in-differences estimate?", "(260 − 200) − (190 − 150) = 60 − 40 = +20 a week. The South's +40 shows what would probably have happened to the North anyway."],
    ["What's the key assumption behind difference-in-differences?", "Parallel trends: without the change, both groups would have moved by the same amount. Check it by plotting the pre-period: the lines should run roughly parallel before the change."],
    ["Why is 'after − before' in the North alone usually wrong?", "It credits the change with everything else that happened at the same time, such as seasonality, a market upturn or a competitor closing."],
    ["The North stores were chosen because they were doing badly. What could go wrong?", "Regression to the mean: unusually bad stores tend to recover anyway, which looks like an effect. Selection based on recent performance breaks the parallel-trends assumption."],
    ["How does the 'causal impact' approach improve on plain difference-in-differences?", "Instead of assuming a fixed gap, it fits a model (here a regression of North on South) on the pre-period, so it can handle different scales and seasonality, and it gives a week-by-week effect with an uncertainty band."],
  ],
  diy: {
    intro: "Weekly data in rows: A week, B group (\"North\" or \"South\"), C period (\"before\" or \"after\"), D sales.",
    steps: [
      ["The four averages (a 2×2 table).", "=AVERAGEIFS(D:D, B:B, \"North\", C:C, \"after\")   …and the other three combinations"],
      ["Difference-in-differences.", "=(North_after − North_before) − (South_after − South_before)"],
      ["The same as a regression: sales on North, after and North×after; the coefficient on North×after is the DiD estimate.", "=LINEST(D2:D105, E2:G105, TRUE, TRUE)"],
      ["Causal-impact style: in the pre-period, regress North on South (weekly pairs in H:I).", "slope: =SLOPE(North_pre, South_pre)   intercept: =INTERCEPT(North_pre, South_pre)"],
      ["Counterfactual for each post week, and the effect.", "=intercept + slope*South_week   effect: =North_week − counterfactual"],
      ["Rough 90% band for the cumulative effect over k weeks, using the pre-period residual SD (STEYX).", "=1.645*STEYX(North_pre, South_pre)*SQRT(k)"],
    ],
  },
  deeper: [
    ["Card & Krueger (1993), Minimum wages and employment: a case study of the fast-food industry in New Jersey and Pennsylvania, NBER working paper 4509 (published in AER 1994)", "https://www.nber.org/papers/w4509", "the classic difference-in-differences study"],
    ["Brodersen, Gallusser, Koehler, Remy & Scott (2015), Inferring causal impact using Bayesian structural time-series models, Annals of Applied Statistics 9(1)", "https://doi.org/10.1214/14-AOAS788", "the CausalImpact method from Google"],
    ["Abadie, Diamond & Hainmueller (2010), Synthetic control methods for comparative case studies, JASA 105(490)", "https://doi.org/10.1198/jasa.2009.ap08746", "building a control group as a weighted mix of units"],
    ["Cunningham, Causal Inference: The Mixtape (online edition), ch. 9 Difference-in-differences (free)", "https://mixtape.scunning.com/09-difference_in_differences", "a readable modern treatment"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 44 L48 38 L90 32" stroke-opacity=".5"/><path d="M6 26 L48 20" stroke-width="2.5"/><path d="M48 20 L90 14" stroke-dasharray="4 3"/><path d="M48 20 L90 4" stroke-width="2.5"/><path d="M48 4 V60" stroke-dasharray="2 3" stroke-opacity=".5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const N = 52;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const key = (c, t, dash) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><svg width="20" height="8"><path d="M1 4 H19" stroke="${c}" stroke-width="2.5" ${dash ? 'stroke-dasharray="4 3"' : ""}/></svg>${t}</span>`;
    const sg = (v) => (v >= 0 ? "+" : "−") + fmt(Math.abs(v), 1);

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0"><div style="padding:4px 6px 0">${h4("Average weekly sales per store")}</div><canvas id="d1" aria-label="Weekly sales for treated and control stores"></canvas><div id="d1Key" style="padding:0 8px;font-size:.82rem;color:var(--muted)"></div><figcaption id="d1Cap"></figcaption></figure>
        ${two(`<div class="plot" style="padding:14px">${h4("Four ways to estimate the effect")}<div id="est" style="display:grid;gap:7px"></div><p class="hint" id="estCap" style="margin-top:8px"></p></div>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Cumulative effect since the change")}</div><canvas id="d2" aria-label="Cumulative effect with uncertainty band"></canvas><figcaption id="d2Cap"></figcaption></figure>`)}
        <div class="plot" style="padding:14px">${h4("Worked out: the 2 × 2 table")}<div style="overflow-x:auto"><table id="tbl" style="border-collapse:collapse;font:.84rem/1.5 var(--font-mono);min-width:100%"></table></div><div id="work" style="font:.8rem/1.8 var(--font-mono);margin-top:8px"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">North stores get the new system; South stores don't. Set what really happened:</p>
        <div class="ctrl"><label for="eff">True effect of the system <output id="effV"></output></label><input type="range" id="eff" min="-20" max="40" step="1" value="15"></div>
        <div class="ctrl"><label for="wk">Week it went live <output id="wkV"></output></label><input type="range" id="wk" min="12" max="44" step="1" value="30"></div>
        <div class="ctrl"><label for="gap">North sells more anyway (level gap) <output id="gapV"></output></label><input type="range" id="gap" min="0" max="120" step="5" value="60"></div>
        <div class="ctrl"><label for="ss">Summer lift shared by both regions <output id="ssV"></output></label><input type="range" id="ss" min="0" max="80" step="5" value="40"></div>
        <div class="ctrl"><label for="pt">North's own extra trend (breaks parallel trends) <output id="ptV"></output></label><input type="range" id="pt" min="-1.5" max="1.5" step="0.1" value="0"></div>
        <div class="ctrl"><label for="nz">Week-to-week noise <output id="nzV"></output></label><input type="range" id="nz" min="1" max="20" step="1" value="6"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New noise</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Difference-in-differences</h2>
          <div class="eq">DiD = (treated after − treated before) − (control after − control before)</div>
          <p>The first bracket contains the effect plus everything else that changed over time. The second bracket estimates "everything else" from stores that didn't get the change. Subtracting removes it, along with any permanent difference between the groups. The same number comes out of a regression of sales on a treated flag, an after flag and their product; the regression form adds standard errors and other controls.</p>
        </section>
        <section>
          <h2>Parallel trends</h2>
          <p>The method assumes the two groups would have moved in step without the change. Look at the pre-period: if the lines diverge before the change, they probably would have afterwards too, and the estimate will absorb that drift. The "North's own extra trend" slider breaks this assumption so you can see the bias it causes.</p>
        </section>
        <section>
          <h2>Causal impact (counterfactual prediction)</h2>
          <p>Fit North = a + b × South on the pre-period, then use South's post-period sales to predict North's sales without the change. The weekly gaps are the effect; their running total is the cumulative effect, with a band from the pre-period prediction error. Google's CausalImpact package does this with a Bayesian time-series model and several control series; synthetic control builds the counterfactual as a weighted mix of many untreated units.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Compare the four estimates with the true effect. "After − before" picks up the summer lift; "North − South after" picks up the level gap.</li>
            <li>Set the true effect to 0: DiD and causal impact stay near 0, the naive estimates don't.</li>
            <li>Add North's own trend (+1). Even DiD goes wrong, and the pre-period lines visibly diverge: the warning sign.</li>
            <li>Raise the noise and watch the uncertainty band widen.</li>
          </ol>
          <p>Related: <a href="#ab-power">A/B tests</a> (when you can randomise), <a href="#promo-regression">regression with promotions</a>, <a href="#correlation-traps">correlation traps</a> and <a href="#forecast-value-added">forecast value added</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let seed = 12, E = null, S = null;
    const gen = () => { const r = rng(seed * 61 + 2); E = Array.from({ length: 2 * N }, () => r.normal()); };
    gen();
    const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
    function compute() {
      const eff = +$("#eff").value, wk = +$("#wk").value, gap = +$("#gap").value, ss = +$("#ss").value, pt = +$("#pt").value, nz = +$("#nz").value;
      const season = (t) => ss * Math.exp(-Math.pow((t - 32) / 9, 2)) + 0.3 * t;
      const South = [], North = [], NorthCF = [];
      for (let t = 1; t <= N; t++) { const base = 150 + season(t); South.push(base + nz * E[t - 1]); const cf = base + gap + pt * t + nz * E[N + t - 1]; NorthCF.push(cf); North.push(cf + (t >= wk ? eff : 0)); }
      const pre = (a) => a.slice(0, wk - 1), post = (a) => a.slice(wk - 1);
      const nb = mean(pre(North)), na = mean(post(North)), sb = mean(pre(South)), sa = mean(post(South));
      const did = na - nb - (sa - sb), naive = na - nb, cross = na - sa, trueAvg = eff + pt * (mean(post(Array.from({ length: N }, (_, i) => i + 1))) - mean(pre(Array.from({ length: N }, (_, i) => i + 1)))) * 0;
      const xs = pre(South), ys = pre(North), mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
      const b = sxx ? sxy / sxx : 0, a = my - b * mx, res = ys.map((y, i) => y - (a + b * xs[i])), sdr = Math.sqrt(res.reduce((s, v) => s + v * v, 0) / Math.max(1, res.length - 2));
      const cf = South.map((x) => a + b * x), effW = North.map((y, i) => y - cf[i]), postEff = post(effW), ci = mean(postEff);
      let cum = 0; const cumE = postEff.map((v) => (cum += v)), band = postEff.map((_, i) => 1.645 * sdr * Math.sqrt(i + 1));
      S = { eff, wk, gap, ss, pt, nz, South, North, NorthCF, nb, na, sb, sa, did, naive, cross, a, b, sdr, cf, effW, ci, cumE, band, trueCum: eff * postEff.length + post(NorthCF).reduce((s, v, i) => s, 0) };
    }
    const P1 = new Plot($("#d1"), { x: [1, N], pad: { l: 46, b: 38 } }), P2 = new Plot($("#d2"), { x: [0, 1], pad: { l: 50, b: 38 } });
    function d1() {
      const { North, South, cf, wk } = S, xs = North.map((_, i) => i + 1), all = [...North, ...South, ...cf], lo = Math.min(...all) - 8, hi = Math.max(...all) + 8, g = P1.ctx;
      P1.resize(); P1.y = [lo, hi]; P1.clear();
      g.save(); g.fillStyle = css("--grid"); g.fillRect(P1.sx(wk - 0.5), P1.pad.t, P1.sx(N) - P1.sx(wk - 0.5), P1.ih); g.restore();
      P1.axes({ xLabel: "week", yLabel: "units per store", yFormat: (v) => fmt(v, 0) });
      const px = xs.slice(wk - 1);
      g.save(); g.fillStyle = css("--warm"); g.globalAlpha = 0.18; g.beginPath(); px.forEach((x, i) => (i ? g.lineTo : g.moveTo).call(g, P1.sx(x), P1.sy(North[x - 1]))); [...px].reverse().forEach((x) => g.lineTo(P1.sx(x), P1.sy(cf[x - 1]))); g.closePath(); g.fill(); g.restore();
      P1.path(xs, South, css("--muted"), 2); P1.path(xs, North, css("--accent"), 2.5); P1.path(px, px.map((x) => cf[x - 1]), css("--accent"), 2, [5, 4]);
      $("#d1Key").innerHTML = key(css("--accent"), "North (new system)") + key(css("--muted"), "South (no change)") + key(css("--accent"), "North without the change (predicted from South)", 1);
      $("#d1Cap").innerHTML = `Shaded: the period after the system went live in week ${wk}. Orange area: actual North sales minus the predicted 'no change' North sales.${Math.abs(S.pt) >= 0.3 ? " <b>Before week " + wk + " the two lines are not parallel</b>: the North was already drifting, so every method will mistake part of that drift for the effect." : ""}`;
    }
    function est() {
      const rows = [["After − before (North only)", S.naive, "includes the summer lift and trend"], ["North − South, after only", S.cross, "includes the level gap"], ["Difference-in-differences", S.did, "removes both"], ["Causal impact (regression on South)", S.ci, "average weekly gap to the prediction"]];
      const mx = Math.max(Math.abs(S.eff), ...rows.map((r) => Math.abs(r[1]))) * 1.1 || 1, pos = (v) => 50 + (v / mx) * 50;
      $("#est").innerHTML = rows.map(([n, v, note]) => { const ok = Math.abs(v - S.eff) <= Math.max(3, Math.abs(S.eff) * 0.25); return `<div style="font-size:.82rem"><div style="display:flex;justify-content:space-between;gap:8px"><span>${n}</span><span class="pill ${ok ? "ok" : "bad"}">${sg(v)}</span></div><div style="position:relative;height:12px;margin-top:3px;background:linear-gradient(var(--line),var(--line)) 50% 0/1px 100% no-repeat"><span style="position:absolute;top:2px;height:8px;border-radius:2px;background:var(${ok ? "--good" : "--bad"});left:${Math.min(pos(0), pos(v))}%;width:${Math.abs(pos(v) - pos(0))}%"></span><span style="position:absolute;top:-2px;bottom:-2px;left:${pos(S.eff)}%;border-left:2px dashed var(--ink)"></span></div><div class="hint" style="margin:2px 0 0;font-size:.75rem">${note}</div></div>`; }).join("");
      $("#estCap").innerHTML = `Dashed line: the true effect, ${sg(S.eff)} units per store per week. Green = within 25% of it.`;
    }
    function d2() {
      const { cumE, band, wk, eff } = S, k = cumE.length, xs = cumE.map((_, i) => wk + i), tc = cumE.map((_, i) => eff * (i + 1)), all = [...cumE.map((v, i) => v + band[i]), ...cumE.map((v, i) => v - band[i]), ...tc, 0], lo = Math.min(...all) * 1.05, hi = Math.max(...all) * 1.08 || 1, g = P2.ctx;
      P2.resize(); P2.x = [wk, Math.max(wk + 1, N)]; P2.y = [Math.min(lo, -1), hi]; P2.clear();
      P2.axes({ xLabel: "week", yLabel: "cumulative extra units per store", yFormat: (v) => fmt(v, 0) });
      g.save(); g.fillStyle = css("--accent"); g.globalAlpha = 0.18; g.beginPath(); xs.forEach((x, i) => (i ? g.lineTo : g.moveTo).call(g, P2.sx(x), P2.sy(cumE[i] + band[i]))); [...xs].reverse().forEach((x, j) => { const i = k - 1 - j; g.lineTo(P2.sx(x), P2.sy(cumE[i] - band[i])); }); g.closePath(); g.fill(); g.restore();
      P2.path([wk, N], [0, 0], css("--ink"), 1); P2.path(xs, tc, css("--good"), 1.5, [4, 3]); P2.path(xs, cumE, css("--accent"), 2.5);
      const last = cumE[k - 1], bl = band[k - 1];
      $("#d2Cap").innerHTML = `After ${k} weeks: <b>${sg(last)}</b> units per store (90% band ${fmt(last - bl, 0)} to ${fmt(last + bl, 0)}). Green dashed: the true cumulative effect (${sg(eff * k)}). ${last - bl > 0 ? "The band is above zero: a clear positive effect." : last + bl < 0 ? "The band is below zero: a clear negative effect." : "The band includes zero: can't rule out no effect."}`;
    }
    function table() {
      const { nb, na, sb, sa } = S, td = (v, b) => `<td style="padding:4px 10px;text-align:right;border-bottom:1px solid var(--line)">${b ? `<b>${v}</b>` : v}</td>`, th = (v) => `<th style="padding:4px 10px;text-align:right;color:var(--muted);font-weight:500;border-bottom:1px solid var(--line)">${v}</th>`;
      $("#tbl").innerHTML = `<tr><th style="text-align:left;padding:4px 10px;color:var(--muted);font-weight:500;border-bottom:1px solid var(--line)"></th>${th(`before (weeks 1–${S.wk - 1})`)}${th(`after (weeks ${S.wk}–${N})`)}${th("change")}</tr>
        <tr><td style="padding:4px 10px;border-bottom:1px solid var(--line)">North</td>${td(fmt(nb, 1))}${td(fmt(na, 1))}${td(sg(na - nb))}</tr>
        <tr><td style="padding:4px 10px;border-bottom:1px solid var(--line)">South</td>${td(fmt(sb, 1))}${td(fmt(sa, 1))}${td(sg(sa - sb))}</tr>
        <tr><td style="padding:4px 10px">difference</td>${td(sg(nb - sb))}${td(sg(na - sa))}${td(sg(S.did), 1)}</tr>`;
      $("#work").innerHTML = [`DiD = (${fmt(na, 1)} − ${fmt(nb, 1)}) − (${fmt(sa, 1)} − ${fmt(sb, 1)}) = ${sg(na - nb)} − (${sg(sa - sb)}) = <b style="color:var(--ink)">${sg(S.did)}</b> units per store per week`,
        `causal impact: pre-period fit North = ${fmt(S.a, 1)} + ${fmt(S.b, 3)} × South (residual SD ${fmt(S.sdr, 1)}); average post-period gap = <b style="color:var(--ink)">${sg(S.ci)}</b>`].map((l) => `<div style="margin-bottom:3px">${l}</div>`).join("");
    }
    function readouts() {
      $("#ro").innerHTML = `<div class="ro"><b>True effect</b><span class="num">${sg(S.eff)}</span></div>
        <div class="ro"><b>After − before</b><span class="num">${sg(S.naive)}</span></div>
        <div class="ro"><b>Difference-in-differences</b><span class="num">${sg(S.did)}</span></div>
        <div class="ro"><b>Causal impact</b><span class="num">${sg(S.ci)}</span></div>`;
    }
    function labels() { $("#effV").textContent = sg(+$("#eff").value) + " / wk"; $("#wkV").textContent = $("#wk").value; $("#gapV").textContent = "+" + $("#gap").value; $("#ssV").textContent = "+" + $("#ss").value; $("#ptV").textContent = sg(+$("#pt").value) + " / wk"; $("#nzV").textContent = "SD " + $("#nz").value; }
    function update() { labels(); compute(); d1(); est(); d2(); table(); readouts(); }
    root.querySelectorAll("input[type=range]").forEach((e) => e.addEventListener("input", update));
    $("#resim").addEventListener("click", () => { seed++; gen(); update(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 12; gen(); update(); });
    update();
    return watch([$("#d1"), $("#d2")], () => { d1(); d2(); });
  },
});
