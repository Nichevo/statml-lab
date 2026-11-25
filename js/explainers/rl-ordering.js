Lab.register({
  id: "rl-ordering",
  group: "Machine learning",
  title: "Reinforcement learning: an agent learns when to reorder",
  blurb: "A Q-learning agent runs a small stockroom by trial and error: order, see the day's sales and costs, update its estimates, repeat. Watch its ordering rule take shape, compare it with the exact optimum from dynamic programming, and see what exploration and learning rate do.",
  lede: "Reinforcement learning (RL) learns a policy, a rule for what to do in each situation, from experience rather than from a formula. Each day the agent sees its stock, picks an order, then sees the cost (holding, lost sales, ordering). It keeps a table of how much each order is likely to cost in the long run from each stock level, and nudges the table after every day. With enough days, and enough trying things it isn't sure about, the table settles on a good rule. Here the problem is small enough to solve exactly, so you can see how close trial and error gets.",
  quiz: [
    ["What is a Q-value here?", "Q(s, a) is the agent's estimate of the total future cost (discounted) if it has s units, orders a, and then keeps acting well. The policy is: in each state, pick the order with the lowest Q."],
    ["Write the Q-learning update in words.", "New estimate = old estimate + α × (today's cost + γ × best estimate from tomorrow's stock − old estimate). α is the learning rate; γ discounts the future."],
    ["Why must the agent explore (sometimes order at random)?", "Otherwise it only ever tries the orders it currently thinks are best. If its early estimates are wrong, it never finds out. ε-greedy exploration tries a random order a share ε of the time."],
    ["With a fixed cost per order, what shape does the learned policy take?", "An (s, S) rule: order nothing until stock falls to a trigger level s, then order up to S. That's the shape the exact optimum has, as Scarf proved."],
    ["Why use RL in practice, if dynamic programming gives the exact answer?", "Real problems have too many states to enumerate (many products, lead times, a pipeline of orders) or no exact model of demand. RL can learn from simulation or data, usually with a neural network instead of a table. It's far more data-hungry and harder to trust, so it's best checked against simple rules."],
  ],
  diy: {
    intro: "Excel can do Q-learning with a table and a long sheet of simulated days. Stock levels 0–20 down rows, orders 0–12 across columns of a Q table (start all at 0). α in B1, γ in B2, ε in B3.",
    steps: [
      ["Pick today's order: random with chance ε, otherwise the cheapest in the stock's row.", "=IF(RAND()<$B$3, RANDBETWEEN(0,12), MATCH(MIN(Qrow), Qrow, 0)-1)"],
      ["Draw demand and compute today's cost.", "demand: =POISSON.INV(RAND(), mean)   cost: =K*(order>0) + h*MAX(0,stock+order-demand) + p*MAX(0,demand-stock-order)"],
      ["Tomorrow's stock.", "=MAX(0, stock + order - demand)"],
      ["Q update (needs a macro or iterative calculation to write back into the table).", "Q(s,a) = Q(s,a) + α*(cost + γ*MIN(Q row of new stock) - Q(s,a))"],
      ["Exact answer for comparison: value iteration, one column per iteration.", "V_new(s) = MIN over a of [ K*(a>0) + Σ_d P(d)*(h*left + p*short + γ*V_old(left)) ]"],
    ],
  },
  deeper: [
    ["Sutton & Barto (2018), Reinforcement Learning: An Introduction, 2nd ed., MIT Press", "http://incompleteideas.net/book/the-book-2nd.html", "the standard textbook, free online; Q-learning is chapter 6"],
    ["Watkins & Dayan (1992), Q-learning, Machine Learning 8(3–4)", "https://doi.org/10.1007/BF00992698", "the algorithm and its convergence proof"],
    ["Gijsbrechts, Boute, Van Mieghem & Zhang (2022), Can deep reinforcement learning improve inventory management?, Manufacturing & Service Operations Management 24(3)", "https://doi.org/10.1287/msom.2021.1064", "deep RL on lost-sales, dual-sourcing and multi-echelon problems, compared with good heuristics"],
    ["Scarf (1960) and the (s, S) policy — Inventory theory, Wikipedia", "https://en.wikipedia.org/wiki/Inventory_theory", "why the optimum has an order-up-to shape when orders have a fixed cost"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="20" width="22" height="22" rx="3"/><rect x="66" y="20" width="22" height="22" rx="3"/><path d="M30 26 C44 10 52 10 66 26" /><path d="M66 36 C52 52 44 52 30 36"/><path d="M60 22 L66 26 L60 30 M36 32 L30 36 L36 40"/><circle cx="19" cy="31" r="4" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const MAXS = 20, MAXA = 12, H = 1, G = 0.95, CHUNK = 1000, BATCH = 30000;
    let Q, days = 0, curve = [], state = 5, r = rng(1), job = 0, timer = null, selS = 3, trainSeed = 1;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("The agent's ordering rule (tap a stock level)")}</div><canvas id="c1" style="height:270px" aria-label="Order quantity chosen at each stock level, learned and optimal"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "Learning curve", 260, "Average daily cost while training, against the optimum"), fig("c3", "What the agent expects each order to cost", 260, "Q-values for each order at the selected stock level"))}`,
      panel: `
        <p class="hint" style="margin:0">Each day: see stock (0–${MAXS}), order 0–${MAXA} (arrives at once), then random demand. Unsold stock costs $${H} a day to hold; each unit of demand you can't meet is a lost sale.</p>
        <div class="ctrl"><label for="mu">Average daily demand <output id="muV"></output></label><input type="range" id="mu" min="1" max="8" step="0.5" value="4"></div>
        <div class="ctrl"><label for="p">Cost of a lost sale <output id="pV"></output></label><input type="range" id="p" min="2" max="20" step="1" value="8"></div>
        <div class="ctrl"><label for="k">Fixed cost per order <output id="kV"></output></label><input type="range" id="k" min="0" max="30" step="1" value="10"></div>
        <div class="ctrl"><label for="eps">Exploration ε (share of random orders) <output id="epsV"></output></label><input type="range" id="eps" min="0" max="0.5" step="0.01" value="0.1"></div>
        <div class="ctrl"><label for="alpha">Learning rate α <output id="alphaV"></output></label><input type="range" id="alpha" min="0.01" max="0.5" step="0.01" value="0.1"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn primary" id="train" type="button">Train ${(BATCH / 1000).toFixed(0)},000 days</button><button class="btn" id="stop" type="button">Stop</button><button class="btn" id="fresh" type="button">New agent</button></div>
        <p class="hint" id="status" style="margin:0"></p>`,
      notes: `
        <section>
          <h2>The loop</h2>
          <ol>
            <li>See the state: stock on hand s.</li>
            <li>Act: with chance ε order a random amount; otherwise order the a with the lowest Q(s, a).</li>
            <li>Demand happens. Pay the cost: fixed order cost if a &gt; 0, $${H} per unit left over, the lost-sale cost per unit short.</li>
            <li>Learn: Q(s, a) ← Q(s, a) + α × [cost + γ × min<sub>a′</sub> Q(s′, a′) − Q(s, a)], with γ = ${G}.</li>
          </ol>
          <p>The agent never sees the demand distribution or the cost formula. It only sees what happened. That's the appeal: the same code would work for a much messier stockroom, as long as you can simulate it or let it learn from history.</p>
        </section>
        <section>
          <h2>The exact answer</h2>
          <p>Because this problem is small and the demand distribution is known (Poisson), value iteration solves it exactly: repeat V(s) ← min<sub>a</sub> [expected cost today + γ × expected V(tomorrow)] until it stops changing. The optimal rule (dots) has the (s, S) shape from <a href="#inventory-policies">inventory policies</a>: below a trigger, order up to a fixed level; above it, order nothing. With no fixed order cost, the trigger is just below S, so it becomes a base-stock rule.</p>
        </section>
        <section>
          <h2>When RL is (and isn't) the right tool</h2>
          <ul>
            <li>Good for: large or messy problems where formulas don't exist, such as many products sharing capacity, lost sales with long lead times, or several sourcing options, where a simulator is available.</li>
            <li>Weak points: needs huge amounts of experience, results vary run to run, hard to explain, and can learn odd behaviour in states it rarely visited. Always compare with a sensible heuristic, as published studies do.</li>
            <li>Deep RL replaces the Q table with a <a href="#neural-net">neural network</a> so it can handle states that never appeared exactly before.</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>The agent opens with 30,000 days of training and is still about 60% worse than optimal. Press Train three more times: by 120,000 days it is within 1%, the learning curve falls towards the optimum, and the bars line up with the dots for common stock levels. Rarely visited high stock levels stay rough.</li>
            <li>Set ε to 0, press New agent, then Train four times. It still learns, because a table of zeros makes every untried order look free, so the agent tries each one once it has been let down by the others. But it settles less well: about 1 to 3% above optimal after 120,000 days, against 0.3% with ε = 0.1.</li>
            <li>Set the fixed order cost to 0: the optimal rule becomes "order up to S every day". Raise it to 30: orders get bigger and less frequent.</li>
            <li>Change average demand after training: the agent's rule is now out of date. It must keep learning (and exploring) to adapt.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ mu: +$("#mu").value, p: +$("#p").value, k: +$("#k").value, eps: +$("#eps").value, alpha: +$("#alpha").value });
    const pois = (mu) => { const out = []; let pr = Math.exp(-mu), c = pr; out.push(pr); for (let d = 1; d < 40; d++) { pr *= mu / d; out.push(pr); c += pr; if (c > 0.99999) break; } return out; };
    const step = (s, a, d, p) => { const have = Math.min(MAXS, s + a), left = Math.max(0, have - d), short = Math.max(0, d - have); return { c: (a > 0 ? p.k : 0) + H * left + p.p * short, s2: left }; };
    let OPT = null;
    function exact(p) {
      const pd = pois(p.mu); let V = Array(MAXS + 1).fill(0), pol = Array(MAXS + 1).fill(0), Qx = [];
      for (let it = 0; it < 400; it++) { const NV = [], NP = []; Qx = []; for (let s = 0; s <= MAXS; s++) { let best = Infinity, ba = 0; const qrow = []; for (let a = 0; a <= MAXA; a++) { if (s + a > MAXS) { qrow.push(NaN); continue; } let q = 0; pd.forEach((pr, d) => { const t = step(s, a, d, p); q += pr * (t.c + G * V[t.s2]); }); qrow.push(q); if (q < best - 1e-9) { best = q; ba = a; } } NV.push(best); NP.push(ba); Qx.push(qrow); } const diff = Math.max(...NV.map((v, i) => Math.abs(v - V[i]))); V = NV; pol = NP; if (diff < 1e-6) break; }
      return { V, pol, Q: Qx };
    }
    function avgCost(pol, p, n = 40000) { const rr = rng(99), pd = pois(p.mu); let s = 5, tot = 0; const draw = () => { let u = rr(), d = 0; while (d < pd.length - 1 && u > pd[d]) { u -= pd[d]; d++; } return d; }; for (let i = 0; i < n; i++) { const t = step(s, pol[s], draw(), p); tot += t.c; s = t.s2; } return tot / n; }
    const greedy = (s) => { let ba = 0, bq = Infinity; for (let a = 0; a <= MAXA; a++) { if (s + a > MAXS) break; if (Q[s][a] < bq) { bq = Q[s][a]; ba = a; } } return ba; };
    function freshAgent() { Q = Array.from({ length: MAXS + 1 }, () => Array(MAXA + 1).fill(0)); days = 0; curve = []; state = 5; trainSeed++; r = rng(trainSeed); visits = Array(MAXS + 1).fill(0); }
    let visits = [];
    function trainChunk(p) {
      const pd = pois(p.mu), draw = () => { let u = r(), d = 0; while (d < pd.length - 1 && u > pd[d]) { u -= pd[d]; d++; } return d; }; let tot = 0;
      for (let i = 0; i < CHUNK; i++) { const s = state, maxA = Math.min(MAXA, MAXS - s), a = r() < p.eps ? Math.floor(r() * (maxA + 1)) : greedy(s), t = step(s, a, draw(), p);
        let mn = Infinity; for (let b = 0; b <= Math.min(MAXA, MAXS - t.s2); b++) mn = Math.min(mn, Q[t.s2][b]);
        Q[s][a] += p.alpha * (t.c + G * mn - Q[s][a]); state = t.s2; tot += t.c; visits[s]++; }
      days += CHUNK; curve.push([days, tot / CHUNK]);
    }
    const C1 = new Plot($("#c1"), { pad: { l: 56, b: 38 } }), C2 = new Plot($("#c2"), { pad: { l: 56, b: 38 } }), C3 = new Plot($("#c3"), { pad: { l: 56, b: 38 } });
    const sw = (c, t, k) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">${k === "box" ? `<span style="width:12px;height:10px;background:var(${c});opacity:.8"></span>` : k === "dot" ? `<span style="width:8px;height:8px;border-radius:50%;background:var(${c})"></span>` : `<span style="width:20px;border-top:2px ${k} var(${c})"></span>`}${t}</span>`;
    function d1() {
      C1.resize(); C1.x = [-0.6, MAXS + 0.6]; C1.y = [0, MAXA + 1]; C1.clear(); C1.axes({ xLabel: "stock on hand at the start of the day", yLabel: "units ordered", xTicks: Array.from({ length: MAXS + 1 }, (_, i) => i).filter((i) => i % 2 === 0), xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const g = C1.ctx, w = (C1.sx(1) - C1.sx(0)) * 0.7, mv = Math.max(1, ...visits);
      for (let s = 0; s <= MAXS; s++) { const a = days ? greedy(s) : 0; g.fillStyle = css("--accent"); g.globalAlpha = days ? 0.25 + 0.65 * Math.sqrt(visits[s] / mv) : 0.2; g.fillRect(C1.sx(s) - w / 2, C1.sy(a), w, C1.sy(0) - C1.sy(a)); g.globalAlpha = 1; if (s === selS) { g.strokeStyle = css("--ink"); g.lineWidth = 1.5; g.strokeRect(C1.sx(s) - w / 2 - 2, C1.pad.t, w + 4, C1.ih); } }
      OPT.pol.forEach((a, s) => C1.dot(s, a, 4, css("--warm"), css("--ink")));
      const sTrig = OPT.pol.findIndex((a) => a === 0) - 1, S = sTrig >= 0 ? sTrig + OPT.pol[sTrig] : null, match = OPT.pol.filter((a, s) => days && greedy(s) === a).length;
      $("#c1Cap").innerHTML = `${sw("--accent", "learned order (paler = stock level rarely visited)", "box")}${sw("--warm", "optimal order", "dot")}<br>Optimal rule: ${S !== null && sTrig >= 0 ? `when stock is ${sTrig} or less, order up to ${S}; otherwise order nothing` : "order nothing"}. ${days ? `The agent matches it at ${match} of ${MAXS + 1} stock levels.` : "Press Train to start."}`;
    }
    function d2(p) {
      const opt = OPT.cost, base = OPT.cost; C2.resize(); const ys = curve.map((c) => c[1]), top = Math.max(opt * 2, ...ys.slice(2)) * 1.05;
      C2.x = [0, Math.max(BATCH, days)]; C2.y = [0, top]; C2.clear(); C2.axes({ xLabel: "days of experience", yLabel: "average cost per day", xFormat: (v) => (v >= 1000 ? fmt(v / 1000, 0) + "k" : fmt(v, 0)), yFormat: (v) => fmt(v, 0) });
      C2.path([0, C2.x[1]], [opt, opt], css("--warm"), 1.6, [5, 4]);
      if (curve.length) { const sm = curve.map((c, i) => { const a = curve.slice(Math.max(0, i - 4), i + 1); return a.reduce((s, x) => s + x[1], 0) / a.length; }); C2.clip(() => C2.path(curve.map((c) => c[0]), sm, css("--accent"), 2)); }
      const lc = days ? OPT.learned : null;
      $("#c2Cap").innerHTML = `${sw("--accent", "while training (includes exploring)", "solid")}${sw("--warm", `optimal: $${fmt(opt, 2)} a day`, "dashed")}<br>${days ? `Running the learned rule without exploring costs $${fmt(lc, 2)} a day, ${fmt(((lc - opt) / opt) * 100, 1)}% above optimal.` : "No training yet."}`;
    }
    function d3() {
      const qL = Q[selS], qO = OPT.Q[selS], acts = Array.from({ length: MAXA + 1 }, (_, a) => a).filter((a) => selS + a <= MAXS), vals = acts.flatMap((a) => [qO[a], days ? qL[a] : NaN]).filter(isFinite);
      C3.resize(); C3.x = [-0.6, MAXA + 0.6]; C3.y = [Math.min(...vals) * 0.95, Math.max(...vals) * 1.03]; C3.clear(); C3.axes({ xLabel: `order size when stock = ${selS}`, yLabel: "expected future cost", xTicks: acts.filter((a) => a % 2 === 0), xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const g = C3.ctx, w = (C3.sx(1) - C3.sx(0)) * 0.6;
      if (days) acts.forEach((a) => { const v = qL[a]; g.fillStyle = css("--accent"); g.globalAlpha = 0.7; g.fillRect(C3.sx(a) - w / 2, C3.sy(v), w, C3.sy(C3.y[0]) - C3.sy(v)); g.globalAlpha = 1; });
      C3.path(acts, acts.map((a) => qO[a]), css("--warm"), 1.8); acts.forEach((a) => C3.dot(a, qO[a], 3, css("--warm"), css("--warm")));
      const bo = OPT.pol[selS], bl = days ? greedy(selS) : null;
      $("#c3Cap").innerHTML = `${sw("--accent", "agent's Q-values", "box")}${sw("--warm", "exact Q-values", "solid")}<br>Lowest bar = the order the agent picks. Exact best: order ${bo}${bl !== null ? `; agent picks ${bl}${bl === bo ? " ✓" : ""}` : ""}. The agent has been at stock ${selS} on ${visits[selS] || 0} days.`;
    }
    function readouts(p) {
      $("#ro").innerHTML = [["Days of experience", days.toLocaleString()], ["Optimal cost / day", `$${fmt(OPT.cost, 2)}`], ["Learned rule cost / day", days ? `$${fmt(OPT.learned, 2)}` : "–"], ["Gap to optimal", days ? `<span class="pill ${OPT.learned / OPT.cost - 1 < 0.03 ? "ok" : OPT.learned / OPT.cost - 1 < 0.1 ? "warn" : "bad"}">${fmt((OPT.learned / OPT.cost - 1) * 100, 1)}%</span>` : "–"]].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function labels(p) { $("#muV").textContent = p.mu; $("#pV").textContent = "$" + p.p; $("#kV").textContent = "$" + p.k; $("#epsV").textContent = fmt(p.eps * 100, 0) + "%"; $("#alphaV").textContent = fmt(p.alpha, 2); }
    let optKey = "";
    function draw() { const p = P(); labels(p); const key = `${p.mu}|${p.p}|${p.k}`; if (key !== optKey) { OPT = exact(p); OPT.cost = avgCost(OPT.pol, p); optKey = key; } if (days) OPT.learned = avgCost(Array.from({ length: MAXS + 1 }, (_, s) => greedy(s)), p, 20000); d1(); d2(p); d3(); readouts(p); }
    function stop() { job++; if (timer) clearTimeout(timer); timer = null; $("#status").textContent = days ? `Stopped at ${days.toLocaleString()} days.` : ""; }
    function train() { stop(); const my = ++job, target = days + BATCH; const tick = () => { if (my !== job) return; const p = P(); for (let i = 0; i < 3 && days < target; i++) trainChunk(p); draw(); $("#status").textContent = `Training… ${days.toLocaleString()} days`; if (days < target) timer = setTimeout(tick, 16); else { timer = null; $("#status").textContent = `Trained ${days.toLocaleString()} days. Press Train again to keep learning.`; } }; tick(); }
    ["mu", "p", "k"].forEach((id) => $("#" + id).addEventListener("input", draw));
    ["eps", "alpha"].forEach((id) => $("#" + id).addEventListener("input", () => labels(P())));
    $("#train").addEventListener("click", train);
    $("#stop").addEventListener("click", stop);
    $("#fresh").addEventListener("click", () => { stop(); freshAgent(); $("#status").textContent = "New agent: its table starts at zero for every stock level and order."; draw(); });
    $("#c1").addEventListener("click", (e) => { const b = $("#c1").getBoundingClientRect(), x = e.clientX - b.left, s = Math.round(C1.ix(x)); if (s >= 0 && s <= MAXS) { selS = s; draw(); } });
    freshAgent(); draw(); train();
    const ro = new ResizeObserver(() => draw()); [$("#c1"), $("#c2"), $("#c3")].forEach((c) => ro.observe(c));
    return () => { stop(); ro.disconnect(); };
  },
});
