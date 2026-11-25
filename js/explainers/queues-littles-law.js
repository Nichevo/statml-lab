Lab.register({
  id: "queues-littles-law",
  group: "Supply chain",
  title: "Little's law and queues: why a 90%-busy dock has long waits",
  blurb: "Trucks arrive at random at a few loading docks. Simulate a day, check Little's law (stock = flow × time) on the result, see the hockey-stick curve of waiting against utilisation, and why one shared queue beats separate lines.",
  lede: "Two ideas explain most waiting in operations. Little's law: the average number of things in a system equals the rate they arrive times the average time each spends inside (L = λW). It holds for trucks at a dock, orders in a warehouse and stock on a shelf, whatever the randomness. And queueing: when arrivals and service times vary, waiting doesn't grow steadily with how busy you are. It stays small, then explodes as utilisation nears 100%. Variability and utilisation together set the wait.",
  quiz: [
    ["A warehouse ships 1,500 pallets a day and holds 12,000 on average. How long does a pallet stay?", "Little's law: W = L / λ = 12,000 / 1,500 = 8 days. No distribution assumptions needed."],
    ["A dock is 80% busy and trucks wait 2 hours on average. Roughly what happens at 90% busy, with the same variability?", "Waiting scales with ρ / (1 − ρ): 0.8/0.2 = 4 versus 0.9/0.1 = 9. So about 2.25 times longer, around 4.5 hours."],
    ["Why does a single queue feeding three docks beat three separate queues?", "With separate queues, one dock can sit idle while another has a line. A shared queue never wastes a free dock, so the same capacity gives much shorter waits. It's the same pooling idea as risk pooling in inventory."],
    ["Kingman's formula says wait ≈ (cₐ² + cₛ²)/2 × ρ/(1 − ρ) × service time. What are the two levers besides adding capacity?", "Reduce arrival variability (appointments, scheduled slots) and service variability (standard work, pre-staged paperwork). Halving both CVs cuts the wait by about three-quarters at the same utilisation."],
    ["Does Little's law need arrivals to be random (Poisson)?", "No. It only needs the system to be stable over the period (what goes in comes out, on average). That's why it's so widely useful."],
  ],
  diy: {
    intro: "Arrival rate λ per hour in B1, mean service time in hours in B2, number of docks c in B3, arrival and service CVs in B4 and B5.",
    steps: [
      ["Utilisation.", "B6: =B1*B2/B3"],
      ["Erlang C: chance an arriving truck has to wait (M/M/c). With a = λ × service time:", "=(a^c/FACT(c)/(1-B6)) / (SUMPRODUCT(a^ROW(INDIRECT(\"1:\"&c))/FACT(ROW(INDIRECT(\"1:\"&c))))+1 - a^c/FACT(c) + a^c/FACT(c)/(1-B6))"],
      ["Average wait for M/M/c, then scale for other variability (Allen–Cunneen).", "Wq: =P_wait*B2/(B3*(1-B6))   G/G/c: =Wq*(B4^2+B5^2)/2"],
      ["Little's law: average number waiting and in the system.", "Lq: =B1*Wq   L: =B1*(Wq+B2)"],
      ["Simulate one truck at a time: start = MAX(arrival, earliest free dock), wait = start − arrival.", "=MAX(A3, MIN(free_times)) - A3"],
    ],
  },
  deeper: [
    ["Little (1961), A proof for the queuing formula L = λW, Operations Research 9(3)", "https://doi.org/10.1287/opre.9.3.383", "the original proof"],
    ["Little (2011), Little's law as viewed on its 50th anniversary, Operations Research 59(3)", "https://doi.org/10.1287/opre.1110.0940", "a readable look back, with uses in operations and services"],
    ["Kingman (1961), The single server queue in heavy traffic, Mathematical Proceedings of the Cambridge Philosophical Society 57(4)", "https://doi.org/10.1017/S0305004100036094", "the heavy-traffic approximation behind the hockey stick"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 56 H90" stroke-opacity=".5"/><path d="M6 56 C40 54 60 50 70 40 C78 30 82 18 86 4"/><circle cx="16" cy="18" r="4"/><circle cx="28" cy="18" r="4"/><circle cx="40" cy="18" r="4"/><rect x="52" y="10" width="16" height="16" rx="2"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const fig = (id, t, h, al) => `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4(t)}</div><canvas id="${id}" style="height:${h}px" aria-label="${al}"></canvas><figcaption id="${id}Cap"></figcaption></figure>`;
    const $ = (s) => root.querySelector(s);
    const NSIM = 30000, DAY = 10;
    let seed = 4;
    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide" style="margin:0 0 14px"><div style="padding:4px 6px 0">${h4("Trucks at the docks over a 10-hour day")}</div><canvas id="c1" style="height:260px" aria-label="Number of trucks waiting and being served over a simulated day"></canvas><figcaption id="c1Cap"></figcaption></figure>
        ${two(fig("c2", "Waiting time against how busy the docks are", 270, "Average wait against utilisation, formula curve and simulated points"), fig("c3", "One shared queue vs a queue per dock", 270, "Average wait for pooled and separate queues as utilisation rises"))}
        <div class="plot" style="padding:14px;margin-top:14px;min-width:0;overflow-x:auto">${h4("Little's law, checked on the simulation")}<div id="tbl"></div></div>`,
      panel: `
        <div class="ctrl"><label for="lam">Trucks arriving per hour <output id="lamV"></output></label><input type="range" id="lam" min="0.5" max="20" step="0.1" value="5"></div>
        <div class="ctrl"><label for="st">Average unloading time (minutes) <output id="stV"></output></label><input type="range" id="st" min="5" max="90" step="5" value="30"></div>
        <div class="ctrl"><label for="c">Docks <output id="cV"></output></label><input type="range" id="c" min="1" max="6" step="1" value="3"></div>
        <div class="ctrl"><label for="ca">Arrival variability (CV; 1 = random, 0 = perfectly scheduled) <output id="caV"></output></label><input type="range" id="ca" min="0" max="1.5" step="0.1" value="1"></div>
        <div class="ctrl"><label for="cs">Unloading time variability (CV) <output id="csV"></output></label><input type="range" id="cs" min="0" max="1.5" step="0.1" value="1"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="resim" type="button">Simulate a different day</button><button class="btn" id="reset" type="button">Reset</button></div>
        <div class="plot" style="padding:12px;margin-top:6px">${h4("Little's law calculator")}
          <div class="ctrl"><label for="ll1">Pallets shipped per day <output id="ll1V"></output></label><input type="range" id="ll1" min="100" max="5000" step="100" value="1500"></div>
          <div class="ctrl"><label for="ll2">Days a pallet stays (dwell) <output id="ll2V"></output></label><input type="range" id="ll2" min="0.5" max="30" step="0.5" value="8"></div>
          <p class="hint" id="llOut" style="margin:0"></p></div>`,
      notes: `
        <section>
          <h2>Little's law everywhere</h2>
          <ul>
            <li><b>Inventory</b>: stock on hand = sales per day × days of cover. Cut days of cover by a third and stock falls by a third, at the same sales.</li>
            <li><b>Order fulfilment</b>: orders in progress = orders per hour × hours each takes. To cut lead time, cut work in progress.</li>
            <li><b>Cash</b>: receivables = sales per day × days to collect. See <a href="#cash-to-cash">cash-to-cash</a>.</li>
          </ul>
          <p>It works for any stable system over a long enough period, whatever the distributions. The table below checks it on the simulation: the time-average number of trucks, counted directly, matches arrivals per hour × average hours each spends.</p>
        </section>
        <section>
          <h2>Why waiting explodes</h2>
          <p>Kingman's approximation for one server: wait ≈ (cₐ² + cₛ²)/2 × ρ/(1 − ρ) × service time. Three factors: <b>V</b>ariability, <b>U</b>tilisation, <b>T</b>ime. The ρ/(1 − ρ) term is the hockey stick: 1 at 50% busy, 4 at 80%, 9 at 90%, 19 at 95%. Planning a dock, a pick line or a planner's workload at 95% busy guarantees queues. For several docks the curve has the same shape (Erlang C, adjusted for variability: the Allen–Cunneen approximation).</p>
        </section>
        <section>
          <h2>Pooling</h2>
          <p>A shared queue for all docks beats a queue per dock because no dock sits idle while trucks wait elsewhere. It's the queueing version of <a href="#risk-pooling">risk pooling</a>: combining variable streams smooths them.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Move arrivals from 5 to 5.5 trucks an hour (83% to 92% busy): the average wait goes from about 45 minutes to nearly 2 hours, for 10% more trucks. At 5.7 (95%) it passes 3 hours.</li>
            <li>Set both variabilities to 0 (trucks booked into exact slots, fixed unloading time): waiting disappears at the same utilisation. Even halving both CVs cuts the wait by about three-quarters.</li>
            <li>Compare the pooling chart: at 90% busy, separate queues wait about three times as long as one shared queue.</li>
            <li>Check the Little's law table: the two ways of getting the number of trucks in the yard agree, whatever settings you choose.</li>
          </ul>
        </section>`,
    });
    const P = () => ({ lam: +$("#lam").value, st: +$("#st").value / 60, c: +$("#c").value, ca: +$("#ca").value, cs: +$("#cs").value });
    function gammaGen(r, mean, cv) {
      if (cv < 1e-6) return () => mean;
      const k = 1 / (cv * cv), th = mean / k;
      const g = (kk) => { if (kk < 1) { const u = r(); return g(kk + 1) * Math.pow(u, 1 / kk); } const d = kk - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x, v; do { x = r.normal(); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = r(); if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v; } };
      return () => g(k) * th;
    }
    function simulate(p, n, sd, horizon) {
      const r = rng(sd), ia = gammaGen(r, 1 / p.lam, p.ca), sv = gammaGen(r, p.st, p.cs), free = Array(p.c).fill(0); let t = 0; const J = [];
      for (let i = 0; i < n; i++) { t += ia(); if (horizon && t > horizon) break; let k = 0; for (let j = 1; j < p.c; j++) if (free[j] < free[k]) k = j; const start = Math.max(t, free[k]), s = sv(); free[k] = start + s; J.push({ a: t, s: start, d: start + s }); }
      return J;
    }
    function erlangC(lam, st, c) { const a = lam * st, rho = a / c; if (rho >= 1) return { pw: 1, wq: Infinity }; let sum = 0, term = 1; for (let k = 0; k < c; k++) { if (k) term *= a / k; sum += term; } const last = (term * a) / c / (1 - rho); const pw = last / (sum + last); return { pw, wq: (pw * st) / (c * (1 - rho)) }; }
    const approxWq = (p, lam = p.lam, c = p.c) => erlangC(lam, p.st, c).wq * (p.ca * p.ca + p.cs * p.cs) / 2;
    const cache = new Map();
    function stats(p) {
      const key = JSON.stringify(p); if (cache.has(key)) return cache.get(key); if (cache.size > 200) cache.clear(); const rho = (p.lam * p.st) / p.c;
      if (rho >= 0.995) { const v = { unstable: true, rho }; cache.set(key, v); return v; }
      const J = simulate(p, NSIM, 17).slice(1000), T0 = J[0].a, T1 = J[J.length - 1].a, n = J.length;
      const Wq = J.reduce((s, j) => s + (j.s - j.a), 0) / n, W = J.reduce((s, j) => s + (j.d - j.a), 0) / n, lamHat = (n - 1) / (T1 - T0);
      // time-average number in system and in queue over [T0, T1], counted directly from events
      const ev = []; J.forEach((j) => { ev.push([j.a, 1, 0], [j.s, -1, 1], [j.d, 0, -1]); }); ev.sort((x, y) => x[0] - y[0]);
      let qq = 0, sv = 0, last = T0, aQ = 0, aL = 0; ev.forEach(([tt, a1, a2]) => { const a = Math.max(T0, Math.min(T1, last)), b = Math.max(T0, Math.min(T1, tt)); aQ += qq * (b - a); aL += (qq + sv) * (b - a); if (a1 === 1) qq++; else if (a1 === -1) { qq--; sv++; } if (a2 === -1) sv--; last = tt; });
      const v = { rho, Wq, W, lamHat, Lq: aQ / (T1 - T0), L: aL / (T1 - T0), pWait: J.filter((j) => j.s - j.a > 1e-9).length / n, hrs: T1 - T0, n };
      cache.set(key, v); return v;
    }
    const C1 = new Plot($("#c1"), { pad: { l: 50, b: 38 } }), C2 = new Plot($("#c2"), { pad: { l: 56, b: 38 } }), C3 = new Plot($("#c3"), { pad: { l: 56, b: 38 } });
    const sw = (c, t, k) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">${k === "box" ? `<span style="width:12px;height:10px;background:var(${c});opacity:.7"></span>` : k === "dot" ? `<span style="width:8px;height:8px;border-radius:50%;background:var(${c})"></span>` : `<span style="width:20px;border-top:2px ${k} var(${c})"></span>`}${t}</span>`;
    function d1(p) {
      const J = simulate(p, 100000, seed, DAY), ts = [], q = [], s = []; const ev = []; J.forEach((j) => ev.push([j.a, "a"], [j.s, "s"], [j.d, "d"])); ev.sort((x, y) => x[0] - y[0]);
      let nq = 0, ns = 0; ts.push(0); q.push(0); s.push(0); ev.forEach(([t, k]) => { if (t > DAY) return; if (k === "a") nq++; else if (k === "s") { nq--; ns++; } else ns--; ts.push(t); q.push(nq); s.push(ns); });
      ts.push(DAY); q.push(nq); s.push(ns);
      const top = Math.max(p.c + 1, ...q.map((v, i) => v + s[i])) * 1.12;
      C1.resize(); C1.x = [0, DAY]; C1.y = [0, top]; C1.clear(); C1.axes({ xLabel: "hour of the day", yLabel: "trucks", xFormat: (v) => fmt(v, 0), yFormat: (v) => fmt(v, 0) });
      const g = C1.ctx, step = (vals, col, alpha) => { g.beginPath(); g.moveTo(C1.sx(0), C1.sy(0)); for (let i = 0; i < ts.length; i++) { g.lineTo(C1.sx(ts[i]), C1.sy(vals[i - 1] ?? 0)); g.lineTo(C1.sx(ts[i]), C1.sy(vals[i])); } g.lineTo(C1.sx(DAY), C1.sy(0)); g.closePath(); g.fillStyle = col; g.globalAlpha = alpha; g.fill(); g.globalAlpha = 1; };
      step(q.map((v, i) => v + s[i]), css("--warm"), 0.55); step(s, css("--accent"), 0.6);
      C1.path([0, DAY], [p.c, p.c], css("--ink"), 1.2, [5, 4]);
      const waits = J.filter((j) => j.a <= DAY).map((j) => (j.s - j.a) * 60), mw = waits.length ? Math.max(...waits) : 0;
      $("#c1Cap").innerHTML = `${sw("--accent", "being unloaded", "box")}${sw("--warm", "waiting in the yard", "box")}${sw("--ink", `${p.c} docks`, "dashed")}<br>This day: ${waits.length} trucks, average wait ${fmt(waits.reduce((a, b) => a + b, 0) / Math.max(1, waits.length), 0)} min, longest ${fmt(mw, 0)} min. Queues build in bursts when several trucks arrive close together.`;
    }
    function d2(p, S) {
      const rhos = Array.from({ length: 60 }, (_, i) => 0.3 + i * 0.011), wq = rhos.map((r) => approxWq(p, (r * p.c) / p.st) * 60), cap = Math.max(60, Math.min(600, (S.unstable ? 400 : Math.max(S.Wq * 60, approxWq(p) * 60)) * 2.2));
      C2.resize(); C2.x = [0.3, 1]; C2.y = [0, cap]; C2.clear(); C2.axes({ xLabel: "utilisation ρ", yLabel: "average wait (min)", xFormat: (v) => fmt(v * 100, 0) + "%", yFormat: (v) => fmt(v, 0) });
      C2.clip(() => C2.path(rhos, wq, css("--accent"), 2.2));
      const p0 = { ...p, ca: 1, cs: 1 }; C2.clip(() => C2.path(rhos, rhos.map((r) => approxWq(p0, (r * p.c) / p.st) * 60), css("--muted"), 1.4, [4, 3]));
      [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95].forEach((r, i) => { const s = stats({ ...p, lam: (r * p.c) / p.st }); if (!s.unstable && s.Wq * 60 < cap) C2.dot(r, s.Wq * 60, 3, css("--ink"), css("--ink")); });
      if (!S.unstable) C2.dot(S.rho, Math.min(cap, S.Wq * 60), 6, css("--warm"), css("--ink"));
      $("#c2Cap").innerHTML = `${sw("--accent", "formula, your variability", "solid")}${sw("--muted", "formula, fully random (CV 1)", "dashed")}${sw("--ink", "simulated", "dot")}${sw("--warm", "you are here", "dot")}<br>${S.unstable ? `<b style="color:var(--bad)">Utilisation ${fmt(S.rho * 100, 0)}%: more work arrives than the docks can do; the queue grows without limit.</b>` : `At ${fmt(S.rho * 100, 0)}% busy: simulated wait ${fmt(S.Wq * 60, 0)} min; formula ${fmt(approxWq(p) * 60, 0)} min.`}`;
    }
    function d3(p) {
      const rhos = Array.from({ length: 50 }, (_, i) => 0.4 + i * 0.011), pool = rhos.map((r) => approxWq(p, (r * p.c) / p.st) * 60), sep = rhos.map((r) => approxWq(p, r / p.st, 1) * 60), cap = Math.min(600, Math.max(60, sep[sep.length - 8] || 60));
      C3.resize(); C3.x = [0.4, 0.95]; C3.y = [0, cap]; C3.clear(); C3.axes({ xLabel: "utilisation ρ", yLabel: "average wait (min)", xFormat: (v) => fmt(v * 100, 0) + "%", yFormat: (v) => fmt(v, 0) });
      C3.clip(() => { C3.path(rhos, sep, css("--bad"), 2); C3.path(rhos, pool, css("--accent"), 2.2); });
      const r9 = 0.9, a = approxWq(p, (r9 * p.c) / p.st) * 60, b = approxWq(p, r9 / p.st, 1) * 60;
      $("#c3Cap").innerHTML = `${sw("--accent", `one queue, ${p.c} docks`, "solid")}${sw("--bad", `${p.c} separate queues`, "solid")}<br>${p.c === 1 ? "With one dock there's nothing to pool; add docks to compare." : `At 90% busy: ${fmt(a, 0)} min with a shared queue vs ${fmt(b, 0)} min with a queue per dock (${fmt(b / a, 1)}× longer).`}`;
    }
    function tbl(p, S) {
      if (S.unstable) { $("#tbl").innerHTML = `<p style="margin:0;color:var(--bad)">The system is overloaded (ρ ≥ 100%), so there's no steady state and Little's law has nothing to average. Lower arrivals or add docks.</p>`; return; }
      const row = (a, b, c, d) => `<tr style="border-top:1px solid var(--line)"><td style="padding:4px 6px">${a}</td><td style="padding:4px 6px;text-align:right">${b}</td><td style="padding:4px 6px;text-align:right">${c}</td><td style="padding:4px 6px;text-align:right">${d}</td></tr>`;
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.82rem var(--font-mono);width:100%;min-width:520px"><thead><tr style="color:var(--muted)"><th style="padding:4px 6px;text-align:left">quantity</th><th style="padding:4px 6px;text-align:right">counted directly</th><th style="padding:4px 6px;text-align:right">λ × time (Little)</th><th style="padding:4px 6px;text-align:right">M/M/c-style formula</th></tr></thead><tbody>` +
        row("Trucks waiting (Lq)", fmt(S.Lq, 2), `${fmt(S.lamHat, 2)} × ${fmt(S.Wq, 3)} h = ${fmt(S.lamHat * S.Wq, 2)}`, fmt(p.lam * approxWq(p), 2)) +
        row("Trucks in the yard in total (L)", fmt(S.L, 2), `${fmt(S.lamHat, 2)} × ${fmt(S.W, 3)} h = ${fmt(S.lamHat * S.W, 2)}`, fmt(p.lam * (approxWq(p) + p.st), 2)) +
        row("Docks busy on average", fmt(S.L - S.Lq, 2), `${fmt(S.lamHat, 2)} × ${fmt(p.st, 3)} h = ${fmt(S.lamHat * p.st, 2)}`, fmt(p.lam * p.st, 2)) +
        `</tbody></table><p class="hint" style="margin:8px 0 0">"Counted directly" integrates the number of trucks over ${fmt(S.hrs, 0)} simulated hours (${S.n.toLocaleString()} trucks). Little's law multiplies the arrival rate by the average time per truck. They match to rounding, without any assumption about the distributions.</p>`;
    }
    function readouts(p, S) {
      $("#ro").innerHTML = [["Utilisation ρ = λ × time / docks", `${p.lam} × ${fmt(p.st, 2)} / ${p.c} = ${fmt(((p.lam * p.st) / p.c) * 100, 0)}%`], ["Average wait (simulated)", S.unstable ? `<span class="pill bad">grows forever</span>` : `${fmt(S.Wq * 60, 0)} min`], ["Share of trucks that wait", S.unstable ? "–" : fmt(S.pWait * 100, 0) + "%"], ["Trucks in the yard on average", S.unstable ? "–" : fmt(S.L, 1)]].map(([n, v]) => `<div class="ro"><b>${n}</b><span class="num">${v}</span></div>`).join("");
    }
    function ll() { const a = +$("#ll1").value, b = +$("#ll2").value; $("#ll1V").textContent = a.toLocaleString(); $("#ll2V").textContent = b; $("#llOut").innerHTML = `Average stock L = λ × W = ${a.toLocaleString()} × ${b} = <b>${(a * b).toLocaleString()} pallets</b>. Cut dwell by 2 days and you free ${(a * 2).toLocaleString()} pallet positions.`; }
    function labels(p) { $("#lamV").textContent = p.lam; $("#stV").textContent = fmt(p.st * 60, 0); $("#cV").textContent = p.c; $("#caV").textContent = fmt(p.ca, 1); $("#csV").textContent = fmt(p.cs, 1); }
    function draw() { const p = P(), S = stats(p); labels(p); d1(p); d2(p, S); d3(p); tbl(p, S); readouts(p, S); ll(); }
    ["lam", "st", "c", "ca", "cs"].forEach((id) => $("#" + id).addEventListener("input", draw));
    ["ll1", "ll2"].forEach((id) => $("#" + id).addEventListener("input", ll));
    $("#resim").addEventListener("click", () => { seed++; draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 4; draw(); });
    draw();
    return watch([$("#c1"), $("#c2"), $("#c3")], draw);
  },
});
