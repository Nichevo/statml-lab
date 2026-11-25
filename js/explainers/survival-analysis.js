Lab.register({
  id: "survival-analysis",
  group: "Statistical analysis",
  title: "Survival analysis: how long until it fails, when most haven't yet?",
  blurb: "Conveyor motors from two suppliers, many still running. See why averaging the failures you've seen gets lifetimes badly wrong, build a Kaplan–Meier curve by hand, compare suppliers with a log-rank test, and forecast spare parts with a Weibull model.",
  lede: "Survival analysis studies time until an event: a motor fails, a customer churns, a supplier is lost. The catch is censoring: when you analyse the data, many units haven't failed yet. You know they lasted at least this long, not how long. Ignoring them, or counting them as failures, gives lifetimes that are far too short. The Kaplan–Meier estimator uses every unit for as long as it was watched, and a Weibull model tells you whether failures come early, at random, or from wear-out.",
  quiz: [
    ["Of 100 motors installed over the past two years, 30 have failed, at an average of 9 months. Is 9 months a fair estimate of motor life?", "No. Only the motors that failed early enough to be seen are in that average; the 70 still running (some for two years) are left out. The true average life is much longer."],
    ["How does Kaplan–Meier handle a motor that's been running 14 months and hasn't failed?", "It counts in the 'at risk' group at every failure time up to 14 months, then drops out without counting as a failure. Each step multiplies survival by (1 − failures / at risk)."],
    ["Your Weibull shape parameter comes out at 2.5. What does that mean for maintenance?", "The failure rate rises with age (wear-out). Replacing motors before they reach the steep part of the hazard curve can be cheaper than waiting for breakdowns. With shape below 1 (infant failures), early burn-in testing helps instead."],
    ["What does the log-rank test compare?", "At each failure time it compares how many failures each group had with how many you'd expect if both had the same risk, given how many of each were still running. Summed up, a big gap means the survival curves really differ."],
    ["Why can't you forecast next year's spare parts from last year's failure count alone?", "If failures rise with age, an ageing installed base will fail more next year than last. A survival model with each unit's age forecasts that; a flat rate doesn't."],
  ],
  diy: {
    intro: "One row per motor: months observed in B (until failure or until today), failed (1) or still running (0) in C. Sort by B ascending.",
    steps: [
      ["At risk at each row: motors observed at least this long.", "D2: =COUNTIF($B$2:$B$201, \">=\"&B2)"],
      ["Kaplan–Meier step: multiply by (1 − failures / at risk) at each failure.", "E2: =IF(C2=1, E1*(1-1/D2), E1)   (E1 = 1)"],
      ["Median life: first time survival drops to 0.5 or below.", "=INDEX(B2:B201, MATCH(TRUE, E2:E201<=0.5, 0))"],
      ["Weibull fit for a shape k: scale = (Σ months^k / failures)^(1/k). Try k values and keep the one with the highest log-likelihood.", "λ: =(SUMPRODUCT(B2:B201^k)/SUM(C2:C201))^(1/k)\nLL: =SUMPRODUCT(C2:C201*(LN(k)-k*LN(λ)+(k-1)*LN(B2:B201))) - SUMPRODUCT((B2:B201/λ)^k)"],
      ["Chance a motor aged a fails in the next m months.", "=1 - EXP(-((a+m)/λ)^k + (a/λ)^k)"],
    ],
  },
  deeper: [
    ["Kaplan & Meier (1958), Nonparametric estimation from incomplete observations, Journal of the American Statistical Association 53(282)", "https://doi.org/10.1080/01621459.1958.10501452", "the product-limit estimator"],
    ["Cox (1972), Regression models and life-tables, Journal of the Royal Statistical Society B 34(2)", "https://doi.org/10.1111/j.2517-6161.1972.tb00899.x", "proportional hazards regression: survival with drivers"],
    ["Clark, Bradburn, Love & Altman (2003), Survival analysis part I: basic concepts and first analyses, British Journal of Cancer 89(2)", "https://doi.org/10.1038/sj.bjc.6601118", "a short, clear tutorial series"],
    ["NIST/SEMATECH e-Handbook: Reliability, assessing product reliability", "https://www.itl.nist.gov/div898/handbook/apr/apr.htm", "Weibull and other life distributions, with censored data"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8 H22 V16 H34 V24 H44 V30 H58 V40 H70 V46 H90"/><path d="M6 8 H28 V12 H44 V18 H60 V22 H76 V28 H90" stroke-opacity=".5"/><path d="M50 26 V34 M80 42 V50" stroke-width="1.5"/><path d="M6 58 H90" stroke-opacity=".5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, pchisqUpper } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const LA = 36, TMAX = 72;
    let seed = 8;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("Share of motors still running, by age")}</div><canvas id="c1" style="height:300px" aria-label="Kaplan–Meier survival curves for two suppliers"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "Failure rate by age (hazard)", 250, "Hazard curves, true and fitted Weibull"), fig("c3", "Spare motors needed over the next 12 months", 250, "Cumulative expected failures from the installed base"))}
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4("Kaplan–Meier by hand: supplier A, first 12 failures")}<div id="tbl"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Motors from two suppliers were installed at a steady rate over the study period. Today, some have failed; the rest are still running (censored).</p>
        <div class="ctrl"><label for="k">Failure pattern: Weibull shape k <output id="kV"></output></label><input type="range" id="k" min="0.6" max="4" step="0.1" value="2"></div>
        <div class="ctrl"><label for="hr">Supplier B's typical life vs A's <output id="hrV"></output></label><input type="range" id="hr" min="0.5" max="1.6" step="0.05" value="0.75"></div>
        <div class="ctrl"><label for="T">Study length (months of installations) <output id="TV"></output></label><input type="range" id="T" min="12" max="72" step="6" value="30"></div>
        <div class="ctrl"><label for="n">Motors per supplier <output id="nV"></output></label><input type="range" id="n" min="30" max="400" step="10" value="120"></div>
        <label style="display:flex;gap:8px;align-items:center;font-size:.9rem"><input type="checkbox" id="naive" checked> Show the naive curve (still-running motors dropped)</label>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New data</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Censoring, and the wrong fixes</h2>
          <ul>
            <li><b>Average the failures only</b>: leaves out every long-lived motor still running. Badly too short.</li>
            <li><b>Drop the still-running motors</b> and draw a curve from failures alone: the same bias, as a curve (the dotted line).</li>
            <li><b>Count still-running motors as failed today</b>: treats "at least 20 months" as "exactly 20 months". Also too short.</li>
          </ul>
          <p>Kaplan–Meier fixes this: at each failure time, survival is multiplied by (1 − failures / motors still being watched). A censored motor helps every step up to its age, then leaves quietly. The assumption: being censored has nothing to do with being about to fail.</p>
        </section>
        <section>
          <h2>Weibull shape and the hazard</h2>
          <p>The hazard is the failure rate among units still running at a given age. Weibull's shape k says how it changes: k &lt; 1, falling (early defects; burn-in helps); k = 1, flat (random failures; age doesn't matter, the exponential case); k &gt; 1, rising (wear-out; preventive replacement can pay). Fit it by maximum likelihood, which handles censoring naturally: failures contribute their density, running units their survival probability.</p>
          <p>The same tools handle customer churn (time until a customer leaves), supplier lifetimes, and time until a promotion's effect wears off. Cox regression adds drivers, like a <a href="#logistic-regression">logistic regression</a> for timing. Compare groups like any other <a href="#hypothesis-test">hypothesis test</a>, here with the log-rank test.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Compare the readouts: the naive average of observed failures is far below the Kaplan–Meier median and the true median.</li>
            <li>Shorten the study to 12 months: few motors have failed, the curves stop early, and the naive estimates get even worse. Kaplan–Meier still tracks the true curve as far as the data go.</li>
            <li>Set k to 1 (random failures): the hazard is flat, and the Weibull and constant-rate spare-part forecasts agree. At k = 3 (wear-out), the constant rate badly under-forecasts as the installed base ages; the fitted Weibull is closer, though with few failures it can overshoot.</li>
            <li>Press New data a few times at the defaults: B's motors really do fail sooner, but with 120 motors each and only 30 months of data, the log-rank test misses it (p above 0.05) in roughly a third of samples. Raise to 300 motors each and it's caught almost every time. Few failures means little evidence.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ k: +$("#k").value, hr: +$("#hr").value, T: +$("#T").value, n: +$("#n").value, naive: $("#naive").checked });
    const wS = (t, k, l) => Math.exp(-Math.pow(t / l, k)), wH = (t, k, l) => (k / l) * Math.pow(Math.max(t, 1e-6) / l, k - 1);
    let G;
    function sim(p) {
      const r = rng(seed), mk = (lam) => Array.from({ length: p.n }, () => { const age = r() * p.T, f = lam * Math.pow(-Math.log(1 - r()), 1 / p.k); return f <= age ? { t: f, e: 1, age } : { t: age, e: 0, age }; });
      G = { A: mk(LA), B: mk(LA * p.hr) };
    }
    function km(D) {
      const s = [...D].sort((a, b) => a.t - b.t || b.e - a.e), out = [{ t: 0, S: 1, lo: 1, hi: 1 }], rows = []; let S = 1, gw = 0, i = 0;
      while (i < s.length) { const t = s[i].t; let d = 0, c = 0; const atRisk = s.length - i; while (i < s.length && s[i].t === t) { if (s[i].e) d++; else c++; i++; }
        if (d) { S *= 1 - d / atRisk; if (atRisk > d) gw += d / (atRisk * (atRisk - d)); const se = S * Math.sqrt(gw); out.push({ t, S, lo: Math.max(0, S - 1.96 * se), hi: Math.min(1, S + 1.96 * se) }); rows.push({ t, atRisk, d, c, S }); } else rows.push({ t, atRisk, d, c, S }); }
      const med = out.find((o) => o.S <= 0.5);
      return { out, rows, med: med ? med.t : null, censT: s.filter((x) => !x.e).map((x) => x.t) };
    }
    function weib(D) {
      const d = D.filter((x) => x.e).length; if (!d) return { k: 1, l: Infinity, ll: 0 }; let best = null;
      for (let k = 0.3; k <= 6; k += 0.02) { const l = Math.pow(D.reduce((s, x) => s + Math.pow(x.t, k), 0) / d, 1 / k), ll = D.reduce((s, x) => s + (x.e ? Math.log(k) - k * Math.log(l) + (k - 1) * Math.log(Math.max(x.t, 1e-6)) : 0) - Math.pow(x.t / l, k), 0); if (!best || ll > best.ll) best = { k, l, ll }; }
      return best;
    }
    function logrank(A, B) {
      const all = [...A.map((x) => ({ ...x, g: 0 })), ...B.map((x) => ({ ...x, g: 1 }))].sort((a, b) => a.t - b.t); let nA = A.length, nB = B.length, O = 0, E = 0, V = 0, i = 0;
      while (i < all.length) { const t = all[i].t; let dA = 0, dB = 0, rA = 0, rB = 0; while (i < all.length && all[i].t === t) { const x = all[i]; if (x.e) { if (x.g) dB++; else dA++; } if (x.g) rB++; else rA++; i++; }
        const d = dA + dB, n = nA + nB; if (d && n > 1) { O += dA; E += (d * nA) / n; V += (d * (nA / n) * (nB / n) * (n - d)) / (n - 1); } nA -= rA; nB -= rB; }
      const chi = V ? (O - E) ** 2 / V : 0; return { O, E, chi, p: pchisqUpper(chi, 1) };
    }
    function naiveKM(D) { return km(D.filter((x) => x.e)); }
    let KA, KB, WA, WB, LR;
    const C1 = new Plot($("#c1"), { pad: { l: 56, b: 38 } }), C2 = new Plot($("#c2"), { pad: { l: 56, b: 38 } }), C3 = new Plot($("#c3"), { pad: { l: 56, b: 38 } });
    const sw = (c, t, k) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">${k === "box" ? `<span style="width:12px;height:10px;background:var(${c});opacity:.3"></span>` : `<span style="width:20px;border-top:2px ${k} var(${c})"></span>`}${t}</span>`;
    function stepPath(P_, o, col, w, dash) { const xs = [], ys = []; o.forEach((q, i) => { if (i) { xs.push(q.t); ys.push(o[i - 1].S); } xs.push(q.t); ys.push(q.S); }); P_.path(xs, ys, col, w, dash); return [xs, ys]; }
    function d1(p) {
      C1.resize(); C1.x = [0, TMAX]; C1.y = [0, 1.02]; C1.clear(); C1.axes({ xLabel: "months in service", yLabel: "still running", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v * 100, 0) + "%" });
      const g = C1.ctx, ts = Array.from({ length: 145 }, (_, i) => i / 2);
      g.fillStyle = css("--line"); g.globalAlpha = 0.4; g.fillRect(C1.sx(p.T), C1.pad.t, C1.sx(TMAX) - C1.sx(p.T), C1.ih); g.globalAlpha = 1;
      // CI band for A
      g.beginPath(); KA.out.forEach((q, i) => { if (i) g.lineTo(C1.sx(q.t), C1.sy(KA.out[i - 1].hi)); (i ? g.lineTo : g.moveTo).call(g, C1.sx(q.t), C1.sy(q.hi)); }); for (let i = KA.out.length - 1; i >= 0; i--) { g.lineTo(C1.sx(KA.out[i].t), C1.sy(KA.out[i].lo)); if (i) g.lineTo(C1.sx(KA.out[i].t), C1.sy(KA.out[i - 1].lo)); } g.closePath(); g.fillStyle = css("--accent"); g.globalAlpha = 0.12; g.fill(); g.globalAlpha = 1;
      C1.path(ts, ts.map((t) => wS(t, p.k, LA)), css("--accent"), 1.2, [5, 4]); C1.path(ts, ts.map((t) => wS(t, p.k, LA * p.hr)), css("--warm"), 1.2, [5, 4]);
      const extend = (K, D) => { const lastT = Math.max(...D.map((x) => x.t)); return [...K.out, { t: lastT, S: K.out[K.out.length - 1].S }]; };
      stepPath(C1, extend(KA, G.A), css("--accent"), 2.2); stepPath(C1, extend(KB, G.B), css("--warm"), 2.2);
      if (p.naive) stepPath(C1, naiveKM(G.A).out, css("--bad"), 1.6, [2, 3]);
      [[KA, "--accent", G.A], [KB, "--warm", G.B]].forEach(([K, c, D]) => K.censT.forEach((t) => { const o = [...K.out].reverse().find((q) => q.t <= t); const y = C1.sy(o ? o.S : 1); g.strokeStyle = css(c); g.lineWidth = 1; g.beginPath(); g.moveTo(C1.sx(t), y - 3); g.lineTo(C1.sx(t), y + 3); g.stroke(); }));
      g.fillStyle = css("--muted"); g.font = `11px ${css("--font-body")}`; g.textAlign = "left"; g.textBaseline = "top"; g.fillText("no motor watched this long", C1.sx(p.T) + 6, C1.pad.t + 4);
      $("#c1Cap").innerHTML = `${sw("--accent", "supplier A (Kaplan–Meier, 95% band)", "solid")}${sw("--warm", "supplier B", "solid")}${sw("--muted", "true curves", "dashed")}${p.naive ? sw("--bad", "naive: failures only", "dotted") : ""}<br>Tick marks: motors still running at that age (censored). ${G.A.filter((x) => x.e).length} of ${p.n} A motors and ${G.B.filter((x) => x.e).length} of ${p.n} B motors have failed so far.`;
    }
    function d2(p) {
      const ts = Array.from({ length: 144 }, (_, i) => 0.5 + i * 0.5).filter((t) => t <= TMAX), hs = ts.map((t) => wH(t, p.k, LA)).concat(ts.map((t) => wH(t, p.k, LA * p.hr)));
      const top = Math.min(0.3, Math.max(...hs.filter((v) => isFinite(v)).slice(4)) * 1.15);
      C2.resize(); C2.x = [0, TMAX]; C2.y = [0, top]; C2.clear(); C2.axes({ xLabel: "months in service", yLabel: "failures per month per running motor", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v * 100, 1) + "%" });
      C2.clip(() => { C2.path(ts, ts.map((t) => wH(t, p.k, LA)), css("--accent"), 1.2, [5, 4]); C2.path(ts, ts.map((t) => wH(t, p.k, LA * p.hr)), css("--warm"), 1.2, [5, 4]); C2.path(ts, ts.map((t) => wH(t, WA.k, WA.l)), css("--accent"), 2.2); C2.path(ts, ts.map((t) => wH(t, WB.k, WB.l)), css("--warm"), 2.2); });
      const kind = (k) => (k < 0.9 ? "falling: early failures" : k <= 1.15 ? "about flat: random failures" : "rising: wear-out");
      $("#c2Cap").innerHTML = `${sw("--ink", "Weibull fitted to the data", "solid")}${sw("--muted", "true", "dashed")}<br>Fitted shape for A: k = ${fmt(WA.k, 2)} (true ${p.k}), so the failure rate is ${kind(WA.k)}. Fitted scale ${fmt(WA.l, 1)} months (true ${LA}).`;
    }
    function spares(D, W, flat) {
      const run = D.filter((x) => !x.e), out = []; let lamE = null;
      if (flat) { const d = D.filter((x) => x.e).length, exp = D.reduce((s, x) => s + x.t, 0); lamE = d / exp; }
      for (let m = 1; m <= 12; m++) out.push(run.reduce((s, x) => s + (flat ? 1 - Math.exp(-lamE * m) : 1 - wS(x.t + m, W.k, W.l) / wS(x.t, W.k, W.l)), 0));
      return out;
    }
    function d3(p) {
      const ms = Array.from({ length: 12 }, (_, i) => i + 1), sW = spares(G.A, WA), sF = spares(G.A, WA, true), sT = spares(G.A, { k: p.k, l: LA }), top = Math.max(...sW, ...sF, ...sT) * 1.12;
      C3.resize(); C3.x = [0, 12.5]; C3.y = [0, top]; C3.clear(); C3.axes({ xLabel: "months from today", yLabel: "cumulative failures (supplier A)", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      C3.path([0, ...ms], [0, ...sT], css("--muted"), 1.2, [5, 4]); C3.path([0, ...ms], [0, ...sF], css("--violet"), 2); C3.path([0, ...ms], [0, ...sW], css("--accent"), 2.2);
      const run = G.A.filter((x) => !x.e).length;
      $("#c3Cap").innerHTML = `${sw("--accent", "Weibull, using each motor's age", "solid")}${sw("--violet", "constant failure rate", "solid")}${sw("--muted", "true", "dashed")}<br>${run} A motors still running. Over 12 months: Weibull says ${fmt(sW[11], 1)} failures, a constant rate says ${fmt(sF[11], 1)} (true expectation ${fmt(sT[11], 1)}).`;
    }
    function tbl() {
      const rows = []; let cens = 0;
      for (const r of KA.rows) { if (r.d) { rows.push({ ...r, cBefore: cens }); cens = r.c; if (rows.length >= 12) break; } else cens += r.c; }
      let prev = 1;
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);width:100%;min-width:560px"><thead><tr style="color:var(--muted);text-align:right">${["failure at month", "still-running motors dropped since last failure", "at risk", "failed", "step", "survival S(t)"].map((h, i) => `<th style="padding:3px 6px;${i ? "" : "text-align:left"}">${h}</th>`).join("")}</tr></thead><tbody>` +
        rows.map((r) => { const line = `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 6px;text-align:left">${fmt(r.t, 1)}</td><td style="padding:3px 6px;color:var(--muted)">${r.cBefore}</td><td style="padding:3px 6px">${r.atRisk}</td><td style="padding:3px 6px">${r.d}</td><td style="padding:3px 6px">${fmt(prev, 3)} × (1 − ${r.d}/${r.atRisk})</td><td style="padding:3px 6px;font-weight:600">${fmt(r.S, 3)}</td></tr>`; prev = r.S; return line; }).join("") +
        `</tbody></table><p class="hint" style="margin:8px 0 0">Each failure multiplies survival by the share of at-risk motors that didn't fail. Motors still running leave the at-risk count at their current age without changing S: that's how censored data are used, not ignored.</p>`;
    }
    function readouts(p) {
      const fails = G.A.filter((x) => x.e), naiveMean = fails.reduce((s, x) => s + x.t, 0) / Math.max(1, fails.length), trueMed = LA * Math.pow(Math.log(2), 1 / p.k);
      $("#ro").innerHTML = [["A: naive average of failures seen", `${fmt(naiveMean, 1)} months`], ["A: median life, Kaplan–Meier / true", `${KA.med ? fmt(KA.med, 1) : `> ${fmt(Math.max(...G.A.map((x) => x.t)), 0)}`} / ${fmt(trueMed, 1)} months`], ["B: median life, Kaplan–Meier", KB.med ? `${fmt(KB.med, 1)} months` : "not reached yet"], ["Log-rank test A vs B", `χ² = ${fmt(LR.chi, 1)}, <span class="pill ${LR.p < 0.05 ? "ok" : "warn"}">p = ${LR.p < 0.001 ? "<0.001" : fmt(LR.p, 3)}</span>`]].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function labels(p) { $("#kV").textContent = fmt(p.k, 1) + (p.k < 0.95 ? " (early failures)" : p.k <= 1.05 ? " (random)" : " (wear-out)"); $("#hrV").textContent = fmt(p.hr, 2) + "×"; $("#TV").textContent = p.T; $("#nV").textContent = p.n; }
    function fit() { KA = km(G.A); KB = km(G.B); WA = weib(G.A); WB = weib(G.B); LR = logrank(G.A, G.B); }
    function draw() { const p = P(); labels(p); d1(p); d2(p); d3(p); tbl(); readouts(p); }
    ["k", "hr", "T", "n"].forEach((id) => $("#" + id).addEventListener("input", () => { sim(P()); fit(); draw(); }));
    $("#naive").addEventListener("change", draw);
    $("#resim").addEventListener("click", () => { seed++; sim(P()); fit(); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); $("#naive").checked = true; seed = 8; sim(P()); fit(); draw(); });
    sim(P()); fit(); draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
