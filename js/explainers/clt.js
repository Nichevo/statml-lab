Lab.register({
  id: "central-limit",
  group: "Probability",
  title: "The central limit theorem",
  blurb: "Start from any lopsided distribution, average a few draws, repeat. The averages pile up into a bell curve.",
  lede: "Take a sample, compute its mean, and do it again thousands of times. Whatever the shape of the data you start with, the means form a bell curve that gets narrower as each sample grows. This is why so much of statistics leans on the normal distribution.",
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor" opacity=".35"><rect x="30" y="44" width="6" height="14"/><rect x="38" y="30" width="6" height="28"/><rect x="46" y="20" width="6" height="38"/><rect x="54" y="28" width="6" height="30"/><rect x="62" y="42" width="6" height="16"/></g><path d="M8 58 C 30 58, 36 16, 49 16 S 68 58, 90 58"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const r = rng(2024);
    const D = {
      expo: { name: "Exponential (wait times)", x: [0, 6], mu: 1, sd: 1, draw: () => -Math.log(1 - r()) },
      uniform: { name: "Uniform (0 to 1)", x: [0, 1], mu: 0.5, sd: Math.sqrt(1 / 12), draw: () => r() },
      dice: { name: "One die (1 to 6)", x: [0.5, 6.5], mu: 3.5, sd: Math.sqrt(35 / 12), draw: () => 1 + Math.floor(r() * 6), discrete: true },
      bimodal: { name: "Two humps", x: [-4.5, 4.5], mu: 0, sd: Math.sqrt(0.36 + 4), draw: () => (r() < 0.5 ? -2 : 2) + 0.6 * r.normal() },
      skew: { name: "Lognormal (incomes)", x: [0, 6], mu: Math.exp(0.32), sd: Math.sqrt((Math.exp(0.64) - 1) * Math.exp(0.64)), draw: () => Math.exp(0.8 * r.normal()) },
    };

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot short">
          <canvas id="cltp" aria-label="Population distribution with the latest sample marked"></canvas>
          <figcaption>The population you sample from. Ticks show the most recent sample; the orange line is its mean.</figcaption>
        </figure>
        <figure class="plot wide">
          <canvas id="cltm" aria-label="Histogram of sample means with normal curve"></canvas>
          <div class="legend">
            <span><i style="background:var(--accent)"></i>Sample means you've collected</span>
            <span><i style="background:var(--violet)"></i>Normal curve the theorem predicts</span>
          </div>
          <figcaption>Same x axis as the plot above, so you can see the means bunch up.</figcaption>
        </figure>`,
      panel: `
        <div class="ctrl">
          <label for="dist">Population</label>
          <select id="dist">${Object.entries(D).map(([k, d]) => `<option value="${k}">${d.name}</option>`).join("")}</select>
        </div>
        <div class="ctrl">
          <label for="n">Sample size n <output id="nV"></output></label>
          <input type="range" id="n" min="1" max="60" step="1" value="5">
        </div>
        <div class="btns">
          <button class="btn" data-k="1" type="button">Draw 1 sample</button>
          <button class="btn" data-k="100" type="button">+100</button>
          <button class="btn primary" data-k="2000" type="button">+2,000</button>
          <button class="btn" id="clear" type="button">Clear</button>
        </div>
        <label class="check"><input type="checkbox" id="curve" checked> Show the predicted normal curve</label>
        <div class="readouts">
          <div class="ro"><b>Means collected</b><span class="num" id="cnt"></span></div>
          <div class="ro"><b>Population mean μ</b><span class="num" id="mu"></span></div>
          <div class="ro"><b>Average of the means</b><span class="num" id="mm"></span></div>
          <div class="ro"><b>Predicted SD, σ/√n</b><span class="num" id="se"></span></div>
          <div class="ro"><b>Observed SD of means</b><span class="num" id="sdm"></span></div>
        </div>
        <div><h4>Latest sample</h4><p class="hint num" id="latest" style="word-break:break-word"></p></div>`,
      notes: `
        <section>
          <h2>What the theorem says</h2>
          <p>If you draw n independent values from a population with mean μ and standard deviation σ, the sample mean x̄ has a distribution that gets closer to a normal curve as n grows:</p>
          <div class="eq">x̄ ≈ Normal(μ, σ / √n)</div>
          <p>The spread σ/√n is called the <b>standard error</b>. Quadrupling the sample size halves it.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Exponential with n = 1: the means are just single draws, so the histogram copies the skewed population.</li>
            <li>Raise n to 5, then 30, drawing 2,000 each time. The skew fades and the bell appears.</li>
            <li>Two humps with n = 2: you get three humps first. Averaging does strange things before it settles.</li>
            <li>Compare "Predicted SD" with "Observed SD". They agree, which is the √n rule at work.</li>
          </ol>
        </section>
        <section>
          <h2>Why it matters</h2>
          <ul>
            <li>Confidence intervals of the form x̄ ± 1.96·σ/√n rely on this bell shape.</li>
            <li>t-tests, z-tests and many A/B testing tools quietly assume it.</li>
            <li>It needs finite variance. Very heavy-tailed data (some financial returns) can converge very slowly or not at all.</li>
          </ul>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pop = new Plot($("#cltp"), { pad: { b: 28, t: 8, l: 46 } });
    const mp = new Plot($("#cltm"), { pad: { l: 46 } });
    let dist, popHist, means = [], latest = [];
    const BINS = 60;

    function hist(vals, x, bins) {
      const h = new Array(bins).fill(0), w = (x[1] - x[0]) / bins;
      for (const v of vals) { const i = Math.floor((v - x[0]) / w); if (i >= 0 && i < bins) h[i]++; }
      return h.map((c) => c / (vals.length * w));
    }

    function setDist() {
      dist = D[$("#dist").value];
      const big = Array.from({ length: 40000 }, dist.draw);
      popHist = dist.discrete ? hist(big, dist.x, 6) : hist(big, dist.x, BINS);
      means = []; latest = [];
      draw();
    }

    function drawSamples(k) {
      const n = +$("#n").value;
      for (let s = 0; s < k; s++) {
        const xs = Array.from({ length: n }, dist.draw);
        means.push(xs.reduce((a, b) => a + b, 0) / n);
        latest = xs;
      }
      draw();
    }

    function bars(p, h, color, alpha) {
      const w = (p.x[1] - p.x[0]) / h.length;
      p.clip((g) => {
        g.fillStyle = color; g.globalAlpha = alpha;
        h.forEach((v, i) => {
          const x0 = p.sx(p.x[0] + i * w), x1 = p.sx(p.x[0] + (i + 1) * w);
          g.fillRect(x0 + 0.5, p.sy(v), Math.max(1, x1 - x0 - 1), p.sy(0) - p.sy(v));
        });
      });
    }

    function draw() {
      const n = +$("#n").value;
      $("#nV").textContent = n;
      pop.x = dist.x; mp.x = dist.x;
      pop.y = [0, Math.max(...popHist) * 1.15];
      pop.clear();
      pop.axes({ yCount: 2, yFormat: () => "" });
      bars(pop, popHist, css("--muted"), 0.45);
      pop.clip((g) => {
        g.strokeStyle = css("--ink"); g.lineWidth = 1.5;
        for (const v of latest) { const x = pop.sx(v); g.beginPath(); g.moveTo(x, pop.sy(0)); g.lineTo(x, pop.sy(0) - 14); g.stroke(); }
        if (latest.length) {
          const m = latest.reduce((a, b) => a + b, 0) / latest.length;
          g.strokeStyle = css("--warm"); g.lineWidth = 3;
          g.beginPath(); g.moveTo(pop.sx(m), pop.sy(0)); g.lineTo(pop.sx(m), pop.pad.t); g.stroke();
        }
      });

      const se = dist.sd / Math.sqrt(n);
      const h = hist(means, dist.x, BINS * 2);
      const peak = 1 / (se * Math.sqrt(2 * Math.PI));
      mp.y = [0, Math.max(peak, ...(means.length ? h : [0])) * 1.12];
      mp.clear();
      mp.axes({ yLabel: "density", yCount: 4 });
      if (means.length) bars(mp, h, css("--accent"), 0.75);
      if ($("#curve").checked) mp.fn((x) => peak * Math.exp(-0.5 * ((x - dist.mu) / se) ** 2), css("--violet"), 2.5, null, 1, 400);
      if (!means.length) {
        const g = mp.ctx; g.fillStyle = css("--muted"); g.font = `14px ${css("--font-body")}`; g.textAlign = "center";
        g.fillText("Press +2,000 to collect sample means", mp.w / 2, mp.h / 2);
      }

      const k = means.length, mm = k ? means.reduce((a, b) => a + b, 0) / k : NaN;
      const sdm = k > 1 ? Math.sqrt(means.reduce((a, b) => a + (b - mm) ** 2, 0) / (k - 1)) : NaN;
      $("#cnt").textContent = k.toLocaleString();
      $("#mu").textContent = fmt(dist.mu, 3);
      $("#mm").textContent = k ? fmt(mm, 3) : "–";
      $("#se").textContent = fmt(se, 3);
      $("#sdm").textContent = k > 1 ? fmt(sdm, 3) : "–";
      $("#latest").textContent = latest.length
        ? `${latest.slice(0, 12).map((v) => v.toFixed(2)).join(", ")}${latest.length > 12 ? ", …" : ""}  →  mean ${(latest.reduce((a, b) => a + b, 0) / latest.length).toFixed(3)}`
        : "None yet.";
    }

    $("#dist").addEventListener("change", setDist);
    $("#n").addEventListener("input", () => { means = []; latest = []; draw(); });
    $("#curve").addEventListener("input", draw);
    $("#clear").addEventListener("click", () => { means = []; latest = []; draw(); });
    root.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => drawSamples(+b.dataset.k)));

    setDist();
    drawSamples(2000);
    return watch([pop.c, mp.c], (resized) => { if (resized) { pop.resize(); mp.resize(); } draw(); });
  },
});
