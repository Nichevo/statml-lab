Lab.register({
  id: "llm-sampling-rag",
  group: "Machine learning",
  title: "How chatbots pick words, and how they look things up (RAG)",
  blurb: "Turn the temperature, top-k and top-p dials on a model's next-word probabilities and watch the samples change. Then search a small policy handbook by meaning (embeddings) and by keywords, and see which documents a retrieval-augmented chatbot would read before answering.",
  lede: "A large language model does one thing over and over: it scores every possible next word, turns the scores into probabilities, and picks one. The dials you set in a chatbot (temperature, top-k, top-p) only change how that pick is made. To answer questions about your own documents, the usual trick is retrieval-augmented generation (RAG): turn each document into a list of numbers that captures its meaning (an embedding), find the ones closest to the question, and paste them into the prompt.",
  quiz: [
    ["What does temperature actually do?", "It divides every score (logit) by T before the softmax: pᵢ = e^(zᵢ/T) / Σ e^(zⱼ/T). T below 1 stretches the gaps, so the top word wins more often; T above 1 shrinks them, so unlikely words get picked more. T near 0 is greedy: always the top word."],
    ["Top-k versus top-p: what's the difference?", "Top-k keeps the k most likely words, whatever their probabilities. Top-p (nucleus sampling) keeps the smallest set whose probabilities add up to at least p, so it keeps few words when the model is sure and many when it isn't. Either way the kept probabilities are rescaled to sum to 1."],
    ["Why can embedding search find “running behind” when the document says “late”?", "The embedding model has learned that words used in similar places mean similar things, so “behind”, “late” and “delayed” point in a similar direction. Search compares directions (cosine similarity), not spellings."],
    ["Why keep keyword search at all?", "Embeddings are fuzzy about exact things: part numbers, order IDs, codes, names and numbers like “48 hours”. Keyword scores (like BM25) catch those. Hybrid search blends the two rankings, often with reciprocal rank fusion."],
    ["If RAG retrieves the wrong documents, what happens?", "The model answers from whatever it was given. A careful prompt tells it to say “I don't know”, but it may still guess from memory. That's why retrieval is tested on its own, with questions whose right document you know (hit rate at k)."],
    ["Why not just paste in 50 documents to be safe?", "Longer prompts cost more and run slower, and models use information in the middle of a long context less reliably. Irrelevant passages can also pull the answer off course. A few well-chosen chunks usually beat many."],
  ],
  diy: {
    intro: "Next-word scores (logits) in B2:B15 with the words in A2:A15; temperature in E1, k in E2, p in E3. For search: question vector in a row Q2:AE2, document vectors in rows Q5:AE16 (one per document).",
    steps: [
      ["Probabilities with temperature (softmax).", "C2: =EXP(B2/$E$1)/SUMPRODUCT(EXP($B$2:$B$15/$E$1))"],
      ["Top-k: keep a word only if its rank is k or better.", "D2: =IF(RANK(C2,$C$2:$C$15)<=$E$2, C2, 0)   then rescale: =D2/SUM($D$2:$D$15)"],
      ["Top-p: sort by probability (largest first), add up, keep a word if the total before it is still below p.", "E2: =SUM($C$2:C2)-C2   F2: =IF(E2<$E$3, C2, 0)   G2: =F2/SUM($F$2:$F$15)"],
      ["Draw a word: running total as the lower edge, then look up a random number.", "H2: =SUM($G$1:G1)   (H2 = 0)   word: =INDEX(A2:A15, MATCH(RAND(), H2:H15, 1))"],
      ["Cosine similarity between the question and each document.", "AG5: =SUMPRODUCT($Q$2:$AE$2, Q5:AE5)/SQRT(SUMSQ($Q$2:$AE$2)*SUMSQ(Q5:AE5))"],
      ["Retrieve the top k documents.", "=INDEX(docs, MATCH(LARGE($AG$5:$AG$16, 1), $AG$5:$AG$16, 0))   (then 2, 3, …)"],
      ["Reciprocal rank fusion for hybrid search.", "=1/(60+rank_by_meaning) + 1/(60+rank_by_keywords)"],
    ],
  },
  deeper: [
    ["Holtzman, Buys, Du, Forbes & Choi (2020), The curious case of neural text degeneration, ICLR", "https://arxiv.org/abs/1904.09751", "why pure sampling and greedy search both go wrong; introduces top-p"],
    ["Mikolov, Chen, Corrado & Dean (2013), Efficient estimation of word representations in vector space", "https://arxiv.org/abs/1301.3781", "word2vec: meaning as directions"],
    ["Reimers & Gurevych (2019), Sentence-BERT: sentence embeddings using Siamese BERT-networks, EMNLP", "https://arxiv.org/abs/1908.10084", "embeddings for whole sentences, the basis of semantic search"],
    ["Lewis et al. (2020), Retrieval-augmented generation for knowledge-intensive NLP tasks, NeurIPS", "https://arxiv.org/abs/2005.11401", "the RAG paper"],
    ["Karpukhin et al. (2020), Dense passage retrieval for open-domain question answering, EMNLP", "https://arxiv.org/abs/2004.04906", "embedding search beating BM25, and where it doesn't"],
    ["Liu et al. (2024), Lost in the middle: how language models use long contexts, TACL", "https://arxiv.org/abs/2307.03172", "why more retrieved text isn't always better"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="10" width="34" height="44" rx="3"/><path d="M12 20 H34 M12 28 H30 M12 36 H34 M12 44 H24" stroke-opacity=".6"/><path d="M44 32 H54"/><path d="M60 50 V40 M68 50 V22 M76 50 V32 M84 50 V44" stroke-width="5"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const TAGS = ["customs papers", "late container", "typhoon season", "damage on arrival", "returns", "supplier payment", "safety stock", "supplier audit", "port congestion", "duties", "broken pallets", "reorder point"];
    const PROMPT = "The container from Shanghai is late because of";
    const WD = [["congestion", 3.2], ["weather", 2.9], ["a", 2.6], ["the", 2.4], ["customs", 2.2], ["typhoon", 1.6], ["strikes", 1.4], ["port", 1.3], ["fog", 0.6], ["holidays", 0.5], ["paperwork", 0.4], ["aliens", -1.6], ["Tuesday", -2.2], ["bananas", -3.0]];
    const SILLY = new Set(["aliens", "Tuesday", "bananas"]);
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const box = (t, id) => `<div class="plot" style="padding:14px;min-width:0">${h4(t)}<div id="${id}"></div></div>`;
    const $ = (s) => root.querySelector(s);
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(fig("g1", "Part 1 · Next-word probabilities", 380, "Probability of each candidate next word before and after temperature, top-k and top-p"), box("20 draws from those probabilities", "samp"))}
        ${two(fig("g2", "Part 2 · The handbook as a map of meaning", 340, "Twelve handbook passages and the question placed by their embeddings"), box("Search results", "res"))}
        ${two(box("Part 3 · The prompt the chatbot actually gets", "prompt"), fig("g3", "Does the right passage get retrieved?", 300, "Share of ten test questions whose right passage is in the top k, for three search methods"))}`,
      panel: `
        <p class="hint" style="margin:0"><b>Part 1.</b> The model has read “${PROMPT} …” and scored 14 possible next words.</p>
        <div class="ctrl"><label for="T">Temperature <output id="TV"></output></label><input type="range" id="T" min="0.05" max="2" step="0.05" value="0.8"></div>
        <div class="ctrl"><label for="K">Top-k (keep this many words) <output id="KV"></output></label><input type="range" id="K" min="1" max="14" step="1" value="14"></div>
        <div class="ctrl"><label for="P">Top-p (keep words until they add up to) <output id="PV"></output></label><input type="range" id="P" min="0.05" max="1" step="0.01" value="0.9"></div>
        <div class="btns"><button class="btn" id="draw" type="button">Draw 20 again</button></div>
        <p class="hint" style="margin:10px 0 0"><b>Part 2.</b> Ask the 12-passage handbook a question.</p>
        <div class="ctrl"><label for="q">Question</label><select id="q" style="width:100%;font:inherit;padding:6px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink)"></select></div>
        <div class="ctrl"><label for="own">…or type your own</label><input type="text" id="own" placeholder="e.g. who signs off a new vendor?" style="width:100%;box-sizing:border-box;font:inherit;padding:6px 8px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink)"></div>
        <div class="ctrl"><label>Search by</label><div class="seg" id="meth"><button type="button" data-m="emb" aria-pressed="true">Meaning</button><button type="button" data-m="kw" aria-pressed="false">Keywords</button><button type="button" data-m="hyb" aria-pressed="false">Hybrid</button></div></div>
        <div class="ctrl"><label for="k">Passages pasted into the prompt (k) <output id="kV"></output></label><input type="range" id="k" min="1" max="5" step="1" value="2"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>A language model is a next-word guesser</h2>
          <p>Given the text so far, a model such as the <a href="#transformer">transformer</a> outputs one score (a <i>logit</i>) for every word in its vocabulary, usually 30,000 to 200,000 of them. The softmax turns scores into probabilities. Temperature T divides the scores first:</p>
          <div class="eq">pᵢ = e^(zᵢ / T) / Σⱼ e^(zⱼ / T)</div>
          <p>The chatbot draws one word, appends it, and runs the whole model again for the next word. A 300-word answer is 300 or so draws, so small changes in how each draw is made add up.</p>
        </section>
        <section>
          <h2>The three dials</h2>
          <ul>
            <li><b>Temperature.</b> Low (0 to 0.3) makes the answer nearly deterministic: good for extracting fields, classifying, writing code. Around 0.7 to 1 gives varied drafts. Above 1 the long tail of odd words starts to show up.</li>
            <li><b>Top-k.</b> Throw away everything except the k most likely words. Simple, but k = 40 is too many when the model is sure and maybe too few when it isn't.</li>
            <li><b>Top-p (nucleus).</b> Keep the smallest set of words that covers probability p. When one word has 95%, top-p 0.9 keeps just that word; when the model is unsure it keeps many. This adapts in a way top-k can't, which is why Holtzman et al. proposed it.</li>
          </ul>
          <p>The tail matters: 3 silly words with 0.5% each are harmless once, but over a 300-word answer the chance of at least one silly pick is 1 − (1 − 0.015)³⁰⁰ ≈ 99%. Cutting the tail with top-p or top-k is what stops that.</p>
        </section>
        <section>
          <h2>Embeddings: meaning as coordinates</h2>
          <p>An embedding model reads a passage and returns a fixed list of numbers, typically 384 to 3,072 of them. Passages about the same thing get similar lists, whatever words they use. Similarity is measured with the cosine of the angle between the two lists:</p>
          <div class="eq">cos(q, d) = Σ qᵢ dᵢ / (‖q‖ ‖d‖)</div>
          <p>1 means the same direction, 0 means unrelated. Here each passage gets 16 numbers. To keep them readable, 11 of them are named meanings (delay, customs, damage, …) set by hand for each word, and 5 are noise; a passage is the average of its words. Real models learn their numbers from billions of sentences and none of them has a name, but the search step is exactly this. Finding the nearest passages is the same job as <a href="#knn">k-nearest neighbours</a>.</p>
        </section>
        <section>
          <h2>Keyword search still earns its keep</h2>
          <p>Keyword scores count the words a question and a passage share, weighting rare words more (here ln(1 + N / df), a simple cousin of BM25). They fail on synonyms (“vendors” vs “suppliers”) but they're exact about numbers, codes, part numbers and names, which embeddings blur. Try the question about the 48-hour rule.</p>
          <p><b>Hybrid search</b> runs both and merges the rankings with <i>reciprocal rank fusion</i>: each passage scores 1/(60 + rank) from each list, and the scores are added. A passage near the top of either list rises.</p>
        </section>
        <section>
          <h2>RAG, step by step</h2>
          <ol>
            <li>Split your documents into chunks of a few hundred words.</li>
            <li>Embed each chunk once and store the vectors (a “vector database” is a store built for fast nearest-neighbour search).</li>
            <li>At question time, embed the question and retrieve the k nearest chunks (plus keyword hits, for hybrid).</li>
            <li>Paste them into the prompt with an instruction to answer only from them and cite them.</li>
            <li>The model writes the answer, drawing words as in part 1, usually at low temperature.</li>
          </ol>
          <p>Most RAG failures are retrieval failures: the right chunk never reached the prompt. Test retrieval on its own, as the chart does, with real questions whose right answer you know.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Raise the temperature to 2 with top-p at 1: silly words appear in the draws. Now set top-p to 0.9 and they vanish, even at T = 2.</li>
            <li>Drop the temperature to 0.05: every draw is “congestion”. That's greedy decoding.</li>
            <li>Pick “When do vendors get their money?” and switch to Keywords: no shared words, so nothing is found. Meaning finds supplier payment.</li>
            <li>Pick “What is the 48 hour rule?”: Meaning misses at k = 1, Keywords gets it, Hybrid gets it too.</li>
            <li>Type your own question using words like “border”, “factory”, “refund” or “truck”.</li>
          </ul>
        </section>`,
    });
    // ---------- embeddings (hand-made, readable) ----------
    const CON = ["delay", "customs", "damage", "returns", "payment", "stock", "supplier", "weather", "transport", "quality", "paperwork"], NZ = 5, DIM = CON.length + NZ;
    const LEX = {
      late: { delay: 1 }, delayed: { delay: 1 }, delay: { delay: 1 }, behind: { delay: 0.9 }, running: { delay: 0.3 }, slow: { delay: 0.8 }, eta: { delay: 0.6, transport: 0.4 }, days: { delay: 0.35 }, transit: { delay: 0.4, transport: 0.6 }, notify: { delay: 0.3 }, wait: { delay: 0.7 },
      customs: { customs: 1 }, duties: { customs: 0.8, payment: 0.4 }, duty: { customs: 0.8, payment: 0.4 }, tariffs: { customs: 0.8, payment: 0.4 }, tariff: { customs: 0.8, payment: 0.4 }, taxes: { customs: 0.7, payment: 0.5 }, tax: { customs: 0.7, payment: 0.5 }, import: { customs: 0.8, transport: 0.2 }, importer: { customs: 0.8, payment: 0.2 }, hs: { customs: 0.6, paperwork: 0.3 }, code: { customs: 0.4, paperwork: 0.4 }, release: { customs: 0.4 }, held: { customs: 0.5, delay: 0.5 }, border: { customs: 0.9 },
      damaged: { damage: 1 }, damage: { damage: 1 }, broken: { damage: 1 }, crushed: { damage: 1 }, dented: { damage: 1 }, photographed: { damage: 0.5, paperwork: 0.5 }, refused: { damage: 0.4, returns: 0.5 }, pallets: { transport: 0.5, damage: 0.3 }, boxes: { transport: 0.4, damage: 0.3 },
      returns: { returns: 1 }, return: { returns: 1 }, back: { returns: 0.6 }, send: { transport: 0.3, returns: 0.4 }, packaging: { returns: 0.4, damage: 0.3 }, accepted: { returns: 0.6 }, original: { returns: 0.3 }, refund: { returns: 0.7, payment: 0.5 },
      paid: { payment: 1 }, pay: { payment: 1 }, pays: { payment: 1 }, money: { payment: 0.9 }, invoices: { payment: 0.6, paperwork: 0.4 }, invoice: { payment: 0.6, paperwork: 0.4 }, charged: { payment: 0.9 }, cost: { payment: 0.8 }, terms: { payment: 0.5 },
      stock: { stock: 1 }, safety: { stock: 0.7 }, buffer: { stock: 0.9 }, inventory: { stock: 1 }, reorder: { stock: 0.9, supplier: 0.2 }, point: { stock: 0.3 }, demand: { stock: 0.7 }, service: { stock: 0.4 }, keep: { stock: 0.4 }, items: { stock: 0.4 }, weeks: { delay: 0.1, stock: 0.2 },
      supplier: { supplier: 1 }, vendors: { supplier: 1 }, vendor: { supplier: 1 }, factory: { supplier: 0.8 }, new: { supplier: 0.2 }, first: { supplier: 0.2 }, order: { stock: 0.5, supplier: 0.5 },
      typhoon: { weather: 1, delay: 0.2 }, storms: { weather: 1 }, storm: { weather: 1 }, weather: { weather: 1 }, season: { weather: 0.5, delay: 0.2 }, fog: { weather: 0.9 }, rain: { weather: 0.9 },
      shipment: { transport: 1 }, container: { transport: 1 }, port: { transport: 0.9 }, congestion: { transport: 0.6, delay: 0.6 }, unloading: { transport: 0.8 }, deliveries: { transport: 0.9 }, delivery: { transport: 0.8 }, dock: { transport: 0.6, damage: 0.2 }, arrival: { transport: 0.6 }, arrived: { transport: 0.6 }, transpacific: { transport: 0.8 }, asia: { transport: 0.5, weather: 0.1 }, china: { transport: 0.5 }, los: { transport: 0.3 }, angeles: { transport: 0.3 }, goods: { transport: 0.3, supplier: 0.2 }, truck: { transport: 0.9 },
      quality: { quality: 1 }, audit: { quality: 0.9, supplier: 0.3 }, pass: { quality: 0.4 }, defects: { quality: 0.8, damage: 0.4 }, checked: { quality: 0.7 },
      paperwork: { paperwork: 1 }, documents: { paperwork: 1 }, forms: { paperwork: 0.9 }, receipt: { paperwork: 0.6, payment: 0.3 }, noted: { paperwork: 0.6 }, reported: { paperwork: 0.6 }, need: { paperwork: 0.15 },
    };
    const STOP = new Set("the a an of to is are be do i we you what when who how our my and or if for with on in at by must should more than before after will from it its much long have has does their get now currently adding adds covers within this that there any can stuff so up".split(" "));
    const hash = (w, k) => { let h = 2166136261 ^ k; for (const c of w) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 5000 - 1; };
    const toks = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w)).map((w) => (LEX[w] || !w.endsWith("s") || !LEX[w.slice(0, -1)] ? w : w.slice(0, -1)));
    function wvec(w) {
      const v = new Array(DIM).fill(0), L = LEX[w];
      if (L) for (const c in L) v[CON.indexOf(c)] = L[c];
      for (let k = 0; k < NZ; k++) v[CON.length + k] = (L ? 0.12 : 0.45) * hash(w, k);
      return v;
    }
    function embed(s) { const v = new Array(DIM).fill(0); toks(s).forEach((w) => wvec(w).forEach((x, i) => (v[i] += x))); const n = Math.hypot(...v) || 1; return v.map((x) => x / n); }
    const DOCS = [
      "Shipments held at customs need a commercial invoice and HS code before release.",
      "If a container is late more than 5 days, notify the customer and give a new ETA.",
      "Typhoon season (July to October) adds 3 to 7 days to transpacific transit.",
      "Damaged goods must be photographed on arrival and reported within 48 hours.",
      "Returns are accepted within 30 days in the original packaging.",
      "Supplier invoices are paid 60 days after the goods are received.",
      "Safety stock for A items covers 2 weeks of demand at a 98% service level.",
      "New suppliers must pass a quality audit before the first order.",
      "Port congestion in Los Angeles is currently adding 4 days to unloading.",
      "Duties and tariffs are charged to the importer of record.",
      "Broken pallets should be refused at the dock and noted on the delivery receipt.",
      "Reorder point = demand during lead time + safety stock.",
    ];
    const QS = [
      ["What do I do when a shipment is running behind?", [1]],
      ["Who pays the import taxes?", [9]],
      ["Our boxes arrived crushed, what now?", [3, 10]],
      ["How long do we have to send stuff back?", [4]],
      ["When do vendors get their money?", [5]],
      ["Will storms slow down deliveries from Asia?", [2]],
      ["How much buffer inventory should we keep?", [6, 11]],
      ["What paperwork does customs need?", [0]],
      ["How many days does typhoon season add?", [2]],
      ["What is the 48 hour rule?", [3]],
    ];
    // Keyword search tokens: exact words and numbers, plural s removed.
    const ktoks = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
    const DV = DOCS.map(embed), dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
    const DT = DOCS.map((d) => new Set(ktoks(d))), DF = {}; DT.forEach((s) => s.forEach((w) => (DF[w] = (DF[w] || 0) + 1)));
    // 2D map: top two principal components of the passage vectors.
    const mean = DV[0].map((_, j) => DV.reduce((s, v) => s + v[j], 0) / DV.length);
    const pcs = []; {
      const C = DV.map((v) => v.map((x, j) => x - mean[j]));
      for (let c = 0; c < 2; c++) {
        let u = mean.map((_, j) => Math.sin(j + 1 + c * 3));
        for (let it = 0; it < 200; it++) {
          const s = C.map((r) => dot(r, u)); let w = u.map((_, j) => C.reduce((a, r, i) => a + r[j] * s[i], 0));
          pcs.forEach((p) => { const d = dot(w, p); w = w.map((x, j) => x - d * p[j]); });
          const n = Math.hypot(...w) || 1; u = w.map((x) => x / n);
        }
        pcs.push(u);
      }
    }
    // Then spread them out so map distances match the real 16-number distances as well as 2-D allows (MDS by gradient descent).
    const dist16 = (a, b) => Math.sqrt(Math.max(0, 2 - 2 * dot(a, b)));
    const DP = DV.map((v) => pcs.map((p) => dot(v.map((x, j) => x - mean[j]), p)));
    for (let it = 0; it < 600; it++) {
      const g = DP.map(() => [0, 0]);
      for (let i = 0; i < DP.length; i++) for (let j = 0; j < DP.length; j++) if (i !== j) { const dx = DP[i][0] - DP[j][0], dy = DP[i][1] - DP[j][1], d = Math.hypot(dx, dy) || 1e-6, e = (d - dist16(DV[i], DV[j])) / d; g[i][0] += e * dx; g[i][1] += e * dy; }
      DP.forEach((p, i) => { p[0] -= 0.02 * g[i][0]; p[1] -= 0.02 * g[i][1]; });
    }
    function proj(v) {
      const w = DV.map((d) => 1 + dot(v, d) * 4), W = w.reduce((a, b) => a + b, 0), p = [0, 1].map((c) => DP.reduce((s, q, i) => s + q[c] * w[i], 0) / W);
      for (let it = 0; it < 300; it++) { let gx = 0, gy = 0; DP.forEach((q, i) => { const dx = p[0] - q[0], dy = p[1] - q[1], d = Math.hypot(dx, dy) || 1e-6, e = (d - dist16(v, DV[i])) / d; gx += e * dx; gy += e * dy; }); p[0] -= 0.03 * gx; p[1] -= 0.03 * gy; }
      return p;
    }
    function search(q) {
      const qv = embed(q), cos = DV.map((d) => dot(qv, d)), qt = new Set(ktoks(q));
      const kw = DT.map((s) => [...qt].reduce((a, w) => a + (s.has(w) ? Math.log(1 + DOCS.length / DF[w]) : 0), 0));
      const rank = (sc, skip0) => { const r = new Array(sc.length).fill(Infinity); sc.map((x, i) => [x, i]).filter((p) => !skip0 || p[0] > 0).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach((p, j) => (r[p[1]] = j + 1)); return r; };
      const re = rank(cos, false), rk = rank(kw, true), hyb = DOCS.map((_, i) => 1 / (60 + re[i]) + (isFinite(rk[i]) ? 1 / (60 + rk[i]) : 0));
      const order = (sc, skip0) => sc.map((x, i) => [x, i]).filter((p) => !skip0 || p[0] > 0).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map((p) => p[1]);
      return { qv, cos, kw, hyb, qt, ord: { emb: order(cos, false), kw: order(kw, true), hyb: order(hyb, false) } };
    }
    const HITS = { emb: [], kw: [], hyb: [] }, MISS = { emb: [], kw: [], hyb: [] };
    QS.forEach(([q, g]) => { const S = search(q); for (const m in HITS) for (let k = 1; k <= 5; k++) { const h = S.ord[m].slice(0, k).some((i) => g.includes(i)); HITS[m][k] = (HITS[m][k] || 0) + (h ? 1 : 0); (MISS[m][k] = MISS[m][k] || []); if (!h) MISS[m][k].push(q); } });
    // ---------- sampling ----------
    function dist() {
      const T = +$("#T").value, K = +$("#K").value, Pp = +$("#P").value, z = WD.map((w) => w[1] / T), mx = Math.max(...z), e = z.map((x) => Math.exp(x - mx)), Z = e.reduce((a, b) => a + b, 0), p0 = e.map((x) => x / Z);
      const ord = p0.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]), keep = new Array(WD.length).fill(false);
      ord.slice(0, K).forEach((i) => (keep[i] = true));
      const zk = ord.slice(0, K).reduce((s, i) => s + p0[i], 0); let cum = 0;
      ord.slice(0, K).forEach((i) => { if (cum >= Pp - 1e-12) keep[i] = false; cum += p0[i] / zk; });
      const zz = p0.reduce((s, p, i) => s + (keep[i] ? p : 0), 0), p = p0.map((x, i) => (keep[i] ? x / zz : 0));
      return { T, K, Pp, e, Z, mx, p0, p, keep, ord };
    }
    let sseed = 11, method = "emb";
    const G1 = new Plot($("#g1"), { pad: { l: 84, r: 46, b: 38, t: 8 } }), G2 = new Plot($("#g2"), { pad: { l: 12, r: 12, t: 12, b: 26 } }), G3 = new Plot($("#g3"), { x: [0.8, 5.2], y: [0, 1.14], pad: { l: 46, b: 38 } });
    function d1() {
      const D = dist(), n = WD.length, mp = Math.max(...D.p, ...D.p0);
      G1.resize(); G1.x = [0, Math.min(1, mp * 1.12)]; G1.y = [0, n]; G1.clear(); G1.axes({ xLabel: "probability", xFormat: (v) => Math.round(v * 100) + "%", yTicks: [], xCount: 5 });
      const g = G1.ctx, bh = G1.ih / n;
      WD.forEach(([w], i) => {
        const y = G1.pad.t + i * bh, x0 = G1.sx(0);
        g.fillStyle = css("--muted"); g.globalAlpha = 0.25; g.fillRect(x0, y + bh * 0.18, Math.max(1, G1.sx(D.p0[i]) - x0), bh * 0.64); g.globalAlpha = 1;
        if (D.keep[i]) { g.fillStyle = css(SILLY.has(w) ? "--bad" : "--accent"); g.fillRect(x0, y + bh * 0.3, Math.max(1, G1.sx(D.p[i]) - x0), bh * 0.4); }
        g.fillStyle = css(D.keep[i] ? "--ink" : "--muted"); g.font = `${D.keep[i] ? "600 " : ""}12px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(w, G1.pad.l - 8, y + bh / 2);
        g.font = `10px ${css("--font-mono")}`; g.textAlign = "left"; g.fillStyle = css(D.keep[i] ? "--ink" : "--muted");
        const v = D.keep[i] ? D.p[i] : D.p0[i]; g.fillText(D.keep[i] ? (v < 0.001 ? "<0.1%" : fmt(v * 100, 1) + "%") : "cut", Math.min(G1.w - G1.pad.r - 30, G1.sx(Math.max(v, D.p0[i])) + 4), y + bh / 2);
      });
      const i = 1, ei = Math.exp(WD[i][1] / D.T), Zs = WD.reduce((s, w) => s + Math.exp(w[1] / D.T), 0);
      $("#g1Cap").innerHTML = `Grey: probabilities after temperature only. Coloured: what's left after top-k and top-p, rescaled to add up to 1 (red: nonsense words). Worked: “weather” has score 2.9, so e<sup>2.9/${fmt(D.T, 2)}</sup> = ${ei > 1e6 ? ei.toExponential(2) : fmt(ei, 2)}; the 14 words add up to ${Zs > 1e6 ? Zs.toExponential(2) : fmt(Zs, 2)}; ${fmt(D.p0[i] * 100, 1)}% before the cuts, ${fmt(D.p[i] * 100, 1)}% after.`;
      return D;
    }
    function samples(D) {
      const r = rng(sseed), cum = []; let c = 0; D.p.forEach((p) => { c += p; cum.push(c); });
      const out = Array.from({ length: 20 }, () => { const u = r() * c; let j = cum.findIndex((x) => x > u); if (j < 0) j = D.ord[0]; return WD[j][0]; });
      const tally = {}; out.forEach((w) => (tally[w] = (tally[w] || 0) + 1));
      $("#samp").innerHTML = `<p style="margin:0 0 8px;color:var(--muted)">“${PROMPT} <b style="color:var(--ink)">___</b>”</p><div style="display:flex;flex-wrap:wrap;gap:5px">${out.map((w) => `<span style="padding:3px 9px;border-radius:999px;font-size:.85rem;border:1px solid ${SILLY.has(w) ? "var(--bad)" : "var(--line)"};background:${SILLY.has(w) ? "color-mix(in srgb, var(--bad) 14%, var(--surface))" : "var(--accent-soft)"}">${w}</span>`).join("")}</div>
        <p class="hint" style="margin:10px 0 0">Tally: ${Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ×${n}`).join(", ")}. ${D.keep.filter(Boolean).length === 1 ? "Only one word survives, so every draw is the same." : "Each draw is independent, so the same settings give a different 20 every time."}</p>`;
      return out;
    }
    function query() { const t = $("#own").value.trim(); return t || QS[+$("#q").value][0]; }
    function gold() { return $("#own").value.trim() ? null : QS[+$("#q").value][1]; }
    function d2(S) {
      const k = +$("#k").value, top = S.ord[method].slice(0, k), qp = proj(S.qv), all = [...DP, qp], xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
      const mx = (a) => [Math.min(...a), Math.max(...a)], [x0, x1] = mx(xs), [y0, y1] = mx(ys), px = (x1 - x0) * 0.12, py = (y1 - y0) * 0.12;
      G2.resize(); G2.x = [x0 - px, x1 + px]; G2.y = [y0 - py, y1 + py]; G2.clear(); G2.axes({ xTicks: [], yTicks: [], xLabel: "a 2-D shadow of 16 dimensions" });
      const g = G2.ctx, gd = gold() || [];
      top.forEach((i) => G2.path([qp[0], DP[i][0]], [qp[1], DP[i][1]], css("--warm"), 1.5, [4, 3]));
      const L = DP.map((p, i) => ({ i, x: G2.sx(p[0]), y: G2.sy(p[1]), right: G2.sx(p[0]) < G2.w * 0.6 }));
      [true, false].forEach((side) => { const grp = L.filter((l) => l.right === side).sort((a, c) => a.y - c.y); grp.forEach((l, r) => { l.ly = r ? Math.max(l.y, grp[r - 1].ly + 13) : l.y; }); const over = grp.length ? grp[grp.length - 1].ly - (G2.h - G2.pad.b - 4) : 0; if (over > 0) grp.forEach((l) => (l.ly -= over)); });
      const sx = G2.sx(qp[0]), sy = G2.sy(qp[1]); g.beginPath(); for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + (j * Math.PI) / 5, r = j % 2 ? 4 : 10; g.lineTo(sx + r * Math.cos(a), sy + r * Math.sin(a)); } g.closePath(); g.fillStyle = css("--warm"); g.fill(); g.strokeStyle = css("--surface"); g.lineWidth = 1.5; g.stroke();
      L.forEach((l) => {
        const i = l.i, on = top.includes(i); G2.dot(DP[i][0], DP[i][1], on ? 7 : 5, on ? css("--accent") : css("--surface"), on ? css("--surface") : css("--muted"));
        const tx = l.x + (l.right ? 10 : -10); if (Math.abs(l.ly - l.y) > 3) { g.strokeStyle = css("--grid"); g.lineWidth = 1; g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(tx, l.ly); g.stroke(); }
        g.font = `${on ? "600 " : ""}11px ${css("--font-body")}`; g.fillStyle = css(on ? "--ink" : "--muted"); g.textAlign = l.right ? "left" : "right"; g.textBaseline = "middle";
        const t = `${i + 1} ${TAGS[i]}${gd.includes(i) ? " ✓" : ""}`; g.strokeStyle = css("--surface"); g.lineWidth = 3; g.lineJoin = "round"; g.strokeText(t, tx, l.ly); g.fillText(t, tx, l.ly);
      });
      const b = S.ord.emb[0], parts = S.qv.map((x, j) => [x * DV[b][j], j]).sort((a, c) => Math.abs(c[0]) - Math.abs(a[0])).slice(0, 3);
      const nm = (j) => (j < CON.length ? CON[j] : "noise " + (j - CON.length + 1));
      $("#g2Cap").innerHTML = `Star: your question. Dots: the 12 passages (filled: pasted into the prompt; ✓: the right passage). Nearby on the map roughly means similar meaning, but the scores are worked out in all 16 numbers. Closest by meaning is #${b + 1}: cos = Σ qᵢdᵢ = ${parts.map(([v, j]) => `${fmt(S.qv[j], 2)}×${fmt(DV[b][j], 2)} (${nm(j)})`).join(" + ")} + … = <b>${fmt(S.cos[b], 3)}</b> (both lists have length 1).`;
    }
    function results(S) {
      const k = +$("#k").value, gd = gold(), ord = S.ord[method], sc = { emb: S.cos, kw: S.kw, hyb: S.hyb }[method], lab = { emb: "cosine", kw: "keyword score", hyb: "fused score" }[method];
      const qtop = S.qv.slice(0, CON.length).map((x, j) => [x, j]).filter((p) => p[0] > 0.05).sort((a, b) => b[0] - a[0]).slice(0, 4);
      const kws = [...S.qt].filter((w) => DF[w]);
      const rows = ord.slice(0, 5).map((i, r) => `<tr style="border-top:1px solid var(--line);${r < k ? "background:var(--accent-soft)" : "opacity:.6"}"><td style="padding:4px 6px;font-family:var(--font-mono);white-space:nowrap">${r + 1}. #${i + 1}</td><td style="padding:4px 6px;font-family:var(--font-mono);text-align:right">${fmt(sc[i], 3)}</td><td style="padding:4px 6px">${esc(DOCS[i])}${gd && gd.includes(i) ? ' <b style="color:var(--good)">✓</b>' : ""}</td></tr>`).join("");
      $("#res").innerHTML = `<p style="margin:0 0 6px"><b>“${esc(query())}”</b></p>
        <p class="hint" style="margin:0 0 8px">As meaning: ${qtop.length ? qtop.map(([x, j]) => `${CON[j]} ${fmt(x, 2)}`).join(", ") : "no words it knows, only noise"}. As keywords: ${S.qt.size ? [...S.qt].map((w) => (DF[w] ? `<b>${w}</b>` : w)).join(", ") : "none"}${kws.length ? " (bold: found in the handbook)" : " (none found in the handbook)"}.</p>
        <div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:.82rem;width:100%"><thead><tr style="color:var(--muted);text-align:left"><th style="padding:3px 6px">rank</th><th style="padding:3px 6px;text-align:right">${lab}</th><th style="padding:3px 6px">passage</th></tr></thead><tbody>${rows || `<tr><td colspan="3" style="padding:6px;color:var(--bad)">No passage shares a keyword with the question.</td></tr>`}</tbody></table></div>`;
    }
    function prompt(S) {
      const k = +$("#k").value, top = S.ord[method].slice(0, k), gd = gold(), hit = gd ? top.some((i) => gd.includes(i)) : null;
      const txt = `Answer the question using only the sources below, and cite them. If they don't contain the answer, say you don't know.\n\n${top.map((i, j) => `[${j + 1}] ${DOCS[i]}`).join("\n") || "(no sources found)"}\n\nQuestion: ${query()}`;
      const tok = Math.round(txt.split(/\s+/).length * 1.3);
      $("#prompt").innerHTML = `<pre style="margin:0;white-space:pre-wrap;font:.8rem/1.5 var(--font-mono);background:var(--accent-soft);padding:10px;border-radius:8px">${esc(txt)}</pre>
        <p style="margin:10px 0 0">${hit === null ? `<span class="pill warn">Typed question</span> No answer key for typed questions: read the sources and judge whether they answer it.` : hit ? `<span class="pill ok">The answer is in the sources</span> A good model answers and cites it.` : `<span class="pill bad">The answer isn't in the sources</span> A careful model says it doesn't know; a careless one answers from memory or makes something up.`}</p>
        <p class="hint" style="margin:6px 0 0">About ${tok} tokens. Each extra passage adds cost and, in long prompts, more text for the model to wade through.</p>`;
      return hit;
    }
    function d3() {
      const k = +$("#k").value;
      G3.resize(); G3.clear(); G3.axes({ xLabel: "passages retrieved (k)", yLabel: "questions with the right passage", xTicks: [1, 2, 3, 4, 5], xFormat: (v) => String(v), yTicks: [0, 0.2, 0.4, 0.6, 0.8, 1], yFormat: (v) => Math.round(v * 100) + "%" });
      const M = [["emb", "--accent", "Meaning"], ["kw", "--warm", "Keywords"], ["hyb", "--violet", "Hybrid"]], g = G3.ctx;
      const lab = M.map(([m], j) => [G3.sy(HITS[m][5] / QS.length + (j - 1) * 0.008) - 5, j]).sort((a, b) => a[0] - b[0]), LY = [];
      lab.forEach(([y, j], r) => { LY[j] = r ? Math.max(y, LY[lab[r - 1][1]] + 13) : y; });
      G3.path([k, k], [0, 1.14], css("--muted"), 1, [4, 4]);
      M.forEach(([m, c, n], j) => {
        const ys = [1, 2, 3, 4, 5].map((x) => HITS[m][x] / QS.length + (j - 1) * 0.008);
        G3.path([1, 2, 3, 4, 5], ys, css(c), m === method ? 3 : 1.5, null, m === method ? 1 : 0.6);
        [1, 2, 3, 4, 5].forEach((x, i) => G3.dot(x, ys[i], m === method ? 4 : 2.5, css(c)));
        g.font = `${m === method ? "600 " : ""}11px ${css("--font-body")}`; g.fillStyle = css(c); g.textAlign = "right"; g.textBaseline = "bottom"; g.fillText(n, G3.sx(5) - 6, Math.max(LY[j], G3.pad.t + 26));
      });
      const ms = (m) => (MISS[m][k].length ? `misses ${MISS[m][k].length > 2 ? MISS[m][k].length + " questions, e.g. " : ""}${MISS[m][k].slice(0, MISS[m][k].length > 2 ? 1 : 2).map((q) => `“${q}”`).join(" and ")}` : "misses none");
      $("#g3Cap").innerHTML = `Ten test questions with known right passages; dashed line at k = ${k}. Meaning ${HITS.emb[k]}/10 (${ms("emb")}). Keywords ${HITS.kw[k]}/10 (${ms("kw")}): it only returns passages that share a word, so a bigger k doesn't help. Hybrid ${HITS.hyb[k]}/10 (${ms("hyb")}).`;
    }
    function readouts(D, hit) {
      const silly = WD.reduce((s, w, i) => s + (SILLY.has(w[0]) ? D.p[i] : 0), 0), H = -D.p.reduce((s, p) => s + (p > 0 ? p * Math.log(p) : 0), 0), k = +$("#k").value;
      const in300 = 1 - Math.pow(1 - silly, 300);
      $("#ro").innerHTML = [
        ["Top word's chance", `<span class="num">${fmt(Math.max(...D.p) * 100, 1)}%</span>`],
        ["Nonsense word, one draw", `<span class="pill ${silly > 0.001 ? "bad" : "ok"}">${silly < 0.0001 && silly > 0 ? "<0.01%" : fmt(silly * 100, 2) + "%"}</span>`],
        ["At least one in a 300-word answer", `<span class="pill ${in300 > 0.1 ? "bad" : in300 > 0.01 ? "warn" : "ok"}">${fmt(in300 * 100, in300 < 0.01 ? 2 : 0)}%</span>`],
        ["Words in play (e^entropy)", `<span class="num">${fmt(Math.exp(H), 1)}</span>`],
        [`Right passage in top ${k} (10 questions)`, `<span class="num">${HITS[method][k]}/10</span>`],
        ["This question", hit === null ? `<span class="pill warn">no key</span>` : `<span class="pill ${hit ? "ok" : "bad"}">${hit ? "found" : "missed"}</span>`],
      ].map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { $("#TV").textContent = fmt(+$("#T").value, 2); $("#KV").textContent = +$("#K").value === 14 ? "14 (off)" : $("#K").value; $("#PV").textContent = +$("#P").value >= 1 ? "1 (off)" : fmt(+$("#P").value, 2); $("#kV").textContent = $("#k").value; }
    function draw() { labels(); const D = d1(); samples(D); const S = search(query()); d2(S); results(S); const hit = prompt(S); d3(); readouts(D, hit); }
    $("#q").innerHTML = QS.map(([q], i) => `<option value="${i}">${esc(q)}</option>`).join("");
    ["T", "K", "P", "k"].forEach((id) => $("#" + id).addEventListener("input", draw));
    $("#q").addEventListener("change", () => { $("#own").value = ""; draw(); });
    $("#own").addEventListener("input", draw);
    root.querySelectorAll("#meth button").forEach((b) => b.addEventListener("click", () => { method = b.dataset.m; root.querySelectorAll("#meth button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); }));
    $("#draw").addEventListener("click", () => { sseed++; draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); $("#q").value = "0"; $("#own").value = ""; method = "emb"; root.querySelectorAll("#meth button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.m === "emb")); sseed = 11; draw(); });
    draw();
    return watch([$("#g1"), $("#g2"), $("#g3")], () => draw());
  },
});
