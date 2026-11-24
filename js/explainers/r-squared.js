Lab.register({
  id: "r-squared",
  group: "Regression",
  title: "R², the coefficient of determination",
  blurb: "How much better is the regression line than just guessing the average? Compare the squares.",
  lede: "R² compares two ways of predicting y. The lazy way guesses the mean every time. The regression way uses x. R² is the share of the lazy model's squared error that the line gets rid of.",
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="54" x2="90" y2="12"/><line x1="6" y1="34" x2="90" y2="34" stroke-dasharray="4 4" opacity=".5"/><rect x="26" y="26" width="18" height="18" fill="currentColor" fill-opacity=".15"/><rect x="60" y="14" width="10" height="10" fill="currentColor" fill-opacity=".15"/><circle cx="26" cy="44" r="3" fill="currentColor"/><circle cx="60" cy="24" r="3" fill="currentColor"/><circle cx="44" cy="40" r="3" fill="currentColor"/><circle cx="78" cy="20" r="3" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, watch, dragPoints, rng, ols, fmt, css } = Lab;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot">
          <canvas id="r2c" aria-label="Scatter plot with regression line and squared errors"></canvas>
          <div class="legend">
            <span><i style="background:var(--violet)"></i>Mean of y (the lazy model)</span>
            <span><i style="background:var(--accent)"></i>Least-squares line</span>
            <span><i style="background:var(--warm)"></i>Squared residuals</span>
          </div>
          <figcaption>Drag a point to move it. Click empty space to add one. Double-click a point to remove it.</figcaption>
        </figure>`,
      panel: `
        <div>
          <h4>Show squares for</h4>
          <div class="seg" role="group" aria-label="Which squares to show">
            <button type="button" data-mode="sst" aria-pressed="false">Mean</button>
            <button type="button" data-mode="sse" aria-pressed="true">Line</button>
            <button type="button" data-mode="both" aria-pressed="false">Both</button>
          </div>
        </div>
        <div>
          <h4>R²</h4>
          <div class="big" id="r2v">0.00</div>
          <div class="meter" style="margin-top:10px" aria-hidden="true"><div id="r2bar" style="background:var(--accent)"></div><div id="r2rest" style="background:var(--warm)"></div></div>
          <p class="hint" style="margin-top:6px">Teal: share of variation explained. Orange: share left over.</p>
        </div>
        <div class="readouts">
          <div class="ro"><b><span class="sw" style="background:var(--violet)"></span>SST, total</b><span class="num" id="sst"></span></div>
          <div class="ro"><b><span class="sw" style="background:var(--warm)"></span>SSE, unexplained</b><span class="num" id="sse"></span></div>
          <div class="ro"><b><span class="sw" style="background:var(--accent)"></span>SSR = SST − SSE</b><span class="num" id="ssr"></span></div>
          <div class="ro"><b>Line</b><span class="num" id="eqn"></span></div>
        </div>
        <div class="ctrl">
          <label for="noise">Noise in new samples <output id="noiseV"></output></label>
          <input type="range" id="noise" min="0" max="3" step="0.1" value="1.2">
        </div>
        <div class="ctrl">
          <label for="slope">True slope in new samples <output id="slopeV"></output></label>
          <input type="range" id="slope" min="-1" max="1" step="0.05" value="0.6">
        </div>
        <div class="btns"><button class="btn primary" id="resample" type="button">New sample</button></div>`,
      notes: `
        <section>
          <h2>What you're seeing</h2>
          <p>The violet squares measure how far each point is from the mean of y. Add up their areas and you get the <b>total sum of squares</b>, SST. It is the error you'd make if you ignored x completely.</p>
          <p>The orange squares measure how far each point is from the fitted line. Their total is the <b>sum of squared errors</b>, SSE, the error that is still left after using x.</p>
          <p>R² is the fraction of the violet area that disappears when you switch to the line.</p>
          <div class="eq">R² = 1 − SSE / SST = SSR / SST</div>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set the noise to 0 and take a new sample. The orange squares vanish and R² hits 1.</li>
            <li>Set the true slope to 0. The line goes flat, matches the mean, and R² falls toward 0.</li>
            <li>Drag one point far above the others. Watch one huge square dominate both sums. Squaring makes outliers loud.</li>
            <li>Turn the noise up with a steep slope. R² drops even though the relationship is just as real. R² measures fit, not importance.</li>
          </ol>
        </section>
        <section>
          <h2>Things people get wrong</h2>
          <ul>
            <li>A high R² does not mean the model is right. A curved pattern can still give a high R² to a straight line.</li>
            <li>Adding predictors never lowers in-sample R². Adjusted R² or held-out data guard against that.</li>
            <li>On new data, or for a line that is not the least-squares line, SSE can exceed SST and R² goes negative. The least squares explainer lets you see this.</li>
            <li>For simple linear regression, R² equals the squared correlation between x and y.</li>
          </ul>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const plot = new Plot($("#r2c"), { x: [0, 10], y: [0, 10] });
    let mode = "sse";
    let pts = [];
    let seed = 7;

    function sample() {
      const r = rng(seed++);
      const noise = +$("#noise").value, slope = +$("#slope").value;
      pts = [];
      for (let i = 0; i < 12; i++) {
        const x = 0.8 + (i / 11) * 8.4 + (r() - 0.5) * 0.5;
        const y = 5 + slope * (x - 5) + r.normal() * noise;
        pts.push({ x, y: Math.max(0.2, Math.min(9.8, y)) });
      }
    }

    function squares(g, getFit, color, fill, side) {
      for (const p of pts) {
        const e = p.y - getFit(p.x);
        const s = Math.abs(e) * plot.ky;
        const x0 = plot.sx(p.x), y0 = plot.sy(p.y), y1 = plot.sy(p.y - e);
        const top = Math.min(y0, y1);
        const left = side > 0 ? x0 : x0 - s;
        g.fillStyle = fill; g.fillRect(left, top, s, s);
        g.strokeStyle = color; g.lineWidth = 1; g.strokeRect(left + 0.5, top + 0.5, s, s);
      }
    }

    function draw() {
      const fit = ols(pts);
      const f = (x) => fit.a + fit.b * x;
      const my = fit.my;
      let sst = 0, sse = 0;
      for (const p of pts) { sst += (p.y - my) ** 2; sse += (p.y - f(p.x)) ** 2; }
      const r2 = sst > 0 ? 1 - sse / sst : 1;

      plot.clear();
      plot.axes({ xLabel: "x", yLabel: "y" });
      plot.clip((g) => {
        if (mode !== "sse") squares(g, () => my, css("--violet"), css("--violet-soft"), -1);
        if (mode !== "sst") squares(g, f, css("--warm"), css("--warm-soft"), 1);
      });
      plot.fn(() => my, css("--violet"), 1.5, [6, 5]);
      plot.fn(f, css("--accent"), 2.5);
      const g = plot.ctx;
      plot.clip(() => {
        g.lineWidth = 1;
        for (const p of pts) {
          g.strokeStyle = css(mode === "sst" ? "--violet" : "--warm");
          const yy = mode === "sst" ? my : f(p.x);
          g.beginPath(); g.moveTo(plot.sx(p.x), plot.sy(p.y)); g.lineTo(plot.sx(p.x), plot.sy(yy)); g.stroke();
        }
      });
      for (const p of pts) plot.dot(p.x, p.y, 5, css("--ink"), css("--surface"));

      $("#r2v").textContent = r2.toFixed(3);
      const pct = Math.max(0, Math.min(1, r2)) * 100;
      $("#r2bar").style.width = pct + "%";
      $("#r2rest").style.width = 100 - pct + "%";
      $("#sst").textContent = fmt(sst);
      $("#sse").textContent = fmt(sse);
      $("#ssr").textContent = fmt(sst - sse);
      $("#eqn").textContent = `ŷ = ${fit.a.toFixed(2)} ${fit.b < 0 ? "−" : "+"} ${Math.abs(fit.b).toFixed(2)}x`;
    }

    function labels() {
      $("#noiseV").textContent = (+$("#noise").value).toFixed(1);
      $("#slopeV").textContent = (+$("#slope").value).toFixed(2);
    }

    root.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.mode;
      root.querySelectorAll(".seg button").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      draw();
    }));
    ["#noise", "#slope"].forEach((s) => $(s).addEventListener("input", () => { labels(); seed--; sample(); draw(); }));
    $("#resample").addEventListener("click", () => { sample(); draw(); });
    dragPoints(plot, () => pts, draw, { addOnClick: true, removeOnDblClick: true });

    labels(); sample(); draw();
    return watch([plot.c], (resized) => { if (resized) plot.resize(); draw(); });
  },
});
