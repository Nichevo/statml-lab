Lab.register({
  id: "neural-net",
  group: "Machine learning",
  title: "Neural networks from scratch: a perceptron, then hidden layers",
  blurb: "Watch one neuron learn AND row by row, see why it can never learn XOR, then train a small network on 3×3 pixel patterns and compare one layer with two.",
  lede: "A neural network is a stack of very simple units. Each one adds up its inputs times weights, then switches on or off. Learning means nudging the weights whenever the answer is wrong. This page builds that up in two steps, the way you would in a spreadsheet: first a single neuron learning a logic rule row by row, then a small network sorting 3×3 pixel pictures into crosses, horizontal bars and vertical bars.",
  quiz: [
    ["Weights are (w0, w1, w2) = (0.85, 1, 1), inputs (1, 0, 1), desired output 0. The neuron outputs 1 when net > 0. What happens with a learning coefficient of 0.15?", "net = 0.85 + 0 + 1 = 1.85 > 0, so Y = 1, which is wrong. Each weight changes by 0.15 × (0 − 1) × its input: w0 → 0.70, w1 stays 1 (its input is 0), w2 → 0.85."],
    ["Why does the perceptron learn AND, OR and NAND but never XOR?", "A single neuron draws one straight line through the input space. AND, OR and NAND can each be split by one line. XOR needs (0,1) and (1,0) on one side and (0,0) and (1,1) on the other, which no single line can do. The weights keep flip-flopping forever."],
    ["What is the bias input X1 = 1 for?", "It gives the neuron a weight (w0) that doesn't depend on the inputs. That lets the decision line move away from the origin; without it, the line must pass through (0,0)."],
    ["In the 3×3 network, why does the one-layer error stall well above zero?", "One layer gives each output one fixed weight per pixel, so it can only add up evidence pixel by pixel. The X shares its corners with the outer bars and its centre with the middle bars, so the weights that make 'cross' score high for the X also push it up for bars. It settles on a compromise and usually gets at least one picture wrong. A hidden layer can learn separate 'plus' and 'X' detectors, then combine them."],
    ["What does a higher learning factor do?", "Bigger steps: faster learning at first, but with too high a value the error jumps around or gets stuck. Too low and training crawls. Try 0.05 and 3 on the error chart."],
    ["What is backpropagation, in one sentence?", "It works out each weight's share of the output error by passing the error backwards through the network (the chain rule), so every weight, including hidden ones, knows which way to move."],
  ],
  diy: {
    intro: "Step 1 is exactly a spreadsheet layout: inputs X1 (always 1), X2, X3 in A:C, weights in E:G, desired output in J, learning coefficient in N2.",
    steps: [
      ["Net input for the row.", "H2: =E2*A2+F2*B2+G2*C2"],
      ["Output: fires if net is above 0.", "I2: =IF(H2>0,1,0)"],
      ["Weight changes: coefficient × error × input.", "K2: =$N$2*(J2-I2)*A2   L2: =$N$2*(J2-I2)*B2   M2: =$N$2*(J2-I2)*C2"],
      ["Next row's weights = this row's weights + changes. Fill down for as many training sets as you like.", "E3: =E2+K2   F3: =F2+L2   G3: =G2+M2"],
      ["Step 2 swaps the step for a smooth sigmoid, so errors can be measured in degrees.", "=1/(1+EXP(-net))"],
      ["Output-layer delta and weight update (gradient descent on squared error).", "delta: =(y-target)*y*(1-y)\nnew w: =w - lr*delta*input"],
      ["Hidden-layer delta: the output deltas passed back through their weights.", "=SUMPRODUCT(out_deltas, weights_to_outputs)*a*(1-a)"],
    ],
  },
  deeper: [
    ["Rosenblatt (1958), The perceptron: a probabilistic model for information storage and organization in the brain, Psychological Review 65(6)", "https://doi.org/10.1037/h0042519", "the original perceptron"],
    ["Rumelhart, Hinton & Williams (1986), Learning representations by back-propagating errors, Nature 323", "https://doi.org/10.1038/323533a0", "backpropagation for hidden layers"],
    ["Goodfellow, Bengio & Courville, Deep Learning, ch. 6: Deep feedforward networks (free)", "https://www.deeplearningbook.org/contents/mlp.html", "textbook treatment, including XOR"],
    ["Nielsen, Neural Networks and Deep Learning (free online book)", "http://neuralnetworksanddeeplearning.com/", "builds a digit-reading network step by step"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor"><circle cx="10" cy="14" r="5"/><circle cx="10" cy="32" r="5"/><circle cx="10" cy="50" r="5"/></g><circle cx="48" cy="20" r="6"/><circle cx="48" cy="44" r="6"/><circle cx="86" cy="32" r="6" fill="currentColor" fill-opacity=".35"/><path d="M15 14 L42 20 M15 14 L42 44 M15 32 L42 20 M15 32 L42 44 M15 50 L42 20 M15 50 L42 44 M54 20 L80 32 M54 44 L80 32" stroke-width="1.4"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const GATES = { AND: [0, 0, 0, 1], OR: [0, 1, 1, 1], NAND: [1, 1, 1, 0], XOR: [0, 1, 1, 0] };
    const ROWS = [[1, 0, 0], [1, 0, 1], [1, 1, 0], [1, 1, 1]];
    const PATS = [
      ["Plus", "010111010", 0], ["X", "101010101", 0],
      ["Middle row", "000111000", 1], ["Top row", "111000000", 1], ["Bottom row", "000000111", 1],
      ["Middle column", "010010010", 2], ["Left column", "100100100", 2], ["Right column", "001001001", 2],
    ].map(([n, s, c]) => ({ n, x: Array.from(s, Number), c }));
    const CN = ["R1 cross", "R2 horizontal", "R3 vertical"];
    const h4 = (t) => `<h4 style="margin:0 0 8px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const tile = (x, sz = 8) => `<span style="display:inline-grid;grid-template-columns:repeat(3,${sz}px);gap:1px;background:var(--line);border:1px solid var(--line);vertical-align:middle">${x.map((v) => `<i style="width:${sz}px;height:${sz}px;background:var(${v ? "--ink" : "--surface"})"></i>`).join("")}</span>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot" style="padding:14px">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px">
            ${h4("Step 1: one neuron learns a logic rule").replace("margin:0 0 8px", "margin:0")}
            <div class="seg" id="gate" style="min-width:240px">${Object.keys(GATES).map((g, i) => `<button type="button" data-v="${g}" aria-pressed="${i === 0}">${g}</button>`).join("")}</div>
          </div>
          <p class="hint" style="margin:0 0 10px">Inputs X1 (always 1, the bias), X2 and X3. net = w0·X1 + w1·X2 + w2·X3, and Y = 1 if net &gt; 0. After every row, each weight changes by <b>coefficient × (desired − Y) × its input</b>. <span style="background:color-mix(in srgb,var(--good) 22%,transparent);padding:0 4px">Green</span> = right, <span style="background:color-mix(in srgb,var(--bad) 22%,transparent);padding:0 4px">red</span> = wrong, so the weights change.</p>
          <p id="pStat" style="margin:0 0 10px;font-weight:500"></p>
          <div style="display:grid;gap:16px">
            <div style="overflow:auto;max-height:440px;border:1px solid var(--line);border-radius:6px"><table id="pt" style="border-collapse:collapse;font:.78rem/1 var(--font-mono);font-variant-numeric:tabular-nums;width:100%"></table></div>
            <figure class="plot" style="margin:0;max-width:480px;width:100%"><canvas id="pl" aria-label="The four input points and the neuron's decision line"></canvas>
              <div class="legend"><span><i style="background:var(--accent)"></i>should output 1</span><span><i style="background:var(--warm)"></i>should output 0</span><span><i style="background:var(--violet)"></i>decision line (net = 0)</span></div>
              <figcaption id="plCap"></figcaption></figure>
          </div>
        </div>
        <div class="plot" style="padding:14px">
          ${h4("Step 2: sorting 3×3 pictures, one layer vs two")}
          <p class="hint" style="margin:0 0 8px">Training pictures and the answer each should give. Nine pixels in, three outputs (R1–R3), each a sigmoid between 0 and 1. The two-layer network adds a hidden layer in between.</p>
          <div style="display:flex;flex-wrap:wrap;gap:10px 14px;margin-bottom:12px">${PATS.map((p) => `<div style="display:grid;justify-items:center;gap:3px;font-size:.72rem;color:var(--muted)">${tile(p.x, 10)}<span>${p.n}</span><span style="color:var(--ink)">${CN[p.c].split(" ")[0]}</span></div>`).join("")}</div>
          <figure class="plot wide" style="margin:0 0 12px"><canvas id="ec" aria-label="Training error over iterations"></canvas>
            <div class="legend"><span><i style="background:var(--warm)"></i>1 layer (no hidden units)</span><span><i style="background:var(--accent)"></i>2 layers (with hidden units)</span></div>
            <figcaption id="ecCap"></figcaption></figure>
          <div style="overflow-x:auto"><table id="ot" style="border-collapse:collapse;font:.78rem/1 var(--font-mono);font-variant-numeric:tabular-nums"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          ${h4("Test it: click pixels to make your own picture")}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:16px;align-items:start">
            <div>
              <div id="grid" style="display:grid;grid-template-columns:repeat(3,52px);gap:3px;width:max-content">${Array.from({ length: 9 }, (_, i) => `<button type="button" data-i="${i}" aria-label="pixel ${i + 1}" style="width:52px;height:52px;border:1px solid var(--line);border-radius:4px;cursor:pointer"></button>`).join("")}</div>
              <div class="btns" style="margin-top:8px">${PATS.slice(0, 3).map((p, i) => `<button class="btn" type="button" data-p="${[0, 2, 5][i]}">${p.n}</button>`).join("")}<button class="btn" type="button" data-p="-1">Clear</button></div>
            </div>
            <div id="tOut" style="min-width:0"></div>
          </div>
          <div id="tWork" style="margin-top:12px;font:.8rem/1.8 var(--font-mono);overflow-x:auto"></div>
        </div>
        <div class="plot" style="padding:14px">
          ${h4("What the one-layer network looks for")}
          <p class="hint" style="margin:0 0 10px">Each output's 9 weights, laid out as a 3×3 picture (<span style="color:var(--accent)">blue = this pixel counts for</span>, <span style="color:var(--warm)">orange = against</span>). These are exactly like the CNN's filters, just the size of the whole image.</p>
          <div id="wmaps" style="display:flex;flex-wrap:wrap;gap:20px"></div>
        </div>`,
      panel: `
        <h4>Step 1: perceptron</h4>
        <div class="ctrl"><label for="lc">Learning coefficient <output id="lcV"></output></label><input type="range" id="lc" min="0.05" max="1" step="0.05" value="0.15"></div>
        <div class="ctrl"><label for="w0">Starting weights (all three) <output id="w0V"></output></label><input type="range" id="w0" min="-1" max="1" step="0.1" value="1"></div>
        <div class="ctrl"><label for="ks">Show the line after training set <output id="ksV"></output></label><input type="range" id="ks" min="0" max="12" step="1" value="12"></div>
        <h4 style="margin-top:6px">Step 2: 3×3 network</h4>
        <div class="ctrl"><label for="lr">Learning factor <output id="lrV"></output></label><input type="range" id="lr" min="0.05" max="3" step="0.05" value="0.5"></div>
        <div class="ctrl"><label for="hu">Hidden units (2-layer net) <output id="huV"></output></label><input type="range" id="hu" min="1" max="8" step="1" value="4"></div>
        <div class="ctrl"><label for="it">Training iterations <output id="itV"></output></label><input type="range" id="it" min="50" max="3000" step="50" value="1000"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reseed" type="button">New starting weights</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Step 1: the perceptron rule</h2>
          <div class="eq">net = w0·1 + w1·X2 + w2·X3 &nbsp;&nbsp; Y = 1 if net &gt; 0, else 0<br>Δw<sub>i</sub> = coefficient × (desired − Y) × X<sub>i</sub></div>
          <p>If the answer is right, nothing changes. If the neuron said 1 but should have said 0, every weight whose input was on is pushed down, and vice versa. Rosenblatt proved in 1958 that if a straight line can separate the two answers, this rule always gets there in a finite number of steps.</p>
          <p>The weights also describe a line: net = 0 is where w0 + w1·X2 + w2·X3 = 0. The chart shows that line moving as training goes on. For XOR it can never settle, because no straight line puts (0,1) and (1,0) on one side and (0,0) and (1,1) on the other.</p>
        </section>
        <section>
          <h2>Step 2: smooth outputs, hidden layers, backpropagation</h2>
          <p>To learn by degrees, the step is replaced with a sigmoid, 1/(1+e<sup>−net</sup>), so the error can be measured and reduced smoothly (gradient descent). The <b>error</b> charted is the mean squared difference between outputs and targets across all 8 pictures and 3 outputs.</p>
          <div class="eq">output delta = (y − target) × y × (1 − y)<br>hidden delta = Σ(output delta × weight to that output) × a × (1 − a)<br>new w = w − learning factor × delta × input</div>
          <p>The hidden delta is the key idea of <b>backpropagation</b> (Rumelhart, Hinton & Williams, 1986). It hands each hidden unit its share of the blame, so the hidden weights can learn too.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Step 1: switch to XOR. The table runs out of training sets with red rows still appearing, and the line keeps jumping. Then try OR and NAND: both settle.</li>
            <li>Move "Show the line after training set" from 0 upwards to watch the line rotate into place.</li>
            <li>Step 2: the one-layer error flattens out well above zero and it usually gets at least one picture wrong, because the X overlaps with the bars pixel by pixel. The two-layer error falls to almost nothing. "New starting weights" changes which picture the one-layer net sacrifices.</li>
            <li>Set hidden units to 1. With a single hidden unit the two-layer network loses its advantage. Two or three are enough here.</li>
            <li>Push the learning factor to 3, then down to 0.05, and watch the error curves.</li>
            <li>Draw a plus with one pixel missing in the test grid. Both networks usually still say "cross", but with less confidence.</li>
          </ol>
          <p>Next: <a href="#cnn">convolutional networks</a> scale the same idea up to 28×28 digits, with filters that slide. Also see <a href="#gradient-descent">gradient descent</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let gate = "AND", seed = 1, test = PATS[0].x.slice();
    const pl = new Plot($("#pl"), { x: [-0.5, 1.5], y: [-0.5, 1.5], pad: { l: 40, b: 36 } });
    const ec = new Plot($("#ec"), { pad: { l: 52, b: 40 } });
    const sig = (z) => 1 / (1 + Math.exp(-z));

    // ---------- Step 1: perceptron
    let P = null;
    function perceptron() {
      const lc = +$("#lc").value, w = [1, 1, 1].map(() => +$("#w0").value), d = GATES[gate], rows = [], lines = [w.slice()];
      let set = 0, ok = false;
      while (set < 12 && !ok) {
        set++; ok = true;
        ROWS.forEach((x, r) => {
          const net = w[0] * x[0] + w[1] * x[1] + w[2] * x[2], y = net > 1e-9 ? 1 : 0, ch = x.map((xi) => lc * (d[r] - y) * xi);
          rows.push({ set, x, w: w.slice(), net, y, d: d[r], ch });
          if (y !== d[r]) ok = false;
          w.forEach((_, i) => (w[i] = +(w[i] + ch[i]).toFixed(10)));
        });
        lines.push(w.slice());
      }
      P = { rows, lines, ok, sets: set, w };
    }
    function drawPerceptron() {
      const g = (v) => (Math.abs(v) < 1e-9 ? "0" : +v.toFixed(2));
      const th = (t) => `<th style="position:sticky;top:0;background:var(--surface);padding:6px 6px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500;text-align:right">${t}</th>`;
      const ks = Math.min(+$("#ks").value, P.lines.length - 1);
      $("#pt").innerHTML = `<tr>${th("set")}${th("X1")}${th("X2")}${th("X3")}${th("w0")}${th("w1")}${th("w2")}${th("net")}${th("Y")}${th("want")}${th("Δw0")}${th("Δw1")}${th("Δw2")}</tr>` +
        P.rows.map((r, i) => {
          const good = r.y === r.d, bg = `color-mix(in srgb, var(${good ? "--good" : "--bad"}) 20%, transparent)`, first = i % 4 === 0;
          const td = (t, x = "") => `<td style="padding:5px 6px;text-align:right;border-bottom:1px solid var(--grid);${first ? "border-top:2px solid var(--line);" : ""}${x}">${t}</td>`;
          return `<tr style="${r.set === ks ? "outline:2px solid var(--violet);outline-offset:-2px" : ""}">${td(first ? r.set : "", "color:var(--muted)")}${r.x.map((v) => td(v)).join("")}${r.w.map((v) => td(g(v))).join("")}${td(g(r.net))}${td(r.y, `background:${bg};font-weight:700`)}${td(r.d, `background:${bg}`)}${r.ch.map((v) => td(g(v), v ? "color:var(--bad)" : "color:var(--muted)")).join("")}</tr>`;
        }).join("");
      $("#pStat").innerHTML = P.ok ? `<span style="color:var(--good)">Learned ${gate} after ${P.sets} training set${P.sets > 1 ? "s" : ""} (${P.sets * 4} rows).</span> Final weights w0 = ${g(P.w[0])}, w1 = ${g(P.w[1])}, w2 = ${g(P.w[2])}; the last set is all green.` :
        `<span style="color:var(--bad)">Still wrong after 12 training sets.</span> ${gate === "XOR" ? "XOR can't be learned by one neuron: no straight line separates its 1s from its 0s, so the weights cycle forever." : "Try a bigger coefficient or more sets."}`;
      // chart
      pl.resize(); pl.clear();
      pl.axes({ xLabel: "X2", yLabel: "X3", xTicks: [0, 1], yTicks: [0, 1] });
      const w = P.lines[ks], gx = pl.ctx;
      // shade the "Y = 1" side
      gx.save(); gx.globalAlpha = 0.1; gx.fillStyle = css("--accent");
      for (let px = pl.pad.l; px < pl.w - pl.pad.r; px += 4) for (let py = pl.pad.t; py < pl.h - pl.pad.b; py += 4) { const a = pl.ix(px + 2), b = pl.iy(py + 2); if (w[0] + w[1] * a + w[2] * b > 0) gx.fillRect(px, py, 4, 4); }
      gx.restore();
      if (Math.abs(w[2]) > 1e-9) pl.fn((a) => -(w[0] + w[1] * a) / w[2], css("--violet"), 2.5);
      else if (Math.abs(w[1]) > 1e-9) { const a = -w[0] / w[1]; pl.path([a, a], [-0.5, 1.5], css("--violet"), 2.5); }
      ROWS.forEach((x, r) => { pl.dot(x[1], x[2], 9, css(GATES[gate][r] ? "--accent" : "--warm"), css("--surface")); });
      gx.save(); gx.font = `600 11px ${css("--font-mono")}`; gx.fillStyle = css("--ink"); gx.textAlign = "left";
      ROWS.forEach((x, r) => gx.fillText(`want ${GATES[gate][r]}`, pl.sx(x[1]) + 12, pl.sy(x[2]) + 4)); gx.restore();
      const wrong = ROWS.filter((x, r) => (w[0] + w[1] * x[1] + w[2] * x[2] > 1e-9 ? 1 : 0) !== GATES[gate][r]).length;
      $("#plCap").textContent = `${ks === 0 ? "Starting weights" : "After training set " + ks}: line ${g(w[0])} + ${g(w[1])}·X2 + ${g(w[2])}·X3 = 0. Shaded side outputs 1. ${wrong ? wrong + " of 4 points on the wrong side." : "All 4 points on the correct side."}`;
    }

    // ---------- Step 2: networks
    let NN = null;
    function trainAll() {
      const lr = +$("#lr").value, H = +$("#hu").value, it = +$("#it").value;
      const X = PATS.map((p) => p.x), T = PATS.map((p) => [0, 1, 2].map((c) => (c === p.c ? 1 : 0)));
      const r = rng(seed * 7919), nrm = () => r.normal() * 0.5;
      // one layer
      const A = { W: Array.from({ length: 9 }, () => [nrm(), nrm(), nrm()]), b: [0, 0, 0], E: [] };
      const fwd1 = (x) => [0, 1, 2].map((k) => sig(A.b[k] + x.reduce((s, xi, i) => s + xi * A.W[i][k], 0)));
      // two layers
      const B = { W1: Array.from({ length: 9 }, () => Array.from({ length: H }, nrm)), b1: Array(H).fill(0), W2: Array.from({ length: H }, () => [nrm(), nrm(), nrm()]), b2: [0, 0, 0], E: [] };
      const fwd2 = (x) => { const a = Array.from({ length: H }, (_, j) => sig(B.b1[j] + x.reduce((s, xi, i) => s + xi * B.W1[i][j], 0))); return { a, y: [0, 1, 2].map((k) => sig(B.b2[k] + a.reduce((s, aj, j) => s + aj * B.W2[j][k], 0))) }; };
      for (let t = 0; t < it; t++) {
        let e1 = 0, e2 = 0;
        const gW = A.W.map((r) => r.map(() => 0)), gb = [0, 0, 0];
        const g1 = B.W1.map((r) => r.map(() => 0)), gb1 = Array(H).fill(0), g2 = B.W2.map((r) => r.map(() => 0)), gb2 = [0, 0, 0];
        X.forEach((x, n) => {
          const y = fwd1(x);
          y.forEach((v, k) => { const d = (v - T[n][k]) * v * (1 - v); e1 += (v - T[n][k]) ** 2; gb[k] += d; x.forEach((xi, i) => (gW[i][k] += d * xi)); });
          const f = fwd2(x), d2 = f.y.map((v, k) => (v - T[n][k]) * v * (1 - v));
          f.y.forEach((v, k) => (e2 += (v - T[n][k]) ** 2));
          const d1 = f.a.map((aj, j) => d2.reduce((s, dk, k) => s + dk * B.W2[j][k], 0) * aj * (1 - aj));
          d2.forEach((dk, k) => { gb2[k] += dk; f.a.forEach((aj, j) => (g2[j][k] += dk * aj)); });
          d1.forEach((dj, j) => { gb1[j] += dj; x.forEach((xi, i) => (g1[i][j] += dj * xi)); });
        });
        A.E.push(e1 / 24); B.E.push(e2 / 24);
        A.W.forEach((r, i) => r.forEach((_, k) => (r[k] -= lr * gW[i][k]))); A.b.forEach((_, k) => (A.b[k] -= lr * gb[k]));
        B.W1.forEach((r, i) => r.forEach((_, j) => (r[j] -= lr * g1[i][j]))); B.b1.forEach((_, j) => (B.b1[j] -= lr * gb1[j]));
        B.W2.forEach((r, j) => r.forEach((_, k) => (r[k] -= lr * g2[j][k]))); B.b2.forEach((_, k) => (B.b2[k] -= lr * gb2[k]));
      }
      const am = (v) => v.indexOf(Math.max(...v));
      const out1 = X.map(fwd1), out2 = X.map((x) => fwd2(x).y);
      NN = { A, B, fwd1, fwd2, out1, out2, c1: out1.filter((y, n) => am(y) === PATS[n].c).length, c2: out2.filter((y, n) => am(y) === PATS[n].c).length, H, lr, it };
    }
    const cellBg = (v, row) => { const mx = Math.max(...row), mn = Math.min(...row); return v === mx ? "color-mix(in srgb, var(--good) 30%, transparent)" : v === mn ? "color-mix(in srgb, var(--bad) 22%, transparent)" : "color-mix(in srgb, var(--warm) 18%, transparent)"; };
    function drawNets() {
      const { A, B, it } = NN;
      ec.resize(); ec.x = [0, it]; ec.y = [0, Math.max(0.05, A.E[0], B.E[0]) * 1.05]; ec.clear();
      ec.axes({ xLabel: "training iterations", yLabel: "error (mean squared)", yFormat: (v) => v.toFixed(2) });
      const xs = A.E.map((_, i) => i + 1);
      ec.path(xs, A.E, css("--warm"), 2.5); ec.path(xs, B.E, css("--accent"), 2.5);
      $("#ecCap").innerHTML = `After ${it.toLocaleString()} iterations: 1 layer error <b>${A.E[it - 1].toFixed(3)}</b>, ${NN.c1} of 8 pictures right. 2 layers (${NN.H} hidden unit${NN.H > 1 ? "s" : ""}) error <b>${B.E[it - 1].toFixed(3)}</b>, ${NN.c2} of 8 right.`;
      const th = (t, x = "") => `<th style="padding:5px 7px;color:var(--muted);font-weight:500;${x}">${t}</th>`;
      const tds = (y) => y.map((v) => `<td style="padding:5px 7px;text-align:right;border:1px solid var(--grid);background:${cellBg(v, y)}">${v.toFixed(3)}</td>`).join("");
      $("#ot").innerHTML = `<tr>${th("")}${th("")}${th("1 layer", "border-bottom:1px solid var(--line)\" colspan=\"3")}${th("2 layers", "border-bottom:1px solid var(--line)\" colspan=\"3")}</tr><tr>${th("picture", "text-align:left")}${th("should be", "text-align:left")}${th("R1")}${th("R2")}${th("R3")}${th("R1")}${th("R2")}${th("R3")}</tr>` +
        PATS.map((p, n) => { const ok1 = NN.out1[n].indexOf(Math.max(...NN.out1[n])) === p.c, ok2 = NN.out2[n].indexOf(Math.max(...NN.out2[n])) === p.c;
          return `<tr><td style="padding:5px 7px">${tile(p.x, 7)} ${p.n}</td><td style="padding:5px 7px">${CN[p.c]}</td>${tds(NN.out1[n])}${tds(NN.out2[n])}<td style="padding:5px 7px;color:var(${ok1 ? "--good" : "--bad"})">${ok1 ? "✓" : "✗"}</td><td style="padding:5px 7px;color:var(${ok2 ? "--good" : "--bad"})">${ok2 ? "✓" : "✗"}</td></tr>`; }).join("");
      $("#ot").querySelector("tr").insertAdjacentHTML("beforeend", `<th style="padding:5px 7px;color:var(--muted);font-weight:500">1L</th><th style="padding:5px 7px;color:var(--muted);font-weight:500">2L</th>`);
      // one-layer weight maps
      const mx = Math.max(...A.W.flat().map(Math.abs));
      $("#wmaps").innerHTML = [0, 1, 2].map((k) => `<div style="display:grid;gap:4px;justify-items:center;font-size:.78rem"><div style="display:grid;grid-template-columns:repeat(3,38px);gap:2px">${A.W.map((r) => { const v = r[k], t = Math.round((Math.abs(v) / mx) * 70); return `<div style="height:38px;display:grid;place-items:center;font:.66rem var(--font-mono);background:color-mix(in srgb, var(${v >= 0 ? "--accent" : "--warm"}) ${t}%, var(--surface));border:1px solid var(--grid)">${v.toFixed(1)}</div>`; }).join("")}</div><span>${CN[k]} <span style="color:var(--muted)">(bias ${A.b[k].toFixed(1)})</span></span></div>`).join("");
    }
    function drawTest() {
      root.querySelectorAll("#grid button").forEach((b, i) => { b.style.background = `var(${test[i] ? "--ink" : "--surface"})`; b.setAttribute("aria-pressed", String(!!test[i])); });
      const y1 = NN.fwd1(test), f2 = NN.fwd2(test), y2 = f2.y, am = (v) => v.indexOf(Math.max(...v));
      const bars = (y, col) => y.map((v, k) => `<div style="display:grid;grid-template-columns:96px 1fr 44px;gap:6px;align-items:center;font:.78rem var(--font-mono)"><span>${CN[k]}</span><div style="height:10px;background:var(--grid);border-radius:3px;overflow:hidden"><div style="height:100%;width:${(v * 100).toFixed(1)}%;background:var(${k === am(y) ? col : "--muted"})"></div></div><span style="text-align:right">${v.toFixed(2)}</span></div>`).join("");
      const say = (y) => (Math.max(...y) < 0.5 ? "unsure" : CN[am(y)].split(" ")[1]);
      $("#tOut").innerHTML = `<div style="margin-bottom:6px">1 layer says <b style="color:var(--warm)">${say(y1)}</b></div>${bars(y1, "--warm")}<div style="margin:12px 0 6px">2 layers say <b style="color:var(--accent)">${say(y2)}</b></div>${bars(y2, "--accent")}`;
      const k = am(y1), A = NN.A, terms = test.map((x, i) => (x ? A.W[i][k] : null)).filter((v) => v !== null), net = A.b[k] + terms.reduce((a, b) => a + b, 0);
      $("#tWork").innerHTML = `Worked out, 1-layer output ${CN[k]}: net = bias ${A.b[k].toFixed(2)} ${terms.map((v) => (v >= 0 ? "+ " : "− ") + Math.abs(v).toFixed(2)).join(" ")} <span style="color:var(--muted)">(weights of the ${terms.length} dark pixels)</span> = <b>${net.toFixed(2)}</b> → sigmoid 1/(1+e<sup>−${net.toFixed(2)}</sup>) = <b>${sig(net).toFixed(3)}</b>`;
    }
    function readouts() {
      if (!P || !NN) return;
      $("#ro").innerHTML = `<div class="ro"><b>Perceptron (${gate})</b><span class="pill ${P.ok ? "ok" : "bad"}">${P.ok ? "learned in " + P.sets + " sets" : "never settles"}</span></div>
        <div class="ro"><b>1 layer: right</b><span class="pill ${NN.c1 === 8 ? "ok" : "warn"}">${NN.c1} / 8</span></div>
        <div class="ro"><b>2 layers: right</b><span class="pill ${NN.c2 === 8 ? "ok" : "warn"}">${NN.c2} / 8</span></div>
        <div class="ro"><b>Final error 1L / 2L</b><span class="num">${NN.A.E[NN.it - 1].toFixed(3)} / ${NN.B.E[NN.it - 1].toFixed(3)}</span></div>`;
    }
    function labels() {
      $("#lcV").textContent = (+$("#lc").value).toFixed(2); $("#w0V").textContent = (+$("#w0").value).toFixed(1); $("#ksV").textContent = $("#ks").value;
      $("#lrV").textContent = (+$("#lr").value).toFixed(2); $("#huV").textContent = $("#hu").value; $("#itV").textContent = (+$("#it").value).toLocaleString();
    }
    const upP = () => { labels(); perceptron(); drawPerceptron(); readouts(); };
    const upN = () => { labels(); trainAll(); drawNets(); drawTest(); readouts(); };

    $("#gate").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { gate = b.dataset.v; $("#gate").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); upP(); }));
    ["#lc", "#w0"].forEach((s) => $(s).addEventListener("input", upP));
    $("#ks").addEventListener("input", () => { labels(); drawPerceptron(); });
    ["#lr", "#hu", "#it"].forEach((s) => $(s).addEventListener("input", upN));
    root.querySelectorAll("#grid button").forEach((b) => b.addEventListener("click", () => { test[+b.dataset.i] ^= 1; drawTest(); }));
    root.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => { const i = +b.dataset.p; test = i < 0 ? Array(9).fill(0) : PATS[i].x.slice(); drawTest(); }));
    $("#reseed").addEventListener("click", () => { seed++; upN(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 1; gate = "AND"; test = PATS[0].x.slice(); $("#gate").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === "AND"))); upP(); upN(); });
    upP(); upN();
    return watch([$("#pl"), $("#ec")], () => { drawPerceptron(); drawNets(); drawTest(); });
  },
});
