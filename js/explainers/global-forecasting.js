Lab.register({
  id: "global-forecasting",
  group: "Forecasting",
  title: "Global ML forecasting: one model for many products",
  blurb: "Instead of fitting one model per SKU, train one gradient-boosted tree model on every SKU at once. New and short-history items borrow seasonality and promo effects from the rest of the range.",
  lede: "Classic forecasting fits one model per series: each SKU learns its own level, trend, seasonality and promo uplift from its own history. That works for long, steady items and fails for new ones, which have too little history to learn anything. A global model is trained on all the series together, with each SKU's sales scaled to its own level, so a two-month-old Christmas gift can use what the other gift lines did last December. This is how most winning entries in the M5 competition worked. Below, a small gradient-boosted tree model is trained live in your browser on simulated weekly sales.",
  quiz: [
    ["Why must each SKU's sales be scaled (for example, divided by its recent average) before training a global model?", "Otherwise the model mostly learns which SKUs are big. Scaling puts a 20-a-week item and a 400-a-week item on the same footing, so the model learns shared shapes (seasonality, promo lift, ramp-up) that transfer between them. Multiply back by the level afterwards."],
    ["A SKU launched 16 weeks ago and has never been through a Christmas. How can the global model predict its December peak?", "The week-of-year and category features tie this SKU to other gift SKUs that do have December history. The trees learn 'gift + week 48 → about 2× level' from them and apply it to the new item. A per-SKU model has no December data, so it forecasts a flat line."],
    ["On long, stable SKUs the per-SKU model is often as good as or better than the global one. Why?", "With two or more years of its own history, a local model can capture that SKU's exact seasonal shape and promo response. The global model shares one shape per category, which is a small compromise for any single SKU. The global model's advantage is largest where data per SKU is thin."],
    ["What's the risk of adding 'same week last year' as a feature?", "For SKUs without a year of history it doesn't exist, so it has to be coded as missing (here −1). That's fine for trees, but you must build every feature only from data known at the forecast origin. Using information from after the origin (leakage) makes back-test accuracy look far better than real life."],
    ["Feature importance says 'week of year' matters most. Does that mean seasonality causes most sales?", "No. Importance measures how much each feature reduced training error in the tree splits. It tells you what the model leans on, not what causes demand, and correlated features share or steal credit from each other."],
  ],
  diy: {
    intro: "Excel can't train boosted trees, but you can build the 'global' idea by pooling seasonality and promo lift across SKUs. Stack all SKUs in one long table: A SKU, B category, C week number, D week of year, E promo (1/0), F sales.",
    steps: [
      ["Level: average of the same SKU's last 8 non-promo weeks before this week.", "=AVERAGEIFS(F:F, A:A, A2, C:C, \">=\"&C2-8, C:C, \"<\"&C2, E:E, 0)"],
      ["Scaled sales (the thing a global model learns).", "=IFERROR(F2/G2, \"\")"],
      ["Pooled seasonal factor for this category and week of year, from all SKUs.", "=AVERAGEIFS(H:H, B:B, B2, D:D, D2, E:E, 0)"],
      ["Pooled promo lift from all SKUs.", "=AVERAGEIFS(H:H, E:E, 1) / AVERAGEIFS(H:H, E:E, 0)"],
      ["Forecast for a new SKU's future week: its own level × the pooled shape.", "=G2 * I2 * IF(E2=1, $K$1, 1)"],
      ["The real thing: export the same table and train LightGBM (Python) or a boosted tree in R on columns D, E, B, recent-sales ratios and weeks of history, with column H as the target.", "target = sales / level"],
    ],
  },
  deeper: [
    ["Montero-Manso & Hyndman (2021), Principles and algorithms for forecasting groups of time series: Locality and globality, IJF 37(4)", "https://doi.org/10.1016/j.ijforecast.2021.03.004", "why one model for many series can beat many models"],
    ["Makridakis, Spiliotis & Assimakopoulos (2022), M5 accuracy competition: Results, findings, and conclusions, IJF 38(4)", "https://doi.org/10.1016/j.ijforecast.2021.11.013", "Walmart sales: global LightGBM models won"],
    ["Januschowski et al. (2020), Criteria for classifying forecasting methods, IJF 36(1)", "https://doi.org/10.1016/j.ijforecast.2019.05.008", "local vs global, and other ways to sort methods"],
    ["Friedman (2001), Greedy function approximation: a gradient boosting machine, Annals of Statistics 29(5)", "https://doi.org/10.1214/aos/1013203451", "the original gradient boosting paper"],
    ["Bandara, Bergmeir & Smyl (2020), Forecasting across time series databases using recurrent neural networks on groups of similar series, Expert Systems with Applications 140", "https://doi.org/10.1016/j.eswa.2019.112896", "pooling similar series to train one model"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 50 L20 40 L34 46 L48 30" stroke-opacity=".45"/><path d="M6 40 L20 28 L34 36 L48 20" stroke-opacity=".45"/><path d="M6 56 L20 50 L34 54 L48 42" stroke-opacity=".45"/><rect x="54" y="18" width="16" height="28" rx="3"/><path d="M70 32 L90 22" stroke-width="2.5"/><path d="M70 32 L90 40" stroke-width="2.5" stroke-dasharray="3 3"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const H = 104, TW = 12, POP = 80, SHOW = 52;
    const WOY = (t) => (t - 1 + 39) % 52; // weeks 105–116 (the forecast) fall in weeks 40–51 of the year
    const CAT = ["Garden", "Gifts", "Staples"];
    const season = (c, w) => c === 0 ? 1 + 0.55 * Math.cos((2 * Math.PI * (w - 24)) / 52)
      : c === 1 ? 0.8 + 0.25 * Math.cos((2 * Math.PI * (w - 48)) / 52) + 1.4 * Math.exp(-Math.pow((w - 48) / 3.2, 2))
      : 1 + 0.08 * Math.cos((2 * Math.PI * w) / 52);
    const FN = ["weeks ahead", "week of year", "promo that week", "category", "last 4 weeks ÷ level", "last week ÷ level", "weeks of history", "same week last year ÷ level"];
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const key = (c, t, dash) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><svg width="20" height="8"><path d="M1 4 H19" stroke="${c}" stroke-width="2.5" ${dash ? 'stroke-dasharray="4 3"' : ""}/></svg>${t}</span>`;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0"><div style="padding:4px 6px 0;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:space-between">${h4("One SKU: history, then the next 12 weeks")}<label style="display:flex;gap:8px;align-items:center;font-size:.85rem;min-width:0">SKU <select id="sku" style="width:auto;max-width:240px"></select></label></div>
          <canvas id="g1" aria-label="Sales history and forecasts for the chosen SKU"></canvas>
          <div class="legend" id="g1Key" style="padding:0 8px;font-size:.82rem;color:var(--muted)"></div>
          <figcaption id="g1Cap"></figcaption></figure>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Error by length of history")}</div><canvas id="g2" aria-label="Forecast error of global and local models by SKU history length"></canvas><figcaption id="g2Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("What the global model leans on")}</div><div id="imp" style="padding:6px 10px 4px;display:grid;gap:7px"></div><figcaption id="impCap"></figcaption></figure>`)}
        <figure class="plot short" style="margin:0"><div style="padding:4px 6px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between">${h4("Does a bigger pool help?")}<div class="btns"><button class="btn" id="poolRun" type="button">Run the experiment</button></div></div>
          <canvas id="g3" style="aspect-ratio:2/1" aria-label="Error on ten SKUs as the training pool grows"></canvas><figcaption id="g3Cap"></figcaption></figure>
        <div class="plot" style="padding:14px">${h4("Worked out for the chosen SKU, first forecast week")}<div id="work" style="font:.82rem/1.8 var(--font-mono);overflow-x:auto"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">${POP} simulated SKUs in three categories, two years of weekly sales (some launched recently), random promotions. Forecast the next 12 weeks, which run into Christmas.</p>
        <div class="ctrl"><label for="pool">SKUs the global model trains on <output id="poolV"></output></label><input type="range" id="pool" min="5" max="80" step="5" value="40"></div>
        <div class="ctrl"><label for="flen">History of the newest gift SKU <output id="flenV"></output></label><input type="range" id="flen" min="4" max="104" step="2" value="16"></div>
        <div class="ctrl"><label for="lift">Typical promo uplift <output id="liftV"></output></label><input type="range" id="lift" min="0" max="1.5" step="0.1" value="0.8"></div>
        <div class="ctrl"><label for="noise">Week-to-week noise <output id="noiseV"></output></label><input type="range" id="noise" min="0.05" max="0.5" step="0.05" value="0.25"></div>
        <div class="ctrl"><label for="trees">Boosted trees <output id="treesV"></output></label><input type="range" id="trees" min="10" max="250" step="10" value="120"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reseed" type="button">New random SKUs</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Local vs global</h2>
          <p><b>Local</b> (the orange line): one model per SKU, fitted only to that SKU's history. Here it is seasonal exponential smoothing with the SKU's own promo uplift. It needs about a year of history before it can estimate any seasonality and a few promo weeks before it can estimate uplift. Until then it falls back to a flat level.</p>
          <p><b>Global</b> (the blue line): one gradient-boosted tree model trained on rows from every SKU in the pool. Each row says "at this origin, with these features, sales h weeks later were this multiple of the SKU's level". The features are the same for every SKU: week of year, promo flag, category, how recent sales compare with the level, weeks of history and same-week-last-year where it exists.</p>
          <div class="eq">forecast = level × model(features) &nbsp;&nbsp; level = average of the last 8 non-promo weeks</div>
        </section>
        <section>
          <h2>Why scaling matters</h2>
          <p>The model never sees raw units. It learns a ratio to the SKU's own level, so a big staple and a tiny gift line contribute equally to learning "promo weeks sell about 1.8× normal" or "gifts double in the week before Christmas". Without scaling, the trees spend their splits telling big SKUs from small ones.</p>
        </section>
        <section>
          <h2>When to use which</h2>
          <ul>
            <li><b>Global wins</b> with many related series, short histories, new products, frequent promotions and plenty of features (price, promo, calendar, store).</li>
            <li><b>Local holds its own</b> on long, stable series with a distinctive pattern of their own, and it's easier to explain to planners.</li>
            <li><b>Watch for:</b> leakage (features built from data after the origin), a pool of unrelated series, and drift. Retrain regularly and back-test on a rolling origin (see <a href="#backtesting">backtesting</a>).</li>
          </ul>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Pick the newest gift SKU (the default). The local forecast is flat: it has never seen a December. The global forecast climbs into Christmas.</li>
            <li>Drag "History of the newest gift SKU" to 104 weeks. The local model catches up.</li>
            <li>Cut the pool to 5 SKUs. The global model gets worse, especially on short-history SKUs. Then press "Run the experiment".</li>
            <li>Set promo uplift to 0 and watch "promo that week" drop down the importance list.</li>
          </ol>
          <p>Related: <a href="#random-forest">tree models</a>, <a href="#new-product">new-product forecasting</a>, <a href="#exponential-smoothing">exponential smoothing</a>, <a href="#forecast-accuracy">WAPE</a> and <a href="#bias-variance">bias and variance</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    let seed = 7, POPS = null, R = null, poolRes = null, simKey = "";

    function simulate(lift, noise, flen) {
      const r = rng(seed), S = [];
      for (let i = 0; i < POP; i++) {
        const c = (i + 1) % 3, L = Math.exp(Math.log(20) + r() * Math.log(20)), g = (r() - 0.4) * 0.006;
        const len = i === 0 ? flen : r() < 0.55 ? H : 6 + Math.floor(r() * 85), start = H - len + 1, lf = lift * (0.7 + 0.6 * r());
        const y = [], promo = [];
        for (let t = 1; t <= H + TW; t++) {
          const p = t >= start && r() < 0.1 ? 1 : 0, m = t < start ? 0 : L * (1 + g * (t - start)) * season(c, WOY(t)) * (p ? 1 + lf : 1) * (1 - 0.5 * Math.exp(-(t - start) / 3));
          promo.push(p); y.push(t < start ? null : Math.max(0, Math.round(m * Math.exp(noise * r.normal() - (noise * noise) / 2))));
        }
        S.push({ i, c, start, len, y, promo, name: `${i === 0 ? "New " : ""}${CAT[c]} ${String(i + 1).padStart(2, "0")}` });
      }
      return S;
    }
    function feats(s, o, h) {
      const y = s.y, t = o + h, lo = Math.max(s.start, o - 7);
      let a = 0, n = 0; for (let k = lo; k <= o; k++) if (!s.promo[k - 1]) { a += y[k - 1]; n++; }
      if (!n) for (let k = lo; k <= o; k++) { a += y[k - 1]; n++; }
      const lvl = a / n || 1;
      let l4 = 0, n4 = 0; for (let k = Math.max(s.start, o - 3); k <= o; k++) { l4 += y[k - 1]; n4++; }
      const ly = t - 52 >= s.start && t - 52 <= o ? y[t - 53] / lvl : -1;
      return { x: [h, WOY(t), s.promo[t - 1], s.c, l4 / n4 / lvl, y[o - 1] / lvl, o - s.start + 1, ly], lvl };
    }
    function globalFit(S, trees) {
      const X = [], Y = [];
      for (const s of S) for (let o = s.start + 3; o < H; o += 3) for (let h = 1; h <= TW && o + h <= H; h++) { const f = feats(s, o, h); X.push(f.x); Y.push(s.y[o + h - 1] / f.lvl); }
      const t0 = performance.now(), m = Lab.gbm.fit(X, Y, { trees, depth: 3, lr: 0.1, minLeaf: 20, bins: 32 });
      return { m, rows: X.length, ms: performance.now() - t0 };
    }
    const gfc = (m, s) => Array.from({ length: TW }, (_, i) => { const f = feats(s, H, i + 1); return Math.max(0, m.predict(f.x) * f.lvl); });
    function local(s) {
      const y = s.y, idx = new Array(52).fill(1), seas = s.len >= 56;
      if (seas) {
        const sum = new Array(52).fill(0), cnt = new Array(52).fill(0);
        for (let t = s.start; t <= H; t++) {
          if (s.promo[t - 1]) continue;
          const lo = Math.max(s.start, t - 26), hi = Math.min(H, lo + 51); let a = 0, k = 0;
          for (let u = lo; u <= hi; u++) if (!s.promo[u - 1]) { a += y[u - 1]; k++; }
          if (a > 0) { sum[WOY(t)] += y[t - 1] / (a / k); cnt[WOY(t)]++; }
        }
        const raw = sum.map((v, w) => (cnt[w] ? v / cnt[w] : 1));
        for (let w = 0; w < 52; w++) idx[w] = (raw[(w + 51) % 52] + raw[w] + raw[(w + 1) % 52]) / 3;
      }
      let lvl = null; const ds = [], dp = [];
      for (let t = s.start; t <= H; t++) { const d = y[t - 1] / idx[WOY(t)]; if (s.promo[t - 1]) dp.push(d); else { ds.push(d); lvl = lvl == null ? d : 0.25 * d + 0.75 * lvl; } }
      if (lvl == null) lvl = dp.reduce((p, v) => p + v, 0) / (dp.length || 1);
      const mn = ds.length ? ds.reduce((p, v) => p + v, 0) / ds.length : lvl, lift = dp.length >= 3 && mn > 0 ? dp.reduce((p, v) => p + v, 0) / dp.length / mn : 1;
      return { f: Array.from({ length: TW }, (_, i) => lvl * idx[WOY(H + i + 1)] * (s.promo[H + i] ? lift : 1)), seas, lift, lvl, idx, nPromo: dp.length };
    }
    const wape = (f, s) => { let e = 0, a = 0; for (let i = 0; i < TW; i++) { e += Math.abs(f[i] - s.y[H + i]); a += s.y[H + i]; } return e / (a || 1); };
    const bucket = (len) => (len < 26 ? 0 : len < 56 ? 1 : 2), BN = ["under 26 weeks", "26–55 weeks", "56+ weeks"];

    function fitAll() {
      const lift = +$("#lift").value, noise = +$("#noise").value, flen = +$("#flen").value, k = [seed, lift, noise, flen].join();
      if (k !== simKey) { POPS = simulate(lift, noise, flen); POPS.forEach((s) => (s.loc = local(s))); simKey = k; poolRes = null; }
      const pool = POPS.slice(0, +$("#pool").value), G = globalFit(pool, +$("#trees").value);
      pool.forEach((s) => { s.gf = gfc(G.m, s); s.eg = wape(s.gf, s); s.el = wape(s.loc.f, s); });
      R = { pool, G };
      const sel = $("#sku"), prev = sel.value;
      sel.innerHTML = pool.map((s) => `<option value="${s.i}">${s.name} (${s.len} wks history)</option>`).join("");
      sel.value = pool.some((s) => String(s.i) === prev) ? prev : "0";
      render();
    }
    const p1 = new Plot($("#g1"), { x: [H - SHOW + 0.5, H + TW + 0.5], pad: { l: 50, b: 38 } });
    const p2 = new Plot($("#g2"), { x: [0, 3], pad: { l: 46, b: 38 } });
    const p3 = new Plot($("#g3"), { x: [0, 85], pad: { l: 46, b: 38 } });

    function d1() {
      const s = R.pool.find((x) => String(x.i) === $("#sku").value) || R.pool[0], g = p1.ctx, x0 = Math.max(s.start, H - SHOW + 1);
      p1.x = [x0 - 1.5, H + TW + 0.5]; const ys = s.y.slice(x0 - 1, H + TW), top = Math.max(...ys, ...s.gf, ...s.loc.f) * 1.12;
      p1.resize(); p1.y = [0, top]; p1.clear();
      g.save(); g.fillStyle = css("--grid"); g.fillRect(p1.sx(H + 0.5), p1.pad.t, p1.sx(H + TW + 0.5) - p1.sx(H + 0.5), p1.ih); g.restore();
      p1.axes({ xLabel: "week (forecast starts after week 104)", yLabel: "units per week", yFormat: (v) => fmt(v, 0) });
      for (let t = x0; t <= H + TW; t++) if (s.promo[t - 1]) { g.save(); g.fillStyle = css("--violet"); g.globalAlpha = 0.6; g.fillRect(p1.sx(t) - 3, p1.sy(0) - 6, 6, 6); g.restore(); }
      const hx = [], hy = []; for (let t = x0; t <= H; t++) { hx.push(t); hy.push(s.y[t - 1]); }
      p1.path(hx, hy, css("--ink"), 1.6);
      for (let t = H + 1; t <= H + TW; t++) p1.dot(t, s.y[t - 1], 3.5, css("--ink"));
      const fx = Array.from({ length: TW }, (_, i) => H + 1 + i);
      p1.path(fx, s.loc.f, css("--warm"), 2.5); p1.path(fx, s.gf, css("--accent"), 2.5);
      $("#g1Key").innerHTML = key(css("--ink"), "actual sales") + key(css("--warm"), "local: this SKU's own model") + key(css("--accent"), "global: one model, all SKUs") + `<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:7px;height:7px;background:var(--violet);opacity:.6;display:inline-block"></span>promo week</span>`;
      const why = !s.loc.seas ? `With ${s.len} weeks of history the local model can't estimate seasonality (it needs about a year), so it projects a flat level${s.loc.nPromo < 3 ? " and has too few promo weeks to estimate uplift" : ""}.` : `With ${s.len} weeks of history the local model has its own seasonal pattern${s.loc.nPromo >= 3 ? ` and its own promo uplift (×${fmt(s.loc.lift, 2)})` : ""}.`;
      $("#g1Cap").innerHTML = `${s.name}, a ${CAT[s.c].toLowerCase()} SKU. Error over the 12 forecast weeks (WAPE): global <b>${Math.round(s.eg * 100)}%</b>, local <b>${Math.round(s.el * 100)}%</b>. ${why}`;
      return s;
    }
    function d2() {
      const B = [0, 1, 2].map(() => ({ g: 0, l: 0, n: 0 }));
      R.pool.forEach((s) => { const b = B[bucket(s.len)]; b.g += s.eg; b.l += s.el; b.n++; });
      B.forEach((b) => { b.g = b.n ? b.g / b.n : NaN; b.l = b.n ? b.l / b.n : NaN; });
      const top = Math.max(0.1, ...B.flatMap((b) => [b.g, b.l]).filter(isFinite)) * 1.18, g = p2.ctx;
      p2.resize(); p2.y = [0, top]; p2.clear();
      p2.axes({ xLabel: "weeks of history (number of SKUs)", yLabel: "average WAPE", xTicks: [0.5, 1.5, 2.5], xFormat: (v) => ["< 26 wks", "26–55", "56+ wks"][Math.floor(v)] + ` (${B[Math.floor(v)].n})`, yFormat: (v) => Math.round(v * 100) + "%" });
      g.save(); g.font = "11px " + css("--font-mono"); g.textAlign = "center";
      B.forEach((b, i) => {
        if (!b.n) return;
        [["l", "--warm", -0.17], ["g", "--accent", 0.17]].forEach(([k, c, dx]) => { const x = i + 0.5 + dx, w = p2.sx(0.3) - p2.sx(0); g.fillStyle = css(c); g.fillRect(p2.sx(x) - w / 2, p2.sy(b[k]), w, p2.sy(0) - p2.sy(b[k])); g.fillStyle = css("--ink"); g.fillText(Math.round(b[k] * 100) + "%", p2.sx(x), p2.sy(b[k]) - 4); });
      });
      g.restore();
      const wins = B.map((b, i) => (b.n ? `${BN[i]}: global ${Math.round(b.g * 100)}% vs local ${Math.round(b.l * 100)}%` : null)).filter(Boolean).join("; ");
      $("#g2Cap").innerHTML = `Orange: local, blue: global. ${wins}. The shorter the history, the more the global model's shared learning is worth.`;
      return B;
    }
    function dImp() {
      const imp = R.G.m.importance.map((v, i) => [FN[i], v]).sort((a, b) => b[1] - a[1]), mx = imp[0][1] || 1;
      $("#imp").innerHTML = imp.map(([n, v]) => `<div style="display:grid;grid-template-columns:minmax(0,11.5em) 1fr 3em;gap:8px;align-items:center;font-size:.82rem"><span style="min-width:0">${n}</span><span style="height:11px;background:var(--accent);opacity:.85;border-radius:3px;width:${Math.max(1, (v / mx) * 100)}%"></span><span class="num" style="text-align:right">${Math.round(v * 100)}%</span></div>`).join("");
      $("#impCap").innerHTML = `Share of the total error reduction from splits on each feature, across all ${R.G.m.trees.length} trees. It says what the model relies on, not what causes sales.`;
    }
    function d3() {
      const g = p3.ctx; p3.resize();
      const pts = poolRes || [], top = pts.length ? Math.max(...pts.flatMap((p) => [p.g, p.l])) * 1.35 : 1;
      p3.y = [0, top]; p3.clear(); p3.axes({ xLabel: "SKUs in the global model's training pool", yLabel: "avg WAPE, first 10 SKUs", yFormat: (v) => Math.round(v * 100) + "%" });
      if (!pts.length) {
        g.save(); g.fillStyle = css("--muted"); g.font = "13px " + css("--font-body"); g.textAlign = "center"; g.fillText("Press “Run the experiment” to retrain at 5 pool sizes", p3.sx(42.5), p3.sy(top / 2)); g.restore();
        $("#g3Cap").innerHTML = `Retrains the global model on pools of 5, 10, 20, 40 and 80 SKUs and scores each on the same first 10 SKUs (the local model doesn't change with the pool). Takes a couple of seconds.`;
        return;
      }
      p3.path(pts.map((p) => p.n), pts.map((p) => p.l), css("--warm"), 2, [5, 4]);
      p3.path(pts.map((p) => p.n), pts.map((p) => p.g), css("--accent"), 2.5);
      pts.forEach((p) => p3.dot(p.n, p.g, 4.5, css("--accent"), css("--surface")));
      const a = pts[0], b = pts[pts.length - 1];
      $("#g3Cap").innerHTML = `Blue: global model error on SKUs 1–10 as the pool grows. Orange dashed: local models (no pooling). From ${a.n} to ${b.n} SKUs, global error goes from <b>${Math.round(a.g * 100)}%</b> to <b>${Math.round(b.g * 100)}%</b>, against ${Math.round(a.l * 100)}% for local. ${b.g < a.g - 0.02 ? "More related series means more examples of each season and promo to learn from." : "Here the gain from a bigger pool is small; try new random SKUs or a shorter history for the new SKU."} The curve is bumpy because each pool trains a fresh model and ten SKUs is a small test set.`;
    }
    function runPool() {
      const sizes = [5, 10, 20, 40, 80], out = [], trees = +$("#trees").value, ev = POPS.slice(0, 10);
      const lAvg = ev.reduce((a, s) => a + wape(s.loc.f, s), 0) / ev.length;
      $("#poolRun").disabled = true; $("#poolRun").textContent = "Training…";
      let i = 0;
      const step = () => {
        const n = sizes[i], G = globalFit(POPS.slice(0, n), trees);
        out.push({ n, g: ev.reduce((a, s) => a + wape(gfc(G.m, s), s), 0) / ev.length, l: lAvg });
        poolRes = out.slice(); d3();
        if (++i < sizes.length) setTimeout(step, 20); else { $("#poolRun").disabled = false; $("#poolRun").textContent = "Run the experiment"; }
      };
      setTimeout(step, 20);
    }
    function work(s) {
      const f = feats(s, H, 1), b = (t) => `<b style="color:var(--ink)">${t}</b>`, ratio = R.G.m.predict(f.x), L = s.loc, w = WOY(H + 1);
      $("#work").innerHTML = [
        `level = average of the last 8 non-promo weeks = ${b(fmt(f.lvl, 1))} units`,
        `features: ${f.x.map((v, i) => `${FN[i]} = ${i === 7 && v < 0 ? "none (−1)" : fmt(i === 1 ? v + 1 : v, [4, 5, 7].includes(i) ? 2 : 0)}`).join("; ")}`,
        `global: ${R.G.m.trees.length} trees add up to ${fmt(R.G.m.base, 3)} (average ratio) ${ratio >= R.G.m.base ? "+" : "−"} ${fmt(Math.abs(ratio - R.G.m.base), 3)} = ${fmt(ratio, 3)} × level → ${fmt(ratio, 3)} × ${fmt(f.lvl, 1)} = ${b(fmt(s.gf[0], 1))}`,
        `local: smoothed level ${fmt(L.lvl, 1)} × own seasonal index for week ${w + 1} of the year ${fmt(L.idx[w], 2)}${L.seas ? "" : " (no year of history, so 1)"}${s.promo[H] ? ` × own promo uplift ${fmt(L.lift, 2)}` : ""} = ${b(fmt(L.f[0], 1))}`,
        `actual: ${b(s.y[H])}`,
      ].map((l) => `<div style="margin-bottom:4px">${l}</div>`).join("");
    }
    function readouts() {
      const P = R.pool, eg = P.reduce((a, s) => a + s.eg, 0) / P.length, el = P.reduce((a, s) => a + s.el, 0) / P.length, w = P.filter((s) => s.eg < s.el).length;
      $("#ro").innerHTML = `<div class="ro"><b>Training rows</b><span class="num">${R.G.rows.toLocaleString()}</span></div>
        <div class="ro"><b>Training time</b><span class="num">${fmt(R.G.ms / 1000, 2)} s</span></div>
        <div class="ro"><b>Avg WAPE, global</b><span class="num">${Math.round(eg * 100)}%</span></div>
        <div class="ro"><b>Avg WAPE, local</b><span class="num">${Math.round(el * 100)}%</span></div>
        <div class="ro"><b>SKUs where global wins</b><span class="pill ${w > P.length / 2 ? "ok" : "warn"}">${w} of ${P.length}</span></div>`;
    }
    function labels() {
      $("#poolV").textContent = $("#pool").value; $("#flenV").textContent = $("#flen").value + " wks"; $("#liftV").textContent = "+" + Math.round(+$("#lift").value * 100) + "%";
      $("#noiseV").textContent = "±" + Math.round(+$("#noise").value * 100) + "%"; $("#treesV").textContent = $("#trees").value;
    }
    function render() { const s = d1(); d2(); dImp(); d3(); work(s); readouts(); }
    let timer = null;
    const refit = () => { labels(); clearTimeout(timer); timer = setTimeout(fitAll, 60); };
    ["#pool", "#flen", "#lift", "#noise", "#trees"].forEach((id) => { $(id).addEventListener("input", labels); $(id).addEventListener("change", refit); });
    $("#sku").addEventListener("change", render);
    $("#poolRun").addEventListener("click", runPool);
    $("#reseed").addEventListener("click", () => { seed = (seed * 7 + 13) % 9973; fitAll(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 7; labels(); $("#sku").value = "0"; fitAll(); $("#sku").value = "0"; render(); });
    labels(); fitAll();
    return watch([$("#g1"), $("#g2"), $("#g3")], () => R && render());
  },
});
