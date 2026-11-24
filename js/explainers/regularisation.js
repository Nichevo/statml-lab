Lab.register({
  id: "regularisation",
  group: "Regression",
  title: "Regularisation: ridge and lasso stop a regression overfitting",
  blurb: "Twelve candidate drivers, only six of them real, and not much data. Plain regression gives every driver a coefficient, junk included. Ridge shrinks them all; lasso sets the useless ones to exactly zero.",
  lede: "When a regression has many drivers and not much data, ordinary least squares fits the noise: junk drivers get confident-looking coefficients and correlated drivers get wild, offsetting ones. Regularisation adds a penalty for large coefficients. Ridge regression penalises their squares and shrinks everything smoothly; the lasso penalises their absolute values and pushes weak drivers to exactly zero, which also picks the variables for you. The penalty strength λ is chosen by checking error on data the model hasn't seen.",
  quiz: [
    ["Why does adding a penalty, which makes the fit to the training data worse, improve forecasts?", "It trades a little bias for a big cut in variance. The coefficients stop chasing noise in this particular sample, so predictions on new data are steadier and usually more accurate."],
    ["Why must the drivers be standardised before ridge or lasso?", "The penalty treats all coefficients alike. A driver measured in cents would need a coefficient 100× bigger than the same driver in dollars and so be penalised far more. Standardising (mean 0, SD 1) puts them on an equal footing."],
    ["Which method would you use to pick 5 drivers out of 50?", "Lasso. Its absolute-value penalty sets coefficients to exactly zero, so it selects variables. Ridge shrinks but keeps all 50."],
    ["Two drivers are almost the same (e.g. flyer and display, always run together). How do ridge and lasso treat them?", "Ridge splits the effect between them roughly evenly. Lasso tends to pick one and zero the other, somewhat arbitrarily. Elastic net (a mix of both penalties) keeps groups of correlated drivers together."],
    ["How should λ be chosen?", "By cross-validation or a hold-out set: try a range of λ, measure error on data not used for fitting, and take the λ with the lowest error (or the largest λ within one standard error of it, for a simpler model)."],
  ],
  diy: {
    intro: "Excel has no built-in ridge or lasso, but ridge has a closed form you can build with matrix formulas. Standardised drivers in B2:M101 (100 rows × 12 drivers), sales in A2:A101 centred on its mean, λ in P1.",
    steps: [
      ["Standardise each driver column (repeat per column).", "=STANDARDIZE(B2, AVERAGE(B$2:B$101), STDEV.P(B$2:B$101))"],
      ["X'X ÷ n (a 12×12 matrix; enter as an array formula).", "=MMULT(TRANSPOSE(X), X)/ROWS(X)"],
      ["Add λ to the diagonal: X'X/n + λI.", "=XtX + P1*MUNIT(12)"],
      ["Ridge coefficients = (X'X/n + λI)⁻¹ × X'y/n.", "=MMULT(MINVERSE(XtX + P1*MUNIT(12)), MMULT(TRANSPOSE(X), y)/ROWS(X))"],
      ["Set λ = 0 to get ordinary least squares; compare the two on a hold-out set with SUMXMY2.", "=SUMXMY2(actual_test, predicted_test)/COUNT(actual_test)"],
      ["For lasso, use a tool that fits it: R (glmnet), Python (scikit-learn LassoCV), or Solver minimising SSE/2n + λ·Σ|b|.", "Solver: minimise SUMXMY2(y, X·b)/(2*n) + P1*SUMPRODUCT(ABS(b))"],
    ],
  },
  deeper: [
    ["James, Witten, Hastie & Tibshirani, An Introduction to Statistical Learning, §6.2 Shrinkage methods (free PDF)", "https://www.statlearning.com/", "the clearest textbook treatment, with labs in R and Python"],
    ["Tibshirani (1996), Regression shrinkage and selection via the lasso, JRSS B 58(1)", "https://doi.org/10.1111/j.2517-6161.1996.tb02080.x", "the original lasso paper"],
    ["Hoerl & Kennard (1970), Ridge regression: biased estimation for nonorthogonal problems, Technometrics 12(1)", "https://doi.org/10.1080/00401706.1970.10488634", "the original ridge regression paper"],
    ["Zou & Hastie (2005), Regularization and variable selection via the elastic net, JRSS B 67(2)", "https://doi.org/10.1111/j.1467-9868.2005.00503.x", "combining ridge and lasso for correlated drivers"],
    ["Friedman, Hastie & Tibshirani (2010), Regularization paths for generalized linear models via coordinate descent, J. Statistical Software 33(1)", "https://doi.org/10.18637/jss.v033.i01", "how glmnet fits the whole λ path fast (the method used on this page)"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8 C 40 10, 60 20, 90 32" stroke-width="2.5"/><path d="M6 20 C 40 22, 60 28, 90 32" stroke-opacity=".6"/><path d="M6 50 C 30 46, 50 34, 70 32 H90" stroke-opacity=".6"/><path d="M6 40 C 24 38, 34 33, 44 32 H90" stroke-opacity=".4"/><path d="M4 32 H92" stroke-dasharray="3 3" stroke-opacity=".5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, solve } = Lab;
    const NAMES = ["price discount", "end-cap display", "flyer", "temperature", "holiday week", "competitor promo", "fuel price", "website visits", "staff on shift", "rainfall", "pallets received", "phone calls"];
    const TRUE = [3, 2, 1.5, 0.8, 1.2, -1.5, 0, 0, 0, 0, 0, 0], P = 12, NTEST = 1000, LG = Array.from({ length: 41 }, (_, i) => -3 + i * 0.1);
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const PAL = ["--accent", "--warm", "--violet", "--good", "--ink", "--bad"];

    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0;display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center">${h4("Coefficient paths")}<div class="seg" id="meth"><button type="button" data-v="ridge" aria-pressed="false">Ridge</button><button type="button" data-v="lasso" aria-pressed="true">Lasso</button></div></div><canvas id="r1" aria-label="Coefficient paths against penalty strength"></canvas><figcaption id="r1Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Error on training vs fresh data")}</div><canvas id="r2" aria-label="Training and test error against penalty strength"></canvas><figcaption id="r2Cap"></figcaption></figure>`)}
        <div class="plot" style="padding:14px">${h4("Coefficients at the chosen λ")}<div id="bars" style="display:grid;gap:5px"></div><p class="hint" id="barsCap" style="margin-top:8px"></p></div>
        <div class="plot" style="padding:14px">${h4("Worked out")}<div id="work" style="font:.82rem/1.8 var(--font-mono)"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Weekly sales explained by 12 standardised drivers. Only the first 6 really matter.</p>
        <div class="ctrl"><label for="lam">Penalty strength λ <output id="lamV"></output></label><input type="range" id="lam" min="-3" max="1" step="0.1" value="-1"></div>
        <div class="ctrl"><label for="n">Weeks of training data <output id="nV"></output></label><input type="range" id="n" min="15" max="200" step="5" value="20"></div>
        <div class="ctrl"><label for="noise">Noise in sales <output id="noiseV"></output></label><input type="range" id="noise" min="0.5" max="6" step="0.5" value="4"></div>
        <div class="ctrl"><label for="rho">Correlation between drivers <output id="rhoV"></output></label><input type="range" id="rho" min="0" max="0.9" step="0.05" value="0.6"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="best" type="button">Use the best λ</button><button class="btn" id="resim" type="button">New data</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The penalty</h2>
          <div class="eq">ordinary least squares: minimise (1/2n) Σ (y − Xb)²<br>ridge: … + λ × ½ Σ b²<br>lasso: … + λ × Σ |b|</div>
          <p>λ = 0 is plain regression. As λ grows, coefficients are pulled towards zero. Ridge has a formula, b = (X'X/n + λI)⁻¹ X'y/n, and never quite reaches zero. Lasso is fitted by coordinate descent: update one coefficient at a time with a "soft threshold" that sets it to zero whenever its evidence is weaker than λ.</p>
        </section>
        <section>
          <h2>Why lasso gives exact zeros</h2>
          <p>The absolute-value penalty has a sharp corner at zero. For a weak driver, the gain in fit from a small coefficient is less than the penalty cost, so the best value is exactly zero. The squared penalty of ridge is flat at zero, so any driver with some evidence keeps a small coefficient.</p>
        </section>
        <section>
          <h2>Choosing λ</h2>
          <p>Training error always rises with λ, because the penalty only stops the fit from following the data. Error on fresh data first falls (less overfitting), then rises (too much shrinkage, now underfitting). The best λ sits at the bottom of that U. In practice you estimate the fresh-data curve with <a href="#cross-validation">cross-validation</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>With 20 weeks of data, set λ to its minimum (plain regression). Junk drivers get sizeable coefficients. Press "Use the best λ".</li>
            <li>Switch between Ridge and Lasso and compare the coefficient paths: smooth shrinking vs drivers dropping to zero one by one.</li>
            <li>Raise the weeks of data to 200. Plain regression gets close to the truth, and the best λ gets smaller: regularisation matters most when data is scarce.</li>
            <li>Raise the correlation to 0.9 and watch plain regression's coefficients swing on "New data".</li>
          </ol>
          <p>Related: <a href="#least-squares">least squares</a>, <a href="#bias-variance">bias and variance</a>, <a href="#cross-validation">cross-validation</a> and <a href="#promo-regression">regression with promotions</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let seed = 2, meth = "lasso", D = null, R = null;
    const lam = () => Math.pow(10, +$("#lam").value);

    function genData() {
      const n = +$("#n").value, sd = +$("#noise").value, rho = +$("#rho").value, r = rng(seed * 53 + 9), rt = rng(999);
      const row = (g) => { const f = g.normal(); return Array.from({ length: P }, () => Math.sqrt(rho) * f + Math.sqrt(1 - rho) * g.normal()); };
      const mk = (m, g) => { const X = [], y = []; for (let i = 0; i < m; i++) { const x = row(g); X.push(x); y.push(x.reduce((a, v, j) => a + v * TRUE[j], 0) + sd * g.normal()); } return { X, y }; };
      const tr = mk(n, r), te = mk(NTEST, rt);
      const mu = Array.from({ length: P }, (_, j) => tr.X.reduce((a, x) => a + x[j], 0) / n), sdv = mu.map((m, j) => Math.sqrt(tr.X.reduce((a, x) => a + (x[j] - m) ** 2, 0) / n) || 1), ym = tr.y.reduce((a, b) => a + b, 0) / n;
      const std = (X) => X.map((x) => x.map((v, j) => (v - mu[j]) / sdv[j]));
      D = { n, Xs: std(tr.X), yc: tr.y.map((v) => v - ym), Xt: std(te.X), yt: te.y, ym, sdv, sd };
      const Xs = D.Xs; D.G = Array.from({ length: P }, (_, a) => Array.from({ length: P }, (_, b) => Xs.reduce((s, x) => s + x[a] * x[b], 0) / n)); D.c = Array.from({ length: P }, (_, a) => Xs.reduce((s, x, i) => s + x[a] * D.yc[i], 0) / n);
    }
    function ridge(l) { const A = D.G.map((r, i) => r.map((v, j) => v + (i === j ? l : 0))); return solve(A, D.c.slice()); }
    function lasso(l, warm) {
      const b = warm ? warm.slice() : new Array(P).fill(0), G = D.G, c = D.c;
      for (let it = 0; it < 400; it++) {
        let mx = 0;
        for (let j = 0; j < P; j++) { let rj = c[j]; for (let k = 0; k < P; k++) if (k !== j) rj -= G[j][k] * b[k]; const nb = Math.sign(rj) * Math.max(0, Math.abs(rj) - l) / G[j][j]; mx = Math.max(mx, Math.abs(nb - b[j])); b[j] = nb; }
        if (mx < 1e-7) break;
      }
      return b;
    }
    const mse = (b, X, y, off) => X.reduce((a, x, i) => a + (y[i] - off - x.reduce((s, v, j) => s + v * b[j], 0)) ** 2, 0) / X.length;
    function fitAll() {
      const path = []; let warm = null;
      for (let k = LG.length - 1; k >= 0; k--) { const l = Math.pow(10, LG[k]), b = meth === "ridge" ? ridge(l) : (warm = lasso(l, warm)); path[k] = { lg: LG[k], b, tr: mse(b, D.Xs, D.yc, 0), te: mse(b, D.Xt, D.yt, D.ym) }; }
      const ols = ridge(1e-9), best = path.reduce((a, p) => (p.te < a.te ? p : a)), cur = meth === "ridge" ? ridge(lam()) : lasso(lam());
      R = { path, ols, best, cur, curTr: mse(cur, D.Xs, D.yc, 0), curTe: mse(cur, D.Xt, D.yt, D.ym), olsTe: mse(ols, D.Xt, D.yt, D.ym) };
    }
    const p1 = new Plot($("#r1"), { x: [-3, 1], pad: { l: 46, b: 38 } }), p2 = new Plot($("#r2"), { x: [-3, 1], pad: { l: 50, b: 38 } });
    const lgFmt = (v) => (v <= -1 ? fmt(Math.pow(10, v), Math.round(-v)) : fmt(Math.pow(10, v), v < 0 ? 1 : 0));
    function d1() {
      const { path, cur } = R, all = path.flatMap((p) => p.b), lo = Math.min(-2, ...all) * 1.1, hi = Math.max(3.5, ...all) * 1.08;
      p1.resize(); p1.y = [lo, hi]; p1.clear(); p1.axes({ xLabel: "λ (log scale) →  stronger penalty", yLabel: "coefficient", xTicks: [-3, -2, -1, 0, 1], xFormat: lgFmt, yFormat: (v) => fmt(v, 1) });
      p1.path([-3, 1], [0, 0], css("--muted"), 1);
      for (let j = P - 1; j >= 0; j--) { const real = TRUE[j] !== 0; p1.path(path.map((p) => p.lg), path.map((p) => p.b[j]), css(real ? PAL[j % PAL.length] : "--muted"), real ? 2.2 : 1.2, real ? null : [3, 3]); }
      const L = +$("#lam").value; p1.path([L, L], [lo, hi], css("--ink"), 1.2, [4, 3]);
      const nz = cur.filter((v) => Math.abs(v) > 1e-6).length, junk = cur.slice(6).filter((v) => Math.abs(v) > 1e-6).length;
      $("#r1Cap").innerHTML = `Coloured: the 6 real drivers. Grey dashed: the 6 junk ones. ${meth === "lasso" ? `At this λ the lasso keeps <b>${nz}</b> drivers, ${junk} of them junk.` : `Ridge keeps all 12, shrunk; the junk ones average |b| = ${fmt(cur.slice(6).reduce((a, v) => a + Math.abs(v), 0) / 6, 2)}.`}`;
    }
    function d2() {
      const { path, best } = R, top = Math.max(...path.map((p) => p.te), ...path.map((p) => p.tr)) * 1.1, L = +$("#lam").value;
      p2.resize(); p2.y = [0, top]; p2.clear(); p2.axes({ xLabel: "λ (log scale)", yLabel: "mean squared error", xTicks: [-3, -2, -1, 0, 1], xFormat: lgFmt, yFormat: (v) => fmt(v, 0) });
      p2.path([-3, 1], [D.sd * D.sd, D.sd * D.sd], css("--good"), 1.2, [4, 3]);
      p2.path(path.map((p) => p.lg), path.map((p) => p.tr), css("--muted"), 2);
      p2.path(path.map((p) => p.lg), path.map((p) => p.te), css("--warm"), 2.5);
      p2.dot(best.lg, best.te, 6, null, css("--warm"));
      p2.path([L, L], [0, top], css("--ink"), 1.2, [4, 3]);
      $("#r2Cap").innerHTML = `Grey: error on the ${D.n} training weeks. Orange: error on ${NTEST.toLocaleString()} fresh weeks. Lowest fresh-data error at λ ≈ <b>${lgFmt(best.lg)}</b> (${fmt(best.te, 2)}) vs <b>${fmt(R.olsTe, 2)}</b> for plain regression. Green dashed: the noise floor (${fmt(D.sd * D.sd, 2)}), the best any model could do.`;
    }
    function bars() {
      const { ols, cur } = R, mx = Math.max(3.5, ...ols.map(Math.abs), ...cur.map(Math.abs)), w = (v) => `${(Math.abs(v) / mx) * 50}%`;
      const bar = (v, c, o) => `<span style="position:absolute;top:${o}px;height:6px;border-radius:2px;background:var(${c});${v >= 0 ? "left:50%" : `right:50%`};width:${w(v)}"></span>`;
      $("#bars").innerHTML = `<div style="display:grid;grid-template-columns:minmax(0,9.5em) minmax(70px,1fr) auto;gap:8px;font-size:.75rem;color:var(--muted)"><span></span><span style="text-align:center">← negative · 0 · positive →</span><span style="text-align:right">truth · OLS · ${meth}</span></div>` +
        NAMES.map((nm, j) => `<div style="display:grid;grid-template-columns:minmax(0,9.5em) minmax(70px,1fr) auto;gap:8px;align-items:center;font-size:.8rem"><span style="min-width:0;${TRUE[j] ? "" : "color:var(--muted)"}"><span style="display:inline-block;width:10px;height:3px;vertical-align:middle;margin-right:6px;background:var(${TRUE[j] ? PAL[j % PAL.length] : "--line"})"></span>${nm}</span><span style="position:relative;height:22px;border-left:0;background:linear-gradient(var(--line),var(--line)) center/1px 100% no-repeat">${bar(TRUE[j], "--good", 1)}${bar(ols[j], "--muted", 8)}${bar(cur[j], "--accent", 15)}</span><span class="num" style="text-align:right;font-size:.72rem;white-space:nowrap">${fmt(TRUE[j], 1)} · ${fmt(ols[j], 2)} · <b>${Math.abs(cur[j]) < 1e-6 ? "0" : fmt(cur[j], 2)}</b></span></div>`).join("");
      $("#barsCap").innerHTML = `Green: true effect. Grey: plain regression (λ = 0). The short line by each name is its colour in the coefficient-path chart. Blue: ${meth} at λ = ${lgFmt(+$("#lam").value)}. Drivers are standardised, so each coefficient is the change in weekly sales for a one-SD change in that driver.`;
    }
    function work() {
      const l = lam(), j = 0, b = R.cur, G = D.G, c = D.c, bb = (t) => `<b style="color:var(--ink)">${t}</b>`;
      let rj = c[j]; for (let k = 1; k < P; k++) rj -= G[j][k] * b[k];
      const lines = [`λ = ${fmt(l, 4)}; training weeks n = ${D.n}; drivers standardised so each X'X/n diagonal = ${fmt(G[0][0], 2)}`];
      if (meth === "lasso") {
        lines.push(`coordinate update for "${NAMES[0]}": partial correlation r = X'(y − others) / n = ${fmt(rj, 3)}`);
        lines.push(`soft threshold: b = sign(r) × max(0, |r| − λ) ÷ ${fmt(G[0][0], 2)} = sign(${fmt(rj, 3)}) × max(0, ${fmt(Math.abs(rj), 3)} − ${fmt(l, 3)}) ÷ ${fmt(G[0][0], 2)} = ${bb(fmt(b[0], 3))}`);
        const k = 6; let rk = c[k]; for (let m = 0; m < P; m++) if (m !== k) rk -= G[k][m] * b[m];
        lines.push(`"${NAMES[k]}" (junk): |r| = ${fmt(Math.abs(rk), 3)} ${Math.abs(rk) <= l ? `≤ λ = ${fmt(l, 3)} → ${bb("exactly 0")}` : `> λ = ${fmt(l, 3)} → kept at ${fmt(b[k], 3)}`}`);
      } else {
        lines.push(`ridge: b = (X'X/n + λI)⁻¹ X'y/n, i.e. add ${fmt(l, 4)} to each of the 12 diagonal entries, then solve`);
        lines.push(`"${NAMES[0]}": plain regression ${fmt(R.ols[0], 3)} → ridge ${bb(fmt(b[0], 3))}; "${NAMES[6]}" (junk): ${fmt(R.ols[6], 3)} → ${bb(fmt(b[6], 3))}`);
      }
      lines.push(`fresh-data error: plain regression ${fmt(R.olsTe, 2)}, ${meth} at this λ ${bb(fmt(R.curTe, 2))}`);
      $("#work").innerHTML = lines.map((l) => `<div style="margin-bottom:3px">${l}</div>`).join("");
    }
    function readouts() {
      const gain = 1 - R.curTe / R.olsTe;
      $("#ro").innerHTML = `<div class="ro"><b>Training error</b><span class="num">${fmt(R.curTr, 2)}</span></div>
        <div class="ro"><b>Fresh-data error</b><span class="num">${fmt(R.curTe, 2)}</span></div>
        <div class="ro"><b>…plain regression</b><span class="num">${fmt(R.olsTe, 2)}</span></div>
        <div class="ro"><b>Improvement</b><span class="pill ${gain > 0.02 ? "ok" : gain < -0.02 ? "bad" : "idle"}">${gain >= 0 ? "" : "−"}${Math.round(Math.abs(gain) * 100)}%</span></div>
        <div class="ro"><b>Drivers kept</b><span class="num">${R.cur.filter((v) => Math.abs(v) > 1e-6).length} of 12</span></div>`;
    }
    function labels() { $("#lamV").textContent = lgFmt(+$("#lam").value); $("#nV").textContent = $("#n").value; $("#noiseV").textContent = "SD " + fmt(+$("#noise").value, 1); $("#rhoV").textContent = fmt(+$("#rho").value, 2); }
    function render() { labels(); fitAll(); d1(); d2(); bars(); work(); readouts(); }
    function full() { genData(); render(); }
    $("#lam").addEventListener("input", render);
    ["#n", "#noise", "#rho"].forEach((s) => $(s).addEventListener("input", full));
    $("#meth").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { meth = b.dataset.v; $("#meth").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); render(); }));
    $("#best").addEventListener("click", () => { $("#lam").value = R.best.lg.toFixed(1); render(); });
    $("#resim").addEventListener("click", () => { seed++; full(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 2; meth = "lasso"; $("#meth").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === "lasso"))); full(); });
    full();
    return watch([$("#r1"), $("#r2")], () => { d1(); d2(); });
  },
});
