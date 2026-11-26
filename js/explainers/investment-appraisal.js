Lab.register({
  id: "investment-appraisal",
  group: "Supply chain",
  title: "Comparing investments: NPV, IRR, PI and EAC",
  blurb: "Two projects, six ways to judge them: NPV, IRR, modified IRR, profitability index, equivalent annual value and discounted payback. See when they disagree, what tax and depreciation do, and which inputs swing the answer.",
  lede: "A single project is easy: if its NPV is positive at your cost of capital, it creates value. The hard part is choosing between projects. A cheap planning tool and a big automation scheme can each look best, depending on whether you rank by NPV, by IRR, by value per dollar or by how fast they pay back. This page puts two projects side by side, after tax, and shows why the measures disagree and which one answers which question.",
  quiz: [
    ["Project A has the higher IRR, project B the higher NPV. You can only do one and money isn't tight. Which do you pick?", "B. NPV is the dollars of value created; IRR is a rate and ignores scale. Earning 24% on $400k creates less value than 14% on $1.5m when your cost of capital is 10%."],
    ["A lasts 5 years, B lasts 12. Why is comparing their NPVs unfair, and what do you use instead?", "B's NPV counts 7 more years of benefit. If you would replace A when it wears out, compare the equivalent annual value (EAV/EAC): NPV spread evenly over each project's life, =PMT(r, life, −NPV)."],
    ["You have $1m to spend across many independent projects, all with positive NPV. How do you choose?", "Rank by profitability index (PV of inflows ÷ cost) and fund from the top until the budget runs out. Check the last few by hand, because whole projects don't always fit the leftover budget."],
    ["Depreciation isn't cash. Why does it raise after-tax cash flow?", "It is deducted before tax, so it lowers the tax bill by tax rate × depreciation each year. That saving (the depreciation tax shield) is real cash."],
    ["Why can IRR overstate a project's return, and what fixes it?", "IRR assumes each year's cash is reinvested at the IRR itself. If that's 30% but your real opportunities earn 10%, the true return is lower. MIRR reinvests at a rate you choose, usually the cost of capital."],
    ["The two NPV profiles cross at 12%. Your cost of capital is 11%. What does that tell you?", "Below 12% B is worth more, above it A is. At 11% B wins, but only just: a small change in the rate flips the choice, so the decision rests on other things (risk, flexibility, strategy)."],
  ],
  diy: {
    intro: "One project per column. Inputs: up-front cost H1, year-1 benefit H2, benefit growth H3, life H4, tax rate H5, discount rate H6, reinvestment rate H7. Years 0 to 12 in A3:A15. Depreciation is straight line over the life.",
    steps: [
      ["Year 0 cash: the up-front cost, negative.", "B3: =-$H$1"],
      ["After-tax cash each year: benefit after tax, plus the tax saved by depreciation. Zero after the life ends.", "B4: =IF(A4<=$H$4, $H$2*(1+$H$3)^(A4-1)*(1-$H$5) + $H$5*$H$1/$H$4, 0)"],
      ["Net present value.", "=B3+NPV($H$6,B4:B15)"],
      ["Internal rate of return.", "=IRR(B3:B15)"],
      ["Modified IRR: borrowing at the discount rate, reinvesting at H7.", "=MIRR(B3:B15,$H$6,$H$7)"],
      ["Profitability index: PV of the inflows per dollar invested.", "=NPV($H$6,B4:B15)/$H$1"],
      ["Equivalent annual value: the NPV as an even yearly amount over the life. Compare this across projects with different lives.", "=PMT($H$6,$H$4,-NPVcell)"],
      ["Discounted payback: running total of present values, then the first year it turns positive.", "C3: =B3/(1+$H$6)^A3   D3: =SUM($C$3:C3)\n=INDEX(A3:A15,MATCH(TRUE,D3:D15>=0,0))"],
      ["Crossover rate: put B's cash minus A's cash in a new column, then take its IRR. Below that rate the bigger project has the higher NPV.", "E3: =C3-B3 (project B minus A)\n=IRR(E3:E15)"],
      ["Tornado: copy the NPV cell, change one input to its low then high value, note the NPV each time. Data → What-If Analysis → Data Table does this for a whole column of values.", "=TABLE(,H2)"],
    ],
  },
  deeper: [
    ["Graham & Harvey (2002): How do CFOs make capital budgeting decisions?", "https://people.duke.edu/~charvey/Research/Published_Papers/P76_How_do_CFOs.pdf", "survey of 392 CFOs: what methods firms really use"],
    ["Kelleher & MacCormack (2004): Internal rate of return, a cautionary tale", "https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/internal-rate-of-return-a-cautionary-tale", "McKinsey on how IRR overstates returns, and MIRR"],
    ["OpenStax Principles of Finance, 16.4 Alternative methods", "https://openstax.org/books/principles-finance/pages/16-4-alternative-methods", "free textbook: profitability index, discounted payback, MIRR with worked numbers"],
    ["Capital budgeting — Wikipedia", "https://en.wikipedia.org/wiki/Capital_budgeting", "overview of all the methods and when to rank projects"],
    ["Modified internal rate of return — Wikipedia", "https://en.wikipedia.org/wiki/Modified_internal_rate_of_return", "formula and worked example"],
    ["Profitability index — Wikipedia", "https://en.wikipedia.org/wiki/Profitability_index", "value per dollar, for capital rationing"],
    ["Equivalent annual cost — Wikipedia", "https://en.wikipedia.org/wiki/Equivalent_annual_cost", "comparing assets with different lives"],
    ["Tax shield — Wikipedia", "https://en.wikipedia.org/wiki/Tax_shield", "how deductions such as depreciation cut tax"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 44 h82" opacity=".4"/><path d="M10 10 C 40 26, 60 40, 88 54"/><path d="M10 24 C 40 32, 60 42, 88 50" stroke-dasharray="5 3"/><circle cx="52" cy="35" r="3" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, watch, css } = Lab;
    const k = 1000;
    const money = (v) => (v < 0 ? "−" : "") + "$" + (Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toFixed(2) + "m" : Math.round(Math.abs(v) / 1000) + "k");
    const pct = (v, d = 1) => (isFinite(v) ? (v * 100).toFixed(d) + "%" : "—");
    const PRESETS = {
      sizes: { label: "Planning software vs warehouse automation", A: [400, 170, 0, 5], B: [1500, 330, 0, 12], nA: "Planning software", nB: "Warehouse automation" },
      scale: { label: "Small vs large, same life", A: [200, 90, 0, 6], B: [900, 300, 0, 6], nA: "Small upgrade", nB: "Large upgrade" },
      timing: { label: "Quick win vs slow burner", A: [500, 230, -10, 6], B: [500, 110, 12, 10], nA: "Quick win", nB: "Slow burner" },
    };
    const sl = (id, lab, min, max, step, val) => `<div class="ctrl"><label for="${id}">${lab} <output id="${id}V"></output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
    const proj = (P, col) => `<h4 class="ia-h" style="color:${col}"><i style="background:${col}"></i><span id="name${P}"></span></h4>` +
      sl("cap" + P, "Up-front cost", 50, 3000, 50, 0) + sl("ben" + P, "Yearly benefit (year 1, before tax)", 10, 1000, 10, 0) + sl("g" + P, "Benefit growth per year", -15, 15, 1, 0) + sl("life" + P, "Life (years)", 2, 12, 1, 0);
    const h4 = (t) => `<h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot" style="padding:14px">
          ${h4("Scorecard: which project does each measure pick?")}
          <div style="overflow-x:auto"><table id="score" class="ia-table"></table></div>
          <p class="hint" id="verdict" style="margin:10px 0 0"></p>
        </div>
        <figure class="plot wide">
          <canvas id="prof" style="min-height:260px" aria-label="NPV of each project at discount rates from 0 to 30 percent"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i><b id="lgA"></b></span><span><i style="background:var(--warm)"></i><b id="lgB"></b></span><span><i style="background:var(--violet)"></i>Crossover</span><span><i style="background:var(--muted)"></i>Your rate</span></div>
          <figcaption id="profCap">NPV profile: each project's NPV at every discount rate. Where a line crosses zero is its IRR.</figcaption>
        </figure>
        <figure class="plot short">
          <div style="padding:4px 6px 0;display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center">${h4("What swings the NPV?")}<div class="seg" id="tw" role="group" aria-label="Project"><button type="button" data-v="A" aria-pressed="true">Project A</button><button type="button" data-v="B" aria-pressed="false">Project B</button></div></div>
          <canvas id="torn" style="min-height:230px" aria-label="Tornado chart of NPV sensitivity to each input"></canvas>
          <figcaption id="tornCap"></figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          ${h4("Year by year, after tax")}<p class="hint" style="margin:0 0 8px">PV is the present value: cash × discount factor. NPV is the sum of each PV column.</p>
          <div style="overflow-x:auto"><table id="tbl" class="ia-table"></table></div>
        </div>`,
      panel: `
        <label class="rs-sel" style="display:block;margin-bottom:12px">Example <select id="pre">${Object.entries(PRESETS).map(([key, p]) => `<option value="${key}">${p.label}</option>`).join("")}</select></label>
        ${proj("A", "var(--accent)")}
        ${proj("B", "var(--warm)")}
        <h4 class="ia-h">Both projects</h4>
        ${sl("r", "Discount rate (cost of capital)", 2, 25, 0.5, 10)}
        ${sl("tax", "Company tax rate", 0, 40, 1, 28)}
        ${sl("re", "Reinvestment rate (for MIRR)", 0, 25, 0.5, 10)}
        <div class="readouts" id="ro"></div>`,
      notes: `
        <section>
          <h2>Worked numbers</h2>
          <div id="worked"></div>
        </section>
        <section>
          <h2>Which measure answers which question</h2>
          <ul>
            <li><b>NPV</b>: how many dollars of value, today, does this create? The one to use when you can pick only one project and money isn't the constraint.</li>
            <li><b>IRR</b>: what return does it earn? Handy for a quick "does it beat our hurdle rate", but it ignores size and can mislead when cash flows change sign more than once.</li>
            <li><b>MIRR</b>: IRR with a realistic reinvestment rate. Usually lower than IRR, and always a single answer.</li>
            <li><b>Profitability index</b>: value per dollar invested. Use it to rank independent projects when the budget is fixed.</li>
            <li><b>Equivalent annual value</b>: NPV per year of life. Use it to compare projects with different lives that you would replace like for like.</li>
            <li><b>Discounted payback</b>: how long your money is at risk. Not a measure of value, but a fair test of liquidity and of how far ahead you have to trust the forecast.</li>
          </ul>
          <p>A single project's yes or no is the easy part: if NPV &gt; 0 then IRR &gt; r, MIRR &gt; r and PI &gt; 1, so they all agree. They only disagree when you rank. For the full cash flow build-up and the chance of losing money, see <a href="#roi">Business case: ROI, NPV and payback</a>.</p>
        </section>
        <section>
          <h2>Tax and depreciation</h2>
          <p>Benefits are taxed, so only (1 − tax) of each dollar of saving reaches you. The up-front cost isn't deducted in one go: it is depreciated, here in equal amounts over the project's life, and each year's depreciation saves tax × depreciation. At 28% tax a $400k asset over 5 years saves $22.4k a year. Raise the tax rate and both NPVs fall, but long-lived projects fall less because more of their value is in the shield.</p>
          <p>Real tax rules use their own depreciation rates and timing, so use your finance team's schedule for a real case. Inflation is the other trap: discount nominal cash flows (with price rises built in) at a nominal rate, or real flows at a real rate, never a mix. The growth slider is where price or volume growth goes.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Start with planning software vs warehouse automation at 10%. NPV and EAV prefer the automation, while IRR, MIRR, PI and payback prefer the software. Push the discount rate past the crossover (about 13%) and NPV switches too.</li>
            <li>Set both lives to 6 years. Now EAV and NPV agree, because the lives match.</li>
            <li>Choose quick win vs slow burner. Same cost, but one fades while the other grows. Raise the discount rate and watch the quick win gain: high rates punish benefits that arrive late.</li>
            <li>Move the tax rate from 0% to 40%. Every NPV drops, but the order can change: long-lived projects keep more of their depreciation shield in value.</li>
            <li>Set the reinvestment rate equal to the discount rate. MIRR now lies between r and IRR. Raise it to the IRR and MIRR equals IRR.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pP = new Plot($("#prof"), { x: [0, 0.3], pad: { l: 64 } });
    const pT = new Plot($("#torn"), { x: [0, 1], y: [0, 6], pad: { l: 96, r: 18, b: 32 } });
    let tw = "A";

    function flows(q, tax) {
      const f = [-q.cap], dep = q.cap / q.life;
      for (let t = 1; t <= q.life; t++) f.push(q.ben * (1 + q.g) ** (t - 1) * (1 - tax) + tax * dep);
      return f;
    }
    const npv = (f, r) => f.reduce((s, v, t) => s + v / (1 + r) ** t, 0);
    function root1(fn, lo, hi) { let flo = fn(lo); if (flo * fn(hi) > 0) return NaN; for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2, fm = fn(m); if (flo * fm <= 0) hi = m; else { lo = m; flo = fm; } } return (lo + hi) / 2; }
    const irr = (f) => root1((r) => npv(f, r), -0.95, 5);
    function mirr(f, fin, re) { const n = f.length - 1; let pos = 0, neg = 0; f.forEach((v, t) => { if (v > 0) pos += v * (1 + re) ** (n - t); else neg += v / (1 + fin) ** t; }); return neg < 0 && pos > 0 ? (pos / -neg) ** (1 / n) - 1 : NaN; }
    function dpb(f, r) { let c = 0; for (let t = 0; t < f.length; t++) { const v = f[t] / (1 + r) ** t, prev = c; c += v; if (t > 0 && c >= 0 && prev < 0) return t - 1 + -prev / v; } return NaN; }
    const ann = (r, n) => (r === 0 ? n : (1 - (1 + r) ** -n) / r);
    function measures(q, g) {
      const f = flows(q, g.tax), N = npv(f, g.r), pv = N + q.cap;
      return { f, npv: N, irr: irr(f), mirr: mirr(f, g.r, g.re), pi: pv / q.cap, eav: N / ann(g.r, q.life), dpb: dpb(f, g.r) };
    }

    function read() {
      const q = (P) => ({ cap: +$("#cap" + P).value * k, ben: +$("#ben" + P).value * k, g: +$("#g" + P).value / 100, life: +$("#life" + P).value });
      return { A: q("A"), B: q("B"), g: { r: +$("#r").value / 100, tax: +$("#tax").value / 100, re: +$("#re").value / 100 } };
    }
    function setPreset(key) {
      const p = PRESETS[key];
      ["A", "B"].forEach((P) => { const v = p[P]; $("#cap" + P).value = v[0]; $("#ben" + P).value = v[1]; $("#g" + P).value = v[2]; $("#life" + P).value = v[3]; });
      draw();
    }

    function draw() {
      const { A, B, g } = read(), pre = PRESETS[$("#pre").value];
      const nm = { A: "A: " + pre.nA, B: "B: " + pre.nB };
      ["A", "B"].forEach((P) => { const q = P === "A" ? A : B; $("#name" + P).textContent = "Project " + nm[P]; $("#cap" + P + "V").textContent = money(q.cap); $("#ben" + P + "V").textContent = money(q.ben); $("#g" + P + "V").textContent = (q.g > 0 ? "+" : "") + Math.round(q.g * 100) + "%"; $("#life" + P + "V").textContent = q.life; });
      $("#rV").textContent = pct(g.r); $("#taxV").textContent = Math.round(g.tax * 100) + "%"; $("#reV").textContent = pct(g.re);
      $("#lgA").textContent = nm.A; $("#lgB").textContent = nm.B;
      const mA = measures(A, g), mB = measures(B, g);
      const sameLife = A.life === B.life;

      // ---- scorecard ----
      const rows = [
        ["NPV", "npv", money, 1, "Value created today"],
        ["IRR", "irr", (v) => pct(v), 1, "Return earned (ignores size)"],
        ["MIRR", "mirr", (v) => pct(v), 1, `IRR, reinvesting at ${pct(g.re)}`],
        ["Profitability index", "pi", (v) => v.toFixed(2), 1, "PV per $1 invested"],
        ["Equivalent annual value", "eav", money, 1, "NPV per year of life"],
        ["Discounted payback", "dpb", (v) => (isFinite(v) ? v.toFixed(1) + " yrs" : "never"), -1, "Years until money back"],
      ];
      const win = (key, dir) => { const a = mA[key], b = mB[key]; if (!isFinite(a) && !isFinite(b)) return ""; if (!isFinite(a)) return "B"; if (!isFinite(b)) return "A"; if (Math.abs(a - b) < 1e-9) return "tie"; return (a > b) === dir > 0 ? "A" : "B"; };
      const cell = (txt, on, col) => `<td class="${on ? "win" : ""}" style="${on ? `background:color-mix(in srgb, ${col} 22%, var(--surface))` : ""}">${on ? "<b>" + txt + "</b>" : txt}</td>`;
      $("#score").innerHTML = `<thead><tr><th>Measure</th><th style="color:var(--accent)">A</th><th style="color:var(--warm)">B</th><th class="ia-q">What it answers</th></tr></thead><tbody>` +
        rows.map(([lab, key, fmt, dir, q]) => { const w = win(key, dir); return `<tr><td>${lab}</td>${cell(fmt(mA[key]), w === "A", "var(--accent)")}${cell(fmt(mB[key]), w === "B", "var(--warm)")}<td class="ia-q">${q}</td></tr>`; }).join("") + "</tbody>";
      const picks = rows.map(([, key, , dir]) => win(key, dir)), nA = picks.filter((x) => x === "A").length, nB = picks.filter((x) => x === "B").length;
      const best = sameLife ? (mA.npv >= mB.npv ? "A" : "B") : mA.eav >= mB.eav ? "A" : "B";
      const bestM = best === "A" ? mA : mB, other = best === "A" ? mB : mA;
      let verdict;
      if (mA.npv < 0 && mB.npv < 0) verdict = `Neither project earns its cost of capital at ${pct(g.r)}: both NPVs are negative. Don't do either unless there's a benefit that isn't in the numbers.`;
      else verdict = `The measures split ${nA}–${nB}. ${sameLife ? "Lives are equal, so NPV decides" : "Lives differ, so equivalent annual value decides (assuming you'd replace the shorter project)"}: <b>pick ${nm[best]}</b>${other.npv > 0 ? `. If both can be funded, do both: each has a positive NPV` : ""}. If cash is rationed, the higher profitability index (${mA.pi >= mB.pi ? "A" : "B"}) gives more value per dollar.`;
      $("#verdict").innerHTML = verdict;

      // ---- NPV profile ----
      const rs = Array.from({ length: 121 }, (_, i) => i * 0.0025);
      const yA = rs.map((r) => npv(mA.f, r)), yB = rs.map((r) => npv(mB.f, r));
      const lo = Math.min(...yA, ...yB, 0), hi = Math.max(...yA, ...yB, 0), span = hi - lo || 1;
      pP.x = [0, 0.3]; pP.y = [lo - span * 0.06, hi + span * 0.1];
      pP.clear(); pP.axes({ xLabel: "discount rate", yLabel: "NPV", xFormat: (v) => Math.round(v * 100) + "%", yFormat: money, xTicks: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3] });
      pP.path([0, 0.3], [0, 0], css("--ink"), 1.2);
      pP.path([g.r, g.r], pP.y, css("--muted"), 1.5, [4, 4]);
      pP.path(rs, yA, css("--accent"), 2.8);
      pP.path(rs, yB, css("--warm"), 2.8);
      const cross = root1((r) => npv(mB.f, r) - npv(mA.f, r), 0, 0.3);
      if (isFinite(mA.irr) && mA.irr <= 0.3) pP.dot(mA.irr, 0, 5, css("--accent"), css("--surface"));
      if (isFinite(mB.irr) && mB.irr <= 0.3) pP.dot(mB.irr, 0, 5, css("--warm"), css("--surface"));
      if (isFinite(cross)) pP.dot(cross, npv(mA.f, cross), 6, css("--violet"), css("--surface"));
      pP.dot(g.r, mA.npv, 4, css("--accent")); pP.dot(g.r, mB.npv, 4, css("--warm"));
      $("#profCap").innerHTML = `NPV profile: each project's NPV at every discount rate. Dots on the zero line are the IRRs (A ${pct(mA.irr)}, B ${pct(mB.irr)}). ` +
        (isFinite(cross) ? `The lines cross at <b>${pct(cross)}</b>: below it ${npv(mB.f, cross / 2) > npv(mA.f, cross / 2) ? "B" : "A"} has the higher NPV, above it ${npv(mB.f, cross / 2) > npv(mA.f, cross / 2) ? "A" : "B"} does.` : "The lines don't cross between 0% and 30%, so NPV ranks them the same way at any rate in that range.");

      // ---- tornado ----
      const q0 = tw === "A" ? A : B, base = measures(q0, g).npv;
      const vary = [
        ["Benefit ±20%", (s) => [{ ...q0, ben: q0.ben * (1 + 0.2 * s) }, g]],
        ["Cost ±20%", (s) => [{ ...q0, cap: q0.cap * (1 + 0.2 * s) }, g]],
        ["Life ±2 yrs", (s) => [{ ...q0, life: Math.max(1, q0.life + 2 * s) }, g]],
        ["Rate ±3 pts", (s) => [q0, { ...g, r: Math.max(0, g.r + 0.03 * s) }]],
        ["Growth ±3 pts", (s) => [{ ...q0, g: q0.g + 0.03 * s }, g]],
        ["Tax ±10 pts", (s) => [q0, { ...g, tax: Math.max(0, g.tax + 0.1 * s) }]],
      ].map(([lab, fn]) => { const lo1 = measures(...fn(-1)).npv, hi1 = measures(...fn(1)).npv; return { lab, lo: lo1, hi: hi1, w: Math.abs(hi1 - lo1) }; }).sort((a, b) => b.w - a.w);
      const tMin = Math.min(base, ...vary.map((v) => Math.min(v.lo, v.hi)), 0), tMax = Math.max(base, ...vary.map((v) => Math.max(v.lo, v.hi)), 0), ts = tMax - tMin || 1;
      pT.x = [tMin - ts * 0.04, tMax + ts * 0.04]; pT.y = [0, vary.length];
      pT.clear(); pT.axes({ xFormat: money, xCount: 5, yTicks: [] });
      const G = pT.ctx, bh = Math.min(26, (pT.ih / vary.length) * 0.62);
      vary.forEach((v, i) => {
        const yc = pT.sy(vary.length - i - 0.5);
        [[v.lo, "lo"], [v.hi, "hi"]].forEach(([val, side]) => {
          const x0 = pT.sx(Math.min(base, val)), x1 = pT.sx(Math.max(base, val));
          G.fillStyle = side === "lo" ? css("--bad") : css("--good"); G.globalAlpha = 0.75;
          G.fillRect(x0, yc - bh / 2, Math.max(1, x1 - x0), bh);
        });
        G.globalAlpha = 1; G.fillStyle = css("--ink"); G.font = `12px ${css("--font-body")}`; G.textAlign = "right"; G.textBaseline = "middle";
        G.fillText(v.lab, pT.pad.l - 8, yc);
      });
      pT.path([base, base], pT.y, css("--ink"), 1.5);
      if (tMin < 0 && tMax > 0 && Math.abs(base) > ts * 0.02) pT.path([0, 0], pT.y, css("--muted"), 1.2, [4, 3]);
      const beBen = root1((b) => measures({ ...q0, ben: b }, g).npv, 0, q0.ben * 20 + 1e6), beCap = root1((c) => measures({ ...q0, cap: c }, g).npv, 1, q0.cap * 20 + 1e7);
      $("#tornCap").innerHTML = `Project ${tw}'s NPV (${money(base)}, black line) when each input moves on its own. Red is the low setting of that input, green the high one (for cost, rate and tax, the high setting lowers NPV). Rate is the discount rate; growth is the yearly benefit growth. Break-even: NPV hits zero if the year-1 benefit falls to <b>${isFinite(beBen) ? money(beBen) : "—"}</b> (${isFinite(beBen) ? Math.round((beBen / q0.ben - 1) * 100) + "%" : "—"}), or the cost rises to <b>${isFinite(beCap) ? money(beCap) : "—"}</b>, or the discount rate passes the IRR of ${pct(measures(q0, g).irr)}.`;
      root.querySelectorAll("#tw button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === tw)));

      // ---- readouts ----
      $("#ro").innerHTML = `
        <div class="ro"><b>NPV, A</b><span class="pill ${mA.npv >= 0 ? "ok" : "bad"}">${money(mA.npv)}</span></div>
        <div class="ro"><b>NPV, B</b><span class="pill ${mB.npv >= 0 ? "ok" : "bad"}">${money(mB.npv)}</span></div>
        <div class="ro"><b>IRR, A vs B</b><span class="num">${pct(mA.irr)} vs ${pct(mB.irr)}</span></div>
        <div class="ro"><b>Equivalent annual, A vs B</b><span class="num">${money(mA.eav)} vs ${money(mB.eav)}</span></div>
        <div class="ro"><b>Crossover rate</b><span class="num">${isFinite(cross) ? pct(cross) : "none 0–30%"}</span></div>
        <div class="ro"><b>Pick</b><span class="pill ${bestM.npv >= 0 ? "ok" : "bad"}">${bestM.npv >= 0 ? "Project " + best : "neither"}</span></div>`;

      // ---- year table ----
      const n = Math.max(A.life, B.life), td = (v, b) => `<td${b ? ' style="font-weight:700"' : ""}>${v}</td>`;
      let cA = 0, cB = 0;
      $("#tbl").innerHTML = `<thead><tr><th>Year</th><th style="color:var(--accent)">A cash</th><th style="color:var(--accent)">A PV</th><th style="color:var(--warm)">B cash</th><th style="color:var(--warm)">B PV</th><th>Discount factor</th></tr></thead><tbody>` +
        Array.from({ length: n + 1 }, (_, t) => {
          const df = 1 / (1 + g.r) ** t, a = mA.f[t], b = mB.f[t];
          if (a !== undefined) cA += a * df; if (b !== undefined) cB += b * df;
          return `<tr>${td(t)}${td(a === undefined ? "—" : money(a))}${td(a === undefined ? "—" : money(a * df))}${td(b === undefined ? "—" : money(b))}${td(b === undefined ? "—" : money(b * df))}${td(df.toFixed(3))}</tr>`;
        }).join("") + `<tr class="tot">${td("NPV", 1)}${td("", 1)}${td(money(cA), 1)}${td("", 1)}${td(money(cB), 1)}${td("", 1)}</tr></tbody>`;

      // ---- worked numbers (project A) ----
      const dep = A.cap / A.life, b1 = A.ben * (1 - g.tax), sh = g.tax * dep, c1 = mA.f[1];
      $("#worked").innerHTML = `<p>Project A, year 1: benefit ${money(A.ben)} less ${Math.round(g.tax * 100)}% tax leaves ${money(b1)}. Depreciation is ${money(A.cap)} ÷ ${A.life} = ${money(dep)} a year, which saves ${money(sh)} of tax. After-tax cash: ${money(c1)}. Discounted one year at ${pct(g.r)}: ${money(c1)} × ${(1 / (1 + g.r)).toFixed(3)} = ${money(c1 / (1 + g.r))}.</p>
        <div class="eq">NPV = −${money(A.cap)} + Σ cash<sub>t</sub> ÷ (1 + ${g.r.toFixed(3)})<sup>t</sup> = ${money(mA.npv)}<br>PI = PV of inflows ÷ cost = ${money(mA.npv + A.cap)} ÷ ${money(A.cap)} = ${mA.pi.toFixed(2)}<br>EAV = NPV ÷ annuity factor = ${money(mA.npv)} ÷ ${ann(g.r, A.life).toFixed(3)} = ${money(mA.eav)} a year<br>MIRR = (FV of inflows at ${pct(g.re)} ÷ cost)<sup>1/${A.life}</sup> − 1 = ${pct(mA.mirr)}</div>
        <p>Project B's EAV is ${money(mB.eav)} a year over ${B.life} years, against A's ${money(mA.eav)} over ${A.life}. ${A.life === B.life ? "With equal lives, EAV ranks them exactly as NPV does." : `NPV alone says ${mB.npv > mA.npv ? "B" : "A"} by ${money(Math.abs(mB.npv - mA.npv))}, but part of that comes from ${B.life > A.life ? "B" : "A"} simply lasting longer.`}</p>`;
    }

    $("#pre").addEventListener("change", (e) => setPreset(e.target.value));
    $("#tw").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; tw = b.dataset.v; draw(); });
    root.querySelectorAll("input").forEach((i) => i.addEventListener("input", draw));
    setPreset("sizes");
    return watch([pP.c, pT.c], (resized) => { if (resized) { pP.resize(); pT.resize(); } draw(); });
  },
});
