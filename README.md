# StatML Lab

Interactive visual explainers for statistics, machine learning, forecasting and supply chain. Each page lets you move the numbers yourself and watch the result change, then shows how to do the same calculation in Excel.

**Live site:** https://nichevo.github.io/statml-lab/

It is plain HTML, CSS and JavaScript. There is no build step, no framework and no server code.

## What every page has

- **A live figure** with sliders, buttons or editable tables. Every control moves the headline numbers.
- **Worked numbers** showing the formula with today's values plugged in.
- **Do it yourself**: step-by-step Excel formulas to rebuild the calculation in a spreadsheet.
- **Check yourself**: a short quiz with the answers hidden until you open them.
- **Go deeper**: textbooks, free course notes and the original research papers (DOI or arXiv links), each with a one-line summary of what the paper found.
- **Glossary links**: plain-language definitions of 175+ terms, cross-linked to the pages that use them.

## Contents (69 explainers)

| Area | Pages |
|---|---|
| Forecasting | Forecast lab, moving averages and exponential smoothing, seasonal decomposition, accuracy measures (MAE, MAPE, RMSE, MASE, bias), autocorrelation (ACF/PACF), ARIMA, intermittent demand and Croston, forecast value added, prediction intervals, ensembles, hierarchical reconciliation, rolling-origin backtesting, regression with promotions, pinball loss and CRPS, new-product forecasting (Bass model and analogues), global ML forecasting across many SKUs |
| Supply chain | Bullwhip effect, reorder point / safety stock / EOQ, lead-time error, monthly-to-weekly splits, frozen zones, demand sensing, risk pooling, multi-echelon safety stock, ABC/XYZ, service level vs cost, censored demand, level vs chase S&OP, landed cost and margin, tariffs, value of a better forecast, carrying cost, newsvendor, cost to serve, freight, cash-to-cash, MOQs and price breaks, ROI/NPV/payback, plant shutdowns, delivery routing, network design |
| Data quality | Outliers (z-score, IQR, MAD), time-series anomalies, change points (CUSUM), missing data, distributions and Q-Q plots, correlation traps, Benford's law, k-means clustering and PCA |
| Statistics | R², least squares, central limit theorem, confidence intervals and the bootstrap, hypothesis tests and p-values, ANOVA and chi-square, A/B tests and power, Bayesian updating, ridge and lasso regularisation, rolling up numbers (bottom-up vs averages) |
| Machine learning | Logistic regression and the confusion matrix, overfitting and cross-validation, bias–variance, gradient descent, attention in transformers, decision trees and random forests, neural networks from scratch (perceptron to hidden layers), convolutional neural networks (draw a digit and watch a real CNN read it) |
| Optimization | Linear programming, simulated annealing |

A **Which method when?** page has flowcharts for choosing a forecasting method, accuracy measure, statistical test, ML model or supply chain tool, each ending at the relevant explainer.

The home page also groups pages into **learning paths**: Forecasting from zero, Inventory and supply chain, Supply chain money, Optimization and network design, Data quality, and Statistics for decisions.

## Run it locally

Open `index.html` in a browser. Or serve the folder:

```
python3 -m http.server
```

Then visit http://localhost:8000.

## Publish on GitHub Pages

In the repository's **Settings > Pages**, choose "Deploy from a branch", branch `main`, folder `/ (root)`. The site appears at `https://<user>.github.io/<repo>/` a minute or two later.

## Project layout

```
index.html              page shell; loads every script in order
css/style.css           all styles, light and dark themes
js/plot.js              Lab.Plot canvas helper (axes, lines, dots)
js/app.js               routing, home page, groups, learning paths, quiz / DIY / go-deeper rendering
js/papers.js            one-line summaries shown under research-paper links
js/glossary.js          glossary terms and their cross-links
js/choose.js            "Which method when?" decision flowcharts
js/cnn-data.js          weights of the small digit-reading CNN, plus sample MNIST digits
js/gbm.js               small gradient-boosting helper (used by global ML forecasting)
js/explainers/*.js      one file per explainer
```

## Add an explainer

1. Copy a file in `js/explainers/` (for example `r-squared.js`) and change `id`, `group`, `title`, `blurb`, `lede` and `glyph`. The `group` must be one of the groups listed at the top of `js/app.js`.
2. Fill in the shared sections:
   - `quiz: [[question, answer], ...]`
   - `diy: { intro, steps: [[text, excelFormula], ...] }`
   - `deeper: [[title, url, note], ...]`
3. In `mount(root)`, build the page with `Lab.page(this, { figure, panel, notes })`, draw with `Lab.Plot`, and return the cleanup function from `Lab.watch(...)`.
4. Add a `<script>` tag for it near the bottom of `index.html`.
5. If a `deeper` link is a research paper, add a one-line summary for its URL in `js/papers.js`.
6. Add any new terms to `js/glossary.js`, with the explainer's `id`, so the glossary links to the page.
7. To include it in a learning path, add its `id` to `PATHS` in `js/app.js`.

## Credits

The visual style was inspired by [this R² explainer](https://mic-wypych.github.io/r2_explainer/). The references on each page point to the original authors.
