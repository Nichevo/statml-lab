Lab.register({
  id: "risk-matrix",
  group: "Risk",
  title: "Risk matrix and FMEA: scoring risks, and where scores mislead",
  blurb: "Place ten supply chain risks on a 5×5 likelihood–impact matrix, then compare the matrix ranking with expected loss in dollars. Score failure modes with FMEA (severity × occurrence × detection) and see why a severe, rare failure can sink to the bottom of the list.",
  lede: "A risk matrix turns a long risk register into a picture: likelihood on one axis, impact on the other, red in the corner. FMEA does the same for ways a process can fail, multiplying three 1–10 scores into a risk priority number (RPN). Both are quick, shared and easy to explain. Both also throw information away when they turn numbers into bands, and the multiplication can put the wrong risk on top.",
  quiz: [
    ["Two risks sit in the same matrix cell. Are they equally serious?", "Not necessarily. A cell can span a 5% to 15% chance and $3m to $10m impact, so expected losses inside one cell can differ by 10 times. Tony Cox called this 'range compression'."],
    ["What does the matrix score L × I actually measure?", "Nothing with a unit. It multiplies two rank numbers, so a 4 × 2 and a 2 × 4 tie even when one is worth far more in dollars. Use it to sort a discussion, not to decide spend."],
    ["What is an RPN?", "Severity × occurrence × detection, each scored 1 to 10 (detection: 10 means you probably won't catch it). It ranges from 1 to 1,000 and is used to decide which failure modes get action first."],
    ["Why can RPN rank a catastrophic failure low?", "Because a 10 for severity can be cancelled by low occurrence and detection: 10 × 2 × 3 = 60, below a nuisance scoring 5 × 5 × 5 = 125. The 2019 AIAG-VDA handbook replaced the RPN threshold with action-priority tables that look at severity first."],
    ["When is a risk matrix still useful?", "For a first pass with people who don't have data, to agree what to look at more closely. For the top risks, put numbers on them: chance per year and cost, then expected loss, Monte Carlo or a stress test."],
  ],
  diy: {
    intro: "Risk register: annual chance in B2:B11, impact in $k in C2:C11. FMEA: severity, occurrence and detection in F, G, H.",
    steps: [
      ["Likelihood band 1–5 from the chance (fine bands: 1%, 5%, 15%, 40%).", "D2: =MATCH(B2, {0,0.01,0.05,0.15,0.4}, 1)"],
      ["Impact band 1–5 from the cost ($250k, $1m, $3m, $10m).", "E2: =MATCH(C2, {0,250,1000,3000,10000}, 1)"],
      ["Matrix score and colour.", "=D2*E2   then =IF(score>=15,\"red\",IF(score>=8,\"amber\",\"green\"))"],
      ["Expected loss per year.", "=B2*C2"],
      ["Compare rankings.", "=RANK(score, scores)   vs   =RANK(expected_loss, losses)"],
      ["FMEA risk priority number.", "I2: =F2*G2*H2"],
      ["Severity-first sort: sort by severity, then occurrence, then detection, all descending.", "Data > Sort, three levels"],
    ],
  },
  deeper: [
    ["Cox (2008), What's wrong with risk matrices? Risk Analysis 28(2)", "https://doi.org/10.1111/j.1539-6924.2008.01030.x", "range compression and rankings worse than random"],
    ["Bowles (2003), An assessment of RPN prioritization in a failure modes effects and criticality analysis, RAMS", "https://doi.org/10.1109/RAMS.2003.1182019", "the arithmetic problems with RPN"],
    ["Liu, Liu & Liu (2013), Risk evaluation approaches in failure mode and effects analysis: a literature review, Expert Systems with Applications 40(2)", "https://doi.org/10.1016/j.eswa.2012.08.010", "what people use instead of RPN"],
    ["ISO 31000 Risk management", "https://www.iso.org/iso-31000-risk-management.html", "the general framework"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="22" y="6" width="56" height="50"/><path d="M36 6 V56 M50 6 V56 M64 6 V56 M22 18 H78 M22 31 H78 M22 44 H78" stroke-opacity=".5"/><rect x="64" y="6" width="14" height="12" fill="currentColor" fill-opacity=".45" stroke="none"/><circle cx="57" cy="24" r="3" fill="currentColor"/><circle cx="30" cy="50" r="3" fill="currentColor"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const RISKS = [["Fire at the only display supplier", 0.02, 20000], ["Port strike on the West Coast", 0.15, 3000], ["Ocean freight rates double", 0.4, 1500], ["Ransomware hits the warehouse system", 0.05, 8000], ["Product quality recall", 0.03, 12000], ["Big promotion forecast miss", 0.6, 400], ["Currency swing of 10%", 0.3, 1200], ["Flood at the main DC", 0.01, 6000], ["Regional carrier goes bankrupt", 0.08, 900], ["Resin shortage", 0.1, 5000]];
    const BANDS = { fine: { L: [0.01, 0.05, 0.15, 0.4], I: [250, 1000, 3000, 10000], Ln: ["<1%", "1–5%", "5–15%", "15–40%", ">40%"], In: ["<$250k", "$250k–1m", "$1–3m", "$3–10m", ">$10m"] }, tmpl: { L: [0.05, 0.2, 0.5, 0.8], I: [1000, 5000, 10000, 20000], Ln: ["<5%", "5–20%", "20–50%", "50–80%", ">80%"], In: ["<$1m", "$1–5m", "$5–10m", "$10–20m", ">$20m"] } };
    const FM0 = [["Wrong part picked at the DC", 5, 6, 4], ["Label unreadable at receiving", 3, 7, 3], ["Cold-chain breach on vaccines", 10, 2, 3], ["Advance shipping notice missing", 4, 5, 5], ["Pallet collapses in transit", 7, 3, 6], ["Customs documents wrong", 6, 4, 4]];
    let FM = FM0.map((r) => [...r]), bands = "fine", sel = 0;
    root.innerHTML = Lab.page(this, {
      figure: `
        ${two(fig("c1", "Part 1 · The risk matrix", 360, "Five by five likelihood and impact matrix with ten risks placed in their cells"), fig("c2", "Matrix score vs expected loss", 360, "Each risk's matrix score against its expected loss in dollars per year"))}
        <div class="plot wide" style="padding:14px;margin-top:14px;overflow-x:auto">${h4("The register, ranked two ways")}<div id="reg"></div></div>
        <div class="plot wide" style="padding:14px;margin-top:14px;overflow-x:auto">${h4("Part 2 · FMEA for inbound logistics (edit the scores)")}<div id="fmea"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Each risk has an estimated chance per year and a cost if it happens. The matrix only sees which band each falls in.</p>
        <div class="ctrl"><label>Band edges</label><div class="seg" id="bd"><button type="button" data-b="fine" aria-pressed="true">Fine (log steps)</button><button type="button" data-b="tmpl" aria-pressed="false">Typical template</button></div></div>
        <div class="ctrl"><label for="rk">Selected risk <output id="rkV"></output></label><input type="range" id="rk" min="1" max="10" step="1" value="1"></div>
        <div class="ctrl"><label for="rp">Its chance per year <output id="rpV"></output></label><input type="range" id="rp" min="-2.3" max="0" step="0.05" value="-1.7"></div>
        <div class="ctrl"><label for="ri">Its cost if it happens <output id="riV"></output></label><input type="range" id="ri" min="2" max="4.5" step="0.05" value="4.3"></div>
        <div class="ctrl"><label for="th">FMEA: act on RPN of at least <output id="thV"></output></label><input type="range" id="th" min="40" max="300" step="10" value="100"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>How a risk matrix works</h2>
          <p>Each risk gets a likelihood band and an impact band, usually 1 to 5. The cell colour (often from the product L × I) says how urgently to act. It's popular because anyone can fill one in, and because a picture of red, amber and green is easy to discuss in a meeting.</p>
        </section>
        <section>
          <h2>Where it misleads</h2>
          <ul>
            <li><b>Range compression.</b> A band covers a wide range, so very different risks share a cell. With template bands (top impact band “over $20m”), a $20m fire and a $200m fire look the same.</li>
            <li><b>Wrong order.</b> L × I multiplies band numbers, not money. A likely-but-small risk can outscore a rare-but-ruinous one with ten times the expected loss. The register counts pairs ranked the wrong way round.</li>
            <li><b>Ties.</b> Many risks share a score, so the matrix can't separate them at all.</li>
            <li><b>Edges matter.</b> Switch the band edges and the picture changes, with no change in the risks.</li>
          </ul>
          <p>Expected loss = chance × cost is better for sorting, though it treats a 1% chance of $100m like a 100% chance of $1m. For the big ones, look at the tail as well: <a href="#var-cvar">VaR and CVaR</a>, <a href="#stress-test">stress tests</a>.</p>
        </section>
        <section>
          <h2>FMEA and the risk priority number</h2>
          <p>Failure mode and effects analysis lists the ways a process or product can fail, and scores each 1–10 for <b>severity</b> (how bad the effect is), <b>occurrence</b> (how often the cause happens) and <b>detection</b> (10 = you'll probably miss it before it reaches the customer).</p>
          <div class="eq">RPN = S × O × D &nbsp; (1 to 1,000)</div>
          <p>The same problems appear: only 120 of the 1,000 values between 1 and 1,000 can occur, very different modes share an RPN, and a severity-10 failure can rank low. The 2019 AIAG-VDA handbook replaced RPN thresholds with action-priority tables that weigh severity first, then occurrence, then detection. The “severity first” column shows that idea in its simplest form.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Switch to the template bands: several risks pile into the same cells and the disagreements grow.</li>
            <li>Select risk 6 (forecast miss) and compare its matrix score with its expected loss.</li>
            <li>In the FMEA, the cold-chain breach has the highest severity but one of the lowest RPNs. Raise its detection score to 6 and see when it crosses the action line.</li>
          </ul>
        </section>`,
    });
    const band = (v, edges) => edges.filter((e) => v >= e).length + 1;
    const R = () => RISKS.map(([n, p, c], i) => { const B = BANDS[bands], L = band(p, B.L), I = band(c, B.I); return { i, n, p, c, L, I, sc: L * I, el: p * c }; });
    const colOf = (s) => (s >= 15 ? "--bad" : s >= 8 ? "--warm" : "--good");
    const m$ = (k) => (k >= 1000 ? "$" + fmt(k / 1000, 1) + "m" : "$" + fmt(k, 0) + "k");
    const C1 = new Plot($("#c1"), { x: [0.5, 5.5], y: [0.5, 5.5], pad: { l: 70, b: 56, t: 8, r: 10 } }), C2 = new Plot($("#c2"), { x: [0, 26], pad: { l: 56, b: 38 } });
    let dots = [];
    function d1(rs) {
      const B = BANDS[bands];
      C1.resize(); C1.clear();
      const g = C1.ctx;
      for (let L = 1; L <= 5; L++) for (let I = 1; I <= 5; I++) { const x0 = C1.sx(I - 0.5), x1 = C1.sx(I + 0.5), y0 = C1.sy(L + 0.5), y1 = C1.sy(L - 0.5); g.fillStyle = css(colOf(L * I)); g.globalAlpha = 0.22; g.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2); g.globalAlpha = 1; g.fillStyle = css("--muted"); g.font = `10px ${css("--font-mono")}`; g.textAlign = "right"; g.textBaseline = "top"; g.fillText(L * I, x1 - 4, y0 + 4); }
      g.font = `10px ${css("--font-mono")}`; g.fillStyle = css("--muted");
      for (let k = 1; k <= 5; k++) { g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(B.Ln[k - 1], C1.pad.l - 6, C1.sy(k)); g.textAlign = "center"; g.textBaseline = "top"; g.fillText(B.In[k - 1], C1.sx(k), C1.h - C1.pad.b + 6); }
      g.font = `12px ${css("--font-body")}`; g.textAlign = "center"; g.fillText("impact if it happens →", C1.pad.l + C1.iw / 2, C1.h - 18); g.save(); g.translate(14, C1.pad.t + C1.ih / 2); g.rotate(-Math.PI / 2); g.fillText("chance per year →", 0, 0); g.restore();
      const cells = {}; dots = [];
      rs.forEach((r) => { const k = r.L + "," + r.I; cells[k] = (cells[k] || []).concat(r); });
      Object.values(cells).forEach((list) => list.forEach((r, j) => { const n = list.length, ang = (j / n) * Math.PI * 2, off = n > 1 ? Math.min(C1.iw, C1.ih) / 5 * 0.28 : 0, x = C1.sx(r.I) + off * Math.cos(ang), y = C1.sy(r.L) + off * Math.sin(ang); dots.push({ r, x, y });
        g.beginPath(); g.arc(x, y, r.i === sel ? 11 : 9, 0, Math.PI * 2); g.fillStyle = css(r.i === sel ? "--accent" : "--surface"); g.fill(); g.lineWidth = 1.5; g.strokeStyle = css("--ink"); g.stroke();
        g.fillStyle = css(r.i === sel ? "--surface" : "--ink"); g.font = `600 11px ${css("--font-mono")}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(r.i + 1, x, y + 0.5); }));
      const crowd = Math.max(...Object.values(cells).map((l) => l.length));
      const s = rs[sel];
      $("#c1Cap").innerHTML = `Numbers are the risks in the register (click one to select it). Selected: <b>${s.i + 1}. ${s.n}</b>, ${fmt(s.p * 100, 1)}% a year and ${m$(s.c)} → likelihood ${s.L}, impact ${s.I}, score ${s.sc}. Busiest cell holds ${crowd} risk${crowd > 1 ? "s" : ""}.`;
    }
    function d2(rs) {
      const ym = Math.max(...rs.map((r) => r.el)) * 1.15;
      C2.resize(); C2.y = [0, ym]; C2.clear(); C2.axes({ xLabel: "matrix score (L × I)", yLabel: "expected loss per year", xTicks: [1, 5, 10, 15, 20, 25], xFormat: (v) => fmt(v, 0), yFormat: m$ });
      const g = C2.ctx;
      rs.forEach((r) => { C2.dot(r.sc, r.el, r.i === sel ? 9 : 7, css(colOf(r.sc)), css("--ink")); g.fillStyle = css("--ink"); g.font = `600 10px ${css("--font-mono")}`; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(r.i + 1, C2.sx(r.sc) + 10, C2.sy(r.el)); });
      const byEl = [...rs].sort((a, b) => b.el - a.el)[0], bySc = [...rs].sort((a, b) => b.sc - a.sc || b.el - a.el)[0];
      $("#c2Cap").innerHTML = `If the score tracked money, the dots would rise from left to right. Highest expected loss: <b>${byEl.i + 1}</b> (${m$(byEl.el)} a year, score ${byEl.sc}). Highest score: <b>${bySc.i + 1}</b> (score ${bySc.sc}, ${m$(bySc.el)} a year).`;
    }
    function pairs(rs) { let disc = 0, ties = 0, n = 0; for (let a = 0; a < rs.length; a++) for (let b = a + 1; b < rs.length; b++) { n++; const ds = rs[a].sc - rs[b].sc, de = rs[a].el - rs[b].el; if (ds === 0) ties++; else if (ds * de < 0) disc++; } return { disc, ties, n }; }
    function reg(rs) {
      const rankEl = [...rs].sort((a, b) => b.el - a.el).map((r) => r.i), rankSc = [...rs].sort((a, b) => b.sc - a.sc || a.i - b.i);
      const rk = (r) => rankEl.indexOf(r.i) + 1;
      $("#reg").innerHTML = `<table style="border-collapse:collapse;font:.78rem var(--font-mono);white-space:nowrap"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 8px;text-align:left">#</th><th style="padding:3px 8px;text-align:left">risk</th><th style="padding:3px 8px">chance</th><th style="padding:3px 8px">cost</th><th style="padding:3px 8px">L × I = score</th><th style="padding:3px 8px">expected loss = chance × cost</th><th style="padding:3px 8px">rank by money</th></tr></thead><tbody>` +
        rankSc.map((r) => `<tr style="text-align:right;border-top:1px solid var(--line);${r.i === sel ? "background:var(--accent-soft)" : ""}"><td style="padding:3px 8px;text-align:left">${r.i + 1}</td><td style="padding:3px 8px;text-align:left;font-family:var(--font-body)">${r.n}</td><td style="padding:3px 8px">${fmt(r.p * 100, 1)}%</td><td style="padding:3px 8px">${m$(r.c)}</td><td style="padding:3px 8px"><span style="padding:1px 6px;border-radius:4px;background:color-mix(in srgb, var(${colOf(r.sc)}) 30%, var(--surface))">${r.L} × ${r.I} = ${r.sc}</span></td><td style="padding:3px 8px">${fmt(r.p, 3)} × ${m$(r.c)} = <b>${m$(r.el)}</b></td><td style="padding:3px 8px">${rk(r)}</td></tr>`).join("") + `</tbody></table><p class="hint" style="margin:8px 0 0">Sorted by matrix score (ties by expected loss). The last column is where each risk would sit if you sorted by money.</p>`;
    }
    function fmea() {
      const th = +$("#th").value, rows = FM.map(([n, S, O, D], i) => ({ i, n, S, O, D, rpn: S * O * D }));
      const byR = [...rows].sort((a, b) => b.rpn - a.rpn), byS = [...rows].sort((a, b) => b.S - a.S || b.O - a.O || b.D - a.D);
      const inp = (i, k, v) => `<input type="number" min="1" max="10" value="${v}" data-i="${i}" data-k="${k}" aria-label="score" style="width:3.4em;font:inherit;padding:2px 4px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)">`;
      $("#fmea").innerHTML = `<table style="border-collapse:collapse;font:.8rem var(--font-mono);white-space:nowrap"><thead><tr style="color:var(--muted);text-align:right"><th style="padding:3px 8px;text-align:left">failure mode</th><th style="padding:3px 8px">severity</th><th style="padding:3px 8px">occurrence</th><th style="padding:3px 8px">detection</th><th style="padding:3px 8px">RPN = S × O × D</th><th style="padding:3px 8px">rank by RPN</th><th style="padding:3px 8px">rank, severity first</th></tr></thead><tbody>` +
        byR.map((r) => `<tr style="text-align:right;border-top:1px solid var(--line)"><td style="padding:3px 8px;text-align:left;font-family:var(--font-body)">${r.n}</td><td style="padding:3px 8px">${inp(r.i, 1, r.S)}</td><td style="padding:3px 8px">${inp(r.i, 2, r.O)}</td><td style="padding:3px 8px">${inp(r.i, 3, r.D)}</td><td style="padding:3px 8px">${r.S} × ${r.O} × ${r.D} = <span class="pill ${r.rpn >= th ? "bad" : "ok"}">${r.rpn}</span></td><td style="padding:3px 8px">${byR.indexOf(r) + 1}</td><td style="padding:3px 8px;${byS.indexOf(r) === 0 ? "font-weight:700;color:var(--bad)" : ""}">${byS.indexOf(r) + 1}</td></tr>`).join("") + `</tbody></table><p class="hint" style="margin:8px 0 0">Red RPN: at or above the action line (${th}). Detection: 1 = almost certainly caught before it reaches the customer, 10 = almost certainly not.</p>`;
      root.querySelectorAll("#fmea input").forEach((e) => e.addEventListener("change", () => { const v = Math.max(1, Math.min(10, Math.round(+e.value) || 1)); FM[+e.dataset.i][+e.dataset.k] = v; draw(); }));
      return { rows, byR, byS, th };
    }
    function readouts(rs, F) {
      const P = pairs(rs), top = F.byS[0], act = F.rows.filter((r) => r.rpn >= F.th).length;
      $("#ro").innerHTML = [
        ["Risk pairs the matrix ranks the wrong way round", `<span class="pill ${P.disc > 5 ? "bad" : P.disc ? "warn" : "ok"}">${P.disc} of ${P.n}</span>`],
        ["Pairs it can't separate (same score)", `<span class="num">${P.ties} of ${P.n}</span>`],
        ["FMEA modes above the action line", `<span class="num">${act} of ${F.rows.length}</span>`],
        ["Most severe mode's RPN rank", `<span class="pill ${F.byR.indexOf(top) + 1 > 2 ? "bad" : "ok"}">${F.byR.indexOf(top) + 1} of ${F.rows.length}</span>`],
      ].map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function syncSliders() { const [, p, c] = RISKS[sel]; $("#rk").value = sel + 1; $("#rp").value = Math.log10(p); $("#ri").value = Math.log10(c); }
    function labels() { $("#rkV").textContent = sel + 1 + ". " + RISKS[sel][0]; $("#rpV").textContent = fmt(RISKS[sel][1] * 100, 1) + "%"; $("#riV").textContent = m$(RISKS[sel][2]); $("#thV").textContent = $("#th").value; }
    function draw() { labels(); const rs = R(); d1(rs); d2(rs); reg(rs); const F = fmea(); readouts(rs, F); }
    root.querySelectorAll("#bd button").forEach((b) => b.addEventListener("click", () => { bands = b.dataset.b; root.querySelectorAll("#bd button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); }));
    $("#rk").addEventListener("input", () => { sel = +$("#rk").value - 1; syncSliders(); draw(); });
    $("#rp").addEventListener("input", () => { RISKS[sel][1] = +Math.pow(10, +$("#rp").value).toFixed(4); draw(); });
    $("#ri").addEventListener("input", () => { RISKS[sel][2] = Math.round(Math.pow(10, +$("#ri").value) / 10) * 10; draw(); });
    $("#th").addEventListener("input", draw);
    $("#c1").addEventListener("click", (e) => { const b = $("#c1").getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top; let best = null, bd = 1e9; dots.forEach((d) => { const q = Math.hypot(d.x - x, d.y - y); if (q < bd) { bd = q; best = d; } }); if (best && bd < 16) { sel = best.r.i; syncSliders(); draw(); } });
    $("#c1").style.cursor = "pointer";
    const ORIG = RISKS.map((r) => [...r]);
    $("#reset").addEventListener("click", () => { ORIG.forEach((r, i) => (RISKS[i] = [...r])); FM = FM0.map((r) => [...r]); bands = "fine"; sel = 0; root.querySelectorAll("#bd button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.b === "fine")); $("#th").value = 100; syncSliders(); draw(); });
    syncSliders(); draw();
    return watch([$("#c1"), $("#c2")], draw);
  },
});
