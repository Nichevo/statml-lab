Lab.register({
  id: "new-product",
  group: "Forecasting",
  title: "Forecasting new products: analogues and the Bass curve",
  blurb: "No history, no time series. Borrow the launch shape of similar past products, or fit the Bass diffusion curve to the first few weeks of sales, and see which wins as weeks go by.",
  lede: "A new product has no sales history, so the usual time-series methods have nothing to work with. Planners use two ideas instead. Analogues: find past launches that should behave similarly and borrow the shape of their sales curve. The Bass diffusion model: a two-parameter curve for how adoption spreads, through early adopters who try it on their own and imitators who follow. Before launch you can only use analogues; once real sales arrive you can fit the curve and re-forecast every week.",
  quiz: [
    ["In the Bass model, what do p and q mean?", "p, the coefficient of innovation, is the share of remaining potential buyers who adopt on their own each period, from advertising or curiosity. q, the coefficient of imitation, is how strongly adoption spreads from people who already have it (word of mouth, being seen in store). Typically q is much bigger than p."],
    ["With p = 0.01 and q = 0.15 per week, when do sales peak?", "t* = ln(q/p) / (p + q) = ln(15) / 0.16 = 2.708 / 0.16 ≈ 17 weeks after launch."],
    ["Why is fitting the Bass curve to the first 3 weeks of sales risky?", "Early sales look much the same whether the product will be a slow-burn hit or a quick flop, so many combinations of p, q and m fit the first few points equally well. Forecasts swing wildly until the curve starts to bend. Analogues are steadier early on."],
    ["How should you choose analogues?", "On things that drive the sales shape: the same category and price point, similar distribution and launch support, the same season, and the same kind of customer. Use several analogues rather than one, and check that each one's own launch was not distorted by stock-outs or promotions."],
    ["What does 'scale analogues to sales so far' do?", "It keeps the average analogue shape but resizes it so that, up to this week, it matches the units actually sold. It mixes the analogues' timing with the new product's real level."],
  ],
  diy: {
    intro: "Weeks 1–52 in A2:A53. p in F1, q in F2, m (total eventual units) in F3.",
    steps: [
      ["Cumulative share adopted by week t (the Bass curve).", "B2: =(1-EXP(-($F$1+$F$2)*A2))/(1+($F$2/$F$1)*EXP(-($F$1+$F$2)*A2))"],
      ["Units sold in week t.", "C2: =$F$3*(B2-IF(A2=1,0,B1))"],
      ["Peak week.", "=LN($F$2/$F$1)/($F$1+$F$2)"],
      ["Fit to actual sales so far in D2:D(k+1): squared error per week, then Solver minimises the total by changing F1:F3 (keep p, q > 0).", "E2: =(D2-C2)^2   total: =SUM(E2:E9)"],
      ["Analogue shape: each past launch's weekly sales ÷ its 52-week total, then average across analogues.", "=AVERAGE(shareA2, shareB2, shareC2)"],
      ["Analogue forecast scaled to sales so far (k weeks).", "=avg_share2 * SUM(actual_1_to_k) / SUM(avg_share_1_to_k)"],
    ],
  },
  deeper: [
    ["Bass (1969), A new product growth for model consumer durables, Management Science 15(5)", "https://doi.org/10.1287/mnsc.15.5.215", "the original diffusion model"],
    ["Mahajan, Muller & Bass (1990), New product diffusion models in marketing: a review and directions for research, Journal of Marketing 54(1)", "https://doi.org/10.1177/002224299005400101", "20 years of evidence and extensions"],
    ["Goodwin, Dyussekeneva & Meeran (2013), The use of analogies in forecasting the annual sales of new electronics products, IMA J. Management Mathematics 24(4)", "https://doi.org/10.1093/imaman/dpr025", "how well analogues work, and how to pick them"],
    ["Hyndman & Athanasopoulos, FPP3 §6.4: Forecasting by analogy (in ch. 6, Judgmental forecasts)", "https://otexts.com/fpp3/judgmental.html", "free textbook chapter on judgment and analogies"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 58 C 20 56, 28 10, 44 10 S 70 50, 92 54" stroke-width="2.5"/><path d="M4 60 C 30 60, 40 8, 92 6" stroke-dasharray="4 3"/><g fill="currentColor"><circle cx="12" cy="56" r="2.5"/><circle cx="20" cy="50" r="2.5"/><circle cx="27" cy="36" r="2.5"/></g></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const W = 52;
    const F = (t, p, q) => (t <= 0 ? 0 : (1 - Math.exp(-(p + q) * t)) / (1 + (q / p) * Math.exp(-(p + q) * t)));
    const bass = (p, q, m) => Array.from({ length: W }, (_, i) => m * (F(i + 1, p, q) - F(i, p, q)));
    const noisy = (arr, r, cv) => arr.map((v) => Math.max(0, Math.round(v * (1 + cv * r.normal()))));
    const ANA = [["Launch A", 0.012, 0.16, 5200], ["Launch B", 0.02, 0.12, 3800], ["Launch C", 0.008, 0.19, 6100], ["Launch D", 0.03, 0.09, 2900], ["Launch E", 0.015, 0.14, 4500]];
    const TRUE = { p: 0.011, q: 0.17, m: 4800 };
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="padding:8px 8px 4px">
          <div style="padding:4px 6px 0">${h4("The Bass curve: innovators and imitators")}</div>
          <canvas id="b1" aria-label="Bass model weekly sales split into innovators and imitators"></canvas>
          <div class="legend"><span><i style="background:var(--warm)"></i>innovators (driven by p)</span><span><i style="background:var(--accent)"></i>imitators (driven by q)</span><span><i style="background:var(--violet)"></i>cumulative share (right axis)</span></div>
          <figcaption id="b1Cap"></figcaption>
        </figure>
        <figure class="plot wide" style="padding:8px 8px 4px">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:4px 6px 4px">${h4("Forecasting the new launch").replace("margin:0 0 6px", "margin:0")}
            <div class="seg" id="scale" style="min-width:300px"><button type="button" data-v="plan" aria-pressed="false">Analogues × plan</button><button type="button" data-v="sofar" aria-pressed="true">Analogues scaled to sales so far</button></div></div>
          <div id="anas" style="display:flex;flex-wrap:wrap;gap:6px 14px;padding:0 6px 6px;font-size:.84rem"></div>
          <canvas id="b2" aria-label="New product weekly sales and forecasts"></canvas>
          <div class="legend"><span><i style="background:var(--ink)"></i>sales so far</span><span><i style="background:var(--muted)"></i>what actually happened next</span><span><i style="background:var(--warm)"></i>analogue forecast</span><span><i style="background:var(--accent)"></i>Bass fitted to sales so far</span></div>
          <figcaption id="b2Cap"></figcaption>
        </figure>
        <figure class="plot wide" style="padding:8px 8px 4px">
          <div style="padding:4px 6px 0">${h4("Which method wins, week by week?")}</div>
          <canvas id="b3" aria-label="Forecast error of each method against weeks of sales history"></canvas>
          <div class="legend"><span><i style="background:var(--warm)"></i>analogues (scaled to sales so far)</span><span><i style="background:var(--accent)"></i>Bass fit</span></div>
          <figcaption id="b3Cap"></figcaption>
        </figure>
        <div class="plot" style="padding:14px">${h4("Worked out")}<div id="work" style="font:.82rem/1.9 var(--font-mono);overflow-x:auto"></div></div>`,
      panel: `
        <h4>Bass curve explorer</h4>
        <div class="ctrl"><label for="p">p, innovation (per week) <output id="pV"></output></label><input type="range" id="p" min="0.002" max="0.08" step="0.002" value="0.01"></div>
        <div class="ctrl"><label for="q">q, imitation (per week) <output id="qV"></output></label><input type="range" id="q" min="0" max="0.4" step="0.01" value="0.15"></div>
        <h4 style="margin-top:6px">New launch</h4>
        <div class="ctrl"><label for="k">Weeks of sales so far <output id="kV"></output></label><input type="range" id="k" min="0" max="30" step="1" value="8"></div>
        <div class="ctrl"><label for="plan">Planned first-year volume <output id="planV"></output></label><input type="range" id="plan" min="1000" max="10000" step="100" value="4000"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">Another launch</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The Bass model</h2>
          <div class="eq">new adopters this period = (p + q × share already adopted) × people not yet adopted<br>cumulative share F(t) = (1 − e<sup>−(p+q)t</sup>) / (1 + (q/p) e<sup>−(p+q)t</sup>)<br>sales in period t = m × (F(t) − F(t−1)); &nbsp; peak at t* = ln(q/p) / (p + q)</div>
          <p>m is the total eventual market. Early on, almost all buyers are innovators (p). As adopters accumulate, imitation (q × share adopted) takes over, sales climb to a peak, then fall as the pool of non-adopters runs dry. When q is bigger than p you get the classic bell-shaped launch; when q is below p, sales simply decay from week 1.</p>
          <p>Bass built it for durable goods, where each customer buys once. For repeat-purchase products it describes the trial and distribution rollout phase. The repeat base needs its own forecast once it settles.</p>
        </section>
        <section>
          <h2>Analogues</h2>
          <p>Before launch, pick past products that should sell in the same <i>shape</i>. Convert each one's sales to a share of its first-year total, average the shapes, and multiply by the planned volume. Once sales arrive, rescale the shape to match what has actually sold so far. The plan's volume guess is then replaced by evidence, while the analogues keep supplying the timing.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>In the explorer, set q to 0: pure innovation, sales just decay. Raise q and watch the peak move later and higher.</li>
            <li>Set weeks so far to 3. The Bass fit is all over the place, while analogues are steady. Step up week by week: around weeks 10 to 14 the Bass fit locks on.</li>
            <li>The third chart repeats this for every week from 2 to 30, so you can see where the lines cross.</li>
            <li>Untick analogues that look different (such as a fast-peaking one) and watch the analogue forecast improve or worsen.</li>
            <li>Switch to "Analogues × plan" with weeks so far at 0: that's the pre-launch forecast, only as good as the plan.</li>
          </ol>
          <p>Related: <a href="#forecast-accuracy">forecast accuracy</a>, <a href="#intermittent-demand">intermittent demand</a> (common for new items) and <a href="#demand-sensing">demand sensing</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pb1 = new Plot($("#b1"), { x: [0.5, W + 0.5], pad: { l: 50, r: 44, b: 38 } }), pb2 = new Plot($("#b2"), { x: [0.5, W + 0.5], pad: { l: 50, b: 38 } }), pb3 = new Plot($("#b3"), { x: [2, 30], pad: { l: 50, b: 38 } });
    let seed = 1, scale = "sofar", use = ANA.map(() => true), L = null;
    $("#anas").innerHTML = `<span style="color:var(--muted)">Analogues:</span>` + ANA.map((a, i) => `<label class="check"><input type="checkbox" data-a="${i}" checked> ${a[0]}</label>`).join("");

    function fitBass(y, k) {
      if (k < 2) return null;
      let best = null; const cum = y.slice(0, k).reduce((s, v) => s + v, 0);
      for (let i = 0; i < 36; i++) for (let j = 0; j < 36; j++) {
        const p = 0.002 * Math.pow(40, i / 35), q = 0.01 + (0.45 * j) / 35, s = []; for (let t = 0; t < k; t++) s.push(F(t + 1, p, q) - F(t, p, q));
        let num = 0, den = 0; s.forEach((v, t) => { num += v * y[t]; den += v * v; });
        let m = Math.max(cum, num / den); if (m > 60000) m = 60000;
        const sse = s.reduce((a, v, t) => a + (m * v - y[t]) ** 2, 0);
        if (!best || sse < best.sse) best = { p, q, m, sse };
      }
      return best;
    }
    function anaShape() {
      const sel = ANA.map((a, i) => i).filter((i) => use[i]); if (!sel.length) return null;
      const sh = new Array(W).fill(0); sel.forEach((i) => { const tot = L.ana[i].reduce((s, v) => s + v, 0); L.ana[i].forEach((v, t) => (sh[t] += v / tot / sel.length)); });
      return sh;
    }
    function anaFc(sh, y, k, mode) { if (!sh) return null; if (mode === "plan" || k === 0) return sh.map((v) => v * +$("#plan").value); const cs = sh.slice(0, k).reduce((a, b) => a + b, 0), ca = y.slice(0, k).reduce((a, b) => a + b, 0); return sh.map((v) => (v * ca) / cs); }
    const wape = (fc, y, k) => { if (!fc) return NaN; let e = 0, s = 0; for (let t = k; t < W; t++) { e += Math.abs(fc[t] - y[t]); s += y[t]; } return e / s; };

    function data() {
      const r = rng(seed * 61);
      const ana = ANA.map(([, p, q, m]) => noisy(bass(p, q, m), r, 0.12));
      const tp = seed === 1 ? TRUE.p : 0.006 + r() * 0.02, tq = seed === 1 ? TRUE.q : 0.1 + r() * 0.12, tm = seed === 1 ? TRUE.m : 3000 + r() * 4000;
      L = { ana, y: noisy(bass(tp, tq, tm), r, 0.12), tp, tq, tm };
      // error by week, for the comparison chart
      const sh = anaShape();
      L.sweep = Array.from({ length: 29 }, (_, i) => { const k = i + 2, b = fitBass(L.y, k); return { k, a: wape(anaFc(sh, L.y, k, "sofar"), L.y, k), b: b ? wape(bass(b.p, b.q, b.m), L.y, k) : NaN }; });
    }
    function d1() {
      const p = +$("#p").value, q = +$("#q").value, m = 1000, inn = [], imi = [], cum = [];
      for (let t = 1; t <= W; t++) { const Fp = F(t - 1, p, q), rem = m * (1 - Fp); inn.push(p * rem); imi.push(q * Fp * rem); cum.push(F(t, p, q)); }
      const top = Math.max(...inn.map((v, i) => v + imi[i])) * 1.15, g = pb1.ctx;
      pb1.resize(); pb1.y = [0, top]; pb1.clear(); pb1.axes({ xLabel: "week since launch", yLabel: "new buyers per week (of 1,000)", yFormat: (v) => fmt(v, 0) });
      const bw = pb1.sx(1) - pb1.sx(0);
      inn.forEach((v, i) => { const x = pb1.sx(i + 1) - bw * 0.4; g.fillStyle = css("--warm"); g.fillRect(x, pb1.sy(v), bw * 0.8, pb1.sy(0) - pb1.sy(v)); g.fillStyle = css("--accent"); g.fillRect(x, pb1.sy(v + imi[i]), bw * 0.8, pb1.sy(v) - pb1.sy(v + imi[i])); });
      pb1.path(cum.map((_, i) => i + 1), cum.map((c) => c * top), css("--violet"), 2.5);
      g.save(); g.fillStyle = css("--muted"); g.font = `11px ${css("--font-mono")}`; g.textAlign = "left"; [0, 0.5, 1].forEach((v) => g.fillText(Math.round(v * 100) + "%", pb1.w - pb1.pad.r + 6, pb1.sy(v * top) + 4)); g.restore();
      const tpk = q > p ? Math.log(q / p) / (p + q) : 0;
      $("#b1Cap").innerHTML = `p = ${p}, q = ${q}. ${q > p ? `Sales peak around <b>week ${tpk.toFixed(1)}</b> = ln(${q}/${p}) / (${p} + ${q}).` : "q ≤ p: no peak, sales fall from week 1."} By week 52, <b>${fmt(cum[W - 1] * 100, cum[W - 1] > 0.99 ? 1 : 0)}%</b> of the market has bought. Week 1 is ${Math.round((inn[0] / (inn[0] + imi[0])) * 100)}% innovators; at week 20 imitators are ${Math.round((imi[19] / (inn[19] + imi[19] || 1)) * 100)}% of buyers.`;
    }
    function d2() {
      const k = +$("#k").value, y = L.y, sh = anaShape(), af = anaFc(sh, y, k, scale), b = fitBass(y, k), bf = b ? bass(b.p, b.q, b.m) : null;
      const top = Math.max(...y, ...(af || [0]), ...(bf ? bf.slice(0, W) : [0])) * 1.1, g = pb2.ctx;
      pb2.resize(); pb2.y = [0, Math.min(top, Math.max(...y) * 2.2)]; pb2.clear(); pb2.axes({ xLabel: "week since launch", yLabel: "units per week", yFormat: (v) => fmt(v, 0) });
      if (k) { g.save(); g.fillStyle = css("--grid"); g.fillRect(pb2.sx(0.5), pb2.pad.t, pb2.sx(k + 0.5) - pb2.sx(0.5), pb2.ih); g.restore(); }
      const xs = y.map((_, i) => i + 1);
      y.forEach((v, i) => pb2.dot(i + 1, v, i < k ? 3.5 : 2.5, css(i < k ? "--ink" : "--muted")));
      if (af) pb2.path(xs, af, css("--warm"), 2.5); if (bf) pb2.path(xs, bf, css("--accent"), 2.5);
      const ea = wape(af, y, k), eb = bf ? wape(bf, y, k) : NaN, pc = (v) => (isFinite(v) ? Math.round(v * 100) + "%" : "–");
      $("#b2Cap").innerHTML = `${k ? `Shaded: the ${k} week${k > 1 ? "s" : ""} sold so far (${y.slice(0, k).reduce((a, v) => a + v, 0).toLocaleString()} units).` : "Before launch: no sales yet."} Error on the remaining weeks (WAPE): analogues <b>${pc(ea)}</b>, Bass fit <b>${bf ? pc(eb) : "needs 2+ weeks"}</b>. ${b ? `Fitted p = ${b.p.toFixed(3)}, q = ${b.q.toFixed(2)}, m = ${Math.round(b.m).toLocaleString()} (true: ${L.tp.toFixed(3)}, ${L.tq.toFixed(2)}, ${Math.round(L.tm).toLocaleString()}).` : ""}`;
      return { k, af, bf, b, ea, eb, sh };
    }
    function d3() {
      const S = L.sweep, k = +$("#k").value, cap = Math.min(1, Math.max(...S.flatMap((s) => [s.a, s.b]).filter(isFinite))), top = cap * 1.18;
      pb3.resize(); pb3.y = [0, top]; pb3.clear(); pb3.axes({ xLabel: "weeks of sales history used", yLabel: "error on rest of year (WAPE, max 100%)", yFormat: (v) => Math.round(v * 100) + "%" });
      pb3.path(S.map((s) => s.k), S.map((s) => Math.min(s.a, cap)), css("--warm"), 2.5); pb3.path(S.map((s) => s.k), S.map((s) => Math.min(s.b, cap)), css("--accent"), 2.5);
      if (k >= 2) pb3.path([k, k], [0, cap], css("--muted"), 1, [3, 3]);
      const cross = S.find((s, i) => i > 0 && s.b < s.a && S.slice(i).every((x) => x.b <= x.a * 1.05));
      $("#b3Cap").innerHTML = `Each point re-runs both methods using only the first k weeks, then scores them on weeks k+1 to 52. ${cross ? `From about <b>week ${cross.k}</b> the Bass fit is consistently as good as or better than the analogues.` : "Here the analogues stay ahead throughout: the launch looks a lot like its analogues."} Early on, the Bass fit is unreliable${S[1] && S[1].b > S[1].a ? ` (at week ${S[1].k}: ${Math.round(S[1].b * 100)}% vs ${Math.round(S[1].a * 100)}%)` : ""}.`;
    }
    function work(R) {
      const { k, sh, b } = R, y = L.y, bb = (t) => `<b style="color:var(--ink)">${t}</b>`, lines = [];
      if (sh) {
        const cs = sh.slice(0, Math.max(k, 1)).reduce((a, v) => a + v, 0), ca = y.slice(0, k).reduce((a, v) => a + v, 0);
        lines.push(`analogue shape: average of ${use.filter(Boolean).length} launches' weekly share of their first-year total; week 1 = ${(sh[0] * 100).toFixed(2)}%, week 10 = ${(sh[9] * 100).toFixed(2)}%`);
        if (scale === "plan" || k === 0) lines.push(`scale × plan: week 10 forecast = ${(sh[9] * 100).toFixed(2)}% × ${(+$("#plan").value).toLocaleString()} = ${bb(fmt(sh[9] * +$("#plan").value, 0))}`);
        else lines.push(`scale to sales so far: weeks 1–${k} sold ${ca.toLocaleString()}; the shape expects ${(cs * 100).toFixed(1)}% of the year by then → implied year = ${ca.toLocaleString()} / ${cs.toFixed(3)} = ${bb(Math.round(ca / cs).toLocaleString())}`);
      }
      if (b) {
        const tp = b.q > b.p ? Math.log(b.q / b.p) / (b.p + b.q) : 0;
        lines.push(`Bass fit: searched 1,296 (p, q) pairs, with m set by least squares for each; best p = ${b.p.toFixed(4)}, q = ${b.q.toFixed(3)}, m = ${Math.round(b.m).toLocaleString()}`);
        lines.push(`week ${k + 1} forecast = m × (F(${k + 1}) − F(${k})) = ${Math.round(b.m).toLocaleString()} × (${F(k + 1, b.p, b.q).toFixed(4)} − ${F(k, b.p, b.q).toFixed(4)}) = ${bb(fmt(b.m * (F(k + 1, b.p, b.q) - F(k, b.p, b.q)), 0))}; peak at week ${tp.toFixed(1)}`);
      } else lines.push(`Bass fit: needs at least 2 weeks of sales`);
      $("#work").innerHTML = lines.map((l) => `<div style="margin-bottom:4px">${l}</div>`).join("");
    }
    function readouts(R) {
      const pc = (v) => (isFinite(v) ? Math.round(v * 100) + "%" : "–"), better = isFinite(R.eb) && R.eb < R.ea ? "Bass" : "analogues";
      $("#ro").innerHTML = `<div class="ro"><b>Error, analogues</b><span class="num">${pc(R.ea)}</span></div><div class="ro"><b>Error, Bass fit</b><span class="num">${pc(R.eb)}</span></div><div class="ro"><b>Better this week</b><span class="pill ok">${better}</span></div>
        <div class="ro"><b>Actual first-year total</b><span class="num">${L.y.reduce((a, v) => a + v, 0).toLocaleString()}</span></div>`;
    }
    function labels() { $("#pV").textContent = (+$("#p").value).toFixed(3); $("#qV").textContent = (+$("#q").value).toFixed(2); $("#kV").textContent = $("#k").value; $("#planV").textContent = (+$("#plan").value).toLocaleString(); }
    function render() { labels(); d1(); const R = d2(); d3(); work(R); readouts(R); }
    const full = () => { data(); render(); };
    ["#p", "#q", "#k", "#plan"].forEach((s) => $(s).addEventListener("input", render));
    $("#scale").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { scale = b.dataset.v; $("#scale").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); render(); }));
    root.querySelectorAll("[data-a]").forEach((c) => c.addEventListener("change", () => { use[+c.dataset.a] = c.checked; full(); }));
    $("#newd").addEventListener("click", () => { seed++; full(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 1; use = ANA.map(() => true); root.querySelectorAll("[data-a]").forEach((c) => (c.checked = true)); scale = "sofar"; $("#scale").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === "sofar"))); full(); });
    full();
    return watch([$("#b1"), $("#b2"), $("#b3")], render);
  },
});
