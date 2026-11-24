Lab.register({
  id: "benford",
  group: "Data quality",
  title: "Benford's law: checking first digits",
  blurb: "In many real-world numbers, 1 is the first digit about 30% of the time and 9 under 5%. Data that break the pattern may be made up, duplicated or capped. Paste your own numbers and test them.",
  lede: "Take every invoice amount in a year's ledger and look at the first digit. You might expect each digit from 1 to 9 to turn up equally often. They don't: about 30% start with 1, 18% with 2, down to under 5% starting with 9. This is Benford's law, and it holds for most data that span several orders of magnitude and grow by percentages: invoice values, order quantities across SKUs, populations, stock prices. Auditors use it to spot invented numbers, because people making numbers up spread the first digits far too evenly.",
  quiz: [
    ["What share of numbers should start with 1 under Benford's law?", "log₁₀(1 + 1/1) = log₁₀ 2 ≈ 30.1%. In general P(d) = log₁₀(1 + 1/d), falling to 4.6% for 9."],
    ["Why does Benford's law happen?", "On a log scale, the stretch from 1 to 2 is as wide as from 2 to 4 and much wider than from 8 to 9. Data spread evenly on a log scale across several orders of magnitude (anything that grows by percentages) land in the 1s more often."],
    ["Your data are adult heights in cm. Should they follow Benford?", "No. They span a narrow range (roughly 150–200), so almost every value starts with 1. Benford only applies to data that cover several orders of magnitude without hard limits."],
    ["The 4s and 9s are low and the 5s are high in an expense claim file. What might be going on?", "A pattern like that often means rounding or a policy threshold: claims bunched just under an approval limit (e.g. $500), or people rounding to nice numbers. It's a reason to look, not proof of fraud."],
    ["Your test says 'nonconforming' on 50,000 invoices but the bars look almost identical. Why?", "With huge samples the chi-square test flags tiny, harmless differences. That's why auditors use the mean absolute deviation (MAD) of the proportions, which doesn't grow with sample size, with Nigrini's cut-offs."],
  ],
  diy: {
    intro: "Put your amounts in A2:A5001 (positive numbers; drop zeros and negatives first, or use ABS).",
    steps: [
      ["First digit of each number. Works for decimals like 0.042 too.", "B2: =INT(A2/10^INT(LOG10(A2)))"],
      ["Digits 1 to 9 in D2:D10, then count how often each appears.", "D2: 1   (down to 9 in D10)\nE2: =COUNTIF($B$2:$B$5001,D2)"],
      ["Observed share and Benford's expected share.", "F2: =E2/SUM($E$2:$E$10)\nG2: =LOG10(1+1/D2)"],
      ["Mean absolute deviation (Nigrini). Under 0.006 close conformity, 0.006–0.012 acceptable, 0.012–0.015 marginal, above 0.015 nonconforming.", "H2: =ABS(F2-G2)\n=AVERAGE(H2:H10)"],
      ["Chi-square test with 8 degrees of freedom. A small p-value says the digits differ from Benford; on big files it flags trivial differences.", "I2: =(E2-SUM($E$2:$E$10)*G2)^2/(SUM($E$2:$E$10)*G2)\n=CHISQ.DIST.RT(SUM(I2:I10),8)"],
      ["Per-digit z-score (with continuity correction) to see which digit is out of line. |z| above 1.96 is notable.", "J2: =(ABS(F2-G2)-1/(2*SUM($E$2:$E$10)))/SQRT(G2*(1-G2)/SUM($E$2:$E$10))"],
      ["Chart F (observed) as columns and G (Benford) as a line against D.", "Insert > Combo chart: F2:F10 clustered column, G2:G10 line"],
    ],
  },
  deeper: [
    ["Benford (1938), The law of anomalous numbers, Proc. American Philosophical Society 78(4)", "https://www.jstor.org/stable/984802", "the paper that gave the law its name"],
    ["Newcomb (1881), Note on the frequency of use of the different digits in natural numbers, AJM 4(1)", "https://doi.org/10.2307/2369148", "the first observation, from worn log tables"],
    ["Hill (1995), A statistical derivation of the significant-digit law, Statistical Science 10(4)", "https://doi.org/10.1214/ss/1177009869", "why mixtures of distributions produce Benford"],
    ["Nigrini, Benford's Law: Applications for Forensic Accounting, Auditing, and Fraud Detection (Wiley, 2012)", "https://doi.org/10.1002/9781119203094", "the practitioner's textbook, source of the MAD cut-offs"],
    ["Berger & Hill, Benford Online Bibliography", "https://www.benfordonline.net/", "a searchable list of over a thousand papers"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><g fill="currentColor" opacity=".45"><rect x="8" y="10" width="7" height="46"/><rect x="18" y="29" width="7" height="27"/><rect x="28" y="37" width="7" height="19"/><rect x="38" y="41" width="7" height="15"/><rect x="48" y="44" width="7" height="12"/><rect x="58" y="46" width="7" height="10"/><rect x="68" y="48" width="7" height="8"/><rect x="78" y="49" width="7" height="7"/></g><path d="M11 10 C 22 30, 40 42, 82 49" stroke-dasharray="3 3"/></svg>`,

  mount(root) {
    const { Plot, watch, css, rng } = Lab;
    let seed = 11, src = "invoices";
    const BEN = [0, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => Math.log10(1 + 1 / d))];
    const SRC = {
      invoices: ["Invoices", "A year of supplier invoices, from small consumables to large capital items."],
      skus: ["SKU volumes", "Annual units sold per SKU across a catalogue: a few runners, many slow movers."],
      narrow: ["Narrow range", "Unit prices of one product line that all sit between $20 and $60. Benford does not apply."],
      paste: ["Paste your own", "Paste numbers from Excel (one per line, or separated by commas or spaces)."],
    };

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="bf" aria-label="Bar chart of observed first-digit shares with Benford's expected shares as a line"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>Observed share</span><span><i style="background:var(--warm)"></i>Benford's law</span><span><i style="background:var(--bad)"></i>Digit with |z| &gt; 1.96</span></div>
          <figcaption>Share of numbers starting with each digit.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 class="bf-h">By digit</h4>
          <div style="overflow-x:auto"><table id="tbl" class="bf-t"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 class="bf-h">Worked out</h4>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>
        <style>.bf-h{margin:0 0 12px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .bf-t{width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums}
        .bf-t th{text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500}
        .bf-t td{text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono)}
        .bf-t th:first-child,.bf-t td:first-child{text-align:left}
        #paste{width:100%;min-height:110px;font:400 .82rem/1.5 var(--font-mono);padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);box-sizing:border-box}</style>`,
      panel: `
        <div class="ctrl"><label>Data</label>
          <div class="seg" id="src" style="flex-wrap:wrap">${Object.entries(SRC).map(([k, [t]]) => `<button type="button" data-v="${k}" aria-pressed="${k === src}">${t}</button>`).join("")}</div></div>
        <p id="desc" style="margin:0 0 14px;font-size:.88rem;color:var(--muted)"></p>
        <div id="simCtl">
          <div class="ctrl"><label for="n">How many numbers <output id="nV"></output></label><input type="range" id="n" min="100" max="20000" step="100" value="2000"></div>
          <div class="ctrl"><label for="fake">Share made up by a person <output id="fakeV"></output></label><input type="range" id="fake" min="0" max="50" step="1" value="0"></div>
          <div class="ctrl"><label for="cap">Bunched under an approval limit <output id="capV"></output></label><input type="range" id="cap" min="0" max="30" step="1" value="0"></div>
        </div>
        <div id="pasteCtl" hidden><textarea id="paste" spellcheck="false" aria-label="Your numbers"></textarea></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New data</button></div>`,
      notes: `
        <section>
          <h2>The law</h2>
          <div class="eq">P(first digit = d) = log₁₀(1 + 1/d)<br>1: 30.1%  2: 17.6%  3: 12.5%  4: 9.7%  5: 7.9%  6: 6.7%  7: 5.8%  8: 5.1%  9: 4.6%</div>
          <p>Picture the numbers on a log scale. Each step from 1 to 10, 10 to 100, 100 to 1000 is the same width, and inside each, the stretch for leading 1s (1 to 2) is log 2 ≈ 30% of it. If data are spread smoothly over several of these steps, 30% of them land in a 1-stretch.</p>
          <p>The law is <b>scale invariant</b>: convert dollars to euros or units to cases and the pattern stays. That's a sign it describes the data's spread, not the units.</p>
        </section>
        <section>
          <h2>When to expect it, and when not</h2>
          <ul>
            <li><b>Yes:</b> invoice and payment amounts, order values, SKU sales volumes, customer balances, populations. Data that span at least two or three orders of magnitude.</li>
            <li><b>No:</b> prices in a tight band, assigned numbers (invoice IDs, phone numbers, postcodes), values with a minimum or maximum (ages, percentages), anything heavily rounded.</li>
          </ul>
          <p>A mismatch is a lead to follow, not proof of wrongdoing. Common honest causes are duplicated payments, a few very common amounts, or a process that changed part-way.</p>
        </section>
        <section>
          <h2>Two ways to score it</h2>
          <p><b>Chi-square</b> sums (observed − expected)² ÷ expected over the nine digits and compares with 8 degrees of freedom. It gets stricter as n grows, so big files almost always 'fail'. <b>MAD</b> averages |observed share − Benford share| and stays steady as n grows. Nigrini's first-digit cut-offs: below 0.006 close, 0.006–0.012 acceptable, 0.012–0.015 marginal, above 0.015 nonconforming.</p>
          <p>Related: <a href="#distributions">distributions and log scales</a>, <a href="#outliers">outliers</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Invoices with nothing made up: MAD under 0.006.</li>
            <li>Raise the made-up share to 20%. The 1s fall and the middle digits rise; MAD climbs.</li>
            <li>Bunch 15% of invoices just under the limit: 4s jump (amounts like $4,800–$4,999).</li>
            <li>Narrow range: nothing like Benford, and that's correct.</li>
            <li>Paste a column of real amounts from one of your own spreadsheets.</li>
          </ol>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const P = new Plot($("#bf"), { x: [0.4, 9.6], y: [0, 0.35], pad: { l: 50, b: 40 } });
    const first = (v) => { v = Math.abs(v); if (!isFinite(v) || v === 0) return 0; return Math.floor(v / 10 ** Math.floor(Math.log10(v) + 1e-12)); };

    function simulate() {
      const r = rng(seed), n = +$("#n").value, fake = +$("#fake").value / 100, cap = +$("#cap").value / 100, xs = [];
      for (let i = 0; i < n; i++) {
        let v;
        const u = r();
        if (src === "narrow") v = 20 + 40 * r();
        else if (u < fake) v = Math.round(100 + 8900 * r()); // people pick 'random-looking' amounts evenly
        else if (u < fake + cap) v = 4800 + 199 * r();         // just under a $5,000 approval limit
        else if (src === "invoices") v = Math.exp(Math.log(400) + 1.9 * r.normal());
        else v = Math.exp(Math.log(60) + 2.2 * r.normal());
        xs.push(v);
      }
      return xs;
    }
    function parse() { return ($("#paste").value.match(/-?\d[\d,]*\.?\d*(e-?\d+)?/gi) || []).map((t) => +t.replace(/,(?=\d{3}\b)/g, "")).filter((v) => isFinite(v) && v !== 0); }

    function draw() {
      $("#desc").textContent = SRC[src][1];
      $("#simCtl").hidden = src === "paste"; $("#pasteCtl").hidden = src !== "paste"; $("#newd").hidden = src === "paste";
      $("#nV").textContent = (+$("#n").value).toLocaleString(); $("#fakeV").textContent = `${$("#fake").value}%`; $("#capV").textContent = `${$("#cap").value}%`;
      const xs = src === "paste" ? parse() : simulate();
      const cnt = new Array(10).fill(0); xs.forEach((v) => cnt[first(v)]++);
      const n = cnt.slice(1).reduce((a, b) => a + b, 0) || 1;
      const obs = cnt.map((c) => c / n);
      let chi = 0, mad = 0;
      const z = [];
      for (let d = 1; d <= 9; d++) { const e = n * BEN[d]; chi += (cnt[d] - e) ** 2 / e; mad += Math.abs(obs[d] - BEN[d]) / 9; z[d] = Math.max(0, Math.abs(obs[d] - BEN[d]) - 1 / (2 * n)) / Math.sqrt(BEN[d] * (1 - BEN[d]) / n); }
      // chi-square upper tail, 8 df: closed form for even df
      const half = chi / 2; let term = 1, sum = 1; for (let k = 1; k < 4; k++) { term *= half / k; sum += term; }
      const pv = Math.exp(-half) * sum;
      const verdict = mad < 0.006 ? ["Close conformity", "--good"] : mad < 0.012 ? ["Acceptable conformity", "--good"] : mad < 0.015 ? ["Marginal", "--warm"] : ["Nonconforming", "--bad"];

      P.y = [0, Math.max(0.35, ...obs.slice(1)) * 1.1];
      P.clear(); P.axes({ xTicks: [1, 2, 3, 4, 5, 6, 7, 8, 9], xFormat: (v) => v, xLabel: "first digit", yLabel: "share", yFormat: (v) => Math.round(v * 100) + "%", yCount: 5 });
      const g = P.ctx, bw = (P.sx(1) - P.sx(0)) * 0.6;
      for (let d = 1; d <= 9; d++) {
        g.fillStyle = css(z[d] > 1.96 && n >= 30 ? "--bad" : "--accent"); g.globalAlpha = 0.8;
        g.fillRect(P.sx(d) - bw / 2, P.sy(obs[d]), bw, P.sy(0) - P.sy(obs[d]));
      }
      g.globalAlpha = 1;
      const ds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      P.path(ds, ds.map((d) => BEN[d]), css("--warm"), 2.4);
      ds.forEach((d) => P.dot(d, BEN[d], 4, css("--warm"), css("--surface")));

      $("#tbl").innerHTML = `<tr><th>Digit</th><th>Count</th><th>Observed</th><th>Benford</th><th>Difference</th><th>z</th></tr>` + ds.map((d) =>
        `<tr><td>${d}</td><td>${cnt[d].toLocaleString()}</td><td>${(obs[d] * 100).toFixed(1)}%</td><td>${(BEN[d] * 100).toFixed(1)}%</td><td style="color:${Math.abs(obs[d] - BEN[d]) > 0.015 ? "var(--bad)" : "inherit"}">${obs[d] >= BEN[d] ? "+" : "−"}${(Math.abs(obs[d] - BEN[d]) * 100).toFixed(1)} pts</td><td style="color:${z[d] > 1.96 ? "var(--bad)" : "inherit"}">${z[d].toFixed(2)}</td></tr>`).join("");

      $("#ro").innerHTML = `
        <div class="ro"><b>Numbers used</b><span class="num">${n.toLocaleString()}</span></div>
        <div class="ro"><b>MAD</b><span class="num">${mad.toFixed(4)}</span></div>
        <div class="ro"><b>Chi-square (8 df)</b><span class="num">${chi.toFixed(1)}</span></div>
        <div class="ro"><b>p-value</b><span class="num">${pv < 0.0001 ? "< 0.0001" : pv.toFixed(4)}</span></div>
        <div class="ro" style="grid-column:1/-1"><b>Verdict (Nigrini MAD)</b><span style="color:var(${verdict[1]});font-weight:600">${verdict[0]}</span>${n < 300 ? `<small style="color:var(--muted);display:block">Under about 300 numbers the test is unreliable.</small>` : ""}</div>`;

      const B = (t) => `<b style="color:var(--ink)">${t}</b>`, M = (t) => `<span style="color:var(--muted)">${t}</span>`;
      const ex = xs.find((v) => Math.abs(v) >= 1000) || xs[0] || 4321;
      const big = ds.reduce((a, d) => (z[d] > z[a] ? d : a), 1);
      $("#work").innerHTML = [
        `first digit of ${ex.toFixed(2)}: ${ex.toFixed(2)} ÷ 10^${Math.floor(Math.log10(Math.abs(ex)))} = ${(Math.abs(ex) / 10 ** Math.floor(Math.log10(Math.abs(ex)))).toFixed(4)} → ${B(first(ex))}`,
        `Benford for 1: log₁₀(1 + 1/1) = log₁₀ 2 = ${B("0.301")}; for 9: log₁₀(10/9) = ${B("0.046")}`,
        `digit 1: observed ${cnt[1]} ÷ ${n} = ${obs[1].toFixed(3)}, expected ${(n * BEN[1]).toFixed(1)}; (${cnt[1]} − ${(n * BEN[1]).toFixed(1)})² ÷ ${(n * BEN[1]).toFixed(1)} = ${((cnt[1] - n * BEN[1]) ** 2 / (n * BEN[1])).toFixed(2)}`,
        `chi-square = sum over 9 digits = ${B(chi.toFixed(2))} → p = ${pv < 0.0001 ? "< 0.0001" : pv.toFixed(4)} ${M("(8 df; 5% cut-off is 15.51)")}`,
        `MAD = (|${ds.map((d) => (obs[d] - BEN[d]).toFixed(3)).join("| + |")}|) ÷ 9 = ${B(mad.toFixed(4))} → ${verdict[0].toLowerCase()}`,
        `most unusual digit: ${big}, z = (|${obs[big].toFixed(3)} − ${BEN[big].toFixed(3)}| − 1/(2×${n})) ÷ √(${BEN[big].toFixed(3)} × ${(1 - BEN[big]).toFixed(3)} ÷ ${n}) = ${B(z[big].toFixed(2))}`,
      ].map((l) => `<div style="padding-left:2ch;text-indent:-2ch">${l}</div>`).join("");
    }

    $("#src").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return; src = b.dataset.v;
      $("#src").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      if (src === "paste" && !$("#paste").value) { const r = rng(5); $("#paste").value = Array.from({ length: 300 }, () => (Math.exp(Math.log(250) + 1.8 * r.normal())).toFixed(2)).join("\n"); }
      draw();
    });
    ["#n", "#fake", "#cap", "#paste"].forEach((s) => $(s).addEventListener("input", draw));
    $("#newd").addEventListener("click", () => { seed++; draw(); });
    draw();
    return watch([P.c], (resized) => { if (resized) P.resize(); draw(); });
  },
});
