Lab.register({
  id: "kalman-filter",
  group: "Forecasting",
  title: "The Kalman filter: tracking a level you can't see",
  blurb: "Weekly sales bounce around a true demand level that drifts. The Kalman filter blends each new week with its running estimate, weighting each by how much it trusts it. See the blend as two bell curves, handle missing weeks, and find the link to exponential smoothing.",
  lede: "You never see true demand, only sales that scatter around it, and the true level itself wanders. The Kalman filter keeps two numbers: its best guess of the level and how unsure it is. Each week it first lets the uncertainty grow (the level may have moved), then pulls the guess toward the new sales figure by a share K, the Kalman gain, set by how noisy the sales are versus how unsure the guess is. In steady state this is exactly simple exponential smoothing, with α = K worked out from the two noise sizes.",
  quiz: [
    ["What two numbers does the Kalman filter carry from week to week?", "The estimated level m and its variance P (how unsure it is). Every update changes both."],
    ["Your estimate has variance 100, the sales figure has noise variance 300. What's the gain, and where does the new estimate land?", "K = 100 / (100 + 300) = 0.25, so the estimate moves a quarter of the way from the old guess toward the new sales figure."],
    ["A week of data is missing. What does the filter do?", "It skips the update: the guess stays the same, but the uncertainty still grows by the process variance q². When data returns, the gain is higher, so the filter catches up faster."],
    ["How does the Kalman filter relate to simple exponential smoothing?", "For a local level model (random walk plus noise), the gain settles to a constant K*, and the update m ← m + K*(y − m) is SES with α = K*. K* depends only on the ratio of the two noise variances."],
    ["How are q and r usually chosen in practice?", "By maximum likelihood: each week's forecast error should look like a draw from N(0, P⁻ + r²). Choose q and r that make the observed errors most likely. That's how state space forecasting packages fit exponential smoothing."],
  ],
  diy: {
    intro: "Sales in B2:B101. Assumed process SD q in F1 and measurement SD r in F2. Start guess m₀ in C1 and its variance P₀ in D1 (e.g. 2500 for 'very unsure').",
    steps: [
      ["Predict: the level is carried forward, its variance grows.", "E2 (prior variance): =D1+$F$1^2"],
      ["Gain: how far to move toward the new sales figure.", "G2: =IF(ISBLANK(B2), 0, E2/(E2+$F$2^2))"],
      ["Update the level (unchanged if the week is missing).", "C2: =IF(ISBLANK(B2), C1, C1+G2*(B2-C1))"],
      ["Update the variance.", "D2: =(1-G2)*E2"],
      ["95% band around the level.", "=C2 ± 1.96*SQRT(D2)"],
      ["Steady-state gain (equals the SES α).", "P*: =($F$1^2+SQRT($F$1^4+4*$F$1^2*$F$2^2))/2   K*: =P*/(P*+$F$2^2)"],
      ["Log-likelihood to compare settings (sum this down the column, then try q and r values).", "=IF(ISBLANK(B2), 0, -0.5*(LN(2*PI()*(E2+$F$2^2))+(B2-C1)^2/(E2+$F$2^2)))"],
    ],
  },
  deeper: [
    ["Kalman (1960), A new approach to linear filtering and prediction problems, Journal of Basic Engineering 82(1)", "https://doi.org/10.1115/1.3662552", "the original paper"],
    ["Labbe, Kalman and Bayesian Filters in Python", "https://github.com/rlabbe/Kalman-and-Bayesian-Filters-in-Python", "a free interactive book that builds intuition first"],
    ["Durbin & Koopman (2012), Time Series Analysis by State Space Methods, 2nd ed., Oxford University Press", "https://doi.org/10.1093/acprof:oso/9780199641178.001.0001", "the standard reference for state space time series"],
    ["Hyndman, Koehler, Ord & Snyder (2008), Forecasting with Exponential Smoothing: The State Space Approach, Springer", "https://doi.org/10.1007/978-3-540-71918-2", "exponential smoothing as state space models"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 56 C26 56 30 14 40 14 C50 14 54 56 74 56" stroke-opacity=".45"/><path d="M20 56 C38 56 46 6 56 6 C66 6 74 56 90 56"/><path d="M4 58 H92" stroke-opacity=".5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const T = 100, QT = 4, RT = 15, M0 = 150, P0 = 2500, GAP = [30, 39], JUMP = 60;
    let seed = 3;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("Weekly sales and the filtered level")}</div><canvas id="c1" style="height:320px" aria-label="Weekly sales with the true level, the Kalman estimate and its 95% band"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "One week's update, as bell curves", 260, "Prior, measurement and posterior normal curves for the chosen week"), fig("c3", "Kalman gain each week", 260, "Kalman gain over time with its steady-state value"))}`,
      panel: `
        <p class="hint" style="margin:0">Simulated sales: the true level wanders with SD ${QT} a week, and each week's sales scatter around it with SD ${RT}. You set what the filter assumes.</p>
        <div class="ctrl"><label for="q">Assumed level drift q (SD per week) <output id="qV"></output></label><input type="range" id="q" min="0.2" max="30" step="0.2" value="4"></div>
        <div class="ctrl"><label for="r">Assumed sales noise r (SD) <output id="rV"></output></label><input type="range" id="r" min="1" max="60" step="1" value="15"></div>
        <div class="ctrl"><label for="wk">Week to inspect <output id="wkV"></output></label><input type="range" id="wk" min="1" max="${T}" step="1" value="8"></div>
        <label style="display:flex;gap:8px;align-items:center;font-size:.9rem"><input type="checkbox" id="gap"> Weeks ${GAP[0]}–${GAP[1]} missing</label>
        <label style="display:flex;gap:8px;align-items:center;font-size:.9rem"><input type="checkbox" id="jump"> Demand jumps by 60 at week ${JUMP}</label>
        <label style="display:flex;gap:8px;align-items:center;font-size:.9rem"><input type="checkbox" id="truth" checked> Show the true level</label>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn primary" id="fit" type="button">Fit q and r by maximum likelihood</button><button class="btn" id="resim" type="button">New data</button><button class="btn" id="reset" type="button">Reset</button></div>
        <p class="hint" id="fitMsg" style="margin:0"></p>`,
      notes: `
        <section>
          <h2>Two steps, every week</h2>
          <ol>
            <li><b>Predict.</b> Carry the level forward: m⁻ = m. Grow the uncertainty, because the level may have drifted: P⁻ = P + q².</li>
            <li><b>Update.</b> Compare with this week's sales y. Gain K = P⁻ / (P⁻ + r²). New level m = m⁻ + K (y − m⁻). New uncertainty P = (1 − K) P⁻.</li>
          </ol>
          <p>The bell-curve chart shows the update: the prior (what the filter believed before seeing the week), the measurement (the sales figure with its noise), and the posterior, which sits between them, closer to whichever is narrower, and is narrower than both. That's Bayes' rule for two normal distributions; see <a href="#bayesian-updating">Bayesian updating</a>.</p>
        </section>
        <section>
          <h2>The link to exponential smoothing</h2>
          <p>After a few weeks K stops changing. Its steady value K* depends only on the ratio q/r: a fast-moving level or quiet sales give a high K* (follow the data); a stable level or noisy sales give a low K* (smooth hard). The update m ← m + K*(y − m) is exactly <a href="#exponential-smoothing">simple exponential smoothing</a> with α = K*. Adding a trend to the state gives Holt's method, and seasonal states give Holt-Winters. That's why forecasting packages fit exponential smoothing by maximum likelihood: they are fitting a Kalman filter.</p>
        </section>
        <section>
          <h2>What the filter adds over plain smoothing</h2>
          <ul>
            <li><b>An honest band.</b> P tells you how sure the level is, so the band widens after missing data and narrows as data arrives.</li>
            <li><b>Missing data handled naturally.</b> Skip the update; the uncertainty keeps growing; the next real week gets more weight.</li>
            <li><b>A fast start.</b> With a vague first guess (large P₀), the early gains are near 1, so the filter locks on to the data within a few weeks.</li>
            <li><b>More states.</b> The same recipe tracks level and trend, several sensors at once, position and speed in navigation, or inventory from noisy counts. The non-linear versions are the extended and unscented Kalman filters, and particle filters.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Watch the gain chart: it starts near 1 (the first guess of ${M0} is vague) and settles within a few weeks to K*.</li>
            <li>Tick the missing weeks: the band balloons through the gap, and the gain jumps when data returns.</li>
            <li>Tick the jump, then compare q = 1 and q = 15: a small q is smooth but takes many weeks to catch up; a large q catches up fast but chases noise.</li>
            <li>Press Fit: maximum likelihood picks q and r from the data alone, without knowing the true values of ${QT} and ${RT}.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ q: +$("#q").value, r: +$("#r").value, wk: +$("#wk").value, gap: $("#gap").checked, jump: $("#jump").checked, truth: $("#truth").checked });
    let W;
    function sim(p) {
      const R = rng(seed); let lv = 200; const L = [], Y = [];
      for (let t = 1; t <= T; t++) { lv += QT * R.normal(); if (p.jump && t === JUMP) lv += 60; L.push(lv); Y.push(lv + RT * R.normal()); }
      W = { L, Y };
    }
    const obs = (p, t) => (p.gap && t + 1 >= GAP[0] && t + 1 <= GAP[1] ? null : W.Y[t]);
    function kf(p, q = p.q, r = p.r) {
      let m = M0, v = P0, ll = 0; const out = [];
      for (let t = 0; t < T; t++) { const mp = m, pp = v + q * q, y = obs(p, t); let K = 0; if (y != null) { const F = pp + r * r; K = pp / F; ll += -0.5 * (Math.log(2 * Math.PI * F) + (y - mp) ** 2 / F); m = mp + K * (y - mp); v = (1 - K) * pp; } else { m = mp; v = pp; } out.push({ mp, pp, y, K, m, v }); }
      return { out, ll };
    }
    const kStar = (q, r) => { const ps = (q * q + Math.sqrt(q ** 4 + 4 * q * q * r * r)) / 2; return ps / (ps + r * r); };
    const C1 = new Plot($("#c1"), { pad: { l: 56, b: 38 } }), C2 = new Plot($("#c2"), { pad: { l: 20, b: 38 } }), C3 = new Plot($("#c3"), { pad: { l: 50, b: 38 } });
    let F;
    function d1(p) {
      const { out } = F, xs = out.map((_, i) => i + 1), ys = W.Y.concat(W.L), g = C1.ctx;
      C1.resize(); C1.x = [0, T + 1]; C1.y = [Math.min(...ys) - 20, Math.max(...ys) + 20]; C1.clear();
      C1.axes({ xLabel: "week", yLabel: "units", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      if (p.gap) { g.fillStyle = css("--line"); g.globalAlpha = 0.5; g.fillRect(C1.sx(GAP[0] - 0.5), C1.pad.t, C1.sx(GAP[1] + 0.5) - C1.sx(GAP[0] - 0.5), C1.ih); g.globalAlpha = 1; }
      const up = out.map((o) => o.m + 1.96 * Math.sqrt(o.v)), lo = out.map((o) => o.m - 1.96 * Math.sqrt(o.v));
      C1.clip(() => { g.beginPath(); xs.forEach((x, i) => (i ? g.lineTo : g.moveTo).call(g, C1.sx(x), C1.sy(up[i]))); for (let i = T - 1; i >= 0; i--) g.lineTo(C1.sx(xs[i]), C1.sy(lo[i])); g.closePath(); g.fillStyle = css("--accent"); g.globalAlpha = 0.16; g.fill(); g.globalAlpha = 1; });
      C1.path([p.wk, p.wk], C1.y, css("--warm"), 1, [2, 3]);
      out.forEach((o, i) => { if (o.y != null) C1.dot(i + 1, o.y, 2.6, css("--muted"), css("--muted")); });
      if (p.truth) C1.path(xs, W.L, css("--ink"), 1.5, [5, 4]);
      const ks = kStar(p.q, p.r); let s = null; const ses = xs.map((_, i) => { const y = obs(p, i); if (s == null) s = y ?? M0; else if (y != null) s = s + ks * (y - s); return s; });
      C1.path(xs, out.map((o) => o.m), css("--accent"), 2.2);
      const lx = C1.pad.l + 12, ly = C1.pad.t + 30; g.font = `600 11px ${css("--font-body")}`; g.textAlign = "left"; g.textBaseline = "middle";
      const item = (i, draw, label, col) => { draw(ly + i * 17); g.fillStyle = col; g.fillText(label, lx + 28, ly + i * 17); };
      const line = (col, w, dash) => (y) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash); g.beginPath(); g.moveTo(lx, y); g.lineTo(lx + 22, y); g.stroke(); g.setLineDash([]); };
      item(0, line(css("--accent"), 2.2, []), "Kalman estimate, with 95% band", css("--accent"));
      let n = 1; if (p.truth) item(n++, line(css("--ink"), 1.5, [5, 4]), "true level (hidden in real life)", css("--ink"));
      item(n, (y) => { g.fillStyle = css("--muted"); g.beginPath(); g.arc(lx + 11, y, 3, 0, 7); g.fill(); }, "weekly sales", css("--muted"));
      const rk = Math.sqrt(out.slice(5).reduce((t, o, i) => t + (o.m - W.L[i + 5]) ** 2, 0) / (T - 5)), rs = Math.sqrt(ses.slice(5).reduce((t, v, i) => t + (v - W.L[i + 5]) ** 2, 0) / (T - 5));
      const ry = Math.sqrt(W.Y.slice(5).reduce((t, v, i) => t + (v - W.L[i + 5]) ** 2, 0) / (T - 5));
      F.err = { rk, rs, ry, ks };
      $("#c1Cap").innerHTML = `Error against the true level, weeks 6–${T} (root mean square): Kalman ${fmt(rk, 1)}; exponential smoothing (α = K* = ${fmt(ks, 3)}) ${fmt(rs, 1)}; raw sales ${fmt(ry, 1)}. The two smoothers differ only in the first weeks${p.gap ? " and after the gap, where the filter's higher gain catches up faster" : ""}.`;
    }
    function d2(p) {
      const o = F.out[p.wk - 1], r = p.r, sp = Math.sqrt(o.pp), sv = Math.sqrt(o.v), g = C2.ctx;
      const c = [o.mp, o.y ?? o.mp, o.m], w = Math.max(sp, o.y != null ? r : 0) * 3.2, lo = Math.min(...c) - w, hi = Math.max(...c) + w;
      const pdf = (x, mu, s) => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI)), xs = Array.from({ length: 201 }, (_, i) => lo + ((hi - lo) * i) / 200);
      const curves = [[o.mp, sp, "--muted", "before: prior", [5, 4]]]; if (o.y != null) curves.push([o.y, r, "--warm", "this week's sales", [2, 3]]); curves.push([o.m, sv, "--accent", "after: posterior", []]);
      const top = Math.max(...curves.map(([mu, s]) => pdf(mu, mu, s)));
      C2.resize(); C2.x = [lo, hi]; C2.y = [0, top * 1.35]; C2.clear(); C2.axes({ xLabel: "level (units)", yTicks: [], xFormat: (v) => fmt(v, 0), xCount: 5 });
      curves.forEach(([mu, s, col, , dash]) => { C2.path(xs, xs.map((x) => pdf(x, mu, s)), css(col), dash.length ? 1.8 : 2.4, dash); C2.path([mu, mu], [0, pdf(mu, mu, s)], css(col), 1, [2, 2]); });
      if (p.truth) C2.path([W.L[p.wk - 1], W.L[p.wk - 1]], C2.y, css("--ink"), 1, [5, 4]);
      g.font = `600 11px ${css("--font-body")}`; g.textAlign = "left"; g.textBaseline = "middle"; const lx = C2.pad.l + 8;
      curves.forEach(([, , col, lab, dash], i) => { const y = C2.pad.t + 10 + i * 16; g.strokeStyle = css(col); g.lineWidth = 2; g.setLineDash(dash); g.beginPath(); g.moveTo(lx, y); g.lineTo(lx + 20, y); g.stroke(); g.setLineDash([]); g.fillStyle = css(col); g.fillText(lab, lx + 26, y); });
      $("#c2Cap").innerHTML = o.y == null ? `Week ${p.wk} is missing, so there is no update: the estimate stays at ${fmt(o.mp, 1)} and its SD stays at ${fmt(sp, 1)}.` :
        `Week ${p.wk}. Prior ${fmt(o.mp, 1)} with SD √(P + q²) = ${fmt(sp, 1)}; sales ${fmt(o.y, 1)} with noise SD ${r}. Gain K = ${fmt(o.pp, 0)} / (${fmt(o.pp, 0)} + ${r}²) = ${fmt(o.K, 3)}, so the estimate moves to ${fmt(o.mp, 1)} + ${fmt(o.K, 3)} × (${fmt(o.y, 1)} − ${fmt(o.mp, 1)}) = ${fmt(o.m, 1)}, with SD ${fmt(sv, 1)}.${p.truth ? ` The true level was ${fmt(W.L[p.wk - 1], 1)} (thin dashed line).` : ""}`;
    }
    function d3(p) {
      const ks = kStar(p.q, p.r), K = F.out.map((o) => o.K), xs = K.map((_, i) => i + 1);
      C3.resize(); C3.x = [0, T + 1]; C3.y = [0, 1]; C3.clear(); C3.axes({ xLabel: "week", yLabel: "gain K", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 1) });
      C3.path([0, T + 1], [ks, ks], css("--violet"), 1.5, [5, 4]); C3.path(xs, K, css("--accent"), 2); C3.path([p.wk, p.wk], C3.y, css("--warm"), 1, [2, 3]);
      const g = C3.ctx; g.font = `600 11px ${css("--font-body")}`; g.fillStyle = css("--violet"); g.textAlign = "right"; g.textBaseline = ks > 0.85 ? "top" : "bottom"; g.fillText(`K* = ${fmt(ks, 3)}`, C3.w - C3.pad.r - 4, C3.sy(ks) + (ks > 0.85 ? 3 : -3));
      const settle = K.findIndex((k, i) => i > 0 && Math.abs(k - ks) < 0.01);
      $("#c3Cap").innerHTML = `Starts at ${fmt(K[0], 2)} because the first guess (${M0}, SD ${Math.sqrt(P0)}) is vague${settle > 0 ? `; within 0.01 of the steady value by week ${settle + 1}` : ""}. Steady gain K* = ${fmt(ks, 3)} is the α simple exponential smoothing would use. It depends only on q / r = ${fmt(p.q / p.r, 2)}.${p.gap ? " Gain is 0 in the missing weeks." : ""}`;
    }
    function readouts(p) {
      const e = F.err;
      $("#ro").innerHTML = [["Steady gain K* (= SES α)", fmt(e.ks, 3)], ["Error: Kalman vs truth", fmt(e.rk, 1)], ["Error: raw sales vs truth", fmt(e.ry, 1)], ["Log-likelihood", fmt(F.ll, 1)]].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function labels(p) { $("#qV").textContent = fmt(p.q, 1); $("#rV").textContent = p.r; $("#wkV").textContent = p.wk; }
    function draw() { const p = P(); labels(p); F = kf(p); d1(p); d2(p); d3(p); readouts(p); }
    function fit() {
      const p = P(); let best = [-Infinity, 1, 1];
      for (let a = 0; a <= 60; a++) for (let b = 0; b <= 50; b++) { const q = 0.2 * Math.pow(150, a / 60), r = Math.pow(60, b / 50), { ll } = kf(p, q, r); if (ll > best[0]) best = [ll, q, r]; }
      const q = Math.min(30, Math.max(0.2, Math.round(best[1] / 0.2) * 0.2)), r = Math.min(60, Math.max(1, Math.round(best[2])));
      $("#q").value = q; $("#r").value = r; draw();
      $("#fitMsg").textContent = `Best fit: q ≈ ${fmt(best[1], 1)}, r ≈ ${fmt(best[2], 1)} (the data were made with ${QT} and ${RT}). With only ${T} weeks the estimates are rough: press New data and Fit again to see how much they vary. Sliders set to the nearest steps.`;
    }
    ["q", "r", "wk"].forEach((id) => $("#" + id).addEventListener("input", () => { $("#fitMsg").textContent = ""; draw(); }));
    ["gap", "jump"].forEach((id) => $("#" + id).addEventListener("change", () => { sim(P()); draw(); }));
    $("#truth").addEventListener("change", draw);
    $("#fit").addEventListener("click", fit);
    $("#resim").addEventListener("click", () => { seed++; sim(P()); $("#fitMsg").textContent = ""; draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); $("#gap").checked = false; $("#jump").checked = false; $("#truth").checked = true; seed = 3; $("#fitMsg").textContent = ""; sim(P()); draw(); });
    sim(P()); draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
