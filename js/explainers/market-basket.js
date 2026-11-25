Lab.register({
  id: "market-basket",
  group: "Machine learning",
  title: "Market basket analysis: which products sell together?",
  blurb: "2,000 shopping baskets. Find the products bought together with the Apriori algorithm, read support, confidence and lift on a worked 2×2 table, and see why a high-confidence rule can mean nothing and a sky-high lift on a rare pair can be noise.",
  lede: "Market basket analysis looks for items that appear in the same basket more often than chance. Three numbers describe a rule like {pasta} → {pasta sauce}: support (how often both are bought), confidence (of the baskets with pasta, the share that also have sauce) and lift (how much more likely sauce is when pasta is in the basket than in general). Lift is the one that matters: confidence can be high just because the second item is in nearly every basket. Apriori finds the frequent combinations without checking every possible one.",
  quiz: [
    ["Out of 2,000 baskets, 300 contain pasta, 250 contain sauce, and 200 contain both. Work out support, confidence and lift for pasta → sauce.", "Support = 200/2,000 = 10%. Confidence = 200/300 = 67%. Lift = 0.67 / (250/2,000) = 0.67 / 0.125 = 5.3: buying pasta makes sauce 5.3 times as likely."],
    ["The rule {bananas} → {milk} has 48% confidence. Why might it be useless?", "If 45% of all baskets contain milk anyway, lift is 0.48/0.45 ≈ 1.07. Bananas tell you almost nothing about milk; milk is just popular."],
    ["Why does Apriori only extend frequent itemsets?", "If {chips, dip} is rare, any basket with {chips, dip, soda} also has {chips, dip}, so the bigger set is rarer still. So you never need to count supersets of infrequent sets. This prunes most of the search."],
    ["A rule between two rare items shows lift 12 from 3 baskets. Should you act on it?", "Not yet. With so few baskets the lift is very noisy; set a minimum support (or count) and check it on more data. Rare-item rules are the most often spurious."],
    ["What can you do with a strong rule like {chips} → {dip}?", "Place them together or apart (to pull shoppers through the store), bundle or cross-promote, and, in forecasting, expect a chips promotion to lift dip sales too: a halo effect, the opposite of cannibalisation."],
  ],
  diy: {
    intro: "One row per basket, one column per product (B:O), 1 if bought, 0 if not. Rows 2–2001.",
    steps: [
      ["Support of one item (column B = pasta).", "=AVERAGE(B2:B2001)"],
      ["Support of a pair (pasta and sauce in column C).", "=SUMPRODUCT(B2:B2001, C2:C2001)/ROWS(B2:B2001)"],
      ["Confidence of pasta → sauce.", "=SUMPRODUCT(B2:B2001, C2:C2001)/SUM(B2:B2001)"],
      ["Lift.", "=confidence / AVERAGE(C2:C2001)"],
      ["All pairs at once: a co-occurrence matrix with MMULT.", "=MMULT(TRANSPOSE(B2:O2001), B2:O2001)   (diagonal = item counts)"],
    ],
  },
  deeper: [
    ["Agrawal, Imieliński & Swami (1993), Mining association rules between sets of items in large databases, SIGMOD", "https://doi.org/10.1145/170035.170072", "the paper that introduced association rules"],
    ["Agrawal & Srikant (1994), Fast algorithms for mining association rules, VLDB", "https://www.vldb.org/conf/1994/P487.PDF", "the Apriori algorithm"],
    ["Tan, Kumar & Srivastava (2004), Selecting the right objective measure for association analysis, Information Systems 29(4)", "https://doi.org/10.1016/S0306-4379(03)00072-3", "lift, leverage, conviction and others compared"],
    ["Hastie, Tibshirani & Friedman, The Elements of Statistical Learning, section 14.2", "https://hastie.su.domains/ElemStatLearn/", "association rules and their pitfalls, free PDF"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 22 H82 L74 54 H22 Z"/><path d="M30 22 L40 6 M66 22 L56 6"/><circle cx="36" cy="38" r="5"/><circle cx="60" cy="38" r="5"/><path d="M41 38 H55" stroke-dasharray="3 2"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const IT = ["Milk", "Bread", "Butter", "Eggs", "Coffee", "Bananas", "Pasta", "Pasta sauce", "Parmesan", "Chips", "Dip", "Soda", "Beer", "Nappies"], K = IT.length;
    const BASE = [0.42, 0.22, 0.06, 0.08, 0.08, 0.28, 0.04, 0.03, 0.02, 0.08, 0.02, 0.1, 0.08, 0.008];
    const MISSIONS = [[0.25, { 1: 0.8, 2: 0.55, 3: 0.55, 4: 0.3 }], [0.15, { 6: 0.9, 7: 0.75, 8: 0.35 }], [0.12, { 9: 0.9, 10: 0.6, 11: 0.65, 12: 0.45 }], [0.05, { 13: 0.95, 12: 0.25, 0: 0.6 }]];
    let seed = 3, sel = [6, 7];
    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(fig("c1", "Lift for every pair (tap a cell)", 330, "Heatmap of lift between each pair of products"), `<div class="plot" style="padding:14px;min-width:0">${h4("The rule, worked")}<div id="box"></div></div>`)}
        <div style="height:14px"></div>
        ${two(fig("c2", "Every rule: confidence vs support", 270, "Scatter of rules by support and confidence, sized by lift"), fig("c3", "How Apriori saves work", 270, "Bars of possible, candidate and frequent itemsets by size"))}
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4("Strongest rules (tap a row)")}<div id="tbl"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Simulated baskets from a grocery store. Hidden shopping "missions" (breakfast, pasta night, a party, baby supplies) make some products go together; the rest are bought independently.</p>
        <div class="ctrl"><label for="n">Baskets <output id="nV"></output></label><input type="range" id="n" min="100" max="5000" step="100" value="2000"></div>
        <div class="ctrl"><label for="ms">Minimum support <output id="msV"></output></label><input type="range" id="ms" min="0.002" max="0.1" step="0.002" value="0.01"></div>
        <div class="ctrl"><label for="mc">Minimum confidence <output id="mcV"></output></label><input type="range" id="mc" min="0.05" max="0.9" step="0.05" value="0.3"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">New baskets</button><button class="btn" id="milk" type="button">Show a misleading rule</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>The three numbers</h2>
          <ul>
            <li><b>Support</b>(A and B) = baskets with both / all baskets. How common the combination is; rules on tiny support are noise.</li>
            <li><b>Confidence</b>(A → B) = baskets with both / baskets with A. The chance of B given A.</li>
            <li><b>Lift</b>(A → B) = confidence / support(B) = P(A and B) / (P(A) P(B)). 1 means independent; above 1, bought together more than chance; below 1, less (substitutes, like two brands of the same thing).</li>
          </ul>
          <p>Lift is symmetric (A → B and B → A have the same lift); confidence isn't. Watch for the milk trap: any rule pointing to a very common item has high confidence and lift near 1.</p>
        </section>
        <section>
          <h2>Apriori</h2>
          <ol>
            <li>Count single items; keep those above minimum support.</li>
            <li>Build candidate pairs only from frequent items; count; keep the frequent ones.</li>
            <li>Build triples only from frequent pairs whose every sub-pair is frequent; and so on.</li>
            <li>From each frequent itemset, form rules and keep those above minimum confidence.</li>
          </ol>
          <p>With thousands of products the saving is enormous. Modern variants (FP-growth) avoid even generating candidates.</p>
        </section>
        <section>
          <h2>Using it</h2>
          <p>Store layout and cross-promotion; bundles; recommendations ("often bought with"); and forecasting: a promotion on chips lifts dip too (halo), the mirror image of <a href="#promo-regression">cannibalisation</a>. Rules show association, not cause: see <a href="#correlation-traps">correlation traps</a>. For grouping whole customers rather than products, see <a href="#pca-clustering">clustering</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Tap the pasta / pasta sauce cell: lift is far above 1, and the 2×2 table shows why.</li>
            <li>Press "Show a misleading rule": bananas → milk has decent confidence, but lift is about 1. Milk is in so many baskets that any rule ending in milk looks confident.</li>
            <li>Find nappies and beer: a real but modest lift, from a small number of baskets (the old retail legend, here built in on purpose).</li>
            <li>Drop baskets to 200 and minimum support to 0.002: rules between rare items appear with huge lifts from a handful of baskets. Press New baskets and they change: noise.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ n: +$("#n").value, ms: +$("#ms").value, mc: +$("#mc").value });
    let B, cnt, M;
    function sim(p) {
      const r = rng(seed); B = new Uint32Array(p.n);
      for (let b = 0; b < p.n; b++) { let m = 0; const pr = [...BASE]; MISSIONS.forEach(([q, items]) => { if (r() < q) Object.entries(items).forEach(([i, v]) => (pr[i] = 1 - (1 - pr[i]) * (1 - v))); }); for (let i = 0; i < K; i++) if (r() < pr[i]) m |= 1 << i; if (!m) m = 1 << Math.floor(r() * K); B[b] = m; }
      const memo = new Map(); cnt = (mask) => { if (memo.has(mask)) return memo.get(mask); let c = 0; for (let b = 0; b < B.length; b++) if ((B[b] & mask) === mask) c++; memo.set(mask, c); return c; };
    }
    const bits = (m) => { const o = []; for (let i = 0; i < K; i++) if (m & (1 << i)) o.push(i); return o; };
    const name = (m) => bits(m).map((i) => IT[i]).join(", ");
    const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };
    function apriori(p) {
      const N = B.length, minC = Math.ceil(p.ms * N), levels = []; let freq = []; for (let i = 0; i < K; i++) if (cnt(1 << i) >= minC) freq.push(1 << i);
      levels.push({ k: 1, all: K, cand: K, freq: freq.length }); const allFreq = [...freq];
      for (let k = 2; k <= 3 && freq.length; k++) { const fs = new Set(freq), cand = new Set();
        for (let a = 0; a < freq.length; a++) for (let b = a + 1; b < freq.length; b++) { const u = freq[a] | freq[b]; if (bits(u).length !== k || cand.has(u)) continue; if (bits(u).every((i) => fs.has(u & ~(1 << i)))) cand.add(u); }
        freq = [...cand].filter((m) => cnt(m) >= minC); levels.push({ k, all: choose(K, k), cand: cand.size, freq: freq.length }); allFreq.push(...freq); }
      const rules = []; allFreq.filter((m) => bits(m).length >= 2).forEach((m) => bits(m).forEach((c) => { const a = m & ~(1 << c), sAB = cnt(m) / N, sA = cnt(a) / N, sB = cnt(1 << c) / N, conf = sAB / sA; if (conf >= p.mc) rules.push({ a, c, sAB, conf, lift: conf / sB, n: cnt(m) }); }));
      rules.sort((x, y) => y.lift - x.lift);
      return { levels, rules, minC };
    }
    const C1 = new Plot($("#c1"), { pad: { l: 78, b: 78, t: 6, r: 6 } }), C2 = new Plot($("#c2"), { pad: { l: 56, b: 38 } }), C3 = new Plot($("#c3"), { pad: { l: 56, b: 38 } });
    let cells = [];
    const liftCol = (l) => { if (!isFinite(l)) return css("--line"); const t = Math.max(-1, Math.min(1, Math.log2(l) / 2.5)); return t >= 0 ? `color-mix(in srgb, ${css("--accent")} ${Math.round(t * 85)}%, ${css("--surface")})` : `color-mix(in srgb, ${css("--warm")} ${Math.round(-t * 85)}%, ${css("--surface")})`; };
    function pairLift(i, j) { const N = B.length, a = cnt(1 << i), b = cnt(1 << j), ab = cnt((1 << i) | (1 << j)); return a && b ? (ab * N) / (a * b) : NaN; }
    function d1() {
      C1.resize(); C1.clear(); const g = C1.ctx, s = Math.min(C1.iw, C1.ih) / K; cells = [];
      for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) { const x = C1.pad.l + j * s, y = C1.pad.t + i * s; if (i === j) { g.fillStyle = css("--line"); g.globalAlpha = 0.4; g.fillRect(x, y, s - 1, s - 1); g.globalAlpha = 1; continue; } const l = pairLift(i, j); g.fillStyle = liftCol(l); g.fillRect(x, y, s - 1, s - 1); cells.push([i, j, x, y, s]);
        if ((i === sel[0] && j === sel[1]) || (i === sel[1] && j === sel[0])) { g.strokeStyle = css("--ink"); g.lineWidth = 2; g.strokeRect(x + 1, y + 1, s - 3, s - 3); } }
      g.fillStyle = css("--ink"); g.font = `${Math.min(11, s * 0.55)}px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "middle"; IT.forEach((n, i) => g.fillText(n, C1.pad.l - 4, C1.pad.t + (i + 0.5) * s));
      IT.forEach((n, j) => { g.save(); g.translate(C1.pad.l + (j + 0.5) * s, C1.pad.t + K * s + 4); g.rotate(-Math.PI / 3); g.textAlign = "right"; g.fillText(n, 0, 0); g.restore(); });
      $("#c1Cap").innerHTML = `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px"><span style="width:12px;height:10px;background:${liftCol(4)}"></span>bought together more than chance</span><span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px"><span style="width:12px;height:10px;background:${liftCol(0.4)}"></span>less than chance</span><span style="display:inline-flex;align-items:center;gap:5px"><span style="width:12px;height:10px;background:${liftCol(1)};border:1px solid var(--line)"></span>about 1 (independent)</span>`;
    }
    function box() {
      const N = B.length, [i, j] = sel, a = cnt(1 << i), b = cnt(1 << j), ab = cnt((1 << i) | (1 << j)), an = a - ab, nb = b - ab, nn = N - a - b + ab;
      const conf = ab / a, lift = (conf * N) / b, exp = (a * b) / N, cell = (v, hl) => `<td style="padding:6px 8px;text-align:right;${hl ? "background:color-mix(in srgb, var(--accent) 18%, transparent);font-weight:600" : ""}">${v}</td>`;
      $("#box").innerHTML = `<p style="margin:0 0 8px;font-weight:600">{${IT[i]}} → {${IT[j]}}</p>
        <table style="border-collapse:collapse;font:.82rem var(--font-mono);width:100%"><thead><tr style="color:var(--muted)"><th></th><th style="padding:4px 8px;text-align:right">${IT[j]}</th><th style="padding:4px 8px;text-align:right">no ${IT[j]}</th><th style="padding:4px 8px;text-align:right">total</th></tr></thead><tbody>
        <tr style="border-top:1px solid var(--line)"><td style="padding:6px 8px">${IT[i]}</td>${cell(ab, true)}${cell(an)}${cell(a)}</tr>
        <tr style="border-top:1px solid var(--line)"><td style="padding:6px 8px">no ${IT[i]}</td>${cell(nb)}${cell(nn)}${cell(N - a)}</tr>
        <tr style="border-top:1px solid var(--line)"><td style="padding:6px 8px">total</td>${cell(b)}${cell(N - b)}${cell(N)}</tr></tbody></table>
        <div style="display:grid;gap:4px;margin-top:10px;font-size:.88rem">
          <div>Support = ${ab} / ${N} = <b>${fmt((ab / N) * 100, 1)}%</b></div>
          <div>Confidence = ${ab} / ${a} = <b>${fmt(conf * 100, 1)}%</b></div>
          <div>Lift = ${fmt(conf * 100, 1)}% / (${b} / ${N} = ${fmt((b / N) * 100, 1)}%) = <b>${fmt(lift, 2)}</b></div>
          <div class="hint" style="margin:0">If the two were unrelated you'd expect ${fmt(exp, 1)} baskets with both; there are ${ab}. ${ab < 10 ? "<b>Very few baskets: treat this lift with caution.</b>" : lift > 1.5 ? `${IT[j]} is ${fmt(lift, 1)}× as likely when ${IT[i]} is in the basket.` : lift < 0.8 ? "They're bought together less than chance." : "Lift near 1: knowing one tells you little about the other."}</div></div>`;
    }
    function d2(A) {
      const R = A.rules; C2.resize(); C2.x = [0, Math.max(0.05, ...R.map((r) => r.sAB)) * 1.1]; C2.y = [0, 1]; C2.clear(); C2.axes({ xLabel: "support", yLabel: "confidence", xFormat: (v) => fmt(v * 100, 0) + "%", yFormat: (v) => fmt(v * 100, 0) + "%", xCount: 5 });
      R.forEach((r) => { const on = r.a === 1 << sel[0] && r.c === sel[1]; C2.dot(r.sAB, r.conf, Math.min(9, 2 + Math.sqrt(r.lift) * 1.6), on ? css("--ink") : liftCol(r.lift), on ? css("--ink") : css("--muted")); });
      $("#c2Cap").innerHTML = `${R.length} rules pass minimum support ${fmt(A.minC, 0)} baskets and confidence ${fmt(+$("#mc").value * 100, 0)}%. Bigger, bluer dots have higher lift. High confidence alone (top) isn't enough: several confident rules have lift near 1.`;
    }
    function d3(A) {
      const L = A.levels; C3.resize(); C3.x = [0.4, L.length + 0.6]; C3.y = [0, Math.max(...L.map((l) => l.all)) * 1.12]; C3.clear(); C3.axes({ xLabel: "itemset size", yLabel: "itemsets", xTicks: L.map((l) => l.k), xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const g = C3.ctx, w = (C3.sx(1) - C3.sx(0)) * 0.24;
      L.forEach((l) => { [[l.all, "--line", -1], [l.cand, "--warm", 0], [l.freq, "--accent", 1]].forEach(([v, c, o]) => { g.fillStyle = css(c); g.globalAlpha = 0.85; g.fillRect(C3.sx(l.k) + o * w - w / 2, C3.sy(v), w - 2, C3.sy(0) - C3.sy(v)); g.globalAlpha = 1; g.fillStyle = css("--ink"); g.font = `10px ${css("--font-mono")}`; g.textAlign = "center"; g.textBaseline = "bottom"; g.fillText(v, C3.sx(l.k) + o * w - 1, C3.sy(v) - 2); }); });
      const tot = L.reduce((s, l) => s + l.all, 0), done = L.reduce((s, l) => s + l.cand, 0);
      $("#c3Cap").innerHTML = `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px"><span style="width:12px;height:10px;background:var(--line)"></span>possible</span><span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px"><span style="width:12px;height:10px;background:var(--warm)"></span>counted by Apriori</span><span style="display:inline-flex;align-items:center;gap:5px"><span style="width:12px;height:10px;background:var(--accent)"></span>frequent</span><br>Apriori counted ${done} itemsets instead of all ${tot} up to size ${L.length}.`;
    }
    function tbl(A) {
      const R = A.rules.slice(0, 15), N = B.length;
      $("#tbl").innerHTML = R.length ? `<table style="border-collapse:collapse;font:.8rem var(--font-mono);width:100%;min-width:560px"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 6px;text-align:left">if basket has</th><th style="padding:3px 6px;text-align:left">then also</th><th style="padding:3px 6px">baskets</th><th style="padding:3px 6px">support</th><th style="padding:3px 6px">confidence</th><th style="padding:3px 6px">lift</th></tr></thead><tbody>` +
        R.map((r, k) => `<tr data-k="${k}" style="cursor:pointer;text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 6px;text-align:left;font-family:var(--font-body)">${name(r.a)}</td><td style="padding:3px 6px;text-align:left;font-family:var(--font-body)">${IT[r.c]}</td><td style="padding:3px 6px">${r.n}</td><td style="padding:3px 6px">${fmt(r.sAB * 100, 1)}%</td><td style="padding:3px 6px">${fmt(r.conf * 100, 0)}%</td><td style="padding:3px 6px"><span class="pill ${r.n < 10 ? "warn" : "ok"}">${fmt(r.lift, 2)}</span></td></tr>`).join("") + `</tbody></table><p class="hint" style="margin:8px 0 0">Amber lift: fewer than 10 baskets behind it. Rules with two items on the left come from frequent triples (this page stops at three items).</p>` : `<p class="hint" style="margin:0">No rules pass these thresholds. Lower the minimum support or confidence.</p>`;
      $("#tbl").querySelectorAll("tr[data-k]").forEach((tr) => tr.addEventListener("click", () => { const r = R[+tr.dataset.k], a = bits(r.a); sel = [a[a.length - 1], r.c]; draw(); }));
    }
    function readouts(A) {
      const N = B.length, avg = Array.from(B).reduce((s, m) => s + bits(m).length, 0) / N;
      $("#ro").innerHTML = [["Baskets / average items", `${N} / ${fmt(avg, 1)}`], ["Frequent itemsets", A.levels.map((l) => `${l.freq}`).join(" + ")], ["Rules found", A.rules.length], ["Selected lift", fmt(pairLift(sel[0], sel[1]), 2)]].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function labels(p) { $("#nV").textContent = p.n.toLocaleString(); $("#msV").textContent = `${fmt(p.ms * 100, 1)}% (${Math.ceil(p.ms * p.n)} baskets)`; $("#mcV").textContent = fmt(p.mc * 100, 0) + "%"; }
    function draw() { const p = P(); labels(p); const A = apriori(p); d1(); box(); d2(A); d3(A); tbl(A); readouts(A); }
    ["n"].forEach((id) => $("#" + id).addEventListener("input", () => { sim(P()); draw(); }));
    ["ms", "mc"].forEach((id) => $("#" + id).addEventListener("input", draw));
    $("#c1").addEventListener("click", (e) => { const b = $("#c1").getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, hit = cells.find(([, , cx, cy, s]) => x >= cx && x < cx + s && y >= cy && y < cy + s); if (hit) { sel = [hit[0], hit[1]]; draw(); } });
    $("#resim").addEventListener("click", () => { seed++; sim(P()); draw(); });
    $("#milk").addEventListener("click", () => { sel = [5, 0]; draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 3; sel = [6, 7]; sim(P()); draw(); });
    sim(P()); draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
