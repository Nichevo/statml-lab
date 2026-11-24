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
  };
})();
