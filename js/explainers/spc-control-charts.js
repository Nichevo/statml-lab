Lab.register({
  id: "spc-control-charts",
  group: "Statistical analysis",
  title: "SPC control charts: is the process still in control?",
  blurb: "Track a warehouse's order cycle time or late-shipment rate on Shewhart control charts (X̄ and R, individuals, p-chart). Set the limits from a calm period, slip in a shift, and see which rules catch it, how fast, and how often they cry wolf.",
  lede: "Every process varies. Statistical process control separates the everyday wobble (common causes) from something that has changed (a special cause): a new picker, a broken conveyor, a carrier running late. A control chart plots a measure over time with limits at about three standard deviations from the centre, worked out from a period when the process was stable. A point outside, or a suspicious pattern inside, is a signal to go and look.",
  quiz: [
    ["Are control limits the same as targets or specification limits?", "No. Control limits come from the process's own past variation: they say what it does, not what customers want. A process can be perfectly in control and still miss its target every day."],
    ["Why ±3 standard deviations?", "It balances false alarms against missed changes. For a stable normal process only about 0.27% of points fall outside, roughly one false alarm in 370 points, while a large shift is caught quickly."],
    ["Why average several orders a day (X̄ chart) instead of plotting each one?", "An average of n orders varies √n times less, so the same shift stands out more. With 5 per day, a 1σ shift is caught in about 4–5 days on average instead of about 44 points one at a time."],
    ["What do the run rules add?", "Patterns that are unlikely by chance even inside the limits: 2 of 3 points beyond 2σ, 4 of 5 beyond 1σ, 8 in a row on one side. They catch small shifts sooner, at the cost of more false alarms."],
    ["Why use the range (R) chart too?", "The X̄ chart watches the average; the R chart watches the spread. A process can keep its average and become far more erratic, and that matters just as much for planning buffers."],
  ],
  diy: {
    intro: "One row per day, 5 cycle times per day in B:F. Days 1–20 are the calm period used to set the limits.",
    steps: [
      ["Daily average and range.", "G2: =AVERAGE(B2:F2)   H2: =MAX(B2:F2)-MIN(B2:F2)"],
      ["Centre lines from the calm period.", "Xbarbar: =AVERAGE(G2:G21)   Rbar: =AVERAGE(H2:H21)"],
      ["X̄ chart limits (A2 = 0.577 for n = 5).", "UCL: =Xbarbar + 0.577*Rbar   LCL: =Xbarbar - 0.577*Rbar"],
      ["R chart limits (D3 = 0, D4 = 2.114 for n = 5).", "UCL: =2.114*Rbar   LCL: =0*Rbar"],
      ["Rule 1 flag.", "=IF(OR(G2>UCL, G2<LCL), \"signal\", \"\")"],
      ["Rule 4: 8 in a row on one side.", "=IF(OR(COUNTIF(G2:G9,\">\"&Xbarbar)=8, COUNTIF(G2:G9,\"<\"&Xbarbar)=8), \"run\", \"\")"],
      ["p-chart limits for daily share late with n shipments.", "=pbar ± 3*SQRT(pbar*(1-pbar)/n)"],
    ],
  },
  deeper: [
    ["NIST/SEMATECH e-Handbook of Statistical Methods: control charts", "https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc3.htm", "free reference with the constants and formulas"],
    ["Nelson (1984), The Shewhart control chart: tests for special causes, Journal of Quality Technology 16(4)", "https://doi.org/10.1080/00224065.1984.11978921", "the eight run rules"],
    ["Roberts (1959), Control chart tests based on geometric moving averages, Technometrics 1(3)", "https://doi.org/10.1080/00401706.1959.10489860", "the EWMA chart, better for small shifts"],
    ["Woodall (2000), Controversies and contradictions in statistical process control, Journal of Quality Technology 32(4)", "https://doi.org/10.1080/00224065.2000.11980013", "phase I vs phase II and other debates"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12 H90 M6 52 H90" stroke-dasharray="5 4" stroke-opacity=".6"/><path d="M6 32 H90" stroke-opacity=".4"/><path d="M8 34 L18 28 L28 36 L38 30 L48 33 L58 26 L68 30 L78 22 L86 8"/><circle cx="86" cy="8" r="3.5" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const D = 60, MU = 24, SD = 4, P0 = 0.04, NP = 200;
    const K = { d2: [0, 0, 1.128, 1.693, 2.059, 2.326, 2.534, 2.704, 2.847, 2.970, 3.078], A2: [0, 0, 1.880, 1.023, 0.729, 0.577, 0.483, 0.419, 0.373, 0.337, 0.308], D3: [0, 0, 0, 0, 0, 0, 0, 0.076, 0.136, 0.184, 0.223], D4: [0, 0, 3.267, 2.574, 2.282, 2.114, 2.004, 1.924, 1.864, 1.816, 1.777] };
    let type = "xbar", kind = "step", seed = 5;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4('<span id="t1">Daily average cycle time (X̄ chart)</span>')}</div><canvas id="c1" style="height:280px" aria-label="Control chart of the daily measure with centre line and control limits"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "Spread: daily range (R chart)", 240, "Chart of the spread of each day's measurements"), fig("c3", "How fast a shift is caught", 240, "Average run length against shift size for individual points and daily averages"))}`,
      panel: `
        <p class="hint" style="margin:0">A warehouse measures order cycle time (order in to truck out, hours). Normally 24 h ± 4 h. The limits are set from the first days, then a change creeps in.</p>
        <div class="ctrl"><label>Chart</label><div class="seg" id="ty"><button type="button" data-t="xbar" aria-pressed="true">X̄ and R</button><button type="button" data-t="imr" aria-pressed="false">Individuals</button><button type="button" data-t="p" aria-pressed="false">p (share late)</button></div></div>
        <div class="ctrl"><label for="n">Orders sampled per day (X̄) <output id="nV"></output></label><input type="range" id="n" min="2" max="10" step="1" value="5"></div>
        <div class="ctrl"><label>The change</label><div class="seg" id="kd"><button type="button" data-k="step" aria-pressed="true">Step</button><button type="button" data-k="drift" aria-pressed="false">Slow drift</button><button type="button" data-k="spread" aria-pressed="false">More erratic</button></div></div>
        <div class="ctrl"><label for="dl">Size of the change <output id="dlV"></output></label><input type="range" id="dl" min="0" max="3" step="0.1" value="1"></div>
        <div class="ctrl"><label for="t0">Change starts on day <output id="t0V"></output></label><input type="range" id="t0" min="21" max="55" step="1" value="35"></div>
        <label style="display:flex;gap:8px;align-items:center;font-size:.9rem"><input type="checkbox" id="rules" checked> Use run rules 2–4 as well as rule 1</label>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New data</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Setting the limits</h2>
          <p>Use a period when nothing unusual happened (here days 1–20, shaded): this is “phase I”. Estimate the centre and the typical variation, then draw limits three standard deviations either side. From then on (“phase II”), plot each new day and react to signals.</p>
          <div class="eq">X̄ chart: X̿ ± A₂ R̄ &nbsp;&nbsp; R chart: D₃ R̄ to D₄ R̄ &nbsp;&nbsp; p chart: p̄ ± 3√(p̄(1 − p̄)/n)</div>
          <p>A₂, D₃ and D₄ are standard constants for the subgroup size (for n = 5: 0.577, 0 and 2.114). They turn the average range into a standard deviation without anyone computing one.</p>
        </section>
        <section>
          <h2>The rules (Western Electric)</h2>
          <ol>
            <li>One point beyond 3σ.</li>
            <li>2 of 3 points in a row beyond 2σ, same side.</li>
            <li>4 of 5 in a row beyond 1σ, same side.</li>
            <li>8 in a row on the same side of the centre line.</li>
          </ol>
          <p>Each pattern is rare when nothing has changed. Adding rules 2–4 catches small and slow changes much sooner, but in a stable process they raise false alarms about fourfold: one every 92 or so points instead of every 370.</p>
        </section>
        <section>
          <h2>Average run length</h2>
          <p>The ARL is how many points it takes on average to get a signal. With no change you want it long (370 for rule 1 alone); after a change you want it short. The chart shows rule 1 for single points and for daily averages: averaging n orders makes a shift of δσ look like δ√n σ. For small shifts, <a href="#change-points">CUSUM</a> and EWMA charts do better still.</p>
        </section>
        <section>
          <h2>In a supply chain</h2>
          <p>Cycle times, pick accuracy, late-shipment share, forecast error, supplier defect rates and inbound lead times all suit control charts. The main mistake is reacting to every wobble inside the limits (“tampering”), which makes a process worse. The second is not reacting to signals.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Set the change to 0: any red points are false alarms. Toggle the run rules and press “New data” a few times.</li>
            <li>Switch to Individuals with a 1σ step: rule 1 alone often misses it for weeks; the run rules catch it.</li>
            <li>Choose “More erratic”: the X̄ chart barely notices, but the R chart does.</li>
          </ul>
        </section>`,
    });
    const Phi = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
    const P = () => ({ n: +$("#n").value, dl: +$("#dl").value, t0: +$("#t0").value, rules: $("#rules").checked });
    let raw = [];
    function sim() {
      const r = rng(seed); raw = Array.from({ length: D }, () => ({ z: Array.from({ length: 10 }, () => r.normal()), u: Array.from({ length: NP }, () => r()) }));
    }
    function series(p) {
      const shift = (d) => (d + 1 < p.t0 ? 0 : kind === "drift" ? p.dl * Math.min(1, (d + 2 - p.t0) / 15) : kind === "step" ? p.dl : 0), sdm = (d) => (kind === "spread" && d + 1 >= p.t0 ? 1 + p.dl / 1.5 : 1);
      if (type === "p") {
        const sp = Math.sqrt((P0 * (1 - P0)) / NP);
        return raw.map((o, d) => { const pr = Math.min(0.9, P0 + shift(d) * sp * sdm(d)); return { v: o.u.filter((u) => u < pr).length / NP }; });
      }
      const n = type === "xbar" ? p.n : 1;
      return raw.map((o, d) => { const xs = o.z.slice(0, type === "xbar" ? n : 1).map((z) => MU + SD * (shift(d) + z * sdm(d))); return { xs, v: xs.reduce((a, b) => a + b, 0) / xs.length, r: Math.max(...xs) - Math.min(...xs) }; });
    }
    const PH = 20;
    function limits(S, p) {
      const ph = S.slice(0, PH);
      if (type === "p") { const pb = ph.reduce((a, s) => a + s.v, 0) / PH, s = Math.sqrt((pb * (1 - pb)) / NP); return { cl: pb, sg: s, ucl: pb + 3 * s, lcl: Math.max(0, pb - 3 * s) }; }
      if (type === "xbar") { const xb = ph.reduce((a, s) => a + s.v, 0) / PH, rb = ph.reduce((a, s) => a + s.r, 0) / PH, n = p.n, s = (K.A2[n] * rb) / 3; return { cl: xb, sg: s, ucl: xb + 3 * s, lcl: xb - 3 * s, rb, rucl: K.D4[n] * rb, rlcl: K.D3[n] * rb }; }
      const xb = ph.reduce((a, s) => a + s.v, 0) / PH; let mr = 0; for (let i = 1; i < PH; i++) mr += Math.abs(ph[i].v - ph[i - 1].v); mr /= PH - 1; const s = mr / 1.128;
      S.forEach((o, i) => (o.r = i ? Math.abs(o.v - S[i - 1].v) : NaN));
      return { cl: xb, sg: s, ucl: xb + 3 * s, lcl: xb - 3 * s, rb: mr, rucl: 3.267 * mr, rlcl: 0 };
    }
    function signals(S, L, rules) {
      const z = S.map((s) => (s.v - L.cl) / L.sg), why = S.map(() => "");
      z.forEach((v, i) => {
        if (Math.abs(v) > 3) { why[i] = "1"; return; }
        if (!rules) return;
        for (const sgn of [1, -1]) {
          if (i >= 2 && [0, 1, 2].filter((k) => sgn * z[i - k] > 2).length >= 2 && sgn * v > 2) { why[i] = "2"; return; }
          if (i >= 4 && [0, 1, 2, 3, 4].filter((k) => sgn * z[i - k] > 1).length >= 4 && sgn * v > 1) { why[i] = "3"; return; }
          if (i >= 7 && [0, 1, 2, 3, 4, 5, 6, 7].every((k) => sgn * z[i - k] > 0)) { why[i] = "4"; return; }
        }
      });
      return why;
    }
    const C1 = new Plot($("#c1"), { x: [0.5, D + 0.5], pad: { l: 56, b: 38, r: 46 } }), C2 = new Plot($("#c2"), { x: [0.5, D + 0.5], pad: { l: 50, b: 38, r: 40 } }), C3 = new Plot($("#c3"), { x: [0, 3], pad: { l: 50, b: 38 } });
    const vf = (v) => (type === "p" ? fmt(v * 100, 1) + "%" : fmt(v, 1));
    function shade(Pl, p) { const g = Pl.ctx; g.fillStyle = css("--accent"); g.globalAlpha = 0.07; g.fillRect(Pl.sx(0.5), Pl.pad.t, Pl.sx(PH + 0.5) - Pl.sx(0.5), Pl.ih); g.globalAlpha = 1; Pl.path([p.t0 - 0.5, p.t0 - 0.5], Pl.y, css("--warm"), 1.5, [4, 3]); }
    function hline(Pl, y, col, dash, lab) { Pl.path([0.5, D + 0.5], [y, y], css(col), 1.5, dash); if (lab) { const g = Pl.ctx; g.fillStyle = css(col); g.font = `10px ${css("--font-mono")}`; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(lab, Pl.w - Pl.pad.r + 4, Pl.sy(y)); } }
    function d1(S, L, why, p) {
      const vs = S.map((s) => s.v), lo = Math.min(L.lcl, ...vs), hi = Math.max(L.ucl, ...vs), pd = (hi - lo) * 0.08;
      C1.resize(); C1.y = [lo - pd, hi + pd]; C1.clear(); C1.axes({ xLabel: "day", yLabel: type === "p" ? "share of shipments late" : "hours", xTicks: [1, 10, 20, 30, 40, 50, 60], xFormat: (v) => fmt(v, 0), yFormat: vf });
      shade(C1, p);
      [2, 1, -1, -2].forEach((k) => hline(C1, L.cl + k * L.sg, "--grid", [2, 3]));
      hline(C1, L.ucl, "--bad", [6, 4], "UCL"); hline(C1, L.lcl, "--bad", [6, 4], "LCL"); hline(C1, L.cl, "--ink", null, "CL");
      C1.path(S.map((_, i) => i + 1), vs, css("--accent"), 1.5);
      const g = C1.ctx; S.forEach((s, i) => { const w = why[i]; C1.dot(i + 1, s.v, w ? 5 : 3, css(w ? "--bad" : "--accent"), w ? css("--surface") : null); if (w && w !== "1") { g.fillStyle = css("--bad"); g.font = `600 9px ${css("--font-mono")}`; g.textAlign = "center"; g.textBaseline = "bottom"; g.fillText(w, C1.sx(i + 1), C1.sy(s.v) - 6); } });
      const first = why.findIndex((w, i) => w && i + 1 >= p.t0), fa = why.filter((w, i) => w && i + 1 < p.t0).length;
      const lim = type === "xbar" ? `X̿ = ${fmt(L.cl, 2)}, R̄ = ${fmt(L.rb, 2)}, limits ${fmt(L.cl, 2)} ± ${K.A2[p.n]} × ${fmt(L.rb, 2)} = ${fmt(L.lcl, 2)} to ${fmt(L.ucl, 2)}` : type === "imr" ? `X̄ = ${fmt(L.cl, 2)}, average moving range ${fmt(L.rb, 2)}, σ ≈ ${fmt(L.rb, 2)} / 1.128 = ${fmt(L.sg, 2)}, limits ${fmt(L.lcl, 2)} to ${fmt(L.ucl, 2)}` : `p̄ = ${fmt(L.cl * 100, 2)}%, limits ${fmt(L.cl * 100, 2)}% ± 3√(p̄(1 − p̄)/${NP}) = ${fmt(L.lcl * 100, 2)}% to ${fmt(L.ucl * 100, 2)}%`;
      $("#c1Cap").innerHTML = `Shaded: days 1–20, used to set the limits (${lim}). Orange dashed: the change starts. Red points: signals (small numbers: which run rule). ${p.dl > 0 ? (first >= 0 ? `First signal after the change: <b>day ${first + 1}</b>, ${first + 1 - p.t0 ? `${first + 1 - p.t0} day${first + 1 - p.t0 === 1 ? "" : "s"} after it began` : "the day it began"}.` : "<b>The change was not caught</b> by day 60.") : ""} False alarms before the change: ${fa}.`;
      return { first, fa };
    }
    function d2(S, L, p) {
      const g = C2.ctx;
      if (type === "p") { C2.resize(); C2.clear(); g.fillStyle = css("--muted"); g.font = `13px ${css("--font-body")}`; g.textAlign = "center"; g.fillText("A p-chart has no separate spread chart:", C2.w / 2, C2.h / 2 - 10); g.fillText("for a share, the spread follows from p itself.", C2.w / 2, C2.h / 2 + 10); $("#c2Cap").textContent = ""; return; }
      const rs = S.map((s) => s.r), hi = Math.max(L.rucl, ...rs.filter(isFinite)) * 1.1;
      C2.resize(); C2.y = [0, hi]; C2.clear(); C2.axes({ xLabel: "day", yLabel: type === "xbar" ? "range, hours" : "moving range", xTicks: [1, 20, 40, 60], xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      shade(C2, p); hline(C2, L.rucl, "--bad", [6, 4], "UCL"); hline(C2, L.rb, "--ink", null, "CL"); if (L.rlcl > 0) hline(C2, L.rlcl, "--bad", [6, 4], "LCL");
      C2.path(rs.map((_, i) => i + 1), rs, css("--violet"), 1.5);
      let out = 0; rs.forEach((v, i) => { if (!isFinite(v)) return; const o = v > L.rucl || v < L.rlcl; if (o && i + 1 >= p.t0) out++; C2.dot(i + 1, v, o ? 5 : 2.5, css(o ? "--bad" : "--violet"), null); });
      $("#c2Cap").innerHTML = `${type === "xbar" ? `Each day's range (largest − smallest of ${p.n}). Limits ${fmt(L.rlcl, 1)} to ${K.D4[p.n]} × ${fmt(L.rb, 2)} = ${fmt(L.rucl, 1)}.` : "Moving range: the change from the day before. Upper limit 3.267 × average."} Points above the limit after the change: ${out}.`;
    }
    function d3(p) {
      const xs = [], a1 = [], an = []; for (let d = 0; d <= 3.0001; d += 0.05) { xs.push(d); const arl = (s) => 1 / (Phi(-3 - s) + 1 - Phi(3 - s)); a1.push(arl(d)); an.push(arl(d * Math.sqrt(p.n))); }
      C3.resize(); C3.y = [0, Math.log10(400)]; C3.clear(); C3.axes({ xLabel: "size of a step change (in σ of one order)", yLabel: "points until a signal", yTicks: [0, 1, 2, Math.log10(370)], yFormat: (v) => fmt(Math.pow(10, v), 0), xFormat: (v) => fmt(v, 1) + "σ" });
      C3.path(xs, a1.map(Math.log10), css("--muted"), 2); C3.path(xs, an.map(Math.log10), css("--accent"), 2.5);
      if (type !== "p") C3.path([p.dl, p.dl], C3.y, css("--warm"), 1, [3, 3]);
      const at = (d, n) => 1 / (Phi(-3 - d * Math.sqrt(n)) + 1 - Phi(3 - d * Math.sqrt(n)));
      $("#c3Cap").innerHTML = `Rule 1 only. Grey: plotting single orders. Blue: daily averages of ${p.n}. For a ${fmt(p.dl, 1)}σ step: about ${fmt(at(p.dl, 1), 0)} single points vs ${fmt(at(p.dl, p.n), 1)} days of averages. With no change, both wait 370 points between false alarms.`;
    }
    function readouts(L, r, p) {
      $("#ro").innerHTML = [["Centre line", `<span class="num">${vf(L.cl)}</span>`], ["Control limits", `<span class="num">${vf(L.lcl)} to ${vf(L.ucl)}</span>`], ["Days to first signal after the change", p.dl > 0 ? `<span class="pill ${r.first < 0 ? "bad" : r.first + 1 - p.t0 > 5 ? "warn" : "ok"}">${r.first < 0 ? "missed" : r.first + 1 - p.t0}</span>` : `<span class="num">no change</span>`], ["False alarms before it", `<span class="pill ${r.fa ? "warn" : "ok"}">${r.fa}</span>`]].map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels(p) { $("#nV").textContent = p.n; $("#dlV").textContent = fmt(p.dl, 1) + "σ"; $("#t0V").textContent = p.t0; $("#t1").textContent = type === "xbar" ? "Daily average cycle time (X̄ chart)" : type === "imr" ? "One order a day (individuals chart)" : "Share of 200 daily shipments late (p chart)"; $("#n").disabled = type !== "xbar"; }
    function draw() { const p = P(); labels(p); const S = series(p), L = limits(S, p), why = signals(S, L, p.rules), r = d1(S, L, why, p); d2(S, L, p); d3(p); readouts(L, r, p); }
    const seg = (id, set) => root.querySelectorAll(`#${id} button`).forEach((b) => b.addEventListener("click", () => { set(b); root.querySelectorAll(`#${id} button`).forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); }));
    seg("ty", (b) => (type = b.dataset.t)); seg("kd", (b) => (kind = b.dataset.k));
    root.querySelectorAll("input").forEach((e) => e.addEventListener("input", draw));
    $("#resim").addEventListener("click", () => { seed++; sim(); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); $("#rules").checked = true; type = "xbar"; kind = "step"; seed = 5; root.querySelectorAll("#ty button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.t === "xbar")); root.querySelectorAll("#kd button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.k === "step")); sim(); draw(); });
    sim(); draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
