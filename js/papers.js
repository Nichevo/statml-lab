// Plain-language summaries shown under research-paper links in "Go deeper".
// Key = the exact URL used in an explainer's `deeper` list. One or two sentences: what it found, why it matters.
(function () {
  Lab.paperSummaries = {
    // Optimization
    "https://doi.org/10.1126/science.220.4598.671": "Borrowed the physics of slowly cooling metal to escape local optima: accept some worse moves early, fewer later. Simulated annealing became a go-to method for hard routing and scheduling problems.",

    // Forecasting: classics
    "https://doi.org/10.1002/9781118619193": "The book that turned ARIMA into a practical recipe: identify the model from the data, fit it, check the residuals, repeat. Still the standard reference for ARIMA.",
    "https://doi.org/10.18637/jss.v027.i03": "Describes the algorithms behind auto.arima and ets in R, which pick a forecasting model automatically by information criteria. This is why thousands of series can be forecast without hand-tuning each one.",
    "https://doi.org/10.1016/S0169-2070(00)00065-0": "Reviews how to test forecasts fairly on data the model has not seen, including rolling-origin evaluation. Shows that in-sample fit is a poor guide to real forecast accuracy.",
    "https://doi.org/10.1016/j.ijforecast.2019.04.014": "Results of a 100,000-series forecasting competition. Combinations and hybrid statistical/ML methods won, and pure ML methods mostly lost to simple benchmarks.",
    "https://doi.org/10.1016/j.ijforecast.2003.09.015": "Holt's 1957 memo, reprinted, that extended exponential smoothing to handle trend and seasonality. The foundation of Holt and Holt-Winters methods.",
    "https://doi.org/10.1287/mnsc.6.3.324": "Added a seasonal component to Holt's trend method, giving the Holt-Winters method. Cheap, robust and still widely used in demand planning.",
    "https://doi.org/10.1016/j.ijforecast.2006.03.005": "A 20-year review of exponential smoothing research. Finds damped-trend smoothing a remarkably hard benchmark to beat.",
    "https://doi.org/10.1016/S0169-2070(01)00110-8": "Showed exponential smoothing methods are optimal for a family of state-space models (ETS). That gives them proper likelihoods, model selection and prediction intervals.",

    // Forecast accuracy
    "https://doi.org/10.1016/j.ijforecast.2006.03.001": "Shows how MAPE and other common accuracy measures break down (zeros, scale, asymmetry) and proposes MASE, which scales errors by a naive forecast. MASE is now a standard measure.",
    "https://robjhyndman.com/papers/foresight.pdf": "A practitioner-friendly version of the MASE argument, focused on intermittent demand where MAPE fails because of zero actuals.",
    "https://doi.org/10.1016/0169-2070(93)90079-3": "Discusses the strengths and flaws of accuracy measures and argues for symmetric versions of MAPE. A key source for why no single measure is perfect.",
    "https://doi.org/10.1198/jasa.2011.r10138": "Proves that each error measure rewards a specific target: squared error rewards the mean, absolute error the median. Choose the measure to match the decision, or forecasts will be pushed in the wrong direction.",
    "https://doi.org/10.1016/j.jbusres.2015.03.026": "Reviewed 32 papers comparing simple and complex forecasting methods. Complexity increased error by 27% on average, so start simple.",

    // Judgment and FVA
    "https://doi.org/10.1016/j.ijforecast.2008.11.010": "Studied 60,000 forecasts at four companies. Large downward adjustments tended to help, while small and upward (optimistic) adjustments often made forecasts worse.",
    "https://doi.org/10.1287/inte.1070.0309": "Surveyed how firms adjust statistical forecasts by hand and found it often wastes effort. Recommends recording reasons and checking whether adjustments add value.",

    // Intermittent demand
    "https://doi.org/10.1057/jors.1972.50": "Showed ordinary exponential smoothing is biased for items with many zero periods. Proposed forecasting size and interval separately, now called Croston's method.",
    "https://doi.org/10.1016/j.ijforecast.2004.10.001": "Found Croston's method is itself biased and introduced the SBA correction. Tested on real automotive spare-parts data.",
    "https://doi.org/10.1057/palgrave.jors.2601841": "Defined the ADI and CV² cut-offs (1.32 and 0.49) that sort demand into smooth, erratic, intermittent and lumpy. Used to decide when to switch to Croston-type methods.",
    "https://doi.org/10.1016/j.ejor.2011.05.018": "The TSB method updates demand probability every period, so forecasts fall when an item stops selling. Croston's method can't do this, so it suits items at risk of obsolescence.",

    // Probability and uncertainty
    "https://doi.org/10.1080/07350015.1993.10509938": "Explains why prediction intervals are usually too narrow: they ignore model and parameter uncertainty. Urges forecasters to report and check intervals.",
    "https://doi.org/10.2307/1913643": "Introduced quantile regression, which estimates any percentile rather than just the mean. The basis for quantile forecasts and pinball loss.",
    "https://doi.org/10.1146/annurev-statistics-062713-085831": "Argues forecasts should be full probability distributions, judged on calibration and sharpness. A readable overview of probabilistic forecasting and its scoring rules.",
    "https://doi.org/10.1007/978-0-387-87857-7": "Traces the central limit theorem from Laplace to the 20th century. Shows how the result was gradually made rigorous.",

    // Hypothesis tests
    "https://doi.org/10.1080/00031305.2016.1154108": "The American Statistical Association's six principles on p-values. A p-value does not measure the probability that a hypothesis is true, and p < 0.05 alone should not drive decisions.",
    "https://doi.org/10.1007/s10654-016-0149-3": "Lists 25 common misreadings of p-values, confidence intervals and power, each with a correct reading. A handy checklist before you write up a test.",

    // Regression and least squares
    "https://doi.org/10.1214/aos/1176345451": "Historical detective work on the dispute between Gauss and Legendre over who invented least squares. Legendre published first (1805); Gauss had probably used it earlier.",
    "https://doi.org/10.1080/00031305.1985.10479448": "Showed that at least eight different formulas for R² are in use and that they can disagree, especially without an intercept. Recommends one standard formula.",

    // ML
    "https://doi.org/10.1162/neco.1992.4.1.1": "Formalised the bias–variance decomposition for neural networks. Flexible models need lots of data, otherwise variance dominates.",
    "https://doi.org/10.1073/pnas.1903070116": "Found 'double descent': past the point of fitting the training data exactly, test error can fall again as models grow. Explains why huge modern models can generalise.",
    "https://arxiv.org/abs/1609.04747": "A clear survey of gradient descent variants (momentum, AdaGrad, RMSProp, Adam), explaining what each fixes. A good map before choosing an optimiser.",
    "https://arxiv.org/abs/1412.6980": "Introduced Adam, which adapts each parameter's step size using running averages of gradients. It became the default optimiser for deep learning.",
    "https://distill.pub/2017/momentum/": "An interactive article showing why momentum speeds up gradient descent on long, narrow valleys. It also shows when momentum makes descent oscillate.",
    "https://arxiv.org/abs/1706.03762": "Introduced the transformer, which drops recurrence and relies entirely on attention. It trains faster in parallel and set new translation records; the basis of GPT-style models.",
    "https://arxiv.org/abs/1409.0473": "First used attention in translation, letting the model look back at relevant input words. This removed the fixed-length bottleneck of earlier encoder–decoder models.",
    "https://doi.org/10.1023/A:1010933404324": "Introduced random forests: many trees on bootstrap samples, each split using a random subset of features. Accurate and robust, with built-in out-of-bag error and variable importance.",
    "https://doi.org/10.1007/BF00058655": "Showed that averaging models trained on bootstrap samples (bagging) cuts variance for unstable learners like trees. The step before random forests.",
    "https://doi.org/10.1201/9781315139470": "The book that defined CART decision trees: binary splits, pruning by cross-validation, and Gini impurity. The basis of most tree methods used today.",
    "https://arxiv.org/abs/2207.08815": "Benchmarked trees against deep learning on 45 tabular datasets. Tree ensembles still won, because tabular data has irregular patterns and uninformative features.",

    // Hierarchies
    "https://doi.org/10.1080/01621459.2018.1448825": "Introduced MinT reconciliation, which uses the forecast error covariance to make forecasts add up across a hierarchy. Reconciled forecasts are usually more accurate than bottom-up or top-down.",

    // Data quality
    "https://doi.org/10.1093/biomet/41.1-2.100": "Introduced the CUSUM chart, which adds up small deviations so a persistent shift is caught faster than with point-by-point limits. Still a standard change-detection tool.",
    "https://arxiv.org/abs/1801.00718": "Surveys offline change-point methods, organised by cost function, search method and penalty. Comes with the Python package ruptures.",
    "https://doi.org/10.1093/biomet/63.3.581": "Defined the missing-data types MCAR, MAR and MNAR. Whether ignoring or filling gaps is safe depends on why the data are missing.",
    "https://journal.r-project.org/archive/2017/RJ-2017-009/": "Describes imputeTS, an R package for filling gaps in time series (interpolation, Kalman smoothing, seasonal methods). Compares the methods.",
    "https://doi.org/10.1093/biomet/55.1.1": "Introduced Q-Q and other probability plots for comparing data with a distribution. Gaps between the plot and the straight line show skew, heavy tails or outliers.",
    "https://doi.org/10.1111/j.2517-6161.1964.tb00553.x": "Introduced the Box-Cox family of power transforms (log, square root and others), choosing the power from the data. Used to stabilise variance before modelling.",
    "https://doi.org/10.1007/BF01025868": "Derived a histogram bin width that adapts to spread and sample size: 2 × IQR / n^(1/3). It is robust to outliers.",
    "https://doi.org/10.1641/0006-3568(2001)051[0341:LNDATS]2.0.CO;2": "Shows that log-normal data (things that grow by multiplying) are everywhere in nature and business. Summarise them with geometric means and multiplicative spreads.",
    "https://doi.org/10.2307/2341482": "Showed that two unrelated time series that both trend can show large, meaningless correlations. The original warning about 'nonsense correlations'.",
    "https://doi.org/10.1016/0304-4076(74)90034-7": "Simulated independent random walks and found regressions between them look significant most of the time. Warns against regressing trending series on each other without differencing.",
    "https://doi.org/10.1080/00031305.1973.10478966": "Anscombe's quartet: four datasets with the same means, variances, correlation and regression line, but very different shapes. Always plot the data.",
    "https://doi.org/10.2307/1412159": "Introduced rank correlation and the correction for measurement error weakening correlations. An early foundation of correlation analysis.",
    "https://doi.org/10.1145/3025453.3025912": "Built the 'Datasaurus Dozen': very different scatter plots, including a dinosaur, with identical summary statistics. A modern take on Anscombe.",
    "https://doi.org/10.1111/j.2517-6161.1951.tb00088.x": "Explained how a trend in every subgroup can reverse when the groups are combined, now called Simpson's paradox. Matters whenever you roll up numbers across groups of different size.",
    "https://doi.org/10.1126/science.187.4175.398": "Berkeley seemed to admit fewer women overall, but most departments did not. Women had applied more to competitive departments, a famous real case of Simpson's paradox.",

    // Benford
    "https://www.jstor.org/stable/984802": "Checked 20,000 numbers from rivers to street addresses and found leading digit 1 appears about 30% of the time. Gave Benford's law its name.",
    "https://doi.org/10.2307/2369148": "Noticed that the early pages of logarithm books were more worn, and was first to describe the first-digit law. This was 57 years before Benford.",
    "https://doi.org/10.1214/ss/1177009869": "Proved why Benford's law appears: mixing numbers from many different distributions tends to produce it. Explains why it fits invoices and sales but not prices in a narrow range.",
    "https://doi.org/10.1002/9781119203094": "A practitioner's guide to using Benford's law in audit and fraud detection. Gives the MAD conformity cut-offs used on this page.",

    // Clustering and PCA
    "https://doi.org/10.1109/TIT.1982.1056489": "The algorithm now called k-means (Lloyd's algorithm): assign points to the nearest centre, move centres to the mean, repeat. Written in 1957, published in 1982.",
    "https://dl.acm.org/doi/10.5555/1283383.1283494": "k-means++: pick starting centres spread out with probability proportional to squared distance. Gives faster, more reliable clustering with a provable quality guarantee.",
    "https://doi.org/10.1080/14786440109462720": "Pearson's 1901 paper finding the line or plane that best fits points by perpendicular distance. This is the origin of principal component analysis.",
    "https://doi.org/10.1016/0377-0427(87)90125-7": "Introduced the silhouette score, which compares each point's distance to its own cluster with its distance to the nearest other cluster. Used to choose the number of clusters.",
    "https://doi.org/10.1098/rsta.2015.0202": "A modern review of PCA: what it does, how to read loadings, when to standardise, and newer variants. A good next read after this page.",

    // Confidence intervals, classification, cross-validation
    "https://doi.org/10.1098/rsta.1937.0005": "Defined the confidence interval: a procedure that captures the true value in a stated share of repeated samples. This is still the standard meaning of a '95% interval'.",
    "https://doi.org/10.1214/aos/1176344552": "Introduced the bootstrap: resample your own data with replacement to see how much a statistic varies. Intervals became possible for almost any statistic, with no formula needed.",
    "https://doi.org/10.1111/j.2517-6161.1958.tb00292.x": "Set out regression for yes/no outcomes using the logistic (log-odds) link. It became the standard model for binary data in medicine, credit scoring and beyond.",
    "https://doi.org/10.1016/j.patrec.2005.10.010": "A clear tutorial on ROC curves and AUC: how to draw them, what AUC means and how to choose an operating point using costs and class balance.",
    "https://doi.org/10.1371/journal.pone.0118432": "Showed that when positives are rare, ROC curves can look reassuring while precision is poor. Precision-recall plots reveal the problem, so use them for rare events.",
    "https://doi.org/10.1111/j.2517-6161.1974.tb00994.x": "Formalised cross-validation for choosing and judging models. Assess predictions on data left out of fitting, not on the data used to fit.",
    "https://doi.org/10.1214/09-SS054": "Surveys the many forms of cross-validation (k-fold, leave-one-out, repeated, Monte Carlo) and when each gives reliable model choices.",
    "https://doi.org/10.1016/j.csda.2017.11.003": "Showed that ordinary k-fold CV is valid for purely autoregressive models with uncorrelated errors. Otherwise, use rolling-origin evaluation for time series.",

    // Neural networks
    "https://doi.org/10.1037/h0042519": "Proposed the perceptron, a machine that learns to classify by adjusting weights after each error. It sparked the first wave of neural network research.",
    "https://doi.org/10.1038/323533a0": "Showed that backpropagation can train hidden layers, which then learn useful internal features by themselves. This revived neural networks in the 1980s.",

    // CNNs
    "https://doi.org/10.1109/5.726791": "Introduced LeNet-5 and the MNIST digit benchmark: convolution, pooling and gradient descent, trained end to end. It read millions of bank cheques in the 1990s.",
    "https://doi.org/10.1007/BF00344251": "The neocognitron, inspired by the visual cortex: layers of local feature detectors with pooling-like steps, giving tolerance to shifts. CNNs grew from this idea.",
    "https://doi.org/10.1145/3065386": "AlexNet: a deep CNN trained on GPUs cut the ImageNet error rate from about 26% to 15%. This 2012 result started the deep learning boom.",
    "https://arxiv.org/abs/1311.2901": "Projected filter activations back to pixels to show what each layer learns. Early layers find edges and colours; deeper layers find textures, parts and objects.",
    "https://arxiv.org/abs/1512.03385": "ResNet adds shortcut connections so each block learns only a correction. That made networks over 100 layers deep trainable, and it won ImageNet 2015.",
    "https://arxiv.org/abs/1803.01271": "Compared simple 1-D convolutional networks (TCNs) with LSTMs on many sequence tasks. The convolutional ones usually matched or beat them, and train faster.",
    "https://distill.pub/2017/feature-visualization/": "Generates images that most excite a given neuron, to show what each part of a CNN looks for. Interactive, with many examples from a large image network.",

    // Supply chain
    "https://sloanreview.mit.edu/article/the-bullwhip-effect-in-supply-chains/": "Explained why orders swing more than sales as you move up a supply chain. Names four causes (forecast updating, batching, price promotions, shortage gaming) and ways to fix each.",
    "https://doi.org/10.1287/opre.44.1.87": "Sport Obermeyer case: order the most predictable styles early and delay the uncertain ones until early sales arrive. This 'accurate response' approach substantially cut stockout and markdown costs.",
    "https://doi.org/10.1287/msom.2.1.68.23267": "Shows how to choose which stages of a multi-stage supply chain should hold safety stock. Uses guaranteed service times and dynamic programming, and has been used at Kodak and others.",
    "https://hbr.org/1991/05/profit-priorities-from-activity-based-costing": "Showed how activity-based costing reveals which customers and products are actually profitable. Often a minority earns more than all the profit, the pattern later drawn as the whale curve.",
    "https://hbr.org/2004/11/time-driven-activity-based-costing": "A simpler form of activity-based costing that needs only two estimates per activity: cost per minute of capacity and minutes per transaction. Made cost-to-serve analysis practical.",

    "https://doi.org/10.1108/eb014366": "Proposed the square root law: if demand is split evenly across n warehouses, total safety stock grows with the square root of n. Consolidating from 4 DCs to 1 roughly halves it, but only if demand at each site is independent.",

    // Tariffs
    "https://doi.org/10.1257/jep.33.4.187": "Found the 2018 US tariffs were passed almost fully into US import prices. US buyers, not foreign exporters, bore the cost.",
    "https://doi.org/10.1093/qje/qjz036": "Estimated the 2018 trade war cost US consumers and firms about $51 billion. Foreign exporters cut prices very little.",
    "https://doi.org/10.1257/aeri.20190536": "Tariffs were almost fully passed through to US importers at the border. Retail shelf prices rose much less, so retailers absorbed much of the cost in their margins.",
    // Probabilistic scoring, new products, global models
    "https://doi.org/10.1198/016214506000001437": "The standard reference on proper scoring rules: scores that can't be gamed, because you get the best expected score only by reporting what you really believe. Covers CRPS, pinball (quantile) loss and interval scores.",
    "https://doi.org/10.1287/mnsc.22.10.1087": "Extended scoring rules from yes/no events to forecasts of continuous quantities, introducing what became the CRPS.",
    "https://doi.org/10.1016/j.ijforecast.2021.10.009": "Results of the M5 uncertainty track: teams forecast nine quantiles of Walmart unit sales, scored with weighted pinball loss. A large, real test of probabilistic forecasting at scale.",
    "https://doi.org/10.1287/mnsc.15.5.215": "The original diffusion model: adoption of a new durable product is driven by innovators (who adopt on their own) and imitators (who adopt because others have), giving the familiar rise-peak-decline sales curve.",
    "https://doi.org/10.1177/002224299005400101": "Review of 20 years of Bass-model research: how the model is estimated and used, its extensions, and where research should go next.",
    "https://doi.org/10.1093/imaman/dpr025": "Studies forecasting the first-year sales of new electronics products by looking at the sales of similar past products (analogies).",
    "https://doi.org/10.1016/j.ijforecast.2021.03.004": "Shows that one global model fitted to many series can be as flexible as separate local models, and often more accurate, even when the series aren't obviously similar.",
    "https://doi.org/10.1016/j.ijforecast.2021.11.013": "Results of the M5 accuracy track on 42,840 Walmart series. LightGBM models trained across many series dominated, beating classic per-series statistical methods.",
    "https://doi.org/10.1016/j.ijforecast.2019.05.008": "Proposes criteria for sorting forecasting methods, including whether a model is global (shared across series) or local (one per series).",
    "https://doi.org/10.1214/aos/1013203451": "The paper that introduced gradient boosting: build a strong model by adding many small trees, each fitted to the errors the earlier ones left.",
    "https://doi.org/10.1016/j.eswa.2019.112896": "Groups similar time series by clustering, then trains one recurrent neural network per group, so each model learns from many related series.",
    // ANOVA, A/B tests, Bayesian, regularisation, autocorrelation
    "https://doi.org/10.1080/14786440009463897": "Introduced the chi-square test: add up (observed − expected)² ÷ expected across categories and compare with a known distribution to judge whether the gaps are bigger than chance.",
    "https://doi.org/10.2307/3001913": "Tukey's early method for deciding which group means differ after an analysis of variance, the forerunner of the 'honestly significant difference' test.",
    "https://doi.org/10.1017/9781108653985": "A practical book on running A/B tests well, from people who ran thousands at Microsoft, Google and LinkedIn: metrics, sample sizes, pitfalls and trust in results.",
    "https://doi.org/10.1037/0033-2909.112.1.155": "A short guide to statistical power: how sample size, effect size and significance level fit together, with tables of the sample sizes needed for common tests.",
    "https://doi.org/10.1177/1745691614551642": "Shows that in low-power studies, significant results often have the wrong sign (type S error) or a greatly exaggerated size (type M error), and suggests a design analysis to check for this.",
    "https://doi.org/10.1145/2433396.2433413": "Introduced CUPED: adjust each user's result for their pre-experiment value of the same metric, which cuts noise and so the sample size an A/B test needs.",
    "https://doi.org/10.1038/scientificamerican0577-119": "A popular explanation of Stein's paradox using baseball batting averages: pulling each player's average towards the overall average predicts their future better than their own average alone.",
    "https://doi.org/10.1098/rstl.1763.0053": "Bayes' essay, published after his death by Richard Price: how to infer an unknown probability from the numbers of successes and failures observed.",
    "https://doi.org/10.1111/j.2517-6161.1996.tb02080.x": "Introduced the lasso: least squares with a limit on the sum of absolute coefficients, which shrinks some coefficients and sets others to exactly zero.",
    "https://doi.org/10.1080/00401706.1970.10488634": "Introduced ridge regression: adding a small constant to the diagonal of X'X gives biased but much more stable coefficients when drivers are correlated.",
    "https://doi.org/10.1111/j.1467-9868.2005.00503.x": "Introduced the elastic net, which mixes the ridge and lasso penalties so that groups of correlated drivers are kept or dropped together.",
    "https://doi.org/10.18637/jss.v033.i01": "Describes glmnet: fitting lasso, ridge and elastic net for a whole sequence of penalty values quickly by coordinate descent.",
    "https://doi.org/10.1037/a0029146": "Shows how to compare two groups the Bayesian way, giving a full distribution of the difference and its effect size instead of a single p-value.",
    "https://sites.stat.columbia.edu/gelman/book/": "Home page of the standard Bayesian statistics textbook, with a free PDF for non-commercial use. Chapter 2 works through single-parameter models like the beta-binomial used here.",
    "https://doi.org/10.1093/biomet/65.2.297": "Proposed the Ljung–Box test, which checks whether a set of autocorrelations (usually of a model's residuals) is jointly larger than chance would produce.",
    "https://doi.org/10.2307/1401322": "Gave the recursive method (now called Durbin–Levinson) for fitting autoregressive models of increasing order, which is also how partial autocorrelations are computed.",

    // Batch 4: boosting, SHAP, Theta, causal impact, regression checks, transformer block
    "https://doi.org/10.1145/2939672.2939785": "Described XGBoost, a fast, regularised gradient-boosting library that handles missing values and sparse data and scales across machines. It went on to win a large share of tabular-data competitions.",
    "https://doi.org/10.3389/fnbot.2013.00021": "A hands-on tutorial on gradient boosting: how each new tree fits the errors left so far, which loss functions to use, and how learning rate and tree size control overfitting, with worked examples.",
    "https://arxiv.org/abs/1705.07874": "Showed that several popular ways of explaining predictions are special cases of one idea, Shapley values, and that only this choice has a set of fairness properties. Named the result SHAP.",
    "https://doi.org/10.1038/s42256-019-0138-9": "Gave TreeSHAP, a fast exact way to compute SHAP values for tree models, plus ways to combine many local explanations into a global picture of the model, including interaction effects.",
    "https://doi.org/10.1515/9781400881970-018": "Shapley's game-theory result: there is exactly one fair way to divide a team's payoff among players, averaging each player's added value over all orders of joining. SHAP applies it to model inputs.",
    "https://doi.org/10.1016/S0169-2070(00)00066-2": "Introduced the Theta method: split a series into lines with different curvature, forecast each simply, and combine. It was simple and won the M3 forecasting competition.",
    "https://doi.org/10.1016/S0169-2070(01)00143-1": "Proved that the standard Theta method is equivalent to simple exponential smoothing with a drift equal to half the trend slope, which explains why it works and how to get prediction intervals.",
    "https://doi.org/10.1016/S0169-2070(00)00057-1": "Results of the M3 competition: 3,003 series forecast by 24 methods. Simple and combined methods often beat complex ones, and the Theta method did best overall.",
    "https://doi.org/10.1016/j.ijforecast.2016.02.005": "Generalised Theta by optimising the weight on the trend line instead of fixing it at one half, linked it to state space models, and showed the optimised versions forecast better on M3 and M4-style data.",
    "https://doi.org/10.1214/14-AOAS788": "Introduced CausalImpact: build a Bayesian time-series model of what a metric would have done without an intervention, using unaffected series as controls, and read the effect as the gap, with uncertainty.",
    "https://doi.org/10.1198/jasa.2009.ap08746": "Introduced synthetic control: when no single region is a good comparison, build one from a weighted mix of untreated regions that matches the treated one before the change.",
    "https://doi.org/10.1080/00401706.1977.10489493": "Proposed Cook's distance, a single number for how much the fitted regression would change if one observation were dropped, combining how unusual its x is with how badly it fits.",
    "https://doi.org/10.2307/1912934": "Showed how to get valid standard errors when the noise in a regression is uneven (heteroskedastic), without modelling its shape, and gave a test for it. Now called robust or White standard errors.",
    "https://arxiv.org/abs/1301.3781": "Introduced word2vec: cheap models that learn word vectors from huge text by predicting nearby words. Similar words get similar vectors, and directions carry meaning (king − man + woman ≈ queen).",
    "https://arxiv.org/abs/1607.06450": "Introduced layer normalisation: rescale each example's activations to mean 0 and spread 1 inside the network. It speeds up and stabilises training and became standard in transformers.",
    "https://arxiv.org/abs/2002.04745": "Showed that putting layer norm before each attention and feed-forward sub-layer (pre-LN), rather than after, keeps gradients well behaved, so transformers train without a delicate warm-up.",
  };
})();
