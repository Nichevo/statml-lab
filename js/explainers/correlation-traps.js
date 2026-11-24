Lab.register({
  id: "correlation-traps",
  group: "Data quality",
  title: "Correlation traps: trends, outliers, curves and hidden groups",
  blurb: "Five ways a correlation coefficient misleads you, each with a quick check that catches it: differencing, rank correlation, plotting, and splitting by group.",
  lede: "A correlation of 0.9 between two series feels like evidence. Often it isn't. Two things that both grow over time will correlate whether or not they are related. One extreme point can create a strong correlation from nothing, or hide a real one. A perfect curve can score zero. A hidden third variable can make two unrelated things move together. Each trap has a simple check, and every one of them starts with plotting the data.",
  quiz: [
    ["Monthly sales of two unrelated products both grew steadily for three years. Their correlation is 0.93. Why?", "Both share an upward trend, and correlation compares each value to its overall mean: early months are below both means, late months above. Correlate the month-to-month changes instead; for unrelated products that drops close to zero."],
    ["What is Spearman's rank correlation and when does it help?", "Pearson's r computed on the ranks of the data instead of the values. One extreme point can only take the top rank, so it can't dominate. It also captures any monotonic (always increasing) relationship, not just straight lines."],
    ["Pearson r = 0.02 between temperature and demand for a product. Does temperature not matter?", "Not necessarily. r only measures straight-line relationships. Demand could rise in both cold and hot weather (a U-shape) and still give r ≈ 0. Plot it."],
    ["Ice cream sales and sunscreen sales correlate at 0.8. Should you promote ice cream to sell sunscreen?", "No. Both are driven by a third variable, sunny weather (a confounder). Within days of similar weather the correlation largely disappears. Correlation alone can't tell you about cause."],
    ["You only analysed your top 20 customers, and order size barely correlates with discount. Across all customers it's strong. What happened?", "Restricted range. Within a narrow slice of the data there's little variation in x, so the noise dominates and r shrinks. The relationship is still there."],
  ],
  diy: {
    intro: "Put x in A2:A61 and y in B2:B61 (or two time series in date order).",
    steps: [
      ["Pearson correlation and R² (the share of variance explained by a straight line).", "D1: =CORREL(A2:A61,B2:B61)\nD2: =D1^2"],
      ["Spearman rank correlation: rank both columns, then correlate the ranks. RANK.AVG handles ties.", "E2: =RANK.AVG(A2,$A$2:$A$61,1)\nF2: =RANK.AVG(B2,$B$2:$B$61,1)\nD3: =CORREL(E2:E61,F2:F61)"],
      ["Trend trap: correlate the changes from one period to the next, not the levels. Start at row 3.", "G3: =A3-A2\nH3: =B3-B2\nD4: =CORREL(G3:G61,H3:H61)"],
      ["Outlier check: find the point with the most influence. A quick proxy is the product of standardised x and y; the biggest values drive r.", "I2: =STANDARDIZE(A2,AVERAGE($A$2:$A$61),STDEV.S($A$2:$A$61))*STANDARDIZE(B2,AVERAGE($B$2:$B$61),STDEV.S($B$2:$B$61))\n=MAX(I2:I61)/SUM(I2:I61)   (share of r from one point)"],
      ["Hidden group check: if you have a group label in C, compute the correlation within each group. Excel 365 FILTER does this directly.", "=CORREL(FILTER(A2:A61,C2:C61=\"Summer\"),FILTER(B2:B61,C2:C61=\"Summer\"))"],
      ["Curve check: add x² and see whether R² jumps. LINEST with two columns fits y = a + b·x + c·x².", "J2: =A2^2\n=INDEX(LINEST(B2:B61,A2:A61^{1,2},TRUE,TRUE),3,1)   (R² of the curve)"],
      ["Is r different from zero? t-statistic and two-sided p-value. Only valid for independent points, not trending series.", "D6: =D1*SQRT((60-2)/(1-D1^2))\nD7: =T.DIST.2T(ABS(D6),60-2)"],
    ],
  },
  deeper: [
    ["Yule (1926), Why do we sometimes get nonsense-correlations between time-series?, JRSS 89(1)", "https://doi.org/10.2307/2341482", "the original paper on spurious correlation of trends"],
    ["Granger & Newbold (1974), Spurious regressions in econometrics, J. Econometrics 2(2)", "https://doi.org/10.1016/0304-4076(74)90034-7", "why regressing one random walk on another 'finds' relationships"],
    ["Anscombe (1973), Graphs in statistical analysis, The American Statistician 27(1)", "https://doi.org/10.1080/00031305.1973.10478966", "four datasets, same r, completely different pictures"],
    ["Spearman (1904), The proof and measurement of association between two things, AJP 15(1)", "https://doi.org/10.2307/1412159", "where rank correlation comes from"],
    ["Matejka & Fitzmaurice (2017), Same stats, different graphs (Datasaurus Dozen)", "https://doi.org/10.1145/3025453.3025912", "a modern, memorable Anscombe"],
    ["Tyler Vigen, Spurious correlations", "https://www.tylervigen.com/spurious-correlations", "hundreds of real, absurd examples"],
    ["OpenIntro Statistics (free textbook), ch. 8: Introduction to linear regression", "https://www.openintro.org/book/os/", "correlation, influential points and residuals"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor" opacity=".6"><circle cx="14" cy="44" r="3"/><circle cx="20" cy="38" r="3"/><circle cx="24" cy="48" r="3"/><circle cx="30" cy="42" r="3"/><circle cx="34" cy="50" r="3"/><circle cx="18" cy="52" r="3"/></g><circle cx="84" cy="10" r="5" fill="currentColor"/><path d="M10 54 L86 8" stroke-dasharray="4 4"/></svg>`,

  mount(root) {
    const { Plot, watch, css, rng } = Lab;
    let seed = 3, trap = "trend", fix = false;
    const TRAPS = {
      trend: ["Shared trend", "Monthly sales of two unrelated products that both grew over five years.", "Correlate month-to-month changes"],
      outlier: ["One extreme point", "Spend per customer vs. returns, with one corporate account far larger than the rest.", "Use rank correlation / drop the point"],
      curve: ["Curved relationship", "Daily temperature vs. demand for a product used in both cold and hot weather.", "Fit a curve, not a line"],
      confound: ["Hidden third variable", "Ice cream sales vs. sunscreen sales by day. Both depend on the weather.", "Look within each weather group"],
      range: ["Restricted range", "Discount vs. order size, but only the 15 largest customers were analysed.", "Look at the full range"],
    };

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="ct-two">
          <figure class="plot">
            <canvas id="sc" aria-label="Scatter plot of y against x with a fitted line"></canvas>
            <figcaption id="scCap">Scatter of y against x with the least-squares line.</figcaption>
          </figure>
          <figure class="plot">
            <canvas id="side" aria-label="Second view of the data that reveals the trap"></canvas>
            <figcaption id="sideCap"></figcaption>
          </figure>
        </div>
        <div class="legend" id="leg"></div>
        <div class="plot" style="padding:14px">
          <h4 class="ct-h">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.ct-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:14px}
        .ct-two figure{margin:0;min-width:0}
        .ct-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}</style>`,
      panel: `
        <div class="ctrl"><label>The trap</label>
          <div class="seg" id="trap" style="flex-wrap:wrap">${Object.entries(TRAPS).map(([k, [t]]) => `<button type="button" data-v="${k}" aria-pressed="${k === trap}">${t}</button>`).join("")}</div></div>
        <p id="desc" style="margin:0 0 14px;font-size:.88rem;color:var(--muted)"></p>
        <div class="ctrl"><label for="real">True link between x and y <output id="realV"></output></label><input type="range" id="real" min="0" max="1" step="0.05" value="0"></div>
        <div class="ctrl"><label for="n">Points <output id="nV"></output></label><input type="range" id="n" min="15" max="200" step="5" value="60"></div>
        <div class="ctrl"><label>Apply the check</label>
          <div class="seg" id="fix"><button type="button" data-v="0" aria-pressed="true">Off</button><button type="button" data-v="1" aria-pressed="false" id="fixOn">On</button></div></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New data</button></div>`,
      notes: `
        <section>
          <h2>What r measures</h2>
          <div class="eq">r = Σ (x − x̄)(y − ȳ) ÷ √( Σ(x − x̄)² · Σ(y − ȳ)² )</div>
          <p>Each point adds the product of how far it sits from the mean in x and in y. Points top-right and bottom-left push r up; top-left and bottom-right push it down. That one formula explains every trap: anything that puts many points (or one huge point) in the same corners inflates r, whether or not x drives y.</p>
        </section>
        <section>
          <h2>The checks</h2>
          <ul>
            <li><b>Shared trend:</b> correlate the changes (first differences) or the residuals after removing trend and seasonality.</li>
            <li><b>Extreme point:</b> compare Pearson with Spearman. A big gap means a few points are doing the work.</li>
            <li><b>Curve:</b> plot it. r ≈ 0 only rules out a straight line.</li>
            <li><b>Hidden variable:</b> compare within groups that hold the third variable steady, or include it in a regression.</li>
            <li><b>Restricted range:</b> r depends on how spread out x is in your sample. A narrow slice understates the link.</li>
          </ul>
          <p>Groups that reverse the direction of a relationship are their own trap, Simpson's paradox. See <a href="#outliers">outliers</a> for the robust ideas behind rank methods.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Shared trend with the true link at 0: r is high. Turn the check on and the changes correlate near 0. Now raise the true link: the changes pick it up.</li>
            <li>One extreme point with the link at 0: Pearson is strong, Spearman near 0.</li>
            <li>Curved relationship: r is tiny though y depends almost entirely on x. The quadratic R² shows it.</li>
            <li>Restricted range with the link at 0.6: compare r for the 15 customers with r for everyone.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const S = new Plot($("#sc"), { x: [0, 1], y: [0, 1], pad: { l: 48, b: 40 } });
    const V = new Plot($("#side"), { x: [0, 1], y: [0, 1], pad: { l: 48, b: 40 } });
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    function corr(x, y) { const mx = mean(x), my = mean(y); let a = 0, b = 0, c = 0; for (let i = 0; i < x.length; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return a / Math.sqrt(b * c) || 0; }
    function ranks(a) { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; }
    const spear = (x, y) => corr(ranks(x), ranks(y));
    function line(x, y) { const mx = mean(x), my = mean(y); let a = 0, b = 0; for (let i = 0; i < x.length; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; } const s = a / b; return [my - s * mx, s]; }
    function quadR2(x, y) {
      // least squares on [1, x, x²] via normal equations
      const n = x.length, X = x.map((v) => [1, v, v * v]), A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bb = [0, 0, 0];
      for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { bb[j] += X[i][j] * y[i]; for (let k = 0; k < 3; k++) A[j][k] += X[i][j] * X[i][k]; }
      for (let c = 0; c < 3; c++) { for (let r2 = c + 1; r2 < 3; r2++) { const f = A[r2][c] / A[c][c]; for (let k = c; k < 3; k++) A[r2][k] -= f * A[c][k]; bb[r2] -= f * bb[c]; } }
      const w = [0, 0, 0]; for (let r2 = 2; r2 >= 0; r2--) { let s = bb[r2]; for (let k = r2 + 1; k < 3; k++) s -= A[r2][k] * w[k]; w[r2] = s / A[r2][r2]; }
      const my = mean(y); let ss = 0, sr = 0; for (let i = 0; i < n; i++) { const p = w[0] + w[1] * x[i] + w[2] * x[i] ** 2; ss += (y[i] - my) ** 2; sr += (y[i] - p) ** 2; }
      return { r2: 1 - sr / ss, w };
    }

    function gen() {
      const r = rng(seed * 31 + Object.keys(TRAPS).indexOf(trap)), n = +$("#n").value, L = +$("#real").value, e = Math.sqrt(1 - L * L);
      const d = { x: [], y: [], g: [], t: [] };
      if (trap === "trend") {
        let a = 100, b = 60;
        for (let i = 0; i < n; i++) { const z1 = r.normal(), z2 = L * z1 + e * r.normal(); a += 1.5 + 4 * z1; b += 0.9 + 3 * z2; d.t.push(i + 1); d.x.push(a); d.y.push(b); }
      } else if (trap === "outlier") {
        for (let i = 0; i < n - 1; i++) { const z1 = r.normal(), z2 = L * z1 + e * r.normal(); d.x.push(50 + 10 * z1); d.y.push(20 + 4 * z2); d.g.push(0); }
        d.x.push(160); d.y.push(52); d.g.push(1);
      } else if (trap === "curve") {
        for (let i = 0; i < n; i++) { const x = -5 + 40 * r(); d.x.push(x); d.y.push(40 + 0.12 * (x - 15) ** 2 + L * 0.8 * (x - 15) + 4 * r.normal()); }
      } else if (trap === "confound") {
        for (let i = 0; i < n; i++) { const sun = r() < 0.5 ? 1 : 0, z1 = r.normal(), z2 = L * z1 + e * r.normal(); d.g.push(sun); d.x.push(200 + 220 * sun + 40 * z1); d.y.push(80 + 120 * sun + 20 * z2); }
      } else {
        for (let i = 0; i < n; i++) { const x = 2 + 18 * r(), z = r.normal(); d.x.push(x); d.y.push(10 + L * 2.2 * x + Math.sqrt(1 - L * L * 0.6) * 9 * z); }
        const idx = d.x.map((v, i) => i).sort((a2, b2) => d.x[b2] - d.x[a2]).slice(0, 15);
        d.g = d.x.map((_, i) => (idx.includes(i) ? 1 : 0));
      }
      return d;
    }

    function fit(P, x, y, xl, yl) {
      const ax = Math.min(...x), bx = Math.max(...x), ay = Math.min(...y), by = Math.max(...y), px = (bx - ax) * 0.07 || 1, py = (by - ay) * 0.08 || 1;
      P.x = [ax - px, bx + px]; P.y = [ay - py, by + py];
      P.clear(); P.axes({ xLabel: xl, yLabel: yl, xCount: 5, yCount: 5 });
    }
    function lineOn(P, x, y, col) { const [a, b] = line(x, y); P.path(P.x, P.x.map((v) => a + b * v), col, 2.2); }

    function draw() {
      const [, desc, fixName] = TRAPS[trap];
      $("#desc").textContent = desc; $("#fixOn").textContent = `On: ${fixName.toLowerCase()}`;
      $("#realV").textContent = (+$("#real").value).toFixed(2); $("#nV").textContent = $("#n").value;
      const d = gen(), { x, y } = d, R = corr(x, y), RS = spear(x, y);
      const acc = css("--accent"), alt = css("--bad"), warm = css("--warm"), mut = css("--muted");
      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      const lines = [];
      let after = null, afterName = "", afterTxt = null;
      const mx = mean(x), my = mean(y);
      let sxy = 0, sxx = 0, syy = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; });
      lines.push(`x̄ = ${mx.toFixed(1)}, ȳ = ${my.toFixed(1)}; Σ(x−x̄)(y−ȳ) = ${sxy.toFixed(0)}, Σ(x−x̄)² = ${sxx.toFixed(0)}, Σ(y−ȳ)² = ${syy.toFixed(0)}`);
      lines.push(`r = ${sxy.toFixed(0)} ÷ √(${sxx.toFixed(0)} × ${syy.toFixed(0)}) = ${B(R.toFixed(3))}; Spearman ρ = ${B(RS.toFixed(3))}`);
      let leg = `<span><i style="background:${acc}"></i>Data</span><span><i style="background:${warm}"></i>Straight-line fit</span>`;

      fit(S, x, y, "x", "y");
      const col = (i) => (trap === "outlier" && d.g[i]) || (trap === "confound" && d.g[i] && fix) || (trap === "range" && d.g[i]) ? alt : acc;
      const hideOut = trap === "range" && !fix;
      x.forEach((v, i) => { if (hideOut && !d.g[i]) S.dot(v, y[i], 3, mut); else S.dot(v, y[i], trap === "outlier" && d.g[i] ? 6 : 3.4, col(i)); });

      if (trap === "trend") {
        lineOn(S, x, y, warm);
        $("#scCap").textContent = "Levels: product A vs. product B, one dot per month.";
        const dx = x.slice(1).map((v, i) => v - x[i]), dy = y.slice(1).map((v, i) => v - y[i]);
        after = corr(dx, dy); afterName = "r of monthly changes";
        if (fix) {
          fit(V, dx, dy, "change in A", "change in B"); dx.forEach((v, i) => V.dot(v, dy[i], 3.2, acc)); lineOn(V, dx, dy, warm);
          $("#sideCap").textContent = "Month-to-month changes. The shared trend is gone.";
        } else {
          const all = x.concat(y); V.x = [0, x.length + 1]; V.y = [Math.min(...all) * 0.95, Math.max(...all) * 1.03];
          V.clear(); V.axes({ xLabel: "month", yLabel: "units", xCount: 5, yCount: 5 });
          V.path(d.t, x, acc, 2); V.path(d.t, y, alt, 2);
          $("#sideCap").textContent = "Over time: both series simply trend upwards.";
          leg += `<span><i style="background:${alt}"></i>Product B over time</span>`;
        }
        lines.push(`changes: Δx = x(t) − x(t−1), Δy likewise; r(Δx, Δy) = ${B(after.toFixed(3))} ${M(`(true link ${$("#real").value})`)}`);
      } else if (trap === "outlier") {
        const xs = x.slice(0, -1), ys = y.slice(0, -1);
        after = corr(xs, ys); afterName = "r without the extreme point";
        lineOn(S, x, y, warm); if (fix) lineOn(S, xs, ys, alt);
        $("#scCap").textContent = fix ? "Red line: fit without the extreme point." : "One large account sits far from the rest.";
        const rx = ranks(x), ry = ranks(y); fit(V, rx, ry, "rank of x", "rank of y");
        rx.forEach((v, i) => V.dot(v, ry[i], d.g[i] ? 6 : 3.2, d.g[i] ? alt : acc));
        $("#sideCap").textContent = "Ranks: the extreme point is just the top rank and loses its pull.";
        const zx = (x[x.length - 1] - mx) / Math.sqrt(sxx / (x.length - 1)), zy = (y[y.length - 1] - my) / Math.sqrt(syy / (y.length - 1));
        lines.push(`the extreme point alone contributes (${zx.toFixed(1)} × ${zy.toFixed(1)}) ÷ ${x.length - 1} = ${B((zx * zy / (x.length - 1)).toFixed(3))} of r = ${R.toFixed(3)}`);
        lines.push(`drop it: r = ${B(after.toFixed(3))}`);
        leg += `<span><i style="background:${alt}"></i>Extreme point${fix ? " / fit without it" : ""}</span>`;
      } else if (trap === "curve") {
        lineOn(S, x, y, warm);
        const q = quadR2(x, y); after = Math.sqrt(Math.max(0, q.r2)); afterName = "√R² of curve fit";
        if (fix) { const xx = []; for (let i = 0; i <= 80; i++) xx.push(S.x[0] + (S.x[1] - S.x[0]) * i / 80); S.path(xx, xx.map((v) => q.w[0] + q.w[1] * v + q.w[2] * v * v), alt, 2.4); leg += `<span><i style="background:${alt}"></i>Curve fit</span>`; }
        $("#scCap").textContent = "Temperature (°C) vs. demand.";
        const [a, b] = line(x, y), res = y.map((v, i) => v - a - b * x[i]);
        fit(V, x, res, "temperature", "residual from line"); V.path(V.x, [0, 0], mut, 1.4, [4, 4]); x.forEach((v, i) => V.dot(v, res[i], 3.2, acc));
        $("#sideCap").textContent = "Residuals from the straight line form a clear U: the line is the wrong shape.";
        lines.push(`straight line R² = r² = ${B((R * R).toFixed(3))}; adding x² gives R² = ${B(q.r2.toFixed(3))}`);
        lines.push(`curve: demand = ${q.w[0].toFixed(1)} ${q.w[1] < 0 ? "−" : "+"} ${Math.abs(q.w[1]).toFixed(2)}·T + ${q.w[2].toFixed(3)}·T²`);
      } else if (trap === "confound") {
        lineOn(S, x, y, warm);
        const gx = (g) => x.filter((_, i) => d.g[i] === g), gy = (g) => y.filter((_, i) => d.g[i] === g);
        const r0 = corr(gx(0), gy(0)), r1 = corr(gx(1), gy(1)); after = (r0 + r1) / 2; afterName = "average r within groups";
        if (fix) { lineOn(S, gx(0), gy(0), acc); lineOn(S, gx(1), gy(1), alt); leg += `<span><i style="background:${alt}"></i>Sunny days</span>`; }
        $("#scCap").textContent = fix ? "Coloured by weather, with a separate line for each group." : "Ice cream vs. sunscreen sales by day.";
        const days = x.map((_, i) => i);
        V.x = [-0.6, 1.6]; const ally = x.concat(y); V.y = [0, Math.max(...ally) * 1.08];
        V.clear(); V.axes({ xLabel: "", yLabel: "units", xTicks: [], yCount: 5 });
        const g = V.ctx; g.fillStyle = css("--ink"); g.font = "500 12px " + css("--font-body"); g.textAlign = "center";
        [[0, "Cloudy days"], [1, "Sunny days"]].forEach(([k, t]) => { g.fillStyle = css("--ink"); g.fillText(t, V.sx(k), V.sy(0) + 18); days.forEach((i) => { if (d.g[i] !== k) return; const j = ((i * 37) % 100) / 100 - 0.5; V.dot(k - 0.2 + j * 0.25, x[i], 2.6, acc); V.dot(k + 0.2 + j * 0.25, y[i], 2.6, alt); }); });
        $("#sideCap").textContent = "Both products jump on sunny days. Blue: ice cream, red: sunscreen.";
        lines.push(`within cloudy days r = ${B(r0.toFixed(3))}; within sunny days r = ${B(r1.toFixed(3))} ${M(`(true link ${$("#real").value})`)}`);
      } else {
        const ix = x.filter((_, i) => d.g[i]), iy = y.filter((_, i) => d.g[i]);
        const rTop = corr(ix, iy); after = R; afterName = "r top 15 only → everyone"; afterTxt = `${rTop.toFixed(2)} → ${R.toFixed(2)}`;
        if (fix) lineOn(S, x, y, warm); else lineOn(S, ix, iy, warm);
        $("#scCap").textContent = fix ? "All customers: the full range of discounts." : "Only the 15 largest customers (grey = not analysed).";
        fit(V, [0, 1], [-1, 1], "", "correlation"); V.clear(); V.y = [0, 1.05]; V.x = [-0.6, 1.6];
        V.axes({ xTicks: [], yLabel: "r", yCount: 5 });
        const g = V.ctx;
        [[0, rTop, "Top 15 only", alt], [1, R, "All customers", acc]].forEach(([k, v, t, c]) => { g.fillStyle = c; g.globalAlpha = 0.75; g.fillRect(V.sx(k - 0.3), V.sy(Math.max(0, v)), V.sx(k + 0.3) - V.sx(k - 0.3), V.sy(0) - V.sy(Math.max(0, v))); g.globalAlpha = 1; g.fillStyle = css("--ink"); g.font = "500 12px " + css("--font-body"); g.textAlign = "center"; g.fillText(t, V.sx(k), V.sy(0) + 18); g.fillText(v.toFixed(2), V.sx(k), V.sy(Math.max(0, v)) - 6); });
        $("#sideCap").textContent = "Same relationship, different slice of x.";
        const sd = (a) => Math.sqrt(a.reduce((s, v) => s + (v - mean(a)) ** 2, 0) / (a.length - 1));
        lines.push(`top 15: SD of x = ${sd(ix).toFixed(2)}, r = ${B(rTop.toFixed(3))}; everyone: SD of x = ${sd(x).toFixed(2)}, r = ${B(R.toFixed(3))}`);
        leg += `<span><i style="background:${alt}"></i>Top 15 customers</span>`;
      }
      $("#leg").innerHTML = leg;
      const nn = x.length, tt = R * Math.sqrt((nn - 2) / (1 - R * R));
      lines.push(M(`naive t-test of r: t = r√((n−2)/(1−r²)) = ${tt.toFixed(1)}${trap === "trend" ? " — invalid here, the points aren't independent" : ""}`));
      $("#ro").innerHTML = `
        <div class="ro"><b>Pearson r</b><span class="num">${R.toFixed(2)}</span></div>
        <div class="ro"><b>Spearman ρ</b><span class="num">${RS.toFixed(2)}</span></div>
        <div class="ro" style="grid-column:1/-1"><b>${afterName}</b><span class="num">${afterTxt || after.toFixed(2)}</span></div>`;
      $("#work").innerHTML = lines.map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    const seg = (id, set) => $(id).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; set(b.dataset.v); $(id).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    seg("#trap", (v) => (trap = v));
    seg("#fix", (v) => (fix = v === "1"));
    ["#real", "#n"].forEach((s) => $(s).addEventListener("input", draw));
    $("#newd").addEventListener("click", () => { seed++; draw(); });
    draw();
    return watch([S.c, V.c], (resized) => { if (resized) { S.resize(); V.resize(); } draw(); });
  },
});
