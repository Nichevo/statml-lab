Lab.register({
  id: "bayesian-updating",
  group: "Probability",
  title: "Bayesian updating: start with a belief, let the data move it",
  blurb: "A new supplier was late on 2 of its first 5 shipments. Is it really a 40% late supplier? Bayesian updating blends what you knew about suppliers in general with the new data, and says how sure you can be.",
  lede: "With little data, raw percentages swing wildly: 2 late out of 5 is '40% late', 0 out of 3 is 'never late'. Bayesian updating starts from a prior belief, here what's typical for suppliers like this one, and moves it towards the data as evidence builds up. Early on the prior dominates; after a few hundred shipments the data does. At every point you get a full range of plausible values and can ask direct questions like 'what's the chance this supplier is worse than 15% late?'",
  quiz: [
    ["Prior: suppliers average 10% late, worth about 20 shipments of evidence. The new supplier is late 2 of 5. What's the posterior mean?", "Prior counts: 2 late, 18 on time. Add the data: 4 late, 21 on time. Posterior mean = 4 ÷ 25 = 16%. Between the prior's 10% and the raw 40%, much nearer the prior because 5 shipments is weak evidence."],
    ["What does 'prior strength = 20 shipments' mean in practice?", "The prior counts as much as 20 real shipments would. After 20 real shipments, prior and data have equal weight; after 200, the data has 10× the weight."],
    ["How is a 90% credible interval different from a 90% confidence interval?", "A credible interval is a direct probability statement: given the prior and data, there's a 90% chance the late rate is in this range. A confidence interval is a statement about the method: 90% of intervals built this way contain the truth."],
    ["Your prior was badly wrong (you assumed 5%, the supplier is really 30% late). Does Bayesian updating get stuck?", "No, but it takes longer to get there. A strong wrong prior slows learning, which is why prior strength should reflect how similar this supplier really is to the reference group."],
    ["Why is this the same idea as exponential smoothing or shrinking new-item forecasts towards the category?", "All three blend a prior estimate with new evidence, weighting the evidence more as it accumulates. Here the weight is n ÷ (n + prior strength), worked out from the probability model rather than chosen by hand."],
  ],
  diy: {
    intro: "B1 = prior mean late rate (0.10), B2 = prior strength in shipments (20), B3 = late shipments observed, B4 = total shipments observed.",
    steps: [
      ["Prior as counts: a (late) and b (on time).", "a: =B1*B2   b: =(1-B1)*B2"],
      ["Posterior counts: add what you observed.", "a': =B1*B2+B3   b': =(1-B1)*B2+(B4-B3)"],
      ["Posterior mean late rate.", "=(B1*B2+B3)/(B2+B4)"],
      ["Weight on the data (the rest is on the prior).", "=B4/(B4+B2)"],
      ["90% credible interval (a' in D1, b' in E1).", "=BETA.INV(0.05, D1, E1)   to   =BETA.INV(0.95, D1, E1)"],
      ["Probability the true late rate is above 15%.", "=1-BETA.DIST(0.15, D1, E1, TRUE)"],
    ],
  },
  deeper: [
    ["Gelman et al. (2013), Bayesian Data Analysis, 3rd ed. (free PDF from the authors)", "https://sites.stat.columbia.edu/gelman/book/", "the standard textbook; chapter 2 covers this exact beta-binomial model"],
    ["Efron & Morris (1977), Stein's paradox in statistics, Scientific American 236(5)", "https://doi.org/10.1038/scientificamerican0577-119", "why shrinking towards the group average beats raw averages"],
    ["Kruschke (2013), Bayesian estimation supersedes the t test, Journal of Experimental Psychology: General 142(2)", "https://doi.org/10.1037/a0029146", "Bayesian comparison of two groups, with credible intervals"],
    ["Bayes & Price (1763), An essay towards solving a problem in the doctrine of chances, Philosophical Transactions 53", "https://doi.org/10.1098/rstl.1763.0053", "where it started: inferring a rate from successes and failures"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 58 C 20 58, 24 26, 34 26 S 48 58, 62 58" stroke-opacity=".45"/><path d="M30 58 C 46 58, 50 8, 58 8 S 70 58, 92 58" stroke-width="2.5"/><path d="M40 40 L52 40" stroke-opacity=".6"/><path d="M48 36 L52 40 L48 44" stroke-opacity=".6"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, lgamma, ibeta } = Lab;
    const NMAX = 200, TH = 0.15;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const key = (c, t, dash) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><svg width="20" height="8"><path d="M1 4 H19" stroke="${c}" stroke-width="2.5" ${dash ? 'stroke-dasharray="4 3"' : ""}/></svg>${t}</span>`;
    const dbeta = (x, a, b) => (x <= 0 || x >= 1 ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) + lgamma(a + b) - lgamma(a) - lgamma(b)));
    const qbeta = (p, a, b) => { let lo = 0, hi = 1; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (ibeta(a, b, m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
    const pct = (v, d = 1) => fmt(v * 100, d) + "%";

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0"><div style="padding:4px 6px 0">${h4("Prior + data → posterior")}</div><canvas id="b1" aria-label="Prior, likelihood and posterior for the late rate"></canvas>
          <div id="b1Key" style="padding:0 8px;font-size:.82rem;color:var(--muted)"></div><figcaption id="b1Cap"></figcaption></figure>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Estimate as shipments arrive")}</div><canvas id="b2" aria-label="Posterior mean and interval against shipments observed"></canvas><figcaption id="b2Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(`Chance the supplier is worse than ${TH * 100}% late`)}</div><canvas id="b3" aria-label="Posterior probability that the late rate exceeds the threshold"></canvas><figcaption id="b3Cap"></figcaption></figure>`)}
        <div class="plot" style="padding:14px">${h4("Worked out")}<div id="work" style="font:.82rem/1.8 var(--font-mono)"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">A new supplier. Each shipment is on time or late. What's its real late rate?</p>
        <div class="ctrl"><label for="pm">Prior: typical late rate for suppliers like this <output id="pmV"></output></label><input type="range" id="pm" min="0.02" max="0.4" step="0.01" value="0.1"></div>
        <div class="ctrl"><label for="ps">Prior strength (worth this many shipments) <output id="psV"></output></label><input type="range" id="ps" min="1" max="100" step="1" value="20"></div>
        <div class="ctrl"><label for="tr">The supplier's true late rate (hidden in real life) <output id="trV"></output></label><input type="range" id="tr" min="0.02" max="0.5" step="0.01" value="0.22"></div>
        <div class="ctrl"><label for="n">Shipments received so far <output id="nV"></output></label><input type="range" id="n" min="0" max="${NMAX}" step="1" value="10"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New shipment history</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Beta prior + yes/no data = beta posterior</h2>
          <p>A belief about a rate between 0 and 1 is conveniently described by a beta distribution, Beta(a, b). Think of a and b as imaginary late and on-time shipments you've "already seen". A prior mean of 10% with strength 20 is Beta(2, 18).</p>
          <div class="eq">posterior = Beta(a + late, b + on time)<br>posterior mean = (a + late) ÷ (a + b + n) = w × (late ÷ n) + (1 − w) × prior mean, &nbsp; w = n ÷ (n + a + b)</div>
          <p>That's Bayes' rule, posterior ∝ prior × likelihood, worked out once for this model. The posterior after today becomes the prior for tomorrow, so you can update shipment by shipment.</p>
        </section>
        <section>
          <h2>Choosing the prior</h2>
          <p>The prior mean comes from a reference group: other suppliers of the same kind, the same lane, last year. The strength says how much you trust that this supplier is like them. Weak (2–5 shipments) lets the data take over almost at once; strong (50+) needs a lot of evidence to move. A flat prior Beta(1, 1) says "any rate equally likely" and gives roughly the raw rate.</p>
        </section>
        <section>
          <h2>Why it's useful in planning</h2>
          <ul>
            <li>New suppliers, new lanes, new SKUs: sensible estimates from day one, instead of wild early percentages.</li>
            <li>Direct risk questions: "there's a 70% chance this supplier is worse than our 15% limit".</li>
            <li>The same shrinkage idea is behind forecasting slow movers from their category, and behind <a href="#exponential-smoothing">exponential smoothing</a>'s blend of old level and new data.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set shipments to 0: the posterior is the prior. Step up one at a time and watch it move.</li>
            <li>Make the prior strong (80) and wrong (true rate 40%). Watch how many shipments it takes the estimate to catch up.</li>
            <li>Make the prior weak (2). The estimate tracks the raw rate, with all its early jumps.</li>
            <li>Press "New shipment history" a few times at 10 shipments: the raw rate jumps much more than the posterior mean.</li>
          </ol>
          <p>Related: <a href="#confidence-intervals">confidence intervals</a>, <a href="#hypothesis-test">p-values</a>, <a href="#distributions">distributions</a>, <a href="#new-product">new-product forecasting</a> and <a href="#ab-power">A/B tests</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let seed = 5, U = null, S = null;
    const gen = () => { const r = rng(seed * 37 + 1); U = Array.from({ length: NMAX }, () => r()); };
    gen();
    const p1 = new Plot($("#b1"), { x: [0, 0.6], pad: { l: 46, b: 38 } }), p2 = new Plot($("#b2"), { x: [0, NMAX], y: [0, 0.6], pad: { l: 46, b: 38 } }), p3 = new Plot($("#b3"), { x: [0, NMAX], y: [0, 1], pad: { l: 46, b: 38 } });

    function compute() {
      const pm = +$("#pm").value, ps = +$("#ps").value, tr = +$("#tr").value, n = +$("#n").value, a0 = pm * ps, b0 = (1 - pm) * ps;
      const late = U.map((u) => (u < tr ? 1 : 0)), cum = []; let c = 0; late.forEach((v) => cum.push((c += v)));
      const path = Array.from({ length: NMAX + 1 }, (_, k) => { const L = k ? cum[k - 1] : 0, a = a0 + L, b = b0 + k - L; return { k, L, a, b, mean: a / (a + b), lo: qbeta(0.05, a, b), hi: qbeta(0.95, a, b), raw: k ? L / k : NaN, pw: 1 - ibeta(a, b, TH) }; });
      S = { pm, ps, tr, n, a0, b0, path, cur: path[n] };
    }
    function d1() {
      const { a0, b0, cur, n, tr } = S, xmax = Math.min(1, Math.max(0.3, cur.hi * 1.5, S.pm * 2.2, tr * 1.4, n ? (cur.L / n) * 1.3 : 0)), xs = Array.from({ length: 301 }, (_, i) => 0.0005 + (i / 300) * (xmax - 0.001));
      const pri = xs.map((x) => dbeta(x, a0, b0)), post = xs.map((x) => dbeta(x, cur.a, cur.b));
      const lik = n ? (() => { const L = cur.L, raw = xs.map((x) => Math.exp(L * Math.log(Math.max(x, 1e-12)) + (n - L) * Math.log(1 - x))), mx = Math.max(...raw); return raw.map((v) => (v / mx) * Math.max(...post) * 0.8); })() : null;
      const top = Math.min(Math.max(...post, ...pri.filter(isFinite)), 60) * 1.12, g = p1.ctx;
      p1.resize(); p1.x = [0, xmax]; p1.y = [0, top]; p1.clear();
      p1.axes({ xLabel: "late rate", yLabel: "belief (density)", xFormat: (v) => Math.round(v * 100) + "%", yFormat: (v) => fmt(v, 0) });
      p1.clip(() => { g.save(); g.fillStyle = css("--accent"); g.globalAlpha = 0.18; g.beginPath(); g.moveTo(p1.sx(cur.lo), p1.sy(0)); xs.forEach((x, i) => { if (x >= cur.lo && x <= cur.hi) g.lineTo(p1.sx(x), p1.sy(Math.min(post[i], top))); }); g.lineTo(p1.sx(cur.hi), p1.sy(0)); g.closePath(); g.fill(); g.restore(); });
      p1.path(xs, pri.map((v) => Math.min(v, top)), css("--muted"), 2, [5, 4]);
      if (lik) p1.path(xs, lik, css("--warm"), 2);
      p1.path(xs, post.map((v) => Math.min(v, top)), css("--accent"), 3);
      p1.path([tr, tr], [0, top], css("--good"), 1.5, [3, 3]);
      $("#b1Key").innerHTML = key(css("--muted"), "prior", 1) + key(css("--warm"), "what the data alone says") + key(css("--accent"), "posterior (90% interval shaded)") + key(css("--good"), "true rate", 1);
      $("#b1Cap").innerHTML = n ? `${cur.L} late out of ${n} (raw rate <b>${pct(cur.L / n)}</b>). Posterior mean <b>${pct(cur.mean)}</b>, 90% credible interval ${pct(cur.lo)} to ${pct(cur.hi)}. The data has ${Math.round((n / (n + S.ps)) * 100)}% of the weight, the prior ${Math.round((S.ps / (n + S.ps)) * 100)}%.` : `No shipments yet: the posterior is the prior, mean ${pct(S.pm)}, 90% interval ${pct(cur.lo)} to ${pct(cur.hi)}.`;
    }
    function d2() {
      const P = S.path, ks = P.map((p) => p.k), g = p2.ctx, top = Math.min(1, Math.max(0.3, S.tr * 1.6, S.pm * 2, ...P.slice(5).map((p) => p.hi)) * 1.05);
      p2.resize(); p2.y = [0, top]; p2.clear(); p2.axes({ xLabel: "shipments received", yLabel: "late rate", yFormat: (v) => Math.round(v * 100) + "%" });
      g.save(); g.fillStyle = css("--accent"); g.globalAlpha = 0.15; g.beginPath(); P.forEach((p, i) => (i ? g.lineTo : g.moveTo).call(g, p2.sx(p.k), p2.sy(p.hi))); [...P].reverse().forEach((p) => g.lineTo(p2.sx(p.k), p2.sy(p.lo))); g.closePath(); g.fill(); g.restore();
      p2.path(ks.slice(1), P.slice(1).map((p) => Math.min(p.raw, top)), css("--warm"), 1.5);
      p2.path(ks, P.map((p) => p.mean), css("--accent"), 2.5);
      p2.path([0, NMAX], [S.tr, S.tr], css("--good"), 1.5, [3, 3]);
      p2.path([S.n, S.n], [0, top], css("--muted"), 1, [2, 3]);
      const c = S.cur;
      $("#b2Cap").innerHTML = `Orange: raw late rate so far (jumpy early on). Blue: posterior mean with its 90% band. Green: the true rate (${pct(S.tr, 0)}). After ${NMAX} shipments the posterior is ${pct(P[NMAX].mean)}, interval ${pct(P[NMAX].lo)}–${pct(P[NMAX].hi)}.`;
    }
    function d3() {
      const P = S.path;
      p3.resize(); p3.clear(); p3.axes({ xLabel: "shipments received", yLabel: `P(late rate > ${TH * 100}%)`, yFormat: (v) => Math.round(v * 100) + "%", yTicks: [0, 0.25, 0.5, 0.75, 1] });
      p3.path([0, NMAX], [0.9, 0.9], css("--bad"), 1, [4, 3]); p3.path([0, NMAX], [0.1, 0.1], css("--good"), 1, [4, 3]);
      p3.path(P.map((p) => p.k), P.map((p) => p.pw), css("--violet"), 2.5);
      p3.dot(S.n, S.cur.pw, 6, css("--warm"), css("--surface"));
      const first = P.find((p) => p.k > 0 && (p.pw > 0.9 || p.pw < 0.1) && P.slice(p.k).every((q) => (p.pw > 0.9 ? q.pw > 0.9 : q.pw < 0.1)));
      $("#b3Cap").innerHTML = `Now: <b>${Math.round(S.cur.pw * 100)}%</b> chance this supplier is worse than ${TH * 100}% late. ${first ? `From shipment ${first.k} on, it stays ${first.pw > 0.9 ? "above 90% (red line): clearly a problem supplier" : "below 10% (green line): clearly fine"}.` : "It doesn't settle above 90% or below 10% within 200 shipments: the true rate is close to the limit."}`;
    }
    function work() {
      const { pm, ps, a0, b0, cur, n } = S, b = (t) => `<b style="color:var(--ink)">${t}</b>`, w = n / (n + ps);
      $("#work").innerHTML = [
        `prior: mean ${pct(pm)}, strength ${ps} → Beta(a = ${fmt(a0, 2)}, b = ${fmt(b0, 2)})`,
        `data: ${cur.L} late, ${n - cur.L} on time`,
        `posterior: Beta(${fmt(a0, 2)} + ${cur.L}, ${fmt(b0, 2)} + ${n - cur.L}) = Beta(${fmt(cur.a, 2)}, ${fmt(cur.b, 2)})`,
        `posterior mean = ${fmt(cur.a, 2)} ÷ ${fmt(cur.a + cur.b, 2)} = ${b(pct(cur.mean, 2))}${n ? ` = ${fmt(w, 3)} × ${pct(cur.L / n)} + ${fmt(1 - w, 3)} × ${pct(pm)}` : ""}`,
        `90% interval = BETA.INV(0.05 and 0.95, ${fmt(cur.a, 2)}, ${fmt(cur.b, 2)}) = ${b(`${pct(cur.lo)} to ${pct(cur.hi)}`)}`,
        `P(rate > ${TH * 100}%) = 1 − BETA.DIST(${TH}, ${fmt(cur.a, 2)}, ${fmt(cur.b, 2)}, TRUE) = ${b(pct(cur.pw))}`,
      ].map((l) => `<div style="margin-bottom:3px">${l}</div>`).join("");
    }
    function readouts() {
      const { cur, n } = S;
      $("#ro").innerHTML = `<div class="ro"><b>Raw late rate</b><span class="num">${n ? pct(cur.L / n) : "–"}</span></div>
        <div class="ro"><b>Posterior mean</b><span class="num">${pct(cur.mean)}</span></div>
        <div class="ro"><b>90% credible interval</b><span class="num">${pct(cur.lo, 0)}–${pct(cur.hi, 0)}</span></div>
        <div class="ro"><b>Weight on the data</b><span class="num">${Math.round((n / (n + S.ps)) * 100)}%</span></div>
        <div class="ro"><b>P(worse than ${TH * 100}%)</b><span class="pill ${cur.pw > 0.9 ? "bad" : cur.pw < 0.1 ? "ok" : "warn"}">${Math.round(cur.pw * 100)}%</span></div>`;
    }
    function labels() { $("#pmV").textContent = pct(+$("#pm").value, 0); $("#psV").textContent = $("#ps").value; $("#trV").textContent = pct(+$("#tr").value, 0); $("#nV").textContent = $("#n").value; }
    function update() { labels(); compute(); d1(); d2(); d3(); work(); readouts(); }
    ["#pm", "#ps", "#tr", "#n"].forEach((s) => $(s).addEventListener("input", update));
    $("#resim").addEventListener("click", () => { seed++; gen(); update(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 5; gen(); update(); });
    update();
    return watch([$("#b1"), $("#b2"), $("#b3")], () => { d1(); d2(); d3(); });
  },
});
