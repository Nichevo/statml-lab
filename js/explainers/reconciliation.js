Lab.register({
  id: "reconciliation",
  group: "Forecasting",
  title: "Hierarchical forecast reconciliation",
  blurb: "Forecast stores, regions and the total separately and they won't add up. Compare bottom-up, top-down and optimal reconciliation, level by level.",
  lede: "Businesses need forecasts at several levels: each store, each region, the national total. Forecast each level on its own and the numbers won't add up, so plans at different levels disagree. Reconciliation adjusts them so they're coherent: the stores sum to their region, and the regions to the total. Done well, it also makes them more accurate.",
  quiz: [
    ["Stores forecast 40 and 70, their region forecasts 120. Bottom-up gives what for the region? What does top-down with a 40/60 split give the stores?", "Bottom-up: region = 40 + 70 = 110. Top-down: stores get 0.4 × 120 = 48 and 0.6 × 120 = 72."],
    ["Why is bottom-up often poor for the total?", "Store-level series are noisy, and their forecasts carry that noise. The total is smoother and easier to forecast directly, so adding up noisy store forecasts can be worse than forecasting the total itself."],
    ["Why is top-down often poor for the stores?", "It splits the total by fixed historical shares, so it can't see a store that's growing or shrinking relative to the others."],
    ["What does OLS reconciliation actually do?", "It finds the coherent set of forecasts closest (in least squares) to all the base forecasts at once. Every level gets a vote, so information from the smooth total and from the detailed stores is combined."],
  ],
  deeper: [
    ["FPP3 chapter 11: Forecasting hierarchical and grouped time series", "https://otexts.com/fpp3/hierarchical.html", "bottom-up, top-down, middle-out and MinT, with R code"],
    ["Wickramasuriya, Athanasopoulos & Hyndman (2019), MinT", "https://doi.org/10.1080/01621459.2018.1448825", "the paper behind optimal reconciliation"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="38" y="4" width="20" height="12" rx="2"/><rect x="14" y="26" width="20" height="12" rx="2"/><rect x="62" y="26" width="20" height="12" rx="2"/><g fill="currentColor"><rect x="4" y="48" width="14" height="10" rx="2"/><rect x="28" y="48" width="14" height="10" rx="2"/><rect x="54" y="48" width="14" height="10" rx="2"/><rect x="78" y="48" width="14" height="10" rx="2"/></g><path d="M48 16 L24 26 M48 16 L72 26 M24 38 L11 48 M24 38 L35 48 M72 38 L61 48 M72 38 L85 48"/></svg>`,

  mount(root) {
    const { watch, rng, fmt, css } = Lab;
    const T = 160, TR = 60;
    const NODES = ["Total", "North", "South", "Store A", "Store B", "Store C", "Store D"];
    // summing matrix S: rows = all nodes, columns = bottom series
    const S = [[1, 1, 1, 1], [1, 1, 0, 0], [0, 0, 1, 1], [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    const METHODS = [
      { id: "base", name: "Base (not reconciled)" },
      { id: "bu", name: "Bottom-up" },
      { id: "td", name: "Top-down" },
      { id: "ols", name: "OLS reconciliation" },
      { id: "wls", name: "WLS (structural)" },
    ];
    const LEVELS = [["Total", [0]], ["Regions", [1, 2]], ["Stores", [3, 4, 5, 6]]];

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot" style="padding:14px">
          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
            <h4 style="margin:0;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Next period's forecasts</h4>
            <select id="show" aria-label="Method shown in the tree">${METHODS.map((m, i) => `<option value="${m.id}" ${i === 3 ? "selected" : ""}>${m.name}</option>`).join("")}</select>
          </div>
          <div style="overflow-x:auto"><svg id="tree" viewBox="0 0 720 300" style="width:100%;min-width:560px;display:block"></svg></div>
          <p class="hint" id="tcap"></p>
        </div>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Accuracy by level (MAPE, ${T - TR} one-step forecasts)</h4>
          <div style="overflow-x:auto"><table id="acc" style="width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums"></table></div>
          <p class="hint" style="margin-top:8px">Green is the best method for each level. "Adds up?" checks whether stores sum to regions and regions to the total.</p>
        </div>`,
      panel: `
        <div class="ctrl"><label for="nz">Store-level noise <output id="nzV"></output></label><input type="range" id="nz" min="0.02" max="0.25" step="0.01" value="0.15"></div>
        <div class="ctrl"><label for="dr">Stores drift apart <output id="drV"></output></label><input type="range" id="dr" min="0" max="1" step="0.05" value="0.5"></div>
        <div class="ctrl"><label for="cm">Shared ups and downs <output id="cmV"></output></label><input type="range" id="cm" min="0" max="1" step="0.05" value="0.4"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New random history</button></div>`,
      notes: `
        <section>
          <h2>The methods</h2>
          <ul>
            <li><b>Base:</b> forecast every node independently (here with <a href="#exponential-smoothing">exponential smoothing</a>, each node tuning its own α). Usually doesn't add up.</li>
            <li><b>Bottom-up:</b> forecast the stores, add them up. Coherent; keeps store detail; inherits store noise.</li>
            <li><b>Top-down:</b> forecast the total, split it by each store's historical share. Coherent; smooth; blind to shifting shares.</li>
            <li><b>OLS / WLS reconciliation:</b> take all base forecasts and find the closest set that adds up.</li>
          </ul>
          <div class="eq">ỹ = S (SᵀWS)⁻¹ SᵀW ŷ</div>
          <p>ŷ is the stack of all 7 base forecasts, S the summing matrix (which stores make up each node) and W a weighting. W = identity gives OLS. WLS (structural) weights each node by 1 / (number of stores under it), trusting the detailed nodes more. MinT, the state of the art, estimates W from the base forecasts' error covariance.</p>
        </section>
        <section>
          <h2>The summing matrix</h2>
          <div class="eq">Total &nbsp;&nbsp;[1 1 1 1]<br>North &nbsp;&nbsp;[1 1 0 0]<br>South &nbsp;&nbsp;[0 0 1 1]<br>Store A [1 0 0 0] … Store D [0 0 0 1]</div>
          <p>Every coherent forecast is S times some store-level vector. Reconciliation picks the store vector whose implied full set is nearest to the base forecasts, then multiplies by S, so everything adds up by construction.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set "stores drift apart" to 1 and store noise to 5%. Store shares now change over time, and top-down's store forecasts fall far behind: fixed shares can't see a store growing or shrinking.</li>
            <li>Set drift to 0 and noise to 25%. Shares are stable and stores are noisy, so top-down's smooth split now wins at store level. Which method is best depends on the data.</li>
            <li>Look at the tree with "Base" selected: the red notes show by how much the numbers fail to add up.</li>
            <li>OLS is rarely the very best at any single level, but it is rarely bad at any level. That robustness is why it's popular.</li>
          </ol>
          <p>The same idea works for time levels, such as weeks adding up to months: see <a href="#monthly-to-weekly">splitting monthly forecasts</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let seed = 9, R = null;

    // P = (S'WS)^-1 S'W  (4 x 7), for W diagonal
    function projector(w) {
      const A = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => S.reduce((s, r, k) => s + r[i] * w[k] * r[j], 0)));
      const inv = Array.from({ length: 4 }, (_, j) => { const e = [0, 0, 0, 0]; e[j] = 1; return Lab.solve(A.map((r) => r.slice()), e); }); // columns of inverse
      const Ainv = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => inv[j][i]));
      return Array.from({ length: 4 }, (_, i) => Array.from({ length: 7 }, (_, k) => Ainv[i].reduce((s, v, j) => s + v * S[k][j] * w[k], 0)));
    }
    const P_OLS = projector([1, 1, 1, 1, 1, 1, 1]), P_WLS = projector([1 / 4, 1 / 2, 1 / 2, 1, 1, 1, 1]);
    const up = (b) => S.map((r) => r.reduce((s, v, j) => s + v * b[j], 0));

    function compute() {
      const r = rng(seed), nz = +$("#nz").value, dr = +$("#dr").value, cm = +$("#cm").value;
      const base = [60, 90, 120, 50];
      const bot = base.map(() => []);
      const slope = base.map(() => dr * 0.5 * r.normal());
      let shared = 0;
      for (let t = 0; t < T; t++) {
        shared = 0.7 * shared + 0.08 * r.normal();
        base.forEach((b, i) => {
          const lvl = b * (1 + 0.15 * Math.sin((2 * Math.PI * t) / 52)) + slope[i] * t * 0.6;
          bot[i].push(Math.max(1, lvl * (1 + cm * shared) * (1 + nz * (Math.sqrt(1 - cm * 0.5) * r.normal()))));
        });
      }
      const all = Array.from({ length: T }, (_, t) => up(bot.map((b) => b[t])));
      // base forecasts: SES at every node, each with its own α tuned on the first TR periods
      // (with one shared α, SES forecasts would add up by themselves, since smoothing is linear)
      const GRID = [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8];
      const alpha = NODES.map((_, k) => {
        let best = GRID[0], bs = Infinity;
        GRID.forEach((a) => { let s = all[0][k], e = 0; for (let t = 1; t < TR; t++) { e += (all[t][k] - s) ** 2; s = a * all[t][k] + (1 - a) * s; } if (e < bs) { bs = e; best = a; } });
        return best;
      });
      const sm = NODES.map((_, k) => all[0][k]), fc = {};
      METHODS.forEach((m) => (fc[m.id] = []));
      const shareHist = [0, 0, 0, 0];
      for (let t = 1; t < T; t++) {
        for (let k = 0; k < 7; k++) sm[k] = alpha[k] * all[t - 1][k] + (1 - alpha[k]) * sm[k];
        bot.forEach((b, i) => (shareHist[i] += b[t - 1] / all[t - 1][0]));
        const yhat = sm.slice();
        fc.base.push(yhat);
        fc.bu.push(up(yhat.slice(3)));
        fc.td.push(up(shareHist.map((s) => (s / t) * yhat[0])));
        fc.ols.push(up(P_OLS.map((row) => row.reduce((s, v, k) => s + v * yhat[k], 0))));
        fc.wls.push(up(P_WLS.map((row) => row.reduce((s, v, k) => s + v * yhat[k], 0))));
      }
      const score = {};
      METHODS.forEach((m) => {
        score[m.id] = LEVELS.map(([, idx]) => { let e = 0, c = 0; for (let t = TR; t < T; t++) idx.forEach((k) => { e += Math.abs(all[t][k] - fc[m.id][t - 1][k]) / all[t][k]; c++; }); return (e / c) * 100; });
      });
      R = { all, fc, score, alpha };
    }

    function draw() {
      $("#nzV").textContent = "±" + Math.round(+$("#nz").value * 100) + "%"; $("#drV").textContent = (+$("#dr").value).toFixed(2);
      $("#cmV").textContent = (+$("#cm").value).toFixed(2);
      const { all, fc, score } = R, id = $("#show").value, f = fc[id][T - 2], a = all[T - 1], b = fc.base[T - 2];
      const pos = [[360, 40], [180, 140], [540, 140], [90, 245], [270, 245], [450, 245], [630, 245]];
      const kids = [[1, 2], [3, 4], [5, 6]];
      const ink = css("--ink"), mut = css("--muted"), line = css("--line"), acc = css("--accent"), bad = css("--bad"), surf = css("--surface");
      let svg = "";
      kids.forEach((ks, p) => ks.forEach((k) => (svg += `<line x1="${pos[p][0]}" y1="${pos[p][1] + 30}" x2="${pos[k][0]}" y2="${pos[k][1] - 30}" stroke="${line}" stroke-width="1.5"/>`)));
      NODES.forEach((n, k) => {
        const [x, y] = pos[k], sumKids = k < 3 ? kids[k].reduce((s, c) => s + f[c], 0) : null, gap = sumKids !== null ? f[k] - sumKids : 0;
        svg += `<g><rect x="${x - 72}" y="${y - 30}" width="144" height="60" rx="8" fill="${surf}" stroke="${Math.abs(gap) > 0.5 ? bad : line}" stroke-width="${Math.abs(gap) > 0.5 ? 2 : 1}"/>
          <text x="${x}" y="${y - 12}" text-anchor="middle" font-family="${css("--font-body")}" font-size="12" font-weight="600" fill="${ink}">${n}</text>
          <text x="${x}" y="${y + 6}" text-anchor="middle" font-family="${css("--font-mono")}" font-size="13" font-weight="700" fill="${acc}">${fmt(f[k], 1)}</text>
          <text x="${x}" y="${y + 22}" text-anchor="middle" font-family="${css("--font-mono")}" font-size="10" fill="${mut}">base ${fmt(b[k], 1)} · actual ${fmt(a[k], 0)}</text>`;
        if (Math.abs(gap) > 0.5) svg += `<text x="${x + 78}" y="${y + 4}" font-family="${css("--font-mono")}" font-size="10.5" fill="${bad}">${gap > 0 ? "+" : ""}${fmt(gap, 1)} vs parts</text>`;
        svg += `</g>`;
      });
      $("#tree").innerHTML = svg;
      $("#tcap").innerHTML = `Big blue number: the ${METHODS.find((m) => m.id === id).name.toLowerCase()} forecast for next period. Below it: the independent base forecast and what actually happened. A red border means the node doesn't equal the sum of its children.`;

      const best = LEVELS.map((_, l) => Math.min(...METHODS.map((m) => score[m.id][l])));
      const coherent = (m) => fc[m][T - 2].every((v, k) => k > 2 || Math.abs(v - kids[k].reduce((s, c) => s + fc[m][T - 2][c], 0)) < 0.5);
      const th = (t, l) => `<th style="text-align:${l ? "left" : "right"};padding:6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted)">${t}</th>`;
      $("#acc").innerHTML = `<tr>${th("Method", 1)}${LEVELS.map(([n]) => th(n)).join("")}${th("Adds up?")}</tr>` + METHODS.map((m) => `<tr${m.id === id ? ' style="background:var(--accent-soft)"' : ""}><td style="padding:6px;border-bottom:1px solid var(--grid)">${m.name}</td>${score[m.id].map((v, l) => `<td style="text-align:right;padding:6px;border-bottom:1px solid var(--grid);font-family:var(--font-mono);${v === best[l] ? "color:var(--good);font-weight:700" : ""}">${v.toFixed(2)}%</td>`).join("")}<td style="text-align:right;padding:6px;border-bottom:1px solid var(--grid)">${coherent(m.id) ? '<span class="pill ok">yes</span>' : '<span class="pill bad">no</span>'}</td></tr>`).join("");
      const gapTot = b[0] - (b[3] + b[4] + b[5] + b[6]);
      $("#ro").innerHTML = `<div class="ro"><b>Base: total − sum of stores</b><span class="num">${gapTot > 0 ? "+" : ""}${fmt(gapTot, 1)}</span></div>
        <div class="ro" style="display:block;font-size:.8rem;color:var(--muted)">Each node's base forecast tunes its own smoothing α: ${NODES.map((n, k) => `${n} ${R.alpha[k]}`).join(", ")}. Different α's are why the base forecasts don't add up.</div>`;
    }

    const rerun = () => { compute(); draw(); };
    ["#nz", "#dr", "#cm"].forEach((s) => $(s).addEventListener("input", rerun));
    $("#show").addEventListener("change", draw);
    $("#newd").addEventListener("click", () => { seed++; rerun(); });
    rerun();
    const mo = new MutationObserver(draw); mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const stop = watch([], () => draw());
    return () => { mo.disconnect(); stop(); };
  },
});
