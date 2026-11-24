// Registry + hash router. Each explainer file calls Lab.register({...}).
(function () {
  const explainers = [];
  Lab.explainers = explainers;
  const groups = ["Regression", "Machine learning", "Probability", "Statistical analysis", "Forecasting", "Supply chain", "Optimization", "Data quality"];
  Lab.register = (ex) => explainers.push(ex);
  Lab.titleOf = (id) => (explainers.find((e) => e.id === id) || { title: id }).title;

  // Standard page layout for an explainer.
  Lab.page = (ex, { figure, panel, notes }) => `
    <div class="wrap">
      <header class="ex-head">
        <div class="eyebrow">${ex.group}</div>
        <h1>${ex.title}</h1>
        <p>${ex.lede}</p>
      </header>
      <div class="bench">
        <div class="figure">${figure}</div>
        <aside class="panel" aria-label="Controls">${panel}</aside>
      </div>
      <article class="notes">${notes}${Lab.extras(ex)}</article>
    </div>`;

  // "Check yourself" questions and "Go deeper" links, declared on the explainer as quiz / deeper.
  Lab.extras = (ex) => {
    let h = "";
    if (ex.diy) {
      const d = Array.isArray(ex.diy) ? { steps: ex.diy } : ex.diy;
      h += `<section class="diy"><h2>Do it yourself</h2>${d.intro ? `<p>${d.intro}</p>` : ""}<ol>${d.steps.map(([s, f]) => `<li>${s}${f ? `<div class="xl"><code>${f.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code><button class="cp" type="button">Copy</button></div>` : ""}</li>`).join("")}</ol></section>`;
    }
    if (ex.quiz && ex.quiz.length) h += `<section class="quiz"><h2>Check yourself</h2><div class="qgrid">${ex.quiz.map(([q, a], i) => `
      <details><summary><span class="qn">Q${i + 1}</span>${q}</summary><div>${a}</div></details>`).join("")}</div></section>`;
    if (ex.deeper && ex.deeper.length) h += `<section class="deeper"><h2>Go deeper</h2><ul>${ex.deeper.map(([t, u, d]) => `
      <li><a href="${u}" target="_blank" rel="noopener">${t}</a>${d ? ` <span>${d}</span>` : ""}${Lab.paperSummaries && Lab.paperSummaries[u] ? `<div class="psum">${Lab.paperSummaries[u]}</div>` : ""}</li>`).join("")}</ul></section>`;
    return h;
  };

  let cleanup = null;
  const main = () => document.getElementById("main");

  // Suggested reading orders. Ids that don't exist yet are skipped, so paths can list pages before they're built.
  const PATHS = [
    ["Forecasting from zero", "From a moving average to choosing between methods and measuring them honestly.",
      ["exponential-smoothing", "seasonal-decomposition", "forecast-accuracy", "acf-pacf", "arima", "intermittent-demand", "ensemble-forecasts", "prediction-intervals", "pinball-crps", "new-product", "global-forecasting", "forecast-lab", "forecast-value-added"]],
    ["Inventory and supply chain", "How forecasts become stock levels, and why supply chains amplify small changes.",
      ["prediction-intervals", "reorder-point", "service-level-cost", "lead-time-error", "risk-pooling", "supply-network", "abc-xyz", "censored-demand", "monthly-to-weekly", "demand-sensing", "frozen-zones", "level-vs-chase", "bullwhip-effect", "plant-shutdown"]],
    ["Supply chain money", "Landed cost, margins and how to put a dollar value on supply chain improvements.",
      ["cost-margin", "rollup", "tariffs", "carrying-cost", "forecast-value", "newsvendor", "cost-to-serve", "freight", "moq", "cash-to-cash", "roi"]],
    ["Optimization and network design", "From a two-product LP to routing heuristics and choosing DC locations.",
      ["linear-programming", "tsp", "simulated-annealing", "network-design", "supply-network"]],
    ["Data quality", "Check your data before you trust it: outliers, gaps, shifts, shapes and misleading correlations.",
      ["outliers", "distributions", "missing-data", "ts-anomalies", "change-points", "correlation-traps", "benford", "pca-clustering"]],
    ["Statistics for decisions", "What a sample can and can't tell you.",
      ["central-limit", "confidence-intervals", "hypothesis-test", "anova-chi-square", "ab-power", "bayesian-updating", "rollup", "r-squared", "least-squares"]],
    ["Machine learning foundations", "How models learn, and why they overfit.",
      ["least-squares", "logistic-regression", "bias-variance", "cross-validation", "regularisation", "gradient-descent", "random-forest", "neural-net", "cnn"]],
    ["How LLMs work", "The ideas behind transformers, one piece at a time.",
      ["gradient-descent", "attention"]],
  ];
  function paths() {
    const known = new Set(explainers.map((e) => e.id));
    return `<section class="paths"><h2>Learning paths</h2><div class="path-grid">${PATHS.map(([t, d, ids]) => {
      const steps = ids.filter((id) => known.has(id));
      return `<div class="path"><h3>${t}</h3><p>${d}</p><ol>${steps.map((id) => `<li><a href="#${id}">${Lab.titleOf(id)}</a></li>`).join("")}</ol></div>`;
    }).join("")}</div></section>`;
  }

  function home() {
    document.title = "StatML Lab";
    const shelves = groups.map((g) => {
      const items = explainers.filter((e) => e.group === g);
      if (!items.length) return "";
      return `<section><h2>${g}</h2><div class="cards">${items.map((e) => `
        <a class="card" href="#${e.id}">
          <div class="glyph" aria-hidden="true">${e.glyph}</div>
          <h3>${e.title}</h3>
          <p>${e.blurb}</p>
          <span class="go">Open explainer →</span>
        </a>`).join("")}</div></section>`;
    }).join("");
    main().innerHTML = `
      <div class="wrap">
        <header class="home-hero">
          <h1>Statistics and machine learning you can <em>poke at</em></h1>
          <p>Each page is one idea with a live picture. Drag the points, move the sliders, and watch the numbers respond. Then read the short notes underneath for the math that explains what you just saw.</p>
        </header>
        ${paths()}
        <div class="shelf">${shelves}
          <section><h2>Reference</h2><div class="cards"><a class="card" href="#glossary">
            <div class="glyph" aria-hidden="true"><svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="18" y="6" width="44" height="54" rx="3"/><line x1="26" y1="18" x2="54" y2="18"/><line x1="26" y1="28" x2="50" y2="28" opacity=".5"/><line x1="26" y1="38" x2="54" y2="38" opacity=".5"/><line x1="26" y1="48" x2="44" y2="48" opacity=".5"/><circle cx="70" cy="40" r="9"/><line x1="76" y1="47" x2="86" y2="57"/></svg></div>
            <h3>Glossary</h3><p>${Lab.terms.length} terms in plain language, each linked to the explainer that shows it.</p><span class="go">Browse terms →</span></a><a class="card" href="#which-method">
            <div class="glyph" aria-hidden="true"><svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="24" width="22" height="16" rx="3"/><path d="M28 32 H40 V12 H52 M40 32 V52 H52"/><rect x="52" y="4" width="22" height="16" rx="3"/><rect x="52" y="44" width="22" height="16" rx="3" opacity=".5"/><path d="M74 12 H88" opacity=".5"/></svg></div>
            <h3>Which method when?</h3><p>Flowcharts for choosing a forecasting method, accuracy measure, statistical test, ML model or supply chain tool.</p><span class="go">Open the flowcharts →</span></a></div></section>
        </div>
      </div>`;
  }

  function route() {
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    const id = location.hash.replace(/^#/, "");
    if (id === "glossary") { Lab.glossaryPage(main()); window.scrollTo(0, 0); return; }
    if (id === "which-method") { Lab.choosePage(main()); window.scrollTo(0, 0); return; }
    const ex = explainers.find((e) => e.id === id);
    if (!ex) { home(); window.scrollTo(0, 0); return; }
    document.title = `${ex.title} · StatML Lab`;
    main().innerHTML = "";
    cleanup = ex.mount(main()) || null;
    window.scrollTo(0, 0);
  }

  // ---------- settings: theme and colour palette, remembered per browser
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const PALETTES = [["calm", "Calm", "The original blended tones"], ["contrast", "High contrast", "Strong blue vs red"], ["cvd", "Colour-blind safe", "Okabe–Ito colours"]];
  function applySettings() {
    const th = store.get("lab-theme") || "system", pa = store.get("lab-palette") || "calm", r = document.documentElement;
    if (th === "system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", th);
    if (pa === "calm") r.removeAttribute("data-palette"); else r.setAttribute("data-palette", pa);
    return { th, pa };
  }
  applySettings();
  function settingsUI() {
    const wrap = document.querySelector(".topbar .wrap"), nav = wrap && wrap.querySelector("nav");
    if (!nav || document.getElementById("settingsBtn")) return;
    const btn = document.createElement("button");
    btn.id = "settingsBtn"; btn.className = "settings-btn"; btn.type = "button"; btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "settingsPop");
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="8" r="2.4"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/></svg><span class="lbl">Settings</span>`; btn.setAttribute("aria-label", "Settings");
    nav.appendChild(btn);
    const pop = document.createElement("div");
    pop.id = "settingsPop"; pop.className = "settings-pop"; pop.hidden = true; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Display settings");
    const chips = (k) => ({ calm: ["#0a6c88", "#cf5f22", "#6a4cc0", "#2c8549"], contrast: ["#1f5fd1", "#d62828", "#222b33", "#1a7f37"], cvd: ["#0072b2", "#d55e00", "#cc79a7", "#009e73"] })[k];
    const render = () => {
      const { th, pa } = applySettings();
      pop.innerHTML = `<div><h3>Theme</h3><div class="seg" id="setTheme">${[["system", "System"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${v === th}">${l}</button>`).join("")}</div></div>
        <div><h3>Chart colours</h3><div class="swatches" id="setPal">${PALETTES.map(([v, l, d]) => `<button class="swatch" type="button" data-v="${v}" aria-pressed="${v === pa}"><span>${l}<small>${d}</small></span><span class="chips">${chips(v).map((c) => `<i style="background:${c}"></i>`).join("")}</span></button>`).join("")}</div></div>`;
    };
    render();
    wrap.appendChild(pop);
    btn.addEventListener("click", () => { pop.hidden = !pop.hidden; btn.setAttribute("aria-expanded", String(!pop.hidden)); });
    pop.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]"); if (!b) return;
      store.set(b.closest("#setTheme") ? "lab-theme" : "lab-palette", b.dataset.v); render();
    });
    document.addEventListener("click", (e) => { if (!pop.hidden && e.target.isConnected && !pop.contains(e.target) && !btn.contains(e.target)) { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); } });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.hidden) { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); btn.focus(); } });
  }
  // copy buttons on DIY formulas
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".diy .cp"); if (!b) return;
    const code = b.previousElementSibling, txt = code.textContent;
    const done = () => { b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200); };
    const sel = () => { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Selected"; setTimeout(() => (b.textContent = "Copy"), 1200); };
    try { navigator.clipboard.writeText(txt).then(done, sel); } catch (err) { sel(); }
  });
  window.addEventListener("DOMContentLoaded", settingsUI);

  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", route);
})();
