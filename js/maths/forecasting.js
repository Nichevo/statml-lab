// "Show the maths" panels for the forecasting pages. TeX between \( \) or \[ \], rendered by MathJax on first open.
Object.assign(Lab.maths, {
  "exponential-smoothing": String.raw`
<h3>Moving average</h3>
<p>The k-period moving average forecast is the plain mean of the last k values:</p>
\[ \hat y_{t+1} = \frac{1}{k}\sum_{j=0}^{k-1} y_{t-j}. \]
<p>If the series is a flat level plus independent noise with variance \(\sigma^2\), its forecast error variance is \(\sigma^2(1 + 1/k)\): longer windows cut the noise term but react k periods late when the level shifts. An average of k points lags a trend by \((k-1)/2\) periods.</p>
<h3>Simple exponential smoothing (SES)</h3>
\[ \ell_t = \alpha y_t + (1-\alpha)\ell_{t-1}, \qquad \hat y_{t+h|t} = \ell_t. \]
<p>Unrolling the recursion shows it is a weighted average with geometrically falling weights:</p>
\[ \ell_t = \alpha\sum_{j=0}^{t-1}(1-\alpha)^j y_{t-j} + (1-\alpha)^t \ell_0 . \]
<p>The weights sum to 1, and the average age of the data used is \((1-\alpha)/\alpha\) periods. A moving average of k periods has average age \((k-1)/2\), so SES with \(\alpha = 2/(k+1)\) reacts about as fast as a k-period moving average.</p>
<p>Error-correction form: \(\ell_t = \ell_{t-1} + \alpha e_t\) with \(e_t = y_t - \ell_{t-1}\). Each period the level moves a share α of the surprise.</p>
<h3>Holt (trend) and Holt-Winters (season)</h3>
\[ \begin{aligned} \ell_t &= \alpha (y_t - s_{t-m}) + (1-\alpha)(\ell_{t-1} + b_{t-1})\\ b_t &= \beta(\ell_t - \ell_{t-1}) + (1-\beta) b_{t-1}\\ s_t &= \gamma (y_t - \ell_t) + (1-\gamma) s_{t-m}\\ \hat y_{t+h|t} &= \ell_t + h\,b_t + s_{t+h-m(k+1)} \end{aligned} \]
<p>where m is the season length and \(k = \lfloor (h-1)/m \rfloor\), so the seasonal index comes from the most recent matching season. Drop \(s\) for Holt's linear method. The multiplicative version divides by \(s\) instead of subtracting it, for seasons that grow with the level.</p>
<h3>Choosing α, β, γ</h3>
<p>Minimise the sum of squared one-step errors \(\sum_t (y_t - \hat y_{t|t-1})^2\) over the history. This is the same as maximum likelihood in the matching state space (ETS) model, which is also what gives proper prediction intervals: for SES, \(\operatorname{Var}(y_{t+h} - \hat y_{t+h|t}) = \sigma^2[1 + (h-1)\alpha^2]\).</p>`,

  "forecast-accuracy": String.raw`
<h3>Definitions</h3>
<p>With actuals \(y_t\), forecasts \(\hat y_t\), errors \(e_t = y_t - \hat y_t\) over n periods:</p>
\[ \text{MAE} = \frac1n\sum|e_t|, \quad \text{RMSE} = \sqrt{\frac1n\sum e_t^2}, \quad \text{MAPE} = \frac{100}{n}\sum\left|\frac{e_t}{y_t}\right|, \quad \text{Bias} = \frac1n\sum e_t. \]
\[ \text{WAPE} = \frac{\sum|e_t|}{\sum|y_t|}, \qquad \text{MASE} = \frac{\text{MAE}}{\frac{1}{T-m}\sum_{t=m+1}^{T}|y_t - y_{t-m}|}. \]
<p>The MASE denominator is the in-sample MAE of the (seasonal) naive forecast, so MASE &lt; 1 means better than naive on the training data's scale.</p>
<h3>What each one rewards</h3>
<ul>
<li>The constant forecast c that minimises \(\sum (y_t - c)^2\) is the <b>mean</b>; the one that minimises \(\sum |y_t - c|\) is the <b>median</b>. So RMSE pushes forecasts towards the mean and MAE towards the median. For skewed or lumpy demand these differ, and the choice of measure changes which forecast "wins".</li>
<li>MAPE weights each error by \(1/y_t\). Over-forecasting a small actual is punished heavily, and \(y_t = 0\) makes it undefined. Minimising MAPE favours forecasts below the median.</li>
<li>\(\text{RMSE} \ge \text{MAE}\) always (by Jensen's inequality), and the ratio grows when a few errors are large.</li>
</ul>
<h3>Why bias matters separately</h3>
<p>\(\text{MSE} = \text{Bias}^2 + \operatorname{Var}(e)\). A forecast can have a reasonable RMSE while being consistently high or low; that systematic part builds stock or causes stock-outs every period, so track it on its own (often as a tracking signal \(\sum e_t / \text{MAE}\)).</p>`,

  "acf-pacf": String.raw`
<h3>Sample autocorrelation</h3>
\[ r_k = \frac{\sum_{t=k+1}^{n}(y_t - \bar y)(y_{t-k} - \bar y)}{\sum_{t=1}^{n}(y_t - \bar y)^2}. \]
<p>Under white noise, \(r_k\) is approximately normal with mean 0 and variance \(1/n\), which gives the usual \(\pm 1.96/\sqrt n\) bands. (Bartlett's formula widens them at lag k when earlier lags are non-zero: \(\operatorname{Var}(r_k) \approx \frac1n(1 + 2\sum_{j&lt;k} r_j^2)\).)</p>
<h3>Partial autocorrelation</h3>
<p>The PACF at lag k, \(\phi_{kk}\), is the last coefficient when you regress \(y_t\) on \(y_{t-1},\dots,y_{t-k}\): the link between \(y_t\) and \(y_{t-k}\) after removing what the lags in between explain. The Durbin–Levinson recursion computes it from the ACF:</p>
\[ \phi_{kk} = \frac{r_k - \sum_{j=1}^{k-1}\phi_{k-1,j}\, r_{k-j}}{1 - \sum_{j=1}^{k-1}\phi_{k-1,j}\, r_j}, \qquad \phi_{kj} = \phi_{k-1,j} - \phi_{kk}\phi_{k-1,k-j}. \]
<h3>The textbook patterns, derived</h3>
<ul>
<li><b>AR(1)</b>, \(y_t = \phi y_{t-1} + \varepsilon_t\): multiply by \(y_{t-k}\) and take expectations to get \(\rho_k = \phi\rho_{k-1}\), so \(\rho_k = \phi^k\) (geometric decay). The PACF is \(\phi\) at lag 1 and zero after, because \(y_{t-1}\) already carries everything.</li>
<li><b>MA(1)</b>, \(y_t = \varepsilon_t + \theta\varepsilon_{t-1}\): \(\rho_1 = \theta/(1+\theta^2)\) and \(\rho_k = 0\) for \(k \ge 2\), since terms two apart share no shock. Its PACF decays instead.</li>
<li><b>Ljung–Box</b> tests several lags together: \(Q = n(n+2)\sum_{k=1}^{h} r_k^2/(n-k) \sim \chi^2_{h}\) under white noise (minus the number of fitted ARMA parameters when testing residuals).</li>
</ul>`,

  "arima": String.raw`
<h3>The model</h3>
<p>With the backshift operator \(B y_t = y_{t-1}\), an ARIMA(p, d, q) model is</p>
\[ \underbrace{(1 - \phi_1 B - \dots - \phi_p B^p)}_{\text{AR}}\;\underbrace{(1-B)^d}_{\text{differencing}}\, y_t = c + \underbrace{(1 + \theta_1 B + \dots + \theta_q B^q)}_{\text{MA}}\,\varepsilon_t . \]
<p>Seasonal ARIMA multiplies in the same polynomials in \(B^m\), e.g. \((1-B^m)\) for a seasonal difference.</p>
<h3>Stationarity and invertibility</h3>
<p>The AR part is stationary when all roots of \(1 - \phi_1 z - \dots - \phi_p z^p\) lie outside the unit circle; for AR(1) that is \(|\phi| &lt; 1\). A root on the circle (\(\phi = 1\)) is a random walk: differencing once removes it, which is why d exists. The MA part should be invertible (roots outside the circle) so the shocks can be recovered from the data.</p>
<h3>Forecasts and their uncertainty</h3>
<p>Forecasts replace future shocks by 0 and future y by their forecasts. Writing the model as an infinite MA, \(y_t = \mu + \sum_{j\ge0}\psi_j \varepsilon_{t-j}\) with \(\psi_0 = 1\), the h-step error variance is</p>
\[ \operatorname{Var}(e_{t+h|t}) = \sigma^2 \sum_{j=0}^{h-1} \psi_j^2 . \]
<p>For a stationary model this levels off at the series variance; with d ≥ 1 the \(\psi_j\) don't die out and the intervals keep widening. For AR(1), \(\psi_j = \phi^j\), so the forecast decays to the mean as \(\mu + \phi^h(y_t - \mu)\).</p>
<h3>Fitting and choosing</h3>
<p>Parameters are estimated by maximum likelihood. Orders are compared with \(\text{AICc} = -2\log L + 2k + \frac{2k(k+1)}{n-k-1}\), where k counts parameters; only compare models with the same d, since differencing changes the data the likelihood is computed on. ARIMA(0,1,1) gives the same forecasts as simple exponential smoothing with \(\alpha = 1 + \theta\).</p>`,

  "seasonal-decomposition": String.raw`
<h3>Classical additive decomposition</h3>
<p>Assume \(y_t = T_t + S_t + R_t\) with season length m (multiplicative: \(y_t = T_t S_t R_t\), or additive on logs).</p>
<ol>
<li><b>Trend</b> by a centred moving average. For even m, a "2×m" MA:
\[ \hat T_t = \frac{1}{m}\left(\tfrac12 y_{t-m/2} + y_{t-m/2+1} + \dots + y_{t+m/2-1} + \tfrac12 y_{t+m/2}\right). \]
It spans exactly one full season with weights summing to 1, so any fixed seasonal pattern that sums to zero over a year cancels out.</li>
<li><b>Detrend</b>: \(y_t - \hat T_t\).</li>
<li><b>Seasonal indices</b>: average the detrended values for each season position, then subtract their mean so the m indices sum to 0 (multiplicative: divide so they average 1).</li>
<li><b>Remainder</b>: \(\hat R_t = y_t - \hat T_t - \hat S_t\).</li>
</ol>
<h3>Properties and limits</h3>
<ul>
<li>The centred MA loses m/2 values at each end, so the trend (and remainder) is missing exactly where forecasting needs it most.</li>
<li>A linear trend passes through a symmetric MA unchanged: \(\frac1m\sum (a + b(t+j)) = a + bt\) when the offsets j are symmetric.</li>
<li>Seasonal indices are fixed for all years. STL replaces both steps with LOESS smoothers, so the season can drift and outliers can be down-weighted (robust iterations).</li>
<li>Strength of seasonality: \(F_S = \max\!\left(0,\; 1 - \frac{\operatorname{Var}(R)}{\operatorname{Var}(S + R)}\right)\); near 1 means a strong, stable season.</li>
</ul>`,

  "theta": String.raw`
<h3>Theta lines</h3>
<p>Theta lines change the curvature of the series while keeping its mean and slope. Apply the second difference: a theta line \(Z_t(\theta)\) solves</p>
\[ \nabla^2 Z_t(\theta) = \theta\, \nabla^2 y_t . \]
<p>θ = 0 removes all curvature and leaves the straight regression line \(a + bt\); θ = 1 is the data; θ = 2 doubles the local curvature. In closed form \(Z_t(\theta) = \theta y_t + (1-\theta)(a + bt)\), where a, b are the least-squares intercept and slope of y on t.</p>
<h3>The standard method</h3>
<ol>
<li>Deseasonalise if needed (classical multiplicative decomposition).</li>
<li>Extrapolate θ = 0 as the straight line \(a + b(n+h)\).</li>
<li>Forecast θ = 2, \(Z_t(2) = 2y_t - (a + bt)\), with simple exponential smoothing.</li>
<li>Average the two forecasts with equal weight, then reseasonalise.</li>
</ol>
<h3>What it is really doing</h3>
<p>Hyndman and Billah showed the result equals SES with a drift term: \(\hat y_{n+h|n} = \ell_n + \tfrac{b}{2}\left[h - 1 + \tfrac{1}{\alpha} - \tfrac{(1-\alpha)^n}{\alpha}\right]\). So it is exponential smoothing plus half the long-run trend, which is why it is robust: the damped-looking slope rarely overshoots, and the level adapts like SES.</p>`,

  "intermittent-demand": String.raw`
<h3>Croston's method</h3>
<p>Update only in periods with demand. If \(z_t\) is the demand size and \(p_t\) the number of periods since the last demand:</p>
\[ \hat z_t = \hat z_{t-1} + \alpha (z_t - \hat z_{t-1}), \qquad \hat p_t = \hat p_{t-1} + \alpha (p_t - \hat p_{t-1}), \qquad \hat y = \frac{\hat z}{\hat p}. \]
<p>In periods with no demand nothing changes, so the forecast is a flat demand rate per period.</p>
<h3>Why it is biased, and the SBA fix</h3>
<p>Even if \(\hat z\) and \(\hat p\) are unbiased for z and p, the ratio is not: by Jensen's inequality \(E[1/\hat p] &gt; 1/E[\hat p]\) because 1/x is convex. Syntetos and Boylan derived the approximate bias \(\frac{\alpha}{2-\alpha}\cdot\frac{\mu_z (p-1)}{p^2}\) and the correction</p>
\[ \hat y_{\text{SBA}} = \left(1 - \frac{\alpha}{2}\right)\frac{\hat z}{\hat p}. \]
<h3>Classifying demand</h3>
<p>Use the average inter-demand interval ADI = \(\bar p\) and the squared coefficient of variation of non-zero sizes \(CV^2 = (s_z/\bar z)^2\). The usual cut-offs (ADI = 1.32, \(CV^2\) = 0.49) split smooth, erratic, intermittent and lumpy items. These come from the regions where SBA beats Croston or SES in expected squared error.</p>
<h3>Scoring</h3>
<p>For mostly-zero series the median is often 0, so MAE rewards a forecast of zero. Prefer MSE-type measures, scaled errors (MASE) or measures of stock outcome instead.</p>`,

  "prediction-intervals": String.raw`
<h3>Normal intervals from forecast errors</h3>
<p>If h-step errors are roughly normal with standard deviation \(\sigma_h\):</p>
\[ \hat y_{t+h|t} \pm z_{1-a/2}\, \sigma_h, \qquad z_{0.9} = 1.28 \;(80\%), \quad z_{0.975} = 1.96 \;(95\%). \]
<p>\(\sigma_h\) grows with h. For a random walk \(\sigma_h = \sigma\sqrt h\); for SES \(\sigma_h^2 = \sigma^2[1 + (h-1)\alpha^2]\). Using the one-step \(\sigma\) for every horizon gives intervals that are too narrow.</p>
<h3>Empirical quantiles</h3>
<p>Without assuming normality, take quantiles of the past h-step errors from a backtest: the q-quantile forecast is \(\hat y + Q_q(e)\). This handles skew, e.g. demand that can spike up much more than down.</p>
<h3>The newsvendor link</h3>
<p>If one unit too many costs \(c_o\) and one unit too few costs \(c_u\), expected cost \(E[c_o (Q-D)^+ + c_u (D-Q)^+]\) has derivative \(c_o F(Q) - c_u(1 - F(Q))\). Setting it to zero:</p>
\[ F(Q^*) = \frac{c_u}{c_u + c_o}. \]
<p>So the stock level you want is a specific quantile of the forecast distribution, not the mean. That's why quantile forecasts are directly useful.</p>
<h3>Checking intervals</h3>
<p>Coverage: the share of actuals inside the interval should be close to the nominal level. Width matters too: the interval score \( (u - l) + \frac{2}{a}(l - y)^+ + \frac{2}{a}(y - u)^+ \) rewards narrow intervals and penalises misses.</p>`,

  "pinball-crps": String.raw`
<h3>Pinball (quantile) loss</h3>
<p>For quantile level τ and forecast q:</p>
\[ L_\tau(y, q) = \begin{cases} \tau\,(y - q) & y \ge q\\ (1-\tau)(q - y) & y &lt; q \end{cases} \]
<h3>Why it targets the right quantile</h3>
<p>Expected loss is \(\tau\int_q^\infty (y-q)\,dF + (1-\tau)\int_{-\infty}^q (q-y)\,dF\). Differentiating in q:</p>
\[ \frac{d}{dq}E[L_\tau] = -\tau(1 - F(q)) + (1-\tau)F(q) = F(q) - \tau , \]
<p>which is zero when \(F(q) = \tau\). The loss is minimised by the true τ-quantile, so it is a proper scoring rule for quantiles. At τ = 0.5 it is half the absolute error.</p>
<h3>CRPS</h3>
<p>For a forecast distribution F and outcome y:</p>
\[ \text{CRPS}(F, y) = \int_{-\infty}^{\infty} \big(F(x) - \mathbf 1\{x \ge y\}\big)^2\,dx = 2\int_0^1 L_\tau\big(y, F^{-1}(\tau)\big)\,d\tau . \]
<p>So CRPS is pinball loss averaged over all quantiles. Another form is \(E|X - y| - \tfrac12 E|X - X'|\) with X, X′ independent draws from F; for a point forecast (a spike) it reduces to the absolute error. For a normal forecast \(N(\mu,\sigma^2)\), with \(z = (y-\mu)/\sigma\):</p>
\[ \text{CRPS} = \sigma\left[ z\,(2\Phi(z) - 1) + 2\varphi(z) - \tfrac{1}{\sqrt\pi} \right]. \]
<p>It is in the same units as demand, and lower is better. It rewards sharpness (narrow distributions) only as long as they stay calibrated.</p>`,

  "ensemble-forecasts": String.raw`
<h3>Why averaging reduces error</h3>
<p>Average k forecasts with errors \(e_i\), each with variance \(\sigma^2\) and pairwise correlation ρ. The combined error \(\bar e = \frac1k\sum e_i\) has</p>
\[ \operatorname{Var}(\bar e) = \frac{\sigma^2}{k}\big(1 + (k-1)\rho\big) \;\longrightarrow\; \rho\,\sigma^2 \text{ as } k \to \infty . \]
<p>Gains come from diversity: with ρ = 1 nothing changes; with ρ = 0.5 even infinitely many models only halve the variance. Adding a weaker but different method can still help.</p>
<h3>Optimal weights, and why equal weights usually win</h3>
<p>For two forecasts the weight on the first that minimises error variance is</p>
\[ w^* = \frac{\sigma_2^2 - \rho\sigma_1\sigma_2}{\sigma_1^2 + \sigma_2^2 - 2\rho\sigma_1\sigma_2}. \]
<p>In practice \(\sigma_i\) and ρ are estimated from short, noisy histories, and errors in the estimated weights often cost more than the gain from optimising them: the "forecast combination puzzle". Equal weights, a trimmed mean, or the median are robust defaults.</p>
<h3>Bias and the median</h3>
<p>Averaging doesn't remove shared bias: \(E[\bar e] = \frac1k\sum E[e_i]\). The median of the forecasts is less affected by one wild model, at the cost of a little efficiency when all models are reasonable.</p>`,

  "reconciliation": String.raw`
<h3>The summing matrix</h3>
<p>Stack all series (total, groups, items) in \(\mathbf y_t\) and the bottom-level items in \(\mathbf b_t\). Then \(\mathbf y_t = \mathbf S\,\mathbf b_t\), where each row of S says which items add up to that series. Any coherent forecast has the form</p>
\[ \tilde{\mathbf y} = \mathbf S\,\mathbf G\,\hat{\mathbf y}, \]
<p>where \(\hat{\mathbf y}\) are the independent ("base") forecasts at every level and G maps them to bottom-level forecasts.</p>
<ul>
<li><b>Bottom-up</b>: G picks out the bottom-level rows of \(\hat{\mathbf y}\).</li>
<li><b>Top-down</b>: G has a single non-zero column, the total, multiplied by historical proportions \(p_j\).</li>
<li><b>OLS</b>: \(\mathbf G = (\mathbf S^\top\mathbf S)^{-1}\mathbf S^\top\), the least-squares projection onto coherent forecasts.</li>
<li><b>MinT</b>: \(\mathbf G = (\mathbf S^\top \mathbf W^{-1}\mathbf S)^{-1}\mathbf S^\top \mathbf W^{-1}\), where W is the covariance of the base forecast errors. It gives the coherent forecasts with the smallest total error variance among unbiased ones. WLS uses only the diagonal of W.</li>
</ul>
<h3>Why it can beat every single level</h3>
<p>\(\mathbf S\mathbf G\) is a projection: it pulls the base forecasts onto the set where totals equal the sum of their parts. If the base forecasts are unbiased and \(\mathbf S\mathbf G\mathbf S = \mathbf S\), the result stays unbiased. Combining information from all levels lowers variance, the same reason ensembles help.</p>`,

  "backtesting": String.raw`
<h3>Rolling origin</h3>
<p>For origins \(t = n_0, n_0 + s, \dots\), fit on \(y_1..y_t\) only, forecast \(h = 1..H\) ahead, and record \(e_{t,h} = y_{t+h} - \hat y_{t+h|t}\). Accuracy at horizon h is averaged over origins:</p>
\[ \text{MAE}_h = \frac{1}{N_h}\sum_t |e_{t,h}| . \]
<p>An "expanding window" keeps all history; a "sliding window" keeps the last w points, which adapts faster but estimates parameters with more noise.</p>
<h3>Why one split is not enough</h3>
<p>One test window gives one estimate of error with large sampling noise; comparing two methods on it is close to a coin toss when their true errors are similar. Averaging over N origins reduces the noise, roughly by \(1/\sqrt{N_{\text{eff}}}\), less than \(1/\sqrt N\) because overlapping windows are correlated.</p>
<h3>Comparing two methods properly</h3>
<p>Use the loss differences \(d_t = L(e^A_t) - L(e^B_t)\) on the same origins. The Diebold–Mariano statistic is</p>
\[ DM = \frac{\bar d}{\sqrt{\hat V(\bar d)}} \approx N(0,1), \]
<p>with \(\hat V\) allowing for autocorrelation up to lag h − 1 (h-step errors overlap). Pairing on the same origins removes the shared difficulty of each period, which makes the comparison far more sensitive than comparing two separate averages.</p>
<h3>Leakage rules</h3>
<p>Everything (parameters, outlier fixes, feature scaling, model choice) must use only data up to the origin. Any step fitted on the full series leaks future information and flatters the score.</p>`,

  "forecast-value-added": String.raw`
<h3>Definition</h3>
<p>For each step in the forecasting process (statistical model, planner override, consensus meeting), compare its accuracy with the step before it, usually starting from a naive forecast:</p>
\[ \text{FVA}_{\text{step}} = \text{Error}_{\text{previous}} - \text{Error}_{\text{step}} . \]
<p>Positive FVA means the step improved accuracy. Measures are typically MAPE/WAPE or MAE, all on the same items and periods.</p>
<h3>Making it a fair test</h3>
<ul>
<li>Use the same error measure and the same set of item-periods for every step.</li>
<li>Look at the distribution of FVA by item and over time, not only the total. An average gain can hide many harmful overrides offset by a few big wins.</li>
<li>Test whether the gain is real: with per-period differences \(d_t\), a paired t-statistic \(\bar d / (s_d/\sqrt n)\) or a sign test asks whether the step beats its predecessor more often than chance.</li>
</ul>
<h3>Size and direction of overrides</h3>
<p>Studies of judgmental adjustments find large, downward overrides tend to add value (planners know about real events) while small, upward ones tend to destroy it (optimism). Splitting FVA by the sign and size of the override, \(\text{adj} = \hat y_{\text{final}} - \hat y_{\text{stat}}\), shows where judgement helps.</p>`,

  "forecast-lab": String.raw`
<h3>The methods in the lab</h3>
<ul>
<li><b>Naive</b>: \(\hat y_{t+1} = y_t\). <b>Seasonal naive</b>: \(\hat y_{t+h} = y_{t+h-m}\).</li>
<li><b>Moving average</b>: \(\hat y_{t+1} = \frac1k\sum_{j=0}^{k-1} y_{t-j}\).</li>
<li><b>Simple exponential smoothing</b>: \(\ell_t = \alpha y_t + (1-\alpha)\ell_{t-1}\).</li>
<li><b>Holt</b> and <b>Holt-Winters</b>: add trend \(b_t\) and season \(s_t\) equations (see exponential smoothing).</li>
<li><b>Linear trend</b>: least-squares line \(a + bt\), with \(b = \frac{\sum (t - \bar t)(y_t - \bar y)}{\sum (t-\bar t)^2}\).</li>
</ul>
<h3>Fitting vs testing</h3>
<p>Each method is fitted on the history before the holdout and then scored on the holdout. In-sample fit always improves with flexibility; out-of-sample error has a minimum, as in the bias–variance trade-off: \(E[(y - \hat y)^2] = \text{Bias}^2 + \text{Variance} + \sigma^2\).</p>
<h3>Scaled errors</h3>
<p>To compare across items of different size, divide MAE by the in-sample MAE of the naive (or seasonal naive) forecast: \(\text{MASE} = \text{MAE}/\text{MAE}_{\text{naive, in-sample}}\). Unlike MAPE it is defined when actuals are zero and treats over- and under-forecasts symmetrically.</p>`,

  "new-product": String.raw`
<h3>The Bass diffusion model</h3>
<p>Let F(t) be the share of the eventual market m that has adopted by time t. The hazard of adopting, given not yet adopted, is innovation plus imitation:</p>
\[ \frac{f(t)}{1 - F(t)} = p + q\,F(t). \]
<p>This separable ODE solves to</p>
\[ F(t) = \frac{1 - e^{-(p+q)t}}{1 + \frac{q}{p}e^{-(p+q)t}}, \qquad \text{sales}(t) = m\,f(t). \]
<h3>Peak timing and size</h3>
<p>Setting \(f'(t) = 0\) gives the peak at</p>
\[ t^* = \frac{\ln(q/p)}{p+q}, \qquad F(t^*) = \frac12 - \frac{p}{2q}. \]
<p>If q ≤ p there is no interior peak: sales are highest at launch and decline (an innovation-led product). Typical published values are p ≈ 0.03 and q ≈ 0.38 per year, which put the peak around year 6 to 7.</p>
<h3>Fitting with little data</h3>
<p>In discrete time \(S_t = a + b\,N_{t-1} + c\,N_{t-1}^2\), with \(N\) the cumulative sales so far, can be fitted by least squares, then \(m = \frac{-b - \sqrt{b^2 - 4ac}}{2c}\), \(p = a/m\), \(q = -mc\). With only a few early points, m is poorly identified, so analogues are used to supply p and q (or priors on them) and the new product's own data then sets m.</p>
<h3>Analogues</h3>
<p>A weighted average of scaled launch curves of similar past products, with weights from similarity scores, \(\hat y_t = m \sum_j w_j\, c_{j,t}\), where \(c_{j,t}\) is analogue j's sales at week t divided by its total.</p>`,

  "global-forecasting": String.raw`
<h3>Local vs global</h3>
<p>A local model fits parameters \(\theta_i\) per series: \(\hat y_{i,t+1} = f(y_{i,1..t}; \theta_i)\). A global model shares one function across all series:</p>
\[ \hat y_{i,t+1} = f\big(x_{i,t};\, \theta\big), \qquad x_{i,t} = (\text{lags}, \text{calendar}, \text{promo}, \text{price}, \dots). \]
<p>Pooling multiplies the training data by the number of series, so a far more flexible f (gradient-boosted trees, neural networks) can be fitted without overfitting any single short series.</p>
<h3>Scaling</h3>
<p>Series differ in size by orders of magnitude, so lags and targets are scaled per series, e.g. by the series' mean \(\bar y_i\) over the training window:</p>
\[ \tilde y_{i,t} = y_{i,t}/\bar y_i, \qquad \hat y_{i,t+1} = \bar y_i\,\hat f(\tilde x_{i,t}). \]
<p>Without scaling, squared-error training is dominated by the biggest items, and trees split on size rather than on the pattern.</p>
<h3>Gradient boosting in one line</h3>
<p>Start with a constant, then repeatedly fit a small tree \(h_m\) to the current residuals (the negative gradient of the loss) and add a shrunken copy: \(F_m = F_{m-1} + \nu\, h_m\). With squared loss the residuals are \(y - F_{m-1}\); with pinball loss the model learns quantiles directly.</p>
<h3>Multi-step forecasts</h3>
<p>Recursive: feed each forecast back in as a lag (errors compound). Direct: train one model per horizon h on targets \(y_{t+h}\) (no compounding, but h models).</p>`,

  "promo-regression": String.raw`
<h3>The model</h3>
\[ y_t = \beta_0 + \beta_1 t + \sum_{s} \gamma_s D_{s,t} + \delta\,\text{Promo}_t + \lambda\,\text{Promo}_{t-1} + \varepsilon_t , \]
<p>where \(D_{s,t}\) are season dummies (one left out), \(\delta\) is the promotion uplift, and \(\lambda\), usually negative, is the post-promotion dip as customers who stocked up buy less. A log model, \(\log y_t = \dots + \delta\,\text{Promo}_t\), gives a percentage uplift \(e^\delta - 1\).</p>
<h3>Least squares</h3>
<p>With the drivers in matrix X:</p>
\[ \hat{\boldsymbol\beta} = (X^\top X)^{-1}X^\top \mathbf y, \qquad \widehat{\operatorname{Var}}(\hat{\boldsymbol\beta}) = \hat\sigma^2 (X^\top X)^{-1}. \]
<p>The uplift's standard error depends on how many promotion weeks there are and on how correlated Promo is with the other columns. If promotions always fall in the peak season, \(X^\top X\) is close to singular and the model cannot separate uplift from season.</p>
<h3>Cannibalisation and net effect</h3>
<p>Adding a sister product's promotion flag as a driver, \(+\kappa\,\text{SisterPromo}_t\), estimates cannibalisation \(\kappa &lt; 0\). The net incremental volume of a promotion is then \(\delta + \lambda + \kappa_{\text{others}}\), which is often much smaller than \(\delta\) alone.</p>
<h3>Checks</h3>
<p>Residual autocorrelation (see ACF) means the standard errors are too small; dynamic regression fixes that by modelling the error as ARIMA.</p>`,

  "rnn-lstm": String.raw`
<h3>A plain RNN</h3>
\[ h_t = \tanh(W_h h_{t-1} + W_x x_t + b), \qquad \hat y_t = W_y h_t + c . \]
<p>The same weights are used at every step; \(h_t\) is the memory carried forward. Training uses backpropagation through time: the gradient of a loss at step t with respect to \(h_{t-k}\) contains the product \(\prod_{j=1}^{k} \operatorname{diag}(1 - h_{t-j+1}^2)\,W_h\). If the largest singular value of \(W_h\) is below 1 the product shrinks geometrically (vanishing gradients) and the network cannot learn long gaps; above 1 it can explode.</p>
<h3>The LSTM cell</h3>
\[ \begin{aligned} f_t &= \sigma(W_f[h_{t-1}, x_t] + b_f) && \text{forget gate}\\ i_t &= \sigma(W_i[h_{t-1}, x_t] + b_i) && \text{input gate}\\ \tilde c_t &= \tanh(W_c[h_{t-1}, x_t] + b_c) && \text{candidate}\\ c_t &= f_t \odot c_{t-1} + i_t \odot \tilde c_t && \text{cell state}\\ o_t &= \sigma(W_o[h_{t-1}, x_t] + b_o), \quad h_t = o_t \odot \tanh(c_t) \end{aligned} \]
<p>The cell state is updated additively, so \(\partial c_t / \partial c_{t-1} = f_t\) (plus smaller terms). When the forget gate stays near 1, gradients flow back many steps without vanishing: that is the whole point of the design.</p>
<h3>For demand</h3>
<p>Inputs are scaled lags plus calendar and promotion features; training is global across many series (see global forecasting). With one short series, the number of weights, about \(4(n_h^2 + n_h n_x + n_h)\) for an LSTM layer, dwarfs the data.</p>`,

  "conformal-prediction": String.raw`
<h3>Split conformal</h3>
<p>Fit any model on a training set. On a separate calibration set of n points compute scores \(s_i = |y_i - \hat y_i|\). Let \(\hat q\) be the \(\lceil (n+1)(1-a)\rceil\)-th smallest score. The interval for a new point is</p>
\[ \hat y_{\text{new}} \pm \hat q . \]
<h3>Why the guarantee holds</h3>
<p>If calibration points and the new point are exchangeable, the new score is equally likely to fall in any of the n + 1 rank positions among all scores. So</p>
\[ P\big(s_{\text{new}} \le \hat q\big) = \frac{\lceil (n+1)(1-a)\rceil}{n+1} \ge 1 - a , \]
<p>for any model and any data distribution, with no normality assumption. (Coverage is also at most \(1 - a + \frac{1}{n+1}\) if there are no ties.) The guarantee is marginal: on average over new points, not for every kind of point.</p>
<h3>Adaptive widths</h3>
<p>Conformalised quantile regression uses \(s_i = \max(\hat q_{lo}(x_i) - y_i,\; y_i - \hat q_{hi}(x_i))\), and the interval \([\hat q_{lo}(x) - \hat q,\; \hat q_{hi}(x) + \hat q]\), so the width can vary with x.</p>
<h3>Time series</h3>
<p>Forecast errors are not exchangeable when the series drifts. Adaptive conformal inference updates the level after each outcome, \(a_{t+1} = a_t + \eta\,(a - \text{miss}_t)\), where miss = 1 if the actual fell outside. Misses widen the next interval and hits narrow it, which keeps long-run coverage near target.</p>`,

  "kalman-filter": String.raw`
<h3>The local level model</h3>
\[ \begin{aligned} \text{state:}\quad & \mu_t = \mu_{t-1} + \eta_t, && \eta_t \sim N(0, q)\\ \text{measurement:}\quad & y_t = \mu_t + \varepsilon_t, && \varepsilon_t \sim N(0, r) \end{aligned} \]
<h3>Predict, then update</h3>
<p>Carry the estimate \(m\) and its variance \(P\):</p>
\[ \begin{aligned} \text{predict:}\quad & m_{t|t-1} = m_{t-1}, && P_{t|t-1} = P_{t-1} + q\\ \text{gain:}\quad & K_t = \frac{P_{t|t-1}}{P_{t|t-1} + r}\\ \text{update:}\quad & m_t = m_{t|t-1} + K_t\,(y_t - m_{t|t-1}), && P_t = (1 - K_t)\,P_{t|t-1} \end{aligned} \]
<p>This is Bayes' rule for normals: the prior \(N(m_{t|t-1}, P_{t|t-1})\) times the likelihood \(N(y_t; \mu, r)\) gives a normal posterior whose mean weights each by its precision (1/variance).</p>
<h3>Steady state and exponential smoothing</h3>
<p>P settles to the fixed point of \(P = (P + q)\,r/(P + q + r)\). Writing the signal-to-noise ratio \(\lambda = q/r\), the steady gain is</p>
\[ K = \frac{-\lambda + \sqrt{\lambda^2 + 4\lambda}}{2}, \]
<p>and the update \(m_t = m_{t-1} + K(y_t - m_{t-1})\) is exactly simple exponential smoothing with \(\alpha = K\). So α isn't arbitrary: it is set by how much the true level moves relative to measurement noise. The filter also gives forecast variance \(P_t + h q + r\) at horizon h.</p>
<h3>Missing data</h3>
<p>When \(y_t\) is missing, skip the update: \(m_t = m_{t|t-1}\), \(P_t = P_{t|t-1}\). The uncertainty grows by q each missing period, so the next observation gets more weight.</p>`,

  "dynamic-regression": String.raw`
<h3>The model</h3>
\[ y_t = \beta_0 + \boldsymbol\beta^\top \mathbf x_t + u_t, \qquad u_t = \phi\,u_{t-1} + \varepsilon_t,\; \varepsilon_t \sim \text{iid}(0, \sigma^2). \]
<p>More generally, \(u_t\) follows any ARIMA model: regression with ARIMA errors.</p>
<h3>Why ordinary least squares misleads</h3>
<p>OLS estimates are still unbiased, but its standard errors assume independent errors. With AR(1) errors and a slowly moving driver, the true variance of \(\hat\beta\) is inflated by roughly \(\frac{1 + \phi\rho_x}{1 - \phi\rho_x}\), where \(\rho_x\) is the driver's own lag-1 autocorrelation. For φ = ρ_x = 0.7 that factor is about 2.9, so the reported standard error is too small by \(\sqrt{2.9} \approx 1.7\).</p>
<h3>Fixing it: Cochrane–Orcutt / GLS</h3>
<p>Quasi-difference both sides with φ:</p>
\[ y_t - \phi y_{t-1} = \beta_0(1-\phi) + \boldsymbol\beta^\top(\mathbf x_t - \phi\mathbf x_{t-1}) + \varepsilon_t . \]
<p>The new errors \(\varepsilon_t\) are independent, so OLS on the transformed data is efficient and its standard errors are valid. In practice φ and β are estimated together by maximum likelihood, or by iterating: fit OLS, estimate φ from residuals, transform, refit.</p>
<h3>Forecasting</h3>
<p>\(\hat y_{t+h} = \hat\beta_0 + \hat{\boldsymbol\beta}^\top \mathbf x_{t+h} + \phi^h \hat u_t\). The last residual carries forward and fades at rate φ, which is why short-range forecasts improve. The future drivers \(\mathbf x_{t+h}\) must themselves be forecast (e.g. a weather forecast); their errors add to the forecast error.</p>`,

  "case-cold-brew": String.raw`
<h3>Step 1: robust outlier score</h3>
\[ z_t = \frac{y_t - \operatorname{med}_t}{1.4826\cdot \operatorname{MAD}}, \qquad \operatorname{MAD} = \operatorname{median}_t\,|y_t - \operatorname{med}_t| , \]
<p>where \(\operatorname{med}_t\) is the median of the non-promotion neighbours within 4 weeks. The 1.4826 makes MAD estimate the standard deviation for normal data, because the median of \(|Z|\) is \(\Phi^{-1}(0.75) = 0.6745 = 1/1.4826\). Unlike the SD, the MAD isn't inflated by the outlier it is trying to catch.</p>
<h3>Step 2: Holt-Winters with promotions</h3>
<p>Let u be the average promotion uplift. Promotion weeks are divided by u before smoothing, \(x_t = y_t / u^{\text{Promo}_t}\), additive Holt-Winters runs on \(x_t\), and forecasts are multiplied back: \(\hat y_{t+h} = \hat x_{t+h}\, u^{\text{Promo}_{t+h}}\). The smoothing parameters minimise in-sample one-step squared error over a grid.</p>
<h3>Step 3: safety stock from errors over the protection period</h3>
<p>With weekly review and lead time L, the protection period is \(P = L + 1\). For each forecast origin t in the test year,</p>
\[ E_t = \sum_{h=1}^{P} \big(y_{t+h} - \hat y_{t+h|t}\big), \qquad \sigma_P = \sqrt{\tfrac{1}{N}\textstyle\sum_t E_t^2}, \qquad SS = z_{\text{target}}\,\sigma_P . \]
<p>If one-step errors were independent with SD σ₁ then \(\sigma_P = \sigma_1\sqrt P\); positively correlated errors make the measured \(\sigma_P\) larger, which the √P shortcut would miss.</p>
<h3>Step 4: the order-up-to rule</h3>
\[ S_t = \sum_{h=1}^{P}\hat y_{t+h|t} + SS, \qquad Q_t = \max\big(0,\; S_t - \text{on hand}_t - \text{on order}_t\big). \]
<p>Unmet demand is lost: sales \(= \min(\text{on hand}, D_t)\).</p>
<h3>Step 5: yearly cost</h3>
\[ C = \overline{\text{on hand}} \times c \times h + \text{lost units} \times (p - c), \]
<p>with unit cost c = $6, price p = $10 and holding rate h per year. Roughly, an extra unit of safety stock is worth adding while the chance it prevents a lost sale in a week exceeds \(\frac{c\,h/52}{(p-c) + c\,h/52}\), which for these numbers is under 1%. That is why the cheapest target is so high.</p>
<h3>Step 6: Monte Carlo</h3>
<p>Each order independently arrives 2 weeks late with probability \(\pi\). Simulating 500 years gives the distribution of C; the P90 is the 90th percentile, \(\hat F_C^{-1}(0.9)\).</p>`,
});
