Lab.register({
  id: "least-squares",
  group: "Regression",
  title: "Least squares, by hand",
  blurb: "Fit the line yourself with two sliders and try to beat the formula. You can't, but you'll see why.",
  lede: "Ordinary least squares picks the intercept and slope that make the total area of the squared residuals as small as possible. Here you get to steer the line yourself and watch that area grow and shrink.",
  quiz: [
    ["Why square the residuals rather than just add them?", "Positive and negative residuals would cancel, so many bad lines would score zero. Squaring makes every miss count, gives a unique best line, and leads to the simple closed-form formulas."],
    ["Where does the least-squares line always pass?", "Through the point (x̄, ȳ), the means of x and y. That follows from â = ȳ − b̂·x̄."],
    ["What is the downside of squaring?", "Big residuals count a lot, so one outlier can drag the line towards it. Least absolute deviations or robust regression resist that."],
    ["Slope 2.5 with x in weeks and y in units. What does it mean?", "On average y is 2.5 units higher for each extra week. It describes association in this data, not necessarily cause."],
  ],
  diy: {
    intro: "x in A2:A31, y in B2:B31.",
    steps: [
      ["Means.", "E1: =AVERAGE(A2:A31)\nE2: =AVERAGE(B2:B31)"],
      ["Slope from the formula: sum of cross-products ÷ sum of squares of x.", "E3: =SUMPRODUCT(A2:A31-E1,B2:B31-E2)/DEVSQ(A2:A31)"],
      ["Intercept.", "E4: =E2-E3*E1"],
      ["Check against Excel's built-ins.", "=SLOPE(B2:B31,A2:A31)\n=INTERCEPT(B2:B31,A2:A31)"],
      ["Residuals and the sum of squared errors the method minimises.", "C2: =B2-($E$4+$E$3*A2)\n=SUMSQ(C2:C31)"],
      ["Several x variables: LINEST returns slopes (last x first), then intercept. Add TRUE,TRUE for standard errors and R².", "=LINEST(B2:B31,A2:A31,TRUE,TRUE)"],
    ],
  },
  deeper: [
    ["Stigler (1981), Gauss and the invention of least squares, Annals of Statistics 9(3)", "https://doi.org/10.1214/aos/1176345451", "the history: Legendre (1805) and Gauss"],
    ["James, Witten, Hastie & Tibshirani, An Introduction to Statistical Learning, ch. 3 (free PDF)", "https://www.statlearning.com/", "linear regression with labs"],
    ["OpenIntro Statistics (free), ch. 8", "https://www.openintro.org/book/os/", "least squares, residuals and outliers"],
    ["Seeing Theory: Regression analysis", "https://seeing-theory.brown.edu/regression-analysis/index.html", "another interactive view"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 56 C 30 6, 66 6, 88 56"/><circle cx="48" cy="18" r="4" fill="currentColor"/><line x1="8" y1="60" x2="88" y2="60" opacity=".4"/><line x1="48" y1="18" x2="48" y2="60" stroke-dasharray="3 3" opacity=".6"/></svg>`,

  mount(root) {
    const { Plot, watch, dragPoints, rng, ols, fmt, css } = Lab;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot">
          <canvas id="lsc" aria-label="Scatter plot with your line and its squared residuals"></canvas>
          <div class="legend">
            <span><i style="background:var(--accent)"></i>Your line</span>
            <span><i style="background:var(--violet)"></i>Best possible line (toggle)</span>
            <span><i style="background:var(--warm)"></i>Squared residuals of your line</span>
          </div>
          <figcaption>Drag points to change the data. The best line updates with them.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="lsl" aria-label="Sum of squared errors as a function of slope"></canvas>
          <figcaption>SSE for every slope, with your intercept held fixed. The bowl shape is why least squares has exactly one answer.</figcaption>
        </figure>`,
      panel: `
        <div class="ctrl">
          <label for="int">Intercept a <output id="intV"></output></label>
          <input type="range" id="int" min="-4" max="10" step="0.05" value="2">
        </div>
        <div class="ctrl">
          <label for="slp">Slope b <output id="slpV"></output></label>
          <input type="range" id="slp" min="-1.5" max="2" step="0.01" value="0.2">
        </div>
        <div class="readouts">
          <div class="ro"><b>Your SSE</b><span class="num" id="sseU"></span></div>
          <div class="ro"><b>Best SSE</b><span class="num" id="sseB"></span></div>
          <div class="ro"><b>Your R²</b><span class="num" id="r2U"></span></div>
          <div class="ro"><b>How close</b><span id="close"></span></div>
        </div>
        <div class="meter" aria-hidden="true"><div id="ratio" style="background:var(--warm)"></div></div>
        <p class="hint">Bar: best SSE as a share of yours. Full means you found it.</p>
        <label class="check"><input type="checkbox" id="showBest"> Show the best line</label>
        <label class="check"><input type="checkbox" id="showSq" checked> Show squares</label>
        <div class="btns">
          <button class="btn primary" id="snap" type="button">Snap to best fit</button>
          <button class="btn" id="resample" type="button">New data</button>
        </div>`,
      notes: `
        <section>
          <h2>What you're seeing</h2>
          <p>Each orange square has a side equal to one residual, the vertical gap between a point and your line. Least squares adds up their areas and picks the line that makes the total smallest.</p>
          <p>The lower plot holds your intercept still and sweeps the slope. SSE traces a parabola, because it is a sum of squares of things that change linearly with the slope. A parabola has a single lowest point.</p>
        </section>
        <section>
          <h2>The formula</h2>
          <div class="eq">SSE(a, b) = Σ (y<sub>i</sub> − a − b·x<sub>i</sub>)²</div>
          <p>Set both partial derivatives to zero and solve:</p>
          <div class="eq">b̂ = Σ(x<sub>i</sub> − x̄)(y<sub>i</sub> − ȳ) / Σ(x<sub>i</sub> − x̄)²&nbsp;&nbsp;&nbsp;â = ȳ − b̂·x̄</div>
          <p>The second equation says the best line always passes through the point (x̄, ȳ).</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Find the best line using only the sliders, then press Snap to see how close you got.</li>
            <li>Set the slope to 0 and the intercept to the mean of y. Your R² is exactly 0.</li>
            <li>Now push the line somewhere silly. Your R² goes negative: your line is worse than guessing the mean.</li>
            <li>Drag a point at the far right up and down. Points far from x̄ have more leverage on the slope.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const main = new Plot($("#lsc"), { x: [0, 10], y: [0, 10] });
    const loss = new Plot($("#lsl"), { x: [-1.5, 2], y: [0, 1], pad: { b: 30, t: 10 } });
    let pts = [], seed = 3;

    function sample() {
      const r = rng(seed++);
      const b = 0.3 + r() * 0.7, a = 1 + r() * 2;
      pts = [];
      for (let i = 0; i < 10; i++) {
        const x = 0.7 + r() * 8.6;
        pts.push({ x, y: Math.max(0.3, Math.min(9.7, a + b * x + r.normal() * 1.0)) });
      }
    }
    const sseOf = (a, b) => pts.reduce((s, p) => s + (p.y - a - b * p.x) ** 2, 0);

    function draw() {
      const a = +$("#int").value, b = +$("#slp").value;
      $("#intV").textContent = a.toFixed(2);
      $("#slpV").textContent = b.toFixed(2);
      const best = ols(pts);
      const sU = sseOf(a, b), sB = sseOf(best.a, best.b);
      const sst = pts.reduce((s, p) => s + (p.y - best.my) ** 2, 0);
      const f = (x) => a + b * x;

      main.clear();
      main.axes({ xLabel: "x", yLabel: "y" });
      if ($("#showSq").checked) {
        main.clip((g) => {
          for (const p of pts) {
            const e = p.y - f(p.x), s = Math.abs(e) * main.ky;
            const top = Math.min(main.sy(p.y), main.sy(f(p.x)));
            g.fillStyle = css("--warm-soft"); g.fillRect(main.sx(p.x), top, s, s);
            g.strokeStyle = css("--warm"); g.lineWidth = 1; g.strokeRect(main.sx(p.x) + 0.5, top + 0.5, s, s);
          }
        });
      }
      main.clip((g) => {
        g.strokeStyle = css("--warm"); g.lineWidth = 1.5;
        for (const p of pts) { g.beginPath(); g.moveTo(main.sx(p.x), main.sy(p.y)); g.lineTo(main.sx(p.x), main.sy(f(p.x))); g.stroke(); }
      });
      if ($("#showBest").checked) {
        main.fn((x) => best.a + best.b * x, css("--violet"), 2, [6, 5]);
        main.dot(best.mx, best.my, 4, css("--violet"));
      }
      main.fn(f, css("--accent"), 2.5);
      for (const p of pts) main.dot(p.x, p.y, 5, css("--ink"), css("--surface"));

      // SSE vs slope with this intercept
      const bs = [], ls = [];
      for (let i = 0; i <= 200; i++) { const bb = -1.5 + (i / 200) * 3.5; bs.push(bb); ls.push(sseOf(a, bb)); }
      const lo = Math.min(...ls), hi = Math.min(Math.max(...ls), lo + Math.max(30, sB * 8));
      loss.y = [0, hi * 1.05];
      loss.clear();
      loss.axes({ xLabel: "slope b", yLabel: "SSE", yCount: 3, xCount: 7 });
      loss.path(bs, ls, css("--accent"), 2);
      loss.clip((g) => {
        g.strokeStyle = css("--muted"); g.setLineDash([3, 3]); g.lineWidth = 1;
        g.beginPath(); g.moveTo(loss.sx(b), loss.sy(0)); g.lineTo(loss.sx(b), loss.sy(sU)); g.stroke();
      });
      loss.dot(b, Math.min(sU, loss.y[1]), 5, css("--warm"), css("--surface"));

      $("#sseU").textContent = fmt(sU);
      $("#sseB").textContent = fmt(sB);
      $("#r2U").textContent = (1 - sU / sst).toFixed(3);
      const ratio = sB / sU;
      $("#ratio").style.width = Math.min(100, ratio * 100) + "%";
      const pill = ratio > 0.995 ? ["ok", "On the best fit"] : ratio > 0.9 ? ["ok", "Very close"] : ratio > 0.6 ? ["warn", "Getting there"] : ["bad", "Far off"];
      $("#close").innerHTML = `<span class="pill ${pill[0]}">${pill[1]}</span>`;
    }

    ["#int", "#slp", "#showBest", "#showSq"].forEach((s) => $(s).addEventListener("input", draw));
    $("#snap").addEventListener("click", () => {
      const best = ols(pts);
      $("#int").value = best.a; $("#slp").value = best.b; draw();
    });
    $("#resample").addEventListener("click", () => { sample(); draw(); });
    dragPoints(main, () => pts, draw);

    sample(); draw();
    return watch([main.c, loss.c], (resized) => { if (resized) { main.resize(); loss.resize(); } draw(); });
  },
});
