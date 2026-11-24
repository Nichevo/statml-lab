Lab.register({
  id: "transformer",
  group: "Machine learning",
  title: "Inside a transformer block",
  blurb: "A real (tiny) transformer trains in your browser on order sentences. Follow one word from embedding, through attention and the feed-forward layer, to its next-word prediction.",
  lede: "Large language models are stacks of one repeated block. Here is that block, small enough to see every number. Words become vectors (embeddings), get a position signal, gather information from earlier words (attention), get processed on their own (feed-forward), and finally score every word in the vocabulary as the possible next one. The model below trains in your browser on twelve sentences like “milk demand went up so order more milk”.",
  quiz: [
    ["Why does a transformer add a position signal to each embedding?", "Attention is a weighted sum over the earlier words, and a sum doesn't care about order. Without position information “dog bites man” and “man bites dog” look the same. Adding a position pattern to each word's vector lets the model tell first from fourth."],
    ["After “start” the model gives each item about 1 in 6. Is it under-trained?", "No. Every sentence starts with one of six items, equally often, so nothing could predict which. 1/6 each is the best possible answer, and it's why the loss can't fall below about 0.28. Real language has lots of this irreducible uncertainty."],
    ["What job does attention do that the feed-forward layer can't?", "Attention moves information between positions: “more” pulls in which item the sentence started with. The feed-forward layer works on each position separately, transforming what's already there. You need both."],
    ["What is the residual connection for?", "Each sub-layer adds its output to the running vector instead of replacing it. The original word information flows straight through, layers only need to learn corrections, and deep stacks of blocks stay trainable."],
    ["With vector size 4 the model never gets below about 0.5 loss. Why?", "Four numbers per word aren't enough to hold the word's identity, its position, and the information copied from earlier words at once. Capacity matters; real models use vectors of thousands of numbers."],
    ["How is a real LLM different from this one?", "Same block, scaled up: tens of thousands of sub-word tokens instead of 16 words, vectors of thousands of numbers, many attention heads, dozens of stacked blocks, and trillions of words of training text. The arithmetic per step is what you see here."],
  ],
  diy: {
    intro: "Rebuild the forward pass for one sentence with d = 8. Put the vocabulary in Emb!A2:A17 with each word's 8-number embedding in Emb!B2:I17 (copy them from the page's embedding strips, or start random). Put the sentence one word per row in A2:A10.",
    steps: [
      ["Embedding lookup: fetch each word's vector.", "B2: =INDEX(Emb!B$2:B$17, MATCH($A2, Emb!$A$2:$A$17, 0))   (fill to I10)"],
      ["Position signal for row position p (0, 1, 2 …) and column j (0–7). This toy uses base 10; the original paper uses 10000.", "=0.5*IF(ISEVEN(j), SIN(p/10^(2*INT(j/2)/8)), COS(p/10^(2*INT(j/2)/8)))"],
      ["Input vector x = embedding + position.", "K2: =B2+B14   (where B14:I22 holds the position signals)"],
      ["Layer norm: centre each row and scale it to unit spread.", "=(K2-AVERAGE($K2:$R2))/SQRT(VAR.P($K2:$R2)+1E-5)"],
      ["Attention: queries, keys, values, scores, softmax and weighted sum, exactly as on the attention page.", "Q: =MMULT(LN, WQ)   scores: =MMULT(Q, TRANSPOSE(K))/SQRT(8), masked above the diagonal"],
      ["Residual: add the attention output back to x.", "=K2+att2"],
      ["Feed-forward with ReLU, then add the result back again.", "h: =MAX(0, MMULT(LNrow, W1)+b1)   out: =MMULT(h, W2)+b2"],
      ["Next-word probabilities at temperature T: scores for all 16 words, then softmax.", "=EXP(z/T)/SUM(EXP(z_row/T))"],
    ],
  },
  deeper: [
    ["Vaswani et al. (2017), Attention is all you need, arXiv:1706.03762", "https://arxiv.org/abs/1706.03762", "the original transformer block"],
    ["Mikolov et al. (2013), Efficient estimation of word representations in vector space, arXiv:1301.3781", "https://arxiv.org/abs/1301.3781", "word embeddings (word2vec)"],
    ["He et al. (2016), Deep residual learning for image recognition, arXiv:1512.03385", "https://arxiv.org/abs/1512.03385", "residual connections"],
    ["Ba, Kiros & Hinton (2016), Layer normalization, arXiv:1607.06450", "https://arxiv.org/abs/1607.06450", "layer norm"],
    ["Xiong et al. (2020), On layer normalization in the transformer architecture, arXiv:2002.04745", "https://arxiv.org/abs/2002.04745", "why norm goes before each sub-layer"],
    ["Elhage et al. (2021), A mathematical framework for transformer circuits", "https://transformer-circuits.pub/2021/framework/index.html", "reading what small transformers learn"],
    ["Karpathy, nanoGPT (now archived in favour of nanochat)", "https://github.com/karpathy/nanoGPT", "a full, short GPT you can read and train yourself"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="30" y="4" width="36" height="12" rx="3"/><rect x="30" y="26" width="36" height="12" rx="3"/><rect x="30" y="48" width="36" height="12" rx="3" stroke-opacity=".5"/><path d="M48 16 V26 M48 38 V48"/><path d="M22 54 C12 54 12 32 30 32 M22 54 C12 54 12 10 30 10" stroke-dasharray="3 3"/><g fill="currentColor"><rect x="72" y="7" width="4" height="6"/><rect x="78" y="5" width="4" height="8"/><rect x="84" y="9" width="4" height="4"/></g></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    // Tiny one-block transformer with exact backprop (pre-layer-norm, one attention head, causal mask).
    function makeTF(V, T, d, H, rand) {
      const M = (r, c, s) => Array.from({ length: r }, () => Array.from({ length: c }, () => s * rand()));
      const Z = (r, c) => Array.from({ length: r }, () => new Array(c).fill(0));
      const P = Array.from({ length: T }, (_, i) => Array.from({ length: d }, (_, j) => { const f = 1 / Math.pow(10, (2 * Math.floor(j / 2)) / d); return 0.5 * (j % 2 ? Math.cos(i * f) : Math.sin(i * f)); }));
      const p = { E: M(V, d, 0.5), Wq: M(d, d, 1 / Math.sqrt(d)), Wk: M(d, d, 1 / Math.sqrt(d)), Wv: M(d, d, 1 / Math.sqrt(d)), Wo: M(d, d, 1 / Math.sqrt(d)), W1: M(d, H, 1 / Math.sqrt(d)), b1: [new Array(H).fill(0)], W2: M(H, d, 1 / Math.sqrt(H)), b2: [new Array(d).fill(0)], U: M(d, V, 1 / Math.sqrt(d)), bu: [new Array(V).fill(0)] };
      const vm = (v, W) => { const o = new Array(W[0].length).fill(0); for (let i = 0; i < v.length; i++) { const a = v[i]; if (a) { const r = W[i]; for (let j = 0; j < o.length; j++) o[j] += a * r[j]; } } return o; };
      const vmT = (v, W) => W.map((r) => r.reduce((s, x, j) => s + x * v[j], 0));
      const outer = (G, a, b) => { for (let i = 0; i < a.length; i++) { const ai = a[i]; if (ai) { const g = G[i]; for (let j = 0; j < b.length; j++) g[j] += ai * b[j]; } } };
      const add = (a, b) => a.map((x, i) => x + b[i]);
      const LN = (x) => { const m = x.reduce((a, b) => a + b, 0) / x.length, v = x.reduce((a, b) => a + (b - m) ** 2, 0) / x.length, sd = Math.sqrt(v + 1e-5); return { y: x.map((t) => (t - m) / sd), sd }; };
      const LNb = (y, sd, dy) => { const n = y.length, md = dy.reduce((a, b) => a + b, 0) / n, mdy = dy.reduce((a, b, i) => a + b * y[i], 0) / n; return dy.map((g, i) => (g - md - y[i] * mdy) / sd); };
      const smax = (z) => { const m = Math.max(...z), e = z.map((t) => Math.exp(t - m)), s = e.reduce((a, b) => a + b, 0); return e.map((t) => t / s); };
      const rs = Math.sqrt(d);
      function forward(tok) {
        const n = tok.length, c = { tok, n };
        c.x0 = tok.map((t, i) => add(p.E[t], P[i]));
        c.a = c.x0.map(LN); const A = c.a.map((o) => o.y);
        c.q = A.map((v) => vm(v, p.Wq)); c.k = A.map((v) => vm(v, p.Wk)); c.v = A.map((v) => vm(v, p.Wv));
        c.s = c.q.map((q, i) => c.k.slice(0, i + 1).map((k) => q.reduce((s, x, j) => s + x * k[j], 0) / rs));
        c.w = c.s.map(smax);
        c.z = c.w.map((w) => { const o = new Array(d).fill(0); w.forEach((wj, j) => c.v[j].forEach((x, t) => (o[t] += wj * x))); return o; });
        c.att = c.z.map((z) => vm(z, p.Wo));
        c.x1 = c.x0.map((x, i) => add(x, c.att[i]));
        c.b = c.x1.map(LN);
        c.hp = c.b.map((o) => add(vm(o.y, p.W1), p.b1[0])); c.h = c.hp.map((r) => r.map((x) => (x > 0 ? x : 0)));
        c.f = c.h.map((h) => add(vm(h, p.W2), p.b2[0]));
        c.x2 = c.x1.map((x, i) => add(x, c.f[i]));
        c.c = c.x2.map(LN);
        c.logit = c.c.map((o) => add(vm(o.y, p.U), p.bu[0]));
        c.p = c.logit.map(smax);
        return c;
      }
      function backward(c, tgt, G, scale) {
        const n = c.n, dx1 = [], dx0 = [];
        const dq = Array.from({ length: n }, () => new Array(d).fill(0)), dk = dq.map((r) => r.slice()), dv = dq.map((r) => r.slice());
        for (let i = 0; i < n; i++) {
          const dl = c.p[i].map((x, j) => (x - (j === tgt[i] ? 1 : 0)) * scale);
          outer(G.U, c.c[i].y, dl); G.bu[0] = add(G.bu[0], dl);
          const dx2 = LNb(c.c[i].y, c.c[i].sd, vmT(dl, p.U));
          outer(G.W2, c.h[i], dx2); G.b2[0] = add(G.b2[0], dx2);
          const dh = vmT(dx2, p.W2).map((g, j) => (c.hp[i][j] > 0 ? g : 0));
          outer(G.W1, c.b[i].y, dh); G.b1[0] = add(G.b1[0], dh);
          dx1[i] = add(dx2, LNb(c.b[i].y, c.b[i].sd, vmT(dh, p.W1)));
          outer(G.Wo, c.z[i], dx1[i]); const dz = vmT(dx1[i], p.Wo);
          const w = c.w[i], dw = w.map((_, j) => dz.reduce((s, g, t) => s + g * c.v[j][t], 0)), sw = w.reduce((s, x, j) => s + x * dw[j], 0);
          w.forEach((wj, j) => { const ds = (wj * (dw[j] - sw)) / rs; for (let t = 0; t < d; t++) { dv[j][t] += wj * dz[t]; dq[i][t] += ds * c.k[j][t]; dk[j][t] += ds * c.q[i][t]; } });
        }
        for (let i = 0; i < n; i++) {
          const A = c.a[i].y; outer(G.Wq, A, dq[i]); outer(G.Wk, A, dk[i]); outer(G.Wv, A, dv[i]);
          const da = add(add(vmT(dq[i], p.Wq), vmT(dk[i], p.Wk)), vmT(dv[i], p.Wv));
          const g = add(dx1[i], LNb(A, c.a[i].sd, da)); G.E[c.tok[i]] = add(G.E[c.tok[i]], g);
        }
      }
      const zeros = () => Object.fromEntries(Object.entries(p).map(([k, m]) => [k, Z(m.length, m[0].length)]));
      const mom = zeros(), vel = zeros(); let step = 0;
      function loss(data) { let L = 0, N = 0; data.forEach((s) => { const c = forward(s.slice(0, -1)); s.slice(1).forEach((t, i) => { L -= Math.log(c.p[i][t]); N++; }); }); return L / N; }
      function train(data, lr) {
        const G = zeros(), N = data.reduce((a, s) => a + s.length - 1, 0);
        data.forEach((s) => backward(forward(s.slice(0, -1)), s.slice(1), G, 1 / N));
        step++; const b1 = 0.9, b2 = 0.999;
        for (const k in p) p[k].forEach((r, i) => r.forEach((_, j) => { const g = G[k][i][j]; mom[k][i][j] = b1 * mom[k][i][j] + (1 - b1) * g; vel[k][i][j] = b2 * vel[k][i][j] + (1 - b2) * g * g; r[j] -= (lr * mom[k][i][j] / (1 - b1 ** step)) / (Math.sqrt(vel[k][i][j] / (1 - b2 ** step)) + 1e-8); }));
        return G;
      }
      const snap = () => JSON.parse(JSON.stringify(p));
      const load = (s) => { for (const k in s) p[k] = JSON.parse(JSON.stringify(s[k])); };
      return { p, P, forward, backward, train, loss, zeros, snap, load, LN };
    }
    const ITEMS = ["milk", "bread", "eggs", "tea", "rice", "jam"];
    const W = ["start", ...ITEMS, "demand", "went", "up", "down", "so", "order", "more", "less", "."], V = W.length, T = 10, STEPS = 400, EVERY = 10, IX = Object.fromEntries(W.map((w, i) => [w, i]));
    const sentence = (it, up) => ["start", it, "demand", "went", up ? "up" : "down", "so", "order", up ? "more" : "less", it, "."].map((w) => IX[w]);
    const DATA = []; ITEMS.forEach((it) => [1, 0].forEach((u) => DATA.push(sentence(it, u))));
    const FLOOR = (Math.log(6) + Math.log(2)) / 9, DS = [4, 8, 16];
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot wide" style="padding:14px">${h4("The sentence: click a word to follow it")}<div id="chips" style="display:flex;flex-wrap:wrap;gap:6px"></div>
          <p id="chipCap" class="hint" style="margin:10px 0 0"></p></div>
        <div class="plot wide" style="padding:14px">${h4("One word's vector, step by step through the block")}<div id="pipe"></div></div>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Attention: who each word looks at")}</div><canvas id="t1" style="height:300px" aria-label="Attention weights heatmap"></canvas><figcaption id="t1Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Next-word prediction")}</div><canvas id="t2" style="height:300px" aria-label="Probability of each possible next word"></canvas><figcaption id="t2Cap"></figcaption></figure>`)}
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Training loss")}</div><canvas id="t3" aria-label="Training loss against step"></canvas><figcaption id="t3Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Word embeddings, squashed to 2-D")}</div><canvas id="t4" aria-label="Map of the learned word embeddings"></canvas><figcaption id="t4Cap"></figcaption></figure>`)}
        <div class="plot wide" style="padding:14px">${h4("Worked out for the selected word")}<div id="work" style="font:.8rem/1.8 var(--font-mono);overflow-x:auto"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Training data: 12 sentences, “<i>item</i> demand went up/down so order more/less <i>item</i>”, for 6 items. To predict well the model must look back: “more” or “less” depends on “up” or “down” 3 words earlier, and the last item must match the first.</p>
        <div class="ctrl"><label>Item in the sentence</label><div class="seg" id="it" style="display:flex;flex-wrap:wrap">${ITEMS.map((t, i) => `<button type="button" data-v="${t}" aria-pressed="${i === 0}">${t}</button>`).join("")}</div></div>
        <div class="ctrl"><label>Demand went</label><div class="seg" id="dir">${["up", "down"].map((t, i) => `<button type="button" data-v="${t}" aria-pressed="${i === 0}">${t}</button>`).join("")}</div></div>
        <div class="ctrl"><label for="pos">Word to inspect <output id="posV"></output></label><input type="range" id="pos" min="0" max="8" step="1" value="7"></div>
        <div class="ctrl"><label for="st">Training steps so far <output id="stV"></output></label><input type="range" id="st" min="0" max="${STEPS}" step="${EVERY}" value="${STEPS}"></div>
        <div class="ctrl"><label for="tp">Temperature for the prediction <output id="tpV"></output></label><input type="range" id="tp" min="0.2" max="3" step="0.1" value="1"></div>
        <div class="ctrl"><label for="dd">Vector size d (retrains) <output id="ddV"></output></label><input type="range" id="dd" min="0" max="2" step="1" value="1"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="retrain" type="button">Retrain from a new random start</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The block, in order</h2>
          <ol>
            <li><b>Embedding</b>: each word is looked up in a table of learned vectors. Similar words end up with similar vectors.</li>
            <li><b>Position</b>: a fixed pattern of sines and cosines, different for each position, is added so the model knows word order.</li>
            <li><b>Layer norm, then attention</b>: the vector is rescaled to a standard spread, then each word gathers a weighted mix from itself and earlier words. See <a href="#attention">attention</a> for the queries, keys and values.</li>
            <li><b>Add</b>: the attention output is added to the running vector (the residual connection).</li>
            <li><b>Layer norm, then feed-forward</b>: a small two-layer <a href="#neural-net">neural network</a> processes each position on its own, then its output is added too.</li>
            <li><b>Output</b>: the final vector is normalised and multiplied by an output matrix to give a score for every word in the vocabulary. Softmax turns the scores into probabilities.</li>
          </ol>
          <p>A large language model repeats steps 3–5 dozens of times (each repeat is a “layer”), with many attention heads side by side in each.</p>
        </section>
        <section>
          <h2>How it learns</h2>
          <p>Every weight starts random. For each word in each training sentence the model predicts the next word, and the loss is minus the log of the probability it gave the right one. <a href="#gradient-descent">Gradient descent</a> (here the Adam variant) nudges every weight to lower the average loss. This page computes the exact gradients for all of the roughly 1,000 to 4,000 weights, 400 times over, in your browser.</p>
          <p>Watch the loss curve: it falls fast while the model learns the easy, fixed words (“demand” always follows the item), then crawls towards the floor while attention learns to look back for the item and the direction. Drag the step slider back to around step 40 to see the attention map before those patterns have formed.</p>
        </section>
        <section>
          <h2>Why the loss stops at 0.28</h2>
          <p>Two words in every sentence are genuinely unpredictable: the first item (1 in 6) and up or down (1 in 2). Averaged over the 9 predictions per sentence, the best possible loss is (ln 6 + ln 2) / 9 ≈ 0.28. A model that reaches it has learned everything learnable. A model that goes below it on new data would be cheating.</p>
        </section>
        <section>
          <h2>Temperature</h2>
          <p>Dividing the scores by a temperature before the softmax sharpens (below 1) or flattens (above 1) the probabilities without changing their order. Chatbots use temperature above 0 so that they don't always pick the single most likely next word.</p>
        </section>
        <section>
          <h2>What this toy leaves out</h2>
          <p>One block and one attention head; real models stack many of both. Words here are whole words; real models split text into sub-word tokens. Layer norm has no learned scale here, there's no dropout, and the output matrix is separate from the embedding table (many models share them). None of these change the idea.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Select “order” and watch the attention row: it should point at “up” or “down”. Switch direction and the prediction flips between more and less.</li>
            <li>Select the last “more” or “less”: attention should point back at the item, which is how the model copies it.</li>
            <li>Drag training steps to 0: every prediction is close to 1 in 16.</li>
            <li>Set the vector size to 4: the model can't fit and the loss stalls above 0.4.</li>
            <li>Retrain a few times: each run finds a slightly different solution, sometimes using attention in a different way, with the same final loss.</li>
          </ul>
        </section>`,
    });
    let item = "milk", up = true, seed = 3, trainer = null, viewer = null, snaps = [], losses = [], job = 0, following = true, view = null;
    const P1 = new Plot($("#t1"), { pad: { l: 62, r: 10, t: 10, b: 62 } }), P2 = new Plot($("#t2"), { pad: { l: 62, r: 44, t: 10, b: 26 } }), P3 = new Plot($("#t3"), { x: [0, STEPS], pad: { l: 46, b: 38 } }), P4 = new Plot($("#t4"), { pad: { l: 14, r: 14, t: 14, b: 14 } });
    const dOf = () => DS[+$("#dd").value];
    const smaxT = (z, t) => { const m = Math.max(...z), e = z.map((v) => Math.exp((v - m) / t)), s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s); };

    function start() {
      const my = ++job, d = dOf(), r = rng(seed * 131 + d);
      trainer = makeTF(V, T, d, 4 * d, () => 2 * r() - 1); viewer = makeTF(V, T, d, 4 * d, () => 0);
      snaps = [trainer.snap()]; losses = [trainer.loss(DATA)]; following = true; $("#st").value = 0; update();
      const chunk = () => {
        if (my !== job) return;
        for (let k = 0; k < 2 * EVERY && losses.length <= STEPS; k++) { trainer.train(DATA, 0.02); losses.push(trainer.loss(DATA)); if ((losses.length - 1) % EVERY === 0) snaps.push(trainer.snap()); }
        if (following) $("#st").value = (snaps.length - 1) * EVERY;
        update();
        if (losses.length <= STEPS) setTimeout(chunk, 0);
      };
      setTimeout(chunk, 0);
    }

    function compute() {
      const k = Math.min(snaps.length - 1, Math.round(+$("#st").value / EVERY)), toks = sentence(item, up), inp = toks.slice(0, 9);
      viewer.load(snaps[k]);
      const c = viewer.forward(inp), tp = +$("#tp").value, i = +$("#pos").value;
      const probs = c.logit.map((z) => smaxT(z, tp));
      let avg = 0; DATA.forEach((s) => { const cc = viewer.forward(s.slice(0, -1)); s.slice(1).forEach((t, j) => (avg += cc.p[j][t])); }); avg /= DATA.length * 9;
      view = { k, step: k * EVERY, toks, inp, c, tp, i, probs, avg, loss: losses[k * EVERY] ?? losses[losses.length - 1], d: dOf() };
    }

    const cellBg = (v, mx) => { const a = Math.min(1, Math.abs(v) / mx); return `color-mix(in srgb, var(${v >= 0 ? "--accent" : "--warm"}) ${Math.round(a * 85)}%, var(--surface))`; };
    function strip(vec, mx, d) {
      return `<div style="display:flex;gap:2px;flex:1 1 260px;max-width:${d > 8 ? 400 : 340}px;min-width:0">${vec.map((v) => `<span title="${fmt(v, 3)}" style="flex:1 1 0;min-width:0;height:24px;border-radius:3px;background:${cellBg(v, mx)};font:${d > 8 ? ".58rem" : ".68rem"}/24px var(--font-mono);text-align:center;color:var(--ink)">${d > 8 ? "" : fmt(v, 1)}</span>`).join("")}</div>`;
    }
    function chips() {
      const { inp, probs, i, toks } = view;
      $("#chips").innerHTML = inp.map((t, j) => { const pr = probs[j], top = pr.indexOf(Math.max(...pr));
        return `<button type="button" data-p="${j}" aria-pressed="${j === i}" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 9px;border-radius:8px;border:1.5px solid ${j === i ? "var(--accent)" : "var(--line)"};background:${j === i ? "var(--accent-soft)" : "var(--surface)"};cursor:pointer;font:inherit;color:var(--ink)"><b style="font-size:.95rem">${W[t]}</b><span style="font:.68rem var(--font-mono);color:${W[top] === W[toks[j + 1]] ? "var(--good)" : "var(--muted)"}">→ ${W[top]} ${Math.round(pr[top] * 100)}%</span></button>`; }).join("") +
        `<span style="display:flex;align-items:center;padding:6px 9px;color:var(--muted);font-weight:600">.</span>`;
      root.querySelectorAll("#chips button").forEach((b) => b.addEventListener("click", () => { $("#pos").value = b.dataset.p; update(); }));
      const pr = probs[i], top = pr.indexOf(Math.max(...pr)), nxt = toks[i + 1];
      $("#chipCap").innerHTML = `Under each word: the model's top guess for the word after it (green when right). Selected: <b>${W[view.inp[i]]}</b>. The real next word is <b>${W[nxt]}</b>, which gets <b>${Math.round(pr[nxt] * 100)}%</b>.`;
    }
    function pipe() {
      const { c, i, d } = view, t = view.inp[i], p = viewer.p, rows = [
        ["Embedding of “" + W[t] + "”", p.E[t], "looked up in a learned table, one row per word"],
        ["+ position " + i + " signal", viewer.P[i], "fixed sine/cosine pattern for this position"],
        ["= input vector", c.x0[i], ""],
        ["+ attention output", c.att[i], "layer norm, then mix of earlier words (heatmap below)"],
        ["= after attention", c.x1[i], "residual: added, not replaced"],
        ["+ feed-forward output", c.f[i], "layer norm, then a small neural net on this word alone"],
        ["= final vector", c.x2[i], "goes to layer norm × output matrix → a score per word"],
      ], mx = Math.max(...rows.flatMap((r) => r[1].map(Math.abs))) || 1, pr = view.probs[i], ord = pr.map((v, j) => [v, j]).sort((a, b) => b[0] - a[0]).slice(0, 3);
      const rowS = "display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;margin-bottom:6px", labS = (k) => `flex:0 0 170px;font-size:.85rem;${k % 2 === 0 ? "font-weight:600;color:var(--ink)" : "color:var(--muted)"}`, noteS = "flex:1 1 180px;margin:0;font-size:.78rem";
      $("#pipe").innerHTML = rows.map(([l, v, n], k) => `<div style="${rowS}"><div style="${labS(k)}">${l}</div>${strip(v, mx, d)}${n ? `<div class="hint" style="${noteS}">${n}</div>` : ""}</div>`).join("") +
        `<div style="${rowS}"><div style="${labS(0)}">= next-word probabilities</div><div style="font:.8rem var(--font-mono);flex:1 1 260px;max-width:340px">${ord.map(([v, j]) => `${W[j]} ${fmt(v * 100, 1)}%`).join(" · ")}</div><div class="hint" style="${noteS}">softmax at temperature ${fmt(view.tp, 1)}</div></div>` +
        `<p class="hint" style="margin:10px 0 0">Each cell is one of the ${d} numbers in the vector (blue positive, orange negative${d > 8 ? "; hover for values" : ""}). A real model's vectors have thousands.</p>`;
    }
    function d1() {
      if (!view) return; const { c, inp, i } = view, n = inp.length, g = P1.ctx; P1.resize(); P1.clear();
      const cw = P1.iw / n, ch = P1.ih / n, X = (j) => P1.pad.l + j * cw, Y = (r) => P1.pad.t + r * ch;
      g.font = "11px " + css("--font-body"); g.fillStyle = css("--ink");
      for (let r = 0; r < n; r++) { for (let j = 0; j < n; j++) {
        if (j > r) { g.fillStyle = css("--grid"); g.globalAlpha = 0.5; g.fillRect(X(j) + 1, Y(r) + 1, cw - 2, ch - 2); g.globalAlpha = 1; continue; }
        const w = c.w[r][j]; g.fillStyle = css("--accent"); g.globalAlpha = 0.06 + 0.94 * w; g.fillRect(X(j) + 1, Y(r) + 1, cw - 2, ch - 2); g.globalAlpha = 1;
        if (cw > 26 && w >= 0.1) { g.fillStyle = w > 0.55 ? css("--surface") : css("--ink"); g.textAlign = "center"; g.textBaseline = "middle"; g.font = "10px " + css("--font-mono"); g.fillText(Math.round(w * 100), X(j) + cw / 2, Y(r) + ch / 2); }
      } }
      g.strokeStyle = css("--warm"); g.lineWidth = 2; g.strokeRect(P1.pad.l, Y(i), cw * (i + 1), ch);
      g.fillStyle = css("--ink"); g.font = "11px " + css("--font-body"); g.textBaseline = "middle"; g.textAlign = "right";
      inp.forEach((t, r) => { g.font = (r === i ? "600 " : "") + "11px " + css("--font-body"); g.fillText(W[t], P1.pad.l - 5, Y(r) + ch / 2); });
      g.textAlign = "right"; inp.forEach((t, j) => { g.save(); g.translate(X(j) + cw / 2, P1.h - P1.pad.b + 6); g.rotate(-Math.PI / 4); g.font = "11px " + css("--font-body"); g.fillText(W[t], 0, 0); g.restore(); });
      const row = c.w[i], top = row.indexOf(Math.max(...row));
      $("#t1Cap").innerHTML = `Rows: the word doing the looking. Columns: earlier words it can see (grey: later words, hidden). Numbers are % weights. “${W[inp[i]]}” puts <b>${Math.round(row[top] * 100)}%</b> on “${W[inp[top]]}”${top === i ? " (itself)" : ""}.`;
    }
    function d2() {
      if (!view) return; const { probs, i, toks } = view, pr = probs[i], ord = pr.map((v, j) => [v, j]).sort((a, b) => b[0] - a[0]).slice(0, 9), g = P2.ctx, nxt = toks[i + 1];
      P2.resize(); P2.x = [0, 1]; P2.y = [0, ord.length]; P2.clear();
      P2.axes({ xLabel: "", yLabel: "", xTicks: [0, 0.25, 0.5, 0.75, 1], xFormat: (v) => Math.round(v * 100) + "%", yTicks: [] });
      const bh = P2.ih / ord.length;
      ord.forEach(([v, j], k) => { const y = P2.pad.t + k * bh; g.fillStyle = css(j === nxt ? "--good" : "--accent"); g.globalAlpha = j === nxt ? 1 : 0.7; g.fillRect(P2.sx(0), y + bh * 0.18, Math.max(1, P2.sx(v) - P2.sx(0)), bh * 0.64); g.globalAlpha = 1;
        g.fillStyle = css("--ink"); g.font = (j === nxt ? "600 " : "") + "11px " + css("--font-body"); g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(W[j], P2.pad.l - 6, y + bh / 2);
        g.textAlign = "left"; g.font = "10px " + css("--font-mono"); g.fillText(fmt(v * 100, v < 0.1 ? 1 : 0) + "%", P2.sx(v) + 4, y + bh / 2); });
      const H = -pr.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
      $("#t2Cap").innerHTML = `Top guesses after “${W[view.inp[i]]}”. Green: the word that really comes next (${fmt(pr[nxt] * 100, 1)}%). Uncertainty: ${fmt(H, 2)} bits (0 = certain, 4 = all 16 words equal).`;
    }
    function d3() {
      if (!view) return; const mx = Math.max(losses[0] * 1.05, 0.5); P3.resize(); P3.x = [0, STEPS]; P3.y = [0, mx]; P3.clear();
      P3.axes({ xLabel: "training step", yLabel: "loss (nats)", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 1), xCount: 4 });
      P3.path([0, STEPS], [FLOOR, FLOOR], css("--good"), 1.5, [5, 4]);
      P3.path(losses.map((_, j) => j), losses, css("--accent"), 2);
      P3.path([view.step, view.step], [0, mx], css("--warm"), 1.5); P3.dot(view.step, view.loss, 4.5, css("--warm"), css("--surface"));
      const done = losses.length > STEPS;
      $("#t3Cap").innerHTML = `${done ? "" : `<b>Training… step ${losses.length - 1}.</b> `}Orange: the step you're viewing, loss ${fmt(view.loss, 3)}. Green dashed: best possible, ${fmt(FLOOR, 3)}. Start: ${fmt(losses[0], 2)}, about ln 16 = 2.77, a uniform guess.`;
    }
    function pca(E) {
      const n = E.length, d = E[0].length, mu = Array.from({ length: d }, (_, j) => E.reduce((s, r) => s + r[j], 0) / n), X = E.map((r) => r.map((v, j) => v - mu[j]));
      const C = Array.from({ length: d }, (_, a) => Array.from({ length: d }, (_, b) => X.reduce((s, r) => s + r[a] * r[b], 0)));
      const pc = []; for (let k = 0; k < 2; k++) { let v = Array.from({ length: d }, (_, j) => Math.cos(j + k)); for (let it = 0; it < 80; it++) { let w = C.map((r) => r.reduce((s, x, j) => s + x * v[j], 0)); pc.forEach((u) => { const dt = w.reduce((s, x, j) => s + x * u[j], 0); w = w.map((x, j) => x - dt * u[j]); }); const nr = Math.hypot(...w) || 1; v = w.map((x) => x / nr); } pc.push(v); }
      return X.map((r) => pc.map((u) => r.reduce((s, x, j) => s + x * u[j], 0)));
    }
    function d4() {
      if (!view) return; const Z = pca(viewer.p.E), xs = Z.map((z) => z[0]), ys = Z.map((z) => z[1]), ex = (Math.max(...xs) - Math.min(...xs)) * 0.12 || 1, ey = (Math.max(...ys) - Math.min(...ys)) * 0.12 || 1;
      P4.resize(); P4.x = [Math.min(...xs) - ex, Math.max(...xs) + ex]; P4.y = [Math.min(...ys) - ey, Math.max(...ys) + ey]; P4.clear();
      const g = P4.ctx, grp = (w) => (ITEMS.includes(w) ? "--accent" : ["up", "down", "more", "less"].includes(w) ? "--warm" : "--muted");
      W.forEach((w, j) => { P4.dot(xs[j], ys[j], 4, css(grp(w))); g.fillStyle = css(grp(w) === "--muted" ? "--muted" : "--ink"); g.font = "11px " + css("--font-body"); g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(w, P4.sx(xs[j]) + 6, P4.sy(ys[j])); });
      $("#t4Cap").innerHTML = `Each word's ${view.d}-number embedding, projected onto its two main directions (PCA). Blue: items; orange: up/down/more/less. Words used the same way drift together during training; at step 0 the layout is random.`;
    }
    function work() {
      const { c, i, inp, probs, tp } = view, row = c.w[i], s = c.s[i], top = row.indexOf(Math.max(...row)), z = c.logit[i], ord = z.map((v, j) => [v, j]).sort((a, b) => b[0] - a[0]).slice(0, 3), m = Math.max(...z), tot = z.reduce((a, v) => a + Math.exp((v - m) / tp), 0), b = (t) => `<b style="color:var(--ink)">${t}</b>`;
      $("#work").innerHTML = [
        `Attention from “${W[inp[i]]}”: score = q·k / √${view.d}, then softmax over the ${i + 1} visible word${i ? "s" : ""}`,
        ...inp.slice(0, i + 1).map((t, j) => `&nbsp;&nbsp;${W[t].padEnd(7, " ")} score ${(s[j] >= 0 ? " " : "") + fmt(s[j], 2)} → weight ${j === top ? b(fmt(row[j], 3)) : fmt(row[j], 3)}`),
        `Output scores, top 3 of 16, divided by temperature ${fmt(tp, 1)}:`,
        ...ord.map(([v, j]) => `&nbsp;&nbsp;${W[j].padEnd(7, " ")} score ${fmt(v, 2)} → e^((${fmt(v, 2)} − ${fmt(m, 2)}) / ${fmt(tp, 1)}) = ${fmt(Math.exp((v - m) / tp), 3)} → ${fmt(Math.exp((v - m) / tp), 3)} / ${fmt(tot, 3)} = ${b(fmt(probs[i][j] * 100, 1) + "%")}`),
        `Loss for this word: −ln(p of “${W[view.toks[i + 1]]}”) = −ln(${fmt(c.p[i][view.toks[i + 1]], 3)}) = ${b(fmt(-Math.log(c.p[i][view.toks[i + 1]]), 3))} (at temperature 1, as in training)`,
      ].map((l) => `<div style="white-space:nowrap">${l}</div>`).join("");
    }
    function readouts() {
      const { loss, step, avg, probs, i, toks } = view, nw = Object.values(viewer.p).reduce((s, M) => s + M.length * M[0].length, 0), gap = loss - FLOOR;
      $("#ro").innerHTML = [
        ["Training step", `<span class="num">${step}</span>`],
        ["Loss (best possible " + fmt(FLOOR, 2) + ")", `<span class="pill ${gap < 0.02 ? "ok" : gap < 0.2 ? "warn" : "bad"}">${fmt(loss, 3)}</span>`],
        ["P(right next word), selected", `<span class="num">${fmt(probs[i][toks[i + 1]] * 100, 1)}%</span>`],
        ["P(right word), all sentences", `<span class="num">${fmt(avg * 100, 1)}%</span>`],
        ["Weights in the model", `<span class="num">${nw.toLocaleString()}</span>`],
      ].map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() {
      $("#posV").textContent = `${+$("#pos").value}: “${W[sentence(item, up)[+$("#pos").value]]}”`; $("#stV").textContent = $("#st").value + (losses.length <= STEPS ? ` (training: ${losses.length - 1})` : "");
      $("#tpV").textContent = fmt(+$("#tp").value, 1); $("#ddV").textContent = dOf();
    }
    function update() { if (!trainer) return; labels(); compute(); chips(); pipe(); d1(); d2(); d3(); d4(); work(); readouts(); }
    const seg = (id, f) => root.querySelectorAll(`#${id} button`).forEach((b) => b.addEventListener("click", () => { root.querySelectorAll(`#${id} button`).forEach((x) => x.setAttribute("aria-pressed", x === b)); f(b.dataset.v); update(); }));
    seg("it", (v) => (item = v)); seg("dir", (v) => (up = v === "up"));
    $("#st").addEventListener("input", () => { following = +$("#st").value >= (snaps.length - 1) * EVERY; update(); });
    ["pos", "tp"].forEach((id) => $("#" + id).addEventListener("input", update));
    $("#dd").addEventListener("input", start);
    $("#t1").addEventListener("click", (e) => { const r = $("#t1").getBoundingClientRect(), y = e.clientY - r.top, row = Math.floor((y - P1.pad.t) / (P1.ih / 9)); if (row >= 0 && row < 9) { $("#pos").value = row; update(); } });
    $("#retrain").addEventListener("click", () => { seed++; start(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 3; item = "milk"; up = true; root.querySelectorAll(".seg").forEach((sg) => sg.querySelectorAll("button").forEach((b, k) => b.setAttribute("aria-pressed", k === 0))); start(); });
    start();
    const stop = watch([$("#t1"), $("#t2"), $("#t3"), $("#t4")], () => { d1(); d2(); d3(); d4(); });
    return () => { job++; stop(); };
  },
});
