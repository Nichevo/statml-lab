Lab.register({
  id: "change-points",
  group: "Data quality",
  title: "Change points: spotting a shift with CUSUM",
  blurb: "A small, lasting shift is hard to see week by week but easy to see in a running total. CUSUM adds up the surprises and raises an alarm when they pile up.",
  lede: "A new competitor opens, a customer switches suppliers, a machine starts drifting. The weekly numbers move a little, but each week on its own looks normal. Looking for single extreme values (a Shewhart rule) catches big jumps quickly but small shifts slowly. CUSUM, the cumulative sum, keeps a running total of how far each week is above (or below) target. Random noise cancels out; a real shift keeps adding in the same direction until it crosses a threshold.",
  quiz: [
    ["Why does CUSUM detect small shifts faster than a 3-sigma rule?", "A 3σ rule looks at one week at a time, so a 1σ shift rarely produces a single week beyond 3σ. CUSUM accumulates the small excess every week, so after a few weeks the total stands out clearly."],
    ["What do the k and h settings do?", "k is the allowance (in SDs) subtracted each week, so normal noise doesn't build up: around half the shift size you want to detect. h is the alarm threshold: higher means fewer false alarms but slower detection."],
    ["After an alarm, how do you estimate when the change started?", "Look back to the last week the CUSUM was at zero. The shift most likely began just after that."],
    ["Why does the target mean and SD matter so much?", "CUSUM measures surprises against them. If the target is wrong (say last year's mean in a growing business), the CUSUM drifts and alarms even without a real change."],
  ],
  deeper: [
    ["CUSUM — Wikipedia", "https://en.wikipedia.org/wiki/CUSUM", "overview"],
    ["Page (1954), Continuous inspection schemes", "https://doi.org/10.1093/biomet/41.1-2.100", "the original CUSUM paper, Biometrika"],
    ["NIST Handbook: CUSUM control charts", "https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc323.htm", "k, h and average run length tables"],
    ["Change detection — Wikipedia", "https://en.wikipedia.org/wiki/Change_detection", "the wider family, including Bayesian methods"],
    ["Truong, Oudre & Vayatis (2020), Selective review of offline change point detection", "https://arxiv.org/abs/1801.00718", "PELT, binary segmentation and more"],
  ],
  diy: {
    intro: "Weekly values in B2 down. Put the target mean in $F$1, the SD in $F$2, k in $F$3 (e.g. 0.5) and h in $F$4 (e.g. 5). Take mean and SD from a stable period.",
    steps: [
      ["Standardise each week.", "C2: =(B2-$F$1)/$F$2"],
      ["Upper CUSUM (catches upward shifts). First row starts from 0.", "D2: =MAX(0,C2-$F$3)\nD3: =MAX(0,D2+C3-$F$3)   (fill down)"],
      ["Lower CUSUM (catches downward shifts).", "E2: =MAX(0,-C2-$F$3)\nE3: =MAX(0,E2-C3-$F$3)   (fill down)"],
      ["Alarm when either passes h.", "G2: =IF(OR(D2>$F$4,E2>$F$4),\"ALARM\",\"\")"],
      ["Estimated start of the change: the last week before the alarm where that CUSUM was zero. In the alarm row (say row 40):", "=MAX(IF(D$2:D40=0,ROW(D$2:D40)))+1   (row number; Ctrl+Shift+Enter in older Excel)"],
      ["For comparison, the 3-sigma rule flags single weeks.", "H2: =IF(ABS(C2)>3,\"beyond 3σ\",\"\")"],
    ],
  },
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 50 L20 52 L34 49 L46 51 L56 40 L66 30 L76 20 L88 10"/><path d="M4 18 h88" stroke-dasharray="4 3" opacity=".6"/><path d="M50 6 v52" opacity=".35"/></svg>`,

  mount(root) {
    const { Plot, watch, css, rng } = Lab;
    const N = 80;
    let seed = 8;

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="cpx" aria-label="Weekly values with the target mean and the true change point"></canvas>
          <div class="legend"><span><i style="background:var(--ink)"></i>Weekly value</span><span><i style="background:var(--muted)"></i>Target mean ± 3σ</span><span><i style="background:var(--violet)"></i>True change</span><span><i style="background:var(--warm)"></i>Beyond 3σ</span></div>
          <figcaption>The shift happens at the violet line. Can you see it by eye?</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="cpc" aria-label="Upper and lower CUSUM with the alarm threshold"></canvas>
          <div class="legend"><span><i style="background:var(--accent)"></i>Upper CUSUM</span><span><i style="background:var(--good)"></i>Lower CUSUM</span><span><i style="background:var(--bad)"></i>Threshold h and alarm</span></div>
          <figcaption>Noise keeps the sums near zero. A shift makes one of them climb steadily.</figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <h4 style="margin:0 0 10px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Worked out, week by week around the change</h4>
          <div style="overflow-x:auto"><table id="tbl" style="width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums"></table></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="sh">Size of shift <output id="shV"></output></label><input type="range" id="sh" min="-2.5" max="2.5" step="0.25" value="1"></div>
        <div class="ctrl"><label for="at">Shift starts in week <output id="atV"></output></label><input type="range" id="at" min="10" max="70" step="1" value="40"></div>
        <div class="ctrl"><label for="k">Allowance k <output id="kV"></output></label><input type="range" id="k" min="0" max="1.5" step="0.1" value="0.5"></div>
        <div class="ctrl"><label for="h">Threshold h <output id="hV"></output></label><input type="range" id="h" min="1" max="10" step="0.5" value="5"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New noise</button></div>`,
      notes: `
        <section>
          <h2>The CUSUM recipe</h2>
          <div class="eq">z(t) = (x(t) − target) ÷ σ<br>S⁺(t) = max(0, S⁺(t−1) + z(t) − k)<br>S⁻(t) = max(0, S⁻(t−1) − z(t) − k)<br>alarm when S⁺ or S⁻ &gt; h</div>
          <p>Each week adds its surprise, minus an allowance k, and the sum can't go below zero. With no shift, z averages 0, so subtracting k keeps the sum pinned near zero. With a shift of δ SDs, it grows by about δ − k per week.</p>
        </section>
        <section>
          <h2>Choosing k and h</h2>
          <p>A common default is k = 0.5 and h = 4 or 5: tuned to catch a 1σ shift in roughly 8–10 weeks, with a false alarm on average only once in several hundred weeks of normal data. Want faster detection of bigger shifts? Raise k. Fewer false alarms? Raise h.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>With a 1σ shift, count the weeks beyond 3σ after the change: usually none. CUSUM still alarms, typically within 8–15 weeks.</li>
            <li>Make the shift 2.5σ. The 3σ rule now wins on speed: big jumps are its strength.</li>
            <li>Set the shift to 0 and h to 2. You'll see false alarms: that's the cost of a low threshold.</li>
            <li>Try a negative shift; the lower CUSUM picks it up.</li>
          </ol>
          <p>Related: <a href="#ts-anomalies">time-series anomalies</a> (one-off spikes), <a href="#forecast-accuracy">forecast bias tracking</a>, <a href="#demand-sensing">demand sensing</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const px = new Plot($("#cpx"), { x: [1, N], pad: { l: 50 } });
    const pc = new Plot($("#cpc"), { x: [1, N], pad: { l: 50 } });

    function draw() {
      const sh = +$("#sh").value, at = +$("#at").value, k = +$("#k").value, h = +$("#h").value;
      $("#shV").textContent = (sh > 0 ? "+" : "") + sh + " σ"; $("#atV").textContent = at; $("#kV").textContent = k.toFixed(1); $("#hV").textContent = h.toFixed(1);
      const r = rng(seed), mu = 200, sd = 20;
      const x = Array.from({ length: N }, (_, t) => mu + sd * (r.normal() + (t + 1 >= at ? sh : 0)));
      const z = x.map((v) => (v - mu) / sd), Sp = [], Sm = [];
      z.forEach((v, t) => { Sp.push(Math.max(0, (t ? Sp[t - 1] : 0) + v - k)); Sm.push(Math.max(0, (t ? Sm[t - 1] : 0) - v - k)); });
      const alarmAll = z.map((_, t) => Sp[t] > h || Sm[t] > h);
      const firstAlarm = alarmAll.findIndex((a, t) => a && t + 1 >= at), falseAl = alarmAll.filter((a, t) => a && t + 1 < at).length;
      const shew = z.map((v) => Math.abs(v) > 3), firstShew = shew.findIndex((s, t) => s && t + 1 >= at), falseSh = shew.filter((s, t) => s && t + 1 < at).length;
      let est = null;
      if (firstAlarm >= 0) { const S = Sp[firstAlarm] > h ? Sp : Sm; let t = firstAlarm; while (t > 0 && S[t - 1] > 0) t--; est = t + 1; }

      const ts = x.map((_, t) => t + 1);
      px.y = [mu - 4.5 * sd + Math.min(0, sh) * sd, mu + 4.5 * sd + Math.max(0, sh) * sd];
      px.clear(); px.axes({ xLabel: "week", xTicks: [1, 10, 20, 30, 40, 50, 60, 70, 80], yCount: 5 });
      [mu, mu + 3 * sd, mu - 3 * sd].forEach((v, i) => px.path([1, N], [v, v], css("--muted"), i ? 1.2 : 1.8, i ? [5, 4] : null));
      px.path([at - 0.5, at - 0.5], px.y, css("--violet"), 2);
      if (sh) px.path([at - 0.5, N], [mu + sh * sd, mu + sh * sd], css("--violet"), 1.4, [2, 4]);
      px.path(ts, x, css("--ink"), 1.6);
      x.forEach((v, t) => px.dot(t + 1, v, shew[t] ? 5 : 2.4, shew[t] ? css("--warm") : css("--ink")));

      const top = Math.max(h * 1.4, ...Sp, ...Sm);
      pc.y = [0, top * 1.05];
      pc.clear(); pc.axes({ xLabel: "week", xTicks: [1, 10, 20, 30, 40, 50, 60, 70, 80], yCount: 4 });
      pc.path([1, N], [h, h], css("--bad"), 1.8, [6, 4]);
      pc.path([at - 0.5, at - 0.5], pc.y, css("--violet"), 1.6);
      pc.path(ts, Sp, css("--accent"), 2.4); pc.path(ts, Sm, css("--good"), 2.4);
      alarmAll.forEach((a, t) => { if (a) pc.dot(t + 1, Math.max(Sp[t], Sm[t]), 4, css("--bad"), css("--surface")); });
      if (est) { pc.path([est - 0.5, est - 0.5], pc.y, css("--accent"), 1.2, [2, 3]); }

      $("#ro").innerHTML = `
        <div class="ro"><b>CUSUM alarm</b><span class="pill ${firstAlarm >= 0 ? "ok" : "bad"}">${firstAlarm >= 0 ? `week ${firstAlarm + 1} (${firstAlarm + 1 - at + 1} wk after)` : "none"}</span></div>
        <div class="ro"><b>Estimated start</b><span class="num">${est ? "week " + est : "—"}</span></div>
        <div class="ro"><b>First week beyond 3σ</b><span class="pill ${firstShew >= 0 ? "ok" : "bad"}">${firstShew >= 0 ? `week ${firstShew + 1} (${firstShew + 1 - at + 1} wk after)` : "none"}</span></div>
        <div class="ro"><b>False alarms before shift</b><span class="num">CUSUM ${falseAl}, 3σ ${falseSh}</span></div>`;

      const from = Math.max(0, at - 4), to = Math.min(N, (firstAlarm >= 0 ? firstAlarm + 2 : at + 12));
      const th = (t) => `<th style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:500">${t}</th>`;
      const td = (v, st = "") => `<td style="text-align:right;padding:4px 8px;border-bottom:1px solid var(--line);font-family:var(--font-mono);${st}">${v}</td>`;
      $("#tbl").innerHTML = `<tr>${th("Week")}${th("Value")}${th("z = (x − 200) ÷ 20")}${th("S⁺ = max(0, prev + z − k)")}${th("S⁻ = max(0, prev − z − k)")}${th("")}</tr>` + ts.slice(from, to).map((w) => {
        const t = w - 1, al = alarmAll[t];
        return `<tr style="${w === at ? "border-top:2px solid var(--violet)" : ""}${al ? ";background:var(--warm-soft)" : ""}">${td(w)}${td(x[t].toFixed(1))}${td(z[t].toFixed(2))}${td(`${(t ? Sp[t - 1] : 0).toFixed(2)} + ${z[t].toFixed(2)} − ${k} → <b>${Sp[t].toFixed(2)}</b>`)}${td(`${(t ? Sm[t - 1] : 0).toFixed(2)} − ${z[t].toFixed(2)} − ${k} → <b>${Sm[t].toFixed(2)}</b>`)}${td(al ? "ALARM" : w === at ? "shift starts" : "", al ? "color:var(--bad);font-weight:700" : "color:var(--violet)")}</tr>`;
      }).join("");
    }

    ["#sh", "#at", "#k", "#h"].forEach((s) => $(s).addEventListener("input", draw));
    $("#newd").addEventListener("click", () => { seed++; draw(); });
    draw();
    return watch([px.c, pc.c], (resized) => { if (resized) { px.resize(); pc.resize(); } draw(); });
  },
});
