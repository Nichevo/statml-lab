Lab.register({
  id: "demand-sensing",
  group: "Supply chain",
  title: "Demand sensing",
  blurb: "Use the latest sales signals to correct the next few weeks of forecast. See how much it helps, and how fast the benefit fades with the horizon.",
  lede: "A monthly plan is built weeks in advance and can't see this week's heatwave, a competitor's stockout or a viral post. Demand sensing takes the newest data, last week's sales and the first days of this week, and uses it to adjust the short-term forecast. It works when short-term surprises persist for a while, and only for the next few weeks.",
  quiz: [
    ["Last week sold 20% above plan and surprises persist with φ = 0.6. What adjustment does sensing make for next week, and for 3 weeks out?", "Next week: +0.6 × 20% = +12%. Three weeks out: 0.6³ × 20% ≈ +4%. The adjustment shrinks geometrically, which is why sensing mainly helps the next week or two."],
    ["If surprises don't persist at all (φ = 0), what can sensing still do?", "It can't learn anything from last week, but partial sales from the current week still tell you about this week. So it helps at lag 0 and nowhere else."],
    ["Monday and Tuesday sales are usually 24% of the week. This Monday–Tuesday sold 300 against a plan of 1,000 for the week. What does the partial week suggest?", "300 / 0.24 = 1,250, so the week is running 25% above plan. Two days is a small sample, so blend it with the plan rather than trusting it fully."],
    ["Why can demand sensing hurt?", "If surprises are mostly random noise, reacting to them chases noise, which adds error and nervousness. Check it with FVA at each lag before trusting it."],
  ],
  deeper: [
    ["FPP3: ARIMA models", "https://otexts.com/fpp3/arima.html", "autocorrelated errors are what make sensing work"],
    ["FPP3: Dynamic regression", "https://otexts.com/fpp3/dynamic.html", "adding outside signals (weather, promotions) to forecasts"],
    ["Nowcasting — Wikipedia", "https://en.wikipedia.org/wiki/Nowcasting_(economics)", "the same idea in economics: estimating the present from partial data"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 40 L50 40" opacity=".5" stroke-dasharray="4 3"/><path d="M4 42 L14 38 L24 44 L34 30 L44 26 L50 22"/><path d="M50 22 L70 30 L92 38" stroke-dasharray="5 3"/><circle cx="50" cy="22" r="4" fill="currentColor"/><path d="M58 12 Q62 8 66 12 M54 6 Q62 -2 70 6" opacity=".7"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const T = 520, SHOW = 40, LAGS = 6;
    const SHARE = [0.12, 0.12, 0.13, 0.14, 0.16, 0.19, 0.14], DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="dsc" aria-label="Weekly actuals, the plan forecast and the sensed forecast"></canvas>
          <div class="legend"><span><i style="background:var(--ink)"></i>Actual</span><span><i style="background:var(--muted)"></i>Plan forecast (made months ahead)</span><span><i style="background:var(--accent)"></i>Sensed forecast (1 week ahead)</span></div>
          <figcaption>The last ${SHOW} weeks of a 10-year simulation.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="dsl" aria-label="MAPE by lag for plan and sensed forecasts"></canvas>
          <div class="legend"><span><i style="background:var(--muted);height:10px;opacity:.5"></i>Plan forecast</span><span><i style="background:var(--accent);height:10px"></i>Sensed forecast</span></div>
          <figcaption>MAPE by lag. Lag 0 is the current week with some days already sold; lag 1 is next week. The gap is the value added by sensing.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">This week's sensing, worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.84rem;line-height:1.9"></div>
        </div>`,
      panel: `
        <div>
          <h4>The world</h4>
          <div class="ctrl"><label for="sz">Size of surprises (SD) <output id="szV"></output></label><input type="range" id="sz" min="0" max="0.3" step="0.01" value="0.12"></div>
          <div class="ctrl"><label for="phi">How long surprises last (φ) <output id="phiV"></output></label><input type="range" id="phi" min="0" max="0.95" step="0.05" value="0.7"></div>
          <div class="ctrl"><label for="nz">Pure noise (SD) <output id="nzV"></output></label><input type="range" id="nz" min="0" max="0.2" step="0.01" value="0.05"></div>
        </div>
        <div>
          <h4>Sensing</h4>
          <div class="ctrl"><label for="kd">Days of this week already sold <output id="kdV"></output></label><input type="range" id="kd" min="0" max="5" step="1" value="2"></div>
        </div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New random history</button></div>`,
      notes: `
        <section>
          <h2>The two signals</h2>
          <p><b>1. Last week's surprise.</b> If last week ran 20% above plan and surprises tend to persist, next week probably will too, a little less:</p>
          <div class="eq">surprise s = actual / plan − 1<br>sensed(h weeks ahead) = plan × (1 + φ<sup>h</sup> × s)</div>
          <p>φ is estimated from history as the correlation between one week's surprise and the next.</p>
          <p><b>2. This week so far.</b> Sales in the first k days, divided by those days' usual share of the week, give an early read on the whole week. It's blended with signal 1, trusting it more as more days come in.</p>
          <div class="eq">week estimate = partial sales / share of week sold<br>weight on it = share / (share + 0.15)</div>
        </section>
        <section>
          <h2>Where it helps, and where it doesn't</h2>
          <ul>
            <li>It helps the <b>next few weeks</b> only. The correction shrinks by φ each week, so beyond a few weeks the plan forecast is all that's left.</li>
            <li>It helps execution decisions: store replenishment, truck loads, short-term production. It doesn't help decisions locked further out, inside a <a href="#frozen-zones">frozen zone</a>.</li>
            <li>It needs surprises that <b>persist</b>. Pure noise has nothing to sense.</li>
            <li>Real systems add more signals: weather forecasts, promotions, point-of-sale data from retailers, web traffic. The structure is the same, just more inputs.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set φ to 0. Sensing now only helps lag 0 (from the partial week); lags 1+ show no gain.</li>
            <li>Set φ to 0.95. Surprises last for weeks, and sensing helps far out.</li>
            <li>Move "days already sold" from 0 to 5. Lag 0 error drops as more of the week is known.</li>
            <li>Set the size of surprises to 0 and pure noise to 0.15. There's nothing to sense: lag 0 still improves a little from the partial week, but lag 1+ shows no gain. In a real business, chasing that noise is how sensing ends up adding error.</li>
          </ol>
          <p>Measure it like any forecast step, lag by lag, with <a href="#forecast-value-added">FVA</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pW = new Plot($("#dsc"), { x: [-0.5, SHOW - 0.5], pad: { l: 52 } });
    const pL = new Plot($("#dsl"), { x: [-0.6, LAGS + 0.6], pad: { l: 52 } });
    let seed = 8, R = null;

    function compute() {
      const r = rng(seed), sz = +$("#sz").value, phi = +$("#phi").value, nz = +$("#nz").value, kd = +$("#kd").value;
      const plan = [], act = [], daily = [];
      let s = 0;
      for (let t = 0; t < T + LAGS + 2; t++) {
        const p = 1000 * (1 + 0.2 * Math.sin((2 * Math.PI * t) / 52));
        s = phi * s + sz * Math.sqrt(1 - phi * phi) * r.normal();
        const a = Math.max(0, p * (1 + s) * (1 + nz * r.normal()));
        const dd = SHARE.map((sh) => Math.max(0, a * sh * (1 + 0.08 * r.normal())));
        const tot = dd.reduce((x, y) => x + y, 0);
        plan.push(p); act.push(tot); daily.push(dd);
      }
      const sur = act.map((a, t) => a / plan[t] - 1);
      // estimate phi from the first half (lag-1 autocorrelation of surprises)
      let num = 0, den = 0; for (let t = 1; t < T / 2; t++) { num += sur[t] * sur[t - 1]; den += sur[t - 1] ** 2; }
      const ph = den > 0 ? Math.max(0, Math.min(0.98, num / den)) : 0;
      const share = SHARE.slice(0, kd).reduce((x, y) => x + y, 0), w = kd ? share / (share + 0.15) : 0;
      // sensed forecast for week t made at end of week t-h (h>=1), or during week t with kd days (h=0)
      const sensed = (t, h) => {
        if (h >= 1) return plan[t] * (1 + Math.pow(ph, h) * sur[t - h]);
        const prior = ph * sur[t - 1];
        if (!kd) return plan[t] * (1 + prior);
        const part = daily[t].slice(0, kd).reduce((x, y) => x + y, 0), est = part / share / plan[t] - 1;
        return plan[t] * (1 + w * est + (1 - w) * prior);
      };
      const mape = (f) => { let e = 0, c = 0; for (let t = T / 2; t < T; t++) { e += Math.abs(act[t] - f(t)) / act[t]; c++; } return (e / c) * 100; };
      const lags = Array.from({ length: LAGS + 1 }, (_, h) => ({ h, plan: mape((t) => plan[t]), sens: mape((t) => sensed(t, h)) }));
      R = { plan, act, daily, sur, ph, w, share, kd, sensed, lags };
    }

    function draw() {
      const { plan, act, daily, sur, ph, w, share, kd, sensed, lags } = R;
      $("#szV").textContent = "±" + Math.round(+$("#sz").value * 100) + "%"; $("#phiV").textContent = (+$("#phi").value).toFixed(2);
      $("#nzV").textContent = "±" + Math.round(+$("#nz").value * 100) + "%"; $("#kdV").textContent = kd ? `${kd} (${DOW.slice(0, kd).join("–")})` : "none";

      const t0 = T - SHOW, xs = Array.from({ length: SHOW }, (_, i) => i), sl = (f) => xs.map((i) => f(t0 + i));
      const A = sl((t) => act[t]), P = sl((t) => plan[t]), S1 = sl((t) => sensed(t, 1));
      const all = A.concat(P, S1);
      pW.y = [Math.min(...all) * 0.95, Math.max(...all) * 1.04];
      pW.clear(); pW.axes({ xLabel: "week", yLabel: "units", xFormat: (v) => String(v + 1) });
      pW.path(xs, P, css("--muted"), 2, [6, 4]);
      pW.path(xs, S1, css("--accent"), 2.4);
      pW.path(xs, A, css("--ink"), 2);
      A.forEach((v, i) => pW.dot(i, v, 3, css("--ink")));

      const hi = Math.max(...lags.map((l) => Math.max(l.plan, l.sens))) * 1.15 || 1;
      pL.y = [0, hi]; pL.clear();
      pL.axes({ xTicks: lags.map((l) => l.h), xLabel: "lag (weeks ahead)", yLabel: "MAPE %", yCount: 4 });
      const g = pL.ctx, bw = (pL.sx(1) - pL.sx(0)) * 0.32;
      g.save();
      lags.forEach((l) => {
        g.globalAlpha = 0.45; g.fillStyle = css("--muted"); g.fillRect(pL.sx(l.h) - bw - 1, pL.sy(l.plan), bw, pL.sy(0) - pL.sy(l.plan));
        g.globalAlpha = 1; g.fillStyle = css("--accent"); g.fillRect(pL.sx(l.h) + 1, pL.sy(l.sens), bw, pL.sy(0) - pL.sy(l.sens));
      });
      g.restore();

      const fva = (l) => l.plan - l.sens;
      $("#ro").innerHTML = `<div class="ro" style="font-size:.78rem;color:var(--muted)"><b>MAPE</b><span>plan → sensed</span></div><div class="ro"><b>φ estimated from history</b><span class="num">${ph.toFixed(2)}</span></div>` +
        lags.slice(0, 4).map((l) => `<div class="ro"><b>Lag ${l.h} MAPE</b><span class="num">${l.plan.toFixed(1)}% → <span class="pill ${fva(l) > 0.2 ? "ok" : fva(l) < -0.2 ? "bad" : "idle"}">${l.sens.toFixed(1)}%</span></span></div>`).join("");

      // worked example for the last week
      const t = T - 1, b = (x) => `<b style="color:var(--ink)">${x}</b>`, mu = (x) => `<span style="color:var(--muted)">${x}</span>`;
      const pct = (v) => (v > 0 ? "+" : "") + (v * 100).toFixed(1) + "%";
      const lines = [
        `plan for this week = ${b(fmt(plan[t], 0))}`,
        `last week: actual ${fmt(act[t - 1], 0)} vs plan ${fmt(plan[t - 1], 0)} → surprise s = ${b(pct(sur[t - 1]))}`,
        `carry-over: φ × s = ${ph.toFixed(2)} × ${pct(sur[t - 1])} = ${b(pct(ph * sur[t - 1]))} ${mu(`→ next-week forecast ${fmt(plan[t] * (1 + ph * sur[t - 1]), 0)}`)}`,
      ];
      if (kd) {
        const part = daily[t].slice(0, kd).reduce((x, y) => x + y, 0), est = part / share;
        lines.push(`${DOW.slice(0, kd).join("–")} sold ${b(fmt(part, 0))}, usually ${(share * 100).toFixed(0)}% of the week → week on track for ${fmt(part, 0)} / ${share.toFixed(2)} = ${b(fmt(est, 0))} (${pct(est / plan[t] - 1)})`);
        lines.push(`blend: ${w.toFixed(2)} × ${pct(est / plan[t] - 1)} + ${(1 - w).toFixed(2)} × ${pct(ph * sur[t - 1])} = ${b(pct(sensed(t, 0) / plan[t] - 1))}`);
      } else lines.push(mu("No days of this week sold yet, so lag 0 uses the carry-over only."));
      lines.push(`sensed forecast for this week = ${b(fmt(sensed(t, 0), 0))} ${mu(`vs plan ${fmt(plan[t], 0)}; actual turned out ${fmt(act[t], 0)}`)}`);
      $("#work").innerHTML = lines.map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    const rerun = () => { compute(); draw(); };
    ["#sz", "#phi", "#nz", "#kd"].forEach((s) => $(s).addEventListener("input", rerun));
    $("#newd").addEventListener("click", () => { seed++; rerun(); });
    rerun();
    return watch([pW.c, pL.c], (resized) => { if (resized) { pW.resize(); pL.resize(); } draw(); });
  },
});
