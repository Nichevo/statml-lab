// "Show the maths" panels for the machine learning pages.
Object.assign(Lab.maths, {
  "logistic-regression": String.raw`
<h3>The model</h3>
\[ P(y = 1 \mid \mathbf x) = \sigma(\mathbf w^\top\mathbf x + b) = \frac{1}{1 + e^{-(\mathbf w^\top\mathbf x + b)}}, \qquad \log\frac{p}{1-p} = \mathbf w^\top\mathbf x + b . \]
<p>Each coefficient is a change in log-odds: increasing \(x_j\) by 1 multiplies the odds by \(e^{w_j}\).</p>
<h3>Fitting: log loss</h3>
<p>Maximise the Bernoulli likelihood, i.e. minimise</p>
\[ \mathcal L = -\sum_i \big[y_i\log p_i + (1 - y_i)\log(1 - p_i)\big]. \]
<p>Because \(\sigma'(z) = \sigma(z)(1 - \sigma(z))\), the gradient is remarkably simple:</p>
\[ \nabla_{\mathbf w}\mathcal L = \sum_i (p_i - y_i)\,\mathbf x_i . \]
<p>The loss is convex, so gradient descent (or Newton's method, iteratively reweighted least squares) finds the global minimum. If the classes are perfectly separable, the weights grow without limit; regularisation fixes that.</p>
<h3>The confusion matrix</h3>
<p>At threshold c, predict 1 when \(p \ge c\). With TP, FP, TN, FN counts:</p>
\[ \text{precision} = \frac{TP}{TP+FP}, \quad \text{recall} = \frac{TP}{TP+FN}, \quad \text{specificity} = \frac{TN}{TN+FP}, \quad F_1 = \frac{2\cdot\text{prec}\cdot\text{rec}}{\text{prec} + \text{rec}} . \]
<p>If a false positive costs \(C_{FP}\) and a false negative \(C_{FN}\), and p is well calibrated, the cost-minimising threshold is \(c^* = \frac{C_{FP}}{C_{FP} + C_{FN}}\).</p>
<h3>ROC AUC</h3>
<p>AUC equals the probability that a random positive gets a higher score than a random negative, the same quantity as the Mann–Whitney U statistic divided by \(n_+ n_-\).</p>`,

  "bias-variance": String.raw`
<h3>The decomposition</h3>
<p>Data come from \(y = f(x) + \varepsilon\) with \(E[\varepsilon] = 0\), \(\operatorname{Var}(\varepsilon) = \sigma^2\). A model \(\hat f\) is fitted to a random training set. At a point x, expected squared error over training sets and noise is</p>
\[ E\big[(y - \hat f(x))^2\big] = \underbrace{\big(f(x) - E[\hat f(x)]\big)^2}_{\text{bias}^2} + \underbrace{E\big[(\hat f(x) - E[\hat f(x)])^2\big]}_{\text{variance}} + \underbrace{\sigma^2}_{\text{noise}} . \]
<p>Proof: add and subtract \(E[\hat f(x)]\) inside the square; the cross terms have zero expectation because ε is independent of the training set and \(\hat f - E[\hat f]\) has mean 0.</p>
<h3>The trade-off</h3>
<p>Flexible models (high-degree polynomials, deep trees) have low bias but high variance: they change a lot from one training sample to the next. Simple ones have the reverse. For polynomial regression with p coefficients and n points, the average variance over the training points is about \(\sigma^2 p/n\), so variance grows linearly with model size.</p>
<h3>Training vs test error</h3>
<p>For least squares with p parameters, the expected training error is \(\sigma^2(1 - p/n)\) and the expected test error at the same x's is \(\sigma^2(1 + p/n)\) (if the model is correct). The gap, \(2\sigma^2p/n\), is optimism; AIC and Mallows' \(C_p\) add it back to the training error.</p>`,

  "cross-validation": String.raw`
<h3>k-fold</h3>
<p>Split the data into k folds. For each fold j, fit on the other k − 1 and compute error \(E_j\) on fold j:</p>
\[ \text{CV}_k = \frac1k\sum_{j=1}^{k}E_j, \qquad \operatorname{SE} \approx \frac{s_E}{\sqrt k}. \]
<p>Each model is fitted on a fraction (k − 1)/k of the data, so CV estimates the error of a slightly smaller training set: a small upward bias, largest for k = 2.</p>
<h3>Leave-one-out for linear smoothers</h3>
<p>For least squares and other models with \(\hat{\mathbf y} = H\mathbf y\), LOOCV needs no refitting:</p>
\[ \text{CV}_{(n)} = \frac1n\sum_{i=1}^{n}\left(\frac{y_i - \hat y_i}{1 - h_{ii}}\right)^2 . \]
<p>High-leverage points get their residuals inflated most, because removing them changes the fit most.</p>
<h3>Choosing k</h3>
<p>LOOCV is nearly unbiased but its n fits are highly correlated, so its estimate can be variable; k = 5 or 10 is a good compromise. For time series, use rolling-origin evaluation instead, since random folds let the model see the future.</p>
<h3>Selection bias</h3>
<p>The CV error of the model you picked as best is optimistic: you chose the minimum of several noisy estimates. Nested CV (an outer loop to score, an inner loop to tune) gives an honest estimate.</p>`,

  "gradient-descent": String.raw`
<h3>The update</h3>
\[ \boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \eta\,\nabla L(\boldsymbol\theta_t). \]
<p>The gradient points uphill, so a small step against it lowers the loss: by Taylor's theorem \(L(\theta - \eta\nabla L) \approx L(\theta) - \eta\|\nabla L\|^2\).</p>
<h3>Step size and curvature</h3>
<p>On a quadratic \(L = \tfrac12\boldsymbol\theta^\top A\boldsymbol\theta\) with eigenvalues \(\lambda_{\min} \le \dots \le \lambda_{\max}\), each eigen-direction shrinks by a factor \(|1 - \eta\lambda_i|\) per step. So:</p>
<ul>
<li>Convergence needs \(\eta &lt; 2/\lambda_{\max}\); larger steps overshoot and diverge.</li>
<li>With the best fixed step, error shrinks by \(\frac{\kappa - 1}{\kappa + 1}\) per step, where \(\kappa = \lambda_{\max}/\lambda_{\min}\) is the condition number. Long, narrow valleys (large κ) mean slow zig-zagging, which is why features are standardised.</li>
</ul>
<h3>Momentum</h3>
\[ \mathbf v_{t+1} = \beta\mathbf v_t + \nabla L(\boldsymbol\theta_t), \qquad \boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \eta\,\mathbf v_{t+1}. \]
<p>Consistent gradients add up (an effective step of \(\eta/(1-\beta)\)) while zig-zag components cancel. With well-tuned momentum the rate improves to about \(\frac{\sqrt\kappa - 1}{\sqrt\kappa + 1}\).</p>
<h3>Stochastic gradient descent</h3>
<p>Using a mini-batch gradient gives an unbiased but noisy estimate of the full gradient. To converge, the step size must shrink: \(\sum\eta_t = \infty\) and \(\sum\eta_t^2 &lt; \infty\) (e.g. \(\eta_t \propto 1/t\)).</p>`,

  "decision-tree": String.raw`
<h3>Choosing a split</h3>
<p>For a node with class shares \(p_k\), impurity is measured by</p>
\[ \text{Gini} = 1 - \sum_k p_k^2, \qquad \text{entropy} = -\sum_k p_k\log_2 p_k . \]
<p>A split into left and right children with \(n_L, n_R\) points is scored by the drop in weighted impurity:</p>
\[ \Delta = I(\text{parent}) - \frac{n_L}{n}I(L) - \frac{n_R}{n}I(R). \]
<p>The tree greedily picks the feature and threshold with the largest Δ, then repeats in each child. For regression, impurity is the variance (sum of squared errors), and each leaf predicts its mean.</p>
<h3>Why greedy, and why it overfits</h3>
<p>Finding the best tree overall is NP-hard, so trees are grown one split at a time. Grown to purity, a tree memorises the training data: each leaf may hold a single point, so variance is very high.</p>
<h3>Cost-complexity pruning</h3>
<p>For a tree T with |T| leaves, minimise</p>
\[ R_\alpha(T) = R(T) + \alpha\,|T|, \]
<p>where R is training error. As α increases, weakest-link pruning removes the branch whose removal increases error least per leaf removed, giving a nested sequence of subtrees; α is chosen by cross-validation.</p>`,

  "random-forest": String.raw`
<h3>Bagging</h3>
<p>Fit B trees on bootstrap samples (n draws with replacement) and average their predictions. If each tree has variance σ² and the trees' predictions have pairwise correlation ρ:</p>
\[ \operatorname{Var}\!\left(\frac1B\sum_b \hat f_b(x)\right) = \rho\,\sigma^2 + \frac{1 - \rho}{B}\,\sigma^2 . \]
<p>More trees remove the second term, but the first remains. Averaging doesn't raise bias, so deep, low-bias trees are used.</p>
<h3>Random feature subsets</h3>
<p>At each split, only m randomly chosen features (often \(\sqrt p\) for classification, p/3 for regression) are considered. That decorrelates the trees (lowers ρ), so the average has lower variance than bagging alone.</p>
<h3>Out-of-bag error</h3>
<p>Each bootstrap sample leaves out about</p>
\[ \left(1 - \frac1n\right)^n \to e^{-1} \approx 36.8\% \]
<p>of the points. Predicting each point using only the trees that didn't see it gives a free, nearly unbiased estimate of test error.</p>
<h3>Feature importance</h3>
<p>Permutation importance: shuffle one feature's values in the out-of-bag data and measure how much the error rises. Impurity-based importance (total Δ from splits on a feature) is biased towards features with many possible split points.</p>`,

  "gradient-boosting": String.raw`
<h3>Boosting as gradient descent in function space</h3>
<p>Start with a constant \(F_0 = \arg\min_c\sum L(y_i, c)\). At stage m:</p>
<ol>
<li>Compute pseudo-residuals \(r_{im} = -\frac{\partial L(y_i, F)}{\partial F}\Big|_{F = F_{m-1}(x_i)}\).</li>
<li>Fit a small tree \(h_m\) to the \(r_{im}\).</li>
<li>Update \(F_m(x) = F_{m-1}(x) + \nu\,h_m(x)\), with learning rate ν (e.g. 0.1).</li>
</ol>
<h3>Pseudo-residuals for common losses</h3>
<ul>
<li>Squared error \(\tfrac12(y - F)^2\): \(r = y - F\), the ordinary residual.</li>
<li>Absolute error: \(r = \operatorname{sign}(y - F)\).</li>
<li>Log loss for classification (F is log-odds): \(r = y - \sigma(F)\).</li>
<li>Pinball loss at τ: \(r = \tau\) if \(y > F\), else \(\tau - 1\).</li>
</ul>
<h3>Why shrink</h3>
<p>A small ν with more trees generalises better than a big ν with few: each tree corrects only part of the error, so no single tree's noise dominates. Number of trees and ν trade off and are tuned together, usually with early stopping on validation error.</p>
<h3>XGBoost's second-order step</h3>
<p>With gradients \(g_i\) and second derivatives \(h_i\), the optimal value for a leaf with point set I and L2 penalty λ is</p>
\[ w^* = -\frac{\sum_{i\in I}g_i}{\sum_{i\in I}h_i + \lambda} . \]`,

  "shap": String.raw`
<h3>Shapley values</h3>
<p>For a prediction f(x) and feature set N (size n), the contribution of feature i is its average marginal effect over all orders in which features could be added:</p>
\[ \phi_i = \sum_{S \subseteq N\setminus\{i\}}\frac{|S|!\,(n - |S| - 1)!}{n!}\Big[v(S\cup\{i\}) - v(S)\Big], \]
<p>where \(v(S) = E[f(X) \mid X_S = x_S]\) is the expected prediction when only the features in S are known.</p>
<h3>Why these weights</h3>
<p>Shapley proved this is the only allocation satisfying four properties: efficiency (\(\sum_i\phi_i = f(x) - E[f(X)]\), so contributions add up to the gap from the average prediction), symmetry (features with identical effects get equal credit), dummy (a feature that never changes anything gets 0) and additivity (for a sum of models the values add).</p>
<h3>Special cases</h3>
<ul>
<li>Linear model with independent features: \(\phi_i = w_i\,(x_i - E[X_i])\).</li>
<li>Two features with an interaction: the interaction effect is split equally between them.</li>
</ul>
<h3>Computing it</h3>
<p>The sum has \(2^{n-1}\) terms per feature. Kernel SHAP samples coalitions and solves a weighted regression; TreeSHAP computes exact values for tree models in polynomial time, \(O(TLD^2)\) for T trees with L leaves and depth D.</p>`,

  "neural-net": String.raw`
<h3>The perceptron</h3>
<p>Output \(\hat y = \mathbf 1\{\mathbf w^\top\mathbf x + b > 0\}\). Update on each mistake: \(\mathbf w \leftarrow \mathbf w + \eta\,(y - \hat y)\,\mathbf x\). If the classes are linearly separable with margin γ and \(\|\mathbf x\| \le R\), it makes at most \((R/\gamma)^2\) mistakes (Novikoff). XOR is not separable, so a single perceptron can never learn it.</p>
<h3>A hidden layer</h3>
\[ \mathbf h = \sigma(W_1\mathbf x + \mathbf b_1), \qquad \hat{\mathbf y} = \sigma(W_2\mathbf h + \mathbf b_2). \]
<p>The universal approximation theorem says one hidden layer with enough units can approximate any continuous function on a bounded region arbitrarily well; depth makes many functions far cheaper to represent.</p>
<h3>Backpropagation</h3>
<p>With squared error \(L = \tfrac12\|\hat{\mathbf y} - \mathbf y\|^2\) and sigmoid units, define the output error \(\boldsymbol\delta_2 = (\hat{\mathbf y} - \mathbf y)\odot\hat{\mathbf y}\odot(1 - \hat{\mathbf y})\). The chain rule gives</p>
\[ \frac{\partial L}{\partial W_2} = \boldsymbol\delta_2\,\mathbf h^\top, \qquad \boldsymbol\delta_1 = (W_2^\top\boldsymbol\delta_2)\odot\mathbf h\odot(1 - \mathbf h), \qquad \frac{\partial L}{\partial W_1} = \boldsymbol\delta_1\,\mathbf x^\top . \]
<p>Errors flow backwards through the same weights used going forwards. Each layer's gradient costs about the same as its forward pass, so one gradient costs about two forward passes.</p>
<h3>Initialisation</h3>
<p>Weights start small and random to break symmetry: if all were equal, every hidden unit would get the same gradient and stay identical forever.</p>`,

  "cnn": String.raw`
<h3>Convolution</h3>
<p>A k × k filter K slides over the image I:</p>
\[ (I * K)_{ij} = \sum_{u=0}^{k-1}\sum_{v=0}^{k-1} I_{i+u,\,j+v}\,K_{uv} + b . \]
<p>(Strictly this is cross-correlation; deep learning libraries call it convolution.) With input size n, padding p and stride s, the output size is \(\lfloor (n + 2p - k)/s\rfloor + 1\).</p>
<h3>Why it works for images</h3>
<ul>
<li><b>Weight sharing</b>: the same filter is used everywhere, so a 3 × 3 filter has 9 weights however big the image. A fully connected layer from a 28 × 28 image to 28 × 28 outputs would need 614,656.</li>
<li><b>Translation equivariance</b>: shifting the input shifts the feature map by the same amount, so a pattern is detected wherever it appears.</li>
<li><b>Hierarchy</b>: each layer's receptive field grows. After L layers of 3 × 3 filters (stride 1), each unit sees a \((2L + 1)\times(2L + 1)\) patch, so later layers respond to larger shapes.</li>
</ul>
<h3>Pooling and the classifier</h3>
<p>Max pooling over 2 × 2 blocks keeps the strongest response and halves each dimension, making the features tolerant of small shifts. The final feature maps are flattened and passed to a fully connected layer with a softmax:</p>
\[ P(\text{class } c) = \frac{e^{z_c}}{\sum_j e^{z_j}} . \]
<h3>1-D convolution on demand</h3>
<p>On a time series, a filter of length k is a learned weighted moving window: \(\sum_u y_{t-u}K_u\). A moving average is the special case \(K_u = 1/k\).</p>`,

  "knn": String.raw`
<h3>The rule</h3>
<p>Find the k training points nearest to x (usually by Euclidean distance on standardised features). Classify by majority vote; for regression, average their values:</p>
\[ \hat f(x) = \frac1k\sum_{i \in N_k(x)} y_i . \]
<h3>Bias and variance</h3>
<p>For regression with noise σ², the variance of the average is \(\sigma^2/k\). Bias comes from neighbours being some distance away: the larger k, the wider the neighbourhood and the more the true function changes across it. So small k overfits (k = 1 has zero training error) and large k underfits.</p>
<h3>How good can 1-NN be?</h3>
<p>Cover and Hart (1967) proved that as n → ∞, the 1-nearest-neighbour error rate is at most twice the Bayes error (the best possible): \(R^* \le R_{1NN} \le 2R^*(1 - R^*)\) for two classes. With k → ∞ and k/n → 0, k-NN reaches the Bayes error.</p>
<h3>The curse of dimensionality</h3>
<p>In p dimensions, to capture a fraction r of uniformly spread data, a cube neighbourhood needs side \(r^{1/p}\). For 1% of the data in 10 dimensions, that is \(0.01^{0.1} = 0.63\) of each feature's range: "local" neighbourhoods are no longer local. Distances also concentrate: the nearest and farthest points become almost equally far away, so feature selection matters.</p>
<h3>Scaling</h3>
<p>Distance adds squared differences across features, so a feature measured in thousands swamps one measured in units. Standardise each feature: \(z = (x - \bar x)/s\).</p>`,

  "naive-bayes": String.raw`
<h3>The model</h3>
<p>Bayes' rule with the "naive" assumption that features are independent given the class:</p>
\[ P(c \mid x_1, \dots, x_p) \propto P(c)\prod_{j=1}^{p}P(x_j \mid c). \]
<p>Work in logs to avoid underflow: score \(\log P(c) + \sum_j\log P(x_j\mid c)\) and pick the largest.</p>
<h3>Multinomial naive Bayes for text</h3>
<p>With word counts \(n_{wc}\) in class c and vocabulary size V, Laplace (add-one) smoothing gives</p>
\[ P(w \mid c) = \frac{n_{wc} + 1}{\sum_{w'} n_{w'c} + V}. \]
<p>Without smoothing, one unseen word gives probability 0 and wipes out all other evidence.</p>
<h3>Why it works despite the wrong assumption</h3>
<p>Words are not independent, so the probabilities are badly overconfident (pushed towards 0 or 1). But classification only needs the right class to have the highest score. Domingos and Pazzani showed the decision can be optimal even when independence fails, as long as the errors don't flip the ranking. Its decision boundary is linear in the word counts: \(\log\frac{P(c_1\mid x)}{P(c_2\mid x)} = b + \sum_w n_w\log\frac{P(w\mid c_1)}{P(w\mid c_2)}\), the same form as logistic regression.</p>
<h3>Gaussian naive Bayes</h3>
<p>For numeric features, \(P(x_j\mid c) = N(x_j;\mu_{jc}, \sigma_{jc}^2)\), with means and variances estimated per class.</p>`,

  "svm": String.raw`
<h3>Maximum margin</h3>
<p>For labels \(y_i \in \{-1, +1\}\), the distance from point i to the line \(\mathbf w^\top\mathbf x + b = 0\) is \(y_i(\mathbf w^\top\mathbf x_i + b)/\|\mathbf w\|\). Scaling so the closest points have \(y_i(\mathbf w^\top\mathbf x_i + b) = 1\) makes the margin \(2/\|\mathbf w\|\), so maximising it means</p>
\[ \min_{\mathbf w, b}\ \tfrac12\|\mathbf w\|^2 \quad\text{s.t.}\quad y_i(\mathbf w^\top\mathbf x_i + b) \ge 1 . \]
<h3>Soft margin</h3>
<p>Allow violations with slack \(\xi_i \ge 0\) at cost C:</p>
\[ \min\ \tfrac12\|\mathbf w\|^2 + C\sum_i\xi_i \quad\text{s.t.}\quad y_i(\mathbf w^\top\mathbf x_i + b) \ge 1 - \xi_i . \]
<p>Equivalently, minimise the hinge loss \(\sum_i\max(0, 1 - y_if(\mathbf x_i))\) plus \(\tfrac{1}{2C}\|\mathbf w\|^2\). Small C gives a wide, tolerant margin; large C fits the training points tightly.</p>
<h3>The kernel trick</h3>
<p>The dual problem and the prediction depend on the data only through dot products:</p>
\[ f(\mathbf x) = \sum_i\alpha_i y_i\,\mathbf x_i^\top\mathbf x + b . \]
<p>Replacing \(\mathbf x_i^\top\mathbf x\) by a kernel \(K(\mathbf x_i, \mathbf x)\), such as the RBF kernel \(e^{-\gamma\|\mathbf x_i - \mathbf x\|^2}\), fits a linear boundary in a high-dimensional feature space without ever computing it. Only points with \(\alpha_i > 0\), the support vectors, affect the boundary.</p>`,

  "model-zoo": String.raw`
<h3>Comparing classifiers fairly</h3>
<p>All models are trained on the same training set and scored on the same untouched test set. With test accuracy \(\hat a\) on n points, its standard error is about \(\sqrt{\hat a(1 - \hat a)/n}\): on 200 points, two models 3 percentage points apart are within noise.</p>
<h3>Paired comparison: McNemar's test</h3>
<p>Count test points where model A is right and B wrong (\(n_{10}\)) and the reverse (\(n_{01}\)). Points both get right or both get wrong say nothing about which is better. Under "equally good",</p>
\[ \chi^2 = \frac{(|n_{10} - n_{01}| - 1)^2}{n_{10} + n_{01}} \sim \chi^2_1 . \]
<h3>What each model's boundary looks like</h3>
<ul>
<li>Logistic regression, linear SVM, naive Bayes (Gaussian, equal variances): straight-line boundaries.</li>
<li>Gaussian naive Bayes with unequal variances, quadratic discriminant: curved (quadratic) boundaries.</li>
<li>Trees: axis-aligned staircases; forests and boosting: smoothed staircases.</li>
<li>k-NN, RBF SVM, neural networks: flexible boundaries whose smoothness is set by k, γ and C, or network size.</li>
</ul>
<h3>No free lunch</h3>
<p>Averaged over all possible problems, no classifier beats any other (Wolpert, 1996). A model wins on a given problem only because its assumptions suit that problem's structure.</p>`,

  "imbalanced-calibration": String.raw`
<h3>Why accuracy misleads</h3>
<p>With 2% positives, predicting "no" for everything is 98% accurate. Use precision, recall, PR AUC or cost instead. The PR curve's baseline is the positive rate (0.02), whereas ROC's baseline is 0.5, so ROC can look good even when precision is poor.</p>
<h3>Reweighting and resampling</h3>
<p>Weighting class 1 by w in the loss, \(\sum_i w^{y_i}\,\ell(y_i, p_i)\), has the same effect on the optimal decision as moving the threshold. Oversampling positives (or undersampling negatives) by a factor k shifts predicted log-odds by \(\log k\); correct the probabilities afterwards:</p>
\[ p_{\text{true}} = \frac{p/k}{p/k + (1 - p)} . \]
<h3>Calibration</h3>
<p>A model is calibrated if, among cases scored p, a share p are positive. Measure with a reliability curve or the Brier score \(\frac1n\sum(p_i - y_i)^2\), which decomposes into calibration error minus resolution plus uncertainty.</p>
<ul>
<li><b>Platt scaling</b>: fit \(p' = \sigma(a\,s + b)\) to the scores s on held-out data.</li>
<li><b>Isotonic regression</b>: fit the best non-decreasing step function from scores to outcomes (pool adjacent violators). More flexible, needs more data.</li>
</ul>
<h3>The best threshold</h3>
<p>With calibrated probabilities, flag a case when the expected cost of not flagging exceeds that of flagging: \(p\,C_{FN} > (1 - p)\,C_{FP}\), i.e. \(p > \frac{C_{FP}}{C_{FP} + C_{FN}}\).</p>`,

  "feature-engineering": String.raw`
<h3>Lags, rolling and calendar features</h3>
<p>For demand \(y_t\): lags \(y_{t-1}, y_{t-7}, y_{t-364}\); rolling means \(\frac1w\sum_{j=1}^{w}y_{t-j}\); calendar indicators (day of week, month, holidays). Cyclical features such as day of year are often encoded as \(\sin(2\pi d/365), \cos(2\pi d/365)\) so that 31 December and 1 January are close.</p>
<h3>Target encoding</h3>
<p>Replace a high-cardinality category c by a smoothed mean of the target:</p>
\[ \text{enc}(c) = \frac{n_c\,\bar y_c + m\,\bar y}{n_c + m}, \]
<p>shrinking rare categories (small \(n_c\)) towards the overall mean with strength m. It must be computed out of fold, or each row's own target leaks into its feature.</p>
<h3>Leakage</h3>
<p>A feature leaks if it uses information not available at prediction time. The test is simple: for a prediction made at time t, every feature must be computable from data up to t only. Typical leaks: rolling windows that include the current period, scaling with statistics from the whole dataset, target encodings computed on all rows, and variables recorded after the outcome (e.g. "refund issued" when predicting returns).</p>
<h3>Why leaks are so tempting</h3>
<p>A leaked feature is often almost perfectly correlated with the target in the training and test data, so cross-validated scores look excellent. Only a time-respecting backtest, or real deployment, reveals the gap.</p>`,

  "hyperparameter-tuning": String.raw`
<h3>Search strategies</h3>
<ul>
<li><b>Grid search</b> tries every combination: \(\prod_j m_j\) fits for \(m_j\) values of each of the hyperparameters.</li>
<li><b>Random search</b> samples combinations. If only a few hyperparameters matter, random search tries many more distinct values of each one. With n random trials, the chance that at least one lands in the best 5% of the space is \(1 - 0.95^n\): 60 trials give 95%.</li>
<li><b>Bayesian optimisation</b> fits a surrogate model of score vs settings and picks the next trial to balance exploring uncertain regions with exploiting good ones.</li>
</ul>
<h3>Partial dependence</h3>
<p>The partial dependence of the prediction on feature \(x_S\) averages over the other features \(x_C\) in the data:</p>
\[ \hat f_S(x_S) = \frac1n\sum_{i=1}^{n}\hat f(x_S, x_{C,i}). \]
<p>Individual conditional expectation (ICE) curves plot \(\hat f(x_S, x_{C,i})\) for each i separately; the PDP is their average. If ICE curves cross or fan out, the feature interacts with others, and the average hides it.</p>
<h3>A caution</h3>
<p>PDPs evaluate the model at combinations that may never occur (e.g. very high temperature in winter). With strongly correlated features, accumulated local effects (ALE) plots, which only use nearby data, are more reliable.</p>`,

  "model-drift": String.raw`
<h3>Kinds of drift</h3>
<p>Write the joint distribution as \(P(\mathbf x, y) = P(y\mid\mathbf x)\,P(\mathbf x)\).</p>
<ul>
<li><b>Data (covariate) drift</b>: \(P(\mathbf x)\) changes, \(P(y\mid\mathbf x)\) doesn't. The model may still be right, but is now used where it saw little data.</li>
<li><b>Concept drift</b>: \(P(y\mid\mathbf x)\) changes. The relationship itself is different and the model is wrong even on familiar inputs.</li>
</ul>
<h3>Population stability index</h3>
<p>Bin a feature (or the model score), with expected shares \(e_b\) from training and actual shares \(a_b\) now:</p>
\[ \text{PSI} = \sum_b (a_b - e_b)\ln\frac{a_b}{e_b} . \]
<p>This is a symmetrised Kullback–Leibler divergence. Rules of thumb: below 0.1 stable, 0.1 to 0.25 worth watching, above 0.25 a significant shift.</p>
<h3>Watching performance</h3>
<p>When labels arrive, track the error on a rolling window and alarm with CUSUM or a control chart on the errors. A one-sided CUSUM on squared errors, \(S_t = \max(0, S_{t-1} + e_t^2 - \bar e^2 - k)\), catches gradual degradation that a single bad week would not reveal.</p>
<h3>Retraining</h3>
<p>Periodic retraining on a sliding window adapts to drift but forgets stable patterns; weighting recent data, \(w_t = \lambda^{T - t}\), is a compromise with an effective memory of \(1/(1-\lambda)\) periods.</p>`,

  "attention": String.raw`
<h3>Scaled dot-product attention</h3>
<p>Each position has a query \(\mathbf q\), key \(\mathbf k\) and value \(\mathbf v\), all learned linear maps of its embedding: \(Q = XW_Q,\ K = XW_K,\ V = XW_V\).</p>
\[ \text{Attention}(Q, K, V) = \operatorname{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V . \]
<p>Row i of the softmax gives weights \(a_{ij} \ge 0\) summing to 1: how much position i draws from each position j. The output is the weighted average of the value vectors.</p>
<h3>Why divide by √d_k</h3>
<p>If query and key entries are independent with mean 0 and variance 1, their dot product has variance \(d_k\). Large scores push the softmax into near one-hot outputs where its gradients vanish. Dividing by \(\sqrt{d_k}\) keeps the score variance at 1.</p>
<h3>Causal masking</h3>
<p>For text generation, position i must not see later positions. Setting \(s_{ij} = -\infty\) for j > i before the softmax gives those positions zero weight.</p>
<h3>Multi-head</h3>
<p>h heads each attend in a smaller space \(d_k = d/h\), with their own \(W_Q, W_K, W_V\); outputs are concatenated and mixed by \(W_O\). Different heads can track different relationships (the previous word, the subject of a verb). The cost is \(O(n^2 d)\) for n positions, which is why long contexts are expensive.</p>`,

  "transformer": String.raw`
<h3>One block</h3>
\[ \begin{aligned} \mathbf h &= \mathbf x + \text{MultiHeadAttn}(\text{LN}(\mathbf x))\\ \mathbf y &= \mathbf h + \text{FFN}(\text{LN}(\mathbf h)), \qquad \text{FFN}(\mathbf z) = W_2\,\text{GELU}(W_1\mathbf z + \mathbf b_1) + \mathbf b_2 \end{aligned} \]
<p>with layer normalisation \(\text{LN}(\mathbf z) = \boldsymbol\gamma\odot\frac{\mathbf z - \mu}{\sqrt{\sigma^2 + \epsilon}} + \boldsymbol\beta\) over the features of each position. The FFN hidden size is usually 4d.</p>
<h3>Why residual connections</h3>
<p>Each sublayer adds a correction to its input rather than replacing it. The gradient of \(\mathbf x + F(\mathbf x)\) is \(I + \partial F/\partial\mathbf x\), so even through many blocks there is a direct path for gradients, which makes deep stacks trainable.</p>
<h3>Position</h3>
<p>Attention ignores order, so position is added to the embeddings. The original sinusoidal encoding is</p>
\[ PE_{(pos,\,2i)} = \sin\!\big(pos/10000^{2i/d}\big), \qquad PE_{(pos,\,2i+1)} = \cos\!\big(pos/10000^{2i/d}\big), \]
<p>chosen so that the encoding of pos + k is a fixed linear function (a rotation) of the encoding of pos, making relative positions easy to learn.</p>
<h3>Training</h3>
<p>The final vector at each position is projected to vocabulary logits, \(\mathbf z = W_{\text{out}}\mathbf y\), and trained with cross-entropy on the next token: \(\mathcal L = -\sum_t\log P(x_{t+1}\mid x_{\le t})\). Parameters per block are about \(12d^2\) (4d² for attention, 8d² for the FFN).</p>`,

  "llm-sampling-rag": String.raw`
<h3>Temperature</h3>
<p>The model outputs logits \(z_i\) for every token. Sampling uses</p>
\[ P(i) = \frac{e^{z_i/T}}{\sum_j e^{z_j/T}} . \]
<p>T → 0 approaches always picking the top token (greedy); T = 1 is the model's own distribution; T > 1 flattens it. Lower T reduces the entropy \(-\sum P\log P\) of each choice.</p>
<h3>Top-k and top-p</h3>
<p>Top-k keeps the k most likely tokens and renormalises. Top-p (nucleus) keeps the smallest set whose probabilities sum to at least p, so the set shrinks when the model is confident and grows when it isn't.</p>
<h3>Embeddings and similarity</h3>
<p>Texts are mapped to vectors \(\mathbf e\) such that similar meanings are close. Retrieval ranks passages by cosine similarity with the query:</p>
\[ \cos(\mathbf q, \mathbf d) = \frac{\mathbf q^\top\mathbf d}{\|\mathbf q\|\,\|\mathbf d\|} . \]
<h3>Retrieval-augmented generation</h3>
<p>Retrieve the top passages \(d_1..d_k\), paste them into the prompt, and generate. Probabilistically the answer is \(P(a \mid q) \approx P(a \mid q, d_1..d_k)\): the model conditions on evidence instead of relying only on what it memorised. Retrieval quality is measured with recall@k, the share of questions whose needed passage is among the top k.</p>`,

  "market-basket": String.raw`
<h3>Support, confidence, lift</h3>
<p>Over N baskets, for itemsets A and B:</p>
\[ \text{supp}(A) = \frac{\#\{A \subseteq \text{basket}\}}{N}, \qquad \text{conf}(A\Rightarrow B) = \frac{\text{supp}(A\cup B)}{\text{supp}(A)} = \hat P(B\mid A), \]
\[ \text{lift}(A\Rightarrow B) = \frac{\text{conf}(A\Rightarrow B)}{\text{supp}(B)} = \frac{\hat P(A\cap B)}{\hat P(A)\hat P(B)} . \]
<p>Lift = 1 means A and B are bought together exactly as often as chance would predict if they were independent; above 1 means more often. Lift is symmetric in A and B; confidence isn't.</p>
<h3>Is a lift real?</h3>
<p>With the 2 × 2 table of baskets with/without A and with/without B, the chi-square test of independence (or Fisher's exact test for small counts) checks whether a lift could be chance. With thousands of item pairs, correct for multiple testing.</p>
<h3>Apriori</h3>
<p>Support can only fall as items are added: \(\text{supp}(A\cup\{x\}) \le \text{supp}(A)\). So if an itemset is infrequent, all its supersets are too (anti-monotonicity). Apriori builds frequent itemsets of size k + 1 only from frequent itemsets of size k whose every k-subset is frequent, skipping most of the \(2^n\) possible itemsets.</p>
<h3>Other measures</h3>
<p>Leverage \(\text{supp}(A\cup B) - \text{supp}(A)\text{supp}(B)\) is the excess share of baskets; conviction \(\frac{1 - \text{supp}(B)}{1 - \text{conf}(A\Rightarrow B)}\) is large when A almost never appears without B.</p>`,

  "rl-ordering": String.raw`
<h3>The problem as a Markov decision process</h3>
<p>State s = stock on hand, action a = order size, random demand D. Cost today \(c(s, a, D) = K\,\mathbf 1\{a > 0\} + h\,(s + a - D)^+ + p\,(D - s - a)^+\), next state \(s' = (s + a - D)^+\), discount γ.</p>
<h3>The Bellman equation</h3>
<p>The optimal long-run cost of state s and action a satisfies</p>
\[ Q^*(s, a) = E_D\Big[c(s, a, D) + \gamma\min_{a'}Q^*(s', a')\Big]. \]
<p>Value iteration repeats this update over all (s, a) using the known demand distribution. Because the update is a γ-contraction, it converges to the unique \(Q^*\) from any start, with error shrinking by γ per sweep.</p>
<h3>Q-learning</h3>
<p>Without knowing the demand distribution, use one observed transition at a time:</p>
\[ Q(s, a) \leftarrow Q(s, a) + \alpha\Big[c + \gamma\min_{a'}Q(s', a') - Q(s, a)\Big]. \]
<p>The bracket is a noisy sample of the Bellman error. Watkins and Dayan proved convergence to \(Q^*\) if every (s, a) is tried infinitely often and the learning rates satisfy \(\sum\alpha_t = \infty\), \(\sum\alpha_t^2 &lt; \infty\). With a fixed α, Q keeps fluctuating around \(Q^*\).</p>
<h3>Exploration</h3>
<p>ε-greedy takes a random action with probability ε. Starting Q at 0 when every real cost is positive is "optimistic": untried actions look cheaper than tried ones, so the agent tries them, which is why it still learns with ε = 0 here.</p>
<h3>Why the optimum is (s, S)</h3>
<p>With a fixed order cost K, Scarf's K-convexity result shows the optimal rule orders up to S whenever stock falls to s or below. With K = 0 it reduces to a base-stock rule.</p>`,
});
