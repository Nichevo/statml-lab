Lab.register({
  id: "outliers",
  group: "Data quality",
  title: "Finding outliers: z-score, IQR and MAD",
  blurb: "Three common rules for spotting unusual values, run on the same data. See why one huge value can hide the others from the z-score, and why robust rules don't fall for it.",
  lede: "Before you forecast, fit a model or report an average, look for values that don't belong: a typo with an extra zero, a one-off bulk order, a sensor glitch. The textbook rule flags anything more than 3 standard deviations from the mean. The catch is that the outliers themselves inflate the mean and standard deviation, so a big enough outlier can hide itself and its neighbours. Rules built on the median and quartiles are much harder to fool.",
  quiz: [
    ["Why can the z-score rule miss an obvious outlier?", "The outlier pulls the mean towards it and inflates the standard deviation, so its own z-score shrinks. With several outliers this 'masking' can hide all of them."],
    ["What are the IQR fences?", "Q1 − 1.5 × IQR and Q3 + 1.5 × IQR, where IQR = Q3 − Q1. Anything outside is flagged. These are the whiskers on a standard box plot."],
    ["What is MAD and why multiply by 1.4826?", "MAD is the median of absolute deviations from the median. For normal data, 1.4826 × MAD estimates the standard deviation, so the rule reads like a z-score but uses robust ingredients."],
    ["You've flagged an outlier. Should you delete it?", "Not automatically. Find out what it is. A data error should be fixed or removed; a real but unusual event (a promotion, a stockout) should be labelled and handled in the model, not erased. Deleting real extremes makes risk look smaller than it is."],
    ["Your data are strongly right-skewed (most sales small, a few large). What goes wrong?", "All three rules assume a roughly symmetric shape, so they flag many genuine high values. Take logs first, or use rules designed for skewed data."],
  ],
  diy: {
    intro: "Put your values in B2:B61 (one per row). Each step uses a helper cell; adjust ranges to your data.",
    steps: [
      ["Mean and standard deviation (sample).", "D1: =AVERAGE(B2:B61)\nD2: =STDEV.S(B2:B61)"],
      ["z-score for each value, then flag |z| > 3. Fill down from C2.", "C2: =(B2-$D$1)/$D$2\nE2: =IF(ABS(C2)>3,\"outlier\",\"\")"],
      ["Quartiles, IQR and the two fences.", "D4: =QUARTILE.INC(B2:B61,1)\nD5: =QUARTILE.INC(B2:B61,3)\nD6: =D5-D4\nD7: =D4-1.5*D6   (lower fence)\nD8: =D5+1.5*D6   (upper fence)"],
      ["Flag values outside the fences.", "F2: =IF(OR(B2<$D$7,B2>$D$8),\"outlier\",\"\")"],
      ["Median and MAD. The MAD formula works as a normal formula in Excel 365; in older Excel confirm with Ctrl+Shift+Enter.", "D10: =MEDIAN(B2:B61)\nD11: =MEDIAN(ABS(B2:B61-D10))"],
      ["Modified z-score using the robust spread (1.4826 × MAD), flag above 3.5.", "G2: =(B2-$D$10)/(1.4826*$D$11)\nH2: =IF(ABS(G2)>3.5,\"outlier\",\"\")"],
      ["Count flags per method and compare. Investigate each flagged row before you change or remove it.", "=COUNTIF(H2:H61,\"outlier\")"],
    ],
  },
  deeper: [
    ["NIST Engineering Statistics Handbook: Detection of outliers", "https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm", "tests and rules of thumb"],
    ["Median absolute deviation — Wikipedia", "https://en.wikipedia.org/wiki/Median_absolute_deviation", "the robust spread estimate"],
    ["Iglewicz & Hoaglin's modified z-score (NIST)", "https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm", "where the 3.5 cut-off comes from"],
    ["Box plot — Wikipedia", "https://en.wikipedia.org/wiki/Box_plot", "Tukey's fences"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 32 h50" opacity=".4"/><g fill="currentColor" opacity=".6"><circle cx="14" cy="32" r="3"/><circle cx="22" cy="28" r="3"/><circle cx="28" cy="35" r="3"/><circle cx="34" cy="30" r="3"/><circle cx="42" cy="34" r="3"/><circle cx="50" cy="29" r="3"/></g><circle cx="86" cy="32" r="5" fill="currentColor"/><path d="M66 18 v28" stroke-dasharray="3 3"/></svg>`,

  mount(root) {
    const { Plot, watch, css, rng } = Lab;
    let seed = 4, skew = false;
    const METHODS = [
      ["z", "z-score (|z| > 3)", "mean and SD"],
      ["iqr", "IQR fences (1.5 × IQR)", "quartiles"],
      ["mad", "MAD (modified z > 3.5)", "median and MAD"],
    ];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="ol" aria-label="The same data shown three times, once per method, with each method's cut-offs and flagged points"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>Kept</span><span><i style="background:var(--bad)"></i>Flagged</span><span><i style="background:var(--ink)"></i>Planted outlier (ring)</span><span><i style="background:var(--muted)"></i>Centre and cut-offs</span></div>
          <figcaption>Each row is the same weekly sales data. Dashed lines are that method's cut-offs. Rings mark the outliers we planted.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 class="ol-h">How each method scores</h4>
          <div style="overflow-x:auto"><table id="tbl" class="ol-t"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="ol-h">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.ol-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .ol-t{width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums}
        .ol-t th{text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500}
        .ol-t td{text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono)}
        .ol-t th:first-child,.ol-t td:first-child{text-align:left;font-family:var(--font-body)}</style>`,
      panel: `
        <div class="ctrl"><label for="k">Planted outliers <output id="kV"></output></label><input type="range" id="k" min="0" max="10" step="1" value="3"></div>
        <div class="ctrl"><label for="sz">How extreme <output id="szV"></output></label><input type="range" id="sz" min="2" max="20" step="0.5" value="6"></div>
        <div class="ctrl"><label for="spread">Spread of planted outliers <output id="spreadV"></output></label><input type="range" id="spread" min="0" max="10" step="0.5" value="4"></div>
        <div class="ctrl"><label>Normal data are</label>
          <div class="seg" id="shape"><button type="button" data-v="sym" aria-pressed="true">Symmetric</button><button type="button" data-v="skew" aria-pressed="false">Right-skewed</button></div></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New data</button></div>`,
      notes: `
        <section>
          <h2>The three rules</h2>
          <div class="eq">z = (x − mean) ÷ SD → flag if |z| &gt; 3<br>IQR = Q3 − Q1 → flag if x &lt; Q1 − 1.5·IQR or x &gt; Q3 + 1.5·IQR<br>MAD = median(|x − median|)<br>modified z = (x − median) ÷ (1.4826 × MAD) → flag if |z| &gt; 3.5</div>
          <p>The z-score uses the mean and standard deviation, which a single extreme value can drag a long way. The median, quartiles and MAD barely move: up to half the data can be wild before the median breaks. That's called a high <b>breakdown point</b>.</p>
        </section>
        <section>
          <h2>Masking and swamping</h2>
          <p><b>Masking:</b> outliers inflate the SD and hide each other, so the z-score flags too few. <b>Swamping:</b> a shifted mean makes normal points on the far side look unusual. Robust rules suffer much less from both.</p>
          <p>For time series, check outliers against the forecast, not the whole history: a value can be normal in December and odd in July. See <a href="#ts-anomalies">time-series anomalies</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Plant 1 outlier and make it more extreme. The z-score catches it, but its z barely grows. The SD grows with it.</li>
            <li>Plant 8 outliers. The z-score finds few or none; MAD finds them all.</li>
            <li>Switch to right-skewed data with no planted outliers. All three rules flag real high weeks. Log the data first in practice: see <a href="#distributions">distributions</a>.</li>
            <li>Set the spread to 0 so the outliers cluster. Clustered outliers mask each other even more.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const P = new Plot($("#ol"), { x: [0, 1], y: [0.4, 3.6], pad: { l: 150, b: 36 } });
    const q = (s, p) => { const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };

    function data() {
      const r = rng(seed), k = +$("#k").value, sz = +$("#sz").value, sp = +$("#spread").value, n = 60;
      const xs = [];
      for (let i = 0; i < n; i++) xs.push({ v: skew ? Math.exp(Math.log(80) + 0.45 * r.normal()) : 100 + 15 * r.normal(), planted: false, j: r() });
      for (let i = 0; i < k; i++) { const at = Math.floor(r() * n); xs[at] = { v: 100 + 15 * (sz + sp * (r() - 0.5)), planted: true, j: r() }; }
      return xs;
    }

    function draw() {
      const k = +$("#k").value;
      $("#kV").textContent = k; $("#szV").textContent = `≈ ${$("#sz").value} SD`; $("#spreadV").textContent = `± ${(+$("#spread").value / 2).toFixed(1)} SD`;
      const xs = data(), v = xs.map((x) => x.v), n = v.length, s = v.slice().sort((a, b) => a - b);
      const mean = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
      const Q1 = q(s, 0.25), Q3 = q(s, 0.75), med = q(s, 0.5), IQR = Q3 - Q1;
      const MAD = q(v.map((x) => Math.abs(x - med)).sort((a, b) => a - b), 0.5), sMAD = 1.4826 * MAD;
      const rule = {
        z: { c: mean, lo: mean - 3 * sd, hi: mean + 3 * sd, f: (x) => Math.abs((x - mean) / sd) > 3 },
        iqr: { c: med, lo: Q1 - 1.5 * IQR, hi: Q3 + 1.5 * IQR, f: (x) => x < Q1 - 1.5 * IQR || x > Q3 + 1.5 * IQR },
        mad: { c: med, lo: med - 3.5 * sMAD, hi: med + 3.5 * sMAD, f: (x) => Math.abs((x - med) / sMAD) > 3.5 },
      };
      const lo = Math.min(...v, rule.z.lo, rule.mad.lo), hi = Math.max(...v, rule.z.hi, rule.mad.hi);
      P.x = [Math.max(0, lo - (hi - lo) * 0.04), hi + (hi - lo) * 0.04];
      P.clear(); P.axes({ xLabel: "weekly sales (units)", yTicks: [], xCount: 7 });
      const g = P.ctx;
      METHODS.forEach(([key, name], m) => {
        const yb = 3 - m, R = rule[key];
        g.fillStyle = css("--ink"); g.font = "500 12px " + css("--font-body"); g.textAlign = "right"; g.fillText(name, P.pad.l - 10, P.sy(yb) + 4);
        P.path([R.lo, R.lo], [yb - 0.42, yb + 0.42], css("--muted"), 1.6, [5, 4]);
        P.path([R.hi, R.hi], [yb - 0.42, yb + 0.42], css("--muted"), 1.6, [5, 4]);
        P.path([R.c, R.c], [yb - 0.42, yb + 0.42], css("--muted"), 2);
        if (key === "iqr") { g.strokeStyle = css("--muted"); g.lineWidth = 1.5; g.strokeRect(P.sx(Q1), P.sy(yb + 0.18), P.sx(Q3) - P.sx(Q1), P.sy(yb - 0.18) - P.sy(yb + 0.18)); }
        xs.forEach((x) => {
          const y = yb + (x.j - 0.5) * 0.6, fl = R.f(x.v);
          P.dot(x.v, y, fl ? 4.5 : 3.2, fl ? css("--bad") : css("--accent"), fl ? css("--surface") : null);
          if (x.planted) { g.strokeStyle = css("--ink"); g.lineWidth = 1.6; g.beginPath(); g.arc(P.sx(x.v), P.sy(y), 8, 0, Math.PI * 2); g.stroke(); }
        });
      });

      const planted = xs.filter((x) => x.planted).length;
      const stats = METHODS.map(([key, name]) => {
        const f = xs.filter((x) => rule[key].f(x.v)), tp = f.filter((x) => x.planted).length;
        return [name, f.length, tp, planted - tp, f.length - tp];
      });
      $("#tbl").innerHTML = `<tr><th>Method</th><th>Flagged</th><th>Planted caught</th><th>Planted missed</th><th>Normal weeks flagged</th><th>Lower cut</th><th>Upper cut</th></tr>` + stats.map(([n2, f, tp, fn, fp], i) => {
        const R = rule[METHODS[i][0]];
        return `<tr><td>${n2}</td><td>${f}</td><td style="color:var(--good)">${tp}</td><td style="color:${fn ? "var(--bad)" : "inherit"}">${fn}</td><td style="color:${fp ? "var(--warm)" : "inherit"}">${fp}</td><td>${R.lo.toFixed(1)}</td><td>${R.hi.toFixed(1)}</td></tr>`;
      }).join("");

      const top = xs.reduce((a, b) => (b.v > a.v ? b : a));
      $("#ro").innerHTML = `
        <div class="ro"><b>Mean / median</b><span class="num">${mean.toFixed(1)} / ${med.toFixed(1)}</span></div>
        <div class="ro"><b>SD / 1.4826·MAD</b><span class="num">${sd.toFixed(1)} / ${sMAD.toFixed(1)}</span></div>
        <div class="ro"><b>Largest value's z</b><span class="num">${((top.v - mean) / sd).toFixed(2)}</span></div>
        <div class="ro"><b>…its modified z</b><span class="num">${((top.v - med) / sMAD).toFixed(2)}</span></div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      $("#work").innerHTML = [
        `n = ${n}, mean = ${mean.toFixed(1)}, SD = ${sd.toFixed(1)} → z cut-offs ${mean.toFixed(1)} ± 3 × ${sd.toFixed(1)} = ${B(`${rule.z.lo.toFixed(1)} to ${rule.z.hi.toFixed(1)}`)}`,
        `Q1 = ${Q1.toFixed(1)}, Q3 = ${Q3.toFixed(1)}, IQR = ${IQR.toFixed(1)} → fences ${Q1.toFixed(1)} − ${(1.5 * IQR).toFixed(1)} and ${Q3.toFixed(1)} + ${(1.5 * IQR).toFixed(1)} = ${B(`${rule.iqr.lo.toFixed(1)} to ${rule.iqr.hi.toFixed(1)}`)}`,
        `median = ${med.toFixed(1)}, MAD = ${MAD.toFixed(1)}, × 1.4826 = ${sMAD.toFixed(1)} → ${med.toFixed(1)} ± 3.5 × ${sMAD.toFixed(1)} = ${B(`${rule.mad.lo.toFixed(1)} to ${rule.mad.hi.toFixed(1)}`)}`,
        `largest value ${top.v.toFixed(1)}: z = (${top.v.toFixed(1)} − ${mean.toFixed(1)}) ÷ ${sd.toFixed(1)} = ${B(((top.v - mean) / sd).toFixed(2))}; modified z = (${top.v.toFixed(1)} − ${med.toFixed(1)}) ÷ ${sMAD.toFixed(1)} = ${B(((top.v - med) / sMAD).toFixed(2))}`,
        M(`without outliers the SD would be about ${skew ? "36" : "15"}; the planted values inflated it to ${sd.toFixed(1)}`),
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    ["#k", "#sz", "#spread"].forEach((s) => $(s).addEventListener("input", draw));
    $("#shape").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; skew = b.dataset.v === "skew"; $("#shape").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    $("#newd").addEventListener("click", () => { seed++; draw(); });
    draw();
    return watch([P.c], (resized) => { if (resized) P.resize(); draw(); });
  },
});
