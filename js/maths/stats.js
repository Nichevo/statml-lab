// "Show the maths" panels for the regression, statistics and probability pages.
Object.assign(Lab.maths, {
  "r-squared": String.raw`
<h3>Splitting the variation</h3>
<p>For a least-squares fit with an intercept, total variation splits exactly into explained and unexplained parts:</p>
\[ \underbrace{\sum (y_i - \bar y)^2}_{\text{SST}} = \underbrace{\sum(\hat y_i - \bar y)^2}_{\text{SSR}} + \underbrace{\sum (y_i - \hat y_i)^2}_{\text{SSE}} . \]
<p>The cross term \(2\sum(\hat y_i - \bar y)(y_i - \hat y_i)\) vanishes because least-squares residuals are uncorrelated with the fitted values and sum to zero.</p>
\[ R^2 = \frac{\text{SSR}}{\text{SST}} = 1 - \frac{\text{SSE}}{\text{SST}} . \]
<h3>Links to correlation</h3>
<p>For one predictor, \(R^2 = r_{xy}^2\). In general \(R^2 = r_{y\hat y}^2\), the squared correlation between actual and fitted values.</p>
<h3>Adjusted R²</h3>
<p>R² never falls when a predictor is added, even pure noise: each new column can only reduce SSE. Adjusted R² charges for parameters:</p>
\[ \bar R^2 = 1 - (1 - R^2)\frac{n - 1}{n - p - 1}, \]
<p>which rises only if the new predictor's t-statistic exceeds 1 in absolute value.</p>
<h3>What R² doesn't tell you</h3>
<p>R² depends on the spread of x: the same line and noise give a higher R² over a wider x range. It says nothing about bias, curvature, or whether the model predicts well out of sample.</p>`,

  "least-squares": String.raw`
<h3>One predictor</h3>
<p>Minimise \(S(a, b) = \sum (y_i - a - b x_i)^2\). Setting both partial derivatives to zero (the normal equations) gives</p>
\[ \hat b = \frac{\sum (x_i - \bar x)(y_i - \bar y)}{\sum (x_i - \bar x)^2} = r\,\frac{s_y}{s_x}, \qquad \hat a = \bar y - \hat b\,\bar x . \]
<p>So the line always passes through \((\bar x, \bar y)\).</p>
<h3>Matrix form</h3>
\[ \hat{\boldsymbol\beta} = (X^\top X)^{-1}X^\top\mathbf y, \qquad \hat{\mathbf y} = H\mathbf y,\quad H = X(X^\top X)^{-1}X^\top . \]
<p>Geometrically, \(\hat{\mathbf y}\) is the orthogonal projection of y onto the space spanned by the columns of X, so the residual vector is at right angles to every column: \(X^\top(\mathbf y - \hat{\mathbf y}) = 0\).</p>
<h3>Why squares?</h3>
<p>If errors are independent \(N(0, \sigma^2)\), maximising the likelihood is the same as minimising the sum of squares. Without normality, the Gauss–Markov theorem says OLS has the smallest variance among linear unbiased estimators, provided errors have mean 0, constant variance and no correlation.</p>
<h3>Uncertainty</h3>
\[ \operatorname{Var}(\hat b) = \frac{\sigma^2}{\sum (x_i - \bar x)^2}, \qquad \hat\sigma^2 = \frac{\text{SSE}}{n - 2} . \]
<p>Spreading the x values out shrinks the slope's uncertainty. The diagonal \(h_{ii}\) of H is each point's leverage; points far from \(\bar x\) have high leverage and pull the line most.</p>`,

  "regression-pitfalls": String.raw`
<h3>Omitted variable bias</h3>
<p>If the true model is \(y = \beta_0 + \beta_1 x + \beta_2 z + \varepsilon\) but you leave out z, the slope you get converges to</p>
\[ \hat\beta_1 \to \beta_1 + \beta_2\,\frac{\operatorname{Cov}(x, z)}{\operatorname{Var}(x)} . \]
<p>The bias is the missing variable's effect times how strongly it moves with x. It vanishes only if z has no effect or is uncorrelated with x.</p>
<h3>Influence</h3>
<p>Cook's distance measures how much all fitted values move when point i is deleted:</p>
\[ D_i = \frac{e_i^2}{p\,\hat\sigma^2}\cdot\frac{h_{ii}}{(1 - h_{ii})^2}, \]
<p>large when a point has both a big residual and high leverage \(h_{ii}\). Values above about 4/n deserve a look.</p>
<h3>Curvature</h3>
<p>A straight line fitted to a curve leaves residuals with a pattern against x (e.g. positive at both ends, negative in the middle). Adding \(x^2\) or transforming (log) fixes the systematic part.</p>
<h3>Heteroscedasticity</h3>
<p>If the error variance grows with x, OLS stays unbiased but its standard errors are wrong. The robust (sandwich) estimator fixes them:</p>
\[ \widehat{\operatorname{Var}}(\hat{\boldsymbol\beta}) = (X^\top X)^{-1}\Big(\sum_i e_i^2\,\mathbf x_i\mathbf x_i^\top\Big)(X^\top X)^{-1}. \]
<h3>Collinearity</h3>
<p>The variance inflation factor \(\text{VIF}_j = 1/(1 - R_j^2)\), where \(R_j^2\) is from regressing \(x_j\) on the other predictors, is how much \(\operatorname{Var}(\hat\beta_j)\) is inflated by overlap with them.</p>`,

  "regularisation": String.raw`
<h3>Ridge and lasso</h3>
\[ \hat{\boldsymbol\beta}_{\text{ridge}} = \arg\min \|\mathbf y - X\boldsymbol\beta\|^2 + \lambda\|\boldsymbol\beta\|_2^2 = (X^\top X + \lambda I)^{-1}X^\top\mathbf y, \]
\[ \hat{\boldsymbol\beta}_{\text{lasso}} = \arg\min \tfrac12\|\mathbf y - X\boldsymbol\beta\|^2 + \lambda\|\boldsymbol\beta\|_1 . \]
<p>Predictors are standardised first so the penalty treats them equally; the intercept isn't penalised.</p>
<h3>What ridge does</h3>
<p>With the singular value decomposition \(X = UDV^\top\), ridge shrinks each principal direction by \(d_j^2/(d_j^2 + \lambda)\). Directions with little spread in the data (small \(d_j\)), which are poorly determined, are shrunk most. Adding λ to the diagonal also makes \(X^\top X\) invertible when predictors are collinear or p > n.</p>
<h3>Why lasso sets coefficients to exactly zero</h3>
<p>With one standardised predictor (or orthogonal predictors), the lasso solution is soft thresholding of the OLS estimate:</p>
\[ \hat\beta_j = \operatorname{sign}(\hat\beta_j^{\text{OLS}})\,\big(|\hat\beta_j^{\text{OLS}}| - \lambda\big)^+ . \]
<p>Any coefficient smaller than λ becomes exactly 0. Geometrically, the L1 constraint region is a diamond with corners on the axes, and the error contours usually first touch it at a corner.</p>
<h3>Bias–variance</h3>
<p>Larger λ adds bias but cuts variance; the λ with the lowest cross-validated error balances them. The "one standard error rule" picks the largest λ within one SE of that minimum, for a simpler model that predicts nearly as well.</p>`,

  "dummies-interactions": String.raw`
<h3>Dummy variables</h3>
<p>A category with k levels becomes k − 1 columns \(D_j \in \{0, 1\}\), with one level as the baseline:</p>
\[ y = \beta_0 + \sum_{j=2}^{k}\gamma_j D_j + \dots \]
<p>\(\beta_0\) is the baseline level's mean (holding other variables fixed) and \(\gamma_j\) is level j's difference from it.</p>
<h3>The dummy trap</h3>
<p>Including all k dummies plus an intercept makes the columns linearly dependent: \(\sum_{j=1}^{k} D_j = 1\), which equals the intercept column. Then \(X^\top X\) is singular and the coefficients aren't identified: you could add any constant c to every \(\gamma_j\) and subtract it from \(\beta_0\) without changing a single prediction.</p>
<h3>Interactions</h3>
\[ y = \beta_0 + \beta_1\,\text{Promo} + \beta_2\,\text{Holiday} + \beta_3\,\text{Promo}\times\text{Holiday} + \varepsilon . \]
<p>The four cell means are: neither \(\beta_0\); promo only \(\beta_0 + \beta_1\); holiday only \(\beta_0 + \beta_2\); both \(\beta_0 + \beta_1 + \beta_2 + \beta_3\). So \(\beta_1\) is the promo effect <i>when there is no holiday</i>, and the promo effect during a holiday is \(\beta_1 + \beta_3\). The interaction is a difference of differences:</p>
\[ \beta_3 = (\bar y_{11} - \bar y_{01}) - (\bar y_{10} - \bar y_{00}). \]
<h3>Variance of an interaction</h3>
<p>With equal cell sizes m, each cell mean has variance \(\sigma^2/m\), so \(\operatorname{Var}(\hat\beta_3) = 4\sigma^2/m\), four times a single cell mean's variance. Interactions need much more data to pin down than main effects.</p>`,

  "central-limit": String.raw`
<h3>The theorem</h3>
<p>If \(X_1, \dots, X_n\) are independent with the same distribution, mean μ and finite variance σ², then</p>
\[ \frac{\bar X_n - \mu}{\sigma/\sqrt n} \xrightarrow{d} N(0, 1) \quad\text{as } n\to\infty . \]
<h3>Why: a sketch with moment generating functions</h3>
<p>Let \(Y_i = (X_i - \mu)/\sigma\), so \(E[Y] = 0\), \(E[Y^2] = 1\), and \(M_Y(t) = 1 + \tfrac{t^2}{2} + o(t^2)\). The standardised mean is \(Z_n = \frac{1}{\sqrt n}\sum Y_i\), so</p>
\[ M_{Z_n}(t) = \left[M_Y\!\left(\tfrac{t}{\sqrt n}\right)\right]^n = \left[1 + \frac{t^2}{2n} + o\!\left(\tfrac1n\right)\right]^n \to e^{t^2/2}, \]
<p>which is the MGF of N(0, 1). The shape of the original distribution disappears; only its mean and variance survive.</p>
<h3>How fast?</h3>
<p>The Berry–Esseen bound says the largest gap between the CDF of \(Z_n\) and the normal CDF is at most \(\frac{C\,\rho}{\sigma^3\sqrt n}\), where \(\rho = E|X - \mu|^3\) and C &lt; 0.48. Skewed distributions have a large ρ, so they need bigger n: a rough rule is \(n > 25\,g_1^2\) with \(g_1\) the skewness.</p>
<h3>When it fails</h3>
<p>Infinite variance (e.g. a Cauchy distribution) breaks it: the mean of Cauchy draws is itself Cauchy, whatever n. Strong dependence between observations also slows or breaks convergence.</p>`,

  "confidence-intervals": String.raw`
<h3>The t interval</h3>
<p>For a sample mean with unknown σ:</p>
\[ \bar x \pm t_{n-1,\,1-a/2}\,\frac{s}{\sqrt n} . \]
<p>Why t and not z? If the data are normal, \(\frac{\bar X - \mu}{S/\sqrt n} = \frac{Z}{\sqrt{V/(n-1)}}\) with \(Z \sim N(0,1)\) and \(V = (n-1)S^2/\sigma^2 \sim \chi^2_{n-1}\) independent of Z. That ratio has a t distribution with n − 1 degrees of freedom, which has heavier tails than the normal to allow for estimating σ.</p>
<h3>What 95% means</h3>
<p>Before the data are drawn, the random interval covers μ with probability 0.95. Once computed, a particular interval either contains μ or not; "95%" describes the method's long-run hit rate.</p>
<h3>Proportions</h3>
<p>The Wald interval \(\hat p \pm z\sqrt{\hat p(1-\hat p)/n}\) undercovers for small n or p near 0 or 1. The Wilson interval inverts the score test and behaves much better:</p>
\[ \frac{\hat p + \frac{z^2}{2n} \pm z\sqrt{\frac{\hat p(1-\hat p)}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}} . \]
<h3>Bootstrap</h3>
<p>Resample n points with replacement B times, recompute the statistic each time, and take the 2.5% and 97.5% percentiles. It works because the empirical distribution \(\hat F\) approximates F, so the spread of the statistic under resampling from \(\hat F\) approximates its spread under sampling from F. It struggles with very small samples and with statistics like the maximum.</p>`,

  "hypothesis-test": String.raw`
<h3>The two-sample t-test</h3>
<p>Welch's version, which doesn't assume equal variances:</p>
\[ t = \frac{\bar x_1 - \bar x_2}{\sqrt{s_1^2/n_1 + s_2^2/n_2}}, \qquad \nu \approx \frac{(s_1^2/n_1 + s_2^2/n_2)^2}{\frac{(s_1^2/n_1)^2}{n_1-1} + \frac{(s_2^2/n_2)^2}{n_2-1}} . \]
<h3>The p-value</h3>
<p>The probability, if the null hypothesis were true, of a test statistic at least as extreme as the one observed: \(p = P(|T| \ge |t_{\text{obs}}| \mid H_0)\). Under \(H_0\) the p-value is uniformly distributed on [0, 1], so rejecting when p &lt; α gives a false-positive rate of exactly α.</p>
<h3>What it isn't</h3>
<p>It isn't \(P(H_0 \mid \text{data})\). By Bayes' rule that depends on the prior plausibility and the test's power:</p>
\[ P(H_0 \mid \text{significant}) = \frac{\alpha\,\pi_0}{\alpha\,\pi_0 + (1-\beta)(1 - \pi_0)} . \]
<p>If only 10% of tested ideas are real (π₀ = 0.9) and power is 50%, then \(0.045/(0.045 + 0.05) \approx 0.47\): almost half of significant results are false.</p>
<h3>Errors and power</h3>
<p>Type I error: rejecting a true null (rate α). Type II: missing a real effect (rate β). Power 1 − β for an effect δ with n per group is about \(\Phi\!\left(\frac{\delta}{\sigma\sqrt{2/n}} - z_{1-\alpha/2}\right)\).</p>`,

  "nonparametric-tests": String.raw`
<h3>Mann–Whitney U</h3>
<p>Rank all \(n_1 + n_2\) values together. With \(R_1\) the rank sum of group 1:</p>
\[ U_1 = R_1 - \frac{n_1(n_1+1)}{2}, \qquad E[U] = \frac{n_1n_2}{2}, \qquad \operatorname{Var}(U) = \frac{n_1n_2(n_1+n_2+1)}{12} \]
<p>under \(H_0\) (no ties). \(U_1\) counts pairs (i from group 1, j from group 2) with \(x_i > x_j\), so \(U_1/(n_1n_2)\) estimates \(P(X_1 > X_2)\): it tests whether one group tends to be larger, not whether the means differ.</p>
<h3>Permutation test</h3>
<p>Under \(H_0\) the group labels are exchangeable. Compute the statistic (e.g. difference in means) for many random relabellings; the p-value is the share at least as extreme as the observed one:</p>
\[ p = \frac{1 + \#\{|T^*| \ge |T_{\text{obs}}|\}}{1 + B} . \]
<p>The +1 terms count the observed labelling itself, which keeps the test valid exactly for any B.</p>
<h3>Efficiency</h3>
<p>For normal data the Mann–Whitney test is \(3/\pi \approx 95.5\%\) as efficient as the t-test: it needs about 5% more data for the same power. For heavy-tailed data it can be far more efficient, and its efficiency relative to t is never below 86.4% for any continuous distribution (Hodges–Lehmann).</p>`,

  "anova-chi-square": String.raw`
<h3>One-way ANOVA</h3>
<p>k groups, \(n_j\) in group j, N in total. Split the variation:</p>
\[ \underbrace{\sum_{j}\sum_i (y_{ij} - \bar y)^2}_{\text{SST}} = \underbrace{\sum_j n_j(\bar y_j - \bar y)^2}_{\text{SSB}} + \underbrace{\sum_j\sum_i (y_{ij} - \bar y_j)^2}_{\text{SSW}} , \]
\[ F = \frac{\text{SSB}/(k-1)}{\text{SSW}/(N-k)} \sim F_{k-1,\,N-k} \text{ under } H_0 . \]
<p>Both mean squares estimate σ² when the group means are equal; the between-group one is inflated when they differ. With two groups, \(F = t^2\).</p>
<h3>Chi-square test of independence</h3>
<p>For an r × c table of counts with row totals \(R_i\), column totals \(C_j\) and grand total N, expected counts under independence are \(E_{ij} = R_iC_j/N\):</p>
\[ \chi^2 = \sum_{i,j}\frac{(O_{ij} - E_{ij})^2}{E_{ij}} \sim \chi^2_{(r-1)(c-1)} . \]
<p>The approximation needs expected counts of at least about 5; otherwise use Fisher's exact test. Effect size: Cramér's \(V = \sqrt{\chi^2/(N\,(\min(r,c) - 1))}\).</p>`,

  "ab-power": String.raw`
<h3>Sample size for two proportions</h3>
<p>To detect a change from \(p_1\) to \(p_2\) with significance α (two-sided) and power 1 − β, each group needs about</p>
\[ n = \frac{\left(z_{1-\alpha/2}\sqrt{2\bar p(1-\bar p)} + z_{1-\beta}\sqrt{p_1(1-p_1) + p_2(1-p_2)}\right)^2}{(p_2 - p_1)^2}, \qquad \bar p = \frac{p_1 + p_2}{2}. \]
<p>A common shortcut for 80% power and α = 0.05 is \(n \approx 16\,\bar p(1-\bar p)/\delta^2\).</p>
<h3>Why small effects are expensive</h3>
<p>n scales with \(1/\delta^2\): halving the effect you want to detect quadruples the sample. Detecting a lift from 5.0% to 5.5% (δ = 0.005) needs about 32,000 per group.</p>
<h3>Peeking</h3>
<p>Checking the p-value repeatedly and stopping at the first p &lt; 0.05 inflates the false-positive rate: with 10 looks it is about 19%, and with unlimited looks it reaches 100%. Group-sequential designs fix this by spending α across looks, e.g. O'Brien–Fleming boundaries that demand very small p early on.</p>
<h3>Minimum detectable effect</h3>
<p>Given n per group, the smallest effect you'd reliably catch is \(\delta_{\min} \approx (z_{1-\alpha/2} + z_{1-\beta})\sqrt{2\bar p(1-\bar p)/n}\).</p>`,

  "multiple-testing": String.raw`
<h3>The problem</h3>
<p>With m independent tests of true nulls at level α, the chance of at least one false positive is</p>
\[ \text{FWER} = 1 - (1 - \alpha)^m , \]
<p>about 64% for m = 20 at α = 0.05.</p>
<h3>Bonferroni and Holm</h3>
<p>Boole's inequality, \(P(\cup A_i) \le \sum P(A_i)\), gives FWER ≤ α if each test uses α/m, whatever the dependence. Holm is uniformly more powerful: sort p-values \(p_{(1)} \le \dots \le p_{(m)}\), and reject \(H_{(i)}\) while \(p_{(i)} \le \frac{\alpha}{m - i + 1}\), stopping at the first failure.</p>
<h3>Benjamini–Hochberg</h3>
<p>To control the false discovery rate (the expected share of rejections that are false) at q: find the largest k with</p>
\[ p_{(k)} \le \frac{k}{m}\,q \]
<p>and reject \(H_{(1)}, \dots, H_{(k)}\). For independent tests BH guarantees \(\text{FDR} \le \frac{m_0}{m}q \le q\), where \(m_0\) is the number of true nulls. With many real effects, FDR control finds far more of them than FWER control, at the cost of accepting a known share of false leads.</p>
<h3>Adjusted p-values</h3>
<p>BH-adjusted values are \(\tilde p_{(i)} = \min_{j \ge i}\min\!\left(1, \frac{m}{j}p_{(j)}\right)\); reject wherever \(\tilde p \le q\).</p>`,

  "spc-control-charts": String.raw`
<h3>Shewhart limits</h3>
<p>For an individuals chart, estimate σ from the average moving range, since it is less affected by shifts than the overall SD:</p>
\[ \hat\sigma = \frac{\overline{MR}}{d_2} = \frac{\overline{MR}}{1.128}, \qquad \text{limits} = \bar x \pm 3\hat\sigma . \]
<p>For subgroup means of size n, the limits are \(\bar{\bar x} \pm 3\hat\sigma/\sqrt n\).</p>
<h3>Average run length</h3>
<p>If each point independently signals with probability p, the run length until the first signal is geometric, with \(\text{ARL} = 1/p\). In control, \(p = 2(1 - \Phi(3)) = 0.0027\), so ARL₀ ≈ 370 points between false alarms. After a shift of δσ,</p>
\[ p = 1 - \Phi(3 - \delta) + \Phi(-3 - \delta), \]
<p>giving ARL ≈ 44 for a 1σ shift and 6.3 for 2σ: Shewhart charts are slow to see small shifts.</p>
<h3>Run rules and EWMA</h3>
<p>Western Electric rules (e.g. 8 points in a row on one side) catch small shifts faster but cut ARL₀ to about 90. The EWMA chart, \(z_t = \lambda x_t + (1-\lambda)z_{t-1}\), with limits \(\mu_0 \pm L\sigma\sqrt{\frac{\lambda}{2-\lambda}[1 - (1-\lambda)^{2t}]}\), pools recent points and detects a 1σ shift in about 10 points with λ = 0.1.</p>`,

  "diff-in-diff": String.raw`
<h3>The estimator</h3>
<p>Treated (T) and control (C) groups, before and after:</p>
\[ \hat\delta = (\bar y_{T,\text{after}} - \bar y_{T,\text{before}}) - (\bar y_{C,\text{after}} - \bar y_{C,\text{before}}) . \]
<p>Equivalently, the coefficient \(\delta\) in \(y_{it} = \alpha + \beta\,\text{Treated}_i + \gamma\,\text{After}_t + \delta\,\text{Treated}_i\times\text{After}_t + \varepsilon_{it}\).</p>
<h3>Why it works: parallel trends</h3>
<p>Write each group's outcome without treatment as group effect + time effect: \(E[y_{it}(0)] = a_i + b_t\). Then the control's change \(b_{\text{after}} - b_{\text{before}}\) is exactly what the treated group would have done without treatment, and subtracting it removes both fixed group differences and common shocks. The key assumption is that, without treatment, the two groups would have moved in parallel. Diverging trends before treatment are evidence against it.</p>
<h3>Standard errors</h3>
<p>Outcomes for the same store or region are correlated over time, so standard errors should be clustered by unit. Naive standard errors with many periods can be several times too small (Bertrand, Duflo and Mullainathan, 2004).</p>
<h3>Event study</h3>
<p>Replace the single After term by a dummy for each period relative to treatment, \(\sum_k \delta_k\,\text{Treated}_i\,\mathbf 1\{t - t_0 = k\}\). Pre-treatment \(\delta_k\) near zero support parallel trends; post-treatment ones show how the effect builds.</p>`,

  "rollup": String.raw`
<h3>Means of rates</h3>
<p>Rates and percentages don't average directly. With groups of size \(n_j\) and rates \(r_j\), the overall rate is the weighted mean</p>
\[ r = \frac{\sum_j n_j r_j}{\sum_j n_j}, \]
<p>not \(\frac1k\sum r_j\). For MAPE across items, the volume-weighted version is WAPE, \(\sum|e|/\sum y\).</p>
<h3>Simpson's paradox</h3>
<p>Group A can beat group B within every segment and still lose overall when the segment mix differs. Write the overall rate as \(r = \sum_j w_j r_j\) with mix weights \(w_j = n_j/n\). A's overall rate can be lower if A has more weight on segments where everyone does badly. Comparing like with like means standardising: apply both groups' segment rates to the same weights.</p>
<h3>Errors roll up differently from levels</h3>
<p>Forecasts add up: the total forecast is the sum of item forecasts. Errors partly cancel: if item errors are independent with SD \(\sigma_i\), the total error has SD \(\sqrt{\sum\sigma_i^2}\), far less than \(\sum\sigma_i\). So percentage error is much smaller at the total than at the item level, by about \(1/\sqrt n\) for n similar items.</p>`,

  "survival-analysis": String.raw`
<h3>Kaplan–Meier</h3>
<p>At each distinct failure time \(t_j\), with \(n_j\) items still at risk and \(d_j\) failures:</p>
\[ \hat S(t) = \prod_{t_j \le t}\left(1 - \frac{d_j}{n_j}\right). \]
<p>Censored items count in \(n_j\) up to the time they leave, then drop out. This is the maximum-likelihood estimate of S without assuming any shape. Dropping censored items or treating them as failures both bias S downward.</p>
<h3>Greenwood's variance</h3>
\[ \widehat{\operatorname{Var}}\big(\hat S(t)\big) = \hat S(t)^2\sum_{t_j\le t}\frac{d_j}{n_j(n_j - d_j)} . \]
<h3>Weibull</h3>
\[ S(t) = e^{-(t/\lambda)^k}, \qquad h(t) = \frac{k}{\lambda}\left(\frac t\lambda\right)^{k-1}. \]
<p>The hazard falls for k &lt; 1 (early failures), is constant for k = 1 (exponential) and rises for k > 1 (wear-out). With censoring indicator \(\delta_i\) (1 = failed), the log-likelihood is \(\sum_i[\delta_i\log h(t_i) + \log S(t_i)]\): failures contribute the density, censored items only the survival.</p>
<h3>Log-rank test</h3>
<p>At each failure time, the expected failures in group 1 under \(H_0\) are \(E_{1j} = d_j\,n_{1j}/n_j\). Summing,</p>
\[ \chi^2 = \frac{\left(\sum_j (O_{1j} - E_{1j})\right)^2}{\sum_j V_j} \sim \chi^2_1, \qquad V_j = \frac{d_j\,(n_{1j}/n_j)(1 - n_{1j}/n_j)(n_j - d_j)}{n_j - 1}. \]`,

  "bayesian-updating": String.raw`
<h3>Bayes' rule</h3>
\[ p(\theta \mid \text{data}) = \frac{p(\text{data}\mid\theta)\,p(\theta)}{p(\text{data})} \;\propto\; \text{likelihood}\times\text{prior}. \]
<h3>Beta–binomial</h3>
<p>For a rate θ with prior \(\text{Beta}(a, b)\) and k successes in n trials:</p>
\[ \theta^{a-1}(1-\theta)^{b-1}\times\theta^k(1-\theta)^{n-k} = \theta^{a+k-1}(1-\theta)^{b+n-k-1}, \]
<p>so the posterior is \(\text{Beta}(a + k,\; b + n - k)\). The prior acts like a + b earlier trials with a successes. The posterior mean</p>
\[ \frac{a + k}{a + b + n} = w\,\frac{a}{a+b} + (1 - w)\,\frac kn, \qquad w = \frac{a + b}{a + b + n}, \]
<p>is a weighted average of the prior mean and the observed rate, moving towards the data as n grows.</p>
<h3>Gamma–Poisson</h3>
<p>For a demand rate λ with prior \(\text{Gamma}(\alpha, \beta)\) (shape, rate) and counts \(x_1..x_n\), the posterior is \(\text{Gamma}(\alpha + \sum x_i,\; \beta + n)\), mean \(\frac{\alpha + \sum x_i}{\beta + n}\).</p>
<h3>Credible intervals</h3>
<p>A 95% credible interval contains θ with posterior probability 0.95: the 2.5% and 97.5% quantiles of the posterior. Unlike a confidence interval, this is a probability statement about θ given the data, and it depends on the prior.</p>`,
});
