Lab.register({
  id: "case-cold-brew",
  group: "Case studies",
  title: "Case study: one product from sales history to stock, cost and risk",
  blurb: "Follow one product, a 1-litre cold brew coffee, through cleaning its history, forecasting, safety stock, an ordering rule, the yearly cost and supplier risk. Every number feeds the next step.",
  lede: "Most pages on this site show one method on its own. Real planning chains them together: a typo in the history changes the forecast, the forecast error sets the safety stock, the safety stock sets the cost, and supplier delays put that cost at risk. Change anything in the panel and watch it ripple through all six steps.",
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 44 L20 34 L30 40 L42 22" /><circle cx="42" cy="22" r="3" fill="currentColor"/><path d="M42 22 H56" stroke-dasharray="3 3"/><rect x="56" y="12" width="14" height="20" rx="2"/><path d="M70 22 H80" stroke-dasharray="3 3"/><path d="M80 14 V30 M80 30 L88 30" /><path d="M10 56 H88" opacity=".5"/><circle cx="24" cy="56" r="2.5" fill="currentColor"/><circle cx="48" cy="56" r="2.5" fill="currentColor"/><circle cx="72" cy="56" r="2.5" fill="currentColor"/></svg>`,
  quiz: [
    ["With the typo left in, which forecast method suffers most, and why?", "Seasonal naive. It copies the same week from last year, so the one typed-in 10× week comes back as a forecast exactly 52 weeks later and blows up that week's error. Holt-Winters only takes a share (γ) of the typo into its seasonal index, so it is hurt less, but still noticeably."],
    ["Lead time goes from 2 weeks to 4. Why does safety stock rise by more than the extra average demand would suggest?", "Safety stock covers forecast error over the protection period (lead time + review period), here 3 weeks rising to 5. Error over 5 weeks is bigger than over 3, roughly by √(5/3) ≈ 1.3 if errors were independent, and more if they run in streaks, which they often do."],
    ["Here the cheapest service target is above 99%. Would that hold for a product that costs $40, sells for $42 and goes stale within a month?", "No. The trade-off is the cost of a unit left over against the cost of a unit short. For the cold brew a unit held for a year costs $1.50 and a lost sale $4, so short is far worse and you aim high. For the stale-in-a-month product, a leftover unit may be written off ($40) while a lost sale costs only $2 of margin, so the cheapest target is much lower. The newsvendor page shows the same balance as a critical ratio."],
    ["Why does a better forecast save money even at the same service target?", "Smaller forecast errors mean a smaller σ over the protection period, so the same z buys the same service with less safety stock. Less stock means lower holding cost, and better timing (for example knowing when promotions fall) means fewer lost sales."],
    ["With a 10% chance of a late order, the yearly cost jumps several times over. Why so much, when only about 5 of 52 orders are late?", "Safety stock here is sized for forecast error only, about a third of a week of sales. A 2-week delay means about two weeks of demand, over 1,000 units, arrives after the shelf is empty, and each lost sale costs $4 of margin. A few late orders a year are enough to dominate the cost, so either size a buffer for delays (lead-time variability) or fix the supplier."],
  ],
  diy: {
    intro: "Weekly sales in column B (rows 2–157), a promo flag (1/0) in column C. Week number in column A.",
    steps: [
      ["Flag typos: compare each week with the median of its neighbours, scaled by the median absolute deviation (MAD).", "D: =MEDIAN(B(n-4):B(n+4))\nE: =B2-D2\nrobust z: =E2/(1.4826*MEDIAN(ABS($E$2:$E$157)))   (array formula)\nflag: =AND(C2=0,ABS(robust z)>5)"],
      ["Seasonal naive forecast and its error.", "F54: =B2\nerror: =B54-F54"],
      ["Holt-Winters additive (α, β, γ in J1:J3). Level, trend, season columns.", "level: =$J$1*(B54-season(n-52))+(1-$J$1)*(level(n-1)+trend(n-1))\ntrend: =$J$2*(level-level(n-1))+(1-$J$2)*trend(n-1)\nseason: =$J$3*(B54-level)+(1-$J$3)*season(n-52)"],
      ["Error over the protection period P = lead time + 1 week: sum of actuals over P weeks minus the forecast made before them.", "=SUM(B(n):B(n+P-1))-SUM(forecasts for those weeks made at n-1)\nσP: =SQRT(SUMSQ(those errors)/COUNT(those errors))"],
      ["Safety stock and order-up-to level.", "SS: =NORM.S.INV(target)*σP\nS: =SUM(next P weeks of forecast)+SS\norder: =MAX(0,S-on_hand-on_order)"],
      ["Yearly cost.", "=AVERAGE(on_hand)*unit_cost*holding_pct + SUM(lost_sales)*margin"],
    ],
  },
  deeper: [
    ["Hyndman & Athanasopoulos, Forecasting: Principles and Practice (3rd ed.)", "https://otexts.com/fpp3/", "free textbook; Holt-Winters, accuracy measures and the forecasting steps used here"],
    ["Silver, Pyke & Thomas (2017), Inventory and Production Management in Supply Chains, 4th ed., CRC Press", "https://doi.org/10.1201/9781315374406", "order-up-to policies, safety stock from forecast errors, and setting service targets by cost"],
    ["Hyndman & Koehler (2006), Another look at measures of forecast accuracy, International Journal of Forecasting 22(4)", "https://doi.org/10.1016/j.ijforecast.2006.03.001", "where MASE comes from"],
    ["Eppen & Martin (1988), Determining safety stock in the presence of stochastic lead time and demand, Management Science 34(11)", "https://doi.org/10.1287/mnsc.34.11.1380", "why safety stock should come from errors over the lead time, not from a formula alone"],
  ],

  mount(root) {
    const { Plot, fmt, css, rng, qnorm } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);
    const money = (v) => "$" + Math.round(v).toLocaleString("en-US");
    const int = (v) => Math.round(v).toLocaleString("en-US");
    const step = (n, t) => `<span style="display:inline-block;min-width:1.7em;height:1.7em;line-height:1.7em;text-align:center;border-radius:50%;background:var(--accent-soft);color:var(--ink);font:600 .8rem/1.7em var(--font-mono);margin-right:8px">${n}</span>${t}`;

    const NTRAIN = 104, NHIST = 156, NFUT = 52, TYPO = 61, PRICE = 10, COST = 6, MARGIN = PRICE - COST, SEASON = 52;
    const METHODS = [["snaive", "Seasonal naive"], ["hw", "Holt-Winters"], ["hwp", "Holt-Winters + promos"]];

    root.innerHTML = Lab.page(this, {
      figure: `
        ${fig("c1", "1–2 · Sales history, cleaning and the forecast test", 270, "Three years of weekly sales with the flagged typo, promotions, and one-week-ahead forecasts over the final year")}
        ${fig("c2", "3–4 · The ordering rule run for a year", 250, "Stock on hand each week of the next year, with weekly demand and lost sales")}
        ${two(fig("c3", "5 · Yearly cost against service target", 250, "Yearly holding plus lost-margin cost for each service target, one line per forecast method"), fig("c4", "6 · Supplier risk: 500 simulated years", 250, "Histogram of yearly cost across 500 simulated years with random supplier delays"))}`,
      panel: `
        <p class="hint" style="margin:0">A 1-litre cold brew coffee sold from one warehouse. It costs $${COST} and sells for $${PRICE}. We review stock weekly and order from one supplier.</p>
        <div class="ctrl"><label>Step 1: fix the typo in week ${TYPO + 1}?</label><div class="seg" id="clean"><button type="button" data-v="1" aria-pressed="true">Fix it</button><button type="button" data-v="0" aria-pressed="false">Leave it in</button></div></div>
        <div class="ctrl"><label>Step 2: forecast method</label><div class="seg" id="meth">${METHODS.map(([v, l], i) => `<button type="button" data-v="${v}" aria-pressed="${i === 2}">${l}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="lt">Step 3: supplier lead time <output id="ltV"></output></label><input type="range" id="lt" min="1" max="6" step="1" value="2"></div>
        <div class="ctrl"><label for="tgt">Step 4: service target (cycle service level) <output id="tgtV"></output></label><input type="range" id="tgt" min="0.8" max="0.995" step="0.005" value="0.95"></div>
        <div class="ctrl"><label for="hold">Step 5: holding cost per year <output id="holdV"></output></label><input type="range" id="hold" min="0.1" max="0.4" step="0.01" value="0.25"></div>
        <div class="ctrl"><label for="dly">Step 6: chance an order is 2 weeks late <output id="dlyV"></output></label><input type="range" id="dly" min="0" max="0.3" step="0.01" value="0.1"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newH" type="button">New sales history</button></div>`,
      notes: `
        <section>
          <h2>${step(1, "Clean the history")}</h2>
          <p id="n1"></p>
          <p>Promotion weeks are left alone: they are high for a known reason, and step 2 models them. See <a href="#outliers">outliers</a> for the MAD rule and <a href="#missing-data">missing data</a> for other ways to fill a bad value.</p>
        </section>
        <section>
          <h2>${step(2, "Choose a forecast method on a fair test")}</h2>
          <p>Each method is fitted on the first two years only. Then it forecasts the third year one week at a time, seeing each actual after it has made its forecast, as it would in real use.</p>
          <div style="overflow-x:auto"><table class="tbl" id="t2"></table></div>
          <p id="n2"></p>
          <p>MASE divides the error by the error of seasonal naive on the training years, so below 1 means better than copying last year. More in <a href="#forecast-accuracy">forecast accuracy</a>, <a href="#exponential-smoothing">exponential smoothing</a> and <a href="#promo-regression">regression with promotions</a>.</p>
        </section>
        <section>
          <h2>${step(3, "Turn forecast error into safety stock")}</h2>
          <p id="n3"></p>
          <p>Why use the measured error over several weeks rather than the one-week error × √P? Errors often run in streaks (a cold month is cold for four weeks), so the √P shortcut can under-protect. See <a href="#lead-time-error">lead-time forecast error</a> and <a href="#reorder-point">reorder point and safety stock</a>.</p>
        </section>
        <section>
          <h2>${step(4, "Run the ordering rule for a year")}</h2>
          <p id="n4"></p>
          <p>This is an order-up-to (R, S) rule with R = 1 week; compare it with others in <a href="#inventory-policies">inventory policies</a>. A cycle service target of ${"<span id='tg4'></span>"} doesn't mean that share of units is served: the fill rate is usually higher. See <a href="#service-level-cost">service level vs cost</a>. We assume sales lost to empty shelves are still recorded as demand (for example from web orders); if not, see <a href="#censored-demand">censored demand</a>.</p>
        </section>
        <section>
          <h2>${step(5, "Put it in money")}</h2>
          <p id="n5"></p>
          <p>The same calculations in more depth: <a href="#carrying-cost">carrying cost</a> and <a href="#forecast-value">the value of a better forecast</a>.</p>
        </section>
        <section>
          <h2>${step(6, "Stress it: what if the supplier is late?")}</h2>
          <p id="n6"></p>
          <p>For the method behind this, see <a href="#monte-carlo-risk">Monte Carlo risk simulation</a> and <a href="#var-cvar">VaR and CVaR</a>; for comparing what a backup supplier is worth, see <a href="#supplier-disruption">supplier disruption</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul id="try">
            <li>Choose Seasonal naive, then <b>Leave it in</b>. One typing slip comes back as next year's forecast for that week. The error over 3 weeks jumps from about 230 to over 1,000 units, safety stock goes from about 370 to 1,700, and the yearly cost nearly doubles.</li>
            <li>Switch between the three forecast methods and compare the yearly cost in step 5. Holt-Winters + promos knows when next year's promotions fall, so it needs the least safety stock.</li>
            <li>Raise the lead time from 2 to 5 weeks. The error over the protection period goes from about 106 to 178 units, safety stock from 174 to about 290, and the yearly cost rises by about $300.</li>
            <li>Move the service target from 95% to 99.5%. Safety stock rises by about 100 units, but the yearly cost roughly halves, because a lost sale costs $4 of margin and a unit held for a year only $1.50.</li>
            <li>Set late deliveries to 0%, then 10%. Safety stock sized only for forecast error can't cover a 2-week delay, so the average yearly cost jumps from about $1,200 to about $8,700. Now try Seasonal naive with the typo left in: its bloated safety stock happens to absorb the delays. That's expensive insurance bought by accident. A deliberate buffer for delays would be cheaper.</li>
          </ul>
        </section>`,
    });

    // ---------- data
    let seed = 11;
    function makeWorld(sd) {
      const r = rng(sd), N = NHIST + NFUT, promo = Array(N).fill(0), base = [], noiseSd = 0.08;
      for (let y = 0; y < N / SEASON; y++) { const used = new Set(); while (used.size < 6) { const w = 2 + Math.floor(r() * 48); if (![...used].some((u) => Math.abs(u - w) < 4)) used.add(w); } used.forEach((w) => (promo[y * SEASON + w] = 1)); }
      for (let j = TYPO - 2; j <= TYPO + 2; j++) promo[j] = 0; // keep the typo week clear of promotions
      for (let i = 0; i < N; i++) base.push((400 + 0.8 * i) * (1 + 0.25 * Math.sin((2 * Math.PI * (i - 40)) / SEASON)) * (promo[i] ? 1.45 : 1));
      const hist = base.slice(0, NHIST).map((b) => Math.round(b * Math.exp(noiseSd * r.normal() - noiseSd * noiseSd / 2)));
      const raw = hist.slice(); raw[TYPO] = raw[TYPO] * 10;
      return { promo, base, raw, noiseSd };
    }
    const futureDemand = (W, sd) => { const r = rng(sd); return W.base.slice(NHIST).map((b) => Math.round(b * Math.exp(W.noiseSd * r.normal() - W.noiseSd * W.noiseSd / 2))); };

    function cleanSeries(W) {
      const y = W.raw, med = y.map((_, i) => { const nb = []; for (let j = Math.max(0, i - 4); j <= Math.min(NHIST - 1, i + 4); j++) if (j !== i && !W.promo[j]) nb.push(y[j]); nb.sort((a, b) => a - b); return nb[Math.floor(nb.length / 2)]; });
      const dev = y.map((v, i) => v - med[i]), absd = dev.filter((_, i) => !W.promo[i]).map(Math.abs).sort((a, b) => a - b), mad = 1.4826 * absd[Math.floor(absd.length / 2)];
      const z = dev.map((d) => d / mad), flags = [];
      z.forEach((v, i) => { if (!W.promo[i] && Math.abs(v) > 5) flags.push(i); });
      const fixed = y.slice(); flags.forEach((i) => (fixed[i] = med[i]));
      return { med, z, flags, fixed, mad };
    }

    // ---------- forecasters (all share the same interface)
    function upliftOf(y, W) { const rs = []; for (let i = 0; i < NTRAIN; i++) if (W.promo[i]) { const nb = []; for (let j = Math.max(0, i - 4); j <= Math.min(NTRAIN - 1, i + 4); j++) if (!W.promo[j]) nb.push(y[j]); nb.sort((a, b) => a - b); rs.push(y[i] / nb[Math.floor(nb.length / 2)]); } return rs.reduce((a, b) => a + b, 0) / rs.length; }
    function hwRun(y, a, b, g, upto) {
      const m1 = y.slice(0, SEASON).reduce((s, v) => s + v, 0) / SEASON, m2 = y.slice(SEASON, 2 * SEASON).reduce((s, v) => s + v, 0) / SEASON;
      let l = m1, t = (m2 - m1) / SEASON; const s = y.slice(0, SEASON).map((v, i) => v - (m1 + (i - (SEASON - 1) / 2) * t)); l = m1 + ((SEASON - 1) / 2) * t - t; // level just before week 0
      let sse = 0;
      for (let i = 0; i < upto; i++) { const k = i % SEASON, f = l + t + s[k], e = y[i] - f; if (i >= SEASON) sse += e * e; const ln = a * (y[i] - s[k]) + (1 - a) * (l + t); t = b * (ln - l) + (1 - b) * t; s[k] = g * (y[i] - ln) + (1 - g) * s[k]; l = ln; }
      return { l, t, s, sse };
    }
    function makeForecaster(method, y0, W) {
      // y0: cleaned (or not) history; returns {fc(h) for week n+h-1 after seeing n weeks, see(v)}
      const y = y0.slice();
      if (method === "snaive") {
        return { name: method, n: NTRAIN, y, start(n) { this.n = n; }, fc(h) { const j = this.n + h - 1; return this.y[j - SEASON <= this.n - 1 ? j - SEASON : j - 2 * SEASON]; }, see(v) { this.y[this.n] = v; this.n++; } };
      }
      const u = method === "hwp" ? upliftOf(y, W) : 1, adj = (v, i) => (method === "hwp" && W.promo[i] ? v / u : v);
      const ya = y.map(adj); let best = null;
      for (const a of [0.05, 0.1, 0.2, 0.3, 0.5]) for (const b of [0, 0.02, 0.05]) for (const g of [0.05, 0.1, 0.2, 0.3]) { const r = hwRun(ya, a, b, g, NTRAIN); if (!best || r.sse < best.sse) best = { ...r, a, b, g }; }
      const st = hwRun(ya, best.a, best.b, best.g, NTRAIN);
      return { name: method, u, a: best.a, b: best.b, g: best.g, n: NTRAIN, st,
        fc(h) { const j = this.n + h - 1; return (this.st.l + h * this.st.t + this.st.s[j % SEASON]) * (method === "hwp" && W.promo[j] ? u : 1); },
        see(v) { const i = this.n, k = i % SEASON, x = adj(v, i), S = this.st, ln = this.a * (x - S.s[k]) + (1 - this.a) * (S.l + S.t); S.t = this.b * (ln - S.l) + (1 - this.b) * S.t; S.s[k] = this.g * (x - ln) + (1 - this.g) * S.s[k]; S.l = ln; this.n++; } };
    }

    // test year: 1-step errors and P-step cumulative errors
    function evaluate(method, y, W, P) {
      const F = makeForecaster(method, y, W), one = [], fcs = [], cum = [];
      let scale = 0; for (let i = SEASON; i < NTRAIN; i++) scale += Math.abs(y[i] - y[i - SEASON]); scale /= NTRAIN - SEASON;
      for (let i = NTRAIN; i < NHIST; i++) {
        if (i + P <= NHIST) { let sf = 0, sa = 0; for (let h = 1; h <= P; h++) { sf += F.fc(h); sa += y[i + h - 1]; } cum.push(sa - sf); }
        const f = F.fc(1); fcs.push(f); one.push(y[i] - f); F.see(y[i]);
      }
      const mae = one.reduce((s, e) => s + Math.abs(e), 0) / one.length, rmse = Math.sqrt(one.reduce((s, e) => s + e * e, 0) / one.length), bias = one.reduce((s, e) => s + e, 0) / one.length;
      const sP = Math.sqrt(cum.reduce((s, e) => s + e * e, 0) / cum.length);
      return { F, fcs, one, mae, rmse, bias, mase: mae / scale, sP, sqrtRule: rmse * Math.sqrt(P), meanY: y.slice(NTRAIN).reduce((a, b) => a + b, 0) / (NHIST - NTRAIN) };
    }

    // one simulated year of the (R=1, S) rule with lost sales
    function simulate(method, y, W, L, SS, dem, delayP, dseed, keep) {
      const F = makeForecaster(method, y, W); F.start && F.start(NTRAIN); for (let i = NTRAIN; i < NHIST; i++) F.see(y[i]);
      const r = rng(dseed), arr = Array(NFUT + 12).fill(0); let oh = Math.round(F.fc(1) + SS);
      for (let k = 0; k < L; k++) arr[k] += Math.round(F.fc(k + 2)); // already on order
      let served = 0, lost = 0, ohSum = 0, outWeeks = 0, late = 0; const rec = [];
      for (let t = 0; t < NFUT; t++) {
        oh += arr[t];
        let pipe = 0; for (let k = t + 1; k < arr.length; k++) pipe += arr[k];
        let S = SS; for (let h = 1; h <= L + 1; h++) S += F.fc(h);
        const q = Math.max(0, Math.round(S - oh - pipe)); let at = t + L; if (q > 0 && r() < delayP) { at += 2; late++; } if (q > 0) arr[at] += q;
        const d = dem[t], s = Math.min(oh, d); served += s; lost += d - s; if (d > oh) outWeeks++; oh -= s; ohSum += oh;
        if (keep) rec.push({ d, s, oh, q, S });
        F.see(d);
      }
      return { fill: served / (served + lost), lost, avgOH: ohSum / NFUT, outWeeks, late, rec };
    }

    // ---------- state + caches
    let W = makeWorld(seed), Wkey = "";
    const st = () => ({ clean: $("#clean [aria-pressed=true]").dataset.v === "1", meth: $("#meth [aria-pressed=true]").dataset.v, L: +$("#lt").value, tgt: +$("#tgt").value, hold: +$("#hold").value, dly: +$("#dly").value });
    const cache = new Map(), memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
    const TGTS = [0.8, 0.85, 0.9, 0.925, 0.95, 0.96, 0.97, 0.98, 0.985, 0.99, 0.995, 0.998, 0.999];
    const NCURVE = 30, NMC = 500;
    const costOf = (sim, hold) => sim.avgOH * COST * hold + sim.lost * MARGIN;

    function compute(p) {
      const C = memo(`c${seed}`, () => cleanSeries(W)), y = p.clean ? C.fixed : W.raw, P = p.L + 1;
      const ev = {}; METHODS.forEach(([m]) => (ev[m] = memo(`e${seed}|${p.clean}|${m}|${P}`, () => evaluate(m, y, W, P))));
      const E = ev[p.meth], z = qnorm(p.tgt), SS = z * E.sP;
      const dem0 = memo(`d${seed}|0`, () => futureDemand(W, seed * 1000 + 1));
      const base = simulate(p.meth, y, W, p.L, SS, dem0, 0, 1, true);
      // cost curves: average of NCURVE years, no delays, per method
      const curves = {}; METHODS.forEach(([m]) => (curves[m] = memo(`k${seed}|${p.clean}|${m}|${p.L}`, () => TGTS.map((tg) => { let ohs = 0, lost = 0, fill = 0; const ss = qnorm(tg) * ev[m].sP; for (let k = 0; k < NCURVE; k++) { const dm = memo(`d${seed}|${k}`, () => futureDemand(W, seed * 1000 + 1 + k)); const s = simulate(m, y, W, p.L, ss, dm, 0, 1, false); ohs += s.avgOH; lost += s.lost; fill += s.fill; } return { tg, avgOH: ohs / NCURVE, lost: lost / NCURVE, fill: fill / NCURVE }; }))));
      const mc = memo(`m${seed}|${p.clean}|${p.meth}|${p.L}|${p.tgt}|${p.dly}`, () => { const out = []; for (let k = 0; k < NMC; k++) { const dm = memo(`d${seed}|${k}`, () => futureDemand(W, seed * 1000 + 1 + k)); out.push(simulate(p.meth, y, W, p.L, SS, dm, p.dly, 50000 + k, false)); } return out; });
      return { C, y, P, ev, E, z, SS, base, curves, mc };
    }

    // ---------- drawing
    const C1 = new Plot($("#c1"), { pad: { l: 56, b: 36 } }), C2 = new Plot($("#c2"), { pad: { l: 56, b: 36 } }), C3 = new Plot($("#c3"), { pad: { l: 64, b: 38 } }), C4 = new Plot($("#c4"), { pad: { l: 48, b: 38 } });
    const sw = (c, t, k) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">${k === "box" ? `<span style="width:12px;height:10px;background:var(${c});opacity:.7"></span>` : k === "dot" ? `<span style="width:8px;height:8px;border-radius:50%;background:var(${c})"></span>` : `<span style="width:20px;border-top:2px ${k} var(${c})"></span>`}${t}</span>`;
    const MCOL = { snaive: "--muted", hw: "--violet", hwp: "--accent" };

    function draw1(p, R) {
      C1.resize(); const y = W.raw, top = Math.max(...R.y) * 1.15, typoOff = !p.clean && W.raw[TYPO] > top;
      C1.x = [0, NHIST - 1]; C1.y = [0, top]; C1.clear();
      C1.axes({ xLabel: "week", yLabel: "units sold", xFormat: (v) => fmt(v + 1, 0), yFormat: (v) => fmt(v, 0) });
      const g = C1.ctx;
      g.fillStyle = css("--accent-soft"); g.fillRect(C1.sx(NTRAIN - 0.5), C1.pad.t, C1.sx(NHIST - 1) - C1.sx(NTRAIN - 0.5), C1.ih);
      C1.clip(() => C1.path(R.y.map((_, i) => i), R.y, css("--ink"), 1.2, null, 0.55));
      W.promo.slice(0, NHIST).forEach((f, i) => f && C1.dot(i, R.y[i], 2.6, css("--warm"), null));
      C1.path(R.E.fcs.map((_, i) => NTRAIN + i), R.E.fcs, css(MCOL[p.meth]), 2);
      if (p.clean) { R.C.flags.forEach((i) => { C1.dot(i, R.C.fixed[i], 4, null, css("--bad")); }); }
      else { const yy = Math.min(W.raw[TYPO], top * 0.98); C1.dot(TYPO, yy, 4, css("--bad"), null); if (typoOff) { g.fillStyle = css("--bad"); g.font = "11px var(--font-mono)"; g.fillText(`↑ ${int(W.raw[TYPO])}`, C1.sx(TYPO) + 6, C1.sy(yy) + 4); } }
      g.fillStyle = css("--muted"); g.font = "11px var(--font-mono)"; g.fillText("fitted on these two years", C1.sx(4), C1.sy(0) - 8); g.fillText("test year", C1.sx(NTRAIN + 2), C1.sy(0) - 8);
      $("#c1Cap").innerHTML = `${sw("--ink", "weekly sales", "solid")}${sw("--warm", "promotion week", "dot")}${sw(MCOL[p.meth], `${METHODS.find((m) => m[0] === p.meth)[1]}, one week ahead`, "solid")}${sw("--bad", p.clean ? "typo, replaced by neighbours' median" : "typo, left in", "dot")}`;
    }
    function draw2(p, R) {
      C2.resize(); const rec = R.base.rec, top = Math.max(...rec.map((r) => Math.max(r.d, r.oh + r.s))) * 1.1;
      C2.x = [-0.5, NFUT - 0.5]; C2.y = [0, top]; C2.clear();
      C2.axes({ xLabel: "week of the next year", yLabel: "units", xFormat: (v) => fmt(v + 1, 0), yFormat: (v) => fmt(v, 0) });
      const g = C2.ctx, w = (C2.sx(1) - C2.sx(0)) * 0.7;
      rec.forEach((r, t) => { g.fillStyle = css("--accent"); g.globalAlpha = 0.35; g.fillRect(C2.sx(t) - w / 2, C2.sy(r.oh + r.s), w, C2.sy(0) - C2.sy(r.oh + r.s)); g.globalAlpha = 1; if (r.d > r.s) { g.fillStyle = css("--bad"); g.fillRect(C2.sx(t) - w / 2, C2.sy(r.d), w, C2.sy(r.s) - C2.sy(r.d)); } });
      C2.path(rec.map((_, t) => t), rec.map((r) => r.d), css("--ink"), 1.4);
      C2.path([-0.5, NFUT - 0.5], [R.SS, R.SS], css("--warm"), 1.4, [5, 4]);
      $("#c2Cap").innerHTML = `${sw("--accent", "stock available that week", "box")}${sw("--ink", "demand", "solid")}${sw("--bad", "lost sales", "box")}${sw("--warm", "safety stock", "dashed")}`;
    }
    function draw3(p, R) {
      C3.resize(); const yr = (c) => c.avgOH * COST * p.hold + c.lost * MARGIN, all = METHODS.flatMap(([m]) => R.curves[m].map(yr));
      C3.x = [0.8, 0.999]; C3.y = [0, Math.min(Math.max(...all), Math.min(...all) * 3) * 1.05]; C3.clear();
      C3.axes({ xLabel: "service target", yLabel: "yearly cost", xTicks: [0.8, 0.85, 0.9, 0.95, 0.99], xFormat: (v) => fmt(v * 100, 0) + "%", yFormat: (v) => "$" + fmt(v / 1000, 1) + "k" });
      METHODS.forEach(([m]) => { const cv = R.curves[m]; C3.clip(() => C3.path(cv.map((c) => c.tg), cv.map(yr), css(MCOL[m]), m === p.meth ? 2.6 : 1.4, m === p.meth ? null : [4, 3])); });
      const cv = R.curves[p.meth], best = cv.reduce((a, c) => (yr(c) < yr(a) ? c : a));
      C3.dot(best.tg, yr(best), 5, null, css("--ink"));
      const here = yr(interp(cv, p.tgt)); C3.dot(p.tgt, here, 4.5, css(MCOL[p.meth]), css("--ink"));
      R.best = best; R.here = here; R.yr = yr;
      $("#c3Cap").innerHTML = METHODS.map(([m, l]) => sw(MCOL[m], l, m === p.meth ? "solid" : "dashed")).join("") + `<br>Open circle: cheapest target for ${METHODS.find((m) => m[0] === p.meth)[1]} (${fmt(best.tg * 100, 1)}%). Average of ${NCURVE} simulated years, no late deliveries.`;
    }
    function interp(cv, tg) { for (let i = 1; i < cv.length; i++) if (tg <= cv[i].tg + 1e-9) { const a = cv[i - 1], b = cv[i], w = (tg - a.tg) / (b.tg - a.tg); return { avgOH: a.avgOH + w * (b.avgOH - a.avgOH), lost: a.lost + w * (b.lost - a.lost), fill: a.fill + w * (b.fill - a.fill) }; } return cv[cv.length - 1]; }
    function draw4(p, R) {
      const costs = R.mc.map((s) => costOf(s, p.hold)).sort((a, b) => a - b), q = (f) => costs[Math.min(costs.length - 1, Math.floor(f * costs.length))];
      const lo = costs[0], hi = Math.max(costs[costs.length - 1], lo * 1.2), nb = 24, bw = (hi - lo) / nb, bins = Array(nb).fill(0);
      costs.forEach((c) => bins[Math.min(nb - 1, Math.floor((c - lo) / bw))]++);
      C4.resize(); C4.x = [lo, hi]; C4.y = [0, Math.max(...bins) * 1.15]; C4.clear();
      C4.axes({ xLabel: "yearly cost", yLabel: "years", xFormat: (v) => "$" + fmt(v / 1000, 1) + "k", yFormat: (v) => fmt(v, 0) });
      const g = C4.ctx; bins.forEach((n, i) => { g.fillStyle = css("--accent"); g.globalAlpha = 0.6; const x0 = C4.sx(lo + i * bw), x1 = C4.sx(lo + (i + 1) * bw); g.fillRect(x0 + 0.5, C4.sy(n), x1 - x0 - 1, C4.sy(0) - C4.sy(n)); g.globalAlpha = 1; });
      const mean = costs.reduce((a, b) => a + b, 0) / costs.length, p90 = q(0.9);
      C4.path([mean, mean], C4.y, css("--ink"), 1.6, [4, 3]); C4.path([p90, p90], C4.y, css("--bad"), 1.8);
      R.mean = mean; R.p90 = p90; R.p50 = q(0.5); R.lowFill = R.mc.filter((s) => s.fill < 0.95).length / R.mc.length;
      $("#c4Cap").innerHTML = `${sw("--accent", "simulated years", "box")}${sw("--ink", `average ${money(mean)}`, "dashed")}${sw("--bad", `P90 ${money(p90)}`, "solid")}`;
    }

    function tables(p, R) {
      const rows = METHODS.map(([m, l]) => { const e = R.ev[m], sel = m === p.meth; return `<tr${sel ? ' style="background:var(--accent-soft)"' : ""}><td>${l}${sel ? " ✓" : ""}</td><td class="num">${fmt(e.mae, 0)}</td><td class="num">${fmt((e.mae / e.meanY) * 100, 1)}%</td><td class="num">${fmt(e.bias, 0)}</td><td class="num">${fmt(e.mase, 2)}</td><td class="num">${fmt(e.sP, 0)}</td></tr>`; }).join("");
      $("#t2").innerHTML = `<thead><tr><th>Method</th><th>MAE</th><th>MAE %</th><th>Bias</th><th>MASE</th><th>Error over ${R.P} weeks (σP)</th></tr></thead><tbody>${rows}</tbody>`;
    }

    function notes(p, R) {
      const C = R.C, nm = (m) => METHODS.find((x) => x[0] === m)[1], E = R.E, bestM = METHODS.map(([m]) => m).reduce((a, m) => (R.ev[m].mase < R.ev[a].mase ? m : a));
      $("#n1").innerHTML = `Week ${TYPO + 1} shows ${int(W.raw[TYPO])} units, about ten times its neighbours' median of ${int(C.med[TYPO])}. The robust z-score, (value − neighbours' median) ÷ (1.4826 × MAD), is ${fmt(C.z[TYPO], 1)}; anything beyond 5 is flagged. ${C.flags.length === 1 ? "It is the only week flagged" : `${C.flags.length} weeks are flagged (weeks ${C.flags.map((i) => i + 1).join(", ")})`}. ${p.clean ? `It has been replaced by ${int(C.med[TYPO])}.` : "<b>It is currently left in</b>, so every step below is working from a history with one bad week."}`;
      const hw = R.ev[p.meth].F;
      $("#n2").innerHTML = `${p.meth === bestM ? `${nm(p.meth)} has the lowest MASE here.` : `${nm(bestM)} scores best on this test, not ${nm(p.meth)}.`} ${p.clean ? "" : "Careful: with the typo left in, MASE's yardstick (seasonal naive's error on the training years) is inflated too, so every MASE looks better than it is. MAE % shows the damage honestly. "}${p.meth !== "snaive" ? `Its smoothing settings were chosen on the training years: α = ${hw.a}, β = ${hw.b}, γ = ${hw.g}.` : ""} ${p.meth === "hwp" ? `Promotion weeks were divided by the average uplift, ×${fmt(hw.u, 2)}, before smoothing, and the forecast is multiplied by it again in planned promotion weeks.` : p.meth === "hw" ? "Promotion weeks are treated like any other week, so the seasonal pattern absorbs a bit of every promotion and misses the next ones." : "It copies the same week last year, including last year's promotions, which fall in different weeks this year."}`;
      $("#n3").innerHTML = `We review stock every week and the supplier takes ${p.L} week${p.L > 1 ? "s" : ""}, so each order has to cover P = ${p.L} + 1 = ${R.P} weeks before the next one lands. Over the test year, the total forecast error across ${R.P}-week windows had a root mean square of σP = <b>${int(E.sP)}</b> units (the √P shortcut would say ${int(E.rmse)} × √${R.P} = ${int(E.sqrtRule)}). For a ${fmt(p.tgt * 100, 1)}% cycle service level, z = ${fmt(R.z, 2)}, so safety stock = ${fmt(R.z, 2)} × ${int(E.sP)} = <b>${int(R.SS)}</b> units, about ${fmt(R.SS / E.meanY, 1)} weeks of average sales.`;
      const b = R.base;
      $("#tg4").textContent = fmt(p.tgt * 100, 1) + "%";
      $("#n4").innerHTML = `Each week: order up to S = (forecast for the next ${R.P} weeks) + ${int(R.SS)}, minus stock on hand and on order. Over this simulated year the rule served <b>${fmt(b.fill * 100, 1)}%</b> of demand, ran out in ${b.outWeeks} of ${NFUT} weeks (${fmt((1 - b.outWeeks / NFUT) * 100, 0)}% of weeks without a stock-out, against the ${fmt(p.tgt * 100, 1)}% target), lost ${int(b.lost)} units and held ${int(b.avgOH)} units at the end of an average week.${b.late ? ` ${b.late} order${b.late > 1 ? "s" : ""} arrived 2 weeks late.` : ""}`;
      const c = interp(R.curves[p.meth], p.tgt), hc = c.avgOH * COST * p.hold, lc = c.lost * MARGIN, bc = R.best;
      const costs = METHODS.map(([m, l]) => { const b = R.curves[m].reduce((a, c) => (R.yr(c) < R.yr(a) ? c : a)); return [l, R.yr(b), b.tg]; }), cheapest = costs.reduce((a, x) => (x[1] < a[1] ? x : a)), dearest = costs.reduce((a, x) => (x[1] > a[1] ? x : a));
      $("#n5").innerHTML = `Averaged over ${NCURVE} simulated years at the ${fmt(p.tgt * 100, 1)}% target: holding ${int(c.avgOH)} units × $${COST} × ${fmt(p.hold * 100, 0)}% = ${money(hc)} a year, plus ${int(c.lost)} lost sales × $${MARGIN} margin = ${money(lc)}. Total <b>${money(hc + lc)}</b> a year. A unit kept all year costs $${fmt(COST * p.hold, 2)}, but a lost sale costs $${MARGIN}, so it usually pays to aim high: the cheapest target for this method is ${fmt(bc.tg * 100, 1)}%, at ${money(R.yr(bc))}. Comparing each method at its own cheapest target, ${cheapest[0]} costs ${money(cheapest[1])} a year and ${dearest[0]} ${money(dearest[1])}, so the better forecast is worth about <b>${money(dearest[1] - cheapest[1])}</b> a year on this one product.`;
      $("#n6").innerHTML = `Each order has a ${fmt(p.dly * 100, 0)}% chance of arriving 2 weeks late. Across ${NMC} simulated years the average cost is ${money(R.mean)}, the median ${money(R.p50)}, and the P90, the cost beaten in 9 years out of 10, is <b>${money(R.p90)}</b>. In ${fmt(R.lowFill * 100, 0)}% of years the fill rate drops below 95%. Delays hit as lost sales because the safety stock was sized for forecast error only.`;
      $("#ro").innerHTML = [["Typo", p.clean ? "fixed" : `<span class="pill bad">left in</span>`], ["Test MASE", fmt(E.mase, 2)], [`Error over ${R.P} weeks (σP)`, int(E.sP)], ["Safety stock", int(R.SS)], ["Fill rate (sim. year)", fmt(b.fill * 100, 1) + "%"], ["Yearly cost (avg)", money(hc + lc)], ["Yearly cost P90 with delays", money(R.p90)]].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }

    function labels(p) { $("#ltV").textContent = `${p.L} week${p.L > 1 ? "s" : ""}`; $("#tgtV").textContent = fmt(p.tgt * 100, 1) + "%"; $("#holdV").textContent = fmt(p.hold * 100, 0) + "% of cost"; $("#dlyV").textContent = fmt(p.dly * 100, 0) + "%"; }
    function draw() { const p = st(); labels(p); const R = compute(p); draw1(p, R); draw2(p, R); draw3(p, R); draw4(p, R); tables(p, R); notes(p, R); }

    ["#clean", "#meth"].forEach((s) => $(s).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $(s).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); draw(); }));
    ["#lt", "#tgt", "#hold", "#dly"].forEach((s) => $(s).addEventListener("input", draw));
    $("#newH").addEventListener("click", () => { seed++; W = makeWorld(seed); cache.clear(); draw(); });
    return Lab.watch([$("#c1"), $("#c2"), $("#c3"), $("#c4")], draw);
  },
});
