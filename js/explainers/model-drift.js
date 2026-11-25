Lab.register({
  id: "model-drift",
  group: "Machine learning",
  title: "Model drift: when a live model goes stale",
  blurb: "A demand model is trained on last year and switched on. Then prices rise past anything it has seen, or customers stop reacting to promotions. Watch the error creep up, catch it with monitoring (PSI and error alarms), and compare retraining policies.",
  lede: "A model is a snapshot of the world it was trained on. Once it's in use, the world moves: prices inflate, a competitor opens, a promotion stops working, a new product mix arrives. Inputs moving away from the training data is <b>data drift</b>; the relationship itself changing is <b>concept drift</b>. Neither announces itself. You find out by monitoring the inputs and the errors, and you fix it by retraining on recent data, on a schedule or when an alarm fires.",
  quiz: [
    ["What's the difference between data drift and concept drift?", "Data drift: the inputs change distribution (prices now $13–15 instead of $8–12) but the rule linking inputs to demand is the same. Concept drift: the rule changes (a promotion now lifts sales 20% instead of 60%), even if the inputs look the same."],
    ["Does data drift always make a model worse?", "No. If the model has the right shape beyond its training range, it extrapolates fine. It hurts when the model is wrong outside the range it saw, which you usually can't check in advance. That's why it's worth an alert."],
    ["Why might input monitoring (PSI) miss concept drift?", "PSI compares input distributions only. If promotions stop working, promo frequency and prices can look exactly as before, so PSI stays low while errors rise. Monitor errors too, once actuals arrive."],
    ["What does a PSI of 0.25 mean?", "The live distribution of a feature differs substantially from training. A common rule: below 0.1 stable, 0.1–0.25 worth a look, above 0.25 significant shift."],
    ["Why not just retrain every week?", "Frequent retraining on short windows chases noise and can make forecasts jumpy; it also costs effort and needs checks each time. Scheduled retraining plus alarm-triggered retraining is a common balance."],
  ],
  diy: {
    intro: "Training-period prices in A2:A1041, the latest 13 weeks of prices in B2:B261. Bin edges from training deciles in D2:D10.",
    steps: [
      ["Decile edges of the training data.", "D2: =PERCENTILE.INC($A$2:$A$1041, ROW()/10-0.1)   (fill to D10 for 10%–90%)"],
      ["Share of training values in each bin (expected).", "E2: =COUNTIFS($A$2:$A$1041,\">\"&D1,$A$2:$A$1041,\"<=\"&D2)/COUNT($A$2:$A$1041)   (use −∞/+∞ for the end bins)"],
      ["Share of live values in each bin (actual).", "F2: =COUNTIFS($B$2:$B$261,\">\"&D1,$B$2:$B$261,\"<=\"&D2)/COUNT($B$2:$B$261)"],
      ["PSI: sum over bins (add a tiny number to avoid log of 0).", "=SUMPRODUCT((F2:F11-E2:E11)*LN((F2:F11+0.0001)/(E2:E11+0.0001)))"],
      ["Error alarm: rolling 8-week error divided by the error during training.", "=AVERAGE(err_last_8_weeks)/train_error   alarm if > 1.3"],
      ["Tracking signal for bias (from forecast-accuracy).", "=SUM(errors)/AVERAGE(ABS(errors))   alarm if beyond ±4"],
    ],
  },
  deeper: [
    ["Gama, Žliobaitė, Bifet, Pechenizkiy & Bouchachia (2014), A survey on concept drift adaptation, ACM Computing Surveys 46(4)", "https://doi.org/10.1145/2523813", "types of drift and how to adapt"],
    ["Lu, Liu, Dong, Gu, Gama & Zhang (2019), Learning under concept drift: a review, IEEE TKDE 31(12)", "https://doi.org/10.1109/TKDE.2018.2876857", "detection methods compared"],
    ["Sculley et al. (2015), Hidden technical debt in machine learning systems, NeurIPS", "https://papers.nips.cc/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html", "why models in production decay"],
    ["Yurdakul (2018), Statistical properties of population stability index, PhD dissertation, Western Michigan University", "https://scholarworks.wmich.edu/dissertations/3208/", "where the PSI thresholds come from"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 48 L20 44 L34 46 L46 42 L58 36 L70 26 L82 18 L92 10"/><path d="M4 50 H92" stroke-dasharray="4 3" stroke-opacity=".5"/><path d="M56 4 V60" stroke-opacity=".5"/><circle cx="76" cy="22" r="5"/><path d="M76 8 V14 M76 30 V34" stroke-opacity=".6"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);
    const DRIFT = [["none", "no drift"], ["data", "prices rise (data drift)"], ["concept", "promos stop working (concept drift)"], ["both", "both"]];
    const POL = [["never", "never retrain"], ["sched", "every 13 weeks"], ["alarm", "when an alarm fires"]];
    const NS = 20, TW = 52, NW = 156;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0"><div style="padding:4px 6px 0">${h4("Weekly forecast error after go-live")}</div><canvas id="m1" aria-label="Weekly error of the live model under each retraining policy"></canvas><figcaption id="m1Cap"></figcaption></figure>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Input monitoring: PSI of each feature")}</div><canvas id="m2" aria-label="Population stability index of price, promotion and temperature over time"></canvas><figcaption id="m2Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Price: training vs the latest 13 weeks")}</div><canvas id="m3" aria-label="Histogram of prices in training and in the latest window"></canvas><figcaption id="m3Cap"></figcaption></figure>`)}
        <div class="plot wide" style="padding:14px;overflow-x:auto">${h4("Worked out at the selected week")}<div id="work" style="font:.78rem/1.8 var(--font-mono)"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">20 stores, weekly. A log-linear demand model (price, promotion, temperature) is trained on year 1 and goes live at the start of year 2. Two years of live weeks follow.</p>
        <div class="ctrl"><label>What changes</label><div class="seg" id="dr" style="display:flex;flex-wrap:wrap">${DRIFT.map(([k, n], i) => `<button type="button" data-v="${k}" aria-pressed="${i === 3}">${n}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="st">Drift starts in live week <output id="stV"></output></label><input type="range" id="st" min="1" max="80" step="1" value="20"></div>
        <div class="ctrl"><label for="sz">Size of the change <output id="szV"></output></label><input type="range" id="sz" min="0" max="1" step="0.05" value="0.6"></div>
        <div class="ctrl"><label>Retraining policy (bold line)</label><div class="seg" id="po" style="display:flex;flex-wrap:wrap">${POL.map(([k, n], i) => `<button type="button" data-v="${k}" aria-pressed="${i === 2}">${n}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="al">Error alarm: 8-week error above <output id="alV"></output> × the training error</label><input type="range" id="al" min="1.1" max="2" step="0.05" value="1.3"></div>
        <div class="ctrl"><label for="wk">Week to inspect <output id="wkV"></output></label><input type="range" id="wk" min="1" max="${NW - TW}" step="1" value="60"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New data</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>What to monitor</h2>
          <ul>
            <li><b>Inputs</b> (available immediately): distribution of each feature vs training, with PSI or a KS test; share of missing values; new categories (a new store, a new supplier code).</li>
            <li><b>Predictions</b>: their average and spread. A sudden jump in average forecast is a warning even before actuals arrive.</li>
            <li><b>Errors</b> (once actuals arrive): rolling error vs the error seen in testing, and bias with a <a href="#forecast-accuracy">tracking signal</a>. A <a href="#change-points">change-point test</a> such as CUSUM catches sustained shifts sooner than a fixed threshold.</li>
          </ul>
        </section>
        <section>
          <h2>Population stability index (PSI)</h2>
          <div class="eq">PSI = Σ over bins (actual% − expected%) × ln(actual% / expected%)</div>
          <p>Bins come from the training data (here deciles), so each training bin holds 10%. A live window that piles into the top bin scores high. Rules of thumb: under 0.1 stable, 0.1–0.25 moderate, over 0.25 large.</p>
        </section>
        <section>
          <h2>Retraining policies</h2>
          <ul>
            <li><b>Never</b>: simplest; fine only in a stable world.</li>
            <li><b>On a schedule</b>: retrain on the latest 52 weeks every quarter. Predictable, but slow to react to a sudden change and wasteful when nothing changed.</li>
            <li><b>On alarm</b>: retrain when monitoring fires. Reacts to real changes, but needs well-set thresholds (too low = constant retraining, too high = slow).</li>
          </ul>
          <p>Retraining only helps once there is enough data from the new world. Right after a sudden change, a window that mixes old and new data is still partly wrong.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Choose “promos stop working”: PSI stays flat, but errors rise. Only the error alarm catches it.</li>
            <li>Choose “prices rise”: price PSI climbs first, warning you before errors grow.</li>
            <li>Compare policies on “both”: never retraining keeps getting worse; the alarm policy recovers within weeks.</li>
            <li>Set the alarm to 1.1: it fires on noise and retrains often.</li>
          </ul>
        </section>`,
    });

    let seed = 21, drift = "both", pol = "alarm", rows = [], runs = {}, psi = [];
    function gen() {
      const r = rng(seed), st = TW + +$("#st").value, sz = +$("#sz").value; rows = [];
      for (let w = 0; w < NW; w++) {
        const after = w >= st, ramp = after ? Math.min(1, (w - st) / 26) : 0, temp = 15 + 9 * Math.sin((2 * Math.PI * (w - 8)) / 52);
        for (let s = 0; s < NS; s++) {
          const promo = r() < 0.2 ? 1 : 0, pBase = 8 + 4 * r(), infl = drift === "data" || drift === "both" ? 1 + 0.45 * sz * ramp : 1, price = pBase * infl * (promo ? 0.85 : 1), t = temp + 3 * r.normal();
          const lift = drift === "concept" || drift === "both" ? (after ? 0.6 * (1 - sz) : 0.6) : 0.6, steep = price > 12 ? Math.pow(price / 12, -2.2) : 1;
          const y = 300 * (1 + 0.15 * (s % 5) / 4) * Math.pow(price / 10, -1.2) * steep * (1 + lift * promo) * (1 + 0.012 * (t - 15)) * Math.exp(0.12 * r.normal());
          rows.push({ w, s, x: [Math.log(price), promo, t, s % 5], price, promo, t, y });
        }
      }
    }
    const feat = (o) => [1, o.x[0], o.x[1], o.x[2], o.x[3]];
    function fit(w0, w1) { const D = rows.filter((o) => o.w >= w0 && o.w < w1), X = D.map(feat), p = 5, A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? 1e-6 : 0))), b = Array.from({ length: p }, (_, i) => X.reduce((s, r, k) => s + r[i] * Math.log(D[k].y), 0)); return Lab.solve(A, b); }
    const pred = (beta, o) => Math.exp(feat(o).reduce((s, v, j) => s + v * beta[j], 0) + 0.0072);
    const wErr = (beta, w) => { const D = rows.filter((o) => o.w === w); return D.reduce((s, o) => s + Math.abs(o.y - pred(beta, o)), 0) / D.reduce((s, o) => s + o.y, 0); };
    function simulate(policy) {
      let beta = fit(0, TW); const base = Array.from({ length: TW }, (_, w) => wErr(beta, w)).reduce((a, b) => a + b, 0) / TW, err = [], retrains = [], alarms = [], th = +$("#al").value; let last = TW;
      for (let w = TW; w < NW; w++) {
        const e = wErr(beta, w); err.push(e);
        const roll = err.slice(-8), ratio = roll.reduce((a, b) => a + b, 0) / roll.length / base, alarm = roll.length >= 4 && ratio > th && w - last >= 8;
        if (alarm) alarms.push(w);
        if ((policy === "sched" && (w - TW + 1) % 13 === 0) || (policy === "alarm" && alarm)) { beta = fit(Math.max(0, w + 1 - 52), w + 1); retrains.push(w + 1); last = w + 1; }
      }
      return { err, base, retrains, alarms, beta };
    }
    function psiCalc() {
      const tr = rows.filter((o) => o.w < TW), F = [["price", (o) => o.price], ["promotion", (o) => o.promo], ["temperature", (o) => o.t]];
      psi = F.map(([n, g]) => { const v = tr.map(g).sort((a, b) => a - b), edges = n === "promotion" ? [0.5] : Array.from({ length: 9 }, (_, k) => v[Math.floor(((k + 1) / 10) * (v.length - 1))]), bin = (x) => edges.filter((e) => x > e).length, exp = new Array(edges.length + 1).fill(0); v.forEach((x) => exp[bin(x)]++); const E = exp.map((c) => c / v.length);
        const series = []; for (let w = TW; w < NW; w++) { const win = rows.filter((o) => o.w > w - 13 && o.w <= w).map(g), act = new Array(edges.length + 1).fill(0); win.forEach((x) => act[bin(x)]++); const A = act.map((c) => c / win.length); let EE = E;
          if (n === "temperature") { const ref = rows.filter((o) => o.w > w - 65 && o.w <= w - 52).map(g), ex = new Array(edges.length + 1).fill(0); ref.forEach((x) => ex[bin(x)]++); EE = ex.map((c) => c / ref.length); }
          series.push(A.reduce((s, a, i) => s + (a - EE[i]) * Math.log((a + 1e-4) / (EE[i] + 1e-4)), 0)); }
        return { n, series, edges, E, g }; });
    }
    function runAll() { POL.forEach(([k]) => (runs[k] = simulate(k))); psiCalc(); }
    const P1 = new Plot($("#m1"), { pad: { l: 46, b: 38 } }), P2 = new Plot($("#m2"), { pad: { l: 46, b: 38 } }), P3 = new Plot($("#m3"), { pad: { l: 46, b: 38 } });
    const wk = () => TW + +$("#wk").value - 1;
    function d1() {
      const xs = Array.from({ length: NW - TW }, (_, i) => i + 1), all = POL.flatMap(([k]) => runs[k].err), R = runs[pol];
      P1.resize(); P1.x = [1, NW - TW]; P1.y = [0, Math.min(0.6, Math.max(...all) * 1.1)]; P1.clear();
      P1.axes({ xLabel: "live week", yLabel: "weekly error (WAPE)", xFormat: (v) => fmt(v, 0), yFormat: (v) => Math.round(v * 100) + "%" });
      const st = +$("#st").value; if (drift !== "none") { const g = P1.ctx; g.fillStyle = css("--warm"); g.globalAlpha = 0.08; g.fillRect(P1.sx(st), P1.pad.t, P1.sx(NW - TW) - P1.sx(st), P1.ih); g.globalAlpha = 1; }
      P1.path([1, NW - TW], [R.base, R.base], css("--muted"), 1.2, [5, 4]); P1.path([1, NW - TW], [R.base * +$("#al").value, R.base * +$("#al").value], css("--bad"), 1, [2, 3]);
      POL.forEach(([k]) => { if (k !== pol) P1.path(xs, runs[k].err, css(k === "never" ? "--muted" : "--violet"), 1.3, null, 0.6); });
      P1.path(xs, R.err, css("--accent"), 2.5);
      R.retrains.forEach((w) => { const x = w - TW + 1; P1.path([x, x], [P1.y[1] * 0.92, P1.y[1]], css("--good"), 2); });
      runs.alarm.alarms.forEach((w) => P1.dot(w - TW + 1, runs.alarm.err[w - TW], 3.5, css("--bad"), css("--surface")));
      const k = +$("#wk").value; P1.path([k, k], P1.y, css("--warm"), 1.2, [2, 3]);
      $("#m1Cap").innerHTML = `Blue: ${POL.find((p) => p[0] === pol)[1]}. Thin lines: the other two policies. Grey dashed: error during training (${fmt(R.base * 100, 1)}%); red dotted: the alarm level. Green ticks: retraining. Red dots: error alarms. Shaded: after the drift starts.`;
    }
    function d2() {
      const xs = Array.from({ length: NW - TW }, (_, i) => i + 1), mx = Math.max(0.35, ...psi.flatMap((p) => p.series)) * 1.1; P2.resize(); P2.x = [1, NW - TW]; P2.y = [0, mx]; P2.clear();
      P2.axes({ xLabel: "live week (13-week window)", yLabel: "PSI", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 2) });
      const g = P2.ctx; [[0.1, "--warm"], [0.25, "--bad"]].forEach(([v, c]) => P2.path([1, NW - TW], [v, v], css(c), 1, [4, 3]));
      psi.forEach((p, i) => P2.path(xs, p.series, css(["--accent", "--violet", "--good"][i]), 2));
      const k = +$("#wk").value; P2.path([k, k], P2.y, css("--warm"), 1.2, [2, 3]);
      $("#m2Cap").innerHTML = `Blue: price. Purple: promotion share. Green: temperature, compared with the same 13 weeks a year earlier (against the whole year it would always look like drift, because of the seasons). Dotted lines at 0.1 and 0.25. At week ${k}: price ${fmt(psi[0].series[k - 1], 3)}, promotion ${fmt(psi[1].series[k - 1], 3)}, temperature ${fmt(psi[2].series[k - 1], 3)}.`;
    }
    function d3() {
      const p = psi[0], tr = rows.filter((o) => o.w < TW).map(p.g), win = rows.filter((o) => o.w > wk() - 13 && o.w <= wk()).map(p.g), lo = 5, hi = Math.max(18, ...win) + 0.5, B = 26, w = (hi - lo) / B, hist = (a) => { const h = new Array(B).fill(0); a.forEach((v) => h[Math.max(0, Math.min(B - 1, Math.floor((v - lo) / w)))]++); return h.map((c) => c / a.length); }, hT = hist(tr), hL = hist(win), g = P3.ctx;
      P3.resize(); P3.x = [lo, hi]; P3.y = [0, Math.max(...hT, ...hL) * 1.15]; P3.clear(); P3.axes({ xLabel: "shelf price ($)", yLabel: "share of store-weeks", xFormat: (v) => fmt(v, 0), yFormat: (v) => Math.round(v * 100) + "%" });
      [[hT, "--muted"], [hL, "--accent"]].forEach(([h, c]) => h.forEach((v, k) => { g.fillStyle = css(c); g.globalAlpha = 0.55; g.fillRect(P3.sx(lo + k * w) + 1, P3.sy(v), P3.sx(w) - P3.sx(0) - 2, P3.sy(0) - P3.sy(v)); })); g.globalAlpha = 1;
      P3.path([12, 12], P3.y, css("--bad"), 1.2, [4, 3]);
      const over = win.filter((v) => v > Math.max(...tr)).length / win.length;
      $("#m3Cap").innerHTML = `Grey: year-1 training prices. Blue: the 13 weeks up to live week ${$("#wk").value}. ${over > 0.01 ? `<b>${fmt(over * 100, 0)}%</b> of recent prices are above anything in training; ` : ""}above $12 (red) demand really falls faster, which the model has never seen.`;
    }
    function work() {
      const R = runs[pol], k = +$("#wk").value, e = R.err[k - 1], roll = R.err.slice(Math.max(0, k - 8), k), ratio = roll.reduce((a, b) => a + b, 0) / roll.length / R.base, p = psi[0], win = rows.filter((o) => o.w > wk() - 13 && o.w <= wk()).map(p.g), act = new Array(p.E.length).fill(0); win.forEach((x) => act[p.edges.filter((ed) => x > ed).length]++);
      const A = act.map((c) => c / win.length), terms = A.map((a, i) => (a - p.E[i]) * Math.log((a + 1e-4) / (p.E[i] + 1e-4))), B = (t) => `<b style="color:var(--ink)">${t}</b>`;
      $("#work").innerHTML = [
        `Live week ${k}: error ${fmt(e * 100, 1)}%; average of the last ${roll.length} weeks ${fmt((roll.reduce((a, b) => a + b, 0) / roll.length) * 100, 1)}% ÷ training error ${fmt(R.base * 100, 1)}% = ${B(fmt(ratio, 2))} ${ratio > +$("#al").value ? "<span style='color:var(--bad)'>→ above the alarm level</span>" : "(below the alarm level)"}`,
        `Price PSI, last 13 weeks (${win.length} store-weeks) against training deciles (10% each):`,
        `&nbsp;&nbsp;live share per bin: ${A.map((a) => fmt(a * 100, 0) + "%").join(" ")}`,
        `&nbsp;&nbsp;terms (a−e)·ln(a/e): ${terms.map((t) => fmt(t, 3)).join(" + ")} = ${B(fmt(terms.reduce((a, b) => a + b, 0), 3))}`,
        `Model now in use: ln(units) = ${fmt(R.beta[0], 2)} ${R.beta[1] < 0 ? "−" : "+"} ${fmt(Math.abs(R.beta[1]), 2)}·ln(price) + ${fmt(R.beta[2], 2)}·promo + ${fmt(R.beta[3], 3)}·temp + store terms (after ${R.retrains.length} retrain${R.retrains.length === 1 ? "" : "s"})`,
      ].map((l) => `<div>${l}</div>`).join("");
    }
    function readouts() {
      const avg = (k) => runs[k].err.reduce((a, b) => a + b, 0) / runs[k].err.length, firstA = runs.alarm.alarms[0], firstP = psi[0].series.findIndex((v) => v > 0.25);
      $("#ro").innerHTML = [["Avg live error, never retrain", `<span class="num">${fmt(avg("never") * 100, 1)}%</span>`], ["Every 13 weeks", `<span class="num">${fmt(avg("sched") * 100, 1)}%</span>`], ["On alarm", `<span class="num">${fmt(avg("alarm") * 100, 1)}%</span>`],
        ["First error alarm", `<span class="num">${firstA ? "week " + (firstA - TW + 1) : "none"}</span>`], ["Price PSI > 0.25 from", `<span class="num">${firstP >= 0 ? "week " + (firstP + 1) : "never"}</span>`]]
        .map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { $("#stV").textContent = $("#st").value; $("#szV").textContent = Math.round(+$("#sz").value * 100) + "%"; $("#alV").textContent = fmt(+$("#al").value, 2); $("#wkV").textContent = $("#wk").value; }
    function draw() { labels(); d1(); d2(); d3(); work(); readouts(); }
    function full() { gen(); runAll(); draw(); }
    ["st", "sz"].forEach((id) => $("#" + id).addEventListener("input", full));
    $("#al").addEventListener("input", () => { runAll(); draw(); });
    $("#wk").addEventListener("input", draw);
    const seg = (id, f) => root.querySelectorAll(`#${id} button`).forEach((b) => b.addEventListener("click", () => { root.querySelectorAll(`#${id} button`).forEach((x) => x.setAttribute("aria-pressed", x === b)); f(b.dataset.v); }));
    seg("dr", (v) => { drift = v; full(); }); seg("po", (v) => { pol = v; draw(); });
    $("#resim").addEventListener("click", () => { seed++; full(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); drift = "both"; pol = "alarm"; root.querySelectorAll("#dr button").forEach((b, i) => b.setAttribute("aria-pressed", i === 3)); root.querySelectorAll("#po button").forEach((b, i) => b.setAttribute("aria-pressed", i === 2)); seed = 21; full(); });
    full();
    return watch([$("#m1"), $("#m2"), $("#m3")], () => { d1(); d2(); d3(); });
  },
});
