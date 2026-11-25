Lab.register({
  id: "supplier-disruption",
  group: "Risk",
  title: "Supplier disruption: time to recover, time to survive, concentration",
  blurb: "For each supplier site, compare how long it would take to recover (TTR) with how long you could keep shipping without it (TTS). Where TTR beats TTS, revenue is lost. Add safety stock or a second source and watch the exposure, the expected annual loss and the concentration index (HHI) change.",
  lede: "Most supply chain risk registers list the likely problems. The costly ones are often unlikely: a fire at a small supplier that makes one part nobody else makes. The time-to-recover / time-to-survive method skips guessing probabilities at first and asks two questions per site: if it went down tomorrow, how many weeks until it's back (TTR), and how many weeks could we keep serving customers without it (TTS)? If TTR is longer than TTS, the gap times the revenue that depends on the site is what you'd lose.",
  quiz: [
    ["A site has TTR 16 weeks, TTS 4 weeks and $900k of weekly revenue depending on it. What's at stake?", "(16 − 4) × $900k = $10.8m of lost revenue if it fails. That's its performance impact, whatever the chance of failure."],
    ["Why rank sites by impact before probability?", "Probabilities of rare events are guesses, and low guesses make dangerous sites look safe. Impact can be measured (bills of materials, stock, lead times). Simchi-Levi's work at Ford found many of the highest-impact sites were low-spend suppliers nobody was watching."],
    ["Two ways to fix a site where TTR > TTS?", "Raise TTS (more safety stock, a pre-qualified alternative part, stock at a different tier) or cut TTR (a second source, a backup line, spare tooling). Stock is quick but costs carrying cost every year; a second source costs qualification and a price premium."],
    ["What does an HHI of 0.18 mean?", "The sum of squared spend shares is 0.18, like having 1 / 0.18 ≈ 5.6 equally sized suppliers. US merger guidelines call above 0.18 (1,800 on the 0–10,000 scale) highly concentrated."],
    ["Why can concentration be fine and still be risky?", "HHI looks at spend, not dependence. A supplier with 2% of spend can be the only source of a part that stops 40% of revenue. Use HHI for bargaining power and TTR/TTS for disruption."],
  ],
  diy: {
    intro: "One row per site: spend share in B, weekly revenue that depends on it in C ($k), TTR in D (weeks), TTS in E (weeks), annual chance of a disruption in F. Extra safety stock weeks in H1.",
    steps: [
      ["Time to survive with extra stock.", "G2: =E2+$H$1"],
      ["Performance impact if the site fails ($k).", "H2: =MAX(0, D2-G2)*C2"],
      ["Expected annual loss.", "I2: =F2*H2"],
      ["Flag exposed sites.", "J2: =IF(D2>G2, \"exposed\", \"covered\")"],
      ["Concentration index (HHI) and equivalent number of suppliers.", "=SUMPRODUCT(B2:B9, B2:B9)   =1/SUMPRODUCT(B2:B9, B2:B9)"],
      ["Yearly cost of the extra stock (25% carrying cost on weekly spend).", "=$H$1 * annual_spend/52 * 0.25"],
    ],
  },
  deeper: [
    ["Simchi-Levi, Schmidt & Wei (2014), From superstorms to factory fires, Harvard Business Review", "https://hbr.org/2014/01/from-superstorms-to-factory-fires-managing-unpredictable-supply-chain-disruptions", "the TTR/TTS risk exposure index"],
    ["Simchi-Levi et al. (2015), Identifying risks and mitigating disruptions in the automotive supply chain, Interfaces 45(5)", "https://doi.org/10.1287/inte.2015.0804", "the Ford case in detail"],
    ["Tomlin (2006), On the value of mitigation and contingency strategies for managing supply chain disruption risks, Management Science 52(5)", "https://doi.org/10.1287/mnsc.1050.0487", "when to hold stock, dual-source or wait"],
    ["Sheffi & Rice (2005), A supply chain view of the resilient enterprise, MIT Sloan Management Review", "https://sloanreview.mit.edu/article/a-supply-chain-view-of-the-resilient-enterprise/", "redundancy versus flexibility"],
    ["US Department of Justice, Herfindahl-Hirschman Index", "https://www.justice.gov/atr/herfindahl-hirschman-index", "the concentration measure and its thresholds"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 56 L86 8" stroke-dasharray="4 3"/><path d="M10 56 H88 M10 56 V6"/><circle cx="30" cy="20" r="7"/><circle cx="62" cy="44" r="5"/><circle cx="44" cy="30" r="4"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    // name, short, spend share, weekly revenue at stake ($k), TTR weeks, TTS weeks, annual chance
    const SITES = [
      ["PCB plant, Shenzhen", "PCB", 0.28, 900, 16, 4, 0.08],
      ["Chip packager, Penang", "Chips", 0.22, 1200, 20, 6, 0.05],
      ["Final assembly, Monterrey", "Assembly", 0.15, 1500, 8, 3, 0.04],
      ["Display maker, Taiwan", "Display", 0.10, 1100, 26, 8, 0.04],
      ["Resin supplier, Ohio", "Resin", 0.09, 400, 6, 5, 0.06],
      ["3PL warehouse, Rotterdam", "EU DC", 0.08, 700, 4, 2, 0.03],
      ["Cable assembly, Vietnam", "Cables", 0.05, 250, 5, 4, 0.10],
      ["Packaging, Mexico", "Packaging", 0.03, 150, 2, 3, 0.12],
    ];
    const SPEND = 40000, DUALF = 0.35, DUALP = 0.03;
    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(fig("c1", "Recover vs survive (click a site to add a second source)", 340, "Each supplier site plotted by weeks to survive and weeks to recover; bubble size is revenue at stake"), fig("c2", "Revenue lost if the site goes down", 340, "Bars of lost revenue per site if it is disrupted"))}
        <div class="plot wide" style="padding:14px;margin-top:14px;overflow-x:auto">${h4("The sites, worked out")}<div id="tbl"></div></div>
        <figure class="plot wide" style="margin:14px 0 0"><div style="padding:4px 6px 0">${h4("Concentration of spend (HHI)")}</div><canvas id="c3" style="height:170px" aria-label="Spend share of each supplier as a stacked bar, with the HHI"></canvas><figcaption id="c3Cap"></figcaption></figure>`,
      panel: `
        <p class="hint" style="margin:0">An electronics company buys $40m a year from eight sites. Click a bubble (or a row's button) to qualify a second source there: it cuts that site's recovery time by 65% and costs 3% more on its spend.</p>
        <div class="ctrl"><label for="ss">Extra safety stock at every site <output id="ssV"></output></label><input type="range" id="ss" min="0" max="12" step="1" value="0"></div>
        <div class="ctrl"><label for="tm">Recovery times are really <output id="tmV"></output> of the estimate</label><input type="range" id="tm" min="0.5" max="2" step="0.05" value="1"></div>
        <div class="ctrl"><label for="cc">Carrying cost of stock, per year <output id="ccV"></output></label><input type="range" id="cc" min="0.1" max="0.4" step="0.01" value="0.25"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="none" type="button">Single-source everything</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Time to recover and time to survive</h2>
          <p><b>TTR</b> is how long a site needs to get back to full output after a disruption: rebuilding, re-qualifying, moving tooling. Ask the supplier, and check against past incidents. <b>TTS</b> is how long you can keep meeting demand without it, from stock along the chain, alternative parts or other sites. It's yours to measure from inventory and bills of materials.</p>
          <div class="eq">performance impact = max(0, TTR − TTS) × revenue per week that needs the site</div>
          <p>Rank sites by impact. The ones at the top deserve attention whatever their probability, because the estimate of a rare event's probability is the weakest number in the table. Multiply by a probability only afterwards, for an expected annual loss that can be compared with what mitigation costs.</p>
        </section>
        <section>
          <h2>Raising TTS or cutting TTR</h2>
          <ul>
            <li><b>Safety stock</b> adds weeks of TTS at every site where you hold it. Cheap per week, but you pay the <a href="#carrying-cost">carrying cost</a> every year, disruption or not.</li>
            <li><b>A second source</b> cuts TTR, because the other supplier can ramp up. It costs qualification work and usually a price premium, and it only helps if the two don't share a hidden tier-2 supplier or region.</li>
          </ul>
          <p>Tomlin's result fits what you'll see here: stock suits frequent short disruptions, second sources suit rare long ones. Try the display maker (TTR 26 weeks).</p>
        </section>
        <section>
          <h2>Concentration: the HHI</h2>
          <div class="eq">HHI = Σ sᵢ² &nbsp;&nbsp; equivalent number of suppliers = 1 / HHI</div>
          <p>With shares sᵢ as fractions, HHI runs from near 0 (many small suppliers) to 1 (one supplier). On the competition-law scale of 0 to 10,000, above 1,800 counts as highly concentrated. It's a quick measure of dependence on a few names, but it ignores which parts are single-sourced, so read it alongside TTR/TTS.</p>
        </section>
        <section>
          <h2>Where the numbers go next</h2>
          <p>Put the impacts and probabilities on a <a href="#risk-matrix">risk matrix</a>, test a named scenario (a regional lockdown hitting three sites at once) with a <a href="#stress-test">stress test</a>, or simulate many years of random disruptions with <a href="#monte-carlo-risk">Monte Carlo</a>.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Add 4 weeks of safety stock: some small sites drop out of danger, but chips and displays barely move, and the stock costs $770k a year.</li>
            <li>Instead, click the display maker and the chip packager to dual-source them. Compare the expected loss and the yearly cost.</li>
            <li>Set recovery times to 150% of the estimate: suppliers are usually optimistic.</li>
          </ul>
        </section>`,
    });
    let dual = new Set();
    const P = () => ({ ss: +$("#ss").value, tm: +$("#tm").value, cc: +$("#cc").value });
    function rows() {
      const p = P();
      return SITES.map(([n, s, sh, rev, ttr, tts, pr], i) => { const d = dual.has(i), T = ttr * p.tm * (d ? DUALF : 1), S = tts + p.ss, imp = Math.max(0, T - S) * rev; return { i, n, sh, s, rev, ttr: T, tts: S, pr, d, imp, el: imp * pr }; });
    }
    const m$ = (k) => (k >= 1000 ? "$" + fmt(k / 1000, 1) + "m" : "$" + fmt(k, 0) + "k");
    const C1 = new Plot($("#c1"), { x: [0, 22], y: [0, 30], pad: { l: 46, b: 40 } }), C2 = new Plot($("#c2"), { pad: { l: 78, r: 56, b: 38 } }), C3 = new Plot($("#c3"), { x: [0, 1], y: [0, 1], pad: { l: 12, r: 12, t: 10, b: 30 } });
    let pts = [];
    function d1(R) {
      const xm = Math.max(14, ...R.map((r) => r.tts)) + 2, ym = Math.max(20, ...R.map((r) => r.ttr)) + 3;
      C1.resize(); C1.x = [0, xm]; C1.y = [0, ym]; C1.clear(); C1.axes({ xLabel: "time to survive, weeks", yLabel: "time to recover, weeks", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const g = C1.ctx, m = Math.max(xm, ym);
      C1.clip(() => { g.beginPath(); g.moveTo(C1.sx(0), C1.sy(0)); g.lineTo(C1.sx(m), C1.sy(m)); g.lineTo(C1.sx(0), C1.sy(m)); g.closePath(); g.fillStyle = css("--bad"); g.globalAlpha = 0.08; g.fill(); g.globalAlpha = 1; });
      C1.path([0, m], [0, m], css("--muted"), 1.5, [5, 4]);
      g.font = `11px ${css("--font-body")}`; g.fillStyle = css("--bad"); g.textAlign = "left"; g.textBaseline = "top"; g.fillText("exposed:", C1.sx(xm * 0.62), C1.pad.t + 8); g.fillText("recovery outlasts", C1.sx(xm * 0.62), C1.pad.t + 22); g.fillText("the buffer", C1.sx(xm * 0.62), C1.pad.t + 36);
      pts = R.map((r) => { const rad = 5 + Math.sqrt(r.rev) / 3.2; return { r, x: C1.sx(r.tts), y: C1.sy(r.ttr), rad }; });
      pts.forEach(({ r, x, y, rad }) => {
        g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fillStyle = css(r.imp > 0 ? "--bad" : "--good"); g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1; g.lineWidth = r.d ? 3 : 1.5; g.strokeStyle = css(r.d ? "--violet" : "--surface"); g.stroke();
        g.font = `600 11px ${css("--font-body")}`; g.fillStyle = css("--ink"); g.textAlign = "left"; g.textBaseline = "middle"; g.strokeStyle = css("--surface"); g.lineWidth = 3; const t = r.s + (r.d ? " ×2" : ""); g.strokeText(t, x + rad + 3, y); g.fillText(t, x + rad + 3, y);
      });
      $("#c1Cap").innerHTML = `Above the dashed line the site takes longer to recover than you can survive (red). Bubble size: weekly revenue that depends on the site. Purple ring “×2”: second source qualified. ${R.filter((r) => r.imp > 0).length} of 8 sites exposed.`;
    }
    function d2(R) {
      const S = [...R].sort((a, b) => b.imp - a.imp), mx = Math.max(1000, ...S.map((r) => r.imp));
      C2.resize(); C2.x = [0, mx * 1.05]; C2.y = [0, S.length]; C2.clear(); C2.axes({ xLabel: "lost revenue if it fails", xFormat: m$, yTicks: [], xCount: 4 });
      const g = C2.ctx, bh = C2.ih / S.length;
      S.forEach((r, i) => { const y = C2.pad.t + i * bh; g.fillStyle = css("--bad"); g.globalAlpha = 0.75; g.fillRect(C2.sx(0), y + bh * 0.22, C2.sx(r.imp) - C2.sx(0), bh * 0.56); g.globalAlpha = 1;
        g.fillStyle = css("--ink"); g.font = `12px ${css("--font-body")}`; g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(r.s, C2.pad.l - 8, y + bh / 2);
        g.font = `10px ${css("--font-mono")}`; g.textAlign = "left"; g.fillStyle = css(r.imp ? "--ink" : "--good"); g.fillText(r.imp ? m$(r.imp) : "covered", C2.sx(r.imp) + 4, y + bh / 2); });
      const top = S[0];
      $("#c2Cap").innerHTML = top.imp ? `Worst single failure: <b>${top.n}</b>, (${fmt(top.ttr, 1)} − ${fmt(top.tts, 0)}) weeks × ${m$(top.rev)} a week = <b>${m$(top.imp)}</b>. Its share of spend is only ${fmt(top.sh * 100, 0)}%${top.sh < 0.15 ? ", which is why spend-based risk reviews miss sites like it" : ""}.` : "Every site is covered: no single failure loses revenue.";
    }
    function tbl(R) {
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.78rem var(--font-mono);white-space:nowrap"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 8px;text-align:left">site</th><th style="padding:3px 8px">spend</th><th style="padding:3px 8px">revenue/wk</th><th style="padding:3px 8px">TTR</th><th style="padding:3px 8px">TTS</th><th style="padding:3px 8px">impact = max(0, TTR − TTS) × rev</th><th style="padding:3px 8px">chance/yr</th><th style="padding:3px 8px">expected loss</th><th style="padding:3px 8px">second source</th></tr></thead><tbody>` +
        R.map((r) => `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 8px;text-align:left;font-family:var(--font-body)">${r.n}</td><td style="padding:3px 8px">${fmt(r.sh * 100, 0)}%</td><td style="padding:3px 8px">${m$(r.rev)}</td><td style="padding:3px 8px">${fmt(r.ttr, 1)}</td><td style="padding:3px 8px">${fmt(r.tts, 0)}</td><td style="padding:3px 8px;color:var(${r.imp ? "--bad" : "--good"})">${r.imp ? `(${fmt(r.ttr, 1)} − ${fmt(r.tts, 0)}) × ${fmt(r.rev, 0)} = ${m$(r.imp)}` : "covered"}</td><td style="padding:3px 8px">${fmt(r.pr * 100, 0)}%</td><td style="padding:3px 8px">${m$(r.el)}</td><td style="padding:3px 8px"><button type="button" class="btn" data-i="${r.i}" aria-pressed="${r.d}" style="padding:2px 10px;${r.d ? "background:var(--accent-soft)" : ""}">${r.d ? "✓ dual" : "add"}</button></td></tr>`).join("") + `</tbody></table>`;
      root.querySelectorAll("#tbl button").forEach((b) => b.addEventListener("click", () => { toggle(+b.dataset.i); }));
    }
    function hhi(R) {
      const shares = []; R.forEach((r) => { if (r.d) { shares.push([r.s + " A", r.sh * 0.6]); shares.push([r.s + " B", r.sh * 0.4]); } else shares.push([r.s, r.sh]); });
      return { shares, H: shares.reduce((s, [, x]) => s + x * x, 0) };
    }
    function d3(R) {
      const { shares, H } = hhi(R);
      C3.resize(); C3.clear(); C3.axes({ xTicks: [0, 0.25, 0.5, 0.75, 1], yTicks: [], xFormat: (v) => fmt(v * 100, 0) + "%" });
      const g = C3.ctx, cols = ["--accent", "--warm", "--violet", "--good", "--bad", "--muted"]; let x = 0;
      shares.forEach(([n, s], i) => { const a = C3.sx(x), b = C3.sx(x + s); g.fillStyle = css(cols[i % cols.length]); g.globalAlpha = 0.6; g.fillRect(a, C3.sy(0.85), b - a - 1, C3.sy(0.15) - C3.sy(0.85)); g.globalAlpha = 1;
        if (b - a > 38) { g.fillStyle = css("--ink"); g.font = `11px ${css("--font-body")}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(n, (a + b) / 2, C3.sy(0.6)); g.font = `10px ${css("--font-mono")}`; g.fillText(fmt(s * 100, 0) + "%", (a + b) / 2, C3.sy(0.35)); } x += s; });
      $("#c3Cap").innerHTML = `HHI = Σ share² = ${shares.slice(0, 3).map(([, s]) => fmt(s, 2) + "²").join(" + ")} + … = <b>${fmt(H, 3)}</b> (${fmt(H * 10000, 0)} on the 0–10,000 scale, ${H > 0.18 ? "highly concentrated" : H > 0.1 ? "moderately concentrated" : "unconcentrated"}). That's like ${fmt(1 / H, 1)} equal-sized suppliers. A second source splits a site's spend 60/40.`;
      return H;
    }
    function readouts(R, H) {
      const p = P(), stock = p.ss * (SPEND / 52) * p.cc, dualc = R.filter((r) => r.d).reduce((s, r) => s + r.sh * SPEND * DUALP, 0), el = R.reduce((s, r) => s + r.el, 0), worst = Math.max(...R.map((r) => r.imp));
      $("#ro").innerHTML = [
        ["Sites exposed (TTR > TTS)", `<span class="pill ${R.some((r) => r.imp) ? "bad" : "ok"}">${R.filter((r) => r.imp).length} of 8</span>`],
        ["Worst single failure", `<span class="num">${m$(worst)}</span>`],
        ["Expected loss per year (Σ chance × impact)", `<span class="num">${m$(el)}</span>`],
        ["Mitigation cost per year", `<span class="num">${m$(stock + dualc)}</span> <span class="hint">(stock ${m$(stock)}, second sources ${m$(dualc)})</span>`],
        ["HHI / equivalent suppliers", `<span class="num">${fmt(H, 3)} / ${fmt(1 / H, 1)}</span>`],
      ].map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { const p = P(); $("#ssV").textContent = p.ss + " weeks"; $("#tmV").textContent = fmt(p.tm * 100, 0) + "%"; $("#ccV").textContent = fmt(p.cc * 100, 0) + "%"; }
    function draw() { labels(); const R = rows(); d1(R); d2(R); tbl(R); const H = d3(R); readouts(R, H); }
    function toggle(i) { dual.has(i) ? dual.delete(i) : dual.add(i); draw(); }
    $("#c1").addEventListener("click", (e) => { const b = $("#c1").getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top; let best = null, bd = 1e9; pts.forEach((p) => { const d = Math.hypot(p.x - x, p.y - y) - p.rad; if (d < bd) { bd = d; best = p; } }); if (best && bd < 12) toggle(best.r.i); });
    $("#c1").style.cursor = "pointer";
    root.querySelectorAll("input[type=range]").forEach((e) => e.addEventListener("input", draw));
    $("#none").addEventListener("click", () => { dual = new Set(); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); dual = new Set(); draw(); });
    draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
