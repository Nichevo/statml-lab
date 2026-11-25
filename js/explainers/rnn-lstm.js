Lab.register({
  id: "rnn-lstm",
  group: "Forecasting",
  title: "Recurrent neural networks (RNN and LSTM) for demand",
  blurb: "A small recurrent network trains in your browser on weekly sales and forecasts the next year. See its memory (the hidden state) week by week, why plain RNNs forget, how an LSTM's forget gate fixes it, and how it compares with a seasonal naive forecast.",
  lede: "A recurrent neural network reads a series one step at a time and carries a small memory, its hidden state, from each week to the next. Each week it mixes the new inputs (last week's sales, a promotion flag, the time of year) with that memory and makes a forecast. LSTMs add gates that decide what to keep and what to forget, so useful information can survive many steps. They power many large-scale forecasting systems, but on a single short series they often lose to simple methods.",
  quiz: [
    ["What is the hidden state?", "A short list of numbers the network updates every step: hₜ = tanh(Wₓ xₜ + Wₕ hₜ₋₁ + b). It's the network's running summary of everything it has read so far, and the forecast is read off it."],
    ["Why do plain RNNs struggle to remember things from many steps ago?", "Each step multiplies the old memory by the recurrent weights and squashes it with tanh. If that factor is below 1, a signal shrinks geometrically (0.8²⁰ ≈ 1%); above 1 it can explode. Gradients during training shrink or explode the same way."],
    ["How does an LSTM's forget gate help?", "The LSTM keeps a separate cell state that is updated by addition, scaled by a forget gate f between 0 and 1 that the network learns. With f near 1, information passes almost unchanged for dozens of steps."],
    ["The RNN's training error keeps falling but its forecast error rises. What's happening?", "Overfitting: with more hidden units and more epochs, the network memorises the noise in 2 years of history. Stop early, use fewer units, or train on many series at once."],
    ["Why can an RNN forecast go off track over 52 weeks?", "It forecasts recursively: each week's prediction is fed back as next week's “last week's sales”. Errors compound. Direct multi-horizon models or seq-to-seq designs avoid this."],
  ],
  diy: {
    intro: "One RNN step in Excel, with 3 hidden units and 4 inputs. Inputs xₜ in B2:E2 (last week's sales scaled, promo flag, sin and cos of week). Previous hidden state in G2:I2. Weight matrices: Wₓ in K2:N4 (3×4), Wₕ in P2:R4 (3×3), bias in T2:T4, output weights v in V2:X2, output bias in Z2.",
    steps: [
      ["New hidden state: weighted inputs + weighted old memory + bias, squashed by tanh.", "G3: =TANH(SUMPRODUCT($B2:$E2, K2:N2) + SUMPRODUCT($G2:$I2, P2:R2) + T2)   (rows 3–4 of the weights for H3, I3; enter across with TRANSPOSE or one cell per unit)"],
      ["Forecast (scaled): weighted hidden state + bias.", "=SUMPRODUCT(G3:I3, V2:X2) + Z2"],
      ["Unscale: multiply by the training standard deviation and add the mean.", "=scaled*STDEV.P(train_sales)+AVERAGE(train_sales)"],
      ["Roll forward: next row's “last week's sales” is this row's forecast.", "B3: =forecast_scaled_in_row_2"],
      ["How much of a signal survives k steps with factor w (plain RNN) or forget gate f (LSTM).", "=w^k   vs   =f^k"],
      ["Seasonal naive benchmark: same week last year.", "=B(t-52)"],
    ],
  },
  deeper: [
    ["Hochreiter & Schmidhuber (1997), Long short-term memory, Neural Computation 9(8)", "https://doi.org/10.1162/neco.1997.9.8.1735", "the LSTM"],
    ["Bengio, Simard & Frasconi (1994), Learning long-term dependencies with gradient descent is difficult, IEEE Trans. Neural Networks 5(2)", "https://doi.org/10.1109/72.279181", "the vanishing gradient problem"],
    ["Salinas, Flunkert, Gasthaus & Januschowski (2020), DeepAR: probabilistic forecasting with autoregressive recurrent networks, IJF 36(3)", "https://doi.org/10.1016/j.ijforecast.2019.07.001", "Amazon's RNN forecaster, trained across many products"],
    ["Makridakis, Spiliotis & Assimakopoulos (2018), Statistical and machine learning forecasting methods: concerns and ways forward, PLOS ONE 13(3)", "https://doi.org/10.1371/journal.pone.0194889", "on single series, ML often lost to simple statistics"],
    ["Olah (2015), Understanding LSTM networks", "https://colah.github.io/posts/2015-08-Understanding-LSTMs/", "the classic illustrated guide"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="10" y="22" width="18" height="18" rx="3"/><rect x="40" y="22" width="18" height="18" rx="3"/><rect x="70" y="22" width="18" height="18" rx="3"/><path d="M28 31 H40 M58 31 H70"/><path d="M19 56 V40 M49 56 V40 M79 56 V40" stroke-opacity=".6"/><path d="M19 22 V8 M49 22 V8 M79 22 V8" stroke-dasharray="3 3"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    // Small Elman RNN with exact backprop through time and Adam.
    function makeRNN(I, H, rand) {
      const M = (r, c, s) => Array.from({ length: r }, () => Array.from({ length: c }, () => s * rand()));
      const p = { Wx: M(H, I, 0.5), Wh: M(H, H, 0.3), b: [new Array(H).fill(0)], v: [Array.from({ length: H }, () => 0.3 * rand())], c: [[0]] };
      function forward(X) { const hs = [new Array(H).fill(0)], ys = []; X.forEach((x, t) => { const hp = hs[t], h = new Array(H); for (let i = 0; i < H; i++) { let z = p.b[0][i]; for (let j = 0; j < I; j++) z += p.Wx[i][j] * x[j]; for (let j = 0; j < H; j++) z += p.Wh[i][j] * hp[j]; h[i] = Math.tanh(z); } hs.push(h); ys.push(h.reduce((s, hi, i) => s + hi * p.v[0][i], p.c[0][0])); }); return { hs, ys }; }
      function grads(X, Y, from) {
        const { hs, ys } = forward(X), G = { Wx: p.Wx.map((r) => r.map(() => 0)), Wh: p.Wh.map((r) => r.map(() => 0)), b: [new Array(H).fill(0)], v: [new Array(H).fill(0)], c: [[0]] }; let L = 0, n = 0;
        let dhn = new Array(H).fill(0);
        for (let t = X.length - 1; t >= 0; t--) {
          const h = hs[t + 1], hp = hs[t]; let dy = 0; if (t >= from && Y[t] !== null) { dy = ys[t] - Y[t]; L += dy * dy; n++; }
          const dh = h.map((_, i) => dhn[i] + dy * p.v[0][i]); for (let i = 0; i < H; i++) G.v[0][i] += dy * h[i]; G.c[0][0] += dy;
          const dz = dh.map((g, i) => g * (1 - h[i] * h[i])); dhn = new Array(H).fill(0);
          for (let i = 0; i < H; i++) { G.b[0][i] += dz[i]; for (let j = 0; j < I; j++) G.Wx[i][j] += dz[i] * X[t][j]; for (let j = 0; j < H; j++) { G.Wh[i][j] += dz[i] * hp[j]; dhn[j] += dz[i] * p.Wh[i][j]; } }
        }
        const k = 1 / Math.max(1, n); for (const key in G) G[key] = G[key].map((r) => r.map((g) => g * k));
        return { G, L: L / Math.max(1, n) };
      }
      const m = {}, v = {}; for (const k in p) { m[k] = p[k].map((r) => r.map(() => 0)); v[k] = p[k].map((r) => r.map(() => 0)); } let step = 0;
      function train(X, Y, from, lr) { const { G, L } = grads(X, Y, from); step++; for (const k in p) p[k].forEach((r, i) => r.forEach((_, j) => { let g = Math.max(-1, Math.min(1, G[k][i][j])); m[k][i][j] = 0.9 * m[k][i][j] + 0.1 * g; v[k][i][j] = 0.999 * v[k][i][j] + 0.001 * g * g; r[j] -= (lr * m[k][i][j] / (1 - 0.9 ** step)) / (Math.sqrt(v[k][i][j] / (1 - 0.999 ** step)) + 1e-8); })); return L; }
      return { p, forward, grads, train, snap: () => JSON.parse(JSON.stringify(p)), load: (s) => { for (const k in s) p[k] = JSON.parse(JSON.stringify(s[k])); } };
    }
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);
    const N = 156, TR = 104, EP = 600, EVERY = 20, HS = [4, 8, 16];
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0"><div style="padding:4px 6px 0">${h4("Two years of history, then a one-year forecast")}</div><canvas id="r1" aria-label="Weekly sales with the RNN fit and forecast and a seasonal naive forecast"></canvas><figcaption id="r1Cap"></figcaption></figure>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Training: fit vs forecast error")}</div><canvas id="r2" aria-label="Training loss and forecast error against epochs"></canvas><figcaption id="r2Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("The memory: hidden state, week by week")}</div><canvas id="r3" aria-label="Heatmap of hidden state values over time"></canvas><figcaption id="r3Cap"></figcaption></figure>`)}
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Why plain RNNs forget, and LSTMs don't")}</div><canvas id="r4" aria-label="Share of a signal remaining after k steps for an RNN and an LSTM"></canvas><figcaption id="r4Cap"></figcaption></figure>`,
          `<div class="plot" style="padding:14px">${h4("One step, worked out")}<div id="work" style="font:.78rem/1.8 var(--font-mono);overflow-x:auto"></div></div>`)}`,
      panel: `
        <p class="hint" style="margin:0">Weekly unit sales for one product: a slow trend, a yearly season and promotions. The RNN sees last week's sales, this week's promo flag and the time of year, and is trained on weeks 1–104. Weeks 105–156 are forecast without peeking (promotions are planned, so their flags are known).</p>
        <div class="ctrl"><label>Hidden units (memory size, retrains)</label><div class="seg" id="hs">${HS.map((h, i) => `<button type="button" data-v="${h}" aria-pressed="${i === 1}">${h}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="ep">Training epochs shown <output id="epV"></output></label><input type="range" id="ep" min="0" max="${EP}" step="${EVERY}" value="${EP}"></div>
        <div class="ctrl"><label for="wk">Week to inspect <output id="wkV"></output></label><input type="range" id="wk" min="2" max="${N}" step="1" value="110"></div>
        <div class="ctrl"><label for="w">Plain RNN: memory multiplier per step <output id="wV"></output></label><input type="range" id="w" min="0.5" max="1.1" step="0.01" value="0.8"></div>
        <div class="ctrl"><label for="f">LSTM: forget gate <output id="fV"></output></label><input type="range" id="f" min="0.5" max="1" step="0.005" value="0.97"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn primary" id="best" type="button">Stop at the best forecast</button><button class="btn" id="retrain" type="button">Retrain from a new random start</button><button class="btn" id="resim" type="button">New sales history</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>One step of an RNN</h2>
          <div class="eq">hₜ = tanh(Wₓ xₜ + Wₕ hₜ₋₁ + b) &nbsp;&nbsp; ŷₜ = v · hₜ + c</div>
          <p>The same weights are used every week. Training runs the whole two years forward, measures the squared error of every one-week-ahead forecast, and sends the error back through all the steps (backpropagation through time) to adjust the weights with <a href="#gradient-descent">gradient descent</a>.</p>
        </section>
        <section>
          <h2>The LSTM cell</h2>
          <p>An LSTM keeps two memories: the hidden state h and a cell state C. Three gates, each a small sigmoid layer giving values between 0 and 1, control the cell:</p>
          <div class="eq">Cₜ = fₜ ⊙ Cₜ₋₁ + iₜ ⊙ tanh(…) &nbsp;&nbsp; hₜ = oₜ ⊙ tanh(Cₜ)</div>
          <p>The forget gate f scales the old memory, the input gate i decides how much new information to add, and the output gate o decides how much to reveal. Because the cell is updated by adding rather than repeatedly multiplying by weights and squashing, a forget gate near 1 lets information (and gradients) travel across many steps. A GRU is a simpler variant with two gates.</p>
        </section>
        <section>
          <h2>When to use them for demand</h2>
          <p>RNNs earn their keep when trained on <b>many related series</b> at once (thousands of SKUs), as in Amazon's DeepAR, which is the same idea as <a href="#global-forecasting">global forecasting</a> with trees. On one short series, simple methods like <a href="#exponential-smoothing">exponential smoothing</a> or even seasonal naive are hard to beat, which is what the M3 and M4 competitions found. Transformers (see <a href="#transformer">inside a transformer block</a>) have since taken over many sequence tasks, because attention can look back directly instead of passing everything through a memory.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Drag training epochs from 0 upward: the fit improves, the forecast first improves then may worsen.</li>
            <li>Switch to 16 hidden units: training error goes lower, the forecast usually gets worse.</li>
            <li>Retrain a few times from new random starts: the forecast changes a lot. That instability is typical of neural nets on small data.</li>
            <li>In the memory chart, set the RNN multiplier to 0.8: after 20 steps 1% of a signal remains. An LSTM with f = 0.97 still keeps 54%.</li>
          </ul>
        </section>`,
    });

    let seed = 3, initSeed = 7, H = 8, y = [], pr = [], mu = 0, sd = 1, z = [], net = null, view = null, snaps = [], loss = [], fErr = [], job = 0, following = true;
    function gen() {
      const r = rng(seed); let lvl = 100; y = []; pr = [];
      for (let t = 0; t < N; t++) { lvl += 0.15 + 0.75 * r.normal(); const p = r() < 0.12 ? 1 : 0; pr.push(p); y.push(lvl * (1 + 0.3 * Math.sin((2 * Math.PI * (t - 10)) / 52)) * (1 + 0.5 * p) * (1 + 0.08 * r.normal())); }
      const tr = y.slice(0, TR); mu = tr.reduce((a, b) => a + b, 0) / TR; sd = Math.sqrt(tr.reduce((a, b) => a + (b - mu) ** 2, 0) / TR); z = y.map((v) => (v - mu) / sd);
    }
    const inp = (t, prev) => [prev, pr[t], Math.sin((2 * Math.PI * t) / 52), Math.cos((2 * Math.PI * t) / 52)];
    const trainXY = () => { const X = [], Y = []; for (let t = 1; t < TR; t++) { X.push(inp(t, z[t - 1])); Y.push(z[t]); } return [X, Y]; };
    function stepH(p, x, h) { return h.map((_, i) => { let q = p.b[0][i]; x.forEach((v, j) => (q += p.Wx[i][j] * v)); h.forEach((v, j) => (q += p.Wh[i][j] * v)); return Math.tanh(q); }); }
    function runModel(m) {
      const [X] = trainXY(), st = m.forward(X), fit = [null].concat(st.ys.map((o) => o * sd + mu)), hs = st.hs.slice(1);
      let h = st.hs[st.hs.length - 1], prev = z[TR - 1]; const fc = [], hsF = [];
      for (let t = TR; t < N; t++) { const x = inp(t, prev); h = stepH(m.p, x, h); hsF.push(h); const o = h.reduce((s, hi, i) => s + hi * m.p.v[0][i], m.p.c[0][0]); fc.push(o * sd + mu); prev = o; }
      return { fit, fc, hs: [new Array(H).fill(0)].concat(hs, hsF), mae: fc.reduce((s, v, i) => s + Math.abs(v - y[TR + i]), 0) / (N - TR) };
    }
    function start() {
      const my = ++job, r = rng(initSeed * 31 + H); net = makeRNN(4, H, () => 2 * r() - 1); view = makeRNN(4, H, () => 0);
      const [X, Y] = trainXY(); snaps = [net.snap()]; loss = [net.grads(X, Y, 4).L]; fErr = [runModel(net).mae]; following = true; $("#ep").value = 0; update();
      const chunk = () => {
        if (my !== job) return;
        for (let k = 0; k < EVERY && loss.length <= EP; k++) { loss.push(net.train(X, Y, 4, 0.01)); if ((loss.length - 1) % EVERY === 0) { snaps.push(net.snap()); fErr.push(runModel(net).mae); } }
        if (following) $("#ep").value = (snaps.length - 1) * EVERY;
        update(); if (loss.length <= EP) setTimeout(chunk, 0);
      };
      setTimeout(chunk, 0);
    }
    let R = null;
    function compute() { const k = Math.min(snaps.length - 1, Math.round(+$("#ep").value / EVERY)); view.load(snaps[k]); R = runModel(view); R.k = k; }
    const sn = () => y.slice(TR).map((_, i) => y[TR + i - 52]);
    const P1 = new Plot($("#r1"), { x: [0, N - 1], pad: { l: 46, b: 38 } }), P2 = new Plot($("#r2"), { x: [0, EP], pad: { l: 46, b: 38, r: 46 } }), P3 = new Plot($("#r3"), { x: [0, N - 1], pad: { l: 30, b: 38 } }), P4 = new Plot($("#r4"), { x: [0, 40], y: [0, 1], pad: { l: 46, b: 38 } });
    function d1() {
      const xs = y.map((_, i) => i), all = y.concat(R.fc, sn()); P1.resize(); P1.x = [0, N - 1]; P1.y = [Math.min(...all) * 0.9, Math.max(...all) * 1.05]; P1.clear();
      P1.axes({ xLabel: "week", yLabel: "units", xFormat: (v) => fmt(v + 1, 0), yFormat: (v) => fmt(v, 0) });
      const g = P1.ctx; g.fillStyle = css("--grid"); g.globalAlpha = 0.35; g.fillRect(P1.sx(TR - 0.5), P1.pad.t, P1.sx(N - 1) - P1.sx(TR - 0.5), P1.ih); g.globalAlpha = 1;
      pr.forEach((p, t) => { if (p) { g.fillStyle = css("--warm"); g.globalAlpha = 0.15; g.fillRect(P1.sx(t - 0.5), P1.pad.t, P1.sx(t + 0.5) - P1.sx(t - 0.5), P1.ih); g.globalAlpha = 1; } });
      P1.path(xs, y, css("--ink"), 1.6); P1.path(xs.slice(1, TR), R.fit.slice(1), css("--accent"), 1.3, null, 0.7);
      const fx = xs.slice(TR); P1.path(fx, sn(), css("--muted"), 1.8, [5, 4]); P1.path(fx, R.fc, css("--accent"), 2.6);
      const k = +$("#wk").value - 1; P1.path([k, k], P1.y, css("--violet"), 1.2, [2, 3]);
      const snm = sn().reduce((s, v, i) => s + Math.abs(v - y[TR + i]), 0) / (N - TR);
      $("#r1Cap").innerHTML = `Black: actual. Thin blue: the RNN's one-week-ahead fit in training. Thick blue: its forecast for year 3, fed its own predictions week by week (error ${fmt(R.mae, 1)} units). Grey dashed: seasonal naive, same week last year (error ${fmt(snm, 1)}). Orange bands: promotions.`;
    }
    function d2() {
      const mxL = Math.max(...loss.slice(0, Math.max(2, loss.length))), ep = R.k * EVERY, xs = fErr.map((_, i) => i * EVERY), mxF = Math.max(...fErr) * 1.1, g = P2.ctx;
      P2.resize(); P2.y = [0, Math.min(mxL, 1.2) * 1.05]; P2.clear(); P2.axes({ xLabel: "epochs (passes over the 2 years)", yLabel: "training error (scaled MSE)", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 2), xCount: 4 });
      P2.path(loss.map((_, i) => i), loss, css("--muted"), 2);
      g.strokeStyle = css("--accent"); g.lineWidth = 2.5; g.beginPath(); fErr.forEach((v, i) => { const X = P2.sx(xs[i]), Y = P2.sy((v / mxF) * P2.y[1]); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke();
      g.fillStyle = css("--accent"); g.font = "10px " + css("--font-mono"); g.textAlign = "left"; [0, 0.5, 1].forEach((f) => g.fillText(fmt(mxF * f, 0), P2.w - P2.pad.r + 4, P2.sy(f * P2.y[1])));
      const bi = fErr.reduce((b, v, i) => (v < fErr[b] ? i : b), 0); P2.dot(bi * EVERY, (fErr[bi] / mxF) * P2.y[1], 4.5, css("--good"), css("--surface"));
      P2.path([ep, ep], P2.y, css("--warm"), 1.5);
      $("#r2Cap").innerHTML = `${loss.length <= EP ? `<b>Training… epoch ${loss.length - 1}.</b> ` : ""}Grey: training error (left axis). Blue: forecast error on year 3 in units (right axis); green: its best, ${fmt(fErr[bi], 1)} at epoch ${bi * EVERY}. Orange: the epoch shown.`;
    }
    function d3() {
      P3.resize(); P3.x = [0, N - 1]; P3.y = [0, H]; P3.clear(); P3.axes({ xLabel: "week", yLabel: "", xFormat: (v) => fmt(v + 1, 0), yTicks: [] });
      const g = P3.ctx, cw = P3.iw / N, ch = P3.ih / H;
      R.hs.forEach((h, t) => h.forEach((v, i) => { g.fillStyle = css(v >= 0 ? "--accent" : "--warm"); g.globalAlpha = Math.min(1, Math.abs(v)) * 0.9; g.fillRect(P3.pad.l + t * cw, P3.pad.t + i * ch, cw + 0.6, ch - 1); })); g.globalAlpha = 1;
      g.strokeStyle = css("--ink"); g.lineWidth = 1.5; g.beginPath(); g.moveTo(P3.sx(TR - 0.5), P3.pad.t); g.lineTo(P3.sx(TR - 0.5), P3.pad.t + P3.ih); g.stroke();
      const k = +$("#wk").value - 1; g.strokeStyle = css("--violet"); g.strokeRect(P3.pad.l + k * cw - 1, P3.pad.t, cw + 2, P3.ih);
      g.fillStyle = css("--muted"); g.font = "10px " + css("--font-mono"); g.textAlign = "right"; g.textBaseline = "middle"; for (let i = 0; i < H; i += H > 8 ? 4 : 1) g.fillText("h" + (i + 1), P3.pad.l - 4, P3.pad.t + (i + 0.5) * ch);
      $("#r3Cap").innerHTML = `Each row is one hidden unit, each column a week (blue positive, orange negative). Some units track the season, some react to promotions. Right of the black line the network is running on its own forecasts.`;
    }
    function d4() {
      const w = +$("#w").value, f = +$("#f").value, ks = Array.from({ length: 41 }, (_, k) => k); P4.resize(); P4.clear();
      P4.axes({ xLabel: "steps later", yLabel: "share of the signal left", xFormat: (v) => fmt(v, 0), yFormat: (v) => Math.round(v * 100) + "%" });
      P4.path(ks, ks.map((k) => Math.min(1, w ** k)), css("--warm"), 2.5); P4.path(ks, ks.map((k) => f ** k), css("--accent"), 2.5);
      P4.path([26, 26], [0, 1], css("--muted"), 1, [4, 3]); P4.path([52 > 40 ? 40 : 52, 40], [0, 0], css("--muted"), 1);
      $("#r4Cap").innerHTML = `Orange: a plain RNN multiplies its memory by about ${fmt(w, 2)} each step${w > 1 ? " (above 1: it explodes instead, shown capped)" : ""}. Blue: an LSTM cell with forget gate ${fmt(f, 3)}. After 26 weeks (dashed): RNN ${fmt(Math.min(1, w ** 26) * 100, w ** 26 < 0.01 ? 2 : 0)}%, LSTM ${fmt(f ** 26 * 100, 0)}%. The same factors shrink the training gradients.`;
    }
    function work() {
      const t = +$("#wk").value - 1, p = view.p, h0 = R.hs[t], prevZ = t <= TR ? z[t - 1] : (R.fc[t - 1 - TR] !== undefined ? (R.fc[t - 1 - TR] - mu) / sd : z[t - 1]), x = inp(t, t < TR ? z[t - 1] : t === TR ? z[TR - 1] : prevZ), h1 = R.hs[t + 1] || R.hs[t], B = (s) => `<b style="color:var(--ink)">${s}</b>`;
      const L = [`Week ${t + 1}${t >= TR ? " (forecasting on its own outputs)" : ""}. Inputs x = [last week ${fmt(x[0], 2)} (scaled), promo ${x[1]}, sin ${fmt(x[2], 2)}, cos ${fmt(x[3], 2)}]`];
      for (let i = 0; i < Math.min(3, H); i++) { const a = p.Wx[i].reduce((s, w, j) => s + w * x[j], 0), b = p.Wh[i].reduce((s, w, j) => s + w * h0[j], 0); L.push(`h${i + 1} = tanh(Wₓ·x ${fmt(a, 2)} + Wₕ·hₜ₋₁ ${b >= 0 ? "+" : "−"} ${fmt(Math.abs(b), 2)} + b ${p.b[0][i] >= 0 ? "+" : "−"} ${fmt(Math.abs(p.b[0][i]), 2)}) = ${B(fmt(Math.tanh(a + b + p.b[0][i]), 3))}`); }
      if (H > 3) L.push(`… and ${H - 3} more hidden units the same way`);
      const o = h1.reduce((s, hi, i) => s + hi * p.v[0][i], p.c[0][0]);
      L.push(`forecast = v·h + c = ${fmt(o, 3)} (scaled) × ${fmt(sd, 1)} + ${fmt(mu, 1)} = ${B(fmt(o * sd + mu, 1))} units; actual ${fmt(y[t], 1)}`);
      $("#work").innerHTML = L.map((l) => `<div>${l}</div>`).join("");
    }
    function readouts() {
      const snm = sn().reduce((s, v, i) => s + Math.abs(v - y[TR + i]), 0) / (N - TR), nW = 4 * H + H * H + H + H + 1;
      $("#ro").innerHTML = [["Epoch shown", `<span class="num">${R.k * EVERY}</span>`], ["RNN forecast error", `<span class="pill ${R.mae < snm * 0.9 ? "ok" : R.mae < snm * 1.1 ? "warn" : "bad"}">${fmt(R.mae, 1)}</span>`], ["Seasonal naive error", `<span class="num">${fmt(snm, 1)}</span>`], ["Weights in the network", `<span class="num">${nW}</span>`]]
        .map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { $("#epV").textContent = $("#ep").value + (loss.length <= EP ? ` (training: ${loss.length - 1})` : ""); $("#wkV").textContent = $("#wk").value; $("#wV").textContent = fmt(+$("#w").value, 2); $("#fV").textContent = fmt(+$("#f").value, 3); }
    function update() { if (!net) return; labels(); compute(); d1(); d2(); d3(); d4(); work(); readouts(); }
    $("#ep").addEventListener("input", () => { following = +$("#ep").value >= (snaps.length - 1) * EVERY; update(); });
    ["wk", "w", "f"].forEach((id) => $("#" + id).addEventListener("input", update));
    root.querySelectorAll("#hs button").forEach((b) => b.addEventListener("click", () => { root.querySelectorAll("#hs button").forEach((x) => x.setAttribute("aria-pressed", x === b)); H = +b.dataset.v; start(); }));
    $("#best").addEventListener("click", () => { const bi = fErr.reduce((b, v, i) => (v < fErr[b] ? i : b), 0); following = false; $("#ep").value = bi * EVERY; update(); });
    $("#retrain").addEventListener("click", () => { initSeed++; start(); });
    $("#resim").addEventListener("click", () => { seed++; gen(); start(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 3; initSeed = 7; H = 8; root.querySelectorAll("#hs button").forEach((b, i) => b.setAttribute("aria-pressed", i === 1)); gen(); start(); });
    gen(); start();
    const stop = watch([$("#r1"), $("#r2"), $("#r3"), $("#r4")], () => { if (R) { d1(); d2(); d3(); d4(); } });
    return () => { job++; stop(); };
  },
});
