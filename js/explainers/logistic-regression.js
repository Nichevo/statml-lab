Lab.register({
  id: "logistic-regression",
  group: "Machine learning",
  title: "Logistic regression and the confusion matrix",
  blurb: "Predict a yes/no outcome, such as whether a delivery will be late, as a probability. Then pick a cut-off and count the hits, misses and false alarms, and see what each costs.",
  lede: "Many planning questions have yes/no answers: will this order arrive late, will this customer churn, will this SKU stock out? Logistic regression gives each case a probability between 0 and 1 by passing a straight-line score through an S-shaped curve. To act on it you choose a cut-off, and every cut-off trades missed problems against false alarms. The confusion matrix counts both, and the right cut-off depends on what each mistake costs.",
  quiz: [
    ["The model says z = −3 + 0.35 × distance (in 100 km). What is the probability of a late delivery for a 1,000 km trip?", "z = −3 + 0.35 × 10 = 0.5. p = 1/(1 + e^−0.5) = 1/(1 + 0.607) = 0.62, so a 62% chance of being late."],
    ["In that model, what does the coefficient 0.35 mean in plain words?", "Each extra 100 km multiplies the odds of being late by e^0.35 ≈ 1.42, so the odds rise 42%. It is not a fixed change in probability, because the S-curve is steepest in the middle."],
    ["Precision is 60% and recall is 90%. What does that mean for an expediting team?", "Of the orders flagged as 'will be late', 60% really are late (40% are false alarms). Of all the orders that really are late, the model catches 90% (it misses 10%)."],
    ["A miss costs $500 (an angry customer) and a false alarm costs $50 (an unneeded expedite check). Should the cut-off be above or below 50%?", "Below. Misses are 10× dearer, so flag an order even when the chance is fairly low. In theory the cost-minimising cut-off is 50 / (50 + 500) ≈ 9%, if the probabilities are well calibrated."],
    ["Why can accuracy be misleading when only 5% of orders are late?", "A model that always says 'on time' is 95% accurate and catches no late orders at all. Look at recall, precision and the costs instead."],
    ["What does an AUC of 0.5 mean? And 1.0?", "0.5: the scores rank a random late order above a random on-time one only half the time, no better than a coin. 1.0: every late order scores higher than every on-time one."],
  ],
  diy: {
    intro: "Distance (100s of km) in A2:A201, late (1) or on time (0) in B2:B201. Coefficients b0 and b1 in F1 and F2 (start at 0 and 0.1).",
    steps: [
      ["Predicted probability for each order.", "C2: =1/(1+EXP(-($F$1+$F$2*A2)))"],
      ["Log-likelihood of each row; the model is fitted by making the total as large as possible.", "D2: =B2*LN(C2)+(1-B2)*LN(1-C2)\nF4: =SUM(D2:D201)"],
      ["Fit with Solver: maximise F4 by changing F1:F2 (GRG Nonlinear).", "Data > Solver > Set objective F4, Max, by changing $F$1:$F$2"],
      ["Prediction at a cut-off in F6.", "E2: =IF(C2>=$F$6,1,0)"],
      ["Confusion matrix counts.", "TP: =COUNTIFS(E2:E201,1,B2:B201,1)   FP: =COUNTIFS(E2:E201,1,B2:B201,0)\nFN: =COUNTIFS(E2:E201,0,B2:B201,1)   TN: =COUNTIFS(E2:E201,0,B2:B201,0)"],
      ["Precision, recall and total cost.", "precision: =TP/(TP+FP)   recall: =TP/(TP+FN)\ncost: =FN*miss_cost+FP*false_alarm_cost"],
    ],
  },
  deeper: [
    ["Cox (1958), The regression analysis of binary sequences, JRSS B 20(2)", "https://doi.org/10.1111/j.2517-6161.1958.tb00292.x", "the paper that established logistic regression"],
    ["Fawcett (2006), An introduction to ROC analysis, Pattern Recognition Letters 27(8)", "https://doi.org/10.1016/j.patrec.2005.10.010", "ROC curves, AUC and choosing cut-offs"],
    ["Saito & Rehmsmeier (2015), The precision-recall plot is more informative than the ROC plot when evaluating binary classifiers on imbalanced datasets, PLoS ONE", "https://doi.org/10.1371/journal.pone.0118432", "why rare events need precision and recall"],
    ["Elkan (2001), The foundations of cost-sensitive learning, IJCAI", "https://www.ijcai.org/Proceedings/01/IJCAI-2001-e.pdf", "the cost-based cut-off rule"],
    ["James et al., An Introduction to Statistical Learning, ch. 4 (free PDF)", "https://www.statlearning.com/", "logistic regression and classification"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 54 C 36 54, 40 10, 90 10" stroke-width="2.5"/><g fill="currentColor"><circle cx="12" cy="58" r="2.5"/><circle cx="22" cy="58" r="2.5"/><circle cx="30" cy="58" r="2.5"/><circle cx="44" cy="58" r="2.5"/><circle cx="40" cy="6" r="2.5"/><circle cx="58" cy="6" r="2.5"/><circle cx="70" cy="6" r="2.5"/><circle cx="84" cy="6" r="2.5"/></g><path d="M4 32 H92" stroke-dasharray="3 3" stroke-width="1.4"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const sig = (z) => 1 / (1 + Math.exp(-z));
    const h4 = (t) => `<h4 style="margin:0 0 8px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const N = 200;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="padding:8px 8px 4px">
          <div style="padding:4px 6px 0">${h4("Will the delivery be late? 200 past orders")}</div>
          <canvas id="sc" aria-label="Orders by distance, late or on time, with the fitted S-curve"></canvas>
          <div class="legend"><span><i style="background:var(--violet)"></i>fitted probability of late</span><span><i style="background:var(--good)"></i>correct (TP, TN)</span><span><i style="background:var(--bad)"></i>missed late order (FN)</span><span><i style="background:var(--warm)"></i>false alarm (FP)</span><span><i style="background:var(--muted);height:2px"></i>cut-off</span></div>
          <figcaption id="scCap"></figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          ${h4("The confusion matrix at this cut-off")}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px;align-items:start">
            <div style="overflow-x:auto"><table id="cm" style="border-collapse:collapse;font-size:.88rem;font-variant-numeric:tabular-nums"></table></div>
            <div id="mets" class="readouts" style="font-size:.9rem"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">
          <figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("ROC curve: every cut-off at once")}</div><canvas id="roc" aria-label="ROC curve"></canvas><figcaption id="rocCap"></figcaption></figure>
          <figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Total cost of mistakes by cut-off")}</div><canvas id="cc" aria-label="Cost against cut-off"></canvas><figcaption id="ccCap"></figcaption></figure>
        </div>
        <div class="plot" style="padding:14px">${h4("Worked out for one order")}<div id="work" style="font:.82rem/1.9 var(--font-mono);overflow-x:auto"></div></div>`,
      panel: `
        <div class="ctrl"><label for="th">Cut-off: flag as late if p ≥ <output id="thV"></output></label><input type="range" id="th" min="0.02" max="0.98" step="0.01" value="0.5"></div>
        <div class="ctrl"><label for="mc">Cost of a missed late order <output id="mcV"></output></label><input type="range" id="mc" min="10" max="1000" step="10" value="300"></div>
        <div class="ctrl"><label for="fc">Cost of a false alarm <output id="fcV"></output></label><input type="range" id="fc" min="10" max="500" step="10" value="50"></div>
        <div class="ctrl"><label for="sep">How much distance matters <output id="sepV"></output></label><input type="range" id="sep" min="0" max="1" step="0.05" value="0.5"></div>
        <div class="ctrl"><label for="base">Share of orders that are late <output id="baseV"></output></label><input type="range" id="base" min="3" max="60" step="1" value="30"></div>
        <div class="ctrl"><label for="xw">Distance for the worked example <output id="xwV"></output></label><input type="range" id="xw" min="0" max="20" step="0.5" value="10"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="best" type="button">Use the cheapest cut-off</button><button class="btn" id="newd" type="button">New data</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The model</h2>
          <div class="eq">z = b0 + b1 × distance &nbsp;&nbsp;(a straight-line score, the "log-odds")<br>p = 1 / (1 + e<sup>−z</sup>) &nbsp;&nbsp;(squashed into 0 to 1)<br>odds = p / (1 − p) = e<sup>z</sup>, so each unit of distance multiplies the odds by e<sup>b1</sup></div>
          <p>The coefficients are chosen to make the observed outcomes as likely as possible (<b>maximum likelihood</b>). There is no neat formula like least squares, so the fit iterates (Newton's method here, Solver in Excel). With more drivers, such as supplier, season or order size, z simply gets more terms.</p>
        </section>
        <section>
          <h2>Reading the confusion matrix</h2>
          <ul>
            <li><b>Recall</b> (sensitivity) = TP / (TP + FN): the share of late orders you catch.</li>
            <li><b>Precision</b> = TP / (TP + FP): the share of flagged orders that really are late.</li>
            <li><b>Specificity</b> = TN / (TN + FP): the share of on-time orders correctly left alone.</li>
            <li><b>Accuracy</b> = (TP + TN) / all. Easy to quote, but misleading when late orders are rare.</li>
          </ul>
          <p>Lowering the cut-off flags more orders: recall goes up and precision goes down. The <b>ROC curve</b> plots recall against the false-alarm rate for every cut-off, and the area under it (AUC) measures how well the scores rank cases, whatever the cut-off.</p>
          <div class="eq">cheapest cut-off ≈ cost of false alarm / (cost of false alarm + cost of miss)</div>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Raise the cost of a miss to 1,000 and press "Use the cheapest cut-off". The cut-off drops sharply: flag more, catch more, accept more false alarms.</li>
            <li>Set the share of late orders to 5%. Accuracy at a 50% cut-off looks great, but check the recall.</li>
            <li>Set "how much distance matters" to 0. The S-curve goes flat, the ROC curve hugs the diagonal and AUC ≈ 0.5: distance tells you nothing.</li>
            <li>Move the worked-example distance and watch how the same 100 km changes the probability a lot in the middle of the curve, but little at the ends.</li>
          </ol>
          <p>Related: <a href="#hypothesis-test">hypothesis tests</a>, <a href="#random-forest">random forests</a> (another classifier), <a href="#neural-net">neural networks</a> (a sigmoid neuron is a logistic regression) and <a href="#newsvendor">the newsvendor</a> (the same cost-ratio logic).</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pS = new Plot($("#sc"), { x: [0, 20], y: [-0.08, 1.08], pad: { l: 46, b: 38 } });
    const pR = new Plot($("#roc"), { x: [0, 1], y: [0, 1], pad: { l: 46, b: 38 } });
    const pC = new Plot($("#cc"), { x: [0, 1], pad: { l: 56, b: 38 } });
    let seed = 1, D = null, M = null;

    function data() {
      const r = rng(seed * 977), sep = +$("#sep").value, base = +$("#base").value / 100, b1 = sep * 0.7;
      // choose b0 so the average probability matches the target share (x uniform 0..20)
      let lo = -15, hi = 15;
      for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; let s = 0; for (let x = 0; x <= 20; x += 0.25) s += sig(m + b1 * (x - 10)); s /= 81; if (s < base) lo = m; else hi = m; }
      const b0 = (lo + hi) / 2 - b1 * 10, xs = [], ys = [], jit = [];
      for (let i = 0; i < N; i++) { const x = r() * 20; xs.push(x); ys.push(r() < sig(b0 + b1 * x) ? 1 : 0); jit.push(r()); }
      D = { xs, ys, jit, b0, b1 };
    }
    function fit() {
      let a = 0, b = 0;
      for (let it = 0; it < 30; it++) {
        let g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
        D.xs.forEach((x, i) => { const p = sig(a + b * x), w = p * (1 - p), e = D.ys[i] - p; g0 += e; g1 += e * x; h00 += w; h01 += w * x; h11 += w * x * x; });
        const det = h00 * h11 - h01 * h01 + 1e-9, da = (h11 * g0 - h01 * g1) / det, db = (h00 * g1 - h01 * g0) / det;
        a += Math.max(-5, Math.min(5, da)); b += Math.max(-2, Math.min(2, db));
        if (Math.abs(da) + Math.abs(db) < 1e-9) break;
      }
      const ps = D.xs.map((x) => sig(a + b * x));
      // ROC and cost across cut-offs
      const P = D.ys.reduce((s, v) => s + v, 0), Nn = N - P, mc = +$("#mc").value, fc = +$("#fc").value;
      const cm = (t) => { let tp = 0, fp = 0; ps.forEach((p, i) => { if (p >= t) { if (D.ys[i]) tp++; else fp++; } }); return { tp, fp, fn: P - tp, tn: Nn - fp }; };
      const ths = Array.from({ length: 97 }, (_, i) => 0.02 + i * 0.01), curve = ths.map((t) => { const c = cm(t); return { t, ...c, cost: c.fn * mc + c.fp * fc }; });
      const order = ps.map((p, i) => [p, D.ys[i]]).sort((u, v) => v[0] - u[0]);
      const roc = [[0, 0]]; let tp = 0, fp = 0, auc = 0;
      order.forEach(([, y]) => { if (y) tp++; else { fp++; auc += P ? tp / P : 0; } roc.push([Nn ? fp / Nn : 0, P ? tp / P : 0]); });
      auc = Nn ? auc / Nn : 0.5;
      const best = curve.reduce((u, v) => (v.cost < u.cost ? v : u));
      M = { a, b, ps, P, Nn, cm, curve, roc, auc, best, mc, fc };
    }
    function drawScatter() {
      const t = +$("#th").value, { a, b, ps } = M;
      pS.resize(); pS.clear();
      pS.axes({ xLabel: "distance (100s of km)", yLabel: "late = 1, on time = 0", yTicks: [0, 0.25, 0.5, 0.75, 1] });
      pS.path([0, 20], [t, t], css("--muted"), 1.5, [5, 4]);
      if (Math.abs(b) > 1e-6) { const xc = (Math.log(t / (1 - t)) - a) / b; if (xc >= 0 && xc <= 20) pS.path([xc, xc], [-0.08, 1.08], css("--muted"), 1, [2, 3]); }
      D.xs.forEach((x, i) => { const y = D.ys[i], f = ps[i] >= t, col = y && f ? "--good" : !y && !f ? "--good" : y ? "--bad" : "--warm"; pS.dot(x, y + (D.jit[i] - 0.5) * 0.1 * (y ? -1 : 1) + (y ? -0.02 : 0.02), 3.2, css(col)); });
      pS.fn((x) => sig(a + b * x), css("--violet"), 3);
      const xc = Math.abs(b) > 1e-6 ? (Math.log(t / (1 - t)) - a) / b : NaN;
      $("#scCap").innerHTML = `Fitted: z = ${fmt(a, 2)} + ${fmt(b, 3)} × distance. Each extra 100 km multiplies the odds of being late by <b>${fmt(Math.exp(b), 2)}</b>. ${isFinite(xc) && xc > 0 && xc < 20 ? `A ${Math.round(t * 100)}% cut-off flags every trip over about <b>${Math.round(xc * 100).toLocaleString()} km</b>.` : `At a ${Math.round(t * 100)}% cut-off the model flags ${M.ps.every((p) => p >= t) ? "every" : "no"} order.`}`;
    }
    function drawCM() {
      const t = +$("#th").value, c = M.cm(t), tot = N;
      const cell = (v, lbl, col) => `<td style="padding:10px 12px;text-align:center;border:1px solid var(--line);background:color-mix(in srgb, var(${col}) ${Math.round(10 + (v / tot) * 60)}%, transparent)"><div style="font:700 1.4rem/1 var(--font-mono)">${v}</div><div style="font-size:.74rem;color:var(--muted);margin-top:4px">${lbl}</div></td>`;
      const th = (x, s = "") => `<th style="padding:6px 10px;font-weight:500;color:var(--muted);${s}">${x}</th>`;
      $("#cm").innerHTML = `<tr>${th("")}${th("Actually late")}${th("Actually on time")}</tr><tr>${th("Flagged late", "text-align:right")}${cell(c.tp, "true positive: caught", "--good")}${cell(c.fp, "false positive: false alarm", "--warm")}</tr><tr>${th("Not flagged", "text-align:right")}${cell(c.fn, "false negative: missed", "--bad")}${cell(c.tn, "true negative: left alone", "--good")}</tr>`;
      const pc = (x) => (isFinite(x) ? (x * 100).toFixed(1) + "%" : "–"), prec = c.tp / (c.tp + c.fp), rec = c.tp / (c.tp + c.fn), f1 = (2 * prec * rec) / (prec + rec);
      $("#mets").innerHTML = [["Recall: late orders caught", pc(rec), `${c.tp} / ${c.tp + c.fn}`], ["Precision: flags that were right", pc(prec), `${c.tp} / ${c.tp + c.fp}`], ["Specificity", pc(c.tn / (c.tn + c.fp)), `${c.tn} / ${c.tn + c.fp}`], ["Accuracy", pc((c.tp + c.tn) / tot), `${c.tp + c.tn} / ${tot}`], ["F1 score", isFinite(f1) ? f1.toFixed(3) : "–", "balance of the two"], ["Cost of mistakes", "$" + (c.fn * M.mc + c.fp * M.fc).toLocaleString(), `${c.fn} × $${M.mc} + ${c.fp} × $${M.fc}`]]
        .map(([k, v, s]) => `<div class="ro"><b>${k}</b><span class="num">${v} <span style="color:var(--muted);font-size:.85em">(${s})</span></span></div>`).join("");
      return c;
    }
    function drawROC(c) {
      pR.resize(); pR.clear(); pR.axes({ xLabel: "false-alarm rate (1 − specificity)", yLabel: "recall", xFormat: (v) => Math.round(v * 100) + "%", yFormat: (v) => Math.round(v * 100) + "%", xCount: 5 });
      pR.path([0, 1], [0, 1], css("--muted"), 1, [4, 4]);
      pR.path(M.roc.map((p) => p[0]), M.roc.map((p) => p[1]), css("--accent"), 2.5);
      const fx = c.fp / (c.fp + c.tn || 1), ry = c.tp / (c.tp + c.fn || 1);
      pR.dot(fx, ry, 7, css("--violet"), css("--surface"));
      $("#rocCap").innerHTML = `AUC = <b>${M.auc.toFixed(3)}</b>. Dot = the current cut-off: recall ${Math.round(ry * 100)}% at a ${Math.round(fx * 100)}% false-alarm rate. The dashed diagonal is guessing.`;
      const t = +$("#th").value, cur = M.cm(t), curCost = cur.fn * M.mc + cur.fp * M.fc, cs = M.curve.map((r) => r.cost);
      pC.resize(); pC.x = [0, 1]; pC.y = [0, Math.max(...cs) * 1.08]; pC.clear();
      pC.axes({ xLabel: "cut-off", yLabel: "cost of mistakes ($)", xFormat: (v) => Math.round(v * 100) + "%", yFormat: (v) => fmt(v, 0), xCount: 5 });
      pC.path(M.curve.map((r) => r.t), M.curve.map((r) => r.fn * M.mc), css("--bad"), 1.5, [5, 3]);
      pC.path(M.curve.map((r) => r.t), M.curve.map((r) => r.fp * M.fc), css("--warm"), 1.5, [5, 3]);
      pC.path(M.curve.map((r) => r.t), cs, css("--accent"), 2.5);
      pC.dot(M.best.t, M.best.cost, 6, null, css("--good")); pC.dot(t, curCost, 6, css("--violet"), css("--surface"));
      const rule = M.fc / (M.fc + M.mc);
      $("#ccCap").innerHTML = `Blue = total; red dashed = misses; orange dashed = false alarms. Cheapest cut-off here: <b>${Math.round(M.best.t * 100)}%</b> ($${M.best.cost.toLocaleString()}); you're at ${Math.round(t * 100)}% ($${curCost.toLocaleString()}). The rule of thumb $${M.fc} / ($${M.fc} + $${M.mc}) gives ${Math.round(rule * 100)}%.`;
    }
    function work() {
      const x = +$("#xw").value, z = M.a + M.b * x, p = sig(z), t = +$("#th").value;
      const b = (s) => `<b style="color:var(--ink)">${s}</b>`;
      $("#work").innerHTML = [
        `order travelling ${Math.round(x * 100).toLocaleString()} km (distance = ${x})`,
        `z = b0 + b1 × distance = ${fmt(M.a, 3)} + ${fmt(M.b, 3)} × ${x} = ${b(fmt(z, 3))}`,
        `p = 1 / (1 + e<sup>−z</sup>) = 1 / (1 + e<sup>${fmt(-z, 3)}</sup>) = 1 / (1 + ${fmt(Math.exp(-z), 3)}) = ${b(fmt(p, 3))}`,
        `odds = p / (1 − p) = ${fmt(p / (1 - p), 3)}; 100 km further → odds × ${fmt(Math.exp(M.b), 3)} = ${fmt((p / (1 - p)) * Math.exp(M.b), 3)} → p = ${fmt(sig(z + M.b), 3)}`,
        `cut-off ${Math.round(t * 100)}% → ${p >= t ? b("flag as late") : b("don't flag")}`,
      ].map((l) => `<div style="white-space:nowrap">${l}</div>`).join("");
    }
    function readouts(c) {
      $("#ro").innerHTML = `<div class="ro"><b>Caught / missed / false alarms</b><span class="num">${c.tp} / ${c.fn} / ${c.fp}</span></div>
        <div class="ro"><b>Cost of mistakes</b><span class="pill ${M.cm(+$("#th").value).fn * M.mc + c.fp * M.fc <= M.best.cost * 1.05 ? "ok" : "warn"}">$${(c.fn * M.mc + c.fp * M.fc).toLocaleString()}</span></div>
        <div class="ro"><b>AUC</b><span class="num">${M.auc.toFixed(3)}</span></div>`;
    }
    function labels() {
      $("#thV").textContent = Math.round(+$("#th").value * 100) + "%"; $("#mcV").textContent = "$" + $("#mc").value; $("#fcV").textContent = "$" + $("#fc").value;
      $("#sepV").textContent = (+$("#sep").value).toFixed(2); $("#baseV").textContent = $("#base").value + "%"; $("#xwV").textContent = Math.round(+$("#xw").value * 100).toLocaleString() + " km";
    }
    function render() { labels(); drawScatter(); const c = drawCM(); drawROC(c); work(); readouts(c); }
    function full() { data(); fit(); render(); }
    ["#th", "#xw"].forEach((s) => $(s).addEventListener("input", render));
    ["#mc", "#fc"].forEach((s) => $(s).addEventListener("input", () => { fit(); render(); }));
    ["#sep", "#base"].forEach((s) => $(s).addEventListener("input", full));
    $("#best").addEventListener("click", () => { $("#th").value = M.best.t.toFixed(2); render(); });
    $("#newd").addEventListener("click", () => { seed++; full(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 1; full(); });
    full();
    return watch([$("#sc"), $("#roc"), $("#cc")], render);
  },
});
