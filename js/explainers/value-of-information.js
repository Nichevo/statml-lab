Lab.register({
  id: "value-of-information",
  group: "Risk",
  title: "Value of information: is a forecast, test or survey worth paying for?",
  blurb: "Decide how big a first order to place for a new product when demand could be high, medium or low. Work out the expected value of each choice, how much perfect foresight would be worth (EVPI), and what an imperfect market test is really worth (EVSI) before you pay for it.",
  lede: "Information only has value if it could change what you do. Before paying for a market test, a better forecast or a supplier audit, you can work out its most it could be worth: the expected profit if you decide after seeing it, minus the expected profit if you decide now. If the result couldn't change the decision, it's worth nothing, however interesting it is.",
  quiz: [
    ["What is the expected value of perfect information (EVPI)?", "The expected profit if you could learn the true state before choosing, minus the best expected profit choosing now. It's the most any forecast, test or study could be worth for this decision."],
    ["A test is 90% accurate and EVPI is $150k. Is the test worth $150k?", "No. An imperfect test is worth less than perfect information: its value (EVSI) is the gain from deciding after seeing its result, which accounts for the times it misleads you. Pay at most EVSI, and only if EVSI beats the cost."],
    ["When is information worth nothing?", "When no possible result would change your choice. If you'd order big whatever the test said, the test has zero decision value, even if it's accurate."],
    ["How does Bayes' rule come in?", "Each test result updates the chances of high, medium and low demand: P(state | result) ∝ P(result | state) × P(state). You then pick the best order for those updated chances."],
    ["Where does this show up in supply chains?", "Paying for early sales data before the main order (Fisher and Raman's 'accurate response'), a pilot launch in one region, extra forecasting work on an item, or an audit before qualifying a supplier."],
  ],
  diy: {
    intro: "Payoffs in a table: actions in rows 2–4 (big, small, skip), states in columns B–D (high, medium, low). Prior chances in B6:D6. Test accuracy in G1.",
    steps: [
      ["Expected value of each action.", "E2: =SUMPRODUCT(B2:D2, $B$6:$D$6)   (fill down)"],
      ["Best you can do now.", "E5: =MAX(E2:E4)"],
      ["Expected value with perfect information: best payoff in each state, weighted.", "=SUMPRODUCT(B6:D6, {MAX(B2:B4), MAX(C2:C4), MAX(D2:D4)})   EVPI = that − E5"],
      ["Test likelihoods: right with chance a, otherwise one of the two wrong results equally.", "P(says high | high) = G1   P(says high | medium) = (1−G1)/2"],
      ["Chance of each test result, then posterior chances (Bayes).", "P(says high) = SUMPRODUCT(likelihood row, priors)   posterior = likelihood × prior / P(says high)"],
      ["Best action after each result, then EVSI.", "EVSI = Σ P(result) × MAX over actions of SUMPRODUCT(payoffs, posterior) − E5"],
    ],
  },
  deeper: [
    ["Howard (1966), Information value theory, IEEE Transactions on Systems Science and Cybernetics 2(1)", "https://doi.org/10.1109/TSSC.1966.300074", "the founding paper on the value of information"],
    ["Fisher & Raman (1996), Reducing the cost of demand uncertainty through accurate response to early sales, Operations Research 44(1)", "https://doi.org/10.1287/opre.44.1.87", "what early sales data is worth to a fashion buyer"],
    ["Felli & Hazen (1998), Sensitivity analysis and the expected value of perfect information, Medical Decision Making 18(1)", "https://doi.org/10.1177/0272989X9801800117", "EVPI as a sensitivity measure"],
    ["Hubbard, How to measure anything (book site)", "https://www.howtomeasureanything.com/", "applying information value to business measurements"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="26" width="12" height="12"/><path d="M18 32 L40 14 M18 32 L40 50"/><circle cx="46" cy="14" r="6"/><circle cx="46" cy="50" r="6"/><path d="M52 14 L76 6 M52 14 L76 22 M52 50 L76 42 M52 50 L76 58" stroke-opacity=".6"/><path d="M80 6 H90 M80 22 H90 M80 42 H90 M80 58 H90" stroke-width="3"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const box = (t, id) => `<div class="plot" style="padding:14px;min-width:0;overflow-x:auto">${h4(t)}<div id="${id}"></div></div>`;
    const $ = (s) => root.querySelector(s);
    const ST = ["high", "medium", "low"], AC = ["Big order (40k units)", "Small order (15k units)", "Don't launch"], AS = ["Big", "Small", "Skip"];
    root.innerHTML = Lab.page(this, {
      figure: `
        ${box("Deciding now: expected value of each choice", "now")}
        <div style="height:14px"></div>
        ${two(fig("c1", "Which choice wins as the chance of high demand changes", 300, "Expected value of each order size against the chance of high demand"), fig("c2", "What a market test is worth at each accuracy", 300, "Expected value of sample information against test accuracy, with the perfect-information ceiling and the test's cost"))}
        <div style="height:14px"></div>
        ${box("Deciding after a market test", "post")}`,
      panel: `
        <p class="hint" style="margin:0">A new product needs one production order before the season. Demand could be high, medium or low. A pilot in one region (the “test”) would hint at which.</p>
        <div class="ctrl"><label for="pH">Chance demand is high <output id="pHV"></output></label><input type="range" id="pH" min="0" max="1" step="0.01" value="0.3"></div>
        <div class="ctrl"><label for="pL">Chance demand is low <output id="pLV"></output></label><input type="range" id="pL" min="0" max="1" step="0.01" value="0.3"></div>
        <div class="ctrl"><label for="bl">Big order's result if demand is low <output id="blV"></output></label><input type="range" id="bl" min="-1200" max="0" step="25" value="-500"></div>
        <div class="ctrl"><label for="acc">Test accuracy (right about the demand level) <output id="accV"></output></label><input type="range" id="acc" min="0.34" max="1" step="0.01" value="0.75"></div>
        <div class="ctrl"><label for="tc">Cost of the test <output id="tcV"></output></label><input type="range" id="tc" min="0" max="200" step="5" value="40"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Step 1: the best you can do now</h2>
          <p>List the choices, the possible states and the profit of each pair. The expected value (EV) of a choice is its profits weighted by the chances of each state. Pick the highest. This is the baseline any information has to beat.</p>
          <div class="eq">EV(action) = Σ P(state) × profit(action, state)</div>
        </section>
        <section>
          <h2>Step 2: the ceiling, perfect information</h2>
          <p>If a crystal ball told you the state first, you'd pick the best action in each state. Weight those best profits by the same chances:</p>
          <div class="eq">EVPI = Σ P(state) × max<sub>a</sub> profit(a, state) − max<sub>a</sub> EV(a)</div>
          <p>No test, forecast or consultant can be worth more than this for this decision. If EVPI is small, stop gathering data and decide.</p>
        </section>
        <section>
          <h2>Step 3: what a real test is worth</h2>
          <p>A real test is sometimes wrong. For each possible result, update the chances with <a href="#bayesian-updating">Bayes' rule</a>, pick the best action for the updated chances, and weight by how often each result comes up:</p>
          <div class="eq">EVSI = Σ<sub>results</sub> P(result) × max<sub>a</sub> EV(a | result) − max<sub>a</sub> EV(a)</div>
          <p>Buy the test if EVSI is more than its cost. Notice the flat stretches in the chart: below some accuracy the test can't change any decision, so it's worth exactly zero.</p>
        </section>
        <section>
          <h2>Where else it applies</h2>
          <p>The same sums price a better forecast (how much would cutting error change the order?), an early-sales read before committing the bulk of a seasonal buy, a supplier audit, or a longer <a href="#ab-power">A/B test</a>. With continuous choices, simulate it: run <a href="#monte-carlo-risk">Monte Carlo</a> once deciding blind and once deciding after the information, and compare.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Make the big order's low-demand loss only −$100k: the big order wins whatever the test says, and the test becomes worthless.</li>
            <li>Set the chance of high demand to 0.5 and low to 0.1: you're fairly sure, so EVPI shrinks.</li>
            <li>Lower the test accuracy until the EVSI line hits zero. That's the accuracy below which the pilot isn't worth running at any price.</li>
          </ul>
        </section>`,
    });
    const P = () => { let pH = +$("#pH").value, pL = +$("#pL").value; if (pH + pL > 1) pL = 1 - pH; return { pH, pL, pM: 1 - pH - pL, bl: +$("#bl").value, acc: +$("#acc").value, tc: +$("#tc").value }; };
    const pay = (p) => [[900, 300, p.bl], [400, 250, 0], [0, 0, 0]];
    const ev = (row, pr) => row.reduce((s, v, j) => s + v * pr[j], 0);
    function solve(p, acc) {
      const pr = [p.pH, p.pM, p.pL], M = pay(p), evs = M.map((r) => ev(r, pr)), best = Math.max(...evs), bi = evs.indexOf(best);
      const perfect = pr.reduce((s, q, j) => s + q * Math.max(...M.map((r) => r[j])), 0);
      const lik = (s, st) => (s === st ? acc : (1 - acc) / 2), res = [0, 1, 2].map((s) => { const ps = pr.reduce((a, q, st) => a + lik(s, st) * q, 0), post = pr.map((q, st) => (ps > 0 ? (lik(s, st) * q) / ps : 0)), e = M.map((r) => ev(r, post)), b = Math.max(...e); return { s, ps, post, e, b, bi: e.indexOf(b) }; });
      const withTest = res.reduce((a, r) => a + r.ps * r.b, 0);
      return { pr, M, evs, best, bi, perfect, evpi: perfect - best, res, withTest, evsi: Math.max(0, withTest - best) };
    }
    const k$ = (v) => (v < 0 ? "−$" : "$") + fmt(Math.abs(v), 0) + "k";
    const C1 = new Plot($("#c1"), { x: [0, 1], pad: { l: 56, b: 38 } }), C2 = new Plot($("#c2"), { x: [0.34, 1], pad: { l: 56, b: 38 } });
    const COL = ["--accent", "--warm", "--muted"];
    function now(R, p) {
      $("#now").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);white-space:nowrap"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 8px;text-align:left">profit $k</th>${ST.map((s, j) => `<th style="padding:3px 8px">${s}<br><span style="font-weight:400">P = ${fmt(R.pr[j], 2)}</span></th>`).join("")}<th style="padding:3px 8px">expected value</th></tr></thead><tbody>` +
        R.M.map((r, i) => `<tr style="text-align:right;border-top:1px solid var(--line);${i === R.bi ? "background:var(--accent-soft)" : ""}"><td style="padding:3px 8px;text-align:left;font-family:var(--font-body)">${AC[i]}</td>${r.map((v) => `<td style="padding:3px 8px">${fmt(v, 0)}</td>`).join("")}<td style="padding:3px 8px">${r.map((v, j) => `${fmt(R.pr[j], 2)}×${fmt(v, 0)}`).join(" + ")} = <b>${fmt(R.evs[i], 0)}</b></td></tr>`).join("") +
        `<tr style="text-align:right;border-top:2px solid var(--line)"><td style="padding:3px 8px;text-align:left;font-family:var(--font-body)">Best in each state (crystal ball)</td>${[0, 1, 2].map((j) => `<td style="padding:3px 8px;color:var(--good)">${fmt(Math.max(...R.M.map((r) => r[j])), 0)}</td>`).join("")}<td style="padding:3px 8px">= <b>${fmt(R.perfect, 0)}</b></td></tr></tbody></table>
        <p style="margin:10px 0 0">Deciding now: <b>${AC[R.bi].toLowerCase()}</b>, worth ${k$(R.best)} on average. With perfect foresight: ${k$(R.perfect)}. <b>EVPI = ${k$(R.perfect)} − ${k$(R.best)} = ${k$(R.evpi)}</b>, the most any information could be worth.</p>`;
    }
    function post(R, p) {
      $("#post").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);white-space:nowrap"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 8px;text-align:left">test says</th><th style="padding:3px 8px">how often</th><th style="padding:3px 8px">updated chances H / M / L</th><th style="padding:3px 8px">best choice then</th><th style="padding:3px 8px">its EV</th></tr></thead><tbody>` +
        R.res.map((r) => `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 8px;text-align:left">“${ST[r.s]}”</td><td style="padding:3px 8px">${fmt(r.ps, 3)}</td><td style="padding:3px 8px">${r.post.map((x) => fmt(x, 2)).join(" / ")}</td><td style="padding:3px 8px;font-family:var(--font-body);${r.bi !== R.bi ? "color:var(--bad);font-weight:600" : ""}">${AS[r.bi]}</td><td style="padding:3px 8px">${fmt(r.b, 0)}</td></tr>`).join("") +
        `</tbody></table><p style="margin:10px 0 0">Worked for “high”: P = ${fmt(p.acc, 2)}×${fmt(R.pr[0], 2)} + ${fmt((1 - p.acc) / 2, 3)}×${fmt(R.pr[1], 2)} + ${fmt((1 - p.acc) / 2, 3)}×${fmt(R.pr[2], 2)} = ${fmt(R.res[0].ps, 3)}; P(high | says high) = ${fmt(p.acc * R.pr[0], 3)} / ${fmt(R.res[0].ps, 3)} = ${fmt(R.res[0].post[0], 2)}.</p>
        <p style="margin:6px 0 0">With the test: ${R.res.map((r) => `${fmt(r.ps, 2)}×${fmt(r.b, 0)}`).join(" + ")} = ${k$(R.withTest)}. <b>EVSI = ${k$(R.withTest)} − ${k$(R.best)} = ${k$(R.evsi)}</b>${R.res.every((r) => r.bi === R.bi) ? " (no result changes the choice, so the test is worth nothing)" : `; red: results that change the choice`}.</p>`;
    }
    function d1(R, p) {
      const xs = [], ys = [[], [], []]; for (let h = 0; h <= 1.0001; h += 0.01) { const l = Math.min(p.pL, 1 - h), pr = [h, 1 - h - l, l]; xs.push(h); pay(p).forEach((r, i) => ys[i].push(ev(r, pr))); }
      const all = ys.flat(); C1.resize(); C1.y = [Math.min(...all) - 40, Math.max(...all) + 40]; C1.clear(); C1.axes({ xLabel: "chance demand is high", yLabel: "expected value", xFormat: (v) => fmt(v * 100, 0) + "%", yFormat: k$ });
      ys.forEach((y, i) => C1.path(xs, y, css(COL[i]), i === R.bi ? 3 : 1.8));
      C1.path([p.pH, p.pH], C1.y, css("--ink"), 1, [3, 3]);
      const g = C1.ctx; g.font = `600 11px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "bottom"; ys.forEach((y, i) => { g.fillStyle = css(COL[i]); g.fillText(AS[i], C1.sx(1) - 4, C1.sy(y[y.length - 1]) - 4); });
      let sw = null; for (let k = 1; k < xs.length; k++) { const a = ys[0][k - 1] - ys[1][k - 1], b = ys[0][k] - ys[1][k]; if (a * b < 0) sw = xs[k]; }
      $("#c1Cap").innerHTML = `The chance of low demand is held at ${fmt(p.pL * 100, 0)}% (or what's left). Thick line: today's best choice. ${sw !== null ? `Big beats small once high demand is more than about <b>${fmt(sw * 100, 0)}%</b> likely, so information that moves your belief across that line is what has value.` : "One choice wins across the whole range here, so information can't change the decision."}`;
    }
    function d2(R, p) {
      const xs = [], ys = []; for (let a = 0.34; a <= 1.0001; a += 0.01) { xs.push(a); ys.push(solve(p, a).evsi); }
      C2.resize(); C2.y = [0, Math.max(R.evpi, p.tc, 10) * 1.15]; C2.clear(); C2.axes({ xLabel: "test accuracy", yLabel: "value of the test", xFormat: (v) => fmt(v * 100, 0) + "%", xTicks: [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], yFormat: k$ });
      C2.path([0.34, 1], [R.evpi, R.evpi], css("--good"), 1.5, [6, 4]);
      C2.path([0.34, 1], [p.tc, p.tc], css("--bad"), 1.5, [3, 3]);
      C2.path(xs, ys, css("--accent"), 2.5);
      C2.dot(p.acc, R.evsi, 6, css("--ink"), css("--surface"));
      const be = xs.find((x, i) => ys[i] > p.tc), z = xs.find((x, i) => ys[i] > 0.5);
      $("#c2Cap").innerHTML = `Blue: EVSI. Green dashed: EVPI ceiling (${k$(R.evpi)}). Red dotted: the test's cost (${k$(p.tc)}). ${z === undefined ? "No accuracy makes the test useful here." : `Below about ${fmt(z * 100, 0)}% accuracy the test can't change the decision and is worth nothing. ${be === undefined ? "It never pays its cost." : `It pays its cost above about ${fmt(be * 100, 0)}% accuracy.`}`}`;
    }
    function readouts(R, p) {
      const net = R.evsi - p.tc;
      $("#ro").innerHTML = [
        ["Best choice now", `<span class="num">${AS[R.bi]} (${k$(R.best)})</span>`],
        ["EVPI (ceiling)", `<span class="num">${k$(R.evpi)}</span>`],
        ["EVSI of the test", `<span class="num">${k$(R.evsi)}</span>`],
        ["Run the test?", `<span class="pill ${net > 0 ? "ok" : "bad"}">${net > 0 ? "yes, gains " + k$(net) : "no, loses " + k$(-net)}</span>`],
      ].map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels(p) { $("#pHV").textContent = fmt(p.pH * 100, 0) + "%"; $("#pLV").textContent = fmt(p.pL * 100, 0) + "%" + (+$("#pL").value > p.pL + 1e-9 ? " (capped)" : ""); $("#blV").textContent = k$(p.bl); $("#accV").textContent = fmt(p.acc * 100, 0) + "%"; $("#tcV").textContent = k$(p.tc); }
    function draw() { const p = P(); labels(p); const R = solve(p, p.acc); now(R, p); post(R, p); d1(R, p); d2(R, p); readouts(R, p); }
    root.querySelectorAll("input[type=range]").forEach((e) => e.addEventListener("input", draw));
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); draw(); });
    draw();
    return watch([$("#c1"), $("#c2")], draw);
  },
});
