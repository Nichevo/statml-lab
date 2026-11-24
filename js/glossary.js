// Plain-language glossary. `see` links a term to the explainer where you can watch it happen.
Lab.terms = [
  ["Alpha (α), significance level", "The cutoff you pick in advance for calling a result significant, often 0.05. It is also the false-positive rate you accept when there is truly no effect.", "hypothesis-test"],
  ["Attention", "A way for each word (token) in a sequence to pull in information from other words, weighted by how relevant they are. The core building block of transformers.", "attention"],
  ["Bias (of a model)", "How far a model's average prediction, over many possible training sets, sits from the truth. Too-simple models have high bias.", "bias-variance"],
  ["Causal mask", "A rule in attention that stops a word from looking at words after it. Text-generating models use it so they can't peek at the answer.", "attention"],
  ["Central limit theorem", "Averages of many independent random values tend to follow a bell-shaped normal distribution, whatever the shape of the original data.", "central-limit"],
  ["Coefficient of determination (R²)", "The share of the variation in y that a model accounts for, compared with always predicting the mean. 1 is a perfect fit, 0 is no better than the mean.", "r-squared"],
  ["Convergence", "When an iterative method such as gradient descent stops changing because it has reached a minimum.", "gradient-descent"],
  ["Cross-validation", "Splitting data into parts, training on some and testing on the rest, and rotating. It estimates how well a model will do on new data.", "bias-variance"],
  ["Dot product", "Multiply two vectors element by element and add up the results. Big when the vectors point the same way. Attention uses it to score how well a query matches a key.", "attention"],
  ["Exponential smoothing", "A forecasting method that averages past values with weights that shrink exponentially the further back you go.", "exponential-smoothing"],
  ["False positive (Type I error)", "Concluding there is an effect when there isn't one.", "hypothesis-test"],
  ["Gradient", "The direction and steepness of the fastest increase of a function. Gradient descent steps the opposite way.", "gradient-descent"],
  ["Gradient descent", "An optimization method that repeatedly takes small steps downhill on the loss surface. Nearly every neural network is trained this way.", "gradient-descent"],
  ["Hold-out set (test set)", "Data the model never sees during training, kept back to give an honest measure of performance.", "exponential-smoothing"],
  ["Holt-Winters", "Exponential smoothing with three parts: a level, a trend and a repeating seasonal pattern.", "exponential-smoothing"],
  ["Intercept", "The value of a fitted line when x is 0. Written a or β₀.", "least-squares"],
  ["Key, query, value", "In attention, each word produces three vectors. The query says what it is looking for, the key says what it offers, and the value is the information it passes on.", "attention"],
  ["Learning rate (η)", "The size of each gradient descent step. Too small is slow; too large overshoots and can diverge.", "gradient-descent"],
  ["Least squares (OLS)", "Fitting a line by choosing the parameters that minimize the sum of squared residuals.", "least-squares"],
  ["Loss function", "A number that measures how wrong a model is. Training means making it small.", "gradient-descent"],
  ["MAPE", "Mean absolute percentage error: the average forecast error as a percentage of the actual values.", "exponential-smoothing"],
  ["Momentum", "A gradient descent tweak that keeps a running velocity, so steps in a consistent direction speed up and zig-zags cancel out.", "gradient-descent"],
  ["Null hypothesis", "The default assumption that there is no effect or no difference. A test asks how surprising the data would be if it were true.", "hypothesis-test"],
  ["Overfitting", "When a model learns the noise in its training data and does worse on new data. High variance.", "bias-variance"],
  ["p-value", "If the null hypothesis were true, the probability of seeing a result at least as extreme as the one observed. It is not the probability that the null is true.", "hypothesis-test"],
  ["Permutation test", "A test that builds the null distribution by shuffling group labels many times and recomputing the statistic.", "hypothesis-test"],
  ["Power", "The probability that a test detects an effect that really exists. It grows with sample size and effect size, and falls with noise.", "hypothesis-test"],
  ["Residual", "Actual value minus predicted value. The vertical gap between a point and the fitted line.", "least-squares"],
  ["RMSE", "Root mean squared error: the square root of the average squared error. In the same units as the data.", "exponential-smoothing"],
  ["Sampling distribution", "The distribution of a statistic, such as the mean, across many repeated samples.", "central-limit"],
  ["Seasonality", "A pattern that repeats over a fixed period, such as higher sales every December.", "exponential-smoothing"],
  ["Slope", "How much the fitted line rises for each one-unit increase in x. Written b or β₁.", "least-squares"],
  ["Softmax", "Turns a list of scores into positive weights that add up to 1, with bigger scores getting much bigger weights.", "attention"],
  ["Standard error", "The standard deviation of a sampling distribution. For a mean it is σ/√n.", "central-limit"],
  ["SSE, SST, SSR", "Sum of squared errors (left over after the model), total sum of squares (around the mean), and regression sum of squares (SST − SSE, the part explained).", "r-squared"],
  ["Temperature", "A number that divides scores before softmax. Low temperature makes choices sharper; high makes them more even. Also controls randomness in chatbot output.", "attention"],
  ["Transformer", "A neural network architecture built from stacked attention layers. The basis of modern language models.", "attention"],
  ["Trend", "A long-run upward or downward movement in a time series.", "exponential-smoothing"],
  ["Underfitting", "When a model is too simple to capture the real pattern. High bias.", "bias-variance"],
  ["Variance (of a model)", "How much a model's predictions change when it is trained on a different sample. Flexible models have high variance.", "bias-variance"],
  ["ACF and PACF", "Autocorrelation: how much a series correlates with itself k steps back. Partial autocorrelation removes the effect of the lags in between. Their shapes suggest ARIMA orders.", "arima"],
  ["AIC", "Akaike information criterion: model fit penalized by the number of parameters. Lower is better; used to choose between models.", "arima"],
  ["ARIMA", "AutoRegressive Integrated Moving Average: a time-series model where today depends on past values (AR), past surprises (MA), after differencing (I).", "arima"],
  ["Bagging (bootstrap aggregating)", "Train many models, each on a random resample of the data drawn with replacement, then average or vote.", "random-forest"],
  ["Bias (of a forecast)", "The average of actual minus forecast. Persistently negative means over-forecasting; positive means under-forecasting.", "forecast-accuracy"],
  ["Decision tree", "A model that predicts by asking a sequence of yes/no questions about the inputs, ending in a leaf that gives the answer.", "random-forest"],
  ["Differencing", "Replacing a series by its period-to-period changes. Removes a wandering level or trend.", "arima"],
  ["Forecast Value Added (FVA)", "The change in forecast error caused by a process step, such as a planner override. Positive means the step improved the forecast.", "forecast-value-added"],
  ["Gini impurity", "How mixed the classes are in a group: 0 when all one class, 0.5 for a 50/50 split of two classes. Trees split to reduce it.", "random-forest"],
  ["MAE", "Mean absolute error: the average size of the errors, ignoring sign. In the data's units.", "forecast-accuracy"],
  ["MASE", "Mean absolute scaled error: MAE divided by the MAE of the naive forecast. Below 1 beats naive. Scale-free and safe with zeros.", "forecast-accuracy"],
  ["Moving average forecast", "Forecast the next value as the plain average of the last k values.", "exponential-smoothing"],
  ["Naive forecast", "The simplest benchmark: next period equals the last actual. Seasonal naive uses the same period last year.", "forecast-value-added"],
  ["Out-of-bag (OOB) error", "In a random forest, scoring each point only with the trees that did not train on it. A free estimate of test error.", "random-forest"],
  ["Random forest", "Many decision trees, each trained on a bootstrap sample with random feature choices, voting together.", "random-forest"],
  ["sMAPE", "Symmetric MAPE: divides each error by the average of actual and forecast, which caps the damage from near-zero actuals.", "forecast-accuracy"],
  ["Stationary", "A series whose mean, spread and correlations do not drift over time. ARMA models assume it; differencing can create it.", "arima"],
  ["WAPE", "Weighted absolute percentage error: total absolute error divided by total actuals. Weights big periods more and avoids MAPE's blow-ups.", "forecast-accuracy"],
  ["White noise", "A series of independent random values with no pattern. A good model's residuals should look like it.", "arima"],
  ["Seasonal decomposition", "Splitting a series into trend, seasonal and remainder parts, either added together or multiplied.", "seasonal-decomposition"],
  ["Seasonally adjusted", "A series with its seasonal part removed, so underlying movements are easier to see.", "seasonal-decomposition"],
  ["STL", "Seasonal-Trend decomposition using Loess: a flexible, outlier-resistant way to split a series into trend, season and remainder.", "seasonal-decomposition"],
  ["1 − xMAPE", "An accuracy score: the average of 1 − |actual − forecast| / max(actual, forecast). Runs from 0% to 100%, higher is better, symmetric for over- and under-forecasts, and safe with zeros.", "forecast-accuracy"],
  ["Croston's method", "A forecast for intermittent demand that smooths order size and the gap between orders separately, then divides one by the other.", "intermittent-demand"],
  ["Intermittent demand", "Demand that is zero in many periods, with occasional orders of varying size. Typical of spare parts and slow sellers.", "intermittent-demand"],
];

Lab.glossaryPage = (main) => {
  document.title = "Glossary · StatML Lab";
  main.innerHTML = `
    <div class="wrap">
      <header class="ex-head">
        <div class="eyebrow">Reference</div>
        <h1>Glossary</h1>
        <p>Plain-language definitions. Each term links to the explainer where you can see it in action.</p>
      </header>
      <input id="q" type="search" placeholder="Search terms, e.g. variance" aria-label="Search terms"
        style="width:100%;max-width:520px;font:inherit;padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink)">
      <dl id="gl" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;padding-block:20px 64px;margin:0"></dl>
    </div>`;
  const render = (q) => {
    q = q.trim().toLowerCase();
    const list = Lab.terms.slice().sort((a, b) => a[0].localeCompare(b[0])).filter(([t, d]) => !q || t.toLowerCase().includes(q) || d.toLowerCase().includes(q));
    main.querySelector("#gl").innerHTML = list.length
      ? list.map(([t, d, see]) => `<div style="background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 16px">
          <dt style="font:700 1rem/1.3 var(--font-display);margin-bottom:6px">${t}</dt>
          <dd style="margin:0;color:var(--muted);font-size:.93rem">${d}</dd>
          ${see ? `<dd style="margin:8px 0 0;font:500 .8rem/1 var(--font-mono)"><a href="#${see}">See it: ${Lab.titleOf(see)} →</a></dd>` : ""}
        </div>`).join("")
      : `<p class="hint">No terms match "${q.replace(/</g, "&lt;")}".</p>`;
  };
  main.querySelector("#q").addEventListener("input", (e) => render(e.target.value));
  render("");
};
