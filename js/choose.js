// "Which method when?" decision flowcharts. Each tree is questions (Q) with answers leading to more questions or to a technique (L).
(function () {
  const Q = (q, kids) => ({ q, kids: kids.map(([opt, node]) => ({ opt, node })) });
  const L = (t, id, why) => ({ t, id, why });

  const TREES = [
    {
      key: "forecast", name: "Forecasting method",
      intro: "Start from what you know about the item's sales history. Whatever you pick, back-test it against a naive forecast before trusting it.",
      tree: Q("How much sales history does the item have?", [
        ["None yet (not launched)", Q("Do you have similar past launches?", [
          ["Yes", L("Forecast by analogy", "new-product", "Average the sales curves of similar launches and scale them to the plan.")],
          ["No", L("Bass model + judgment", "new-product", "Pick p, q and market size from typical values and expert input; revise once sales arrive.")],
        ])],
        ["A few weeks or months", Q("Are there many related items with longer history?", [
          ["Yes, dozens or more", L("Global ML model", "global-forecasting", "One model trained on all items borrows seasonality and promo effects for the new one.")],
          ["No", L("Analogues scaled to sales so far", "new-product", "Re-scale the analogue curve to actual early sales; fit a Bass curve once there's enough data.")],
        ])],
        ["A year or more", Q("Are most periods zero?", [
          ["Yes, sales are lumpy", L("Croston / SBA", "intermittent-demand", "Forecast the size of a sale and the gap between sales separately.")],
          ["No", Q("Do known drivers move sales (promotions, price, events)?", [
            ["Yes", Q("Many related items with the same drivers?", [
              ["Yes", Q("Which kind of global model?", [
                ["Trees with hand-made lag and calendar features (start here)", L("Global ML model", "global-forecasting", "Gradient-boosted trees on scaled sales with promo, price and calendar features.")],
                ["A neural network that reads the history itself", L("RNN / LSTM", "rnn-lstm", "Carries a memory from week to week; shines when trained across thousands of series.")],
              ])],
              ["No, just this item", Q("Do the leftovers carry over from day to day?", [
                ["No, or not sure yet", L("Regression with driver variables", "promo-regression", "Baseline plus a promo uplift term, estimated from this item's own history.")],
                ["Yes: weather or other drivers, with runs of high and low days", L("Dynamic regression", "dynamic-regression", "Regression on the drivers with AR errors; honest standard errors and better short-term forecasts.")],
              ])],
            ])],
            ["No", Q("What pattern do you see?", [
              ["A repeating season", L("Holt-Winters / decomposition", "exponential-smoothing", "Smoothing with level, trend and seasonal parts; decomposition shows the parts.")],
              ["A trend, no season", Q("Will the trend keep going at the same pace?", [
                ["Yes, it looks steady", L("Holt's linear method", "exponential-smoothing", "Smoothing with a level and a trend.")],
                ["Not sure, it may fade", L("Theta method", "theta", "Simple smoothing plus half the long-run trend: a strong, cheap benchmark.")],
              ])],
              ["Just noise around a level", L("Moving average / simple smoothing", "exponential-smoothing", "Average recent periods; simple smoothing weights recent ones more.")],
              ["Each period depends on the last few", L("ARIMA (read the ACF/PACF first)", "arima", "Models autocorrelation directly; the ACF and PACF charts suggest the orders.")],
            ])],
          ])],
        ])],
      ]),
      after: [["Read the series with ACF/PACF", "acf-pacf"], ["Combine several methods", "ensemble-forecasts"], ["Back-test on rolling origins", "backtesting"], ["Add prediction intervals", "prediction-intervals"], ["Calibrate the intervals so they keep their promise", "conformal-prediction"], ["Track a drifting level with a Kalman filter", "kalman-filter"], ["Retrain when the world changes", "model-drift"], ["Check value added over naive", "forecast-value-added"], ["Try methods side by side", "forecast-lab"]],
    },
    {
      key: "accuracy", name: "Forecast accuracy measure",
      intro: "Different measures answer different questions. Most teams track one size-of-error measure plus bias.",
      tree: Q("What do you want to know?", [
        ["How big are the errors?", Q("Comparing across items of different sizes?", [
          ["No, one item or one scale", Q("Are big misses much worse than small ones?", [
            ["Yes", L("RMSE", "forecast-accuracy", "Squares errors first, so big misses dominate.")],
            ["No, every unit counts the same", L("MAE", "forecast-accuracy", "Average absolute error in units. Easy to explain.")],
          ])],
          ["Yes, many items", Q("Any zero or tiny actuals?", [
            ["Yes", L("WAPE or MASE", "forecast-accuracy", "WAPE = total |error| ÷ total actuals; MASE compares with a naive forecast. Neither blows up at zero.")],
            ["No", L("MAPE (or WAPE)", "forecast-accuracy", "Familiar percentage, but it punishes over-forecasts less than under-forecasts and favours small items.")],
          ])],
        ])],
        ["Are we always too high or too low?", L("Bias and tracking signal", "forecast-accuracy", "Average signed error; a running tracking signal flags drift.")],
        ["Is our forecasting process adding value?", L("Forecast value added (FVA)", "forecast-value-added", "Compare each step (statistical, overrides) with a naive forecast.")],
        ["Is better accuracy worth the money?", L("Value of forecast accuracy", "forecast-value", "Turns error into safety stock, lost sales and cost.")],
        ["How good is a range or distribution?", Q("What does the forecast give?", [
          ["Intervals (e.g. 80%)", L("Coverage and width", "prediction-intervals", "Share of actuals inside the interval, and how narrow it is.")],
          ["One quantile (e.g. P90)", L("Pinball loss", "pinball-crps", "Weights misses on the costly side by the quantile level.")],
          ["A full distribution", L("CRPS", "pinball-crps", "Scores the whole distribution in demand units.")],
        ])],
      ]),
      after: [["Measure on a back-test, not one week", "backtesting"]],
    },
    {
      key: "stats", name: "Statistical analysis",
      intro: "Start from the question you're trying to answer, not from the test.",
      tree: Q("What's your question?", [
        ["Is a difference real or just noise?", Q("What are you comparing?", [
          ["Two group averages", L("t-test", "hypothesis-test", "Is the gap between two means bigger than sampling noise would explain?")],
          ["Two groups, but skewed or with outliers", L("Mann–Whitney or permutation test", "nonparametric-tests", "Compare ranks, or reshuffle the labels; no normal shape needed.")],
          ["Many products, stores or metrics at once", L("Multiple-testing correction", "multiple-testing", "Bonferroni or Holm to avoid any false alarm; Benjamini–Hochberg to limit the share of false ones.")],
          ["Three or more group averages", L("ANOVA", "anova-chi-square", "One test across all groups before comparing pairs.")],
          ["Counts or shares across categories", L("Chi-square test", "anova-chi-square", "Do the observed counts differ from what independence predicts?")],
          ["Before vs after a change in a series", L("Change-point detection", "change-points", "Find when the level of a series shifted.")],
          ["The effect of a change, with a comparison group", L("Difference-in-differences", "diff-in-diff", "Compare how much the changed group moved with how much an untouched group moved.")],
        ])],
        ["Is my process still running normally?", L("Control charts (SPC)", "spc-control-charts", "Plot the measure with 3-sigma limits from a stable period; investigate points outside or unusual runs.")],
        ["How big must my trial be?", L("A/B test power and sample size", "ab-power", "Stores or weeks needed to detect the lift you care about.")],
        ["How sure is my estimate?", Q("What are you estimating?", [
          ["A mean, with a decent sample", L("t confidence interval", "confidence-intervals", "Mean ± t × standard error.")],
          ["A median, P90 or anything odd", L("Bootstrap interval", "confidence-intervals", "Resample your own data many times; no formula needed.")],
          ["A rate, with little data and a sensible prior", L("Bayesian updating", "bayesian-updating", "Blend a prior from similar cases with the new data; get a credible interval.")],
          ["Why do averages look normal?", L("Central limit theorem", "central-limit", "Averages of many values are close to normal whatever the raw shape.")],
        ])],
        ["How are two things related?", Q("What do you want from it?", [
          ["Predict a number", L("Linear regression", "least-squares", "Fit the line that minimises squared errors; check R² and residuals.")],
          ["With categories, or effects that depend on each other", L("Dummies and interactions", "dummies-interactions", "0/1 columns for quarters or promotions, and product terms like promo × holiday.")],
          ["Predict yes / no", L("Logistic regression", "logistic-regression", "Probability of the outcome from the drivers.")],
          ["Just how strongly they move together", L("Correlation (with care)", "correlation-traps", "Watch for outliers, curves, hidden groups and confounders.")],
          ["How much of the variation is explained", L("R²", "r-squared", "Share of variance the model accounts for.")],
        ])],
        ["Which data points look wrong?", Q("What kind of data?", [
          ["One set of numbers", L("Outlier rules (IQR, z, MAD)", "outliers", "Flag points far from the bulk; robust rules resist the outliers themselves.")],
          ["A time series", L("Time-series anomalies", "ts-anomalies", "Compare each point with what its recent pattern predicts.")],
          ["Rows with several columns (invoices, orders)", L("Isolation forest", "isolation-forest", "Random cuts isolate odd rows quickly; no labels needed.")],
          ["Possibly made-up figures", L("Benford's law", "benford", "Leading digits of many real-world amounts follow a known pattern.")],
          ["Gaps and blanks", L("Missing-data handling", "missing-data", "Why values are missing decides how to fill them.")],
        ])],
        ["How long until something fails or ends?", L("Survival analysis", "survival-analysis", "Kaplan–Meier curves and Weibull fits that use items still running, not just the failures.")],
        ["What shape is my data?", L("Distributions", "distributions", "Normal, Poisson, log-normal and friends, and when each appears.")],
        ["Find groups or simplify many variables", L("PCA and clustering", "pca-clustering", "Reduce many columns to a few directions; group similar rows.")],
      ]),
      after: [["Check a regression for curves, outliers and missing drivers", "regression-pitfalls"], ["Check the result on fresh data", "cross-validation"]],
    },
    {
      key: "ml", name: "Machine-learning model",
      intro: "The kind of data narrows things quickly. For tables, start simple and only add complexity if cross-validation says it helps.",
      tree: Q("What does your data look like?", [
        ["Images", L("Convolutional neural network", "cnn", "Small learned filters scan the image for patterns.")],
        ["Text or long sequences", Q("What do you want to do?", [
          ["Understand how the model works inside", L("Transformer", "transformer", "Embeddings, attention and feed-forward layers, stacked; each position looks back at what matters.")],
          ["Use a chatbot on your own documents", L("Sampling, embeddings and RAG", "llm-sampling-rag", "Retrieve the right passages by meaning, paste them into the prompt, set the temperature.")],
          ["Sort short messages into categories", L("Naive Bayes", "naive-bayes", "Word counts and Bayes' rule: a fast, strong baseline for text.")],
        ])],
        ["Many related time series", L("Global ML forecasting", "global-forecasting", "One tree model across all series with lag and calendar features.")],
        ["Shopping baskets or transactions", L("Market basket analysis", "market-basket", "Support, confidence and lift for items bought together, found with Apriori.")],
        ["Decisions repeated over time, learned from results", L("Reinforcement learning", "rl-ordering", "An agent learns which action works best in each state by trial and error.")],
        ["A table of rows and columns", Q("Do you have a target to predict?", [
          ["No, I want to find structure", L("PCA and clustering", "pca-clustering", "Unsupervised: groups and main directions in the data.")],
          ["Yes, a number", Q("What matters more?", [
            ["Explaining the effect of each driver", L("Linear regression", "least-squares", "One coefficient per driver, easy to read.")],
            ["A simple rule people can follow", L("Decision tree", "decision-tree", "A few if-then splits; easy to explain, less accurate than a forest.")],
            ["Many drivers, not much data", L("Ridge or lasso regression", "regularisation", "Penalise big coefficients; lasso also drops useless drivers.")],
            ["Accuracy, with curves and interactions", Q("How much tuning can you do?", [
              ["Little: want robust defaults", L("Random forest", "random-forest", "Many trees capture non-linear effects without hand-made features.")],
              ["Some: want the best accuracy", L("Gradient-boosted trees", "gradient-boosting", "Trees added one at a time to fix the errors so far; tune learning rate and tree count.")],
            ])],
          ])],
          ["Yes, a category (yes/no, A/B/C)", Q("What matters more?", [
            ["Explaining and probabilities", L("Logistic regression", "logistic-regression", "Readable coefficients and calibrated probabilities.")],
            ["A simple rule people can follow", L("Decision tree", "decision-tree", "A few if-then splits; easy to explain, less accurate than a forest.")],
            ["The yes cases are rare (failures, fraud)", L("Rare events and calibration", "imbalanced-calibration", "Pick the threshold on costs, and check the probabilities mean what they say.")],
            ["Accuracy, with curves and interactions", Q("How much tuning can you do?", [
              ["Little: want robust defaults", L("Random forest", "random-forest", "Usually a strong choice for tabular data with almost no tuning.")],
              ["Some: want the best accuracy", L("Gradient-boosted trees", "gradient-boosting", "Often the most accurate for tabular data once tuned.")],
            ])],
            ["Few columns, similar cases behave alike", L("k-nearest neighbours", "knn", "Vote among the most similar past cases; scale the columns first.")],
            ["A clean boundary, small or medium data", L("Support vector machine", "svm", "Widest-margin boundary; kernels bend it.")],
            ["Learning raw patterns from scratch", L("Neural network", "neural-net", "Hidden layers build their own features; needs more data.")],
            ["Not sure: compare several", L("The model zoo", "model-zoo", "Eight classifiers on the same data, scored on a test set.")],
          ])],
        ])],
      ]),
      after: [["Build features without leaking the answer", "feature-engineering"], ["Put a guaranteed range around any prediction", "conformal-prediction"], ["Tune settings and read what the model learned", "hyperparameter-tuning"], ["Explain a model's predictions with SHAP", "shap"], ["Watch for drift once it's live", "model-drift"], ["How attention works in detail", "attention"], ["Pick complexity with cross-validation", "cross-validation"], ["Understand over- and under-fitting", "bias-variance"], ["See how models are trained", "gradient-descent"]],
    },
    {
      key: "supply", name: "Inventory and supply decision",
      intro: "Most supply chain questions come down to how much, where, and when.",
      tree: Q("What decision are you making?", [
        ["How much stock to hold", Q("What kind of buying decision?", [
          ["One order for a season or perishable", L("Newsvendor", "newsvendor", "Order up to the quantile set by the cost of too few vs too many.")],
          ["Ongoing replenishment, steady demand", L("Reorder point + safety stock", "reorder-point", "Reorder when stock covers lead-time demand plus a buffer.")],
          ["Which reorder rule: fixed quantity, order-up-to or periodic review", L("Inventory policies", "inventory-policies", "Compare (s, Q), (s, S), (R, S) and (R, s, S) on the same demand.")],
          ["Will my policy really hit its service level?", L("Monte Carlo inventory simulation", "inventory-simulation", "Simulate years of days and read the fill rate and stock-outs directly.")],
          ["Ongoing, but demand is lumpy", L("Croston-based stock levels", "intermittent-demand", "Forecast sizes and gaps; set stock from that.")],
          ["Which SKUs deserve the most attention", L("ABC-XYZ segmentation", "abc-xyz", "Split by value and by predictability; set policies per cell.")],
          ["What service level to aim for", L("Service level vs cost", "service-level-cost", "Each extra point of service costs more stock than the last.")],
        ])],
        ["How many locations, and where", Q("What's the main concern?", [
          ["Safety stock across sites", L("Risk pooling", "risk-pooling", "Fewer stock points need less total safety stock.")],
          ["Cost of the whole network", L("Network design", "network-design", "Trade facility, transport and inventory cost.")],
          ["Lead times at different points", L("Supply network trade-offs", "supply-network", "Where to hold stock when lead times change.")],
        ])],
        ["How much to order from a supplier", Q("What's driving it?", [
          ["Minimum order quantities", L("MOQ trade-off", "moq", "Price breaks vs extra stock you'll carry.")],
          ["Cost of holding stock", L("Carrying cost", "carrying-cost", "Capital, storage, obsolescence and shrink.")],
          ["Freight: full loads vs smaller shipments", L("Freight trade-offs", "freight", "Bigger loads cost less per unit but add stock.")],
        ])],
        ["What to make or buy, and when", Q("What's the question?", [
          ["Components for a production schedule", L("MRP and bills of materials", "mrp-bom", "Explode the schedule through the BOM and lead times to get planned orders.")],
          ["How many weeks each order should cover", L("Lot sizing (Wagner–Whitin)", "lot-sizing", "The optimal plan by dynamic programming, against Silver–Meal and other quick rules.")],
          ["Not enough stock for every customer", L("Shortage allocation", "shortage-allocation", "First come, pro rata, priority tiers and what each does to fairness and order inflation.")],
          ["A heuristic rule that adapts by trial and error", L("Reinforcement learning for ordering", "rl-ordering", "A Q-learning agent learns a reorder rule and is compared with the exact optimum.")],
        ])],
        ["How to plan capacity", Q("What's the situation?", [
          ["Queues at docks, desks or machines", L("Queues and Little's law", "queues-littles-law", "Waits explode as utilisation nears 100%; L = λW links stock, flow and time.")],
          ["Seasonal demand", L("Level vs chase", "level-vs-chase", "Build ahead at a steady rate, or follow demand.")],
          ["A planned stop", L("Plant shutdown build-ahead", "plant-shutdown", "How much to build before the plant stops.")],
          ["Plans keep changing near-term", L("Frozen zones", "frozen-zones", "Lock the next few weeks to stop churn.")],
        ])],
        ["Why do the numbers look strange?", Q("What's happening?", [
          ["Orders swing more than sales", L("Bullwhip effect", "bullwhip-effect", "Batching and over-reaction amplify swings up the chain.")],
          ["Stock-outs hide real demand", L("Censored demand", "censored-demand", "Sales stop at zero stock; true demand was higher.")],
        ])],
        ["How to route or schedule", Q("What kind of problem?", [
          ["Visit every stop once, shortest route", L("Travelling salesman", "tsp", "Heuristics find good routes fast.")],
          ["Best mix under limits", Q("Can the answers be fractions?", [
            ["Yes (tonnes, hours, litres)", L("Linear programming", "linear-programming", "Maximise profit or minimise cost subject to constraints.")],
            ["No: whole trucks, shifts, or open / don't open", L("Integer programming", "integer-programming", "LP plus whole-number rules, solved by branch and bound.")],
          ])],
          ["Messy problem, many local optima", Q("What does a solution look like?", [
            ["A sequence or one plan to tweak step by step", L("Simulated annealing", "simulated-annealing", "Random search that sometimes accepts worse moves to escape traps.")],
            ["A string of many yes/no choices, no neat formula", L("Genetic algorithm", "genetic-algorithm", "Evolve a population of plans by selection, crossover and mutation.")],
          ])],
        ])],
      ]),
      after: [["What forecast error costs you", "lead-time-error"], ["Cash tied up in stock", "cash-to-cash"]],
    },
    {
      key: "risk", name: "Risk measure",
      intro: "Start from the question you're being asked. Probabilities help when you can estimate them; when you can't, measure impact and test scenarios.",
      tree: Q("What do you need to know?", [
        ["How bad a bad month or year could be", Q("What do you have to work with?", [
          ["A history of results", L("VaR and CVaR", "var-cvar", "Read the loss beaten 1 time in 20, and the average beyond it, off your sorted history.")],
          ["Ranges for each driver", L("Monte Carlo risk simulation", "monte-carlo-risk", "Simulate thousands of combinations of the drivers and read off P10, P90 and the chance of a loss.")],
        ])],
        ["Which suppliers or sites could hurt us most", L("Time to recover / time to survive", "supplier-disruption", "Compare recovery time with how long you can last without each site; add concentration (HHI).")],
        ["How to rank a long list of risks quickly", Q("What kind of list?", [
          ["Business risks in a register", L("Risk matrix", "risk-matrix", "Likelihood × impact bands; quick, but check the top risks in money.")],
          ["Ways a process or product can fail", L("FMEA", "risk-matrix", "Severity, occurrence and detection; put severity first.")],
        ])],
        ["What one specific scenario would do to us", L("Stress test", "stress-test", "Play a named shock through a model of the operation; reverse it to find the breaking point.")],
        ["Whether more data, a test or a forecast is worth paying for", L("Value of information", "value-of-information", "EVPI caps what any information is worth; EVSI prices a real, imperfect test.")],
      ]),
      after: [["Simulate the drivers once you have ranges", "monte-carlo-risk"], ["Read the tail with VaR and CVaR", "var-cvar"], ["Update beliefs with new evidence", "bayesian-updating"]],
    },
  ];

  // ---------- layout: left-to-right tree, leaves stacked, each box sized to its wrapped text
  const BW = 214, GAP = 46, PADX = 10, LH = 15, OPTH = 14;
  function wrap(text, max) {
    const out = []; let line = "";
    for (const w of text.split(" ")) { if ((line + " " + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + " " + w).trim(); }
    if (line) out.push(line);
    return out;
  }
  function layout(root) {
    const nodes = []; let y = 0, maxD = 0;
    (function walk(n, d, opt, parent, path) {
      const main = wrap(n.q || n.t, 29), optL = opt ? wrap(opt, 33) : [];
      const h = 12 + optL.length * OPTH + main.length * LH + (n.q ? 0 : 14) + 8;
      const me = { n, d, opt, optL, main, h, parent, path, kids: [] };
      nodes.push(me); maxD = Math.max(maxD, d);
      if (n.kids) { n.kids.forEach((k, i) => me.kids.push(walk(k.node, d + 1, k.opt, me, path.concat(i)))); me.y = (me.kids[0].y + me.kids[me.kids.length - 1].y + me.kids[me.kids.length - 1].h) / 2 - h / 2; }
      else { me.y = y; y += h + 12; }
      // a question taller than its children block: push later leaves down
      if (n.kids) { const bottom = me.y + h; if (bottom + 12 > y) y = bottom + 12; if (me.y < 0) me.y = 0; }
      me.x = d * (BW + GAP);
      return me;
    })(root, 0, null, null, []);
    return { nodes, W: (maxD + 1) * (BW + GAP) - GAP + 4, H: Math.max(...nodes.map((m) => m.y + m.h)) + 4 };
  }
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const same = (a, b) => a.length <= b.length && a.every((v, i) => v === b[i]);

  function svg(T, sel) {
    const { nodes, W, H } = layout(T.tree);
    let edges = "", boxes = "";
    for (const m of nodes) {
      const on = same(m.path, sel), leaf = !m.n.kids, cls = `fc-node${leaf ? " fc-leaf" : ""}${on ? " fc-on" : ""}${leaf && !m.n.id ? " fc-soon" : ""}`;
      if (m.parent) {
        const x1 = m.parent.x + BW, y1 = m.parent.y + m.parent.h / 2, x2 = m.x, y2 = m.y + m.h / 2, mx = x1 + GAP / 2;
        edges += `<path class="fc-edge${on ? " fc-on" : ""}" d="M${x1} ${y1} H${mx} V${y2} H${x2}"/>`;
      }
      let ty = 12, t = "";
      m.optL.forEach((l) => { ty += OPTH - 2; t += `<text class="fc-opt" x="${m.x + PADX}" y="${m.y + ty}">${esc(l)}</text>`; ty += 2; });
      if (m.optL.length) ty += 3;
      m.main.forEach((l) => { ty += LH; t += `<text class="${leaf ? "fc-tech" : "fc-q"}" x="${m.x + PADX}" y="${m.y + ty - 3}">${esc(l)}</text>`; });
      if (leaf) t += `<text class="fc-go" x="${m.x + PADX}" y="${m.y + ty + 13}">${m.n.id ? "Open the explainer →" : "Not on the site yet"}</text>`;
      const rect = `<rect class="fc-box" x="${m.x}" y="${m.y}" width="${BW}" height="${m.h}" rx="8"/>`;
      const label = leaf ? `${m.opt ? m.opt + ": " : ""}${m.n.t}` : m.n.q;
      boxes += leaf && m.n.id
        ? `<a href="#${m.n.id}" class="${cls}" aria-label="${esc(label)}">${rect}${t}</a>`
        : `<g class="${cls}" data-path="${m.path.join(".")}" role="button" tabindex="0" aria-label="${esc(label)}">${rect}${t}</g>`;
    }
    return `<svg class="fc-svg" viewBox="0 0 ${W} ${H}" style="width:100%;min-width:${Math.round(W * 0.78)}px;max-width:${W}px;height:auto" role="group" aria-label="${esc(T.name)} flowchart">${edges}${boxes}</svg>`;
  }

  Lab.chooseTrees = TREES;
  Lab.choosePage = function (main) {
    document.title = "Which method when? · StatML Lab";
    let cur = 0, sel = [];
    try { const k = localStorage.getItem("statml-choose"); const i = TREES.findIndex((t) => t.key === k); if (i >= 0) cur = i; } catch (e) {}
    main.innerHTML = `
      <div class="wrap">
        <header class="ex-head"><div class="eyebrow">Reference</div><h1>Which method when?</h1>
          <p>Flowcharts for picking a technique. Answer the questions one at a time, or read the whole chart below. Every end point links to the page that shows the technique working.</p></header>
        <div class="seg fc-tabs" id="fcTabs" role="tablist">${TREES.map((t, i) => `<button type="button" role="tab" data-i="${i}">${t.name}</button>`).join("")}</div>
        <section class="fc-walk" id="fcWalk" aria-live="polite"></section>
        <section class="fc-chart">
          <h2>The whole chart</h2><p class="hint" id="fcHint"></p>
          <div class="fc-scroll" id="fcChart"></div>
          <div id="fcAfter"></div>
        </section>
      </div>`;
    const $ = (s) => main.querySelector(s);
    const nodeAt = (p) => p.reduce((n, i) => n.kids[i].node, TREES[cur].tree);
    function walker() {
      const T = TREES[cur], n = nodeAt(sel);
      let crumbs = [], m = T.tree;
      sel.forEach((i, k) => { crumbs.push(`<button type="button" class="fc-crumb" data-back="${k}">${esc(m.q)} <b>${esc(m.kids[i].opt)}</b></button>`); m = m.kids[i].node; });
      const body = n.kids
        ? `<h3>${esc(n.q)}</h3><div class="fc-opts">${n.kids.map((k, i) => `<button type="button" class="btn fc-ans" data-i="${i}">${esc(k.opt)}</button>`).join("")}</div>`
        : `<div class="fc-result"><span class="fc-label">Suggested technique</span><h3>${esc(n.t)}</h3><p>${esc(n.why)}</p>${n.id ? `<a class="btn primary" href="#${n.id}">Open the explainer →</a>` : `<p class="hint">Not on the site yet; it's on the list to build.</p>`}</div>`;
      $("#fcWalk").innerHTML = `<p class="hint" style="margin:0 0 10px">${esc(T.intro)}</p>${crumbs.length ? `<div class="fc-crumbs">${crumbs.join("")}</div>` : ""}${body}${sel.length ? `<div class="btns" style="margin-top:12px"><button type="button" class="btn" id="fcBack">Back one step</button><button type="button" class="btn" id="fcRestart">Start again</button></div>` : ""}`;
      $("#fcWalk").querySelectorAll(".fc-ans").forEach((b) => b.addEventListener("click", () => { sel = sel.concat(+b.dataset.i); draw(); }));
      $("#fcWalk").querySelectorAll(".fc-crumb").forEach((b) => b.addEventListener("click", () => { sel = sel.slice(0, +b.dataset.back); draw(); }));
      if ($("#fcBack")) { $("#fcBack").addEventListener("click", () => { sel = sel.slice(0, -1); draw(); }); $("#fcRestart").addEventListener("click", () => { sel = []; draw(); }); }
    }
    function chart() {
      const T = TREES[cur];
      $("#fcChart").innerHTML = svg(T, sel);
      $("#fcHint").textContent = "Highlighted: your answers so far. Click a question box to jump the walk-through to it. Scroll sideways on a small screen.";
      $("#fcChart").querySelectorAll("g[data-path]").forEach((g) => {
        const go = () => { sel = g.dataset.path ? g.dataset.path.split(".").map(Number) : []; draw(); $("#fcWalk").scrollIntoView({ behavior: "smooth", block: "nearest" }); };
        g.addEventListener("click", go); g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
      });
      $("#fcAfter").innerHTML = T.after && T.after.length ? `<div class="fc-after"><span class="fc-label">Whichever you choose</span><ul>${T.after.map(([t, id]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join("")}</ul></div>` : "";
    }
    function draw() {
      $("#fcTabs").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === cur)));
      walker(); chart();
    }
    $("#fcTabs").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { cur = +b.dataset.i; sel = []; try { localStorage.setItem("statml-choose", TREES[cur].key); } catch (e) {} draw(); }));
    draw();
  };
})();
