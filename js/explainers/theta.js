Lab.register({
  id: "theta",
  group: "Forecasting",
  title: "The Theta method: a simple winner",
  blurb: "Theta won the M3 forecasting competition with a disarmingly simple recipe: split the series into a long-run trend line and a 'wiggle-amplified' line, forecast each the easy way, and average them.",
  lede: "In the M3 competition (3,003 series), a method that sounded exotic beat far more complex ones. The Theta method takes a (seasonally adjusted) series and builds 'theta lines' from it. Theta = 0 flattens all the curvature away, leaving the straight regression trend: good for the long run. Theta = 2 doubles the curvature: good at following recent movements. Forecast the first by extending the line, the second by simple exponential smoothing, and average the two. It was later shown to be equivalent to simple exponential smoothing plus a drift of half the trend slope, which explains why it works: it hedges between 'the trend continues' and 'the recent level holds'.",
  quiz: [
    ["What does the theta = 0 line look like, and why?", "A straight line: the least-squares trend through the data. Theta scales the second differences (the curvature) of the series, and theta = 0 removes them all, leaving only the line."],
    ["Why forecast the theta = 2 line with simple exponential smoothing rather than extending it?", "Theta = 2 exaggerates recent ups and downs, so it captures the current level well, which is what SES is for. Extending its wiggles would be noisy."],
    ["The Theta forecast is equivalent to SES plus what?", "A linear drift equal to half the slope of the regression trend line (Hyndman & Billah, 2003). Half, because the trend line gets weight ½ in the average."],
    ["What must you do first with monthly data that has seasonality?", "Seasonally adjust it (the original method uses classical multiplicative decomposition), apply Theta to the adjusted series, then multiply the seasonal indices back onto the forecast."],
    ["Why might Theta beat Holt's linear method on many real series?", "Holt projects the full recent trend, which overshoots when trends fade, as they usually do. Theta's half-trend is a built-in dampening, a sensible compromise when you don't know if the trend will last."],
  ],
  diy: {
    intro: "Seasonally adjusted series in B2:B61 (60 months), time index t = 1…60 in A2:A61. Forecast horizon h in column D for months 61–72.",
    steps: [
      ["Regression trend (the theta = 0 line).", "slope: =SLOPE(B2:B61,A2:A61)   intercept: =INTERCEPT(B2:B61,A2:A61)"],
      ["Theta = 2 line: twice the data minus the trend line.", "C2: =2*B2-($G$1+$G$2*A2)"],
      ["Simple exponential smoothing of the theta = 2 line (α in G3).", "E2: =C2   E3: =$G$3*C3+(1-$G$3)*E2"],
      ["Forecast of the theta = 0 line for month 60 + h.", "=$G$1+$G$2*(60+h)"],
      ["Forecast of the theta = 2 line: flat at the last smoothed level.", "=$E$61"],
      ["Theta forecast = average of the two (then multiply by the seasonal index if you adjusted).", "=0.5*(G1+G2*(60+h)) + 0.5*$E$61"],
    ],
  },
  deeper: [
    ["Assimakopoulos & Nikolopoulos (2000), The theta model: a decomposition approach to forecasting, IJF 16(4)", "https://doi.org/10.1016/S0169-2070(00)00066-2", "the original method"],
    ["Hyndman & Billah (2003), Unmasking the Theta method, IJF 19(2)", "https://doi.org/10.1016/S0169-2070(01)00143-1", "shows Theta is SES with drift"],
    ["Makridakis & Hibon (2000), The M3-Competition: results, conclusions and implications, IJF 16(4)", "https://doi.org/10.1016/S0169-2070(00)00057-1", "where Theta came out on top"],
    ["Fiorucci, Pellegrini, Louzada, Petropoulos & Koehler (2016), Models for optimising the theta method and their relationship to state space models, IJF 32(4)", "https://doi.org/10.1016/j.ijforecast.2016.02.005", "optimised Theta variants"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 46 L16 38 L24 44 L34 30 L44 36 L54 24 L62 30" stroke-opacity=".5"/><path d="M6 46 L62 26 L90 16" stroke-dasharray="4 3"/><path d="M62 28 H90" stroke-dasharray="2 3"/><path d="M62 28 L90 22" stroke-width="2.5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const N = 72, H = 12, NT = N - H, MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const key = (c, t, dash) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><svg width="20" height="8"><path d="M1 4 H19" stroke="${c}" stroke-width="2.5" ${dash ? 'stroke-dasharray="4 3"' : ""}/></svg>${t}</span>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0"><div style="padding:4px 6px 0">${h4("Theta lines (seasonally adjusted series)")}</div><canvas id="h1" aria-label="Seasonally adjusted series with theta lines"></canvas><div id="h1Key" style="padding:0 8px;font-size:.82rem;color:var(--muted)"></div><figcaption id="h1Cap"></figcaption></figure>
        <figure class="plot wide" style="margin:0"><div style="padding:4px 6px 0">${h4("Forecast for the last 12 months vs what happened")}</div><canvas id="h2" aria-label="Forecasts from Theta, SES, Holt and naive against actuals"></canvas><div id="h2Key" style="padding:0 8px;font-size:.82rem;color:var(--muted)"></div><figcaption id="h2Cap"></figcaption></figure>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Error against the weight on the trend line")}</div><canvas id="h3" aria-label="Hold-out error against weight on the theta 0 line"></canvas><figcaption id="h3Cap"></figcaption></figure>`,
          `<div class="plot" style="padding:14px">${h4("Worked out")}<div id="work" style="font:.8rem/1.8 var(--font-mono)"></div></div>`)}`,
      panel: `
        <p class="hint" style="margin:0">Monthly sales, 5 years of history plus a 12-month hold-out to score the forecasts.</p>
        <div class="ctrl"><label for="tr">Underlying trend (units per month) <output id="trV"></output></label><input type="range" id="tr" min="-1.5" max="3" step="0.1" value="1.2"></div>
        <div class="ctrl"><label for="fade">Trend fades over the last two years <output id="fadeV"></output></label><input type="range" id="fade" min="0" max="1" step="0.1" value="0.6"></div>
        <div class="ctrl"><label for="ss">Seasonal swing <output id="ssV"></output></label><input type="range" id="ss" min="0" max="0.4" step="0.02" value="0.2"></div>
        <div class="ctrl"><label for="nz">Noise <output id="nzV"></output></label><input type="range" id="nz" min="0" max="0.15" step="0.01" value="0.06"></div>
        <div class="ctrl"><label for="al">SES smoothing α for the θ = 2 line <output id="alV"></output></label><input type="range" id="al" min="0.05" max="1" step="0.05" value="0.3"></div>
        <div class="ctrl"><label for="w">Weight on the trend line (θ = 0) <output id="wV"></output></label><input type="range" id="w" min="0" max="1" step="0.05" value="0.5"></div>
        <div class="ctrl"><label for="th">Show an extra theta line, θ = <output id="thV"></output></label><input type="range" id="th" min="-1" max="3" step="0.25" value="1"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New series</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Theta lines</h2>
          <p>A theta line keeps the series' mean and trend but scales its curvature (second differences) by θ. In practice it's a blend of the data and its straight trend line L:</p>
          <div class="eq">Z(θ) = θ × data + (1 − θ) × L &nbsp;&nbsp; so Z(0) = L, Z(1) = data, Z(2) = 2 × data − L</div>
          <p>θ below 1 smooths towards the long-run trend; above 1 exaggerates short-term movement.</p>
        </section>
        <section>
          <h2>The standard recipe</h2>
          <ol>
            <li>Test for seasonality; if present, divide by classical multiplicative seasonal indices.</li>
            <li>Extend Z(0), the trend line, into the future.</li>
            <li>Forecast Z(2) with simple exponential smoothing (a flat line at the last smoothed level).</li>
            <li>Average the two forecasts with equal weights, and put the seasonality back.</li>
          </ol>
          <p>Because Z(0) and Z(2) average back to the data, the combination is a compromise that keeps the level right while projecting only half the trend.</p>
        </section>
        <section>
          <h2>Where it fits</h2>
          <p>Theta is a strong, cheap benchmark for monthly and quarterly series with a trend, and a good member of a <a href="#ensemble-forecasts">forecast ensemble</a>. It has no notion of promotions or other drivers, and for strongly multiplicative or changing seasonality other methods do better. Optimised variants choose θ and the weights from the data.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>With the trend partly fading (the default), Theta sits between SES (no trend) and Holt (full trend) and scores best.</li>
            <li>Set the fade to 0 so the trend carries on: Holt wins. Set it to 100%: SES wins. Theta is rarely the very best and rarely bad, which is why it does so well across thousands of series.</li>
            <li>Drag the extra theta line from −1 to 3 to see curvature being removed and amplified.</li>
          </ol>
          <p>Related: <a href="#exponential-smoothing">exponential smoothing</a>, <a href="#seasonal-decomposition">seasonal decomposition</a>, <a href="#forecast-accuracy">accuracy measures</a> and <a href="#forecast-lab">the forecast lab</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let seed = 6, E = null, S = null;
    const gen = () => { const r = rng(seed * 29 + 11); E = Array.from({ length: N }, () => r.normal()); };
    gen();
    const ses = (z, a) => { let l = z[0]; const fit = [l]; for (let t = 1; t < z.length; t++) { l = a * z[t] + (1 - a) * l; fit.push(l); } return { l, fit }; };
    const ols = (y) => { const n = y.length, mx = (n + 1) / 2, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0; y.forEach((v, i) => { sxy += (i + 1 - mx) * (v - my); sxx += (i + 1 - mx) ** 2; }); const b = sxy / sxx; return { a: my - b * mx, b }; };
    function compute() {
      const tr = +$("#tr").value, fade = +$("#fade").value, ss = +$("#ss").value, nz = +$("#nz").value, al = +$("#al").value, w = +$("#w").value;
      let lvl = 100; const y = [];
      for (let t = 0; t < N; t++) { const f = t >= N - 24 ? 1 - fade * Math.min(1, (t - (N - 24)) / 12) : 1; lvl += tr * f; y.push(lvl * (1 + ss * Math.sin((2 * Math.PI * (t - 2)) / 12)) * (1 + nz * E[t])); }
      const tr0 = y.slice(0, NT);
      // classical multiplicative seasonal indices from centred 2x12 moving average
      const ratio = Array.from({ length: 12 }, () => []);
      for (let t = 6; t < NT - 6; t++) { let s = 0; for (let k = -6; k <= 6; k++) s += (Math.abs(k) === 6 ? 0.5 : 1) * tr0[t + k]; ratio[t % 12].push(tr0[t] / (s / 12)); }
      let si = ratio.map((r) => r.reduce((a, b) => a + b, 0) / r.length); const sm = si.reduce((a, b) => a + b, 0) / 12; si = si.map((v) => (ss > 0 ? v / sm : 1));
      const sa = tr0.map((v, t) => v / si[t % 12]), L = ols(sa), line = (t) => L.a + L.b * t;
      const z2 = sa.map((v, t) => 2 * v - line(t + 1)), sm2 = ses(z2, al);
      const fc = (wt) => Array.from({ length: H }, (_, h) => (wt * line(NT + h + 1) + (1 - wt) * sm2.l) * si[(NT + h) % 12]);
      const theta = fc(w), sesF = (() => { const s = ses(sa, al); return Array.from({ length: H }, (_, h) => s.l * si[(NT + h) % 12]); })();
      const holt = (() => { let l = sa[0], b = sa[1] - sa[0]; for (let t = 1; t < NT; t++) { const pl = l; l = al * sa[t] + (1 - al) * (l + b); b = 0.2 * (l - pl) + 0.8 * b; } return Array.from({ length: H }, (_, h) => (l + (h + 1) * b) * si[(NT + h) % 12]); })();
      const naive = Array.from({ length: H }, (_, h) => tr0[NT - 12 + (h % 12)]);
      const act = y.slice(NT), mae = (f) => f.reduce((a, v, i) => a + Math.abs(v - act[i]), 0) / H, scale = (() => { let s = 0; for (let t = 12; t < NT; t++) s += Math.abs(tr0[t] - tr0[t - 12]); return s / (NT - 12); })();
      const mase = (f) => mae(f) / scale, ws = Array.from({ length: 21 }, (_, i) => i / 20), curve = ws.map((x) => mase(fc(x)));
      S = { y, tr0, si, sa, L, line, z2, sm2, theta, sesF, holt, naive, act, mase, curve, ws, al, w, mT: mase(theta), mS: mase(sesF), mH: mase(holt), mN: mase(naive), drift: (w * L.b) };
    }
    const P1 = new Plot($("#h1"), { x: [1, NT], pad: { l: 46, b: 38 } }), P2 = new Plot($("#h2"), { x: [NT - 23, N], pad: { l: 46, b: 38 } }), P3 = new Plot($("#h3"), { x: [0, 1], pad: { l: 46, b: 38 } });
    function d1() {
      const { sa, z2, line } = S, th = +$("#th").value, zt = sa.map((v, t) => th * v + (1 - th) * line(t + 1)), all = [...sa, ...z2, ...zt], lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.06, xs = sa.map((_, i) => i + 1);
      P1.resize(); P1.y = [lo - pad, hi + pad]; P1.clear(); P1.axes({ xLabel: "month", yLabel: "seasonally adjusted sales", yFormat: (v) => fmt(v, 0) });
      P1.path(xs, z2, css("--violet"), 1.5, null, 0.7);
      if (th !== 1 && th !== 0 && th !== 2) P1.path(xs, zt, css("--muted"), 1.5, [3, 3]);
      P1.path(xs, sa, css("--ink"), 2); P1.path([1, NT], [line(1), line(NT)], css("--warm"), 2.5);
      $("#h1Key").innerHTML = key(css("--ink"), "θ = 1 (the adjusted data)") + key(css("--warm"), "θ = 0 (trend line)") + key(css("--violet"), "θ = 2 (curvature doubled)") + (th !== 1 && th !== 0 && th !== 2 ? key(css("--muted"), `θ = ${th}`, 1) : "");
      $("#h1Cap").innerHTML = `Trend line: ${fmt(S.L.a, 1)} + ${fmt(S.L.b, 2)} × month. The θ = 2 line swings twice as hard around it. All theta lines share the same average and slope.`;
    }
    function d2() {
      const { y, theta, sesF, holt, naive, act } = S, x0 = NT - 23, hx = Array.from({ length: 24 }, (_, i) => x0 + i), fx = Array.from({ length: H }, (_, i) => NT + 1 + i);
      const all = [...y.slice(x0 - 1), ...theta, ...sesF, ...holt], lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.08, g = P2.ctx;
      P2.resize(); P2.y = [lo - pad, hi + pad]; P2.clear();
      g.save(); g.fillStyle = css("--grid"); g.fillRect(P2.sx(NT + 0.5), P2.pad.t, P2.sx(N + 0.5) - P2.sx(NT + 0.5), P2.ih); g.restore();
      P2.axes({ xLabel: "month", yLabel: "sales", yFormat: (v) => fmt(v, 0) });
      P2.path(hx, y.slice(x0 - 1, NT), css("--ink"), 2); fx.forEach((x, i) => P2.dot(x, act[i], 3.5, css("--ink")));
      P2.path(fx, naive, css("--muted"), 1.5, [2, 3]); P2.path(fx, sesF, css("--good"), 2, [5, 3]); P2.path(fx, holt, css("--bad"), 2, [5, 3]); P2.path(fx, theta, css("--accent"), 3);
      $("#h2Key").innerHTML = key(css("--accent"), "Theta") + key(css("--good"), "SES (no trend)", 1) + key(css("--bad"), "Holt (full trend)", 1) + key(css("--muted"), "seasonal naive", 1);
      const best = [["Theta", S.mT], ["SES", S.mS], ["Holt", S.mH], ["seasonal naive", S.mN]].sort((a, b) => a[1] - b[1])[0];
      $("#h2Cap").innerHTML = `Error on the 12 hold-out months (MASE, lower is better): Theta <b>${fmt(S.mT, 2)}</b>, SES ${fmt(S.mS, 2)}, Holt ${fmt(S.mH, 2)}, seasonal naive ${fmt(S.mN, 2)}. Best here: <b>${best[0]}</b>.`;
    }
    function d3() {
      const { ws, curve, w } = S, mi = curve.indexOf(Math.min(...curve)), top = Math.max(...curve) * 1.1;
      P3.resize(); P3.y = [0, top]; P3.clear(); P3.axes({ xLabel: "weight on the trend line (θ = 0)", yLabel: "hold-out MASE", xFormat: (v) => fmt(v, 1), yFormat: (v) => fmt(v, 1) });
      P3.path(ws, curve, css("--accent"), 2.5); P3.path([0.5, 0.5], [0, top], css("--muted"), 1, [3, 3]);
      P3.dot(ws[mi], curve[mi], 6, null, css("--good")); P3.dot(w, S.mT, 6, css("--warm"), css("--surface"));
      $("#h3Cap").innerHTML = `0 = only the SES on θ = 2 (no trend), 1 = only the trend line. Classic Theta uses 0.5 (dashed). Best weight for this series: <b>${fmt(ws[mi], 2)}</b>. In practice you can't see the hold-out, which is why the fixed ½ is a sensible default.`;
    }
    function work() {
      const { L, sm2, si, theta, al, w } = S, b = (t) => `<b style="color:var(--ink)">${t}</b>`, m = NT + 1;
      $("#work").innerHTML = [
        `trend line (θ = 0): ${fmt(L.a, 2)} + ${fmt(L.b, 3)} × t; at month ${m}: ${fmt(S.line(m), 2)}`,
        `θ = 2 line smoothed with α = ${al}: last level = ${fmt(sm2.l, 2)}`,
        `combined (adjusted): ${fmt(w, 2)} × ${fmt(S.line(m), 2)} + ${fmt(1 - w, 2)} × ${fmt(sm2.l, 2)} = ${fmt(w * S.line(m) + (1 - w) * sm2.l, 2)}`,
        `× seasonal index for ${MON[(m - 1) % 12]} (${fmt(si[(m - 1) % 12], 3)}) = ${b(fmt(theta[0], 1))}`,
        `each month ahead adds ${fmt(w, 2)} × ${fmt(L.b, 3)} = ${b(fmt(S.drift, 3))} units (before seasonality): the "SES + half the trend" view`,
      ].map((l) => `<div style="margin-bottom:3px">${l}</div>`).join("");
    }
    function readouts() {
      const R = [["Theta", S.mT], ["SES", S.mS], ["Holt", S.mH], ["Seasonal naive", S.mN]], mn = Math.min(...R.map((r) => r[1]));
      $("#ro").innerHTML = R.map(([n, v]) => `<div class="ro"><b>MASE, ${n}</b><span class="${v === mn ? "pill ok" : "num"}">${fmt(v, 2)}</span></div>`).join("");
    }
    function labels() { $("#trV").textContent = fmt(+$("#tr").value, 1); $("#fadeV").textContent = Math.round(+$("#fade").value * 100) + "%"; $("#ssV").textContent = "±" + Math.round(+$("#ss").value * 100) + "%"; $("#nzV").textContent = Math.round(+$("#nz").value * 100) + "%"; $("#alV").textContent = fmt(+$("#al").value, 2); $("#wV").textContent = fmt(+$("#w").value, 2); $("#thV").textContent = $("#th").value; }
    function update() { labels(); compute(); d1(); d2(); d3(); work(); readouts(); }
    root.querySelectorAll("input[type=range]").forEach((e) => e.addEventListener("input", update));
    $("#resim").addEventListener("click", () => { seed++; gen(); update(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 6; gen(); update(); });
    update();
    return watch([$("#h1"), $("#h2"), $("#h3")], () => { d1(); d2(); d3(); });
  },
});
