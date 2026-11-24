Lab.register({
  id: "attention",
  group: "Machine learning",
  title: "Attention, the heart of a transformer",
  blurb: "Click a word and see which other words it 'looks at', with every dot product and softmax weight worked out.",
  lede: "A transformer lets every word gather information from the other words in the sentence. Each word asks a question (its query), every word offers a label (its key), and the better they match the more that word's content (its value) gets mixed in. This page uses tiny hand-made vectors so you can read every number.",
  quiz: [
    ["Why divide by √d before the softmax?", "Dot products of long vectors get large, which pushes the softmax to put nearly all weight on one word and makes gradients tiny. Dividing by √d keeps the scores in a sensible range."],
    ["What do the query, key and value play?", "The query is what this word is looking for, each key is what a word offers to be matched on, and the value is the information it passes on if chosen. Attention weights come from query·key; the output is the weighted average of values."],
    ["What does softmax do to the scores?", "Exponentiates and normalises them so they're positive and sum to 1: a set of weights. Bigger scores get disproportionately more weight."],
    ["Why use several attention heads?", "Each head has its own Q, K and V projections, so different heads can track different relationships (who did what, what an adjective describes) at the same time."],
  ],
  diy: {
    intro: "A toy example with 4 words and d = 3. Query vectors in B2:D5, key vectors in F2:H5, value vectors in J2:L5 (one word per row).",
    steps: [
      ["Scores: each query against each key (4 × 4 matrix), scaled by √d.", "N2: =MMULT(B2:D5,TRANSPOSE(F2:H5))/SQRT(3)"],
      ["Softmax across each row: exponentiate, then divide by the row total. Subtracting the row max first avoids overflow.", "S2: =EXP(N2-MAX($N2:$Q2))/SUM(EXP($N2:$Q2-MAX($N2:$Q2)))   (fill to V5)"],
      ["Check each row of weights sums to 1.", "=SUM(S2:V2)"],
      ["Output for each word: weights × values.", "X2: =MMULT(S2:V5,J2:L5)"],
      ["In a real model Q, K and V come from the word embeddings (E) times learned matrices.", "Q: =MMULT(E,WQ)   K: =MMULT(E,WK)   V: =MMULT(E,WV)"],
      ["Causal (decoder) attention: set scores for later words to a very negative number before softmax, so words only attend backwards.", "=IF(COLUMN()-COLUMN($N2)>ROW()-ROW(N$2),-1E9,score)"],
    ],
  },
  deeper: [
    ["Vaswani et al. (2017), Attention is all you need, arXiv:1706.03762", "https://arxiv.org/abs/1706.03762", "the transformer paper"],
    ["Bahdanau, Cho & Bengio (2014), Neural machine translation by jointly learning to align and translate, arXiv:1409.0473", "https://arxiv.org/abs/1409.0473", "where attention began"],
    ["Alammar, The illustrated transformer", "https://jalammar.github.io/illustrated-transformer/", "step-by-step pictures"],
    ["3Blue1Brown, Attention in transformers, visually explained", "https://www.3blue1brown.com/lessons/attention", "video walkthrough"],
    ["Jurafsky & Martin, Speech and Language Processing, ch. 9: Transformers (free draft)", "https://web.stanford.edu/~jurafsky/slp3/", "textbook treatment"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor"><rect x="6" y="6" width="16" height="8" rx="2"/><rect x="6" y="28" width="16" height="8" rx="2"/><rect x="6" y="50" width="16" height="8" rx="2"/><rect x="74" y="6" width="16" height="8" rx="2" opacity=".5"/><rect x="74" y="28" width="16" height="8" rx="2" opacity=".5"/><rect x="74" y="50" width="16" height="8" rx="2" opacity=".5"/></g><path d="M22 32 L74 10" stroke-width="4"/><path d="M22 32 L74 32" opacity=".5"/><path d="M22 32 L74 54" opacity=".25"/></svg>`,

  mount(root) {
    const { watch, css } = Lab;
    const DIMS = ["living thing", "place / object", "action", "describes"];
    // Hand-set vectors. In a real model these come from learned matrices: q = x·W_Q, k = x·W_K, v = x·W_V.
    const base = [
      ["The",     [1, 1, 0, 0],   [0, 0, 0, 0.3]],
      ["animal",  [0, 0, 1.5, 0.5], [3, 0, 0, 0]],
      ["didn't",  [1, 0, 1, 0],   [0, 0, 1.5, 0]],
      ["cross",   [1, 1, 0, 0],   [0, 0, 2, 0]],
      ["the",     [1, 1, 0, 0],   [0, 0, 0, 0.3]],
      ["street",  [0, 0, 1, 0],   [0, 3, 0, 0]],
      ["because", [0, 0, 1, 0],   [0, 0, 0.5, 0]],
      ["it",      null,           [0.5, 0.5, 0, 0]],
      ["was",     [0.5, 0.5, 0, 1], [0, 0, 1, 0]],
      ["too",     [0, 0, 0, 2],   [0, 0, 0, 1]],
    ];
    const SENT = {
      tired: { last: ["tired", [1.5, 0, 0, 0], [0.5, 0, 0, 2]], itQ: [2, 0.3, 0, 0] },
      wide: { last: ["wide", [0, 1.5, 0, 0], [0, 0.5, 0, 2]], itQ: [0.3, 2, 0, 0] },
    };

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot">
          <canvas id="atc" style="aspect-ratio: 4 / 3.4" aria-label="Lines from the chosen word to every word, thicker for more attention"></canvas>
          <figcaption>Click a word on the left. Line thickness and the percentages show how its attention is split across the words on the right.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Worked example for <span id="focusName" style="color:var(--accent)"></span></h4>
          <div style="overflow-x:auto"><table id="work" style="width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums"></table></div>
          <p class="hint" style="margin-top:10px">Output vector: the attention-weighted blend of every value vector. This is what the word carries into the next layer.</p>
          <div id="outv" style="display:grid;gap:6px;margin-top:8px"></div>
        </div>
        <figure class="plot">
          <canvas id="atm" style="aspect-ratio: 1 / 1" aria-label="Full attention matrix"></canvas>
          <figcaption>The full attention matrix. Row = the word doing the looking; column = the word being looked at. Each row adds up to 100%.</figcaption>
        </figure>`,
      panel: `
        <div class="ctrl">
          <label for="sent">Sentence ending</label>
          <select id="sent"><option value="tired">… because it was too tired</option><option value="wide">… because it was too wide</option></select>
        </div>
        <div class="ctrl">
          <label for="temp">Temperature <output id="tempV"></output></label>
          <input type="range" id="temp" min="0.2" max="3" step="0.1" value="1">
          <p class="hint">Divides the scores before softmax. Low = picky, high = spread out.</p>
        </div>
        <label class="check"><input type="checkbox" id="mask"> Causal mask (only look backwards)</label>
        <div>
          <h4>Vectors for <span id="focusName2"></span></h4>
          <div class="readouts num" id="vecs" style="font-size:.8rem"></div>
        </div>
        <p class="hint">Dimensions: ${DIMS.map((d, i) => `<b>${i + 1}</b> ${d}`).join(", ")}.</p>`,
      notes: `
        <section>
          <h2>The recipe</h2>
          <ol>
            <li><b>Score</b> every pair: the dot product of my query with your key. A big number means "you have what I'm looking for".</li>
            <li><b>Scale</b> by √d (here d = 4, so divide by 2) to stop scores growing with vector size.</li>
            <li><b>Softmax</b> each row so the weights are positive and add up to 1.</li>
            <li><b>Blend</b> the value vectors using those weights.</li>
          </ol>
          <div class="eq">Attention(Q, K, V) = softmax(Q·Kᵀ / √d) · V</div>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Click <b>it</b>. With "tired" it attends mostly to <b>animal</b>. Switch the ending to "wide" and it shifts to <b>street</b>. Same pronoun, different meaning, decided by context.</li>
            <li>Drop the temperature to 0.3. Softmax becomes nearly a hard choice of one word. Raise it to 3 and attention smears across everything.</li>
            <li>Turn on the causal mask. Each word can only see itself and earlier words, which is how a chatbot model generates text one word at a time.</li>
          </ol>
        </section>
        <section>
          <h2>What is simplified here</h2>
          <ul>
            <li>Real vectors have hundreds of dimensions with no human-readable names, and they are learned, not set by hand.</li>
            <li>The query for <b>it</b> already "knows" about tired or wide. In a real model that information arrives from earlier attention layers. A transformer stacks dozens of these layers.</li>
            <li>Real models run many attention "heads" in parallel, each free to look for a different kind of relationship, and add position information so word order matters.</li>
          </ul>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let focus = 7; // "it"
    let toks = [];

    function build() {
      const s = SENT[$("#sent").value];
      toks = base.map(([w, q, k]) => ({ w, q: q || s.itQ, k, v: k }));
      toks.push({ w: s.last[0], q: s.last[1], k: s.last[2], v: s.last[2] });
    }
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

    function weights(i) {
      const T = +$("#temp").value, masked = $("#mask").checked;
      const raw = toks.map((t) => dot(toks[i].q, t.k));
      const sc = raw.map((r) => r / 2);
      const z = sc.map((s, j) => (masked && j > i ? -Infinity : s / T));
      const m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), S = e.reduce((a, b) => a + b, 0);
      return { raw, sc, w: e.map((v) => v / S) };
    }

    function drawLines() {
      const c = $("#atc"), g = c.getContext("2d"), r = c.getBoundingClientRect(), d = devicePixelRatio || 1;
      c.width = r.width * d; c.height = r.height * d; g.setTransform(d, 0, 0, d, 0, 0);
      const W = r.width, H = r.height, n = toks.length, rowH = (H - 16) / n;
      const bw = Math.min(110, W * 0.26), xl = 8, xr = W - 8 - bw;
      const yAt = (i) => 8 + rowH * i + rowH / 2;
      const { w } = weights(focus);
      g.clearRect(0, 0, W, H);
      g.lineCap = "round";
      toks.forEach((_, j) => {
        if (w[j] < 0.003) return;
        g.strokeStyle = css("--accent"); g.globalAlpha = 0.15 + 0.85 * w[j];
        g.lineWidth = 1 + 14 * w[j];
        g.beginPath(); g.moveTo(xl + bw, yAt(focus));
        g.bezierCurveTo(W / 2, yAt(focus), W / 2, yAt(j), xr, yAt(j)); g.stroke();
      });
      g.globalAlpha = 1;
      g.font = `13px ${css("--font-body")}`; g.textBaseline = "middle";
      toks.forEach((t, i) => {
        const bh = Math.min(26, rowH - 4);
        g.fillStyle = i === focus ? css("--accent") : css("--bg");
        g.strokeStyle = css("--line"); g.lineWidth = 1;
        g.beginPath(); g.roundRect(xl, yAt(i) - bh / 2, bw, bh, 5); g.fill(); g.stroke();
        g.fillStyle = i === focus ? css("--surface") : css("--ink"); g.textAlign = "center";
        g.fillText(t.w, xl + bw / 2, yAt(i));
        g.fillStyle = css("--bg"); g.beginPath(); g.roundRect(xr, yAt(i) - bh / 2, bw, bh, 5); g.fill(); g.stroke();
        g.fillStyle = css("--accent"); g.globalAlpha = 0.25;
        g.fillRect(xr + 1, yAt(i) - bh / 2 + 1, (bw - 2) * w[i], bh - 2); g.globalAlpha = 1;
        g.fillStyle = css("--ink"); g.textAlign = "left"; g.fillText(t.w, xr + 8, yAt(i));
        g.fillStyle = css("--muted"); g.textAlign = "right"; g.font = `11px ${css("--font-mono")}`;
        g.fillText((w[i] * 100).toFixed(0) + "%", xr + bw - 6, yAt(i)); g.font = `13px ${css("--font-body")}`;
      });
      g.fillStyle = css("--muted"); g.font = `11px ${css("--font-mono")}`; g.textBaseline = "top";
      c._hit = { xl, bw, yAt, rowH, n };
    }

    function drawMatrix() {
      const c = $("#atm"), g = c.getContext("2d"), r = c.getBoundingClientRect(), d = devicePixelRatio || 1;
      c.width = r.width * d; c.height = r.height * d; g.setTransform(d, 0, 0, d, 0, 0);
      const W = r.width, n = toks.length, lab = Math.min(70, W * 0.18), cell = (W - lab - 8) / n;
      const a = css("--accent");
      g.clearRect(0, 0, W, r.height);
      g.font = `${Math.max(9, Math.min(12, cell * 0.45))}px ${css("--font-body")}`;
      for (let i = 0; i < n; i++) {
        const { w } = weights(i);
        for (let j = 0; j < n; j++) {
          g.fillStyle = a; g.globalAlpha = 0.06 + 0.94 * w[j];
          g.fillRect(lab + j * cell + 1, lab + i * cell + 1, cell - 2, cell - 2);
          g.globalAlpha = 1;
          if (cell > 26 && w[j] >= 0.1) {
            g.fillStyle = w[j] > 0.5 ? css("--surface") : css("--ink"); g.textAlign = "center"; g.textBaseline = "middle";
            g.fillText(Math.round(w[j] * 100), lab + (j + 0.5) * cell, lab + (i + 0.5) * cell);
          }
        }
        if (i === focus) { g.strokeStyle = css("--warm"); g.lineWidth = 2; g.strokeRect(lab, lab + i * cell, n * cell, cell); }
      }
      g.fillStyle = css("--ink"); g.textBaseline = "middle"; g.textAlign = "right";
      toks.forEach((t, i) => g.fillText(t.w, lab - 6, lab + (i + 0.5) * cell));
      toks.forEach((t, j) => {
        g.save(); g.translate(lab + (j + 0.5) * cell, lab - 6); g.rotate(-Math.PI / 3);
        g.textAlign = "left"; g.fillText(t.w, 0, 0); g.restore();
      });
    }

    function drawWork() {
      const t = toks[focus], { raw, sc, w } = weights(focus), masked = $("#mask").checked;
      $("#focusName").textContent = `"${t.w}"`; $("#focusName2").textContent = `"${t.w}"`;
      const f = (v) => `[${v.map((x) => x.toFixed(1)).join(", ")}]`;
      $("#vecs").innerHTML = `<div class="ro"><span>query q</span><span>${f(t.q)}</span></div><div class="ro"><span>key k</span><span>${f(t.k)}</span></div><div class="ro"><span>value v</span><span>${f(t.v)}</span></div>`;
      const th = `style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted)"`;
      const td = `style="white-space:nowrap;text-align:right;padding:4px 6px;border-bottom:1px solid var(--grid);font-family:var(--font-mono)"`;
      $("#work").innerHTML = `<tr><th ${th.replace("right", "left")}>key word</th><th ${th}>key k</th><th ${th}>q·k</th><th ${th}>÷ √4</th><th ${th}>weight</th><th ${th.replace("style=\"", "style=\"width:28%;")}></th></tr>` +
        toks.map((k, j) => `<tr style="${j === focus ? "background:var(--accent-soft)" : ""}">
          <td style="padding:4px 6px;border-bottom:1px solid var(--grid)">${k.w}</td>
          <td ${td}>${f(k.k)}</td>
          <td ${td}>${raw[j].toFixed(2)}</td>
          <td ${td}>${masked && j > focus ? "masked" : sc[j].toFixed(2)}</td>
          <td ${td}><b>${(w[j] * 100).toFixed(1)}%</b></td>
          <td style="padding:4px 6px;border-bottom:1px solid var(--grid)"><div style="height:8px;border-radius:3px;background:var(--accent);width:${w[j] * 100}%"></div></td></tr>`).join("");
      const out = [0, 0, 0, 0];
      toks.forEach((k, j) => k.v.forEach((v, d) => (out[d] += w[j] * v)));
      const mx = Math.max(3, ...out);
      $("#outv").innerHTML = out.map((v, d) => `<div style="display:grid;grid-template-columns:110px 1fr 44px;gap:8px;align-items:center;font-size:.82rem">
        <span>${DIMS[d]}</span><div class="meter"><div style="width:${(v / mx) * 100}%;background:var(--violet)"></div></div><span class="num">${v.toFixed(2)}</span></div>`).join("");
    }

    function draw() {
      $("#tempV").textContent = (+$("#temp").value).toFixed(1);
      drawLines(); drawMatrix(); drawWork();
    }

    $("#atc").addEventListener("pointerdown", (e) => {
      const h = $("#atc")._hit; if (!h) return;
      const r = $("#atc").getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (x > h.xl + h.bw + 20) return;
      const i = Math.floor((y - 8) / h.rowH);
      if (i >= 0 && i < h.n) { focus = i; draw(); }
    });
    $("#atc").style.cursor = "pointer";
    $("#atm").addEventListener("pointerdown", (e) => {
      const r = $("#atm").getBoundingClientRect(), W = r.width, n = toks.length, lab = Math.min(70, W * 0.18), cell = (W - lab - 8) / n;
      const i = Math.floor((e.clientY - r.top - lab) / cell);
      if (i >= 0 && i < n) { focus = i; draw(); }
    });
    $("#sent").addEventListener("change", () => { build(); draw(); });
    ["#temp", "#mask"].forEach((s) => $(s).addEventListener("input", draw));

    build(); draw();
    return watch([$("#atc"), $("#atm")], () => draw());
  },
});
