Lab.register({
  id: "naive-bayes",
  group: "Machine learning",
  title: "Naive Bayes",
  blurb: "Sort carrier messages into “problem” and “routine” by multiplying simple word probabilities. Tick words, watch each one push the odds, and see why the “naive” assumption makes it overconfident.",
  lede: "Naive Bayes is one of the oldest and fastest classifiers. It learns, for each class, how often each word (or feature) appears, then scores a new message by multiplying those probabilities together with Bayes' rule. The “naive” part is pretending the words are independent of each other. That's rarely true, yet it often ranks messages well, needs very little data, and every number in it can be read.",
  quiz: [
    ["What does “naive” assume?", "That, within each class, features are independent: knowing a message says “delay” tells you nothing extra about whether it also says “late”. It lets the model multiply one probability per word instead of estimating every combination."],
    ["“delay” and “late” almost always appear together. What does naive Bayes do with that?", "It counts the same evidence twice, so the predicted probability is more extreme than it should be. The ranking of messages is often still fine, but the probabilities are overconfident; calibrate them if you need real probabilities."],
    ["Why add 1 to every count (Laplace smoothing)?", "Without it, a word never seen in one class gets probability 0 there, and one unseen word would veto that class no matter what else the message says. Adding a small pseudo-count keeps every probability above zero."],
    ["Why work in log-odds instead of multiplying probabilities?", "Multiplying many small numbers underflows to zero on a computer. Adding logs is stable, and each word's log likelihood ratio is a readable “push” towards one class."],
    ["Only 5% of messages are problems. A message has strong problem words but the model still says routine. Why?", "The prior. Starting odds of 1 to 19 need a lot of evidence to overturn. That's correct Bayesian reasoning, the same as with rare-disease tests, and why rare classes need care."],
  ],
  diy: {
    intro: "Training messages in rows 2–401: class in A (“problem” or “routine”), then one column per word (B:K) with 1 if the message contains it. New message's 0/1 flags in B404:K404.",
    steps: [
      ["Prior: share of problem messages.", "=COUNTIF(A2:A401,\"problem\")/400"],
      ["P(word | problem) with Laplace smoothing α = 1 (fill across B:K).", "B406: =(COUNTIFS($A$2:$A$401,\"problem\",B$2:B$401,1)+1)/(COUNTIF($A$2:$A$401,\"problem\")+2)"],
      ["P(word | routine), the same way.", "B407: =(COUNTIFS($A$2:$A$401,\"routine\",B$2:B$401,1)+1)/(COUNTIF($A$2:$A$401,\"routine\")+2)"],
      ["Each word's push in log-odds: present words use p, absent words use 1 − p.", "B408: =IF(B404=1, LN(B406/B407), LN((1-B406)/(1-B407)))"],
      ["Total log-odds = prior log-odds + all the pushes.", "=LN(prior/(1-prior))+SUM(B408:K408)"],
      ["Back to a probability.", "=1/(1+EXP(-total))"],
    ],
  },
  deeper: [
    ["Domingos & Pazzani (1997), On the optimality of the simple Bayesian classifier under zero-one loss, Machine Learning 29", "https://doi.org/10.1023/A:1007413511361", "why it works despite the false assumption"],
    ["Zhang (2004), The optimality of naive Bayes, FLAIRS conference", "https://cdn.aaai.org/FLAIRS/2004/Flairs04-097.pdf", "dependencies that cancel out"],
    ["Ng & Jordan (2001), On discriminative vs. generative classifiers: a comparison of logistic regression and naive Bayes, NeurIPS", "https://proceedings.neurips.cc/paper/2001/hash/7b7a53e239400a13bd6be6c91c4f6c4e-Abstract.html", "naive Bayes wins with little data, logistic with more"],
    ["Jurafsky & Martin, Speech and Language Processing, ch. 4 Naive Bayes and sentiment classification (free draft)", "https://web.stanford.edu/~jurafsky/slp3/", "textbook treatment with worked examples"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="8" width="38" height="48" rx="3"/><path d="M12 18 H38 M12 26 H32 M12 34 H36 M12 42 H26" stroke-opacity=".6"/><path d="M52 32 H62"/><path d="M66 50 V36 M76 50 V22 M86 50 V30" stroke-width="6"/></svg>`,

  mount(root) {
    const { Plot, fmt, css, watch, rng } = Lab;
    const WORDS = ["delay", "late", "damaged", "customs", "weather", "missed", "delivered", "confirmed", "scheduled", "ETA"];
    // [P(word | problem), P(word | routine)]; "delay" and "late" are generated together.
    const PW = { damaged: [0.18, 0.01], customs: [0.25, 0.08], weather: [0.22, 0.04], missed: [0.2, 0.02], delivered: [0.15, 0.55], confirmed: [0.12, 0.45], scheduled: [0.3, 0.4], ETA: [0.45, 0.35] };
    const h4 = (t) => `<h4 style="margin:0 0 6px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const two = (a, b) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">${a}${b}</div>`;
    const $ = (s) => root.querySelector(s);
    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot wide" style="padding:14px">${h4("The new message: tick the words it contains")}<div id="chips" style="display:flex;flex-wrap:wrap;gap:6px"></div><p id="verdict" style="margin:12px 0 0;font-size:1.05rem"></p></div>
        ${two(`<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("How each word pushes the odds")}</div><canvas id="n1" style="height:330px" aria-label="Log-odds contributions of the prior and each word"></canvas><figcaption id="n1Cap"></figcaption></figure>`,
          `<figure class="plot" style="margin:0"><div style="padding:4px 6px 0">${h4("Is it overconfident?")}</div><canvas id="n2" style="height:330px" aria-label="Naive Bayes probability against the real share of problems, by group of messages"></canvas><figcaption id="n2Cap"></figcaption></figure>`)}
        <div class="plot wide" style="padding:14px;overflow-x:auto">${h4("What the model learned from the training messages")}<div id="tbl"></div></div>`,
      panel: `
        <p class="hint" style="margin:0">Training data: messages from carriers, each labelled by a planner as a <b>problem</b> (needs action) or <b>routine</b>. “delay” and “late” nearly always come as a pair.</p>
        <div class="ctrl"><label for="pr">Share of messages that are problems <output id="prV"></output></label><input type="range" id="pr" min="0.05" max="0.6" step="0.01" value="0.25"></div>
        <div class="ctrl"><label for="n">Training messages <output id="nV"></output></label><input type="range" id="n" min="40" max="2000" step="20" value="400"></div>
        <div class="ctrl"><label for="al">Laplace smoothing α <output id="alV"></output></label><input type="range" id="al" min="0" max="3" step="0.1" value="1"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="rand" type="button">Random new message</button><button class="btn" id="resim" type="button">New training messages</button><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>Bayes' rule, one word at a time</h2>
          <div class="eq">P(problem | words) ∝ P(problem) × P(word₁ | problem) × P(word₂ | problem) × …</div>
          <p>Do the same for routine, then divide each by their total so they sum to 1. In log-odds form it becomes a sum, which is what the push chart shows:</p>
          <div class="eq">log-odds = ln(prior odds) + Σ ln( P(word | problem) / P(word | routine) )</div>
          <p>This version (Bernoulli naive Bayes) also counts words that are <i>absent</i>: a message that doesn't say “delivered” is a little more likely to be a problem. The grey bar adds up all the absent words.</p>
        </section>
        <section>
          <h2>Why it still works</h2>
          <p>The independence assumption is almost always wrong, so the probabilities come out too extreme. But classification only needs the right side of 50%, and the double-counting often pushes the right way. With little data naive Bayes can beat <a href="#logistic-regression">logistic regression</a>, which has to estimate how the features interact; with plenty of data logistic regression usually catches up and gives better probabilities.</p>
        </section>
        <section>
          <h2>The overconfidence chart</h2>
          <p>Each dot is a group of training messages with the same naive Bayes score band. Its height is the share that really were problems. On the diagonal means “when it says 80%, it's right 80% of the time”. Dots below the diagonal on the right and above it on the left mean overconfidence, mostly from counting “delay” and “late” twice. See <a href="#imbalanced-calibration">rare events and calibration</a> for fixes.</p>
        </section>
        <section>
          <h2>Where it's used</h2>
          <p>Spam filters, routing support tickets and emails, tagging free-text reasons on returns or delivery notes, and as a quick baseline before trying anything heavier.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ul>
            <li>Tick only “delay”, then add “late”: the probability jumps although “late” adds almost no new information.</li>
            <li>Set α to 0 and the training messages to 40: a word never seen in one class gives an infinite push.</li>
            <li>Drop the share of problems to 5%: the same words now leave many messages below 50%.</li>
          </ul>
        </section>`,
    });

    let seed = 4, data = [], model = null, msg = new Set(["delay", "late", "customs"]);
    function gen() {
      const r = rng(seed), n = +$("#n").value, pr = +$("#pr").value;
      data = Array.from({ length: n }, () => {
        const y = r() < pr ? 1 : 0, w = new Set(), dl = r() < (y ? 0.6 : 0.05);
        if (dl) { if (r() < 0.95) w.add("delay"); if (r() < 0.9) w.add("late"); } else { if (r() < 0.03) w.add("delay"); if (r() < 0.04) w.add("late"); }
        for (const k in PW) if (r() < PW[k][y ? 0 : 1]) w.add(k);
        return { y, w };
      });
    }
    function fit() {
      const al = +$("#al").value, np = data.filter((d) => d.y).length, nr = data.length - np, M = { np, nr, prior: np / data.length, w: {} };
      WORDS.forEach((k) => { const cp = data.filter((d) => d.y && d.w.has(k)).length, cr = data.filter((d) => !d.y && d.w.has(k)).length; M.w[k] = { cp, cr, pp: (cp + al) / (np + 2 * al), pr: (cr + al) / (nr + 2 * al) }; });
      model = M;
    }
    const lr = (p, q) => (p === 0 && q === 0 ? 0 : p === 0 ? -Infinity : q === 0 ? Infinity : Math.log(p / q));
    function score(w) {
      const M = model, parts = [], prior = lr(M.prior, 1 - M.prior); let absent = 0;
      WORDS.forEach((k) => { const m = M.w[k]; if (w.has(k)) parts.push([k, lr(m.pp, m.pr)]); else absent += lr(1 - m.pp, 1 - m.pr); });
      const tot = prior + parts.reduce((s, p) => s + p[1], 0) + absent;
      return { prior, parts, absent, tot, p: 1 / (1 + Math.exp(-tot)) };
    }
    const P1 = new Plot($("#n1"), { pad: { l: 92, r: 16, b: 38 } }), P2 = new Plot($("#n2"), { x: [0, 1], y: [0, 1], pad: { l: 46, b: 38 } });
    const fin = (v) => (isFinite(v) ? v : Math.sign(v) * 8);
    function d1() {
      const S = score(msg), rows = [["prior", S.prior, "--muted"], ...S.parts.map(([k, v]) => [k, v, v >= 0 ? "--bad" : "--accent"]), ["absent words", S.absent, "--violet"], ["total", S.tot, S.tot >= 0 ? "--bad" : "--accent"]];
      let run = 0; const segs = rows.map(([k, v, c], i) => { const last = i === rows.length - 1, a = last ? 0 : run, b = last ? fin(v) : run + fin(v); if (!last) run = b; return { k, v, c, a, b }; });
      const ext = Math.max(4, ...segs.map((s) => Math.max(Math.abs(s.a), Math.abs(s.b)))) * 1.1;
      P1.resize(); P1.x = [-ext, ext]; P1.y = [0, rows.length]; P1.clear(); P1.axes({ xLabel: "log-odds (← routine | problem →)", yLabel: "", xFormat: (v) => fmt(v, 0), yTicks: [], xCount: 6 });
      const g = P1.ctx, bh = P1.ih / rows.length;
      P1.path([0, 0], [0, rows.length], css("--ink"), 1);
      segs.forEach((s, i) => { const y = P1.pad.t + i * bh, x0 = P1.sx(Math.min(s.a, s.b)), x1 = P1.sx(Math.max(s.a, s.b)); g.fillStyle = css(s.c); g.globalAlpha = s.k === "total" ? 1 : 0.8; g.fillRect(x0, y + bh * 0.2, Math.max(2, x1 - x0), bh * 0.6); g.globalAlpha = 1;
        g.fillStyle = css("--ink"); g.font = (s.k === "total" ? "600 " : "") + "12px " + css("--font-body"); g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(s.k, P1.pad.l - 8, y + bh / 2);
        g.font = "10px " + css("--font-mono"); g.textAlign = s.b >= s.a ? "left" : "right"; g.fillText((s.v >= 0 ? "+" : "") + (isFinite(s.v) ? fmt(s.v, 2) : (s.v > 0 ? "∞" : "−∞")), s.b >= s.a ? x1 + 4 : x0 - 4, y + bh / 2); });
      $("#n1Cap").innerHTML = `Bars start where the previous one ended. Red pushes towards problem, blue towards routine. Total log-odds ${isFinite(S.tot) ? fmt(S.tot, 2) : "±∞"} → probability 1 / (1 + e<sup>−total</sup>) = <b>${fmt(S.p * 100, 1)}%</b>.`;
    }
    function d2() {
      const B = 10, bins = Array.from({ length: B }, () => [0, 0, 0]);
      data.forEach((d) => { const p = score(d.w).p, b = Math.min(B - 1, Math.floor(p * B)); bins[b][0]++; bins[b][1] += d.y; bins[b][2] += p; });
      P2.resize(); P2.clear(); P2.axes({ xLabel: "naive Bayes probability of problem", yLabel: "real share that were problems", xFormat: (v) => Math.round(v * 100) + "%", yFormat: (v) => Math.round(v * 100) + "%", xCount: 5, yCount: 5 });
      P2.path([0, 1], [0, 1], css("--muted"), 1.2, [5, 4]);
      const pts = bins.filter((b) => b[0] >= 3).map((b) => [b[2] / b[0], b[1] / b[0], b[0]]);
      P2.path(pts.map((p) => p[0]), pts.map((p) => p[1]), css("--accent"), 1.5);
      pts.forEach(([x, y, n]) => P2.dot(x, y, 3 + Math.min(7, Math.sqrt(n) / 2), css("--accent"), css("--surface")));
      const both = data.filter((d) => d.w.has("delay") && d.w.has("late")), sh = both.length ? both.reduce((s, d) => s + d.y, 0) / both.length : NaN, nbp = both.length ? both.reduce((s, d) => s + score(d.w).p, 0) / both.length : NaN;
      $("#n2Cap").innerHTML = `Each dot: training messages in one score band (bigger = more messages). Dashed: perfect calibration. Messages with both “delay” and “late”: model says ${fmt(nbp * 100, 0)}% on average, really ${fmt(sh * 100, 0)}% problems.`;
    }
    function tbl() {
      const M = model, al = +$("#al").value;
      $("#tbl").innerHTML = `<table style="border-collapse:collapse;font:.78rem var(--font-mono);white-space:nowrap"><thead><tr style="color:var(--muted);text-align:right"><th style="text-align:left;padding:3px 8px">word</th><th style="padding:3px 8px">in problem msgs</th><th style="padding:3px 8px">in routine msgs</th><th style="padding:3px 8px">P(word | problem)</th><th style="padding:3px 8px">P(word | routine)</th><th style="padding:3px 8px">push if present</th></tr></thead><tbody>` +
        WORDS.map((k) => { const m = M.w[k], v = lr(m.pp, m.pr); return `<tr style="text-align:right;border-top:1px solid var(--line);${msg.has(k) ? "background:var(--accent-soft)" : ""}"><td style="text-align:left;padding:3px 8px;font-weight:600">${k}</td><td style="padding:3px 8px">${m.cp} / ${M.np}</td><td style="padding:3px 8px">${m.cr} / ${M.nr}</td><td style="padding:3px 8px">(${m.cp}+${fmt(al, 1)})/(${M.np}+${fmt(2 * al, 1)}) = ${fmt(m.pp, 3)}</td><td style="padding:3px 8px">${fmt(m.pr, 3)}</td><td style="padding:3px 8px;color:var(${v >= 0 ? "--bad" : "--accent"})">${isFinite(v) ? (v >= 0 ? "+" : "") + fmt(v, 2) : v > 0 ? "+∞" : "−∞"}</td></tr>`; }).join("") +
        `</tbody></table><p class="hint" style="margin:8px 0 0">Prior: ${M.np} problems out of ${data.length} messages = ${fmt(M.prior, 3)}, log-odds ln(${fmt(M.prior, 3)} / ${fmt(1 - M.prior, 3)}) = ${fmt(lr(M.prior, 1 - M.prior), 2)}. Highlighted rows are in the new message.</p>`;
    }
    function chips() {
      $("#chips").innerHTML = WORDS.map((k) => `<button type="button" data-w="${k}" aria-pressed="${msg.has(k)}" style="padding:6px 11px;border-radius:999px;border:1.5px solid ${msg.has(k) ? "var(--accent)" : "var(--line)"};background:${msg.has(k) ? "var(--accent-soft)" : "var(--surface)"};color:var(--ink);font:inherit;cursor:pointer">${msg.has(k) ? "✓ " : ""}${k}</button>`).join("");
      root.querySelectorAll("#chips button").forEach((b) => b.addEventListener("click", () => { const k = b.dataset.w; msg.has(k) ? msg.delete(k) : msg.add(k); draw(); }));
      const S = score(msg);
      $("#verdict").innerHTML = `“${[...msg].join(" … ") || "(no listed words)"}” → <b style="color:var(${S.p >= 0.5 ? "--bad" : "--accent"})">${S.p >= 0.5 ? "problem" : "routine"}</b>, ${fmt(S.p * 100, 1)}% chance of a problem.`;
    }
    function readouts() {
      const acc = data.reduce((s, d) => s + ((score(d.w).p >= 0.5 ? 1 : 0) === d.y ? 1 : 0), 0) / data.length, S = score(msg), ll = -data.reduce((s, d) => { const p = Math.min(1 - 1e-9, Math.max(1e-9, score(d.w).p)); return s + (d.y ? Math.log(p) : Math.log(1 - p)); }, 0) / data.length;
      $("#ro").innerHTML = [["P(problem) for the new message", `<span class="pill ${S.p >= 0.5 ? "bad" : "ok"}">${fmt(S.p * 100, 1)}%</span>`], ["Accuracy on training messages", `<span class="num">${fmt(acc * 100, 1)}%</span>`], ["Log loss (lower is better)", `<span class="num">${fmt(ll, 3)}</span>`]]
        .map(([n, v]) => `<div class="ro"><b>${n}</b>${v}</div>`).join("");
    }
    function labels() { $("#prV").textContent = Math.round(+$("#pr").value * 100) + "%"; $("#nV").textContent = $("#n").value; $("#alV").textContent = fmt(+$("#al").value, 1); }
    function draw() { labels(); chips(); d1(); d2(); tbl(); readouts(); }
    ["pr", "n"].forEach((id) => $("#" + id).addEventListener("input", () => { gen(); fit(); draw(); }));
    $("#al").addEventListener("input", () => { fit(); draw(); });
    $("#rand").addEventListener("click", () => { const d = data[Math.floor(Math.random() * data.length)]; msg = new Set(d.w); draw(); });
    $("#resim").addEventListener("click", () => { seed++; gen(); fit(); draw(); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); seed = 4; msg = new Set(["delay", "late", "customs"]); gen(); fit(); draw(); });
    gen(); fit(); draw();
    return watch([$("#n1"), $("#n2")], () => { d1(); d2(); });
  },
});
