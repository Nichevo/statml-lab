Lab.register({
  id: "shap",
  group: "Machine learning",
  title: "SHAP: why did the model predict that?",
  blurb: "A boosted-tree model forecasts 212 units for next week. How much of that is the discount, the display, the heatwave? SHAP values split any prediction fairly into one contribution per driver, so the parts add up to the forecast.",
  lede: "Tree ensembles and neural networks don't have one coefficient per driver, so 'why this number?' has no obvious answer. SHAP (SHapley Additive exPlanations) borrows an idea from game theory: treat the drivers as players who together produce the prediction, and pay each one its average contribution over every order in which they could have joined. The payouts always add up from the average prediction to this prediction, which makes them easy to show as a waterfall. Across many predictions, they also show which drivers matter most and how.",
  quiz: [
    ["The average prediction is 150 and this week's is 212. The SHAP values are discount +30, display +20, temperature +15. What must holiday's be?", "−3. SHAP values always add up: 150 + 30 + 20 + 15 + holiday = 212, so holiday = −3."],
    ["How is a SHAP value different from a regression coefficient?", "A coefficient is one number per driver for all predictions. A SHAP value is per prediction: the same driver can add +30 for one week and +5 for another, depending on its value and on the other drivers (interactions)."],
    ["Why average over every order the drivers could be added in?", "With interactions, a driver's contribution depends on which others are already present. Display might add 20 units on a cold week and 35 on a hot one. Averaging over all orders is the only way to share the credit that satisfies a few fairness rules (Shapley, 1953)."],
    ["The summary plot shows temperature with big positive SHAP values only when it's hot (orange dots). What does that tell you?", "The model's response to temperature is one-sided: warm weeks raise sales, cold ones barely lower them. A single coefficient couldn't show that."],
    ["Does a large SHAP value mean the driver causes the sales?", "No. SHAP explains the model, not the world. If the model leaned on a driver that's only correlated with sales (say, website visits), SHAP will faithfully show that too."],
  ],
  diy: {
    intro: "Exact SHAP needs the model's prediction for every subset of drivers, which is easy to set up for 2 drivers. Say f(discount, display) is your model, the average week has discount 15% and no display, and this week has 30% and a display.",
    steps: [
      ["Prediction with nothing known (base value): use average values.", "v0: =f(15%, 0)"],
      ["Only discount known.", "v1: =f(30%, 0)"],
      ["Only display known.", "v2: =f(15%, 1)"],
      ["Both known (this week's prediction).", "v12: =f(30%, 1)"],
      ["SHAP for discount: average of its effect added first and added second.", "=0.5*(v1-v0) + 0.5*(v12-v2)"],
      ["SHAP for display, likewise. Check: base + both SHAP values = v12.", "=0.5*(v2-v0) + 0.5*(v12-v1)"],
      ["For real models use the shap Python package (TreeExplainer computes exact values for tree models fast).", "shap.TreeExplainer(model).shap_values(X)"],
    ],
  },
  deeper: [
    ["Lundberg & Lee (2017), A unified approach to interpreting model predictions, NeurIPS", "https://arxiv.org/abs/1705.07874", "the paper that introduced SHAP"],
    ["Lundberg et al. (2020), From local explanations to global understanding with explainable AI for trees, Nature Machine Intelligence 2", "https://doi.org/10.1038/s42256-019-0138-9", "TreeSHAP: exact SHAP values for tree models"],
    ["Molnar, Interpretable Machine Learning, chapter on SHAP (free online book)", "https://christophm.github.io/interpretable-ml-book/shap.html", "a clear walk-through with pros and cons"],
    ["Shapley (1953), A value for n-person games, in Contributions to the Theory of Games II", "https://doi.org/10.1515/9781400881970-018", "the game-theory idea underneath"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 54 H30" stroke-opacity=".5"/><rect x="30" y="40" width="16" height="10" rx="1"/><rect x="46" y="28" width="14" height="10" rx="1"/><rect x="60" y="22" width="10" height="8" rx="1" stroke-opacity=".6"/><rect x="62" y="12" width="20" height="8" rx="1"/><path d="M82 10 H92" stroke-width="2.5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const F = [
      { k: "disc", name: "price discount", unit: "%", lo: 0, hi: 40, step: 1, d: 0, fmt: (v) => fmt(v, 0) + "%" },
      { k: "disp", name: "end-cap display", unit: "", lo: 0, hi: 1, step: 1, d: 0, fmt: (v) => (v ? "yes" : "no") },
      { k: "temp", name: "temperature", unit: "°C", lo: 5, hi: 35, step: 1, d: 0, fmt: (v) => fmt(v, 0) + "°C" },
      { k: "hol", name: "holiday week", unit: "", lo: 0, hi: 1, step: 1, d: 0, fmt: (v) => (v ? "yes" : "no") },
    ];
    const P = F.length, NTR = 700, NBG = 80, NS = 140;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("This week's forecast, explained")}</div><div id="wf" style="padding:6px 10px"></div><figcaption id="wfCap"></figcaption></figure>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(`Summary: SHAP values for ${NS} weeks`)}</div><canvas id="s1" aria-label="SHAP summary plot"></canvas><figcaption id="s1Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0;display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center">${h4("Dependence")}<select id="dep" style="width:auto">${F.map((f, i) => `<option value="${i}"${i === 2 ? " selected" : ""}>${f.name}</option>`).join("")}</select></div><canvas id="s2" aria-label="SHAP value against driver value"></canvas><figcaption id="s2Cap"></figcaption></figure>`)}
        <div class="plot" style="padding:14px">${h4("Worked out: the Shapley value for one driver")}<div id="work" style="font:.8rem/1.75 var(--font-mono);overflow-x:auto"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">A gradient-boosted model forecasts weekly sales of a summer drink. Set next week's drivers:</p>
        <div class="ctrl"><label for="disc">Price discount <output id="discV"></output></label><input type="range" id="disc" min="0" max="40" step="1" value="25"></div>
        <div class="ctrl"><label for="temp">Temperature <output id="tempV"></output></label><input type="range" id="temp" min="5" max="35" step="1" value="29"></div>
        <div class="ctrl"><label class="check" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="disp" checked> End-cap display</label></div>
        <div class="ctrl"><label class="check" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="hol"> Holiday week</label></div>
        <div class="ctrl"><label for="ix">How much the display works better in hot weather <output id="ixV"></output></label><input type="range" id="ix" min="0" max="1.5" step="0.1" value="0.8"></div>
        <div class="ctrl"><label for="wd">Driver to work through below <output id="wdV"></output></label><input type="range" id="wd" min="0" max="3" step="1" value="1"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The Shapley value</h2>
          <p>Write v(S) for the model's prediction when only the drivers in set S are known (the others are averaged over typical weeks). A driver's SHAP value is its extra contribution v(S ∪ {driver}) − v(S), averaged over all sets S of the other drivers, weighted by how many joining orders lead to each set:</p>
          <div class="eq">φᵢ = Σ over S ⊆ others: &nbsp; |S|! (M − |S| − 1)! ÷ M! × [ v(S ∪ {i}) − v(S) ]</div>
          <p>With M = 4 drivers there are 8 sets of the other 3, and the weights are ¼ (none known), ¹⁄₁₂ each (one known), ¹⁄₁₂ each (two known) and ¼ (all three known). The worked example below lists all 8.</p>
        </section>
        <section>
          <h2>Why the parts add up</h2>
          <div class="eq">prediction = base value + φ₁ + φ₂ + … + φ_M</div>
          <p>The base value is the average prediction over the background data. That additivity is what makes SHAP waterfalls so readable for planners: "the forecast is 70 units above a normal week, and here is where every unit came from".</p>
        </section>
        <section>
          <h2>Reading the plots</h2>
          <ul>
            <li><b>Waterfall</b>: one prediction, from the base value to the final number.</li>
            <li><b>Summary (beeswarm)</b>: one dot per week per driver; horizontal position is the SHAP value, colour is the driver's value (blue low, orange high). Drivers are sorted by average |SHAP|, a good overall importance measure.</li>
            <li><b>Dependence</b>: one driver's SHAP value against its value. Vertical spread at the same x shows interactions with other drivers.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Untick the display: its bar flips negative (no display is below the typical week), and temperature's bar shrinks too, because the model learned they interact.</li>
            <li>Set "display works better in hot weather" to 0 and look at the temperature dependence plot: the two bands of dots merge.</li>
            <li>Step through the drivers in the worked example and check the 8 weighted differences add up to the bar in the waterfall.</li>
          </ol>
          <p>Related: <a href="#gradient-boosting">gradient-boosted trees</a>, <a href="#global-forecasting">global ML forecasting</a> (feature importance), <a href="#random-forest">random forests</a> and <a href="#promo-regression">regression with promotions</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let M = null, BG = null, SAMP = null;
    const fact = [1, 1, 2, 6, 24];
    function train() {
      const ix = +$("#ix").value, r = rng(321), X = [], y = [];
      const mean = (x) => 100 + 2.2 * x[0] + 22 * x[1] + 1.6 * Math.max(0, x[2] - 16) * (1 + ix * x[1]) + 38 * x[3];
      const draw = (g) => [Math.round(g() < 0.45 ? 0 : 5 + g() * 35), g() < 0.3 ? 1 : 0, Math.round(5 + g() * 30), g() < 0.12 ? 1 : 0];
      for (let i = 0; i < NTR; i++) { const x = draw(r); X.push(x); y.push(mean(x) + 8 * r.normal()); }
      M = Lab.gbm.fit(X, y, { trees: 120, depth: 3, lr: 0.1, minLeaf: 8, bins: 32 });
      BG = X.slice(0, NBG); SAMP = X.slice(NBG, NBG + NS);
      M.base0 = BG.reduce((a, x) => a + M.predict(x), 0) / NBG; M.mean = mean;
    }
    const v = (x, S) => { let s = 0; for (const b of BG) { const z = b.slice(); for (const i of S) z[i] = x[i]; s += M.predict(z); } return s / BG.length; };
    function shap(x) {
      const cache = new Map(), val = (mask) => { if (!cache.has(mask)) cache.set(mask, v(x, [0, 1, 2, 3].filter((i) => mask & (1 << i)))); return cache.get(mask); };
      const phi = [], terms = [];
      for (let i = 0; i < P; i++) {
        let s = 0; const tl = [];
        for (let mask = 0; mask < 16; mask++) { if (mask & (1 << i)) continue; const k = [0, 1, 2, 3].filter((j) => mask & (1 << j)).length, w = (fact[k] * fact[P - k - 1]) / fact[P], d = val(mask | (1 << i)) - val(mask); s += w * d; tl.push({ mask, k, w, d, with: val(mask | (1 << i)), without: val(mask) }); }
        phi.push(s); terms.push(tl);
      }
      return { phi, base: val(0), pred: val(15), terms };
    }
    const cur = () => [+$("#disc").value, $("#disp").checked ? 1 : 0, +$("#temp").value, $("#hol").checked ? 1 : 0];
    let SV = null, X = null;
    function computeSummary() { SV = SAMP.map((x) => shap(x).phi); }
    function waterfall() {
      X = cur(); const s = shap(X); X.s = s;
      const steps = s.phi.map((p, i) => ({ i, p })).sort((a, b) => Math.abs(b.p) - Math.abs(a.p));
      let run = s.base; const pts = [s.base]; steps.forEach((st) => pts.push((run += st.p)));
      const lo = Math.min(...pts) - 10, hi = Math.max(...pts) + 10, pos = (val) => ((val - lo) / (hi - lo)) * 100;
      let acc = s.base;
      const rows = steps.map((st) => { const a = acc, b = (acc += st.p), l = Math.min(a, b), w = Math.abs(b - a); return `<div style="display:grid;grid-template-columns:minmax(0,10em) 1fr 4.5em;gap:8px;align-items:center;font-size:.82rem"><span style="min-width:0">${F[st.i].name} = <b>${F[st.i].fmt(X[st.i])}</b></span><span style="position:relative;height:18px"><span style="position:absolute;left:${pos(l)}%;width:max(2px,${(w / (hi - lo)) * 100}%);top:2px;bottom:2px;border-radius:3px;background:var(${st.p >= 0 ? "--warm" : "--accent"})"></span></span><span class="num" style="text-align:right">${st.p >= 0 ? "+" : "−"}${fmt(Math.abs(st.p), 1)}</span></div>`; });
      const edge = (label, val) => `<div style="display:grid;grid-template-columns:minmax(0,10em) 1fr 4.5em;gap:8px;align-items:center;font-size:.82rem;color:var(--muted)"><span>${label}</span><span style="position:relative;height:18px"><span style="position:absolute;left:${pos(val)}%;top:0;bottom:0;border-left:2px solid var(--ink)"></span></span><span class="num" style="text-align:right;color:var(--ink)"><b>${fmt(val, 1)}</b></span></div>`;
      $("#wf").innerHTML = `<div style="display:grid;gap:6px">${edge("average week (base)", s.base)}${rows.join("")}${edge("this week's forecast", s.pred)}</div>`;
      const top = steps[0];
      $("#wfCap").innerHTML = `Base value ${fmt(s.base, 1)} (average forecast over typical weeks) ${s.phi.map((p) => (p >= 0 ? "+ " : "− ") + fmt(Math.abs(p), 1)).join(" ")} = <b>${fmt(s.pred, 1)}</b> units. Biggest driver this week: <b>${F[top.i].name}</b> (${top.p >= 0 ? "+" : "−"}${fmt(Math.abs(top.p), 1)}). Orange pushes the forecast up, blue pulls it down.`;
    }
    const p1 = new Plot($("#s1"), { x: [-60, 60], y: [0, 4], pad: { l: 104, b: 38 } }), p2 = new Plot($("#s2"), { x: [0, 40], pad: { l: 46, b: 38 } });
    const col = (t) => { const a = [10, 108, 136], b = [214, 103, 32], m = (i) => Math.round(a[i] + (b[i] - a[i]) * t); return `rgb(${m(0)},${m(1)},${m(2)})`; };
    function d1() {
      const imp = F.map((_, i) => SV.reduce((a, s) => a + Math.abs(s[i]), 0) / SV.length), order = imp.map((v, i) => i).sort((a, b) => imp[a] - imp[b]);
      const all = SV.flat(), lim = Math.max(10, ...all.map(Math.abs)) * 1.08, g = p1.ctx;
      p1.resize(); p1.x = [-lim, lim]; p1.y = [-0.5, P - 0.5]; p1.clear();
      p1.axes({ xLabel: "SHAP value (units added to the forecast)", yTicks: order.map((_, r) => r), yFormat: (r) => F[order[Math.round(r)]] ? F[order[Math.round(r)]].name : "", xFormat: (v) => (v > 0 ? "+" : "") + fmt(v, 0) });
      p1.path([0, 0], [-0.5, P - 0.5], css("--ink"), 1);
      const jr = rng(5);
      order.forEach((fi, r) => { const f = F[fi]; SV.forEach((s, j) => { const t = (SAMP[j][fi] - f.lo) / (f.hi - f.lo); p1.dot(s[fi], r + (jr() - 0.5) * 0.55, 2.6, col(t)); }); });
      if (X) order.forEach((fi, r) => p1.dot(X.s.phi[fi], r, 6, null, css("--ink")));
      $("#s1Cap").innerHTML = `Each dot is one week; colour = the driver's value (<span style="color:${col(0)}">blue low</span>, <span style="color:${col(1)}">orange high</span>). Ringed: this week. Sorted by average |SHAP|: ${order.slice().reverse().map((i) => `${F[i].name} ${fmt(imp[i], 1)}`).join(", ")}.`;
    }
    function d2() {
      const fi = +$("#dep").value, f = F[fi], vals = SV.map((s) => s[fi]), lim = Math.max(8, ...vals.map(Math.abs)) * 1.1;
      p2.resize(); p2.x = [f.lo - (f.hi - f.lo) * 0.08, f.hi + (f.hi - f.lo) * 0.08]; p2.y = [-lim, lim]; p2.clear();
      p2.axes({ xLabel: f.name + (f.unit ? ` (${f.unit})` : ""), yLabel: "SHAP value", yFormat: (v) => fmt(v, 0), xTicks: f.hi === 1 ? [0, 1] : undefined, xFormat: f.hi === 1 ? (v) => (v ? "yes" : "no") : undefined });
      p2.path(p2.x, [0, 0], css("--ink"), 1);
      const other = fi === 2 ? 1 : 2, jr = rng(9);
      SAMP.forEach((x, j) => p2.dot(x[fi] + (f.hi === 1 ? (jr() - 0.5) * 0.25 : 0), vals[j], 3, other === 1 ? (x[1] ? css("--warm") : css("--accent")) : col((x[2] - 5) / 30)));
      $("#s2Cap").innerHTML = `SHAP value of ${f.name} for each week, coloured by ${other === 1 ? `display (<span style="color:var(--warm)">yes</span> / <span style="color:var(--accent)">no</span>)` : "temperature (blue cold, orange hot)"}. ${fi === 2 ? "Two separate bands mean the effect of heat depends on the display: an interaction the model picked up from the data." : "Vertical spread at the same value comes from interactions with other drivers."}`;
    }
    function work() {
      const i = +$("#wd").value, t = X.s.terms[i], names = (mask) => { const L = [0, 1, 2, 3].filter((j) => mask & (1 << j)).map((j) => ["discount", "display", "temperature", "holiday"][j]); return L.length ? "{" + L.join(", ") + "}" : "{ }"; };
      const lines = t.map((r) => `${names(r.mask).padEnd(30, " ")} weight ${r.w === 0.25 ? "1/4 " : "1/12"} × (${fmt(r.with, 1)} − ${fmt(r.without, 1)} = ${r.d >= 0 ? "+" : ""}${fmt(r.d, 1)}) = ${r.w * r.d >= 0 ? "+" : ""}${fmt(r.w * r.d, 2)}`);
      $("#work").innerHTML = `<div style="margin-bottom:6px">SHAP for <b>${F[i].name}</b> = sum over the 8 sets S of the other drivers, of weight × [prediction with S + ${F[i].name}] − [prediction with S]:</div>` + lines.map((l) => `<div style="white-space:pre">${l}</div>`).join("") + `<div style="margin-top:6px">total = <b style="color:var(--ink)">${X.s.phi[i] >= 0 ? "+" : ""}${fmt(X.s.phi[i], 2)}</b> units (weights add to 1: 1/4 + 6 × 1/12 + 1/4)</div>`;
    }
    function readouts() {
      const s = X.s;
      $("#ro").innerHTML = `<div class="ro"><b>Forecast</b><span class="num">${fmt(s.pred, 1)}</span></div><div class="ro"><b>Average week</b><span class="num">${fmt(s.base, 1)}</span></div>` +
        F.map((f, i) => `<div class="ro"><b>${f.name}</b><span class="num">${s.phi[i] >= 0 ? "+" : "−"}${fmt(Math.abs(s.phi[i]), 1)}</span></div>`).join("");
    }
    function labels() { $("#discV").textContent = $("#disc").value + "%"; $("#tempV").textContent = $("#temp").value + "°C"; $("#ixV").textContent = "+" + Math.round(+$("#ix").value * 100) + "%"; $("#wdV").textContent = F[+$("#wd").value].name; }
    function local() { labels(); waterfall(); d1(); work(); readouts(); }
    function full() { labels(); train(); computeSummary(); waterfall(); d1(); d2(); work(); readouts(); }
    ["#disc", "#temp", "#wd"].forEach((s) => $(s).addEventListener("input", local));
    ["#disp", "#hol"].forEach((s) => $(s).addEventListener("change", local));
    $("#ix").addEventListener("change", full); $("#ix").addEventListener("input", labels);
    $("#dep").addEventListener("change", d2);
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); $("#disp").checked = true; $("#hol").checked = false; full(); });
    full();
    return watch([$("#s1"), $("#s2")], () => { d1(); d2(); });
  },
});
