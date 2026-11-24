Lab.register({
  id: "supply-network",
  group: "Supply chain",
  title: "Safety stock across a supply network",
  blurb: "A supplier, distribution centres and stores, each link with its own lead time. Decide where to hold safety stock: at the stores, pooled at the DCs, or the cheapest split.",
  lede: "Real networks have more than one stocking point. A store can hold enough stock to cover the whole journey from the supplier, or the distribution centre (DC) can hold a pooled buffer and promise the store fast, reliable deliveries. Holding at the DC pools risk across its stores; holding at the store keeps stock close to the customer. The right answer depends on each link's lead time, how variable it is, and what stock costs at each level.",
  quiz: [
    ["A DC is 4 weeks from the supplier and 1 week from its stores. If the DC holds no stock, what lead time must each store cover?", "4 + 1 = 5 weeks. The store's safety stock has to cover demand uncertainty over the full 5 weeks, plus any lead-time variability on both links."],
    ["Holding the buffer at the DC lets demand cancel out across stores. Why can it still need more units in total?", "Because the cover time is split between two levels. Safety stock grows with √time, so covering 4 weeks at the DC and 1 week at the store (√4 + √1 = 3) needs more than 5 weeks at one point (√5 ≈ 2.24). Pooling saves units only when it outweighs this split penalty: many stores, low correlation, short last legs. Lead-time variability shared by every store can't be pooled at all."],
    ["When would you still put most of the safety stock at the stores?", "When stock costs much more to hold at the DC than at the store (rare), when the DC-to-store leg is long and unreliable, or when the DC serves only one or two stores so there's little to pool."],
    ["The supplier's lead time to a DC rises from 4 to 10 weeks. Why does the cheapest plan usually hold more of the extra stock at the DC rather than the stores?", "The extra 6 weeks have to be covered somewhere. At the DC they're covered once, against the pooled demand of all its stores, whose ups and downs partly cancel. At the stores each one covers them separately. So the longer the upstream leg, the more pooling at the DC is worth (Trade-off 2, first option)."],
    ["Why do all three strategies rise together when the supplier becomes unreliable, with no strategy escaping it?", "A late delivery from the supplier delays stock for every store at once, so those shortfalls don't cancel out across stores. Pooling cancels independent demand noise, not a shared lead-time shock. Only a more reliable supplier, or more stock, fixes it."],
    ["What does a DC 'service time' of 2 weeks mean?", "The DC promises to ship a store's order within 2 weeks. It needs less stock than a DC that ships immediately, but each store must then cover 2 more weeks itself. The optimizer searches for the cheapest promise."],
  ],
  diy: {
    intro: "Supplier lead time to the DC in H1, DC→store lead time in H2, DC promise to stores in H3, weekly store demand μ and σ in H4:H5, lead-time SD in H6, service z in H7.",
    steps: [
      ["Net replenishment time at the DC and at the store.", "DC: =MAX(0,H1-H3)\nStore: =H3+H2"],
      ["Safety stock at a stage with net time T.", "=$H$7*SQRT(T*$H$5^2+$H$4^2*$H$6^2)"],
      ["DC safety stock uses the pooled demand of all stores.", "σ_DC: =H5*SQRT(n_stores)"],
      ["Total holding cost for a promise.", "=SS_DC*value_DC*carry+n_stores*SS_store*value_store*carry"],
      ["Try promises 0 to H1 in a Data Table and pick the cheapest.", "What-If Analysis > Data Table"],
    ],
  },
  deeper: [
    ["Graves & Willems (2000), Optimizing strategic safety stock placement", "https://doi.org/10.1287/msom.2.1.68.23267", "the guaranteed-service model used here"],
    ["Multi-echelon inventory — overview", "https://en.wikipedia.org/wiki/Inventory_optimization", "Wikipedia on inventory optimization across networks"],
    ["Risk pool — Wikipedia", "https://en.wikipedia.org/wiki/Risk_pool", "why a shared buffer needs less stock"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="38" y="2" width="20" height="12" rx="2" fill="currentColor" fill-opacity=".3"/><rect x="12" y="24" width="22" height="12" rx="2"/><rect x="62" y="24" width="22" height="12" rx="2"/><g fill="currentColor"><circle cx="8" cy="54" r="5"/><circle cx="24" cy="54" r="5"/><circle cx="40" cy="54" r="5"/><circle cx="64" cy="54" r="5"/><circle cx="84" cy="54" r="5"/></g><path d="M48 14 L23 24 M48 14 L73 24 M23 36 L8 49 M23 36 L24 49 M23 36 L40 49 M73 36 L64 49 M73 36 L84 49"/></svg>`,

  mount(root) {
    const { fmt, css, qnorm, watch } = Lab;
    let DCS = [
      { name: "DC North", L: 4, sL: 0.5 },
      { name: "DC South", L: 6, sL: 1.5 },
    ];
    let STORES = [
      { name: "Store 1", dc: 0, L: 1, sL: 0, mu: 120, sd: 40 },
      { name: "Store 2", dc: 0, L: 1, sL: 0, mu: 80, sd: 30 },
      { name: "Store 3", dc: 0, L: 2, sL: 0.5, mu: 100, sd: 35 },
      { name: "Store 4", dc: 0, L: 1, sL: 0, mu: 60, sd: 25 },
      { name: "Store 5", dc: 1, L: 1, sL: 0, mu: 150, sd: 45 },
      { name: "Store 6", dc: 1, L: 2, sL: 0, mu: 90, sd: 30 },
      { name: "Store 7", dc: 1, L: 4, sL: 1, mu: 70, sd: 30 },
    ];
    const STRATS = [
      { id: "store", name: "All at stores", col: "--warm" },
      { id: "dc", name: "Pooled at DCs", col: "--violet" },
      { id: "opt", name: "Cheapest split", col: "--accent" },
    ];

    // Lead-time scenarios, each a change to the starting network.
    const SCEN = [
      { name: "Starting network", why: "The network as first loaded.", f: () => {} },
      { name: "Slow supplier (+6 wk)", why: "Both DCs now wait 6 weeks longer for the supplier: North 10 wk, South 12 wk.", f: (D) => D.forEach((d) => (d.L += 6)) },
      { name: "Unreliable supplier", why: "Supplier lead times stay the same length but swing much more: ±2.5 wk to North, ±3 wk to South.", f: (D) => { D[0].sL = 2.5; D[1].sL = 3; } },
      { name: "Long last leg (+3 wk)", why: "Every DC→store delivery takes 3 weeks longer, e.g. stores far from their DC or a slow carrier.", f: (D, S) => S.forEach((s) => (s.L += 3)) },
      { name: "One remote store", why: "Store 3 is now 6 weeks from DC North, ±2 weeks.", f: (D, S) => { S[2].L = 6; S[2].sL = 2; } },
      { name: "Fast local supplier", why: "The supplier is 1 week from North and 2 from South, and always on time.", f: (D) => { D[0].L = 1; D[1].L = 2; D.forEach((d) => (d.sL = 0)); } },
    ];
    // Things to vary in trade-off chart 2. set(D, S, x) changes a copy of the network; prm(x) changes the sliders.
    const SWEEPS = [
      { name: "Supplier lead time to DC North", xl: "weeks from supplier to DC North", xs: [...Array(17).keys()], cur: (D) => D[0].L, set: (D, S, x) => (D[0].L = x) },
      { name: "Supplier lead time to DC South", xl: "weeks from supplier to DC South", xs: [...Array(17).keys()], cur: (D) => D[1] ? D[1].L : 0, set: (D, S, x) => D[1] && (D[1].L = x) },
      { name: "DC→store lead time (all stores)", xl: "weeks from DC to every store", xs: [...Array(11).keys()], cur: (D, S) => S[0] ? S[0].L : 0, set: (D, S, x) => S.forEach((s) => (s.L = x)) },
      { name: "Supplier reliability (± SD, both DCs)", xl: "± weeks of supplier lead-time SD", xs: Array.from({ length: 17 }, (_, i) => i * 0.25), cur: (D) => D[0].sL, set: (D, S, x) => D.forEach((d) => (d.sL = x)) },
      { name: "Service level", xl: "service level at stores (%)", xs: Array.from({ length: 40 }, (_, i) => 80 + i * 0.5), cur: () => +$("#sl").value, set: () => {}, prm: (p, x) => (p.z = qnorm(x / 100)) },
    ];

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot" style="padding:14px">
          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
            <h4 style="margin:0;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">The network and its safety stock</h4>
            <div class="seg" id="st" style="min-width:300px">${STRATS.map((s, i) => `<button type="button" data-v="${s.id}" aria-pressed="${i === 2}">${s.name}</button>`).join("")}</div>
          </div>
          <div style="overflow-x:auto"><svg id="net" viewBox="0 0 760 330" style="width:100%;min-width:600px;display:block"></svg></div>
          <p class="hint">Numbers on links are lead times in weeks (± their standard deviation). The bar and number in each node are its safety stock under the chosen strategy. "Promise" is how quickly the DC guarantees to ship to its stores.</p>
        </div>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 8px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">What if lead times were longer somewhere?</h4>
          <div class="btns" id="scn">${SCEN.map((c, i) => `<button class="btn" type="button" data-i="${i}" aria-pressed="${i === 0}">${c.name}</button>`).join("")}</div>
          <p id="scnTxt" style="margin:10px 0 0;font-size:.92rem"></p>
        </div>
        <figure class="plot wide" style="padding:8px 8px 4px">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:4px 6px 6px">
            <h4 style="margin:0;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Trade-off 1: how fast should the DC promise to ship?</h4>
            <select id="tdc" aria-label="DC for the promise trade-off" style="width:auto"></select>
          </div>
          <canvas id="cPro"></canvas>
          <div class="legend"><span><i style="background:var(--violet)"></i>DC holding cost</span><span><i style="background:var(--warm)"></i>store holding cost</span><span><i style="background:var(--accent)"></i>total</span></div>
          <figcaption id="proCap"></figcaption>
        </figure>
        <figure class="plot wide" style="padding:8px 8px 4px">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:4px 6px 6px">
            <h4 style="margin:0;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Trade-off 2: what happens as one thing changes</h4>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <select id="sv" aria-label="What to vary" style="width:auto">${SWEEPS.map((w, i) => `<option value="${i}">${w.name}</option>`).join("")}</select>
              <div class="seg" id="sy" style="min-width:170px"><button type="button" data-v="cost" aria-pressed="true">Cost / week</button><button type="button" data-v="units" aria-pressed="false">Units</button></div>
            </div>
          </div>
          <canvas id="cSw"></canvas>
          <div class="legend">${STRATS.map((s) => `<span><i style="background:var(${s.col})"></i>${s.name}</span>`).join("")}<span><i style="background:var(--muted);height:2px"></i>today's value</span></div>
          <figcaption id="swCap"></figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Comparing the strategies</h4>
          <div style="overflow-x:auto"><table id="cmp" style="width:100%;border-collapse:collapse;font-size:.86rem;font-variant-numeric:tabular-nums"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Edit the network</h4>
          <p class="hint" style="margin:0 0 10px">Change any number and everything recalculates. Demand is weekly.</p>
          <div style="overflow-x:auto"><table id="edDc" style="border-collapse:collapse;font-size:.84rem;margin-bottom:12px"></table></div>
          <div style="overflow-x:auto"><table id="edSt" style="border-collapse:collapse;font-size:.84rem"></table></div>
        </div>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Worked out for one DC</h4>
          <select id="wdc" aria-label="DC to show" style="margin-bottom:8px"></select>
          <div id="work" style="font-family:var(--font-mono);font-size:.82rem;line-height:1.9;overflow-x:auto"></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="sl">Service level at stores <output id="slV"></output></label><input type="range" id="sl" min="80" max="99.5" step="0.5" value="95"></div>
        <div class="ctrl"><label for="hd">Holding cost at a DC (per unit per week) <output id="hdV"></output></label><input type="range" id="hd" min="0.1" max="3" step="0.1" value="1"></div>
        <div class="ctrl"><label for="hs">Holding cost at a store <output id="hsV"></output></label><input type="range" id="hs" min="0.1" max="3" step="0.1" value="1.5"></div>
        <div class="ctrl"><label for="rho">Correlation between stores <output id="rhoV"></output></label><input type="range" id="rho" min="0" max="1" step="0.05" value="0"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset network</button></div>`,
      notes: `
        <section>
          <h2>How each node's safety stock is set</h2>
          <p>Each stocking point covers its <b>net replenishment time</b>: how long from placing an order until it can rely on the goods, minus what it promises its own customers.</p>
          <div class="eq">net time (DC) = supplier lead time − DC promise<br>net time (store) = DC promise + DC→store lead time<br>SS = z × √(net time × σ<sub>d</sub>² + μ² × σ<sub>L</sub>²)</div>
          <p>For a DC, σ<sub>d</sub> is the pooled weekly SD of all its stores' demand: √(Σσ² + correlation terms). The σ<sub>L</sub> term adds lead-time variability for each leg the node is exposed to.</p>
        </section>
        <section>
          <h2>The three strategies</h2>
          <ul>
            <li><b>All at stores:</b> DCs promise nothing (they cross-dock and pass stock straight through), so each store covers supplier + DC legs itself. No pooling.</li>
            <li><b>Pooled at DCs:</b> DCs promise to ship immediately, so they cover the long supplier leg for all their stores together. Stores only cover their own short leg.</li>
            <li><b>Cheapest split:</b> for each DC, try every whole-week promise from 0 to its supplier lead time, and keep the one with the lowest holding cost. This is the <i>guaranteed-service model</i> used in multi-echelon inventory software.</li>
          </ul>
          <p>Pipeline stock (goods in transit) is the same under every strategy, so it's left out.</p>
        </section>
        <section>
          <h2>Reading the trade-off charts</h2>
          <p><b>Trade-off 1</b> shows one DC's choice. Promise 0 weeks and the DC holds the buffer for the whole supplier leg; promise the full supplier lead time and the DC just passes stock through, so the stores hold it all. Every week of promise moves cover from the DC (violet) to the stores (orange). The total (blue) usually bottoms out at an end, because safety stock grows with √time and splitting the cover is wasteful. That's why guaranteed-service plans tend to be "all or nothing" at each stage.</p>
          <p><b>Trade-off 2</b> re-runs the whole network for every value of one setting and plots the three strategies. The gap between the dashed lines and the solid blue line is what good stock placement is worth. The dotted line marks today's value.</p>
          <p><b>Scenarios</b> change lead times at different points and compare with the starting network, so you can see where a longer or less reliable lead time hurts most.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Compare the totals. Surprise: with these numbers, pooling at the DCs needs <i>more</i> units, yet it's cheaper because DC stock costs less to hold. Two forces fight. Pooling lets demands cancel out, but splitting one long cover period into two shorter ones costs extra, because √4 + √1 = 3 is more than √5 ≈ 2.24. Supplier lead-time variability hits every store at once, so pooling can't cancel it.</li>
            <li>Set both DCs' supplier ± SD to 0. Pooling now wins on units at DC North (4 stores), but not at DC South, where Store 7's 4-week last leg still has to be covered at the store.</li>
            <li>Raise the correlation to 1. Pooling stops helping, and the gap between strategies shrinks.</li>
            <li>Make DC holding cost 3 and store cost 0.5. The cheapest split now promises longer and pushes stock to the stores.</li>
            <li>Give Store 7 a 6-week lead time with SD 2. It needs a big buffer whatever the DC does: a long, unreliable last leg can't be pooled away.</li>
            <li>Move all the stores to one DC. Its pooled buffer gets relatively smaller.</li>
          </ol>
          <p>Background: <a href="#risk-pooling">risk pooling</a>, <a href="#reorder-point">safety stock</a> and <a href="#lead-time-error">lead-time error</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const DEF = { DCS: JSON.parse(JSON.stringify(DCS)), STORES: JSON.parse(JSON.stringify(STORES)) };
    let strat = "opt", R = null;

    const clone = (x) => JSON.parse(JSON.stringify(x));
    const params = () => ({ z: qnorm(+$("#sl").value / 100), hd: +$("#hd").value, hs: +$("#hs").value, rho: +$("#rho").value });

    // The whole calculation for one network: every DC promise option, and the three strategies' totals.
    function model(DCS, STORES, { z, hd, hs, rho }) {
      const ssStore = (s, promise, dcSL) => z * Math.sqrt((promise + s.L) * s.sd * s.sd + s.mu * s.mu * (s.sL * s.sL + (promise > 0 ? dcSL * dcSL : 0)));
      const dcs = DCS.map((d, j) => {
        const st = STORES.filter((s) => s.dc === j);
        const mu = st.reduce((a, s) => a + s.mu, 0);
        let v = st.reduce((a, s) => a + s.sd * s.sd, 0);
        st.forEach((a, i) => st.forEach((b, k) => { if (i !== k) v += rho * a.sd * b.sd; }));
        const sd = Math.sqrt(v);
        const ssDc = (promise) => (d.L - promise <= 0 ? 0 : z * Math.sqrt((d.L - promise) * sd * sd + mu * mu * d.sL * d.sL));
        const options = [];
        for (let p = 0; p <= d.L; p++) {
          const sdc = ssDc(p), ss = st.map((s) => ssStore(s, p, d.sL)), sst = ss.reduce((a, b) => a + b, 0);
          options.push({ p, sdc, ss, cDc: hd * sdc, cSt: hs * sst, cost: hd * sdc + hs * sst });
        }
        const best = options.reduce((a, b) => (b.cost < a.cost - 1e-9 ? b : a));
        return { d, j, st, mu, sd, options, pick: { store: options[d.L], dc: options[0], opt: best } };
      });
      const tot = Object.fromEntries(STRATS.map((s) => {
        let u = 0, c = 0, uDc = 0;
        dcs.forEach((x) => { const o = x.pick[s.id]; u += o.sdc + o.ss.reduce((a, b) => a + b, 0); uDc += o.sdc; c += o.cost; });
        return [s.id, { units: u, cost: c, uDc }];
      }));
      return { dcs, tot };
    }

    function compute() {
      const prm = params();
      R = Object.assign(model(DCS, STORES, prm), prm);
    }

    function drawNet() {
      const { dcs, tot } = R, W = 760, ink = css("--ink"), mut = css("--muted"), line = css("--line"), surf = css("--surface"), font = css("--font-mono"), body = css("--font-body");
      const col = css(STRATS.find((s) => s.id === strat).col);
      const maxSS = Math.max(1, ...STRATS.flatMap((s) => dcs.flatMap((x) => [x.pick[s.id].sdc, ...x.pick[s.id].ss])));
      const sup = [W / 2, 30];
      let svg = `<rect x="${sup[0] - 60}" y="${sup[1] - 18}" width="120" height="36" rx="6" fill="${surf}" stroke="${line}"/><text x="${sup[0]}" y="${sup[1] + 5}" text-anchor="middle" font-family="${body}" font-size="13" font-weight="600" fill="${ink}">Supplier</text>`;
      const nDc = dcs.length, allStores = STORES.length;
      let sx = 0;
      dcs.forEach((x, j) => {
        const n = x.st.length, slotW = W / Math.max(1, allStores), cx = n ? (sx + n / 2) * slotW : ((j + 0.5) * W) / nDc, cy = 140, o = x.pick[strat];
        svg += `<line x1="${sup[0]}" y1="${sup[1] + 18}" x2="${cx}" y2="${cy - 30}" stroke="${line}" stroke-width="2"/>`;
        svg += `<text x="${(sup[0] + cx) / 2 + (cx < sup[0] ? -8 : 8)}" y="${(sup[1] + cy) / 2 + 4}" text-anchor="${cx < sup[0] ? "end" : "start"}" font-family="${font}" font-size="11" fill="${mut}">${x.d.L} wk${x.d.sL ? " ±" + x.d.sL : ""}</text>`;
        const bw = (o.sdc / maxSS) * 110;
        svg += `<rect x="${cx - 70}" y="${cy - 30}" width="140" height="60" rx="8" fill="${surf}" stroke="${line}"/>
          <text x="${cx}" y="${cy - 12}" text-anchor="middle" font-family="${body}" font-size="12.5" font-weight="600" fill="${ink}">${x.d.name}</text>
          <rect x="${cx - 55}" y="${cy - 4}" width="${Math.max(1, bw)}" height="9" rx="2" fill="${col}"/>
          <text x="${cx}" y="${cy + 24}" text-anchor="middle" font-family="${font}" font-size="10.5" fill="${mut}">SS ${fmt(o.sdc, 0)} · promise ${o.p} wk</text>`;
        x.st.forEach((s, k) => {
          const px = (sx + k + 0.5) * slotW, py = 262, ss = o.ss[k], r = 6 + Math.sqrt(ss / maxSS) * 18;
          svg += `<line x1="${cx}" y1="${cy + 30}" x2="${px}" y2="${py - r - 2}" stroke="${line}" stroke-width="1.5"/>
            <text x="${(cx + px) / 2 + (px < cx ? -5 : 5)}" y="${(cy + 30 + py - r) / 2 + 4}" text-anchor="${px < cx ? "end" : "start"}" font-family="${font}" font-size="10" fill="${mut}">${s.L}${s.sL ? "±" + s.sL : ""}</text>
            <circle cx="${px}" cy="${py}" r="${r}" fill="${col}" fill-opacity=".35" stroke="${col}"/>
            <text x="${px}" y="${py + r + 14}" text-anchor="middle" font-family="${body}" font-size="11" fill="${ink}">${s.name}</text>
            <text x="${px}" y="${py + r + 27}" text-anchor="middle" font-family="${font}" font-size="10.5" fill="${mut}">SS ${fmt(ss, 0)}</text>`;
        });
        sx += n;
      });
      svg += `<text x="8" y="324" font-family="${font}" font-size="11" fill="${mut}">Total safety stock: ${fmt(tot[strat].units, 0)} units · holding cost ${fmt(tot[strat].cost, 0)} per week</text>`;
      $("#net").innerHTML = svg;
    }

    function drawTables() {
      const { tot, dcs } = R, best = Math.min(...STRATS.map((s) => tot[s.id].cost));
      const th = (t, l) => `<th style="text-align:${l ? "left" : "right"};padding:6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted)">${t}</th>`;
      const td = (t, x = "") => `<td style="text-align:right;padding:6px;border-bottom:1px solid var(--grid);font-family:var(--font-mono);${x}">${t}</td>`;
      const mx = Math.max(...STRATS.map((s) => tot[s.id].units));
      $("#cmp").innerHTML = `<tr>${th("Strategy", 1)}${th("Total safety stock", 1)}${th("held at DCs")}${th("held at stores")}${th("holding cost / week")}${th("DC promises")}</tr>` +
        STRATS.map((s) => `<tr${s.id === strat ? ' style="background:var(--accent-soft)"' : ""}><td style="padding:6px;border-bottom:1px solid var(--grid)">${s.name}</td>
          <td style="padding:6px;border-bottom:1px solid var(--grid);min-width:170px"><div style="display:flex;align-items:center;gap:8px"><div style="height:12px;border-radius:3px;background:var(${s.col});width:${(tot[s.id].units / mx) * 110}px"></div><span style="font-family:var(--font-mono)">${fmt(tot[s.id].units, 0)}</span></div></td>
          ${td(fmt(tot[s.id].uDc, 0))}${td(fmt(tot[s.id].units - tot[s.id].uDc, 0))}${td(fmt(tot[s.id].cost, 0), tot[s.id].cost === best ? "color:var(--good);font-weight:700" : "")}${td(dcs.map((x) => x.pick[s.id].p + " wk").join(", "))}</tr>`).join("");
      $("#ro").innerHTML = `<div class="ro"><b>z</b><span class="num">${R.z.toFixed(3)}</span></div>` + STRATS.map((s) => `<div class="ro"><b>${s.name}</b><span class="${tot[s.id].cost === best ? "pill ok" : "num"}">${fmt(tot[s.id].units, 0)} units</span></div>`).join("");

      // worked example for one DC
      const j = Math.min(+$("#wdc").value || 0, dcs.length - 1), x = dcs[j];
      if (!x) return;
      const b = (t) => `<b style="color:var(--ink)">${t}</b>`, mu = (t) => `<span style="color:var(--muted)">${t}</span>`;
      const lines = [
        `${x.d.name}: ${x.st.length} stores, pooled weekly demand μ = ${fmt(x.mu, 0)}, σ = √(${x.st.map((s) => s.sd + "²").join(" + ")}${+$("#rho").value ? " + correlation terms" : ""}) = ${b(fmt(x.sd, 1))}`,
        mu(`each row: DC promise p → DC covers ${x.d.L} − p weeks; each store covers p + its own leg`),
      ];
      x.options.forEach((o) => {
        lines.push(`p = ${o.p}: DC SS ${fmt(o.sdc, 0)} + stores ${o.ss.map((v) => fmt(v, 0)).join(" + ")} → cost ${R.hd} × ${fmt(o.sdc, 0)} + ${R.hs} × ${fmt(o.ss.reduce((a, c) => a + c, 0), 0)} = ${o === x.pick.opt ? b(fmt(o.cost, 1) + " ← cheapest") : fmt(o.cost, 1)}`);
      });
      $("#work").innerHTML = lines.map((l) => `<div style="white-space:nowrap">${l}</div>`).join("");
    }

    const pPro = new Lab.Plot($("#cPro"), { pad: { l: 52, b: 40 } });
    const pSw = new Lab.Plot($("#cSw"), { pad: { l: 52, b: 40 } });
    let sy = "cost", scn = 0;

    function drawPromise() {
      const j = Math.min(+$("#tdc").value || 0, R.dcs.length - 1), x = R.dcs[j];
      if (!x) return;
      const O = x.options, ps = O.map((o) => o.p), top = Math.max(1, ...O.map((o) => o.cost)) * 1.1;
      pPro.resize(); pPro.x = [0, Math.max(1, x.d.L)]; pPro.y = [0, top];
      pPro.clear();
      pPro.axes({ xLabel: "DC promise to its stores (weeks)", yLabel: "holding cost per week", xTicks: x.d.L <= 12 ? ps : undefined, yFormat: (v) => fmt(v, 0) });
      pPro.path(ps, O.map((o) => o.cDc), css("--violet"), 2);
      pPro.path(ps, O.map((o) => o.cSt), css("--warm"), 2);
      pPro.path(ps, O.map((o) => o.cost), css("--accent"), 3);
      O.forEach((o) => pPro.dot(o.p, o.cost, 3, css("--accent")));
      const b = x.pick.opt, g = pPro.ctx;
      pPro.dot(b.p, b.cost, 7, null, css("--good"));
      g.save(); g.fillStyle = css("--good"); g.font = `600 12px ${css("--font-body")}`; g.textAlign = b.p > x.d.L / 2 ? "right" : "left";
      g.fillText(`cheapest: ${b.p} wk, ${fmt(b.cost, 0)}/wk`, pPro.sx(b.p) + (b.p > x.d.L / 2 ? -10 : 10), pPro.sy(b.cost) - 10); g.restore();
      const o0 = O[0], oL = O[O.length - 1];
      $("#proCap").innerHTML = `${x.d.name}: promising <b>0 weeks</b> (DC holds the buffer) costs ${fmt(o0.cost, 0)}/wk; promising the full <b>${x.d.L} weeks</b> (stores hold it all) costs ${fmt(oL.cost, 0)}/wk. ` +
        (b.p === 0 ? "Here it's cheapest for the DC to hold everything." : b.p === x.d.L ? "Here it's cheapest to push everything to the stores." : `The cheapest is in between, at ${b.p} weeks.`) +
        ` Each extra week of promise moves stock from the violet line to the orange one. Try the scenarios above and watch the low point move.`;
    }

    function sweepData() {
      const w = SWEEPS[+$("#sv").value], prm0 = params();
      const out = { w, xs: w.xs, cur: w.cur(DCS, STORES), s: Object.fromEntries(STRATS.map((t) => [t.id, []])) };
      w.xs.forEach((xv) => {
        const D = clone(DCS), S = clone(STORES), prm = Object.assign({}, prm0);
        w.set(D, S, xv); if (w.prm) w.prm(prm, xv);
        const m = model(D, S, prm);
        STRATS.forEach((t) => out.s[t.id].push(m.tot[t.id][sy]));
      });
      return out;
    }

    function drawSweep() {
      const d = sweepData(), all = STRATS.flatMap((t) => d.s[t.id]);
      pSw.resize(); pSw.x = [d.xs[0], d.xs[d.xs.length - 1]]; pSw.y = [0, Math.max(1, ...all) * 1.08];
      pSw.clear();
      pSw.axes({ xLabel: d.w.xl, yLabel: sy === "cost" ? "holding cost per week" : "safety stock units", yFormat: (v) => fmt(v, 0) });
      [...STRATS].reverse().forEach((t) => pSw.path(d.xs, d.s[t.id], css(t.col), t.id === "opt" ? 4 : 2, t.id === "opt" ? null : [6, 4]));
      const g = pSw.ctx, cx = pSw.sx(d.cur);
      g.save(); g.strokeStyle = css("--muted"); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(cx, pSw.pad.t); g.lineTo(cx, pSw.h - pSw.pad.b); g.stroke();
      g.fillStyle = css("--muted"); g.font = `11px ${css("--font-mono")}`; g.textAlign = cx > pSw.w * 0.7 ? "right" : "left"; g.fillText("today", cx + (cx > pSw.w * 0.7 ? -5 : 5), pSw.pad.t + 22); g.restore();
      // caption: compare the ends of the range
      const i0 = 0, i1 = d.xs.length - 1, f = (v) => fmt(v, 0), u = sy === "cost" ? "/wk" : " units";
      const gap = (i) => d.s.store[i] - d.s.opt[i];
      const lbl = (v) => (d.w.name === "Service level" ? v + "%" : d.w.xl.includes("SD") ? "±" + v + " wk" : v + " wk");
      $("#swCap").innerHTML = `From ${lbl(d.xs[i0])} to ${lbl(d.xs[i1])}, the cheapest split goes from ${f(d.s.opt[i0])} to ${f(d.s.opt[i1])}${u}, ` +
        `while holding everything at the stores goes from ${f(d.s.store[i0])} to ${f(d.s.store[i1])}${u}. ` +
        `The saving from placing stock well is ${f(gap(i0))}${u} at the left end and ${f(gap(i1))}${u} at the right. ` +
        (d.w.name.startsWith("Supplier lead time") ? "Longer upstream lead times make a pooled DC buffer more valuable, because the DC covers that long leg once for all its stores." :
          d.w.name.startsWith("DC→store") ? "Longer last legs can't be pooled: every store must cover its own leg whatever the DC does, so the advantage of holding stock at the DC shrinks." :
          d.w.name.startsWith("Supplier reliability") ? "Lead-time swings hit every store at the same time, so pooling can't cancel them out, and every strategy rises steeply. An unreliable supplier is often costlier than a slow one." :
          "Safety stock rises slowly at first, then steeply near 100%, because z grows faster and faster.");
    }

    function scenarioText() {
      const prm = params(), base = model(DEF.DCS, DEF.STORES, prm), now = R;
      const c = SCEN[scn], f = (v) => fmt(v, 0);
      const pr = (m) => m.dcs.map((x) => `${x.d.name} ${x.pick.opt.p} wk`).join(", ");
      const d = now.tot.opt.cost - base.tot.opt.cost;
      $("#scnTxt").innerHTML = scn === -1 ? "You've edited the network by hand. Pick a scenario to compare, or keep exploring." :
        `<b>${c.name}.</b> ${c.why} ` + (scn === 0 ? `With the cheapest split, the network holds ${f(now.tot.opt.units)} units of safety stock at ${f(now.tot.opt.cost)}/wk. Best promises: ${pr(now)}.` :
        `Cheapest split: ${f(base.tot.opt.units)} → <b>${f(now.tot.opt.units)} units</b>, ${f(base.tot.opt.cost)} → <b>${f(now.tot.opt.cost)}/wk</b> (<span style="color:var(${d > 0 ? "--bad" : "--good"})">${d > 0 ? "+" : "−"}${f(Math.abs(d))}/wk</span>). ` +
        `All at stores: ${f(base.tot.store.cost)} → ${f(now.tot.store.cost)}/wk. Pooled at DCs: ${f(base.tot.dc.cost)} → ${f(now.tot.dc.cost)}/wk. ` +
        `Best promises: ${pr(base)} → <b>${pr(now)}</b>.`);
    }

    function editors() {
      const inp = (v, attrs) => `<input type="number" ${attrs} value="${v}" style="width:68px;font:inherit;font-family:var(--font-mono);padding:4px 6px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink)">`;
      const th = (t) => `<th style="text-align:left;padding:4px 8px;font-weight:500;color:var(--muted)">${t}</th>`;
      $("#edDc").innerHTML = `<tr>${th("DC")}${th("lead time from supplier (wk)")}${th("± SD")}</tr>` + DCS.map((d, j) => `<tr><td style="padding:4px 8px">${d.name}</td><td style="padding:4px 8px">${inp(d.L, `data-t="dc" data-i="${j}" data-k="L" min="0" max="20" step="1"`)}</td><td style="padding:4px 8px">${inp(d.sL, `data-t="dc" data-i="${j}" data-k="sL" min="0" max="5" step="0.5"`)}</td></tr>`).join("");
      $("#edSt").innerHTML = `<tr>${th("Store")}${th("served by")}${th("lead time from DC")}${th("± SD")}${th("weekly demand μ")}${th("SD σ")}</tr>` + STORES.map((s, i) => `<tr><td style="padding:4px 8px">${s.name}</td>
        <td style="padding:4px 8px"><select data-t="st" data-i="${i}" data-k="dc">${DCS.map((d, j) => `<option value="${j}" ${s.dc === j ? "selected" : ""}>${d.name}</option>`).join("")}</select></td>
        <td style="padding:4px 8px">${inp(s.L, `data-t="st" data-i="${i}" data-k="L" min="0" max="20" step="1"`)}</td><td style="padding:4px 8px">${inp(s.sL, `data-t="st" data-i="${i}" data-k="sL" min="0" max="5" step="0.5"`)}</td>
        <td style="padding:4px 8px">${inp(s.mu, `data-t="st" data-i="${i}" data-k="mu" min="0" max="1000" step="10"`)}</td><td style="padding:4px 8px">${inp(s.sd, `data-t="st" data-i="${i}" data-k="sd" min="0" max="500" step="5"`)}</td></tr>`).join("");
      root.querySelectorAll("#edDc [data-t], #edSt [data-t]").forEach((el) => el.addEventListener("input", () => {
        const v = Math.max(0, +el.value); if (!isFinite(v)) return;
        const tgt = el.dataset.t === "dc" ? DCS[+el.dataset.i] : STORES[+el.dataset.i];
        tgt[el.dataset.k] = el.dataset.k === "L" ? Math.round(v) : v;
        setScn(-1); update();
      }));
      $("#wdc").innerHTML = DCS.map((d, j) => `<option value="${j}">${d.name}</option>`).join("");
      const t = $("#tdc").value; $("#tdc").innerHTML = $("#wdc").innerHTML; if (t) $("#tdc").value = t;
    }

    function update() {
      $("#slV").textContent = $("#sl").value + "%"; $("#hdV").textContent = (+$("#hd").value).toFixed(1); $("#hsV").textContent = (+$("#hs").value).toFixed(1); $("#rhoV").textContent = (+$("#rho").value).toFixed(2);
      compute(); drawNet(); drawTables(); drawPromise(); drawSweep(); scenarioText();
    }
    function setScn(i) { scn = i; $("#scn").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === i))); }
    $("#scn").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      const D = clone(DEF.DCS), S = clone(DEF.STORES); SCEN[+b.dataset.i].f(D, S); DCS = D; STORES = S;
      setScn(+b.dataset.i); editors(); update();
    }));
    $("#tdc").addEventListener("change", drawPromise);
    $("#sv").addEventListener("change", drawSweep);
    $("#sy").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { sy = b.dataset.v; $("#sy").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); drawSweep(); }));

    $("#st").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { strat = b.dataset.v; $("#st").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); update(); }));
    ["#sl", "#hd", "#hs", "#rho"].forEach((s) => $(s).addEventListener("input", update));
    $("#wdc").addEventListener("change", drawTables);
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); DCS = clone(DEF.DCS); STORES = clone(DEF.STORES); setScn(0); editors(); update(); });
    editors(); update();
    return watch([$("#cPro"), $("#cSw")], () => { drawNet(); drawPromise(); drawSweep(); });
  },
});
