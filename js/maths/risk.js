// "Show the maths" panels for the risk, optimisation and data quality pages.
Object.assign(Lab.maths, {
  "var-cvar": String.raw`
<h3>Definitions</h3>
<p>For a loss X with CDF F and confidence level α (e.g. 95%):</p>
\[ \text{VaR}_\alpha = F^{-1}(\alpha) = \inf\{x : P(X \le x) \ge \alpha\}, \qquad \text{CVaR}_\alpha = E[X \mid X \ge \text{VaR}_\alpha]. \]
<p>From n sorted historical losses \(x_{(1)} \le \dots \le x_{(n)}\): VaR is about \(x_{(\lceil \alpha n\rceil)}\) and CVaR is the average of the losses from there up.</p>
<h3>Normal losses</h3>
<p>If \(X \sim N(\mu, \sigma^2)\):</p>
\[ \text{VaR}_\alpha = \mu + \sigma z_\alpha, \qquad \text{CVaR}_\alpha = \mu + \sigma\,\frac{\varphi(z_\alpha)}{1 - \alpha}. \]
<p>At 95%, \(z = 1.645\) and \(\varphi(z)/(1-\alpha) = 2.063\), so CVaR is about \(0.42\sigma\) beyond VaR. Fat-tailed data put CVaR much further out than the normal formula says.</p>
<h3>Why CVaR is the better number</h3>
<ul>
<li>VaR says nothing about how bad losses are beyond it: two portfolios with the same VaR can have very different tails.</li>
<li>CVaR is <b>subadditive</b>: \(\text{CVaR}(X + Y) \le \text{CVaR}(X) + \text{CVaR}(Y)\), so combining risks never looks riskier than the parts. VaR can break this, which penalises diversification.</li>
<li>Rockafellar and Uryasev showed \(\text{CVaR}_\alpha = \min_c \left\{ c + \frac{1}{1-\alpha}E[(X - c)^+]\right\}\), with the minimising c equal to VaR. That makes CVaR easy to optimise with linear programming.</li>
</ul>`,

  "monte-carlo-risk": String.raw`
<h3>The recipe</h3>
<p>Write the outcome as a function of uncertain inputs, \(Y = g(X_1, \dots, X_k)\). Draw n samples of the inputs from their distributions (with their correlations), compute \(Y^{(i)} = g(X^{(i)})\), and read off the mean, percentiles and probabilities from the n results.</p>
<h3>The flaw of averages</h3>
<p>In general \(E[g(X)] \ne g(E[X])\). If g is convex, Jensen's inequality gives \(E[g(X)] \ge g(E[X])\). Example: profit when capacity is C and demand D is \(m\min(D, C)\), which is concave in D, so plugging in average demand overstates average profit by \(m\,E[(D - C)^+]\).</p>
<h3>How accurate is the simulation?</h3>
<p>The estimated mean has standard error \(s/\sqrt n\). For a probability p (e.g. chance of a loss), the standard error is \(\sqrt{p(1-p)/n}\). For a percentile \(q_\alpha\), it is approximately</p>
\[ \operatorname{SE}(\hat q_\alpha) \approx \frac{\sqrt{\alpha(1-\alpha)/n}}{f(q_\alpha)}, \]
<p>which is large in the tails where the density f is small. To halve any of these errors you need four times as many runs.</p>
<h3>Correlated inputs</h3>
<p>To draw normals with correlation matrix R, factor \(R = LL^\top\) (Cholesky) and set \(\mathbf x = L\mathbf z\) with independent standard normals z. Ignoring a positive correlation between costs that tend to rise together understates the spread of the total.</p>
<h3>Tornado chart</h3>
<p>Move one input to its P10 and P90 while holding the others at their medians, and record the swing in Y. Ranking inputs by swing shows where better information would reduce uncertainty most.</p>`,

  "supplier-disruption": String.raw`
<h3>Time to recover vs time to survive</h3>
<p>For each site or supplier j, time to recover (TTR) is how long until supply is restored after a disruption. Time to survive (TTS) is how long you can keep meeting demand without it, using stock, other sources and spare capacity:</p>
\[ \text{TTS}_j \approx \frac{\text{stock}_j + \text{alternative supply over the period}}{\text{demand that depends on } j \text{ per week}} . \]
<p>If \(\text{TTS}_j &lt; \text{TTR}_j\), a disruption causes lost sales of about \(\text{weekly margin at risk} \times (\text{TTR}_j - \text{TTS}_j)\).</p>
<h3>Expected loss</h3>
<p>With disruption probability \(p_j\) per year:</p>
\[ E[\text{loss}_j] = p_j\times \text{margin}_j\times\max(0, \text{TTR}_j - \text{TTS}_j). \]
<p>Raising TTS by holding extra stock costs \(h\,\times\) weeks of cover \(\times\) weekly demand every year; it pays when that is less than the expected loss it removes.</p>
<h3>Concentration: HHI</h3>
<p>With supply shares \(s_j\) (summing to 1):</p>
\[ \text{HHI} = \sum_j s_j^2, \qquad N_{\text{eff}} = \frac{1}{\text{HHI}}. \]
<p>One supplier gives HHI = 1; n equal suppliers give 1/n. \(N_{\text{eff}}\) is the "effective number" of independent sources. If each source fails independently with probability p, losing more than half of supply needs several to fail at once, which is far less likely when \(N_{\text{eff}}\) is large.</p>`,

  "risk-matrix": String.raw`
<h3>The matrix score</h3>
<p>Each risk gets a likelihood band L and impact band I (e.g. 1 to 5) and a score \(S = L \times I\), or a colour from a lookup table. In money terms the quantity of interest is expected loss \(E = p \times C\), which the matrix approximates on a log-like scale.</p>
<h3>Where it misleads</h3>
<ul>
<li><b>Range compression</b>: a band covers a wide range. A 1-in-5 and a 1-in-50 chance can share a band, a 10× difference in expected loss.</li>
<li><b>Ordinal arithmetic</b>: multiplying band numbers assumes bands are equally spaced; if bands are roughly logarithmic, \(\log E = \log p + \log C\), so adding band numbers would be more defensible than multiplying them.</li>
<li><b>Reversals</b>: Cox (2008) showed matrices can rank a lower expected loss above a higher one, especially when likelihood and impact are negatively correlated.</li>
</ul>
<h3>FMEA</h3>
<p>Failure modes are scored for severity S, occurrence O and detection D (each 1 to 10), with risk priority number</p>
\[ \text{RPN} = S \times O \times D . \]
<p>The same caveats apply: very different (S, O, D) can give the same RPN (e.g. 10×1×10 and 4×5×5 are both 100), so a high-severity mode should be reviewed regardless of its RPN.</p>`,

  "stress-test": String.raw`
<h3>The weekly model</h3>
<p>Stock, supply and demand evolve under a scenario that changes some inputs over time:</p>
\[ I_{t} = I_{t-1} + \text{supply}_t(\text{scenario}) - \text{sales}_t, \qquad \text{sales}_t = \min\big(I_{t-1} + \text{supply}_t,\; d_t(\text{scenario})\big). \]
<p>Outputs are lost sales \(\sum (d_t - \text{sales}_t)\), weeks of shortage, minimum stock and cost.</p>
<h3>Scenarios vs probabilities</h3>
<p>A stress test fixes a plausible bad path (a port closure, a demand spike) rather than averaging over a distribution. It answers "what if?" without needing probabilities, which is useful when the probabilities are unknown.</p>
<h3>Reverse stress testing</h3>
<p>Instead of choosing the shock and measuring the damage, fix the damage you can't accept (e.g. more than 2 weeks out of stock) and solve for the smallest shock that causes it:</p>
\[ \min\ \text{severity}(\theta) \quad\text{s.t.}\quad \text{loss}(\theta) \ge L_{\max}. \]
<p>For a single parameter such as delay length this is a one-dimensional search (bisection). The answer is the breaking point; comparing it with what has happened historically shows how much margin you have.</p>`,

  "value-of-information": String.raw`
<h3>Step 1: best decision now</h3>
<p>Choose the action a with the highest expected value over uncertain states s with prior probabilities p(s):</p>
\[ EV_{\text{now}} = \max_a \sum_s p(s)\,V(a, s). \]
<h3>Step 2: perfect information</h3>
<p>If you could learn s before choosing, you'd pick the best action for each state:</p>
\[ EV_{\text{PI}} = \sum_s p(s)\max_a V(a, s), \qquad \text{EVPI} = EV_{\text{PI}} - EV_{\text{now}} \ge 0. \]
<p>EVPI is the most any test or study could be worth.</p>
<h3>Step 3: imperfect information</h3>
<p>A test gives result r with likelihood \(P(r \mid s)\). Update with Bayes' rule, \(P(s\mid r) = \frac{P(r\mid s)p(s)}{P(r)}\), choose the best action for each result, and average:</p>
\[ EV_{\text{SI}} = \sum_r P(r)\max_a \sum_s P(s\mid r)\,V(a, s), \qquad \text{EVSI} = EV_{\text{SI}} - EV_{\text{now}}. \]
<p>Information has value only if some result would change the decision. If every result leads to the same action, EVSI = 0 however accurate the test.</p>`,

  "linear-programming": String.raw`
<h3>Standard form</h3>
\[ \max\ \mathbf c^\top\mathbf x \quad\text{s.t.}\quad A\mathbf x \le \mathbf b,\ \mathbf x \ge 0 . \]
<p>The feasible region is a convex polygon (polytope). A linear objective has no interior optimum, so if an optimum exists, one is at a corner (vertex). The simplex method walks from corner to adjacent better corner until none improves.</p>
<h3>Duality and shadow prices</h3>
<p>Every LP has a dual:</p>
\[ \min\ \mathbf b^\top\mathbf y \quad\text{s.t.}\quad A^\top\mathbf y \ge \mathbf c,\ \mathbf y \ge 0, \]
<p>with equal optimal values (strong duality). The dual value \(y_i\) is the shadow price of constraint i: how much the objective would rise per extra unit of resource \(b_i\), valid within a range. Complementary slackness says \(y_i = 0\) for any constraint with spare capacity: a resource you aren't using up is worth nothing at the margin.</p>
<h3>Reduced costs</h3>
<p>For a product not being made, the reduced cost \(c_j - \mathbf a_j^\top\mathbf y\) is its profit minus the value of the resources it would use. It enters the plan only if its profit rises above that.</p>`,

  "integer-programming": String.raw`
<h3>The model</h3>
\[ \max\ \mathbf c^\top\mathbf x \quad\text{s.t.}\quad A\mathbf x \le \mathbf b,\ \mathbf x \ge 0,\ x_j \in \mathbb Z \text{ for } j \in J . \]
<p>Yes/no decisions are binary variables. A fixed cost F for opening a site is modelled with \(y \in \{0,1\}\) and the link \(x \le M y\): shipments are allowed only if the site is open, and the objective pays \(F y\).</p>
<h3>Branch and bound</h3>
<ol>
<li>Solve the LP relaxation (drop integrality). Its value is an upper bound (for maximisation).</li>
<li>If a variable is fractional, say \(x_j = 2.4\), split into two subproblems with \(x_j \le 2\) and \(x_j \ge 3\).</li>
<li>Any whole-number solution found is a lower bound (incumbent). Prune any branch whose LP bound is no better than the incumbent.</li>
</ol>
<p>The optimality gap \((\text{bound} - \text{incumbent})/\text{incumbent}\) says how far the best solution found could be from optimal.</p>
<h3>Why formulation matters</h3>
<p>A smaller "big M" makes the LP relaxation tighter and the bound closer to the integer optimum, so far fewer branches are needed. Cutting planes (valid inequalities that remove fractional corners but no integer points) do the same.</p>`,

  "simulated-annealing": String.raw`
<h3>The acceptance rule</h3>
<p>From the current solution x, propose a neighbour x′ with cost change \(\Delta = f(x') - f(x)\). Accept it with probability</p>
\[ P(\text{accept}) = \begin{cases} 1 & \Delta \le 0\\ e^{-\Delta/T} & \Delta > 0 \end{cases} \]
<p>At high temperature T almost anything is accepted; as T falls the search becomes greedy.</p>
<h3>Why it works</h3>
<p>At fixed T this is a Metropolis chain whose long-run distribution is \(\pi_T(x) \propto e^{-f(x)/T}\). As \(T \to 0\) that distribution concentrates on the global minima. With a slow enough logarithmic cooling, \(T_k = c/\log(1 + k)\) for large enough c, the search converges to a global optimum (Hajek, 1988), though that schedule is far too slow in practice.</p>
<h3>Practical schedule</h3>
<p>Geometric cooling \(T_{k+1} = \beta T_k\) with β around 0.95 to 0.999. Choose \(T_0\) so that a typical worsening move \(\bar\Delta\) is accepted about 80% of the time: \(T_0 = -\bar\Delta/\ln 0.8\).</p>`,

  "genetic-algorithm": String.raw`
<h3>The loop</h3>
<p>Keep a population of N candidate solutions (bit strings, sequences). Each generation:</p>
<ol>
<li><b>Select</b> parents, e.g. tournament selection: pick k at random, keep the fittest.</li>
<li><b>Cross over</b>: combine two parents, e.g. one-point crossover takes bits 1..c from one and c+1..n from the other.</li>
<li><b>Mutate</b>: flip each bit with small probability \(p_m\), typically about 1/n.</li>
<li><b>Replace</b>, keeping the best few unchanged (elitism).</li>
</ol>
<h3>Selection pressure</h3>
<p>With tournament size k, the best individual wins each tournament it's drawn into, and the chance it is picked for a given tournament is about \(k/N\), so it gets about k copies per generation. Larger k converges faster but risks losing diversity too early.</p>
<h3>The schema theorem</h3>
<p>Holland's schema theorem says short, low-order patterns of above-average fitness grow roughly exponentially:</p>
\[ E[m(H, t+1)] \ge m(H,t)\,\frac{f(H)}{\bar f}\left[1 - p_c\frac{\delta(H)}{n-1} - o(H)\,p_m\right], \]
<p>where m is the count of strings matching schema H, δ its defining length and o its order. Crossover disrupts long schemata, so good encodings keep related decisions close together.</p>`,

  "outliers": String.raw`
<h3>Three rules</h3>
\[ z_i = \frac{x_i - \bar x}{s}, \qquad \text{IQR rule: } x_i &lt; Q_1 - 1.5\,\text{IQR} \text{ or } x_i > Q_3 + 1.5\,\text{IQR}, \qquad z_i^{\text{rob}} = \frac{x_i - \operatorname{med}}{1.4826\,\text{MAD}} . \]
<h3>Why the robust version</h3>
<p>The mean and SD each have breakdown point 0: one extreme value can move them anywhere, and that inflated SD then hides the outlier (masking). With n points, the largest possible ordinary z-score is \((n-1)/\sqrt n\), so in a sample of 10 no point can ever exceed z = 2.85. The median and MAD have breakdown point 50%.</p>
<p>The constant 1.4826 = 1/Φ⁻¹(0.75) makes MAD a consistent estimate of σ for normal data. For normal data the IQR fences sit at about ±2.7σ, flagging about 0.7% of points.</p>
<h3>False alarms at scale</h3>
<p>With a threshold of 3σ, each normal point has a 0.27% chance of being flagged, so among n points expect \(0.0027n\) false flags: about 3 in 1,000. Scale the threshold with n (e.g. \(\Phi^{-1}(1 - 0.025/n)\)) if you want a small chance of any false flag.</p>`,

  "ts-anomalies": String.raw`
<h3>Residual-based detection</h3>
<p>Forecast each point from its past, then score the surprise:</p>
\[ r_t = y_t - \hat y_{t|t-1}, \qquad \text{flag if } |r_t| > k\,\hat\sigma_r . \]
<p>Using a robust \(\hat\sigma_r\) (1.4826 × MAD of residuals) keeps the anomalies from inflating the threshold.</p>
<h3>Why not just threshold the raw values?</h3>
<p>A value can be normal for December but extreme for July. The forecast removes trend and season, so the residual measures how unusual a point is given its context. If the residuals are roughly independent with SD σ, the false-alarm rate per point is \(2(1 - \Phi(k))\): 4.6% at k = 2, 0.27% at k = 3.</p>
<h3>Keeping anomalies out of the model</h3>
<p>If a flagged point is fed straight into the forecaster, the next forecasts shift towards it. Replace flagged values with the forecast (or a winsorised value, \(\hat y \pm k\hat\sigma\)) before updating, so one spike doesn't distort what follows.</p>`,

  "change-points": String.raw`
<h3>CUSUM</h3>
<p>To detect an upward shift in the mean from a target μ₀, accumulate deviations beyond an allowance k (usually half the shift you want to detect, in σ units):</p>
\[ C_t^+ = \max\big(0,\; C_{t-1}^+ + (x_t - \mu_0)/\sigma - k\big), \qquad \text{alarm when } C_t^+ > h . \]
<p>A matching \(C^-\) catches downward shifts. Small persistent shifts build up in C even when no single point looks unusual.</p>
<h3>Why it is efficient</h3>
<p>CUSUM is the sequential log-likelihood ratio test of "mean μ₀" vs "mean μ₁" (Page, 1954). For a shift of δσ, choosing k = δ/2 makes it the fastest detector, on average, for a given false-alarm rate (Lorden, Moustakides). Typical settings k = 0.5, h = 4 or 5 give an in-control average run length of several hundred points.</p>
<h3>Offline: finding where the change happened</h3>
<p>For a single mean change in n points, choose the split τ that minimises the total squared error of two segment means:</p>
\[ \hat\tau = \arg\min_\tau \Big[\sum_{t\le\tau}(x_t - \bar x_{1:\tau})^2 + \sum_{t>\tau}(x_t - \bar x_{\tau+1:n})^2\Big]. \]
<p>Binary segmentation and PELT repeat this with a penalty per change point to find several.</p>`,

  "missing-data": String.raw`
<h3>Three mechanisms</h3>
<ul>
<li><b>MCAR</b> (missing completely at random): P(missing) doesn't depend on any data. Deleting incomplete rows loses information but doesn't bias.</li>
<li><b>MAR</b> (missing at random): P(missing) depends only on observed values. Imputing from the observed variables can remove the bias.</li>
<li><b>MNAR</b> (not at random): P(missing) depends on the missing value itself (e.g. sales missing because of a stock-out). No method using the observed data alone can fully fix it.</li>
</ul>
<h3>What simple fills do to statistics</h3>
<p>Replacing m of n values by the mean leaves the mean unchanged but shrinks the variance: the new sample variance is about \(\frac{n - m - 1}{n - 1}s^2\). Correlations with other variables are pulled towards 0 for the same reason. Interpolation in a time series smooths out real variation in the gap.</p>
<h3>Multiple imputation</h3>
<p>Fill the gaps m times with random draws from a model of the missing values, analyse each completed dataset, and combine with Rubin's rules:</p>
\[ \bar Q = \frac1m\sum Q_i, \qquad T = \bar U + \left(1 + \tfrac1m\right)B, \]
<p>where \(\bar U\) is the average within-imputation variance and B the variance between the m estimates. The extra B term is the uncertainty single imputation ignores.</p>`,

  "distributions": String.raw`
<h3>Common shapes and where they come from</h3>
<ul>
<li><b>Normal</b> \(N(\mu,\sigma^2)\): sums of many small independent effects (central limit theorem).</li>
<li><b>Log-normal</b>: products of many small independent effects; \(\log X\) is normal. Mean \(e^{\mu + \sigma^2/2}\), median \(e^\mu\), so mean > median.</li>
<li><b>Poisson</b>(λ): counts of independent rare events; mean = variance = λ. Overdispersed counts (variance > mean) suggest a negative binomial.</li>
<li><b>Exponential</b>/<b>gamma</b>: waiting times; exponential is memoryless, \(P(T > s + t \mid T > s) = P(T > t)\).</li>
</ul>
<h3>Q-Q plots</h3>
<p>Plot sorted data \(x_{(i)}\) against theoretical quantiles \(F^{-1}\!\left(\frac{i - 0.5}{n}\right)\). If the data come from F (up to location and scale), the points lie on a straight line whose intercept and slope estimate μ and σ. Curving up at the right end means a heavier right tail than F.</p>
<h3>Skewness and the log transform</h3>
<p>Skewness \(g_1 = \frac{\frac1n\sum(x_i - \bar x)^3}{s^3}\). Taking logs turns multiplicative variation into additive variation: if a series' SD grows in proportion to its level, the log has constant SD. Box–Cox generalises this with \(y^{(\lambda)} = (y^\lambda - 1)/\lambda\), which tends to log y as λ → 0.</p>`,

  "correlation-traps": String.raw`
<h3>Pearson correlation</h3>
\[ r = \frac{\sum (x_i - \bar x)(y_i - \bar y)}{\sqrt{\sum (x_i-\bar x)^2\sum (y_i - \bar y)^2}} . \]
<p>It measures only straight-line association. \(y = x^2\) on a symmetric range has r = 0 despite perfect dependence.</p>
<h3>One point can make or break it</h3>
<p>r is built from products of deviations, so one far point with large deviations in both x and y can dominate both numerator and denominator. Spearman's correlation (Pearson on ranks) caps each point's influence; for no ties it is \(1 - \frac{6\sum d_i^2}{n(n^2 - 1)}\).</p>
<h3>Spurious correlation between trends</h3>
<p>Two independent random walks are correlated by chance far more than white noise would be: the sample r doesn't shrink towards 0 as n grows, and |r| above 0.5 is common. Granger and Newbold showed regressions of one on the other give "significant" t-statistics most of the time. Correlate the changes (\(\Delta x_t, \Delta y_t\)) instead.</p>
<h3>Hidden groups (Simpson's paradox)</h3>
<p>The overall correlation mixes within-group and between-group parts. With group means \(\bar x_g, \bar y_g\), the total covariance is</p>
\[ \operatorname{Cov}(x,y) = E_g[\operatorname{Cov}(x,y \mid g)] + \operatorname{Cov}(\bar x_g, \bar y_g), \]
<p>so the between-group term can have the opposite sign and swamp the within-group relationship.</p>`,

  "benford": String.raw`
<h3>The law</h3>
<p>The probability that the leading digit is d is</p>
\[ P(d) = \log_{10}\!\left(1 + \frac1d\right), \qquad d = 1, \dots, 9 , \]
<p>so 30.1% start with 1 and only 4.6% with 9.</p>
<h3>Why it happens</h3>
<p>Write \(x = 10^{k + u}\) with \(u \in [0, 1)\). The leading digit is d when \(\log_{10} d \le u &lt; \log_{10}(d+1)\). If u is spread evenly over [0, 1), which happens for data spanning several orders of magnitude or made by multiplying many factors, the probability is \(\log_{10}(d+1) - \log_{10} d\). The law is also the only digit distribution that doesn't change when every value is multiplied by the same constant (scale invariance), so it holds whatever the currency.</p>
<h3>Testing</h3>
<p>With observed counts \(O_d\) out of n and expected \(E_d = nP(d)\):</p>
\[ \chi^2 = \sum_{d=1}^{9}\frac{(O_d - E_d)^2}{E_d} \sim \chi^2_8 . \]
<p>With large n even tiny, harmless deviations become significant, so auditors often use the mean absolute deviation of proportions instead, with conformity thresholds around 0.006 to 0.015 for first digits.</p>`,

  "isolation-forest": String.raw`
<h3>Isolation by random cuts</h3>
<p>Build a tree by repeatedly choosing a random feature and a random split value between its min and max, until each point is alone. Outliers sit in sparse regions, so they are isolated after few cuts; normal points need many. Let \(h(x)\) be the depth at which x is isolated.</p>
<h3>The anomaly score</h3>
<p>Average \(h(x)\) over many trees, each built on a subsample of size ψ (typically 256), and normalise by the average path length of an unsuccessful search in a binary search tree:</p>
\[ c(\psi) = 2H(\psi - 1) - \frac{2(\psi - 1)}{\psi}, \qquad H(i) \approx \ln i + 0.5772, \]
\[ s(x) = 2^{-E[h(x)]/c(\psi)} . \]
<p>s near 1 means very easy to isolate (anomalous); s well below 0.5 means normal; all points near 0.5 means no clear anomalies.</p>
<h3>Why subsample</h3>
<p>Small subsamples reduce masking (a cluster of anomalies shielding each other) and swamping (normal points near anomalies being flagged), and make the method run in time roughly linear in n.</p>`,

  "pca-clustering": String.raw`
<h3>Principal components</h3>
<p>Centre (and usually standardise) the data matrix X. The covariance is \(\Sigma = \frac{1}{n-1}X^\top X\). Its eigenvectors \(\mathbf v_k\) are the principal directions and its eigenvalues \(\lambda_k\) the variance along each:</p>
\[ \Sigma\mathbf v_k = \lambda_k\mathbf v_k, \qquad \text{share explained} = \frac{\lambda_k}{\sum_j\lambda_j}. \]
<p>The first component solves \(\max_{\|\mathbf v\|=1}\mathbf v^\top\Sigma\mathbf v\): the direction with the most spread. Each later one is the best direction at right angles to those before. Scores \(X\mathbf v_k\) are the data in the new coordinates.</p>
<h3>k-means</h3>
<p>Choose k centres to minimise the within-cluster sum of squares</p>
\[ W = \sum_{j=1}^{k}\sum_{i \in C_j}\|\mathbf x_i - \boldsymbol\mu_j\|^2 . \]
<p>Lloyd's algorithm alternates: assign each point to its nearest centre, then move each centre to its cluster's mean. Neither step can increase W, so it converges, but only to a local minimum: run it from several starts (k-means++ seeding helps).</p>
<h3>Choosing k</h3>
<p>W always falls as k grows. Look for an elbow, or use the silhouette \(s_i = \frac{b_i - a_i}{\max(a_i, b_i)}\), where \(a_i\) is the average distance to the point's own cluster and \(b_i\) to the nearest other cluster.</p>`,
});
