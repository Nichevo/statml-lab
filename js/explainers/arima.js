Lab.register({
  id: "arima",
  group: "Forecasting",
  title: "ARIMA models",
  blurb: "Build a series from AR and MA pieces, read its fingerprint in the ACF and PACF, then fit an ARIMA(p,d,q) and forecast.",
  lede: "ARIMA describes a time series by how today depends on yesterday. The AR part says today echoes past values. The MA part says today echoes past surprises. The I part says to work with changes rather than levels. The ACF and PACF charts are how you tell which pieces a series needs.",
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor"><rect x="8" y="14" width="6" height="34"/><rect x="20" y="24" width="6" height="24" opacity=".8"/><rect x="32" y="32" width="6" height="16" opacity=".6"/><rect x="44" y="38" width="6" height="10" opacity=".45"/><rect x="56" y="42" width="6" height="6" opacity=".3"/></g><line x1="4" y1="48" x2="92" y2="48"/><line x1="4" y1="40" x2="92" y2="40" stroke-dasharray="3 3" opacity=".5"/><path d="M66 20 L74 14 L82 22 L90 10" /></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const N = 160, TEST = 20;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="arc" aria-label="Time series with ARIMA fit and forecast"></canvas>
          <div class="legend">
            <span><i style="background:var(--ink)"></i>Series</span>
            <span><i style="background:var(--accent)"></i>One-step-ahead fit</span>
            <span><i style="background:var(--warm)"></i>Forecast</span>
            <span><i style="background:var(--warm);opacity:.3"></i>95% interval</span>
          </div>
          <figcaption>The last ${TEST} points are held out. The forecast only uses what came before them.</figcaption>
        </figure>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">
          <figure class="plot short" style="margin:0"><canvas id="acf" style="aspect-ratio:2/1" aria-label="Autocorrelation function"></canvas><figcaption id="acfCap">ACF</figcaption></figure>
          <figure class="plot short" style="margin:0"><canvas id="pacf" style="aspect-ratio:2/1" aria-label="Partial autocorrelation function"></canvas><figcaption id="pacfCap">PACF</figcaption></figure>
        </div>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 8px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">The fitted model, worked out</h4>
          <div id="eqn" class="eq" style="border-left-color:var(--accent)"></div>
          <div style="overflow-x:auto"><table id="work" style="width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono)"></table></div>
        </div>`,
      panel: `
        <div>
          <h4>How the data is made</h4>
          <div class="ctrl"><label for="phi1">AR φ₁ (echo of last value) <output id="phi1V"></output></label><input type="range" id="phi1" min="-0.9" max="0.95" step="0.05" value="0.7"></div>
          <div class="ctrl"><label for="phi2">AR φ₂ (echo of 2 back) <output id="phi2V"></output></label><input type="range" id="phi2" min="-0.6" max="0.6" step="0.05" value="0"></div>
          <div class="ctrl"><label for="th1">MA θ₁ (echo of last surprise) <output id="th1V"></output></label><input type="range" id="th1" min="-0.9" max="0.9" step="0.05" value="0"></div>
          <label class="check"><input type="checkbox" id="integ"> Integrated: wander like a random walk (d = 1)</label>
          <div class="btns" style="margin-top:8px"><button class="btn" id="newser" type="button">New random draw</button></div>
        </div>
        <div>
          <h4>Your model: ARIMA(p, d, q)</h4>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            <div class="ctrl"><label for="p">p</label><select id="p"><option>0</option><option selected>1</option><option>2</option></select></div>
            <div class="ctrl"><label for="d">d</label><select id="d"><option selected>0</option><option>1</option></select></div>
            <div class="ctrl"><label for="q">q</label><select id="q"><option selected>0</option><option>1</option><option>2</option></select></div>
          </div>
          <div class="btns" style="margin-top:8px"><button class="btn primary" id="auto" type="button">Pick best by AIC</button></div>
        </div>
        <div class="readouts">
          <div class="ro"><b>AIC (lower is better)</b><span class="num" id="aic"></span></div>
          <div class="ro"><b>Residual SD</b><span class="num" id="sig"></span></div>
          <div class="ro"><b>Held-out RMSE</b><span class="num" id="rmse"></span></div>
          <div class="ro"><b>Residuals look like</b><span id="resid"></span></div>
        </div>
        <label class="check"><input type="checkbox" id="showRes"> Show ACF/PACF of the residuals</label>
        <details><summary style="cursor:pointer;font-size:.9rem">Use your own series</summary>
          <textarea id="own" rows="4" spellcheck="false" aria-label="Your series values" style="width:100%;margin-top:8px;font:12px/1.5 var(--font-mono);padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink)"></textarea>
          <div class="btns" style="margin-top:6px"><button class="btn" id="useOwn" type="button">Use these numbers</button></div>
          <p class="hint" id="ownMsg">Paste at least 40 values, oldest first.</p>
        </details>`,
      notes: `
        <section>
          <h2>The three letters</h2>
          <ul>
            <li><b>AR(p), autoregressive</b>: today is partly a copy of the last p values. y<sub>t</sub> = c + φ₁y<sub>t−1</sub> + … + e<sub>t</sub></li>
            <li><b>I(d), integrated</b>: difference the series d times first. With d = 1 you model the change y<sub>t</sub> − y<sub>t−1</sub>, which removes a wandering level or trend.</li>
            <li><b>MA(q), moving average</b>: today is nudged by the last q random surprises. … + θ₁e<sub>t−1</sub> + e<sub>t</sub>. (Not the same thing as a moving-average forecast.)</li>
          </ul>
          <div class="eq">y′<sub>t</sub> = c + φ₁y′<sub>t−1</sub> + φ₂y′<sub>t−2</sub> + θ₁e<sub>t−1</sub> + θ₂e<sub>t−2</sub> + e<sub>t</sub></div>
          <p>where y′ is the series after differencing d times.</p>
        </section>
        <section>
          <h2>Reading the ACF and PACF</h2>
          <ul>
            <li><b>ACF</b>: correlation of the series with itself k steps back. <b>PACF</b>: the same, after removing what the in-between lags already explain.</li>
            <li>Pure AR(p): the PACF cuts off after lag p; the ACF fades slowly.</li>
            <li>Pure MA(q): the ACF cuts off after lag q; the PACF fades.</li>
            <li>An ACF that fades very slowly from near 1 means the series wanders: difference it (d = 1).</li>
            <li>Bars inside the dashed band (±1.96/√n) are consistent with zero.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>With φ₁ = 0.7 and the rest 0, the PACF has one tall bar and the ACF decays. Fit ARIMA(1,0,0) and check the fitted φ₁ lands near 0.7.</li>
            <li>Set φ₁ = 0 and θ₁ = 0.8. Now the ACF has one tall bar. Fit (0,0,1).</li>
            <li>Tick "Integrated". The ACF crawls down from 1. Fit with d = 0 and see the poor forecast, then d = 1.</li>
            <li>Fit a too-simple model, then tick "Show ACF of the residuals". Leftover bars outside the band mean the model missed a pattern.</li>
            <li>Press "Pick best by AIC" and see whether it recovers how the data was made.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const main = new Plot($("#arc"), { pad: { l: 50 } });
    const pA = new Plot($("#acf"), { x: [0.5, 20.5], y: [-1, 1], pad: { l: 40, b: 26, t: 10 } });
    const pP = new Plot($("#pacf"), { x: [0.5, 20.5], y: [-1, 1], pad: { l: 40, b: 26, t: 10 } });
    let seed = 8, y = [], own = false, fitRes = null;

    function simulate() {
      const r = rng(seed), phi1 = +$("#phi1").value, phi2 = +$("#phi2").value, th1 = +$("#th1").value;
      const burn = 100, x = [0, 0], e = [0, 0];
      for (let t = 2; t < N + burn; t++) { const et = r.normal(); e.push(et); x.push(phi1 * x[t - 1] + phi2 * x[t - 2] + th1 * e[t - 1] + et); }
      let s = x.slice(burn);
      if ($("#integ").checked) { let c = 0; s = s.map((v) => (c += v)); }
      y = s.map((v) => 50 + 3 * v);
      own = false;
      $("#own").value = y.map((v) => v.toFixed(2)).join(", ");
    }

    const diff = (v, d) => (d ? v.slice(1).map((x, i) => x - v[i]) : v.slice());
    function acf(v, K) {
      const n = v.length, m = v.reduce((a, b) => a + b, 0) / n, den = v.reduce((a, b) => a + (b - m) ** 2, 0);
      return Array.from({ length: K }, (_, k) => { let s = 0; for (let t = k + 1; t < n; t++) s += (v[t] - m) * (v[t - k - 1] - m); return s / den; });
    }
    function pacf(r) { // Durbin-Levinson on autocorrelations r[0]=lag1
      const K = r.length, out = []; let phi = [];
      for (let k = 1; k <= K; k++) {
        let num = r[k - 1], den = 1;
        for (let j = 1; j < k; j++) { num -= phi[j - 1] * r[k - j - 1]; den -= phi[j - 1] * r[j - 1]; }
        const pkk = num / den, np = phi.slice();
        for (let j = 1; j < k; j++) np[j - 1] = phi[j - 1] - pkk * phi[k - j - 1];
        np[k - 1] = pkk; phi = np; out.push(pkk);
      }
      return out;
    }

    // Conditional sum of squares for ARMA(p,q) with constant on series z.
    function css_(z, p, q, par) {
      const c = par[0], ph = par.slice(1, 1 + p), th = par.slice(1 + p);
      const e = new Array(z.length).fill(0), fit = new Array(z.length).fill(NaN);
      let ss = 0, n = 0;
      for (let t = p; t < z.length; t++) {
        let f = c;
        for (let i = 0; i < p; i++) f += ph[i] * z[t - 1 - i];
        for (let j = 0; j < q; j++) f += t - 1 - j >= 0 ? th[j] * e[t - 1 - j] : 0;
        fit[t] = f; e[t] = z[t] - f; ss += e[t] ** 2; n++;
      }
      return { ss, n, e, fit };
    }
    function nelder(f, x0) {
      const n = x0.length; let S = [x0];
      for (let i = 0; i < n; i++) { const x = x0.slice(); x[i] += i === 0 ? Math.max(0.5, Math.abs(x0[0]) * 0.1) : 0.2; S.push(x); }
      let F = S.map(f);
      for (let it = 0; it < 400 * n; it++) {
        const o = F.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
        S = o.map((i) => S[i]); F = o.map((i) => F[i]);
        const c = Array.from({ length: n }, (_, j) => S.slice(0, n).reduce((s, x) => s + x[j], 0) / n);
        const pt = (t) => c.map((v, j) => v + t * (S[n][j] - v));
        const xr = pt(-1), fr = f(xr);
        if (fr < F[0]) { const xe = pt(-2), fe = f(xe); [S[n], F[n]] = fe < fr ? [xe, fe] : [xr, fr]; }
        else if (fr < F[n - 1]) { S[n] = xr; F[n] = fr; }
        else { const xc = pt(0.5), fc = f(xc); if (fc < F[n]) { S[n] = xc; F[n] = fc; } else { for (let i = 1; i <= n; i++) { S[i] = S[i].map((v, j) => S[0][j] + 0.5 * (v - S[0][j])); F[i] = f(S[i]); } } }
        if (Math.abs(F[n] - F[0]) < 1e-10) break;
      }
      return S[F.indexOf(Math.min(...F))];
    }

    function fitModel(p, d, q) {
      const tr = y.slice(0, N - TEST), z = diff(tr, d);
      const m = z.reduce((a, b) => a + b, 0) / z.length;
      const pen = (par) => { const ph = par.slice(1, 1 + p), th = par.slice(1 + p); let bad = 0; [...ph, ...th].forEach((v) => (bad += Math.max(0, Math.abs(v) - 0.99) * 1e6)); if (p === 2 && ph[0] + ph[1] > 0.99) bad += 1e6; return bad; };
      const par = nelder((par) => css_(z, p, q, par).ss + pen(par), [m * (1 - 0.1 * p), ...Array(p).fill(0.1), ...Array(q).fill(0.1)]);
      const r = css_(z, p, q, par), sig2 = r.ss / r.n, k = p + q + 1;
      const aic = r.n * Math.log(sig2) + 2 * (k + 1);
      // forecasts on differenced scale
      const ph = par.slice(1, 1 + p), th = par.slice(1 + p), zz = z.slice(), ee = r.e.slice();
      const fz = [];
      for (let h = 0; h < TEST; h++) {
        let f = par[0]; const t = zz.length;
        for (let i = 0; i < p; i++) f += ph[i] * zz[t - 1 - i];
        for (let j = 0; j < q; j++) f += t - 1 - j < ee.length ? th[j] * (ee[t - 1 - j] || 0) : 0;
        zz.push(f); ee.push(0); fz.push(f);
      }
      // psi weights for interval width
      const psi = [1];
      for (let j = 1; j < TEST; j++) { let v = j <= q ? th[j - 1] : 0; for (let i = 1; i <= p; i++) if (j - i >= 0) v += ph[i - 1] * psi[j - i]; psi.push(v); }
      let w = psi; if (d) { let c = 0; w = psi.map((v) => (c += v)); }
      const se = w.map((_, h) => Math.sqrt(sig2 * w.slice(0, h + 1).reduce((s, v) => s + v * v, 0)));
      let fc = fz; if (d) { let lvl = tr[tr.length - 1]; fc = fz.map((v) => (lvl += v)); }
      const fit = d ? r.fit.map((f, i) => (isFinite(f) ? tr[i] + f : NaN)) : r.fit; // one-step on level scale
      const fitLevel = d ? [NaN, ...fit] : fit;
      return { p, d, q, par, sig2, aic, fc, se, fit: fitLevel, resid: r.e.slice(p), z, e: r.e };
    }

    function bars(plot, vals, color, n, title) {
      plot.clear();
      plot.axes({ xTicks: [1, 5, 10, 15, 20], yTicks: [-1, -0.5, 0, 0.5, 1], xLabel: "lag" });
      const band = 1.96 / Math.sqrt(n);
      plot.clip((g) => {
        g.fillStyle = css("--violet-soft"); g.fillRect(plot.pad.l, plot.sy(band), plot.iw, plot.sy(-band) - plot.sy(band));
        g.strokeStyle = css("--violet"); g.setLineDash([4, 3]); g.lineWidth = 1;
        [band, -band].forEach((b) => { g.beginPath(); g.moveTo(plot.pad.l, plot.sy(b)); g.lineTo(plot.w - plot.pad.r, plot.sy(b)); g.stroke(); });
        g.setLineDash([]);
        vals.forEach((v, i) => {
          const x = plot.sx(i + 1), out = Math.abs(v) > band;
          g.fillStyle = out ? color : css("--muted");
          g.fillRect(x - 4, Math.min(plot.sy(0), plot.sy(v)), 8, Math.abs(plot.sy(v) - plot.sy(0)));
        });
      });
      const g = plot.ctx; g.fillStyle = css("--ink"); g.font = `600 12px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "top";
      g.fillText(title, plot.w - plot.pad.r - 4, plot.pad.t + 4);
    }

    function draw(refit = true) {
      ["phi1", "phi2", "th1"].forEach((k) => ($(`#${k}V`).textContent = (+$("#" + k).value).toFixed(2)));
      const p = +$("#p").value, d = +$("#d").value, q = +$("#q").value;
      if (refit || !fitRes) fitRes = fitModel(p, d, q);
      const R = fitRes;

      const lo = Math.min(...y, ...R.fc.map((f, h) => f - 2 * R.se[h])), hi = Math.max(...y, ...R.fc.map((f, h) => f + 2 * R.se[h]));
      const span = hi - lo || 1;
      main.x = [0, N - 1]; main.y = [lo - span * 0.05, hi + span * 0.05];
      main.clear();
      main.ctx.fillStyle = css("--grid"); main.ctx.fillRect(main.sx(N - TEST - 0.5), main.pad.t, main.sx(N - 1) - main.sx(N - TEST - 0.5), main.ih);
      main.axes({ xLabel: "time", yLabel: own ? "your values" : "value" });
      const xsF = [N - TEST - 1, ...R.fc.map((_, h) => N - TEST + h)], ysF = [y[N - TEST - 1], ...R.fc], seF = [0, ...R.se];
      main.clip((g) => {
        g.fillStyle = css("--warm-soft"); g.beginPath();
        xsF.forEach((x, i) => { const py = main.sy(ysF[i] + 1.96 * seF[i]); i ? g.lineTo(main.sx(x), py) : g.moveTo(main.sx(x), py); });
        for (let i = xsF.length - 1; i >= 0; i--) g.lineTo(main.sx(xsF[i]), main.sy(ysF[i] - 1.96 * seF[i]));
        g.fill();
      });
      main.path(y.map((_, t) => t), y, css("--ink"), 1.4);
      main.path(R.fit.map((_, t) => t), R.fit, css("--accent"), 1.6, null, 0.9);
      main.path(xsF, ysF, css("--warm"), 2.5, [6, 4]);

      const showRes = $("#showRes").checked;
      const series = showRes ? R.resid : diff(y.slice(0, N - TEST), d);
      const a = acf(series, 20), pa = pacf(a);
      const what = showRes ? "residuals" : d ? "the differenced series" : "the series";
      bars(pA, a, css("--accent"), series.length, "ACF"); bars(pP, pa, css("--warm"), series.length, "PACF");
      $("#acfCap").textContent = `ACF of ${what}. Coloured bars are outside the band.`;
      $("#pacfCap").textContent = `PACF of ${what}.`;

      let se = 0; R.fc.forEach((f, h) => (se += (y[N - TEST + h] - f) ** 2));
      $("#aic").textContent = R.aic.toFixed(1);
      $("#sig").textContent = fmt(Math.sqrt(R.sig2));
      $("#rmse").textContent = fmt(Math.sqrt(se / TEST));
      const ra = acf(R.resid, 10), band = 1.96 / Math.sqrt(R.resid.length), outs = ra.filter((v) => Math.abs(v) > band).length;
      $("#resid").innerHTML = outs <= 1 ? `<span class="pill ok">White noise</span>` : `<span class="pill warn">${outs} lags left over</span>`;

      const ph = R.par.slice(1, 1 + p), th = R.par.slice(1 + p), yv = d ? "Δy" : "y";
      const term = (c, s) => `${c < 0 ? "−" : "+"} ${Math.abs(c).toFixed(3)}·${s}`;
      $("#eqn").innerHTML = `ARIMA(${p},${d},${q}): ${yv}<sub>t</sub> = ${R.par[0].toFixed(3)} ${ph.map((c, i) => term(c, `${yv}<sub>t−${i + 1}</sub>`)).join(" ")} ${th.map((c, j) => term(c, `e<sub>t−${j + 1}</sub>`)).join(" ")} + e<sub>t</sub>` +
        (d ? `<br><span style="color:var(--muted)">where Δy<sub>t</sub> = y<sub>t</sub> − y<sub>t−1</sub>, and the forecast for y adds each predicted change to the last level.</span>` : "");
      const z = R.z, e = R.e, T = z.length;
      const th_ = (t) => `<th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted);font-family:var(--font-body)">${t}</th>`;
      const td = (t, c) => `<td style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--grid);white-space:nowrap${c ? ";color:var(" + c + ")" : ""}">${t}</td>`;
      const rows = [];
      for (let t = T - 3; t < T + 2; t++) {
        const isF = t >= T;
        const parts = [R.par[0].toFixed(2)];
        ph.forEach((c, i) => { const v = t - 1 - i < T ? z[t - 1 - i] : null; parts.push(`${c.toFixed(2)}×${v === null ? "(fcst)" : v.toFixed(2)}`); });
        th.forEach((c, j) => { const v = t - 1 - j < T ? e[t - 1 - j] : 0; parts.push(`${c.toFixed(2)}×${v.toFixed(2)}`); });
        let f;
        if (!isF) f = z[t] - e[t];
        else { // recompute forecast steps
          const zz = z.slice(), ee = e.slice();
          for (let s = T; s <= t; s++) { let ff = R.par[0]; ph.forEach((c, i) => (ff += c * zz[s - 1 - i])); th.forEach((c, j) => (ff += c * (ee[s - 1 - j] || 0))); zz.push(ff); ee.push(0); f = ff; }
        }
        rows.push(`<tr>${td(isF ? `t+${t - T + 1} (forecast)` : `t = ${t + 1 + d}`)}${td(parts.join(" + ").replace(/\+ -/g, "− "))}${td(f.toFixed(2), "--accent")}${td(isF ? "–" : z[t].toFixed(2))}${td(isF ? "0 (unknown)" : e[t].toFixed(2), "--warm")}</tr>`);
      }
      $("#work").innerHTML = `<tr>${th_("step")}${th_("c + Σφ·past " + yv + " + Σθ·past e")}${th_("prediction")}${th_("actual " + yv)}${th_("surprise e")}</tr>` + rows.join("");
    }

    function autoPick() {
      let best = null;
      for (const d of [0, 1]) for (let p = 0; p <= 2; p++) for (let q = 0; q <= 2; q++) {
        const r = fitModel(p, d, q);
        // AIC is only comparable within the same d; penalize d=1 choice using a unit-root hint from the ACF
        const z = diff(y.slice(0, N - TEST), d), a1 = acf(z, 1)[0];
        const score = r.aic + (d === 0 && a1 > 0.9 ? 1e6 : 0) + (d === 1 && acf(y.slice(0, N - TEST), 1)[0] < 0.9 ? 1e6 : 0);
        if (!best || score < best.score) best = { score, p, d, q };
      }
      $("#p").value = best.p; $("#d").value = best.d; $("#q").value = best.q;
      draw();
    }

    ["#phi1", "#phi2", "#th1", "#integ"].forEach((s) => $(s).addEventListener("input", () => { simulate(); draw(); }));
    ["#p", "#d", "#q"].forEach((s) => $(s).addEventListener("change", () => draw()));
    $("#showRes").addEventListener("input", () => draw(false));
    $("#newser").addEventListener("click", () => { seed++; simulate(); draw(); });
    $("#auto").addEventListener("click", autoPick);
    $("#useOwn").addEventListener("click", () => {
      const v = $("#own").value.split(/[\s,;]+/).filter(Boolean).map(Number);
      if (v.some((x) => !isFinite(x))) { $("#ownMsg").textContent = "Some entries aren't plain numbers."; return; }
      if (v.length < 40) { $("#ownMsg").textContent = `Only ${v.length} values; paste at least 40.`; return; }
      const take = v.slice(-N);
      if (take.length < N) { $("#ownMsg").textContent = `Using your ${take.length} values.`; }
      else $("#ownMsg").textContent = v.length > N ? `Using your last ${N} values.` : `Using your ${N} values.`;
      y = take.length < N ? take : take; own = true;
      // allow shorter series
      main.x = [0, y.length - 1];
      draw();
    });

    simulate(); draw();
    return watch([main.c, pA.c, pP.c], (resized) => { if (resized) { main.resize(); pA.resize(); pP.resize(); } draw(false); });
  },
});
