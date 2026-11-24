Lab.register({
  id: "monthly-to-weekly",
  group: "Supply chain",
  title: "Splitting monthly forecasts into weeks",
  blurb: "A good monthly forecast can still make a poor weekly one. Compare dividing by 4.33, a straight line by days, and a daily profile, and see what each does to weekly accuracy.",
  lede: "Plans are often made monthly but executed weekly. The monthly number has to be split into weeks somehow, and the split is a forecast too. Months don't divide into whole weeks, weeks straddle month ends, and demand isn't flat across the days of a week or a month. A careless split adds error that the monthly accuracy report never shows.",
  quiz: [
    ["A month with 31 days starts on a Wednesday. Using ÷ 4.33, how many weekly buckets does it get, and what goes wrong?", "Weeks belong to the month that holds their Thursday, so this month gets 5 weeks (Thursdays on the 2nd, 9th, 16th, 23rd and 30th). Each gets monthly ÷ 4.33, so the weeks sum to 5/4.33 = 115% of the month. The months with 4 Thursdays get only 92%."],
    ["The straight-line split and the daily profile give the same monthly totals. Why can their weekly accuracy differ?", "Both preserve the monthly total, but they put it into different days. If Saturdays sell twice what Tuesdays do, or the first days of the month spike after payday, a flat split puts too little in some weeks and too much in others. The errors cancel over the month, so the monthly accuracy hides them."],
    ["Your monthly forecast is perfect. Can your weekly MAPE still be 10%?", "Yes. Set the monthly error slider to 0%: all the remaining weekly error comes from the split, plus daily noise."],
    ["Where does the daily profile come from, and what could break it?", "From history: the average share of demand on each weekday and at each point in the month. It breaks when the pattern changes, for example a holiday moving dates, a store changing its opening hours, or a promotion calendar shifting."],
  ],
  diy: {
    intro: "Monthly forecast in H1, the month's dates in A2:A32, day-of-week weights (Mon…Sun) in K2:K8.",
    steps: [
      ["Weight for each date.", "B2: =INDEX($K$2:$K$8,WEEKDAY(A2,2))"],
      ["Daily forecast.", "C2: =$H$1*B2/SUM($B$2:$B$32)"],
      ["Week each date belongs to (Monday start).", "D2: =A2-WEEKDAY(A2,2)+1"],
      ["Weekly forecast: sum the daily forecasts per week start (across both months for split weeks).", "=SUMIF(D:D,week_start,C:C)"],
      ["Naive alternative for comparison: monthly ÷ 4.33.", "=H1/(365/12/7)"],
    ],
  },
  deeper: [
    ["FPP3: Temporal aggregation and reconciliation", "https://otexts.com/fpp3/hierarchical.html", "forecasting at several time granularities so they add up"],
    ["ISO week date — Wikipedia", "https://en.wikipedia.org/wiki/ISO_week_date", "why weeks are assigned to years and months by their Thursday"],
    ["FPP3: Calendar adjustments", "https://otexts.com/fpp3/transformations.html", "adjusting for the number of trading days in a month"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="8" width="84" height="16" rx="2" fill="currentColor" fill-opacity=".2"/><g fill="currentColor"><rect x="6" y="36" width="18" height="20" opacity=".5"/><rect x="28" y="30" width="18" height="26" opacity=".75"/><rect x="50" y="40" width="18" height="16" opacity=".5"/><rect x="72" y="34" width="18" height="22" opacity=".75"/></g><path d="M48 24 L48 30" stroke-dasharray="2 2"/></svg>`,

  mount(root) {
    const { Plot, watch, rng, fmt, css } = Lab;
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const BASE_DOW = [0.85, 0.85, 0.9, 1.0, 1.2, 1.4, 0.8];
    const METHODS = [
      { id: "div", name: "÷ 4.33 per week", col: "--warm" },
      { id: "flat", name: "Straight line by days", col: "--violet" },
      { id: "prof", name: "Daily profile", col: "--accent" },
    ];
    const DAY = 86400000;
    const days = []; // 2025 (history) and 2026 (test year), UTC dates
    for (let t = Date.UTC(2025, 0, 1); t < Date.UTC(2027, 0, 1); t += DAY) { const d = new Date(t); days.push({ y: d.getUTCFullYear(), m: d.getUTCMonth(), dom: d.getUTCDate(), dow: (d.getUTCDay() + 6) % 7, t }); }
    const dim = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const bucket = (dom, n) => (dom <= 3 ? 0 : dom <= 10 ? 1 : dom <= n - 6 ? 2 : 3);
    const BUCKETS = ["days 1–3", "days 4–10", "mid-month", "last 6 days"];

    root.innerHTML = Lab.page(this, {
      figure: `
        <figure class="plot wide">
          <canvas id="mwc" aria-label="Weekly actuals and three weekly splits of the monthly forecast"></canvas>
          <div class="legend"><span><i style="background:var(--ink)"></i>Weekly actual</span>${METHODS.map((m) => `<span><i style="background:var(${m.col})"></i>${m.name}</span>`).join("")}</div>
          <figcaption>2026, week by week (Monday to Sunday). Faint vertical lines are month ends.</figcaption>
        </figure>
        <figure class="plot short">
          <canvas id="mwd" aria-label="Daily actuals in one month with the flat and profile daily forecasts"></canvas>
          <figcaption id="dcap"></figcaption>
        </figure>
        <div class="plot" style="padding:14px">
          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">
            <h4 style="margin:0;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">One month split into weeks, worked out</h4>
            <select id="mon" aria-label="Month">${MON.map((m, i) => `<option value="${i}" ${i === 4 ? "selected" : ""}>${m} 2026</option>`).join("")}</select>
          </div>
          <div style="overflow-x:auto"><table id="work" style="width:100%;border-collapse:collapse;font-size:.8rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono)"></table></div>
          <p class="hint" style="margin-top:8px" id="workNote"></p>
        </div>`,
      panel: `
        <div class="ctrl"><label for="dw">Weekday pattern <output id="dwV"></output></label><input type="range" id="dw" min="0" max="1.5" step="0.1" value="1"></div>
        <div class="ctrl"><label for="pd">Start-of-month (payday) spike <output id="pdV"></output></label><input type="range" id="pd" min="0" max="1" step="0.05" value="0.5"></div>
        <div class="ctrl"><label for="me">Monthly forecast error (SD) <output id="meV"></output></label><input type="range" id="me" min="0" max="20" step="1" value="5"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="newd" type="button">New random year</button></div>`,
      notes: `
        <section>
          <h2>Three ways to split</h2>
          <ul>
            <li><b>÷ 4.33:</b> every week that "belongs" to a month (by its Thursday) gets the monthly number divided by 52/12 = 4.33. Simple, but months have either 4 or 5 such weeks, so totals don't add back up.</li>
            <li><b>Straight line by days:</b> divide the month by its number of days, then add up each week's days, including weeks that straddle two months. Totals always match, but every day is treated as equal.</li>
            <li><b>Daily profile:</b> give each day a weight from history (its weekday share times its point-in-month share), then split the month in proportion to the weights.</li>
          </ul>
          <div class="eq">daily forecast = monthly forecast × weight(day) / Σ weights in month<br>weekly forecast = Σ daily forecasts, Monday to Sunday</div>
        </section>
        <section>
          <h2>Why monthly accuracy hides it</h2>
          <p>The straight line and the profile give identical monthly totals, so a monthly accuracy report scores them the same. The difference only shows at weekly level, which is where replenishment, labour and transport actually get planned.</p>
          <p>The weekday pattern matters most for weeks split across month ends. A week with Monday to Wednesday in one month and Thursday to Sunday in the next gets a very different share depending on which days are heavy.</p>
          <p>The profile is estimated from 2025, then used for 2026. The readouts list the weekday weights it estimated.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Set monthly error to 0%. Every bit of remaining weekly error comes from the split itself (plus daily noise).</li>
            <li>Set the weekday pattern and payday spike to 0. Now the straight line is as good as the profile.</li>
            <li>Raise the payday spike to 1. The first week of each month is under-forecast by the straight line, and the last week over-forecast.</li>
            <li>Look at the ÷ 4.33 line: it jumps between months with 4 and 5 weeks, even when demand is smooth.</li>
          </ol>
          <p>Related: <a href="#forecast-accuracy">forecast accuracy measures</a>, <a href="#seasonal-decomposition">seasonal indices</a> (the same idea as the daily profile, one level up) and <a href="#lead-time-error">lead-time error</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    const pW = new Plot($("#mwc"), { pad: { l: 52 } });
    const pD = new Plot($("#mwd"), { pad: { l: 52 } });
    let seed = 4, S = null;

    function compute() {
      const r = rng(seed), dw = +$("#dw").value, pd = +$("#pd").value, me = +$("#me").value / 100;
      const dowIdx = BASE_DOW.map((v) => 1 + dw * (v - 1));
      const domIdx = (dom, n) => (dom <= 3 ? 1 + 0.8 * pd : dom <= 10 ? 1 + 0.2 * pd : dom > n - 6 ? 1 - 0.25 * pd : 1 - 0.05 * pd);
      const act = days.map((d) => {
        const season = 1 + 0.15 * Math.sin((2 * Math.PI * (d.m - 2)) / 12), trend = d.y === 2026 ? 1.05 : 1;
        return Math.max(0, 100 * season * trend * dowIdx[d.dow] * domIdx(d.dom, dim(d.y, d.m)) * (1 + 0.08 * r.normal()));
      });
      // monthly totals and forecasts for 2026
      const mTot = {}; days.forEach((d, i) => { const k = d.y * 12 + d.m; mTot[k] = (mTot[k] || 0) + act[i]; });
      const mFc = {}; for (let m = 0; m < 12; m++) mFc[2026 * 12 + m] = mTot[2026 * 12 + m] * (1 + me * r.normal());
      // profile from 2025: weekday share, then point-in-month share after removing weekday
      const dS = Array(7).fill(0), dC = Array(7).fill(0), bS = Array(4).fill(0), bC = Array(4).fill(0);
      days.forEach((d, i) => { if (d.y !== 2025) return; const avg = mTot[d.y * 12 + d.m] / dim(d.y, d.m); dS[d.dow] += act[i] / avg; dC[d.dow]++; });
      const estDow = dS.map((s, i) => s / dC[i]);
      days.forEach((d, i) => { if (d.y !== 2025) return; const avg = mTot[d.y * 12 + d.m] / dim(d.y, d.m), b = bucket(d.dom, dim(d.y, d.m)); bS[b] += act[i] / avg / estDow[d.dow]; bC[b]++; });
      const estB = bS.map((s, i) => s / bC[i]);
      const wt = days.map((d) => estDow[d.dow] * estB[bucket(d.dom, dim(d.y, d.m))]);
      const wSum = {}; days.forEach((d, i) => { const k = d.y * 12 + d.m; wSum[k] = (wSum[k] || 0) + wt[i]; });
      const dayFc = {
        flat: days.map((d) => (d.y === 2026 ? mFc[d.y * 12 + d.m] / dim(d.y, d.m) : NaN)),
        prof: days.map((d, i) => (d.y === 2026 ? (mFc[d.y * 12 + d.m] * wt[i]) / wSum[d.y * 12 + d.m] : NaN)),
      };
      // weeks Monday–Sunday fully inside 2026
      const first = days.findIndex((d) => d.y === 2026 && d.dow === 0), weeks = [];
      for (let s = first; s + 6 < days.length && days[s + 6].y === 2026; s += 7) {
        const idx = [0, 1, 2, 3, 4, 5, 6].map((j) => s + j), thu = days[s + 3];
        const w = { start: s, idx, thuM: thu.m, a: idx.reduce((x, i) => x + act[i], 0), f: {} };
        w.f.flat = idx.reduce((x, i) => x + dayFc.flat[i], 0);
        w.f.prof = idx.reduce((x, i) => x + dayFc.prof[i], 0);
        w.f.div = mFc[2026 * 12 + thu.m] / (52 / 12);
        weeks.push(w);
      }
      // scores
      const score = (id) => {
        let ape = 0, ae = 0, sa = 0;
        weeks.forEach((w) => { const e = Math.abs(w.a - w.f[id]); ape += e / w.a; ae += e; sa += w.a; });
        const mm = {}; weeks.forEach((w) => { mm[w.thuM] = (mm[w.thuM] || 0) + w.f[id]; });
        let mape = 0; for (let m = 0; m < 12; m++) { const fm = id === "div" ? mm[m] : mFc[2026 * 12 + m]; mape += Math.abs(mTot[2026 * 12 + m] - fm) / mTot[2026 * 12 + m]; }
        return { wmape: (ape / weeks.length) * 100, wape: (ae / sa) * 100, mmape: (mape / 12) * 100 };
      };
      S = { act, dayFc, weeks, mTot, mFc, wt, wSum, estDow, estB, dowIdx, scores: Object.fromEntries(METHODS.map((m) => [m.id, score(m.id)])) };
    }

    function draw() {
      $("#dwV").textContent = +$("#dw").value ? `Sat ${Math.round((1 + +$("#dw").value * 0.4) * 100)}% of avg` : "flat";
      $("#pdV").textContent = +$("#pd").value ? `+${Math.round(+$("#pd").value * 80)}% on days 1–3` : "none";
      $("#meV").textContent = $("#me").value + "%";
      const { act, dayFc, weeks, mTot, mFc, wt, wSum, estDow, scores } = S;

      const xs = weeks.map((_, i) => i), vals = weeks.flatMap((w) => [w.a, w.f.div, w.f.flat, w.f.prof]);
      pW.x = [-0.5, weeks.length - 0.5]; pW.y = [Math.min(...vals) * 0.92, Math.max(...vals) * 1.05];
      pW.clear();
      const mStarts = weeks.map((w, i) => [i, days[w.start].m]).filter(([i, m], k, a) => k === 0 || m !== a[k - 1][1]);
      pW.axes({ xTicks: mStarts.map(([i]) => i), xFormat: (v) => MON[days[weeks[v].start].m], yLabel: "units per week" });
      const g = pW.ctx; g.save(); g.strokeStyle = css("--line"); g.setLineDash([2, 3]);
      weeks.forEach((w, i) => { const k = w.idx.findIndex((j) => days[j].dom === 1); if (k > 0) { const x = pW.sx(i - 0.5 + k / 7); g.beginPath(); g.moveTo(x, pW.pad.t); g.lineTo(x, pW.h - pW.pad.b); g.stroke(); } });
      g.restore();
      METHODS.forEach((m) => pW.path(xs, weeks.map((w) => w.f[m.id]), css(m.col), m.id === "prof" ? 2.4 : 1.8, m.id === "div" ? [5, 3] : null));
      pW.path(xs, weeks.map((w) => w.a), css("--ink"), 2.2);
      weeks.forEach((w, i) => pW.dot(i, w.a, 2.5, css("--ink")));

      $("#ro").innerHTML = `<div class="ro" style="font-size:.78rem;color:var(--muted)"><b>method</b><span>weekly MAPE · monthly MAPE</span></div>` + METHODS.map((m) => {
        const s = scores[m.id], best = Math.min(...METHODS.map((x) => scores[x.id].wmape)) === s.wmape;
        return `<div class="ro"><b><i style="display:inline-block;width:10px;height:4px;border-radius:2px;background:var(${m.col});margin-right:6px;vertical-align:middle"></i>${m.name}</b><span class="num"><span class="pill ${best ? "ok" : "idle"}">${s.wmape.toFixed(1)}%</span> · ${s.mmape.toFixed(1)}%</span></div>`;
      }).join("") + `<div class="ro" style="font-size:.8rem;color:var(--muted);display:block">Estimated weekday weights: ${estDow.map((v, i) => `${DOW[i]} ${v.toFixed(2)}`).join(", ")}</div>`;

      // daily chart for chosen month
      const mo = +$("#mon").value, di = days.map((d, i) => [d, i]).filter(([d]) => d.y === 2026 && d.m === mo).map(([, i]) => i);
      const dv = di.flatMap((i) => [act[i], dayFc.flat[i], dayFc.prof[i]]);
      pD.x = [0.5, di.length + 0.5]; pD.y = [0, Math.max(...dv) * 1.1];
      pD.clear();
      pD.axes({ xTicks: di.map((_, k) => k + 1).filter((v) => v === 1 || v % 5 === 0), xLabel: `day of ${MON[mo]}`, yLabel: "units per day", yCount: 4 });
      const gd = pD.ctx; gd.save();
      di.forEach((i, k) => { const x = pD.sx(k + 1), w = (pD.sx(2) - pD.sx(1)) * 0.7; gd.fillStyle = css(days[i].dow >= 5 ? "--ink" : "--muted"); gd.globalAlpha = days[i].dow >= 5 ? 0.55 : 0.35; gd.fillRect(x - w / 2, pD.sy(act[i]), w, pD.sy(0) - pD.sy(act[i])); });
      gd.restore();
      const step = (arr) => { const x = [], y = []; di.forEach((i, k) => { x.push(k + 0.5, k + 1.5); y.push(arr[i], arr[i]); }); return [x, y]; };
      pD.path(...step(dayFc.flat), css("--violet"), 2);
      pD.path(...step(dayFc.prof), css("--accent"), 2.4);
      $("#dcap").innerHTML = `${MON[mo]} 2026 by day. Bars are actuals (darker = weekend). Purple is the straight line, blue the daily profile; both add up to the same monthly forecast of ${fmt(mFc[2026 * 12 + mo], 0)}.`;

      // worked table: weeks touching the month
      const touching = weeks.filter((w) => w.idx.some((i) => days[i].m === mo));
      const hd = (t) => `<th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-weight:500;color:var(--muted);font-family:var(--font-body)">${t}</th>`;
      const td = (t, extra = "") => `<td style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--grid);${extra}">${t}</td>`;
      const k = 2026 * 12 + mo, n = dim(2026, mo), F = mFc[k];
      const dd = (i) => { const d = days[i]; return `${d.dom} ${MON[d.m]}`; };
      $("#work").innerHTML = `<tr>${hd("week (Mon–Sun)")}${hd(`days in ${MON[mo]}`)}${hd("straight-line share")}${hd("profile share")}${hd("÷ 4.33")}${hd("straight line")}${hd("profile")}${hd("actual week")}</tr>` +
        touching.map((w) => {
          const inM = w.idx.filter((i) => days[i].m === mo), flatShare = inM.length / n, profShare = inM.reduce((x, i) => x + wt[i], 0) / wSum[k];
          const ap = (f) => `<span style="color:var(--muted)">(${((Math.abs(w.a - f) / w.a) * 100).toFixed(0)}%)</span>`;
          return `<tr>${td(`${dd(w.idx[0])} – ${dd(w.idx[6])}`, "font-family:var(--font-body);text-align:left")}${td(inM.length)}${td((flatShare * 100).toFixed(1) + "%")}${td((profShare * 100).toFixed(1) + "%")}${td(`${fmt(w.f.div, 0)} ${ap(w.f.div)}`)}${td(`${fmt(w.f.flat, 0)} ${ap(w.f.flat)}`)}${td(`${fmt(w.f.prof, 0)} ${ap(w.f.prof)}`)}${td(fmt(w.a, 0), "font-weight:600")}</tr>`;
        }).join("");
      $("#workNote").innerHTML = `Monthly forecast ${fmt(F, 0)} (actual month ${fmt(mTot[k], 0)}). Shares are the part of <i>this</i> month's forecast that lands in each week; weeks that straddle a month end also get a share of the neighbouring month, which is why the week totals include more than this month's share. Bracketed numbers are each week's absolute percentage error.`;
    }

    const rerun = () => { compute(); draw(); };
    ["#dw", "#pd", "#me"].forEach((s) => $(s).addEventListener("input", rerun));
    $("#mon").addEventListener("change", draw);
    $("#newd").addEventListener("click", () => { seed++; rerun(); });
    rerun();
    return watch([pW.c, pD.c], (resized) => { if (resized) { pW.resize(); pD.resize(); } draw(); });
  },
});
