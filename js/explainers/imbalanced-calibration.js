Lab.register({
  id: "imbalanced-calibration",
  group: "Machine learning",
  title: "Rare events and calibrated probabilities",
  blurb: "When only 2% of suppliers fail, a model that never flags anyone is 98% accurate and useless. See precision, recall and the PR curve, pick a threshold from the costs, and check whether a “30% risk” really means 30%.",
  lede: "Many supply chain questions are about rare events: a supplier going under, a shipment lost, a fraudulent invoice, a stock-out on a slow mover. With rare events, accuracy misleads, the default 50% cut-off is almost always wrong, and the usual fixes for imbalance (re-weighting, under-sampling) quietly distort the model's probabilities. This page shows each problem and its fix.",
  quiz: [
    ["Failures are 2% of cases. Why is 98% accuracy not impressive?", "Predicting “no failure” for everyone scores 98% and catches nothing. Look at recall (share of failures caught) and precision (share of flags that were real) instead."],
    ["Why can the ROC curve look excellent while the model is unusable?", "ROC's x-axis is the false-alarm rate among the many negatives. 5% sounds small, but 5% of 9,800 good suppliers is 490 false alarms against maybe 150 real catches. The precision–recall curve shows that directly."],
    ["You up-weight failures 49× when training. What happens to the predicted probabilities?", "They're inflated: the model behaves as if failures were 50% of the data. Rankings are fine, but a “60%” may really be 3%. Undo it by subtracting ln(49) from the log-odds (prior correction) or by recalibrating on held-out data."],
    ["A missed failure costs $50,000, a needless supplier audit $2,000. Where should the threshold be?", "With calibrated probabilities, flag when p × 50,000 > (1 − p) × 2,000, i.e. p > 2,000 / 52,000 ≈ 3.8%. Far below 50%."],
    ["What does a calibration (reliability) plot show?", "Group cases by predicted probability and plot the real event rate in each group. A calibrated model sits on the diagonal: of the cases it calls 20%, about 20% happen."],
  ],
  diy: {
    intro: "Test cases in rows 2–10001: actual (1 = failed) in A, predicted probability in B. Threshold in E1, cost of a miss in E2, cost of a false alarm in E3.",
    steps: [
      ["Confusion matrix counts.", "TP: =COUNTIFS(A2:A10001,1,B2:B10001,\">=\"&E1)   FP: =COUNTIFS(A2:A10001,0,B2:B10001,\">=\"&E1)   FN: =COUNTIFS(A2:A10001,1,B2:B10001,\"<\"&E1)"],
      ["Precision, recall and F1.", "P: =TP/(TP+FP)   R: =TP/(TP+FN)   F1: =2*P*R/(P+R)"],
      ["Expected cost at this threshold.", "=FN*E2+FP*E3"],
      ["Cost-optimal threshold for calibrated probabilities.", "=E3/(E2+E3)"],
      ["Undo class weighting w (e.g. 49) on a probability p.", "=1/(1+EXP(-(LN(p/(1-p))-LN(w))))"],
      ["Calibration check: real rate among cases predicted 10–20%.", "=AVERAGEIFS(A2:A10001,B2:B10001,\">=0.1\",B2:B10001,\"<0.2\")"],
    ],
  },
  deeper: [
    ["Saito & Rehmsmeier (2015), The precision-recall plot is more informative than the ROC plot when evaluating binary classifiers on imbalanced datasets, PLOS ONE 10(3)", "https://doi.org/10.1371/journal.pone.0118432", "why PR beats ROC for rare events"],
    ["Elkan (2001), The foundations of cost-sensitive learning, IJCAI", "https://cseweb.ucsd.edu/~elkan/rescale.pdf", "thresholds from costs, and reweighting"],
    ["Niculescu-Mizil & Caruana (2005), Predicting good probabilities with supervised learning, ICML", "https://doi.org/10.1145/1102351.1102430", "which models are calibrated, and how to fix them"],
    ["Platt (1999), Probabilistic outputs for support vector machines and comparisons to regularized likelihood methods", "https://home.cs.colorado.edu/~mozer/Teaching/syllabi/6622/papers/Platt1999.pdf", "Platt scaling"],
    ["He & Garcia (2009), Learning from imbalanced data, IEEE TKDE 21(9)", "https://doi.org/10.1109/TKDE.2008.239", "survey of resampling and cost-sensitive methods"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 58 L88 6" stroke-dasharray="4 3" stroke-opacity=".6"/><path d="M8 58 C30 56 50 46 60 30 C68 18 78 10 88 8"/><g fill="currentColor"><circle cx="20" cy="54" r="3"/><circle cx="38" cy="47" r="3"/><circle cx="56" cy="34" r="3"/><circle cx="74" cy="16" r="3"/></g></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);
    const MODES = [["plain", "plain"], ["weight", "class weights"], ["under", "under-sampled"]];
    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(`<div class="plot" style="padding:14px">${h4("At this threshold, on 20,000 new suppliers")}<div id="cm"></div></div>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Cost against threshold")}</div><canvas id="i4" aria-label="Expected cost against threshold"></canvas><figcaption id="i4Cap"></figcaption></figure>`)}
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Precision–recall curve (and ROC)")}</div><canvas id="i1" aria-label="Precision-recall and ROC curves"></canvas><figcaption id="i1Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Calibration: does 20% mean 20%?")}</div><canvas id="i2" aria-label="Predicted probability against observed failure rate"></canvas><figcaption id="i2Cap"></figcaption></figure>`)}`,
      panel: `
        <p class="hint" style="margin:0">A logistic regression predicts which suppliers will fail in the next year from two warning signs (late-payment days and order-book decline). Trained on 5,000 suppliers, tested on 20,000 more.</p>
        <div class="ctrl"><label for="pr">Share of suppliers that fail <output id="prV"></output></label><input type="range" id="pr" min="0.005" max="0.3" step="0.005" value="0.02"></div>
        <div class="ctrl"><label for="sep">Strength of the warning signs <output id="sepV"></output></label><input type="range" id="sep" min="0.5" max="3" step="0.1" value="1.6"></div>
        <div class="ctrl"><label>Training</label><div class="seg" id="md">${MODES.map(([k, n], i) => `<button type="button" data-v="${k}" aria-pressed="${i === 0}">${n}</button>`).join("")}</div></div>
        <label class="check"><input type="checkbox" id="cal"> Recalibrate (undo the re-weighting)</label>
        <div class="ctrl"><label for="th">Flag a supplier when P(fail) is at least <output id="thV"></output></label><input type="range" id="th" min="0.005" max="0.95" step="0.005" value="0.5"></div>
        <div class="ctrl"><label for="cr">Cost of a missed failure vs a needless audit <output id="crV"></output></label><input type="range" id="cr" min="1" max="100" step="1" value="25"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn primary" id="opt" type="button">Set the cost-optimal threshold</button><button class="btn" id="resim" type="button">New sample</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The measures</h2>
          <ul>
            <li><b>Recall</b> (sensitivity): of the suppliers that failed, the share we flagged. TP / (TP + FN).</li>
            <li><b>Precision</b>: of the suppliers we flagged, the share that failed. TP / (TP + FP). With rare events this is the hard one.</li>
            <li><b>F1</b>: the harmonic mean of the two, a single number when you have no costs. With costs, use cost.</li>
            <li><b>PR-AUC</b> (average precision): area under the precision–recall curve. A random model scores the base rate, not 0.5.</li>
          </ul>
        </section>
        <section>
          <h2>Choosing the threshold from costs</h2>
          <p>Flag when the expected cost of not flagging is bigger than the cost of flagging: p × cost<sub>miss</sub> > (1 − p) × cost<sub>alarm</sub>, so</p>
          <div class="eq">threshold = cost<sub>alarm</sub> / (cost<sub>miss</sub> + cost<sub>alarm</sub>)</div>
          <p>This only works if the probabilities are calibrated. It's the same logic as the <a href="#newsvendor">newsvendor</a> critical ratio.</p>
        </section>
        <section>
          <h2>Re-weighting and under-sampling</h2>
          <p>Both make the rare class count more in training, so the model pays attention to it. Both also shift every predicted log-odds up by about ln(weight), which is the same as pretending failures are much more common. The ranking of suppliers barely changes (look at the PR curve), but the probabilities are now too high. Either subtract ln(weight) from the log-odds (what “recalibrate” does here) or fit a calibration map on held-out data (Platt scaling or isotonic regression).</p>
          <p>For a well-specified model like this one, plain training plus a sensible threshold is as good as re-weighting. Re-weighting helps more with flexible models that would otherwise ignore the rare class.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>At 2% failures and threshold 50%, recall is tiny while accuracy is 98%. Press “Set the cost-optimal threshold”.</li>
            <li>Switch to class weights: the calibration dots jump above the diagonal. Tick “Recalibrate” to pull them back.</li>
            <li>Compare the PR curves for plain and weighted training: almost the same. Weighting changes the probabilities, not the ranking.</li>
            <li>Raise the failure share to 30%: ROC barely changes, but precision improves a lot.</li>
          </ul>
        </section>`,
    });

    let seed = 6, mode = "plain", train = [], test = [], M = null, curves = null;
    function gen() {
      const r = rng(seed), pr = +$("#pr").value, sep = +$("#sep").value, mk = (n) => Array.from({ length: n }, () => { const y = r() < pr ? 1 : 0; return { x: [sep * y + r.normal(), 0.6 * sep * y + r.normal()], y }; });
      train = mk(5000); test = mk(20000);
    }
    const sig = (z) => 1 / (1 + Math.exp(-z));
    function fit() {
      let D = train, wpos = 1; const npos = train.filter((p) => p.y).length, nneg = train.length - npos;
      if (mode === "weight") wpos = nneg / Math.max(1, npos);
      if (mode === "under") { const r = rng(seed + 50), neg = train.filter((p) => !p.y), pos = train.filter((p) => p.y), keep = neg.filter(() => r() < pos.length / neg.length); D = pos.concat(keep); wpos = 1; }
      let w = [0, 0, 0];
      for (let it = 0; it < 60; it++) { // Newton steps (IRLS)
        const g = [0, 0, 0], H = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        D.forEach((p) => { const z = [1, p.x[0], p.x[1]], q = sig(w[0] + w[1] * z[1] + w[2] * z[2]), wt = p.y ? wpos : 1; for (let a = 0; a < 3; a++) { g[a] += wt * (q - p.y) * z[a]; for (let b = 0; b < 3; b++) H[a][b] += wt * q * (1 - q) * z[a] * z[b]; } });
        H.forEach((r, i) => (r[i] += 1e-6)); const s = Lab.solve(H, g); w = w.map((v, i) => v - s[i]); if (Math.hypot(...s) < 1e-8) break;
      }
      const shift = mode === "weight" ? Math.log(wpos) : mode === "under" ? Math.log((nneg / npos) / (D.length - npos > 0 ? (D.length - npos) / npos : 1)) : 0;
      M = { w, shift, wpos: mode === "weight" ? wpos : mode === "under" ? Math.exp(shift) : 1 };
    }
    const prob = (x) => { const z = M.w[0] + M.w[1] * x[0] + M.w[2] * x[1] - ($("#cal").checked ? M.shift : 0); return sig(z); };
    function curveData() {
      const S = test.map((p) => [prob(p.x), p.y]).sort((a, b) => b[0] - a[0]), P = S.reduce((a, s) => a + s[1], 0), N = S.length - P; let tp = 0, fp = 0, ap = 0; const pr = [[0, 1]], roc = [[0, 0]];
      S.forEach(([s, y], i) => { if (y) { tp++; ap += tp / (tp + fp); } else fp++; if (i % 20 === 0 || i === S.length - 1) { pr.push([tp / P, tp / Math.max(1, tp + fp)]); roc.push([fp / N, tp / P]); } });
      let auc = 0; for (let i = 1; i < roc.length; i++) auc += (roc[i][0] - roc[i - 1][0]) * (roc[i][1] + roc[i - 1][1]) / 2;
      const cum = [0]; S.forEach(([, y], i) => cum.push(cum[i] + y));
      curves = { S, P, N, pr, roc, ap: ap / P, auc, cum };
    }
    function cmAt(t) { const S = curves.S; let lo = 0, hi = S.length; while (lo < hi) { const m = (lo + hi) >> 1; if (S[m][0] >= t) lo = m + 1; else hi = m; } const tp = curves.cum[lo], fp = lo - tp; return { tp, fp, fn: curves.P - tp, tn: curves.N - fp }; }
    const COST_ALARM = 2000, costMiss = () => +$("#cr").value * COST_ALARM;
    const cost = (c) => c.fn * costMiss() + c.fp * COST_ALARM;
    const P1 = new Plot($("#i1"), { x: [0, 1], y: [0, 1], pad: { l: 46, b: 38 } }), P2 = new Plot($("#i2"), { x: [0, 1], y: [0, 1], pad: { l: 46, b: 38 } }), P4 = new Plot($("#i4"), { pad: { l: 58, b: 38 } });
    function cmHTML() {
      const t = +$("#th").value, c = cmAt(t), n = test.length, acc = (c.tp + c.tn) / n, rec = c.tp / Math.max(1, c.tp + c.fn), pre = c.tp / Math.max(1, c.tp + c.fp), f1 = pre + rec ? (2 * pre * rec) / (pre + rec) : 0, base = Math.max(curves.P, curves.N) / n;
      const cell = (v, lab, col) => `<div style="padding:12px;border-radius:8px;background:color-mix(in srgb, var(${col}) 16%, var(--surface));text-align:center"><div style="font:600 1.3rem var(--font-mono)">${v.toLocaleString()}</div><div style="font-size:.78rem;color:var(--muted)">${lab}</div></div>`;
      $("#cm").innerHTML = `<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:6px;align-items:center;font-size:.82rem">
        <span></span><b style="text-align:center">flagged</b><b style="text-align:center">not flagged</b>
        <b>failed</b>${cell(c.tp, "caught (TP)", "--good")}${cell(c.fn, "missed (FN)", "--bad")}
        <b>survived</b>${cell(c.fp, "false alarm (FP)", "--warm")}${cell(c.tn, "left alone (TN)", "--accent")}</div>
        <div style="font:.8rem/1.8 var(--font-mono);margin-top:10px">accuracy = (${c.tp} + ${c.tn.toLocaleString()}) / ${n.toLocaleString()} = <b>${fmt(acc * 100, 1)}%</b> &nbsp;(“never flag” scores ${fmt(base * 100, 1)}%)<br>recall = ${c.tp} / ${c.tp + c.fn} = <b>${fmt(rec * 100, 1)}%</b> &nbsp; precision = ${c.tp} / ${c.tp + c.fp} = <b>${fmt(pre * 100, 1)}%</b> &nbsp; F1 = <b>${fmt(f1, 3)}</b><br>cost = ${c.fn} × $${costMiss().toLocaleString()} + ${c.fp.toLocaleString()} × $${COST_ALARM.toLocaleString()} = <b>$${(cost(c) / 1e6).toFixed(2)}M</b></div>`;
      return { c, acc, rec, pre, f1 };
    }
    function d1() {
      const t = +$("#th").value, c = cmAt(t), rec = c.tp / Math.max(1, c.tp + c.fn), pre = c.tp / Math.max(1, c.tp + c.fp), fpr = c.fp / curves.N;
      P1.resize(); P1.clear(); P1.axes({ xLabel: "recall (failures caught)", yLabel: "precision", xFormat: (v) => Math.round(v * 100) + "%", yFormat: (v) => Math.round(v * 100) + "%", xCount: 5, yCount: 5 });
      const base = curves.P / test.length; P1.path([0, 1], [base, base], css("--muted"), 1.2, [5, 4]);
      P1.path(curves.roc.map((p) => p[0]), curves.roc.map((p) => p[1]), css("--violet"), 1.5, [2, 3]);
      P1.path(curves.pr.map((p) => p[0]), curves.pr.map((p) => p[1]), css("--accent"), 2.5); P1.dot(rec, pre, 5.5, css("--warm"), css("--surface")); P1.dot(fpr, rec, 4, css("--violet"), css("--surface"));
      $("#i1Cap").innerHTML = `Blue: precision against recall (average precision ${fmt(curves.ap, 3)}; a random model scores ${fmt(base, 3)}, the dashed line). Purple dotted: the ROC curve (x = false-alarm rate, y = recall), area ${fmt(curves.auc, 3)}. The ROC looks fine even when precision is poor. Dots: the current threshold.`;
    }
    function d2() {
      const B = [0, 0.01, 0.02, 0.05, 0.1, 0.2, 0.35, 0.5, 0.7, 1], bins = B.slice(1).map(() => [0, 0, 0]);
      curves.S.forEach(([s, y]) => { const b = B.findIndex((v, i) => i > 0 && s < v) - 1; const k = b < 0 ? bins.length - 1 : b; bins[k][0]++; bins[k][1] += y; bins[k][2] += s; });
      const pts = bins.filter((b) => b[0] >= 20).map((b) => [b[2] / b[0], b[1] / b[0], b[0]]), mx = Math.min(1, Math.max(0.1, ...pts.flat().slice(0).filter((_, i) => i % 3 !== 2)) * 1.1);
      P2.resize(); P2.x = [0, mx]; P2.y = [0, mx]; P2.clear(); P2.axes({ xLabel: "predicted P(fail)", yLabel: "actual failure rate", xFormat: (v) => Math.round(v * 100) + "%", yFormat: (v) => Math.round(v * 100) + "%", xCount: 5, yCount: 5 });
      P2.path([0, mx], [0, mx], css("--muted"), 1.2, [5, 4]); P2.path(pts.map((p) => p[0]), pts.map((p) => p[1]), css("--accent"), 1.5);
      pts.forEach(([x, y, n]) => P2.dot(x, y, 3 + Math.min(7, Math.log10(n) * 2), css("--accent"), css("--surface")));
      const meanP = curves.S.reduce((a, s) => a + s[0], 0) / curves.S.length, real = curves.P / curves.S.length;
      $("#i2Cap").innerHTML = `Each dot: test suppliers grouped by predicted probability (bigger = more suppliers). Dashed: perfect calibration. Average prediction ${fmt(meanP * 100, 1)}% vs actual failure rate ${fmt(real * 100, 1)}%${Math.abs(meanP - real) > 0.02 + real * 0.3 ? ": <b>the probabilities are off</b>" : ""}.`;
    }
    let costCurve = [];
    function d4() {
      costCurve = []; for (let t = 0.005; t <= 0.951; t += 0.005) costCurve.push([t, cost(cmAt(t))]);
      const t = +$("#th").value, best = costCurve.reduce((a, c) => (c[1] < a[1] ? c : a)), mx = Math.max(...costCurve.map((c) => c[1]));
      P4.resize(); P4.x = [0, 0.95]; P4.y = [0, mx * 1.05]; P4.clear(); P4.axes({ xLabel: "threshold", yLabel: "expected cost", xFormat: (v) => Math.round(v * 100) + "%", yFormat: (v) => "$" + fmt(v / 1e6, 1) + "M", xCount: 5 });
      P4.path(costCurve.map((c) => c[0]), costCurve.map((c) => c[1]), css("--accent"), 2.5);
      const theory = 1 / (1 + +$("#cr").value); P4.path([theory, theory], P4.y, css("--good"), 1.5, [5, 4]);
      P4.dot(best[0], best[1], 4.5, css("--good"), css("--surface")); P4.path([t, t], P4.y, css("--warm"), 1.5); P4.dot(t, cost(cmAt(t)), 5, css("--warm"), css("--surface"));
      $("#i4Cap").innerHTML = `Miss = $${costMiss().toLocaleString()}, false alarm = $${COST_ALARM.toLocaleString()}. Lowest cost at a threshold of ${fmt(best[0] * 100, 1)}%. Green dashed: the theory, $${COST_ALARM.toLocaleString()} / ($${costMiss().toLocaleString()} + $${COST_ALARM.toLocaleString()}) = ${fmt(theory * 100, 1)}%, which matches only if the probabilities are calibrated.`;
    }
    function readouts(m) {
      const t = +$("#th").value, best = costCurve.reduce((a, c) => (c[1] < a[1] ? c : a)), cur = cost(cmAt(t));
      $("#ro").innerHTML = [["Recall", `<span class="num">${fmt(m.rec * 100, 1)}%</span>`], ["Precision", `<span class="num">${fmt(m.pre * 100, 1)}%</span>`], ["Cost at this threshold", `<span class="pill ${cur <= best[1] * 1.05 ? "ok" : cur <= best[1] * 1.3 ? "warn" : "bad"}">$${(cur / 1e6).toFixed(2)}M</span>`], ["Lowest possible", `<span class="num">$${(best[1] / 1e6).toFixed(2)}M</span>`]]
        .map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { $("#prV").textContent = fmt(+$("#pr").value * 100, 1) + "%"; $("#sepV").textContent = fmt(+$("#sep").value, 1); $("#thV").textContent = fmt(+$("#th").value * 100, 1) + "%"; $("#crV").textContent = $("#cr").value + "× ($" + (+$("#cr").value * 2).toLocaleString() + "k vs $2k)"; }
    function draw() { labels(); const m = cmHTML(); d4(); d1(); d2(); readouts(m); }
    function full() { fit(); curveData(); draw(); }
    ["pr", "sep"].forEach((id) => $("#" + id).addEventListener("input", () => { gen(); full(); }));
    ["th", "cr"].forEach((id) => $("#" + id).addEventListener("input", draw));
    $("#cal").addEventListener("change", () => { curveData(); draw(); });
    root.querySelectorAll("#md button").forEach((b) => b.addEventListener("click", () => { root.querySelectorAll("#md button").forEach((x) => x.setAttribute("aria-pressed", x === b)); mode = b.dataset.v; full(); }));
    $("#opt").addEventListener("click", () => { const best = costCurve.reduce((a, c) => (c[1] < a[1] ? c : a)); $("#th").value = best[0]; draw(); });
    $("#resim").addEventListener("click", () => { seed++; gen(); full(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); $("#cal").checked = false; mode = "plain"; root.querySelectorAll("#md button").forEach((b, i) => b.setAttribute("aria-pressed", i === 0)); seed = 6; gen(); full(); });
    gen(); full();
    return watch([$("#i1"), $("#i2"), $("#i4")], () => { d1(); d2(); d4(); });
  },
});
