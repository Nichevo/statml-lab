Lab.register({
  id: "ab-power",
  group: "Statistical analysis",
  title: "A/B tests and statistical power: how big a trial do you need?",
  blurb: "Before trialling a new display in stores, work out how many stores you need to spot the lift. Too few and a real win looks like noise, and the 'wins' you do see are exaggerated.",
  lede: "An A/B test (a controlled trial) splits stores, customers or weeks into a test group that gets the change and a control group that doesn't. The question is never just 'is it significant?' but 'was the trial big enough to see the effect if it's there?' That chance is called power. It depends on four things: how big the real effect is, how noisy the measure is, how many units are in each group, and how strict the significance level is. Get any of them wrong and a good idea gets thrown away, or a lucky fluke gets rolled out.",
  quiz: [
    ["A trial with 80% power finds no significant lift. What does that tell you?", "If the true lift were as big as the one you planned for, you'd have had an 80% chance of detecting it. So a lift that size is unlikely, but a smaller one is still possible. 'Not significant' is not 'no effect'."],
    ["How many more stores do you need to detect half the lift with the same power?", "Four times as many. The required sample grows with 1 ÷ effect², so halving the effect quadruples n."],
    ["Your underpowered trial (30% power) shows a significant +9% lift. The true lift is 3%. How can that be?", "With low power, only the lucky samples cross the significance line, and those are the ones that overshot. Significant results from small trials systematically exaggerate the effect (a 'type M' or magnitude error)."],
    ["How does comparing with each store's own sales last year help?", "Much of the store-to-store spread is just big vs small stores. Adjusting for last year (CUPED, or analysing the change) removes that part of the noise. With a correlation of r = 0.8, the noise SD falls by √(1 − 0.64) = 0.6, so you need only 36% as many stores."],
    ["You check results every day and stop as soon as p < 0.05. What goes wrong?", "Peeking. Each look is another chance for noise to cross the line, so the real false-alarm rate is far above 5%. Fix the sample size in advance, or use a sequential method designed for repeated looks."],
  ],
  diy: {
    intro: "Inputs: B1 = noise SD per store (e.g. 200), B2 = lift to detect in units (e.g. 50), B3 = significance level (0.05), B4 = target power (0.8), B5 = stores per group.",
    steps: [
      ["Critical z for a two-sided test.", "=NORM.S.INV(1-B3/2)"],
      ["z for the target power.", "=NORM.S.INV(B4)"],
      ["Stores needed per group.", "=ROUNDUP(2*(NORM.S.INV(1-B3/2)+NORM.S.INV(B4))^2*B1^2/B2^2, 0)"],
      ["Standard error of the difference for the stores you actually have.", "=B1*SQRT(2/B5)"],
      ["Power you'll actually get with B5 stores per group.", "=NORM.S.DIST(B2/(B1*SQRT(2/B5))-NORM.S.INV(1-B3/2), TRUE)"],
      ["Smallest lift you can reliably detect (80% power) with B5 stores.", "=(NORM.S.INV(1-B3/2)+NORM.S.INV(0.8))*B1*SQRT(2/B5)"],
      ["Adjusting for last year's sales with correlation r in B6: use this smaller SD in place of B1.", "=B1*SQRT(1-B6^2)"],
    ],
  },
  deeper: [
    ["Kohavi, Tang & Xu (2020), Trustworthy Online Controlled Experiments, Cambridge University Press", "https://doi.org/10.1017/9781108653985", "the practical guide to A/B testing at scale"],
    ["Cohen (1992), A power primer, Psychological Bulletin 112(1)", "https://doi.org/10.1037/0033-2909.112.1.155", "a short, classic guide to power and effect sizes"],
    ["Gelman & Carlin (2014), Beyond power calculations: assessing type S (sign) and type M (magnitude) errors, Perspectives on Psychological Science 9(6)", "https://doi.org/10.1177/1745691614551642", "why significant results from small studies exaggerate"],
    ["Deng, Xu, Kohavi & Walker (2013), Improving the sensitivity of online controlled experiments by utilizing pre-experiment data, WSDM", "https://doi.org/10.1145/2433396.2433413", "CUPED: using last period's data to cut noise"],
    ["Evan Miller, Sample size calculator", "https://www.evanmiller.org/ab-testing/sample-size.html", "an online calculator for conversion-rate tests"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 56 C 18 56, 22 14, 34 14 S 50 56, 64 56" stroke-opacity=".5"/><path d="M30 56 C 44 56, 48 14, 60 14 S 76 56, 92 56" stroke-width="2.5"/><path d="M48 6 V60" stroke-dasharray="3 3"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng, qnorm, pnorm, dnorm } = Lab;
    const BASE = 1000, SIMS = 400;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0"><div style="padding:4px 6px 0">${h4("What the trial could show: no real lift vs the real lift")}</div><canvas id="p1" aria-label="Sampling distributions of the measured lift under no effect and under the true effect"></canvas><figcaption id="p1Cap"></figcaption></figure>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Power against stores per group")}</div><canvas id="p2" aria-label="Power curve against sample size"></canvas><figcaption id="p2Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(`${SIMS} simulated trials`)}</div><canvas id="p3" aria-label="Histogram of measured lifts in simulated trials"></canvas><figcaption id="p3Cap"></figcaption></figure>`)}
        <div class="plot" style="padding:14px">${h4("Worked out")}<div id="work" style="font:.82rem/1.8 var(--font-mono)"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Trial: a new display in stores. Average store sells ${BASE.toLocaleString()} units a week.</p>
        <div class="ctrl"><label for="lift">True lift from the display <output id="liftV"></output></label><input type="range" id="lift" min="0" max="10" step="0.5" value="4"></div>
        <div class="ctrl"><label for="sd">Store-to-store spread (SD) <output id="sdV"></output></label><input type="range" id="sd" min="50" max="400" step="10" value="200"></div>
        <div class="ctrl"><label for="r">Adjust for last year's sales: correlation r <output id="rV"></output></label><input type="range" id="r" min="0" max="0.95" step="0.05" value="0"></div>
        <div class="ctrl"><label for="n">Stores in each group <output id="nV"></output></label><input type="range" id="n" min="5" max="400" step="5" value="40"></div>
        <div class="ctrl"><label for="al">Significance level α <output id="alV"></output></label><input type="range" id="al" min="0.01" max="0.2" step="0.01" value="0.05"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="need" type="button">Set stores for 80% power</button><button class="btn" id="resim" type="button">Re-run the simulations</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The two curves</h2>
          <p>Run the trial many times and the measured lift (test average − control average) would scatter around the truth with a standard error of SE = σ × √(2/n). The grey curve is that scatter if the display does nothing; the blue curve if it really lifts sales. You call a result significant when it lands beyond the critical value, chosen so that only α (5%) of the grey curve lies beyond it in either tail.</p>
          <div class="eq">power = P(blue curve beyond the critical value) ≈ Φ( lift ÷ SE − z<sub>1−α/2</sub> )<br>stores per group for power 1 − β: n = 2 (z<sub>1−α/2</sub> + z<sub>1−β</sub>)² σ² ÷ lift²</div>
          <p><b>Type I error</b> (α): calling a dud a winner. <b>Type II error</b> (β = 1 − power): missing a real winner. 80% power is the usual target; 90% for decisions that are expensive to get wrong.</p>
        </section>
        <section>
          <h2>The winner's curse</h2>
          <p>When power is low, only trials that happened to overshoot reach significance. Average the significant ones and the lift looks much bigger than it is (the orange bars in the simulation). That's why a pilot's "+10%" often shrinks to +3% after rollout. A well-powered trial avoids most of this.</p>
        </section>
        <section>
          <h2>Cheaper ways to more power</h2>
          <ul>
            <li><b>Cut the noise</b>: compare each store with its own history (CUPED or difference-in-differences), or pair similar stores and randomise within pairs.</li>
            <li><b>Run longer</b>: averaging more weeks per store lowers σ.</li>
            <li><b>Measure closer to the change</b>: sales of the displayed category are less noisy than total store sales.</li>
            <li>Don't just raise α: that buys power by accepting more false winners.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>With the defaults, power is low. Press "Set stores for 80% power" and see how many stores it takes.</li>
            <li>Back at 40 stores, raise r to 0.8. The curves narrow and power jumps, with no extra stores.</li>
            <li>Halve the true lift from 4% to 2% and press the 80% button again: about four times the stores.</li>
            <li>Set the lift to 0. About α of the simulated trials still come out "significant": those are false winners.</li>
          </ol>
          <p>Related: <a href="#hypothesis-test">p-values</a>, <a href="#confidence-intervals">confidence intervals</a>, <a href="#central-limit">why averages are normal</a> and <a href="#anova-chi-square">comparing several groups</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let seed = 11, S = null, Zs = null;
    const gen = () => { const r = rng(seed); Zs = Array.from({ length: SIMS }, () => r.normal()); };
    gen();
    const p1 = new Plot($("#p1"), { x: [-1, 1], pad: { l: 46, b: 38 } }), p2 = new Plot($("#p2"), { x: [5, 400], y: [0, 1], pad: { l: 46, b: 38 } }), p3 = new Plot($("#p3"), { x: [-1, 1], pad: { l: 46, b: 38 } });
    const power = (d, se, al) => pnorm(d / se - qnorm(1 - al / 2)) + pnorm(-d / se - qnorm(1 - al / 2));
    const needN = (d, s, al, pw) => (d > 0 ? Math.ceil((2 * (qnorm(1 - al / 2) + qnorm(pw)) ** 2 * s * s) / (d * d)) : Infinity);

    function compute() {
      const liftPct = +$("#lift").value, sd0 = +$("#sd").value, r = +$("#r").value, n = +$("#n").value, al = +$("#al").value;
      const d = (BASE * liftPct) / 100, sd = sd0 * Math.sqrt(1 - r * r), se = sd * Math.sqrt(2 / n), zc = qnorm(1 - al / 2), crit = zc * se;
      const pw = power(d, se, al), n80 = needN(d, sd, al, 0.8), n90 = needN(d, sd, al, 0.9), mde = (zc + qnorm(0.8)) * se;
      const est = Zs.map((z) => d + se * z), sig = est.filter((e) => Math.abs(e) > crit), sigPos = est.filter((e) => e > crit);
      const avgWin = sigPos.length ? sigPos.reduce((a, b) => a + b, 0) / sigPos.length : NaN;
      S = { liftPct, sd0, sd, r, n, al, d, se, zc, crit, pw, n80, n90, mde, est, sig, sigPos, avgWin };
    }
    function d1() {
      const { d, se, crit } = S, half = Math.max(4.2 * se, d + 4 * se, crit * 1.3), lo = -Math.max(4 * se, crit * 1.3), hi = half, g = p1.ctx;
      const f0 = (x) => dnorm(x / se) / se, f1 = (x) => dnorm((x - d) / se) / se, top = (dnorm(0) / se) * 1.12;
      p1.resize(); p1.x = [lo, hi]; p1.y = [0, top]; p1.clear();
      p1.axes({ xLabel: "measured lift, units per store per week (test − control)", yLabel: "how likely", yTicks: [], xFormat: (v) => (v > 0 ? "+" : "") + fmt(v, 0) });
      const N = 300, xs = Array.from({ length: N + 1 }, (_, i) => lo + ((hi - lo) * i) / N);
      const fill = (a, b, f, col, alpha) => p1.clip(() => { g.save(); g.fillStyle = css(col); g.globalAlpha = alpha; g.beginPath(); g.moveTo(p1.sx(a), p1.sy(0)); for (const x of xs) if (x >= a && x <= b) g.lineTo(p1.sx(x), p1.sy(f(x))); g.lineTo(p1.sx(b), p1.sy(0)); g.closePath(); g.fill(); g.restore(); });
      fill(crit, hi, f1, "--accent", 0.3); fill(lo, -crit, f1, "--accent", 0.3);
      fill(-crit, crit, f1, "--violet", 0.18);
      fill(crit, hi, f0, "--bad", 0.45); fill(lo, -crit, f0, "--bad", 0.45);
      p1.path(xs, xs.map(f0), css("--muted"), 2); p1.path(xs, xs.map(f1), css("--accent"), 2.5);
      [crit, -crit].forEach((c) => { if (c > lo && c < hi) p1.path([c, c], [0, top], css("--ink"), 1.2, [4, 3]); });
      $("#p1Cap").innerHTML = `Grey: what the trial would measure if the display did nothing. Blue: what it would measure with the true lift of +${fmt(d, 0)} units. Dashed: significance cut-offs at ±${fmt(crit, 1)}. Red: false-alarm area (α = ${Math.round(S.al * 100)}%). Blue shading: <b>power = ${Math.round(S.pw * 100)}%</b>. Purple: the ${Math.round((1 - S.pw) * 100)}% chance of missing a real lift.`;
    }
    function d2() {
      const { d, sd, al, n } = S, ns = Array.from({ length: 80 }, (_, i) => 5 + i * 5), pw = ns.map((m) => power(d, sd * Math.sqrt(2 / m), al)), pwH = ns.map((m) => power(d / 2, sd * Math.sqrt(2 / m), al));
      p2.resize(); p2.clear(); p2.axes({ xLabel: "stores in each group", yLabel: "power", yFormat: (v) => Math.round(v * 100) + "%", yTicks: [0, 0.2, 0.4, 0.6, 0.8, 1] });
      p2.path([5, 400], [0.8, 0.8], css("--good"), 1.2, [4, 3]);
      p2.path(ns, pwH, css("--muted"), 1.8, [5, 4]); p2.path(ns, pw, css("--accent"), 2.5);
      p2.dot(n, S.pw, 6, css("--warm"), css("--surface"));
      $("#p2Cap").innerHTML = `Blue: power for a +${fmt(S.liftPct, 1)}% lift; grey dashed: for half that lift. Green: the usual 80% target, reached at <b>${isFinite(S.n80) ? S.n80.toLocaleString() : "never"}</b> stores per group${isFinite(S.n80) && S.n80 > 400 ? " (off the chart)" : ""}. Orange dot: your trial.`;
    }
    function d3() {
      const { est, crit, d, se } = S, lo = Math.min(-4 * se, d - 4 * se), hi = Math.max(4 * se, d + 4 * se), nb = 36, w = (hi - lo) / nb, g = p3.ctx;
      const bins = Array.from({ length: nb }, (_, i) => ({ x: lo + i * w, n: 0, s: 0 }));
      est.forEach((e) => { const i = Math.min(nb - 1, Math.max(0, Math.floor((e - lo) / w))); bins[i].n++; if (Math.abs(e) > crit) bins[i].s++; });
      p3.resize(); p3.x = [lo, hi]; p3.y = [0, Math.max(...bins.map((b) => b.n)) * 1.15]; p3.clear();
      p3.axes({ xLabel: "measured lift in each simulated trial", yLabel: "trials", xFormat: (v) => (v > 0 ? "+" : "") + fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      bins.forEach((b) => { const x0 = p3.sx(b.x) + 1, x1 = p3.sx(b.x + w) - 1; g.fillStyle = css("--muted"); g.globalAlpha = 0.35; g.fillRect(x0, p3.sy(b.n), x1 - x0, p3.sy(0) - p3.sy(b.n)); g.globalAlpha = 1; g.fillStyle = css("--warm"); g.fillRect(x0, p3.sy(b.s), x1 - x0, p3.sy(0) - p3.sy(b.s)); });
      p3.path([d, d], [0, p3.y[1]], css("--accent"), 2);
      if (isFinite(S.avgWin)) p3.path([S.avgWin, S.avgWin], [0, p3.y[1]], css("--warm"), 2, [5, 3]);
      const share = S.sig.length / SIMS;
      $("#p3Cap").innerHTML = `Each trial uses ${S.n} stores per group. Orange: significant results, <b>${S.sig.length} of ${SIMS}</b> (${Math.round(share * 100)}%). Blue line: the true lift (+${fmt(d, 0)}). ${isFinite(S.avgWin) && d > 0 ? `Orange dashed: the average lift among significant winners, <b>+${fmt(S.avgWin, 0)}</b>, which is ${fmt(S.avgWin / d, 1)}× the truth.` : d === 0 ? "With no real lift, every significant result is a false winner." : ""}`;
    }
    function work() {
      const { sd0, sd, r, n, se, zc, crit, d, pw, n80, al, mde } = S, b = (t) => `<b style="color:var(--ink)">${t}</b>`;
      $("#work").innerHTML = [
        r > 0 ? `noise SD after adjusting for last year = ${sd0} × √(1 − ${r}²) = ${b(fmt(sd, 1))}` : `noise SD = ${sd0} units per store per week`,
        `standard error of the difference = ${fmt(sd, 1)} × √(2 ÷ ${n}) = ${b(fmt(se, 2))}`,
        `cut-off = z(${fmt(1 - al / 2, 3)}) × SE = ${fmt(zc, 3)} × ${fmt(se, 2)} = ${b("±" + fmt(crit, 1))}`,
        `power ≈ Φ(${fmt(d, 0)} ÷ ${fmt(se, 2)} − ${fmt(zc, 3)}) = Φ(${fmt(d / se - zc, 3)}) = ${b(Math.round(pw * 100) + "%")}`,
        `stores for 80% power = 2 × (${fmt(zc, 3)} + 0.842)² × ${fmt(sd, 1)}² ÷ ${fmt(d, 0)}² = ${b(isFinite(n80) ? n80.toLocaleString() : "∞")} per group`,
        `smallest lift detectable at 80% power with ${n} stores = (${fmt(zc, 3)} + 0.842) × ${fmt(se, 2)} = ${b(fmt(mde, 1))} units (${fmt((mde / BASE) * 100, 1)}%)`,
      ].map((l) => `<div style="margin-bottom:3px">${l}</div>`).join("");
    }
    function readouts() {
      const { pw, n80, n90, mde } = S;
      $("#ro").innerHTML = `<div class="ro"><b>Power</b><span class="pill ${pw >= 0.8 ? "ok" : pw >= 0.5 ? "warn" : "bad"}">${Math.round(pw * 100)}%</span></div>
        <div class="ro"><b>Stores per group for 80%</b><span class="num">${isFinite(n80) ? n80.toLocaleString() : "–"}</span></div>
        <div class="ro"><b>…for 90%</b><span class="num">${isFinite(n90) ? n90.toLocaleString() : "–"}</span></div>
        <div class="ro"><b>Smallest detectable lift</b><span class="num">${fmt((mde / BASE) * 100, 1)}%</span></div>
        <div class="ro"><b>Winners' average lift</b><span class="num">${isFinite(S.avgWin) && S.d > 0 ? "+" + fmt((S.avgWin / BASE) * 100, 1) + "%" : "–"}</span></div>`;
    }
    function labels() {
      $("#liftV").textContent = `+${fmt(+$("#lift").value, 1)}%`; $("#sdV").textContent = $("#sd").value + " units"; $("#rV").textContent = fmt(+$("#r").value, 2);
      $("#nV").textContent = $("#n").value; $("#alV").textContent = fmt(+$("#al").value, 2);
    }
    function update() { labels(); compute(); d1(); d2(); d3(); work(); readouts(); }
    ["#lift", "#sd", "#r", "#n", "#al"].forEach((s) => $(s).addEventListener("input", update));
    $("#need").addEventListener("click", () => { compute(); if (isFinite(S.n80)) $("#n").value = Math.min(400, Math.max(5, Math.ceil(S.n80 / 5) * 5)); update(); });
    $("#resim").addEventListener("click", () => { seed++; gen(); update(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 11; gen(); update(); });
    update();
    return watch([$("#p1"), $("#p2"), $("#p3")], () => { d1(); d2(); d3(); });
  },
});
